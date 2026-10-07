import { characters } from '@/lib/characters';
import { CharacterIcon } from './CharacterIcon';

export function CharacterSelector({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  return <fieldset className="selector-section character-section">
    <legend className="sr-only">친구 선택</legend>
    <div className="character-grid">
      {characters.map((character) => <button type="button" key={character.id}
        className={`choice character-choice ${selectedId === character.id ? 'selected' : ''}`}
        aria-pressed={selectedId === character.id} data-phase={selectedId === character.id ? 'READY' : undefined} onClick={() => onSelect(character.id)}>
        <span aria-hidden="true"><CharacterIcon character={character} size={80} /></span><span>{character.name}</span>
      </button>)}
    </div>
  </fieldset>;
}
