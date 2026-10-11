import { test, expect, type Page } from '@playwright/test';

test.use({ timezoneId: 'Asia/Seoul' });

type GeoHarness = Window & {
  geoCalls: number;
  geoPoint: (latitude: number, longitude: number) => void;
  geoError: (code: number) => void;
  geoPermission: (state: PermissionState) => void;
};

async function locationMock(page: Page, error = 0, permissionState: PermissionState = 'granted') {
  await page.addInitScript(({ error, permissionState }) => {
    const harness = window as unknown as GeoHarness;
    harness.geoCalls = 0;
    const permission = Object.assign(new EventTarget(), { state: permissionState });
    let point = { latitude: 37.5665, longitude: 126.978 };
    const watchers = new Map<number, { success: PositionCallback; error?: PositionErrorCallback | null }>();
    const position = () => ({ coords: { ...point, accuracy: 10, altitude: null, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() }) as GeolocationPosition;
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query: async () => permission } });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
      watchPosition(success: PositionCallback, onError?: PositionErrorCallback | null) {
        const id = ++harness.geoCalls;
        watchers.set(id, { success, error: onError });
        queueMicrotask(() => {
          const watcher = watchers.get(id);
          if (error) watcher?.error?.({ code: error } as GeolocationPositionError);
          else watcher?.success(position());
        });
        return id;
      },
      clearWatch(id: number) { watchers.delete(id); },
    } });
    harness.geoPoint = (latitude, longitude) => { point = { latitude, longitude }; for (const watcher of watchers.values()) watcher.success(position()); };
    harness.geoError = (code) => { for (const watcher of [...watchers.values()]) watcher.error?.({ code } as GeolocationPositionError); };
    harness.geoPermission = (state) => { permission.state = state; permission.dispatchEvent(new Event('change')); };
  }, { error, permissionState });
}

async function menu(page: Page) { await page.getByRole('button', { name: '부모 메뉴', exact: true }).click(); }
async function close(page: Page) { await page.getByRole('button', { name: '닫기', exact: true }).click(); }
async function start(page: Page) {
  await page.getByRole('button', { name: '씻기', exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '10 분', exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '출발!', exact: true }).click();
}

test('clock fallback changes sky on foreground restoration without changing a paused journey', async ({ page }) => {
  await locationMock(page);
  await page.clock.install({ time: new Date('2026-10-09T05:59:00+09:00') });
  await page.goto('./');
  await start(page);
  await page.clock.runFor(1500);
  await expect(page.locator('.journey-scene')).toHaveAttribute('data-theme', 'night');
  await menu(page);
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  const remaining = await page.getByRole('slider', { name: '여행 시간 조절' }).getAttribute('aria-valuetext');
  const ground = await page.locator('.ground-layer').getAttribute('style');
  await page.clock.setSystemTime(new Date('2026-10-09T06:00:00+09:00'));
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await expect(page.locator('.journey-scene')).toHaveAttribute('data-theme', 'day');
  await expect(page.getByRole('slider', { name: '여행 시간 조절' })).toHaveAttribute('aria-valuetext', remaining!);
  expect(await page.locator('.ground-layer').getAttribute('style')).toBe(ground);
  await page.clock.setSystemTime(new Date('2026-10-09T18:00:00+09:00'));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.locator('.journey-scene')).toHaveAttribute('data-theme', 'night');
  await expect(page.getByRole('slider', { name: '여행 시간 조절' })).toHaveAttribute('aria-valuetext', remaining!);
  expect(await page.evaluate(() => (window as unknown as GeoHarness).geoCalls)).toBe(0);
});

test('manual day/night persists, retains gait position and fits phone/landscape screens', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-10-09T12:00:00+09:00') });
  await page.goto('./');
  await start(page);
  await page.clock.runFor(2200);
  await menu(page);
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  const readPose = () => page.locator('.character-wrapper').evaluate((actor) => ({ transform: (actor as HTMLElement).style.transform,
    joints: [...actor.querySelectorAll('[data-joint], [data-animal-joint]')].map((joint) => joint.getAttribute('transform')), gait: (actor as HTMLElement).dataset.gaitTime }));
  const pose = await readPose();
  const ground = Number(await page.locator('.ground-layer').getAttribute('data-scroll-offset'));
  for (const theme of ['night', 'day'] as const) {
    await menu(page);
    await page.getByRole('button', { name: theme === 'night' ? '밤 배경' : '낮 배경', exact: true }).click();
    await close(page);
    await expect(page.locator('.journey-scene')).toHaveAttribute('data-theme', theme);
    expect(await readPose()).toEqual(pose);
    // WebKit can round the measured actor width differently after rotating.
    // Compare the actual displacement to sub-pixel precision, not CSS strings.
    expect(Number(await page.locator('.ground-layer').getAttribute('data-scroll-offset'))).toBeCloseTo(ground, 3);
    await expect(page.locator(theme === 'night' ? '.scene-night' : '.scene-day')).toHaveCSS('opacity', '1');
    for (const [width, height] of [[320, 740], [390, 844], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await page.clock.runFor(32);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const scene = await page.locator('.journey-scene').boundingBox();
      const body = await page.locator('.traveler-body').boundingBox();
      expect(body!.y + body!.height).toBeLessThanOrEqual(scene!.y + scene!.height);
      if (testInfo.project.name === 'chromium') await page.screenshot({ path: `artifacts/sky-${theme}-${width}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.runFor(32);
  }
  await menu(page);
  await page.getByRole('button', { name: '밤 배경', exact: true }).click();
  await close(page);
  await page.reload();
  await expect(page.locator('.journey-scene')).toHaveAttribute('data-theme', 'night');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-status', 'paused');
  await menu(page);
  await expect(page.getByRole('button', { name: '밤 배경', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '계속', exact: true }).click();
  const frozen = await page.locator('.ground-layer').getAttribute('style');
  await page.clock.runFor(1500);
  expect(await page.locator('.ground-layer').getAttribute('style')).not.toBe(frozen);
});

test.describe('location independent of device timezone', () => {
  test.use({ timezoneId: 'America/Los_Angeles' });
  test('browser geolocation delivers coordinates through its actual permission API', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 37.5665, longitude: 126.978 });
    await page.clock.install({ time: new Date('2026-03-20T03:00:00Z') });
    await page.goto('./');
    await start(page);
    await menu(page);
    await page.getByRole('button', { name: '현재 위치로 맞추기', exact: true }).click();
    await expect(page.getByTestId('location-status')).toContainText('현재 위치의 일출·일몰');
    await expect(page.locator('.journey-scene')).toHaveAttribute('data-theme', 'day');
    await context.setGeolocation({ latitude: 37.7749, longitude: -122.4194 });
    await expect(page.locator('.journey-scene')).toHaveAttribute('data-theme', 'night');
  });

  test('explicit location, position changes, reload and revocation keep only preferences locally', async ({ page }) => {
    await locationMock(page);
    await page.clock.install({ time: new Date('2026-03-20T03:00:00Z') });
    await page.goto('./');
    await start(page);
    await expect(page.locator('.journey-scene')).toHaveAttribute('data-theme', 'night');
    expect(await page.evaluate(() => (window as unknown as GeoHarness).geoCalls)).toBe(0);
    await menu(page);
    await page.getByRole('button', { name: '현재 위치로 맞추기', exact: true }).click();
    await expect(page.getByTestId('location-status')).toContainText('현재 위치의 일출·일몰');
    await expect(page.locator('.journey-scene')).toHaveAttribute('data-theme', 'day');
    await page.evaluate(() => (window as unknown as GeoHarness).geoPoint(37.7749, -122.4194));
    await expect(page.locator('.journey-scene')).toHaveAttribute('data-theme', 'night');
    await page.reload();
    await expect(page.locator('.journey-scene')).toHaveAttribute('data-theme', 'day');
    expect(await page.evaluate(() => (window as unknown as GeoHarness).geoCalls)).toBe(1);
    const stored = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
    expect(stored['promise-journey:v1:useLocationBackground']).toBe('true');
    expect(JSON.stringify(stored)).not.toMatch(/latitude|longitude|37\.5665|126\.978/);
    await menu(page);
    await page.evaluate(() => (window as unknown as GeoHarness).geoPermission('denied'));
    await expect(page.getByTestId('location-status')).toContainText('위치가 허용되지 않아');
    await expect(page.locator('.journey-scene')).toHaveAttribute('data-theme', 'night');
    await page.getByRole('button', { name: '기기 시간만 사용', exact: true }).click();
    await expect(page.getByRole('button', { name: '현재 위치로 맞추기', exact: true })).toBeVisible();
  });
});

for (const [code, message] of [[1, '위치가 허용되지 않아'], [3, '위치를 확인할 수 없어']] as const) {
  test(`location error ${code} falls back without repeated prompts or timer changes`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await locationMock(page, code, 'prompt');
    await page.clock.install({ time: new Date('2026-10-09T12:00:00+09:00') });
    await page.goto('./');
    await start(page);
    const deadline = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).targetTimestamp);
    await menu(page);
    await page.getByRole('button', { name: '현재 위치로 맞추기', exact: true }).click();
    await expect(page.getByTestId('location-status')).toContainText(message);
    await expect(page.locator('.journey-scene')).toHaveAttribute('data-theme', 'day');
    await page.getByRole('button', { name: '밤 배경', exact: true }).click();
    await page.getByRole('button', { name: '자동 배경', exact: true }).click();
    await expect(page.getByTestId('location-status')).toContainText('기기 시간');
    expect(await page.evaluate(() => (window as unknown as GeoHarness).geoCalls)).toBe(1);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).targetTimestamp)).toBe(deadline);
    expect(errors).toEqual([]);
  });
}

test('unavailable location and reduced motion still provide a readable night sky', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined }));
  await page.clock.install({ time: new Date('2026-10-09T23:00:00+09:00') });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('./');
  await start(page);
  await expect(page.locator('.scene-night')).toHaveCSS('opacity', '1');
  await expect(page.locator('.scene-night')).toHaveAttribute('data-scenery-src', '/timer/images/scenery-v1/autumn-night-landscape.webp');
  await menu(page);
  await page.getByRole('button', { name: '현재 위치로 맞추기', exact: true }).click();
  await expect(page.getByTestId('location-status')).toContainText('위치를 확인할 수 없어');
  for (const label of ['자동 배경', '낮 배경', '밤 배경']) {
    const box = await page.getByRole('button', { name: label, exact: true }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(48);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
