import type { Landing } from '../sim/flip';
import type { Game } from '../sim/game';
import { QUIRK_NAMES } from '../sim/objects';
import { LIVES, MAX_STREAK } from '../sim/rules';

export const isTouch = () => document.body.classList.contains('touch');

const HEART = '<svg viewBox="0 0 7 6" aria-hidden="true"><path d="M1 0h2v1h1V0h2v1h1v2H6v1H5v1H4v1H3V5H2V4H1V3H0V1h1z"/></svg>';
const byId = (id: string) => document.getElementById(id)!;
export const points = (n: number) => n.toLocaleString('en-US');
/** What a flip of so many turns is called. */
const TRICKS: Record<number, string> = { 2: 'DOUBLE', 3: 'TRIPLE', 4: 'QUADRUPLE', 5: 'QUINTUPLE' };

/**
 * The page around the canvas: the strip with score, streak and lives, the
 * card naming the object up, the verdict after each landing, and the
 * overlay for the title, pause and game over screens.
 */
export class Hud {
  private readonly score = byId('score');
  private readonly streak = byId('streak');
  private readonly lives = byId('lives');
  private readonly name = byId('card-name');
  private readonly meta = byId('card-meta');
  private readonly verdictBox = byId('verdict');
  private readonly overlayBox = byId('overlay');
  private readonly soundButton = byId('sound');
  /** What each element shows, so a frame only touches what changed. */
  private readonly shown = new Map<HTMLElement, string>();

  update(game: Game): void {
    this.set(this.score, points(game.score));
    this.set(this.streak, game.streak >= 2 ? `×${Math.min(game.streak, MAX_STREAK)}` : '');
    // Three hearts; once they're gone, a gold one for the bonus life.
    const hearts = game.bonusUsed
      ? [...Array.from({ length: LIVES }, () => 'lost'), game.lives > 0 ? 'bonus' : 'lost']
      : Array.from({ length: LIVES }, (_, i) => (i < game.lives ? 'on' : 'lost'));
    this.set(this.lives, hearts.map((c) => `<span class="${c}">${HEART}</span>`).join(''));
    this.lives.setAttribute('aria-label', game.bonusUsed ? (game.lives > 0 ? 'bonus life' : 'no lives') : `${game.lives} lives`);
    const t = game.thing;
    this.set(this.name, t.name);
    const meta = [`NO. ${game.level}`, t.weight.toUpperCase()];
    if (t.quirk) meta.push(QUIRK_NAMES[t.quirk]);
    if (t.turns > 1) meta.push('DOUBLE');
    this.set(this.meta, meta.join(' · '));
  }

  /** The verdict, popping up `top` CSS pixels from the top of the stage. */
  verdict(l: Landing, top: number, note = ''): void {
    const v = this.verdictBox;
    v.className = 'verdict';
    // Restarts the animation for a verdict like the last one.
    void v.offsetWidth;
    v.style.top = `${Math.round(top)}px`;
    const sub = l.clean ? `${l.verdict === 'perfect' && l.extra ? 'PERFECT ' : ''}+${points(l.points)}${l.extra ? ` ×${1 + l.extra}` : ''}` : '−1 LIFE';
    const title = l.extra ? `${TRICKS[l.turns] ?? `${l.turns}×`} KICKFLIP!` : l.verdict.toUpperCase();
    v.innerHTML = `${title}<small>${sub}${note ? `<br>${note}` : ''}</small>`;
    v.classList.add('show', l.extra ? 'trick' : l.verdict);
  }

  clearVerdict(): void {
    this.verdictBox.className = 'verdict';
  }

  overlay(html: string | null): void {
    this.overlayBox.hidden = !html;
    if (html) this.overlayBox.innerHTML = html;
  }

  sound(on: boolean): void {
    this.soundButton.setAttribute('aria-pressed', String(on));
  }

  private set(el: HTMLElement, html: string): void {
    if (this.shown.get(el) === html) return;
    el.innerHTML = html;
    this.shown.set(el, html);
  }
}
