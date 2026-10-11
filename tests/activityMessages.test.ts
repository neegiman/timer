import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVITY_MESSAGE_BANK, activityMessageOptions, messageActivity, selectActivityMessage } from '../src/lib/activityMessages';
import { journeyNotice, noticeInterval } from '../src/lib/journeyNotice';
import { activityCompletion, activityReminder } from '../src/lib/activityMode';
import { promises } from '../src/lib/promises';
import type { JourneyStage } from '../src/types/animation';

const modes = ['after', 'during'] as const;
const stages: JourneyStage[] = ['beginning', 'halfway', 'near', 'arrived'];
const custom = { id: 'custom', icon: '🎨', name: '그림 그리기', activity: '그림 그리기' };
const activities = [...promises, custom];

test('100 unique authored messages cover every activity, mode and time stage', () => {
  const all = Object.values(ACTIVITY_MESSAGE_BANK).flatMap((activity) => Object.values(activity).flatMap((mode) => Object.values(mode).flat()));
  assert.equal(all.length, 100);
  assert.equal(new Set(all).size, 100);
  for (const promise of activities) for (const mode of modes) for (const stage of stages) {
    const options = activityMessageOptions(promise, mode, stage);
    assert.ok(options.length > 0);
    for (const text of options) {
      assert.doesNotMatch(text, /\{activity\}|빨리|늦었|서둘러|시간이 없/);
      assert.ok(text.length < 65);
      if (promise.id === 'custom') assert.ok(text.includes(custom.name));
    }
  }
});

test('activity choices stay relevant, and unknown or prototype-shaped IDs use custom copy', () => {
  const topics = [/씻|목욕|보송|거품|보글|헹구|닦/, /잠|이불|쉬|쉼/, /식사|식탁|식기|밥|먹|음식|냠냠|씹/, /정리|장난감|차곡/, /외출|바깥|옷|신발|준비|챙길/, /영상|화면/];
  for (const [index, promise] of promises.entries()) for (const mode of modes) for (const stage of stages)
    for (const text of activityMessageOptions(promise, mode, stage)) assert.match(text, topics[index]);
  for (const id of ['unknown', 'toString', '__proto__']) {
    assert.equal(messageActivity(id), 'custom');
    assert.match(activityMessageOptions({ ...custom, id }, 'after', 'beginning')[0], /그림 그리기/);
  }
});

test('activity start and finish copy describe the right side of the deadline', () => {
  for (const promise of activities) {
    assert.match(activityReminder(promise, 'after'), /활동 시작/);
    assert.match(activityReminder(promise, 'during'), /활동 마무리/);
    for (const text of activityMessageOptions(promise, 'during', 'near')) assert.match(text, /마무리|끝나/);
    for (const mode of modes) for (const text of activityMessageOptions(promise, mode, 'arrived')) {
      assert.doesNotMatch(text, /도착|마무리|잘했|수고|시간이|끝났/);
      assert.ok(text.startsWith(activityCompletion(promise, mode)));
    }
  }
});

test('message selection is stable through rerenders, pause, refresh and background recovery', () => {
  for (const total of [60_000, 600_000, 1_200_000, 7_200_000]) {
    for (const elapsed of [1_000, 31_000, total / 2, total * .9, total - 5000, total]) {
      const notice = journeyNotice(total, total - elapsed);
      for (const promise of activities) for (const mode of modes) {
        const selected = selectActivityMessage(promise, mode, notice, total, 'stable-session');
        assert.deepEqual(selectActivityMessage(JSON.parse(JSON.stringify(promise)), mode, journeyNotice(total, total - elapsed), total, 'stable-session'), selected);
        assert.ok(activityMessageOptions(promise, mode, notice.stage).includes(selected.text));
        assert.ok(selected.id.startsWith(`${promise.id}-${mode}-${notice.stage}-`));
      }
    }
  }
});

test('consecutive regular notices rotate, and different journeys can use every variant', () => {
  for (const total of [600_000, 1_200_000, 7_200_000]) {
    const interval = noticeInterval(total);
    const first = journeyNotice(total, total - interval - 1000), second = journeyNotice(total, total - interval * 2 - 1000);
    assert.equal(first.stage, 'beginning'); assert.equal(second.stage, 'beginning');
    for (const promise of activities) for (const mode of modes)
      assert.notEqual(selectActivityMessage(promise, mode, first, total, 'same-session').id, selectActivityMessage(promise, mode, second, total, 'same-session').id);
  }
  const seen = new Set<string>();
  for (const promise of activities) for (const mode of modes) for (const stage of stages) {
    for (let seed = 0; seed < 100; seed++) seen.add(selectActivityMessage(promise, mode, { stage, key: stage, visible: true }, 600_000, `session-${seed}`).id);
  }
  assert.equal(seen.size, 100);
});
