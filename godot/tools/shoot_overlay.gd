# Screenshot the START OVERLAY and the CONFIGURATION panel as a player sees
# them — over the real main.tscn, its real player camera, its real
# WorldEnvironment and a real loaded room.
#
#   godot --path . --resolution 1728x1080 tools/shoot_overlay.tscn -- <name> [start|config] [brightness]
#
# Must run WINDOWED. --headless skips rendering entirely and writes a black
# image, which is worse than no check because it looks like a result.
#
# Built on main.tscn for the same reason tools/shoot_game.gd is: tools/shoot.gd
# constructs its own camera and environment, so it renders neither the overlay
# nor the exposure the brightness setting controls, and would "verify" this
# work while being structurally incapable of seeing it. The config panel in
# particular is deliberately see-through over the live ward, so the ward
# behind it IS part of what needs looking at.
extends Node


func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	var shot_name: String = args[0] if args.size() > 0 else "overlay"
	var panel: String = args[1] if args.size() > 1 else "start"
	var brightness: float = float(args[2]) if args.size() > 2 else -1.0

	if brightness > 0.0:
		WardSettings.set_brightness(brightness)

	var game: Node = load("res://main.tscn").instantiate()
	add_child(game)
	# Long enough for room 1 to load, the mood to apply and the lights to
	# settle; the mood crossfade alone is 0.45 s.
	await get_tree().create_timer(4.0).timeout

	var overlay: CanvasLayer = game.start_overlay
	if overlay == null:
		push_error("main.tscn exposes no start_overlay — nothing to shoot")
		get_tree().quit(1)
		return

	if panel == "config":
		# Drive the real button rather than poking visibility, so the shot
		# also exercises _on_config_pressed's re-seeding path.
		overlay._config_btn.emit_signal("pressed")
		await get_tree().process_frame
		await get_tree().process_frame

	# Report what is actually governing the render, so a wrong-looking shot
	# can be told apart from a wrongly-lit one.
	var we: WorldEnvironment = game.get_node_or_null("WorldEnvironment")
	if we != null and we.environment != null:
		print("env: exposure=%.3f (brightness=%.2f) ambient=%.4f fog=%.1f..%.1f" % [
			we.environment.tonemap_exposure, WardSettings.get_brightness(),
			we.environment.ambient_light_energy,
			we.environment.fog_depth_begin, we.environment.fog_depth_end])

	DirAccess.make_dir_recursive_absolute("res://.artifacts")
	var img := get_viewport().get_texture().get_image()
	img.save_png("res://.artifacts/%s.png" % shot_name)
	print("wrote res://.artifacts/%s.png (%dx%d)" % [shot_name, img.get_width(), img.get_height()])
	get_tree().quit(0)
