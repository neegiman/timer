import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildPrinceFrame, princePalette } from '../scripts/princeArt';
import { PRINCE_ASSET, PRINCE_GAIT, PRINCE_SHEET, princeFrame, princeViewBox } from '../src/lib/princeMotion';
import { characters, getCharacter } from '../src/lib/characters';
import { motionProfile } from '../src/lib/motionProfiles';

test('legacy pixel prince authoring source remains reproducible with the shared gait clock', async () => {
  assert.equal(characters.filter(({ id }) => id === 'prince').length, 1);
  assert.equal(getCharacter('prince').name, '왕자');
  assert.equal(motionProfile('prince').cycleMs, PRINCE_GAIT.cycleMs);
  const source = await readFile(`public${PRINCE_ASSET}`, 'utf8');
  assert.ok(source.includes('shape-rendering="crispEdges"'));
  assert.ok(!/(?:https?:|filter|gradient|script|foreignObject)/i.test(source.replace('http://www.w3.org/2000/svg', '')));
});

test('pixel frames loop on elapsed time and expose separate finish actions', () => {
  const frames = Array.from({ length: 12 }, (_, i) => princeFrame('walk', i * 100));
  assert.equal(new Set(frames).size, 12);
  for (let t = 0; t < 1200; t += 25) assert.equal(princeFrame('walk', t), princeFrame('walk', t + 1200));
  assert.equal(princeFrame('idle', 500), 0);
  assert.equal(princeFrame('jump', 500), 13);
  assert.equal(princeFrame('land', 500), 14);
  assert.deepEqual([0, 300, 600].map((t) => princeFrame('celebrate', t)), [15, 16, 17]);
  for (const action of ['walk', 'jump', 'land', 'celebrate'] as const) assert.equal(princeFrame(action, 400, true), 0);
  assert.equal(princeViewBox(17), '800 420 160 210');
});

test('every pixel frame has one connected silhouette, without detached hands, boots or crown', () => {
  assert.equal(Object.keys(princePalette).length, 16);
  for (let frame = 0; frame < PRINCE_SHEET.frames; frame++) {
    const { pixels } = buildPrinceFrame(frame), filled = new Set<number>();
    pixels.forEach((row, y) => row.forEach((color, x) => { if (color) filled.add(y * 32 + x); }));
    assert.ok(filled.size > 400, `Frame ${frame} is missing the character`);
    const queue = [filled.values().next().value!], visited = new Set(queue);
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i], x = p % 32, y = Math.floor(p / 32);
      for (const next of [x > 0 ? p - 1 : -1, x < 31 ? p + 1 : -1, y > 0 ? p - 32 : -1, y < 47 ? p + 32 : -1]) {
        if (filled.has(next) && !visited.has(next)) { visited.add(next); queue.push(next); }
      }
    }
    assert.equal(visited.size, filled.size, `Frame ${frame} has a detached body part`);
  }
});

test('jump and all three celebration frames paint both hands outside the face', () => {
  for (const frame of [13, 15, 16, 17]) {
    const { pixels } = buildPrinceFrame(frame);
    let nearHand = 0, farHand = 0;
    pixels.forEach((row, y) => row.forEach((color, x) => {
      if (y > 21) return;
      if (x < 9 && color === 'S') nearHand++;
      if (x >= 27 && color === 's') farHand++;
    }));
    assert.ok(nearHand >= 4, `Frame ${frame}: near hand is hidden by the face`);
    assert.ok(farHand >= 4, `Frame ${frame}: far hand is hidden by the face or tunic`);
  }
});

test('standing and raised-arm poses have two straight legs and separate grounded boots', () => {
  for (const frame of [0, 13, 14, 15, 16, 17]) {
    const { pixels, feet } = buildPrinceFrame(frame);
    for (let y = 37; y <= 42; y++) {
      assert.ok(pixels[y][13] && pixels[y][20], `Frame ${frame}: a leg bends away from its hip`);
      assert.equal(pixels[y][16], null, `Frame ${frame}: knees collapse into the middle`);
      assert.equal(pixels[y][17], null, `Frame ${frame}: legs are fused`);
    }
    for (let y = 43; y <= 47; y++) assert.equal(pixels[y][17], null, `Frame ${frame}: boots overlap`);
    assert.equal(feet.length, 2);
    for (const foot of feet) assert.equal(foot.sole * 4 + 13, PRINCE_GAIT.groundY);
  }
});

test('pixel boots stay grounded and match scenery travel within one native pixel', () => {
  const samples = Array.from({ length: 12 }, (_, i) => buildPrinceFrame(i + 1));
  for (const frame of samples) {
    assert.ok(frame.feet.some(({ planted }) => planted));
    for (const foot of frame.feet) {
      if (foot.planted) assert.equal(foot.sole * 4 + 13, PRINCE_GAIT.groundY);
      assert.ok(frame.pixels[foot.sole - 1].some(Boolean), 'Boot sole is not painted');
    }
  }
  for (let i = 0; i < samples.length - 1; i++) for (let foot = 0; foot < 2; foot++) {
    const a = samples[i].feet[foot], b = samples[i + 1].feet[foot];
    if (a.planted && b.planted) assert.ok(Math.abs((b.x - a.x) * 4 + PRINCE_GAIT.travel / 12) <= 4, 'Planted boot slides beyond pixel quantization');
  }
  const head = (frame: number) => buildPrinceFrame(frame).pixels.slice(0, 21);
  for (let frame = 2; frame <= 12; frame++) assert.deepEqual(head(frame), head(1), 'Walking shifts the entire body');
});
