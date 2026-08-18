# TEMPORARY verification harness for room 10's unmed-only gates. Delete before
# committing — it exists to prove two things tools/shoot.gd structurally cannot:
#
#  1. shoot.gd's trailing "lucid" arg only swaps the ENVIRONMENT mood; it never
#     touches StateManager (which defaults to UNMED). So a "lucid" shot from
#     shoot.gd still renders every unmed-only panel, which looks exactly like a
#     broken gate. This harness calls StateManager.force_state() for real.
#  2. Whether the gates actually BLOCK is a WardCollision question, not a pixel
#     question: layer 8 becomes state_filter == UNMED and is filtered at query
#     time. Asserting is_blocked_at() in both states tests the real .tscn nodes,
#     the real layers and the real filter.
#
#   godot --path . --resolution 1280x720 rooms/room10/_gate_check.tscn -- \
#       <name> <camX> <camY> <camZ> <lookX> <lookY> <lookZ>
extends Node

const SETTLE_FRAMES := 40

var _shot_name := "gate"
var _cam: Camera3D = null
var _env: Environment = null
var _room: Node = null


func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	_shot_name = args[0] if args.size() > 0 else "gate"

	_room = load("res://rooms/room10/room10.tscn").instantiate()
	add_child(_room)

	# --- runtime collision assertions, on the REAL instantiated scene --------
	var col := WardCollision.new()
	col.rebuild_from(_room)
	print("BOXES total=%d" % col.boxes.size())

	var unmed_only := 0
	for b in col.boxes:
		if b.state_filter == StateManager.State.UNMED:
			unmed_only += 1
			print("UNMED-ONLY BOX x[%.2f,%.2f] z[%.2f,%.2f]" % [b.min_x, b.max_x, b.min_z, b.max_z])
	print("ASSERT unmed_only_boxes=%d expected=2 -> %s"
		% [unmed_only, "PASS" if unmed_only == 2 else "FAIL"])

	var r := Tuning.PLAYER_RADIUS
	for probe in [
		{"n": "gate2 doorway", "x": 0.0, "z": -10.0},
		{"n": "gate3 doorway", "x": 0.0, "z": -20.0},
		{"n": "Z1/Z2 open doorway (control, must never block)", "x": 0.0, "z": 0.0},
	]:
		var u: bool = col.is_blocked_at(probe["x"], probe["z"], r, StateManager.State.UNMED)
		var l: bool = col.is_blocked_at(probe["x"], probe["z"], r, StateManager.State.LUCID)
		print("PROBE %-48s unmed_blocked=%s lucid_blocked=%s" % [probe["n"], u, l])

	var spawn: Node3D = _room.get_node_or_null("Spawn")
	if spawn != null:
		var p := spawn.global_position
		print("SPAWN (%.2f,%.2f) unmed_blocked=%s lucid_blocked=%s" % [
			p.x, p.z,
			col.is_blocked_at(p.x, p.z, r, StateManager.State.UNMED),
			col.is_blocked_at(p.x, p.z, r, StateManager.State.LUCID)])

	# --- camera + environment, mirroring tools/shoot.gd ---------------------
	_env = Environment.new()
	_env.background_mode = Environment.BG_COLOR
	_env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	_env.ambient_light_color = Color(0.8, 0.85, 0.83)
	_env.fog_enabled = true
	_env.fog_mode = Environment.FOG_MODE_DEPTH
	_env.tonemap_mode = Environment.TONE_MAPPER_ACES
	_env.tonemap_white = 4.0
	_env.glow_enabled = true
	_env.glow_intensity = 0.55
	_env.glow_bloom = 0.12
	_env.glow_blend_mode = Environment.GLOW_BLEND_MODE_SCREEN
	_env.glow_hdr_threshold = 0.85
	_env.adjustment_enabled = true
	_env.adjustment_contrast = 1.08
	_env.adjustment_saturation = 0.88
	var we := WorldEnvironment.new()
	we.environment = _env
	add_child(we)

	_cam = Camera3D.new()
	_cam.fov = 72.0
	_cam.near = 0.05
	_cam.far = 100.0
	add_child(_cam)
	if args.size() >= 7:
		_cam.global_position = Vector3(float(args[1]), float(args[2]), float(args[3]))
		_cam.look_at(Vector3(float(args[4]), float(args[5]), float(args[6])), Vector3.UP)
	else:
		_cam.global_position = Vector3(0, 1.62, -7)
		_cam.look_at(Vector3(0, 1.5, -10.5), Vector3.UP)
	_cam.make_current()

	# UNMED first (the default), then force LUCID for real.
	await _shoot("%s_unmed" % _shot_name, false)
	StateManager.force_state(StateManager.State.LUCID, "gate_check")
	print("STATE now lucid=%s" % StateManager.is_lucid())
	await _shoot("%s_lucid" % _shot_name, true)

	get_tree().quit(0)


# Applies the per-state MOOD (fog/exposure/ambient) and the per-state fitting
# dimming exactly as Atmosphere does at runtime, then grabs the frame.
func _shoot(name: String, lucid: bool) -> void:
	var mood: Dictionary = (load("res://main.gd") as GDScript).MOOD
	var m: Dictionary = mood[1 if lucid else 0]
	_env.ambient_light_energy = float(m["ambient"])
	_env.fog_light_color = m["fog"]
	_env.background_color = m["fog"]
	_env.fog_depth_begin = float(m["fog_begin"])
	_env.fog_depth_end = float(m["fog_end"])
	_env.tonemap_exposure = float(m["exposure"])

	var scale := float(m["light_scale"])
	for l in _all_lights(_room):
		l.light_energy = 0.95 * scale

	for i in SETTLE_FRAMES:
		await get_tree().process_frame

	DirAccess.make_dir_recursive_absolute("res://.artifacts")
	var img := get_viewport().get_texture().get_image()
	img.save_png("res://.artifacts/%s.png" % name)
	print("wrote res://.artifacts/%s.png (%dx%d)" % [name, img.get_width(), img.get_height()])


func _all_lights(node: Node) -> Array:
	var out: Array = []
	if node is OmniLight3D:
		out.append(node)
	for child in node.get_children():
		out.append_array(_all_lights(child))
	return out
