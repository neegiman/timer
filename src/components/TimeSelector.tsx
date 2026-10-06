import { Minus, Plus } from 'lucide-react';

const durations = [5, 10, 15, 20, 30];
export function TimeSelector({ minutes, onChange, customMode, onCustomMode }: {
  minutes: number; onChange: (value: number) => void; customMode: boolean; onCustomMode: (value: boolean) => void;
}) {
  return <fieldset className="selector-section">
    <legend><span className="step-number">2</span> 얼마나 기다릴까요?<span className="step-english">시간 선택</span></legend>
    <div className="time-grid">
      {durations.map((duration) => <button type="button" key={duration}
        className={`choice time-choice ${!customMode && minutes === duration ? 'selected' : ''}`}
        aria-pressed={!customMode && minutes === duration} onClick={() => { onCustomMode(false); onChange(duration); }}>
        <strong>{duration}</strong><span>분</span>
      </button>)}
      <button type="button" className={`choice time-choice custom-time ${customMode ? 'selected' : ''}`}
        aria-pressed={customMode} onClick={() => onCustomMode(true)}>직접<br />설정</button>
    </div>
    {customMode ? <div className="duration-input">
      <button type="button" className="icon-button" aria-label="1분 줄이기" disabled={minutes <= 1} onClick={() => onChange(Math.max(1, minutes - 1))}><Minus size={18} /></button>
      <label><input type="number" aria-label="직접 설정 시간" min={1} max={120} step={1} value={minutes}
        onChange={(event) => onChange(Math.min(120, Math.max(1, Math.round(Number(event.target.value) || 1))))} /> 분</label>
      <button type="button" className="icon-button" aria-label="1분 늘리기" disabled={minutes >= 120} onClick={() => onChange(Math.min(120, minutes + 1))}><Plus size={18} /></button>
      <small>1~120분</small>
    </div> : null}
  </fieldset>;
}
