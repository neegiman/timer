import { JOURNEY_MESSAGES } from '@/lib/animation';
import type { journeyNotice } from '@/lib/journeyNotice';

export function JourneyMessage({ notice }: { notice: ReturnType<typeof journeyNotice> }) {
  const { stage, visible, key } = notice;
  return <h1 className={`stage-message stage-${stage}`} role="status" aria-live={visible ? 'polite' : 'off'} aria-atomic="true" data-message-stage={stage}>
    {(['halfway', 'near', 'arrived'] as const).map((item) => <span key={item} className="message-reserve" aria-hidden="true">{JOURNEY_MESSAGES[item]}</span>)}
    <span key={key} className="message-current" data-testid="journey-message" data-visible={visible} data-cue={key} aria-hidden={!visible}>{JOURNEY_MESSAGES[stage]}</span>
  </h1>;
}
