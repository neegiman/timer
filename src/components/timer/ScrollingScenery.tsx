import { memo, useId, type ReactNode } from 'react';

function Layer({ id, name, rate, children }: { id: string; name: string; rate: number; children: ReactNode }) {
  return <div className={`parallax-layer ${name}-layer`} data-layer={name} data-rate={rate} aria-hidden="true">
    <svg viewBox="0 0 3200 600" preserveAspectRatio="none">
      <defs><pattern id={id} width="800" height="600" patternUnits="userSpaceOnUse">{children}</pattern></defs>
      <rect width="3200" height="600" fill={`url(#${id})`} />
    </svg>
  </div>;
}

/** The original meadow palette and scenery primitives form edge-matched, repeating layers. */
export const ScrollingScenery = memo(function ScrollingScenery() {
  const prefix = useId().replace(/:/g, '');
  return <>
    <Layer id={`${prefix}-cloud`} name="cloud" rate={.08}>
      <g fill="#fffdf5"><path d="M105 106c-27 0-30-32-5-39 5-28 49-30 60-3 32-14 51 11 35 32 24 0 28 23 3 23h-93Z" /><path d="M556 72c-21 0-23-23-6-28 5-20 32-20 41-3 25-8 41 10 31 23 17 0 19 16 0 16h-62Z" /></g>
    </Layer>
    <Layer id={`${prefix}-hill`} name="hill" rate={.2}>
      <path d="M0 255C85 255 135 175 260 190S390 250 480 215S685 255 800 255V600H0Z" fill="#dfebc8" />
      <path d="M0 345C100 345 130 260 270 280S430 350 530 300S700 345 800 345V600H0Z" fill="#d3e5b8" />
      <path d="M0 432C100 432 160 350 320 390S650 432 800 432V600H0Z" fill="#c4dda5" />
    </Layer>
    <Layer id={`${prefix}-tree`} name="tree" rate={.65}>
      <g stroke="#849e6b" strokeWidth="9" strokeLinecap="round"><path d="M128 362v102M594 340v124" /></g>
      <g fill="#a1bd88"><circle cx="128" cy="325" r="45" /><circle cx="103" cy="359" r="34" /><circle cx="149" cy="359" r="36" /><circle cx="594" cy="303" r="47" /><circle cx="567" cy="342" r="37" /><circle cx="617" cy="343" r="39" /></g>
      <g fill="#bed19a"><ellipse cx="116" cy="316" rx="17" ry="24" /><ellipse cx="582" cy="295" rx="19" ry="26" /></g>
    </Layer>
    <Layer id={`${prefix}-ground`} name="ground" rate={1}>
      <rect y="468" width="800" height="132" fill="#f3dfb8" />
      <rect y="468" width="800" height="5" fill="#b5cb91" />
      <g stroke="#97b975" strokeWidth="3" strokeLinecap="round" fill="none"><path d="m48 468 4-13 5 13m222 0 5-16 6 16m404 0 5-12 6 12M151 466v-20m379 20v-26" /></g>
      <g fill="#fff2be"><circle cx="151" cy="442" r="8" /><circle cx="530" cy="437" r="8" /></g>
      <g fill="#cf9b58"><circle cx="151" cy="442" r="3" /><circle cx="530" cy="437" r="3" /></g>
      <g fill="#dcc69d"><ellipse cx="69" cy="510" rx="11" ry="4" /><ellipse cx="350" cy="526" rx="9" ry="4" /><ellipse cx="601" cy="501" rx="13" ry="4" /><ellipse cx="745" cy="552" rx="7" ry="3" /></g>
      <g stroke="#e6cda4" strokeWidth="2" strokeLinecap="round"><path d="M182 546h21M450 563h17M710 510h14" /></g>
    </Layer>
  </>;
});
