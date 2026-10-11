import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const source = 'docs/background-design/vehicle-ground-v2';
const destination = 'public/images/vehicle-ground-v2';
await mkdir(destination, { recursive: true });
const manifest = {};

for (const kind of ['road', 'railway']) {
  const original = `${source}/${kind}-day.png`;
  const { data, info } = await sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Ignore isolated fine alpha wisps, keeping the entire usable painted strip.
  let top = info.height, bottom = 0;
  for (let y = 0; y < info.height; y++) {
    let pixels = 0;
    for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 32) pixels++;
    if (pixels > info.width * .08) { top = Math.min(top, y); bottom = y; }
  }
  assert.ok(bottom > top, `${kind}: empty painted strip`);
  top = Math.max(0, top - 4); bottom = Math.min(info.height - 1, bottom + 4);
  const height = bottom - top + 1;
  const width = Math.min(info.width, Math.round(height * 2.5));
  const crop = { left: Math.floor((info.width - width) / 2), top, width, height };
  // The front rail's continuous painted highlight occupies rows 61–64 after normalization.
  const entry = { width: 480, height: 96, contactY: kind === 'road' ? 18 : 62, crop };
  for (const theme of ['day', 'night']) {
    const file = `${source}/${kind}-${theme}.png`;
    const metadata = await sharp(file).metadata();
    assert.equal(metadata.width, info.width, `${kind}/${theme}: preserve edit dimensions`);
    assert.equal(metadata.height, info.height, `${kind}/${theme}: preserve edit dimensions`);
    const half = await sharp(file).extract(crop).resize(240, 96).png().toBuffer();
    const reflected = await sharp(half).flop().png().toBuffer();
    await sharp({ create: { width: 480, height: 96, channels: 4, background: '#00000000' } })
      .composite([{ input: half, left: 0, top: 0 }, { input: reflected, left: 240, top: 0 }])
      .webp({ lossless: true, effort: 6 }).toFile(`${destination}/${kind}-${theme}.webp`);
    entry[theme] = `/images/vehicle-ground-v2/${kind}-${theme}.webp`;
  }
  manifest[kind] = entry;
}
await writeFile('src/lib/paintedVehicleGround.json', JSON.stringify(manifest, null, 2) + '\n');
console.log('Prepared four painted ground tiles. Shared day/night crops preserve wheel contact; reflected edges repeat seamlessly.');
