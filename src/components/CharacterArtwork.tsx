import { PaintedAnimalArtwork, PaintedAnimalThumbnail } from './PaintedAnimalArtwork';
import { isAnimalId } from '@/lib/animalActionPose';
import { PaintedPrincessArtwork, PaintedPrincessThumbnail } from './PaintedPrincessArtwork';
import { PaintedPrinceArtwork, PaintedPrinceThumbnail } from './PaintedPrinceArtwork';
import { PixelVehicleArtwork } from './PixelVehicleArtwork';
import { isPixelVehicle } from '@/lib/pixelVehicles';

/** Selection, progress marker and journey share the same original character artwork. */
export function CharacterArtwork({ id, label, compact = false }: { id: string; label?: string; compact?: boolean }) {
  if (id === 'prince') return label ? <PaintedPrinceThumbnail label={label} /> : <PaintedPrinceArtwork />;
  if (id === 'princess') return label ? <PaintedPrincessThumbnail label={label} /> : <PaintedPrincessArtwork />;
  if (isPixelVehicle(id)) return <PixelVehicleArtwork id={id} label={label} />;
  const animal = isAnimalId(id) ? id : 'rabbit';
  return label ? <PaintedAnimalThumbnail id={animal} label={label} /> : <PaintedAnimalArtwork id={animal} compact={compact} />;
}
