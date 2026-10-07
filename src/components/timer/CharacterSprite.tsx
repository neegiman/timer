import { CharacterIcon } from '../CharacterIcon';
import type { Character } from '@/types/timer';

/** Separate SVG parts give the rabbit readable feet, ears, gaze and a landing pose. */
function RabbitSprite() {
  return <svg className="rabbit-sprite" viewBox="0 0 120 140" aria-hidden="true">
    <g className="rabbit-arm back-arm"><ellipse cx="85" cy="98" rx="10" ry="20" fill="#e4ddd5" transform="rotate(-25 85 98)" /></g>
    <g className="rabbit-foot back-foot"><ellipse cx="79" cy="125" rx="18" ry="10" fill="#ded8d2" /></g>
    <ellipse cx="61" cy="98" rx="29" ry="32" fill="#f9f3e9" />
    <ellipse cx="62" cy="104" rx="20" ry="22" fill="#fffcf4" />
    <g className="rabbit-head">
      <g className="rabbit-ear ear-back"><ellipse cx="78" cy="36" rx="10" ry="30" fill="#ede4db" transform="rotate(12 78 36)" /><ellipse cx="78" cy="34" rx="5" ry="22" fill="#eaa4ab" transform="rotate(12 78 34)" /></g>
      <g className="rabbit-ear ear-front"><ellipse cx="46" cy="35" rx="10" ry="31" fill="#f9f3e9" transform="rotate(-8 46 35)" /><ellipse cx="46" cy="33" rx="5" ry="23" fill="#f0b3ba" transform="rotate(-8 46 33)" /></g>
      <ellipse cx="62" cy="68" rx="34" ry="29" fill="#f9f3e9" />
      <g className="rabbit-eyes" fill="#51453f"><ellipse cx="52" cy="64" rx="3.5" ry="5" /><ellipse cx="76" cy="64" rx="3.5" ry="5" /></g>
      <g fill="#f2b6b3" opacity=".7"><ellipse cx="42" cy="76" rx="8" ry="5" /><ellipse cx="85" cy="76" rx="8" ry="5" /></g>
      <path d="m59 73 8 0-4 5Z" fill="#c98188" /><path d="M63 78v3m-8-1q4 8 8 1 4 7 8-1" fill="none" stroke="#685349" strokeWidth="2.5" strokeLinecap="round" />
    </g>
    <g className="rabbit-arm front-arm"><ellipse cx="40" cy="99" rx="10" ry="20" fill="#f2ebe1" transform="rotate(20 40 99)" /></g>
    <g className="rabbit-foot front-foot"><ellipse cx="43" cy="127" rx="19" ry="10" fill="#f4e8df" /><ellipse cx="39" cy="128" rx="9" ry="4" fill="#efc7c4" /></g>
    <circle cx="91" cy="108" r="10" fill="#fffbf3" />
  </svg>;
}

export function CharacterSprite({ character }: { character: Character }) {
  return character.id === 'rabbit' && character.type === 'emoji' ? <RabbitSprite /> : <CharacterIcon character={character} size={120} />;
}
