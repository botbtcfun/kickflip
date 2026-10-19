/**
 * What gets flipped. Each object is a box seen from the side: `length` along
 * the axis it flips around, `height` as it stands, and `width` across, which
 * shows as its roof and underside mid-flip. Sizes are in pixels as drawn;
 * they change nothing in the simulation.
 */

/** How hard it is to spin: light ones overspin, heavy ones need a hard flick. */
export type Weight = 'light' | 'standard' | 'heavy';

/**
 * What else is odd about it. Thrusters fire in the air and land it on its
 * wheels whatever the flick; a cat twists in the air to land on its feet
 * whatever the flick. Narrow and slippery things forgive less: their window
 * is a share of the level's.
 */
export type Quirk = 'thrusters' | 'feet' | 'narrow' | 'slippery' | null;

/** What the card says for a quirk. */
export const QUIRK_NAMES: Record<Exclude<Quirk, null>, string> = {
  thrusters: 'THRUSTERS',
  feet: 'LANDS ON ITS FEET',
  narrow: 'NARROW',
  slippery: 'SLIPPERY',
};

export interface Thing {
  id: string;
  /** As the card shows it. Generic names only, never a brand. */
  name: string;
  weight: Weight;
  quirk: Quirk;
  /** Full turns to land: 1, or 2 for a double. */
  turns: number;
  /** 0 for an opener, which comes at its place in every run; LAST_TIER for the 21st; else the tier it's drawn from, which opens at a level. */
  tier: number;
  length: number;
  height: number;
  width: number;
}

type Spec = Omit<Thing, 'id'>;

const spec = (name: string, weight: Weight, tier: number, [length, height, width]: [number, number, number], more: Partial<Pick<Thing, 'quirk' | 'turns'>> = {}): Spec => ({
  name,
  weight,
  quirk: more.quirk ?? null,
  turns: more.turns ?? 1,
  tier,
  length,
  height,
  width,
});

/**
 * All 21, every one a Bitcoin thing, the openers first, in their order:
 * each teaches one thing. Then the pool, by tier: everyday things from level
 * 7, heavy things and the doubles from level 10, and the odd ones from level
 * 13. Most stand tall rather than lie flat, and some you'd never kickflip.
 * The 21st is always the last bitcoin, as Bitcoin stops at 21 million. A run
 * that gets to 21 meets every one once.
 */
const SPECS: Record<string, Spec> = {
  roadster: spec('ROADSTER', 'standard', 0, [80, 22, 32], { quirk: 'thrusters' }),
  pizzabox: spec('BITCOIN PIZZA', 'standard', 0, [52, 8, 44]),
  wallet: spec('HARDWARE WALLET', 'standard', 0, [44, 12, 22]),
  pill: spec('ORANGE PILL', 'light', 0, [52, 16, 16]),
  block: spec('BLOCK', 'heavy', 0, [40, 24, 28]),
  atm: spec('BITCOIN ATM', 'standard', 0, [34, 52, 24]),

  hodl: spec('HODL SIGN', 'light', 1, [44, 54, 6]),
  rocket: spec('MOON ROCKET', 'light', 1, [26, 52, 26]),
  node: spec('FULL NODE', 'standard', 1, [44, 26, 30]),
  piggy: spec('PIGGY BANK', 'standard', 1, [46, 32, 28]),

  bull: spec('BULL', 'heavy', 2, [66, 42, 26]),
  goldbar: spec('GOLD BAR', 'heavy', 2, [44, 16, 22]),
  coldstorage: spec('COLD STORAGE', 'heavy', 2, [36, 48, 30]),
  asic: spec('ASIC MINER', 'heavy', 2, [60, 26, 26]),
  whitepaper: spec('WHITEPAPER', 'light', 2, [56, 10, 40], { turns: 2 }),
  paperwallet: spec('PAPER WALLET', 'light', 2, [36, 4, 44], { turns: 2 }),

  lightning: spec('LIGHTNING', 'standard', 3, [36, 48, 10], { quirk: 'narrow' }),
  candle: spec('GREEN CANDLE', 'light', 3, [16, 54, 16], { quirk: 'narrow' }),
  whale: spec('WHALE', 'heavy', 3, [76, 32, 28], { quirk: 'slippery' }),
  lasercat: spec('LASER CAT', 'standard', 3, [48, 30, 22], { quirk: 'feet' }),

  // The 21st, always: the last of 21 million. A coin, flipped like one, to land heads up.
  coin: spec('LAST BITCOIN', 'standard', 4, [40, 6, 40]),
};

export const OBJECTS: Record<string, Thing> = Object.fromEntries(Object.entries(SPECS).map(([id, s]) => [id, { id, ...s }]));

export const thing = (id: string): Thing => {
  const t = OBJECTS[id];
  if (!t) throw new Error(`no object ${id}`);
  return t;
};
