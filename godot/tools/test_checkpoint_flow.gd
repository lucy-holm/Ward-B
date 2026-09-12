# Real-main integration: a saved branch resumes at its known platform, while
# catches use local checkpoints without discarding live puzzle progress.
extends Node

class FailingStore extends WardCheckpoints:
	func save(_snapshot: Dictionary) -> Error:
		return ERR_UNAVAILABLE

var checks := 0
var failures: Array[String] = []
func check(ok: bool, message: String) -> void:
	checks += 1
	if not ok:
		failures.append(message)
func _ready() -> void:
	Telemetry.disabled = true
	GameState.reset_run()
	StateManager.reset()
	var game = load("res://main.tscn").instantiate()
	add_child(game)
	await get_tree().process_frame
	game.checkpoints = load("res://core/checkpoints.gd").new("user://wardb-checkpoint-flow-test.json")
	game.checkpoints.clear()
	game.start_overlay.visible = false
	game._on_admit_pressed()
	# The actual generated charts must be reachable and their recovery anchors
	# clear in BOTH realities, including the raised lights-route platform.
	for id: String in game.checkpoints.ANCHORS:
		var anchor: Dictionary = game.checkpoints.anchor(id)
		if id == "checkpoint19":
			GameState.set_flag("room18.power", "lights")
		game.load_room(anchor.room)
		game._place_at_checkpoint(anchor)
		var chart: Interactable = game._find_interactable(game.current_room, id)
		check(chart != null and chart.interactable_type == "checkpoint", "%s has a real chart" % id)
		for state in [StateManager.State.LUCID, StateManager.State.UNMED]:
			StateManager.force_state(state, "test")
			check(not game.collision.is_blocked_at(anchor.position.x, anchor.position.z,
				Tuning.PLAYER_RADIUS, state, anchor.level), "%s recovery anchor is clear in state %d" % [id, state])
			check(chart != null and chart.is_focusable(), "%s chart is available in state %d" % [id, state])
		if chart != null:
			check(game.player.camera.global_position.distance_to(chart.global_position) < Tuning.INTERACT_MAX_DISTANCE,
				"%s chart can be reached from its clear anchor" % id)
	game.load_room("room14")
	StateManager.can_shift = true
	game._focused = game._find_interactable(game.current_room, "checkpoint14")
	game._interact()
	check(game._checkpoint_id == "checkpoint14", "real chart interaction records a milestone")
	check(not game.record_checkpoint("checkpoint14"), "same chart cannot be consumed twice")
	game.player.spawn_at(0, -10, 0, "__flat", 0)
	game.current_room._on_caught()
	check(game.player.global_position.is_equal_approx(Vector3(-2, 0, 7.5)), "room14 catch returns to recorded anchor")
	check(StateManager.is_lucid(), "checkpoint never removes catch's recovery lucidity")
	game.load_room("room9")
	check(not game.restore_checkpoint(), "a local catch cannot teleport across rooms")
	var saved: Dictionary = game.checkpoints.make_snapshot("checkpoint19", 1, true,
		{"room18.power": "lights"}, ["room1", "room14", "room18"])
	check(game.checkpoints.save(saved) == OK, "lights-route snapshot written")
	GameState.set_flag("room18.power", "doors")
	game._on_continue_pressed()
	check(game.current_room_id == "room19", "Continue loads logical checkpoint room")
	check(game.current_room.scene_file_path.ends_with("room19_lights.tscn"), "Continue restores branch before scene resolution")
	check(game.player.global_position.is_equal_approx(Vector3(4, 0.9, -6.7)), "Continue seats player on raised platform")
	check(game.player.level == "__flat", "Tier1 platform retains correct floor identity")
	check(GameState.pills == 1 and StateManager.can_shift and StateManager.is_lucid(), "restored player can recover and shift")
	check(GameState.rooms_completed == ["room1", "room14", "room18"], "prior completion facts survive resume")
	check(game.player.is_input_enabled(), "Continue hands input to player")
	check(not game.record_checkpoint("checkpoint19"), "resumed chart remains one-use")
	game.start_overlay.set_checkpoint_label("the undercroft")
	check(game.start_overlay._continue_btn.visible, "saved milestone exposes Continue")
	var original_size := get_window().size
	game.start_overlay.visible = true
	game.start_overlay.set_checkpoint_label("the doctor's office")
	for viewport_size in [Vector2i(393, 852), Vector2i(852, 393), Vector2i(1280, 720)]:
		get_window().size = viewport_size
		await get_tree().process_frame
		await get_tree().process_frame
		var viewport_rect := Rect2(Vector2.ZERO, Vector2(get_viewport().get_visible_rect().size))
		for button: Control in [game.start_overlay._continue_btn, game.start_overlay._admit_btn, game.start_overlay._config_btn]:
			check(viewport_rect.encloses(button.get_global_rect()), "saved-game %s fits %s" % [button.name, viewport_size])
	get_window().size = original_size
	game.start_overlay.set_checkpoint_label("")
	check(not game.start_overlay._continue_btn.visible, "fresh profile hides Continue")
	game._on_admit_pressed()
	check(game.checkpoints.load_saved().is_empty(), "new admission clears the previous save")
	# Storage rejection still grants the visit-only recovery promised by the
	# failure toast. It must neither consume the chart nor promise Continue.
	var persistent_store = game.checkpoints
	game.checkpoints = FailingStore.new()
	game.checkpoints.path = "user://wardb-checkpoint-flow-test.json"
	game.load_room("room14")
	check(not game.record_checkpoint("checkpoint14"), "storage failure is reported")
	check(not game._used_checkpoints.has("checkpoint14"), "failed save leaves chart retryable")
	check(game.checkpoints.load_saved().is_empty(), "failed save cannot offer Continue")
	game.player.spawn_at(0, -10, 0, "__flat", 0)
	game.current_room._on_caught()
	check(game.player.global_position.is_equal_approx(Vector3(-2, 0, 7.5)),
		"failed persistence retains explicitly promised visit-only recovery")
	game.checkpoints = persistent_store
	game.complete_room("END")
	check(game._ended and not game.player.is_input_enabled(), "completion enters a deliberate ending")
	check(game.world_root.process_mode == Node.PROCESS_MODE_DISABLED and not game.hud.visible,
		"orderlies and HUD stop after the final exit")
	StateManager.set_process(true)
	game.checkpoints.clear()
	game.queue_free()
	await get_tree().process_frame
	for failure in failures:
		print("  FAIL - ", failure)
	print("test_checkpoint_flow: %d assertions" % checks)
	print("  OK - checkpoint recovery, Continue and branch persistence" if failures.is_empty() else "  FAILED - checkpoint flow")
	get_tree().quit(0 if failures.is_empty() else 1)
