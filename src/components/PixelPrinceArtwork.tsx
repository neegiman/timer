import { assetPath } from '@/lib/assetPath';
import { PRINCE_ASSET, PRINCE_SHEET, princeViewBox } from '@/lib/princeMotion';

/** One complete sprite per frame; every edge stays on the original pixel grid. */
export function PixelPrinceArtwork({ label }: { label?: string }) {
  return <svg className="character-artwork pixel-prince-artwork" data-character="prince" data-artwork="pixel" data-prince-sprite data-frame="0"
    viewBox={princeViewBox(0)} overflow="hidden" shapeRendering="crispEdges"
    role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
    <image href={assetPath(PRINCE_ASSET)} width={PRINCE_SHEET.columns * PRINCE_SHEET.frameWidth} height={PRINCE_SHEET.rows * PRINCE_SHEET.frameHeight} />
  </svg>;
}
