import { clamp, smoothstep } from './journey';

interface DestinationArt {
  width: number; height: number;
  anchor: { x: number; y: number };
  kind: string;
}

/** Final arrival geometry; the painting's anchor stays on the ground/flight path. */
export function destinationLayout(art: DestinationArt, width: number, height: number, lineX: number, actorWidth: number) {
  const groundY = height * .78;
  const y = art.kind === 'space' ? groundY - actorWidth * 105 / 160 : groundY;
  const visibleHeight = art.kind === 'space' ? height : groundY;
  const bottom = art.height - art.anchor.y;
  const scale = Math.max(lineX / art.anchor.x, (width - lineX) / (art.width - art.anchor.x),
    y / art.anchor.y, bottom > 0 ? (visibleHeight - y) / bottom : 0);
  return { y, width: art.width * scale, height: art.height * scale, left: -art.anchor.x * scale, top: -art.anchor.y * scale };
}

/** One non-repeating landmark, visible from departure. Perspective changes
 * continuously with elapsed time, then freezes at the exact crossing position.
 * Scaling around the post base keeps it planted rather than floating. */
export function destinationApproach(progress: number, width: number, lineX: number) {
  const approach = smoothstep(clamp(progress));
  const distance = Math.max(0, width * .88 - lineX);
  return { offsetX: distance * (1 - approach), scale: .34 + .66 * approach };
}
