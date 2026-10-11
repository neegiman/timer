import { test, expect, type Page } from '@playwright/test';
import { activityMessageOptions } from '../../src/lib/activityMessages';
import { promises } from '../../src/lib/promises';
import type { TimerMode, PromiseActivity } from '../../src/types/timer';
import type { JourneyStage } from '../../src/types/animation';

const custom = { id: 'custom', icon: '🎨', name: '그림 그리기', activity: '그림 그리기' };
async function seek(page: Page, elapsed: number) {
  const start = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).startTimestamp);
  await page.clock.setSystemTime(start + elapsed);
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await page.clock.runFor(32);
}
async function prepare(page: Page, promise: PromiseActivity, mode: TimerMode) {
  await page.clock.install(); await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('./');
  if (promise.id === 'custom') {
    await page.getByRole('button', { name: '직접 약속 쓰기' }).click(); await page.getByLabel('활동 이름').fill(promise.name);
  } else await page.getByRole('button', { name: promise.name, exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: mode === 'after' ? /활동 시작/ : /활동 마무리/ }).click();
  await expect(page.locator('.setup-card h1')).toHaveText(mode === 'after' ? '시작까지 얼마나 필요해?' : '마무리까지 얼마나 필요해?');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '출발!', exact: true }).click();
  await expect(page.locator('[data-status="running"]')).toBeVisible();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
}

for (const mode of ['after', 'during'] as const) for (const promise of [promises[0], promises[5], custom]) {
  test(`${promise.id} ${mode}: activity copy rotates only at notice windows and restores consistently`, async ({ page }, testInfo) => {
    const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
    await prepare(page, promise, mode);
    const message = page.getByTestId('journey-message'), scene = page.locator('.journey-scene');
    const check = async (stage: JourneyStage) => {
      expect(activityMessageOptions(promise, mode, stage)).toContain(await message.textContent());
      await expect(message).toHaveAttribute('data-message-id', new RegExp(`^${promise.id}-${mode}-${stage}-`));
    };
    // Reload and focused menu buttons may change document scroll. Compare the
    // scene's document position, not its viewport position, for layout shifts.
    const sceneTop = () => scene.evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
    await check('beginning'); const initial = await message.textContent(), top = await sceneTop();
    await page.clock.runFor(300); await expect(message).toHaveText(initial!);
    await seek(page, 20_000); await expect(message).toBeHidden(); await expect(page.getByTestId('journey-quiet')).toBeVisible();
    await seek(page, 31_000); await check('beginning'); await expect(message).not.toHaveText(initial!);
    const repeat = await message.textContent();
    await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
    await page.getByRole('button', { name: '일시정지', exact: true }).click();
    await page.clock.runFor(60_000); await expect(message).toHaveText(repeat!);
    await page.reload(); await expect(page.locator('[data-status="paused"]')).toBeVisible();
    await expect(message).toHaveText(repeat!);
    await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
    await page.getByRole('button', { name: '계속', exact: true }).click();
    // After resuming, elapsed time still excludes the paused minute.
    await seek(page, 300_000); await check('halfway'); await expect(message).toBeVisible();
    const halfway = await message.textContent();
    await page.clock.runFor(1000); await expect(message).toHaveText(halfway!);
    expect(await sceneTop()).toBe(top);
    if (testInfo.project.name === 'chromium') await page.screenshot({ path: `artifacts/activity-message-${promise.id}-${mode}-320.png`, fullPage: true });
    await seek(page, 540_000); await check('near');
    await seek(page, 600_000); await check('arrived'); await expect(message).toBeVisible();
    await page.clock.runFor(6000); await expect(page.locator('[data-status="completed"]')).toBeVisible();
    await check('arrived');
    await expect(message).not.toContainText(/도착|마무리|수고|잘했/);
    await expect(page.locator('.journey-message')).toBeHidden();
    await page.reload(); await check('arrived');
    await expect(page.locator('.journey-message')).toBeHidden();
    if (testInfo.project.name === 'chromium') await page.screenshot({ path: `artifacts/activity-action-${promise.id}-${mode}-320.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
