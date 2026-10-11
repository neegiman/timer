import type { SceneTheme } from './dayNight';
import type { Season } from './seasons';
import { clamp, smoothstep } from './journey';

export type SceneryEvent = 'butterfly' | 'birds' | 'dragonfly' | 'leaves' | 'snow' | 'fireflies' | 'shooting-star' | 'ufo';
const SPACE_EVENTS: readonly SceneryEvent[] = ['ufo', 'shooting-star'];
const DAY_EVENTS: Record<Season, readonly SceneryEvent[]> = {
  spring: ['birds', 'butterfly'], summer: ['birds', 'dragonfly'], autumn: ['birds', 'leaves'], winter: ['birds', 'snow'],
};
const NIGHT_EVENTS: Record<Season, readonly SceneryEvent[]> = {
  spring: ['shooting-star', 'fireflies'], summer: ['shooting-star', 'fireflies'], autumn: ['shooting-star', 'leaves'], winter: ['shooting-star', 'snow'],
};
export const METEOR_GLIMMER_MS = 800;
const GLIMMER_ANCHORS = [[.68, .075], [.48, .13], [.78, .05]] as const;

/** A brief bloom and afterglow, with less than one sprite width of drift. */
export function meteorGlimmerPose(progress: number, width: number, height: number, cycle = 0) {
  const p = clamp(progress), variant = Math.max(0, Math.floor(cycle)) % 3;
  const [anchorX, anchorY] = GLIMMER_ANCHORS[variant];
  return {
    x: width * anchorX - Math.min(22, width * .05) * smoothstep(p / .8),
    y: height * anchorY + 5 * smoothstep(p),
    scale: .65 + .45 * smoothstep(p / .18) - .35 * smoothstep((p - .28) / .72),
  };
}

/** Quiet gaps between deterministic visitors; no randomness, timers or replayed background events. */
export function sceneryEvent(elapsed: number, season: Season, theme: SceneTheme, space = false) {
  const time = Math.max(0, elapsed), cycle = Math.floor(time / 48_000), local = time % 48_000;
  const slot = local >= 30_000 ? 1 : 0, start = slot ? 30_000 : 10_000;
  const events = space ? SPACE_EVENTS : theme === 'night' ? NIGHT_EVENTS[season] : DAY_EVENTS[season];
  const kind = events[space || theme === 'night' ? slot : (slot + cycle) % events.length];
  const duration = kind === 'shooting-star' ? METEOR_GLIMMER_MS : kind === 'ufo' ? 8000 : slot ? 9000 : 7000;
  const progress = clamp((local - start) / duration);
  const envelope = kind === 'shooting-star'
    ? smoothstep(progress / .15) * (1 - smoothstep((progress - .22) / .78))
    : smoothstep(progress / .15) * smoothstep((1 - progress) / .15);
  return { kind, progress,
    opacity: local < start || local >= start + duration ? 0 : envelope,
    flutter: .45 + .55 * Math.abs(Math.sin(time / 85)) };
}

export function sceneryParticle(elapsed: number, index: number) {
  const duration = 14_000 + index * 1700, phase = ((Math.max(0, elapsed) / duration + index * .173) % 1);
  return { x: .08 + index * .145 + .06 * Math.sin(phase * Math.PI * 2 + index), y: phase * .72,
    rotation: Math.sin(phase * Math.PI * 4 + index) * 40,
    opacity: smoothstep(phase / .1) * smoothstep((1 - phase) / .15) * .65 };
}
