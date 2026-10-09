import { test } from 'node:test';
import assert from 'node:assert/strict';
import { koreanSeason, SEASONS } from '../src/lib/seasons';
import { journeyNotice, noticeInterval } from '../src/lib/journeyNotice';
import { sceneryEvent, sceneryParticle } from '../src/lib/sceneryEvents';

test('Korean seasons cover all months and switch at midnight KST, independent of device timezone', () => {
  const seasons = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];
  for (let month = 0; month < 12; month++) assert.equal(koreanSeason(Date.UTC(2026, month, 15)), seasons[month]);
  for (const [month, before, after] of [[2, 'winter', 'spring'], [5, 'spring', 'summer'], [8, 'summer', 'autumn'], [11, 'autumn', 'winter']] as const) {
    const midnight = Date.UTC(2026, month, 1) - 9 * 60 * 60_000;
    assert.equal(koreanSeason(midnight - 1), before);
    assert.equal(koreanSeason(midnight), after);
  }
  assert.equal(koreanSeason(Date.parse('2027-01-01T00:00:00+09:00')), 'winter');
  assert.equal(koreanSeason(0), 'spring');
});

test('short journeys show six-second notices every thirty seconds with quiet gaps', () => {
  const at = (elapsed: number) => journeyNotice(600_000, 600_000 - elapsed);
  assert.equal(at(0).visible, true);
  assert.equal(at(7999).visible, true);
  assert.equal(at(8000).visible, false);
  assert.equal(at(29_999).visible, false);
  assert.deepEqual(at(30_000), { stage: 'beginning', key: 'repeat-30000', visible: true });
  assert.equal(at(35_999).visible, true);
  assert.equal(at(36_000).visible, false);
  assert.equal(at(60_000).visible, true);
  assert.equal(at(67_000).visible, false);
  assert.equal(noticeInterval(15 * 60_000), 30_000);
  assert.equal(noticeInterval(20 * 60_000), 60_000);
  assert.equal(noticeInterval(120 * 60_000), 90_000);
});

test('halfway and near milestones override repeats, skipped notices do not replay, arrival stays visible', () => {
  for (const total of [60_000, 300_000, 600_000, 7_200_000]) {
    const at = (elapsed: number) => journeyNotice(total, total - elapsed);
    assert.equal(at(total * .5).key, 'halfway');
    assert.equal(at(total * .5).visible, true);
    assert.equal(at(total * .5 + 8000).visible, false);
    assert.equal(at(total * .9).stage, 'near');
    assert.equal(at(total * .9).visible, true);
    assert.equal(at(total - 1).visible, true);
    assert.deepEqual(at(total), { stage: 'arrived', key: 'arrived', visible: true });
    assert.deepEqual(at(total + 10_000), at(total));
  }
  assert.equal(journeyNotice(600_000, 600_000 - 128_000).visible, false);
});

test('seasonal visitors alternate with quiet gaps and use different daytime and night events', () => {
  assert.equal(sceneryEvent(13_000, 'spring', 'day').kind, 'butterfly');
  assert.equal(sceneryEvent(34_000, 'spring', 'day').kind, 'birds');
  assert.equal(sceneryEvent(13_000, 'summer', 'day').kind, 'dragonfly');
  assert.equal(sceneryEvent(13_000, 'autumn', 'day').kind, 'leaves');
  assert.equal(sceneryEvent(13_000, 'winter', 'day').kind, 'snow');
  assert.equal(sceneryEvent(13_000, 'summer', 'night').kind, 'fireflies');
  assert.equal(sceneryEvent(34_000, 'winter', 'night').kind, 'shooting-star');
  for (const season of Object.keys(SEASONS) as (keyof typeof SEASONS)[]) for (const theme of ['day', 'night'] as const) {
    for (const time of [0, 9000, 17_000, 25_000, 39_000, 47_999]) assert.equal(sceneryEvent(time, season, theme).opacity, 0);
    assert.equal(sceneryEvent(13_000, season, theme).opacity, 1);
    assert.deepEqual(sceneryEvent(13_000, season, theme), sceneryEvent(13_000, season, theme));
    assert.notEqual(sceneryEvent(13_000, season, theme).kind, sceneryEvent(61_000, season, theme).kind);
  }
});

test('ambient particles stay within the scene without random jumps or accumulated timing drift', () => {
  for (let index = 0; index < 6; index++) for (const time of [0, 1000, 13_000, 60_000, 7_200_000]) {
    const pose = sceneryParticle(time, index);
    assert.ok(pose.x > 0 && pose.x < .98 && pose.y >= 0 && pose.y <= .72);
    assert.ok(pose.opacity >= 0 && pose.opacity <= .65);
    assert.deepEqual(pose, sceneryParticle(time, index));
  }
  for (let index = 0; index < 6; index++) {
    const wrap = (1 - index * .173) * (14_000 + index * 1700);
    assert.ok(sceneryParticle(wrap - 1, index).opacity < .0001);
    assert.ok(sceneryParticle(wrap + 1, index).opacity < .0001);
  }
});
