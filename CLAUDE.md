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
| `lemmings.html` | The **Lemmings game**, fully self-contained. Pixel-destructible terrain + the 8 classic skills, tuned for touch. |
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

## lemmings.html architecture

One IIFE, mirrors the donkey-kong conventions (palette keys, `col()`, `FONT`/
`text()`, `STEP=1000/60` accumulator, lazy WebAudio, localStorage `lem_pal3` /
`lem_mute`). Internal canvas `256×176` = a 16px in-canvas HUD strip over a
`256×160` viewport onto a wider level (`camX` horizontal scroll only). Default
palette is `color`. Key pieces:

- **Terrain** is a `Uint8Array(lw*LH)` of values `0 empty / 1 dirt / 2 dirt-
  shade / 3 brick / 4 steel`, rendered via an **offscreen canvas + resident
  `ImageData` + `Uint32Array` view + `TER_LUT`** (value→packed RGBA, rebuilt on
  palette toggle). Full repaints (`repaintTerrain`) are a single LUT loop;
  in-play edits go through `setTer()` which unions a dirty rect flushed once per
  frame. Mutators: `digRect`, `digDisc`, `layBrick`. Levels are authored
  compactly via `paint:[...]` op lists (`box`/`box0`/`steel`/`rampR`/`rampL`/
  `blob`) run by `buildTerrain()`, plus a dither texture pass. **New terrain/
  lemming color keys must be in BOTH `KEY_TONE` and `GBC`** (magenta fallback).
- **Lemmings** are `{x (foot, center-bottom), y, dir, state, timer, fallDist,
  climber, floater, bombT, bricks}`. Logic ticks every `LEM_TICK` frames.
  States: walker / faller / floater / climber / hoister / digger / basher /
  miner / builder / blocker / splatter / exiter, plus an orthogonal `bombT`
  countdown. Collision is **foot-pixel** tests against the terrain bitmap
  (`solid()`/`steelAt()`). Subtleties baked in (and regression-tested):
  basher's continuation scan must reach *past* the slice it just cleared, miner
  becomes a faller when it breaks into open air, the hatch must sit within
  `SPLAT_H` of its landing (else lemmings splat on spawn), and a builder spans
  ~24px so gaps are kept narrow.
- **Skills:** `canAssign()`/`assignSkill()`; `pickLemming()` does nearest-within-
  `TAP_R` selection preferring assignable candidates. Toolbar is HTML buttons
  (arming, counts, RR ±, pause, ffwd, double-tap nuke).
- **Flow:** `title → intro → play → result → … → win`; tap advances non-play
  screens. Touch model: drag-to-pan vs tap-to-assign disambiguated by a
  movement slop + time ceiling; assignment is allowed while paused.

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

For `lemmings.html` the same harness applies, with extras worth keeping in mind:
the IIFE exposes a `window.__lemHook({...})` test handle (state, `lems`, `ter`,
`loadLevel`, `assignSkill`, `pickLemming`, frame stepping) so a headless run can
place lemmings, assign each skill and assert terrain mutations / survival, and
**script a full solve of every level** to prove they're winnable with their skill
loadout. Stub `canvas.getBoundingClientRect()` (e.g. 256×176) so CSS px map 1:1
to world px; keep the magenta-`fillStyle` guard. When editing a skill or a level,
re-run the per-skill scenarios *and* the all-levels solver — terrain geometry is
easy to make subtly unsolvable.
