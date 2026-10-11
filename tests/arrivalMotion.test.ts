import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arrivalMotion, finishGeometry } from '../src/lib/arrivalMotion';
import { CROSSING_DURATION_MS } from '../src/lib/animation';
import { motionProfiles, gaitPixelsPerMs } from '../src/lib/motionProfiles';
import { finishCrossingDuration } from '../src/lib/finishTiming';

test('fixed finish reserves space for the entire character beyond the line', () => {
  for (const [width, actorWidth] of [[288, 102.4], [358, 124.8], [556, 90], [840, 168]]) {
    const geometry = finishGeometry(width, actorWidth);
    assert.ok(geometry.lineX > geometry.startX);
    assert.ok(geometry.stopX - actorWidth / 2 > geometry.lineX);
    assert.ok(geometry.stopX + actorWidth / 2 <= width - 8);
  }
});

test('distance to the fixed finish keeps decreasing throughout the visible final tenth', () => {
  for (const total of [60_000, 600_000, 7_200_000]) {
    for (const [width, actorWidth] of [[288, 102.4], [358, 124.8], [840, 168]]) {
      const geometry = finishGeometry(width, actorWidth);
      for (const nativeSpeed of [.018, .024, .04, .07]) {
        const speed = nativeSpeed * actorWidth / 160;
        let previous = arrivalMotion(total * .9, total, 0, geometry, speed);
        for (const progress of [.92, .94, .96, .98, .999]) {
          const motion = arrivalMotion(total * progress, total, 0, geometry, speed);
          assert.ok(motion.x > previous.x, `${total}ms / ${width}px: no approach at ${progress}`);
          assert.ok(motion.x < geometry.lineX, 'The character must not arrive before zero');
          assert.ok(motion.backgroundDistance > previous.backgroundDistance, 'The scenery must not reverse');
          previous = motion;
        }
        const halfway = arrivalMotion(total * .95, total, 0, geometry, speed);
        assert.ok(halfway.x - geometry.startX > (geometry.lineX - geometry.startX) * .2,
          'The approach must be visible halfway through the final tenth');
        const end = arrivalMotion(total, total, 0, geometry, speed);
        assert.ok(Math.abs(end.x - geometry.lineX) < 1e-8);
        const before = arrivalMotion(total - .1, total, 0, geometry, speed);
        const after = arrivalMotion(total, total, .1, geometry, speed);
        assert.ok(Math.abs((end.x - before.x) / .1 - (after.x - end.x) / .1) < .0001,
          'Crossing the line must preserve the approach velocity');
      }
    }
  }
});

test('approach and crossing share the foot clock and never cross before zero', () => {
  const total = 600_000, geometry = finishGeometry(358, 124.8);
  for (const speed of [.018, .024, .04, .07]) {
    const initial = arrivalMotion(300_000, total, 0, geometry, speed);
    assert.equal(initial.x, geometry.startX);
    let previous = initial;
    for (let elapsed = total - 20_000; elapsed <= total; elapsed += 5) {
      const motion = arrivalMotion(elapsed, total, 0, geometry, speed);
      assert.ok(motion.x >= previous.x - 1e-8 && motion.x <= geometry.lineX + 1e-8);
      // A planted foot moves by -gait * speed relative to its body. Its screen
      // displacement must match the ground even as camera motion stops.
      assert.ok(Math.abs(motion.x - previous.x - (motion.gait - previous.gait) * speed
        + motion.backgroundDistance - previous.backgroundDistance) < 1e-7);
      previous = motion;
    }
    assert.ok(Math.abs(previous.x - geometry.lineX) < 1e-8);
    const ground = previous.backgroundDistance;
    const duration = previous.crossingDuration;
    for (let finish = 0; finish <= duration + 1000; finish += 5) {
      const motion = arrivalMotion(total, total, finish, geometry, speed);
      assert.ok(motion.x >= previous.x - 1e-8 && motion.x <= geometry.stopX + 1e-8);
      assert.equal(motion.backgroundDistance, ground);
      assert.ok(Math.abs(motion.x - previous.x - (motion.gait - previous.gait) * speed) < 1e-7);
      previous = motion;
    }
    assert.ok(Math.abs(previous.x - geometry.stopX) < 1e-8);
    const before = arrivalMotion(total, total, duration - 1, geometry, speed);
    assert.ok(geometry.stopX - before.x < .0001, 'Braking must finish with zero velocity');
  }
});

test('every friend crosses at its existing speed then only slows down, independently of viewport size', () => {
  for (const id of Object.keys(motionProfiles)) for (const [width, actorWidth] of [[288, 90], [358, 124.8], [840, 168]]) {
    const geometry = finishGeometry(width, actorWidth), speed = gaitPixelsPerMs(id) * actorWidth / 160;
    let previous = arrivalMotion(600_000, 600_000, 0, geometry, speed), previousSpeed = speed;
    const duration = previous.crossingDuration;
    assert.ok(Math.abs(duration - finishCrossingDuration(id)) < 1e-7, 'The renderer and finish phases must share one crossing clock');
    for (let time = 5; time < duration; time += 5) {
      const motion = arrivalMotion(600_000, 600_000, time, geometry, speed);
      const velocity = (motion.x - previous.x) / 5;
      assert.ok(velocity <= previousSpeed + 1e-8, `${id}: accelerates after crossing the finish`);
      assert.ok(velocity >= 0 && velocity <= speed + 1e-8);
      assert.ok(Math.abs((motion.gait - previous.gait) / 5 - velocity / speed) < 1e-7, 'Foot cadence must slow with the body');
      previous = motion; previousSpeed = velocity;
    }
    const end = arrivalMotion(600_000, 600_000, duration, geometry, speed);
    assert.ok(Math.abs(end.x - geometry.stopX) < 1e-8);
    assert.ok(end.x - actorWidth / 2 > geometry.lineX, 'Stop only after the entire artwork has crossed');
    assert.ok(previousSpeed < .00001, 'The final step must settle to zero velocity');
  }
});

test('one world-fixed destination closes with timestamp time, not the repeating walk or viewport percentage', () => {
  for (const total of [60_000, 600_000, 7_200_000]) for (const [width, actorWidth] of [[288, 102.4], [358, 124.8], [840, 168]]) {
    const geometry = finishGeometry(width, actorWidth);
    for (const nativeSpeed of [.018, .024, .0288, .05, .07]) {
      const speed = nativeSpeed * actorWidth / 160;
      let previous = arrivalMotion(0, total, 0, geometry, speed);
      const worldX = previous.destinationX + previous.backgroundDistance;
      for (let i = 1; i <= 1200; i++) {
        const time = total * i / 1200, motion = arrivalMotion(time, total, 0, geometry, speed);
        assert.ok(Math.abs(motion.destinationX + motion.backgroundDistance - worldX) < 1e-7, 'The destination slides along the ground');
        assert.ok(motion.destinationX <= previous.destinationX + 1e-7, 'The destination recedes');
        assert.ok(motion.destinationX - motion.x < previous.destinationX - previous.x, 'The remaining distance increases');
        if (i < 1200) assert.ok(motion.destinationX > motion.x, 'Arrives before the timer ends');
        // The destination has the exact ground velocity, independent of body/foot poses.
        assert.ok(Math.abs(motion.destinationX - previous.destinationX + motion.backgroundDistance - previous.backgroundDistance) < 1e-7);
        previous = motion;
      }
      assert.ok(Math.abs(previous.destinationX - previous.x) < 1e-7);
      assert.ok(Math.abs(previous.destinationX - geometry.lineX) < 1e-7);
      for (const finish of [1, 800, CROSSING_DURATION_MS, CROSSING_DURATION_MS + 5000]) {
        const arrived = arrivalMotion(total, total, finish, geometry, speed);
        assert.equal(arrived.destinationX, previous.destinationX, 'The destination must stay after crossing');
      }
    }
  }
});
