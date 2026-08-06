# ROOM 6 — the West Corridor.
#
# First bend in the ward, first room where the dispenser isn't waiting at the
# safe entrance: it sits in an alcove off the long leg of the L, right where
# his patrol runs. The exit code is scrawled unmed-only, further down the
# same leg, past the alcove. Nothing here is individually new — you've read
# scrawls unmed, you've fed a keypad lucid, you've shared a room with him —
# the room just makes you leapfrog all three at once: dash unmed for the
# code, fall back to the alcove to restock, cross lucid at the moment that
# actually matters.
#
# The exit is EAST (x = 12), not north like every room before it.
extends Node3D

const ORDERLY := preload("res://orderly/orderly.tscn")

# Spawn (0, 7) — the south end of leg A, 6.2m from wp0, i.e. just outside his
# 6m sight range. A player frozen at the entrance is never seen at all.
const SPAWN_X := 0.0
const SPAWN_Z := 7.0

# Full back-and-forth traversal of the L: south leg, corner, a south-leaning
# bow through the long leg, and BACK — this list is a palindrome on purpose,
# so the repeated (4.0,-3.75) and (0,-2.0) entries are not a copy/paste slip.
# He retraces the long leg rather than looping, which is what keeps the
# alcove's mouth covered from both directions.
#
# The corner waypoint sits at z=-2.0 (inside leg B's own z span) rather than
# at the junction, so every leg is a straight line that never grazes the wall
# between leg A and leg B. wp0 was pulled back from z=5.5 to z=0.8 after
# playtest 7 (worst-case time-to-contact at the entrance was ~0.8s); the bow
# through the long leg replaced a single straight diagonal after playtest 8
# for the same reason at the corner scrawl, the code scrawl and the keypad.
# Patrol clearance stays > 0.5m from every collider (min 0.68m).
const WAYPOINTS: Array[Vector3] = [
	Vector3(0, 0, 0.8),
	Vector3(0, 0, -2.0),
	Vector3(4.0, 0, -3.75),
	Vector3(9.2, 0, -2.0),
	Vector3(4.0, 0, -3.75),
	Vector3(0, 0, -2.0),
]

var _code := "6329"

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
	main.hud_objective("the corridor bends. the way out wants a code, and it is not on the keypad.")


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
		"keypad6":
			return not _door_unlocked
	return true


func on_interact(id: String) -> bool:
	if id == "keypad6":
		if not StateManager.is_lucid():
			_main.hud_toast("the keypad is a smear of static. you can't read it like this.")
			return true
		# main.open_keypad emits keypad_open/success/denied itself.
		_main.open_keypad(_code, _on_code_accepted)
		return true

	return false


func _on_code_accepted() -> void:
	_door_unlocked = true
	_main.move_interactable("exitdoor", Vector3(12.85, 1.5, -1.9), PI / 2.0)
	_main.unlock_door("DoorCollider")
	# Interpolates the LIVE code — a rerolled code must read back correctly.
	_main.hud_toast("%s. someone counted his steps before you." % _code)
	_main.hud_objective("the door is open. go.")


func on_state_change(next: StateManager.State) -> void:
	if next == StateManager.State.UNMED and not _saw_unmed_toast:
		_saw_unmed_toast = true
		_main.hud_toast("the corridor goes red at the edges. he goes solid.")


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
# The reroll goes LAST, so a player cannot memorise the code across a reset.
# No pills are lost and no progress is cleared — a catch is deliberately
# cheap; here the cost is the whole length of the L, again.
func _on_caught() -> void:
	Telemetry.event("orderly_caught")
	StateManager.force_state(StateManager.State.LUCID, "catch")
	_main.shift_fx()
	_main.teleport_player(SPAWN_X, SPAWN_Z)
	_main.hud_toast('hands. a needle. "back to the start," he says.')
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
