import type { Thing } from '../sim/objects';
import type { Paint } from './paint';
import { PAINTS, box } from './things';

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
  cols: Column[];
}

/** A run of rows of one column that is equally wide all the way down: from row r0 to r1, across from far to near. */
export interface Slab {
  r0: number;
  r1: number;
  far: number;
  near: number;
}

/**
 * One column along the length, in the faces' own pixels. The side face's
 * rows from `top` to `base` are the column's outline. Between `roof` and
 * `floor` the column is solid: a stack of slabs, each as wide as the object
 * is at that height, so a head can be narrower than the body under it. Above
 * the roof and below the floor are parts drawn on the side only: a handle,
 * ears, a fin, wheels, legs. `far` and `near` are how far across the column
 * reaches, counted across the roof face from its far edge.
 */
export interface Column {
  top: number;
  roof: number;
  floor: number;
  base: number;
  far: number;
  near: number;
  slabs: Slab[];
}

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

function columns(t: Thing, paint: Paint): Column[] {
  const { length: L, height: H, width: W } = t;
  const side = paint.side.getContext('2d')!.getImageData(0, 0, L, H).data;
  const roofFace = paint.top.getContext('2d')!.getImageData(0, 0, L, W).data;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));
  const cols: Column[] = [];
  for (let x = 0; x < L; x++) {
    const s = extent(side, L, H, x);
    const [top, base] = s ? [s[0], s[1] + 1] : [H / 2, H / 2];
    const roof = paint.roof ? clamp(paint.roof(x + 0.5), top, base) : top;
    const floor = paint.floor ? clamp(paint.floor(x + 0.5), roof, base) : base;
    const a = extent(roofFace, L, W, x);
    const [far, near] = a ? [a[0], a[1] + 1] : [W / 2, W / 2];
    const slabs: Slab[] = [];
    for (let r = roof; r < floor; r++) {
      // Nothing there in the side view, nothing there at all.
      if (side[(r * L + x) * 4 + 3]! === 0) continue;
      let [f, n] = [far, near];
      if (paint.across) {
        const half = Math.max(0.5, paint.across(x + 0.5, r + 0.5));
        [f, n] = [Math.max(0, Math.round(W / 2 - half)), Math.min(W, Math.round(W / 2 + half))];
        if (n <= f) [f, n] = [Math.floor(W / 2), Math.floor(W / 2) + 1];
      }
      const last = slabs[slabs.length - 1];
      if (last && last.r1 === r && last.far === f && last.near === n) last.r1 = r + 1;
      else slabs.push({ r0: r, r1: r + 1, far: f, near: n });
    }
    cols.push({ top, roof, floor, base, far, near, slabs });
  }
  return cols;
}
