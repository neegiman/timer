import { memo, useId, type ReactNode } from 'react';
import type { Season } from '@/lib/seasons';

function Layer({ id, name, rate, children }: { id: string; name: string; rate: number; children: ReactNode }) {
  return <div className={`parallax-layer ${name}-layer`} data-layer={name} data-rate={rate} aria-hidden="true">
    <svg viewBox="0 0 3200 600" preserveAspectRatio="none">
      <defs><pattern id={id} width="800" height="600" patternUnits="userSpaceOnUse">{children}</pattern></defs>
      <rect width="3200" height="600" fill={`url(#${id})`} />
    </svg>
  </div>;
}

/** The original meadow palette and scenery primitives form edge-matched, repeating layers. */
export const ScrollingScenery = memo(function ScrollingScenery({ season }: { season: Season }) {
  const prefix = useId().replace(/:/g, '');
  return <>
    <Layer id={`${prefix}-cloud`} name="cloud" rate={.08}>
      <g fill="var(--scene-cloud, #fffdf5)"><path d="M105 106c-27 0-30-32-5-39 5-28 49-30 60-3 32-14 51 11 35 32 24 0 28 23 3 23h-93Z" /><path d="M556 72c-21 0-23-23-6-28 5-20 32-20 41-3 25-8 41 10 31 23 17 0 19 16 0 16h-62Z" /></g>
    </Layer>
    <Layer id={`${prefix}-hill`} name="hill" rate={.2}>
      <path d="M0 255C85 255 135 175 260 190S390 250 480 215S685 255 800 255V600H0Z" fill="var(--scene-hill-far, #dfebc8)" />
      <path d="M0 345C100 345 130 260 270 280S430 350 530 300S700 345 800 345V600H0Z" fill="var(--scene-hill-middle, #d3e5b8)" />
      <path d="M0 432C100 432 160 350 320 390S650 432 800 432V600H0Z" fill="var(--scene-hill-near, #c4dda5)" />
    </Layer>
    <Layer id={`${prefix}-tree`} name="tree" rate={.65}>
      <g stroke="var(--scene-trunk, #849e6b)" strokeWidth="9" strokeLinecap="round"><path d="M128 362v102M594 340v124" /></g>
      <g fill="var(--scene-leaf, #a1bd88)"><circle cx="128" cy="325" r="45" /><circle cx="103" cy="359" r="34" /><circle cx="149" cy="359" r="36" /><circle cx="594" cy="303" r="47" /><circle cx="567" cy="342" r="37" /><circle cx="617" cy="343" r="39" /></g>
      <g fill="var(--scene-leaf-light, #bed19a)"><ellipse cx="116" cy="316" rx="17" ry="24" /><ellipse cx="582" cy="295" rx="19" ry="26" /></g>
      {season === 'spring' ? <g fill="#f6d8df" opacity=".85"><circle cx="97" cy="319" r="9" /><circle cx="148" cy="341" r="10" /><circle cx="123" cy="366" r="8" /><circle cx="571" cy="293" r="9" /><circle cx="616" cy="319" r="10" /><circle cx="591" cy="353" r="8" /></g> : null}
      {season === 'winter' ? <g>
        <path d="m128 420-27-50m27 31 24-38m442 50-27-51m27 30 27-43" fill="none" stroke="var(--scene-trunk)" strokeWidth="5" strokeLinecap="round" />
        <path d="M87 325q2-47 41-45 39 0 43 45-20-12-41-6-25-8-43 6M551 304q4-46 43-48 41 0 45 48-24-12-43-6-23-7-45 6" fill="var(--scene-snow, #edf5f5)" />
      </g> : null}
    </Layer>
    <Layer id={`${prefix}-ground`} name="ground" rate={1}>
      <rect y="468" width="800" height="132" fill="var(--scene-ground, #f3dfb8)" />
      <rect y="468" width="800" height="5" fill="var(--scene-verge, #b5cb91)" />
      <g stroke="var(--scene-grass, #97b975)" strokeWidth="3" strokeLinecap="round" fill="none"><path d="m48 468 4-13 5 13m222 0 5-16 6 16m404 0 5-12 6 12M151 466v-20m379 20v-26" /></g>
      <g fill="var(--scene-flower, #fff2be)"><circle cx="151" cy="442" r="8" /><circle cx="530" cy="437" r="8" /></g>
      <g fill="var(--scene-flower-center, #cf9b58)"><circle cx="151" cy="442" r="3" /><circle cx="530" cy="437" r="3" /></g>
      <g fill="var(--scene-stone, #dcc69d)"><ellipse cx="69" cy="510" rx="11" ry="4" /><ellipse cx="350" cy="526" rx="9" ry="4" /><ellipse cx="601" cy="501" rx="13" ry="4" /><ellipse cx="745" cy="552" rx="7" ry="3" /></g>
      <g stroke="var(--scene-ground-mark, #e6cda4)" strokeWidth="2" strokeLinecap="round"><path d="M182 546h21M450 563h17M710 510h14" /></g>
      {season === 'spring' ? <g fill="#dc9eb6"><path d="M322 461q-16-24 0-17 17-7 0 17M711 461q-15-24 0-17 17-7 0 17" /><path d="M322 461v7m389-7v7" stroke="#91ad75" strokeWidth="3" /></g> : null}
      {season === 'summer' ? <g><ellipse cx="388" cy="466" rx="41" ry="4" fill="#b3d3bd" /><path d="M365 466h23m6 0h13" stroke="#e1ece0" strokeWidth="2" strokeLinecap="round" /><path d="M710 446v22" stroke="#7ea46d" strokeWidth="4" /><circle cx="710" cy="442" r="12" fill="#e9c477" /><circle cx="710" cy="442" r="5" fill="#a7855c" /></g> : null}
      {season === 'autumn' ? <g><path d="M317 468v-12m12 12v-7" stroke="#ecddba" strokeWidth="5" /><path d="M305 457q12-20 24 0Zm15 5q9-16 19 0Z" fill="#ba805d" /><path d="m427 477 12-5 7 8-11 2Zm289 7 11-5 9 5-11 4Z" fill="#cb9a62" /></g> : null}
      {season === 'winter' ? <g fill="var(--scene-snow, #edf5f5)"><path d="M0 468q24-8 48 0t48 0v6H0Zm265 0q27-9 54 0t54 0v6H265Zm347 0q27-8 54 0t54 0v6H612Z" /><circle cx="399" cy="454" r="13" /><circle cx="399" cy="436" r="9" /><path d="M390 427h18v4h-18Z" fill="#7c959d" /><path d="M392 445h15v4h-15Z" fill="#ca9282" /><circle cx="396" cy="435" r="1.3" fill="#697c85" /><circle cx="402" cy="435" r="1.3" fill="#697c85" /></g> : null}
    </Layer>
  </>;
});
