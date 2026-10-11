import { test, expect, type Page } from '@playwright/test';

async function expectActionInViewport(page: Page, name: '다음' | '출발!') {
  const action = page.getByRole('button', { name, exact: true });
  // Check geometry before click/tap: Playwright must not scroll the button into view for us.
  await expect.poll(() => action.evaluate((button) => {
    const box = button.getBoundingClientRect();
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop ?? 0;
    const bottom = top + (viewport?.height ?? innerHeight);
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return box.top >= top && box.bottom + 5 <= bottom && box.left >= 0 && box.right <= innerWidth
      && box.height >= 44 && !!hit && button.contains(hit);
  }), { message: `${name} must be fully visible and tappable without scrolling` }).toBe(true);
  const pageSize = await page.evaluate(() => ({ height: innerHeight, width: innerWidth,
    scrollHeight: document.documentElement.scrollHeight, scrollWidth: document.documentElement.scrollWidth, scrollY }));
  expect(pageSize.scrollHeight).toBeLessThanOrEqual(pageSize.height);
  expect(pageSize.scrollWidth).toBeLessThanOrEqual(pageSize.width);
  expect(pageSize.scrollY).toBe(0);
}

test('next and start remain visible on small phones, toolbar-sized viewports and landscape', async ({ page }, testInfo) => {
  await page.goto('./');
  for (const [width, height] of [[320, 568], [360, 640], [390, 664], [390, 844], [430, 932], [844, 390], [667, 375]]) {
    await page.setViewportSize({ width, height });
    for (const [step, label] of ['약속', '시간', '친구'].entries()) {
      await page.getByRole('button', { name: label, exact: true }).click();
      await expectActionInViewport(page, step === 2 ? '출발!' : '다음');
      if (step === 2 && width === 390 && height === 664) {
        for (const choice of await page.locator('.character-choice').all()) await expect(choice).toBeInViewport({ ratio: 1 });
      }
      if (testInfo.project.name === 'webkit-mobile' && width === 390 && height === 664) {
        await page.screenshot({ path: `artifacts/setup-visible-${step}-phone.png` });
      }
    }
  }
  await page.getByRole('button', { name: '출발!', exact: true }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-status', 'running');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-screen', 'timer');
  await expect(page.locator('.journey-scene')).toBeVisible();
});

test('custom input and scrolling choices never push the action off screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('./');
  await page.getByRole('button', { name: '직접 약속 쓰기' }).click();
  await expectActionInViewport(page, '다음');
  await expect(page.getByRole('button', { name: '다음', exact: true })).toBeDisabled();
  // A reduced viewport also covers the layout while an on-screen keyboard occupies space.
  await page.setViewportSize({ width: 390, height: 420 });
  await page.getByLabel('활동 이름').fill('함께 그림책 읽기');
  await expectActionInViewport(page, '다음');
  const content = page.locator('.setup-content');
  const actionBefore = await page.getByRole('button', { name: '다음', exact: true }).boundingBox();
  await content.evaluate((element) => { element.scrollTop = 0; });
  await expectActionInViewport(page, '다음');
  expect((await page.getByRole('button', { name: '다음', exact: true }).boundingBox())!.y).toBe(actionBefore!.y);
  await content.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect(page.getByLabel('활동 이름')).toBeInViewport();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBe(0);
  await page.getByRole('button', { name: '직접 설정', exact: true }).click();
  await page.getByRole('spinbutton', { name: '직접 설정 시간' }).fill('120');
  await expectActionInViewport(page, '다음');
  await page.setViewportSize({ width: 390, height: 664 });
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '로켓', exact: true }).click();
  await expectActionInViewport(page, '출발!');
  await page.getByRole('button', { name: '출발!', exact: true }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-status', 'running');
});

test('setup actions stay visible in the large screen fallback', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false });
    Object.defineProperty(document, 'webkitFullscreenEnabled', { configurable: true, value: false });
  });
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto('./');
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '큰 화면 보기', exact: true }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-display', 'expanded');
  await expectActionInViewport(page, '다음');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await expectActionInViewport(page, '다음');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.setViewportSize({ width: 844, height: 390 });
  await expectActionInViewport(page, '출발!');
});
