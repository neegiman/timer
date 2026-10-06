// The traveler uses distance along the route, so halfway through time is halfway along the path.
export const JOURNEY_PATH = 'M 200 450 C 320 470 220 330 350 330 C 530 330 380 180 540 200 C 630 210 540 170 600 170';

function cubic(t: number, a: number, b: number, c: number, d: number) {
  return (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;
}
const segments = [
  [200, 450, 320, 470, 220, 330, 350, 330],
  [350, 330, 530, 330, 380, 180, 540, 200],
  [540, 200, 630, 210, 540, 170, 600, 170],
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
