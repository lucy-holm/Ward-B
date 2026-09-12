# ROOM 6 — the West Corridor.
#
# First bend in the ward, first room where the dispenser is not waiting at the
# safe entrance: it sits in an alcove off the long leg of the L, right where
# his patrol runs. The way out is a two-step maintenance job: recover an
# identifiable service fuse while unmedicated, then fit and power the panel
# while lucid. The first action makes noise and brings the existing orderly
# back over the corridor, so the alcove remains a recoverable refill route.
#
# SOFT-LOCK AUDIT: the fuse is unmedicated-only, but it is beside the alcove
# dispenser. A catch preserves the pickup and returns to the room's normal
# spawn; a player who spends the pill before the panel can always return to
# that dispenser and refill. No collider is state-filtered here.
#
# REACTION-TIME AUDIT: the panel is at the east cap, 2.6m from the patrol's
# nearest long-leg point, but it is only inspected lucid, when orderlies cannot
# catch the player. The fuse is a quick pickup in the pressure alcove, not a
# stand-and-read clue; its deliberate noise is the warning that the route has
# changed.
extends Node3D

const ORDERLY := preload("res://orderly/orderly.tscn")

const SPAWN_X := 0.0
const SPAWN_Z := 7.0

const WAYPOINTS: Array[Vector3] = [
	Vector3(0, 0, 0.8),
	Vector3(0, 0, -2.0),
	Vector3(4.0, 0, -3.75),
	Vector3(9.2, 0, -2.0),
	Vector3(4.0, 0, -3.75),
	Vector3(0, 0, -2.0),
]

var _orderly: CharacterBody3D = null
var _door_unlocked := false
var _part_recovered := false
var _panel_powered := false
var _saw_unmed_toast := false
var _main: Node = null


func on_enter(main: Node) -> void:
	_main = main
	_door_unlocked = _panel_powered
	_saw_unmed_toast = false

	for node in _interactables():
		node.availability = _is_available

	_spawn_orderly()
	main.hud_objective(
		"the corridor bends. recover the service fuse while you are raw.")
	if _part_recovered and not _panel_powered:
		main.hud_objective("reach the service panel. carry the fuse there.")
	elif _panel_powered:
		main.hud_objective("the panel is awake. go.")


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
		"service_part6":
			return not _part_recovered
		"service_panel6":
			return _part_recovered and not _panel_powered
	return true


func on_interact(id: String) -> bool:
	if id == "service_part6":
		if _part_recovered:
			return true
		if StateManager.is_lucid():
			return true # stale focus during a shift cannot collect an absent fuse
		_part_recovered = true
		_main.remove_interactable("service_part6")
		Telemetry.event("puzzle_step", {
			"puzzle": "room6_maintenance", "step": "part_recovered"})
		WardAudio.dispenser_clunk()
		var responders: int = _main.emit_noise("service_fuse_recovered",
			_main.player.global_position, _main.player.level)
		_main.hud_toast("the fuse is warm. %s heard that." %
			("someone" if responders > 0 else "the ward") )
		_main.hud_objective("reach the service panel. carry the fuse there.")
		return true

	if id == "service_panel6":
		if not _part_recovered:
			return true
		if not StateManager.is_lucid():
			_main.hud_toast("the panel is dead to you. lucid hands only.")
			return true
		_on_panel_powered()
		return true

	return false


func _on_panel_powered() -> void:
	if _panel_powered:
		return
	_panel_powered = true
	_door_unlocked = true
	Telemetry.event("puzzle_step", {
		"puzzle": "room6_maintenance", "step": "panel_powered"})
	WardAudio.dispenser_clunk()
	var responders: int = _main.emit_noise("service_panel_powered",
		_main.player.global_position, _main.player.level)
	_main.move_interactable("exitdoor", Vector3(12.85, 1.5, -1.9), PI / 2.0)
	_main.unlock_door("DoorCollider")
	_main.hud_toast("the panel wakes. %s counted his steps before you." %
		("someone" if responders > 0 else "the ward"))
	_main.hud_objective("the door is open. go.")


func on_state_change(next: StateManager.State) -> void:
	if next == StateManager.State.UNMED and not _saw_unmed_toast:
		_saw_unmed_toast = true
		_main.hud_toast("the corridor goes red at the edges. he goes solid.")


# --- the orderly -----------------------------------------------------------

func _spawn_orderly() -> void:
	if _orderly != null:
		_orderly.queue_free()
		_orderly = null

	_orderly = ORDERLY.instantiate()
	_orderly.waypoints = WAYPOINTS.duplicate()
	add_child(_orderly)
	_orderly.setup(_main.player, _main.collision)

	_orderly.warned.connect(_on_warned)
	_orderly.chase_started.connect(_on_chase_started)
	_orderly.caught.connect(_on_caught)


func _on_warned() -> void:
	_main.hud_toast("he is looking at you.")
	Telemetry.event("orderly_spotted")


func _on_chase_started() -> void:
	_main.hud_toast("run. or stop being visible.")
	Telemetry.event("orderly_chase")


# CATCH PENALTY — completed maintenance steps survive. The player is returned
# to the ordinary spawn, where the alcove dispenser is reachable for a refill;
# no puzzle state or inventory is cleared by a catch.
func _on_caught() -> void:
	Telemetry.event("orderly_caught")
	StateManager.force_state(StateManager.State.LUCID, "catch")
	_main.shift_fx()
	_main.teleport_player(SPAWN_X, SPAWN_Z)
	_main.hud_toast('hands. a needle. "back to the start," he says.')


func _physics_process(_delta: float) -> void:
	if _orderly == null or _main == null:
		return

	var level: float = _orderly.watching()
	if level > 0.0 or _orderly.is_chasing():
		_main.set_threat(level, _orderly.bearing_from(_main.player.yaw))
	else:
		_main.set_threat(0.0, null)


func on_leave() -> void:
	if _main != null:
		_main.set_threat(0.0, null)
	if _orderly != null:
		_orderly.queue_free()
		_orderly = null
