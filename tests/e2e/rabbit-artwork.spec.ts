import { test, expect } from '@playwright/test';

test('rabbit painted feet remain joined to its body across twelve gait poses', async ({ page }, testInfo) => {
  await page.clock.install();
  await page.goto('./animal-preview/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.getByRole('button', { name: '다시 보기', exact: false }).click();
  const frames = [];
  for (let sample = 0; sample < 12; sample++) {
    await page.clock.runFor(sample === 0 ? 16 : 104);
    frames.push(await page.locator('[data-animal-scene="rabbit"] .painted-animal-artwork').evaluate((element) => {
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
      // Every limb layer must sit behind the same painted torso.
      const torso = svg.querySelector('[data-painted-part="torso"]')!;
      const coveredRoots = [...svg.querySelectorAll('[data-paw]')].every((paw) => Boolean(paw.compareDocumentPosition(torso) & Node.DOCUMENT_POSITION_FOLLOWING));
      return { html: svg.outerHTML, center: point(body, 74, 160), paws, coveredRoots };
    }));
  }
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
        results.push({ coveredRoots: frame.coveredRoots, paws: frame.paws.map((paw) => ({ name: paw.name,
          attached: paw.points.some((point) => connected[Math.round(point.y * scale) * width + Math.round(point.x * scale)] === 1),
        })) });
      } finally { URL.revokeObjectURL(url); }
    }
    return results;
  }, frames);
  for (const [index, frame] of results.entries()) {
    expect(frame.coveredRoots).toBe(true);
    for (const paw of frame.paws) expect(paw.attached, `${paw.name} detached at pose ${index}`).toBe(true);
  }
  if (testInfo.project.name === 'chromium') await page.locator('[data-animal-scene="rabbit"]').screenshot({ path: 'artifacts/rabbit-attached-pose.png' });
});
