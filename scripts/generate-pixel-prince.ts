import { mkdir, writeFile } from 'node:fs/promises';
import { buildPrinceFrame, princePalette } from './princeArt';
import { PRINCE_SHEET } from '../src/lib/princeMotion';

const { columns, rows, frameWidth, frameHeight, frames } = PRINCE_SHEET;
const art = Array.from({ length: frames }, (_, frame) => {
  const { paths } = buildPrinceFrame(frame);
  const groups = Object.entries(paths).map(([color, d]) => `<path fill="${princePalette[color as keyof typeof princePalette]}" d="${d}"/>`).join('');
  return `<g transform="translate(${frame % columns * frameWidth + 16} ${Math.floor(frame / columns) * frameHeight + 13}) scale(4)">${groups}</g>`;
}).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${columns * frameWidth}" height="${rows * frameHeight}" viewBox="0 0 ${columns * frameWidth} ${rows * frameHeight}" shape-rendering="crispEdges"><title>왕자 — 오리지널 8비트 픽셀 캐릭터</title>${art}</svg>\n`;
async function main() {
  await mkdir('public/characters/pixel-v1', { recursive: true });
  await writeFile('public/characters/pixel-v1/prince.svg', svg);
  console.log(`Prince: ${frames} whole-body pixel frames, 16 colors, /timer/characters/pixel-v1/prince.svg`);
}
void main();
