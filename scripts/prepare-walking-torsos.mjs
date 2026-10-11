import fs from 'node:fs/promises';
import atlases from '../src/lib/animalAtlases.json' with { type: 'json' };

// Reuse the original rounded painting paired with each selection thumbnail.
// Keep its native aspect ratio; a separately painted, stretched trunk changes
// the puppy/kitten silhouette even when the head and fur colors match.
const manifest = {};
for (const id of ['dog', 'cat']) {
  const atlas = atlases[id];
  manifest[id] = { src: `/characters/raster-v1/${id}.webp`, width: atlas.width, height: atlas.height, viewBox: atlas.parts.torso };
}
await fs.writeFile('src/lib/walkingTorsoArt.json', JSON.stringify(manifest, null, 2) + '\n');
