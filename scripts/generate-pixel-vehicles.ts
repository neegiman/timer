import { mkdir, writeFile } from 'node:fs/promises';
import { buildVehicleFrame, vehiclePalette } from './vehicleArt';
import { PIXEL_VEHICLES, VEHICLE_SHEET, vehicleMotion } from '../src/lib/pixelVehicles';

async function main() {
  const { columns, rows, frameWidth, frameHeight, frames } = VEHICLE_SHEET;
  await mkdir('public/characters/pixel-v1', { recursive: true });
  for (const id of PIXEL_VEHICLES) {
    const art = Array.from({ length: frames }, (_, frame) => {
      const { paths } = buildVehicleFrame(id, frame);
      const paint = Object.entries(paths).map(([color, d]) => `<path fill="${vehiclePalette[color as keyof typeof vehiclePalette]}" d="${d}"/>`).join('');
      return `<g transform="translate(${frame % columns * frameWidth} ${Math.floor(frame / columns) * frameHeight + 5}) scale(4)">${paint}</g>`;
    }).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${columns * frameWidth}" height="${rows * frameHeight}" viewBox="0 0 ${columns * frameWidth} ${rows * frameHeight}" shape-rendering="crispEdges"><title>${vehicleMotion[id].name} — 오리지널 8비트 픽셀 캐릭터</title>${art}</svg>\n`;
    await writeFile(`public/characters/pixel-v1/${id}.svg`, svg);
    console.log(`${id}: ${frames} complete pixel frames, /timer/characters/pixel-v1/${id}.svg`);
  }
}
void main();
