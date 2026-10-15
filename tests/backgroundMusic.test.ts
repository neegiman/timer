import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import { BACKGROUND_MUSIC, BackgroundMusic } from '../src/lib/backgroundMusic';
import { MUSIC_RATE, MUSIC_SECONDS, renderBackgroundMusic } from '../scripts/background-music-score.mjs';
import { assetPath } from '../src/lib/assetPath';

function audio() {
  const nodes: { loop: boolean; buffer: unknown; offset: number; stopped: number | null; onended: (() => void) | null; start: (time: number, offset: number) => void; stop: (time?: number) => void; connect: () => void; disconnect: () => void }[] = [];
  const ramps: { value: number; time: number }[] = [];
  const ctx = { currentTime: 0, state: 'running', destination: {},
    createBufferSource() {
      const node = { loop: false, buffer: null as unknown, offset: -1, stopped: null as number | null, onended: null as (() => void) | null,
        start(_time: number, offset: number) { this.offset = offset; },
        stop(time = ctx.currentTime) { this.stopped = time; }, connect() {}, disconnect() {} };
      nodes.push(node); return node;
    },
    createGain: () => ({ connect() {}, disconnect() {}, gain: { cancelScheduledValues() {}, setValueAtTime() {},
      linearRampToValueAtTime(value: number, time: number) { ramps.push({ value, time }); } } }),
  };
  return { ctx, nodes, ramps, context: ctx as unknown as AudioContext };
}
const flush = () => new Promise<void>(resolve => setImmediate(resolve));
const buffer = { duration: 48 } as AudioBuffer;

test('one quiet native loop survives repeated renders and resumes at the paused music cursor', async () => {
  const a = audio(); let loads = 0;
  const music = new BackgroundMusic(a.context, async () => { loads++; return buffer; }, () => assert.fail('Unexpected audio failure'));
  music.sync('first', true); music.sync('first', true); await flush();
  music.sync('first', true); assert.equal(loads, 1); assert.equal(a.nodes.length, 1);
  assert.equal(a.nodes[0].loop, true); assert.equal(a.nodes[0].offset, 0);
  assert.deepEqual(a.ramps[0], { value: BACKGROUND_MUSIC.volume, time: BACKGROUND_MUSIC.fadeIn });
  a.ctx.currentTime = 12.3; music.pause(); a.ctx.currentTime = 28;
  music.sync('first', true); await flush();
  assert.equal(a.nodes[1].offset, 12.3, 'Paused wall time must not advance or reset the music');
  a.ctx.currentTime = 32; music.sync('second', true); await flush();
  assert.equal(a.nodes[2].offset, 0, 'A new journey must restart the song'); music.dispose();
  assert.ok(a.nodes.every(node => node.stopped !== null));
});

test('a paused, muted or exited journey cannot be revived by delayed music decoding', async () => {
  for (const operation of ['pause', 'mute', 'exit', 'dispose'] as const) {
    const a = audio(); let resolve!: (value: AudioBuffer) => void;
    const music = new BackgroundMusic(a.context, () => new Promise<AudioBuffer>(r => { resolve = r; }), () => assert.fail('Unexpected failure'));
    music.sync('first', true);
    if (operation === 'dispose') music.dispose(); else if (operation === 'exit') music.sync(null, false); else music.sync('first', false);
    resolve(buffer); await flush(); assert.equal(a.nodes.length, 0, operation);
  }
});

test('music fades before celebration, retries interruption and frees every source', async () => {
  const a = audio(), errors: boolean[] = [];
  const music = new BackgroundMusic(a.context, async () => buffer, locked => errors.push(locked));
  a.ctx.state = 'suspended'; music.sync('first', true); await flush(); assert.deepEqual(errors, [true]);
  a.ctx.state = 'running'; music.sync('first', true); await flush();
  a.ctx.currentTime = 5; music.sync('first', false, BACKGROUND_MUSIC.fadeOut);
  assert.equal(a.nodes[0].stopped, 5 + BACKGROUND_MUSIC.fadeOut);
  assert.deepEqual(a.ramps.at(-1), { value: 0, time: 5 + BACKGROUND_MUSIC.fadeOut });
  music.dispose(); assert.equal(a.nodes[0].stopped, 5);
});

test('the original stereo score is quiet, unclipped and fades at both loop edges', async () => {
  const { left, right } = renderBackgroundMusic();
  assert.equal(left.length, MUSIC_RATE * MUSIC_SECONDS); assert.equal(right.length, left.length);
  let peak = 0, sum = 0, difference = 0;
  for (let i = 0; i < left.length; i++) {
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i])); sum += left[i] ** 2;
    difference += Math.abs(left[i] - right[i]);
  }
  assert.ok(peak <= .451 && peak > .4); assert.ok(Math.sqrt(sum / left.length) > .02);
  assert.ok(difference > 100, 'The instrumental must have a gentle stereo image');
  for (const channel of [left, right]) { assert.ok(Math.abs(channel[0]) < 1e-9); assert.ok(Math.abs(channel.at(-1)!) < 1e-9); }
  assert.equal(assetPath(`/sounds/${BACKGROUND_MUSIC.name}.mp3`), '/timer/sounds/gentle-journey-v1.mp3');
  const file = await stat(`public/sounds/${BACKGROUND_MUSIC.name}.mp3`);
  assert.ok(file.size > 100_000 && file.size < 900_000, 'Music must fit a small static download');
});
