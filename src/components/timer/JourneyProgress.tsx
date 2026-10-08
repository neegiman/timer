import { CharacterIcon } from '../CharacterIcon';
import type { RefObject } from 'react';
import type { Character } from '@/types/timer';

export interface ProgressRefs {
  trackRef: RefObject<HTMLDivElement | null>;
  fillRef: RefObject<HTMLDivElement | null>;
  markerRef: RefObject<HTMLDivElement | null>;
}
export function JourneyProgress({ character, progress, trackRef, fillRef, markerRef }: { character: Character; progress: number } & ProgressRefs) {
  return <div className="journey-progress" role="progressbar" aria-label="출발에서 도착까지의 여행" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
    <div className="progress-endpoints" aria-hidden="true"><span>🏡 출발</span><span>도착 🏁</span></div>
    <div ref={trackRef} className="progress-track">
      <div ref={fillRef} className="progress-fill" style={{ transform: `scaleX(${progress})` }} />
      <div ref={markerRef} className="progress-marker" data-progress={progress} aria-hidden="true"><span><CharacterIcon character={character} size={36} /></span></div>
    </div>
  </div>;
}
