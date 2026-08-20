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
| `bus.html` | **ONE STREET** — the bus-driving gate test from `docs/bus-game-research.md` §15. 320×192, pixel-art. |
| `bus-bendy.html`, `bus-chase.html`, `bus-shift.html` | Design variants of it: articulated bus / rotating camera / clock + stops. |
| `bus-4k.html` | **ONE STREET HD** — the actual game. RIGID's driving model, a full-screen renderer, and two complete routes with stops, a manifest, a clock and a comfort multiplier. |
| `docs/bus-game-research.md` | Research behind the bus game. |
| `tools/` | Headless harness, physics-parity check, screenshot tool. |
| `.github/workflows/deploy-pages.yml` | Deploys the repo root to GitHub Pages. |
| `README.md` | Player-facing readme (controls, deploy notes). |

There is no `src/`, no package.json and no bundler — each game is still one
self-contained HTML file. `tools/` holds plain Node scripts with no dependencies;
nothing in it ships to Pages.

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

## Where the bus game is up to

There are **five** bus pages live; that is deliberate but temporary.

- `bus.html` (RIGID) is the baseline gate test — free driving, no score, no
  clock. It still exists because it is the reference the physics are checked
  against, not because anyone should play it.
- `bus-bendy` / `bus-chase` / `bus-shift` each isolate one design axis so they
  can be compared against RIGID.
- `bus-4k.html` is **the game**. It started as RIGID's simulation with a real
  renderer; it now carries the shift layer on top of it (two routes, stops,
  passengers, schedule, comfort multiplier). It is still RIGID's driving
  model, so it does not settle the variant question.
- **Open decision, still owned by the user:** which of the four *designs*
  survives — rigid vs articulated vs rotating camera. Once they call it,
  strip the others plus their nav links and their variant-specific harness
  sections. Do not decide this unilaterally.
- Recorded recommendation, not a verdict: keep RIGID, treat BENDY as
  unlockable content, drop CHASE (rotating the camera caps look-ahead at 9 m
  where world-fixed reaches 20 m), and playtest SHIFT against RIGID. Note that
  SHIFT's clock-and-stops idea has since been built properly in `bus-4k`, so
  what is left to compare there is only the variant's own tuning.

Section 16 of `docs/bus-game-research.md` holds the remaining open questions;
section 17 records which of them the HD build has now answered in code.

## Conventions

- Keep everything **dependency-free and build-free**; a game is one HTML file.
- Match the existing terse, single-IIFE style. The Game Boy titles and the
  four pixel-art bus pages use integer pixel coordinates; `bus-4k.html` is the
  one exception and draws real geometry in world metres.
- Preserve the color-key discipline so all three palettes keep working.
- **Nothing but the games belongs in the repo root.** Pages publishes the whole
  root, so a scratch file written there ships to the live site. Two have
  escaped that way already. Write scratch output to a temp dir, never `.`.
- `bus-4k.html` and `bus.html` must stay the same **driving model**. After any
  edit near the simulation block, run `node tools/parity-bus.js` and require
  exactly zero drift. The game layer is allowed to exist, but only outside
  `update()` — see below.

## bus.html / bus-4k.html architecture

`bus.html` is one IIFE: a kinematic bicycle model driven from the **rear axle**
with real overhangs (`FRONT_OH`/`REAR_OH`), so the tail sweeps outward opposite
the turn — that sweep is the whole game. A polyline street with a varying
half-width, SAT/OBB collision with minimum-translation resolution, ray-march
clearance probes feeding the squeeze state, and an oncoming car that telegraphs,
yields, backs into a bay, or waits for the horn.

`bus-4k.html` **copies that simulation code verbatim** and replaces the
renderer, so the two cannot drift. What it does *not* copy any more is the
world **data**: the street, the parked cars and the bins were lifted out of the
block into `LEVELS[]` and are refilled by `loadLevel()`. Level 1 is the
gate-test street node for node, which is what keeps the parity claim true.

- `tools/parity-bus.js` drives both files with an identical scripted input
  stream and an identical seeded `Math.random`, then compares 17 fields of
  driving state every frame. The requirement is **exact** equality, not
  approximate. Run it after any edit near the sim block.
- Parity survives the game layer because of two rules. **One:** nothing in the
  game layer runs inside `update()`; `gameTick()` is called straight after it
  from the same fixed-step loop. **Two:** level loading and the game layer only
  ever use their own seeded generators, never `Math.random`, so they cannot
  shift the shared stream the oncoming car draws its personality from. The one
  place the game writes back into the driving model is `payloadStep()`, and
  with an empty bus that correction is exactly zero.
- All render-only state (particles, skid marks, eased zoom) lives in
  `render(rdt)` and is driven by the frame delta, never by `update()`. Keep it
  that way — the harness asserts that 400 `render()` calls move nothing.
- Resolution is viewport-driven: `VW/VH` are CSS pixels, `PPM` is chosen so
  every screen sees the same *world* framing (`VIEW_X_M` × `VIEW_Y_M`) and only
  the resolution changes. On a portrait phone (`VH > VW*1.12`) the world is
  turned a fixed quarter turn (`rot90`) so the street runs down the long axis;
  `W/H` are the **logical** extents and swap, the HUD stays upright in `VW/VH`.
- Buildings are fake-3D: the roof is the footprint translated away from the
  camera, and the walls left exposed are the ones facing **toward** it.
  `buildBlocks()` pushes each block out until no point of its inner face is
  inside the corridor — the harness sweeps the whole street for intrusions.

## bus-4k.html — the shift layer

Everything under the `GAME` banner, between the simulation and the renderer.
It follows the research doc closely; the section numbers in the comments refer
to `docs/bus-game-research.md`.

- **`LEVELS[]`** is the whole of the authored content: `nodes` (centreline +
  half-widths), `parked`, `bins`, `stops` and `par`. `loadLevel(i)` refills
  `NODES`, then re-runs `buildPath` / `buildNormals` / `buildProps` /
  `buildBlocks`. Adding a route is adding an entry — but run the harness after,
  because it sweeps the new geometry for buildings in the road, checks the bus
  fits the whole way down, and **drives the route end to end** to prove it can
  be finished.
- **`G`** is the single game-state object: `state` (`title`/`brief`/`play`/
  `result`/`shift`), clock, score, multiplier, comfort, riders, the stop list
  and the front-end hit rectangles.
- **Stops and doors.** `dockAt(st)` scores the pose of the front door against
  the kerb — distance along, gap to the kerb (weighted heaviest), and skew.
  The *gate* is generous (`DOCK_GAP`) and the *quality* is steep (`DOCK_REF`),
  so being able to stop at all is never the wall; how well you stopped is the
  score. Boarding time runs 0.9 s to 3.2 s off that quality.
- **Mass** is `payloadStep()`: a post-`update()` correction that gives back a
  slice of the accel/brake/drag deltas in proportion to the load. Written this
  way so the shared simulation block never has to change.
- **Comfort** is a multiplier, never a health bar (the research is emphatic:
  the moment it can end a run you have built a bus simulator). `HOLD ON`
  zeroes the penalty for 2.2 s and costs 3 s of clock.
- **Damage** costs score per contact but charges the clock at most once every
  0.8 s, so grinding a wall is expensive rather than instantly fatal.
- New colour keys added here: `z` `S` (waiting passengers), `W` (stop sign),
  `E` `Y` (the skip). As always they must be in **both** `KEY_TONE` and `GBC`.

## Verifying changes

`node tools/test-bus.js <file>` runs the shared harness (sections 1–9) plus a
variant section chosen from `consts.VARIANT`. For `bus-4k` that adds sections
10–17, which cover the HD renderer *and* the shift: the geometry audit per
route, a scripted driver that completes both routes, the mass/comfort/doors/
damage rules, the front-end state machine, and a magenta sweep over every
screen in every palette. It stubs document/canvas/
localStorage/rAF and drives the loop through `window.__busHook`. A `fillStyle`
/`strokeStyle` setter flags `#ff00ff`, catching any colour key missing from
`KEY_TONE`/`GBC`; `bus-4k` also asserts the two maps are exact mirrors.

**A real browser IS available** in Claude Code on the web: Chromium lives at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. Use
`node tools/shot-bus.js <game.html> <out.png> 1280x720 s=126 q=1.4 v=6.5` to
screenshot any point on the street, then read the PNG. For `bus-4k` it also
takes `lvl`, `state`, `stop`, `riders`, `board` and `win`, so any screen of the
shift can be framed. To inspect fine detail, copy the file to a temp dir with
`VIEW_X_M`/`VIEW_Y_M` reduced — the framing is world-fixed, so that is the only
way to magnify. Two gotchas: headless
clamps the window to a **500 px minimum width** (so a 390 px phone must be
approximated by a matching aspect like 500×1082), and `--window-size` sets the
*window*, not the viewport — 1280×720 yields a 1280×633 viewport, which puts a
black band at the bottom of the shot that is not a bug.

For the Game Boy titles, where no such page probe exists, smoke-test
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
