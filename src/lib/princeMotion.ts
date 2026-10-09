import type { CharacterAction } from '../types/animation';

export const PRINCE_GAIT = { cycleMs: 1200, support: .66, travel: 40, lift: 6, groundY: 205 };
export const PRINCE_SHEET = { columns: 6, rows: 3, frameWidth: 160, frameHeight: 210, walkFrames: 12, frames: 18 };
export const PRINCE_ASSET = '/characters/pixel-v1/prince-celebrate-v2.svg';

/** Whole-body pixel frames follow the timer's gait clock, including pause/restore. */
export function princeFrame(action: CharacterAction, elapsed: number, reduced = false) {
  if (reduced) return 0;
  const time = Math.max(0, elapsed);
  if (['walk', 'fastWalk', 'run', 'sprint'].includes(action)) return 1 + Math.floor(time / PRINCE_GAIT.cycleMs * PRINCE_SHEET.walkFrames) % PRINCE_SHEET.walkFrames;
  if (action === 'jump' || action === 'hop') return 13;
  if (action === 'land') return 14;
  if (action === 'celebrate') return 15 + Math.floor(time / 300) % 3;
  return 0;
}

export function princeViewBox(frame: number) {
  const index = Math.max(0, Math.min(PRINCE_SHEET.frames - 1, Math.floor(frame)));
  return `${index % PRINCE_SHEET.columns * PRINCE_SHEET.frameWidth} ${Math.floor(index / PRINCE_SHEET.columns) * PRINCE_SHEET.frameHeight} ${PRINCE_SHEET.frameWidth} ${PRINCE_SHEET.frameHeight}`;
}
