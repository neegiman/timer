import type { JourneyStage } from '@/types/animation';
import type { PromiseActivity, TimerMode } from '@/types/timer';
import { noticeInterval, type journeyNotice } from './journeyNotice';

type MessageSet = Record<JourneyStage, readonly string[]>;
type ActivityMessages = Record<TimerMode, MessageSet>;

/** 6 activities × 14 messages + 16 custom-activity messages = 100 authored lines. */
export const ACTIVITY_MESSAGE_BANK = {
  bath: {
    after: {
      beginning: ['조금 뒤에 씻기를 시작해요. 🛁', '목욕할 시간이 천천히 다가와요. 🫧'],
      halfway: ['씻기 전 기다림이 절반 지났어요! 🌟', '반만 더 기다리면 보송보송 목욕 시간! 🛁'],
      near: ['곧 씻기를 시작해요. 마음을 준비해요. 🫧', '목욕할 시간이 가까워졌어요! 🛁'],
      arrived: ['도착! 이제 씻기를 시작해요. 🛁'],
    },
    during: {
      beginning: ['보글보글, 편안하게 씻어 볼까요? 🫧', '몸을 깨끗하게 씻는 시간이에요. 🛁'],
      halfway: ['씻는 시간이 절반 지났어요! 🌟', '보송보송해지고 있어요. 잘하고 있어요! 🫧'],
      near: ['씻기를 천천히 마무리할 준비를 해요. 🛁', '거품과 인사하고 마무리해 볼까요? 🫧'],
      arrived: ['도착! 씻기를 마무리해요. 참 잘했어요! 🌟'],
    },
  },
  sleep: {
    after: {
      beginning: ['조금 뒤에 잠잘 준비를 시작해요. 🌙', '포근한 잠자리 시간이 다가와요. 🛏️'],
      halfway: ['잠자리 전 기다림이 절반 지났어요. 🌟', '반만 더 기다리면 포근한 이불 시간. 🌙'],
      near: ['곧 잠자리로 가요. 마음도 편안하게. 🛏️', '잠잘 시간이 가까워졌어요. 좋은 꿈을 준비해요. 🌙'],
      arrived: ['도착! 이제 잠자러 가요. 좋은 꿈 꿔요. 🌙'],
    },
    during: {
      beginning: ['몸도 마음도 편안하게 쉬어요. 🌙', '포근하게 쉬는 시간이에요. 🛏️'],
      halfway: ['쉬는 시간이 절반 지났어요. 🌟', '남은 시간도 편안하게 쉬어요. 🌙'],
      near: ['쉬는 시간을 조용히 마무리할 준비를 해요. 🛏️', '편안한 쉼이 곧 끝나요. 천천히 준비해요. 🌙'],
      arrived: ['도착! 쉬는 시간이 끝났어요. 편안히 쉬었어요. 🌙'],
    },
  },
  meal: {
    after: {
      beginning: ['조금 뒤에 밥 먹기를 시작해요. 🍚', '맛있는 식사 시간이 천천히 다가와요. 🥄'],
      halfway: ['식사 전 기다림이 절반 지났어요! 🌟', '반만 더 기다리면 식탁에서 만나요. 🍚'],
      near: ['곧 밥 먹을 시간이에요. 식탁으로 갈 준비! 🥄', '식사 시간이 가까워졌어요. 함께 먹어요. 🍚'],
      arrived: ['도착! 이제 밥 먹기를 시작해요. 🍚'],
    },
    during: {
      beginning: ['냠냠, 편안한 속도로 먹어요. 🍚', '음식의 맛을 느끼며 천천히 먹어요. 🥄'],
      halfway: ['식사 시간이 절반 지났어요! 🌟', '남은 시간도 꼭꼭 씹으며 먹어요. 🍚'],
      near: ['먹던 한 입을 천천히 마무리해요. 🥄', '식사를 마무리할 시간이 다가와요. 🍚'],
      arrived: ['도착! 식사를 마무리해요. 함께 먹어 즐거웠어요! 🌟'],
    },
  },
  tidy: {
    after: {
      beginning: ['조금 뒤에 장난감 정리를 시작해요. 🧸', '장난감을 집에 보내 줄 시간이 다가와요. 🧺'],
      halfway: ['정리 전 기다림이 절반 지났어요! 🌟', '반만 더 기다리면 장난감 정리 시간! 🧸'],
      near: ['곧 정리를 시작해요. 장난감 집은 어디일까요? 🧺', '장난감 정리 시간이 가까워졌어요! 🧸'],
      arrived: ['도착! 이제 장난감 정리를 시작해요. 🧺'],
    },
    during: {
      beginning: ['장난감을 하나씩 집에 보내 줘요. 🧸', '차곡차곡, 함께 정리해 볼까요? 🧺'],
      halfway: ['정리 시간이 절반 지났어요! 🌟', '장난감들이 집을 찾고 있어요. 잘하고 있어요! 🧸'],
      near: ['정리를 천천히 마무리할 준비를 해요. 🧺', '지금 손에 든 장난감부터 마무리해요. 🧸'],
      arrived: ['도착! 정리를 마무리해요. 함께해서 멋져요! 🌟'],
    },
  },
  outside: {
    after: {
      beginning: ['조금 뒤에 외출 준비를 시작해요. 👟', '바깥으로 나갈 준비 시간이 다가와요. 🌿'],
      halfway: ['외출 준비 전 기다림이 절반 지났어요! 🌟', '반만 더 기다리면 외출 준비 시간! 👟'],
      near: ['곧 외출 준비를 시작해요. 마음도 준비! 🌿', '바깥으로 나갈 준비 시간이 가까워졌어요. 👟'],
      arrived: ['도착! 이제 외출 준비를 시작해요. 👟'],
    },
    during: {
      beginning: ['옷과 신발을 차근차근 준비해요. 👟', '함께 외출할 준비를 해 볼까요? 🌿'],
      halfway: ['외출 준비 시간이 절반 지났어요! 🌟', '하나씩 준비하고 있어요. 잘하고 있어요! 👟'],
      near: ['외출 준비를 천천히 마무리해요. 🌿', '챙길 것을 함께 살피며 마무리해요. 👟'],
      arrived: ['도착! 외출 준비를 마무리해요. 잘했어요! 🌟'],
    },
  },
  video: {
    after: {
      beginning: ['조금 뒤에 영상을 끄고 쉬어요. 📺', '영상과 인사할 시간이 천천히 다가와요. 🌿'],
      halfway: ['영상을 끄기 전 기다림이 절반 지났어요. 🌟', '반만 더 기다리면 화면도 쉬는 시간. 📺'],
      near: ['곧 영상을 끄고 쉬어요. 마음을 준비해요. 🌿', '영상과 인사할 시간이 가까워졌어요. 📺'],
      arrived: ['도착! 이제 영상을 끄고 쉬어요. 🌿'],
    },
    during: {
      beginning: ['약속한 시간 동안 영상을 봐요. 📺', '영상을 보고 나면 함께 쉬기로 해요. 🌿'],
      halfway: ['영상 보는 시간이 절반 지났어요. 🌟', '남은 영상 시간도 편안하게 보내요. 📺'],
      near: ['영상을 마무리하고 쉴 준비를 해요. 🌿', '영상과 인사하며 마무리할 시간이 다가와요. 📺'],
      arrived: ['도착! 영상을 끄고 쉬어요. 약속을 기억했어요! 🌟'],
    },
  },
  custom: {
    after: {
      beginning: ['조금 뒤에 ‘{activity}’ 시작해요. 🌈', '‘{activity}’ 할 시간이 다가와요. 🌿', '‘{activity}’ 시작 전, 편안하게 기다려요. 🌼'],
      halfway: ['기다림이 절반 지났어요! 곧 ‘{activity}’ 해요. 🌟', '반만 더 기다리면 ‘{activity}’ 시작! 🌈'],
      near: ['곧 ‘{activity}’ 시작해요. 마음을 준비해요. 🌿', '‘{activity}’ 시작할 시간이 가까워졌어요! 🌼'],
      arrived: ['도착! 이제 ‘{activity}’ 시작해요. 🎉'],
    },
    during: {
      beginning: ['지금은 ‘{activity}’ 하는 시간이에요. 🌈', '‘{activity}’ 차근차근 함께 해요. 🌿', '편안한 속도로 ‘{activity}’ 해 볼까요? 🌼'],
      halfway: ['‘{activity}’ 시간이 절반 지났어요! 🌟', '‘{activity}’ 잘하고 있어요. 반이나 왔어요! 🌈'],
      near: ['‘{activity}’ 천천히 마무리할 준비를 해요. 🌿', '곧 ‘{activity}’ 마무리할 시간이에요. 🌼'],
      arrived: ['도착! ‘{activity}’ 마무리해요. 참 잘했어요! 🎉'],
    },
  },
} as const satisfies Record<string, ActivityMessages>;

export type MessageActivity = keyof typeof ACTIVITY_MESSAGE_BANK;
export function messageActivity(promiseId: string): MessageActivity {
  return Object.hasOwn(ACTIVITY_MESSAGE_BANK, promiseId) ? promiseId as MessageActivity : 'custom';
}

const substitute = (text: string, promise: PromiseActivity) => text.replaceAll('{activity}', promise.name.trim() || '우리 약속');

export function activityMessageOptions(promise: PromiseActivity, mode: TimerMode, stage: JourneyStage) {
  return ACTIVITY_MESSAGE_BANK[messageActivity(promise.id)][mode][stage].map((text) => substitute(text, promise));
}

function seedOffset(seed: string) {
  let hash = 2166136261;
  for (const character of seed) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

/** Session seed + active-time notice slot: no render-time randomness or new storage. */
export function selectActivityMessage(promise: PromiseActivity, mode: TimerMode, notice: ReturnType<typeof journeyNotice>, totalDuration: number, sessionId: string) {
  const category = messageActivity(promise.id);
  const options = activityMessageOptions(promise, mode, notice.stage);
  const interval = noticeInterval(totalDuration);
  const slot = notice.key.startsWith('repeat-') ? Math.floor(Number(notice.key.slice(7)) / interval)
    : notice.key === 'last-seconds' ? Math.ceil(totalDuration / interval) + 1 : 0;
  const index = (seedOffset(`${sessionId}:${category}:${mode}:${notice.stage}`) + slot) % options.length;
  return { id: `${category}-${mode}-${notice.stage}-${index + 1}`, text: options[index] };
}
