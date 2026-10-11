import { gaitPixelsPerMs } from './motionProfiles';

// Reserve half an artwork width plus a small proportional clearance. Keeping
// this proportional makes the crossing clock invariant across screen sizes.
export const FINISH_RUNOUT_FRACTION = .55;
// UI sampling must not insert a short stop at zero. After a long suspension,
// however, show the arrival sequence once on restoration instead of skipping it.
export const ARRIVAL_CATCHUP_MS = 1000;
export const finishCrossingDuration = (characterId = 'rabbit') =>
  2 * FINISH_RUNOUT_FRACTION * 160 / gaitPixelsPerMs(characterId);
