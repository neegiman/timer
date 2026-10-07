import { getAnimationState } from '@/lib/animation';
import type { TimerSession, TimerStatus } from '@/types/timer';
import type { AnimationInput } from '@/types/animation';

export function useAnimationController(timer: { session: TimerSession | null; status: TimerStatus; remaining: number; progress: number; now: number }) {
  const input: AnimationInput = {
    totalDuration: timer.session?.durationMs ?? 600_000,
    remainingTime: timer.remaining,
    progress: timer.progress,
    isPaused: timer.status === 'paused',
    isFinished: timer.status === 'arriving' || timer.status === 'completed',
    hasStarted: timer.session !== null,
    finishElapsedMs: timer.session?.arrivalTimestamp == null ? 0 : Math.max(0, timer.now - timer.session.arrivalTimestamp),
  };
  return { input, state: getAnimationState(input), sampledAt: timer.now };
}
