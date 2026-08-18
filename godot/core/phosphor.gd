# Glow-in-the-dark paint's charge/fade dial — the port of World.setGlowFade /
# the `phosphorGlow` field in src/game/world.ts.
#
# PURELY COSMETIC, and that is a hard rule rather than a description. This
# writes opacity and nothing else. It never touches `visible`, never touches an
# Interactable, never touches a collider, and is never consulted by the light
# axis: a fully-faded room is exactly as dark, exactly as walkable and exactly
# as solvable as a freshly-charged one. Room 16 leans on that — its exit door
# is gated on RoomLight.is_dark() alone and does not care how much paint is
# left, and its dispenser and exit glow are not phosphor at all, so fading can
# never hide the way to a pill or the way out.
#
# WHY OPACITY PER NODE RATHER THAN ONE SHARED MATERIAL.
#
# The Three.js build cloned MATERIALS.phosphor once per room so a runtime
# opacity write could not bleed into the next room that used the same MatName.
# The Godot equivalent is a `resource_local_to_scene` StandardMaterial3D
# emitted as a sub-resource of the room scene (see gen_rooms.py's phosphor
# handling): each instance of the room scene gets its own copy of it, so the
# clone-per-room property holds by construction and two rooms instanced at once
# in a headless test cannot fight over one alpha.
#
# GeometryInstance3D.transparency would have been the obvious per-instance
# knob and is deliberately NOT used: it is documented as unsupported in the
# Compatibility renderer, which is the one this project ships on.
#
# Label3D (the phosphor-ink scrawl) needs none of that — `modulate` is already
# a node property, so it is per-instance for free.
class_name WardPhosphor
extends Object

## Group every phosphor-painted node is emitted into (gen_rooms.py).
const GROUP := "phosphor"

## Authored alpha, read off `metadata/phosphor_alpha` so a scrawl's ink (0.92,
## matching every other scrawl's modulate) and a floor tile's paint (1.0) both
## fade to nothing from THEIR OWN full brightness instead of one of them
## jumping to the other's on the first call.
const ALPHA_META := "phosphor_alpha"


## Set the room's paint to `level` (0 = fully faded, 1 = fully charged).
## Walks the room subtree rather than the SceneTree group list on purpose: a
## headless test can hold two rooms at once, and the dial belongs to one room.
static func apply(room: Node, level: float) -> void:
	if room == null:
		return
	_apply_to(room, clampf(level, 0.0, 1.0))


static func _apply_to(node: Node, level: float) -> void:
	if node.is_in_group(GROUP):
		var base := float(node.get_meta(ALPHA_META, 1.0))
		if node is Label3D:
			var label := node as Label3D
			var m := label.modulate
			m.a = base * level
			label.modulate = m
		elif node is GeometryInstance3D:
			var mat := (node as GeometryInstance3D).material_override
			if mat is StandardMaterial3D:
				var sm := mat as StandardMaterial3D
				var c := sm.albedo_color
				c.a = base * level
				sm.albedo_color = c
	for child in node.get_children():
		_apply_to(child, level)


## Current level as the scene actually carries it, for tests: reads the first
## phosphor node found and divides out its authored alpha. Returns -1.0 when
## the room has no paint at all.
static func level_of(room: Node) -> float:
	if room == null:
		return -1.0
	return _level_of(room)


static func _level_of(node: Node) -> float:
	if node.is_in_group(GROUP):
		var base := float(node.get_meta(ALPHA_META, 1.0))
		if base > 0.0:
			if node is Label3D:
				return (node as Label3D).modulate.a / base
			if node is GeometryInstance3D:
				var mat := (node as GeometryInstance3D).material_override
				if mat is StandardMaterial3D:
					return (mat as StandardMaterial3D).albedo_color.a / base
	for child in node.get_children():
		var v := _level_of(child)
		if v >= 0.0:
			return v
	return -1.0
