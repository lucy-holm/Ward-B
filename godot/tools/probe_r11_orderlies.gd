# ROOM 11 orderly probe — room11.tscn with its two orderlies instanced and
# wired exactly as room11.gd wires them (Orderly.setup's third argument, the
# WardLevels instance), then photographed.
#
# The assertion it carries is the one thing the verticality wiring is FOR:
# each orderly's rendered Y must equal floor_height_at(his own level, x, z),
# so the mezzanine patroller stands ON the platform rather than sunk 0.9m into
# it. main.gd cannot host this — room 11 is deliberately not in ROOM_SCENES on
# this branch — so the room is driven headlessly here instead.
#
#   godot --path godot --resolution 1280x720 tools/probe_r11_orderlies.tscn \
#       -- <name> <camX> <camY> <camZ> <lookX> <lookY> <lookZ> [ambient]
extends Node

func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	var shot_name: String = args[0] if args.size() > 0 else "orderlies"
	var room: Node = (load("res://rooms/room11/room11.tscn") as PackedScene).instantiate()
	add_child(room)

	var levels := WardLevels.new()
	levels.rebuild_from(room)
	var col := WardCollision.new()
	col.rebuild_from(room)

	var script: GDScript = load("res://rooms/room11/room11.gd")
	var consts := script.get_script_constant_map()

	# A stand-in "player" so Orderly.setup has something to hold.
	var fake := Node3D.new()
	fake.name = "FakePlayer"
	add_child(fake)
	fake.global_position = Vector3(-30, 1.62, -30)

	var made: Array = []
	for key in ["WAYPOINTS_A", "WAYPOINTS_B"]:
		var route: Array = consts[key]
		var o: CharacterBody3D = (load("res://orderly/orderly.tscn") as PackedScene).instantiate()
		var wp: Array[Vector3] = []
		for v in route:
			wp.append(v)
		o.waypoints = wp
		o.name = "Orderly_" + key
		room.add_child(o)
		o.setup(fake, col, levels)
		made.append(o)

	StateManager.force_state(StateManager.State.UNMED, "probe")

	for i in 30:
		await get_tree().process_frame

	for o in made:
		var p: Vector3 = o.global_position
		var want: float = levels.floor_height_at(o.level, p.x, p.z)
		print("%s at (%.3f, %.3f, %.3f) level='%s' floor_height_at -> %.3f  %s"
			% [o.name, p.x, p.y, p.z, o.level, want,
			   "OK (standing on his own floor)" if absf(p.y - want) < 0.01 else "*** FLOATING/SUNK ***"])

	# Camera + environment, mirroring shoot.gd's unmed rig but bright enough to read.
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	var mood: Dictionary = (load("res://main.gd") as GDScript).MOOD
	var m: Dictionary = mood[0]
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.8, 0.85, 0.83)
	env.ambient_light_energy = float(args[7]) if args.size() > 7 else 0.9
	env.fog_enabled = true
	env.fog_mode = Environment.FOG_MODE_DEPTH
	env.fog_light_color = m["fog"]
	env.background_color = m["fog"]
	env.fog_depth_begin = float(m["fog_begin"])
	env.fog_depth_end = float(m["fog_end"])
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.tonemap_exposure = float(m["exposure"])
	env.tonemap_white = 4.0
	env.glow_enabled = true
	env.glow_intensity = 0.55
	env.adjustment_enabled = true
	env.adjustment_contrast = 1.08
	env.adjustment_saturation = 0.88
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)

	var cam := Camera3D.new()
	cam.fov = 72.0
	cam.near = 0.05
	add_child(cam)
	cam.global_position = Vector3(float(args[1]), float(args[2]), float(args[3]))
	cam.look_at(Vector3(float(args[4]), float(args[5]), float(args[6])), Vector3.UP)
	cam.make_current()

	for i in 40:
		await get_tree().process_frame

	DirAccess.make_dir_recursive_absolute("res://.artifacts")
	var img := get_viewport().get_texture().get_image()
	img.save_png("res://.artifacts/%s.png" % shot_name)
	print("wrote %s" % shot_name)
	get_tree().quit(0)
