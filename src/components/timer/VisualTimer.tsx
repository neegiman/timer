import { JourneyPath } from './JourneyPath';
import { formatRemaining, timerMessage } from '@/lib/timer';
import { completionMessage } from '@/lib/promises';
import type { Character, PromiseActivity, TimerStatus } from '@/types/timer';

export function VisualTimer({ character, promise, progress, remaining, minutes, status, showNumericTime }: {
  character: Character; promise: PromiseActivity; progress: number; remaining: number;
  minutes: number; status: TimerStatus; showNumericTime: boolean;
}) {
  const arrived = status === 'arriving' || status === 'completed';
  const message = arrived ? '도착했어요!' : status === 'paused' ? '잠깐 쉬어요!' : timerMessage(progress);
  return <section className="journey-card" aria-label={`${minutes}분 약속 여행`}>
    <h1 className={`stage-message ${arrived ? 'arrived-message' : ''}`} role="status">{arrived ? <span aria-hidden="true">🎉 </span> : null}{message}</h1>
    <JourneyPath progress={progress} character={character} promise={promise} status={status} />
    <div className="journey-message">
      {arrived ? <p className="completion-promise"><span aria-hidden="true">{promise.icon}</span> {completionMessage(promise)}</p>
        : <p className="promise-reminder"><span aria-hidden="true">{promise.icon}</span> 도착하면 {promise.name}</p>}
      {!arrived && showNumericTime ? <p className="numeric-time" aria-label={`남은 시간 ${formatRemaining(remaining)}`} data-testid="countdown">{formatRemaining(remaining)}<span>남은 시간</span></p> : null}
    </div>
  </section>;
}
