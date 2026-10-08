import assert from 'node:assert/strict';

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
  assert.ok(previewHTML.includes('/timer/images/animal-design/natural-concepts-v2.png'), 'Incorrect animal art path');
  for (const match of previewHTML.matchAll(/(?:src|href)="(\/timer\/[^"?#]+\.(?:js|css))"/g)) assets.add(match[1]);
  const sounds = ['start', 'almost', 'finish', 'success', 'midpoint', 'sparkle', 'tick', 'strong-tick', 'whoosh', 'pop', 'land'];
  for (const path of [...sounds.map((sound) => `/timer/sounds/${sound}.mp3`), '/timer/images/meadow.svg', '/timer/images/meadow-night.svg', '/timer/images/icon.svg', '/timer/images/animal-design/natural-concepts-v2.png', ...assets]) {
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
