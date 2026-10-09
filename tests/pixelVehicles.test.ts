import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { buildVehicleFrame, vehiclePalette } from '../scripts/vehicleArt';
import { PIXEL_VEHICLES, VEHICLE_SHEET, vehicleFrame, vehicleMotion, vehicleAsset, isPixelVehicle } from '../src/lib/pixelVehicles';
import { groundDistance } from '../src/lib/journey';
import { motionProfile } from '../src/lib/motionProfiles';

test('existing vehicle IDs keep their timing, baseline and local static pixel assets', async () => {
  for (const id of PIXEL_VEHICLES) {
    assert.ok(isPixelVehicle(id));
    assert.equal(motionProfile(id).cycleMs, vehicleMotion[id].cycleMs);
    assert.equal(motionProfile(id).groundY, vehicleMotion[id].groundY);
    const svg = await readFile(`public${vehicleAsset(id)}`, 'utf8');
    assert.ok(svg.includes('shape-rendering="crispEdges"'));
    assert.ok(!/(?:https?:|filter|gradient|script|foreignObject)/i.test(svg.replace('http://www.w3.org/2000/svg', '')));
  }
  assert.equal(isPixelVehicle('rabbit'), false);
});

test('wheel rotation follows travelled ground distance and exhaust follows its timestamp clock', () => {
  for (const id of ['car', 'train'] as const) {
    const revolutionMs = 2 * Math.PI * 16 / groundDistance(1, vehicleMotion[id].cycleMs);
    for (let step = 0; step < 8; step++) {
      const time = revolutionMs * (step + .5) / 8;
      assert.equal(vehicleFrame(id, 'walk', time), step + 1);
      assert.equal(vehicleFrame(id, 'walk', time + revolutionMs), step + 1);
    }
  }
  for (let step = 0; step < 8; step++) assert.equal(vehicleFrame('rocket', 'walk', (step + .5) * 150), step + 1);
  for (const id of PIXEL_VEHICLES) {
    assert.equal(vehicleFrame(id, 'idle', 1000), 0);
    assert.equal(vehicleFrame(id, 'jump', 100), 9); assert.equal(vehicleFrame(id, 'land', 100), 10);
    assert.deepEqual([0, 300, 600].map((time) => vehicleFrame(id, 'celebrate', time)), [11, 12, 13]);
    assert.equal(vehicleFrame(id, 'walk', 1000, true), 0); assert.equal(vehicleFrame(id, 'celebrate', 1000, true), 0);
  }
});

test('all 42 exported frames preserve their exact integer grid and wheel contact height', async () => {
  assert.equal(Object.keys(vehiclePalette).length, 16);
  for (const id of PIXEL_VEHICLES) {
    const { data, info } = await sharp(`public${vehicleAsset(id)}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, 1120); assert.equal(info.height, 420);
    for (let frame = 0; frame < VEHICLE_SHEET.frames; frame++) {
      const { pixels } = buildVehicleFrame(id, frame);
      let area = 0, bottom = -1;
      for (let y = 0; y < 48; y++) for (let x = 0; x < 40; x++) {
        const color = pixels[y][x], left = frame % 7 * 160 + x * 4, top = Math.floor(frame / 7) * 210 + 5 + y * 4;
        for (let py = 0; py < 4; py++) for (let px = 0; px < 4; px++) {
          const offset: number = ((top + py) * info.width + left + px) * 4;
          assert.equal(data[offset + 3], color ? 255 : 0, `${id} frame ${frame} spills off its pixel grid`);
        }
        if (color) { area++; bottom = y; }
      }
      assert.ok(area > 270, `${id} frame ${frame} is empty`);
      if (id !== 'rocket') {
        assert.equal(5 + (bottom + 1) * 4, 197);
        for (const x of id === 'car' ? [10, 30] : [9, 20, 31]) assert.ok(pixels[47][x], `${id} wheel misses ground`);
      }
    }
  }
});

test('driving frames change wheels/exhaust without shifting the body, and stopped rocket has no exhaust', () => {
  for (const id of PIXEL_VEHICLES) {
    const samples = Array.from({ length: 8 }, (_, i) => buildVehicleFrame(id, i + 1).pixels);
    assert.ok(new Set(samples.map((pixels) => JSON.stringify(pixels))).size >= 3, `${id} has no visible movement`);
    const body = (pixels: typeof samples[0]) => pixels.slice(id === 'train' ? 20 : 4, id === 'rocket' ? 29 : 40);
    if (id !== 'rocket') for (const frame of samples) assert.deepEqual(body(frame), body(samples[0]));
  }
  for (const frame of [0, 9, 10, 11, 12, 13]) assert.ok(!buildVehicleFrame('rocket', frame).pixels.flat().includes('F'));
});

test('rocket points right on a horizontal axis with its exhaust behind it in every frame', () => {
  for (let frame = 0; frame < VEHICLE_SHEET.frames; frame++) {
    const { pixels } = buildVehicleFrame('rocket', frame);
    for (let x = 0; x < 40; x++) {
      const column = pixels.map((row) => row[x]);
      const occupied = column.flatMap((color, y) => color ? [y] : []);
      if (occupied.length) assert.equal(occupied[0] + occupied.at(-1)!, 59, `Frame ${frame} column ${x} tilts off the horizontal axis`);
      for (let y = 12; y < 30; y++) assert.equal(Boolean(column[y]), Boolean(column[59 - y]), `Frame ${frame} column ${x} has an uneven outline`);
    }
    assert.equal(pixels[29][38], 'O', 'Nose must face the destination on the right');
    assert.equal(pixels[30][38], 'O');
    for (const row of pixels) for (const [x, color] of row.entries()) if (color === 'F' || color === 'f') assert.ok(x < 9, 'Exhaust must trail behind the nozzle on the left');
  }
});
