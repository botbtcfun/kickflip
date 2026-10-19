# Kickflip

Flick it, flip it, land it on its wheels. A pixel-art game of one swipe:
something sits on the street, you flick it up, and it kickflips. Flick with
the right strength and it lands on its wheels, or its feet, and the next one
rolls in. Too soft or too hard and it lands on its side or its roof, and a
life goes.

There are 21 things to flip, all of them Bitcoin things, and most were
never meant to be flipped: a roadster with thrusters under its floor, the
bitcoin pizza, a hardware wallet, the orange pill, a Bitcoin ATM, a HODL
sign, a full node, a bull, cold storage, an ASIC miner, a whale, a laser
cat. Each run starts with the same six, then the day's draw brings the rest,
everyday things first, then the heavy ones, then the odd ones. The 21st is
always the last bitcoin, as Bitcoin stops at 21 million. A run that gets to
21 meets every one once.

[Play it](https://kickflip.botbtc.fun), or
[watch 20 seconds of it](https://kickflip.botbtc.fun/clip.mp4). To share it on X, post
[kickflip.botbtc.fun/x](https://kickflip.botbtc.fun/x): its card is a player,
which X may show as the game itself, playable in the post.

## Play

| | |
|---|---|
| Phone | Hold anywhere and let go: the longer, the more it spins. A bar shows how far it's charged. Or swipe up: the faster, the more |
| Mouse | Hold the button and let go, or drag up and let go |
| Keyboard | Hold ↑ or Space and let go |
| P or Esc | Pause |
| M | Sound on or off |

- **The window.** A flip lands clean within some degrees of a whole turn.
  The first objects forgive a flick a fifth off; every object after that
  forgives a little less. After each landing a meter shows where the flick
  fell: PERFECT in the bright middle, CLEAN in the green.
- **Weight.** Light things spin easily and are easy to overdo; heavy ones
  need a hard flick. The card under each object says which it is.
- **Quirks.** The roadster's thrusters land anything, and the laser cat
  always lands on its feet. The whitepaper, folded into a plane, and the
  paper wallet need two turns. The lightning bolt and the green candle are
  narrow, and the whale is slippery: they forgive less.
- **Blocks.** Every landing mines a block, and the chain grows across the
  sky behind the street: green for clean, teal for PERFECT, gold for a
  trick, with a mark at each halving. The newest block shows its hash, with
  more zeros in front the closer the flick came, as with proof of work, and
  ten for a dead-on PERFECT. A miss orphans the block, which falls off the
  chain. The 21st object is a coin, the last bitcoin, flipped like one: land
  it heads up and the supply is capped.
- **Score, in sats.** Each block pays its subsidy, 1,000 sats at first,
  halving every six blocks as Bitcoin's does. PERFECTs and tricks pay fees,
  which grow with each object and never halve, so late in a run fees are
  most of the pay. All of it is multiplied by your chain of clean landings,
  up to ×8.
- **Tricks.** Two whole turns land too, and so do three: a double or a
  triple kickflip pays a fee for each extra turn. Flicking as hard as you
  can never lands anything.
- **Lives.** Three to start. Two PERFECTs in a row earn one more, a double
  earns one and a triple two, up to five. Earned hearts show in gold.

## Run it

```bash
pnpm install
pnpm dev        # http://localhost:5174
pnpm test       # the simulation's tests
pnpm build      # the static site in dist/, and the whole game in one file
```

## How it's made

- `src/sim`: the game itself, in plain TypeScript with no browser in it. It
  runs on a fixed 60 Hz tick with integer arithmetic and a seeded generator,
  so the same day and the same flicks give the same run on any device. A run
  is its input log: the ticks that had a flick, and how hard.
- `src/render`: drawing on a plain canvas, with no game engine. Each object
  is three faces, side, roof and underside, painted pixel by pixel in code;
  there are no image files. Mid-flip, each column along the object is drawn
  as a stack of slabs, each as wide as the object is at that height, turned
  and squashed, so a cabin turns narrower than its car and a head turns on
  its body.
- `src/audio`: the sounds, synthesised in the browser with Web Audio as they
  play: a whoosh for the flick, a tick each quarter turn, a chord on landing
  that climbs with the streak, a bell for PERFECT. There are no audio files.
- `src/ui`: the strip, the card, the verdicts and the screens.
- `worker`: the Cloudflare Worker serving the game.

The build also packs the game into one HTML file, `dist/kickflip.html`, with
its script, styles and fonts inline, and the same as a `data:` URL in
`dist/data-url.txt`, which plays pasted into an address bar.

## Licence

MIT, see [LICENSE](LICENSE). The fonts are Press Start 2P and VT323 (SIL Open
Font License), through [Fontsource](https://fontsource.org).
