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
    const paintings = new Set<string>();
    for (const [season, date] of [['spring', '2026-03-15'], ['summer', '2026-06-15'], ['autumn', '2026-09-15'], ['winter', '2026-12-15']] as const) {
      await page.clock.setSystemTime(new Date(`${date}T12:00:00+09:00`));
      await page.evaluate(() => window.dispatchEvent(new Event('pageshow'))); await page.clock.runFor(32);
      await expect(page.locator('.journey-scene')).toHaveAttribute('data-season', season);
      for (const theme of ['day', 'night'] as const) {
        await menu(page); await page.getByRole('button', { name: theme === 'day' ? '낮 배경' : '밤 배경', exact: true }).click();
        await page.getByRole('button', { name: '닫기', exact: true }).click(); await page.clock.runFor(32);
        await expect(page.locator('.journey-scene')).toHaveAttribute('data-theme', theme);
        await expect(page.getByTestId('countdown')).toHaveText(remaining!);
        const painting = await page.locator(theme === 'day' ? '.scene-day' : '.scene-night').getAttribute('data-scenery-src');
        expect(painting).toContain(`/timer/images/scenery-v1/${season}-${theme}-landscape.webp`);
        paintings.add(painting!);
        if (testInfo.project.name === 'chromium') {
          // Let only color transitions finish; the active journey and visitors remain paused.
          await page.waitForTimeout(1250);
          await page.screenshot({ path: `artifacts/season-${season}-${theme}-390.png`, fullPage: true });
        }
      }
    }
    expect(paintings.size).toBe(8);
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
  const message = page.getByTestId('journey-message'), scene = page.locator('.journey-scene'), quiet = page.getByTestId('journey-quiet');
  await expect(message).toHaveAttribute('data-visible', 'true');
  await expect(quiet).toBeHidden();
  const top = (await scene.boundingBox())!.y;
  await seek(page, 20_000); await expect(message).toHaveAttribute('data-visible', 'false');
  await expect(message).toBeHidden();
  await expect(quiet).toBeVisible();
  await expect(quiet.locator('.quiet-promise img')).toHaveAttribute('src', '/timer/images/story-v1/bath.webp');
  await expect(quiet.locator('.quiet-star')).toHaveCount(4);
  await expect(page.locator('.stage-message')).toHaveAttribute('aria-live', 'off');
  expect((await scene.boundingBox())!.y).toBe(top);
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'artifacts/season-notice-quiet-320.png', fullPage: true });
  await menu(page); await page.getByRole('button', { name: '일시정지', exact: true }).click();
  await expect(quiet.locator('.quiet-star').first()).toHaveCSS('animation-play-state', 'paused');
  expect(await quiet.locator('.quiet-promise').evaluate((element) => getComputedStyle(element, '::before').animationPlayState)).toBe('paused');
  await page.clock.fastForward(2000); await expect(quiet).toBeVisible();
  await menu(page); await page.getByRole('button', { name: '계속', exact: true }).click();
  await expect(quiet.locator('.quiet-star').first()).toHaveCSS('animation-play-state', 'running');
  await seek(page, 31_000); await expect(message).toHaveAttribute('data-visible', 'true');
  await expect(quiet).toBeHidden();
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
  await expect(visitor).toHaveAttribute('data-event', 'birds'); await expect(visitor).toHaveCSS('opacity', '1');
  await expect(visitor.locator('[data-bird-kind="swallow"]')).toBeVisible();
  const before = await visitor.getAttribute('style'); await page.clock.runFor(300);
  expect(await visitor.getAttribute('style')).not.toBe(before);
  await seek(page, 23_000); await expect(visitor).toHaveCSS('opacity', '0');
  await seek(page, 34_000); await expect(visitor).toHaveAttribute('data-event', 'butterfly'); await expect(visitor).toHaveCSS('opacity', '1');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.seasonal-atmosphere')).toBeHidden();
  await expect(page.getByTestId('countdown')).toBeVisible(); await expect(page.getByRole('progressbar')).toBeVisible();
  await seek(page, 37_000);
  const quiet = page.getByTestId('journey-quiet');
  await expect(quiet).toBeVisible();
  await expect(quiet.locator('.quiet-star').first()).toHaveCSS('animation-name', 'none');
  expect(await quiet.locator('.quiet-promise').evaluate((element) => getComputedStyle(element, '::before').animationName)).toBe('none');
  await seek(page, 600_000); await page.clock.fastForward(6000);
  const stopped = await visitor.getAttribute('style'); await page.clock.runFor(2000);
  await expect(visitor).toHaveAttribute('style', stopped!);
});

test('parents can preview all eight backgrounds, persist a choice and return to calendar auto without moving a paused journey', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.clock.install({ time: new Date('2026-10-15T12:00:00+09:00') });
  await start(page); await seek(page, 10_120); await menu(page);
  await page.getByRole('button', { name: '일시정지', exact: true }).click(); await page.clock.runFor(32);
  const scene = page.locator('.journey-scene'), visitor = page.locator('[data-scenery-visitor]');
  const remaining = await page.getByTestId('countdown').textContent();
  const pose = await page.locator('.character-wrapper').getAttribute('style');
  const ground = await page.locator('.ground-layer').getAttribute('data-scroll-offset');
  for (const [season, name, bird] of [['spring', '봄', 'swallow'], ['summer', '여름', 'egret'], ['autumn', '가을', 'geese'], ['winter', '겨울', 'tit']] as const) {
    for (const theme of ['day', 'night'] as const) {
      await menu(page);
      await page.getByRole('button', { name: `${name} 배경`, exact: true }).click();
      await page.getByRole('button', { name: theme === 'day' ? '낮 배경' : '밤 배경', exact: true }).click();
      const buttons = await page.locator('.season-buttons button').evaluateAll((elements) => elements.map((element) => ({ x: element.getBoundingClientRect().x, y: element.getBoundingClientRect().y, width: element.getBoundingClientRect().width })));
      expect(new Set(buttons.slice(1).map((button) => button.y)).size).toBe(1);
      expect(buttons.every((button) => button.width >= 44 && button.x >= 0 && button.x + button.width <= 320)).toBe(true);
      await page.getByRole('button', { name: '닫기', exact: true }).click(); await page.clock.runFor(32);
      await expect(scene).toHaveAttribute('data-season', season); await expect(scene).toHaveAttribute('data-theme', theme);
      await expect(page.getByTestId('countdown')).toHaveText(remaining!);
      await expect(page.locator('.character-wrapper')).toHaveAttribute('style', pose!);
      await expect(page.locator('.ground-layer')).toHaveAttribute('data-scroll-offset', ground!);
      await expect(visitor).toHaveAttribute('data-event', theme === 'day' ? 'birds' : 'shooting-star');
      if (theme === 'night') await expect(visitor).toHaveCSS('opacity', '1');
      else expect(Number(await visitor.evaluate((element) => getComputedStyle(element).opacity))).toBeGreaterThan(0);
      await expect(visitor.locator(theme === 'day' ? `[data-bird-kind="${bird}"]` : '[data-visitor-art="shooting-star"]')).toBeVisible();
      if (testInfo.project.name === 'chromium') {
        await page.waitForTimeout(1250);
        await page.screenshot({ path: `artifacts/preview-${season}-${theme}-320.png`, fullPage: true });
      }
    }
  }
  await page.reload(); await page.clock.runFor(32);
  await expect(scene).toHaveAttribute('data-season', 'winter'); await expect(scene).toHaveAttribute('data-theme', 'night');
  await expect(page.locator('[data-status="paused"]')).toBeVisible();
  await expect(page.getByTestId('countdown')).toHaveText(remaining!);
  const frozen = await visitor.getAttribute('style');
  await page.clock.fastForward(2000); await expect(visitor).toHaveAttribute('style', frozen!);
  await menu(page);
  await page.getByRole('button', { name: '계절 자동', exact: true }).click();
  await page.getByRole('button', { name: '자동 배경', exact: true }).click();
  await page.getByRole('button', { name: '계속', exact: true }).click();
  await page.clock.runFor(300);
  await expect(scene).toHaveAttribute('data-season', 'autumn'); await expect(scene).toHaveAttribute('data-theme', 'day');
  expect(await visitor.getAttribute('style')).not.toBe(frozen);
  await expect(visitor.locator('[data-bird-kind="geese"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('audio recovery button has space below the journey in portrait and expanded landscape', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: undefined });
    Object.defineProperty(window, 'webkitAudioContext', { configurable: true, value: undefined });
    Object.defineProperty(document.documentElement, 'requestFullscreen', { configurable: true, value: undefined });
  });
  await page.clock.install({ time: new Date('2026-10-15T12:00:00+09:00') });
  await page.setViewportSize({ width: 390, height: 844 }); await start(page);
  const button = page.getByRole('button', { name: '소리 켜기', exact: true });
  await expect(button).toBeVisible();
  for (const [width, height] of [[320, 740], [390, 844], [844, 390]]) {
    await page.setViewportSize({ width, height });
    if (width === 844) { await menu(page); await page.getByRole('button', { name: /^(전체화면|큰 화면 보기)$/ }).click(); }
    await page.clock.runFor(32);
    const card = await page.locator('.journey-card').boundingBox(), recovery = await button.boundingBox();
    expect(recovery!.y - (card!.y + card!.height)).toBeGreaterThanOrEqual(23.5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('night glimmers flash briefly, fade, pause in place and stop with the finished journey', async ({ page }, testInfo) => {
  await page.clock.install({ time: new Date('2026-10-15T21:00:00+09:00') });
  await start(page); await seek(page, 10_120);
  const visitor = page.locator('[data-scenery-visitor]');
  await expect(visitor).toHaveAttribute('data-event', 'shooting-star'); await expect(visitor).toHaveCSS('opacity', '1');
  await expect(visitor.locator('[data-visitor-art="birds"]')).toBeHidden();
  const painting = visitor.locator('.meteor-glimmer img');
  await expect(painting).toHaveAttribute('src', '/timer/images/scenery-v1/painted-glimmer-v1.webp');
  await expect.poll(() => painting.evaluate((element) => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0)).toBe(true);
  const bounds = await visitor.boundingBox(); expect(bounds!.width).toBeLessThanOrEqual(40);
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'artifacts/meteor-glimmer-peak.png', fullPage: true });
  const position = () => visitor.evaluate((element) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
    return { x: matrix.m41, y: matrix.m42 };
  });
  const first = await position(); await page.clock.runFor(160); const next = await position();
  expect(next.x).toBeLessThan(first.x); expect(next.y).toBeGreaterThan(first.y);
  expect(first.x - next.x).toBeLessThan(22);
  await menu(page); await page.getByRole('button', { name: '일시정지', exact: true }).click(); await page.clock.runFor(32);
  const frozen = await visitor.getAttribute('style'); await page.clock.fastForward(2000);
  await expect(visitor).toHaveAttribute('style', frozen!);
  await menu(page); await page.getByRole('button', { name: '계속', exact: true }).click(); await page.clock.runFor(250);
  expect(await visitor.getAttribute('style')).not.toBe(frozen);
  await seek(page, 10_800); await expect(visitor).toHaveCSS('opacity', '0');
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'artifacts/meteor-glimmer-gone.png', fullPage: true });
  await seek(page, 58_120); await expect(visitor).toHaveAttribute('data-event', 'shooting-star'); await expect(visitor).toHaveCSS('opacity', '1');
  await seek(page, 600_000); await page.clock.fastForward(6000);
  const stopped = await visitor.getAttribute('style'); await page.clock.runFor(2000);
  await expect(visitor).toHaveAttribute('style', stopped!);
});

test('rocket has planets and a UFO that appears, drifts, pauses, disappears and survives refresh', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('promise-journey:v1:backgroundSeason', JSON.stringify('winter'));
    localStorage.setItem('promise-journey:v1:backgroundMode', JSON.stringify('night'));
  });
  await page.clock.install({ time: new Date('2026-10-15T12:00:00+09:00') });
  await page.goto('./');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '로켓', exact: true }).click();
  await page.getByRole('button', { name: '출발!', exact: true }).click();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const scene = page.locator('.journey-scene'), visitor = page.locator('[data-scenery-visitor]'), planets = page.locator('[data-space-planet]');
  await expect(scene).toHaveAttribute('data-environment', 'space');
  expect(await scene.getAttribute('data-season')).toBeNull();
  expect(await scene.getAttribute('data-theme')).toBeNull();
  await expect(scene.locator('[data-scenery="pixel-space-v1"]')).toBeVisible();
  await expect(scene.locator('[data-scenery-src*="/scenery-v1/"]')).toHaveCount(0);
  await expect(scene.locator('[data-layer]')).toHaveCount(3);
  await expect(page.locator('[data-rocket-sky]')).toBeVisible(); await expect(planets).toHaveCount(3);
  await expect(planets.locator('svg[shape-rendering="crispEdges"]')).toHaveCount(3);
  await seek(page, 13_000); await expect(visitor).toHaveAttribute('data-event', 'ufo'); await expect(visitor).toHaveCSS('opacity', '1');
  await expect(visitor.locator('[data-visitor-art="ufo"]')).toBeVisible();
  await expect(visitor.locator('[data-visitor-art="birds"]')).toBeHidden();
  const ufo = await visitor.getAttribute('style'), planet = await planets.first().getAttribute('style');
  await page.clock.runFor(400); expect(await visitor.getAttribute('style')).not.toBe(ufo); expect(await planets.first().getAttribute('style')).not.toBe(planet);
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'artifacts/rocket-ufo-day-390.png', fullPage: true });
  await menu(page); await page.getByRole('button', { name: '일시정지', exact: true }).click(); await page.clock.runFor(32);
  const frozenUfo = await visitor.getAttribute('style'), frozenPlanet = await planets.first().getAttribute('style');
  const frozenStars = await scene.locator('[data-layer="stars"]').getAttribute('style');
  const daySky = await scene.screenshot({ animations: 'disabled' });
  await page.clock.fastForward(3000); await expect(visitor).toHaveAttribute('style', frozenUfo!); await expect(planets.first()).toHaveAttribute('style', frozenPlanet!);
  await menu(page);
  await expect(page.getByTestId('space-background-status')).toContainText('계절과 낮·밤 없이 우주를 여행해요.');
  await expect(page.getByRole('button', { name: /^(계절 자동|봄 배경|여름 배경|가을 배경|겨울 배경|자동 배경|낮 배경|밤 배경)$/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /현재 위치/ })).toHaveCount(0);
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.clock.runFor(32); await expect(visitor).toHaveAttribute('data-event', 'ufo');
  await expect(planets.first()).toHaveAttribute('style', frozenPlanet!);
  await expect(scene.locator('[data-layer="stars"]')).toHaveAttribute('style', frozenStars!);
  expect((await scene.screenshot({ animations: 'disabled' })).equals(daySky)).toBe(true);
  await page.clock.setSystemTime(new Date('2026-12-15T22:00:00+09:00'));
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow'))); await page.clock.runFor(32);
  expect(await scene.getAttribute('data-season')).toBeNull(); expect(await scene.getAttribute('data-theme')).toBeNull();
  expect((await scene.screenshot({ animations: 'disabled' })).equals(daySky)).toBe(true);
  if (testInfo.project.name === 'chromium') {
    await page.waitForTimeout(1250); await page.screenshot({ path: 'artifacts/rocket-ufo-night-390.png', fullPage: true });
  }
  await page.reload(); await page.clock.runFor(32); await expect(scene).toHaveAttribute('data-environment', 'space'); await expect(visitor).toHaveAttribute('style', frozenUfo!);
  await menu(page); await page.getByRole('button', { name: '계속', exact: true }).click();
  await seek(page, 17_800); expect(Number(await visitor.evaluate((element) => getComputedStyle(element).opacity))).toBeLessThan(.1);
  await seek(page, 18_000); await expect(visitor).toHaveCSS('opacity', '0');
  await seek(page, 61_000); await expect(visitor).toHaveCSS('opacity', '1');
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.clock.runFor(32);
  await expect(page.locator('.seasonal-atmosphere')).toBeHidden(); await expect(planets.first()).toBeVisible();
  // WebKit may deliver the JS media-query change after the CSS has updated.
  await expect.poll(() => planets.first().evaluate((element) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
    return [matrix.m41, matrix.m42];
  })).toEqual([0, 0]);
  const still = await planets.first().getAttribute('style'); await page.clock.runFor(1000); await expect(planets.first()).toHaveAttribute('style', still!);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await seek(page, 600_000); await page.clock.fastForward(6000);
  const stopped = await planets.first().getAttribute('style'); await page.clock.runFor(1000); await expect(planets.first()).toHaveAttribute('style', stopped!);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('only rocket hides seasonal settings and preserves the other characters background preferences', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('./'); await menu(page);
  await page.getByRole('button', { name: '가을 배경', exact: true }).click();
  await page.getByRole('button', { name: '밤 배경', exact: true }).click();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByRole('button', { name: '친구', exact: true }).click();
  await page.getByRole('button', { name: '로켓', exact: true }).click(); await menu(page);
  await expect(page.getByTestId('space-background-status')).toBeVisible();
  await expect(page.getByRole('button', { name: '가을 배경', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '밤 배경', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.reload(); await menu(page);
  await expect(page.getByTestId('space-background-status')).toBeVisible();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByRole('button', { name: '친구', exact: true }).click();
  await page.getByRole('button', { name: '토끼', exact: true }).click(); await menu(page);
  await expect(page.getByTestId('space-background-status')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '가을 배경', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '밤 배경', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByRole('button', { name: '출발!', exact: true }).click();
  await expect(page.locator('.journey-scene')).toHaveAttribute('data-environment', 'nature');
  await expect(page.locator('.journey-scene')).toHaveAttribute('data-season', 'autumn');
  await expect(page.locator('.journey-scene')).toHaveAttribute('data-theme', 'night');
  await expect(page.locator('[data-rocket-sky]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('custom promises use the painted pinky promise icon during setup, travel and refresh', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('./');
  const custom = page.getByRole('button', { name: '직접 약속 쓰기', exact: true });
  await expect(custom.locator('img')).toHaveAttribute('src', '/timer/images/story-v1/custom.webp');
  await expect.poll(() => custom.locator('img').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBe(320);
  await custom.click(); await page.getByLabel('활동 이름', { exact: true }).fill('책 읽기');
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'artifacts/pinky-promise-setup-320.png', fullPage: true });
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '출발!', exact: true }).click();
  await expect(page.locator('[data-status="running"]')).toBeVisible();
  await expect(page.locator('.timer-layout img[src="/timer/images/story-v1/custom.webp"]:visible').first()).toBeVisible();
  await page.reload(); await expect(page.locator('[data-status="running"]')).toBeVisible();
  await expect(page.locator('.timer-layout img[src="/timer/images/story-v1/custom.webp"]:visible').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
