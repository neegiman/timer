'use client';

import { memo, useId, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Download, Settings2, Upload } from 'lucide-react';
import { PromiseIcon, StoryIcon } from '../StoryIcon';
import { durationLabel, modeLabel } from '@/lib/activityMode';
import { localDate } from '@/lib/timer';
import { boardProgress, calendarDays, createBackup, GOAL_PRESETS, MAX_BACKUP_BYTES, mergeRewards, parseBackup, starsOnDate, totalStars } from '@/lib/rewards';
import type { Rewards } from '@/lib/rewards';

type Tab = 'calendar' | 'board' | 'settings';
export const RewardsView = memo(function RewardsView({ rewards, today, initialTab = 'calendar', onGoal, onNextBoard, onImport }: {
  rewards: Rewards; today: string; initialTab?: Tab; onGoal: (target: number) => void;
  onNextBoard: () => void; onImport: (incoming: Rewards) => void;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  return <div className="rewards-view">
    <p className="reward-total"><StoryIcon name="star" size={42} /><strong>모은 별 {totalStars(rewards)}개</strong><span>오늘 {starsOnDate(rewards, today)}개</span></p>
    <nav className="reward-tabs" aria-label="별 보기">
      <button aria-pressed={tab === 'calendar'} onClick={() => setTab('calendar')}><CalendarDays size={20} />별 달력</button>
      <button aria-pressed={tab === 'board'} onClick={() => setTab('board')}><StoryIcon name="star" size={22} />별 모으기</button>
      <button aria-pressed={tab === 'settings'} onClick={() => setTab('settings')}><Settings2 size={20} />설정</button>
    </nav>
    {tab === 'calendar' ? <StarCalendar rewards={rewards} today={today} /> : null}
    {tab === 'board' ? <StarCollection rewards={rewards} onNextBoard={onNextBoard} onSettings={() => setTab('settings')} /> : null}
    {tab === 'settings' ? <RewardSettings rewards={rewards} onGoal={onGoal} onImport={onImport} /> : null}
    <p className="reward-storage-note">별은 이 기기·브라우저에 저장돼요. 브라우저 데이터를 지우거나 기기를 바꾸기 전에 부모님이 백업해 주세요.</p>
  </div>;
});

function StarCalendar({ rewards, today }: { rewards: Rewards; today: string }) {
  const date = today || localDate();
  const [selected, setSelected] = useState(date);
  const [month, setMonth] = useState(() => date.slice(0, 7));
  const [year, monthNumber] = month.split('-').map(Number);
  const days = calendarDays(year, monthNumber - 1);
  const dayCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const record of rewards.records) counts.set(record.date, (counts.get(record.date) ?? 0) + 1);
    for (const entry of rewards.legacy) counts.set(entry.date, (counts.get(entry.date) ?? 0) + entry.count);
    return counts;
  }, [rewards.records, rewards.legacy]);
  const records = rewards.records.filter((record) => record.date === selected);
  const oldCount = rewards.legacy.find((entry) => entry.date === selected)?.count ?? 0;
  const shiftMonth = (direction: number) => {
    const next = new Date(year, monthNumber - 1 + direction, 1, 12);
    const nextDate = localDate(next);
    setMonth(nextDate.slice(0, 7)); setSelected(nextDate);
  };
  return <section className="star-calendar" aria-label="별 달력">
    <div className="calendar-heading">
      <button className="icon-button" aria-label="이전 달" disabled={year <= 1900 && monthNumber === 1} onClick={() => shiftMonth(-1)}><ChevronLeft /></button>
      <h3>{year}년 {monthNumber}월</h3>
      <button className="icon-button" aria-label="다음 달" disabled={year >= 9999 && monthNumber === 12} onClick={() => shiftMonth(1)}><ChevronRight /></button>
    </div>
    <button className="text-button calendar-today" onClick={() => { setMonth(date.slice(0, 7)); setSelected(date); }}>오늘 보기</button>
    <div className="calendar-grid" role="group" aria-label={`${year}년 ${monthNumber}월 날짜`}>
      {['일', '월', '화', '수', '목', '금', '토'].map((day) => <span className="calendar-weekday" key={day}>{day}</span>)}
      {days.map((day, index) => day ? <button key={day} className={`calendar-day ${day === date ? 'is-today' : ''}`}
        aria-pressed={selected === day} aria-label={`${day}, 별 ${dayCounts.get(day) ?? 0}개`}
        onClick={() => setSelected(day)}>
        <span>{Number(day.slice(8))}</span>
        {(dayCounts.get(day) ?? 0) > 0 ? <span className="day-stars"><StoryIcon name="star" size={16} />{(dayCounts.get(day) ?? 0) >= 100 ? '99+' : dayCounts.get(day)}</span> : <span className="day-empty" aria-hidden="true">·</span>}
      </button> : <span key={`empty-${index}`} />)}
    </div>
    <div className="calendar-detail" aria-live="polite">
      <h3>{Number(selected.slice(5, 7))}월 {Number(selected.slice(8))}일 · 별 {dayCounts.get(selected) ?? 0}개</h3>
      {records.length === 0 && oldCount === 0 ? <p>이날 받은 별이 아직 없어요.<br />별을 받으면 여기에 자동으로 남아요.</p> : null}
      {oldCount > 0 ? <p className="legacy-record">이전에 모은 별 {oldCount}개<br /><small>예전 기록에는 약속·시간 정보가 없어요.</small></p> : null}
      <ul className="star-records">{records.map((record) => <li key={record.id}>
        <PromiseIcon id={record.promiseId} size={38} /><div><strong>{record.promiseName}</strong><span>{modeLabel(record.mode)} · {durationLabel(record.durationMinutes, record.mode)}</span></div><StoryIcon name="star" size={25} />
      </li>)}</ul>
    </div>
  </section>;
}

function StarCollection({ rewards, onNextBoard, onSettings }: { rewards: Rewards; onNextBoard: () => void; onSettings: () => void }) {
  const progress = boardProgress(rewards);
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(rewards.goal.target / 100);
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * 100;
  const count = Math.min(100, rewards.goal.target - start);
  return <section className="star-collection" aria-label="별 모으기">
    <h3>별 {rewards.goal.target}개를 모아 보자!</h3>
    <p className="board-progress" data-testid="board-progress">{progress.filled} / {rewards.goal.target}</p>
    <div className={`star-board ${count > 30 ? 'many-stars' : ''}`} role="img" aria-label={`목표 ${rewards.goal.target}개 중 ${progress.filled}개 모았어요`}>
      {Array.from({ length: count }, (_, index) => <span key={start + index} className={start + index < progress.filled ? 'filled' : 'empty'}><StoryIcon name="star" size={36} /></span>)}
    </div>
    {pageCount > 1 ? <div className="board-pages"><button className="icon-button" aria-label="이전 별 칸" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}><ChevronLeft /></button><span>{start + 1}~{start + count}번째 별</span><button className="icon-button" aria-label="다음 별 칸" disabled={safePage === pageCount - 1} onClick={() => setPage(safePage + 1)}><ChevronRight /></button></div> : null}
    {progress.complete ? <div className="board-complete" role="status"><StoryIcon name="star" size={48} /><h3>별판을 다 채웠어요!</h3><p>차곡차곡 모은 별, 정말 멋져요.</p>{progress.excess > 0 ? <p>별 {progress.excess}개는 다음 별판에 이어져요.</p> : null}<button className="primary-button" onClick={onNextBoard}>다음 별판 시작</button></div> : <p className="parent-hint">우리의 속도로 하나씩 모아요.</p>}
    <button className="text-button" onClick={onSettings}>부모님과 목표 정하기</button>
    {rewards.boards.length > 0 ? <div className="finished-boards"><h3>완성한 별판 {rewards.boards.length}개</h3><ul>{[...rewards.boards].reverse().map((board) => <li key={board.id}><StoryIcon name="star" size={26} /><span>{board.target}개 별판</span><time dateTime={localDate(new Date(board.completedAt))}>{localDate(new Date(board.completedAt))}</time></li>)}</ul></div> : null}
  </section>;
}

function RewardSettings({ rewards, onGoal, onImport }: { rewards: Rewards; onGoal: (target: number) => void; onImport: (incoming: Rewards) => void }) {
  const inputId = useId();
  const file = useRef<HTMLInputElement>(null);
  const [custom, setCustom] = useState(String(rewards.goal.target));
  const [feedback, setFeedback] = useState('');
  const [incoming, setIncoming] = useState<Rewards | null>(null);
  const [reading, setReading] = useState(false);
  const parsed = Number(custom);
  const valid = /^\d+$/.test(custom) && Number.isInteger(parsed) && parsed >= 1 && parsed <= 1000;
  const save = (target: number) => { onGoal(target); setCustom(String(target)); setFeedback(`목표를 별 ${target}개로 정했어요. 모은 별은 그대로예요.`); };
  const download = () => {
    const url = URL.createObjectURL(new Blob([createBackup(rewards, Date.now())], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `promise-journey-stars-${localDate()}.json`;
    document.body.append(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback('별 백업을 다운로드했어요. 파일 앱 등에 보관해 주세요.');
  };
  const read = async (selected: File | undefined) => {
    if (!selected) return;
    setReading(true); setIncoming(null); setFeedback('');
    try {
      if (selected.size > MAX_BACKUP_BYTES) throw new Error('백업 파일은 5MB 이하로 골라 주세요.');
      const result = parseBackup(await selected.text());
      mergeRewards(rewards, result); // Validate the merge before presenting a reviewable preview.
      setIncoming(result);
    } catch (error) { setFeedback(error instanceof Error ? error.message : '파일을 읽지 못했어요. 현재 별은 그대로예요.'); }
    finally { setReading(false); if (file.current) file.current.value = ''; }
  };
  return <section className="reward-settings" aria-label="보상 설정">
    <h3>별을 몇 개 모을까요?</h3><p>아이와 함께 작은 목표부터 정해 보세요.</p>
    <div className="goal-presets">{GOAL_PRESETS.map((target) => <button key={target} aria-pressed={rewards.goal.target === target} onClick={() => save(target)}>{target}<span>개</span></button>)}</div>
    <form onSubmit={(event) => { event.preventDefault(); if (valid) save(parsed); }} className="custom-goal">
      <label htmlFor={inputId}>직접 정하기 <small>1~1,000개</small></label>
      <div><input id={inputId} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={custom} onChange={(event) => setCustom(event.target.value)} aria-invalid={!valid} /><span>개</span><button className="secondary-button" disabled={!valid} type="submit">목표 저장</button></div>
    </form>
    <p className="settings-note">목표를 바꿔도 전체 별과 달력은 보존돼요. 다 채운 별판은 ‘다음 별판 시작’을 누르면 보관되고, 넘친 별도 이어져요.</p>
    <div className="reward-backup"><h3>별을 안전하게 보관해요</h3><p>기기를 바꾸거나 브라우저 데이터를 지우기 전에 백업해 주세요.</p>
      <button className="secondary-button" onClick={download}><Download size={20} />별 백업 다운로드</button>
      <button className="secondary-button" disabled={reading} onClick={() => file.current?.click()}><Upload size={20} />{reading ? '백업 읽는 중…' : '백업 불러오기'}</button>
      <input className="sr-only" ref={file} type="file" accept=".json,application/json" aria-label="별 백업 파일" tabIndex={-1} onChange={(event) => { void read(event.target.files?.[0]); }} />
      {incoming ? <div className="import-preview"><h4>백업 확인</h4><p>백업의 별 {totalStars(incoming)}개 중 새로운 별 {totalStars(mergeRewards(rewards, incoming)) - totalStars(rewards)}개를 추가해요.</p><p>같은 여행의 별은 중복하지 않아요. 현재 기록과 목표를 유지하며, 빈 기기에서는 백업의 목표도 가져와요.</p>
        <div><button className="secondary-button" onClick={() => setIncoming(null)}>취소</button><button className="primary-button" onClick={() => {
          try { const merged = mergeRewards(rewards, incoming); onImport(incoming); setCustom(String(merged.goal.target)); setIncoming(null); setFeedback('백업을 합쳤어요. 달력에서 확인해 보세요.'); }
          catch (error) { setFeedback(error instanceof Error ? error.message : '백업을 합치지 못했어요.'); }
        }}>기록 합치기</button></div></div> : null}
    </div>
    <p className="reward-feedback" role="status">{feedback}</p>
  </section>;
}
