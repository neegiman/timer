import { torsoOffset, type AnimalBodyMotion } from './animalBodyMotion';
import { walkingAnatomy } from './walkingAnatomy';
import type { PawName } from './animalMotion';

type Point = { x: number; y: number };
type Walker = 'dog' | 'cat';
export const LIMB_SKIN_HALF_WIDTH = 16;

/** The proximal skin stays with the trunk; the distal skin follows the knee.
 * Shared triangle vertices avoid opening seams as the thigh changes shape. */
export function limbSkinTriangles(length: number) {
  const rows = [-8, 0, length * .5, length, length + 8];
  const columns = [-LIMB_SKIN_HALF_WIDTH, 0, LIMB_SKIN_HALF_WIDTH];
  const triangles: [Point, Point, Point][] = [];
  for (let index = 0; index < rows.length - 1; index++) for (let column = 0; column < columns.length - 1; column++) {
    const a = { x: columns[column], y: rows[index] }, b = { x: columns[column + 1], y: rows[index] };
    const c = { x: columns[column], y: rows[index + 1] }, d = { x: columns[column + 1], y: rows[index + 1] };
    triangles.push([a, b, c], [b, d, c]);
  }
  return triangles;
}

/** Subpixel overlap closes browser antialiasing hairlines between clipped patches. */
export function limbSkinClip(triangle: readonly Point[]) {
  const center = { x: triangle.reduce((sum, p) => sum + p.x, 0) / 3, y: triangle.reduce((sum, p) => sum + p.y, 0) / 3 };
  return triangle.map((p) => `${p.x + (p.x - center.x) * .006},${p.y + (p.y - center.y) * .006}`).join(' ');
}

export const animalMatrix = (values: number[]) => `matrix(${values.map((value) => (Math.abs(value) < .00000005 ? 0 : value).toFixed(7)).join(' ')})`;

export function limbSkinPoint(id: Walker, paw: PawName, motion: AnimalBodyMotion, hip: number, point: Point): Point {
  const rig = walkingAnatomy[id].paws[paw], angle = hip * Math.PI / 180;
  const t = Math.max(0, Math.min(1, point.y / rig.upper));
  const weight = t * t * (3 - 2 * t);
  const rootY = torsoOffset(id, motion.torso, rig.x + point.x) - torsoOffset(id, motion.torso, rig.x);
  const rotatedX = point.x * Math.cos(angle) - point.y * Math.sin(angle);
  const rotatedY = point.x * Math.sin(angle) + point.y * Math.cos(angle);
  return { x: point.x + (rotatedX - point.x) * weight,
    y: point.y + rootY + (rotatedY - point.y - rootY) * weight };
}

export function limbSkinMatrix(id: Walker, paw: PawName, motion: AnimalBodyMotion, hip: number, triangle: readonly Point[]) {
  const [a, b, c] = triangle, [p, q, r] = triangle.map((point) => limbSkinPoint(id, paw, motion, hip, point));
  const denominator = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
  const xx = ((q.x - p.x) * (c.y - a.y) - (r.x - p.x) * (b.y - a.y)) / denominator;
  const xy = ((r.x - p.x) * (b.x - a.x) - (q.x - p.x) * (c.x - a.x)) / denominator;
  const yx = ((q.y - p.y) * (c.y - a.y) - (r.y - p.y) * (b.y - a.y)) / denominator;
  const yy = ((r.y - p.y) * (b.x - a.x) - (q.y - p.y) * (c.x - a.x)) / denominator;
  return [xx, yx, xy, yy, p.x - xx * a.x - xy * a.y, p.y - yx * a.x - yy * a.y];
}
