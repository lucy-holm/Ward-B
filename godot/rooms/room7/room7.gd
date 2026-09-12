# ROOM 7 — Records matching.
# Three shape-marked seals occupy separate sheltered shelf areas. Read the
# discharge request raw, choose its matching seal, then file it while lucid.
# Shapes repeat the later sorting-room vocabulary without another digit lock.
# Catch: reroll only an uncollected request; held seals and opened doors persist.
# Fairness: the request is behind row A, every seal sits outside the patrol
# belt and behind shelf cover, and the original dispenser/escape lanes remain.
extends Node3D

const ORDERLY := preload("res://orderly/orderly.tscn")

# Spawn (0, 4) — behind row A, on the entrance side of his belt.
const SPAWN_X := 0.0
const SPAWN_Z := 4.0

# The belt: a rectangle spanning the full pocket between all three rows, west
# edge close to row A/C's gap column, east edge close to row B's gap column
# (x=1.5) — there is no lane past either end that dodges him.
#
# East legs sit at x=1.0, not 1.3: his body radius is 0.4 and row B starts at
# x=1.5, so anything past 1.1 wedges him against the shelf mid-leg. The south
# edge was pulled from z=-1.3 up to z=0.3 after playtest 7 — the old SE
# corner sat 3.47m from the old lock with its panel almost dead ahead down the
# east leg (~1.28s worst-case time-to-contact); it is now 5.06m, ~1.65s.
# Still > 0.5m clear of ROW_C (2.1m), and the belt still spans the full
# corridor width, so the double-crossing separation holds.
const WAYPOINTS: Array[Vector3] = [
	Vector3(-4.3, 0, 1.3),
	Vector3(1.0, 0, 1.3),
	Vector3(1.0, 0, 0.3),
	Vector3(-4.3, 0, 0.3),
]

const RECORD_SHAPES := ["circle", "square", "triangle"]
var _required_shape := "circle"
var _record_held := false

var _orderly: CharacterBody3D = null
var _door_unlocked := false
var _saw_unmed_toast := false

var _main: Node = null


func on_enter(main: Node) -> void:
	_main = main
	_door_unlocked = false
	_record_held = false
	_saw_unmed_toast = false

	for node in _interactables():
		node.availability = _is_available

	_choose_record()
	_spawn_orderly()
	main.hud_objective("one discharge file. read its shape raw, then find the matching seal behind the shelves.")


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
	if id == "record_reader7":
		return not _door_unlocked
	if id.begins_with("record7_"):
		return not _record_held
	return true


func on_interact(id: String) -> bool:
	if id.begins_with("record7_"):
		var selected := id.trim_prefix("record7_")
		if not RECORD_SHAPES.has(selected) or _record_held:
			return true
		if StateManager.is_lucid():
			_main.hud_toast("the seal has no shape while you're quiet.")
			return true
		if selected != _required_shape:
			Telemetry.event("puzzle_step", {"puzzle": "records7", "step": "mismatch", "shape": selected})
			_main.emit_noise("record_mismatch", _main.player.global_position, _main.player.level)
			_main.hud_toast("wrong file. match the shape on the door reader.")
			return true
		_record_held = true
		_main.remove_interactable(id)
		Telemetry.event("puzzle_step", {"puzzle": "records7", "step": "record_taken", "shape": selected})
		_main.hud_toast("the %s seal fits your hand. keep it." % selected)
		_main.hud_objective("carry the seal through the shelves. the archive reader needs lucid hands.")
		return true
	if id != "record_reader7":
		return false
	if _door_unlocked:
		return true
	if not _record_held:
		_main.hud_toast("the reader wants a %s seal. look behind the shelves." % _required_shape)
		return true
	if not StateManager.is_lucid():
		_main.hud_toast("the slot won't hold still. steady your hands.")
		return true
	_door_unlocked = true
	_main.move_interactable("exitdoor", Vector3(-1, 1.5, -5.85), PI / 2.0)
	_main.unlock_door("DoorCollider")
	Telemetry.event("puzzle_step", {"puzzle": "records7", "step": "complete"})
	_main.hud_toast("filed under your shape. the door lets you through.")
	_main.hud_objective("the door is open. go.")
	return true


func _choose_record(avoid_previous := false) -> void:
	if _record_held or _door_unlocked:
		return
	var previous := _required_shape
	var choices: Array = RECORD_SHAPES.duplicate()
	if avoid_previous:
		choices.erase(previous)
	_required_shape = str(choices.pick_random())
	_update_request_display()
	Telemetry.event("puzzle_layout", {"puzzle": "records7", "shape": _required_shape})

func _update_request_display() -> void:
	_main.update_scrawl_text("recordClue7", "discharge file:\n" + _required_shape)
	var reader: Interactable = _main._find_interactable(self, "record_reader7")
	if reader != null:
		var model := reader.get_node_or_null("Model")
		if model != null and model.has_method("set_shape"):
			model.set_shape(_required_shape)


func on_state_change(next: StateManager.State) -> void:
	if next == StateManager.State.UNMED and not _saw_unmed_toast:
		_saw_unmed_toast = true
		_main.hud_toast("the shelves throw a shadow that keeps his shape.")


# --- the orderly -----------------------------------------------------------

func _spawn_orderly() -> void:
	if _orderly != null:
		_orderly.queue_free()
		_orderly = null

	_orderly = ORDERLY.instantiate()
	# Waypoints must be set before add_child: Orderly._ready() snaps him to
	# waypoints[0].
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


# CATCH PENALTY — the order below is load-bearing.
#
# Telemetry FIRST: the event snapshots player position at emit time, so
# emitting after the teleport would record the spawn point for every catch
# and flatten the catch heat-map into a single dot.
#
# An uncollected request changes last; a held seal survives every catch.
func _on_caught() -> void:
	Telemetry.event("orderly_caught")
	StateManager.force_state(StateManager.State.LUCID, "catch")
	_main.shift_fx()
	_main.teleport_player(SPAWN_X, SPAWN_Z)
	_main.hud_toast('hands. a needle. "you\'ll lose your place," he says.')
	_choose_record(true)


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
