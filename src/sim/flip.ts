import type { Thing } from './objects';
import * as R from './rules';

/** One flip in the air, as the simulation runs it tick by tick. */
export interface Flight {
  intensity: number;
  /** Ticks in the air, and how many have passed. */
  air: number;
  t: number;
  /** The rotation the flick gave, over the whole flight. */
  spin: number;
  /** Rotation so far, and a tick ago, for drawing in between. */
  angle: number;
  prevAngle: number;
  /** Height above where it rests, now and a tick ago, in thousandths of a pixel. */
  height: number;
  prevHeight: number;
  /** The thrusters' push this tick, signed: 0 when they're idle, or the object has none. */
  thrust: number;
}

/** PERFECT and CLEAN land on the wheels. UNDER and OVER don't. */
export type Verdict = 'perfect' | 'clean' | 'under' | 'over';

export interface Landing {
  verdict: Verdict;
  clean: boolean;
  /**
   * How far the flick itself was from the turns it needed, what the meter
   * shows. With thrusters, how far it would have been without them.
   */
  error: number;
  /** How far off still landed clean, either way, at this level. */
  window: number;
  /** The angle it touched down at. */
  angle: number;
  /** Where it comes to rest: its wheels, or one of its sides, or its roof. */
  rest: number;
  points: number;
}

/** Rotation per unit of intensity, by weight. */
export function gain(thing: Thing): number {
  if (thing.weight === 'light') return (R.GAIN * R.GAIN_LIGHT) / 100;
  if (thing.weight === 'heavy') return (R.GAIN * R.GAIN_HEAVY) / 100;
  return R.GAIN;
}

/** The rotation a landing on the wheels needs. */
export const goal = (thing: Thing) => R.TURN * thing.turns;

/** The flick that spins it exactly as far as it needs, for tests and tuning. */
export const sweetSpot = (thing: Thing) => Math.round(goal(thing) / gain(thing));

export const airtime = (intensity: number) => R.AIR_BASE + Math.floor((R.AIR_PER * intensity) / 1000);

/** How far off a landing may be and still be clean: wide at first, narrowing level by level to a floor. */
export function windowAt(level: number): number {
  return Math.max(R.WINDOW_MIN, R.WINDOW_BASE - R.WINDOW_STEP * Math.max(0, level - R.WINDOW_FROM_LEVEL));
}

/** Rotation after `t` ticks from the flick alone. */
const spunAt = (f: Flight, t: number) => Math.floor((f.spin * t) / f.air);

/** What thrusters have turned it by after `t` ticks: they steer it, harder as it comes down, onto the turns it needs. */
const steerAt = (f: Flight, thing: Thing, t: number) => (thing.quirk === 'thrusters' ? Math.floor(((goal(thing) - f.spin) * t * t) / (f.air * f.air)) : 0);

/** Height after `t` ticks: up and back down in `air` ticks. */
const heightAt = (f: Flight, t: number) => (R.GRAVITY * t * (f.air - t)) / 2;

export function launch(thing: Thing, intensity: number): Flight {
  return { intensity, air: airtime(intensity), t: 0, spin: Math.floor(gain(thing) * intensity), angle: 0, prevAngle: 0, height: 0, prevHeight: 0, thrust: 0 };
}

/** One tick of a flight. */
export function fly(f: Flight, thing: Thing): void {
  f.prevAngle = f.angle;
  f.prevHeight = f.height;
  f.t++;
  const steer = steerAt(f, thing, f.t);
  f.thrust = steer - steerAt(f, thing, f.t - 1);
  f.angle = spunAt(f, f.t) + steer;
  f.height = heightAt(f, f.t);
}

/** How a flight lands, once it's down. Points are the game's to add. */
export function judge(thing: Thing, level: number, f: Flight): Landing {
  const need = goal(thing);
  const window = windowAt(level);
  const off = f.angle - need;
  const error = f.spin - need;
  const clean = Math.abs(off) <= window;
  const perfect = clean && Math.abs(error) * R.PERFECT_DIV <= window;
  let rest = need;
  if (!clean) {
    // It comes down on the nearest side; if that's its wheels, it was too far off to stay on them, and tips over the way it leans.
    let q = Math.round(f.angle / R.QUARTER);
    if (q % 4 === 0) {
      const lean = f.angle - q * R.QUARTER;
      q += lean > 0 ? 1 : lean < 0 ? -1 : Math.sign(off);
    }
    rest = q * R.QUARTER;
  }
  return { verdict: perfect ? 'perfect' : clean ? 'clean' : off < 0 ? 'under' : 'over', clean, error, window, angle: f.angle, rest, points: 0 };
}
