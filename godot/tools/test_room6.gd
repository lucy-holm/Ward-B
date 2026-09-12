# Behavioural tests for ROOM 6 — the maintenance puzzle.
#
#   godot --headless --path godot tools/test_room6.tscn
#
# The room deliberately has no keypad contract: the unmedicated fuse pickup
# and lucid panel action are separate, persist across a catch, and make noise
# through main.emit_noise so the existing orderly can react.
extends Node

const ROOM := preload("res://rooms/room6/room6.tscn")
const STUB_PLAYER := preload("res://tools/test_stub_player.gd")

var failures: Array[String] = []
var passes := 0


class StubMain:
	extends Node
	var player: Node3D = null
	var room: Node3D = null
	var collision: WardCollision = null
	var toasts: Array[String] = []
	var objectives: Array[String] = []
	var noises: Array = []
	var teleports: Array = []

	func hud_toast(text: String) -> void:
		toasts.append(text)

	func hud_objective(text: String) -> void:
		objectives.append(text)

	func set_threat(_level: float, _bearing: Variant) -> void:
		pass

	func shift_fx() -> void:
		pass

	func emit_noise(source: String, position: Vector3, source_level: String = "") -> int:
		noises.append([source, position, source_level])
		return 1

	func remove_interactable(id: String) -> void:
		var node := _find(room, id)
		if node != null:
			node.queue_free()

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

	func teleport_player(x: float, z: float, _level := "") -> void:
		teleports.append(Vector2(x, z))
		player.global_position = Vector3(x, 0.0, z)

	func rebuild_collision() -> void:
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
	_test_layout_and_contract()
	_test_two_step_puzzle_and_noise()
	_test_catch_preserves_completed_step()
	await _test_real_main_noise_response()
	_finish()


func _check(cond: bool, what: String) -> void:
	if cond:
		passes += 1
	else:
		failures.append(what)


func _find(node: Node, id: String) -> Interactable:
	if node is Interactable and (node as Interactable).interactable_id == id:
		return node as Interactable
	for child in node.get_children():
		var found := _find(child, id)
		if found != null:
			return found
	return null


func _make_room() -> Dictionary:
	var room: Node3D = ROOM.instantiate()
	add_child(room)
	var player: Node3D = Node3D.new()
	player.set_script(STUB_PLAYER)
	add_child(player)
	player.global_position = Vector3(0, 0, 7)
	var main := StubMain.new()
	main.player = player
	main.room = room
	main.collision = WardCollision.new()
	main.collision.rebuild_from(room)
	add_child(main)
	room.on_enter(main)
	room.set_physics_process(false)
	for child in room.get_children():
		if child is CharacterBody3D:
			child.set_physics_process(false)
	return {"room": room, "player": player, "main": main}


func _teardown(ctx: Dictionary) -> void:
	var room: Node3D = ctx["room"]
	room.on_leave()
	room.free()
	(ctx["main"] as Node).free()
	(ctx["player"] as Node).free()


func _test_layout_and_contract() -> void:
	var room: Node3D = ROOM.instantiate()
	add_child(room)
	_check(room.get_node_or_null("Interactables/keypad6") == null,
		"room 6 no longer emits a keypad6 fixture")
	var part := _find(room, "service_part6")
	var panel := _find(room, "service_panel6")
	_check(part != null and panel != null,
		"the fuse and service panel have distinct interactable ids")
	if part != null:
		_check(part.interactable_type == "pill_pickup",
			"the fuse uses the free-standing pickup collision contract")
	if panel != null:
		_check(panel.interactable_type == "maintenance_panel",
			"the panel has a distinct maintenance type")
	_check(_find(room, "dispenser6") != null,
		"the alcove refill route remains present")
	room.free()


func _test_two_step_puzzle_and_noise() -> void:
	var ctx := _make_room()
	var room: Node3D = ctx["room"]
	var main: StubMain = ctx["main"]
	var col: WardCollision = main.collision
	var door := room.find_child("DoorCollider", true, false) as CollisionObject3D

	_check(not room._part_recovered and not room._panel_powered,
		"maintenance starts with both steps incomplete")
	StateManager.force_state(StateManager.State.LUCID, "test")
	room.on_interact("service_part6")
	_check(not room._part_recovered, "stale focus cannot collect an unmedicated fuse while lucid")
	StateManager.force_state(StateManager.State.UNMED, "test")
	room.on_interact("service_panel6")
	_check(not room._panel_powered,
		"the panel refuses to power before its part is recovered")
	room.on_interact("service_part6")
	_check(room._part_recovered,
		"unmedicated interaction recovers the identifiable service part")
	_check(main.noises.size() == 1 and main.noises[0][0] == "service_fuse_recovered",
		"recovering the part emits one authored noise event")
	_check(main.noises.size() > 0 and main.noises[0][2] == WardLevels.FLAT_LEVEL_ID,
		"the pickup noise carries the current room level")
	room.on_interact("service_panel6")
	_check(not room._panel_powered, "unmedicated hands cannot power the panel")
	StateManager.force_state(StateManager.State.LUCID, "test")
	room.on_interact("service_panel6")
	_check(room._panel_powered and room._door_unlocked,
		"lucid interaction fits the part and powers the panel")
	_check(main.noises.size() == 2 and main.noises[1][0] == "service_panel_powered",
		"powering the panel emits a second distinct noise event")
	_check(main.noises.size() > 1 and main.noises[1][2] == WardLevels.FLAT_LEVEL_ID,
		"the panel noise carries the current room level")
	_check(door != null and door.collision_layer == 0,
		"powering the panel releases the exit collider")
	_check(not col.is_blocked_at(12.0, -2.9, Tuning.PLAYER_RADIUS,
		StateManager.State.LUCID), "the powered exit is walkable")
	_teardown(ctx)
	StateManager.force_state(StateManager.State.UNMED, "test")


func _test_real_main_noise_response() -> void:
	# Exercise the actual dispatch path as well as the room stub contract. The
	# patrol is parked inside its authored hearing radius so the assertion is
	# about source-level routing and orderly response, not waypoint timing.
	var game: Node = load("res://main.tscn").instantiate()
	add_child(game)
	await get_tree().process_frame
	game.load_room("room6")
	await get_tree().process_frame
	var room: Node3D = game.current_room
	var orderly := room.get_tree().get_first_node_in_group("orderly")
	_check(orderly != null, "real main room6 integration spawns its orderly")
	if orderly != null:
		orderly.global_position = Vector3(4.0, 0.0, -3.75)
	StateManager.force_state(StateManager.State.UNMED, "test")
	game.player.global_position = Vector3(6.3, 0.0, -5.25)
	room.on_interact("service_part6")
	_check(orderly != null and orderly.is_investigating(),
		"real main dispatch makes the room6 fuse noise investigate")
	StateManager.force_state(StateManager.State.LUCID, "test")
	if orderly != null:
		# A patrol ignores a second noise while investigating and during its
		# cooldown. Clear those actor-local guards so this test can prove the
		# second authored interaction reaches the same real main listener.
		orderly.mode = 0 # Orderly.Mode.PATROL
		orderly._noise_cooldown = 0.0
		orderly.global_position = Vector3(9.2, 0.0, -2.0)
	# Stand just inside the east wall so the emitted target is reachable by the
	# orderly planner; the interactable itself remains proud of that wall.
	game.player.global_position = Vector3(11.4, 1.45, -2.9)
	room.on_interact("service_panel6")
	_check(orderly != null and orderly.is_investigating(),
		"real main dispatch accepts the room6 panel noise on the room level")
	game.queue_free()
	await get_tree().process_frame
	StateManager.force_state(StateManager.State.UNMED, "test")


func _test_catch_preserves_completed_step() -> void:
	var ctx := _make_room()
	var room: Node3D = ctx["room"]
	var main: StubMain = ctx["main"]
	room.on_interact("service_part6")
	room._on_caught()
	_check(room._part_recovered,
		"an orderly catch preserves the recovered part")
	_check(not main.teleports.is_empty(), "a catch still returns to the ordinary spawn")
	_teardown(ctx)
	StateManager.force_state(StateManager.State.UNMED, "test")


func _finish() -> void:
	if failures.is_empty():
		print("OK - room6 maintenance and real noise response (%d assertions)" % passes)
	else:
		print("test_room6: %d passed, %d FAILED" % [passes, failures.size()])
		for failure in failures:
			print("  FAIL - %s" % failure)
	get_tree().quit(1 if not failures.is_empty() else 0)
