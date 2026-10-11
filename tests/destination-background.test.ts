import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import manifest from '../src/lib/destinationScenery.json';
import { destinationLayout } from '../src/lib/destinationBackground';
import { arrivalMotion, finishGeometry } from '../src/lib/arrivalMotion';

const seasons = ['spring', 'summer', 'autumn', 'winter'] as const;
const assets = [...seasons.flatMap((season) => (['day', 'night'] as const).map((theme) => manifest[season][theme])), manifest.space];

test('every full-size destination enters at the right painted edge before its timed arrival', () => {
  for (const art of assets) for (const width of [288, 358, 720, 1100]) {
    const geometry = finishGeometry(width, 100), lineX = geometry.lineX;
    const layout = destinationLayout(art, width, 380, lineX, 100);
    const paintedLeft = layout.left + art.paintBounds.x * layout.width / art.width;
    for (const total of [60_000, 600_000, 7_200_000]) {
      let low = 0, high = total;
      for (let i = 0; i < 60; i++) {
        const time = (low + high) / 2;
        if (arrivalMotion(time, total, 0, geometry, .024).destinationX > layout.entryX) low = time;
        else high = time;
      }
      const entry = arrivalMotion(high, total, 0, geometry, .024);
      assert.ok(Math.abs(entry.destinationX + paintedLeft - width) < 1e-7);
      assert.ok(high > 0 && high < total);
      assert.ok(total - high < width / .024 + 2000, 'Entry must be tied to the remaining walking distance');
      if (total >= 600_000) assert.ok(high > total * .9, 'A long timer must not keep the landmark beside the child all journey');
      assert.ok(arrivalMotion(high + 100, total, 0, geometry, .024).destinationX + paintedLeft < width);
      assert.ok(Math.abs(arrivalMotion(total, total, 0, geometry, .024).destinationX - lineX) < 1e-7);
    }
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
