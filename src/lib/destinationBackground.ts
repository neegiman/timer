interface DestinationArt {
  width: number; height: number;
  anchor: { x: number; y: number };
  paintBounds: { x: number };
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
  // Entry occurs when the actual painted left edge reaches the viewport's right edge.
  // The much larger transparent bitmap must not be used as the entry boundary.
  const entryX = width + (art.anchor.x - art.paintBounds.x) * scale;
  return { y, width: art.width * scale, height: art.height * scale, left: -art.anchor.x * scale, top: -art.anchor.y * scale, entryX };
}
