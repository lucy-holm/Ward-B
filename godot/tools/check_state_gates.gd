<<<<<<< HEAD
# State-gated-collider validator.
#
#   godot --headless --path . tools/check_state_gates.tscn -- \
#       res://rooms/room10/room10.tscn  0,-10  0,-20  0,0
#
# Answers the one question a screenshot cannot: does a state-conditional wall
# actually BLOCK, rather than merely appear and disappear?
#
# Visibility and collision are two independent mechanisms in this engine and it
# is entirely possible to get one right and the other wrong:
#   * visibility comes from StateObject (core/state_object.gd), which flips
#     `visible` on state_changed. It does NOT touch collision layers.
#   * collision comes from the layer alone — WardCollision maps layer 4 to
#     state_filter LUCID and layer 8 to UNMED and filters at QUERY time
#     (core/collision.gd), so a mis-layered panel still vanishes on cue while
#     blocking in both states, or in neither.
# A screenshot only ever tests the first. This tests the second, against the
# real instantiated .tscn, the real layers and the real filter.
#
# Prints one line per state-filtered collider and one per probe point, then
# exits non-zero if any probe blocks in a state where it should not — a probe
# that blocks in BOTH states or NEITHER is almost always the bug.
extends Node


func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	if args.size() < 1:
		push_error("usage: check_state_gates.tscn -- <res://room.tscn> [x,z ...]")
=======
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
>>>>>>> wt/room12
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

<<<<<<< HEAD
	var lucid_only := 0
	var unmed_only := 0
	for b in col.boxes:
		if b.state_filter == StateManager.State.LUCID:
			lucid_only += 1
			print("  LUCID-ONLY  x[%7.2f,%7.2f] z[%7.2f,%7.2f]" % [b.min_x, b.max_x, b.min_z, b.max_z])
		elif b.state_filter == StateManager.State.UNMED:
			unmed_only += 1
			print("  UNMED-ONLY  x[%7.2f,%7.2f] z[%7.2f,%7.2f]" % [b.min_x, b.max_x, b.min_z, b.max_z])
	print("%s: %d colliders (%d lucid-only, %d unmed-only)"
		% [scene_path.get_file(), col.boxes.size(), lucid_only, unmed_only])

	var failures := 0
	var r := Tuning.PLAYER_RADIUS

	var spawn: Node3D = room.get_node_or_null("Spawn")
	if spawn != null:
		var p := spawn.global_position
		var su := col.is_blocked_at(p.x, p.z, r, StateManager.State.UNMED)
		var sl := col.is_blocked_at(p.x, p.z, r, StateManager.State.LUCID)
		print("SPAWN  (%6.2f,%7.2f)  unmed=%s lucid=%s  %s"
			% [p.x, p.z, _b(su), _b(sl), "OK" if not su and not sl else "FAIL"])
		if su or sl:
			failures += 1

	for i in range(1, args.size()):
		var parts := str(args[i]).split(",")
		if parts.size() != 2:
			continue
		var x := float(parts[0])
		var z := float(parts[1])
		var u := col.is_blocked_at(x, z, r, StateManager.State.UNMED)
		var l := col.is_blocked_at(x, z, r, StateManager.State.LUCID)
		var verdict := "GATED unmed-only" if u and not l else \
			("GATED lucid-only" if l and not u else
			("open in both" if not u and not l else "SOLID in both"))
		print("PROBE  (%6.2f,%7.2f)  unmed=%s lucid=%s  -> %s" % [x, z, _b(u), _b(l), verdict])

	print("")
	if failures > 0:
		print("  %d failure(s)" % failures)
	else:
		print("  OK")

	# Free the room explicitly; quitting with it still parented leaks its
	# subtree and prints an ObjectDB-leak warning that looks like a real fault.
	remove_child(room)
	room.free()
	get_tree().quit(1 if failures > 0 else 0)


func _b(v: bool) -> String:
	return "BLOCKED" if v else "clear  "
=======
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
>>>>>>> wt/room12
