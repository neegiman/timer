import { test, expect, type Page } from '@playwright/test';
import { createBackup, EMPTY_REWARDS, claimReward } from '../../src/lib/rewards';
import type { TimerSession } from '../../src/types/timer';

const prefix = 'promise-journey:v1:';
async function prepare(page: Page, mode: 'after' | 'during') {
  await page.getByRole('button', { name: '정리하기', exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: mode === 'after' ? /활동 시작/ : /활동 마무리/ }).click();
  await page.getByRole('button', { name: '5 분', exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await expect(page.locator('.setup-summary')).toContainText(mode === 'after' ? '5분 뒤에 시작' : '5분 동안 하기');
  await page.getByRole('button', { name: '출발!', exact: true }).click();
}
async function finish(page: Page) {
  await page.clock.fastForward(301_000);
  await page.clock.fastForward(6000);
  await expect(page.locator('[data-status="completed"]')).toBeVisible();
}
async function openStars(page: Page) {
  await page.getByRole('button', { name: /별 달력 열기/ }).click();
  await expect(page.getByRole('dialog', { name: '우리의 별 이야기' })).toBeVisible();
}
function sampleBackup() {
  const timestamp = new Date(2026, 9, 10, 12).getTime();
  const session: TimerSession = { id: 'backup-journey', status: 'completed', durationMs: 600_000,
    startTimestamp: timestamp - 600_000, targetTimestamp: timestamp, pausedRemainingMs: 0,
    arrivalTimestamp: timestamp, characterId: 'rabbit', mode: 'during',
    promise: { id: 'meal', icon: '🍚', name: '밥 먹기', activity: '밥 먹으러 가요' } };
  return createBackup(claimReward(EMPTY_REWARDS, session, timestamp), timestamp);
}

test('activity finish uses its own copy through halfway, pause, restart, refresh and manual reward', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install(); await page.goto('./'); await prepare(page, 'during');
  await expect(page.locator('.promise-reminder')).toContainText('도착하면 마무리');
  await page.clock.fastForward(150_000);
  await expect(page.getByTestId('journey-message')).toHaveAttribute('data-message-id', /^tidy-during-halfway-/);
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  const pausedTime = await page.getByTestId('countdown').textContent();
  await page.clock.fastForward(60_000);
  await expect(page.getByTestId('countdown')).toHaveText(pausedTime!);
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '계속', exact: true }).click();
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '처음부터', exact: true }).click();
  await page.getByRole('button', { name: '다시 출발', exact: true }).click();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).mode, `${prefix}activeSession`)).toBe('during');
  await page.reload();
  await expect(page.locator('.promise-reminder')).toContainText('도착하면 마무리');
  await page.clock.fastForward(271_000);
  await expect(page.getByTestId('journey-message')).toHaveAttribute('data-message-id', /^tidy-during-near-/);
  await page.clock.fastForward(30_000); await page.clock.fastForward(6000);
  await expect(page.getByTestId('journey-message')).toHaveText('도착! 정리를 마무리해요. 함께해서 멋져요! 🌟');
  await expect(page.locator('.completion-promise')).toHaveText('정리를 마무리해요. 수고했어요!');
  await expect(page.getByTestId('star-count')).toHaveText('0');
  await page.getByRole('button', { name: '⭐ 약속 지켰어요' }).click();
  await expect(page.getByTestId('star-count')).toHaveText('1');
  await openStars(page);
  await expect(page.locator('.star-records')).toContainText('정리하기');
  await expect(page.locator('.star-records')).toContainText('활동 마무리 · 5분 동안 하기');
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: '⭐ 별을 받았어요!' })).toBeDisabled();
  await expect(page.getByTestId('star-count')).toHaveText('1');
  expect(errors).toEqual([]);
});

test('activity start remains distinct and calendar stores each day cumulatively', async ({ page }) => {
  await page.clock.install(); await page.goto('./'); await prepare(page, 'after');
  await expect(page.locator('.promise-reminder')).toContainText('활동 시작 · 도착하면 장난감을 정리해요');
  await finish(page);
  await expect(page.locator('.completion-promise')).toHaveText('이제 장난감을 정리해요!');
  await expect(page.locator('.today-reward')).toContainText('활동을 시작한 뒤');
  await expect(page.getByTestId('star-count')).toHaveText('0');
  await page.getByRole('button', { name: '⭐ 약속 지켰어요' }).click();
  const first = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).records[0].date, `${prefix}rewards`);
  await page.getByRole('button', { name: '다시 하기' }).click();
  await page.clock.fastForward(86_400_000);
  await prepare(page, 'after'); await finish(page);
  await page.getByRole('button', { name: '⭐ 약속 지켰어요' }).click();
  await openStars(page);
  await expect(page.locator('.reward-total')).toContainText('모은 별 2개');
  await expect(page.locator('.reward-total')).toContainText('오늘 1개');
  const previous = page.getByRole('button', { name: `${first}, 별 1개`, exact: true });
  if (!(await previous.count())) await page.getByRole('button', { name: '이전 달', exact: true }).click();
  await previous.click();
  await expect(page.locator('.star-records')).toContainText('활동 시작 · 5분 뒤에 시작');
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.reload(); await expect(page.getByTestId('star-count')).toHaveText('2');
});

test('legacy stars migrate once, custom goals preserve totals and next board carries excess', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('reward-seeded')) {
      localStorage.setItem('promise-journey:v1:todayStars', JSON.stringify({ date: '2026-10-10', count: 7, awardedSessions: ['old-session'] }));
      localStorage.setItem('reward-seeded', 'true');
    }
  });
  await page.goto('./'); await expect(page.getByTestId('star-count')).toHaveText('7');
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '별 목표 · 달력 · 백업' }).click();
  await page.getByLabel(/직접 정하기/).fill('3');
  await page.getByRole('button', { name: '목표 저장', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('별 3개');
  await page.getByRole('button', { name: '별 모으기', exact: true }).click();
  await expect(page.getByTestId('board-progress')).toHaveText('3 / 3');
  await expect(page.getByText('별 4개는 다음 별판에 이어져요.')).toBeVisible();
  await page.getByRole('button', { name: '다음 별판 시작' }).click();
  await expect(page.getByText('완성한 별판 1개')).toBeVisible();
  await expect(page.getByText('별 1개는 다음 별판에 이어져요.')).toBeVisible();
  await page.getByRole('button', { name: '다음 별판 시작' }).click();
  await expect(page.getByTestId('board-progress')).toHaveText('1 / 3');
  await expect(page.getByText('완성한 별판 2개')).toBeVisible();
  await page.getByRole('button', { name: '설정', exact: true }).click();
  await page.getByLabel(/직접 정하기/).fill('1001');
  await expect(page.getByRole('button', { name: '목표 저장', exact: true })).toBeDisabled();
  await page.getByLabel(/직접 정하기/).fill('1000');
  await page.getByRole('button', { name: '목표 저장', exact: true }).click();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.reload(); await expect(page.getByTestId('star-count')).toHaveText('7');
  await openStars(page); await page.getByRole('button', { name: '별 모으기', exact: true }).click();
  await expect(page.getByTestId('board-progress')).toHaveText('1 / 1000');
  await expect(page.getByText('완성한 별판 2개')).toBeVisible();
});

test('JSON backup downloads, previews and merges once; invalid import preserves stars', async ({ page }) => {
  await page.goto('./'); await openStars(page);
  await page.getByRole('button', { name: '설정', exact: true }).click();
  const upload = page.getByLabel('별 백업 파일');
  await upload.setInputFiles({ name: 'stars.json', mimeType: 'application/json', buffer: Buffer.from(sampleBackup()) });
  await expect(page.getByText('백업의 별 1개 중 새로운 별 1개를 추가해요.')).toBeVisible();
  await page.getByRole('button', { name: '기록 합치기', exact: true }).click();
  await expect(page.locator('.reward-total')).toContainText('모은 별 1개');
  await upload.setInputFiles({ name: 'same.json', mimeType: 'application/json', buffer: Buffer.from(sampleBackup()) });
  await expect(page.getByText('백업의 별 1개 중 새로운 별 0개를 추가해요.')).toBeVisible();
  await page.getByRole('button', { name: '기록 합치기', exact: true }).click();
  await upload.setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
  await expect(page.getByRole('status')).toContainText('읽을 수 없는 파일');
  await expect(page.locator('.reward-total')).toContainText('모은 별 1개');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '별 백업 다운로드' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^promise-journey-stars-.*\.json$/);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const backup = JSON.parse(Buffer.concat(chunks).toString());
  expect(backup.rewards.records).toHaveLength(1);
  expect(backup.rewards.records[0].mode).toBe('during');
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.reload(); await expect(page.getByTestId('star-count')).toHaveText('1');
});

test('mode, calendar, goal and backup fit 320px, portrait, landscape and desktop', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('promise-journey:v1:rewards')) localStorage.setItem('promise-journey:v1:todayStars', JSON.stringify({ date: '2026-10-10', count: 1000, awardedSessions: [] }));
  });
  await page.goto('./'); await page.getByRole('button', { name: '시간', exact: true }).click();
  for (const [width, height] of [[320, 740], [390, 844], [844, 390], [1440, 1000]]) {
    await page.setViewportSize({ width, height });
    const bounds = await page.locator('.activity-mode-options').boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    if (width === 390) await page.screenshot({ path: `artifacts/activity-modes-${testInfo.project.name}.png`, fullPage: true });
    await openStars(page);
    for (const tab of ['별 달력', '별 모으기', '설정']) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      const sizes = await page.getByRole('dialog').evaluate((element) => ({ scroll: element.scrollWidth, client: element.clientWidth, right: element.getBoundingClientRect().right }));
      expect(sizes.scroll, `${tab} at ${width}`).toBeLessThanOrEqual(sizes.client + 1);
      expect(sizes.right).toBeLessThanOrEqual(width);
      if (width === 390) await page.screenshot({ path: `artifacts/rewards-${tab}-${testInfo.project.name}.png`, fullPage: true });
    }
    await page.getByRole('button', { name: '닫기', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
