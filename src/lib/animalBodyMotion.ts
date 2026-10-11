import { walkingAnatomy } from './walkingAnatomy';
import type { AnimalId } from './animalMotion';

export const TORSO_PANELS = 8;
export const TAIL_PANELS = 5;
export const TAIL_BOUNDS = { x: -24, y: -51, width: 35, height: 57 };
// Include the actual root at y=0: the last panel stays anchored to the rump.
export const TAIL_CUTS = Array.from({ length: TAIL_PANELS + 1 }, (_, index) => index === TAIL_PANELS
  ? TAIL_BOUNDS.y + TAIL_BOUNDS.height : TAIL_BOUNDS.y * (1 - index / (TAIL_PANELS - 1)));
export interface AnimalBodyMotion {
  torso: number[];
  tail: number[];
  headY: number;
  tailY: number;
}
export const isWalker = (id: AnimalId): id is 'dog' | 'cat' => id === 'dog' || id === 'cat';

/** Small, continuous waves: a walking cat stabilizes its back rather than arching like a gallop. */
export function animalBodyMotion(id: AnimalId, cycle: number, moving: boolean): AnimalBodyMotion {
  const angle = cycle * Math.PI * 2;
  const active = moving && isWalker(id);
  const torso = Array.from({ length: TORSO_PANELS + 1 }, (_, index) => {
    if (!active) return 0;
    const t = index / TORSO_PANELS;
    const roll = Math.sin(angle) * (id === 'cat' ? .75 : .25);
    const spine = id === 'cat' ? Math.sin(Math.PI * 2 * t - angle) * Math.sin(Math.PI * t) * .55 : 0;
    return roll * (1 - 2 * t) + spine;
  });
  const tail = Array.from({ length: TAIL_PANELS + 1 }, (_, index) => {
    if (!active) return 0;
    const y = TAIL_CUTS[index];
    const t = Math.max(0, Math.min(1, -y / -TAIL_BOUNDS.y));
    return Math.sin(angle * (id === 'dog' ? 2 : 1) - t * 1.2) * (id === 'cat' ? 3 : 1.5) * t * t;
  });
  // The neck is an attachment to the same surface as the shoulders, not an
  // independently stabilized layer. Its tiny nod rotates about this socket.
  return { torso, tail, headY: isWalker(id) ? torsoOffset(id, torso, walkingAnatomy[id].headPivot.x) : 0,
    tailY: isWalker(id) ? torsoOffset(id, torso, 29) : 0 };
}

/** Same piecewise-linear surface used by the painted panels and their attached joints. */
export function torsoOffset(id: 'dog' | 'cat', offsets: number[], x: number) {
  const bounds = walkingAnatomy[id].torso;
  const t = Math.max(0, Math.min(TORSO_PANELS, (x - bounds.x) / bounds.width * TORSO_PANELS));
  const index = Math.min(TORSO_PANELS - 1, Math.floor(t));
  return offsets[index] + (offsets[index + 1] - offsets[index]) * (t - index);
}

export function torsoPanelMatrix(id: 'dog' | 'cat', motion: AnimalBodyMotion, index: number) {
  const bounds = walkingAnatomy[id].torso, width = bounds.width / TORSO_PANELS;
  const x = bounds.x + index * width;
  const slope = (motion.torso[index + 1] - motion.torso[index]) / width;
  return [1, slope, 0, 1, 0, motion.torso[index] - slope * x];
}

export function tailPanelMatrix(motion: AnimalBodyMotion, index: number) {
  const y = TAIL_CUTS[index], height = TAIL_CUTS[index + 1] - y;
  const slope = (motion.tail[index + 1] - motion.tail[index]) / height;
  return [1, 0, slope, 1, motion.tail[index] - slope * y, 0];
}
