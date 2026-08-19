# Behavioural tests for ROOM 15 — the Sorting Room, and for the shape-key /
# shape-lock mechanism it is the only consumer of.
#
#   godot --headless --path godot tools/test_room15.tscn
#
# The mechanic's four load-bearing claims are all things a screenshot cannot
# show and a code read cannot prove, so they are asserted against the real
# scene and the real collision cache:
#
#   1. A KEY DOES NOT EXIST WHILE LUCID. Not "is hidden" — the interaction ray
#      refuses it, via the same StateObject/is_focusable path every unmed-only
#      fixture already uses. Asserted in both ward states, flipped live.
#   2. COLLECTING ONE LIGHTS ITS PANEL CELL, and only its own cell, in the
#      authored reading order regardless of collection order.
#   3. THE LOCK REFUSES BELOW THE FULL COUNT AND OPENS AT IT — asserted
#      against WardCollision (is the doorway walkable?), not against a toast,
#      because StateObject does not flip collision layers and a screenshot of
#      an open door proves nothing.
#   4. A CATCH NEVER UN-COLLECTS A KEY. The design's one hard invariant.
#
# Plus the authoring invariants this room's audits assume: keys and the lock
# carry NO collider at all (only the door slab does), all five patrol routes
# clear his body radius end to end, each escalation orderly spawns far from
# every key at once, and the population really does grow 2 -> 3 -> 4 -> 5 as
# keys land, in any order.
#
# NOT PROVEN HERE, and stated rather than implied: the room's pill economy.
# Room 15 has no dispensers and assumes a topped-off arrival from room 14, so
# whether the one carried pill lands at a useful moment is a playtest question.
# What follows from the assertions below is only that the room is COMPLETABLE
# on zero pills — every key is an unmed-only pickup and the lock is
# unmed-operable, so no action in the room requires medicine.
extends Node

const ROOM := preload("res://rooms/room15/room15.tscn")
const STUB_PLAYER := preload("res://tools/test_stub_player.gd")

# Where each key prop stands, and the shape its panel cell shows.
const KEYS := [
	{"id": "shapeKeyA", "shape": "circle", "pos": Vector2(-10.5, -0.3)},
	{"id": "shapeKeyB", "shape": "square", "pos": Vector2(10.5, -12.3)},
	{"id": "shapeKeyC", "shape": "triangle", "pos": Vector2(-10.5, -20.3)},
]

# Dead centre of the exit doorway.
const DOOR_X := 0.0
const DOOR_Z := -27.0

# check_rooms.gd's rule, repeated because this room is not in ROOM_SCENES yet
# and that validator only walks the registry.
const PATROL_MARGIN := 0.1

var failures: Array[String] = []
var passes := 0


# The narrow slice of main.gd a room script may touch. Records what the room
# asked for instead of doing it to a real HUD, and does the two things the
# mechanic's assertions actually depend on for real: freeing a collected prop
# and dropping the door's collider.
class StubMain:
	extends Node
	var player: Node3D = null
	var collision: WardCollision = null
	var room: Node3D = null
	var toasts: Array = []
	var objectives: Array = []
	var teleports: Array = []
	var threat := -1.0

	func hud_toast(text: String) -> void:
		toasts.append(text)

	func hud_objective(text: String) -> void:
		objectives.append(text)

	func set_threat(level: float, _bearing: Variant) -> void:
		threat = level

	func shift_fx() -> void:
		pass

	func teleport_player(x: float, z: float, _to_level := "") -> void:
		teleports.append(Vector2(x, z))
		if player != null:
			player.global_position = Vector3(x, 0.0, z)

	func move_interactable(id: String, pos: Vector3, rot_y := 0.0) -> void:
		var node := find_interactable(id)
		if node != null:
			node.global_position = pos
			node.rotation.y = rot_y

	func remove_interactable(id: String) -> void:
		var node := find_interactable(id)
		if node != null:
			node.queue_free()

	func unlock_door(node_name: String) -> void:
		var body := room.find_child(node_name, true, false)
		if body is CollisionObject3D:
			(body as CollisionObject3D).collision_layer = 0
		rebuild_collision()

	func rebuild_collision() -> void:
		if collision != null and room != null:
			collision.rebuild_from(room)

	func find_interactable(id: String) -> Interactable:
		return _find(room, id)

	func _find(node: Node, id: String) -> Interactable:
		if node is Interactable and (node as Interactable).interactable_id == id:
			return node as Interactable
		for child in node.get_children():
			var found := _find(child, id)
			if found != null:
				return found
		return null


func _ready() -> void:
	Telemetry.disabled = true
	StateManager.force_state(StateManager.State.UNMED, "test")

	_test_authoring_invariants()
	_test_keys_have_no_collider()
	_test_patrol_clearance()
	_test_spawn_fairness()
	_test_keys_only_exist_while_raw()
	_test_pickup_lights_its_own_cell()
	_test_three_shapes_are_three_shapes()
	_test_lock_refuses_then_opens()
	_test_lock_works_raw()
	_test_catch_never_uncollects()
	_test_escalation_two_to_five()
	_finish()


func _check(cond: bool, what: String) -> void:
	if cond:
		passes += 1
	else:
		failures.append(what)


# --- fixtures ---------------------------------------------------------------

## A live room behind a stub main. `frozen` stops the room's and the orderlies'
## own _physics_process, so nothing walks while the test drives the mechanic by
## hand and no orderly wanders into a catch mid-assertion.
func _make_room(frozen := true) -> Dictionary:
	var room: Node3D = ROOM.instantiate()
	add_child(room)

	var col := WardCollision.new()
	col.rebuild_from(room)

	var player: Node3D = Node3D.new()
	player.set_script(STUB_PLAYER)
	add_child(player)
	player.global_position = Vector3(0, 0, 5)

	var main := StubMain.new()
	main.player = player
	main.collision = col
	main.room = room
	add_child(main)

	room.on_enter(main)
	if frozen:
		room.set_physics_process(false)
		for o in room._orderlies:
			o.set_physics_process(false)
	return {"room": room, "main": main, "col": col, "player": player}


func _teardown(ctx: Dictionary) -> void:
	var room: Node3D = ctx["room"]
	room.on_leave()
	remove_child(room)
	# free(), not queue_free(): this suite quits from _ready, so a deferred
	# free would never be processed and every room would leak at exit.
	room.free()
	var main: Node = ctx["main"]
	remove_child(main)
	main.free()
	var player: Node = ctx["player"]
	remove_child(player)
	player.free()
	StateManager.force_state(StateManager.State.UNMED, "test")


func _panel(room: Node3D) -> IconPanel:
	return room.get_node_or_null("IconPanels/doorIcons15") as IconPanel


func _key_node(main: StubMain, id: String) -> Interactable:
	return main.find_interactable(id)


# --- 0. authoring -----------------------------------------------------------

func _test_authoring_invariants() -> void:
	var ctx := _make_room()
	var room: Node3D = ctx["room"]
	var main: StubMain = ctx["main"]

	# The exit goes to the real next room, not to END and not to itself.
	var exits: Node = room.get_node_or_null("Exits")
	var to := ""
	if exits != null:
		for child in exits.get_children():
			if child is RoomExit:
				to = (child as RoomExit).exit_to
				break
	# Room 16 is not ported yet, so room15 is currently the chain terminator and
	# exits to "END" — check_rooms.gd fails on an exit to an unregistered room.
	# Keyed off the registry rather than hard-coded, so this tightens by itself
	# the moment room16 lands instead of needing to be remembered. Same pattern
	# as test_room14.
	var room16_exists: bool = load("res://main.gd").ROOM_SCENES.has("room16")
	var want_exit := "room16" if room16_exists else "END"
	_check(to == want_exit,
		"exit must target %s (room16 registered: %s), got '%s'" % [want_exit, room16_exists, to])

	# No dispenser anywhere: the whole room is played raw and change #1 of the
	# rework is that there is nothing to dose with.
	var dispensers := 0
	for node in room._interactables():
		if node.interactable_type == "dispenser":
			dispensers += 1
	_check(dispensers == 0, "room 15 must contain no dispensers, found %d" % dispensers)

	# Three keys, one lock, one door slab.
	for k in KEYS:
		var node := _key_node(main, k["id"])
		_check(node != null and node.interactable_type == "shape_key",
			"%s must exist and be a shape_key" % k["id"])
	_check(main.find_interactable("shape_lock15") != null, "the shape lock must exist")
	_check(main.find_interactable("exitdoor") != null, "the exit door slab must exist")

	# The panel: three cells, all dark, mounted 3cm proud of the wall face at
	# z=-26.88 so it neither z-fights the wall nor floats in the room, and NOT
	# inside a StateObject (it reads in both ward states).
	var panel := _panel(room)
	_check(panel != null, "the icon panel must exist")
	if panel != null:
		_check(panel.shapes.size() == 3, "the panel must show three shapes")
		_check(panel.lit_state() == [false, false, false],
			"every panel cell must start dark")
		_check(absf(panel.global_position.z - (-26.85)) < 0.001,
			"panel z must be -26.85 (wall face -26.88 + 3cm), got %.3f"
			% panel.global_position.z)
		_check(not (panel.get_parent() is StateObject),
			"the panel must not be state-filtered — it reads in both states")
		var quad := panel.get_node_or_null("Quad") as MeshInstance3D
		_check(quad != null and (quad.mesh as QuadMesh).size.is_equal_approx(Vector2(2.4, 0.8)),
			"the panel quad must be exactly 2.4m x 0.8m — an authored measurement, "
			+ "unlike a scrawl's size")

	# The door is scenery: the lock opens it, never a hand on the slab.
	_check(not room._lock.is_available("exitdoor"),
		"the door slab must never be directly interactable")
	_check(room._lock.is_available("shape_lock15"), "the lock must start available")

	# Change #2 of the rework: the lock is operable raw.
	_check(room._lock.allow_unmed, "room 15's lock must be unmed-operable")

	_teardown(ctx)


# --- 1. no colliders --------------------------------------------------------

# A key is a RAYCAST TARGET AND NOTHING ELSE, and so is the lock. Only the door
# slab blocks. Asserted two ways: nothing in the collision cache covers where
# they stand, and the floor a hypothetical key collider would have blocked is
# still walkable — which is the query the movement solver actually makes.
func _test_keys_have_no_collider() -> void:
	var ctx := _make_room()
	var main: StubMain = ctx["main"]
	var col: WardCollision = ctx["col"]

	for k in KEYS:
		var p: Vector2 = k["pos"]
		_check(not _cache_covers(col, p.x, p.y),
			"%s sits inside a collider box — a shape key must have none" % k["id"])
		var node := _key_node(main, k["id"])
		if node != null:
			_check(node.collision_layer == WardCollision.LAYER_INTERACTABLE,
				"%s must be on the interactable layer only" % k["id"])
			_check(node.collision_mask == 0, "%s must not collide with anything" % k["id"])
	_check(not _cache_covers(col, 1.35, -26.81),
		"the shape lock sits inside a collider box — it is a wall fixture, not a wall")

	# Key A's alcove: the nearest standable floor to the prop. A 0.5m key
	# collider would have swallowed this point; it is walkable in both states.
	for state in [StateManager.State.UNMED, StateManager.State.LUCID]:
		_check(not col.is_blocked_at(-10.0, -0.6, Tuning.PLAYER_RADIUS, state),
			"the floor beside key A must stay walkable (state %d)" % state)

	# ... while the doorway, which DOES have a collider, is blocked.
	_check(col.is_blocked_at(DOOR_X, DOOR_Z, Tuning.PLAYER_RADIUS, StateManager.State.UNMED),
		"the exit doorway must be blocked before the lock opens")

	_teardown(ctx)


func _cache_covers(col: WardCollision, x: float, z: float) -> bool:
	for b in col.boxes:
		if x >= b.min_x and x <= b.max_x and z >= b.min_z and z <= b.max_z:
			return true
	return false


# --- 2. patrol clearance ----------------------------------------------------

# The port of check_rooms.gd's _check_patrol, run here because room 15 is not
# registered in ROOM_SCENES and that validator only walks the registry. Five
# routes, waypoints AND legs: a leg can clip a corner with both endpoints
# clear, and a wedged orderly is a room that quietly stops working.
func _test_patrol_clearance() -> void:
	var ctx := _make_room()
	var room: Node3D = ctx["room"]
	var col: WardCollision = ctx["col"]
	var need := Tuning.ORDERLY_RADIUS + PATROL_MARGIN

	var routes := 0
	var consts := (room.get_script() as GDScript).get_script_constant_map()
	for key: String in consts:
		if not key.begins_with("WAYPOINTS"):
			continue
		var pts: Array = consts[key]
		if pts.is_empty():
			continue
		routes += 1
		# One assertion per ROUTE, carrying the worst clearance found on it —
		# a per-box assertion would bury a real failure under a thousand
		# passes and make the suite's count meaningless.
		var worst := INF
		var worst_at := ""
		for i in pts.size():
			var a: Vector3 = pts[i]
			var c: Vector3 = pts[(i + 1) % pts.size()]
			for b in col.boxes:
				if b.state_filter != -1:
					continue
				var dw := _point_box_dist(a.x, a.z, b)
				if dw < worst:
					worst = dw
					worst_at = "waypoint %d (%.2f, %.2f)" % [i, a.x, a.z]
				var dl := _seg_box_dist(a.x, a.z, c.x, c.z, b)
				if dl < worst:
					worst = dl
					worst_at = "leg %d->%d" % [i, (i + 1) % pts.size()]
		_check(worst >= need,
			"%s: %s clears the nearest collider by only %.2fm — needs %.2fm "
			% [key, worst_at, worst, need]
			+ "(body %.2f + margin). An embedded waypoint freezes him outright and a "
			% Tuning.ORDERLY_RADIUS + "clipped leg wedges him mid-walk.")
	_check(routes == 5, "room 15 must declare five patrol routes, found %d" % routes)
	_teardown(ctx)


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


# Liang-Barsky segment-vs-AABB, so a leg that passes THROUGH a box reports 0
# rather than the distance to its corners. check_rooms.gd's copy, verbatim.
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


# --- 3. spawn fairness ------------------------------------------------------

# Pickup order is the player's choice, so an escalation orderly's spawn point
# (his waypoints[0] — Orderly._ready plants him there) has to be far from ALL
# THREE keys at once, not just from the one that triggered him. Anything inside
# his 6m sight range would render him in on top of the player.
func _test_spawn_fairness() -> void:
	var ctx := _make_room()
	var room: Node3D = ctx["room"]

	for cfg in room.ESCALATIONS:
		var spawn: Vector3 = cfg["waypoints"][0]
		var nearest := INF
		for k in KEYS:
			var p: Vector2 = k["pos"]
			nearest = minf(nearest, Vector2(spawn.x - p.x, spawn.z - p.y).length())
		_check(nearest > Tuning.ORDERLY_SIGHT_RANGE * 1.5,
			"an escalation orderly spawns %.1fm from the nearest key — inside "
			% nearest + "1.5x his %.0fm sight range" % Tuning.ORDERLY_SIGHT_RANGE)
	_teardown(ctx)


# --- 4. keys exist only while raw ------------------------------------------

# THE WHOLE VISIBILITY DESIGN, and the one thing that would be silently broken
# by a well-meant "fix": every key is authored states='unmed', so it lives
# inside a StateObject and Interactable.is_focusable() refuses it while lucid.
# This is the same mechanism room 10's unmed-only gate panels use, applied to a
# pickup — there is no bespoke visibility code to test, and that is the point.
func _test_keys_only_exist_while_raw() -> void:
	var ctx := _make_room()
	var main: StubMain = ctx["main"]

	# on_enter forces raw, so this is the state the player always arrives in.
	_check(StateManager.state == StateManager.State.UNMED,
		"on_enter must force the player raw — there is no medicine in this room")

	for k in KEYS:
		var node := _key_node(main, k["id"])
		_check(node != null and node.is_focusable(),
			"%s must be interactable while raw" % k["id"])
		_check(node.get_parent() is StateObject,
			"%s must sit inside a StateObject wrapper" % k["id"])

	StateManager.force_state(StateManager.State.LUCID, "test")
	for k in KEYS:
		var node := _key_node(main, k["id"])
		var wrapper := node.get_parent() as StateObject
		_check(not node.is_focusable(),
			"%s must NOT be focusable while lucid — the ray has to skip it" % k["id"])
		_check(not wrapper.is_present() and not wrapper.visible,
			"%s must not be rendered while lucid" % k["id"])

	StateManager.force_state(StateManager.State.UNMED, "test")
	for k in KEYS:
		_check(_key_node(main, k["id"]).is_focusable(),
			"%s must come back when the player goes raw again" % k["id"])

	_teardown(ctx)


# --- 5. the panel -----------------------------------------------------------

func _test_pickup_lights_its_own_cell() -> void:
	var ctx := _make_room()
	var room: Node3D = ctx["room"]
	var main: StubMain = ctx["main"]
	var panel := _panel(room)

	# Deliberately NOT in authored order: collection order is free, and the
	# panel must still light the middle cell for the square.
	# The panel is a baked texture, rewritten in place on each pickup — the
	# same trick update_scrawl_text uses on a Label3D. Assert the PIXELS
	# changed, not just the flags: a set_lit that forgot to rebake would still
	# report the right lit_state and show nothing.
	var before_pixels := panel.baked_image().get_data()

	_check(room.on_interact("shapeKeyB"), "taking key B must be handled")
	_check(panel.baked_image().get_data() != before_pixels,
		"the panel texture must actually be rebaked, not just flagged")
	_check(panel.lit_state() == [false, true, false],
		"key B must light cell 2 only, got %s" % str(panel.lit_state()))
	_check(main.toasts.has("a square. he didn't turn around."),
		"the pickup toast must fire")
	_check(room._lock.held_count() == 1, "one shape held")

	# The prop is gone, and stops resolving for the interaction ray.
	var node := _key_node(main, "shapeKeyB")
	_check(node == null or node.is_queued_for_deletion(),
		"a collected key's prop must be removed")
	_check(not room._lock.is_available("shapeKeyB"),
		"a collected key must stop resolving")

	# Re-interacting with a taken key changes nothing.
	room.on_interact("shapeKeyB")
	_check(room._lock.held_count() == 1, "a second interact must not double-count")
	_check(panel.lit_state() == [false, true, false], "the panel must not change")

	_check(room.on_interact("shapeKeyA"), "taking key A must be handled")
	_check(panel.lit_state() == [true, true, false],
		"key A must light cell 1, got %s" % str(panel.lit_state()))
	_check(room.on_interact("shapeKeyC"), "taking key C must be handled")
	_check(panel.lit_state() == [true, true, true], "all three cells must be lit")

	_teardown(ctx)


# THE SHAPES MUST BE THREE DIFFERENT SHAPES, in the props AND in the panel.
#
# This exists because of a real regression caught by screenshot: the original
# builds its triangle as a 3-sided CylinderGeometry, and the direct
# transliteration (CylinderMesh, radial_segments = 3) renders a SQUARE, because
# Godot silently clamps radial_segments to 4. The triangle key and the square
# key became the same object, which defeats the entire point of shape being the
# colour-blind-safe redundant cue.
func _test_three_shapes_are_three_shapes() -> void:
	var ctx := _make_room()
	var main: StubMain = ctx["main"]

	var expected := {"circle": "CylinderMesh", "square": "BoxMesh", "triangle": "PrismMesh"}
	for shape: String in expected:
		var mesh := ShapeGlyphs.glyph_mesh(shape, 0.375)
		_check(mesh.get_class() == expected[shape],
			"the %s glyph must be a %s, got %s"
			% [shape, expected[shape], mesh.get_class()])
		if mesh is CylinderMesh:
			_check((mesh as CylinderMesh).radial_segments > 4,
				"a %s built from a CylinderMesh with <=4 segments renders as a slab"
				% shape)

	# End to end: the prop actually standing in the alcove carries that mesh.
	for k in KEYS:
		var node := _key_node(main, k["id"])
		var glyph := node.get_node_or_null("Model/Idle/Glyph") as MeshInstance3D
		_check(glyph != null and glyph.mesh.get_class() == expected[k["shape"]],
			"%s's prop must carry a %s" % [k["id"], expected[k["shape"]]])
		# The triangle is a prism, which is built standing up; it has to be
		# laid flat like the disc and the slab or it reads as a wedge on edge.
		if glyph != null:
			_check(glyph.rotation.is_equal_approx(ShapeGlyphs.glyph_tilt(k["shape"])),
				"%s's glyph must lie flat" % k["id"])

	# And the 2D side: a point that is inside the square but outside both the
	# circle and the triangle, so the three cannot be silently drawing the same
	# outline on the panel.
	var r := 46.0
	var corner_x := r * 0.6
	var corner_y := -r * 0.6
	_check(ShapeGlyphs.shape_sdf("square", corner_x, corner_y, r) < 0.0,
		"the square's upper corner must be inside the square")
	_check(ShapeGlyphs.shape_sdf("circle", corner_x, corner_y, r) > 0.0,
		"that same corner must be outside the circle")
	_check(ShapeGlyphs.shape_sdf("triangle", corner_x, corner_y, r) > 0.0,
		"that same corner must be outside the triangle")
	for shape in ["circle", "square", "triangle"]:
		_check(ShapeGlyphs.shape_sdf(shape, 0.0, 0.0, r) < 0.0,
			"the centre must be inside the %s" % shape)

	_teardown(ctx)


# --- 6. the lock ------------------------------------------------------------

# Asserted against the COLLISION CACHE, not against a toast: StateObject does
# not flip collision layers, so "the door looks open" and "the doorway is
# walkable" are independent facts and only the second one is the mechanic.
func _test_lock_refuses_then_opens() -> void:
	var ctx := _make_room()
	var room: Node3D = ctx["room"]
	var main: StubMain = ctx["main"]
	var col: WardCollision = ctx["col"]

	_check(room.on_interact("shape_lock15"), "the lock must handle its own id")
	_check(main.toasts.back() == "it wants 3 shapes back. you have 0.",
		"the refusal must name the count, got '%s'" % str(main.toasts.back()))
	_check(col.is_blocked_at(DOOR_X, DOOR_Z, Tuning.PLAYER_RADIUS, StateManager.State.UNMED),
		"the doorway must stay solid at 0 of 3")

	room.on_interact("shapeKeyA")
	room.on_interact("shape_lock15")
	_check(main.toasts.back() == "it wants 3 shapes back. you have 1.",
		"the refusal must track the live count")
	_check(col.is_blocked_at(DOOR_X, DOOR_Z, Tuning.PLAYER_RADIUS, StateManager.State.UNMED),
		"the doorway must stay solid at 1 of 3")

	room.on_interact("shapeKeyB")
	room.on_interact("shape_lock15")
	_check(col.is_blocked_at(DOOR_X, DOOR_Z, Tuning.PLAYER_RADIUS, StateManager.State.UNMED),
		"the doorway must stay solid at 2 of 3 — one short is still shut")

	room.on_interact("shapeKeyC")
	_check(room._lock.held_count() == 3, "three shapes held")
	room.on_interact("shape_lock15")
	_check(room._lock.is_unlocked(), "the lock must open at the full count")
	_check(not col.is_blocked_at(DOOR_X, DOOR_Z, Tuning.PLAYER_RADIUS, StateManager.State.UNMED),
		"the doorway must be WALKABLE once the lock opens — this is the mechanic, "
		+ "and it is the collision cache that decides it")
	_check(not col.is_blocked_at(DOOR_X, DOOR_Z, Tuning.PLAYER_RADIUS, StateManager.State.LUCID),
		"the doorway must be walkable in either state once open")
	_check(main.objectives.back() == "the door is open. go.", "the objective must update")
	# The slab swung clear of the doorway rather than staying in it.
	var slab := main.find_interactable("exitdoor")
	_check(slab != null and slab.global_position.is_equal_approx(Vector3(-1, 1.5, -27.85)),
		"the slab must swing to the vestibule wall")
	_check(not room._lock.is_available("shape_lock15"),
		"the lock must stop resolving once it has opened")

	_teardown(ctx)


# Change #2 of the rework: nothing in this room requires medicine, so the lock
# cannot be the one holdout. Every assertion above already ran raw; this one
# states it as the property it is.
func _test_lock_works_raw() -> void:
	var ctx := _make_room()
	var room: Node3D = ctx["room"]
	var col: WardCollision = ctx["col"]

	_check(StateManager.state == StateManager.State.UNMED, "still raw")
	for k in KEYS:
		room.on_interact(k["id"])
	room.on_interact("shape_lock15")
	_check(room._lock.is_unlocked(),
		"the lock must open while UNMEDICATED — this room has no dispensers, so a "
		+ "lucid-only lock would be a soft-lock for a player who arrives at 0 pills")
	_check(not col.is_blocked_at(DOOR_X, DOOR_Z, Tuning.PLAYER_RADIUS, StateManager.State.UNMED),
		"and the doorway must actually open for him")
	_teardown(ctx)


# --- 7. a catch never un-collects ------------------------------------------

# The design's ONE HARD INVARIANT. A catch is force_state + teleport + toast;
# it does not reload the room, so held shapes — which live on the room script's
# own WardShapeLock — cannot be reached by it. Driven through the real `caught`
# signal rather than by calling the handler, so a future handler that DID clear
# progress would fail here.
func _test_catch_never_uncollects() -> void:
	var ctx := _make_room()
	var room: Node3D = ctx["room"]
	var main: StubMain = ctx["main"]
	var panel := _panel(room)

	room.on_interact("shapeKeyA")
	room.on_interact("shapeKeyC")
	var before := panel.lit_state()
	_check(before == [true, false, true], "two of three lit before the catch")

	_check(not room._orderlies.is_empty(), "the room must have orderlies to be caught by")
	room._orderlies[0].caught.emit()

	_check(main.teleports.back() == Vector2(0, 5), "a catch must walk you back to spawn")
	_check(StateManager.is_lucid(), "a catch forces lucid — that is what ends the chase")
	_check(room._lock.held_count() == 2,
		"A CATCH MUST NOT UN-COLLECT A KEY: held count changed to %d"
		% room._lock.held_count())
	_check(panel.lit_state() == before, "the panel must still show both collected shapes")
	_check(not room._lock.is_available("shapeKeyA") and not room._lock.is_available("shapeKeyC"),
		"collected keys must stay collected across a catch")
	_check(room._lock.is_available("shapeKeyB"), "the uncollected key must still be there")

	# And the run is still finishable afterwards: go raw, take the last one.
	StateManager.force_state(StateManager.State.UNMED, "test")
	room.on_interact("shapeKeyB")
	room.on_interact("shape_lock15")
	_check(room._lock.is_unlocked(), "the room must still be completable after a catch")

	_teardown(ctx)


# --- 8. escalation ----------------------------------------------------------

# Two at the door, five by the time the last key lands, spawned MID-ROOM
# (nothing else in this port adds an orderly after on_enter) and in whatever
# order the player collects.
func _test_escalation_two_to_five() -> void:
	var ctx := _make_room()
	var room: Node3D = ctx["room"]

	_check(room._orderlies.size() == 2, "two orderlies patrol at entry")

	# Reverse order, to prove the count is driven by keys collected and not by
	# which key was collected.
	room.on_interact("shapeKeyC")
	_check(room._orderlies.size() == 3, "the first key must spawn a third orderly")
	room.on_interact("shapeKeyB")
	_check(room._orderlies.size() == 4, "the second key must spawn a fourth")
	room.on_interact("shapeKeyA")
	_check(room._orderlies.size() == 5, "the third key must spawn the fifth")

	# Every one of them is a real, live orderly in the tree, on his own route.
	var seen_starts := {}
	for o in room._orderlies:
		_check(is_instance_valid(o) and o.is_inside_tree(), "each orderly must be in the tree")
		_check(not o.waypoints.is_empty(), "each orderly must carry a route")
		var start: Vector3 = o.waypoints[0]
		_check(o.global_position.distance_to(start) < 0.01,
			"an orderly must start on his own waypoint 0")
		_check(not seen_starts.has(start), "two orderlies must not share a spawn point")
		seen_starts[start] = true

	# A repeat interact on a taken key must not spawn a sixth.
	room.on_interact("shapeKeyA")
	_check(room._orderlies.size() == 5, "five is the ceiling")

	# The last three carry a tinted uniform so five reads as five in a crowd.
	_check(_uniform_tint_of(room._orderlies[4]) != _uniform_tint_of(room._orderlies[0]),
		"the escalation orderlies must be visually distinguishable")

	_teardown(ctx)


func _uniform_tint_of(orderly: Node) -> Color:
	var body := orderly.get_node_or_null("Body")
	if body == null:
		return Color(0, 0, 0)
	return _first_base_color(body)


func _first_base_color(node: Node) -> Color:
	if node is MeshInstance3D:
		var mat := (node as MeshInstance3D).material_override
		if mat is ShaderMaterial:
			var base: Variant = (mat as ShaderMaterial).get_shader_parameter("base_color")
			if base is Color:
				return base
	for child in node.get_children():
		var c := _first_base_color(child)
		if c != Color(0, 0, 0):
			return c
	return Color(0, 0, 0)


func _finish() -> void:
	print("")
	print("test_room15: %d assertion(s)" % (passes + failures.size()))
	if failures.is_empty():
		print("  OK - room 15 and the shape-key mechanism behave")
	else:
		for f in failures:
			print("  FAIL  %s" % f)
	get_tree().quit(1 if failures.size() > 0 else 0)
