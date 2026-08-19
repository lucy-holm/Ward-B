# ROOM 2 — the Corridor.
#
# Teaches the second half of the pill economy: LUCID is the state that reads
# machinery (the keypad), UNMED is the state that reads the walls (the code).
# The player must burn a pill to act on what they saw for free.
#
# The corridor carries its own dispenser on purpose: rooms are one-way, so a
# player who skipped the cell dispenser could otherwise strand themselves
# unmed with no way back to lucid for the keypad.
extends Node3D

# The wall clue and the keypad share this. Rerolled by _regenerate_code() on
# entry when the randomize-codes setting is on; stays FIXED forever when it
# is off, exactly as before the setting existed.
var _code := "4118"

var _door_unlocked := false
var _saw_scrawls_toast := false

var _main: Node = null


func on_enter(main: Node) -> void:
	_main = main
	_door_unlocked = false
	_saw_scrawls_toast = false

	for node in _interactables():
		node.availability = _is_available

	_regenerate_code()
	main.hud_objective("a staff door blocks the ward. it wants a code you don't have.")


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
		# The door is scenery: it is opened by the keypad, never by hand.
		"staffdoor":
			return false
		"keypad1":
			return not _door_unlocked
	return true


func on_interact(id: String) -> bool:
	if id == "keypad1":
		if not StateManager.is_lucid():
			_main.hud_toast("the keypad is a smear of static. you can't read it like this.")
			return true
		# main.open_keypad emits keypad_open/success/denied itself.
		_main.open_keypad(_code, _on_code_accepted)
		return true

	return false


func _on_code_accepted() -> void:
	_door_unlocked = true
	_main.move_interactable("staffdoor", Vector3(-0.9, 1.5, -9.85), PI / 2.0)
	_main.unlock_door("DoorCollider")
	_main.hud_toast("it was written on the wall the whole time. by whom?")
	_main.hud_objective("through the door. the ward opens up beyond it.")


func on_state_change(next: StateManager.State) -> void:
	if next == StateManager.State.UNMED and not _saw_scrawls_toast:
		_saw_scrawls_toast = true
		_main.hud_toast("the wall is loud here.")


# --- randomize-codes (CLAUDE.md hard rule) ---------------------------------
# Rerolls the code and the wall clue that leaks it. Called on entry; this room
# has no orderly, so there is no catch handler to call it a second time.
func _regenerate_code() -> void:
	if not WardCodes.is_randomize_codes_enabled():
		return
	_code = WardCodes.random_code_4()
	_main.update_scrawl_text("codeScrawl", WardCodes.code_clue_text(_code))
