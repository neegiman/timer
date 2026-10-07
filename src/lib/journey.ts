// One geometry definition feeds the road, stepping stones, endpoints and character movement.
export type JourneyLayout = 'standard' | 'compact';
type Segment = readonly [number, number, number, number, number, number, number, number];
const standard: Segment[] = [
  [200, 450, 205, 385, 350, 420, 350, 345],
  [350, 345, 350, 265, 480, 320, 510, 270],
  [510, 270, 535, 230, 555, 240, 600, 240],
];
const compact: Segment[] = [
  [150, 450, 210, 375, 300, 470, 360, 390],
  [360, 390, 425, 295, 530, 300, 640, 300],
];
const cubic = (t: number, a: number, b: number, c: number, d: number) =>
  (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;

function createRoute(segments: Segment[]) {
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
  const start = { x: segments[0][0], y: segments[0][1] };
  const last = segments.at(-1)!;
  const finish = { x: last[6], y: last[7] };
  const point = (position: number) => {
    if (position > 1) return { x: finish.x + (Math.min(1.08, position) - 1) * distance, y: finish.y };
    const target = Math.min(1, Math.max(0, position)) * distance;
    const found = points.findIndex((sample) => sample.distance >= target);
    const index = found < 0 ? points.length - 1 : found;
    const next = points[index];
    const previous = points[Math.max(0, index - 1)];
    const fraction = next.distance === previous.distance ? 0 : (target - previous.distance) / (next.distance - previous.distance);
    return { x: previous.x + (next.x - previous.x) * fraction, y: previous.y + (next.y - previous.y) * fraction };
  };
  const path = `M ${start.x} ${start.y} ${segments.map((segment) => `C ${segment.slice(2).join(' ')}`).join(' ')}`;
  const stones = Array.from({ length: 13 }, (_, i) => {
    const position = (i + 1) / 14;
    const center = point(position);
    const ahead = point(position + .001);
    return { ...center, position, angle: Math.atan2(ahead.y - center.y, ahead.x - center.x) * 180 / Math.PI };
  });
  return { path, start, finish, distance, point, stones };
}
const routes = { standard: createRoute(standard), compact: createRoute(compact) };
export const journeyRoute = (layout: JourneyLayout = 'standard') => routes[layout];
export const journeyPoint = (position: number, layout: JourneyLayout = 'standard') => routes[layout].point(position);
export const journeyLayout = (width: number, height: number): JourneyLayout => height < 380 || width / height > 1.6 ? 'compact' : 'standard';
