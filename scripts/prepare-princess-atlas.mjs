import sharp from 'sharp';
import atlas from '../src/lib/princessAtlas.json' with { type: 'json' };

const source = 'docs/character-design/princess-v1/princess-atlas.png';
const destination = 'public/characters/raster-v1/princess.webp';
const metadata = await sharp(source).metadata();
if (metadata.width !== atlas.width || metadata.height !== atlas.height) throw new Error('Princess source does not match its authored joint regions');
// Lossless format conversion only. The original painting and alpha remain unchanged.
await sharp(source).webp({ lossless: true, effort: 6 }).toFile(destination);
console.log(`Princess: ${atlas.width}×${atlas.height}, original painting → lossless WebP`);
