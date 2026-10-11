import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stat, readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { animalPose, animalProfiles } from '../src/lib/animalMotion';
import { torsoOffset } from '../src/lib/animalBodyMotion';
import type { PawName } from '../src/lib/animalMotion';
import { WALK_SPRITE, WALK_SPRITE_DIRECTORY, walkingFrame, walkingFrameViewBox, walkingSpritePath } from '../src/lib/walkingSprites';
import { walkingArtDigest } from '../scripts/walking-art-inputs.mjs';

test('exported motion was baked from the current paintings, anatomy and joint renderer', async () => {
  const { sources, ...spec } = JSON.parse(await readFile(`public${WALK_SPRITE_DIRECTORY}/manifest.json`, 'utf8'));
  assert.deepEqual(spec, WALK_SPRITE);
  assert.equal(sources, await walkingArtDigest(), 'Stale walking artwork: run npm run walking-art');
});

test('walking frames use the elapsed clock, wrap cleanly and fit mobile texture dimensions', () => {
  const spec = WALK_SPRITE;
  for (const id of ['dog', 'cat'] as const) {
    const cycle = animalProfiles[id].cycleMs;
    assert.equal(walkingFrame(id, -1), 0);
    assert.equal(walkingFrame(id, cycle), 0);
    assert.equal(walkingFrame(id, cycle * 1000 + cycle / 2), spec.frames / 2);
    assert.equal(walkingFrame(id, cycle - .001), spec.frames - 1);
    assert.equal(walkingFrameViewBox(16), '0 244 160 122');
    assert.ok(spec.frames / (cycle / 1000) >= 60);
    assert.ok(spec.columns * spec.width * spec.scale < 4096);
    assert.ok(Math.ceil(spec.frames / spec.columns) * spec.height * spec.scale < 4096);
  }
});

test('exported walking frames retain solid joint overlaps, toe contacts and the transparent ground baseline', async () => {
  const { width, height, frames, columns, scale, y: top } = WALK_SPRITE;
  for (const id of ['dog', 'cat'] as const) {
    const path = `public${walkingSpritePath(id)}`;
    assert.ok((await stat(path)).size < 3_500_000, `${id} download exceeds its static asset budget`);
    const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, width * scale * columns);
    assert.equal(info.height, height * scale * Math.ceil(frames / columns));
    for (let frame = 0; frame < frames; frame++) {
      const pose = animalPose(id, frame / frames * animalProfiles[id].cycleMs);
      const x0 = frame % columns * width * scale, y0 = Math.floor(frame / columns) * height * scale;
      for (const [paw, contact] of Object.entries(pose.feet)) {
        const x = Math.round(x0 + contact.x * scale), y = Math.round(y0 + (contact.y - top - .8) * scale);
        let alpha = 0;
        for (let dy = -2; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) alpha = Math.max(alpha, data[((y + dy) * info.width + x + dx) * 4 + 3]);
        assert.ok(alpha >= 80, `${id}/${paw} painted toe missing in frame ${frame}`);
      }
      // A one-pixel connection can pass a flood-fill while still looking like
      // separate cut-outs. Require opaque fur across the actual shared joint.
      for (const [name, rig] of Object.entries(animalProfiles[id].paws)) {
        const paw = name as PawName;
        const hip = pose.joints[`${paw}Hip`] * Math.PI / 180;
        const knee = pose.joints[`${paw}Knee`] * Math.PI / 180;
        const kx = rig.x - Math.sin(hip) * rig.upper;
        const ky = pose.bob + rig.y + torsoOffset(id, pose.body.torso, rig.x) + Math.cos(hip) * rig.upper;
        const joints = [[kx, ky], [kx - Math.sin(hip + knee) * rig.lower, ky + Math.cos(hip + knee) * rig.lower]];
        for (const [joint, [jx, jy]] of joints.entries()) for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
          if (dx * dx + dy * dy > 25) continue;
          const x = Math.round(x0 + jx * scale + dx), y = Math.round(y0 + (jy - top) * scale + dy);
          assert.ok(data[(y * info.width + x) * 4 + 3] >= 235, `${id}/${paw}/${joint ? 'ankle' : 'knee'} fur opens in frame ${frame}`);
        }
      }
      const lastRow = y0 + height * scale - 1;
      for (let x = x0; x < x0 + width * scale; x++) assert.equal(data[(lastRow * info.width + x) * 4 + 3], 0, `${id} clipping below the ground`);
    }
  }
});
