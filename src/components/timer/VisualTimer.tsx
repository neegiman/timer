import { JourneyPath } from './JourneyPath';
import { formatRemaining } from '@/lib/timer';
import { completionMessage } from '@/lib/promises';
import type { Character, PromiseActivity, TimerStatus } from '@/types/timer';
import type { AnimationInput, AnimationState } from '@/types/animation';

export function VisualTimer({ character, promise, progress, remaining, minutes, status, showNumericTime, animation, input, sampledAt }: {
  character: Character; promise: PromiseActivity; progress: number; remaining: number;
  minutes: number; status: TimerStatus; showNumericTime: boolean; animation: AnimationState; input: AnimationInput; sampledAt: number;
}) {
  const arrived = animation.phase === 'LAND' || animation.phase === 'CELEBRATE';
  const paused = status === 'paused';
  const number = animation.countdownNumber;
  return <section className="journey-card" aria-label={`${minutes}분 약속 여행`}>
    <h1 className={`stage-message ${arrived ? 'arrived-message' : ''}`} role="status">
      {paused ? '잠깐 쉬어요!' : number && (!showNumericTime || number <= 3) ? '거의 다 왔어요!' : <>{arrived ? <span aria-hidden="true">🎉 </span> : null}{animation.message}</>}
    </h1>
    <JourneyPath progress={progress} character={character} promise={promise} animation={animation} input={input} sampledAt={sampledAt} />
    {number && showNumericTime ? <div className={`countdown-overlay ${paused ? 'is-paused' : ''}`} aria-label={`${number}초 남았어요`} data-testid="final-countdown"><span key={number}>{number}</span></div> : null}
    <div className="journey-message">
      {arrived ? <p className="completion-promise"><span aria-hidden="true">{promise.icon}</span> {completionMessage(promise)}</p>
        : <p className="promise-reminder"><span aria-hidden="true">{promise.icon}</span> 도착하면 {promise.name}</p>}
      {remaining > 0 && showNumericTime ? <p className="numeric-time" aria-label={`남은 시간 ${formatRemaining(remaining)}`} data-testid="countdown">{formatRemaining(remaining)}<span>남은 시간</span></p> : null}
    </div>
  </section>;
}
