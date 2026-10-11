import { test, expect } from '@playwright/test';

for (const [id, label] of [['dog', '강아지'], ['cat', '고양이']]) {
  test(`${id}: walking reuses a single painted frame without deforming hidden meshes`, async ({ page }) => {
    await page.clock.install(); await page.setViewportSize({ width: 320, height: 740 });
    await page.goto('./'); await page.getByRole('button', { name: '친구', exact: true }).click();
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.getByRole('button', { name: '출발!', exact: true }).click();
    const sprite = page.locator('.traveler-body [data-animal-walk-sprite]');
    await expect(sprite).toHaveAttribute('data-loaded', 'true');
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    await expect(sprite).toBeVisible();
    const before = await page.locator('.traveler-body [data-animal-body]').getAttribute('transform');
    const changes = await page.evaluate(() => {
      const root = document.querySelector('.traveler-body [data-animal-body]')!;
      const records: number[] = [];
      const observer = new MutationObserver(events => records.push(events.length));
      observer.observe(root, { attributes: true, subtree: true });
      Object.assign(window, { walkingMutations: records, walkingObserver: observer });
      return root.querySelectorAll('image').length;
    });
    expect(changes).toBeGreaterThan(60); // These expensive patches remain hidden.
    const frames = new Set<string | null>();
    for (let i = 0; i < 12; i++) {
      await page.clock.runFor(37);
      frames.add(await sprite.getAttribute('viewBox'));
      expect(await page.locator('.progress-marker [data-animal-walk-sprite]').getAttribute('viewBox')).toBe(await sprite.getAttribute('viewBox'));
    }
    expect(frames.size).toBeGreaterThan(8);
    expect(await page.locator('.traveler-body [data-animal-body]').getAttribute('transform')).toBe(before);
    expect(await page.evaluate(() => (window as unknown as { walkingMutations: number[] }).walkingMutations)).toEqual([]);
  });
}

test('an unavailable gait image retains the fully articulated animal', async ({ page }) => {
  await page.route('**/characters/walk-v12/*.webp', route => route.abort());
  await page.clock.install(); await page.goto('./');
  await page.getByRole('button', { name: '친구', exact: true }).click();
  await page.getByRole('button', { name: '고양이', exact: true }).click();
  await page.getByRole('button', { name: '출발!', exact: true }).click();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const rig = page.locator('.traveler-body [data-animal-body]');
  await expect(rig).toBeVisible();
  const before = await rig.locator('[data-animal-joint="nearForeHip"]').getAttribute('transform');
  await page.clock.runFor(200);
  expect(await rig.locator('[data-animal-joint="nearForeHip"]').getAttribute('transform')).not.toBe(before);
  await expect(page.locator('.traveler-body [data-animal-walk-sprite]')).toBeHidden();
});
