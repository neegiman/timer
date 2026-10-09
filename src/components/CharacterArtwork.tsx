import { PaintedAnimalArtwork, PaintedAnimalThumbnail } from './PaintedAnimalArtwork';
import { isAnimalId } from '@/lib/animalActionPose';
import { PaintedPrincessArtwork, PaintedPrincessThumbnail } from './PaintedPrincessArtwork';
import { PixelPrinceArtwork } from './PixelPrinceArtwork';
import { PixelVehicleArtwork } from './PixelVehicleArtwork';
import { isPixelVehicle } from '@/lib/pixelVehicles';

/** Selection, progress marker and journey share the same original character artwork. */
export function CharacterArtwork({ id, label }: { id: string; label?: string }) {
  if (id === 'prince') return <PixelPrinceArtwork label={label} />;
  if (id === 'princess') return label ? <PaintedPrincessThumbnail label={label} /> : <PaintedPrincessArtwork />;
  if (isPixelVehicle(id)) return <PixelVehicleArtwork id={id} label={label} />;
  const animal = isAnimalId(id) ? id : 'rabbit';
  return label ? <PaintedAnimalThumbnail id={animal} label={label} /> : <PaintedAnimalArtwork id={animal} />;
}
