import atlas from './princeAtlas.json';
import bootAtlas from './princeBootAtlas.json';
import clothingAtlas from './princeClothingAtlas.json';
import { animalFoot, animalLeg, walkingFootPitch } from './animalMotion';
import { smoothstep } from './journey';
import { PRINCE_GAIT } from './princeMotion';
import type { CharacterPose } from './characterPose';
import type { CharacterAction } from '../types/animation';

export const PAINTED_PRINCE_ASSET = '/characters/raster-v1/prince-painted-v1.webp';
export const PAINTED_PRINCE_OUTFIT_ASSET = '/characters/raster-v1/prince-long-pants-v2.webp';
export const PAINTED_PRINCE_BOOT_ASSET = '/characters/raster-v1/prince-boot-v3.webp';
export const PAINTED_PRINCE_CLOTHING_ASSET = '/characters/raster-v1/prince-clothing-v3.webp';
// This short-legged painted rig needs a shorter step than the legacy pixel rig.
export const PAINTED_PRINCE_GAIT = { ...PRINCE_GAIT, travel: 28, support: .64, lift: 5 };
export type PrincePart = keyof typeof atlas.parts | keyof typeof clothingAtlas.parts;
const fitted = (part: keyof typeof atlas.parts, x: number, y: number, width: number) => {
  const region = atlas.parts[part];
  return { x, y, width, height: width * region[3] / region[2] };
};
const boot = { width: 34, height: 34, pivot: { x: 365, y: 86 }, sole: { x: 687, y: 897 } };
const bootScaleX = boot.width / bootAtlas.parts.boot[2], bootScaleY = boot.height / bootAtlas.parts.boot[3];
export const princeSole = { x: (boot.sole.x - boot.pivot.x) * bootScaleX, y: (boot.sole.y - boot.pivot.y) * bootScaleY };
const upperLeg = 26.6, lowerLeg = 25;
const leg = (x: number, stance: number) => ({
  x, y: PRINCE_GAIT.groundY - princeSole.y - (upperLeg + lowerLeg) * Math.cos(stance * Math.PI / 180),
  upper: upperLeg, lower: lowerLeg, bend: 1 as const, stance,
  restX: -(upperLeg + lowerLeg) * Math.sin(stance * Math.PI / 180),
});

/** Rounded painted roots overlap inside the vest, elbows, knees and boot openings. */
export const princeAnatomy = {
  head: fitted('head', 44, 12, 65), headPivot: { x: 80, y: 83 },
  // One continuous vest-and-trouser painting keeps the waist joined to both moving legs.
  torso: { x: 59.3, y: 77.4, width: 43, height: 62.85 },
  cape: fitted('cape', 26, 80, 108), capePivot: { x: 80, y: 87 },
  legs: {
    front: { ...leg(70, 7.8), part: 'frontTrouser',
      thigh: { pivot: { x: 199, y: 45 }, tip: { x: 155, y: 365 } },
      shin: { pivot: { x: 155, y: 365 }, tip: { x: 114, y: 665 } } },
    back: { ...leg(93, -4.6), part: 'backTrouser',
      thigh: { pivot: { x: 136, y: 45 }, tip: { x: 160, y: 365 } },
      shin: { pivot: { x: 160, y: 365 }, tip: { x: 184, y: 665 } } },
  },
  boot,
  arms: {
    front: { x: 61, y: 88, upper: 26, lower: 24, upperPart: 'upperArm', lowerPart: 'foreArm',
      upperArt: { pivot: { x: 67, y: 34 }, tip: { x: 111, y: 249 } },
      lowerArt: { pivot: { x: 60, y: 40 }, tip: { x: 75, y: 266 } }, crossScale: 1 },
    back: { x: 99, y: 88, upper: 26, lower: 24, upperPart: 'backUpperArm', lowerPart: 'backForeArm',
      upperArt: { pivot: { x: 102, y: 31 }, tip: { x: 45, y: 207 } },
      lowerArt: { pivot: { x: 85, y: 43 }, tip: { x: 62, y: 275 } }, crossScale: 1 },
  },
} as const;

export interface PrincePose { joints: CharacterPose; bodyY: number }
const softMaximum = (a: number, b: number) => (a + b + Math.sqrt((a - b) ** 2 + .15 ** 2)) / 2;

/** Human support legs extend; only the returning leg folds. Feet and scenery
 * share one clock, and elbows keep the same bend direction in every action. */
export function paintedPrincePose(action: CharacterAction, elapsed: number, reduced = false): PrincePose {
  const joints: CharacterPose = {
    'front-thigh': princeAnatomy.legs.front.stance, 'front-shin': 0, 'front-foot': -princeAnatomy.legs.front.stance,
    'back-thigh': princeAnatomy.legs.back.stance, 'back-shin': 0, 'back-foot': -princeAnatomy.legs.back.stance,
    'front-arm': 8, 'front-elbow': -12, 'back-arm': -12, 'back-elbow': -8,
    head: 0, hair: 0, skirt: 0, 'ear-front': 0, 'ear-back': 0, tail: 0, 'wheel-front': 0, 'wheel-back': 0, 'wheel-middle': 0,
  };
  const walking = !reduced && ['walk', 'fastWalk', 'run', 'sprint'].includes(action);
  const cycle = Math.max(0, elapsed) / PAINTED_PRINCE_GAIT.cycleMs;
  const steps = walking ? (['front', 'back'] as const).map((side) => {
    const rig = princeAnatomy.legs[side], phase = cycle + (side === 'back' ? .5 : 0);
    const foot = animalFoot(phase, PAINTED_PRINCE_GAIT);
    const pitch = walkingFootPitch(phase, PAINTED_PRINCE_GAIT.support, false) * .45;
    const radians = pitch * Math.PI / 180;
    const soleX = princeSole.x * Math.cos(radians) - princeSole.y * Math.sin(radians);
    const soleY = princeSole.x * Math.sin(radians) + princeSole.y * Math.cos(radians);
    return { side, rig, foot, pitch, x: rig.restX + foot.x + princeSole.x - soleX,
      y: PAINTED_PRINCE_GAIT.groundY - soleY - rig.y - foot.lift };
  }) : [];
  // Lower the pelvis only as far as the current step needs. A fixed 3.2px
  // drop kept BOTH knees bent by 30–45 degrees throughout the old walk.
  const bodyY = walking ? steps.reduce((drop, { rig, x, y }) => {
    const reachSquared = rig.upper ** 2 + rig.lower ** 2 + 2 * rig.upper * rig.lower * Math.cos(6 * Math.PI / 180);
    return softMaximum(drop, y - Math.sqrt(Math.max(0, reachSquared - x * x)));
  }, .15) : 0;
  if (walking) for (const { side, rig, foot, pitch, x, y } of steps) {
    const leg = animalLeg(x, y - bodyY, rig);
    joints[`${side}-thigh`] = leg.hip; joints[`${side}-shin`] = leg.knee; joints[`${side}-foot`] = leg.ankle + pitch;
    const reach = foot.x / (PAINTED_PRINCE_GAIT.travel * PAINTED_PRINCE_GAIT.support / 2);
    joints[`${side}-arm`] = 4 + reach * 16;
    joints[`${side}-elbow`] = -14 - 8 * smoothstep((1 - reach) / 2);
  }
  if (walking) {
    joints.head = Math.sin(cycle * Math.PI * 2) * .6;
    joints.hair = Math.sin(cycle * Math.PI * 2 - .8) * 1.1; // Cape uses the spare soft-cloth joint.
  }
  if (!reduced && ['jump', 'hop', 'land', 'celebrate'].includes(action)) {
    const raise = action === 'celebrate' ? smoothstep(elapsed / 650)
      : Math.sin(Math.PI * Math.min(1, Math.max(0, elapsed) / (action === 'land' ? 400 : 600)));
    const balance = action === 'land' ? .15 : 1;
    joints['front-arm'] = 8 + raise * balance * (137 + (action === 'celebrate' ? Math.sin(elapsed / 420) * 1.5 : 0));
    joints['back-arm'] = -12 - raise * balance * (103 + (action === 'celebrate' ? Math.sin(elapsed / 450) * 1.5 : 0));
    joints['front-elbow'] = -12 - raise * balance * 18;
    joints['back-elbow'] = -8 - raise * balance * 17;
    joints.head = action === 'celebrate' ? Math.sin(elapsed / 500) * raise : 0;
  }
  return { joints, bodyY };
}

export function settlePaintedPrincePose(gait: number, elapsed: number, reduced = false): PrincePose {
  const from = paintedPrincePose('walk', gait, reduced), to = paintedPrincePose('idle', 0, reduced), blend = smoothstep(elapsed / 350);
  if (blend >= 1) return to;
  for (const name of Object.keys(to.joints) as (keyof CharacterPose)[]) to.joints[name] = from.joints[name] + (to.joints[name] - from.joints[name]) * blend;
  to.bodyY = from.bodyY * (1 - blend);
  return to;
}
