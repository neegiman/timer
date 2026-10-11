import { Check } from 'lucide-react';
import { PromiseIcon, StoryIcon } from './StoryIcon';
import { promises } from '@/lib/promises';
import type { PromiseActivity } from '@/types/timer';

export function PromiseSelector({ selected, onSelect, custom, onCustom, customMode, onCustomMode }: {
  selected: PromiseActivity; onSelect: (promise: PromiseActivity) => void;
  custom: string; onCustom: (value: string) => void; customMode: boolean; onCustomMode: () => void;
}) {
  return <fieldset className="selector-section">
    <legend className="sr-only">약속 선택</legend>
    <div className="promise-grid">
      {promises.map((promise) => <button key={promise.id} type="button"
        className={`choice promise-choice ${!customMode && selected.id === promise.id ? 'selected' : ''}`}
        aria-pressed={!customMode && selected.id === promise.id} onClick={() => onSelect(promise)}>
        <PromiseIcon id={promise.id} size={80} className="promise-choice-icon" /><span>{promise.name}</span>
        {!customMode && selected.id === promise.id ? <Check size={22} className="choice-check" /> : null}
      </button>)}
    </div>
    <button className={`custom-choice ${customMode ? 'active' : ''}`} type="button" onClick={onCustomMode} aria-expanded={customMode}>
      <StoryIcon name="custom" size={40} /> 직접 약속 쓰기
    </button>
    {customMode ? <div className="custom-input"><label htmlFor="custom-promise">활동 이름</label>
      <input id="custom-promise" value={custom} maxLength={40} onChange={(event) => onCustom(event.target.value)} placeholder="예: 책 읽기, 그림 그리기" autoFocus />
    </div> : null}
  </fieldset>;
}
