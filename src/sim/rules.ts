/**
 * Every tunable number in the game. Times are in ticks, 60 a second; angles
 * in thousandths of a degree; heights in thousandths of a pixel. A change
 * here changes what a run scores, so bump RULES_VERSION with it.
 */
export const RULES_VERSION = 7;
export const TICK_HZ = 60;

/** A full turn, in thousandths of a degree. */
export const TURN = 360_000;
export const QUARTER = TURN / 4;

// The flick
/**
 * The strongest flick the game reads: room for a standard object's double at
 * 1000 and triple at 1500. Not a round 2000: a flick past the top is taken as
 * the top, and at 1875 every weight spins a quarter turn off a whole one, so
 * flicking as hard as you can, or holding the key as long as you can, never
 * lands anything.
 */
export const INTENSITY_MAX = 1875;
/** Weaker flicks are taps: the object hops, and nothing is spent. */
export const INTENSITY_MIN = 80;

// The flip
/** Rotation per unit of intensity for a standard object: a full turn at 500. */
export const GAIN = 720;
/** Light and heavy objects' gain, in percent of a standard one's. */
export const GAIN_LIGHT = 140;
export const GAIN_HEAVY = 60;
/**
 * Time in the air: AIR_BASE ticks, AIR_PER more per 1000 of intensity up to
 * AIR_KNEE, and AIR_PER_HIGH per 1000 past it, so the strongest flicks still
 * come down on screen.
 */
export const AIR_BASE = 36;
export const AIR_PER = 36;
export const AIR_KNEE = 1000;
export const AIR_PER_HIGH = 18;
/** Pulls a flight back down, in thousandths of a pixel per tick per tick: a flick at 500 rises about 47 px. */
export const GRAVITY = 128;

// Landing
/**
 * How far from a full turn still lands clean, either way. Very wide at
 * first, so the first objects forgive a flick nearly a quarter turn off;
 * then each level keeps WINDOW_KEEP percent of what's left above the floor:
 * quick to narrow early, slower later, never below WINDOW_MIN.
 */
export const WINDOW_BASE = 80_000;
export const WINDOW_KEEP = 91;
export const WINDOW_MIN = 12_000;
/** The first level the window narrows from. Level 1's thrusters land anything. */
export const WINDOW_FROM_LEVEL = 2;
/** Narrow and slippery things get this percent of the level's window. */
export const NARROW_PERCENT = 75;
export const SLIPPERY_PERCENT = 65;
/** A landing within this share of the window is PERFECT. */
export const PERFECT_DIV = 3;

// The objects
/** The level each tier of the pool opens at: everyday things, then heavy ones, then the odd ones. Tier 0 is the openers. */
export const TIER_LEVELS = [0, 7, 10, 13];
/** The tier of the one object that comes at LAST_LEVEL, and only there: the last bitcoin, as the supply stops at 21 million. */
export const LAST_TIER = 4;
export const LAST_LEVEL = 21;

// Score, in sats: each block mined pays its subsidy and its fees, times the chain.
/** The block subsidy at the start, halving every HALVING_EVERY blocks, as Bitcoin's does every 210,000. */
export const SUBSIDY = 1000;
export const HALVING_EVERY = 6;
/** Fees, which never halve: per object number, for a PERFECT, and for each turn a trick lands beyond the object's own. */
export const FEE_PERFECT = 100;
export const FEE_PER_EXTRA_TURN = 250;
/** The most a chain of clean landings multiplies a block's pay. */
export const MAX_STREAK = 8;
export const LIVES = 3;
/** Lives are earned: a life for this many PERFECT landings in a row, counting again from none after. */
export const PERFECTS_FOR_LIFE = 2;
/** And a life for each turn a trick lands beyond the object's own: one for a double, two for a triple. */
export const LIVES_PER_EXTRA_TURN = 1;
/** The most lives a run holds: past this, earned ones are lost, so a run still ends. */
export const MAX_LIVES = 5;

// Pacing. A swipe skips a roll-in or a reset; the landing always shows.
/** The landing: the verdict, and a missed object toppling over. */
export const LAND_TICKS = 24;
/** A missed object righting itself for another go. */
export const RESET_TICKS = 36;
/** The landed object rolling off and the next one rolling in. */
export const ROLL_TICKS = 36;
