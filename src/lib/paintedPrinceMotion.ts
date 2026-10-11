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

/** A small weight shift gives bent walking knees room while standing legs stay upright. */
export function paintedPrincePose(action: CharacterAction, elapsed: number, reduced = false): PrincePose {
  const joints: CharacterPose = {
    'front-thigh': princeAnatomy.legs.front.stance, 'front-shin': 0, 'front-foot': -princeAnatomy.legs.front.stance,
    'back-thigh': princeAnatomy.legs.back.stance, 'back-shin': 0, 'back-foot': -princeAnatomy.legs.back.stance,
    'front-arm': 8, 'front-elbow': -12, 'back-arm': -12, 'back-elbow': -8,
    head: 0, hair: 0, skirt: 0, 'ear-front': 0, 'ear-back': 0, tail: 0, 'wheel-front': 0, 'wheel-back': 0, 'wheel-middle': 0,
  };
  const walking = !reduced && ['walk', 'fastWalk', 'run', 'sprint'].includes(action);
  const cycle = Math.max(0, elapsed) / PRINCE_GAIT.cycleMs;
  const bodyY = walking ? 3.2 + .2 * Math.cos(cycle * Math.PI * 4) : 0;
  if (walking) for (const side of ['front', 'back'] as const) {
    const rig = princeAnatomy.legs[side], phase = cycle + (side === 'back' ? .5 : 0);
    // The taller cuff needs a smaller ankle roll than the previous low shoe.
    const foot = animalFoot(phase, PRINCE_GAIT), pitch = walkingFootPitch(phase, PRINCE_GAIT.support, false) * .65;
    const radians = pitch * Math.PI / 180;
    const soleX = princeSole.x * Math.cos(radians) - princeSole.y * Math.sin(radians);
    const soleY = princeSole.x * Math.sin(radians) + princeSole.y * Math.cos(radians);
    const leg = animalLeg(rig.restX + foot.x + princeSole.x - soleX, PRINCE_GAIT.groundY - bodyY - soleY - rig.y - foot.lift, rig);
    joints[`${side}-thigh`] = leg.hip; joints[`${side}-shin`] = leg.knee; joints[`${side}-foot`] = leg.ankle + pitch;
    const reach = foot.x / (PRINCE_GAIT.travel * PRINCE_GAIT.support / 2);
    joints[`${side}-arm`] = (side === 'front' ? 8 : -12) + reach * 18;
    joints[`${side}-elbow`] = -12 - 8 * smoothstep((1 - reach) / 2);
  }
  if (walking) {
    joints.head = Math.sin(cycle * Math.PI * 2) * .6;
    joints.hair = Math.sin(cycle * Math.PI * 2 - .8) * 1.1; // Cape uses the spare soft-cloth joint.
  }
  if (!reduced && ['jump', 'hop', 'land', 'celebrate'].includes(action)) {
    const raise = action === 'celebrate' ? smoothstep(elapsed / 500)
      : Math.sin(Math.PI * Math.min(1, Math.max(0, elapsed) / (action === 'land' ? 400 : 600)));
    joints['front-arm'] = 8 + raise * (104 + (action === 'celebrate' ? Math.sin(elapsed / 330) * 2 : 0));
    joints['back-arm'] = -12 - raise * (100 + (action === 'celebrate' ? Math.sin(elapsed / 360) * 2 : 0));
    joints['front-elbow'] = -12 + raise * 52;
    joints['back-elbow'] = -8 - raise * 32;
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
