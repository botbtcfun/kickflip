import type { Thing } from '../sim/objects';
import { CREAM, GRIP, JET, type Paint, type Points, STEEL, TYRE, along, grain, lit, mix, noise, oval, pill, rounded, shade, toPath, wheel } from './paint';

/**
 * Every object's faces, painted in code: its side as it stands, nose or
 * front to the right unless noted, its roof seen from above, far edge first,
 * and its underside seen from below, near edge first. Each reads at a glance,
 * with shading, a dark rim, and the one or two details that say what it is.
 */

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

  return {
    side,
    top: roof,
    bottom: under,
    floor: (x) => along(bottom, x),
    // The cabin is narrower than the body under it.
    across: (x, y) => (x >= 24 && x <= 70 && y < along(belt, x) ? Math.min(along(glassHalf, x) + 1, along(ROADSTER_HALF, x)) : along(ROADSTER_HALF, x)),
  };
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
  const clay = (x: number, y: number, base: string, seed: number) => grain(x, y, base, seed);
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

/** A pizza box: card, a printed stripe on its side, a pizza drawn on the lid, a grease spot underneath. */
function pizzabox(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const side = shade(L, H, (x, y) => {
    if (y < 1) return '#dcb882';
    if (y < 2) return '#a8844f';
    if (y > 3.5 && y < 5.5 && x > 8 && x < L - 8) return '#d64545';
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

/** A sneaker, toe to the right: white upper, a neon stripe, a pink heel tab, laces, and tread underneath. */
function shoe(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const upper: Points = [
    [0, 6],
    [3, 3.5],
    [10, 3],
    [14, 1.5],
    [19, 1],
    [24, 3.5],
    [32, 6.5],
    [40, 9.5],
    [44, 12],
  ];
  const outline: Points = [
    [0, 5],
    [6, 7.5],
    [20, 7],
    [32, 8.5],
    [40, 7.5],
    [44, 3],
  ];
  const side = shade(L, H, (x, y) => {
    if (y >= H - 1.5) return Math.floor(x) % 3 === 0 ? '#3a3446' : '#2b2233';
    if (y >= H - 4.5) return y < H - 3.6 ? '#ffffff' : '#e6e1d6';
    const top = along(upper, x);
    if (y < top) return null;
    if (x < 6 && y < 11) return '#ff4d79';
    if (x > 5 && x < 34 && Math.abs(y - (H - 6.5 - (x - 5) * 0.16)) < 0.9) return '#3df5ff';
    if (x > 14 && x < 30 && y - top < 1.5) return Math.floor(x) % 3 === 0 ? '#2b2233' : '#c9ccd6';
    if (x > 36 && y > H - 9) return '#e8e2d6';
    return lit(CREAM, ((y - top) / H) * 0.6);
  });
  const top = shade(L, W, (x, y) => {
    const hw = along(outline, x);
    const dy = Math.abs(y - W / 2);
    if (dy > hw) return null;
    if (oval(x, y, 9, W / 2, 6, 3.6) < 1) return '#2b2233';
    if (x > 14 && x < 30 && dy < 4) return Math.abs(dy - Math.abs(((x - 14) % 4) - 2) * 1.8) < 0.7 ? '#c9ccd6' : '#f2ede4';
    if (x < 5) return '#ff4d79';
    return lit(CREAM, (dy / hw) * 0.5);
  });
  const bottom = shade(L, W, (x, y) => {
    if (Math.abs(y - W / 2) > along(outline, x) + 0.5) return null;
    if (oval(x, y, 30, W / 2, 5, 4) < 1) return '#ff4d79';
    return (Math.floor(x) + Math.floor(y)) % 4 === 0 ? '#3a3446' : '#2b2233';
  });
  return { side, top, bottom };
}

/** A paper plane, nose to the right: flat wings on top, a keel folded under, notebook paper. */
function plane(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const PAPER = '#f4f1ea';
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
    if (Math.floor(x) % 6 === 3) return '#bcd4f0';
    if (Math.abs(x - 8) < 0.5) return '#ff9a9a';
    return dy > 0 ? mix(PAPER, '#c9c3b6', 0.25) : PAPER;
  });
  const bottom = shade(L, W, (x, y) => {
    const dy = Math.abs(y - W / 2);
    if (dy > half(x)) return null;
    if (dy < 2.4 * (1 - x / L) + 0.5) return dy < 0.5 ? '#d9d4c8' : PAPER;
    return Math.floor(x) % 6 === 3 ? '#a8bcd6' : '#e2ddd2';
  });
  return { side, top, bottom, floor: (x) => wing(x) + 0.8 };
}

/** A hard-shell suitcase standing on its wheels: ribbed orange shell, corner caps, a handle up top, a tag. */
function suitcase(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const SHELL = '#e8603c';
  const side = shade(L, H, (x, y) => {
    for (const wx of [7, L - 7]) {
      const d = Math.hypot(x - wx, y - (H - 2.5));
      if (d < 2.5) return d < 0.9 ? STEEL : '#2b2233';
    }
    if (y < 1.6 && x > 8 && x < L - 8) return '#2b2233';
    if (y < 6 && (Math.abs(x - 10) < 0.8 || Math.abs(x - (L - 10)) < 0.8)) return '#a8aab8';
    if (!rounded(x, y, 0, 6, L, H - 4, 3)) return null;
    if ((x < 3.5 || x > L - 3.5) && (y < 9.5 || y > H - 7.5)) return '#2b2233';
    if (x > 26 && x < 31 && y > 15 && y < 22) return y < 16 ? '#2b2233' : '#ffd166';
    if (Math.floor(x) % 6 === 2) return mix(SHELL, '#000000', 0.18);
    return lit(SHELL, ((x - L / 2) / L) * 0.6);
  });
  const top = shade(L, W, (x, y) => {
    if (!rounded(x, y, 0, 0, L, W, 3)) return null;
    if (x > 7 && x < L - 7 && Math.abs(y - W / 2) < 2.2) return Math.abs(y - W / 2) < 1 ? '#2b2233' : '#5a5a68';
    if ((x < 3.5 || x > L - 3.5) && (y < 3.5 || y > W - 3.5)) return '#2b2233';
    return Math.floor(x) % 6 === 2 ? mix('#f0784f', '#000000', 0.15) : '#f0784f';
  });
  const bottom = shade(L, W, (x, y) => {
    for (const [wx, wy] of [
      [6, 4],
      [L - 6, 4],
      [6, W - 4],
      [L - 6, W - 4],
    ] as const)
      if (Math.hypot(x - wx, y - wy) < 2.8) return '#2b2233';
    return rounded(x, y, 0, 0, L, W, 3) ? mix(SHELL, '#000000', 0.2) : null;
  });
  return { side, top, bottom, roof: () => 6, floor: () => H - 4 };
}

/** A hot dog: a sausage longer than its bun, mustard zigzagged on top. */
function hotdog(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const BUN = '#e0a050';
  const zig = (x: number) => Math.abs(((x / 3) % 2) - 1);
  const side = shade(L, H, (x, y) => {
    if (rounded(x, y, 4, 7, L - 4, H, 4)) return y < 8.2 ? '#f0c27a' : lit(BUN, ((y - 11) / 5) * 0.8);
    if (pill(x, y - 2, L, 7) <= 1) {
      if (x > 6 && x < L - 6 && Math.abs(y - (2.8 + zig(x) * 1.6)) < 0.75) return '#ffd166';
      return y < 3.6 ? '#d06a4f' : y > 7 ? '#8f3f2d' : '#b5523b';
    }
    return null;
  });
  const top = shade(L, W, (x, y) => {
    const dy = Math.abs(y - W / 2);
    if (pill(x, y - (W / 2 - 3.5), L, 7) <= 1) {
      if (x > 6 && x < L - 6 && Math.abs(y - W / 2 - 2.4 * Math.sin(x * 0.9)) < 0.9) return '#ffd166';
      return dy > 2.6 ? '#9a4432' : '#b5523b';
    }
    if (rounded(x, y, 4, 0, L - 4, W, 4)) return dy > 6.5 ? '#c8883e' : '#f0c27a';
    return null;
  });
  const bottom = shade(L, W, (x, y) => (rounded(x, y, 4, 0, L - 4, W, 4) ? grain(x, y, '#c8883e', 11, 0.15) : null));
  return {
    side,
    top,
    bottom,
    across: (x, y) =>
      Math.max(pill(x, y - 2, L, 7) <= 1 ? Math.sqrt(Math.max(0.25, 12.25 - (y - 5.5) ** 2)) : 0, rounded(x, y, 4, 7, L - 4, H, 4) ? (W / 2) * Math.sqrt(Math.max(0, 1 - ((y - 11.5) / 5.5) ** 4)) : 0),
  };
}

/** A rubber duck, facing right: yellow, an orange beak, a black eye, a wing, a tuft of a tail. */
function duck(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const YELLOW = '#ffd60a';
  const side = shade(L, H, (x, y) => {
    if (oval(x, y, 33.4, 12.2, 3, 1.8) < 1) return y > 12.4 ? '#e06a1a' : '#ff8a2a';
    if (Math.hypot(x - 25, y - 10) < 8) {
      if (Math.hypot(x - 27.5, y - 8) < 1.4) return Math.hypot(x - 27.9, y - 7.6) < 0.5 ? '#ffffff' : '#14121c';
      return lit(YELLOW, (y - 10) / 12);
    }
    if (oval(x, y, 17, 21, 16, 8.6) < 1 || oval(x, y, 4, 13.5, 3.6, 3) < 1) {
      if (Math.abs(oval(x, y, 14, 19.5, 8, 4.6) - 1) < 0.12 && y < 21) return '#e8b800';
      return lit(YELLOW, (y - 18) / 14);
    }
    return null;
  });
  const top = shade(L, W, (x, y) => {
    if (oval(x, y, 33, W / 2, 3, 2.2) < 1) return '#ff8a2a';
    if (Math.hypot(x - 25, y - W / 2) < 7.2) {
      if (Math.hypot(x - 27, y - (W / 2 - 4)) < 1 || Math.hypot(x - 27, y - (W / 2 + 4)) < 1) return '#14121c';
      return '#ffe24a';
    }
    const body = oval(x, y, 17, W / 2, 16, 12);
    if (body < 1 || oval(x, y, 3.5, W / 2, 3, 3) < 1) return lit(YELLOW, body * 0.4);
    return null;
  });
  const bottom = shade(L, W, (x, y) => {
    const body = oval(x, y, 17, W / 2, 16, 12);
    return body < 1 ? mix('#e8b800', '#000000', body * 0.15) : null;
  });
  return { side, top, bottom, across: (x, y) => Math.max(0.92 * Math.sqrt(Math.max(0, 64 - (x - 25) ** 2 - (y - 10) ** 2)), 12 * Math.sqrt(Math.max(0, 1 - ((x - 17) / 16) ** 2 - ((y - 21) / 8.6) ** 2)), 3 * Math.sqrt(Math.max(0, 1 - ((x - 4) / 3.6) ** 2 - ((y - 13.5) / 3) ** 2)), oval(x, y, 33.4, 12.2, 3, 1.8) < 1 ? 2 : 0) };
}

/** A penguin, facing right: black back, white front, an orange beak and feet, a flipper, a bright eye. */
function penguin(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const INK = '#1c1c28';
  const body = (x: number, y: number) => oval(x, y, 15, 21, 12, 16);
  const side = shade(L, H, (x, y) => {
    for (const fx of [12, 19]) if (oval(x, y, fx, H - 1.6, 3.4, 1.6) < 1) return '#ff8a2a';
    if (x > 25 && x < 31 && Math.abs(y - 12.5) < 1.6 - (x - 25) * 0.25) return y > 12.6 ? '#e06a1a' : '#ff8a2a';
    if (body(x, y) > 1) return null;
    if (Math.hypot(x - 21, y - 10) < 2) return Math.hypot(x - 21.5, y - 10) < 0.9 ? INK : '#ffffff';
    if (oval(x, y, 11, 24, 3, 9) < 1) return '#2c2c3c';
    if (oval(x, y, 19.5, 25, 7.5, 12.5) < 1 && y > 13) return lit('#f4f4f4', (y - 25) / 30);
    return lit(INK, (y - 21) / 30);
  });
  const top = shade(L, W, (x, y) => {
    const dy = Math.abs(y - W / 2);
    if (x > 25 && x < 30 && dy < 1.4) return '#ff8a2a';
    const b = oval(x, y, 15, W / 2, 12, 11);
    if (b > 1) return null;
    if (x > 18 && x < 23 && Math.abs(dy - 6) < 1) return '#ffffff';
    if (x > 22 && b > 0.75) return '#f4f4f4';
    return lit(INK, b * 0.6 - 0.3);
  });
  const bottom = shade(L, W, (x, y) => {
    const dy = Math.abs(y - W / 2);
    for (const s of [-1, 1]) if (oval(x, y, 21, W / 2 + s * 4, 4.5, 2.4) < 1) return '#ff8a2a';
    const b = oval(x, y, 15, W / 2, 12, 11);
    if (b > 1) return null;
    return x > 18 ? '#e8e8ee' : INK;
  });
  return {
    side,
    top,
    bottom,
    floor: () => H - 3,
    across: (x, y) => Math.max(11 * Math.sqrt(Math.max(0, 1 - ((x - 15) / 12) ** 2 - ((y - 21) / 16) ** 2)), x > 25 && y < 15 ? 1.4 : 0),
  };
}

/** A traffic cone: orange, two reflective white bands, a square black-edged base, hollow underneath. */
function cone(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const c = L / 2;
  const radius = (y: number) => 1.8 + (y / (H - 3)) * 10.2;
  const band = (y: number) => (y > 10 && y < 14) || (y > 20 && y < 24.5);
  const side = shade(L, H, (x, y) => {
    if (y >= H - 3) return y < H - 2.4 ? '#ff7a2a' : '#c8481a';
    const u = (x - c) / radius(y);
    if (Math.abs(u) > 1) return null;
    return lit(band(y) ? '#f4f4f4' : '#ff6a1a', u * 0.55);
  });
  const top = shade(L, W, (x, y) => {
    const d = Math.hypot(x - c, y - W / 2);
    if (d < 1.8) return '#2b2233';
    if (d < 12) {
      // The cone seen from above: rings at the heights of the bands.
      const level = ((d - 1.8) / 10.2) * (H - 3);
      return lit(band(level) ? '#f4f4f4' : '#ff6a1a', (d / 12) * 0.4);
    }
    return Math.max(Math.abs(x - c), Math.abs(y - W / 2)) > W / 2 - 1.5 ? '#c8481a' : '#ff7a2a';
  });
  const bottom = shade(L, W, (x, y) => {
    const d = Math.hypot(x - c, y - W / 2);
    if (d < 10.5) return d < 9.5 ? '#14121c' : '#c8481a';
    return '#e05a20';
  });
  return { side, top, bottom, across: (x, y) => (y >= H - 3 ? W / 2 : Math.sqrt(Math.max(0.25, radius(y) ** 2 - (x - c) ** 2))) };
}

/** How far a point is from the edge of a cell of a jittered grid: small on the lines between cells. */
function cellEdge(x: number, y: number, size: number, seed: number): number {
  let [d1, d2] = [Infinity, Infinity];
  const [gx, gy] = [Math.floor(x / size), Math.floor(y / size)];
  for (let i = gx - 1; i <= gx + 1; i++) {
    for (let j = gy - 1; j <= gy + 1; j++) {
      const px = (i + 0.2 + 0.6 * noise(i, j, seed)) * size;
      const py = (j + 0.2 + 0.6 * noise(i, j, seed + 1)) * size;
      const d = Math.hypot(x - px, y - py);
      if (d < d1) [d1, d2] = [d, d1];
      else if (d < d2) d2 = d;
    }
  }
  return d2 - d1;
}

/** A giraffe, facing right: four long legs, a long neck, ossicones and an ear, and its patches. */
function giraffe(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const coat = (x: number, y: number, seed: number) => (cellEdge(x, y, 6, seed) < 1.1 ? '#f5d58a' : '#b8702e');
  const neck: Points = [
    [30, 32],
    [35, 20],
    [39, 10],
  ];
  const legs = [9, 14, 28, 33];
  const side = shade(L, H, (x, y) => {
    // Head, with a muzzle, an eye, an ear and two ossicones.
    if (oval(x, y, 42, 8.5, 6, 3.6) < 1) {
      if (x > 45) return '#d8a860';
      if (Math.hypot(x - 41.5, y - 7.4) < 0.9) return '#14121c';
      return '#e8b860';
    }
    for (const ox of [38, 40.5]) if (Math.abs(x - ox) < 0.8 && y > 1.5 && y < 5.5) return y < 2.6 ? '#4a2a1a' : '#b8702e';
    if (oval(x, y, 35.6, 6.4, 2.2, 1.1) < 1) return '#d8a860';
    // The mane down the back of the neck, then the neck.
    if (toPath(x, y, [[28.4, 30], [33.2, 18.6], [36.6, 9.4]]) < 0.8) return '#6a4020';
    if (toPath(x, y, neck) < 2.8) return coat(x, y, 30);
    if (oval(x, y, 20, 35, 15, 9) < 1) return coat(x, y, 31);
    for (const lx of legs) if (Math.abs(x - lx) < 1.6 && y > 38) return y > H - 2.5 ? '#3a2a1a' : coat(x, y, 32);
    // The tail, with its tuft.
    if (x < 6 && toPath(x, y, [[6, 33], [3, 40], [2.4, 45]]) < 0.8) return y > 43 ? '#3a2a1a' : '#b8702e';
    return null;
  });
  const top = shade(L, W, (x, y) => {
    const dy = Math.abs(y - W / 2);
    if (x > 36 && x < 48 && dy < 3.4 - Math.max(0, x - 45) * 0.6) return x > 45 ? '#d8a860' : '#e8b860';
    if (x > 34 && x < 37 && Math.abs(dy - 3.4) < 1.2) return '#d8a860';
    if (x > 27 && x <= 36 && dy < 2.6) return coat(x, y, 33);
    if (oval(x, y, 20, W / 2, 15, 7.5) < 1) return coat(x, y, 34);
    if (x < 6 && dy < 0.8) return '#b8702e';
    return null;
  });
  const bottom = shade(L, W, (x, y) => {
    for (const lx of [11, 30]) for (const s of [-1, 1]) if (Math.hypot(x - lx, y - (W / 2 + s * 4.5)) < 1.9) return '#3a2a1a';
    if (oval(x, y, 20, W / 2, 15, 7) < 1) return '#f0d8a0';
    if (x > 27 && x < 40 && Math.abs(y - W / 2) < 2.4) return '#f0d8a0';
    return null;
  });
  return {
    side,
    top,
    bottom,
    floor: (x) => (x < 36 ? 38 + Math.max(0, 6 - Math.abs(x - 20) * 0.4) : H),
    across: (x, y) =>
      Math.max(
        oval(x, y, 20, 35, 15, 9) < 1 ? 7.5 * Math.sqrt(Math.max(0, 1 - ((x - 20) / 15) ** 2 - ((y - 35) / 9) ** 2)) : 0,
        toPath(x, y, neck) < 2.8 ? 2.6 : 0,
        oval(x, y, 42, 8.5, 6, 3.6) < 1 ? 3.4 : 0,
        1,
      ),
  };
}

/** An anvil, horn to the right: a polished face with its holes, a waist, a base on two feet. */
function anvil(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const IRON = '#4a4e5a';
  const inside = (x: number, y: number) => {
    if (y < 8) return (x >= 4 && x <= 36) || (x > 36 && y >= (x - 36) * 0.28 && y <= 8 - (x - 36) * 0.62);
    if (y < 19) {
      const k = Math.abs(y - 13.5) / 5.5;
      return Math.abs(x - 22) <= 7 + 5 * k * k;
    }
    if (y < 26) return x >= 6 && x <= 38;
    return (x >= 6 && x <= 15) || (x >= 29 && x <= 38);
  };
  const side = shade(L, H, (x, y) => {
    if (!inside(x, y)) return null;
    if (y < 1.2) return '#9a9eab';
    if (y < 2.2 && x < 36) return '#7a7e8a';
    return lit(IRON, (y - 10) / 28);
  });
  const top = shade(L, W, (x, y) => {
    const dy = Math.abs(y - W / 2);
    const face = x >= 4 && x <= 36 ? 7 : x > 36 ? 7 * (1 - (x - 36) / 12) : -1;
    if (dy <= face) {
      if (x > 7 && x < 10.5 && dy < 1.6) return '#14121c';
      if (Math.hypot(x - 13.5, y - W / 2) < 1) return '#14121c';
      return grain(x, y, '#8a8e9a', 12, 0.1);
    }
    return x >= 6 && x <= 38 && dy <= 9.5 ? '#3a3e48' : null;
  });
  const bottom = shade(L, W, (x, y) => {
    if (x < 6 || x > 38 || Math.abs(y - W / 2) > 9.5) return null;
    return x < 15 || x > 29 ? '#3a3e48' : '#22242c';
  });
  return { side, top, bottom, across: (x, y) => (y < 8 ? (x <= 36 ? 7 : 7 * (1 - (x - 36) / 12)) : y < 19 ? 4.5 : 9.5) };
}

/** A fridge: freezer door over fridge door, handles, magnets and a note, coils at the back, a cereal box on top. */
function fridge(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const side = shade(L, H, (x, y) => {
    if (y >= H - 2) return (x > 3 && x < 8) || (x > L - 8 && x < L - 3) ? '#2b2233' : null;
    if (!rounded(x, y, 0.5, 0, L - 0.5, H - 2, 2.5)) return null;
    if (Math.abs(y - 16) < 0.7) return '#9a9cab';
    if (x > L - 6.5 && x < L - 4.5 && ((y > 5 && y < 12) || (y > 20 && y < 34))) return x < L - 5.5 ? '#c3c6d1' : STEEL;
    if (rounded(x, y, 7, 22, 11, 26, 0.5)) return '#ff4d79';
    if (rounded(x, y, 12, 27, 16, 31, 0.5)) return '#3df5ff';
    if (rounded(x, y, 6, 31, 13, 35, 0.3)) return y < 32 ? '#e0b030' : '#ffd166';
    return lit('#e8eaf0', ((x - L / 2) / L) * 0.5 + 0.1);
  });
  const top = shade(L, W, (x, y) => {
    if (y < 3.5) return Math.floor(x) % 2 === 0 ? '#3a3a46' : '#5a5a68';
    if (rounded(x, y, 6, 9, 15, 17, 0.5)) return y > 12 && y < 14 ? CREAM : '#ff8a5b';
    return '#d9dbe3';
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

/** A safe: dark steel, a gold-lined door, a combination dial, a three-spoke handle, hinges, rivets, feet. */
function safe(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const side = shade(L, H, (x, y) => {
    if (y >= H - 2) return (x > 2 && x < 8) || (x > L - 8 && x < L - 2) ? '#14121c' : null;
    if (!rounded(x, y, 0, 0, L, H - 2, 1.5)) return null;
    const dial = Math.hypot(x - 15, y - 17);
    if (dial < 6.2) {
      if (dial < 1.6) return STEEL;
      const a = Math.atan2(y - 17, x - 15);
      if (dial > 4.8 && (((a / (Math.PI / 6)) % 1) + 1) % 1 < 0.25) return '#2b2233';
      return dial > 5.6 ? STEEL : '#c3c6d1';
    }
    for (const a of [Math.PI / 2, (7 * Math.PI) / 6, (11 * Math.PI) / 6]) {
      const [ex, ey] = [28 + 5 * Math.cos(a), 17 + 5 * Math.sin(a)];
      if (Math.hypot(x - ex, y - ey) < 1.3) return '#e4e6ec';
      if (toPath(x, y, [[28, 17], [ex, ey]]) < 0.7) return '#c3c6d1';
    }
    if (Math.hypot(x - 28, y - 17) < 1.5) return '#c3c6d1';
    if (x > 1.5 && x < 3.5 && ((y > 8 && y < 11) || (y > 23 && y < 26))) return '#5a5e6c';
    const door = x > 4 && x < L - 4 && y > 4 && y < H - 6;
    if (door && !(x > 5 && x < L - 5 && y > 5 && y < H - 7)) return '#ffd166';
    return door ? '#434755' : '#3a3d48';
  });
  const top = shade(L, W, (x, y) => {
    for (let rx = 3; rx < L; rx += 6) for (const ry of [2.5, W - 2.5]) if (Math.hypot(x - rx, y - ry) < 0.9) return '#6a6e7c';
    return grain(x, y, '#444856', 13, 0.08);
  });
  const bottom = shade(L, W, (x, y) => {
    for (const [fx, fy] of [
      [4, 4],
      [L - 4, 4],
      [4, W - 4],
      [L - 4, W - 4],
    ] as const)
      if (Math.abs(x - fx) < 3 && Math.abs(y - fy) < 3) return '#14121c';
    return '#2f323c';
  });
  return { side, top, bottom, floor: () => H - 2 };
}

/** A slice of toast lying flat: a domed slice with its crust, buttered on top, melting. */
function toast(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const CRUST = '#a8642e';
  const side = shade(L, H, (x, y) => (y < 1 ? '#f2d27a' : y > H - 1 ? '#8a4f22' : grain(x, y, CRUST, 14, 0.18)));
  // The slice from above, its domed top at the far edge.
  const slice = (x: number, y: number) => x > 1 && x < L - 1 && y > 4 * ((x - L / 2) / (L / 2 - 1)) ** 2 && rounded(x, y, 1, 0, L - 1, W - 0.5, 3);
  const crust = (x: number, y: number) => [-1.6, 1.6].some((d) => !slice(x + d, y) || !slice(x, y + d));
  const top = shade(L, W, (x, y) => {
    if (!slice(x, y)) return null;
    if (crust(x, y)) return CRUST;
    if (rounded(x, y, L / 2 - 4.5, W / 2 - 3, L / 2 + 4.5, W / 2 + 4, 1.2)) return x < L / 2 - 2.5 && y < W / 2 - 1 ? '#fffbe0' : '#fff2a8';
    if (oval(x, y, L / 2, W / 2 + 1, 8.5, 7) < 1) return '#f5d880';
    return noise(x, y, 15) < 0.12 ? '#d49a50' : '#e8b46a';
  });
  // From below, the dome is at the far edge too: the last rows.
  const bottom = shade(L, W, (x, y) => {
    if (!slice(x, W - y)) return null;
    if (crust(x, W - y)) return CRUST;
    return noise(x, y, 16) < 0.15 ? '#c08640' : '#d9a058';
  });
  return { side, top, bottom };
}

/** A banana, curved up at both ends: yellow with a highlight, ridges, a few brown freckles, a stem to the right. */
function banana(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const mid = (x: number) => 9.2 - 5.8 * ((x - L / 2) / (L / 2)) ** 2;
  const thick = (x: number, full: number) => (x > L - 7 ? 1.4 : full * Math.sqrt(Math.max(0, 1 - ((x - L / 2) / (L / 2 + 1)) ** 4)));
  const peel = (v: number, x: number, y: number, seed: number) => {
    if (noise(x, y, seed) < 0.035) return '#8a5a2a';
    return v < -0.5 ? '#ffe866' : v > 0.45 ? '#e0a800' : '#ffd60a';
  };
  const ends = (x: number) => (x > L - 7 ? '#7a5a32' : x < 2.5 ? '#3a2a1a' : null);
  const side = shade(L, H, (x, y) => {
    const v = (y - mid(x)) / thick(x, 4.6);
    if (Math.abs(v) > 1) return null;
    return ends(x) ?? peel(v, x, y, 17);
  });
  const top = shade(L, W, (x, y) => {
    const v = (y - W / 2) / thick(x, 4.4);
    if (Math.abs(v) > 1) return null;
    if (Math.abs(Math.abs(v) - 0.5) < 0.12) return ends(x) ?? '#f0c000';
    return ends(x) ?? peel(Math.abs(v) - 0.3, x, y, 18);
  });
  const bottom = shade(L, W, (x, y) => {
    if (Math.abs((y - W / 2) / thick(x, 4.4)) > 1) return null;
    if (x > L - 7) return '#6b4a2a';
    return noise(x, y, 19) < 0.04 ? '#8a5a2a' : '#e8b400';
  });
  return { side, top, bottom, across: (x, y) => (4.4 / 4.6) * Math.sqrt(Math.max(0.25, thick(x, 4.6) ** 2 - (y - mid(x)) ** 2)) };
}

/** A bowling pin, standing: white, rounded, two red stripes at the neck. */
function pin(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const radius: Points = [
    [0, 2.5],
    [2, 4.5],
    [6, 5.2],
    [11, 4.2],
    [16, 3],
    [20, 3.2],
    [26, 6],
    [32, 8.4],
    [38, 8.6],
    [43, 7],
    [46.5, 5.2],
    [48, 4.5],
  ];
  const c = L / 2;
  const side = shade(L, H, (x, y) => {
    const u = (x - c) / along(radius, y);
    if (Math.abs(u) > 1) return null;
    if ((y > 13.2 && y < 14.8) || (y > 16.6 && y < 18.2)) return lit('#d64545', u * 0.5);
    return lit('#f4f1ea', u * 0.6 + (y > 46 ? 0.3 : 0));
  });
  const top = shade(L, W, (x, y) => {
    const d = Math.hypot(x - c, y - W / 2);
    if (d < 5.2) return lit('#fbf9f4', (d / 5.2) * 0.4 - 0.2);
    return d < 8.6 ? lit('#e8e4da', (d / 8.6) * 0.5) : null;
  });
  const bottom = shade(L, W, (x, y) => {
    const d = Math.hypot(x - c, y - W / 2);
    if (d < 1) return STEEL;
    if (d < 4.5) return '#d8d2c4';
    return d < 8.6 ? lit('#cfc9bb', (d / 8.6) * 0.5) : null;
  });
  return { side, top, bottom, across: (x, y) => Math.sqrt(Math.max(0.25, along(radius, y) ** 2 - (x - c) ** 2)) };
}

/** An ice cube: pale blue, frosted in the middle, bubbles, a crack, a cold rim. */
function icecube(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const face = (w: number, h: number, seed: number) =>
    shade(
      w,
      h,
      (x, y) => {
        if (!rounded(x, y, 0, 0, w, h, 3)) return null;
        if (oval(x, y, w / 2, h / 2, w * 0.3, h * 0.3) < 1 && noise(x * 0.5, y * 0.5, seed) < 0.55) return '#e8f8ff';
        if (noise(x, y, seed + 1) < 0.02) return '#ffffff';
        if (toPath(x, y, [
          [w * 0.2, h * 0.7],
          [w * 0.45, h * 0.55],
          [w * 0.5, h * 0.3],
        ]) < 0.5)
          return '#f4fcff';
        if (x < 3 || y < 3) return '#f0faff';
        return mix('#d4f0ff', '#7cc4ea', (x + y) / (w + h));
      },
      0.45,
      '#3a88c0',
    );
  return { side: face(L, H, 20), top: face(L, W, 22), bottom: face(L, W, 24) };
}

/** A fish, facing right: blue back, silver flank, pale belly, scales, an eye and gill, a forked tail, fins. */
function fish(t: Thing): Paint {
  const { length: L, height: H, width: W } = t;
  const FIN = '#9fc8e8';
  const half = (x: number) => 7 * Math.sqrt(Math.max(0, 1 - ((x - 30) / 21) ** 2));
  const side = shade(L, H, (x, y) => {
    if (oval(x, y, 30, 9, 21, 7) <= 1) {
      if (Math.hypot(x - 45, y - 7) < 2) return Math.hypot(x - 45.4, y - 7) < 1 ? '#14121c' : '#ffffff';
      if (Math.abs(Math.hypot(x - 47, y - 9) - 6) < 0.5 && x < 45) return '#3a6a96';
      if (x > 49 && Math.abs(y - 10.2) < 0.45) return '#2b2233';
      if (oval(x, y, 37, 12, 3.4, 1.4) < 1) return FIN;
      const base = y < 6.5 ? '#4f7fae' : y < 11 ? '#7fb2d9' : '#d9ecf7';
      return (Math.floor(x) + 2 * Math.floor(y / 3)) % 4 === 0 ? mix(base, '#000000', 0.1) : base;
    }
    if (x < 11) {
      const dy = Math.abs(y - 9);
      if (dy <= (11 - x) * 0.75 && !(x < 5 && dy < (5 - x) * 0.8)) return FIN;
    }
    if (x > 21 && x < 34 && y < 3.5 && y >= 3.2 - 2.8 * (1 - Math.abs(x - 26) / 8)) return FIN;
    return null;
  });
  const top = shade(L, W, (x, y) => {
    const dy = Math.abs(y - W / 2);
    const w = half(x) * (4.6 / 7);
    if (dy <= w) {
      if (x > 43 && x < 46 && dy > w - 1.2) return '#14121c';
      if (x > 21 && x < 34 && dy < 0.6) return FIN;
      return dy < w * 0.5 ? '#4f7fae' : '#7fb2d9';
    }
    return x < 11 && dy < 0.9 ? FIN : null;
  });
  const bottom = shade(L, W, (x, y) => {
    const dy = Math.abs(y - W / 2);
    if (dy <= half(x) * (4.6 / 7)) return '#d9ecf7';
    return x < 11 && dy < 0.9 ? FIN : null;
  });
  return { side, top, bottom, roof: (x) => 9 - half(x), floor: (x) => 9 + half(x), across: (x, y) => Math.max(0.8, 4.6 * Math.sqrt(Math.max(0, 1 - ((x - 30) / 21) ** 2 - ((y - 9) / 7) ** 2))) };
}

/** A ginger tabby cat, facing right: stripes, white socks and chest, green eyes, pink nose, tail up. */
function cat(t: Thing): Paint {
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
    if (Math.hypot(x - 39, y - 10) < 7.5) {
      if (Math.hypot(x - 42, y - 8.5) < 1.3) return Math.abs(x - 42) < 0.45 ? '#14121c' : '#6cff8f';
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


export const PAINTS: Record<string, (t: Thing) => Paint> = {
  roadster,
  skateboard,
  pizzabox,
  sneaker: shoe,
  brick,
  plane,
  penguin,
  cone,
  suitcase,
  hotdog,
  duck,
  giraffe,
  anvil,
  fridge,
  safe,
  toast,
  banana,
  pin,
  icecube,
  fish,
  cat,
};

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
