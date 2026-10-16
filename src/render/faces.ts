import type { Thing } from '../sim/objects';

/**
 * An object's faces as small canvases, one game pixel per pixel: its side as
 * it stands, its roof and its underside. The scene squashes two of them at a
 * time to fake the flip in 3D. Placeholders, painted in code, until each
 * object gets its pixel grids.
 */
export interface Faces {
  side: HTMLCanvasElement;
  top: HTMLCanvasElement;
  bottom: HTMLCanvasElement;
}

type Paint = (fill: (color: string, x: number, y: number, w?: number, h?: number) => void, w: number, h: number) => void;

const INK = '#141414';
const STEEL = '#8c8c99';
const CREAM = '#fff4e6';
const GRIP = '#2b2233';

function paint(w: number, h: number, art: Paint): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  art(
    (color, x, y, fw = 1, fh = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, fw, fh);
    },
    w,
    h,
  );
  return c;
}

/** A face from rows of palette letters, '.' for nothing: one letter a pixel. */
function grid(rows: string[], palette: Record<string, string>): HTMLCanvasElement {
  const w = rows[0]!.length;
  if (rows.some((r) => r.length !== w)) throw new Error('a grid row is the wrong length');
  return paint(w, rows.length, (f) =>
    rows.forEach((row, y) => [...row].forEach((ch, x) => palette[ch] && f(palette[ch], x, y))),
  );
}

const ROADSTER: Record<string, string> = {
  W: '#ecedf2',
  S: '#b9bcc8',
  G: '#262536',
  g: '#4a4866',
  K: '#1c1c24',
  H: CREAM,
  L: '#ff4d6d',
  T: INK,
  R: '#a8a8b6',
  r: '#e2e2ea',
  N: STEEL,
};

/**
 * The Roadster: a low white wedge, nose to the left, under one dark glass
 * canopy, on big dark wheels, with thruster nozzles under its floor.
 */
function roadster(t: Thing): Faces {
  const { length: L, width: W } = t;
  const glass = (at: number) => `${'G'.repeat(at)}g${'G'.repeat(16 - at)}`;
  const cabin = (edge: string, g: string) => `${edge}${'W'.repeat(10)}${g}WWWWWL`;
  return {
    side: grid(
      [
        '...................WWWWWW.........',
        '.................GGGgGGGGWWWW.....',
        '..............GGGGGgGGGGGGGGWWWWWW',
        '...........GGGGGGGgGGGGGGGGGWWWWWL',
        '........WWWWWWWWWWWWWWWWWWWWWWWWWL',
        '....WKKKKWWWWWWWWWWWWWWWWKKKKWWWWK',
        'HHWWSTTTTSSSSSSSSSSSSSSSSTTTTSSSSK',
        '.KKKTRRRRTKKKKKKKKKKKKKKTRRRRTKKK.',
        '.N..TRrrRT..NN......NN..TRrrRT..N.',
        '.....TTTT................TTTT.....',
      ],
      ROADSTER,
    ),
    top: grid(
      [
        '.....TTTT................TTTT.....',
        '........WWWWWWWWWWWWWWWWWWWWWWWWWW',
        '....WWWWWWWWWWWWWWWWWWWWWWWWWWWWWL',
        cabin('W', glass(9)),
        cabin('H', glass(8)),
        cabin('H', glass(7)),
        cabin('H', glass(6)),
        cabin('H', glass(5)),
        cabin('H', glass(4)),
        cabin('H', 'G'.repeat(17)),
        cabin('W', 'G'.repeat(17)),
        '....WWWWWWWWWWWWWWWWWWWWWWWWWWWWWL',
        '........WWWWWWWWWWWWWWWWWWWWWWWWWW',
        '.....TTTT................TTTT.....',
      ],
      ROADSTER,
    ),
    bottom: paint(L, W, (f) => {
      // The same wedge from below: dark, a copper floor, wheels at the corners, and the nozzles.
      f('#1c1c24', 8, 1, L - 8, W - 2);
      f('#1c1c24', 4, 2, 4, W - 4);
      f('#1c1c24', 0, 3, 4, W - 6);
      f('#7a3f33', 10, 3, 14, W - 6);
      for (const x of [5, 25]) {
        f(INK, x, 0, 4, 3);
        f(INK, x, W - 3, 4, 3);
      }
      for (const [x, y] of [
        [11, 2],
        [19, 2],
        [11, W - 5],
        [19, W - 5],
      ] as const) {
        f(STEEL, x, y, 3, 3);
        f('#4dc3ff', x + 1, y + 1, 1, 1);
      }
      f(STEEL, 1, 6, 2, 2);
      f(STEEL, L - 3, 6, 2, 2);
    }),
  };
}

/** A skateboard: grip on top, a graphic underneath, four wheels. */
function skateboard(t: Thing): Faces {
  const { length: L, width: W } = t;
  return {
    side: paint(L, t.height, (f) => {
      f('#c98b4a', 0, 0, 2, 1);
      f('#c98b4a', L - 2, 0, 2, 1);
      f(GRIP, 2, 0, L - 4, 1);
      f('#c98b4a', 1, 1, L - 2, 1);
      for (const x of [5, L - 8]) {
        f(STEEL, x, 2, 3, 1);
        f(CREAM, x, 3, 3, 2);
      }
    }),
    top: paint(L, W, (f) => {
      f(GRIP, 2, 0, L - 4, W);
      f(GRIP, 0, 2, L, W - 4);
      f(GRIP, 1, 1, L - 2, W - 2);
      for (const x of [6, L - 7]) {
        f(STEEL, x, 3, 1, 1);
        f(STEEL, x, W - 4, 1, 1);
      }
    }),
    bottom: paint(L, W, (f) => {
      f('#3d6cff', 2, 0, L - 4, W);
      f('#3d6cff', 0, 2, L, W - 4);
      f('#3d6cff', 1, 1, L - 2, W - 2);
      for (let i = 0; i < 6; i++) f('#3df5ff', 10 + i * 2, i + 1, 2, 1);
      for (const x of [5, L - 8]) {
        f(STEEL, x + 1, 2, 1, W - 4);
        f(CREAM, x, 0, 3, 2);
        f(CREAM, x, W - 2, 3, 2);
      }
    }),
  };
}

/** A brick, with an arrow on its side to say which way is up, and holes on top. */
function brick(t: Thing): Faces {
  const { length: L, height: H, width: W } = t;
  return {
    side: paint(L, H, (f) => {
      f('#b5523b', 0, 0, L, H);
      f('#8f3f2d', 0, H - 1, L, 1);
      f('#c8664d', 0, 0, L, 1);
      f(CREAM, 8, 1, 2, 1);
      f(CREAM, 7, 2, 4, 1);
      f(CREAM, 6, 3, 6, 1);
      f(CREAM, 8, 4, 2, 3);
    }),
    top: paint(L, W, (f) => {
      f('#c8664d', 0, 0, L, W);
      for (const x of [2, 7, 12]) f('#5a2a1f', x, 3, 4, 4);
    }),
    bottom: paint(L, W, (f) => {
      f('#8f3f2d', 0, 0, L, W);
      f('#7a3526', 1, 1, L - 2, W - 2);
    }),
  };
}

/** Any object without its own paint: a plain box. */
function box(t: Thing): Faces {
  return {
    side: paint(t.length, t.height, (f, w, h) => f('#c0c0d0', 0, 0, w, h)),
    top: paint(t.length, t.width, (f, w, h) => f('#e0e0f0', 0, 0, w, h)),
    bottom: paint(t.length, t.width, (f, w, h) => f('#606070', 0, 0, w, h)),
  };
}

const PAINTS: Record<string, (t: Thing) => Faces> = { roadster, skateboard, brick };

export function facesOf(t: Thing): Faces {
  return (PAINTS[t.id] ?? box)(t);
}

/** The sneaker that kicks, toe to the right. */
export function sneaker(): HTMLCanvasElement {
  return paint(10, 5, (f) => {
    f(CREAM, 4, 0, 3, 1);
    f(CREAM, 2, 1, 6, 1);
    f('#3df5ff', 4, 1, 2, 1);
    f(CREAM, 0, 2, 9, 1);
    f(CREAM, 0, 3, 10, 1);
    f(GRIP, 0, 4, 10, 1);
  });
}
