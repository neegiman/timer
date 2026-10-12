import { gaitPixelsPerMs } from './motionProfiles';

// Reserve half an artwork width plus a small proportional clearance. Keeping
// this proportional makes the crossing clock invariant across screen sizes.
export const FINISH_RUNOUT_FRACTION = .55;
export const FINISH_BRAKE_MS = 650;

/** Keep the full artwork moving at its usual cadence until it clears the line.
 * Only the final clearance is used for a short, smooth stop. */
export function finishCrossingTiming(speed: number, runout: number) {
  const clearance = runout * (1 - .5 / FINISH_RUNOUT_FRACTION);
  const brakeMs = Math.min(FINISH_BRAKE_MS, 2 * clearance / speed);
  const cruiseMs = runout / speed - brakeMs / 2;
  return { cruiseMs, brakeMs, durationMs: cruiseMs + brakeMs };
}
export const finishTimingForCharacter = (characterId = 'rabbit') =>
  finishCrossingTiming(gaitPixelsPerMs(characterId), FINISH_RUNOUT_FRACTION * 160);
// UI sampling must not insert a short stop at zero. After a long suspension,
// however, show the arrival sequence once on restoration instead of skipping it.
export const ARRIVAL_CATCHUP_MS = 1000;
export const finishCrossingDuration = (characterId = 'rabbit') =>
  finishTimingForCharacter(characterId).durationMs;
