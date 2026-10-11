import { test, expect, type Page } from '@playwright/test';
import { instrumentAudio } from './audio';
import { formatRemaining } from '../../src/lib/timer';

const storageKey = 'promise-journey:v1:activeSession';
const slider = (page: Page) => page.getByRole('slider', { name: '여행 시간 조절' });
async function session(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), storageKey);
}
async function start(page: Page) {
  await page.clock.install();
  await page.goto('./');
  await page.getByRole('button', { name: '씻기', exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '10 분', exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '토끼', exact: true }).click();
  await page.getByRole('button', { name: '출발!' }).click();
  await expect(page.locator('[data-status="running"]')).toBeVisible();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
}
async function point(page: Page, progress: number) {
  const box = (await page.locator('.progress-track').boundingBox())!;
  return { x: box.x + box.width * progress, y: box.y + box.height / 2 };
}
async function move(page: Page, progress: number) {
  const p = await point(page, progress);
  await page.mouse.move(p.x, p.y);
  await page.clock.runFor(32);
}
async function touch(page: Page, type: string, progress: number) {
  const p = await point(page, progress);
  await slider(page).dispatchEvent(type, { pointerId: 7, pointerType: 'touch', isPrimary: true,
    button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: p.x, clientY: p.y, bubbles: true });
  await page.clock.runFor(32);
}

test('drag forward/back previews one clock, commits once, resumes and survives refresh', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await start(page);
  const original = await session(page);
  await move(page, .5); await page.mouse.down();
  await expect(page.locator('.journey-progress')).toHaveAttribute('data-adjusting', 'true');
  await expect(slider(page)).toHaveAttribute('aria-valuetext', '남은 시간 05:00');
  await expect(page.getByTestId('journey-message')).toHaveCSS('opacity', '1');
  const frozen = await session(page);
  expect(frozen.status).toBe('paused');
  expect(frozen.pausedRemainingMs).toBeGreaterThan(590_000);
  const background = await page.locator('.journey-scene').getAttribute('data-ground-distance');
  await page.clock.runFor(2000);
  await expect(slider(page)).toHaveAttribute('aria-valuetext', '남은 시간 05:00');
  await move(page, .25);
  // WebKit rounds mouse coordinates to device pixels; quarter-track can differ by one second.
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /^남은 시간 07:3[01]$/);
  const previewText = (await slider(page).getAttribute('aria-valuetext'))!.slice('남은 시간 '.length);
  const [minutes, seconds] = previewText.split(':').map(Number);
  const selectedRemaining = (minutes * 60 + seconds) * 1000;
  expect(await session(page)).toEqual(frozen); // pointer frames never write preview values to storage
  expect(await page.locator('.journey-scene').getAttribute('data-ground-distance')).not.toBe(background);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
  await page.mouse.up();
  await expect(page.locator('[data-status="running"]')).toBeVisible();
  const committed = await session(page);
  expect(committed.id).toBe(original.id);
  expect(committed.durationMs).toBe(600_000);
  expect(committed.targetTimestamp - committed.startTimestamp).toBe(600_000);
  expect(committed.targetTimestamp - await page.evaluate(() => Date.now())).toBe(selectedRemaining);
  // Allow one UI tick (250ms); the deadline itself is still exact.
  await page.clock.runFor(5250);
  expect(committed.targetTimestamp - await page.evaluate(() => Date.now())).toBe(selectedRemaining - 5250);
  await expect(page.getByTestId('countdown')).toHaveAttribute('aria-label', `남은 시간 ${formatRemaining(selectedRemaining - 5000)}`);
  await page.reload();
  await expect(slider(page)).toHaveAttribute('aria-valuetext', `남은 시간 ${formatRemaining(selectedRemaining - 5000)}`);
  expect((await session(page)).targetTimestamp).toBe(committed.targetTimestamp);
  expect(errors).toEqual([]);
});

test('paused touch seek, cancellation, keyboard controls and endpoint finish exactly once', async ({ page }, testInfo) => {
  await instrumentAudio(page);
  await start(page);
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  await touch(page, 'pointerdown', .5);
  await expect(slider(page)).toHaveAttribute('aria-valuetext', '남은 시간 05:00');
  await touch(page, 'pointermove', .9);
  await expect(slider(page)).toHaveAttribute('aria-valuetext', '남은 시간 01:00');
  await touch(page, 'pointerup', .9);
  await expect(page.locator('[data-status="paused"]')).toBeVisible();
  await page.clock.runFor(60_000);
  await expect(page.getByTestId('countdown')).toHaveAttribute('aria-label', '남은 시간 01:00');
  await touch(page, 'pointerdown', .25);
  await touch(page, 'pointercancel', .25);
  await expect(slider(page)).toHaveAttribute('aria-valuetext', '남은 시간 01:00');
  await slider(page).focus(); await page.keyboard.press('ArrowLeft');
  await expect(slider(page)).toHaveAttribute('aria-valuetext', '남은 시간 01:05');
  await page.keyboard.press('ArrowRight');
  await expect(slider(page)).toHaveAttribute('aria-valuetext', '남은 시간 01:00');
  await page.keyboard.press('Home');
  await expect(slider(page)).toHaveAttribute('aria-valuetext', '남은 시간 10:00');
  await expect(page.locator('.progress-marker')).toHaveAttribute('data-progress', '0.000000');
  await touch(page, 'pointerdown', 1.2);
  await expect(slider(page)).toHaveAttribute('aria-valuetext', '남은 시간 00:00');
  await expect(page.locator('[data-status="paused"]')).toBeVisible();
  await expect(page.locator('.journey-scene')).toHaveAttribute('data-phase', 'WALK');
  await touch(page, 'pointerup', 1.2);
  await expect(page.locator('[data-status="arriving"]')).toBeVisible();
  await expect(slider(page)).toHaveAttribute('aria-disabled', 'true');
  await page.clock.runFor(6000);
  await expect(page.locator('[data-status="completed"]')).toBeVisible();
  const supportsAudio = await page.evaluate(() => typeof AudioContext !== 'undefined');
  if (supportsAudio) await expect.poll(() => page.evaluate(() => window.playedSounds.filter((url) => url.endsWith('/finish.mp3')).length)).toBe(1);
  else testInfo.annotations.push({ type: 'audio-environment-limitation', description: 'Windows WebKit has no Web Audio API; decoded playback count is checked in Chromium.' });
  await page.getByRole('button', { name: '⭐ 약속 지켰어요' }).click();
  await expect(page.getByTestId('star-count')).toHaveText('1');
  await touch(page, 'pointerdown', .5); await touch(page, 'pointerup', .5);
  await page.clock.runFor(2000);
  if (supportsAudio) expect(await page.evaluate(() => window.playedSounds.filter((url) => url.endsWith('/finish.mp3')).length)).toBe(1);
  await page.reload();
  await expect(page.getByRole('button', { name: '⭐ 별을 받았어요!' })).toBeDisabled();
  await expect(page.getByTestId('star-count')).toHaveText('1');
});

test('running cancel restores time, numeric-off touch preview and mobile layouts', async ({ page }, testInfo) => {
  await start(page);
  const original = await session(page);
  await move(page, .75); await page.mouse.down();
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /^남은 시간 02:3[01]$/);
  const remaining = (await session(page)).pausedRemainingMs;
  await page.clock.runFor(3000);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-status="running"]')).toBeVisible();
  const cancelled = await session(page);
  expect(cancelled.id).toBe(original.id);
  expect(cancelled.targetTimestamp - await page.evaluate(() => Date.now())).toBe(remaining);
  await page.mouse.up();
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('switch', { name: '숫자로 남은 시간 표시' }).click();
  await page.getByRole('button', { name: '닫기' }).click();
  await expect(page.getByTestId('countdown')).toHaveCount(0);
  for (const [width, height] of [[320, 740], [390, 844], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.clock.runFor(32);
    await touch(page, 'pointerdown', .9);
    await expect(page.locator('.progress-time-bubble')).toContainText('01:00');
    const bubble = (await page.locator('.progress-time-bubble').boundingBox())!;
    const hitbox = (await slider(page).boundingBox())!;
    expect(bubble.x).toBeGreaterThanOrEqual(0);
    expect(bubble.x + bubble.width).toBeLessThanOrEqual(width);
    expect(hitbox.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (testInfo.project.name === 'chromium') await page.screenshot({ path: `artifacts/progress-drag-${width}.png`, fullPage: true });
    await touch(page, 'pointerup', .9);
    await expect(page.locator('[data-status="running"]')).toBeVisible();
  }
});
