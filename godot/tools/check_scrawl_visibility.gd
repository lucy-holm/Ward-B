# Can the player still READ the code? — occlusion audit for wall scrawls.
#
#   godot --path godot --resolution 640x360 tools/check_scrawl_visibility.tscn
#   godot --path godot --resolution 640x360 tools/check_scrawl_visibility.tscn -- room2
#
# MUST RUN WINDOWED. --headless skips rendering entirely, so every scrawl
# measures 0 visible pixels and the audit reports the whole ward as blocked —
# a failure mode that looks exactly like a result.
#
# WHY THIS EXISTS. The keypad codes are written on the walls, and the prop kit
# (godot/props/) was added to rooms laid out before it existed. A prop on the
# same wall face as a scrawl fails nothing: not check_rooms, not
# check_roundtrip, and not a reading of tools/gen_rooms.py, where
# `r.model("wall_vent", (-1.48, -4.2))` and `r.scrawl("4 1 1 8", (-1.45, 1.6,
# -5.5))` sit twenty lines apart in different units of thought. It surfaces
# only as a player standing in a corridor unable to read the code — which in a
# keypad room is an unwinnable room.
#
# tools/measure_scrawls.tscn answers the neighbouring question (how WIDE does a
# scrawl actually render) and its answer is why this is needed at all: a
# size-3.4 seven-character scrawl is 2.2 m of wall, so it reaches props that
# look nowhere near it in the generator source.
#
# WHY RENDERED PIXELS AND NOT GEOMETRY. The first cut of this compared world
# AABBs — occluder in front of the scrawl plane, overlapping its rectangle. It
# cannot work, and the failure is instructive: "in front of the wall" includes
# the whole room out to the far wall, so room 2's EAST wall reported as
# covering 100% of the code on the WEST wall. Occlusion is a question about a
# viewer, not about a plane, and an axis-aligned box is a poor stand-in for a
# smashed cabinet. Rendering asks the renderer, which is the thing whose answer
# the player actually gets.
#
# THE MEASUREMENT, per scrawl per viewpoint, four renders:
#   ink       = pixels that CHANGE when the scrawl is toggled on, in the fully
#               dressed room. Differencing rather than colour-keying, so an
#               emissive prop behind the text cannot be mistaken for ink.
#   unblocked = the same toggle with every other visual in the room hidden.
#
# Both are kept as PER-SCREEN-COLUMN histograms, not as totals, and the score
# is the WORST column band rather than ink/unblocked overall. That distinction
# is the whole point: room 2's code measured 91% of its ink surviving, which
# sounds like a graze, while the missing 9% was stacked on one end of "4 1 1 8".
# A four-digit code is read digit by digit, so losing one digit entirely and
# losing 9% off every glyph are the same number and opposite outcomes.
#
# Viewpoints are positions on the scrawl's own normal at two reading distances,
# three lateral offsets and two heights, clamped inside the room floor. A
# player can walk, so the score reported is the BEST of them: the question is
# "is there anywhere to stand and read this", not "is it readable from one
# arbitrary spot".
#
# TWO HEIGHTS, because a fixed 1.62 m eye is wrong in this ward. Rooms 12, 17
# and 19 stack floors, and a scrawl on a gallery read from a camera parked at
# ground-floor eye height measures 0% while being perfectly legible from the
# balcony it is written for. The second height is level with the text itself,
# which stands in for "read from whatever floor this belongs to".
#
# ANCESTORS ARE FORCE-SHOWN while measuring. Scrawls are unmed-only, and some
# are gated on the light axis as well (core/light_object.gd), so their wrapper
# starts hidden — toggling the label under an invisible parent changes no
# pixels at all and reports as "no vantage renders it", which is a statement
# about the gate rather than about occlusion. The gate is a design decision;
# what is being audited here is whether geometry is in the way once the gate
# opens.
extends Node

# A four-digit code is 25% per digit and the digits are spaced, so material
# loss starts well before half the ink is gone. Below this from every
# viewpoint, a code room is not reliably solvable.
const CODE_FAIL_BELOW := 0.80
# Flavour scrawls carry atmosphere and hints, not the code, so they only fail
# once they are properly buried.
const FLAVOUR_FAIL_BELOW := 0.50
# Worth printing even when it passes.
const NOTE_BELOW := 0.97

# Column bands the scrawl's screen extent is split into. Eight over a
# four-digit code is two bands per digit, so a band cannot straddle two digits
# and average a blocked one back into legibility.
const BANDS := 8
# A band this far gone has eaten a digit stroke, whatever the total says.
const BAND_FAIL_BELOW := 0.55

const EYE_HEIGHT := 1.62
const READ_DISTANCES: Array[float] = [1.5, 2.6]
const LATERAL_OFFSETS: Array[float] = [-1.1, 0.0, 1.1]

var failures: Array[String] = []
var notes: Array[String] = []
var checked := 0

var _camera: Camera3D
var _visuals: Array[VisualInstance3D] = []


func _ready() -> void:
	var only := ""
	var args := OS.get_cmdline_user_args()
	if args.size() > 0:
		only = String(args[0])

	_camera = Camera3D.new()
	_camera.fov = Tuning.CAMERA_FOV
	_camera.current = true
	# Flat, known background and no lighting dependence: the measurement is a
	# difference between two renders, so what the room is lit like does not
	# enter into it, and an unlit room renders faster.
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0, 0, 0)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(1, 1, 1)
	env.ambient_light_energy = 1.0
	_camera.environment = env
	add_child(_camera)

	print("")
	print("scrawl visibility audit (%dx%d)" % [
		get_viewport().get_visible_rect().size.x,
		get_viewport().get_visible_rect().size.y])
	print("")

	for room_id in _room_ids():
		if not only.is_empty() and room_id != only:
			continue
		await _audit_room(room_id)

	print("")
	print("checked %d scrawl(s)" % checked)
	if not notes.is_empty():
		print("")
		print("  PARTIALLY OCCLUDED (passes, but something is in the way):")
		for n in notes:
			print("    %s" % n)
	if failures.is_empty():
		print("")
		print("  OK - every code scrawl is readable from somewhere a player can stand")
	else:
		print("")
		print("  BLOCKED:")
		for f in failures:
			print("    %s" % f)
		print("")
		print("  %d blocked scrawl(s)" % failures.size())
	print("")
	get_tree().quit(0 if failures.is_empty() else 1)


func _room_ids() -> Array[String]:
	var out: Array[String] = []
	var dir := DirAccess.open("res://rooms")
	if dir == null:
		return out
	for name in dir.get_directories():
		if ResourceLoader.exists("res://rooms/%s/%s.tscn" % [name, name]):
			out.append(name)
	out.sort()
	return out


func _audit_room(room_id: String) -> void:
	var room: Node = (load("res://rooms/%s/%s.tscn" % [room_id, room_id]) as PackedScene).instantiate()
	add_child(room)
	# Label3D builds its mesh lazily; get_aabb() is zero-sized before this.
	await get_tree().process_frame
	await get_tree().process_frame

	_visuals.clear()
	_collect_visuals(room, _visuals)
	var floor_box := _floor_bounds(room)

	for label: Label3D in _scrawls(room):
		checked += 1
		var gated := _force_show_ancestors(label, room)
		var is_code := String(label.name).begins_with("codeScrawl")
		var best := 0.0
		var best_from := Vector3.ZERO
		var any := false

		for viewpoint in _viewpoints(label, floor_box):
			var score := await _visibility_from(label, viewpoint)
			if score < 0.0:
				continue  # scrawl renders nothing from here; not a valid vantage
			any = true
			if score > best:
				best = score
				best_from = viewpoint

		for n in gated:
			n.visible = false

		var tag := "(CODE) " if is_code else ""
		if not any:
			failures.append("%s/%s %s— no vantage renders it at all" % [room_id, label.name, tag])
			continue

		var line := "%s/%s %s%d%% readable, best from (%.1f, %.1f)" % [
			room_id, label.name, tag, roundi(best * 100.0), best_from.x, best_from.z]
		var limit := CODE_FAIL_BELOW if is_code else FLAVOUR_FAIL_BELOW
		if best < limit:
			failures.append(line)
		elif best < NOTE_BELOW:
			notes.append(line)

	room.queue_free()
	remove_child(room)


## Eye-height spots on the scrawl's normal, at two reading distances and three
## lateral offsets, clamped inside the room floor with a player radius of
## margin so no viewpoint is inside a wall.
func _viewpoints(label: Label3D, floor_box: AABB) -> Array[Vector3]:
	var basis := label.global_transform.basis
	var normal := basis.z.normalized()
	var right := basis.x.normalized()
	var centre := label.global_transform * label.get_aabb().get_center()

	var out: Array[Vector3] = []
	for d: float in READ_DISTANCES:
		for lateral: float in LATERAL_OFFSETS:
			for eye: float in [EYE_HEIGHT, centre.y]:
				var p := centre + normal * d + right * lateral
				p.y = eye
				out.append(_clamp_to_floor(p, floor_box))
	return out


func _clamp_to_floor(p: Vector3, floor_box: AABB) -> Vector3:
	if floor_box.size != Vector3.ZERO:
		var m := Tuning.PLAYER_RADIUS
		p.x = clampf(p.x, floor_box.position.x + m, floor_box.end.x - m)
		p.z = clampf(p.z, floor_box.position.z + m, floor_box.end.z - m)
	return p


## Worst-band visibility, or -1.0 when the scrawl renders nothing even
## unobstructed (viewpoint behind it, or outside the frustum).
func _visibility_from(label: Label3D, viewpoint: Vector3) -> float:
	var centre := label.global_transform * label.get_aabb().get_center()
	_camera.global_position = viewpoint
	_camera.look_at(centre, Vector3.UP)

	var ink := await _toggle_delta(label)

	# Same toggle with the rest of the room hidden: the scrawl's unobstructed
	# footprint from this exact camera.
	var restore: Array[VisualInstance3D] = []
	for v in _visuals:
		if v != label and v.visible:
			v.visible = false
			restore.append(v)
	var unblocked := await _toggle_delta(label)
	for v in restore:
		v.visible = true

	return _worst_band(ink, unblocked)


## Splits the scrawl's unobstructed screen extent into BANDS equal columns and
## returns the least-visible one. Bands carrying almost no ink (the gaps
## between glyphs) are skipped — a column of blank wall is 0/0, not 0%.
func _worst_band(ink: PackedInt32Array, unblocked: PackedInt32Array) -> float:
	var lo := -1
	var hi := -1
	var total := 0
	for x in unblocked.size():
		total += unblocked[x]
		if unblocked[x] > 0:
			if lo < 0:
				lo = x
			hi = x
	if lo < 0 or total <= 0:
		return -1.0

	# Ink thin enough that a band of it is a handful of pixels tells us nothing
	# reliable; fall back to the overall ratio.
	var span := hi - lo + 1
	if span < BANDS * 2:
		var seen := 0
		for x in ink.size():
			seen += ink[x]
		return float(seen) / float(total)

	var worst := 1.0
	var floor_px := maxi(4, int(float(total) / float(BANDS) * 0.15))
	for b in BANDS:
		var from := lo + int(float(span) * float(b) / float(BANDS))
		var to := lo + int(float(span) * float(b + 1) / float(BANDS))
		var want := 0
		var got := 0
		for x in range(from, to):
			want += unblocked[x]
			got += ink[x]
		if want < floor_px:
			continue
		worst = minf(worst, float(got) / float(want))
	return worst


## Per-screen-column counts of the pixels that change when `label` is toggled
## off and on again.
func _toggle_delta(label: Label3D) -> PackedInt32Array:
	var was := label.visible
	label.visible = false
	var without := await _grab()
	label.visible = true
	var with := await _grab()
	label.visible = was
	return _column_diff(without, with)


func _grab() -> Image:
	await RenderingServer.frame_post_draw
	return get_viewport().get_texture().get_image()


## Raw-byte compare rather than get_pixel: this runs once per band per
## viewpoint per scrawl, and at 480x270 a get_pixel pass costs more than the
## render it is measuring.
func _column_diff(a: Image, b: Image) -> PackedInt32Array:
	var out := PackedInt32Array()
	if a == null or b == null or a.get_size() != b.get_size():
		return out
	a.convert(Image.FORMAT_RGBA8)
	b.convert(Image.FORMAT_RGBA8)
	var w := a.get_width()
	var h := a.get_height()
	out.resize(w)
	var da := a.get_data()
	var db := b.get_data()
	var i := 0
	for y in h:
		for x in w:
			var o := i * 4
			if da[o] != db[o] or da[o + 1] != db[o + 1] or da[o + 2] != db[o + 2]:
				out[x] += 1
			i += 1
	return out


## The room's walkable extent, taken from its floor mesh. Zero AABB when a room
## has no single floor node, in which case viewpoints are left unclamped.
func _floor_bounds(room: Node) -> AABB:
	var f := room.get_node_or_null("Shell/Floor") as VisualInstance3D
	if f == null:
		return AABB()
	var local := f.get_aabb()
	var xf := f.global_transform
	var out := AABB(xf * local.position, Vector3.ZERO)
	for i in range(1, 8):
		out = out.expand(xf * (local.position + Vector3(
			local.size.x if (i & 1) else 0.0,
			local.size.y if (i & 2) else 0.0,
			local.size.z if (i & 4) else 0.0)))
	return out


## Makes every hidden ancestor of `label` visible, up to (not including) the
## room root, and returns the ones it changed so the caller can put them back.
func _force_show_ancestors(label: Node, room: Node) -> Array[Node3D]:
	var changed: Array[Node3D] = []
	var n := label.get_parent()
	while n != null and n != room:
		var n3 := n as Node3D
		if n3 != null and not n3.visible:
			n3.visible = true
			changed.append(n3)
		n = n.get_parent()
	return changed


func _scrawls(node: Node) -> Array[Label3D]:
	var out: Array[Label3D] = []
	if node is Label3D and _is_under_scrawls(node):
		out.append(node as Label3D)
	for child in node.get_children():
		out.append_array(_scrawls(child))
	return out


func _is_under_scrawls(node: Node) -> bool:
	var n := node
	while n != null:
		if String(n.name) == "Scrawls":
			return true
		n = n.get_parent()
	return false


func _collect_visuals(node: Node, out: Array[VisualInstance3D]) -> void:
	if node is VisualInstance3D:
		out.append(node as VisualInstance3D)
	for child in node.get_children():
		_collect_visuals(child, out)
