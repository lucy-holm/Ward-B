# ROOM 19 / 'lights' — the Undercroft, long way round.
#
# THE PAYOFF OF THE WING. Room 18's relay wrote GameState flag "room18.power";
# main.gd's ROOM_VARIANTS resolved "room19" to this scene rather than
# rooms/room19_doors, and the player will never see the other one this run.
# Two scene FILES, not one scene that prunes itself: a room whose contents
# depend on runtime state cannot be opened, screenshotted or soft-lock-audited
# as an artifact, and this pair's entire reason to exist is that both branches
# are honestly buildable.
#
# THIS SCRIPT DELIBERATELY NEVER READS THE FLAG. The scene IS the branch. If
# you find yourself adding an `if power ==` here, the two-scene decision has
# been undone.
#
# THE ROUTE. Vestibule -> east archway (x[-4,-1] at z=2) -> across the lower
# floor -> up the ramp in the south-east corner -> onto the platform at y=0.9,
# which is a safe breather -> back down -> a second ground crossing, north-west
# to the exit. Two exposure windows bracketing a place to stand still: room 9's
# beat, at double the doors branch's travel.
#
# THE PROMISE, AND WHAT IT ACTUALLY IS. The platform is unseeable from his
# patrol, and that is proved by tools/test_rooms1819.gd sampling his real route
# against the real RayCast3D the Orderly uses, ignoring his facing cone
# entirely — so it holds even against an orderly who could look every way at
# once. What makes it true is geometry, not a table of occluders: Godot's
# Orderly takes no occluder list, and every collider in this game is a 3m box,
# so RailWest, RailSouth and RampWall block his line of sight exactly as walls
# do. The raised region has ONE opening, the ramp mouth at x[4.5,7] z=-1, and
# no straight line from his patrol reaches the platform through it.
#
# WHAT THE PROMISE IS NOT. It is not the categorical cross-LEVEL gate room 17
# is built on — this room is TIER 1 (a single-valued floor height), so he and
# the player share the '__flat' level and he is not barred from the platform's
# XZ by construction. A chase that STARTS on the lower floor can follow you up
# the ramp, and should: what the platform guarantees is that a chase never
# starts because of you standing on it.
#
# SOFT-LOCK AUDIT. dispenser19 sits in the vestibule, reachable unmed on entry
# with 0 pills, before any hazard geometry, and occluded from every patrol
# point within his 6m sight range by the divider wall x[-7,-4]. NO collider in
# this room is state-filtered (every one is a plain wall, rail or knee wall),
# so crossing is always physically possible unmed and a mistimed medication
# revert is an ordinary revert, never a geometry trap. Neither branch of room
# 19 requires a pill to cross; the dispenser is insurance for room 20. Catch =
# forced lucid + teleport to spawn, pills kept.
#
# REACTION-TIME AUDIT. The platform is the only stand-and-look-around spot and
# it is provably unseeable (above), which is a strictly stronger statement than
# the 8.2m inspection-point distance. The ramp and both floor crossings are
# crossings, held to the moving-target standard every hallway room uses. The
# west scrawl at (-6.85, -3.5) is 3.5m from the (-4,-3)..(-4,-6) leg — inside
# his sight range, deliberately: it is a one-line taunt on the way past, not an
# inspection point, and it is legible in motion.
extends Node3D

const ORDERLY := preload("res://orderly/orderly.tscn")

const SPAWN_X := -4.5
const SPAWN_Z := 3.2

# THE LOWER-FLOOR BELT. Confined west of RailWest (x=1.88) with 0.88m of
# clearance against his 0.4m radius, and south of the north wall by 1.88m. He
# owns the whole crossing and none of the climb.
const WAYPOINTS: Array[Vector3] = [
	Vector3(-4, 0, 0.5),
	Vector3(1, 0, 0.5),
	Vector3(1, 0, -6),
	Vector3(-4, 0, -6),
]

# The raised region, as the test reads it. Kept here rather than in the test so
# the room and its proof cannot drift: PLATFORM is the breather the promise
# covers, LIP is the overlook off its south-west shoulder, and both are what
# tools/test_rooms1819.gd samples. The ramp is NOT in this list — it is a
# crossing, and it is visible from the floor on purpose.
const PLATFORM_RECT := Rect2(2.0, -8.0, 5.0, 5.0)   # x[2,7]   z[-8,-3]
const LIP_RECT := Rect2(2.0, -3.0, 2.5, 2.0)        # x[2,4.5] z[-3,-1]
const PLATFORM_Y := 0.9

var _main: Node = null
var _orderly: CharacterBody3D = null
var _saw_unmed_toast := false
var _saw_breather := false


func on_enter(main: Node) -> void:
	_main = main
	_saw_unmed_toast = false
	_saw_breather = false
	_spawn_orderly()
	main.hud_objective("up onto the floor above, then down and across. mind the crossings.")


func _spawn_orderly() -> void:
	if _orderly != null:
		_orderly.queue_free()
		_orderly = null

	_orderly = ORDERLY.instantiate()
	# Waypoints before add_child: Orderly._ready() snaps him to waypoints[0].
	_orderly.waypoints = WAYPOINTS.duplicate()
	add_child(_orderly)
	# The third argument is the verticality wiring. His `level` stays '__flat'
	# and can never change; what it buys is that if a chase carries him up the
	# ramp he rides the slope instead of sinking through it. Presentation only.
	_orderly.setup(_main.player, _main.collision, _main.levels)

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

	# The breather, said out loud once. Cheap point-in-rect against the same
	# constant the test proves unseeable, so the beat can never land somewhere
	# the guarantee does not cover.
	if not _saw_breather and _main.player != null:
		var p: Vector3 = _main.player.global_position
		if PLATFORM_RECT.has_point(Vector2(p.x, p.z)):
			_saw_breather = true
			_main.hud_objective("he cannot see you up here. take the breath, then go down and across.")


func _on_warned() -> void:
	_toast("the one on the floor sees you.")
	Telemetry.event("orderly_spotted")


func _on_chase_started() -> void:
	_toast("get above him, or run.")
	Telemetry.event("orderly_chase")


# Telemetry FIRST — the event snapshots player position at emit time. The
# teleport names no level on purpose: this room is Tier 1, so there is only
# '__flat' to return to, and the height eases from the lookup.
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
