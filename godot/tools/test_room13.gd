# Behavioural tests for room 13's closing slabs.
#
#   godot --headless --path godot tools/test_room13.tscn
#
# Room 13 is the only room whose geometry MOVES at runtime, and the only one
# where the movement solver's cached AABBs have to be maintained by hand. None
# of that is visible to check_rooms (which instantiates a room and never ticks
# it) or to tools/shoot.gd (which renders one frame of a room with no player).
# The soft-lock argument in room13.gd's header is only worth anything if
# something actually runs it, so this does.
#
# It drives the room's _physics_process by hand against a stub main, and after
# EVERY tick asserts the invariant the whole audit rests on: the player is at a
# position WardCollision.try_move accepts, in both ward states. A frozen player
# is the failure mode — try_move refuses every move out of a box you are
# already inside — so "is the player embedded" is the question that matters,
# not "did the wall reach them".
#
# The last test is the exception: the orderlies have to run on REAL physics
# frames, because their movement goes through NavigationAgent3D and an agent
# on a never-synced navigation map answers with the origin. See its comment.
extends Node

var failures: Array[String] = []
var passes := 0


# Everything room13.gd touches on main. Duck-typed, exactly as the real one is.
class StubMain extends Node:
	var player: Node3D = null
	var collision: WardCollision = null
	var toasts: Array[String] = []
	var objective := ""
	var shifts := 0
	var threat_level := 0.0

	func teleport_player(x: float, z: float, _level := "") -> void:
		player.global_position = Vector3(x, player.global_position.y, z)

	func shift_fx() -> void:
		shifts += 1

	func hud_toast(text: String) -> void:
		toasts.append(text)

	func hud_objective(text: String) -> void:
		objective = text

	func set_threat(level: float, _bearing) -> void:
		threat_level = level


var _room: Node3D = null
var _main: StubMain = null


func _ready() -> void:
	_setup()
	_test_authored_state()
	_test_orderly_collider_set()
	_test_unmed_holds()
	_test_outside_stretch_holds()
	_test_closing_and_push()
	_test_crush_resets_attempt()
	_test_no_freeze_after_shift()
	_test_entering_a_narrowed_stretch()
	await _test_orderlies_walk_a_squeezed_corridor()
	_finish()


func _setup() -> void:
	var packed: PackedScene = load("res://rooms/room13/room13.tscn")
	_room = packed.instantiate()
	add_child(_room)

	_main = StubMain.new()
	_main.collision = WardCollision.new()
	_main.collision.rebuild_from(_room)
	_main.player = load("res://tools/test_stub_player.gd").new()
	add_child(_main.player)
	add_child(_main)

	# Stop the engine from double-stepping anything: every tick in this file
	# is delivered by hand so the test is deterministic and synchronous.
	_room.set_physics_process(false)
	_room.on_enter(_main)
	for child in _room.get_children():
		if child.is_in_group("orderly"):
			child.set_physics_process(false)


func _tick(n: int) -> void:
	for i in n:
		_room._physics_process(1.0 / 60.0)
		_assert_player_free("tick %d" % i)


## THE INVARIANT. Not "is the player near the wall" — is the player at a spot
## try_move will move them out of, in BOTH states. Anything else is a freeze.
func _assert_player_free(where: String) -> void:
	var p: Vector3 = _main.player.global_position
	for state in [StateManager.State.LUCID, StateManager.State.UNMED]:
		if _main.collision.is_blocked_at(p.x, p.z, Tuning.PLAYER_RADIUS, state):
			var sn := "lucid" if state == StateManager.State.LUCID else "unmed"
			_fail("%s: player (%.4f, %.4f) is embedded in geometry while %s (gap %.4f)"
				% [where, p.x, p.z, sn, _room._gap])
			return


func _slab_box(shape: CollisionShape3D):
	for b in _main.collision.boxes:
		if b.source == shape:
			return b
	return null


# --- tests -----------------------------------------------------------------

## The .tscn must agree with the script's idea of the start width, or a
## screenshot of the raw scene is a lie and load_room's first rebuild seeds
## the cache wrong.
func _test_authored_state() -> void:
	_check(_room._slab_e is AnimatableBody3D, "SlabEast is an AnimatableBody3D")
	_check(_room._slab_w is AnimatableBody3D, "SlabWest is an AnimatableBody3D")

	var e = _slab_box(_room._shape_e)
	var w = _slab_box(_room._shape_w)
	_check(e != null and w != null,
		"both slabs are picked up by WardCollision.rebuild_from (layer 2)")
	if e == null or w == null:
		return
	_check(is_equal_approx(e.min_x, 2.5), "east slab inner face starts at x=2.5, got %.3f" % e.min_x)
	_check(is_equal_approx(w.max_x, -2.5), "west slab inner face starts at x=-2.5, got %.3f" % w.max_x)
	_check(is_equal_approx(e.min_z, -24.0) and is_equal_approx(e.max_z, 16.0),
		"east slab spans the stretch z[-24,16]")
	_check(is_equal_approx(_room._slab_e.position.x, 4.25),
		"east slab node sits at x=4.25 (inner face + half thickness)")


## room13.ts:33-36 excludes both moving colliders from the orderly's set BY
## IDENTITY. Same here, and it has to be provable rather than asserted: at a
## narrow gap his lane must be walkable for him and blocked for the player.
func _test_orderly_collider_set() -> void:
	var oc: WardCollision = _room._orderly_collision
	_check(oc != null, "orderlies get their own WardCollision")
	if oc == null:
		return
	_check(oc.boxes.size() == _main.collision.boxes.size() - 2,
		"orderly set is the room's geometry minus exactly the two slabs (%d vs %d)"
			% [oc.boxes.size(), _main.collision.boxes.size()])
	for b in oc.boxes:
		if b.source == _room._shape_e or b.source == _room._shape_w:
			_fail("a slab survived into the orderly collider set")

	# Squeeze past his x=+-1.5 lanes and check both sides of the exclusion.
	_room._set_gap(1.6)
	_check(oc.is_blocked_at(1.5, 0.0, Tuning.ORDERLY_RADIUS, StateManager.State.UNMED) == false,
		"the orderly's lane stays walkable for HIM at a 1.6m gap")
	_check(_main.collision.is_blocked_at(1.5, 0.0, Tuning.PLAYER_RADIUS, StateManager.State.UNMED),
		"the same lane is solid for the PLAYER at a 1.6m gap")
	_room._set_gap(_room.START_GAP)


## Unmed halts the slabs where they are. They must not retract either.
func _test_unmed_holds() -> void:
	StateManager.force_state(StateManager.State.LUCID, "test")
	_main.player.global_position = Vector3(0, 0, 0)  # mid-stretch
	_tick(30)
	var narrowed: float = _room._gap
	_check(narrowed < _room.START_GAP, "lucid in the stretch closes the gap")

	StateManager.force_state(StateManager.State.UNMED, "test")
	_tick(60)
	_check(is_equal_approx(_room._gap, narrowed),
		"unmed holds the gap exactly where it was (%.4f -> %.4f)" % [narrowed, _room._gap])

	# ...and going back lucid resumes from the narrowed width, never from full.
	StateManager.force_state(StateManager.State.LUCID, "test")
	_tick(1)
	_check(_room._gap < narrowed, "lucid resumes from the narrowed width, cumulatively")
	_room._reset_attempt()


## Standing in the entry hall is safe no matter what state you are in.
func _test_outside_stretch_holds() -> void:
	StateManager.force_state(StateManager.State.LUCID, "test")
	_main.player.global_position = Vector3(0, 0, 20)  # spawn, z > 16
	_tick(60)
	_check(is_equal_approx(_room._gap, _room.START_GAP),
		"lucid OUTSIDE the stretch does not close the walls")


## The headline behaviour: the slab closes, and when it reaches the player it
## carries them rather than trapping them.
func _test_closing_and_push() -> void:
	_room._reset_attempt()
	StateManager.force_state(StateManager.State.LUCID, "test")
	# Hard against the east slab's face at the full gap: 2.5 - 0.35 = 2.15.
	_main.player.global_position = Vector3(2.14, 0, 0)

	var gap0: float = _room._gap
	var x0: float = _main.player.global_position.x
	_tick(120)  # 2 s
	var gap1: float = _room._gap
	var x1: float = _main.player.global_position.x

	var closed := gap0 - gap1
	_check(absf(closed - 2.0 * 0.25 * 2.0) < 0.01,
		"gap closed at 2 x 0.25 m/s: expected 1.0m in 2s, got %.4f" % closed)
	_check(x1 < x0, "the advancing slab moved the player inward (%.3f -> %.3f)" % [x0, x1])
	_check(absf(x1 - (gap1 * 0.5 - Tuning.PLAYER_RADIUS)) < 0.01,
		"the player is riding the slab face, not lagging inside it (x %.4f, face-radius %.4f)"
			% [x1, gap1 * 0.5 - Tuning.PLAYER_RADIUS])
	# Push is a carry, not a teleport: at most one tick of slab travel.
	_check(absf(x0 - x1) <= (gap0 - gap1) * 0.5 + 0.001,
		"the player never moved further than the slab did")


func _test_crush_resets_attempt() -> void:
	_room._reset_attempt()
	StateManager.force_state(StateManager.State.LUCID, "test")
	_main.player.global_position = Vector3(2.14, 0, 0)
	_main.toasts.clear()

	# (5.0 - 1.0) / (2 * 0.25) = 8s of lucid before the crush. Tick past it.
	_tick(9 * 60)

	var p: Vector3 = _main.player.global_position
	_check(is_equal_approx(p.z, 18.0) and is_equal_approx(p.x, 0.0),
		"crush teleports to the mouth (0, 18), got (%.2f, %.2f)" % [p.x, p.z])
	_check(is_equal_approx(_room._gap, _room.START_GAP),
		"crush resets the corridor to full width, got %.3f" % _room._gap)
	_check(StateManager.state == StateManager.State.LUCID,
		"crush forces LUCID (safe, because the mouth is outside the stretch)")
	_check(_main.toasts.size() >= 3,
		"the closing/warn/tight/crush toasts fired on the way down (%d)" % _main.toasts.size())
	# And the mouth must not immediately start closing again.
	_tick(60)
	_check(is_equal_approx(_room._gap, _room.START_GAP), "the mouth is outside the stretch")


## The soft-lock that the pushing model has to rule out: get squeezed hard
## against a slab, then go unmed so the walls stop dead. If the push had left
## the player one float inside the box, they would be stuck there forever —
## try_move refuses every move out of a box you already overlap, and nothing
## is coming to widen the gap.
func _test_no_freeze_after_shift() -> void:
	_room._reset_attempt()
	StateManager.force_state(StateManager.State.LUCID, "test")
	_main.player.global_position = Vector3(2.14, 0, -4)
	_tick(7 * 60)  # just short of the crush

	StateManager.force_state(StateManager.State.UNMED, "test")
	_tick(30)

	var p: Vector3 = _main.player.global_position
	var gap: float = _room._gap
	_check(gap < 2.0, "the walls really did close in on them (gap %.3f)" % gap)
	_assert_player_free("after shifting unmed against a held slab")

	# Prove it constructively: they can walk away, both axes, both states.
	var from := Vector2(p.x, p.z)
	for state in [StateManager.State.LUCID, StateManager.State.UNMED]:
		var step := Tuning.PLAYER_SPEED / 60.0
		var out := _main.collision.try_move(from, from + Vector2(-step, 0.0),
			Tuning.PLAYER_RADIUS, state)
		_check(out.x < from.x, "they can walk away from the slab (x %.4f -> %.4f)" % [from.x, out.x])
		var out_z := _main.collision.try_move(from, from + Vector2(0.0, step),
			Tuning.PLAYER_RADIUS, state)
		_check(out_z.y > from.y, "they can walk back up the corridor (z %.4f -> %.4f)"
			% [from.y, out_z.y])


## The other way to get embedded: walk into a stretch that a previous lucid
## dip already narrowed. The slab's z span is inflated by the player radius, so
## the mouth is guarded before in_stretch ever becomes true.
func _test_entering_a_narrowed_stretch() -> void:
	_room._reset_attempt()
	_room._set_gap(1.6)
	StateManager.force_state(StateManager.State.UNMED, "test")

	# March south down the east side of the entry hall, straight at the mouth.
	var pos := Vector2(3.5, 20.0)
	for i in 600:
		var to := pos + Vector2(0.0, -Tuning.PLAYER_SPEED / 60.0)
		pos = _main.collision.try_move(pos, to, Tuning.PLAYER_RADIUS, StateManager.State.UNMED)
		_main.player.global_position = Vector3(pos.x, 0, pos.y)
		_assert_player_free("walking the hall's east side into a 1.6m mouth")
	_check(pos.y > 16.0,
		"a hall-hugging player is stopped at the slab's south face, north of the stretch (z %.3f)"
			% pos.y)
	_room._reset_attempt()


## The collider-set exclusion in its live form. At a 1.6m gap both slabs have
## crossed his x = +-1.5 lanes; he must keep walking them anyway. If he ever
## resolved against a slab, try_move would wedge him inside it permanently —
## he has no _push_player and shouldn't — and every later room13 patrol claim
## would be false. This also catches the two of them being handed one route.
##
## Runs on REAL physics frames, unlike everything above. Orderly._move_toward
## goes through NavigationAgent3D, and an agent whose navigation map has never
## synced answers get_next_path_position() with the origin rather than its own
## position — hand-ticking him walks him diagonally toward (0,0) and proves
## nothing. The room's own _physics_process stays disabled so the gap holds
## while he walks.
func _test_orderlies_walk_a_squeezed_corridor() -> void:
	_room._reset_attempt()
	_room._set_gap(1.6)
	StateManager.force_state(StateManager.State.UNMED, "test")
	# Park the player right out of the world. The obvious spot — spawn, at
	# (0, 20) — is NOT far enough: at the widened 9m sight range orderly B,
	# paused at (-1.5, 14) facing +z, sees it from 6.18m away and chases,
	# which is the flip-side trade src/tuning.ts's lastWard comment documents
	# and accepts. A chase plus a catch would reset the attempt mid-test.
	_main.player.global_position = Vector3(90, 0, 90)

	var a: CharacterBody3D = _room._orderly_a
	var b: CharacterBody3D = _room._orderly_b
	a.set_physics_process(true)
	b.set_physics_process(true)

	var a0: Vector3 = a.global_position
	var b0: Vector3 = b.global_position
	_check(absf(a0.x - 1.5) < 0.01 and absf(a0.z + 22.0) < 0.01,
		"orderly A starts on WAYPOINTS_A[0] (1.5, -22), got (%.2f, %.2f)" % [a0.x, a0.z])
	_check(absf(b0.x + 1.5) < 0.01 and absf(b0.z - 14.0) < 0.01,
		"orderly B starts half a lap away on WAYPOINTS_B[0] (-1.5, 14), got (%.2f, %.2f)"
			% [b0.x, b0.z])

	var wedged := false
	var min_sep := INF
	for i in 600:  # 10 s at 60 Hz
		await get_tree().physics_frame
		min_sep = minf(min_sep, a.global_position.distance_to(b.global_position))
		for o in [a, b]:
			if _room._orderly_collision.is_blocked_at(
					o.global_position.x, o.global_position.z,
					Tuning.ORDERLY_RADIUS, StateManager.State.UNMED):
				if not wedged:
					wedged = true
					_fail("an orderly wedged in geometry at (%.2f, %.2f), gap %.2f"
						% [o.global_position.x, o.global_position.z, _room._gap])

	var a1: Vector3 = a.global_position
	var b1: Vector3 = b.global_position
	var walked_a := Vector2(a1.x - a0.x, a1.z - a0.z).length()
	var walked_b := Vector2(b1.x - b0.x, b1.z - b0.z).length()
	# ORDERLY_SPEED 1.5 for 10s, minus a 0.8s waypoint pause.
	_check(walked_a > 10.0, "orderly A walked his lane through a 1.6m gap (%.2fm)" % walked_a)
	_check(walked_b > 10.0, "orderly B walked his lane through a 1.6m gap (%.2fm)" % walked_b)
	_check(absf(a1.x - 1.5) < 0.05 and absf(b1.x + 1.5) < 0.05,
		"neither orderly was displaced off his lane by a slab (A x %.3f, B x %.3f)"
			% [a1.x, b1.x])
	# They pass each other mid-corridor on opposite lanes, so z alone is not
	# the measure — separation is. 3m apart at the closest is the two lanes.
	_check(min_sep > 2.0,
		"the half-lap offset keeps them apart; closest approach %.2fm" % min_sep)
	# And the player really is shut out of the same lane at that gap.
	_check(_main.collision.is_blocked_at(a1.x, a1.z, Tuning.PLAYER_RADIUS,
		StateManager.State.UNMED), "the player still cannot stand where he is walking")
	_room._reset_attempt()


# --- harness ---------------------------------------------------------------

func _check(cond: bool, what: String) -> void:
	if cond:
		passes += 1
	else:
		failures.append(what)


func _fail(what: String) -> void:
	failures.append(what)


func _finish() -> void:
	if failures.is_empty():
		print("room13: OK - %d checks passed" % passes)
		get_tree().quit(0)
		return
	print("room13: %d PASSED, %d FAILED" % [passes, failures.size()])
	for f in failures:
		print("  FAIL  %s" % f)
	get_tree().quit(1)
