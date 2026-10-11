import { test, expect, type Page } from '@playwright/test';
import sharp from 'sharp';
import { characters } from '../../src/lib/characters';
import { motionProfile } from '../../src/lib/motionProfiles';
import { animalActionPose, isAnimalId } from '../../src/lib/animalActionPose';
import type { AnimalJoint } from '../../src/lib/animalMotion';
import { princessPose } from '../../src/lib/princessMotion';
import type { JointName } from '../../src/lib/characterPose';

async function readPoses(page: Page) {
  return page.evaluate(() => {
    const read = (root: Element) => ({
      frame: root.querySelector('[data-prince-sprite], [data-vehicle-sprite]')?.getAttribute('data-frame') ?? null,
      joints: Array.from(root.querySelectorAll('[data-joint], [data-animal-joint]')).map((joint) => ({
        name: joint.getAttribute('data-joint') ?? joint.getAttribute('data-animal-joint'), transform: joint.getAttribute('transform'),
      })),
      body: root.querySelector('[data-animal-body]')?.getAttribute('transform') ?? null,
    });
    return { main: read(document.querySelector('.traveler-body')!), miniature: read(document.querySelector('.progress-marker')!) };
  });
}

for (const character of characters) test(`${character.id}: progress artwork shares the main gait, freezes, restores and stops at arrival`, async ({ page }, testInfo) => {
  const errors: string[] = [], failed: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) failed.push(response.url()); });
  await page.clock.install(); await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('./'); await page.getByRole('button', { name: '친구', exact: true }).click();
  const choice = page.getByRole('button', { name: character.name, exact: true });
  for (let i = 0; i < 3; i++) await choice.click();
  // Static choice cards deliberately keep their mobile-safe crop.
  if (['rabbit', 'dog', 'cat', 'chick', 'princess'].includes(character.id)) await expect(choice.locator('.painted-animal-thumbnail')).toHaveCount(1);
  await page.getByRole('button', { name: '출발!', exact: true }).click();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const session = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!));
  const miniature = page.locator('.progress-marker');
  await expect(miniature.locator('svg.character-artwork')).toBeVisible();
  const seek = async (elapsed: number) => {
    await page.clock.setSystemTime(session.startTimestamp + elapsed);
    await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
    await page.clock.runFor(16);
  };
  const poses = new Set<string>();
  const shots: Buffer[] = [];
  const cycle = motionProfile(character.id).cycleMs;
  for (let i = 0; i < 8; i++) {
    await seek(40_000 + Math.round(i * cycle / 8));
    const state = await readPoses(page);
    expect(state.miniature).toEqual(state.main);
    poses.add(JSON.stringify(state.miniature));
    if (i === 0 || i === 2) shots.push(await miniature.locator(':scope > span').screenshot({ animations: 'allow' }));
  }
  expect(poses.size).toBeGreaterThan(3);
  const pixels = await Promise.all(shots.map((shot) => sharp(shot).ensureAlpha().raw().toBuffer()));
  let changed = 0, colored = 0;
  for (let p = 0; p < pixels[0].length; p += 4) {
    if (Math.abs(pixels[0][p] - pixels[1][p]) + Math.abs(pixels[0][p + 1] - pixels[1][p + 1]) + Math.abs(pixels[0][p + 2] - pixels[1][p + 2]) > 30) changed++;
    if (pixels[0][p] < 210 && pixels[0][p + 1] < 210 && pixels[0][p + 2] < 210 && pixels[0][p + 3] > 100) colored++;
  }
  expect(colored, 'the actual miniature contains visible character pixels').toBeGreaterThan(20);
  expect(changed, 'the rendered character visibly moves, beyond DOM attribute changes').toBeGreaterThan(2);
  if (testInfo.project.name === 'chromium') await miniature.locator(':scope > span').screenshot({ path: `artifacts/progress-${character.id}.png`, scale: 'css', animations: 'allow' });

  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '일시정지', exact: true }).click(); await page.clock.runFor(32);
  const frozen = await readPoses(page), position = await miniature.getAttribute('style');
  await page.clock.runFor(3000); expect(await readPoses(page)).toEqual(frozen);
  await expect(miniature).toHaveAttribute('style', position!);
  await page.reload();
  await expect(page.locator('[data-status="paused"]')).toBeVisible();
  await expect(miniature.locator('svg.character-artwork')).toBeVisible();
  await page.clock.runFor(32); expect(await readPoses(page)).toEqual(frozen);
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '계속', exact: true }).click();
  // Wheel frames can hold for a few hundred milliseconds. Sample through a
  // frame boundary rather than assuming every short time step changes the art.
  const resumed = new Set<string>();
  for (const delta of [350, 117, 211]) {
    await page.clock.runFor(delta);
    const state = await readPoses(page); expect(state.miniature).toEqual(state.main);
    resumed.add(JSON.stringify(state.miniature));
  }
  expect([...resumed].some((pose) => pose !== JSON.stringify(frozen.miniature))).toBe(true);

  const beforeReduced = (await readPoses(page)).miniature;
  const restingAnimal = isAnimalId(character.id) ? animalActionPose(character.id, 'idle', 0, true) : null;
  const restingHuman = princessPose('idle', 0, true);
  const expectedReduced = {
    frame: beforeReduced.frame === null ? null : '0',
    body: restingAnimal ? `translate(0 ${restingAnimal.bob.toFixed(5)})` : null,
    joints: beforeReduced.joints.map((joint) => ({ ...joint, transform: `rotate(${(restingAnimal
      ? restingAnimal.joints[joint.name as AnimalJoint] : restingHuman[joint.name as JointName]).toFixed(5)})` })),
  };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // WebKit updates retained MediaQueryList objects on a later native rendering
  // step. Wait for the actual artwork to reach its reduced-motion resting pose.
  await expect.poll(async () => (await readPoses(page)).miniature).toEqual(expectedReduced);
  await page.clock.runFor(300); expect((await readPoses(page)).miniature).toEqual(expectedReduced);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(false);
  // Reconcile after browser suspension using the actual persisted deadline.
  const deadline = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).targetTimestamp);
  await page.clock.setSystemTime(deadline); await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await page.clock.runFor(32);
  await expect(miniature).toHaveAttribute('data-progress', '1.000000');
  await expect(miniature).toHaveAttribute('data-action', 'idle');
  const arrived = (await readPoses(page)).miniature;
  await page.clock.runFor(6000); expect((await readPoses(page)).miniature).toEqual(arrived);
  await expect(page.locator('[data-status="completed"]')).toBeVisible();
  await expect(page.getByRole('button', { name: '⭐ 약속 지켰어요' })).toBeEnabled();
  expect(errors).toEqual([]); expect(failed).toEqual([]);
});
