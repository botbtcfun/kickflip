import type { Game } from './game';
import { INTENSITY_MAX, INTENSITY_MIN } from './rules';

/** A flick: the tick it came on, counting from 1, and its intensity. */
export type Flick = [tick: number, intensity: number];

/**
 * A run's inputs: only the ticks with a flick, as base-36 `gap.intensity`
 * pairs joined by commas, each gap counted from the flick before. With the
 * seed, this is the whole run, and a long one is a few hundred bytes.
 */
export class InputLog {
  private flicks: Flick[] = [];
  ticks = 0;

  /** This tick's input, as given to Game.step. */
  push(intensity: number): void {
    this.ticks++;
    if (intensity) this.flicks.push([this.ticks, intensity]);
  }

  encode(): string {
    let last = 0;
    return this.flicks
      .map(([tick, intensity]) => {
        const gap = tick - last;
        last = tick;
        return `${gap.toString(36)}.${intensity.toString(36)}`;
      })
      .join(',');
  }

  static decode(s: string): Flick[] {
    let tick = 0;
    return (s ? s.split(',') : []).map((pair) => {
      const parts = pair.split('.');
      const [gap, intensity] = parts.map((v) => (/^[0-9a-z]+$/.test(v) ? parseInt(v, 36) : NaN));
      if (parts.length !== 2 || !(gap! >= 1) || !(intensity! >= INTENSITY_MIN && intensity! <= INTENSITY_MAX)) throw new Error('bad input log');
      tick += gap!;
      return [tick, intensity!];
    });
  }
}

/** Plays flicks through a game until it's over or `limit` ticks have gone. Flicks after the end are an error. */
export function replay(game: Game, flicks: Flick[], limit: number): void {
  let next = 0;
  while (!game.over && game.tick < limit) {
    const f = flicks[next];
    if (f && f[0] === game.tick + 1) {
      game.step(f[1]);
      next++;
    } else game.step(0);
  }
  if (next < flicks.length) throw new Error('flicks after the run ended');
}
