import { Flag, Play } from 'lucide-react';
import type { TimerMode } from '@/types/timer';

export function ActivityModeSelector({ mode, onChange }: { mode: TimerMode; onChange: (mode: TimerMode) => void }) {
  return <fieldset className="activity-modes">
    <legend>언제 할까요?</legend>
    <div className="activity-mode-options">
      <button type="button" aria-pressed={mode === 'after'} onClick={() => onChange('after')}>
        <Play size={26} /><strong>활동 시작</strong><span>조금 뒤에 할래</span>
      </button>
      <button type="button" aria-pressed={mode === 'during'} onClick={() => onChange('during')}>
        <Flag size={26} /><strong>활동 마무리</strong><span>지금부터 할래</span>
      </button>
    </div>
  </fieldset>;
}
