import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FINISH_DURATION_MS, FINISH_SEQUENCE, getAnimationState, getFinishAnimationState, JOURNEY_MESSAGES } from '../src/lib/animation';
import type { AnimationInput } from '../src/types/animation';

function input(elapsed: number, total = 600_000): AnimationInput {
  return { totalDuration: total, remainingTime: total - elapsed, progress: elapsed / total,
    isPaused: false, isFinished: false, hasStarted: true, finishElapsedMs: 0 };
}
const at = (elapsed: number, total = 600_000) => getAnimationState(input(elapsed, total));

test('message milestones use exact elapsed timestamps at 1, 10 and 120 minutes', () => {
  for (const total of [60_000, 600_000, 7_200_000]) {
    for (const [progress, stage] of [[0, 'beginning'], [.499999, 'beginning'], [.5, 'halfway'], [.899999, 'halfway'], [.9, 'near'], [.999999, 'near'], [1, 'arrived']] as const) {
      const state = at(total * progress, total);
      assert.equal(state.messageStage, stage);
      assert.equal(state.message, JOURNEY_MESSAGES[stage]);
      assert.ok(Math.abs(state.position - progress) < 1e-10, 'miniature journey follows actual time');
    }
  }
});

test('message events do not restart gait, pause walking or trigger running', () => {
  for (const elapsed of [0, 3000, 90_000, 180_000, 300_000, 432_000, 480_000, 540_000, 590_000, 597_000, 599_999]) {
    const state = at(elapsed);
    assert.equal(state.phase, 'WALK');
    assert.equal(state.phaseKey, 'walking');
    assert.equal(state.characterAction, 'walk');
    assert.equal(state.speed, 1);
    assert.equal(state.actionElapsedMs, elapsed);
  }
  assert.equal(at(300_000).soundKey, 'midpoint');
  assert.equal(at(540_000).soundKey, 'finish-recognition');
  assert.equal(at(590_000).sound, 'sparkle');
});

test('finish settles, jumps, lands and celebrates with the progress held at the endpoint', () => {
  let elapsed = 0;
  for (const step of FINISH_SEQUENCE) {
    const state = getFinishAnimationState(elapsed);
    assert.equal(state.phase, step.phase);
    assert.equal(state.position, 1);
    assert.equal(state.actionElapsedMs, 0);
    assert.equal(state.messageStage, 'arrived');
    assert.equal(state.sound, step.phase === 'CELEBRATE' ? 'finish' : undefined);
    elapsed += step.duration;
  }
  assert.equal(elapsed, FINISH_DURATION_MS);
  assert.equal(getFinishAnimationState(elapsed + 60_000).phase, 'CELEBRATE');
  assert.equal(at(600_000).phase, 'SETTLE');
});

test('pause and refreshed inputs preserve phase, gait and miniature position', () => {
  const original = input(548_123);
  assert.deepEqual(getAnimationState(original), getAnimationState({ ...original, isPaused: true }));
  const ready = getAnimationState({ ...original, hasStarted: false });
  assert.equal(ready.phase, 'READY');
  assert.equal(ready.position, 0);
  assert.equal(ready.characterAction, 'idle');
});
