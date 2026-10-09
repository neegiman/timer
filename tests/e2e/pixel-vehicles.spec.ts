import { test, expect } from '@playwright/test';
import { finishPhaseStart } from '../../src/lib/animation';
import { PIXEL_VEHICLES, vehicleMotion, vehicleViewBox, vehicleAsset } from '../../src/lib/pixelVehicles';
import { instrumentAudio } from './audio';

for (const id of PIXEL_VEHICLES) test(`${id} pixel art clips correctly and preserves motion, pause, refresh and arrival`, async ({ page }, testInfo) => {
  const errors: string[] = [], failed: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) failed.push(response.url()); });
  await instrumentAudio(page); await page.clock.install();
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('./'); await page.getByRole('button', { name: '친구', exact: true }).click();
  const choice = page.getByRole('button', { name: vehicleMotion[id].name, exact: true });
  for (let i = 0; i < 3; i++) {
    if (testInfo.project.name === 'webkit-mobile') await choice.tap(); else await choice.click();
    await expect(choice).toHaveAttribute('aria-pressed', 'true');
    await expect(choice.locator('[data-vehicle-sprite]')).toHaveCSS('overflow', 'hidden');
    await expect(choice.locator('image')).toHaveAttribute('href', `/timer${vehicleAsset(id)}`);
  }
  if (testInfo.project.name === 'chromium' && id === 'car') await page.screenshot({ path: 'artifacts/pixel-vehicles-selection-320.png', fullPage: true });
  if (testInfo.project.name === 'chromium' && id === 'rocket') await page.screenshot({ path: 'artifacts/pixel-rocket-selection-320.png', fullPage: true });
  await page.getByRole('button', { name: '출발!' }).click();
  await expect(page.locator('[data-status="running"]')).toBeVisible();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const sprite = page.locator('.traveler-body [data-vehicle-sprite]');
  await expect(sprite).toHaveAttribute('data-character', id);
  await expect(sprite).toHaveCSS('overflow', 'hidden');
  await expect(page.locator('.progress-marker [data-vehicle-sprite]')).toHaveCSS('overflow', 'hidden');
  const session = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!));
  const seek = async (time: number) => {
    await page.clock.setSystemTime(time); await page.evaluate(() => window.dispatchEvent(new Event('pageshow'))); await page.clock.runFor(32);
  };
  await seek(session.startTimestamp + 40_000);
  const first = await sprite.getAttribute('data-frame'), distance = await page.locator('.journey-scene').getAttribute('data-ground-distance');
  await page.clock.runFor(350); expect(await sprite.getAttribute('data-frame')).not.toBe(first);
  expect(Number(await page.locator('.journey-scene').getAttribute('data-ground-distance'))).toBeGreaterThan(Number(distance));
  const frame = Number(await sprite.getAttribute('data-frame'));
  await expect(sprite).toHaveAttribute('viewBox', vehicleViewBox(frame));
  await expect(page.locator('.character-wrapper')).toHaveAttribute('data-position', '.42');
  if (id !== 'rocket') {
    const gap = await sprite.evaluate((svg) => {
      const root = svg as SVGSVGElement, scene = document.querySelector<HTMLElement>('.journey-scene')!;
      const sole = new DOMPoint(root.viewBox.baseVal.x + 40, root.viewBox.baseVal.y + 197).matrixTransform(root.getScreenCTM()!);
      return sole.y - scene.getBoundingClientRect().y - Number(scene.dataset.groundY);
    });
    expect(Math.abs(gap)).toBeLessThan(.5);
  }
  const walkingMarkup = await sprite.evaluate((node) => node.outerHTML);
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: `artifacts/pixel-${id}-walking-320.png`, fullPage: true });
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '일시정지', exact: true }).click(); await page.clock.runFor(32);
  const frozen = await sprite.getAttribute('data-frame'), frozenGround = await page.locator('.journey-scene').getAttribute('data-ground-distance');
  await page.clock.runFor(3000); await expect(sprite).toHaveAttribute('data-frame', frozen!);
  await expect(page.locator('.journey-scene')).toHaveAttribute('data-ground-distance', frozenGround!);
  await page.reload(); await page.clock.runFor(32);
  await expect(page.locator('[data-status="paused"]')).toBeVisible(); await expect(sprite).toHaveAttribute('data-frame', frozen!);
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '계속', exact: true }).click(); await page.clock.runFor(350);
  expect(await sprite.getAttribute('data-frame')).not.toBe(frozen);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await expect(sprite).toHaveAttribute('data-frame', '0');
  await page.clock.runFor(350); await expect(sprite).toHaveAttribute('data-frame', '0');
  await expect(page.locator('[data-layer="ground"]')).toHaveAttribute('data-scroll-offset', '0.000000');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const latest = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!));
  const total = latest.durationMs;
  // Foreground reconciliation keeps milestones and the single finish tied to actual remaining time.
  await seek(latest.targetTimestamp - total / 2); await expect(page.locator('.journey-scene')).toHaveAttribute('data-stage', 'halfway');
  await seek(latest.targetTimestamp - total / 10); await expect(page.locator('.journey-scene')).toHaveAttribute('data-stage', 'near');
  // The anchor intentionally has no box: its flag/finish marker are positioned children.
  await expect(page.getByTestId('journey-goal').locator('.finish-flag')).toBeVisible();
  // React may mount the goal after the mocked rAF; let its first paint run too.
  await expect.poll(async () => {
    await page.clock.runFor(32);
    return Number(await page.getByTestId('journey-goal').evaluate((node) => getComputedStyle(node).opacity));
  }).toBeGreaterThan(0);
  await seek(latest.targetTimestamp);
  const stopped = await page.locator('.journey-scene').getAttribute('data-ground-distance');
  await page.clock.runFor(finishPhaseStart('JUMP') + 150); await expect(sprite).toHaveAttribute('data-frame', '9');
  await page.clock.runFor(600); await expect(sprite).toHaveAttribute('data-frame', '10');
  await page.clock.runFor(400); expect(Number(await sprite.getAttribute('data-frame'))).toBeGreaterThanOrEqual(11);
  await page.clock.runFor(4000); await expect(page.locator('[data-status="completed"]')).toBeVisible();
  await expect(page.locator('.sprite-motion')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.journey-scene')).toHaveAttribute('data-ground-distance', stopped!);
  if (await page.evaluate(() => typeof AudioContext !== 'undefined')) await expect.poll(() => page.evaluate(() => window.playedSounds.filter((url) => url.endsWith('/finish.mp3')).length)).toBe(1);
  await page.getByRole('button', { name: '⭐ 약속 지켰어요' }).click(); await expect(page.getByTestId('star-count')).toHaveText('1');
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: `artifacts/pixel-${id}-arrival-320.png`, fullPage: true });
  for (const [width, height] of [[320, 740], [390, 844], [844, 390], [1440, 1000]]) {
    await page.setViewportSize({ width, height }); await page.clock.runFor(32);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const scene = (await page.locator('.journey-scene').boundingBox())!, art = (await sprite.boundingBox())!;
    expect(art.x).toBeGreaterThanOrEqual(scene.x); expect(art.y).toBeGreaterThanOrEqual(scene.y);
    expect(art.x + art.width).toBeLessThanOrEqual(scene.x + scene.width);
  }
  const painted = await page.evaluate(async ({ markup, sourcePath }) => {
    const blob = await (await fetch(sourcePath)).blob();
    const source = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(blob); });
    const svg = new DOMParser().parseFromString(markup.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '), 'image/svg+xml').documentElement;
    svg.setAttribute('width', '160'); svg.setAttribute('height', '210'); svg.querySelector('image')!.setAttribute('href', source);
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
    try {
      const image = new Image(); image.src = url; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 210;
      const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, 160, 210).data;
      let area = 0, bottom = -1;
      for (let p = 0; p < pixels.length / 4; p++) if (pixels[p * 4 + 3] > 128) { area++; bottom = Math.floor(p / 160); }
      return { area, bottom: bottom + 1 };
    } finally { URL.revokeObjectURL(url); }
  }, { markup: walkingMarkup, sourcePath: `/timer${vehicleAsset(id)}` });
  expect(painted.area).toBeGreaterThan(4300); expect(painted.bottom).toBeLessThan(210);
  if (id !== 'rocket') expect(painted.bottom).toBe(197);
  expect(errors).toEqual([]); expect(failed).toEqual([]);
});
