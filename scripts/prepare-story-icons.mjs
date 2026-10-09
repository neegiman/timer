import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const directory = 'docs/ui-icons/story-v1';
const sources = `${directory}/sources`;
const output = 'public/images/story-v1';
const ids = ['handshake', 'bath', 'sleep', 'meal', 'tidy', 'outside', 'video', 'clock'];
await mkdir(sources, { recursive: true });
await mkdir(output, { recursive: true });

// Import selected ImageGen files once. Committed masters make later builds reproducible.
if (process.argv[2]) {
  const inputs = JSON.parse(await readFile(process.argv[2], 'utf8'));
  assert.deepEqual(inputs.map(({ id }) => id), ids);
  for (const { id, source } of inputs) {
    const metadata = await sharp(source).metadata();
    assert.ok(metadata.hasAlpha, `${id} must have a transparent background`);
    await sharp(source).resize(960, 960, { fit: 'inside', withoutEnlargement: true }).webp({ lossless: true }).toFile(`${sources}/${id}.webp`);
  }
  await writeFile(`${directory}/prompts.json`, `${JSON.stringify(inputs.map(({ id, prompt }) => ({ id, prompt })), null, 2)}\n`);
}

async function normalize(file, name) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = 0, bottom = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 16) {
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  assert.ok(right > left && bottom > top, `${name} is empty`);
  // Keep soft painted edges; only crop the surrounding transparent canvas.
  left = Math.max(0, left - 8); top = Math.max(0, top - 8);
  right = Math.min(info.width - 1, right + 8); bottom = Math.min(info.height - 1, bottom + 8);
  const icon = await sharp(file).extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize(280, 280, { fit: 'inside' }).png().toBuffer();
  await sharp({ create: { width: 320, height: 320, channels: 4, background: '#00000000' } })
    .composite([{ input: icon, gravity: 'center' }]).webp({ quality: 92, alphaQuality: 100 }).toFile(`${output}/${name}.webp`);
}
for (const id of ids) await normalize(`${sources}/${id}.webp`, id);
await normalize('docs/character-design/rabbit-concept.png', 'rabbit');

const handshake = await sharp(`${output}/handshake.webp`).resize(154, 154).png().toBuffer();
await sharp({ create: { width: 192, height: 192, channels: 4, background: '#fff3df' } })
  .composite([{ input: handshake, gravity: 'center' }]).png().toFile('public/images/promise-handshake-v1.png');
await sharp('public/images/promise-handshake-v1.png').resize(180, 180).png().toFile('public/images/apple-touch-handshake-v1.png');
await sharp('public/images/promise-handshake-v1.png').resize(48, 48).png().toFile('public/images/favicon-handshake-v1.png');

const tiles = await Promise.all([...ids, 'rabbit'].map(async (id, index) => {
  const art = await sharp(`${output}/${id}.webp`).resize(128, 128).png().toBuffer();
  const label = Buffer.from(`<svg width="180" height="32"><text x="90" y="23" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#6a5745">${id}</text></svg>`);
  const tile = await sharp({ create: { width: 180, height: 180, channels: 4, background: '#fffaf0' } })
    .composite([{ input: art, top: 8, left: 26 }, { input: label, top: 140, left: 0 }]).png().toBuffer();
  return { input: tile, left: (index % 3) * 180, top: Math.floor(index / 3) * 180 };
}));
await sharp({ create: { width: 540, height: 540, channels: 4, background: '#fffaf0' } })
  .composite(tiles).png().toFile(path.join(directory, 'icon-family.png'));
console.log('Prepared nine transparent story icons, handshake app icons and contact sheet.');
