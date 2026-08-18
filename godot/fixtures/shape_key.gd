# A shape-key prop: a small pedestal with a coloured shape resting on it.
#
# Port of world.ts's buildShapeKey(). Built from script rather than authored as
# a .tscn because shape AND colour are per-instance (a room's three keys are
# three different solids in three different hexes), which a single PackedScene
# cannot express without either three scenes or a runtime rebuild anyway.
#
# NO COLLIDER, deliberately, and this is the mechanic rather than an oversight:
# a key is a raycast target and nothing else. The generator gives it the same
# Area3D-on-layer-32 treatment every fixture gets (collision_mask 0, never in
# WardCollision's cache), so the player walks straight through where it stands
# and an orderly's patrol crosses it as bare floor.
#
# VISIBILITY IS NOT THIS SCRIPT'S JOB. Every shape key is authored
# `states="unmed"`, so the generator wraps it in a StateObject and the existing
# machinery does the rest: the mesh hides while lucid, and Interactable.
# is_focusable() refuses the ray because its StateObject ancestor is not
# present. Not one line of bespoke visibility code, here or in the room.
extends Node3D

## Authored footprint, in CANONICAL axes (width X, height Y, depth Z). Set by
## the generator from the interactable's size so the pedestal matches the
## Area3D the player actually points at.
@export var fixture_size := Vector3(0.5, 0.9, 0.5)
@export var shape := "circle"
@export var color := Color(1, 1, 1)

const PROP_MAT := preload("res://materials/prop.tres")
const IDLE := preload("res://fixtures/pill_idle.gd")


func _ready() -> void:
	var w := fixture_size.x
	var h := fixture_size.y
	var pedestal_h := h * 0.45

	var pedestal_mesh := BoxMesh.new()
	pedestal_mesh.size = Vector3(w * 0.55, pedestal_h, w * 0.55)
	pedestal_mesh.material = PROP_MAT
	var pedestal := MeshInstance3D.new()
	pedestal.name = "Pedestal"
	pedestal.mesh = pedestal_mesh
	pedestal.position.y = -h * 0.5 + pedestal_h * 0.5
	add_child(pedestal)

	var glyph_size := w * 0.75
	# glyph_instance, not glyph_mesh: the triangle is a PrismMesh and needs a
	# static tilt to lie flat (see ShapeGlyphs' porting-trap note).
	var glyph := ShapeGlyphs.glyph_instance(shape, glyph_size, color)

	# The idle spin/bob/emissive pulse, shared verbatim with pill_pickup.tscn —
	# world.ts pushed shape_key meshes onto the SAME `animated` list as
	# pill_pickup, so a key reads as "take me" with the exact idle tell the
	# player already learned in room 1. The pulse is why the glyph material is
	# emissive: pill_idle.gd drives emission_energy_multiplier.
	var idle := IDLE.new()
	idle.name = "Idle"
	idle.spin_speed = 1.0
	idle.bob_amount = 0.03
	idle.bob_speed = 2.0
	idle.pulse_amount = 0.15
	idle.position.y = -h * 0.5 + pedestal_h + glyph_size * 0.28
	idle.add_child(glyph)
	add_child(idle)
