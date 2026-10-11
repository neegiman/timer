import { JourneyPath } from './JourneyPath';
import { JourneyProgress } from './JourneyProgress';
import { JourneyMessage } from './JourneyMessage';
import { PromiseIcon } from '../StoryIcon';
import { useJourneyRenderer } from '@/hooks/useJourneyRenderer';
import { formatRemaining } from '@/lib/timer';
import { activityCompletion, activityReminder } from '@/lib/activityMode';
import type { Character, PromiseActivity, TimerMode, TimerStatus } from '@/types/timer';
import type { AnimationInput, AnimationState } from '@/types/animation';
import type { SceneTheme } from '@/lib/dayNight';
import type { Season } from '@/lib/seasons';
import { journeyNotice } from '@/lib/journeyNotice';

export function VisualTimer({ character, promise, mode = 'after', sessionId, progress, remaining, minutes, status, showNumericTime, animation, input, sampledAt, theme, season }: {
  character: Character; promise: PromiseActivity; progress: number; remaining: number;
  mode?: TimerMode; sessionId: string;
  minutes: number; status: TimerStatus; showNumericTime: boolean; animation: AnimationState; input: AnimationInput; sampledAt: number; theme: SceneTheme; season: Season;
}) {
  const arrived = animation.messageStage === 'arrived';
  const notice = journeyNotice(input.totalDuration, input.remainingTime);
  const { scene, wrapper, body, goal, track, fill, marker } = useJourneyRenderer(input, animation, sampledAt, character.id, season, theme);
  return <section className={`journey-card ${status === 'paused' ? 'is-paused' : ''}`} aria-label={`${minutes}분 약속 여행`}>
    <div className="journey-overview">
      <JourneyMessage notice={notice} promise={promise} mode={mode} totalDuration={input.totalDuration} sessionId={sessionId} />
      {showNumericTime ? <p className="numeric-time" aria-label={`남은 시간 ${formatRemaining(remaining)}`} data-testid="countdown">{formatRemaining(remaining)}<span>남은 시간</span></p> : null}
      <JourneyProgress character={character} progress={progress} trackRef={track} fillRef={fill} markerRef={marker} />
    </div>
    <JourneyPath character={character} promise={promise} animation={animation} input={input} theme={theme} season={season} sceneRef={scene} wrapperRef={wrapper} bodyRef={body} goalRef={goal} />
    <div className="journey-message">
      {arrived ? <p className="completion-promise"><PromiseIcon id={promise.id} size={42} /> {activityCompletion(promise, mode)}</p>
        : <p className="promise-reminder"><PromiseIcon id={promise.id} size={42} /> {activityReminder(promise, mode)}</p>}
    </div>
  </section>;
}
