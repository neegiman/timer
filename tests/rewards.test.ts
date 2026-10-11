import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardProgress, calendarDays, changeGoal, claimReward, createBackup, EMPTY_REWARDS, hasClaimed, isRewards, mergeRewards, migrateLegacy, nextBoard, parseBackup, starsOnDate, totalStars } from '../src/lib/rewards';
import { activityCompletion, durationLabel, isTimerMode } from '../src/lib/activityMode';
import { isSession, localDate, pauseSession, resumeSession } from '../src/lib/timer';
import { promises } from '../src/lib/promises';
import type { TimerSession } from '../src/types/timer';

const now = new Date(2026, 9, 11, 12).getTime();
const today = localDate(new Date(now));
function session(id: string, mode: 'after' | 'during' = 'after'): TimerSession {
  return { id, mode, status: 'completed', durationMs: 300_000, startTimestamp: now - 300_000,
    targetTimestamp: now, pausedRemainingMs: 0, arrivalTimestamp: now, characterId: 'rabbit', promise: promises[0] };
}
test('activity modes validate, persist through pause/resume, and accept old sessions', () => {
  const s = { ...session('a', 'during'), status: 'running' as const };
  assert.equal(isSession(s), true);
  assert.equal(resumeSession(pauseSession(s, now - 100_000), now).mode, 'during');
  const old = { ...s }; delete old.mode;
  assert.equal(isSession(old), true);
  assert.equal(isSession({ ...s, mode: 'invalid' }), false);
  assert.equal(isTimerMode('during'), true);
  assert.equal(durationLabel(5, 'after'), '5분 뒤에 시작');
  assert.equal(durationLabel(5, 'during'), '5분 동안 하기');
  for (const promise of promises) {
    assert.match(activityCompletion(promise, 'during'), /마무리|끝났|끄고/);
    assert.match(activityCompletion(promise, 'after'), /이제/);
  }
});
test('only a completed promise can be claimed, once across dates and reload', () => {
  assert.equal(claimReward(EMPTY_REWARDS, { ...session('a'), status: 'running' }, now), EMPTY_REWARDS);
  const first = claimReward(EMPTY_REWARDS, session('a', 'during'), now);
  assert.equal(totalStars(first), 1);
  assert.equal(starsOnDate(first, today), 1);
  assert.equal(first.records[0].mode, 'during');
  assert.equal(first.records[0].durationMinutes, 5);
  const reloaded = JSON.parse(JSON.stringify(first));
  assert.equal(claimReward(reloaded, session('a'), now + 86_400_000), reloaded);
  const next = claimReward(reloaded, session('b'), now + 86_400_000);
  assert.equal(totalStars(next), 2);
  assert.equal(starsOnDate(next, today), 1);
});
test('legacy count and claim IDs migrate exactly once without invented details', () => {
  const old = { date: '2026-10-10', count: 7, awardedSessions: ['old-session'] };
  const migrated = migrateLegacy(EMPTY_REWARDS, old);
  assert.equal(totalStars(migrated), 7);
  assert.equal(starsOnDate(migrated, '2026-10-10'), 7);
  assert.equal(starsOnDate(migrated, today), 0);
  assert.equal(migrated.records.length, 0);
  assert.equal(hasClaimed(migrated, 'old-session'), true);
  assert.equal(migrateLegacy(migrated, old), migrated);
  assert.equal(claimReward(migrated, session('old-session'), now), migrated);
  assert.equal(isRewards(migrated), true);
});
test('changing goals and starting a new board preserves lifetime/calendar and excess', () => {
  let rewards = EMPTY_REWARDS;
  for (let i = 0; i < 7; i++) rewards = claimReward(rewards, session(String(i)), now);
  rewards = changeGoal(rewards, 3);
  assert.deepEqual(boardProgress(rewards), { earned: 7, filled: 3, complete: true, excess: 4 });
  const next = nextBoard(rewards, 'board-one', now);
  assert.equal(totalStars(next), 7);
  assert.equal(starsOnDate(next, today), 7);
  assert.equal(next.boards[0].target, 3);
  assert.equal(next.goal.startTotal, 3);
  assert.equal(boardProgress(next).earned, 4);
  assert.equal(nextBoard(next, 'board-one', now), next);
  const changed = changeGoal(next, 1000);
  assert.equal(changed.boards[0].target, 3);
  assert.equal(changed.goal.startTotal, 3);
  assert.equal(changeGoal(changed, 1001), changed);
  assert.equal(nextBoard(changed, 'not-full', now), changed);
});
test('backup round trip and repeated merge never duplicate claims or reset a local goal', () => {
  let source = migrateLegacy(EMPTY_REWARDS, { date: today, count: 2, awardedSessions: ['old'] });
  source = claimReward(source, session('one'), now);
  source = changeGoal(source, 10);
  const restored = parseBackup(createBackup(source, now));
  assert.deepEqual(restored, source);
  assert.equal(mergeRewards(EMPTY_REWARDS, restored).goal.target, 10);
  const current = changeGoal(claimReward(EMPTY_REWARDS, session('two'), now), 50);
  const merged = mergeRewards(current, restored);
  assert.equal(totalStars(merged), 4);
  assert.equal(merged.goal.target, 50);
  assert.deepEqual(mergeRewards(merged, restored), merged);
  assert.deepEqual(mergeRewards(merged, merged), merged);
  assert.equal(mergeRewards(changeGoal(EMPTY_REWARDS, 20), restored).goal.target, 20, 'explicitly chosen goals survive import even before the first star');
});
test('merging a detailed legacy claim preserves totals and richer calendar details', () => {
  const old = migrateLegacy(EMPTY_REWARDS, { date: today, count: 3, awardedSessions: ['same'] });
  const detail = claimReward(EMPTY_REWARDS, session('same'), now);
  const merged = mergeRewards(old, detail);
  assert.equal(totalStars(merged), 3);
  assert.equal(merged.records.length, 1);
  assert.equal(merged.legacy[0].count, 2);
  assert.equal(isRewards(merged), true);
  assert.equal(totalStars(mergeRewards(merged, old)), 3);
  assert.equal(totalStars(mergeRewards(merged, detail)), 3);
  assert.equal(totalStars(mergeRewards(detail, old)), 3);
});
test('malformed backups are rejected without throwing inside the storage validator', () => {
  for (const invalid of [null, {}, { ...EMPTY_REWARDS, boards: [null] }, { ...EMPTY_REWARDS, records: [null] },
    { ...EMPTY_REWARDS, goal: { target: 0, startTotal: 0 } },
    { ...EMPTY_REWARDS, legacy: [{ date: '2026-02-30', count: 4 }] }]) {
    assert.equal(isRewards(invalid), false);
    assert.throws(() => parseBackup(JSON.stringify({ app: 'promise-journey', version: 1, rewards: invalid })));
  }
  assert.throws(() => parseBackup('{broken'));
  assert.throws(() => parseBackup(' '.repeat(5_000_001)));
  const first = claimReward(EMPTY_REWARDS, session('a'), now);
  assert.equal(isRewards({ ...first, records: [...first.records, ...first.records] }), false);
});
test('calendar month aligns local dates, leap day and year boundaries', () => {
  const leap = calendarDays(2028, 1);
  assert.ok(leap.includes('2028-02-29'));
  assert.equal(leap.filter(Boolean).length, 29);
  assert.equal(leap.length % 7, 0);
  assert.equal(calendarDays(2026, 1).filter(Boolean).length, 28);
  assert.equal(calendarDays(2026, 11).filter(Boolean).at(-1), '2026-12-31');
  assert.equal(calendarDays(2027, 0).find(Boolean), '2027-01-01');
});
