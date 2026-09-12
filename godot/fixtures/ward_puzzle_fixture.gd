# Compact wall-mounted hardware, sharing the ward's existing materials.
# Canonical front is -Z; Room.interactable rotates it toward the room.
extends Node3D

@export var fixture_size := Vector3(0.5, 0.65, 0.16)
@export var kind := "bell"
@export var shape := "circle"
@export var color := Color(0.6, 0.65, 0.55)

const ENAMEL := preload("res://materials/prop.tres")
const METAL := preload("res://fixtures/hardware_mat.tres")
var _button: MeshInstance3D
var _lamp_mat: StandardMaterial3D

func _box(id: String, size: Vector3, at: Vector3, material: Material) -> MeshInstance3D:
	var mesh := BoxMesh.new()
	mesh.size = size
	mesh.material = material
	var instance := MeshInstance3D.new()
	instance.name = id
	instance.mesh = mesh
	instance.position = at
	add_child(instance)
	return instance

func _ready() -> void:
	var w := fixture_size.x
	var h := fixture_size.y
	var d := fixture_size.z
	_box("Plate", Vector3(w, h, d * 0.55), Vector3.ZERO, ENAMEL)
	for x in [-0.4, 0.4]:
		for y in [-0.4, 0.4]:
			_box("Screw", Vector3(w * 0.04, w * 0.04, d * 0.04),
				Vector3(w * x, h * y, -d * 0.3), METAL)
	if kind == "keyhole":
		_box("KeySlot", Vector3(w * 0.10, h * 0.38, d * 0.10),
			Vector3(0, 0, -d * 0.3), METAL)
		return
	if kind == "reader":
		_box("RecordSlot", Vector3(w * 0.7, h * 0.08, d * 0.12),
			Vector3(0, -h * 0.05, -d * 0.33), METAL)
	else:
		# ShapeGlyphs defines the same silhouettes as the later sorting room.
		# Rotate the shared flat glyph onto this vertical face.
		var mount := Node3D.new()
		mount.rotation.x = PI / 2
		mount.position = Vector3(0, h * 0.12, -d * 0.39)
		add_child(mount)
		var glyph := ShapeGlyphs.glyph_instance(shape, w * 0.6, color)
		mount.add_child(glyph)
		_button = _box("CallButton", Vector3(w * 0.43, h * 0.17, d * 0.3),
			Vector3(0, -h * 0.27, -d * 0.35), METAL)
	_lamp_mat = StandardMaterial3D.new()
	_lamp_mat.albedo_color = Color(0.14, 0.18, 0.12)
	_lamp_mat.emission_enabled = true
	_lamp_mat.emission = Color(0.68, 0.73, 0.48)
	_lamp_mat.emission_energy_multiplier = 0.0
	_box("Lamp", Vector3(w * 0.14, h * 0.08, d * 0.08),
		Vector3(w * 0.33, h * 0.34, -d * 0.32), _lamp_mat)

func set_engaged(engaged: bool) -> void:
	if _lamp_mat != null:
		_lamp_mat.emission_energy_multiplier = 0.65 if engaged else 0.0
		_lamp_mat.albedo_color = Color(0.68, 0.73, 0.48) if engaged else Color(0.14, 0.18, 0.12)
	if _button != null:
		_button.position.z = -fixture_size.z * (0.22 if engaged else 0.35)
