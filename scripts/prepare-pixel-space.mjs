import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const output = 'public/images/space-v1';
await mkdir(output, { recursive: true });
// Normalize the generated art to a uniform pixel grid, then mirror it. Both
// joins have identical edge columns, so an indefinitely scrolling tile is safe.
const grid = await sharp('docs/background-design/pixel-space-v1/source.png')
  .resize(240, 160, { fit: 'fill', kernel: 'nearest' }).png().toBuffer();
const mirrored = await sharp(grid).flop().png().toBuffer();
const tile = await sharp({ create: { width: 480, height: 160, channels: 4, background: '#10152e' } })
  .composite([{ input: grid, left: 0, top: 0 }, { input: mirrored, left: 240, top: 0 }]).png().toBuffer();
await sharp(tile).resize(1920, 640, { kernel: 'nearest' }).webp({ lossless: true }).toFile(`${output}/nebula.webp`);

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320" shape-rendering="crispEdges">${body}</svg>\n`;
const dots = [[42, 32], [122, 164], [202, 72], [318, 228], [382, 120], [454, 278], [260, 296], [82, 258], [342, 18]];
await writeFile(`${output}/stars.svg`, svg(dots.map(([x, y], i) => `<rect x="${x}" y="${y}" width="${i % 3 ? 2 : 4}" height="${i % 3 ? 2 : 4}" fill="${i % 2 ? '#a4bbdf' : '#f3dca9'}" opacity=".65"/>`).join('')));
await writeFile(`${output}/near-stars.svg`, svg([[72, 98], [306, 268], [428, 42]].map(([x, y]) => `<path d="M${x} ${y}h3v3h3v3h-3v3h-3v-3h-3v-3h3Z" fill="#d3e5ed" opacity=".55"/>`).join('')));
console.log('Prepared pixel nebula (1920×640), seamless star layers and their shared day/night palette.');
