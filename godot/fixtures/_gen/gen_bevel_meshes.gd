# One-off generator: bakes chamfered-box ArrayMesh resources under
# fixtures/meshes/, one per unique (size, bevel) pair the fixtures need.
# Real manufactured panels aren't perfect 90-degree boxes; BoxMesh has no
# bevel option, so this builds a proper faceted chamfer (6 shrunk main
# faces + 12 rectangular edge-bevel facets + 8 triangular corner facets,
# ~44 flat-shaded tris/box) and saves it as a static resource. Runtime cost
# is identical to any other pre-built mesh — no script, no runtime
# generation, safe in Compatibility (positions+normals only, no tangents,
# since nothing here uses a normal map).
#
# Regenerate with:
#   godot --headless --path . --script res://fixtures/_gen/gen_bevel_meshes.gd
extends SceneTree


func _initialize() -> void:
	var specs := {
		"disp_body": [Vector3(0.55, 0.75, 0.16), 0.012],
		"disp_plate": [Vector3(0.46, 0.22, 0.03), 0.006],
		"disp_tray": [Vector3(0.46, 0.055, 0.10), 0.008],
		"kp_body": [Vector3(0.4, 0.5, 0.14), 0.010],
		"kp_backing": [Vector3(0.32, 0.42, 0.02), 0.005],
		"kp_key": [Vector3(0.066, 0.038, 0.012), 0.003],
		"door_jamb_side": [Vector3(0.10, 3.0, 0.16), 0.010],
		"door_jamb_top": [Vector3(2.0, 0.10, 0.16), 0.010],
		"door_rail_h": [Vector3(1.80, 0.15, 0.06), 0.008],
		"door_rail_mid": [Vector3(1.80, 0.18, 0.06), 0.008],
		"door_rail_bottom": [Vector3(1.80, 0.45, 0.06), 0.008],
		"door_stile": [Vector3(0.15, 2.28, 0.06), 0.008],
		"door_panel_upper": [Vector3(1.50, 0.95, 0.03), 0.005],
		"door_panel_lower": [Vector3(1.50, 1.15, 0.03), 0.005],
		"door_kick": [Vector3(1.50, 0.40, 0.03), 0.005],
		"door_bar": [Vector3(0.55, 0.05, 0.045), 0.006],
		"door_plate": [Vector3(0.70, 0.16, 0.012), 0.003],
	}

	DirAccess.make_dir_recursive_absolute("res://fixtures/meshes")

	for key in specs.keys():
		var size: Vector3 = specs[key][0]
		var bevel: float = specs[key][1]
		var mesh := build_bevel_box(size, bevel)
		var path := "res://fixtures/meshes/%s.tres" % key
		var err := ResourceSaver.save(mesh, path)
		if err != OK:
			push_error("failed to save %s: %d" % [path, err])
		else:
			print("wrote %s (%d tris)" % [path, mesh.get_faces().size() / 3])

	quit()


func add_tri(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, n: Vector3) -> void:
	var pts := [a, b, c]
	var computed := (b - a).cross(c - a)
	# WINDING CONVENTION — do not "fix" this back to `< 0.0`.
	# Godot treats a triangle as FRONT-facing when (b-a)x(c-a) points INWARD
	# by this test. Winding to AGREE with the outward normal (the intuitive
	# reading, and what this used to do) builds every mesh inside-out, so the
	# near surface is back-face culled and you see the lit far inner wall.
	# Measured against the engine's own primitives: SphereMesh, CylinderMesh
	# and BoxMesh all score 0% "outward" by this test; these lofts scored 100%
	# before the flip. It stayed hidden on closed convex shapes because the far
	# inner wall still rasterises and looks plausible — it only became obvious
	# on the Orderly's head, the one part with front/back-dependent shading,
	# where the face was being culled and read as a blank dome.
	if computed.dot(n) > 0.0:
		pts = [a, c, b]
	for p in pts:
		st.set_normal(n)
		st.add_vertex(p)


func add_quad(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, d: Vector3, n: Vector3) -> void:
	add_tri(st, a, b, c, n)
	add_tri(st, a, c, d, n)


func build_bevel_box(size: Vector3, bevel: float) -> ArrayMesh:
	var hx := size.x / 2.0
	var hy := size.y / 2.0
	var hz := size.z / 2.0
	var b: float = min(bevel, min(hx, min(hy, hz)) * 0.9)

	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)

	var signs := [-1.0, 1.0]

	# 6 main faces, shrunk by the bevel on their two tangent axes.
	for sx in signs:
		var n := Vector3(sx, 0, 0)
		var a := Vector3(sx * hx, hy - b, hz - b)
		var bb := Vector3(sx * hx, hy - b, -(hz - b))
		var c := Vector3(sx * hx, -(hy - b), -(hz - b))
		var d := Vector3(sx * hx, -(hy - b), hz - b)
		add_quad(st, a, bb, c, d, n)
	for sy in signs:
		var n := Vector3(0, sy, 0)
		var a := Vector3(hx - b, sy * hy, hz - b)
		var bb := Vector3(-(hx - b), sy * hy, hz - b)
		var c := Vector3(-(hx - b), sy * hy, -(hz - b))
		var d := Vector3(hx - b, sy * hy, -(hz - b))
		add_quad(st, a, bb, c, d, n)
	for sz in signs:
		var n := Vector3(0, 0, sz)
		var a := Vector3(hx - b, hy - b, sz * hz)
		var bb := Vector3(-(hx - b), hy - b, sz * hz)
		var c := Vector3(-(hx - b), -(hy - b), sz * hz)
		var d := Vector3(hx - b, -(hy - b), sz * hz)
		add_quad(st, a, bb, c, d, n)

	# 12 edge-bevel facets.
	for sx in signs:
		for sy in signs:
			var n := Vector3(sx, sy, 0).normalized()
			var vx1 := Vector3(sx * hx, sy * (hy - b), hz - b)
			var vy1 := Vector3(sx * (hx - b), sy * hy, hz - b)
			var vy2 := Vector3(sx * (hx - b), sy * hy, -(hz - b))
			var vx2 := Vector3(sx * hx, sy * (hy - b), -(hz - b))
			add_quad(st, vx1, vy1, vy2, vx2, n)
	for sy in signs:
		for sz in signs:
			var n := Vector3(0, sy, sz).normalized()
			var vy1 := Vector3(hx - b, sy * hy, sz * (hz - b))
			var vz1 := Vector3(hx - b, sy * (hy - b), sz * hz)
			var vz2 := Vector3(-(hx - b), sy * (hy - b), sz * hz)
			var vy2 := Vector3(-(hx - b), sy * hy, sz * (hz - b))
			add_quad(st, vy1, vz1, vz2, vy2, n)
	for sx in signs:
		for sz in signs:
			var n := Vector3(sx, 0, sz).normalized()
			var vx1 := Vector3(sx * hx, hy - b, sz * (hz - b))
			var vz1 := Vector3(sx * (hx - b), hy - b, sz * hz)
			var vz2 := Vector3(sx * (hx - b), -(hy - b), sz * hz)
			var vx2 := Vector3(sx * hx, -(hy - b), sz * (hz - b))
			add_quad(st, vx1, vz1, vz2, vx2, n)

	# 8 corner triangles.
	for sx in signs:
		for sy in signs:
			for sz in signs:
				var n := Vector3(sx, sy, sz).normalized()
				var vx := Vector3(sx * hx, sy * (hy - b), sz * (hz - b))
				var vy := Vector3(sx * (hx - b), sy * hy, sz * (hz - b))
				var vz := Vector3(sx * (hx - b), sy * (hy - b), sz * hz)
				add_tri(st, vx, vy, vz, n)

	st.index()
	return st.commit()
