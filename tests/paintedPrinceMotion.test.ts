import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import atlas from '../src/lib/princeAtlas.json';
import { PAINTED_PRINCE_ASSET, princeAnatomy as anatomy, princeSole, paintedPrincePose, settlePaintedPrincePose } from '../src/lib/paintedPrinceMotion';
import { PRINCE_GAIT } from '../src/lib/princeMotion';
import { animalFoot } from '../src/lib/animalMotion';

test('painted prince retains the original ImageGen alpha, and every joint is inside its painted root', async () => {
  const source = await sharp('docs/character-design/prince-v1/prince-atlas.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const exported = await sharp(`public${PAINTED_PRINCE_ASSET}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(source.info.width, atlas.width); assert.equal(source.info.height, atlas.height);
  // WebP normalizes RGB under alpha=0; all alpha and visible paint must remain identical.
  for (let p = 0; p < atlas.width * atlas.height; p++) {
    const i = p * 4;
    assert.equal(exported.data[i + 3], source.data[i + 3]);
    if (source.data[i + 3]) for (let c = 0; c < 3; c++) assert.equal(exported.data[i + c], source.data[i + c]);
  }
  assert.equal(source.data[3], 0);
  const check = (part: keyof typeof atlas.parts, point: { x: number; y: number }) => {
    const [x, y] = atlas.parts[part];
    assert.ok(source.data[((y + Math.round(point.y)) * atlas.width + x + Math.round(point.x)) * 4 + 3] > 200, `${part} joint lies outside its painting`);
  };
  for (const part of ['thigh', 'shin'] as const) { check(part, anatomy[part].pivot); check(part, anatomy[part].tip); }
  check('boot', anatomy.boot.pivot); check('boot', anatomy.boot.sole);
  for (const rig of Object.values(anatomy.arms)) {
    check(rig.upperPart, rig.upperArt.pivot); check(rig.upperPart, rig.upperArt.tip);
    check(rig.lowerPart, rig.lowerArt.pivot); check(rig.lowerPart, rig.lowerArt.tip);
  }
  assert.ok((await readFile(`public${PAINTED_PRINCE_ASSET}`)).length < 1_000_000);
});

test('prince standing and celebration keep separate upright legs and soles on the ground', () => {
  for (const action of ['idle', 'celebrate', 'jump', 'land'] as const) {
    const { joints, bodyY } = paintedPrincePose(action, 1000);
    assert.equal(bodyY, 0);
    for (const [side, rig] of Object.entries(anatomy.legs)) {
      for (const joint of ['thigh', 'shin', 'foot']) assert.equal(joints[`${side}-${joint}` as keyof typeof joints], 0);
      assert.ok(Math.abs(rig.y + rig.upper + rig.lower + princeSole.y - PRINCE_GAIT.groundY) < 1e-8);
    }
  }
  assert.ok(anatomy.legs.back.x - anatomy.legs.front.x >= anatomy.boot.width);
});

test('both prince feet reach their timestamp targets and planted soles match the scenery velocity', () => {
  for (let sample = 0; sample < 480; sample++) {
    const time = sample / 480 * PRINCE_GAIT.cycleMs;
    const { joints, bodyY } = paintedPrincePose('walk', time);
    assert.ok(bodyY <= 2.4 + 1e-8 && bodyY >= 2 - 1e-8);
    for (const side of ['front', 'back'] as const) {
      const rig = anatomy.legs[side], phase = time / PRINCE_GAIT.cycleMs + (side === 'back' ? .5 : 0);
      const target = animalFoot(phase, PRINCE_GAIT), hip = (joints[`${side}-thigh`] + 90) * Math.PI / 180;
      const knee = joints[`${side}-shin`] * Math.PI / 180, pitch = (joints[`${side}-thigh`] + joints[`${side}-shin`] + joints[`${side}-foot`]) * Math.PI / 180;
      const x = rig.x + rig.upper * Math.cos(hip) + rig.lower * Math.cos(hip + knee) + princeSole.x * Math.cos(pitch) - princeSole.y * Math.sin(pitch);
      const y = bodyY + rig.y + rig.upper * Math.sin(hip) + rig.lower * Math.sin(hip + knee) + princeSole.x * Math.sin(pitch) + princeSole.y * Math.cos(pitch);
      assert.ok(Math.abs(x - (rig.x + target.x + princeSole.x)) < 1e-6, `Unreachable stride at ${time}`);
      assert.ok(Math.abs(y - (PRINCE_GAIT.groundY - target.lift)) < 1e-6, `Floating foot at ${time}`);
      const next = animalFoot(phase + .0001, PRINCE_GAIT);
      if (target.planted && next.planted) assert.ok(Math.abs(next.x - target.x + PRINCE_GAIT.travel * .0001) < 1e-8);
    }
  }
});

test('prince arms counter their own legs and both celebration hands clear the head', () => {
  const start = paintedPrincePose('walk', 0).joints, half = paintedPrincePose('walk', PRINCE_GAIT.cycleMs / 2).joints;
  assert.ok(start['front-arm'] > half['front-arm']); assert.ok(start['back-arm'] < half['back-arm']);
  const pose = paintedPrincePose('celebrate', 1000).joints;
  for (const side of ['front', 'back'] as const) {
    const rig = anatomy.arms[side], a = (pose[`${side}-arm`] + 90) * Math.PI / 180, b = a + pose[`${side}-elbow`] * Math.PI / 180;
    const hand = { x: rig.x + rig.upper * Math.cos(a) + rig.lower * Math.cos(b), y: rig.y + rig.upper * Math.sin(a) + rig.lower * Math.sin(b) };
    assert.ok(side === 'front' ? hand.x < anatomy.head.x - 8 : hand.x > anatomy.head.x + anatomy.head.width + 8);
    assert.ok(hand.y < rig.y - 20);
  }
});

test('prince gait joins continuously, settles to rest and reduced motion is stable', () => {
  const a = paintedPrincePose('walk', PRINCE_GAIT.cycleMs - .00001), b = paintedPrincePose('walk', PRINCE_GAIT.cycleMs + .00001);
  for (const name of Object.keys(a.joints) as (keyof typeof a.joints)[]) assert.ok(Math.abs(a.joints[name] - b.joints[name]) < .001);
  assert.ok(Math.abs(a.bodyY - b.bodyY) < .001);
  assert.deepEqual(settlePaintedPrincePose(990, 350), paintedPrincePose('idle', 0));
  assert.deepEqual(paintedPrincePose('walk', 200, true), paintedPrincePose('walk', 99_000, true));
});
