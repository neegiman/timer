'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { ScreenWakeLockController, type ScreenWakeLockStatus } from '@/lib/screenWakeLock';

const serverSnapshot = (): ScreenWakeLockStatus => 'idle';

export function useScreenWakeLock(enabled: boolean, active: boolean) {
  const [controller] = useState(() => new ScreenWakeLockController({
    supported: () => window.isSecureContext && typeof navigator.wakeLock?.request === 'function',
    request: () => navigator.wakeLock.request('screen'),
  }));
  const status = useSyncExternalStore(controller.subscribe, controller.getSnapshot, serverSnapshot);

  useEffect(() => {
    const onVisibility = () => controller.setVisible(document.visibilityState === 'visible');
    const onPageHide = () => controller.setVisible(false);
    onVisibility();
    controller.setActive(enabled && active);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      controller.setActive(false);
      controller.setVisible(false);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [controller, enabled, active]);

  return { status, retry: controller.request };
}
