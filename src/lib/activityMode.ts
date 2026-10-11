import type { PromiseActivity, TimerMode } from '@/types/timer';

export const isTimerMode = (value: unknown): value is TimerMode => value === 'after' || value === 'during';
export const modeLabel = (mode: TimerMode) => mode === 'after' ? '활동 시작' : '활동 마무리';
export const durationLabel = (minutes: number, mode: TimerMode) => `${minutes}분 ${mode === 'after' ? '뒤에 시작' : '동안 하기'}`;

export const ACTIVITY_ACTIONS = {
  bath: { after: '목욕하러 가요.', during: '거품을 헹구고 몸을 닦아요.' },
  sleep: { after: '잠자러 가요.', during: '쉬던 자리에서 천천히 일어나요.' },
  meal: { after: '밥 먹으러 가요.', during: '식기를 정리해요.' },
  tidy: { after: '장난감을 정리해요.', during: '남은 장난감을 제자리에 놓아요.' },
  outside: { after: '외출 준비를 해요.', during: '챙긴 물건을 확인하고 신발을 신어요.' },
  video: { after: '영상을 끄고 쉬어요.', during: '화면을 끄고 눈을 쉬어요.' },
  custom: { after: '‘{activity}’ 시작해요.', during: '‘{activity}’ 여기까지 해요.' },
} as const;
const startAction = (promise: PromiseActivity) => Object.hasOwn(ACTIVITY_ACTIONS, promise.id) && promise.id !== 'custom' ? promise.activity : `‘${promise.name}’ 시작해요`;

export function activityReminder(promise: PromiseActivity, mode: TimerMode, characterName?: string) {
  if (characterName) return mode === 'after'
    ? `${characterName} 친구가 도착하면 ${startAction(promise)}.`
    : `${characterName} 친구와 ${promise.name} 함께 해요. 도착하면 마무리해요.`;
  return mode === 'after' ? `도착하면 ${startAction(promise)}` : `${promise.name}, 도착하면 마무리해요`;
}

export function activityCompletion(promise: PromiseActivity, mode: TimerMode) {
  const actions = Object.hasOwn(ACTIVITY_ACTIONS, promise.id) ? ACTIVITY_ACTIONS[promise.id as keyof typeof ACTIVITY_ACTIONS] : ACTIVITY_ACTIONS.custom;
  return actions[mode].replaceAll('{activity}', promise.name.trim() || '우리 약속');
}
