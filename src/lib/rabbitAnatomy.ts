import atlases from './animalAtlases.json';

function fittedEar(part: 'earNear' | 'earFar', anchorX: number, anchorY: number, sourceRoot: { x: number; y: number }, height: number) {
  const [, , width, sourceHeight] = atlases.rabbit.parts[part], scale = height / sourceHeight;
  return { anchorX, anchorY, sourceRoot, x: -sourceRoot.x * scale, y: -sourceRoot.y * scale, width: width * scale, height };
}

/** Rabbit atlas proportions and skeleton share the same 160 × 210 art space. */
export const rabbitAnatomy = {
  torso: { x: 21, y: 128, width: 105, height: 64.28 },
  head: { x: 99, y: 122, width: 47, height: 38.14 },
  headPivot: { x: 111, y: 148 },
  earNear: fittedEar('earNear', 111, 131, { x: 103, y: 246 }, 46.61),
  earFar: fittedEar('earFar', 120, 129, { x: 48, y: 249 }, 47),
  paws: {
    nearHind: { x: 40, y: 157, upper: 34, lower: 29, bend: 1 },
    farHind: { x: 47, y: 155, upper: 34, lower: 29, bend: 1 },
    nearFore: { x: 104, y: 164, upper: 22, lower: 23, bend: -1 },
    farFore: { x: 111, y: 163, upper: 22, lower: 23, bend: -1 },
  },
  // Local pixel landmarks inside each atlas region, not its rectangular corners.
  // The haunch rotates at its buried hip; the shin meets the knee and the hock.
  hindArtwork: {
    upper: { pivot: { x: 91, y: 48 }, tip: { x: 106, y: 239 } },
    lower: { pivot: { x: 64, y: 29 }, tip: { x: 69, y: 245 } },
    paw: { pivot: { x: 51, y: 55 }, sole: { x: 216, y: 127 }, width: 28 },
  },
} as const;

const hindPaw = rabbitAnatomy.hindArtwork.paw;
const hindPawScale = hindPaw.width / atlases.rabbit.parts.hindPaw[2];
export const rabbitHindContact = {
  x: (hindPaw.sole.x - hindPaw.pivot.x) * hindPawScale,
  y: (hindPaw.sole.y - hindPaw.pivot.y) * hindPawScale,
};
