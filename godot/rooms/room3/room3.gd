# ROOM 3 — the Common Room.
#
# Inverts Room 2's lesson: LUCID reads machinery, but here it's LUCID that
# lies. The exit is chained shut only while medicated — the chains are a
# symptom, not a fact. Trusting UNMED reality is the whole game, right at
# the end.
#
# No keypad and no orderly. The exit door is available in BOTH states on
# purpose: the refusal IS the puzzle. Gating the door out of lucid would
# hide the lie instead of telling it.
extends Node3D

var _chains_seen_fired := false

var _main: Node = null


func on_enter(main: Node) -> void:
	_main = main
	_chains_seen_fired = false

	for node in _interactables():
		node.availability = _is_available

	main.hud_objective("the exit door, dead ahead. it doesn't look like it wants you lucid.")


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


func _is_available(_id: String) -> bool:
	# Nothing is gated here — the door answers differently, it is never absent.
	return true


func on_interact(id: String) -> bool:
	if id == "exitdoor":
		if StateManager.is_lucid():
			_main.hud_toast("chained shut. heavy padlock. it looks very, very real.")
			Telemetry.event("door_refused")
			return true

		_main.remove_interactable("exitdoor")
		_main.unlock_door("DoorCollider")
		_main.hud_toast("it was never locked. only you were.")
		_main.hud_objective("walk through.")
		return true

	return false


func on_state_change(next: StateManager.State) -> void:
	# Fires once, on the first lucid shift in the room — "the player has now
	# seen the chains" is the fact the funnel needs, not "shifted lucid".
	if next == StateManager.State.LUCID and not _chains_seen_fired:
		_chains_seen_fired = true
		Telemetry.event("chains_seen")
	if next == StateManager.State.UNMED:
		_main.hud_toast("the chains were never yours.")
