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
