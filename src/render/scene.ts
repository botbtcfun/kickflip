import type { Landing } from '../sim/flip';
import type { Game, GameEvent } from '../sim/game';
import type { Thing } from '../sim/objects';
import { LAND_TICKS, PERFECT_DIV, QUARTER, RESET_TICKS, ROLL_TICKS, TICK_HZ, TURN } from '../sim/rules';
import { type Faces, facesOf } from './faces';
import { mix, noise } from './paint';
import { NOZZLES, sneaker } from './things';

/** The stage's width in pixels as drawn; its height fits the screen, at least MIN_HEIGHT. */
export const WIDTH = 288;
export const MIN_HEIGHT = 480;
/** Pixels drawn per pixel of height in the simulation. */
const SCALE = 2;
/** The street below the ground line, where the card sits. */
const STREET = 128;
const CX = WIDTH / 2;
const TICK_MS = 1000 / TICK_HZ;
/** Thousandths of a degree to radians. */
const RAD = Math.PI / 180_000;
const HOP_MS = 220;
/** The meter: a ring over the object, its centre this far above the ground. */
const METER_UP = 16;
const METER_IN = 52;
const METER_OUT = 57;
/** The charge bar, beside the object while a key is held. */
const BAR_X = CX + 64;
const BAR_W = 8;
const BAR_H = 120;

const SKY = ['#1b1440', '#24174b', '#2f1a55', '#3d1d5c', '#4e2061', '#622464', '#7a2a64', '#943262', '#b03d5d', '#cc4b56', '#e75d4f', '#ff8a5b'];
/** A 4x4 ordered dither, for the sky's bands to blend in pixels. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const ASPHALT = '#2a2a33';
const SODIUM = '#ffd166';
const NEON = '#3df5ff';
const GOOD = '#6cff8f';
const BAD = '#ff4d6d';
const CREAM = '#fff4e6';

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
  /** How far a held key has charged a flick, from 0 to 1, or null when none is held. */
  charge(): number | null;
}

/** An object as drawn: where, turned how far, and how high above where it rests. */
interface Pose {
  thing: Thing;
  x: number;
  angle: number;
  lift: number;
}

/** A puff of a thruster's jet, or of dust: flies off and fades through its colours. */
interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  colors: string[];
  /** Pulled back down, in pixels per second per second: dust falls, jets don't. */
  fall: number;
}

const JET_COLORS = ['#e0f6ff', '#4dc3ff', '#2a5cff'];
const DUST_COLORS = ['#c9b8a8', '#8a7d72', '#5c5560'];
const STILL = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const easeOut = (k: number) => 1 - (1 - k) * (1 - k);
const easeIn = (k: number) => k * k;
const smooth = (k: number) => k * k * (3 - 2 * k);

/**
 * The street as it's drawn: sky, skyline, the object flipping, its shadow,
 * the kick, the meter after a landing, and the charge bar, on a canvas at
 * one pixel per pixel drawn that the page scales up. It also runs the game:
 * each frame, as many ticks as the time since the last one is worth.
 */
export class Scene {
  readonly canvas = document.createElement('canvas');
  /** CSS pixels per pixel drawn. */
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
  /** A landing's jolt: shake left and how strong, a frozen beat, and a flash. */
  private shake = { left: 0, strength: 0 };
  private freeze = 0;
  private flash = 0;

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

  /** Where objects stand, in pixels from the top. */
  get groundY(): number {
    return this.height - STREET;
  }

  /** Sizes the stage: `height` pixels tall, shown `zoom` times as large. */
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
    this.shake.left = this.freeze = this.flash = 0;
  }

  /** A tap: the object hops a little, to show it felt it. */
  hop(): void {
    this.hopAt = this.now;
  }

  /** One frame, `delta` ms after the last: the ticks it is worth, then the picture. */
  frame(delta: number): void {
    this.now += delta;
    const s = this.session;
    // A frozen beat after a big landing holds the game, not the clock.
    if (this.freeze > 0) this.freeze -= delta;
    else if (!s.paused) {
      this.acc += Math.min(delta, 100);
      while (!s.paused && this.freeze <= 0 && this.acc >= TICK_MS) {
        this.acc -= TICK_MS;
        s.step(this.input.sample());
        this.thrusters(s.game);
        if (s.game.events.length) {
          this.jolt(s.game);
          s.onEvents(s.game.events);
        }
      }
    }
    this.shake.left = Math.max(0, this.shake.left - delta);
    this.flash = Math.max(0, this.flash - delta);
    this.age(delta);
    this.alpha = s.paused ? 0 : Math.min(1, this.acc / TICK_MS);
    this.draw(s.game, this.alpha);
    s.onFrame();
  }

  private draw(game: Game, a: number): void {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    if (this.shake.left > 0 && !STILL) {
      const k = this.shake.strength * (this.shake.left / 260);
      ctx.translate(Math.round((Math.random() * 2 - 1) * k), Math.round((Math.random() * 2 - 1) * k));
    }
    ctx.drawImage(this.street(), 0, 0);
    const poses = this.poses(game, a);
    const charge = this.session.paused ? null : this.input.charge();
    for (const p of poses) this.shadow(p);
    if (game.landing && game.phase !== 'air') this.drawMeter(game.landing);
    for (const p of poses) this.drawThing(p);
    if (game.phase === 'air' && game.flight) this.kick(poses[0]!, game.flight.t + a);
    else if (charge !== null && game.phase !== 'landed') this.windUp(poses[0]!, charge);
    for (const p of this.puffs) {
      const k = p.age / p.life;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = p.colors[Math.min(p.colors.length - 1, Math.floor(k * p.colors.length))]!;
      const size = k < 0.4 ? 3 : 2;
      ctx.fillRect(Math.round(p.x - size / 2), Math.round(p.y), size, size);
    }
    ctx.globalAlpha = 1;
    if (charge !== null) this.chargeBar(charge);
    ctx.restore();
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(0.22 * this.flash) / 120})`;
      ctx.fillRect(0, 0, WIDTH, this.height);
    }
  }

  /**
   * What a landing does to the picture: dust from under it, a shake for a
   * miss and a bigger one for a trick, a frozen beat for a trick, and a
   * flash for PERFECT.
   */
  private jolt(game: Game): void {
    const land = game.events.find((e) => e.type === 'land');
    if (!land || land.type !== 'land') return;
    const l = land.landing;
    const t = game.thing;
    const n = 10 + Math.min(16, t.length / 4);
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      this.puffs.push({
        x: CX + side * (t.length / 2) * Math.random(),
        y: this.groundY - 1,
        vx: side * (30 + Math.random() * 70),
        vy: -(20 + Math.random() * 60),
        age: 0,
        life: 300 + Math.random() * 300,
        colors: DUST_COLORS,
        fall: 220,
      });
    }
    if (!l.clean) this.shake = { left: 260, strength: 4 };
    else if (l.extra) {
      this.shake = { left: 260, strength: 3 + l.extra };
      this.freeze = 90;
    }
    if (l.verdict === 'perfect') this.flash = 120;
  }

  /** Where each object is this frame, by phase. */
  private poses(game: Game, a: number): Pose[] {
    const thing = game.thing;
    const progress = (ticks: number) => Math.min(1, (game.phaseTicks + a) / ticks);
    const l = game.landing;
    if (game.phase === 'air' && game.flight) {
      const f = game.flight;
      return [{ thing, x: CX, angle: lerp(f.prevAngle, f.angle, a), lift: (lerp(f.prevHeight, f.height, a) / 1000) * SCALE }];
    }
    if (game.phase === 'landed' && l) {
      // A clean landing rocks back onto its wheels, slower the further off it came down; a miss topples over.
      const settle = l.clean ? 0.15 + (0.6 * Math.abs(l.angle - l.rest)) / QUARTER : 0.6;
      const k = smooth(progress(LAND_TICKS * Math.min(0.75, settle)));
      return [{ thing, x: CX, angle: lerp(l.angle, l.rest, k), lift: 0 }];
    }
    if (game.phase === 'reset' && l) {
      // Back up onto its wheels with a little hop, the shorter way round.
      const k = smooth(progress(RESET_TICKS));
      const up = Math.round(l.rest / TURN) * TURN;
      return [{ thing, x: CX, angle: lerp(l.rest, up, k), lift: Math.sin(Math.PI * k) * 16 }];
    }
    if (game.phase === 'roll') {
      const k = progress(ROLL_TICKS);
      const out: Pose[] = [{ thing, x: lerp(WIDTH + thing.length, CX, easeOut(k)), angle: 0, lift: 0 }];
      if (game.previous) out.push({ thing: game.previous, x: lerp(CX, -game.previous.length, easeIn(k)), angle: 0, lift: 0 });
      return out;
    }
    const hop = (this.now - this.hopAt) / HOP_MS;
    return [{ thing, x: CX, angle: 0, lift: hop < 1 ? Math.sin(Math.PI * hop) * 8 : 0 }];
  }

  /** How far below its middle an object reaches, turned to `angle`. */
  private reach(t: Thing, angle: number): number {
    return (t.height * Math.abs(Math.cos(angle * RAD)) + t.width * Math.abs(Math.sin(angle * RAD))) / 2;
  }

  /** The middle of an object, in pixels from the top: never below the ground. */
  private middle(p: Pose): number {
    return Math.min(this.groundY - p.thing.height / 2 - p.lift, this.groundY - this.reach(p.thing, p.angle));
  }

  /**
   * An object turned about its long axis, a column at a time along its
   * length. Each column is a stack of slabs, each as tall as some rows of the
   * object and as wide as the object is there. Turned, a slab's corners land
   * on screen rows, and the faces of it that face us are drawn between them,
   * squashed to fit: its side, and its top or bottom, from the roof and
   * underside faces. The slabs go far to near, so nearer ones cover what's
   * behind them: a head turns as a head on a body, a roof sits on the cabin,
   * and wheels and legs hang below the floor.
   */
  private drawThing(p: Pose): void {
    const { thing, x, angle } = p;
    let f = this.faces.get(thing.id);
    if (!f) this.faces.set(thing.id, (f = facesOf(thing)));
    const c = Math.cos(angle * RAD);
    const s = Math.sin(angle * RAD);
    const mid = this.middle(p);
    const [h, w, W] = [thing.height / 2, thing.width / 2, thing.width];
    // The screen row of a point of the cross-section: y up from the middle, z toward us.
    const row = (y: number, z: number) => Math.round(mid - (y * c - z * s));
    const left = Math.round(x - thing.length / 2);
    const edge = (far: number, near: number) => (c > 0 ? near : far) - w;
    for (let i = 0; i < thing.length; i++) {
      const col = f.cols[i]!;
      const n = col.slabs.length;
      for (let j = 0; j < n; j++) {
        // Seen from above, the lowest slab is furthest; from below, the highest.
        const sl = col.slabs[s >= 0 ? n - 1 - j : j]!;
        const [yt, yb] = [h - sl.r0, h - sl.r1];
        if (s > 0) this.slice(f.top, f.flipped.top, i, sl.far, sl.near, left + i, row(yt, sl.far - w), row(yt, sl.near - w));
        else if (s < 0) this.slice(f.bottom, f.flipped.bottom, i, W - sl.near, W - sl.far, left + i, row(yb, sl.near - w), row(yb, sl.far - w));
        if (c !== 0) {
          const z = edge(sl.far, sl.near);
          this.slice(f.side, f.flipped.side, i, sl.r0, sl.r1, left + i, row(yt, z), row(yb, z));
        }
      }
      if (c === 0) continue;
      // What sticks up above the roof or hangs below the floor, on the side toward us.
      const first = col.slabs[0];
      const last = col.slabs[n - 1];
      if (col.roof > col.top) {
        const z = first ? edge(first.far, first.near) : edge(col.far, col.near);
        this.slice(f.side, f.flipped.side, i, col.top, col.roof, left + i, row(h - col.top, z), row(h - col.roof, z));
      }
      if (col.base > col.floor) {
        const z = last ? edge(last.far, last.near) : edge(col.far, col.near);
        this.slice(f.side, f.flipped.side, i, col.floor, col.base, left + i, row(h - col.floor, z), row(h - col.base, z));
      }
    }
  }

  /**
   * Rows `from` to `to` of column `col` of a face, drawn from screen row `a`
   * (where its first row goes) to row `b`: upside down, from the flipped copy,
   * when `b` is above `a`.
   */
  private slice(img: HTMLCanvasElement, flipped: HTMLCanvasElement, col: number, from: number, to: number, dx: number, a: number, b: number): void {
    const span = to - from;
    if (span <= 0 || a === b) return;
    if (b > a) this.ctx.drawImage(img, col, from, 1, span, dx, a, 1, b - a);
    else this.ctx.drawImage(flipped, col, img.height - to, 1, span, dx, b, 1, a - b);
  }

  /** A shadow on the street, smaller and fainter the higher the object. */
  private shadow(p: Pose): void {
    const k = Math.max(0.35, 1 - p.lift / 180);
    const w = Math.round(p.thing.length * k);
    const x = Math.round(p.x - w / 2);
    this.ctx.fillStyle = `rgba(0, 0, 0, ${(0.45 * k).toFixed(2)})`;
    this.ctx.fillRect(x, this.groundY, w, 2);
    this.ctx.fillRect(x + 4, this.groundY + 2, Math.max(0, w - 8), 1);
  }

  /** The sneaker that kicked it: in at the tail, up, and gone, in the flip's first ticks. */
  private kick(p: Pose, t: number): void {
    const k = t / 12;
    if (k >= 1) return;
    const swing = Math.sin(Math.PI * Math.min(1, k * 1.4));
    this.ctx.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3;
    this.ctx.drawImage(this.shoe, Math.round(p.x - p.thing.length / 2 - 22 + swing * 10), Math.round(this.groundY - 10 - swing * 14));
    this.ctx.globalAlpha = 1;
  }

  /** While a key charges a flick, the sneaker waits at the tail and draws back further the longer it's held. */
  private windUp(p: Pose, charge: number): void {
    const back = Math.round(charge * 14);
    this.ctx.drawImage(this.shoe, Math.round(p.x - p.thing.length / 2 - 22 - back), this.groundY - 10);
  }

  /**
   * How long a key has been held: a bar beside the object filling up, with a
   * tick at each fifth. It shows how hard the flick will be, not how hard it
   * should be: finding that is the game.
   */
  private chargeBar(charge: number): void {
    const ctx = this.ctx;
    const bottom = this.groundY - 8;
    const top = bottom - BAR_H;
    ctx.fillStyle = '#14121c';
    ctx.fillRect(BAR_X - 2, top - 2, BAR_W + 4, BAR_H + 4);
    ctx.fillStyle = '#2f2a44';
    ctx.fillRect(BAR_X, top, BAR_W, BAR_H);
    const full = Math.round(charge * BAR_H);
    // Warm at first, hot near the top; a full bar blinks.
    const color = charge < 0.5 ? mix(SODIUM, '#ff8a5b', charge * 2) : mix('#ff8a5b', BAD, (charge - 0.5) * 2);
    if (charge < 1 || Math.floor(this.now / 120) % 2 === 0) {
      ctx.fillStyle = color;
      ctx.fillRect(BAR_X, bottom - full, BAR_W, full);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(BAR_X, bottom - full, 2, full);
    }
    ctx.fillStyle = '#14121c';
    // Ticks at fifths: no sweet spot sits on one.
    for (let q = 1; q < 5; q++) ctx.fillRect(BAR_X, bottom - Math.round((q * BAR_H) / 5), BAR_W, 1);
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
    for (const nozzle of NOZZLES) {
      for (let i = 0; i < n; i++) {
        this.puffs.push({
          x: left + nozzle * pose.thing.length + (Math.random() - 0.5) * 2,
          y,
          vx: (Math.random() - 0.5) * 32,
          vy: dir * (100 + Math.random() * 140) * Math.max(0.3, Math.abs(c)),
          age: 0,
          life: 110 + Math.random() * 150,
          colors: JET_COLORS,
          fall: 0,
        });
      }
    }
  }

  private age(delta: number): void {
    const dt = delta / 1000;
    for (const p of this.puffs) {
      p.age += delta;
      p.vy += p.fall * dt;
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
    this.ctx.drawImage(img, Math.round(CX - img.width / 2), this.groundY - METER_UP - (METER_OUT + 5));
  }

  /** The sky, the skyline and the street, drawn once per size. */
  private street(): HTMLCanvasElement {
    if (this.backdrop) return this.backdrop;
    const c = document.createElement('canvas');
    c.width = WIDTH;
    c.height = this.height;
    const ctx = c.getContext('2d')!;
    const ground = this.groundY;
    // The sky, banded and dithered from night down to the sunset.
    const sky = ctx.createImageData(WIDTH, ground);
    const rgb = SKY.map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
    for (let y = 0; y < ground; y++) {
      const t = (y / ground) * (SKY.length - 1);
      const band = Math.floor(t);
      for (let x = 0; x < WIDTH; x++) {
        const pick = t - band > (BAYER[(y % 4) * 4 + (x % 4)]! + 0.5) / 16 ? band + 1 : band;
        sky.data.set([...rgb[Math.min(pick, SKY.length - 1)]!, 255], (y * WIDTH + x) * 4);
      }
    }
    ctx.putImageData(sky, 0, 0);
    // Two rows of blocks, the far one paler, with lit windows: the same on every screen.
    const skyline = (color: string, lit: string, widths: number[], heights: number[], offset: number, seed: number, chance: number) => {
      let x = -offset;
      for (let b = 0; x < WIDTH; b++) {
        const w = widths[b % widths.length]!;
        const h = heights[b % heights.length]!;
        ctx.fillStyle = color;
        ctx.fillRect(x, ground - h, w, h);
        ctx.fillStyle = lit;
        for (let wx = x + 3; wx < x + w - 3; wx += 6) {
          for (let wy = ground - h + 6; wy < ground - 6; wy += 8) if (noise(wx, wy, seed + b) < chance) ctx.fillRect(wx, wy, 2, 3);
        }
        x += w;
      }
    };
    skyline('#2a1f4f', '#8a6070', [26, 18, 34, 22, 30, 20, 28], [92, 120, 76, 136, 104, 84, 124], 10, 11, 0.18);
    skyline('#1a1438', SODIUM, [20, 28, 16, 24, 32, 18, 26, 22, 30, 24, 20, 28], [36, 60, 44, 80, 52, 68, 32, 56, 76, 40, 48, 64], 0, 3, 0.35);
    // The street: asphalt with grit, the kerb, the centre line.
    ctx.fillStyle = ASPHALT;
    ctx.fillRect(0, ground, WIDTH, this.height - ground);
    ctx.fillStyle = '#34343f';
    for (let y = ground; y < this.height; y++) for (let x = 0; x < WIDTH; x++) if (noise(x, y, 21) < 0.06) ctx.fillRect(x, y, 1, 1);
    ctx.fillStyle = '#5c5c6e';
    ctx.fillRect(0, ground, WIDTH, 1);
    ctx.fillStyle = '#44444f';
    ctx.fillRect(0, ground + 1, WIDTH, 1);
    ctx.fillStyle = SODIUM;
    for (let dx = 8; dx < WIDTH; dx += 32) ctx.fillRect(dx, ground + 44, 16, 4);
    this.backdrop = c;
    return c;
  }
}

/** The meter for a landing, as an image: the ring's top half, and the tick for the flick. */
function meterImage(l: Landing): HTMLCanvasElement {
  const r = METER_OUT + 5;
  const size = 2 * r + 1;
  // Rows below the centre too, so a tick pinned at either end shows whole.
  const rows = r + 4;
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
      const dx = px + 0.5 - (r + 0.5);
      const dy = py + 0.5 - (r + 0.5);
      const d = Math.hypot(dx, dy);
      const phi = Math.atan2(dx, -dy);
      let color: number[] | null = null;
      let alpha = 255;
      if (d >= METER_IN - 5 && d < METER_OUT + 5 && Math.abs(phi - mark) * d <= 1.5) color = rgb(CREAM);
      else if (d >= METER_IN - 1 && d < METER_OUT + 1 && dy <= 0) {
        // A dark rim around the ring, so it reads on the skyline.
        if (d < METER_IN || d >= METER_OUT) color = rgb('#14121c');
        else {
          const off = Math.abs((phi / (Math.PI / 2)) * QUARTER);
          if (off * PERFECT_DIV <= l.window) color = rgb(NEON);
          else if (off <= l.window) color = rgb(GOOD);
          else {
            color = [255, 255, 255];
            alpha = 60;
          }
        }
      }
      if (!color) continue;
      img.data.set([...color, alpha], (py * size + px) * 4);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
