'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleHelp, Maximize, Minimize, Pause, Play, RotateCcw, Settings2, Star, Volume2, X } from 'lucide-react';
import { CharacterSelector } from './CharacterSelector';
import { PromiseSelector } from './PromiseSelector';
import { TimeSelector } from './TimeSelector';
import { VisualTimer } from './timer/VisualTimer';
import { StarReward } from './reward/StarReward';
import { RewardsView } from './reward/RewardsView';
import { ActivityModeSelector } from './ActivityModeSelector';
import { Modal } from './Modal';
import { SceneSettings } from './SceneSettings';
import { PromiseIcon, StoryIcon, type StoryIconName } from './StoryIcon';
import { useVisualTimer } from '@/hooks/useVisualTimer';
import { useRewards } from '@/hooks/useRewards';
import { useAnimationController } from '@/hooks/useAnimationController';
import { useAudio } from '@/hooks/useAudio';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useScreenWakeLock } from '@/hooks/useScreenWakeLock';
import { useDayNight } from '@/hooks/useDayNight';
import { isBoolean, isCharacterId, isDuration, useLocalStorage } from '@/hooks/useLocalStorage';
import { getCharacter } from '@/lib/characters';
import { defaultPromise, isPromise } from '@/lib/promises';
import { localDate } from '@/lib/timer';
import { activityReminder, durationLabel, isTimerMode } from '@/lib/activityMode';
import { boardProgress, changeGoal, claimReward, hasClaimed, mergeRewards, migrateLegacy, nextBoard } from '@/lib/rewards';
import type { Rewards } from '@/lib/rewards';
import type { PromiseActivity } from '@/types/timer';

const STEP_ICONS: readonly StoryIconName[] = ['bath', 'clock', 'rabbit'];

type ModalName = 'settings' | 'help' | 'restart' | 'exit' | 'rewards' | 'rewardSettings' | null;

export function TimerApp() {
  const appShell = useRef<HTMLDivElement>(null);
  const display = useFullscreen();
  const [selectedCharacter, setCharacter] = useLocalStorage('selectedCharacter', 'rabbit', isCharacterId);
  const [minutes, setMinutes] = useLocalStorage('selectedDuration', 10, isDuration);
  const [promise, setPromise] = useLocalStorage<PromiseActivity>('lastPromise', defaultPromise, isPromise);
  const [soundEnabled, setSoundEnabled] = useLocalStorage('soundEnabled', true, isBoolean);
  const [showNumericTime, setShowNumericTime] = useLocalStorage('showNumericTime', true, isBoolean);
  const [keepScreenAwake, setKeepScreenAwake] = useLocalStorage('keepScreenAwake', true, isBoolean);
  const [mode, setMode] = useLocalStorage('timerMode', 'after', isTimerMode);
  const [customDuration, setCustomDuration] = useState(false);
  const [setupStep, setSetupStep] = useState(0);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const [modal, setModal] = useState<ModalName>(null);
  const ready = promise.activity.trim().length > 0;
  const timer = useVisualTimer(ready);
  const keepAwakeActive = timer.status === 'running' || timer.status === 'arriving';
  const screenWakeLock = useScreenWakeLock(keepScreenAwake, keepAwakeActive);
  const appearance = useDayNight(timer.now);
  const animation = useAnimationController(timer);
  const { unlock, playOnce, stop, needsGesture } = useAudio(soundEnabled);
  const sessionId = timer.session?.id;

  useEffect(() => {
    if (timer.status === 'paused') { stop(); return; }
    if (sessionId && animation.state.sound && animation.state.soundKey) playOnce(animation.state.sound, `${sessionId}:${animation.state.soundKey}`);
  }, [timer.status, sessionId, animation.state.sound, animation.state.soundKey, playOnce, stop]);

  const date = timer.now ? localDate(new Date(timer.now)) : '';
  const rewardStore = useRewards(date);
  const { rewards, setRewards, legacy, today: todayCount, total: totalCount } = rewardStore;
  const character = getCharacter(timer.session?.characterId ?? selectedCharacter);
  const active = timer.session !== null;
  const completed = timer.status === 'completed';
  const awarded = useMemo(() => !!sessionId && hasClaimed(rewards, sessionId), [rewards, sessionId]);
  const sessionMode = timer.session?.mode ?? 'after';
  const collection = boardProgress(rewards);
  const updateGoal = useCallback((target: number) => setRewards((current) => changeGoal(migrateLegacy(current, legacy), target)), [setRewards, legacy]);
  const startNextBoard = useCallback(() => {
    const id = crypto.randomUUID(); const now = Date.now();
    setRewards((current) => nextBoard(migrateLegacy(current, legacy), id, now));
  }, [setRewards, legacy]);
  const importRewards = useCallback((incoming: Rewards) => setRewards((current) => mergeRewards(migrateLegacy(current, legacy), incoming)), [setRewards, legacy]);
  const customPromise = promise.id === 'custom';
  const durationIsCustom = customDuration || ![5, 10, 15, 20, 30].includes(minutes);
  const screenWakeLockMessage = !keepScreenAwake ? '휴대폰의 자동 잠금 설정을 따라요.'
    : screenWakeLock.status === 'active' ? '여행하는 동안 화면을 켜 두고 있어요.'
    : screenWakeLock.status === 'requesting' ? '화면 켜짐을 준비하고 있어요.'
    : screenWakeLock.status === 'unsupported' ? '이 브라우저는 지원하지 않아요. 최신 Safari 또는 Chrome으로 열어 주세요.'
    : screenWakeLock.status === 'unavailable' ? '화면 켜짐 유지가 해제됐어요. 저전력 모드를 끄고 다시 시도해 주세요.'
    : timer.status === 'paused' ? '일시정지 중에는 자동 잠금 설정을 따라요.'
    : '출발하면 화면을 켜 두고, 일시정지·완료 시 해제해요.';

  useEffect(() => { if (!active) stepHeading.current?.focus({ preventScroll: true }); }, [setupStep, active]);

  const scrollTop = (behavior: ScrollBehavior = 'auto') => {
    if (display.mode === 'expanded') appShell.current?.scrollTo({ top: 0, behavior });
    else window.scrollTo({ top: 0, behavior });
  };

  const startJourney = () => {
    if (!ready) return;
    stop();
    if (soundEnabled) unlock();
    timer.start(minutes, selectedCharacter, { ...promise, name: promise.name.trim(), activity: promise.activity.trim() }, mode);
    scrollTop('smooth');
  };
  const toggleSound = () => {
    if (soundEnabled) { stop(); setSoundEnabled(false); }
    else { setSoundEnabled(true); unlock(); }
  };
  const claimStar = () => {
    if (!timer.session || !completed || awarded) return;
    const session = timer.session;
    const earnedAt = Date.now();
    setRewards((previous) => claimReward(migrateLegacy(previous, legacy), session, earnedAt));
    if (soundEnabled) unlock();
    playOnce('success', `${sessionId}:success`);
  };
  const exit = () => { stop(); timer.exit(); setSetupStep(0); setModal(null); scrollTop(); };
  const restart = () => {
    stop();
    timer.restart();
    setModal(null);
    scrollTop();
    if (soundEnabled) unlock();
  };

  const changeStep = (step: number) => { setSetupStep(step); scrollTop('smooth'); };

  return <div ref={appShell} className="app-shell" data-status={timer.status} data-display={display.mode} data-theme={appearance.theme}>
    <header className="site-header">
      <div className="brand"><StoryIcon name="handshake" size={44} priority /><span>약속 여행</span></div>
      <div className="header-actions"><button type="button" className="stars-pill" aria-label={`별 달력 열기, 모은 별 ${totalCount}개, 오늘 ${todayCount}개`} onClick={() => setModal('rewards')}><StoryIcon name="star" size={28} /><strong data-testid="star-count">{totalCount}</strong></button>
        <button type="button" className="parent-menu-button" onClick={() => setModal('settings')}><Settings2 size={19} /><span>부모 메뉴</span></button>
      </div>
    </header>
    <p className="sr-only" aria-live="polite">{display.announcement}</p>

    <main>
      {active ? <div className="timer-layout">
          <VisualTimer character={character} promise={timer.session?.promise ?? promise} mode={sessionMode} progress={timer.progress}
            remaining={timer.remaining} minutes={timer.session ? timer.session.durationMs / 60_000 : minutes}
            status={timer.status} showNumericTime={showNumericTime} animation={animation.state} input={animation.input} sampledAt={animation.sampledAt} theme={appearance.theme} season={appearance.season} />
          {needsGesture && soundEnabled ? <button className="audio-recovery" onClick={unlock}><Volume2 size={22} /> 소리 켜기</button> : null}
          {completed ? <StarReward awarded={awarded} count={todayCount} total={totalCount} mode={sessionMode} goal={rewards.goal.target} filled={collection.filled} onAward={claimStar} onNewJourney={exit} onViewRewards={() => setModal('rewards')} /> : null}
        </div> : <section className="setup-card" aria-label="여행 준비">
          <nav className="setup-steps" aria-label="준비 단계">
            {['약속', '시간', '친구'].map((label, step) => <button key={label} type="button" className={setupStep === step ? 'current' : ''}
              aria-current={setupStep === step ? 'step' : undefined} disabled={step > setupStep && !ready} onClick={() => changeStep(step)}>
              <StoryIcon name={STEP_ICONS[step]} size={38} /><span>{label}</span>
            </button>)}
          </nav>
          <h1 tabIndex={-1} ref={stepHeading}>
            {['무엇을 할까요?', mode === 'after' ? '얼마 뒤에 시작할까?' : '얼마나 필요해?', '친구를 골라요!'][setupStep]}
          </h1>
          {setupStep === 0 ? <PromiseSelector selected={promise} onSelect={setPromise} customMode={customPromise}
            custom={customPromise ? promise.name : ''} onCustom={(name) => setPromise({ id: 'custom', icon: '🎨', name, activity: name })}
            onCustomMode={() => setPromise({ id: 'custom', icon: '🎨', name: '', activity: '' })} /> : null}
          {setupStep === 1 ? <><ActivityModeSelector mode={mode} onChange={setMode} /><TimeSelector minutes={minutes} onChange={setMinutes} customMode={durationIsCustom} onCustomMode={setCustomDuration} /><p className="parent-hint">{durationLabel(minutes, mode)}<br />시간은 어른이 골라 주세요.</p></> : null}
          {setupStep === 2 ? <><CharacterSelector selectedId={selectedCharacter} onSelect={setCharacter} /><p className="setup-summary"><PromiseIcon id={promise.id} size={36} /> {promise.name} · {durationLabel(minutes, mode)}</p><p className="activity-summary">{activityReminder(promise, mode, getCharacter(selectedCharacter).name)}</p></> : null}
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
      <div className="setting-row"><div><strong>화면 켜짐 유지</strong><p aria-live="polite" data-testid="screen-wake-lock-status" data-state={screenWakeLock.status}>{screenWakeLockMessage}</p></div><button type="button" className={`toggle ${keepScreenAwake ? 'on' : ''}`} role="switch" aria-checked={keepScreenAwake} aria-label="화면 켜짐 유지" onClick={() => setKeepScreenAwake(!keepScreenAwake)}><span /></button></div>
      {keepScreenAwake && keepAwakeActive && screenWakeLock.status === 'unavailable' ? <button type="button" className="text-button" onClick={() => { void screenWakeLock.retry(); }}>화면 켜짐 다시 시도</button> : null}
      <SceneSettings appearance={appearance} />
      <div className="setting-row"><div><strong>소리 ON / OFF</strong><p>출발과 도착을 다정한 소리로 알려요.</p></div><button className={`toggle ${soundEnabled ? 'on' : ''}`} role="switch" aria-checked={soundEnabled} aria-label="소리 ON/OFF" onClick={toggleSound}><span /></button></div>
      <div className="setting-row"><div><strong>숫자로 남은 시간 표시</strong><p>꺼도 위쪽 여행 길로 시간을 알 수 있어요.</p></div><button className={`toggle ${showNumericTime ? 'on' : ''}`} role="switch" aria-checked={showNumericTime} aria-label="숫자로 남은 시간 표시" onClick={() => setShowNumericTime(!showNumericTime)}><span /></button></div>
      <button className="display-mode-button" onClick={() => setModal('rewardSettings')}><StoryIcon name="star" size={28} />별 목표 · 달력 · 백업</button>
      <button className="text-button" onClick={() => setModal('help')}><CircleHelp size={20} /> 사용 안내</button>
    </Modal> : null}
    {modal === 'help' ? <Modal title="작은 기다림을 여행으로" onClose={() => setModal(null)}>
      <div className="help-steps"><p><span>1</span> 아이와 함께 지킬 약속을 골라요.</p><p><span>2</span> 활동 시작은 몇 분 뒤에 시작할지, 활동 마무리는 지금부터 몇 분 동안 할지 정해요.</p><p><span>3</span> 친구가 도착하면 약속한 일을 시작하거나 마무리해요.</p><p><span><Star size={14} /></span> 실제 약속을 지킨 뒤 별 하나를 선물해요!</p></div>
      <p className="modal-description">여행 중에는 화면 켜짐 유지를 자동으로 요청해요. 부모 메뉴에서 끌 수 있어요. 저전력 모드나 브라우저 설정에 따라 화면이 잠길 수 있으며, 직접 누른 잠금 버튼은 막지 않아요.</p>
      <p className="modal-description">화면이 잠기거나 다른 탭에 가도 시간은 흘러요. 돌아오면 위쪽 작은 친구가 알맞은 위치에 있고, 진행 중인 여행은 화면 켜짐 유지를 다시 요청해요.</p>
      <p className="modal-description">휴대폰에서는 출발!을 누를 때 소리를 준비해요. 화면 잠금 중에는 소리가 늦어질 수 있어요. 돌아온 뒤 소리 안내를 누르면 다시 켤 수 있어요.</p>
      <p className="settings-note">⭐ 별은 칭찬이에요. 여행 하나에 별 하나를 받고, 날짜별 달력에 자동으로 누적돼요. 상단 별을 누르면 달력을 볼 수 있어요. 목표는 1~1,000개로 정할 수 있고, 별은 줄어들지 않아요.</p>
    </Modal> : null}
    {modal === 'rewards' || modal === 'rewardSettings' ? <Modal title="우리의 별 이야기" onClose={() => setModal(null)}>
      <RewardsView key={modal} rewards={rewards} today={date} initialTab={modal === 'rewardSettings' ? 'settings' : 'calendar'}
        onGoal={updateGoal} onNextBoard={startNextBoard} onImport={importRewards} />
    </Modal> : null}
    {modal === 'restart' || modal === 'exit' ? <Modal title={modal === 'restart' ? '다시 출발할까요?' : '여행을 마칠까요?'} onClose={() => setModal(null)}>
      <p className="modal-description">{modal === 'restart' ? '친구가 출발점으로 돌아가고, 처음 정한 시간으로 다시 시작해요.' : '이번 여행을 마치고 새로운 약속을 준비해요. 모은 별은 그대로 남아요.'}</p>
      <div className="confirmation-actions"><button className="secondary-button" onClick={() => setModal(null)}>돌아가기</button><button className="primary-button" onClick={modal === 'restart' ? restart : exit}><Check size={17} />{modal === 'restart' ? '다시 출발' : '여행 마치기'}</button></div>
    </Modal> : null}
  </div>;
}
