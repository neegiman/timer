import type { PromiseActivity, TimerMode } from '@/types/timer';

export const isTimerMode = (value: unknown): value is TimerMode => value === 'after' || value === 'during';
export const modeLabel = (mode: TimerMode) => mode === 'after' ? '활동 시작' : '활동 마무리';
export const durationLabel = (minutes: number, mode: TimerMode) => `${minutes}분 ${mode === 'after' ? '뒤에 시작' : '동안 하기'}`;

const finishActions: Record<string, string> = {
  bath: '씻기를 마무리해요', sleep: '쉬는 시간이 끝났어요', meal: '식사를 마무리해요',
  tidy: '정리를 마무리해요', outside: '외출 준비를 마무리해요', video: '영상을 끄고 쉬어요',
};
const startAction = (promise: PromiseActivity) => Object.hasOwn(finishActions, promise.id) ? promise.activity : `‘${promise.name}’ 시작해요`;

export function activityReminder(promise: PromiseActivity, mode: TimerMode, characterName?: string) {
  if (characterName) return mode === 'after'
    ? `${characterName} 친구가 도착하면 ${startAction(promise)}.`
    : `${characterName} 친구와 ${promise.name} 함께 해요. 도착하면 마무리해요.`;
  return mode === 'after' ? `활동 시작 · 도착하면 ${startAction(promise)}` : `활동 마무리 · ${promise.name}, 도착하면 마무리해요`;
}

export function activityCompletion(promise: PromiseActivity, mode: TimerMode) {
  return mode === 'after' ? `이제 ${startAction(promise)}!` : `${Object.hasOwn(finishActions, promise.id) ? finishActions[promise.id] : `‘${promise.name}’ 마무리해요`}. 수고했어요!`;
}
