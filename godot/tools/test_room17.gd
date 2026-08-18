# Behavioural tests for ROOM 17 — the Gallery Ward.
#
#   godot --headless --path godot tools/test_room17.tscn
#
# tools/test_verticality.gd proves the ENGINE behaves, against two synthetic
# fixtures. This proves ROOM 17's own authored geometry behaves — the part a
# screenshot can never show, because level filtering has no visual expression
# at all: a level-tagged collider looks exactly like an untagged one, and a
# StateObject does not flip collision layers either way.
#
# What it proves:
#
#   1. AUTHORING — two levels, two stairwells, the ceiling and the headroom
#      the design's arithmetic depends on.
#   2. ONE XZ COLUMN, TWO HEIGHTS — the whole point of the room: the same
#      (x, z) inside x[-9,9] z[-6,10] answers 0.0 on 'ground' and 3.4 on
#      'balcony', and the deck slab that makes that legible is authored and
#      collider-free.
#   3. A LEVEL-TAGGED RAILING BLOCKS ON THE GALLERY AND NOT IN THE POCKET —
#      asserted through try_move, the routine the player actually moves with,
#      in both passes. Untagged perimeter walls are checked in the same breath
#      to prove the tag is doing the work and not the geometry.
#   4. THE STAIRWELL FLIP fires on clearing, survives a single-frame
#      overshoot, and does NOT fire mid-stair — and the landing guard is far
#      enough south of z=10 that a climber walking up from the south hall
#      reaches the gallery. That is seam fix A, and it is a regression test:
#      the guard's first version straddled z=10 and walled the gallery off
#      forever, because the climber is still 'ground' for the entire ascent.
#   5. THE CROSS-LEVEL SIGHT AND CATCH GATE — ORDERLY-BALCONY and
#      ORDERLY-POCKET parked on the SAME XZ column, with the player's `level`
#      as the only difference between them. Both directions, sight and
#      contact, with the positive case asserted too so a gate that simply
#      never fires cannot pass.
#   6. SEAM FIX B — a ground orderly's height lookup follows the stair tread
#      when a chase carries him into a stair mouth, WITHOUT his level moving.
#   7. THE ROUTE — the flat route north is walled forever; up-across-down is
#      walkable end to end, on the same collision routine the player uses,
#      with the level flipping where the design says it does.
#   8. The audits a room review would otherwise have to take on trust: patrol
#      clearance PER LEVEL (patrol validation is level-blind, so the collider
#      set has to be filtered first), no patrol leg inside a stairwell, no
#      state-filtered collider anywhere, no fitting buried in the deck, and
#      the scrawls measured rather than assumed.
extends Node

const ROOM := preload("res://rooms/room17/room17.tscn")
const STUB_PLAYER := preload("res://tools/test_stub_player.gd")

const TICK := 1.0 / 60.0

# main.gd clamps dt to 0.05s, so this is the largest distance the player can
# travel between two level resolutions. Every seam margin in this room is
# stated against it.
const MAX_STEP := Tuning.PLAYER_SPEED * 0.05  # 0.17m

const BALCONY_Y := 3.4
const DECK_TOP := 3.4
const DECK_UNDER := 3.1

# The two stairwells, restated here so a change to the room has to be a
# deliberate change to this file too.
const STAIR_EAST := [6.0, 8.0, 10.0, 16.0]   # min_x, max_x, min_z, max_z
const STAIR_WEST := [-8.0, -6.0, 4.0, 8.0]

var failures: Array[String] = []
var passes := 0
var notes: Array[String] = []


# The narrow slice of main.gd a room script may touch. Records what the room
# asked for instead of doing it to a real HUD.
class StubMain:
	extends Node
	var player: Node3D = null
	var collision: WardCollision = null
	var levels: WardLevels = null
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

	func teleport_player(x: float, z: float, to_level := "") -> void:
		teleports.append([x, z, to_level])
		if player != null:
			player.global_position = Vector3(x, 0.0, z)
			if not to_level.is_empty():
				player.level = to_level

	func move_interactable(id: String, pos: Vector3, rot_y := 0.0) -> void:
		var node := _find(room, id)
		if node != null:
			node.global_position = pos
			node.rotation.y = rot_y

	func unlock_door(node_name: String) -> void:
		var body := room.find_child(node_name, true, false)
		if body is CollisionObject3D:
			(body as CollisionObject3D).collision_layer = 0
		rebuild_collision()

	func rebuild_collision() -> void:
		if collision != null and room != null:
			collision.rebuild_from(room)

	func update_scrawl_text(_id: String, _text: String) -> void:
		pass

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

	_test_authoring()
	_test_two_heights_one_column()
	_test_tagged_railing()
	_test_stair_flip_and_landing_guard()
	_test_cross_level_gate()
	_test_ground_orderly_rides_the_stair()
	_test_the_route()
	_test_patrol_clearance_per_level()
	_test_no_state_filtered_geometry()
	await _test_fittings_and_scrawls()
	_test_door_actually_gates()
	_finish()


func _check(cond: bool, what: String) -> void:
	if cond:
		passes += 1
	else:
		failures.append(what)


func _close(a: float, b: float, what: String, eps := 0.0001) -> void:
	_check(absf(a - b) < eps, "%s (got %f, want %f)" % [what, a, b])


# --- fixtures --------------------------------------------------------------

func _load_room() -> Node3D:
	var room: Node3D = ROOM.instantiate()
	add_child(room)
	return room


func _drop(room: Node) -> void:
	remove_child(room)
	room.free()


func _levels() -> WardLevels:
	var room := _load_room()
	var lv := WardLevels.new()
	lv.rebuild_from(room)
	_drop(room)
	return lv


func _collision() -> WardCollision:
	var room := _load_room()
	var col := WardCollision.new()
	col.rebuild_from(room)
	_drop(room)
	return col


## A live room with a stub main behind it, exactly as main.gd would wire one.
func _make_room() -> Dictionary:
	var world := Node3D.new()
	add_child(world)

	var player: Node3D = Node3D.new()
	player.set_script(STUB_PLAYER)
	add_child(player)
	player.level = "ground"
	player.global_position = Vector3(0.0, 0.0, 32.0)

	var room: Node3D = ROOM.instantiate()
	world.add_child(room)

	var main := StubMain.new()
	main.player = player
	main.room = room
	main.collision = WardCollision.new()
	main.collision.rebuild_from(room)
	main.levels = WardLevels.new()
	main.levels.rebuild_from(room)
	add_child(main)

	room.on_enter(main)
	# Nothing below wants the room's own threat aggregation running.
	room.set_physics_process(false)

	return {"world": world, "room": room, "player": player, "main": main}


func _teardown(f: Dictionary) -> void:
	(f["world"] as Node).queue_free()
	(f["player"] as Node).queue_free()
	(f["main"] as Node).queue_free()


## Walk a straight line the way the player really moves: one clamped frame at
## a time, resolving the level AFTER the move, exactly as main.gd orders it.
## Reports where the walk ended, on which level, and where the flip landed.
func _walk(col: WardCollision, lv: WardLevels, from: Vector2, to: Vector2,
		level: String) -> Dictionary:
	var pos := from
	var cur := level
	var flip_at := Vector2(INF, INF)
	var flip_to := ""
	var stalled := 0
	var guard := 0

	while pos.distance_to(to) > 0.02 and guard < 5000:
		guard += 1
		var remaining := pos.distance_to(to)
		var step := (to - pos) / remaining * minf(MAX_STEP, remaining)
		var next := col.try_move(pos, pos + step, Tuning.PLAYER_RADIUS,
			StateManager.State.UNMED, cur)
		if next.distance_to(pos) < 0.0005:
			stalled += 1
			if stalled >= 3:
				break
		else:
			stalled = 0
		pos = next
		var resolved := lv.resolve_level(cur, pos.x, pos.y)
		if resolved != cur:
			flip_at = pos
			flip_to = resolved
			cur = resolved

	return {
		"pos": pos, "level": cur, "arrived": pos.distance_to(to) <= 0.02,
		"flip_at": flip_at, "flip_to": flip_to,
	}


# --- 1. authoring ----------------------------------------------------------

func _test_authoring() -> void:
	var lv := _levels()

	_check(lv.levels.size() == 2, "room 17 declares exactly two levels")
	_check(lv.has_level("ground") and lv.has_level("balcony"),
		"named 'ground' and 'balcony'")
	_check(lv.default_level() == "ground",
		"'ground' is first, so the Spawn marker and any untagged traveler start there")
	_close(lv.ceiling_y, 6.0, "ceiling_y is 6.0 — a two-storey volume needs one")

	# The design's own arithmetic. Below ~0.95 the generator warns, and a
	# gallery you cannot stand up on is not a storey.
	_close(lv.headroom("balcony"), 6.0 - 3.4 - Tuning.PLAYER_EYE_HEIGHT,
		"gallery headroom is the designed 0.98m", 0.001)
	_check(lv.headroom("balcony") > 0.95, "and clears the ~1m authoring floor")
	_check(lv.headroom("ground") > 3.0, "the ground level keeps its full two-storey height")

	_check(lv.stairwells.size() == 2, "two stairwells")
	var east: WardLevels.Stairwell = null
	var west: WardLevels.Stairwell = null
	for s in lv.stairwells:
		if s.id == "stairEast":
			east = s
		elif s.id == "stairWest":
			west = s
	_check(east != null and west != null, "named stairEast and stairWest")
	if east == null or west == null:
		return

	# "low" and "high" name the ends of the AXIS, not the heights: both of
	# these DESCEND as z increases, so y_low > y_high. Getting this inverted
	# is silent — the stair simply runs the wrong way.
	for s: WardLevels.Stairwell in [east, west]:
		_check(s.axis == "z", "%s runs along z" % s.id)
		_close(s.y_low, BALCONY_Y, "%s starts at gallery height on its min-z end" % s.id)
		_close(s.y_high, 0.0, "%s ends at ground height on its max-z end" % s.id)
		_check(s.level_at_low == "balcony" and s.level_at_high == "ground",
			"%s connects balcony (min z) to ground (max z)" % s.id)

	_check(east.min_x == STAIR_EAST[0] and east.max_x == STAIR_EAST[1]
		and east.min_z == STAIR_EAST[2] and east.max_z == STAIR_EAST[3],
		"stairEast occupies x[6,8] z[10,16] — the only gap in the sealed wall")
	_check(west.min_x == STAIR_WEST[0] and west.max_x == STAIR_WEST[1]
		and west.min_z == STAIR_WEST[2] and west.max_z == STAIR_WEST[3],
		"stairWest occupies x[-8,-6] z[4,8] — a hole inside the gallery's own footprint")

	# The west shaft is a hole cut in the deck, not an annex bolted onto its
	# edge. If its footprint ever left the balcony rect it would stop being a
	# hole and the descent would stop reading as stepping off the walkway.
	_check(west.min_x >= -9.0 and west.max_x <= 9.0
		and west.min_z >= -6.0 and west.max_z <= 10.0,
		"and sits INSIDE the gallery footprint, which is what makes it a hole")


# --- 2. one XZ column, two heights ----------------------------------------

# THE HEADLINE. Under a single-valued floor height one of these two answers
# has to be wrong; here both are right at the same time, for different
# travelers, in the same frame.
func _test_two_heights_one_column() -> void:
	var lv := _levels()

	for c: Array in [[0.0, 0.0], [4.0, 6.0], [-2.0, -3.0], [5.0, 9.0], [-8.5, 9.5]]:
		var x: float = c[0]
		var z: float = c[1]
		_close(lv.floor_height_at("ground", x, z), 0.0,
			"(%.1f, %.1f) is the pocket floor on 'ground'" % [x, z])
		_close(lv.floor_height_at("balcony", x, z), BALCONY_Y,
			"(%.1f, %.1f) is the gallery deck on 'balcony'" % [x, z])
		_check(lv.floor_height_at("ground", x, z) != lv.floor_height_at("balcony", x, z),
			"(%.1f, %.1f) answers two different heights by level" % [x, z])

	# The deck slab is the only reason the pocket has a ceiling, and a
	# collider on it would wall the gallery off instead of holding it up.
	var room := _load_room()
	var geo: Node = room.get_node("Geometry")
	var deck_pieces := 0
	for child in geo.get_children():
		if not str(child.name).begins_with("Deck"):
			continue
		deck_pieces += 1
		_check(child is MeshInstance3D,
			"%s is a bare mesh — a deck piece with a collider would block the gallery"
				% child.name)
		var aabb: AABB = (child as MeshInstance3D).global_transform * (child as MeshInstance3D).mesh.get_aabb()
		_close(aabb.position.y + aabb.size.y, DECK_TOP,
			"%s's top face lands exactly on the gallery's walkable height" % child.name, 0.001)
	_check(deck_pieces == 4,
		"the deck is four pieces around the west shaft's hole (got %d)" % deck_pieces)

	# ...and nothing covers the hole.
	var covered := false
	for child in geo.get_children():
		if not str(child.name).begins_with("Deck"):
			continue
		var aabb: AABB = (child as MeshInstance3D).global_transform * (child as MeshInstance3D).mesh.get_aabb()
		if aabb.position.x < -6.05 and aabb.position.x + aabb.size.x > -7.95 \
				and aabb.position.z < 7.95 and aabb.position.z + aabb.size.z > 4.05:
			covered = true
	_check(not covered, "and no piece spans the west shaft — the hole is really open")
	_drop(room)


# --- 3. the level-tagged railing ------------------------------------------

# A railing is the one collider in this game that MUST NOT be a wall. Untagged,
# the z=10 rail would be an invisible barrier straight across the pocket 3.4m
# below it, and nothing on screen would show why.
func _test_tagged_railing() -> void:
	var col := _collision()
	var r := Tuning.PLAYER_RADIUS
	var st := StateManager.State.UNMED

	var tagged := 0
	var untagged := 0
	for b in col.boxes:
		if b.level_filter.is_empty():
			untagged += 1
		else:
			tagged += 1
			_check(b.level_filter == "ground" or b.level_filter == "balcony",
				"every tag names a declared level (found '%s')" % b.level_filter)
	_check(tagged == 4, "four colliders are level-tagged: three rails and the landing guard (got %d)" % tagged)
	_check(untagged > 10, "and the shell stays untagged, i.e. solid on both floors")

	# The south rail, mid-run at x=0.
	_check(col.is_blocked_at(0.0, 10.0, r, st, "balcony"),
		"the gallery's south rail blocks a traveler on the gallery")
	_check(not col.is_blocked_at(0.0, 10.0, r, st, "ground"),
		"and is not there at all for one walking the pocket underneath it")

	# Through the routine the player actually moves with, one clamped frame at
	# a time — try_move is a single AABB test, so a probe longer than the
	# collider is thick tunnels straight through it and proves nothing.
	var from := Vector2(0.0, 9.40)
	var to := Vector2(0.0, 9.40 + MAX_STEP)
	_close(col.try_move(from, to, r, st, "balcony").y, 9.40,
		"a gallery traveler's step into the rail is refused (Z pass)", 0.0001)
	_close(col.try_move(from, to, r, st, "ground").y, to.y,
		"and the same step under it, on the pocket floor, is allowed", 0.0001)

	# The same claim on the X pass and in the other direction, using the
	# GROUND-tagged landing guard: it stops a pocket traveler and does not
	# exist for a gallery one. Two tags, two axes, one rule.
	var fx := Vector2(6.10, 9.20)
	var tx := Vector2(6.10 + MAX_STEP, 9.20)
	_close(col.try_move(fx, tx, r, st, "ground").x, 6.10,
		"the ground-tagged landing guard refuses a pocket traveler's step (X pass)", 0.0001)
	_close(col.try_move(fx, tx, r, st, "balcony").x, tx.x,
		"and is inert for a gallery traveler above it", 0.0001)

	# The tag is doing the work, not the geometry: an untagged wall blocks
	# both, and '__flat' (an untagged traveler) sees only untagged colliders.
	_check(col.is_blocked_at(-8.9, 20.0, r, st, "ground")
		and col.is_blocked_at(-8.9, 20.0, r, st, "balcony"),
		"the west perimeter wall is untagged and blocks on BOTH levels")
	_check(not col.is_blocked_at(0.0, 10.0, r, st, WardLevels.FLAT_LEVEL_ID),
		"a '__flat' traveler matches no tag, so the rail is inert for it")

	# The door-gap rail exists because unlock_door drops DoorCollider on every
	# level; without it the gallery would open onto a 3.4m drop into the
	# vestibule the moment the keypad is used.
	_check(col.is_blocked_at(0.0, -6.0, r, st, "balcony"),
		"the gallery's north door-gap rail blocks a gallery traveler")


# --- 4. the stairwell flip and the landing guard --------------------------

func _test_stair_flip_and_landing_guard() -> void:
	var lv := _levels()
	var col := _collision()
	var r := Tuning.PLAYER_RADIUS
	var st := StateManager.State.UNMED

	# The flip fires only on FULLY clearing the run.
	_check(lv.resolve_level("ground", 7.0, 13.0) == "ground",
		"mid-stair is not a flip — half a climb leaves you on the floor you started")
	_check(lv.resolve_level("ground", 7.0, 16.0) == "ground",
		"standing in the stair mouth is not a flip either")
	_check(lv.resolve_level("ground", 7.0, 10.0) == "balcony",
		"reaching the far end flips a climber to the gallery")
	_check(lv.resolve_level("balcony", 7.0, 16.0) == "ground",
		"and the other end flips a descender back to ground")

	# SINGLE-FRAME OVERSHOOT. Real motion steps past a boundary rather than
	# landing on it; the axis bound is deliberately loose for exactly this.
	_check(lv.resolve_level("ground", 7.0, 10.0 - MAX_STEP) == "balcony",
		"a climber who overshoots the far end by a whole frame still flips")
	_check(lv.resolve_level("balcony", 7.0, 16.0 + MAX_STEP) == "ground",
		"and so does a descender")
	# Lateral stays STRICT — there is no crossing to detect across the width.
	_check(lv.resolve_level("ground", 8.0 + 0.5, 10.0) == "ground",
		"stepping off the side of the run is not a flip: lateral bounds are strict")

	# THE HAZARD THE GUARD EXISTS FOR: from the pocket, z=10 is the stair's
	# TOP end, so crossing it southward would be a 3.4m lift with no climb.
	_check(lv.floor_height_at("ground", 7.0, 10.5) > 3.0,
		"a ground traveler one step south of z=10 in the stair mouth would be "
		+ "lifted over 3m instantly — this is what the landing guard prevents")

	# SEAM FIX A, as a number. The guard must end far enough south of z=10
	# that a climber's last frame before the flip cannot touch it.
	var guard: WardCollision.Box = null
	for b in col.boxes:
		if b.level_filter == "ground":
			guard = b
	_check(guard != null, "the landing guard exists and is tagged 'ground'")
	if guard != null:
		_check(guard.max_z < 10.0, "the landing guard is entirely SOUTH of z=10")
		_check(guard.max_z + r + MAX_STEP < 10.0,
			"with room for a whole frame of overshoot: its radius-expanded edge "
			+ "at %.2f plus a %.2fm frame still clears z=10" % [guard.max_z + r, MAX_STEP])
		# Far enough from ORDERLY-POCKET's (6,9) corner to satisfy the same
		# clearance rule check_rooms._check_patrol applies.
		var dx: float = maxf(maxf(guard.min_x - 6.0, 0.0), 6.0 - guard.max_x)
		var dz: float = maxf(maxf(guard.min_z - 9.0, 0.0), 9.0 - guard.max_z)
		_check(sqrt(dx * dx + dz * dz) > Tuning.ORDERLY_RADIUS + 0.1,
			"and clear of ORDERLY-POCKET's (6,9) waypoint")

	# THE REGRESSION ITSELF. A climber walks the whole run as level 'ground'
	# — the flip only fires at the top — so a guard that straddled z=10 made
	# the gallery permanently unreachable while every screenshot looked fine.
	var climb := _walk(col, lv, Vector2(7.0, 16.6), Vector2(7.0, 8.5), "ground")
	_check(climb["arrived"], "a climber walks the east stair from the hall to the gallery")
	_check(climb["level"] == "balcony",
		"and arrives on the gallery (ended on '%s')" % climb["level"])
	var flip: Vector2 = climb["flip_at"]
	_check(flip.y <= 10.0 and flip.y > 10.0 - MAX_STEP - 0.001,
		"the flip lands within one frame of z=10 (landed at z=%.3f)" % flip.y)

	# And the guard still does its job in the direction it was authored for.
	var sneak := _walk(col, lv, Vector2(7.0, 8.5), Vector2(7.0, 12.0), "ground")
	_check(not sneak["arrived"], "a pocket traveler cannot walk south into the stair mouth")
	_check(sneak["pos"].y < 9.0,
		"he is stopped short of the guard, well before z=10 (stopped at z=%.2f)"
			% sneak["pos"].y)
	_check(sneak["level"] == "ground", "and never flips level")

	# A gallery traveler is NOT subject to it — the guard is ground-tagged, so
	# the descent it protects is unobstructed.
	var descend := _walk(col, lv, Vector2(7.0, 9.0), Vector2(7.0, 16.5), "balcony")
	_check(descend["arrived"], "a gallery traveler descends the same stair freely")
	_check(descend["level"] == "ground", "and lands on ground")

	# The west shaft is a stair from BOTH ends, which is what makes it the
	# pocket's only way back up.
	_close(lv.floor_height_at("ground", -7.0, 6.0), BALCONY_Y * 0.5,
		"the west shaft reads as tread height from the pocket too", 0.001)
	_check(lv.resolve_level("balcony", -7.0, 8.0) == "ground",
		"descending the west shaft lands you on ground")
	_check(lv.resolve_level("ground", -7.0, 4.0) == "balcony",
		"and climbing back up returns you to the gallery")


# --- 5. THE CROSS-LEVEL GATE ----------------------------------------------

# The claim room 17 exists to make. ORDERLY-BALCONY and ORDERLY-POCKET are
# parked on the SAME XZ column, 3.4m apart in a Y that no gameplay logic reads.
# The ONLY difference between the two halves of each pair below is the string
# in player.level.
func _test_cross_level_gate() -> void:
	var f := _make_room()
	var room: Node3D = f["room"]
	var player: Node3D = f["player"]

	var orderlies: Array = room._orderlies
	_check(orderlies.size() == 3, "the room keeps three orderlies")
	if orderlies.size() != 3:
		_teardown(f)
		return

	var south: CharacterBody3D = orderlies[0]
	var balcony: CharacterBody3D = orderlies[1]
	var pocket: CharacterBody3D = orderlies[2]

	_check(south.level == "ground", "ORDERLY-SOUTH is fixed to ground")
	_check(balcony.level == "balcony", "ORDERLY-BALCONY is fixed to the gallery")
	_check(pocket.level == "ground", "ORDERLY-POCKET is fixed to ground")
	_check(balcony.world_levels != null and pocket.world_levels != null,
		"every orderly was handed the room's WardLevels, or his Y is a lie")

	# The shared-footprint claim, from the routes themselves.
	var b_rect := _route_rect(room.WAYPOINTS_B)
	var p_rect := _route_rect(room.WAYPOINTS_C)
	_check(b_rect.intersects(p_rect),
		"ORDERLY-BALCONY's and ORDERLY-POCKET's patrol rectangles overlap in XZ — "
		+ "the whole premise")

	# Freeze them so nothing walks out from under the assertions, and park
	# them on one column. A single waypoint at their own feet keeps
	# _patrol_step in its pause branch, so `facing` stays where it is set.
	var park: Array[Vector3] = [Vector3(4, 0, 6)]
	for o: CharacterBody3D in [balcony, pocket]:
		o.set_physics_process(false)
		o.waypoints = park.duplicate()
		o.global_position = Vector3(4, 0, 6)
		o.facing = Vector2(0, 1)   # +Z, toward the player parked at z=9
		o._apply_floor_height()
	south.set_physics_process(false)
	south.global_position = Vector3(90, 0, 90)

	_close(balcony.global_position.y, BALCONY_Y,
		"the gallery patroller stands ON the deck, not sunk 3.4m into the pocket", 0.001)
	_close(pocket.global_position.y, 0.0, "and the pocket patroller stands under him", 0.001)
	_close(balcony.global_position.x, pocket.global_position.x,
		"they share an X", 0.001)
	_close(balcony.global_position.z, pocket.global_position.z,
		"and a Z — the same column, two floors", 0.001)

	# --- sight, both directions ---
	StateManager.force_state(StateManager.State.UNMED, "test")
	player.global_position = Vector3(4, 0, 9)
	player.level = "ground"
	_tick_orderlies([balcony, pocket], 60)

	_close(balcony.watching(), 0.0,
		"ORDERLY-BALCONY cannot see a player on the floor beneath him, 3m away and "
		+ "dead ahead in his cone")
	_check(pocket.watching() > 0.0,
		"while ORDERLY-POCKET, on the same column and the same level as the player, "
		+ "sees him — so the rig can see, and the level is what stopped the other one")

	_reset_sight([balcony, pocket])
	player.global_position = Vector3(4, BALCONY_Y, 9)
	player.level = "balcony"
	_tick_orderlies([balcony, pocket], 60)

	_check(balcony.watching() > 0.0, "step up onto the gallery and ORDERLY-BALCONY sees you")
	_close(pocket.watching(), 0.0,
		"and ORDERLY-POCKET, directly below, now cannot — the gate is symmetric")

	# --- contact catch, both directions ---
	# The catch is gated too, not just sight: standing on top of someone one
	# floor down must not be touchable.
	var caught: Array = []
	balcony.caught.connect(func() -> void: caught.append("balcony"))
	pocket.caught.connect(func() -> void: caught.append("pocket"))

	_reset_sight([balcony, pocket])
	StateManager.force_state(StateManager.State.UNMED, "test")
	player.global_position = Vector3(4, 0, 6)   # zero XZ distance to BOTH
	player.level = "ground"
	_tick_orderlies([balcony, pocket], 1)
	_check(caught.has("pocket"),
		"at zero distance the ground orderly catches a ground player")
	_check(not caught.has("balcony"),
		"and the gallery orderly, in the same XZ column, does not — a contact catch "
		+ "cannot reach across a level either")

	caught.clear()
	_reset_sight([balcony, pocket])
	StateManager.force_state(StateManager.State.UNMED, "test")
	player.global_position = Vector3(4, BALCONY_Y, 6)
	player.level = "balcony"
	_tick_orderlies([balcony, pocket], 1)
	_check(caught.has("balcony"), "on the gallery it is the gallery orderly who catches")
	_check(not caught.has("pocket"), "and the one underneath cannot touch you")

	# The catch teleport MUST name a level. Without it the player lands on the
	# hall's XZ still flagged 'balcony' — walking on a floor that is not there
	# and invisible to every ground orderly in the room.
	_check(not (f["main"] as StubMain).teleports.is_empty(),
		"a catch teleports the player")
	if not (f["main"] as StubMain).teleports.is_empty():
		var t: Array = (f["main"] as StubMain).teleports[0]
		_check(str(t[2]) == "ground",
			"and passes level 'ground' EXPLICITLY (got '%s')" % str(t[2]))
		_check(player.level == "ground", "so a catch on the gallery really returns you to ground")

	_teardown(f)


func _route_rect(route: Array) -> Rect2:
	var min_x := INF
	var max_x := -INF
	var min_z := INF
	var max_z := -INF
	for p: Vector3 in route:
		min_x = minf(min_x, p.x)
		max_x = maxf(max_x, p.x)
		min_z = minf(min_z, p.z)
		max_z = maxf(max_z, p.z)
	return Rect2(min_x, min_z, max_x - min_x, max_z - min_z)


func _tick_orderlies(list: Array, n: int) -> void:
	for _i in n:
		for o: CharacterBody3D in list:
			o._physics_process(TICK)


func _reset_sight(list: Array) -> void:
	for o: CharacterBody3D in list:
		o.ramp = 0.0
		o.mode = 0            # Orderly.Mode.PATROL
		o._warned = false
		o.global_position = Vector3(4, 0, 6)
		o.facing = Vector2(0, 1)
		o._apply_floor_height()


# --- 6. seam fix B: the ground orderly rides the stair --------------------

# His patrol never touches a stairwell, but chase() does not pathfind and a
# fleeing player stays 'ground' for the whole ascent, so a ground orderly WILL
# be carried into the east stair mouth. Without a stairwell-aware lookup his
# root stays at y=0 while the stepped blocks rise around him and he sinks into
# what reads as solid wall. It must not move his level.
func _test_ground_orderly_rides_the_stair() -> void:
	var f := _make_room()
	var room: Node3D = f["room"]
	var pocket: CharacterBody3D = room._orderlies[2]
	pocket.set_physics_process(false)

	# Mid-run: t = 0.5, so the tread is halfway up.
	pocket.global_position = Vector3(7, 0, 13)
	pocket._apply_floor_height()
	_close(pocket.global_position.y, BALCONY_Y * 0.5,
		"a ground orderly chased into the stair mouth stands ON the tread", 0.001)
	_check(pocket.level == "ground",
		"and is STILL a ground-level entity — the height lookup cannot change his level")

	# Top of the run. Even standing level with the gallery deck he is not on it.
	pocket.global_position = Vector3(7, 0, 10.1)
	pocket._apply_floor_height()
	_check(pocket.global_position.y > 3.3, "at the head of the stair he is at deck height")
	_check(pocket.level == "ground", "and still cannot perceive anyone on the gallery")

	var player: Node3D = f["player"]
	player.global_position = Vector3(7, BALCONY_Y, 9.5)
	player.level = "balcony"
	StateManager.force_state(StateManager.State.UNMED, "test")
	var park: Array[Vector3] = [pocket.global_position]
	pocket.waypoints = park
	pocket.facing = Vector2(0, -1)
	var caught := [false]
	pocket.caught.connect(func() -> void: caught[0] = true)
	_tick_orderlies([pocket], 60)
	_close(pocket.watching(), 0.0,
		"standing at deck height, half a metre from a gallery player, he still sees nothing")
	_check(not caught[0], "and cannot catch him")

	# Back on his own floor he behaves like any orderly in any flat room.
	pocket.global_position = Vector3(3, 0, 6)
	pocket._apply_floor_height()
	_close(pocket.global_position.y, 0.0, "off the stair he is back on the pocket floor", 0.001)

	_teardown(f)


# --- 7. the route ----------------------------------------------------------

func _test_the_route() -> void:
	var lv := _levels()
	var col := _collision()

	# THE THESIS: the flat route north does not exist and never will. No
	# keypad, no unmed panel, no state trick — wall.
	var flat := _walk(col, lv, Vector2(0.0, 32.0), Vector2(0.0, -4.0), "ground")
	_check(not flat["arrived"], "the flat route north is walled")
	_check(flat["pos"].y > 16.0,
		"and stops dead at the sealed wall (got z=%.2f)" % flat["pos"].y)
	_check(flat["level"] == "ground", "with no level change anywhere on the way")

	# Same wall, tried at the west end and dead centre-west, so this is a wall
	# and not one blocked lane.
	for x: float in [-7.0, -2.0, 5.0]:
		var probe := _walk(col, lv, Vector2(x, 20.0), Vector2(x, 12.0), "ground")
		_check(probe["pos"].y > 16.0,
			"the sealed wall holds at x=%.1f too (got z=%.2f)" % [x, probe["pos"].y])

	# UP, ACROSS, DOWN — leg by leg, on the real collision routine.
	var pos := Vector2(0.0, 32.0)
	var level := "ground"
	var legs := [
		[Vector2(7.0, 30.0), "ground", "cross the hall to the east side"],
		[Vector2(7.0, 17.0), "ground", "reach the stair mouth in the sealed wall"],
		[Vector2(7.0, 11.0), "ground", "start the climb"],
		[Vector2(7.0, 8.5), "balcony", "top out on the gallery"],
		[Vector2(4.0, 5.0), "balcony", "cross the gallery"],
		[Vector2(-7.0, 2.5), "balcony", "reach the west shaft's head"],
		[Vector2(-7.0, 9.0), "ground", "descend the shaft into the pocket"],
		[Vector2(-8.4, 9.0), "ground", "reach dispenser17c at the landing"],
		[Vector2(1.35, -4.6), "ground", "cross the pocket to keypad17"],
	]
	for leg: Array in legs:
		var target: Vector2 = leg[0]
		var res := _walk(col, lv, pos, target, level)
		_check(res["arrived"], "route: %s" % leg[2])
		_check(res["level"] == str(leg[1]),
			"route: %s ends on level '%s' (got '%s')" % [leg[2], leg[1], res["level"]])
		pos = res["pos"]
		level = res["level"]

	# The keypad is within reach from where the walk ended.
	_check(Vector2(1.35, -5.81).distance_to(pos) < Tuning.INTERACT_MAX_DISTANCE,
		"and keypad17 is inside interaction range from there")

	# The pocket really is sealed: no way back up except the shaft.
	var back := _walk(col, lv, pos, Vector2(0.0, 20.0), "ground")
	_check(not back["arrived"], "and there is no walking back north out of the pocket")


# --- 8. the audits ---------------------------------------------------------

# patrol() and check_rooms._check_patrol are both LEVEL-BLIND: they see the
# union of every collider. On a stacked room that union is a fiction — it
# contains a gallery railing AND the pocket floor underneath it at once. So
# the set has to be filtered per route, exactly the way try_move filters it at
# runtime, or a ground patrol gets flagged against a rail 3.4m over its head.
func _test_patrol_clearance_per_level() -> void:
	var room := _load_room()
	var col := WardCollision.new()
	col.rebuild_from(room)
	var script: GDScript = load("res://rooms/room17/room17.gd")
	var consts := script.get_script_constant_map()
	_drop(room)

	var routes := {"WAYPOINTS_A": "ground", "WAYPOINTS_B": "balcony", "WAYPOINTS_C": "ground"}
	var need := Tuning.ORDERLY_RADIUS + 0.1

	for name: String in routes:
		_check(consts.has(name), "%s exists (check_rooms only validates WAYPOINTS*)" % name)
		if not consts.has(name):
			continue
		var pts: Array = consts[name]
		var level: String = routes[name]
		_check(pts.size() >= 2, "%s has a real loop" % name)

		var active: Array = []
		for b in col.boxes:
			if b.state_filter == -1 and b.active_on_level(level):
				active.append(b)

		for i in pts.size():
			var a: Vector3 = pts[i]
			var c: Vector3 = pts[(i + 1) % pts.size()]
			for b in active:
				_check(_point_box_dist(a.x, a.z, b) >= need,
					"%s waypoint %d (%.1f,%.1f) is %.2fm from a collider active on '%s' — "
					% [name, i, a.x, a.z, _point_box_dist(a.x, a.z, b), level]
					+ "he spawns on waypoint 0, so an embedded one freezes him")
				_check(_seg_box_dist(a.x, a.z, c.x, c.z, b) >= need,
					"%s leg %d clips a collider active on '%s' (%.2fm)"
					% [name, i, level, _seg_box_dist(a.x, a.z, c.x, c.z, b)])

		# An orderly's level is fixed for life, so a leg through a stairwell
		# footprint is a float/sink glitch waiting to happen. patrol() does
		# not know stairwells exist; this is the only place it is checked.
		for i in pts.size():
			var a: Vector3 = pts[i]
			var c: Vector3 = pts[(i + 1) % pts.size()]
			for s: Array in [STAIR_EAST, STAIR_WEST]:
				_check(not _seg_hits_rect(a.x, a.z, c.x, c.z, s),
					"%s leg %d enters a stairwell footprint — no patrol may" % [name, i])

	# The two footprint-sharing routes really do share it (restated against
	# the constants, so a later edit that pulls them apart is caught here).
	var b_rect := _route_rect(consts["WAYPOINTS_B"])
	var c_rect := _route_rect(consts["WAYPOINTS_C"])
	_check(b_rect.intersects(c_rect),
		"WAYPOINTS_B and WAYPOINTS_C occupy overlapping XZ — the room's premise")

	# Reaction-time floor for every stand-and-read spot (kit.ts's
	# minInspectionDistance(2.5) ~= 8.2m, which also clears the flat 6m sight
	# range outright, so these are unseeable rather than usually-safe).
	var reads := [
		["code digits", Vector2(3.0, -5.85), "WAYPOINTS_C"],
		["code clue line", Vector2(-4.5, -5.85), "WAYPOINTS_C"],
		["west-shaft hint", Vector2(-8.85, 3.5), "WAYPOINTS_B"],
		["dispenser17c", Vector2(-8.8, 9.0), "WAYPOINTS_C"],
		["dispenser17a", Vector2(8.8, 31.0), "WAYPOINTS_A"],
	]
	for entry: Array in reads:
		var d := _dist_to_route(entry[1], consts[entry[2]])
		# The dispensers are approach points rather than stand-and-reads, so
		# they are held to the 6m sight range; the scrawls to the full 8.2m.
		var floor_m: float = 6.0 if str(entry[0]).begins_with("dispenser") else 8.2
		_check(d > floor_m,
			"%s sits %.2fm from the nearest reachable point on %s — needs >%.1fm"
				% [entry[0], d, entry[2], floor_m])


func _dist_to_route(p: Vector2, pts: Array) -> float:
	var best := INF
	for i in pts.size():
		var a: Vector3 = pts[i]
		var c: Vector3 = pts[(i + 1) % pts.size()]
		best = minf(best, _point_seg_dist(p.x, p.y, a.x, a.z, c.x, c.z))
	return best


# The soft-lock audit, as an assertion rather than a paragraph: with no
# unmed-sealed collider anywhere, circle_hits_solid_unmed can never find a
# trapped case at any XZ on either level, so the 45s revert is always free.
func _test_no_state_filtered_geometry() -> void:
	var col := _collision()
	var filtered := 0
	for b in col.boxes:
		if b.state_filter != -1:
			filtered += 1
	_check(filtered == 0,
		"no collider in room 17 is state-filtered, so no revert can ever be trapped "
		+ "(found %d)" % filtered)

	for c: Array in [[0.0, 0.0], [7.0, 13.0], [-7.0, 6.0], [0.0, 20.0], [4.0, 6.0]]:
		for level: String in ["ground", "balcony"]:
			_check(not col.circle_hits_solid_unmed(c[0], c[1], Tuning.PLAYER_RADIUS, level),
				"the medication timer can expire at (%.0f, %.0f) on '%s' with nothing to "
					% [c[0], c[1], level] + "embed the player in")


func _test_fittings_and_scrawls() -> void:
	var room := _load_room()
	# Label3D builds its text mesh lazily, so get_aabb() answers an empty box
	# until at least one frame has been processed. Without this wait every
	# scrawl measures as zero-sized and the checks below silently skip.
	await get_tree().process_frame
	await get_tree().process_frame

	# FITTINGS. Nothing may be sealed inside the deck slab (y 3.1..3.4), which
	# is the two-storey version of "sealed inside a state-filtered panel".
	var lights: Node = room.get_node("Lights")
	var fittings := 0
	var gallery_fittings := 0
	var shadowed := 0
	for child in lights.get_children():
		var l := child as OmniLight3D
		if l == null:
			continue
		var y := l.global_position.y
		if str(l.name).ends_with("_bounce"):
			continue
		fittings += 1
		if l.shadow_enabled:
			shadowed += 1
		_check(y < DECK_UNDER - 0.05 or y > DECK_TOP + 0.05,
			"fitting %s at y=%.2f is buried inside the gallery deck" % [l.name, y])
		if y > DECK_TOP:
			gallery_fittings += 1
			_check(y < 6.0, "gallery fitting %s hangs below the ceiling" % l.name)
	_check(fittings >= 8, "the room is lit on both floors (%d fittings)" % fittings)
	_check(gallery_fittings >= 2,
		"including fittings above the deck, or the gallery is unlit (%d)" % gallery_fittings)
	_check(shadowed >= 2, "and some of them cast (%d shadow casters)" % shadowed)

	# KNOWN GENERATOR LIMITATION, recorded rather than asserted so that fixing
	# it does not fail this suite: the emitter hardcodes each fitting's faked
	# bounce light at y=0.22, which for a gallery fitting is on the POCKET
	# floor 3.4m below the light it belongs to.
	var stray := 0
	for child in lights.get_children():
		var l := child as OmniLight3D
		if l == null or not str(l.name).ends_with("_bounce"):
			continue
		var owner_name := str(l.name).replace("_bounce", "")
		var owner_light := lights.get_node_or_null(owner_name) as OmniLight3D
		if owner_light != null and owner_light.global_position.y > DECK_TOP \
				and l.global_position.y < DECK_UNDER:
			stray += 1
	notes.append("%d fitting(s) above the deck have their faked bounce light at y=0.22, "
		% stray + "on the POCKET floor 3.4m below the fitting it belongs to. "
		+ "Emitter.emit() hardcodes the bounce Y and cannot follow a level, so the "
		+ "gallery gets no bounce and the pocket gets that many unauthored pools.")

	# SCRAWLS. Label3D renders far wider than its authored `size`, so these are
	# measured, not assumed.
	var scrawls: Node = room.get_node("Scrawls")
	var measured: Array = []
	for child in scrawls.get_children():
		var lab := child as Label3D
		if lab == null:
			continue
		var box: AABB = lab.global_transform * lab.get_aabb()
		if box.size.x <= 0.001 and box.size.y <= 0.001:
			continue  # headless text server gave us nothing to measure
		measured.append([str(lab.name), box])

	if measured.is_empty():
		notes.append("scrawl AABBs could not be measured in this environment — "
			+ "their extents are UNVERIFIED.")
	else:
		_check(measured.size() == 5, "all five scrawls measured (got %d)" % measured.size())
		for entry: Array in measured:
			var box: AABB = entry[1]
			var lo := box.position
			var hi := box.position + box.size
			_check(lo.x > -9.2 and hi.x < 9.2 and lo.z > -8.2 and hi.z < 34.2,
				"%s (%.1fm wide) stays inside the room's shell" % [entry[0], box.size.x])
			_check(lo.y > 0.0 and hi.y < 6.0, "%s stays between floor and ceiling" % entry[0])
		# Nothing OVER THE POCKET may straddle the deck. A scrawl inside the
		# slab is invisible from both floors, and which side of it a scrawl
		# sits on decides which floor can read it at all: the gallery hint
		# must be above, both halves of the code must be below.
		for entry: Array in measured:
			var box: AABB = entry[1]
			var lo_y: float = box.position.y
			var hi_y: float = box.position.y + box.size.y
			if box.position.z + box.size.z < -6.0 or box.position.z > 10.0:
				continue  # outside the gallery's footprint; no deck overhead
			_check(hi_y < DECK_UNDER or lo_y > DECK_TOP,
				"%s is either under the deck or above it, never inside it "
					% entry[0] + "(y %.2f..%.2f)" % [lo_y, hi_y])
		# And no two overlap — room 11 shipped two overlapping by 6m.
		for i in measured.size():
			for j in range(i + 1, measured.size()):
				var a: AABB = measured[i][1]
				var b: AABB = measured[j][1]
				_check(not a.intersects(b),
					"scrawls %s and %s overlap" % [measured[i][0], measured[j][0]])
		# The code scrawls must clear the door gap at x[-1,1], or they render
		# across the door leaf.
		for entry: Array in measured:
			var box: AABB = entry[1]
			if absf(box.position.z + box.size.z * 0.5 + 6.0) > 0.5:
				continue
			_check(box.position.x > 1.0 or box.position.x + box.size.x < -1.0,
				"%s clears the exit door's x[-1,1] gap" % entry[0])

	_drop(room)


# The exit is behind a real collider until the code is entered, and a
# StateObject cannot show that: DoorCollider is an ordinary always-on box that
# main.unlock_door clears. Asserted against the cache the mover queries.
func _test_door_actually_gates() -> void:
	var f := _make_room()
	var room: Node3D = f["room"]
	var main: StubMain = f["main"]
	var lv: WardLevels = main.levels
	var col: WardCollision = main.collision

	var shut := _walk(col, lv, Vector2(0.0, -4.0), Vector2(0.0, -7.4), "ground")
	_check(not shut["arrived"], "the exit door is solid before the code is entered")

	room._on_code_accepted()

	var open := _walk(col, lv, Vector2(0.0, -4.0), Vector2(0.0, -7.4), "ground")
	_check(open["arrived"], "and walkable after it")

	# ...but the gallery is still closed over the vestibule, because the rail
	# at the door gap is level-tagged and unlock_door did not touch it.
	_check(col.is_blocked_at(0.0, -6.0, Tuning.PLAYER_RADIUS,
		StateManager.State.UNMED, "balcony"),
		"the opened doorway does NOT open a 3.4m drop off the gallery")

	_teardown(f)


# --- geometry helpers (ported from check_rooms.gd) -------------------------

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
	return _seg_hits_rect(x0, z0, x1, z1, [b.min_x, b.max_x, b.min_z, b.max_z])


func _seg_hits_rect(x0: float, z0: float, x1: float, z1: float, rect: Array) -> bool:
	var t0 := 0.0
	var t1 := 1.0
	var dx := x1 - x0
	var dz := z1 - z0
	var p := [-dx, dx, -dz, dz]
	var q := [x0 - rect[0], rect[1] - x0, z0 - rect[2], rect[3] - z0]
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


func _finish() -> void:
	print("")
	for n in notes:
		print("  NOTE  %s" % n)
	if failures.is_empty():
		print("test_room17: %d assertion(s) passed" % passes)
		print("  OK - room 17's stacked floors, seams and cross-level gates hold")
		get_tree().quit(0)
		return
	print("test_room17: %d passed, %d FAILED" % [passes, failures.size()])
	for f in failures:
		print("  FAIL - %s" % f)
	get_tree().quit(1)
