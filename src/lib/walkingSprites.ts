import { animalProfiles } from './animalMotion';

/** Exported at 2× display size. One decoded image is shared by both actors. */
export const WALK_SPRITE = { frames: 128, columns: 8, x: 0, y: 88, width: 160, height: 122, scale: 2 } as const;
export function walkingFrame(id: 'dog' | 'cat', elapsedMs: number) {
  const cycle = animalProfiles[id].cycleMs;
  return Math.floor(((Math.max(0, elapsedMs) % cycle) / cycle) * WALK_SPRITE.frames);
}
export function walkingFrameViewBox(frame: number) {
  return `${frame % WALK_SPRITE.columns * WALK_SPRITE.width} ${Math.floor(frame / WALK_SPRITE.columns) * WALK_SPRITE.height} ${WALK_SPRITE.width} ${WALK_SPRITE.height}`;
}
export const WALK_SPRITE_DIRECTORY = '/characters/walk-v13';
export const walkingSpritePath = (id: 'dog' | 'cat') => `${WALK_SPRITE_DIRECTORY}/${id}.webp`;
