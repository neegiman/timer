import atlas from './princessAtlas.json';
import { animalFoot, animalLeg, walkingFootPitch } from './animalMotion';
import type { CharacterPose } from './characterPose';
import type { CharacterAction } from '../types/animation';
import { smoothstep } from './journey';

const fitted = (part: 'head' | 'bodice' | 'skirt', x: number, y: number, width: number) =>
  ({ x, y, width, height: width * atlas.parts[part][3] / atlas.parts[part][2] });

export const princessAnatomy = {
  head: fitted('head', 44, 14, 64), headPivot: { x: 80, y: 75 },
  bodice: fitted('bodice', 55, 72, 50),
  skirt: fitted('skirt', 44, 111, 72), skirtPivot: { x: 80, y: 116 },
  legs: { front: { x: 76, y: 147, upper: 24, lower: 25, bend: 1 }, back: { x: 84, y: 147, upper: 24, lower: 25, bend: 1 } },
  thigh: { pivot: { x: 64, y: 28 }, tip: { x: 65, y: 264 } },
  shin: { pivot: { x: 50, y: 24 }, tip: { x: 50, y: 257 } },
  shoe: { pivot: { x: 55, y: 40 }, sole: { x: 155, y: 144 }, width: 22 },
  arms: {
    front: { x: 94, y: 97, upper: 9, lower: 12,
      upperArt: { pivot: { x: 70, y: 20 }, tip: { x: 75, y: 97 } },
      lowerArt: { pivot: { x: 73, y: 24 }, tip: { x: 88, y: 110 } } },
    back: { x: 68, y: 99, upper: 8, lower: 12,
      upperArt: { pivot: { x: 65, y: 20 }, tip: { x: 90, y: 111 } },
      lowerArt: { pivot: { x: 50, y: 30 }, tip: { x: 43, y: 126 } } },
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
    'front-arm': 0, 'front-elbow': -10, 'back-arm': 0, 'back-elbow': -10,
    head: 0, skirt: 0, 'ear-front': 0, 'ear-back': 0, tail: 0, 'wheel-front': 0, 'wheel-back': 0, 'wheel-middle': 0,
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
  const swing = Math.cos(cycle * Math.PI * 2);
  pose['front-arm'] = walking ? swing * 16 : -8;
  pose['back-arm'] = walking ? -swing * 16 : 8;
  pose.head = walking ? Math.sin(cycle * Math.PI * 2) * .7 : 0;
  pose.skirt = walking ? Math.sin(cycle * Math.PI * 2 - .3) * 1.2 : 0;
  if (!reduced && (action === 'jump' || action === 'land')) {
    const amount = Math.sin(Math.PI * Math.min(1, Math.max(0, elapsed) / (action === 'jump' ? 600 : 400)));
    pose['front-arm'] = -8 - amount * 112; pose['back-arm'] = 8 + amount * 105;
  }
  if (!reduced && action === 'celebrate') {
    pose['front-arm'] = -115 + Math.sin(elapsed / 200) * 12;
    pose['front-elbow'] = -18; pose.head = Math.sin(elapsed / 430) * 1.3;
  }
  return pose;
}

export function settlePrincessPose(gait: number, elapsed: number, reduced = false) {
  const from = princessPose('walk', gait, reduced), to = princessPose('idle', 0, reduced), blend = smoothstep(elapsed / 350);
  for (const name of Object.keys(to) as (keyof CharacterPose)[]) to[name] = from[name] + (to[name] - from[name]) * blend;
  return to;
}
