# The N-orderly room lifecycle, factored out of the 17 rooms that hand-roll
# it: spawn-with-waypoints-before-add_child, setup() against the player and a
# collision fallback, the warned/chase_started/caught signal wiring, the
# load-bearing catch-penalty ORDER, and the per-frame threat fold that feeds
# main.set_threat.
#
# WHY A DICTIONARY-PER-ORDERLY TABLE, NOT N HAND-WIRED INSTANCES. Rooms 12
# and 17 already do this for exactly the reason this kit generalises it:
# past one orderly, hand-wiring N copies of setup()+signal-connect is the
# duplication, not the orderly count. A single-orderly room is just a
# one-entry `orderly_specs` array; nothing about the API forks on N.
#
# CATCH ORDER IS LOAD-BEARING (see _on_caught below) and reproduced exactly,
# byte-for-byte in sequence, from every hand-rolled catch handler. THREAT
# AGGREGATION uses the FOLDED loop shape (rooms 12, 15, 20), not the
# pairwise if/elif chain (rooms 8, 10, 11, 13, 17) — the fold is O(n) written
# once instead of O(n) written as a chain that would need editing for a
# fourth or fifth orderly; see `fold()`.
class_name KitOrderlyRoom
extends RefCounted

const ORDERLY := preload("res://orderly/orderly.tscn")

## One entry per orderly to spawn. Recognised keys, all optional except
## "waypoints":
##   waypoints    Array[Vector3]  patrol loop; REQUIRED.
##   level        String          stacked-level tag (Orderly.level). Omitted
##                                 means "leave Orderly's own default
##                                 ('__flat')", which is correct for every
##                                 flat room.
##   warn_toast   String          shown on the `warned` signal.
##   chase_toast  String          shown on `chase_started`. Every existing
##                                 room uses the same line ("run. or stop
##                                 being visible."), which is this field's
##                                 default, so most specs never set it.
##   caught_toast String          shown on `caught`, AFTER the standard catch
##                                 penalty below. Falls back to `catch_toast`
##                                 (the room-wide default) when absent — room
##                                 12 has one line for the whole room, room 17
##                                 gives each orderly its own.
var orderly_specs: Array[Dictionary] = []

## Catch-teleport target. `spawn_level` empty omits the third argument to
## main.teleport_player, which keeps the player's current level — correct
## for every single-level room. A stacked room (room 17) MUST set this
## explicitly; see main.gd's teleport_player header on why omitting it stacks
## the player at the wrong level's coordinates.
var spawn_x := 0.0
var spawn_z := 0.0
var spawn_level := ""

## Room-wide catch toast, used by any orderly whose spec has no
## "caught_toast" of its own.
var catch_toast := ""

## Passed straight through to Orderly.setup()'s third argument. Null is the
## correct value for every room without verticality; a room with any
## stacked levels at all should pass `main.levels` — see orderly.gd's header
## on why this can change only presentation (rendered Y), never `level`
## itself, and main.gd's `levels` field header on why it is always safe to
## hand over unconditionally.
var levels: WardLevels = null

## Room-owned collision fallback. Null (the default) means every orderly
## gets `main.collision`, which is correct for every room but 13 — see its
## header on why its two orderlies need a collision set with the moving
## slabs excluded by node identity rather than the room's whole collider
## cache.
var collision_override: WardCollision = null

## Fire AFTER the standard behaviour above them, so a room can append
## something the generic lifecycle cannot know about — most commonly a code
## reroll (`KitKeypadLock.regenerate`) at the end of a catch. Left unset
## (`Callable()`, the default) is a legal no-op; `is_valid()` gates every
## call site below.
var on_caught: Callable = Callable()
var on_warned: Callable = Callable()
var on_chase_started: Callable = Callable()

var _orderlies: Array[CharacterBody3D] = []
var _main: Node = null


## `config` accepts any of the fields above by name. Optional — every field
## also has a public setter-by-assignment, matching KitKeypadLock's
## convention, so a room can build one with no arguments and configure it in
## statements instead if that reads better for that room.
func _init(config: Dictionary = {}) -> void:
	orderly_specs = config.get("orderly_specs", orderly_specs)
	spawn_x = config.get("spawn_x", spawn_x)
	spawn_z = config.get("spawn_z", spawn_z)
	spawn_level = config.get("spawn_level", spawn_level)
	catch_toast = config.get("catch_toast", catch_toast)
	levels = config.get("levels", levels)
	collision_override = config.get("collision_override", collision_override)
	on_caught = config.get("on_caught", on_caught)
	on_warned = config.get("on_warned", on_warned)
	on_chase_started = config.get("on_chase_started", on_chase_started)


## Frees any previously-spawned orderlies, then instantiates one per
## `orderly_specs` entry under `room` and wires it up. Call from on_enter,
## exactly where every hand-rolled `_spawn_orderlies` is called from.
func spawn_all(room: Node, main: Node) -> void:
	_main = main
	_free_all()

	# STACKED-ROOM GUARD. `levels` defaults to null, and null is CORRECT for
	# every flat room — Orderly.setup treats it as "floor is y=0 everywhere",
	# which is what rooms 1-10 want. The hazard is the stacked room whose
	# author forgot to pass it: nothing errors, the orderly simply patrols
	# against the wrong floor's height and collision, and the result looks
	# plausible in a screenshot and in a headless run. That is precisely the
	# class of bug that survives to playtest, so it is worth one warning here.
	#
	# Detected by asking the world, not the author: a room with more than one
	# authored level is a stacked room by definition (WardLevels always holds
	# at least the synthetic '__flat' entry, so >1 means genuinely authored).
	if levels == null and main != null and main.levels != null:
		if main.levels.levels.size() > 1:
			push_warning(
				"KitOrderlyRoom: room has %d stacked levels but `levels` was "
				% main.levels.levels.size()
				+ "not set — orderlies will resolve height and collision "
				+ "against the wrong floor. Pass `levels = main.levels`.")

	for spec: Dictionary in orderly_specs:
		_spawn_one(room, spec)


func _spawn_one(room: Node, spec: Dictionary) -> void:
	var o: CharacterBody3D = ORDERLY.instantiate()

	# Waypoints (and level) MUST be assigned before add_child: Orderly._ready()
	# snaps global_position to waypoints[0] and — for a stacked room — the
	# level needs to be correct from that very first frame, not patched in
	# after. Ported verbatim from every hand-rolled `_spawn_one`/
	# `_spawn_orderly`'s own comment to this effect.
	var waypoints: Array[Vector3] = spec.get("waypoints", [])
	o.waypoints = waypoints.duplicate()
	if spec.has("level"):
		o.level = spec["level"]

	room.add_child(o)

	var fallback: WardCollision = (
		collision_override if collision_override != null else _main.collision)
	o.setup(_main.player, fallback, levels)

	var warn_toast: String = spec.get("warn_toast", "he is looking at you.")
	var chase_toast: String = spec.get("chase_toast", "run. or stop being visible.")
	var caught_toast: String = spec.get("caught_toast", catch_toast)

	o.warned.connect(_on_warned.bind(warn_toast))
	o.chase_started.connect(_on_chase_started.bind(chase_toast))
	o.caught.connect(_on_caught.bind(caught_toast))

	_orderlies.append(o)


## Frees every spawned orderly and zeroes the threat indicator. Call from
## on_leave — matching every hand-rolled version, which always clears threat
## before freeing so the HUD arrow cannot survive into the next room for one
## frame.
func dispose(main: Node) -> void:
	if main != null:
		main.set_threat(0.0, null)
	_free_all()


func _free_all() -> void:
	for o in _orderlies:
		if is_instance_valid(o):
			o.queue_free()
	_orderlies.clear()


func _on_warned(toast: String) -> void:
	_main.hud_toast(toast)
	Telemetry.event("orderly_spotted")
	if on_warned.is_valid():
		on_warned.call()


func _on_chase_started(toast: String) -> void:
	_main.hud_toast(toast)
	Telemetry.event("orderly_chase")
	if on_chase_started.is_valid():
		on_chase_started.call()


## CATCH PENALTY — the order below is load-bearing, reproduced exactly from
## every hand-rolled `_on_caught`/`_on_catch`:
##
##   1. Telemetry.event("orderly_caught") FIRST. The event snapshots the
##      player's position at emit time (Telemetry's snapshot_provider), so
##      emitting it after the teleport would record the TELEPORT DESTINATION
##      for every single catch and flatten the catch heat-map to one dot at
##      spawn instead of showing where players actually get caught.
##   2. StateManager.force_state(LUCID, "catch") — force_state never spends a
##      pill (see StateManager's own header), so this is free; it is what
##      makes "get caught" a legitimate escape hatch rather than an
##      additional cost on top of a soft-lock.
##   3. main.shift_fx() — the visual/audio kick that sells the state change.
##   4. main.teleport_player(...) — done AFTER the state change so the
##      player already reads as lucid the instant they land.
##   5. The room's caught toast.
##   6. `on_caught`, LAST, so a room-specific tail (most commonly a
##      KitKeypadLock.regenerate reroll) cannot race or reorder anything
##      above it — a caught player must never be able to memorise a code
##      across the reset this teleport represents.
func _on_caught(toast: String) -> void:
	Telemetry.event("orderly_caught")
	StateManager.force_state(StateManager.State.LUCID, "catch")
	_main.shift_fx()
	if spawn_level == "":
		_main.teleport_player(spawn_x, spawn_z)
	else:
		_main.teleport_player(spawn_x, spawn_z, spawn_level)
	if toast != "":
		_main.hud_toast(toast)
	if on_caught.is_valid():
		on_caught.call()


## Pure fold over a live orderly list: which one should drive the HUD threat
## indicator, and at what level. Exposed as a static function, separately
## from `tick()`, for two reasons — `tick()` can reuse it, and it can be
## exercised directly in a test against bare Orderly instances with no room,
## no `main`, and no player node beyond a bare position.
##
## SELECTION RULE, folded one candidate at a time rather than compared
## pairwise (see the header): a chasing orderly always beats a merely
## watching one; among orderlies in the same chase/watch state, a higher
## watch ramp wins; ties on ramp break toward whichever is nearer the
## player. `level` is the max watching() across ALL orderlies (not just the
## winning one) — this is what lets a second orderly's rising ramp show up
## on the HUD meter even while a different, nearer orderly is still the
## bearing target.
##
## Returns {"level": float, "chasing": bool, "primary": CharacterBody3D}.
## `primary` is null and `level` is 0.0 for an empty or all-invalid list —
## the caller turns that into `set_threat(0.0, null)`, the same "nobody's
## watching" signal the HUD and audio bus expect.
static func fold(orderlies: Array, player_pos: Vector3) -> Dictionary:
	var level := 0.0
	var chasing := false
	var primary: CharacterBody3D = null
	var primary_dist := INF

	for o in orderlies:
		if o == null or not is_instance_valid(o):
			continue
		var w: float = o.watching()
		var d := Vector2(o.global_position.x - player_pos.x,
			o.global_position.z - player_pos.z).length()
		level = maxf(level, w)
		chasing = chasing or o.is_chasing()

		if primary == null:
			primary = o
			primary_dist = d
			continue
		if o.is_chasing() and not primary.is_chasing():
			primary = o
			primary_dist = d
		elif o.is_chasing() == primary.is_chasing():
			if w > primary.watching():
				primary = o
				primary_dist = d
			elif w == primary.watching() and d < primary_dist:
				primary = o
				primary_dist = d

	return {"level": level, "chasing": chasing, "primary": primary}


## Call once per room _physics_process. Does the fold above and pushes the
## result straight into main.set_threat — the entirety of every hand-rolled
## room's `_physics_process` body.
func tick(main: Node) -> void:
	if main == null or _orderlies.is_empty():
		return

	var player_pos: Vector3 = main.player.global_position
	var result := fold(_orderlies, player_pos)
	var level: float = result["level"]
	var chasing: bool = result["chasing"]
	var primary: CharacterBody3D = result["primary"]

	if (level > 0.0 or chasing) and primary != null:
		main.set_threat(level, primary.bearing_from(main.player.yaw))
	else:
		main.set_threat(0.0, null)
