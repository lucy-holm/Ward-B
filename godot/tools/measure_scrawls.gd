# Measures how wide a room's scrawls actually render.
#
#   godot --headless --path godot tools/measure_scrawls.tscn -- res://rooms/room15/room15.tscn
#
# WHY THIS EXISTS. ScrawlDef.size was a canvas-texture scale in the Three.js
# build, not a world measurement, and the port turns it into
# Label3D.pixel_size = size * 0.0013 with a 128px font. The result is that a
# scrawl renders FAR wider than its authored number suggests — a size-2.8 line
# of 26 characters is over 6 metres of wall — and a scrawl authored near the
# end of a wall run silently punches through the wall at right angles to it,
# or across a doorway. That has bitten more than one room.
#
# Prints, per scrawl: its authored size, its measured world-space width and
# height, and the span it occupies along its own wall. Compare that span
# against the wall run you meant to write on.
extends Node


func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	if args.is_empty():
		print("usage: measure_scrawls.tscn -- res://rooms/roomN/roomN.tscn")
		get_tree().quit(1)
		return

	var path: String = args[0]
	if not ResourceLoader.exists(path):
		push_error("no such scene: %s" % path)
		get_tree().quit(1)
		return

	var room: Node = (load(path) as PackedScene).instantiate()
	add_child(room)
	# Label3D sizes its mesh lazily; one frame is enough for get_aabb().
	await get_tree().process_frame
	await get_tree().process_frame

	print("")
	print("scrawl widths in %s" % path)
	for label in _labels(room):
		# WORLD-space extents, not the local AABB: every scrawl carries a small
		# deterministic ROLL (see gen_rooms.py's _scrawl_tilt), which widens its
		# footprint along the wall by h * sin(roll). Measuring locally would
		# under-report the span by up to ~0.35m, which is exactly the margin a
		# scrawl authored near the end of a wall run has to play with.
		var aabb := label.get_aabb()
		var basis := label.global_transform.basis
		var ext := (basis.x * aabb.size.x).abs() + (basis.y * aabb.size.y).abs()
		var w_x := ext.x
		var w_z := ext.z
		var h := ext.y
		var p := label.global_position
		var along_x := w_x > w_z
		var w: float = maxf(w_x, w_z)
		var centre := p.x if along_x else p.z
		print("  %-14s size=%-5s  %.2fm x %.2fm   spans %s [%.2f .. %.2f] at %s=%.2f"
			% [label.name, str(label.pixel_size / 0.0013).pad_decimals(1), w, h,
				"x" if along_x else "z", centre - w * 0.5, centre + w * 0.5,
				"z" if along_x else "x", p.z if along_x else p.x])
	print("")
	print("OK - measured")
	get_tree().quit(0)


func _labels(node: Node) -> Array[Label3D]:
	var out: Array[Label3D] = []
	if node is Label3D:
		out.append(node as Label3D)
	for child in node.get_children():
		out.append_array(_labels(child))
	return out
