import { animalProfiles } from './animalMotion';
import { PRINCESS_GAIT } from './princessMotion';
import { PRINCE_GAIT } from './princeMotion';
import { vehicleMotion } from './pixelVehicles';
import { PAINTED_PRINCE_GAIT } from './paintedPrinceMotion';
import { groundDistance } from './journey';
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

/** Art-space ground speed, shared by the feet, scenery and finish timing. */
export function gaitPixelsPerMs(id: string) {
  const profile = motionProfile(id);
  const animal = animalProfiles[id as keyof typeof animalProfiles];
  if (animal) return animal.travel / profile.cycleMs;
  if (id === 'prince') return PAINTED_PRINCE_GAIT.travel / profile.cycleMs;
  if (id === 'princess') return PRINCESS_GAIT.travel / profile.cycleMs;
  return groundDistance(1, profile.cycleMs);
}
