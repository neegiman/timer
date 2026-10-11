import { CharacterIcon } from '../CharacterIcon';
import { StoryIcon } from '../StoryIcon';
import { useEffect, useId, useRef, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import type { Character } from '@/types/timer';
import { assetPath } from '@/lib/assetPath';
import { formatRemaining } from '@/lib/timer';

export interface TimeAdjustmentControls {
  begin: () => boolean;
  preview: (progress: number) => void;
  end: (commit: boolean) => void;
  seek: (progress: number) => void;
}

export interface ProgressRefs {
  trackRef: RefObject<HTMLDivElement | null>;
  fillRef: RefObject<HTMLDivElement | null>;
  markerRef: RefObject<HTMLDivElement | null>;
}
export function JourneyProgress({ character, progress, remaining, durationMs, enabled, isAdjusting, adjustment, trackRef, fillRef, markerRef }: {
  character: Character; progress: number; remaining: number; durationMs: number;
  enabled: boolean; isAdjusting: boolean; adjustment: TimeAdjustmentControls;
} & ProgressRefs) {
  const hintId = useId();
  const endAdjustment = adjustment.end;
  const drag = useRef<{ pointer: number; progress: number; element: HTMLDivElement } | null>(null);
  const frame = useRef(0);
  const point = (x: number) => {
    const bounds = trackRef.current?.getBoundingClientRect();
    return bounds?.width ? Math.min(1, Math.max(0, (x - bounds.left) / bounds.width)) : progress;
  };
  const finish = (commit: boolean) => {
    const pending = drag.current;
    if (!pending) return;
    cancelAnimationFrame(frame.current); drag.current = null;
    if (commit) adjustment.preview(pending.progress);
    adjustment.end(commit);
    if (pending.element.hasPointerCapture(pending.pointer)) pending.element.releasePointerCapture(pending.pointer);
  };
  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabled || drag.current || event.button !== 0 || !adjustment.begin()) return;
    event.preventDefault();
    const next = point(event.clientX);
    drag.current = { pointer: event.pointerId, progress: next, element: event.currentTarget };
    event.currentTarget.focus({ preventScroll: true });
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Synthetic/older pointer input can still target the track. */ }
    adjustment.preview(next);
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const pending = drag.current;
    if (!pending || pending.pointer !== event.pointerId) return;
    pending.progress = point(event.clientX);
    // Coalesce high-frequency touch/pen events into one preview per paint.
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => { if (drag.current) adjustment.preview(drag.current.progress); });
  };
  const key = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && drag.current) { event.preventDefault(); finish(false); return; }
    if (!enabled || drag.current) return;
    const step = 5000 / durationMs, page = 60_000 / durationMs;
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? 1
      : event.key === 'ArrowRight' || event.key === 'ArrowUp' ? progress + step
      : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? progress - step
      : event.key === 'PageUp' ? progress + page : event.key === 'PageDown' ? progress - page : null;
    if (target === null) return;
    event.preventDefault(); adjustment.seek(target);
  };
  useEffect(() => {
    if (!isAdjusting) { cancelAnimationFrame(frame.current); drag.current = null; }
  }, [isAdjusting]);
  useEffect(() => () => { cancelAnimationFrame(frame.current); endAdjustment(false); }, [endAdjustment]);

  return <div className="journey-progress" data-adjusting={isAdjusting}>
    <div className="sr-only" role="progressbar" aria-label="출발에서 도착까지의 여행" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} />
    <div className="progress-endpoints" aria-hidden="true"><span><StoryIcon name="home" size={34} /> 출발</span><span>도착 <StoryIcon name="flag" size={34} /></span></div>
    <div ref={trackRef} className="progress-track">
      <div className="progress-paint" style={{ backgroundImage: `url("${assetPath('/images/progress-v1/trail.webp')}")` }} aria-hidden="true" />
      <div ref={fillRef} className="progress-fill" style={{ clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)`, backgroundImage: `url("${assetPath('/images/progress-v1/trail.webp')}")` }} aria-hidden="true" />
      <div ref={markerRef} className="progress-marker" data-progress={progress} aria-hidden="true">
        <span><CharacterIcon character={character} size={36} animated /></span>
      </div>
      <div className="progress-interaction" role="slider" tabIndex={enabled ? 0 : -1} aria-label="여행 시간 조절"
        aria-orientation="horizontal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-valuetext={`남은 시간 ${formatRemaining(remaining)}`}
        aria-disabled={!enabled} aria-describedby={enabled ? hintId : undefined}
        onPointerDown={down} onPointerMove={move} onPointerUp={(event) => { if (drag.current?.pointer === event.pointerId) { drag.current.progress = point(event.clientX); finish(true); } }}
        onPointerCancel={(event) => { if (drag.current?.pointer === event.pointerId) finish(false); }} onLostPointerCapture={(event) => { if (drag.current?.pointer === event.pointerId) finish(false); }} onKeyDown={key} />
    </div>
    <p id={hintId} className="progress-hint" aria-hidden={!enabled}>{enabled ? isAdjusting
      ? <><output className="progress-time-bubble" aria-hidden="true">남은 시간 <strong>{formatRemaining(remaining)}</strong></output><span className="sr-only">놓으면 시간이 바뀌어요</span></>
      : '↔ 끌어서 시간 조절' : '\u00a0'}</p>
  </div>;
}
