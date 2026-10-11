import { test, expect } from '@playwright/test';
import { CROSSING_DURATION_MS, FINISH_DURATION_MS, finishPhaseStart } from '../../src/lib/animation';
import { princessAnatomy } from '../../src/lib/princessMotion';
import { instrumentAudio } from './audio';

test('princess crosses a stationary line before celebrating with two visible arms', async ({ page }, testInfo) => {
  await instrumentAudio(page);
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await page.getByRole('button', { name: '친구', exact: true }).click();
  await page.getByRole('button', { name: '공주', exact: true }).click();
  await page.getByRole('button', { name: '출발!' }).click();
  await expect(page.locator('[data-status="running"]')).toBeVisible();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const session = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!));
  const scene = page.locator('.journey-scene'), goal = page.getByTestId('journey-goal');
  const seek = async (time: number) => {
    await page.clock.setSystemTime(time);
    await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
    await page.clock.runFor(16);
  };
  await seek(session.targetTimestamp - 30_000);
  await expect(goal).toHaveCount(1);
  await page.clock.runFor(32);
  await expect(goal.locator('.finish-flag')).toBeVisible();
  const lineX = (await goal.boundingBox())!.x;
  let previousX = 0;
  for (const remaining of [10_000, 2000, 100]) {
    await seek(session.targetTimestamp - remaining);
    const x = (await page.locator('.character-wrapper').boundingBox())!.x;
    expect(x).toBeGreaterThanOrEqual(previousX);
    expect(x).toBeLessThan(lineX);
    expect((await goal.boundingBox())!.x).toBeCloseTo(lineX, 4);
    previousX = x;
  }
  await seek(session.targetTimestamp);
  await expect(scene).toHaveAttribute('data-phase', 'CROSS_FINISH');
  const arrival = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).arrivalTimestamp);
  const ground = await scene.getAttribute('data-ground-distance');
  await expect(page.locator('.arrival-sparkles')).toHaveCount(0);
  await seek(arrival + CROSSING_DURATION_MS + 50);
  await expect(scene).toHaveAttribute('data-phase', 'SETTLE');
  expect((await page.locator('.traveler-body .character-artwork').boundingBox())!.x).toBeGreaterThan(lineX + 4);
  expect(await scene.getAttribute('data-ground-distance')).toBe(ground);
  await expect(page.locator('.arrival-sparkles')).toHaveCount(0);
  if (testInfo.project.name === 'chromium') await scene.screenshot({ path: 'artifacts/princess-crossed-line-390.png' });
  await seek(arrival + finishPhaseStart('CELEBRATE') + 1000);
  await expect(scene).toHaveAttribute('data-phase', 'CELEBRATE');
  // Compare actual paint with each forearm removed: a DOM limb behind the dress
  // is not a visible limb. Each hand/forearm must contribute visible pixels.
  const visibleArmPixels = await page.locator('.traveler-body .painted-princess-artwork').evaluate(async (element, anatomy) => {
    const original = element.cloneNode(true) as SVGSVGElement;
    for (const image of original.querySelectorAll('image')) {
      const blob = await (await fetch(image.getAttribute('href')!)).blob();
      const data = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(blob); });
      image.setAttribute('href', data);
    }
    original.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    original.setAttribute('width', '160'); original.setAttribute('height', '210');
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 840;
    const context = canvas.getContext('2d')!;
    const render = async (svg: SVGSVGElement) => {
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
      try {
        const image = new Image(); image.src = url; await image.decode();
        context.clearRect(0, 0, 640, 840); context.drawImage(image, 0, 0, 640, 840);
        return context.getImageData(0, 0, 640, 840).data;
      } finally { URL.revokeObjectURL(url); }
    };
    const full = await render(original), result: Record<string, number> = {};
    for (const side of ['front', 'back'] as const) {
      const removed = original.cloneNode(true) as SVGSVGElement;
      removed.querySelector(`[data-arm="${side}"] [data-painted-part="${anatomy.arms[side].lowerPart}"]`)!.remove();
      const without = await render(removed); let count = 0;
      for (let i = 0; i < full.length; i += 4) {
        if (Math.max(...[0, 1, 2, 3].map((channel) => Math.abs(full[i + channel] - without[i + channel]))) > 32) count++;
      }
      result[side] = count;
    }
    return result;
  }, princessAnatomy);
  for (const [side, pixels] of Object.entries(visibleArmPixels)) expect(pixels, `${side} forearm/hand is hidden by the dress`).toBeGreaterThan(200);
  if (testInfo.project.name === 'chromium') await scene.screenshot({ path: 'artifacts/princess-celebration-after-390.png' });
  await seek(arrival + FINISH_DURATION_MS + 100);
  await expect(page.locator('[data-status="completed"]')).toBeVisible();
  if (await page.evaluate(() => typeof AudioContext !== 'undefined')) {
    await expect.poll(() => page.evaluate(() => window.playedSounds.filter((url) => url.endsWith('/finish.mp3')).length)).toBe(1);
  }
  for (const [width, height] of [[320, 740], [390, 844], [844, 390], [1440, 1000]]) {
    await page.setViewportSize({ width, height }); await page.clock.runFor(32);
    const bounds = (await scene.boundingBox())!, art = (await page.locator('.traveler-body .character-artwork').boundingBox())!;
    expect(art.x).toBeGreaterThan((await goal.boundingBox())!.x + 4);
    expect(art.x + art.width).toBeLessThanOrEqual(bounds.x + bounds.width);
  }
  await page.reload(); await page.clock.runFor(32);
  await expect(scene).toHaveAttribute('data-phase', 'CELEBRATE');
  expect((await page.locator('.traveler-body .character-artwork').boundingBox())!.x).toBeGreaterThan((await goal.boundingBox())!.x + 4);
});
