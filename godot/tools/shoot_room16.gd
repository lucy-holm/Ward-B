# Screenshot THE REAL GAME standing in ROOM 16, in any of the light axis's four
# cells.
#
#   godot --path godot --resolution 1280x720 tools/shoot_room16.tscn -- \
#       <name> <camX> <camZ> <yawDeg> <pitchDeg> <unmed|lucid> <lit|dark> [seconds]
#
# WHY THIS EXISTS AND NOT tools/shoot_game.tscn.
#
# shoot_game takes a room_id and calls main.load_room, which resolves it
# against main.gd's ROOM_SCENES — and room 16 is deliberately NOT registered
# yet (registering it would extend the shipped chain, which is a separate
# decision from porting the room). So this harness performs the same load
# sequence by hand, against the real main.tscn: the real WorldEnvironment, the
# real player camera, the real posterise layer, the real Atmosphere.
#
# That matters more here than for any previous room. The whole point of the
# light axis's atmosphere half is how main.gd's DARK_* multipliers compose with
# the per-state MOOD table and the posterise ramp, and NONE of that exists in
# tools/shoot.gd's hand-built environment — a shot taken there would be lit by
# a harness that has never heard of the breaker. See main.gd's MOOD comment
# ("AND VERIFY THROUGH THE REAL GAME").
extends Node

const ROOM := preload("res://rooms/room16/room16.tscn")


func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	if args.size() < 7:
		push_error("usage: -- <name> <camX> <camZ> <yawDeg> <pitchDeg> "
			+ "<unmed|lucid> <lit|dark> [seconds]")
		get_tree().quit(1)
		return

	var shot_name: String = args[0]
	var cam_x := float(args[1])
	var cam_z := float(args[2])
	var yaw := deg_to_rad(float(args[3]))
	var pitch := deg_to_rad(float(args[4]))
	var want_lucid: bool = str(args[5]).begins_with("l")
	var want_dark: bool = str(args[6]).begins_with("d")
	var seconds: float = float(args[7]) if args.size() > 7 else 3.0

	var game: Node = load("res://main.tscn").instantiate()
	add_child(game)
	await get_tree().process_frame

	# Dismiss the start overlay exactly as ADMIT ME does, so the shot is the
	# state a player is actually in one click into the game.
	if game.get("start_overlay") != null and game.start_overlay.has_method("_on_admit_pressed"):
		game.start_overlay._on_admit_pressed()
	await get_tree().process_frame

	_load_room16(game)
	await get_tree().create_timer(1.5).timeout

	if want_dark:
		# Thrown THROUGH THE ROOM SCRIPT, with the paint charged first, rather
		# than by calling main.set_room_dark directly.
		#
		# That is not ceremony. The room's fade window is chargeAtThrow *
		# FADE_MAX_SEC, so a bare set_room_dark(true) throws at zero charge, the
		# window is 1ms, and the phosphor is fully faded before the first frame
		# is drawn — which photographs as "the dark-only paint did not appear"
		# and looks exactly like a broken light gate. (It did, on the first
		# attempt at these shots.) Charging in the open bay and then throwing
		# the real switch is what a player does, so it is what gets shot.
		var room: Node = game.current_room
		var keep: Vector3 = game.player.global_position
		game.player.global_position = Vector3(0.0, keep.y, -6.0)  # the open bay
		room.tick_light(room.CHARGE_FULL_SEC + 2.0)
		StateManager.force_state(StateManager.State.LUCID, "shoot_room16")
		room.on_interact("lightSwitch16")
		game.player.global_position = keep

	StateManager.force_state(
		StateManager.State.LUCID if want_lucid else StateManager.State.UNMED,
		"shoot_room16")

	# _apply_mood crossfades the Environment over 0.45s and _set_style rides
	# the same curve; the breaker's circuits ease over ~0.45s on top. Shooting
	# sooner catches the ward mid-fade, which is neither cell.
	await get_tree().create_timer(seconds).timeout

	var player: Node3D = game.player
	player.set_input_enabled(false)
	player.global_position = Vector3(cam_x, player.global_position.y, cam_z)
	player.yaw = yaw
	player.pitch = pitch
	player.rotation.y = yaw
	player.camera.rotation.x = pitch
	await get_tree().process_frame
	await get_tree().process_frame

	var we: WorldEnvironment = game.get_node_or_null("WorldEnvironment")
	if we != null and we.environment != null:
		var e := we.environment
		print("%s: dark=%s lucid=%s ambient=%.5f exposure=%.3f fog=%.1f..%.1f"
			% [shot_name, want_dark, want_lucid, e.ambient_light_energy,
				e.tonemap_exposure, e.fog_depth_begin, e.fog_depth_end])
	if game.atmosphere != null:
		print("  bay circuit scale: %.4f" % game.atmosphere.circuit_scale("bay"))

	DirAccess.make_dir_recursive_absolute("res://.artifacts")
	var img := get_viewport().get_texture().get_image()
	img.save_png("res://.artifacts/%s.png" % shot_name)
	print("  wrote res://.artifacts/%s.png (%dx%d)" % [shot_name, img.get_width(), img.get_height()])
	get_tree().quit(0)


## main.load_room's sequence, minus the ROOM_SCENES lookup. Kept in the same
## order as the original — in particular RoomLight.reset BEFORE add_child, which
## is what makes the room's gated geometry correct on its first frame.
func _load_room16(game: Node) -> void:
	if game.current_room != null:
		if game.current_room.has_method("on_leave"):
			game.current_room.on_leave()
		game.triggers.bind_room(null)
		game.current_room.queue_free()
		game.current_room = null

	var room: Node3D = ROOM.instantiate()
	RoomLight.reset(bool(room.get_meta("start_dark", false)))
	game.world_root.add_child(room)
	game.current_room = room
	game.current_room_id = "room16"

	game.collision.rebuild_from(room)
	game.levels.rebuild_from(room)
	game.triggers.bind_room(room)
	if game.atmosphere != null:
		game.atmosphere.collect_lights(room)
		game.atmosphere.set_all_circuits(not RoomLight.is_dark(), true)
	GameState.enter_room("room16")

	var spawn: Node3D = room.get_node_or_null("Spawn")
	if spawn != null:
		game.player.spawn_at(spawn.global_position.x, spawn.global_position.z,
			spawn.rotation.y)
	if room.has_method("on_enter"):
		room.on_enter(game)
