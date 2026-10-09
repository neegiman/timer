import { animalFoot, animalLeg } from '../src/lib/animalMotion';
import { PRINCE_GAIT, PRINCE_SHEET } from '../src/lib/princeMotion';

// Original, code-authored 32×48 pixel art. No curves, gradients, external artwork or character likeness.
export const princePalette = {
  O: '#29324b', H: '#51343c', h: '#855132', G: '#e9ad44', g: '#ffe58f',
  S: '#f6c99c', s: '#dca078', P: '#e68b8a', W: '#fff1ce',
  B: '#4a83c9', b: '#85b7e5', D: '#375497', R: '#c85f76', r: '#91465e',
  T: '#5d4254', t: '#99717b',
} as const;
type Color = keyof typeof princePalette;
type Point = { x: number; y: number };

export function buildPrinceFrame(index: number) {
  const width = 32, height = 48;
  const pixels = Array.from({ length: height }, () => Array<Color | null>(width).fill(null));
  const pixel = (x: number, y: number, color: Color) => { if (x >= 0 && x < width && y >= 0 && y < height) pixels[y][x] = color; };
  const rect = (x: number, y: number, w: number, h: number, color: Color) => {
    for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) pixel(px, py, color);
  };
  const polygon = (points: number[][], color: Color) => {
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [ax, ay] = points[i], [bx, by] = points[j];
        if ((ay > y + .5) !== (by > y + .5) && x + .5 < (bx - ax) * (y + .5 - ay) / (by - ay) + ax) inside = !inside;
      }
      if (inside) pixel(x, y, color);
    }
  };
  const stroke = (from: Point, to: Point, size: number, color: Color) => {
    const dx = to.x - from.x, dy = to.y - from.y, steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
    for (let i = 0; i <= steps; i++) rect(Math.round(from.x + dx * i / steps - size / 2), Math.round(from.y + dy * i / steps - size / 2), size, size, color);
  };
  const walk = index >= 1 && index <= PRINCE_SHEET.walkFrames;
  const phase = walk ? (index - 1) / PRINCE_SHEET.walkFrames : 0;
  const raised = index === 13 || index >= 15;
  const wave = index >= 15 ? index - 15 : 0;
  const feet: { x: number; sole: number; planted: boolean }[] = [];

  // Cape sits behind both shoulders and the tunic, with a small two-pixel hem flutter.
  const flutter = walk ? Math.round(Math.sin(phase * Math.PI * 2)) : 0;
  polygon([[12, 21], [18, 22], [16, 35], [7 + flutter, 36], [8, 28]], 'O');
  polygon([[12, 22], [16, 23], [14, 34], [8 + flutter, 34], [10, 28]], 'r');
  polygon([[12, 23], [14, 23], [12, 32], [9 + flutter, 33]], 'R');
  rect(8 + flutter, 34, 6, 1, 'G');

  const arm = (near: boolean) => {
    // The far shoulder opens outward when raised so its sleeve and hand stay
    // outside the oversized head, even though that arm is behind the tunic.
    const root = { x: near ? 12 : raised ? 22 : 21, y: 23 }, length = 5;
    const foot = walk ? animalFoot(phase + (near ? 0 : .5), PRINCE_GAIT) : { x: 0 };
    const direction = near ? 1 : -1;
    const angle = raised ? direction * (wave === 1 ? 104 : 115) : 8 + foot.x * 1.7;
    const radians = angle * Math.PI / 180;
    const elbow = { x: root.x - Math.sin(radians) * length, y: root.y + Math.cos(radians) * length };
    const foreAngle = radians + (raised ? direction * (wave === 2 ? .8 : .5) : -.25);
    const hand = { x: elbow.x - Math.sin(foreAngle) * 4, y: elbow.y + Math.cos(foreAngle) * 4 };
    stroke(elbow, hand, 4, 'O'); stroke(elbow, hand, 2, near ? 'S' : 's');
    stroke(root, elbow, 5, 'O'); stroke(root, elbow, 3, near ? 'B' : 'D');
    rect(Math.round(elbow.x) - 1, Math.round(elbow.y) - 1, 3, 2, 'G');
    rect(Math.round(hand.x) - 1, Math.round(hand.y) - 1, 3, 3, 'O');
    rect(Math.round(hand.x) - 1, Math.round(hand.y) - 1, 2, 2, near ? 'S' : 's');
  };
  const leg = (near: boolean) => {
    // Rest with two straight, separated legs under the hips. Walking needs a
    // little reach beyond the vertical stance, not permanently folded knees.
    const rig = { x: near ? (walk ? 14 : 13) : (walk ? 19 : 20), y: 31, upper: 7.5, lower: 8, bend: 1 as const };
    const foot = walk ? animalFoot(phase + (near ? 0 : .5), PRINCE_GAIT) : { x: 0, lift: 0, planted: true };
    const ankle = { x: Math.round(rig.x + foot.x / 4), y: 46 - Math.round(foot.lift / 4) };
    const solved = animalLeg(ankle.x - rig.x, ankle.y - rig.y, rig), hip = (solved.hip + 90) * Math.PI / 180;
    const knee = walk ? { x: rig.x + Math.cos(hip) * rig.upper, y: rig.y + Math.sin(hip) * rig.upper }
      : { x: rig.x, y: 39 };
    stroke(knee, ankle, 4, 'O'); stroke(knee, ankle, 2, near || !walk ? 'D' : 'O');
    stroke(rig, knee, 5, 'O'); stroke(rig, knee, 3, near ? 'B' : 'D');
    // The boot's final row is always the planted ground row (47).
    rect(ankle.x - 2, ankle.y - 1, 5, 2, 'O'); rect(ankle.x - 1, ankle.y - 1, 3, 2, 'T');
    rect(ankle.x - 2, ankle.y + 1, walk ? 7 : 6, 1, 'O'); rect(ankle.x, ankle.y, 4, 1, 't');
    rect(ankle.x - 1, ankle.y - 2, 3, 1, 'G');
    feet.push({ x: ankle.x, sole: ankle.y + 2, planted: foot.planted });
  };
  arm(false); leg(false); leg(true);

  // A fixed one-piece tunic keeps both shoulder and hip sockets covered in every frame.
  polygon([[12, 21], [21, 21], [23, 25], [22, 35], [11, 35], [11, 25]], 'O');
  polygon([[13, 22], [20, 22], [22, 25], [21, 34], [12, 34], [12, 25]], 'B');
  rect(13, 23, 2, 7, 'b'); rect(19, 25, 2, 7, 'D');
  polygon([[14, 21], [20, 21], [18, 25], [16, 25]], 'W');
  rect(16, 26, 1, 2, 'g'); rect(16, 29, 1, 1, 'G');
  rect(12, 31, 10, 2, 'G'); rect(16, 31, 3, 2, 'O'); rect(17, 31, 1, 1, 'g');
  rect(12, 34, 9, 1, 'g');
  arm(true);

  // Friendly face, brown hair and a readable five-point crown.
  rect(15, 19, 5, 3, 'O'); rect(16, 19, 3, 3, 's');
  polygon([[11, 9], [13, 7], [23, 7], [26, 10], [26, 18], [23, 21], [14, 21], [10, 17], [10, 11]], 'O');
  polygon([[12, 10], [14, 8], [23, 8], [25, 11], [25, 17], [22, 20], [15, 20], [11, 17], [11, 11]], 'S');
  rect(11, 12, 2, 5, 's'); rect(13, 18, 3, 1, 's');
  polygon([[10, 10], [12, 7], [22, 7], [25, 9], [25, 12], [23, 11], [21, 10], [19, 12], [17, 11], [14, 14], [12, 13], [12, 17], [10, 16]], 'H');
  rect(13, 9, 7, 1, 'h'); rect(11, 11, 2, 3, 'h'); rect(15, 10, 3, 1, 'h');
  rect(17, 14, 2, 3, 'O'); rect(22, 14, 2, 3, 'O'); rect(17, 14, 1, 1, 'W'); rect(22, 14, 1, 1, 'W');
  rect(15, 17, 2, 1, 'P'); rect(23, 17, 2, 1, 'P'); rect(20, 17, 1, 1, 's'); rect(20, 19, 3, 1, 'H');
  polygon([[11, 3], [14, 5], [16, 1], [19, 5], [23, 2], [23, 8], [12, 8]], 'O');
  polygon([[12, 4], [15, 6], [16, 3], [19, 6], [22, 4], [22, 7], [13, 7]], 'G');
  rect(13, 6, 9, 1, 'g'); rect(17, 6, 2, 1, 'R'); rect(16, 2, 1, 1, 'g');

  const paths = Object.fromEntries(Object.keys(princePalette).map((key) => [key, ''])) as Record<Color, string>;
  for (let y = 0; y < height; y++) for (let x = 0; x < width;) {
    const color = pixels[y][x]; let end = x + 1;
    while (end < width && pixels[y][end] === color) end++;
    if (color) paths[color] += `M${x} ${y}h${end - x}v1h${x - end}z`;
    x = end;
  }
  return { pixels, paths, feet };
}
