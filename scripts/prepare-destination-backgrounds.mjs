import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import scenery from '../src/lib/paintedScenery.json' with { type: 'json' };

const source = 'docs/background-design/destination-v1';
const output = 'public/images/destination-v1';
await mkdir(output, { recursive: true });
const sign = await sharp(`${source}/wooden-arrival.png`).trim({ threshold: 8 }).png().toBuffer();
const portal = await sharp(`${source}/orbital-arrival.png`).trim({ threshold: 8 }).png().toBuffer();
const manifest = {};

// The landmark is baked into the original landscape. It is never shipped as a
// separate prop or repeated with the walking-ground strips.
for (const [season, scenes] of Object.entries(scenery)) {
  manifest[season] = {};
  for (const theme of ['day', 'night']) {
    const landscape = scenes[theme];
    const anchor = { x: Math.round(landscape.width * .65), y: landscape.height };
    let marker = sharp(sign).resize({ height: Math.round(landscape.height * .44) });
    if (theme === 'night') marker = marker.modulate({ brightness: .64, saturation: .76 });
    const buffer = await marker.png().toBuffer();
    const { width, height } = await sharp(buffer).metadata();
    const paintBounds = { x: anchor.x - Math.round(width / 2), y: anchor.y - height, width, height };
    const name = `${season}-${theme}.webp`;
    await sharp(`public${landscape.src}`).composite([{ input: buffer, left: paintBounds.x, top: paintBounds.y }])
      .webp({ lossless: true, effort: 6 }).toFile(`${output}/${name}`);
    manifest[season][theme] = { src: `/images/destination-v1/${name}`, width: landscape.width, height: landscape.height, anchor, paintBounds, kind: 'nature' };
  }
}

const nebula = 'public/images/space-v1/nebula.webp';
const space = await sharp(nebula).metadata();
const beacon = await sharp(portal).resize({ height: 300 }).png().toBuffer();
const beaconSize = await sharp(beacon).metadata();
const anchor = { x: Math.round(space.width * .65), y: Math.round(space.height * .7) };
const paintBounds = { x: anchor.x - Math.round(beaconSize.width / 2), y: anchor.y - Math.round(beaconSize.height * .48), width: beaconSize.width, height: beaconSize.height };
await sharp(nebula).composite([{ input: beacon, left: paintBounds.x, top: paintBounds.y }])
  .webp({ lossless: true, effort: 6 }).toFile(`${output}/space.webp`);
manifest.space = { src: '/images/destination-v1/space.webp', width: space.width, height: space.height, anchor, paintBounds, kind: 'space' };
await writeFile('src/lib/destinationScenery.json', JSON.stringify(manifest, null, 2) + '\n');
console.log('Prepared 8 seasonal backgrounds and one space background with their arrival landmark painted into each bitmap.');
