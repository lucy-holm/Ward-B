# Ward B — Behaviour Kit (Godot)

The behaviour half of a room. A room is two artefacts: **layout** (a `roomN()`
function in `tools/gen_rooms.py`, compiled to a `.tscn`) and **behaviour**
(`rooms/roomN/roomN.gd`, a plain `Node3D` script instanced under the layout at
runtime). This document covers the second half — what `main.gd` expects from
that script, what it lets the script call back, and the `godot/kit/*.gd`
authoring kit that factors out the boilerplate seventeen-plus rooms currently
hand-roll.

For layout, see `KIT_REFERENCE.md`. For the doc set overview, see
`ROOM_AUTHORING_GODOT.md`.

## Contents

1. [The room-script contract](#1-the-room-script-contract)
2. [The room-script API (`main.gd`)](#2-the-room-script-api-maingd)
3. [The kit](#3-the-kit)
   - [3.1 `KitOrderlyRoom`](#31-kitorderlyroom)
   - [3.2 `KitKeypadLock`](#32-kitkeypadlock)
   - [3.3 `KitInteractables`](#33-kitinteractables)
   - [3.4 `KitDesign`](#34-kitdesign)
4. [Before / after: room 4](#4-before--after-room-4)
5. [The randomize-codes contract](#5-the-randomize-codes-contract)
6. [Orderly wiring gotchas](#6-orderly-wiring-gotchas)
7. [Testing your room](#7-testing-your-room)

---

## 1. The room-script contract

A room script is **duck-typed** — there is no base class, no interface, no
`extends RoomScript`. `main.gd` calls `has_method(...)` before every hook and
skips silently if the method is absent. This is by design: room 4 has no
keypad and defines no `on_trigger_enter`; room 9 has no orderly and defines no
catch handler. Nothing forces a room to implement any hook it doesn't need.

| Hook | Signature | Called from | Fires |
|---|---|---|---|
| `on_enter` | `on_enter(main: Node) -> void` | `main.gd:913-914` | Once, at the end of `load_room()`, after the scene is added to the tree, collision/levels/triggers/atmosphere are rebuilt for the new room, and the player is spawned. |
| `on_interact` | `on_interact(id: String) -> bool` | `main.gd:781-784` | On every `[E]` press, **before** `main`'s generic interactable handling (dispenser/pill-pickup). |
| `on_state_change` | `on_state_change(next: StateManager.State) -> void` | `main.gd:492-495` | After a lucid/unmed shift, **after** the world/HUD/audio have already applied the new mood — a room reacts last, never first. |
| `on_leave` | `on_leave() -> void` | `main.gd:839-845` | At the start of `load_room()` for the *next* room, before the current room is `queue_free()`'d and before `triggers.bind_room(null)`. |
| `on_trigger_enter` | `on_trigger_enter(id: String) -> void` | `core/trigger_poll.gd:117` | Head-of-tick (`process_physics_priority = -100`), when the player's polled (x, z) newly satisfies a `TriggerVolume`'s containment test. |
| `on_trigger_exit` | `on_trigger_exit(id: String) -> void` | `core/trigger_poll.gd:124` | Same poll, when a previously-active trigger id newly does not. All enters for a tick fire before any exit — see `core/trigger_poll.gd:11-15`. |
| `_physics_process` | ordinary Godot override | Godot's own scene-tree tick | Runs at the room's default priority (`0`), **after** `TriggerPoll` (`-100`) and **after** the player/world resolve position for the tick (`WorldRoot` precedes `Player` in `main.tscn`) — so a trigger callback that flips room state is already landed by the time a room's own `_physics_process` runs in the same frame. |

**`on_interact` returning `true` means "handled — skip `main`'s generic
handling."** `main.gd:781-784`:

```gdscript
if current_room != null and current_room.has_method("on_interact"):
    if current_room.on_interact(id):
        return
```

A room whose `on_interact` doesn't recognize `id` (or has none — room 4
`return false`s unconditionally, `rooms/room4/room4.gd:75-76`) must return
`false`, or a dispenser/pill-pickup elsewhere in the room silently stops
working the instant that room defines *any* `on_interact` at all.

`on_trigger_enter`/`on_trigger_exit` are **not** wired through `Area3D` —
`TriggerVolume` is a polled, strict-inequality point-in-rect test re-evaluated
every physics tick, including against ward-state filters with no movement at
all (`core/trigger_volume.gd:8-34`). A room reads a trigger id it authored via
`gen_rooms.py`'s `Room.trigger(...)`/`Room.plate(...)`, not a node path.

## 2. The room-script API (`main.gd`)

Everything a room `.gd` is allowed to touch, per `main.gd:945-948`:

> Kept narrow on purpose: the Three.js version's `GameCtx` was the same idea,
> and keeping the surface small is what let rooms 1-20 survive engine
> changes.

That comment undersells it slightly — **two fields are load-bearing and not
part of the "API" section's textual list**, `main.player` and
`main.collision`. Every orderly-owning room passes both to `Orderly.setup()`
(and every kit room passes them implicitly through `KitOrderlyRoom`, which
reads `_main.player` / `_main.collision` itself — §3.1):

```gdscript
@onready var player: CharacterBody3D = $Player          # main.gd:306
var collision := WardCollision.new()                     # main.gd:309
```

`player` is the live `CharacterBody3D` — orderlies raycast and distance-check
against `player.global_position`, HUD bearing math reads `player.yaw`.
`collision` is the AABB cache `Orderly.setup()`'s second argument (`fallback`)
wants for occlusion/patrol-blocking — rebuilt once per room load
(`main.gd:879`) and again on demand via `rebuild_collision()` below.

### The declared API

| Method | Signature | What it does |
|---|---|---|
| `hud_toast` | `hud_toast(text: String) -> void` | `main.gd:749-750`. One-shot HUD toast line. |
| `hud_objective` | `hud_objective(text: String) -> void` | `main.gd:753-754`. Overwrites the persistent HUD objective line. |
| `open_keypad` | `open_keypad(code: String, on_success: Callable, on_denied := Callable()) -> void` | `main.gd:952-967`. Opens the modal keypad UI against `code`. Disconnects any previous room's keypad signal connections first, then wires fresh ones. Emits `keypad_open` telemetry itself, and `keypad_success` / `keypad_denied` (with the attempted string) from inside its own connected closures — a room does not need to emit any of these itself. `on_success` takes no arguments; `on_denied`, if valid, takes the attempted `String`. |
| `move_interactable` | `move_interactable(id: String, pos: Vector3, rot_y := 0.0) -> void` | `main.gd:974-979`. Repositions an interactable node by id (e.g. swinging a door open). Does **not** touch collision — pair with `unlock_door` or `rebuild_collision`. |
| `remove_interactable` | `remove_interactable(id: String) -> void` | `main.gd:802-810`. `queue_free()`s the node by id; clears the focus/prompt state if it was focused. |
| `unlock_door` | `unlock_door(node_name: String) -> void` | `main.gd:982-990`. Looks up a `CollisionObject3D` by node name (`find_child`, recursive), zeroes its `collision_layer`, then calls `rebuild_collision()` and emits `door_opened` telemetry. `push_warning`s (does not crash) if `node_name` isn't found. |
| `rebuild_collision` | `rebuild_collision() -> void` | `main.gd:994-996`. Rebuilds the AABB cache from `current_room`. Required after any collider is enabled/disabled outside `unlock_door`'s own call to it (e.g. room 14's re-closing gate). |
| `teleport_player` | `teleport_player(x: float, z: float, to_level := "") -> void` | `main.gd:934-935`. `to_level` empty keeps the player's **current** level — correct for every single-level room. **A multi-level room MUST pass `to_level` explicitly on any catch/reset teleport** — see §6. |
| `floor_height_at` | `floor_height_at(level_id: String, x: float, z: float) -> float` | `main.gd:941-942`. Floor Y for a given level/XZ — e.g. to seat a room-owned prop or actor on a raised zone. A room with orderlies should prefer handing `levels` straight to `Orderly.setup()`'s third argument instead of computing this per-actor. |
| `update_scrawl_text` | `update_scrawl_text(id: String, text: String) -> void` | `main.gd:1039-1042`. Rewrites a `Label3D` wall scrawl in place by node name. The randomize-codes wiring's only write path (§5). |
| `set_threat` | `set_threat(level: float, bearing) -> void` | `main.gd:1051-1056`. Drives the HUD directional threat indicator **and** the audio threat bus in one call. `bearing == null` (with `level <= 0.0`) silences the audio bus entirely; any other call sets it live, with `level >= 1.0` flagging full chase. `KitOrderlyRoom.tick()` is the only caller a kit room needs. |
| `is_room_dark` | `is_room_dark() -> bool` | `main.gd:1005-1006`. Whether `RoomLight` currently reports the room's lights out. |
| `set_room_dark` | `set_room_dark(dark: bool) -> void` | `main.gd:1018-1027`. Throws the room's breaker: flips `RoomLight` (visibility/raycast gate for every `LightObject`) and the atmosphere's fog/ambient/fitting-circuit mood together, crossfaded over ~0.45s. **Does not gate on lucidity** — room 16 refuses this to an unmedicated player, but that's room policy living in `room16.gd`'s `on_interact`, not an engine rule (`main.gd:1015-1017`). |
| `set_glow_fade` | `set_glow_fade(level: float) -> void` | `main.gd:1033-1034`. The phosphor-paint charge/fade dial ("the paint drinks the light"). Opacity only — never affects gating, reachability, or solvability. |
| `complete_room` | `complete_room(to: String) -> void` | `main.gd:920-928`. Marks the current room complete in `GameState`, emits `room_complete` telemetry, and either loads room `to` or — if `to == "END"` — disables player input and flushes `game_complete` telemetry as the final act of the run. |

## 3. The kit

Four `RefCounted` classes under `godot/kit/`, each `class_name`-registered.
None hold scene-tree state of their own beyond what a room hands them; a
room owns one instance per concern (typically as a `var` initialized at
declaration, matching `KitKeypadLock`'s own convention — see §3.2).

### 3.1 `KitOrderlyRoom`

`kit/orderly_room.gd` — the N-orderly lifecycle: spawn-with-waypoints-
before-`add_child`, `setup()` against the player and a collision fallback,
warned/chase-started/caught signal wiring, the load-bearing catch-penalty
order, and the per-frame threat fold that feeds `main.set_threat`.

**Why a dictionary-per-orderly table, not N hand-wired instances** (kit
header, `kit/orderly_room.gd:7-11`): rooms 12 and 17 already do this for
exactly the reason the kit generalises it — past one orderly, hand-wiring N
copies of `setup()` + signal-connect *is* the duplication, not the orderly
count. A single-orderly room is just a one-entry `orderly_specs` array;
nothing about the API forks on N.

**Construction** — `_init(config: Dictionary = {})`, `kit/orderly_room.gd:88-98`.
Every field below also has a public setter-by-assignment; `config` is
optional sugar.

| Config key | Type | Default | Meaning |
|---|---|---|---|
| `orderly_specs` | `Array[Dictionary]` | `[]` | One entry per orderly. See below. |
| `spawn_x`, `spawn_z` | `float` | `0.0` | Catch-teleport target XZ. |
| `spawn_level` | `String` | `""` | Catch-teleport level. `""` omits `to_level` from `teleport_player` — correct for every single-level room; **a stacked room MUST set this** (§6). |
| `catch_toast` | `String` | `""` | Room-wide catch toast, used by any orderly whose spec has no `caught_toast` of its own. |
| `levels` | `WardLevels` | `null` | Passed straight through to `Orderly.setup()`'s third argument. `null` is correct for every flat room; a room with any stacked levels should pass `main.levels` unconditionally (safe for every room; see `main.gd`'s `levels` field header). |
| `collision_override` | `WardCollision` | `null` | `null` means every orderly gets `main.collision`. Set this only when a room needs a collision set with specific colliders excluded by node identity (room 13's two orderlies vs. its moving slabs is the one existing case). |
| `on_caught` | `Callable` | `Callable()` (no-op) | Fires **after** the standard catch penalty (below). `is_valid()` gates every call; the most common use is `KitKeypadLock.regenerate` — the catch-time reroll §5 requires. |
| `on_warned` | `Callable` | `Callable()` | Fires after the standard warned toast + `Telemetry.event("orderly_spotted")`. |
| `on_chase_started` | `Callable` | `Callable()` | Fires after the standard chase toast + `Telemetry.event("orderly_chase")`. |

Each `orderly_specs` entry recognizes (`kit/orderly_room.gd:24-40`):

| Key | Type | Required | Meaning |
|---|---|---|---|
| `waypoints` | `Array[Vector3]` | **yes** | Patrol loop. |
| `level` | `String` | no | Stacked-level tag (`Orderly.level`). Omitted leaves `Orderly`'s own default (`'__flat'`) — correct for every flat room. |
| `warn_toast` | `String` | no | Shown on `warned`. Default `"he is looking at you."` |
| `chase_toast` | `String` | no | Shown on `chase_started`. Default `"run. or stop being visible."` — every existing room uses this exact line. |
| `caught_toast` | `String` | no | Shown on `caught`, **after** the standard catch penalty. Falls back to the spec's own `catch_toast` when absent. |

**`spawn_all(room: Node, main: Node) -> void`** — `kit/orderly_room.gd:104-108`.
Frees any previously-spawned orderlies, then instantiates one per
`orderly_specs` entry under `room`. Call from `on_enter`, exactly where every
hand-rolled `_spawn_orderlies` was called from. Internally: waypoints (and
`level`) are assigned **before** `add_child` (§6), `setup(main.player,
collision_override ?? main.collision, levels)` is called, and the three
signals are connected with the resolved per-spec toasts bound.

**`dispose(main: Node) -> void`** — `kit/orderly_room.gd:145-148`. Zeroes the
threat indicator (`main.set_threat(0.0, null)`) **then** frees every spawned
orderly — in that order, matching every hand-rolled version, so the HUD arrow
cannot survive into the next room for one frame. Call from `on_leave`.

**`tick(main: Node) -> void`** — `kit/orderly_room.gd:261-274`. The entirety
of a kit room's `_physics_process` body: folds the live orderly list (below)
and pushes the result into `main.set_threat`.

**Threat selection rule** (the fold, `kit/orderly_room.gd:212-219`, static
`fold(orderlies: Array, player_pos: Vector3) -> Dictionary`, exercised
directly by `tools/test_kit.gd` against bare `Orderly` instances with no room
and no `main`):

1. **A chasing orderly always beats a merely watching one**, regardless of
   distance or ramp.
2. Among orderlies in the same chase/watch state, **the higher watch ramp
   wins**.
3. Ties on ramp **break toward whichever is nearer** the player (XZ
   distance).

`level` in the returned dictionary is the **max `watching()` across all
orderlies**, not just the winning one — a second orderly's rising ramp shows
up on the HUD meter even while a different, nearer orderly is still the
bearing target. Folded one candidate at a time (not compared pairwise): this
is `O(n)` written once, versus the pairwise if/elif chain rooms 8, 10, 11, 13,
17 hand-roll today, which needs editing for every additional orderly.

Returns `{"level": float, "chasing": bool, "primary": CharacterBody3D}`.
`primary` is `null` and `level` is `0.0` for an empty or all-invalid list —
`tick()` turns that into `set_threat(0.0, null)`.

**Catch penalty — `_on_caught`, `kit/orderly_room.gd:172-203`.** The order is
**load-bearing**, reproduced byte-for-byte from every hand-rolled
`_on_caught`/`_on_catch`:

1. **`Telemetry.event("orderly_caught")` FIRST.** The event snapshots the
   player's position *at emit time* via Telemetry's snapshot provider —
   emitting it after the teleport would record the **teleport destination**
   for every single catch, flattening the catch heat-map to one dot at spawn
   instead of showing where players actually get caught.
2. `StateManager.force_state(LUCID, "catch")` — `force_state` never spends a
   pill, so this step is free; it's what makes "get caught" a legitimate
   escape hatch rather than an added cost on top of a soft-lock.
3. `main.shift_fx()` — the visual/audio kick that sells the state change.
4. `main.teleport_player(...)` — **after** the state change, so the player
   already reads as lucid the instant they land.
5. The resolved catch toast.
6. `on_caught`, **last** — so a room-specific tail (most commonly a
   `KitKeypadLock.regenerate` reroll) cannot race or reorder anything above
   it. A caught player must never be able to memorise a code across the
   reset this teleport represents.

### 3.2 `KitKeypadLock`

`kit/keypad_lock.gd` — the keypad-door flow factored out of the ten rooms
that hand-roll it: refuse while unmedicated, open the modal keypad while
lucid, swing the door + drop its collider + echo the (possibly randomized)
code back on success, and update the objective.

**Construction** — `_init(config: Dictionary = {})`, `kit/keypad_lock.gd:67-84`.
Accepts any field below by name, plus `"code"` for the starting live code.
Both dictionary construction and direct field assignment are supported.

| Field | Type | Default | Meaning |
|---|---|---|---|
| `door_id` | `String` | `"exitdoor"` | Interactable id of the door node. Never itself directly interactable — see `is_available`. |
| `keypad_id` | `String` | `"keypad"` | Interactable id of the keypad node. |
| `door_open_pos` | `Vector3` | `Vector3.ZERO` | Where the door node moves to on success. |
| `door_open_rot` | `float` | `PI / 2.0` | Rotation the door node takes on success. |
| `door_collider_name` | `String` | `"DoorCollider"` | Name of the `CollisionObject3D` dropped alongside the visual swing. |
| `success_toast` | `String` | `"the door is open."` | Interpolated with the live code via `%` if it contains `"%s"` — every room echoes the just-solved code back so a randomized code still checks out visibly. No `"%s"` means the template is used verbatim. |
| `objective` | `String` | `"the door is open. go."` | Written to the HUD objective right after the success toast. |
| `scrawls` | `Array[Dictionary]` | `[]` | `{"scrawl_id": String, "mask": Array}` entries rewritten by `regenerate()`. **Must be set via `config`, not a bare literal assignment** — `_init` uses `scrawls.assign(...)` rather than `=`, because a Dictionary-literal `Array` from a call site type-checks as untyped and a bare `=` into the typed field is a *runtime* error with no compile-time warning (`kit/keypad_lock.gd:76-84`). |

**`UNMED_REFUSAL`** — verbatim across all ten hand-rolled keypad rooms
(`kit/keypad_lock.gd:20-25`):

```
"the keypad is a smear of static. you can't read it like this."
```

**`is_available(id: String) -> bool`** — `kit/keypad_lock.gd:106-111`. The
shallow gate every hand-rolled `_is_available` ends with: `door_id` is always
`false` (never directly interactable — only the keypad opens it), `keypad_id`
is `not _unlocked`, and anything this lock doesn't own falls through to
`true`. **Call this last**, after a room's own id-specific cases, exactly as
the match statements it replaces fall through to `return true`.

**`handle_interact(id: String, main: Node) -> bool`** — `kit/keypad_lock.gd:118-131`.
Returns `true` iff this lock claimed the interaction. An `id` that isn't this
lock's `keypad_id` falls through untouched (`false`) so the room's own
`on_interact` can keep handling everything else. While unmedicated, shows
`UNMED_REFUSAL` and claims the interaction without opening the keypad. While
lucid, calls `main.open_keypad(_code, ...)` — `open_keypad` emits its own
telemetry, so this method does not duplicate it.

**`set_code(code: String, toast := "") -> void`** — `kit/keypad_lock.gd:90-93`.
Overwrites the live code outright, for a room generating its starting code
some other way than the constructor's `"code"` key. Non-empty `toast`
replaces the success-toast template too.

**`is_unlocked() -> bool`** — `kit/keypad_lock.gd:96-97`.

**`regenerate(main: Node, scrawls_override: Array = []) -> void`** —
`kit/keypad_lock.gd:151-158`. The randomize-codes reroll — see §5 in full.
A no-op whenever the setting is off (`WardCodes.is_randomize_codes_enabled()`
early return), so a room may call it unconditionally from `on_enter` and
again from its catch handler without checking the setting itself.
`scrawls_override`, if non-empty, replaces the configured `scrawls` for this
call only.

### 3.3 `KitInteractables`

`kit/interactables.gd` — the interactable-tree walkers factored out of the
byte-identical `_interactables()` every room but room 20 hand-rolls.

**Two shapes, because room authoring produces two shapes** (kit header,
`kit/interactables.gd:1-18`). Every ordinary room hangs its fixtures directly
under a single `Interactables` node, or one wrapper level down (a group node
holding a fixture's mesh + `Interactable` together).

**`collect(room: Node) -> Array[Interactable]`** — `kit/interactables.gd:29-41`.
The shallow walk: everything directly under a child node named
`"Interactables"`, plus one wrapper level for fixtures grouped with their
visual mesh. Returns an empty array (not an error) if the room has no
`Interactables` node at all — "no such node" means "no fixtures to wire,"
matching every hand-rolled version.

**`collect_recursive(room: Node) -> Array[Interactable]`** — `kit/interactables.gd:49-52`.
Every `Interactable` anywhere under `room`, regardless of depth or the name
of the node it hangs from. **Use this only when a fixture genuinely lives
outside an `Interactables` subtree.** Room 20 is the one existing case: its
crate's `Interactable` lives at `Geometry/Crate/Visual` — three levels down,
under `Geometry`, not under an `Interactables` node at all, because the crate
is a moving prop wired into the room's own collision-and-cover system, not a
static fixture. The shallow walk finds nothing there.

**`wire_availability(room: Node, cb: Callable, recursive := false) -> void`**
— `kit/interactables.gd:67-70`. The other half of the duplicated pair every
room hand-rolls: walks once (via `collect` or `collect_recursive`) and
assigns `node.availability = cb` to each. A room's `on_enter` collapses to a
single call instead of a four-line for-loop.

### 3.4 `KitDesign`

`kit/design.gd` — pure functions with **no side effects and no state**
(`kit/design.gd:5-9`); they turn `Tuning`'s raw numbers into the authoring
rules six-plus rooms currently restate as a hand-typed comment.

**`min_inspection_distance(reaction_sec := 2.5) -> float`** —
`kit/design.gd:33-34`. THE ~8.2m INSPECTION-DISTANCE RULE. A player who first
notices an orderly needs a real chance to react before the orderly can close
the gap, or the warn/chase split (`Tuning.ORDERLY_WARN_AT`, the `warned`
signal) is decorative. `ORDERLY_GRACE_SEC` of `reaction_sec` is already spent
by the ramp climbing to 1.0 before the chase starts, so what remains is
straight closing time at chase speed:

```
(reaction_sec - ORDERLY_GRACE_SEC) * ORDERLY_CHASE_SPEED
  = (2.5 - 0.6) * 4.3 = 8.17 m
```

Six-plus rooms hard-code this as `"~8.2m"` or `"8.17m"` in a comment above a
nook/scrawl/dispenser placement — e.g. room 14's own reaction-time audit,
`rooms/room14/room14.gd:28-32` ("...all clear the 8.2m inspection-point
floor") — instead of deriving it. A future `Tuning` retune (chase speed,
grace period) silently invalidates every one of those hand-typed comments;
calling `KitDesign.min_inspection_distance()` does not.

**`patrol_clearance() -> float`** — `kit/design.gd:43-44`. Returns
`Tuning.ORDERLY_RADIUS + 0.1` — an orderly's collision radius plus a flat
0.1m margin, the minimum distance a patrol leg (or anything else he walks
past) must clear so he never wedges against it. This is exactly the figure
`tools/check_rooms.gd`'s `_check_patrol` validates every `WAYPOINTS*`
constant against (`PATROL_MARGIN := 0.1`, `check_rooms.gd:198`,
`need := Tuning.ORDERLY_RADIUS + PATROL_MARGIN`, `check_rooms.gd:229`) — a
wedged patrol used to be a permanent, unrecoverable freeze before the
`NavigationAgent3D` port (see `orderly.gd`'s own header).

## 4. Before / after: room 4

Room 4 (`rooms/room4/room4.gd`) is the ward's simplest orderly room: one
orderly, no keypad, no verticality, no multi-level teleport. It's also the
room the kit was extracted from — a fair, honest comparison rather than a
best case.

**Before** — the mechanical body (everything after the room's narrative
header comment, `rooms/room4/room4.gd:14-152`): **139 lines.** Preload +
waypoints + spawn constants, a hand-rolled `_interactables()` walker, a hand-
rolled `_is_available` match, `_spawn_orderly` (waypoints-before-`add_child`,
`setup()`, three signal connects), `_on_warned`/`_on_chase_started`/
`_on_caught` (the full six-step catch order spelled out by hand), a manual
`_physics_process` threat computation, and `on_leave`.

**After** — the same room on the kit, same narrative header assumed
unchanged (it documents the room's design, not its wiring, so it isn't part
of the boilerplate this kit removes):

```gdscript
extends Node3D

# Patrol loop is room-authored data either way — it does not move into the kit.
const WAYPOINTS: Array[Vector3] = [
	Vector3(3.5, 0, 3),
	Vector3(3.5, 0, -3),
	Vector3(-0.5, 0, -3),
	Vector3(-0.5, 0, 3),
	Vector3(1.8, 0, 3.5),
]

var _orderlies := KitOrderlyRoom.new({
	"orderly_specs": [{"waypoints": WAYPOINTS}],
	"spawn_x": 0.0,
	"spawn_z": 4.0,
	"catch_toast": 'hands. a needle. "there you are," he says.',
})

var _main: Node = null
var _told_gone := false


func on_enter(main: Node) -> void:
	_main = main
	_told_gone = false
	KitInteractables.wire_availability(self, func(_id): return true)
	_orderlies.spawn_all(self, main)
	main.hud_objective("the day room. he only exists when you do. the door out is the same.")


func on_interact(_id: String) -> bool:
	return false


func on_state_change(next: StateManager.State) -> void:
	if next == StateManager.State.LUCID and not _told_gone:
		_told_gone = true
		_main.hud_toast("gone. or — no. you just can't see him.")


func _physics_process(_delta: float) -> void:
	_orderlies.tick(_main)


func on_leave() -> void:
	_orderlies.dispose(_main)
```

**46 lines — a 93-line, ~67% cut**, and every line that remains is either
genuinely room-specific (the waypoint loop, the two narrative toasts, the
first-lucid-shift line) or an unavoidable duck-typed hook `main.gd` requires.
Everything that was pure orderly-lifecycle plumbing — the walker, the
availability match, the spawn/wire/dispose/fold/threat-push machinery, and
the six-step catch order — is gone, and the catch order specifically is now
*impossible* to get wrong per-room, because no room writes it anymore.

A keypad room (e.g. room 5, 7) saves proportionally more: the kit also
absorbs the refuse/open/success/objective flow and the scrawl-reroll wiring
that `KitOrderlyRoom` alone doesn't touch.

## 5. The randomize-codes contract

**CLAUDE.md hard rule:** the start-screen randomize-codes toggle **silently
skips any room that doesn't wire it.** There is no error, no warning, no
telemetry gap that flags it — the room just keeps its fixed, hard-coded code
forever, and nothing anywhere tells you that.

**The rule, in full:**

1. A keypad room owns a `KitKeypadLock` (or, pre-kit, its own `_code` +
   `_regenerate_code()` pair).
2. **On `on_enter`**, call `regenerate(main)` (or `_regenerate_code()`)
   unconditionally. It's a no-op when the setting is off
   (`WardCodes.is_randomize_codes_enabled()` early-returns —
   `kit/keypad_lock.gd:151-153`), so there's no reason to guard the call
   site.
3. **If the room has an orderly, call it again at the END of the catch
   handler** — after the standard catch penalty (`on_caught`,
   `KitOrderlyRoom`'s catch-order step 6, §3.1). A caught player must never
   be able to memorise a code across the reset the catch teleport
   represents. A keypad room with **no** orderly has no catch handler and
   therefore nothing to call a second time — rooms 2 and 9 document this
   explicitly (`rooms/room2/room2.gd:88`, `rooms/room9/room9.gd:149`).
4. Each reroll writes a fresh 4-digit code (`WardCodes.random_code_4()`) and
   rewrites every configured wall scrawl via `main.update_scrawl_text(id,
   WardCodes.code_clue_text(code, mask))`.

**The split-clue mask variant.** `code_clue_text(code, mask)` renders a code
as a spaced clue string (`"4 1 1 8"`), blanking everything **outside** the
half-open range `[start, end)` with an en dash. Rooms 5, 8, 10 and 12 split
one code across two scrawls on opposite sides of a patrol loop:

```gdscript
main.update_scrawl_text("codeScrawlA", WardCodes.code_clue_text(code, [0, 2]))
main.update_scrawl_text("codeScrawlB", WardCodes.code_clue_text(code, [2, 4]))
```

— the first scrawl shows digits 0-1 and dashes for 2-3, the second the
reverse, so no single scrawl leaks the whole code (`core/codes.gd:33-43`).
In `KitKeypadLock` this is just two entries in the `scrawls` array with
complementary `mask`s (§3.2).

**All 10 keypad rooms currently comply**: rooms 2, 5, 6, 7, 8, 9, 10, 11, 12,
17 all call `WardCodes.*` from `on_enter`, and every one of them *with* an
orderly (5, 6, 7, 8, 10, 11, 12, 17) calls it again as the last step of its
catch handler. Room 18 has a combination lock but deliberately does not
consult `WardCodes` at all (`rooms/room18/room18.gd:18`) — not a gap, a
documented exception for a mechanic that isn't a keypad code.

## 6. Orderly wiring gotchas

- **`waypoints` MUST be set BEFORE `add_child()`.** `Orderly._ready()`
  (`orderly/orderly.gd:111-117`) snaps `global_position` to `waypoints[0]`
  the moment the node enters the tree. Assign after `add_child` and the
  orderly spawns at the scene's authored origin instead of the patrol's
  first point — `KitOrderlyRoom._spawn_one` does this correctly
  (`kit/orderly_room.gd:114-124`); replicate the order exactly if you ever
  hand-roll a spawn.

- **Patrol waypoints are `const WAYPOINTS...` script constants**, and
  `tools/check_rooms.gd`'s `_check_patrol` validates **every** constant
  whose name starts with `WAYPOINTS` — not just one named exactly that
  (`check_rooms.gd:206-221`). This used to check only a constant literally
  named `WAYPOINTS` and silently skip (report success on!) any room whose
  route was named differently — which is every multi-orderly room. **A
  multi-orderly room must name its routes `WAYPOINTS_A`, `WAYPOINTS_B`,
  `WAYPOINTS_C`, ...** (see room 12's three, room 17's three) so the checker
  finds and validates each one, and so a failure names the specific route
  that's wrong.

- **The Godot `Orderly` takes no occluder list.** The Three.js
  `OrderlyAABB[]` a room author had to hand-maintain in sync with the room's
  real geometry has **no equivalent here and does not port.** `Orderly._occluded()`
  (`orderly/orderly.gd:262-272`) raycasts real wall/shelving/island colliders
  directly via a `RayCast3D` — strictly stronger than a hand-authored list,
  since it can never drift out of sync with what the room actually looks
  like. If you're porting a room from the TS build, drop the `occluders:`
  argument entirely; there's nothing to translate it to.

- **A multi-level room MUST pass `to_level` on any catch/reset teleport.**
  `main.gd:931-933` (`teleport_player`'s own header): omitting it keeps the
  player's *current* level, which silently stacks them at the wrong level's
  coordinates in any room with verticality. Room 17 does this correctly —
  `_main.teleport_player(SPAWN_X, SPAWN_Z, SPAWN_LEVEL)`
  (`rooms/room17/room17.gd:295`) — and also passes per-orderly `level`
  tags (`"ground"` / `"balcony"`) in its spec table
  (`rooms/room17/room17.gd:22-24`, `230-236`). In `KitOrderlyRoom` terms:
  set `spawn_level` on the config, and give any spec whose orderly lives on
  a non-default level its own `"level"` key.

## 7. Testing your room

`tools/test_kit.tscn` (backed by `tools/test_kit.gd`) is the kit's own
behavioural suite — pure-function tests against `KitOrderlyRoom.fold()`,
`KitKeypadLock`, and `KitDesign`, using a `StubMain` that implements only the
narrow slice of the room-script API those classes actually call
(`hud_toast`, `hud_objective`, `open_keypad`, `move_interactable`,
`unlock_door`, `update_scrawl_text` — `tools/test_kit.gd:154-185`). Per-room
suites (`test_mechanics.gd`, `test_room15.gd`, `test_room20.gd`, ...) follow
the same shape for room-specific logic. Run:

```
godot --headless --path godot tools/test_kit.tscn
```

Run as a **scene**, not `--script`: autoloads (`StateManager`, `GameState`,
`Tuning`, `Telemetry`) aren't registered for a bare `SceneTree` script, and
both `KitOrderlyRoom` and `KitKeypadLock` touch `StateManager`/`Telemetry`
directly (`tools/test_kit.gd:6-11`).

**Two traps this project has already paid for:**

**(a) A runtime error aborts only the enclosing function — the suite still
prints OK.** GDScript doesn't unwind past a function boundary on error; a
broken helper that throws mid-test silently drops every remaining assertion
in *that* function, and unless something is watching the total, the process
still exits 0. The fix already in place: every assertion routes through a
`_check(cond, what)` helper that increments a `passes` counter, and
`_finish()` prints an explicit `"N assertion(s) passed"` line
(`tools/test_kit.gd:26-32`, `56-60`, `302-312`). **Your suite must assert an
expected count too** — either a hard-coded number you update when you add
assertions, or (matching this file's convention) just print the count and
eyeball it against what you expect on every run. A silently-shrunk count is
the bug this convention exists to surface.

**(b) A new `class_name` file is invisible to a headless run until
imported — and the failure mode is a HANG, not a parse error.** Godot
registers global `class_name` scripts (`KitOrderlyRoom`, `KitKeypadLock`,
`KitDesign`, `KitInteractables`, and any new one you add) into
`.godot/global_script_class_cache.cfg` during an **import pass**, not merely
by the file existing on disk (`tools/test_kit.gd:13-24`). Add or rename a
`class_name` script and a headless run against a scene referencing it fails
to *parse* — and because the scene root's script never loads, **nothing ever
calls `quit()`**, so `godot --headless --path . tools/test_kit.tscn` hangs
forever instead of printing anything you'd recognize as the real cause. Fix:
run an import pass first, before running the suite, whenever you add or
rename a `kit/*.gd` (or any other new `class_name` file):

```
godot --headless --path . --import
```
