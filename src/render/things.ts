import type { Thing } from '../sim/objects';
import { BTC, CREAM, JET, type Paint, type Points, STEEL, TYRE, along, grain, lit, mix, noise, onGlyph, onText, oval, rounded, shade, toPath, wheel } from './paint';

/**
 * Every object's faces, painted in code: its side as it stands, nose or
 * front to the right unless noted, its roof seen from above, far edge first,
 * and its underside seen from below, near edge first. Each reads at a glance,
 * with shading, a dark rim, and the one or two details that say what it is.
 * All of them are Bitcoin things, and most carry its orange.
 */

const ORANGE = '#f7931a';
const ORANGE_DARK = '#c86a10';
const SLATE = '#2f3446';
const INK = '#14121c';
const PAPER = '#f4f1ea';

/** A ₿ on an orange disc centred at (cx, cy), radius r: decals, stamps, stickers. Null off the disc. */
function btcDisc(x: number, y: number, cx: number, cy: number, r: number): string | null {
  const d = Math.hypot(x - cx, y - cy);
  if (d > r) return null;
  const s = r >= 6 ? 2 : 1;
  if (onText('B', x, y, cx - 1.5 * s, cy - 2.5 * s, s)) return CREAM;
  return d > r - 0.8 ? ORANGE_DARK : ORANGE;
}

/** Where the Roadster's thrusters sit under its floor, as shares of its length from the nose. */
export const NOZZLES = [0.05, 0.39, 0.6, 0.95];

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
 * the tail, thruster nozzles under its floor, and a ₿ on the door and the
 * bonnet.
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
      const decal = btcDisc(x, y, 38, 12.4, 3);
      if (decal) return decal;
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
    const decal = btcDisc(x, y, 12, mid, 4.5);
    if (decal) return decal;
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

  return {
    side,
    top: roof,
    bottom: under,
    floor: (x) => along(bottom, x),
    // The cabin is narrower than the body under it.
    across: (x, y) => (x >= 24 && x <= 70 && y < along(belt, x) ? Math.min(along(glassHalf, x) + 1, along(ROADSTER_HALF, x)) : along(ROADSTER_HALF, x)),
  };
}

/** The bitcoin pizza, of the two once bought for 10,000 BTC: its box, an orange stripe, a pizza on the lid, a ₿ stamped in the corner. */
function pizzabox(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const side = shade(L, H, (x, y) => {
    if (y < 1) return '#dcb882';
    if (y < 2) return '#a8844f';
    if (y > 3.5 && y < 5.5 && x > 8 && x < L - 8) return ORANGE;
    return grain(x, y, '#c9a26b', 2, 0.1);
  });
  const pepperoni: Points = [
    [-6, -5],
    [5, -6],
    [0, 1],
    [-8, 5],
    [7, 5],
    [1, -11],
    [-2, 10],
    [10, -1],
    [-11, -2],
  ];
  const top = shade(L, W, (x, y) => {
    const [dx, dy] = [x - L / 2, y - W / 2];
    const d = Math.hypot(dx, dy);
    if (d < 16) {
      if (d > 13.5) return d > 15 ? '#b8782e' : '#e0a050';
      if (pepperoni.some(([px, py]) => Math.hypot(dx - px, dy - py) < 2.3)) return '#9a2a2a';
      if (Math.abs(dx - dy) < 0.5 || Math.abs(dx + dy) < 0.5 || Math.abs(dx) < 0.5 || Math.abs(dy) < 0.5) return '#e8c070';
      return noise(x, y, 4) < 0.35 ? '#ffd166' : '#d64545';
    }
    const stamp = btcDisc(x, y, L - 7.5, 7.5, 5);
    if (stamp) return stamp;
    if ([2, L - 2].some((e) => Math.abs(x - e) < 0.5) || [2, W - 2].some((e) => Math.abs(y - e) < 0.5)) return '#b89058';
    return grain(x, y, '#d4ad74', 3, 0.1);
  });
  const bottom = shade(L, W, (x, y) => {
    if (oval(x, y, L * 0.64, W * 0.38, 7, 5) < 1) return '#a8844f';
    if (Math.abs(y - W / 2) < 0.5) return '#b89058';
    return grain(x, y, '#bf9862', 5, 0.1);
  });
  return { side, top, bottom };
}

/** The whitepaper, folded into a plane, nose to the right: its title on one wing, lines of text on both, a keel folded under. */
function whitepaper(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const wing = (x: number) => 1 + (x * 3.5) / L;
  const keel = (x: number) => 8.5 * Math.max(0, 1 - x / L) ** 0.8;
  const half = (x: number) => (W / 2) * (1 - x / L) + 0.4;
  const side = shade(L, H, (x, y) => {
    const [w, k] = [wing(x), keel(x)];
    if (y < w - 0.6 || y > w + Math.max(0.9, k)) return null;
    if (y < w + 0.6) return '#ffffff';
    if (Math.abs(y - (w + k * 0.5)) < 0.5) return '#d9d4c8';
    return mix(PAPER, '#c9c3b6', (y - w) / 9);
  });
  const top = shade(L, W, (x, y) => {
    const dy = y - W / 2;
    if (Math.abs(dy) > half(x)) return null;
    if (Math.abs(dy) < 0.6) return '#d9d4c8';
    if (onText('BITCOIN', x, y, 3, W / 2 - 8)) return INK;
    const line = Math.floor(y);
    if (line % 2 === 0 && Math.abs(dy) > 1.5 && !(x < 32 && dy < -2 && dy > -9) && noise(Math.floor(x / 4), line, 61) > 0.2) return '#8c8794';
    return dy > 0 ? mix(PAPER, '#c9c3b6', 0.25) : PAPER;
  });
  const bottom = shade(L, W, (x, y) => {
    const dy = Math.abs(y - W / 2);
    if (dy > half(x)) return null;
    if (dy < 2.4 * (1 - x / L) + 0.5) return dy < 0.5 ? '#d9d4c8' : PAPER;
    return Math.floor(y) % 2 === 0 && noise(Math.floor(x / 4), Math.floor(y), 62) > 0.3 ? '#b4afa8' : '#e2ddd2';
  });
  return { side, top, bottom, floor: (x) => wing(x) + 0.8 };
}

/** The three strokes of a snowflake, as half-lengths. */
const FLAKE: Points = [0, 60, 120].map((a) => [4 * Math.cos((a * Math.PI) / 180), 4 * Math.sin((a * Math.PI) / 180)]);

/** Cold storage: a fridge, freezer over fridge, frosted, a snowflake on the freezer, a ₿ magnet and a HODL note on the door, coils at the back. */
function coldStorage(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const side = shade(L, H, (x, y) => {
    if (y >= H - 2) return (x > 3 && x < 8) || (x > L - 8 && x < L - 3) ? '#2b2233' : null;
    if (!rounded(x, y, 0.5, 0, L - 0.5, H - 2, 2.5)) return null;
    if (Math.abs(y - 16) < 0.7) return '#9a9cab';
    if (x > L - 6.5 && x < L - 4.5 && ((y > 5 && y < 12) || (y > 20 && y < 34))) return x < L - 5.5 ? '#c3c6d1' : STEEL;
    const magnet = btcDisc(x, y, 9.5, 23.5, 3.5);
    if (magnet) return magnet;
    if (rounded(x, y, 6, 29, 23, 37, 0.3)) return onText('HODL', x, y, 7, 30.5) ? INK : y < 30 ? '#e0b030' : '#ffe08a';
    if (y < 15 && FLAKE.some(([dx, dy]) => toPath(x, y, [[10 - dx, 8 - dy], [10 + dx, 8 + dy]]) < 0.6)) return '#7fc8ff';
    if (noise(x, y, 63) < (y < 16 ? 0.16 : 0.05)) return '#ffffff';
    return lit('#dfeaf5', ((x - L / 2) / L) * 0.5 + 0.1);
  });
  const top = shade(L, W, (x, y) => {
    if (y < 3.5) return Math.floor(x) % 2 === 0 ? '#3a3a46' : '#5a5a68';
    return noise(x, y, 64) < 0.2 ? '#ffffff' : '#d3dfea';
  });
  const bottom = shade(L, W, (x, y) => {
    for (const [fx, fy] of [
      [5, 5],
      [L - 5, 5],
      [5, W - 5],
      [L - 5, W - 5],
    ] as const)
      if (Math.hypot(x - fx, y - fy) < 2.4) return '#14121c';
    if (y > W - 8 && y < W - 2 && Math.floor(y) % 2 === 0 && x > 6 && x < L - 6) return '#5a5a68';
    return '#3a3a46';
  });
  return { side, top, bottom, floor: () => H - 2 };
}

/**
 * The last bitcoin: a coin lying flat, flipped like one, to land heads up.
 * Heads is bitcoin orange with a cream ₿ in a gold rim; tails says 21M; the
 * edge is gold with its ridges.
 */
function coin(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const r = L / 2 - 0.5;
  const side = shade(L, H, (x, y) => {
    if (y < 1) return '#ffe08a';
    if (y > H - 1) return '#8a6410';
    return Math.floor(x) % 2 === 0 ? '#b08418' : '#d9a520';
  });
  const face = (heads: boolean) =>
    shade(L, W, (x, y) => {
      const d = Math.hypot(x - L / 2, y - W / 2);
      if (d > r) return null;
      if (d > r - 2.5) return Math.floor(Math.atan2(y - W / 2, x - L / 2) * 12) % 2 === 0 ? '#e0b030' : '#c8961c';
      if (d > r - 3.5) return '#a87a14';
      if (heads) {
        const [gx, gy] = [L / 2 - 9, W / 2 - 13];
        if (onGlyph(BTC, x, y, gx, gy, 2)) return CREAM;
        if (onGlyph(BTC, x - 1, y - 1, gx, gy, 2)) return '#b85a10';
        return mix('#ffb04a', '#e07a10', (x + y) / (L + W));
      }
      if (onText('21M', x, y, L / 2 - 11, W / 2 - 5, 2)) return '#7a5410';
      return mix('#f0c040', '#c8961c', (x + y) / (L + W));
    });
  return { side, top: face(true), bottom: face(false) };
}

/** A laser cat, a ginger tabby facing right: stripes, white socks and chest, pink nose, tail up, and laser eyes, flaring red. */
function laserCat(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const FUR = '#f0a040';
  const STRIPE = '#c06a20';
  const tail: Points = [
    [7, 15],
    [3, 12],
    [1.5, 8],
    [2.5, 4],
    [4.8, 2],
  ];
  const legs = [9, 16, 28, 35];
  const side = shade(L, H, (x, y) => {
    for (const ex of [35, 43]) if (y >= 0.8 + Math.abs(x - ex) * 1.5 && y < 5) return Math.abs(x - ex) < 1 && y > 2.5 ? '#ff8fa0' : FUR;
    if (Math.hypot(x - 39, y - 10) < 7.5 || (Math.abs(y - 8.5) < 0.5 && x > 42 && x < 47.5)) {
      const eye = Math.hypot(x - 42, y - 8.5);
      if (eye < 1.6) return eye < 0.8 ? '#ffffff' : '#ff2a2a';
      if ((Math.abs(y - 8.5) < 0.5 && Math.abs(x - 42) < 5.5) || (Math.abs(x - 42) < 0.5 && Math.abs(y - 8.5) < 3.5)) return '#ff6d6d';
      if (Math.hypot(x - 46.4, y - 11) < 0.9) return '#ff8fa0';
      if (oval(x, y, 44, 12.8, 3.2, 2.4) < 1) return CREAM;
      if (Math.floor(x) % 5 === 0 && y < 7) return STRIPE;
      return lit(FUR, (y - 10) / 14);
    }
    if (rounded(x, y, 6, 11, 38, 23, 5)) {
      if (oval(x, y, 35.5, 18, 3, 4.5) < 1) return CREAM;
      if (Math.floor(x) % 6 < 2 && y < 18) return STRIPE;
      return lit(FUR, (y - 15) / 14);
    }
    for (const lx of legs) if (Math.abs(x - lx) < 2.1 && y >= 21) return y > H - 2.5 ? CREAM : lit(FUR, 0.15);
    if (toPath(x, y, tail) < 1.7) return Math.floor(y) % 4 === 0 ? STRIPE : FUR;
    return null;
  });
  const top = shade(L, W, (x, y) => {
    const dy = y - W / 2;
    for (const s of [-1, 1]) if (oval(x, y, 37.5, W / 2 + s * 5.5, 2, 2.4) < 1) return FUR;
    if (Math.hypot(x - 39, dy) < 6.8) return Math.floor(x) % 5 === 0 && x < 41 ? STRIPE : lit(FUR, -0.1);
    if (oval(x, y, 22, W / 2, 16, 7.5) < 1) return Math.floor(x) % 6 < 2 ? STRIPE : FUR;
    if (x < 8 && Math.abs(dy - 1.5 * Math.sin(x * 0.8)) < 1.4) return Math.floor(x) % 3 === 0 ? STRIPE : FUR;
    return null;
  });
  const bottom = shade(L, W, (x, y) => {
    for (const px of [12, 31])
      for (const s of [-1, 1]) {
        const d = Math.hypot(x - px, y - (W / 2 + s * 5));
        if (d < 2.4) return d < 1.1 ? '#ff8fa0' : CREAM;
      }
    if (oval(x, y, 22, W / 2, 16, 7) < 1) return oval(x, y, 22, W / 2, 12, 4.5) < 1 ? CREAM : '#d88a30';
    return Math.hypot(x - 39, y - W / 2) < 6 ? '#d88a30' : null;
  });
  return { side, top, bottom, roof: (x) => (x > 32 ? 10 - Math.sqrt(Math.max(0, 7.5 ** 2 - (x - 39) ** 2)) : 11), floor: () => 23, across: (x, y) => Math.max(x > 6 && x < 38 ? 7.5 * Math.sqrt(Math.max(0, 1 - ((y - 17) / 6.6) ** 2)) : 0, 0.9 * Math.sqrt(Math.max(0, 7.5 ** 2 - (x - 39) ** 2 - (y - 10) ** 2)), 1.5) };
}

/** A hardware wallet: a graphite stick with two buttons on its edge and a port at its end, BTC on its screen. */
function wallet(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const BODY = '#2b2b36';
  const side = shade(L, H, (x, y) => {
    if (y < 2) return (x > 9 && x < 15) || (x > 29 && x < 35) ? STEEL : null;
    if (x > L - 2.5) return y > 5 && y < 9 ? STEEL : null;
    if (!rounded(x, y, 0, 2, L - 2.5, H, 3)) return null;
    if (Math.hypot(x - 6, y - 7) < 1.2) return ORANGE;
    return y < 3 ? '#4a4a5a' : BODY;
  });
  const top = shade(L, W, (x, y) => {
    if (!rounded(x, y, 0, 0, L - 2, W, 4)) return null;
    if (x > 6 && x < 30 && y > 4 && y < W - 4) return onText('BTC', x, y, 12.5, W / 2 - 2.5) ? '#6cff8f' : '#0c0c12';
    for (const by of [7, W - 7]) if (Math.hypot(x - 36, y - by) < 2.6) return STEEL;
    return y < 2 ? ORANGE : BODY;
  });
  const bottom = shade(L, W, (x, y) => {
    if (!rounded(x, y, 0, 0, L - 2, W, 4)) return null;
    for (const [sx, sy] of [
      [4, 4],
      [L - 7, 4],
      [4, W - 4],
      [L - 7, W - 4],
    ] as const)
      if (Math.hypot(x - sx, y - sy) < 1) return '#5a5a68';
    return '#22222c';
  });
  return { side, top, bottom, roof: () => 2 };
}

/** The orange pill: a capsule, half bitcoin orange with a ₿, half white. */
function orangePill(t: Thing): Paint {
  const { length: L, height: H } = t;
  const r = H / 2;
  const capsule = (x: number) => {
    const dx = Math.max(0, Math.abs(x - L / 2) - (L / 2 - r));
    return Math.sqrt(Math.max(0, r * r - dx * dx));
  };
  const face = (k: number, logo: boolean) =>
    shade(L, H, (x, y) => {
      const half = capsule(x);
      const v = (y - r) / Math.max(0.5, half);
      if (Math.abs(v) > 1) return null;
      if (logo && onText('B', x, y, 12, r - 5, 2)) return CREAM;
      if (Math.abs(x - L / 2) < 0.6) return '#9a8a7a';
      return lit(x < L / 2 ? ORANGE : PAPER, v * 0.5 + k);
    });
  return { side: face(0, true), top: face(-0.1, false), bottom: face(0.2, false), across: (x, y) => Math.sqrt(Math.max(0.25, capsule(x) ** 2 - (y - r) ** 2)) };
}

/** A block of the chain: BLOCK on an orange header, its transactions in lines, a Merkle tree on top. */
function block(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const side = shade(L, H, (x, y) => {
    if (y < 7) return onText('BLOCK', x, y, L / 2 - 9.5, 1) ? CREAM : ORANGE;
    const row = Math.floor((y - 9) / 3);
    if (y >= 9 && (y - 9) % 3 < 1 && row < 5 && x > 3 && x < 3 + 10 + Math.floor(noise(row, 3, 31) * 22)) return '#8c93ad';
    return grain(x, y, SLATE, 32, 0.05);
  });
  const nodes: Points = [
    [L / 2, 5],
    [L / 4, 13],
    [(3 * L) / 4, 13],
    [L / 8, 22],
    [(3 * L) / 8, 22],
    [(5 * L) / 8, 22],
    [(7 * L) / 8, 22],
  ];
  const edges: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 3],
    [1, 4],
    [2, 5],
    [2, 6],
  ];
  const top = shade(L, W, (x, y) => {
    if (nodes.some(([nx, ny]) => Math.hypot(x - nx, y - ny) < 2.2)) return ORANGE;
    if (edges.some(([a, b]) => toPath(x, y, [nodes[a]!, nodes[b]!]) < 0.6)) return '#c9a26b';
    return '#3a4058';
  });
  const bottom = shade(L, W, (x, y) => grain(x, y, '#262a38', 33, 0.05));
  return { side, top, bottom };
}

/** A bitcoin ATM: an orange kiosk with ATM on its header, a ₿ on its screen, a keypad and a cash slot. */
function atm(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const side = shade(L, H, (x, y) => {
    if (y > H - 4) return x > 1 && x < L - 1 ? '#3a3a46' : null;
    if (!rounded(x, y, 0, 0, L, H - 4, 4)) return null;
    if (y < 8) return onText('ATM', x, y, L / 2 - 5.5, 1.5) ? ORANGE : CREAM;
    if (x > 5 && x < L - 5 && y > 10 && y < 26) return onGlyph(BTC, x, y, L / 2 - 4.5, 11.5, 1) ? CREAM : '#101420';
    if (y > 29 && y < 39 && x > 9 && x < L - 9) return (x - 9) % 5 < 3.5 && (y - 29) % 3.4 < 2.4 ? '#c3c6d1' : '#2b2b36';
    if (y > 42 && y < 44 && x > 8 && x < L - 8) return INK;
    return lit(ORANGE, ((x - L / 2) / L) * 0.6);
  });
  const top = shade(L, W, (x, y) => (rounded(x, y, 0, 0, L, W, 3) ? (x < 2 || x > L - 2 || y < 2 || y > W - 2 ? ORANGE_DARK : ORANGE) : null));
  const bottom = shade(L, W, () => '#3a3a46');
  return { side, top, bottom, floor: () => H - 4 };
}

/** A HODL sign: a placard on a stick. */
function hodl(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const BOARD = 26;
  const side = shade(L, H, (x, y) => {
    if (y >= BOARD) return Math.abs(x - L / 2) < 2 ? (Math.floor(y) % 5 === 0 ? '#8a4f22' : '#a8642e') : null;
    if (x < 2 || x > L - 2 || y < 2 || y > BOARD - 2) return ORANGE;
    return onText('HODL', x, y, L / 2 - 15, BOARD / 2 - 5, 2) ? INK : CREAM;
  });
  const edge = (c: string) => shade(L, W, (x) => (x < 1.5 || x > L - 1.5 ? ORANGE : c));
  return { side, top: edge(CREAM), bottom: edge('#e8e2d6'), floor: () => BOARD };
}

/** A moon rocket: white, an orange nose and band, a porthole, two fins and a nozzle. */
function rocket(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const c = L / 2;
  const radius = (y: number) => (y < 16 ? 1 + (y / 16) * 8.5 : y < 42 ? 9.5 : 9.5 - (y - 42) * 0.45);
  const side = shade(L, H, (x, y) => {
    const dx = Math.abs(x - c);
    const finW = y > 34 ? ((y - 34) / (H - 34)) * (c - 10.5) : -1;
    if (y >= H - 3) return dx < 5 ? '#5a5a68' : dx > radius(y) && dx <= radius(y) + finW ? '#e0502a' : null;
    if (dx > radius(y)) return dx <= radius(y) + finW ? '#e0502a' : null;
    const u = (x - c) / radius(y);
    if (y < 16) return lit(ORANGE, u * 0.5);
    const w = Math.hypot(x - c, y - 23);
    if (w < 4) return w < 2.8 ? '#9fd8ff' : ORANGE;
    if (y > 31 && y < 35) return lit(ORANGE, u * 0.5);
    return lit(PAPER, u * 0.5);
  });
  const fins = (x: number, y: number) => (Math.abs(x - c) < 1.2 || Math.abs(y - W / 2) < 1.2) && Math.hypot(x - c, y - W / 2) < c - 1;
  const top = shade(L, W, (x, y) => {
    const d = Math.hypot(x - c, y - W / 2);
    if (d < 6) return d < 1.5 ? ORANGE_DARK : lit(ORANGE, (d / 6) * 0.4);
    if (d < 9.5) return lit(PAPER, (d / 9.5) * 0.4);
    return fins(x, y) ? '#e0502a' : null;
  });
  const bottom = shade(L, W, (x, y) => {
    const d = Math.hypot(x - c, y - W / 2);
    if (d < 5) return d < 3 ? INK : '#5a5a68';
    if (d < 9.5) return lit(PAPER, 0.2);
    return fins(x, y) ? '#b03a1a' : null;
  });
  return { side, top, bottom, across: (x, y) => Math.max(1, Math.sqrt(Math.max(0, radius(y) ** 2 - (x - c) ** 2))) };
}

/** A full node: a little aluminium box, its lights on, a ₿ sticker, vents. */
function node(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const side = shade(L, H, (x, y) => {
    if (y >= H - 2) return (x > 3 && x < 8) || (x > L - 8 && x < L - 3) ? INK : null;
    if (!rounded(x, y, 0, 0, L, H - 2, 2)) return null;
    if (y > 4 && y < 7) for (const [lx, c] of [[6, '#6cff8f'], [10, '#6cff8f'], [14, '#6cff8f'], [18, ORANGE]] as const) if (Math.abs(x - lx) < 1.2) return c;
    const sticker = btcDisc(x, y, L - 10, 11, 5.5);
    if (sticker) return sticker;
    if (y > 15 && y < 21 && x > 4 && x < 26 && Math.floor(y) % 2 === 0) return '#22242c';
    return y < 1.5 ? '#6a6e7c' : '#4a4e5a';
  });
  const top = shade(L, W, (x, y) => {
    if (onText('NODE', x, y, L / 2 - 7.5, W / 2 - 2.5)) return '#6cff8f';
    return Math.floor(x) % 4 === 0 && y > 3 && y < W - 3 ? '#3a3d48' : '#4a4e5a';
  });
  const feet: Points = [
    [4, 4],
    [L - 4, 4],
    [4, W - 4],
    [L - 4, W - 4],
  ];
  const bottom = shade(L, W, (x, y) => (feet.some(([fx, fy]) => Math.hypot(x - fx, y - fy) < 2) ? INK : '#2f323c'));
  return { side, top, bottom, floor: () => H - 2 };
}

/** A piggy bank, facing right: pink, a ₿ on its side, a coin going into the slot on its back. */
function piggy(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const PINK = '#ff9fb4';
  const SNOUT = '#ff7f9e';
  const side = shade(L, H, (x, y) => {
    if (Math.hypot(x - 22, y - 4) < 3.6 && y < 6.5) return y < 1.5 ? '#ffe08a' : '#d9a520';
    for (const lx of [10, 16, 28, 34]) if (Math.abs(x - lx) < 2 && y > 22) return y > H - 2 ? '#c06a80' : '#ff8fa6';
    if (oval(x, y, 41.5, 16, 4, 4.2) < 1) return Math.hypot(x - 42.5, y - 15) < 0.8 || Math.hypot(x - 42.5, y - 17.5) < 0.8 ? '#c06a80' : SNOUT;
    if (y > 2 && y < 9 && x > 31 && x < 37 && y > 2 + Math.abs(x - 34) * 1.6) return SNOUT;
    if (toPath(x, y, [[4.5, 14], [2, 12], [1.5, 9], [3.5, 8]]) < 0.8) return SNOUT;
    if (oval(x, y, 22, 16, 18, 10) < 1) {
      if (Math.hypot(x - 35, y - 12) < 1.2) return INK;
      if (y > 6 && y < 7.5 && Math.abs(x - 22) < 4) return '#6a2a3a';
      return btcDisc(x, y, 20, 17, 5) ?? lit(PINK, (y - 16) / 18);
    }
    return null;
  });
  const top = shade(L, W, (x, y) => {
    if (oval(x, y, 42, W / 2, 3.5, 4) < 1) return SNOUT;
    for (const s of [-1, 1]) if (oval(x, y, 33, W / 2 + s * 6, 2.5, 2) < 1) return SNOUT;
    const b = oval(x, y, 22, W / 2, 18, 12);
    if (b > 1) return toPath(x, y, [[4, W / 2], [1, W / 2 + 2]]) < 0.8 ? SNOUT : null;
    if (Math.abs(y - W / 2) < 0.8 && Math.abs(x - 22) < 4) return '#6a2a3a';
    return lit(PINK, b * 0.3);
  });
  const bottom = shade(L, W, (x, y) => {
    for (const lx of [13, 31]) for (const s of [-1, 1]) if (Math.hypot(x - lx, y - (W / 2 + s * 5)) < 2.2) return '#c06a80';
    return oval(x, y, 22, W / 2, 18, 12) < 1 ? '#ffb6c6' : null;
  });
  return {
    side,
    top,
    bottom,
    roof: (x) => 16 - 10 * Math.sqrt(Math.max(0, 1 - ((x - 22) / 18) ** 2)),
    floor: () => 24,
    across: (x, y) => Math.max(oval(x, y, 41.5, 16, 4, 4.2) < 1 ? 3.5 : 0, 12 * Math.sqrt(Math.max(0, 1 - ((x - 22) / 18) ** 2 - ((y - 16) / 10) ** 2)), 1),
  };
}

/** A bull, facing right: dark hide, pale horns, a gold nose ring, tail with a tuft. */
function bull(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const HIDE = '#5a3218';
  const legs = [12, 19, 40, 47];
  const side = shade(L, H, (x, y) => {
    if (toPath(x, y, [[50, 9], [52, 4], [57, 1.5]]) < 1.3 || toPath(x, y, [[58, 9], [60, 4], [64, 2]]) < 1.3) return '#f2e6d0';
    if (Math.abs(Math.hypot(x - 63, y - 21) - 2) < 0.7 && y > 21) return '#ffd166';
    if (oval(x, y, 56, 15, 9, 8) < 1) {
      if (Math.hypot(x - 58, y - 12) < 1.4) return x > 58.4 ? '#ffffff' : INK;
      if (oval(x, y, 62, 19, 4, 3.2) < 1) return '#8a5a3a';
      return lit(HIDE, (y - 15) / 20);
    }
    if (rounded(x, y, 8, 10, 52, 30, 8)) return lit(y > 24 ? '#7a4a28' : HIDE, (y - 20) / 24);
    for (const lx of legs) if (Math.abs(x - lx) < 2.5 && y >= 26) return y > H - 3 ? INK : lit(HIDE, 0.2);
    if (toPath(x, y, [[9, 13], [4, 20], [3, 28]]) < 0.9) return HIDE;
    if (Math.hypot(x - 3, y - 29) < 2) return INK;
    return null;
  });
  const top = shade(L, W, (x, y) => {
    const dy = Math.abs(y - W / 2);
    if (x > 50 && x < 58 && dy > 6 && dy < 12 && Math.abs(dy - 6.5 - (x - 50) * 0.6) < 1.4) return '#f2e6d0';
    if (oval(x, y, 56, W / 2, 8, 6.5) < 1) return lit(HIDE, -0.05);
    const b = oval(x, y, 30, W / 2, 23, 10.5);
    if (b < 1) return lit(HIDE, b * 0.3);
    return x < 9 && dy < 1 ? HIDE : null;
  });
  const bottom = shade(L, W, (x, y) => {
    for (const lx of [15, 43]) for (const s of [-1, 1]) if (Math.hypot(x - lx, y - (W / 2 + s * 6)) < 2.5) return INK;
    return oval(x, y, 30, W / 2, 23, 10.5) < 1 ? '#8a5a3a' : null;
  });
  return {
    side,
    top,
    bottom,
    roof: (x) => (x > 47 ? 7 : 10),
    floor: () => 28,
    across: (x, y) => Math.max(oval(x, y, 56, 15, 9, 8) < 1 ? 6 : 0, rounded(x, y, 8, 10, 52, 30, 8) ? 10.5 * Math.sqrt(Math.max(0.1, 1 - ((y - 20) / 11) ** 2)) : 0, 1),
  };
}

/** A gold bar: an ingot, stamped 999.9 on its side and, of course, ₿ on top. */
function goldbar(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const inset = (y: number) => 5 * (1 - y / H);
  const side = shade(L, H, (x, y) => {
    if (x < inset(y) || x > L - inset(y)) return null;
    if (onText('999.9', x, y, L / 2 - 9.5, H / 2 - 1.5)) return '#9a6c10';
    return mix('#ffe27a', '#c8961c', y / H);
  });
  const top = shade(L, W, (x, y) => {
    if (!(x > 5 && x < L - 5 && y > 4 && y < W - 4)) return '#d9a520';
    if (onGlyph(BTC, x, y, L / 2 - 4.5, W / 2 - 6.5, 1)) return '#b07a10';
    return mix('#fff0a0', '#e0b030', (x + y) / (L + W));
  });
  const bottom = shade(L, W, () => '#b8861a');
  return { side, top, bottom, across: (_x, y) => W / 2 - 4 * (1 - y / H) };
}

/** An ASIC miner: a finned metal box, a fan at each end, ASIC on an orange plate, its power supply on top. */
function asic(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const fan = (x: number, y: number, cx: number): string | null => {
    const d = Math.hypot(x - cx, y - (H - 2) / 2);
    if (d > 9.5) return null;
    if (d > 8.5) return INK;
    if (d < 2) return STEEL;
    const a = Math.atan2(y - (H - 2) / 2, x - cx) + d * 0.15;
    return (((a / (Math.PI / 2)) % 1) + 1) % 1 < 0.35 ? '#5a5e6c' : '#1c1c24';
  };
  const side = shade(L, H, (x, y) => {
    if (y >= H - 2) return (x > 3 && x < 9) || (x > L - 9 && x < L - 3) ? INK : null;
    if (!rounded(x, y, 0, 0, L, H - 2, 1.5)) return null;
    const f = fan(x, y, 12) ?? fan(x, y, L - 12);
    if (f) return f;
    if (x > 22 && x < L - 22 && y > 8 && y < 17) return onText('ASIC', x, y, L / 2 - 7.5, 10) ? CREAM : ORANGE;
    return Math.floor(x) % 2 === 0 ? '#4a4e5a' : '#3a3d48';
  });
  const top = shade(L, W, (x, y) => {
    if (x > 20 && x < 40 && y > 6 && y < W - 6) return y < 9 ? '#22242c' : '#2f323c';
    if (Math.hypot(x - 46, y - 5) < 1.2) return '#6cff8f';
    return Math.floor(x) % 2 === 0 ? '#4a4e5a' : '#3a3d48';
  });
  const bottom = shade(L, W, () => '#2a2c34');
  return { side, top, bottom, floor: () => H - 2 };
}

/** A paper wallet: a sheet with an orange header, two QR codes, its address and its key, folded in half. */
function paperWallet(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const side = shade(L, H, (_x, y) => (y < 1 ? ORANGE : PAPER));
  const qr = (x: number, y: number, x0: number, y0: number, seed: number): string | null => {
    const mx = Math.floor((x - x0) / 1.5);
    const my = Math.floor((y - y0) / 1.5);
    if (mx < 0 || my < 0 || mx > 10 || my > 10) return null;
    if ((mx < 3 && my < 3) || (mx > 7 && my < 3) || (mx < 3 && my > 7)) return mx % 2 === 1 && my % 2 === 1 && (mx === 1 || mx === 9) ? PAPER : INK;
    return noise(mx, my, seed) > 0.5 ? INK : PAPER;
  };
  const top = shade(L, W, (x, y) => {
    if (y < 7) return onText('BTC', x, y, L / 2 - 5.5, 1) ? CREAM : ORANGE;
    const code = qr(x, y, 1.5, 10, 51) ?? qr(x, y, 19, 10, 52);
    if (code) return code;
    if (onText('ADDR', x, y, 3, 29) || onText('KEY', x, y, 21.5, 29)) return INK;
    if (Math.abs(y - 38) < 0.5 && Math.floor(x) % 3 === 0) return '#c9c3b6';
    return PAPER;
  });
  const bottom = shade(L, W, (x, y) => ((x + y) % 7 < 1 ? '#f7d9b0' : '#efe9dc'));
  return { side, top, bottom };
}

/** A lightning bolt, standing: yellow, lit from the left. */
function lightning(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const bolt: Points = [
    [22, 0],
    [4, 27],
    [16, 27],
    [10, 48],
    [32, 19],
    [20, 19],
    [28, 0],
  ];
  const inside = (x: number, y: number) => {
    let c = false;
    for (let i = 0, j = bolt.length - 1; i < bolt.length; j = i++) {
      const [xi, yi] = bolt[i]!;
      const [xj, yj] = bolt[j]!;
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const side = shade(L, H, (x, y) => (inside(x, y) ? lit('#ffd60a', (x - 18) / 30) : null), 0.5, ORANGE_DARK);
  const face = (c: string) => shade(L, W, (x) => (x > 4 && x < 32 ? c : null), 0.4, ORANGE_DARK);
  return { side, top: face('#ffe866'), bottom: face('#e0b800') };
}

/** A green candle: a tall green body with a wick above and below. */
function candle(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const TOP = 9;
  const BOT = 44;
  const side = shade(L, H, (x, y) => {
    if (y < TOP || y >= BOT) return Math.abs(x - L / 2) < 1 ? '#2a8a48' : null;
    if (x < 2 || x > L - 2) return null;
    return lit('#3fbf5f', ((x - L / 2) / L) * 0.8);
  });
  const face = (c: string) => shade(L, W, (x, y) => (x > 2 && x < L - 2 && y > 2 && y < W - 2 ? c : null));
  return { side, top: face('#5fdf7f'), bottom: face('#2a8a48'), roof: () => TOP, floor: () => BOT };
}

/** A whale, facing right: blue back, pale pleated belly, an eye and a mouth, flukes, a spout from its blowhole. */
function whale(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const BACK = '#3d5a8a';
  const BELLY = '#c8d6ea';
  const mid = 19;
  const half = (x: number) => 11 * Math.sqrt(Math.max(0, 1 - ((x - 42) / 32) ** 2));
  const fluke = (x: number) => 1.5 + (13 - x) * 0.9;
  const side = shade(L, H, (x, y) => {
    if (y < 7 && x > 52 && x < 62) return noise(x, y, 41) < 0.4 && Math.abs(x - 57) < 1 + (7 - y) * 0.6 ? '#9fd8ff' : null;
    if (oval(x, y, 42, mid, 32, 11) <= 1) {
      if (Math.hypot(x - 64, y - 18) < 1.3) return INK;
      if (y > 20 && x > 54 && Math.abs(y - 22 + (x - 54) * 0.08) < 0.5) return INK;
      if (y > mid + 3 && x > 34 && Math.floor(y) % 2 === 0) return mix(BELLY, BACK, 0.25);
      return y > mid + 3 ? BELLY : lit(BACK, (y - mid) / 20);
    }
    if (x < 13 && Math.abs(y - mid + 2) <= 1.5 + ((13 - x) / 13) * 1.5) return BACK;
    return null;
  });
  const top = shade(L, W, (x, y) => {
    const dy = Math.abs(y - W / 2);
    if (x > 10 && dy <= 0.8 * half(x) + 0.5) return dy < 2 ? '#2f4a74' : BACK;
    return x < 13 && dy < fluke(x) ? BACK : null;
  });
  const bottom = shade(L, W, (x, y) => {
    const dy = Math.abs(y - W / 2);
    if (x > 10 && dy <= 0.8 * half(x) + 0.5) return BELLY;
    return x < 13 && dy < fluke(x) ? '#2f4a74' : null;
  });
  return {
    side,
    top,
    bottom,
    roof: (x) => mid - half(x),
    floor: (x) => mid + half(x),
    across: (x, y) => (x < 13 ? fluke(x) : Math.max(1, (0.8 * half(x) + 0.5) * Math.sqrt(Math.max(0, 1 - ((y - mid) / Math.max(1, half(x))) ** 2)))),
  };
}

export const PAINTS: Record<string, (t: Thing) => Paint> = {
  roadster,
  pizzabox,
  wallet,
  pill: orangePill,
  block,
  atm,
  hodl,
  rocket,
  node,
  piggy,
  bull,
  goldbar,
  coldstorage: coldStorage,
  asic,
  whitepaper,
  paperwallet: paperWallet,
  lightning,
  candle,
  whale,
  lasercat: laserCat,
  coin,
}

/** Any object without its own paint: a plain box. */
export function box(t: Thing): Paint {
  return {
    side: shade(t.length, t.height, () => '#c0c0d0'),
    top: shade(t.length, t.width, () => '#e0e0f0'),
    bottom: shade(t.length, t.width, () => '#606070'),
  };
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
