# One-off generator: bakes the Orderly's curved/tapered body parts as
# ArrayMesh resources under orderly/meshes/, replacing the old flat-shaded
# BoxMesh stand-ins (torso slab, uniform-width limb boxes, plate-and-stick
# hand, box shoe) with smooth-shaded lofted forms.
#
# TECHNIQUE (adapted from fixtures/_gen/gen_bevel_meshes.gd's chamfered-box
# idea, generalised to a swept loft with per-vertex smooth normals):
#   1. A cross-section is a "rounded rectangle" — 4 quarter-circle corner
#      arcs of radius `r` joined by straight edges. When `r` is capped at
#      min(half_w, half_d), the straight edges shrink to nothing and the
#      profile degenerates into a smooth capsule/ellipse — that's what the
#      limbs use (a body reads as round). The torso/jacket and the palm use
#      a smaller `r` so it reads as a tailored, boxier garment panel with
#      just a soft radiused edge (the brief's "radiused transitions" note).
#   2. A LOFT stacks these cross-sections ("rings") along a sweep axis (Y
#      for limbs/torso, Z for the shoe, which points front-to-back) and
#      stitches consecutive rings with quads. Each vertex's normal is the
#      profile's own outward radial direction at that point — a standard
#      "generalized cylinder" approximation that's exact for untapered
#      sections and a good approximation for the gentle tapers used here.
#      This is what makes the surface smooth-shaded (the single biggest
#      fidelity win per the brief) without needing more triangles than a
#      boxy version would.
#   3. Per-triangle winding is resolved the same way gen_bevel_meshes.gd's
#      add_tri does: build the triangle, check whether its geometric normal
#      agrees with the intended outward normal, and flip vertex order if
#      not. That means callers never have to reason about winding by hand.
#
# Regenerate with:
#   godot --headless --path . --script res://orderly/_gen/gen_orderly_meshes.gd
extends SceneTree

# Read the live proportions from orderly_visual.gd itself so the baked
# meshes can never silently drift from the constants that place the gait
# rig's pivots (LEG_H, ARM_LEN, TORSO_H, ...). Same pattern main.gd's MOOD
# table is read with elsewhere in this repo.
const OV := preload("res://orderly/orderly_visual.gd")

const OUT_DIR := "res://orderly/meshes"


func _initialize() -> void:
	DirAccess.make_dir_recursive_absolute(OUT_DIR)

	_write("leg_thigh", _build_leg_thigh())
	_write("leg_shin", _build_leg_shin())
	_write("arm_upper", _build_arm_upper())
	_write("arm_cuff", _build_arm_cuff())
	_write("torso", _build_torso())
	_write("palm", _build_palm())
	_write("finger", _build_finger())
	_write("shoe", _build_shoe())

	quit()


func _write(part_name: String, mesh: ArrayMesh) -> void:
	var path := "%s/%s.tres" % [OUT_DIR, part_name]
	var err := ResourceSaver.save(mesh, path)
	if err != OK:
		push_error("failed to save %s: %d" % [path, err])
	else:
		print("wrote %s (%d tris)" % [path, mesh.get_faces().size() / 3])


# --- cross-section ------------------------------------------------------

# One quarter-circle-cornered rounded rectangle, in the loft's local 2D
# cross-section space (u = first tangent axis, v = second). Returns
# [positions: Array[Vector2], outward_normals: Array[Vector2]], CCW, with
# `4 * corner_segs` points and NO duplicated closing point (the loop wraps).
# `r` is silently clamped so it can never exceed the profile's own half
# extents — callers that want a full round (limbs) just pass
# r = min(half_u, half_v).
static func rounded_rect_profile(half_u: float, half_v: float, r: float, corner_segs: int) -> Array:
	var rc: float = min(r, min(half_u, half_v) * 0.999)
	var centers := [
		Vector2(half_u - rc, half_v - rc),
		Vector2(-(half_u - rc), half_v - rc),
		Vector2(-(half_u - rc), -(half_v - rc)),
		Vector2(half_u - rc, -(half_v - rc)),
	]
	var positions: Array[Vector2] = []
	var normals: Array[Vector2] = []
	for ci in range(4):
		var c: Vector2 = centers[ci]
		var a0 := ci * PI * 0.5
		for s in range(corner_segs):
			var a := a0 + (PI * 0.5) * (float(s) / float(corner_segs))
			var dir := Vector2(cos(a), sin(a))
			positions.append(c + dir * rc)
			normals.append(dir)
	return [positions, normals]


# --- winding-safe smooth triangle/quad emission -------------------------

static func _emit_tri(st: SurfaceTool, p0: Vector3, p1: Vector3, p2: Vector3,
		n0: Vector3, n1: Vector3, n2: Vector3, ref_n: Vector3) -> void:
	var pts := [p0, p1, p2]
	var nrms := [n0, n1, n2]
	var geo_n := (p1 - p0).cross(p2 - p0)
	if geo_n.dot(ref_n) < 0.0:
		pts = [p0, p2, p1]
		nrms = [n0, n2, n1]
	for i in 3:
		st.set_normal(nrms[i])
		st.add_vertex(pts[i])


static func _emit_quad(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, d: Vector3,
		na: Vector3, nb: Vector3, nc: Vector3, nd: Vector3) -> void:
	var ref_n := (na + nb + nc + nd).normalized()
	_emit_tri(st, a, b, c, na, nb, nc, ref_n)
	_emit_tri(st, a, c, d, na, nc, nd, ref_n)


# --- generic swept loft ---------------------------------------------------

# `rings`: Array of {pos: float, hu: float, hv: float, r: float}, ordered
# along the sweep. `axis`: "y" sweeps along Y with the cross-section in XZ
# (limbs, torso); "z" sweeps along Z with the cross-section in XY (the shoe,
# whose length runs front-to-back). Always caps both ends so every part is
# a closed, non-leaking manifold — cheap, and it means a part can be seen
# from any angle a camera swings to without needing a matching neighbour.
static func build_loft(rings: Array, corner_segs: int, axis: String) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)

	var ring_pts: Array = []
	var ring_nrm: Array = []
	for ring in rings:
		var prof: Array = rounded_rect_profile(ring.hu, ring.hv, ring.r, corner_segs)
		var pos2d: Array = prof[0]
		var nrm2d: Array = prof[1]
		var pts3: Array[Vector3] = []
		var nrm3: Array[Vector3] = []
		for i in pos2d.size():
			var u: float = pos2d[i].x
			var v: float = pos2d[i].y
			var nu: float = nrm2d[i].x
			var nv: float = nrm2d[i].y
			if axis == "y":
				pts3.append(Vector3(u, ring.pos, v))
				nrm3.append(Vector3(nu, 0.0, nv))
			else:  # "z"
				pts3.append(Vector3(u, v, ring.pos))
				nrm3.append(Vector3(nu, nv, 0.0))
		ring_pts.append(pts3)
		ring_nrm.append(nrm3)

	var count: int = ring_pts[0].size()
	for ri in range(rings.size() - 1):
		var a: Array = ring_pts[ri]
		var an: Array = ring_nrm[ri]
		var b: Array = ring_pts[ri + 1]
		var bn: Array = ring_nrm[ri + 1]
		for i in range(count):
			var i2 := (i + 1) % count
			_emit_quad(st, a[i], a[i2], b[i2], b[i], an[i], an[i2], bn[i2], bn[i])

	# End caps: fan from the ring centroid. Normal direction is "away from
	# the rest of the loft" — derived from the sweep-axis component of the
	# first/last two rings rather than hardcoded, so this works for both
	# the Y-sweep and Z-sweep (and either direction of travel) uniformly.
	var axis_vec := Vector3(0, 1, 0) if axis == "y" else Vector3(0, 0, 1)
	_add_cap(st, ring_pts[0], axis_vec * signf(rings[0].pos - rings[1].pos))
	var last := rings.size() - 1
	_add_cap(st, ring_pts[last], axis_vec * signf(rings[last].pos - rings[last - 1].pos))

	st.index()
	return st.commit()


static func _add_cap(st: SurfaceTool, pts: Array, n: Vector3) -> void:
	var center := Vector3.ZERO
	for p in pts:
		center += p
	center /= pts.size()
	for i in pts.size():
		var i2 := (i + 1) % pts.size()
		_emit_tri(st, center, pts[i], pts[i2], n, n, n, n)


# --- parts ----------------------------------------------------------------
# Each ring's `pos` is baked in absolute local metres along the sweep axis,
# always measured from the SAME origin the gait rig already uses (hip/
# shoulder pivot = 0, torso vertical centre = 0) so every generated mesh can
# be added as a MeshInstance3D at position ZERO directly under the existing
# pivot/torso node — no extra runtime offset math, no rig change.

const LEG_CORNER_SEGS := 10   # high — legs read fully round, like a limb
const ARM_CORNER_SEGS := 8
const TORSO_CORNER_SEGS := 10
const PALM_CORNER_SEGS := 8
const FINGER_CORNER_SEGS := 6
const SHOE_CORNER_SEGS := 10


# Hip -> upper-thigh -> lower-thigh -> knee. Cleaner material (less grime)
# than the shin, per the original two-material split.
func _build_leg_thigh() -> ArrayMesh:
	var h: float = OV.LEG_H
	var rings := [
		{pos = 0.00 * -h, hu = 0.095, hv = 0.078, r = 999.0},
		{pos = 0.18 * -h, hu = 0.089, hv = 0.073, r = 999.0},
		{pos = 0.34 * -h, hu = 0.072, hv = 0.062, r = 999.0},
		{pos = 0.50 * -h, hu = 0.060, hv = 0.055, r = 999.0},
	]
	for ring in rings:
		ring.r = min(ring.hu, ring.hv)
	return build_loft(rings, LEG_CORNER_SEGS, "y")


# Knee (matches leg_thigh's last ring exactly, so the material seam has no
# visible step) -> calf bulge -> lower shin -> ankle.
func _build_leg_shin() -> ArrayMesh:
	var h: float = OV.LEG_H
	var rings := [
		{pos = 0.50 * -h, hu = 0.060, hv = 0.055, r = 999.0},
		{pos = 0.65 * -h, hu = 0.070, hv = 0.060, r = 999.0},
		{pos = 0.82 * -h, hu = 0.056, hv = 0.048, r = 999.0},
		{pos = 1.00 * -h, hu = 0.046, hv = 0.040, r = 999.0},
	]
	for ring in rings:
		ring.r = min(ring.hu, ring.hv)
	return build_loft(rings, LEG_CORNER_SEGS, "y")


func _build_arm_upper() -> ArrayMesh:
	var l: float = OV.ARM_LEN
	var rings := [
		{pos = 0.00 * -l, hu = 0.050, hv = 0.048, r = 999.0},
		{pos = 0.18 * -l, hu = 0.046, hv = 0.044, r = 999.0},
		{pos = 0.34 * -l, hu = 0.038, hv = 0.036, r = 999.0},
		{pos = 0.50 * -l, hu = 0.032, hv = 0.030, r = 999.0},
	]
	for ring in rings:
		ring.r = min(ring.hu, ring.hv)
	return build_loft(rings, ARM_CORNER_SEGS, "y")


func _build_arm_cuff() -> ArrayMesh:
	var l: float = OV.ARM_LEN
	var rings := [
		{pos = 0.50 * -l, hu = 0.032, hv = 0.030, r = 999.0},
		{pos = 0.65 * -l, hu = 0.038, hv = 0.036, r = 999.0},
		{pos = 0.82 * -l, hu = 0.030, hv = 0.028, r = 999.0},
		{pos = 1.00 * -l, hu = 0.024, hv = 0.022, r = 999.0},
	]
	for ring in rings:
		ring.r = min(ring.hu, ring.hv)
	return build_loft(rings, ARM_CORNER_SEGS, "y")


# Shoulder (widest, boxy-tailored) -> chest -> tailored waist -> hip ->
# hem flare (the brief's "hem that flares slightly over the trousers") ->
# hem bottom (folds back in a touch, the way a stiff hem edge does). Small
# `r` throughout — this should read as cut cloth panels, not a rounded
# capsule like the limbs.
func _build_torso() -> ArrayMesh:
	var th: float = OV.TORSO_H
	var rings := [
		{pos = 0.500 * th, hu = 0.185, hv = 0.115, r = 0.045},
		{pos = 0.300 * th, hu = 0.200, hv = 0.125, r = 0.050},
		{pos = -0.050 * th, hu = 0.165, hv = 0.100, r = 0.040},
		{pos = -0.320 * th, hu = 0.185, hv = 0.115, r = 0.040},
		{pos = -0.500 * th, hu = 0.215, hv = 0.130, r = 0.030},
		{pos = -0.580 * th, hu = 0.205, hv = 0.125, r = 0.025},
	]
	return build_loft(rings, TORSO_CORNER_SEGS, "y")


# Wrist -> back-of-hand -> knuckle row. `r` shrinks toward the knuckle end
# so it reads flatter/more rectangular there (the back of a hand) instead
# of fully cylindrical like the wrist.
func _build_palm() -> ArrayMesh:
	var hl: float = OV.HAND_LEN
	var rings := [
		{pos = 0.00 * -hl, hu = 0.028, hv = 0.016, r = 0.014},
		{pos = 0.50 * -hl, hu = 0.036, hv = 0.020, r = 0.012},
		{pos = 1.00 * -hl, hu = 0.040, hv = 0.018, r = 0.008},
	]
	return build_loft(rings, PALM_CORNER_SEGS, "y")


# Base -> knuckle-joint waist -> tip. One mesh reused (mirrored/scaled by
# the caller) for all four fingers and the thumb.
func _build_finger() -> ArrayMesh:
	var fl: float = OV.FINGER_LEN
	var rings := [
		{pos = 0.00 * -fl, hu = 0.0095, hv = 0.0095, r = 999.0},
		{pos = 0.50 * -fl, hu = 0.0075, hv = 0.0075, r = 999.0},
		{pos = 1.00 * -fl, hu = 0.0045, hv = 0.0045, r = 999.0},
	]
	for ring in rings:
		ring.r = min(ring.hu, ring.hv)
	return build_loft(rings, FINGER_CORNER_SEGS, "y")


# Swept along Z (front/back — local -Z is forward, matching the whole
# visual rig's convention, see orderly_visual.gd's coordinate note). Heel
# (tall, narrow) -> ankle -> instep -> toe start -> rounded toe tip.
func _build_shoe() -> ArrayMesh:
	var rings := [
		{pos = 0.125, hu = 0.050, hv = 0.040, r = 0.018},
		{pos = 0.055, hu = 0.053, hv = 0.048, r = 0.020},
		{pos = -0.015, hu = 0.050, hv = 0.044, r = 0.018},
		{pos = -0.085, hu = 0.045, hv = 0.032, r = 0.020},
		{pos = -0.130, hu = 0.020, hv = 0.015, r = 0.013},
	]
	return build_loft(rings, SHOE_CORNER_SEGS, "z")
