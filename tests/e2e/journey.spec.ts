import { test, expect, type Page } from '@playwright/test';

import { instrumentAudio } from './audio';

async function start(page: Page) {
  await page.getByRole('button', { name: '씻기', exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '10 분', exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '토끼', exact: true }).click();
  if (await page.evaluate(() => navigator.maxTouchPoints > 0)) await page.getByRole('button', { name: '출발!' }).tap();
  else await page.getByRole('button', { name: '출발!' }).click();
  await expect(page.locator('[data-status="running"]')).toBeVisible();
}

test('10-minute bath journey, arrival sound once, reward persists across refresh', async ({ page }, testInfo) => {
  const errors: string[] = [];
  const failedAssets: string[] = [];
  const assetUrls = new Set<string>();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { assetUrls.add(response.url()); if (response.status() >= 400) failedAssets.push(response.url()); });
  await instrumentAudio(page);
  await page.clock.install();
  await page.goto('./');
  const supportsAudio = await page.evaluate(() => typeof AudioContext !== 'undefined');
  if (!supportsAudio) testInfo.annotations.push({ type: 'audio-environment-limitation', description: 'This Windows WebKit build has no Web Audio API. Audio source/decode assertions run in Chromium; real iPhone Safari remains a manual device check.' });
  await start(page);
  await expect(page.locator('.journey-scene')).toHaveAttribute('data-phase', 'WALK');
  await page.clock.fastForward(2000);
  if (supportsAudio) {
    await expect.poll(() => page.evaluate(() => window.playedSounds.filter((url) => url.endsWith('/start.mp3')).length)).toBe(1);
  }
  const initialProgress = Number(await page.getByTestId('traveler').getAttribute('data-progress'));
  expect(initialProgress).toBeLessThan(.02);
  await page.clock.fastForward(148_000);
  await expect.poll(async () => Number(await page.getByTestId('traveler').getAttribute('data-progress'))).toBeGreaterThanOrEqual(.25);
  await page.clock.fastForward(427_000);
  await expect(page.getByTestId('journey-message')).toHaveText('거의 다 왔어! 이제 곧 약속 시간이야! 🏁');
  await page.clock.fastForward(25_000);
  await expect(page.locator('[data-status="arriving"]')).toBeVisible();
  await expect(page.getByTestId('traveler')).toHaveAttribute('data-progress', '1');
  await page.clock.fastForward(800);
  if (supportsAudio) expect(await page.evaluate(() => window.playedSounds.filter((url) => url.endsWith('/finish.mp3')).length)).toBe(0);
  await page.clock.fastForward(5000);
  await expect(page.locator('[data-status="completed"]')).toBeVisible();
  if (supportsAudio) await expect.poll(() => page.evaluate(() => window.playedSounds.filter((url) => url.endsWith('/finish.mp3')).length)).toBe(1);
  await expect(page.getByText('목욕하러 가요!', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '⭐ 약속 지켰어요' }).click();
  await expect(page.getByTestId('star-count')).toHaveText('1');
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('switch', { name: '숫자로 남은 시간 표시' }).click();
  await page.getByRole('button', { name: '닫기' }).click();
  await page.clock.fastForward(4000);
  if (supportsAudio) expect(await page.evaluate(() => window.playedSounds.filter((url) => url.endsWith('/finish.mp3')).length)).toBe(1);
  await page.reload();
  await expect(page.getByTestId('star-count')).toHaveText('1');
  await expect(page.getByRole('button', { name: '⭐ 별을 받았어요!' })).toBeDisabled();
  await expect(page.getByTestId('countdown')).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(failedAssets).toEqual([]);
  expect([...assetUrls].some((url) => url.includes('/timer/_next/'))).toBe(true);
  expect([...assetUrls].some((url) => url.includes('/timer/images/meadow.svg'))).toBe(true);
  expect([...assetUrls].filter((url) => /\/(?:_next|sounds|images)\//.test(url)).every((url) => new URL(url).pathname.startsWith('/timer/'))).toBe(true);
});

test('pause/resume, confirmation cancellation, refresh and background expiry', async ({ page }) => {
  await page.clock.install();
  await page.goto('./');
  await start(page);
  await page.clock.fastForward(120_000);
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  const paused = await page.getByTestId('countdown').textContent();
  await page.clock.fastForward(300_000);
  await expect(page.getByTestId('countdown')).toHaveText(paused!);
  await page.reload();
  await expect(page.locator('[data-status="paused"]')).toBeVisible();
  await expect(page.getByTestId('countdown')).toHaveText(paused!);
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '계속', exact: true }).click();
  await page.clock.fastForward(60_000);
  const deadline = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).targetTimestamp);
  const remaining = await page.evaluate((target) => target - Date.now(), deadline);
  expect(remaining).toBeGreaterThan(410_000);
  expect(remaining).toBeLessThanOrEqual(420_000);
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '처음부터', exact: true }).click();
  await page.getByRole('button', { name: '돌아가기', exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).targetTimestamp)).toBe(deadline);
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '종료', exact: true }).click();
  await page.getByRole('button', { name: '돌아가기', exact: true }).click();
  // Date jumps without running timer callbacks: models a suspended tab waking up.
  await page.clock.setSystemTime(new Date(Date.now() + 3_600_000));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.locator('[data-status="arriving"]')).toBeVisible();
  await page.clock.fastForward(6000);
  await expect(page.locator('[data-status="completed"]')).toBeVisible();
});

test('custom values, restart, exit and settings persist', async ({ page }) => {
  await page.clock.install();
  await page.goto('./');
  await page.getByRole('button', { name: '직접 약속 쓰기' }).click();
  await expect(page.getByRole('button', { name: '다음', exact: true })).toBeDisabled();
  await page.getByLabel('도착하면 무엇을 할까요?').fill('책 한 권을 읽어요');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '직접 설정', exact: true }).click();
  await page.getByRole('spinbutton', { name: '직접 설정 시간' }).fill('120');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '로켓', exact: true }).click();
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('switch', { name: '소리 ON/OFF' }).click();
  await page.getByRole('switch', { name: '숫자로 남은 시간 표시' }).click();
  await page.getByRole('button', { name: '닫기' }).click();
  await page.getByRole('button', { name: '출발!' }).click();
  await expect(page.getByTestId('countdown')).toHaveCount(0);
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.clock.fastForward(60_000);
  await page.getByRole('button', { name: '처음부터', exact: true }).click();
  await page.getByRole('button', { name: '다시 출발', exact: true }).click();
  expect(Number(await page.getByTestId('traveler').getAttribute('data-progress'))).toBeLessThan(.01);
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '종료', exact: true }).click();
  await page.getByRole('button', { name: '여행 마치기', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('도착하면 무엇을 할까요?')).toHaveValue('책 한 권을 읽어요');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: '직접 설정 시간' })).toHaveValue('120');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await expect(page.getByRole('button', { name: '로켓', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await expect(page.getByRole('switch', { name: '소리 ON/OFF' })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('switch', { name: '숫자로 남은 시간 표시' })).toHaveAttribute('aria-checked', 'false');
});

test('running timer refresh preserves original deadline', async ({ page }) => {
  await page.clock.install();
  await page.goto('./');
  await start(page);
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).targetTimestamp);
  await page.clock.fastForward(180_000);
  await page.reload();
  await expect(page.locator('[data-status="running"]')).toBeVisible();
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).targetTimestamp);
  expect(after).toBe(before);
  expect(Number(await page.getByTestId('traveler').getAttribute('data-progress'))).toBeGreaterThanOrEqual(.3);
});

test('320px, phone, tablet and landscape have no horizontal overflow', async ({ page }, testInfo) => {
  await page.clock.install();
  await page.goto('./');
  for (const [width, height] of [[320, 740], [390, 844], [768, 1024], [844, 390], [1440, 1000]]) {
    await page.setViewportSize({ width, height });
    for (const step of ['약속', '시간', '친구']) {
      await page.getByRole('button', { name: step, exact: true }).click();
      const sizes = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth }));
      expect(sizes.scroll, `${step} setup overflow at ${width}px`).toBeLessThanOrEqual(sizes.viewport);
      if (testInfo.project.name === 'chromium' && [390, 1440].includes(width)) await page.screenshot({ path: `artifacts/setup-${step}-${width}.png`, fullPage: true });
    }
  }
  await page.getByRole('button', { name: '약속', exact: true }).click();
  await start(page);
  for (const [width, height] of [[320, 740], [390, 844], [768, 1024], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.clock.runFor(32);
    const sizes = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth }));
    expect(sizes.scroll, `Timer overflow at ${width}px`).toBeLessThanOrEqual(sizes.viewport);
    const scene = await page.locator('.journey-scene').boundingBox();
    const traveler = await page.getByTestId('traveler').boundingBox();
    expect(traveler!.x).toBeGreaterThanOrEqual(scene!.x);
    expect(traveler!.x + traveler!.width).toBeLessThanOrEqual(scene!.x + scene!.width);
    if (testInfo.project.name === 'chromium' && width === 390) await page.screenshot({ path: 'artifacts/timer-mobile.png', fullPage: true });
  }
  await page.clock.fastForward(603_000);
  await page.clock.fastForward(6000);
  await expect(page.getByTestId('journey-message')).toHaveCSS('opacity', '1');
  for (const [width, height] of [[320, 740], [390, 844], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.clock.runFor(32);
    const scene = await page.locator('.journey-scene').boundingBox();
    const traveler = await page.getByTestId('traveler').boundingBox();
    expect(traveler!.y).toBeGreaterThanOrEqual(scene!.y);
    expect(traveler!.x + traveler!.width).toBeLessThanOrEqual(scene!.x + scene!.width);
    const line = (await page.getByTestId('journey-goal').boundingBox())!;
    expect(traveler!.x).toBeGreaterThan(line.x);
    if (testInfo.project.name === 'chromium' && width === 390) await page.screenshot({ path: 'artifacts/arrival-mobile.png', fullPage: true });
  }
});

test('corrupt storage is ignored and reduced motion keeps progress understandable', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('promise-journey:v1:activeSession', '{broken');
    localStorage.setItem('promise-journey:v1:selectedDuration', '-20');
    localStorage.setItem('promise-journey:v1:todayStars', '{"date":"today","count":-2}');
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.getByRole('button', { name: '다음', exact: true })).toBeEnabled();
  await start(page);
  await expect(page.getByTestId('traveler')).toBeVisible();
  expect(await page.locator('.traveler-body').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
});
