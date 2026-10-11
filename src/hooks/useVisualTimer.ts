'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { advanceSession, isSession, pauseSession, resumeSession, seekSession, timerProgress } from '@/lib/timer';
import type { PromiseActivity, TimerMode, TimerSession, TimerStatus } from '@/types/timer';

export function useVisualTimer(ready: boolean) {
  const [session, setSession] = useLocalStorage<TimerSession | null>('activeSession', null, isSession);
  const [now, setNow] = useState(0);
  const [adjustment, setAdjustment] = useState<{ id: string; remaining: number } | null>(null);
  const adjusting = useRef<{ id: string; wasRunning: boolean; duration: number; remaining: number } | null>(null);

  const beginAdjustment = () => {
    if (!session || adjusting.current || !['running', 'paused'].includes(session.status)) return false;
    const timestamp = Date.now(), paused = pauseSession(session, timestamp);
    if (paused.status !== 'paused') return false;
    adjusting.current = { id: session.id, wasRunning: session.status === 'running', duration: session.durationMs, remaining: paused.pausedRemainingMs };
    setSession(paused); setNow(timestamp);
    setAdjustment({ id: session.id, remaining: paused.pausedRemainingMs });
    return true;
  };
  const previewAdjustment = useCallback((progress: number) => {
    const current = adjusting.current;
    if (!current || !Number.isFinite(progress)) return;
    current.remaining = Math.round(current.duration * (1 - Math.min(1, Math.max(0, progress))) / 1000) * 1000;
    setAdjustment((previous) => previous?.remaining === current.remaining ? previous : { id: current.id, remaining: current.remaining });
  }, []);
  const endAdjustment = useCallback((commit: boolean) => {
    const pending = adjusting.current;
    if (!pending) return;
    adjusting.current = null;
    const timestamp = Date.now();
    setSession((current) => {
      if (!current || current.id !== pending.id || current.status !== 'paused') return current;
      const updated = commit ? seekSession(current, 1 - pending.remaining / pending.duration, timestamp) : current;
      return pending.wasRunning ? resumeSession(updated, timestamp) : updated;
    });
    setAdjustment(null); setNow(timestamp);
  }, [setSession]);
  const seek = (progress: number) => {
    const timestamp = Date.now();
    setNow(timestamp);
    setSession((current) => current ? seekSession(current, progress, timestamp) : null);
  };

  useEffect(() => {
    const hidden = () => { if (document.hidden) endAdjustment(false); };
    const cancel = () => endAdjustment(false);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', cancel); window.addEventListener('blur', cancel);
    return () => {
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', cancel); window.removeEventListener('blur', cancel);
    };
  }, [endAdjustment]);

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
    adjusting.current = null; setAdjustment(null);
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
  const exit = () => { adjusting.current = null; setAdjustment(null); setSession(null); };
  const restart = () => session ? start(session.durationMs / 60_000, session.characterId, session.promise, session.mode ?? 'after') : null;
  const isAdjusting = adjustment !== null && adjustment.id === session?.id && session.status === 'paused';
  const values = isAdjusting ? { remaining: adjustment.remaining, progress: 1 - adjustment.remaining / session.durationMs }
    : session ? timerProgress(session, now || session.startTimestamp) : { remaining: 0, progress: 0 };
  const status: TimerStatus = session?.status ?? (ready ? 'ready' : 'setup');
  return { session, status, now, ...values, isAdjusting, beginAdjustment, previewAdjustment, endAdjustment, seek, start, pause, resume, restart, exit };
}
