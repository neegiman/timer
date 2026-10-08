import { useId } from 'react';
import { animalPose, animalProfiles, type AnimalId, type PawName } from '@/lib/animalMotion';

function Paw({ id, name, far, fur }: { id: AnimalId; name: PawName; far?: boolean; fur: string }) {
  const profile = animalProfiles[id];
  const rig = profile.paws[name];
  if (!rig) return null;
  const resting = animalPose(id, 0, false).joints;
  const bird = id === 'chick';
  const width = bird ? 1.8 : id === 'bear' ? 7.5 : id === 'cat' ? 4 : 5;
  const fill = bird ? '#d7974c' : far ? profile.shade : fur;
  return <g transform={`translate(${rig.x} ${rig.y})`} data-paw={name}>
    <g data-animal-joint={`${name}Hip`} transform={`rotate(${resting[`${name}Hip`]})`}>
      <path d={`M0 -2V${rig.upper}`} stroke={fill} strokeWidth={width * 2} strokeLinecap="round" />
      <g transform={`translate(0 ${rig.upper})`}><g data-animal-joint={`${name}Knee`} transform={`rotate(${resting[`${name}Knee`]})`}>
        <path d={`M0 0V${rig.lower}`} stroke={fill} strokeWidth={width * (bird ? 1.6 : 1.7)} strokeLinecap="round" />
        <g transform={`translate(0 ${rig.lower})`}><g data-animal-joint={`${name}Ankle`} transform={`rotate(${resting[`${name}Ankle`]})`}>
          {bird ? <path data-paw-pad d="M-5 3H9M-2 2l10 2M1 1l8-1" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            : <><path data-paw-pad d={id === 'rabbit' && name.includes('Hind') ? 'M-7 0Q-6-7 2-6L17-3Q24 0 19 4H-7Z' : 'M-6 0Q-6-6 1-5L9-3Q15 0 10 4H-6Z'} fill={fill} />
              <path d="M5 1v2m4-2v2" stroke={profile.line} strokeWidth=".7" /></>}
        </g></g>
      </g></g>
    </g>
  </g>;
}

export function NaturalAnimalArtwork({ id }: { id: AnimalId }) {
  const prefix = useId().replace(/:/g, '');
  const profile = animalProfiles[id];
  const fur = `url(#${prefix}-natural-fur)`;
  const rabbit = id === 'rabbit', bear = id === 'bear', cat = id === 'cat', bird = id === 'chick';
  return <svg viewBox="0 0 160 210" className="natural-animal-artwork" data-animal={id} aria-hidden="true" focusable="false">
    <defs><linearGradient id={`${prefix}-natural-fur`} x2=".3" y2="1"><stop stopColor={profile.light} /><stop offset="1" stopColor={profile.fur} /></linearGradient></defs>
    <g data-animal-body>
      <g transform={`translate(${bird ? 61 : 30} ${bird ? 167 : 157})`}><g data-animal-joint="tail">
        {rabbit || bear ? <circle cx="-3" cy="-2" r={rabbit ? 9 : 5} fill={rabbit ? profile.light : profile.shade} />
          : cat ? <path d="M3 4C-17-5-22-35-9-49Q-5-54-3-47C-10-29-8-11 7-4" fill={profile.shade} />
          : bird ? <path d="m4 1-19-12 9 18 8 7" fill={profile.shade} />
          : <path d="M6 7C-18 7-24-6-19-23Q-17-27-15-21C-12-9-3-6 11-7" fill={profile.shade} />}
      </g></g>
      <Paw id={id} name="farHind" far fur={fur} /><Paw id={id} name="farFore" far fur={fur} />
      {bird ? <ellipse cx="81" cy="161" rx="35" ry="32" fill={fur} />
        : <path d={rabbit ? 'M28 160Q27 132 55 133Q74 136 90 147Q108 134 119 150Q132 169 114 184Q78 192 43 183Q26 178 28 160Z'
          : bear ? 'M27 152Q33 117 67 125Q91 124 109 141Q131 147 129 173Q115 184 93 183L42 185Q21 177 27 152Z'
          : 'M30 149Q49 136 72 144Q96 139 113 150Q131 161 119 179Q95 185 79 178Q59 181 35 176Q24 165 30 149Z'} fill={fur} />}
      {rabbit ? <ellipse cx="49" cy="162" rx="26" ry="24" fill={fur} stroke={profile.line} strokeWidth=".7" /> : null}
      {cat ? <g stroke={profile.shade} strokeWidth="3.5" strokeLinecap="round"><path d="m53 144 3 12m10-12 2 9m12-10 2 10m13-9 1 11M39 156l-2 9" /></g> : null}
      <g transform={`translate(${bird ? 90 : 111} ${bird ? 158 : 154})`}><g data-animal-joint="head"><g transform={`translate(${bird ? -90 : -111} ${bird ? -158 : -154})`}>
        {!bird ? <>
          <g transform={`translate(${rabbit ? 105 : 111} ${rabbit ? 113 : 124})`}><g data-animal-joint="earFar">
            {rabbit ? <><path d="M-5 5Q-18-22-10-43Q-6-55 1-43Q10-20 5 6Z" fill={profile.shade} /><path d="M-3-5Q-9-25-5-35Q0-24 1-6" fill="#e7b4a7" /></>
              : bear ? <circle cy="-1" r="8" fill={profile.shade} />
              : cat ? <path d="M-7 4-4-16 10 1Z" fill={profile.shade} />
              : <path d="M-8-1Q9-12 11 9L5 29Q-4 34-8 19Z" fill={profile.shade} />}
          </g></g>
          <path d={rabbit ? 'M98 113Q124 104 136 122L149 133Q154 145 138 151Q116 155 102 144Q88 130 98 113Z'
            : bear ? 'M103 126Q115 111 132 119Q145 125 145 138L154 141Q161 149 150 155Q130 163 115 154Q100 145 103 126Z'
            : cat ? 'M100 131Q112 114 133 126Q141 132 141 145L151 149Q154 153 144 157Q122 164 108 152Q96 145 100 131Z'
            : 'M102 132Q109 111 127 119Q145 122 143 143L154 146Q160 154 148 159L122 160Q102 154 102 132Z'} fill={fur} />
          <g transform={`translate(${rabbit ? 104 : 106} ${rabbit ? 116 : 128})`}><g data-animal-joint="earNear">
            {rabbit ? <><path d="M-8 7Q-29-14-28-39Q-27-50-20-42Q-1-22 3 4Z" fill={fur} stroke={profile.line} strokeWidth=".7" /><path d="M-7-5Q-23-24-22-35Q-12-25-2-7Z" fill="#efbdb0" /></>
              : bear ? <><circle cy="-5" r="9" fill={fur} /><circle cy="-5" r="5" fill={profile.shade} /></>
              : cat ? <><path d="M-8 7-11-19Q-10-24-6-19L12 1Z" fill={fur} /><path d="m-4 0-3-11 9 9Z" fill="#d7b1a0" /></>
              : <path d="M-6-5Q-17 0-15 16L-9 29Q-2 36 6 22L9 3Z" fill={profile.shade} stroke={profile.line} strokeWidth=".6" />}
          </g></g>
          <ellipse cx="129" cy={rabbit ? 132 : 142} rx={rabbit ? 4.3 : 3.8} ry={rabbit ? 5 : 4.4} fill="#49392b" />
          <circle cx="130" cy={rabbit ? 130 : 140} r="1.3" fill="#fff9e9" />
          <ellipse cx={rabbit ? 149 : 151} cy={rabbit ? 141 : 151} rx="3.1" ry="2.5" fill={rabbit || cat ? '#c79889' : '#574235'} />
          <path d={rabbit ? 'M143 146q3 2 6 0' : 'M139 155q5 2 10-1'} fill="none" stroke={profile.line} strokeWidth=".8" />
          {rabbit || cat ? <g stroke={profile.line} strokeWidth=".5" opacity=".6"><path d={rabbit ? 'M139 142h15m-16 2 15 3' : 'M136 150h17m-17 3 17 3'} /></g> : null}
        </> : <>
          <circle cx="102" cy="137" r="25" fill={fur} />
          <path d="M82 116q-1-9 5-3m2-3q0-8 5-2" fill="none" stroke={profile.fur} strokeWidth="5" strokeLinecap="round" />
          <circle cx="115" cy="134" r="4.8" fill="#55402b" /><circle cx="116" cy="132" r="1.6" fill="#fffbee" />
          <path d="m125 140 15 6-14 6Z" fill="#df9951" stroke="#be843e" strokeWidth=".7" />
        </>}
      </g></g></g>
      {bird ? <g transform="translate(67 155)"><g data-animal-joint="wing"><path d="M-8-5Q14-14 28 2Q23 19 7 18L8 13 2 15 1 10Q-10 9-8-5Z" fill={profile.light} stroke={profile.shade} strokeWidth=".6" /></g></g> : null}
      <Paw id={id} name="nearHind" fur={fur} /><Paw id={id} name="nearFore" fur={fur} />
    </g>
  </svg>;
}
