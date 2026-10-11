import { test } from 'node:test';
import assert from 'node:assert/strict';
import { animalPose, animalProfiles } from '../src/lib/animalMotion';
import { torsoOffset } from '../src/lib/animalBodyMotion';
import { limbSkinPoint, limbSkinMatrix, limbSkinTriangles } from '../src/lib/animalLimbSkin';
import type { PawName } from '../src/lib/animalMotion';

const map = (m: number[], p: { x: number; y: number }) => ({ x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] });
const close = (a: { x: number; y: number }, b: { x: number; y: number }) => assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 1e-9);

test('upper-leg skin stays on the torso across the entire root and meets the moving knee', () => {
  for (const id of ['dog', 'cat'] as const) for (let frame = 0; frame < 100; frame++) {
    const pose = animalPose(id, animalProfiles[id].cycleMs * frame / 100);
    for (const paw of Object.keys(animalProfiles[id].paws) as PawName[]) {
      const rig = animalProfiles[id].paws[paw]!, hip = pose.joints[`${paw}Hip`], angle = hip * Math.PI / 180;
      for (const x of [-12, -6, 0, 6, 12]) close(limbSkinPoint(id, paw, pose.body, hip, { x, y: 0 }), {
        x, y: torsoOffset(id, pose.body.torso, rig.x + x) - torsoOffset(id, pose.body.torso, rig.x),
      });
      for (const x of [-6, 0, 6]) close(limbSkinPoint(id, paw, pose.body, hip, { x, y: rig.upper }), {
        x: x * Math.cos(angle) - rig.upper * Math.sin(angle), y: x * Math.sin(angle) + rig.upper * Math.cos(angle),
      });
    }
  }
});

test('every shared skin vertex agrees across triangles without inversions or loop-boundary jumps', () => {
  for (const id of ['dog', 'cat'] as const) for (let frame = 0; frame <= 100; frame++) {
    const pose = animalPose(id, animalProfiles[id].cycleMs * frame / 100);
    for (const paw of Object.keys(animalProfiles[id].paws) as PawName[]) {
      const rig = animalProfiles[id].paws[paw]!, hip = pose.joints[`${paw}Hip`];
      for (const triangle of limbSkinTriangles(rig.upper)) {
        const matrix = limbSkinMatrix(id, paw, pose.body, hip, triangle);
        assert.ok(matrix[0] * matrix[3] - matrix[1] * matrix[2] > .2, `${id}/${paw}: folded skin`);
        for (const vertex of triangle) close(map(matrix, vertex), limbSkinPoint(id, paw, pose.body, hip, vertex));
        if (frame === 100) for (const vertex of triangle) {
          const start = animalPose(id, 0);
          close(map(matrix, vertex), limbSkinPoint(id, paw, start.body, start.joints[`${paw}Hip`], vertex));
        }
      }
    }
  }
});
