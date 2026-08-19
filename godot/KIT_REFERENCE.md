# Ward B — `Room` Kit Reference (`tools/gen_rooms.py`)

Exhaustive API reference for the `Room` DSL that generates every `.tscn`
scene under `rooms/`. If you are looking for *why* rooms are authored this
way at all, or for the invariants checklist, registration steps and
verification commands in prose form, see
[`ROOM_AUTHORING_GODOT.md`](ROOM_AUTHORING_GODOT.md) — this file is the
line-by-line method reference that doc points at.

## Table of contents

1. [Orientation](#1-orientation)
2. [The coordinate contract](#2-the-coordinate-contract)
3. [API reference](#3-api-reference)
   - [3.1 Geometry primitives](#31-geometry-primitives) — `wall_x` `wall_z` `block` `solid` `band_x` `band_z` `floor_y_under`
   - [3.2 Semantic presets](#32-semantic-presets) — `prop` `bed` `island` `shelf_row` `railing` `platform` `stair_steps` `chain_barrier` `tv_panel` `ward_lights`
   - [3.3 Content and fixtures](#33-content-and-fixtures) — `scrawl` `interactable` `light` `shape_key` `shape_lock` `light_switch` `icon_panel` `trigger` `plate` `mover` `push_block`
   - [3.4 Verticality](#34-verticality) — `height_zone` `ramp` `level` `stairwell` `has_verticality`
   - [3.5 Constructor and settable attributes](#35-constructor-and-settable-attributes)
4. [The material palette](#4-the-material-palette)
5. [Lighting](#5-lighting)
6. [The three state axes](#6-the-three-state-axes)
7. [A complete worked example](#7-a-complete-worked-example)
8. [Registration and verification](#8-registration-and-verification)

---

## 1. Orientation

A **`Room`** (`tools/gen_rooms.py`, class starts line 199) is a plain Python
object that accumulates lists — walls, props, interactables, scrawls,
lights, triggers, verticality data — through method calls in a `roomN()`
function. Nothing on a `Room` executes at game time; it is pure layout data,
identical in spirit to the Three.js build's `RoomDef`.

Every room is **two artefacts**:

| Artefact | Where | Contains |
|---|---|---|
| Layout | `tools/gen_rooms.py`, one `roomN()` function returning a `Room` | walls, props, fixtures, scrawls, lights, triggers, exits, spawn, verticality |
| Behaviour | `rooms/roomN/roomN.gd`, a plain `Node3D` script | keypad codes, orderly wiring, puzzle state, toasts — duck-typed `on_enter`/`on_interact`/`on_state_change`/`on_leave`/`on_trigger_enter`/`on_trigger_exit` |

A room becomes a scene by calling `Emitter(room).emit()` (`tools/gen_rooms.py`
line 999 onward), which walks every list on the `Room` and writes Godot
`.tscn` text directly — no scene is loaded or touched by the Godot editor
during generation. `write_room()` (line 1861) writes the result to
`rooms/<rid>/<rid>.tscn`, and `__main__` (line 4305) calls `write_room()` for
all 21 rooms in one run.

**The one-line rule: edit the generator, never the scene.** The `.tscn` is
build output. `tools/check_roundtrip.sh` regenerates every room and diffs
against what's committed — if you hand-edit a `.tscn`, that check fails, and
the very next `python3 tools/gen_rooms.py` silently reverts your edit with no
warning.

---

## 2. The coordinate contract

```
WALL_HALF = 0.12   # half-thickness of a 0.24m wall
WALL_H    = 3.0     # every wall's Y extent, floor to top
WALL_Y    = 1.5      # every wall mesh/collider's Y centre (WALL_H / 2)
EYE_HEIGHT = 1.62     # mirrors core/tuning.gd's PLAYER_EYE_HEIGHT
```

- **Y is up.** Floor `y=0`, eye height `1.62`, wall vertical centre `1.5`.
  Fixtures sit at `y≈1.45`, scrawls at `y≈1.6–1.7`.
- **+Z is toward spawn.** Every shipped room spawns the player at the
  high-Z end of its floor rect and puts the exit/staff door at the low-Z
  (north) end. Room content lives between them, decreasing in Z. This is
  authoring convention, not an engine rule — nothing is tuned for the
  reverse.
- **`wall_x(x0, x1, z)`** builds a wall that *runs along X* at a fixed `z` —
  a north or south cap. **`wall_z(z0, z1, x)`** runs along Z at a fixed `x`
  — an east or west side wall. Each is 0.24m thick, centred on the
  coordinate you pass; the two faces sit exactly `WALL_HALF` (0.12m) either
  side of that centreline.
- **Facing strings are axis-and-sign, not compass letters.** A wall-mounted
  fixture's `facing=` argument is one of `"nz"` `"pz"` `"nx"` `"px"` —
  which world axis the faceplate's outward normal points along, negative or
  positive. `FACING_ROT` (line 68) maps each to the yaw that achieves it: a
  Node3D's forward is -Z, so `nz` needs no rotation (`0.0`), `pz` is a
  half-turn (`π`), and `nx`/`px` are quarter-turns (`+π/2`/`-π/2`). When
  `facing` is omitted, `_resolve_facing()` (line 104) infers it from which
  axis the fixture's footprint is thin on plus which side of the room
  centre it sits — a heuristic that **misfires on alcove/nook mounts**. Room
  7's original MEDICATION dispenser is the shipped bug this caused (its
  plate ended up facing into a wall); every `shape_key`/`shape_lock`/
  `light_switch` preset now pins `facing` explicitly for exactly this
  reason.
- **Wall-face arithmetic — memorise these three lines, never hand-type a
  proud-of-the-wall coordinate:**

  ```
  wall face      = wall_at ± WALL_HALF        (±0.12)
  fixture centre = face ± thin / 2            (fixture sits flush, not sunk)
  scrawl / panel = face ± 0.03                 (DEFAULT_SCRAWL_PROUD, a decal gap)
  ```

  Worked instance, room15's shape lock (`tools/gen_rooms.py` line 3607): the
  north wall's face is at `z = -26.88`. The lock is `0.14m` deep, so its
  centre is `-26.88 - 0.14/2 = -26.81` — that's the exact `z` the shipped
  call uses. The icon panel two lines later sits at `-26.88 - 0.03 = -26.85`.

- **A furniture collider is a full-height, 3m wall segment — never a box
  shaped to the furniture's mesh.** Look at `Emitter.emit()`'s wall-emission
  loop (line 1126 onward): *every* collider, regardless of what `size` or
  `collider` rect it was authored with, is built as `csize = (w, WALL_H, d)`
  centred at `WALL_Y` (1.5). A 0.5m-tall crate's collider is still a
  0-to-3m-tall column. This is why: colliders in this game are **infinite in
  Y as far as gameplay is concerned** — `core/collision.gd`'s
  `WardCollision` never queries a collider's vertical extent, there is no
  jump, crouch, or any other Y-axis interaction with a solid. A short prop
  and a full wall are physically identical to the collision system; only the
  mesh differs. Corollary: **you cannot walk under a shipped prop, no matter
  how short it is drawn.** If a room ever needs that (e.g. crawling under a
  table), that would be new engine work, not a DSL parameter.

---

## 3. API reference

### 3.1 Geometry primitives

Everything else in this file — every semantic preset, every fixture helper —
bottoms out in these seven methods plus `interactable()`/`light()`
(§3.3). If the DSL cannot express a shape you need, extend one of these
methods; do not hand-edit the emitted `.tscn`.

#### `wall_x(x0, x1, z, mat="wall", state=None, level=None)`

A wall running along X at fixed `z` — a north/south cap. Always emits both a
mesh and a collider (there is no mesh-only or collider-only variant of
`wall_x`/`wall_z`; use `block()`/`solid()` for those).

- `x0, x1` — the wall's X extent (metres). `z` — its centreline.
- `mat` — material name (§4). Default `"wall"`.
- `state` — `None` / `"lucid"` / `"unmed"`. Wraps the node in a `StateObject`
  (visibility) and puts its collider on layer 4 (lucid-only) or 8
  (unmed-only) instead of layer 2 (`world_static`, always solid). See §6.
- `level` — a room-local stacked-level id string (§3.4); tags the collider so
  it is only solid on that level.

Emits: one `StaticBody3D` (name `W<i>` unless `state` wraps it, in which case
a `StateObject` Node3D wraps the body) with a `CollisionShape3D` child and a
sibling `MeshInstance3D`.

Real example — room1's cell shell (`tools/gen_rooms.py` line 1880):
```python
r.wall_x(-3, 3, 6)            # south
r.wall_z(0, 6, -3)            # west
r.wall_z(0, 6, 3)             # east
r.wall_x(-3, -1, 0)           # north, west of doorway gap
r.wall_x(1, 3, 0)             # north, east of doorway gap
```

#### `wall_z(z0, z1, x, mat="wall2", state=None, level=None)`

Same contract as `wall_x`, rotated: runs along Z at fixed `x` — an east/west
side wall. Default material is `"wall2"`, not `"wall"` — see §4 for why the
two wall materials exist as separate `.tres` files (they read as two
separately-painted runs, not the same texture repeated).

#### `block(size, pos, mat="wall", state=None, collider=None, name=None, level=None, light=None)`

A mesh, optionally with its own collider footprint. The general-purpose
primitive everything else composes from.

- `size` — `(width, height, depth)` in metres, world axes.
- `pos` — `(x, y, z)` mesh centre.
- `collider` — `None` (mesh-only) or `(min_x, max_x, min_z, max_z)`. Emitted,
  if present, as the same full-height wall-segment collider described in §2
  — **not** shaped to `size`.
- `light` — the **light axis** filter: `None` (always drawn), `"lit"` (dies
  when the room's breaker is thrown), or `"dark"` (glow-paint, invisible
  until dark). Wraps the mesh in a `core/light_object.gd` node. See §6.

**`block()` raises `ValueError` if `light` is `"lit"`/`"dark"` AND `collider`
is not `None`.** This is not a missing feature — it is the code expression of
the soft-lock guarantee: *the light axis gates meshes and raycasts only,
never collision*. If darkness could add or remove a solid, a dark room would
stop being geometrically identical to a lit one, and room 16's "a 0-pill
unmed player can always reach a dispenser in either light state" audit would
no longer hold unconditionally. If you need a permanent solid behind
disappearing paint, author the mesh and the collider as two separate calls —
`block(..., light="dark")` for the paint, `solid(...)` for the wall behind
it.

Real example — room1's state-gated doorway (line 1888), the room's central
teaching beat ("there is no door until the pill is taken"):
```python
r.block((2, 3, 0.26), (0, 1.5, 0), "wall", "unmed",
        collider=(-1, 1, -0.13, 0.13))
```

#### `solid(min_x, max_x, min_z, max_z, state=None, name=None, level=None)`

A collider with **no mesh**. Use for furniture whose visible mesh you author
separately with a wider or narrower footprint (an island's decorative ring,
a door slab whose collider is disabled/re-enabled by the room script).

`name` gives the `StaticBody3D` a stable node name so a room script can find
and mutate it later (a `door` collider unlocked by `main.unlock_door`, or a
`DeferredGate` re-engaged by name — room14's `GateCollider`).

No `light` parameter — for the same reason `block()` raises on the
combination: a collider is never light-gated in this game.

Real example — room3's locked exit (line 2012), gated purely by ward state,
never by the decorative chains drawn over it:
```python
r.solid(-1, 1, -5.12, -4.88, name="DoorCollider")
```

#### `band_x(x0, x1, z, y0=WALL_H, y1=None, mat="wall")` / `band_z(z0, z1, x, y0=WALL_H, y1=None, mat="wall2")`

Upper wall band, **cosmetic-only, no collider, no `state`, no `light`**
parameter at all — unlike every other geometry method, bands cannot be
state- or light-gated; they always draw. A two-storey room's ceiling sits
above the standard 3m wall height (`WALL_H`), so without a band the volume
above every wall is open into nothing above `y=3`. `y1` defaults to
`self.ceiling_y` (§3.5). No collider is emitted because containment is
already the 0–3m wall's job; a second collider on the identical XZ footprint
would be pure redundancy (colliders are already Y-infinite per §2).

Real example — room17 (two-storey, `ceiling_y=6.0`) closes its perimeter
above the standard wall height; see `tools/gen_rooms.py` around line 3320
onward for the `band_x`/`band_z` calls that follow every `wall_x`/`wall_z`
in that room.

#### `floor_y_under(x, z)`

Best-guess walkable floor height at `(x, z)`, used **only** to place a
ceiling fitting's floor-bounce light (§5) at the correct height under a
raised zone or gallery deck. Mirrors `core/levels.gd`'s precedence — ramps
beat height zones beat `base_y` — but **deliberately ignores stairwells**: a
bounce light belongs on a floor, not on a flight of steps whose height is a
function of where along it you stand.

Where `levels` (§3.4) are declared, the **highest** surface under the point
wins (`tools/gen_rooms.py` line 344 onward) — a ceiling fitting hangs from
the topmost level's ceiling, so that is the floor its bounce should land on.
You will not normally call this directly; `light()`/`ward_lights()` call it
internally for every bounce.

---

### 3.2 Semantic presets

Added later than the primitives above, as names for arithmetic conventions
that were previously *only* visible as repeated patterns across call sites.
Every preset here was reverse-engineered from real shipped call sites and
checked against every instance in the ward — the acceptance test for
introducing them was a byte-identical regenerate of all 21 rooms
(`tools/check_roundtrip.sh`). None of them invent a look nothing in the game
uses.

#### `prop(size, xz, name=None, mat="prop", state=None, level=None, y=None)`

A free-standing prop box: mesh **and** its own collider share one footprint,
the convention every hand-authored prop in the ward already follows (eleven
shipped instances across eight rooms — room1's nightstand, room3's two
tables, room4's two tables, room8's filing block, room9's desk and coatrack,
room12's cabinet, room14's crate, room18's console).

- `xz` — a plain `(x, z)` pair, **not** a 3-tuple. The mesh's `y` is
  *derived* as `size[1] / 2.0` unless `y` overrides it — a room author never
  computes `pos.y` or hand-expands the collider rect.
- `y` — overrides the derived half-height. Exists solely so `bed()` can
  reuse this method's collider math while reproducing a shipped rounding
  quirk (below). None of the eleven furniture instances above use it.
- No light-gating parameter: a light-filtered prop with a footprint collider
  is a combination nothing in the ward uses, and `block()` already refuses a
  light-gated collider outright.

**A twelfth instance is deliberately NOT converted to this preset**: room5's
seating block (line 2175) has a hand-typed collider `(4.95, 5.65, -1.2,
1.2)` whose midpoint is *one float64 ULP* off the `5.3` this method would
derive from `x ± size/2` — invisible at the collider's own 4-decimal
formatting, but it flips the sign of the mesh's now-not-quite-zero relative
offset, which `%.4f` then renders as `-0.0000` vs `0.0000` — a real byte
difference in the committed `.tscn`. It stays a raw `block()` call rather
than being "fixed" to fit the preset, because the acceptance test for
adding these presets was a byte-identical regenerate — nudging a shipped
number to match a new abstraction is exactly what that test forbids.

Real example — room1's nightstand (line 1899):
```python
r.prop((1, 0.8, 0.7), (-2.2, 4.7))
```

#### `bed(xz, facing="ew", name=None)`

room1's bed — the ward's only instance of bedroom furniture, `mat="bed"`
used nowhere else. Fixed footprint `(2.0, 0.55, 1.0)` (2m headboard run,
0.55m tall, 1m deep).

- `facing` — `"ew"` (east-west: width along X, the shipped orientation) or
  `"ns"` (north-south: width along Z, for a future Z-wall bed). Raises
  `ValueError` for any other value.

Calls `prop(size, xz, name=name, mat="bed", y=0.28)` — note `y=0.28`, **not**
the mathematically exact half-height `0.275`. The shipped `.tscn` has that
0.005 rounding baked in (someone hand-typed a round 2-decimal number
instead of computing `size.y/2`), reproduced verbatim rather than
"corrected", per the same byte-identical-regenerate constraint as `prop()`.

Real example — room1 (line 1898):
```python
r.bed((1.7, 4.6))
```

#### `island(min_x, max_x, min_z, max_z, core_width, name=None)`

The nurse-station/filing-island composite: room5's Nurse Station and room8's
East Ward island, the ward's only two instances, identical down to every Y
offset and thickness — only the footprint and the raised core's
along-width (`core_width`) differ (1.8m room5, 1.6m room8). Emits **six
nodes** from one call:

```
solid()      the ONE real footprint — the only thing an orderly's loop
             routes around, and the only collider in the group
block()      raised 'wall2' core counter, full height 2.0, y=1.0
block() x4   'prop' ring skirt, height 1.1, y=0.55, thickness 0.5,
             flush to the solid footprint's four edges
```

The ring is **mesh only** — nothing pathfinds around its individual pieces;
that's why one `solid()` beneath the whole thing is the only thing that has
to agree with the orderly's clearance math. `core_width` is the one number
not derivable from the footprint; the ring's own thickness/height/y and the
core's depth/y are shipped-identical constants baked into the method. The
south/north ring pieces run the footprint's **full** width; the west/east
pieces run **half** its depth, centred — confirmed against both shipped
instances, not assumed for symmetry.

Real example — room5's Nurse Station (line 2164):
```python
r.island(-2.2, 2.2, -1.3, 1.3, core_width=1.8)
```

#### `shelf_row(x_centre, z_centre, length, height, thickness=0.8, mat="wall2", name=None)`

A shelving/storage run along X — room4's tall occluder unit and room7's
three-row serpentine maze, four instances total. Depth (`thickness`, along
Z) is a **constant 0.8m** in every shipped shelf; only `length` and `height`
vary. Structurally identical to `prop()` (collider = mesh's XZ footprint,
`pos.y = height / 2`) — kept as its own method purely because "shelving" and
"furniture" read as different intents on the page, not because the math
differs.

Real example — room7's three-row maze (lines 2328–2330):
```python
r.shelf_row(-3.75, 2.2, length=4.5, height=2.6)
r.shelf_row(3.75, 0, length=4.5, height=2.6)
r.shelf_row(-3.75, -2.2, length=4.5, height=2.6)
```

#### `railing(axis, along_lo, along_hi, cross, platform_y, thickness=0.24, collider=True, level=None, name=None)`

A 0.9m-tall guard rail standing on a raised surface, at
`y = platform_y + 0.45` — the one fixed offset every railing in the ward
uses (rooms 11, 17, 19_lights; eleven boxes total). Always `mat="chain"`.

- `axis` — `"x"` or `"z"`: which world axis the rail *runs along*.
  `along_lo`/`along_hi` bound it on that axis; `cross` is its fixed position
  on the *other* axis. Raises `ValueError` for any other `axis`.
- `collider` — `True` (default: derives a collider matching the mesh's own
  XZ footprint), an explicit `(min_x, max_x, min_z, max_z)` 4-tuple to widen
  the collider *past* the mesh (room11's `RailWest` is the one exception —
  one physics run covering both the platform and the ramp treads below it),
  or `False`/`None` for a mesh-only segment with no collider at all (used
  for room11's short, individually-drawn ramp-side rail segments, which sit
  entirely inside `RailWest`'s one wide collider and would be pure
  redundancy if they had their own).
- `level` — tags the collider to a stacked level (§3.4). **An untagged rail
  over a stacked level blocks on every level**, which is catastrophic for a
  rail that should float only over the upper storey (see room17's own
  header comment for the full account) — always tag a railing that sits
  above a lower level.

Real example — room11's west rail, the one wide-collider exception (line
2998):
```python
r.railing("z", 0, 8, cross=1, platform_y=MEZZ_Y,
         collider=(0.88, 1.12, 0, 10), name="RailWest")
```
And a mesh-only ramp segment riding under that same collider (line 3003):
```python
r.railing("z", z_center - 0.25, z_center + 0.25, cross=1,
         platform_y=step_top, collider=False, name="RailWestRamp%d" % i)
```

#### `platform(min_x, max_x, min_z, max_z, platform_y, thickness=None, name=None)`

A raised floor's own opaque slab, top face landing **exactly** on
`platform_y`. Seven instances across three rooms (room11's `MezzSlab`,
room17's four-piece gallery deck, room19_lights's `PlatformSlab`/`LipSlab`).

**Structurally cannot emit a collider** — there is no `collider` parameter
at all, a stronger guarantee than a comment. A collider here would wall the
platform off instead of holding it up; what keeps a player on a raised
region is a `railing()`, authored separately (§2's "a raised region has zero
collision impact" rule).

`thickness` defaults to `platform_y` itself — the slab runs the full
floor-to-platform column, correct when nothing sits below (room11, room19).
Pass an explicit thin `thickness` when the platform's underside is itself a
ceiling over a lower pocket — room17's gallery deck passes `0.3` because
3.4m below is a room, not solid ground.

Real example — room11's mezzanine slab (line 2977):
```python
r.platform(1, 9, 0, 8, MEZZ_Y, name="MezzSlab")
```

#### `stair_steps(n, platform_y, width, run, cross, start, axis="z", name_fmt="Step%d", mat="wall2")`

**Purely cosmetic** stacked boxes standing in for a ramp — eighteen boxes
across three authorings (room11's four-piece `RampStep`, room17's six-piece
east stair and five-piece west shaft, room19_lights's three-piece
`RampStep`). A `BoxMesh` cannot tilt, so this dumb-stacks-boxes approach is
what *reads* as stairs.

**Never emits a collider, and never emits the walkable slope either** — the
real walkable ramp is a separate `ramp()` (or, across two levels, a
`stairwell()`) call that this preset does not know about and will not keep
in sync for you. Folding a `ramp()` call in here would be convenient right
up until its numbers silently diverged from this preset's — author them
side by side, as every shipped room does, so a mismatch is visible in one
diff.

Step `i` (0-indexed) rises to `platform_y * (i+1) / n`, centred `i * run`
back from `start` along `axis`. Every shipped instance uses `axis="z"`;
`"x"` is supported for symmetry but has no shipped call site verifying it.

Real example — room11's ramp dressing (line 2982), paired explicitly with
the `ramp()`/`height_zone()` call two lines above it:
```python
r.height_zone(1, 9, 0, 8, MEZZ_Y)
r.ramp(1, 9, 8, 10, "z", MEZZ_Y, 0)
r.platform(1, 9, 0, 8, MEZZ_Y, name="MezzSlab")
RAMP_STEPS = 4
r.stair_steps(RAMP_STEPS, MEZZ_Y, width=8, run=0.5, cross=5, start=9.75,
             name_fmt="RampStep%d")
```

#### `chain_barrier(xs, z, padlock_xz=None, height=2.7, thickness=0.06, padlock_size=(0.22,0.28,0.14), padlock_y=1.05, state="lucid")`

Hanging chain strands plus an optional padlock. Room3's exit chains are the
ward's **only** instance — five `"chain"`-material boxes, always
`states="lucid"`, and **never a collider**. This is the mechanic, not an
oversight: room3's own comment reads "the chains are a hallucination, they
never block anything" — the exit is truly locked by the `DoorCollider`
room3.gd disables on the unmed-only beat, never by the chains.

- `xs` — a list of strand X positions (room3 authors four, evenly spaced;
  nothing here assumes exactly four).
- Each strand is a thin box centred on `WALL_Y` (1.5, the standard wall
  midline), **not** on its own half-height — a hanging chain's centre is
  where it's anchored, not where its mass sits, which is why it bypasses
  `prop()` entirely.
- `padlock_xz`, if given, adds the stubby lock-reading box.

Real example — room3 (line 2018):
```python
r.chain_barrier([-0.7, -0.25, 0.25, 0.7], -4.95, padlock_xz=(0, -4.9))
```

#### `tv_panel(x, y, z, width, height, thickness=0.1, name=None)`

A wall-mounted TV, endless static — `"glow"` dressing only, **no
interactable, no collider**. Three instances (room4's day-room set, room5's
two waiting-room sets). `width`/`height` vary per instance (1.3×0.9 vs
1.1×0.8) but material and the thin flush-to-wall dimension (`0.1`) do not.
`y` is an independently authored mount height in every instance — there is
no derivable formula for it, so unlike `prop()` this preset does not compute
it.

Every shipped TV mounts on a `wall_x` wall (thin along Z); there is no
`wall_z`-mounted instance, so a swapped-axis variant is not offered — the
docstring says so explicitly rather than guessing at one.

Real example — room4 (line 2074):
```python
r.tv_panel(4, 2.25, -4.8, 1.3, 0.9)
```

#### `ward_lights(points, circuit=None)`

Plural convenience over `light()` (§3.3) — author a list of points once
instead of N `light()` calls. **Must never grow a second lighting look** —
see §5 for why there is exactly one lighting preset in this game.

- `points` — an iterable of `(x, z)` or `(x, z, y)` tuples. Use the 3-tuple
  form for a room with more than one floor height (room17, room19_lights),
  where a single default `y=2.7` would be wrong for some fittings.
- `circuit` — forwarded to every `light()` call it makes (§3.3, §5).

Real example — room13 (line 2885), using a Python list comprehension since
every fitting shares `x=0`:
```python
r.ward_lights([(0, z) for z in
              (20, 16, 10, 4, -2, -8, -14, -20, -24, -26, -29)])
```
And room16's bay circuit, the one shipped use of `circuit=` (line 4299):
```python
r.ward_lights([(0, 4), (0, 0), (-3, -4), (3, -4), (-3, -8), (3, -8),
               (-3, -11), (3, -11), (0, -15), (-10.0, -8.0), (10.0, -4.0)],
              circuit="bay")
```

---

### 3.3 Content and fixtures

#### `scrawl(text, pos, rot_y, size, sid=None, light=None, ink=None)`

Wall handwriting. **Always unmed-only** — every scrawl in a room is a child
of one shared `Scrawls` `StateObject` node (`visible_in_state=2`), not
individually wrapped.

- `text` — may contain `\n`; rendered as a `Label3D`.
- `pos`, `rot_y` — position and yaw. `_scrawl_tilt()` adds a small
  deterministic roll per scrawl so text doesn't read as perfectly
  billboard-flat.
- `size` — **not a world measurement**. It is a texture-scale carried over
  from the TS build's canvas-texture sizing; the emitter multiplies it by
  `0.0013` to get `pixel_size`. A size-3.4 scrawl at the naive first-guess
  scale rendered 1.5m *per line* — floor to ceiling for two lines — before
  this constant was tuned. Measure a scrawl's actual world span with
  `tools/measure_scrawls.tscn` if it needs to fit a specific wall run (room
  15's header documents the exact workflow).
- `sid` — a stable node name, so `main.update_scrawl_text(id, ...)` can
  rewrite it later (used by the randomize-codes contract — a scrawl showing
  a keypad code needs a stable id to be rewritten on room re-entry).
- `light` — `None`/`"lit"`/`"dark"`, on top of the always-unmed gate. A
  `light="dark"` scrawl is doubly gated: visible only while unmed **and**
  while the room is dark. Nests a `LightObject` wrapper *inside* the shared
  `Scrawls` `StateObject`.
- `ink` — `None` (default red-brown, `Color(0.62, 0.16, 0.12, 0.92)`) or
  `"phosphor"` (pale glow-green, joins the `phosphor` Godot group so
  `main.set_glow_fade`'s charge/fade dial dims it along with painted floor
  tiles). **Purely cosmetic** — `ink` does not affect visibility; `light`
  does. A phosphor scrawl with no `light` gate is simply green-inked text
  that is always there whenever any unmed player is.

Real example — room16's phosphor scrawl, both axes combined (around line
4270):
```python
r.scrawl("...", (-11.05, 0.80, -8.0), math.pi / 2, 1.1,
         sid="phosphorScrawl16", light="dark", ink="phosphor")
```

#### `interactable(iid, itype, size, pos, mat, label, state=None, facing=None, model_script=None, model_props=None, light=None)`

One fixture: an `Area3D` on the interactable layer (32), plus a visual
model. This is the primitive `shape_key`/`shape_lock`/`light_switch` (below)
all delegate to.

- `iid` — the interactable id, read by `main.gd`'s interact ray and matched
  in `roomN.gd`'s `on_interact(id)`.
- `itype` — a string the room script and `main.gd` branch on
  (`"dispenser"`, `"door"`, `"keypad"`, `"switch"`, `"shape_key"`,
  `"shape_lock"`, `"push_block"`, `"pill_cup"`, `"pill_pickup"`, ...).
- `size` — **world axes** (a wall-mounted fixture is thin on whichever axis
  it hangs off). Reordered to canonical (thin-in-Z) orientation internally
  via `_canonical_size()` before the model is built, based on the resolved
  `facing`.
- `mat` — material name, used **only** as a fallback plain-box colour. See
  the model-resolution order below — for every fixture type currently
  shipped, this fallback path is never actually reached (§4 flags the
  consequence for the `dispenser`/`keypad` material entries specifically).
- `state`, `light` — same semantics as `block()` (§6): `state` wraps in a
  `StateObject`, `light` in a `LightObject`, nested state-then-light when
  both apply. `Interactable.is_focusable()` walks the ancestor chain for
  either wrapper, so a light-gated fixture is refused by the interact ray as
  well as hidden — invisibility alone would not stop a raycast from finding
  an `Area3D`.
- `model_script`/`model_props` — an alternative to the `FIXTURES` table
  (below) for fixtures whose *look* is per-instance (shape and colour differ
  per shape key). A bare `Node3D` carrying the given script, handed
  `fixture_size` (the canonical, facing-corrected size) plus every
  `model_props` entry as an already-Godot-literal-rendered exported
  property. `script =` is emitted **before** the property lines — an
  exported property does not exist until the script that declares it is
  attached, and Godot applies `.tscn` property lines in order.

**Model resolution order**, per instance, decided in `Emitter.emit()`
(line 1330 onward):
1. `model_script` if given — a self-building fixture (shape_key/shape_lock).
2. Else the `FIXTURES` table entry for `itype`, if the fixture's `.tscn`
   exists on disk — a real composite model (dispenser, door, keypad, switch,
   pill_cup, pill_pickup), instanced and scaled from its authored canonical
   size to whatever the room asked for.
3. Else a plain `box_mesh(canon, mat)` — the only place `mat` actually
   renders anything for an interactable.

**`FIXTURES` (line 82) has a duplicate-key bug worth knowing about**: it is
a Python dict literal with **two** `"switch"` keys —
```python
"switch": {"path": "res://fixtures/switch.tscn", ...}   # line 89
...
"switch": {"path": "res://fixtures/breaker.tscn", ...}  # line 95
```
Python keeps only the last, so `FIXTURES["switch"]` always resolves to
`breaker.tscn`. `fixtures/switch.tscn` is a complete, independently-authored
fixture (it even has its own working `Lever` pivot node, matching
`breaker.tscn`'s), but it is currently **unreachable through the DSL** —
nothing in the ward can instance it. This does not break anything visible
(`breaker.tscn` has an equivalent `Model/Lever` path, so room16's and
room18's lever-throwing code works against either scene), but it means
`switch.tscn` is dead weight on disk and any future room author reaching for
"the switch fixture" by filename will find the wrong one wired up. Flag,
don't silently fix, if you touch `FIXTURES`.

Real example — room1's dispenser (line 1906):
```python
r.interactable("dispenser1", "dispenser", (0.55, 0.75, 0.16), (2.2, 1.45, 0.14),
               "dispenser", "MEDICATION")
```

#### `light(x, z, y=2.7, circuit=None)`

One ceiling fitting plus its floor bounce — see §5 for the full preset
this emits; there is exactly one lighting look in the game and this is the
only method that produces it.

- `circuit` — which breaker owns this fitting (`core/atmosphere.gd`'s
  `CIRCUITS` table). Omitted means the default `"house"` circuit, which
  nothing in the game ever switches — every room built before the light axis
  existed emits byte-identically and behaves identically. `circuit` is an
  authored string rather than an index or node name specifically because
  both of those get renumbered/regenerated across a room reload and a
  string does not.

Real example — room1 (lines 1917–1918), placed directly rather than via
`ward_lights()` since there are only two:
```python
r.light(0, 2)
r.light(0, 5)
```

#### `shape_key(kid, shape, color, pos, label="take it", size=(0.5, 0.9, 0.5))`

A free-standing shape-key pickup — room15's mechanic (ported from
`kit.ts`'s `shapeKeyProp`).

- **Always `state="unmed"`**, and that is the entire visibility design: the
  `StateObject` wrapper hides the prop while lucid, and
  `Interactable.is_focusable()` refuses the ray for a hidden node. There is
  no bespoke hiding code anywhere in the mechanic.
- **No collider** — a key is a raycast target only; a player walks through
  it and a patrol crosses it as bare floor.
- `facing` is pinned to `"pz"` — the room-centre inference heuristic is
  meaningless for a free-standing prop.
- `color` — a hex string (`"#3fa9dd"`) or an `(r,g,b[,a])` 0..1 tuple,
  converted by `_color_literal()`.
- Delegates to `interactable()` with `itype="shape_key"`,
  `model_script="res://fixtures/shape_key.gd"`, and `model_props={"shape":
  ..., "color": ...}` — the model script builds its own mesh from those two
  props, which is why shape and colour can differ per key without a
  `FIXTURES` entry per combination.

Real example — room15 (lines 3600–3602):
```python
r.shape_key("shapeKeyA", "circle", "#3fa9dd", (-10.5, 0.9, -0.3))
r.shape_key("shapeKeyB", "square", "#4caf6a", (10.5, 0.9, -12.3))
r.shape_key("shapeKeyC", "triangle", "#c1170f", (-10.5, 0.9, -20.3))
```

#### `shape_lock(lid, pos, facing, shapes, label="use the lock", size=(0.4, 0.5, 0.14))`

The wall fixture that opens a door once every listed shape is held.
Keypad-shaped and keypad-sized (`kit.ts` reuses `KEYPAD_FOOTPRINT`), **no
collider**, `facing` always **pinned** (never inferred).

`size` is in **world axes** like every other interactable — a north/south
wall mount needs `(along, height, thin)`, an east/west mount needs `(thin,
height, along)`; get this backwards and the fixture renders sideways.

Real example — room15 (line 3607):
```python
r.shape_lock("shape_lock15", (1.35, 1.45, -26.81), "pz",
             ["circle", "square", "triangle"])
```

#### `light_switch(sid, pos, facing, label="the breaker switch", size=(0.16, 0.6, 0.5))`

The room-wide lighting breaker — room16's mechanic (ported from `kit.ts`'s
`lightSwitch()`). Renders as `fixtures/breaker.tscn` via the `FIXTURES`
duplicate-key resolution described above.

`size` is world axes; `facing` is always pinned — a switch typically lives
on an alcove end cap, exactly the case the room-centre heuristic gets wrong.

**No `light` filter of its own, and this is deliberate**: the switch itself
is an always-present fixture in both light states — it has to be, or
throwing the room dark would delete the only way to throw it back. Whether
an *unmedicated* hand can use it is room policy, enforced in
`roomN.gd`'s `on_interact`, not by this method.

Real example — room16 (line 4283):
```python
r.light_switch("lightSwitch16", (11.0, 1.45, -4.0), "nx")
```

#### `icon_panel(pid, shapes, colors, pos, rot_y, size=2.4)`

The door-top shape-lock progress panel: one dim outline per shape, lit as
each key is collected. **Not an interactable, not state-filtered** — it
reads in both ward states, from across the room, unlike everything else in
this section.

- `size` — the quad's **width in metres, a real measurement** (unlike
  `scrawl`'s `size`, which is a texture scale). Height is `size /
  len(shapes)`.
- `colors` — hex strings or tuples, one per shape, converted via `_color()`
  and serialised as a flat `PackedColorArray` (four floats per colour, not
  four `Color()` literals — Godot's flat-array serialisation).
- `fixtures/icon_panel.gd` builds the quad and bakes its own texture; the
  room script rewrites it in place per pickup via `set_lit()`, the same
  pattern `main.update_scrawl_text` uses for scrawls.

Real example — room15 (line 3616):
```python
r.icon_panel("doorIcons15", ["circle", "square", "triangle"],
             ["#3fa9dd", "#4caf6a", "#c1170f"], (0.0, 2.6, -26.85), 0.0, 2.4)
```

#### `trigger(tid, min_x, max_x, min_z, max_z, state=None)`

A rectangular XZ sensor region (`core/trigger_volume.gd`). **Never emits a
collider** — a trigger is a floor-level sensor, polled per frame against the
player by `main.gd`'s `TriggerPoll` (strict point-in-rect on XZ, not a
physics overlap). Room scripts test their own actors (an orderly, a
pushable crate) against the same rect via `TriggerVolume.contains()`.

A degenerate rect (not `min < max` on both axes) can never fire —
`check_rooms.gd` rejects these.

Real example — room20 (lines 4070–4071):
```python
r.trigger("enterZ2", -6, 6, -16, 0)
r.trigger("vestibule20", -6, 6, -19, -16)
```

#### `plate(tid, min_x, max_x, min_z, max_z, state=None, y=0.02)`

Pressure plate — **one call, two shapes**: a `trigger()` plus the thin
flush `"plate"`-material box that marks it visually, sharing one footprint
so the visible plate and its firing bounds can never drift apart. Ported
from `kit.ts`'s `pressurePlate()`. `y` is the visual half-height, so the box
is `y*2` tall (4cm at the default) and sits flush at floor level.

**Deliberately no collider** — the mechanic, not an oversight: a plate must
stay walkable, and with no collider it never enters an orderly's collider
set, so a patrol crosses it as bare floor with zero special-casing in
`Orderly`.

Real example — room14, straddling the patrol line (line 3137):
```python
r.plate("plate14", -1.3, 1.3, -12.5, -11.3)
```

#### `mover(name, size, pos, mat="wall2")`

A wall that **moves at runtime** — mesh and collider welded into one body,
emitted as an `AnimatableBody3D` rather than `StaticBody3D`. Everything else
in the ward is a `StaticBody3D` because Godot treats that type as immovable
by contract; moving one is undefined behaviour to the physics server.
`AnimatableBody3D` means "static body, but code drives its transform" —
exactly room13's closing slabs.

`sync_to_physics` is left **off** deliberately — it exists so a moving body
can push a `CharacterBody3D` running `move_and_slide`, and nothing in this
game does that (`player.gd` has `collision_mask = 0`; position is written
directly by `WardCollision.try_move`). The room script owns both the
transform and the `WardCollision` box for a mover — see `rooms/room13/
room13.gd`.

Unlike `block()`, mesh and collider are the **same** box centred on the body
origin, so a room script moves both with one position write.

Real example — room13's squeeze corridor (lines 2875–2876):
```python
r.mover("SlabEast", (slab_thick, WALL_H, slab_len), (slab_x, WALL_Y, slab_mid_z))
r.mover("SlabWest", (slab_thick, WALL_H, slab_len), (-slab_x, WALL_Y, slab_mid_z))
```

#### `push_block(name, iid, cell_x, cell_z, size=0.86, height=None, mat="prop", label="push it")`

A pushable crate — room20's mechanic, and the only object in the ward that
is a solid, an occluder and a raycast target at once. Emits **one**
`AnimatableBody3D` with this exact hierarchy:

```
Crate                AnimatableBody3D, layer world_static
  Shape              CollisionShape3D — THE collider (never offset from the
                     body, so the body's transform IS the collider)
  Visual             Node3D — the ONLY thing the room tweens
    Mesh             MeshInstance3D
    <iid>            Area3D + Interactable, layer interactable
```

**The split between `Shape` and `Visual` is the whole point.** A push is
discrete: the collider must be at the destination cell the instant a push is
accepted, or a player following the crate can end up standing where the
solid AABB already is. Motion is cosmetic, so the room tweens `Visual`
(mesh + interact ray target together, so the crosshair never drifts off the
thing you can see) over ~0.18s while the body — and therefore the collider
— is already there.

- `size` — **XZ footprint only**, not a knob: every clearance number in a
  push-block room derives from it (0.86m inside a 1.0m cell leaves 0.07m
  margin per side).
- `height` defaults to `size` (a cube), but a block meant to be **cover**
  must override it — this is a real engine difference from the TS build, not
  a style choice. Godot's `Orderly._occluded()` casts a real `RayCast3D`
  from the orderly's eye (y 1.5) to the player's (y 1.62); a 0.86m cube
  blocks nothing at all. Cover has to be at least eye-high to be cover.
- No `states` filter, ever — the crate's design value is that it does not
  care which ward reality you're in.

Real example — room20's crate (line 4066):
```python
r.push_block("Crate", "crate", 2, 1, size=0.86, height=1.7,
             label="push the crate")
```

---

### 3.4 Verticality

One system (`core/levels.gd`), **two tiers**. Everything here has **zero
collision impact by itself** — a raised region is never a collider, only a
height the rendered Y eases toward; what keeps a player on it is an ordinary
wall or `railing()`.

#### Tier 1 — `height_zone` / `ramp` (folded into the synthetic `'__flat'` level)

```python
def height_zone(self, min_x, max_x, min_z, max_z, y)
def ramp(self, min_x, max_x, min_z, max_z, axis, y_low, y_high)
```

- `height_zone` — a flat raised (or sunken) rectangle at a fixed `y`.
- `ramp` — a sloped rectangle. `axis` (`"x"`/`"z"`) is the dimension the
  slope runs along; `y_low` is at that axis's **minimum** end. **Ramps beat
  height zones** where the two overlap — a ramp's endpoints can sit flush
  against an adjacent zone without the zone fighting it at the seam.

Real example — room11, one raised zone plus the ramp down from it (lines
2971–2972):
```python
r.height_zone(1, 9, 0, 8, MEZZ_Y)
r.ramp(1, 9, 8, 10, "z", MEZZ_Y, 0)
```

Real example — room19_lights, a platform with a lower "lip" and its own ramp
(lines 3916–3918):
```python
r.height_zone(2, 7, -8, -3, PLAT_Y)      # the platform: the breather
r.height_zone(2, 4.5, -3, -1, PLAT_Y)    # the lip, overlooking the floor
r.ramp(4.5, 7, -3, -1, "z", PLAT_Y, 0.0)  # climbs north, y 0 -> 0.9
```

#### Tier 2 — `level` / `stairwell` (genuinely stacked surfaces)

```python
def level(self, lid, base_y, floor, zones=None, ramps=None)
def stairwell(self, sid, min_x, max_x, min_z, max_z, axis,
              y_low, level_at_low, y_high, level_at_high)
```

**Declaring `levels` replaces the tier-1 fold entirely** — a room uses one
tier or the other, never both; a stacked room's zones/ramps belong to a
`level()` call's own `zones`/`ramps` arguments, not to the room-wide lists.

- `level(lid, base_y, floor, zones, ramps)` — one room-local named floor.
  `floor` (its own footprint rect) is used for spawn validation and
  tooling **only** — height resolution reads `base_y`/`zones`/`ramps`, never
  `floor`. **A raised level's own floor must also be authored as an opaque
  `block()`** whose underside becomes the ceiling for whoever stands below
  it — the engine draws exactly one ceiling plane per room, nothing else.
- `stairwell(sid, ..., axis, y_low, level_at_low, y_high, level_at_high)` —
  the connector between **exactly two** levels. `y_low`/`level_at_low`
  describe the axis's **minimum** end; `y_low`/`y_high` name ends of the
  axis, not relative heights — a stair descending as `z` increases has
  `y_low > y_high`. A traveller's level flips only on clearing the
  footprint end to end, never mid-stair; keep every orderly patrol leg out
  of a stairwell's footprint, since an orderly's own level is fixed for
  life and never flips.

Real example — room17, the ward's only two-level room (lines 3310–3316):
```python
r.level("ground", GROUND_Y, (-9, 9, -8, 34))
r.level("balcony", BALCONY_Y, (-9, 9, -6, 10))

# y_low/level_at_low name the AXIS's MIN end, not the lower height: both
# of these DESCEND as z increases, so y_low (3.4) > y_high (0).
r.stairwell("stairEast", 6, 8, 10, 16, "z", BALCONY_Y, "balcony", GROUND_Y, "ground")
r.stairwell("stairWest", -8, -6, 4, 8, "z", BALCONY_Y, "balcony", GROUND_Y, "ground")
```

`_validate_verticality()` (line 1589) runs at emit time and **warns**
(never raises — a half-built room should still generate) if: a level has
less than ~0.95m of headroom under `ceiling_y` (crawlspace territory,
`ROOM_AUTHORING.md` §8's ~1m rule); a stairwell's axis isn't `"x"`/`"z"`; a
stairwell's span along its own axis is zero or negative (the level flip can
never fire); a stairwell connects a level to itself; a stairwell names a
level the room never declared; or a collider is tagged with an undeclared
level id (inert forever).

#### `has_verticality()`

```python
def has_verticality(self) -> bool
```
`True` if any of `height_zones`, `ramps`, `levels`, or `stairwells` is
non-empty. Used internally to decide whether to emit the `Verticality`
metadata node at all — a flat room (most of the ward) gets none, and is
byte-identical to how it generated before this system existed.

---

### 3.5 Constructor and settable attributes

```python
Room(rid, name, floor, spawn, exits, script=None)
```

- `rid` — the room id, also the directory/file stem: `rooms/<rid>/<rid>.tscn`
  and (by default) `rooms/<rid>/<rid>.gd`.
- `name` — a human-readable room name (cosmetic; not read at runtime by
  anything this file emits).
- `floor` — `(min_x, max_x, min_z, max_z)`. Sizes the `Floor`/`Ceiling`
  meshes; does **not** by itself constrain where you can author walls or
  props — nothing checks that geometry stays inside it.
- `spawn` — `(x, z, yaw)`. Emits a `Marker3D` under `"Spawn"`. If the room
  declares `levels`, the spawn is metadata-tagged with the **first**
  declared level's id (`r.levels[0][0]`) — order your `level()` calls with
  that in mind.
- `exits` — `[(to_room_id, min_x, max_x, min_z, max_z), ...]`. Each becomes
  an `Area3D` on the trigger layer (64) under `"Exits"`, named `Exit<i>`.
- `script` — defaults to `"%s.gd" % rid`. **Never overridden** in any of the
  21 shipped rooms — even `room19_lights`/`room19_doors` (two scenes sharing
  one gameplay `room19` id via `ROOM_VARIANTS`, see §8) just use their own
  `rid`-derived script name. There is no shipped precedent for pointing two
  room ids at the same behaviour script.

Settable instance attributes (set directly on the returned `Room`, not
constructor arguments):

| Attribute | Default | Purpose |
|---|---|---|
| `start_dark` | `False` | Whether the room's lights are OFF when the player walks in — emitted as `metadata/start_dark` on the room root, read by `main.gd`'s `load_room` *before* the room enters the tree, so every `LightObject`'s first `_ready` frame is already correct. **No shipped room currently sets this to `True`** — room16's dark/light gameplay is entirely player-triggered via `light_switch()`, not an opening state. Documented and wired end-to-end, but genuinely unused today; verify with `grep -n start_dark tools/gen_rooms.py` before assuming a room uses it. |
| `ceiling_y` | `3.0` | Ceiling height. Read by `band_x`/`band_z`'s default `y1`, and by the headroom check in `_validate_verticality()`. **Must be set before any `band_*`/`level()` call** — those read `self.ceiling_y` at call time, not at emit time. Room17 is the only override (`6.0`, for its two-storey balcony). |
| `light_range` | `OMNI_RANGE` (`6.0`) | Per-room `OmniLight3D.omni_range` for every fitting the room's `light()` calls emit. |
| `light_attenuation` | `OMNI_ATTENUATION` (`2.3`) | Per-room `OmniLight3D.omni_attenuation`. See §5 for why these two constants exist and their drift history — **rooms 1–7 cannot currently be regenerated with correct lighting** using the class defaults; see the huge comment at line 244 before touching either default. |
| `shadow_extra` | `[]` | Extra shadow-casting fitting **indices** (0-based, in `light()` call order), on top of the `i % 3 == 0` default rule (§5). Rooms 4 and 5 each set `[1]` — a hand-promoted judgement call from commit `bafc584` the modulo rule cannot express; omitting it silently *demotes* those two rooms' lighting on a regenerate. |

Real example — room8 restoring the shipped falloff the class defaults have
drifted from (line 2446):
```python
r.light_range = 6.0
r.light_attenuation = 2.3
```

Real example — room4's hand-promoted shadow fitting (line 2052):
```python
r.shadow_extra = [1]  # hand-promoted in bafc584; see Room.shadow_extra
```

---

## 4. The material palette

Materials are referenced **purely by name** — `Emitter.mat(name)` (line
1010) builds an `ext_resource` pointing at `res://materials/<name>.tres`
with no validation that the name is meaningful; a typo just fails to load in
Godot. **`MATERIALS` (the dict at line 128 in `gen_rooms.py`) is not
consulted anywhere at generation time** — it is a historical record only
(the docstring on `write_materials()`, which is disabled and raises if
called, explains why: an earlier version of this file rewrote all 13
`.tres` files as flat `StandardMaterial3D` on every run, silently
overwriting the hand-authored triplanar `ShaderMaterial`s underneath them
for four commits before anyone noticed). **The `.tres` files under
`materials/` are the real source of truth for what a material name means**;
this table is built from them, not from the Python dict.

| `mat=` | What it is | Rooms/call sites | Notes |
|---|---|---|---|
| `wall` | Triplanar plaster, mottled/rusted, `wall_x`'s default | Every north/south cap in the ward | Paired with `wall2` for the two-tone effect below |
| `wall2` | Triplanar plaster, darker/cooler baseline, `wall_z`'s default; also `island()`'s core counter, `shelf_row()`'s default, `platform()`'s slab, `mover()`'s default | Every east/west wall + islands, shelves, platforms, movers | Deliberately a **separate** `.tres` from `wall`, not a recolour: "meant to read as two separately-painted runs, not one texture repeated" (wall2.tres header) |
| `ceil` | Triplanar water-stained ceiling tile | Every room's `Ceiling` mesh | Only ever used via `Emitter.emit()`'s hardcoded `Ceiling`/`Floor` nodes, never authored directly by a room |
| `floor` | Triplanar scuffed linoleum | Every room's `Floor` mesh | Same as `ceil` — not an author-facing `mat=` value in practice |
| `prop` | Triplanar beige moulded plastic/painted steel, `block`/`prop`/`shelf_row`'s default, `island()`'s ring skirt, `chain_barrier`'s... no, see `chain` below | Every free-standing prop | `roughness` lower than the enamel fixture materials (plastic sheen); `metallic_base = 0.0` |
| `bed` | Triplanar rusted tube-frame paint, warm rust-brown substrate | room1's bed **only** | `bed()`'s one dedicated material |
| `chain` | Triplanar bare dark iron, near-black, no paint layer | `chain_barrier()`, `railing()` | Both mechanics that read as "hanging/standing iron" |
| `pad` | Triplanar padded-cell fabric, tears instead of chips | `light_switch()`'s alcove wall recess in room16; passed as `mat=` to several `interactable(..., "keypad", ...)` and `shape_lock()` calls | **Fallback-only** for the keypad/shape_lock calls (see below) — those always resolve through `FIXTURES`/`model_script`, so `pad` renders only where authored directly via `block()` |
| `plate` | Triplanar dark steel plate, deliberately the **one** properly metallic material (`metallic_base = 0.45`) | `plate()`'s visual box | See the metallic rule below — this is the rescued exception, tuned specifically so a pressure plate reads as "installed steel," not "hole in the floor" (see plate.tres's own long header) |
| `door` | Painted-timber triplanar, `stretch_y=0.28` (elongated grain) | **Live, but not through `gen_rooms.py`** — see below | |
| `glow` | Flat unshaded `StandardMaterial3D`, warm cream, `emission_enabled` | `tv_panel()`, every vestibule "way out" glow strip, exit-adjacent decals | See the unshaded rule below |
| `pill` | Flat `StandardMaterial3D`, clean, no triplanar grime, teal-tinted emission | `interactable(..., "pill_cup"/"pill_pickup", ...)`'s `mat=` argument | **Live**, but again only through the fixture scenes, not the fallback path — `fixtures/pill_cup.tscn` and `pill_pickup.tscn` both `ext_resource` `materials/pill.tres` directly |
| `phosphor` | **Not a `.tres` file at all** — a `resource_local_to_scene` `StandardMaterial3D` sub-resource, one fresh instance per room scene | `block(..., mat="phosphor")`, `scrawl(..., ink="phosphor")` | See below |
| `breaker` | Flat `StandardMaterial3D`, dark grey, low roughness | **Dead** — see below | |
| `dispenser` | Triplanar chipped-enamel cabinet look | **Dead** — see below | |
| `keypad` | Triplanar small painted-steel casing | **Dead** — see below | |

### The three genuinely dead/near-dead entries

- **`breaker`** is the one entry that self-documents as dead: its own
  `.tres` header says "FALLBACK ONLY, and deliberately plain... In practice
  the switch always renders as `fixtures/breaker.tscn`... and this material
  is never drawn." It exists so a missing-fixture-scene fallback (§3.3's
  `FIXTURES` filtering: an entry is dropped if its `.tscn` is absent) never
  emits an `ext_resource` pointing at nothing.
- **`dispenser` and `keypad`** are unreferenced in a subtler way: not only
  does the `interactable()` fallback path never reach them (every shipped
  `"dispenser"`/`"keypad"` `itype` resolves through `FIXTURES` to a real
  composite scene), but **the fixture scenes themselves don't reference
  these `.tres` files either** — `fixtures/dispenser.tscn` and
  `fixtures/keypad.tscn` `ext_resource` their own per-part materials
  (`dispenser_body_mat.tres`, `dispenser_plate_mat.tres`,
  `dispenser_symbol_mat.tres`, `dispenser_glow_mat.tres`,
  `dispenser_tray_mat.tres`, `hardware_mat.tres`, and equivalents for
  keypad) under `fixtures/`, entirely independent of `materials/`. Verified:
  `grep -n materials/ fixtures/dispenser.tscn fixtures/keypad.tscn` returns
  nothing. `materials/dispenser.tres` and `materials/keypad.tres` are
  orphaned files.
- **`door`** sits in between: also unreachable via the `interactable()`
  fallback (every `"door"` `itype` resolves through `FIXTURES` to
  `fixtures/door.tscn`), but **the `.tres` file is genuinely alive** —
  `fixtures/door.tscn` does `ext_resource` `materials/door.tres` directly
  (alongside `wall2.tres` and `chain.tres`, for its frame and hinges).
  Passing `mat="door"` to `interactable()` is vestigial (the argument is
  stored but never rendered), but the material itself ships.

### The two hard rules

- **Metallic is unusable in this project.** `main.tscn` has no sky and no
  reflection probes — background and ambient colour only — so a metallic
  surface loses its diffuse term and gets no environment specular back to
  replace it. `chain.tres` at `metallic 0.8` rendered as a flat black slab
  during the original triplanar-shader port (`MIGRATION_NOTES.md`, "Two
  findings worth keeping"). Every material here is pinned to
  `metallic_base` 0.0–0.1 and sells "steel" via roughness and normal detail
  instead. **`plate.tres`'s `metallic_base = 0.45` is the one deliberate,
  rescued exception** — tuned specifically against `tools/plate_probe.tscn`
  because a pressure plate needs a moving specular sheen to read as
  "installed mechanism" rather than "paint on the floor," and the tradeoff
  was judged worth it for that one surface.
- **`glow` must stay unshaded** (`shading_mode = 0`). The original Three.js
  build used `MeshBasicMaterial` for every glow block precisely so a light
  panel reads at full brightness regardless of the room's own lighting; an
  early port made it a lit `StandardMaterial3D`, and glow panels dimmed
  along with the dark corridor around them — exactly backwards for an
  affordance whose entire job is staying legible in "close UNMEDICATED
  fog." `phosphor` (the local sub-resource, not a `.tres`) carries the same
  `shading_mode = 0` for the identical reason: paint that's only visible in
  the dark must not itself be dimmed by the dark.

### Why `phosphor` is a sub-resource, not an `ext_resource`

`main.set_glow_fade` (room16's charge/fade dial) writes this material's
alpha **at runtime**. A shared `.tres` would leak that write into the next
room to also use `mat="phosphor"` — exactly the bug the original Three.js
build avoided by cloning `MATERIALS.phosphor` once per room
(`src/game/world.ts`'s `phosphorBlockMats`).
`resource_local_to_scene = true` gives each **instance** of a room scene its
own copy, so the clone-per-room property holds by construction even if two
rooms are ever instanced simultaneously (e.g. in a headless test).

---

## 5. Lighting

**There is exactly one lighting preset in this game.** Every one of the 21
shipped rooms' `light()` calls — **183 authored positions in total** —
emits an identical pair of `OmniLight3D` nodes, for **366 `OmniLight3D`
nodes across the ward**. (The `ward_lights()` docstring in the source calls
this "366 fittings," which slightly overstates it: 366 is the *node* count —
183 ceiling fittings, each paired with one floor bounce — not 366 distinct
fitting positions. Verified by running every `roomN()` function and summing
`len(r.lights)`: 183, matching `183 × 2 = 366`.)

**The fitting** (`L<i>`):
```
light_color       Color(0.949, 1.0, 0.98, 1)
light_energy      0.95
omni_range        room.light_range (default 6.0)
omni_attenuation  room.light_attenuation (default 2.3)
y                 2.7 (or the 3-tuple's explicit y, via ward_lights)
shadow_enabled    true on every 3rd fitting (i % 3 == 0), or any index
                  listed in room.shadow_extra
shadow_bias       0.04
shadow_normal_bias 1.4
```

**The bounce** (`L<i>_bounce`), always emitted alongside, never shadow-casting:
```
light_color       Color(1.0, 0.79, 0.6, 1)   (warm-shifted, reads as
                                                bounced/absorbed light)
light_energy      0.3
omni_range        2.6
omni_attenuation  1.1
y                 floor_y_under(x, z) + 0.22  (relative to the actual floor
                                                under the fitting, not a flat
                                                constant — matters under a
                                                raised zone or gallery deck)
shadow_enabled    false
```

Shadows cost real frame time — measured 40% (10.9 → 6.5 fps) if every
fitting cast one, since an omni shadow is a six-face cube render and a room
can carry up to 8 lights. Only every third fitting casts by default; this
also reads closer to the concept art (one dominant source per area, the
rest fill) than an even shadow grid would.

**Document plainly: adding a second lighting look is a design decision, not
a parameter tweak.** `light_range`/`light_attenuation` are the only two
numbers a room may vary, and even those exist mainly to undo drift (see
below) rather than to create a distinct mood — no shipped room uses them for
a deliberately different *look*, only to match the one look correctly.

### The drift history that makes `light_range`/`light_attenuation` load-bearing

The class defaults (`OMNI_RANGE = 6.0`, `OMNI_ATTENUATION = 2.3` at the top
of the file) look like the *current* shipped values, but `Room.__init__`
(line 244 onward) sets **the same numbers** as its own instance defaults —
which is a trap, explained in full at the top of the file: an earlier
generator version emitted `9.0`/`1.7`, while every committed `room1`–`room7`
`.tscn` was hand-retuned to `6.0`/`2.3` directly in the scene files during a
later art pass and **never had that change ported back here**. Regenerating
rooms 1–7 today with `Room.__init__`'s literal defaults would revert their
lighting — the file was deliberately left holding the *old* values for those
seven, specifically so this change is provably a no-op for them, and rooms
4/5 additionally cannot be regenerated faithfully at all right now (that
same art pass hand-promoted them from 2 to 3 shadow-casting fixtures, which
`shadow_extra` now expresses, but only from room 8 onward is a room's
generated lighting known to exactly match what it ships). Room 8 is the
first room to explicitly restore the shipped values
(`r.light_range = 6.0; r.light_attenuation = 2.3`), and room 12 (74m
north-south, the largest room in the game) is what the current defaults
were screenshotted against. **Check a large room, not just room 1, before
touching either constant.**

---

## 6. The three state axes

The single most confusing part of this codebase. Three independent systems,
easy to conflate because two of them are set from the same argument.

### Ward state (`state=` → `None` / `"lucid"` / `"unmed"`)

Affects **both** visibility and solidity, from **one** argument, via **two
independent mechanisms that happen to agree**:

1. **Visibility** — a `StateObject` wrapper (`core/state_object.gd`) around
   the node, with `visible_in_state` set to `1` (lucid) or `2` (unmed). It
   subscribes to `StateManager.state_changed` and shows/hides its subtree.
2. **Solidity** — the collider's `collision_layer` is set to `4`
   (`solid_lucid_only`) or `8` (`solid_unmed_only`) instead of the default
   `2` (`world_static`, always solid). `WardCollision` reads the player's
   current state and only tests layers that apply.

These two mechanisms are **not the same code path** — one is a scene-tree
visibility toggle, the other is a physics layer bitmask read by an entirely
separate collision system. They agree only because `Room.block()` and
friends emit both from the single `state=` argument every time. **A
screenshot cannot tell you whether a state-gated wall blocks** — it only
shows whether the mesh drew; `tools/check_state_gates.tscn` instantiates the
real scene and probes `WardCollision` directly, which is the only way to
verify solidity.

### Light axis (`light=` → `None` / `"lit"` / `"dark"`)

Affects **meshes and raycasts only, never collision**. A `LightObject`
wrapper (`core/light_object.gd`) with `visible_in_light` set to `1` (lit) or
`2` (dark), nesting **inside** a `StateObject` wrapper when both axes apply
to the same node (`StateObject > LightObject > mesh`) — both ancestors have
to agree for anything to draw, since Godot hides a whole subtree when any
ancestor is invisible.

**A light-gated collider raises `ValueError`, not a silent no-op.**
`block()` checks this explicitly (`tools/gen_rooms.py` line 310) and refuses
to emit one; `solid()`/`wall_x()`/`wall_z()` don't even expose a `light`
parameter to try. This is the entire soft-lock guarantee expressed as code:
if darkness could add or remove a solid, a dark room would stop being
geometrically identical to a lit one — a player could get physically stuck
by a collider that only exists in one light state, with no way to see it
coming. Room 16's audit — "a 0-pill unmed player can always walk back to a
dispenser, in **either** light state" — depends on every dark room being
exactly as walkable as its lit twin, which is only guaranteed because the
axis cannot touch collision at all. If a room genuinely needs a permanent
solid behind disappearing paint, author the mesh (`light="dark"`, no
collider) and the wall (`solid()`, no light gate) as two separate calls.

### Level (`level=`)

A **stacked-floor tag** — a free-text string naming which `level()` a piece
of geometry belongs to (§3.4). **Not a collision bit at all** — it's
`metadata/level` on the collider node, read by
`WardCollision._level_tag_of`, because level ids are arbitrary room-local
strings and a collision layer mask is only 32 bits wide (already spoken for
by the seven layers in §2 of `ROOM_AUTHORING_GODOT.md`). An **untagged**
collider over a stacked room is active on **every** level — which is
correct for a shared perimeter wall, and catastrophic for a railing that
should float only over the upper storey (tag it, or a player on the lower
floor collides with a rail floating 3.4m above their head — room17's own
header works through this in detail).

---

## 7. A complete worked example

room1 ("the Cell", `tools/gen_rooms.py` line 1873) is small enough to walk
through end to end and touches shell, a state-gated door, props, scrawls,
fixtures, and lights. It has no verticality — flat rooms are the norm in the
ward — so a short addendum below borrows room11's *real*, shipped
verticality numbers to show where those calls would slot into a room that
needed them.

```python
def room1():
    r = Room("room1", "the Cell",
             floor=(-3, 3, -2, 6),        # the room's XZ footprint, for
             spawn=(0, 4, math.pi),       # Floor/Ceiling sizing only
             exits=[("room2", -1, 1, -1.9, -0.9)])
             # spawn: x=0, z=4 (high-Z end, "toward spawn"), yaw=pi
             #   (facing -Z, into the room, since the exit is at low Z)
             # exits: one Area3D at x[-1,1] z[-1.9,-0.9], routes to room2

    # --- SHELL: five walls close the footprint, with a gap left in the
    # north cap for the doorway.
    r.wall_x(-3, 3, 6)            # south cap, behind spawn
    r.wall_z(0, 6, -3)            # west wall
    r.wall_z(0, 6, 3)             # east wall
    r.wall_x(-3, -1, 0)           # north, west of doorway gap
    r.wall_x(1, 3, 0)             # north, east of doorway gap
    # the gap between the two north walls is x[-1,1] at z=0 — not yet
    # walkable; the block() below fills it conditionally.

    # --- THE STATE-GATED DOOR: a wall panel that exists ONLY while unmed —
    # "there is no door until the pill is taken." collider spans the same
    # x[-1,1] gap, ±0.13 rather than the usual ±0.12 (0.26m mesh depth vs
    # the standard 0.24m wall — an authored variance, not an error).
    r.block((2, 3, 0.26), (0, 1.5, 0), "wall", "unmed",
            collider=(-1, 1, -0.13, 0.13))

    # --- the vestibule beyond the doorway, and its "way out" glow marker
    r.wall_z(-2, 0, -1)
    r.wall_z(-2, 0, 1)
    r.wall_x(-1, 1, -2)           # caps the vestibule
    r.block((1.8, 2.6, 0.06), (0, 1.4, -1.84), "glow")

    # --- PROPS
    r.bed((1.7, 4.6))                        # the ward's only bed
    r.prop((1, 0.8, 0.7), (-2.2, 4.7))       # nightstand: mesh + collider
                                              #   share this one footprint

    # --- SCRAWLS (unmed-only, always)
    r.scrawl("don't\nswallow", (-2.85, 1.8, 4.7), math.pi / 2, 2.2)
    r.scrawl("there was a door\nhere once", (0, 1.9, 0.2), 0, 3.0)

    # --- FIXTURES: the pill cup (a raw interactable(), itype="pill_cup")
    # and the dispenser (itype="dispenser", resolves to the real composite
    # fixtures/dispenser.tscn — the "dispenser" mat= argument below never
    # actually renders; see §3.3/§4).
    r.interactable("cup", "pill_cup", (0.18, 0.22, 0.18), (-2.2, 0.92, 4.7),
                   "pill", "take the pill")
    r.interactable("dispenser1", "dispenser", (0.55, 0.75, 0.16), (2.2, 1.45, 0.14),
                   "dispenser", "MEDICATION")

    # --- LIGHTS: two fittings, placed directly (only two, so ward_lights()
    # would buy nothing)
    r.light(0, 2)
    r.light(0, 5)
    return r
```

**Verticality addendum** (not part of room1 — it's flat — but showing where
these calls would go, using room11's exact shipped numbers, §3.4):
```python
    # after the shell, before props: declare the raised zone and its ramp
    MEZZ_Y = 0.9
    r.height_zone(1, 9, 0, 8, MEZZ_Y)         # the raised rectangle itself —
                                                # zero collision impact
    r.ramp(1, 9, 8, 10, "z", MEZZ_Y, 0)       # the slope down from it

    # then, alongside the props/fixtures block: the platform's own opaque
    # floor (no collider — a collider here would wall it off) and the
    # cosmetic stepped dressing (no collider either — the ramp above is
    # what's actually walkable)
    r.platform(1, 9, 0, 8, MEZZ_Y, name="MezzSlab")
    r.stair_steps(4, MEZZ_Y, width=8, run=0.5, cross=5, start=9.75,
                 name_fmt="RampStep%d")

    # and the railing that's the ONLY thing keeping a player on the
    # platform — tag with level= if this were a genuinely stacked room
    # (it isn't here; height_zone/ramp are tier 1, no level tag needed)
    r.railing("x", 1, 9, cross=0, platform_y=MEZZ_Y, name="RailNorth")
```

---

## 8. Registration and verification

A room must be wired into **three** places, and missing one fails at
runtime rather than at generation time:

1. **`main.gd`'s `ROOM_SCENES`** — an entry `"roomN": "res://rooms/roomN/roomN.tscn"`.
   **This dictionary must stay a flat `id -> path` literal.**
   `tools/check_rooms.gd`'s `_parse_registry()` (line 87) reads it by
   opening `main.gd` as a **text file** and splitting lines on `:` — it does
   not evaluate GDScript at all. A nested value, a computed path, or
   anything that isn't a bare `"key": "value",` line on its own row breaks
   the parser silently (returns an incomplete dict, and every unparsed room
   fails `check_rooms`'s "every room resolves" check with no clear reason
   why). This is also why room19's two variant scenes live in the
   **separate** `ROOM_VARIANTS` table instead of nesting inside
   `ROOM_SCENES` — `room19` still gets one flat entry pointing at its
   default variant (`room19_lights`), purely so the exit-chain walk has
   something to resolve; `ROOM_VARIANTS` decides what actually loads based
   on the `"room18.power"` run-scoped flag.
2. **The upstream room's exit** must point at your new room's id — add
   `(your_rid, min_x, max_x, min_z, max_z)` to the previous room's `exits`
   list.
3. **`tools/gen_rooms.py`'s `__main__` block** (line 4305) — a
   `write_room(roomN())` call. Without it your room function exists but
   never regenerates; `room20` shipped without this for a while before
   anyone noticed.

### Verification, in order

```bash
cd godot
G=/Applications/Godot.app/Contents/MacOS/Godot

python3 tools/gen_rooms.py                         # regenerate every .tscn
tools/check_roundtrip.sh                            # confirms the regenerate above is a no-op
$G --headless --path . tools/check_rooms.tscn        # wiring, spawn clearance, exit chain, patrols
$G --headless --path . tools/test_mechanics.tscn     # state-gated geometry, trap guard, pill economy
$G --headless --path . tools/test_kit.tscn           # behaviour-kit suite, if the room uses orderlies/keypads
$G --headless --path . tools/check_state_gates.tscn -- <scene> <probes>   # state-gated collision, not visible in any screenshot
```

`check_rooms.tscn` in particular validates, per room: it resolves and
instantiates; its `Spawn` marker exists and isn't inside solid geometry in
*either* ward state; every exit target resolves to a registered room (or
`END`); the exit chain from room1 is unbroken and reaches every room;
interactable ids are unique within the room; trigger ids are unique and no
trigger rect is degenerate; and the collider cache is non-empty. It also
independently re-checks that every `materials/*.tres` is still a
`ShaderMaterial` with a shader assigned — the same "materials got silently
reverted to flat placeholders" failure mode `write_materials()`'s disabled
state exists to prevent (§4), caught a second way at validation time.

If you added a new `.gd` file with a `class_name`, run
`$G --headless --path . --import` **first** — a newly added `class_name`
script is invisible to a headless run until Godot's import pass registers
it, and the failure mode is misleading: the referencing script fails to
*parse*, so the test scene's root has no script, so nothing ever calls
`quit()`, and the run hangs with no output instead of printing a parse
error.
