interface DestinationArt {
  width: number; height: number;
  anchor: { x: number; y: number };
  kind: string;
}

/** Align the painted landmark inside one fixed, non-repeating background.
 * Only viewport/asset dimensions affect placement; elapsed time never does. */
export function destinationLayout(art: DestinationArt, width: number, height: number, lineX: number, actorWidth: number) {
  const groundY = height * .78;
  const y = art.kind === 'space' ? groundY - actorWidth * 105 / 160 : groundY;
  const visibleHeight = art.kind === 'space' ? height : groundY;
  const bottom = art.height - art.anchor.y;
  const scale = Math.max(lineX / art.anchor.x, (width - lineX) / (art.width - art.anchor.x),
    y / art.anchor.y, bottom > 0 ? (visibleHeight - y) / bottom : 0);
  return { y, width: art.width * scale, height: art.height * scale, left: -art.anchor.x * scale, top: -art.anchor.y * scale };
}
