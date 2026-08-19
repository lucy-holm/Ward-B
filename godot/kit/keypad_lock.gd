# The keypadDoor flow, factored out of the ten rooms that hand-roll it.
#
# Every one of those rooms wires the same four beats: (1) the keypad refuses
# to open at all while the player is unmedicated, with the exact same wall
# of static text every time — the ward reads as a blur without lucidity, so
# there is nothing TO read; (2) while lucid, interacting opens main's modal
# keypad against a room-held code; (3) a correct code swings the door open,
# drops its collider, and re-reads the code back in a success toast (so a
# RANDOMIZED code still checks out on screen rather than showing the
# original hard-coded one); (4) the objective line updates to send the
# player through it.
#
# WardCodes/WardSettings own persistence and the randomize-codes SETTING;
# this owns the per-room WIRING of that setting — the CLAUDE.md hard rule
# that a keypad room must call the reroll both on entry and after a catch, or
# the start-screen toggle silently does nothing for that room.
class_name KitKeypadLock
extends RefCounted

## Verbatim across all ten hand-rolled keypad rooms — what a player sees for
## trying to read the keypad without lucidity. Pulled out as a constant
## rather than typed at each call site: a future room paraphrasing this by
## hand is exactly the kind of drift the kit exists to prevent, since the
## line is meant to read identically everywhere the mechanic appears.
const UNMED_REFUSAL := "the keypad is a smear of static. you can't read it like this."

## Interactable ids this lock owns. `door_id`'s node is scenery — it is
## always AVAILABLE=false in `is_available` because the door itself is never
## interacted with by hand, only swung open by the keypad succeeding; see
## every room's `_is_available` match, which returns false for "exitdoor"
## unconditionally.
var door_id := "exitdoor"
var keypad_id := "keypad"

## Where and how far the door node moves when it swings open, and the name
## of the CollisionObject3D whose layer gets dropped alongside it.
var door_open_pos := Vector3.ZERO
var door_open_rot := PI / 2.0
var door_collider_name := "DoorCollider"

## Interpolated with the LIVE code via `%` on success — every room reads the
## just-solved code back so a randomized code still checks out visibly. A
## template with no "%s" in it is used verbatim (a room that does not want
## the code echoed back).
var success_toast := "the door is open."

## Written to the HUD objective right after the success toast. All ten rooms
## use the same line; kept overridable rather than hard-coded because it is
## still room-authored text, not a mechanic.
var objective := "the door is open. go."

## {"scrawl_id": String, "mask": Array} entries rewritten by every
## regenerate() call. A single-scrawl room supplies one entry with no mask
## (or an empty one); the room-5/12/17 split-clue pattern supplies two
## entries against the same code with complementary [start, end) masks — see
## WardCodes.code_clue_text for what the mask does.
var scrawls: Array[Dictionary] = []

var _code := ""
var _unlocked := false
var _ids_checked := false


## `config` accepts any of the fields above by name, plus "code" for the
## starting live code. Dictionary construction and direct field assignment
## are both supported — use whichever reads better at the call site; nothing
## here requires going through the constructor.
func _init(config: Dictionary = {}) -> void:
	_code = config.get("code", _code)
	door_id = config.get("door_id", door_id)
	keypad_id = config.get("keypad_id", keypad_id)
	door_open_pos = config.get("door_open_pos", door_open_pos)
	door_open_rot = config.get("door_open_rot", door_open_rot)
	door_collider_name = config.get("door_collider_name", door_collider_name)
	success_toast = config.get("success_toast", success_toast)
	objective = config.get("objective", objective)
	# `scrawls` is a TYPED array (Array[Dictionary]); a Dictionary literal at
	# the call site (e.g. `{"scrawls": [{...}, {...}]}`) type-checks as a
	# plain untyped Array, and a bare `=` from an untyped Array into a typed
	# one is a runtime error ("Trying to assign an array of type 'Array' to a
	# variable of type 'Array[Dictionary]'"), not a compile-time one — nothing
	# catches it until this constructor actually runs. `.assign()` copies
	# element-by-element into the existing typed array instead of rebinding
	# the reference, which is the actual fix, not just a cast.
	scrawls.assign(config.get("scrawls", scrawls))


## Overwrites the live code outright — for a room that generates its
## starting code some other way than the constructor's "code" key. `toast`,
## if given, replaces the success-toast template too.
func set_code(code: String, toast := "") -> void:
	_code = code
	if toast != "":
		success_toast = toast


func is_unlocked() -> bool:
	return _unlocked


## The shallow availability gate every hand-rolled `_is_available` ends with:
## the door is never directly interactable, the keypad is available until
## solved, and — matching every room's trailing `return true` — anything
## this lock does not own is left available. A room with other fixtures
## should call this LAST, after its own id-specific cases, exactly as the
## match statements it replaces fall through to `return true`.
func is_available(id: String) -> bool:
	if id == door_id:
		return false
	if id == keypad_id:
		return not _unlocked
	return true


## Returns true iff this lock claimed the interaction, mirroring every
## hand-rolled `on_interact`: an id that is not this lock's keypad falls
## through untouched (returns false) so the room's own on_interact can keep
## handling everything else.
func handle_interact(id: String, main: Node) -> bool:
	if id != keypad_id:
		# MISCONFIGURED-ID GUARD, checked once, on the first interaction this
		# lock declines. `keypad_id`/`door_id` default to the generic
		# "keypad"/"exitdoor"; a room whose fixtures are named anything else
		# (keypad21, doorA...) and which forgets to override them gets a lock
		# that silently declines EVERY interaction — handle_interact returns
		# false, the room's on_interact returns false, and main.gd's fallback
		# has no case for a keypad-type fixture, so the player clicks the
		# keypad and simply nothing happens. No error, no toast, nothing to
		# search for. Cheap to detect and near-impossible to diagnose blind,
		# so it warns rather than failing silently.
		#
		# Fires at most once per lock, and only on a declined id, so it costs
		# nothing on the hot path of a correctly configured room.
		if not _ids_checked:
			_ids_checked = true
			_warn_if_ids_missing(main)
		return false

	if not StateManager.is_lucid():
		main.hud_toast(UNMED_REFUSAL)
		return true

	# main.open_keypad emits keypad_open/success/denied telemetry itself —
	# see main.gd's room-script API header. The success callback is a closure
	# over `main` rather than a bound Callable, since open_keypad's contract
	# is a zero-argument on_success.
	main.open_keypad(_code, func() -> void: _on_code_accepted(main))
	return true


func _on_code_accepted(main: Node) -> void:
	_unlocked = true
	main.move_interactable(door_id, door_open_pos, door_open_rot)
	main.unlock_door(door_collider_name)
	var toast := success_toast % _code if success_toast.contains("%s") else success_toast
	main.hud_toast(toast)
	main.hud_objective(objective)


## The randomize-codes reroll (CLAUDE.md hard rule). A no-op whenever the
## setting is off, so a room can call this unconditionally from on_enter and
## again from its catch handler without checking the setting itself — every
## hand-rolled `_regenerate_code` starts with exactly this early return.
##
## `scrawls_override`, if non-empty, replaces the configured `scrawls` list
## for this call only — for a room that wants to pick which clue(s) get
## rewritten on a given call rather than always rewriting the same set.
func regenerate(main: Node, scrawls_override: Array = []) -> void:
	if not WardCodes.is_randomize_codes_enabled():
		return
	_code = WardCodes.random_code_4()
	var list: Array = scrawls_override if not scrawls_override.is_empty() else scrawls
	for entry: Dictionary in list:
		var mask: Array = entry.get("mask", [])
		main.update_scrawl_text(entry["scrawl_id"], WardCodes.code_clue_text(_code, mask))


## Warns when `door_id`/`keypad_id` name fixtures the current room does not
## contain. Read off the live room rather than a config list, so it cannot
## disagree with what actually shipped in the scene.
func _warn_if_ids_missing(main: Node) -> void:
	if main == null or not ("current_room" in main) or main.current_room == null:
		return
	var present := PackedStringArray()
	for node in KitInteractables.collect_recursive(main.current_room):
		present.append(node.interactable_id)
	var missing := PackedStringArray()
	if not (keypad_id in present):
		missing.append("keypad_id='%s'" % keypad_id)
	if not (door_id in present):
		missing.append("door_id='%s'" % door_id)
	if missing.is_empty():
		return
	push_warning(
		"KitKeypadLock: %s not found in this room. " % ", ".join(missing)
		+ "The lock will decline every interaction silently. "
		+ "Room's actual interactable ids: [%s]" % ", ".join(present))
