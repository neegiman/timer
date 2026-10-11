import { memo } from 'react';
import type { Season } from '@/lib/seasons';
import { SeasonalBird } from './SeasonalBird';
import { UfoVisitor } from './RocketSky';

/** Small code-native illustrations; the shared journey frame clock animates their wrappers. */
export const SeasonalAtmosphere = memo(function SeasonalAtmosphere({ season, space = false }: { season: Season; space?: boolean }) {
  return <div className="seasonal-atmosphere" aria-hidden="true">
    <div className="scenery-visitor" data-scenery-visitor data-event="none">
      {space ? <UfoVisitor /> : null}
      <svg data-visitor-art="butterfly" viewBox="0 0 120 90">
        <g className="visitor-wings"><path d="M60 47C25 9 8 29 22 49c-17 22 10 30 38 2M60 47c35-38 52-18 38 2 17 22-10 30-38 2" fill="#ecb6c2" stroke="#ba899d" strokeWidth="2" /><path d="M51 39 33 31m36 8 18-8" stroke="#fff1ce" strokeWidth="4" strokeLinecap="round" /></g>
        <path d="M59 34v26m0-26-7-9m7 9 7-9" fill="none" stroke="#796d76" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <svg data-visitor-art="dragonfly" viewBox="0 0 120 90">
        <g className="visitor-wings" fill="#d5eae3" stroke="#89b8a7" strokeWidth="2"><ellipse cx="38" cy="36" rx="24" ry="8" transform="rotate(20 38 36)" /><ellipse cx="82" cy="36" rx="24" ry="8" transform="rotate(-20 82 36)" /><ellipse cx="39" cy="51" rx="22" ry="7" /><ellipse cx="81" cy="51" rx="22" ry="7" /></g>
        <path d="M60 29v42" stroke="#b58c58" strokeWidth="5" strokeLinecap="round" /><circle cx="60" cy="28" r="7" fill="#93bda7" /><circle cx="57" cy="26" r="2" fill="#526b65" />
      </svg>
      <SeasonalBird season={season} />
      <svg data-visitor-art="leaves" viewBox="0 0 120 90" fill="#d6935c" stroke="#a87d55" strokeWidth="1.5">
        <path d="m27 25 5-15 8 11 14-4-5 15 7 8-18 4-6 10-3-13-14-5 12-5Z" /><path d="M77 58q-14-23 15-28 6 24-15 28Z" /><path d="m30 41 6-18m41 35 12-23" fill="none" />
      </svg>
      <svg data-visitor-art="snow" viewBox="0 0 120 90" fill="none" stroke="#f3f7f7" strokeWidth="2.5" strokeLinecap="round">
        <path d="M32 15v36M16 24l32 18M16 42l32-18M82 43v27M70 50l24 14M70 64l24-14" /><circle cx="64" cy="18" r="2" fill="#fff" /><circle cx="17" cy="65" r="3" fill="#fff" />
      </svg>
      <svg data-visitor-art="fireflies" viewBox="0 0 120 90">
        {[[22, 44], [49, 24], [72, 53], [94, 30]].map(([x, y]) => <g key={x}><circle cx={x} cy={y} r="9" fill="#f9e6a0" opacity=".12" /><circle cx={x} cy={y} r="3" fill="#f9e6a0" /><path d={`m${x - 5} ${y - 5} 4 2m3 0 4-2`} stroke="#c6d9b6" strokeWidth="2" strokeLinecap="round" /></g>)}
      </svg>
      <svg data-visitor-art="shooting-star" viewBox="0 0 120 90">
        <defs><linearGradient id="meteor-trail" x1="23" y1="61" x2="109" y2="10" gradientUnits="userSpaceOnUse"><stop stopColor="#fff1c7" /><stop offset="1" stopColor="#dbeaff" stopOpacity="0" /></linearGradient></defs>
        <path d="M23 61 109 10 43 53Z" fill="url(#meteor-trail)" opacity=".6" />
        <path d="m23 61 86-51m-81 55 61-35" fill="none" stroke="url(#meteor-trail)" strokeWidth="1.8" strokeLinecap="round" />
        <path d="m23 53 2 6 7 2-7 2-2 7-2-7-7-2 7-2Z" fill="#fff8df" /><circle cx="23" cy="61" r="2" fill="#fffdf3" />
      </svg>
    </div>
    {Array.from({ length: 6 }, (_, index) => <span key={index} className="scenery-particle" data-scenery-particle>
      <svg viewBox="0 0 24 24">
        {space ? <path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z" fill={index % 2 ? '#e3d7f0' : '#ffedbb'} />
          : season === 'spring' ? <path d="M5 5C15 0 23 8 17 15S2 15 5 5Z" fill="#edb7c5" />
          : season === 'summer' ? <g stroke="var(--seed-color, #fff8dd)" strokeWidth="1.5" strokeLinecap="round"><path d="m12 9-4 12m4-12-6-4m6 4V2m0 7 7-5" /><circle cx="12" cy="9" r="2" fill="var(--seed-color, #fff8dd)" /></g>
          : season === 'autumn' ? <g><path d="M4 4q16-2 15 13Q2 22 4 4Z" fill={index % 2 ? '#d89a59' : '#bc785a'} /><path d="m6 6 11 12" stroke="#e8c28a" strokeWidth="1" /></g>
          : <g fill="none" stroke="#f5f9fa" strokeWidth="1.7" strokeLinecap="round"><path d="M12 3v18M4 7l16 10M4 17 20 7" /></g>}
      </svg>
    </span>)}
  </div>;
});
