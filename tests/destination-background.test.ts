import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import manifest from '../src/lib/destinationScenery.json';
import scenery from '../src/lib/paintedScenery.json';
import { destinationLayout } from '../src/lib/destinationBackground';
import { finishGeometry } from '../src/lib/arrivalMotion';

const seasons = ['spring', 'summer', 'autumn', 'winter'] as const;
const assets = [...seasons.flatMap((season) => (['day', 'night'] as const).map((theme) => ({
  art: manifest[season][theme], original: `public${scenery[season][theme].src}`,
}))), { art: manifest.space, original: 'public/images/space-v1/nebula.webp' }];

test('all nine arrival bitmaps contain the landmark and preserve the painted surroundings', async () => {
  for (const { art, original } of assets) {
    const source = `public${art.src}`;
    const metadata = await sharp(source).metadata();
    assert.equal(metadata.width, art.width);
    assert.equal(metadata.height, art.height);
    const region = { left: art.paintBounds.x, top: art.paintBounds.y, width: art.paintBounds.width, height: art.paintBounds.height };
    const painted = await sharp(source).extract(region).removeAlpha().raw().toBuffer();
    const previous = await sharp(original).extract(region).removeAlpha().raw().toBuffer();
    let changed = 0;
    for (let i = 0; i < painted.length; i++) if (Math.abs(painted[i] - previous[i]) > 15) changed++;
    assert.ok(changed > painted.length * .12, `No painted arrival landmark in ${source}`);
    const sky = { left: 0, top: 0, width: art.width, height: Math.min(60, art.paintBounds.y) };
    assert.deepEqual(await sharp(source).extract(sky).removeAlpha().raw().toBuffer(),
      await sharp(original).extract(sky).removeAlpha().raw().toBuffer(), `Repainted unrelated scenery in ${source}`);
  }
});

test('painted landmark meets the fixed finish and ground/flight path without exposing background edges', () => {
  for (const { art } of assets) {
    for (const [width, height, actorWidth] of [[288, 288, 102.4], [358, 358, 124.8], [720, 300, 168], [844, 190, 90], [1100, 650, 168]]) {
      const lineX = finishGeometry(width, actorWidth).lineX;
      const layout = destinationLayout(art, width, height, lineX, actorWidth);
      const scale = layout.width / art.width;
      assert.ok(Math.abs(lineX + layout.left + art.anchor.x * scale - lineX) < 1e-8);
      assert.ok(Math.abs(layout.y + layout.top + art.anchor.y * scale - layout.y) < 1e-8);
      assert.ok(lineX + layout.left <= .001);
      assert.ok(lineX + layout.left + layout.width >= width - .001);
      assert.ok(layout.y + layout.top <= .001);
      const lowerEdge = art.kind === 'space' ? height : height * .78;
      assert.ok(layout.y + layout.top + layout.height >= lowerEdge - .001);
      assert.ok(Math.abs(layout.y - (art.kind === 'space' ? height * .78 - actorWidth * 105 / 160 : height * .78)) < 1e-8);
    }
  }
});
