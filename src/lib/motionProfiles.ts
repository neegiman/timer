import { animalProfiles } from './animalMotion';
import { PRINCESS_GAIT } from './princessMotion';
/** Profiles share the same timer progress; each gait keeps feet on its ground baseline. */
export const motionProfiles = {
  princess: { kind: 'human', cycleMs: PRINCESS_GAIT.cycleMs, groundY: PRINCESS_GAIT.groundY },
  rabbit: { kind: 'animal', cycleMs: animalProfiles.rabbit.cycleMs, groundY: 205 },
  chick: { kind: 'animal', cycleMs: animalProfiles.chick.cycleMs, groundY: 205 },
  dog: { kind: 'animal', cycleMs: animalProfiles.dog.cycleMs, groundY: 205 },
  cat: { kind: 'animal', cycleMs: animalProfiles.cat.cycleMs, groundY: 205 },
  car: { kind: 'vehicle', cycleMs: 900, groundY: 197 },
  train: { kind: 'vehicle', cycleMs: 1000, groundY: 197 },
  rocket: { kind: 'flying', cycleMs: 1200, groundY: 210 },
} as const;
export function motionProfile(id: string) { return motionProfiles[id as keyof typeof motionProfiles] ?? motionProfiles.rabbit; }
