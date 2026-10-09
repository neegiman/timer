import { test, expect, type Page } from '@playwright/test';
import { FINISH_DURATION_MS, finishPhaseStart } from '../../src/lib/animation';

async function start(page: Page, display: 'window' | 'expanded', sound = false) {
  await page.addInitScript((sound) => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false });
    Object.defineProperty(document, 'webkitFullscreenEnabled', { configurable: true, value: false });
    localStorage.setItem('promise-journey:v1:soundEnabled', JSON.stringify(sound));
  }, sound);
  await page.clock.install();
  await page.goto('./');
  await page.getByRole('button', { name: '친구', exact: true }).click();
  await page.getByRole('button', { name: '출발!', exact: true }).click();
  if (display === 'expanded') {
    await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
    await page.getByRole('button', { name: '큰 화면 보기', exact: true }).click();
    await expect(page.locator('.app-shell')).toHaveAttribute('data-display', 'expanded');
  }
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  return page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!));
}

async function seek(page: Page, time: number) {
  await page.clock.setSystemTime(time);
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  // Let ResizeObserver and the renderer settle as well as React's timer sample.
  for (let frame = 0; frame < 4; frame++) {
    await page.clock.runFor(32);
    await page.evaluate(() => document.querySelector('.journey-scene')!.getBoundingClientRect());
  }
}

async function landmarks(page: Page) {
  return page.evaluate(() => {
    // Page scrolling can finish after the start button's smooth scroll. Compare
    // layout coordinates so scrolling isn't mistaken for a moving finish line.
    const shell = document.querySelector<HTMLElement>('.app-shell')!;
    const scrollY = window.scrollY + (shell.dataset.display === 'expanded' ? shell.scrollTop : 0);
    return ['.journey-scene', '.goal-line', '.finish-flag > path', '.finish-point'].map((selector) => {
      const box = document.querySelector(selector)!.getBoundingClientRect();
      return { selector, x: box.x + window.scrollX, y: box.y + scrollY, width: box.width, height: box.height };
    });
  });
}

for (const display of ['window', 'expanded'] as const) {
  for (const [width, height] of [[390, 844], [844, 390]]) {
    test(`finish line and pole stay fixed through scrolling, crossing and rewards: ${display} ${width}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height });
      const session = await start(page, display);
      await seek(page, session.targetTimestamp - 30_000);
      const fixed = await landmarks(page);
      const ground = await page.locator('.ground-layer').getAttribute('style');
      await seek(page, session.targetTimestamp - 20_000);
      expect(await page.locator('.ground-layer').getAttribute('style')).not.toBe(ground);
      expect(await landmarks(page)).toEqual(fixed);
      await seek(page, session.targetTimestamp - 1000);
      expect(await landmarks(page)).toEqual(fixed);
      await seek(page, session.targetTimestamp);
      const arrival = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).arrivalTimestamp);
      const stopped = await page.locator('.ground-layer').getAttribute('style');
      for (const offset of [1800, finishPhaseStart('CELEBRATE') + 200, FINISH_DURATION_MS + 500]) {
        await seek(page, arrival + offset);
        expect(await landmarks(page)).toEqual(fixed);
        expect(await page.locator('.ground-layer').getAttribute('style')).toBe(stopped);
      }
      await expect(page.locator('.app-shell')).toHaveAttribute('data-status', 'completed');
      const line = (await page.locator('.goal-line').boundingBox())!;
      const actor = (await page.locator('.traveler-body .character-artwork').boundingBox())!;
      expect(actor.x).toBeGreaterThan(line.x + line.width);
      if (display === 'expanded' && width === 390) {
        await page.screenshot({ path: `artifacts/finish-fixed-${testInfo.project.name}.png`, fullPage: true });
      }
    });
  }
}

test('audio recovery at arrival cannot move the finish line or resize the scene', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const session = await start(page, 'expanded', true);
  await seek(page, session.targetTimestamp - 30_000);
  const fixed = await landmarks(page);
  // Simulate Safari interrupting an already unlocked output near the finish.
  await page.evaluate(() => {
    if (typeof AudioContext !== 'undefined') {
      Object.defineProperty(AudioContext.prototype, 'state', { configurable: true, get: () => 'suspended' });
    }
  });
  await seek(page, session.targetTimestamp);
  const arrival = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).arrivalTimestamp);
  await seek(page, arrival + finishPhaseStart('CELEBRATE') + 100);
  await expect(page.getByRole('button', { name: '소리 켜기', exact: true })).toBeVisible();
  expect(await landmarks(page)).toEqual(fixed);
  await page.clock.fastForward(FINISH_DURATION_MS + 1000);
  expect(await landmarks(page)).toEqual(fixed);
  await expect(page.locator('.app-shell')).toHaveAttribute('data-status', 'completed');
});
