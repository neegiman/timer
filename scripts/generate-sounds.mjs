import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';

// Original gentle chimes, generated locally. No remote sound dependencies or licenses.
const require = createRequire(import.meta.url);
const scope = {};
runInNewContext(await readFile(require.resolve('lamejs/lame.all.js'), 'utf8'), scope);
const rate = 44100;
await mkdir('public/sounds', { recursive: true });
const melodies = {
  start: [[0, 523.25], [.17, 659.25], [.34, 783.99]],
  almost: [[0, 659.25], [.28, 783.99]],
  finish: [[0, 523.25], [.20, 659.25], [.40, 783.99], [.70, 1046.5], [.70, 659.25], [1.1, 783.99]],
  success: [[0, 783.99], [.20, 1046.5], [.40, 1318.51]],
  midpoint: [[0, 659.25], [.15, 783.99]],
  sparkle: [[0, 1046.5], [.12, 1318.51]],
  tick: [[0, 660]],
  'strong-tick': [[0, 780]],
  whoosh: [[0, 220], [.08, 330]],
  pop: [[0, 440], [.06, 660]],
  land: [[0, 523.25], [.12, 783.99]],
};
for (const [name, notes] of Object.entries(melodies)) {
  const decay = name.includes('tick') ? .13 : name === 'pop' || name === 'whoosh' ? .24 : name === 'land' ? .36 : 1.1;
  const volume = name === 'tick' ? .05 : name === 'strong-tick' ? .07 : .13;
  const length = Math.ceil((Math.max(...notes.map(([time]) => time)) + decay) * rate);
  const samples = new Int16Array(length);
  for (let i = 0; i < length; i++) {
    const time = i / rate;
    let signal = 0;
    for (const [start, frequency] of notes) {
      const t = time - start;
      if (t < 0 || t > decay) continue;
      const envelope = Math.min(1, t / .009) * Math.exp(-t * 5) * Math.min(1, (decay - t) / .04);
      const pitch = name === 'whoosh' ? frequency + 400 * t : frequency;
      signal += (Math.sin(2 * Math.PI * pitch * t) + .2 * Math.sin(2 * Math.PI * pitch * 2 * t)) * envelope * volume;
    }
    samples[i] = Math.max(-32767, Math.min(32767, signal * 32767));
  }
  const encoder = new scope.lamejs.Mp3Encoder(1, rate, 128);
  const chunks = [];
  for (let i = 0; i < samples.length; i += 1152) chunks.push(Buffer.from(encoder.encodeBuffer(samples.subarray(i, i + 1152))));
  chunks.push(Buffer.from(encoder.flush()));
  await writeFile(`public/sounds/${name}.mp3`, Buffer.concat(chunks));
  console.log(`Generated ${name}.mp3`);
}

const sharp = require('sharp');
await sharp('public/images/icon.svg').resize(180, 180).png().toFile('public/images/apple-touch-icon.png');
console.log('Generated apple-touch-icon.png');
