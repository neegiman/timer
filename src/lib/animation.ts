import type { AnimationInput, AnimationPhase, AnimationState, CharacterAction, MotionEasing } from '../types/animation';

export const POSITION_ANCHORS = { start: 0, walk1: .15, walk2: .30, midpoint: .50, walk4: .65, fastWalk: .75, runStart: .82, run: .90, countdown: .96, sprint: .99, finish: 1, overshoot: 1.06 } as const;
const anchors = POSITION_ANCHORS;
export const INTRO_MS = 1800;
export const START_MS = 1000;
export const FINISH_SEQUENCE = [
  { phase: 'CROSS_FINISH', duration: 300, from: 1, to: 1.025, action: 'sprint', easing: 'linear', sound: 'whoosh' },
  { phase: 'OVERSHOOT', duration: 400, from: 1.025, to: 1.06, action: 'run', easing: 'easeOut' },
  { phase: 'BRAKE', duration: 450, from: 1.06, to: 1.07, action: 'brake', easing: 'easeOut' },
  { phase: 'TURN', duration: 500, from: 1.07, to: 1.07, action: 'turn', easing: 'easeInOut' },
  { phase: 'JUMP', duration: 600, from: 1.07, to: 1.07, action: 'jump', easing: 'linear', sound: 'pop' },
  { phase: 'LAND', duration: 400, from: 1.07, to: 1.07, action: 'land', easing: 'linear', sound: 'land' },
  { phase: 'CELEBRATE', duration: 1600, from: 1.07, to: 1.07, action: 'celebrate', easing: 'linear', sound: 'finish' },
] as const;
export const FINISH_DURATION_MS = FINISH_SEQUENCE.reduce((total, step) => total + step.duration, 0);

const clamp = (n: number) => Math.min(1, Math.max(0, n));
export function ease(t: number, easing: MotionEasing) {
  const n = clamp(t);
  if (easing === 'easeIn') return n * n;
  if (easing === 'easeOut') return 1 - (1 - n) ** 2;
  if (easing === 'easeInOut') return n * n * (3 - 2 * n);
  return n;
}

function state(phase: AnimationPhase, key: string, elapsed: number, duration: number, from: number, to: number,
  characterAction: CharacterAction, message: string, easing: MotionEasing = 'linear', speed = 1): AnimationState {
  return { phase, phaseKey: key, phaseElapsedMs: Math.max(0, elapsed), actionElapsedMs: Math.max(0, elapsed), targetPosition: to,
    position: from + (to - from) * ease(elapsed / Math.max(1, duration), easing), characterAction, message, easing, speed,
    backgroundMode: ['run', 'sprint'].includes(characterAction) ? 'fast' : ['walk', 'fastWalk'].includes(characterAction) ? 'moving' : 'idle' };
}

/** A persisted arrival clock drives an ordered sequence; no chained timeout promises to leak on exit. */
export function getFinishAnimationState(elapsed: number): AnimationState {
  let start = 0;
  for (const step of FINISH_SEQUENCE) {
    if (elapsed < start + step.duration || step.phase === 'CELEBRATE') {
      const result = state(step.phase, step.phase, elapsed - start, step.duration, step.from, step.to, step.action,
        step.phase === 'JUMP' || step.phase === 'LAND' || step.phase === 'CELEBRATE' ? '도착했어요!' : '결승선을 지나가요!', step.easing,
        step.phase === 'CROSS_FINISH' ? 1.8 : 1);
      if ('sound' in step) { result.sound = step.sound; result.soundKey = step.sound === 'finish' ? 'finish' : step.phase; }
      result.backgroundMode = step.phase === 'CELEBRATE' ? 'celebration' : step.phase === 'CROSS_FINISH' || step.phase === 'OVERSHOOT' ? 'fast' : 'idle';
      return result;
    }
    start += step.duration;
  }
  throw new Error('Finish sequence must end in CELEBRATE');
}

function regularState(elapsed: number, total: number): AnimationState {
  const p = elapsed / total;
  const walkStart = INTRO_MS + START_MS;
  const rest1End = .15 * total + Math.min(1200, .03 * total);
  const reactionEnd = .30 * total + Math.min(1000, .03 * total);
  const midEnd = .50 * total + 1800;
  const rest2End = .72 * total + Math.min(1200, .04 * total);
  const runStartEnd = .80 * total + Math.min(1000, .03 * total);
  let result: AnimationState;
  if (elapsed < INTRO_MS) return state('INTRO', 'intro', elapsed, INTRO_MS, 0, 0, 'appear', '준비!', 'easeOut');
  if (elapsed < walkStart) {
    result = state('START', 'start', elapsed - INTRO_MS, START_MS, anchors.start, .025, 'start', '출발!', 'easeIn');
    result.sound = 'start'; result.soundKey = 'start'; return result;
  }
  if (p < .15) result = state('WALK', 'walk-1', elapsed - walkStart, .15 * total - walkStart, .025, anchors.walk1, 'walk', '천천히 가볼까요?', 'easeInOut');
  else if (elapsed < rest1End) result = state('REST', 'rest-1', elapsed - .15 * total, rest1End - .15 * total, anchors.walk1, anchors.walk1, 'idle', '잘 가고 있어요!', 'easeOut');
  else if (p < .30) result = state('WALK', 'walk-2', elapsed - rest1End, .30 * total - rest1End, anchors.walk1, anchors.walk2, 'walk', '잘 가고 있어요!', 'easeInOut');
  else if (elapsed < reactionEnd) result = state('REACTION', 'reaction', elapsed - .30 * total, reactionEnd - .30 * total, anchors.walk2, anchors.walk2, 'hop', '여기까지 왔어요!', 'easeOut');
  else if (p < .48) result = state('WALK', 'walk-3', elapsed - reactionEnd, .48 * total - reactionEnd, anchors.walk2, .48, 'walk', '잘 가고 있어요!', 'easeInOut');
  else if (elapsed < midEnd) {
    if (p < .50) result = state('MID_EVENT', 'mid-approach', elapsed - .48 * total, .02 * total, .48, anchors.midpoint, 'walk', '절반이 가까워요!', 'easeOut', .8);
    else {
      result = state('MID_EVENT', 'mid-jump', elapsed - .50 * total, 1800, anchors.midpoint, anchors.midpoint, 'hop', '절반 왔어요!', 'easeOut');
      result.sound = 'midpoint'; result.soundKey = 'midpoint';
    }
  }
  else if (p < .65) result = state('WALK', 'walk-4', elapsed - midEnd, .65 * total - midEnd, anchors.midpoint, anchors.walk4, 'walk', '좋아요! 계속 가볼까요?', 'easeInOut', 1.05);
  else if (p < .72) result = state('FAST_WALK', 'fast-walk', elapsed - .65 * total, .07 * total, anchors.walk4, anchors.fastWalk, 'fastWalk', '점점 가까워지고 있어요!', 'easeInOut', 1.2);
  else if (elapsed < rest2End) result = state('REST', 'rest-2', elapsed - .72 * total, rest2End - .72 * total, anchors.fastWalk, anchors.fastWalk, 'idle', '잠깐 쉬어 가요!', 'easeOut');
  else if (p < .76) result = state('FAST_WALK', 'finish-approach', elapsed - rest2End, .76 * total - rest2End, anchors.fastWalk, .78, 'fastWalk', '점점 가까워지고 있어요!', 'easeInOut', 1.1);
  else if (p < .80) { result = state('LOOK_FINISH', 'look-finish', elapsed - .76 * total, .04 * total, .78, .78, 'look', '앗! 결승점이에요!', 'easeOut'); result.sound = 'sparkle'; result.soundKey = 'finish-recognition'; }
  else if (elapsed < runStartEnd) result = state('RUN_START', 'run-start', elapsed - .80 * total, runStartEnd - .80 * total, .78, anchors.runStart, 'start', '거의 다 왔어요!', 'easeIn');
  else if (p < .90) result = state('RUN', 'run', elapsed - runStartEnd, .90 * total - runStartEnd, anchors.runStart, anchors.run, 'run', '조금만 더!', 'easeInOut', 1.6);
  else if (p < .94) result = state('RUN', 'fast-run', elapsed - .90 * total, .04 * total, anchors.run, .94, 'run', '와! 정말 가까워요!', 'easeIn', 1.76);
  else result = state('COUNTDOWN', 'countdown-approach', elapsed - .94 * total, .06 * total, .94, anchors.countdown, 'run', '거의 다 왔어요!', 'linear', 1.76);

  // Short, deterministic breaths and hops within a walk, without changing its anchor destination.
  if (result.phase === 'WALK' && result.phaseKey === 'walk-2') {
    const hopAt = .24 * total - rest1End;
    if (result.phaseElapsedMs >= hopAt && result.phaseElapsedMs < hopAt + 800) {
      result.characterAction = 'hop'; result.actionElapsedMs = result.phaseElapsedMs - hopAt;
    }
  }
  if (result.phaseKey === 'walk-3') {
    const cycle = result.phaseElapsedMs % 18_000;
    const duration = .48 * total - reactionEnd;
    const movementTime = (time: number) => time - Math.floor(time / 18_000) * 600 - Math.max(0, Math.min(600, time % 18_000 - 12_000));
    result.position = anchors.walk2 + (.48 - anchors.walk2) * ease(movementTime(result.phaseElapsedMs) / movementTime(duration), 'easeInOut');
    if (cycle >= 12_000 && cycle < 12_600) {
      result.characterAction = 'idle'; result.actionElapsedMs = cycle - 12_000;
    } else if (cycle >= 7000 && cycle < 7700) { result.characterAction = 'look'; result.actionElapsedMs = cycle - 7000; }
  }
  return result;
}

/** Normal messages hold for >=3s; introductory poses, actual countdown digits and the finish are exceptions. */
function journeyMessage(elapsed: number, total: number, fallback: string) {
  if (elapsed < INTRO_MS + START_MS) return fallback;
  const entries: [number, string][] = [
    [INTRO_MS + START_MS, '천천히 가볼까요?'], [.18 * total, '잘 가고 있어요!'], [.30 * total, '여기까지 왔어요!'],
    [.50 * total, '절반 왔어요!'], [.52 * total, '좋아요! 계속 가볼까요?'], [.65 * total, '점점 가까워지고 있어요!'],
    [.76 * total, '앗! 결승점이에요!'], [.80 * total, '거의 다 왔어요!'], [.83 * total, '조금만 더!'], [.90 * total, '와! 정말 가까워요!'], [.94 * total, '거의 다 왔어요!'],
  ];
  let nextAt = -Infinity;
  let message = entries[0][1];
  for (const [at, text] of entries) {
    nextAt = Math.max(at, nextAt + 3000);
    if (elapsed < nextAt) break;
    message = text;
  }
  return message;
}

export function getAnimationState(input: AnimationInput): AnimationState {
  if (!input.hasStarted) return state('READY', 'ready', 0, 1, 0, 0, 'idle', '준비됐나요?');
  if (input.isFinished) return getFinishAnimationState(Math.max(0, input.finishElapsedMs));
  const total = Math.max(60_000, input.totalDuration);
  const remaining = Math.max(0, Math.min(total, input.remainingTime));
  const elapsed = total - remaining;
  // A ten-second countdown is always ten actual seconds, including 1 and 120 minute journeys.
  if (remaining <= 10_000) {
    const number = Math.max(1, Math.ceil(remaining / 1000));
    const from = regularState(total - 10_000, total).position;
    const sprint = remaining <= 3000;
    const result = sprint
      ? state('SPRINT', 'sprint', 3000 - remaining, 3000, anchors.sprint, anchors.finish, 'sprint', String(number), 'easeIn', 1.9)
      : state('COUNTDOWN', 'countdown', 10_000 - remaining, 7000, from, anchors.sprint, 'run', number === 10 ? '10초 남았어요!' : '조금만 더!', 'linear', 1.76);
    result.countdownNumber = number;
    result.sound = sprint ? 'strong-tick' : 'tick'; result.soundKey = `countdown-${number}`;
    result.backgroundMode = 'idle'; return result;
  }
  const result = regularState(elapsed, total);
  result.message = journeyMessage(elapsed, total, result.message);
  return result;
}
