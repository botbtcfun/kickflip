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
  /** The whole turns nearest that spin, at least the object's own: where thrusters steer it. */
  aim: number;
  /** Rotation so far, and a tick ago, for drawing in between. */
  angle: number;
  prevAngle: number;
  /** Height above where it rests, now and a tick ago, in thousandths of a pixel. */
  height: number;
  prevHeight: number;
  /** The thrusters' or the twist's push this tick, signed: 0 when idle, or the object rights itself not at all. */
  thrust: number;
}

/** PERFECT and CLEAN land on the wheels. UNDER and OVER don't. */
export type Verdict = 'perfect' | 'clean' | 'under' | 'over';

export interface Landing {
  verdict: Verdict;
  clean: boolean;
  /** Whole turns it landed after: its own, or more for a double or a triple. */
  turns: number;
  /** Turns beyond its own, landed clean by the flick itself: each one multiplies the points. */
  extra: number;
  /**
   * How far the flick itself was from the turns it needed, what the meter
   * shows. With thrusters or a cat's twist, how far it would have been without them.
   */
  error: number;
  /** How far off still landed clean, either way, for this object at this level. */
  window: number;
  /** The angle it touched down at. */
  angle: number;
  /** Where it comes to rest: its wheels, or one of its sides, or its roof. */
  rest: number;
  /** What the block paid: its subsidy and fees, times the chain. The game sets these, as it does the lives. */
  points: number;
  subsidy: number;
  fees: number;
  /** Lives the landing earned, after the cap. */
  lives: number;
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

export const airtime = (intensity: number) =>
  R.AIR_BASE + Math.floor((R.AIR_PER * Math.min(intensity, R.AIR_KNEE)) / 1000) + Math.floor((R.AIR_PER_HIGH * Math.max(0, intensity - R.AIR_KNEE)) / 1000);

/** The whole turns nearest a rotation, but never fewer than `thing` needs. */
const turnsNear = (thing: Thing, angle: number) => Math.max(thing.turns, Math.round(angle / R.TURN));

/** How far off a landing on `thing` may be at `level`: the level's window, less for narrow and slippery things. */
export function windowFor(thing: Thing, level: number): number {
  const w = windowAt(level);
  if (thing.quirk === 'narrow') return Math.floor((w * R.NARROW_PERCENT) / 100);
  if (thing.quirk === 'slippery') return Math.floor((w * R.SLIPPERY_PERCENT) / 100);
  return w;
}

/** Whether something rights it in the air whatever the flick: thrusters, or a cat's twist. */
export const rights = (thing: Thing) => thing.quirk === 'thrusters' || thing.quirk === 'feet';

/** How far off a landing may be and still be clean: wide at first, narrowing level by level toward a floor. */
export function windowAt(level: number): number {
  let above = R.WINDOW_BASE - R.WINDOW_MIN;
  for (let l = R.WINDOW_FROM_LEVEL; l < level && above > 0; l++) above = Math.floor((above * R.WINDOW_KEEP) / 100);
  return R.WINDOW_MIN + above;
}

/** Rotation after `t` ticks from the flick alone. */
const spunAt = (f: Flight, t: number) => Math.floor((f.spin * t) / f.air);

/** What thrusters, or a cat's twist, have turned it by after `t` ticks: harder as it comes down, onto the whole turns nearest the flick. */
const steerAt = (f: Flight, thing: Thing, t: number) => (rights(thing) ? Math.floor(((f.aim * R.TURN - f.spin) * t * t) / (f.air * f.air)) : 0);

/** Height after `t` ticks: up and back down in `air` ticks. */
const heightAt = (f: Flight, t: number) => (R.GRAVITY * t * (f.air - t)) / 2;

export function launch(thing: Thing, intensity: number): Flight {
  const spin = Math.floor(gain(thing) * intensity);
  return { intensity, air: airtime(intensity), t: 0, spin, aim: turnsNear(thing, spin), angle: 0, prevAngle: 0, height: 0, prevHeight: 0, thrust: 0 };
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

/**
 * How a flight lands, once it's down. Any whole number of turns at least the
 * object's own lands it on its wheels, within the window: one more than it
 * needs is a double, two more a triple. Points are the game's to add.
 */
export function judge(thing: Thing, level: number, f: Flight): Landing {
  const turns = turnsNear(thing, f.angle);
  const need = turns * R.TURN;
  const window = windowFor(thing, level);
  const off = f.angle - need;
  // What the flick alone would have done: the meter shows it, and only a flick that lands by itself earns a trick.
  const error = f.spin - f.aim * R.TURN;
  const clean = Math.abs(off) <= window;
  const perfect = clean && Math.abs(error) * R.PERFECT_DIV <= window;
  const extra = clean && Math.abs(error) <= window ? turns - thing.turns : 0;
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
  return { verdict: perfect ? 'perfect' : clean ? 'clean' : off < 0 ? 'under' : 'over', clean, turns, extra, error, window, angle: f.angle, rest, points: 0, subsidy: 0, fees: 0, lives: 0 };
}
