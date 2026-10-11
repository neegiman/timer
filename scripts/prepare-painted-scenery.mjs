import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const source = path.resolve('docs/background-design/painted-v1');
const output = path.resolve('public/images/scenery-v1');
await mkdir(output, { recursive: true });
const road = { spring: .748, summer: .783, autumn: .755, winter: .755 };
const manifest = {};

// Reflection makes BOTH repeat joins identical, including transparent leaf edges.
async function tile(buffer, name) {
  const { width, height } = await sharp(buffer).metadata();
  const reflected = await sharp(buffer).flop().toBuffer();
  await sharp({ create: { width: width * 2, height, channels: 4, background: '#00000000' } })
    .composite([{ input: buffer, left: 0, top: 0 }, { input: reflected, left: width, top: 0 }])
    .webp({ lossless: true, effort: 6 }).toFile(path.join(output, name));
  return { src: `/images/scenery-v1/${name}`, width: width * 2, height };
}

for (const season of Object.keys(road)) {
  const entry = {};
  for (const theme of ['day', 'night']) {
    const file = path.join(source, `${season}-${theme}.png`);
    const { width, height } = await sharp(file).metadata();
    const baseline = Math.round(height * road[season]);
    const landscape = await sharp(file).extract({ left: 0, top: 0, width, height: baseline }).resize({ width: 1024 }).png().toBuffer();
    entry[theme] = await tile(landscape, `${season}-${theme}-landscape.webp`);
    // Level contact at 78% of the scene, independent of each painting's framing.
    const top = baseline + 8;
    const cropHeight = height - top;
    const cropWidth = Math.min(width, cropHeight * 3);
    const ground = await sharp(file).extract({ left: Math.floor((width - cropWidth) / 2), top, width: cropWidth, height: cropHeight })
      .resize(240, 80).png().toBuffer();
    entry[`${theme}Ground`] = await tile(ground, `${season}-${theme}-ground.webp`);
  }
  const treeFile = path.join(source, `${season}-trees.png`);
  const { data, info } = await sharp(treeFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let top = info.height, bottom = 0;
  for (let y = 0; y < info.height; y++) {
    let painted = 0;
    for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 32) painted++;
    if (painted > info.width * .01) { top = Math.min(top, y); bottom = y; }
  }
  const trees = await sharp(treeFile).extract({ left: 0, top, width: info.width, height: bottom - top + 1 })
    .resize({ width: 960 }).png().toBuffer();
  entry.trees = await tile(trees, `${season}-trees.webp`);
  manifest[season] = entry;
}
await writeFile('src/lib/paintedScenery.json', JSON.stringify(manifest, null, 2) + '\n');
console.log('Prepared 20 painted scenery assets with matching repeat edges.');
