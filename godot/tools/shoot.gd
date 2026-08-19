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

var _light_scale := 1.0


func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	if args.size() < 1:
		push_error("usage: shoot.tscn -- <res://scene.tscn> [name]")
		get_tree().quit(1)
		return

	var scene_path: String = args[0]
	var shot_name: String = args[1] if args.size() > 1 else "shot"
	# Parsed here rather than inside the camera-less branch below, because it
	# now drives StateManager too — which matters for EVERY shot, including
	# scenes that carry their own camera.
	var want_lucid: bool = args.size() > 9 and str(args[9]).begins_with("l")

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
		# MUST mirror main.tscn's Environment. An earlier version omitted
		# tonemapping and glow, so every screenshot check was lit differently
		# from the actual game — which makes the check actively misleading
		# rather than merely incomplete. If you change main.tscn's Environment,
		# change this too.
		var env := Environment.new()
		env.background_mode = Environment.BG_COLOR
		env.background_color = Color(0.090, 0.043, 0.039)
		env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
		env.ambient_light_color = Color(0.8, 0.85, 0.83)
		# Pull the per-state values straight out of main.gd's MOOD table rather
		# than keeping a second copy here. Two separate bugs came from this
		# harness drifting from the real game — first missing tonemapping and
		# glow entirely, then using a stale ambient that main.gd overwrites at
		# runtime anyway. Reading the source of truth makes drift impossible.
		# Pass "lucid" as arg 9 to shoot the medicated state.
		var mood: Dictionary = (load("res://main.gd") as GDScript).MOOD
		var m: Dictionary = mood[1 if want_lucid else 0]
		env.ambient_light_energy = float(args[8]) if args.size() > 8 else float(m["ambient"])
		env.fog_enabled = true
		env.fog_mode = Environment.FOG_MODE_DEPTH
		env.fog_light_color = m["fog"]
		env.background_color = m["fog"]
		env.fog_depth_begin = float(m["fog_begin"])
		env.fog_depth_end = float(m["fog_end"])
		env.tonemap_mode = Environment.TONE_MAPPER_ACES
		env.tonemap_exposure = float(m["exposure"])
		_light_scale = float(m["light_scale"])
		env.tonemap_white = 4.0
		env.glow_enabled = true
		env.glow_intensity = 0.55
		env.glow_bloom = 0.12
		env.glow_blend_mode = Environment.GLOW_BLEND_MODE_SCREEN
		env.glow_hdr_threshold = 0.85
		env.adjustment_enabled = true
		env.adjustment_contrast = 1.08
		env.adjustment_saturation = 0.88
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

	# FORCE THE WARD STATE, not just the mood.
	#
	# For a long time arg 9 ("lucid") only swapped which MOOD row fed the
	# Environment — fog, ambient, exposure. StateManager was never touched and
	# defaults to UNMED, so a shot labelled "lucid" still rendered every
	# unmed-only object and still hid every lucid-only one. That is worse than
	# having no flag: room 10's two unmed-only gate panels appear in a "lucid"
	# screenshot, which reads as "the gate never opens" when the gate is fine.
	#
	# StateObject connects to state_changed in _ready, and the scene is already
	# added above, so forcing here reaches every state-filtered node.
	StateManager.force_state(
		StateManager.State.LUCID if want_lucid else StateManager.State.UNMED,
		"shoot")

	# Fittings dim per state exactly as Atmosphere does at runtime.
	if _light_scale != 1.0:
		for l in _all_lights(inst):
			l.light_energy *= _light_scale

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


func _all_lights(node: Node) -> Array:
	var out: Array = []
	if node is OmniLight3D:
		out.append(node)
	for child in node.get_children():
		out.append_array(_all_lights(child))
	return out
