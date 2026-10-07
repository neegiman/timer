import { useId } from 'react';
import { getCharacterPose } from '@/lib/characterPose';

type Animal = 'rabbit' | 'bear' | 'dog' | 'cat' | 'chick';
const colors = {
  rabbit: { light: '#fff9ee', fur: '#f1e2cc', back: '#e4d2bb', belly: '#fffaf2', line: '#bba181', paw: '#f0c4bc' },
  bear: { light: '#d2a777', fur: '#b98555', back: '#9f704a', belly: '#f0d2a5', line: '#8a6247', paw: '#dba783' },
  dog: { light: '#f5d6a7', fur: '#dfb37a', back: '#c19460', belly: '#fff1d9', line: '#aa8158', paw: '#dfbba0' },
  cat: { light: '#d6ded5', fur: '#acb9ac', back: '#8c9e90', belly: '#f6f0df', line: '#7e9585', paw: '#e6bdb5' },
  chick: { light: '#fff0a5', fur: '#edc663', back: '#dba948', belly: '#fff1bd', line: '#c19746', paw: '#e79a57' },
} as const;
const resting = getCharacterPose('idle', 0, 780);

function Leg({ side, animal, fill }: { side: 'front' | 'back'; animal: Animal; fill: string }) {
  const palette = colors[animal];
  const bird = animal === 'chick';
  const legFill = bird ? '#e8a65d' : fill;
  return <g transform={`translate(${side === 'front' ? 72 : 86} 161)`}>
    <g data-joint={`${side}-thigh`} transform={`rotate(${resting[`${side}-thigh`]})`}>
      <path d="M-9-3C-14 6-12 18-6 24Q1 29 8 23C13 16 11 4 8-3Z" fill={legFill} />
      <g transform="translate(0 21)"><g data-joint={`${side}-shin`} transform={`rotate(${resting[`${side}-shin`]})`}>
        <path d="M-7-5Q-12 4-8 17Q-7 24 0 25Q8 24 8 18L8-4Z" fill={legFill} />
        <g transform="translate(0 22)"><g data-joint={`${side}-foot`} transform={`rotate(${resting[`${side}-foot`]})`}>
          {bird ? <path d="M-5-3Q0-7 5-3L15 0Q20 2 15 5L-8 5Q-13 2-5-3Z" fill="#e59a51" /> : <>
            <path d="M-9-5Q-6-11 1-7L13-4Q23 0 17 6Q12 9-7 7Q-16 6-14 0Z" fill={fill} />
            <path d="M8 1v4m5-3v3" fill="none" stroke={palette.line} strokeWidth=".9" />
            <ellipse cx="1" cy="4" rx="5" ry="2" fill={palette.paw} opacity=".55" stroke="none" />
          </>}
        </g></g>
      </g></g>
    </g>
  </g>;
}

function Arm({ side, animal, fill }: { side: 'front' | 'back'; animal: Animal; fill: string }) {
  return <g transform={`translate(${side === 'front' ? 61 : 103} 131)`}>
    <g data-joint={`${side}-arm`} transform={`rotate(${resting[`${side}-arm`]})`}>
      <path d="M-6-4Q-11 1-9 10L-6 20Q1 25 7 18L7 1Q4-6-6-4Z" fill={fill} />
      <g transform="translate(0 18)"><g data-joint={`${side}-elbow`} transform="rotate(-16)">
        {animal === 'chick' ? <path d="M-7-3Q-15 10-3 20L1 16L5 20L8 15L12 15Q15 5 6-4Z" fill={fill} /> : <>
          <path d="M-7-4Q-10 4-8 10Q-12 14-7 18Q-3 22 1 18Q6 21 8 17Q13 16 10 9L7-4Z" fill={fill} />
          <path d="M-3 13v3m5-2v3" stroke={colors[animal].line} strokeWidth=".9" fill="none" />
        </>}
      </g></g>
    </g>
  </g>;
}

function Ears({ animal, fill }: { animal: Animal; fill: string }) {
  const palette = colors[animal];
  if (animal === 'rabbit') return <>
    <g transform="translate(91 80)"><g data-joint="ear-back">
      <path d="M-9 8C-18-10-14-46-9-65Q-6-77 1-67C16-44 16-9 9 9Z" fill={palette.back} />
      <path d="M-5-4C-11-24-7-46-5-52Q-3-59 1-49C8-27 8-15 5-3Z" fill="#eaa8aa" stroke="none" />
    </g></g>
    <g transform="translate(62 83)"><g data-joint="ear-front">
      <path d="M-8 9C-22-3-38-31-39-52Q-40-63-30-57C-8-45 8-15 8 5Z" fill={fill} />
      <path d="M-9-4C-20-17-29-36-30-44Q-30-50-25-44C-11-31-3-16 1-5Z" fill="#efb6b3" stroke="none" />
    </g></g>
  </>;
  if (animal === 'bear') return <><g transform="translate(51 79)"><g data-joint="ear-front"><circle cy="-8" r="15" fill={fill} /><circle cy="-8" r="8" fill={palette.belly} stroke="none" /></g></g><g transform="translate(111 79)"><g data-joint="ear-back"><circle cy="-8" r="14" fill={palette.back} /><circle cy="-8" r="7" fill={palette.belly} stroke="none" /></g></g></>;
  if (animal === 'dog') return <><g transform="translate(111 83)"><g data-joint="ear-back"><path d="M-7-8Q9-15 13 7L10 29Q4 43-4 29L-10 6Z" fill={palette.back} /></g></g><g transform="translate(52 80)"><g data-joint="ear-front"><path d="M-5-10Q-19-8-20 11L-16 31Q-5 47 3 29L7 4Z" fill={palette.back} /></g></g></>;
  if (animal === 'cat') return <><g transform="translate(110 83)"><g data-joint="ear-back"><path d="M-16 0L6-29Q10-33 12-24L15 8Z" fill={palette.back} /><path d="M-5-2 7-18 9 2Z" fill="#ddb2b1" stroke="none" /></g></g><g transform="translate(54 81)"><g data-joint="ear-front"><path d="M-14 6L-17-27Q-17-34-11-29L13-7Z" fill={fill} /><path d="m-9-4-3-16 13 14Z" fill="#e7c1bb" stroke="none" /></g></g></>;
  return <path d="M75 73Q60 49 77 62Q80 42 86 63Q101 46 95 75" fill={fill} />;
}

function AnimalArtwork({ animal, prefix }: { animal: Animal; prefix: string }) {
  const palette = colors[animal];
  const fill = `url(#${prefix}-fur)`;
  return <g className="animal-artwork" stroke={palette.line} strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round">
    <g transform="translate(55 158)"><g data-joint="tail">
      {animal === 'cat' ? <path d="M7 6Q-20 22-26 0Q-33-26-21-30Q-13-32-16-21Q-23 0 0-4Z" fill={palette.back} /> : animal === 'dog' ? <path d="M3 4Q-21 3-24-21Q-23-27-18-20Q-9-8 4-10Z" fill={palette.back} /> : <circle cx="-3" cy="1" r={animal === 'rabbit' ? 10 : 7} fill={palette.light} />}
    </g></g>
    <Arm side="back" animal={animal} fill={palette.back} />
    <Leg side="back" animal={animal} fill={palette.back} />
    <path data-body d="M63 126Q79 115 98 127Q116 147 105 171Q96 185 75 180Q51 177 52 158Q50 138 63 126Z" fill={fill} />
    <path d="M73 136Q88 126 98 143Q108 161 95 173Q80 180 67 168Q59 149 73 136Z" fill={palette.belly} stroke="none" />
    <Leg side="front" animal={animal} fill={fill} />
    <g transform="translate(82 124)"><g data-joint="head"><g transform="translate(-82 -124)">
      <Ears animal={animal} fill={fill} />
      <path d="M52 84Q67 69 91 75Q116 78 120 101Q135 109 125 124Q114 139 82 139Q51 137 43 116Q38 98 52 84Z" fill={fill} />
      {animal !== 'chick' ? <ellipse cx="99" cy="120" rx="22" ry="16" fill={palette.belly} stroke="none" /> : null}
      {animal === 'cat' ? <g stroke={palette.back} strokeWidth="3" fill="none"><path d="m70 78 3 8m10-10v9m10-7-3 8" /></g> : null}
      <g className="character-eyes" stroke="none">
        <ellipse cx="74" cy="105" rx="7.5" ry="10" fill="#5a3b28" /><ellipse cx="109" cy="102" rx="6" ry="9" fill="#5a3b28" />
        <ellipse cx="75" cy="108" rx="4.5" ry="6" fill="#332a22" /><ellipse cx="110" cy="105" rx="3.5" ry="5" fill="#332a22" />
        <ellipse cx="76" cy="101" rx="2.6" ry="3.2" fill="#fffdf6" /><ellipse cx="110" cy="98" rx="2.2" ry="2.7" fill="#fffdf6" />
      </g>
      <path d="M66 91q7-5 13-2m23-3q5-3 10 0" fill="none" stroke="#987756" strokeWidth="1.8" />
      <g fill="#e7a49c" opacity=".6" stroke="none"><ellipse cx="59" cy="118" rx="9" ry="5.5" /><ellipse cx="119" cy="115" rx="6" ry="4.5" /></g>
      {animal === 'chick' ? <path d="M89 114Q99 110 111 118L98 128Q91 126 89 114Z" fill="#df8d45" stroke="#c4833e" /> : <>
        <path d="M90 116Q98 111 105 115Q105 120 98 122Q92 121 90 116Z" fill={animal === 'dog' || animal === 'bear' ? '#624732' : '#e79e9b'} stroke="none" />
        <path d="M98 122v3m-10-1q5 8 10 1 5 6 10-1" fill="none" stroke="#84604c" strokeWidth="1.5" />
        <path d="M92 129q6 10 12-1" fill="#da9990" stroke="none" />
      </>}
      {animal === 'cat' ? <g stroke="#8a9589" fill="none" strokeWidth="1"><path d="m57 119-15-3m15 9-15 3m70-9 14-4m-14 10 14 3" /></g> : null}
    </g></g></g>
    <Arm side="front" animal={animal} fill={fill} />
  </g>;
}

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

/** Shared original vector artwork for selection AND the articulated journey. */
export function CharacterArtwork({ id, label }: { id: string; label?: string }) {
  const prefix = useId().replace(/:/g, '');
  const animal = Object.hasOwn(colors, id) ? id as Animal : null;
  const palette = animal ? colors[animal] : colors.rabbit;
  return <svg className={`character-artwork ${animal ? 'animal-sprite' : 'vehicle-sprite'}`} data-character={id} viewBox="0 0 160 210"
    role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
    {animal ? <defs><linearGradient id={`${prefix}-fur`} x1="0" y1="0" x2=".7" y2="1"><stop stopColor={palette.light} /><stop offset="1" stopColor={palette.fur} /></linearGradient></defs> : null}
    {animal ? <AnimalArtwork animal={animal} prefix={prefix} /> : <VehicleArtwork id={id} />}
  </svg>;
}
