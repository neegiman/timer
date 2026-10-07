'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

type LegacyDocument = Document & { webkitFullscreenElement?: Element; webkitFullscreenEnabled?: boolean; webkitExitFullscreen?: () => Promise<void> | void };
type LegacyElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

function fullscreenElement() {
  return document.fullscreenElement ?? (document as LegacyDocument).webkitFullscreenElement;
}
function nativeSupported() {
  const root = document.documentElement as LegacyElement;
  return (document.fullscreenEnabled && typeof root.requestFullscreen === 'function') ||
    ((document as LegacyDocument).webkitFullscreenEnabled === true && typeof root.webkitRequestFullscreen === 'function');
}
function snapshot() { return fullscreenElement() ? 'native' : nativeSupported() ? 'available' : 'unavailable'; }
function serverSnapshot() { return 'unavailable'; }
function subscribe(callback: () => void) {
  document.addEventListener('fullscreenchange', callback);
  document.addEventListener('webkitfullscreenchange', callback);
  return () => { document.removeEventListener('fullscreenchange', callback); document.removeEventListener('webkitfullscreenchange', callback); };
}

/** Native state follows the browser (including Esc). A clearly named page view is the fallback. */
export function useFullscreen() {
  const native = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [expanded, setExpanded] = useState(false);
  const [changing, setChanging] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const pending = useRef(false);
  const previousScroll = useRef(0);
  const mode = native === 'native' ? 'native' : expanded ? 'expanded' : 'window';

  useEffect(() => {
    if (!expanded) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event: KeyboardEvent) => {
      // Esc first dismisses an open parent dialog; the next Esc leaves the large page view.
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) { event.preventDefault(); setExpanded(false); }
    };
    document.addEventListener('keydown', escape);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', escape);
      window.scrollTo({ top: previousScroll.current });
    };
  }, [expanded]);

  const toggle = useCallback(async () => {
    if (pending.current) return;
    pending.current = true; setChanging(true);
    const doc = document as LegacyDocument;
    const root = document.documentElement as LegacyElement;
    try {
      if (fullscreenElement()) {
        const exit = doc.fullscreenElement ? doc.exitFullscreen : doc.webkitExitFullscreen;
        if (exit) await exit.call(doc);
        setAnnouncement('전체화면을 끝냈어요.');
      } else if (expanded) {
        setExpanded(false); setAnnouncement('큰 화면 보기를 끝냈어요.');
      } else {
        previousScroll.current = window.scrollY;
        if (nativeSupported()) {
          const request = document.fullscreenEnabled ? root.requestFullscreen : root.webkitRequestFullscreen;
          try {
            // Invoked synchronously from the explicit button tap, before the first await.
            await request!.call(root);
            setAnnouncement('전체화면으로 전환했어요.');
          } catch {
            setExpanded(true); setAnnouncement('페이지 안에서 큰 화면으로 보여드려요.');
          }
        } else {
          setExpanded(true); setAnnouncement('페이지 안에서 큰 화면으로 보여드려요.');
        }
      }
    } catch { setAnnouncement('부모 메뉴에서 전체화면 끝내기를 다시 눌러 주세요.'); }
    finally { pending.current = false; setChanging(false); }
  }, [expanded]);

  const label = mode === 'native' ? '전체화면 끝내기' : mode === 'expanded' ? '큰 화면 끝내기' : native === 'available' ? '전체화면' : '큰 화면 보기';
  return { mode, changing, announcement, label, toggle, nativeSupported: native !== 'unavailable' };
}
