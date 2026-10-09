import Image from 'next/image';
import { assetPath } from '@/lib/assetPath';

export type StoryIconName = 'handshake' | 'bath' | 'sleep' | 'meal' | 'tidy' | 'outside' | 'video' | 'clock' | 'rabbit' | 'custom' | 'home' | 'flag' | 'star';

const vectorIcons: readonly StoryIconName[] = ['custom', 'home', 'flag', 'star'];
const promiseIcons: Readonly<Record<string, StoryIconName>> = {
  bath: 'bath', sleep: 'sleep', meal: 'meal', tidy: 'tidy', outside: 'outside', video: 'video',
};

/** Decorative artwork: its adjacent label carries the accessible name. */
export function StoryIcon({ name, size = 32, className = '', priority = false }: {
  name: StoryIconName; size?: number; className?: string; priority?: boolean;
}) {
  const extension = vectorIcons.includes(name) ? 'svg' : 'webp';
  return <Image className={`story-icon ${className}`} src={assetPath(`/images/story-v1/${name}.${extension}`)}
    width={size} height={size} alt="" aria-hidden="true" draggable={false} priority={priority} loading={priority ? undefined : 'eager'} />;
}

export function PromiseIcon({ id, size = 32, className = '' }: { id: string; size?: number; className?: string }) {
  const name = Object.hasOwn(promiseIcons, id) ? promiseIcons[id] : 'custom';
  return <StoryIcon name={name} size={size} className={className} />;
}
