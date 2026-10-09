import { useId } from 'react';
import atlas from '@/lib/princessAtlas.json';
import { princessAnatomy as anatomy, princessPose } from '@/lib/princessMotion';
import { assetPath } from '@/lib/assetPath';
import { princessPart, type PrincessPart } from '@/lib/princessArtwork';

type PartName = PrincessPart;
type Landmark = { pivot: { x: number; y: number }; tip: { x: number; y: number } };

/** Keep the original painted proportions; only the SVG viewport selects each cutout. */
function Part({ part, x, y, width, height }: { part: PartName; x: number; y: number; width: number; height: number }) {
  const sheet = princessPart(part);
  return <svg x={x} y={y} width={width} height={height} viewBox={sheet.region.join(' ')}
    preserveAspectRatio="none" overflow="hidden" data-painted-part={part}>
    <image href={assetPath(sheet.source)} width={sheet.width} height={sheet.height} />
  </svg>;
}

function Bone({ part, length, landmarks, blendRoot = false }: { part: PartName; length: number; landmarks: Landmark; blendRoot?: boolean }) {
  const prefix = useId().replace(/:/g, '');
  const dx = landmarks.tip.x - landmarks.pivot.x, dy = landmarks.tip.y - landmarks.pivot.y;
  const scale = length / Math.hypot(dx, dy), [, , width, height] = princessPart(part).region;
  return <g>
    {blendRoot ? <defs>
      <linearGradient id={`${prefix}-elbow-fade`} gradientUnits="userSpaceOnUse" x1="0" y1="-3" x2="0" y2="3"><stop stopColor="black" /><stop offset="1" stopColor="white" /></linearGradient>
      <mask id={`${prefix}-elbow-mask`} maskUnits="userSpaceOnUse" x="-30" y="-12" width="60" height="90"><rect x="-30" y="-12" width="60" height="90" fill={`url(#${prefix}-elbow-fade)`} /></mask>
    </defs> : null}
    <g mask={blendRoot ? `url(#${prefix}-elbow-mask)` : undefined}><g transform={`rotate(${90 - Math.atan2(dy, dx) * 180 / Math.PI})`}>
      <Part part={part} x={-landmarks.pivot.x * scale} y={-landmarks.pivot.y * scale} width={width * scale} height={height * scale} />
    </g></g>
  </g>;
}

const rest = princessPose('idle', 0);
function Leg({ side }: { side: 'front' | 'back' }) {
  const rig = anatomy.legs[side], scale = anatomy.shoe.width / atlas.parts.shoe[2];
  return <g data-leg={side} transform={`translate(${rig.x} ${rig.y})`}>
    <g data-joint={`${side}-thigh`} transform={`rotate(${rest[`${side}-thigh`]})`}>
      <Bone part="thigh" length={rig.upper} landmarks={anatomy.thigh} />
      <g transform={`translate(0 ${rig.upper})`}><g data-joint={`${side}-shin`} transform={`rotate(${rest[`${side}-shin`]})`}>
        <Bone part="shin" length={rig.lower} landmarks={anatomy.shin} />
        <g transform={`translate(0 ${rig.lower})`}><g data-joint={`${side}-foot`} transform={`rotate(${rest[`${side}-foot`]})`}>
          <Part part="shoe" x={-anatomy.shoe.pivot.x * scale} y={-anatomy.shoe.pivot.y * scale}
            width={anatomy.shoe.width} height={atlas.parts.shoe[3] * scale} />
        </g></g>
      </g></g>
    </g>
  </g>;
}

function Arm({ side }: { side: 'front' | 'back' }) {
  const rig = anatomy.arms[side];
  return <g data-arm={side} transform={`translate(${rig.x} ${rig.y})`}>
    <g data-joint={`${side}-arm`} transform={`rotate(${rest[`${side}-arm`]})`}>
      <Bone part={rig.upperPart} length={rig.upper} landmarks={rig.upperArt} />
      <g transform={`translate(0 ${rig.upper})`}><g data-joint={`${side}-elbow`} transform={`rotate(${rest[`${side}-elbow`]})`}>
        <Bone part={rig.lowerPart} length={rig.lower} landmarks={rig.lowerArt} blendRoot />
      </g></g>
    </g>
  </g>;
}

/** Two planted feet, opposite arm swing, a fixed torso and a separate crown/head pivot. */
export function PaintedPrincessArtwork() {
  const prefix = useId().replace(/:/g, '');
  return <svg viewBox="0 0 160 210" className="character-artwork painted-princess-artwork"
    data-character="princess" data-artwork="imagegen" aria-hidden="true" focusable="false">
    <defs>
      <filter id={`${prefix}-far-limb`} colorInterpolationFilters="sRGB" x="-100%" y="-100%" width="300%" height="300%">
      <feComponentTransfer><feFuncR type="linear" slope=".88" /><feFuncG type="linear" slope=".88" /><feFuncB type="linear" slope=".88" /></feComponentTransfer>
    </filter></defs>
    <g filter={`url(#${prefix}-far-limb)`}><Leg side="back" /></g>
    <g transform={`translate(${anatomy.headPivot.x} ${anatomy.headPivot.y})`}><g data-joint="head" data-head-layer="back">
      <g transform={`translate(${anatomy.hairPivot.x - anatomy.headPivot.x} ${anatomy.hairPivot.y - anatomy.headPivot.y})`}><g data-joint="hair">
        <Part part="hair" x={anatomy.hair.x - anatomy.hairPivot.x} y={anatomy.hair.y - anatomy.hairPivot.y} width={anatomy.hair.width} height={anatomy.hair.height} />
      </g></g>
    </g></g>
    <Leg side="front" />
    <g filter={`url(#${prefix}-far-limb)`}><Arm side="back" /></g>
    <Part part="bodice" {...anatomy.bodice} />
    <g transform={`translate(${anatomy.skirtPivot.x} ${anatomy.skirtPivot.y})`}><g data-joint="skirt">
      <Part part="skirt" x={anatomy.skirt.x - anatomy.skirtPivot.x} y={anatomy.skirt.y - anatomy.skirtPivot.y} width={anatomy.skirt.width} height={anatomy.skirt.height} />
    </g></g>
    <Arm side="front" />
    <g transform={`translate(${anatomy.headPivot.x} ${anatomy.headPivot.y})`}><g data-joint="head" data-head-layer="front">
      <Part part="head" x={anatomy.head.x - anatomy.headPivot.x} y={anatomy.head.y - anatomy.headPivot.y} width={anatomy.head.width} height={anatomy.head.height} />
    </g></g>
  </svg>;
}

/** A bounded CSS crop stays visible when choices are tapped repeatedly on mobile. */
export function PaintedPrincessThumbnail({ label }: { label: string }) {
  const sheet = princessPart('thumbnail'), [x, y, width, height] = sheet.region;
  const scale = Math.min(160 / width, 186 / height), drawWidth = width * scale, drawHeight = height * scale;
  return <span className="character-artwork painted-animal-thumbnail" data-character="princess" data-artwork="imagegen" role="img" aria-label={label}>
    <span className="painted-thumbnail-crop" aria-hidden="true" style={{
      left: `${(160 - drawWidth) / 320 * 100}%`, top: `${(210 - drawHeight) / 420 * 100}%`,
      width: `${drawWidth / 160 * 100}%`, height: `${drawHeight / 210 * 100}%`,
      backgroundImage: `url("${assetPath(sheet.source)}")`,
      backgroundSize: `${sheet.width / width * 100}% ${sheet.height / height * 100}%`,
      backgroundPosition: `${x / (sheet.width - width) * 100}% ${y / (sheet.height - height) * 100}%`,
    }} />
  </span>;
}
