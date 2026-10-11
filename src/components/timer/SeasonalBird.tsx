import type { Season } from '@/lib/seasons';

const BIRDS = { spring: 'swallow', summer: 'egret', autumn: 'geese', winter: 'tit' } as const;

function Goose() {
  return <g stroke="#87745c" strokeWidth="1.2" strokeLinejoin="round">
    <path d="m83 48 17-6-8 11-15 1" fill="#8b7964" />
    <path className="bird-wing bird-wing-far" d="M60 45Q77 10 91 18L76 47Z" fill="#a49a83" />
    <path d="M35 45q8-2 13 2 17-15 34-2 10 16-11 18-19-1-25-10H34Z" fill="#b5ab95" />
    <path d="M44 50q-4-15-14-12-5 1-4 6 4 5 12 8" fill="#696357" />
    <path d="m25 41-9 4 10 2" fill="#c49a5e" />
    <path d="m29 43 8 4-5 3" fill="#f0e9d6" stroke="none" />
    <circle cx="29" cy="41" r="1.2" fill="#343b33" stroke="none" />
    <path className="bird-wing" d="M60 45Q66 15 90 15L81 38 73 52Z" fill="#8e816d" />
  </g>;
}

/** Small hand-drawn sky silhouettes; wing pivots share the journey's paused frame clock. */
export function SeasonalBird({ season }: { season: Season }) {
  return <svg data-visitor-art="birds" data-bird-kind={BIRDS[season]} viewBox="0 0 120 90">
    {season === 'spring' ? <g stroke="#586979" strokeWidth="1.1" strokeLinejoin="round">
      <path d="m76 46 30-9-12 15 12 10-32-8" fill="#546a7a" />
      <path className="bird-wing bird-wing-far" d="M60 45Q81 13 94 14L78 49Z" fill="#879da5" />
      <path d="M29 43q14-13 28 0 18-5 27 7-10 13-28 10-12-1-22-9Z" fill="#5f7b89" />
      <path d="M35 49q11 6 25 4l17 1q-13 10-25 5Z" fill="#f3e8d0" stroke="none" />
      <path d="m28 43-13 4 15 3" fill="#a79575" />
      <path d="M30 47q5 8 11 5l-2-7Z" fill="#c8957a" stroke="none" />
      <circle cx="35" cy="42" r="1.5" fill="#2f4146" stroke="none" />
      <path className="bird-wing" d="M60 45Q63 12 91 9L76 36 72 51Z" fill="#597585" />
    </g> : season === 'summer' ? <g stroke="#a9b9b4" strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round">
      <path d="m77 51 25 3m-24 1 23 7" fill="none" stroke="#9c987a" strokeWidth="2" />
      <path className="bird-wing bird-wing-far" d="M60 45Q74 12 91 20L76 51Z" fill="#e5eddf" />
      <path d="M45 45q14-9 31 0l14 10-16 8q-22 1-25-10-5-1-8-6-9-1-12-7-5-8 3-10 8-1 10 6l-7 1q-3-5-5-1 0 4 10 5Z" fill="#fcf8e9" />
      <path d="m29 32-19 5 20 1" fill="#d8b371" />
      <circle cx="33" cy="33" r="1.4" fill="#51615a" stroke="none" />
      <path className="bird-wing" d="M60 45Q54 13 83 9L84 28 78 46 70 54Z" fill="#f4f4e3" />
    </g> : season === 'autumn' ? <>
      <g transform="translate(46 0) scale(.53)"><Goose /></g>
      <g transform="translate(45 42) scale(.47)"><Goose /></g>
      <g transform="translate(0 14) scale(.72)"><Goose /></g>
    </> : <g stroke="#6f7c71" strokeWidth="1.1" strokeLinejoin="round">
      <path d="m74 47 28-4-10 14-19-2" fill="#7d96a0" />
      <path className="bird-wing bird-wing-far" d="M60 45Q79 17 89 27L74 52Z" fill="#a3b4b2" />
      <path d="M35 42q15-12 25 2 22-3 22 13-8 13-28 8-13-1-19-14Z" fill="#cabe77" />
      <path d="M29 44q1-13 14-12 13 0 14 14l-11 9-12-4Z" fill="#596760" />
      <path d="M32 43q9-8 15 1l-4 7-10-3Z" fill="#faf3db" stroke="none" />
      <path d="m30 43-12 4 13 3" fill="#a99c79" />
      <circle cx="36" cy="40" r="1.6" fill="#2d3f38" stroke="none" />
      <path className="bird-wing" d="M60 45Q59 17 83 18L84 36 74 56Z" fill="#8eaaa9" />
      <path d="m66 34 10-4" fill="none" stroke="#dfe7d5" strokeWidth="2" />
    </g>}
  </svg>;
}
