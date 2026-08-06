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
	_finish()


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
