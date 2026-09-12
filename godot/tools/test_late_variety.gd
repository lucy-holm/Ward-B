# Real-scene coverage for the late puzzle fixtures. This deliberately drives
# main.gd's camera/ray focus path as well as the room callbacks.
extends Node

var game: Node
var checks := 0
var failures: Array[String] = []

func check(ok: bool, message: String) -> void:
	checks += 1
	if not ok: failures.append(message)

func _ready() -> void:
	Telemetry.disabled = true
	Telemetry.debug = true
	game = load("res://main.tscn").instantiate()
	add_child(game)
	game.start_overlay.visible = false
	game._on_admit_pressed()
	StateManager.can_shift = true
	await get_tree().process_frame
	await _room11_choices()
	await _room12_orders()
	await _physical_focus()
	game.queue_free()
	await get_tree().process_frame
	for failure in failures: print("FAIL - ", failure)
	print("OK - late puzzle variety (%d assertions)" % checks if failures.is_empty() else "FAILED - late puzzle variety")
	get_tree().quit(0 if failures.is_empty() else 1)

func _load_room(id: String) -> void:
	game.load_room(id)
	for actor in get_tree().get_nodes_in_group("orderly"):
		actor.set_physics_process(false)
	await get_tree().process_frame
	game.player.set_input_enabled(true)

func _use(id: String) -> void:
	var item: Interactable = game._find_interactable(game.current_room, id)
	check(item != null, "%s exists" % id)
	if item != null:
		game._focused = item
		game._interact()

func _door_blocked(z: float) -> bool:
	return game.collision.is_blocked_at(0.0, z, Tuning.PLAYER_RADIUS, StateManager.state, "__flat")

func _room11_choices() -> void:
	for shape in ["circle", "square", "triangle"]:
		await _load_room("room11")
		var room: Node = game.current_room
		room._required_shape = shape
		var reader: Interactable = game._find_interactable(room, "reader11")
		var reader_model: Node = reader.get_node("Model") if reader != null else null
		if reader_model != null: reader_model.set_shape(shape)
		check(reader != null and reader.get_node("Model").shape == shape,
			"room11 reader shows requested %s" % shape)
		check(_door_blocked(-18.0), "room11 starts closed for %s" % shape)
		StateManager.force_state(StateManager.State.UNMED, "late-variety")
		_use("treatment11_" + shape)
		check(room._seal_held, "room11 accepts matching %s seal" % shape)
		room._on_caught()
		check(room._seal_held, "room11 keeps held %s seal after catch" % shape)
		StateManager.force_state(StateManager.State.LUCID, "late-variety")
		_use("reader11")
		check(room._door_unlocked and not _door_blocked(-18.0),
			"room11 %s opens the real exit collider" % shape)

func _room12_orders() -> void:
	for order in [["circle", "square", "triangle"], ["circle", "triangle", "square"],
		["square", "circle", "triangle"], ["square", "triangle", "circle"],
		["triangle", "circle", "square"], ["triangle", "square", "circle"]]:
		await _load_room("room12")
		var room: Node = game.current_room
		room._bells.order.assign(order)
		room._bells.progress = 0
		room._bells.completed = false
		room._bells.refresh_visuals()
		StateManager.force_state(StateManager.State.UNMED, "late-variety")
		_use("bell12_" + order[0])
		check(room._bells.progress == 1, "room12 first bell latches for %s" % str(order))
		room._on_caught()
		check(room._bells.progress == 1, "room12 catch preserves progress for %s" % str(order))
		StateManager.force_state(StateManager.State.UNMED, "late-variety")
		_use("bell12_" + order[1])
		_use("bell12_" + order[2])
		check(room._door_unlocked and not _door_blocked(-26.0),
			"room12 order %s opens the real exit collider" % str(order))

func _physical_focus() -> void:
	await _load_room("room11")
	for item in [["treatment11_circle", Vector2(-6.4, 10.2), 0.0],
		["treatment11_square", Vector2(3.4, 6.4), 0.9],
		["treatment11_triangle", Vector2(-6.4, -4.4), 0.0],
		["reader11", Vector2(1.45, -16.4), 0.0]]:
		await _focus_item(item[0], item[1], "__flat", item[2])
	var room: Node = game.current_room
	var before: String = room._required_shape
	room._on_caught()
	check(room._required_shape != before, "uncollected treatment request changes after catch")
	check(game._find_interactable(room, "reader11").get_node("Model").shape == room._required_shape,
		"reader icon follows rerolled request")
	await _load_room("room12")
	for item in [["bell12_circle", Vector2(8.5, 30.0)],
		["bell12_square", Vector2(-8.5, 8.0)],
		["bell12_triangle", Vector2(8.5, -4.6)]]:
		await _focus_item(item[0], item[1])
	room = game.current_room
	var clue := room.find_child("bellOrder12", true, false) as Label3D
	check(clue.text == "bell order\n1. %s\n2. %s\n3. %s" % room._bells.order,
		"room12 numbered clue matches the actual randomized sequence")
	await _load_room("room17")
	for item in [["bell17_circle", Vector2(7.4, 29.0), "ground", 0.0],
		["bell17_square", Vector2(7.4, 6.0), "balcony", 3.4],
		["bell17_triangle", Vector2(-4.2, -4.4), "ground", 0.0]]:
		await _focus_item(item[0], item[1], item[2], item[3])
	check(game.current_room._bells.order == ["circle", "square", "triangle"],
		"room17 keeps its local numbered order")

func _focus_item(id: String, approach: Vector2, level := "__flat", floor_y := 0.0) -> void:
	var target: Interactable = game._find_interactable(game.current_room, id)
	check(target != null, "%s exists for focus" % id)
	if target == null: return
	StateManager.force_state(StateManager.State.UNMED, "physical-focus")
	check(not game.collision.is_blocked_at(approach.x, approach.y, Tuning.PLAYER_RADIUS,
		StateManager.state, level), "%s approach is physically clear" % id)
	var player: Node3D = game.player
	player.spawn_at(approach.x, approach.y, 0.0, level, floor_y)
	var delta: Vector3 = target.global_position - player.camera.global_position
	player.yaw = atan2(-delta.x, -delta.z)
	player.pitch = atan2(delta.y, Vector2(delta.x, delta.z).length())
	player._apply_rotation()
	player.force_update_transform()
	player.camera.force_update_transform()
	await get_tree().physics_frame
	game._update_focus()
	var ray: RayCast3D = player.camera.get_node("InteractRay")
	check(game._focused == target, "actual player-height camera focuses %s (hit=%s)" % [id,
		ray.get_collider() if ray.is_colliding() else null])
