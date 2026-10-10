import { test, expect, type Page } from '@playwright/test';
import { FINISH_DURATION_MS, finishPhaseStart } from '../../src/lib/animation';

async function start(page: Page, display: 'window' | 'expanded', sound = false, character?: string, minutes = 10) {
  await page.addInitScript(({ sound, minutes }) => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false });
    Object.defineProperty(document, 'webkitFullscreenEnabled', { configurable: true, value: false });
    localStorage.setItem('promise-journey:v1:soundEnabled', JSON.stringify(sound));
    localStorage.setItem('promise-journey:v1:selectedDuration', JSON.stringify(minutes));
  }, { sound, minutes });
  await page.clock.install();
  await page.goto('./');
  await page.getByRole('button', { name: '친구', exact: true }).click();
  if (character) await page.getByRole('button', { name: character, exact: true }).click();
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
    return ['.journey-scene', '.goal-line', '.finish-flag > path', '.flag-cloth', '.finish-point', '.progress-endpoints > span:last-child'].map((selector) => {
      const box = document.querySelector(selector)!.getBoundingClientRect();
      return { selector, x: box.x + window.scrollX, y: box.y + scrollY, width: box.width, height: box.height };
    });
  });
}

async function expectFixed(page: Page, fixed: Awaited<ReturnType<typeof landmarks>>) {
  const current = await landmarks(page);
  expect(current.map((point) => point.selector)).toEqual(fixed.map((point) => point.selector));
  // SVG bounds can vary by a few floating-point bits after a page scroll.
  // A hundredth of a CSS pixel still catches the flag's previous visible sway.
  for (const [index, point] of current.entries()) {
    for (const axis of ['x', 'y', 'width', 'height'] as const) {
      expect(Math.abs(point[axis] - fixed[index][axis]), `${point.selector} ${axis}`).toBeLessThan(.01);
    }
  }
}

for (const display of ['window', 'expanded'] as const) {
  for (const [width, height] of [[390, 844], [844, 390]]) {
    test(`entire destination stays fixed through scrolling, crossing and rewards: ${display} ${width}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height });
      const session = await start(page, display);
      await seek(page, session.targetTimestamp - 30_000);
      const fixed = await landmarks(page);
      const ground = await page.locator('.ground-layer').getAttribute('style');
      await seek(page, session.targetTimestamp - 20_000);
      expect(await page.locator('.ground-layer').getAttribute('style')).not.toBe(ground);
      await expectFixed(page, fixed);
      await seek(page, session.targetTimestamp - 1000);
      await expectFixed(page, fixed);
      await seek(page, session.targetTimestamp);
      const arrival = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).arrivalTimestamp);
      const stopped = await page.locator('.ground-layer').getAttribute('style');
      for (const offset of [1800, finishPhaseStart('CELEBRATE') + 200, FINISH_DURATION_MS + 500]) {
        await seek(page, arrival + offset);
        await expectFixed(page, fixed);
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

for (const [minutes, width, height] of [[1, 320, 740], [10, 390, 844], [120, 1440, 900]]) {
  test(`distance to the fixed destination decreases across 90–100%: ${minutes}min ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    const session = await start(page, 'window', false, '왕자', minutes);
    let fixed: Awaited<ReturnType<typeof landmarks>> | undefined;
    let previousGap = Infinity;
    for (const progress of [.9, .92, .94, .96, .98, .99]) {
      await seek(page, session.startTimestamp + minutes * 60_000 * progress);
      const actor = (await page.locator('.character-wrapper').boundingBox())!;
      const goal = (await page.getByTestId('journey-goal').boundingBox())!;
      const gap = goal.x - actor.x;
      expect(gap, `No visible approach at ${progress * 100}%`).toBeLessThan(previousGap - 1);
      expect(gap).toBeGreaterThan(0);
      if (fixed) await expectFixed(page, fixed);
      else fixed = await landmarks(page);
      previousGap = gap;
      if (minutes === 10 && testInfo.project.name === 'chromium' && [.9, .94, .99].includes(progress)) {
        await page.locator('.journey-scene').screenshot({ path: `artifacts/approach-prince-${progress * 100}.png` });
      }
    }
    await seek(page, session.targetTimestamp);
    await expect(page.locator('.journey-scene')).toHaveAttribute('data-phase', 'CROSS_FINISH');
    await expectFixed(page, fixed!);
    const actor = (await page.locator('.character-wrapper').boundingBox())!;
    const goal = (await page.getByTestId('journey-goal').boundingBox())!;
    expect(actor.x).toBeGreaterThanOrEqual(goal.x);
  });
}

test('prince walks independently of both fixed destinations, including pause and restoration', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const session = await start(page, 'expanded', false, '왕자');
  await seek(page, session.targetTimestamp - 30_000);
  const fixed = await landmarks(page);
  const moving = async () => ({
    ground: await page.locator('.ground-layer').getAttribute('style'),
    miniature: await page.locator('.progress-marker').getAttribute('style'),
    frame: await page.locator('.traveler-body [data-prince-sprite]').getAttribute('data-frame'),
  });
  const walking = await moving();
  await page.clock.runFor(350);
  const next = await moving();
  expect(next.ground).not.toBe(walking.ground);
  expect(next.miniature).not.toBe(walking.miniature);
  expect(next.frame).not.toBe(walking.frame);
  await expectFixed(page, fixed);

  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  const stopped = await moving();
  await page.clock.runFor(5000);
  expect(await moving()).toEqual(stopped);
  await expectFixed(page, fixed);

  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '계속', exact: true }).click();
  await page.clock.runFor(350);
  expect((await moving()).ground).not.toBe(stopped.ground);
  await expectFixed(page, fixed);

  await page.reload();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-status', 'running');
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '큰 화면 보기', exact: true }).click();
  await page.clock.runFor(128);
  await expectFixed(page, fixed);
});

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
  await expectFixed(page, fixed);
  await page.clock.fastForward(FINISH_DURATION_MS + 1000);
  await expectFixed(page, fixed);
  await expect(page.locator('.app-shell')).toHaveAttribute('data-status', 'completed');
});
