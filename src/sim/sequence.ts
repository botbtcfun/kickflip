import { OBJECTS } from './objects';
import { Rng } from './rng';

/** Every run starts with these, in order: each teaches one thing. */
export const OPENERS = ['roadster', 'skateboard', 'brick'];
/** What comes after, drawn by the seed. The Roadster only opens. */
export const POOL = Object.keys(OBJECTS).filter((id) => id !== 'roadster');

/**
 * The objects of a run, in order: the openers, then the pool shuffled again
 * each time it runs out, as a bag. Nothing comes twice in a row. The order
 * depends on the seed alone, never on play, so everyone gets the same
 * objects on the same day.
 */
export class Sequence {
  private readonly rng: Rng;
  private readonly list: string[] = [...OPENERS];

  constructor(seed: string) {
    this.rng = new Rng(`objects:${seed}`);
  }

  at(n: number): string {
    while (this.list.length <= n) this.refill();
    return this.list[n]!;
  }

  private refill(): void {
    const bag = [...POOL];
    // Fisher-Yates.
    for (let i = bag.length - 1; i > 0; i--) {
      const j = this.rng.below(i + 1);
      [bag[i], bag[j]] = [bag[j]!, bag[i]!];
    }
    // Across the seam between two bags, swap so nothing repeats.
    if (bag.length > 1 && bag[0] === this.list[this.list.length - 1]) [bag[0], bag[1]] = [bag[1]!, bag[0]!];
    this.list.push(...bag);
  }
}
