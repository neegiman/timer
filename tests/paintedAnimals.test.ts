import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import atlases from '../src/lib/animalAtlases.json';
import { animalActionPose, settleAnimalPose } from '../src/lib/animalActionPose';
import { animalIds, animalPose } from '../src/lib/animalMotion';
import { motionProfile } from '../src/lib/motionProfiles';
import { locomotionTime } from '../src/lib/journey';
import { rabbitAnatomy } from '../src/lib/rabbitAnatomy';

test('five ImageGen atlases retain transparent alpha and lossless visible fur pixels', async () => {
  for (const id of animalIds) {
    const source = await sharp(`docs/character-design/raster-v1/atlases/${id}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const asset = await sharp(`public/characters/raster-v1/${id}.webp`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(asset.info.width, atlases[id].width); assert.equal(asset.info.height, atlases[id].height);
    assert.equal(source.data.length, asset.data.length);
    let transparent = 0, opaque = 0;
    for (let pixel = 0; pixel < source.data.length; pixel += 4) {
      assert.equal(asset.data[pixel + 3], source.data[pixel + 3], `${id} alpha changed`);
      if (!source.data[pixel + 3]) { transparent++; continue; }
      opaque++;
      for (let channel = 0; channel < 3; channel++) assert.equal(asset.data[pixel + channel], source.data[pixel + channel], `${id} visible color changed`);
    }
    assert.ok(transparent > source.info.width * source.info.height * .4);
    assert.ok(opaque > source.info.width * source.info.height * .15);
  }
});

test('each painted atlas contains twelve distinct nonempty, in-bounds parts', async () => {
  for (const id of animalIds) {
    const atlas = atlases[id], pixels = await sharp(`public/characters/raster-v1/${id}.webp`).ensureAlpha().raw().toBuffer();
    assert.equal(Object.keys(atlas.parts).length, 12);
    for (const [name, [x, y, width, height]] of Object.entries(atlas.parts)) {
      assert.ok(x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= atlas.width && y + height <= atlas.height, `${id}/${name} is clipped`);
      let painted = 0;
      for (let row = y; row < y + height; row++) for (let column = x; column < x + width; column++) if (pixels[(row * atlas.width + column) * 4 + 3] >= 160) painted++;
      assert.ok(painted > 500, `${id}/${name} is empty`);
    }
  }
});

test('rabbit torso and head preserve the painted proportions and cover all four limb sockets', async () => {
  const atlas = atlases.rabbit;
  const { data, info } = await sharp('public/characters/raster-v1/rabbit.webp').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const name of ['torso', 'head', 'earNear', 'earFar'] as const) {
    const bounds = rabbitAnatomy[name], source = atlas.parts[name];
    assert.ok(Math.abs(bounds.width / bounds.height / (source[2] / source[3]) - 1) < .001, `${name} is stretched`);
  }
  const torso = rabbitAnatomy.torso, [left, top, width, height] = atlas.parts.torso;
  for (const [name, rig] of Object.entries(rabbitAnatomy.paws)) {
    // A root must be buried in opaque fur, including a 3-unit overlap around it.
    // This catches the former far foreleg placed beyond the chest, not just IK accuracy.
    for (const dx of [-3, 0, 3]) for (const dy of [-3, 0, 3]) {
      const x = Math.round(left + (rig.x + dx - torso.x) / torso.width * width);
      const y = Math.round(top + (rig.y + dy - torso.y) / torso.height * height);
      assert.ok(data[(y * info.width + x) * 4 + 3] >= 240, `${name} root is outside the painted body at ${dx},${dy}`);
    }
  }
});

test('rabbit hind-leg landmarks lie in painted fur, including the knee, hock and toe pad', async () => {
  const atlas = atlases.rabbit;
  const { data, info } = await sharp('public/characters/raster-v1/rabbit.webp').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const [part, landmarks] of [
    ['hindUpper', rabbitAnatomy.hindArtwork.upper],
    ['hindLower', rabbitAnatomy.hindArtwork.lower],
    ['hindPaw', { pivot: rabbitAnatomy.hindArtwork.paw.pivot, tip: rabbitAnatomy.hindArtwork.paw.sole }],
  ] as const) {
    const [left, top] = atlas.parts[part];
    for (const [name, point] of Object.entries(landmarks)) for (const dx of [-2, 0, 2]) for (const dy of [-2, 0, 2]) {
      const pixel = ((top + point.y + dy) * info.width + left + point.x + dx) * 4;
      assert.ok(data[pixel + 3] >= 160, `${part}/${name} is outside painted fur`);
    }
  }
});

test('painted journey gait equals its motion study and is stable on pause or restoration', () => {
  for (const id of animalIds) {
    const gait = locomotionTime(32_400, 600_000), profile = motionProfile(id);
    const actual = animalActionPose(id, 'walk', gait);
    assert.deepEqual(actual, animalPose(id, gait));
    assert.deepEqual(actual, animalActionPose(id, 'walk', gait));
    assert.equal(actual.ground, gait / profile.cycleMs * (animalPose(id, profile.cycleMs).ground));
    assert.deepEqual(animalActionPose(id, 'walk', 100, true), animalPose(id, 0, false));
  }
});

test('arrival settles from the current four-paw pose before jump, landing and celebration', () => {
  for (const id of animalIds) {
    const gait = locomotionTime(600_000, 600_000);
    assert.deepEqual(settleAnimalPose(id, gait, 0).joints, animalPose(id, gait).joints);
    assert.deepEqual(settleAnimalPose(id, gait, 350).joints, animalActionPose(id, 'idle', 0).joints);
    assert.ok(Math.abs(settleAnimalPose(id, gait, 350).bob) < 1e-9);
    for (const action of ['jump', 'land', 'celebrate'] as const) {
      assert.ok(Object.values(animalActionPose(id, action, 240).joints).every(Number.isFinite));
      assert.deepEqual(animalActionPose(id, action, 240, true), animalPose(id, 0, false));
    }
  }
});
