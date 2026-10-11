export type AnimationPhase = 'READY' | 'WALK' | 'CROSS_FINISH' | 'BRAKE' | 'SETTLE' | 'JUMP' | 'LAND' | 'CELEBRATE';
export type JourneyStage = 'beginning' | 'halfway' | 'near' | 'arrived';
export type CharacterAction = 'idle' | 'appear' | 'start' | 'walk' | 'fastWalk' | 'look' | 'hop' | 'run' | 'sprint' | 'brake' | 'turn' | 'jump' | 'land' | 'celebrate';
export type AnimationSound = 'start' | 'almost' | 'finish' | 'success' | 'midpoint' | 'sparkle' | 'tick' | 'strong-tick' | 'whoosh' | 'pop' | 'land';

/** All time values use milliseconds. The animation never owns or extends the timer. */
export interface AnimationInput {
  totalDuration: number;
  remainingTime: number;
  progress: number;
  isPaused: boolean;
  /** A drag preview must not play milestone sounds or finish before release. */
  isAdjusting?: boolean;
  isFinished: boolean;
  hasStarted: boolean;
  finishElapsedMs: number;
}

export interface AnimationState {
  phase: AnimationPhase;
  phaseKey: string;
  position: number;
  characterAction: CharacterAction;
  actionElapsedMs: number;
  speed: number;
  messageStage: JourneyStage;
  message: string;
  sound?: AnimationSound;
  soundKey?: string;
  backgroundMode: 'idle' | 'normal' | 'moving' | 'fast' | 'celebration';
}
