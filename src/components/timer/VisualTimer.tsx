import { JourneyPath } from './JourneyPath';
import { JourneyProgress } from './JourneyProgress';
import { JourneyMessage } from './JourneyMessage';
import { PromiseIcon } from '../StoryIcon';
import { useJourneyRenderer } from '@/hooks/useJourneyRenderer';
import { formatRemaining } from '@/lib/timer';
import { completionMessage } from '@/lib/promises';
import type { Character, PromiseActivity, TimerStatus } from '@/types/timer';
import type { AnimationInput, AnimationState } from '@/types/animation';
import type { SceneTheme } from '@/lib/dayNight';
import type { Season } from '@/lib/seasons';
import { journeyNotice } from '@/lib/journeyNotice';

export function VisualTimer({ character, promise, progress, remaining, minutes, status, showNumericTime, animation, input, sampledAt, theme, season }: {
  character: Character; promise: PromiseActivity; progress: number; remaining: number;
  minutes: number; status: TimerStatus; showNumericTime: boolean; animation: AnimationState; input: AnimationInput; sampledAt: number; theme: SceneTheme; season: Season;
}) {
  const arrived = animation.messageStage === 'arrived';
  const notice = journeyNotice(input.totalDuration, input.remainingTime);
  const { scene, wrapper, body, goal, track, fill, marker } = useJourneyRenderer(input, animation, sampledAt, character.id, season, theme);
  return <section className={`journey-card ${status === 'paused' ? 'is-paused' : ''}`} aria-label={`${minutes}분 약속 여행`}>
    <div className="journey-overview">
      <JourneyMessage notice={notice} promiseId={promise.id} />
      {showNumericTime ? <p className="numeric-time" aria-label={`남은 시간 ${formatRemaining(remaining)}`} data-testid="countdown">{formatRemaining(remaining)}<span>남은 시간</span></p> : null}
      <JourneyProgress character={character} progress={progress} trackRef={track} fillRef={fill} markerRef={marker} />
    </div>
    <JourneyPath character={character} promise={promise} animation={animation} input={input} theme={theme} season={season} sceneRef={scene} wrapperRef={wrapper} bodyRef={body} goalRef={goal} />
    <div className="journey-message">
      {arrived ? <p className="completion-promise"><PromiseIcon id={promise.id} size={42} /> {completionMessage(promise)}</p>
        : <p className="promise-reminder"><PromiseIcon id={promise.id} size={42} /> 도착하면 {promise.name}</p>}
    </div>
  </section>;
}
