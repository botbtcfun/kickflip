import type { Landing } from '../sim/flip';
import type { Game, GameEvent } from '../sim/game';
import type { Thing } from '../sim/objects';
import { LAND_TICKS, PERFECT_DIV, QUARTER, RESET_TICKS, ROLL_TICKS, TICK_HZ, TURN } from '../sim/rules';
import { type Faces, facesOf, sneaker } from './faces';

/** The stage's width in game pixels; its height fits the screen, at least MIN_HEIGHT. */
export const WIDTH = 144;
export const MIN_HEIGHT = 240;
/** The street below the ground line, where the card sits. */
const STREET = 64;
const CX = WIDTH / 2;
const TICK_MS = 1000 / TICK_HZ;
/** Thousandths of a degree to radians. */
const RAD = Math.PI / 180_000;
const HOP_MS = 220;
/** Where the Roadster's thrusters sit under its floor, from its left end, in pixels. */
const NOZZLES = [1.5, 12.5, 20.5, 32.5];
/** The meter: a ring over the object, its centre this far above the ground. */
const METER_UP = 8;
const METER_IN = 25;
const METER_OUT = 28;

const SKY = ['#1b1440', '#24174b', '#2f1a55', '#3d1d5c', '#4e2061', '#622464', '#7a2a64', '#943262', '#b03d5d', '#cc4b56', '#e75d4f', '#ff8a5b'];
const SKYLINE = '#140f2e';
const ASPHALT = '#2a2a33';
const KERB = '#4a4a5a';
const SODIUM = '#ffd166';
const NEON = '#3df5ff';
const GOOD = '#6cff8f';

/** What the scene plays: swapped for a new run on restart. */
export interface Session {
  readonly game: Game;
  readonly paused: boolean;
  step(input: number): void;
  /** After each tick with events. */
  onEvents(events: GameEvent[]): void;
  /** Once a frame, after drawing. */
  onFrame(): void;
}

export interface Input {
  sample(): number;
}

/** An object as drawn: where, turned how far, and how high above where it rests. */
interface Pose {
  thing: Thing;
  x: number;
  angle: number;
  lift: number;
}

/** A puff of a thruster's jet: flies off and fades. */
interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const easeOut = (k: number) => 1 - (1 - k) * (1 - k);
const easeIn = (k: number) => k * k;
const smooth = (k: number) => k * k * (3 - 2 * k);

/**
 * The street as it's drawn: sky, skyline, the object flipping, its shadow,
 * the kick, and the meter after a landing, on a canvas at one pixel per game
 * pixel that the page scales up. It also runs the game: each frame, as many
 * ticks as the time since the last one is worth.
 */
export class Scene {
  readonly canvas = document.createElement('canvas');
  /** CSS pixels per game pixel. */
  zoom = 1;
  private ctx: CanvasRenderingContext2D;
  private readonly faces = new Map<string, Faces>();
  private readonly shoe = sneaker();
  private backdrop: HTMLCanvasElement | null = null;
  private meter: { key: string; canvas: HTMLCanvasElement } | null = null;
  private puffs: Puff[] = [];
  private raf = 0;
  private last = 0;
  private acc = 0;
  private alpha = 0;
  private now = 0;
  private hopAt = -Infinity;

  constructor(
    private readonly session: Session,
    private readonly input: Input,
  ) {
    this.canvas.width = WIDTH;
    this.canvas.height = MIN_HEIGHT;
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
  }

  get height(): number {
    return this.canvas.height;
  }

  /** Where objects stand, in game pixels from the top. */
  get groundY(): number {
    return this.height - STREET;
  }

  /** Sizes the stage: `height` game pixels tall, shown `zoom` times as large. */
  resize(height: number, zoom: number): void {
    if (this.canvas.height !== height) {
      this.canvas.height = height;
      this.backdrop = null;
    }
    this.zoom = zoom;
    this.canvas.style.width = `${WIDTH * zoom}px`;
    this.canvas.style.height = `${height * zoom}px`;
    // A canvas resized is cleared: drawn again now, not a frame late.
    this.draw(this.session.game, this.alpha);
  }

  /** Plays and draws a frame each time the screen refreshes. */
  start(): void {
    const loop = (time: number) => {
      this.raf = requestAnimationFrame(loop);
      this.frame(this.last ? Math.max(0, time - this.last) : 0);
      this.last = time;
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.last = 0;
  }

  /** For a new run. */
  reset(): void {
    this.acc = 0;
    this.puffs = [];
  }

  /** A tap: the object hops a little, to show it felt it. */
  hop(): void {
    this.hopAt = this.now;
  }

  /** One frame, `delta` ms after the last: the ticks it is worth, then the picture. */
  frame(delta: number): void {
    this.now += delta;
    const s = this.session;
    if (!s.paused) {
      this.acc += Math.min(delta, 100);
      while (!s.paused && this.acc >= TICK_MS) {
        this.acc -= TICK_MS;
        s.step(this.input.sample());
        this.thrusters(s.game);
        if (s.game.events.length) s.onEvents(s.game.events);
      }
    }
    this.age(delta);
    this.alpha = s.paused ? 0 : this.acc / TICK_MS;
    this.draw(s.game, this.alpha);
    s.onFrame();
  }

  private draw(game: Game, a: number): void {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.street(), 0, 0);
    const poses = this.poses(game, a);
    for (const p of poses) this.shadow(p);
    if (game.landing && game.phase !== 'air') this.drawMeter(game.landing);
    for (const p of poses) this.drawThing(p);
    if (game.phase === 'air' && game.flight) this.kick(poses[0]!, game.flight.t + a);
    for (const p of this.puffs) {
      const k = p.age / p.life;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = k < 0.3 ? '#e0f6ff' : k < 0.6 ? '#4dc3ff' : '#2a5cff';
      const size = k < 0.5 ? 2 : 1;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), size, size);
    }
    ctx.globalAlpha = 1;
  }

  /** Where each object is this frame, by phase. */
  private poses(game: Game, a: number): Pose[] {
    const thing = game.thing;
    const progress = (ticks: number) => Math.min(1, (game.phaseTicks + a) / ticks);
    const l = game.landing;
    if (game.phase === 'air' && game.flight) {
      const f = game.flight;
      return [{ thing, x: CX, angle: lerp(f.prevAngle, f.angle, a), lift: lerp(f.prevHeight, f.height, a) / 1000 }];
    }
    if (game.phase === 'landed' && l) {
      // A clean landing settles onto its wheels at once; a miss topples over.
      const k = smooth(progress(LAND_TICKS * (l.clean ? 0.25 : 0.6)));
      return [{ thing, x: CX, angle: lerp(l.angle, l.rest, k), lift: 0 }];
    }
    if (game.phase === 'reset' && l) {
      // Back up onto its wheels with a little hop, the shorter way round.
      const k = smooth(progress(RESET_TICKS));
      const up = Math.round(l.rest / TURN) * TURN;
      return [{ thing, x: CX, angle: lerp(l.rest, up, k), lift: Math.sin(Math.PI * k) * 8 }];
    }
    if (game.phase === 'roll') {
      const k = progress(ROLL_TICKS);
      const out: Pose[] = [{ thing, x: lerp(WIDTH + thing.length, CX, easeOut(k)), angle: 0, lift: 0 }];
      if (game.previous) out.push({ thing: game.previous, x: lerp(CX, -game.previous.length, easeIn(k)), angle: 0, lift: 0 });
      return out;
    }
    const hop = (this.now - this.hopAt) / HOP_MS;
    return [{ thing, x: CX, angle: 0, lift: hop < 1 ? Math.sin(Math.PI * hop) * 4 : 0 }];
  }

  /** How far below its middle an object reaches, turned to `angle`. */
  private reach(t: Thing, angle: number): number {
    return (t.height * Math.abs(Math.cos(angle * RAD)) + t.width * Math.abs(Math.sin(angle * RAD))) / 2;
  }

  /** The middle of an object, in game pixels from the top: never below the ground. */
  private middle(p: Pose): number {
    return Math.min(this.groundY - p.thing.height / 2 - p.lift, this.groundY - this.reach(p.thing, p.angle));
  }

  /**
   * An object turned about its long axis: the cross-section's four corners
   * projected on the screen, and the two faces between them that face us,
   * each squashed to fit.
   */
  private drawThing(p: Pose): void {
    const { thing, x, angle } = p;
    let f = this.faces.get(thing.id);
    if (!f) this.faces.set(thing.id, (f = facesOf(thing)));
    const c = Math.cos(angle * RAD);
    const s = Math.sin(angle * RAD);
    const mid = this.middle(p);
    const [h, w] = [thing.height / 2, thing.width / 2];
    // Screen rows of the corners: near and far, top and bottom, as the object stands.
    const row = (y: number, z: number) => Math.round(mid - (y * c - z * s));
    const nearTop = row(h, w);
    const nearBottom = row(-h, w);
    const farTop = row(h, -w);
    const farBottom = row(-h, -w);
    const left = Math.round(x - thing.length / 2);
    if (c > 0) this.face(f.side, left, nearTop, nearBottom);
    if (c < 0) this.face(f.side, left, farTop, farBottom);
    if (s > 0) this.face(f.top, left, farTop, nearTop);
    if (s < 0) this.face(f.bottom, left, nearBottom, farBottom);
  }

  /** A face from screen row `from`, its first row, to row `to`: upside down if `to` is above `from`. */
  private face(img: HTMLCanvasElement, left: number, from: number, to: number): void {
    const h = to - from;
    if (h > 0) this.ctx.drawImage(img, left, from, img.width, h);
    else if (h < 0) {
      this.ctx.save();
      this.ctx.translate(left, from);
      this.ctx.scale(1, -1);
      this.ctx.drawImage(img, 0, 0, img.width, -h);
      this.ctx.restore();
    }
  }

  /** A shadow on the street, smaller and fainter the higher the object. */
  private shadow(p: Pose): void {
    const k = Math.max(0.35, 1 - p.lift / 90);
    const w = Math.round(p.thing.length * k);
    const x = Math.round(p.x - w / 2);
    this.ctx.fillStyle = `rgba(0, 0, 0, ${(0.45 * k).toFixed(2)})`;
    this.ctx.fillRect(x, this.groundY, w, 1);
    this.ctx.fillRect(x + 2, this.groundY + 1, Math.max(0, w - 4), 1);
  }

  /** The sneaker that kicked it: in at the tail, up, and gone, in the flip's first ticks. */
  private kick(p: Pose, t: number): void {
    const k = t / 12;
    if (k >= 1) return;
    const swing = Math.sin(Math.PI * Math.min(1, k * 1.4));
    this.ctx.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3;
    this.ctx.drawImage(this.shoe, Math.round(p.x - p.thing.length / 2 - 11 + swing * 5), Math.round(this.groundY - 5 - swing * 7));
    this.ctx.globalAlpha = 1;
  }

  /**
   * The Roadster's thrusters: blue jets out of its underside all through the
   * flight, from the nozzles under its floor, and more of them while they
   * steer it onto its wheels.
   */
  private thrusters(game: Game): void {
    const f = game.flight;
    if (game.phase !== 'air' || !f || game.thing.quirk !== 'thrusters') return;
    const pose = this.poses(game, 0)[0]!;
    const c = Math.cos(pose.angle * RAD);
    // The underside's middle row, and which way it faces on the screen.
    const y = this.middle(pose) + (pose.thing.height / 2) * c;
    const dir = c >= 0 ? 1 : -1;
    const left = pose.x - pose.thing.length / 2;
    const n = f.thrust ? 2 : 1;
    for (const nx of NOZZLES) {
      for (let i = 0; i < n; i++) {
        this.puffs.push({ x: left + nx + Math.random() - 0.5, y, vx: (Math.random() - 0.5) * 16, vy: dir * (50 + Math.random() * 70) * Math.max(0.3, Math.abs(c)), age: 0, life: 110 + Math.random() * 150 });
      }
    }
  }

  private age(delta: number): void {
    const dt = delta / 1000;
    for (const p of this.puffs) {
      p.age += delta;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.puffs = this.puffs.filter((p) => p.age < p.life);
  }

  /**
   * The meter after a landing: a ring over the object, a full turn at its
   * top, UNDER to the left and OVER to the right, a quarter turn at each end.
   * The window is green, the PERFECT band bright, and a tick marks the flick.
   */
  private drawMeter(l: Landing): void {
    const key = `${l.error}:${l.window}`;
    if (this.meter?.key !== key) this.meter = { key, canvas: meterImage(l) };
    const img = this.meter.canvas;
    this.ctx.drawImage(img, Math.round(CX - img.width / 2), this.groundY - METER_UP - (METER_OUT + 3));
  }

  /** The sky, the skyline and the street, drawn once per size. */
  private street(): HTMLCanvasElement {
    if (this.backdrop) return this.backdrop;
    const c = document.createElement('canvas');
    c.width = WIDTH;
    c.height = this.height;
    const ctx = c.getContext('2d')!;
    const ground = this.groundY;
    SKY.forEach((color, i) => {
      ctx.fillStyle = color;
      const top = Math.floor((ground * i) / SKY.length);
      ctx.fillRect(0, top, WIDTH, Math.floor((ground * (i + 1)) / SKY.length) - top);
    });
    // A skyline: the same blocks and lit windows on every screen.
    const widths = [10, 14, 8, 12, 16, 9, 13, 11, 15, 12, 10, 14];
    const heights = [18, 30, 22, 40, 26, 34, 16, 28, 38, 20, 24, 32];
    let x = 0;
    for (let b = 0; x < WIDTH; b++) {
      const w = widths[b % widths.length]!;
      const h = heights[b % heights.length]!;
      ctx.fillStyle = SKYLINE;
      ctx.fillRect(x, ground - h, w, h);
      ctx.fillStyle = SODIUM;
      for (let wx = x + 2; wx < x + w - 2; wx += 4) {
        for (let wy = ground - h + 4; wy < ground - 4; wy += 5) if ((wx + wy + b) % 3 === 0) ctx.fillRect(wx, wy, 1, 2);
      }
      x += w;
    }
    ctx.fillStyle = ASPHALT;
    ctx.fillRect(0, ground, WIDTH, this.height - ground);
    ctx.fillStyle = KERB;
    ctx.fillRect(0, ground, WIDTH, 1);
    ctx.fillStyle = SODIUM;
    for (let dx = 4; dx < WIDTH; dx += 16) ctx.fillRect(dx, ground + 22, 8, 2);
    this.backdrop = c;
    return c;
  }
}

/** The meter for a landing, as an image: the ring's top half, and the tick for the flick. */
function meterImage(l: Landing): HTMLCanvasElement {
  const r = METER_OUT + 3;
  const size = 2 * r + 1;
  // Two rows below the centre, so a tick pinned at either end shows whole.
  const rows = r + 3;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = rows;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, rows);
  const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  // A quarter turn either way is the end of the ring: a flick further off pins the tick there.
  const mark = (Math.max(-1, Math.min(1, l.error / QUARTER)) * Math.PI) / 2;
  for (let py = 0; py < rows; py++) {
    for (let px = 0; px < size; px++) {
      const dx = px - r;
      const dy = py - r;
      const d = Math.hypot(dx, dy);
      const phi = Math.atan2(dx, -dy);
      let color: number[] | null = null;
      let alpha = 255;
      if (d >= METER_IN - 3 && d < METER_OUT + 3 && Math.abs(phi - mark) * d <= 1) color = rgb('#fff4e6');
      else if (d >= METER_IN && d < METER_OUT && dy <= 0) {
        const off = Math.abs((phi / (Math.PI / 2)) * QUARTER);
        if (off * PERFECT_DIV <= l.window) color = rgb(NEON);
        else if (off <= l.window) color = rgb(GOOD);
        else {
          color = [255, 255, 255];
          alpha = 50;
        }
      }
      if (!color) continue;
      const o = (py * size + px) * 4;
      img.data.set([...color, alpha], o);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
