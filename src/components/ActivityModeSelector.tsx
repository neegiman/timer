import { Flag, Play } from 'lucide-react';
import type { TimerMode } from '@/types/timer';

export function ActivityModeSelector({ mode, onChange }: { mode: TimerMode; onChange: (mode: TimerMode) => void }) {
  return <fieldset className="activity-modes">
    <legend>시간이 끝나면?</legend>
    <div className="activity-mode-options">
      <button type="button" aria-pressed={mode === 'after'} onClick={() => onChange('after')}>
        <Play size={26} /><strong>활동 시작</strong><span>끝나면 시작해요</span>
      </button>
      <button type="button" aria-pressed={mode === 'during'} onClick={() => onChange('during')}>
        <Flag size={26} /><strong>활동 마무리</strong><span>끝나면 마무리해요</span>
      </button>
    </div>
  </fieldset>;
}
