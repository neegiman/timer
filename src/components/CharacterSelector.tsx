import { characters } from '@/lib/characters';
import { CharacterIcon } from './CharacterIcon';

export function CharacterSelector({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  return <fieldset className="selector-section character-section">
    <legend><span className="step-number">3</span> 누구와 함께 갈까요?<span className="step-english">친구 선택</span></legend>
    <div className="character-grid">
      {characters.map((character) => <button type="button" key={character.id}
        className={`choice character-choice ${selectedId === character.id ? 'selected' : ''}`}
        aria-pressed={selectedId === character.id} onClick={() => onSelect(character.id)}>
        <span aria-hidden="true"><CharacterIcon character={character} /></span><span>{character.name}</span>
      </button>)}
    </div>
  </fieldset>;
}
