import { memo } from 'react';

/** Soft planets sit behind the foreground trees; their drift shares the timer clock. */
export const RocketSky = memo(function RocketSky() {
  return <div className="rocket-sky" data-rocket-sky aria-hidden="true">
    <svg className="space-constellation" viewBox="0 0 600 260" preserveAspectRatio="none">
      <g fill="#fdf6d9"><path d="m56 25 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" /><path d="m318 87 2 4 4 2-4 2-2 4-2-4-4-2 4-2Z" /><path d="m520 39 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" /></g>
      <g fill="#f0e4ff"><circle cx="126" cy="39" r="2" /><circle cx="240" cy="58" r="1.6" /><circle cx="405" cy="21" r="2" /><circle cx="552" cy="131" r="2" /><circle cx="177" cy="121" r="1.4" /></g>
    </svg>
    <div className="space-planet space-planet-ringed" data-space-planet>
      <svg viewBox="0 0 160 120">
        <defs><radialGradient id="ringed-planet"><stop stopColor="#ffedcb" /><stop offset=".7" stopColor="#e9ba96" /><stop offset="1" stopColor="#cf97a2" /></radialGradient></defs>
        <ellipse cx="80" cy="65" rx="73" ry="17" transform="rotate(-20 80 65)" fill="none" stroke="#d6b8d0" strokeWidth="10" opacity=".8" />
        <circle cx="80" cy="60" r="38" fill="url(#ringed-planet)" />
        <path d="M47 43q29 13 65 5M44 57q35 14 73 4M48 76q29 8 62 0" fill="none" stroke="#fff0d2" strokeWidth="5" opacity=".35" />
        <path d="M12 91q22 8 78-11t58-38" fill="none" stroke="#e9cfe1" strokeWidth="7" strokeLinecap="round" />
      </svg>
    </div>
    <div className="space-planet space-planet-blue" data-space-planet>
      <svg viewBox="0 0 100 100">
        <defs><radialGradient id="blue-planet" cx="35%" cy="30%"><stop stopColor="#d5f1e4" /><stop offset="1" stopColor="#7babc9" /></radialGradient></defs>
        <circle cx="50" cy="50" r="39" fill="url(#blue-planet)" />
        <path d="M21 28q12 3 16 12l-3 11 13 6-4 13-14 8M61 18l-5 16 18 9 5 20 9-10" fill="#a5c6b6" opacity=".7" />
        <ellipse cx="38" cy="26" rx="13" ry="6" fill="#e2f6e9" opacity=".35" transform="rotate(-28 38 26)" />
      </svg>
    </div>
    <div className="space-planet space-planet-small" data-space-planet>
      <svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="24" fill="#c1b1da" /><circle cx="23" cy="22" r="6" fill="#a293c6" /><circle cx="36" cy="35" r="8" fill="#aa9bce" /><circle cx="20" cy="37" r="3" fill="#a293c6" /></svg>
    </div>
  </div>;
});

/** A small pixel saucer echoes the rocket's game artwork without extra image downloads. */
export function UfoVisitor() {
  return <svg data-visitor-art="ufo" viewBox="0 0 120 90" shapeRendering="crispEdges">
    <path className="ufo-beam" d="m43 59-15 27h64L77 59Z" fill="#e7f4b6" opacity=".2" />
    <path d="M38 41V29h6V23h32v6h6v12" fill="#a9d8d3" />
    <path d="M44 38V30h6v-2h20v2h6v8" fill="#d3efe5" />
    <path d="M52 38V32h16v6" fill="#93b9a3" /><path d="M54 34h3v3h-3m9-3h3v3h-3" fill="#586d73" />
    <path d="M26 41h68v6h12v6H14v-6h12Z" fill="#b9acd2" />
    <path d="M14 53h92v6H94v6H26v-6H14Z" fill="#7f88b2" />
    <path d="M32 41h56v6H32Z" fill="#d9d0e3" />
    <g className="ufo-lights" fill="#f4e7ad"><path d="M27 50h8v5h-8m29-5h8v5h-8m29-5h8v5h-8" /></g>
    <path d="M42 65h36v4H42Z" fill="#b9c9d0" />
  </svg>;
}
