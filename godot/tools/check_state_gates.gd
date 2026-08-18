# Runtime collision probe for state-filtered geometry.
#
#   godot --headless --path godot tools/check_state_gates.tscn -- \
#       res://rooms/room12/room12.tscn [x,z[,expect] ...]
#
# Run as a SCENE, not with --script: autoloads (StateManager, Tuning) are not
# registered for a custom SceneTree script, and WardCollision reads
# StateManager.State the moment it classifies a collider.
#
# WHY THIS EXISTS. core/state_object.gd's class header claims that for a
# StaticBody3D it "flips the body's collision layer between its authored solid
# layer and 0, and asks the room to rebuild the AABB cache". IT DOES NOT — read
# _apply(): it sets `visible` and emits a signal, nothing else. That comment is
# stale. State-gating of collision comes purely from the AUTHORED collision
# layer (4 = solid_lucid_only, 8 = solid_unmed_only), which WardCollision turns
# into a per-box state_filter and honours at query time.
#
# The consequence is the thing this tool is for: a screenshot can prove a gate
# RENDERS in one state and not the other, and can prove NOTHING about whether
# it blocks. Only a probe against the real collider cache can. Room 12's whole
# pill economy rests on GATE B and GATE C being sealed unmed and walkable
# lucid, so "it looked right in both screenshots" is not evidence.
#
# Output: every state-filtered collider in the room, probed at its own centre
# in BOTH states, plus any extra points given on the command line as "x,z" or
# "x,z,expect" where expect is one of both|neither|lucid|unmed — naming the
# state(s) in which the point is expected to be BLOCKED. A mismatched
# expectation is a failure and exits non-zero.
extends Node

var failures: Array[String] = []


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

	# --- every state-filtered collider, probed at its own centre -------------
	var gated := 0
	for b in col.boxes:
		if b.state_filter == -1:
			continue
		gated += 1
		var cx := (b.min_x + b.max_x) * 0.5
		var cz := (b.min_z + b.max_z) * 0.5
		var want := "unmed" if b.state_filter == StateManager.State.UNMED else "lucid"
		print("  gate x[%.2f,%.2f] z[%.2f,%.2f]  layer=%s-only  centre (%.2f, %.2f)"
			% [b.min_x, b.max_x, b.min_z, b.max_z, want, cx, cz])
		_probe(col, cx, cz, want)
	if gated == 0:
		print("  (no state-filtered colliders in this room)")
	print("")

	# --- explicit probe points ----------------------------------------------
	for i in range(1, args.size()):
		var parts: PackedStringArray = str(args[i]).split(",")
		if parts.size() < 2:
			push_error("bad probe '%s' (want x,z[,expect])" % args[i])
			continue
		var x := float(parts[0])
		var z := float(parts[1])
		var expect := str(parts[2]) if parts.size() > 2 else ""
		print("  probe (%.2f, %.2f)%s" % [x, z, "" if expect.is_empty() else "  expect blocked: " + expect])
		_probe(col, x, z, expect)
	print("")

	if failures.is_empty():
		print("  OK - every probe matched")
	else:
		for f in failures:
			print("  FAIL  %s" % f)
		print("  %d failure(s)" % failures.size())
	print("")
	get_tree().quit(0 if failures.is_empty() else 1)


# Probes one XZ point in BOTH ward states with the player's real radius, which
# is what WardCollision.try_move() uses — a point test would happily walk the
# player's shoulders through a wall.
func _probe(col: WardCollision, x: float, z: float, expect: String) -> void:
	var r: float = Tuning.PLAYER_RADIUS
	var in_unmed := col.is_blocked_at(x, z, r, StateManager.State.UNMED)
	var in_lucid := col.is_blocked_at(x, z, r, StateManager.State.LUCID)
	print("      unmed: %s    lucid: %s"
		% ["BLOCKED" if in_unmed else "clear  ", "BLOCKED" if in_lucid else "clear"])

	if expect.is_empty():
		return
	var want_unmed := expect == "unmed" or expect == "both"
	var want_lucid := expect == "lucid" or expect == "both"
	if expect == "neither":
		want_unmed = false
		want_lucid = false
	if in_unmed != want_unmed or in_lucid != want_lucid:
		failures.append("(%.2f, %.2f): expected blocked-in '%s', got unmed=%s lucid=%s"
			% [x, z, expect, in_unmed, in_lucid])
