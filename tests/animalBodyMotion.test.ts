import { test } from 'node:test';
import assert from 'node:assert/strict';
import { animalPose, animalProfiles } from '../src/lib/animalMotion';
import { TORSO_PANELS, TAIL_PANELS, TAIL_CUTS, torsoPanelMatrix, tailPanelMatrix, torsoOffset } from '../src/lib/animalBodyMotion';
import { walkingAnatomy } from '../src/lib/walkingAnatomy';
import { settleAnimalPose } from '../src/lib/animalActionPose';

const map = (matrix: number[], x: number, y: number) => ({ x: matrix[0] * x + matrix[2] * y + matrix[4], y: matrix[1] * x + matrix[3] * y + matrix[5] });

test('deformed paintings share every panel edge, keep the tail root fixed and preserve body width', () => {
  for (const id of ['dog', 'cat'] as const) for (let sample = 0; sample < 100; sample++) {
    const pose = animalPose(id, sample / 100 * animalProfiles[id].cycleMs), bounds = walkingAnatomy[id].torso;
    for (let index = 1; index < TORSO_PANELS; index++) for (const y of [bounds.y, bounds.y + bounds.height]) {
      const x = bounds.x + bounds.width * index / TORSO_PANELS;
      const before = map(torsoPanelMatrix(id, pose.body, index - 1), x, y), after = map(torsoPanelMatrix(id, pose.body, index), x, y);
      assert.ok(Math.abs(before.y - after.y) < 1e-10);
      assert.equal(before.x, x); assert.equal(after.x, x);
      assert.ok(Math.abs(after.y - y - torsoOffset(id, pose.body.torso, x)) < 1e-10);
    }
    for (let index = 1; index < TAIL_PANELS; index++) {
      const before = map(tailPanelMatrix(pose.body, index - 1), 0, TAIL_CUTS[index]);
      const after = map(tailPanelMatrix(pose.body, index), 0, TAIL_CUTS[index]);
      assert.ok(Math.abs(before.x - after.x) < 1e-10);
    }
    assert.deepEqual(map(tailPanelMatrix(pose.body, TAIL_PANELS - 1), 0, 0), { x: 0, y: 0 });
  }
});

test('cat keeps its head level while its trunk and tail flex; dog has stronger elastic bob and nod', () => {
  let catBob = 0, dogBob = 0, catHead = 0, dogHead = 0, catFlex = 0, dogFlex = 0, catTail = 0;
  for (let sample = 0; sample < 100; sample++) {
    const cat = animalPose('cat', sample / 100 * animalProfiles.cat.cycleMs), dog = animalPose('dog', sample / 100 * animalProfiles.dog.cycleMs);
    assert.ok(Math.abs(cat.bob + cat.body.headY) < 1e-10);
    catBob = Math.max(catBob, Math.abs(cat.bob)); dogBob = Math.max(dogBob, Math.abs(dog.bob));
    catHead = Math.max(catHead, Math.abs(cat.joints.head)); dogHead = Math.max(dogHead, Math.abs(dog.joints.head));
    catFlex = Math.max(catFlex, ...cat.body.torso.map(Math.abs)); dogFlex = Math.max(dogFlex, ...dog.body.torso.map(Math.abs));
    catTail = Math.max(catTail, ...cat.body.tail.map(Math.abs));
    assert.ok(cat.body.torso[0] * cat.body.torso[TORSO_PANELS] <= 0);
  }
  assert.ok(dogBob > catBob * 3 && dogBob < .5);
  assert.ok(dogHead > catHead * 4);
  assert.ok(catFlex > dogFlex * 2 && catFlex < 1.4 && catTail > 2);
  const dogPhases = animalProfiles.dog.phases, catPhases = animalProfiles.cat.phases;
  assert.ok(Math.abs(dogPhases.nearFore - dogPhases.farHind) < Math.abs(catPhases.nearFore - catPhases.farHind));
});

test('body waves close at the loop boundary and settle to zero without restarting', () => {
  for (const id of ['dog', 'cat'] as const) {
    const cycle = animalProfiles[id].cycleMs, before = animalPose(id, cycle - .0001), after = animalPose(id, cycle + .0001);
    for (const field of ['torso', 'tail'] as const) for (let index = 0; index < before.body[field].length; index++) {
      assert.ok(Math.abs(before.body[field][index] - after.body[field][index]) < .00001);
    }
    const gait = cycle * 2.13, moving = animalPose(id, gait), settled = settleAnimalPose(id, gait, 350);
    assert.deepEqual(settleAnimalPose(id, gait, 0).body, moving.body);
    assert.ok([...settled.body.torso, ...settled.body.tail, settled.body.headY, settled.body.tailY].every((value) => Math.abs(value) < 1e-10));
    assert.ok([...animalPose(id, cycle, false).body.torso, ...animalPose(id, cycle, false).body.tail].every((value) => value === 0));
  }
});
