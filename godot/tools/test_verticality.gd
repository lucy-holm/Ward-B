# Behavioural tests for verticality and stacked levels.
#
#   godot --headless --path godot tools/test_verticality.tscn
#
# Loads the two fixtures written by tools/gen_vert_fixtures.py, so this
# exercises the whole chain — the gen_rooms.py authoring API, the metadata it
# emits, and core/levels.gd + core/collision.gd reading it back — rather than
# only the engine half.
#
# What it proves, in the order the brief asked for it:
#   1. a ramp eases the player's Y toward the ramp height
#   2. one XZ rect gives two different heights depending on the level
#   3. a level-tagged collider blocks on its level and NOT on the other
#   4. resolve_level flips only on clearing a stairwell end to end, and
#      survives a single-tick overshoot past the far end
# plus the precedence rules and the rooms-1-7 non-regression.
extends Node

const FLAT := "res://tools/vert_flat.tscn"
const STACKED := "res://tools/vert_stacked.tscn"

var failures: Array[String] = []
var passes := 0


func _ready() -> void:
	_test_flat_fold()
	_test_precedence()
	_test_two_heights_one_rect()
	_test_level_tagged_collision()
	_test_resolve_level()
	_test_y_ease()
	_test_flat_rooms_unaffected()
	await _test_main_drives_it()
	_finish()


func _check(cond: bool, what: String) -> void:
	if cond:
		passes += 1
	else:
		failures.append(what)


func _close(a: float, b: float, what: String, eps := 0.0001) -> void:
	_check(absf(a - b) < eps, "%s (got %f, want %f)" % [what, a, b])


func _load(path: String) -> Node:
	var room: Node = (load(path) as PackedScene).instantiate()
	add_child(room)
	return room


func _levels_of(path: String) -> WardLevels:
	var room := _load(path)
	var lv := WardLevels.new()
	lv.rebuild_from(room)
	remove_child(room)
	room.free()
	return lv


func _collision_of(path: String) -> WardCollision:
	var room := _load(path)
	var col := WardCollision.new()
	col.rebuild_from(room)
	remove_child(room)
	room.free()
	return col


# 1. TIER 1 IS TIER 2 WITH ONE LEVEL. The flat fixture declares no `levels`
# at all, only zones and ramps, and must fold into the synthetic '__flat'.
func _test_flat_fold() -> void:
	var lv := _levels_of(FLAT)
	_check(lv.levels.size() == 1, "flat fixture folds to exactly one level")
	_check(lv.default_level() == WardLevels.FLAT_LEVEL_ID, "folded level is '__flat'")
	_check(lv.has_level(WardLevels.FLAT_LEVEL_ID), "'__flat' resolves")
	_close(lv.ceiling_y, 3.0, "flat fixture keeps the default ceiling")

	# Outside every zone and ramp, the floor is the level's base_y (0).
	_close(lv.floor_height_at("__flat", 8.0, 8.0), 0.0, "outside all zones is base_y")
	# Inside the raised zone but outside the ramp.
	_close(lv.floor_height_at("__flat", 0.0, 5.0), 1.0, "raised zone reads its own y")
	# Halfway up the ramp (z -2..4, y 0..1): z=1 is t=0.5.
	_close(lv.floor_height_at("__flat", 0.0, 1.0), 0.5, "ramp interpolates at its midpoint")
	_close(lv.floor_height_at("__flat", 0.0, -2.0), 0.0, "ramp reads y_low at its min end")
	_close(lv.floor_height_at("__flat", 0.0, 4.0), 1.0, "ramp reads y_high at its max end")


# RAMPS BEAT ZONES where they overlap. The fixture's ramp (z -2..4) and zone
# (z 2..6) overlap over z 2..4 deliberately, so this is a real test and not a
# restatement of the code.
func _test_precedence() -> void:
	var lv := _levels_of(FLAT)
	# z=3 is inside BOTH. The ramp says 0.8333, the zone says a flat 1.0.
	_close(lv.floor_height_at("__flat", 0.0, 3.0), 5.0 / 6.0,
		"ramp beats height zone in the overlap")

	# STAIRWELLS BEAT EVERYTHING. In the stacked fixture the stairwell
	# (z 6..12) overlaps 'ground's own height zone (z 6..16, y 0.5), so a
	# traveler on the stairs must read the interpolated stair height and not
	# the zone's flat value.
	var sl := _levels_of(STACKED)
	_close(sl.floor_height_at("ground", 6.0, 9.0), 1.7,
		"stairwell is checked before the level's own zone")
	_check(absf(sl.floor_height_at("ground", 6.0, 9.0) - 0.5) > 0.5,
		"and does NOT fall through to the zone underneath it")
	# Just past the stairwell's far end, the zone takes over again.
	_close(sl.floor_height_at("ground", 6.0, 13.0), 0.1875,
		"past the stair, ground's own ramp resumes")


# 2. THE HEADLINE: one XZ column, two correct answers, chosen by the
# traveler's own level. This is the capability that cannot be expressed at
# all by a single-valued floor height.
func _test_two_heights_one_rect() -> void:
	var lv := _levels_of(STACKED)
	_check(lv.levels.size() == 2, "stacked fixture declares two levels")
	_close(lv.ceiling_y, 6.0, "stacked fixture raises the ceiling")

	# A point inside BOTH levels' footprints and inside no zone/ramp/stair.
	var x := 0.0
	var z := 0.0
	_close(lv.floor_height_at("ground", x, z), 0.0, "same XZ on 'ground' is 0.0")
	_close(lv.floor_height_at("balcony", x, z), 3.4, "same XZ on 'balcony' is 3.4")
	_check(lv.floor_height_at("ground", x, z) != lv.floor_height_at("balcony", x, z),
		"the same XZ genuinely answers differently per level")

	# An unknown level falls back to the first rather than throwing.
	_close(lv.floor_height_at("nonexistent", x, z), 0.0,
		"an unmatched level falls back to the first level")


# 3. A level-tagged collider exists ONLY for a traveler on that level. The
# fixture's railing is tagged 'balcony' and sits directly over open ground
# floor; the structural wall next to it is untagged.
func _test_level_tagged_collision() -> void:
	var col := _collision_of(STACKED)
	var r := Tuning.PLAYER_RADIUS
	var st := StateManager.State.UNMED

	var tagged := 0
	var untagged := 0
	for b in col.boxes:
		if b.level_filter.is_empty():
			untagged += 1
		else:
			tagged += 1
	_check(tagged == 1, "exactly one collider carries a level tag")
	_check(untagged > 0, "and the rest are untagged")

	# The railing, at (0, 0).
	_check(col.is_blocked_at(0.0, 0.0, r, st, "balcony"),
		"a 'balcony' railing blocks a traveler on the balcony")
	_check(not col.is_blocked_at(0.0, 0.0, r, st, "ground"),
		"and does NOT block the ground floor underneath it")

	# The untagged structural wall, at (-8.5, 0).
	_check(col.is_blocked_at(-8.5, 0.0, r, st, "balcony"),
		"an untagged wall blocks on 'balcony'")
	_check(col.is_blocked_at(-8.5, 0.0, r, st, "ground"),
		"an untagged wall blocks on 'ground' too")
	_check(col.is_blocked_at(-8.5, 0.0, r, st, "__flat"),
		"an untagged wall blocks an untagged traveler")

	# And through try_move, so BOTH the X pass and the Z pass are covered.
	# X pass: walking east into the railing along constant z.
	var from_x := Vector2(-1.5, 0.0)
	var to_x := Vector2(-1.0, 0.0)
	_check(col.try_move(from_x, to_x, r, st, "balcony").x == from_x.x,
		"try_move's X pass is blocked by the railing on 'balcony'")
	_check(col.try_move(from_x, to_x, r, st, "ground").x == to_x.x,
		"try_move's X pass passes through it on 'ground'")
	# Z pass: walking north into the railing along constant x. The step has to
	# actually reach the railing's radius-inflated edge (z = -0.55) to be
	# blocked at all — the collider is only 0.4m deep in z, so a step ending
	# at z = -1.0 legitimately clears it on BOTH levels and would prove
	# nothing about the filter.
	var from_z := Vector2(0.0, -1.0)
	var to_z := Vector2(0.0, -0.5)
	_check(col.try_move(from_z, to_z, r, st, "balcony").y == from_z.y,
		"try_move's Z pass is blocked by the railing on 'balcony'")
	_check(col.try_move(from_z, to_z, r, st, "ground").y == to_z.y,
		"try_move's Z pass passes through it on 'ground'")

	# The trap guard takes the same filter. Nothing in this fixture is
	# unmed-sealed, so it must find nothing on either level.
	_check(not col.circle_hits_solid_unmed(0.0, 0.0, r, "balcony"),
		"the trap guard finds no unmed-sealed geometry on 'balcony'")


# 4. resolve_level: a no-op everywhere except clearing a stairwell end to
# end, INCLUDING mid-stair, and robust to a single tick overshooting the far
# boundary — which is the shipped bug fix this port reproduces verbatim.
#
# The fixture's stair is x[4,8] z[6,12], axis z, balcony at the min end
# (z=6, y=3.4) and ground at the max end (z=12, y=0).
func _test_resolve_level() -> void:
	var lv := _levels_of(STACKED)

	# Nowhere near it.
	_check(lv.resolve_level("ground", 0.0, 0.0) == "ground", "off-stair is a no-op")
	_check(lv.resolve_level("balcony", 0.0, 0.0) == "balcony", "off-stair is a no-op (balcony)")

	# MID-STAIR IS A NO-OP. Walking halfway down and turning back must leave
	# you on the level you started from — a stairwell is a transition, not a
	# teleport.
	_check(lv.resolve_level("balcony", 6.0, 9.0) == "balcony",
		"mid-stair does not flip (descending)")
	_check(lv.resolve_level("ground", 6.0, 9.0) == "ground",
		"mid-stair does not flip (ascending)")
	_check(lv.resolve_level("balcony", 6.0, 11.9) == "balcony",
		"one tick short of the far end still does not flip")

	# Clearing it end to end DOES flip, in both directions.
	_check(lv.resolve_level("balcony", 6.0, 12.0) == "ground",
		"descending clears at t=1 and flips to 'ground'")
	_check(lv.resolve_level("ground", 6.0, 6.0) == "balcony",
		"ascending clears at t=0 and flips to 'balcony'")

	# THE BUG FIX. Real motion does not land on the exact boundary float; it
	# steps centimetres past it. Under the old strictly-clamped bounds the
	# traveler fell out of containment on the very next tick, still tagged to
	# the floor they had left. A worst-case tick is a chasing orderly at
	# 4.3 m/s over main.ts's clamped dt of 0.05 s = 0.215 m.
	var overshoot_z := 12.0 + 0.215
	_check(overshoot_z > 12.0, "the overshoot sample really is past the far end")
	_check(lv.resolve_level("balcony", 6.0, overshoot_z) == "ground",
		"a single-tick overshoot past the far end STILL flips")
	_check(lv.resolve_level("ground", 6.0, 6.0 - 0.215) == "balcony",
		"a single-tick overshoot past the near end STILL flips")
	# The whole allowance, right up to the limit.
	_check(lv.resolve_level("balcony", 6.0, 12.0 + WardLevels.STAIR_OVERSHOOT_M) == "ground",
		"the flip fires across the entire overshoot allowance")

	# But the allowance is BOUNDED — it must not reach across the room.
	_check(lv.resolve_level("balcony", 6.0, 12.0 + WardLevels.STAIR_OVERSHOOT_M + 0.01) == "balcony",
		"beyond the overshoot allowance it stops firing")

	# THE BOUNDS ARE ASYMMETRIC. The LATERAL dimension stays strict: standing
	# beside the stair at the same axis coordinate must never flip you, no
	# matter how far along the axis you are. If lateral were given the same
	# overshoot, this would wrongly return 'ground'.
	_check(lv.resolve_level("balcony", 8.0 + 0.5, 12.5) == "balcony",
		"lateral bound is STRICT — beside the stair never flips")
	_check(lv.resolve_level("balcony", 4.0 - 0.5, 12.5) == "balcony",
		"lateral bound is STRICT on the other side too")
	# Exactly on the lateral edge is still inside.
	_check(lv.resolve_level("balcony", 8.0, 12.5) == "ground",
		"the lateral edge itself is inside the stair")

	# A traveler on neither of the stair's two levels is untouched.
	_check(lv.resolve_level("__flat", 6.0, 12.5) == "__flat",
		"a stairwell only ever moves travelers between ITS OWN two levels")

	# And a room with no stairwells can never flip anyone.
	var flat := _levels_of(FLAT)
	_check(flat.stairwells.is_empty(), "the flat fixture declares no stairwells")
	_check(flat.resolve_level("__flat", 0.0, 3.0) == "__flat",
		"a room with no stairwells is always a no-op")


# 1 (continued). The Y ease itself, reproducing main.gd's per-tick step:
#   y += (floor_height_at(level, x, z) - y) * 0.35
func _test_y_ease() -> void:
	var lv := _levels_of(FLAT)
	# Stand at the top of the ramp: target height 1.0, starting from 0.
	var x := 0.0
	var z := 4.0
	var target := lv.floor_height_at("__flat", x, z)
	_close(target, 1.0, "ramp top is 1.0")

	var y := 0.0
	# One tick closes exactly 35% of the gap.
	y += (target - y) * WardLevels.Y_EASE
	_close(y, 0.35, "one tick eases exactly 35% of the gap")

	var prev := y
	var monotonic := true
	for _i in 40:
		y += (target - y) * WardLevels.Y_EASE
		if y <= prev:
			monotonic = false
		prev = y
	_check(monotonic, "the ease approaches the target monotonically")
	_close(y, target, "the ease converges on the ramp height", 0.001)

	# And it works downward too, without overshooting past the target.
	y = 1.0
	var down := lv.floor_height_at("__flat", 0.0, 8.0)
	_close(down, 0.0, "off the platform is 0.0")
	var overshot := false
	for _i in 40:
		y += (down - y) * WardLevels.Y_EASE
		if y < down:
			overshot = true
	_check(not overshot, "the ease never overshoots below the target")
	_close(y, down, "the ease converges downward too", 0.001)


# NON-REGRESSION. Every shipped room is flat, and must stay exactly as flat
# as it was — no Verticality node, one implicit level, 0.0 everywhere.
func _test_flat_rooms_unaffected() -> void:
	for id in ["room1", "room4", "room7"]:
		var room := _load("res://rooms/%s/%s.tscn" % [id, id])
		_check(room.get_node_or_null("Verticality") == null,
			"%s authors no Verticality node" % id)

		var lv := WardLevels.new()
		lv.rebuild_from(room)
		_check(lv.levels.size() == 1, "%s resolves to one implicit level" % id)
		_check(lv.default_level() == WardLevels.FLAT_LEVEL_ID, "%s is '__flat'" % id)
		_check(lv.stairwells.is_empty(), "%s has no stairwells" % id)
		_close(lv.floor_height_at("__flat", 0.0, 0.0), 0.0, "%s floor is 0.0 at origin" % id)
		_close(lv.floor_height_at("__flat", 2.5, -3.0), 0.0, "%s floor is 0.0 off-origin" % id)

		# Every collider untagged, so the level filter can never gate one.
		var col := WardCollision.new()
		col.rebuild_from(room)
		var all_untagged := true
		for b in col.boxes:
			if not b.level_filter.is_empty():
				all_untagged = false
		_check(all_untagged, "%s: every collider is untagged" % id)
		_check(not col.boxes.is_empty(), "%s: collider cache is non-empty" % id)

		remove_child(room)
		room.free()


# INTEGRATION. Everything above tests core/levels.gd and core/collision.gd in
# isolation, which would all still pass if main.gd never called any of it.
# This runs the REAL main.tscn and asserts the wiring: that its physics tick
# resolves the level and then eases the player's Y, in that order.
func _test_main_drives_it() -> void:
	var game: Node = load("res://main.tscn").instantiate()
	add_child(game)
	await get_tree().physics_frame
	var player: Node3D = game.player

	# Non-regression first: main loads room1, which is flat.
	_check(player.level == WardLevels.FLAT_LEVEL_ID, "main spawns the player on '__flat'")
	for _i in 5:
		await get_tree().physics_frame
	_close(player.global_position.y, 0.0, "a flat room holds the player at y=0", 0.001)

	# Now hand main the stacked fixture's verticality and drive the player
	# through it. Swapping `levels` rather than registering a fake room keeps
	# main.gd's ROOM_SCENES untouched.
	var fixture := _load(STACKED)
	game.levels.rebuild_from(fixture)

	# Stand on the balcony, directly over open ground floor.
	player.teleport(0.0, 0.0, "balcony")
	for _i in 40:
		await get_tree().physics_frame
	_close(player.global_position.y, 3.4, "main's tick eases the player up to the balcony", 0.01)
	_check(player.level == "balcony", "and does not flip level away from a stairwell")

	# Step just past the stair's far (ground) end, exactly as a real tick
	# would overshoot it. main must flip the level on the very next tick.
	player.teleport(6.0, 12.2)
	await get_tree().physics_frame
	_check(player.level == "ground",
		"main's resolve_level flips on clearing the stair, overshoot included")

	# RESOLVE BEFORE EASE. On that same single tick the ease must already
	# have used the NEW level: from y=3.4 toward ground's 0.0375 is a first
	# step of 3.4 - (3.4 - 0.0375) * 0.35 = 2.223. Easing first would read
	# the balcony's own 3.4 for that tick and leave y untouched, so this
	# assertion is what actually pins the order down — the converged value
	# below would be reached either way.
	_close(player.global_position.y, 2.2231,
		"the ease used the level resolved THIS tick, not the previous one", 0.01)

	# ...and then ease down to the GROUND level's height there, which is its
	# own ramp (z 12..16, 0 -> 0.75), i.e. 0.0375 at z=12.2. Reading the
	# balcony's 3.4 here would mean the ease ran before the resolve.
	for _i in 40:
		await get_tree().physics_frame
	_close(player.global_position.y, 0.0375,
		"and then eases to the height of the level it flipped TO", 0.01)

	remove_child(fixture)
	fixture.free()
	remove_child(game)
	game.free()


func _finish() -> void:
	print("")
	if failures.is_empty():
		print("test_verticality: %d assertion(s) passed" % passes)
		print("  OK - verticality and stacked levels behave as ported")
		get_tree().quit(0)
		return
	print("test_verticality: %d passed, %d FAILED" % [passes, failures.size()])
	for f in failures:
		print("  FAIL - %s" % f)
	get_tree().quit(1)
