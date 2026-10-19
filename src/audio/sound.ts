import type { Landing } from '../sim/flip';
import { INTENSITY_MAX, MAX_STREAK } from '../sim/rules';

/** F minor pentatonic from F4, in semitones: what the chords climb through. */
const SCALE = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24];
const F4 = 349.23;
const VOLUME = 0.8;

const note = (semis: number) => F4 * 2 ** (semis / 12);

/**
 * The game's sounds, synthesised with Web Audio as they play: no audio
 * files. A browser lets sound start only after a tap or a key, so unlock()
 * is called from those; until then, and while muted, nothing plays.
 */
export class Sound {
  private ctx: BaseAudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private hiss: GainNode | null = null;
  private muted = false;
  /** Where sounds go on the context's clock, when set: for rendering a recording's soundtrack offline. */
  private base: number | null = null;

  constructor(muted: boolean) {
    this.muted = muted;
  }

  /** Sounds played into a context of one's own, at the times at() sets: an offline one, for a clip's soundtrack. */
  static into(ctx: BaseAudioContext, out: AudioNode = ctx.destination): Sound {
    const sound = new Sound(false);
    sound.build(ctx, out);
    sound.base = 0;
    return sound;
  }

  /** Plays what comes next at `time` seconds on the context's clock. */
  at(time: number): this {
    this.base = time;
    return this;
  }

  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      this.build(ctx, ctx.destination);
    }
    if (this.ctx instanceof AudioContext && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private build(ctx: BaseAudioContext, out: AudioNode): void {
    const comp = ctx.createDynamicsCompressor();
    comp.connect(out);
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : VOLUME;
    this.master.connect(comp);
    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.ctx = ctx;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(muted ? 0 : VOLUME, this.now(this.ctx), 0.02);
  }

  /** The flick: a rush of air, longer and brighter the harder it was. */
  whoosh(intensity: number): void {
    const k = Math.min(1, intensity / INTENSITY_MAX);
    this.noise(0, 0.16 + 0.32 * k, 0.2 + 0.3 * k, 'bandpass', 500, 1800 + 3600 * k, 1.2);
    this.tone(0, 0.08, 'square', 0.06, 180, 120);
  }

  /** A quarter turn gone by in the air. */
  tick(): void {
    this.noise(0, 0.03, 0.09, 'highpass', 3200);
  }

  /** The Roadster's jets: a hiss from 0 to 1 while they burn. */
  thrust(level: number): void {
    const ctx = this.live();
    if (!ctx || !this.noiseBuf || !this.master) return;
    if (!this.hiss) {
      if (level <= 0) return;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 2200;
      f.Q.value = 0.8;
      this.hiss = ctx.createGain();
      this.hiss.gain.value = 0;
      src.connect(f).connect(this.hiss).connect(this.master);
      src.start(this.now(ctx));
    }
    this.hiss.gain.setTargetAtTime(0.12 * Math.max(0, Math.min(1, level)), this.now(ctx), 0.04);
  }

  /** Down on its wheels: a snap and a chord, higher the longer the streak; a bell for PERFECT, a flourish for a trick. */
  land(l: Landing, streak: number): void {
    this.tone(0, 0.12, 'sine', 0.45, 140, 55);
    this.noise(0, 0.07, 0.25, 'lowpass', 1400);
    const step = Math.min(streak, MAX_STREAK) - 1;
    const root = SCALE[Math.min(step, SCALE.length - 3)]!;
    [0, 4, 7].forEach((s, i) => this.tone(0.04 + i * 0.05, 0.32, 'triangle', 0.14, note(root + s)));
    if (l.verdict === 'perfect') {
      const bell = note(root + 24);
      this.tone(0.18, 0.9, 'sine', 0.1, bell);
      this.tone(0.18, 0.6, 'sine', 0.04, bell * 2.76);
    }
    for (let i = 0; i < l.extra * 4; i++) this.tone(0.2 + i * 0.045, 0.14, 'square', 0.05, note(root + 12 + SCALE[i % SCALE.length]!));
  }

  /** On its side or its roof: a thud, and a tone falling away. */
  miss(): void {
    this.tone(0, 0.3, 'sine', 0.55, 95, 38);
    this.noise(0, 0.12, 0.3, 'lowpass', 700);
    this.tone(0.08, 0.55, 'sawtooth', 0.07, 420, 70, 1200);
  }

  /** A life earned: a little rising jingle. */
  life(): void {
    [12, 16, 19, 24].forEach((s, i) => this.tone(0.35 + i * 0.08, 0.2, 'square', 0.07, note(s)));
  }

  /** Out of lives: four notes down. */
  over(): void {
    [7, 3, 0, -5].forEach((s, i) => this.tone(i * 0.2, 0.32, 'triangle', 0.14, note(s)));
  }

  /** A tap: the object hops. */
  hop(): void {
    this.tone(0, 0.09, 'square', 0.05, 320, 540);
  }

  /** The next one rolls in. */
  roll(): void {
    this.noise(0, 0.35, 0.05, 'lowpass', 500, 900);
  }

  private live(): BaseAudioContext | null {
    if (!this.ctx || !this.master || this.muted) return null;
    // A live context plays only once it runs; an offline one plays whenever it's told to.
    return this.base !== null || this.ctx.state === 'running' ? this.ctx : null;
  }

  private now(ctx: BaseAudioContext): number {
    return this.base ?? ctx.currentTime;
  }

  private tone(at: number, dur: number, type: OscillatorType, vol: number, freq: number, to?: number, lowpass?: number): void {
    const ctx = this.live();
    if (!ctx) return;
    const t = this.now(ctx) + at;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.012, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out: AudioNode = osc;
    if (lowpass) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lowpass;
      out = out.connect(f);
    }
    out.connect(g).connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private noise(at: number, dur: number, vol: number, type: BiquadFilterType, freq: number, to?: number, q = 1): void {
    const ctx = this.live();
    if (!ctx || !this.noiseBuf) return;
    const t = this.now(ctx) + at;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.01, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master!);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }
}
