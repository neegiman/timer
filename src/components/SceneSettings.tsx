import type { useDayNight } from '@/hooks/useDayNight';
import { SEASONS } from '@/lib/seasons';

export function SceneSettings({ appearance }: { appearance: ReturnType<typeof useDayNight> }) {
  const { mode, setMode, theme, season, seasonMode, setSeasonMode, source, status, locationEnabled, enableLocation, disableLocation } = appearance;
  const description = source === 'manual' ? '고른 배경을 계속 보여요.'
    : source === 'location' ? '현재 위치의 일출·일몰에 맞추고 있어요.'
    : status === 'denied' ? '위치가 허용되지 않아 기기 시간으로 맞추고 있어요.'
    : status === 'timeout' || status === 'unavailable' ? '위치를 확인할 수 없어 기기 시간으로 맞추고 있어요.'
    : status === 'pending' && locationEnabled ? '위치를 확인하고 있어요. 기다리는 동안에는 기기 시간을 사용해요.'
    : '기기 시간으로 맞춰요. 오전 6시부터 오후 6시까지 낮이에요.';
  return <fieldset className="scene-settings">
    <legend>하늘과 배경</legend>
    <fieldset className="season-choices">
      <legend>계절 선택</legend>
      <div className="background-choices season-buttons">
        <button type="button" aria-label="계절 자동" aria-pressed={seasonMode === 'auto'} onClick={() => setSeasonMode('auto')}><span aria-hidden="true">🗓️</span>계절 자동</button>
        {(Object.keys(SEASONS) as (keyof typeof SEASONS)[]).map((value) =>
          <button key={value} type="button" aria-label={`${SEASONS[value].name} 배경`} aria-pressed={seasonMode === value} onClick={() => setSeasonMode(value)}>
            <span aria-hidden="true">{SEASONS[value].icon}</span>{SEASONS[value].name}
          </button>)}
      </div>
    </fieldset>
    <p className="scene-choice-label" id="sky-choice-label">낮 · 밤 선택</p>
    <div className="background-choices" role="group" aria-labelledby="sky-choice-label">
      {([['auto', '🌤️', '자동'], ['day', '☀️', '낮'], ['night', '🌙', '밤']] as const).map(([value, icon, name]) =>
        <button key={value} type="button" aria-label={`${name} 배경`} aria-pressed={mode === value} onClick={() => setMode(value)}>
          <span aria-hidden="true">{icon}</span>{name}
        </button>)}
    </div>
    <p className="scene-setting-status" data-testid="location-status" aria-live="polite">
      <strong>{SEASONS[season].icon} {SEASONS[season].name} · {theme === 'day' ? '☀️ 낮 배경' : '🌙 밤 배경'}</strong><span>{description}</span>
    </p>
    <p className="season-setting-note">계절과 낮·밤을 직접 골라 배경을 확인할 수 있어요. {seasonMode === 'auto' ? '계절 자동은 대한민국 달력에 맞춰 봄(3~5월) · 여름(6~8월) · 가을(9~11월) · 겨울(12~2월)로 바뀌어요.' : `지금은 ${SEASONS[season].name}으로 고정했어요. ‘계절 자동’을 누르면 대한민국 달력에 맞춰 돌아가요.`}</p>
    <p className="season-setting-note scene-event-note">낮에는 계절마다 다른 새가, 밤에는 별똥별이 가끔 지나가요.</p>
    {mode === 'auto' ? <div className="location-controls">
      {source !== 'location' ? <button type="button" className="location-button" disabled={locationEnabled && status === 'pending'} onClick={enableLocation}>
        {locationEnabled && status === 'pending' ? '위치 확인 중…' : locationEnabled ? '현재 위치 다시 확인' : '현재 위치로 맞추기'}
      </button> : null}
      {locationEnabled ? <button type="button" className="text-button" onClick={disableLocation}>기기 시간만 사용</button> : null}
      <p>위치를 허용하면 현재 있는 곳의 낮과 밤을 알 수 있어요. 앱은 좌표를 저장하거나 서버로 보내지 않아요.</p>
    </div> : null}
  </fieldset>;
}
