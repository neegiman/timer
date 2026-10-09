import { animalProfiles } from './animalMotion';
import { PRINCESS_GAIT } from './princessMotion';
import { PRINCE_GAIT } from './princeMotion';
import { vehicleMotion } from './pixelVehicles';
/** Profiles share the same timer progress; each gait keeps feet on its ground baseline. */
export const motionProfiles = {
  prince: { kind: 'human', cycleMs: PRINCE_GAIT.cycleMs, groundY: PRINCE_GAIT.groundY },
  princess: { kind: 'human', cycleMs: PRINCESS_GAIT.cycleMs, groundY: PRINCESS_GAIT.groundY },
  rabbit: { kind: 'animal', cycleMs: animalProfiles.rabbit.cycleMs, groundY: 205 },
  chick: { kind: 'animal', cycleMs: animalProfiles.chick.cycleMs, groundY: 205 },
  dog: { kind: 'animal', cycleMs: animalProfiles.dog.cycleMs, groundY: 205 },
  cat: { kind: 'animal', cycleMs: animalProfiles.cat.cycleMs, groundY: 205 },
  car: { kind: 'vehicle', ...vehicleMotion.car },
  train: { kind: 'vehicle', ...vehicleMotion.train },
  rocket: { kind: 'flying', ...vehicleMotion.rocket },
} as const;
export function motionProfile(id: string) { return motionProfiles[id as keyof typeof motionProfiles] ?? motionProfiles.rabbit; }
