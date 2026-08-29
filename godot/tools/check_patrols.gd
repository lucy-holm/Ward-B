# Patrol-clearance validator for EVERY route in a room, not just the first one.
#
#	godot --headless --path . tools/check_patrols.tscn
#
# WHY THIS EXISTS — the half-covered room.
#
# tools/check_rooms.gd validates patrol clearance by looking up a constant named
# literally WAYPOINTS. That is fine for a one-orderly room. Room 8 runs TWO, and
# its own source says so out loud:
#
#	  "It covers route A only; route B is NOT reached by that check. Both routes
#	   were verified by hand against every always-on collider in this room
#	   (min clearance: A 0.80m, B 0.59m, against a 0.50m requirement)."
#
# "Verified by hand" is a snapshot, not a guarantee. Route B sits 0.09m above the
# requirement, so a single prop placed near it would wedge an orderly in play
# while CI stayed green — the worst failure mode available, because the thing
# that is supposed to catch it reports success.
#
# So: enumerate the room script's constants and validate EVERY one whose name
# starts with WAYPOINTS. A room that later grows a third orderly is covered the
# moment its waypoints are declared, with nobody needing to remember this file.
#
# WHAT IT MEASURES. Distance from each sampled point along each leg to the
# nearest ALWAYS-ON collider (state_filter -1). State-gated boxes are skipped
# deliberately: an orderly's route has to be clear in the state he walks it, and
# a lucid-only wall is not there when an unmed orderly is patrolling past it.
# That mirrors what check_rooms.gd's own validator does.
extends Node

const CLEARANCE_MIN := 0.50
const SAMPLES_PER_LEG := 40

var _failures := 0


func _ready() -> void:
	var dir := DirAccess.open("res://rooms")
	var ids := dir.get_directories()
	ids.sort()
	var checked := 0
	for id in ids:
		var scene_path := "res://rooms/%s/%s.tscn" % [id, id]
		var script_path := "res://rooms/%s/%s.gd" % [id, id]
		if not ResourceLoader.exists(scene_path) or not ResourceLoader.exists(script_path):
			continue
		var scr: GDScript = load(script_path)
		if scr == null:
			continue
		var routes := {}
		for key in scr.get_script_constant_map():
			if String(key).begins_with("WAYPOINTS"):
				routes[key] = scr.get_script_constant_map()[key]
		if routes.is_empty():
			continue

		var room := (load(scene_path) as PackedScene).instantiate()
		add_child(room)
		var col := WardCollision.new()
		col.rebuild_from(room)
		for key in routes:
			checked += 1
			_check_route(id, String(key), routes[key], col)
		room.queue_free()
		remove_child(room)

	print("check_patrols: %d route(s) checked" % checked)
	if _failures > 0:
		print("	 %d FAILURE(S)" % _failures)
		get_tree().quit(1)
		return
	print("	 OK - every patrol route clears every always-on collider")
	get_tree().quit(0)


func _check_route(id: String, name: String, pts: Array, col: WardCollision) -> void:
	if pts.size() < 2:
		return
	var worst := INF
	var worst_at := Vector3.ZERO
	for i in pts.size():
		var a: Vector3 = pts[i]
		var b: Vector3 = pts[(i + 1) % pts.size()]
		for t in SAMPLES_PER_LEG + 1:
			var p: Vector3 = a.lerp(b, float(t) / float(SAMPLES_PER_LEG))
			var d := _clearance(p, col)
			if d < worst:
				worst = d
				worst_at = p
	if worst < CLEARANCE_MIN:
		print("FAIL %s[%s]: min clearance %.3fm at (%.2f, %.2f) — needs %.2fm"
			% [id, name, worst, worst_at.x, worst_at.z, CLEARANCE_MIN])
		_failures += 1
	else:
		print("	 %-16s %-14s min clearance %.3fm" % [id, name, worst])


func _clearance(p: Vector3, col: WardCollision) -> float:
	var best := INF
	for box in col.boxes:
		if box.state_filter != -1:
			continue
		var dx: float = maxf(maxf(box.min_x - p.x, 0.0), p.x - box.max_x)
		var dz: float = maxf(maxf(box.min_z - p.z, 0.0), p.z - box.max_z)
		best = minf(best, sqrt(dx * dx + dz * dz))
	return best
