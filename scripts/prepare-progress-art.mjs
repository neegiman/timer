import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const input = 'docs/ui-icons/progress-v1/trail-source.png';
const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let left = info.width, top = info.height, right = 0, bottom = 0;
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  if (data[(y * info.width + x) * 4 + 3] > 16) {
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
}
assert.ok(right > left && bottom > top, 'The painted trail is empty');
left = Math.max(0, left - 4); top = Math.max(0, top - 4);
right = Math.min(info.width - 1, right + 4); bottom = Math.min(info.height - 1, bottom + 4);
await mkdir('public/images/progress-v1', { recursive: true });
await sharp(input).extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
  .resize(1024, 64, { fit: 'fill' }).webp({ quality: 92, alphaQuality: 100 })
  .toFile('public/images/progress-v1/trail.webp');
console.log('Prepared transparent painted trail, 1024×64. Home/flag icons: npm run icons.');
