import { test, expect, type Page } from '@playwright/test';

async function start(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '출발!', exact: true }).click();
  await expect(page.locator('[data-status="running"]')).toBeVisible();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
}
async function seek(page: Page, elapsed: number) {
  const start = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).startTimestamp);
  await page.clock.setSystemTime(start + elapsed);
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await page.clock.runFor(32);
}
async function menu(page: Page) { await page.getByRole('button', { name: '부모 메뉴', exact: true }).click(); }

test.describe('Korean calendar scenery', () => {
  test.use({ timezoneId: 'America/Los_Angeles' });
  test('four seasons and both skies change on foreground restoration while a paused timer stays frozen', async ({ page }, testInfo) => {
    test.setTimeout(60_000); // Eight real settings-panel round trips take longer on mobile WebKit.
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.install({ time: new Date('2026-03-15T12:00:00+09:00') });
    await start(page); await seek(page, 13_000); await menu(page);
    await page.getByRole('button', { name: '일시정지', exact: true }).click(); await page.clock.runFor(32);
    const remaining = await page.getByTestId('countdown').textContent();
    const colors = new Set<string>();
    for (const [season, date] of [['spring', '2026-03-15'], ['summer', '2026-06-15'], ['autumn', '2026-09-15'], ['winter', '2026-12-15']] as const) {
      await page.clock.setSystemTime(new Date(`${date}T12:00:00+09:00`));
      await page.evaluate(() => window.dispatchEvent(new Event('pageshow'))); await page.clock.runFor(32);
      await expect(page.locator('.journey-scene')).toHaveAttribute('data-season', season);
      for (const theme of ['day', 'night'] as const) {
        await menu(page); await page.getByRole('button', { name: theme === 'day' ? '낮 배경' : '밤 배경', exact: true }).click();
        await page.getByRole('button', { name: '닫기', exact: true }).click(); await page.clock.runFor(32);
        await expect(page.locator('.journey-scene')).toHaveAttribute('data-theme', theme);
        await expect(page.getByTestId('countdown')).toHaveText(remaining!);
        colors.add(await page.locator('.journey-scene').evaluate((element) => getComputedStyle(element).getPropertyValue('--scene-leaf').trim()));
        if (testInfo.project.name === 'chromium') {
          // Let only color transitions finish; the active journey and visitors remain paused.
          await page.waitForTimeout(1250);
          await page.screenshot({ path: `artifacts/season-${season}-${theme}-390.png`, fullPage: true });
        }
      }
    }
    expect(colors.size).toBe(8);
    await page.reload(); await page.clock.runFor(32);
    await expect(page.locator('.journey-scene')).toHaveAttribute('data-season', 'winter');
    await expect(page.locator('[data-status="paused"]')).toBeVisible();
    await expect(page.getByTestId('countdown')).toHaveText(remaining!);
    expect(errors).toEqual([]);
  });
});

test('notices appear briefly, repeat every thirty seconds, preserve pause and leave the layout stable', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.clock.install({ time: new Date('2026-04-15T12:00:00+09:00') });
  await start(page);
  const message = page.getByTestId('journey-message'), scene = page.locator('.journey-scene');
  await expect(message).toHaveAttribute('data-visible', 'true');
  const top = (await scene.boundingBox())!.y;
  await seek(page, 20_000); await expect(message).toHaveAttribute('data-visible', 'false');
  await expect(message).toBeHidden();
  expect((await scene.boundingBox())!.y).toBe(top);
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'artifacts/season-notice-quiet-320.png', fullPage: true });
  await seek(page, 31_000); await expect(message).toHaveAttribute('data-visible', 'true');
  await expect(message).toHaveAttribute('data-cue', 'repeat-30000');
  await menu(page); await page.getByRole('button', { name: '일시정지', exact: true }).click(); await page.clock.runFor(32);
  const visitor = page.locator('[data-scenery-visitor]'), particles = page.locator('[data-scenery-particle]');
  const frozen = await visitor.getAttribute('style'), particle = await particles.first().getAttribute('style');
  await page.clock.fastForward(60_000);
  await expect(message).toHaveAttribute('data-visible', 'true'); await expect(visitor).toHaveAttribute('style', frozen!);
  await expect(particles.first()).toHaveAttribute('style', particle!);
  await page.reload(); await page.clock.runFor(32);
  await expect(message).toHaveAttribute('data-cue', 'repeat-30000');
  await menu(page); await page.getByRole('button', { name: '계속', exact: true }).click();
  await seek(page, 37_000); await expect(message).toHaveAttribute('data-visible', 'false');
  await seek(page, 128_000); await expect(message).toHaveAttribute('data-visible', 'false');
  await seek(page, 300_000); await expect(message).toHaveAttribute('data-cue', 'halfway'); await expect(message).toHaveAttribute('data-visible', 'true');
  await seek(page, 309_000); await expect(message).toHaveAttribute('data-visible', 'false');
  await seek(page, 540_000); await expect(message).toHaveAttribute('data-visible', 'true');
  await seek(page, 550_000); await expect(message).toHaveAttribute('data-visible', 'false');
  await seek(page, 595_000); await expect(message).toHaveAttribute('data-cue', 'last-seconds');
  await seek(page, 600_000); await page.clock.fastForward(6000);
  await expect(message).toHaveAttribute('data-cue', 'arrived'); await expect(message).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('seasonal visitors move on the shared clock and reduced motion removes them without hiding time', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-04-15T12:00:00+09:00') });
  await start(page); await seek(page, 13_000);
  const visitor = page.locator('[data-scenery-visitor]');
  await expect(visitor).toHaveAttribute('data-event', 'butterfly'); await expect(visitor).toHaveCSS('opacity', '1');
  const before = await visitor.getAttribute('style'); await page.clock.runFor(300);
  expect(await visitor.getAttribute('style')).not.toBe(before);
  await seek(page, 23_000); await expect(visitor).toHaveCSS('opacity', '0');
  await seek(page, 34_000); await expect(visitor).toHaveAttribute('data-event', 'birds'); await expect(visitor).toHaveCSS('opacity', '1');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.seasonal-atmosphere')).toBeHidden();
  await expect(page.getByTestId('countdown')).toBeVisible(); await expect(page.getByRole('progressbar')).toBeVisible();
  await seek(page, 600_000); await page.clock.fastForward(6000);
  const stopped = await visitor.getAttribute('style'); await page.clock.runFor(2000);
  await expect(visitor).toHaveAttribute('style', stopped!);
});
