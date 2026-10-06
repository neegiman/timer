import { Clock3, Heart, MapPin, Sparkles } from 'lucide-react';
import { JourneyPath } from './JourneyPath';
import { formatRemaining, timerMessage } from '@/lib/timer';
import { completionMessage } from '@/lib/promises';
import type { Character, PromiseActivity, TimerStatus } from '@/types/timer';

export function VisualTimer({ character, promise, progress, remaining, minutes, status, showNumericTime }: {
  character: Character; promise: PromiseActivity; progress: number; remaining: number;
  minutes: number; status: TimerStatus; showNumericTime: boolean;
}) {
  const preview = status === 'setup' || status === 'ready';
  const arrived = status === 'arriving' || status === 'completed';
  const message = preview ? '준비됐나요? 함께 떠나봐요!' : arrived ? '도착했어요!' : status === 'paused' ? '잠깐 쉬어 가요.' : timerMessage(progress);
  return <section className={`journey-card ${preview ? 'preview-card' : 'active-card'}`} aria-label="약속 여행">
    <div className="journey-topline"><span className="journey-tag"><span className="status-dot" />{preview ? '우리의 약속 여행' : arrived ? '여행 도착!' : status === 'paused' ? '여행 쉬는 중' : '여행 중'}</span>
      <span className="journey-duration"><Clock3 size={14} /> {minutes}분의 작은 모험</span>
    </div>
    <JourneyPath progress={progress} character={character} status={status} />
    <div className="journey-message">
      <p className={`stage-message ${arrived ? 'arrived-message' : ''}`} role="status">{arrived ? <Sparkles size={22} /> : null}{message}</p>
      {preview ? <p className="journey-description">{character.name}{character.id === 'rabbit' || character.id === 'chick' || character.id === 'car' ? '가' : '이'} 도착하면, 약속을 지킬 시간이에요.</p>
        : arrived ? <p className="completion-promise">{completionMessage(promise)}</p>
        : <p className="journey-description">{status === 'paused' ? '준비되면 다시 함께 출발해요.' : '결승점이 가까워질수록 약속 시간도 가까워져요.'}</p>}
      {!preview && showNumericTime ? <p className="numeric-time" aria-label={`남은 시간 ${formatRemaining(remaining)}`} data-testid="countdown">{formatRemaining(remaining)}<span>남은 시간</span></p> : null}
    </div>
    <div className="journey-divider" />
    <div className="promise-ticket"><div className="ticket-icon"><MapPin size={19} /></div><div><span className="ticket-label">도착하면 지킬 약속</span><p>{promise.icon} {promise.activity}</p></div><Heart className="ticket-heart" size={19} /></div>
  </section>;
}
