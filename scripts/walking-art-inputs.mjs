import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

// Stale exported motion is easy to miss after a joint or painting edit.
const inputs = [
  'src/components/PaintedAnimalArtwork.tsx', 'src/components/AnimalBodyPanels.tsx',
  'src/lib/animalMotion.ts', 'src/lib/animalBodyMotion.ts', 'src/lib/animalLimbSkin.ts',
  'src/lib/renderAnimalPose.ts', 'src/lib/walkingAnatomy.ts', 'src/lib/walkingSprites.ts',
  'src/lib/walkingTorsoArt.json', 'src/lib/animalAtlases.json',
  'public/characters/raster-v1/dog.webp', 'public/characters/raster-v1/cat.webp',
];
export async function walkingArtDigest() {
  const hash = createHash('sha256');
  for (const [index, bytes] of (await Promise.all(inputs.map(path => readFile(path)))).entries()) {
    hash.update(inputs[index]).update(inputs[index].endsWith('.webp') ? bytes : bytes.toString('utf8').replace(/\r\n/g, '\n'));
  }
  return hash.digest('hex');
}
