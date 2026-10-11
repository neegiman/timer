import { test, expect } from '@playwright/test';
import manifest from '../../src/lib/destinationScenery.json';
import { arrivalMotion, finishGeometry } from '../../src/lib/arrivalMotion';
import { animalProfiles } from '../../src/lib/animalMotion';
import { groundDistance } from '../../src/lib/journey';
import { motionProfile } from '../../src/lib/motionProfiles';

for (const [character, width] of [['토끼', 320], ['토끼', 1440], ['로켓', 390]] as const) {
  test(`timed destination enters at the far right, stays on the ground and meets zero: ${character} ${width}px`, async ({ page }, testInfo) => {
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
      const actor = document.querySelector<HTMLElement>('.character-wrapper')!;
      return { sceneRight: scene.right, sceneX: scene.x, y: box.y, width: box.width, height: box.height,
        sceneWidth: scene.width, actorWidth: Number.parseFloat(getComputedStyle(actor).width),
        actorX: actor.getBoundingClientRect().x, ground: Number(document.querySelector<HTMLElement>('.journey-scene')!.dataset.groundDistance),
        entryX: Number.parseFloat(getComputedStyle(document.querySelector('.journey-scene')!).getPropertyValue('--destination-entryX')),
        remaining: Math.max(0, JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).targetTimestamp - Date.now()),
        left: box.x + art.paintBounds.x / art.width * box.width,
        anchorX: box.x + art.anchor.x / art.width * box.width,
        lineX: Number(document.querySelector<HTMLElement>('.character-wrapper')!.dataset.finishLineX),
        opacity: style.opacity, paintOpacity: getComputedStyle(paint).opacity,
        transition: style.transitionDuration, animation: style.animationName,
        scaleX: matrix.a, scaleY: matrix.d, pageWidth: document.documentElement.scrollWidth, viewport: innerWidth };
    }, art);
    const initial = await read(), geometry = finishGeometry(initial.sceneWidth, initial.actorWidth);
    const nativeSpeed = character === '토끼' ? animalProfiles.rabbit.travel / animalProfiles.rabbit.cycleMs : groundDistance(1, motionProfile('rocket').cycleMs);
    const speed = nativeSpeed * initial.actorWidth / 160;
    let low = 0, high = 600_000;
    for (let i = 0; i < 50; i++) {
      const time = (low + high) / 2;
      if (arrivalMotion(time, 600_000, 0, geometry, speed).destinationX > initial.entryX) low = time;
      else high = time;
    }
    const entryTime = high;
    let first: Awaited<ReturnType<typeof read>> | undefined, previousLeft = Infinity, previousGap = Infinity;
    for (const elapsed of [0, 300_000, entryTime, entryTime + 500, (entryTime + 600_000) / 2, 599_000, 600_000].sort((a, b) => a - b)) {
      const progress = elapsed / 600_000;
      await page.clock.setSystemTime(session.startTimestamp + elapsed);
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
        expect(current.left).toBeGreaterThan(current.sceneRight);
      } else {
        expect(current.left).toBeLessThan(previousLeft);
        expect(current.width).toBeCloseTo(first.width, 2);
        expect(current.height).toBeCloseTo(first.height, 2);
        expect(current.y).toBeCloseTo(first.y, 2);
      }
      previousLeft = current.left;
      const gap = current.anchorX - current.actorX;
      expect(gap).toBeLessThan(previousGap);
      previousGap = gap;
      expect(current.anchorX - current.sceneX + current.ground).toBeCloseTo(first.anchorX - first.sceneX + first.ground, 1);
      if (elapsed > 800 && progress < 1) expect(Math.abs(gap - current.remaining * speed)).toBeLessThan(1);
      if (elapsed === 300_000) expect(current.left).toBeGreaterThan(current.sceneRight);
      if (elapsed === entryTime) expect(Math.abs(current.left - current.sceneRight)).toBeLessThan(2);
      if (elapsed > entryTime) expect(current.left).toBeLessThan(current.sceneRight);
      if (progress === 1) expect(current.anchorX - current.sceneX).toBeCloseTo(current.lineX, 1);
      if (testInfo.project.name === 'chromium') {
        await page.locator('.journey-scene').screenshot({ path: `artifacts/destination-timed-${character}-${width}-${Math.round(600_000 - elapsed)}ms.png` });
      }
    }
    const arrived = await read();
    await page.clock.runFor(2000);
    const after = await read();
    for (const key of ['anchorX', 'left', 'y', 'width', 'height', 'ground'] as const) expect(after[key]).toBe(arrived[key]);
  });
}
