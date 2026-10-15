'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { assetPath } from '@/lib/assetPath';
import type { AnimationSound } from '@/types/animation';
import type { TimerStatus } from '@/types/timer';
import { BACKGROUND_MUSIC, BackgroundMusic } from '@/lib/backgroundMusic';

type Sound = AnimationSound | typeof BACKGROUND_MUSIC.name;
interface MusicRequest { enabled: boolean; sessionId: string | null; status: TimerStatus; deadline: number }
type SafariWindow = Window & { webkitAudioContext?: typeof AudioContext };
const SOUND_CLAIMS_KEY = 'promise-journey:v1:soundClaims';
function savedClaims(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SOUND_CLAIMS_KEY) ?? '[]');
    return Array.isArray(value) && value.every((key) => typeof key === 'string') ? value : [];
  } catch { return []; }
}

export function useAudio(enabled: boolean, musicRequest: MusicRequest) {
  const context = useRef<AudioContext | null>(null);
  const buffers = useRef(new Map<Sound, Promise<AudioBuffer>>());
  const sources = useRef(new Set<AudioBufferSourceNode>());
  const played = useRef(new Set<string>());
  const pending = useRef<{ sound: Sound; key: string } | null>(null);
  const generation = useRef(0);
  const enabledRef = useRef(enabled);
  const music = useRef<BackgroundMusic | null>(null);
  const musicRequestRef = useRef(musicRequest);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [musicUnavailable, setMusicUnavailable] = useState(false);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  const load = useCallback((name: Sound, ctx: AudioContext) => {
    let promise = buffers.current.get(name);
    if (!promise) {
      promise = fetch(assetPath(`/sounds/${name}.mp3`))
        .then((response) => { if (!response.ok) throw new Error('Audio unavailable'); return response.arrayBuffer(); })
        .then((bytes) => ctx.decodeAudioData(bytes));
      buffers.current.set(name, promise);
      promise.catch(() => { if (buffers.current.get(name) === promise) buffers.current.delete(name); });
    }
    return promise;
  }, []);

  const syncMusic = useCallback(() => {
    const request = musicRequestRef.current, ctx = context.current;
    const playing = enabledRef.current && request.enabled && request.status === 'running'
      && Date.now() < request.deadline && document.visibilityState === 'visible';
    if (playing && (!ctx || ctx.state !== 'running')) {
      music.current?.pause(); setNeedsGesture(true); return;
    }
    music.current?.sync(request.sessionId, playing, request.status === 'arriving' ? BACKGROUND_MUSIC.fadeOut : .08);
  }, []);
  const { enabled: musicEnabled, sessionId: musicSessionId, status: musicStatus, deadline: musicDeadline } = musicRequest;
  useEffect(() => {
    musicRequestRef.current = { enabled: musicEnabled, sessionId: musicSessionId, status: musicStatus, deadline: musicDeadline };
    syncMusic();
  }, [musicEnabled, musicSessionId, musicStatus, musicDeadline, enabled, syncMusic]);

  const play = useCallback(async (name: Sound, key: string) => {
    const ctx = context.current;
    if (!enabledRef.current) return;
    if (!ctx) {
      pending.current = { sound: name, key };
      setNeedsGesture(true);
      return;
    }
    const epoch = generation.current;
    try {
      const buffer = await load(name, ctx);
      if (epoch !== generation.current || !enabledRef.current) return;
      if (ctx.state !== 'running') {
        pending.current = { sound: name, key };
        setNeedsGesture(true);
        return;
      }
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = 0.55;
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(ctx.destination);
      sources.current.add(source);
      source.onended = () => { sources.current.delete(source); gain.disconnect(); source.disconnect(); };
      source.start();
      try { localStorage.setItem(SOUND_CLAIMS_KEY, JSON.stringify([...savedClaims().slice(-99), key])); } catch {}
      setNeedsGesture(false);
    } catch { pending.current = { sound: name, key }; setNeedsGesture(true); }
  }, [load]);

  // Called synchronously from an explicit button tap: crucial for mobile Safari.
  const unlock = useCallback(() => {
    enabledRef.current = true;
    try {
      const AudioContextClass = window.AudioContext ?? (window as SafariWindow).webkitAudioContext;
      if (!AudioContextClass) { setNeedsGesture(true); return; }
      if (!context.current || context.current.state === 'closed') {
        music.current?.dispose();
        context.current = new AudioContextClass();
        buffers.current.clear();
        const ctx = context.current;
        music.current = new BackgroundMusic(ctx, () => load(BACKGROUND_MUSIC.name, ctx), locked => {
          if (locked) setNeedsGesture(true); else setMusicUnavailable(true);
        });
        ctx.onstatechange = syncMusic;
      }
      const ctx = context.current;
      // Observe rejection before priming: creating/starting the silent source can
      // also fail after mobile audio interruption. Neither may block timer controls.
      void Promise.resolve(ctx.resume()).then(() => {
        if (ctx.state !== 'running') { setNeedsGesture(true); return; }
        setNeedsGesture(false);
        if (pending.current) { const { sound, key } = pending.current; pending.current = null; void play(sound, key); }
        setMusicUnavailable(false);
        syncMusic();
      }).catch(() => setNeedsGesture(true));
      // Prime the output within the gesture, even while MP3 decoding is still pending.
      const silence = ctx.createBufferSource();
      silence.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      silence.connect(ctx.destination);
      silence.start();
      for (const sound of ['start', 'almost', 'finish', 'success', 'midpoint', 'sparkle', 'tick', 'strong-tick', 'whoosh', 'pop', 'land'] as Sound[]) void load(sound, ctx).catch(() => {});
    } catch {
      // Audio output is optional. Keep the timer action responsive and offer retry.
      setNeedsGesture(true);
    }
  }, [load, play, syncMusic]);

  const playOnce = useCallback((sound: Sound, key: string) => {
    if (played.current.has(key) || savedClaims().includes(key)) return;
    played.current.add(key);
    if (played.current.size > 200) played.current.delete(played.current.values().next().value!);
    if (enabledRef.current) void play(sound, key);
  }, [play]);

  const stop = useCallback(() => {
    generation.current++;
    pending.current = null;
    music.current?.pause();
    for (const source of sources.current) { try { source.stop(); } catch { /* Already ended. */ } }
    sources.current.clear();
    setNeedsGesture(false);
  }, []);

  useEffect(() => {
    const onVisible = () => {
      const ctx = context.current;
      if (document.visibilityState !== 'visible') { music.current?.pause(); return; }
      if (document.visibilityState === 'visible' && ctx && ctx.state !== 'running' && enabledRef.current) {
        void ctx.resume().then(() => {
          if (pending.current) { const { sound, key } = pending.current; pending.current = null; void play(sound, key); }
          syncMusic();
        }).catch(() => setNeedsGesture(true));
      } else syncMusic();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [play, syncMusic]);

  useEffect(() => {
    if (!enabled) {
      generation.current++;
      pending.current = null;
      for (const source of sources.current) { try { source.stop(); } catch {} }
      sources.current.clear();
      music.current?.pause();
    }
  }, [enabled]);

  useEffect(() => {
    const currentSources = sources.current;
    const lifecycle = generation;
    return () => {
      lifecycle.current++;
      for (const source of currentSources) { try { source.stop(); } catch {} }
      music.current?.dispose();
      if (context.current) context.current.onstatechange = null;
      void context.current?.close();
    };
  }, []);

  return { unlock, playOnce, stop, needsGesture, musicUnavailable };
}
