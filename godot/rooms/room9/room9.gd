# ROOM 9 — The doctor's key.
# A quiet breather: search the coat for a pill and a physical door key, then
# use the brass lock while lucid. No code or extra scavenger hunt follows the
# two-orderly bell room. The patient chart and both-state refill remain.
# The coat is one-use, a full pill inventory never prevents taking the key,
# and neither the key nor the exit depends on a randomized code setting.
extends Node3D

var _bottle_taken := false
var _door_unlocked := false
# One-shot nudge for "you tried to skip the coat". Reset on every entry.
var _gate_nudged := false

var _main: Node = null

const GATE_TOAST := "not yet. take what's hanging there."
# Nudge anchors: the lock, and the door it guards. Used ONLY for the
# proximity toast — never for collision or interaction (the door is scenery,
# opened by the lock, same as every other room's exitdoor).
const LOCK_POS := Vector2(1.35, -5.75)
const DOOR_POS := Vector2(0.0, -6.0)
const NUDGE_RADIUS := 2.5


func on_enter(main: Node) -> void:
	_main = main
	_bottle_taken = false
	_door_unlocked = false
	_gate_nudged = false

	for node in _interactables():
		node.availability = _is_available

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
		# Scenery: opened by the lock, never by hand.
		"exitdoor":
			return false
		# Focusable before taking the coat so a missing-key attempt gets feedback.
		"office_lock9":
			return not _door_unlocked
	return true


func on_interact(id: String) -> bool:
	if id == "bottle":
		_take_coat()
		return true

	if id == "office_lock9":
		if _door_unlocked:
			return true
		if not _bottle_taken:
			_main.hud_toast("a brass keyhole. his coat still hangs beside the desk.")
			return true
		if not StateManager.is_lucid():
			_main.hud_toast("the key's teeth won't settle. steady your hands.")
			return true
		_open_with_key()
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
		_main.hud_toast("someone's coat, one pocket lined with foil. a brass key, beneath the empty foil. pocketed.")
	else:
		_main.hud_toast("someone's coat, one pocket lined with foil. a pill and a brass key. pocketed.")

	Telemetry.event("coat_pill_found")
	Telemetry.event("puzzle_step", {"puzzle": "office_key9", "step": "key_found"})
	_main.hud_objective("the brass key fits the lock beside the door. steady your hands first.")


func _open_with_key() -> void:
	_door_unlocked = true
	_main.move_interactable("exitdoor", Vector3(-1, 1.5, -6.85), PI / 2.0)
	# unlock_door() drops the collider, rebuilds the cache and emits
	# door_opened itself.
	_main.unlock_door("DoorCollider")
	Telemetry.event("puzzle_step", {"puzzle": "office_key9", "step": "complete"})
	_main.hud_toast("his key. your way out. leave the coat behind.")
	_main.hud_objective("the door is open. go.")


# --- the coat gate ---------------------------------------------------------

func _physics_process(_delta: float) -> void:
	if _main == null or _bottle_taken or _gate_nudged:
		return

	# Explicitly typed: _main is a plain Node, so the property chain carries no
	# static type and `:=` cannot infer one here.
	var p: Vector3 = _main.player.global_position
	var here := Vector2(p.x, p.z)
	if here.distance_to(LOCK_POS) < NUDGE_RADIUS or here.distance_to(DOOR_POS) < NUDGE_RADIUS:
		_gate_nudged = true
		_main.hud_toast(GATE_TOAST)
		Telemetry.event("coat_gate_nudge")
