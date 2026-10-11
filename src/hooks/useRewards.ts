'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { EMPTY_LEGACY_STARS, EMPTY_REWARDS, isLegacyStars, isRewards, migrateLegacy, starsOnDate, totalStars } from '@/lib/rewards';

const subscribeHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

export function useRewards(date: string) {
  const hydrated = useSyncExternalStore(subscribeHydration, clientHydrated, serverHydrated);
  const [legacy] = useLocalStorage('todayStars', EMPTY_LEGACY_STARS, isLegacyStars);
  const [stored, setRewards] = useLocalStorage('rewards', EMPTY_REWARDS, isRewards);
  // Derive immediately as well as persisting: an early claim cannot race migration.
  const rewards = useMemo(() => migrateLegacy(stored, legacy), [stored, legacy]);
  // Never migrate the server's empty fallback before the browser snapshots load.
  useEffect(() => { if (hydrated) setRewards((current) => migrateLegacy(current, legacy)); }, [hydrated, legacy, setRewards]);
  const counts = useMemo(() => ({ total: totalStars(rewards), today: starsOnDate(rewards, date) }), [rewards, date]);
  return { rewards, setRewards, legacy, ...counts };
}
