import { type Flight, type Landing, fly, judge, launch } from './flip';
import { type Thing, thing } from './objects';
import * as R from './rules';
import { Sequence } from './sequence';

/**
 * ready: at rest, waiting for a flick. air: flipping. landed: down, with its
 * verdict. reset: righting itself after a miss. roll: off it goes, and the
 * next one rolls in.
 */
export type Phase = 'ready' | 'air' | 'landed' | 'reset' | 'roll';
const PHASES: Phase[] = ['ready', 'air', 'landed', 'reset', 'roll'];

export type GameEvent =
  | { type: 'launch'; intensity: number }
  | { type: 'land'; landing: Landing }
  | { type: 'next'; id: string }
  | { type: 'over' };

/**
 * A run: objects one after another, each flipped until it lands on its
 * wheels, three lives in all. Pure and deterministic: the same seed and the
 * same flicks on the same ticks give the same run, in a browser, a Worker or
 * a script. No clock, no Math.random, integers only.
 */
export class Game {
  private readonly sequence: Sequence;
  tick = 0;
  /** Objects landed so far. The one up now is number index + 1. */
  index = 0;
  thing: Thing;
  /** The object rolling off, while it does. */
  previous: Thing | null = null;
  phase: Phase = 'ready';
  /** Ticks since the phase began. */
  phaseTicks = 0;
  /** The flip in the air, or the last one, until the next flick. */
  flight: Flight | null = null;
  /** How the last flip landed, until the next flick. */
  landing: Landing | null = null;
  lives = R.LIVES;
  score = 0;
  /** Clean landings in a row, and the longest such run. */
  streak = 0;
  best = 0;
  perfects = 0;
  /** A flick made while busy, used as soon as it can be. */
  queued = 0;
  over = false;
  /** What happened in the last tick. */
  events: GameEvent[] = [];

  constructor(readonly seed: string) {
    this.sequence = new Sequence(seed);
    this.thing = thing(this.sequence.at(0));
  }

  /** The level is the object's number in the run: windows narrow with it, and points grow. */
  get level(): number {
    return this.index + 1;
  }

  /**
   * One tick. `intensity` is a flick's strength, from INTENSITY_MIN to
   * INTENSITY_MAX, or 0 for none. A flick at rest launches; one during a
   * reset or a roll-in cuts it short and launches; one in the air or during
   * a landing waits for the end of it.
   */
  step(intensity: number): void {
    this.events = [];
    if (this.over) return;
    this.tick++;
    if (intensity >= R.INTENSITY_MIN) this.queued = Math.min(Math.floor(intensity), R.INTENSITY_MAX);
    this.phaseTicks++;
    if (this.phase === 'air') {
      fly(this.flight!, this.thing);
      if (this.flight!.t >= this.flight!.air) this.land();
    } else if (this.phase === 'landed') {
      if (this.phaseTicks >= R.LAND_TICKS) this.afterLanding();
    } else if (this.phase === 'reset') {
      if (this.phaseTicks >= R.RESET_TICKS) this.enter('ready');
    } else if (this.phase === 'roll') {
      if (this.phaseTicks >= R.ROLL_TICKS) this.enter('ready');
    }
    if (this.over || !this.queued) return;
    if (this.phase === 'ready' || this.phase === 'reset' || this.phase === 'roll') {
      const i = this.queued;
      this.queued = 0;
      this.previous = null;
      this.flight = launch(this.thing, i);
      this.landing = null;
      this.enter('air');
      this.events.push({ type: 'launch', intensity: i });
    }
  }

  /** A 32-bit hash of the state: two runs that end the same hash the same. */
  hash(): number {
    const f = this.flight;
    const parts = [this.tick, this.index, this.lives, this.score, this.streak, this.best, this.perfects, PHASES.indexOf(this.phase), this.phaseTicks, this.queued, this.over ? 1 : 0];
    if (f) parts.push(f.intensity, f.t, f.angle, f.height);
    let h = 0x811c9dc5;
    for (const n of parts) {
      for (const word of [n >>> 0, Math.floor(n / 4294967296) >>> 0]) {
        for (let b = 0; b < 32; b += 8) h = Math.imul(h ^ ((word >>> b) & 0xff), 0x01000193);
      }
    }
    return h >>> 0;
  }

  private enter(phase: Phase): void {
    this.phase = phase;
    this.phaseTicks = 0;
  }

  private land(): void {
    const landing = judge(this.thing, this.level, this.flight!);
    if (landing.clean) {
      this.streak++;
      this.best = Math.max(this.best, this.streak);
      if (landing.verdict === 'perfect') this.perfects++;
      landing.points = R.OBJECT_POINTS * this.level * (landing.verdict === 'perfect' ? R.PERFECT_TIMES : 1) * Math.min(this.streak, R.MAX_STREAK);
      this.score += landing.points;
    } else {
      this.streak = 0;
      this.lives--;
    }
    this.landing = landing;
    this.enter('landed');
    this.events.push({ type: 'land', landing });
  }

  private afterLanding(): void {
    if (this.landing!.clean) {
      this.previous = this.thing;
      this.index++;
      this.thing = thing(this.sequence.at(this.index));
      this.enter('roll');
      this.events.push({ type: 'next', id: this.thing.id });
    } else if (this.lives > 0) {
      this.enter('reset');
    } else {
      // It lies where it fell: the object that ended the run is `thing`.
      this.over = true;
      this.queued = 0;
      this.events.push({ type: 'over' });
    }
  }
}
