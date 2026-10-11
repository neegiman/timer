import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceSession, ARRIVAL_DURATION_MS, awardStar, formatRemaining, isSession, pauseSession, resumeSession, seekSession, timerProgress } from '../src/lib/timer';
import { assetPath } from '../src/lib/assetPath';
import type { TimerSession } from '../src/types/timer';

const start = 1_000_000;
const session: TimerSession = { id: 'journey', status: 'running', durationMs: 600_000,
  startTimestamp: start, targetTimestamp: start + 600_000, pausedRemainingMs: 600_000,
  arrivalTimestamp: null, characterId: 'rabbit', promise: { id: 'bath', icon: '🛁', name: '씻기', activity: '목욕하러 가요' } };

test('position represents timestamp progress at 0/25/50/75/100%', () => {
  for (const progress of [0, .25, .5, .75, 1]) assert.equal(timerProgress(session, start + progress * 600_000).progress, progress);
  assert.equal(timerProgress(session, start + 900_000).remaining, 0);
  assert.equal(timerProgress(session, start - 1000).progress, 0);
});
test('pause freezes remaining time and resume excludes paused duration', () => {
  const paused = pauseSession(session, start + 120_000);
  assert.equal(paused.pausedRemainingMs, 480_000);
  assert.equal(timerProgress(paused, start + 999_000).remaining, 480_000);
  const resumed = resumeSession(paused, start + 420_000);
  assert.equal(resumed.targetTimestamp, start + 900_000);
  assert.equal(timerProgress(resumed, start + 480_000).remaining, 420_000);
  assert.equal(timerProgress(resumed, start + 420_000).progress, timerProgress(paused, start + 420_000).progress);
});
test('background expiry arrives once and completes only after celebration', () => {
  const arrived = advanceSession(session, start + 900_000);
  assert.equal(arrived.status, 'arriving');
  assert.equal(arrived.arrivalTimestamp, start + 900_000);
  assert.equal(advanceSession(arrived, start + 900_001), arrived);
  assert.equal(advanceSession(arrived, start + 900_000 + ARRIVAL_DURATION_MS - 1).status, 'arriving');
  const completed = advanceSession(arrived, start + 900_000 + ARRIVAL_DURATION_MS);
  assert.equal(completed.status, 'completed');
  assert.equal(advanceSession(completed, start + 999_999), completed);
  assert.equal(pauseSession(session, session.targetTimestamp).status, 'arriving');
});
test('countdown rounds up and never displays negative time', () => {
  assert.equal(formatRemaining(1), '00:01');
  assert.equal(formatRemaining(600_000), '10:00');
  assert.equal(formatRemaining(-100), '00:00');
});

test('seeking forward and backward rebases timestamps without changing duration or reward identity', () => {
  for (const durationMs of [60_000, 600_000, 7_200_000]) {
    for (const progress of [0, .25, .5, .9]) {
      const adjusted = seekSession({ ...session, durationMs }, progress, start + 123_000);
      assert.equal(adjusted.id, session.id); assert.equal(adjusted.durationMs, durationMs);
      assert.equal(adjusted.status, 'running'); assert.equal(adjusted.arrivalTimestamp, null);
      assert.equal(adjusted.targetTimestamp - adjusted.startTimestamp, durationMs);
      assert.equal(timerProgress(adjusted, start + 123_000).remaining, Math.round(durationMs * (1 - progress) / 1000) * 1000);
      assert.equal(timerProgress(adjusted, adjusted.targetTimestamp + 60_000).remaining, 0);
      assert.equal(isSession(adjusted), true);
    }
  }
  const forward = seekSession(session, .75, start + 100_000);
  assert.equal(timerProgress(seekSession(forward, .25, start + 200_000), start + 200_000).remaining, 450_000);
});

test('seeking a paused timer keeps it paused and reaching the endpoint arrives only once', () => {
  const paused = pauseSession(session, start + 30_000);
  const adjusted = seekSession(paused, .5, start + 90_000);
  assert.equal(adjusted.status, 'paused'); assert.equal(adjusted.pausedRemainingMs, 300_000);
  assert.equal(timerProgress(adjusted, start + 9_000_000).remaining, 300_000);
  assert.equal(resumeSession(adjusted, start + 200_000).targetTimestamp, start + 500_000);
  const arrived = seekSession(adjusted, 1, start + 90_000);
  assert.equal(arrived.status, 'arriving'); assert.equal(arrived.arrivalTimestamp, start + 90_000);
  assert.equal(seekSession(arrived, 0, start + 91_000), arrived);
  const complete = advanceSession(arrived, start + 90_000 + ARRIVAL_DURATION_MS);
  assert.equal(seekSession(complete, 0, start + 999_000), complete);
});

test('seeking clamps drag boundaries, rounds to seconds and ignores invalid coordinates', () => {
  assert.equal(timerProgress(seekSession(session, -10, start), start).remaining, 600_000);
  assert.equal(seekSession(session, 10, start).status, 'arriving');
  assert.equal(timerProgress(seekSession(session, .33333, start), start).remaining, 400_000);
  for (const progress of [NaN, Infinity, -Infinity]) assert.equal(seekSession(session, progress, start), session);
  assert.equal(seekSession(session, .5, NaN), session);
});
test('stars cannot be claimed twice, including after midnight', () => {
  const initial = { date: '2026-10-06', count: 0, awardedSessions: [] };
  const awarded = awardStar(initial, 'journey', '2026-10-06');
  assert.equal(awarded.count, 1);
  assert.equal(awardStar(awarded, 'journey', '2026-10-06'), awarded);
  assert.equal(awardStar(awarded, 'journey', '2026-10-07'), awarded);
  assert.equal(awardStar(awarded, 'next', '2026-10-07').count, 1);
});
test('assets always use /timer and malformed persisted sessions are rejected', () => {
  assert.equal(assetPath('/sounds/finish.mp3'), '/timer/sounds/finish.mp3');
  assert.equal(assetPath('characters/rabbit.webp'), '/timer/characters/rabbit.webp');
  assert.equal(isSession(session), true);
  assert.equal(isSession({ ...session, durationMs: 0 }), false);
  assert.equal(isSession({ ...session, targetTimestamp: Infinity }), false);
  assert.equal(isSession({ ...session, pausedRemainingMs: -1 }), false);
});
