import { activityMessageOptions, selectActivityMessage } from '@/lib/activityMessages';
import type { PromiseActivity, TimerMode } from '@/types/timer';
import type { journeyNotice } from '@/lib/journeyNotice';
import { PromiseIcon, StoryIcon } from '../StoryIcon';

export function JourneyMessage({ notice, promise, mode = 'after', totalDuration, sessionId }: {
  notice: ReturnType<typeof journeyNotice>; promise: PromiseActivity; mode?: TimerMode; totalDuration: number; sessionId: string;
}) {
  const { stage, visible, key } = notice;
  const message = selectActivityMessage(promise, mode, notice, totalDuration, sessionId);
  return <h1 className={`stage-message stage-${stage}`} role="status" aria-live={visible ? 'polite' : 'off'} aria-atomic="true" data-message-stage={stage}>
    {(['beginning', 'halfway', 'near', 'arrived'] as const).flatMap((item) => activityMessageOptions(promise, mode, item).map((text, index) =>
      <span key={`${item}-${index}`} className="message-reserve" aria-hidden="true">{text}</span>))}
    <span key={key} className="message-current" data-testid="journey-message" data-visible={visible} data-cue={key} data-message-id={message.id} aria-hidden={!visible}>{message.text}</span>
    <span className="message-quiet" data-testid="journey-quiet" data-visible={!visible} aria-hidden="true">
      <span className="quiet-stars">{[0, 1].map((star) => <span key={star} className="quiet-star"><StoryIcon name="star" size={star === 1 ? 23 : 17} /></span>)}</span>
      <span className="quiet-promise"><PromiseIcon id={promise.id} size={54} /></span>
      <span className="quiet-stars">{[0, 1].map((star) => <span key={star} className="quiet-star"><StoryIcon name="star" size={star === 1 ? 23 : 17} /></span>)}</span>
    </span>
  </h1>;
}
