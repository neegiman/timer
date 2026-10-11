import { useId, type ReactNode } from 'react';
import { TORSO_PANELS, TAIL_PANELS, TAIL_BOUNDS, TAIL_CUTS, isWalker } from '@/lib/animalBodyMotion';
import { walkingAnatomy } from '@/lib/walkingAnatomy';
import type { AnimalId } from '@/lib/animalMotion';

/** Adjacent panels share edge displacement; the existing painting bends without new assets. */
export function AnimalTorsoPanels({ id, children }: { id: AnimalId; children: ReactNode }) {
  const prefix = useId().replace(/:/g, '');
  if (!isWalker(id)) return children;
  const bounds = walkingAnatomy[id].torso, width = bounds.width / TORSO_PANELS;
  return Array.from({ length: TORSO_PANELS }, (_, index) => <g key={index} data-animal-torso-panel={index}>
    <defs><clipPath id={`${prefix}-torso-${index}`}><rect x={bounds.x + width * index - .08} y={bounds.y - 4} width={width + .16} height={bounds.height + 8} /></clipPath></defs>
    <g clipPath={`url(#${prefix}-torso-${index})`}>{children}</g>
  </g>);
}

export function AnimalTailPanels({ id, children }: { id: AnimalId; children: ReactNode }) {
  const prefix = useId().replace(/:/g, '');
  if (!isWalker(id)) return children;
  return Array.from({ length: TAIL_PANELS }, (_, index) => <g key={index} data-animal-tail-panel={index}>
    <defs><clipPath id={`${prefix}-tail-${index}`}><rect x={TAIL_BOUNDS.x - 3} y={TAIL_CUTS[index] - .08 - (index === 0 ? 4 : 0)} width={TAIL_BOUNDS.width + 6} height={TAIL_CUTS[index + 1] - TAIL_CUTS[index] + .16 + (index === 0 ? 4 : 0)} /></clipPath></defs>
    <g clipPath={`url(#${prefix}-tail-${index})`}>{children}</g>
  </g>);
}
