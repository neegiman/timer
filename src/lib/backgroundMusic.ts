export const BACKGROUND_MUSIC = { name: 'gentle-journey-v1', volume: .22, fadeIn: 1.2, fadeOut: .7 } as const;

/** One decoded loop per AudioContext. The music cursor freezes on pause/mute;
 * changing the journey resets it. Pending downloads never revive a stopped song. */
export class BackgroundMusic {
  private session: string | null = null;
  private source: { node: AudioBufferSourceNode; gain: GainNode; start: number; duration: number } | null = null;
  private fading = new Set<AudioBufferSourceNode>();
  private offset = 0;
  private generation = 0;
  private wanted = false;
  private loading = false;

  constructor(private context: AudioContext, private load: () => Promise<AudioBuffer>, private onError: (locked: boolean) => void) {}

  sync(session: string | null, playing: boolean, fadeOut = .08) {
    if (session !== this.session) {
      this.pause(0); this.offset = 0; this.session = session;
    }
    if (!session || !playing) { this.pause(fadeOut); return; }
    this.wanted = true;
    if (this.source || this.loading) return;
    const epoch = ++this.generation;
    this.loading = true;
    void this.load().then(buffer => {
      if (epoch !== this.generation || !this.wanted) return;
      if (this.context.state !== 'running') { this.onError(true); return; }
      // A rapid pause/resume cancels any short fading tail before the next loop.
      for (const node of this.fading) { try { node.stop(); } catch {} }
      this.fading.clear();
      const node = this.context.createBufferSource(), gain = this.context.createGain();
      const now = this.context.currentTime;
      node.buffer = buffer; node.loop = true;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(BACKGROUND_MUSIC.volume, now + BACKGROUND_MUSIC.fadeIn);
      node.connect(gain); gain.connect(this.context.destination);
      node.onended = () => { this.fading.delete(node); node.disconnect(); gain.disconnect(); };
      try { node.start(0, this.offset % buffer.duration); }
      catch (error) { node.disconnect(); gain.disconnect(); throw error; }
      this.source = { node, gain, start: now, duration: buffer.duration };
    }).catch(() => {
      if (epoch === this.generation && this.wanted) this.onError(this.context.state !== 'running');
    }).finally(() => { if (epoch === this.generation) this.loading = false; });
  }

  pause(fade = .08) {
    this.wanted = false; this.generation++; this.loading = false;
    const active = this.source;
    if (!active) return;
    this.source = null;
    const now = this.context.currentTime;
    this.offset = (this.offset + Math.max(0, now - active.start)) % active.duration;
    const level = BACKGROUND_MUSIC.volume * Math.min(1, Math.max(0, now - active.start) / BACKGROUND_MUSIC.fadeIn);
    active.gain.gain.cancelScheduledValues(now);
    active.gain.gain.setValueAtTime(level, now);
    active.gain.gain.linearRampToValueAtTime(0, now + fade);
    this.fading.add(active.node);
    try { active.node.stop(now + fade); } catch {}
  }

  dispose() {
    this.pause(0);
    for (const node of this.fading) { try { node.stop(); } catch {} }
    this.fading.clear(); this.session = null; this.offset = 0;
  }
}
