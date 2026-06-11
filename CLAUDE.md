# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

**Good Vibes Arcade** — a static, no-build browser arcade with an '80s Game Boy
look. Pure HTML + Canvas + vanilla JS, no dependencies, no bundler. Designed to
play well on phones (touch controls, responsive, scroll/zoom suppressed).

## Layout

| Path | Purpose |
| --- | --- |
| `index.html` | Arcade **hub / landing page**. Grid of game cards (pixel-art icon drawn on a tiny `<canvas>` + name) linking to each game. Add a future game = add one card + its own page. |
| `donkey-kong.html` | The **Donkey Kong game**, fully self-contained (inline CSS + JS). |
| `.github/workflows/deploy-pages.yml` | Deploys the repo root to GitHub Pages. |
| `README.md` | Player-facing readme (controls, deploy notes). |

There is no `src/`, no package.json, no test runner. Each game is one HTML file.

## Running locally

Just open the file, or serve the folder:
```sh
python3 -m http.server 8000   # http://localhost:8000
```

## Deployment (important gotcha)

- GitHub Pages source is **GitHub Actions**; the workflow publishes the repo
  root on push to `main` (and the dev branch).
- **Pages only deploys from the default branch (`main`)** — the `github-pages`
  environment rejects other branches (job fails in ~1s with no runner). So a
  change isn't live until it's merged to `main`.
- PRs here have been **squash-merged**, which leaves the feature branch with no
  shared ancestor with `main`. The next PR then shows phantom merge conflicts.
  Fix: locally `git merge -s ours origin/main` on the branch (the branch already
  holds the desired tree), push, then merge.
- Live URL: `https://kiwiaddo.github.io/good-vibes/`.

## donkey-kong.html architecture

All inside one IIFE. Key pieces, in order:

- **Resolution:** internal canvas is `320×288` (`S=2` × the 160×144 Game Boy
  grid), CSS-scaled with `image-rendering: pixelated`. `W=160*S`, `H=144*S`.
- **Palettes / color keys:** sprites are authored with single-char **color
  keys** (e.g. `n` fur, `s` skin, `b` blue, `r` red, `a` ladder). `col(key)`
  resolves a key to a hex per the active palette:
  - `green` / `gray` (DMG) collapse keys to a 4-shade ramp via `KEY_TONE`.
  - `color` (Game Boy Color) maps keys to real hues via `GBC`.
  - Toggle cycles `PAL_ORDER = ["green","gray","color"]`, persisted in
    `localStorage["dk_pal3"]`. **Any new color key must be added to BOTH
    `KEY_TONE` and `GBC`** or it renders magenta `#ff00ff` (the fallback).
- **Draw helpers:** `clearbg()`, `rect(x,y,w,h,key)`, `text()` (3×5 bitmap
  `FONT`), and procedural sprite fns: `drawJumpman`, `drawBarrel`, `drawFlame`,
  `drawKong`, `drawPrincess`, `drawGirder`, `drawLadder`, `drawDrum`. Sprites are
  drawn as composed `rect()` calls (no image assets) in world pixels.
- **Levels:** `LEVELS[]` authored in the **base 160×144 grid**; `loadLevel()`
  multiplies all coordinates and barrel speed by `S`. Each level has
  `platforms`, `ladders`, `kong`, `princess`, `start`, and `diff`
  (`interval`, `speed`, `ladderChance`, `flames`). Platforms are full segments
  with alternating gaps so barrels zig-zag down.
- **Physics (world units):** `GRAV, WALK, JUMP, CLIMB, MAXFALL`. One-way
  platform landing via `platformLanding()`; ladder grabbing via `ladderAt()`.
- **State machine:** `title → play → clear → … → win`, plus `dead`/`over`.
  `advanceState()` is driven by the jump button on non-play screens.
- **Loop:** fixed-timestep accumulator (`STEP=1000/60`) — `update()` then
  `render()` each frame.
- **Input:** on-screen D-pad + JUMP (`pointer` events) and keyboard
  (arrows/WASD/Space). `input.jumpEdge` is the one-shot jump latch.
- **Audio:** tiny WebAudio square-wave blips, lazily initialised on first tap
  (mobile autoplay rule); mute persisted in `localStorage["dk_mute"]`.

## Conventions

- Keep everything **dependency-free and build-free**; a game is one HTML file.
- Match the existing terse, single-IIFE style; integer pixel coordinates.
- Preserve the color-key discipline so all three palettes keep working.

## Verifying changes without a browser

No browser/canvas/puppeteer is available in this environment. To smoke-test
`donkey-kong.html`, extract the inline `<script>` and run it under Node with
stubbed `document`/`canvas`/`localStorage`/`requestAnimationFrame`, driving a few
thousand frames and asserting no exceptions. A `fillStyle` setter that flags
`#ff00ff` catches any color key missing from `KEY_TONE`/`GBC`. (This pattern was
used to validate the resolution/palette work — replicate it for sprite or
palette changes.) You can also emit an **SVG** by capturing the `fillRect` calls
of one rendered frame to preview the look.
