# Room 14 — "the Hold": a trigger-volume primitive + the wing's opening teach room

Status: draft, ready for Tom's review.
Origin: Tom's post-epilogue wing plan — rooms 14 (pressure plates) → 15 (shape
keys) → 16 (light axis) → 17 (stacked floors) → 18+19 (cross-room wiring) →
20 (pushable blocks, capstone). This doc covers two things: the shared
trigger-volume engine primitive (part 1 — needed here and almost certainly
reused by 15-20), and room 14 itself, the wing's opening room (part 2). No
code is included in this doc as an implementation — it's design content,
same as `TUNING.lastWard`'s worked trig comments in `room13.ts` or the
interface sketches in the map-viewer spec.

---

## Part 1 — engine: a trigger-volume primitive

### Why this doesn't already exist

Room 13 needed "is the player currently between these two Z values" and
hand-rolled it as a local `inStretch` boolean recomputed each frame inside
its own `update()`. That's fine for one bespoke hazard in one room, but the
wing's plan leans on the same shape repeatedly — "is something standing in
this rectangle" — for at least: room 14's plate (this doc), and plausibly
room 15's shape-keys and room 16's light-axis (both read as "occupy a region
to activate something"). `ExitDef` already proves the engine-generic version
of this idea works well: a declarative AABB in `RoomDef`, checked once per
frame by `main.ts`, no room boilerplate. Trigger volumes are that same
mechanism, generalized to fire **both** enter and exit (not just one
one-shot "leave the room"), and made available to room-owned actors
(orderlies) as well as the player.

### The type

`src/rooms/types.ts` gains:

```ts
// A rectangular XZ region that fires enter/exit callbacks when an actor
// crosses its boundary — the declarative, reusable version of the ad-hoc
// "inStretch" boolean every hand-rolled hazard currently reimplements
// (room13's closing walls). Optionally state-filtered: a trigger with
// `states: 'lucid'` or `'unmed'` only EXISTS — is enterable, is drawn, fires
// nothing — while the ward is in that state, matching the StateFilter
// convention BlockDef/ColliderDef/InteractableDef already use. Deliberately
// has NO implicit collider: a trigger is a floor-level sensor, not an
// obstacle. A room that wants a trigger region to also block movement
// authors a separate rb.solid(...) for it, same as any other opt-in
// collider (see "composition" below).
export interface TriggerDef {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  states?: StateFilter; // default 'both'
}
```

`RoomDef` gains `triggers?: TriggerDef[]` (optional, additive — every room
shipped before this exists is unaffected, same pattern as `heightZones`/
`ramps`).

`RoomScript` gains two optional callbacks, engine-fired for the **player
only** (see "why player-only" below):

```ts
// Fired once when the player's (x,z) crosses into/out of a RoomDef.triggers
// region whose `states` filter matches the CURRENT WardState — checked
// every frame (not just on movement), so a trigger whose filter stops
// matching because the player shifted state while standing still fires
// onTriggerExit on the spot, same frame. Engine-detected in main.ts's frame
// loop, the same generic AABB-crossing tier ExitDef already lives at.
onTriggerEnter?(id: string, ctx: GameCtx): void;
onTriggerExit?(id: string, ctx: GameCtx): void;
```

### Why player-only at the engine layer, and how orderlies still compose

`main.ts` knows the player's position (`player.x/z`) but has never known
about orderlies — they're room-owned actors, spawned and updated entirely
inside each room's own `RoomScript` (see `kit.ts`'s `makeOrderlyRoomScript`,
or room13's hand-rolled `orderlyA`/`orderlyB`). Teaching the engine about
orderlies just to let a trigger see them would be a real new coupling; the
kit already avoids that class of thing (see `kit.ts`'s header: "nothing in
this file invents new engine behaviour"). Instead, `kit.ts` exports a pure
geometry+state test any room can call against **any** actor's position,
including its own `Orderly` instances (`orderly.x`/`orderly.z` are already
public — room13's `update()` reads them today for its threat aggregation):

```ts
// Pure containment test against a TriggerDef, honoring its state filter —
// the exact rectangle+state check the engine's own per-frame trigger poll
// uses for the player (main.ts), exposed so a room's own update() can run
// the identical test against a room-owned actor's position (an Orderly's
// public .x/.z). No enter/exit bookkeeping here — pair it with a simple
// `let wasIn = false` edge-detect local in the room's update(), the same
// shape as room13's `inStretch`.
export function inTrigger(t: TriggerDef, x: number, z: number, state: WardState): boolean {
  if (t.states && t.states !== 'both' && t.states !== state) return false;
  return x > t.minX && x < t.maxX && z > t.minZ && z < t.maxZ;
}
```

This gives every "someone is standing here" case exactly one rectangle,
authored once in `RoomDef.triggers`, shared by both the generic
engine-side player check and any room-side actor check — no drift between
"where the plate visually is" and "where it actually fires," which is the
bug class this is worth guarding against.

### The visible plate + kit helper

Most triggers in this wing will want a visible marker. `kit.ts` gets a
builder that bundles a `TriggerDef` with a thin, flush, state-filtered
`BlockDef` (a new `MatName`, `'plate'`) — the same "one call, two shapes"
pattern `keypadDoor()` already uses for door+keypad+collider:

```ts
export interface PlateOpts {
  id: string;
  minX: number; maxX: number; minZ: number; maxZ: number;
  states?: StateFilter; // default 'both'
  y?: number; // visual half-height above floor, default 0.02
}
export interface PlateDef {
  trigger: TriggerDef;
  block: BlockDef; // thin flush box, mat: 'plate', matches trigger's footprint + states
}
export function pressurePlate(opts: PlateOpts): PlateDef { /* ... */ }
```

A room spreads `plate.block` into `blocks` and `plate.trigger` into
`triggers`. **Deliberately no paired collider** — a pressure plate must stay
walkable (that's the entire mechanic); if some future room wants a trigger
region that's also physically raised or blocking, it authors `rb.solid(...)`
separately, same opt-in every other prop already uses.

### Composition with existing systems

- **Colliders**: independent by default (above). A trigger can freely
  overlap a collider (e.g., sit inside a doorway's gap) or empty floor.
  Existing state-filtered colliders (room10's unmed-sealed gates) and
  triggers can coexist in the same room untouched — nothing about this
  primitive changes how `tryMove`/`ColliderDef` work.
- **Patrols**: since a plate has no collider, it never enters
  `ORDERLY_COLLIDERS`, so an orderly walks straight across one like bare
  floor — no special-casing needed in `Orderly`/`patrol()`. This is what
  makes "an orderly's patrol leg crosses a plate" free to build: the patrol
  is authored exactly like every other room's, and a room's `update()`
  separately asks `inTrigger(plateTrigger, orderly.x, orderly.z, ...)` each
  frame.
- **Reversible gates (a general note for this and future rooms)**: a
  trigger that holds something open only while occupied needs to guard
  against the same class of bug room13's per-frame wall-clamp exists for —
  closing a collider back down **onto** a body that's still physically
  inside its bounds freezes that body in place (`tryMove` blocks all
  movement once the current position already penetrates an AABB). Any room
  built on this primitive that re-engages a collider on trigger-exit must
  defer the close while the relevant body's circle still overlaps the
  gate's own footprint, rechecking each frame until it's clear. Room 14
  (below) is the worked example; this should probably get folded into
  ROOM_AUTHORING.md's checklist once a second room uses the pattern.

### `/map.html`

New layer, `triggers`, added to `map.ts`'s `LAYERS` array (alongside
`interactables`/`scrawls`), drawn between `colliders` and `spawnexits` in
z-order. `drawTriggers()` renders each `RoomDef.triggers` entry as a
translucent rect in a color not already used (`colliders` uses grey/blue/
red for both/lucid/unmed, `exits` uses green) — violet (`#9d6fe0`) reusing
the existing `STATE_COLORS`-style tinting for the `states` filter, labeled
with the trigger's `id`. A `pressurePlate()`-built plate additionally shows
up in the existing `blocks` layer (its `mat: 'plate'` block) — seeing the
violet trigger rect and the plate-colored block outline coincide (or not)
is a useful debug signal on its own: a mismatch means the visible plate and
its actual firing bounds have drifted apart.

Files touched for the layer: `map.ts` (`LAYERS`, `drawTriggers`,
`MAT_COLORS.plate`), no change to `map-types.ts` (triggers are read straight
off `RoomDef`, unlike patrols which need the separate `DebugPatrol` export
since orderlies/scripts are never imported by the viewer).

### Full list of files touched (part 1)

| File | Change |
|---|---|
| `src/rooms/types.ts` | `TriggerDef` interface; `RoomDef.triggers?: TriggerDef[]`; `RoomScript.onTriggerEnter?`/`onTriggerExit?`; `'plate'` added to `MatName`. |
| `src/rooms/kit.ts` | `pressurePlate()`, `inTrigger()`; re-export `TriggerDef`. |
| `src/game/world.ts` | `MATERIALS.plate` entry (a worn-metal/mechanism texture, distinct from `pad`/`dispenser` so a plate doesn't read as another wall fixture — it's floor-mounted). |
| `src/main.ts` | Per-frame generic trigger poll: a `Set<string>` of currently-active trigger ids, reset on `loadRoom`, recomputed every frame via `inTrigger` against `player.x/z` + `state.state`, diffed against last frame to fire `onTriggerEnter`/`onTriggerExit`. Sits right after `player.update(...)`/the floor-height snap and before `current.script.update?.(...)`, so a callback that flips room-local state (e.g. "door held open") is already fresh by the time the room's own `update()` runs. |
| `src/devtools/map.ts` | New `triggers` layer + `drawTriggers()`; `MAT_COLORS.plate`. |
| `scripts/check-rooms.mjs` | Nice-to-have, not blocking for v1: validate trigger id uniqueness per room (same class of check already run for interactable ids). |

---

## Part 2 — Room 14: "the Hold"

### Player-experience summary

Room 13 was brutal and gave nothing back — no dispenser, forced-lucid
entry, two orderlies, a corridor that eats width every time you dip lucid.
Room 14 is the wing exhaling. The player walks in — likely lucid with
whatever pill state room13 left them (commonly 0 pills, since room13 never
refills), or unmed, it genuinely doesn't matter which — into a small, calm
alcove with a dispenser three meters from their feet. No orderly can reach
this alcove. The tone resets before anything is asked of them.

Then the room opens up, and there's exactly one new idea: a door at the far
end that a floor plate holds open, but only while something's weight is on
it — and the plate is far enough from the door that being on the plate and
being through the door are mutually exclusive. The room's single orderly —
the wing's reintroduction of the threat, base-tuned, nothing escalated —
paces a line that happens to cross the plate. The player has to notice that,
and has to notice that his patrol continues even while they're lucid and he
can't see them (an established fact, not a new rule, but this is the first
room built to make them use it on purpose). Three honest ways through, no
keypad, no code:

1. **Solo sprint** — step on the plate yourself, then run for the door
   before it re-locks. Free, but timing-tight and done exposed if unmed.
2. **Let him carry it** — wait near the door (there's a crate to stand
   behind) for his patrol leg to cross the plate, and walk through while
   he's on it. Free, needs patience and a read on his rhythm, not reflexes.
3. **Pay to be safe** — shift lucid first (costs the one pill, if they don't
   already have it spent) and do either of the above with zero personal
   risk, since he can't see or catch a lucid player and keeps walking
   regardless. This is the room quietly reminding the player that lucidity
   isn't just "the keypad state" — it's also armor, and it's rationed the
   same as everywhere else.

No pill is ever *required* — this is a skill/patience gate, not a paywall,
appropriate for the wing's gentlest room. The complication promised by the
brief is exactly this: the naive first instinct (stand on the plate, then
just walk to the door) fails once, on purpose, and that failure is the
whole teach.

### Room layout sketch

North (−Z) up, matching every other room's convention. Approximate
coordinates:

```
z=  9  ┌───────────────┐  south cap (behind spawn)
       │      spawn     │  (0, 8), yaw 0, facing −Z
       │   •dispenser14 │  (-5+.08, 1.45, 7.3) — ~5m from spawn, no orderly reach
z=  5  │                │
       │                │  ── SAFE ALCOVE / APPROACH ──
z=  2  │  "it only holds │  scrawl, west wall (-5, 2)
       │   the door       │
       │   while it's    │
       │   heavy."       │
z= -2  │                │  scrawl, east wall (5, -2): "he never stopped
       │                │  walking. you just stopped seeing him."
       │                │
       │                │  ── OPEN FLOOR ──
z=-11.9│ (-4.2,-11.9)━━━●━━━━━━━━━━━━━━━●(4.2,-11.9)  orderly patrol line
       │            ┌──┐   [PLATE]         crate/nook
       │            │▨▨│  x[-1.3,1.3]      (3, -13.0)
z=-12.5│            └──┘  z[-12.5,-11.3]   0.9×0.6 footprint
       │                │
       │                │  1.38m gap →
z=-14  ├──┐         ┌──┤  GATE (2m opening, x[-1,1])
       │  wall     wall│  holds open while plate/gate-trigger occupied
z=-14…-17│  vestibule   │  no lock, no code — opens on trigger, not interact
z=-17  └──┴─────────┴──┘  exit → room15, glow marker
```

Floor bounding box (for `RoomDef.floor`, lights, map viewer): `x[-5,5]
z[-17,9]`.

- **Z0 — entry alcove**, `z[5,9]`: spawn at `(0, 8, yaw 0)`. `dispenser14`
  on the west wall (`side:'w', wallAt:-5, along:7.3`) — see "dispenser
  placement" below.
- **Z1 — approach**, `z[-2,5]`: two flavor/mechanic-hint scrawls, both
  comfortably outside the orderly's reach (see reaction-time audit).
- **Z2 — the floor**, `z[-12.5,-2]` roughly: open room, one `Orderly` on a
  two-waypoint back-and-forth line (`(-4.2,-11.9)` ↔ `(4.2,-11.9)`, base
  `TUNING.orderly` — no per-room sight/speed override, this is the wing's
  *unmodified* reintroduction of the threat), a `pressurePlate()` at
  `x[-1.3,1.3] z[-12.5,-11.3]` sitting on that line, and a small prop crate
  at `(3, -13.0)` (footprint `x[2.55,3.45] z[-13.3,-12.7]`) as a waiting
  nook/occluder near the gate.
- **Z3 — the gate**, `z≈-14`: a 2m-wide opening (`x[-1,1]`) in the north
  wall, collider-gated by the plate/orderly trigger (below), never a
  keypad.
- **Z4 — exit vestibule**, `z[-17,-14]`: safe, no lock. Exit AABB to
  `room15` near `z=-16.5`.

### The gate mechanism (room script sketch)

```ts
const gateCollider: ColliderDef = { minX: -1, maxX: 1, minZ: -14.1, maxZ: -13.9 };
rb.colliders.push(gateCollider);

const plate = pressurePlate({
  id: 'plate14', minX: -1.3, maxX: 1.3, minZ: -12.5, maxZ: -11.3,
});
// plate.block -> rb blocks; plate.trigger -> RoomDef.triggers

let occupants = 0;       // union of player + orderly currently on the plate
let closeTimer = 0;      // counts down while occupants === 0 and gate is open
const SETTLE_SEC = 0.7;  // grace window after the LAST body leaves the plate

function openGate(ctx: GameCtx): void {
  gateCollider.minX = 999; gateCollider.maxX = 999.2; // standard disable trick
  ctx.moveInteractable('gate14', OPEN_POS, OPEN_ROTY);
}
function tryCloseGate(ctx: GameCtx): void {
  // Never re-engage onto a body that's still physically inside the gate's
  // own footprint — the exact class of trap room13's per-frame wall-clamp
  // exists to prevent. Deferred, rechecked every frame, until clear.
  const p = ctx.playerPos();
  const playerClear = !(p.x > -1.35 && p.x < 1.35 && p.z > -14.3 && p.z < -13.7);
  const orderlyClear = !(orderly.x > -1.35 && orderly.x < 1.35 && orderly.z > -14.3 && orderly.z < -13.7);
  if (!playerClear || !orderlyClear) return; // wait another frame
  gateCollider.minX = -1; gateCollider.maxX = 1;
  ctx.moveInteractable('gate14', CLOSED_POS, CLOSED_ROTY);
}

// engine-fired, player only:
onTriggerEnter(id, ctx) {
  if (id !== 'plate14') return;
  occupants += 1;
  if (occupants === 1) openGate(ctx);
}
onTriggerExit(id, ctx) {
  if (id !== 'plate14') return;
  occupants = Math.max(0, occupants - 1);
  if (occupants === 0) closeTimer = SETTLE_SEC;
}

// room-owned, checked every frame against the orderly (engine can't see him):
update(dt, _t, ctx) {
  const orderlyOn = inTrigger(plate.trigger, orderly.x, orderly.z, ctx.state.state);
  if (orderlyOn && !orderlyWasOn) { occupants += 1; if (occupants === 1) openGate(ctx); }
  if (!orderlyOn && orderlyWasOn) { occupants = Math.max(0, occupants - 1); if (occupants === 0) closeTimer = SETTLE_SEC; }
  orderlyWasOn = orderlyOn;

  if (occupants === 0 && closeTimer > 0) {
    closeTimer -= dt;
    if (closeTimer <= 0) tryCloseGate(ctx); // may defer again inside
  }
}
```

The plate itself is deliberately **not** state-filtered (`states: 'both'`)
— a considered choice, not an oversight. State-filtering the plate would
mean it simply doesn't exist in one ward state, which would break exactly
the safe route ("go lucid, let him carry it, zero risk") this room wants to
teach: the *state* is the tool here, not a gate on the mechanism. (A
state-filtered plate is still a good, on-theme idea for a future room in
this wing — 15 or 16 seem like natural fits — just not this one.)

### Intended-solve walkthrough, with exact pill economy

`TUNING.pills.max` is 1 — the player holds at most one pill, ever. Per the
brief, they arrive from room13 **lucid**, most commonly with **0 pills**
(room13 has no dispenser, so whatever they had is spent or was never
refilled):

1. Spawn at `(0,8)`, lucid, 0 pills, medication meter mid-drain from
   whatever it was doing in room13. Nothing in Z0/Z1 requires any state —
   they can walk to `dispenser14` (≈5m, no orderly in range) and top up to
   1 pill immediately, or ignore it for now (it's not gated, just close).
2. Walk to Z2. The orderly is visible (still lucid → he's invisible, but if
   they've let the meter run out on the way in, or shift down deliberately,
   he becomes visible and audible per the existing convention) pacing his
   line through the plate. They watch one full cycle (~13.6s: two 9m legs
   at 1.5 m/s + 0.8s pause each end) for free — no cost to observing.
3. **Route A (solo sprint, unmed, 0 pills spent):** shift unmed (free),
   approach the plate when his cone isn't on it, step on (gate opens),
   immediately move toward the gate — 1.38m to the gate's face, needs to
   clear the 0.24m wall band too, inside the 0.7s settle window (3.4 m/s ×
   0.7s = 2.38m of coverage against ≈1.6m actually needed — real margin,
   not a frame-perfect trick, but requires moving the instant they leave
   the plate, not lingering). **Cost: 0 pills.**
4. **Route B (let him carry it, 0 pills spent):** wait behind the crate at
   `(3,-13.0)` — outside his 6m sight range/55° cone for most of his cycle,
   watch for his leg to enter the plate's x-band, then walk the ~3.2m from
   the crate to the gate while he's still on it (his transit time across
   the 2.6m-wide plate at 1.5 m/s is 1.73s, plus the 0.7s settle tail after
   he clears it — a 2.4s window, comfortably covers the 3.2m/3.4 m/s ≈
   0.94s walk). Can be done unmed (some exposure while waiting/approaching)
   or lucid (zero exposure, since he can't see a lucid player and keeps
   walking regardless). **Cost: 0 pills unmed, 1 pill if done lucid for
   safety.**
5. **Route C (pay for safety):** shift lucid (costs the 1 pill, if not
   already spent/held) before attempting either A or B — removes all risk
   from the waiting/approach, the meter (45s) is far longer than either
   route needs. **Cost: 1 pill**, i.e. their entire reserve — a real,
   felt cost appropriate to a 1-pill economy, not a trivial toggle.
6. Through the gate, vestibule, exit to room15 at `z≈-16.5`.

A player who arrives **unmed** (0 or, less commonly, 1 pill) plays the
identical room: the dispenser tops them to 1 either way, and Routes A/B are
available regardless of arrival state since the plate/gate mechanism
doesn't check ward state at all.

### Soft-lock audit

- **0-pill unmed player can always reach a dispenser.** `dispenser14` sits
  in Z0/Z1, ~5m from spawn, behind no gate, no orderly, no state
  requirement — reachable in the very first seconds of the room regardless
  of how the player entered. This satisfies the brief's explicit ask ("give
  them a near dispenser fast") more directly than the general "one
  dispenser per lucid-gated action" rule requires, since this room has no
  lucid-gated action at all (see "dispenser placement" below).
- **The medication timer expiring anywhere is safe.** Reverting lucid→
  unmed is a free, always-safe transition everywhere in this room: Z0/Z1
  are open floor with no colliders; Z2 is open floor plus the plate (no
  collider) and the crate (a normal solid prop, not unmed-sealed, so
  reverting next to it is identical to reverting next to any wall in any
  other room); the gate is either open (safe — it's a passage) or closed
  (a normal solid the existing `circleHitsSolidUnmed` guard in `main.ts`
  already refuses to revert a player into, holding the revert off exactly
  like it does everywhere else in the game). Nothing in this room is
  unmed-sealed — there is no pocket a raw player can be shut into.
- **The plate/gate mechanism itself cannot seal anyone away from the
  dispenser.** The gate only ever stands between Z2 and the exit vestibule
  (room15-bound, one-way, per "rooms are one-way" — never between the
  player and `dispenser14`, which sits behind them in Z0/Z1). Whether the
  gate is open or shut has zero effect on reaching the dispenser.
- **The gate can't close onto a body standing in its own footprint** — see
  `tryCloseGate`'s deferred-close check above, the direct answer to the
  "reversible gate" note in Part 1. Verified for both the player (checked
  every frame the gate scripts run) and the orderly (checked the same way,
  though a wedged orderly would only be a visual/AI bug, not a player
  soft-lock, since he can never be the one who needs rescuing).
- **Catch behavior**: the orderly's contact-catch (unmed only, per
  `orderly.ts`'s mode-independent contact rule) forces lucid + teleports to
  this room's own spawn `(0,8)`, pills kept — standard convention, and
  spawn is 5m from a dispenser with nothing hazardous in between, so even a
  catch mid-Route-A/B loses no progress toward re-attempting.

### Reaction-time audit

The ≥2.5s / ≥8.2m rule governs **inspection points** — places the player
stops to read a scrawl or work a fixture. This room has no keypad. Its two
mechanic/flavor scrawls:

- `"it only holds the door while it's heavy."` — west wall, `(-5, 2)`.
  Nearest point on the patrol leg (segment `(-4.2,-11.9)`–`(4.2,-11.9)`) is
  its endpoint `(-4.2,-11.9)` (since `x=-5` falls outside the segment's
  x-range): distance `= √(0.8² + 13.9²) ≈ 13.9m`. Far beyond the 8.2m
  floor.
- `"he never stopped walking. you just stopped seeing him."` — east wall,
  `(5, -2)`. Nearest patrol point is `(4.2,-11.9)`: distance
  `= √(0.8² + 9.9²) ≈ 9.9m`. Clears 8.2m with room to spare.

The dispenser (`(-4.92, 1.45, 7.3)`) is ≈19.6m from the nearest patrol
point — not remotely close to a concern.

The only place the player is meant to be near the orderly at all is Z2/the
gate — that's the room's actual gameplay (evasion/timing/luring), not a
"stop and read text safely" moment, so the inspection-point rule doesn't
apply there by design, same distinction room3/room4's day-room orderly
already establishes. The orderly himself is unmodified `TUNING.orderly`
(6m sight, 55° cone, 0.6s grace, 4.3 m/s chase) — no per-room override,
deliberately, since this is the wing's *reintroduction* of the threat, not
an escalation.

### Dispenser placement (pressure rule)

Tom's playtest-9 rule is "pressure, not comfort: one per sealed pocket, at
the near end." Room 14 has **no unmed-sealed pocket** — the plate/gate is a
skill-and-patience gate passable for free in either ward state, not a
pill-paywalled chokepoint like rooms 10-12's gates. The pressure rule
therefore doesn't strictly apply here, and `dispenser14`'s near-spawn
placement is a deliberate, acknowledged departure from it: this is the
wing's first room, directly following the one room in the game with no
dispenser at all, and the brief explicitly calls for restoring that
reassurance fast. If Tom would rather the wing hold its pressure posture
even in the teach room (e.g. moving the dispenser to the far side, past the
gate, so it only rewards a successful crossing), that's a one-line move —
flagged below as an open question rather than assumed.

### Voice samples

All lowercase, second person, terse. Final copy is a writing pass, not a
design blocker (matching room13's spec's own caveat):

- Entry objective: `"the wing goes on. so does he."`
- Scrawl, Z1: `"it only holds the door while it's heavy."`
- Scrawl, Z1: `"he never stopped walking. you just stopped seeing him."`
- First gate-open toast (either source): `"the floor remembers weight. the door remembers the floor."`
- Gate-open-by-orderly toast (first time specifically he's the one who trips it): `"he just did what you couldn't do alone."`
- Catch toast: `"hands. a needle. \"back to the start of the wing,\" he says."`
- Objective once through: `"through. it doesn't get gentler from here."`

### Open questions for Tom

1. **Dispenser placement**: near-spawn comfort (as designed) vs. moving it
   past the gate for pressure consistency with the rest of the wing — see
   above.
2. **Exact tuning constants** (settle window 0.7s, plate-to-gate gap 1.38m,
   crate/nook position): defaults chosen and justified above with the
   underlying math, finalized by playtest, same as every prior room's
   closing-numbers.
3. **Should room15 (or a later wing room) also get a small dispenser**, in
   case a player spends their one pill on Route C here and would otherwise
   carry 0 into the next room? Depends on room15's own economy, which this
   doc doesn't design.
4. **Does the wing want the plate/gate pairing to recur** (same visual
   language, `pressurePlate()`) in 15/16, or was this meant to be a
   one-off intro beat with each later room inventing its own use of the
   trigger primitive? Affects how much this room's specific tuning (settle
   window, "occupants" union model) should be generalized into
   `ROOM_AUTHORING.md` now vs. left bespoke.
5. **Room13 wiring**: this design assumes `room13.exits` gets changed from
   `{ to: 'END', ... }` to `{ to: 'room14', ... }` and room14's own exit
   points at `'room15'` (not yet built) or a placeholder — that wiring
   itself is out of scope for this doc (see the `adding-a-room` skill) and
   isn't touched here.
