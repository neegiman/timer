import { useId } from 'react';
import atlas from '@/lib/princessAtlas.json';
import { princessAnatomy as anatomy, princessPose } from '@/lib/princessMotion';
import { assetPath } from '@/lib/assetPath';

type PartName = keyof typeof atlas.parts;
type Landmark = { pivot: { x: number; y: number }; tip: { x: number; y: number } };
const source = assetPath('/characters/raster-v1/princess.webp');

/** Keep the original painted proportions; only the SVG viewport selects each cutout. */
function Part({ part, x, y, width, height }: { part: PartName; x: number; y: number; width: number; height: number }) {
  return <svg x={x} y={y} width={width} height={height} viewBox={atlas.parts[part].join(' ')}
    preserveAspectRatio="none" overflow="hidden" data-painted-part={part}>
    <image href={source} width={atlas.width} height={atlas.height} />
  </svg>;
}

function Bone({ part, length, landmarks }: { part: PartName; length: number; landmarks: Landmark }) {
  const dx = landmarks.tip.x - landmarks.pivot.x, dy = landmarks.tip.y - landmarks.pivot.y;
  const scale = length / Math.hypot(dx, dy), [, , width, height] = atlas.parts[part];
  return <g transform={`rotate(${90 - Math.atan2(dy, dx) * 180 / Math.PI})`}>
    <Part part={part} x={-landmarks.pivot.x * scale} y={-landmarks.pivot.y * scale} width={width * scale} height={height * scale} />
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
      <Bone part={side === 'front' ? 'upperArm' : 'backUpperArm'} length={rig.upper} landmarks={rig.upperArt} />
      <g transform={`translate(0 ${rig.upper})`}><g data-joint={`${side}-elbow`} transform={`rotate(${rest[`${side}-elbow`]})`}>
        <Bone part={side === 'front' ? 'foreArm' : 'backForeArm'} length={rig.lower} landmarks={rig.lowerArt} />
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
    <g filter={`url(#${prefix}-far-limb)`}><Arm side="back" /><Leg side="back" /></g>
    <Leg side="front" />
    <Part part="bodice" {...anatomy.bodice} />
    <g transform={`translate(${anatomy.skirtPivot.x} ${anatomy.skirtPivot.y})`}><g data-joint="skirt">
      <Part part="skirt" x={anatomy.skirt.x - anatomy.skirtPivot.x} y={anatomy.skirt.y - anatomy.skirtPivot.y} width={anatomy.skirt.width} height={anatomy.skirt.height} />
    </g></g>
    <Arm side="front" />
    <g transform={`translate(${anatomy.headPivot.x} ${anatomy.headPivot.y})`}><g data-joint="head">
      <Part part="head" x={anatomy.head.x - anatomy.headPivot.x} y={anatomy.head.y - anatomy.headPivot.y} width={anatomy.head.width} height={anatomy.head.height} />
    </g></g>
  </svg>;
}

/** A bounded CSS crop stays visible when choices are tapped repeatedly on mobile. */
export function PaintedPrincessThumbnail({ label }: { label: string }) {
  const [x, y, width, height] = atlas.parts.thumbnail;
  const scale = Math.min(160 / width, 186 / height), drawWidth = width * scale, drawHeight = height * scale;
  return <span className="character-artwork painted-animal-thumbnail" data-character="princess" data-artwork="imagegen" role="img" aria-label={label}>
    <span className="painted-thumbnail-crop" aria-hidden="true" style={{
      left: `${(160 - drawWidth) / 320 * 100}%`, top: `${(210 - drawHeight) / 420 * 100}%`,
      width: `${drawWidth / 160 * 100}%`, height: `${drawHeight / 210 * 100}%`,
      backgroundImage: `url("${source}")`,
      backgroundSize: `${atlas.width / width * 100}% ${atlas.height / height * 100}%`,
      backgroundPosition: `${x / (atlas.width - width) * 100}% ${y / (atlas.height - height) * 100}%`,
    }} />
  </span>;
}
