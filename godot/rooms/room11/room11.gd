# ROOM 11 — the Treatment Corridor.
#
# THE FIRST ROOM BUILT ON VERTICALITY (core/levels.gd). Tier 1 only: a
# single-valued floor height — one height zone (the mezzanine) plus one ramp,
# folded into the synthetic '__flat' level at load. No stacked levels, no
# stairwells; those are room 17's.
#
# Three chambers, north to south, joined by two unmed-sealed gates:
#   Z1 the entry hall     z[12,22]    spawn, dispenser11
#   Z2 the ward floor     z[-10,12]   sunken lower ward + railed mezzanine
#   Z3 the exit chamber   z[-18,-10]  seal reader, door, safety dispenser
#
# THE ECONOMY. on_enter forces UNMED at the threshold, so whatever state the
# player left room 10 in, they arrive here raw and gate 1 always costs a pill.
# PILLS_MAX is 1 game-wide, so dispenser11b sits inside the pocket between the
# two gates — the alternative is a gate that can never be paid. Both gates are
# unmed-sealed ONLY, so a lucid player can always retreat through either one
# for free, in either direction.
#
# THE ROUTE. The discharge request is scrawled on the east wall at MEZZANINE
# eye height (y = 0.9 + 1.65): climb the ramp at z[8,10] to read it, then
# search the three treatment bays and carry the matching upright seal down.
#
# --- TWO ORDERLIES, ONE PER HEIGHT BAND, AND WHAT ACTUALLY SEPARATES THEM ---
#
# BE CLEAR-EYED ABOUT THIS. Orderly.level gates both sight and the contact
# catch categorically, but that gate only discriminates between DIFFERENT
# levels. Room 11 is tier 1: there is exactly one level ('__flat') and both
# orderlies are on it, as is the player, everywhere in the room. The height
# zone is a rendered Y, not a level. So the categorical gate does NOT apply
# here and cannot be leaned on. Their separation is geometry, and only
# geometry:
#
#   LOWER (WAYPOINTS_A, x[-8,-6] z[-3,5]) — his sight range is a flat 6m in
#   XZ. His maximum x is -6; the platform/ramp footprint starts at x=1. That
#   is a 7m gap on the x axis alone, regardless of z, so no point of the
#   raised complex is ever inside his sight range. Nearest approach to either
#   gate opening is 8.06m ((-6,5)->(-2,12) and (-6,-3)->(-2,-10)), clear of
#   the 8.17m-ish inspection guideline and far past the 6m he can see.
#
#   UPPER (WAYPOINTS_B, x=2, z[1.2,6.8]) — he patrols the platform's west
#   rail. The request scrawl on the east wall is at (8.78, 4); nearest patrol
#   point is (2, 4), i.e. 6.78m, just past his 6m range. Reading the code from
#   the wall is therefore unseeable from his loop.
#
#   UPPER vs THE LOWER WARD — the one claim that does NOT hold on distance.
#   From (2, 1.2) a point like (-3, 1.2) on the sunken floor is 5m away, well
#   inside 6m, so plain XZ distance does NOT separate him from the lower ward.
#   What separates them is the WEST RAILING: a collider in this game is
#   full-height in Y (core/collision.gd), and Orderly._occluded() casts a real
#   RayCast3D against LAYER_WORLD_STATIC. The rail x[0.88,1.12] z[0,10] spans
#   y 0..3, so every eye-to-eye ray from the platform to the lower floor
#   across z[0,10] is blocked by it. North of the platform the north rail
#   x[1,9] z[-0.12,0.12] does the same. He therefore cannot see down off his
#   own band — by occlusion, not by the level filter and not by distance.
#   Chase is also contained: try_move resolves him against the same rail, so
#   he cannot leave the platform except by the ramp mouth.
#
# CATCH. A catch teleports to spawn (z=20, ground) — no `to_level` argument,
# deliberately: this room has one level and passing '__flat' explicitly would
# imply otherwise. Y re-eases from the lookup on the next tick either way.
#
# PUZZLE: read the requested upright seal from the mezzanine, search three
# treatment bays raw, then file the matching seal while lucid. A held seal
# survives a catch; only an uncollected request is rerolled.
extends Node3D

const ORDERLY := preload("res://orderly/orderly.tscn")

const SPAWN_X := 0.0
const SPAWN_Z := 20.0

const MEZZ_Y := 0.9
const TREATMENT_SHAPES := ["circle", "square", "triangle"]
var _required_shape := "circle"
var _seal_held := false

# Orderly LOWER — the sunken west side. Validated by check_rooms.gd's
# _check_patrol, which reads EVERY constant whose name starts with WAYPOINTS.
const WAYPOINTS_A: Array[Vector3] = [
	Vector3(-6, 0, 5),
	Vector3(-6, 0, -3),
	Vector3(-8, 0, -3),
	Vector3(-8, 0, 5),
]

# Orderly UPPER — a short back-and-forth along the platform's west rail. The Y
# component is the mezzanine height rather than 0 so that his very first frame
# is right: Orderly._ready() snaps him to waypoints[0] before setup() hands him
# world_levels, and only after that does _apply_floor_height() take over. It is
# never read by the patrol logic, which is flat XZ throughout.
const WAYPOINTS_B: Array[Vector3] = [
	Vector3(2, MEZZ_Y, 1.2),
	Vector3(2, MEZZ_Y, 6.8),
]

# Door swing, from the former keypadDoor layout: hinge at the gap's start (x=-1) and
# DOOR_SWING_DEPTH 0.85 past the wall line, rotated a quarter turn so it lies
# flat against the vestibule's west wall.
const DOOR_OPEN_POS := Vector3(-1, 1.5, -18.85)

var _orderly_lower: CharacterBody3D = null
var _orderly_upper: CharacterBody3D = null
var _door_unlocked := false
var _saw_unmed_toast := false

var _main: Node = null


func on_enter(main: Node) -> void:
	_main = main
	_door_unlocked = false
	_seal_held = false
	_saw_unmed_toast = false

	for node in _interactables():
		node.availability = _is_available

	_choose_shape()
	_spawn_orderlies()

	# Forces the double spend regardless of how room 10 was left. Touches the
	# state only — pills are untouched.
	StateManager.force_state(StateManager.State.UNMED, "room11_enter")
	main.shift_fx()
	main.hud_toast("you come to mid-stride, raw. the calm hasn't caught up yet.")
	main.hud_objective(
		"the treatment corridor climbs. carry enough for both gates — and both floors.")


func _interactables() -> Array[Interactable]:
	var out: Array[Interactable] = []
	var root := get_node_or_null("Interactables")
	if root == null:
		return out
	for child in root.get_children():
		if child is Interactable:
			out.append(child as Interactable)
		else:
			for sub in child.get_children():
				if sub is Interactable:
					out.append(sub as Interactable)
	return out


func _is_available(id: String) -> bool:
	match id:
		"exitdoor":
			return false
		"reader11": return not _door_unlocked
		_: return not (id.begins_with("treatment11_") and _seal_held)


func on_interact(id: String) -> bool:
	if id.begins_with("treatment11_"):
		var shape := id.trim_prefix("treatment11_")
		if not TREATMENT_SHAPES.has(shape):
			return false
		if _seal_held or _door_unlocked:
			return true
		if StateManager.is_lucid():
			_main.hud_toast("the seal has no shape while you're quiet.")
			return true
		if shape != _required_shape:
			Telemetry.event("puzzle_step", {"puzzle":"treatment11", "step":"mismatch", "shape":shape})
			_main.emit_noise("treatment_mismatch", _main.player.global_position, _main.player.level)
			_main.hud_toast("wrong seal. the mezzanine shows what they requested.")
			return true
		_seal_held = true
		_main.remove_interactable(id)
		Telemetry.event("puzzle_step", {"puzzle":"treatment11", "step":"seal_taken", "shape":shape})
		_main.hud_toast("the %s seal fits your hand. keep it." % shape)
		_main.hud_objective("carry the seal to the reader. calm hands can file it.")
		return true
	if id != "reader11": return false
	if not _seal_held:
		_main.hud_toast("the reader wants a %s seal. search the treatment bays." % _required_shape)
		return true
	if not StateManager.is_lucid():
		_main.hud_toast("the reader will not hold still. steady your hands.")
		return true
	_on_reader_accepted()
	return true



func _on_reader_accepted() -> void:
	if _door_unlocked:
		return
	_door_unlocked = true
	_main.move_interactable("exitdoor", DOOR_OPEN_POS, PI / 2.0)
	_main.unlock_door("DoorCollider")
	Telemetry.event("puzzle_step", {"puzzle":"treatment11", "step":"complete", "shape":_required_shape})
	_main.hud_toast("filed under %s. the door lets you through." % _required_shape)
	_main.hud_objective("the door is open. go.")


func on_state_change(next: StateManager.State) -> void:
	if next == StateManager.State.UNMED and not _saw_unmed_toast:
		_saw_unmed_toast = true
		_main.hud_toast("the treatment bays throw two shadows now.")


# A catch changes an uncollected request; earned seals remain valid.

func _choose_shape(avoid_previous := false) -> void:
	if _seal_held or _door_unlocked: return
	var choices: Array = TREATMENT_SHAPES.duplicate()
	if avoid_previous: choices.erase(_required_shape)
	_required_shape = str(choices.pick_random())
	_main.update_scrawl_text("shapeRequest11", "discharge request:\n" + _required_shape)
	var reader: Interactable = _main._find_interactable(self, "reader11")
	if reader != null and reader.get_node_or_null("Model") != null:
		var model: Node = reader.get_node("Model")
		if model.has_method("set_shape"): model.set_shape(_required_shape)
	Telemetry.event("puzzle_layout", {"puzzle":"treatment11", "shape":_required_shape})


# --- the orderlies ---------------------------------------------------------

func _spawn_orderlies() -> void:
	_orderly_lower = _spawn_one(_orderly_lower, WAYPOINTS_A)
	_orderly_upper = _spawn_one(_orderly_upper, WAYPOINTS_B)


func _spawn_one(existing: CharacterBody3D, route: Array[Vector3]) -> CharacterBody3D:
	if existing != null:
		existing.queue_free()

	var o: CharacterBody3D = ORDERLY.instantiate()
	# Waypoints must be set before add_child: Orderly._ready() snaps him to
	# waypoints[0].
	o.waypoints = route.duplicate()
	add_child(o)
	# The third argument is the whole verticality wiring: with it his rendered
	# Y follows his own level's floor height each tick, so UPPER stands ON the
	# mezzanine instead of sunk 0.9m into it. It can never change his `level`.
	o.setup(_main.player, _main.collision, _main.levels)

	o.warned.connect(_on_warned)
	o.chase_started.connect(_on_chase_started)
	o.caught.connect(_on_caught)
	return o


func _on_warned() -> void:
	_main.hud_toast("he is looking at you.")
	Telemetry.event("orderly_spotted")


func _on_chase_started() -> void:
	_main.hud_toast("run. or stop being visible.")
	Telemetry.event("orderly_chase")


# CATCH PENALTY — the order is load-bearing, same as room 6.
#
# Telemetry FIRST (the event snapshots player position at emit time, so
# emitting after the teleport records the spawn point for every catch and
# flattens the heat-map to one dot); the code reroll LAST, so a player cannot
# memorise the code across a reset. No pills are lost.
func _on_caught() -> void:
	Telemetry.event("orderly_caught")
	StateManager.force_state(StateManager.State.LUCID, "catch")
	_main.shift_fx()
	_main.teleport_player(SPAWN_X, SPAWN_Z)
	_main.hud_toast('hands. a needle. "up or down, you\'re still mine," he says.')
	_choose_shape(true)


# Chase-priority threat aggregation, ported from room11.ts's update(): chasing
# beats watching, a higher watch ramp beats a lower one, nearer breaks the tie.
# Only the winner's bearing goes to the HUD arrow.
func _physics_process(_delta: float) -> void:
	if _orderly_lower == null or _orderly_upper == null or _main == null:
		return

	var w_lower: float = _orderly_lower.watching()
	var w_upper: float = _orderly_upper.watching()
	var level: float = maxf(w_lower, w_upper)
	var chasing: bool = _orderly_lower.is_chasing() or _orderly_upper.is_chasing()

	if level <= 0.0 and not chasing:
		_main.set_threat(0.0, null)
		return

	var primary: CharacterBody3D = _orderly_lower
	if _orderly_upper.is_chasing() and not _orderly_lower.is_chasing():
		primary = _orderly_upper
	elif _orderly_lower.is_chasing() == _orderly_upper.is_chasing():
		if w_upper > w_lower:
			primary = _orderly_upper
		elif is_equal_approx(w_upper, w_lower) \
				and _orderly_upper.distance_to_player() < _orderly_lower.distance_to_player():
			primary = _orderly_upper

	_main.set_threat(level, primary.bearing_from(_main.player.yaw))


func on_leave() -> void:
	if _main != null:
		_main.set_threat(0.0, null)
	for o in [_orderly_lower, _orderly_upper]:
		if o != null:
			o.queue_free()
	_orderly_lower = null
	_orderly_upper = null
