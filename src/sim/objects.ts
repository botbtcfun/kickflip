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
 * All 21, the openers first, in their order: each teaches one thing. Then
 * the pool, by tier: everyday things from level 7, heavy things and the
 * doubles from level 10, and the odd ones from level 13. Most stand tall
 * rather than lie flat, and some you'd never kickflip. The 21st is always
 * the last bitcoin, as Bitcoin stops at 21 million. A run that gets to 21
 * meets every one once.
 */
const SPECS: Record<string, Spec> = {
  roadster: spec('ROADSTER', 'standard', 0, [80, 22, 32], { quirk: 'thrusters' }),
  skateboard: spec('SKATEBOARD', 'standard', 0, [64, 12, 18]),
  pizzabox: spec('PIZZA BOX', 'standard', 0, [52, 8, 44]),
  sneaker: spec('SNEAKER', 'light', 0, [44, 18, 18]),
  brick: spec('BRICK', 'heavy', 0, [40, 18, 22]),
  penguin: spec('PENGUIN', 'standard', 0, [30, 40, 26]),

  cone: spec('TRAFFIC CONE', 'light', 1, [28, 36, 28]),
  suitcase: spec('SUITCASE', 'standard', 1, [36, 44, 22]),
  hotdog: spec('HOT DOG', 'standard', 1, [56, 16, 16]),
  duck: spec('RUBBER DUCK', 'light', 1, [36, 30, 26]),

  giraffe: spec('GIRAFFE', 'heavy', 2, [48, 64, 20]),
  plane: spec('PAPER PLANE', 'light', 2, [56, 10, 40], { turns: 2 }),
  anvil: spec('ANVIL', 'heavy', 2, [48, 28, 20]),
  fridge: spec('FRIDGE', 'heavy', 2, [36, 48, 30]),
  safe: spec('SAFE', 'heavy', 2, [40, 36, 34]),
  toast: spec('TOAST', 'light', 2, [32, 6, 30], { turns: 2 }),

  banana: spec('BANANA', 'standard', 3, [56, 14, 14], { quirk: 'narrow' }),
  pin: spec('BOWLING PIN', 'light', 3, [18, 48, 18], { quirk: 'narrow' }),
  fish: spec('FISH', 'light', 3, [56, 18, 12], { quirk: 'slippery' }),
  cat: spec('CAT', 'standard', 3, [48, 30, 22], { quirk: 'feet' }),

  // The 21st, always: the last of 21 million. A coin, flipped like one, to land heads up.
  coin: spec('LAST BITCOIN', 'standard', 4, [40, 6, 40]),
};

export const OBJECTS: Record<string, Thing> = Object.fromEntries(Object.entries(SPECS).map(([id, s]) => [id, { id, ...s }]));

export const thing = (id: string): Thing => {
  const t = OBJECTS[id];
  if (!t) throw new Error(`no object ${id}`);
  return t;
};
