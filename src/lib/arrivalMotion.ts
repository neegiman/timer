import { CROSSING_DURATION_MS } from './animation';
import { clamp, locomotionTime, MOTION_RAMP_MS } from './journey';

const rampDistance = (time: number, duration: number) => {
  const t = clamp(time / duration);
  return duration * (t ** 3 - t ** 4 / 2);
};

/** Leave room for the entire character beyond a fixed, responsive finish line. */
export function finishGeometry(width: number, actorWidth: number) {
  const startX = width * .42;
  const lineX = Math.max(startX + 8, Math.min(width * .7, width - actorWidth - 24));
  return { startX, lineX, stopX: lineX + actorWidth / 2 + 8 };
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
  const u = clamp(finishElapsed / CROSSING_DURATION_MS);
  const tangent = Math.min(speed * CROSSING_DURATION_MS, 2 * runout);
  const crossing = tangent * u + (3 * runout - 2 * tangent) * u ** 2 + (tangent - 2 * runout) * u ** 3;
  return {
    x: geometry.startX + approach + crossing,
    gait: baseGait + crossing / speed,
    backgroundDistance: Math.max(0, baseGait * speed - approach),
    crossing,
  };
}
