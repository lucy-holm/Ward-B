# ROOM 19 / 'doors' — the Undercroft, short way.
#
# THE PAYOFF OF THE WING. Room 18's relay wrote GameState flag "room18.power";
# main.gd's ROOM_VARIANTS resolved "room19" to this scene rather than
# rooms/room19_lights, and the player will never see the other one this run.
# Two scene FILES, not one scene that prunes itself: a room whose contents
# depend on runtime state cannot be opened, screenshotted or soft-lock-audited
# as an artifact.
#
# THIS SCRIPT DELIBERATELY NEVER READS THE FLAG. The scene IS the branch.
#
# THE ROUTE, all of it: through the archway at z=2 into a 3m-wide unlit
# corridor (x[-6,-3]) and straight up its 10m length to the exit. That is the
# whole room. He patrols nearly its entire run and there is no cover anywhere
# in it — no console, no nook, no second lane. He effectively IS the corridor;
# you read his position from the mouth and time ONE pass.
#
# WHY IT IS FAIR. The trade is time-under-threat and how well you can see him
# coming, NOT pills: this branch has no lucid gate and not one state-filtered
# collider, exactly like the lights branch. It is roughly half the travel of
# the other build with one exposure window instead of two, and no breather.
# Nothing in the pair ever says which choice was smarter, because there isn't
# one.
#
# THE DARK IS A LEGIBILITY LEVER, NOT A BLACKOUT. Three fittings, all of them
# at or south of the corridor mouth; the corridor itself has none. The renderer
# keeps a base ambient regardless of per-room fittings, so the player can still
# navigate — they just get far less warning of him at range. That is the entire
# difference in feel, and it costs no geometry.
#
# SOFT-LOCK AUDIT. dispenser19 sits in the vestibule, reachable unmed on entry
# with 0 pills, outside the corridor entirely — his belt never reaches z>-1,
# and the corridor's own west wall (x=-6, z[-8,2]) stands between every patrol
# point and the dispenser regardless. No collider here is state-filtered, so a
# medication revert anywhere is an ordinary revert and crossing is always
# physically possible unmed. Catch = forced lucid + teleport to spawn, pills
# kept, which in this room is a clean retry of the one thing it asks.
#
# REACTION-TIME AUDIT. There is no stand-and-read spot inside the hazard: the
# only fixture in the corridor is its far exit, and both corridor scrawls are
# read on the move. Pass by zone separation (the same category as room 18's
# dispenser), not by the 8.2m raw-distance rule. tools/test_rooms1819.gd
# asserts the dispenser case against the real ray.
#
# THE EAST HALF OF THE ROOM IS NEVER BUILT. Where the lights branch's ramp and
# platform stand, this build has a wall and a scrawl reading "wrong wiring for
# this door. it never opens." The dead space behind it is sealed by the
# corridor's east wall for the room's whole length.
extends Node3D

const ORDERLY := preload("res://orderly/orderly.tscn")

const SPAWN_X := -4.5
const SPAWN_Z := 3.2

# THE CORRIDOR BELT. A slim rectangle spanning nearly the whole 10m run, so
# every metre of the crossing is inside his loop. Clearances: 1.38m to the west
# wall, 0.68m to the east wall, against his 0.4m radius plus the 0.1m margin.
const WAYPOINTS: Array[Vector3] = [
	Vector3(-4.5, 0, -1),
	Vector3(-4.5, 0, -6.5),
	Vector3(-3.8, 0, -6.5),
	Vector3(-3.8, 0, -1),
]

var _main: Node = null
var _orderly: CharacterBody3D = null
var _saw_unmed_toast := false


func on_enter(main: Node) -> void:
	_main = main
	_saw_unmed_toast = false
	_spawn_orderly()
	main.hud_objective("the corridor ahead is dark, and it is not empty. find the gap in his walk.")


func _spawn_orderly() -> void:
	if _orderly != null:
		_orderly.queue_free()
		_orderly = null

	_orderly = ORDERLY.instantiate()
	# Waypoints before add_child: Orderly._ready() snaps him to waypoints[0].
	_orderly.waypoints = WAYPOINTS.duplicate()
	add_child(_orderly)
	# Flat room — no WardLevels third argument, he stands at y=0 always.
	_orderly.setup(_main.player, _main.collision)

	_orderly.warned.connect(_on_warned)
	_orderly.chase_started.connect(_on_chase_started)
	_orderly.caught.connect(_on_caught)


func on_state_change(next: StateManager.State) -> void:
	if next == StateManager.State.UNMED and not _saw_unmed_toast:
		_saw_unmed_toast = true
		_toast("the hum resolves into footsteps that keep his shape.")


func _physics_process(_delta: float) -> void:
	if _main == null or _orderly == null:
		return
	var level: float = _orderly.watching()
	if level > 0.0 or _orderly.is_chasing():
		_main.set_threat(level, _orderly.bearing_from(_main.player.yaw))
	else:
		_main.set_threat(0.0, null)


func _on_warned() -> void:
	_toast("he is right there in the dark.")
	Telemetry.event("orderly_spotted")


func _on_chase_started() -> void:
	_toast("run. or stop being visible.")
	Telemetry.event("orderly_chase")


# Telemetry FIRST — the event snapshots player position at emit time.
func _on_caught() -> void:
	Telemetry.event("orderly_caught")
	StateManager.force_state(StateManager.State.LUCID, "catch")
	_main.shift_fx()
	_main.teleport_player(SPAWN_X, SPAWN_Z)
	_toast('hands. a needle. "you don\'t get to pick twice," he says.')


func _toast(text: String) -> void:
	if _main != null:
		_main.hud_toast(text)


func on_leave() -> void:
	if _main != null:
		_main.set_threat(0.0, null)
	if _orderly != null:
		_orderly.queue_free()
		_orderly = null
