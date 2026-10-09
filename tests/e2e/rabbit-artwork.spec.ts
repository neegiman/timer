import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { rabbitAnatomy, rabbitHindContact } from '../../src/lib/rabbitAnatomy';

test('rabbit selection stays painted after repeated taps, leaving the step and refreshing', async ({ page }, testInfo) => {
  await page.clock.install();
  await page.goto('./');
  await page.getByRole('button', { name: '친구', exact: true }).click();
  const rabbit = page.getByRole('button', { name: '토끼', exact: true });
  const checkPaint = async () => {
    await expect(rabbit).toHaveAttribute('aria-pressed', 'true');
    const crop = rabbit.locator('.painted-thumbnail-crop');
    await crop.evaluate(async (element) => {
      const image = new Image(); image.src = getComputedStyle(element).backgroundImage.slice(5, -2); await image.decode();
    });
    const pixels = await sharp(await rabbit.locator('.character-icon').screenshot({ animations: 'allow' })).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const background = [...pixels.data.subarray(0, 3)];
    let painted = 0;
    for (let pixel = 0; pixel < pixels.data.length; pixel += 4) {
      if (background.reduce((difference, value, channel) => difference + Math.abs(value - pixels.data[pixel + channel]), 0) > 30) painted++;
    }
    expect(painted / (pixels.info.width * pixels.info.height), 'selected rabbit is blank').toBeGreaterThan(.04);
  };
  for (const other of ['병아리', '강아지', '고양이']) {
    await page.getByRole('button', { name: other, exact: true }).click();
    await rabbit.click(); await page.clock.runFor(1600); await checkPaint();
  }
  await page.getByRole('button', { name: '시간', exact: true }).click();
  await page.getByRole('button', { name: '친구', exact: true }).click();
  await checkPaint();
  await page.reload(); await page.getByRole('button', { name: '친구', exact: true }).click();
  await checkPaint();
  if (testInfo.project.name === 'chromium') await rabbit.screenshot({ path: 'artifacts/rabbit-selected-stable.png', animations: 'allow' });
});

test('rabbit rolls its heel over a grounded toe without sliding, then folds its ankle', async ({ page }, testInfo) => {
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await page.getByRole('button', { name: '친구', exact: true }).click();
  await page.getByRole('button', { name: '토끼', exact: true }).click();
  await page.getByRole('button', { name: '출발!' }).click();
  await expect(page.locator('[data-status="running"]')).toBeVisible();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const start = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).startTimestamp);
  const seek = async (cycle: number) => {
    // The 800ms acceleration contributes 400ms less gait time than wall time.
    await page.clock.setSystemTime(start + 400 + cycle * 1250);
    await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
    await page.clock.runFor(16);
  };
  const contact = () => page.evaluate((sole) => {
    const scene = document.querySelector<HTMLElement>('.journey-scene')!;
    const ankle = scene.querySelector<SVGGElement>('[data-animal-joint="nearHindAnkle"]')!;
    const toe = new DOMPoint(sole.x, sole.y).matrixTransform(ankle.getScreenCTM()!);
    const heel = new DOMPoint(-4, sole.y).matrixTransform(ankle.getScreenCTM()!);
    return { toe: { x: toe.x, y: toe.y }, heelY: heel.y,
      groundY: scene.getBoundingClientRect().y + Number(scene.dataset.groundY), distance: Number(scene.dataset.groundDistance) };
  }, rabbitHindContact);
  await seek(48.75);
  const first = await contact();
  await page.clock.runFor(50);
  const second = await contact();
  for (const pose of [first, second]) {
    expect(Math.abs(pose.toe.y - pose.groundY)).toBeLessThan(.25);
    expect(pose.heelY).toBeLessThan(pose.toe.y);
  }
  expect(second.toe.y - second.heelY).toBeGreaterThan(first.toe.y - first.heelY);
  expect(Math.abs(second.toe.x - first.toe.x + second.distance - first.distance)).toBeLessThan(.25);
  await seek(49.1);
  const swing = await contact();
  expect(swing.toe.y).toBeLessThan(swing.groundY - 1);
  expect(swing.heelY).toBeGreaterThan(swing.toe.y);
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'artifacts/rabbit-joints-mobile.png', fullPage: true });
});

test('rabbit painted feet remain joined to its body across twelve gait poses', async ({ page }, testInfo) => {
  await page.clock.install();
  await page.goto('./animal-preview/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.getByRole('button', { name: '다시 보기', exact: false }).click();
  const frames = [];
  for (let sample = 0; sample < 12; sample++) {
    await page.clock.runFor(sample === 0 ? 16 : 104);
    frames.push(await page.locator('[data-animal-scene="rabbit"] .painted-animal-artwork').evaluate((element, landmarks) => {
      const svg = element as SVGSVGElement, inverse = svg.getScreenCTM()!.inverse();
      const point = (node: SVGGraphicsElement, x: number, y: number) => {
        const result = new DOMPoint(x, y).matrixTransform(node.getScreenCTM()!).matrixTransform(inverse);
        return { x: result.x, y: result.y };
      };
      const body = svg.querySelector<SVGGElement>('[data-animal-body]')!;
      const paws = [...svg.querySelectorAll<SVGGElement>('[data-paw]')].map((paw) => {
        const ankle = paw.querySelector<SVGGElement>('[data-animal-joint$="Ankle"]')!;
        return { name: paw.dataset.paw, points: [0, 3, 6, 9].map((x) => point(ankle, x, 0)) };
      });
      const registrationErrors = ['nearHind', 'farHind'].flatMap((name) => {
        const limb = svg.querySelector<SVGGElement>(`[data-paw="${name}"]`)!;
        const atJoint = (joint: string) => point(limb.querySelector<SVGGElement>(`[data-animal-joint="${name}${joint}"]`)!, 0, 0);
        const atPaint = (part: string, landmark: { x: number; y: number }) => {
          const painted = limb.querySelector<SVGSVGElement>(`[data-painted-part="${part}"]`)!;
          return point(painted, painted.viewBox.baseVal.x + landmark.x, painted.viewBox.baseVal.y + landmark.y);
        };
        return [
          [atPaint('hindUpper', landmarks.upper.pivot), atJoint('Hip')],
          [atPaint('hindUpper', landmarks.upper.tip), atJoint('Knee')],
          [atPaint('hindLower', landmarks.lower.pivot), atJoint('Knee')],
          [atPaint('hindLower', landmarks.lower.tip), atJoint('Ankle')],
          [atPaint('hindPaw', landmarks.paw.pivot), atJoint('Ankle')],
        ].map(([painted, joint]) => Math.hypot(painted.x - joint.x, painted.y - joint.y));
      });
      return { html: svg.outerHTML, center: point(body, 74, 160), paws, registrationErrors };
    }, rabbitAnatomy.hindArtwork));
  }
  for (const frame of frames) for (const error of frame.registrationErrors) expect(error, 'painted hind joint misses its rotation pivot').toBeLessThan(.01);
  const results = await page.evaluate(async (frames) => {
    const response = await fetch('/timer/characters/raster-v1/rabbit.webp');
    const blob = new Blob([await response.arrayBuffer()], { type: 'image/webp' });
    const asset = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(blob); });
    const scale = 4, width = 160 * scale, height = 210 * scale;
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d')!;
    const results = [];
    for (const frame of frames) {
      const markup = frame.html.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
      const svg = new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement;
      svg.setAttribute('width', '160'); svg.setAttribute('height', '210');
      for (const image of svg.querySelectorAll('image')) image.setAttribute('href', asset);
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
      try {
        const image = new Image(); image.src = url; await image.decode();
        context.clearRect(0, 0, width, height); context.drawImage(image, 0, 0, width, height);
        const pixels = context.getImageData(0, 0, width, height).data;
        const connected = new Uint8Array(width * height), queue = new Int32Array(connected.length);
        let read = 0, write = 1;
        const center = Math.round(frame.center.y * scale) * width + Math.round(frame.center.x * scale);
        queue[0] = center; connected[center] = 1;
        while (read < write) {
          const pixel = queue[read++], x = pixel % width, y = Math.floor(pixel / width);
          for (const next of [x > 0 ? pixel - 1 : -1, x + 1 < width ? pixel + 1 : -1, y > 0 ? pixel - width : -1, y + 1 < height ? pixel + width : -1]) {
            if (next < 0 || connected[next] || pixels[next * 4 + 3] < 80) continue;
            connected[next] = 1; queue[write++] = next;
          }
        }
        results.push({ paws: frame.paws.map((paw) => ({ name: paw.name,
          attached: paw.points.some((point) => connected[Math.round(point.y * scale) * width + Math.round(point.x * scale)] === 1),
        })) });
      } finally { URL.revokeObjectURL(url); }
    }
    return results;
  }, frames);
  for (const [index, frame] of results.entries()) {
    for (const paw of frame.paws) expect(paw.attached, `${paw.name} detached at pose ${index}`).toBe(true);
  }
  if (testInfo.project.name === 'chromium') await page.locator('[data-animal-scene="rabbit"]').screenshot({ path: 'artifacts/rabbit-attached-pose.png' });
});
