import sharp from 'sharp';
import atlas from '../src/lib/princeAtlas.json' with { type: 'json' };
import outfitAtlas from '../src/lib/princeOutfitAtlas.json' with { type: 'json' };
import bootAtlas from '../src/lib/princeBootAtlas.json' with { type: 'json' };
import clothingAtlas from '../src/lib/princeClothingAtlas.json' with { type: 'json' };

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

const bootSource = 'docs/character-design/prince-v3/prince-boot.png';
const bootDestination = 'public/characters/raster-v1/prince-boot-v3.webp';
const bootMetadata = await sharp(bootSource).metadata();
if (bootMetadata.width !== bootAtlas.width || bootMetadata.height !== bootAtlas.height || !bootMetadata.hasAlpha) {
  throw new Error('Prince boot painting must retain its original dimensions and transparent alpha');
}
await sharp(bootSource).webp({ lossless: true, effort: 6 }).toFile(bootDestination);
console.log(`Prince boot: ${bootAtlas.width}×${bootAtlas.height} → ${bootDestination}`);

const clothingSource = 'docs/character-design/prince-v3/prince-clothing.png';
const clothingDestination = 'public/characters/raster-v1/prince-clothing-v3.webp';
const clothingMetadata = await sharp(clothingSource).metadata();
if (clothingMetadata.width !== clothingAtlas.width || clothingMetadata.height !== clothingAtlas.height || !clothingMetadata.hasAlpha) {
  throw new Error('Prince clothing must retain its original dimensions and transparent alpha');
}
await sharp(clothingSource).webp({ lossless: true, effort: 6 }).toFile(clothingDestination);
console.log(`Prince clothing: ${clothingAtlas.width}×${clothingAtlas.height} → ${clothingDestination}`);
