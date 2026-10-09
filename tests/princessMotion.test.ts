import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import atlas from '../src/lib/princessAtlas.json';
import { princessAnatomy as anatomy, princessPose, princessSole, PRINCESS_GAIT, settlePrincessPose } from '../src/lib/princessMotion';
import { animalFoot } from '../src/lib/animalMotion';
import { characters, getCharacter } from '../src/lib/characters';

test('princess source survives lossless conversion and its joints sit inside painted limbs', async () => {
  const options = { resolveWithObject: true } as const;
  const original = await sharp('docs/character-design/princess-v1/princess-atlas.png').ensureAlpha().raw().toBuffer(options);
  const runtime = await sharp('public/characters/raster-v1/princess.webp').ensureAlpha().raw().toBuffer(options);
  assert.equal(runtime.info.width, atlas.width); assert.equal(runtime.info.height, atlas.height);
  // Lossless WebP may normalize RGB under completely transparent pixels; visible paint must match.
  for (let pixel = 0; pixel < runtime.info.width * runtime.info.height; pixel++) {
    const offset = pixel * 4;
    assert.equal(runtime.data[offset + 3], original.data[offset + 3]);
    if (original.data[offset + 3]) for (let channel = 0; channel < 3; channel++) assert.equal(runtime.data[offset + channel], original.data[offset + channel]);
  }
  for (const [part, landmarks] of [
    ['thigh', anatomy.thigh], ['shin', anatomy.shin],
    ['upperArm', anatomy.arms.front.upperArt], ['foreArm', anatomy.arms.front.lowerArt],
    ['backUpperArm', anatomy.arms.back.upperArt], ['backForeArm', anatomy.arms.back.lowerArt],
    ['shoe', { pivot: anatomy.shoe.pivot, tip: anatomy.shoe.sole }],
  ] as const) {
    const [left, top] = atlas.parts[part];
    for (const point of [landmarks.pivot, landmarks.tip]) {
      const alpha = runtime.data[((top + point.y) * atlas.width + left + point.x) * 4 + 3];
      assert.ok(alpha >= 160, `${part} joint is outside the painting`);
    }
  }
  for (const part of ['head', 'bodice', 'skirt'] as const) {
    assert.ok(Math.abs(anatomy[part].width / anatomy[part].height - atlas.parts[part][2] / atlas.parts[part][3]) < 1e-8);
  }
});

test('two alternating princess feet stay planted and travel at exactly the scenery speed', () => {
  const radians = Math.PI / 180;
  for (let sample = 0; sample < 400; sample++) {
    const cycle = sample / 400, pose = princessPose('walk', cycle * PRINCESS_GAIT.cycleMs);
    assert.equal(pose['front-arm'], -pose['back-arm']);
    for (const side of ['front', 'back'] as const) {
      const rig = anatomy.legs[side], foot = animalFoot(cycle + (side === 'back' ? .5 : 0), PRINCESS_GAIT);
      const hip = (pose[`${side}-thigh`] + 90) * radians, knee = pose[`${side}-shin`] * radians;
      const pitch = (pose[`${side}-thigh`] + pose[`${side}-shin`] + pose[`${side}-foot`]) * radians;
      const x = rig.x + rig.upper * Math.cos(hip) + rig.lower * Math.cos(hip + knee) + princessSole.x * Math.cos(pitch) - princessSole.y * Math.sin(pitch);
      const y = rig.y + rig.upper * Math.sin(hip) + rig.lower * Math.sin(hip + knee) + princessSole.x * Math.sin(pitch) + princessSole.y * Math.cos(pitch);
      assert.ok(Math.abs(x - (rig.x + foot.x + princessSole.x)) < 1e-6, 'Leg cannot reach its horizontal target');
      assert.ok(Math.abs(y - (PRINCESS_GAIT.groundY - foot.lift)) < 1e-6, 'Painted sole leaves the ground during support');
      assert.ok(pose[`${side}-shin`] > 0, 'Knee flipped its bend direction');
    }
  }
  const a = animalFoot(.1, PRINCESS_GAIT), b = animalFoot(.2, PRINCESS_GAIT);
  assert.ok(a.planted && b.planted);
  assert.ok(Math.abs(b.x - a.x + PRINCESS_GAIT.travel * .1) < 1e-8);
});

test('princess loops are continuous, settling ends at idle and reduced motion keeps both feet still', () => {
  const before = princessPose('walk', PRINCESS_GAIT.cycleMs - .00001);
  const after = princessPose('walk', PRINCESS_GAIT.cycleMs + .00001);
  for (const name of Object.keys(after) as (keyof typeof after)[]) assert.ok(Math.abs(before[name] - after[name]) < .001);
  assert.deepEqual(settlePrincessPose(990, 350), princessPose('idle', 0));
  assert.deepEqual(princessPose('walk', 200, true), princessPose('walk', 99_000, true));
  assert.equal(getCharacter('princess').name, '공주');
  assert.equal(new Set(characters.map(({ id }) => id)).size, characters.length);
});
