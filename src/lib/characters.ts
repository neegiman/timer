import type { Character } from '@/types/timer';

export const characters: Character[] = [
  { id: 'rabbit', name: '토끼', icon: '🐰', type: 'illustration' },
  { id: 'princess', name: '공주', icon: '👸', type: 'illustration' },
  { id: 'car', name: '자동차', icon: '🚗', type: 'illustration' },
  { id: 'train', name: '기차', icon: '🚂', type: 'illustration' },
  { id: 'rocket', name: '로켓', icon: '🚀', type: 'illustration' },
  { id: 'chick', name: '병아리', icon: '🐥', type: 'illustration' },
  { id: 'dog', name: '강아지', icon: '🐶', type: 'illustration' },
  { id: 'cat', name: '고양이', icon: '🐱', type: 'illustration' },
];

export function getCharacter(id: string): Character {
  return characters.find((character) => character.id === id) ?? characters[0];
}
