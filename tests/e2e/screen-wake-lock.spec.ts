import { test, expect, type Page } from '@playwright/test';

declare global {
  interface Window {
    screenWakeLockTest: {
      stats(): { requests: number; active: number; releases: number };
      visibility(value: DocumentVisibilityState): void;
      release(): Promise<void>;
    };
  }
}

async function instrumentWakeLock(page: Page, mode: 'supported' | 'unsupported' | 'rejected' = 'supported') {
  await page.addInitScript((mode) => {
    let requests = 0, releases = 0;
    let visibility: DocumentVisibilityState = 'visible';
    const leases: MockLease[] = [];
    class MockLease extends EventTarget {
      released = false;
      async release() {
        if (this.released) return;
        this.released = true; releases++;
        this.dispatchEvent(new Event('release'));
      }
    }
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: mode === 'unsupported' ? undefined : {
      request: async (type: string) => {
        requests++;
        if (type !== 'screen') throw new Error('Only a screen lock is allowed');
        if (mode === 'rejected' && requests === 1) throw new DOMException('Low power mode', 'NotAllowedError');
        const lease = new MockLease(); leases.push(lease); return lease;
      },
    } });
    window.screenWakeLockTest = {
      stats: () => ({ requests, releases, active: leases.filter((lease) => !lease.released).length }),
      visibility(value) { visibility = value; document.dispatchEvent(new Event('visibilitychange')); },
      async release() { for (const lease of leases) await lease.release(); },
    };
  }, mode);
}
const stats = (page: Page) => page.evaluate(() => window.screenWakeLockTest.stats());
const deadline = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).targetTimestamp as number);
async function start(page: Page) {
  await page.clock.install();
  await page.goto('./');
  expect((await stats(page)).requests).toBe(0);
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '출발!', exact: true }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-status', 'running');
}
const menu = (page: Page) => page.getByRole('button', { name: '부모 메뉴', exact: true }).click();

test('running journey stays awake; pause, resume, background, arrival and completion own one lock', async ({ page }) => {
  await instrumentWakeLock(page); await start(page);
  await expect.poll(async () => (await stats(page)).active).toBe(1);
  await menu(page);
  await expect(page.getByTestId('screen-wake-lock-status')).toHaveAttribute('data-state', 'active');
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  await expect.poll(async () => (await stats(page)).active).toBe(0);
  await page.clock.fastForward(60_000);
  await menu(page); await page.getByRole('button', { name: '계속', exact: true }).click();
  await expect.poll(async () => (await stats(page)).active).toBe(1);
  const end = await deadline(page);
  await page.evaluate(() => window.screenWakeLockTest.visibility('hidden'));
  await expect.poll(async () => (await stats(page)).active).toBe(0);
  const before = (await stats(page)).requests;
  await page.evaluate(() => {
    window.screenWakeLockTest.visibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('pageshow'));
  });
  await expect.poll(async () => (await stats(page)).active).toBe(1);
  expect((await stats(page)).requests).toBe(before + 1);
  expect(await deadline(page)).toBe(end);
  await page.clock.setSystemTime(new Date(end + 1));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.locator('.app-shell')).toHaveAttribute('data-status', 'arriving');
  expect((await stats(page)).active).toBe(1);
  await page.clock.fastForward(6000);
  await expect(page.locator('.app-shell')).toHaveAttribute('data-status', 'completed');
  await expect.poll(async () => (await stats(page)).active).toBe(0);
});

test('parent preference persists; refresh, restart and exit preserve the timer and release locks', async ({ page }) => {
  await instrumentWakeLock(page); await start(page);
  await expect.poll(async () => (await stats(page)).active).toBe(1);
  await menu(page);
  const setting = page.getByRole('switch', { name: '화면 켜짐 유지', exact: true });
  await setting.click();
  await expect(setting).toHaveAttribute('aria-checked', 'false');
  await expect.poll(async () => (await stats(page)).active).toBe(0);
  const end = await deadline(page);
  await page.reload();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-status', 'running');
  expect(await deadline(page)).toBe(end);
  expect((await stats(page)).requests).toBe(0);
  await menu(page);
  await expect(setting).toHaveAttribute('aria-checked', 'false');
  await setting.click();
  await expect.poll(async () => (await stats(page)).active).toBe(1);
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.reload();
  await expect.poll(async () => (await stats(page)).active).toBe(1);
  expect(await deadline(page)).toBe(end);
  await menu(page);
  await page.getByRole('button', { name: '처음부터', exact: true }).click();
  await page.getByRole('button', { name: '다시 출발', exact: true }).click();
  expect((await stats(page)).active).toBe(1);
  await menu(page);
  await page.getByRole('button', { name: '종료', exact: true }).click();
  await page.getByRole('button', { name: '여행 마치기', exact: true }).click();
  await expect.poll(async () => (await stats(page)).active).toBe(0);
  await expect(page.getByRole('heading', { name: '무엇을 할까요?' })).toBeVisible();
});

test('rejection and system release show a retry without changing the deadline', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await instrumentWakeLock(page, 'rejected'); await start(page);
  await menu(page);
  await expect(page.getByTestId('screen-wake-lock-status')).toHaveAttribute('data-state', 'unavailable');
  const end = await deadline(page);
  await page.getByRole('button', { name: '화면 켜짐 다시 시도' }).click();
  await expect.poll(async () => (await stats(page)).active).toBe(1);
  await page.evaluate(() => window.screenWakeLockTest.release());
  await expect(page.getByTestId('screen-wake-lock-status')).toHaveAttribute('data-state', 'unavailable');
  expect((await stats(page)).requests).toBe(2);
  await page.getByRole('button', { name: '화면 켜짐 다시 시도' }).click();
  await expect(page.getByTestId('screen-wake-lock-status')).toHaveAttribute('data-state', 'active');
  expect(await deadline(page)).toBe(end);
  await page.screenshot({ path: `artifacts/screen-wake-lock-${testInfo.project.name}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('unsupported browser still starts and advances the timestamp timer', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await instrumentWakeLock(page, 'unsupported'); await start(page);
  await menu(page);
  await expect(page.getByTestId('screen-wake-lock-status')).toHaveAttribute('data-state', 'unsupported');
  await expect(page.getByRole('button', { name: '화면 켜짐 다시 시도' })).toHaveCount(0);
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  const end = await deadline(page);
  await page.clock.fastForward(60_000);
  // Browser interactions also consume real elapsed time. Check the timestamp
  // progress rather than assuming the menu took exactly zero milliseconds.
  await expect.poll(async () => Number(await page.getByTestId('traveler').getAttribute('data-progress'))).toBeGreaterThanOrEqual(.1);
  expect(await deadline(page)).toBe(end);
  expect((await stats(page)).requests).toBe(0);
  expect(errors).toEqual([]);
});
