# The shape-key / shape-lock mechanism: collect N shapes, the door opens.
#
# Port of kit.ts's shapeLockDoor() — specifically of the CLOSURE it returns
# (`held`, `removed`, `unlocked`), which is the only part of that helper with
# any behaviour in it. The geometry half (door slab, lock fixture, key props,
# icon panel, door collider) is authored by tools/gen_rooms.py instead, because
# in Godot that is a .tscn the generator writes once, not something assembled
# at runtime.
#
# WHERE THIS LIVES, AND WHY IT MATTERS
#
# A room script owns one of these and holds the only reference. It is therefore
# room-script state with a room script's lifetime, which is precisely the
# guarantee the design asks for:
#
#   * A CATCH NEVER UN-COLLECTS A KEY. A catch is force_state + teleport +
#     toast (see any orderly room's _on_caught) — it does not reload the room,
#     so the room node, this object and every flag on it survive it untouched.
#     The design doc calls this the mechanic's one hard invariant; here it is
#     structural rather than something a handler has to remember not to clear.
#   * Progress does not leak between rooms or across a room reload, the same
#     way room 10's `_door_unlocked` does not.
#
# It is deliberately NOT in GameState. GameState's own header calls it "a
# record of the run, not a place to put gameplay logic", and it is merged
# across every branch; carried shapes are consumed by the same room that grants
# them (the lock is 20 metres from the last key) and never outlive it, so
# nothing about them is run state. If a later room ever needs shapes carried
# BETWEEN rooms, that is the moment to add an inventory to GameState — not
# before.
#
# UNLOCKING IS BY COUNT, NOT BY MATCHING. Shapes are not fitted to slots: hold
# all of them and the lock opens, in any collection order. `_held` is keyed by
# SHAPE (not by key id) exactly as the original's `Set<ShapeKind>` was, so two
# keys of the same shape would count once — which is the original's behaviour
# and worth preserving deliberately rather than by accident.
class_name WardShapeLock
extends RefCounted

## Every key this lock wants: {id, shape, toast}. Populated by add_key().
var keys: Array[Dictionary] = []

## The lock fixture's interactable id (the thing the player uses).
var lock_id := ""
## The door slab's interactable id, and the NAME of the door's collider node —
## the room's generated `solid(..., name=...)`. main.unlock_door() drops it.
var door_id := ""
var door_collider := "DoorCollider"
## Where the slab swings to. kit.ts's default is a 90-degree swing about the
## hinge edge, DOOR_SWING_DEPTH (0.85m) clear of the wall.
var door_open_pos := Vector3.ZERO
var door_open_rot_y := PI / 2.0

## The progress panel above the door. Optional: a lock with no panel simply
## shows no progress.
var panel: IconPanel = null

## When true the lock is operable in BOTH ward states. Default false preserves
## the keypad-shaped behaviour (lucid only, static while raw); room 15 opts in
## because it is played entirely raw and the door mechanism cannot be the one
## thing that still demands medicine.
var allow_unmed := false

var refusal_unmed := ("the lock is a smear of static. it's not reading shapes "
	+ "right now — it's not reading anything.")
## have, need -> String. Left as a Callable rather than a format string so a
## room can write a line that reads like a sentence at 0, 1 and 2.
var refusal_incomplete: Callable = Callable()
var success_toast := "the door opens."
var success_objective := "the door is open. go."

# shape -> true. Keyed by shape, see the header.
var _held := {}
# interactable id -> true. Keyed by id, because removal is per PROP.
var _removed := {}
var _unlocked := false


## Declare one key. Order is the icon panel's left-to-right reading order.
func add_key(id: String, shape: String, pickup_toast: String) -> void:
	keys.append({"id": id, "shape": shape, "toast": pickup_toast})


func held_count() -> int:
	return _held.size()


func needed_count() -> int:
	return keys.size()


func is_unlocked() -> bool:
	return _unlocked


func is_collected(id: String) -> bool:
	return _removed.has(id)


## Parallel to `keys`: which panel cells should be lit.
func lit_array() -> Array:
	var out: Array = []
	for k in keys:
		out.append(_held.has(k["shape"]))
	return out


## The standard availability rule, for a room script's `availability` callable:
## the door is never directly interactable (the lock opens it), a collected key
## stops resolving once its prop is gone, and the lock stops resolving once it
## has opened.
func is_available(id: String) -> bool:
	if id == door_id:
		return false
	if id == lock_id:
		return not _unlocked
	if _removed.has(id):
		return false
	return true


## Handles a key id or the lock id; returns false for anything else so a room
## script can chain its own fixtures after this. `main` is the narrow room-
## script API (main.gd, or a test stub with the same five methods).
##
## Note there is no ward-state check on the keys: they are authored
## states:'unmed', so Interactable.is_focusable() already refuses the ray while
## lucid and this can never be reached for a key in that state. Not duplicating
## that check is the point — one mechanism, not two that can disagree.
func handle_interact(id: String, main: Node) -> bool:
	var key := _find_key(id)
	if not key.is_empty():
		if _removed.has(id):
			return true  # already gone — nothing to do, but it was ours
		_removed[id] = true
		_held[key["shape"]] = true
		main.remove_interactable(id)
		if panel != null:
			panel.set_lit(lit_array())
		main.hud_toast(str(key["toast"]))
		Telemetry.event("shape_key_taken", {"shape": key["shape"], "held": _held.size()})
		return true

	if id != lock_id:
		return false

	if not allow_unmed and not StateManager.is_lucid():
		main.hud_toast(refusal_unmed)
		return true

	if _held.size() < keys.size():
		if refusal_incomplete.is_valid():
			main.hud_toast(str(refusal_incomplete.call(_held.size(), keys.size())))
		else:
			main.hud_toast("it wants %d shapes back. you have %d."
				% [keys.size(), _held.size()])
		return true

	_unlocked = true
	Telemetry.event("shape_lock_success")
	main.move_interactable(door_id, door_open_pos, door_open_rot_y)
	# main.unlock_door() clears the collider's layer, rebuilds the AABB cache
	# and emits door_opened itself — the Godot equivalent of the original's
	# "shove the collider out to x=999".
	main.unlock_door(door_collider)
	main.hud_toast(success_toast)
	main.hud_objective(success_objective)
	return true


func _find_key(id: String) -> Dictionary:
	for k in keys:
		if k["id"] == id:
			return k
	return {}
