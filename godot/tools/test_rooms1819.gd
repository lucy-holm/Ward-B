# Behavioural tests for ROOMS 18 + 19 — the Relay Room and the Undercroft.
#
#   godot --headless --path godot tools/test_rooms1819.tscn
#
# The pair is one unit: room 18's only action writes a flag, and room 19 IS
# that flag — two authored scenes, one of which the player never sees. So the
# things worth proving are the ones that span the two rooms, plus the one
# promise a branch makes that a screenshot cannot show:
#
#   1. THE FLAG ROUTES. main.gd resolves "room19" to the doors scene for
#      "doors", the lights scene for "lights", and the SAFER lights scene for
#      unset or garbage — and leaves every other room id alone.
#   2. THE FLAG HAS THE RIGHT LIFETIME. Per run, cleared by reset_run(),
#      untouched by a catch.
#   3. BOTH VARIANTS ARE INTERNALLY CONSISTENT. Spawn clear in both states,
#      exits resolve, patrol legs clear at his body radius, no state-filtered
#      collider anywhere, no fitting sealed inside geometry, unique ids.
#   4. THE LIGHTS PLATFORM IS GENUINELY UNSEEABLE. Not "the layout looks
#      right": his real patrol route is sampled every 20cm against the real
#      walkable platform surface every 30cm, and every in-range pair is fed to
#      the REAL RayCast3D the Orderly occludes with — with his facing cone
#      deliberately ignored, so the result holds against an orderly who could
#      look every way at once. With a positive control, because a prober that
#      always says "no" proves nothing.
#   5. THROWING ONE LEVER REALLY DOES REMOVE THE OTHER. The loser is freed,
#      both stop being interactable, the flag is written once and cannot be
#      rewritten, and the exit door goes from SOLID to WALKABLE in the
#      collision cache the movement solver actually queries — because
#      StateObject does not flip collision layers and a screenshot of a swung
#      door proves nothing.
#   6. YOU CAN ACTUALLY WALK IT. A flood fill at the player's real body radius:
#      room 18's exit is UNREACHABLE while the relay is untouched and reachable
#      once it moves (the room's only gate, both halves of it), and both builds
#      of room 19 are walkable spawn to exit in both ward states.
#   7. THE THREE PLACES A PLAYER STANDS STILL ARE SAFE THROUGH A FULL PATROL
#      CYCLE. Room 18's two levers and both builds' vestibule dispensers are
#      NOT protected by the categorical argument in (4) — they are protected
#      by real geometry plus his facing — so they are proved the honest way,
#      by parking a player there and running his entire loop.
extends Node

const MAIN := preload("res://main.gd")
const ROOM18 := preload("res://rooms/room18/room18.tscn")
const R19_LIGHTS := preload("res://rooms/room19_lights/room19_lights.tscn")
const R19_DOORS := preload("res://rooms/room19_doors/room19_doors.tscn")
const STUB_PLAYER := preload("res://tools/test_stub_player.gd")

const TICK := 1.0 / 60.0

const LIGHTS_PATH := "res://rooms/room19_lights/room19_lights.tscn"
const DOORS_PATH := "res://rooms/room19_doors/room19_doors.tscn"
const POWER_FLAG := "room18.power"

# Room 18's exit doorway: the gap in the north cap, and a point dead centre.
const DOOR_X := 0.0
const DOOR_Z := -7.0

var failures: Array[String] = []
var passes := 0


# The narrow slice of main.gd a room script is allowed to touch. Records what
# the room asked for instead of doing it to a real HUD.
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

	func move_interactable(id: String, pos: Vector3, rot_y := 0.0) -> void:
		var node := _find(room, id)
		if node != null:
			node.global_position = pos
			node.rotation.y = rot_y

	# Faithful to main.gd: the fixture is QUEUE_FREED, not hidden. That is the
	# whole point of the assertion it backs.
	func remove_interactable(id: String) -> void:
		var node := _find(room, id)
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

	_test_variant_routing()
	_test_flag_lifetime()
	_test_room18_authoring()
	await _test_room18_the_throw()
	_test_room19_authoring()
	_test_lights_verticality_and_enclosure()
	await _test_platform_is_unseeable()
	await _test_standing_still_is_safe()
	_test_you_can_walk_it()
	_finish()


func _check(cond: bool, what: String) -> void:
	if cond:
		passes += 1
	else:
		failures.append(what)


func _close(a: float, b: float, what: String, eps := 0.0001) -> void:
	_check(absf(a - b) < eps, "%s (got %f, want %f)" % [what, a, b])


# --- 1. the flag routes ----------------------------------------------------

# The whole cross-room mechanism, at the one place it is expressed. This is
# main.gd's room_scene_path() run directly, not a re-implementation of it.
func _test_variant_routing() -> void:
	var m: Node = MAIN.new()

	GameState.flags.clear()
	_check(m.room_scene_path("room19") == LIGHTS_PATH,
		"UNSET flag must degrade to the SAFER branch — an edge case (a fresh "
		+ "load, a debug jump, a future non-linear entry) must never drop the "
		+ "player into the dark corridor by accident")

	GameState.set_flag(POWER_FLAG, "doors")
	_check(m.room_scene_path("room19") == DOORS_PATH,
		"'doors' must route to the doors scene")

	GameState.set_flag(POWER_FLAG, "lights")
	_check(m.room_scene_path("room19") == LIGHTS_PATH,
		"'lights' must route to the lights scene")

	GameState.set_flag(POWER_FLAG, "sideways")
	_check(m.room_scene_path("room19") == LIGHTS_PATH,
		"an unrecognised flag value must fail SAFE, not crash and not load "
		+ "nothing")

	# Everything else is untouched by the variant path.
	GameState.flags.clear()
	_check(m.room_scene_path("room1") == str(MAIN.ROOM_SCENES["room1"]),
		"a non-variant room id must still be a plain ROOM_SCENES lookup")
	_check(m.room_scene_path("no_such_room") == "",
		"an unknown id must still resolve to '' so load_room's push_error fires")

	# Both variant scenes must actually exist on disk — a typo in the table is
	# otherwise a black screen at the one moment in the game that cannot be
	# retried.
	for path in [LIGHTS_PATH, DOORS_PATH]:
		_check(ResourceLoader.exists(path), "variant scene %s must exist" % path)

	m.free()


func _test_flag_lifetime() -> void:
	GameState.flags.clear()
	_check(not GameState.has_flag(POWER_FLAG), "a fresh run holds no relay flag")
	_check(str(GameState.get_flag(POWER_FLAG, "lights")) == "lights",
		"get_flag's fallback is what makes the room19 default work")

	GameState.set_flag(POWER_FLAG, "doors")
	_check(GameState.has_flag(POWER_FLAG), "the flag is written")

	# A NEW RUN must not inherit the last one's undercroft. This is the whole
	# reason the flag lives on GameState rather than in Settings (persisted to
	# disk) — a per-install choice would be a different game.
	GameState.reset_run()
	_check(not GameState.has_flag(POWER_FLAG),
		"reset_run() must clear the relay flag — a second playthrough must not "
		+ "inherit the first one's room 19")


# --- fixtures --------------------------------------------------------------

## A live room with a stub main behind it, wired as main.gd would wire one.
func _make(scene: PackedScene, spawn: Vector3) -> Dictionary:
	var world := Node3D.new()
	add_child(world)

	var player: Node3D = Node3D.new()
	player.set_script(STUB_PLAYER)
	add_child(player)
	player.global_position = spawn

	var room: Node3D = scene.instantiate()
	world.add_child(room)

	var main := StubMain.new()
	main.player = player
	main.room = room
	main.collision = WardCollision.new()
	main.levels = WardLevels.new()
	add_child(main)
	main.collision.rebuild_from(room)
	main.levels.rebuild_from(room)

	room.on_enter(main)
	return {"world": world, "room": room, "player": player, "main": main}


func _teardown(f: Dictionary) -> void:
	(f["world"] as Node).queue_free()
	(f["player"] as Node).queue_free()
	(f["main"] as Node).queue_free()


func _load(scene: PackedScene) -> Node3D:
	var room: Node3D = scene.instantiate()
	add_child(room)
	return room


func _drop(room: Node) -> void:
	remove_child(room)
	room.free()


func _collision_of(room: Node) -> WardCollision:
	var col := WardCollision.new()
	col.rebuild_from(room)
	return col


func _interactables(node: Node, out: Array) -> void:
	if node is Interactable:
		out.append(node)
	for child in node.get_children():
		_interactables(child, out)


func _ids_and_types(room: Node) -> Dictionary:
	var list: Array = []
	_interactables(room, list)
	var ids: Array = []
	var types: Array = []
	for i in list:
		ids.append((i as Interactable).interactable_id)
		types.append((i as Interactable).interactable_type)
	return {"ids": ids, "types": types}


func _exit_targets(room: Node) -> Array:
	var out: Array = []
	var exits := room.get_node_or_null("Exits")
	if exits == null:
		return out
	for child in exits.get_children():
		if child is RoomExit:
			out.append(str((child as RoomExit).exit_to))
	return out


# --- 2. room 18, as authored ----------------------------------------------

func _test_room18_authoring() -> void:
	var room := _load(ROOM18)
	var col := _collision_of(room)

	var spawn: Node3D = room.get_node_or_null("Spawn")
	_check(spawn != null, "room18 must have a Spawn marker")
	if spawn != null:
		for state in [StateManager.State.UNMED, StateManager.State.LUCID]:
			_check(not col.is_blocked_at(spawn.global_position.x, spawn.global_position.z,
					Tuning.PLAYER_RADIUS, state),
				"room18 spawn must be clear in both states")

	# NO CODES. The design is one irreversible switch and deliberately nothing
	# else; a keypad here would give the room a second lock and a second lesson.
	var it := _ids_and_types(room)
	_check(not (it["types"] as Array).has("keypad"),
		"room 18 has NO keypad: the throw IS the lock")
	_check((it["ids"] as Array).has("leverLights") and (it["ids"] as Array).has("leverDoors"),
		"both relay levers must exist")
	_check((it["ids"] as Array).has("dispenser18"),
		"the Z1 dispenser is what makes the 0-pill arrival safe")
	_check((it["types"] as Array).count("switch") == 2,
		"the levers must be the breaker-switch fixture, not keypad panels — the "
		+ "TS build shipped them as pads and they read as inert wall furniture")

	var seen := {}
	for id in it["ids"]:
		_check(not seen.has(id), "duplicate interactable id '%s' in room18" % id)
		seen[id] = true

	# EXIT, keyed off the registry rather than hard-coded: the assertion that
	# matters is that room 18's target RESOLVES through the variant mechanism,
	# which is the thing this branch owns.
	var targets := _exit_targets(room)
	_check(targets.size() == 1 and targets[0] == "room19",
		"room18 must exit to room19 (got %s)" % str(targets))
	var m: Node = MAIN.new()
	GameState.flags.clear()
	_check(m.room_scene_path("room19") != "",
		"and that target must resolve to a real scene through ROOM_VARIANTS, "
		+ "whether or not room19 is registered in ROOM_SCENES yet")
	m.free()

	# NO STATE-FILTERED GEOMETRY ANYWHERE. The soft-lock audit is unconditional
	# only because of this: with no unmed-sealed collider, a medication revert
	# can never embed the player, wherever they are standing.
	for b in col.boxes:
		_check(b.state_filter == -1,
			"room18 must carry no state-filtered collider (found one at "
			+ "x[%.2f,%.2f] z[%.2f,%.2f])" % [b.min_x, b.max_x, b.min_z, b.max_z])

	# No fitting sealed inside geometry (room 12 shipped one, costing a full
	# cube-map render per frame to light the inside of a wall).
	var lights := room.get_node_or_null("Lights")
	_check(lights != null, "room18 must have fittings")
	if lights != null:
		for light in lights.get_children():
			var p: Vector3 = (light as Node3D).position
			_check(not col.is_blocked_at(p.x, p.z, 0.0, StateManager.State.UNMED),
				"fitting %s sits inside solid geometry at (%.2f, %.2f)"
					% [light.name, p.x, p.z])

	# PATROL CLEARANCE, the port of kit.patrol()'s validator: he spawns on
	# waypoint 0 and an embedded waypoint freezes him outright.
	_check_patrol("room18", room.WAYPOINTS, col)

	_drop(room)


## Every waypoint and every leg, at his body radius plus the house margin.
func _check_patrol(who: String, pts: Array, col: WardCollision) -> void:
	var need := Tuning.ORDERLY_RADIUS + 0.1
	for i in pts.size():
		var a: Vector3 = pts[i]
		var b: Vector3 = pts[(i + 1) % pts.size()]
		var blocked := 0
		for s in 201:
			var t := float(s) / 200.0
			var x := lerpf(a.x, b.x, t)
			var z := lerpf(a.z, b.z, t)
			if col.is_blocked_at(x, z, need, StateManager.State.UNMED):
				blocked += 1
		_check(blocked == 0,
			"%s: patrol leg %d->%d is not clear at %.2fm (%d/201 samples blocked) "
				% [who, i, (i + 1) % pts.size(), need, blocked]
			+ "— this is the wedge bug: he clips a corner mid-leg and grinds there")


# --- 3. the throw ----------------------------------------------------------

# THE ROOM'S ONE INVARIANT: it only moves once. Everything here is about the
# throw being a one-way door, in the flag, in the scene tree and in the
# collision cache.
func _test_room18_the_throw() -> void:
	var f := _make(ROOM18, Vector3(0, 0, 4))
	var room: Node3D = f["room"]
	var main: StubMain = f["main"]
	GameState.flags.clear()
	room._thrown = ""
	room._seal_door()

	# BEFORE: the doorway is SOLID. Asserted against the collision cache the
	# movement solver queries, in both states — StateObject does not flip
	# collision layers, so nothing visual could stand in for this.
	for state in [StateManager.State.UNMED, StateManager.State.LUCID]:
		_check(main.collision.is_blocked_at(DOOR_X, DOOR_Z, Tuning.PLAYER_RADIUS, state),
			"the exit door must be SOLID before the relay moves — otherwise a "
			+ "player walks past the room's entire point and room 19 silently "
			+ "builds its default branch")
	_check(not room.is_door_open(), "and the room agrees it is shut")

	# Both levers are live, in EITHER ward state: the wing is audited to cost
	# zero pills beyond the belt crossing, so the throw cannot be lucid-gated.
	_check(room._is_available("leverLights") and room._is_available("leverDoors"),
		"both levers must be throwable on arrival")
	_check(not room._is_available("exitdoor18"),
		"the door itself is never interactable — the lever is the key")

	# THE THROW.
	var handled: bool = room.on_interact("leverLights")
	_check(handled, "the room script must handle the lever press itself")
	_check(str(GameState.get_flag(POWER_FLAG, "")) == "lights",
		"the throw must write room18.power — this is the only thing room 18 "
		+ "leaves behind, and room 19 is built from it")

	# THE LOSER COMES OFF THE WALL. queue_free, not hidden: a hidden fixture is
	# still raycastable in this engine (see core/interactable.gd's header).
	await get_tree().process_frame
	var after: Array = []
	_interactables(room, after)
	var ids_after: Array = []
	for i in after:
		ids_after.append((i as Interactable).interactable_id)
	_check(not ids_after.has("leverDoors"),
		"THE LEVER YOU DID NOT PICK MUST BE GONE FROM THE TREE, not merely "
		+ "unavailable — this is the one irreversible fixture in the game")
	_check(ids_after.has("leverLights"), "and the one you threw stays on the wall")

	# It stops being a prompt, too.
	_check(not room._is_available("leverLights") and not room._is_available("leverDoors"),
		"neither lever may offer a prompt once the relay has moved")

	# The handle visibly dropped. fixtures/switch.tscn exposes the lever as its
	# own pivot node precisely so this is one property, and therefore testable.
	var lever_node: Node3D = null
	for i in after:
		if (i as Interactable).interactable_id == "leverLights":
			lever_node = (i as Node).get_node_or_null("Model/Lever") as Node3D
	_check(lever_node != null, "the switch fixture must expose Model/Lever")
	if lever_node != null:
		_close(lever_node.rotation.x, room.THROWN_ROT_X,
			"the thrown handle must be swung, not left standing", 0.001)

	# AFTER: the doorway is WALKABLE, in both states.
	for state in [StateManager.State.UNMED, StateManager.State.LUCID]:
		_check(not main.collision.is_blocked_at(DOOR_X, DOOR_Z, Tuning.PLAYER_RADIUS, state),
			"the exit door must be WALKABLE once the relay has moved")
	_check(room.is_door_open(), "and the room agrees it is open")

	# IRREVERSIBILITY, from the other side: pressing the lever that is already
	# gone (or the one that is left) cannot rewrite the choice.
	room.on_interact("leverDoors")
	room.on_interact("leverLights")
	_check(str(GameState.get_flag(POWER_FLAG, "")) == "lights",
		"a second press must not re-decide the wing — the throw IS the confirm, "
		+ "and there is no undo anywhere in this room")

	# A CATCH MUST NOT RE-LITIGATE IT. A catch teleports; it does not reload,
	# so on_enter never re-runs and the room stays a room where you decided.
	room._on_caught()
	await get_tree().process_frame
	_check(str(GameState.get_flag(POWER_FLAG, "")) == "lights",
		"a catch must leave the flag set")
	_check(room.is_door_open(), "and the door open")
	_check(str(room.thrown()) == "lights", "and the room's own memory of it intact")
	_check(not main.teleports.is_empty(), "the catch teleports the player to spawn")

	_teardown(f)

	# And the mirror image, so nothing about the above is specific to 'lights'.
	var f2 := _make(ROOM18, Vector3(0, 0, 4))
	var room2: Node3D = f2["room"]
	GameState.flags.clear()
	room2._thrown = ""
	room2._seal_door()
	room2.on_interact("leverDoors")
	_check(str(GameState.get_flag(POWER_FLAG, "")) == "doors",
		"throwing the other lever writes the other value")
	await get_tree().process_frame
	var after2: Array = []
	_interactables(room2, after2)
	var ids2: Array = []
	for i in after2:
		ids2.append((i as Interactable).interactable_id)
	_check(not ids2.has("leverLights") and ids2.has("leverDoors"),
		"and removes the other lever, symmetrically")
	_check((f2["main"] as StubMain).collision.is_blocked_at(
			DOOR_X, DOOR_Z, Tuning.PLAYER_RADIUS, StateManager.State.UNMED) == false,
		"and opens the same door")
	_teardown(f2)
	GameState.flags.clear()


# --- 4. room 19, both builds ----------------------------------------------

func _test_room19_authoring() -> void:
	var builds := [["lights", R19_LIGHTS], ["doors", R19_DOORS]]
	var exits_seen: Array = []

	for entry in builds:
		var name: String = entry[0]
		var room := _load(entry[1] as PackedScene)
		var col := _collision_of(room)

		var spawn: Node3D = room.get_node_or_null("Spawn")
		_check(spawn != null, "room19_%s must have a Spawn marker" % name)
		if spawn != null:
			for state in [StateManager.State.UNMED, StateManager.State.LUCID]:
				_check(not col.is_blocked_at(spawn.global_position.x, spawn.global_position.z,
						Tuning.PLAYER_RADIUS, state),
					"room19_%s spawn must be clear in both states" % name)
			# THE SHARED VESTIBULE. Both builds must open in the same place, or
			# the pair reads as two rooms rather than one room built twice.
			_close(spawn.global_position.x, -4.5, "room19_%s spawns at the shared x" % name, 0.001)
			_close(spawn.global_position.z, 3.2, "room19_%s spawns at the shared z" % name, 0.001)

		var it := _ids_and_types(room)
		_check((it["ids"] as Array).has("dispenser19"),
			"room19_%s must carry the vestibule dispenser — a 0-pill arrival "
				% name + "tops up before any hazard in EITHER build")
		_check(not (it["types"] as Array).has("keypad"),
			"room19_%s has no keypad: neither branch is lucid-gated" % name)
		var seen := {}
		for id in it["ids"]:
			_check(not seen.has(id), "duplicate interactable id '%s' in room19_%s" % [id, name])
			seen[id] = true

		# NO STATE-FILTERED COLLIDER IN EITHER BUILD. This is what makes the
		# shared soft-lock audit unconditional: crossing is always physically
		# possible unmed, so the only threat is ever the orderly.
		for b in col.boxes:
			_check(b.state_filter == -1,
				"room19_%s must carry no state-filtered collider (found one at "
					% name + "x[%.2f,%.2f] z[%.2f,%.2f])"
					% [b.min_x, b.max_x, b.min_z, b.max_z])

		var lights_node := room.get_node_or_null("Lights")
		_check(lights_node != null, "room19_%s must have fittings" % name)
		if lights_node != null:
			for light in lights_node.get_children():
				var p: Vector3 = (light as Node3D).position
				_check(not col.is_blocked_at(p.x, p.z, 0.0, StateManager.State.UNMED),
					"fitting %s in room19_%s sits inside solid geometry at (%.2f, %.2f)"
						% [light.name, name, p.x, p.z])

		_check_patrol("room19_%s" % name, room.WAYPOINTS, col)

		# The exit must be reachable — a doorway you cannot stand in is a
		# soft-lock that every other check here would pass.
		var targets := _exit_targets(room)
		_check(targets.size() == 1, "room19_%s must have exactly one exit" % name)
		if targets.size() == 1:
			exits_seen.append(targets[0])
		var exit_node := room.get_node_or_null("Exits/Exit0") as Node3D
		if exit_node != null:
			var e: Vector3 = exit_node.global_position
			for state in [StateManager.State.UNMED, StateManager.State.LUCID]:
				_check(not col.is_blocked_at(e.x, e.z, Tuning.PLAYER_RADIUS, state),
					"room19_%s's exit doorway must be walkable" % name)

		_drop(room)

	# The two builds are one room: they hand off to the same successor. Keyed
	# off the registry where it can be — the chain past room 19 is not this
	# branch's to own, so this asserts the handoff is CONSISTENT and, once the
	# successor is registered, that it resolves.
	_check(exits_seen.size() == 2 and exits_seen[0] == exits_seen[1],
		"both builds of room 19 must exit to the same room (got %s)" % str(exits_seen))
	if exits_seen.size() == 2:
		var target: String = exits_seen[0]
		_check(target == "room20", "room 19 hands off to room20 (got '%s')" % target)
		var m: Node = MAIN.new()
		if MAIN.ROOM_SCENES.has(target) or MAIN.ROOM_VARIANTS.has(target):
			_check(m.room_scene_path(target) != "",
				"'%s' is registered, so it must resolve to a scene" % target)
		m.free()


# --- 5. the lights build's verticality ------------------------------------

# TIER 1: height zones and a ramp, folded into '__flat'. They have ZERO
# collision impact, so everything that keeps a body on the platform has to be
# an ordinary authored collider — and the failure mode of getting that wrong is
# invisible in a screenshot (you walk off the edge and hover).
func _test_lights_verticality_and_enclosure() -> void:
	var room := _load(R19_LIGHTS)
	var col := _collision_of(room)
	var lv := WardLevels.new()
	lv.rebuild_from(room)
	var flat := WardLevels.FLAT_LEVEL_ID
	var y: float = room.PLATFORM_Y

	# The floor really is raised where the room says it is.
	_close(lv.floor_height_at(flat, 4.5, -5.5), y, "the platform floor is at 0.9", 0.001)
	_close(lv.floor_height_at(flat, 3.0, -2.0), y, "and so is the lip", 0.001)
	_close(lv.floor_height_at(flat, -3.0, -3.0), 0.0, "the lower floor is not", 0.001)
	# The ramp interpolates between them, and reaches BOTH ends exactly — a
	# ramp that stops short of its zone leaves a step the player cannot climb.
	_close(lv.floor_height_at(flat, 5.75, -1.0), 0.0, "the ramp meets the floor at its mouth", 0.001)
	_close(lv.floor_height_at(flat, 5.75, -3.0), y, "and the platform at its head", 0.001)
	_close(lv.floor_height_at(flat, 5.75, -2.0), y * 0.5, "and climbs linearly between", 0.001)

	# HEADROOM on the raised floor: eye height plus the platform must clear the
	# ceiling, or the breather is a place you cannot stand up in.
	_check(y + Tuning.PLAYER_EYE_HEIGHT < lv.ceiling_y,
		"the platform must have headroom (%.2f + %.2f vs ceiling %.2f)"
			% [y, Tuning.PLAYER_EYE_HEIGHT, lv.ceiling_y])

	# THE SLAB IS NOT A COLLIDER. A collider under the platform would wall it
	# off instead of holding it up — the single easiest way to build this room
	# wrong.
	_check(not col.is_blocked_at(4.5, -5.5, Tuning.PLAYER_RADIUS, StateManager.State.UNMED),
		"the platform surface must be walkable — its slab is scenery, never a collider")
	_check(not col.is_blocked_at(5.75, -2.0, Tuning.PLAYER_RADIUS, StateManager.State.UNMED),
		"and so must the ramp")

	# THE EDGE IS GUARDED. Every open edge of the raised region is a real
	# collider, so nobody steps off 0.9m of nothing.
	_check(col.is_blocked_at(2.0, -5.5, Tuning.PLAYER_RADIUS, StateManager.State.UNMED),
		"RailWest must block the platform's west edge")
	_check(col.is_blocked_at(2.0, -2.0, Tuning.PLAYER_RADIUS, StateManager.State.UNMED),
		"and the lip's west edge")
	_check(col.is_blocked_at(3.3, -1.0, Tuning.PLAYER_RADIUS, StateManager.State.UNMED),
		"RailSouth must block the lip's south edge")
	_check(col.is_blocked_at(4.5, -2.0, Tuning.PLAYER_RADIUS, StateManager.State.UNMED),
		"RampWall must stand between the lip and the ramp, which sit at "
		+ "different heights along its whole run")

	# ...and the ONE opening is genuinely open, or the platform is decorative.
	var mouth_clear := 0
	for i in 9:
		var x := lerpf(5.0, 6.5, float(i) / 8.0)
		if not col.is_blocked_at(x, -1.0, Tuning.PLAYER_RADIUS, StateManager.State.UNMED):
			mouth_clear += 1
	_check(mouth_clear >= 7,
		"the ramp mouth must be genuinely walkable (%d/9 samples clear)" % mouth_clear)

	_drop(room)


# --- 6. THE PROMISE --------------------------------------------------------

## The real sight test, MINUS THE CONE.
##
## Returns true if an orderly standing at (ox, oz) could see a player standing
## at (px, py, pz): inside his sight range AND not occluded, evaluated by the
## exact RayCast3D that Orderly._occluded() uses against the room's real
## colliders. His facing is deliberately not consulted, so a false result is a
## statement about geometry alone and holds however he happens to be looking.
func _visible(o: CharacterBody3D, player: Node3D,
		ox: float, oz: float, px: float, py: float, pz: float) -> bool:
	o.global_position = Vector3(ox, 0.0, oz)
	player.global_position = Vector3(px, py, pz)
	if Vector2(px - ox, pz - oz).length() >= o.sight_range:
		return false
	return not o._occluded()


func _sample_route(pts: Array, step: float) -> Array:
	var out: Array = []
	for i in pts.size():
		var a: Vector3 = pts[i]
		var b: Vector3 = pts[(i + 1) % pts.size()]
		var n := maxi(1, int(ceil(Vector2(b.x - a.x, b.z - a.z).length() / step)))
		for s in n:
			var t := float(s) / float(n)
			out.append(Vector2(lerpf(a.x, b.x, t), lerpf(a.z, b.z, t)))
	return out


func _sample_rect(min_x: float, max_x: float, min_z: float, max_z: float, step: float) -> Array:
	var out: Array = []
	var nx := maxi(1, int(ceil((max_x - min_x) / step)))
	var nz := maxi(1, int(ceil((max_z - min_z) / step)))
	for i in nx + 1:
		for j in nz + 1:
			out.append(Vector2(lerpf(min_x, max_x, float(i) / nx),
				lerpf(min_z, max_z, float(j) / nz)))
	return out


# THE 'lights' BRANCH'S WHOLE PROMISE, proved rather than laid out.
#
# The platform is a safe breather: a place to stand still in a game that never
# lets you. Room 17 can prove that categorically, because its levels make the
# orderly and the player different kinds of thing. This room is TIER 1 — he and
# the player share the '__flat' level — so the guarantee has to come from
# geometry, and geometry is exactly what a layout argument cannot establish.
#
# So: his real route, sampled every 20cm; the real walkable platform surface
# (inset by the player's radius from every rail and wall, because that is where
# a body can actually be), sampled every 30cm; every pair inside his 6m sight
# range fed to the real occlusion ray. Zero may come back visible.
#
# Two controls, because a prober that always says "no" would pass this
# vacuously:
#   * thousands of pairs must be IN RANGE — the platform is not saved by being
#     far away, it is saved by what stands between.
#   * an unobstructed pair at the same distance must come back VISIBLE.
func _test_platform_is_unseeable() -> void:
	var f := _make(R19_LIGHTS, Vector3(-4.5, 0, 3.2))
	var room: Node3D = f["room"]
	var player: Node3D = f["player"]
	var o: CharacterBody3D = room._orderly
	_check(o != null, "the lights build must own an orderly")
	if o == null:
		_teardown(f)
		return
	o.set_physics_process(false)
	# The physics space needs a tick before static bodies answer a raycast.
	await get_tree().physics_frame

	var y: float = room.PLATFORM_Y
	var r := Tuning.PLAYER_RADIUS
	# Walkable surface only: RailWest's inner face is x=2.12, the north wall's
	# is z=-7.88, the east wall's is x=6.88, and the platform's south edge runs
	# into the lip at z=-3. Inset by the body radius on every side.
	var surface := _sample_rect(2.12 + r, 6.88 - r, -7.88 + r, -3.0, 0.3)
	# ...plus the lip, which is part of the same guarded region and the only
	# place the breather looks down over the floor he is walking.
	surface.append_array(_sample_rect(2.12 + r, 4.38 - r, -3.0, -0.88 - r, 0.3))

	var route := _sample_route(room.WAYPOINTS, 0.2)
	_check(route.size() > 100 and surface.size() > 200,
		"the proof must actually be dense (%d route x %d surface samples)"
			% [route.size(), surface.size()])

	var in_range := 0
	var visible: Array = []
	for op: Vector2 in route:
		for sp: Vector2 in surface:
			if Vector2(sp.x - op.x, sp.y - op.y).length() >= o.sight_range:
				continue
			in_range += 1
			if _visible(o, player, op.x, op.y, sp.x, y, sp.y):
				if visible.size() < 5:
					visible.append("(%.2f,%.2f)->(%.2f,%.2f)" % [op.x, op.y, sp.x, sp.y])
	_check(visible.is_empty(),
		"THE BREATHER IS NOT SAFE: %d of %d in-range pairs have a clear line "
			% [visible.size(), in_range]
		+ "onto the platform, e.g. %s" % str(visible))
	print("  proof: %d route x %d surface samples, %d pairs inside his %.0fm "
		% [route.size(), surface.size(), in_range, o.sight_range]
		+ "sight range, %d with a clear line" % visible.size())
	_check(in_range > 2000,
		"the proof is vacuous unless a lot of the platform is INSIDE his sight "
		+ "range and blocked by geometry, not merely far away (only %d pairs "
			% in_range + "were in range)")

	# CONTROL 1: the prober can say yes. Same orderly, same ray, an
	# unobstructed 2m line across the open lower floor.
	_check(_visible(o, player, 1.0, -3.0, -1.0, 0.0, -3.0),
		"CONTROL: an unobstructed line across the lower floor must read as "
		+ "VISIBLE, or the whole proof above is a prober that always says no")
	# CONTROL 2: and the same distance, through the rail, must not.
	_check(not _visible(o, player, 1.0, -3.0, 3.0, y, -3.0),
		"CONTROL: the same 2m, through RailWest, must read as blocked")

	# The behavioural version of the same claim, through the real sight
	# pipeline this time (distance, cone, ramp and all): parked at his nearest
	# waypoint and staring straight at the platform, he never starts to watch.
	StateManager.force_state(StateManager.State.UNMED, "test")
	var park: Array[Vector3] = [Vector3(1, 0, -6)]
	o.waypoints = park
	o.global_position = Vector3(1, 0, -6)
	o.facing = Vector2(1, 0)   # +x, dead at the platform's west rail
	o.ramp = 0.0
	o.mode = 0
	# The WORST watch ramp over the run, not the final one: once he reaches 1.0
	# he chases, catches, and resets — so a final-frame reading of a player he
	# definitely saw is 0.0. That mistake made the control below pass silently
	# the first time it was written.
	_close(_worst_watch(o, player, 3.0, y, -6.0, 120), 0.0,
		"parked 2m away and looking straight at it, he must not see a player "
		+ "standing on the platform", 0.0001)

	o.facing = Vector2(-1, 0)
	_check(_worst_watch(o, player, -1.0, 0.0, -6.0, 120) > 0.0,
		"CONTROL: the same orderly, same distance, on the open floor, DOES see "
		+ "him — so it is the geometry that stopped him, not a dead rig")

	_teardown(f)


# --- 7. the places you stand still ----------------------------------------

## Park a player and run his ENTIRE patrol loop. Returns the highest watch
## ramp reached across the whole run.
func _worst_watch(o: CharacterBody3D, player: Node3D, px: float, py: float, pz: float,
		ticks: int) -> float:
	StateManager.force_state(StateManager.State.UNMED, "test")
	player.global_position = Vector3(px, py, pz)
	player.level = WardLevels.FLAT_LEVEL_ID
	o.ramp = 0.0
	o.mode = 0
	var worst := 0.0
	for _i in ticks:
		o._physics_process(TICK)
		worst = maxf(worst, o.watching())
		if worst >= 1.0:
			break
	return worst


# The three stand-and-read spots in the pair, and the honest guarantee they
# get. NONE of them is protected by the categorical argument the platform gets:
# room 18's nook is open to its own mouth, and both vestibules are open to
# their archway. What protects them is real geometry PLUS his facing — so the
# claim is behavioural, and it is made behaviourally: park a player there and
# run his whole loop.
#
# (A full room-18 cycle is ~18s of walking plus four 0.8s waypoint pauses;
# 1400 ticks is 23s, comfortably more than one lap from any starting phase.)
func _test_standing_still_is_safe() -> void:
	var f := _make(ROOM18, Vector3(0, 0, 4))
	var room: Node3D = f["room"]
	var player: Node3D = f["player"]
	var o: CharacterBody3D = room._orderly
	room.set_physics_process(false)
	await get_tree().physics_frame

	# Where a player actually stands to use the dispenser and to read each
	# lever's plate — a body-radius clear of the fixture, not on top of it.
	_close(_worst_watch(o, player, -5.1, 0.0, 4.0, 1400), 0.0,
		"a player at room 18's dispenser must survive a full patrol cycle "
		+ "unseen — the Z1 stub wall plus his facing, asserted rather than "
		+ "assumed", 0.0001)
	_close(_worst_watch(o, player, -1.45, 0.0, -6.2, 1400), 0.0,
		"and a player standing at leverLights, deciding", 0.0001)
	_close(_worst_watch(o, player, 1.45, 0.0, -6.2, 1400), 0.0,
		"and at leverDoors", 0.0001)
	_teardown(f)

	# CONTROL: the same rig, a player standing in the open belt zone, gets
	# seen — so the three passes above are geometry, not a broken orderly.
	var fc := _make(ROOM18, Vector3(0, 0, 4))
	var rc: Node3D = fc["room"]
	rc.set_physics_process(false)
	await get_tree().physics_frame
	_check(_worst_watch(rc._orderly, fc["player"], 0.0, 0.0, -1.6, 1400) > 0.0,
		"CONTROL: a player loitering in the middle of the belt zone IS seen")
	_teardown(fc)

	# Both vestibule dispensers, one build each. Neither orderly ever patrols
	# north of the divider, but both vestibules are open to their archway, so
	# the claim is the same behavioural one.
	for entry in [["lights", R19_LIGHTS, 1200], ["doors", R19_DOORS, 1000]]:
		var f2 := _make(entry[1] as PackedScene, Vector3(-4.5, 0, 3.2))
		var r2: Node3D = f2["room"]
		r2.set_physics_process(false)
		await get_tree().physics_frame
		_close(_worst_watch(r2._orderly, f2["player"], -6.1, 0.0, 3.0, entry[2] as int), 0.0,
			"a player at room19_%s's dispenser must survive a full patrol "
				% entry[0] + "cycle unseen", 0.0001)
		_teardown(f2)



# --- reachability ----------------------------------------------------------
#
# A soft-lock is "you cannot get from here to there", and no other check in
# this file answers that: colliders can each be individually correct and still
# enclose the player. So walk it. A 10cm grid over the room's floor, flood
# filled from spawn at the player's real body radius against the real collision
# cache, in the real ward states.

const GRID := 0.1


func _floor_rect(room: Node) -> Rect2:
	# The Shell's floor mesh is authored to the room's floor rect.
	var floor_node := room.get_node_or_null("Shell/Floor") as MeshInstance3D
	if floor_node == null:
		return Rect2()
	var aabb := floor_node.get_aabb()
	var o: Vector3 = floor_node.global_position
	return Rect2(o.x + aabb.position.x, o.z + aabb.position.z, aabb.size.x, aabb.size.z)


## Flood fill from `from`, at the player's radius, and report whether `to` is
## in the same connected region. Both points are snapped to the grid.
func _reachable(col: WardCollision, rect: Rect2, from: Vector2, to: Vector2, state: int) -> bool:
	var nx := int(rect.size.x / GRID)
	var nz := int(rect.size.y / GRID)
	if nx <= 0 or nz <= 0:
		return false

	var start := Vector2i(int((from.x - rect.position.x) / GRID), int((from.y - rect.position.y) / GRID))
	var goal := Vector2i(int((to.x - rect.position.x) / GRID), int((to.y - rect.position.y) / GRID))

	var open := {}
	var stack: Array[Vector2i] = [start]
	open[start] = true
	while not stack.is_empty():
		var c: Vector2i = stack.pop_back()
		if c == goal:
			return true
		for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
			var n: Vector2i = c + d
			if n.x < 0 or n.y < 0 or n.x >= nx or n.y >= nz or open.has(n):
				continue
			var wx := rect.position.x + (float(n.x) + 0.5) * GRID
			var wz := rect.position.y + (float(n.y) + 0.5) * GRID
			if col.is_blocked_at(wx, wz, Tuning.PLAYER_RADIUS, state):
				continue
			open[n] = true
			stack.append(n)
	return false


# THE ROOM'S GATE, AND THE PAIR'S SOFT-LOCK AUDIT, walked rather than argued.
#
# Room 18 is the only room in the ward whose exit is opened by a CHOICE, so the
# two halves of that claim both need proving: sealed, the exit is genuinely
# unreachable from spawn (or a player strolls past the entire point of the
# wing); thrown, it is genuinely reachable (or the choice is a soft-lock). Both
# builds of room 19 then have to be walkable end to end in both ward states —
# which is the whole of their shared audit, since neither has a lock of any
# kind.
func _test_you_can_walk_it() -> void:
	# --- room 18: the door IS the gate ---
	var f := _make(ROOM18, Vector3(0, 0, 4))
	var room: Node3D = f["room"]
	var main: StubMain = f["main"]
	GameState.flags.clear()
	room._thrown = ""
	room._seal_door()
	var rect := _floor_rect(room)
	var spawn := Vector2(0, 4)
	var exit_pt := Vector2(0, -8.4)

	for state in [StateManager.State.UNMED, StateManager.State.LUCID]:
		_check(not _reachable(main.collision, rect, spawn, exit_pt, state),
			"SEALED, room 18's exit must be UNREACHABLE from spawn — the relay "
			+ "is the room's only gate, and a player who can leave without "
			+ "throwing it silently gets room 19's default branch")
		# ...but the dispenser must be reachable with the door shut, or a
		# 0-pill arrival is stranded before it can do anything at all.
		_check(_reachable(main.collision, rect, spawn, Vector2(-5.1, 4.0), state),
			"and the Z1 dispenser must be reachable while it is sealed")
		# ...and so must both levers, or the gate can never be opened.
		# The spot a body actually occupies to reach each lever: the levers are
		# at x=+-1.6 and the nook side walls' faces at +-1.88, so a 0.35m radius
		# puts the standing point at +-1.45. If THIS is unreachable the gate can
		# never be opened at all.
		_check(_reachable(main.collision, rect, spawn, Vector2(-1.45, -6.2), state),
			"and the spot you stand in to throw leverLights")
		_check(_reachable(main.collision, rect, spawn, Vector2(1.45, -6.2), state),
			"and leverDoors")

	room.on_interact("leverDoors")
	for state in [StateManager.State.UNMED, StateManager.State.LUCID]:
		_check(_reachable(main.collision, rect, spawn, exit_pt, state),
			"THROWN, room 18's exit must be reachable — in both ward states, "
			+ "because nothing here is state-filtered and the throw costs no pill")
	_teardown(f)
	GameState.flags.clear()

	# --- room 19, both builds, end to end ---
	var r19_spawn := Vector2(-4.5, 3.2)
	for entry in [["lights", R19_LIGHTS, Vector2(0, -7.55)], ["doors", R19_DOORS, Vector2(-4.5, -7.55)]]:
		var name: String = entry[0]
		var r: Node3D = _load(entry[1] as PackedScene)
		var col := _collision_of(r)
		var rc := _floor_rect(r)
		for state in [StateManager.State.UNMED, StateManager.State.LUCID]:
			var sn := "unmed" if state == StateManager.State.UNMED else "lucid"
			_check(_reachable(col, rc, r19_spawn, entry[2] as Vector2, state),
				"room19_%s must be walkable spawn -> exit while %s" % [name, sn])
			_check(_reachable(col, rc, r19_spawn, Vector2(-6.1, 3.0), state),
				"room19_%s's dispenser must be reachable from spawn while %s"
					% [name, sn])
		_drop(r)

	# The lights build's breather has to be somewhere you can actually GET to:
	# a raised region is not a collider, so nothing else in this file would
	# notice if its one opening were walled off.
	var rl: Node3D = _load(R19_LIGHTS)
	var coll := _collision_of(rl)
	var rectl := _floor_rect(rl)
	_check(_reachable(coll, rectl, r19_spawn, Vector2(4.5, -5.5), StateManager.State.UNMED),
		"the platform must be reachable from spawn — the ramp mouth is its only "
		+ "way in, and a raised zone is never a collider, so nothing else here "
		+ "would notice if it were sealed")
	_check(_reachable(coll, rectl, Vector2(4.5, -5.5), Vector2(0, -7.55), StateManager.State.UNMED),
		"and you must be able to get back DOWN off it and to the exit")
	_drop(rl)


func _finish() -> void:
	print("")
	print("rooms 18+19: %d assertion(s) passed" % passes)
	if failures.is_empty():
		print("  OK - the relay routes, both undercrofts hold, and the breather is unseeable")
	else:
		for fl in failures:
			print("  FAIL  %s" % fl)
		print("  %d failure(s)" % failures.size())
	print("")
	get_tree().quit(0 if failures.is_empty() else 1)
