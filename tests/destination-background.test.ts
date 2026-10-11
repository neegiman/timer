import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import manifest from '../src/lib/destinationScenery.json';
import { destinationApproach, destinationLayout } from '../src/lib/destinationBackground';
import { finishGeometry } from '../src/lib/arrivalMotion';

const seasons = ['spring', 'summer', 'autumn', 'winter'] as const;
const assets = [...seasons.flatMap((season) => (['day', 'night'] as const).map((theme) => manifest[season][theme])), manifest.space];

test('destination stays visible in the distance, approaches continuously and stops at zero', () => {
  for (const width of [288, 358, 720, 1100]) {
    const lineX = finishGeometry(width, 100).lineX;
    let previous = destinationApproach(0, width, lineX);
    assert.ok(previous.scale > .3);
    assert.ok(lineX + previous.offsetX > width * .85);
    for (let i = 1; i <= 1000; i++) {
      const next = destinationApproach(i / 1000, width, lineX);
      assert.ok(next.offsetX < previous.offsetX);
      assert.ok(next.scale > previous.scale);
      assert.ok(previous.offsetX - next.offsetX < width * .001);
      assert.ok(next.scale - previous.scale < .001);
      previous = next;
    }
    assert.deepEqual(previous, { offsetX: 0, scale: 1 });
    assert.deepEqual(destinationApproach(2, width, lineX), previous);
    assert.deepEqual(destinationApproach(-1, width, lineX), destinationApproach(0, width, lineX));
    const before = destinationApproach(.89999, width, lineX);
    const after = destinationApproach(.90001, width, lineX);
    assert.ok(before.offsetX - after.offsetX < .1, '90% must not reveal or teleport the destination');
    assert.ok(after.scale - before.scale < .0001);
  }
});

test('all nine arrival paintings leave every pixel outside the landmark transparent', async () => {
  for (const art of assets) {
    const source = `public${art.src}`;
    const metadata = await sharp(source).metadata();
    assert.equal(metadata.width, art.width);
    assert.equal(metadata.height, art.height);
    assert.equal(metadata.hasAlpha, true, `Opaque arrival background in ${source}`);
    const pixels = await sharp(source).ensureAlpha().raw().toBuffer();
    let painted = 0;
    for (let y = 0; y < art.height; y++) for (let x = 0; x < art.width; x++) {
      const alpha = pixels[(y * art.width + x) * 4 + 3];
      const inside = x >= art.paintBounds.x && x < art.paintBounds.x + art.paintBounds.width
        && y >= art.paintBounds.y && y < art.paintBounds.y + art.paintBounds.height;
      if (inside && alpha > 16) painted++;
      if (!inside) assert.equal(alpha, 0, `Arrival would cover scenery at ${x},${y} in ${source}`);
    }
    assert.ok(painted > art.paintBounds.width * art.paintBounds.height * .2, `No arrival painting in ${source}`);
  }
});

test('painted landmark meets the fixed finish and ground/flight path without exposing background edges', () => {
  for (const art of assets) {
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
