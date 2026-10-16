/**
 * The tools objects are painted with: a shader run over every pixel of a
 * face, colour mixing, fixed noise for texture, and a few shapes. Painting
 * in code keeps the art crisp pixel art at any size, with no image files.
 */

export type Points = [number, number][];
/** A pixel's colour from its centre, or null for none. */
export type Shader = (x: number, y: number) => string | null;
type RGB = [number, number, number];

/** What a painter makes: the three faces, and where the roof and floor are where the side's outline won't do. */
export interface Paint {
  side: HTMLCanvasElement;
  top: HTMLCanvasElement;
  bottom: HTMLCanvasElement;
  /** The row of the side face the roof is drawn at, where something sticks up above it: a handle, an ear, a fin. */
  roof?: (x: number) => number;
  /** The row of the side face the underside is drawn at, where something hangs below it: wheels, legs, a fin. */
  floor?: (x: number) => number;
  /**
   * How far the object reaches either way across, at a point of its side
   * view: for shapes whose width changes with height, such as a head on a
   * body or a cabin on a car. Without it, every height of a column is as wide
   * as the roof face shows that column.
   */
  across?: (x: number, y: number) => number;
}

export const OUTLINE = '#14121c';
export const CREAM = '#fff4e6';
export const STEEL = '#8c8c99';
export const TYRE = '#141419';
export const GRIP = '#26222e';
export const JET = '#4dc3ff';

const rgbs = new Map<string, RGB>();
export function rgb(hex: string): RGB {
  let c = rgbs.get(hex);
  if (!c) rgbs.set(hex, (c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB));
  return c;
}

/** `k` of the way from colour a to colour b. */
export function mix(a: string, b: string, k: number): string {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const t = Math.max(0, Math.min(1, k));
  const h = (v: number) => Math.round(v).toString(16).padStart(2, '0');
  return `#${h(ar + (br - ar) * t)}${h(ag + (bg - ag) * t)}${h(ab + (bb - ab) * t)}`;
}

/** A colour lit from above: k below 0 lighter, above 0 darker, -1 to 1. */
export function lit(base: string, k: number): string {
  return k < 0 ? mix(base, '#ffffff', -k * 0.35) : mix(base, '#000000', k * 0.35);
}

/** A fixed noise in [0, 1) per pixel: texture that looks the same every time. */
export function noise(x: number, y: number, seed = 0): number {
  let h = (Math.imul(Math.floor(x), 374761393) + Math.imul(Math.floor(y), 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** A base colour speckled a little darker and lighter: clay, cardboard, bread. */
export function grain(x: number, y: number, base: string, seed: number, amount = 0.13): string {
  const n = noise(x, y, seed);
  return n < amount ? mix(base, '#000000', 0.14) : n > 1 - amount ? mix(base, '#ffffff', 0.12) : base;
}

/** Straight lines between points sorted by x, level beyond the ends. */
export function along(points: Points, x: number): number {
  if (x <= points[0]![0]) return points[0]![1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i]!;
    if (x <= x1) {
      const [x0, y0] = points[i - 1]!;
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return points[points.length - 1]![1];
}

/** How far a point is inside an ellipse: 1 on its edge, less inside. */
export const oval = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) => Math.hypot((x - cx) / rx, (y - cy) / ry);

/** How far a point is inside a pill `length` by `width`, rounded at both ends: 1 on its edge. */
export function pill(x: number, y: number, length: number, width: number): number {
  const r = width / 2;
  return Math.hypot(x - Math.max(r, Math.min(length - r, x)), y - r) / (r - 0.3);
}

/** Whether a point is inside a rectangle with corners rounded by `r`. */
export function rounded(x: number, y: number, x0: number, y0: number, x1: number, y1: number, r: number): boolean {
  const dx = Math.max(x0 + r - x, 0, x - (x1 - r));
  const dy = Math.max(y0 + r - y, 0, y - (y1 - r));
  return x >= x0 && x <= x1 && y >= y0 && y <= y1 && Math.hypot(dx, dy) <= r;
}

/** The distance from a point to a path through points. */
export function toPath(x: number, y: number, path: Points): number {
  let best = Infinity;
  for (let i = 1; i < path.length; i++) {
    const [ax, ay] = path[i - 1]!;
    const [bx, by] = path[i]!;
    const [dx, dy] = [bx - ax, by - ay];
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return best;
}

/**
 * Paints `w` by `h` pixels from a shader, then darkens the pixels on the
 * edge of what it drew toward `ink`, so the shape reads against any
 * background.
 */
export function shade(w: number, h: number, fn: Shader, edge = 0.5, ink = OUTLINE): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const col = fn(x + 0.5, y + 0.5);
      if (!col) continue;
      d.set([...rgb(col), 255], (y * w + x) * 4);
    }
  }
  if (edge) {
    const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3]! > 0;
    const to = rgb(ink);
    const rim: number[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) if (solid(x, y) && !(solid(x - 1, y) && solid(x + 1, y) && solid(x, y - 1) && solid(x, y + 1))) rim.push((y * w + x) * 4);
    }
    for (const o of rim) for (let i = 0; i < 3; i++) d[o + i] = Math.round(d[o + i]! + (to[i]! - d[o + i]!) * edge);
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** A wheel seen side on: tyre, silver lip, a dark face with five spokes, and the hub. */
export function wheel(dx: number, dy: number, r: number): string {
  const d = Math.hypot(dx, dy);
  if (d > r - 1.4) return dy < -r * 0.55 ? '#2c2c36' : TYRE;
  if (d > r - 2.3) return '#b8bac6';
  if (d < 1.3) return '#e6e7ee';
  const spoke = (((Math.atan2(dy, dx) / ((2 * Math.PI) / 5)) % 1) + 1) % 1;
  return spoke < 0.13 || spoke > 0.87 ? '#a4a6b4' : '#30303c';
}
