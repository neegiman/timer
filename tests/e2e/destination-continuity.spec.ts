import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import manifest from '../../src/lib/destinationScenery.json';

for (const character of ['토끼', '자동차', '기차', '로켓']) {
  test(`destination preserves the surrounding scenery in every background: ${character}`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem('promise-journey:v1:soundEnabled', 'false');
      localStorage.setItem('promise-journey:v1:selectedDuration', '10');
    });
    await page.clock.install();
    await page.goto('./');
    await page.getByRole('button', { name: '친구', exact: true }).click();
    await page.getByRole('button', { name: character, exact: true }).click();
    await page.getByRole('button', { name: '출발!', exact: true }).click();
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    const deadline = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).targetTimestamp);
    await page.clock.setSystemTime(deadline - 2000);
    await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
    await expect(page.locator('.destination-paint')).toHaveCount(1);
    await page.clock.runFor(128);
    await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
    await page.getByRole('button', { name: '일시정지', exact: true }).click();
    const scenes = character === '로켓' ? [['spring', 'day', '우주']] as const
      : (['spring', 'summer', 'autumn', 'winter'] as const).flatMap((season, index) =>
        (['day', 'night'] as const).map((theme) => [season, theme, ['봄', '여름', '가을', '겨울'][index]] as const));
    const differences = [];
    for (const [season, theme, label] of scenes) {
      if (character !== '로켓') {
        await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
        await page.getByRole('button', { name: `${label} 배경`, exact: true }).click();
        await page.getByRole('button', { name: theme === 'day' ? '낮 배경' : '밤 배경', exact: true }).click();
        await page.getByRole('button', { name: '닫기', exact: true }).click();
        await expect(page.locator(theme === 'day' ? '.scene-day' : '.scene-night')).toHaveCSS('opacity', '1');
      }
      await page.clock.runFor(64);
      const asset = character === '로켓' ? manifest.space : manifest[season][theme];
      const paint = page.locator('.destination-paint');
      await expect(paint).toHaveAttribute('data-destination-src', `/timer${asset.src}`);
      await paint.evaluate(async (element) => {
        const img = new Image(); img.src = (element as HTMLElement).dataset.destinationSrc!; await img.decode();
      });
      await page.locator('.journey-scene [data-scenery-src]').evaluateAll(async (elements) => {
        await Promise.all(elements.map(async (element) => {
          const image = new Image(); image.src = (element as HTMLElement).dataset.scenerySrc!; await image.decode();
        }));
      });
      const bounds = await paint.evaluate((element, asset) => {
        const scene = document.querySelector('.journey-scene')!.getBoundingClientRect();
        const box = element.getBoundingClientRect();
        return { left: box.x - scene.x + asset.paintBounds.x / asset.width * box.width - 2,
          top: box.y - scene.y + asset.paintBounds.y / asset.height * box.height - 2,
          right: box.x - scene.x + (asset.paintBounds.x + asset.paintBounds.width) / asset.width * box.width + 2,
          bottom: box.y - scene.y + (asset.paintBounds.y + asset.paintBounds.height) / asset.height * box.height + 2 };
      }, asset);
      // Same paused frame, only the destination paint changes. Hills, clouds,
      // foreground trees, road/rails, stars and planets must retain their pixels.
      await page.getByTestId('journey-goal').evaluate((goal: HTMLElement) => { goal.style.visibility = 'hidden'; });
      const before = await page.locator('.journey-scene').screenshot({ scale: 'css', animations: 'disabled' });
      await page.getByTestId('journey-goal').evaluate((goal: HTMLElement) => { goal.style.visibility = 'visible'; });
      const after = await page.locator('.journey-scene').screenshot({ scale: 'css', animations: 'disabled' });
      const a = await sharp(before).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const b = await sharp(after).ensureAlpha().raw().toBuffer();
      let outside = 0, inside = 0;
      for (let y = 0; y < a.info.height; y++) for (let x = 0; x < a.info.width; x++) {
        const offset = (y * a.info.width + x) * 4;
        if (Math.max(...[0, 1, 2].map((c) => Math.abs(a.data[offset + c] - b[offset + c]))) <= 16) continue;
        if (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom) inside++;
        else outside++;
      }
      differences.push({ season, theme, inside, outside });
      if (testInfo.project.name === 'chromium') {
        const name = `${character}-${character === '로켓' ? 'space' : `${season}-${theme}`}`;
        await testInfo.attach(`${name}-before`, { body: before, contentType: 'image/png' });
        await testInfo.attach(`${name}-after`, { body: after, contentType: 'image/png' });
        await page.locator('.journey-scene').screenshot({ path: `artifacts/destination-continuity-${name}.png`, scale: 'css', animations: 'disabled' });
      }
    }
    await testInfo.attach('scenery-pixel-comparison', { body: JSON.stringify(differences, null, 2), contentType: 'application/json' });
    for (const difference of differences) {
      expect(difference.inside, `${difference.season} ${difference.theme}: arrival landmark is missing`).toBeGreaterThan(100);
      expect(difference.outside, `${difference.season} ${difference.theme}: arrival repaints the scenery`).toBeLessThan(10);
    }
  });
}
