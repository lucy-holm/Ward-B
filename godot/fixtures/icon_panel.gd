# The door-top progress panel: one dim outline per shape a shape_lock wants,
# lighting up solid as each key is collected.
#
# Port of world.ts's iconPanelEntries + World.updateIconPanel(). The original
# baked a CanvasTexture into a PlaneGeometry and, on every pickup, re-baked the
# canvas and reassigned the map. Here it is a QuadMesh + an ImageTexture that
# set_lit() rebakes with ImageTexture.update() — the same "rewrite the texture
# in place, never rebuild the node" trick main.gd's update_scrawl_text uses on
# a Label3D. Position, rotation and size are authored once by the generator and
# never touched again.
#
# NOT an Interactable and NOT state-filtered: the panel is readable in both
# ward states, from across the room, on purpose — it is the room's only
# progress display and the keys themselves are already unmed-only.
#
# GEOMETRY NOTE (see ROOM_AUTHORING's scrawl warning): a Label3D scrawl renders
# far wider than its authored `size` because pixel_size is a texture scale, not
# a measurement. This is a QuadMesh, so `panel_size` IS metres: the quad is
# exactly panel_size wide by panel_size/len(shapes) tall, matching the
# original's PlaneGeometry(size, size / shapes.length). Nothing here can punch
# through a wall it was authored 3cm proud of.
class_name IconPanel
extends Node3D

## Left-to-right reading order. Parallel to `colors` and to the `lit` array
## set_lit() takes.
@export var shapes: PackedStringArray = []
@export var colors: PackedColorArray = []
## Quad width in METRES (height is panel_size / shapes.size()).
@export var panel_size := 2.4
## Rasterisation resolution per cell. 128 is ~3x cheaper than the original's
## 170 and indistinguishable at any distance the panel is legible from.
@export var cell_px := 128

var _lit: Array = []
var _tex: ImageTexture = null
# The last image baked into _tex. Kept because ImageTexture.get_image() reads
# back through the rendering server, and the HEADLESS dummy driver does not
# observe update() — so without this, nothing run headless (i.e. the whole test
# suite) could tell a rebake from a no-op.
var _image: Image = null
var _mesh_instance: MeshInstance3D = null


func _ready() -> void:
	_lit.resize(shapes.size())
	_lit.fill(false)
	_build()


func _build() -> void:
	var n: int = maxi(1, shapes.size())
	var quad := QuadMesh.new()
	quad.size = Vector2(panel_size, panel_size / float(n))

	_image = ShapeGlyphs.bake_icon_image(shapes, colors, _lit, cell_px)
	_tex = ImageTexture.create_from_image(_image)

	var mat := StandardMaterial3D.new()
	mat.albedo_texture = _tex
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	# Unshaded for the same reason materials/glow.tres is: this is a lit
	# indicator, and it has to read at full brightness in a room whose north
	# end is deliberately dim.
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR
	mat.cull_mode = BaseMaterial3D.CULL_BACK

	_mesh_instance = MeshInstance3D.new()
	_mesh_instance.name = "Quad"
	_mesh_instance.mesh = quad
	_mesh_instance.material_override = mat
	add_child(_mesh_instance)


## Rebake the panel. `lit` is parallel to `shapes`; anything shorter is padded
## with false. Cheap enough to call on every pickup (three 128px cells), which
## is the only thing that ever calls it.
func set_lit(lit: Array) -> void:
	_lit = []
	for i in shapes.size():
		_lit.append(bool(lit[i]) if i < lit.size() else false)
	if _tex == null:
		return
	_image = ShapeGlyphs.bake_icon_image(shapes, colors, _lit, cell_px)
	_tex.update(_image)


## The pixels currently on the panel. For tests and tooling — see _image.
func baked_image() -> Image:
	return _image


## Current lit flags, for tests and for a room script that wants to re-assert
## the panel after a reload without owning a second copy of the truth.
func lit_state() -> Array:
	return _lit.duplicate()
