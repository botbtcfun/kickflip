import { INTENSITY_MAX, INTENSITY_MIN } from '../sim/rules';

/** A swipe this fast, in stage heights per second, is the strongest flick: 2.5 is a standard single flip. */
const FULL_SPEED = (10 * INTENSITY_MAX) / 2000;
/** A swipe's speed is read over its last this many ms: the flick, not the wind-up. */
const SPEED_MS = 80;
/** A swipe shorter than this, upward, is a tap. */
const MIN_TRAVEL_PX = 24;
/** Holding a key this long is the strongest flick: half a second is a standard single flip. */
const FULL_HOLD_MS = INTENSITY_MAX;
const CHARGE_KEYS = new Set(['ArrowUp', 'KeyW', 'Space']);
/** Samples older than this are no use to the speed. */
const KEEP_MS = 400;

interface Sample {
  t: number;
  y: number;
}

/**
 * Turns a swipe up into a flick's intensity, from INTENSITY_MIN to
 * INTENSITY_MAX: the swipe's speed over its last SPEED_MS, measured in
 * stage heights per second, so a phone and a monitor read the same flick the
 * same. A mouse drag counts as a swipe. On a keyboard, holding ↑ or Space and
 * letting go flicks, as hard as it was held long, and charge() says how far
 * it has got. Anything too short or too slow is a tap. The game takes one
 * flick a tick, with sample().
 */
export class Swipe {
  /** Called for a tap, or a swipe too weak to flick. */
  onTap: () => void = () => {};
  private on = false;
  private queued = 0;
  private pointer: number | null = null;
  private samples: Sample[] = [];
  private startY = 0;
  private heldSince: number | null = null;

  constructor(private readonly stage: HTMLElement) {
    stage.addEventListener('pointerdown', (e) => this.down(e));
    stage.addEventListener('pointermove', (e) => this.move(e));
    stage.addEventListener('pointerup', (e) => this.up(e));
    stage.addEventListener('pointercancel', (e) => {
      if (e.pointerId === this.pointer) this.pointer = null;
    });
    window.addEventListener('keydown', (e) => {
      if (!this.on || e.repeat || !CHARGE_KEYS.has(e.code) || e.metaKey || e.ctrlKey || e.altKey || e.target instanceof HTMLInputElement) return;
      e.preventDefault();
      this.heldSince = e.timeStamp;
    });
    window.addEventListener('keyup', (e) => {
      if (this.heldSince === null || !CHARGE_KEYS.has(e.code)) return;
      const held = e.timeStamp - this.heldSince;
      this.heldSince = null;
      this.flick(Math.round(Math.min(1, held / FULL_HOLD_MS) * INTENSITY_MAX));
    });
    window.addEventListener('blur', () => this.reset());
  }

  /** Whether flicks count: only while a run is being played. Turning it off drops a swipe or a hold in progress. */
  get enabled(): boolean {
    return this.on;
  }

  set enabled(on: boolean) {
    if (on === this.on) return;
    this.on = on;
    if (!on) this.reset();
  }

  /** How far a held key has charged a flick, from 0 to 1, or null when none is held. */
  charge(): number | null {
    return this.heldSince === null ? null : Math.min(1, (performance.now() - this.heldSince) / FULL_HOLD_MS);
  }

  /** The flick for this tick, or 0. */
  sample(): number {
    const i = this.queued;
    this.queued = 0;
    return i;
  }

  reset(): void {
    this.queued = 0;
    this.pointer = null;
    this.samples = [];
    this.heldSince = null;
  }

  private down(e: PointerEvent): void {
    // Buttons and screens take their own taps; one finger flicks at a time.
    if (!this.on || this.pointer !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if ((e.target as Element).closest('button, a, input, .overlay')) return;
    e.preventDefault();
    this.pointer = e.pointerId;
    this.startY = e.clientY;
    this.samples = [{ t: e.timeStamp, y: e.clientY }];
    // Keeps the swipe when the finger leaves the stage. A pointer already gone can't be captured; it ends soon anyway.
    try {
      this.stage.setPointerCapture(e.pointerId);
    } catch {
      // Read it uncaptured.
    }
  }

  private move(e: PointerEvent): void {
    if (e.pointerId !== this.pointer) return;
    // Phones report more positions than they send events: take them all.
    const all = e.getCoalescedEvents?.() ?? [];
    for (const c of all.length ? all : [e]) this.samples.push({ t: c.timeStamp, y: c.clientY });
    const old = e.timeStamp - KEEP_MS;
    while (this.samples.length > 2 && this.samples[1]!.t < old) this.samples.shift();
  }

  private up(e: PointerEvent): void {
    if (e.pointerId !== this.pointer) return;
    this.pointer = null;
    this.samples.push({ t: e.timeStamp, y: e.clientY });
    const travel = this.startY - e.clientY;
    if (travel < MIN_TRAVEL_PX) return this.onTap();
    this.flick(Math.round(Math.min(1, speed(this.samples) / Math.max(1, this.stage.clientHeight) / FULL_SPEED) * INTENSITY_MAX));
  }

  private flick(intensity: number): void {
    if (intensity < INTENSITY_MIN) this.onTap();
    else this.queued = intensity;
  }
}

/**
 * How fast the samples moved up at the end, in px per second: over the last
 * SPEED_MS, or the whole swipe if it was quicker than that.
 */
export function speed(samples: Sample[]): number {
  const end = samples[samples.length - 1]!;
  const from = end.t - SPEED_MS;
  let i = samples.length - 1;
  while (i > 0 && samples[i - 1]!.t >= from) i--;
  let y0 = samples[i]!.y;
  let t0 = samples[i]!.t;
  if (i > 0) {
    // Where the pointer was SPEED_MS before the end, between two samples.
    const a = samples[i - 1]!;
    const b = samples[i]!;
    y0 = a.y + ((b.y - a.y) * (from - a.t)) / (b.t - a.t || 1);
    t0 = from;
  }
  // A swipe can't be quicker than a frame.
  return ((y0 - end.y) * 1000) / Math.max(end.t - t0, 16);
}
