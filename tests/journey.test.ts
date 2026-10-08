import { test } from 'node:test';
import assert from 'node:assert/strict';
import { finishApproach, groundDistance, locomotionTime, loopOffset, SUPPORT_FRACTION, TILE_WIDTH } from '../src/lib/journey';
import { footTarget } from '../src/lib/characterPose';

test('locomotion gently starts and stops, keeping the same speed across milestones', () => {
  const total = 600_000;
  const speed = (time: number) => locomotionTime(time + 1, total) - locomotionTime(time, total);
  assert.ok(speed(0) < .001);
  assert.ok(speed(200) < speed(600));
  for (const time of [800, 300_000, 540_000, 590_000]) assert.equal(speed(time), 1);
  assert.ok(speed(total - 600) > speed(total - 200));
  assert.ok(speed(total - 1) < .001);
  assert.equal(locomotionTime(total + 60_000, total), locomotionTime(total, total));
});

test('a planted foot and the ground have exactly the same horizontal velocity', () => {
  const cycle = 780;
  for (const side of [0, .5]) {
    for (const phase of [.05, .1, .2, .4]) {
      const elapsed = (phase + side) * cycle;
      const before = footTarget(phase, 12, 8);
      const after = footTarget(phase + 10 / cycle, 12, 8);
      assert.equal(before.planted, true);
      assert.equal(after.planted, true);
      assert.ok(Math.abs((after.x - before.x) + groundDistance(elapsed + 10, cycle) - groundDistance(elapsed, cycle)) < 1e-10);
      assert.equal(after.y, before.y);
    }
  }
  assert.equal(groundDistance(780, 780), 24 / SUPPORT_FRACTION);
});

test('scenery wraps by precisely one whole tile without accumulated drift', () => {
  for (const cycle of [1, 2, 100, 10_000]) {
    assert.ok(Math.abs(loopOffset(TILE_WIDTH * cycle + 12.5) - 12.5) < 1e-9);
    assert.ok(Math.abs(loopOffset(TILE_WIDTH * cycle - .01) - (TILE_WIDTH - .01)) < 1e-8);
    assert.equal(loopOffset(TILE_WIDTH * cycle), 0);
  }
});

test('single finish approaches continuously only in the final tenth and arrives exactly at zero', () => {
  for (const width of [288, 358, 768, 1200]) {
    const actorX = width * .42;
    assert.equal(finishApproach(.89999, width, actorX, 124).opacity, 0);
    let previous = Infinity;
    for (const progress of [.9, .91, .95, .99, .99999, 1]) {
      const goal = finishApproach(progress, width, actorX, 124);
      assert.ok(goal.x <= previous);
      if (progress < 1) assert.ok(goal.x > goal.target);
      else assert.equal(goal.x, goal.target);
      previous = goal.x;
    }
    assert.deepEqual(finishApproach(2, width, actorX, 124), finishApproach(1, width, actorX, 124));
  }
});
