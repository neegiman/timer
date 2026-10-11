import { memo, type ReactNode } from 'react';
import art from '@/lib/paintedScenery.json';
import { assetPath } from '@/lib/assetPath';
import type { Season } from '@/lib/seasons';

interface PaintedAsset { src: string; width: number; height: number }
const paint = (asset: PaintedAsset) => ({ backgroundImage: `url("${assetPath(asset.src)}")` });

function Layer({ name, rate, tileScale, children }: { name: string; rate: number; tileScale?: number; children: ReactNode }) {
  return <div className={`parallax-layer ${name}-layer`} data-layer={name} data-rate={rate} data-tile-scale={tileScale} aria-hidden="true">{children}</div>;
}

/** Measured painted strips repeat independently; ground shares the feet's pixel speed. */
export const ScrollingScenery = memo(function ScrollingScenery({ season }: { season: Season }) {
  const scene = art[season];
  return <div className="painted-environment" data-scenery="painted-v1" aria-hidden="true">
    <Layer name="hill" rate={.14} tileScale={.78 * scene.day.width / scene.day.height}>
      <div className="scenery-paint scene-day" data-scenery-src={assetPath(scene.day.src)} style={paint(scene.day)} />
      <div className="scenery-paint scene-night" data-scenery-src={assetPath(scene.night.src)} style={paint(scene.night)} />
    </Layer>
    <div className="scenery-light" data-scenery-light />
    <Layer name="tree" rate={.55} tileScale={.62 * scene.trees.width / scene.trees.height}>
      <div className="scenery-paint painted-trees" data-scenery-src={assetPath(scene.trees.src)} style={paint(scene.trees)} />
    </Layer>
    <Layer name="ground" rate={1}>
      <div className="scenery-paint scenery-ground-day" data-scenery-src={assetPath(scene.dayGround.src)} style={paint(scene.dayGround)} />
      <div className="scenery-paint scenery-ground-night" data-scenery-src={assetPath(scene.nightGround.src)} style={paint(scene.nightGround)} />
    </Layer>
  </div>;
});
