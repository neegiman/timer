import { CharacterIcon } from '../CharacterIcon';
import { CharacterArtwork } from '../CharacterArtwork';
import type { Character } from '@/types/timer';

export function CharacterSprite({ character }: { character: Character }) {
  return character.type === 'illustration'
    ? <CharacterArtwork id={character.id} />
    : <CharacterIcon character={character} size={120} />;
}
