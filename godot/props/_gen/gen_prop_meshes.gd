# One-off generator: bakes every procedural prop mesh named by
# props/_gen/mesh_specs.json into props/meshes/<key>.tres.
#
# WHY A JSON SPEC RATHER THAN A TABLE IN THIS FILE.
# props/_gen/prop_defs.py is the single source of truth for the prop kit: it
# declares each prop as a list of parts, and every part names a primitive with
# its exact dimensions. Deriving the mesh list from those declarations is what
# guarantees that a chair leg used four times — and a cabinet foot that happens
# to be the same cylinder — bake ONE shared mesh, reused by uid. Hand-keeping a
# second copy of that list here would let the two drift; that is a bug
# fixtures/_gen/gen_bevel_meshes.gd's hardcoded table can already hit today, and
# this generator deliberately does not repeat it.
#
# Regenerate with (IN THIS ORDER — the JSON must exist before the bake):
#	python3 props/_gen/gen_props.py
#	godot --headless --path . --script res://props/_gen/gen_prop_meshes.gd
#
# Everything here is flat/smooth-shaded positions+normals only: no tangents, no
# UVs. Nothing in the prop kit uses a normal map, and Compatibility (the
# renderer this project ships, see MIGRATION_NOTES) is happiest with the
# smallest vertex format that draws.
extends SceneTree

const SPEC_PATH := "res://props/_gen/mesh_specs.json"
const OUT_DIR := "res://props/meshes"


func _initialize() -> void:
	var f := FileAccess.open(SPEC_PATH, FileAccess.READ)
	if f == null:
		push_error("cannot read %s — run `python3 props/_gen/gen_props.py` first" % SPEC_PATH)
		quit(1)
		return
	var specs: Variant = JSON.parse_string(f.get_as_text())
	f.close()
	if typeof(specs) != TYPE_DICTIONARY:
		push_error("%s is not a JSON object" % SPEC_PATH)
		quit(1)
		return

	DirAccess.make_dir_recursive_absolute(OUT_DIR)

	var keys := (specs as Dictionary).keys()
	keys.sort()
	var total := 0
	for key in keys:
		var s: Dictionary = specs[key]
		var mesh := build(s)
		if mesh == null:
			push_error("unknown primitive type %r for %s" % [s.get("type"), key])
			quit(1)
			return
		var path := "%s/%s.tres" % [OUT_DIR, key]
		var err := ResourceSaver.save(mesh, path)
		if err != OK:
			push_error("failed to save %s: %d" % [path, err])
			quit(1)
			return
		var tris := mesh.get_faces().size() / 3
		total += tris
		print("wrote %s (%d tris)" % [path, tris])

	# PRUNE anything the spec no longer names. Without this the directory is a
	# union of every mesh size that has ever existed, not a function of
	# prop_defs.py: resizing one part leaves the old resource behind, it gets
	# committed, and nothing references it. Two orphans (an 18mm troffer diffuser
	# and a 90mm housing) were caught exactly this way. Pruning is also what lets
	# tools/check_roundtrip.sh treat props/ as generated output.
	var wanted := {}
	for key in keys:
		wanted[String(key) + ".tres"] = true
	var dir := DirAccess.open(OUT_DIR)
	var pruned := 0
	if dir != null:
		for found in dir.get_files():
			if found.ends_with(".tres") and not wanted.has(found):
				if DirAccess.remove_absolute("%s/%s" % [OUT_DIR, found]) == OK:
					print("pruned orphan %s" % found)
					pruned += 1

	print("baked %d prop meshes, %d tris total, pruned %d orphan(s)"
		% [keys.size(), total, pruned])
	quit()


func build(s: Dictionary) -> ArrayMesh:
	match str(s.get("type", "")):
		"box":
			return build_box(vec3(s["size"]), float(s["bevel"]))
		"cyl":
			return build_cyl(float(s["r"]), float(s["h"]), int(s["segs"]), float(s["bevel"]))
		"tube":
			return build_tube(float(s["r_out"]), float(s["r_in"]), float(s["h"]), int(s["segs"]))
		"taper":
			return build_taper(float(s["r_bot"]), float(s["r_top"]), float(s["h"]), int(s["segs"]))
		"frame":
			return build_frame(float(s["w"]), float(s["h"]), float(s["border"]),
				float(s["depth"]), float(s["bevel"]))
		"slats":
			return build_slats(float(s["w"]), float(s["h"]), float(s["d"]),
				int(s["count"]), float(s["tilt"]), float(s["fill"]))
	return null


func vec3(a: Variant) -> Vector3:
	return Vector3(float(a[0]), float(a[1]), float(a[2]))


# --- winding -----------------------------------------------------------------
# WINDING CONVENTION — do not "fix" this to `< 0.0`. Lifted verbatim from
# fixtures/_gen/gen_bevel_meshes.gd, including the reasoning: Godot treats a
# triangle as FRONT-facing when (b-a)x(c-a) points INWARD by this test, so
# winding to AGREE with the outward normal builds every mesh inside-out. That
# error hides on closed convex shapes (the far inner wall still rasterises and
# looks plausible) and only shows on parts with front/back-dependent shading.
# Measured there against the engine's own primitives: BoxMesh, SphereMesh and
# CylinderMesh all score 0% "outward" by this test.
func add_tri_n(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3,
		na: Vector3, nb: Vector3, nc: Vector3) -> void:
	var face := (na + nb + nc) / 3.0
	var pts := [a, b, c]
	var nrm := [na, nb, nc]
	if ((b - a).cross(c - a)).dot(face) > 0.0:
		pts = [a, c, b]
		nrm = [na, nc, nb]
	for i in 3:
		st.set_normal(nrm[i])
		st.add_vertex(pts[i])


func add_tri(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, n: Vector3) -> void:
	add_tri_n(st, a, b, c, n, n, n)


func add_quad_n(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, d: Vector3,
		na: Vector3, nb: Vector3, nc: Vector3, nd: Vector3) -> void:
	add_tri_n(st, a, b, c, na, nb, nc)
	add_tri_n(st, a, c, d, na, nc, nd)


func add_quad(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, d: Vector3, n: Vector3) -> void:
	add_quad_n(st, a, b, c, d, n, n, n, n)


# --- primitives --------------------------------------------------------------
# A chamfered box. Real manufactured panels are not perfect 90-degree solids and
# BoxMesh has no bevel option, so this builds 6 shrunk main faces + 12 edge
# facets + 8 corner triangles (~44 flat-shaded tris). `basis` lets a composite
# primitive (frame, slats) drop rotated boxes into one shared surface.
func emit_box(st: SurfaceTool, centre: Vector3, size: Vector3, bevel: float,
		basis: Basis = Basis()) -> void:
	var hx := size.x / 2.0
	var hy := size.y / 2.0
	var hz := size.z / 2.0
	var b: float = min(bevel, min(hx, min(hy, hz)) * 0.9)
	var signs := [-1.0, 1.0]

	for sx in signs:
		var n := basis * Vector3(sx, 0, 0)
		add_quad(st,
			centre + basis * Vector3(sx * hx, hy - b, hz - b),
			centre + basis * Vector3(sx * hx, hy - b, -(hz - b)),
			centre + basis * Vector3(sx * hx, -(hy - b), -(hz - b)),
			centre + basis * Vector3(sx * hx, -(hy - b), hz - b), n)
	for sy in signs:
		var n := basis * Vector3(0, sy, 0)
		add_quad(st,
			centre + basis * Vector3(hx - b, sy * hy, hz - b),
			centre + basis * Vector3(-(hx - b), sy * hy, hz - b),
			centre + basis * Vector3(-(hx - b), sy * hy, -(hz - b)),
			centre + basis * Vector3(hx - b, sy * hy, -(hz - b)), n)
	for sz in signs:
		var n := basis * Vector3(0, 0, sz)
		add_quad(st,
			centre + basis * Vector3(hx - b, hy - b, sz * hz),
			centre + basis * Vector3(-(hx - b), hy - b, sz * hz),
			centre + basis * Vector3(-(hx - b), -(hy - b), sz * hz),
			centre + basis * Vector3(hx - b, -(hy - b), sz * hz), n)

	for sx in signs:
		for sy in signs:
			var n := basis * Vector3(sx, sy, 0).normalized()
			add_quad(st,
				centre + basis * Vector3(sx * hx, sy * (hy - b), hz - b),
				centre + basis * Vector3(sx * (hx - b), sy * hy, hz - b),
				centre + basis * Vector3(sx * (hx - b), sy * hy, -(hz - b)),
				centre + basis * Vector3(sx * hx, sy * (hy - b), -(hz - b)), n)
	for sy in signs:
		for sz in signs:
			var n := basis * Vector3(0, sy, sz).normalized()
			add_quad(st,
				centre + basis * Vector3(hx - b, sy * hy, sz * (hz - b)),
				centre + basis * Vector3(hx - b, sy * (hy - b), sz * hz),
				centre + basis * Vector3(-(hx - b), sy * (hy - b), sz * hz),
				centre + basis * Vector3(-(hx - b), sy * hy, sz * (hz - b)), n)
	for sx in signs:
		for sz in signs:
			var n := basis * Vector3(sx, 0, sz).normalized()
			add_quad(st,
				centre + basis * Vector3(sx * hx, hy - b, sz * (hz - b)),
				centre + basis * Vector3(sx * (hx - b), hy - b, sz * hz),
				centre + basis * Vector3(sx * (hx - b), -(hy - b), sz * hz),
				centre + basis * Vector3(sx * hx, -(hy - b), sz * (hz - b)), n)

	for sx in signs:
		for sy in signs:
			for sz in signs:
				var n := basis * Vector3(sx, sy, sz).normalized()
				add_tri(st,
					centre + basis * Vector3(sx * hx, sy * (hy - b), sz * (hz - b)),
					centre + basis * Vector3(sx * (hx - b), sy * hy, sz * (hz - b)),
					centre + basis * Vector3(sx * (hx - b), sy * (hy - b), sz * hz), n)


func build_box(size: Vector3, bevel: float) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	emit_box(st, Vector3.ZERO, size, bevel)
	st.index()
	return st.commit()


func ring(r: float, segs: int, y: float) -> Array:
	var pts := []
	for i in segs:
		var a := TAU * float(i) / float(segs)
		pts.append(Vector3(cos(a) * r, y, sin(a) * r))
	return pts


func radials(segs: int) -> Array:
	var ns := []
	for i in segs:
		var a := TAU * float(i) / float(segs)
		ns.append(Vector3(cos(a), 0.0, sin(a)))
	return ns


# Capped cylinder, height along +Y, centred on the origin. Smooth radial
# normals on the side (a 12-segment pole reads round rather than faceted) and a
# 45-degree chamfer ring at each end so it catches a highlight the way turned
# steel does, instead of ending in a razor edge.
func build_cyl(r: float, h: float, segs: int, bevel: float) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var hy := h / 2.0
	var b: float = clamp(bevel, 0.0, min(r * 0.5, hy * 0.5))
	var rn := radials(segs)
	var side_lo := ring(r, segs, -hy + b)
	var side_hi := ring(r, segs, hy - b)
	var cap_lo := ring(r - b, segs, -hy)
	var cap_hi := ring(r - b, segs, hy)

	for i in segs:
		var j: int = (i + 1) % segs
		add_quad_n(st, side_lo[i], side_hi[i], side_hi[j], side_lo[j],
			rn[i], rn[i], rn[j], rn[j])
		if b > 0.0:
			var nt_i: Vector3 = (rn[i] + Vector3.UP).normalized()
			var nt_j: Vector3 = (rn[j] + Vector3.UP).normalized()
			add_quad_n(st, side_hi[i], cap_hi[i], cap_hi[j], side_hi[j],
				nt_i, nt_i, nt_j, nt_j)
			var nb_i: Vector3 = (rn[i] + Vector3.DOWN).normalized()
			var nb_j: Vector3 = (rn[j] + Vector3.DOWN).normalized()
			add_quad_n(st, side_lo[i], cap_lo[i], cap_lo[j], side_lo[j],
				nb_i, nb_i, nb_j, nb_j)
		add_tri(st, Vector3(0, hy, 0), cap_hi[i], cap_hi[j], Vector3.UP)
		add_tri(st, Vector3(0, -hy, 0), cap_lo[i], cap_lo[j], Vector3.DOWN)

	st.index()
	return st.commit()


# Open pipe: outer wall, inner wall, and an annulus ring at each end. Used for
# anything the player can see the bore of — conduit stubs, handrail ends, the
# mop-bucket rim.
func build_tube(r_out: float, r_in: float, h: float, segs: int) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var hy := h / 2.0
	var rn := radials(segs)
	var out_lo := ring(r_out, segs, -hy)
	var out_hi := ring(r_out, segs, hy)
	var in_lo := ring(r_in, segs, -hy)
	var in_hi := ring(r_in, segs, hy)

	for i in segs:
		var j: int = (i + 1) % segs
		add_quad_n(st, out_lo[i], out_hi[i], out_hi[j], out_lo[j],
			rn[i], rn[i], rn[j], rn[j])
		add_quad_n(st, in_lo[i], in_hi[i], in_hi[j], in_lo[j],
			-rn[i], -rn[i], -rn[j], -rn[j])
		add_quad(st, out_hi[i], in_hi[i], in_hi[j], out_hi[j], Vector3.UP)
		add_quad(st, out_lo[i], in_lo[i], in_lo[j], out_lo[j], Vector3.DOWN)

	st.index()
	return st.commit()


# Truncated cone, height along +Y. Bucket bodies, lamp shades, castor cups.
# Side normals carry the real slope, so the shading reads as a cone and not as
# a cylinder that happens to narrow.
func build_taper(r_bot: float, r_top: float, h: float, segs: int) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var hy := h / 2.0
	var slope := (r_bot - r_top) / h
	var lo := ring(r_bot, segs, -hy)
	var hi := ring(r_top, segs, hy)
	var rn := radials(segs)
	var sn := []
	for i in segs:
		sn.append((rn[i] + Vector3.UP * slope).normalized())

	for i in segs:
		var j: int = (i + 1) % segs
		add_quad_n(st, lo[i], hi[i], hi[j], lo[j], sn[i], sn[i], sn[j], sn[j])
		if r_top > 0.0:
			add_tri(st, Vector3(0, hy, 0), hi[i], hi[j], Vector3.UP)
		add_tri(st, Vector3(0, -hy, 0), lo[i], lo[j], Vector3.DOWN)

	st.index()
	return st.commit()


# Rectangular picture frame in the XY plane, `depth` thick in Z: four bevelled
# rails merged into ONE surface. Merging matters — a notice board, a monitor
# bezel and a vision-light surround are each one draw call this way instead of
# four, and the web export is draw-call bound long before it is triangle bound.
func build_frame(w: float, h: float, border: float, depth: float, bevel: float) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var inner_h := h - 2.0 * border
	emit_box(st, Vector3(0, (h - border) / 2.0, 0), Vector3(w, border, depth), bevel)
	emit_box(st, Vector3(0, -(h - border) / 2.0, 0), Vector3(w, border, depth), bevel)
	emit_box(st, Vector3(-(w - border) / 2.0, 0, 0), Vector3(border, inner_h, depth), bevel)
	emit_box(st, Vector3((w - border) / 2.0, 0, 0), Vector3(border, inner_h, depth), bevel)
	st.index()
	return st.commit()


# A louvred panel: `count` blades spanning `h`, each tilted about X. The single
# most reused silhouette in an institutional building — extract grilles,
# radiator columns, locker vents, window glazing bars, bed-head bars — so it is
# a primitive rather than N hand-placed boxes per prop.
#
# `fill` is the fraction of each pitch the blade occupies, and it is what makes
# the primitive cover both jobs. A louvre is nearly solid (0.72, blades almost
# touching); a glazing bar or a bed-head bar is nearly all gap (0.10-0.20). The
# primitive originally hardcoded 0.72, which made a barred window come out as a
# set of shutters.
func build_slats(w: float, h: float, d: float, count: int, tilt: float,
		fill: float) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var pitch := h / float(count)
	var blade := pitch * fill
	var basis := Basis(Vector3.RIGHT, tilt)
	for i in count:
		var y := -h / 2.0 + pitch * (float(i) + 0.5)
		emit_box(st, Vector3(0, y, 0), Vector3(w, blade, d), min(0.004, blade * 0.3), basis)
	st.index()
	return st.commit()
