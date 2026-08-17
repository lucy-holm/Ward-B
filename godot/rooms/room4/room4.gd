# ROOM 4 — the Day Room.
#
# The ward's first NPC. LUCID: he's completely invisible — you never know
# where he is while medicated. UNMED: he's revealed, too tall, too still
# between steps, and he sees YOU wrong — watched long enough, he gives chase,
# and contact restrains you and forces medication. Shifting lucid is always
# safe, even mid-chase (the escape costs the pill it always costs). This
# inverts rooms 2-3's lesson: unmed shows the truth, but truth has a
# predator. The staff door only exists while unmedicated — you have to cross
# his room, in the state he hunts, to leave it.
#
# No keypad here, so no randomize-codes wiring: there is no code in this room
# to reroll. The catch is therefore pure position/state penalty.
extends Node3D

const ORDERLY := preload("res://orderly/orderly.tscn")

# Spawn (0, 4) — the teleport-back point after a catch. Matches the Spawn
# marker in room4.tscn; kept as constants so the catch handler doesn't have
# to go looking for the node.
const SPAWN_X := 0.0
const SPAWN_Z := 4.0

# Patrol loop kept east/central of the shelving unit (x >= -0.5), leaving the
# west wall (x <= -3, in the shelf's shadow) as a readable safe lane and a
# wide margin around the spawn-side dispenser. The fifth waypoint bulges the
# south edge toward the spawn side (z 3 -> 3.5) so the leg nearest the
# player's first sightline is two shorter, closer strides instead of one long
# distant one — he reads as walking, not parked, right when he's first seen.
const WAYPOINTS: Array[Vector3] = [
	Vector3(3.5, 0, 3),
	Vector3(3.5, 0, -3),
	Vector3(-0.5, 0, -3),
	Vector3(-0.5, 0, 3),
	Vector3(1.8, 0, 3.5),
]

var _orderly: CharacterBody3D = null
var _told_gone := false  # first lucid shift in the room gets its own line

var _main: Node = null


func on_enter(main: Node) -> void:
	_main = main
	_told_gone = false

	for node in _interactables():
		node.availability = _is_available

	_spawn_orderly()
	main.hud_objective("the day room. he only exists when you do. the door out is the same.")


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


func _is_available(_id: String) -> bool:
	# Only the dispenser lives here, and it is never gated.
	return true


func on_interact(_id: String) -> bool:
	return false


func on_state_change(next: StateManager.State) -> void:
	# The orderly subscribes to state_changed himself, so nothing to forward.
	if next == StateManager.State.LUCID and not _told_gone:
		_told_gone = true
		_main.hud_toast("gone. or — no. you just can't see him.")


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
# The TS called forceState('lucid') with no source argument here (rooms 5-7
# and the shared kit all pass 'catch'); "catch" is used in all four Godot
# rooms so the funnel doesn't have one room reporting a blank source.
#
# No pills are lost and no progress is cleared. A catch is deliberately cheap
# — the punishment is the walk back, not a reset.
func _on_caught() -> void:
	Telemetry.event("orderly_caught")
	StateManager.force_state(StateManager.State.LUCID, "catch")
	_main.shift_fx()
	_main.teleport_player(SPAWN_X, SPAWN_Z)
	_main.hud_toast('hands. a needle. "there you are," he says.')


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
