# Behavioural tests for the ported core mechanics.
#
#   godot --headless --path godot tools/test_mechanics.tscn
#
# check_rooms proves rooms are WIRED correctly. This proves they BEHAVE
# correctly — specifically the three things most likely to be silently
# broken by the port:
#   1. state-conditional geometry actually gates movement, not just rendering
#   2. the axis-separated resolver still slides along walls X-then-Z
#   3. the geometry-trap guard fires exactly where it must
extends Node

var failures: Array[String] = []
var passes := 0


func _ready() -> void:
	_test_room1_doorway()
	_test_trap_guard()
	_test_axis_separated_slide()
	_test_pill_economy()
	_test_no_camera_environment_override()
	await _test_orderly_patrols()
	_finish()


# THE MOOD MUST ACTUALLY REACH THE SCREEN.
#
# Camera3D.environment OVERRIDES WorldEnvironment completely. player.tscn's
# camera shipped with a leftover placeholder Environment on it, so the game
# rendered at default linear tonemapping, exposure 1.0, no fog and no glow,
# while main.gd faithfully wrote every MOOD value into a WorldEnvironment that
# never drew a single pixel. The unmedicated ward was bright and flat for the
# entire life of the port.
#
# Nothing caught it. check_rooms never instantiates the player; test_flicker
# asserts on light_energy VALUES rather than pixels, which stayed correct the
# whole time; and tools/shoot.gd builds its own camera and environment, so
# every screenshot rendered the mood correctly and looked like proof.
#
# An override is legitimate in principle, so this asserts the specific thing
# that is not: the camera the game plays through must not shadow the
# WorldEnvironment that main.gd drives.
func _test_no_camera_environment_override() -> void:
	var player: Node = load("res://player/player.tscn").instantiate()
	var cam: Camera3D = player.get_node_or_null("Camera3D")
	_check(cam != null, "player.tscn must have a Camera3D")
	if cam != null:
		_check(
			cam.environment == null,
			"player camera must NOT carry an Environment override — it shadows "
			+ "WorldEnvironment and MOOD never reaches the screen")
	player.free()


func _check(cond: bool, what: String) -> void:
	if cond:
		passes += 1
	else:
		failures.append(what)


func _room1_collision() -> WardCollision:
	var packed: PackedScene = load("res://rooms/room1/room1.tscn")
	var room: Node = packed.instantiate()
	add_child(room)
	var col := WardCollision.new()
	col.rebuild_from(room)
	remove_child(room)
	room.free()
	return col


# ROOM 1's whole beat: "there is no door until the pill is taken."
# The doorway blocker is solid ONLY while unmedicated.
func _test_room1_doorway() -> void:
	var col := _room1_collision()
	var r := Tuning.PLAYER_RADIUS

	_check(
		col.is_blocked_at(0.0, 0.0, r, StateManager.State.UNMED),
		"room1 doorway (0,0) should be SOLID while unmed — the blocker is the puzzle")
	_check(
		not col.is_blocked_at(0.0, 0.0, r, StateManager.State.LUCID),
		"room1 doorway (0,0) should be OPEN while lucid — taking the pill opens it")

	# The rest of the north wall must be solid in both states.
	_check(
		col.is_blocked_at(-2.0, 0.0, r, StateManager.State.LUCID),
		"room1 north wall at x=-2 should be solid in both states")
	_check(
		col.is_blocked_at(-2.0, 0.0, r, StateManager.State.UNMED),
		"room1 north wall at x=-2 should be solid in both states")


# The auto-revert must be deferred while the player stands where an
# unmed-only wall would materialise, or reverting embeds them in geometry.
func _test_trap_guard() -> void:
	var col := _room1_collision()
	var r := Tuning.PLAYER_RADIUS

	_check(
		col.circle_hits_solid_unmed(0.0, 0.0, r),
		"trap guard must fire in room1's doorway — reverting there would embed the player")
	_check(
		not col.circle_hits_solid_unmed(0.0, 4.0, r),
		"trap guard must NOT fire at spawn (0,4) — open floor")
	_check(
		not col.circle_hits_solid_unmed(0.0, -1.5, r),
		"trap guard must NOT fire in the vestibule (0,-1.5) — past the blocker")


# X resolves against the OLD z, then Z against the NEW x. A body pushed
# diagonally into a wall must slide along it rather than stop dead.
func _test_axis_separated_slide() -> void:
	var col := WardCollision.new()
	# A single wall spanning x[-5,5] at z=0, 0.24 thick.
	var b := WardCollision.Box.new(-5.0, 5.0, -0.12, 0.12, -1)
	col.boxes.append(b)

	var r := 0.35
	# Walking north-east into the wall from below it.
	var from := Vector2(0.0, 1.0)
	var to := Vector2(0.5, 0.3)
	var out := col.try_move(from, to, r, StateManager.State.UNMED)

	_check(out.x == to.x, "slide: X should resolve freely along the wall (got %.3f)" % out.x)
	_check(out.y == from.y, "slide: Z should be blocked by the wall (got %.3f)" % out.y)

	# Moving away from the wall must be unobstructed on both axes.
	var away := col.try_move(from, Vector2(0.5, 1.6), r, StateManager.State.UNMED)
	_check(away == Vector2(0.5, 1.6), "slide: moving away from the wall must be free")


# unmed -> lucid costs a pill; lucid -> unmed is free; nothing shifts without
# the ability. Room 1 grants the ability only when the cup is taken.
func _test_pill_economy() -> void:
	StateManager.reset()
	GameState.reset_run()

	_check(
		StateManager.shift() == StateManager.ShiftResult.NO_ABILITY,
		"shift before the tutorial grants it must return NO_ABILITY")

	StateManager.can_shift = true
	_check(
		StateManager.shift() == StateManager.ShiftResult.NO_PILLS,
		"shift with zero pills must return NO_PILLS")

	GameState.refill()
	_check(GameState.pills == 1, "refill should give exactly PILLS_MAX (1)")
	_check(
		StateManager.shift() == StateManager.ShiftResult.OK,
		"shift with a pill must succeed")
	_check(StateManager.is_lucid(), "shift should land in LUCID")
	_check(GameState.pills == 0, "shifting to lucid must spend the pill")
	_check(StateManager.medication == 1.0, "entering lucid must refill the meter")

	# Going back is always free.
	_check(
		StateManager.shift() == StateManager.ShiftResult.OK,
		"lucid -> unmed must always succeed")
	_check(not StateManager.is_lucid(), "should be back in UNMED")
	_check(GameState.pills == 0, "returning to unmed must not cost a pill")

	# force_state must not charge a pill, and must no-op on same state.
	GameState.refill()
	StateManager.force_state(StateManager.State.LUCID, "catch")
	_check(GameState.pills == 1, "force_state must NOT spend a pill (a catch is free)")

	var med_before := StateManager.medication
	StateManager.force_state(StateManager.State.LUCID, "catch")
	_check(
		StateManager.medication == med_before,
		"force_state to the SAME state must early-return without refilling the meter")


# THE ORDERLY ACTUALLY WALKS.
#
# This exists because he did not, in any room, for the entire life of the
# Godot port. _move_toward gated on `map_get_iteration_id(...) != 0` as a
# stand-in for "a navmesh exists"; it really means "the navigation server has
# synced", which is true in every scene after ~3 physics frames. With zero
# NavigationRegion3Ds in the project, every path query came back empty and
# get_next_path_position() returned his own position, so dir was zero-length
# and he never took a step. Nothing caught it: check_rooms validates patrol
# WIRING (waypoints present, legs clear) and never ticks physics, so a
# perfectly-authored patrol loop that is never walked passed every check.
#
# Asserts he visits every waypoint, which fails both for a frozen orderly and
# for one that drifts without advancing the loop.
func _test_orderly_patrols() -> void:
	var player := Node3D.new()
	player.set_script(load("res://tools/test_stub_player.gd"))
	player.position = Vector3(90, 0, 90)  # far enough that sight/catch never fire
	add_child(player)

	var square: Array[Vector3] = [
		Vector3(2, 0, 2), Vector3(2, 0, 8), Vector3(8, 0, 8), Vector3(8, 0, 2)]
	var orderly: CharacterBody3D = load("res://orderly/orderly.tscn").instantiate()
	orderly.waypoints = square.duplicate()
	add_child(orderly)
	orderly.setup(player, null)

	var start: Vector3 = orderly.global_position
	var visited := {}
	# 1500 ticks = 25 s at 60 Hz. One lap of this 24 m loop at 1.5 m/s plus
	# four 0.8 s waypoint pauses is ~19.2 s, so this is a full lap with margin.
	for i in 1500:
		visited[orderly._wp_index] = true
		await get_tree().physics_frame

	# Deliberately NOT "or visited.size() > 1": _wp_index advances to 1 on the
	# very first tick because he spawns exactly on waypoint 0, so a waypoint
	# check alone passes even when he never moves a millimetre. Displacement is
	# the assertion that actually catches the bug.
	_check(
		start.distance_to(orderly.global_position) > 0.0,
		"orderly must move at all — he stood frozen on waypoint 0 for the whole port")
	_check(
		visited.size() == square.size(),
		"orderly must walk his whole patrol loop (visited %d/%d waypoints)"
			% [visited.size(), square.size()])

	orderly.queue_free()
	player.queue_free()


func _finish() -> void:
	print("")
	print("test_mechanics: %d assertion(s) passed" % passes)
	if failures.is_empty():
		print("  OK - core mechanics behave as ported")
	else:
		for f in failures:
			print("  FAIL  %s" % f)
		print("  %d failure(s)" % failures.size())
	print("")
	get_tree().quit(0 if failures.is_empty() else 1)
