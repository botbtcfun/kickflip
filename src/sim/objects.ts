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
 * wheels whatever the flick. More quirks come with the full set of objects.
 */
export type Quirk = 'thrusters' | null;

export interface Thing {
  id: string;
  /** As the card shows it. Generic names only. */
  name: string;
  weight: Weight;
  quirk: Quirk;
  /** Full turns to land: 1, or 2 for a double. */
  turns: number;
  length: number;
  height: number;
  width: number;
}

export const OBJECTS: Record<string, Thing> = {
  roadster: { id: 'roadster', name: 'ROADSTER', weight: 'standard', quirk: 'thrusters', turns: 1, length: 80, height: 22, width: 32 },
  skateboard: { id: 'skateboard', name: 'SKATEBOARD', weight: 'standard', quirk: null, turns: 1, length: 64, height: 12, width: 18 },
  brick: { id: 'brick', name: 'BRICK', weight: 'heavy', quirk: null, turns: 1, length: 40, height: 18, width: 22 },
};

export const thing = (id: string): Thing => {
  const t = OBJECTS[id];
  if (!t) throw new Error(`no object ${id}`);
  return t;
};
