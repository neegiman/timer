import type { TimerMode, TimerSession, TodayStars } from '@/types/timer';
import { isTimerMode } from './activityMode';
import { localDate } from './timer';

export interface StarRecord {
  id: string;
  date: string;
  earnedAt: number;
  promiseId: string;
  promiseName: string;
  durationMinutes: number;
  mode: TimerMode;
}
export interface LegacyStars { date: string; count: number }
export interface StarBoard { id: string; target: number; startTotal: number; completedAt: number }
export interface Rewards {
  version: 1;
  records: StarRecord[];
  legacy: LegacyStars[];
  legacyClaimIds: string[];
  legacyMigrated: boolean;
  goal: { target: number; startTotal: number };
  goalConfigured?: boolean;
  boards: StarBoard[];
}

export const EMPTY_REWARDS: Rewards = {
  version: 1, records: [], legacy: [], legacyClaimIds: [], legacyMigrated: false,
  goal: { target: 20, startTotal: 0 }, goalConfigured: false, boards: [],
};
export const EMPTY_LEGACY_STARS: TodayStars = { date: '', count: 0, awardedSessions: [] };
export const GOAL_PRESETS = [10, 20, 30, 50, 100] as const;
export const MAX_BACKUP_BYTES = 5_000_000;
const boundedInteger = (n: unknown, min: number, max: number): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n >= min && n <= max;
const isId = (s: unknown): s is string => typeof s === 'string' && s.length > 0 && s.length <= 200;
const isTimestamp = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 8_640_000_000_000_000;

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && localDate(date) === value;
}
export function isLegacyStars(value: unknown): value is TodayStars {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<TodayStars>;
  return (s.date === '' || isCalendarDate(s.date)) && boundedInteger(s.count, 0, 1_000_000) &&
    Array.isArray(s.awardedSessions) && s.awardedSessions.length <= 50_000 && s.awardedSessions.every(isId);
}
function isRecord(value: unknown): value is StarRecord {
  if (!value || typeof value !== 'object') return false;
  const r = value as Partial<StarRecord>;
  return isId(r.id) && isCalendarDate(r.date) && isTimestamp(r.earnedAt) && isId(r.promiseId) &&
    typeof r.promiseName === 'string' && r.promiseName.length > 0 && r.promiseName.length <= 50 &&
    boundedInteger(r.durationMinutes, 1, 120) && isTimerMode(r.mode);
}
function uniqueIds(items: { id: string }[]) { return new Set(items.map((item) => item.id)).size === items.length; }

export function isRewards(value: unknown): value is Rewards {
  if (!value || typeof value !== 'object') return false;
  const r = value as Partial<Rewards>;
  if (r.version !== 1 || typeof r.legacyMigrated !== 'boolean' ||
    (r.goalConfigured !== undefined && typeof r.goalConfigured !== 'boolean') || !r.goal ||
    !boundedInteger(r.goal.target, 1, 1000) || !boundedInteger(r.goal.startTotal, 0, 1_000_000) ||
    !Array.isArray(r.records) || r.records.length > 50_000 || !r.records.every(isRecord) || !uniqueIds(r.records) ||
    !Array.isArray(r.legacy) || r.legacy.length > 10_000 ||
    !r.legacy.every((l) => l && isCalendarDate(l.date) && boundedInteger(l.count, 0, 1_000_000)) ||
    new Set(r.legacy.map((l) => l.date)).size !== r.legacy.length ||
    !Array.isArray(r.legacyClaimIds) || r.legacyClaimIds.length > 50_000 || !r.legacyClaimIds.every(isId) ||
    !Array.isArray(r.boards) || r.boards.length > 10_000 ||
    !r.boards.every((b) => b && isId(b.id) && boundedInteger(b.target, 1, 1000) &&
      boundedInteger(b.startTotal, 0, 1_000_000) && isTimestamp(b.completedAt)) || !uniqueIds(r.boards)) return false;
  const total = totalStars(r as Rewards);
  const legacyIds = new Set(r.legacyClaimIds);
  return total <= 1_000_000 && r.goal.startTotal <= total &&
    r.boards.every((b) => b.startTotal + b.target <= total) &&
    !r.records.some((record) => legacyIds.has(record.id));
}

export function totalStars(rewards: Rewards) {
  return rewards.records.length + rewards.legacy.reduce((sum, entry) => sum + entry.count, 0);
}
export function starsOnDate(rewards: Rewards, date: string) {
  return rewards.records.filter((record) => record.date === date).length + (rewards.legacy.find((entry) => entry.date === date)?.count ?? 0);
}
export function hasClaimed(rewards: Rewards, id: string) {
  return rewards.legacyClaimIds.includes(id) || rewards.records.some((record) => record.id === id);
}
export function boardProgress(rewards: Rewards) {
  const earned = Math.max(0, totalStars(rewards) - rewards.goal.startTotal);
  return { earned, filled: Math.min(earned, rewards.goal.target), complete: earned >= rewards.goal.target,
    excess: Math.max(0, earned - rewards.goal.target) };
}

/** The old store only retains one date's count. Do not invent missing history. */
export function migrateLegacy(rewards: Rewards, legacy: TodayStars): Rewards {
  if (rewards.legacyMigrated) return rewards;
  const entries = rewards.legacy.map((entry) => ({ ...entry }));
  if (isCalendarDate(legacy.date) && legacy.count > 0) {
    const existing = entries.find((entry) => entry.date === legacy.date);
    if (existing) existing.count = Math.max(existing.count, legacy.count);
    else entries.push({ date: legacy.date, count: legacy.count });
  }
  return { ...rewards, legacy: entries, legacyClaimIds: [...new Set([...rewards.legacyClaimIds, ...legacy.awardedSessions])], legacyMigrated: true };
}

export function claimReward(rewards: Rewards, session: TimerSession, now: number): Rewards {
  if (session.status !== 'completed' || hasClaimed(rewards, session.id)) return rewards;
  const record: StarRecord = {
    id: session.id, date: localDate(new Date(now)), earnedAt: now,
    promiseId: session.promise.id, promiseName: session.promise.name,
    durationMinutes: session.durationMs / 60_000, mode: session.mode ?? 'after',
  };
  return { ...rewards, records: [...rewards.records, record] };
}
export function changeGoal(rewards: Rewards, target: number): Rewards {
  if (!boundedInteger(target, 1, 1000) || (target === rewards.goal.target && rewards.goalConfigured)) return rewards;
  return { ...rewards, goal: { ...rewards.goal, target }, goalConfigured: true };
}
export function nextBoard(rewards: Rewards, id: string, now: number): Rewards {
  if (!boardProgress(rewards).complete || rewards.boards.some((board) => board.id === id)) return rewards;
  return { ...rewards, boards: [...rewards.boards, { id, ...rewards.goal, completedAt: now }],
    goal: { target: rewards.goal.target, startTotal: rewards.goal.startTotal + rewards.goal.target } };
}

export function createBackup(rewards: Rewards, now: number) {
  return JSON.stringify({ app: 'promise-journey', version: 1, exportedAt: new Date(now).toISOString(), rewards }, null, 2);
}
export function parseBackup(text: string): Rewards {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw new Error('백업 파일은 5MB 이하로 골라 주세요.');
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('읽을 수 없는 파일이에요. 약속 여행의 JSON 백업을 골라 주세요.'); }
  if (!data || typeof data !== 'object' || !('app' in data) || data.app !== 'promise-journey' ||
    !('version' in data) || data.version !== 1 || !('rewards' in data) || !isRewards(data.rewards)) {
    throw new Error('올바른 약속 여행 백업이 아니에요. 현재 별은 그대로 보관돼요.');
  }
  return data.rewards;
}

/** Merge by original journey IDs; repeated imports never add the same star twice. */
export function mergeRewards(current: Rewards, incoming: Rewards): Rewards {
  const records = new Map(current.records.map((record) => [record.id, record]));
  for (const record of incoming.records) if (!records.has(record.id)) records.set(record.id, record);
  const legacyClaimIds = [...new Set([...current.legacyClaimIds, ...incoming.legacyClaimIds])].filter((id) => !records.has(id));
  const legacy = new Map<string, LegacyStars>();
  for (const source of [current, incoming]) {
    const ids = new Set(source.legacyClaimIds);
    const covered = new Map<string, number>();
    for (const record of records.values()) if (ids.has(record.id)) covered.set(record.date, (covered.get(record.date) ?? 0) + 1);
    for (const entry of source.legacy) {
      const previous = legacy.get(entry.date);
      // Replace a known aggregate claim with its detailed record, without double counting it.
      const count = Math.max(0, entry.count - (covered.get(entry.date) ?? 0));
      legacy.set(entry.date, { date: entry.date, count: Math.max(previous?.count ?? 0, count) });
    }
  }
  const boards = new Map(current.boards.map((board) => [board.id, board]));
  for (const board of incoming.boards) if (!boards.has(board.id)) boards.set(board.id, board);
  const adoptGoal = totalStars(current) === 0 && current.boards.length === 0 && !current.goalConfigured;
  const merged: Rewards = { ...current, records: [...records.values()].sort((a, b) => a.earnedAt - b.earnedAt),
    legacy: [...legacy.values()], legacyClaimIds, legacyMigrated: true, boards: [...boards.values()],
    goal: adoptGoal ? { ...incoming.goal } : current.goal,
    goalConfigured: adoptGoal ? incoming.goalConfigured ?? false : current.goalConfigured ?? false };
  if (!isRewards(merged)) throw new Error('기록이 너무 많거나 백업 내용이 맞지 않아요. 현재 별은 그대로 보관돼요.');
  return merged;
}

export function calendarDays(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1, 12);
  const lastDay = new Date(year, month + 1, 0, 12).getDate();
  const days: (string | null)[] = Array.from({ length: first.getDay() }, () => null);
  for (let day = 1; day <= lastDay; day++) days.push(localDate(new Date(year, month, day, 12)));
  while (days.length % 7) days.push(null);
  return days;
}
