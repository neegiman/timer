import { journeyStage } from './animation';
import { clamp } from './journey';

export const noticeInterval = (total: number) => total <= 15 * 60_000 ? 30_000 : total <= 30 * 60_000 ? 60_000 : 90_000;

/** Notice windows use active elapsed time, so pause, refresh and background recovery agree. */
export function journeyNotice(totalDuration: number, remainingTime: number) {
  const total = Math.max(60_000, totalDuration);
  const elapsed = clamp(total - remainingTime, 0, total);
  const stage = journeyStage(elapsed / total);
  if (elapsed === total) return { stage, key: 'arrived', visible: true };
  const milestones = [
    { start: 0, duration: 8000, key: 'start' },
    { start: total * .5, duration: 8000, key: 'halfway' },
    { start: total * .9, duration: 8000, key: 'near' },
    { start: Math.max(total * .9, total - 10_000), duration: 10_000, key: 'last-seconds' },
  ];
  const interval = noticeInterval(total);
  const repeatStart = Math.floor(elapsed / interval) * interval;
  // Leave quiet space around milestones instead of flashing two notices back to back.
  const repeat = repeatStart > 0 && !milestones.some((item) => Math.abs(item.start - repeatStart) < 12_000)
    ? [{ start: repeatStart, duration: 6000, key: `repeat-${repeatStart}` }] : [];
  const latest = [...milestones, ...repeat].filter((item) => item.start <= elapsed)
    .reduce((last, item) => item.start >= last.start ? item : last);
  return { stage, key: latest.key, visible: elapsed < latest.start + latest.duration };
}
