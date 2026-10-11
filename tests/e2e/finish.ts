import type { Page } from '@playwright/test';
import { finishDurationMs } from '../../src/lib/animation';

/** Wait for this friend's natural crossing and celebration, not a fixed 5s. */
export async function finishWait(page: Page) {
  const id = await page.evaluate(() => JSON.parse(localStorage.getItem('promise-journey:v1:activeSession')!).characterId as string);
  return finishDurationMs(id) + 500;
}
