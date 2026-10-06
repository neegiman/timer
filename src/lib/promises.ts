import type { PromiseActivity } from '@/types/timer';

export const promises: PromiseActivity[] = [
  { id: 'bath', icon: '🛁', name: '씻기', activity: '목욕하러 가요' },
  { id: 'sleep', icon: '🛏️', name: '잠자기', activity: '잠자러 가요' },
  { id: 'meal', icon: '🍚', name: '밥 먹기', activity: '밥 먹으러 가요' },
  { id: 'tidy', icon: '🧸', name: '장난감 정리', activity: '장난감을 정리해요' },
  { id: 'outside', icon: '🏫', name: '외출 준비', activity: '외출 준비를 해요' },
  { id: 'video', icon: '📺', name: '영상 그만 보기', activity: '영상을 끄고 쉬어요' },
];

export const defaultPromise = promises[0];

export function completionMessage(promise: PromiseActivity): string {
  if (promise.id === 'bath') return '이제 목욕하러 갈 시간이에요!';
  if (promise.id === 'sleep') return '이제 잠자러 갈 시간이에요!';
  if (promise.id === 'meal') return '이제 밥 먹으러 갈 시간이에요!';
  return `이제 ${promise.activity}!`;
}

export function isPromise(value: unknown): value is PromiseActivity {
  if (!value || typeof value !== 'object') return false;
  const p = value as Partial<PromiseActivity>;
  return typeof p.id === 'string' && typeof p.icon === 'string' &&
    typeof p.name === 'string' && p.name.length <= 50 &&
    typeof p.activity === 'string' && p.activity.length <= 70;
}
