import Image from 'next/image';
import { assetPath } from '@/lib/assetPath';
import type { Character } from '@/types/timer';

export function CharacterIcon({ character, size = 44 }: { character: Character; size?: number }) {
  if (character.type === 'image' && character.src) {
    return <Image src={assetPath(character.src)} width={size} height={size} alt={character.name} draggable={false} />;
  }
  return <span className="character-emoji" role="img" aria-label={character.name}>{character.icon}</span>;
}
