# Generic screenshot harness for visual verification.
#
#   Godot --path . tools/shoot.tscn -- res://fixtures/preview_wall.tscn myshot
#
# Must run WINDOWED — --headless skips rendering entirely and produces a
# black or empty image, which is worse than no check because it looks like a
# result. Instances the given scene, lets it settle, grabs the viewport and
# writes .artifacts/<name>.png, then quits.
#
# Exists because "I changed a material / a model" is not verifiable by reading
# code, and every subagent that has skipped looking has shipped something
# wrong (buttons off-screen, a black metallic slab, an invisible tray ledge).
extends Node

const SETTLE_FRAMES := 40


func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	if args.size() < 1:
		push_error("usage: shoot.tscn -- <res://scene.tscn> [name]")
		get_tree().quit(1)
		return

	var scene_path: String = args[0]
	var shot_name: String = args[1] if args.size() > 1 else "shot"

	if not ResourceLoader.exists(scene_path):
		push_error("no such scene: %s" % scene_path)
		get_tree().quit(1)
		return

	var packed: PackedScene = load(scene_path)
	var inst := packed.instantiate()
	add_child(inst)

	# Room scenes carry no camera and no WorldEnvironment — those live in
	# main.tscn — so supply both when shooting one directly. Without the
	# environment the shot is lit nothing like the game and tells you nothing.
	if _find_camera(inst) == null:
		var env := Environment.new()
		env.background_mode = Environment.BG_COLOR
		env.background_color = Color(0.090, 0.043, 0.039)
		env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
		env.ambient_light_color = Color(0.8, 0.85, 0.83)
		env.ambient_light_energy = float(args[8]) if args.size() > 8 else 0.13
		env.fog_enabled = true
		env.fog_mode = Environment.FOG_MODE_DEPTH
		env.fog_light_color = Color(0.090, 0.043, 0.039)
		env.fog_depth_begin = 2.6
		env.fog_depth_end = 13.0
		var we := WorldEnvironment.new()
		we.environment = env
		add_child(we)

		var cam := Camera3D.new()
		cam.fov = 72.0
		cam.near = 0.05
		cam.far = 100.0
		add_child(cam)
		if args.size() >= 8:
			cam.global_position = Vector3(float(args[2]), float(args[3]), float(args[4]))
			cam.look_at(Vector3(float(args[5]), float(args[6]), float(args[7])), Vector3.UP)
		else:
			cam.global_position = Vector3(0, 1.62, 3)
			cam.look_at(Vector3.ZERO, Vector3.UP)
		cam.make_current()

	# Let the scene run: shaders compile on first draw, and anything driven by
	# _process (idle bobs, gait, glow pulses) needs a few frames to look real.
	for i in SETTLE_FRAMES:
		await get_tree().process_frame

	DirAccess.make_dir_recursive_absolute("res://.artifacts")
	var img := get_viewport().get_texture().get_image()
	var out := "res://.artifacts/%s.png" % shot_name
	img.save_png(out)
	print("wrote %s (%dx%d)" % [out, img.get_width(), img.get_height()])
	get_tree().quit(0)


func _find_camera(node: Node) -> Camera3D:
	if node is Camera3D:
		return node as Camera3D
	for child in node.get_children():
		var c := _find_camera(child)
		if c != null:
			return c
	return null
