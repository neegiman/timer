import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FINISH_DURATION_MS, FINISH_SEQUENCE, getAnimationState, getFinishAnimationState } from '../src/lib/animation';
import { journeyPoint } from '../src/lib/journey';
import type { AnimationInput } from '../src/types/animation';

function at(elapsed: number, total = 600_000) {
  const input: AnimationInput = { totalDuration: total, remainingTime: total - elapsed, progress: elapsed / total,
    isPaused: false, isFinished: false, hasStarted: true, finishElapsedMs: 0 };
  return getAnimationState(input);
}

test('intro and anticipation precede movement, independent of timer duration', () => {
  for (const total of [60_000, 600_000, 7_200_000]) {
    assert.equal(at(500, total).phase, 'INTRO');
    assert.equal(at(500, total).position, 0);
    assert.equal(at(2000, total).phase, 'START');
    assert.equal(at(3000, total).phase, 'WALK');
  }
});

test('rests hold position, reactions and midpoint have deterministic durations', () => {
  assert.equal(at(90_000).phase, 'REST');
  assert.equal(at(90_000).position, at(91_000).position);
  assert.equal(at(92_000).phase, 'WALK');
  assert.equal(at(180_500).phase, 'REACTION');
  assert.equal(at(180_500).position, .3);
  assert.equal(at(301_000).phase, 'MID_EVENT');
  assert.equal(at(301_000).position, .5);
  assert.equal(at(301_000).sound, 'midpoint');
  assert.equal(at(303_000).phase, 'WALK');
  assert.equal(at(432_000).phase, 'REST');
  assert.equal(at(432_500).position, .75);
});

test('finish recognition and anticipation intervene before running', () => {
  assert.equal(at(460_000).phase, 'LOOK_FINISH');
  assert.equal(at(480_500).phase, 'RUN_START');
  assert.equal(at(483_000).phase, 'RUN');
  assert.ok(at(483_000).speed > at(360_000).speed);
});

test('ten-second countdown and three-second sprint use real seconds at every duration', () => {
  for (const total of [60_000, 600_000, 7_200_000]) {
    for (const second of [10, 9, 6, 4]) {
      const state = at(total - second * 1000, total);
      assert.equal(state.phase, 'COUNTDOWN');
      assert.equal(state.countdownNumber, second);
      assert.equal(state.soundKey, `countdown-${second}`);
    }
    for (const second of [3, 2, 1]) assert.equal(at(total - second * 1000, total).phase, 'SPRINT');
    assert.equal(at(total - 3_000, total).position, .99);
    assert.equal(at(total, total).position, 1);
  }
  assert.equal(at(600_000 * .95).countdownNumber, undefined);
});

test('path movement remains continuous, monotonic and detached from raw progress', () => {
  for (const total of [60_000, 600_000, 7_200_000]) {
    let previous = 0;
    for (let elapsed = 0; elapsed <= total; elapsed += 125) {
      const pose = at(elapsed, total);
      assert.ok(pose.position >= previous - 1e-9, `${total}ms at ${elapsed}ms moved backwards`);
      assert.ok(pose.position >= 0 && pose.position <= 1);
      previous = pose.position;
    }
  }
  assert.notEqual(at(100_000).position, 100_000 / 600_000);
  for (const boundary of [1800, 2800, 90_000, 91_200, 180_000, 181_000, 288_000, 300_000, 301_800, 390_000, 432_000, 433_200, 456_000, 480_000, 481_000, 540_000, 564_000, 590_000, 597_000]) {
    assert.ok(Math.abs(at(boundary - .01).position - at(boundary).position) < .00001, `Discontinuity at ${boundary}`);
  }
});

test('finish crosses, overshoots, brakes, turns, jumps, lands, celebrates in order', () => {
  let elapsed = 0;
  let previous = 1;
  for (const step of FINISH_SEQUENCE) {
    const pose = getFinishAnimationState(elapsed);
    assert.equal(pose.phase, step.phase);
    assert.ok(pose.position >= previous);
    previous = pose.position;
    elapsed += step.duration;
  }
  assert.equal(elapsed, FINISH_DURATION_MS);
  assert.equal(getFinishAnimationState(FINISH_DURATION_MS + 60_000).phase, 'CELEBRATE');
  assert.ok(getFinishAnimationState(600).position > 1);
  assert.ok(journeyPoint(1.06).x > journeyPoint(1).x);
});

test('frozen input restores identical phase, position, action and countdown after pause', () => {
  const input: AnimationInput = { totalDuration: 600_000, remainingTime: 2_400, progress: .996, isPaused: true, isFinished: false, hasStarted: true, finishElapsedMs: 0 };
  const paused = getAnimationState(input);
  assert.deepEqual(paused, getAnimationState({ ...input, isPaused: false }));
  assert.equal(paused.phase, 'SPRINT');
  assert.equal(paused.countdownNumber, 3);
});
