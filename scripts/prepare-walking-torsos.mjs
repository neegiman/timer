import fs from 'node:fs/promises';
import sharp from 'sharp';

// Asset preparation only. ImageGen paints the contour; no procedural retouching.
const manifest = {};
for (const id of ['dog', 'cat']) {
  const source = `docs/character-design/walkers-v7/${id}-torso.png`;
  const src = `/characters/raster-v1/${id}-torso-v7.webp`;
  const pipeline = sharp(source).resize({ width: 640, withoutEnlargement: true });
  const { data, info } = await pipeline.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] < 24) continue;
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  if (right < left) throw new Error(`Empty ${id} torso`);
  left = Math.max(0, left - 2); top = Math.max(0, top - 2);
  right = Math.min(info.width - 1, right + 2); bottom = Math.min(info.height - 1, bottom + 2);
  await pipeline.webp({ lossless: true, effort: 6 }).toFile(`public${src}`);
  manifest[id] = { src, width: info.width, height: info.height, viewBox: [left, top, right - left + 1, bottom - top + 1] };
  console.log(`${id}: ${info.width}×${info.height}, ${(await fs.stat(`public${src}`)).size} bytes`);
}
await fs.writeFile('src/lib/walkingTorsoArt.json', JSON.stringify(manifest, null, 2) + '\n');
