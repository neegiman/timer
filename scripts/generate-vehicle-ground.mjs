import { mkdir, writeFile } from 'node:fs/promises';

const destination = 'public/images/vehicle-ground-v1';
await mkdir(destination, { recursive: true });
const palettes = {
  day: { asphalt: '#7c8887', asphaltLow: '#697877', edge: '#e7dfc6', lane: '#f4df9b', speck: '#b0bab1', ballast: '#c8bea6', stone: '#a79d87', wood: '#9b7656', woodLight: '#c09b72', steel: '#697d83', shine: '#dce3da' },
  night: { asphalt: '#405466', asphaltLow: '#334658', edge: '#9ba99f', lane: '#d4c994', speck: '#788d9b', ballast: '#65737d', stone: '#4d606d', wood: '#665a50', woodLight: '#968574', steel: '#81929d', shine: '#c4d2d6' },
};
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="96" viewBox="0 0 480 96">${body}</svg>\n`;

for (const [theme, p] of Object.entries(palettes)) {
  const flecks = Array.from({ length: 24 }, (_, i) => {
    const x = 14 + (i % 12) * 40, y = i < 12 ? 28 + (i % 3) * 5 : 70 + (i % 3) * 5;
    return `<path d="M${x} ${y}h${2 + i % 3}" stroke="${p.speck}" stroke-opacity=".28" stroke-linecap="round"/>`;
  }).join('');
  const lanes = Array.from({ length: 4 }, (_, i) => `<rect x="${28 + i * 120}" y="51" width="56" height="4" rx="2" fill="${p.lane}"/>`).join('');
  await writeFile(`${destination}/road-${theme}.svg`, svg(`
    <defs><linearGradient id="asphalt" x2="0" y2="1"><stop stop-color="${p.asphalt}"/><stop offset="1" stop-color="${p.asphaltLow}"/></linearGradient></defs>
    <path d="M0 3H480V93H0Z" fill="url(#asphalt)"/>
    <path d="M0 5H480M0 90H480" stroke="${p.edge}" stroke-width="3"/>
    <path d="M0 10H480M0 86H480" stroke="${p.shine}" stroke-opacity=".2"/>
    ${lanes}${flecks}`));

  const stones = Array.from({ length: 48 }, (_, i) => {
    const x = 10 + (i % 16) * 30, y = 42 + Math.floor(i / 16) * 19 + (i % 3) * 2;
    return `<ellipse cx="${x}" cy="${y}" rx="${3 + i % 3}" ry="${1.5 + i % 2}" fill="${p.stone}" opacity=".42"/>`;
  }).join('');
  const sleepers = Array.from({ length: 8 }, (_, i) => {
    const x = 20 + i * 60;
    return `<path d="M${x + 4} 7h12l-8 31h-13Z" fill="${p.wood}"/><path d="M${x + 5} 9h8l-7 27h-8Z" fill="${p.woodLight}"/><path d="M${x + 6} 16h5m-8 13h5" stroke="${p.wood}" stroke-width="1.5"/>`;
  }).join('');
  await writeFile(`${destination}/railway-${theme}.svg`, svg(`
    <defs><linearGradient id="bed" x2="0" y2="1"><stop stop-color="${p.ballast}" stop-opacity="0"/><stop offset=".12" stop-color="${p.ballast}"/><stop offset=".85" stop-color="${p.ballast}"/><stop offset="1" stop-color="${p.ballast}" stop-opacity="0"/></linearGradient></defs>
    <path d="M0 0H480V96H0Z" fill="url(#bed)"/>${stones}${sleepers}
    <path d="M0 10H480V14H0ZM0 24H480V29H0Z" fill="${p.steel}"/>
    <path d="M0 10H480M0 24.75H480" stroke="${p.shine}" stroke-width="1.5"/>
    <path d="M0 14H480M0 29H480" stroke="${p.stone}" stroke-opacity=".55"/>`));
}
console.log('Prepared four seamless 480px road/railway tiles with day/night palettes.');
