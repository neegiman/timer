import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const origin = 'https://neegiman.github.io';
const target = `${origin}/timer/`;
try {
  const response = await fetch(target, { signal: AbortSignal.timeout(15_000) });
  assert.equal(response.status, 200, `${target} returned HTTP ${response.status}`);
  const html = await response.text();
  assert.ok(html.includes('약속 여행'), 'The deployed app is not this promise-journey timer');
  const assets = new Set([...html.matchAll(/(?:src|href)="(\/timer\/[^"?#]+\.(?:js|css))"/g)].map((match) => match[1]));
  assert.ok(assets.size > 0, 'Missing exported Next.js assets');
  const previewURL = `${target}animal-preview/`;
  const preview = await fetch(previewURL, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  assert.equal(preview.status, 200, 'Animal motion preview refresh failed');
  const previewHTML = await preview.text();
  assert.ok(previewHTML.includes('동물처럼 움직여요'), 'Missing animal motion preview');
  for (const id of ['rabbit', 'dog', 'cat', 'chick']) assert.ok(previewHTML.includes(`/timer/characters/raster-v1/${id}.webp`), `Incorrect ${id} art path`);
  assert.ok(!previewHTML.includes('data-animal-scene="bear"'), 'Removed bear still appears in preview');
  for (const match of previewHTML.matchAll(/(?:src|href)="(\/timer\/[^"?#]+\.(?:js|css))"/g)) assets.add(match[1]);
  const sounds = ['start', 'almost', 'finish', 'success', 'midpoint', 'sparkle', 'tick', 'strong-tick', 'whoosh', 'pop', 'land'];
  const animals = ['rabbit', 'dog', 'cat', 'chick', 'princess', 'princess-upper-v2'].map((id) => `/timer/characters/raster-v1/${id}.webp`);
  animals.push(...['dog', 'cat'].map((id) => `/timer/characters/raster-v1/${id}-torso-v7.webp`));
  const pixels = ['prince-upright-v3', 'car', 'train', 'rocket-horizontal-v3'].map((id) => `/timer/characters/pixel-v1/${id}.svg`);
  const storyIcons = ['handshake', 'bath', 'sleep', 'meal', 'tidy', 'outside', 'video', 'clock', 'rabbit'].map((id) => `/timer/images/story-v1/${id}.webp`);
  storyIcons.push(...['custom', 'home', 'flag', 'star'].map((id) => `/timer/images/story-v1/${id}.svg`));
  const appIcons = ['favicon-handshake-v1', 'promise-handshake-v1', 'apple-touch-handshake-v1'].map((id) => `/timer/images/${id}.png`);
  const scenery = JSON.parse(await readFile('src/lib/paintedScenery.json', 'utf8'));
  const paintings = Object.values(scenery).flatMap((season) => Object.values(season).map((asset) => `/timer${asset.src}`));
  assert.ok(html.includes('/timer/images/favicon-handshake-v1.png'), 'Missing deployed handshake favicon');
  assert.ok(html.includes('/timer/images/apple-touch-handshake-v1.png'), 'Missing deployed handshake home screen icon');
  for (const path of [...sounds.map((sound) => `/timer/sounds/${sound}.mp3`), ...animals, ...pixels, ...storyIcons, ...appIcons, ...paintings, '/timer/images/icon.svg', ...assets]) {
    const result = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(15_000) });
    assert.equal(result.status, 200, `${path}: HTTP ${result.status}`);
    assert.ok((await result.arrayBuffer()).byteLength > 0, `Empty asset ${path}`);
    console.log(`OK ${path}`);
  }
  const refresh = await fetch(target, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  assert.equal(refresh.status, 200, 'Production URL refresh failed');
  console.log(`Deployment verified: ${target}`);
} catch (error) {
  console.error(`Deployment is not verified: ${error.message}`);
  process.exitCode = 1;
}
