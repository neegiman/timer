'use client';

import { useEffect, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { advanceSession, isSession, pauseSession, resumeSession, timerProgress } from '@/lib/timer';
import type { PromiseActivity, TimerMode, TimerSession, TimerStatus } from '@/types/timer';

export function useVisualTimer(ready: boolean) {
  const [session, setSession] = useLocalStorage<TimerSession | null>('activeSession', null, isSession);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const tick = () => {
      const timestamp = Date.now();
      setNow(timestamp);
      setSession((current) => current ? advanceSession(current, timestamp) : null);
    };
    // First tick also reconciles a persisted timer after a refresh.
    const first = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 250);
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', tick);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', tick);
    };
  }, [setSession]);

  const start = (minutes: number, characterId: string, promise: PromiseActivity, mode: TimerMode = 'after'): string => {
    const startTimestamp = Date.now();
    const id = crypto.randomUUID();
    setNow(startTimestamp);
    setSession({ id, status: 'running', durationMs: minutes * 60_000, startTimestamp,
      targetTimestamp: startTimestamp + minutes * 60_000, pausedRemainingMs: minutes * 60_000,
      arrivalTimestamp: null, characterId, promise, mode });
    return id;
  };

  const pause = () => {
    const timestamp = Date.now();
    setNow(timestamp);
    setSession((current) => current ? pauseSession(current, timestamp) : null);
  };
  const resume = () => {
    // Sample the clock in the same update as the shifted deadline. Otherwise the
    // old UI sample can briefly send the journey back across a message milestone.
    const timestamp = Date.now();
    setNow(timestamp);
    setSession((current) => current ? resumeSession(current, timestamp) : null);
  };
  const exit = () => setSession(null);
  const restart = () => session ? start(session.durationMs / 60_000, session.characterId, session.promise, session.mode ?? 'after') : null;
  const values = session ? timerProgress(session, now || session.startTimestamp) : { remaining: 0, progress: 0 };
  const status: TimerStatus = session?.status ?? (ready ? 'ready' : 'setup');
  return { session, status, now, ...values, start, pause, resume, restart, exit };
}
