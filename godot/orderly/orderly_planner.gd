# Bounded, room-local route planning for an orderly.
#
# The ward deliberately has no baked NavigationRegion3D. This planner is the
# small replacement for NavigationAgent3D's empty-path fallback: it builds a
# sparse visibility graph around the live, axis-aligned room boxes. A route is
# therefore made of straight, collision-free legs and can go around corners
# and U-shaped cover without teleporting or scraping forever against a wall.
class_name OrderlyPlanner
extends RefCounted

const MAX_GRAPH_NODES := 128
const CLEARANCE_EPSILON := 0.06
const MIN_SEGMENT := 0.0001

var collision: WardCollision = null
var level := WardLevels.FLAT_LEVEL_ID
var state := StateManager.State.UNMED
var radius := Tuning.ORDERLY_RADIUS
var world_levels: WardLevels = null
var last_reason := ""
var last_revision := -1
## Public for focused actor tests and cheap runtime diagnostics.
var plan_count := 0
var _active_boxes: Array[WardCollision.Box] = []


func _init(p_collision: WardCollision = null, p_level := WardLevels.FLAT_LEVEL_ID,
		p_radius := Tuning.ORDERLY_RADIUS, p_state := StateManager.State.UNMED) -> void:
	collision = p_collision
	level = p_level
	radius = p_radius
	state = p_state


func set_context(p_collision: WardCollision, p_level: String,
		p_radius := Tuning.ORDERLY_RADIUS, p_state := StateManager.State.UNMED,
		p_levels: WardLevels = null) -> void:
	collision = p_collision
	level = p_level
	radius = p_radius
	state = p_state
	world_levels = p_levels


## Returns a list of XZ points including the destination, or an empty array
## when either endpoint is invalid or no bounded route exists. The start is
## omitted because the caller already owns the moving body.
func plan(start: Vector2, target: Vector2, allow_goal_adjustment := true) -> Array[Vector2]:
	plan_count += 1
	last_reason = ""
	if collision == null:
		last_reason = "no_collision"
		return []
	collision.sync_live()
	last_revision = collision.revision
	_snapshot_active_boxes()
	if not _walkable(start):
		last_reason = "blocked_start"
		return []
	if not _walkable(target):
		# A player can stand 0.35m from a wall while an orderly's 0.4m radius
		# cannot occupy that same centre. Chase/noise should approach the nearest
		# legal point within catch/hearing range instead of freezing at a stale
		# blocked target. Never adjust a point outside its level footprint.
		if allow_goal_adjustment and _inside_footprint(target):
			for candidate: Vector2 in _goal_candidates(target):
				var adjusted := plan(start, candidate, false)
				if not adjusted.is_empty() and target.distance_to(adjusted[-1]) <= Tuning.ORDERLY_CATCH_RADIUS:
					return adjusted
			last_reason = "unreachable"
			return []
		last_reason = "blocked_target"
		return []
	if _line_clear(start, target):
		return [target]

	var nodes: Array[Vector2] = [start, target]
	# If a very prop-heavy room exceeds the node bound, prefer boxes nearest
	# the requested corridor. This keeps a far-away decorative wall from
	# displacing a corner that is actually needed to get around cover.
	var ordered_boxes: Array[Dictionary] = []
	var order := 0
	for b in _active_boxes:
		var entry := {"box": b, "score": _box_route_score(b, start, target), "order": order}
		var insert_at := ordered_boxes.size()
		for i in ordered_boxes.size():
			if entry["score"] < ordered_boxes[i]["score"]:
				insert_at = i
				break
		ordered_boxes.insert(insert_at, entry)
		order += 1
	var added_boxes := 0
	for entry: Dictionary in ordered_boxes:
		var b: WardCollision.Box = entry["box"]
		if added_boxes * 4 + 2 >= MAX_GRAPH_NODES:
			break
		var pad := radius + CLEARANCE_EPSILON
		var corners := [
			Vector2(b.min_x - pad, b.min_z - pad),
			Vector2(b.max_x + pad, b.min_z - pad),
			Vector2(b.max_x + pad, b.max_z + pad),
			Vector2(b.min_x - pad, b.max_z + pad),
		]
		for point: Vector2 in corners:
			if _walkable(point) and not _contains_node(nodes, point):
				nodes.append(point)
		added_boxes += 1

	if nodes.size() < 2:
		last_reason = "unreachable"
		return []

	# A* keeps the same deterministic bounded graph while avoiding scans of
	# obviously distant corners. Euclidean distance is admissible because each
	# edge is a straight line, so it cannot change the shortest route.
	var g_cost := PackedFloat32Array()
	g_cost.resize(nodes.size())
	for i in nodes.size():
		g_cost[i] = INF
	g_cost[0] = 0.0
	var f_cost := PackedFloat32Array()
	f_cost.resize(nodes.size())
	for i in nodes.size():
		f_cost[i] = INF
	f_cost[0] = nodes[0].distance_to(nodes[1])
	var previous: Array[int] = []
	previous.resize(nodes.size())
	for i in previous.size():
		previous[i] = -1
	var used := PackedByteArray()
	used.resize(nodes.size())

	for _iteration in nodes.size():
		var current := -1
		var best := INF
		for i in nodes.size():
			if used[i] or f_cost[i] >= best:
				continue
			current = i
			best = f_cost[i]
		if current < 0:
			break
		used[current] = 1
		if current == 1:
			break
		for neighbour in nodes.size():
			if used[neighbour] or neighbour == current:
				continue
			if not _line_clear(nodes[current], nodes[neighbour]):
				continue
			var candidate := g_cost[current] + nodes[current].distance_to(nodes[neighbour])
			if candidate < g_cost[neighbour]:
				g_cost[neighbour] = candidate
				f_cost[neighbour] = candidate + nodes[neighbour].distance_to(nodes[1])
				previous[neighbour] = current

	if previous[1] < 0:
		last_reason = "unreachable"
		return []

	var reversed: Array[Vector2] = []
	var at := 1
	while at >= 0:
		reversed.append(nodes[at])
		at = previous[at]
	reversed.reverse()
	reversed.pop_front() # caller is already at nodes[0]
	return reversed


func line_clear(start: Vector2, target: Vector2) -> bool:
	if collision == null:
		return false
	collision.sync_live()
	_snapshot_active_boxes()
	return _walkable(start) and _walkable(target) and _line_clear(start, target)


func _walkable(point: Vector2) -> bool:
	for b in _active_boxes:
		if point.x > b.min_x - radius and point.x < b.max_x + radius \
				and point.y > b.min_z - radius and point.y < b.max_z + radius:
			return false
	if world_levels == null:
		return true
	return _inside_footprint(point)


func _inside_footprint(point: Vector2) -> bool:
	var rect := collision.room_footprint if collision != null else Vector4(-INF, INF, -INF, INF)
	if world_levels != null:
		if not world_levels.has_level(level):
			return false
		for candidate: WardLevels.Level in world_levels.levels:
			if candidate.id == level:
				# Explicit level footprints are authoritative. Flat synthetic
				# levels keep the room mesh footprint when their rect is unbounded.
				if is_finite(candidate.floor_rect.x) or is_finite(candidate.floor_rect.y) \
						or is_finite(candidate.floor_rect.z) or is_finite(candidate.floor_rect.w):
					rect = candidate.floor_rect
				break
	if is_finite(rect.x) and point.x <= rect.x:
		return false
	if is_finite(rect.y) and point.x >= rect.y:
		return false
	if is_finite(rect.z) and point.y <= rect.z:
		return false
	if is_finite(rect.w) and point.y >= rect.w:
		return false
	return true


func _goal_candidates(target: Vector2) -> Array[Vector2]:
	var candidates: Array[Vector2] = []
	var max_radius := Tuning.ORDERLY_CATCH_RADIUS - 0.02
	# The outer ring is enough to find a legal standing point and keeps a
	# wall-adjacent chase bounded: each candidate may itself require a graph
	# search around room geometry. The catch radius supplies the intended
	# maximum distance, so testing inner rings adds cost without gameplay value.
	for i in 16:
		var angle := TAU * float(i) / 16.0
		var candidate: Vector2 = target + Vector2(cos(angle), sin(angle)) * max_radius
		if _walkable(candidate):
			candidates.append(candidate)
	return candidates


func _line_clear(start: Vector2, target: Vector2) -> bool:
	for b in _active_boxes:
		var pad := radius
		if _segment_hits_rect(start, target, b.min_x - pad, b.max_x + pad,
				b.min_z - pad, b.max_z + pad):
			return false
	return true


func _snapshot_active_boxes() -> void:
	_active_boxes.clear()
	if collision == null:
		return
	for b in collision.boxes:
		if b.active_in(state) and b.active_on_level(level):
			_active_boxes.append(b)


## Strict slab intersection. A segment that only touches an inflated edge is
## clear, matching WardCollision's strict overlap convention; graph corners
## themselves carry a small epsilon so a route never relies on that edge case.
func _segment_hits_rect(a: Vector2, b: Vector2, min_x: float, max_x: float,
		min_z: float, max_z: float) -> bool:
	var dx := b.x - a.x
	var dz := b.y - a.y
	var lo := 0.0
	var hi := 1.0
	for pair in [[a.x, dx, min_x, max_x], [a.y, dz, min_z, max_z]]:
		var origin: float = pair[0]
		var direction: float = pair[1]
		var lower: float = pair[2]
		var upper: float = pair[3]
		if absf(direction) < MIN_SEGMENT:
			if origin > lower and origin < upper:
				continue
			return false
		var t0 := (lower - origin) / direction
		var t1 := (upper - origin) / direction
		if t0 > t1:
			var swap := t0
			t0 = t1
			t1 = swap
		lo = maxf(lo, t0)
		hi = minf(hi, t1)
		if lo >= hi:
			return false
	return lo < hi and hi > 0.0 and lo < 1.0


func _contains_node(nodes: Array[Vector2], point: Vector2) -> bool:
	for existing: Vector2 in nodes:
		if existing.distance_squared_to(point) < 0.000001:
			return true
	return false


func _box_route_score(box: WardCollision.Box, start: Vector2, target: Vector2) -> float:
	var center := Vector2((box.min_x + box.max_x) * 0.5, (box.min_z + box.max_z) * 0.5)
	var half_diagonal := Vector2(box.max_x - box.min_x, box.max_z - box.min_z).length() * 0.5
	return maxf(0.0, _point_segment_distance(center, start, target) - half_diagonal)


func _point_segment_distance(point: Vector2, start: Vector2, target: Vector2) -> float:
	var delta := target - start
	var length_squared := delta.length_squared()
	if length_squared < MIN_SEGMENT:
		return point.distance_to(start)
	var t := clampf((point - start).dot(delta) / length_squared, 0.0, 1.0)
	return point.distance_to(start + delta * t)
