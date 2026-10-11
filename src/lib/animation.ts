import type { AnimationInput, AnimationState, JourneyStage } from '../types/animation';
import { finishCrossingDuration } from './finishTiming';

export const JOURNEY_MESSAGES: Record<JourneyStage, string> = {
  beginning: '즐겁게 걸어가 볼까? 🌈',
  halfway: '벌써 반이나 왔어! 반만 더 가면 돼! 🌟',
  near: '거의 다 왔어! 이제 곧 약속 시간이야! 🏁',
  arrived: '', // The UI displays the selected activity action instead of a generic finish message.
};
export const CROSSING_DURATION_MS = finishCrossingDuration();
export const FINISH_SEQUENCE = [
  { phase: 'CROSS_FINISH', duration: CROSSING_DURATION_MS * .8, action: 'walk' },
  { phase: 'BRAKE', duration: CROSSING_DURATION_MS * .2, action: 'walk' },
  { phase: 'SETTLE', duration: 350, action: 'idle' },
  { phase: 'JUMP', duration: 600, action: 'jump' },
  { phase: 'LAND', duration: 400, action: 'land' },
  { phase: 'CELEBRATE', duration: 1400, action: 'celebrate' },
] as const;
export const FINISH_DURATION_MS = FINISH_SEQUENCE.reduce((total, step) => total + step.duration, 0);
const stepDuration = (step: typeof FINISH_SEQUENCE[number], characterId: string) =>
  step.phase === 'CROSS_FINISH' ? finishCrossingDuration(characterId) * .8
    : step.phase === 'BRAKE' ? finishCrossingDuration(characterId) * .2 : step.duration;
export const finishDurationMs = (characterId = 'rabbit') => FINISH_DURATION_MS - CROSSING_DURATION_MS + finishCrossingDuration(characterId);
export function finishPhaseStart(phase: typeof FINISH_SEQUENCE[number]['phase'], characterId = 'rabbit') {
  let elapsed = 0;
  for (const step of FINISH_SEQUENCE) { if (step.phase === phase) return elapsed; elapsed += stepDuration(step, characterId); }
  return elapsed;
}
export const journeyStage = (progress: number): JourneyStage => progress >= 1 ? 'arrived' : progress >= .9 ? 'near' : progress >= .5 ? 'halfway' : 'beginning';

export function getFinishAnimationState(elapsed: number, characterId = 'rabbit'): AnimationState {
  let start = 0;
  for (const step of FINISH_SEQUENCE) {
    const duration = stepDuration(step, characterId);
    if (elapsed + 1e-7 < start + duration || step.phase === 'CELEBRATE') {
      return { phase: step.phase, phaseKey: step.phase, position: 1, characterAction: step.action,
        actionElapsedMs: Math.max(0, elapsed - start), speed: 1, messageStage: 'arrived', message: JOURNEY_MESSAGES.arrived,
        backgroundMode: 'celebration', ...(step.phase === 'CELEBRATE' ? { sound: 'finish', soundKey: 'finish' } as const : {}) };
    }
    start += duration;
  }
  throw new Error('Finish sequence must end in CELEBRATE');
}

/** Timing stays in the timer engine. Message milestones never reset the continuous gait clock. */
export function getAnimationState(input: AnimationInput): AnimationState {
  const total = Math.max(60_000, input.totalDuration);
  const remaining = Math.max(0, Math.min(total, input.remainingTime));
  if (input.hasStarted && (input.isFinished || (remaining === 0 && !input.isAdjusting))) return getFinishAnimationState(Math.max(0, input.finishElapsedMs), input.characterId);
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
