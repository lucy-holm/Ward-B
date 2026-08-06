# Headless room validator — the Godot analogue of `npm run check:rooms`.
#
#   godot --headless --path godot tools/check_rooms.tscn
#
# Run as a SCENE, not with --script: autoloads (StateManager, GameState,
# Tuning) are not registered for a custom SceneTree script, and every room
# depends on them the moment it enters the tree.
#
# Instantiating a room scene is the only way to prove its wiring, exactly as
# the TS version imports every room module rather than trusting the compiler.
# Checks:
#   - every room in main.gd's ROOM_SCENES resolves and instantiates
#   - a Spawn marker exists and is not inside solid geometry in either state
#   - every exit target resolves to a registered room (or END)
#   - the exit chain from room1 is unbroken and reaches every room
#   - interactable ids are unique within a room
#   - the collider cache is non-empty
extends Node

var failures: Array[String] = []
var checked := 0


func _ready() -> void:
	var registry := _parse_registry()
	if registry.is_empty():
		_fail("main.gd ROOM_SCENES is empty or unparseable")
		_finish()
		return

	for id: String in registry:
		_check_room(id, registry[id], registry)

	_check_chain(registry)
	_finish()


func _parse_registry() -> Dictionary:
	# Read the registry straight out of main.gd so a room can never be
	# validated while unregistered — the same "registration is a real
	# invariant" idea as the TS checker.
	var out := {}
	var f := FileAccess.open("res://main.gd", FileAccess.READ)
	if f == null:
		return out
	var inside := false
	while not f.eof_reached():
		var line := f.get_line().strip_edges()
		if line.begins_with("const ROOM_SCENES"):
			inside = true
			continue
		if inside:
			if line.begins_with("}"):
				break
			var parts := line.split(":", true, 1)
			if parts.size() == 2:
				var key := parts[0].strip_edges().trim_prefix('"').trim_suffix('"')
				var val := parts[1].strip_edges().trim_suffix(",").strip_edges()
				val = val.trim_prefix('"').trim_suffix('"')
				if not key.is_empty() and not val.is_empty():
					out[key] = val
	return out


func _instantiate(path: String) -> Node:
	if not ResourceLoader.exists(path):
		return null
	var packed: PackedScene = load(path)
	if packed == null:
		return null
	var room: Node = packed.instantiate()
	if room == null:
		return null
	add_child(room)
	return room


func _dispose(room: Node) -> void:
	remove_child(room)
	room.free()


func _check_room(id: String, path: String, registry: Dictionary) -> void:
	checked += 1

	var room := _instantiate(path)
	if room == null:
		_fail("%s: could not load/instantiate %s" % [id, path])
		return

	var col := WardCollision.new()
	col.rebuild_from(room)
	if col.boxes.is_empty():
		_fail("%s: collider cache is empty — no solid geometry found" % id)

	# --- spawn ---
	var spawn: Node3D = room.get_node_or_null("Spawn")
	if spawn == null:
		_fail("%s: no Spawn marker" % id)
	else:
		var p := spawn.global_position
		for state in [StateManager.State.UNMED, StateManager.State.LUCID]:
			if col.is_blocked_at(p.x, p.z, Tuning.PLAYER_RADIUS, state):
				var sn := "unmed" if state == StateManager.State.UNMED else "lucid"
				_fail("%s: spawn (%.2f, %.2f) is inside solid geometry while %s"
					% [id, p.x, p.z, sn])

	# --- exits ---
	var exits: Node = room.get_node_or_null("Exits")
	if exits == null or exits.get_child_count() == 0:
		_fail("%s: no exits" % id)
	else:
		for child in exits.get_children():
			if not (child is RoomExit):
				continue
			var to: String = (child as RoomExit).exit_to
			if to == "END":
				continue
			if not registry.has(to):
				_fail("%s: exit targets unregistered room '%s'" % [id, to])

	# --- unique interactable ids ---
	_collect_ids(room, {}, id)

	_dispose(room)


func _collect_ids(node: Node, seen: Dictionary, room_id: String) -> void:
	if node is Interactable:
		var iid: String = (node as Interactable).interactable_id
		if iid.is_empty():
			_fail("%s: interactable with empty id" % room_id)
		elif seen.has(iid):
			_fail("%s: duplicate interactable id '%s'" % [room_id, iid])
		else:
			seen[iid] = true
	for child in node.get_children():
		_collect_ids(child, seen, room_id)


func _check_chain(registry: Dictionary) -> void:
	# Walk room1 -> ... -> END and confirm every room is reachable.
	var visited := {}
	var cursor := "room1"
	var guard := 0
	while registry.has(cursor) and guard < 64:
		guard += 1
		if visited.has(cursor):
			_fail("exit chain loops at '%s'" % cursor)
			return
		visited[cursor] = true

		var room := _instantiate(registry[cursor])
		if room == null:
			return
		var next := ""
		var exits: Node = room.get_node_or_null("Exits")
		if exits != null:
			for child in exits.get_children():
				if child is RoomExit:
					next = (child as RoomExit).exit_to
					break
		_dispose(room)

		if next.is_empty():
			_fail("chain: '%s' has no exit" % cursor)
			return
		if next == "END":
			break
		cursor = next

	for id: String in registry:
		if not visited.has(id):
			_fail("'%s' is registered but unreachable from room1" % id)


func _fail(msg: String) -> void:
	failures.append(msg)


func _finish() -> void:
	print("")
	print("check_rooms: %d room(s) checked" % checked)
	if failures.is_empty():
		print("  OK - all invariants hold")
	else:
		for f in failures:
			print("  FAIL  %s" % f)
		print("  %d failure(s)" % failures.size())
	print("")
	get_tree().quit(0 if failures.is_empty() else 1)
