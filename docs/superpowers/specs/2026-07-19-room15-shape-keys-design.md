# Room 15 — "the Sorting Room": shape keys

Status: design draft, not yet built. For review before implementation.
Placement: post-epilogue wing, room14 (pressure-plates, teach) → **room15
(this doc)** → room16 (light-axis) → room17 (stacked floors) → room18+19
(cross-room wiring) → room20 (pushable blocks, capstone).

## Player-experience summary

Three colored shape props — a blue circle, a green square, a red
triangle — sit in three L-shaped alcoves off the room's east and west walls.
Each only exists while you're **unmed** (states:'unmed', exactly like a wall
scrawl): while lucid the alcove looks empty, the prop simply isn't rendered.
Above the exit door, three dim outline icons wait, one per key, lighting up
solid the instant each is collected — the room's only "progress bar," legible
from across the floor.

The three alcoves escalate:

1. **Blue circle** — a straight walk-in, no threat at all. Teaches the beat:
   walk the dogleg, round the corner you can't see past from the mouth, take
   the shape.
2. **Green square** — the alcove sits inside an orderly's patrol territory.
   Nothing forces a specific instant; you cross the open floor lucid (free
   safety), go raw at the mouth, and **read his loop** before committing to
   the dash — there's a long, slow, generously-telegraphed danger window and
   a much longer safe one.
3. **Red triangle** — a second orderly hugs this alcove's mouth on a short,
   fast loop with almost no warning runway. The corner is the only real
   safety: once you're past it (inside the alcove's second leg), he
   can never see you, full stop — but the leg between the mouth and that
   corner is genuinely watched, for real seconds, not a formality. This is
   the timed dash the mechanic doc asked for.

Getting caught anywhere costs a walk back to spawn (forced lucid,
teleported, pills kept) — same as every other room. **Collected keys are
never reset by a catch or a re-entry**, matching "pills kept": once an icon
is lit, it stays lit for the rest of the room, even after being dragged back
to spawn twice.

The exit is a new fixture, `shape_lock`, replacing the keypad: lucid-only to
touch (a "smear of static" while unmed, same flavor as every keypad in the
game), and it opens the door once all three keys are held — no code, no
digits, just a count.

## Engine additions

| File | Addition |
|---|---|
| `src/rooms/types.ts` | `InteractableType` gains `'shape_key' \| 'shape_lock'`. `InteractableDef` gains two fields, meaningful only on `type: 'shape_key'`: `shape?: 'circle' \| 'square' \| 'triangle'`, `color?: string` (hex). New `ShapeSpec { shape; color }` and `IconPanelDef { id; shapes: ShapeSpec[]; pos; rotY; size? }` (mirrors `ScrawlDef`'s shape). `RoomDef` gains `iconPanels?: IconPanelDef[]` — optional/additive, absent ⇒ no panels, identical to every room shipped before this exists. |
| `src/game/world.ts` | Two new mesh builders in the `loadRoom` interactable switch: `buildShapeKey(it)` (a small colored flat prop — see below) and `buildShapeLock(it, floor)` (a wall composite, `resolveFacing`-aware like `buildKeypad`, whose faceplate shows the *outline* of the required shapes, static — the panel does the lighting-up, not the lock body). `shape_key` meshes join the existing `animated` bob list (same idle tell as `pill_pickup`). New `iconPanelEntries: Map<string, { mat: THREE.MeshBasicMaterial; def: IconPanelDef; lit: boolean[] }>`, populated in `loadRoom` from `def.iconPanels`, each backed by one `PlaneGeometry` + `makeIconPanelTexture(def.shapes, lit)` (a new canvas-draw function, sibling to `makeScrawlTexture`: draws each shape as a stroked outline at low opacity, filled + glowing where `lit[i]` is true). New `World.updateIconPanel(id, lit: boolean[])`: rebakes that panel's canvas texture in place, byte-for-byte the same trick as `updateScrawlText` (dispose old map, assign new, `needsUpdate = true`). No new render tech — same CanvasTexture-in-a-PlaneGeometry machinery every fixture already uses. |
| `src/game/context.ts` | `GameCtx` gains `updateIconPanel(id: string, lit: boolean[]): void`, alongside the existing `updateScrawlText`. Narrow surface preserved — this is a rewrite-in-place call, not a door into the engine. |
| `src/main.ts` | Wire `updateIconPanel: (id, lit) => world.updateIconPanel(id, lit)` next to the existing `updateScrawlText` wiring. Register `room15: { def: room15, script: room15Script }` in the `rooms` record. |
| `src/rooms/kit.ts` | Three new helpers (below): `shapeKeyProp()`, `iconPanel()`, `shapeLockDoor()`. |
| `src/devtools/map.ts` | `MODULES` += `room15`. `TYPE_COLORS` += `shape_key` (one swatch per instance, colored by `it.color ?? '#ffffff'` rather than a fixed type color — override in `drawInteractables` when `it.color` is present) and `shape_lock` (fixed swatch, e.g. `#e07fd9`). New layer `{ id: 'iconpanels', label: 'door icon panels' }` + `drawIconPanels(g, def)`: one small square marker per `ShapeSpec` in reading order at the panel's `pos`, colored per shape, with a title listing `shape_lock`'s required set — same "descriptive data only" spirit as the existing layers. |
| `src/rooms/room15.ts` (new) | The room itself. |
| `ROOM_AUTHORING.md` | New kit-reference entries for `shapeKeyProp`/`iconPanel`/`shapeLockDoor`, once built — same treatment `keypadDoor` gets today. |

### Why this needs no change to the pill/state/orderly systems

- **Visibility-gating is free.** `states: 'unmed'` on an `InteractableDef`
  already hides its mesh (`World.groups[it.states ?? 'both']`) and already
  skips it in `Interaction.update`'s raycast (`states !== 'both' && states
  !== state`). A shape key is not a special case — it's the same mechanism
  room10's unmed-only gate blocks already use, just on a pickup instead of a
  wall.
- **Persistence across catch is free.** `makeOrderlyRoomScript`'s
  `onCaught` only forces lucid + teleports + toasts; it never touches room
  state. Held-keys bookkeeping is a plain closure variable inside
  `room15Script` (`const held = new Set<'circle' | 'square' | 'triangle'>()`)
  — nothing resets it unless the room script explicitly does, and this
  script never will. This is the exact same guarantee `doorUnlocked` in
  room10 already relies on for staying `true` across a catch.
- **Occlusion is free.** The alcove's own bounding box, passed as an
  `Orderly` occluder, already makes anyone standing inside it provably
  unseeable — no new geometry-vs-sightline code, same trick as
  `NOOK_A`/`NOOK_B` in room10.

### Kit helper signatures (for `src/rooms/kit.ts`)

```ts
// A free-standing colored flat-shape prop — not wall-relative like
// dispenser()/keypad(), since keys sit mid-alcove on the floor, not
// mounted flush to a wall face. states is forced 'unmed': the whole point.
export interface ShapeKeyOpts {
  id: string;
  shape: 'circle' | 'square' | 'triangle';
  color: string; // hex
  pos: [number, number, number];
  label?: string; // default 'take it'
  size?: [number, number, number]; // default [0.5, 0.9, 0.5], footprint for raycast + pedestal
}
export function shapeKeyProp(opts: ShapeKeyOpts): FixtureDef; // states: 'unmed' always

// A door-top progress panel — wall-relative like scrawl(), dim outlines by
// default, GameCtx.updateIconPanel(id, lit) rewrites it in place.
export interface IconPanelOpts {
  id: string;
  shapes: ShapeSpec[]; // left-to-right order
  size?: number; // default 2.4
  y?: number;
}
export function iconPanel(side: WallSide, wallAt: number, along: number, opts: IconPanelOpts): IconPanelDef;

// The full shape-lock assembly — parallel to keypadDoor, no code, a count
// instead. Bundles the door, the shape_lock wall fixture, every shape_key
// prop, and the icon panel into one call; owns the held-set.
export interface ShapeLockDoorOpts {
  doorId: string;
  // door geometry — identical fields to KeypadDoorOpts (side/wallAt/along/
  // width/height/depth/hinge/openDepth/openPos/openRotY/doorLabel)
  lockId: string;
  lockSide?: WallSide; lockWallAt?: number; lockAlong: number; lockLabel?: string;
  keys: Array<{ id: string; shape: 'circle' | 'square' | 'triangle'; color: string;
                pos: [number, number, number]; pickupToast: string }>;
  iconPanelId: string; iconPanelSide: WallSide; iconPanelWallAt: number; iconPanelAlong: number;
  refusalToastUnmed?: string; // default matches every keypad's static-refusal line
  refusalToastIncomplete?: (have: number, need: number) => string;
  successToast?: string; successObjective?: string;
}
export interface ShapeLockDoorLock {
  door: FixtureDef; lock: FixtureDef; keys: FixtureDef[]; iconPanel: IconPanelDef; collider: ColliderDef;
  heldCount(): number;
  isAvailable(id: string): boolean; // door never directly interactable; a picked-up key id stops resolving once removed
  // Handles: any key id (unmed-only, engine already gates that) → add to
  // held set, ctx.removeInteractable(id), ctx.updateIconPanel(...), toast;
  // the lock id → unmed refusal / incomplete toast / full unlock (same
  // moveInteractable + collider-disable + toasts + telemetry pattern
  // keypadDoor.handleInteract already implements).
  handleInteract(id: string, ctx: GameCtx): boolean;
}
export function shapeLockDoor(rb: RoomBuilder, opts: ShapeLockDoorOpts): ShapeLockDoorLock;
```

`room15Script` becomes `makeOrderlyRoomScript({ orderlies: [...], extraScript:
{ isAvailable: (id) => lock.isAvailable(id), onInteract: (id, ctx) =>
lock.handleInteract(id, ctx) } })` — the same composition shape room10 uses
for `keypadDoor`, just swapped for `shapeLockDoor`. No hand-written
`onInteract` branching per key needed in the room file itself.

## Room layout sketch

Floor `x ∈ [-9, 9]`, `z ∈ [-27, 6]` (18m × 33m). Spawn `(0, 5)`, facing
north (yaw 0). Exit door + vestibule at the north end, mirroring every
other room's convention. Five zones, south to north:

```
z= 6 ┌─────────────────────────┐  Z0 entry hall (spawn, dispenser15a)
     │            ^spawn        │
z= 2 ├─────────────────────────┤
     │  ◤KEY A (blue circle)    │  Z1 — safe, no orderly
     │  L-alcove, west wall     │
z=-6 ├─────────────────────────┤
     │        orderly B    ◢KEY B (green square)
     │        loop          L-alcove, east wall
z=-14├─────────────────────────┤  Z2 — patrol-reading
     │  ◤KEY C (red triangle)  │
     │  L-alcove, west wall     orderly C loop (tight, hugs west wall)
z=-22├─────────────────────────┤  Z3 — timed dash
     │  dispenser15c  shape_lock + door + icon panel (north wall)
z=-27└─────────────────────────┘  Z4 — exit chamber, no orderly
     ┆ vestibule ┆
z=-29└───┘
```

No walls gate Z0→Z1→Z2→Z3→Z4 — this room's forced oscillation comes from
the keys' unmed-only existence and the patrols guarding two of them, not
from unmed-sealed doorways like rooms 10-12. There is exactly one hard
lucid-only gate: the `shape_lock` fixture itself.

### Universal L-alcove geometry (all three keys share these proportions)

Each alcove is a **dogleg**: a straight entry leg (`leg1`, visible from the
room, aligned perpendicular to its wall) that dead-ends into a **blind
turn** onto a second leg (`leg2`, parallel to the wall, hidden from the
mouth by the corner). Standing in `leg1` is real, unshielded floor;
standing in `leg2` is provably unseeable (its AABB is the orderly's
occluder). The key prop sits at `leg2`'s far cap — you cannot see it, let
alone reach it, without rounding the corner.

- Mouth width `MW = 1.6m`, leg1 depth `D1 = 1.8m`, leg2's opening width
  (the gap in leg1's inner wall, at leg1's far/blind end) `LW = 1.4m`, leg2
  depth `TL = 1.8m`. Same numbers room10 already uses for its straight
  nooks (`1.8×1.6` footprints) — just folded into two segments instead of
  one, per Tom's "real step up from the straight nooks" ask.
- Glow lintel over every mouth (`glow` block, matching room10's playtest-6
  fix — "a lit threshold marks 'there is a space here'").

**Key A** (blue circle, west wall `x=-9`, safe): mouth `z:[-3.4,-1.8]`.
`leg1`: `x:[-10.8,-9], z:[-3.4,-1.8]`. `leg2` (turns south): `x:[-10.8,-9.4],
z:[-1.8,0.0]`. Key prop at `(-10.5, 0.9, -0.3)`. **No orderly anywhere near
Z1** — this alcove is deliberately zero-threat; it exists to teach the
dogleg-navigation beat, not to test it.

**Key B** (green square, east wall `x=9`, patrol-reading): mouth
`z:[-10.8,-9.2]`. `leg1`: `x:[9,10.8], z:[-10.8,-9.2]`. `leg2` (turns
north): `x:[9.4,10.8], z:[-12.6,-10.8]`. Key prop at `(10.5, 0.9, -12.3)`.
`leg2` only is passed as orderly B's occluder AABB; `leg1` is real,
watched ground.

**Key C** (red triangle, west wall `x=-9`, timed dash): mouth
`z:[-18.8,-17.2]`. `leg1`: `x:[-10.8,-9], z:[-18.8,-17.2]`. `leg2` (turns
north): `x:[-10.8,-9.4], z:[-20.6,-18.8]`. Key prop at `(-10.5, 0.9,
-20.3)`. `leg2` only is orderly C's occluder AABB.

### Orderlies

**Orderly B** (Key B, patrol-reading tier) — a wide rectangle that never
enters either alcove, with exactly one leg walking dead-on toward Key B's
mouth:

```
waypoints: (-6,-10) → (7.2,-10) → (7.2,-6.5) → (-6,-6.5) → [loop]
```

The `(-6,-10)→(7.2,-10)` leg runs straight along `z=-10` — Key B's mouth
sits at the same `z`, so his forward vector points dead-on at it the whole
leg (bearing 0°, not just "in range some of the time"). The other three
legs face north, west, and south respectively — the alcove (due east, ~90°
off any of those headings) is outside his 55°-cone regardless of distance.
Perimeter ≈33.4m, loop period ≈22.3s at his 1.5 m/s patrol speed.

**Orderly C** (Key C, timed-dash tier) — a short, tight rectangle, same
shape, closer and faster-cycling:

```
waypoints: (1.5,-18) → (-7.6,-18) → (-7.6,-14.4) → (1.5,-14.4) → [loop]
```

The `(1.5,-18)→(-7.6,-18)` leg is the dead-on approach to Key C's mouth
(`z=-18` matches the mouth's center). Perimeter ≈25.4m, loop period
≈16.9s — visibly faster and tighter than orderly B's, on purpose.

Both loops keep every waypoint ≥1.28m clear of the nearest wall face
(comfortably over the kit's 0.5m minimum) and never enter either alcove's
footprint — implementation should re-verify with `patrol()` once these are
real `rb.colliders`; the numbers above are the design target, not a
pre-validated waypoint list.

### Fixtures

- `dispenser15a` — west wall, Z0, `(-8.86, 1.45, 4)`. Flush-mounted, no
  recess (Z0 is fully safe).
- `dispenser15b` — a shallow straight recess (not a dogleg — it's a
  dispenser, not a key) off the west wall at Z1/Z2's boundary,
  `x:[-10.14,-9], z:[-7.4,-5.8]`, south of orderly B's reach. Dispenser at
  `(-10.14, 1.45, -6.6)`, facing `'px'`.
- `dispenser15c` — west wall, Z4, `(-8.86, 1.45, -24)`.
- `shape_lock15` — north wall beside the door, `(1.35, 1.45, -26.81)`.
- `exitdoor` — north wall, `(0, 1.5, -27)`, `2×3×0.2`, collider gap
  `x:[-1,1], z:[-27.1,-26.9]`.
- `doorIcons15` (icon panel) — `(0, 2.6, -26.94)`, `size 2.4`, shapes
  `[{circle,#3fa9dd}, {square,#4caf6a}, {triangle,#c1170f}]` in that order —
  left-to-right matches the room's own south-to-north difficulty order, a
  small legibility gift ("read the panel like you read the room").
- Vestibule beyond the door, `z:[-29,-27]`, glow block at the far end —
  standard pattern.

## Intended-solve walkthrough — exact pill economy

Worst case at entry (rigorous baseline): **unmed, 0 pills** — nothing
guarantees a topped-off arrival from room14. `TUNING.pills.max = 1`, so the
player only ever holds at most one pill at a time; every count below is
exact, not "up to."

1. Spawn `(0,5)`, unmed, 0 pills. Walk to `dispenser15a`. **Refill: 0→1.**
2. Enter Z1. No orderly. Key A already visible (already unmed). Walk
   mouth→leg1→leg2, interact: **Key A collected.** Icon 1 (blue circle)
   lights. State: unmed, 1 pill. *(0 pills spent so far.)*
3. Approach the Z1/Z2 boundary. **Shift unmed→lucid: −1 pill → 0.**
   *(Forced shift #1.)*
4. Cross Z2's open floor lucid — fully invisible, zero risk regardless of
   orderly B's position — to Key B's mouth.
5. At the mouth, **shift lucid→unmed (free)**. Watch orderly B's loop from
   outside Z2 (or just track his position — the HUD's threat/warning system
   already telegraphs this) until he's on any of the three safe legs. Dash
   mouth→leg1→leg2; the pickup interaction itself happens inside leg2
   (occluded, no time pressure once there). Interact: **Key B collected.**
   Icon 2 lights. State: unmed, 0 pills.
6. Retreat leg2→leg1→mouth (timed the same way) back to `dispenser15b`.
   **Refill: 0→1.**
7. **Shift unmed→lucid: −1 pill → 0.** *(Forced shift #2.)*
8. Cross the rest of Z2 and all of Z3's open floor lucid (safe) to Key C's
   mouth.
9. **Shift lucid→unmed (free)** right at the mouth, timed so orderly C is on
   his slow far side, not his dead-on approach leg. Dash mouth→leg1→leg2;
   interact inside leg2: **Key C collected.** Icon 3 lights. State: unmed, 0
   pills, all three keys held.
10. Retreat the same way into Z4 (no orderly ever reaches Z4). Walk to
    `dispenser15c`. **Refill: 0→1.**
11. **Shift unmed→lucid: −1 pill → 0.** *(Forced shift #3.)*
12. Interact with `shape_lock15` (lucid, 3/3 held) → door unlocks → walk the
    vestibule → exit to room16.

**Total: 3 forced unmed→lucid shifts, 3 dispenser stops, one immediately
before each shift.** Exits with 0 pills (nothing requires topping off again
before leaving).

Lower bound, for completeness: the *only* mandatory shift is step 11 (the
`shape_lock` is hard lucid-gated); a player who times every crossing
unmed-and-unseen never needs steps 3/7 at all, and could finish the room
having spent exactly 1 pill total. The 3-shift walkthrough above is the
comfortable/intended route, not the floor.

## Soft-lock audit

- **0-pill unmed player can always reach a dispenser.** `dispenser15a` sits
  in Z0/Z1, before any threat exists at all — reachable from spawn with zero
  risk regardless of pill count. `dispenser15b` sits south of orderly B's
  loop, reachable from the Z1/Z2 boundary without crossing his covered
  floor. `dispenser15c` sits in Z4, which no orderly ever enters. Every
  lucid-gated crossing (into Z2, further into Z3, up to the `shape_lock`)
  has its refill stop already covered before it's needed.
- **The 45s medication timer expiring inside a deep alcove.** If it expires
  while the player is in `leg2` (either guarded alcove), the free
  lucid→unmed revert is completely safe there — `leg2` is the orderly's
  occluder AABB, so `segmentHitsAABB` reports occluded regardless of the
  player's exact position or the orderly's facing; nothing can see in.
  Walking back out afterward, unmed, carries the same exposure `leg1`
  always carries — not a new problem, exactly the room's designed risk, and
  never a dead end (see next bullet).
- **If it expires in `leg1`, the open floor, or mid-dash.** The player
  reverts to unmed (already unmed, in most of these scenarios, or free if
  they were lucid) and is subject to ordinary orderly detection — the same
  risk as walking there in the first place. Worst case is a catch: forced
  lucid + teleport to spawn, **pills kept, keys kept**. This is the
  load-bearing fallback the hard laws call out by name — a catch is a
  costly re-cross, never a trap.
- **No unmed-sealed wall exists anywhere in this room** (unlike rooms
  10-12's gates), so there is no pocket a player can be sealed inside
  raw with no pill and no way out. The only hard gate is the
  `shape_lock`, and it only blocks forward progress (through the door), never
  backward movement.

## Reaction-time audit

The standard rule (`grace 0.6s + dist/chaseSpeed(4.3) ≥ 2.5s`, i.e.
`dist ≥ ~8.2m`, from `minInspectionDistance()`) targets **forced, static
inspection points** — a scrawl or keypad the player must stop and read with
no ability to watch the threat first. Key alcoves are not that: the player
is mobile, can observe the patrol from a distance before committing, and
chooses their own entry timing. Applying the same rule wholesale would
misdescribe the room, so this audit splits by what kind of spot each one
actually is:

- **`leg2` (both guarded alcoves) — provably safe, not just distant.**
  Passed as the sole occluder AABB, so `segmentHitsAABB` reports occluded
  for any point inside it regardless of the orderly's position or facing.
  Effectively infinite reaction time. **This is also where the actual pickup
  interaction happens** in the intended solve — `leg1` is transited, not
  stood in.
- **`leg1` (both guarded alcoves) — deliberately exposed, by design, not an
  oversight.** Key B's mouth sits 1.68m from orderly B's nearest patrol
  point (his stopping waypoint `(7.2,-10)`); Key C's mouth sits 1.28m from
  orderly C's `(-7.6,-18)`. Both fail the 8.2m guideline outright — on
  purpose. If either orderly is on his dead-on approach leg (or paused at
  its end) when the player enters `leg1`, worst-case reaction time is
  `0.6 + 1.68/4.3 ≈ 0.99s` (Key B) or `0.6 + 1.28/4.3 ≈ 0.90s` (Key C) —
  genuinely too fast to react to *if you walked in blind*. The room never
  asks the player to walk in blind: both loops telegraph their dangerous leg
  visibly (the orderly turns and starts walking straight at the alcove), and
  a full safe window exists on the other 3/4-ish of each loop. Concretely:
  orderly B's dangerous window is ≈3.68s of continuous in-cone-and-in-range
  exposure per 22.3s loop (≈16.5% duty cycle); orderly C's is ≈3.95s per
  16.9s loop (≈23.3% duty cycle) — shorter total loop, higher duty cycle,
  closer stopping point: measurably tighter, matching the "timed dash"
  escalation over Key B's "patrol-reading" tier.
- **Key A's alcove — no orderly in Z1 at all.** Both legs are safe
  unconditionally; the audit is vacuous by construction.
- **`shape_lock15`, `dispenser15c`, the icon panel — Z4 has no orderly.**
  Same as room10's final keypad chamber; safe unconditionally.
- **`dispenser15a`/`dispenser15b`** sit outside both orderlies' patrol
  footprints entirely (>10m from orderly B's loop, >15m from orderly C's) —
  safe by distance, comfortably clearing 8.2m.

## Dispenser placement (pressure rule)

Per "one per sealed pocket, at the near end" (room12's `dispenser10c`
precedent): each of this room's three dispensers sits at the **entrance**
side of the stretch it covers, not buried past the danger —

- `dispenser15a`: before any threat exists (Z0/Z1) — covers the very first
  lucid-gated crossing (into Z2) for a 0-pill arrival.
- `dispenser15b`: at Z2's near (south) edge, before orderly B's loop, not
  past it — a mistimed Key-B attempt means retreating a short, already-safe
  distance, not a long walk back through his floor.
- `dispenser15c`: Z4, the near end of the room's final pocket (mirrors
  `dispenser10c` exactly) — a mistimed revert after Key C or a fumbled
  `shape_lock` attempt is a short walk, not a re-cross of Z3.

## Voice samples

Lowercase, second person, terse dread — matching every existing room's
scrawls/toasts.

- Room objective (onEnter): `the sorting room. it wants three shapes back
  before it lets you go.`
- Zone hint near Key A: `something small waits\nwhere the wall turns`
- Zone hint near Key B: `he walks past it\nmore than he watches it`
- Zone hint near Key C: `the corner is the only\npart of you it can't own`
- Key A pickup toast: `a circle. cold in your hand.`
- Key B pickup toast: `a square. he didn't turn around.`
- Key C pickup toast: `a triangle. you're already moving before you feel it.`
- Icon panel scrawl (beside the door, static flavor text, not the panel
  itself): `it wants three shapes back`
- `shape_lock` refusal, unmed: `the lock is a smear of static. it's not
  reading shapes right now — it's not reading anything.`
- `shape_lock` refusal, incomplete (lucid, `n` of 3 held): `it wants three
  shapes back. you have {n}.`
- `shape_lock` success: `three shapes, three small thefts. the door
  remembers none of it.`
- unmed-state toast (first shift to unmed, matches the kit default):
  `something throws a shadow that keeps his shape.`
- orderly-caught toast: `hands. a needle. "you dropped something," he
  says — you didn't.`

## Open questions for Tom

1. **Icon panel visual weight** — should the dim/unlit icon state read as
   pure outline (near-invisible until lit), or a faint filled silhouette
   that brightens? Outline-only reads cleaner from a distance; filled-faint
   is easier to notice as an objective marker on first entry. Leaning
   outline-only per "dim by default," but worth confirming before the
   canvas function is built.
2. **Collection order** — nothing in this design hard-gates the order keys
   are collected (a lucid player could in principle detour and grab Key C
   first). Is that acceptable, or should Key C's zone be walled off until
   A+B are both held (an unmed-sealed gate, room10-style) to guarantee the
   escalation is actually experienced in order on a first playthrough?
   Current design leans "allow any order" — the room's one-way layout
   already makes A→B→C the path of least resistance without forcing it.
3. **Orderly B/C waypoint numbers are a design target, not validated
   geometry.** They need to be re-checked against the kit's `patrol()`
   clearance validator once this is real code (`rb.colliders` will include
   the alcove bracket walls, which aren't in this doc's back-of-envelope
   clearance check). If the real numbers don't hold the stated duty-cycle
   ratios, the loop shapes may need retuning in playtest — flagging now so
   it isn't a surprise later.
4. **Should `dispenser15b`'s recess be a straight nook (as written) or
   should it also be a small dogleg**, purely for visual consistency with
   the room's whole "everything has a corner" motif? Leaning straight (it's
   a dispenser, not a key — room10 doesn't dogleg `ALCOVE_B` either), but
   flagging since this room is otherwise unusually corner-heavy.
5. **Color-blindness accessibility** — the icon panel and key props lean
   entirely on hue (blue/green/red) to distinguish keys, with shape as the
   only redundant cue (circle/square/triangle). Shape should already cover
   this, but worth an explicit sign-off that shape-only legibility (panel
   rendered in grayscale) is enough before this ships.
