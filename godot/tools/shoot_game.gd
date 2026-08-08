# Screenshot THE REAL GAME — main.tscn, its player camera, its WorldEnvironment.
#
#   godot --path godot --resolution 1280x720 tools/shoot_game.tscn -- <name> [seconds] [room_id]
#
# WHY THIS EXISTS, AND WHY tools/shoot.gd IS NOT ENOUGH.
#
# shoot.gd loads a ROOM scene in isolation and builds its own Camera3D and
# WorldEnvironment that mirror main.tscn by hand. That makes it fast and handy
# for framing a prop, but it is structurally blind to anything living outside
# the room scene — and it silently "corrects" bugs in the real rig.
#
# It hid a big one. player.tscn's Camera3D carried a leftover placeholder
# Environment, and Camera3D.environment OVERRIDES WorldEnvironment outright.
# The whole game rendered at default linear tonemapping, exposure 1.0, no fog,
# no glow, while main.gd wrote every MOOD value into a WorldEnvironment that
# never drew a pixel. shoot.gd renders no player camera, so every screenshot
# looked correctly dark; the game was bright and flat for the entire life of
# the port, and successive "make it darker" passes tuned an image nobody was
# playing. Measured at the room-1 spawn: game (42,43,36) vs harness (4,5,1).
#
# RULE: if a judgement is about how the game LOOKS, take the shot here (or in
# a browser via tools/shoot_web.mjs). shoot.gd is for framing, not for verdicts.
extends Node

func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	var shot_name: String = args[0] if args.size() > 0 else "game"
	var seconds: float = float(args[1]) if args.size() > 1 else 6.0
	var room_id: String = args[2] if args.size() > 2 else ""

	var game: Node = load("res://main.tscn").instantiate()
	add_child(game)
	await get_tree().create_timer(seconds).timeout

	if not room_id.is_empty() and game.has_method("load_room"):
		game.load_room(room_id)
		# Room load rebuilds lights and re-runs the mood; give it time to settle.
		await get_tree().create_timer(2.5).timeout

	# Report what is ACTUALLY governing the render, not what we hope is.
	var cam := _find_active_camera(game)
	if cam != null and cam.environment != null:
		push_error("Camera3D '%s' has an environment override — it is shadowing "
			% cam.name + "WorldEnvironment and MOOD is not reaching the screen.")
	var we: WorldEnvironment = game.get_node_or_null("WorldEnvironment")
	if we != null and we.environment != null:
		var e := we.environment
		print("env: ambient=%.4f exposure=%.3f fog=%.1f..%.1f tonemap=%d" % [
			e.ambient_light_energy, e.tonemap_exposure,
			e.fog_depth_begin, e.fog_depth_end, e.tonemap_mode])

	DirAccess.make_dir_recursive_absolute("res://.artifacts")
	var img := get_viewport().get_texture().get_image()
	img.save_png("res://.artifacts/%s.png" % shot_name)
	print("wrote res://.artifacts/%s.png (%dx%d)" % [shot_name, img.get_width(), img.get_height()])
	get_tree().quit(0)


func _find_active_camera(node: Node) -> Camera3D:
	if node is Camera3D and (node as Camera3D).current:
		return node as Camera3D
	for child in node.get_children():
		var c := _find_active_camera(child)
		if c != null:
			return c
	return null
