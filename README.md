# Good Vibes Arcade 🕹️

A tiny browser arcade with an **'80s Game Boy** look — crisp 4-shade DMG
palette, chunky pixel font, and 8-bit blips. Built to play great on a phone,
no install and no build step (just static HTML + Canvas).

## Games

| Game | Status |
| --- | --- |
| 🛢️ **Donkey Kong** — climb the girders, leap the barrels, rescue the princess | Playable |
| ☂️ **Lemmings** — guide the little fellows to the exit with 8 classic skills | Playable |
| 🚌 **One Street** — thread a 12 m bus down a street that does not want you there | Prototype |
| 🚌 **One Street HD** — two routes, a manifest, a schedule and a comfort multiplier | Playable |
| ❓ Coming soon | — |

The landing page (`index.html`) is a hub of game cards; each game lives on its
own page (e.g. `donkey-kong.html`). Adding a new game is just another card +
its own page.

## Play

- **Live:** open the GitHub Pages URL on your phone (see *Deployment* below).
- **Local:** open `index.html` in any modern browser, or serve the folder:
  ```sh
  python3 -m http.server 8000   # then visit http://localhost:8000
  ```

## Donkey Kong — controls

| Action | Touch | Keyboard |
| --- | --- | --- |
| Move / climb | D-pad (←→ walk, ↑↓ ladders) | Arrow keys / WASD |
| Jump | **JUMP** button | Space |
| Start / continue | JUMP / tap | Space |

- **PALETTE** toggles classic green ↔ grayscale Game Boy.
- **SOUND** mutes/unmutes the blips.
- Jump *over* a barrel for bonus points; reach the top before the bonus
  timer runs out. Three handcrafted levels with rising difficulty — the
  third adds a roaming flame.

## Lemmings — controls

A faithful, phone-friendly take on the classic. Lemmings pour from the hatch,
walk, turn at walls, and fall off ledges — assign skills to steer enough of
them to the exit before the timer runs out.

| Action | Touch | Keyboard |
| --- | --- | --- |
| Arm a skill | Tap a skill button | `1`–`8` |
| Assign skill | Tap a lemming (snaps to the nearest) | — |
| Scroll the level | Drag the field, or **◀ ▶ PAN** | Arrow keys / A,D |
| Release rate | **RATE −/+** | `-` / `+` |
| Pause | **PAUSE** | Space |
| Fast-forward | **FFWD** | `F` |
| Nuke (blow them all up) | **NUKE** twice | — |
| Start / continue | Tap | Space |

- The 8 skills: **Climber, Floater, Bomber, Blocker, Builder, Basher, Miner,
  Digger** — each level gives a limited supply.
- Terrain is fully destructible: diggers/bashers/miners tunnel through it,
  builders lay bridges, bombers (and the nuke) blast craters. **Steel** can't
  be dug.
- You can assign skills **while paused** — handy on a small screen.
- **PALETTE** cycles full colour ↔ green ↔ grayscale Game Boy; **SOUND** mutes.
- Eight original levels introduce one skill at a time, then combine them.

## One Street — controls

`bus.html` is the original 320×192 pixel-art gate test: free driving, no score,
no clock. **`bus-4k.html` is the game** — the same driving model, a full-screen
renderer that scales from a phone to a 4K monitor (and turns the world a
quarter turn in portrait so the street runs down the long axis), and two
complete routes to drive. `bus-bendy`, `bus-chase` and `bus-shift` are design
variants — an 18 m articulated bus, a rotating camera, and a shift clock.

| Action | Keyboard | Touch (prototypes) |
| --- | --- | --- |
| Throttle / brake &amp; reverse | ↑ ↓ or W S | ▲ / ▼ |
| Steer | ← → or A D | ◀ / ▶ |
| Horn (makes a stubborn car move) | Space | HORN |
| Hold on! (HD) | H | see below |
| Continue a menu (HD) | Space / Enter | tap anywhere |
| Restart the route | R | RESET, in the menu |
| Doors (`bus-shift` only) | Shift or E | DOORS |

**On a phone, One Street HD drives by gesture** — there is no D-pad, and the
only buttons on the glass are the horn and a menu.

| Action | Gesture |
| --- | --- |
| Steer | Drag anywhere on the **left half**. The wheel is relative to wherever your thumb landed, and it is analogue — half a drag is half a lock, and it holds |
| Speed | Drag on the **right half**: down brakes (and reverses once you are stopped), up is full throttle |
| Cruise | Let go. The bus holds about 32 km/h on its own, so your right thumb is free |
| Horn | The **HORN** button |
| Hold on! | **Two-finger tap** — both thumbs down and straight back up |

Steering is vehicle-relative: dragging left turns the *wheel* left, which is
what it does in portrait too, where the world is turned a quarter turn. The
first few runs put a fading line on screen to say so. **CONTROLS** in the menu
switches back to the original D-pad if you prefer it.

The trail ahead of the bus is the **swept path** — where the tail will end up
if you hold the current steering (dotted in `bus.html`, a ribbon in HD). Tail
swing is the whole game, so it is shown rather than hidden. HD keeps palette,
zoom, swept path, sound and restart in the **☰ MENU** sheet (which pauses while
it is open); **F** is fullscreen on desktop.

### Driving a shift (One Street HD)

Two routes. **MILL LANE** runs half a kilometre — an easy kerb to learn on, a
double-parked van with 8 cm to spare, a dug-up carriageway you have to squeeze
past, and a square to breathe in. **MARKET HILL** is 730 m, has a skip in the
first pinch and again on a compound corner, a one-way you are going the wrong
way down, and finishes on a 133° hairpin. Pick one on the title card and tap
again to pull away.

The stops are a good 130–190 m apart, so each leg is a proper run at something
rather than a dock followed immediately by another dock.

- **Dock at each stop.** Get the front door beside the kerb, stop, and the
  doors open themselves. The closer and straighter you park, the faster
  everyone boards — a perfect dock is under 1.5 seconds, a scruffy one is
  three. Sail past a stop and you have to reverse back to it.
- **Every fare buys time.** The clock is the only thing that ends a run.
  Serving a stop adds to it; crunching into something takes 2 s off and
  resets your multiplier. Nothing else can end a shift — crashes are
  expensive, never fatal.
- **A full bus is a different vehicle.** Sixteen passengers add about half
  again to your braking distance. A good pickup run makes the next corner
  harder, which is the point.
- **Comfort is a multiplier, not a health bar.** Standing passengers get
  thrown by hard braking, hard cornering and kerbs. Press **HOLD ON** for two
  seconds of penalty-free violence — it costs 3 s of clock, and it is worth
  it going into a pinch.
- Squeezing through a gap cleanly pays out, and every second clean thing you
  do steps the multiplier up to ×5.

## Deployment (GitHub Pages)

A workflow at `.github/workflows/deploy-pages.yml` publishes the repo root to
GitHub Pages on every push to `main` or the dev branch.

**One-time setup:** in the repo, go to **Settings → Pages → Build and
deployment → Source** and select **GitHub Actions**. After the next push the
workflow run prints the live URL (typically
`https://<owner>.github.io/<repo>/`).
