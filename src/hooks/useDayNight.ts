'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { isBoolean, useLocalStorage } from './useLocalStorage';
import { isBackgroundMode, isCoordinates, sceneTheme, type BackgroundMode, type SceneCoordinates } from '@/lib/dayNight';

export type LocationStatus = 'idle' | 'pending' | 'ready' | 'denied' | 'unavailable' | 'timeout';

/** Location stays in memory. Only the parent's background preference is persisted. */
export function useDayNight(now: number) {
  const [mode, setMode] = useLocalStorage<BackgroundMode>('backgroundMode', 'auto', isBackgroundMode);
  const [locationEnabled, setLocationEnabled] = useLocalStorage('useLocationBackground', false, isBoolean);
  const [coordinates, setCoordinates] = useState<SceneCoordinates | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [request, setRequest] = useState(0);
  const handledRequest = useRef(0);

  useEffect(() => {
    if (!locationEnabled || mode !== 'auto') return;
    let cancelled = false;
    let watcher: number | null = null;
    let permission: PermissionStatus | null = null;
    const clearWatch = () => {
      if (watcher !== null) navigator.geolocation.clearWatch(watcher);
      watcher = null;
    };
    const fail = (reason: LocationStatus) => {
      if (cancelled) return;
      clearWatch(); setCoordinates(null); setStatus(reason);
    };
    const watch = () => {
      if (cancelled || watcher !== null) return;
      if (!navigator.geolocation) { fail('unavailable'); return; }
      setStatus('pending');
      try { watcher = navigator.geolocation.watchPosition((position) => {
        if (cancelled) return;
        const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        if (!isCoordinates(point)) { fail('unavailable'); return; }
        setCoordinates((previous) => previous?.latitude === point.latitude && previous?.longitude === point.longitude ? previous : point);
        setStatus('ready');
      }, (error) => fail(error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable'),
      { enableHighAccuracy: false, maximumAge: 5 * 60_000, timeout: 10_000 }); }
      catch { fail('unavailable'); }
    };
    const permissionChanged = () => {
      if (permission?.state === 'granted') watch();
      else fail(permission?.state === 'denied' ? 'denied' : 'idle');
    };
    // A first permission prompt only follows the parent's explicit button tap.
    // On reload, already-granted permission can resume without another prompt.
    const initialize = async () => {
      try {
        permission = navigator.permissions ? await navigator.permissions.query({ name: 'geolocation' }) : null;
      } catch { permission = null; }
      if (cancelled) return;
      const explicitRequest = request > handledRequest.current;
      handledRequest.current = request;
      if (!navigator.geolocation) { fail('unavailable'); return; }
      permission?.addEventListener?.('change', permissionChanged);
      if (explicitRequest || permission?.state === 'granted') watch();
      else if (permission?.state === 'denied') fail('denied');
      else setStatus('idle');
    };
    void initialize();
    return () => { cancelled = true; clearWatch(); permission?.removeEventListener?.('change', permissionChanged); };
  }, [locationEnabled, mode, request]);

  const minute = Math.floor(now / 60_000) * 60_000;
  const activeCoordinates = locationEnabled && mode === 'auto' && status === 'ready' ? coordinates : null;
  const theme = useMemo(() => sceneTheme(mode, minute, activeCoordinates), [mode, minute, activeCoordinates]);
  const source = mode !== 'auto' ? 'manual' : activeCoordinates ? 'location' : 'clock';
  const enableLocation = () => { setStatus('pending'); setLocationEnabled(true); setRequest((value) => value + 1); };
  const disableLocation = () => { setLocationEnabled(false); setCoordinates(null); setStatus('idle'); };
  return { mode, setMode, theme, source, status, locationEnabled, enableLocation, disableLocation };
}
