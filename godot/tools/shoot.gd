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
	add_child(packed.instantiate())

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
