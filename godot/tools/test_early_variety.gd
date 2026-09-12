# Exercise the actual early-room puzzles, fixtures and exit collision together.
# Every possible seal and bell ordering must remain completable after mistakes
# and catches. No keypad or test-only door-unlock shortcut is used.
extends Node

var game: Node
var checks := 0
var failures: Array[String] = []

func check(condition: bool, message: String) -> void:
	checks += 1
	if not condition:
		failures.append(message)

func _ready() -> void:
	Telemetry.disabled = true
	game = load("res://main.tscn").instantiate()
	add_child(game)
	Telemetry.debug = true
	game.start_overlay.visible = false
	game._on_admit_pressed()
	StateManager.can_shift = true
	await get_tree().process_frame
	for shape in ["circle", "square", "triangle"]:
		await _records(shape)
	for order in [["circle", "square", "triangle"], ["circle", "triangle", "square"],
		["square", "circle", "triangle"], ["square", "triangle", "circle"],
		["triangle", "circle", "square"], ["triangle", "square", "circle"]]:
		await _bells(order)
	await _focus_checks()
	await _office()
	game.queue_free()
	await get_tree().process_frame
	for failure in failures:
		print("FAIL - ", failure)
	print("OK - early puzzle variety (%d assertions)" % checks if failures.is_empty() else "FAILED - early puzzle variety")
	get_tree().quit(0 if failures.is_empty() else 1)

func _load_room(id: String) -> void:
	game.load_room(id)
	# Freeze movement only; real catch handlers, actor listeners and all other
	# room/main systems are retained for deterministic interaction assertions.
	for actor in get_tree().get_nodes_in_group("orderly"):
		actor.set_physics_process(false)
	await get_tree().process_frame
	game.player.set_input_enabled(true)

func _use(id: String) -> void:
	var item: Interactable = game._find_interactable(game.current_room, id)
	check(item != null, "%s exists" % id)
	game._focused = item
	game._interact()

func _door_blocked(z: float) -> bool:
	return game.collision.is_blocked_at(0, z, Tuning.PLAYER_RADIUS, StateManager.state, "__flat")

func _records(shape: String) -> void:
	await _load_room("room7")
	var room: Node = game.current_room
	room._required_shape = shape
	room._update_request_display()
	var reader_model: Node = game._find_interactable(room, "record_reader7").get_node("Model")
	check(reader_model.shape == shape and reader_model.get_node("Symbol").get_child_count() == 1,
		"reader visibly requests the current %s seal" % shape)
	check(game._find_interactable(room, "keypad7") == null, "records has no keypad")
	check(_door_blocked(-5), "records starts locked")
	StateManager.force_state(StateManager.State.LUCID, "test")
	room.on_interact("record7_" + shape)
	check(not room._record_held, "lucid cannot take an absent raw seal")
	StateManager.force_state(StateManager.State.UNMED, "test")
	var other := "square" if shape != "square" else "triangle"
	_use("record7_" + other)
	check(not room._record_held and _door_blocked(-5), "mismatch neither grants seal nor opens door")
	_use("record7_" + shape)
	check(room._record_held, "matching %s seal is taken" % shape)
	room.on_interact("record7_" + shape)
	room._on_caught()
	check(room._record_held and room._required_shape == shape, "held seal survives catch unchanged")
	check(reader_model.shape == shape, "held seal's reader symbol survives catch")
	StateManager.force_state(StateManager.State.UNMED, "test")
	_use("record_reader7")
	check(_door_blocked(-5), "raw reader refuses without losing held seal")
	StateManager.force_state(StateManager.State.LUCID, "test")
	_use("record_reader7")
	check(room._door_unlocked and not _door_blocked(-5), "matching record opens actual exit collider")
	room._on_caught()
	check(room._door_unlocked and not _door_blocked(-5), "completed record stays complete after catch")
	# Every pickup has a clear approach in its shelf pocket.
	for point in [Vector2(-4.6, 3.6), Vector2(4.65, -1.1), Vector2(-4.6, -3.5)]:
		for state in [StateManager.State.LUCID, StateManager.State.UNMED]:
			check(not game.collision.is_blocked_at(point.x, point.y, Tuning.PLAYER_RADIUS, state),
				"record pocket is clear in both states")
	await _load_room("room7")
	room = game.current_room
	var previous: String = room._required_shape
	room._on_caught()
	reader_model = game._find_interactable(room, "record_reader7").get_node("Model")
	check(room._required_shape != previous and reader_model.shape == room._required_shape,
		"uncollected catch rerolls both the request and reader symbol")

func _bells(order: Array) -> void:
	await _load_room("room8")
	var room: Node = game.current_room
	var clue := room.find_child("bellOrder8", true, false) as Label3D
	check(clue.text == "bell order\n1. %s\n2. %s\n3. %s" % room._bell_order,
		"discovered numbered instructions match the randomized bell order")
	room._bell_order = order.duplicate()
	check(game._find_interactable(room, "keypad8") == null, "east ward has no keypad")
	StateManager.force_state(StateManager.State.LUCID, "test")
	_use("bell8_" + order[0])
	check(room._bell_progress == 0 and _door_blocked(-8), "lucid bell is silent and exit stays closed")
	StateManager.force_state(StateManager.State.UNMED, "test")
	_use("bell8_" + order[0])
	check(room._bell_progress == 1, "first correct bell latches")
	var first: Interactable = game._find_interactable(room, "bell8_" + order[0])
	check(first.get_node("Model")._lamp_mat.emission_energy_multiplier > 0,
		"correct bell lights its physical indicator")
	room.on_interact("bell8_" + order[0])
	check(room._bell_progress == 1, "duplicate latched bell cannot reset progress")
	_use("bell8_" + order[2])
	check(room._bell_progress == 0 and _door_blocked(-8), "wrong future bell resets sequence without opening door")
	check(first.get_node("Model")._lamp_mat.emission_energy_multiplier == 0,
		"wrong sequence extinguishes latched indicator")
	_use("bell8_" + order[0])
	room._on_caught()
	check(room._bell_progress == 1 and room._bell_order == order, "catch preserves learned order and latched bell")
	StateManager.force_state(StateManager.State.UNMED, "test")
	_use("bell8_" + order[1])
	_use("bell8_" + order[2])
	check(room._door_unlocked and not _door_blocked(-8), "all six orders can open actual exit")
	room._on_caught()
	check(not _door_blocked(-8), "bell completion survives catch")

func _office() -> void:
	await _load_room("room9")
	var room: Node = game.current_room
	check(game._find_interactable(room, "keypad9") == null, "office has no keypad")
	StateManager.force_state(StateManager.State.LUCID, "test")
	_use("office_lock9")
	check(_door_blocked(-6), "empty-handed player cannot open brass lock")
	GameState.refill()
	_use("bottle")
	check(room._bottle_taken and GameState.pills == Tuning.PILLS_MAX, "full pill inventory still accepts coat key")
	room.on_interact("bottle")
	check(GameState.pills == Tuning.PILLS_MAX, "coat duplicate cannot overflow inventory")
	StateManager.force_state(StateManager.State.UNMED, "test")
	_use("office_lock9")
	check(_door_blocked(-6), "raw lock refuses without consuming key")
	StateManager.force_state(StateManager.State.LUCID, "test")
	_use("office_lock9")
	check(room._door_unlocked and not _door_blocked(-6), "coat key opens the actual office exit")
	check(game._find_interactable(room, "checkpoint9") != null, "office retains its recovery chart")


func _focus_checks() -> void:
	# These exercise the real Camera3D/InteractRay path. The puzzle tests above
	# intentionally call room.on_interact through a focused stub; a low shelf
	# item or wall-mounted bell can still be logically correct while impossible
	# to select with the player's actual ray.
	await _load_room("room7")
	for item in [
		["record7_circle", Vector2(-3.4, 3.6)],
		["record7_square", Vector2(3.4, -1.1)],
		["record7_triangle", Vector2(-3.4, -3.5)],
		["record_reader7", Vector2(1.45, -3.4)],
	]:
		await _focus_item(item[0], item[1])
		if str(item[0]).begins_with("record7_"):
			var model: Node3D = game._find_interactable(game.current_room, item[0]).get_node("Model")
			var glyph: MeshInstance3D = model.get_node("Idle/Glyph")
			var normal := glyph.global_basis.z if model.shape == "triangle" else glyph.global_basis.y
			check(absf(normal.normalized().dot(Vector3.UP)) < 0.01,
				"%s silhouette stands vertically" % item[0])
			var approach := Vector3(item[1].x, glyph.global_position.y, item[1].y)
			check(absf(normal.normalized().dot((approach - glyph.global_position).normalized())) > 0.95,
				"%s silhouette faces its clear approach" % item[0])
			check(model.get_node("Idle").spin_speed == 0.0,
				"%s never idles edge-on" % item[0])

	await _load_room("room8")
	for item in [
		["bell8_circle", Vector2(-7.4, 1.6)],
		["bell8_square", Vector2(4.3, -6.4)],
		["bell8_triangle", Vector2(7.4, -4.6)],
	]:
		await _focus_item(item[0], item[1])

	await _load_room("room9")
	for item in [
		["bottle", Vector2(-3.2, -3.4)],
		["office_lock9", Vector2(1.35, -4.5)],
	]:
		await _focus_item(item[0], item[1])


func _focus_item(id: String, approach: Vector2) -> void:
	var target: Interactable = game._find_interactable(game.current_room, id)
	check(target != null, "%s exists for physical focus" % id)
	if target == null:
		return
	StateManager.force_state(StateManager.State.UNMED, "test")
	var player: Node3D = game.player
	player.global_position = Vector3(approach.x, 0.0, approach.y)
	var target_position := target.global_position
	var horizontal := Vector2(target_position.x - player.global_position.x,
		target_position.z - player.global_position.z).length()
	player.yaw = atan2(-(target_position.x - player.global_position.x),
		-(target_position.z - player.global_position.z))
	player.pitch = -atan2(player.camera.global_position.y - target_position.y, horizontal)
	player.rotation.y = player.yaw
	player.camera.rotation.x = player.pitch
	player.force_update_transform()
	player.camera.force_update_transform()
	await get_tree().physics_frame
	game._update_focus()
	var ray: RayCast3D = player.camera.get_node("InteractRay")
	var hit := ray.get_collider() if ray.is_colliding() else null
	check(game._focused == target,
		"actual camera focus ray selects %s (hit=%s visible=%s focusable=%s layer=%s)" % [
			id, hit, target.visible, target.is_focusable(), target.collision_layer])
