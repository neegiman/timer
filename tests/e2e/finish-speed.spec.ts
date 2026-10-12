import { test, expect } from '@playwright/test';
import { finishCrossingDuration } from '../../src/lib/finishTiming';
import { finishDurationMs } from '../../src/lib/animation';
import { gaitPixelsPerMs } from '../../src/lib/motionProfiles';

for (const [id, name] of [['dog', '강아지'], ['cat', '고양이'], ['prince', '왕자'], ['car', '자동차']]) {
  test(`${id}: deadline crossing never speeds up or holds, then stops beyond the fixed finish`, async ({ page }) => {
    test.setTimeout(45_000);
    await page.clock.install(); await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./'); await page.getByRole('button', { name: '친구', exact: true }).click();
    await page.getByRole('button', { name, exact: true }).click();
    await page.getByRole('button', { name: '출발!', exact: true }).click();
    if (id === 'dog' || id === 'cat') await expect(page.locator('.traveler-body [data-animal-walk-sprite]')).toHaveAttribute('data-loaded', 'true');
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    const session = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!));
    // Deliberately avoid aligning the deadline with the 250ms React UI tick.
    await page.clock.setSystemTime(session.targetTimestamp - 573);
    await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
    await page.clock.runFor(32);
    const actorWidth = await page.locator('.character-wrapper').evaluate((actor) => Number.parseFloat(getComputedStyle(actor).width));
    const speed = gaitPixelsPerMs(id) * actorWidth / 160, duration = finishCrossingDuration(id);
    await page.evaluate(() => {
      type Frame = { time: number; x: number; gait: number; ground: number; goal: number; phase: string };
      const scope = window as typeof window & { finishFrames: Frame[]; finishSampling: boolean };
      scope.finishFrames = []; scope.finishSampling = true;
      const read = () => {
        if (!scope.finishSampling) return;
        const actor = document.querySelector<HTMLElement>('.character-wrapper')!, scene = document.querySelector<HTMLElement>('.journey-scene')!;
        // Computed CSS matrix strings round translations to six significant
        // digits. Read rendered subpixel bounds instead of amplifying that
        // serialization rounding into a false per-frame acceleration.
        scope.finishFrames.push({ time: Date.now(), x: actor.getBoundingClientRect().x,
          gait: Number(actor.dataset.gaitTime), ground: Number(scene.dataset.groundDistance),
          goal: document.querySelector('[data-testid="journey-goal"]')!.getBoundingClientRect().x, phase: scene.dataset.phase! });
        requestAnimationFrame(read);
      }; requestAnimationFrame(read);
    });
    await page.clock.runFor(duration + 1000);
    const frames = await page.evaluate(() => {
      const scope = window as typeof window & { finishFrames: { time: number; x: number; gait: number; ground: number; goal: number; phase: string }[]; finishSampling: boolean };
      scope.finishSampling = false; return scope.finishFrames;
    });
    const crossing = frames.filter((frame) => frame.time >= session.targetTimestamp + 32 && frame.time < session.targetTimestamp + duration - 32);
    expect(crossing.length).toBeGreaterThan(100);
    let previousSpeed = speed;
    for (let index = 1; index < crossing.length; index++) {
      const before = crossing[index - 1], after = crossing[index], dt = after.time - before.time;
      const velocity = (after.x - before.x) / dt;
      expect(velocity, 'Body accelerates after the finish line').toBeLessThanOrEqual(speed + .00003);
      expect(velocity, 'A UI update causes a new burst of speed').toBeLessThanOrEqual(previousSpeed + .00003);
      expect(velocity).toBeGreaterThan(0);
      expect(Math.abs(after.x - before.x - (after.gait - before.gait) * speed), 'Feet must slow with the body').toBeLessThan(.001);
      expect(after.ground).toBe(before.ground);
      expect(Math.abs(after.goal - before.goal), 'The destination must stay fixed after zero').toBeLessThan(.001);
      previousSpeed = velocity;
    }
    const early = crossing.filter((frame) => frame.time < session.targetTimestamp + 350);
    expect(early.length).toBeGreaterThan(10);
    expect((early.at(-1)!.x - early[0].x) / (early.at(-1)!.time - early[0].time), 'Zero must not insert a brief hold before crossing').toBeGreaterThan(speed * .97);
    const clearTime = actorWidth / 2 / speed;
    const cruising = crossing.filter((frame) => frame.time < session.targetTimestamp + clearTime - 32);
    for (let index = 1; index < cruising.length; index++) {
      const before = cruising[index - 1], after = cruising[index];
      expect((after.x - before.x) / (after.time - before.time), 'Do not slow before the whole character clears the line').toBeGreaterThan(speed * .995);
    }
    await page.clock.runFor(Math.max(0, session.targetTimestamp + finishDurationMs(id) + 500 - await page.evaluate(() => Date.now())));
    await expect(page.locator('[data-status="completed"]')).toBeVisible();
    const actor = page.locator('.character-wrapper');
    const geometry = await actor.evaluate((element) => ({ stop: Number((element as HTMLElement).dataset.finishStopX), x: new DOMMatrix(getComputedStyle(element).transform).m41 }));
    expect(geometry.x).toBeCloseTo(geometry.stop, 3);
  });
}
