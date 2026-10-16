import type { Thing } from '../sim/objects';

/**
 * An object's faces as small canvases, one pixel per pixel drawn: its side
 * as it stands, its roof and its underside. The scene squashes two of them at
 * a time to fake the flip in 3D. Each face is painted in code, pixel by
 * pixel, from shapes and shading, so it stays crisp pixel art at any size.
 */
export interface Faces {
  side: HTMLCanvasElement;
  top: HTMLCanvasElement;
  bottom: HTMLCanvasElement;
  /** The same faces upside down, for drawing a column of one turned over. */
  flipped: { side: HTMLCanvasElement; top: HTMLCanvasElement; bottom: HTMLCanvasElement };
  /** The object's shape column by column, from its faces. */
  cols: Columns;
}

/**
 * Per column along the length, in the faces' own pixels: where the roof is
 * and where the side ends below it, counted down the side face; where the
 * floor is, which the underside is drawn at (above any wheels); and how far
 * across the object reaches, counted across the roof face from its far edge.
 */
export interface Columns {
  roof: Float32Array;
  base: Float32Array;
  floor: Float32Array;
  far: Float32Array;
  near: Float32Array;
}

/** What a painter makes: the three faces, and where the floor is if it isn't the side's bottom. */
interface Paint {
  side: HTMLCanvasElement;
  top: HTMLCanvasElement;
  bottom: HTMLCanvasElement;
  floor?: (x: number) => number;
}

/** Where the Roadster's thrusters sit under its floor, as shares of its length from the nose. */
export const NOZZLES = [0.05, 0.39, 0.6, 0.95];

type RGB = [number, number, number];
/** A pixel's colour from its centre, or null for none. */
type Shader = (x: number, y: number) => string | null;
type Points = [number, number][];

const OUTLINE = '#14121c';
const CREAM = '#fff4e6';
const STEEL = '#8c8c99';
const TYRE = '#141419';
const GRIP = '#26222e';
const JET = '#4dc3ff';

const rgbs = new Map<string, RGB>();
function rgb(hex: string): RGB {
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

/** A fixed noise in [0, 1) per pixel: texture that looks the same every time. */
export function noise(x: number, y: number, seed = 0): number {
  let h = (Math.imul(Math.floor(x), 374761393) + Math.imul(Math.floor(y), 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Straight lines between points sorted by x, level beyond the ends. */
function along(points: Points, x: number): number {
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

/**
 * Paints `w` by `h` pixels from a shader, then darkens the pixels on the
 * edge of what it drew, so the shape reads against any background.
 */
function shade(w: number, h: number, fn: Shader, edge = 0.5): HTMLCanvasElement {
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
    const ink = rgb(OUTLINE);
    const rim: number[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) if (solid(x, y) && !(solid(x - 1, y) && solid(x + 1, y) && solid(x, y - 1) && solid(x, y + 1))) rim.push((y * w + x) * 4);
    }
    for (const o of rim) for (let i = 0; i < 3; i++) d[o + i] = Math.round(d[o + i]! + (ink[i]! - d[o + i]!) * edge);
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** A wheel seen side on: tyre, silver lip, a dark face with five spokes, and the hub. */
function wheel(dx: number, dy: number, r: number): string {
  const d = Math.hypot(dx, dy);
  if (d > r - 1.4) return dy < -r * 0.55 ? '#2c2c36' : TYRE;
  if (d > r - 2.3) return '#b8bac6';
  if (d < 1.3) return '#e6e7ee';
  const spoke = (((Math.atan2(dy, dx) / ((2 * Math.PI) / 5)) % 1) + 1) % 1;
  return spoke < 0.13 || spoke > 0.87 ? '#a4a6b4' : '#30303c';
}

/** Inside a pill `length` by `width`, rounded at both ends, and how far from its middle line. */
function pill(x: number, y: number, length: number, width: number): number {
  const r = width / 2;
  return Math.hypot(x - Math.max(r, Math.min(length - r, x)), y - r) / (r - 0.3);
}

/** The Roadster's outline from above, as half its width along its length. */
const ROADSTER_HALF: Points = [
  [0, 9.5],
  [6, 12.5],
  [16, 14.5],
  [72, 14.8],
  [80, 13.8],
];

/**
 * The Roadster: a low white wedge, nose to the left, under one dark glass
 * canopy, on big wheels, with a light bar across the nose, a red one across
 * the tail, and thruster nozzles under its floor.
 */
function roadster(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const top: Points = [
    [0, 12.5],
    [4, 11.2],
    [24, 8.2],
    [44, 1.2],
    [66, 2.8],
    [78, 4.2],
    [80, 4.8],
  ];
  const bottom: Points = [
    [0, 14],
    [5, 16.8],
    [10, 17.6],
    [72, 17.6],
    [80, 15.5],
  ];
  const belt: Points = [
    [22, 10.4],
    [72, 7.4],
  ];
  const crease: Points = [
    [4, 13.6],
    [78, 10.6],
  ];
  const r = 7.2;
  const wy = H - r;
  const wheels = [17, 63];
  const mid = W / 2;

  const side = shade(L, H, (x, y) => {
    for (const wx of wheels) if (Math.hypot(x - wx, y - wy) <= r) return wheel(x - wx, y - wy, r);
    const t = along(top, x);
    const b = along(bottom, x);
    if (y >= t && y <= b) {
      // The arches, dark around the tyres.
      if (wheels.some((wx) => Math.hypot(x - wx, y - wy) < r + 1.4)) return '#15151c';
      // Black trim along the bottom.
      if (y > b - 2.6) return '#2a2a34';
      const bl = along(belt, x);
      if (x >= 24 && x <= 70 && y < bl) {
        // The canopy: one dark glass from windshield to tail, framed white on top, with a streak of sky in it.
        if (x > 30 && y < t + 1) return '#e8eaf0';
        if (Math.abs(x - 2 * y - 34) < 1.2) return '#4f4d6c';
        if (Math.abs(x - 2 * y - 42) < 0.6) return '#3a3852';
        return mix('#1d1c29', '#2e2d40', (y - t) / Math.max(1, bl - t));
      }
      if (x < 9 && y - t >= 0.4 && y - t < 1.6) return '#fff3c4';
      if (x > 77 && y > 4.6 && y < 8) return '#ff3b5c';
      if (Math.abs(y - along(crease, x)) < 0.5) return '#d2d5de';
      if (Math.floor(x) === 46 && y > bl + 1 && y < b - 3) return '#c4c7d1';
      if (x > 51 && x < 55 && Math.abs(y - (bl + 2.2)) < 0.5) return '#aeb1bd';
      // White paint, greyer toward the sill.
      const k = (y - t) / Math.max(1, b - t);
      return mix('#f6f7fa', '#c3c6d1', k * k);
    }
    for (const n of NOZZLES) {
      const nx = n * L;
      if (Math.abs(x - nx) < 1.6 && y > b && y < b + 2.2) return y > b + 1.4 ? JET : STEEL;
    }
    return null;
  });

  const glassHalf: Points = [
    [25, 5],
    [33, 11.5],
    [66, 11.5],
    [71, 8],
  ];
  const roof = shade(L, W, (x, y) => {
    const dy = Math.abs(y - mid);
    const hw = along(ROADSTER_HALF, x);
    if (dy > hw) {
      // Tyres just show past the sides; so do the mirrors.
      if (wheels.some((wx) => Math.abs(x - wx) < r)) return TYRE;
      if (x > 29 && x < 32.5 && dy <= hw + 1.8) return '#dfe1e8';
      return null;
    }
    if (x < 1.4) return '#fff3c4';
    if (x > L - 1.4) return '#ff3b5c';
    if (x >= 25 && x <= 71 && dy <= along(glassHalf, x)) {
      const s = x + 1.3 * (y - mid);
      if (Math.abs(s - 44) < 1.3) return '#4f4d6c';
      if (Math.abs(s - 52) < 0.6) return '#3a3852';
      return mix('#1d1c29', '#2a2938', dy / 12);
    }
    const k = dy / hw;
    return mix('#f6f7fa', '#c3c6d1', k * k);
  });

  const under = shade(L, W, (x, y) => {
    const dy = Math.abs(y - mid);
    for (const wx of wheels) if (Math.abs(x - wx) < r && dy > mid - 5.5) return Math.floor(x) % 3 === 0 ? '#24242c' : TYRE;
    if (dy > along(ROADSTER_HALF, x)) return null;
    for (const [nx, ny, nr] of [
      [NOZZLES[1]! * L, mid - 7, 2.6],
      [NOZZLES[1]! * L, mid + 7, 2.6],
      [NOZZLES[2]! * L, mid - 7, 2.6],
      [NOZZLES[2]! * L, mid + 7, 2.6],
      [NOZZLES[0]! * L, mid, 2],
      [NOZZLES[3]! * L, mid, 2],
    ] as const) {
      const d = Math.hypot(x - nx, y - ny);
      if (d < nr) return d < 0.8 ? '#e0f6ff' : d < nr - 1 ? JET : STEEL;
    }
    if (wheels.some((wx) => Math.abs(x - wx) < 0.8)) return '#5a5a68';
    if (x > 14 && x < 66 && dy < 9.5) return Math.floor(x) % 4 === 0 ? '#86493c' : '#6e3a30';
    return '#1c1c24';
  });

  return { side, top: roof, bottom: under, floor: (x) => along(bottom, x) };
}

/** A skateboard: maple deck with kicktails, grip on top, a graphic underneath, trucks and four wheels. */
function skateboard(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const deck: Points = [
    [0, 0.8],
    [7, 3.2],
    [L - 7, 3.2],
    [L, 0.8],
  ];
  const trucks = [16, L - 16];
  const side = shade(L, H, (x, y) => {
    const yd = along(deck, x);
    if (Math.abs(y - yd) <= 1.3 && x > 0.3 && x < L - 0.3) return y < yd - 0.5 ? GRIP : y < yd + 0.4 ? '#e0a868' : '#b8783e';
    for (const tx of trucks) {
      if (Math.abs(x - tx) < 4 && y > 4.4 && y < 5.4) return STEEL;
      if (y >= 5.4 && y < 7.4 && Math.abs(x - tx) < 2.6 - (y - 5.4) * 0.4) return '#b0b2be';
      const d = Math.hypot(x - tx, y - (H - 2.8));
      if (d < 2.8) return d < 0.9 ? '#b9bcc8' : CREAM;
    }
    return null;
  });
  const grip = shade(L, W, (x, y) => {
    const p = pill(x, y, L, W);
    if (p > 1) return null;
    if (p > 0.86) return '#c98b4a';
    for (const tx of trucks) for (const bx of [tx - 3, tx + 3]) for (const by of [W / 2 - 3.5, W / 2 + 3.5]) if (Math.abs(x - bx) < 0.6 && Math.abs(y - by) < 0.6) return '#a8aab8';
    return noise(x, y, 1) < 0.14 ? '#3a3446' : GRIP;
  });
  const graphic = shade(L, W, (x, y) => {
    for (const tx of trucks) {
      if (Math.abs(x - tx) < 2.6 && (y < 2.8 || y > W - 2.8)) return CREAM;
      if (Math.abs(x - tx) < 1.1 && y > 2.8 && y < W - 2.8) return '#b0b2be';
    }
    const p = pill(x, y, L, W);
    if (p > 1) return null;
    if (p > 0.86) return '#c98b4a';
    if (x > L / 2 - 5 && x < L / 2 + 5) return '#ff4d79';
    return (x + y) % 12 < 3 ? '#3df5ff' : '#3d6cff';
  });
  return { side, top: grip, bottom: graphic, floor: (x) => along(deck, x) + 1.3 };
}

/** A brick, with an arrow painted on its side to say which way is up, and three holes on top. */
function brick(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const clay = (x: number, y: number, base: string, seed: number) => {
    const n = noise(x, y, seed);
    return n < 0.14 ? mix(base, '#000000', 0.14) : n > 0.88 ? mix(base, '#ffffff', 0.12) : base;
  };
  const side = shade(L, H, (x, y) => {
    const ax = Math.abs(x - L / 2);
    const arrow = (y >= 3 && y < 9 && ax < y - 3 + 0.6) || (y >= 9 && y < H - 3 && ax < 2.2);
    if (arrow && noise(x, y, 7) > 0.12) return '#f2e6d8';
    if (y < 1) return '#cf6a4f';
    if (y > H - 1) return '#8a3a2a';
    return clay(x, y, '#b5523b', 3);
  });
  const holes = [L / 2 - 12, L / 2, L / 2 + 12];
  const top = shade(L, W, (x, y) => {
    for (const hx of holes) {
      const d = Math.hypot(Math.max(0, Math.abs(x - hx) - 2), Math.max(0, Math.abs(y - W / 2) - 5));
      if (d < 2.2) return y < W / 2 - 4 ? '#2e140f' : '#4a2219';
    }
    return clay(x, y, '#c26a4f', 5);
  });
  const bottom = shade(L, W, (x, y) => clay(x, y, '#8f3f2d', 9));
  return { side, top, bottom };
}

/** Any object without its own paint: a plain box. */
function box(t: Thing): Paint {
  return {
    side: shade(t.length, t.height, () => '#c0c0d0'),
    top: shade(t.length, t.width, () => '#e0e0f0'),
    bottom: shade(t.length, t.width, () => '#606070'),
  };
}

const PAINTS: Record<string, (t: Thing) => Paint> = { roadster, skateboard, brick };

export function facesOf(t: Thing): Faces {
  const paint = (PAINTS[t.id] ?? box)(t);
  return { ...paint, flipped: { side: flip(paint.side), top: flip(paint.top), bottom: flip(paint.bottom) }, cols: columns(t, paint) };
}

function flip(img: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d')!;
  ctx.translate(0, img.height);
  ctx.scale(1, -1);
  ctx.drawImage(img, 0, 0);
  return c;
}

/** The first and last rows a column of an image has anything in, or null for an empty column. */
function extent(data: Uint8ClampedArray, w: number, h: number, x: number): [number, number] | null {
  let first = -1;
  let last = -1;
  for (let y = 0; y < h; y++) {
    if (data[(y * w + x) * 4 + 3]! === 0) continue;
    if (first < 0) first = y;
    last = y;
  }
  return first < 0 ? null : [first, last];
}

function columns(t: Thing, paint: Paint): Columns {
  const { length: L, height: H, width: W } = t;
  const side = paint.side.getContext('2d')!.getImageData(0, 0, L, H).data;
  const top = paint.top.getContext('2d')!.getImageData(0, 0, L, W).data;
  const cols: Columns = { roof: new Float32Array(L), base: new Float32Array(L), floor: new Float32Array(L), far: new Float32Array(L), near: new Float32Array(L) };
  for (let x = 0; x < L; x++) {
    const s = extent(side, L, H, x);
    const [roof, base] = s ? [s[0], s[1] + 1] : [H / 2, H / 2];
    cols.roof[x] = roof;
    cols.base[x] = base;
    cols.floor[x] = paint.floor ? Math.max(roof, Math.min(base, paint.floor(x + 0.5))) : base;
    const a = extent(top, L, W, x);
    [cols.far[x], cols.near[x]] = a ? [a[0], a[1] + 1] : [W / 2, W / 2];
  }
  return cols;
}

/** The sneaker that kicks, toe to the right. */
export function sneaker(): HTMLCanvasElement {
  const upper: Points = [
    [0, 3.2],
    [3, 2],
    [7, 1],
    [10, 2],
    [14, 4.2],
    [19, 6.2],
    [20, 7],
  ];
  return shade(20, 10, (x, y) => {
    if (y >= 8) return y >= 9 ? '#2b2233' : '#f2f0ea';
    const t = along(upper, x);
    if (y < t) return null;
    if (x > 4 && x < 15 && Math.abs(y - (7.5 - (x - 4) * 0.33)) < 0.7) return '#3df5ff';
    if (x > 7 && x < 12 && y - t < 1.2 && Math.floor(x) % 2 === 0) return '#9a9cab';
    return CREAM;
  });
}
