# State-gated-collider validator — the runtime companion a screenshot cannot
# replace.
#
#   godot --headless --path . tools/check_state_gates.tscn -- \
#       res://rooms/room12/room12.tscn  [x,z[,expect] ...]
#
# Run as a SCENE (via the .tscn), not with --script: autoloads (StateManager,
# Tuning) are not registered for a custom SceneTree script, and WardCollision
# reads StateManager.State the moment it classifies a collider.
#
# WHY THIS EXISTS. core/state_object.gd's header used to claim that, for a
# StaticBody3D, it "flips the body's collision layer... and asks the room to
# rebuild the AABB cache." IT NEVER DID — read _apply() there: it sets
# `visible` and emits a signal, nothing else. That comment has since been
# corrected, but the lesson it cost is the whole point of this tool: state-
# gating of COLLISION comes purely from the AUTHORED collision layer (4 =
# solid_lucid_only, 8 = solid_unmed_only), which WardCollision turns into a
# per-box state_filter and honours at query time (core/collision.gd).
# Visibility and solidity are two INDEPENDENT mechanisms that happen to agree
# only because the room generator emits both from the same `state` argument.
#
# The consequence: a screenshot can prove a gate RENDERS in one state and not
# the other, and can prove NOTHING about whether it BLOCKS. Only a probe
# against the real collider cache — instantiated from the real .tscn, with
# the real layers and the real filter — can. Room 12's whole pill economy
# rests on its gates being sealed unmed and walkable lucid (or vice versa);
# "it looked right in both screenshots" is not evidence of that.
#
# WHAT RUNS AUTOMATICALLY, with just a scene path and no other args:
#   * SPAWN must be clear (unblocked) in BOTH states — a room that traps its
#     own spawn point is broken regardless of any gate logic.
#   * every state-filtered collider in the room is probed at its own centre,
#     in both states, and asserted to block in exactly the state its layer
#     names (a lucid-only box must block in LUCID and be clear in UNMED, and
#     vice versa for unmed-only). This is what catches a mis-layered panel:
#     it still vanishes/appears on cue — StateObject is fine — but blocks in
#     the wrong state, or in both, or in neither.
# Extra CLI args add more probe points: "x,z" prints both states with no
# assertion (for poking around before you know what to expect), and
# "x,z,expect" — expect one of both|neither|lucid|unmed, naming the state(s)
# the point should be BLOCKED in — asserts and fails the run on a mismatch.
#
# Exits non-zero on any failed assertion. This is meant to be an automated
# acceptance gate, not a printout for a human to eyeball.
#
# GOTCHA, documented in MIGRATION_NOTES.md "things that bit" and repeated
# here because this file is exactly the kind of place it bites: a GDScript
# runtime error aborts only the function it happened in, not the process, so
# a bug partway through a probe can silently skip every assertion after it
# while the tool still prints and exits 0. _finish() below compares the
# number of assertions that SHOULD have run (tallied as each one is queued)
# against the number that actually reported a pass or fail, the same guard
# tools/test_settings.gd uses — a truncated run fails loudly instead of
# passing by accident.
#
# HISTORY: this file was committed with unresolved git conflict markers by
# 5ade827 ("Merge wt/room12..."), which resolved gen_rooms.py but left this
# one conflicted. It did not parse — silently dead, not merely failing — for
# a period, and nothing caught that because nothing ran it. Both sides of
# that merge agreed on substance (probe state-filtered colliders in both
# states against the real geometry); they differed only in CLI/output shape.
# `--check-only --script tools/check_state_gates.gd` catches a repeat of this
# in about a second and costs nothing to run before trusting this tool again.
extends Node

var failures: Array[String] = []
var passes := 0


func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	if args.is_empty():
		push_error("usage: check_state_gates.tscn -- <res://room.tscn> [x,z[,expect] ...]")
		get_tree().quit(1)
		return

	var scene_path: String = args[0]
	if not ResourceLoader.exists(scene_path):
		push_error("no such scene: %s" % scene_path)
		get_tree().quit(1)
		return

	var room: Node = (load(scene_path) as PackedScene).instantiate()
	add_child(room)

	var col := WardCollision.new()
	col.rebuild_from(room)

	print("")
	print("check_state_gates: %s" % scene_path)
	print("  %d collider(s) cached" % col.boxes.size())
	print("")

	var expected := 0

	# --- spawn must be clear in BOTH states -------------------------------
	var spawn: Node3D = room.get_node_or_null("Spawn")
	if spawn != null:
		var p := spawn.global_position
		var su := col.is_blocked_at(p.x, p.z, Tuning.PLAYER_RADIUS, StateManager.State.UNMED)
		var sl := col.is_blocked_at(p.x, p.z, Tuning.PLAYER_RADIUS, StateManager.State.LUCID)
		print("  spawn (%.2f, %.2f)  unmed: %s  lucid: %s" % [p.x, p.z, _b(su), _b(sl)])
		expected += 1
		_check(not su and not sl,
			"spawn (%.2f, %.2f) is blocked — unmed=%s lucid=%s" % [p.x, p.z, su, sl])
	print("")

	# --- every state-filtered collider, probed at its own centre ----------
	var gated := 0
	for b in col.boxes:
		if b.state_filter == -1:
			continue
		gated += 1
		var cx := (b.min_x + b.max_x) * 0.5
		var cz := (b.min_z + b.max_z) * 0.5
		var want := "unmed" if b.state_filter == StateManager.State.UNMED else "lucid"
		print("  gate x[%7.2f,%7.2f] z[%7.2f,%7.2f]  layer=%s-only  centre (%.2f, %.2f)"
			% [b.min_x, b.max_x, b.min_z, b.max_z, want, cx, cz])
		expected += 1
		_probe(col, cx, cz, want)
	if gated == 0:
		print("  (no state-filtered colliders in this room)")
	print("")

	# --- explicit probe points from the CLI --------------------------------
	for i in range(1, args.size()):
		var parts: PackedStringArray = str(args[i]).split(",")
		if parts.size() < 2:
			push_error("bad probe '%s' (want x,z[,expect])" % args[i])
			continue
		var x := float(parts[0])
		var z := float(parts[1])
		var expect := str(parts[2]) if parts.size() > 2 else ""
		print("  probe (%.2f, %.2f)%s"
			% [x, z, "" if expect.is_empty() else "  expect blocked: " + expect])
		if not expect.is_empty():
			expected += 1
		_probe(col, x, z, expect)
	print("")

	_finish(expected)

	# Free the room explicitly; quitting with it still parented leaks its
	# subtree and prints an ObjectDB-leak warning that looks like a real fault.
	remove_child(room)
	room.free()
	get_tree().quit(0 if failures.is_empty() else 1)


# Probes one XZ point in BOTH ward states with the player's real radius,
# which is what WardCollision.try_move() uses — a point test would happily
# walk the player's shoulders through a wall.
#
# `expect` is "", "unmed", "lucid", "both", or "neither" — the state(s) in
# which the point is expected to be BLOCKED. Empty means print-only, no
# assertion (and it does not count toward the expected-assertions tally).
func _probe(col: WardCollision, x: float, z: float, expect: String) -> void:
	var r: float = Tuning.PLAYER_RADIUS
	var in_unmed := col.is_blocked_at(x, z, r, StateManager.State.UNMED)
	var in_lucid := col.is_blocked_at(x, z, r, StateManager.State.LUCID)
	var verdict := "GATED unmed-only" if in_unmed and not in_lucid else \
		("GATED lucid-only" if in_lucid and not in_unmed else
		("open in both" if not in_unmed and not in_lucid else "SOLID in both"))
	print("      unmed: %s  lucid: %s  -> %s" % [_b(in_unmed), _b(in_lucid), verdict])

	if expect.is_empty():
		return
	var want_unmed := expect == "unmed" or expect == "both"
	var want_lucid := expect == "lucid" or expect == "both"
	if expect == "neither":
		want_unmed = false
		want_lucid = false
	_check(in_unmed == want_unmed and in_lucid == want_lucid,
		"(%.2f, %.2f): expected blocked-in '%s', got unmed=%s lucid=%s"
			% [x, z, expect, in_unmed, in_lucid])


func _check(cond: bool, what: String) -> void:
	if cond:
		passes += 1
	else:
		failures.append(what)


# See the GOTCHA note in the header: `expected` is tallied by the caller as
# each assertion is queued, independently of whether it actually completes,
# so a probe that dies partway through cannot pass by simply never reporting.
func _finish(expected: int) -> void:
	var ran := passes + failures.size()
	if ran != expected:
		failures.append(
			"expected %d assertion(s) to run, %d did — a runtime error almost certainly aborted a probe silently (scroll up for SCRIPT ERROR)"
				% [expected, ran])

	print("")
	if failures.is_empty():
		print("  OK - %d assertion(s) passed" % passes)
	else:
		for f in failures:
			print("  FAIL  %s" % f)
		print("  %d failure(s)" % failures.size())
	print("")


func _b(v: bool) -> String:
	return "BLOCKED" if v else "clear  "
