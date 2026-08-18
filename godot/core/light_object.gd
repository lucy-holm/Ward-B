# Per-node LIGHT-state affinity — the light axis's exact analogue of
# core/state_object.gd, and deliberately a near-copy of it rather than a
# generalisation of both.
#
# Attach to anything that only exists while the room's lights are on (a glow
# lintel) or only while they are off (glow-in-the-dark paint), set
# `visible_in_light` in the inspector, and it wires itself to
# RoomLight.dark_changed on _ready.
#
# WHY NOT ONE GENERIC "FilterObject" WITH TWO AXES. Because the two axes are
# orthogonal and must stay that way: a mesh can be gated by ward state, by
# light state, by both (the wrappers nest), or by neither, and folding them
# into one node with two enums would create a single place where someone can
# accidentally make one axis read the other. Two small independent nodes that
# each know about exactly one signal cannot develop that bug. Room 16's
# phosphor scrawl is the both-gated case: an UNMED StateObject (every scrawl
# is) with a DARK LightObject inside it, and it draws only when both agree —
# Godot hides a whole subtree when an ancestor's `visible` is false, so the
# composition is free.
#
# COLLIDERS: THIS NODE DOES NOT TOUCH THEM — same contract as StateObject, and
# here it is stronger still. StateObject's visibility merely HAPPENS to agree
# with a separate collision-layer mechanism (layers 4/8, filtered in
# WardCollision). The light axis has no collision mechanism at all: there is no
# "solid_lit_only" layer, gen_rooms.py refuses to emit a light-gated collider
# (see Room.block), and a dark room's WardCollision is byte-identical to a lit
# one's. That is room 16's soft-lock guarantee and it is structural, not a
# convention. See autoload/room_light.gd's header.
@tool
class_name LightObject
extends Node3D

enum Filter {
	BOTH,  ## always present — behaves as a plain Node3D
	LIT,   ## house lighting: glow lintels, anything that dies with the breaker
	DARK,  ## glow-in-the-dark paint: only readable once the lights are out
}

@export var visible_in_light: Filter = Filter.BOTH:
	set(value):
		visible_in_light = value
		if is_inside_tree():
			_apply(RoomLight.is_dark() if not Engine.is_editor_hint() else true)
		update_configuration_warnings()

## Mirrors StateObject.presence_changed, so a room script can react to a gate
## flipping without inspecting the node.
signal presence_changed(present: bool)

var _present := true


func _ready() -> void:
	if Engine.is_editor_hint():
		return
	RoomLight.dark_changed.connect(_on_dark_changed)
	# Read the CURRENT value rather than waiting for a signal: main.gd resets
	# RoomLight before the room enters the tree, so this is what makes a
	# room's opening frame correct without a second, racing call.
	_apply(RoomLight.is_dark())


func _on_dark_changed(dark: bool) -> void:
	_apply(dark)


func _apply(dark: bool) -> void:
	var present := true
	match visible_in_light:
		Filter.LIT:
			present = not dark
		Filter.DARK:
			present = dark
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
	if visible_in_light == Filter.BOTH:
		return PackedStringArray([
			"visible_in_light is BOTH — this node behaves identically to a plain "
			+ "Node3D. Either set LIT/DARK or replace it with Node3D."
		])
	return PackedStringArray()
