# ROOM 7 — the Records Room.
#
# Three shelving rows still force a serpentine crossing (east gap, west gap,
# east gap), but the beat is a forced backtrack, not a single crossing: the
# exit keypad sits right past the maze, reachable lucid and blind with no
# code in hand. The code — and the dispenser, still hidden behind a row —
# both live in the back half, by the entrance you just walked away from. So
# the route is keypad first (safe, useless), then unmed back through the maze
# to read the code and refill, then unmed (or lucid, if you spend the pill
# right there) forward through it again to actually open the door. His patrol
# lives in the pocket between all three rows — the belt you cross both ways —
# with a row's mass to duck behind on either approach.
#
# PORT NOTE: in the Godot build this room's exit is "END" — rooms 8+ are not
# ported yet, so the exit chain terminates here. Everything else about the
# success/exit logic is unchanged from the TS.
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
# corner sat 3.47m from keypad7 with the keypad almost dead ahead down the
# east leg (~1.28s worst-case time-to-contact); it is now 5.06m, ~1.65s.
# Still > 0.5m clear of ROW_C (2.1m), and the belt still spans the full
# corridor width, so the double-crossing separation holds.
const WAYPOINTS: Array[Vector3] = [
	Vector3(-4.3, 0, 1.3),
	Vector3(1.0, 0, 1.3),
	Vector3(1.0, 0, 0.3),
	Vector3(-4.3, 0, 0.3),
]

var _code := "0452"

var _orderly: CharacterBody3D = null
var _door_unlocked := false
var _saw_unmed_toast := false

var _main: Node = null


func on_enter(main: Node) -> void:
	_main = main
	_door_unlocked = false
	_saw_unmed_toast = false

	for node in _interactables():
		node.availability = _is_available

	_regenerate_code()
	_spawn_orderly()
	main.hud_objective("the records room. paperwork nobody reads. something hums, somewhere behind it.")


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
		"keypad7":
			return not _door_unlocked
	return true


func on_interact(id: String) -> bool:
	if id == "keypad7":
		if not StateManager.is_lucid():
			_main.hud_toast("the keypad is a smear of static. you can't read it like this.")
			return true
		# main.open_keypad emits keypad_open/success/denied itself.
		_main.open_keypad(_code, _on_code_accepted)
		return true

	return false


func _on_code_accepted() -> void:
	_door_unlocked = true
	_main.move_interactable("exitdoor", Vector3(-1, 1.5, -5.85), PI / 2.0)
	_main.unlock_door("DoorCollider")
	# Interpolates the LIVE code — a rerolled code must read back correctly.
	_main.hud_toast("%s. filed under nothing." % _code)
	_main.hud_objective("the door is open. go.")


func on_state_change(next: StateManager.State) -> void:
	if next == StateManager.State.UNMED and not _saw_unmed_toast:
		_saw_unmed_toast = true
		_main.hud_toast("the shelves throw a shadow that keeps his shape.")


# --- randomize-codes (CLAUDE.md hard rule) ---------------------------------

func _regenerate_code() -> void:
	if not WardCodes.is_randomize_codes_enabled():
		return
	_code = WardCodes.random_code_4()
	_main.update_scrawl_text("codeScrawl", WardCodes.code_clue_text(_code))


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
# The reroll goes LAST, so a player cannot memorise the code across a reset —
# which matters most here, where the code is a full maze-crossing away from
# the keypad that spends it.
func _on_caught() -> void:
	Telemetry.event("orderly_caught")
	StateManager.force_state(StateManager.State.LUCID, "catch")
	_main.shift_fx()
	_main.teleport_player(SPAWN_X, SPAWN_Z)
	_main.hud_toast('hands. a needle. "you\'ll lose your place," he says.')
	_regenerate_code()


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
