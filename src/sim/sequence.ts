import { OBJECTS } from './objects';
import { Rng } from './rng';
import { LAST_LEVEL, LAST_TIER, TIER_LEVELS } from './rules';

/** Every run starts with these, in order: each teaches one thing. */
export const OPENERS = Object.values(OBJECTS)
  .filter((t) => t.tier === 0)
  .map((t) => t.id);
/** What comes after, drawn by the seed as each tier opens. */
export const POOL = Object.values(OBJECTS).filter((t) => t.tier > 0 && t.tier !== LAST_TIER);
/** The object at LAST_LEVEL. */
export const LAST = Object.values(OBJECTS).find((t) => t.tier === LAST_TIER)!.id;

/**
 * The objects of a run, in order: the openers, then draws from the pool,
 * with the last bitcoin at LAST_LEVEL. Each draw takes an object not yet
 * drawn from the tiers open at that level; only when all of those have come
 * does it start over. So nothing comes twice in a row, and a run that gets
 * to 21 meets every object once. The order depends on the seed alone, never on
 * play, so everyone gets the same objects on the same day.
 */
export class Sequence {
  private readonly rng: Rng;
  private readonly list: string[] = [...OPENERS];
  private readonly drawn = new Set<string>();

  constructor(seed: string) {
    this.rng = new Rng(`objects:${seed}`);
  }

  at(n: number): string {
    while (this.list.length <= n) this.list.push(this.draw(this.list.length + 1));
    return this.list[n]!;
  }

  private draw(level: number): string {
    if (level === LAST_LEVEL) return LAST;
    const open = POOL.filter((t) => TIER_LEVELS[t.tier]! <= level).map((t) => t.id);
    let fresh = open.filter((id) => !this.drawn.has(id));
    if (!fresh.length) {
      this.drawn.clear();
      const last = this.list[this.list.length - 1];
      fresh = open.filter((id) => id !== last);
    }
    const id = fresh[this.rng.below(fresh.length)]!;
    this.drawn.add(id);
    return id;
  }
}
