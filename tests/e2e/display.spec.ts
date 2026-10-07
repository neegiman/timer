import { test, expect, type Page } from '@playwright/test';

async function start(page: Page) {
  await page.getByRole('button', { name: '씻기', exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '10 분', exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '출발!', exact: true }).click();
}
async function parentMenu(page: Page) {
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
}
async function assertInsideTrack(page: Page) {
  const scene = await page.locator('.journey-scene').boundingBox();
  const body = await page.locator('.traveler-body').boundingBox();
  expect(body!.x).toBeGreaterThanOrEqual(scene!.x);
  expect(body!.y).toBeGreaterThanOrEqual(scene!.y);
  expect(body!.x + body!.width).toBeLessThanOrEqual(scene!.x + scene!.width);
  expect(body!.y + body!.height).toBeLessThanOrEqual(scene!.y + scene!.height);
  for (const selector of ['.start-point', '.finish-point']) {
    const endpoint = await page.locator(selector).boundingBox();
    expect(endpoint!.x).toBeGreaterThanOrEqual(scene!.x);
    expect(endpoint!.x + endpoint!.width).toBeLessThanOrEqual(scene!.x + scene!.width);
    expect(endpoint!.y + endpoint!.height).toBeLessThanOrEqual(scene!.y + scene!.height);
  }
  const sizes = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth, shell: document.querySelector('.app-shell')!.scrollWidth }));
  expect(sizes.page).toBeLessThanOrEqual(sizes.viewport);
  expect(sizes.shell).toBeLessThanOrEqual(sizes.viewport);
}

test('browser fullscreen follows external exits and preserves the active journey', async ({ page }, testInfo) => {
  await page.clock.install();
  await page.goto('./');
  const supported = await page.evaluate(() => document.fullscreenEnabled && typeof document.documentElement.requestFullscreen === 'function');
  test.skip(!supported, 'Native fullscreen is unavailable here; the large page view is tested separately.');
  await start(page);
  await page.clock.fastForward(150_000);
  const deadline = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).targetTimestamp);
  await parentMenu(page);
  await page.getByRole('button', { name: '전체화면', exact: true }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-display', 'native');
  expect(await page.evaluate(() => document.fullscreenElement === document.documentElement)).toBe(true);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.clock.runFor(32);
  await assertInsideTrack(page);
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'artifacts/road-native-fullscreen.png', fullPage: true });
  // Browser-controlled exit (Esc/toolbar) must update the menu without restarting the timer.
  await page.evaluate(() => document.exitFullscreen());
  await expect(page.locator('.app-shell')).toHaveAttribute('data-display', 'window');
  await parentMenu(page);
  await page.getByRole('button', { name: '전체화면', exact: true }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-display', 'native');
  await parentMenu(page);
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  const paused = await page.getByTestId('countdown').textContent();
  await page.clock.fastForward(60_000);
  await expect(page.getByTestId('countdown')).toHaveText(paused!);
  await parentMenu(page);
  await page.getByRole('button', { name: '전체화면 끝내기', exact: true }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-display', 'window');
  expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).targetTimestamp)).toBe(deadline);
});

test('unsupported fullscreen uses a large page view, including landscape finish and Escape', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false });
    Object.defineProperty(document, 'webkitFullscreenEnabled', { configurable: true, value: false });
  });
  await page.clock.install();
  await page.goto('./');
  await start(page);
  await page.clock.fastForward(150_000);
  const deadline = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).targetTimestamp);
  await parentMenu(page);
  await page.getByRole('button', { name: '큰 화면 보기', exact: true }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-display', 'expanded');
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  for (const [width, height] of [[320, 740], [390, 844], [768, 1024], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.clock.runFor(64);
    await assertInsideTrack(page);
    if (testInfo.project.name === 'chromium') await page.screenshot({ path: `artifacts/road-expanded-${width}.png`, fullPage: true });
  }
  await expect(page.locator('.journey-scene')).toHaveAttribute('data-route-layout', 'compact');
  const scene = await page.locator('.journey-scene').boundingBox();
  expect(scene!.y + scene!.height).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).targetTimestamp)).toBe(deadline);
  await parentMenu(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.app-shell')).toHaveAttribute('data-display', 'expanded');
  await page.keyboard.press('Escape');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-display', 'window');
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  await parentMenu(page);
  await page.getByRole('button', { name: '큰 화면 보기', exact: true }).click();
  await page.clock.setSystemTime(new Date(deadline + 1));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.locator('.journey-scene')).toHaveAttribute('data-phase', 'CROSS_FINISH');
  await page.clock.runFor(1900);
  await expect(page.locator('.journey-scene')).toHaveAttribute('data-phase', 'JUMP');
  await assertInsideTrack(page);
  await page.clock.fastForward(6000);
  await expect(page.locator('[data-status="completed"]')).toBeVisible();
  await assertInsideTrack(page);
  await page.getByRole('button', { name: '⭐ 약속 지켰어요' }).click();
  await expect(page.getByTestId('star-count')).toHaveText('1');
  await parentMenu(page);
  await page.getByRole('button', { name: '큰 화면 끝내기', exact: true }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-display', 'window');
  await page.reload();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-display', 'window');
  await expect(page.getByTestId('star-count')).toHaveText('1');
});

test('a rejected browser fullscreen request falls back without an unhandled error', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
    Object.defineProperty(Element.prototype, 'requestFullscreen', { configurable: true, value: () => Promise.reject(new DOMException('Unavailable', 'NotAllowedError')) });
  });
  await page.goto('./');
  await parentMenu(page);
  await page.getByRole('button', { name: '전체화면', exact: true }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-display', 'expanded');
  await parentMenu(page);
  await page.getByRole('button', { name: '큰 화면 끝내기', exact: true }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-display', 'window');
  expect(errors).toEqual([]);
});

test('the road, remaining stepping stones and feet share geometry after resizing', async ({ page }, testInfo) => {
  await page.clock.install();
  await page.goto('./');
  await start(page);
  for (const elapsed of [150_000, 300_000, 590_000]) {
    const now = await page.evaluate(() => Date.now() - JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).startTimestamp);
    await page.clock.fastForward(elapsed - now);
    for (const [width, height] of [[320, 740], [390, 844], [844, 390], [1440, 900]]) {
      await page.setViewportSize({ width, height });
      await page.clock.runFor(64);
      const readGeometry = () => page.evaluate(() => {
        const path = document.querySelector<SVGPathElement>('[data-route-path]')!;
        const actor = document.querySelector<HTMLElement>('.character-wrapper')!;
        const position = Number(actor.dataset.position);
        const point = path.getPointAtLength(position * path.getTotalLength()).matrixTransform(path.getScreenCTM()!);
        const box = actor.getBoundingClientRect();
        const traveled = document.querySelector('[data-traveled]')!;
        const stones = [...document.querySelectorAll<SVGElement>('[data-stone-position]')];
        return { error: Math.hypot(point.x - box.x, point.y - box.y), position, dash: Number(traveled.getAttribute('stroke-dasharray')!.split(' ')[0]),
          remaining: stones.filter((stone) => stone.dataset.walked !== 'true').length,
          expectedRemaining: stones.filter((stone) => Number(stone.dataset.stonePosition) > position).length,
          surface: getComputedStyle(path).stroke };
      });
      await expect.poll(async () => { await page.clock.runFor(32); return (await readGeometry()).error; }, { message: `feet leave the road at ${width}px` }).toBeLessThan(1);
      const geometry = await readGeometry();
      expect(geometry.dash).toBeCloseTo(geometry.position, 5);
      expect(geometry.remaining).toBe(geometry.expectedRemaining);
      expect(geometry.surface).not.toBe('none');
      await assertInsideTrack(page);
      if (testInfo.project.name === 'chromium' && width === 390) await page.screenshot({ path: `artifacts/road-mobile-${elapsed}.png`, fullPage: true });
    }
  }
});
