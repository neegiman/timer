import { test, expect } from '@playwright/test';
import { walkingAnatomy, walkingPawContact } from '../../src/lib/walkingAnatomy';

for (const [id, name, cycle] of [['dog', '강아지', 1440], ['cat', '고양이', 1900]] as const) {
  test(`${id} painted joints stay registered and all four paws remain attached through a stride`, async ({ page }) => {
    await page.clock.install();
    await page.goto('./animal-preview/');
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    await page.getByRole('button', { name: '다시 보기', exact: false }).click();
    const frames = [];
    for (let sample = 0; sample < 12; sample++) {
      await page.clock.runFor(sample ? Math.round(cycle / 12) : 16);
      frames.push(await page.locator(`[data-animal-scene="${id}"] .painted-animal-artwork`).evaluate((element, anatomy) => {
        const svg = element as SVGSVGElement;
        const point = (node: SVGGraphicsElement, x: number, y: number) => {
          const p = new DOMPoint(x, y).matrixTransform(node.getScreenCTM()!).matrixTransform(svg.getScreenCTM()!.inverse());
          return { x: p.x, y: p.y };
        };
        const errors: number[] = [], paws = [];
        for (const paw of svg.querySelectorAll<SVGGElement>('[data-paw]')) {
          const hind = paw.dataset.paw!.includes('Hind'), side = hind ? 'hind' : 'fore';
          const art = anatomy[hind ? 'hindArtwork' : 'foreArtwork'];
          const atJoint = (suffix: string) => point(paw.querySelector<SVGGElement>(`[data-animal-joint="${paw.dataset.paw}${suffix}"]`)!, 0, 0);
          const atPaint = (part: string, landmark: { x: number; y: number }) => {
            const node = paw.querySelector<SVGSVGElement>(`[data-painted-part="${part}"]`)!;
            return point(node, node.viewBox.baseVal.x + landmark.x, node.viewBox.baseVal.y + landmark.y);
          };
          for (const [paint, joint] of [
            [atPaint(`${side}Upper`, art.upper.pivot), atJoint('Hip')],
            [atPaint(`${side}Upper`, art.upper.tip), atJoint('Knee')],
            [atPaint(`${side}Lower`, art.lower.pivot), atJoint('Knee')],
            [atPaint(`${side}Lower`, art.lower.tip), atJoint('Ankle')],
            [atPaint(`${side}Paw`, art.paw.pivot), atJoint('Ankle')],
          ]) errors.push(Math.hypot(paint.x - joint.x, paint.y - joint.y));
          paws.push({ name: paw.dataset.paw, point: atJoint('Ankle') });
        }
        return { html: svg.outerHTML, errors, paws, center: point(svg.querySelector<SVGGElement>('[data-animal-body]')!, 74, 160) };
      }, walkingAnatomy[id]));
    }
    for (const frame of frames) for (const error of frame.errors) expect(error).toBeLessThan(.01);
    const connectivity = await page.evaluate(async ({ frames }) => {
      const urls = new Set<string>();
      for (const frame of frames) for (const image of new DOMParser().parseFromString(frame.html, 'image/svg+xml').querySelectorAll('image')) urls.add(image.getAttribute('href')!);
      const assets = Object.fromEntries(await Promise.all([...urls].map(async (url) => {
        const blob = await (await fetch(url)).blob();
        const asset = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(blob); });
        return [url, asset];
      })));
      const scale = 4, width = 160 * scale, height = 210 * scale;
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d')!, results = [];
      for (const frame of frames) {
        const svg = new DOMParser().parseFromString(frame.html.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '), 'image/svg+xml').documentElement;
        svg.setAttribute('width', '160'); svg.setAttribute('height', '210');
        for (const image of svg.querySelectorAll('image')) image.setAttribute('href', assets[image.getAttribute('href')!]);
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
          results.push(frame.paws.map((paw) => ({ name: paw.name, attached: connected[Math.round(paw.point.y * scale) * width + Math.round(paw.point.x * scale)] === 1 })));
        } finally { URL.revokeObjectURL(url); }
      }
      return results;
    }, { frames });
    for (const [sample, paws] of connectivity.entries()) for (const paw of paws) expect(paw.attached, `${id}/${paw.name} detached at ${sample}`).toBe(true);
  });

  test(`${id} toes stay grounded during heel roll and pause/resume retains its actual journey pose`, async ({ page }, testInfo) => {
    await page.clock.install();
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto('./');
    await page.getByRole('button', { name: '친구', exact: true }).click();
    await expect(page.getByRole('button', { name: '곰', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name, exact: true }).click();
    await page.getByRole('button', { name: '출발!' }).click();
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    const session = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!));
    // Late stance: heel rises while the painted toe stays on the moving ground.
    const support = id === 'dog' ? .68 : .7;
    await page.clock.setSystemTime(session.startTimestamp + 400 + (20 + support * .82) * cycle);
    await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
    await page.clock.runFor(16);
    const contact = () => page.evaluate((sole) => {
      const scene = document.querySelector<HTMLElement>('.journey-scene')!;
      const ankle = scene.querySelector<SVGGElement>('[data-animal-joint="nearHindAnkle"]')!;
      const toe = new DOMPoint(sole.x, sole.y).matrixTransform(ankle.getScreenCTM()!);
      const heel = new DOMPoint(-3, sole.y).matrixTransform(ankle.getScreenCTM()!);
      return { x: toe.x, y: toe.y, heel: heel.y, baseline: scene.getBoundingClientRect().y + Number(scene.dataset.groundY), distance: Number(scene.dataset.groundDistance) };
    }, walkingPawContact(id, true));
    const first = await contact(); await page.clock.runFor(50); const second = await contact();
    for (const pose of [first, second]) { expect(Math.abs(pose.y - pose.baseline)).toBeLessThan(.3); expect(pose.heel).toBeLessThan(pose.y); }
    expect(Math.abs(second.x - first.x + second.distance - first.distance)).toBeLessThan(.3);
    const pose = () => page.locator('.traveler-body [data-animal-joint]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('transform')));
    await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
    await page.getByRole('button', { name: '일시정지', exact: true }).click(); await page.clock.runFor(32);
    const paused = await pose(); await page.clock.runFor(3000); expect(await pose()).toEqual(paused);
    await page.reload(); await page.clock.runFor(32); expect(await pose()).toEqual(paused);
    if (testInfo.project.name === 'chromium') await page.screenshot({ path: `artifacts/${id}-journey-320.png`, fullPage: true });
    await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
    await page.getByRole('button', { name: '계속', exact: true }).click(); await page.clock.runFor(200);
    expect(await pose()).not.toEqual(paused);
  });
}

test('a saved bear journey restores as rabbit without losing remaining time', async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => {
    if (localStorage.getItem('legacy-seeded')) return;
    const now = Date.now();
    localStorage.setItem('promise-journey:v1:selectedCharacter', JSON.stringify('bear'));
    localStorage.setItem('promise-journey:v1:activeSession', JSON.stringify({ id: 'legacy-bear', characterId: 'bear', status: 'paused', durationMs: 600_000,
      startTimestamp: now - 200_000, targetTimestamp: now + 400_000, pausedRemainingMs: 400_000, arrivalTimestamp: null,
      promise: { id: 'bath', name: '씻기', icon: '🛁', activity: '목욕하러 가요' } }));
    localStorage.setItem('legacy-seeded', 'true');
  });
  await page.goto('./');
  await expect(page.locator('[data-status="paused"]')).toBeVisible();
  await expect(page.locator('.traveler-body [data-character]')).toHaveAttribute('data-character', 'rabbit');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).characterId)).toBe('rabbit');
  await expect(page.getByRole('slider', { name: '여행 시간 조절' })).toHaveAttribute('aria-valuetext', '남은 시간 06:40');
  await page.reload(); await expect(page.getByRole('slider', { name: '여행 시간 조절' })).toHaveAttribute('aria-valuetext', '남은 시간 06:40');
});
