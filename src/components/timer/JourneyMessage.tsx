import { JOURNEY_MESSAGES } from '@/lib/animation';
import type { journeyNotice } from '@/lib/journeyNotice';
import { PromiseIcon, StoryIcon } from '../StoryIcon';

export function JourneyMessage({ notice, promiseId }: { notice: ReturnType<typeof journeyNotice>; promiseId: string }) {
  const { stage, visible, key } = notice;
  return <h1 className={`stage-message stage-${stage}`} role="status" aria-live={visible ? 'polite' : 'off'} aria-atomic="true" data-message-stage={stage}>
    {(['halfway', 'near', 'arrived'] as const).map((item) => <span key={item} className="message-reserve" aria-hidden="true">{JOURNEY_MESSAGES[item]}</span>)}
    <span key={key} className="message-current" data-testid="journey-message" data-visible={visible} data-cue={key} aria-hidden={!visible}>{JOURNEY_MESSAGES[stage]}</span>
    <span className="message-quiet" data-testid="journey-quiet" data-visible={!visible} aria-hidden="true">
      <span className="quiet-stars">{[0, 1].map((star) => <span key={star} className="quiet-star"><StoryIcon name="star" size={star === 1 ? 23 : 17} /></span>)}</span>
      <span className="quiet-promise"><PromiseIcon id={promiseId} size={54} /></span>
      <span className="quiet-stars">{[0, 1].map((star) => <span key={star} className="quiet-star"><StoryIcon name="star" size={star === 1 ? 23 : 17} /></span>)}</span>
    </span>
  </h1>;
}
