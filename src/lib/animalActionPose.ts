import { animalPose, animalProfiles, type AnimalId, type AnimalJoint, type PawName } from './animalMotion';
import { smoothstep } from './journey';
import type { CharacterAction } from '../types/animation';

export const isAnimalId = (id: string): id is AnimalId => Object.hasOwn(animalProfiles, id);

/** Animal body/joints use the journey clock; the outer wrapper owns celebration jumps. */
export function animalActionPose(id: AnimalId, action: CharacterAction, elapsed: number, reduced = false) {
  const walking = ['walk', 'fastWalk', 'run', 'sprint'].includes(action);
  const pose = animalPose(id, elapsed, walking && !reduced);
  if (reduced || walking) return pose;
  if (action === 'jump' || action === 'land') {
    const duration = action === 'jump' ? 600 : 400;
    const amount = Math.sin(Math.PI * Math.max(0, Math.min(1, elapsed / duration)));
    for (const paw of Object.keys(animalProfiles[id].paws) as PawName[]) {
      pose.joints[`${paw}Hip`] += amount * (paw.includes('Hind') ? 7 : -5);
      pose.joints[`${paw}Knee`] += amount * (paw.includes('Hind') ? 10 : -8);
      pose.joints[`${paw}Ankle`] = -pose.joints[`${paw}Hip`] - pose.joints[`${paw}Knee`];
    }
    pose.joints.earNear = -amount * 8; pose.joints.earFar = -amount * 6;
  }
  if (action === 'celebrate') {
    pose.joints.head = Math.sin(elapsed / 430) * 2;
    pose.joints.tail = Math.sin(elapsed / 190) * (id === 'dog' ? 12 : id === 'cat' ? 5 : 2);
    pose.joints.earNear = Math.sin(elapsed / 360) * 3;
    pose.joints.wing = id === 'chick' ? Math.sin(elapsed / 200) * 9 : 0;
  }
  return pose;
}

export function settleAnimalPose(id: AnimalId, gait: number, elapsed: number, reduced = false) {
  const from = animalPose(id, gait, !reduced), to = animalActionPose(id, 'idle', 0, reduced), blend = smoothstep(elapsed / 350);
  for (const name of Object.keys(to.joints) as AnimalJoint[]) to.joints[name] = from.joints[name] + (to.joints[name] - from.joints[name]) * blend;
  to.bob = from.bob * (1 - blend);
  return to;
}
