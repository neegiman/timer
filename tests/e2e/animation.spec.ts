import { test, expect, type Page } from '@playwright/test';
import { instrumentAudio } from './audio';

async function begin(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '출발!' }).click();
  await expect(page.locator('[data-status="running"]')).toBeVisible();
}

async function seek(page: Page, elapsed: number) {
  const start = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).startTimestamp);
  await page.clock.setSystemTime(start + elapsed);
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await page.clock.runFor(32);
}

test('preparation, rests, midpoint, recognition, run transition, real countdown and ordered finish', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await instrumentAudio(page);
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await begin(page);
  const supportsAudio = await page.evaluate(() => typeof AudioContext !== 'undefined');
  const played = (name: string) => page.evaluate((sound) => window.playedSounds.filter((url) => url.endsWith(`/${sound}.mp3`)).length, name);
  const scene = page.locator('.journey-scene');
  await expect(scene).toHaveAttribute('data-phase', 'INTRO');
  await page.clock.runFor(400);
  expect(Number(await page.locator('.character-wrapper').getAttribute('data-position'))).toBe(0);
  await seek(page, 2000);
  await expect(scene).toHaveAttribute('data-phase', 'START');
  if (supportsAudio) await expect.poll(() => played('start')).toBe(1);
  await seek(page, 40_000);
  await expect(scene).toHaveAttribute('data-phase', 'WALK');
  await seek(page, 90_100);
  await expect(scene).toHaveAttribute('data-phase', 'REST');
  const rest = await page.locator('.character-wrapper').getAttribute('style');
  await seek(page, 90_800);
  expect(await page.locator('.character-wrapper').getAttribute('style')).toBe(rest);
  await seek(page, 180_300);
  await expect(scene).toHaveAttribute('data-phase', 'REACTION');
  await seek(page, 300_100);
  await expect(scene).toHaveAttribute('data-phase', 'MID_EVENT');
  await expect(page.getByRole('status')).toHaveText('절반 왔어요!');
  if (supportsAudio) await expect.poll(() => played('midpoint')).toBe(1);
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'artifacts/motion-midpoint.png', fullPage: true });
  await seek(page, 395_000);
  await expect(scene).toHaveAttribute('data-phase', 'FAST_WALK');
  await seek(page, 432_100);
  await expect(scene).toHaveAttribute('data-phase', 'REST');
  await seek(page, 460_000);
  await expect(scene).toHaveAttribute('data-phase', 'LOOK_FINISH');
  if (supportsAudio) await expect.poll(() => played('sparkle')).toBe(1);
  await seek(page, 480_300);
  await expect(scene).toHaveAttribute('data-phase', 'RUN_START');
  await seek(page, 490_000);
  await expect(scene).toHaveAttribute('data-phase', 'RUN');
  await expect(page.locator('[data-layer="tree"]')).toHaveAttribute('data-parallax-rate', '0.3');
  await expect(page.locator('[data-layer="grass"]')).toHaveAttribute('data-parallax-rate', '0.6');
  await seek(page, 590_100);
  await expect(scene).toHaveAttribute('data-phase', 'COUNTDOWN');
  await expect(page.getByTestId('final-countdown')).toHaveText('10');
  if (supportsAudio) await expect.poll(() => played('tick')).toBe(1);
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'artifacts/motion-countdown.png', fullPage: true });
  await seek(page, 597_100);
  await expect(scene).toHaveAttribute('data-phase', 'SPRINT');
  await expect(page.getByTestId('final-countdown')).toHaveText('3');
  if (supportsAudio) await expect.poll(() => played('strong-tick')).toBe(1);
  await seek(page, 600_000);
  await expect(scene).toHaveAttribute('data-phase', 'CROSS_FINISH');
  if (supportsAudio) await expect.poll(() => played('whoosh')).toBe(1);
  const arrival = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).arrivalTimestamp);
  for (const [offset, phase] of [[350, 'OVERSHOOT'], [750, 'BRAKE'], [1200, 'TURN'], [1700, 'JUMP'], [2300, 'LAND'], [2700, 'CELEBRATE']] as const) {
    await page.clock.setSystemTime(arrival + offset);
    await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
    await page.clock.runFor(32);
    await expect(scene).toHaveAttribute('data-phase', phase);
    expect(Number(await page.locator('.character-wrapper').getAttribute('data-position'))).toBeGreaterThan(1);
    await expect(page.getByRole('button', { name: '⭐ 약속 지켰어요' })).toHaveCount(0);
  }
  await page.clock.fastForward(2000);
  await expect(page.locator('[data-status="completed"]')).toBeVisible();
  await expect(page.getByRole('button', { name: '⭐ 약속 지켰어요' })).toBeVisible();
  if (supportsAudio) {
    for (const sound of ['pop', 'land', 'finish', 'midpoint', 'sparkle']) await expect.poll(() => played(sound)).toBe(1);
    expect(await page.evaluate(() => window.audioDiagnostics)).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test('pause freezes phase, gait, clouds and countdown; resume continues that same action', async ({ page }) => {
  await instrumentAudio(page);
  await page.clock.install();
  await begin(page);
  await seek(page, 590_100);
  const supportsAudio = await page.evaluate(() => typeof AudioContext !== 'undefined');
  const ticks = () => page.evaluate(() => window.playedSounds.filter((url) => url.endsWith('/tick.mp3')).length);
  if (supportsAudio) await expect.poll(ticks).toBe(1);
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  await page.clock.runFor(32);
  const pose = () => page.evaluate(() => ({
    phase: document.querySelector('.journey-scene')!.getAttribute('data-phase'),
    position: document.querySelector('.character-wrapper')!.getAttribute('data-position'),
    body: document.querySelector('.traveler-body')!.getAnimations({ subtree: true }).map((animation) => animation.currentTime),
    cloud: document.querySelector('.cloud-drift')!.getAnimations().map((animation) => animation.currentTime),
    number: document.querySelector('[data-testid="final-countdown"]')!.textContent,
  }));
  const frozen = await pose();
  await page.clock.fastForward(5000);
  expect(await pose()).toEqual(frozen);
  if (supportsAudio) expect(await ticks()).toBe(1);
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '계속', exact: true }).click();
  await page.clock.runFor(64);
  expect((await pose()).phase).toBe(frozen.phase);
  expect((await pose()).number).toBe(frozen.number);
  if (supportsAudio) expect(await ticks()).toBe(1);
  await page.clock.fastForward(1000);
  await expect(page.getByTestId('final-countdown')).toHaveText('9');
  if (supportsAudio) await expect.poll(ticks).toBe(2);
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('switch', { name: '숫자로 남은 시간 표시' }).click();
  await page.getByRole('button', { name: '닫기' }).click();
  await expect(page.getByTestId('final-countdown')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('거의 다 왔어요!');
});

test('exit during arrival cancels its scene and restart resets the controller', async ({ page }) => {
  await page.clock.install();
  await begin(page);
  await seek(page, 600_000);
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '처음부터', exact: true }).click();
  await page.getByRole('button', { name: '다시 출발', exact: true }).click();
  await expect(page.locator('.journey-scene')).toHaveAttribute('data-phase', 'INTRO');
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '종료', exact: true }).click();
  await page.getByRole('button', { name: '여행 마치기', exact: true }).click();
  await page.clock.fastForward(10_000);
  await expect(page.locator('.journey-scene')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '다음', exact: true })).toBeVisible();
  await expect(page.getByTestId('star-count')).toHaveText('0');
});

test('one and 120 minute journeys start their countdown at ten real seconds', async ({ page }) => {
  await page.clock.install();
  await page.goto('./');
  for (const minutes of [1, 120]) {
    await page.evaluate((duration) => {
      localStorage.clear();
      localStorage.setItem('promise-journey:v1:selectedDuration', JSON.stringify(duration));
    }, minutes);
    await begin(page);
    const duration = minutes * 60_000;
    await seek(page, duration - 11_000);
    await expect(page.getByTestId('final-countdown')).toHaveCount(0);
    await seek(page, duration - 9900);
    await expect(page.getByTestId('final-countdown')).toHaveText('10');
    await seek(page, duration - 2900);
    await expect(page.locator('.journey-scene')).toHaveAttribute('data-phase', 'SPRINT');
    await expect(page.getByTestId('final-countdown')).toHaveText('3');
  }
});
