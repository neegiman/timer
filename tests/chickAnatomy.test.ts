import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import atlases from '../src/lib/animalAtlases.json';
import { chickAnatomy, chickPawContact } from '../src/lib/chickAnatomy';

test('chick wing shoulder and leg joints use opaque painted landmarks', async () => {
  const atlas = atlases.chick;
  const { data, info } = await sharp('public/characters/raster-v1/chick.webp').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = (part: keyof typeof atlas.parts, point: { x: number; y: number }) => {
    const [left, top] = atlas.parts[part];
    return data[((top + point.y) * info.width + left + point.x) * 4 + 3];
  };
  const art = chickAnatomy.legArtwork;
  for (const [part, points] of [
    ['hindUpper', [art.upper.pivot, art.upper.tip]],
    ['hindLower', [art.lower.pivot, art.lower.tip]],
    ['hindPaw', [art.paw.pivot]],
    [chickAnatomy.wing.part, [chickAnatomy.wing.sourceRoot, chickAnatomy.wing.sourceTip]],
  ] as const) for (const point of points) for (const dx of [-2, 0, 2]) for (const dy of [-2, 0, 2]) {
    assert.ok(alpha(part, { x: point.x + dx, y: point.y + dy }) >= 160, `${part} pivot lies outside the painting`);
  }
  assert.ok(alpha('hindPaw', art.paw.sole) >= 160);
  const wing = chickAnatomy.wing, [, , w, h] = atlas.parts[wing.part];
  assert.ok(Math.abs(wing.width / wing.height - w / h) < .0001);
  assert.ok(Math.abs(wing.x + wing.sourceRoot.x * wing.width / w) < .0001);
  assert.ok(Math.abs(wing.y + wing.sourceRoot.y * wing.height / h) < .0001);
  assert.ok(wing.sourceTip.x < wing.sourceRoot.x);
});

test('chick contact point matches its painted toe instead of transparent atlas padding', () => {
  const paw = chickAnatomy.legArtwork.paw, scale = paw.width / atlases.chick.parts.hindPaw[2];
  assert.equal(chickPawContact.x, (paw.sole.x - paw.pivot.x) * scale);
  assert.equal(chickPawContact.y, (paw.sole.y - paw.pivot.y) * scale);
  assert.ok(chickPawContact.y > 5);
});
