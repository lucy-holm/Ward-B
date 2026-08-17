# Lighting-verification harness for the reflectivity pass. Renders the REAL
# game (main.tscn + its own player Camera3D + WorldEnvironment — see
# shoot_game.gd's header for why that distinction matters) and captures BOTH
# ward states back-to-back in one process, plus numeric RGB measurements over
# a floor-weighted region so "did the sheen change" is a number, not a vibe.
#
#   godot --path godot --resolution 1280x720 tools/shoot_states.tscn -- <name> <room_id> [seconds]
#
# Writes res://.artifacts/<name>_unmed.png and <name>_lucid.png, and prints
# one measurement line per shot: avg RGB over the full frame and over the
# bottom third (floor-heavy, where sheen should show).
extends Node

func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	var shot_name: String = args[0] if args.size() > 0 else "shot"
	var room_id: String = args[1] if args.size() > 1 else "room1"
	var seconds: float = float(args[2]) if args.size() > 2 else 5.0

	var game: Node = load("res://main.tscn").instantiate()
	add_child(game)

	# Dismiss the start overlay, exactly as shoot_game.gd does and for the same
	# reason (see its header): the overlay is a near-opaque full-screen
	# CanvasLayer, so without this every shot here is a photograph of the
	# WARD B title card, not the ward — which is exactly what happened when
	# this script was first used for the 2026-08 lighting pass (both "unmed"
	# and "lucid" shots were pixel-identical title screens).
	if game.get("start_overlay") != null and game.start_overlay.has_method("_on_admit_pressed"):
		game.start_overlay._on_admit_pressed()

	await get_tree().create_timer(seconds).timeout

	if game.has_method("load_room"):
		game.load_room(room_id)
		await get_tree().create_timer(2.5).timeout

	var cam := _find_active_camera(game)
	if cam != null and cam.environment != null:
		push_error("Camera3D '%s' has an environment override — MOOD is not reaching the screen."
			% cam.name)

	DirAccess.make_dir_recursive_absolute("res://.artifacts")

	# UNMED is the default spawn state.
	await get_tree().create_timer(0.3).timeout
	_shoot("%s_unmed" % shot_name)

	# Force LUCID directly (no pill cost, no shift animation) via the
	# autoload StateManager.
	StateManager.force_state(StateManager.State.LUCID, "shoot_states")
	await get_tree().create_timer(1.5).timeout
	_shoot("%s_lucid" % shot_name)

	get_tree().quit(0)


func _shoot(name: String) -> void:
	var img := get_viewport().get_texture().get_image()
	img.save_png("res://.artifacts/%s.png" % name)
	var w := img.get_width()
	var h := img.get_height()

	var full := _avg_rect(img, 0, 0, w, h)
	var floor_band := _avg_rect(img, 0, int(h * 0.66), w, h)
	var center := _avg_rect(img, int(w * 0.35), int(h * 0.35), int(w * 0.65), int(h * 0.65))

	print("MEASURE %s full=(%.1f,%.1f,%.1f) floor=(%.1f,%.1f,%.1f) center=(%.1f,%.1f,%.1f)" % [
		name, full.x, full.y, full.z, floor_band.x, floor_band.y, floor_band.z,
		center.x, center.y, center.z])
	print("wrote res://.artifacts/%s.png (%dx%d)" % [name, w, h])


func _avg_rect(img: Image, x0: int, y0: int, x1: int, y1: int) -> Vector3:
	var sum := Vector3.ZERO
	var n := 0
	var step := 4  # subsample — this is a diagnostic average, not a heatmap
	var y := y0
	while y < y1:
		var x := x0
		while x < x1:
			var c := img.get_pixel(x, y)
			sum += Vector3(c.r, c.g, c.b) * 255.0
			n += 1
			x += step
		y += step
	if n == 0:
		return Vector3.ZERO
	return sum / n


func _find_active_camera(node: Node) -> Camera3D:
	if node is Camera3D and (node as Camera3D).current:
		return node as Camera3D
	for child in node.get_children():
		var c := _find_active_camera(child)
		if c != null:
			return c
	return null
