/**
 * Every tunable number in the game. Times are in ticks, 60 a second; angles
 * in thousandths of a degree; heights in thousandths of a pixel. A change
 * here changes what a run scores, so bump RULES_VERSION with it.
 */
export const RULES_VERSION = 2;
export const TICK_HZ = 60;

/** A full turn, in thousandths of a degree. */
export const TURN = 360_000;
export const QUARTER = TURN / 4;

// The flick
/** The strongest flick the game reads. */
export const INTENSITY_MAX = 1000;
/** Weaker flicks are taps: the object hops, and nothing is spent. */
export const INTENSITY_MIN = 80;

// The flip
/** Rotation per unit of intensity for a standard object: a full turn at 500. */
export const GAIN = 720;
/** Light and heavy objects' gain, in percent of a standard one's. */
export const GAIN_LIGHT = 160;
export const GAIN_HEAVY = 60;
/** Time in the air: AIR_BASE ticks, and AIR_PER more per 1000 of intensity. */
export const AIR_BASE = 36;
export const AIR_PER = 36;
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
export const WINDOW_KEEP = 88;
export const WINDOW_MIN = 12_000;
/** The first level the window narrows from. Level 1's thrusters land anything. */
export const WINDOW_FROM_LEVEL = 2;
/** A landing within this share of the window is PERFECT. */
export const PERFECT_DIV = 3;

// Score
export const OBJECT_POINTS = 100;
export const PERFECT_TIMES = 2;
/** The most a streak of clean landings multiplies the points. */
export const MAX_STREAK = 8;
export const LIVES = 3;

// Pacing. A swipe skips a roll-in or a reset; the landing always shows.
/** The landing: the verdict, and a missed object toppling over. */
export const LAND_TICKS = 24;
/** A missed object righting itself for another go. */
export const RESET_TICKS = 36;
/** The landed object rolling off and the next one rolling in. */
export const ROLL_TICKS = 36;
