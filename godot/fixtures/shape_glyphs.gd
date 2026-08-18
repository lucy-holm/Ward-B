# Shape-key glyphs: the one place circle / square / triangle are defined.
#
# Port of world.ts's traceShapePath() + buildShapeKeyGlyph() +
# makeIconPanelTexture() + makeShapeLockPlateTexture(). The three consumers
# (the key prop's 3D glyph, the icon panel above the door, the shape lock's
# faceplate) all come through here so a triangle is the same triangle
# everywhere — which is the whole legibility bargain of room 15: shape, not
# colour, is the redundant cue a colour-blind player reads.
#
# The 2D side rasterises into an Image rather than drawing into a canvas: the
# original baked a CanvasTexture per panel and re-baked it on every pickup
# (updateIconPanel). Godot's equivalent of "rebake the canvas in place" is
# ImageTexture.update(), which is what icon_panel.gd does — same trick, same
# cost, no new render tech, exactly like main.gd's update_scrawl_text rewrites
# a Label3D in place instead of rebuilding the scrawl.
#
# Proportions below are world.ts's numbers verbatim (r * 0.72 / 0.68 / 0.82
# ...), expressed as fractions of the cell so a 128px bake and the original's
# 170px bake are the same picture.
class_name ShapeGlyphs
extends RefCounted

const CIRCLE := "circle"
const SQUARE := "square"
const TRIANGLE := "triangle"

const SHAPES: PackedStringArray = [CIRCLE, SQUARE, TRIANGLE]

# traceShapePath's `r` as a fraction of the cell: the original used r = 46 in
# a 170px cell.
const GLYPH_R_FRAC := 46.0 / 170.0
# ctx.lineWidth 7 in that same 170px cell.
const STROKE_FRAC := 7.0 / 170.0
# shadowBlur 26 — the lit glow's reach.
const GLOW_FRAC := 26.0 / 170.0

# makeIconPanelTexture's unlit stroke: rgba(255,255,255,0.22).
const UNLIT_STROKE := Color(1.0, 1.0, 1.0, 0.22)
# makeShapeLockPlateTexture's palette.
const PLATE_BG := Color(0.082, 0.141, 0.125)      # #152420
const PLATE_BORDER := Color(0.435, 0.561, 0.525)  # #6f8f86
const PLATE_INK := Color(0.749, 0.914, 0.871)     # #bfe9de


## Is `shape` one this engine knows how to draw? Anything else falls back to a
## circle rather than drawing nothing, so a typo is visible, not invisible.
static func is_known(shape: String) -> bool:
	return SHAPES.has(shape)


# --- 3D: the key prop's glyph ----------------------------------------------

## The flat coloured solid a shape_key prop carries — a disc, a slab or a
## triangular prism, thin on Y. buildShapeKeyGlyph()'s geometry.
##
## PORTING TRAP, found by screenshot: the original builds its triangle as a
## 3-sided CylinderGeometry, and the obvious transliteration (CylinderMesh with
## radial_segments = 3) SILENTLY RENDERS A SQUARE — Godot clamps
## radial_segments to a minimum of 4, so the "triangle" key came out as a slab
## rotated 45 degrees, which is exactly the shape of another key. PrismMesh is
## the honest primitive, and it is sized to the same footprint the 3-sided
## cylinder would have had (an equilateral triangle inscribed in radius
## 0.58*size: side = r*sqrt(3) = 1.0*size, height = 1.5r = 0.87*size).
##
## A prism's triangle lies in XY and extrudes along Z, so it needs the static
## tilt glyph_tilt() returns to lie flat like the other two. Use
## glyph_instance() and neither is your problem.
static func glyph_mesh(shape: String, size: float) -> Mesh:
	var thickness := size * 0.22
	match shape:
		SQUARE:
			var box := BoxMesh.new()
			box.size = Vector3(size * 0.86, thickness, size * 0.86)
			return box
		TRIANGLE:
			var tri := PrismMesh.new()
			tri.size = Vector3(size * 1.0, size * 0.87, thickness)
			return tri
		_:
			var cyl := CylinderMesh.new()
			cyl.top_radius = size * 0.5
			cyl.bottom_radius = size * 0.5
			cyl.height = thickness
			cyl.radial_segments = 22
			return cyl


## The static rotation that lays a glyph flat (thin on Y). Only the prism needs
## one; a cylinder and a box are already built around Y.
static func glyph_tilt(shape: String) -> Vector3:
	return Vector3(-PI / 2.0, 0.0, 0.0) if shape == TRIANGLE else Vector3.ZERO


## A ready-to-add glyph: correct mesh, correct material, lying flat. This is
## the call a fixture should make — glyph_mesh() alone will leave a triangle
## standing on edge.
static func glyph_instance(shape: String, size: float, color: Color) -> MeshInstance3D:
	var mesh := glyph_mesh(shape, size)
	# On the MESH's surface, not as a material_override: pill_idle.gd finds the
	# emissive materials it pulses via surface_get_material(), which an
	# override is invisible to. Same wiring as pill_pickup.tscn's sub-resources.
	(mesh as PrimitiveMesh).material = glyph_material(color)
	var node := MeshInstance3D.new()
	node.name = "Glyph"
	node.mesh = mesh
	node.rotation = glyph_tilt(shape)
	return node


## Per-instance emissive material for a glyph. Emissive because a key sits in
## an unlit dogleg alcove: without it the prop is a black lump at the one
## moment the player is looking for it.
static func glyph_material(color: Color) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = 0.4
	mat.metallic = 0.0
	mat.emission_enabled = true
	mat.emission = color
	mat.emission_energy_multiplier = 0.45
	return mat


# --- 2D: signed distance fields --------------------------------------------

## Signed distance from (px, pz) — cell-centre relative, +y DOWN like a canvas
## — to `shape`'s outline, in the same units as `r`. Negative inside.
static func shape_sdf(shape: String, px: float, py: float, r: float) -> float:
	match shape:
		SQUARE:
			var h := r * 0.68
			var dx := absf(px) - h
			var dy := absf(py) - h
			var outside := Vector2(maxf(dx, 0.0), maxf(dy, 0.0)).length()
			return outside + minf(maxf(dx, dy), 0.0)
		TRIANGLE:
			return _poly_sdf(Vector2(px, py), [
				Vector2(0.0, -r * 0.82),
				Vector2(-r * 0.76, r * 0.6),
				Vector2(r * 0.76, r * 0.6),
			])
		_:
			return Vector2(px, py).length() - r * 0.72


# Standard polygon SDF (Inigo Quilez's): nearest-edge distance, sign from a
# crossing count. Three verts here, but written generally so a fourth shape
# would need no new maths.
static func _poly_sdf(p: Vector2, v: Array) -> float:
	var n := v.size()
	var d: float = (p - v[0]).length_squared()
	var s := 1.0
	for i in n:
		var j := (i + n - 1) % n
		var e: Vector2 = v[j] - v[i]
		var w: Vector2 = p - v[i]
		var b: Vector2 = w - e * clampf(w.dot(e) / e.length_squared(), 0.0, 1.0)
		d = minf(d, b.length_squared())
		var c := [p.y >= v[i].y, p.y < v[j].y, e.x * w.y > e.y * w.x]
		if (c[0] and c[1] and c[2]) or (not c[0] and not c[1] and not c[2]):
			s = -s
	return s * sqrt(d)


# --- 2D: the icon panel ----------------------------------------------------

## One cell per shape, left to right, in the authored order. `lit[i]` fills and
## glows cell i; unlit cells are a dim outline, near-invisible until collected
## ("dim by default" — the design doc's answer to its own open question 1).
##
## Returns a fresh Image; icon_panel.gd hands it to ImageTexture.update(), the
## in-place rebake.
static func bake_icon_image(shapes: PackedStringArray, colors: PackedColorArray,
		lit: Array, cell_px := 128) -> Image:
	var n: int = maxi(1, shapes.size())
	var img := Image.create(cell_px * n, cell_px, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))

	var r := cell_px * GLYPH_R_FRAC
	var half_stroke := cell_px * STROKE_FRAC * 0.5
	var glow := cell_px * GLOW_FRAC

	for i in n:
		var shape: String = shapes[i] if i < shapes.size() else CIRCLE
		var color: Color = colors[i] if i < colors.size() else Color(1, 1, 1)
		var is_lit: bool = bool(lit[i]) if i < lit.size() else false
		var ox := cell_px * i
		for y in cell_px:
			var py := float(y) - cell_px * 0.5 + 0.5
			for x in cell_px:
				var px := float(x) - cell_px * 0.5 + 0.5
				var d := shape_sdf(shape, px, py, r)
				var c := _icon_pixel(d, half_stroke, glow, color, is_lit)
				if c.a > 0.0:
					img.set_pixel(ox + x, y, c)
	return img


# One pixel of an icon cell. Kept separate so the lit/unlit rule is readable:
# unlit is stroke only; lit is fill + stroke + an outward glow falloff, which
# is what shadowBlur bought in the canvas version.
static func _icon_pixel(d: float, half_stroke: float, glow: float, color: Color,
		is_lit: bool) -> Color:
	# 1px feather, so a 128px bake does not read as a jaggy stencil.
	var stroke_a := clampf((half_stroke - absf(d)) + 0.5, 0.0, 1.0)
	if not is_lit:
		if stroke_a <= 0.0:
			return Color(0, 0, 0, 0)
		return Color(UNLIT_STROKE.r, UNLIT_STROKE.g, UNLIT_STROKE.b,
			UNLIT_STROKE.a * stroke_a)

	var fill_a := clampf(0.5 - d, 0.0, 1.0)
	var a: float = maxf(fill_a, stroke_a)
	if d > 0.0 and glow > 0.0:
		a = maxf(a, clampf(1.0 - d / glow, 0.0, 1.0) * 0.45)
	if a <= 0.0:
		return Color(0, 0, 0, 0)
	return Color(color.r, color.g, color.b, a)


# --- 2D: the shape lock's faceplate ----------------------------------------

## The lock's static plate: a dark panel, a border, and the outline of every
## shape it wants. It never lights up — the panel above the door is the
## progress display, the lock body just states the requirement.
static func bake_plate_image(shapes: PackedStringArray, width := 240, height := 224) -> Image:
	var img := Image.create(width, height, false, Image.FORMAT_RGBA8)
	img.fill(PLATE_BG)

	var n: int = maxi(1, shapes.size())
	var cell_w := float(width) / float(n)
	var r: float = minf(cell_w, float(height)) * GLYPH_R_FRAC * (170.0 / 128.0)
	var half_stroke: float = maxf(1.0, float(height) * 6.0 / 300.0) * 0.5
	var border: float = maxf(2.0, float(height) * 4.0 / 300.0)

	for y in height:
		for x in width:
			# border
			if x < border or y < border or x >= width - border or y >= height - border:
				img.set_pixel(x, y, PLATE_BORDER)
				continue
			var i := int(float(x) / cell_w)
			var shape: String = shapes[i] if i < shapes.size() else CIRCLE
			var px := float(x) - (cell_w * i + cell_w * 0.5) + 0.5
			var py := float(y) - height * 0.5 + 0.5
			var d := shape_sdf(shape, px, py, r)
			var a := clampf((half_stroke - absf(d)) + 0.5, 0.0, 1.0)
			# Edge grime: the original's addEdgeGrime(), as a cheap vignette.
			# Not decoration — a perfectly even plate reads as a UI element
			# rather than something bolted to a ward wall for thirty years.
			var edge: float = minf(minf(float(x), float(width - 1 - x)),
				minf(float(y), float(height - 1 - y)))
			var grime := clampf(1.0 - edge / (0.22 * float(height)), 0.0, 1.0) * 0.45
			var base := PLATE_BG.lerp(Color(0, 0, 0), grime)
			img.set_pixel(x, y, base.lerp(PLATE_INK, a))
	return img
