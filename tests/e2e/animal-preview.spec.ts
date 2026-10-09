import { walkingPawContact } from '../../src/lib/walkingAnatomy';
import { test, expect } from '@playwright/test';

test('animal studies articulate paws with the ground, keep a fixed body and pause without restarting', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install();
  await page.goto('./animal-preview/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await expect(page.getByRole('heading', { name: '동물처럼 움직여요', exact: true })).toBeVisible();
  await expect(page.locator('[data-animal-scene]')).toHaveCount(4);
  await expect(page.locator('.animal-concept-friends [data-character]')).toHaveCount(4);
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
  await expect(page.locator('[data-animal-scene]')).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('planted animal paws have no sliding and motion reduction leaves a still study', async ({ page }) => {
  await page.clock.install();
  await page.goto('./animal-preview/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.getByRole('button', { name: '다시 보기', exact: false }).click();
  await page.clock.runFor(50);
  const contact = () => page.evaluate((sole) => {
    const scene = document.querySelector<HTMLElement>('[data-animal-scene="dog"]')!;
    const ankle = scene.querySelector<SVGGElement>('[data-animal-joint="nearHindAnkle"]')!;
    const point = new DOMPoint(sole.x, sole.y).matrixTransform(ankle.getScreenCTM()!);
    const bounds = scene.getBoundingClientRect();
    return { x: point.x, y: point.y, baseline: bounds.y + bounds.height * .75, ground: Number(scene.dataset.groundDistance) };
  }, walkingPawContact('dog', true));
  const first = await contact();
  await page.clock.runFor(100);
  const second = await contact();
  expect(Math.abs(first.y - first.baseline)).toBeLessThan(.3);
  expect(Math.abs(second.y - second.baseline)).toBeLessThan(.3);
  expect(Math.abs(second.x - first.x + second.ground - first.ground)).toBeLessThan(.3);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(async () => {
    await page.clock.runFor(32);
    return page.locator('[data-animal-scene="dog"]').getAttribute('data-ground-distance');
  }).toBe('0.00000');
  const before = await page.locator('[data-animal-joint="nearHindHip"]').first().getAttribute('transform');
  await page.clock.runFor(2000);
  expect(await page.locator('[data-animal-joint="nearHindHip"]').first().getAttribute('transform')).toBe(before);
  for (const ground of await page.locator('.animal-study-ground').all()) await expect(ground).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
});

test('all three mammal legs have painted limbs and separately visible front and rear paws', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./animal-preview/');
  await page.getByRole('button', { name: '보행 구조 보기', exact: true }).click();
  await expect(page.locator('[data-animal-scene]')).toHaveCount(4);
  const results = await page.locator('.natural-animal-artwork:not([data-animal="chick"])').evaluateAll(async (elements) => {
    const scale = 4;
    const raster = async (svg: SVGSVGElement) => {
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute('width', '160'); clone.setAttribute('height', '210');
      const image = new Image();
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
      try {
        image.src = url; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = 160 * scale; canvas.height = 210 * scale;
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return context.getImageData(0, 0, canvas.width, canvas.height).data;
      } finally { URL.revokeObjectURL(url); }
    };
    return Promise.all(elements.map(async (element) => {
      const svg = element as SVGSVGElement;
      const full = await raster(svg);
      const paws = [];
      for (const paw of svg.querySelectorAll<SVGGElement>('[data-paw]')) {
        const isolated = svg.cloneNode(true) as SVGSVGElement;
        isolated.querySelector('[data-animal-body]')!.replaceChildren(paw.cloneNode(true));
        const pixels = await raster(isolated);
        // Rendering the actual stroke catches zero-width objectBoundingBox gradients.
        const limbs = ['[data-paw-upper]', '[data-paw-lower]'].map((selector) => {
          const limb = paw.querySelector<SVGPathElement>(selector)!;
          const middle = limb.getPointAtLength(limb.getTotalLength() / 2);
          const screen = middle.matrixTransform(limb.getScreenCTM()!);
          const local = screen.matrixTransform(svg.getScreenCTM()!.inverse());
          const index = (Math.floor(local.y * scale) * 160 * scale + Math.floor(local.x * scale)) * 4;
          const outline = getComputedStyle(limb.previousElementSibling!).stroke.match(/\d+/g)!.map(Number);
          return { alpha: pixels[index + 3], fillContrast: outline.reduce((sum, channel, i) => sum + Math.abs(channel - pixels[index + i]), 0) };
        });
        let visible = 0;
        // Below the belly, each foot must contribute its own unoccluded painted pixels.
        for (let y = 187 * scale; y < 210 * scale; y++) for (let x = 0; x < 160 * scale; x++) {
          const index = (y * 160 * scale + x) * 4;
          if (pixels[index + 3] < 250 || full[index + 3] < 250) continue;
          if ([0, 1, 2].every((channel) => Math.abs(pixels[index + channel] - full[index + channel]) < 5)) visible++;
        }
        paws.push({ name: paw.dataset.paw, limbs, visible });
      }
      return { animal: svg.dataset.animal, paws };
    }));
  });
  expect(results).toHaveLength(3);
  for (const { animal, paws } of results) {
    expect(paws).toHaveLength(4);
    for (const paw of paws) {
      for (const limb of paw.limbs) {
        expect(limb.alpha, `${animal} ${paw.name} limb is not painted`).toBeGreaterThan(250);
        expect(limb.fillContrast, `${animal} ${paw.name} has only an outline and no fur fill`).toBeGreaterThan(20);
      }
      expect(paw.visible, `${animal} ${paw.name} is obscured by another leg`).toBeGreaterThan(50);
    }
  }
  if (testInfo.project.name === 'chromium') {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('.animal-motion-section').screenshot({ path: 'artifacts/animal-four-legs-desktop.png' });
    await page.setViewportSize({ width: 320, height: 740 });
    await page.locator('[data-animal-scene="rabbit"]').screenshot({ path: 'artifacts/animal-four-legs-rabbit-mobile.png' });
  }
});
