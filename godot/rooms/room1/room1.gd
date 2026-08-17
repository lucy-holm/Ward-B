# ROOM 1 — the Cell.
#
# Tutorial: states change the world, and where pills come from. Player wakes
# unmedicated, cannot shift, and there is no door until the pill is taken.
#
# Beat order is a hard gate: the cup is the ONLY interactable until it's
# taken, and the dispenser only becomes available afterwards, so the
# dispenser can never teach itself before the pill does.
extends Node3D

var _took_pill := false
var _used_dispenser := false

var _main: Node = null


func on_enter(main: Node) -> void:
	_main = main
	_took_pill = false
	_used_dispenser = false

	for node in _interactables():
		node.availability = _is_available

	main.hud_objective("your head is loud. there's a paper cup on the table.")
	main.hud_toast("take the pill. everyone says so. even the walls.")


func _interactables() -> Array[Interactable]:
	var out: Array[Interactable] = []
	var root := get_node_or_null("Interactables")
	if root == null:
		return out
	for child in root.get_children():
		if child is Interactable:
			out.append(child as Interactable)
		else:
			for sub in child.get_children():
				if sub is Interactable:
					out.append(sub as Interactable)
	return out


func _is_available(id: String) -> bool:
	match id:
		"cup":
			return not _took_pill
		# Hard-gated behind the pill so the dispenser can't teach itself first.
		"dispenser1":
			return _took_pill
	return true


## Return true to fully handle the interaction; false falls through to the
## generic handlers (dispenser refill, pill pickup) — the same
## "return false to fall through" idiom the TS room used.
func on_interact(id: String) -> bool:
	if id == "cup":
		_took_pill = true
		StateManager.can_shift = true
		StateManager.force_state(StateManager.State.LUCID, "tutorial")
		_main.shift_fx()
		_main.remove_interactable("cup")
		_main.hud_toast("the wall remembers it was a door.")
		_main.hud_objective("press Q to shift. it costs a pill every time.")
		return true

	if id == "dispenser1":
		if not _used_dispenser:
			_used_dispenser = true
			_main.hud_objective("the door is open. go.")
		return false  # let the generic dispenser refill run

	return false
