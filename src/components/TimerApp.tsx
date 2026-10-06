'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronDown, CircleHelp, Heart, Leaf, Pause, Play, RotateCcw, Settings2, ShieldCheck, Sparkles, Star, Volume2, VolumeX, X } from 'lucide-react';
import { CharacterSelector } from './CharacterSelector';
import { PromiseSelector } from './PromiseSelector';
import { TimeSelector } from './TimeSelector';
import { VisualTimer } from './timer/VisualTimer';
import { StarReward } from './reward/StarReward';
import { Modal } from './Modal';
import { useVisualTimer } from '@/hooks/useVisualTimer';
import { useAudio } from '@/hooks/useAudio';
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
  const [selectedCharacter, setCharacter] = useLocalStorage('selectedCharacter', 'rabbit', isCharacterId);
  const [minutes, setMinutes] = useLocalStorage('selectedDuration', 10, isDuration);
  const [promise, setPromise] = useLocalStorage<PromiseActivity>('lastPromise', defaultPromise, isPromise);
  const [soundEnabled, setSoundEnabled] = useLocalStorage('soundEnabled', true, isBoolean);
  const [showNumericTime, setShowNumericTime] = useLocalStorage('showNumericTime', true, isBoolean);
  const [stars, setStars] = useLocalStorage('todayStars', EMPTY_STARS, isStars);
  const [customDuration, setCustomDuration] = useState(false);
  const [modal, setModal] = useState<ModalName>(null);
  const ready = promise.activity.trim().length > 0;
  const timer = useVisualTimer(ready);
  const { unlock, playOnce, stop, needsGesture } = useAudio(soundEnabled);
  const sessionId = timer.session?.id;
  const arrivalTimestamp = timer.session?.arrivalTimestamp;

  useEffect(() => {
    if (timer.status === 'running' && timer.progress >= 0.95 && sessionId) playOnce('almost', `${sessionId}:almost`);
    if ((timer.status === 'arriving' || timer.status === 'completed') && sessionId && arrivalTimestamp !== null && arrivalTimestamp !== undefined && timer.now >= arrivalTimestamp + 650) {
      playOnce('finish', `${sessionId}:finish`);
    }
  }, [timer.status, timer.progress, timer.now, sessionId, arrivalTimestamp, playOnce]);

  const date = timer.now ? localDate(new Date(timer.now)) : '';
  const todayCount = stars.date === date ? stars.count : 0;
  const character = getCharacter(timer.session?.characterId ?? selectedCharacter);
  const active = timer.session !== null;
  const completed = timer.status === 'completed';
  const awarded = !!sessionId && stars.awardedSessions.includes(sessionId);
  const customPromise = promise.id === 'custom';
  const durationIsCustom = customDuration || ![5, 10, 15, 20, 30].includes(minutes);

  const startJourney = () => {
    if (!ready) return;
    stop();
    if (soundEnabled) unlock();
    const id = timer.start(minutes, selectedCharacter, { ...promise, name: promise.name.trim(), activity: promise.activity.trim() });
    playOnce('start', `${id}:start`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
  const exit = () => { stop(); timer.exit(); setModal(null); };
  const restart = () => {
    stop();
    if (soundEnabled) unlock();
    const id = timer.restart();
    if (id) playOnce('start', `${id}:start`);
    setModal(null);
  };

  return <div className="app-shell" data-status={timer.status}>
    <header className="site-header">
      <div className="brand"><span className="brand-mark" aria-hidden="true"><span>✦</span><span className="brand-ear" /></span><div><span className="brand-name">약속 여행<span className="brand-dot">.</span></span><span className="brand-tagline">작은 기다림, 즐거운 약속</span></div></div>
      <div className="header-actions"><span className="stars-pill"><Star size={16} fill="currentColor" /><span>오늘의 별</span><strong data-testid="star-count">{todayCount}</strong></span>
        <button type="button" className="icon-button settings-button" aria-label="설정" onClick={() => setModal('settings')}><Settings2 size={20} /></button>
      </div>
    </header>

    <main>
      <div className={`intro ${active ? 'active-intro' : ''}`}>
        <span className="eyebrow"><span /> LITTLE JOURNEY, BIG PROMISE</span>
        <h1>{active ? completed ? <>기다림 끝에,<br className="mobile-break" /> 반짝이는 약속.</> : <>약속을 향해,<br className="mobile-break" /> 천천히 함께 가요.</> : <>우리의 약속,<br className="mobile-break" /> 즐거운 여행이 되어요.</>}</h1>
        <p>{active ? '우리 친구가 도착하면, 약속한 일을 함께 해요.' : '시간을 재는 대신, 친구와 함께 약속을 향해 걸어가요.'}</p>
      </div>

      {active && needsGesture && soundEnabled ? <button className="audio-recovery" onClick={unlock}><Volume2 size={16} /> 소리를 켜려면 여기를 눌러 주세요</button> : null}

      <div className={`main-grid ${active ? 'timer-layout' : ''} ${completed ? 'completed-layout' : ''}`}>
        <div className="journey-column">
          <VisualTimer character={character} promise={timer.session?.promise ?? promise} progress={timer.progress}
            remaining={timer.remaining} minutes={timer.session ? timer.session.durationMs / 60_000 : minutes}
            status={timer.status} showNumericTime={showNumericTime} />
          {!active ? <div className="gentle-note"><span className="note-icon"><Leaf size={18} /></span><p>시간은 <strong>남은 거리</strong>로 느껴요.<br /><span>숫자를 몰라도, 우리 아이는 기다릴 수 있어요.</span></p></div> : null}
          {active && !completed ? <div className="active-bottom">
            <details className="parent-menu"><summary><Settings2 size={15} /> 부모 메뉴 <ChevronDown size={15} /></summary>
              <div className="parent-controls">
                {(timer.status === 'running' || timer.status === 'paused') ? <button onClick={timer.status === 'running' ? timer.pause : () => { if (soundEnabled) unlock(); timer.resume(); }}>
                  {timer.status === 'running' ? <Pause size={17} /> : <Play size={17} />}{timer.status === 'running' ? '일시정지' : '계속'}
                </button> : null}
                <button onClick={() => setModal('restart')}><RotateCcw size={16} /> 처음부터</button>
                <button onClick={toggleSound} aria-pressed={soundEnabled}>{soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />} 소리 {soundEnabled ? 'ON' : 'OFF'}</button>
                <button onClick={() => setModal('exit')}><X size={17} /> 종료</button>
              </div>
            </details>
          </div> : null}
        </div>

        {!active ? <section className="setup-card" aria-label="여행 준비">
          <div className="setup-heading"><div><span className="setup-kicker">READY, SET, GO!</span><h2>여행을 준비해요</h2></div><span className="setup-doodle" aria-hidden="true">✳</span></div>
          <PromiseSelector selected={promise} onSelect={setPromise} customMode={customPromise}
            custom={customPromise ? promise.name : ''} onCustom={(name) => setPromise({ id: 'custom', icon: '🎨', name, activity: name })}
            onCustomMode={() => setPromise({ id: 'custom', icon: '🎨', name: '', activity: '' })} />
          <TimeSelector minutes={minutes} onChange={setMinutes} customMode={durationIsCustom} onCustomMode={setCustomDuration} />
          <CharacterSelector selectedId={selectedCharacter} onSelect={setCharacter} />
          <button className="primary-button start-button" onClick={startJourney} disabled={!ready}><Play size={17} fill="currentColor" /><span>출발!</span><ArrowRight size={21} /></button>
          <p className="start-caption"><Heart size={12} /> 서두르지 않아도 괜찮아요. 함께 가면 되니까요.</p>
        </section> : completed ? <StarReward awarded={awarded} count={todayCount} onAward={claimStar} onNewJourney={exit} /> : null}
      </div>

      {!active ? <div className="feature-row"><span><Leaf size={16} /> 아이의 속도로</span><span><Heart size={16} /> 다정한 기다림</span><span><ShieldCheck size={16} /> 광고 없이, 안전하게</span></div> : null}
    </main>

    <footer className="site-footer"><p>작은 약속을 지키는, 커다란 마음을 위해 <span>♡</span></p><button className="text-button" onClick={() => setModal('help')}><CircleHelp size={14} /> 여행 안내</button></footer>

    {modal === 'settings' ? <Modal title="우리 여행 설정" onClose={() => setModal(null)}>
      <p className="modal-description">아이에게 편안한 여행으로 맞춰 주세요.</p>
      <div className="setting-row"><div><strong>소리 ON / OFF</strong><p>출발과 도착을 다정한 소리로 알려요.</p></div><button className={`toggle ${soundEnabled ? 'on' : ''}`} role="switch" aria-checked={soundEnabled} aria-label="소리 ON/OFF" onClick={toggleSound}><span /></button></div>
      <div className="setting-row"><div><strong>숫자로 남은 시간 표시</strong><p>꺼도 친구의 위치로 시간을 알 수 있어요.</p></div><button className={`toggle ${showNumericTime ? 'on' : ''}`} role="switch" aria-checked={showNumericTime} aria-label="숫자로 남은 시간 표시" onClick={() => setShowNumericTime(!showNumericTime)}><span /></button></div>
      <p className="settings-note"><Sparkles size={15} /> 설정과 별은 이 기기에 저장돼요.</p>
    </Modal> : null}
    {modal === 'help' ? <Modal title="작은 기다림을 여행으로" onClose={() => setModal(null)}>
      <div className="help-steps"><p><span>1</span> 아이와 함께 지킬 약속을 골라요.</p><p><span>2</span> 기다릴 시간과 여행 친구를 정해요.</p><p><span>3</span> 친구가 도착하면 약속한 일을 해요.</p><p><span><Star size={14} /></span> 약속을 지켰다면 별 하나를 선물해요!</p></div>
      <p className="modal-description">화면이 잠기거나 다른 탭에 가도 시간은 흘러요. 돌아오면 친구가 알맞은 위치에서 기다리고 있어요.</p>
      <p className="modal-description">휴대폰에서는 출발!을 누를 때 소리를 준비해요. 화면 잠금 중에는 소리가 늦어질 수 있어요. 돌아온 뒤 소리 안내를 누르면 다시 켤 수 있어요.</p>
      <p className="settings-note"><Heart size={15} /> 별은 칭찬이에요. 줄어들거나 사라지지 않아요.<br />오늘의 별은 매일 새로 시작해요.</p>
    </Modal> : null}
    {modal === 'restart' || modal === 'exit' ? <Modal title={modal === 'restart' ? '다시 출발할까요?' : '여행을 마칠까요?'} onClose={() => setModal(null)}>
      <p className="modal-description">{modal === 'restart' ? '친구가 출발점으로 돌아가고, 처음 정한 시간으로 다시 시작해요.' : '이번 여행을 마치고 새로운 약속을 준비해요. 모은 별은 그대로 남아요.'}</p>
      <div className="confirmation-actions"><button className="secondary-button" onClick={() => setModal(null)}>돌아가기</button><button className="primary-button" onClick={modal === 'restart' ? restart : exit}><Check size={17} />{modal === 'restart' ? '다시 출발' : '여행 마치기'}</button></div>
    </Modal> : null}
  </div>;
}
