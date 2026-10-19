import '@fontsource/press-start-2p/latin-400.css';
import '@fontsource/vt323/latin-400.css';
import './ui/style.css';

import { Sound } from './audio/sound';
import { MIN_HEIGHT, Scene, type Session, WIDTH } from './render/scene';
import { Swipe } from './render/swipe';
import { Game, type GameEvent } from './sim/game';
import type { Landing } from './sim/flip';
import { InputLog } from './sim/replay';
import { Rng } from './sim/rng';
import { LAST_LEVEL, QUARTER, TURN } from './sim/rules';
import { Hud, isTouch, points } from './ui/hud';

/** The UTC day: the same objects for everyone, all day. */
const day = Math.floor(Date.now() / 86_400_000);
/** Tablets stop growing the stage here. */
const MAX_TOUCH_ZOOM = 2;
/** On a desktop the stage is a portrait column at most this tall, in pixels drawn. */
const MAX_DESK_HEIGHT = 640;
const SOUND_KEY = 'kickflip:sound';
/** The game's own address, for leaving a frame it's embedded in. */
const HOME = 'https://kickflip.botbtc.fun/';
/** Played inside a frame, such as a player card on X: ?embed=1. */
const embed = new URLSearchParams(window.location.search).has('embed');
document.body.classList.toggle('embed', embed);

const stage = document.getElementById('stage')!;
const hud = new Hud();

let soundOn = true;
try {
  soundOn = localStorage.getItem(SOUND_KEY) !== 'off';
} catch {
  // Storage can be blocked: sound stays on.
}
const sound = new Sound(!soundOn);
// Before the page's own key handler, so the key that starts a run doesn't also flick.
const swipe = new Swipe(stage);

const tap = () => (isTouch() ? 'TAP' : 'CLICK OR PRESS ENTER');
/** In a frame, a way out to the whole game in its own tab. */
const full = () => (embed ? `<p><a class="full" href="${HOME}" target="_blank" rel="noopener">PLAY FULL SCREEN ↗</a></p>` : '');

class Run implements Session {
  game = new Game(`day:${day}`);
  log = new InputLog();
  started = false;
  pausedByUser = false;
  hidden = false;
  /** Quarter turns ticked so far in this flight. */
  private quarters = 0;

  get paused(): boolean {
    return !this.started || this.pausedByUser || this.hidden || this.game.over;
  }

  begin(): void {
    this.started = true;
    this.pausedByUser = false;
    this.game = new Game(`day:${day}`);
    this.log = new InputLog();
    swipe.reset();
    scene.reset();
    hud.clearVerdict();
    hud.overlay(null);
    sound.unlock();
  }

  step(input: number): void {
    this.log.push(input);
    this.game.step(input);
    // A tick for every quarter turn, and the Roadster's jets while it flies.
    const f = this.game.flight;
    if (this.game.phase === 'air' && f) {
      const q = Math.floor(f.angle / QUARTER);
      if (q > this.quarters) sound.tick();
      this.quarters = q;
      if (this.game.thing.quirk === 'thrusters') sound.thrust(f.thrust ? 1 : 0.45);
    } else {
      this.quarters = 0;
      sound.thrust(0);
    }
  }

  onEvents(events: GameEvent[]): void {
    for (const e of events) {
      if (e.type === 'land') {
        const l = e.landing;
        // The Roadster and the cat land anything: say so when the flick alone would have missed.
        const quirk = this.game.thing.quirk;
        const missed = Math.abs(l.error) > l.window;
        const notes = [!missed ? '' : quirk === 'thrusters' ? 'THRUSTERS SAVED IT' : quirk === 'feet' ? 'ON ITS FEET, AS EVER' : ''];
        if (l.lives) notes.push(l.lives === 1 ? '+1 LIFE' : `+${l.lives} LIVES`);
        if (l.clean && this.game.level === LAST_LEVEL) notes.push('SUPPLY CAPPED AT 21M');
        hud.verdict(l, (scene.groundY - 150) * scene.zoom, this.game.level, blockHash(l, this.game.level), notes.filter(Boolean).join('<br>'));
        if (l.clean) sound.land(l, this.game.streak);
        else sound.miss();
        if (l.lives) sound.life();
      } else if (e.type === 'launch') sound.whoosh(e.intensity);
      else if (e.type === 'next') sound.roll();
      else if (e.type === 'over') {
        sound.over();
        this.gameOver();
      }
    }
  }

  onFrame(): void {
    swipe.enabled = !this.paused;
    if (this.paused) sound.thrust(0);
    hud.update(this.game);
  }

  togglePause(): void {
    if (!this.started || this.game.over) return;
    this.pausedByUser = !this.pausedByUser;
    hud.overlay(this.pausedByUser ? `<h2>PAUSED</h2><p class="blink">${tap()} TO PLAY</p>` : null);
  }

  private gameOver(): void {
    const g = this.game;
    hud.overlay(`<h2>GAME OVER</h2>
<p class="big">${points(g.score)}</p>
<p>${g.index} BLOCKS MINED · LONGEST CHAIN ${g.best}</p>
<p class="dim">THE ${g.thing.name} GOT YOU</p>
<p class="blink">${tap()} TO PLAY AGAIN</p>${full()}`);
  }
}

/**
 * A landing's block hash, to show: zeros in front as with proof of work,
 * more the closer the flick came. Five to ten for a clean landing, eight or
 * more for PERFECT, one to three for a miss. Only for show: it changes
 * nothing in the run, and comes out the same for the same landing.
 */
function blockHash(l: Landing, height: number): string {
  const rng = new Rng(`block:${day}:${height}:${l.angle}:${l.error}`);
  const off = Math.abs(l.angle - l.turns * TURN);
  const zeros = l.clean ? 5 + Math.round(5 * (1 - Math.min(1, Math.abs(l.error) / l.window))) : 3 - Math.round(2 * Math.min(1, (off - l.window) / l.window));
  // The first digit after the zeros is never 0, so the count is what it says.
  let hex = '0'.repeat(Math.max(1, zeros)) + '123456789abcdef'[rng.below(15)]!;
  while (hex.length < 16) hex += '0123456789abcdef'[rng.below(16)]!;
  return hex;
}

const run = new Run();
const scene = new Scene(run, swipe);
swipe.onTap = () => {
  scene.hop();
  sound.hop();
};
document.getElementById('game')!.append(scene.canvas);

function intro(): void {
  const how = isTouch() ? 'SWIPE UP, OR HOLD<br>AND LET GO.' : 'HOLD THE MOUSE OR ↑<br>AND LET GO, OR DRAG UP.';
  hud.overlay(`<h2 class="logo">KICKFLIP</h2>
<p>${how}<br>LAND IT ON ITS WHEELS.</p>
<p class="dim">The longer the hold, or the faster the swipe,<br>the more it spins. Every one is harder.<br>Each landing mines a block; the 21st is the last bitcoin.</p>
<p class="dim">Three lives. Earn more with two PERFECTs<br>in a row, or a double or triple kickflip.</p>
<p class="blink">${tap()} TO START</p>${full()}`);
}

/**
 * The visible area in CSS pixels as if not pinch-zoomed: iOS shrinks
 * innerWidth and innerHeight while the page is zoomed.
 */
function viewport(): { w: number; h: number } {
  const v = window.visualViewport;
  return v ? { w: Math.round(v.width * v.scale), h: Math.round(v.height * v.scale) } : { w: window.innerWidth, h: window.innerHeight };
}

/**
 * The zoom, and the stage's height in pixels drawn. A phone in portrait is
 * all stage, at a fractional zoom: phones are dense enough to hide uneven
 * pixels. In landscape the stage is as tall as the screen. On a desktop the
 * zoom is a whole number of the screen's own pixels, so every pixel drawn is
 * the same size, and the stage is a portrait column. In a frame, it fills
 * the frame: as tall as it, and as wide, however wide that is.
 */
function fit(): { zoom: number; width: number; height: number } {
  const { w, h } = viewport();
  const floor2 = (z: number) => Math.max(0.3, Math.floor(z * 100) / 100);
  if (embed) {
    const zoom = floor2(Math.min(w / WIDTH, h / MIN_HEIGHT));
    return { zoom, width: Math.max(WIDTH, Math.floor(w / zoom)), height: Math.max(MIN_HEIGHT, Math.floor(h / zoom)) };
  }
  if (isTouch()) {
    if (h >= w) {
      const zoom = floor2(Math.min(w / WIDTH, MAX_TOUCH_ZOOM));
      return { zoom, width: WIDTH, height: Math.max(MIN_HEIGHT, Math.ceil(h / zoom)) };
    }
    return { zoom: floor2(h / MIN_HEIGHT), width: WIDTH, height: MIN_HEIGHT };
  }
  const dpr = window.devicePixelRatio || 1;
  const zoom = Math.max(1 / dpr, Math.floor(Math.min((w - 40) / WIDTH, (h - 40) / MIN_HEIGHT) * dpr) / dpr);
  return { zoom, width: WIDTH, height: Math.min(MAX_DESK_HEIGHT, Math.max(MIN_HEIGHT, Math.floor((h - 40) / zoom))) };
}

function layout(): void {
  const { w, h } = viewport();
  document.body.classList.toggle('portrait', h >= w);
  document.body.classList.toggle('landscape', h < w);
  const { zoom, width, height } = fit();
  scene.resize(width, height, zoom);
  // A narrow stage gets a compact strip, so five hearts and a long score still leave room for the buttons.
  document.body.classList.toggle('narrow', width * zoom < 440);
}

// Rotation, the browser's bars sliding in and out, and zoom all resize: lay out once a frame at most.
let pending = 0;
const relayout = () => {
  if (!pending) {
    pending = requestAnimationFrame(() => {
      pending = 0;
      layout();
    });
  }
};
window.addEventListener('resize', relayout);
window.visualViewport?.addEventListener('resize', relayout);

// No page zoom or scrolling while playing: iOS ignores user-scalable=no.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
// A touch screen that didn't say so up front gets its layout on the first touch.
window.addEventListener(
  'touchstart',
  () => {
    if (isTouch()) return;
    document.body.classList.add('touch');
    layout();
    if (!run.started) intro();
  },
  { once: true, passive: true },
);

// Away from the game, it pauses.
const away = () => {
  if (run.started && !run.game.over && !run.pausedByUser) run.togglePause();
};
document.addEventListener('visibilitychange', () => {
  run.hidden = document.hidden;
  if (document.hidden) away();
});
window.addEventListener('blur', away);

// Sound, on unless turned off: the button and M remember the choice.
hud.sound(soundOn);
function toggleSound(): void {
  soundOn = !soundOn;
  hud.sound(soundOn);
  sound.unlock();
  sound.setMuted(!soundOn);
  try {
    localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off');
  } catch {
    // Remembered for this visit only.
  }
}
document.getElementById('sound')!.addEventListener('click', toggleSound);
document.getElementById('pause')!.addEventListener('click', () => run.togglePause());

window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.code === 'KeyM') return toggleSound();
  const go = e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space' || e.code === 'ArrowUp';
  if (!run.started || run.game.over) {
    if (!go) return;
    e.preventDefault();
    run.begin();
  } else if (e.code === 'KeyP' || e.code === 'Escape' || (run.pausedByUser && go)) {
    e.preventDefault();
    run.togglePause();
  }
});
// Browsers start sound only from a tap or a key: any will do. On phones only the end of a tap counts.
document.addEventListener('pointerup', () => sound.unlock());
window.addEventListener('keydown', () => sound.unlock());
// A click, not a pointerdown, for the same reason.
document.getElementById('overlay')!.addEventListener('click', (e) => {
  // The full-screen link opens the game elsewhere; it doesn't start a run here.
  if ((e.target as Element).closest('a')) return;
  if (!run.started || run.game.over) run.begin();
  else if (run.pausedByUser) run.togglePause();
});

intro();
document.getElementById('loading')?.remove();
document.body.classList.add('ready');
layout();
scene.start();

// ?debug shows what the last swipe came to and what the browser reports about the screen, for checking a phone.
if (new URLSearchParams(window.location.search).has('debug')) {
  const box = document.createElement('div');
  box.className = 'debug';
  document.body.append(box);
  setInterval(() => {
    const l = swipe.last;
    box.textContent = [
      l ? `swipe ${l.how}: ${l.travel}px, ${l.heights} h/s -> ${l.intensity} (${l.samples} samples)` : 'no swipe yet',
      `flicks on: ${swipe.enabled} paused: ${run.paused} phase: ${run.game.phase}`,
      `screen ${window.innerWidth}x${window.innerHeight} stage ${stage.clientHeight}px`,
      document.body.className,
    ].join('\n');
  }, 200);
}

// For checking the game from the browser console while developing.
if (import.meta.env.DEV) Object.assign(window, { kickflip: run, scene, swipe, sound });
