import sharp from 'sharp';
import atlas from '../src/lib/princeAtlas.json' with { type: 'json' };
import outfitAtlas from '../src/lib/princeOutfitAtlas.json' with { type: 'json' };

const source = 'docs/character-design/prince-v1/prince-atlas.png';
const destination = 'public/characters/raster-v1/prince-painted-v1.webp';
const metadata = await sharp(source).metadata();
if (metadata.width !== atlas.width || metadata.height !== atlas.height || !metadata.hasAlpha) {
  throw new Error('Prince painting must retain its original dimensions and transparent alpha');
}
// Format conversion only: retain the ImageGen painting and all transparent joint overlaps.
await sharp(source).webp({ lossless: true, effort: 6 }).toFile(destination);
console.log(`Painted prince: ${atlas.width}×${atlas.height} → ${destination}`);

const outfitSource = 'docs/character-design/prince-v2/prince-long-pants-atlas.png';
const outfitDestination = 'public/characters/raster-v1/prince-long-pants-v2.webp';
const outfitMetadata = await sharp(outfitSource).metadata();
if (outfitMetadata.width !== outfitAtlas.width || outfitMetadata.height !== outfitAtlas.height || !outfitMetadata.hasAlpha) {
  throw new Error('Prince long-trouser painting must retain its original dimensions and transparent alpha');
}
await sharp(outfitSource).webp({ lossless: true, effort: 6 }).toFile(outfitDestination);
console.log(`Prince long trousers: ${outfitAtlas.width}×${outfitAtlas.height} → ${outfitDestination}`);
