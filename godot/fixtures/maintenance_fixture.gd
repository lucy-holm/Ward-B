# Small, reusable clinical fixtures for authored maintenance and checkpoint
# interactions. The Area3D that owns this node supplies the interaction target;
# this script only builds an inexpensive, readable silhouette.
extends Node3D

@export var fixture_size := Vector3(0.5, 0.8, 0.16)
@export var marker_kind := "panel"

const PROP_MAT := preload("res://materials/prop.tres")
const PAD_MAT := preload("res://materials/pad.tres")
const HARDWARE_MAT := preload("res://fixtures/hardware_mat.tres")
const GLOW_MAT := preload("res://materials/glow.tres")


func _paper() -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = Color(0.78, 0.74, 0.63, 1.0)
	material.roughness = 0.96
	return material


func _ready() -> void:
	match marker_kind:
		"fuse":
			_build_fuse()
		"checkpoint":
			_build_checkpoint()
		_:
			_build_panel()


func _box(name: String, size: Vector3, at: Vector3, mat: Material) -> void:
	var mesh := BoxMesh.new()
	mesh.size = size
	mesh.material = mat
	var node := MeshInstance3D.new()
	node.name = name
	node.mesh = mesh
	node.position = at
	add_child(node)


func _label(name: String, text: String, at: Vector3, size_px: int = 20) -> void:
	# The fixture is authored face-forward toward local -Z. Keep the text
	# un-billboarded so the parent wall-facing yaw rotates it into the room too.
	var label := Label3D.new()
	label.name = name
	label.text = text
	label.position = at
	label.rotation.y = PI
	label.font_size = size_px
	label.pixel_size = 0.0012
	label.outline_size = 0
	label.modulate = Color(0.055, 0.065, 0.05, 1.0)
	label.billboard = BaseMaterial3D.BILLBOARD_DISABLED
	label.shaded = false
	label.no_depth_test = false
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	add_child(label)


func _build_fuse() -> void:
	var w := fixture_size.x
	var h := fixture_size.y
	var d := fixture_size.z
	# A loose ceramic cartridge with two metal end caps. It sits low enough to
	# read as a thing recovered from the floor, rather than a floating pill.
	_box("Ceramic", Vector3(w * 0.68, h * 0.25, d * 0.48),
		Vector3.ZERO, PAD_MAT)
	_box("CapL", Vector3(w * 0.10, h * 0.34, d * 0.58),
		Vector3(-w * 0.39, 0.0, 0.0), HARDWARE_MAT)
	_box("CapR", Vector3(w * 0.10, h * 0.34, d * 0.58),
		Vector3(w * 0.39, 0.0, 0.0), HARDWARE_MAT)
	_box("Mark", Vector3(w * 0.30, h * 0.035, d * 0.50),
		Vector3(0.0, h * 0.15, -d * 0.02), GLOW_MAT)
	_box("FuseTag", Vector3(w * 0.55, h * 0.18, d * 0.03),
		Vector3(0.0, -h * 0.23, -d * 0.48), _paper())
	_label("FuseLabel", "FUSE", Vector3(0.0, -h * 0.23, -d * 0.51), 26)


func _build_panel() -> void:
	var w := fixture_size.x
	var h := fixture_size.y
	var d := fixture_size.z
	_box("Backplate", Vector3(w, h, d * 0.55), Vector3.ZERO, PROP_MAT)
	_box("Socket", Vector3(w * 0.58, h * 0.30, d * 0.45),
		Vector3(0.0, -h * 0.08, -d * 0.46), HARDWARE_MAT)
	_box("PowerLamp", Vector3(w * 0.18, h * 0.10, d * 0.12),
		Vector3(w * 0.27, h * 0.27, -d * 0.42), GLOW_MAT)
	_box("PanelLabelPlate", Vector3(w * 0.58, h * 0.23, d * 0.04),
		Vector3(0, h * 0.27, -d * 0.30), _paper())
	_label("PanelLabel", "SERVICE\nPOWER", Vector3(0, h * 0.27, -d * 0.34), 26)


func _build_checkpoint() -> void:
	var w := fixture_size.x
	var h := fixture_size.y
	var d := fixture_size.z
	# Clipboard/chart silhouette: a broad board, a metal clip and a pale page.
	_box("ChartBoard", Vector3(w, h, d * 0.55), Vector3.ZERO, PROP_MAT)
	_box("Page", Vector3(w * 0.74, h * 0.58, d * 0.12),
		Vector3(0.0, -h * 0.08, -d * 0.36), _paper())
	_box("Clip", Vector3(w * 0.62, h * 0.09, d * 0.20),
		Vector3(0.0, h * 0.36, -d * 0.43), HARDWARE_MAT)
	_box("RecordLamp", Vector3(w * 0.13, h * 0.08, d * 0.10),
		Vector3(w * 0.32, -h * 0.35, -d * 0.42), GLOW_MAT)
	_label("ChartLabel", "WARD B\nPATIENT RECORD",
		Vector3(0.0, h * 0.10, -d * 0.49), 26)
	for i in range(3):
		_box("Rule%d" % i, Vector3(w * 0.52, h * 0.012, d * 0.025),
			Vector3(0.0, -h * (0.18 + i * 0.11), -d * 0.49), HARDWARE_MAT)
