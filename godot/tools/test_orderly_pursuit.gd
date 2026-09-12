# Focused tests for the bounded orderly route planner and authored noise.
#
#   godot/tools/run_tests.sh test_orderly_pursuit
extends Node

var failures: Array[String] = []
var passes := 0
var worst_plan_ms := 0.0


func _ready() -> void:
	Telemetry.disabled = true
	_test_corner_route()
	_test_u_route()
	_test_unreachable()
	_test_live_gate()
	_test_footprint_and_level()
	_test_real_room_routes()
	await _test_actor_route_replanning()
	await _test_real_actor_route()
	await _test_noise_lifecycle()
	Telemetry.disabled = false
	if failures.is_empty():
		print("OK - orderly pursuit/noise (%d assertions)" % passes)
		print("  worst actual planner call: %.2f ms" % worst_plan_ms)
		get_tree().quit()
	else:
		for failure in failures:
			push_error(failure)
		get_tree().quit(1)


func _check(condition: bool, message: String) -> void:
	if condition:
		passes += 1
	else:
		failures.append(message)


func _timed_plan(planner: OrderlyPlanner, start: Vector2, target: Vector2) -> Array[Vector2]:
	var began := Time.get_ticks_usec()
	var route := planner.plan(start, target)
	var elapsed_ms := float(Time.get_ticks_usec() - began) / 1000.0
	worst_plan_ms = maxf(worst_plan_ms, elapsed_ms)
	return route


func _collision(rects: Array[Vector4]) -> WardCollision:
	var col := WardCollision.new()
	for rect in rects:
		col.boxes.append(WardCollision.Box.new(rect.x, rect.y, rect.z, rect.w))
	return col


func _test_corner_route() -> void:
	var planner := OrderlyPlanner.new(_collision([Vector4(-1, 1, -1, 1)]))
	var route := planner.plan(Vector2(-3, -3), Vector2(3, 3))
	_check(not route.is_empty(), "corner obstacle has a route")
	var at := Vector2(-3, -3)
	for point: Vector2 in route:
		_check(planner.line_clear(at, point), "corner route leg is clear")
		at = point
	_check(at.distance_to(Vector2(3, 3)) < 0.001, "corner route reaches target")


func _test_u_route() -> void:
	var col := _collision([
		Vector4(-3, -2, -2, 2),
		Vector4(2, 3, -2, 2),
		Vector4(-3, 3, 2, 3),
	])
	var planner := OrderlyPlanner.new(col)
	var route := planner.plan(Vector2(0, 0), Vector2(0, 5))
	_check(not route.is_empty(), "U-shaped cover has a route around its side")
	var at := Vector2(0, 0)
	for point: Vector2 in route:
		_check(planner.line_clear(at, point), "U route leg is clear")
		at = point


func _test_unreachable() -> void:
	var col := _collision([
		Vector4(-2, 2, -3, -2),
		Vector4(-2, 2, 2, 3),
		Vector4(-3, -2, -2, 2),
		Vector4(2, 3, -2, 2),
	])
	var planner := OrderlyPlanner.new(col)
	_check(planner.plan(Vector2(0, -5), Vector2(0, 0)).is_empty(),
		"enclosed target is reported unreachable")
	var wall_planner := OrderlyPlanner.new(_collision([Vector4(0, 1, -3, 3)]))
	var wall_target := Vector2(1.3, 0.0) # valid player centre, too tight for orderly centre
	var wall_route := wall_planner.plan(Vector2(-3, 0), wall_target)
	_check(not wall_route.is_empty(), "wall-adjacent player gets a feasible approach")
	_check(wall_route[-1].distance_to(wall_target) <= Tuning.ORDERLY_CATCH_RADIUS,
		"wall-adjacent approach ends within catch radius")


func _test_live_gate() -> void:
	var root := Node3D.new()
	add_child(root)
	var gate := StaticBody3D.new()
	gate.collision_layer = WardCollision.LAYER_WORLD_STATIC
	var shape := CollisionShape3D.new()
	shape.shape = BoxShape3D.new()
	(shape.shape as BoxShape3D).size = Vector3(1, 2, 1)
	gate.add_child(shape)
	root.add_child(gate)
	var col := WardCollision.new()
	col.rebuild_from(root)
	var planner := OrderlyPlanner.new(col)
	var blocked_route := planner.plan(Vector2(-3, 0), Vector2(3, 0))
	_check(not blocked_route.is_empty() and blocked_route.size() > 1,
		"closed gate routes around its live box")
	gate.collision_layer = 0
	var open_route := planner.plan(Vector2(-3, 0), Vector2(3, 0))
	_check(open_route.size() == 1 and open_route[0].distance_to(Vector2(3, 0)) < 0.001,
		"disabled gate is removed from a cached route")
	shape.disabled = true
	_check(planner.line_clear(Vector2(-3, 0), Vector2(3, 0)),
		"disabled shape stays clear without a rebuild")
	shape.disabled = false
	gate.collision_layer = WardCollision.LAYER_WORLD_STATIC
	gate.position = Vector3(0, 0, 2)
	_check(planner.line_clear(Vector2(-3, 0), Vector2(3, 0)),
		"moving collider is reflected in the next cached route")
	root.queue_free()


func _test_footprint_and_level() -> void:
	var levels := WardLevels.new()
	var ground := WardLevels.Level.new("ground", 0.0)
	ground.floor_rect = Vector4(-5, 5, -5, 5)
	levels.levels = [ground]
	var planner := OrderlyPlanner.new(_collision([]), "ground")
	planner.world_levels = levels
	_check(planner.plan(Vector2(0, 0), Vector2(4, 4)).size() == 1,
		"same-level target inside footprint is reachable")
	_check(planner.plan(Vector2(0, 0), Vector2(6, 0)).is_empty(),
		"target outside orderly level footprint is rejected")
	var other := OrderlyPlanner.new(_collision([]), "balcony")
	other.world_levels = levels
	_check(other.plan(Vector2(0, 0), Vector2(1, 1)).is_empty(),
		"unknown level cannot leak onto another floor")


func _test_actor_route_replanning() -> void:
	# A failed chase target is retried on a bounded cadence, rather than
	# rebuilding the graph once per physics frame forever.
	var trapped := _collision([
		Vector4(-2, 2, -3, -2),
		Vector4(-2, 2, 2, 3),
		Vector4(-3, -2, -2, 2),
		Vector4(2, 3, -2, 2),
	])
	var trapped_player := preload("res://tools/test_stub_player.gd").new()
	add_child(trapped_player)
	trapped_player.global_position = Vector3(0, 0, 0)
	var trapped_orderly: Node = preload("res://orderly/orderly.tscn").instantiate()
	trapped_orderly.set("waypoints", [Vector3(0, 0, -5)])
	add_child(trapped_orderly)
	trapped_orderly.global_position = Vector3(0, 0, -5)
	trapped_orderly.setup(trapped_player, trapped)
	trapped_orderly.set("mode", 1) # Orderly.Mode.CHASE
	for _tick in 60:
		await get_tree().physics_frame
	var trapped_planner: OrderlyPlanner = trapped_orderly.get("_planner")
	_check(trapped_planner.plan_count <= 4,
		"unreachable chase retries stay throttled across repeated physics ticks")
	trapped_orderly.queue_free()
	trapped_player.queue_free()

	# A route already in flight is invalidated when a live gate moves onto its
	# corridor. The actor replans around it before the next movement step.
	var root := Node3D.new()
	add_child(root)
	var gate := StaticBody3D.new()
	gate.collision_layer = WardCollision.LAYER_WORLD_STATIC
	gate.position = Vector3(0, 0, 2)
	var shape := CollisionShape3D.new()
	shape.shape = BoxShape3D.new()
	(shape.shape as BoxShape3D).size = Vector3(1, 2, 1)
	gate.add_child(shape)
	root.add_child(gate)
	var moving_col := WardCollision.new()
	moving_col.rebuild_from(root)
	var gate_player := preload("res://tools/test_stub_player.gd").new()
	add_child(gate_player)
	gate_player.global_position = Vector3(3, 0, 0)
	var gate_orderly: Node = preload("res://orderly/orderly.tscn").instantiate()
	gate_orderly.set("waypoints", [Vector3(-3, 0, 0)])
	add_child(gate_orderly)
	gate_orderly.global_position = Vector3(-3, 0, 0)
	gate_orderly.setup(gate_player, moving_col)
	gate_orderly.set("mode", 1) # Orderly.Mode.CHASE
	await get_tree().physics_frame
	var gate_planner: OrderlyPlanner = gate_orderly.get("_planner")
	var plans_before_gate_move := gate_planner.plan_count
	# Revisions can change every tick while a shutter animates. Since this gate
	# is off the active route, the actor keeps its clear path and respects the
	# bounded replan interval.
	for tick in 18:
		gate.position.x = 0.4 if tick % 2 == 0 else -0.4
		await get_tree().physics_frame
	_check(gate_planner.plan_count - plans_before_gate_move <= 2,
		"repeated moving-collider revisions stay throttled off the active route")
	gate.position = Vector3(0, 0, 0)
	# The revision is observed immediately, but replanning stays on the chase
	# throttle until the resolver actually rejects a step at the gate.
	for _tick in 24:
		await get_tree().physics_frame
	_check(gate_planner.plan_count > plans_before_gate_move,
		"moving gate invalidates an active orderly route")
	var plans_after_gate_reroute := gate_planner.plan_count
	var gate_arrived := false
	var gate_clipped := false
	for _tick in 180:
		await get_tree().physics_frame
		var p: Vector3 = gate_orderly.global_position
		if moving_col.is_blocked_at(p.x, p.z, Tuning.ORDERLY_RADIUS, StateManager.State.UNMED):
			gate_clipped = true
		if Vector2(p.x - 3.0, p.z).length() < Tuning.ORDERLY_CATCH_RADIUS + 0.05:
			gate_arrived = true
			break
	_check(gate_arrived, "orderly reaches target after a gate closes on its route")
	_check(not gate_clipped, "orderly does not clip a gate that moves onto its route")
	_check(gate_planner.plan_count - plans_after_gate_reroute <= 4,
		"repeated live collider ticks do not force per-frame route planning")
	gate_orderly.queue_free()
	gate_player.queue_free()
	root.queue_free()


func _test_real_room_routes() -> void:
	for scene_path in ["res://rooms/room12/room12.tscn", "res://rooms/room15/room15.tscn", "res://rooms/room17/room17.tscn"]:
		var room := (load(scene_path) as PackedScene).instantiate()
		add_child(room)
		var col := WardCollision.new()
		col.rebuild_from(room)
		var planner := OrderlyPlanner.new(col)
		if scene_path.contains("room17"):
			var levels := WardLevels.new()
			levels.rebuild_from(room)
			planner.set_context(col, "ground", Tuning.ORDERLY_RADIUS, StateManager.State.UNMED, levels)
		var start := Vector2(3.0, 17.5) if scene_path.contains("room12") else (Vector2(5.0, 25.0) if scene_path.contains("room17") else Vector2(0.0, -14.0))
		var target := Vector2(-7.5, 17.5) if scene_path.contains("room12") else (Vector2(-5.0, 18.0) if scene_path.contains("room17") else Vector2(0.0, -25.0))
		var began := Time.get_ticks_usec()
		var route := _timed_plan(planner, start, target)
		var elapsed_ms := float(Time.get_ticks_usec() - began) / 1000.0
		_check(not route.is_empty(), "%s real-room route is feasible" % scene_path)
		_check(elapsed_ms < 100.0, "%s route plan stays bounded (<100ms)" % scene_path)
		var at := start
		for point: Vector2 in route:
			_check(planner.line_clear(at, point), "%s real-room route leg is clear" % scene_path)
			at = point
		var detour_candidates: Array[Vector2] = []
		if scene_path.contains("room12"):
			detour_candidates = [Vector2(3, 17.5), Vector2(-7.5, 17.5), Vector2(3, 22.5), Vector2(-7, 22.5), Vector2(0, 11), Vector2(0, 1), Vector2(0, 33)]
		elif scene_path.contains("room15"):
			detour_candidates = [Vector2(-6, -10), Vector2(7.2, -10), Vector2(7.2, -6.5), Vector2(-6, -6.5), Vector2(1.5, -18), Vector2(-7.6, -18), Vector2(-7.6, -14.4), Vector2(1.5, -14.4), Vector2(7.5, 0.5), Vector2(-7.5, 0.5), Vector2(-7.5, -6), Vector2(7.5, -6), Vector2(-7.5, -10.5), Vector2(-7.5, -14), Vector2(7.5, -14), Vector2(7.5, -10.5), Vector2(7.5, -25.5), Vector2(7.5, -18.5), Vector2(-7.5, -18.5), Vector2(-7.5, -25.5), Vector2(-6, -24), Vector2(0, -24), Vector2(6, -24), Vector2(-6, -12), Vector2(0, -12), Vector2(6, -12), Vector2(-6, -4), Vector2(0, -4), Vector2(6, -4)]
		else:
			detour_candidates = [Vector2(5, 25), Vector2(-5, 18), Vector2(5, 18), Vector2(-5, 25), Vector2(0, 12), Vector2(7, 15), Vector2(0, -6)]
		var found_detour := false
		var detour_start := Vector2.ZERO
		var detour_target := Vector2.ZERO
		# Probe the two sides of each real room box. This finds a feasible
		# blocked line even when authored patrol waypoints intentionally avoid
		# every wall; the test then verifies the planner can route around it.
		for box: WardCollision.Box in col.boxes:
			var pad := Tuning.ORDERLY_RADIUS + 0.2
			detour_candidates.append(Vector2(box.min_x - pad, (box.min_z + box.max_z) * 0.5))
			detour_candidates.append(Vector2(box.max_x + pad, (box.min_z + box.max_z) * 0.5))
		for candidate_start in detour_candidates:
			for candidate_target in detour_candidates:
				if candidate_start == candidate_target or planner.line_clear(candidate_start, candidate_target):
					continue
				var detour := _timed_plan(planner, candidate_start, candidate_target)
				if not detour.is_empty():
					found_detour = true
					detour_start = candidate_start
					detour_target = candidate_target
					break
			if found_detour:
				break
		_check(found_detour, "%s has an actual cover detour" % scene_path)
		room.queue_free()


func _test_real_actor_route() -> void:
	var room := (load("res://rooms/room12/room12.tscn") as PackedScene).instantiate()
	add_child(room)
	var col := WardCollision.new()
	col.rebuild_from(room)
	var planner := OrderlyPlanner.new(col)
	var start := Vector2(3.0, 17.5)
	var target := Vector2(-7.5, 17.5)
	var found_detour := not planner.line_clear(start, target)
	# The authored points above are stable for the room; if a future layout
	# makes that line direct, derive a real blocked/feasible pair from its boxes.
	if not found_detour:
		for box: WardCollision.Box in col.boxes:
			var pad := Tuning.ORDERLY_RADIUS + 0.2
			var candidate_start := Vector2(box.min_x - pad, (box.min_z + box.max_z) * 0.5)
			var candidate_target := Vector2(box.max_x + pad, (box.min_z + box.max_z) * 0.5)
			if not planner.line_clear(candidate_start, candidate_target):
				var candidate_route := _timed_plan(planner, candidate_start, candidate_target)
				if not candidate_route.is_empty():
					start = candidate_start
					target = candidate_target
					found_detour = true
					break
	_check(found_detour, "room12 has a real blocked/feasible actor detour")
	if found_detour:
		var player := preload("res://tools/test_stub_player.gd").new()
		add_child(player)
		player.global_position = Vector3(target.x, 0, target.y)
		var orderly: Node = preload("res://orderly/orderly.tscn").instantiate()
		orderly.set("waypoints", [Vector3(start.x, 0, start.y)])
		add_child(orderly)
		orderly.global_position = Vector3(start.x, 0, start.y)
		orderly.setup(player, col)
		orderly.set("mode", 1) # Orderly.Mode.CHASE
		var arrived := false
		var clipped := false
		for _tick in 360:
			await get_tree().physics_frame
			var p: Vector3 = orderly.global_position
			if col.is_blocked_at(p.x, p.z, Tuning.ORDERLY_RADIUS, StateManager.State.UNMED):
				clipped = true
			if Vector2(p.x - target.x, p.z - target.y).length() < Tuning.ORDERLY_CATCH_RADIUS + 0.05:
				arrived = true
				break
		_check(arrived, "actual orderly reaches a real-room detour target")
		_check(not clipped, "actual orderly never clips a real-room collider")
		orderly.queue_free()
		player.queue_free()
	room.queue_free()


func _test_noise_lifecycle() -> void:
	var player := preload("res://tools/test_stub_player.gd").new()
	add_child(player)
	var orderly: Node = preload("res://orderly/orderly.tscn").instantiate()
	orderly.set("waypoints", [Vector3(0, 0, 0)])
	add_child(orderly)
	var col := _collision([])
	orderly.setup(player, col)
	await get_tree().process_frame
	_check(orderly.hear_noise(Vector3(2, 0, 0), "__flat", "crate_push"),
		"nearby authored noise starts investigation")
	_check(not orderly.hear_noise(Vector3(2, 0, 0), "__flat", "spam"),
		"noise cooldown rejects spam")
	_check(orderly.is_investigating(), "accepted noise enters investigation mode")
	StateManager.force_state(StateManager.State.LUCID, "test")
	_check(not orderly.is_investigating(), "lucid medication aborts investigation")
	await get_tree().create_timer(2.7).timeout
	_check(orderly.hear_noise(Vector3(0, 0, 0), "__flat", "lucid_fuse"),
		"new authored noise can start while lucid")
	await get_tree().create_timer(1.4).timeout
	_check(not orderly.is_investigating(), "investigation search times out")
	_check(orderly.get("mode") == 2, "completed investigation resumes returning route")
	orderly.set("mode", 1) # Orderly.Mode.CHASE
	_check(not orderly.hear_noise(Vector3(2, 0, 0), "__flat", "chase_spam"),
		"active chase cannot be overridden by noise")
	orderly.set("mode", 0) # Orderly.Mode.PATROL
	StateManager.force_state(StateManager.State.UNMED, "test")
	player.level = "balcony"
	orderly.set("mode", 1) # Orderly.Mode.CHASE
	await get_tree().create_timer(0.1).timeout
	_check(not orderly.is_chasing(), "cross-level player cannot keep an orderly chase")
	player.level = "__flat"
	StateManager.force_state(StateManager.State.UNMED, "test")
	orderly.queue_free()
	player.queue_free()
