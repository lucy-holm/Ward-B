# ROOM 5 — the Nurse Station.
#
# The capstone: every mechanic at once, in one room, under threat. A central
# island — occluder, collider, and the only reliable shadow — sits inside the
# orderly's patrol loop. The exit code is scrawled unmed-only, split in half,
# on opposite sides of that loop, so reading either half means standing in
# space he actually walks through. The keypad that spends the code only works
# lucid. The player has to plan a route: scout blind-to-him first (lucid,
# safe, useless), then unmed (dangerous, legible), then back to lucid to
# cross and open the door.
extends Node3D

const ORDERLY := preload("res://orderly/orderly.tscn")

# Spawn (0, 4.3) — south of the patrol loop's z <= 2.6 footprint, so the
# teleport-back after a catch never drops the player inside his lane.
const SPAWN_X := 0.0
const SPAWN_Z := 4.3

# Patrol loop encircling the island, well clear of both the medication-window
# corridor and the seating corridor on its outside, and of the island itself
# on its inside — the donut between island and lane is where both code halves
# live, and is exactly where his line of sight sweeps as he approaches each
# leg.
const WAYPOINTS: Array[Vector3] = [
	Vector3(4.4, 0, 2.6),
	Vector3(4.4, 0, -2.6),
	Vector3(-4.4, 0, -2.6),
	Vector3(-4.4, 0, 2.6),
]

# One code, two scrawls, opposite sides of the loop.
var _code := "1907"

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
	main.hud_objective("the nurse station. the code is written where he walks.")


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
		# Scenery: the keypad opens it, never a hand on the door.
		"exitdoor":
			return false
		"keypad5":
			return not _door_unlocked
	return true


func on_interact(id: String) -> bool:
	if id == "keypad5":
		if not StateManager.is_lucid():
			_main.hud_toast("the keypad is a smear of static. you can't read it like this.")
			return true
		# main.open_keypad emits keypad_open/success/denied itself.
		_main.open_keypad(_code, _on_code_accepted)
		return true

	return false


func _on_code_accepted() -> void:
	_door_unlocked = true
	_main.move_interactable("exitdoor", Vector3(-1, 1.5, -6.85), PI / 2.0)
	_main.unlock_door("DoorCollider")
	# Interpolates the LIVE code — a rerolled code must read back correctly.
	_main.hud_toast("%s. someone never finished their shift." % _code)
	_main.hud_objective("the door is open. go.")


func on_state_change(next: StateManager.State) -> void:
	if next == StateManager.State.UNMED and not _saw_unmed_toast:
		_saw_unmed_toast = true
		_main.hud_toast("the station throws a shadow. it moves with him, not for you.")


# --- randomize-codes (CLAUDE.md hard rule) ---------------------------------
# The only room that splits one code across two scrawls: A carries digits
# [0,2), B carries [2,4), and the mask blanks the rest with an en dash.
func _regenerate_code() -> void:
	if not WardCodes.is_randomize_codes_enabled():
		return
	_code = WardCodes.random_code_4()
	_main.update_scrawl_text("codeScrawlA", WardCodes.code_clue_text(_code, [0, 2]))
	_main.update_scrawl_text("codeScrawlB", WardCodes.code_clue_text(_code, [2, 4]))


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
# The reroll goes LAST, so a player cannot memorise the code across a reset.
# No pills are lost and no progress is cleared — a catch is deliberately
# cheap; the punishment is the walk back through his loop, twice.
func _on_caught() -> void:
	Telemetry.event("orderly_caught")
	StateManager.force_state(StateManager.State.LUCID, "catch")
	_main.shift_fx()
	_main.teleport_player(SPAWN_X, SPAWN_Z)
	_main.hud_toast('hands. a needle. "not this time," he says.')
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
