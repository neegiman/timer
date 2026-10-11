import { test, expect } from '@playwright/test';
import manifest from '../../src/lib/destinationScenery.json';

for (const [character, width] of [['토끼', 320], ['토끼', 1440], ['로켓', 390]] as const) {
  test(`destination enters through the far right at full size and opacity: ${character} ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem('promise-journey:v1:soundEnabled', 'false');
      localStorage.setItem('promise-journey:v1:selectedDuration', '10');
      localStorage.setItem('promise-journey:v1:backgroundSeason', '"spring"');
      localStorage.setItem('promise-journey:v1:backgroundMode', '"day"');
    });
    await page.clock.install();
    await page.goto('./');
    await page.getByRole('button', { name: '친구', exact: true }).click();
    await page.getByRole('button', { name: character, exact: true }).click();
    await page.getByRole('button', { name: '출발!', exact: true }).click();
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    const session = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!));
    const art = character === '로켓' ? manifest.space : manifest.spring.day;
    await page.locator('.destination-paint').evaluate(async (paint) => {
      const image = new Image(); image.src = (paint as HTMLElement).dataset.destinationSrc!; await image.decode();
    });
    const read = () => page.evaluate((art) => {
      const scene = document.querySelector('.journey-scene')!.getBoundingClientRect();
      const goal = document.querySelector<HTMLElement>('.destination-background')!;
      const paint = document.querySelector<HTMLElement>('.destination-paint')!;
      const box = paint.getBoundingClientRect(), style = getComputedStyle(goal);
      const matrix = new DOMMatrixReadOnly(style.transform);
      return { sceneRight: scene.right, sceneX: scene.x, y: box.y, width: box.width, height: box.height,
        left: box.x + art.paintBounds.x / art.width * box.width,
        anchorX: box.x + art.anchor.x / art.width * box.width,
        lineX: Number(document.querySelector<HTMLElement>('.character-wrapper')!.dataset.finishLineX),
        opacity: style.opacity, paintOpacity: getComputedStyle(paint).opacity,
        transition: style.transitionDuration, animation: style.animationName,
        scaleX: matrix.a, scaleY: matrix.d, pageWidth: document.documentElement.scrollWidth, viewport: innerWidth };
    }, art);
    let first: Awaited<ReturnType<typeof read>> | undefined, previousLeft = Infinity;
    for (const progress of [0, .01, .1, .25, .5, .9, .99, 1]) {
      await page.clock.setSystemTime(session.startTimestamp + progress * 600_000);
      await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
      await expect.poll(async () => {
        await page.clock.runFor(32);
        return Number(await page.locator('.progress-marker').getAttribute('data-progress'));
      }).toBeCloseTo(progress, 3);
      const current = await read();
      expect(current.opacity).toBe('1'); expect(current.paintOpacity).toBe('1');
      expect(current.transition).toBe('0s'); expect(current.animation).toBe('none');
      expect(current.scaleX).toBe(1); expect(current.scaleY).toBe(1);
      expect(current.pageWidth).toBeLessThanOrEqual(current.viewport);
      if (!first) {
        first = current;
        expect(Math.abs(current.left - current.sceneRight)).toBeLessThan(1);
      } else {
        expect(current.left).toBeLessThan(previousLeft);
        expect(current.width).toBeCloseTo(first.width, 2);
        expect(current.height).toBeCloseTo(first.height, 2);
        expect(current.y).toBeCloseTo(first.y, 2);
      }
      previousLeft = current.left;
      if (progress === 1) expect(current.anchorX - current.sceneX).toBeCloseTo(current.lineX, 1);
      if (testInfo.project.name === 'chromium' && [0, .1, .25, .5, .9, 1].includes(progress)) {
        await page.locator('.journey-scene').screenshot({ path: `artifacts/destination-entry-${character}-${width}-${progress * 100}.png` });
      }
    }
    const arrived = await read();
    await page.clock.runFor(2000);
    expect(await read()).toEqual(arrived);
  });
}
