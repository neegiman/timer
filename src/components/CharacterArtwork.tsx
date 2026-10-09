import { PaintedAnimalArtwork, PaintedAnimalThumbnail } from './PaintedAnimalArtwork';
import { isAnimalId } from '@/lib/animalActionPose';

function Wheel({ x, joint }: { x: number; joint: 'front' | 'back' | 'middle' }) {
  return <g transform={`translate(${x} 181)`}><circle r="16" fill="#566353" /><circle r="11" fill="#fff2d3" />
    <g data-joint={`wheel-${joint}`} stroke="#b0ad87" strokeWidth="2.5" strokeLinecap="round"><path d="M0-8v16m-8-8H8" /><circle r="3" fill="#d79154" stroke="none" /></g>
  </g>;
}

function VehicleArtwork({ id }: { id: string }) {
  if (id === 'rocket') return <g transform="rotate(20 80 120)" stroke="#b79272" strokeWidth="1.2" strokeLinejoin="round">
    <g transform="translate(80 179)"><g className="rocket-flame"><path d="M-13-5Q-17 12 0 25Q18 9 12-5" fill="#e9ac5a" stroke="none" /><path d="M-6-4Q-9 9 0 16Q10 7 6-4" fill="#fff0a3" stroke="none" /></g></g>
    <path d="M57 135Q30 145 41 177L62 167M103 135Q130 145 119 177L98 167" fill="#df845f" />
    <path d="M80 39Q44 69 53 145L63 173H97L107 145Q116 70 80 39Z" fill="#fff3db" />
    <path d="M80 39Q60 55 55 83Q80 69 105 83Q101 57 80 39Z" fill="#df845f" />
    <circle cx="80" cy="113" r="22" fill="#96bac0" /><circle cx="80" cy="113" r="16" fill="#d5e8df" stroke="none" /><path d="m70 105 7-4" stroke="#fffaf0" strokeWidth="4" strokeLinecap="round" />
    <path d="M69 125q11 8 22 0" fill="none" stroke="#61887f" strokeWidth="2" strokeLinecap="round" /><path d="M65 159H95" stroke="#d2b996" strokeWidth="4" />
  </g>;
  if (id === 'train') return <g stroke="#89937a" strokeWidth="1.2" strokeLinejoin="round">
    <path d="M18 166h127v18H18Z" fill="#cfa16a" /><path d="M26 130h64v41H26Z" fill="#7f9d77" />
    <path d="M95 104h36v65H95Z" fill="#df9b63" /><path d="M89 98q24-10 48 0v9H89Z" fill="#648763" />
    <rect x="103" y="114" width="20" height="25" rx="5" fill="#d4e6dc" /><path d="m106 119 9-2" stroke="#fffdf1" strokeWidth="2.5" />
    <path d="M40 129v-25h19v25m-23-25h27v-9H36Z" fill="#d7a05f" /><circle cx="86" cy="149" r="24" fill="#a6b898" />
    <ellipse cx="82" cy="146" rx="3" ry="5" fill="#53684f" stroke="none" /><ellipse cx="96" cy="146" rx="3" ry="5" fill="#53684f" stroke="none" /><path d="M82 157q7 6 14 0" stroke="#53684f" fill="none" strokeLinecap="round" />
    <Wheel x={38} joint="back" /><Wheel x={77} joint="middle" /><Wheel x={117} joint="front" />
  </g>;
  return <g stroke="#b48069" strokeWidth="1.2" strokeLinejoin="round">
    <path d="M26 145 42 115Q47 108 62 108h27q12 0 21 13l17 23q22 3 21 22l-3 13H15l-3-15q0-18 14-19Z" fill="#df8569" />
    <path d="m47 119-13 25h40v-26Zm35-1v26h34l-17-22q-5-5-17-4Z" fill="#d3e6de" /><path d="m50 125 15-2m24 3 8 2" stroke="#fffaf0" strokeWidth="3" strokeLinecap="round" />
    <path d="M17 154h20v8H15m113-8h17v8h-17" fill="#fff0b4" /><rect x="79" y="153" width="12" height="3" rx="1.5" fill="#bd6a54" stroke="none" />
    <path d="M115 168q7 5 14-1" fill="none" stroke="#a2634f" strokeWidth="2" strokeLinecap="round" />
    <Wheel x={43} joint="back" /><Wheel x={116} joint="front" />
  </g>;
}

/** Shared painted animal art and original vehicle art for selection and the journey. */
export function CharacterArtwork({ id, label }: { id: string; label?: string }) {
  if (isAnimalId(id)) return label ? <PaintedAnimalThumbnail id={id} label={label} /> : <PaintedAnimalArtwork id={id} />;
  return <svg className="character-artwork vehicle-sprite" data-character={id} viewBox="0 0 160 210"
    role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
    <VehicleArtwork id={id} />
  </svg>;
}
