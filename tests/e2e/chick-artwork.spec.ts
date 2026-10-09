import { test, expect } from '@playwright/test';
import { chickAnatomy } from '../../src/lib/chickAnatomy';
import { animalPose } from '../../src/lib/animalMotion';

test('chick feathers point backward and its actual painted feet touch the ground through walking, pause and arrival', async ({ page }, testInfo) => {
  await page.clock.install();
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('./');
  await page.getByRole('button', { name: '친구', exact: true }).click();
  await page.getByRole('button', { name: '병아리', exact: true }).click();
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
    const pose = animalPose('chick', gait, !idle);
    const planted = Object.entries(pose.feet).filter(([, foot]) => foot.planted).map(([name]) => name);
    const frame = await page.locator('.traveler-body .painted-animal-artwork').evaluate((element, { anatomy, planted }) => {
      const svg = element as SVGSVGElement;
      const scene = document.querySelector<HTMLElement>('.journey-scene')!;
      const baseline = scene.getBoundingClientRect().y + Number(scene.dataset.groundY);
      const partPoint = (part: SVGSVGElement, p: { x: number; y: number }) =>
        new DOMPoint(part.viewBox.baseVal.x + p.x, part.viewBox.baseVal.y + p.y).matrixTransform(part.getScreenCTM()!);
      const wing = svg.querySelector<SVGSVGElement>(`[data-animal-joint="wing"] [data-painted-part]`)!;
      const root = partPoint(wing, anatomy.wing.sourceRoot), tip = partPoint(wing, anatomy.wing.sourceTip);
      const wingJoint = new DOMPoint(0, 0).matrixTransform(svg.querySelector<SVGGElement>('[data-animal-joint="wing"]')!.getScreenCTM()!);
      const feet = planted.map((name) => {
        const paw = svg.querySelector<SVGGElement>(`[data-paw="${name}"]`)!;
        const part = paw.querySelector<SVGSVGElement>('[data-painted-part="hindPaw"]')!;
        const toe = partPoint(part, anatomy.legArtwork.paw.sole);
        return { name, y: toe.y, x: toe.x };
      });
      return { html: svg.outerHTML, root, tip, wingError: Math.hypot(root.x - wingJoint.x, root.y - wingJoint.y), feet, baseline,
        distance: Number(scene.dataset.groundDistance) };
    }, { anatomy: chickAnatomy, planted });
    expect(frame.wingError).toBeLessThan(.01);
    expect(frame.tip.x).toBeLessThan(frame.root.x - 10);
    expect(frame.feet.length).toBeGreaterThanOrEqual(1);
    for (const foot of frame.feet) expect(Math.abs(foot.y - frame.baseline), `${foot.name} floats above ground`).toBeLessThan(.25);
    frames.push({ html: frame.html, planted });
    return frame;
  };
  for (let sample = 0; sample < 12; sample++) { await seek(session.startTimestamp + 400 + 780 * (40 + sample / 12)); await check(); }
  // An early-stance foot and the scenery must move at the same speed.
  await seek(session.startTimestamp + 400 + 780 * 42.1);
  const first = await check(); await page.clock.runFor(50); const second = await check();
  const a = first.feet.find((foot) => foot.name === 'nearHind')!, b = second.feet.find((foot) => foot.name === 'nearHind')!;
  expect(Math.abs(b.x - a.x + second.distance - first.distance)).toBeLessThan(.25);
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '일시정지', exact: true }).click(); await page.clock.runFor(32);
  const joints = () => page.locator('.traveler-body [data-animal-joint]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('transform')));
  const frozen = await joints(); await page.clock.runFor(3000); expect(await joints()).toEqual(frozen);
  await page.reload(); await page.clock.runFor(32); expect(await joints()).toEqual(frozen); await check();
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'artifacts/chick-grounded-mobile.png', fullPage: true });
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '계속', exact: true }).click(); await page.clock.runFor(100);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.clock.runFor(32); await check(true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const target = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).targetTimestamp);
  await seek(target); await page.clock.runFor(5000);
  await expect(page.locator('[data-status="completed"]')).toBeVisible(); await check(true);
  // Rasterize each actual planted foot: a correct mathematical pivot alone cannot catch transparent padding.
  const bottoms = await page.evaluate(async (frames) => {
    const blob = await (await fetch('/timer/characters/raster-v1/chick.webp')).blob();
    const asset = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(blob); });
    const width = 640, height = 840, canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d')!, results = [];
    for (const frame of frames) for (const name of frame.planted) {
      const svg = new DOMParser().parseFromString(frame.html.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '), 'image/svg+xml').documentElement;
      svg.setAttribute('width', '160'); svg.setAttribute('height', '210');
      for (const paw of svg.querySelectorAll('[data-paw]')) if (paw.getAttribute('data-paw') !== name) paw.remove();
      for (const part of svg.querySelectorAll('[data-painted-part]')) if (part.getAttribute('data-painted-part') !== 'hindPaw') part.remove();
      for (const image of svg.querySelectorAll('image')) image.setAttribute('href', asset);
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
      try {
        const image = new Image(); image.src = url; await image.decode(); context.clearRect(0, 0, width, height); context.drawImage(image, 0, 0, width, height);
        const pixels = context.getImageData(0, 0, width, height).data;
        let bottom = -1;
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (pixels[(y * width + x) * 4 + 3] >= 160) bottom = y;
        results.push({ name, bottom: (bottom + 1) / 4 });
      } finally { URL.revokeObjectURL(url); }
    }
    return results;
  }, frames);
  for (const foot of bottoms) expect(Math.abs(foot.bottom - 205), `${foot.name} painted toes miss ground`).toBeLessThan(.8);
});
