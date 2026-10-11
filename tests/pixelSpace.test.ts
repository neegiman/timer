import assert from 'node:assert/strict';
import test from 'node:test';
import { stat } from 'node:fs/promises';
import sharp from 'sharp';

test('pixel space repeats without a visible edge and stays compact for mobile', async () => {
  const file = 'public/images/space-v1/nebula.webp';
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 1920); assert.equal(info.height, 640);
  for (let y = 0; y < info.height; y++) {
    const offset: number = y * info.width * info.channels;
    assert.deepEqual(data.subarray(offset, offset + 3), data.subarray(offset + (info.width - 1) * 3, offset + info.width * 3), `Loop seam at row ${y}`);
    assert.deepEqual(data.subarray(offset + 959 * 3, offset + 960 * 3), data.subarray(offset + 960 * 3, offset + 961 * 3), `Mirror seam at row ${y}`);
  }
  assert.ok((await stat(file)).size < 250_000);
});

test('custom promise icon preserves transparency and matches story icon dimensions', async () => {
  const { data, info } = await sharp('public/images/story-v1/custom.webp').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 320); assert.equal(info.height, 320);
  assert.equal(data[3], 0); assert.equal(data[data.length - 1], 0);
  assert.ok(data.some((value, index) => index % 4 === 3 && value > 200));
});
