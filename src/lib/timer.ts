import type { TimerSession, TodayStars } from '@/types/timer';
import { isPromise } from './promises';
import { FINISH_DURATION_MS } from './animation';
import { getCharacter } from './characters';

export const ARRIVAL_DURATION_MS = FINISH_DURATION_MS;

export function timerProgress(session: TimerSession, now: number) {
  const remaining = session.status === 'paused'
    ? session.pausedRemainingMs
    : session.status === 'arriving' || session.status === 'completed'
      ? 0 : Math.max(0, session.targetTimestamp - now);
  const progress = Math.min(1, Math.max(0, 1 - remaining / session.durationMs));
  return { remaining, progress };
}

export function pauseSession(session: TimerSession, now: number): TimerSession {
  if (session.status !== 'running') return session;
  const remaining = Math.max(0, session.targetTimestamp - now);
  if (remaining === 0) return arriveSession(session, now);
  return { ...session, status: 'paused', pausedRemainingMs: remaining };
}

export function resumeSession(session: TimerSession, now: number): TimerSession {
  if (session.status !== 'paused') return session;
  const targetTimestamp = now + session.pausedRemainingMs;
  return { ...session, status: 'running', targetTimestamp,
    startTimestamp: targetTimestamp - session.durationMs };
}

/** Seeking changes the deadline, never the chosen total duration or reward ID. */
export function seekSession(session: TimerSession, progress: number, now: number): TimerSession {
  if (!['running', 'paused'].includes(session.status) || !Number.isFinite(progress) || !Number.isFinite(now)) return session;
  const remaining = Math.round(session.durationMs * (1 - Math.min(1, Math.max(0, progress))) / 1000) * 1000;
  const targetTimestamp = now + remaining;
  return { ...session, targetTimestamp, startTimestamp: targetTimestamp - session.durationMs,
    pausedRemainingMs: remaining, status: remaining === 0 ? 'arriving' : session.status,
    arrivalTimestamp: remaining === 0 ? now : null };
}

export function arriveSession(session: TimerSession, now: number): TimerSession {
  if (session.status !== 'running') return session;
  return { ...session, status: 'arriving', arrivalTimestamp: now, pausedRemainingMs: 0 };
}

export function advanceSession(session: TimerSession, now: number): TimerSession {
  const characterId = getCharacter(session.characterId).id;
  if (characterId !== session.characterId) session = { ...session, characterId };
  if (session.status === 'running' && now >= session.targetTimestamp) return arriveSession(session, now);
  if (session.status === 'arriving' && now >= (session.arrivalTimestamp ?? now) + ARRIVAL_DURATION_MS) {
    return { ...session, status: 'completed' };
  }
  return session;
}

export function formatRemaining(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function awardStar(stars: TodayStars, sessionId: string, date: string): TodayStars {
  // Keep a bounded set of claim IDs across midnight so a restored session cannot earn twice.
  if (stars.awardedSessions.includes(sessionId)) return stars;
  return { date, count: (stars.date === date ? stars.count : 0) + 1,
    awardedSessions: [...stars.awardedSessions.slice(-199), sessionId] };
}

export function isSession(value: unknown): value is TimerSession | null {
  if (value === null) return true;
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<TimerSession>;
  return typeof s.id === 'string' &&
    ['running', 'paused', 'arriving', 'completed'].includes(s.status ?? '') &&
    typeof s.durationMs === 'number' && s.durationMs >= 60_000 && s.durationMs <= 7_200_000 &&
    typeof s.startTimestamp === 'number' && Number.isFinite(s.startTimestamp) &&
    typeof s.targetTimestamp === 'number' && Number.isFinite(s.targetTimestamp) &&
    typeof s.pausedRemainingMs === 'number' && s.pausedRemainingMs >= 0 && s.pausedRemainingMs <= s.durationMs &&
    (s.arrivalTimestamp === null || (typeof s.arrivalTimestamp === 'number' && Number.isFinite(s.arrivalTimestamp))) &&
    typeof s.characterId === 'string' && isPromise(s.promise) &&
    (s.mode === undefined || s.mode === 'after' || s.mode === 'during');
}
