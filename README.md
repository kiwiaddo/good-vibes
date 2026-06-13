# Good Vibes Arcade 🕹️

A tiny browser arcade with an **'80s Game Boy** look — crisp 4-shade DMG
palette, chunky pixel font, and 8-bit blips. Built to play great on a phone,
no install and no build step (just static HTML + Canvas).

## Games

| Game | Status |
| --- | --- |
| 🛢️ **Donkey Kong** — climb the girders, leap the barrels, rescue the princess | Playable |
| ☂️ **Lemmings** — guide the little fellows to the exit with 8 classic skills | Playable |
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

## Deployment (GitHub Pages)

A workflow at `.github/workflows/deploy-pages.yml` publishes the repo root to
GitHub Pages on every push to `main` or the dev branch.

**One-time setup:** in the repo, go to **Settings → Pages → Build and
deployment → Source** and select **GitHub Actions**. After the next push the
workflow run prints the live URL (typically
`https://<owner>.github.io/<repo>/`).
