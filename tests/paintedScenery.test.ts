import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import sharp from 'sharp';
import paintings from '../src/lib/paintedScenery.json';

test('all seasonal paintings decode and join seamlessly at both sides of each repeat', async () => {
  for (const [season, assets] of Object.entries(paintings)) {
    let bytes = 0;
    for (const [kind, asset] of Object.entries(assets)) {
      const file = `public${asset.src}`;
      bytes += (await stat(file)).size;
      const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.equal(info.width, asset.width);
      assert.equal(info.height, asset.height);
      for (let y = 0; y < info.height; y++) for (const [a, b] of [[0, info.width - 1], [info.width / 2 - 1, info.width / 2]]) {
        const left = (y * info.width + a) * 4, right = (y * info.width + b) * 4;
        assert.equal(data[left + 3], data[right + 3], `${season}/${kind}: alpha seam at row ${y}`);
        // RGB below zero alpha is discarded by WebP and cannot paint a seam.
        if (data[left + 3] > 0) assert.deepEqual(data.subarray(left, left + 3), data.subarray(right, right + 3), `${season}/${kind}: seam at row ${y}`);
      }
      if (kind.endsWith('Ground')) assert.equal(info.width, 480, 'Ground repeat must retain gait pixel speed');
      if (kind === 'trees') assert.equal(data[(Math.floor(info.width / 4) * 4) + 3], 0, 'Tree artwork needs transparent sky');
    }
    assert.ok(bytes < 4_000_000, `${season} exceeds the complete day/night scenery budget`);
  }
});
