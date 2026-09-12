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
var _glyph_mount: Node3D

func _readable_material(tint: Color) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = tint
	material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	return material

func _caption(value: String, at: Vector3, text_scale: float) -> void:
	var label := Label3D.new()
	label.text = value
	label.font = preload("res://fonts/SpecialElite-Regular.ttf")
	label.font_size = 48
	label.pixel_size = text_scale
	label.modulate = Color(0.86, 0.85, 0.77)
	label.outline_size = 0
	label.rotation.y = PI
	label.position = at
	add_child(label)

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
	# A dark, quiet field separates the icon from the ward's noisy texture.
	# Bounded unshaded enamel guarantees luminance contrast in both states;
	# it adds no light, transparency or screen-space overlay.
	_box("FaceBezel", Vector3(w * 0.93, h * 0.96, d * 0.03),
		Vector3(0, 0, -d * 0.295), _readable_material(Color(0.18, 0.19, 0.17)))
	_box("SymbolField", Vector3(w * 0.85, h * 0.62, d * 0.05),
		Vector3(0, h * 0.11, -d * 0.32), _readable_material(Color(0.035, 0.04, 0.035)))
	_glyph_mount = Node3D.new()
	_glyph_mount.name = "Symbol"
	_glyph_mount.rotation.x = PI / 2
	_glyph_mount.position = Vector3(0, h * 0.10, -d * 0.52)
	add_child(_glyph_mount)
	set_shape(shape)
	if kind == "reader":
		_box("RecordSlot", Vector3(w * 0.7, h * 0.08, d * 0.12),
			Vector3(0, -h * 0.28, -d * 0.33), METAL)
		_caption("seal", Vector3(0, -h * 0.41, -d * 0.38), w * 0.0015)
	else:
		_button = _box("CallButton", Vector3(w * 0.58, h * 0.16, d * 0.3),
			Vector3(0, -h * 0.28, -d * 0.42), _readable_material(Color(0.55, 0.54, 0.48)))
		_caption("press", Vector3(0, -h * 0.42, -d * 0.38), w * 0.0015)
	_lamp_mat = StandardMaterial3D.new()
	_lamp_mat.albedo_color = Color(0.14, 0.18, 0.12)
	_lamp_mat.emission_enabled = true
	_lamp_mat.emission = Color(0.68, 0.73, 0.48)
	_lamp_mat.emission_energy_multiplier = 0.0
	_box("Lamp", Vector3(w * 0.52, h * 0.06, d * 0.08),
		Vector3(0, h * 0.45, -d * 0.32), _lamp_mat)

func set_shape(next_shape: String) -> void:
	shape = next_shape
	if _glyph_mount == null:
		return
	for child in _glyph_mount.get_children():
		child.free()
	var glyph := ShapeGlyphs.glyph_instance(shape, fixture_size.x * 0.66,
		color.lerp(Color(0.94, 0.92, 0.85), 0.82))
	# Shape and backing must not converge to the same grey in deep shadow.
	var material := (glyph.mesh as PrimitiveMesh).material as StandardMaterial3D
	material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	material.emission_enabled = false
	_glyph_mount.add_child(glyph)

func set_engaged(engaged: bool) -> void:
	if _lamp_mat != null:
		_lamp_mat.emission_energy_multiplier = 0.65 if engaged else 0.0
		_lamp_mat.albedo_color = Color(0.68, 0.73, 0.48) if engaged else Color(0.14, 0.18, 0.12)
	if _button != null:
		_button.position.z = -fixture_size.z * (0.22 if engaged else 0.42)
