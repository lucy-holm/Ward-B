# Headless room validator — the Godot analogue of `npm run check:rooms`.
#
#   godot --headless --path godot tools/check_rooms.tscn
#
# Run as a SCENE, not with --script: autoloads (StateManager, GameState,
# Tuning) are not registered for a custom SceneTree script, and every room
# depends on them the moment it enters the tree.
#
# Instantiating a room scene is the only way to prove its wiring, exactly as
# the TS version imports every room module rather than trusting the compiler.
# Checks:
#   - every room in main.gd's ROOM_SCENES resolves and instantiates
#   - a Spawn marker exists and is not inside solid geometry in either state
#   - every exit target resolves to a registered room (or END)
#   - the exit chain from room1 is unbroken and reaches every room
#   - interactable ids are unique within a room
#   - trigger ids are unique within a room, and no trigger rect is degenerate
#   - the collider cache is non-empty
extends Node

var failures: Array[String] = []
var checked := 0


func _ready() -> void:
	var registry := _parse_registry()
	if registry.is_empty():
		_fail("main.gd ROOM_SCENES is empty or unparseable")
		_finish()
		return

	for id: String in registry:
		_check_room(id, registry[id], registry)

	_check_chain(registry)
	_check_materials()
	_finish()


# Materials must stay ShaderMaterial. This exists because gen_rooms.py used to
# rewrite every .tres as a flat StandardMaterial3D on each run, which silently
# reverted the procedural shaders for four commits — the .gdshader files stayed
# on disk with nothing referencing them, so the ward rendered flat while every
# other check still passed. Nothing else in this suite looks at a pixel, so
# without this assertion the same class of regression is invisible.
const EXPECTED_MATERIAL_TYPE := {
	"wall": "ShaderMaterial", "wall2": "ShaderMaterial",
	"floor": "ShaderMaterial", "ceil": "ShaderMaterial",
	"prop": "ShaderMaterial", "bed": "ShaderMaterial",
	"door": "ShaderMaterial", "chain": "ShaderMaterial",
	"dispenser": "ShaderMaterial", "pad": "ShaderMaterial",
	"keypad": "ShaderMaterial", "plate": "ShaderMaterial",
	# Deliberately NOT shaders: glow is unshaded so a light panel reads at full
	# brightness regardless of room lighting, and pill is kept clean/ungrimed
	# because it is a gameplay-readable affordance.
	"glow": "StandardMaterial3D", "pill": "StandardMaterial3D",
}


func _check_materials() -> void:
	for name: String in EXPECTED_MATERIAL_TYPE:
		var path := "res://materials/%s.tres" % name
		if not ResourceLoader.exists(path):
			_fail("material %s.tres is missing" % name)
			continue
		var res: Resource = load(path)
		if res == null:
			_fail("material %s.tres failed to load" % name)
			continue

		var want: String = EXPECTED_MATERIAL_TYPE[name]
		var got := "ShaderMaterial" if res is ShaderMaterial else \
			("StandardMaterial3D" if res is StandardMaterial3D else res.get_class())
		if got != want:
			_fail("material %s.tres is %s, expected %s — the procedural shader "
				% [name, got, want] + "wiring has been reverted")
			continue

		if res is ShaderMaterial and (res as ShaderMaterial).shader == null:
			_fail("material %s.tres is a ShaderMaterial with no shader assigned" % name)


func _parse_registry() -> Dictionary:
	# Read the registry straight out of main.gd so a room can never be
	# validated while unregistered — the same "registration is a real
	# invariant" idea as the TS checker.
	var out := {}
	var f := FileAccess.open("res://main.gd", FileAccess.READ)
	if f == null:
		return out
	var inside := false
	while not f.eof_reached():
		var line := f.get_line().strip_edges()
		if line.begins_with("const ROOM_SCENES"):
			inside = true
			continue
		if inside:
			if line.begins_with("}"):
				break
			var parts := line.split(":", true, 1)
			if parts.size() == 2:
				var key := parts[0].strip_edges().trim_prefix('"').trim_suffix('"')
				var val := parts[1].strip_edges().trim_suffix(",").strip_edges()
				val = val.trim_prefix('"').trim_suffix('"')
				if not key.is_empty() and not val.is_empty():
					out[key] = val
	return out


func _instantiate(path: String) -> Node:
	if not ResourceLoader.exists(path):
		return null
	var packed: PackedScene = load(path)
	if packed == null:
		return null
	var room: Node = packed.instantiate()
	if room == null:
		return null
	add_child(room)
	return room


func _dispose(room: Node) -> void:
	remove_child(room)
	room.free()


func _check_room(id: String, path: String, registry: Dictionary) -> void:
	checked += 1

	var room := _instantiate(path)
	if room == null:
		_fail("%s: could not load/instantiate %s" % [id, path])
		return

	var col := WardCollision.new()
	col.rebuild_from(room)
	if col.boxes.is_empty():
		_fail("%s: collider cache is empty — no solid geometry found" % id)

	# --- spawn ---
	var spawn: Node3D = room.get_node_or_null("Spawn")
	if spawn == null:
		_fail("%s: no Spawn marker" % id)
	else:
		var p := spawn.global_position
		for state in [StateManager.State.UNMED, StateManager.State.LUCID]:
			if col.is_blocked_at(p.x, p.z, Tuning.PLAYER_RADIUS, state):
				var sn := "unmed" if state == StateManager.State.UNMED else "lucid"
				_fail("%s: spawn (%.2f, %.2f) is inside solid geometry while %s"
					% [id, p.x, p.z, sn])

	# --- exits ---
	var exits: Node = room.get_node_or_null("Exits")
	if exits == null or exits.get_child_count() == 0:
		_fail("%s: no exits" % id)
	else:
		for child in exits.get_children():
			if not (child is RoomExit):
				continue
			var to: String = (child as RoomExit).exit_to
			if to == "END":
				continue
			if not registry.has(to):
				_fail("%s: exit targets unregistered room '%s'" % [id, to])

	# --- unique interactable ids ---
	_collect_ids(room, {}, id)

	# --- trigger volumes ---
	_check_triggers(id, room)

	# --- patrol clearance ---
	_check_patrol(id, col)

	_dispose(room)


# PATROL CLEARANCE — the port of kit.ts's `patrol()`, which this validator has
# been missing entirely.
#
# CLAUDE.md advertises check:rooms as "runs patrol-clearance validators". That
# was true of the TS harness and never true here, and the gap was not academic:
# room 4's waypoint 0 sits *inside* a table collider, so the orderly spawned
# embedded in furniture and the axis-separated resolver refused every move.
# Every other check passed. (The same room is unvalidated in the Three.js
# build too — kit.patrol() only arrived at room 11, and rooms 4-7 pass their
# waypoints to the Orderly constructor raw, so it is an inherited bug rather
# than a port regression.)
#
# Checks waypoints AND the legs between them: a leg can clip a corner even when
# both endpoints are clear. Only always-on colliders count (state_filter -1) —
# a lucid-only blocker does not apply to him, the same rule Orderly documents.
const PATROL_MARGIN := 0.1  # on top of the body radius; kit.ts's ">0.5" rule


func _check_patrol(id: String, col: WardCollision) -> void:
	var script: GDScript = load("res://rooms/%s/%s.gd" % [id, id])
	if script == null:
		return
	var wps: Variant = script.get("WAYPOINTS")
	if wps == null or not (wps is Array) or (wps as Array).is_empty():
		return  # room has no orderly; nothing to validate

	var pts: Array = wps
	var need := Tuning.ORDERLY_RADIUS + PATROL_MARGIN

	for i in pts.size():
		var w: Vector3 = pts[i]
		for b in col.boxes:
			if b.state_filter != -1:
				continue
			var d := _point_box_dist(w.x, w.z, b)
			if d < need:
				_fail("%s: patrol waypoint %d (%.2f, %.2f) is only %.2fm from collider "
					% [id, i, w.x, w.z, d]
					+ "x[%.2f,%.2f] z[%.2f,%.2f] — needs >%.2fm (body %.2f + margin). "
					% [b.min_x, b.max_x, b.min_z, b.max_z, need, Tuning.ORDERLY_RADIUS]
					+ "He spawns on waypoint 0, so an embedded waypoint freezes him outright.")

	for i in pts.size():
		var a: Vector3 = pts[i]
		var c: Vector3 = pts[(i + 1) % pts.size()]
		for b in col.boxes:
			if b.state_filter != -1:
				continue
			var d := _seg_box_dist(a.x, a.z, c.x, c.z, b)
			if d < need:
				_fail("%s: patrol leg %d->%d ((%.2f,%.2f) to (%.2f,%.2f)) passes only %.2fm from "
					% [id, i, (i + 1) % pts.size(), a.x, a.z, c.x, c.z, d]
					+ "collider x[%.2f,%.2f] z[%.2f,%.2f] — needs >%.2fm. This is the wedge bug: "
					% [b.min_x, b.max_x, b.min_z, b.max_z, need]
					+ "his body clips the corner mid-leg and freezes there.")


func _point_box_dist(x: float, z: float, b) -> float:
	var dx := maxf(maxf(b.min_x - x, 0.0), x - b.max_x)
	var dz := maxf(maxf(b.min_z - z, 0.0), z - b.max_z)
	return sqrt(dx * dx + dz * dz)


func _point_seg_dist(px: float, pz: float, x0: float, z0: float, x1: float, z1: float) -> float:
	var dx := x1 - x0
	var dz := z1 - z0
	var len_sq := dx * dx + dz * dz
	var t := 0.0
	if len_sq > 0.0:
		t = clampf(((px - x0) * dx + (pz - z0) * dz) / len_sq, 0.0, 1.0)
	return Vector2(px - (x0 + t * dx), pz - (z0 + t * dz)).length()


# Liang-Barsky segment-vs-AABB, same as kit.ts's segIntersectsAABB.
func _seg_hits_box(x0: float, z0: float, x1: float, z1: float, b) -> bool:
	var t0 := 0.0
	var t1 := 1.0
	var dx := x1 - x0
	var dz := z1 - z0
	var p := [-dx, dx, -dz, dz]
	var q := [x0 - b.min_x, b.max_x - x0, z0 - b.min_z, b.max_z - z0]
	for i in 4:
		if p[i] == 0.0:
			if q[i] < 0.0:
				return false
		else:
			var r: float = q[i] / p[i]
			if p[i] < 0.0:
				if r > t1:
					return false
				if r > t0:
					t0 = r
			else:
				if r < t0:
					return false
				if r < t1:
					t1 = r
	return true


func _seg_box_dist(x0: float, z0: float, x1: float, z1: float, b) -> float:
	if _seg_hits_box(x0, z0, x1, z1, b):
		return 0.0
	var best := minf(_point_box_dist(x0, z0, b), _point_box_dist(x1, z1, b))
	for c in [[b.min_x, b.min_z], [b.max_x, b.min_z], [b.max_x, b.max_z], [b.min_x, b.max_z]]:
		best = minf(best, _point_seg_dist(c[0], c[1], x0, z0, x1, z1))
	return best


# TRIGGER VOLUMES — the same class of check as interactable ids, plus one that
# only exists because containment is deliberately STRICT (see
# core/trigger_volume.gd): a rect with min >= max on either axis contains no
# point at all, so it is silently dead rather than merely small. That is very
# easy to author by transposing two numbers, and the symptom — "the plate does
# nothing" — looks identical to a room-script bug.
func _check_triggers(room_id: String, room: Node) -> void:
	var seen := {}
	for v in TriggerVolume.collect(room):
		var tid := v.trigger_id
		if tid.is_empty():
			_fail("%s: trigger volume with empty trigger_id" % room_id)
			continue
		if seen.has(tid):
			_fail("%s: duplicate trigger id '%s' — the poll keys its active set "
				% [room_id, tid] + "on the id, so the second one can never fire "
				+ "independently of the first")
		seen[tid] = true
		if v.min_x >= v.max_x or v.min_z >= v.max_z:
			_fail("%s: trigger '%s' has a degenerate rect x[%.2f,%.2f] z[%.2f,%.2f] — "
				% [room_id, tid, v.min_x, v.max_x, v.min_z, v.max_z]
				+ "containment is strict (> / <), so it can never fire")


func _collect_ids(node: Node, seen: Dictionary, room_id: String) -> void:
	if node is Interactable:
		var iid: String = (node as Interactable).interactable_id
		if iid.is_empty():
			_fail("%s: interactable with empty id" % room_id)
		elif seen.has(iid):
			_fail("%s: duplicate interactable id '%s'" % [room_id, iid])
		else:
			seen[iid] = true
	for child in node.get_children():
		_collect_ids(child, seen, room_id)


func _check_chain(registry: Dictionary) -> void:
	# Walk room1 -> ... -> END and confirm every room is reachable.
	var visited := {}
	var cursor := "room1"
	var guard := 0
	while registry.has(cursor) and guard < 64:
		guard += 1
		if visited.has(cursor):
			_fail("exit chain loops at '%s'" % cursor)
			return
		visited[cursor] = true

		var room := _instantiate(registry[cursor])
		if room == null:
			return
		var next := ""
		var exits: Node = room.get_node_or_null("Exits")
		if exits != null:
			for child in exits.get_children():
				if child is RoomExit:
					next = (child as RoomExit).exit_to
					break
		_dispose(room)

		if next.is_empty():
			_fail("chain: '%s' has no exit" % cursor)
			return
		if next == "END":
			break
		cursor = next

	for id: String in registry:
		if not visited.has(id):
			_fail("'%s' is registered but unreachable from room1" % id)


func _fail(msg: String) -> void:
	failures.append(msg)


func _finish() -> void:
	print("")
	print("check_rooms: %d room(s) checked" % checked)
	if failures.is_empty():
		print("  OK - all invariants hold")
	else:
		for f in failures:
			print("  FAIL  %s" % f)
		print("  %d failure(s)" % failures.size())
	print("")
	get_tree().quit(0 if failures.is_empty() else 1)
