import { useId } from 'react';
import atlases from '@/lib/animalAtlases.json';
import { animalPose, animalProfiles, type AnimalId, type PawName } from '@/lib/animalMotion';
import { assetPath } from '@/lib/assetPath';
import { rabbitAnatomy } from '@/lib/rabbitAnatomy';

type PartName = keyof typeof atlases.rabbit.parts;
/** A bounded CSS image crop avoids nested SVG repainting when a choice is tapped on mobile. */
export function PaintedAnimalThumbnail({ id, label }: { id: AnimalId; label: string }) {
  const atlas = atlases[id], [x, y, width, height] = atlas.parts.thumbnail;
  const scale = Math.min(160 / width, 186 / height), drawWidth = width * scale, drawHeight = height * scale;
  return <span className="character-artwork painted-animal-thumbnail" data-character={id} data-artwork="imagegen" role="img" aria-label={label}>
    <span className="painted-thumbnail-crop" aria-hidden="true" style={{
      left: `${(160 - drawWidth) / 320 * 100}%`, top: `${(210 - drawHeight) / 420 * 100}%`,
      width: `${drawWidth / 160 * 100}%`, height: `${drawHeight / 210 * 100}%`,
      backgroundImage: `url("${assetPath(`/characters/raster-v1/${id}.webp`)}")`,
      backgroundSize: `${atlas.width / width * 100}% ${atlas.height / height * 100}%`,
      backgroundPosition: `${x / (atlas.width - width) * 100}% ${y / (atlas.height - height) * 100}%`,
    }} />
  </span>;
}
function Part({ id, part, x, y, width, height, contain = false }: {
  id: AnimalId; part: PartName; x: number; y: number; width: number; height: number; contain?: boolean;
}) {
  const atlas = atlases[id], region = atlas.parts[part];
  return <svg x={x} y={y} width={width} height={height} viewBox={region.join(' ')}
    preserveAspectRatio={contain ? 'xMidYMid meet' : 'none'} overflow="hidden" data-painted-part={part}>
    <image href={assetPath(`/characters/raster-v1/${id}.webp`)} width={atlas.width} height={atlas.height} />
  </svg>;
}

/** Match painted joint landmarks to the bone; padding is never a rotation pivot. */
function RabbitHindBone({ part, length }: { part: 'hindUpper' | 'hindLower'; length: number }) {
  const landmarks = rabbitAnatomy.hindArtwork[part === 'hindUpper' ? 'upper' : 'lower'];
  const dx = landmarks.tip.x - landmarks.pivot.x, dy = landmarks.tip.y - landmarks.pivot.y;
  const scale = length / Math.hypot(dx, dy), [, , width, height] = atlases.rabbit.parts[part];
  const angle = 90 - Math.atan2(dy, dx) * 180 / Math.PI;
  return <g transform={`rotate(${angle})`}>
    <Part id="rabbit" part={part} x={-landmarks.pivot.x * scale} y={-landmarks.pivot.y * scale} width={width * scale} height={height * scale} />
  </g>;
}

function PaintedEar({ id, part, placement }: {
  id: AnimalId; part: 'earNear' | 'earFar';
  placement: { anchorX: number; anchorY: number; x: number; y: number; width: number; height: number };
}) {
  return <g transform={`translate(${placement.anchorX} ${placement.anchorY})`}><g data-animal-joint={part}>
    <Part id={id} part={part} {...placement} />
  </g></g>;
}

function PaintedPaw({ id, name, far, filter }: { id: AnimalId; name: PawName; far?: boolean; filter: string }) {
  const prefix = useId().replace(/:/g, '');
  const rig = animalProfiles[id].paws[name];
  if (!rig) return null;
  const rest = animalPose(id, 0, false).joints;
  const hind = name.includes('Hind'), bird = id === 'chick';
  const rabbit = id === 'rabbit';
  const upperPart = hind ? 'hindUpper' : 'foreUpper', lowerPart = hind ? 'hindLower' : 'foreLower', pawPart = hind ? 'hindPaw' : 'forePaw';
  const overlap = rabbit && !hind ? 3 : 5;
  const upperHeight = rig.upper + overlap * 2, lowerHeight = rig.lower + overlap * 2;
  const parts = atlases[id].parts;
  const upperWidth = rabbit ? upperHeight * parts[upperPart][2] / parts[upperPart][3]
    : (bird ? 7 : id === 'bear' ? 23 : id === 'cat' ? 13 : 17) * (far ? .88 : 1);
  const lowerWidth = rabbit ? lowerHeight * parts[lowerPart][2] / parts[lowerPart][3] : bird ? 3.5 : upperWidth * .72;
  const pawWidth = bird ? 19 : hind && rabbit ? 28 : rabbit ? 17 : id === 'bear' ? 24 : 21;
  const pawHeight = rabbit ? pawWidth * parts[pawPart][3] / parts[pawPart][2] : 13;
  const fittedHind = rabbit && hind;
  const hindPaw = rabbitAnatomy.hindArtwork.paw;
  const pawScale = pawWidth / parts[pawPart][2];
  const blendedRoot = rabbit && !far;
  return <g data-paw={name} transform={`translate(${rig.x} ${rig.y})`} filter={far ? filter : undefined}>
    {blendedRoot ? <defs>
      <linearGradient id={`${prefix}-root-fade`} gradientUnits="userSpaceOnUse" x1="0" y1={fittedHind ? -14 : -overlap} x2="0" y2={fittedHind ? 5 : 12}><stop stopColor="black" /><stop offset="1" stopColor="white" /></linearGradient>
      <mask id={`${prefix}-root-mask`} maskUnits="userSpaceOnUse" x="-30" y="-30" width="60" height="110"><rect x="-30" y="-30" width="60" height="110" fill={`url(#${prefix}-root-fade)`} /></mask>
    </defs> : null}
    <g data-animal-joint={`${name}Hip`} transform={`rotate(${rest[`${name}Hip`]})`}>
      <g mask={blendedRoot ? `url(#${prefix}-root-mask)` : undefined}>{fittedHind
        ? <RabbitHindBone part="hindUpper" length={rig.upper} />
        : <Part id={id} part={upperPart} x={-upperWidth / 2} y={-overlap} width={upperWidth} height={upperHeight} />}</g>
      <g transform={`translate(0 ${rig.upper})`}><g data-animal-joint={`${name}Knee`} transform={`rotate(${rest[`${name}Knee`]})`}>
        {fittedHind ? <RabbitHindBone part="hindLower" length={rig.lower} />
          : <Part id={id} part={lowerPart} x={-lowerWidth / 2} y={-overlap} width={lowerWidth} height={lowerHeight} />}
        <g transform={`translate(0 ${rig.lower})`}><g data-animal-joint={`${name}Ankle`} transform={`rotate(${rest[`${name}Ankle`]})`}>
          <Part id={id} part={pawPart} x={fittedHind ? -hindPaw.pivot.x * pawScale : -7} y={fittedHind ? -hindPaw.pivot.y * pawScale : 4 - pawHeight} width={pawWidth} height={pawHeight} />
        </g></g>
      </g></g>
    </g>
  </g>;
}

/** ImageGen's transparent painted parts, posed by the same four-paw rig as the motion study. */
export function PaintedAnimalArtwork({ id, label }: { id: AnimalId; label?: string }) {
  const prefix = useId().replace(/:/g, ''), bird = id === 'chick', rabbit = id === 'rabbit', dog = id === 'dog';
  const filter = `url(#${prefix}-far-fur)`;
  const torso = rabbit ? rabbitAnatomy.torso : { x: bird ? 45 : 24, y: bird ? 131 : id === 'bear' ? 123 : 133, width: bird ? 69 : 102, height: bird ? 57 : id === 'bear' ? 56 : 41 };
  const head = rabbit ? rabbitAnatomy.head : { x: bird ? 80 : 93, y: bird ? 110 : 119, width: bird ? 51 : 61, height: bird ? 47 : 42 };
  const pivot = rabbit ? rabbitAnatomy.headPivot : { x: bird ? 96 : 111, y: bird ? 151 : 147 };
  const earNear = rabbit ? rabbitAnatomy.earNear : { anchorX: 106, anchorY: 128, x: -9, y: dog ? -4 : -18, width: dog ? 23 : 20, height: dog ? 36 : 23 };
  const earFar = rabbit ? rabbitAnatomy.earFar : { anchorX: 113, anchorY: 126, x: -7, y: dog ? -3 : -17, width: dog ? 18 : 17, height: dog ? 32 : 20 };
  const nearEar = !bird ? <PaintedEar id={id} part="earNear" placement={earNear} /> : null;
  return <svg viewBox="0 0 160 210" className="character-artwork natural-animal-artwork painted-animal-artwork" data-character={id} data-animal={id}
    data-artwork="imagegen" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
      <defs><filter id={`${prefix}-far-fur`} colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" x="-65" y="-25" width="140" height="105">
        <feComponentTransfer><feFuncR type="linear" slope=".79" /><feFuncG type="linear" slope=".79" /><feFuncB type="linear" slope=".79" /></feComponentTransfer>
      </filter></defs>
      <g data-animal-body data-body>
        <g transform={`translate(${bird ? 58 : 29} ${bird ? 164 : 158})`}><g data-animal-joint="tail">
          <Part id={id} part="tail" x={id === 'cat' || dog ? -24 : -16} y={id === 'cat' || dog ? -51 : -13} width={id === 'cat' || dog ? 35 : 23} height={id === 'cat' || dog ? 57 : 24} />
        </g></g>
        <PaintedPaw id={id} name="farHind" far filter={filter} /><PaintedPaw id={id} name="farFore" far filter={filter} />
        {/* Far limbs stay behind the torso; near limb roots blend into its fur. */}
        <Part id={id} part="torso" {...torso} />
        <g transform={`translate(${pivot.x} ${pivot.y})`}><g data-animal-joint="head"><g transform={`translate(${-pivot.x} ${-pivot.y})`}>
          {!bird ? <PaintedEar id={id} part="earFar" placement={earFar} /> : null}
          {rabbit ? nearEar : null}
          <Part id={id} part="head" {...head} />
          {!rabbit ? nearEar : null}
        </g></g></g>
        {bird ? <g transform="translate(67 154)"><g data-animal-joint="wing"><Part id={id} part="earNear" x={-5} y={-9} width={37} height={29} /></g></g> : null}
        <PaintedPaw id={id} name="nearHind" filter={filter} /><PaintedPaw id={id} name="nearFore" filter={filter} />
      </g>
  </svg>;
}
