# Bus Game — Design Research

Research notes for a top-down, 2D(ish), GTA-style **bus driving game** for the web.
Sources are listed at the end; every claim that came from somewhere is linked there.

---

## 0. The thesis

Every other driving game hands you the right tool for the job. **A bus is the wrong
tool, and the city is not sorry.**

That single idea does double duty: it is the *challenge* (a 12-metre vehicle in an
8-metre street) and it is the *joke* (a 12-metre vehicle in an 8-metre street). Games
that are funny and games that are tense usually need separate budgets. Here they're the
same system, which is why this concept is stronger than "GTA but a bus."

Everything below is in service of protecting that idea from the four things that
normally kill it: a camera you can't plan with, physics that feel buggy rather than
hard, a comfort mechanic that turns the game into a chore, and randomness that reads as
the game cheating.

---

## 1. Why "wrong tool" beats "power fantasy"

The useful frame comes from work on **mechanical comedy** — comedy where "players are
performing the joke, rather than reading or hearing it." It sorts comedy games by *who
authors the laugh*:

| | Who writes the joke | Examples |
| --- | --- | --- |
| Game-authored | Designer scripts it, player executes | *Portal*, *Surgeon Simulator* |
| **Shared** | Designer builds the setup, player supplies the performance | *The Sims*, *Untitled Goose Game* |
| Player-authored | Game is a stage | *GTA Online* |

**A bus game belongs in the middle.** You author the setup (a stupidly narrow street, a
van parked across two bays, a hill with a hairpin at the top). The player supplies the
punchline by threading it — or by not. This is the highest-value zone: authored content
gets replayed because the *performance* differs each time.

Two warnings from the same research, both load-bearing:

- **"Executional complexity" produces a comedy of errors** (*QWOP*): when intention and
  outcome mismatch, it's funny. That's your fuel.
- **But too much unpredictability destroys agency**, and physics-based systems "risk
  feeling buggy rather than funny if inconsistent."

Which gives the single most important rule in this document:

> ### The vehicle is honest. The world is absurd.
> Never randomise the handling. The bus must do *exactly* what its physics say, every
> time. The player misjudged — the game didn't glitch. Spend the entire comedy budget on
> the city: the parked cars, the pedestrians, the events. That is the line between
> "hilarious" and "broken."

---

## 2. The bus itself — the one system that matters

### 2.1 Tail swing is the whole game

Start from the standard **bicycle model** — cheap, stable, and explicitly "exactly
appropriate for parking games":

```
frontWheel = pos + (wheelBase/2) * [cos(h),           sin(h)          ]
backWheel  = pos - (wheelBase/2) * [cos(h),           sin(h)          ]

backWheel  += speed * dt *        [cos(h),           sin(h)          ]
frontWheel += speed * dt *        [cos(h + steer),   sin(h + steer)  ]

pos = (frontWheel + backWheel) / 2
h   = atan2(frontWheel.y - backWheel.y, frontWheel.x - backWheel.x)
```

Longer wheelbase → gentler turning radius; shorter → tighter turns at the same steer
angle. So far, so ordinary.

**The bus-specific twist is the overhang.** On a real bus the rear axle is inset well
forward of the tail. When the front swings into a turn, the back corners of the body
sweep *outward, opposite the direction of the turn*. Model the bus as a rigid rectangle
whose collision box extends past both axles:

| Property | Suggested start value | Why |
| --- | --- | --- |
| Body length | 12.0 m | Standard rigid single-decker |
| Body width | 2.55 m | Sets your street-width unit |
| Wheelbase | 6.0 m | Big turning circle — that's the point |
| Front overhang | 2.5 m | Front corner scythes wide too |
| **Rear overhang** | **3.5 m** | **The signature mechanic** |
| Kerb-to-kerb circle | ~22 m (11 m radius) | Forces multi-point turns in tight streets |

The moment this buys you: *you clear the corner perfectly and demolish a fruit stand with
your arse.* Build the game around that moment. It is the thing nobody else's driving
game has.

### 2.2 Make the swept path visible

Tail swing is only fair if it's *knowable*. Draw a faint ghost of the rectangle's swept
path 0.5–1.0 s into the future at the current steer angle. This converts "that felt
unfair" into "I should have seen that" — which is the entire difference between a hard
game and a bad one. Fade it out at higher skill tiers if you want a mastery curve.

### 2.3 Mass, and why it links to the fare loop

Slow to start, slow to stop, and **load-dependent**: braking distance should scale with
passenger count. A full bus is meaningfully a different vehicle from an empty one.

This is a free, elegant coupling — it makes the driving loop and the passenger loop *the
same loop*. A successful pickup run makes the next corner harder. Almost no design work
required; enormous payoff.

### 2.4 Steep winding streets

The "(ish)" in 2D(ish) is your licence. Store a coarse elevation grid and derive:

- **Gravity along heading** — uphill saps speed; downhill you gain it and, on a heavy
  vehicle, brakes fade.
- **Rollback** — stop on a grade and creep backwards. Pure bus comedy, and a genuine
  hazard when you're stopped at a stop on a hill with a queue behind you.
- **Blind crests** — the elevation field limits what the player can plan for. Hide the
  badly parked van just over the brow.
- Read it visually via shadow offset (shadow length ∝ height) and surface shading by
  gradient, so a hill is legible in half a second from directly above.

### 2.5 What *not* to model

Resist making handbrake drifting the core verb. That's *Crazy Taxi*'s game, not a bus's,
and it fights the mass fantasy. If you want a skill ceiling, make it a deliberate
**low-speed tail flick** — a controlled swing to place the back end — rather than a
power slide.

---

## 3. The tension engine: three pressures that disagree

| Pressure | Wants you to be | Source |
| --- | --- | --- |
| The clock | **Fast** | Fares, schedule |
| The geometry | **Precise** | Streets, parked cars, traffic |
| The passengers | **Smooth** | Comfort / standing riders |

Three-way tension is the whole opportunity, and it's genuinely unoccupied:

- *Crazy Taxi* has clock + geometry, and resolves it by **rewarding recklessness** —
  stunts, near-misses and jumps all pay tips.
- Bus simulators have geometry + comfort, and resolve it by **rewarding caution** —
  which critics describe as "relaxing and strangely soothing" but also "deliberately
  repetitive" and boring after a few hours.

Nobody is running all three at once, in conflict. Do that.

**Critical implementation detail:** make comfort a **score multiplier, not a fail
state.** The moment a comfort meter can end your run, you have built a bus simulator and
inherited its boredom problem. As a multiplier, it's a choice the player makes every
corner: *is this shortcut worth spilling somebody's shopping?*

### The "Hold on!" verb

Give the player a button that warns passengers to brace. They grab the rails, and for
~2 seconds you get penalty-free violence. It costs something — a slice of the clock, or
passenger patience. This is the pressure-release valve that keeps the three-way tension
from feeling like a straitjacket, and it's funny every single time.

---

## 4. The fare loop — a *Crazy Taxi* teardown, bus-ified

*Crazy Taxi*'s loop is worth copying almost beat for beat, because it is unusually
well-instrumented. Its components:

1. **Waving character** — draws the eye (pure aesthetics, no mechanics).
2. **Floating icon** above their head, **colour-coded by fare distance** — red short,
   yellow medium, green long. You choose *before* committing.
3. **Pickup circle** on the ground in the matching colour, linking icon to place.
4. On pickup, both vanish — unambiguous "objective acquired."
5. **A direction arrow** over the vehicle, shifting green → red with proximity.
6. Destination card on the HUD for ~5 s: picture, name, live distance in metres.
7. **Fare timer** above the passenger: green → yellow → red.
8. **Tips for stunts** during the ride, with a combo readout.
9. **Drop-off perimeter** in world space.
10. A **dramatic animated payout** counting into the total.

Three lessons generalise:

- **Time is the currency, not lives.** A global clock, extended by each delivery. Crashes
  bounce and spin you rather than ending the run — the collision model is deliberately
  forgiving so the flow never breaks. Steal this exactly: **never hard-fail on a crash.**
- **Let players price the risk before they take it.** Colour-coding fares by length is a
  one-pixel decision surface that creates real strategy.
- **The navigation trick is the hidden gem.** Sega patented it: when you're *far* from
  the destination, the arrow points along the **road route**, not at the destination,
  "because the latter mode may confuse the game player." When you're *close*, it snaps to
  point directly at the destination. Cheap to implement, and it's the difference between
  "in flow" and "lost." In a game about narrow streets, being lost is fatal.

### What changes for a bus

| *Crazy Taxi* | Your bus |
| --- | --- |
| One fare at a time | A **manifest** — several passengers, each with a stop and a patience timer |
| Drop anywhere in a circle | **Stop at the kerb, open the doors** — a two-part skill |
| Passenger is weightless | Passengers are **mass** (see §2.3) |
| Destination is a surprise | You can see the **next 2–3 stops** → real route planning |

New mechanics this unlocks:

- **Doors as a verb.** You must stop, be inside the kerb zone, *and* open the doors.
  Boarding time scales with how well you parked — nose-in at 30° and everyone shuffles.
  This is how "parking a bus" becomes a scored skill instead of a chore. Keep boarding
  under ~1.5 s at best quality; Bus Simulator players specifically complain that
  "passengers need up to two minutes to enter your bus." **Dead time is the enemy.**
- **The overshoot.** Sail past a stop and you must loop the block. Funny, costly, and
  entirely your own fault — the best kind of failure.
- **Shortcut decisions.** Knowing the next three stops makes "do I risk the alley?" a
  genuine choice rather than a coin flip.

---

## 5. Streets as tracks

Racing track-design theory transfers almost intact, even though your vehicle is slow.

### Needle threading (steal this immediately)

*Wangan Midnight Maximum Tune* uses wide corner entries with early clipping points,
followed by exits that are made to *look* narrow through barricade placement. The
geometry provides ample clearance; the player feels masterful anyway. The analysis calls
out its "significant emotional value."

**Perceived width is a separate dial from real width.** For a bus game this is gold:
awnings, bollards, wing mirrors, overhanging signs and bin bags can make a comfortable
gap read as impossible. Tune perception hard, tune reality gently. Players will tell
stories about gaps they never actually came close to failing.

### Measure everything in bus-widths

Give every street a clearance grade and use it as your level-design unit:

| Grade | Clear width | Feel |
| --- | --- | --- |
| A | 2.0+ bus-widths | Comfortable two-way |
| B | ~1.4 | Someone has to yield |
| C | ~1.1 | Mirror-folding, hold your breath |
| D | ~0.95 | Impossible — reverse out or reroute |

Grade D streets are not mistakes. They are the *puzzle*, and they're where the horn and
the multi-point turn earn their keep.

### Corner taxonomy

Simple corners have one clipping point; **compound corners have several and demand
sequential corrections**, with shorter gaps between them being harder. For a bus,
compound corners are the nightmare tier, because you must reposition the *tail* mid-turn
while the nose is already committed. Save them for late districts.

### Sightlines govern anxiety

Restricted views create tension; open views create confidence and let players plan
several moves ahead. Top-down, your sightline *is* your camera plus your building
heights. Use crests, blind corners and tall terraces deliberately, then reward the player
with a "vista" — a plaza, a bridge, the seafront — right after a hard sequence.

### Rhythm

Straightaways are **punctuation between corners, not acceleration zones**. Tight →
release → tight. Difficulty should ratchet gradually rather than spiking, so the player
keeps agency.

### A recurring nemesis

Track design benefits from "recurring motifs, such as a signature jump or challenging
chicane," because mastering them becomes a satisfying puzzle. Pick **one** returning
obstacle — the skip lorry, say — and re-stage it harder in every district. It gives the
city a running gag *and* a difficulty spine at the same time.

### Set-pieces worth building

The hairpin on a hill · the market street · the multi-storey car park ramp · the level
crossing · the roadworks pinch · the one-way street you entered backwards · the
pedestrianised square you are technically not allowed in · the bridge with a weight
limit.

---

## 6. Parked cars as authored jokes

This is the purest expression of the shared-authorship model: you build the setup, the
player performs the punchline.

**A catalogue to build from** — note every one is simultaneously a gag and a geometry
problem:

- The double-parked delivery van, hazards blinking
- The car straddling two bays at 30°
- The car parked *in the bus stop* (so you must board from the middle of the road)
- The removal lorry with its ramp down
- The car that is parked... and then reverses out just as you arrive
- The wedding car with ribbons, abandoned mid-street
- The caravan. Always the caravan.
- A skip. Then two skips. Then a skip with a sofa sticking out of it.

Three rules:

1. **Every joke must read as a geometry problem inside half a second.** If the player
   can't see the gap, it isn't a joke, it's a wall. Legibility first, humour second — the
   humour survives; confusion doesn't.
2. **Nudgeability.** Some obstacles yield to a slow push: wheelie bins, cones, a Smart
   car, a shopping trolley. This is both a pressure-release valve and reliably the
   funniest thing in the game. Be generous with bin-scattering physics.
3. **Escalate.** Comedy needs escalation. District 1 gets one badly parked van. District
   4 gets a whole street of them and a chorus of car alarms.

---

## 7. Traffic that squeezes back

### The standard stack

Game traffic systems typically combine a **kinematic bicycle model** for motion,
**Reynolds path-following** to stay in lane, and the **Intelligent Driver Model (IDM)**
for safe longitudinal spacing and collision avoidance. Layer a simple gap-check for
lateral moves. That's enough.

Use level-of-detail: fully simulate only vehicles within ~2 screens and snap the rest to
a schedule. Systems that "seamlessly swap between different levels of detail as vehicles
come in and out of range of the player" are how this stays cheap.

### The design point: NPCs must *negotiate*

Realistic traffic AI is worthless if the player can't interact with it. For this game
specifically, the interaction *is* the content:

- A car that **reverses into a driveway to let you past** is a small gift.
- A car that **stubbornly won't move** is a puzzle.
- A car that **commits to the gap at the same moment you do** is a disaster.

All three should exist. Real traffic models already capture the seed of this — an NPC
changing lanes in front of you may "either slow down to yield before completing the lane
change or speed up to overtake."

### Telegraph everything

Give every AI decision **300–500 ms of visible intent** before it acts: indicator flash,
a small forward nudge, a headlight flash meaning "after you," a honk. **Legibility beats
realism.** An unreadable NPC is indistinguishable from a bug.

### Personalities are free variety

Ship three or four IDM parameter sets — timid, aggressive, oblivious, taxi — behind the
same code. The city reads as populated at almost no cost.

### The horn is a core verb

Constraining player tools "paradoxically expands comedic possibility," and *Untitled
Goose Game* built an entire comic identity on one honk button.

Make the horn a real mechanic, not a toy:

- Pedestrians scatter
- The hesitant car finally commits
- The double-parker's owner comes running out of the chip shop
- ...and overuse annoys your passengers / draws a complaint

One button, deep consequences, always funny. Bind it to the biggest key on the keyboard.

---

## 8. Randomness that doesn't feel cheap

**Deal discrete events from a deck. Don't roll dice every frame.**

Every event needs two properties:

- A **telegraph window** — roughly 1 second of warning.
- An **avoidance option** — some line through it exists.

Random damage the player couldn't have avoided reads as the game cheating, and it
poisons trust in the honest physics from §1.

**Event deck starters:** dog in the road · a car door opening into your path · roadworks
· a parade or marching band · school crossing · delivery unloading · burst hydrant · fog
· rain (grip and stopping distance) · rush-hour density spike · a rival bus running your
route · a ticket inspector boarding · a passenger who changes their mind mid-journey.

Weight the deck by district, and lightly by how well the run is going.

---

## 9. Feel and juice

Juicing is "taking a game that works and adding layers of satisfying bits of animation
and audio," and it leans on two domains: **animation and audio**. Squash-and-stretch,
anticipation and follow-through come straight out of the classic animation principles.

A checklist tuned to this specific game:

**Impact**
- Hit-stop of 2–4 frames on contact
- Screen shake scaled to impulse — and **capped**
- Camera kick away from the impact point
- Paint-scrape sparks, and **permanent scratch decals on the bus** (permanence gives a
  run a memory)

**The bus as a body**
- Body roll into steering; suspension bounce over kerbs
- Wing mirrors that physically fold on tight passes — **the single best squeeze feedback
  you can build**
- Passenger heads bob; they lurch in unison under braking; standing riders grab rails

**The squeeze moment**
- When clearance drops below a threshold on both sides: subtle zoom-in, time dilation to
  ~0.9×, a rising tone
- Clear it → **"SQUEEZE!"** with a bonus scaled to tightness
- This deliberately engages near-miss psychology — humans react far more strongly to
  narrowly missing than to plainly failing, via counterfactual thinking. Note the ethical
  line: slot machines use fake near-misses to manufacture unresolved tension. Yours are
  **real** and **skill-determined** — the player genuinely did thread it. Same
  psychological hook, honestly earned.

**Audio**
- Air brakes hiss · the door *psssh* · bell ding on stop request · indicator tick · the
  specific chime of a happy passenger · escalating pitch on the payout count-up

---

## 10. Camera and readability — where top-down games die

This section is disproportionately important. Top-down driving has a known, documented
failure: **limited line of sight makes speed hard to handle, because the player can't
foresee what's ahead.**

### Do not rotate the camera

*Fuel Overdose* found that "many players nowadays get easily confused when the vehicle
points to the bottom of the screen because of the inversion of the controls," and had to
build an elaborate hybrid — dynamic rotation that prevents the vehicle pointing down,
plus per-track tuning of "the speed of the vehicle, the angle of the turn, the angle of
the next turn."

Don't inherit that problem. **Keep the camera world-fixed (north-up).** A city needs a
stable mental map; a rotating one makes the street grid unlearnable and is nauseating
over a long session.

### Then avoid inversion the easy way

Use **vehicle-relative steering** — left/right turn the *wheel*, not the *screen*.
Inversion only bites with screen-relative movement. This is exactly what GTA 1 and 2 did,
and it's why their fixed camera worked.

### The rest of the camera spec

- **Look-ahead offset** toward heading, scaled by speed — but **capped so the tail never
  leaves the screen.** Non-negotiable for a 12-metre vehicle whose back end is the
  primary hazard.
- **Speed-based zoom-out** so fast sections give more warning; zoom *in* during a squeeze
  for intimacy. GTA's original camera already raised with speed.
- Smooth with a **critically-damped spring**, not a per-frame lerp, so it's framerate
  independent.

### Making it 2D(ish)

- Extrude buildings *away from screen centre* (the GTA2 / *Hotline Miami* trick) for
  cheap, convincing depth. Keep extrusions short so they never hide the road you're on,
  and fade any that would cover the bus.
- Shadow offset encodes elevation; surface shading encodes gradient.

---

## 11. Controls

### Desktop

Arrows/WASD steer and drive · **Space = horn** (give the fun verb the biggest key) ·
Shift = doors · a modifier for "Hold on!"

**Analogue steering matters more than usual on a bus.** Keyboard steer must *ramp*
(0 → full lock over ~250 ms) and self-centre, so partial lock is holdable. Binary
steering will make the bus feel like a shopping trolley and destroy the precision
fantasy.

### Touch

Mobile guidance is consistent: design around thumb reach and imperfect precision, avoid
requiring simultaneous two-thumb actions, and **keep buttons at the screen sides** —
thumbs reaching toward the top centre cover the middle of the screen, which is exactly
where your narrow street is.

- Steering as a **drag area** (relative to touch-down x, not an absolute wheel), with a
  commit threshold so a drag stops being read as a tap.
- Auto-throttle by default, with a large right-thumb brake — this halves the input load
  and suits a slow vehicle.
- Horn as a big, always-visible button.
- **Offer both schemes.** Studies comparing control styles find little performance
  difference, so letting players choose is a straight win.

---

## 12. Session structure and scoring

Arcade design converges on **3–5 minute sessions** as the sweet spot, and treats losing
as a feature: it "gives the titles a natural ending point that becomes a new beginning."

- **Shift structure**: 3–5 minute runs. Instant restart — *Parking Garage Rally Circuit*
  is described as addictive largely because "restarting your rally is near instantaneous."
- **Score** = fares + time bonus + squeeze bonuses + smoothness multiplier − damage.
- **Combo chain** that breaks on real collisions but survives scrapes. Every consecutive
  clean delivery/squeeze builds it.
- **No hard fail on crashes.** Damage costs time; the clock ends the run.
- **Ghosts, not rivals.** *Parking Garage Rally Circuit* deliberately raced ghosts rather
  than opponents "because of the intimate nature of the circuits and how busy it would be
  with lots of other vehicles." Your streets have the same problem — traffic is already
  occupying that space.
- **Progression**: districts unlock, plus bus variants. The **articulated bendy bus is
  your endgame** — a trailer joint is an entirely new physics puzzle using the exact same
  controls, which is the cheapest real depth available to you.

---

## 13. How this fails — anti-patterns

| Failure mode | Symptom | Fix |
| --- | --- | --- |
| Comfort meter as a fail state | Game becomes a chore; the bus-sim boredom trap | Multiplier only |
| Rotating camera | Nausea, unreadable city | North-up + vehicle-relative steering |
| Tail swing with no preview | "That collision was unfair" | Swept-path ghost |
| Random events with no telegraph | "The game is cheating" | 1 s warning + an avoidance line |
| Passive traffic | Dead world, no negotiation | IDM + yield/refuse personalities |
| Hyper-aggressive traffic | Unfair, unreadable | Telegraph every decision |
| Heavy damage punishment | Players stop taking the risks that *are* the game | Damage = time, never death |
| Fully realistic bus physics | You've built SnowRunner: valid, but slow and niche | Pick arcade-honest |
| Long boarding animations | Dead time — a top real complaint about bus sims | Board in <1.5 s |
| Procedural city | Procedural generation cannot write jokes | **Hand-author the streets** |

That last row deserves emphasis. Your core content is *authored comedy placed in
authored geometry*. A generator can make a plausible street; it cannot decide that this
particular corner is funnier with a skip on it. Hand-build the districts, and use
procedural methods only for traffic and event scheduling.

---

## 14. Reference games — the steal list

| Game | Steal | Leave |
| --- | --- | --- |
| **Crazy Taxi** | Fare loop, colour-coded fares, adaptive route arrow, time-as-currency, forgiving collisions, dramatic payout | Stunt-worship — it rewards recklessness, you need three-way tension |
| **GTA 1 / 2** | North-up camera + vehicle-relative steering, city legibility, permission to be chaotic | Crime; also their line-of-sight problem |
| **Parking Garage Rally Circuit** | Near-instant restart, ghosts over rivals, one deep mechanic done well | Thin content — reviewers finished it in ~2 hours |
| **Untitled Goose Game** | Limited verbs, authored slapstick, **the honk**, expressive animation as the joke delivery | Stealth |
| **SnowRunner / Death Stranding** | Traversal *is* the game; terrain as a puzzle to solve, not a road to drive | The pace — contemplative, not arcade |
| **Bus Simulator 18 / 21** | Passenger comfort, door/route texture, the genuine calm of a good run | The repetition and the dead time; do not inherit either |
| **Micro Machines / Super Sprint** | Scale comedy, readable tight top-down courses | Fixed single screen |
| **Overcooked** | Escalating spatial chaos; pressure without violence | Co-op dependency |
| **Human Fall Flat / Totally Reliable Delivery Service** | Physics as a comedy engine | Unreliable controls — violates §1 |

---

## 15. What to prototype first — the one-street test

Build exactly this, and nothing else. **No score, no timer, no passengers.**

- One 250 m street at ~1.3 bus-widths clear
- Six parked cars, two of them badly
- One oncoming car with the negotiate/yield AI
- The bus, with tail swing, mass, and the swept-path ghost
- North-up camera with look-ahead, the squeeze feedback, and the horn

**If threading that street twice in a row is fun with no scoring attached, the game
exists.** If it isn't, no amount of content will save it, and you should re-tune the
physics and street width before building anything else.

> **Status: passed.** `bus.html` is that test, unchanged. `bus-4k.html` is the
> same driving model with the shift built on top — see §17 for what of the
> list below is now done.


Suggested order after that gate passes:

1. Hills (§2.4) — proves the elevation model reads top-down
2. Passengers and doors (§4) — proves the mass coupling is fun, not annoying
3. The clock (§3) — the first time all three pressures fight
4. The event deck (§8) — content scaling
5. The bendy bus (§12) — depth

---

## 16. Open questions to decide before building

| Question | Recommendation |
| --- | --- |
| Fixed route with stops, or hail-anywhere like a taxi? | **Hybrid** — scheduled stops for structure and planning, plus illegal hails for opportunistic risk |
| Arcade or sim physics? | **Arcade-honest** — exaggerated but perfectly deterministic (§1) |
| Does damage do anything beyond score? | **No fail state.** Damage costs time and multiplier |
| Handmade or procedural city? | **Handmade.** See §13 |
| Is the comfort meter visible? | Yes, but as a **combo/multiplier bar**, never a health bar |
| Portrait or landscape on mobile? | **Landscape** — you need horizontal look-ahead for a long vehicle |

---

## 17. What has actually been built

The one-street gate test (§15) passed, and `bus-4k.html` now carries the shift
layer on top of it: **two complete routes**, MILL LANE and MARKET HILL. This
section records which of the recommendations above are now decisions in code,
so the next person does not have to re-derive them from the source.

### Built

| Research | In the build |
| --- | --- |
| §2.3 mass coupling | 16 passengers add ~43% to the braking distance (17.0 m → 24.3 m from 43 km/h). Applied as a post-step correction so the shared physics block is untouched |
| §3 three pressures | Clock, geometry and comfort all run at once, and disagree |
| §3 the "Hold on!" verb | `HOLD ON` / **H**: 2.2 s of penalty-free violence for 3 s of clock, 6 s cooldown |
| §4 doors as a verb | Stop with the front door at the kerb; boarding time is 0.9 s at a perfect dock, 3.2 s at a scruffy one |
| §4 the overshoot | Sail past and the stop stays live — reverse back to it |
| §4 fare colour-coding | The floating count over each stop is green ≥5 waiting, amber 3–4, red ≤2 |
| §4 the navigation trick | The route ribbon follows the *road* to the stop, and turns white once you are within 26 m |
| §4 see the next stops | The bottom card names the next stop and the one after it |
| §5 measure in bus-widths | MILL LANE's worst pinch leaves 8 cm between the kerbs; MARKET HILL's leaves 6 cm, and its compound corner 12 cm |
| §5 compound corners late | MARKET HILL only; MILL LANE has none |
| §5 a recurring nemesis | The skip. Once in MARKET HILL's first pinch, again on the apex of the compound corner |
| §6 parked cars as jokes | Both routes ship the double-parked van and the straddler; MARKET HILL adds *the car parked in the bus stop*, which forces you to board from the middle of the road and caps that dock's grade |
| §12 score | Fares × dock quality × multiplier, squeeze bonuses, a time bonus of 60/s, minus damage |
| §12 combo | Breaks on a real collision, survives scrapes, steps to ×5 |
| §12 instant restart | Losing a route drops you straight back on its briefing card |
| §13 no hard fail | Damage costs 2 s and the combo. Only the clock ends a run |
| §13 hand-authored | Both routes are node-by-node authored; procedural work is limited to street dressing and building blocks |
| §16 hybrid route | Scheduled stops only, so far — see below |
| §16 arcade-honest | Unchanged, and still proven frame-exact against the prototype |
| §16 comfort as a multiplier | Drawn as a combo gauge under the score, never as a health bar |
| §16 landscape on mobile | Portrait rotates the *world* a quarter turn rather than cramping the framing |
| §11 steering as a drag area | The left half of the glass is a drag area relative to touch-down x, feeding an analogue `input.axis`. No absolute wheel, and a 14 px commit threshold separates a drag from a tap |
| §11 analogue steering | The drag writes a float, so a partial lock is genuinely holdable rather than a ramp between three positions |
| §11 auto-throttle | The right half is a three-band speed pad whose null position holds a 9 m/s urban cruise. Drag down to brake and reverse, drag up to overrule |
| §11 horn always visible | Kept as the one big button, under both schemes |
| §11 offer both schemes | CONTROLS in the settings sheet switches DRAG ↔ the original D-pad, remembered in `localStorage` |
| §11 no simultaneous two-thumb actions | Partly. Auto-throttle frees the right thumb entirely, but HOLD ON is a two-finger tap — see below |

### Known tension

**HOLD ON is a two-finger tap, and §11 says to avoid simultaneous two-thumb
actions.** The false-positive half is solved: a tap only registers if both
fingers land within 200 ms of an empty screen and lift within 300 ms without
travelling 14 px, so the ordinary two-thumb driving posture can never trigger
it. The ergonomic half is not: bracing mid-corner means lifting both thumbs and
tapping, which auto-throttle makes survivable but not comfortable. Kept as a
gesture on the strength of a clear call; the revert is a button above the horn.

### Deliberately not built yet

- **Hills (§2.4).** The elevation model was the first item on the post-gate
  list and is still the biggest missing piece. Rollback at a stop on a grade is
  the single funniest thing on the list.
- **Illegal hails (§16's "hybrid").** Only the scheduled half exists. Hails
  want a passenger who appears mid-street and a decision about whether to take
  them, which needs the event deck (§8) to be worth building.
- **The event deck (§8)** and **districts (§12)**.
- **The bendy bus as endgame (§12).** `bus-bendy.html` still has the physics;
  nothing connects it to the shift.

### Numbers worth keeping

Par times were tuned against a scripted driver in `tools/test-bus.js` §14 —
Stanley lateral control onto a lane clamped against every free interval in the
look-ahead window. It is a *worse* driver than a person and finishes MILL LANE
with 28 s spare and MARKET HILL with 45 s, which is the intended margin: a
competent human is comfortable, a first-timer is not.

---

## Sources

- [Breaking down elements related to core loop of Crazy Taxi (itch.io)](https://itch.io/blog/530882/breaking-down-elements-related-to-core-loop-of-crazy-taxi)
- [Crazy Taxi — Grokipedia](https://grokipedia.com/page/Crazy_Taxi_(video_game))
- [Directional Arrow — Crazy Taxi Wiki](https://crazy-taxi.fandom.com/wiki/Directional_Arrow)
- [US6200138B1 — Game display method, moving direction indicating method (Sega's navigation-arrow patent)](https://patents.google.com/patent/US6200138B1/en)
- [Simple 2D car steering physics in games — Engineering .NET](http://engineeringdotnet.blogspot.com/2010/04/simple-2d-car-physics-in-games.html)
- [Top-down car physics — iforce2d Box2D tutorials](https://www.iforce2d.net/b2dtut/top-down-car)
- [Top-Down Perspective — GTA Wiki](https://gta.fandom.com/wiki/Top-Down_Perspective)
- [Let's talk about top-down view camera system for a racing game — Game Developer](https://www.gamedeveloper.com/design/let-s-talk-about-top-down-view-camera-system-for-a-racing-game)
- [A Rational Approach To Racing Game Track Design — Game Developer](https://www.gamedeveloper.com/design/a-rational-approach-to-racing-game-track-design)
- [Racing Level design: the rally case — Game Developer](https://www.gamedeveloper.com/design/racing-level-design-the-rally-case)
- [Flow — The Level Design Book](https://book.leveldesignbook.com/process/layout/flow)
- [Mechanical Comedy In Games — Polaris Game Design](https://polarisgamedesign.com/2025/mechanical-comedy-in-games/)
- [An untitled Untitled Goose Game analysis — Game Developer](https://www.gamedeveloper.com/design/an-untitled-i-untitled-goose-game-i-analysis)
- [Squeezing more juice out of your game design — GameAnalytics](https://www.gameanalytics.com/blog/squeezing-more-juice-out-of-your-game-design)
- [The Art of Screenshake (Vlambeer) — notes](https://victorweidar.wordpress.com/2016/10/06/the-art-of-screenshake/)
- [The Near Miss Effect and Game Rewards — The Psychology of Games](https://www.psychologyofgames.com/2016/09/the-near-miss-effect-and-game-rewards/)
- [How Racing Games Use Risk and Reward Mechanics — RacingGames.gg](https://racinggames.gg/article/how-racing-games-use-risk-and-reward-mechanics)
- [TrafficAI — large-scale traffic simulation (bicycle model + IDM + Reynolds path following)](https://github.com/HappySapeta/TrafficAI)
- [Traffic AI — Simteract](https://simteract.com/projects/traffic-ai/)
- [TorchDriveEnv: reactive, realistic and diverse NPC driving behaviour](https://arxiv.org/pdf/2405.04491)
- [Touch Controls for Mobile Games: Input Patterns and Feedback — Cursa](https://cursa.app/en/page/touch-controls-for-mobile-games-input-patterns-and-feedback)
- [Touch Control Design: Ways Of Playing On Mobile — Mobile Free To Play](https://mobilefreetoplay.com/control-mechanics/)
- [Comparing Order of Control for Tilt and Touch Games — York University](https://www.yorku.ca/mack/ie2014.html)
- [Arcade Game Design fundamentals — GameDesignSkills](https://gamedesignskills.com/game-design/arcade/)
- [Parking Garage Rally Circuit review — GameGrin](https://www.gamegrin.com/reviews/parking-garage-rally-circuit-review/)
- [Parking Garage Rally Circuit review — God is a Geek](https://godisageek.com/reviews/parking-garage-rally-circuit-review/)
- [Bus Simulator review — God is a Geek](https://godisageek.com/reviews/bus-simulator-review/)
- [Bus Simulator 21 user reviews — Metacritic](https://www.metacritic.com/game/bus-simulator-21/user-reviews/)
- [SnowRunner is Death Stranding, just less esoteric — gamepressure](https://www.gamepressure.com/editorials/snowrunner-is-death-stranding-without-kojimas-weirdness/learn-to-drive/z0295)
