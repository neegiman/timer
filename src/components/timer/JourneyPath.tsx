import Image from 'next/image';
import { assetPath } from '@/lib/assetPath';
import { JOURNEY_PATH, journeyPoint } from '@/lib/journey';
import { CharacterIcon } from '../CharacterIcon';
import type { Character, TimerStatus } from '@/types/timer';

export function JourneyPath({ progress, character, status }: { progress: number; character: Character; status: TimerStatus }) {
  const point = journeyPoint(progress);
  const celebrating = status === 'arriving' || status === 'completed';
  const preview = status === 'setup' || status === 'ready';
  return <div className={`journey-scene ${celebrating ? 'celebrating' : ''} ${status === 'paused' ? 'is-paused' : ''}`}
    role="img" aria-label={`${character.name}, 결승점까지 ${Math.round((1 - progress) * 100)}퍼센트 남았어요`}>
    <Image className="scene-backdrop" src={assetPath('/images/meadow.svg')} alt="" width={800} height={360} priority />
    <div className="scene-caption"><span className="little-sparkle">✦</span> {preview ? '작은 기다림이 모험이 되는 곳' : celebrating ? '우리의 약속이 반짝이는 순간' : '한 걸음씩, 약속을 향해'}</div>
    <svg className="route-svg" viewBox="0 0 800 360" preserveAspectRatio="none" aria-hidden="true">
      <path d={JOURNEY_PATH} fill="none" stroke="#bad2ad" strokeWidth="47" strokeLinecap="round" transform="translate(0 5)" />
      <path d={JOURNEY_PATH} fill="none" stroke="#fbefd1" strokeWidth="44" strokeLinecap="round" />
      <path d={JOURNEY_PATH} fill="none" stroke="#dec491" strokeWidth="2.5" strokeDasharray="2 12" strokeLinecap="round" />
      <path d={JOURNEY_PATH} fill="none" stroke="#edb66b" opacity=".55" strokeWidth="44" strokeLinecap="round" pathLength="1" strokeDasharray={`${Math.max(0.00001, progress)} 1`} />
      {[0.25, 0.5, 0.75].map((step) => { const p = journeyPoint(step); return <circle key={step} cx={p.x} cy={p.y} r="5" fill={progress >= step ? '#dd9860' : '#fff8e9'} stroke="#d7ba86" strokeWidth="2" />; })}
    </svg>
    <div className="start-point"><span className="house" aria-hidden="true">🏡</span><span className="endpoint-label">출발</span></div>
    <div className={`finish-point ${celebrating ? 'flag-wave' : ''}`}><span className="finish-flag" aria-hidden="true">🚩</span><span className="endpoint-label">도착</span></div>
    <div className={`moving-character ${status === 'running' ? 'is-moving' : ''}`} data-testid="traveler" data-progress={progress}
      style={{ left: `${point.x / 8}%`, top: `${point.y / 3.6}%` }}>
      {preview ? <div className="character-bubble">같이 출발해요! <span>♪</span></div> : null}
      <div className="traveler-body"><CharacterIcon character={character} size={90} /></div>
      <span className="character-shadow" />
    </div>
    {celebrating ? <div className="arrival-sparkles" aria-hidden="true"><span>✦</span><span>⭐</span><span>✧</span><span>✦</span><span>⭐</span><span>✧</span></div> : null}
    <span className="scene-flower flower-one" aria-hidden="true">✿</span><span className="scene-flower flower-two" aria-hidden="true">✿</span>
    <span className="scene-flower flower-three" aria-hidden="true">✿</span>
  </div>;
}
