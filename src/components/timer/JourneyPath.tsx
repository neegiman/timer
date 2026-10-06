import Image from 'next/image';
import { assetPath } from '@/lib/assetPath';
import { JOURNEY_PATH, journeyPoint } from '@/lib/journey';
import { CharacterIcon } from '../CharacterIcon';
import type { Character, PromiseActivity, TimerStatus } from '@/types/timer';

export function JourneyPath({ progress, character, promise, status }: { progress: number; character: Character; promise: PromiseActivity; status: TimerStatus }) {
  const point = journeyPoint(progress);
  const celebrating = status === 'arriving' || status === 'completed';
  return <div className={`journey-scene ${celebrating ? 'celebrating' : ''} ${status === 'paused' ? 'is-paused' : ''}`}
    role="img" aria-label={`${character.name}, ${promise.name}까지 ${Math.round((1 - progress) * 100)}퍼센트 남았어요`}>
    <Image className="scene-backdrop" src={assetPath('/images/meadow.svg')} alt="" width={800} height={600} priority />
    <svg className="route-svg" viewBox="0 0 800 600" preserveAspectRatio="none" aria-hidden="true">
      <path d={JOURNEY_PATH} fill="none" stroke="#b4cc9c" strokeWidth="40" strokeLinecap="round" vectorEffect="non-scaling-stroke" transform="translate(0 4)" />
      <path d={JOURNEY_PATH} fill="none" stroke="#fff3d6" strokeWidth="36" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <path d={JOURNEY_PATH} fill="none" stroke="#d4b885" strokeWidth="3" strokeDasharray="3 15" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <path d={JOURNEY_PATH} fill="none" stroke="#e8b65f" strokeWidth="36" strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength="1" strokeDasharray={`${Math.max(0.00001, progress)} 1`} />
    </svg>
    <div className="start-point"><span className="house" aria-hidden="true">🏡</span><span className="endpoint-label">출발</span></div>
    <div className="finish-point"><span className={`finish-flag ${celebrating ? 'flag-wave' : ''}`} aria-hidden="true">🚩</span><span className="destination-icon" aria-hidden="true">{promise.icon}</span><span className="endpoint-label">도착</span></div>
    <div className={`moving-character ${status === 'running' ? 'is-moving' : ''}`} data-testid="traveler" data-progress={progress}
      style={{ left: `${point.x / 8}%`, top: `${point.y / 6}%` }}>
      <div className="traveler-body"><CharacterIcon character={character} size={120} /></div>
      <span className="character-shadow" />
    </div>
    {celebrating ? <div className="arrival-sparkles" aria-hidden="true"><span>✦</span><span>⭐</span><span>✧</span><span>✦</span><span>⭐</span><span>✧</span></div> : null}
  </div>;
}
