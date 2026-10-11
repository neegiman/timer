import { test, expect } from '@playwright/test';
import manifest from '../../src/lib/destinationScenery.json';
import { destinationLandmarks } from './destination';
import { destinationApproach } from '../../src/lib/destinationBackground';

for (const character of ['토끼', '로켓']) {
  test(`arrival painting stays grounded and pauses in every background: ${character}`, async ({ page }, testInfo) => {
    test.setTimeout(60_000);
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
    await page.clock.setSystemTime(deadline - 20_000);
    await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
    await expect(page.locator('.destination-paint')).toHaveCount(1);
    await page.clock.runFor(128);
    await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
    await page.getByRole('button', { name: '일시정지', exact: true }).click();
    for (const [season, label] of [['spring', '봄'], ['summer', '여름'], ['autumn', '가을'], ['winter', '겨울']] as const) {
      for (const theme of ['day', 'night'] as const) {
        if (character === '로켓') {
          // Space intentionally has no season/time controls. Existing saved
          // nature preferences must never change its painted portal backdrop.
          await page.evaluate(({ season, theme }) => {
            localStorage.setItem('promise-journey:v1:backgroundSeason', JSON.stringify(season));
            localStorage.setItem('promise-journey:v1:backgroundMode', JSON.stringify(theme));
          }, { season, theme });
          await page.reload();
          await expect(page.locator('.journey-scene')).toHaveAttribute('data-environment', 'space');
        } else {
          await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
          await page.getByRole('button', { name: label + ' 배경', exact: true }).click();
          await page.getByRole('button', { name: theme === 'day' ? '낮 배경' : '밤 배경', exact: true }).click();
          await page.getByRole('button', { name: '닫기', exact: true }).click();
        }
        await page.clock.runFor(64);
        const art = character === '로켓' ? manifest.space : manifest[season][theme];
        const painting = page.locator('.destination-paint');
        await expect(painting).toHaveAttribute('data-destination-src', `/timer${art.src}`);
        expect(await painting.evaluate(async (paint) => {
          const img = new Image(); img.src = (paint as HTMLElement).dataset.destinationSrc!;
          await img.decode(); return img.naturalWidth;
        })).toBe(art.width);
        await expect(page.locator('.goal-line, .finish-flag, .finish-point')).toHaveCount(0);
        const pose = await page.locator('.character-wrapper').evaluate((actor) => ({
          finish: Number((actor as HTMLElement).dataset.finishLineX),
          width: Number.parseFloat(getComputedStyle(actor).width),
        }));
        const points = await page.evaluate(destinationLandmarks, {});
        const scene = points.find((point) => point.selector === '.journey-scene')!;
        const point = points.find((point) => point.selector === 'painted landmark')!;
        const progress = Number(await page.locator('.progress-marker').getAttribute('data-progress'));
        const approach = destinationApproach(progress, scene.width, pose.finish);
        // Scene borders and the CSS layout grid can round to fractional pixels.
        expect(Math.abs(point.x - scene.x - pose.finish - approach.offsetX)).toBeLessThan(1);
        const contactY = scene.height * .78 - (character === '로켓' ? pose.width * 105 / 160 : 0);
        expect(Math.abs(point.y - scene.y - contactY)).toBeLessThan(1);
        const frozen = points;
        await page.clock.runFor(1000);
        expect(await page.evaluate(destinationLandmarks, {})).toEqual(frozen);
        if (testInfo.project.name === 'chromium' && (character === '토끼' || season === 'spring' && theme === 'day')) {
          await page.locator('.journey-scene').screenshot({ path: `artifacts/painted-destination-${character === '로켓' ? 'space' : `${season}-${theme}`}.png` });
        }
      }
    }
  });
}
