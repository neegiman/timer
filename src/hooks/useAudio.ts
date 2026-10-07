'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { assetPath } from '@/lib/assetPath';
import type { AnimationSound } from '@/types/animation';

type Sound = AnimationSound;
type SafariWindow = Window & { webkitAudioContext?: typeof AudioContext };
const SOUND_CLAIMS_KEY = 'promise-journey:v1:soundClaims';
function savedClaims(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SOUND_CLAIMS_KEY) ?? '[]');
    return Array.isArray(value) && value.every((key) => typeof key === 'string') ? value : [];
  } catch { return []; }
}

export function useAudio(enabled: boolean) {
  const context = useRef<AudioContext | null>(null);
  const buffers = useRef(new Map<Sound, Promise<AudioBuffer>>());
  const sources = useRef(new Set<AudioBufferSourceNode>());
  const played = useRef(new Set<string>());
  const pending = useRef<{ sound: Sound; key: string } | null>(null);
  const generation = useRef(0);
  const enabledRef = useRef(enabled);
  const [needsGesture, setNeedsGesture] = useState(false);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  const load = useCallback((name: Sound, ctx: AudioContext) => {
    let promise = buffers.current.get(name);
    if (!promise) {
      promise = fetch(assetPath(`/sounds/${name}.mp3`))
        .then((response) => { if (!response.ok) throw new Error('Audio unavailable'); return response.arrayBuffer(); })
        .then((bytes) => ctx.decodeAudioData(bytes));
      buffers.current.set(name, promise);
      promise.catch(() => buffers.current.delete(name));
    }
    return promise;
  }, []);

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
    const AudioContextClass = window.AudioContext ?? (window as SafariWindow).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!context.current) context.current = new AudioContextClass();
    const ctx = context.current;
    const resume = ctx.resume();
    // Prime the output within the gesture, even while MP3 decoding is still pending.
    const silence = ctx.createBufferSource();
    silence.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    silence.connect(ctx.destination);
    silence.start();
    void resume.then(() => {
      setNeedsGesture(false);
      if (pending.current) { const { sound, key } = pending.current; pending.current = null; void play(sound, key); }
    }).catch(() => setNeedsGesture(true));
    for (const sound of ['start', 'almost', 'finish', 'success', 'midpoint', 'sparkle', 'tick', 'strong-tick', 'whoosh', 'pop', 'land'] as Sound[]) void load(sound, ctx).catch(() => {});
  }, [load, play]);

  const playOnce = useCallback((sound: Sound, key: string) => {
    if (played.current.has(key) || savedClaims().includes(key)) return;
    played.current.add(key);
    if (played.current.size > 200) played.current.delete(played.current.values().next().value!);
    if (enabledRef.current) void play(sound, key);
  }, [play]);

  const stop = useCallback(() => {
    generation.current++;
    pending.current = null;
    for (const source of sources.current) { try { source.stop(); } catch { /* Already ended. */ } }
    sources.current.clear();
    setNeedsGesture(false);
  }, []);

  useEffect(() => {
    const onVisible = () => {
      const ctx = context.current;
      if (document.visibilityState === 'visible' && ctx && ctx.state !== 'running' && enabledRef.current) {
        void ctx.resume().then(() => {
          if (pending.current) { const { sound, key } = pending.current; pending.current = null; void play(sound, key); }
        }).catch(() => setNeedsGesture(true));
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [play]);

  useEffect(() => {
    if (!enabled) {
      generation.current++;
      pending.current = null;
      for (const source of sources.current) { try { source.stop(); } catch {} }
      sources.current.clear();
    }
  }, [enabled]);

  useEffect(() => {
    const currentSources = sources.current;
    const lifecycle = generation;
    return () => {
      lifecycle.current++;
      for (const source of currentSources) { try { source.stop(); } catch {} }
      void context.current?.close();
    };
  }, []);

  return { unlock, playOnce, stop, needsGesture };
}
