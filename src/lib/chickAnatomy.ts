import atlases from './animalAtlases.json';

const wingScale = 25 / atlases.chick.parts.earFar[3];

/** Painted landmarks, rather than the atlas rectangles, define the attachment points. */
export const chickAnatomy = {
  paws: {
    nearHind: { x: 76, y: 176, upper: 13, lower: 17, bend: -1 },
    farHind: { x: 91, y: 176, upper: 13, lower: 17, bend: -1 },
  },
  legArtwork: {
    upper: { pivot: { x: 68, y: 37 }, tip: { x: 67, y: 207 } },
    lower: { pivot: { x: 43, y: 25 }, tip: { x: 43, y: 207 } },
    // The ankle is where the toes branch, below the shin already painted on this part.
    paw: { pivot: { x: 53, y: 112 }, sole: { x: 122, y: 182 }, width: 19 },
  },
  wing: {
    // earFar is the existing wing with its shoulder on the right and feather tips on the left.
    part: 'earFar', anchorX: 88, anchorY: 155,
    sourceRoot: { x: 200, y: 35 }, sourceTip: { x: 29, y: 150 },
    x: -200 * wingScale, y: -35 * wingScale,
    width: atlases.chick.parts.earFar[2] * wingScale, height: 25,
  },
} as const;

const paw = chickAnatomy.legArtwork.paw;
const pawScale = paw.width / atlases.chick.parts.hindPaw[2];
export const chickPawContact = {
  x: (paw.sole.x - paw.pivot.x) * pawScale,
  y: (paw.sole.y - paw.pivot.y) * pawScale,
};
