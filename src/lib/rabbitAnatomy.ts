/** Rabbit atlas proportions and skeleton share the same 160 × 210 art space. */
export const rabbitAnatomy = {
  torso: { x: 21, y: 128, width: 105, height: 64.28 },
  head: { x: 99, y: 122, width: 47, height: 38.14 },
  headPivot: { x: 111, y: 148 },
  earNear: { anchorX: 108, anchorY: 128, x: -20, y: -47, width: 27, height: 46.61 },
  earFar: { anchorX: 117, anchorY: 127, x: -8, y: -47, width: 21.79, height: 47 },
  paws: {
    nearHind: { x: 48, y: 164, upper: 24, lower: 25, bend: 1 },
    farHind: { x: 55, y: 162, upper: 24, lower: 25, bend: 1 },
    nearFore: { x: 104, y: 164, upper: 22, lower: 23, bend: -1 },
    farFore: { x: 111, y: 163, upper: 22, lower: 23, bend: -1 },
  },
} as const;
