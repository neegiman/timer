import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import atlas from '../src/lib/princessAtlas.json';
import { princessAnatomy as anatomy, princessPose, princessSole, PRINCESS_GAIT, settlePrincessPose } from '../src/lib/princessMotion';
import { animalFoot } from '../src/lib/animalMotion';
import { characters, getCharacter } from '../src/lib/characters';
import { princessPart } from '../src/lib/princessArtwork';
import revised from '../src/lib/princessUpperAtlas.json';

test('princess source survives lossless conversion and its joints sit inside painted limbs', async () => {
  const options = { resolveWithObject: true } as const;
  const decoded = new Map<string, Buffer>();
  for (const [source, file, manifest] of [
    ['docs/character-design/princess-v1/princess-atlas.png', '/characters/raster-v1/princess.webp', atlas],
    ['docs/character-design/princess-v2/princess-upper-atlas.png', '/characters/raster-v1/princess-upper-v2.webp', revised],
  ] as const) {
    const original = await sharp(source).ensureAlpha().raw().toBuffer(options);
    const runtime = await sharp(`public${file}`).ensureAlpha().raw().toBuffer(options);
    decoded.set(file, runtime.data);
    assert.equal(runtime.info.width, manifest.width); assert.equal(runtime.info.height, manifest.height);
    // Lossless WebP may normalize RGB under completely transparent pixels; visible paint must match.
    for (let pixel = 0; pixel < runtime.info.width * runtime.info.height; pixel++) {
      const offset = pixel * 4;
      assert.equal(runtime.data[offset + 3], original.data[offset + 3]);
      if (original.data[offset + 3]) for (let channel = 0; channel < 3; channel++) assert.equal(runtime.data[offset + channel], original.data[offset + channel]);
    }
  }
  for (const [part, landmarks] of [
    ['thigh', anatomy.thigh], ['shin', anatomy.shin],
    [anatomy.arms.front.upperPart, anatomy.arms.front.upperArt], [anatomy.arms.front.lowerPart, anatomy.arms.front.lowerArt],
    [anatomy.arms.back.upperPart, anatomy.arms.back.upperArt], [anatomy.arms.back.lowerPart, anatomy.arms.back.lowerArt],
    ['shoe', { pivot: anatomy.shoe.pivot, tip: anatomy.shoe.sole }],
  ] as const) {
    const sheet = princessPart(part), [left, top] = sheet.region;
    for (const point of [landmarks.pivot, landmarks.tip]) {
      const alpha = decoded.get(sheet.source)![((top + point.y) * sheet.width + left + point.x) * 4 + 3];
      assert.ok(alpha >= 160, `${part} joint is outside the painting`);
    }
  }
  for (const part of ['head', 'hair', 'bodice', 'skirt'] as const) {
    const { region } = princessPart(part);
    assert.ok(Math.abs(anatomy[part].width / anatomy[part].height - region[2] / region[3]) < 1e-8);
  }
  assert.ok(anatomy.hair.y + anatomy.hair.height > anatomy.skirtPivot.y, 'Long hair must reach the waist');
  const paintedAt = (part: 'head' | 'hair' | 'bodice' | 'skirt', point: { x: number; y: number }) => {
    const sheet = princessPart(part), [left, top, width, height] = sheet.region, placement = anatomy[part];
    const x = left + Math.floor((point.x - placement.x) / placement.width * width);
    const y = top + Math.floor((point.y - placement.y) / placement.height * height);
    return decoded.get(sheet.source)![(y * sheet.width + x) * 4 + 3];
  };
  for (const rig of Object.values(anatomy.arms)) assert.ok(paintedAt('bodice', rig) >= 160, 'Shoulder is outside the painted torso');
  for (const rig of Object.values(anatomy.legs)) assert.ok(paintedAt('skirt', rig) >= 160, 'Hip is not covered by the dress');
  assert.ok(paintedAt('head', anatomy.headPivot) >= 160, 'Head rotates around transparent padding');
  assert.ok(paintedAt('hair', anatomy.hairPivot) >= 160 && paintedAt('head', anatomy.hairPivot) >= 160, 'Long hair floats away from the head');
});

test('near and far limbs attach to matching torso sides and hips sit at the pelvis, not the hem', () => {
  const middle = anatomy.pelvis.x, hem = anatomy.skirt.y + anatomy.skirt.height;
  for (const side of ['front', 'back'] as const) {
    const arm = anatomy.arms[side], leg = anatomy.legs[side];
    const direction = side === 'front' ? -1 : 1;
    assert.ok((arm.x - middle) * direction > 0, 'Shoulder is on the wrong side of the torso');
    assert.ok((leg.x - middle) * direction > 0, 'Hip and shoulder sides are reversed');
    assert.ok(leg.y >= anatomy.skirt.y && leg.y < anatomy.skirt.y + anatomy.skirt.height / 3, 'Leg starts at the hem instead of inside the pelvis');
    assert.ok(Math.abs(leg.y - anatomy.pelvis.y) < 1, 'Hip root detached from pelvis');
    for (let sample = 0; sample < 400; sample++) {
      const pose = princessPose('walk', sample / 400 * PRINCESS_GAIT.cycleMs);
      const angle = (pose[`${side}-thigh`] + 90) * Math.PI / 180;
      const knee = { x: leg.x + leg.upper * Math.cos(angle), y: leg.y + leg.upper * Math.sin(angle) };
      assert.ok(knee.y < hem, 'False knee appears below the dress because thigh starts too low');
    }
  }
  const wave = princessPose('celebrate', 1000), arm = anatomy.arms.front;
  const shoulder = wave['front-arm'] * Math.PI / 180, elbow = wave['front-elbow'] * Math.PI / 180;
  const elbowX = arm.x - arm.upper * Math.sin(shoulder);
  const wristX = elbowX - arm.lower * Math.sin(shoulder + elbow);
  assert.ok(elbowX < anatomy.head.x && wristX < anatomy.head.x, 'Celebrating arm disappears behind the head');
});

test('painted elbow, knee and ankle seams have matching widths and centered rotation axes', async () => {
  const assets = new Map<string, { data: Buffer; width: number }>();
  for (const file of ['princess', 'princess-upper-v2']) {
    const { data, info } = await sharp(`public/characters/raster-v1/${file}.webp`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assets.set(`/characters/raster-v1/${file}.webp`, { data, width: info.width });
  }
  const section = (part: Parameters<typeof princessPart>[0], landmarks: { pivot: { x: number; y: number }; tip: { x: number; y: number } },
    length: number, end: boolean, crossScale = 1) => {
    const sheet = princessPart(part), { data, width } = assets.get(sheet.source)!;
    const { pivot, tip } = landmarks, dx = tip.x - pivot.x, dy = tip.y - pivot.y, distance = Math.hypot(dx, dy);
    const point = end ? tip : pivot, nx = dy / distance, ny = -dx / distance;
    const opaque = (offset: number) => {
      const x = sheet.region[0] + Math.round(point.x + nx * offset), y = sheet.region[1] + Math.round(point.y + ny * offset);
      return data[(y * width + x) * 4 + 3] >= 160;
    };
    let left = 0, right = 0;
    while (left > -200 && opaque(left - 1)) left--;
    while (right < 200 && opaque(right + 1)) right++;
    const scale = length / distance * crossScale;
    return { width: (right - left) * scale, offset: (left + right) / 2 * scale };
  };
  const match = (name: string, a: { width: number; offset: number }, b: { width: number; offset: number }) => {
    assert.ok(Math.abs(a.width - b.width) / Math.max(a.width, b.width) < .06, `${name}: painted thickness steps at the seam`);
    assert.ok(Math.abs(a.offset) < .2 && Math.abs(b.offset) < .2, `${name}: joint axis is off the painted centerline`);
  };
  for (const side of ['front', 'back'] as const) {
    const rig = anatomy.arms[side];
    match(`${side} elbow`, section(rig.upperPart, rig.upperArt, rig.upper, true), section(rig.lowerPart, rig.lowerArt, rig.lower, false, rig.forearmCrossScale));
  }
  const knee = section('thigh', anatomy.thigh, anatomy.legs.front.upper, true);
  const calf = section('shin', anatomy.shin, anatomy.legs.front.lower, false, anatomy.shinCrossScale);
  const ankle = section('shin', anatomy.shin, anatomy.legs.front.lower, true, anatomy.shinCrossScale);
  const shoe = section('shoe', { pivot: anatomy.shoe.pivot, tip: { x: anatomy.shoe.pivot.x, y: anatomy.shoe.pivot.y + 100 } }, 100 * anatomy.shoe.width / atlas.parts.shoe[2], false);
  match('knee', knee, calf); match('ankle', ankle, shoe);
  for (let i = 0; i < 400; i++) assert.equal(princessPose('walk', i / 400 * PRINCESS_GAIT.cycleMs).skirt, 0, 'Waistband moves away from the torso');
});

test('two alternating princess feet stay planted and travel at exactly the scenery speed', () => {
  const radians = Math.PI / 180;
  for (let sample = 0; sample < 400; sample++) {
    const cycle = sample / 400, pose = princessPose('walk', cycle * PRINCESS_GAIT.cycleMs);
    for (const side of ['front', 'back'] as const) {
      const rig = anatomy.legs[side], foot = animalFoot(cycle + (side === 'back' ? .5 : 0), PRINCESS_GAIT);
      const hip = (pose[`${side}-thigh`] + 90) * radians, knee = pose[`${side}-shin`] * radians;
      const pitch = (pose[`${side}-thigh`] + pose[`${side}-shin`] + pose[`${side}-foot`]) * radians;
      const x = rig.x + rig.upper * Math.cos(hip) + rig.lower * Math.cos(hip + knee) + princessSole.x * Math.cos(pitch) - princessSole.y * Math.sin(pitch);
      const y = rig.y + rig.upper * Math.sin(hip) + rig.lower * Math.sin(hip + knee) + princessSole.x * Math.sin(pitch) + princessSole.y * Math.cos(pitch);
      assert.ok(Math.abs(x - (rig.x + foot.x + princessSole.x)) < 1e-6, 'Leg cannot reach its horizontal target');
      assert.ok(Math.abs(y - (PRINCESS_GAIT.groundY - foot.lift)) < 1e-6, 'Painted sole leaves the ground during support');
      assert.ok(pose[`${side}-shin`] > 0, 'Knee flipped its bend direction');
      assert.ok((pose[`${side}-arm`] - 4) * foot.x >= 0, 'Arm must swing backward when its own leg leads');
      assert.ok(pose[`${side}-elbow`] >= -22 && pose[`${side}-elbow`] <= -14, 'Elbow folds backward unnaturally');
    }
  }
  const a = animalFoot(.1, PRINCESS_GAIT), b = animalFoot(.2, PRINCESS_GAIT);
  assert.ok(a.planted && b.planted);
  assert.ok(Math.abs(b.x - a.x + PRINCESS_GAIT.travel * .1) < 1e-8);
});

test('shoulder sleeves move as one arm and celebration eases into an elbow wave', () => {
  for (const side of ['front', 'back'] as const) {
    assert.ok(anatomy.arms[side].y < 90, 'Shoulder pivot must be at the shoulder, not under its cuff');
    assert.ok(anatomy.arms[side].upper > anatomy.arms[side].lower, 'Upper arm was compressed into a short stub');
  }
  const a = princessPose('walk', 0), b = princessPose('walk', PRINCESS_GAIT.cycleMs / 2);
  assert.notEqual(a['front-elbow'], b['front-elbow']);
  const start = princessPose('celebrate', 0), idle = princessPose('idle', 0);
  for (const joint of Object.keys(idle) as (keyof typeof idle)[]) assert.ok(Math.abs(start[joint] - idle[joint]) < 1e-8, 'Celebration starts with a snapped joint');
  const waveA = princessPose('celebrate', 1000), waveB = princessPose('celebrate', 1250);
  assert.ok(Math.abs(waveA['front-arm'] - waveB['front-arm']) < 4, 'Whole shoulder should not flap during waving');
  assert.ok(Math.abs(waveA['front-elbow'] - waveB['front-elbow']) > 3, 'Forearm should lead the happy wave');
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
