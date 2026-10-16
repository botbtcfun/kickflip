import '@fontsource/press-start-2p/latin-400.css';
import '@fontsource/vt323/latin-400.css';
import './ui/style.css';

import { MIN_HEIGHT, Scene, type Session, WIDTH } from './render/scene';
import { Swipe } from './render/swipe';
import { Game, type GameEvent } from './sim/game';
import { InputLog } from './sim/replay';
import { Hud, isTouch, points } from './ui/hud';

/** The UTC day: the same objects for everyone, all day. */
const day = Math.floor(Date.now() / 86_400_000);
/** Tablets stop growing the stage here. */
const MAX_TOUCH_ZOOM = 4;
/** On a desktop the stage is a portrait column at most this tall, in game pixels. */
const MAX_DESK_HEIGHT = 320;
const SOUND_KEY = 'kickflip:sound';

const stage = document.getElementById('stage')!;
const hud = new Hud();
// Before the page's own key handler, so the key that starts a run doesn't also flick.
const swipe = new Swipe(stage);

const tap = () => (isTouch() ? 'TAP' : 'CLICK OR PRESS ENTER');

class Run implements Session {
  game = new Game(`day:${day}`);
  log = new InputLog();
  started = false;
  pausedByUser = false;
  hidden = false;

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
  }

  step(input: number): void {
    this.log.push(input);
    this.game.step(input);
  }

  onEvents(events: GameEvent[]): void {
    for (const e of events) {
      if (e.type === 'land') {
        const l = e.landing;
        // The Roadster lands anything: say so when the flick alone would have missed.
        const saved = this.game.thing.quirk === 'thrusters' && Math.abs(l.error) > l.window ? 'THRUSTERS SAVED IT' : '';
        hud.verdict(l, (scene.groundY - 62) * scene.zoom, saved);
      } else if (e.type === 'over') this.gameOver();
    }
  }

  onFrame(): void {
    swipe.enabled = !this.paused;
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
<p>${g.index} LANDED · BEST STREAK ×${g.best}</p>
<p class="dim">THE ${g.thing.name} GOT YOU</p>
<p class="blink">${tap()} TO PLAY AGAIN</p>`);
  }
}

const run = new Run();
const scene = new Scene(run, swipe);
swipe.onTap = () => scene.hop();
document.getElementById('game')!.append(scene.canvas);

function intro(): void {
  const how = isTouch() ? 'SWIPE UP TO FLIP IT.' : 'DRAG UP, OR HOLD ↑ AND LET GO.';
  hud.overlay(`<h2 class="logo">KICKFLIP</h2>
<p>${how}<br>LAND IT ON ITS WHEELS.</p>
<p class="dim">The harder the flick, the more it spins.<br>Every object is harder. Three lives.</p>
<p class="blink">${tap()} TO START</p>`);
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
 * The zoom, and the stage's height in game pixels. A phone in portrait is
 * all stage, at a fractional zoom: phones are dense enough to hide uneven
 * pixels. In landscape the stage is as tall as the screen. On a desktop the
 * zoom is whole, so pixels stay square, and the stage is a portrait column.
 */
function fit(): { zoom: number; height: number } {
  const { w, h } = viewport();
  const floor2 = (z: number) => Math.max(0.5, Math.floor(z * 100) / 100);
  if (isTouch()) {
    if (h >= w) {
      const zoom = floor2(Math.min(w / WIDTH, MAX_TOUCH_ZOOM));
      return { zoom, height: Math.max(MIN_HEIGHT, Math.ceil(h / zoom)) };
    }
    return { zoom: floor2(h / MIN_HEIGHT), height: MIN_HEIGHT };
  }
  const zoom = Math.max(1, Math.floor(Math.min((w - 40) / WIDTH, (h - 40) / MIN_HEIGHT)));
  return { zoom, height: Math.min(MAX_DESK_HEIGHT, Math.max(MIN_HEIGHT, Math.floor((h - 40) / zoom))) };
}

function layout(): void {
  const { w, h } = viewport();
  document.body.classList.toggle('portrait', h >= w);
  document.body.classList.toggle('landscape', h < w);
  const { zoom, height } = fit();
  scene.resize(height, zoom);
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

// Sound comes on day 2; the button and M remember the choice already.
let soundOn = true;
try {
  soundOn = localStorage.getItem(SOUND_KEY) !== 'off';
} catch {
  // Storage can be blocked: sound stays on.
}
hud.sound(soundOn);
function toggleSound(): void {
  soundOn = !soundOn;
  hud.sound(soundOn);
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
// A click, not a pointerdown: on phones only the end of a tap may start sound, later.
document.getElementById('overlay')!.addEventListener('click', () => {
  if (!run.started || run.game.over) run.begin();
  else if (run.pausedByUser) run.togglePause();
});

intro();
document.getElementById('loading')?.remove();
document.body.classList.add('ready');
layout();
scene.start();

// For checking the game from the browser console while developing.
if (import.meta.env.DEV) Object.assign(window, { kickflip: run, scene, swipe });
