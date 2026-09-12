# ROOM 8 — The ward calls back.
# Read a shape sequence in the dispenser alcove; ring distributed call bells
# raw while two orderlies patrol. Each sound can draw an investigation.
# No keypad: the route between physical bells is the puzzle. Correct bells
# latch and survive catches; a wrong future bell clears the sequence.
# The original cover, refill and patrol geometry are preserved. All bells
# have shape AND color cues so monochrome never removes required information.
extends Node3D

const ORDERLY := preload("res://orderly/orderly.tscn")

# Spawn (0, 5) — south of both loops (A tops out at z=2.1, B at z=4.5) and
# well outside the 6m sight range of either one's nearest leg, so the
# teleport-back after a catch never drops the player in front of somebody.
const SPAWN_X := 0.0
const SPAWN_Z := 5.0

# Orderly A — a tight inner orbit hugging the island, COUNTER-CLOCKWISE.
#
# Reversed from the original clockwise order (same four points, same
# clearances, opposite rotation) so he no longer circulates the same way as B's
# figure-eight. Playtest 7: with both loops turning the same way they tended to
# sit on the same side of the island at the same time and read as "walking
# together" rather than as two independent threats. Starting at index 0 (the SW
# corner) also phase-separates him from B, who starts on the north leg — so at
# room entry they are in different halves of the room instead of both hanging
# around the south/spawn side.
#
# Legs sit 0.8m off the island collider (island z +-1.3, legs at z +-2.1) and
# 1.3m off it on the x legs — his body is 0.4m, so both clear the 0.5m rule.
const WAYPOINTS_A: Array[Vector3] = [
	Vector3(-3.2, 0, 2.1),
	Vector3(-3.2, 0, -2.1),
	Vector3(3.2, 0, -2.1),
	Vector3(3.2, 0, 2.1),
]

# Orderly B — a wide figure-eight. The two centre waypoints (0, -+2.5) are its
# waist, each hugging one face of the island, along the crossing between bell stations:
# he crosses both scrawls every lap, from opposite directions.
#
# West legs at x=-7.3, NOT -7.5: the filing block's collider reaches x=-7.89
# and his body radius is 0.4, so -7.5 left only 0.39m clearance and he wedged
# on the block mid-leg (the same failure as room 7's east leg). At -7.3 the
# clearance is 0.59m — the tightest margin in the room, so do not drift this
# leg west without re-checking it.
#
# Rotated one waypoint from the original start of (7.5, 4.5): that is the
# south/spawn-side corner, the same half of the room A's original start was in,
# and another contributor to the "walking together" read. Same six points, same
# legs, just phase-shifted so B now opens on the north leg.
const WAYPOINTS_B: Array[Vector3] = [
	Vector3(7.5, 0, -5.5),
	Vector3(0, 0, -2.5),
	Vector3(-7.3, 0, -5.5),
	Vector3(-7.3, 0, 4.5),
	Vector3(0, 0, 2.5),
	Vector3(7.5, 0, 4.5),
]

# tools/check_rooms.gd's patrol validator looks up a constant named literally
# WAYPOINTS and skips the room entirely when it finds nothing — so a
# two-orderly room would go completely unvalidated without this alias. It
# covers route A only; route B is NOT reached by that check. Both routes were
# verified by hand against every always-on collider in this room (min
# clearance: A 0.80m, B 0.59m, against a 0.50m requirement).
const WAYPOINTS: Array[Vector3] = WAYPOINTS_A

const BELL_SHAPES := ["circle", "square", "triangle"]
var _bell_order: Array = []
var _bell_progress := 0

var _orderly_a: CharacterBody3D = null
var _orderly_b: CharacterBody3D = null
var _door_unlocked := false
var _saw_unmed_toast := false

var _main: Node = null


func on_enter(main: Node) -> void:
	_main = main
	_door_unlocked = false
	_saw_unmed_toast = false

	for node in _interactables():
		node.availability = _is_available

	_bell_order = BELL_SHAPES.duplicate()
	_bell_order.shuffle()
	_bell_progress = 0
	_main.update_scrawl_text("bellOrder8", "bell order\n1. %s\n2. %s\n3. %s" % _bell_order)
	Telemetry.event("puzzle_layout", {"puzzle": "call_bells8", "order": _bell_order.duplicate()})
	_update_bells()
	_spawn_orderlies()
	main.hud_objective("read the numbered order above the medicine. press each matching wall bell while unmedicated.")


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
	if id == "exitdoor":
		return false
	if id.begins_with("bell8_"):
		return not _door_unlocked and not id.trim_prefix("bell8_") in _bell_order.slice(0, _bell_progress)
	return true


func on_interact(id: String) -> bool:
	if not id.begins_with("bell8_"):
		return false
	var shape := id.trim_prefix("bell8_")
	if not BELL_SHAPES.has(shape) or _door_unlocked or shape in _bell_order.slice(0, _bell_progress):
		return true
	if StateManager.is_lucid():
		_main.hud_toast("under the quiet, the bell makes no sound. ring it raw.")
		return true
	WardAudio.dispenser_clunk()
	_main.emit_noise("call_bell_" + shape, _main.player.global_position, _main.player.level)
	if shape != _bell_order[_bell_progress]:
		_bell_progress = 0
		_update_bells()
		Telemetry.event("puzzle_step", {"puzzle": "call_bells8", "step": "sequence_reset", "shape": shape})
		_main.hud_toast("the wrong bell. all three lamps go dark.")
		_main.hud_objective("read the order beside the dispenser. the bells only answer raw.")
		return true
	_bell_progress += 1
	_update_bells()
	Telemetry.event("puzzle_step", {"puzzle": "call_bells8", "step": "bell_latched", "shape": shape, "count": _bell_progress})
	if _bell_progress < _bell_order.size():
		_main.hud_toast("%d of three. the lamp holds. the sound carries." % _bell_progress)
		_main.hud_objective("%d of three bells stay lit. keep the order. medicine can buy you a crossing." % _bell_progress)
		return true
	_door_unlocked = true
	_main.move_interactable("exitdoor", Vector3(-1, 1.5, -8.85), PI / 2.0)
	_main.unlock_door("DoorCollider")
	Telemetry.event("puzzle_step", {"puzzle": "call_bells8", "step": "complete"})
	_main.hud_toast("the ward has heard enough. the door opens.")
	_main.hud_objective("all three lamps hold. through the door.")
	return true


func _update_bells() -> void:
	for shape: String in BELL_SHAPES:
		var bell: Interactable = _main._find_interactable(self, "bell8_" + shape)
		if bell != null:
			var model := bell.get_node_or_null("Model")
			if model != null and model.has_method("set_engaged"):
				model.set_engaged(shape in _bell_order.slice(0, _bell_progress))


func on_state_change(next: StateManager.State) -> void:
	if next == StateManager.State.UNMED and not _saw_unmed_toast:
		_saw_unmed_toast = true
		_main.hud_toast("the island throws two shadows now.")


# --- the orderlies ---------------------------------------------------------
# Two of them, wired identically except for the warn toast, so the player can
# tell which one just noticed them.

func _spawn_orderlies() -> void:
	# Defensive free before respawn, same as rooms 5-7: on_enter runs once per
	# room instance today, but a second call here would leave FOUR of them
	# patrolling and only two of them tracked.
	on_leave()
	_orderly_a = _spawn_one(WAYPOINTS_A, _on_warned_a)
	_orderly_b = _spawn_one(WAYPOINTS_B, _on_warned_b)


func _spawn_one(waypoints: Array[Vector3], on_warned: Callable) -> CharacterBody3D:
	var orderly: CharacterBody3D = ORDERLY.instantiate()
	# Waypoints must be set before add_child: Orderly._ready() snaps him to
	# waypoints[0].
	orderly.waypoints = waypoints.duplicate()
	add_child(orderly)
	orderly.setup(_main.player, _main.collision)

	orderly.warned.connect(on_warned)
	orderly.chase_started.connect(_on_chase_started)
	orderly.caught.connect(_on_caught)
	return orderly


func _on_warned_a() -> void:
	_main.hud_toast("he is looking at you.")
	Telemetry.event("orderly_spotted")


func _on_warned_b() -> void:
	_main.hud_toast("the other one is looking at you too.")
	Telemetry.event("orderly_spotted")


func _on_chase_started() -> void:
	_main.hud_toast("run. or stop being visible.")
	Telemetry.event("orderly_chase")


# CATCH PENALTY — the order below is load-bearing, and is shared by both of
# them: whichever one lands the contact, the penalty is the same.
#
# Telemetry FIRST: the event snapshots player position at emit time, so
# emitting after the teleport would record the spawn point for every catch and
# flatten the catch heat-map into a single dot.
#
# Correct bells remain latched after a catch. Re-crossing the room is the cost.
func _on_caught() -> void:
	Telemetry.event("orderly_caught")
	StateManager.force_state(StateManager.State.LUCID, "catch")
	_main.shift_fx()
	_main.teleport_player(SPAWN_X, SPAWN_Z)
	_main.hud_toast('hands. a needle. "there are two of us now," he says.')
	# Latched bells survive restraint; only a wrong bell resets them.


func _physics_process(_delta: float) -> void:
	if _orderly_a == null or _orderly_b == null or _main == null:
		return

	var watch_a: float = _orderly_a.watching()
	var watch_b: float = _orderly_b.watching()
	var chasing: bool = _orderly_a.is_chasing() or _orderly_b.is_chasing()
	var level: float = maxf(watch_a, watch_b)

	if level <= 0.0 and not chasing:
		_main.set_threat(0.0, null)
		return

	# The arrow can only point at one of them, so point it at the bigger
	# threat: chasing beats watching, a higher watch-ramp beats a lower one,
	# and proximity breaks an exact tie.
	var primary: CharacterBody3D = _orderly_a
	if _orderly_b.is_chasing() and not _orderly_a.is_chasing():
		primary = _orderly_b
	elif _orderly_a.is_chasing() == _orderly_b.is_chasing():
		if watch_b > watch_a:
			primary = _orderly_b
		elif watch_b == watch_a \
				and _orderly_b.distance_to_player() < _orderly_a.distance_to_player():
			primary = _orderly_b

	_main.set_threat(level, primary.bearing_from(_main.player.yaw))


func on_leave() -> void:
	if _main != null:
		_main.set_threat(0.0, null)
	for orderly in [_orderly_a, _orderly_b]:
		if orderly != null:
			orderly.queue_free()
	_orderly_a = null
	_orderly_b = null
