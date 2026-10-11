import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import atlas from '../src/lib/princeAtlas.json';
import clothingAtlas from '../src/lib/princeClothingAtlas.json';
import bootAtlas from '../src/lib/princeBootAtlas.json';
import { PAINTED_PRINCE_ASSET, PAINTED_PRINCE_CLOTHING_ASSET, PAINTED_PRINCE_BOOT_ASSET, princeAnatomy as anatomy, princeSole, paintedPrincePose, settlePaintedPrincePose } from '../src/lib/paintedPrinceMotion';
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
  for (const rig of Object.values(anatomy.arms)) {
    check(rig.upperPart, rig.upperArt.pivot); check(rig.upperPart, rig.upperArt.tip);
    check(rig.lowerPart, rig.lowerArt.pivot); check(rig.lowerPart, rig.lowerArt.tip);
  }
  assert.ok((await readFile(`public${PAINTED_PRINCE_ASSET}`)).length < 1_000_000);
});

test('prince short vest preserves its paint and joins cream long trousers at both hips', async () => {
  const source = await sharp('docs/character-design/prince-v3/prince-clothing.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const exported = await sharp(`public${PAINTED_PRINCE_CLOTHING_ASSET}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(source.info.width, clothingAtlas.width); assert.equal(source.info.height, clothingAtlas.height);
  for (let i = 0; i < source.data.length; i += 4) {
    assert.equal(exported.data[i + 3], source.data[i + 3]);
    if (source.data[i + 3]) for (let c = 0; c < 3; c++) assert.equal(exported.data[i + c], source.data[i + c]);
  }
  const [left, top, width, height] = clothingAtlas.parts.torso;
  const pixel = (x: number, y: number) => source.data.subarray((y * clothingAtlas.width + x) * 4, (y * clothingAtlas.width + x) * 4 + 4);
  assert.equal(pixel(500, 1100)[3], 0, 'The space between legs must have no backdrop or halo');
  for (const rig of Object.values(anatomy.legs)) {
    const x = left + Math.round((rig.x - anatomy.torso.x) / anatomy.torso.width * width);
    const y = top + Math.round((rig.y - anatomy.torso.y) / anatomy.torso.height * height);
    assert.ok(pixel(x, y)[3] > 200, 'Hip joint is outside the new trouser waistband');
    const [legX, legY] = clothingAtlas.parts[rig.part];
    for (const bone of [rig.thigh, rig.shin]) for (const point of [bone.pivot, bone.tip]) {
      assert.ok(pixel(legX + point.x, legY + point.y)[3] > 200, 'Trouser joint must be inside the continuous painting');
    }
  }
  // A blue flared hem below the waist would read as a skirt even with animated trouser legs.
  const belowWaist = top + Math.ceil((anatomy.legs.front.y - anatomy.torso.y) / anatomy.torso.height * height);
  let cream = 0, blue = 0, painted = 0;
  for (let y = belowWaist; y < top + height; y++) for (let x = left; x < left + width; x++) {
    const [r, g, b, a] = pixel(x, y);
    if (a < 128) continue;
    painted++;
    if (r > 160 && r > b * 1.08 && g > b) cream++;
    if (b > r * 1.08) blue++;
  }
  assert.ok(cream / painted > .75, 'Cream trousers must begin immediately below the belt');
  assert.ok(blue / painted < .02, 'The vest must not flare into a blue skirt below the belt');
});

test('prince tall boots preserve the source paint and anchor inside the cuff and sole', async () => {
  const source = await sharp('docs/character-design/prince-v3/prince-boot.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const exported = await sharp(`public${PAINTED_PRINCE_BOOT_ASSET}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(source.info.width, bootAtlas.width); assert.equal(source.info.height, bootAtlas.height);
  for (let i = 0; i < source.data.length; i += 4) {
    assert.equal(exported.data[i + 3], source.data[i + 3]);
    if (source.data[i + 3]) for (let c = 0; c < 3; c++) assert.equal(exported.data[i + c], source.data[i + c]);
  }
  const [x, y] = bootAtlas.parts.boot;
  for (const point of [anatomy.boot.pivot, anatomy.boot.sole]) assert.ok(source.data[((y + point.y) * bootAtlas.width + x + point.x) * 4 + 3] > 200);
});

test('prince trousers share continuous knee fabric without a change in leg thickness', () => {
  for (const rig of Object.values(anatomy.legs)) {
    assert.deepEqual(rig.thigh.tip, rig.shin.pivot, 'The knee must use the same point in the painted fabric');
    const upperScale = rig.upper / Math.hypot(rig.thigh.tip.x - rig.thigh.pivot.x, rig.thigh.tip.y - rig.thigh.pivot.y);
    const lowerScale = rig.lower / Math.hypot(rig.shin.tip.x - rig.shin.pivot.x, rig.shin.tip.y - rig.shin.pivot.y);
    assert.ok(Math.abs(lowerScale / upperScale - 1) < .03, 'Trouser width changes abruptly at the knee');
  }
});

test('prince standing and celebration keep separate upright legs and soles on the ground', () => {
  for (const action of ['idle', 'celebrate', 'jump', 'land'] as const) {
    const { joints, bodyY } = paintedPrincePose(action, 1000);
    assert.equal(bodyY, 0);
    for (const [side, rig] of Object.entries(anatomy.legs)) {
      assert.equal(joints[`${side}-thigh` as keyof typeof joints], rig.stance);
      assert.equal(joints[`${side}-shin` as keyof typeof joints], 0);
      assert.equal(joints[`${side}-foot` as keyof typeof joints], -rig.stance);
      assert.ok(Math.abs(rig.y + (rig.upper + rig.lower) * Math.cos(rig.stance * Math.PI / 180) + princeSole.y - PRINCE_GAIT.groundY) < 1e-8);
    }
  }
  assert.ok(anatomy.legs.back.x + anatomy.legs.back.restX - anatomy.legs.front.x - anatomy.legs.front.restX >= anatomy.boot.width);
});

test('both prince feet reach their timestamp targets and planted soles match the scenery velocity', () => {
  for (let sample = 0; sample < 480; sample++) {
    const time = sample / 480 * PRINCE_GAIT.cycleMs;
    const { joints, bodyY } = paintedPrincePose('walk', time);
    assert.ok(bodyY <= 3.4 + 1e-8 && bodyY >= 3 - 1e-8);
    for (const side of ['front', 'back'] as const) {
      const rig = anatomy.legs[side], phase = time / PRINCE_GAIT.cycleMs + (side === 'back' ? .5 : 0);
      const target = animalFoot(phase, PRINCE_GAIT), hip = (joints[`${side}-thigh`] + 90) * Math.PI / 180;
      const knee = joints[`${side}-shin`] * Math.PI / 180, pitch = (joints[`${side}-thigh`] + joints[`${side}-shin`] + joints[`${side}-foot`]) * Math.PI / 180;
      const x = rig.x + rig.upper * Math.cos(hip) + rig.lower * Math.cos(hip + knee) + princeSole.x * Math.cos(pitch) - princeSole.y * Math.sin(pitch);
      const y = bodyY + rig.y + rig.upper * Math.sin(hip) + rig.lower * Math.sin(hip + knee) + princeSole.x * Math.sin(pitch) + princeSole.y * Math.cos(pitch);
      assert.ok(Math.abs(x - (rig.x + rig.restX + target.x + princeSole.x)) < 1e-6, `Unreachable stride at ${time}`);
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
