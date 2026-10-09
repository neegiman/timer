import { CROSSING_DURATION_MS } from './animation';
import { clamp, locomotionTime, MOTION_RAMP_MS } from './journey';

/** Leave room for the entire character beyond a fixed, responsive finish line. */
export function finishGeometry(width: number, actorWidth: number) {
  const startX = width * .42;
  const lineX = Math.max(startX + 8, Math.min(width * .7, width - actorWidth - 24));
  return { startX, lineX, stopX: lineX + actorWidth / 2 + 8 };
}

/** A constant world gait is split between the camera and the character's approach.
 * After zero, the camera stops and feet follow the integrated crossing distance.
 * Frame rate never owns time or position. */
export function arrivalMotion(elapsed: number, total: number, finishElapsed: number,
  geometry: ReturnType<typeof finishGeometry>, pixelsPerGaitMs: number) {
  const speed = Math.max(.0001, pixelsPerGaitMs);
  const approachLength = geometry.lineX - geometry.startX;
  const ramp = Math.min(MOTION_RAMP_MS, 2 * approachLength / speed);
  const approachDuration = approachLength / speed + ramp / 2;
  const time = clamp(elapsed - (total - approachDuration), 0, approachDuration);
  const fraction = clamp(time / ramp);
  const integrated = time < ramp ? ramp * (fraction ** 3 - fraction ** 4 / 2) : time - ramp / 2;
  const approach = clamp(speed * integrated, 0, approachLength);
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
