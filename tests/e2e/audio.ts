import type { Page } from '@playwright/test';

declare global { interface Window {
  playedSounds: string[]; audioDiagnostics: string[];
  musicEvents: { type: 'start' | 'stop' | 'end'; id: number; offset: number; loop: boolean; time: number }[];
  musicBuffers: { duration: number; channels: number; peak: number }[];
} }

export async function instrumentAudio(page: Page) {
  await page.addInitScript(() => {
    window.playedSounds = [];
    window.audioDiagnostics = [];
    window.musicEvents = []; window.musicBuffers = [];
    if (typeof AudioContext === 'undefined') return;
    const bufferNames = new WeakMap<ArrayBuffer, string>();
    const audioNames = new WeakMap<AudioBuffer, string>();
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const url = String(args[0]);
      if (url.includes('/sounds/')) {
        const arrayBuffer = response.arrayBuffer.bind(response);
        response.arrayBuffer = async () => { const bytes = await arrayBuffer(); bufferNames.set(bytes, url); return bytes; };
      }
      return response;
    };
    const decode = AudioContext.prototype.decodeAudioData;
    AudioContext.prototype.decodeAudioData = async function (bytes) {
      try {
        const buffer = await decode.call(this, bytes);
        audioNames.set(buffer, bufferNames.get(bytes) ?? 'unknown');
        if ((bufferNames.get(bytes) ?? '').endsWith('/gentle-journey-v1.mp3')) {
          let peak = 0;
          for (const channel of [0, 1]) for (const sample of buffer.getChannelData(channel)) peak = Math.max(peak, Math.abs(sample));
          window.musicBuffers.push({ duration: buffer.duration, channels: buffer.numberOfChannels, peak });
        }
        return buffer;
      } catch (error) { window.audioDiagnostics.push(String(error)); throw error; }
    };
    const create = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const source = create.call(this);
      let musicId = -1;
      const start = source.start.bind(source);
      source.start = (...args) => {
        if (source.buffer && audioNames.has(source.buffer)) window.playedSounds.push(audioNames.get(source.buffer)!);
        if (source.buffer && (audioNames.get(source.buffer) ?? '').endsWith('/gentle-journey-v1.mp3')) {
          musicId = window.musicEvents.filter(event => event.type === 'start').length;
          window.musicEvents.push({ type: 'start', id: musicId, offset: args[1] ?? 0, loop: source.loop, time: source.context.currentTime });
        }
        start(...args);
      };
      const stop = source.stop.bind(source);
      source.stop = (...args) => {
        if (musicId >= 0) window.musicEvents.push({ type: 'stop', id: musicId, offset: 0, loop: source.loop, time: args[0] ?? source.context.currentTime });
        stop(...args);
      };
      source.addEventListener('ended', () => { if (musicId >= 0) window.musicEvents.push({ type: 'end', id: musicId, offset: 0, loop: source.loop, time: source.context.currentTime }); });
      return source;
    };
  });
}
