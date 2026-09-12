## Ordered ward calls shared by the later rooms. The room owns this object,
## its route/order, and its door callback; a catch never reconfigures it.
class_name KitBellSequence
extends RefCounted

var order: Array[String] = []
var progress := 0
var completed := false
var _main: Node
var _room: Node
var _puzzle := ""
var _prefix := ""
var _on_complete: Callable


func configure(main: Node, room: Node, puzzle: String, prefix: String,
		sequence: Array, on_complete: Callable, clue_id := "") -> void:
	assert(sequence.size() == 3 and sequence.has("circle")
		and sequence.has("square") and sequence.has("triangle"))
	_main = main
	_room = room
	_puzzle = puzzle
	_prefix = prefix
	_on_complete = on_complete
	order.assign(sequence)
	progress = 0
	completed = false
	if not clue_id.is_empty():
		_main.update_scrawl_text(clue_id, "bell order\n1. %s\n2. %s\n3. %s" % order)
	refresh_visuals()
	Telemetry.event("puzzle_layout", {"puzzle": _puzzle, "order": order.duplicate()})


func handles(id: String) -> bool:
	return id.begins_with(_prefix) and order.has(id.trim_prefix(_prefix))


func is_available(id: String) -> bool:
	return handles(id) and not completed and not _is_latched(id.trim_prefix(_prefix))


func handle(id: String) -> bool:
	if not handles(id):
		return false
	var shape := id.trim_prefix(_prefix)
	if completed or _is_latched(shape):
		return true
	if StateManager.is_lucid():
		_main.hud_toast("under the quiet, the bell makes no sound. ring it unmedicated.")
		return true
	WardAudio.dispenser_clunk()
	_main.emit_noise("call_bell_" + shape, _main.player.global_position, _main.player.level)
	if shape != order[progress]:
		progress = 0
		refresh_visuals()
		Telemetry.event("puzzle_step", {"puzzle": _puzzle, "step": "sequence_reset", "shape": shape})
		_main.hud_toast("the wrong bell. the lamps go dark. read the numbered order again.")
		return true
	progress += 1
	completed = progress == order.size()
	refresh_visuals()
	Telemetry.event("puzzle_step", {"puzzle": _puzzle, "step": "bell_latched", "shape": shape, "count": progress})
	if completed:
		Telemetry.event("puzzle_step", {"puzzle": _puzzle, "step": "complete"})
		if _on_complete.is_valid():
			_on_complete.call()
	else:
		_main.hud_toast("%d of three. the lamp holds. the sound carries." % progress)
		_main.hud_objective("%d of three calls hold. follow the order; the lamps remember." % progress)
	return true


func refresh_visuals() -> void:
	for shape in order:
		var bell: Interactable = _main._find_interactable(_room, _prefix + shape)
		if bell == null:
			continue
		var model := bell.get_node_or_null("Model")
		if model != null and model.has_method("set_engaged"):
			model.set_engaged(_is_latched(shape))


func _is_latched(shape: String) -> bool:
	return shape in order.slice(0, progress)
