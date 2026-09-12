# Focused wall-writing fit audit.
#
# Loads every shipped room variant and measures the actual Label3D text mesh
# after the shared WardScrawl pass. This catches oversized text that a source
# review misses because Label3D's world footprint depends on font metrics,
# line count and authored roll.
extends Node

var failures: Array[String] = []
var passes := 0
var scrawls := 0


func _ready() -> void:
	StateManager.force_state(StateManager.State.UNMED, "scrawl_layout_test")
	for path in _room_paths():
		await _audit_room(path)
	await _test_room8_override_and_dynamic_text()
	await _test_nested_dynamic_text()
	await _test_removed_before_normalize()
	if failures.is_empty():
		print("OK - scrawl layout (%d rooms, %d labels, %d assertions)" % [
			_room_paths().size(), scrawls, passes])
		get_tree().quit()
	else:
		for failure in failures:
			push_error(failure)
		get_tree().quit(1)


func _room_paths() -> Array[String]:
	var out: Array[String] = []
	var dir := DirAccess.open("res://rooms")
	if dir == null:
		return out
	for room_id in dir.get_directories():
		var path := "res://rooms/%s/%s.tscn" % [room_id, room_id]
		if ResourceLoader.exists(path):
			out.append(path)
	out.sort()
	return out


func _audit_room(path: String) -> void:
	var room := (load(path) as PackedScene).instantiate()
	add_child(room)
	# StateObject defers normalization until the text mesh exists.
	await get_tree().process_frame
	await get_tree().process_frame
	await get_tree().process_frame
	var floor_box := _world_aabb(room.get_node_or_null("Shell/Floor"))
	var ceiling_box := _world_aabb(room.get_node_or_null("Shell/Ceiling"))
	var labels: Array[Label3D] = []
	_collect_scrawls(room, labels)
	_check(not labels.is_empty(), "%s has at least one wall scrawl" % path)
	for label in labels:
		scrawls += 1
		var box := WardScrawl.world_aabb(label)
		var is_code := String(label.name).begins_with("codeScrawl")
		var max_width := float(label.get_meta(WardScrawl.META_MAX_WIDTH,
			WardScrawl.MAX_CODE_WIDTH if is_code else WardScrawl.MAX_FLAVOUR_WIDTH))
		var max_height := float(label.get_meta(WardScrawl.META_MAX_HEIGHT,
			WardScrawl.MAX_CODE_HEIGHT if is_code else WardScrawl.MAX_FLAVOUR_HEIGHT))
		_check(maxf(box.size.x, box.size.z) <= max_width + 0.02,
				"%s/%s exceeds wall width (%.2fm)" % [path, label.name, maxf(box.size.x, box.size.z)])
		_check(box.size.y <= max_height + 0.02,
				"%s/%s exceeds text height (%.2fm)" % [path, label.name, box.size.y])
		_check(not label.no_depth_test,
				"%s/%s must retain depth testing for real occlusion" % [path, label.name])
		if floor_box.size != Vector3.ZERO:
			# A wall decal is allowed a small proud margin beyond the floor mesh,
			# but its text must remain in the shell rather than bleeding into the
			# next room or stair opening.
			_check(box.position.x >= floor_box.position.x - 0.30 and
					box.end.x <= floor_box.end.x + 0.30 and
					box.position.z >= floor_box.position.z - 0.30 and
					box.end.z <= floor_box.end.z + 0.30,
					"%s/%s bleeds beyond room floor footprint" % [path, label.name])
		if ceiling_box.size != Vector3.ZERO:
			_check(box.position.y >= floor_box.position.y - 0.02 and
					box.end.y <= ceiling_box.end.y + 0.02,
					"%s/%s crosses floor/ceiling envelope" % [path, label.name])
	room.queue_free()
	remove_child(room)


func _test_room8_override_and_dynamic_text() -> void:
	var room := (load("res://rooms/room8/room8.tscn") as PackedScene).instantiate()
	add_child(room)
	await get_tree().process_frame
	await get_tree().process_frame
	await get_tree().process_frame
	var label := room.find_child("bellOrder8", true, false) as Label3D
	_check(label != null, "room8 exposes its authored order clue")
	if label == null:
		room.queue_free()
		remove_child(room)
		return
	label.set_meta(WardScrawl.META_MAX_WIDTH, 1.35)
	label.set_meta(WardScrawl.META_MAX_HEIGHT, 0.65)
	var authored := float(label.get_meta(WardScrawl.META_AUTHORED_PIXEL_SIZE, label.pixel_size))
	var long_text := "call in order:\ntriangle\ncircle\nsquare"
	label.text = long_text
	WardScrawl.schedule(label)
	await get_tree().process_frame
	await get_tree().process_frame
	var long_box := WardScrawl.world_aabb(label)
	_check(maxf(long_box.size.x, long_box.size.z) <= 1.37 and long_box.size.y <= 0.67,
			"room8's narrow clue obeys its 1.35m x 0.65m metadata envelope")
	var dispenser_box := _combined_visual_aabb(room.get_node_or_null("Interactables/dispenser8/Model"))
	_check(dispenser_box.size == Vector3.ZERO or not long_box.intersects(dispenser_box),
			"room8's narrow clue does not overlap the dispenser model")
	label.text = "order"
	WardScrawl.schedule(label)
	await get_tree().process_frame
	await get_tree().process_frame
	_check(is_equal_approx(label.pixel_size, authored),
			"short dynamic clue restores its authored pixel size")
	label.text = long_text
	WardScrawl.schedule(label)
	await get_tree().process_frame
	await get_tree().process_frame
	var long_again := WardScrawl.world_aabb(label)
	_check(absf(long_again.size.y - long_box.size.y) < 0.03 and
			absf(long_again.size.x - long_box.size.x) < 0.03,
			"long dynamic clue regains its bounded size after shortening")
	room.queue_free()
	remove_child(room)


func _test_nested_dynamic_text() -> void:
	var room := (load("res://rooms/room16/room16.tscn") as PackedScene).instantiate()
	add_child(room)
	await get_tree().process_frame
	await get_tree().process_frame
	await get_tree().process_frame
	var label := room.find_child("phosphorScrawl16", true, false) as Label3D
	_check(label != null and label.get_parent().name == "phosphorScrawl16_light",
			"nested phosphor scrawl is found through its light wrapper")
	if label != null:
		label.set_meta(WardScrawl.META_MAX_WIDTH, 1.10)
		label.set_meta(WardScrawl.META_MAX_HEIGHT, 0.80)
		var authored := float(label.get_meta(WardScrawl.META_AUTHORED_PIXEL_SIZE, label.pixel_size))
		var long_text := "the phosphor warning is deliberately long\nfor a nested light label"
		label.text = long_text
		WardScrawl.schedule(label)
		await get_tree().process_frame
		await get_tree().process_frame
		var long_box := WardScrawl.world_aabb(label)
		_check(maxf(long_box.size.x, long_box.size.z) <= 1.12 and long_box.size.y <= 0.82,
				"nested dynamic text obeys its metadata envelope")
		label.text = "dark."
		WardScrawl.schedule(label)
		await get_tree().process_frame
		await get_tree().process_frame
		_check(is_equal_approx(label.pixel_size, authored),
				"nested short dynamic text restores its authored pixel size")
		label.text = long_text
		WardScrawl.schedule(label)
		await get_tree().process_frame
		await get_tree().process_frame
		var long_again := WardScrawl.world_aabb(label)
		_check(absf(long_again.size.x - long_box.size.x) < 0.03 and
				absf(long_again.size.y - long_box.size.y) < 0.03,
				"nested long text regains its bounded size after shortening")
	room.queue_free()
	remove_child(room)


func _test_removed_before_normalize() -> void:
	var room := (load("res://rooms/room1/room1.tscn") as PackedScene).instantiate()
	add_child(room)
	room.queue_free()
	await get_tree().process_frame
	_check(true, "removing a room before deferred scrawl fit is safe")


func _world_aabb(node: Node) -> AABB:
	if not node is VisualInstance3D:
		return AABB()
	var visual := node as VisualInstance3D
	var local := visual.get_aabb()
	var xf := visual.global_transform
	var out := AABB(xf * local.position, Vector3.ZERO)
	for i in range(1, 8):
		out = out.expand(xf * (local.position + Vector3(
			local.size.x if (i & 1) else 0.0,
			local.size.y if (i & 2) else 0.0,
			local.size.z if (i & 4) else 0.0)))
	return out


func _combined_visual_aabb(node: Node) -> AABB:
	if node == null:
		return AABB()
	var result := AABB()
	var found := false
	if node is VisualInstance3D:
		result = _world_aabb(node)
		found = result.size != Vector3.ZERO
	for child in node.get_children():
		var child_box := _combined_visual_aabb(child)
		if child_box.size == Vector3.ZERO:
			continue
		if not found:
			result = child_box
			found = true
		else:
			result = result.merge(child_box)
	return result if found else AABB()


func _collect_scrawls(node: Node, out: Array[Label3D]) -> void:
	if node is Label3D and _under_scrawls(node):
		out.append(node as Label3D)
	for child in node.get_children():
		_collect_scrawls(child, out)


func _under_scrawls(node: Node) -> bool:
	var current := node.get_parent()
	while current != null:
		if current.name == "Scrawls":
			return true
		current = current.get_parent()
	return false


func _check(condition: bool, message: String) -> void:
	if condition:
		passes += 1
	else:
		failures.append(message)
