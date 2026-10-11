import { memo } from 'react';
import { assetPath } from '@/lib/assetPath';

/** Dedicated pixel space: one sky for every season and local time. */
export const RocketSky = memo(function RocketSky() {
  return <div className="rocket-sky" data-rocket-sky data-scenery="pixel-space-v1" aria-hidden="true">
    <div className="parallax-layer space-nebula-layer" data-layer="nebula" data-rate=".04" data-tile-scale="3">
      <div className="space-nebula" data-scenery-src={assetPath('/images/space-v1/nebula.webp')} style={{ backgroundImage: `url("${assetPath('/images/space-v1/nebula.webp')}")` }} />
    </div>
    <div className="parallax-layer space-stars-layer" data-layer="stars" data-rate=".22" style={{ backgroundImage: `url("${assetPath('/images/space-v1/stars.svg')}")` }} />
    <div className="parallax-layer space-near-layer" data-layer="near-stars" data-rate=".6" style={{ backgroundImage: `url("${assetPath('/images/space-v1/near-stars.svg')}")` }} />
    <div className="space-planet space-planet-ringed" data-space-planet>
      <svg viewBox="0 0 64 48" shapeRendering="crispEdges">
        <path d="M4 29v-4h4v-4h8v-4h12v-4h16V9h12v4h4v8h-4v4h-8v4H36v4H20v4H8v-4H4Z" fill="#655889" />
        <path d="M26 7h12v3h6v4h4v6h3v10h-3v6h-4v4h-6v3H26v-3h-6v-4h-4v-6h-3V20h3v-6h4v-4h6Z" fill="#d59a83" />
        <path d="M26 7h12v3h6v4H20v-4h6ZM16 20h32v5H13v-5Zm4 14h28v2h-4v4H26v-3h-6Z" fill="#edbd94" />
        <path d="M24 10h12v3H24Zm-6 7h8v3h-8Z" fill="#ffe3af" />
        <path d="M44 14h4v6h3v10h-3v6h-4v4h-6v3H26v-3h12v-4h4v-6h3V20h-1Z" fill="#b47c84" />
        <path d="M4 29h4v4h12v-4h16v-4h12v-4h8v-8h4v8h-4v4h-8v4H36v4H20v4H8v-4H4Z" fill="#b8a0cf" />
        <path d="M8 29h12v3H8Zm12-3h16v3H20Zm16-4h12v3H36Zm12-4h8v3h-8Z" fill="#e0cae5" />
      </svg>
    </div>
    <div className="space-planet space-planet-blue" data-space-planet>
      <svg viewBox="0 0 32 32" shapeRendering="crispEdges">
        <path d="M11 2h10v2h5v3h3v5h2v9h-2v5h-3v3h-5v2H11v-2H6v-3H3v-5H1v-9h2V7h3V4h5Z" fill="#609cb6" />
        <path d="M11 4h10v2h-8v3H7v5H3v-2h2V8h3V6h3Z" fill="#b9dfe0" />
        <path d="M11 8h5v3h4v4h-4v4h-5v-3H6v-5h5Zm10 12h7v5h-3v3h-4v-4h-3v-3h3Z" fill="#91bd9b" />
        <path d="M27 8h2v4h2v9h-2v5h-3v3h-5v2H11v-2h10v-3h3v-5h3Z" fill="#4b6c99" />
        <path d="M14 3h8v2h-8Zm-9 17h6v2H5Z" fill="#d8eadc" />
      </svg>
    </div>
    <div className="space-planet space-planet-small" data-space-planet>
      <svg viewBox="0 0 24 24" shapeRendering="crispEdges">
        <path d="M8 2h8v2h4v4h2v8h-2v4h-4v2H8v-2H4v-4H2V8h2V4h4Z" fill="#a498c7" />
        <path d="M8 3h7v2H9v2H5V5h3Z" fill="#d6cbe5" />
        <path d="M7 7h5v4H7Zm6 6h6v5h-6Zm-7 2h3v3H6Z" fill="#7c75ab" />
        <path d="M20 8h2v8h-2v4h-4v2H8v-2h8v-4h4Z" fill="#8179ad" />
      </svg>
    </div>
  </div>;
});

/** A small pixel saucer echoes the rocket's game artwork without extra image downloads. */
export function UfoVisitor() {
  return <svg data-visitor-art="ufo" viewBox="0 0 120 90" shapeRendering="crispEdges">
    <path className="ufo-beam" d="M44 65h32v7h6v7h6v7H32v-7h6v-7h6Z" fill="#e7f4b6" opacity=".2" />
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
