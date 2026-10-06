import { Check, Pencil } from 'lucide-react';
import { promises } from '@/lib/promises';
import type { PromiseActivity } from '@/types/timer';

export function PromiseSelector({ selected, onSelect, custom, onCustom, customMode, onCustomMode }: {
  selected: PromiseActivity; onSelect: (promise: PromiseActivity) => void;
  custom: string; onCustom: (value: string) => void; customMode: boolean; onCustomMode: () => void;
}) {
  return <fieldset className="selector-section">
    <legend><span className="step-number">1</span> 어떤 약속을 할까요?<span className="step-english">약속 선택</span></legend>
    <div className="promise-grid">
      {promises.map((promise) => <button key={promise.id} type="button"
        className={`choice promise-choice ${!customMode && selected.id === promise.id ? 'selected' : ''}`}
        aria-pressed={!customMode && selected.id === promise.id} onClick={() => onSelect(promise)}>
        <span className="choice-emoji" aria-hidden="true">{promise.icon}</span><span>{promise.name}</span>
        {!customMode && selected.id === promise.id ? <Check size={14} className="choice-check" /> : null}
      </button>)}
    </div>
    <button className={`custom-choice ${customMode ? 'active' : ''}`} type="button" onClick={onCustomMode} aria-expanded={customMode}>
      <Pencil size={13} /> 직접 약속 쓰기
    </button>
    {customMode ? <div className="custom-input"><label htmlFor="custom-promise">도착하면 무엇을 할까요?</label>
      <input id="custom-promise" value={custom} maxLength={40} onChange={(event) => onCustom(event.target.value)} placeholder="예: 책 한 권을 읽어요" autoFocus />
    </div> : null}
  </fieldset>;
}
