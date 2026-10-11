import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import sharp from 'sharp';
import groundArt from '../src/lib/paintedVehicleGround.json';

test('painted road and railway tiles join without seams and fit a small static asset budget', async () => {
  for (const type of ['road', 'railway']) for (const theme of ['day', 'night']) {
    const file = `public/images/vehicle-ground-v2/${type}-${theme}.webp`;
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, 480, 'Same repeat length as the timestamp-driven ground');
    assert.equal(info.height, 96);
    for (let y = 0; y < info.height; y++) {
      const left: number = y * info.width * 4, right: number = (y * info.width + info.width - 1) * 4;
      assert.equal(data[left + 3], data[right + 3], `${type}/${theme}: alpha seam at row ${y}`);
      if (data[left + 3] > 0) assert.deepEqual(data.subarray(left, left + 3), data.subarray(right, right + 3), `${type}/${theme}: paint seam at row ${y}`);
    }
    assert.ok((await stat(file)).size < 150_000);
  }
});

test('both painted railway palettes retain an opaque continuous near rail at the measured wheel contact', async () => {
  for (const theme of ['day', 'night']) {
    const { data, info } = await sharp(`public/images/vehicle-ground-v2/railway-${theme}.webp`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let x = 0; x < info.width; x++) {
      const pixel = (groundArt.railway.contactY * info.width + x) * 4;
      assert.ok(data[pixel + 3] > 230, `${theme}: broken rail at ${x}`);
    }
    const brightness = (y: number) => {
      let total = 0;
      for (let x = 0; x < info.width; x++) {
        const pixel = (y * info.width + x) * 4;
        total += (data[pixel] + data[pixel + 1] + data[pixel + 2]) / 3;
      }
      return total / info.width;
    };
    const rail = brightness(groundArt.railway.contactY);
    assert.ok(rail > brightness(groundArt.railway.contactY - 6) + 40, 'Wheels must meet the silver rail, not the gravel above it');
    assert.ok(rail > brightness(groundArt.railway.contactY + 5) + 40, 'Rail highlight must remain distinct from its lower edge');
  }
});
