import { test, expect } from '@playwright/test';
import { finishPhaseStart } from '../../src/lib/animation';
import { PRINCE_ASSET, princeViewBox } from '../../src/lib/princeMotion';
import { instrumentAudio } from './audio';

test('pixel prince stays visible, walks with the ground, pauses, restores and celebrates once', async ({ page }, testInfo) => {
  const errors: string[] = [], failed: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) failed.push(response.url()); });
  await instrumentAudio(page);
  await page.clock.install();
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('./');
  await page.getByRole('button', { name: '친구', exact: true }).click();
  const choice = page.getByRole('button', { name: '왕자', exact: true });
  for (let i = 0; i < 3; i++) {
    if (testInfo.project.name === 'webkit-mobile') await choice.tap(); else await choice.click();
    await expect(choice).toHaveAttribute('aria-pressed', 'true');
    await expect(choice.locator('[data-prince-sprite]')).toBeVisible();
    await expect(choice.locator('[data-prince-sprite]')).toHaveCSS('overflow', 'hidden');
  }
  await expect(choice.locator('image')).toHaveAttribute('href', `/timer${PRINCE_ASSET}`);
  const standingFrame = await choice.locator('[data-prince-sprite]').evaluate((node) => node.outerHTML);
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'artifacts/prince-selection-320.png', fullPage: true });
  await page.getByRole('button', { name: '출발!' }).click();
  await expect(page.locator('[data-status="running"]')).toBeVisible();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const sprite = page.locator('.traveler-body [data-prince-sprite]');
  const miniature = page.locator('.progress-marker [data-prince-sprite]');
  await expect(sprite).toHaveCSS('overflow', 'hidden');
  await expect(miniature).toHaveCSS('overflow', 'hidden');
  const start = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).startTimestamp);
  const seek = async (time: number) => {
    await page.clock.setSystemTime(time);
    await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
    await page.clock.runFor(16);
  };
  const frames: string[] = [];
  for (let i = 0; i < 12; i++) {
    await seek(start + 400 + 1200 * 40 + i * 100);
    const frame = Number(await sprite.getAttribute('data-frame'));
    expect(frame).toBeGreaterThanOrEqual(1); expect(frame).toBeLessThanOrEqual(12);
    await expect(sprite).toHaveAttribute('viewBox', princeViewBox(frame));
    await expect(miniature).toHaveAttribute('data-frame', String(frame));
    await expect(miniature).toHaveAttribute('viewBox', princeViewBox(frame));
    frames.push(await sprite.evaluate((node) => node.outerHTML));
    await expect(page.locator('.character-wrapper')).toHaveAttribute('data-position', '.42');
  }
  expect(new Set(frames).size).toBe(12);
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'artifacts/prince-walking-320.png', fullPage: true });
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '일시정지', exact: true }).click(); await page.clock.runFor(32);
  const frozen = await sprite.getAttribute('data-frame'), distance = await page.locator('.journey-scene').getAttribute('data-ground-distance');
  await expect(miniature).toHaveAttribute('data-frame', frozen!);
  await page.clock.runFor(3000); await expect(sprite).toHaveAttribute('data-frame', frozen!);
  await expect(miniature).toHaveAttribute('data-frame', frozen!);
  await expect(page.locator('.journey-scene')).toHaveAttribute('data-ground-distance', distance!);
  await page.reload(); await page.clock.runFor(32); await expect(sprite).toHaveAttribute('data-frame', frozen!);
  await expect(miniature).toHaveAttribute('data-frame', frozen!);
  await expect(page.locator('[data-status="paused"]')).toBeVisible();
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '계속', exact: true }).click(); await page.clock.runFor(150);
  expect(await sprite.getAttribute('data-frame')).not.toBe(frozen);
  expect(await miniature.getAttribute('data-frame')).toBe(await sprite.getAttribute('data-frame'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(sprite).toHaveAttribute('data-frame', '0');
  await expect(miniature).toHaveAttribute('data-frame', '0');
  await page.clock.runFor(300); await expect(sprite).toHaveAttribute('data-frame', '0');
  await expect(page.locator('[data-layer="ground"]')).toHaveAttribute('data-scroll-offset', '0.000000');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const target = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).targetTimestamp);
  await seek(target);
  await expect(miniature).toHaveAttribute('data-frame', '0');
  await expect(miniature).toHaveAttribute('viewBox', princeViewBox(0));
  await page.clock.runFor(finishPhaseStart('CELEBRATE') + 150);
  await expect(page.locator('.sprite-motion')).toHaveAttribute('data-action', 'celebrate');
  expect(Number(await sprite.getAttribute('data-frame'))).toBeGreaterThanOrEqual(15);
  const raisedFrames: string[] = [];
  for (const frame of [15, 16, 17]) {
    await expect(sprite).toHaveAttribute('data-frame', String(frame));
    raisedFrames.push(await sprite.evaluate((node) => node.outerHTML));
    if (testInfo.project.name === 'chromium') await page.locator('.journey-scene').screenshot({ path: `artifacts/prince-celebrate-${frame}-320.png` });
    await page.clock.runFor(300);
  }
  await page.clock.runFor(4000); await expect(page.locator('[data-status="completed"]')).toBeVisible();
  await expect(miniature).toHaveAttribute('data-frame', '0');
  if (await page.evaluate(() => typeof AudioContext !== 'undefined')) {
    await expect.poll(() => page.evaluate(() => window.playedSounds.filter((url) => url.endsWith('/finish.mp3')).length)).toBe(1);
  }
  await page.getByRole('button', { name: '⭐ 약속 지켰어요' }).click(); await expect(page.getByTestId('star-count')).toHaveText('1');
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'artifacts/prince-arrival-320.png', fullPage: true });
  for (const [width, height] of [[320, 740], [390, 844], [844, 390], [1440, 1000]]) {
    await page.setViewportSize({ width, height }); await page.clock.runFor(32);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const scene = (await page.locator('.journey-scene').boundingBox())!, art = (await sprite.boundingBox())!;
    expect(art.x).toBeGreaterThanOrEqual(scene.x); expect(art.y).toBeGreaterThanOrEqual(scene.y);
    expect(art.x + art.width).toBeLessThanOrEqual(scene.x + scene.width);
  }
  // Decode the real exported SVG in each browser: a visible element can still contain a blank sprite.
  const raster = await page.evaluate(async ({ frames, sourcePath }) => {
    const blob = await (await fetch(sourcePath)).blob();
    const source = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(blob); });
    const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 210;
    const context = canvas.getContext('2d')!, result: { area: number; bottom: number; parts: number; hands: number[]; straightLegs: boolean }[] = [];
    for (const markup of frames) {
      const svg = new DOMParser().parseFromString(markup.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '), 'image/svg+xml').documentElement;
      svg.setAttribute('width', '160'); svg.setAttribute('height', '210'); svg.querySelector('image')!.setAttribute('href', source);
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
      try {
        const image = new Image(); image.src = url; await image.decode(); context.clearRect(0, 0, 160, 210); context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, 160, 210).data, seen = new Uint8Array(160 * 210);
        let area = 0, bottom = -1, parts = 0;
        const hands = [0, 0];
        for (let p = 0; p < seen.length; p++) {
          if (pixels[p * 4 + 3] < 128) continue;
          area++; bottom = Math.max(bottom, Math.floor(p / 160));
          const x = p % 160, y = Math.floor(p / 160);
          if (y < 101 && x < 52 && pixels[p * 4] === 246 && pixels[p * 4 + 1] === 201 && pixels[p * 4 + 2] === 156) hands[0]++;
          if (y < 101 && x >= 124 && pixels[p * 4] === 220 && pixels[p * 4 + 1] === 160 && pixels[p * 4 + 2] === 120) hands[1]++;
          if (seen[p]) continue;
          parts++; const queue = [p]; seen[p] = 1;
          for (let i = 0; i < queue.length; i++) {
            const n = queue[i], x = n % 160, y = Math.floor(n / 160);
            for (const next of [x > 0 ? n - 1 : -1, x < 159 ? n + 1 : -1, y > 0 ? n - 160 : -1, y < 209 ? n + 160 : -1]) {
              if (next >= 0 && !seen[next] && pixels[next * 4 + 3] >= 128) { seen[next] = 1; queue.push(next); }
            }
          }
        }
        const nativeAlpha = (x: number, y: number) => pixels[((13 + y * 4 + 2) * 160 + 16 + x * 4 + 2) * 4 + 3];
        const straightLegs = [37, 38, 39, 40, 41, 42].every((y) => nativeAlpha(13, y) >= 128 && nativeAlpha(20, y) >= 128 && nativeAlpha(17, y) === 0)
          && [43, 44, 45, 46, 47].every((y) => nativeAlpha(17, y) === 0);
        result.push({ area, bottom: bottom + 1, parts, hands, straightLegs });
      } finally { URL.revokeObjectURL(url); }
    }
    return result;
  }, { frames: [standingFrame, ...frames, ...raisedFrames], sourcePath: `/timer${PRINCE_ASSET}` });
  for (const frame of raster) {
    expect(frame.area).toBeGreaterThan(6400); expect(frame.bottom).toBe(205); expect(frame.parts).toBe(1);
  }
  expect(raster[0].straightLegs, 'Selected prince should stand with straight, separated legs').toBe(true);
  for (const frame of raster.slice(-3)) {
    expect(frame.straightLegs, 'Celebration should keep both legs upright and boots separate').toBe(true);
    expect(frame.hands[0], 'Near raised hand is missing from the actual sprite').toBeGreaterThanOrEqual(64);
    expect(frame.hands[1], 'Far raised hand is missing from the actual sprite').toBeGreaterThanOrEqual(64);
  }
  expect(errors).toEqual([]); expect(failed).toEqual([]);
});
