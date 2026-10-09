import { test, expect } from '@playwright/test';

test('animal studies articulate paws with the ground, keep a fixed body and pause without restarting', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install();
  await page.goto('./animal-preview/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await expect(page.getByRole('heading', { name: '동물처럼 움직여요', exact: true })).toBeVisible();
  await expect(page.locator('[data-animal-scene]')).toHaveCount(5);
  await expect(page.locator('.animal-concept-board img')).toHaveAttribute('src', '/timer/images/animal-design/natural-concepts-v2.png');
  const read = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-animal-scene]')].map((scene) => ({
    id: scene.dataset.animalScene, time: scene.dataset.motionTime,
    ground: scene.querySelector<HTMLElement>('.animal-study-ground')!.style.transform,
    x: scene.querySelector('.animal-study-actor')!.getBoundingClientRect().x,
    joints: [...scene.querySelectorAll('[data-animal-joint]')].map((joint) => joint.getAttribute('transform')),
  })));
  const first = await read();
  await page.clock.runFor(200);
  const second = await read();
  for (let i = 0; i < first.length; i++) {
    expect(second[i].x).toBe(first[i].x);
    expect(second[i].joints).not.toEqual(first[i].joints);
    expect(second[i].ground).not.toBe(first[i].ground);
  }
  await page.getByRole('button', { name: '잠깐 멈춤', exact: false }).click();
  await page.clock.runFor(32);
  const frozen = await read();
  await page.clock.runFor(5000);
  expect(await read()).toEqual(frozen);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.clock.runFor(32);
  const resized = await read();
  for (let i = 0; i < resized.length; i++) {
    expect(resized[i].time).toBe(frozen[i].time);
    expect(resized[i].joints).toEqual(frozen[i].joints);
  }
  await page.getByRole('button', { name: '느리게 보기', exact: false }).click();
  await page.getByRole('button', { name: '이어 보기', exact: false }).click();
  const elapsedBefore = Number((await read())[0].time);
  await page.clock.runFor(1000);
  // The DOM records the most recent rAF, which can lag the clock by one 60Hz frame.
  expect(Math.abs(Number((await read())[0].time) - elapsedBefore - 500)).toBeLessThan(1000 / 60 * .5 + 1);
  await page.getByRole('button', { name: '다시 보기', exact: false }).click();
  await page.clock.runFor(32);
  expect(Number((await read())[0].time)).toBeLessThan(32);
  for (const [width, height] of [[320, 740], [390, 844], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    await page.clock.runFor(64);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (testInfo.project.name === 'chromium') await page.screenshot({ path: `artifacts/natural-animal-preview-${width}.png`, fullPage: true });
  }
  await page.reload();
  await expect(page.locator('[data-animal-scene]')).toHaveCount(5);
  expect(errors).toEqual([]);
});

test('planted animal paws have no sliding and motion reduction leaves a still study', async ({ page }) => {
  await page.clock.install();
  await page.goto('./animal-preview/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.getByRole('button', { name: '다시 보기', exact: false }).click();
  await page.clock.runFor(50);
  const contact = () => page.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('[data-animal-scene="dog"]')!;
    const ankle = scene.querySelector<SVGGElement>('[data-animal-joint="nearHindAnkle"]')!;
    const point = new DOMPoint(0, 4).matrixTransform(ankle.getScreenCTM()!);
    const bounds = scene.getBoundingClientRect();
    return { x: point.x, y: point.y, baseline: bounds.y + bounds.height * .75, ground: Number(scene.dataset.groundDistance) };
  });
  const first = await contact();
  await page.clock.runFor(100);
  const second = await contact();
  expect(Math.abs(first.y - first.baseline)).toBeLessThan(.3);
  expect(Math.abs(second.y - second.baseline)).toBeLessThan(.3);
  expect(Math.abs(second.x - first.x + second.ground - first.ground)).toBeLessThan(.3);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.runFor(32);
  const before = await page.locator('[data-animal-joint="nearHindHip"]').first().getAttribute('transform');
  await page.clock.runFor(2000);
  expect(await page.locator('[data-animal-joint="nearHindHip"]').first().getAttribute('transform')).toBe(before);
  for (const ground of await page.locator('.animal-study-ground').all()) await expect(ground).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
});
