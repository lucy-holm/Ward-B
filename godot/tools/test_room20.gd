# Behavioural tests for ROOM 20 — the Loading Bay, and for the push-block
# system it introduces.
#
#   godot --headless --path godot tools/test_room20.tscn
#
# tools/test_triggers.gd proves the trigger/gate PRIMITIVES behave. This proves
# ROOM 20's use of them, and — the part that actually matters — it proves the
# thing the grid was chosen FOR.
#
# WHY THE GRID EXISTS. A RigidBody3D crate would feel better to shove and would
# destroy every soft-lock guarantee this room makes, because "can the crate
# reach an unrecoverable cell" stops being answerable. Because the crate moves
# one cell per press and nothing else, that question is a finite search, and
# section 7 below RUNS it: an exhaustive forward search over every state the
# crate and player can reach (crate cell x player region x which gates have
# latched), then a backward search from the exit proving that EVERY reachable
# state can still finish the room. Not "the intended route works" — every state
# reachable by any sequence of presses, including the stupid ones.
#
# The search drives the room's OWN _push_blocked() rather than a second copy of
# the rule, so the proof and the shipped behaviour cannot drift.
#
#   1. authoring invariants — the numbers the design audits quote
#   2. the crate is a real, moving collider (runtime probe, not a screenshot)
#   3. the push rule: reach, derived direction, and refusal against a collider,
#      another state's collider, and an orderly's body
#   4. the collider snaps and only the drawing tweens
#   5. the plates track the CRATE and ignore the player
#   6. the gates latch one-way, and the one close path defers rather than
#      freezing a body
#   7. THE SOFT-LOCK ENUMERATION (see above)
#   8. the intended solve, push by push, end to end
extends Node

const ROOM := preload("res://rooms/room20/room20.tscn")
const STUB_PLAYER := preload("res://tools/test_stub_player.gd")

const TICK := 1.0 / 60.0
const CRATE_HALF := 0.43
const REACH := 1.15

# Cell centres of the two plates and the two gate gaps.
const PLATE1_CELL := Vector2(1, 1)
const PLATE2_CELL := Vector2(1, -15)

# --- the lattice the soft-lock search walks the player over ----------------
#
# The player is a continuous body, so "can they get from here to there" is
# sampled: a square lattice of candidate standing points, 4-connected. Two
# choices make the sampling SOUND rather than merely plausible:
#
#  * the radius used is PLAYER_RADIUS + half a lattice diagonal, so a point is
#    only called free when the whole lattice cell around it is free. Adjacent
#    free points are therefore genuinely connected for a real 0.35m player, and
#    the model can only ever UNDER-state where the player can go. Under-stating
#    is the safe direction: a winnability proof that holds for a fatter player
#    holds for the real one.
#  * the spacing is fine enough that the tightest legal passage in the room —
#    a 1.0m gate gap, which leaves a 0.30m channel for a real player and a
#    0.12m channel for the inflated one — still contains a lattice column.
#    x = 0.0 is a lattice column exactly, which is that channel's centre.
const LAT := 0.125
const LAT_NX := 97           # x = -6.0 + i * LAT, i in [0, 96]; i = 48 -> x = 0
const LAT_NZ := 200          # z = -18.95 + j * LAT, j in [0, 199]
const LAT_X0 := -6.0
const LAT_Z0 := -18.95
const BLOCKED := 255

# Crate cell bounds — every integer cell inside the floor rect x[-6,6] z[-19,6].
const CELL_MIN_X := -5
const CELL_MAX_X := 5
const CELL_MIN_Z := -18
const CELL_MAX_Z := 5
const CELL_W := CELL_MAX_X - CELL_MIN_X + 1

var failures: Array[String] = []
var passes := 0
var notes: Array[String] = []

# --- solver state ----------------------------------------------------------
var _player_r := 0.0
var _free_static := {}       # cfg -> PackedByteArray over the lattice
var _cell_legal := {}        # cfg -> PackedByteArray over crate cells
var _label_cache := {}       # "cfg:cx:cz" -> PackedByteArray component labels
var _exit_idx := -1


# The narrow slice of main.gd a room script is allowed to touch.
class StubMain:
	extends Node
	var player: Node3D = null
	var collision: WardCollision = null
	var room: Node3D = null
	var toasts: Array = []
	var objectives: Array = []
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
		if player != null:
			player.global_position = Vector3(x, 0.0, z)

	func move_interactable(id: String, pos: Vector3, rot_y := 0.0) -> void:
		var node := _find(room, id)
		if node != null:
			node.global_position = pos
			node.rotation.y = rot_y

	func rebuild_collision() -> void:
		if collision != null and room != null:
			collision.rebuild_from(room)

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
	_player_r = Tuning.PLAYER_RADIUS + LAT * 0.7071067812

	_test_authoring_invariants()
	_test_crate_is_a_real_moving_collider()
	_test_push_rule()
	_test_push_refusals()
	_test_collider_snaps_and_only_the_drawing_tweens()
	_test_plates_track_the_crate_not_you()
	_test_gates_latch_one_way()
	_test_gate_close_defers_rather_than_freezing()
	_test_soft_lock_enumeration()
	_test_intended_solve()
	await _test_the_crate_is_actually_cover()
	_finish()


func _check(cond: bool, what: String) -> void:
	if cond:
		passes += 1
	else:
		failures.append(what)


# --- fixtures --------------------------------------------------------------

## A live room behind a stub main. `frozen` stops the room's and both
## orderlies' own _physics_process so the test drives every tick by hand, and
## parks both orderlies far outside the room so they neither see, catch, nor
## block anything until a test puts them somewhere on purpose.
func _make_room(frozen := true) -> Dictionary:
	var world := Node3D.new()
	add_child(world)

	var player := Node3D.new()
	player.set_script(STUB_PLAYER)
	add_child(player)
	player.global_position = Vector3(0.0, 0.0, 5.0)

	var room: Node3D = ROOM.instantiate()
	world.add_child(room)

	var main := StubMain.new()
	main.player = player
	main.room = room
	main.collision = WardCollision.new()
	add_child(main)
	main.collision.rebuild_from(room)

	room.on_enter(main)

	if frozen:
		room.set_physics_process(false)
		for o in [room._orderly_a, room._orderly_b]:
			o.set_physics_process(false)
			o.global_position = Vector3(90.0, 0.0, 90.0)

	return {"world": world, "room": room, "player": player, "main": main}


func _teardown(f: Dictionary) -> void:
	(f["world"] as Node).queue_free()
	(f["player"] as Node).queue_free()
	(f["main"] as Node).queue_free()


## Stand at (x, z) and press interact on the crate. Returns the resulting cell.
func _push_from(f: Dictionary, x: float, z: float) -> Vector2:
	(f["player"] as Node3D).global_position = Vector3(x, 0.0, z)
	(f["room"] as Node3D).on_interact("crate")
	return (f["room"] as Node3D).crate_cell()


func _tick(room: Node3D, seconds: float) -> void:
	for _i in int(round(seconds / TICK)):
		room._physics_process(TICK)


# --- 1. authoring ----------------------------------------------------------

# Every number here is load-bearing for an audit in the room's header, and the
# two plate rects are load-bearing for the PASSAGE-CLEARANCE FIX specifically:
# a plate authored back on the x = 0 causeway puts the crate one ordinary push
# away from wedging a gate gap, which is the only place on the map narrow
# enough for a 0.86m crate to seal.
func _test_authoring_invariants() -> void:
	var room: Node3D = ROOM.instantiate()
	add_child(room)

	var p1 := TriggerVolume.find_in(room, "plate1")
	var p2 := TriggerVolume.find_in(room, "plate2")
	_check(p1 != null and p2 != null, "room20 must carry plate1 and plate2 trigger volumes")
	_check(TriggerVolume.find_in(room, "enterZ2") != null, "the enterZ2 trigger must exist")
	_check(TriggerVolume.find_in(room, "vestibule20") != null, "the vestibule20 trigger must exist")

	if p1 != null and p2 != null:
		# Unfiltered, both of them. A state-filtered plate would mean the crate
		# stopped counting as weight in one reality, which is the exact thing
		# the design rules out: the crate is the one tool that does not care.
		_check(p1.states == TriggerVolume.States.BOTH
				and p2.states == TriggerVolume.States.BOTH,
			"NEITHER PLATE MAY BE STATE-FILTERED — the crate's whole value is "
			+ "that it works identically in both realities")
		_check(is_equal_approx(p1.min_x, 0.5) and is_equal_approx(p1.max_x, 1.5)
				and is_equal_approx(p1.min_z, 0.5) and is_equal_approx(p1.max_z, 1.5),
			"plate1 must stay the audited x[0.5,1.5] z[0.5,1.5]")
		_check(is_equal_approx(p2.min_x, 0.5) and is_equal_approx(p2.max_x, 1.5)
				and is_equal_approx(p2.min_z, -15.5) and is_equal_approx(p2.max_z, -14.5),
			"plate2 must stay the audited x[0.5,1.5] z[-15.5,-14.5]")

		# THE PASSAGE-CLEARANCE FIX, AS A NUMBER. Each plate's seat cell must be
		# OFF the causeway, so that the push which follows a seating drives the
		# crate into the gate's flanking wall instead of into its 1m gap.
		for pair in [[p1, room.GATE1_MIN_X, room.GATE1_MAX_X],
					 [p2, room.GATE2_MIN_X, room.GATE2_MAX_X]]:
			var plate: TriggerVolume = pair[0]
			var c := plate.center()
			_check(c.x - CRATE_HALF > float(pair[2]),
				"%s's seat cell must sit entirely EAST of its gate gap, or an "
				% plate.trigger_id
				+ "ordinary extra push wedges the crate in the one opening "
				+ "narrow enough to matter")

		# And the gap, once the crate provably cannot enter it, is wide enough.
		var gap: float = room.GATE1_MAX_X - room.GATE1_MIN_X
		_check(gap > 2.0 * Tuning.PLAYER_RADIUS,
			"a gate gap must clear two player radii (%.2fm vs %.2fm)"
				% [gap, 2.0 * Tuning.PLAYER_RADIUS])

	# The crate: one push_block, unfiltered, at the audited rest cell.
	var types: Array = []
	var ids: Array = []
	_collect_interactables(room, types, ids)
	_check(ids.count("crate") == 1, "exactly one crate")
	_check(types.count("push_block") == 1, "exactly one push_block interactable")
	_check(not types.has("keypad"),
		"room 20 has NO keypad — both gates are presence-triggered, so the "
		+ "randomize-codes wiring does not apply")
	_check(types.has("dispenser"), "the Z1 dispenser is the room's panic button")
	_check(ids.has("gate1") and ids.has("gate2"), "both gate panels must exist to be swung")

	var crate := _find_interactable(room, "crate")
	_check(crate != null and _state_object_ancestor(crate) == null,
		"the crate must NOT be wrapped in a StateObject — it exists in both realities")
	_check(is_equal_approx(room.REST_CELL.x, 2.0) and is_equal_approx(room.REST_CELL.y, 1.0),
		"the crate's rest cell must stay (2,1)")
	_check(is_equal_approx(room.CELL_M, 1.0) and is_equal_approx(room.PUSH_REACH_M, 1.15)
			and is_equal_approx(room.CRATE_HALF, 0.43),
		"the ported grid constants must stay CELL_M 1.0 / PUSH_REACH 1.15 / half 0.43")

	# The crate rides inside its own body so one transform write moves collider,
	# mesh and ray target together. If that ever gets refactored apart, the
	# mesh and the AABB can drift and this room's whole contract goes with it.
	_check(crate != null and crate.get_parent() != null
			and crate.get_parent().get_parent() is AnimatableBody3D,
		"the crate's Interactable must ride inside the crate BODY (Crate/Visual/crate), "
		+ "so the collider, the mesh and the focus target can never drift apart")

	var exit := room.get_node_or_null("Exits/Exit0")
	_check(exit != null and str(exit.exit_to) == "END",
		"room 20 is the last room: its exit is END, not a terminator hack")
	_check(not load("res://main.gd").ROOM_SCENES.has("room20"),
		"room 20 is not registered in ROOM_SCENES yet — check_rooms' chain walk "
		+ "must not reach it (this assertion tightens by itself when it lands)")

	# Both patrols, clear end to end at his own body radius, against the room's
	# STATIC geometry. The crate is deliberately not in this set — see below.
	var col := WardCollision.new()
	col.rebuild_from(room)
	var crate_shape := room.get_node_or_null("Geometry/Crate/Shape")
	for i in range(col.boxes.size() - 1, -1, -1):
		if col.boxes[i].source == crate_shape:
			col.boxes.remove_at(i)
	for route_name in ["WAYPOINTS_A", "WAYPOINTS_B"]:
		var pts: Array = room.get(route_name)
		var blocked := 0
		for i in pts.size():
			var a: Vector3 = pts[i]
			var b: Vector3 = pts[(i + 1) % pts.size()]
			for s in 101:
				var t := float(s) / 100.0
				var x := lerpf(a.x, b.x, t)
				var z := lerpf(a.z, b.z, t)
				if col.is_blocked_at(x, z, Tuning.ORDERLY_RADIUS + 0.1,
						StateManager.State.UNMED):
					blocked += 1
		_check(blocked == 0,
			"%s must be clear end to end at 0.5m (%d samples blocked)" % [route_name, blocked])

	# No fitting sealed inside geometry (room 12's wasted shadow-caster).
	for light in room.get_node_or_null("Lights").get_children():
		var lp: Vector3 = (light as Node3D).position
		_check(not col.is_blocked_at(lp.x, lp.z, 0.0, StateManager.State.UNMED),
			"fitting %s sits inside solid geometry at (%.2f, %.2f)" % [light.name, lp.x, lp.z])

	room.queue_free()


func _collect_interactables(node: Node, types: Array, ids: Array) -> void:
	if node is Interactable:
		types.append((node as Interactable).interactable_type)
		ids.append((node as Interactable).interactable_id)
	for child in node.get_children():
		_collect_interactables(child, types, ids)


func _find_interactable(node: Node, id: String) -> Interactable:
	if node is Interactable and (node as Interactable).interactable_id == id:
		return node as Interactable
	for child in node.get_children():
		var found := _find_interactable(child, id)
		if found != null:
			return found
	return null


func _state_object_ancestor(node: Node) -> StateObject:
	var p := node.get_parent()
	while p != null:
		if p is StateObject:
			return p as StateObject
		p = p.get_parent()
	return null


# --- 2. the crate is a real, moving collider -------------------------------

# StateObject does not flip collision layers and a screenshot cannot show
# whether anything blocks. This is the runtime probe: the same cache try_move
# queries, before and after a push, plus the two composition rules the room's
# header claims — the orderlies do not collide with it, and a stray
# rebuild_collision() re-derives it from the body rather than the drawing.
func _test_crate_is_a_real_moving_collider() -> void:
	var f := _make_room()
	var room: Node3D = f["room"]
	var main: StubMain = f["main"]
	var col: WardCollision = main.collision
	var r := Tuning.PLAYER_RADIUS

	for state in [StateManager.State.UNMED, StateManager.State.LUCID]:
		_check(col.is_blocked_at(2.0, 1.0, r, state),
			"the crate must be SOLID at its rest cell in both realities")

	_check(_push_from(f, 3.0, 1.0) == Vector2(1, 1), "a push west must move it one cell")
	_check(not col.is_blocked_at(2.0, 1.0, r, StateManager.State.UNMED),
		"THE CACHE MUST FOLLOW: the vacated cell has to become walkable, or the "
		+ "crate is a permanent invisible wall wherever it has ever been")
	_check(col.is_blocked_at(1.0, 1.0, r, StateManager.State.UNMED),
		"and the destination cell has to become solid")

	# A stray rebuild re-derives every box from the scene. The body transform is
	# authoritative at all times — including mid-tween — so this self-heals.
	main.rebuild_collision()
	_check(col.is_blocked_at(1.0, 1.0, r, StateManager.State.UNMED)
			and not col.is_blocked_at(2.0, 1.0, r, StateManager.State.UNMED),
		"a stray rebuild_collision() must re-derive the crate box from the BODY "
		+ "and land on the same answer")

	# Occluder yes, movement-collider no.
	var crate_shape := room.get_node_or_null("Geometry/Crate/Shape")
	var found := false
	for b in room._orderly_collision.boxes:
		if b.source == crate_shape:
			found = true
	_check(not found,
		"THE ROOM 13 LESSON: the crate must be excluded BY IDENTITY from the "
		+ "orderlies' collider set, or a crate pushed onto a patrol lane wedges "
		+ "him there forever with nothing to push him out")
	var body := room.get_node_or_null("Geometry/Crate") as CollisionObject3D
	_check(body != null and body.collision_layer == WardCollision.LAYER_WORLD_STATIC,
		"but it must stay on world_static, which is what Orderly's occlusion "
		+ "raycast masks against — the cover beats are real geometry")

	_teardown(f)


# --- 3. the push rule ------------------------------------------------------

func _test_push_rule() -> void:
	var f := _make_room()
	var room: Node3D = f["room"]

	# Direction is DERIVED from the player->crate vector and always continues
	# AWAY from the player: walking into a face is what pushes it.
	_check(_push_from(f, 3.0, 1.0) == Vector2(1, 1), "standing east pushes it west")
	_check(_push_from(f, 0.0, 1.0) == Vector2(2, 1), "standing west pushes it east")
	_check(_push_from(f, 2.0, 2.0) == Vector2(2, 0), "standing north pushes it south")
	_check(_push_from(f, 2.0, -1.0) == Vector2(2, 1), "standing south pushes it north")

	# The larger axis wins outright — there are no diagonal pushes.
	_check(_push_from(f, 2.9, 1.4) == Vector2(1, 1),
		"a diagonal stance resolves to the LARGER axis, never to a diagonal move")

	# Reach: the crosshair can focus the crate from 2.7m, but a push needs you
	# at its face. 1.15m is the line, and it is exclusive on the far side.
	room._set_crate_cell(2, 1)
	_check(_push_from(f, 2.0, 2.2) == Vector2(2, 1),
		"focusing the crate from 1.2m away must NOT push it — reach is 1.15m")
	_check(_push_from(f, 2.0, 2.1) == Vector2(2, 0),
		"and 1.1m away must")

	# Degenerate stance: exactly on the centre. Cannot happen (the crate is
	# solid) but must not push in a random direction if it ever did.
	room._set_crate_cell(2, 1)
	_check(_push_from(f, 2.0, 1.0) == Vector2(2, 1),
		"a player exactly on the crate's centre must be a no-op, not a coin flip")

	# A push can never place the crate ON the player, because it always moves
	# away. Swept over the whole annulus the player can legally occupy.
	var worst := 999.0
	for i in 240:
		var ang := TAU * float(i) / 240.0
		for d in [0.79, 0.9, 1.0, 1.1, 1.15]:
			var px := 2.0 + cos(ang) * d
			var pz := 1.0 + sin(ang) * d
			room._set_crate_cell(2, 1)
			var got := _push_from(f, px, pz)
			if got == Vector2(2, 1):
				continue  # refused; nothing to check
			var gap := maxf(maxf(got.x - CRATE_HALF - px, px - got.x - CRATE_HALF),
				maxf(got.y - CRATE_HALF - pz, pz - got.y - CRATE_HALF))
			worst = minf(worst, gap)
	_check(worst > Tuning.PLAYER_RADIUS,
		"a push must never land the crate on the pusher — worst clearance over "
		+ "the whole legal stance annulus was %.3fm against a 0.35m body" % worst)
	notes.append("worst crate-vs-pusher clearance after a push: %.3fm" % worst)

	_teardown(f)


func _test_push_refusals() -> void:
	var f := _make_room()
	var room: Node3D = f["room"]
	var main: StubMain = f["main"]

	# (a) a wall. The crate starts one cell from the z=6 south cap.
	room._set_crate_cell(2, 5)
	_check(_push_from(f, 2.0, 4.0) == Vector2(2, 5),
		"a push into the perimeter wall must be refused")
	_check(main.toasts.has("it doesn't go that way."),
		"and must teach the refusal exactly once")
	var before: int = main.toasts.size()
	_push_from(f, 2.0, 4.0)
	_check(main.toasts.size() == before, "with no toast spam on the second bump")

	# (b) the shut gate collider — a push into a gate that has not latched yet
	# fails exactly like walking into it does.
	room._set_crate_cell(0, 1)
	_check(_push_from(f, 0.0, 2.0) == Vector2(0, 1),
		"a push into GATE_1 while it is shut must be refused")
	room._open_gate(1)
	_check(_push_from(f, 0.0, 2.0) == Vector2(0, 0),
		"and must succeed once the gate has latched open")

	# (c) ANOTHER STATE'S collider. Room 20 authors none, so one is injected
	# into the cache to prove the state filter is honoured rather than assumed:
	# a lucid-only blocker must stop a lucid push and not an unmed one.
	var ghost := WardCollision.Box.new(-0.43, 0.43, -2.43, -1.57,
		StateManager.State.LUCID)
	main.collision.boxes.append(ghost)
	room._set_crate_cell(0, 0)
	StateManager.force_state(StateManager.State.LUCID, "test")
	_check(_push_from(f, 0.0, 1.0) == Vector2(0, 0),
		"a push into a LUCID-only collider must be refused while lucid")
	StateManager.force_state(StateManager.State.UNMED, "test")
	_check(_push_from(f, 0.0, 1.0) == Vector2(0, -1),
		"and must succeed while unmed — the same semantics as walking into it")
	main.collision.boxes.erase(ghost)

	# (d) an orderly's body circle, tested at the instant of the press.
	room._set_crate_cell(0, -1)
	room._orderly_a.global_position = Vector3(0.0, 0.0, -2.0)
	_check(_push_from(f, 0.0, 0.0) == Vector2(0, -1),
		"a push into an orderly standing in the destination cell must be refused")
	room._orderly_a.global_position = Vector3(0.0, 0.0, -2.9)
	_check(_push_from(f, 0.0, 0.0) == Vector2(0, -2),
		"and must succeed once he has walked far enough clear of it")
	_check(not room._push_blocked(0.0, -3.0, StateManager.State.UNMED),
		"the orderly test is a body circle, not the whole cell: 0.4m radius")

	_teardown(f)


# --- 4. the tween is cosmetic ---------------------------------------------

# The one approved enhancement. It must remain exactly that: the collider is at
# the destination on the frame the push is accepted, and only the drawing
# lags — otherwise a player following the crate can be standing where the solid
# AABB already is, which try_move answers by freezing them.
func _test_collider_snaps_and_only_the_drawing_tweens() -> void:
	var f := _make_room()
	var room: Node3D = f["room"]
	var main: StubMain = f["main"]
	var visual: Node3D = room.get_node("Geometry/Crate/Visual")

	_push_from(f, 3.0, 1.0)
	_check(main.collision.is_blocked_at(1.0, 1.0, Tuning.PLAYER_RADIUS,
			StateManager.State.UNMED),
		"the destination must be SOLID on the frame the push is accepted, "
		+ "before the tween has drawn a single frame")
	_check(absf(visual.global_position.x - 2.0) < 0.001,
		"and the drawing must still be in the cell it is leaving")
	_check(is_equal_approx(room._crate_body.position.x, 1.0),
		"the BODY (and therefore the cached box) is what snapped")

	_tick(room, room.PUSH_TWEEN_SEC * 0.5)
	var mid := visual.global_position.x
	_check(mid > 1.0 and mid < 2.0, "mid-tween the drawing must be between the cells")

	# A rebuild mid-tween must re-derive from the body, not from the drawing.
	main.rebuild_collision()
	_check(main.collision.is_blocked_at(1.0, 1.0, Tuning.PLAYER_RADIUS,
			StateManager.State.UNMED)
			and not main.collision.is_blocked_at(2.0, 1.0, Tuning.PLAYER_RADIUS,
				StateManager.State.UNMED),
		"a rebuild MID-TWEEN must land on the destination cell — the body is "
		+ "authoritative, the drawing is not")

	_tick(room, room.PUSH_TWEEN_SEC)
	_check(absf(visual.position.length()) < 0.0001,
		"the tween must settle exactly on the body, not near it")
	_check(not room._tweening, "and must stop tweening rather than easing forever")

	# The catch re-rack is a confiscation, not a push: it snaps.
	_push_from(f, 1.0, 2.0)
	room._on_caught()
	_check(room.crate_cell() == Vector2(2, 1), "a catch re-racks the crate to its rest cell")
	_check(visual.position.length() < 0.0001 and not room._tweening,
		"and does it with no tween — nothing slid it back")

	_teardown(f)


# --- 5. the plates track the crate ----------------------------------------

func _test_plates_track_the_crate_not_you() -> void:
	var f := _make_room()
	var room: Node3D = f["room"]
	var player: Node3D = f["player"]

	# The engine polls the plate for the PLAYER and the room must ignore it.
	player.global_position = Vector3(PLATE1_CELL.x, 0.0, PLATE1_CELL.y)
	room.on_trigger_enter("plate1")
	_tick(room, 0.2)
	_check(not room.is_gate_open(1),
		"IT OPENS FOR THE WEIGHT, NOT FOR YOU: standing on the plate yourself "
		+ "must do nothing at all")

	# The crate's centre inside the rect does it, with no dwell.
	room._set_crate_cell(PLATE1_CELL.x, PLATE1_CELL.y)
	room._physics_process(TICK)
	_check(room.is_gate_open(1), "the crate's own centre on the plate opens the gate")
	_check((f["main"] as StubMain).toasts.has("it opens for the weight, not for you."),
		"and says so")

	# The same rect the engine polls, tested statically — not a second copy.
	var p1 := TriggerVolume.find_in(room, "plate1")
	_check(TriggerVolume.point_in_rect(PLATE1_CELL.x, PLATE1_CELL.y,
			p1.min_x, p1.max_x, p1.min_z, p1.max_z),
		"the seat cell must be strictly inside the plate rect")
	_check(not TriggerVolume.point_in_rect(p1.min_x, PLATE1_CELL.y,
			p1.min_x, p1.max_x, p1.min_z, p1.max_z),
		"and containment must stay STRICT — a centre exactly on the edge is out")

	# plate2 is independent: a crate on plate1 must not open gate2.
	_check(not room.is_gate_open(2), "plate1 must not open GATE_2")
	room._set_crate_cell(PLATE2_CELL.x, PLATE2_CELL.y)
	room._physics_process(TICK)
	_check(room.is_gate_open(2), "plate2 opens GATE_2")

	_teardown(f)


# --- 6. the gates ----------------------------------------------------------

func _test_gates_latch_one_way() -> void:
	var f := _make_room()
	var room: Node3D = f["room"]
	var main: StubMain = f["main"]
	var r := Tuning.PLAYER_RADIUS

	for state in [StateManager.State.UNMED, StateManager.State.LUCID]:
		_check(main.collision.is_blocked_at(0.0, 0.0, r, state),
			"a shut gate must be SOLID in both realities")

	room._set_crate_cell(PLATE1_CELL.x, PLATE1_CELL.y)
	room._physics_process(TICK)
	for state in [StateManager.State.UNMED, StateManager.State.LUCID]:
		_check(not main.collision.is_blocked_at(0.0, 0.0, r, state),
			"an open gate must be WALKABLE — a panel that swings but still "
			+ "blocks is the bug a screenshot cannot see")

	# THE LATCH. Take the crate off the plate, wait, catch the player, wait some
	# more. Nothing in this room closes a gate.
	room._set_crate_cell(4, 4)
	_tick(room, 3.0)
	_check(room.is_gate_open(1),
		"THE LOAD-BEARING GUARANTEE: the gate must stay open once the crate has "
		+ "seated the plate, or 'is the dispenser reachable' stops reducing to "
		+ "'is Z1 reachable' and the soft-lock audit collapses")
	room._on_caught()
	_tick(room, 3.0)
	_check(room.is_gate_open(1), "and a catch must not re-seal it either")
	_check(not main.collision.is_blocked_at(0.0, 0.0, r, StateManager.State.UNMED),
		"asserted against the collision cache, not the panel's transform")

	# The panels are scenery: never focusable, never interactable.
	_check(not room._is_available("gate1") and not room._is_available("gate2"),
		"both gate panels must be permanently un-interactable — pressing E on "
		+ "one must never be a route")
	_check(room.on_interact("gate1"),
		"and an interact on one must be swallowed rather than falling through "
		+ "to the engine's generic handler")

	_teardown(f)


# Room 20's gates never close in play. The on_enter re-assert is the one code
# path that can put a collider back, and it goes through DeferredGate for the
# same reason room 14's does: closing a collider onto a body inside its
# footprint freezes that body outright, and there is no push-out.
func _test_gate_close_defers_rather_than_freezing() -> void:
	var f := _make_room()
	var room: Node3D = f["room"]
	var main: StubMain = f["main"]
	var player: Node3D = f["player"]
	var r := Tuning.PLAYER_RADIUS

	room._set_crate_cell(PLATE1_CELL.x, PLATE1_CELL.y)
	room._physics_process(TICK)
	_check(room.is_gate_open(1), "setup: gate open")

	# Re-enter the same instance with the player standing in the gap.
	player.global_position = Vector3(0.0, 0.0, 0.0)
	room._reassert_gates_shut()
	_tick(room, 3.0)
	_check(room.is_gate_open(1),
		"THE FREEZE: the gate must refuse to close onto a body inside its own "
		+ "footprint, however long it waits")
	_check(room._gate1_guard.is_deferred(),
		"and must report that it is deferring rather than silently doing nothing")
	_check(not main.collision.is_blocked_at(0.0, 0.0, r, StateManager.State.UNMED),
		"the player standing in the gap must still have a legal move")

	# One step clear and it closes immediately.
	player.global_position = Vector3(0.0, 0.0, 2.0)
	room._physics_process(TICK)
	_check(not room.is_gate_open(1), "and closes the moment the gap is clear")
	_check(main.collision.is_blocked_at(0.0, 0.0, r, StateManager.State.UNMED),
		"solid again")

	# An orderly counts too — a wedged patrol is only a visual bug, but it is
	# the identical check and it must not be player-only.
	room._set_crate_cell(PLATE1_CELL.x, PLATE1_CELL.y)
	room._physics_process(TICK)
	room._orderly_b.global_position = Vector3(0.2, 0.0, 0.0)
	room._reassert_gates_shut()
	_tick(room, 3.0)
	_check(room.is_gate_open(1), "an orderly in the gap must defer the close too")
	room._orderly_b.global_position = Vector3(90.0, 0.0, 90.0)
	room._physics_process(TICK)
	_check(not room.is_gate_open(1), "and releasing it must close the gate")

	_teardown(f)


# --- 7. THE SOFT-LOCK ENUMERATION -----------------------------------------
#
# The reason the crate is grid-snapped. See the file header.
#
# States are (which gates have latched, crate cell, which connected region of
# the floor the player is standing in). A transition is one accepted push. The
# search is:
#
#   forward   — every state reachable from (gates shut, crate at (2,1), player
#               at spawn) by any sequence of presses, sane or otherwise;
#   backward  — every state from which the exit is still reachable;
#   the claim — those two sets are equal. No sequence of presses can put the
#               room in a state it cannot be finished from.
#
# The push legality test is the room's OWN _push_blocked(). The player's
# reachability is the conservative lattice described at the top of this file.
# Orderlies are parked outside the room for the search: they are a timing
# hazard, not a topological one — they never stop moving, so no cell is
# permanently denied by one, and the room excludes them from the crate's
# collider set anyway. That is an ASSUMPTION, stated rather than hidden.
func _test_soft_lock_enumeration() -> void:
	var t0 := Time.get_ticks_msec()
	var f := _make_room()
	var room: Node3D = f["room"]
	var main: StubMain = f["main"]

	# Orderlies out of the topology entirely — see above.
	room._orderly_a = null
	room._orderly_b = null

	_exit_idx = _idx(_i_of(0.0), _j_of(-18.95))

	# Snapshot the geometry in each gate configuration the room can be in.
	# Gate 2 cannot latch before gate 1 (the crate cannot reach plate2 without
	# crossing the gate 1 gap), so there are three, and they are monotone.
	room._set_crate_cell(500.0, 500.0)  # the crate must not pollute the static map
	_snapshot_config(room, main, 0)
	room._open_gate(1)
	_snapshot_config(room, main, 1)
	room._open_gate(2)
	_snapshot_config(room, main, 3)
	room._set_crate_cell(room.REST_CELL.x, room.REST_CELL.y)

	_check((_free_static[3] as PackedByteArray)[_exit_idx] == 1,
		"setup: the exit doorway must be a free standing point once GATE_2 is open")

	# --- forward search ---
	var start_idx := _nearest_free(0, 0.0, 5.0)
	_check(start_idx >= 0, "setup: spawn must be a free standing point")
	var start_lab := _label(0, 2, 1)
	var start := "0:2:1:%d" % _rep_of(start_lab, start_idx)

	var states := {}          # key -> {cfg, cx, cz, rep}
	var edges: Array = []     # [from_key, to_key]
	var queue: Array = [start]
	states[start] = _parse_state(start)

	while not queue.is_empty():
		var key: String = queue.pop_back()
		var st: Dictionary = states[key]
		var cfg: int = st["cfg"]
		var cx: int = st["cx"]
		var cz: int = st["cz"]
		var rep: int = st["rep"]
		var lab := _label(cfg, cx, cz)

		for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
			var nx := cx + d.x
			var nz := cz + d.y
			if not _cell_ok(cfg, nx, nz):
				continue
			var stances := _stances_for(lab, rep, cx, cz, d)
			if stances.is_empty():
				continue
			var ncfg := cfg
			if nx == int(PLATE1_CELL.x) and nz == int(PLATE1_CELL.y):
				ncfg |= 1
			if nx == int(PLATE2_CELL.x) and nz == int(PLATE2_CELL.y):
				ncfg |= 2
			var nlab := _label(ncfg, nx, nz)
			var seen := {}
			for p_idx: int in stances:
				var nrep := _rep_of(nlab, p_idx)
				if nrep < 0 or seen.has(nrep):
					continue
				seen[nrep] = true
				var nkey := "%d:%d:%d:%d" % [ncfg, nx, nz, nrep]
				if not states.has(nkey):
					states[nkey] = _parse_state(nkey)
					queue.push_back(nkey)
				edges.append([key, nkey])

	# --- which states are already finished, and which can get there ---
	var goals := {}
	var cells := {}
	for key: String in states:
		var st: Dictionary = states[key]
		cells["%d:%d" % [st["cx"], st["cz"]]] = true
		var lab := _label(st["cfg"], st["cx"], st["cz"])
		if lab[_exit_idx] != BLOCKED and lab[_exit_idx] == st["rep_id"]:
			goals[key] = true

	_check(not goals.is_empty(),
		"THE ROOM MUST BE WINNABLE AT ALL: no reachable state reaches the exit")

	var rev := {}
	for e: Array in edges:
		if not rev.has(e[1]):
			rev[e[1]] = []
		(rev[e[1]] as Array).append(e[0])

	var can_finish := {}
	var back: Array = goals.keys()
	for g: String in back:
		can_finish[g] = true
	while not back.is_empty():
		var key: String = back.pop_back()
		for prev: String in rev.get(key, []):
			if not can_finish.has(prev):
				can_finish[prev] = true
				back.push_back(prev)

	var stuck: Array = []
	for key: String in states:
		if not can_finish.has(key):
			stuck.append(key)
	stuck.sort()

	_check(stuck.is_empty(),
		"NO UNRECOVERABLE STATE: %d of %d reachable states cannot reach the exit "
		% [stuck.size(), states.size()]
		+ "(first few: %s)" % str(stuck.slice(0, 6)))

	# Every push must also be individually reversible — the structural argument
	# the design doc makes, checked rather than asserted. A push A->B is
	# reversible when the player can reach a stance that pushes B back to A.
	var irreversible: Array = []
	for e: Array in edges:
		var a: Dictionary = states[e[0]]
		var b: Dictionary = states[e[1]]
		var d := Vector2i(b["cx"] - a["cx"], b["cz"] - a["cz"])
		var back_lab := _label(b["cfg"], b["cx"], b["cz"])
		if _stances_for(back_lab, b["rep_id"], b["cx"], b["cz"],
				Vector2i(-d.x, -d.y)).is_empty():
			irreversible.append("%s -> %s" % [e[0], e[1]])
	notes.append("pushes with no immediate reverse: %d of %d"
		% [irreversible.size(), edges.size()])

	# Two-wall corners: the only shape single-crate sokoban can actually
	# dead-end on. There should be none in the reachable set.
	var corners: Array = []
	for ck: String in cells:
		var parts := ck.split(":")
		var cx := int(parts[0])
		var cz := int(parts[1])
		var blocked_x := 0
		var blocked_z := 0
		for d in [Vector2i(1, 0), Vector2i(-1, 0)]:
			if not _cell_ok(3, cx + d.x, cz):
				blocked_x += 1
		for d in [Vector2i(0, 1), Vector2i(0, -1)]:
			if not _cell_ok(3, cx, cz + d.y):
				blocked_z += 1
		if blocked_x > 0 and blocked_z > 0:
			corners.append(ck)
	corners.sort()
	notes.append("reachable crate cells: %d; reachable states: %d; pushes: %d"
		% [cells.size(), states.size(), edges.size()])
	notes.append("reachable cells that are two-wall corners: %d %s"
		% [corners.size(), str(corners.slice(0, 8))])
	_check(corners.is_empty(),
		"NO REACHABLE CELL MAY BE A TWO-WALL CORNER — that is the one shape "
		+ "single-crate sokoban dead-ends on (%d found: %s)"
			% [corners.size(), str(corners.slice(0, 8))])

	# The named risk from the design doc, confirmed as live rather than
	# theoretical: the crate CAN be over-pushed onto Orderly A's own waypoint,
	# which is exactly why he is excluded from colliding with it.
	notes.append("crate can reach Orderly A's waypoint (-2,-2): %s"
		% str(cells.has("-2:-2")))

	notes.append("soft-lock enumeration took %d ms" % (Time.get_ticks_msec() - t0))
	_teardown(f)


func _parse_state(key: String) -> Dictionary:
	var p := key.split(":")
	return {"cfg": int(p[0]), "cx": int(p[1]), "cz": int(p[2]), "rep": int(p[3]),
		"rep_id": int(p[3])}


## Record the static lattice and the legal-crate-cell map for one gate config.
func _snapshot_config(room: Node3D, main: StubMain, cfg: int) -> void:
	var col: WardCollision = main.collision
	var free := PackedByteArray()
	free.resize(LAT_NX * LAT_NZ)
	for j in LAT_NZ:
		var z := LAT_Z0 + float(j) * LAT
		for i in LAT_NX:
			var x := LAT_X0 + float(i) * LAT
			free[j * LAT_NX + i] = 0 if col.is_blocked_at(x, z, _player_r,
				StateManager.State.UNMED) else 1
	_free_static[cfg] = free

	var legal := PackedByteArray()
	legal.resize(CELL_W * (CELL_MAX_Z - CELL_MIN_Z + 1))
	for cz in range(CELL_MIN_Z, CELL_MAX_Z + 1):
		for cx in range(CELL_MIN_X, CELL_MAX_X + 1):
			legal[_cell_idx(cx, cz)] = 0 if room._push_blocked(float(cx), float(cz),
				StateManager.State.UNMED) else 1
	_cell_legal[cfg] = legal


func _cell_idx(cx: int, cz: int) -> int:
	return (cz - CELL_MIN_Z) * CELL_W + (cx - CELL_MIN_X)


func _cell_ok(cfg: int, cx: int, cz: int) -> bool:
	if cx < CELL_MIN_X or cx > CELL_MAX_X or cz < CELL_MIN_Z or cz > CELL_MAX_Z:
		return false
	return (_cell_legal[cfg] as PackedByteArray)[_cell_idx(cx, cz)] == 1


func _i_of(x: float) -> int:
	return int(round((x - LAT_X0) / LAT))


func _j_of(z: float) -> int:
	return int(round((z - LAT_Z0) / LAT))


func _idx(i: int, j: int) -> int:
	return j * LAT_NX + i


func _nearest_free(cfg: int, x: float, z: float) -> int:
	var free: PackedByteArray = _free_static[cfg]
	var best := -1
	var best_d := INF
	for j in LAT_NZ:
		for i in LAT_NX:
			if free[j * LAT_NX + i] == 0:
				continue
			var dx := LAT_X0 + float(i) * LAT - x
			var dz := LAT_Z0 + float(j) * LAT - z
			var d := dx * dx + dz * dz
			if d < best_d:
				best_d = d
				best = j * LAT_NX + i
	return best


## Connected-component labels for the whole floor with the crate at (cx, cz),
## in gate config `cfg`. BLOCKED where the player cannot stand. Cached: the
## search revisits the same (config, cell) pair from several directions.
func _label(cfg: int, cx: int, cz: int) -> PackedByteArray:
	var key := "%d:%d:%d" % [cfg, cx, cz]
	if _label_cache.has(key):
		return _label_cache[key]

	var free: PackedByteArray = (_free_static[cfg] as PackedByteArray).duplicate()
	# Stamp the crate, using the identical strict inflated-AABB test
	# WardCollision.is_blocked_at applies to every other box.
	var lo_x := float(cx) - CRATE_HALF - _player_r
	var hi_x := float(cx) + CRATE_HALF + _player_r
	var lo_z := float(cz) - CRATE_HALF - _player_r
	var hi_z := float(cz) + CRATE_HALF + _player_r
	var i0 := maxi(0, _i_of(lo_x) - 1)
	var i1 := mini(LAT_NX - 1, _i_of(hi_x) + 1)
	var j0 := maxi(0, _j_of(lo_z) - 1)
	var j1 := mini(LAT_NZ - 1, _j_of(hi_z) + 1)
	for j in range(j0, j1 + 1):
		var z := LAT_Z0 + float(j) * LAT
		if z <= lo_z or z >= hi_z:
			continue
		for i in range(i0, i1 + 1):
			var x := LAT_X0 + float(i) * LAT
			if x > lo_x and x < hi_x:
				free[j * LAT_NX + i] = 0

	var lab := PackedByteArray()
	lab.resize(LAT_NX * LAT_NZ)
	for n in lab.size():
		lab[n] = BLOCKED

	var next_id := 0
	var queue := PackedInt32Array()
	for seed in lab.size():
		if free[seed] == 0 or lab[seed] != BLOCKED:
			continue
		var id := next_id
		next_id += 1
		if next_id >= BLOCKED:
			push_error("room20 test: more than 254 floor components")
			break
		queue.clear()
		queue.append(seed)
		lab[seed] = id
		var head := 0
		while head < queue.size():
			var n: int = queue[head]
			head += 1
			var i := n % LAT_NX
			if i > 0 and free[n - 1] == 1 and lab[n - 1] == BLOCKED:
				lab[n - 1] = id
				queue.append(n - 1)
			if i < LAT_NX - 1 and free[n + 1] == 1 and lab[n + 1] == BLOCKED:
				lab[n + 1] = id
				queue.append(n + 1)
			if n >= LAT_NX and free[n - LAT_NX] == 1 and lab[n - LAT_NX] == BLOCKED:
				lab[n - LAT_NX] = id
				queue.append(n - LAT_NX)
			if n + LAT_NX < lab.size() and free[n + LAT_NX] == 1 \
					and lab[n + LAT_NX] == BLOCKED:
				lab[n + LAT_NX] = id
				queue.append(n + LAT_NX)

	_label_cache[key] = lab
	return lab


func _rep_of(lab: PackedByteArray, idx: int) -> int:
	var v: int = lab[idx]
	return -1 if v == BLOCKED else v


## Every lattice point in component `rep` from which a press would push the
## crate at (cx, cz) in direction `d`. Mirrors _try_push's derivation exactly:
## within PUSH_REACH_M of the centre, larger axis wins, away from the player.
func _stances_for(lab: PackedByteArray, rep: int, cx: int, cz: int,
		d: Vector2i) -> Array:
	var out: Array = []
	var i0 := maxi(0, _i_of(float(cx) - REACH))
	var i1 := mini(LAT_NX - 1, _i_of(float(cx) + REACH))
	var j0 := maxi(0, _j_of(float(cz) - REACH))
	var j1 := mini(LAT_NZ - 1, _j_of(float(cz) + REACH))
	for j in range(j0, j1 + 1):
		var pz := LAT_Z0 + float(j) * LAT
		for i in range(i0, i1 + 1):
			var n := j * LAT_NX + i
			if lab[n] != rep:
				continue
			var px := LAT_X0 + float(i) * LAT
			var dx := float(cx) - px
			var dz := float(cz) - pz
			if sqrt(dx * dx + dz * dz) > REACH:
				continue
			var sx := 0.0
			var sz := 0.0
			if absf(dx) >= absf(dz):
				sx = signf(dx)
			else:
				sz = signf(dz)
			if int(sx) == d.x and int(sz) == d.y and (d.x != 0 or d.y != 0):
				out.append(n)
	return out


# --- 8. the intended solve -------------------------------------------------

# The route from the design doc, press by press, on the real room: crate to
# PLATE_1, through GATE_1, out to COVER_A, retrieved, down the causeway, out to
# COVER_B, retrieved, straight down x=1 onto PLATE_2. Both gates open exactly
# when the crate seats a plate and never at any other time.
func _test_intended_solve() -> void:
	var f := _make_room()
	var room: Node3D = f["room"]

	var route: Array = [
		# [stand x, stand z, expected cell]
		[3.0, 1.0, Vector2(1, 1)],       # onto PLATE_1 — GATE_1 latches
		[2.0, 1.0, Vector2(0, 1)],
		[0.0, 2.0, Vector2(0, 0)],       # into the gap
		[0.0, 1.0, Vector2(0, -1)],      # through into Z2
		[0.0, 0.0, Vector2(0, -2)],
		[1.0, -2.0, Vector2(-1, -2)],    # COVER_A
		[-2.0, -2.0, Vector2(0, -2)],    # retrieved
		[0.0, -1.0, Vector2(0, -3)],
		[0.0, -2.0, Vector2(0, -4)],
		[0.0, -3.0, Vector2(0, -5)],
		[0.0, -4.0, Vector2(0, -6)],
		[0.0, -5.0, Vector2(0, -7)],
		[0.0, -6.0, Vector2(0, -8)],
		[0.0, -7.0, Vector2(0, -9)],
		[-1.0, -9.0, Vector2(1, -9)],    # COVER_B
		[1.0, -8.0, Vector2(1, -10)],    # retrieved, straight run down x=1
		[1.0, -9.0, Vector2(1, -11)],
		[1.0, -10.0, Vector2(1, -12)],
		[1.0, -11.0, Vector2(1, -13)],
		[1.0, -12.0, Vector2(1, -14)],
		[1.0, -13.0, Vector2(1, -15)],   # onto PLATE_2 — GATE_2 latches
	]

	var step := 0
	for leg: Array in route:
		step += 1
		var got := _push_from(f, leg[0], leg[1])
		room._physics_process(TICK)
		if got != leg[2]:
			_check(false, "intended solve, push %d: expected the crate at %s, got %s"
				% [step, str(leg[2]), str(got)])
			break
		if step == 1:
			_check(room.is_gate_open(1), "GATE_1 must latch on the very push that seats PLATE_1")
		elif step < route.size():
			_check(not room.is_gate_open(2),
				"GATE_2 must stay shut for the whole route until PLATE_2 is seated "
				+ "(it was open at push %d)" % step)

	_check(room.crate_cell() == PLATE2_CELL, "the route must end with the crate on PLATE_2")
	_check(room.is_gate_open(2), "and GATE_2 must latch open")

	# The crate's job is done and the vestibule is walkable end to end.
	var col: WardCollision = (f["main"] as StubMain).collision
	var walkable := true
	for j in 60:
		var z := -16.5 - float(j) * 0.04
		if col.is_blocked_at(0.0, z, Tuning.PLAYER_RADIUS, StateManager.State.UNMED):
			walkable = false
	_check(walkable,
		"with GATE_2 open the causeway from the gap to the doorway must be "
		+ "walkable end to end")

	_teardown(f)


# --- 9. THE CRATE IS ACTUALLY COVER ---------------------------------------
#
# The crate's second job, and the only one no other test touches. It is also
# the one thing about this room that does NOT port across engines by itself.
#
# src/game/orderly.ts tested occlusion as a zero-width XZ segment against a
# hand-authored occluder list — a 2D test that never looked at height, so a
# 0.86m crate blocked sight because the author said it did. Orderly._occluded()
# here casts a real RayCast3D from his eye (y 1.5) to the player's (y 1.62). A
# faithfully-ported 0.86m cube is a box that line passes straight over: the
# crate would still open both gates, still block movement, still read correctly
# in every screenshot, and would silently not be cover at all. The middle act
# of the room would be missing and nothing else in this suite would notice.
#
# So this is a runtime probe of the real sight path, at the two cover cells the
# design doc picks, with the control case (crate one cell off the line) run
# alongside so a pass cannot come from the ray hitting something else.
func _test_the_crate_is_actually_cover() -> void:
	var f := _make_room()
	var room: Node3D = f["room"]
	var player: Node3D = f["player"]

	# Static bodies have to be registered with the physics space before a
	# raycast can hit them.
	await get_tree().physics_frame
	await get_tree().physics_frame

	var a: Node3D = room._orderly_a
	var b: Node3D = room._orderly_b

	# COVER_A: his danger leg is the whole line z=-2, x in [-5,-2]; the player
	# crosses at (0,-2). Any sightline between them runs along z=-2 and through
	# x=-1, which is exactly the cell the design doc parks the crate in.
	a.global_position = Vector3(-3.0, 0.0, -2.0)
	player.global_position = Vector3(0.0, 0.0, -2.0)
	room._set_crate_cell(2, 1)
	_check(not a._occluded(),
		"control: with the crate back in Z1 the causeway crossing must be in "
		+ "the clear, or this probe proves nothing")

	room._set_crate_cell(-1, -2)
	_check(a._occluded(),
		"COVER_A MUST BE COVER: the crate on (-1,-2) has to break the sightline "
		+ "from Orderly A's danger leg to the crossing point. A 0.86m cube does "
		+ "NOT — occlusion here is a real ray between eye heights, not the TS "
		+ "build's 2D segment test")

	room._set_crate_cell(-1, -3)
	_check(not a._occluded(),
		"and one cell off the line it must stop being cover — otherwise the "
		+ "ray is hitting something that is not the crate")

	# COVER_B, mirrored against Orderly B's z=-9 leg.
	b.global_position = Vector3(3.0, 0.0, -9.0)
	player.global_position = Vector3(0.0, 0.0, -9.0)
	room._set_crate_cell(2, 1)
	_check(not b._occluded(), "control: the z=-9 crossing is clear with the crate away")
	room._set_crate_cell(1, -9)
	_check(b._occluded(), "COVER_B MUST BE COVER, on the same terms")

	# ISLAND_C is authored as an occluder too, and is subject to the identical
	# rule — it was 1.0m tall in the TS build and would have been scenery here.
	room._set_crate_cell(2, 1)
	a.global_position = Vector3(5.0, 0.0, -5.5)
	player.global_position = Vector3(0.0, 0.0, -5.5)
	_check(a._occluded(),
		"ISLAND_C must occlude too — it is authored as static cover and is "
		+ "subject to the same eye-height rule the crate is")

	# And the crate must never occlude from BELOW the ray: a crouch-height box
	# is the failure mode this whole test exists to catch, so assert the
	# authored height directly as well.
	var shape: CollisionShape3D = room.get_node("Geometry/Crate/Shape")
	var box: BoxShape3D = shape.shape
	_check(box.size.y > Tuning.PLAYER_EYE_HEIGHT,
		"the crate must stand taller than the player's 1.62m eye or it cannot "
		+ "break a sightline at all (authored %.2fm)" % box.size.y)
	_check(is_equal_approx(box.size.x, 0.86) and is_equal_approx(box.size.z, 0.86),
		"but its FOOTPRINT must stay exactly 0.86m — every clearance number in "
		+ "the room is derived from it")

	_teardown(f)


func _finish() -> void:
	print("")
	print("test_room20: %d assertion(s) passed" % passes)
	for n in notes:
		print("  note  %s" % n)
	if failures.is_empty():
		print("  OK - room 20's push blocks, plates, gates and soft-lock proof hold")
	else:
		for fail in failures:
			print("  FAIL  %s" % fail)
		print("  %d failure(s)" % failures.size())
	print("")
	get_tree().quit(0 if failures.is_empty() else 1)
