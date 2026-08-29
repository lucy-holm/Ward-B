# Ward B — Room Authoring (Godot)

The Godot analogue of the repo-root `ROOM_AUTHORING.md`, which documents the
Three.js kit. Read this one when you are changing anything under `godot/`.

### The Godot doc set

| Doc | Use it for |
|---|---|
| [`TUTORIAL_NEW_ROOM.md`](TUTORIAL_NEW_ROOM.md) | **New here? Start there.** A room from nothing to verified, with real commands and real output |
| **This file** | The guide — conventions, invariants, registration, verification, map viewer |
| [`KIT_REFERENCE.md`](KIT_REFERENCE.md) | Exhaustive reference for the `Room` layout DSL: every method, material, preset |
| [`BEHAVIOUR_KIT.md`](BEHAVIOUR_KIT.md) | Exhaustive reference for `kit/`: orderlies, keypad locks, availability, design laws |
| [`MIGRATION_NOTES.md`](MIGRATION_NOTES.md) | Why this port deviates from idiomatic Godot, and quirks that look like bugs but are not |
| [`PROP_KIT.md`](PROP_KIT.md) | The handcrafted prop library in `props/`: what is in it, how to place it, how to add to it |

**The one thing to know before you touch a room:** the `.tscn` files are
**build output**, not source. `tools/gen_rooms.py` is a declarative Python
DSL that generates every room scene, and a full run reproduces all 21
committed scenes byte-for-byte. Editing a room in the Godot editor is
silently reverted the next time anyone regenerates — no conflict, no warning.
Author rooms by editing the `roomN()` functions in `gen_rooms.py`.

(`MIGRATION_NOTES.md` §1 used to say the opposite. It was wrong, and that
mistaken instruction is the reason this file exists.)

---

## 1. Mental model

A room is **two artefacts**, exactly like the Three.js build:

- **Layout** — a `roomN()` function in `tools/gen_rooms.py` returning a
  `Room`. Pure data: walls, props, fixtures, scrawls, lights, triggers,
  exits, spawn, verticality. Nothing in it executes at game time; it is
  compiled to a `.tscn` ahead of time.
- **Behaviour** — `rooms/roomN/roomN.gd`, a plain `Node3D` script. Puzzle
  state, keypad codes, orderlies, toasts. Duck-typed: `main.gd` calls
  `on_enter(main)`, `on_interact(id) -> bool`, `on_state_change(next)`,
  `on_leave()`, `on_trigger_enter(id)` / `on_trigger_exit(id)` if present.

The split is the same one the TS build makes between `RoomDef` and
`RoomScript`, and for the same reason: layout is auditable data, behaviour is
not.

### What each layer gives you

| Layer | Where | Use it for |
|---|---|---|
| `Room` DSL | `tools/gen_rooms.py` | everything geometric |
| Behaviour kit | `godot/kit/*.gd` | orderlies, keypad locks, availability wiring |
| Engine systems | `godot/core/*.gd` | collision, levels, triggers, shape locks, light axis |

Do not reach past a layer. If a room needs geometry the DSL cannot express,
add a method to `Room` — do not hand-edit the emitted scene.

---

## 2. Coordinate conventions

Identical to the Three.js build, and the constants live at the top of
`gen_rooms.py` rather than being retyped:

- **Y is up.** Floor `y=0`, eye height `1.62`, wall height `WALL_H = 3.0`,
  wall vertical centre `WALL_Y = 1.5`. Fixtures sit at `y ≈ 1.45`, scrawls at
  `y ≈ 1.6–1.7`.
- **+Z is toward spawn.** Every room spawns the player at the high-Z end and
  puts the exit door at the low-Z (north) end. Content lives between them, in
  −Z. This is convention, not an engine rule, but nothing is tuned for the
  other orientation.
- **Walls are 0.24 m thick**, centred on the coordinate passed to
  `wall_x`/`wall_z`. Each face sits exactly `WALL_HALF = 0.12` from that
  centreline.
- **Wall-mounted things sit proud of the face, never embedded:**

  ```
  wall face      = wall_at ± WALL_HALF      (±0.12)
  fixture centre = face ± thin/2            (flush: touching, not sunk)
  scrawl / panel = face ± 0.03              (a decal gap)
  ```

  Derive from the constants, never from a typed-out number — that is what
  keeps placement from drifting room to room.

- **A furniture collider is a full-height wall segment**, not a box around
  the furniture. Colliders are infinite in Y in this game (`core/collision.gd`
  — there is no vertical collision anywhere), so every prop's collider is
  emitted at height `3.0` centred at `1.5` with the prop's XZ footprint. The
  prop presets do this for you; if you hand-roll a `block()`, match it.

---

## 3. Coordinate → collision layers

State-conditional geometry is expressed by **collision layer**, and
visibility by a **`StateObject` wrapper**. These are two independent
mechanisms that happen to agree because the generator emits both from one
`state=` argument.

| Bit | Name | Meaning |
|---|---|---|
| 1 | `player` | |
| 2 | `world_static` | always solid |
| 4 | `solid_lucid_only` | solid only while LUCID |
| 8 | `solid_unmed_only` | solid only while UNMEDICATED |
| 16 | `orderly` | |
| 32 | `interactable` | ray target, never blocks |
| 64 | `trigger` | never blocks |

**A screenshot cannot tell you whether a state-gated wall blocks** — it only
shows whether the mesh drew. Use `tools/check_state_gates.tscn`, which
instantiates the real scene and probes `WardCollision` directly.

**A light-gated collider is an error, not an option.** The light axis
(`core/light_object.gd`) gates meshes and raycasts only. If darkness could
add or remove a collider, a dark room would stop being geometrically
identical to a lit one and room 16's "a 0-pill unmed player can always walk
back to a dispenser in either light state" audit would stop being
unconditional. `Room.block()` raises if you try.

---

## 4. Checklist of invariants

Marked **[auto]** where something actually enforces it; the rest are on you.

- [ ] **Sealed shell.** Wall runs must actually close the floor footprint. No
      validator checks this — walk the perimeter in game.
- [ ] **[auto] Patrol clearance > 0.5 m.** `tools/check_rooms.tscn` fails if
      any waypoint *or any leg between waypoints* passes within
      `ORDERLY_RADIUS + 0.1` (0.4 + 0.1) of an always-solid collider. This is
      the wedge bug that shipped twice — an orderly's body catches a corner
      mid-leg and freezes there forever. Fix the geometry; never lower the
      clearance. It walks every constant named `WAYPOINTS*`, so multi-orderly
      rooms are covered.
- [ ] **[auto] Fixtures and scrawls proud of the wall face.** The presets
      derive from `WALL_HALF`. Hand-placed ones must too.
- [ ] **One reachable dispenser per lucid-gated action.** If the only way
      forward needs LUCID (almost always a keypad), a dispenser must be
      reachable from spawn *without already being lucid*. In a room with an
      orderly it must also be reachable without crossing the patrol loop, or
      the "safe" refill is not safe. This is the single most important
      economy rule; violating it is a soft-lock.
- [ ] **Reaction time ≥ 2.5 s at any inspection point.** Anywhere the player
      must stop and read (a scrawl, a keypad), worst-case time-to-contact must
      be at least 2.5 s: `grace (0.6) + distance / chase_speed (4.3) ≥ 2.5`,
      i.e. **distance ≥ ~8.2 m** from the nearest point on any patrol leg.
      `KitDesign.min_inspection_distance()` computes it from `Tuning` rather
      than hard-coding 8.2 — use it, so a future speed change re-derives
      instead of silently invalidating every room's comment.
- [ ] **Randomize-codes wiring (any room with a keypad).** Mandatory — the
      start-screen toggle silently skips unwired rooms. See §6.
- [ ] **[auto] Byte-for-byte round trip.** `tools/check_roundtrip.sh` must
      pass. If it fails, someone hand-edited a `.tscn`.
- [ ] **Reversible trigger-held gates** must defer closing while a body still
      overlaps the gate footprint, rechecked per frame — closing onto a body
      freezes it. `core/deferred_gate.gd` exists for exactly this; room 14 is
      the worked example.

---

## 5. Registering a room

Three places, and missing one fails at runtime rather than at build:

1. `main.gd` — an entry in `ROOM_SCENES`. Keep it a **flat `id -> path`
   dictionary**: `tools/check_rooms.gd` parses this block as *text*, so a
   nested value breaks the validator. Variant rooms go in the separate
   `ROOM_VARIANTS` table for this reason.
2. The **upstream** room's exit must point at your id.
3. `tools/gen_rooms.py` — a `write_room(roomN())` call in `__main__`, or your
   room silently never regenerates. (`room20` was missing this for a while.)

---

## 6. The randomize-codes contract

The CONFIGURATION panel has a "randomize keypad codes" toggle, off by
default, persisted in `user://settings.cfg`. A keypad room that does not wire
this up is **silently skipped** — no error, the toggle just does nothing
there. All 10 keypad rooms currently comply; keep it that way.

1. Hold the code in a mutable `_code`, seeded from a `FIXED_CODE` constant,
   and read it live at `main.open_keypad(_code, ...)`.
2. Give each code-clue scrawl a stable id, and in `_regenerate_code()`:
   early-return unless `WardCodes.is_randomize_codes_enabled()`, then
   `_code = WardCodes.random_code_4()` and
   `main.update_scrawl_text(id, WardCodes.code_clue_text(_code[, mask]))`.
   Split clues call it twice with `[0,2)` and `[2,4)` masks.
3. Call `_regenerate_code()` first thing in `on_enter` **and last** in the
   catch handler, if the room has an orderly. A caught player must not keep
   the old code.
4. If the success toast quotes the code, build it from the live `_code`.

`KitKeypadLock` (`kit/keypad_lock.gd`) does all of this for you.

---

## 7. Verticality

One system, two tiers, both through `core/levels.gd`:

- **Tier 1 — height zones and ramps.** The walkable floor height is a
  single-valued function of (x, z). **Zero collision impact**: a raised
  region is never a collider, only a height the rendered Y eases toward. What
  keeps the player on it is ordinary walls and railings, which are ordinary
  colliders.
- **Tier 2 — levels and stairwells.** Two walkable surfaces over the same XZ,
  disambiguated by a per-traveller `level` string. Level is deliberately not a
  function of (x, z) — that is the point — and only changes by walking a
  stairwell end to end.

Declaring `levels` **replaces** the tier-1 fold: a room uses one or the
other, never both. A multi-level room must pass `to_level` on every
catch/reset teleport, or the player keeps their old level.

Platform slabs carry **no collider** — a collider there would wall the
platform off instead of holding it up.

---

## 8. Verification

Run all of these after any room change. None is optional, and none of them
looks at a pixel.

```bash
cd godot
G=/Applications/Godot.app/Contents/MacOS/Godot

tools/check_roundtrip.sh                      # generator still reproduces every scene
$G --headless --path . tools/check_rooms.tscn      # wiring, spawn clearance, exit chain, patrols
$G --headless --path . tools/test_mechanics.tscn   # state-gated geometry, trap guard, pill economy
$G --headless --path . tools/test_kit.tscn         # the behaviour kit's own suite
$G --headless --path . tools/check_state_gates.tscn -- <scene> <probes>   # state-gated collision
```

### Adding a new `class_name` file? Run `--import` first

A newly added script that declares a `class_name` is **invisible to a
headless run** until Godot has done an import pass to register it in
`.godot/global_script_class_cache.cfg` (and to write the script's `.uid`
sibling — every script here has one; they belong in the commit).

```bash
$G --headless --path . --import      # after adding any new class_name file
```

Skip it and the failure mode is deeply misleading: the referencing script
fails to **parse**, so the test scene's root ends up with no script, so
nothing ever calls `quit()` — and a headless Godot then runs forever. It
presents as a hung test, not as the parse error it actually is. If a suite
hangs with no output, this is the first thing to check.

Two more traps this project has already paid for:

- **A GDScript runtime error aborts only the enclosing function.** The
  remaining assertions silently never run and the suite still prints OK. Every
  suite here asserts an expected assertion count to catch that; keep it.
- **`print()` does not reach the browser console** in the web export.
  `Telemetry.event()` does. Instrument web-only problems with telemetry.

### Room map viewer

The Godot counterpart to the Three.js build's `/map.html?room=<id>` — a
top-down SVG view of a room's walls, colliders, patrols/sight cones,
verticality and every other fixture, driven straight from `gen_rooms.py`
(not the `.tscn` files) so it reads exactly what a full regenerate would
produce, including mid-edit while a room function is still broken.

```bash
cd godot
python3 tools/map_server.py                # http://127.0.0.1:8912/
python3 tools/map_server.py --host 0.0.0.0  # reachable over Tailscale
```

Python-3-stdlib-only, no npm, no build step — open the URL, pick a room from
the dropdown, toggle layers. Edit `tools/gen_rooms.py` or a room's
`rooms/<id>/<id>.gd` behaviour script (for its `WAYPOINTS*` patrol
constants) and save: the page polls and redraws in place, keeping your pan,
zoom, selected room/level and layer toggles. A broken `gen_rooms.py` mid-edit
shows the traceback in the error panel while leaving the last good render on
screen, rather than going blank.

Two overlays with no reference-viewer equivalent: a **design-law** layer
visualising the patrol-clearance (`ORDERLY_RADIUS + 0.1`) and
inspection-distance (`~8.2m`) invariants from §4 above, and per-light
**circuit** tags for the light axis (room16's `"bay"` breaker). Telemetry
replay is NOT ported — there is no Godot telemetry pipeline to feed it.
See `tools/map_server.py`'s header for the full design notes.
