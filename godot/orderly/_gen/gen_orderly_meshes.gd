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
# FIDELITY PASS (polygon-density budget spend, see the design brief this was
# written against): three additions on top of the technique above, all
# opt-in per part so the base loft stays simple where it's not needed:
#   4. RING BEND — a ring may carry `cx`/`cz` offsets that shift its whole
#      cross-section off the straight sweep axis. Stacking these across a
#      loft curves the tube itself (used for the fingers' resting curl).
#   5. RADIAL DISPLACEMENT ("fold_bands") — a list of small declarative
#      specs, each either a "ripple" (a sine wrinkle around the
#      circumference, gaussian-windowed along the sweep so it only appears
#      near one place — cloth gathers at a hem/waist/knee) or a "bump" (a
#      2D gaussian bump/dimple, windowed in BOTH the sweep direction and the
#      circumferential angle — an isolated feature like a knuckle or a brow
#      ridge). Displacement is applied along each vertex's OWN pre-fold
#      outward direction, so it reads as the surface pushing in/out, not a
#      sideways smear.
#   6. NORMAL RECOMPUTE — folded/bent vertex positions no longer match the
#      profile's analytic radial normal (that normal describes the
#      UNDISPLACED capsule, not the wrinkled surface). Whenever a part uses
#      #4 or #5, build_loft throws the analytic normals away and rebuilds
#      them from the FINAL, displaced/bent positions via a central finite
#      difference across neighbouring ring vertices (standard "normal of a
#      parametric surface from its own tangents" — tangent-along-the-ring
#      cross tangent-along-the-sweep). Each recomputed normal is dot-tested
#      against its own analytic normal and flipped if it landed in the
#      wrong hemisphere, so orientation can never invert even under a sharp
#      fold. Parts that don't fold/bend skip this and keep the cheaper
#      analytic normal exactly as before.
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
	_write("cuff_turnback", _build_cuff_turnback())
	_write("torso", _build_torso())
	_write("collar", _build_collar())
	_write("back_vent", _build_back_vent())
	_write("half_belt", _build_half_belt())
	_write("palm", _build_palm())
	_write("finger", _build_finger())
	_write("shoe", _build_shoe())
	_write("head", _build_head())

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


static func _add_cap(st: SurfaceTool, pts: Array, n: Vector3) -> void:
	var center := Vector3.ZERO
	for p in pts:
		center += p
	center /= pts.size()
	for i in pts.size():
		var i2 := (i + 1) % pts.size()
		_emit_tri(st, center, pts[i], pts[i2], n, n, n, n)


# --- radial displacement (cloth folds, facial suggestion, knuckles) -----
#
# A "band" is a Dictionary describing one displacement feature, evaluated at
# every ring vertex as a function of (theta = the vertex's own angle around
# the cross-section, ring_t = 0..1 position along the sweep):
#   kind = "ripple" (default): a sine wrinkle around theta, windowed by a
#     gaussian in ring_t (center_t/width_t) so it only appears near one
#     place along the part, optionally ALSO windowed angularly by a
#     cos-power falloff around target_theta/sharpness so it only appears on
#     one side (e.g. the back). freq = ripples per full turn, amp = peak
#     displacement in metres, phase = optional radians offset.
#   kind = "bump": a 2D gaussian bump/dimple (positive amp = outward bulge,
#     negative = sunken), windowed independently in ring_t
#     (center_t/width_t) and theta (center_theta/width_theta). Used for
#     isolated features — knuckles, brow ridge, cheekbone, eye sockets,
#     mouth line — rather than a wraparound wrinkle.
static func _band_value(theta: float, ring_t: float, band: Dictionary) -> float:
	if band.get("kind", "ripple") == "bump":
		var dt: float = (ring_t - band.center_t) / maxf(band.get("width_t", 0.1), 0.001)
		var dth: float = wrapf(theta - band.get("center_theta", 0.0), -PI, PI) / maxf(band.get("width_theta", 0.5), 0.001)
		return band.amp * exp(-(dt * dt + dth * dth))
	else:
		var dt2: float = (ring_t - band.center_t) / maxf(band.get("width_t", 0.1), 0.001)
		var falloff: float = exp(-dt2 * dt2 * 2.0)
		var w := 1.0
		if band.has("target_theta"):
			w = pow(clampf(cos(theta - band.target_theta), 0.0, 1.0), band.get("sharpness", 2.0))
		return band.amp * falloff * sin(theta * band.get("freq", 6.0) + band.get("phase", 0.0)) * w


static func _layered_folds(theta: float, ring_t: float, bands: Array) -> float:
	var d := 0.0
	for b in bands:
		d += _band_value(theta, ring_t, b)
	return d


# Rebuilds every ring normal from the DISPLACED/BENT positions via a central
# finite difference: tangent-around-the-ring (theta direction, wraps) cross
# tangent-along-the-sweep (clamped/one-sided at the two end rings). Each
# result is flipped into the same hemisphere as the original analytic normal
# so a sharp fold can never invert the surface. `ring_pts`/`ring_nrm0` are
# Array[Array[Vector3]], one inner array per ring.
static func _recompute_normals_fd(ring_pts: Array, ring_nrm0: Array) -> Array:
	var count: int = ring_pts[0].size()
	var n_rings: int = ring_pts.size()
	var out: Array = []
	for ri in range(n_rings):
		var row: Array[Vector3] = []
		for i in range(count):
			var i_prev := (i - 1 + count) % count
			var i_next := (i + 1) % count
			var t_theta: Vector3 = ring_pts[ri][i_next] - ring_pts[ri][i_prev]
			var t_ring: Vector3
			if ri == 0:
				t_ring = ring_pts[ri + 1][i] - ring_pts[ri][i]
			elif ri == n_rings - 1:
				t_ring = ring_pts[ri][i] - ring_pts[ri - 1][i]
			else:
				t_ring = ring_pts[ri + 1][i] - ring_pts[ri - 1][i]
			var n := t_theta.cross(t_ring)
			if n.length_squared() < 1e-12:
				row.append(ring_nrm0[ri][i])
				continue
			n = n.normalized()
			if n.dot(ring_nrm0[ri][i]) < 0.0:
				n = -n
			row.append(n)
		out.append(row)
	return out


# --- generic swept loft ---------------------------------------------------

# `rings`: Array of {pos: float, hu: float, hv: float, r: float, t?: float,
# cx?: float, cz?: float}, ordered along the sweep. `t` (0..1) is the
# fold-band sweep coordinate — defaults to the ring's own index fraction if
# omitted, but parts with unevenly-spaced rings (torso, head) pass it
# explicitly so a gaussian window lands where the ring LIST says it should,
# not where uniform spacing would put it. `cx`/`cz` bend the ring's whole
# cross-section off-axis (used for the finger curl). `axis`: "y" sweeps
# along Y with the cross-section in XZ (limbs, torso, head); "z" sweeps
# along Z with the cross-section in XY (the shoe, whose length runs
# front-to-back). Always caps both ends so every part is a closed,
# non-leaking manifold. `fold_bands` (see _band_value) is optional radial
# displacement — when non-empty, normals are recomputed from the displaced
# geometry (see _recompute_normals_fd) instead of using the cheaper
# analytic ones.
static func build_loft(rings: Array, corner_segs: int, axis: String, fold_bands: Array = []) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)

	var n_rings: int = rings.size()
	var ring_pts: Array = []
	var ring_nrm0: Array = []
	for ri in range(n_rings):
		var ring: Dictionary = rings[ri]
		var prof: Array = rounded_rect_profile(ring.hu, ring.hv, ring.r, corner_segs)
		var pos2d: Array = prof[0]
		var nrm2d: Array = prof[1]
		var ring_t: float = ring.get("t", float(ri) / float(max(n_rings - 1, 1)))
		var cx: float = ring.get("cx", 0.0)
		var cz: float = ring.get("cz", 0.0)
		var pts3: Array[Vector3] = []
		var nrm3: Array[Vector3] = []
		for i in pos2d.size():
			var u: float = pos2d[i].x
			var v: float = pos2d[i].y
			var nu: float = nrm2d[i].x
			var nv: float = nrm2d[i].y
			if not fold_bands.is_empty():
				var theta := atan2(nv, nu)
				var d: float = _layered_folds(theta, ring_t, fold_bands)
				u += nu * d
				v += nv * d
			if axis == "y":
				pts3.append(Vector3(u + cx, ring.pos, v + cz))
				nrm3.append(Vector3(nu, 0.0, nv))
			else:  # "z"
				pts3.append(Vector3(u + cx, v + cz, ring.pos))
				nrm3.append(Vector3(nu, nv, 0.0))
		ring_pts.append(pts3)
		ring_nrm0.append(nrm3)

	var ring_nrm: Array = ring_nrm0
	var displaced := not fold_bands.is_empty()
	var bent := false
	for ring in rings:
		if ring.get("cx", 0.0) != 0.0 or ring.get("cz", 0.0) != 0.0:
			bent = true
			break
	if displaced or bent:
		ring_nrm = _recompute_normals_fd(ring_pts, ring_nrm0)

	var count: int = ring_pts[0].size()
	for ri in range(n_rings - 1):
		var a: Array = ring_pts[ri]
		var an: Array = ring_nrm[ri]
		var b: Array = ring_pts[ri + 1]
		var bn: Array = ring_nrm[ri + 1]
		for i in range(count):
			var i2 := (i + 1) % count
			_emit_quad(st, a[i], a[i2], b[i2], b[i], an[i], an[i2], bn[i2], bn[i])

	# End caps: fan from the ring centroid. Normal direction is "away from
	# the rest of the loft" — derived from the sweep-axis component of the
	# first/last two rings' NOMINAL position (ring.pos), not the
	# bent/displaced one, so a bent tip (fingers) still caps correctly.
	var axis_vec := Vector3(0, 1, 0) if axis == "y" else Vector3(0, 0, 1)
	_add_cap(st, ring_pts[0], axis_vec * signf(rings[0].pos - rings[1].pos))
	var last := n_rings - 1
	_add_cap(st, ring_pts[last], axis_vec * signf(rings[last].pos - rings[last - 1].pos))

	st.index()
	return st.commit()


# --- generic tube-on-an-arc (collar, half-belt) ---------------------------
#
# A separate small loft variant for parts that wrap partway AROUND a body
# part (open ring, standing off the surface) instead of running straight
# along an axis: a mandarin collar standing off the neck with a front gap,
# a half-belt across the back only. Cross-section is a single
# rounded-rect (hu = radial thickness pointing away from `arc_radius`'s
# center, hv = vertical height) swept along a horizontal arc from
# `theta_start` to `theta_end` (theta = 0 is local -Z / "front", per this
# rig's forward convention — see orderly_visual.gd's coordinate note;
# increasing theta sweeps toward local +X then around through the back).
# Both open ends are capped so the piece reads as a solid strip, not a
# hollow shell.
static func build_arc_tube(hu: float, hv: float, r: float, corner_segs: int,
		arc_radius: float, theta_start: float, theta_end: float, arc_segs: int) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)

	var prof: Array = rounded_rect_profile(hu, hv, r, corner_segs)
	var pos2d: Array = prof[0]
	var nrm2d: Array = prof[1]

	var ring_pts: Array = []
	var ring_nrm: Array = []
	for ri in range(arc_segs + 1):
		var t := float(ri) / float(arc_segs)
		var theta: float = lerp(theta_start, theta_end, t)
		var radial := Vector3(sin(theta), 0.0, -cos(theta))
		var up := Vector3(0.0, 1.0, 0.0)
		var center := radial * arc_radius
		var pts3: Array[Vector3] = []
		var nrm3: Array[Vector3] = []
		for i in pos2d.size():
			var u: float = pos2d[i].x
			var v: float = pos2d[i].y
			var nu: float = nrm2d[i].x
			var nv: float = nrm2d[i].y
			pts3.append(center + radial * u + up * v)
			nrm3.append((radial * nu + up * nv).normalized())
		ring_pts.append(pts3)
		ring_nrm.append(nrm3)

	var count: int = ring_pts[0].size()
	for ri in range(arc_segs):
		var a: Array = ring_pts[ri]
		var an: Array = ring_nrm[ri]
		var b: Array = ring_pts[ri + 1]
		var bn: Array = ring_nrm[ri + 1]
		for i in range(count):
			var i2 := (i + 1) % count
			_emit_quad(st, a[i], a[i2], b[i2], b[i], an[i], an[i2], bn[i2], bn[i])

	_add_cap(st, ring_pts[0], _centroid(ring_pts[0]) - _centroid(ring_pts[1]))
	var last := arc_segs
	_add_cap(st, ring_pts[last], _centroid(ring_pts[last]) - _centroid(ring_pts[last - 1]))

	st.index()
	return st.commit()


static func _centroid(pts: Array) -> Vector3:
	var c := Vector3.ZERO
	for p in pts:
		c += p
	return (c / pts.size())


# --- parts ----------------------------------------------------------------
# Each ring's `pos` is baked in absolute local metres along the sweep axis,
# always measured from the SAME origin the gait rig already uses (hip/
# shoulder pivot = 0, torso vertical centre = 0) so every generated mesh can
# be added as a MeshInstance3D at position ZERO directly under the existing
# pivot/torso node — no extra runtime offset math, no rig change.

const LEG_CORNER_SEGS := 28
const ARM_CORNER_SEGS := 26
const TORSO_CORNER_SEGS := 32
const PALM_CORNER_SEGS := 26
const FINGER_CORNER_SEGS := 20
const SHOE_CORNER_SEGS := 26
const COLLAR_CORNER_SEGS := 16
const BELT_CORNER_SEGS := 14
const VENT_CORNER_SEGS := 10
const HEAD_CORNER_SEGS := 34


# Hip -> upper-thigh -> lower-thigh -> knee. Cleaner material (less grime)
# than the shin, per the original two-material split. More rings than the
# original 4 so the taper reads as a genuine curve rather than a facet, and
# so there's enough resolution for the back-of-knee gather fold below.
func _build_leg_thigh() -> ArrayMesh:
	var h: float = OV.LEG_H
	var rings := [
		{pos = 0.00 * -h, hu = 0.095, hv = 0.078, r = 999.0, t = 0.00},
		{pos = 0.06 * -h, hu = 0.094, hv = 0.077, r = 999.0, t = 0.08},
		{pos = 0.10 * -h, hu = 0.092, hv = 0.076, r = 999.0, t = 0.14},
		{pos = 0.18 * -h, hu = 0.089, hv = 0.073, r = 999.0, t = 0.26},
		{pos = 0.26 * -h, hu = 0.081, hv = 0.068, r = 999.0, t = 0.38},
		{pos = 0.34 * -h, hu = 0.072, hv = 0.062, r = 999.0, t = 0.50},
		{pos = 0.42 * -h, hu = 0.065, hv = 0.058, r = 999.0, t = 0.72},
		{pos = 0.46 * -h, hu = 0.062, hv = 0.056, r = 999.0, t = 0.86},
		{pos = 0.50 * -h, hu = 0.060, hv = 0.055, r = 999.0, t = 1.00},
	]
	for ring in rings:
		ring.r = min(ring.hu, ring.hv)
	var folds := [
		# Trouser fabric gathering just above the knee crease, back-weighted.
		{kind = "ripple", center_t = 0.94, width_t = 0.10, freq = 8.0, amp = 0.0035, target_theta = PI / 2.0, sharpness = 1.5},
	]
	return build_loft(rings, LEG_CORNER_SEGS, "y", folds)


# Knee (matches leg_thigh's last ring exactly, so the material seam has no
# visible step) -> calf bulge -> lower shin -> ankle.
func _build_leg_shin() -> ArrayMesh:
	var h: float = OV.LEG_H
	var rings := [
		{pos = 0.50 * -h, hu = 0.060, hv = 0.055, r = 999.0, t = 0.00},
		{pos = 0.58 * -h, hu = 0.068, hv = 0.059, r = 999.0, t = 0.16},
		{pos = 0.65 * -h, hu = 0.070, hv = 0.060, r = 999.0, t = 0.30},
		{pos = 0.70 * -h, hu = 0.067, hv = 0.057, r = 999.0, t = 0.39},
		{pos = 0.74 * -h, hu = 0.063, hv = 0.054, r = 999.0, t = 0.48},
		{pos = 0.82 * -h, hu = 0.056, hv = 0.048, r = 999.0, t = 0.64},
		{pos = 0.91 * -h, hu = 0.050, hv = 0.043, r = 999.0, t = 0.82},
		{pos = 0.96 * -h, hu = 0.048, hv = 0.041, r = 999.0, t = 0.92},
		{pos = 1.00 * -h, hu = 0.046, hv = 0.040, r = 999.0, t = 1.00},
	]
	for ring in rings:
		ring.r = min(ring.hu, ring.hv)
	var folds := [
		# Crease just below the knee, back-weighted — a continuation of the
		# thigh's fold so the seam between the two meshes doesn't read as a
		# sudden cutoff.
		{kind = "ripple", center_t = 0.06, width_t = 0.08, freq = 8.0, amp = 0.003, target_theta = PI / 2.0, sharpness = 1.5},
		# Ankle-cuff gather where the trouser leg breaks over the shoe.
		{kind = "ripple", center_t = 0.97, width_t = 0.05, freq = 10.0, amp = 0.0025},
	]
	return build_loft(rings, LEG_CORNER_SEGS, "y", folds)


func _build_arm_upper() -> ArrayMesh:
	var l: float = OV.ARM_LEN
	var rings := [
		{pos = 0.00 * -l, hu = 0.050, hv = 0.048, r = 999.0, t = 0.00},
		{pos = 0.06 * -l, hu = 0.049, hv = 0.047, r = 999.0, t = 0.09},
		{pos = 0.10 * -l, hu = 0.048, hv = 0.046, r = 999.0, t = 0.16},
		{pos = 0.18 * -l, hu = 0.046, hv = 0.044, r = 999.0, t = 0.30},
		{pos = 0.26 * -l, hu = 0.041, hv = 0.039, r = 999.0, t = 0.44},
		{pos = 0.34 * -l, hu = 0.038, hv = 0.036, r = 999.0, t = 0.58},
		{pos = 0.42 * -l, hu = 0.034, hv = 0.032, r = 999.0, t = 0.80},
		{pos = 0.46 * -l, hu = 0.033, hv = 0.031, r = 999.0, t = 0.90},
		{pos = 0.50 * -l, hu = 0.032, hv = 0.030, r = 999.0, t = 1.00},
	]
	for ring in rings:
		ring.r = min(ring.hu, ring.hv)
	var folds := [
		# Inner-elbow crease as the sleeve nears the joint.
		{kind = "ripple", center_t = 0.92, width_t = 0.09, freq = 7.0, amp = 0.003, target_theta = PI / 2.0, sharpness = 1.6},
	]
	return build_loft(rings, ARM_CORNER_SEGS, "y", folds)


func _build_arm_cuff() -> ArrayMesh:
	var l: float = OV.ARM_LEN
	var rings := [
		{pos = 0.50 * -l, hu = 0.032, hv = 0.030, r = 999.0, t = 0.00},
		{pos = 0.58 * -l, hu = 0.037, hv = 0.035, r = 999.0, t = 0.16},
		{pos = 0.65 * -l, hu = 0.038, hv = 0.036, r = 999.0, t = 0.30},
		{pos = 0.70 * -l, hu = 0.036, hv = 0.034, r = 999.0, t = 0.39},
		{pos = 0.74 * -l, hu = 0.033, hv = 0.031, r = 999.0, t = 0.48},
		{pos = 0.82 * -l, hu = 0.030, hv = 0.028, r = 999.0, t = 0.64},
		{pos = 0.91 * -l, hu = 0.027, hv = 0.025, r = 999.0, t = 0.82},
		{pos = 0.96 * -l, hu = 0.025, hv = 0.023, r = 999.0, t = 0.92},
		{pos = 1.00 * -l, hu = 0.024, hv = 0.022, r = 999.0, t = 1.00},
	]
	for ring in rings:
		ring.r = min(ring.hu, ring.hv)
	var folds := [
		{kind = "ripple", center_t = 0.05, width_t = 0.07, freq = 7.0, amp = 0.0025, target_theta = PI / 2.0, sharpness = 1.6},
	]
	return build_loft(rings, ARM_CORNER_SEGS, "y", folds)


# NEW — a short, slightly larger-radius flare right at the wrist end,
# folding back over the cuff proper like a turned-up sleeve hem. Baked in
# the SAME absolute pivot-local space as arm_cuff (see the file-header
# coordinate note) so it needs no extra offset: its own last ring lands
# exactly at -ARM_LEN, same as the cuff's, right where the hand attaches.
func _build_cuff_turnback() -> ArrayMesh:
	var l: float = OV.ARM_LEN
	var end_hu := 0.024
	var end_hv := 0.022
	var rings := [
		{pos = 0.955 * -l, hu = end_hu * 0.92, hv = end_hv * 0.92, r = 999.0, t = 0.00},
		{pos = 0.978 * -l, hu = end_hu * 1.38, hv = end_hv * 1.38, r = 999.0, t = 0.45},
		{pos = 1.000 * -l, hu = end_hu * 1.08, hv = end_hv * 1.08, r = 999.0, t = 1.00},
	]
	for ring in rings:
		ring.r = min(ring.hu, ring.hv)
	return build_loft(rings, ARM_CORNER_SEGS, "y")


# Shoulder (widest, boxy-tailored) -> chest -> tailored waist -> hip ->
# hem flare (the brief's "hem that flares slightly over the trousers") ->
# hem bottom (folds back in a touch, the way a stiff hem edge does). Small
# `r` throughout — this should read as cut cloth panels, not a rounded
# capsule like the limbs. Extra rings vs. the original six give the hem
# flare and waist enough resolution for real cloth-fold displacement
# (radially pushed/pulled per vertex, normals recomputed from the result —
# see build_loft's header) instead of a smooth shell.
func _build_torso() -> ArrayMesh:
	var th: float = OV.TORSO_H
	var rings := [
		{pos = 0.500 * th, hu = 0.185, hv = 0.115, r = 0.045, t = 0.00},
		{pos = 0.440 * th, hu = 0.191, hv = 0.118, r = 0.047, t = 0.06},
		{pos = 0.380 * th, hu = 0.195, hv = 0.120, r = 0.048, t = 0.12},
		{pos = 0.300 * th, hu = 0.200, hv = 0.125, r = 0.050, t = 0.20},
		{pos = 0.220 * th, hu = 0.196, hv = 0.122, r = 0.048, t = 0.28},
		{pos = 0.150 * th, hu = 0.188, hv = 0.118, r = 0.046, t = 0.35},
		{pos = 0.020 * th, hu = 0.172, hv = 0.105, r = 0.042, t = 0.48},
		{pos = -0.050 * th, hu = 0.165, hv = 0.100, r = 0.040, t = 0.55},
		{pos = -0.180 * th, hu = 0.172, hv = 0.105, r = 0.040, t = 0.68},
		{pos = -0.320 * th, hu = 0.185, hv = 0.115, r = 0.040, t = 0.80},
		{pos = -0.430 * th, hu = 0.200, hv = 0.122, r = 0.035, t = 0.88},
		{pos = -0.470 * th, hu = 0.209, hv = 0.127, r = 0.032, t = 0.91},
		{pos = -0.500 * th, hu = 0.215, hv = 0.130, r = 0.030, t = 0.94},
		{pos = -0.580 * th, hu = 0.205, hv = 0.125, r = 0.025, t = 1.00},
	]
	var folds := [
		# Hem-flare gather — where a hanging jacket actually creases, mostly
		# back and sides, kept subtle (a hanging uniform, not a curtain).
		{kind = "ripple", center_t = 0.95, width_t = 0.06, freq = 9.0, amp = 0.006, target_theta = PI / 2.0, sharpness = 1.0},
		{kind = "ripple", center_t = 0.95, width_t = 0.06, freq = 9.0, amp = 0.004, target_theta = -PI / 2.0, sharpness = 1.2, phase = 0.6},
		# Waist gather, back-weighted (the half-belt cinches it a little).
		{kind = "ripple", center_t = 0.55, width_t = 0.08, freq = 7.0, amp = 0.0035, target_theta = PI / 2.0, sharpness = 1.5},
		# Very faint chest drape, all around.
		{kind = "ripple", center_t = 0.20, width_t = 0.10, freq = 5.0, amp = 0.0022},
	]
	return build_loft(rings, TORSO_CORNER_SEGS, "y", folds)


# NEW — a lofted mandarin collar standing off the neck with a front opening,
# replacing the old plain CylinderMesh. Built as an open tube swept around
# an arc (see build_arc_tube's header) that leaves a gap at local -Z
# (front). Sized around NECK_R so it wraps snugly against the neck mesh.
func _build_collar() -> ArrayMesh:
	var nr: float = OV.NECK_R
	var gap := deg_to_rad(24.0)
	return build_arc_tube(0.016, 0.024, 0.008, COLLAR_CORNER_SEGS,
		nr * 1.35, gap, TAU - gap, 26)


# NEW — a half-belt across the back only (real geometry, not a flat box
# wrapped over a now-curved torso — see orderly_visual.gd's trim comment for
# why the old box belt broke). Centered on local +Z (back, per this rig's
# forward convention) and spans roughly 100 degrees of arc.
func _build_half_belt() -> ArrayMesh:
	# build_arc_tube's own theta=0 is local -Z (front, see its header) and
	# increases toward +X then around — so theta=PI is local +Z (back), NOT
	# PI/2 (that would be a side). Center the belt there.
	var half_arc := deg_to_rad(52.0)
	return build_arc_tube(0.014, 0.024, 0.007, BELT_CORNER_SEGS,
		0.118, PI - half_arc, PI + half_arc, 20)


# NEW — a slim, slightly proud ridge running down the lower back centreline,
# standing off the torso's own surface: the folded edge of a back centre
# vent, as real geometry rather than trim. Spans the torso's hip/hem region
# (roughly where a jacket vent actually is) with `cz` bending it to hug the
# torso's own back curve at each height instead of running dead straight.
func _build_back_vent() -> ArrayMesh:
	var th: float = OV.TORSO_H
	# Torso half-depth (hv) at the same heights, +6mm so the ridge sits
	# proud of the surface rather than sinking into it — the exact bug class
	# the old flat hem-band trim caused (see orderly_visual.gd's comment).
	var rings := [
		{pos = -0.050 * th, hu = 0.010, hv = 0.010, r = 0.004, cz = 0.106, t = 0.00},
		{pos = -0.180 * th, hu = 0.010, hv = 0.010, r = 0.004, cz = 0.111, t = 0.26},
		{pos = -0.320 * th, hu = 0.010, hv = 0.010, r = 0.004, cz = 0.121, t = 0.52},
		{pos = -0.430 * th, hu = 0.009, hv = 0.009, r = 0.004, cz = 0.128, t = 0.74},
		{pos = -0.500 * th, hu = 0.008, hv = 0.008, r = 0.003, cz = 0.136, t = 0.87},
		{pos = -0.580 * th, hu = 0.007, hv = 0.007, r = 0.003, cz = 0.131, t = 1.00},
	]
	return build_loft(rings, VENT_CORNER_SEGS, "y")


# Wrist -> back-of-hand -> knuckle row. `r` shrinks toward the knuckle end
# so it reads flatter/more rectangular there (the back of a hand) instead
# of fully cylindrical like the wrist. Extra rings vs. the original three
# give room for a subtle knuckle-row bulge (four small bumps, roughly where
# the finger bases are) instead of a flat knuckle edge.
func _build_palm() -> ArrayMesh:
	var hl: float = OV.HAND_LEN
	var rings := [
		{pos = 0.00 * -hl, hu = 0.028, hv = 0.016, r = 0.014, t = 0.00},
		{pos = 0.16 * -hl, hu = 0.030, hv = 0.017, r = 0.0135, t = 0.16},
		{pos = 0.30 * -hl, hu = 0.033, hv = 0.018, r = 0.013, t = 0.30},
		{pos = 0.46 * -hl, hu = 0.036, hv = 0.019, r = 0.012, t = 0.46},
		{pos = 0.62 * -hl, hu = 0.038, hv = 0.020, r = 0.011, t = 0.62},
		{pos = 0.85 * -hl, hu = 0.040, hv = 0.019, r = 0.009, t = 0.85},
		{pos = 1.00 * -hl, hu = 0.040, hv = 0.018, r = 0.007, t = 1.00},
	]
	var bumps := []
	for i in range(4):
		var th := -1.35 + i * 0.24
		bumps.append({kind = "bump", center_t = 0.92, width_t = 0.10, center_theta = th, width_theta = 0.13, amp = 0.0035})
	return build_loft(rings, PALM_CORNER_SEGS, "y", bumps)


# Base -> knuckle-joint bulge -> mid -> tip. One mesh reused
# (mirrored/scaled by the caller) for all four fingers and the thumb. `cz`
# grows toward the tip, bending the whole loft forward (local -Z) — a slight
# resting curl, per the brief's "close to camera during a catch" note —
# instead of the perfectly straight capsule the original had.
func _build_finger() -> ArrayMesh:
	var fl: float = OV.FINGER_LEN
	var rings := [
		{pos = 0.00 * -fl, hu = 0.0100, hv = 0.0100, r = 999.0, t = 0.00, cz = 0.000},
		{pos = 0.12 * -fl, hu = 0.0107, hv = 0.0107, r = 999.0, t = 0.12, cz = -0.001},
		{pos = 0.22 * -fl, hu = 0.0112, hv = 0.0112, r = 999.0, t = 0.22, cz = -0.003},
		{pos = 0.36 * -fl, hu = 0.0095, hv = 0.0095, r = 999.0, t = 0.36, cz = -0.006},
		{pos = 0.50 * -fl, hu = 0.0078, hv = 0.0078, r = 999.0, t = 0.50, cz = -0.009},
		{pos = 0.64 * -fl, hu = 0.0069, hv = 0.0069, r = 999.0, t = 0.64, cz = -0.012},
		{pos = 0.78 * -fl, hu = 0.0060, hv = 0.0060, r = 999.0, t = 0.78, cz = -0.016},
		{pos = 1.00 * -fl, hu = 0.0040, hv = 0.0040, r = 999.0, t = 1.00, cz = -0.022},
	]
	for ring in rings:
		ring.r = min(ring.hu, ring.hv)
	return build_loft(rings, FINGER_CORNER_SEGS, "y")


# Swept along Z (front/back — local -Z is forward, matching the whole
# visual rig's convention, see orderly_visual.gd's coordinate note). Heel
# (tall, narrow) -> ankle -> instep -> toe start -> rounded toe tip. Extra
# rings vs. the original five for a smoother roll from heel to toe.
func _build_shoe() -> ArrayMesh:
	var rings := [
		{pos = 0.125, hu = 0.050, hv = 0.040, r = 0.018},
		{pos = 0.102, hu = 0.051, hv = 0.043, r = 0.0185},
		{pos = 0.080, hu = 0.052, hv = 0.045, r = 0.019},
		{pos = 0.055, hu = 0.053, hv = 0.048, r = 0.020},
		{pos = 0.010, hu = 0.052, hv = 0.046, r = 0.019},
		{pos = -0.015, hu = 0.050, hv = 0.044, r = 0.018},
		{pos = -0.050, hu = 0.048, hv = 0.038, r = 0.019},
		{pos = -0.085, hu = 0.045, hv = 0.032, r = 0.020},
		{pos = -0.100, hu = 0.040, hv = 0.028, r = 0.019},
		{pos = -0.110, hu = 0.032, hv = 0.023, r = 0.017},
		{pos = -0.130, hu = 0.020, hv = 0.015, r = 0.013},
	]
	return build_loft(rings, SHOE_CORNER_SEGS, "z")


# NEW — replaces the primitive SphereMesh head with a custom latitude loft
# (a UV-sphere is exactly a loft: a circular profile whose radius follows
# cos(latitude), stacked along Y — the same primitive this whole generator
# already builds, just with the radius sequence of a sphere), so facial
# detail can be baked in as "bump" displacement instead of separate
# geometry. Radius is clamped to a small minimum instead of hitting zero at
# the poles, so the polar caps are small flat fans rather than degenerate
# points — visually indistinguishable from a true pole at this scale.
# All features are SUGGESTED per the brief: sunken sockets, a faint brow
# ridge, faint cheekbone planes, a faint nose ridge, a closed mouth line —
# kept to a millimetre or two of displacement on a 120mm-radius head so
# the read stays "uncanny, waxy, underdetailed", not sculpted.
# ring_t convention: 0 = chin/underside pole, 1 = crown pole.
func _build_head() -> ArrayMesh:
	var r: float = OV.HEAD_R
	var n := 24
	var rings: Array = []
	for i in range(n):
		var t := float(i) / float(n - 1)
		var phi := -PI / 2.0 + PI * t
		var rad: float = maxf(r * cos(phi), r * 0.025)
		var y: float = r * sin(phi)
		rings.append({pos = y, hu = rad, hv = rad, r = rad, t = t})

	const FRONT := -PI / 2.0
	var bands := [
		# Faint brow ridge.
		{kind = "bump", center_t = 0.66, width_t = 0.05, center_theta = FRONT, width_theta = 0.85, amp = 0.006},
		# Sunken, closed eye sockets, either side of the brow.
		{kind = "bump", center_t = 0.605, width_t = 0.045, center_theta = FRONT - 0.34, width_theta = 0.20, amp = -0.007},
		{kind = "bump", center_t = 0.605, width_t = 0.045, center_theta = FRONT + 0.34, width_theta = 0.20, amp = -0.007},
		# Faint nose ridge — tall and angularly narrow, so it reads as a
		# vertical line rather than a round bump.
		{kind = "bump", center_t = 0.55, width_t = 0.13, center_theta = FRONT, width_theta = 0.12, amp = 0.008},
		# Faint cheekbone planes, between the nose and the temple.
		{kind = "bump", center_t = 0.50, width_t = 0.11, center_theta = FRONT - 0.95, width_theta = 0.34, amp = 0.004},
		{kind = "bump", center_t = 0.50, width_t = 0.11, center_theta = FRONT + 0.95, width_theta = 0.34, amp = 0.004},
		# Closed mouth line — thin and sunken, not a modelled opening.
		{kind = "bump", center_t = 0.30, width_t = 0.020, center_theta = FRONT, width_theta = 0.30, amp = -0.004},
		# Hollow temples, either side, per the file's own silhouette note.
		{kind = "bump", center_t = 0.635, width_t = 0.08, center_theta = 0.0, width_theta = 0.40, amp = -0.006},
		{kind = "bump", center_t = 0.635, width_t = 0.08, center_theta = PI, width_theta = 0.40, amp = -0.006},
	]
	return build_loft(rings, HEAD_CORNER_SEGS, "y", bands)
