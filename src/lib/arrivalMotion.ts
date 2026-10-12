import { clamp, locomotionTime, MOTION_RAMP_MS } from './journey';
import { FINISH_RUNOUT_FRACTION, finishCrossingTiming } from './finishTiming';

const rampDistance = (time: number, duration: number) => {
  const t = clamp(time / duration);
  return duration * (t ** 3 - t ** 4 / 2);
};

/** Leave room for the entire character beyond a fixed, responsive finish line. */
export function finishGeometry(width: number, actorWidth: number) {
  const startX = width * .42;
  const lineX = Math.max(startX + 8, Math.min(width * .7, width - actorWidth - 24));
  return { startX, lineX, stopX: lineX + actorWidth * FINISH_RUNOUT_FRACTION };
}

/** Spread the approach over the final tenth instead of waiting until the last
 * few seconds. A short closing ramp transfers the camera's remaining velocity
 * to the character, preserving planted feet and a continuous crossing at zero. */
export function arrivalMotion(elapsed: number, total: number, finishElapsed: number,
  geometry: ReturnType<typeof finishGeometry>, pixelsPerGaitMs: number) {
  const speed = Math.max(.0001, pixelsPerGaitMs);
  const approachLength = geometry.lineX - geometry.startX;
  // A wide, short journey may need an earlier approach to keep its normal gait.
  const approachDuration = Math.max(total * .1, approachLength / speed + MOTION_RAMP_MS);
  const time = clamp(elapsed - (total - approachDuration), 0, approachDuration);
  const openingRamp = Math.min(MOTION_RAMP_MS, approachDuration / 4);
  const closingRamp = Math.min(MOTION_RAMP_MS, approachLength / speed, approachDuration / 4);
  const cruiseSpeed = (approachLength - speed * closingRamp / 2) / (approachDuration - (openingRamp + closingRamp) / 2);
  const opening = time < openingRamp ? rampDistance(time, openingRamp) : time - openingRamp / 2;
  const closing = rampDistance(time - (approachDuration - closingRamp), closingRamp);
  const approach = clamp(cruiseSpeed * opening + (speed - cruiseSpeed) * closing, 0, approachLength);
  // The walking clock keeps its velocity through zero; camera motion has already
  // eased to a stop as the character approaches the line.
  const baseGait = locomotionTime(clamp(elapsed, 0, total), total + MOTION_RAMP_MS);
  const runout = geometry.stopX - geometry.lineX;
  const { cruiseMs, brakeMs, durationMs: crossingDuration } = finishCrossingTiming(speed, runout);
  const u = clamp((finishElapsed - cruiseMs) / brakeMs);
  // Cruise at the existing speed until the entire artwork clears the line,
  // then integrate a brief smooth stop. One clock drives both body and feet;
  // a long full-runout easing made the last steps look like slow motion.
  const crossing = speed * (clamp(finishElapsed, 0, cruiseMs) + brakeMs * (u - u ** 3 + u ** 4 / 2));
  const backgroundDistance = Math.max(0, baseGait * speed - approach);
  // A single landmark is fixed in world space at the timer's end position.
  // Subtract the unwrapped camera distance, never a repeating walk phase or
  // a percentage of viewport width. Its gap closes exactly when time is up.
  const finishWorldX = geometry.startX + locomotionTime(total, total + MOTION_RAMP_MS) * speed;
  const destinationX = Math.max(geometry.lineX, finishWorldX - backgroundDistance);
  return {
    x: geometry.startX + approach + crossing,
    gait: baseGait + crossing / speed,
    backgroundDistance,
    destinationX,
    crossing,
    crossingDuration,
  };
}
