// Original 48-second, 60 BPM instrumental. Soft piano, a sparse gentle melody
// and slow warm chords, with no percussion or external samples.
export const MUSIC_RATE = 32000;
export const MUSIC_SECONDS = 48;
export function renderBackgroundMusic() {
  const length = MUSIC_RATE * MUSIC_SECONDS;
  const left = new Float32Array(length), right = new Float32Array(length);
  const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
  const voice = (start, midi, duration, volume, pan, pad = false) => {
    const f = frequency(midi), l = Math.sqrt((1 - pan) / 2), r = Math.sqrt((1 + pan) / 2);
    for (let i = 0; i < duration * MUSIC_RATE; i++) {
      const t = i / MUSIC_RATE;
      const envelope = pad ? Math.sin(Math.PI * Math.min(1, t / duration)) ** 2
        : (1 - Math.exp(-t / .018)) * Math.exp(-t / 1.25) * Math.min(1, (duration - t) / .5);
      const wave = pad ? Math.sin(2 * Math.PI * f * t) + .12 * Math.sin(2 * Math.PI * f * 2 * t)
        : Math.sin(2 * Math.PI * f * t) + .28 * Math.sin(2 * Math.PI * f * 2.002 * t) + .07 * Math.sin(2 * Math.PI * f * 3 * t);
      const sample = wave * envelope * volume, at = (Math.round(start * MUSIC_RATE) + i) % length;
      left[at] += sample * l; right[at] += sample * r;
    }
  };
  const chords = [[48,55,62,64], [45,52,60,67], [41,53,60,64], [43,55,62,69]];
  const melody = [[64,67], [69,67], [64,62], [67,null], [72,69], [67,64], [65,64], [62,null], [64,67], [69,64], [62,64], [67,null]];
  for (let bar = 0; bar < 12; bar++) {
    const chord = chords[bar % 4], start = bar * 4;
    chord.forEach((note, i) => voice(start - .6 + MUSIC_SECONDS, note, 5.2, .014, (i - 1.5) * .18, true));
    for (const [beat, index] of [[.25,0], [1.5,2], [2.75,1]]) voice(start + beat, chord[index] + 12, 4, .075, (index - 1) * .12);
    melody[bar].forEach((note, i) => { if (note !== null) voice(start + .75 + i * 2, note, 4.5, .055, .12); });
  }
  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  for (let i = 0; i < length; i++) {
    // A tiny breath at the phrase boundary prevents MP3 padding from clicking.
    const edge = Math.min(1, i / (MUSIC_RATE * .12), (length - 1 - i) / (MUSIC_RATE * .12));
    const gain = .45 / peak * edge;
    left[i] *= gain; right[i] *= gain;
  }
  return { left, right };
}
