# Room 20 — "the Loading Bay": sokoban-lite blocks, wing capstone, new END

Status: draft for Tom's review. Engine sketch + room layout, not yet built.
Origin: wing plan (rooms 14–20, post-`room13` epilogue) — 14 pressure-plates
(teach) → 15 shape-keys → 16 light-axis → 17 stacked floors → 18+19
cross-room wiring → **20 pushable blocks, the wing's capstone and the new
final room**. `room19`'s exit currently would point to `END`; that becomes
`{ to: 'room20', ... }`, and room20's own exit points to `END`.

## 1. Player-experience summary

You've been pulling levers, keying codes, reading light. Room 20 hands you
one new verb — **push** — and then asks for everything at once: the same
crate that gets you *through* a sealed gate a minute ago is the only cover
you have against the wing's worst pair of orderlies a minute later, and the
same crate is what finally seats itself on the last plate and opens the way
to **END**. There's no second crate to fall back on and no way to skip
ahead. You either treat the one thing you can move like it matters, or you
spend the back half of the room walking your own mistake back into place
while something with a badge decides whether it saw you do it.

The room doesn't introduce a new threat type — same `Orderly`, same
unmed/lucid rules, same catch penalty every other room uses. What's new is
that *you* build the geometry the crossing depends on, in real time, under
the same clock everything else has always run on. The capstone note isn't
a bigger orderly or a longer corridor — it's that the tool from room 14
(a plate that only cares about weight) closes the loop: the last thing you
do with the crate is exactly the first thing you did with it, on the other
side of the wing.

## 2. Engine additions

**The headline: this ships with almost no new engine surface.** The push
mechanic is the room13/keypadDoor mutable-`ColliderDef` trick, reused, plus
one new `InteractableType` string that the renderer already knows how to
draw. No physics, no new collision code, no changes to `Interaction`'s
raycast.

### 2a. `InteractableType` — one new member

`rooms/types.ts`'s `InteractableType` union gains `'push_block'`. That's the
entire renderer diff: `world.ts`'s `buildXxx` switch in `loadRoom` already
has a `default:` branch —

```ts
default:
  mesh = new THREE.Mesh(new THREE.BoxGeometry(...it.size), MATERIALS[it.mat]);
```

— which is exactly the right visual for a crate (`mat: 'prop'`, the existing
worn-surface material, no new `MatName` needed). `Interaction`'s raycast
already iterates `world.entries()` generically and doesn't switch on type
at all except in the *generic-behavior* fallback (`interact()`'s
`dispenser`/`pill_pickup` cases) — `push_block` falls through that switch's
`default:` (no-op) exactly like `keypad`/`door`/`pill_cup` do today, so it's
entirely room-script-owned, same ownership model as a keypad door.
`map.ts`'s `TYPE_COLORS` record defaults unknown types to white; a
one-line addition (`push_block: '#8fd9a0'`) gives it a distinct color on
the map viewer, but even without that line it renders correctly today —
see §2e.

### 2b. `PushBlockDef` — the authoring-time shape

A small, room-file-local type (not proposed for `kit.ts` yet — see the open
questions; room20 can prototype it locally and Tom can promote it to a kit
helper once a second room wants one):

```ts
export interface PushBlockDef {
  id: string;
  cellX: number; cellZ: number; // initial rest cell, world coords, grid-aligned (see 2c)
  size?: number;                // cube edge, default 0.86 (see 2c for why)
}
```

This is the *static* half — it produces exactly one `InteractableDef`
(`type: 'push_block'`) for `RoomDef.interactables` (so it renders + is
raycastable) and exactly one `ColliderDef` for `rb.colliders` (so it's
solid) at room-load time. Both objects are created once and then **mutated
in place** for the lifetime of the room — the room13/`keypadDoor` pattern,
not a new one:

```ts
const crateCollider: ColliderDef = { minX: 1.57, maxX: 2.43, minZ: 0.57, maxZ: 1.43 };
rb.colliders.push(crateCollider);
const crate: InteractableDef = {
  id: 'crate', type: 'push_block', size: [0.86, 0.86, 0.86],
  pos: [2, 0.43, 1], mat: 'prop', label: 'push the crate', states: 'both',
};
```

### 2c. Grid, cell size, and the "walk into it + interact" push rule

- **`CELL_M = 1.0`.** A push always moves the block exactly one cell along
  one cardinal axis. Room-local grid origin is arbitrary (room20 aligns
  cell centers to integer-plus-offset coordinates so every scrawled/quoted
  position below is a legal cell center); nothing engine-level enforces
  grid alignment — it's an authoring discipline, exactly like the existing
  "walls sit on the centerline you pass to `wallX`/`wallZ`" convention.
- **Block footprint 0.86m** inside its 1.0m cell (0.07m margin to the cell
  boundary on every side). Chosen so a block *never* encroaches on a
  neighboring cell regardless of push history — corridor-width reasoning
  is per-cell-independent, the same reasoning `WALL_HALF_THICKNESS` buys
  for wall faces. Neighboring-cell clearance for a body of radius `r`
  walking past a block that's fully seated in its own cell: the full
  nominal 1.0m cell width is available, well over the player's 0.35m
  radius or an orderly's 0.4m + 0.1m margin.
- **The push trigger.** The engine's `interact()` is a single-shot
  click/key event, not a held key (`main.ts` line 177 calls
  `interaction.interact(...)` once per press) — so "hold interact while
  walking into it" doesn't map onto the existing input model without new
  input-layer plumbing. Room20's version: **one interact press = one cell
  of push**, gated on (a) the crosshair currently focuses the block (the
  existing raycast, unchanged — `TUNING.interact.maxDistance` = 2.7m still
  applies as the outer bound) and (b) the player is standing within ~1.15m
  of the block's center (i.e., functionally adjacent — "walking into its
  face"), which the room script checks in its `onInteract('crate', ctx)`
  handler alongside the raycast focus. This is a deliberate simplification
  of the brief's "hold" phrasing, flagged as an open question (§10) — it
  reuses 100% of the existing interact/raycast system and reads as sokoban
  regardless (real sokoban is discrete-step too).
- **Push direction** is derived, not aimed: the room script computes the
  vector from the player's XZ to the block's center at the moment of the
  press, snaps it to whichever cardinal axis has the larger magnitude, and
  the block attempts to move one cell **away from the player** along that
  axis (continuing outward, matching the "walk into its face" framing).
- **Blocked-push rule.** A push resolves only if the destination cell's
  0.86m AABB overlaps none of: (a) `rb.colliders` (state-filtered exactly
  like `tryMove`/`isActive` — a push into a `states:'unmed'`-only gate that
  hasn't retracted yet fails, same semantics as walking into it), (b) any
  orderly's current body circle (checked at push-resolution time only —
  pushes are discrete events, not a continuous physics query, so this is a
  single point-in-time circle test against each `Orderly.x/z` + `radius`),
  (c) — n/a here, only one block exists in room20, but a room with two
  blocks would check the other block's current collider too. A failed push
  is a no-op (no toast spam — same silent-fail convention `tryMove` already
  has for walking into a wall).
- **Animating the slide.** `GameCtx.moveInteractable(id, pos, rotY?)`
  already exists for exactly this ("Reposition/rotate an existing
  interactable's mesh in place, e.g. a door swinging open") — the room
  script tweens the mesh position over ~0.15–0.2s per push (a short lerp in
  `update(dt, …)`, same shape as room13's `setWallGap` single-writer
  pattern) while the **collider snaps instantly** to the destination the
  frame the push is accepted, so a fast-following player can never be
  caught mid-tween standing where the solid AABB already is.
- **Blocks falling into pits/height zones: recommended against, and not
  used here.** `World.floorHeightAt` is cosmetic only — collision stays the
  flat 2D XZ AABB system regardless of `heightZones`/`ramps` (`rooms/
  types.ts` header). A "block falls into a pit" would need genuinely new
  engine behavior (removing the block from play, or tracking a Z-axis that
  doesn't exist anywhere else in the collision model) for a payoff this
  room doesn't need — the crate/cover/plate beats are all flat-floor
  puzzles. Not worth the new surface for v1; noted as a future room's
  problem if Tom wants it later.
- **State-filtered blocks (a crate that only exists unmed): judged out.**
  Mechanically cute (a "wild" option per the brief) but it fights the
  room's own thesis — the crate's entire value is that it's a *stable,
  state-independent* tool (unlike everything else in the game, it doesn't
  care whether you're unmed or lucid). Making it flicker in and out on a
  state flip would either strand it mid-corridor when the player shifts to
  survive an orderly, or force the player to always solve pushes in one
  state — both undercut the "push your own cover into position" payoff the
  brief asks for. Not used in room20; still available as a future room's
  idea (e.g., a *lucid-only* crate that's the load-bearing twist of some
  other room, not this one).

### 2d. Orderly interaction: occluder yes, movement-collider no

Per the brief's explicit callback to room13's lesson: the block's
`ColliderDef` object is the **same object** passed into (a) `rb.colliders`
(so it blocks the player, via `tryMove`), and (b) every relevant `Orderly`'s
`occluders: OrderlyAABB[]` array (so it blocks sightlines, via
`segmentHitsAABB` — a pure static geometry test, no movement, no wedging
risk). It is **excluded by identity** from every `Orderly`'s `colliders`
(movement-blocking) array, exactly like room13 excludes `wallEastCollider`/
`wallWestCollider` from `ORDERLY_COLLIDERS`. Consequence, accepted, same
shape as room13's: an orderly whose patrol leg is ever pushed into by the
block will walk through it rather than colliding with it. Room20's layout
keeps every orderly's patrol legs and waypoints outside the block's full
*reachable* cell-set (not just its rest position) — see §5's dead-state
proof for why the reachable set is small and interior — so this caveat
never actually triggers in the intended solve; it's a safety-net rule, not
a load-bearing one.

**Generalization worth flagging to Tom for the kit:** `patrol()`'s
clearance validator (`kit.ts`) checks waypoints/legs against a room's
*static* `colliders` at call time. A pushable block's collider isn't static
— it has a reachable cell-set. A future room with more blocks/more patrol
complexity should validate patrol clearance against the **union of every
reachable cell** the block(s) could ever occupy, not just their rest
position, or hand-verify it the way this doc does in §5/§7. Room20 hand-
verifies; promoting this into `patrol()` itself is future kit work, not
blocking this room.

### 2e. What `/map.html` draws — no changes required, one nice-to-have

- The block's **rest-position** `ColliderDef` is a real member of
  `RoomDef.colliders` at room-load time (before any push happens), so it
  already renders on the existing `colliders` layer, state-colored via
  `STATE_COLORS['both']` (`#59605a`) — indistinguishable from a wall chunk
  by color alone, but present and to-scale.
- The block's `InteractableDef` (`type: 'push_block'`) already renders on
  the existing `interactables` layer: `map.ts`'s `TYPE_COLORS` record falls
  back to `'#ffffff'` for an unrecognized type, so it draws today as a
  white-labeled circle reading `push_block "crate" pos[...]`, with zero map
  viewer changes.
- **One-line nice-to-have:** add `push_block: '#8fd9a0'` to `TYPE_COLORS`
  so it's visually distinct (green) from dispensers/keypads/doors at a
  glance. Not blocking — the id label already disambiguates it.
- The viewer is static-snapshot only (imports `RoomDef`, never the room
  script), so it can only ever show the block's **initial** rest cell, not
  mid-solve positions — same limitation room13's moving walls already have
  on the viewer (it shows `startGapM`, never the crushed or crossed state).
  Not a gap worth closing for this room.

## 3. Room layout sketch

Three zones, spawn to `END`, `+Z` toward spawn (the established
convention). `CELL_M = 1.0` throughout; coordinates below are cell centers
unless noted.

```
Floor: minX -6, maxX 6, minZ -19, maxZ 6
Spawn: (0, 5), yaw 0 (facing -Z, into the room)

Z1 — the intake room           z [ 2, 6]   safe, no orderly
Z2 — the gauntlet floor        z [-15, 1]  2 orderlies, the crate's whole route
Z3 — the exit vestibule        z [-19,-16] safe, no lock
Exit AABB -> END               z [-19, -18.9], x [-1, 1]
```

**Z1 — the intake room** (z 2–6):
- `dispenser20` — west wall, x=-6, along z=4.
- `crate` initial rest cell: **(2, 1)**.
- `PLATE_1` (visual only, no collider — a raised disc `BlockDef`, matching
  the "room14-teaches-plates" visual language): cell **(0, 1)**.
- `GATE_1`: a `wallX(-6, 6, 0)` spanning the Z1/Z2 boundary, with a 1-cell
  gap at x∈[-0.5, 0.5]. `gate1Collider = { minX:-0.5, maxX:0.5, minZ:-0.1,
  maxZ:0.1 }`, active (sealed) on room entry.
- Scrawl near spawn: flavor + the crate's purpose (voice samples, §9).

**Z2 — the gauntlet floor** (z -15–1, x -6–6):
- `ISLAND_C` (static solid+occluder, room-authored, not pushable):
  x[-1,1], z[-6,-5] — a fixed low obstacle, insufficient alone (deliberately
  — the room's thesis is that static cover isn't enough here, only static
  *plus* the crate clears it).
- **Orderly A** loop (rectangle, clockwise): `(-5,-2) → (-2,-2) → (-2,-7) →
  (-5,-7)` → repeat. Danger leg: `(-5,-2)→(-2,-2)`, heading **+x** — his
  forward vector points directly at the causeway while walking it.
- **Orderly B** loop (mirrored, further south): `(2,-9) → (5,-9) → (5,-14)
  → (2,-14)` → repeat. Danger leg: `(5,-9)→(2,-9)`, heading **-x**, same
  reasoning, opposite side.
- `COVER_A` cell (crate's 2nd stop): **(-1, -2)** — sits directly on the
  sightline from anywhere on A's danger leg (all of it at z=-2) to the
  causeway crossing point (0,-2); any segment from `(x∈[-5,-2], -2)` to
  `(0,-2)` runs along the constant-z=-2 line and passes through x=-1.
- `COVER_B` cell (crate's 3rd stop): **(1, -9)** — mirrored reasoning
  against B's danger leg (all of it at z=-9).
- `PLATE_2` (visual, no collider): cell **(0, -15)**.
- `GATE_2`: `wallX(-6, 6, -16)`, gap x∈[-0.5,0.5], `gate2Collider` sealed
  until the crate reaches `PLATE_2`.

**Z3 — the exit vestibule** (z -19– -16): safe, no lock, the open doorway
at z≈-18.9 is `END` — same "no puzzle content in the vestibule" shape as
every other room's exit stretch.

## 4. Intended-solve walkthrough (exact pill economy)

Arriving pill count is 0 or 1 (`TUNING.pills.max = 1` — this is a single-
pill economy throughout the game, so room20's math only ever has two
starting cases):

1. **Enter Z1.** If arriving with 0 pills, use `dispenser20` → 1 pill.
   (If arriving with 1, skip it — no reason not to top up anyway, it costs
   nothing.) Read the scrawl.
2. **Push the crate onto `PLATE_1`:** 2 presses, `(2,1) → (1,1) → (0,1)`.
   `GATE_1` retracts permanently the instant the crate's cell matches
   `PLATE_1`'s — no player dwell time required, checked once per frame in
   `update()`. Toast, `GATE_1` opens for good (one-way, like every keypad
   door in the game).
3. **Push the crate through the gate into Z2:** 2 presses, `(0,1) → (0,0)
   → (0,-1)`.
4. **Push the crate to `COVER_A`:** 2 presses, `(0,-1) → (0,-2) → (-1,-2)`.
   This is the room's first live-timing beat: ideally timed for when
   Orderly A is on the far (south) leg of his loop, though the block being
   correctly seated means the crossing is safe even if he's mid-lane on
   the danger leg — the cover is unconditional once placed, only the
   *placement push itself* (done from the exposed east side, before the
   crate provides cover) benefits from good timing.
5. **Cross z=-2 southbound** (the crate now shields the causeway from A's
   danger leg).
6. **Retrieve the crate and continue south:** push it back to the
   causeway (1 press, `(-1,-2) → (0,-2)`), then push it south along x=0
   repeatedly (7 presses, `(0,-2) → (0,-9)`), then east into `COVER_B`
   (1 press, `(0,-9) → (1,-9)`). This retrieval is the room's second
   timing beat, mirrored against Orderly A instead of B this time (see
   §6's "the push you'll regret" for the failure mode this step invites).
7. **Cross z=-9 southbound** (now shielded from B's danger leg).
8. **Retrieve and finish the run to `PLATE_2`:** push back to causeway
   (1 press, `(1,-9)→(0,-9)`), south to `(0,-15)` (6 presses), landing on
   `PLATE_2`. `GATE_2` retracts permanently.
9. **Walk to `END`** through Z3. The crate's job is done; it never needs to
   move again (one-way rooms, no backtracking value in it anyway).

**Total: ~15 discrete pushes**, comparable in length to a real sokoban
level, not padded busywork. **Pill spend across the intended solve: 0.**
The crate mechanic is deliberately state-independent (§2c) specifically so
a full unmed clear is the *baseline* expectation, matching the "must be
genuinely possible at 0 pills" bar every orderly room in this game already
holds itself to. The 1 pill (whether topped up or arrived-with) exists
purely as the panic button described in §6 — spend it if a push goes
wrong, don't spend it if the run is going clean. **A full-lucid rush of the
whole sequence is not a shortcut**: walking + push-tween time for ~15
presses across ~28m of net crate travel plus player repositioning comes to
well over the 45s medication timer, so "shift once and coast the whole
crossing" is exactly as unviable here as `TUNING.medication.durationSec`
already makes it everywhere else — no special-case rule needed, the
existing clock does the work.

## 5. Dead-state analysis

**Claim: room20 has no true (unrecoverable) dead state**, for a structural
reason specific to single-block sokoban, plus a reset affordance layered on
top as defense-in-depth.

**The structural argument.** A push moves the block exactly one cell from
`A` to `B`. The cell it just vacated (`A`) is, by definition, empty the
instant the push resolves — nothing else in this room can occupy it
(there is exactly one block; orderlies don't claim cells, they're excluded
from being movement-blocked by it anyway per §2d; no second block exists to
collide with it). So **every push is trivially reversible**: walk to the
opposite face of `B` and push back toward `A`. The only way a real sokoban
dead-state happens — a crate shoved into a corner where the cell needed to
*retreat* it is itself a wall — requires the block to be adjacent to a
wall on both of two perpendicular sides at some point along its route.
Checking room20's actual route (§4): every cell the crate occupies (`(2,1)`,
`(1,1)`, `(0,1)`, `(0,0)`, `(0,-1)`, `(0,-2)`, `(-1,-2)`, `(0,-9)`, `(1,-9)`,
`(0,-15)`, and every transit cell along the straight runs between them)
sits at least 3m from the nearest perimeter wall (`x=±6`, `z=6`, `z=-16`)
and at least 1m clear of `ISLAND_C`. **No cell in the crate's reachable set
is a two-wall corner.** A push in the "wrong" direction from any of these
cells lands the crate in open floor, always walk-around-and-reverse-able —
worse for pacing (extra exposure walking back), never unsolvable.

**The one genuine risk, named honestly:** a player who spams the interact
press past the intended stop (e.g., pushes the crate from `(0,-2)` past
`(-1,-2)` to `(-2,-2)` — straight into Orderly A's own patrol leg) hasn't
created a dead state (§2d: the crate doesn't block him, he walks through
it), but *has* made the retrieval push materially more dangerous, since
recovering it now means standing at `(-3,-2)` — inside A's danger leg
proper, not just adjacent to it — to push it back east. Still reversible.
Just costs more.

**The reset affordance, layered on regardless:** matching the brief's
on-theme suggestion, **every orderly catch in room20 resets the crate to
its original rest cell `(2,1)`** in addition to the standard catch penalty
(`forceState('lucid')`, teleport to spawn, pills kept). Toast: *"hands. a
needle. and when you're back on your feet, it's already back on its
shelf."* This is pure defense-in-depth — the structural argument above
already guarantees no push can dead-end the room — but it's cheap to add
(one extra line in the room's `onCaught` hook, same shape as the
randomize-codes catch-reroll `kit.ts` already documents), it's exactly the
"they put everything back where it belongs" beat the brief invites, and it
means a player who *thinks* they've wedged themselves has an honest, in-
fiction way out rather than having to trust a design doc's proof.

## 6. Soft-lock audit

**Hard law #1 (0-pill unmed player can always reach a dispenser) — the
room20-specific rule:** *no push block's `ColliderDef` may ever be the
sole obstruction between the player's currently-reachable floor and a
dispenser.* Room20 satisfies this three ways at once:

1. **Exactly one dispenser, in Z1, which never sees a push.** The crate's
   entire route (§3, §5) lives in Z2 (z ≤ 1); `dispenser20` sits at
   `x=-6, z=4`, nowhere near the crate's transit path or rest cells. It is
   never at risk of being blocked, walled, or occluded by a push.
2. **`GATE_1` is a one-way permanent latch, not a re-closing door.**
   `gate1Collider` is disabled (`minX/maxX` shoved to 999, the standard
   trick) the instant the crate first reaches `PLATE_1` and never
   reactivates. A player anywhere in Z2, at any pill count, at any point
   in the crate's journey, can always walk straight back north through the
   open gate to `dispenser20`. This is the load-bearing guarantee: it turns
   "is the dispenser reachable from here" into "is Z1 reachable from here,"
   which is true for the entire room's lifetime once `GATE_1` opens.
3. **The crate's own footprint (0.86m in a 12m-wide floor) can never
   physically block the retreat route.** Even at its narrowest designed
   cell (`COVER_A`/`COVER_B`, both adjacent to a 6m-wide open floor, not a
   1-cell corridor), there's several meters of unobstructed floor to either
   side. Nothing about this layout depends on a single-file chokepoint the
   crate could seal.

**Stated as the general rule for Tom** (worth promoting to
`ROOM_AUTHORING.md`'s checklist if a second push-block room ships): *a
pushable block may only ever be authored to gate progress **forward**
(a plate/gate combo, one-way, like every keypad door already is) — never to
be the only thing standing between the player and a dispenser or exit once
placed. Audit this by asking, for every cell the block could ever occupy:
"if the block sat here forever, is every dispenser still reachable from
every point the player could be standing?"* Room20 passes this for all
three reasons above simultaneously, not just the two-of-three that would be
minimally sufficient — belt and suspenders, matching §5's layering.

## 7. Reaction-time audit

`minInspectionDistance(2.5)` = `(2.5 − 0.6) × 4.3` ≈ **8.2m** — the
existing kit constant, confirmed against `TUNING.orderly`'s
`graceSec`/`chaseSpeed`.

This rule (`ROOM_AUTHORING.md` §4) is scoped to **static inspection
points** — spots where the player stops to *read* something (a scrawl, a
keypad, which opens a multi-second modal via `openKeypad`) with no
Say-when the danger arrives. Room20 has no keypad and no scrawl the player
reads under threat — `PLATE_1`/`PLATE_2` trigger on the crate's position
alone, checked once per frame, no player dwell required, no modal. The
closest analogue to a "stand and read" moment is the **push press itself**
(a single discrete interact call, not a held state) and the **retrieval
walk** (a few seconds of ordinary movement to reach the opposite face of a
placed block) — categorically the same hazard class as *every other
orderly encounter in the game* (cross open ground while his cone is
visible and moving), which this game already governs by live-telegraphed
sight cones + `graceSec` + chase speed, not by a fixed safe-distance
guarantee. I'm treating that as the correct frame here rather than
distorting the layout to force an artificial 8.2m gap around a mechanic
that was never a "stand and read" beat to begin with — but I still ran the
numbers, because a genuinely bad number would be a real problem regardless
of category:

- `COVER_A` push point `(0,-2)` to A's nearest danger-leg point `(-2,-2)`:
  **2.0m.** Well under 8.2m — but this is the live-evasion crossing itself,
  not a static read; the intended fairness mechanism is A's rendered sight
  cone (visible whenever the player is unmed, per `orderly.ts`) plus the
  player's option to wait for him to clear the leg before pushing. Same
  fairness contract as every other orderly room's open-ground crossing.
- `PLATE_2` at `(0,-15)` to B's nearest loop point `(2,-9)`: **6.3m** —
  still under 8.2m by raw distance, but B's forward vector at that point
  is along his own loop's north-south return leg (x=2, heading z), so his
  cone doesn't point at `(0,-15)` regardless of distance except during a
  waypoint pause — the same "cone direction matters more than raw range"
  reasoning `TUNING.lastWard`'s comment block uses for room13.

**Recommendation for Tom's playtest pass:** if either of these reads as an
unfair surprise in practice (rather than a "you should have watched him"
moment), the fix is cheap and doesn't touch the crate mechanic at all —
widen the gap between `PLATE_2` and Orderly B's loop by a few meters
(pushing B's loop north, extending Z2's south stretch), same kind of tuning
knob room13's own doc explicitly deferred to "finalized by playtest."

## 8. Dispenser placement per the pressure rule

One dispenser (`dispenser20`), Z1, west wall, near end (right past spawn,
before any threat exists) — textbook "near end of the one sealed pocket"
placement (`ROOM_AUTHORING.md` law #5, the room12 `dispenser12c`
precedent). Notably, **no lucid-gated action in room20 actually requires
a dispenser** — pushing works in both states (§2c), and the plates trigger
on presence, not on a keypad. The dispenser exists for pressure/economy
consistency with every other room and as the crate-recovery panic button
(§4, §6), not because a hard rule forces its presence. Once past `GATE_1`,
reaching it again means physically walking back across whatever of the
gauntlet has already been crossed — a real cost, not a free top-up loop,
even though nothing prevents it (§6, point 2) — matching the "retreat is
possible but not comfortable" shape the pressure rule wants.

## 9. Voice samples

Scrawl, Z1 (near the crate, before `PLATE_1`):
```
it doesn't care what you are.
push it and it moves. that's the whole trick.
```

Toast, on `GATE_1` opening:
```
it opens for the weight, not for you.
```

Objective text, on entering Z2:
```
the last stretch. bring the thing that doesn't need to be told to be brave.
```

Toast, on `PLATE_2` / `GATE_2` opening:
```
it remembers this part. you taught it that, back at the start of everything.
```

Catch toast, room20-specific (crate reset folded in):
```
hands. a needle. and when you're back on your feet, it's already back on its shelf.
```

Toast, first time a push fails (destination blocked):
```
it doesn't go that way.
```

Objective text, Z3 (final stretch to END):
```
nothing left to carry. nothing left to push. just the door.
```

## 10. Open questions for Tom

1. **"Hold interact" vs "press interact once per cell."** The brief's
   phrasing ("walk into a block's face while holding/pressing interact")
   reads like it wants continuous push-while-held. The existing input
   model doesn't have a held-interact concept (`interact()` is a discrete
   per-press call, §2c) — implementing true "hold to keep pushing" would
   need new state in `engine/input.ts` (tracking key-down duration) plus a
   per-frame push-cooldown in the room script. I designed around the
   simpler discrete-press version since it reuses 100% of existing
   plumbing and still reads as sokoban. Worth a look before this room is
   built to confirm the discrete version doesn't feel worse than it reads
   on paper.
2. **Promote `PushBlockDef`/a `pushBlock(rb, opts)` kit helper now, or
   after a second room wants one?** Room20 is the only pushable-block room
   in the current plan. I kept the type room-local (§2b) rather than
   proposing a `kit.ts` addition, on the theory that a second real usage
   should inform the API rather than guessing it from one room — but if
   Tom already knows another room in the 14–19 range wants pushable
   objects, it's worth building the kit helper (and the `patrol()`
   reachable-set generalization noted in §2d) once, now.
3. **Does room20 want a THIRD push-adjacent beat, or is the crate's single
   three-job route (gate → cover A → cover B → gate) enough for a
   capstone?** I designed one crate with three sequential jobs rather than
   three disposable crates, on the theory that "one thing that matters the
   whole way through" reads more like a finale than "three small puzzles in
   a trenchcoat" — but this is a legitimate judgment call and I'd rather
   flag it than assume it's right.
4. **Exact tuning numbers** (push-tween duration, exact loop timings for
   Orderlies A/B, the `COVER_A`/`PLATE_2` distances flagged in §7) are
   marked as playtest-tunable throughout this doc, matching every prior
   room spec's own deferral pattern (room13's doc: "defaults suggested
   above, finalized by playtest"). None of them are load-bearing for the
   soft-lock/dead-state arguments in §5/§6, which hold at any reasonable
   value.
5. **Randomize-codes / config-panel interaction:** room20 has no keypad,
   so the existing randomize-codes toggle (`ROOM_AUTHORING.md` §4's last
   checklist item) doesn't apply — confirming that's correct and not an
   oversight, since this is the first room in a while with a lock-and-key
   beat (plate/gate) that *isn't* a keypad.
