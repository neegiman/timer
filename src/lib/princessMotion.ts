import atlas from './princessAtlas.json';
import { animalFoot, animalLeg, walkingFootPitch } from './animalMotion';
import type { CharacterPose } from './characterPose';
import type { CharacterAction } from '../types/animation';
import { smoothstep } from './journey';
import { princessPart } from './princessArtwork';

const fitted = (part: 'head' | 'hair' | 'bodice' | 'skirt', x: number, y: number, width: number) => {
  const { region } = princessPart(part);
  return { x, y, width, height: width * region[3] / region[2] };
};

export const princessAnatomy = {
  head: fitted('head', 46, 14, 64), headPivot: { x: 80, y: 78 },
  hair: fitted('hair', 28, 29, 66), hairPivot: { x: 60, y: 38 },
  bodice: fitted('bodice', 60, 72, 40),
  skirt: fitted('skirt', 44, 111, 72), skirtPivot: { x: 80, y: 116 },
  legs: { front: { x: 76, y: 147, upper: 24, lower: 25, bend: 1 }, back: { x: 84, y: 147, upper: 24, lower: 25, bend: 1 } },
  thigh: { pivot: { x: 64, y: 28 }, tip: { x: 65, y: 264 } },
  shin: { pivot: { x: 50, y: 24 }, tip: { x: 50, y: 257 } },
  shoe: { pivot: { x: 55, y: 40 }, sole: { x: 155, y: 144 }, width: 22 },
  arms: {
    front: { x: 94, y: 81, upper: 25, lower: 18,
      upperArt: { pivot: { x: 86, y: 35 }, tip: { x: 115, y: 292 } },
      lowerArt: { pivot: { x: 50, y: 35 }, tip: { x: 82, y: 225 } } },
    back: { x: 64, y: 81, upper: 25, lower: 18,
      upperArt: { pivot: { x: 83, y: 35 }, tip: { x: 57, y: 297 } },
      lowerArt: { pivot: { x: 57, y: 35 }, tip: { x: 55, y: 225 } } },
  },
} as const;
export const PRINCESS_GAIT = { cycleMs: 1250, support: .62, travel: 36, lift: 7, groundY: 205 };
const shoeScale = princessAnatomy.shoe.width / atlas.parts.shoe[2];
export const princessSole = {
  x: (princessAnatomy.shoe.sole.x - princessAnatomy.shoe.pivot.x) * shoeScale,
  y: (princessAnatomy.shoe.sole.y - princessAnatomy.shoe.pivot.y) * shoeScale,
};

/** Same timestamp gait clock and toe-contact IK as the animals, with a two-legged human rig. */
export function princessPose(action: CharacterAction, elapsed: number, reduced = false): CharacterPose {
  const pose: CharacterPose = {
    'front-thigh': 0, 'front-shin': 0, 'front-foot': 0, 'back-thigh': 0, 'back-shin': 0, 'back-foot': 0,
    'front-arm': 4, 'front-elbow': -18, 'back-arm': 4, 'back-elbow': -18,
    head: 0, hair: 0, skirt: 0, 'ear-front': 0, 'ear-back': 0, tail: 0, 'wheel-front': 0, 'wheel-back': 0, 'wheel-middle': 0,
  };
  const walking = !reduced && ['walk', 'fastWalk', 'run', 'sprint'].includes(action);
  const cycle = Math.max(0, elapsed) / PRINCESS_GAIT.cycleMs;
  for (const [side, rig] of Object.entries(princessAnatomy.legs)) {
    const phase = cycle + (side === 'back' ? .5 : 0);
    const foot = walking ? animalFoot(phase, PRINCESS_GAIT) : { x: side === 'front' ? 2 : -2, lift: 0 };
    const pitch = walking ? walkingFootPitch(phase, PRINCESS_GAIT.support, false) : 0;
    const radians = pitch * Math.PI / 180;
    const soleX = princessSole.x * Math.cos(radians) - princessSole.y * Math.sin(radians);
    const soleY = princessSole.x * Math.sin(radians) + princessSole.y * Math.cos(radians);
    const leg = animalLeg(foot.x + princessSole.x - soleX, PRINCESS_GAIT.groundY - soleY - rig.y - foot.lift, rig);
    pose[`${side as 'front' | 'back'}-thigh`] = leg.hip;
    pose[`${side as 'front' | 'back'}-shin`] = leg.knee;
    pose[`${side as 'front' | 'back'}-foot`] = leg.ankle + pitch;
  }
  if (walking) for (const side of ['front', 'back'] as const) {
    // Positive shoulder rotation swings backward when this leg leads; the elbow flexes more on the forward return.
    const foot = animalFoot(cycle + (side === 'back' ? .5 : 0), PRINCESS_GAIT);
    const reach = foot.x / (PRINCESS_GAIT.travel * PRINCESS_GAIT.support / 2);
    pose[`${side}-arm`] = 4 + reach * 18;
    pose[`${side}-elbow`] = -14 - 8 * smoothstep((1 - reach) / 2);
  }
  pose.head = walking ? Math.sin(cycle * Math.PI * 2) * .7 : 0;
  pose.hair = walking ? Math.sin(cycle * Math.PI * 2 - .9) * 1.2 : 0;
  pose.skirt = walking ? Math.sin(cycle * Math.PI * 2 - .3) * 1.2 : 0;
  if (!reduced && (action === 'jump' || action === 'land')) {
    const amount = Math.sin(Math.PI * Math.min(1, Math.max(0, elapsed) / (action === 'jump' ? 600 : 400)));
    pose['front-arm'] = 4 - amount * 140; pose['back-arm'] = 4 + amount * 132;
    pose['front-elbow'] = -18 - amount * 16; pose['back-elbow'] = -18 + amount * 36;
  }
  if (!reduced && action === 'celebrate') {
    const raise = smoothstep(elapsed / 500);
    pose['front-arm'] = 4 + (-140 + Math.sin(elapsed / 260) * 2) * raise;
    pose['front-elbow'] = -18 + (-30 + Math.sin(elapsed / 170) * 9) * raise;
    pose['back-arm'] = 4 + raise * 7;
    pose.head = Math.sin(elapsed / 430) * 1.3 * raise;
    pose.hair = Math.sin(elapsed / 520 - .6) * .8 * raise;
  }
  return pose;
}

export function settlePrincessPose(gait: number, elapsed: number, reduced = false) {
  const from = princessPose('walk', gait, reduced), to = princessPose('idle', 0, reduced), blend = smoothstep(elapsed / 350);
  for (const name of Object.keys(to) as (keyof CharacterPose)[]) to[name] = from[name] + (to[name] - from[name]) * blend;
  return to;
}
