import { test, expect } from '@playwright/test';
import { finishPhaseStart } from '../../src/lib/animation';

test('rabbit ears stay joined to the head while walking, jumping, landing and reducing motion', async ({ page }, testInfo) => {
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await page.getByRole('button', { name: '친구', exact: true }).click();
  await page.getByRole('button', { name: '토끼', exact: true }).click();
  await page.getByRole('button', { name: '출발!' }).click();
  await expect(page.locator('[data-status="running"]')).toBeVisible();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const session = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!));
  const frames: string[] = [];
  const seek = async (time: number) => {
    await page.clock.setSystemTime(time);
    await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
    await page.clock.runFor(16);
  };
  const capture = async () => frames.push(await page.locator('.traveler-body .painted-animal-artwork').evaluate((svg) => svg.outerHTML));
  for (let pose = 0; pose < 8; pose++) {
    await seek(session.startTimestamp + 400 + 1250 * (48 + pose / 8));
    await capture();
  }
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'artifacts/rabbit-ears-mobile.png', fullPage: true });
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.clock.runFor(32); await capture();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await seek(session.targetTimestamp);
  const arrival = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).arrivalTimestamp);
  for (const phase of ['JUMP', 'LAND', 'CELEBRATE'] as const) { await seek(arrival + finishPhaseStart(phase) + 300); await capture(); }
  const overlaps = await page.evaluate(async (frames) => {
    const blob = await (await fetch('/timer/characters/raster-v1/rabbit.webp')).blob();
    const asset = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(blob); });
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 840;
    const context = canvas.getContext('2d')!;
    const raster = async (html: string, keep: string[]) => {
      const svg = new DOMParser().parseFromString(html.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '), 'image/svg+xml').documentElement;
      svg.setAttribute('width', '160'); svg.setAttribute('height', '210');
      for (const part of svg.querySelectorAll('[data-painted-part]')) if (!keep.includes(part.getAttribute('data-painted-part')!)) part.remove();
      for (const image of svg.querySelectorAll('image')) image.setAttribute('href', asset);
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
      try {
        const image = new Image(); image.src = url; await image.decode();
        context.clearRect(0, 0, 640, 840); context.drawImage(image, 0, 0, 640, 840);
        return context.getImageData(0, 0, 640, 840).data;
      } finally { URL.revokeObjectURL(url); }
    };
    const results = [];
    for (const [pose, html] of frames.entries()) {
      const head = await raster(html, ['head']);
      for (const ear of ['earNear', 'earFar']) {
        const pixels = await raster(html, [ear]), combined = await raster(html, ['head', ear]);
        let overlap = 0, covered = 0;
        for (let pixel = 0; pixel < head.length; pixel += 4) {
          if (head[pixel + 3] < 250 || pixels[pixel + 3] < 250) continue;
          overlap++;
          if ([0, 1, 2].every((channel) => Math.abs(combined[pixel + channel] - head[pixel + channel]) <= 2)) covered++;
        }
        results.push({ pose, ear, overlap, coveredRatio: covered / Math.max(1, overlap) });
      }
    }
    return results;
  }, frames);
  for (const result of overlaps) {
    expect(result.overlap, `${result.ear} has insufficient head overlap at pose ${result.pose}`).toBeGreaterThan(128);
    expect(result.coveredRatio, `${result.ear} root is painted over the head at pose ${result.pose}`).toBeGreaterThan(.99);
  }
});
