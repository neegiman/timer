import sharp from 'sharp';
import atlas from '../src/lib/princessAtlas.json' with { type: 'json' };
import revised from '../src/lib/princessUpperAtlas.json' with { type: 'json' };

for (const [source, destination, manifest] of [
  ['docs/character-design/princess-v1/princess-atlas.png', 'public/characters/raster-v1/princess.webp', atlas],
  ['docs/character-design/princess-v2/princess-upper-atlas.png', 'public/characters/raster-v1/princess-upper-v2.webp', revised],
]) {
  const metadata = await sharp(source).metadata();
  if (metadata.width !== manifest.width || metadata.height !== manifest.height) throw new Error('Princess source does not match its authored joint regions');
  // Lossless format conversion only. The original painting and alpha remain unchanged.
  await sharp(source).webp({ lossless: true, effort: 6 }).toFile(destination);
  console.log(`Princess: ${manifest.width}×${manifest.height}, original painting → ${destination}`);
}
