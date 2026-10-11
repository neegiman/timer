import type { AnimationInput, AnimationState, JourneyStage } from '../types/animation';

export const JOURNEY_MESSAGES: Record<JourneyStage, string> = {
  beginning: '즐겁게 걸어가 볼까? 🌈',
  halfway: '벌써 반이나 왔어! 반만 더 가면 돼! 🌟',
  near: '거의 다 왔어! 이제 곧 약속 시간이야! 🏁',
  arrived: '', // The UI displays the selected activity action instead of a generic finish message.
};
export const FINISH_SEQUENCE = [
  { phase: 'CROSS_FINISH', duration: 1600, action: 'walk' },
  { phase: 'BRAKE', duration: 400, action: 'walk' },
  { phase: 'SETTLE', duration: 350, action: 'idle' },
  { phase: 'JUMP', duration: 600, action: 'jump' },
  { phase: 'LAND', duration: 400, action: 'land' },
  { phase: 'CELEBRATE', duration: 1400, action: 'celebrate' },
] as const;
export const FINISH_DURATION_MS = FINISH_SEQUENCE.reduce((total, step) => total + step.duration, 0);
export const CROSSING_DURATION_MS = FINISH_SEQUENCE[0].duration + FINISH_SEQUENCE[1].duration;
export function finishPhaseStart(phase: typeof FINISH_SEQUENCE[number]['phase']) {
  let elapsed = 0;
  for (const step of FINISH_SEQUENCE) { if (step.phase === phase) return elapsed; elapsed += step.duration; }
  return elapsed;
}
export const journeyStage = (progress: number): JourneyStage => progress >= 1 ? 'arrived' : progress >= .9 ? 'near' : progress >= .5 ? 'halfway' : 'beginning';

export function getFinishAnimationState(elapsed: number): AnimationState {
  let start = 0;
  for (const step of FINISH_SEQUENCE) {
    if (elapsed < start + step.duration || step.phase === 'CELEBRATE') {
      return { phase: step.phase, phaseKey: step.phase, position: 1, characterAction: step.action,
        actionElapsedMs: Math.max(0, elapsed - start), speed: 1, messageStage: 'arrived', message: JOURNEY_MESSAGES.arrived,
        backgroundMode: 'celebration', ...(step.phase === 'CELEBRATE' ? { sound: 'finish', soundKey: 'finish' } as const : {}) };
    }
    start += step.duration;
  }
  throw new Error('Finish sequence must end in CELEBRATE');
}

/** Timing stays in the timer engine. Message milestones never reset the continuous gait clock. */
export function getAnimationState(input: AnimationInput): AnimationState {
  const total = Math.max(60_000, input.totalDuration);
  const remaining = Math.max(0, Math.min(total, input.remainingTime));
  if (input.hasStarted && (input.isFinished || (remaining === 0 && !input.isAdjusting))) return getFinishAnimationState(Math.max(0, input.finishElapsedMs));
  const elapsed = input.hasStarted ? total - remaining : 0;
  const position = input.hasStarted ? elapsed / total : 0;
  const messageStage = journeyStage(input.isAdjusting ? Math.min(position, .999999) : position);
  return { phase: input.hasStarted ? 'WALK' : 'READY', phaseKey: input.hasStarted ? 'walking' : 'ready',
    position, characterAction: input.hasStarted ? 'walk' : 'idle', actionElapsedMs: elapsed, speed: 1,
    messageStage, message: JOURNEY_MESSAGES[messageStage], backgroundMode: input.hasStarted ? 'moving' : 'idle',
    ...(!input.isAdjusting && input.hasStarted && elapsed < 800 ? { sound: 'start', soundKey: 'start' } as const : {}),
    ...(!input.isAdjusting && messageStage === 'halfway' ? { sound: 'midpoint', soundKey: 'midpoint' } as const : {}),
    ...(!input.isAdjusting && messageStage === 'near' ? { sound: 'sparkle', soundKey: 'finish-recognition' } as const : {}),
  };
}
