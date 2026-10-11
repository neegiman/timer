import { test, expect } from '@playwright/test';
import { PAINTED_PRINCE_GAIT } from '../../src/lib/paintedPrinceMotion';

test('prince flow keeps feet, arms and flexible cape moving between steps and through message milestones', async ({ page }) => {
  await page.clock.install(); await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./'); await page.getByRole('button', { name: '친구', exact: true }).click();
  await page.getByRole('button', { name: '왕자', exact: true }).click();
  await page.getByRole('button', { name: '출발!', exact: true }).click();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const session = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!));
  const total = session.targetTimestamp - session.startTimestamp;
  const sample = async (elapsed: number, duration: number) => {
    await page.clock.setSystemTime(session.startTimestamp + elapsed);
    await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
    await page.clock.runFor(32);
    await page.evaluate(() => {
      type Frame = { time: number; gait: number; ground: number; x: number; joints: number[]; cape: string[]; body: string };
      const scope = window as typeof window & { princeFrames: Frame[]; princeSampling: boolean };
      scope.princeFrames = []; scope.princeSampling = true;
      const read = () => {
        if (!scope.princeSampling) return;
        const root = document.querySelector('.traveler-body')!, actor = document.querySelector<HTMLElement>('.character-wrapper')!;
        const names = ['front-thigh', 'front-shin', 'back-thigh', 'back-shin', 'front-arm', 'back-arm'];
        scope.princeFrames.push({ time: Date.now(), gait: Number(actor.dataset.gaitTime),
          ground: Number(document.querySelector<HTMLElement>('.journey-scene')!.dataset.groundDistance),
          x: new DOMMatrix(getComputedStyle(actor).transform).m41,
          joints: names.map((name) => Number(root.querySelector(`[data-joint="${name}"]`)!.getAttribute('transform')!.slice(7, -1))),
          cape: Array.from(root.querySelectorAll('[data-prince-cape-panel]'), (panel) => panel.getAttribute('transform')!),
          body: root.querySelector('[data-prince-body]')!.getAttribute('transform')! });
        requestAnimationFrame(read);
      };
      requestAnimationFrame(read);
    });
    await page.clock.runFor(duration);
    return page.evaluate(() => {
      const scope = window as typeof window & { princeFrames: { time: number; gait: number; ground: number; x: number; joints: number[]; cape: string[]; body: string }[]; princeSampling: boolean };
      scope.princeSampling = false; return scope.princeFrames;
    });
  };
  // Consecutive rendered frames catch gait holds that eight isolated poses
  // miss, including the 250ms React timer updates and message changes.
  for (const elapsed of [40_000, total * .5 - 650, total * .9 - 650]) {
    const frames = await sample(elapsed, PAINTED_PRINCE_GAIT.cycleMs * 2);
    expect(frames.length).toBeGreaterThan(100);
    for (let index = 1; index < frames.length; index++) {
      const before = frames[index - 1], after = frames[index], dt = after.time - before.time;
      expect(dt).toBeGreaterThan(0);
      expect(Math.abs(after.gait - before.gait - dt), 'UI updates must not reset or hold the stride clock').toBeLessThan(.001);
      const movement = after.joints.slice(0, 4).reduce((sum, angle, joint) => sum + Math.abs(angle - before.joints[joint]), 0);
      expect(movement / dt, 'The legs must keep moving between footfalls').toBeGreaterThan(.015);
      for (let joint = 0; joint < after.joints.length; joint++) expect(Math.abs(after.joints[joint] - before.joints[joint]) / dt).toBeLessThan(.32);
      expect(after.ground).toBeGreaterThan(before.ground);
      expect(Math.abs(after.x - before.x), 'Only the scenery moves before the final approach').toBeLessThan(.02);
      expect(after.cape).toHaveLength(6);
      expect(after.cape[0]).toBe('matrix(1 0 0.000000 1 0.000000 0)');
      expect(after.cape.slice(1)).not.toEqual(before.cape.slice(1));
    }
    expect(new Set(frames.map((frame) => frame.body)).size).toBeGreaterThan(20);
  }
});
