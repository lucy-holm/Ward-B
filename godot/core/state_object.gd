# Per-node ward-state affinity. Attach to anything that exists in only one
# reality, set `visible_in_state` in the inspector, and it wires itself to
# StateManager.state_changed on _ready.
#
# This is the "signals over polling" payoff: in the Three.js version the
# World kept three scene groups and flipped group.visible centrally
# (world.ts:1420-1423), which meant every state-conditional thing had to be
# registered into the right group at load time. Here each node owns its own
# affinity, declares it in the editor, and reacts to a signal. Nothing polls
# a global, and a designer can retag a prop without touching code.
#
# Colliders: for a StaticBody3D this also flips the body's collision layer
# between its authored solid layer and 0, and asks the room to rebuild the
# AABB cache, so state-conditional walls stop blocking as well as stop
# rendering.
@tool
class_name StateObject
extends Node3D

enum Affinity {
	BOTH,   ## always present
	LUCID,  ## keypads readable, chains "real", lucid-only doors
	UNMED,  ## scrawls, orderlies, unmed-only blockers
}

@export var visible_in_state: Affinity = Affinity.BOTH:
	set(value):
		visible_in_state = value
		if is_inside_tree():
			_apply(StateManager.state if not Engine.is_editor_hint() else StateManager.State.UNMED)
		update_configuration_warnings()

## Emitted when this object's presence flips, so a room script can react
## (e.g. re-cache colliders) without inspecting the node.
signal presence_changed(present: bool)

var _present := true


func _ready() -> void:
	if Engine.is_editor_hint():
		return
	StateManager.state_changed.connect(_on_state_changed)
	_apply(StateManager.state)


func _on_state_changed(next: StateManager.State, _prev: StateManager.State, _source: String) -> void:
	_apply(next)


func _apply(state: int) -> void:
	var present := true
	match visible_in_state:
		Affinity.LUCID:
			present = state == StateManager.State.LUCID
		Affinity.UNMED:
			present = state == StateManager.State.UNMED
		_:
			present = true

	visible = present

	if present == _present:
		return
	_present = present
	presence_changed.emit(present)


func is_present() -> bool:
	return _present


func _get_configuration_warnings() -> PackedStringArray:
	if visible_in_state == Affinity.BOTH:
		return PackedStringArray([
			"Affinity is BOTH — this node behaves identically to a plain Node3D. "
			+ "Either set LUCID/UNMED or replace it with Node3D."
		])
	return PackedStringArray()
