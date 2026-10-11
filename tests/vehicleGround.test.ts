import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import sharp from 'sharp';

test('road and railway tiles join without seams and fit a small static asset budget', async () => {
  for (const type of ['road', 'railway']) for (const theme of ['day', 'night']) {
    const file = `public/images/vehicle-ground-v1/${type}-${theme}.svg`;
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, 480, 'Same repeat length as the timestamp-driven ground');
    assert.equal(info.height, 96);
    for (let y = 0; y < info.height; y++) {
      const left: number = y * info.width * 4, right: number = (y * info.width + info.width - 1) * 4;
      assert.deepEqual(data.subarray(left, left + 4), data.subarray(right, right + 4), `${type}/${theme}: seam at row ${y}`);
    }
    assert.ok((await stat(file)).size < 15_000);
  }
});

test('both railway palettes have a continuous near-rail surface at the wheel contact height', async () => {
  for (const theme of ['day', 'night']) {
    const { data, info } = await sharp(`public/images/vehicle-ground-v1/railway-${theme}.svg`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const first = (24 * info.width) * 4;
    assert.equal(data[first + 3], 255);
    for (let x = 1; x < info.width; x++) {
      const pixel = (24 * info.width + x) * 4;
      assert.deepEqual(data.subarray(pixel, pixel + 4), data.subarray(first, first + 4), `${theme}: broken rail at ${x}`);
    }
  }
});
