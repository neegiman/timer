import type { CharacterAction } from '@/types/animation';
import { SUPPORT_FRACTION } from './journey';

export type JointName = 'front-thigh' | 'front-shin' | 'front-foot' | 'back-thigh' | 'back-shin' | 'back-foot' |
  'front-arm' | 'front-elbow' | 'back-arm' | 'back-elbow' | 'head' | 'skirt' | 'ear-front' | 'ear-back' | 'tail' | 'wheel-front' | 'wheel-back' | 'wheel-middle';
export type CharacterPose = Record<JointName, number>;
export const LEG_LENGTH = { thigh: 21, shin: 22 };
const degrees = (radians: number) => radians * 180 / Math.PI;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

/** Two-bone IK: a ground-level foot stays level while its hip and knee articulate. */
export function solveLeg(x: number, y: number, toeAngle = 0) {
  const { thigh, shin } = LEG_LENGTH;
  const distance = clamp(Math.hypot(x, y), 1, thigh + shin - .01);
  const hip = degrees(Math.atan2(y, x) - Math.acos(clamp((distance ** 2 + thigh ** 2 - shin ** 2) / (2 * distance * thigh), -1, 1))) - 90;
  const knee = degrees(Math.acos(clamp((distance ** 2 - thigh ** 2 - shin ** 2) / (2 * thigh * shin), -1, 1)));
  return { hip, knee, ankle: toeAngle - hip - knee };
}

/** Contact -> planted support -> toe-off -> lifted swing -> next contact. */
export function footTarget(cycle: number, stride: number, lift: number, ground = 37) {
  const phase = ((cycle % 1) + 1) % 1;
  if (phase < SUPPORT_FRACTION) {
    const support = phase / SUPPORT_FRACTION;
    const toeOff = Math.max(0, (support - .8) / .2);
    return { x: stride * (1 - 2 * support), y: ground - 2 * toeOff, toe: -12 * toeOff, planted: toeOff === 0 };
  }
  const swing = (phase - SUPPORT_FRACTION) / (1 - SUPPORT_FRACTION);
  const smooth = swing * swing * (3 - 2 * swing);
  return { x: stride * (2 * smooth - 1), y: ground - lift * Math.sin(Math.PI * swing), toe: -10 * Math.sin(Math.PI * swing), planted: false };
}

/** Pure pose clock. Pause/restore use the SAME actionElapsedMs; there is no independent gait timer. */
export function getCharacterPose(action: CharacterAction, elapsedMs: number, cycleMs: number, reducedMotion = false, bodyOffset = 0): CharacterPose {
  const time = Math.max(0, elapsedMs);
  const cycle = time / Math.max(100, cycleMs);
  const walking = ['walk', 'fastWalk', 'run', 'sprint'].includes(action) && !reducedMotion;
  const running = action === 'run' || action === 'sprint';
  const stride = action === 'sprint' ? 20 : running ? 18 : action === 'fastWalk' ? 15 : 12;
  const lift = running ? 17 : 8;
  // Counter the tiny body bob so a support foot remains on the exact ground baseline.
  const ground = (running ? 33 : 37) - bodyOffset;
  let front = walking ? footTarget(cycle, stride, lift, ground) : { x: 3, y: 37, toe: 0 };
  let back = walking ? footTarget(cycle + .5, stride, lift, ground) : { x: -4, y: 37, toe: 0 };
  const swing = Math.cos(cycle * Math.PI * 2);
  let frontArm = walking ? swing * (running ? 48 : 25) : -12;
  let backArm = walking ? -swing * (running ? 42 : 22) : 12;
  let elbow = running && walking ? -65 : -16;
  let head = walking ? Math.sin(cycle * Math.PI * 2) * 1.5 : 0;
  let ear = walking ? Math.sin(cycle * Math.PI * 2 - .5) * (running ? 8 : 4) : 0;
  if (!reducedMotion && action === 'start') {
    const anticipation = Math.sin(Math.PI * clamp(time / 1000, 0, 1));
    front = { x: 6, y: 37 - anticipation * 6, toe: 0 };
    back = { x: -6, y: 37 - anticipation * 5, toe: 0 };
    frontArm = 20 * anticipation; backArm = -25 * anticipation; head = 3 * anticipation; ear = -7 * anticipation;
  }
  if (action === 'look' || action === 'turn') {
    const amount = clamp(time / 500, 0, 1);
    head = (action === 'look' ? 5 : -8) * amount;
    frontArm = action === 'look' ? -50 * amount : -12;
    ear = -5 * amount;
  }
  if (!reducedMotion && (action === 'hop' || action === 'jump')) {
    const duration = action === 'jump' ? 600 : 800;
    const airborne = Math.sin(Math.PI * clamp(time / duration, 0, 1));
    front = { x: 5, y: 37 - airborne * 12, toe: -8 * airborne };
    back = { x: -5, y: 37 - airborne * 10, toe: -8 * airborne };
    frontArm = -12 - airborne * 132; backArm = 12 + airborne * 126; elbow = -8;
    ear = -8 * airborne;
  }
  if (!reducedMotion && (action === 'land' || action === 'brake')) {
    const compression = Math.sin(Math.PI * clamp(time / (action === 'land' ? 400 : 450), 0, 1));
    front = { x: 7, y: 37 - compression * 6, toe: 0 };
    back = { x: -7, y: 37 - compression * 5, toe: 0 };
    frontArm = -12 - compression * 35; backArm = 12 + compression * 30;
    ear = compression * 6;
  }
  if (action === 'celebrate' && !reducedMotion) {
    frontArm = -125 + Math.sin(time / 180) * 18; backArm = -35; elbow = -25;
    head = Math.sin(time / 400) * 2; ear = Math.sin(time / 450) * 3;
  }
  const near = solveLeg(front.x, front.y, front.toe);
  const far = solveLeg(back.x, back.y, back.toe);
  const wheel = walking ? (cycle % 1) * 360 : 0;
  return {
    'front-thigh': near.hip, 'front-shin': near.knee, 'front-foot': near.ankle,
    'back-thigh': far.hip, 'back-shin': far.knee, 'back-foot': far.ankle,
    'front-arm': frontArm, 'front-elbow': elbow, 'back-arm': backArm, 'back-elbow': elbow,
    head, skirt: 0, 'ear-front': ear, 'ear-back': ear * .8, tail: walking ? -swing * 7 : 0,
    'wheel-front': wheel, 'wheel-back': wheel, 'wheel-middle': wheel,
  };
}
