export type TimerStatus = 'setup' | 'ready' | 'running' | 'paused' | 'arriving' | 'completed';

export interface Character {
  id: string;
  name: string;
  icon: string;
  type: 'emoji' | 'image' | 'illustration';
  src?: string;
}

export interface PromiseActivity {
  id: string;
  icon: string;
  name: string;
  activity: string;
}

export interface TimerSession {
  id: string;
  status: 'running' | 'paused' | 'arriving' | 'completed';
  durationMs: number;
  startTimestamp: number;
  targetTimestamp: number;
  pausedRemainingMs: number;
  arrivalTimestamp: number | null;
  characterId: string;
  promise: PromiseActivity;
}

export interface TodayStars {
  date: string;
  count: number;
  awardedSessions: string[];
}
