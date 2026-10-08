import { useState } from 'react';
import { JOURNEY_MESSAGES } from '@/lib/animation';
import type { JourneyStage } from '@/types/animation';

export function JourneyMessage({ stage }: { stage: JourneyStage }) {
  const [shown, setShown] = useState(stage);
  const [previous, setPrevious] = useState<JourneyStage | null>(null);
  // A guarded adjustment updates once per milestone, not per clock tick or pause/resume.
  if (shown !== stage) { setPrevious(shown); setShown(stage); }
  return <h1 className={`stage-message stage-${stage}`} role="status" data-message-stage={stage}>
    {(['halfway', 'near', 'arrived'] as const).map((item) => <span key={item} className="message-reserve" aria-hidden="true">{JOURNEY_MESSAGES[item]}</span>)}
    {previous ? <span className="message-past" aria-hidden="true" onAnimationEnd={() => setPrevious(null)}>{JOURNEY_MESSAGES[previous]}</span> : null}
    <span key={shown} className={`message-current ${previous ? 'message-entering' : ''}`} data-testid="journey-message">{JOURNEY_MESSAGES[shown]}</span>
  </h1>;
}
