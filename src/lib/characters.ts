import type { Character } from '@/types/timer';

export const characters: Character[] = [
  { id: 'rabbit', name: '토끼', icon: '🐰', type: 'emoji' },
  { id: 'bear', name: '곰', icon: '🐻', type: 'emoji' },
  { id: 'car', name: '자동차', icon: '🚗', type: 'emoji' },
  { id: 'train', name: '기차', icon: '🚂', type: 'emoji' },
  { id: 'rocket', name: '로켓', icon: '🚀', type: 'emoji' },
  { id: 'chick', name: '병아리', icon: '🐥', type: 'emoji' },
  { id: 'dog', name: '강아지', icon: '🐶', type: 'emoji' },
  { id: 'cat', name: '고양이', icon: '🐱', type: 'emoji' },
];

export function getCharacter(id: string): Character {
  return characters.find((character) => character.id === id) ?? characters[0];
}
