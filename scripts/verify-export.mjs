import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('out');
async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const lists = await Promise.all(entries.map((entry) => entry.isDirectory() ? filesIn(path.join(directory, entry.name)) : [path.join(directory, entry.name)]));
  return lists.flat();
}
assert.ok((await stat(root)).isDirectory(), 'Missing out/');
const html = await readFile(path.join(root, 'index.html'), 'utf8');
assert.ok(html.includes('/timer/_next/'), 'Next assets must include /timer/');
assert.ok(html.includes('https://neegiman.github.io/timer/'), 'Canonical production URL mismatch');
const preview = await readFile(path.join(root, 'animal-preview', 'index.html'), 'utf8');
for (const id of ['rabbit', 'dog', 'cat', 'chick']) assert.ok(preview.includes(`/timer/characters/raster-v1/${id}.webp`), `Missing /timer-aware ${id} artwork`);
assert.ok(!preview.includes('data-animal-scene="bear"'), 'Removed bear still appears in preview');
assert.ok(preview.includes('https://neegiman.github.io/timer/animal-preview/'), 'Animal preview canonical mismatch');
const files = await filesIn(root);
let inspected = 0;
for (const file of files) {
  if (!/\.(html|css|js|json|txt)$/.test(file)) continue;
  const content = await readFile(file, 'utf8');
  // Inspect actual src/href/poster/url references rather than harmless Next internals.
  const refs = [...content.matchAll(/(?:src|href|poster)=["'](\/[^"']+)["']|url\(["']?(\/[^)'"\s]+)/g)];
  for (const match of refs) {
    const ref = match[1] ?? match[2];
    assert.ok(ref.startsWith('/timer/'), `Incorrect root reference ${ref} in ${path.relative(root, file)}`);
    const relative = decodeURIComponent(ref.slice('/timer/'.length).split(/[?#]/)[0]);
    if (relative && !relative.endsWith('/')) assert.ok((await stat(path.join(root, relative))).isFile(), `Missing referenced asset ${ref}`);
  }
  inspected++;
}
const soundFiles = (await readdir(path.join(root, 'sounds'))).filter((name) => name.endsWith('.mp3'));
assert.equal(soundFiles.length, 11, 'Missing animation sound assets');
for (const animal of ['rabbit', 'dog', 'cat', 'chick', 'princess', 'princess-upper-v2']) {
  const file = await stat(path.join(root, 'characters', 'raster-v1', `${animal}.webp`));
  assert.ok(file.size > 100_000, `Missing painted ${animal} atlas`);
}
for (const file of [...soundFiles.map((name) => `sounds/${name}`), 'characters/pixel-v1/prince.svg', 'images/meadow.svg', 'images/meadow-night.svg', 'images/icon.svg', 'images/apple-touch-icon.png', '.nojekyll']) {
  const info = await stat(path.join(root, file));
  assert.ok(info.isFile(), `Missing ${file}`);
  if (file.endsWith('.mp3')) assert.ok(info.size > 1000, `Empty audio: ${file}`);
  if (file.endsWith('prince.svg')) assert.ok(info.size > 1000, 'Empty pixel prince atlas');
}
console.log(`Static export verified: ${inspected} content files, /timer/_next assets, images and ${soundFiles.length} MP3 files.`);
console.log('Target: https://neegiman.github.io/timer/ — no Next.js runtime required.');
