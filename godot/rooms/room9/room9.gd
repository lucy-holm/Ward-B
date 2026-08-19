# ROOM 9 — the Doctor's Office.
#
# A no-threat breather after the east ward: no orderly, nothing hunting. The
# coat on the rack holds a found pill — a small, calm top-up with nothing
# chasing you, so it actually registers.
#
# The exit still asks for the established two things (a code read unmed, a
# keypad worked lucid), so the player leaves having felt the oscillation once
# while it is still free of consequence, right before room 10 makes it
# expensive.
#
# The one bit of teaching here is the coat gate: the keypad does nothing until
# you have taken the coat (playtest 7 — the coat read as skippable set
# dressing, not a pickup). Because _is_available() hides the keypad from the
# interact raycast while the coat is unclaimed, a click there is silent, so the
# per-frame proximity check below is what actually surfaces the nudge.
extends Node3D

# The wall clue and the keypad share this. Rerolled by _regenerate_code() on
# entry when the randomize-codes setting is on; stays FIXED forever when it is
# off, exactly like room2.
var _code := "5216"

var _bottle_taken := false
var _door_unlocked := false
# One-shot nudge for "you tried to skip the coat". Reset on every entry.
var _gate_nudged := false

var _main: Node = null

const GATE_TOAST := "not yet. take what's hanging there."
# Nudge anchors: the keypad, and the door it guards. Used ONLY for the
# proximity toast — never for collision or interaction (the door is scenery,
# opened by the keypad, same as every other room's exitdoor).
const KEYPAD_POS := Vector2(1.35, -5.75)
const DOOR_POS := Vector2(0.0, -6.0)
const NUDGE_RADIUS := 2.5


func on_enter(main: Node) -> void:
	_main = main
	_bottle_taken = false
	_door_unlocked = false
	_gate_nudged = false

	for node in _interactables():
		node.availability = _is_available

	_regenerate_code()
	main.hud_objective("the doctor's office. gone quiet. there's a coat on the rack, heavier than it should be — take it before anything else.")


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
		# Scenery: opened by the keypad, never by hand.
		"exitdoor":
			return false
		# Gated on the coat first, then on the door not already being open.
		"keypad9":
			return _bottle_taken and not _door_unlocked
	return true


func on_interact(id: String) -> bool:
	if id == "bottle":
		_take_coat()
		return true

	if id == "keypad9":
		if not StateManager.is_lucid():
			_main.hud_toast("the keypad is a smear of static. you can't read it like this.")
			return true
		# main.open_keypad emits keypad_open/success/denied itself.
		_main.open_keypad(_code, _on_code_accepted)
		return true

	return false


# Intercepted rather than left to main.gd's builtin `pill_pickup` branch: the
# builtin has one flat toast and no objective change, where the coat varies its
# line on an already-full carry and hands over the next beat. It also emits
# `pill_pickup`; the coat is tracked as `coat_pill_found` instead.
func _take_coat() -> void:
	if _bottle_taken:
		return
	_bottle_taken = true
	_main.remove_interactable("bottle")

	var was_full: bool = GameState.pills >= Tuning.PILLS_MAX
	if not was_full:
		# The HUD pill counter redraws off GameState.pills_changed, so there is
		# nothing to push to it here.
		GameState.refill()

	if was_full:
		_main.hud_toast("someone's coat, one pocket lined with foil. already empty — you're carrying all it had.")
	else:
		_main.hud_toast("someone's coat, one pocket lined with foil. a pill, loose. pocketed.")

	Telemetry.event("coat_pill_found")
	_main.hud_objective("the code is written where you can't read it clean.")


func _on_code_accepted() -> void:
	_door_unlocked = true
	_main.move_interactable("exitdoor", Vector3(-1, 1.5, -6.85), PI / 2.0)
	# unlock_door() drops the collider, rebuilds the cache and emits
	# door_opened itself.
	_main.unlock_door("DoorCollider")
	# Interpolates the LIVE code — a rerolled code must read back correctly.
	_main.hud_toast("%s. someone else needed reminding, once." % _code)
	_main.hud_objective("the door is open. go.")


# --- the coat gate ---------------------------------------------------------

func _physics_process(_delta: float) -> void:
	if _main == null or _bottle_taken or _gate_nudged:
		return

	# Explicitly typed: _main is a plain Node, so the property chain carries no
	# static type and `:=` cannot infer one here.
	var p: Vector3 = _main.player.global_position
	var here := Vector2(p.x, p.z)
	if here.distance_to(KEYPAD_POS) < NUDGE_RADIUS or here.distance_to(DOOR_POS) < NUDGE_RADIUS:
		_gate_nudged = true
		_main.hud_toast(GATE_TOAST)
		Telemetry.event("coat_gate_nudge")


# --- randomize-codes (CLAUDE.md hard rule) ---------------------------------
# Rerolls the code and the wall clue that leaks it. Called on entry; this room
# has no orderly, so there is no catch handler to call it a second time.
func _regenerate_code() -> void:
	if not WardCodes.is_randomize_codes_enabled():
		return
	_code = WardCodes.random_code_4()
	_main.update_scrawl_text("codeScrawl", WardCodes.code_clue_text(_code))
