'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { characters } from '@/lib/characters';

const EVENT = 'promise-journey-storage';
const cache = new Map<string, { raw: string | null; value: unknown }>();
const memory = new Map<string, string>();

function subscribe(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener(EVENT, listener);
  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener(EVENT, listener);
  };
}

function readRaw(key: string): string | null {
  if (memory.has(key)) return memory.get(key)!;
  try { return window.localStorage.getItem(key); }
  catch { return memory.get(key) ?? null; }
}

/** A hydration-safe store; unavailable browser storage falls back to this tab's memory. */
export function useLocalStorage<T>(key: string, fallback: T, validate: (value: unknown) => value is T) {
  const storageKey = `promise-journey:v1:${key}`;
  const getSnapshot = useCallback((): T => {
    const raw = readRaw(storageKey);
    const previous = cache.get(storageKey);
    if (previous?.raw === raw) return previous.value as T;
    let value = fallback;
    if (raw !== null) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (validate(parsed)) value = parsed;
      } catch { /* Corrupt data is replaced by the safe default. */ }
    }
    cache.set(storageKey, { raw, value });
    return value;
  }, [storageKey, fallback, validate]);
  const getServerSnapshot = useCallback(() => fallback, [fallback]);
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const update = useCallback((next: T | ((previous: T) => T)) => {
    const previous = getSnapshot();
    const result = typeof next === 'function' ? (next as (previous: T) => T)(previous) : next;
    if (Object.is(result, previous)) return;
    const raw = JSON.stringify(result);
    try { window.localStorage.setItem(storageKey, raw); memory.delete(storageKey); }
    catch { memory.set(storageKey, raw); }
    cache.set(storageKey, { raw, value: result });
    window.dispatchEvent(new Event(EVENT));
  }, [getSnapshot, storageKey]);
  return [value, update] as const;
}

export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
export const isDuration = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 120;
export const isCharacterId = (value: unknown): value is string => typeof value === 'string' && characters.some((character) => character.id === value);
