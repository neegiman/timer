import { test, expect, type Page } from '@playwright/test';
import { instrumentAudio } from './audio';
import { finishWait } from './finish';
const starts = (page: Page) => page.evaluate(() => window.musicEvents.filter(event => event.type === 'start'));
const active = (page: Page) => page.evaluate(() => {
  const ended = new Set(window.musicEvents.filter(event => event.type === 'end').map(event => event.id));
  return window.musicEvents.filter(event => event.type === 'start' && !ended.has(event.id)).length;
});
async function begin(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: '친구', exact: true }).click();
  await page.getByRole('button', { name: '출발!', exact: true }).click();
  await expect(page.locator('[data-status="running"]')).toBeVisible();
}
async function menu(page: Page) { await page.getByRole('button', { name: '부모 메뉴', exact: true }).click(); }

test('music preference persists and the setup screen never starts audio', async ({ page }) => {
  await instrumentAudio(page); await page.goto('./'); await menu(page);
  const toggle = page.getByRole('switch', { name: '배경음악', exact: true });
  await expect(toggle).toHaveAttribute('aria-checked', 'true'); await toggle.click();
  await page.reload(); await menu(page); await expect(toggle).toHaveAttribute('aria-checked', 'false');
  expect(await starts(page)).toHaveLength(0);
  await expect(page.getByRole('switch', { name: '소리 ON/OFF' })).toHaveAttribute('aria-checked', 'true');
});

test('one native music loop pauses, resumes, mutes, restarts and fades at arrival with one finish sound', async ({ page }) => {
  test.setTimeout(45_000);
  await instrumentAudio(page); await page.goto('./');
  test.skip(!await page.evaluate(() => typeof AudioContext !== 'undefined'), 'This browser build has no native Web Audio output; controller lifecycle is covered by unit tests.');
  const errors: string[] = [], paths: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().includes('gentle-journey')) paths.push(new URL(request.url()).pathname); });
  await page.clock.install(); await begin(page);
  await expect.poll(async () => (await starts(page)).length).toBe(1);
  await expect.poll(async () => page.evaluate(() => window.musicBuffers.length)).toBe(1);
  const decoded = await page.evaluate(() => window.musicBuffers[0]);
  expect(decoded.channels).toBe(2); expect(decoded.duration).toBeGreaterThan(48); expect(decoded.duration).toBeLessThan(48.2);
  expect(decoded.peak).toBeLessThan(.6); expect((await starts(page))[0].loop).toBe(true);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await menu(page); await page.getByRole('button', { name: '일시정지', exact: true }).click();
  await expect.poll(() => active(page)).toBe(0); const before = (await starts(page)).length;
  await page.clock.runFor(3000); expect((await starts(page)).length).toBe(before);
  await menu(page); await page.getByRole('button', { name: '계속', exact: true }).click();
  await expect.poll(async () => (await starts(page)).length).toBe(before + 1);
  expect((await starts(page)).at(-1)!.offset).toBeGreaterThan(0);
  await menu(page); await page.getByRole('switch', { name: '배경음악', exact: true }).click();
  await expect.poll(() => active(page)).toBe(0);
  await page.getByRole('switch', { name: '배경음악', exact: true }).click(); await expect.poll(() => active(page)).toBe(1);
  await page.getByRole('switch', { name: '소리 ON/OFF' }).click(); await expect.poll(() => active(page)).toBe(0);
  await page.getByRole('switch', { name: '소리 ON/OFF' }).click(); await expect.poll(() => active(page)).toBe(1);
  const previousStarts = (await starts(page)).length;
  await page.getByRole('button', { name: '처음부터', exact: true }).click(); await page.getByRole('button', { name: '다시 출발', exact: true }).click();
  await expect.poll(async () => (await starts(page)).length).toBe(previousStarts + 1);
  await expect.poll(() => active(page)).toBe(1); expect((await starts(page)).at(-1)!.offset).toBe(0);
  const target = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).targetTimestamp);
  await page.clock.setSystemTime(target); await page.evaluate(() => window.dispatchEvent(new Event('pageshow'))); await page.clock.runFor(32);
  await expect.poll(() => active(page)).toBe(0);
  await page.clock.runFor(await finishWait(page)); await expect(page.locator('[data-status="completed"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.playedSounds.filter(url => url.endsWith('/finish.mp3')).length)).toBe(1);
  await page.clock.runFor(2000); expect(await active(page)).toBe(0);
  expect(paths).toEqual(['/timer/sounds/gentle-journey-v1.mp3']);
  expect(errors).toEqual([]); expect(await page.evaluate(() => window.audioDiagnostics)).toEqual([]);
});

test('a delayed music download cannot start after exit', async ({ page }) => {
  await instrumentAudio(page); await page.goto('./');
  test.skip(!await page.evaluate(() => typeof AudioContext !== 'undefined'), 'No native Web Audio output in this browser build.');
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/sounds/gentle-journey-v1.mp3', async route => { await held; await route.continue(); });
  const requested = page.waitForRequest('**/sounds/gentle-journey-v1.mp3');
  await begin(page); await requested; await menu(page); await page.getByRole('button', { name: '종료', exact: true }).click();
  await page.getByRole('button', { name: '여행 마치기', exact: true }).click(); release();
  await expect(page.getByRole('button', { name: '친구', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.musicBuffers.length)).toBe(1);
  expect(await starts(page)).toHaveLength(0);
});

test('background expiry and refresh require no automatic or duplicate music', async ({ page }) => {
  await instrumentAudio(page); await page.clock.install(); await begin(page);
  const supportsAudio = await page.evaluate(() => typeof AudioContext !== 'undefined');
  if (supportsAudio) await expect.poll(() => active(page)).toBe(1);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.reload(); await expect(page.locator('[data-status="running"]')).toBeVisible();
  expect(await starts(page)).toHaveLength(0);
  await expect(page.getByRole('button', { name: '소리 켜기', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '소리 켜기', exact: true }).click();
  if (supportsAudio) await expect.poll(() => active(page)).toBe(1);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  if (supportsAudio) await expect.poll(() => active(page)).toBe(0);
  const count = (await starts(page)).length;
  const target = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).targetTimestamp);
  await page.clock.setSystemTime(target + 60_000);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.runFor(32); expect((await starts(page)).length).toBe(count);
  await expect(page.locator('[data-status="arriving"]')).toBeVisible();
});

test('unavailable music leaves the timer and effects working and can be retried', async ({ page }) => {
  await instrumentAudio(page); await page.goto('./');
  test.skip(!await page.evaluate(() => typeof AudioContext !== 'undefined'), 'No native Web Audio output in this browser build.');
  const failures: string[] = []; page.on('pageerror', error => failures.push(error.message));
  await page.route('**/sounds/gentle-journey-v1.mp3', route => route.fulfill({ status: 404, body: '' }));
  await begin(page); await menu(page);
  await expect(page.getByText('음악을 불러오지 못했어요. 껐다 다시 켜 주세요.')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.playedSounds.filter(url => url.endsWith('/start.mp3')).length)).toBe(1);
  await expect(page.locator('[data-status="running"]')).toBeVisible();
  await page.getByRole('switch', { name: '배경음악', exact: true }).click();
  await page.unroute('**/sounds/gentle-journey-v1.mp3');
  await page.getByRole('switch', { name: '배경음악', exact: true }).click();
  await expect.poll(() => active(page)).toBe(1); expect(failures).toEqual([]);
});
