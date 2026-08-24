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
#   3. Per-triangle winding is resolved automatically: build the triangle,
#      compare its geometric normal against the intended outward normal,
#      and flip the vertex order so the result matches GODOT'S front-face
#      convention. That means callers never have to reason about winding by
#      hand. NOTE the convention is the opposite of what reads as intuitive
#      — see the long comment in _emit_tri. gen_bevel_meshes.gd's add_tri
#      still uses the intuitive-but-inverted test, so the fixture meshes it
#      bakes are inside-out too; harmless there for the same reason it was
#      harmless here (closed convex shapes, no front/back-dependent
#      shading), but worth fixing if a fixture ever grows a face-like
#      material.
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
	_write("wrist", _build_wrist())
	_write("torso", _build_torso())
	_write("collar", _build_collar())
	_write("back_vent", _build_back_vent())
	_write("half_belt", _build_half_belt())
	_write("palm", _build_palm())
	_write("finger", _build_finger())
	_write("shoe", _build_shoe())
	_write("head", _build_head())

	quit()


# BINARY .res, not text .tres — this is the single biggest lever on the web
# build's .pck size (see this file's regeneration report). SurfaceTool-built
# ArrayMeshes serialize their vertex arrays as PackedFloat32Array etc., which
# .tres writes out as a giant literal float list (~60+ bytes/vertex in text);
# .res stores the same PackedArrays as raw binary, ~5-10x smaller on disk for
# mesh-heavy resources like these. Old stale .tres files are NOT auto-deleted
# here (Godot doesn't like scripts touching files mid-import); the export
# preset uses export_filter="all_resources", so leftover .tres would still
# get bundled into the .pck for nothing — delete orderly/meshes/*.tres by
# hand after regenerating (see the report for the exact command used).
func _write(part_name: String, mesh: ArrayMesh) -> void:
	var path := "%s/%s.res" % [OUT_DIR, part_name]
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


# TRUE ellipse cross-section — positions ON the ellipse boundary, analytic
# outward normal from the ellipse's own implicit-gradient direction
# (x/hu^2, y/hv^2), normalized. This is the fix for the form problem the
# design brief flags: `rounded_rect_profile` with r clamped to min(hu,hv)
# (the pattern every anatomical part used to use for "fully round") produces
# a STADIUM — two semicircular caps of radius min(hu,hv) joined by straight
# edges along the longer axis, whenever hu != hv. A stadium's curvature is
# either exactly 0 (the straight edge) or exactly 1/r (the cap) — it never
# grades smoothly the way a real limb, torso or palm cross-section does, so
# even at high tessellation it still reads as an extruded/swept slab. A true
# ellipse's curvature varies continuously around the loop instead, which is
# what actually reads as "round" rather than "rounded-rectangular."
# `segs` = total ring point count (pass corner_segs*4 from call sites that
# used to feed rounded_rect_profile, so switching a part's profile never
# changes its own or an adjoining part's vertex count / triangle budget).
static func ellipse_profile(half_u: float, half_v: float, segs: int) -> Array:
	var positions: Array[Vector2] = []
	var normals: Array[Vector2] = []
	var hu: float = maxf(half_u, 0.0001)
	var hv: float = maxf(half_v, 0.0001)
	for i in range(segs):
		var a := TAU * float(i) / float(segs)
		var c := cos(a)
		var s := sin(a)
		positions.append(Vector2(hu * c, hv * s))
		normals.append(Vector2(c / hu, s / hv).normalized())
	return [positions, normals]


# Dispatches to ellipse_profile when a ring's `r` is negative (the sentinel
# every anatomical ring below now uses — see the file header's technique
# note) and to the old rounded_rect_profile otherwise (still used by trim
# that should read as cut/folded cloth rather than anatomy: the collar,
# half-belt and back-vent arc tubes, and the shoe).
static func profile_for(half_u: float, half_v: float, r: float, corner_segs: int) -> Array:
	if r < 0.0:
		return ellipse_profile(half_u, half_v, corner_segs * 4)
	return rounded_rect_profile(half_u, half_v, r, corner_segs)


# --- winding-safe smooth triangle/quad emission -------------------------

static func _emit_tri(st: SurfaceTool, p0: Vector3, p1: Vector3, p2: Vector3,
		n0: Vector3, n1: Vector3, n2: Vector3, ref_n: Vector3) -> void:
	var pts := [p0, p1, p2]
	var nrms := [n0, n1, n2]
	# WINDING CONVENTION — do not "fix" this comparison back to `< 0.0`.
	# Godot treats a triangle as FRONT-facing when (p1-p0)x(p2-p0) points
	# INWARD by this test (clockwise as seen from outside). Measured
	# directly against the engine's own primitives: SphereMesh,
	# CylinderMesh and BoxMesh all come out 0% "outward" under exactly this
	# cross-product test. So winding the geometric normal to AGREE with the
	# outward vertex normal — which is what this did originally — is
	# precisely backwards, and gets the surface facing the camera culled.
	#
	# That bug was invisible for a long time because an inside-out CLOSED
	# CONVEX loft still rasterises its far inner wall, so the limbs, torso
	# and shoe looked plausible. The head is the only part with
	# FRONT/BACK-dependent shading (suggested face on -Z vs cranial seam on
	# +Z), so when it stopped being a Godot SphereMesh and became a loft
	# like everything else, it was the first part where culling the near
	# surface actually showed: a blank, seamed dome where the face belongs.
	var geo_n := (p1 - p0).cross(p2 - p0)
	if geo_n.dot(ref_n) > 0.0:
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
		var prof: Array = profile_for(ring.hu, ring.hv, ring.r, corner_segs)
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

# CUT HARD FROM 72/68/90/60/42/56/34/30/22/86, and the reasoning matters
# because the previous values were not arbitrary either — they were raised
# deliberately once cross-sections became true ellipses, described as
# "budget-generous per the brief". They were generous against a QUALITY brief.
# They were never measured against the WEB one, and this game ships to WebGL.
#
# What the measurement said. One of each part came to 99,328 tris; with the
# duplicated parts (2 arms, 2 legs, 10 fingers, 2 shoes) an instance was
# ~155,000 — and room 12 spawns THREE orderlies. The head alone was 38,528
# tris for a deliberately FEATURELESS ovoid, and the ten fingers together
# were ~27,000. For scale, the entire 458-mesh prop kit is 33,000.
#
# What the renders said. In the dark-ward reference shot the whole figure
# occupies roughly 60x250 pixels — about ten triangles per pixel. Even the
# debug head close-up, far tighter than any gameplay view, puts the head at
# ~400px: at 40 segments a 200px-radius silhouette has a sagitta error of
# 200*(1-cos(180/40 deg)) ~= 0.6px, i.e. invisible. At the old 86 it was
# 0.13px — precision spent an order of magnitude below the display.
#
# So each part is now tessellated for the size it actually occupies: the head
# and torso keep enough for a clean silhouette at the closest camera the game
# has, and the fingers — which are never more than a few pixels wide — drop to
# an octagon. Smooth shading does the rest; these are lofts with per-vertex
# normals, so tessellation only ever showed on the SILHOUETTE, never on the
# shading.
const LEG_CORNER_SEGS := 24
const ARM_CORNER_SEGS := 24
const TORSO_CORNER_SEGS := 36
const PALM_CORNER_SEGS := 18
const FINGER_CORNER_SEGS := 8
const SHOE_CORNER_SEGS := 20
const COLLAR_CORNER_SEGS := 18
const BELT_CORNER_SEGS := 16
const VENT_CORNER_SEGS := 12
const HEAD_CORNER_SEGS := 40


# Hip -> UPPER-THIGH BULGE -> lower-thigh -> knee. Cleaner material (less
# grime) than the shin, per the original two-material split. The hip ring is
# deliberately slimmer than the bulge peak just below it (0.090 -> 0.099 ->
# taper), not a monotonic taper from the widest point straight to the knee —
# a real thigh has real muscle mass a hand's-width down from the hip, not at
# the hip joint itself. Matches the brief's "volume change along the
# length" note (this was previously the one limb with no bulge at all — the
# calf already had one, see leg_shin below).
func _build_leg_thigh() -> ArrayMesh:
	var h: float = OV.LEG_H
	var rings := [
		{pos = 0.00 * -h, hu = 0.090, hv = 0.074, r = 999.0, t = 0.00},
		{pos = 0.05 * -h, hu = 0.096, hv = 0.079, r = 999.0, t = 0.07},
		{pos = 0.10 * -h, hu = 0.099, hv = 0.081, r = 999.0, t = 0.13},
		{pos = 0.16 * -h, hu = 0.094, hv = 0.077, r = 999.0, t = 0.21},
		{pos = 0.24 * -h, hu = 0.085, hv = 0.071, r = 999.0, t = 0.33},
		{pos = 0.32 * -h, hu = 0.075, hv = 0.064, r = 999.0, t = 0.46},
		{pos = 0.40 * -h, hu = 0.067, hv = 0.059, r = 999.0, t = 0.64},
		{pos = 0.46 * -h, hu = 0.062, hv = 0.056, r = 999.0, t = 0.86},
		{pos = 0.50 * -h, hu = 0.060, hv = 0.055, r = 999.0, t = 1.00},
	]
	for ring in rings:
		ring.r = -1.0  # true ellipse — see profile_for/ellipse_profile's header
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
		ring.r = -1.0  # true ellipse — see profile_for/ellipse_profile's header
	var folds := [
		# Crease just below the knee, back-weighted — a continuation of the
		# thigh's fold so the seam between the two meshes doesn't read as a
		# sudden cutoff.
		{kind = "ripple", center_t = 0.06, width_t = 0.08, freq = 8.0, amp = 0.003, target_theta = PI / 2.0, sharpness = 1.5},
		# Ankle-cuff gather where the trouser leg breaks over the shoe.
		{kind = "ripple", center_t = 0.97, width_t = 0.05, freq = 10.0, amp = 0.0025},
	]
	return build_loft(rings, LEG_CORNER_SEGS, "y", folds)


# Shoulder -> BICEP SWELL -> taper -> elbow. Same "volume change along the
# length" fix as leg_thigh: the shoulder-end ring is slimmer than the bulge
# peak a hand's-width below it, instead of the old monotonic 0.050->0.032
# taper that read as a uniform tube tacked onto the shoulder.
func _build_arm_upper() -> ArrayMesh:
	var l: float = OV.ARM_LEN
	var rings := [
		{pos = 0.00 * -l, hu = 0.048, hv = 0.046, r = 999.0, t = 0.00},
		{pos = 0.05 * -l, hu = 0.050, hv = 0.048, r = 999.0, t = 0.07},
		{pos = 0.10 * -l, hu = 0.053, hv = 0.050, r = 999.0, t = 0.14},
		{pos = 0.16 * -l, hu = 0.054, hv = 0.051, r = 999.0, t = 0.22},
		{pos = 0.24 * -l, hu = 0.049, hv = 0.046, r = 999.0, t = 0.34},
		{pos = 0.32 * -l, hu = 0.042, hv = 0.039, r = 999.0, t = 0.48},
		{pos = 0.40 * -l, hu = 0.036, hv = 0.033, r = 999.0, t = 0.66},
		{pos = 0.46 * -l, hu = 0.033, hv = 0.031, r = 999.0, t = 0.86},
		{pos = 0.50 * -l, hu = 0.032, hv = 0.030, r = 999.0, t = 1.00},
	]
	for ring in rings:
		ring.r = -1.0  # true ellipse — see profile_for/ellipse_profile's header
	var folds := [
		# Inner-elbow crease as the sleeve nears the joint.
		{kind = "ripple", center_t = 0.92, width_t = 0.09, freq = 7.0, amp = 0.003, target_theta = PI / 2.0, sharpness = 1.6},
	]
	return build_loft(rings, ARM_CORNER_SEGS, "y", folds)


# Shortened to end at 0.97*-l instead of 1.00*-l (was flush with the wrist/
# hand attach point) — see _build_wrist below for why: the sleeve now ends
# a few centimetres short of the hand, exposing a short bare-skin wrist
# instead of the cloth cuff fusing directly into the glove-like palm mesh.
# That gap (different mesh, different material, a visible step down in
# radius) is the brief's "jacket should drape away... at cuffs" cue, done
# the way a real sleeve actually achieves it (ending before the hand)
# rather than as a literal hollow air-gap shell.
func _build_arm_cuff() -> ArrayMesh:
	var l: float = OV.ARM_LEN
	var rings := [
		{pos = 0.500 * -l, hu = 0.032, hv = 0.030, r = 999.0, t = 0.00},
		{pos = 0.575 * -l, hu = 0.037, hv = 0.035, r = 999.0, t = 0.16},
		{pos = 0.641 * -l, hu = 0.038, hv = 0.036, r = 999.0, t = 0.30},
		{pos = 0.688 * -l, hu = 0.036, hv = 0.034, r = 999.0, t = 0.39},
		{pos = 0.726 * -l, hu = 0.033, hv = 0.031, r = 999.0, t = 0.48},
		{pos = 0.801 * -l, hu = 0.030, hv = 0.028, r = 999.0, t = 0.64},
		{pos = 0.885 * -l, hu = 0.027, hv = 0.025, r = 999.0, t = 0.82},
		{pos = 0.932 * -l, hu = 0.025, hv = 0.023, r = 999.0, t = 0.92},
		{pos = 0.970 * -l, hu = 0.024, hv = 0.022, r = 999.0, t = 1.00},
	]
	for ring in rings:
		ring.r = -1.0  # true ellipse — see profile_for/ellipse_profile's header
	var folds := [
		{kind = "ripple", center_t = 0.05, width_t = 0.07, freq = 7.0, amp = 0.0025, target_theta = PI / 2.0, sharpness = 1.6},
	]
	return build_loft(rings, ARM_CORNER_SEGS, "y", folds)


# NEW — a short, slightly larger-radius flare right at the (now shortened)
# cuff end, folding back over the cuff proper like a turned-up sleeve hem.
# Baked in the SAME absolute pivot-local space as arm_cuff (see the
# file-header coordinate note) so it needs no extra offset. Repositioned to
# sit at arm_cuff's new 0.970*-l end (was 1.000*-l) — same relative position
# within the cuff's own span, just shorter along with it.
func _build_cuff_turnback() -> ArrayMesh:
	var l: float = OV.ARM_LEN
	var end_hu := 0.024
	var end_hv := 0.022
	var rings := [
		{pos = 0.9277 * -l, hu = end_hu * 0.92, hv = end_hv * 0.92, r = 999.0, t = 0.00},
		{pos = 0.9493 * -l, hu = end_hu * 1.38, hv = end_hv * 1.38, r = 999.0, t = 0.45},
		{pos = 0.9700 * -l, hu = end_hu * 1.08, hv = end_hv * 1.08, r = 999.0, t = 1.00},
	]
	for ring in rings:
		ring.r = -1.0  # true ellipse — see profile_for/ellipse_profile's header
	return build_loft(rings, ARM_CORNER_SEGS, "y")


# NEW — bare wrist, bridging the shortened cuff/turnback (see above, ends at
# 0.970*-l) to the hand attach point at 1.000*-l. Skin-material, ellipse
# cross-section shrinking slightly then flaring to match MESH_PALM's own
# first ring exactly (hu=0.028, hv=0.016 — see _build_palm) so the wrist
# joins the palm with no visible step, the same "shared terminal ring"
# convention leg_thigh/leg_shin use at the knee. This is what actually reads
# as "sleeve drapes, doesn't fuse into the hand": a different material and a
# real taper change, not just a coincident seam.
func _build_wrist() -> ArrayMesh:
	var l: float = OV.ARM_LEN
	var rings := [
		{pos = 0.970 * -l, hu = 0.0221, hv = 0.0202, r = 999.0, t = 0.00},
		{pos = 0.985 * -l, hu = 0.0250, hv = 0.0180, r = 999.0, t = 0.50},
		{pos = 1.000 * -l, hu = 0.0280, hv = 0.0160, r = 999.0, t = 1.00},
	]
	for ring in rings:
		ring.r = -1.0  # true ellipse — see profile_for/ellipse_profile's header
	return build_loft(rings, ARM_CORNER_SEGS, "y")


# Neck-base blend -> shoulder (widest) -> chest -> tailored waist -> hip ->
# hem flare (the brief's "hem that flares slightly over the trousers") ->
# recessed hem ledge (an overhang/undercut, not a flat closed bottom — see
# below). Now a TRUE ELLIPSE throughout (r = -1.0 — see profile_for's
# header), replacing the old small-radius rounded-rect "tailored cloth
# panel" look per the brief's "a torso is a wide flattened ellipse, not a
# slab with radiused corners"; the tailored-cut read now comes entirely
# from the placket/collar/belt/vent trim in orderly_visual.gd, not from the
# body's own cross-section.
#
# THREE NEW top rings (0.560th/0.610th/0.648th) extend the loft above the
# old flat shoulder plateau and taper it down toward the neck cylinder's own
# radius (NECK_R=0.05) instead of stopping dead at shoulder width — the
# brief's "shoulder line should slope and the neck should JOIN the torso,
# not sit on it." orderly_visual.gd's neck_pivot is still anchored at the
# OLD shoulder height (0.500*th, now mid-slope rather than the tip), so the
# neck cylinder's own base is hidden inside this taper and only emerges
# where the taper has shrunk below the neck's own radius — a real blend,
# not a second seam.
#
# Hem: the old single flare-then-slightly-narrower-cap read as a flat
# closed bottom flush with the widest point. The last two rings now pull
# in sharply (-0.545th) before closing (-0.580th), so the flare rim
# overhangs what's below it — an eave that reads as the hem hanging away
# from the body rather than terminating flush against it (the honest
# single-shell approximation of "drape with an air gap"; a literal open
# hollow hem was considered and rejected as a manifold-hole risk from
# below/three-quarter angles — see this file's regeneration report).
func _build_torso() -> ArrayMesh:
	var th: float = OV.TORSO_H
	var rings := [
		{pos = 0.648 * th, hu = 0.050, hv = 0.048, r = -1.0, t = 0.000},
		{pos = 0.610 * th, hu = 0.082, hv = 0.062, r = -1.0, t = 0.020},
		{pos = 0.560 * th, hu = 0.132, hv = 0.090, r = -1.0, t = 0.040},
		{pos = 0.500 * th, hu = 0.185, hv = 0.115, r = -1.0, t = 0.060},
		{pos = 0.440 * th, hu = 0.191, hv = 0.118, r = -1.0, t = 0.116},
		{pos = 0.380 * th, hu = 0.195, hv = 0.120, r = -1.0, t = 0.173},
		{pos = 0.300 * th, hu = 0.200, hv = 0.125, r = -1.0, t = 0.248},
		{pos = 0.220 * th, hu = 0.196, hv = 0.122, r = -1.0, t = 0.323},
		{pos = 0.150 * th, hu = 0.188, hv = 0.118, r = -1.0, t = 0.389},
		{pos = 0.020 * th, hu = 0.172, hv = 0.105, r = -1.0, t = 0.511},
		{pos = -0.050 * th, hu = 0.165, hv = 0.100, r = -1.0, t = 0.577},
		{pos = -0.180 * th, hu = 0.172, hv = 0.105, r = -1.0, t = 0.699},
		{pos = -0.320 * th, hu = 0.185, hv = 0.115, r = -1.0, t = 0.812},
		{pos = -0.430 * th, hu = 0.200, hv = 0.122, r = -1.0, t = 0.887},
		{pos = -0.470 * th, hu = 0.209, hv = 0.127, r = -1.0, t = 0.915},
		{pos = -0.500 * th, hu = 0.215, hv = 0.130, r = -1.0, t = 0.944},
		{pos = -0.545 * th, hu = 0.150, hv = 0.095, r = -1.0, t = 0.970},
		{pos = -0.580 * th, hu = 0.140, hv = 0.090, r = -1.0, t = 1.000},
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
	# Last ring's cz updated for the new recessed hem ledge in _build_torso
	# (hv there dropped from 0.125 to 0.090 when the hem gained its
	# overhang/undercut) — kept in sync or the vent ridge would jut out
	# ~35mm past the new, narrower hem surface instead of the intended 6mm.
	var rings := [
		{pos = -0.050 * th, hu = 0.010, hv = 0.010, r = 0.004, cz = 0.106, t = 0.00},
		{pos = -0.180 * th, hu = 0.010, hv = 0.010, r = 0.004, cz = 0.111, t = 0.26},
		{pos = -0.320 * th, hu = 0.010, hv = 0.010, r = 0.004, cz = 0.121, t = 0.52},
		{pos = -0.430 * th, hu = 0.009, hv = 0.009, r = 0.004, cz = 0.128, t = 0.74},
		{pos = -0.500 * th, hu = 0.008, hv = 0.008, r = 0.003, cz = 0.136, t = 0.87},
		{pos = -0.580 * th, hu = 0.007, hv = 0.007, r = 0.003, cz = 0.096, t = 1.00},
	]
	return build_loft(rings, VENT_CORNER_SEGS, "y")


# Wrist -> back-of-hand -> knuckle row. `r` shrinks toward the knuckle end
# so it reads flatter/more rectangular there (the back of a hand) instead
# of fully cylindrical like the wrist. Extra rings vs. the original three
# give room for a subtle knuckle-row bulge (four small bumps, roughly where
# the finger bases are) instead of a flat knuckle edge.
# NOW a true ellipse (r = -1.0 throughout, see profile_for's header) instead
# of a small-radius rounded rect — the brief's literal "the palm is a slab."
# Two new asymmetric bump bands added below the existing knuckle row: a
# THENAR bulge (thumb-base muscle, local +X — see _build_hand's thumb at
# positive X) and a smaller HYPOTHENAR ridge on the opposite (pinky, -X)
# edge, both lower on the palm than the knuckles (center_t ~0.2-0.35 vs the
# knuckle row's 0.92) — real anatomy, not a flat plane between wrist and
# fingers.
func _build_palm() -> ArrayMesh:
	var hl: float = OV.HAND_LEN
	var rings := [
		{pos = 0.00 * -hl, hu = 0.028, hv = 0.016, r = -1.0, t = 0.00},
		{pos = 0.16 * -hl, hu = 0.030, hv = 0.017, r = -1.0, t = 0.16},
		{pos = 0.30 * -hl, hu = 0.033, hv = 0.018, r = -1.0, t = 0.30},
		{pos = 0.46 * -hl, hu = 0.036, hv = 0.019, r = -1.0, t = 0.46},
		{pos = 0.62 * -hl, hu = 0.038, hv = 0.020, r = -1.0, t = 0.62},
		{pos = 0.85 * -hl, hu = 0.040, hv = 0.019, r = -1.0, t = 0.85},
		{pos = 1.00 * -hl, hu = 0.040, hv = 0.018, r = -1.0, t = 1.00},
	]
	var bumps := [
		# Thenar eminence — thumb-base bulge, +X edge.
		{kind = "bump", center_t = 0.34, width_t = 0.16, center_theta = 0.0, width_theta = 0.55, amp = 0.006},
		# Hypothenar edge — smaller ulnar-side ridge, -X edge, a bit higher
		# (closer to the wrist) than the thenar bulge.
		{kind = "bump", center_t = 0.22, width_t = 0.14, center_theta = PI, width_theta = 0.45, amp = 0.0035},
	]
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
		ring.r = -1.0  # true ellipse — see profile_for/ellipse_profile's header
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
	var n := 56
	var rings: Array = []
	for i in range(n):
		var t := float(i) / float(n - 1)
		var phi := -PI / 2.0 + PI * t
		var rad: float = maxf(r * cos(phi), r * 0.025)
		var y: float = r * sin(phi)
		# Cranium/jaw asymmetry — "a skull is not an egg" (brief). A pure
		# UV-sphere (uniform rad every direction, both poles identical) is
		# exactly an egg: same curvature logic top and bottom. Break hu
		# (left-right) and hv (front-back) apart from the sphere's shared
		# `rad` in two bands instead: a fuller, slightly rearward-shifted
		# CRANIUM in the upper third (bigger brain-case behind the face
		# rather than a dome that's round in every direction), and a
		# narrower, front-back-flattened JAW in the lower third (a chin
		# tapers toward a ridge, not a round pole). `cz` (already supported
		# by build_loft as a per-ring bend, see the header) shifts the whole
		# ring off-axis so the cranium sits a touch further back and the
		# chin tucks a touch further forward — still only a few mm on a
		# 120mm head, the same "suggested not sculpted" budget the bump
		# bands below already use.
		var hu := rad
		var hv := rad
		var cz := 0.0
		if t > 0.58:
			var ct: float = clampf((t - 0.58) / 0.34, 0.0, 1.0)
			var cranium: float = sin(ct * PI)  # 0 at 0.58 and 0.92, peaks mid-cranium
			hv *= 1.0 + 0.16 * cranium
			hu *= 1.0 + 0.05 * cranium
			cz += 0.010 * cranium
		elif t < 0.36:
			var jt: float = clampf(1.0 - t / 0.36, 0.0, 1.0)  # 1 at chin, 0 at jaw hinge
			hv *= 1.0 - 0.22 * jt
			hu *= 1.0 - 0.10 * jt
			cz -= 0.006 * jt
		rings.append({pos = y, hu = hu, hv = hv, r = -1.0, cz = cz, t = t})

	const FRONT := -PI / 2.0
	var bands := [
		# Faint brow ridge.
		{kind = "bump", center_t = 0.66, width_t = 0.05, center_theta = FRONT, width_theta = 0.85, amp = 0.006},
		# Sunken, closed eye sockets, either side of the brow.
		# 2026-08 concept-sheet polish pass: -0.007 -> -0.0035. This geometric
		# dip self-shadows on top of orderly_body.gdshader's own socket tint
		# (see that shader's matching comment) — at -0.007 the two effects
		# compounded into a pair of crisp dark discs that read as literal
		# eyeballs on a "featureless... no eyes" head. Halved so the sunken
		# suggestion survives without doing the shader's job twice.
		{kind = "bump", center_t = 0.605, width_t = 0.045, center_theta = FRONT - 0.34, width_theta = 0.20, amp = -0.0035},
		{kind = "bump", center_t = 0.605, width_t = 0.045, center_theta = FRONT + 0.34, width_theta = 0.20, amp = -0.0035},
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
