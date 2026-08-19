# Tutorial — Adding a New Room to the Godot Build, From Nothing to Verified

Audience: you, cold, with no prior context on this codebase. You are going
to build one small room end to end — geometry, fixtures, an orderly, a
keypad — register it, generate it, look at it, and run every validator this
repo has. Every command below was actually run while writing this, in a
scratch copy, and every block of output is what that command actually
printed. Nothing here is aspirational.

The worked example is **room21, "the Store Room"**: a sealed shell with a
vestibule, a supply-island prop, a wall-mounted dispenser and keypad, two
scrawls (one the code clue), a single-orderly patrol, and an exit chained
onto the end of the existing ward (room20 used to exit straight to `"END"`;
it now exits to room21, which exits to `"END"`).

If you only read one other file before starting, read
[`ROOM_AUTHORING_GODOT.md`](ROOM_AUTHORING_GODOT.md) — this tutorial is the
narrated, first-person walk through what it describes in reference form.
[`KIT_REFERENCE.md`](KIT_REFERENCE.md) is the line-by-line `Room` DSL
reference for step 2; [`BEHAVIOUR_KIT.md`](BEHAVIOUR_KIT.md) is the
line-by-line reference for the `kit/*.gd` classes used in step 5.

## Do this in a scratch copy, not the real tree

`.tscn` files are **build output**. `tools/gen_rooms.py` is the source of
truth, and a full run reproduces every committed scene byte-for-byte. If
you're experimenting, work in a throwaway copy so a broken intermediate
state never touches the real repo:

```bash
rm -rf /tmp/wbtut && mkdir -p /tmp/wbtut
rsync -a --exclude '.godot' --exclude 'build' --exclude '.artifacts' \
  "/path/to/Ward B/godot/" /tmp/wbtut/
cd /tmp/wbtut
```

Everything below happened in exactly that scratch copy.

---

## 1. Decide the room's design, before writing any DSL

Read the `designing-a-room` skill (`.claude/skills/designing-a-room/SKILL.md`)
first — it's engine-agnostic and states the hard laws a room must satisfy
regardless of which build you're in. The four that shaped this room:

- **No soft-locks.** An unmedicated player with 0 pills must always be able
  to reach a dispenser (or an orderly's catch, which force-medicates and
  teleports — the load-bearing fallback).
- **Unmed is always safe from the world**, never from orderlies.
- **Rooms are one-way** — no backtracking to a previous room's dispenser.
- **Reaction time ≥ 2.5s at every inspection point** (a scrawl, a keypad):
  worst-case time-to-contact `grace (0.6) + distance / chase_speed (4.3)`,
  i.e. **distance ≥ ~8.2m** from the nearest point on any patrol leg — or
  make the spot provably unseeable behind real wall geometry. In the Godot
  build specifically, `KitDesign.min_inspection_distance()` derives this
  number from `Tuning` instead of it being hand-typed everywhere; it comes
  out to `8.17` at the default 2.5s (confirmed against the room built below
  — see step 4).

The design for room21: dispenser and code both live on the west wall near
spawn (safe, ungated, the standard "escape hatch near the entrance"
pattern from room2/room4/room7). A single orderly circles a supply island
in the middle of the room — the "island as occluder+cover" beat from the
design skill's catalog (room5's Nurse Station, room8's East Ward island).
The keypad sits on the far (north) wall, past the patrol, by the exit —
the ordinary spend: read the code unmed near spawn, cross while the
orderly's loop dictates timing, open the door lucid.

**One design choice worth flagging, not smoothing over:** to get 8.2m of
open-floor clearance on *both* sides of the patrol loop (spawn side and
keypad side) without an occluder, the room ended up 12m × ~25m — much
bigger than a typical shipped room. Every other keypad-plus-orderly room in
the ward (room7, room16) solves this with an occluder (a shelf row, a nook
mouth) instead of raw distance, precisely because 8.2m of open sightline is
expensive to fit twice into a normal footprint. This tutorial uses distance
because it's simpler to reason about in prose; **don't copy "make the room
huge" as your default move** — occlude, the way the shipped rooms do.

---

## 2. Write the layout function in `tools/gen_rooms.py`

Crib the closest exemplar rather than deriving from scratch. Room21 is
closest to room7 (dispenser + keypad + orderly) crossed with room5/room8
(the `island()` preset). Every wall-mounted fixture is derived from
`WALL_HALF` (0.12, walls are 0.24 thick), never a typed-out number — that's
what stops placement drifting room to room, and it's how the fixture ends
up *proud* of the wall face instead of sunk into it:

```
wall face      = wall_at ± WALL_HALF      (±0.12)
fixture centre = face ± thin/2            (flush: touching, not sunk)
scrawl / panel = face ± 0.03              (a decal gap)
```

The full function, appended to `tools/gen_rooms.py` just before
`if __name__ == "__main__":`:

```python
def room21():
    r = Room("room21", "the Store Room",
             floor=(-6, 6, -6, 18.5),
             spawn=(0, 17.5, 0),
             exits=[("END", -1, 1, -5.9, -5.8)])

    # shell, x [-6,6] z [-6,18.5] — spawn end at +z (south), exit at -z (north)
    r.wall_x(-6, 6, 18.5)          # south cap, behind spawn
    r.wall_z(-6, 18.5, -6)         # west wall
    r.wall_z(-6, 18.5, 6)          # east wall
    r.wall_x(-6, -1, -6)           # north, west of the exit gap
    r.wall_x(1, 6, -6)             # north, east of the exit gap

    # vestibule beyond the exit door, x [-1,1] z [-9,-6]
    r.wall_z(-9, -6, -1)
    r.wall_z(-9, -6, 1)
    r.wall_x(-1, 1, -9)            # caps the vestibule
    r.block((1.8, 2.6, 0.06), (0, 1.4, -8.94), "glow")  # warm glow beyond the exit

    # exit door collider — locked until the code is entered; KitKeypadLock
    # drops the layer on success via unlock_door("DoorCollider").
    r.solid(-1, 1, -6.12, -5.88, name="DoorCollider")

    # the supply counter — a semantic PROP PRESET (island()), not a hand-
    # rolled block(): one call gets the solid footprint (the only thing the
    # patrol loop routes around) plus the raised core and its four-piece
    # mesh-only skirt for free.
    r.island(-1.4, 1.4, 4, 7, core_width=1.4, name="SupplyIsland")

    r.scrawl("nobody counts what's\nkept in here", (5.85, 1.7, 16.5), -math.pi / 2, 2.8)
    r.scrawl("3 7 1 9", (-5.85, 1.7, 16.8), math.pi / 2, 2.4, sid="codeScrawl21")

    # dispenser — west wall, well south of the patrol belt. facing PINNED —
    # room7 shipped with an inferred facing pointing a dispenser into its
    # own wall; pin every wall mount rather than trust the heuristic.
    r.interactable("dispenser21", "dispenser", (0.16, 0.75, 0.55),
                   (-6 + WALL_HALF + 0.08, 1.45, 17.1),
                   "dispenser", "use the dispenser", facing="px")

    r.interactable("keypad21", "keypad", (0.4, 0.5, 0.14),
                   (2.5, 1.45, -6 + WALL_HALF + 0.07),
                   "pad", "use the keypad", facing="pz")

    r.interactable("exitdoor", "door", (2, 3, 0.24), (0, 1.5, -6),
                   "door", "the exit door")

    r.ward_lights([(0, 16), (0, 11), (-3, 5.5), (3, 5.5), (0, 0), (0, -6)])
    return r
```

Note what is **not** here: the orderly's patrol route. `WAYPOINTS` lives in
the *behaviour* script (step 5), not the layout — `gen_rooms.py` only knows
geometry. `tools/check_rooms.tscn`'s patrol-clearance validator reads the
route back out of the `.gd` file directly (`get_script_constant_map()`),
which is why it works for any room without the DSL needing to know
anything about patrols at all.

**`ward_lights()` vs `light()`:** `light()` places one ceiling fitting;
`ward_lights()` is a plural convenience over it — pass a list of `(x, z)`
points instead of N separate calls. Both emit the identical fitting/bounce
pair; there is exactly one lighting look in this game (see `ward_lights`'s
own docstring), so don't reach for anything fancier.

`island()`'s signature is `island(min_x, max_x, min_z, max_z, core_width,
name=None)` — it emits one real collider (`solid()`, the only thing an
orderly routes around) plus a raised mesh-only core and a four-piece
mesh-only skirt flush to the footprint. `core_width` is the one number not
derivable from the footprint; everything else (skirt thickness, heights)
is fixed across the two shipped instances (room5, room8) and baked into
the preset.

---

## 3. Register the room in all three places

Missing any one of these fails **at runtime, not at build** — `gen_rooms.py`
runs cleanly, `check_roundtrip.sh` can even pass, and the failure only shows
up when something tries to actually load or reach the room. I verified each
failure mode for real rather than trusting the docs' description of them
(see step 8's sibling table at the end of this tutorial for the exact
output each one produces).

**1. `main.gd`'s `ROOM_SCENES`** — a flat `id -> path` dict. `tools/check_rooms.gd`
parses this block as *text*, so it must stay flat; a nested value (which is
how `ROOM_VARIANTS` rooms like room19 are handled instead) breaks the parser.

```diff
 	"room20": "res://rooms/room20/room20.tscn",
+	"room21": "res://rooms/room21/room21.tscn",
 }
```

Miss this and `check_rooms.tscn` fails with `room21: exit targets
unregistered room 'room21'` — reported from room20, the room whose exit
points at the missing id, not from room21 itself.

**2. The upstream room's exit.** Room20 used to terminate the ward
(`exits=[("END", -1, 1, -19, -18.9)]`); it now points at room21:

```diff
     r = Room("room20", "the Loading Bay",
              floor=(-6, 6, -19, 6),
              spawn=(0, 5, 0),
-             exits=[("END", -1, 1, -19, -18.9)])
+             exits=[("room21", -1, 1, -19, -18.9)])
```

Miss this and every other check still passes — room21 is fully valid, fully
registered geometry that a player can never reach, because nothing points
at it. `check_rooms.tscn`'s chain walk (room1 → ... → `"END"`) is what
catches it:

```
FAIL  'room21' is registered but unreachable from room1
```

**3. `write_room(room21())` in `gen_rooms.py`'s `__main__`.** This is
exactly how room20 itself got missed for real, once — its own header
comment documents it: *"room20 was defined above but never written here —
the one omission that let it silently drift, since nothing regenerated it
to diff against the committed .tscn."*

```diff
     write_room(room20())
     write_room(room16())
+    write_room(room21())
```

**What actually catches this one is subtler than the docs suggest, and I
verified both halves by hand:**

- If `rooms/room21/room21.tscn` **has never been committed at all**
  (a brand-new room, generated zero times), omitting the `write_room()`
  call means `gen_rooms.py` runs clean with no error, but `check_rooms.tscn`
  fails outright:
  ```
  FAIL  room21: could not load/instantiate res://rooms/room21/room21.tscn
  ```
- If the `.tscn` **already exists** on disk (say you generated it once
  correctly, then later edited `room21()` and forgot to re-add it to
  `__main__`, or someone else's edit dropped the line), `check_roundtrip.sh`
  does **not** catch it. I tested this directly: `check_roundtrip.sh` rsyncs
  the whole tree into a scratch copy *before* regenerating, so the stale
  committed file is already sitting in the scratch copy when the omitted
  `write_room()` call fails to touch it there either — scratch ends up
  byte-identical to the (stale) real tree, and the diff reports OK. The
  only real tell in that case is the terminal output of running the
  generator itself: `python3 tools/gen_rooms.py` simply won't print `wrote
  rooms/room21/room21.tscn` for that room. If you're not watching that
  line, this failure mode is genuinely silent. This is worth knowing
  precisely because the round-trip script's own header advertises broader
  coverage than it delivers for this specific case.

---

## 4. Generate, then eyeball it in the map viewer

```bash
$ python3 tools/gen_rooms.py
...
wrote rooms/room20/room20.tscn
wrote rooms/room16/room16.tscn
wrote rooms/room21/room21.tscn
done
```

Start the map viewer (the port may already be in use by another session —
pick a free one rather than killing whatever's there):

```bash
$ python3 tools/map_server.py --port 8931
Ward B room map — dev only, never shipped (see this file's header).
...
```

Open `http://127.0.0.1:8931/?room=room21`. It reads straight out of
`gen_rooms.py`, not the `.tscn` files, so it reflects mid-edit state even
while a room function is still broken. Rather than eyeballing pixels, I
pulled the same JSON the page renders from (`/rooms.json`) to check the
numbers directly:

```bash
$ curl -s http://127.0.0.1:8931/rooms.json | python3 -c "
import json,sys
r = json.load(sys.stdin)['rooms']['room21']
print(json.dumps(r['inspectionPoints'], indent=1))"
```

```json
[
 {"x": 2.5, "y": 1.45, "z": -5.81, "label": "keypad21", "kind": "keypad",
  "nearestLegDist": 8.81, "danger": false},
 {"x": 5.85, "y": 1.7, "z": 16.5, "label": "nobody counts what's",
  "kind": "scrawl", "nearestLegDist": 8.49, "danger": false},
 {"x": -5.85, "y": 1.7, "z": 16.8, "label": "codeScrawl21", "kind": "scrawl",
  "nearestLegDist": 8.78, "danger": false}
]
```

This is a real, useful capability worth knowing about: the map server
computes the reaction-time law (`inspectionPoints`, using the same
`8.17m` `KitDesign.min_inspection_distance()` derives) and the
patrol-clearance law (`dangerWaypoints`/`dangerLegs` per patrol route)
independently, as an overlay, and serves both as plain JSON — not just as
pixels in the SVG. `tools/check_rooms.tscn` only automates the
patrol-clearance half of this (see step 8); the reaction-time number above
is real, computed, verified output, but it is **not** enforced by any
headless check — the map viewer is the only place that surfaces it at all,
and only if you look.

---

## 5. Write the behaviour script with the kit

`rooms/room21/room21.gd` is the *first* room in the ward actually wired
through `kit/*.gd` instead of hand-rolling the same four beats every
existing keypad+orderly room duplicates (room7, for comparison, hand-rolls
all of this in ~190 lines; the kit exists specifically to stop that
duplicating an 18th time, but as of this tutorial nothing had exercised it
against a real room yet — see the report below for what that surfaced).

```gdscript
extends Node3D

const FIXED_CODE := "3719"

const WAYPOINTS: Array[Vector3] = [
	Vector3(-3.0, 0, 3.0),
	Vector3(3.0, 0, 3.0),
	Vector3(3.0, 0, 8.5),
	Vector3(-3.0, 0, 8.5),
]

var _lock: KitKeypadLock
var _patrol: KitOrderlyRoom
var _main: Node = null
var _saw_unmed_toast := false


func on_enter(main: Node) -> void:
	_main = main
	_saw_unmed_toast = false

	_lock = KitKeypadLock.new({
		"code": FIXED_CODE,
		"keypad_id": "keypad21",   # see step 6 — this is NOT optional
		"door_open_pos": Vector3(-1, 1.5, -5.88),
		"door_open_rot": PI / 2.0,
		"success_toast": "%s. logged and forgotten.",
		"objective": "the door is open. go.",
		"scrawls": [{"scrawl_id": "codeScrawl21"}],
	})
	_lock.regenerate(main)

	_patrol = KitOrderlyRoom.new({
		"orderly_specs": [{"waypoints": WAYPOINTS}],
		"spawn_x": 0.0,
		"spawn_z": 17.5,
		"catch_toast": 'hands. a needle. "count again," he says.',
		"on_caught": _on_orderly_caught,
	})
	_patrol.spawn_all(self, main)

	KitInteractables.wire_availability(self, _is_available)

	main.hud_objective(
		"the store room. someone's linen closet. count the shelves, not the minutes.")


func _is_available(id: String) -> bool:
	return _lock.is_available(id)


func on_interact(id: String) -> bool:
	return _lock.handle_interact(id, _main)


func _on_orderly_caught() -> void:
	_lock.regenerate(_main)


func on_state_change(next: StateManager.State) -> void:
	if next == StateManager.State.UNMED and not _saw_unmed_toast:
		_saw_unmed_toast = true
		_main.hud_toast("the shelves keep better records than the staff.")


func _physics_process(_delta: float) -> void:
	_patrol.tick(_main)


func on_leave() -> void:
	_patrol.dispose(_main)
```

What each kit class buys you here, concretely:

- **`KitKeypadLock`** owns the entire unmed-refusal / lucid-open / door-swing
  / success-toast / objective-update flow. Your room script never touches
  `StateManager.is_lucid()` or `main.open_keypad()` directly — one
  `handle_interact()` call in `on_interact` is the whole wiring.
- **`KitOrderlyRoom`** owns spawn-before-add_child ordering, the
  warned/chase_started/caught signal wiring, and — the part that is easy to
  get wrong by hand and load-bearing when caught mid-catch — the exact
  order of the catch penalty (telemetry snapshot *before* the teleport, or
  the catch heat-map flattens to one point at spawn; state forced to LUCID
  *before* the teleport, so the player already reads as lucid on arrival;
  your own `on_caught` tail *last*, so it can't race the reset).
- **`KitInteractables.wire_availability`** replaces the four-line
  `for node in _interactables(): node.availability = _is_available` loop
  every hand-rolled room repeats verbatim.

---

## 6. Wire randomize-codes — mandatory, not optional

The CONFIGURATION panel has a "randomize keypad codes" toggle. A keypad
room that doesn't wire it is **silently skipped** — no error, the toggle
just does nothing for that room, while every correctly-wired room next to
it does reroll. `KitKeypadLock.regenerate(main)` does the actual work
(reads `WardCodes.is_randomize_codes_enabled()`, early-returns if off,
otherwise rerolls and rewrites the scrawl); the room's job is calling it in
the right two places:

1. **First thing in `on_enter`** — done above, right after constructing
   `_lock`.
2. **Last thing in the catch handler** — done above as `_on_orderly_caught`,
   passed to `KitOrderlyRoom` as `on_caught`, which the kit guarantees runs
   *after* the standard catch penalty. A caught player must not be able to
   memorise the code across the reset.

**A real, verified gotcha that cost me a debugging pass, and isn't
documented anywhere in the kit's own comments:** `KitKeypadLock`'s
`keypad_id` field defaults to the literal string `"keypad"`. My fixture's
interactable id is `"keypad21"` (matching the `dispenser21`/`keypad21`
naming every other id in this room uses). Nothing checks that these agree.
I verified the actual failure mode with a two-line probe against the bare
class (no room, no engine autoloads needed for this code path):

```gdscript
var default_lock := KitKeypadLock.new({"code": "1234"})
print(default_lock.handle_interact("keypad21", null))
```

```
default keypad_id = 'keypad'
handle_interact('keypad21') with DEFAULT keypad_id -> false (claimed)
```

`handle_interact` returns `false` — "not mine, I didn't handle it" — for
any id that isn't its configured `keypad_id`. Back in `main.gd`'s
`_interact()`, a room's `on_interact` returning `false` falls through to a
generic `match itype:` that only knows `"dispenser"` and `"pill_pickup"`;
there is no case for `"pad"`/`"keypad"`. Net effect: clicking the keypad
does **nothing at all** — no toast, no error, no keypad modal, nothing in
the console. It reads exactly like a hung interaction, not a config bug.
The fix is the `"keypad_id": "keypad21"` line already in the script above —
**always pass `keypad_id` (and `door_id`, if yours isn't the also-defaulted
`"exitdoor"`) explicitly whenever your fixture ids aren't the kit's
defaults.**

---

## 7. Verify — every command, in order, with real output

```bash
$ python3 tools/gen_rooms.py
...
wrote rooms/room21/room21.tscn
done
```

```bash
$ ./tools/check_roundtrip.sh
...
==> checked 22 room scene(s)
==> round-trip OK — every committed room regenerates byte-for-byte
```

The generator needs an import pass before any headless run whenever a new
`class_name` file has been added — none was added for this room (`kit/*.gd`
already existed), but I ran it anyway since `.godot/` doesn't exist yet in
a fresh scratch copy:

```bash
$ G=/Applications/Godot.app/Contents/MacOS/Godot
$ "$G" --headless --path . --import
...
[ DONE ] loading_editor_layout
```

```bash
$ "$G" --headless --path . tools/check_rooms.tscn
Godot Engine v4.7.1.stable.official.a13da4feb - https://godotengine.org

ERROR: Attempt to open script 'res://rooms/room19/room19.gd' resulted in error 'File not found'.
   ...
check_rooms: 21 room(s) checked
  OK - all invariants hold
```

The `room19/room19.gd` error is **pre-existing and unrelated to this room**
— I confirmed it fires identically against the unmodified real repo. Room19
is a `ROOM_VARIANTS` room (two real scene files, `room19_lights` /
`room19_doors`, no plain `rooms/room19/` directory), and `_check_patrol`
tries a naive `rooms/<id>/<id>.gd` load for every registered id including
the variant's fallback id. It's noise on every run, not a regression from
adding room21 — don't chase it.

```bash
$ "$G" --headless --path . tools/test_mechanics.tscn
...
test_mechanics: 26 assertion(s) passed
  OK - core mechanics behave as ported
```

```bash
$ "$G" --headless --path . tools/test_kit.tscn
...
test_kit: 28 assertion(s) passed
  OK - kit/ behaves as specified
```

All four pass. Room21 is registered, generates byte-identically, its
wiring and spawn/exit/patrol-clearance invariants hold, and neither the
mechanics suite nor the kit's own suite regressed.

---

## 8. The failure I hit on purpose, and how I read it

The patrol-clearance check is the one fully automated design-law check
(`ROOM_AUTHORING_GODOT.md` §4: "the wedge bug that shipped twice"). I
authored the first version of `WAYPOINTS` with the west leg cutting closer
to `SupplyIsland` than the rule allows, on purpose, to see what the
validator actually says:

```gdscript
const WAYPOINTS: Array[Vector3] = [
	Vector3(-1.6, 0, 3.0),   # BAD — 0.2m from the island's x=-1.4 face
	Vector3(3.0, 0, 3.0),
	Vector3(3.0, 0, 8.5),
	Vector3(-1.6, 0, 8.5),   # BAD, same reason
]
```

```bash
$ "$G" --headless --path . tools/check_rooms.tscn
...
check_rooms: 21 room(s) checked
  FAIL  room21[WAYPOINTS]: patrol leg 3->0 ((-1.60,8.50) to (-1.60,3.00)) passes only 0.20m from collider x[-1.40,1.40] z[4.00,7.00] — needs >0.50m. This is the wedge bug: his body clips the corner mid-leg and freezes there.
  1 failure(s)
```

Two things worth noticing in that output, both of which changed how I'd
read a failure like this afterward:

1. **It reports the *leg*, not the waypoints.** Both bad waypoints
   individually are actually far enough from the island — `(-1.6, 3.0)`
   is 1.02m from the collider's nearest corner, because `z=3.0` falls
   *outside* the island's `z=[4,7]` range, so the nearest point is a
   diagonal corner, not a straight edge. The failure only appears on the
   **segment between** those two waypoints, because that segment runs
   straight north at a fixed `x=-1.6`, which crosses the island's full
   `z` range at a constant, too-close 0.2m. This is exactly the
   "a leg can clip a corner even when both endpoints are clear" case
   `ROOM_AUTHORING_GODOT.md` §4 calls out — I only really believed it
   once I'd made it happen and watched the checker point at the leg
   specifically, not the points.
2. The fix is purely geometric, not a config knob: I widened the west/east
   legs from `±1.6` to `±3.0`, giving 1.6m of clearance instead of 0.2m.
   Re-running immediately afterward:

```bash
$ "$G" --headless --path . tools/check_rooms.tscn
...
check_rooms: 21 room(s) checked
  OK - all invariants hold
```

The instinct to "just lower the clearance requirement" doesn't exist here
because there's nowhere to do it from a room script — `PATROL_MARGIN` and
`ORDERLY_RADIUS` are constants in `check_rooms.gd`/`Tuning`, not per-room
knobs, which is deliberate (§4: "Fix the geometry; never lower the
clearance").

---

## Troubleshooting table

| Symptom | Cause | Fix |
|---|---|---|
| `godot --headless ... tools/check_rooms.tscn` (or any `test_*.tscn`) never exits, no output, no error | A new `class_name` file (e.g. a new `kit/*.gd`) was added but Godot hasn't done an import pass yet. The referencing script fails to *parse*, the scene root ends up with no script, and nothing ever calls `quit()` — headless Godot then runs forever, presenting as a hang, not the parse error it actually is. | `"$G" --headless --path . --import` once, before running any suite, whenever a new `class_name` file was added. Also confirmed the reverse the hard way: writing an ad hoc probe script as `extends SceneTree` with `_init()` calling `quit()` also hangs, because `_init()` runs before the tree can act on `quit()` — the project's own convention of a `Node`/`_ready()` `.tscn` (not `--script`) is the one that actually exits. |
| `check_roundtrip.sh` reports `DIFFERS` for a room | Someone hand-edited the `.tscn` in the Godot editor. `.tscn` files are build output; edits made there are silently reverted the next time anyone regenerates. | Move the edit into the matching `roomN()` function in `gen_rooms.py` and regenerate. Never "fix" the diff by hand-editing the `.tscn` back. |
| A room is registered, generates, passes `check_roundtrip.sh`, but is never reachable in play | The **upstream** room's `exits=` still points at the old target (commonly `"END"`), not your new room's id. No mechanical check catches this except the exit-chain walk. | `check_rooms.tscn` reports `'<id>' is registered but unreachable from room1` — fix the upstream room's `exits=` tuple. |
| A room's geometry silently reverts to an old version every time `gen_rooms.py` runs, or a brand-new room's `.tscn` is just missing | `write_room(room21())` (or whichever id) is missing from `__main__`. If the `.tscn` has *never* been committed, `check_rooms.tscn` fails outright (`could not load/instantiate`). If it *was* committed once and only the generator changed since, `check_roundtrip.sh` will **not** catch it — its rsync-then-regenerate design means a stale-but-already-present `.tscn` matches itself trivially. The only tell is the generator's own stdout not printing `wrote rooms/<id>/<id>.tscn` for that room. | Add the `write_room()` call. Watch the generator's print output, not just the round-trip script's exit code, when you're not sure a room actually got touched. |
| A fixture (dispenser, keypad, prop) renders sunk into or floating off a wall | Its position was typed as a literal number instead of derived from `WALL_HALF` (0.12) and the fixture's own thin-axis half-width, or the wrong axis was swapped for the wall it's mounted on (a west/east wall mount needs `(thin, height, along)`; a north/south wall mount needs `(along, height, thin)`). | Derive: `fixture centre = (wall centreline ± WALL_HALF) ± thin/2`, and pin `facing=` explicitly rather than trusting the room-centre heuristic — it has shipped wrong before (room7's dispenser faced its own wall). |
| `check_rooms.tscn` fails with `patrol leg N->M ... passes only X.XXm from collider ... needs >0.50m` (or the same for a bare waypoint) | An orderly's `WAYPOINTS*` constant routes a waypoint, or the straight segment *between* two waypoints, within `ORDERLY_RADIUS + 0.1` (0.5m) of an always-solid collider. Both endpoints of a leg can individually be fine while the leg between them still clips a corner — check the leg's message even if both waypoints look safe. | Move the geometry (widen the loop, move the prop) — never lower the margin constant. Re-run `check_rooms.tscn` after; there's no partial-pass state. |
| A keypad room's code never changes with "randomize keypad codes" turned on, while other rooms' codes do | Either `KitKeypadLock.regenerate(main)` isn't called in `on_enter` (and again in the catch handler), or — the one that produces no error at all — the room's fixture id doesn't match `KitKeypadLock`'s `door_id`/`keypad_id` (defaults `"exitdoor"`/`"keypad"`), so `handle_interact`/`is_available` silently never match it and interacting with the keypad does nothing whatsoever, randomize toggle or not. | Call `regenerate()` in both required places (step 6). If your fixture ids differ from the kit's defaults (they will, if you followed the `dispenser21`/`keypad21` naming this room uses), pass `keypad_id`/`door_id` explicitly in the `KitKeypadLock` config — nothing warns you if you forget. |

---

## What I'd tell someone about to do this cold

- The three-place registration (§3) is the thing every doc in this repo
  independently warns about, and it's still the thing I'd get wrong first
  — each individual omission produces a *different*, specific failure
  message, none of which say "you forgot to register the room" in those
  words. Read the exact `FAIL` line; it does tell you which of the three
  you missed, once you know the mapping.
- `check_roundtrip.sh`'s coverage claim is narrower in practice than its
  header suggests for the "committed once, generator drifted since" case —
  trust the generator's own `wrote ...` stdout over the round-trip script's
  exit code when you're specifically checking "did my new room actually
  regenerate."
- The kit (`kit/*.gd`) had zero rooms actually using it before this one —
  every other keypad/orderly room in the ward still hand-rolls the pattern
  it replaces. It works, and it's a real reduction in code (this room's
  behaviour script is under 100 lines against room7's ~190 for the same
  four beats), but its one silent footgun — `keypad_id`/`door_id` defaults
  that don't match your fixture's actual id — has no test or doc coverage
  anywhere I could find, so treat step 6 above as the missing warning.
