import atlases from './animalAtlases.json';

/** Rabbit atlas proportions and skeleton share the same 160 × 210 art space. */
export const rabbitAnatomy = {
  torso: { x: 21, y: 128, width: 105, height: 64.28 },
  head: { x: 99, y: 122, width: 47, height: 38.14 },
  headPivot: { x: 111, y: 148 },
  earNear: { anchorX: 108, anchorY: 128, x: -20, y: -47, width: 27, height: 46.61 },
  earFar: { anchorX: 117, anchorY: 127, x: -8, y: -47, width: 21.79, height: 47 },
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
