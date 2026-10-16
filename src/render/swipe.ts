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

/** What the last swipe came to, for ?debug: how far, how fast, what it read as, and how it ended. */
export interface LastSwipe {
  travel: number;
  heights: number;
  intensity: number;
  how: string;
  samples: number;
}

/**
 * Turns a swipe up into a flick's intensity, from INTENSITY_MIN to
 * INTENSITY_MAX: the swipe's speed over its last SPEED_MS, measured in
 * stage heights per second, so a phone and a monitor read the same flick the
 * same. Fingers are read from touch events, which iOS keeps sending all
 * through a swipe even where it would rather scroll; a mouse or a pen from
 * pointer events. Times come from the page's own clock. On a keyboard,
 * holding ↑ or Space and letting go flicks, as hard as it was held long, and
 * charge() says how far it has got. Anything too short or too slow is a tap.
 * The game takes one flick a tick, with sample().
 */
export class Swipe {
  /** Called for a tap, or a swipe too weak to flick. */
  onTap: () => void = () => {};
  last: LastSwipe | null = null;
  private on = false;
  private queued = 0;
  /** The mouse or pen pointer, or the finger, being read. */
  private pointer: number | null = null;
  private finger: number | null = null;
  private samples: Sample[] = [];
  private startY = 0;
  private heldSince: number | null = null;

  constructor(private readonly stage: HTMLElement) {
    stage.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' || (e.pointerType === 'mouse' && e.button !== 0) || !this.free(e)) return;
      e.preventDefault();
      this.pointer = e.pointerId;
      this.begin(e.clientY);
      // Keeps the drag when it leaves the stage. A pointer already gone can't be captured; it ends soon anyway.
      try {
        stage.setPointerCapture(e.pointerId);
      } catch {
        // Read it uncaptured.
      }
    });
    stage.addEventListener('pointermove', (e) => e.pointerId === this.pointer && this.track(e.clientY));
    stage.addEventListener('pointerup', (e) => e.pointerId === this.pointer && this.release(e.clientY, 'up'));
    stage.addEventListener('pointercancel', (e) => e.pointerId === this.pointer && this.release(null, 'cancel'));
    stage.addEventListener('lostpointercapture', (e) => e.pointerId === this.pointer && this.release(null, 'lost'));

    const touch = (e: TouchEvent) => [...e.changedTouches].find((t) => t.identifier === this.finger);
    stage.addEventListener(
      'touchstart',
      (e) => {
        const t = e.changedTouches[0];
        if (!t || !this.free(e)) return;
        // No scrolling, no zoom, no long-press menu: the swipe is the game's.
        e.preventDefault();
        this.finger = t.identifier;
        this.begin(t.clientY);
      },
      { passive: false },
    );
    stage.addEventListener(
      'touchmove',
      (e) => {
        const t = touch(e);
        if (!t) return;
        e.preventDefault();
        this.track(t.clientY);
      },
      { passive: false },
    );
    for (const [type, how] of [
      ['touchend', 'up'],
      ['touchcancel', 'cancel'],
    ] as const) {
      stage.addEventListener(
        type,
        (e) => {
          const t = touch(e);
          if (t) this.release(t.clientY, how);
        },
        { passive: false },
      );
    }

    window.addEventListener('keydown', (e) => {
      if (!this.on || e.repeat || !CHARGE_KEYS.has(e.code) || e.metaKey || e.ctrlKey || e.altKey || e.target instanceof HTMLInputElement) return;
      e.preventDefault();
      this.heldSince = performance.now();
    });
    window.addEventListener('keyup', (e) => {
      if (this.heldSince === null || !CHARGE_KEYS.has(e.code)) return;
      const held = performance.now() - this.heldSince;
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
    this.finger = null;
    this.samples = [];
    this.heldSince = null;
  }

  /** Whether a new swipe may start here: in play, none under way, and not on a button or a screen, which take their own taps. */
  private free(e: Event): boolean {
    return this.on && this.pointer === null && this.finger === null && !(e.target as Element).closest('button, a, input, .overlay');
  }

  private begin(y: number): void {
    this.startY = y;
    this.samples = [{ t: performance.now(), y }];
  }

  private track(y: number): void {
    const t = performance.now();
    this.samples.push({ t, y });
    while (this.samples.length > 2 && this.samples[1]!.t < t - KEEP_MS) this.samples.shift();
  }

  /**
   * The end of a swipe: let go, or cancelled by the browser, which still
   * counts, from where it had got to.
   */
  private release(y: number | null, how: string): void {
    this.pointer = null;
    this.finger = null;
    const end = y ?? this.samples[this.samples.length - 1]?.y ?? this.startY;
    this.samples.push({ t: performance.now(), y: end });
    const travel = this.startY - end;
    const heights = speed(this.samples) / Math.max(1, this.stage.clientHeight);
    const intensity = travel < MIN_TRAVEL_PX ? 0 : Math.round(Math.min(1, heights / FULL_SPEED) * INTENSITY_MAX);
    this.last = { travel: Math.round(travel), heights: Math.round(heights * 100) / 100, intensity, how, samples: this.samples.length };
    if (travel < MIN_TRAVEL_PX) this.onTap();
    else this.flick(intensity);
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
