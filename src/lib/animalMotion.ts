import { rabbitAnatomy } from './rabbitAnatomy';

/** Animal-specific motion studies. Illustrative gait rigs, not measured motion-capture data. */
export type AnimalId = 'rabbit' | 'bear' | 'dog' | 'cat' | 'chick';
export type PawName = 'nearHind' | 'farHind' | 'nearFore' | 'farFore';
export type AnimalJoint = `${PawName}Hip` | `${PawName}Knee` | `${PawName}Ankle` | 'head' | 'earNear' | 'earFar' | 'tail' | 'wing';
export interface PawRig { x: number; y: number; upper: number; lower: number; bend: 1 | -1 }
export interface AnimalProfile {
  name: string; cycleMs: number; support: number; travel: number; lift: number;
  phases: Record<PawName, number>; paws: Partial<Record<PawName, PawRig>>;
  description: string; fur: string; light: string; shade: string; line: string;
}
const hind = (x: number, y = 155): PawRig => ({ x, y, upper: 27, lower: 26, bend: 1 });
const fore = (x: number, y = 163): PawRig => ({ x, y, upper: 22, lower: 24, bend: -1 });

export const animalProfiles: Record<AnimalId, AnimalProfile> = {
  rabbit: { name: '토끼', cycleMs: 1250, support: .38, travel: 30, lift: 12,
    phases: { nearHind: .54, farHind: .54, nearFore: 0, farFore: .06 },
    paws: rabbitAnatomy.paws,
    description: '두 뒷발로 밀고, 앞발부터 내려와요. 귀는 조금 늦게 따라 움직여요.',
    fur: '#ede1cd', light: '#fff8ec', shade: '#d6c4ad', line: '#a48d71' },
  bear: { name: '곰', cycleMs: 1800, support: .72, travel: 60, lift: 6,
    phases: { nearHind: 0, nearFore: .75, farHind: .5, farFore: .25 },
    paws: { nearHind: hind(44, 162), farHind: hind(61, 162), nearFore: fore(113, 164), farFore: fore(130, 164) },
    description: '넓은 네 발을 천천히 디디고, 몸의 무게를 부드럽게 옮겨요.',
    fur: '#a87950', light: '#d0a77c', shade: '#825a3d', line: '#745138' },
  dog: { name: '강아지', cycleMs: 1440, support: .68, travel: 72, lift: 9,
    phases: { nearHind: 0, nearFore: .75, farHind: .5, farFore: .25 },
    paws: { nearHind: hind(43, 158), farHind: hind(60, 158), nearFore: fore(109), farFore: fore(126) },
    description: '네 발이 차례대로 땅을 딛어요. 귀와 꼬리도 작은 리듬을 타요.',
    fur: '#ddb787', light: '#f6ddaf', shade: '#bd9465', line: '#a17a53' },
  cat: { name: '고양이', cycleMs: 1900, support: .7, travel: 92, lift: 7,
    phases: { nearHind: 0, nearFore: .75, farHind: .5, farFore: .25 },
    paws: { nearHind: hind(42, 160), farHind: hind(59, 160), nearFore: { ...fore(111), upper: 27, lower: 28 }, farFore: { ...fore(128), upper: 27, lower: 28 } },
    description: '몸은 조용히, 뒷발은 앞발이 디딘 자리로 사뿐히 옮겨요. 꼬리가 균형을 잡아요.',
    fur: '#a7aea0', light: '#d8dbcd', shade: '#808e7e', line: '#727e6b' },
  chick: { name: '병아리', cycleMs: 780, support: .65, travel: 18, lift: 5,
    phases: { nearHind: 0, farHind: .5, nearFore: 0, farFore: 0 },
    paws: { nearHind: { x: 76, y: 176, upper: 13, lower: 17, bend: -1 }, farHind: { x: 91, y: 176, upper: 13, lower: 17, bend: -1 } },
    description: '작은 두 발로 종종 걸어요. 날개는 몸 곁에 두고 머리는 살짝 움직여요.',
    fur: '#efd174', light: '#fff2b5', shade: '#d7b254', line: '#c0a052' },
};
export const animalIds = Object.keys(animalProfiles) as AnimalId[];
export const PAW_BASELINE = 205;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const degrees = (value: number) => value * 180 / Math.PI;
const wrap = (value: number) => ((value % 1) + 1) % 1;
const ease = (value: number) => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };

/** Heel rises over a planted toe, then the paw folds and opens before landing. */
export function rabbitFootPitch(phase: number, support: number, hind: boolean) {
  const p = wrap(phase), push = hind ? 24 : 12, folded = hind ? -22 : -14;
  if (p < support) return push * ease((p / support - .72) / .28);
  const swing = (p - support) / (1 - support);
  return swing < .35 ? push + (folded - push) * ease(swing / .35)
    : folded * (1 - ease((swing - .35) / .65));
}

export function animalFoot(phase: number, profile: AnimalProfile) {
  const p = wrap(phase);
  const stride = profile.travel * profile.support / 2;
  if (p < profile.support) {
    return { x: stride - profile.travel * p, lift: 0, planted: true };
  }
  const swing = (p - profile.support) / (1 - profile.support);
  const smooth = swing * swing * (3 - 2 * swing);
  // The paw retains ground-relative velocity at takeoff and touchdown.
  const tangent = -profile.travel * (1 - profile.support) * (2 * swing ** 3 - 3 * swing ** 2 + swing);
  return { x: stride * (2 * smooth - 1) + tangent, lift: Math.sin(Math.PI * swing) ** 2 * profile.lift, planted: false };
}

export function animalLeg(x: number, y: number, rig: PawRig) {
  const d = clamp(Math.hypot(x, y), Math.abs(rig.upper - rig.lower) + .001, rig.upper + rig.lower - .001);
  const hip = degrees(Math.atan2(y, x) - rig.bend * Math.acos(clamp((d * d + rig.upper ** 2 - rig.lower ** 2) / (2 * d * rig.upper), -1, 1))) - 90;
  const knee = rig.bend * degrees(Math.acos(clamp((d * d - rig.upper ** 2 - rig.lower ** 2) / (2 * rig.upper * rig.lower), -1, 1)));
  return { hip, knee, ankle: -hip - knee };
}

export function animalPose(id: AnimalId, elapsedMs: number, moving = true) {
  const profile = animalProfiles[id];
  const cycle = Math.max(0, elapsedMs) / profile.cycleMs;
  const p = wrap(cycle);
  // Weight rises during hind-paw propulsion, then settles through fore-paw contact.
  const hop = id === 'rabbit' && moving ? 2.4 * (p < .86 ? ease((p - .72) / .14) : 1 - ease((p - .86) / .12)) : 0;
  const bob = !moving ? 0 : id === 'rabbit' ? -hop : Math.sin(cycle * Math.PI * 4) * (id === 'bear' ? .65 : id === 'chick' ? .7 : .25);
  const joints = {} as Record<AnimalJoint, number>;
  const feet = {} as Partial<Record<PawName, { x: number; y: number; planted: boolean; contactX: number; pitch: number }>>;
  for (const [paw, rig] of Object.entries(profile.paws) as [PawName, PawRig][]) {
    const foot = moving ? animalFoot(cycle + profile.phases[paw], profile) : { x: 0, lift: 0, planted: true };
    const pitch = id === 'rabbit' && moving ? rabbitFootPitch(cycle + profile.phases[paw], profile.support, paw.includes('Hind')) : 0;
    const contactX = id === 'rabbit' ? paw.includes('Hind') ? 14 : 7 : 0;
    const angle = pitch * Math.PI / 180;
    const soleX = contactX * Math.cos(angle) - 4 * Math.sin(angle);
    const soleY = contactX * Math.sin(angle) + 4 * Math.cos(angle);
    const y = PAW_BASELINE - soleY - rig.y - bob - foot.lift;
    const solved = animalLeg(foot.x + contactX - soleX, y, rig);
    joints[`${paw}Hip`] = solved.hip; joints[`${paw}Knee`] = solved.knee; joints[`${paw}Ankle`] = solved.ankle + pitch;
    feet[paw] = { x: rig.x + foot.x + contactX, y: PAW_BASELINE - foot.lift, planted: foot.planted, contactX, pitch };
  }
  joints.head = moving ? Math.sin(cycle * Math.PI * 2) * (id === 'chick' ? 2 : .8) : 0;
  joints.earNear = moving ? Math.sin(cycle * Math.PI * 2 - .8) * (id === 'rabbit' ? 4 : id === 'dog' ? 3 : .6) : 0;
  joints.earFar = moving ? Math.sin(cycle * Math.PI * 2 - 1) * (id === 'rabbit' ? 3 : id === 'dog' ? 2.5 : .5) : 0;
  joints.tail = moving ? Math.sin(cycle * Math.PI * 2 - .7) * (id === 'dog' ? 7 : id === 'cat' ? 4 : 1) : 0;
  joints.wing = moving && id === 'chick' ? Math.sin(cycle * Math.PI * 2 - .4) * 1.5 : 0;
  return { joints, feet, bob, ground: moving ? cycle * profile.travel : 0 };
}
