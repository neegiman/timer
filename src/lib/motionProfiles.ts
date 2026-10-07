/** Profiles affect pose and gait; timer duration and route anchors stay identical. */
export const motionProfiles = {
  rabbit: { kind: 'animal', cycleMs: 780, bounce: 4, lean: 5 },
  bear: { kind: 'animal', cycleMs: 1000, bounce: 3, lean: 3 },
  chick: { kind: 'animal', cycleMs: 640, bounce: 4, lean: 4 },
  dog: { kind: 'animal', cycleMs: 720, bounce: 4, lean: 5 },
  cat: { kind: 'animal', cycleMs: 850, bounce: 3, lean: 4 },
  car: { kind: 'vehicle', cycleMs: 900, bounce: 1.5, lean: 2 },
  train: { kind: 'vehicle', cycleMs: 1000, bounce: 1, lean: 1 },
  rocket: { kind: 'flying', cycleMs: 1200, bounce: 5, lean: 7 },
} as const;
export function motionProfile(id: string) { return motionProfiles[id as keyof typeof motionProfiles] ?? motionProfiles.rabbit; }
