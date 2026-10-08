/** Profiles share the same timer progress; each gait keeps feet on its ground baseline. */
export const motionProfiles = {
  rabbit: { kind: 'animal', cycleMs: 780, groundY: 205 },
  bear: { kind: 'animal', cycleMs: 1000, groundY: 205 },
  chick: { kind: 'animal', cycleMs: 640, groundY: 203 },
  dog: { kind: 'animal', cycleMs: 720, groundY: 205 },
  cat: { kind: 'animal', cycleMs: 850, groundY: 205 },
  car: { kind: 'vehicle', cycleMs: 900, groundY: 197 },
  train: { kind: 'vehicle', cycleMs: 1000, groundY: 197 },
  rocket: { kind: 'flying', cycleMs: 1200, groundY: 210 },
} as const;
export function motionProfile(id: string) { return motionProfiles[id as keyof typeof motionProfiles] ?? motionProfiles.rabbit; }
