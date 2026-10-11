import atlases from './animalAtlases.json';
import walkingTorsoArt from './walkingTorsoArt.json';

type WalkerId = 'dog' | 'cat';
type Point = { x: number; y: number };
export interface LimbArtwork {
  upper: { pivot: Point; tip: Point; widthScale?: number };
  lower: { pivot: Point; tip: Point; widthScale?: number };
  paw: { pivot: Point; sole: Point; width: number };
}
function fittedPart(id: WalkerId, part: 'torso' | 'head', x: number, y: number, width: number) {
  const region = part === 'torso' ? walkingTorsoArt[id].viewBox : atlases[id].parts[part];
  return { x, y, width, height: width * region[3] / region[2] };
}
function fittedEar(id: WalkerId, part: 'earNear' | 'earFar', anchorX: number, anchorY: number, sourceRoot: Point, height: number) {
  const [, , width, sourceHeight] = atlases[id].parts[part], scale = height / sourceHeight;
  return { anchorX, anchorY, sourceRoot, x: -sourceRoot.x * scale, y: -sourceRoot.y * scale, width: width * scale, height };
}

/** Pixel landmarks inside the existing paintings, in the same art space as the rabbit.
 * Bone lengths match the shoulder/hip-to-ground gap. Excess length forces the
 * solver into a deep crouch even when idle; the higher far-side roots need 2px more.
 */
export const walkingAnatomy = {
  dog: {
    torso: fittedPart('dog', 'torso', 32, 124, 96),
    head: fittedPart('dog', 'head', 98, 121, 50), headPivot: { x: 110, y: 147 },
    earNear: fittedEar('dog', 'earNear', 108, 130, { x: 96, y: 40 }, 33),
    earFar: fittedEar('dog', 'earFar', 118, 128, { x: 65, y: 40 }, 30),
    paws: {
      nearHind: { x: 51, y: 155, upper: 22, lower: 22, bend: 1 },
      farHind: { x: 59, y: 153, upper: 23, lower: 23, bend: 1 },
      nearFore: { x: 108, y: 158, upper: 20, lower: 21, bend: -1 },
      farFore: { x: 116, y: 156, upper: 21, lower: 22, bend: -1 },
    },
    hindArtwork: {
      upper: { pivot: { x: 88, y: 48 }, tip: { x: 88, y: 262 }, widthScale: 1.18 },
      lower: { pivot: { x: 65, y: 30 }, tip: { x: 67, y: 247 }, widthScale: 1.3 },
      paw: { pivot: { x: 59, y: 42 }, sole: { x: 180, y: 153 }, width: 21 },
    },
    foreArtwork: {
      upper: { pivot: { x: 75, y: 45 }, tip: { x: 75, y: 276 }, widthScale: 1.18 },
      lower: { pivot: { x: 63, y: 32 }, tip: { x: 65, y: 257 }, widthScale: 1.3 },
      paw: { pivot: { x: 46, y: 36 }, sole: { x: 140, y: 126 }, width: 19 },
    },
  },
  cat: {
    torso: fittedPart('cat', 'torso', 34, 128, 90),
    head: fittedPart('cat', 'head', 95, 124, 44), headPivot: { x: 106, y: 149 },
    earNear: fittedEar('cat', 'earNear', 106, 138, { x: 94, y: 183 }, 23),
    earFar: fittedEar('cat', 'earFar', 116, 134, { x: 97, y: 186 }, 21),
    paws: {
      nearHind: { x: 53, y: 153, upper: 26, lower: 26, bend: 1 },
      farHind: { x: 61, y: 151, upper: 27, lower: 27, bend: 1 },
      nearFore: { x: 101, y: 156, upper: 23, lower: 24, bend: -1 },
      farFore: { x: 109, y: 154, upper: 24, lower: 25, bend: -1 },
    },
    hindArtwork: {
      upper: { pivot: { x: 88, y: 42 }, tip: { x: 88, y: 244 }, widthScale: 1.16 },
      lower: { pivot: { x: 70, y: 28 }, tip: { x: 70, y: 238 }, widthScale: 1.28 },
      paw: { pivot: { x: 43, y: 28 }, sole: { x: 141, y: 112 }, width: 19 },
    },
    foreArtwork: {
      upper: { pivot: { x: 70, y: 42 }, tip: { x: 70, y: 273 }, widthScale: 1.16 },
      lower: { pivot: { x: 64, y: 28 }, tip: { x: 68, y: 249 }, widthScale: 1.28 },
      paw: { pivot: { x: 44, y: 35 }, sole: { x: 142, y: 118 }, width: 19 },
    },
  },
} as const;

export function walkingPawContact(id: WalkerId, hind: boolean) {
  const artwork = walkingAnatomy[id][hind ? 'hindArtwork' : 'foreArtwork'].paw;
  const scale = artwork.width / atlases[id].parts[hind ? 'hindPaw' : 'forePaw'][2];
  return { x: (artwork.sole.x - artwork.pivot.x) * scale, y: (artwork.sole.y - artwork.pivot.y) * scale };
}
