import type { PromiseActivity, TimerMode } from '@/types/timer';
import { JOURNEY_MESSAGES } from './animation';

export const isTimerMode = (value: unknown): value is TimerMode => value === 'after' || value === 'during';
export const modeLabel = (mode: TimerMode) => mode === 'after' ? '활동 시작' : '활동 마무리';
export const durationLabel = (minutes: number, mode: TimerMode) => `${minutes}분 ${mode === 'after' ? '뒤에 시작' : '동안 하기'}`;

export function activityReminder(promise: PromiseActivity, mode: TimerMode, characterName?: string) {
  if (characterName) return mode === 'after'
    ? `${characterName} 친구가 도착하면 ${promise.name} 시작해요.`
    : `${characterName} 친구가 걷는 동안 ${promise.name} 함께 해요.`;
  return mode === 'after' ? `도착하면 ${promise.name} 시작해요` : `지금은 ${promise.name} · 도착하면 마무리해요`;
}

export function activityCompletion(promise: PromiseActivity, mode: TimerMode) {
  return mode === 'after' ? `이제 ${promise.activity}!` : `${promise.name} 시간이 끝났어요. 수고했어요!`;
}

export const DURING_MESSAGES = {
  beginning: '차근차근 함께 해 볼까? 🌈',
  halfway: '벌써 반이나 왔어! 잘하고 있어! 🌟',
  near: '거의 다 왔어! 이제 슬슬 마무리해 볼까? 🏁',
  arrived: '도착! 약속 시간이 끝났어. 참 잘했어! 🎉',
} as const;

export function activityMessages(mode: TimerMode) {
  return mode === 'during' ? DURING_MESSAGES : JOURNEY_MESSAGES;
}
