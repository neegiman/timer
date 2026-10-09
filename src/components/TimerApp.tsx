'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleHelp, Maximize, Minimize, Pause, Play, RotateCcw, Settings2, Star, Volume2, X } from 'lucide-react';
import { CharacterSelector } from './CharacterSelector';
import { PromiseSelector } from './PromiseSelector';
import { TimeSelector } from './TimeSelector';
import { VisualTimer } from './timer/VisualTimer';
import { StarReward } from './reward/StarReward';
import { Modal } from './Modal';
import { SceneSettings } from './SceneSettings';
import { useVisualTimer } from '@/hooks/useVisualTimer';
import { useAnimationController } from '@/hooks/useAnimationController';
import { useAudio } from '@/hooks/useAudio';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useDayNight } from '@/hooks/useDayNight';
import { isBoolean, isCharacterId, isDuration, useLocalStorage } from '@/hooks/useLocalStorage';
import { getCharacter } from '@/lib/characters';
import { defaultPromise, isPromise } from '@/lib/promises';
import { awardStar, localDate } from '@/lib/timer';
import type { PromiseActivity, TodayStars } from '@/types/timer';

const EMPTY_STARS: TodayStars = { date: '', count: 0, awardedSessions: [] };
function isStars(value: unknown): value is TodayStars {
  if (!value || typeof value !== 'object') return false;
  const stars = value as Partial<TodayStars>;
  return typeof stars.date === 'string' && typeof stars.count === 'number' && Number.isInteger(stars.count) && stars.count >= 0 &&
    Array.isArray(stars.awardedSessions) && stars.awardedSessions.every((id) => typeof id === 'string');
}

type ModalName = 'settings' | 'help' | 'restart' | 'exit' | null;

export function TimerApp() {
  const appShell = useRef<HTMLDivElement>(null);
  const display = useFullscreen();
  const [selectedCharacter, setCharacter] = useLocalStorage('selectedCharacter', 'rabbit', isCharacterId);
  const [minutes, setMinutes] = useLocalStorage('selectedDuration', 10, isDuration);
  const [promise, setPromise] = useLocalStorage<PromiseActivity>('lastPromise', defaultPromise, isPromise);
  const [soundEnabled, setSoundEnabled] = useLocalStorage('soundEnabled', true, isBoolean);
  const [showNumericTime, setShowNumericTime] = useLocalStorage('showNumericTime', true, isBoolean);
  const [stars, setStars] = useLocalStorage('todayStars', EMPTY_STARS, isStars);
  const [customDuration, setCustomDuration] = useState(false);
  const [setupStep, setSetupStep] = useState(0);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const [modal, setModal] = useState<ModalName>(null);
  const ready = promise.activity.trim().length > 0;
  const timer = useVisualTimer(ready);
  const appearance = useDayNight(timer.now);
  const animation = useAnimationController(timer);
  const { unlock, playOnce, stop, needsGesture } = useAudio(soundEnabled);
  const sessionId = timer.session?.id;

  useEffect(() => {
    if (timer.status === 'paused') { stop(); return; }
    if (sessionId && animation.state.sound && animation.state.soundKey) playOnce(animation.state.sound, `${sessionId}:${animation.state.soundKey}`);
  }, [timer.status, sessionId, animation.state.sound, animation.state.soundKey, playOnce, stop]);

  const date = timer.now ? localDate(new Date(timer.now)) : '';
  const todayCount = stars.date === date ? stars.count : 0;
  const character = getCharacter(timer.session?.characterId ?? selectedCharacter);
  const active = timer.session !== null;
  const completed = timer.status === 'completed';
  const awarded = !!sessionId && stars.awardedSessions.includes(sessionId);
  const customPromise = promise.id === 'custom';
  const durationIsCustom = customDuration || ![5, 10, 15, 20, 30].includes(minutes);

  useEffect(() => { if (!active) stepHeading.current?.focus({ preventScroll: true }); }, [setupStep, active]);

  const scrollTop = (behavior: ScrollBehavior = 'auto') => {
    if (display.mode === 'expanded') appShell.current?.scrollTo({ top: 0, behavior });
    else window.scrollTo({ top: 0, behavior });
  };

  const startJourney = () => {
    if (!ready) return;
    stop();
    if (soundEnabled) unlock();
    timer.start(minutes, selectedCharacter, { ...promise, name: promise.name.trim(), activity: promise.activity.trim() });
    scrollTop('smooth');
  };
  const toggleSound = () => {
    if (soundEnabled) { stop(); setSoundEnabled(false); }
    else { setSoundEnabled(true); unlock(); }
  };
  const claimStar = () => {
    if (!sessionId || !completed || awarded) return;
    setStars((previous) => awardStar(previous, sessionId, localDate()));
    if (soundEnabled) unlock();
    playOnce('success', `${sessionId}:success`);
  };
  const exit = () => { stop(); timer.exit(); setSetupStep(0); setModal(null); scrollTop(); };
  const restart = () => {
    stop();
    if (soundEnabled) unlock();
    timer.restart();
    setModal(null);
  };

  const changeStep = (step: number) => { setSetupStep(step); scrollTop('smooth'); };

  return <div ref={appShell} className="app-shell" data-status={timer.status} data-display={display.mode} data-theme={appearance.theme}>
    <header className="site-header">
      <div className="brand"><span aria-hidden="true">🌱</span><span>약속 여행</span></div>
      <div className="header-actions"><span className="stars-pill" aria-label={`오늘의 별 ${todayCount}개`}><Star size={24} fill="currentColor" /><strong data-testid="star-count">{todayCount}</strong></span>
        <button type="button" className="parent-menu-button" onClick={() => setModal('settings')}><Settings2 size={19} /><span>부모 메뉴</span></button>
      </div>
    </header>
    <p className="sr-only" aria-live="polite">{display.announcement}</p>

    <main>
      {active && needsGesture && soundEnabled ? <button className="audio-recovery" onClick={unlock}><Volume2 size={22} /> 소리 켜기</button> : null}

      {active ? <div className="timer-layout">
          <VisualTimer character={character} promise={timer.session?.promise ?? promise} progress={timer.progress}
            remaining={timer.remaining} minutes={timer.session ? timer.session.durationMs / 60_000 : minutes}
            status={timer.status} showNumericTime={showNumericTime} animation={animation.state} input={animation.input} sampledAt={animation.sampledAt} theme={appearance.theme} season={appearance.season} />
          {completed ? <StarReward awarded={awarded} count={todayCount} onAward={claimStar} onNewJourney={exit} /> : null}
        </div> : <section className="setup-card" aria-label="여행 준비">
          <nav className="setup-steps" aria-label="준비 단계">
            {['약속', '시간', '친구'].map((label, step) => <button key={label} type="button" className={setupStep === step ? 'current' : ''}
              aria-current={setupStep === step ? 'step' : undefined} disabled={step > setupStep && !ready} onClick={() => changeStep(step)}>
              <span aria-hidden="true">{['🛁', '⏰', '🐰'][step]}</span><span>{label}</span>
            </button>)}
          </nav>
          <h1 tabIndex={-1} ref={stepHeading}>
            {['무엇을 할까요?', '얼마나 필요해?', '친구를 골라요!'][setupStep]}
          </h1>
          {setupStep === 0 ? <PromiseSelector selected={promise} onSelect={setPromise} customMode={customPromise}
            custom={customPromise ? promise.name : ''} onCustom={(name) => setPromise({ id: 'custom', icon: '🎨', name, activity: name })}
            onCustomMode={() => setPromise({ id: 'custom', icon: '🎨', name: '', activity: '' })} /> : null}
          {setupStep === 1 ? <><TimeSelector minutes={minutes} onChange={setMinutes} customMode={durationIsCustom} onCustomMode={setCustomDuration} /><p className="parent-hint">시간은 어른이 골라 주세요.</p></> : null}
          {setupStep === 2 ? <><CharacterSelector selectedId={selectedCharacter} onSelect={setCharacter} /><p className="setup-summary"><span aria-hidden="true">{promise.icon}</span> {promise.name} · {minutes}분</p></> : null}
          <div className="setup-actions">
            {setupStep > 0 ? <button className="back-button" aria-label="뒤로" onClick={() => changeStep(setupStep - 1)}><ArrowLeft size={24} /></button> : null}
            <button className="primary-button" onClick={setupStep === 2 ? startJourney : () => changeStep(setupStep + 1)} disabled={!ready}>
              {setupStep === 2 ? <Play size={24} fill="currentColor" /> : null}<span>{setupStep === 2 ? '출발!' : '다음'}</span><ArrowRight size={24} />
            </button>
          </div>
        </section>}
    </main>

    {modal === 'settings' ? <Modal title="부모 메뉴" onClose={() => setModal(null)}>
      {active ? <><p className="modal-description">{timer.session!.durationMs / 60_000}분 · {timer.session!.promise.name}</p><div className="parent-controls">
        {timer.status === 'running' || timer.status === 'paused' ? <button onClick={() => {
          if (timer.status === 'running') timer.pause(); else { if (soundEnabled) unlock(); timer.resume(); }
          setModal(null);
        }}>{timer.status === 'running' ? <Pause size={24} /> : <Play size={24} />}{timer.status === 'running' ? '일시정지' : '계속'}</button> : null}
        <button onClick={() => setModal('restart')}><RotateCcw size={24} /> 처음부터</button>
        <button onClick={() => setModal('exit')}><X size={24} /> 종료</button>
      </div></> : null}
      <button type="button" className="display-mode-button" aria-pressed={display.mode !== 'window'} disabled={display.changing}
        onClick={() => { void display.toggle(); setModal(null); }}>
        {display.mode === 'window' ? <Maximize size={24} /> : <Minimize size={24} />}{display.label}
      </button>
      <p className="display-mode-hint">{display.mode === 'expanded' || !display.nativeSupported ? '페이지 안에서 여행 화면을 크게 보여요.' : '여행 화면을 크게 보여요. 끝낼 때는 부모 메뉴나 Esc를 눌러요.'}</p>
      <SceneSettings appearance={appearance} />
      <div className="setting-row"><div><strong>소리 ON / OFF</strong><p>출발과 도착을 다정한 소리로 알려요.</p></div><button className={`toggle ${soundEnabled ? 'on' : ''}`} role="switch" aria-checked={soundEnabled} aria-label="소리 ON/OFF" onClick={toggleSound}><span /></button></div>
      <div className="setting-row"><div><strong>숫자로 남은 시간 표시</strong><p>꺼도 위쪽 여행 길로 시간을 알 수 있어요.</p></div><button className={`toggle ${showNumericTime ? 'on' : ''}`} role="switch" aria-checked={showNumericTime} aria-label="숫자로 남은 시간 표시" onClick={() => setShowNumericTime(!showNumericTime)}><span /></button></div>
      <button className="text-button" onClick={() => setModal('help')}><CircleHelp size={20} /> 사용 안내</button>
    </Modal> : null}
    {modal === 'help' ? <Modal title="작은 기다림을 여행으로" onClose={() => setModal(null)}>
      <div className="help-steps"><p><span>1</span> 아이와 함께 지킬 약속을 골라요.</p><p><span>2</span> 기다릴 시간과 여행 친구를 정해요.</p><p><span>3</span> 친구가 도착하면 약속한 일을 해요.</p><p><span><Star size={14} /></span> 약속을 지켰다면 별 하나를 선물해요!</p></div>
      <p className="modal-description">화면이 잠기거나 다른 탭에 가도 시간은 흘러요. 돌아오면 위쪽 작은 친구가 알맞은 위치에 있어요.</p>
      <p className="modal-description">휴대폰에서는 출발!을 누를 때 소리를 준비해요. 화면 잠금 중에는 소리가 늦어질 수 있어요. 돌아온 뒤 소리 안내를 누르면 다시 켤 수 있어요.</p>
      <p className="settings-note">⭐ 별은 칭찬이에요. 오늘의 별은 매일 새로 시작해요.</p>
    </Modal> : null}
    {modal === 'restart' || modal === 'exit' ? <Modal title={modal === 'restart' ? '다시 출발할까요?' : '여행을 마칠까요?'} onClose={() => setModal(null)}>
      <p className="modal-description">{modal === 'restart' ? '친구가 출발점으로 돌아가고, 처음 정한 시간으로 다시 시작해요.' : '이번 여행을 마치고 새로운 약속을 준비해요. 모은 별은 그대로 남아요.'}</p>
      <div className="confirmation-actions"><button className="secondary-button" onClick={() => setModal(null)}>돌아가기</button><button className="primary-button" onClick={modal === 'restart' ? restart : exit}><Check size={17} />{modal === 'restart' ? '다시 출발' : '여행 마치기'}</button></div>
    </Modal> : null}
  </div>;
}
