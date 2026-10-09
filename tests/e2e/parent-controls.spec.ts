import { test, expect, type Page } from '@playwright/test';

const storageKey = 'promise-journey:v1:activeSession';
async function session(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), storageKey);
}
async function start(page: Page) {
  await page.clock.install();
  await page.goto('./');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '출발!', exact: true }).click();
  await page.clock.fastForward(240_000);
}
async function confirmRestart(page: Page, touch = false) {
  const activate = async (name: string) => {
    const button = page.getByRole('button', { name, exact: true });
    if (touch) await button.tap(); else await button.click();
  };
  await activate('부모 메뉴'); await activate('처음부터');
  await expect(page.getByRole('dialog', { name: '다시 출발할까요?' })).toBeVisible();
  await activate('다시 출발');
  await page.clock.runFor(64);
}

test('restart still resets the deadline when mobile audio throws or rejects', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await start(page);
  for (const failure of ['synchronous', 'rejection'] as const) {
    const before = await session(page);
    await page.evaluate((failure) => {
      if (typeof AudioContext !== 'undefined') {
        Object.defineProperty(AudioContext.prototype, 'state', { configurable: true, get: () => 'suspended' });
        AudioContext.prototype.resume = function () {
          const error = new DOMException('Simulated unavailable audio output', 'InvalidStateError');
          if (failure === 'synchronous') throw error;
          return Promise.reject(error);
        };
      } else {
        Object.defineProperty(window, 'AudioContext', { configurable: true, value: class {
          constructor() { throw new DOMException('Simulated unavailable audio output', 'InvalidStateError'); }
        } });
      }
    }, failure);
    await confirmRestart(page);
    const after = await session(page);
    expect(after.id).not.toBe(before.id);
    expect(after.durationMs).toBe(600_000);
    expect(after.characterId).toBe(before.characterId);
    expect(after.promise).toEqual(before.promise);
    expect(after.status).toBe('running');
    expect(after.targetTimestamp - await page.evaluate(() => Date.now())).toBeGreaterThan(599_000);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '소리 켜기', exact: true })).toBeVisible();
    await expect(page.getByTestId('star-count')).toHaveText('0');
    expect(Number(await page.locator('.progress-marker').getAttribute('data-progress'))).toBeLessThan(.002);
    await page.reload();
    expect((await session(page)).targetTimestamp).toBe(after.targetTimestamp);
    await page.clock.fastForward(120_000);
  }
  expect(errors).toEqual([]);
});

test('touch restart from pause and the large view keeps confirmation and returns to full time', async ({ page, isMobile }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false });
    Object.defineProperty(document, 'webkitFullscreenEnabled', { configurable: true, value: false });
  });
  await start(page);
  const activate = async (name: string) => {
    const button = page.getByRole('button', { name, exact: true });
    if (isMobile) await button.tap(); else await button.click();
  };
  await activate('부모 메뉴'); await activate('큰 화면 보기');
  await activate('부모 메뉴'); await activate('일시정지');
  const before = await session(page);
  await activate('부모 메뉴'); await activate('처음부터'); await activate('돌아가기');
  expect((await session(page)).id).toBe(before.id);
  await expect(page.locator('.app-shell')).toHaveAttribute('data-status', 'paused');
  await confirmRestart(page, isMobile);
  expect((await session(page)).id).not.toBe(before.id);
  await expect(page.locator('.app-shell')).toHaveAttribute('data-status', 'running');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-display', 'expanded');
  await expect(page.getByTestId('countdown')).toHaveText('10:00남은 시간');
  expect(await page.locator('.app-shell').evaluate((element) => element.scrollTop)).toBe(0);
});

test('countdown digits and their caption each sit at the horizontal center', async ({ page }) => {
  await start(page);
  for (const [width, height] of [[320, 740], [390, 844], [768, 1024], [1280, 900], [820, 390]]) {
    await page.setViewportSize({ width, height });
    const alignment = await page.getByTestId('countdown').evaluate((element) => {
      const range = document.createRange();
      range.selectNode(element.firstChild!);
      const digits = range.getBoundingClientRect();
      const label = element.querySelector('span')!.getBoundingClientRect();
      const overview = element.parentElement!.getBoundingClientRect();
      return { digits: digits.x + digits.width / 2, label: label.x + label.width / 2,
        center: overview.x + overview.width / 2, digitsBottom: digits.bottom, labelTop: label.top };
    });
    expect(Math.abs(alignment.digits - alignment.center)).toBeLessThan(1);
    expect(Math.abs(alignment.label - alignment.center)).toBeLessThan(1);
    expect(alignment.labelTop).toBeGreaterThanOrEqual(alignment.digitsBottom);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('time selection labels stay horizontally and vertically centered on phone and desktop', async ({ page, isMobile }, testInfo) => {
  await page.goto('./');
  await page.getByRole('button', { name: '시간', exact: true }).click();
  const assertCentered = async () => {
    const offsets = await page.locator('.time-choice').evaluateAll((buttons) => buttons.map((button) => {
      const range = document.createRange(); range.selectNodeContents(button);
      const text = range.getBoundingClientRect(), box = button.getBoundingClientRect();
      return { name: button.textContent, x: text.x + text.width / 2 - box.x - box.width / 2,
        y: text.y + text.height / 2 - box.y - box.height / 2 };
    }));
    for (const label of offsets) {
      expect(Math.abs(label.x), `${label.name} horizontal center`).toBeLessThan(2);
      expect(Math.abs(label.y), `${label.name} vertical center`).toBeLessThan(2);
    }
  };
  for (const [width, height] of [[320, 740], [390, 844], [430, 932], [844, 390], [1280, 900]]) {
    await page.setViewportSize({ width, height });
    await assertCentered();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const name of ['5 분', '30 분', '직접 설정']) {
    const button = page.getByRole('button', { name, exact: true });
    if (isMobile) await button.tap(); else await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await assertCentered();
  }
  await page.getByRole('spinbutton', { name: '직접 설정 시간' }).fill('120');
  await assertCentered();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '시간', exact: true }).click();
  await assertCentered();
  await page.screenshot({ path: `artifacts/time-selection-centered-${testInfo.project.name}.png`, fullPage: true });
});
