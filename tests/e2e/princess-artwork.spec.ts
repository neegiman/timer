import { test, expect } from '@playwright/test';
import { princessAnatomy as anatomy, princessSole, PRINCESS_GAIT } from '../../src/lib/princessMotion';
import { animalFoot } from '../../src/lib/animalMotion';
import { instrumentAudio } from './audio';

test('painted princess stays connected and grounded through selection, walking, pause, refresh and arrival', async ({ page }, testInfo) => {
  const errors: string[] = [], failed: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) failed.push(response.url()); });
  await instrumentAudio(page);
  await page.clock.install();
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('./');
  await page.getByRole('button', { name: '친구', exact: true }).click();
  const choice = page.getByRole('button', { name: '공주', exact: true });
  for (let i = 0; i < 3; i++) {
    if (testInfo.project.name === 'webkit-mobile') await choice.tap(); else await choice.click();
    await expect(choice).toHaveAttribute('aria-pressed', 'true');
    await expect(choice.locator('[data-character="princess"]')).toBeVisible();
  }
  await expect(choice.locator('.painted-thumbnail-crop')).toHaveCSS('background-image', /\/timer\/characters\/raster-v1\/princess-upper-v2.webp/);
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'artifacts/princess-selection-320.png', fullPage: true });
  await page.getByRole('button', { name: '출발!' }).click();
  await expect(page.locator('[data-status="running"]')).toBeVisible();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const session = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!));
  const seek = async (time: number) => {
    await page.clock.setSystemTime(time);
    await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
    await page.clock.runFor(16);
  };
  const frames: { html: string; planted: string[] }[] = [];
  const check = async (idle = false) => {
    const gait = Number(await page.locator('.character-wrapper').getAttribute('data-gait-time'));
    const planted = (['front', 'back'] as const).filter((side) => idle || animalFoot(gait / PRINCESS_GAIT.cycleMs + (side === 'back' ? .5 : 0), PRINCESS_GAIT).planted);
    const frame = await page.locator('.traveler-body .painted-princess-artwork').evaluate((element, { anatomy, sole, planted }) => {
      const svg = element as SVGSVGElement, scene = document.querySelector<HTMLElement>('.journey-scene')!;
      const point = (part: SVGSVGElement, p: { x: number; y: number }) =>
        new DOMPoint(part.viewBox.baseVal.x + p.x, part.viewBox.baseVal.y + p.y).matrixTransform(part.getScreenCTM()!);
      const jointErrors: number[] = [];
      for (const side of ['front', 'back'] as const) {
        for (const [joint, partName, pivot] of [
          [`${side}-thigh`, 'thigh', anatomy.thigh.pivot], [`${side}-shin`, 'shin', anatomy.shin.pivot],
          [`${side}-foot`, 'shoe', anatomy.shoe.pivot],
          [`${side}-arm`, anatomy.arms[side].upperPart, anatomy.arms[side].upperArt.pivot],
          [`${side}-elbow`, anatomy.arms[side].lowerPart, anatomy.arms[side].lowerArt.pivot],
        ] as const) {
          const group = svg.querySelector<SVGGElement>(`[data-joint="${joint}"]`)!;
          const root = new DOMPoint(0, 0).matrixTransform(group.getScreenCTM()!);
          const paint = point(group.querySelector<SVGSVGElement>(`[data-painted-part="${partName}"]`)!, pivot);
          jointErrors.push(Math.hypot(root.x - paint.x, root.y - paint.y));
        }
      }
      const feet = planted.map((side) => {
        const joint = svg.querySelector<SVGGElement>(`[data-joint="${side}-foot"]`)!;
        const toe = new DOMPoint(sole.x, sole.y).matrixTransform(joint.getScreenCTM()!);
        return { side, x: toe.x, y: toe.y };
      });
      return { html: svg.outerHTML, feet, jointErrors, x: Number(scene.querySelector<HTMLElement>('.character-wrapper')!.dataset.position),
        ground: scene.getBoundingClientRect().y + Number(scene.dataset.groundY), distance: Number(scene.dataset.groundDistance) };
    }, { anatomy, sole: princessSole, planted });
    for (const error of frame.jointErrors) expect(error, 'Painted limb is detached from its joint').toBeLessThan(.01);
    expect(frame.x).toBe(.42); expect(frame.feet.length).toBeGreaterThanOrEqual(1);
    for (const foot of frame.feet) expect(Math.abs(foot.y - frame.ground)).toBeLessThan(.25);
    frames.push({ html: frame.html, planted }); return frame;
  };
  for (let i = 0; i < 12; i++) { await seek(session.startTimestamp + 400 + PRINCESS_GAIT.cycleMs * (40 + i / 12)); await check(); }
  await seek(session.startTimestamp + 400 + PRINCESS_GAIT.cycleMs * 42.1);
  const first = await check(); await page.clock.runFor(50); const second = await check();
  const a = first.feet.find(({ side }) => side === 'front')!, b = second.feet.find(({ side }) => side === 'front')!;
  expect(Math.abs(b.x - a.x + second.distance - first.distance)).toBeLessThan(.25);
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'artifacts/princess-walking-320.png', fullPage: true });
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '일시정지', exact: true }).click(); await page.clock.runFor(32);
  const joints = () => page.locator('.traveler-body [data-joint]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('transform')));
  const frozen = await joints(), distance = await page.locator('.journey-scene').getAttribute('data-ground-distance');
  await page.clock.runFor(3000); expect(await joints()).toEqual(frozen);
  expect(await page.locator('.journey-scene').getAttribute('data-ground-distance')).toBe(distance);
  await page.reload(); await page.clock.runFor(32); expect(await joints()).toEqual(frozen);
  await expect(page.locator('.traveler-body .character-artwork')).toHaveAttribute('data-character', 'princess'); await check();
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '계속', exact: true }).click(); await page.clock.runFor(150); expect(await joints()).not.toEqual(frozen);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // WebKit delivers its media change asynchronously, independently of the mocked frame clock.
  await expect.poll(() => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await expect(page.locator('.traveler-body [data-joint="front-arm"]')).toHaveAttribute('transform', 'rotate(4.00000)');
  await expect(async () => { await page.clock.runFor(32); await check(true); }).toPass({ timeout: 3000 });
  const reduced = await joints(); await page.clock.runFor(200); expect(await joints()).toEqual(reduced);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const target = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).targetTimestamp);
  await seek(target); await page.clock.runFor(1500); // settle, jump and land, then a planted happy wave
  await expect(page.locator('.sprite-motion')).toHaveAttribute('data-action', 'celebrate');
  await check(true);
  await page.clock.runFor(4000);
  await expect(page.locator('[data-status="completed"]')).toBeVisible();
  if (await page.evaluate(() => typeof AudioContext !== 'undefined')) {
    await expect.poll(() => page.evaluate(() => window.playedSounds.filter((url) => url.endsWith('/finish.mp3')).length)).toBe(1);
  }
  await page.getByRole('button', { name: '⭐ 약속 지켰어요' }).click(); await expect(page.getByTestId('star-count')).toHaveText('1');
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'artifacts/princess-arrival-320.png', fullPage: true });
  for (const [width, height] of [[320, 740], [390, 844], [844, 390], [1440, 1000]]) {
    await page.setViewportSize({ width, height }); await page.clock.runFor(32);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const scene = (await page.locator('.journey-scene').boundingBox())!, art = (await page.locator('.traveler-body .character-artwork').boundingBox())!;
    expect(art.y).toBeGreaterThanOrEqual(scene.y); expect(art.x).toBeGreaterThanOrEqual(scene.x);
    expect(art.x + art.width).toBeLessThanOrEqual(scene.x + scene.width);
  }
  // Check the actual painted silhouette AND shoes, not just self-consistent joint matrices.
  const painted = await page.evaluate(async (frames) => {
    const assets: Record<string, string> = {};
    for (const source of ['/timer/characters/raster-v1/princess.webp', '/timer/characters/raster-v1/princess-upper-v2.webp']) {
      const blob = await (await fetch(source)).blob();
      assets[source] = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(blob); });
    }
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 840;
    const context = canvas.getContext('2d')!, bottoms: number[] = [], components: number[][] = [];
    for (const frame of frames) for (const side of ['all', ...frame.planted]) {
      const svg = new DOMParser().parseFromString(frame.html.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '), 'image/svg+xml').documentElement;
      svg.setAttribute('width', '160'); svg.setAttribute('height', '210');
      if (side !== 'all') {
        for (const leg of svg.querySelectorAll('[data-leg]')) if (leg.getAttribute('data-leg') !== side) leg.remove();
        for (const part of svg.querySelectorAll('[data-painted-part]')) if (part.getAttribute('data-painted-part') !== 'shoe') part.remove();
      }
      for (const image of svg.querySelectorAll('image')) image.setAttribute('href', assets[image.getAttribute('href')!]);
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
      try {
        const image = new Image(); image.src = url; await image.decode(); context.clearRect(0, 0, 640, 840); context.drawImage(image, 0, 0, 640, 840);
        const pixels = context.getImageData(0, 0, 640, 840).data;
        if (side === 'all') {
          const seen = new Uint8Array(640 * 840), queue = new Int32Array(seen.length), areas: number[] = [];
          for (let start = 0; start < seen.length; start++) {
            if (seen[start] || pixels[start * 4 + 3] < 128) continue;
            let read = 0, write = 1; seen[start] = 1; queue[0] = start;
            while (read < write) {
              const index = queue[read++], x = index % 640, y = Math.floor(index / 640);
              for (const next of [x > 0 ? index - 1 : -1, x < 639 ? index + 1 : -1, y > 0 ? index - 640 : -1, y < 839 ? index + 640 : -1]) {
                if (next < 0 || seen[next] || pixels[next * 4 + 3] < 128) continue;
                seen[next] = 1; queue[write++] = next;
              }
            }
            if (write >= 144) areas.push(write); // Ignore sub-nine-art-pixel paint speckles.
          }
          components.push(areas.sort((a, b) => b - a));
        } else {
          let bottom = -1;
          for (let y = 0; y < 840; y++) for (let x = 0; x < 640; x++) if (pixels[(y * 640 + x) * 4 + 3] >= 160) bottom = y;
          bottoms.push((bottom + 1) / 4);
        }
      } finally { URL.revokeObjectURL(url); }
    }
    return { bottoms, components };
  }, frames);
  for (const bottom of painted.bottoms) expect(Math.abs(bottom - 205), 'Painted shoe misses ground').toBeLessThan(.8);
  for (const areas of painted.components) expect(areas, 'A painted limb is visibly detached from the body').toHaveLength(1);
  expect(errors).toEqual([]); expect(failed).toEqual([]);
});
