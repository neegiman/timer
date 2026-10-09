export const TILE_WIDTH = 480;
export const SUPPORT_FRACTION = .58;
export const WALK_STRIDE = 12;
export const MOTION_RAMP_MS = 800;
export const clamp = (value: number, low = 0, high = 1) => Math.max(low, Math.min(high, value));
export const smoothstep = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };
const rampIntegral = (value: number) => { const t = clamp(value); return t ** 3 - t ** 4 / 2; };

/** Integrated walking velocity: gentle start/stop, no independent frame counter or phase resets. */
export function locomotionTime(elapsed: number, total: number) {
  const t = clamp(elapsed, 0, total);
  const ramp = Math.min(MOTION_RAMP_MS, total / 2);
  const starting = t < ramp ? ramp * rampIntegral(t / ramp) : t - ramp / 2;
  return Math.max(0, starting - ramp * rampIntegral((t - (total - ramp)) / ramp));
}
export const groundDistance = (gaitMs: number, cycleMs: number, stride = WALK_STRIDE) => gaitMs / cycleMs * (2 * stride / SUPPORT_FRACTION);
export const loopOffset = (distance: number, period = TILE_WIDTH) => ((distance % period) + period) % period;

/** A single, non-repeating destination approaches in the final 10%; it cannot arrive early. */
export function finishApproach(progress: number, width: number, actorX: number, actorWidth: number, frontRatio = .35) {
  const fraction = progress >= 1 ? 1 : clamp((progress - .9) / .1);
  const target = actorX + actorWidth * frontRatio;
  const start = Math.max(target + 32, width - 42);
  return { x: fraction === 1 ? target : start + (target - start) * fraction, opacity: progress < .9 ? 0 : .2 + .8 * clamp(fraction / .2), target };
}
