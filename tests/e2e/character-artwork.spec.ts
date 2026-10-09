import { test, expect, type Page } from '@playwright/test';
import { walkingPawContact } from '../../src/lib/walkingAnatomy';

async function begin(page: Page, name = '토끼') {
  await page.goto('./');
  await page.getByRole('button', { name: '친구', exact: true }).click();
  await page.getByRole('button', { name, exact: true }).click();
  await page.getByRole('button', { name: '출발!' }).click();
  await expect(page.locator('[data-status="running"]')).toBeVisible();
}
async function seek(page: Page, elapsed: number) {
  const start = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).startTimestamp);
  await page.clock.setSystemTime(start + elapsed);
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await page.clock.runFor(32);
}
const joints = (page: Page) => page.locator('.traveler-body [data-joint], .traveler-body [data-animal-joint]').evaluateAll((elements) => elements.map((element) => element.getAttribute('transform')));

test('articulated feet really exchange steps, and pause/refresh preserve their joint clock', async ({ page }, testInfo) => {
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await begin(page);
  const clock = await page.locator('.character-wrapper').evaluate((element) => parseFloat(getComputedStyle(element).getPropertyValue('--cycle')));
  // The gentle 800ms start consumes 400ms of gait time; sample opposite contact poses.
  await seek(page, 400 + clock * 48);
  const feet = () => page.locator('.traveler-body .character-artwork').evaluate((svg) => {
    const root = svg as SVGSVGElement;
    const inverse = root.getScreenCTM()!.inverse();
    return ['nearForeAnkle', 'nearHindAnkle'].map((name) => {
      const foot = root.querySelector<SVGGElement>(`[data-animal-joint="${name}"]`)!;
      const hip = foot.closest<SVGGElement>('[data-paw]')!;
      const origin = new DOMPoint(0, 0).matrixTransform(hip.getScreenCTM()!).matrixTransform(inverse);
      return new DOMPoint(0, 0).matrixTransform(foot.getScreenCTM()!).matrixTransform(inverse).x - origin.x;
    });
  });
  const first = await feet();
  expect(first[0]).toBeGreaterThan(first[1]);
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'artifacts/full-body-walk-a.png', fullPage: true });
  await seek(page, 400 + clock * 48.5);
  const second = await feet();
  expect(second[0]).toBeLessThan(second[1]);
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'artifacts/full-body-walk-b.png', fullPage: true });
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  await page.clock.runFor(32);
  const frozen = await joints(page);
  await page.clock.fastForward(5000);
  expect(await joints(page)).toEqual(frozen);
  await page.reload();
  await expect(page.locator('[data-status="paused"]')).toBeVisible();
  await expect.poll(async () => { await page.clock.runFor(32); return joints(page); }).toEqual(frozen);
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '계속', exact: true }).click();
  await page.clock.runFor(200);
  expect(await joints(page)).not.toEqual(frozen);
});

test('all eight friends share their full artwork in selection and journey, including mobile finish poses', async ({ page }, testInfo) => {
  await page.clock.install();
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('./');
  for (const [name, id] of [['토끼', 'rabbit'], ['강아지', 'dog'], ['고양이', 'cat'], ['병아리', 'chick'], ['공주', 'princess'], ['자동차', 'car'], ['기차', 'train'], ['로켓', 'rocket']]) {
    await page.getByRole('button', { name: '친구', exact: true }).click();
    const choice = page.getByRole('button', { name, exact: true });
    await expect(choice.locator('.character-artwork')).toHaveAttribute('data-character', id);
    if (testInfo.project.name === 'chromium' && id === 'rabbit') await page.screenshot({ path: 'artifacts/full-body-selection-320.png', fullPage: true });
    await choice.click();
    await page.getByRole('button', { name: '출발!' }).click();
    await seek(page, 40_000);
    const artwork = page.locator('.traveler-body .character-artwork');
    await expect(artwork).toHaveAttribute('data-character', id);
    await expect(page.locator('.traveler-body .character-emoji')).toHaveCount(0);
    if (['rabbit', 'dog', 'cat', 'chick'].includes(id)) {
      await expect(artwork.locator('[data-body]')).toHaveCount(1);
      expect(await artwork.locator('[data-animal-joint]').count()).toBeGreaterThanOrEqual(id === 'chick' ? 9 : 16);
      await expect(artwork).toHaveAttribute('data-artwork', 'imagegen');
    } else if (id === 'princess') {
      await expect(artwork).toHaveAttribute('data-artwork', 'imagegen');
      await expect(artwork.locator('[data-leg]')).toHaveCount(2);
      await expect(artwork.locator('[data-arm]')).toHaveCount(2);
    } else if (id !== 'rocket') {
      const wheel = artwork.locator('[data-joint="wheel-front"]');
      const before = await wheel.getAttribute('transform');
      await page.clock.runFor(150);
      expect(await wheel.getAttribute('transform')).not.toBe(before);
    }
    await seek(page, 600_000);
    const arrival = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).arrivalTimestamp);
    for (const [width, height] of [[320, 740], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await page.clock.setSystemTime(arrival + 650);
      await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
      await page.clock.runFor(32);
      const scene = (await page.locator('.journey-scene').boundingBox())!;
      const shape = await artwork.evaluate((element) => {
        const parts = [...element.querySelectorAll<SVGSVGElement>('[data-painted-part]')];
        if (!parts.length) {
          const bounds = element.querySelector(':scope > g')!.getBoundingClientRect();
          return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
        }
        // An atlas image's unclipped bbox is larger than its rendered part. Check each clipping viewport.
        const points = parts.flatMap((part) => {
          const x = part.x.baseVal.value, y = part.y.baseVal.value, width = part.width.baseVal.value, height = part.height.baseVal.value;
          const matrix = (part.parentElement as unknown as SVGGraphicsElement).getScreenCTM()!;
          return [[x, y], [x + width, y], [x, y + height], [x + width, y + height]].map(([px, py]) => new DOMPoint(px, py).matrixTransform(matrix));
        });
        const left = Math.min(...points.map((point) => point.x)), top = Math.min(...points.map((point) => point.y));
        return { x: left, y: top, width: Math.max(...points.map((point) => point.x)) - left, height: Math.max(...points.map((point) => point.y)) - top };
      });
      expect(shape.x, `${name} clips on left`).toBeGreaterThanOrEqual(scene.x);
      expect(shape.x + shape.width, `${name} clips on right`).toBeLessThanOrEqual(scene.x + scene.width);
      expect(shape.y, `${name} clips above scene`).toBeGreaterThanOrEqual(scene.y);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
    await page.getByRole('button', { name: '종료', exact: true }).click();
    await page.getByRole('button', { name: '여행 마치기', exact: true }).click();
    await page.setViewportSize({ width: 320, height: 740 });
  }
});

test('reduced motion disables joint loops while the timestamp journey still advances', async ({ page }) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await begin(page);
  await seek(page, 40_000);
  const frozen = await joints(page);
  const position = await page.locator('.progress-marker').getAttribute('data-progress');
  await page.clock.runFor(500);
  expect(await joints(page)).toEqual(frozen);
  expect(await page.locator('.progress-marker').getAttribute('data-progress')).not.toBe(position);
  await expect(page.locator('[data-layer="ground"]')).toHaveAttribute('data-scroll-offset', '0.000000');
});

test('planted SVG feet stay on the ground and move with it without sliding', async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await begin(page, '강아지');
  // Freeze between reads too: otherwise slower WebKit calls can advance into toe-off.
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await seek(page, 400 + 1440 * 48.1);
  const contact = () => page.evaluate((pad) => {
    const scene = document.querySelector<HTMLElement>('.journey-scene')!;
    const foot = scene.querySelector<SVGGElement>('[data-animal-joint="nearHindAnkle"]')!;
    const sole = new DOMPoint(pad.x, pad.y).matrixTransform(foot.getScreenCTM()!);
    return { x: sole.x, y: sole.y, groundY: scene.getBoundingClientRect().y + Number(scene.dataset.groundY), distance: Number(scene.dataset.groundDistance) };
  }, walkingPawContact('dog', true));
  const first = await contact();
  await page.clock.runFor(100);
  const second = await contact();
  // SVG layout rounds subpixels differently across browser engines; remain well below one pixel.
  expect(Math.abs(first.y - first.groundY)).toBeLessThan(.25);
  expect(Math.abs(second.y - second.groundY)).toBeLessThan(.25);
  expect(Math.abs(second.x - first.x + second.distance - first.distance)).toBeLessThan(.25);
  expect(second.distance).toBeGreaterThan(first.distance);
});

test('repeated scenery tiles match at their seams and keep slower parallax layers', async ({ page }) => {
  await page.clock.install();
  await begin(page);
  await seek(page, 40_000);
  const layers = await page.locator('[data-layer]').evaluateAll(async (elements) => {
    return Promise.all(elements.map(async (element) => {
      const svg = element.querySelector('svg')!;
      const standalone = svg.cloneNode(true) as SVGSVGElement;
      standalone.setAttribute('width', '1920'); standalone.setAttribute('height', '600');
      const image = new Image();
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(standalone)], { type: 'image/svg+xml' }));
      try {
        image.src = url;
        await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = 1920; canvas.height = 600;
        const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0, 1920, 600);
        const left = context.getImageData(479, 0, 1, 600).data;
        const right = context.getImageData(480, 0, 1, 600).data;
        let difference = 0;
        for (let index = 0; index < left.length; index++) difference = Math.max(difference, Math.abs(left[index] - right[index]));
        return { name: (element as HTMLElement).dataset.layer, rate: Number((element as HTMLElement).dataset.rate), difference };
      } finally { URL.revokeObjectURL(url); }
    }));
  });
  expect(layers.map((layer) => layer.rate)).toEqual([.08, .2, .65, 1]);
  for (const layer of layers) expect(layer.difference, `${layer.name} has a visible tile seam`).toBeLessThanOrEqual(5);
});
