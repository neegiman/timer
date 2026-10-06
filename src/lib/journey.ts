// The traveler uses distance along the route, so halfway through time is halfway along the path.
export const JOURNEY_PATH = 'M 90 252 C 190 252 165 172 300 196 S 435 292 535 227 S 650 178 712 222';

function cubic(t: number, a: number, b: number, c: number, d: number) {
  return (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;
}
const segments = [
  [90, 252, 190, 252, 165, 172, 300, 196],
  [300, 196, 435, 220, 435, 292, 535, 227],
  [535, 227, 635, 162, 650, 178, 712, 222],
];
const points: { x: number; y: number; distance: number }[] = [];
let distance = 0;
for (const segment of segments) {
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const x = cubic(t, segment[0], segment[2], segment[4], segment[6]);
    const y = cubic(t, segment[1], segment[3], segment[5], segment[7]);
    const previous = points.at(-1);
    if (previous) distance += Math.hypot(x - previous.x, y - previous.y);
    points.push({ x, y, distance });
  }
}

export function journeyPoint(progress: number) {
  const target = Math.min(1, Math.max(0, progress)) * distance;
  const nextIndex = points.findIndex((point) => point.distance >= target);
  const next = points[nextIndex < 0 ? points.length - 1 : nextIndex];
  const previous = points[Math.max(0, nextIndex - 1)];
  const fraction = next.distance === previous.distance ? 0 : (target - previous.distance) / (next.distance - previous.distance);
  return { x: previous.x + (next.x - previous.x) * fraction, y: previous.y + (next.y - previous.y) * fraction };
}
