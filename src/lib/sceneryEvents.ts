import type { SceneTheme } from './dayNight';
import type { Season } from './seasons';
import { clamp, smoothstep } from './journey';

export type SceneryEvent = 'butterfly' | 'birds' | 'dragonfly' | 'leaves' | 'snow' | 'fireflies' | 'shooting-star';
const DAY_EVENTS: Record<Season, readonly SceneryEvent[]> = {
  spring: ['birds', 'butterfly'], summer: ['birds', 'dragonfly'], autumn: ['birds', 'leaves'], winter: ['birds', 'snow'],
};
const NIGHT_EVENTS: Record<Season, readonly SceneryEvent[]> = {
  spring: ['shooting-star', 'fireflies'], summer: ['shooting-star', 'fireflies'], autumn: ['shooting-star', 'leaves'], winter: ['shooting-star', 'snow'],
};

/** Quiet gaps between deterministic visitors; no randomness, timers or replayed background events. */
export function sceneryEvent(elapsed: number, season: Season, theme: SceneTheme) {
  const time = Math.max(0, elapsed), cycle = Math.floor(time / 48_000), local = time % 48_000;
  const slot = local >= 30_000 ? 1 : 0, start = slot ? 30_000 : 10_000;
  const events = theme === 'night' ? NIGHT_EVENTS[season] : DAY_EVENTS[season];
  const kind = events[theme === 'night' ? slot : (slot + cycle) % events.length];
  const duration = kind === 'shooting-star' ? 2600 : slot ? 9000 : 7000;
  const progress = clamp((local - start) / duration);
  return { kind, progress,
    opacity: local < start || local >= start + duration ? 0 : smoothstep(progress / .15) * smoothstep((1 - progress) / .15),
    flutter: .45 + .55 * Math.abs(Math.sin(time / 85)) };
}

export function sceneryParticle(elapsed: number, index: number) {
  const duration = 14_000 + index * 1700, phase = ((Math.max(0, elapsed) / duration + index * .173) % 1);
  return { x: .08 + index * .145 + .06 * Math.sin(phase * Math.PI * 2 + index), y: phase * .72,
    rotation: Math.sin(phase * Math.PI * 4 + index) * 40,
    opacity: smoothstep(phase / .1) * smoothstep((1 - phase) / .15) * .65 };
}
