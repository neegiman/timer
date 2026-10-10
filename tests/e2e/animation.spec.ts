import { test, expect, type Page } from '@playwright/test';
import { instrumentAudio } from './audio';
import { FINISH_SEQUENCE, finishPhaseStart } from '../../src/lib/animation';

async function begin(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '출발!' }).click();
  await expect(page.locator('[data-status="running"]')).toBeVisible();
  // Freeze wall-clock advancement between automation calls. The last 100ms
  // must stay testable even when a mobile browser takes longer to read the DOM.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
}
async function seek(page: Page, elapsed: number) {
  const start = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).startTimestamp);
  await page.clock.setSystemTime(start + elapsed);
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await page.clock.runFor(32);
}

test('fixed walking, one-time 50/90 messages, stationary finish and ordered celebration', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await instrumentAudio(page);
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await begin(page);
  const supportsAudio = await page.evaluate(() => typeof AudioContext !== 'undefined');
  const played = (name: string) => page.evaluate((sound) => window.playedSounds.filter((url) => url.endsWith(`/${sound}.mp3`)).length, name);
  const scene = page.locator('.journey-scene');
  const main = page.locator('.character-wrapper');
  const message = page.getByTestId('journey-message');
  await expect(scene).toHaveAttribute('data-phase', 'WALK');
  await expect(message).toHaveText('즐겁게 걸어가 볼까? 🌈');
  await page.clock.runFor(800);
  if (supportsAudio) await expect.poll(() => played('start')).toBe(1);
  const fixedX = await main.evaluate((element) => element.getBoundingClientRect().x);
  await seek(page, 299_900);
  await expect(message).toHaveText('즐겁게 걸어가 볼까? 🌈');
  await expect(page.getByTestId('journey-goal')).toHaveCount(0);
  await seek(page, 300_000);
  await expect(message).toHaveText('벌써 반이나 왔어! 반만 더 가면 돼! 🌟');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  await expect(scene).toHaveAttribute('data-phase', 'WALK');
  if (supportsAudio) await expect.poll(() => played('midpoint')).toBe(1);
  await page.clock.runFor(1000);
  await expect(message).toHaveAttribute('data-cue', 'halfway');
  await expect(message).toHaveAttribute('data-visible', 'true');
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'artifacts/motion-midpoint.png', fullPage: true });
  await seek(page, 539_900);
  await expect(page.getByTestId('journey-goal')).toHaveCount(0);
  await seek(page, 540_000);
  await expect(message).toHaveText('거의 다 왔어! 이제 곧 약속 시간이야! 🏁');
  await expect(page.getByTestId('journey-goal')).toHaveCount(1);
  await page.clock.runFor(1000);
  if (supportsAudio) await expect.poll(() => played('sparkle')).toBe(1);
  await expect(message).toHaveAttribute('data-cue', 'near');
  await expect(message).toHaveAttribute('data-visible', 'true');
  const goalX = await page.getByTestId('journey-goal').evaluate((element) => element.getBoundingClientRect().x);
  let previousGround = Number(await scene.getAttribute('data-ground-distance'));
  let previousActor = fixedX;
  for (const elapsed of [550_000, 570_000, 590_000, 599_900]) {
    await seek(page, elapsed);
    await expect(scene).toHaveAttribute('data-phase', 'WALK');
    const actorX = await main.evaluate((element) => element.getBoundingClientRect().x);
    expect(actorX).toBeGreaterThan(previousActor);
    expect(actorX).toBeLessThan(goalX);
    previousActor = actorX;
    expect(await page.getByTestId('journey-goal').evaluate((element) => element.getBoundingClientRect().x)).toBeCloseTo(goalX, 4);
    const ground = Number(await scene.getAttribute('data-ground-distance'));
    expect(ground).toBeGreaterThan(previousGround);
    previousGround = ground;
    if (testInfo.project.name === 'chromium' && elapsed === 590_000) await page.screenshot({ path: 'artifacts/fixed-finish-near-390.png', fullPage: true });
  }
  await seek(page, 600_000);
  await expect(scene).toHaveAttribute('data-phase', 'CROSS_FINISH');
  await expect(message).toHaveText('도착! 약속 시간이 됐어! 참 잘했어! 🎉');
  expect(await page.getByTestId('journey-goal').evaluate((element) => element.getBoundingClientRect().x)).toBeCloseTo(goalX, 4);
  const stopped = await page.locator('[data-layer="ground"]').getAttribute('style');
  const arrival = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).arrivalTimestamp);
  for (const { phase } of FINISH_SEQUENCE.slice(1)) {
    const offset = finishPhaseStart(phase) + 50;
    await page.clock.setSystemTime(arrival + offset);
    await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
    await page.clock.runFor(32);
    await expect(scene).toHaveAttribute('data-phase', phase);
    expect(await page.getByTestId('journey-goal').evaluate((element) => element.getBoundingClientRect().x)).toBeCloseTo(goalX, 4);
    expect(await page.locator('[data-layer="ground"]').getAttribute('style')).toBe(stopped);
    await expect(page.getByRole('button', { name: '⭐ 약속 지켰어요' })).toHaveCount(0);
  }
  await page.clock.fastForward(5000);
  await expect(page.locator('[data-status="completed"]')).toBeVisible();
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'artifacts/fixed-finish-completed-390.png', fullPage: true });
  if (supportsAudio) {
    for (const sound of ['finish', 'midpoint', 'sparkle']) await expect.poll(() => played(sound)).toBe(1);
    expect(await page.evaluate(() => window.audioDiagnostics)).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test('pause freezes joints, scroll, miniature and time; finish stays fixed through refresh/resume', async ({ page }) => {
  await page.clock.install();
  await begin(page);
  await seek(page, 570_100);
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  await page.clock.runFor(64);
  const pose = () => page.evaluate(() => {
    const goal = document.querySelector('.journey-goal')!.getBoundingClientRect();
    const scene = document.querySelector('.journey-scene')!.getBoundingClientRect();
    return {
      gait: document.querySelector('.character-wrapper')!.getAttribute('data-gait-time'),
      actor: document.querySelector('.character-wrapper')!.getAttribute('style'),
      body: document.querySelector('.traveler-body')!.getAttribute('style'),
      joints: [...document.querySelectorAll('.traveler-body [data-joint], .traveler-body [data-animal-joint]')].map((element) => element.getAttribute('transform')),
      layers: [...document.querySelectorAll('[data-layer]')].map((element) => element.getAttribute('style')),
      miniature: document.querySelector('.progress-marker')!.getAttribute('style'),
      // Opening the parent menu can scroll the page on mobile; compare scene coordinates.
      goal: { x: goal.x - scene.x, y: goal.y - scene.y },
      number: document.querySelector('[data-testid="countdown"]')!.textContent,
    };
  });
  const frozen = await pose();
  await page.clock.fastForward(5000);
  expect(await pose()).toEqual(frozen);
  await page.reload();
  await expect(page.locator('[data-status="paused"]')).toBeVisible();
  await expect.poll(async () => { await page.clock.runFor(32); return pose(); }).toEqual(frozen);
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.evaluate(() => {
    Object.assign(window, { wrongResumeStage: false });
    new MutationObserver(() => {
      if (document.querySelector('.journey-scene')!.getAttribute('data-stage') !== 'near') {
        (window as unknown as { wrongResumeStage: boolean }).wrongResumeStage = true;
      }
    }).observe(document.querySelector('.journey-scene')!, { attributes: true, attributeFilter: ['data-stage'] });
  });
  await page.getByRole('button', { name: '계속', exact: true }).click();
  await page.clock.runFor(64);
  const resumed = await pose();
  expect(Number(resumed.gait) - Number(frozen.gait)).toBeLessThan(500);
  expect(resumed.joints).not.toEqual(frozen.joints);
  expect(resumed.layers).not.toEqual(frozen.layers);
  expect(resumed.goal).toEqual(frozen.goal);
  expect(await page.evaluate(() => (window as unknown as { wrongResumeStage: boolean }).wrongResumeStage)).toBe(false);
});

test('restart resets scene, stage and scroll; exit cancels arrival', async ({ page }) => {
  await page.clock.install();
  await begin(page);
  await seek(page, 600_000);
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '처음부터', exact: true }).click();
  await page.getByRole('button', { name: '다시 출발', exact: true }).click();
  await page.clock.runFor(64);
  await expect(page.locator('.journey-scene')).toHaveAttribute('data-phase', 'WALK');
  await expect(page.getByTestId('journey-message')).toHaveText('즐겁게 걸어가 볼까? 🌈');
  await expect(page.getByTestId('journey-goal')).toHaveCount(0);
  expect(Number(await page.locator('.progress-marker').getAttribute('data-progress'))).toBeLessThan(.002);
  expect(Number(await page.locator('[data-layer="ground"]').getAttribute('data-scroll-offset'))).toBeLessThan(5);
  await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
  await page.getByRole('button', { name: '종료', exact: true }).click();
  await page.getByRole('button', { name: '여행 마치기', exact: true }).click();
  await page.clock.fastForward(10_000);
  await expect(page.locator('.journey-scene')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '다음', exact: true })).toBeVisible();
});

test('1 and 120 minute journeys stay calm in their last ten seconds and stop at zero', async ({ page }) => {
  await page.clock.install();
  await page.goto('./');
  for (const minutes of [1, 120]) {
    await page.evaluate((duration) => { localStorage.clear(); localStorage.setItem('promise-journey:v1:selectedDuration', JSON.stringify(duration)); }, minutes);
    await begin(page);
    const duration = minutes * 60_000;
    for (const remaining of [9900, 2900, 100]) {
      await seek(page, duration - remaining);
      // The test clock is frozen. Wait for React to commit the new sample
      // (and mount the final-10% goal), then let its first rAF paint run.
      await expect(page.getByTestId('traveler')).toHaveAttribute('data-progress', String((duration - remaining) / duration));
      await page.clock.runFor(16);
      await expect(page.locator('.journey-scene')).toHaveAttribute('data-phase', 'WALK');
      if (remaining <= duration * .1) {
        await expect(page.getByTestId('journey-goal').locator('.finish-flag')).toBeVisible();
      } else {
        // In a one-minute journey, ten seconds remaining is still before 90%.
        await expect(page.getByTestId('journey-goal')).toHaveCount(0);
      }
    }
    await seek(page, duration);
    await expect(page.getByTestId('journey-goal').locator('.finish-flag')).toBeVisible();
    await expect(page.getByTestId('countdown')).toContainText('00:00');
  }
});

test('dog and cat artwork and motion profiles survive a running refresh', async ({ page }) => {
  await page.clock.install();
  await page.goto('./');
  const cycles: string[] = [];
  for (const [name, id] of [['강아지', 'dog'], ['고양이', 'cat']]) {
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.getByRole('button', { name, exact: true }).click();
    await page.getByRole('button', { name: '출발!' }).click();
    await seek(page, 40_000);
    await page.reload();
    await expect(page.locator('.traveler-body .character-artwork')).toHaveAttribute('data-character', id);
    await expect(page.locator('.journey-scene')).toHaveAttribute('data-phase', 'WALK');
    cycles.push(await page.locator('.character-wrapper').evaluate((element) => getComputedStyle(element).getPropertyValue('--cycle')));
    await page.getByRole('button', { name: '부모 메뉴', exact: true }).click();
    await page.getByRole('button', { name: '종료', exact: true }).click();
    await page.getByRole('button', { name: '여행 마치기', exact: true }).click();
  }
  expect(cycles[0]).not.toBe(cycles[1]);
});
