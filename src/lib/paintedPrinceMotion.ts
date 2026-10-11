import atlas from './princeAtlas.json';
import bootAtlas from './princeBootAtlas.json';
import clothingAtlas from './princeClothingAtlas.json';
import { animalLeg } from './animalMotion';
import { smoothstep } from './journey';
import { PRINCE_GAIT } from './princeMotion';
import type { CharacterPose } from './characterPose';
import type { CharacterAction } from '../types/animation';

export const PAINTED_PRINCE_ASSET = '/characters/raster-v1/prince-painted-v1.webp';
export const PAINTED_PRINCE_OUTFIT_ASSET = '/characters/raster-v1/prince-long-pants-v2.webp';
export const PAINTED_PRINCE_BOOT_ASSET = '/characters/raster-v1/prince-boot-v3.webp';
export const PAINTED_PRINCE_CLOTHING_ASSET = '/characters/raster-v1/prince-clothing-v3.webp';
// This short-legged painted rig needs a shorter step than the legacy pixel rig.
export const PAINTED_PRINCE_GAIT = { ...PRINCE_GAIT, travel: 28, support: .56, lift: 4 };
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

// The collar stays pinned. Adjacent cloth panels share each displaced edge;
// lower panels follow the stride later instead of rotating the entire painting.
export const PRINCE_CAPE_ROWS = [0, .12, .28, .46, .64, .82, 1]
  .map((height) => princeAnatomy.cape.y + height * princeAnatomy.cape.height);
export interface PrincePose { joints: CharacterPose; bodyY: number; cape: number[] }
const softMaximum = (a: number, b: number) => (a + b + Math.sqrt((a - b) ** 2 + .4 ** 2)) / 2;
const smootherstep = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t ** 3 * (10 - 15 * t + 6 * t * t); };

/** A human step has a short double-support transfer, followed by a full swing.
 * Position, velocity AND acceleration join at both ends of the return step.
 * Unlike the standing pose, both walking ankles swing around their own hip. */
export function princeFoot(phase: number) {
  const { travel, support, lift } = PAINTED_PRINCE_GAIT;
  const p = ((phase % 1) + 1) % 1, stride = travel * support / 2;
  if (p < support) return { x: stride - travel * p, lift: 0, planted: true,
    pitch: 3 * smootherstep((p / support - .72) / .28) };
  const u = (p - support) / (1 - support);
  return { x: -stride - travel * (1 - support) * u + travel * smootherstep(u),
    lift: 64 * u ** 3 * (1 - u) ** 3 * lift, planted: false,
    pitch: u < .4 ? 3 - 6.5 * smootherstep(u / .4) : -3.5 * (1 - smootherstep((u - .4) / .6)) };
}

export function princeCapePanelTransform(offsets: readonly number[], index: number) {
  const top = PRINCE_CAPE_ROWS[index], bottom = PRINCE_CAPE_ROWS[index + 1];
  const shear = (offsets[index + 1] - offsets[index]) / (bottom - top);
  return `matrix(1 0 ${shear.toFixed(6)} 1 ${(offsets[index] - shear * top).toFixed(6)} 0)`;
}

/** Human support legs extend; only the returning leg folds. Feet and scenery
 * share one clock. Raised arms turn outward from the profile walking pose. */
export function paintedPrincePose(action: CharacterAction, elapsed: number, reduced = false): PrincePose {
  const joints: CharacterPose = {
    'front-thigh': princeAnatomy.legs.front.stance, 'front-shin': 0, 'front-foot': -princeAnatomy.legs.front.stance,
    'back-thigh': princeAnatomy.legs.back.stance, 'back-shin': 0, 'back-foot': -princeAnatomy.legs.back.stance,
    'front-arm': 8, 'front-elbow': -12, 'back-arm': -12, 'back-elbow': -8,
    head: 0, hair: 0, skirt: 0, 'ear-front': 0, 'ear-back': 0, tail: 0, 'wheel-front': 0, 'wheel-back': 0, 'wheel-middle': 0,
  };
  const walking = !reduced && ['walk', 'fastWalk', 'run', 'sprint'].includes(action);
  const cycle = Math.max(0, elapsed) / PAINTED_PRINCE_GAIT.cycleMs;
  const cape = PRINCE_CAPE_ROWS.map((y, index) => {
    if (!walking || index <= 1) return 0;
    const depth = (y - PRINCE_CAPE_ROWS[1]) / (PRINCE_CAPE_ROWS.at(-1)! - PRINCE_CAPE_ROWS[1]);
    const lag = depth * 1.35, angle = cycle * Math.PI * 2;
    return depth ** 1.5 * (-1.2 + 2.1 * Math.sin(angle - lag) + .45 * Math.sin(angle * 2 - lag * 1.6));
  });
  const steps = walking ? (['front', 'back'] as const).map((side) => {
    const rig = princeAnatomy.legs[side], phase = cycle + (side === 'back' ? .5 : 0);
    const foot = princeFoot(phase), pitch = foot.pitch;
    const radians = pitch * Math.PI / 180;
    const soleX = princeSole.x * Math.cos(radians) - princeSole.y * Math.sin(radians);
    const soleY = princeSole.x * Math.sin(radians) + princeSole.y * Math.cos(radians);
    return { side, rig, phase, pitch, x: foot.x + princeSole.x - soleX,
      y: PAINTED_PRINCE_GAIT.groundY - soleY - rig.y - foot.lift };
  }) : [];
  // Lower the pelvis only as far as the current step needs. A fixed 3.2px
  // drop kept BOTH knees bent by 30–45 degrees throughout the old walk.
  const bodyY = walking ? steps.reduce((drop, { rig, x, y }) => {
    const reachSquared = rig.upper ** 2 + rig.lower ** 2 + 2 * rig.upper * rig.lower * Math.cos(6 * Math.PI / 180);
    return softMaximum(drop, y - Math.sqrt(Math.max(0, reachSquared - x * x)));
  }, .25) : 0;
  if (walking) for (const { side, rig, phase, pitch, x, y } of steps) {
    const leg = animalLeg(x, y - bodyY, rig);
    joints[`${side}-thigh`] = leg.hip; joints[`${side}-shin`] = leg.knee; joints[`${side}-foot`] = leg.ankle + pitch;
    const swing = (phase - .03) * Math.PI * 2;
    joints[`${side}-arm`] = 4 + Math.cos(swing) * 16;
    joints[`${side}-elbow`] = -18 + 4 * Math.cos(swing - .35);
  }
  if (walking) {
    joints.head = Math.sin(cycle * Math.PI * 2) * .6;
  }
  if (!reduced && ['jump', 'hop', 'land', 'celebrate'].includes(action)) {
    const raise = action === 'celebrate' ? smoothstep(elapsed / 650)
      : Math.sin(Math.PI * Math.min(1, Math.max(0, elapsed) / (action === 'land' ? 400 : 600)));
    const balance = action === 'land' ? .15 : 1;
    const opening = raise * balance;
    joints['front-arm'] = 8 + opening * (117 + (action === 'celebrate' ? Math.sin(elapsed / 420) * 1.5 : 0));
    joints['back-arm'] = -12 - opening * (103 + (action === 'celebrate' ? Math.sin(elapsed / 450) * 1.5 : 0));
    // The viewer-left and viewer-right arms have opposite flexion directions
    // when opened toward the viewer. Keeping both angles negative made the
    // near forearm fold away from the head, visibly reversing its elbow.
    // Blend the projected bend as the shoulder turns, instead of flipping it.
    joints['front-elbow'] = -12 + smoothstep(opening) * 40;
    joints['back-elbow'] = -8 - opening * 17;
    joints.head = action === 'celebrate' ? Math.sin(elapsed / 500) * raise : 0;
  }
  return { joints, bodyY, cape };
}

export function settlePaintedPrincePose(gait: number, elapsed: number, reduced = false): PrincePose {
  const from = paintedPrincePose('walk', gait, reduced), to = paintedPrincePose('idle', 0, reduced), blend = smoothstep(elapsed / 350);
  if (blend >= 1) return to;
  for (const name of Object.keys(to.joints) as (keyof CharacterPose)[]) to.joints[name] = from.joints[name] + (to.joints[name] - from.joints[name]) * blend;
  to.bodyY = from.bodyY * (1 - blend);
  to.cape = from.cape.map((offset) => offset * (1 - blend));
  return to;
}
