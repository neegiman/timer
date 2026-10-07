import type { Page } from '@playwright/test';

declare global { interface Window { playedSounds: string[]; audioDiagnostics: string[] } }

export async function instrumentAudio(page: Page) {
  await page.addInitScript(() => {
    window.playedSounds = [];
    window.audioDiagnostics = [];
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
        return buffer;
      } catch (error) { window.audioDiagnostics.push(String(error)); throw error; }
    };
    const create = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const source = create.call(this);
      const start = source.start.bind(source);
      source.start = (...args) => {
        if (source.buffer && audioNames.has(source.buffer)) window.playedSounds.push(audioNames.get(source.buffer)!);
        start(...args);
      };
      return source;
    };
  });
}

