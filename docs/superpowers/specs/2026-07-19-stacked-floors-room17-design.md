# True stacked floors: engine design + Room 17, "the Gallery Ward"

Status: proposal, for Tom's review — not yet approved, no code written.
Origin: post-epilogue wing (rooms 14-20). Room 17 is slotted as the wing's
verticality spike, after 14 (pressure-plates)/15 (shape-keys)/16 (light-axis)
and before the 18+19 cross-room wiring pair and 20's pushable-block capstone.
This doc covers two things that have to be designed together: the engine
change that makes "walk under an upper floor" possible at all, and the one
room that spends it.

## 1. Player-experience summary

Room 16 ends and the player steps into a two-storey day ward. The floor
plan reads wrong the moment you see it: the room obviously continues north,
but a wall seals it at chest height across the whole width — no door, no
keypad, just wall. The only way further is up a stairwell against the east
wall.

Climbing it, the player finds a railed gallery walkway suspended over
*another* room's worth of floor — a floor they never walked through, because
the wall downstairs never had a gap for it. That lower floor is real: it has
its own orderly, its own furniture, its own scrawled code, sitting directly
underneath where the player is now standing. A second stairwell — really a
hole cut in the gallery's own decking — drops back down into it at the far
end. Reaching the exit door means going up, across, and back down, because
the flat route was never on the table.

Two orderlies occupy the exact same footprint at different heights the
entire time — one patrolling the gallery, one patrolling the floor beneath
it — and neither one ever reacts to the other's target, because they aren't
on the same floor and the game means that literally now, not just
geometrically-usually. That's the thing this room exists to prove: the old
engine could fake a mezzanine (room11 already does), but it could never let
you stand where two independent "the floor is here" answers are both true
at once. Room 17 is built entirely out of that seam.

## PART 1 — Engine: true stacked floors

### 1.1 Why the current model can't do this

`RoomDef.heightZones`/`ramps` and `World.floorHeightAt(x, z)`
(`src/rooms/types.ts`, `src/game/world.ts`) are single-valued: one XZ column,
one walkable height, full stop. Room11's own header is explicit about why —
"without the hard problem of two walkable surfaces stacked at the same XZ
column." Three concrete blockers, all in code read for this doc:

- **Collision is 2D XZ AABB with no notion of "which floor."**
  `tryMove(body, nx, nz, colliders, state)` (`src/engine/collision.ts`)
  filters colliders only by `StateFilter` (lucid/unmed/both). Two colliders
  occupying the same XZ at different intended heights — a railing on a
  balcony and a piece of furniture on the floor below it — are
  indistinguishable to it today.
- **The ceiling is one fixed plane at absolute y=3.** `World.loadRoom`
  (`src/game/world.ts`) builds it from `def.floor`'s XZ rect regardless of
  any `heightZones`. A raised zone just eats into the fixed 3m of headroom
  (ROOM_AUTHORING.md's §8 says as much: "keep raised zones modest, ≤1m").
  There's no way to give an upper level its own honest ceiling height.
- **Orderly sight is pure XZ distance + cone + AABB occlusion**
  (`src/game/orderly.ts`'s `updateSight`/`occluded`). It has no idea "level"
  exists. Room11 gets away with this today by convention only — its header
  says the two orderlies' reachable footprints happen never to overlap in
  XZ. That's correctness by careful layout, not by the engine proving it
  can't happen; the prompt for this doc calls that out by name ("cross-room
  orderly line-of-sight not modeled").

### 1.2 New data model

`src/rooms/types.ts` additions:

```ts
// A room-local named floor. Every room without `levels` behaves exactly as
// today (see 1.7) — this is purely additive.
export interface LevelDef {
  id: string;                 // room-local id, e.g. 'ground' | 'balcony'
  baseY: number;              // default walkable height anywhere in this
                               // level's own footprint (0 for a ground floor,
                               // e.g. 3.4 for a raised gallery)
  floor: { minX: number; maxX: number; minZ: number; maxZ: number };
                               // this level's own footprint — NOT consumed by
                               // floorHeightAt (baseY/heightZones/ramps are),
                               // only by spawn validation and the map viewer
  heightZones?: HeightZone[]; // scoped to this level, same semantics as today
  ramps?: RampDef[];          // scoped to this level, same semantics as today
}

// The connector between exactly two levels — a stair run, modeled as a
// ramp that also flips which level a traveler is considered "on" once they
// fully clear the far end. `yLow`/`levelAtLow` describe the axis's min end,
// `yHigh`/`levelAtHigh` the max end (mirrors RampDef's yLow/yHigh
// convention exactly, plus the level tag each end belongs to).
export interface StairwellDef {
  id: string;
  minX: number; maxX: number; minZ: number; maxZ: number;
  axis: 'x' | 'z';
  yLow: number; levelAtLow: string;
  yHigh: number; levelAtHigh: string;
}
```

`ColliderDef` gains one field:

```ts
level?: string; // undefined = active regardless of the querying entity's
                 // current level (a real full-height wall/pillar — the
                 // common case for perimeter walls that structurally pass
                 // through every level). Set = active only while the
                 // querying entity (player or a specific Orderly) is
                 // currently on that level — e.g. a gallery's railing,
                 // which must not block the floor underneath it.
```

`ScrawlDef` and `InteractableDef` gain the same `level?: string` field, but
as **viewer metadata only** — exactly like `DebugPatrol.label`'s existing
"descriptive data only, the game never reads it" convention. Nothing in the
runtime interaction/raycast/scrawl-render path needs it: a fixture mounted
at gallery height is already ~3m+ above anything at ground height and well
outside `TUNING.interact.maxDistance` (2.7m) from a ground-level player, and
its mesh is real geometry a ground-level raycast simply won't reach. The tag
exists so `/map.html` can filter/ghost by level without guessing from
position.

`RoomDef` gains:

```ts
levels?: LevelDef[];         // absent ⇒ one implicit level, see 1.7
stairwells?: StairwellDef[]; // absent ⇒ none; every RampDef stays single-level
ceilingY?: number;           // default 3 (today's hardcoded constant)
spawn: { x: number; z: number; yaw: number; y?: number; level?: string };
```

### 1.3 Level resolution (player only — see 1.5 for why not orderlies)

A new small function, `resolveLevel`, lives next to `floorHeightAt` (either
folded into `World` or a standalone `src/game/levels.ts` — implementation's
call):

```ts
function resolveLevel(
  current: string, x: number, z: number, stairwells: StairwellDef[],
): string {
  for (const s of stairwells) {
    if (x < s.minX || x > s.maxX || z < s.minZ || z > s.maxZ) continue;
    if (current !== s.levelAtLow && current !== s.levelAtHigh) continue;
    const t = s.axis === 'x'
      ? (x - s.minX) / (s.maxX - s.minX)
      : (z - s.minZ) / (s.maxZ - s.minZ);
    if (t >= 1 && current === s.levelAtLow) return s.levelAtHigh;
    if (t <= 0 && current === s.levelAtHigh) return s.levelAtLow;
  }
  return current; // unchanged everywhere else, including mid-stair
}
```

The player carries a persistent `level: string` field (new, on `Player`).
Every frame, before movement/height are resolved:

```ts
player.level = resolveLevel(player.level, player.x, player.z, world.stairwells);
```

This is the actual resolution of the "two valid Ys at one XZ column"
problem: **level is not a pure function of (x, z) in general** — the whole
point is that the gallery's footprint and the floor beneath it legitimately
share an XZ rectangle with two different correct heights. What disambiguates
them for any one traveler is that traveler's own persistent `level`, which
only ever changes by physically walking a `StairwellDef`'s footprint start
to finish. Two different entities (the player, or two different `Orderly`
instances) can sit at the same (x, z) with different `level` values
simultaneously and each gets its own correct floor height and its own
correct collider set — that is the capability this whole doc exists to add.

`World.floorHeightAt` becomes level-aware:

```ts
floorHeightAt(level: string, x: number, z: number): number {
  for (const s of this.stairwells) {
    if (out of [minX,maxX]x[minZ,maxZ]) continue;
    if (level !== s.levelAtLow && level !== s.levelAtHigh) continue;
    const t = clamp01(axis-relative position);
    return s.yLow + (s.yHigh - s.yLow) * t;
  }
  const lvl = this.levels.find(l => l.id === level) ?? this.levels[0];
  // existing ramp-then-zone logic, unchanged, just reading lvl.ramps /
  // lvl.heightZones instead of the room-wide arrays
  return lvl.baseY;
}
```

main.ts's per-frame easing becomes:

```ts
player.level = resolveLevel(player.level, player.x, player.z, world.stairwells);
player.y += (world.floorHeightAt(player.level, player.x, player.z) - player.y) * 0.35;
```

### 1.4 Collision

`tryMove` (`src/engine/collision.ts`) gains a required `level: string`
parameter, filtering alongside the existing `isActive(c, state)` state
check:

```ts
function isActiveOnLevel(c: ColliderDef, level: string): boolean {
  return c.level === undefined || c.level === level;
}
```

Because every collider shipped before this change has `level === undefined`,
`isActiveOnLevel` is trivially `true` for all of them regardless of what
`level` argument is passed — so every existing call site can be updated
mechanically (thread a level value through) without changing behavior for
any room that doesn't declare `levels`. `circleHitsSolidUnmed` (same file,
used by the medication auto-revert trap check) gets the identical treatment
— it must also respect `level`, since an unmed-sealed collider could in
principle be level-tagged.

`Player.update`'s call becomes `tryMove(this, nx, nz, colliders, state,
this.level)`. `Orderly.moveBody`'s call becomes `tryMove(body, ..., state,
this.level)` where `this.level` is the orderly's own fixed level (1.5).

### 1.5 Orderlies: fixed level, hard LOS gate

An `Orderly` is constructed with a new `level?: string` option (default: the
room's implicit single level, see 1.7) and **never calls `resolveLevel`** —
its level is fixed for its whole lifetime. Two reasons this is the right
call, not just a shortcut:

1. It matches the convention room11 already documents by hand ("keep each
   orderly's reachable XZ footprint on one level") — this formalizes it
   instead of relying on careful authoring alone.
2. An orderly that physically climbed a `StairwellDef` mid-patrol would need
   its `level` to flip exactly like the player's, which means a room author
   would have to reason about an orderly's patrol loop crossing a stairwell
   footprint at all — a new failure mode (`patrol()`'s clearance validator
   doesn't know about stairwells and wouldn't catch it). Fixing the level at
   construction removes the failure mode entirely: a patrol loop is simply
   never allowed to enter a `StairwellDef` footprint (the room author's
   job, same as keeping him off furniture), and if it did by mistake, the
   worst outcome is a cosmetic floating/sinking glitch (his own
   `floorHeightAt` lookup stays pinned to his own level), not a silent
   logic bug.

The sight gate (`Orderly.updateSight`) gets one new check, evaluated before
distance/cone/occlusion — `update()`'s signature grows a `playerLevel`
argument:

```ts
update(dt, playerX, playerZ, playerState, playerLevel: string): void {
  ...
}

private updateSight(dt, playerX, playerZ, playerState, playerLevel): void {
  let seen = false;
  if (playerState === 'unmed' && playerLevel === this.level) {
    // existing distance/cone/occlusion logic, unchanged
  }
  ...
}
```

This is a **proof**, not a probabilistic layout guarantee: an orderly
constructed with `level: 'ground'` cannot ever transition into `watching`
or `chasing` against a player whose `level` is `'balcony'`, regardless of
XZ distance, because the check happens before the distance/cone math even
runs. Cross-level LOS isn't "not modeled" anymore — it's modeled as
categorically impossible, which is the strongest available answer and
cheaper to implement than real 3D occlusion.

The contact-catch check (`if (playerState === 'unmed') { ... catchRadius
...}`, the fix for the room7/room8 "sneak up from outside the cone" bug)
gets the same `playerLevel === this.level` gate — a player standing
directly below a chasing orderly (same XZ, different level) must not be
catchable by touch either.

### 1.6 Ceiling

`World.loadRoom` reads `def.ceilingY ?? 3` for the one ceiling plane's y
position, instead of the hardcoded `3`. That's the entire engine change —
deliberately not "per-level ceiling planes with clipping." This codebase's
existing convention (ROOM_AUTHORING.md §8: "nothing renders a zone's floor
automatically... author a slab") already solves the real problem: a raised
level's own floor is an authored, opaque `BlockDef` (a box, not a one-sided
plane — a `PlaneGeometry` floor is single-sided and would be invisible from
underneath, which is exactly why the existing worked example uses
`rb.block(...)` for the platform slab, not a plane). That slab's underside
*is* the visual ceiling for whoever's standing on the level below it, for
free, via ordinary opaque occlusion — no clipping, no per-level render
pass, nothing new to build. A room with stacked levels just needs a room-
wide `ceilingY` tall enough to hold every level's own eye-height + margin
(1.9's headroom arithmetic), and an authored slab whitewalled onto the
correspondence of "here's the underside of that."

### 1.7 Backward compatibility

Every field this section adds is optional, and every list-shaped field
already defaults to empty. A `RoomDef` with no `levels` is treated as
exactly one implicit level:

```
{ id: '__flat', baseY: 0, floor: def.floor, heightZones: def.heightZones, ramps: def.ramps }
```

`player.level`/every `Orderly`'s `level` default to `'__flat'`;
`resolveLevel` is a no-op with no `stairwells`; `floorHeightAt('__flat', x,
z)` reduces to today's exact ramp-then-zone-then-0 logic reading the room's
top-level `heightZones`/`ramps` arrays (unchanged, still supported — a
single-level room with a mezzanine, like room11, never needs to touch
`levels`/`stairwells` at all). `tryMove`'s new `level` parameter is inert for
every existing collider (`level === undefined` always matches). `ceilingY`
defaults to `3`. Nothing about rooms 1-16 needs to change for this to ship.

### 1.8 API surface changes

- `GameCtx.teleportPlayer(x, z, level?)` — new optional third parameter.
  Every existing call (`ctx.teleportPlayer(room11.spawn.x, room11.spawn.z)`)
  keeps working (stays on the player's current level); a multi-level room's
  catch/reset handler must pass it explicitly
  (`ctx.teleportPlayer(room17.spawn.x, room17.spawn.z, 'ground')`) or a
  catch on the gallery would teleport the player to ground-level spawn
  coordinates while `player.level` was still stuck at `'balcony'`.
- `GameCtx.playerPos()` gains `level: string` in its return shape, for room
  scripts that need to reason about which level the player's on (room17
  doesn't strictly need this, but it's the honest generalization).
- `RoomDef.spawn.level?: string` — read by `Player.spawn`/`loadRoom`, default
  `levels?.[0]?.id ?? '__flat'`.

### 1.9 Kit additions (`src/rooms/kit.ts`)

- `stairwell(minX, maxX, minZ, maxZ, axis, yLow, levelAtLow, yHigh,
  levelAtHigh): StairwellDef` — thin constructor, same style as
  `heightZone()`/`ramp()`.
- `level(id, baseY, floor, opts?: { heightZones?, ramps? }): LevelDef` — thin
  constructor, ditto.
- `OrderlyCfg` (used by `makeOrderlyRoomScript`) gains `level?: string`,
  threaded straight into the `Orderly` constructor's new option.
- `patrol()`'s clearance validator is explicitly **not** extended to check
  stairwell footprints in this pass (see 1.5) — flagged as an open question
  in 1.11 rather than silently assumed.

### 1.10 `/map.html` dev viewer (`src/devtools/map.ts`, `map-types.ts`)

- A new **level selector** (a `<select>`, same pattern as the existing room
  `<select>`), populated from `def.levels` when present; hidden/disabled for
  every room without `levels` (today's single-view behavior, untouched).
- Every per-item draw function (`drawColliders`, `drawBlocks`,
  `drawInteractables`, `drawScrawls`, `drawPatrols`) gains a level filter:
  an item with `level === undefined` always draws at full strength (the
  "real wall, spans every level" case); an item whose `level` matches the
  selected level draws normally; an item whose `level` is set but doesn't
  match draws as a **ghost** — low opacity (~0.15), dashed — so the author
  can visually verify the two levels' footprints line up (this is exactly
  the check room17's authoring needs: does the gallery's stairwell hole
  actually sit over the lower floor's landing spot). This generalizes the
  existing `STATE_COLORS` both/lucid/unmed convention to a second,
  independent axis.
- A new **`stairwells` layer**, drawn like `drawHeight`'s ramps (an arrow +
  labels) but labeled with `levelAtLow`/`levelAtHigh` instead of bare
  numbers, and colored distinctly (level transitions are structurally
  different from an in-level ramp — they change which collider/patrol set
  applies, not just height).
- The background floor rect (currently always `def.floor`) switches to the
  **selected level's own `floor` rect** when `levels` is present, falling
  back to `def.floor` otherwise.
- `DebugPatrol` (`map-types.ts`) gains an optional `level?: string`, filtered
  identically.

### 1.11 Files touched (implementation-plan scope)

`src/rooms/types.ts`, `src/game/world.ts`, `src/engine/collision.ts`,
`src/game/player.ts`, `src/game/orderly.ts`, `src/game/context.ts`,
`src/main.ts`, `src/rooms/kit.ts`, `src/devtools/map.ts`,
`src/devtools/map-types.ts`, `src/rooms/room17.ts` (new),
`scripts/check-rooms.mjs` (registry entry + new checks: every
`stairwell.levelAtLow`/`levelAtHigh` resolves to a real `levels[].id`,
`spawn.level` resolves if present, spawn XZ falls inside that level's
`floor` rect), `ROOM_AUTHORING.md` §8 (rewritten to document `levels`/
`stairwells` alongside the existing single-level `heightZones`/`ramps`,
which stay documented as-is for the common case).

### 1.12 Open engineering questions

- Should `patrol()` be extended to reject a waypoint/leg that enters any
  `StairwellDef` footprint (catching the "orderly wedged mid-stair"
  variant of the room7/room8 bug class before playtest, the same way it
  already catches collider clearance)? Recommended yes, scoped as a
  follow-up to keep this change's diff reviewable.
- Orderlies are permanently single-level for their whole lifetime under
  this proposal (1.5). That's sufficient for room17 and, as far as this doc
  can tell, for 18-20's stated shapes (wiring pair, pushable blocks) — but
  it's a real, load-bearing constraint on every room after this one. Worth
  Tom's explicit sign-off before it's relied on elsewhere.
- `RoomDef.ceilingY` is room-wide, not per-level (1.6) — a stacked room's
  non-stacked areas (room17's south hall, 1.13) inherit the taller ceiling
  needed for the stacked section unless the room author also builds a
  lower authored deck over them. Cheap to fix per-room with more geometry;
  not an engine limitation, just a callout so it isn't mistaken for one.

## PART 2 — Room 17: "the Gallery Ward"

### 2.1 Placement

Room 16 (light-axis) → **Room 17** → Room 18 (cross-room wiring, part 1).
Two levels: `'ground'` (baseY 0) and `'balcony'` (baseY 3.4). Room-wide
`ceilingY: 6.0` (headroom on the balcony: 6.0 − 3.4 − 1.62 = 0.98m, in line
with the ~1m margin ROOM_AUTHORING.md already recommends for a raised
zone). Shell: x [-9, 9], z [-8, 34] (42m span, same order of magnitude as
room11's 42m and room13's 54m).

### 2.2 Layout — GROUND level (`baseY 0`, footprint x[-9,9] z[-8,34])

| Zone | z range | Contents |
|---|---|---|
| Vestibule | [-8,-6] | exit to room18, glow marker at the doorway |
| **Pocket** | [-6,10] | keypad17 + exitdoor (north wall, z=-6); code-clue scrawl near them; `dispenser17c` (west wall, along=9); `ORDERLY-POCKET` |
| (stair footprints — see 2.4, not flat ground) | z[4,8] (west), z[10,16] (east) | — |
| Sealed wall | z=16 | `wallX(-9,6,16)` + `wallX(8,9,16)` — **no gap except the east stair's own x[6,8] mouth.** Both segments `states:'both'`, no `level` tag (a real wall, present regardless of level) |
| **South Hall** | [16,34] | spawn (0,32,yaw 0); `dispenser17a` (east wall, along=31); `ORDERLY-SOUTH` |

The sealed wall is the room's whole thesis: there is **no keypad, no gate,
no lucid-only trick** that opens it. It is simply wall, forever, on the
ground level. The only way past it is up.

### 2.3 Layout — BALCONY level (`baseY 3.4`, footprint x[-9,9] z[-6,10])

Directly overhangs the pocket's entire footprint (the same rectangle,
literally — see 2.5 for why that's the point). A railed walkway;
`ORDERLY-BALCONY` patrols it. Two openings: the east stairwell's landing
(x[6,8], z=10, flush with the walkway's southern edge) and a cut-out in the
walkway's own decking at x[-8,-6] z[4,8] (the west stairwell's shaft — an
authored gap in the floor slab, not a wall). A hint scrawl sits at the west
opening's edge (~x=-7.5, z=3.5), and railing colliders (`level:'balcony'`)
line every open edge that isn't a real wall, a stair mouth, or the west
shaft (matching room11's "railings, not magic" rule).

### 2.4 Stairwells

- **STAIR_EAST**: x[6,8] z[10,16], axis `z`. `yLow=3.4` at `minZ=10`
  (`levelAtLow: 'balcony'`), `yHigh=0` at `maxZ=16` (`levelAtHigh:
  'ground'`). Flanked by real walls on both long sides (`wallZ(10,16,6)`
  inner face, `wallZ(10,16,8)` outer face closing the 1m gap to the east
  perimeter wall at x=9).
- **STAIR_WEST**: x[-8,-6] z[4,8], axis `z`. `yLow=3.4` at `minZ=4`
  (`levelAtLow: 'balcony'`), `yHigh=0` at `maxZ=8` (`levelAtHigh:
  'ground'`). This one is a hole cut straight through the balcony's own
  decking — its footprint is inside the balcony's `floor` rect, not outside
  it — so descending it means walking off the edge of the walkway proper
  into open shaft, down to the pocket floor below.

Neither stairwell's footprint is ever entered by either `ORDERLY-BALCONY`'s
or `ORDERLY-POCKET`'s patrol legs (checked in 2.6) — per 1.5, they'd
otherwise be at risk of a cosmetic float/sink glitch, and more importantly
a room author must keep them clear on principle until `patrol()` grows the
stairwell check proposed in 1.12.

### 2.5 The proof, concretely

`ORDERLY-BALCONY` (`level: 'balcony'`) and `ORDERLY-POCKET` (`level:
'ground'`) both have reachable footprints inside x[-9,9] z[-6,10] — the
*exact same rectangle* — at y=3.4 and y=0 respectively. Under the old
engine this rectangle could hold exactly one of them: `floorHeightAt(x,z)`
is single-valued, so either the whole rectangle is balcony height (and the
pocket floor beneath it simply doesn't exist as walkable space) or it's
ground height (and there's no balcony). Here both are simultaneously real,
independently patrolled, and — per 1.5's hard LOS gate — provably never
perceive each other or the player across the level boundary. That's the
capability being spent, not just flavor text describing it.

### 2.6 Orderlies

- **ORDERLY-SOUTH** (`level: 'ground'`) — back-and-forth loop `(5,25) →
  (5,18) → (-5,18) → (-5,25)`. Ambient south-hall threat; the crossing to
  the east stair mouth (x≈7, z=16) is a through-point, not a stand-and-read
  spot (see 2.8 on why that distinction matters).
- **ORDERLY-BALCONY** (`level: 'balcony'`) — loop `(6,8) → (6,-4) → (2,-4) →
  (2,8)`. Confined to x∈[2,6], well clear of the west stairwell hole
  (x[-8,-6]) and the hint scrawl at (-7.5,3.5).
- **ORDERLY-POCKET** (`level: 'ground'`) — loop `(6,9) → (6,3) → (0,3) →
  (0,9)`. Confined to x∈[0,6] — clear of the west wall (dispenser17c,
  along=9, i.e. at (-9,9)) and clear of the code-clue scrawl's safe-reading
  math (2.8).

### 2.7 Intended-solve walkthrough + pill economy

`TUNING.pills.max` is 1 — the whole game's economy is binary (0 or 1 pill),
so this room has exactly one lucid-gated action and the walkthrough is
short by construction:

1. `onEnter` forces `unmed` (free — matches every other room's "you come to
   mid-stride, raw" convention; costs nothing since lucid→unmed is always
   free regardless of what state the player left room16 in).
2. Top off at `dispenser17a` near spawn (0 spent, guaranteed 1/1).
3. Cross the south hall unmed, evading `ORDERLY-SOUTH`, reach the east
   stair mouth (x≈7, z=16).
4. Climb — plain movement, no state requirement — arriving on the balcony
   at (7,10), level flips to `'balcony'` automatically.
5. Cross the walkway unmed, evading `ORDERLY-BALCONY`. Optionally stop at
   the safe hint-scrawl spot (2.8) near the west shaft to read the timing
   hint.
6. Descend the west shaft; level flips back to `'ground'` on arrival at
   (-7,8).
7. Optional safety top-off at `dispenser17c` (redundant on a clean run,
   since nothing before the keypad costs a pill — see 2.9 for why it's
   there anyway).
8. Cross the pocket unmed, evading `ORDERLY-POCKET`, read the code-clue
   scrawl (safe distance, 2.8).
9. Shift lucid — **the only pill spend in the room** (1 → 0). Orderlies
   are inert/invisible; use keypad17, door opens.
10. Walk to the vestibule (lucid or unmed, both safe now), exit to room18.

Net cost: **exactly 1 pill**, spent once, at the very end — same shape as
most rooms in the game (room2, room5, etc.), the novelty here is entirely
in the crossing, not in a second gate.

### 2.8 Reaction-time audit

Every stand-and-read spot checked against `minInspectionDistance(2.5) =
(2.5 − 0.6) × 4.3 ≈ 8.2m` (kit.ts's formula) from the *nearest point on any
patrol leg* — clearing 8.2m also clears the orderly's raw 6m sight range
outright, so these are provably unseeable, not just "usually fine":

- **Code-clue scrawl**, pocket north wall (~x=1.5, z=-5.9), against
  `ORDERLY-POCKET`'s loop (nearest reachable point (1.5, 3), since x=1.5
  falls inside his x∈[0,6] range): distance = 3 − (−5.9) = **8.9m ✓**.
- **West-shaft hint scrawl**, balcony (~x=-7.5, z=3.5), against
  `ORDERLY-BALCONY`'s loop (nearest reachable point (2, 3.5)): distance =
  2 − (−7.5) = **9.5m ✓**.
- **Keypad17 itself** needs no reaction-time check at all: using it only
  ever happens lucid (unmed keypads refuse input, per the core vocabulary),
  and orderlies are categorically inert/invisible against a lucid player.
  This is true of every keypad in the game, not a room17-specific claim.

Through-points (the east stair mouth against `ORDERLY-SOUTH`, the balcony
landing against `ORDERLY-BALCONY`, the west-shaft ground landing against
`ORDERLY-POCKET`) are deliberately *not* held to the 8.2m standard — the
player is moving through them, not stopping to read, matching the existing
distinction rooms 5-12 already draw between a gate crossing and an
inspection point. None of them are unavoidable ambushes: nearest approach
distances are 2.2-7.1m, inside sight range but with cone + 0.6s grace still
giving a moving player room to react or fall back.

### 2.9 Soft-lock audit

**Every collider in room17 is `states: 'both'`** — no unmed-sealed gate
exists anywhere in this room (deliberately; the sealed wall is a *permanent*
wall, not a paid gate, so it needs no `'unmed'`-only variant). That means
`circleHitsSolidUnmed` can never find a trapped case anywhere in the room,
at any XZ, on either level — which makes the medication-timer audit
unconditional rather than case-by-case:

**The 45s timer expiring mid-crossing, including on the balcony:** if the
player shifted lucid at any point (e.g. to duck `ORDERLY-BALCONY`'s cone)
and the meter hits zero while still on the walkway, `updateMedication`'s
`circleHitsSolidUnmed` check finds nothing solid-while-unmed there — the
revert to unmed is instant and free, same as anywhere else in the room. The
player is now merely exposed (normal gameplay tension, per room13's own
precedent: "nothing dead-ends; it's retries"), never geometrically stuck.
Same reasoning holds mid-stairwell (interpolated Y, still no unmed-sealed
collider) and inside the pocket.

**0-pill entry to the pocket:** the rational line never arrives here with 0
pills (dispenser17a is free and on the only path out of spawn), but the
hard law requires it be survivable anyway. A 0-pill player reads the code
scrawl for free (unmed, always safe from the world), walks to `dispenser17c`
(west wall, comfortably clear of `ORDERLY-POCKET`'s loop — nearest patrol
point (0,9) is 9.05m from it), refills to 1, then proceeds normally. Not a
soft-lock.

**Catches:** every orderly's `onCaught` forces lucid, plays the catch
toast, and teleports to room spawn — critically, **with an explicit
`level: 'ground'`** (1.8's API note) — pills kept, matching every other
room. A catch on the balcony or in the pocket returns the player to the
south hall at ground level, not to a `(0,32)` XZ position while still
flagged `level: 'balcony'`.

### 2.10 Dispenser placement

- **`dispenser17a`** — south hall, east wall, along=31 (a few meters from
  spawn, outside `ORDERLY-SOUTH`'s z∈[18,25] loop range and outside his 6m
  sight range from any point on it: nearest patrol point (5,25) to (9,31) is
  7.2m). The room's only "before any lucid-gated action" dispenser —
  standard placement.
- **`dispenser17c`** — pocket, west wall, along=9 (i.e., at (-9,9)), right
  by the west shaft's ground landing (-7,8). This is the pressure-rule
  dispenser: **one per sealed pocket, near the near end** — the pocket has
  no walk-back to `dispenser17a` (the sealed wall + one-way stair logic
  make retracing the whole crossing the only alternative), so a mistimed
  revert or an unlucky 0-pill arrival here would otherwise mean a long
  return trip through both orderly zones. Placed at the pocket's entry
  point specifically so that trip is never required.

### 2.11 Voice samples

- `onEnter` toast: `"you come to mid-stride, raw. this ward doesn't stay on one floor."`
- Objective (initial): `"the day room stacks itself. climb before you can cross."`
- First unmed shift, one-time toast: `"three of them keep this ward. none of them use the stairs the way you do."`
- South hall flavor scrawl: `"they raised the roof\nso no one has to share a floor"`
- South hall flavor scrawl 2: `"the stairs are the only door\nthat opens both ways"`
- West-shaft hint scrawl (balcony): `"his floor creaks the same beat, every lap.\nseven strides north, he turns."`
- Code-clue scrawl (pocket): `"the last door remembers this:\n9 1 3 7"` (code `9137` — pick a value not already used elsewhere in the registry; verify against the full room1-16 list at implementation time, same caveat room11's header already flags for itself)
- `ORDERLY-SOUTH` catch: `'hands. a needle. "not even past the stairs," he says.'`
- `ORDERLY-BALCONY` catch: `hands. a needle. "the floor's not for guests," he says.`
- `ORDERLY-POCKET` catch: `hands. a needle. "back where the light doesn't reach," he says.`
- Keypad success toast: `` `${code}. two floors, one lock.` `` (built from the live `code`, not the literal string — randomize-codes convention)

### 2.12 Open questions for Tom

1. **Ceiling height tradeoff (1.12):** `ceilingY: 6.0` makes the south hall
   noticeably taller than every other room (4.38m headroom vs. the usual
   1.38m). Fine as an institutional-gothic beat, or worth an authored
   lower deck over the non-stacked areas so only the pocket/balcony feel
   tall?
2. **Three orderlies vs. two:** is `ORDERLY-SOUTH` pulling real weight, or
   is the south hall crossing padding before the room's actual hook (the
   balcony/pocket pair)? Could cut him and let the hall be a calmer
   approach, concentrating the "spike" on the stacked section.
3. **Permanent single-level orderlies (1.5, 1.12):** confirm this is an
   acceptable standing engine constraint before 18-20 are designed, in case
   a later room wants a patrol that also climbs stairs.
4. **The stairwell-hole "peek" side effect (2.3-2.5):** because the west
   shaft is a literal hole in the balcony's decking (not a solid ramp
   surface), standing at either end lets you see through to the other
   level for free — an emergent side effect of the geometry, not a
   built vision system. Intended freebie, or should it be blocked with an
   occluding-but-walkable grate mesh?
5. **`stairwell()`/`level()` as permanent kit API (1.9) and the
   `ROOM_AUTHORING.md` §8 rewrite** — land in the same change as the engine
   work, or as a fast-follow once room17 has proven the shape out?
6. **`/map.html` level-selector UX (1.10)** — tabs vs. a dropdown, ghost-
   layer opacity — implementation-detail bikeshedding, flagging so it
   doesn't get decided ad hoc mid-build.
