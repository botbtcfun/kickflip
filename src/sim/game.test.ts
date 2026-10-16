import { describe, expect, it } from 'vitest';

import { type Flight, type Landing, airtime, fly, gain, goal, judge, launch, sweetSpot, windowAt } from './flip';
import { Game } from './game';
import { OBJECTS, type Thing, thing } from './objects';
import { InputLog, replay } from './replay';
import { Rng } from './rng';
import * as R from './rules';
import { OPENERS, Sequence } from './sequence';

const LIGHT: Thing = { id: 'test-light', name: 'TEST', weight: 'light', quirk: null, turns: 1, length: 10, height: 4, width: 4 };

/** A whole flight of `thing` at `intensity`, judged at `level`. */
function flip(t: Thing, intensity: number, level = 2): { flight: Flight; landing: Landing } {
  const flight = launch(t, intensity);
  while (flight.t < flight.air) fly(flight, t);
  return { flight, landing: judge(t, level, flight) };
}

/** Steps with no input until the game waits for a flick, or is over. */
function settle(game: Game): void {
  for (let i = 0; i < 1000 && !game.over && game.phase !== 'ready'; i++) game.step(0);
}

/** Flicks at rest and plays the flip out to its landing; returns the landing. */
function flick(game: Game, intensity: number): Landing {
  settle(game);
  game.step(intensity);
  expect(game.phase).toBe('air');
  for (let i = 0; i < 1000; i++) {
    game.step(0);
    const land = game.events.find((e) => e.type === 'land');
    if (land) return land.landing;
  }
  throw new Error('never landed');
}

/** Flicks the object up next at its sweet spot, once it's up. */
function sweet(game: Game): Landing {
  settle(game);
  return flick(game, sweetSpot(game.thing));
}

describe('the flip', () => {
  it('spins a standard object a full turn at 500, a light one sooner, a heavy one later', () => {
    expect(sweetSpot(thing('skateboard'))).toBe(500);
    expect(sweetSpot(LIGHT)).toBe(313);
    expect(sweetSpot(thing('brick'))).toBe(833);
    expect(gain(LIGHT) * 313 - goal(LIGHT)).toBeLessThan(1000);
  });

  it('lands every object PERFECT at its sweet spot', () => {
    for (const t of [...Object.values(OBJECTS), LIGHT]) expect(flip(t, sweetSpot(t)).landing.verdict, t.id).toBe('perfect');
  });

  it('lands clean right up to the window and not past it', () => {
    const board = thing('skateboard');
    // At level 2 the window is 80 degrees, 111 of intensity either way: 389 to 611 for 500.
    expect(flip(board, 611).landing.verdict).toBe('clean');
    expect(flip(board, 612).landing.verdict).toBe('over');
    expect(flip(board, 389).landing.verdict).toBe('clean');
    expect(flip(board, 388).landing.verdict).toBe('under');
    // A third of the window is PERFECT.
    expect(flip(board, 537).landing.verdict).toBe('perfect');
    expect(flip(board, 538).landing.verdict).toBe('clean');
  });

  it('narrows the window quickly at first, then slowly, toward a floor', () => {
    expect(windowAt(1)).toBe(80_000);
    expect(windowAt(2)).toBe(80_000);
    expect(windowAt(3)).toBe(71_840);
    expect(windowAt(4)).toBe(64_659);
    const widths = Array.from({ length: 60 }, (_, i) => windowAt(i + 2));
    for (let i = 1; i < widths.length; i++) expect(widths[i]).toBeLessThanOrEqual(widths[i - 1]!);
    // Each level takes less off than the one before.
    for (let i = 2; i < 20; i++) expect(widths[i - 1]! - widths[i]!).toBeLessThanOrEqual(widths[i - 2]! - widths[i - 1]!);
    expect(windowAt(10)).toBeGreaterThan(35_000);
    expect(windowAt(20)).toBeLessThan(20_000);
    expect(windowAt(500)).toBe(R.WINDOW_MIN);
  });

  it('flies longer and higher the harder the flick', () => {
    expect(airtime(500)).toBe(54);
    expect(airtime(1000)).toBe(72);
    const soft = flip(thing('skateboard'), 200).flight;
    const hard = flip(thing('skateboard'), 900).flight;
    let [softTop, hardTop] = [0, 0];
    for (const [f, set] of [
      [soft, (h: number) => (softTop = Math.max(softTop, h))],
      [hard, (h: number) => (hardTop = Math.max(hardTop, h))],
    ] as const) {
      const g = launch(thing('skateboard'), f.intensity);
      while (g.t < g.air) {
        fly(g, thing('skateboard'));
        set(g.height);
      }
      expect(g.height).toBe(0);
    }
    expect(hardTop).toBeGreaterThan(softTop);
  });

  it("lands the Roadster on its wheels whatever the flick, and still shows the flick's own error", () => {
    const car = thing('roadster');
    for (const i of [R.INTENSITY_MIN, 200, 440, 500, 800, R.INTENSITY_MAX]) {
      const { flight, landing } = flip(car, i, 1);
      expect(flight.angle, `at ${i}`).toBe(goal(car));
      expect(landing.clean).toBe(true);
      expect(landing.error).toBe(flight.spin - goal(car));
    }
    expect(flip(car, 500, 1).landing.verdict).toBe('perfect');
    expect(flip(car, 900, 1).landing.verdict).toBe('clean');
  });

  it('fires the thrusters only when the flick was off', () => {
    const car = thing('roadster');
    const thrusts = (i: number) => {
      const f = launch(car, i);
      const out: number[] = [];
      while (f.t < f.air) {
        fly(f, car);
        out.push(f.thrust);
      }
      return out;
    };
    expect(thrusts(500).every((t) => t === 0)).toBe(true);
    expect(thrusts(200).some((t) => t > 0)).toBe(true);
    expect(thrusts(900).some((t) => t < 0)).toBe(true);
    // Nothing else has thrusters.
    const board = launch(thing('skateboard'), 200);
    while (board.t < board.air) {
      fly(board, thing('skateboard'));
      expect(board.thrust).toBe(0);
    }
  });

  it('comes to rest on a side or the roof when it misses', () => {
    const board = thing('skateboard');
    // Too little: a quarter turn is the nearest rest.
    expect(flip(board, R.INTENSITY_MIN).landing.rest).toBe(R.QUARTER);
    // Half a turn: on its roof.
    expect(flip(board, 250).landing.rest).toBe(2 * R.QUARTER);
    // Nearly a full turn but outside the narrow window: tips over the way it leans.
    expect(flip(board, 525, 500).landing.rest).toBe(5 * R.QUARTER);
    expect(flip(board, 475, 500).landing.rest).toBe(3 * R.QUARTER);
    // Two turns where one was needed is OVER, and it tips off its wheels.
    const two = flip(board, R.INTENSITY_MAX, 500).landing;
    expect(two.verdict).toBe('over');
    expect(two.rest % R.TURN).not.toBe(0);
    // Clean lands on the wheels exactly.
    expect(flip(board, 530).landing.rest).toBe(R.TURN);
  });
});

describe('a run', () => {
  it('opens with the Roadster, then the skateboard and the brick', () => {
    const game = new Game('day:1');
    expect(game.thing.id).toBe('roadster');
    expect(game.level).toBe(1);
    flick(game, 900);
    settle(game);
    expect(game.thing.id).toBe('skateboard');
    expect(game.level).toBe(2);
    flick(game, 500);
    settle(game);
    expect(game.thing.id).toBe('brick');
  });

  it('scores the level, doubles a PERFECT, and multiplies by the streak', () => {
    const game = new Game('day:1');
    expect(flick(game, 500).points).toBe(100 * 1 * 2 * 1);
    expect(flick(game, 500).points).toBe(100 * 2 * 2 * 2);
    expect(flick(game, 833).points).toBe(100 * 3 * 2 * 3);
    expect(game.score).toBe(200 + 800 + 1800);
    expect(game.streak).toBe(3);
    expect(game.perfects).toBe(3);
  });

  it('caps the streak multiplier', () => {
    const game = new Game('day:1');
    for (let i = 0; i < 12; i++) expect(sweet(game).clean).toBe(true);
    expect(game.streak).toBe(12);
    settle(game);
    const level = game.level;
    expect(sweet(game).points).toBe(100 * level * 2 * R.MAX_STREAK);
  });

  it('takes a life for a miss, keeps the object, and resets the streak', () => {
    const game = new Game('day:1');
    flick(game, 500);
    flick(game, 500);
    expect(game.streak).toBe(2);
    const miss = flick(game, 300);
    expect(miss.verdict).toBe('under');
    expect(miss.points).toBe(0);
    expect(game.lives).toBe(2);
    expect(game.streak).toBe(0);
    expect(game.best).toBe(2);
    settle(game);
    expect(game.thing.id).toBe('brick');
    expect(game.level).toBe(3);
  });

  it('is over after three misses, with the object that did it', () => {
    const game = new Game('day:1');
    flick(game, 500);
    for (let i = 0; i < 3; i++) flick(game, 950);
    expect(game.over).toBe(false);
    settle(game);
    expect(game.over).toBe(true);
    expect(game.lives).toBe(0);
    expect(game.thing.id).toBe('skateboard');
    const score = game.score;
    const hash = game.hash();
    game.step(500);
    expect(game.score).toBe(score);
    expect(game.hash()).toBe(hash);
  });

  it('keeps a flick made in the air until the landing is shown, then skips the roll-in', () => {
    const game = new Game('day:1');
    game.step(500);
    for (let i = 0; i < 8; i++) game.step(0);
    game.step(400);
    let launched = 0;
    for (let i = 0; i < 200 && !launched; i++) {
      game.step(0);
      const e = game.events.find((ev) => ev.type === 'launch');
      if (e && e.type === 'launch') {
        launched = game.tick;
        expect(e.intensity).toBe(400);
      }
    }
    expect(launched).toBe(1 + airtime(500) + R.LAND_TICKS);
    expect(game.thing.id).toBe('skateboard');
  });

  it('cuts a roll-in short with a flick', () => {
    const game = new Game('day:1');
    flick(game, 500);
    while (game.phase !== 'roll') game.step(0);
    game.step(0);
    game.step(500);
    expect(game.phase).toBe('air');
    expect(game.previous).toBe(null);
    expect(game.events).toEqual([{ type: 'launch', intensity: 500 }]);
  });

  it('ignores taps', () => {
    const game = new Game('day:1');
    game.step(R.INTENSITY_MIN - 1);
    expect(game.phase).toBe('ready');
    expect(game.events).toEqual([]);
  });
});

describe('the input log', () => {
  /** A run with flicks near each sweet spot, a seeded thumb's way, until it's over. */
  function scripted(seed: string): { game: Game; log: InputLog } {
    const game = new Game(seed);
    const log = new InputLog();
    const thumb = new Rng(`thumb:${seed}`);
    let wait = 0;
    while (!game.over && game.tick < 100_000) {
      let input = 0;
      if (game.phase === 'ready' && wait-- <= 0) {
        input = Math.max(R.INTENSITY_MIN, Math.min(R.INTENSITY_MAX, sweetSpot(game.thing) + thumb.below(161) - 80));
        wait = thumb.below(40);
      }
      log.push(input);
      game.step(input);
    }
    return { game, log };
  }

  it('replays a run to the same end', () => {
    const { game, log } = scripted('day:20000');
    expect(game.over).toBe(true);
    const again = new Game('day:20000');
    replay(again, InputLog.decode(log.encode()), 1_000_000);
    expect(again.over).toBe(true);
    expect(again.tick).toBe(game.tick);
    expect(again.score).toBe(game.score);
    expect(again.hash()).toBe(game.hash());
  });

  it('matches the recorded golden run for this version of the rules', () => {
    const { game, log } = scripted('golden');
    expect(R.RULES_VERSION).toBe(2);
    expect({ score: game.score, landed: game.index, tick: game.tick, hash: game.hash(), bytes: log.encode().length }).toMatchInlineSnapshot(`
      {
        "bytes": 82,
        "hash": 2403610749,
        "landed": 11,
        "score": 35600,
        "tick": 1875,
      }
    `);
  });

  it('rejects logs it cannot replay', () => {
    expect(InputLog.decode('')).toEqual([]);
    expect(InputLog.decode('1.dw,a.b4')).toEqual([
      [1, 500],
      [11, 400],
    ]);
    for (const bad of ['x', '1.1', '0.dw', '1.dw.3', '1.zz', '-1.dw', '1.DW']) expect(() => InputLog.decode(bad), bad).toThrow();
    const game = new Game('day:1');
    // A flick after the run is over.
    expect(() => replay(game, [[1, 500], ...Array.from({ length: 4 }, (_, i) => [200 * (i + 1), 950] as [number, number]), [5000, 500]], 100_000)).toThrow();
  });
});

describe('the sequence', () => {
  it('starts with the openers, never repeats an object twice in a row, and depends on the seed alone', () => {
    const a = new Sequence('day:7');
    const b = new Sequence('day:7');
    const list = Array.from({ length: 60 }, (_, i) => a.at(i));
    expect(list.slice(0, OPENERS.length)).toEqual(OPENERS);
    for (let i = 1; i < list.length; i++) expect(list[i]).not.toBe(list[i - 1]);
    expect(Array.from({ length: 60 }, (_, i) => b.at(59 - i)).reverse()).toEqual(list);
    expect(list.slice(OPENERS.length)).not.toContain('roadster');
  });
});
