# Shared wall-writing layout rules.
#
# Room scenes carry Label3D scrawls because that keeps authored text editable
# and lets the existing state wrapper gate all writing in UNMED. The old
# emitter treated `size` as if it were a world width, which made long clues
# grow through adjacent walls and, for three-line clues, into the ceiling.
# This helper keeps the authored pixel style while constraining the rendered
# footprint to a readable wall-sized envelope.
class_name WardScrawl
extends RefCounted

## Maximum rendered envelope for ordinary narrative writing.
const MAX_FLAVOUR_WIDTH := 4.0
const MAX_FLAVOUR_HEIGHT := 1.5
## Codes are intentionally compact so each digit remains easy to isolate.
const MAX_CODE_WIDTH := 2.2
const MAX_CODE_HEIGHT := 1.25
const WALL_EDGE_MARGIN := 0.16
## Optional per-label overrides, expressed in world metres. The room emitter
## may set these on a narrow wall band; absent metadata uses the defaults above.
const META_MAX_WIDTH := "scrawl_max_width"
const META_MAX_HEIGHT := "scrawl_max_height"
const META_AUTHORED_PIXEL_SIZE := "scrawl_authored_pixel_size"


## Return the world-space AABB represented by a Label3D's current text mesh.
## The caller must wait for one rendered frame after changing text or size.
static func world_aabb(label: VisualInstance3D) -> AABB:
	var local := label.get_aabb()
	var xf := label.global_transform
	var out := AABB(xf * local.position, Vector3.ZERO)
	for i in range(1, 8):
		out = out.expand(xf * (local.position + Vector3(
			local.size.x if (i & 1) else 0.0,
			local.size.y if (i & 2) else 0.0,
			local.size.z if (i & 4) else 0.0)))
	return out


## Fit every Label3D below `root` into its bounded wall-writing envelope.
## Uniform pixel-size scaling preserves glyph proportions and the authored
## roll, while keeping all text at the same wall-facing depth.
static func normalize(root: Node) -> int:
	return _normalize_tree(root)


## Restore the size supplied by the room author before a text mesh is rebuilt.
## This makes normalization idempotent when a randomized clue changes text.
static func restore_authored(root: Node) -> void:
	for child in root.get_children():
		if child is Label3D:
			var label := child as Label3D
			if not label.has_meta(META_AUTHORED_PIXEL_SIZE):
				label.set_meta(META_AUTHORED_PIXEL_SIZE, label.pixel_size)
			else:
				label.pixel_size = float(label.get_meta(META_AUTHORED_PIXEL_SIZE))
		restore_authored(child)


static func _normalize_tree(root: Node) -> int:
	var changed := 0
	for child in root.get_children():
		if child is Label3D:
			var label := child as Label3D
			var box := world_aabb(label)
			if box.size.x > 0.001 or box.size.y > 0.001:
				var is_code := String(label.name).begins_with("codeScrawl")
				var max_width := float(label.get_meta(META_MAX_WIDTH,
					MAX_CODE_WIDTH if is_code else MAX_FLAVOUR_WIDTH))
				var max_height := float(label.get_meta(META_MAX_HEIGHT,
					MAX_CODE_HEIGHT if is_code else MAX_FLAVOUR_HEIGHT))
				var factor := _fit_factor(label, box, root, max_width, max_height)
				if factor < 0.9999:
					label.pixel_size *= factor
					changed += 1
		changed += _normalize_tree(child)
	return changed


## Schedule a fit after `Label3D.text` changes. The nearest Scrawls wrapper is
## the owner even for nested phosphor/light children.
static func schedule(label: Label3D) -> void:
	var root := label.get_parent()
	while root != null and root.name != "Scrawls":
		root = root.get_parent()
	if root != null and root.has_method("queue_scrawl_normalize"):
		root.call("queue_scrawl_normalize")


static func _find_room_shell(scrawls_root: Node, part: String) -> Node:
	var room := scrawls_root.get_parent()
	while room != null:
		var shell_part := room.get_node_or_null("Shell/" + part)
		if shell_part != null:
			return shell_part
		room = room.get_parent()
	return null


static func _fit_factor(label: Label3D, box: AABB, scrawls_root: Node,
		max_width: float, max_height: float) -> float:
	var factor := minf(1.0, minf(max_width / maxf(box.size.x, box.size.z),
		max_height / maxf(box.size.y, 0.001)))
	var floor_node := _find_room_shell(scrawls_root, "Floor")
	var ceiling_node := _find_room_shell(scrawls_root, "Ceiling")
	if floor_node is VisualInstance3D:
		var floor_box := world_aabb(floor_node as VisualInstance3D)
		var axis_width := maxf(box.size.x, box.size.z)
		var centre := box.position + box.size * 0.5
		var room_min := floor_box.position.x if box.size.x >= box.size.z else floor_box.position.z
		var room_max := floor_box.end.x if box.size.x >= box.size.z else floor_box.end.z
		var centre_axis := centre.x if box.size.x >= box.size.z else centre.z
		var edge_limited := 2.0 * minf(centre_axis - room_min - WALL_EDGE_MARGIN,
			room_max - WALL_EDGE_MARGIN - centre_axis)
		if edge_limited > 0.05:
			factor = minf(factor, edge_limited / maxf(axis_width, 0.001))
		if ceiling_node is VisualInstance3D:
			var ceiling_box := world_aabb(ceiling_node as VisualInstance3D)
			var lower := floor_box.end.y + WALL_EDGE_MARGIN
			var upper := ceiling_box.end.y - WALL_EDGE_MARGIN
			var height_limited := 2.0 * minf(centre.y - lower, upper - centre.y)
			if height_limited > 0.05:
				factor = minf(factor, height_limited / maxf(box.size.y, 0.001))
	return clampf(factor, 0.0, 1.0)
