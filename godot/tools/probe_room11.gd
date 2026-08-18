# ROOM 11 verification probe — the runtime half of the room-11 port.
#
#   godot --headless --path godot tools/probe_room11.tscn
#
# WHY THIS EXISTS. A screenshot cannot prove any of the things room 11 is
# actually built out of:
#
#  * core/state_object.gd only writes `visible`. Blocking comes from the
#    collision LAYER, filtered at query time. So a picture of a sealed gate is
#    a picture of a mesh, not evidence that the gate gates. (This is the probe
#    core/state_object.gd's header calls tools/check_state_gates.gd; that file
#    does not exist on this branch, so this is the equivalent it asks for.)
#  * A height zone is never a collider, so nothing about the mezzanine shows
#    up in a collision test — it has to be read back out of WardLevels.
#  * The two orderlies' separation is tier-1, i.e. NOT the categorical
#    cross-level gate. It rests on distance plus a full-height railing acting
#    as an occluder, and both have to be measured against the real cache and
#    the real RayCast3D.
#
# Asserts, in order: floor height and ramp/zone seam continuity; both unmed
# gates and the exit door blocking in the right states; railings solid and the
# raised surfaces walkable; patrol clearance (check_rooms.gd's _check_patrol,
# run directly); orderly separation by distance AND by occlusion; headroom;
# scrawl quad extents; lights sealed inside geometry.
extends Node

const ROOM := "res://rooms/room11/room11.tscn"

var fails: Array[String] = []


func _ready() -> void:
	var room: Node = (load(ROOM) as PackedScene).instantiate()
	add_child(room)
	for i in 5:
		await get_tree().process_frame

	var col := WardCollision.new()
	col.rebuild_from(room)
	var lv := WardLevels.new()
	lv.rebuild_from(room)

	print("=== 1. FLOOR HEIGHT (tier 1, '__flat') ===")
	var F := WardLevels.FLAT_LEVEL_ID
	for probe in [
		[0.0, 20.0, 0.0, "Z1 spawn"],
		[-5.0, 0.0, 0.0, "lower ward, west"],
		[5.0, 4.0, 0.9, "platform interior"],
		[1.0, 0.0, 0.9, "platform SW corner"],
		[9.0, 8.0, 0.9, "platform NE/edge"],
		[5.0, 8.0, 0.9, "SEAM zone/ramp z=8"],
		[5.0, 8.001, 0.89955, "just onto ramp"],
		[5.0, 9.0, 0.45, "ramp midpoint"],
		[5.0, 10.0, 0.0, "ramp ground mouth"],
		[5.0, 10.001, 0.0, "just off the ramp"],
		[0.99, 4.0, 0.0, "1cm west of platform edge"],
		[5.0, -0.01, 0.0, "1cm north of platform edge"],
		[0.0, -14.0, 0.0, "Z3"],
	]:
		var got: float = lv.floor_height_at(F, probe[0], probe[1])
		var ok: bool = absf(got - float(probe[2])) < 0.002
		print("  %s (%.3f, %.3f) -> %.4f  want %.4f  %s"
			% [probe[3], probe[0], probe[1], got, probe[2], "OK" if ok else "MISMATCH"])
		if not ok:
			fails.append("floor height at %s" % probe[3])

	# Continuity sweep across the whole raised complex, 1cm steps.
	var worst := 0.0
	var worst_z := 0.0
	var z := 0.0
	while z <= 10.0:
		var a: float = lv.floor_height_at(F, 5.0, z)
		var b: float = lv.floor_height_at(F, 5.0, z + 0.01)
		if absf(b - a) > worst:
			worst = absf(b - a)
			worst_z = z
		z += 0.01
	print("  worst 1cm step along x=5, z 0..10: %.5f m at z=%.2f (ramp ideal 0.0045)" % [worst, worst_z])
	if worst > 0.01:
		fails.append("floor height discontinuity %.4f at z=%.2f" % [worst, worst_z])

	print("")
	print("=== 2. STATE GATES ACTUALLY GATE (colliders, not meshes) ===")
	var R := Tuning.PLAYER_RADIUS
	for g in [[0.0, 12.0, "GATE 1"], [0.0, -10.0, "GATE 2"]]:
		var unmed: bool = col.is_blocked_at(g[0], g[1], R, StateManager.State.UNMED)
		var lucid: bool = col.is_blocked_at(g[0], g[1], R, StateManager.State.LUCID)
		print("  %s at (%.1f, %.1f): unmed blocked=%s lucid blocked=%s" % [g[2], g[0], g[1], unmed, lucid])
		if not unmed or lucid:
			fails.append("%s does not gate" % g[2])
	# Off to the side of each gap the permanent wall must block in BOTH states.
	for g in [[-5.0, 12.0, "GATE 1 wall"], [5.0, -10.0, "GATE 2 wall"]]:
		var u: bool = col.is_blocked_at(g[0], g[1], R, StateManager.State.UNMED)
		var l: bool = col.is_blocked_at(g[0], g[1], R, StateManager.State.LUCID)
		print("  %s at (%.1f, %.1f): unmed=%s lucid=%s (want true/true)" % [g[2], g[0], g[1], u, l])
		if not u or not l:
			fails.append("%s is not solid in both states" % g[2])
	# The exit door collider, before unlock.
	var d_u: bool = col.is_blocked_at(0.0, -18.0, R, StateManager.State.UNMED)
	var d_l: bool = col.is_blocked_at(0.0, -18.0, R, StateManager.State.LUCID)
	print("  DoorCollider at (0,-18): unmed=%s lucid=%s (want true/true)" % [d_u, d_l])
	if not d_u or not d_l:
		fails.append("exit door does not block before unlock")
	var door := room.find_child("DoorCollider", true, false)
	if door is CollisionObject3D:
		(door as CollisionObject3D).collision_layer = 0
		col.rebuild_from(room)
		var after: bool = col.is_blocked_at(0.0, -18.0, R, StateManager.State.LUCID)
		print("  DoorCollider after unlock_door(): blocked=%s (want false)" % after)
		if after:
			fails.append("unlock_door does not clear the exit door")
		(door as CollisionObject3D).collision_layer = WardCollision.LAYER_WORLD_STATIC
		col.rebuild_from(room)
	else:
		fails.append("DoorCollider node missing")

	print("")
	print("=== 3. RAILINGS HOLD (they are the only thing that does) ===")
	# A raised zone is never a collider, so prove the rails are.
	for probe in [
		[1.0, 4.0, true, "west rail, platform run"],
		[1.0, 9.0, true, "west rail, ramp run"],
		[5.0, 0.0, true, "north rail"],
		[5.0, 4.0, false, "platform interior (must be walkable)"],
		[5.0, 9.0, false, "ramp interior (must be walkable)"],
		[5.0, 10.4, false, "ramp mouth, open by design"],
		[3.0, 4.0, false, "lower ward east of nothing"],
	]:
		var blocked: bool = col.is_blocked_at(probe[0], probe[1], R, StateManager.State.UNMED)
		var want: bool = probe[2]
		print("  %s (%.1f,%.1f): blocked=%s want=%s %s"
			% [probe[3], probe[0], probe[1], blocked, want, "OK" if blocked == want else "WRONG"])
		if blocked != want:
			fails.append("railing/walkability wrong at %s" % probe[3])

	print("")
	print("=== 4. PATROL CLEARANCE (check_rooms._check_patrol, run directly) ===")
	var script: GDScript = load("res://rooms/room11/room11.gd")
	var need := Tuning.ORDERLY_RADIUS + 0.1
	var consts := script.get_script_constant_map()
	for key: String in consts:
		if not key.begins_with("WAYPOINTS"):
			continue
		var pts: Array = consts[key]
		var worst_d := INF
		var worst_msg := ""
		for i in pts.size():
			var w: Vector3 = pts[i]
			for b in col.boxes:
				if b.state_filter != -1:
					continue
				var dd := _point_box_dist(w.x, w.z, b)
				if dd < worst_d:
					worst_d = dd
					worst_msg = "waypoint %d (%.2f,%.2f) vs x[%.2f,%.2f] z[%.2f,%.2f]" % [i, w.x, w.z, b.min_x, b.max_x, b.min_z, b.max_z]
		for i in pts.size():
			var a: Vector3 = pts[i]
			var c: Vector3 = pts[(i + 1) % pts.size()]
			for b in col.boxes:
				if b.state_filter != -1:
					continue
				var dd := _seg_box_dist(a.x, a.z, c.x, c.z, b)
				if dd < worst_d:
					worst_d = dd
					worst_msg = "leg %d->%d vs x[%.2f,%.2f] z[%.2f,%.2f]" % [i, (i + 1) % pts.size(), b.min_x, b.max_x, b.min_z, b.max_z]
		print("  %s: min clearance %.3fm (need >%.2f) — %s  %s"
			% [key, worst_d, need, worst_msg, "OK" if worst_d >= need else "FAIL"])
		if worst_d < need:
			fails.append("%s clearance %.3f" % [key, worst_d])

	print("")
	print("=== 5. ORDERLY SEPARATION (geometry, since tier 1 has no level gate) ===")
	var lower: Array = consts["WAYPOINTS_A"]
	var upper: Array = consts["WAYPOINTS_B"]
	# LOWER vs the raised complex footprint x[1,9] z[0,10].
	var mind := INF
	for i in lower.size():
		var a: Vector3 = lower[i]
		var c: Vector3 = lower[(i + 1) % lower.size()]
		var t := 0.0
		while t <= 1.0:
			var px: float = a.x + (c.x - a.x) * t
			var pz: float = a.z + (c.z - a.z) * t
			var dx: float = maxf(maxf(1.0 - px, 0.0), px - 9.0)
			var dz: float = maxf(maxf(0.0 - pz, 0.0), pz - 10.0)
			mind = minf(mind, sqrt(dx * dx + dz * dz))
			t += 0.002
	print("  LOWER patrol -> raised complex: %.3fm (sight range %.1f)" % [mind, Tuning.ORDERLY_SIGHT_RANGE])
	if mind <= Tuning.ORDERLY_SIGHT_RANGE:
		fails.append("LOWER can reach sight range of the mezzanine (%.2fm)" % mind)
	# LOWER vs both gate openings.
	for g in [[-2.0, 12.0, 2.0, 12.0, "GATE 1 gap"], [-2.0, -10.0, 2.0, -10.0, "GATE 2 gap"]]:
		var best := INF
		for i in lower.size():
			var a: Vector3 = lower[i]
			var c: Vector3 = lower[(i + 1) % lower.size()]
			var t := 0.0
			while t <= 1.0:
				var px: float = a.x + (c.x - a.x) * t
				var pz: float = a.z + (c.z - a.z) * t
				var s := 0.0
				while s <= 1.0:
					var gx: float = g[0] + (g[2] - g[0]) * s
					var gz: float = g[1] + (g[3] - g[1]) * s
					best = minf(best, Vector2(px - gx, pz - gz).length())
					s += 0.01
				t += 0.01
		print("  LOWER patrol -> %s: %.3fm (inspection guideline ~8.17m)" % [g[4], best])
		if best <= Tuning.ORDERLY_SIGHT_RANGE:
			fails.append("LOWER within sight of %s" % g[4])
	# UPPER vs the code scrawl.
	var code_pt := Vector2(8.78, 4.0)
	var best_u := INF
	for i in upper.size():
		var a: Vector3 = upper[i]
		var c: Vector3 = upper[(i + 1) % upper.size()]
		var t := 0.0
		while t <= 1.0:
			var px: float = a.x + (c.x - a.x) * t
			var pz: float = a.z + (c.z - a.z) * t
			best_u = minf(best_u, Vector2(px - code_pt.x, pz - code_pt.y).length())
			t += 0.002
	print("  UPPER patrol -> code scrawl (8.78, 4): %.3fm" % best_u)
	if best_u <= Tuning.ORDERLY_SIGHT_RANGE:
		fails.append("UPPER within sight of the code scrawl (%.2fm)" % best_u)
	# UPPER vs the lower ward, by RAW DISTANCE (expected to FAIL — the point).
	var closest_lower := INF
	var closest_at := Vector2.ZERO
	for i in upper.size():
		var a: Vector3 = upper[i]
		var c: Vector3 = upper[(i + 1) % upper.size()]
		var t := 0.0
		while t <= 1.0:
			var px: float = a.x + (c.x - a.x) * t
			var pz: float = a.z + (c.z - a.z) * t
			# nearest reachable lower-ward point: west of the rail, player radius clear
			var lx := 0.88 - Tuning.PLAYER_RADIUS
			var d := Vector2(px - lx, 0.0).length()
			if d < closest_lower:
				closest_lower = d
				closest_at = Vector2(px, pz)
			t += 0.01
	print("  UPPER patrol -> nearest standable lower-ward point: %.3fm — INSIDE 6m sight range"
		% closest_lower)
	print("    => distance does NOT separate them; occlusion must. Testing the rail as an occluder:")
	_probe_occlusion(room)

	print("")
	print("=== 6. HEADROOM / CEILING ===")
	print("  ceiling_y %.2f, mezz y %.2f, eye %.2f -> headroom on the platform %.3fm"
		% [lv.ceiling_y, 0.9, Tuning.PLAYER_EYE_HEIGHT, lv.ceiling_y - 0.9 - Tuning.PLAYER_EYE_HEIGHT])
	print("  headroom('__flat') per WardLevels (base_y only, tier 2 check): %.3fm" % lv.headroom(F))

	print("")
	print("=== 7. SCRAWL QUAD OVERFLOW ===")
	var scrawls := room.get_node_or_null("Scrawls")
	if scrawls != null:
		for s in scrawls.get_children():
			if not (s is Label3D):
				continue
			var lab := s as Label3D
			var aabb := lab.get_aabb()
			var g := lab.global_transform * aabb
			var lo := g.position
			var hi := g.position + g.size
			print("  %-12s pos(%.2f,%.2f,%.2f) world x[%.2f,%.2f] y[%.2f,%.2f] z[%.2f,%.2f]"
				% [lab.name, lab.global_position.x, lab.global_position.y, lab.global_position.z,
				   lo.x, hi.x, lo.y, hi.y, lo.z, hi.z])

	print("")
	print("=== 8. LIGHTS EMBEDDED IN GEOMETRY ===")
	var lights := room.get_node_or_null("Lights")
	# every mesh box in Geometry, as a 3D AABB
	var boxes3: Array = []
	for n in room.get_node("Geometry").get_children():
		_collect_meshes(n, boxes3)
	if lights != null:
		for l in lights.get_children():
			if not (l is OmniLight3D):
				continue
			var ol := l as OmniLight3D
			var p := ol.global_position
			for bx in boxes3:
				var a: AABB = bx[1]
				if a.has_point(p):
					print("  %s at (%.2f,%.2f,%.2f) is INSIDE mesh '%s'  shadow_enabled=%s"
						% [ol.name, p.x, p.y, p.z, bx[0], ol.shadow_enabled])
					if ol.shadow_enabled:
						fails.append("shadow-casting light %s sealed inside %s" % [ol.name, bx[0]])

	print("")
	if fails.is_empty():
		print("PROBE: all hard assertions hold")
	else:
		for f in fails:
			print("PROBE FAIL: %s" % f)
	get_tree().quit(0 if fails.is_empty() else 1)


func _collect_meshes(n: Node, out: Array) -> void:
	if n is MeshInstance3D:
		var mi := n as MeshInstance3D
		out.append([mi.get_parent().name + "/" + mi.name, mi.global_transform * mi.get_aabb()])
	for c in n.get_children():
		_collect_meshes(c, out)


func _probe_occlusion(room: Node) -> void:
	# Real RayCast3D against LAYER_WORLD_STATIC, exactly as Orderly._occluded().
	var ray := RayCast3D.new()
	add_child(ray)
	ray.collision_mask = WardCollision.LAYER_WORLD_STATIC
	ray.collide_with_areas = false
	var cases := [
		[Vector3(2, 0.9 + 1.5, 1.2), Vector3(-3, 1.62, 1.2), true, "UPPER wp0 -> lower ward (-3,1.2)"],
		[Vector3(2, 0.9 + 1.5, 4.0), Vector3(-2, 1.62, 4.0), true, "UPPER mid -> lower ward (-2,4)"],
		[Vector3(2, 0.9 + 1.5, 6.8), Vector3(-1, 1.62, 8.0), true, "UPPER wp1 -> lower ward (-1,8)"],
		[Vector3(2, 0.9 + 1.5, 6.8), Vector3(0.4, 1.62, 6.8), true, "UPPER wp1 -> right at the rail"],
		[Vector3(2, 0.9 + 1.5, 4.0), Vector3(7, 0.9 + 1.62, 4.0), false, "UPPER -> player ON the platform"],
		[Vector3(2, 0.9 + 1.5, 6.8), Vector3(5, 0.45 + 1.62, 9.0), false, "UPPER -> player on the ramp"],
		[Vector3(2, 0.9 + 1.5, 1.2), Vector3(3, 1.62, -2.0), true, "UPPER -> north of the north rail"],
		[Vector3(-6, 1.5, 5.0), Vector3(5, 0.9 + 1.62, 4.0), true, "LOWER -> player on the platform"],
	]
	for c in cases:
		ray.global_position = c[0]
		ray.target_position = ray.to_local(c[1])
		ray.force_raycast_update()
		var hit: bool = ray.is_colliding()
		var what := ""
		if hit:
			var o: Object = ray.get_collider()
			what = " (blocked by %s)" % (o as Node).name
		print("      %-46s occluded=%s want=%s %s%s"
			% [c[3], hit, c[2], "OK" if hit == bool(c[2]) else "*** WRONG ***", what])
		if hit != bool(c[2]):
			fails.append("occlusion: %s" % c[3])
	ray.queue_free()


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
			var rr: float = q[i] / p[i]
			if p[i] < 0.0:
				if rr > t1:
					return false
				if rr > t0:
					t0 = rr
			else:
				if rr < t0:
					return false
				if rr < t1:
					t1 = rr
	return true


func _seg_box_dist(x0: float, z0: float, x1: float, z1: float, b) -> float:
	if _seg_hits_box(x0, z0, x1, z1, b):
		return 0.0
	var best := minf(_point_box_dist(x0, z0, b), _point_box_dist(x1, z1, b))
	for c in [[b.min_x, b.min_z], [b.max_x, b.min_z], [b.max_x, b.max_z], [b.min_x, b.max_z]]:
		best = minf(best, _point_seg_dist(c[0], c[1], x0, z0, x1, z1))
	return best
