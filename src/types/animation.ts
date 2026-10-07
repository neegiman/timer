export type AnimationPhase = 'READY' | 'INTRO' | 'START' | 'WALK' | 'REST' | 'REACTION' | 'MID_EVENT' | 'FAST_WALK' | 'LOOK_FINISH' | 'RUN_START' | 'RUN' | 'COUNTDOWN' | 'SPRINT' | 'CROSS_FINISH' | 'OVERSHOOT' | 'BRAKE' | 'TURN' | 'JUMP' | 'LAND' | 'CELEBRATE';
export type CharacterAction = 'idle' | 'appear' | 'start' | 'walk' | 'fastWalk' | 'look' | 'hop' | 'run' | 'sprint' | 'brake' | 'turn' | 'jump' | 'land' | 'celebrate';
export type AnimationSound = 'start' | 'almost' | 'finish' | 'success' | 'midpoint' | 'sparkle' | 'tick' | 'strong-tick' | 'whoosh' | 'pop' | 'land';
export type MotionEasing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';

/** All time values use milliseconds. The animation never owns or extends the timer. */
export interface AnimationInput {
  totalDuration: number;
  remainingTime: number;
  progress: number;
  isPaused: boolean;
  isFinished: boolean;
  hasStarted: boolean;
  finishElapsedMs: number;
}

export interface AnimationState {
  phase: AnimationPhase;
  phaseKey: string;
  targetPosition: number;
  position: number;
  characterAction: CharacterAction;
  actionElapsedMs: number;
  phaseElapsedMs: number;
  speed: number;
  easing: MotionEasing;
  message: string;
  sound?: AnimationSound;
  soundKey?: string;
  countdownNumber?: number;
  backgroundMode: 'idle' | 'normal' | 'moving' | 'fast' | 'celebration';
}
