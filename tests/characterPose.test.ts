import test from 'node:test';
import assert from 'node:assert/strict';
import { footTarget, getCharacterPose, LEG_LENGTH, solveLeg } from '../src/lib/characterPose';

function forward(hip: number, knee: number) {
  const a = hip * Math.PI / 180;
  const b = (hip + knee) * Math.PI / 180;
  return { x: -Math.sin(a) * LEG_LENGTH.thigh - Math.sin(b) * LEG_LENGTH.shin,
    y: Math.cos(a) * LEG_LENGTH.thigh + Math.cos(b) * LEG_LENGTH.shin };
}

test('two-bone leg follows a planted foot and its ankle cancels knee rotation', () => {
  for (let i = 0; i < 100; i++) {
    const target = footTarget(i / 100, 12, 8);
    const result = solveLeg(target.x, target.y, target.toe);
    const point = forward(result.hip, result.knee);
    assert.ok(Math.abs(point.x - target.x) < .001);
    assert.ok(Math.abs(point.y - target.y) < .001);
    assert.ok(Math.abs(result.hip + result.knee + result.ankle - target.toe) < .001);
    if (target.planted) assert.equal(target.y, 37);
  }
  assert.ok(footTarget(.8, 12, 8).y < 37, 'Swing foot lifts off the ground');
});

test('feet exchange their leading position and arms counter-swing a half-cycle later', () => {
  const first = getCharacterPose('walk', 0, 780);
  const next = getCharacterPose('walk', 390, 780);
  const nearA = forward(first['front-thigh'], first['front-shin']).x + 72;
  const farA = forward(first['back-thigh'], first['back-shin']).x + 86;
  const nearB = forward(next['front-thigh'], next['front-shin']).x + 72;
  const farB = forward(next['back-thigh'], next['back-shin']).x + 86;
  assert.ok(nearA > farA);
  assert.ok(nearB < farB);
  assert.ok(first['front-arm'] > 0 && next['front-arm'] < 0);
  assert.ok(first['back-arm'] < 0 && next['back-arm'] > 0);
});

test('idle/reduced motion are still; landing and celebration have their own poses', () => {
  assert.deepEqual(getCharacterPose('idle', 100, 780), getCharacterPose('idle', 700, 780));
  assert.deepEqual(getCharacterPose('walk', 100, 780, true), getCharacterPose('walk', 700, 780, true));
  assert.ok(getCharacterPose('jump', 300, 780)['front-arm'] < -100);
  assert.ok(getCharacterPose('land', 200, 780)['front-shin'] > getCharacterPose('idle', 0, 780)['front-shin']);
  assert.notEqual(getCharacterPose('celebrate', 100, 780)['front-arm'], getCharacterPose('celebrate', 300, 780)['front-arm']);
});

test('all poses stay finite through a two-hour journey and are reproducible on restoration', () => {
  for (const action of ['idle', 'appear', 'start', 'walk', 'fastWalk', 'look', 'hop', 'run', 'sprint', 'brake', 'turn', 'jump', 'land', 'celebrate'] as const) {
    for (const elapsed of [0, 100, 300, 780, 60_000, 7_200_000]) {
      const pose = getCharacterPose(action, elapsed, 780);
      assert.ok(Object.values(pose).every(Number.isFinite));
      assert.deepEqual(pose, getCharacterPose(action, elapsed, 780));
    }
  }
});
