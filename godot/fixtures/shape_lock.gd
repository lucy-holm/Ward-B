# The shape lock: the wall fixture that replaces a keypad on room 15's exit.
#
# Port of world.ts's buildShapeLock(). A keypad-shaped composite — body, a
# static faceplate showing the OUTLINE of every shape it wants, and a glow
# strip — built in the CANONICAL fixture frame (width X, height Y, depth Z,
# faceplate toward -Z) exactly like fixtures/keypad.tscn, so the generator's
# FACING_ROT yaw puts it on whichever wall the room authored.
#
# The plate never lights up: unlocking is by COUNT and the panel above the door
# is what shows progress. This face just states the requirement, permanently.
#
# NO COLLIDER, like every other wall fixture in the ward — the Area3D the
# generator wraps it in is on layer 32 with mask 0 and never enters
# WardCollision's cache. The only thing in the doorway that blocks is the
# door's own named collider, which the room script drops on unlock.
extends Node3D

## Authored footprint in CANONICAL axes (width X, height Y, depth Z).
@export var fixture_size := Vector3(0.4, 0.5, 0.14)
## Which shapes the plate shows, left to right. Static — the lock does not
## track which of them you are carrying.
@export var shapes: PackedStringArray = ["circle", "square", "triangle"]

const PAD_MAT := preload("res://materials/pad.tres")
const GLOW_MAT := preload("res://materials/glow.tres")


func _ready() -> void:
	var w := fixture_size.x
	var h := fixture_size.y
	var d := fixture_size.z

	var body_mesh := BoxMesh.new()
	body_mesh.size = Vector3(w, h, d)
	body_mesh.material = PAD_MAT
	var body := MeshInstance3D.new()
	body.name = "Body"
	body.mesh = body_mesh
	add_child(body)

	var quad := QuadMesh.new()
	quad.size = Vector2(w * 0.9, h * 0.82)
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = ImageTexture.create_from_image(
		ShapeGlyphs.bake_plate_image(shapes))
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR

	var plate := MeshInstance3D.new()
	plate.name = "Plate"
	plate.mesh = quad
	plate.material_override = mat
	# A QuadMesh faces +Z; the canonical fixture front is -Z, so the plate is
	# turned to face out of the wall. A 180-degree turn about Y is a ROTATION,
	# not a reflection: reading order is preserved for a viewer on the other
	# side, so circle/square/triangle still reads left to right.
	plate.rotation.y = PI
	plate.position.z = -d * 0.5 - 0.004
	add_child(plate)

	var strip_mesh := BoxMesh.new()
	strip_mesh.size = Vector3(w * 0.62, h * 0.04, 0.012)
	strip_mesh.material = GLOW_MAT
	var strip := MeshInstance3D.new()
	strip.name = "Strip"
	strip.mesh = strip_mesh
	strip.position = Vector3(0.0, h * 0.34, -d * 0.5 - 0.01)
	add_child(strip)
