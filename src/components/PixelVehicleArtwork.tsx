import { assetPath } from '@/lib/assetPath';
import { VEHICLE_SHEET, vehicleAsset, vehicleViewBox, type PixelVehicleId } from '@/lib/pixelVehicles';

export function PixelVehicleArtwork({ id, label }: { id: PixelVehicleId; label?: string }) {
  return <svg className="character-artwork pixel-vehicle-artwork" data-character={id} data-artwork="pixel" data-vehicle-sprite data-frame="0"
    viewBox={vehicleViewBox(0)} overflow="hidden" shapeRendering="crispEdges"
    role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
    <image href={assetPath(vehicleAsset(id))} width={VEHICLE_SHEET.columns * VEHICLE_SHEET.frameWidth} height={VEHICLE_SHEET.rows * VEHICLE_SHEET.frameHeight} />
  </svg>;
}
