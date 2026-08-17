extends Node3D
## Verification-only helper for preview_props.tscn: waits a few frames for
## the renderer to settle, saves a screenshot to .artifacts/, then quits —
## so the preview can be driven headlessly-in-spirit from a script/CI while
## still rendering with the real windowed GL context (--headless skips
## rendering entirely, which is why this scene must NOT be run with it).

func _ready() -> void:
	for i in 6:
		await get_tree().process_frame
	await get_tree().create_timer(0.4).timeout
	var img := get_viewport().get_texture().get_image()
	var out_dir := ProjectSettings.globalize_path("res://.artifacts")
	DirAccess.make_dir_recursive_absolute(out_dir)
	var out_path := out_dir + "/preview_props.png"
	img.save_png(out_path)
	print("preview_props: screenshot saved to ", out_path)
	get_tree().quit()
