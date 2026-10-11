import { JourneyPath } from './JourneyPath';
import { JourneyProgress, type TimeAdjustmentControls } from './JourneyProgress';
import { JourneyMessage } from './JourneyMessage';
import { PromiseIcon } from '../StoryIcon';
import { useJourneyRenderer } from '@/hooks/useJourneyRenderer';
import { formatRemaining } from '@/lib/timer';
import { activityReminder } from '@/lib/activityMode';
import type { Character, PromiseActivity, TimerMode, TimerStatus } from '@/types/timer';
import type { AnimationInput, AnimationState } from '@/types/animation';
import type { SceneTheme } from '@/lib/dayNight';
import type { Season } from '@/lib/seasons';
import { journeyNotice } from '@/lib/journeyNotice';

export function VisualTimer({ character, promise, mode = 'after', sessionId, progress, remaining, minutes, status, showNumericTime, animation, input, sampledAt, theme, season, adjustment }: {
  character: Character; promise: PromiseActivity; progress: number; remaining: number;
  mode?: TimerMode; sessionId: string;
  minutes: number; status: TimerStatus; showNumericTime: boolean; animation: AnimationState; input: AnimationInput; sampledAt: number; theme: SceneTheme; season: Season;
  adjustment: TimeAdjustmentControls;
}) {
  const arrived = animation.messageStage === 'arrived';
  const notice = journeyNotice(input.totalDuration, input.isAdjusting ? Math.max(1, input.remainingTime) : input.remainingTime);
  const { scene, wrapper, body, goal, track, fill, marker } = useJourneyRenderer(input, animation, sampledAt, character.id, season, theme);
  return <section className={`journey-card ${status === 'paused' ? 'is-paused' : ''}`} data-adjusting={input.isAdjusting ?? false} aria-label={`${minutes}분 약속 여행`}>
    <div className="journey-overview">
      <JourneyMessage notice={input.isAdjusting ? { ...notice, visible: true } : notice} promise={promise} mode={mode} totalDuration={input.totalDuration} sessionId={sessionId} />
      {showNumericTime ? <p className="numeric-time" aria-label={`남은 시간 ${formatRemaining(remaining)}`} data-testid="countdown">{formatRemaining(remaining)}<span>남은 시간</span></p> : null}
      <JourneyProgress character={character} progress={progress} remaining={remaining} durationMs={input.totalDuration} enabled={status === 'running' || status === 'paused'} isAdjusting={input.isAdjusting ?? false} adjustment={adjustment} trackRef={track} fillRef={fill} markerRef={marker} />
    </div>
    <JourneyPath character={character} promise={promise} animation={animation} input={input} theme={theme} season={season} sceneRef={scene} wrapperRef={wrapper} bodyRef={body} goalRef={goal} />
    <div className={`journey-message ${arrived ? 'journey-message-finished' : ''}`} aria-hidden={arrived || undefined}>
      <p className="promise-reminder"><PromiseIcon id={promise.id} size={42} /> {activityReminder(promise, mode)}</p>
    </div>
  </section>;
}
