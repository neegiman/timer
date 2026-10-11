import { useId } from 'react';
import atlas from '@/lib/princeAtlas.json';
import { PAINTED_PRINCE_ASSET, princeAnatomy as anatomy, paintedPrincePose, type PrincePart } from '@/lib/paintedPrinceMotion';
import { assetPath } from '@/lib/assetPath';

type Landmark = { pivot: { x: number; y: number }; tip: { x: number; y: number } };

function Part({ part, x, y, width, height }: { part: PrincePart; x: number; y: number; width: number; height: number }) {
  return <svg x={x} y={y} width={width} height={height} viewBox={atlas.parts[part].join(' ')}
    preserveAspectRatio="none" overflow="hidden" data-painted-part={part}>
    <image href={assetPath(PAINTED_PRINCE_ASSET)} width={atlas.width} height={atlas.height} />
  </svg>;
}

/** A painted bone rotates around its actual rounded root, with a short blended overlap. */
function Bone({ part, length, landmarks, crossScale = 1, blendRoot = false, blendTip = false }: {
  part: PrincePart; length: number; landmarks: Landmark; crossScale?: number; blendRoot?: boolean; blendTip?: boolean;
}) {
  const id = useId().replace(/:/g, ''), region = atlas.parts[part];
  const dx = landmarks.tip.x - landmarks.pivot.x, dy = landmarks.tip.y - landmarks.pivot.y;
  const scale = length / Math.hypot(dx, dy);
  return <g>
    <defs>
      {blendRoot ? <><linearGradient id={`${id}-root`} x1="0" y1="-3" x2="0" y2="1" gradientUnits="userSpaceOnUse"><stop stopColor="black" /><stop offset="1" stopColor="white" /></linearGradient>
        <mask id={`${id}-root-mask`} maskUnits="userSpaceOnUse" x="-30" y="-12" width="60" height="100"><rect x="-30" y="-12" width="60" height="100" fill={`url(#${id}-root)`} /></mask></> : null}
      {blendTip ? <><linearGradient id={`${id}-tip`} x1="0" y1={length + 1} x2="0" y2={length + 4} gradientUnits="userSpaceOnUse"><stop stopColor="white" /><stop offset="1" stopColor="black" /></linearGradient>
        <mask id={`${id}-tip-mask`} maskUnits="userSpaceOnUse" x="-30" y="-12" width="60" height="100"><rect x="-30" y="-12" width="60" height="100" fill={`url(#${id}-tip)`} /></mask></> : null}
    </defs>
    <g mask={blendRoot ? `url(#${id}-root-mask)` : undefined}><g mask={blendTip ? `url(#${id}-tip-mask)` : undefined}>
      <g transform={`scale(${crossScale} 1)`}><g transform={`rotate(${90 - Math.atan2(dy, dx) * 180 / Math.PI})`}>
        <Part part={part} x={-landmarks.pivot.x * scale} y={-landmarks.pivot.y * scale} width={region[2] * scale} height={region[3] * scale} />
      </g></g>
    </g></g>
  </g>;
}

const rest = paintedPrincePose('idle', 0).joints;
function Leg({ side }: { side: 'front' | 'back' }) {
  const rig = anatomy.legs[side], bootScale = anatomy.boot.width / atlas.parts.boot[2];
  return <g data-leg={side} transform={`translate(${rig.x} ${rig.y})`}>
    <g data-joint={`${side}-thigh`} transform={`rotate(${rest[`${side}-thigh`]})`}>
      <g transform={`translate(0 ${rig.upper})`}><g data-joint={`${side}-shin`} transform={`rotate(${rest[`${side}-shin`]})`}>
        <g transform={`translate(0 ${rig.lower})`}><g data-joint={`${side}-foot`} transform={`rotate(${rest[`${side}-foot`]})`}>
          <Part part="boot" x={-anatomy.boot.pivot.x * bootScale} y={-anatomy.boot.pivot.y * bootScale}
            width={anatomy.boot.width} height={atlas.parts.boot[3] * bootScale} />
        </g></g>
        <Bone part="shin" length={rig.lower} landmarks={anatomy.shin} crossScale={anatomy.shinCrossScale} blendRoot blendTip />
      </g></g>
      <Bone part="thigh" length={rig.upper} landmarks={anatomy.thigh} blendTip />
    </g>
  </g>;
}

function Arm({ side }: { side: 'front' | 'back' }) {
  const rig = anatomy.arms[side];
  return <g data-arm={side} transform={`translate(${rig.x} ${rig.y})`}>
    <g data-joint={`${side}-arm`} transform={`rotate(${rest[`${side}-arm`]})`}>
      <g transform={`translate(0 ${rig.upper})`}><g data-joint={`${side}-elbow`} transform={`rotate(${rest[`${side}-elbow`]})`}>
        <Bone part={rig.lowerPart} length={rig.lower} landmarks={rig.lowerArt} crossScale={rig.crossScale} blendRoot />
      </g></g>
      <Bone part={rig.upperPart} length={rig.upper} landmarks={rig.upperArt} blendTip />
    </g>
  </g>;
}

export function PaintedPrinceArtwork() {
  return <svg viewBox="0 0 160 210" className="character-artwork painted-prince-artwork"
    data-character="prince" data-artwork="imagegen" aria-hidden="true" focusable="false">
    <g data-prince-body transform="translate(0 0)">
      <g transform={`translate(${anatomy.capePivot.x} ${anatomy.capePivot.y})`}><g data-joint="hair">
        <Part part="cape" x={anatomy.cape.x - anatomy.capePivot.x} y={anatomy.cape.y - anatomy.capePivot.y} width={anatomy.cape.width} height={anatomy.cape.height} />
      </g></g>
      <Leg side="back" /><Leg side="front" /><Arm side="back" />
      <Part part="torso" {...anatomy.torso} /><Arm side="front" />
      <g transform={`translate(${anatomy.headPivot.x} ${anatomy.headPivot.y})`}><g data-joint="head">
        <Part part="head" x={anatomy.head.x - anatomy.headPivot.x} y={anatomy.head.y - anatomy.headPivot.y} width={anatomy.head.width} height={anatomy.head.height} />
      </g></g>
    </g>
  </svg>;
}

export function PaintedPrinceThumbnail({ label }: { label: string }) {
  const [x, y, width, height] = atlas.parts.thumbnail;
  const scale = Math.min(160 / width, 186 / height), drawWidth = width * scale, drawHeight = height * scale;
  return <span className="character-artwork painted-animal-thumbnail" data-character="prince" data-artwork="imagegen" role="img" aria-label={label}>
    <span className="painted-thumbnail-crop" aria-hidden="true" style={{
      left: `${(160 - drawWidth) / 320 * 100}%`, top: `${(210 - drawHeight) / 420 * 100}%`,
      width: `${drawWidth / 160 * 100}%`, height: `${drawHeight / 210 * 100}%`,
      backgroundImage: `url("${assetPath(PAINTED_PRINCE_ASSET)}")`,
      backgroundSize: `${atlas.width / width * 100}% ${atlas.height / height * 100}%`,
      backgroundPosition: `${x / (atlas.width - width) * 100}% ${y / (atlas.height - height) * 100}%`,
    }} />
  </span>;
}
