import fs from 'node:fs/promises';
import sharp from 'sharp';
const names = ['torso', 'head', 'earNear', 'earFar', 'tail', 'hindUpper', 'hindLower', 'hindPaw', 'foreUpper', 'foreLower', 'forePaw', 'thumbnail'];
const manifest = {};
(async () => {
  for (const id of ['rabbit', 'bear', 'dog', 'cat', 'chick']) {
    const source = `docs/character-design/raster-v1/atlases/${id}.png`;
    const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const visited = new Uint8Array(info.width * info.height), queue = new Int32Array(visited.length), components = [];
    for (let start = 0; start < visited.length; start++) {
      if (visited[start] || data[start * 4 + 3] < 160) continue;
      let read = 0, write = 1, left = info.width, top = info.height, right = 0, bottom = 0;
      visited[start] = 1; queue[0] = start;
      while (read < write) {
        const pixel = queue[read++], x = pixel % info.width, y = Math.floor(pixel / info.width);
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
        for (const next of [x > 0 ? pixel - 1 : -1, x + 1 < info.width ? pixel + 1 : -1, y > 0 ? pixel - info.width : -1, y + 1 < info.height ? pixel + info.width : -1]) {
          if (next < 0 || visited[next] || data[next * 4 + 3] < 160) continue;
          visited[next] = 1; queue[write++] = next;
        }
      }
      if (write > 500) components.push({ left, right, top, bottom, area: write });
    }
    const selected = components.sort((a, b) => b.area - a.area).slice(0, 12);
    if (selected.length !== 12) throw new Error(`Missing ${id} atlas parts`);
    const ordered = [0, 1, 2].flatMap((row) => {
      const parts = selected.filter((part) => Math.min(2, Math.floor((part.top + part.bottom) / 2 / info.height * 3)) === row).sort((a, b) => a.left - b.left);
      if (parts.length !== 4) throw new Error(`${id} row ${row + 1} must have four separate parts`);
      return parts;
    });
    const parts = {};
    for (let slot = 0; slot < 12; slot++) {
      let { left, top, right, bottom } = ordered[slot];
      left = Math.max(0, left - 6); top = Math.max(0, top - 6); right = Math.min(info.width - 1, right + 6); bottom = Math.min(info.height - 1, bottom + 6);
      parts[names[slot]] = [left, top, right - left + 1, bottom - top + 1];
    }
    // Lossless format conversion only: no cropping, retouching or alpha removal.
    await sharp(source).webp({ lossless: true, effort: 6 }).toFile(`public/characters/raster-v1/${id}.webp`);
    manifest[id] = { width: info.width, height: info.height, parts };
    console.log(`${id}: ${info.width}×${info.height}, 12 parts, ${(await fs.stat(`public/characters/raster-v1/${id}.webp`)).size} bytes`);
  }
  await fs.writeFile('src/lib/animalAtlases.json', JSON.stringify(manifest, null, 2) + '\n');
})();
