# Behavioural tests for THE LIGHT AXIS and for ROOM 16 — the Breaker Bay, its
# only consumer.
#
#   godot --headless --path godot tools/test_room16.tscn
#
# The axis's load-bearing claims are all things a screenshot cannot show and a
# code read cannot prove, so they are asserted against the real scene, the real
# collision cache and the real Atmosphere:
#
#   1. LIGHT GATES VISIBILITY AND RAYCAST ELIGIBILITY, NEVER COLLISION. The
#      collision cache is asserted byte-identical between lit and dark, and no
#      light-gated subtree is allowed to contain a CollisionShape3D at all.
#      This is room 16's soft-lock guarantee: a dark room is geometrically
#      identical to a lit one and can never trap the player.
#   2. THE SWITCH SURVIVES ATMOSPHERE'S PER-FRAME WRITES. _tick_flicker writes
#      light_energy on every light every frame; the breaker is asserted to hold
#      for 900 consecutive frames, in BOTH ward states (the unmed flicker path
#      is the one that writes hardest).
#   3. DARK SURVIVES A ROOM RELOAD. The room is freed and re-instantiated with
#      the breaker still off, and the fresh light nodes — new instances, new
#      indices, new snapshots — are asserted to come back dark, as is the
#      fresh scene's gated geometry.
#   4. ALL FOUR 2x2 CELLS BEHAVE, and the three that must not open the door
#      are asserted against WardCollision (is the doorway walkable?), not
#      against a toast.
#
# WHAT IS REASONED AND NOT PROVEN HERE, stated rather than implied:
#
#   * The room's pill economy and its difficulty. Whether 18s of charge and a
#     26s window feel right is a playtest question; what follows from the
#     assertions below is only that the room is COMPLETABLE and cannot
#     soft-lock.
#   * The look. Nothing here samples a pixel. The dark-state Environment/
#     posterise composition (main.gd's DARK_* constants) is verified by
#     screenshot, not by this suite.
#   * main.gd's own load_room wiring. This suite has no main.tscn, so it drives
#     the same engine calls a StubMain makes. What it proves about reload is
#     that the MECHANISM re-attaches; that load_room calls it in the right
#     order is a one-line read of main.gd, flagged in the report.
extends Node

const ROOM := preload("res://rooms/room16/room16.tscn")
const STUB_PLAYER := preload("res://tools/test_stub_player.gd")

# Dead centre of the exit doorway, and of the charge zone.
const DOOR_X := 0.0
const DOOR_Z := -14.0
const BAY_X := 0.0
const BAY_Z := -6.0

# check_rooms.gd's patrol rule, repeated because room 16 is not in ROOM_SCENES
# yet and that validator only walks the registry.
const PATROL_MARGIN := 0.1

var failures: Array[String] = []
var passes := 0


# The narrow slice of main.gd a room script may touch. Deliberately drives the
# REAL engine objects for everything the light axis is made of — RoomLight,
# WardPhosphor, Atmosphere, WardCollision — so these tests exercise shipping
# code rather than a mock of it. Only the HUD and the Environment are recorded
# instead of performed.
class StubMain:
	extends Node
	var player: Node3D = null
	var collision: WardCollision = null
	var room: Node3D = null
	var atmosphere: Atmosphere = null
	var toasts: Array = []
	var objectives: Array = []
	var teleports: Array = []
	var glow_fades: Array = []
	var threat := -1.0

	func hud_toast(text: String) -> void:
		toasts.append(text)

	func hud_objective(text: String) -> void:
		objectives.append(text)

	func set_threat(level: float, _bearing: Variant) -> void:
		threat = level

	func shift_fx() -> void:
		pass

	func teleport_player(x: float, z: float, _to_level := "") -> void:
		teleports.append(Vector2(x, z))
		if player != null:
			player.global_position = Vector3(x, 0.0, z)

	# --- the light axis, exactly as main.gd wires it (minus the Environment) ---
	func is_room_dark() -> bool:
		return RoomLight.is_dark()

	func set_room_dark(dark: bool) -> void:
		if dark == RoomLight.is_dark():
			return
		RoomLight.set_dark(dark)
		if atmosphere != null:
			atmosphere.set_all_circuits(not dark, false)

	func set_glow_fade(level: float) -> void:
		glow_fades.append(level)
		WardPhosphor.apply(room, level)

	func move_interactable(id: String, pos: Vector3, rot_y := 0.0) -> void:
		var node := find_interactable(id)
		if node != null:
			node.global_position = pos
			node.rotation.y = rot_y

	func remove_interactable(id: String) -> void:
		var node := find_interactable(id)
		if node != null:
			node.queue_free()

	func unlock_door(node_name: String) -> void:
		var body := room.find_child(node_name, true, false)
		if body is CollisionObject3D:
			(body as CollisionObject3D).collision_layer = 0
		rebuild_collision()

	func rebuild_collision() -> void:
		if collision != null and room != null:
			collision.rebuild_from(room)

	func find_interactable(id: String) -> Interactable:
		return _find(room, id)

	func _find(node: Node, id: String) -> Interactable:
		if node is Interactable and (node as Interactable).interactable_id == id:
			return node as Interactable
		for child in node.get_children():
			var found := _find(child, id)
			if found != null:
				return found
		return null


func _ready() -> void:
	Telemetry.disabled = true
	StateManager.force_state(StateManager.State.UNMED, "test")
	RoomLight.reset(false)

	_test_authoring_invariants()
	_test_no_keypad_and_no_digits()
	_test_gating_changes_visibility()
	_test_gating_changes_raycast_eligibility()
	_test_gates_compose_with_ward_state()
	_test_collision_is_identical_lit_and_dark()
	_test_no_light_gated_collider_exists()
	_test_unmed_walk_back_is_never_blocked()
	_test_switch_survives_atmosphere_writes()
	_test_dark_survives_a_room_reload()
	_test_circuits_are_independently_switchable()
	_test_cell_lit_unmed()
	_test_cell_lit_lucid()
	_test_cell_dark_unmed()
	_test_cell_dark_lucid()
	_test_door_opens_in_exactly_one_cell()
	_test_charge_only_accrues_in_the_lit_open_bay()
	_test_fade_is_cosmetic_only()
	_test_catch_resets_light_and_charge()
	_test_orderly_perception_is_unaffected_by_darkness()
	_test_patrol_clearance()
	_finish()


func _check(cond: bool, what: String) -> void:
	if cond:
		passes += 1
	else:
		failures.append(what)


# --- fixtures ---------------------------------------------------------------

## A live room behind a stub main. `frozen` stops the room's and the orderly's
## own _physics_process so nothing walks while a test drives the mechanic by
## hand and no orderly wanders into a catch mid-assertion.
func _make_room(frozen := true) -> Dictionary:
	RoomLight.reset(false)

	var room: Node3D = ROOM.instantiate()
	add_child(room)

	var col := WardCollision.new()
	col.rebuild_from(room)

	var player: Node3D = Node3D.new()
	player.set_script(STUB_PLAYER)
	add_child(player)
	player.global_position = Vector3(0, 0, 5)

	# Never added to the tree: this suite quits from _ready, so no frame ever
	# processes and every tick has to be driven by hand anyway. Atmosphere needs
	# no tree — it walks the room it is handed.
	var atmos := Atmosphere.new()

	var main := StubMain.new()
	main.player = player
	main.collision = col
	main.room = room
	main.atmosphere = atmos
	add_child(main)

	atmos.collect_lights(room)

	room.on_enter(main)
	if frozen:
		room.set_physics_process(false)
		for child in room.get_children():
			if child is CharacterBody3D:
				child.set_physics_process(false)
	return {"room": room, "main": main, "col": col, "player": player, "atmos": atmos}


func _teardown(ctx: Dictionary) -> void:
	var room: Node3D = ctx["room"]
	room.on_leave()
	remove_child(room)
	# free(), not queue_free(): this suite quits from _ready, so a deferred free
	# would never be processed and every room would leak at exit.
	room.free()
	var main: Node = ctx["main"]
	remove_child(main)
	main.free()
	var player: Node = ctx["player"]
	remove_child(player)
	player.free()
	var atmos: Node = ctx["atmos"]
	if atmos != null:
		atmos.free()
	StateManager.force_state(StateManager.State.UNMED, "test")
	RoomLight.reset(false)


func _find_all(node: Node, out: Array, pred: Callable) -> void:
	if pred.call(node):
		out.append(node)
	for child in node.get_children():
		_find_all(child, out, pred)


func _light_objects(room: Node) -> Array:
	var out: Array = []
	_find_all(room, out, func(n: Node) -> bool: return n is LightObject)
	return out


func _phosphor_nodes(room: Node) -> Array:
	var out: Array = []
	_find_all(room, out, func(n: Node) -> bool: return n.is_in_group(WardPhosphor.GROUP))
	return out


func _omni_lights(room: Node) -> Array:
	var out: Array = []
	_find_all(room, out, func(n: Node) -> bool: return n is OmniLight3D)
	return out


## A canonical, order-independent fingerprint of the whole collision cache.
## Anything that moved, appeared, vanished or changed its state/level filter
## changes this string.
func _collision_signature(col: WardCollision) -> String:
	var rows: Array[String] = []
	for b in col.boxes:
		rows.append("%.4f|%.4f|%.4f|%.4f|%d|%s"
			% [b.min_x, b.max_x, b.min_z, b.max_z, b.state_filter, b.level_filter])
	rows.sort()
	return "\n".join(rows)


func _step_atmosphere(atmos: Atmosphere, frames: int, dt := 1.0 / 60.0) -> void:
	for _i in frames:
		atmos._process(dt)


# --- 0. authoring -----------------------------------------------------------

func _test_authoring_invariants() -> void:
	var ctx := _make_room()
	var room: Node3D = ctx["room"]
	var main: StubMain = ctx["main"]

	# The exit. room 16 is not in ROOM_SCENES yet, so check_rooms.gd never walks
	# it and nothing forces it to terminate the chain — it points at the real
	# room17, exactly as room17.tscn itself points at the unported room18. Once
	# BOTH are registered the requirement tightens to precisely "room17". Keyed
	# off the registry rather than hard-coded, per tools/test_room14.gd: the
	# chain terminator moves as rooms land.
	var registry: Dictionary = load("res://main.gd").ROOM_SCENES
	var room16_registered: bool = registry.has("room16")
	var room17_registered: bool = registry.has("room17")
	var want := "room17" if (room17_registered or not room16_registered) else "END"
	var to := ""
	var exits: Node = room.get_node_or_null("Exits")
	if exits != null:
		for child in exits.get_children():
			if child is RoomExit:
				to = (child as RoomExit).exit_to
				break
	_check(to == want,
		"exit must target %s (room16 registered: %s, room17 registered: %s), got '%s'"
			% [want, room16_registered, room17_registered, to])

	# The three fixtures the 2x2 is built from.
	var switch_node := main.find_interactable("lightSwitch16")
	_check(switch_node != null and switch_node.interactable_type == "switch",
		"lightSwitch16 must exist and be of type 'switch'")
	_check(main.find_interactable("exitdoor16") != null, "exitdoor16 must exist")
	_check(main.find_interactable("dispenser16a") != null,
		"dispenser16a is the 0-pill escape hatch and must exist")

	# THE SWITCH IS NEVER LIGHT-GATED. A breaker that vanished in the dark could
	# not be thrown back, which would turn this room's one-way-trap fix into the
	# trap itself.
	if switch_node != null:
		var gated := false
		var n: Node = switch_node.get_parent()
		while n is Node3D:
			if n is LightObject:
				gated = true
			n = n.get_parent()
		_check(not gated,
			"lightSwitch16 must NOT be light-gated — the toggle has to survive its "
			+ "own throw or the room becomes a one-way trap")

	# The room opens LIT. (start_dark is the field a future room would set; room
	# 16 deliberately does not, so the axis's default path is what ships here.)
	_check(not room.has_meta("start_dark"),
		"room 16 opens lit — it must not author metadata/start_dark")
	_check(not RoomLight.is_dark(), "RoomLight must be lit after on_enter")

	# Exactly the gated set the design calls for: two glow lintels (lit-only)
	# and six pieces of paint (dark-only: five floor tiles + the scrawl).
	var lit_gated := 0
	var dark_gated := 0
	for lo in _light_objects(room):
		if (lo as LightObject).visible_in_light == LightObject.Filter.LIT:
			lit_gated += 1
		elif (lo as LightObject).visible_in_light == LightObject.Filter.DARK:
			dark_gated += 1
	_check(lit_gated == 2, "two lit-only glow lintels expected, found %d" % lit_gated)
	_check(dark_gated == 6,
		"six dark-only pieces expected (5 floor tiles + the phosphor scrawl), found %d"
			% dark_gated)

	# The paint: five tiles plus the ink, all in the phosphor group so one dial
	# fades writing and floor together.
	_check(_phosphor_nodes(room).size() == 6,
		"six phosphor-group nodes expected, found %d" % _phosphor_nodes(room).size())

	# The exit glow is NOT gated — the way out stays locatable in the dark.
	var exit_glow_gated := false
	for lo in _light_objects(room):
		for child in (lo as Node).get_children():
			if child is MeshInstance3D and (child as Node3D).global_position.z < -15.0:
				exit_glow_gated = true
	_check(not exit_glow_gated,
		"the exit vestibule glow must not be light-gated — a 0-pill unmed player "
		+ "has to be able to see the way out in either light state")

	_teardown(ctx)


# Tom's design override #1: this room ends on a door, not a code.
func _test_no_keypad_and_no_digits() -> void:
	var ctx := _make_room()
	var room: Node3D = ctx["room"]

	var types: Array = []
	_find_all(room, types, func(n: Node) -> bool: return n is Interactable)
	var kinds: Array[String] = []
	for t in types:
		kinds.append((t as Interactable).interactable_type)
	_check(not kinds.has("keypad"),
		"room 16 has NO keypad: the door itself is the terminal interactable")

	var labels: Array = []
	_find_all(room, labels, func(n: Node) -> bool: return n is Label3D)
	for l in labels:
		var text: String = (l as Label3D).text
		var has_digit := false
		for c in text:
			if c >= "0" and c <= "9":
				has_digit = true
		_check(not has_digit,
			"no digits anywhere in room 16 — '%s' on %s carries one" % [text, (l as Node).name])

	_teardown(ctx)


# --- 1. the gate: visibility -------------------------------------------------

func _test_gating_changes_visibility() -> void:
	var ctx := _make_room()
	var room: Node3D = ctx["room"]
	var main: StubMain = ctx["main"]

	for lo in _light_objects(room):
		var l := lo as LightObject
		var lit_only := l.visible_in_light == LightObject.Filter.LIT
		_check(l.is_present() == lit_only,
			"while lit, %s (%s-only) should be present=%s"
				% [l.name, "lit" if lit_only else "dark", lit_only])
		_check(l.visible == lit_only, "%s.visible must match its gate while lit" % l.name)

	main.set_room_dark(true)

	for lo in _light_objects(room):
		var l := lo as LightObject
		var dark_only := l.visible_in_light == LightObject.Filter.DARK
		_check(l.is_present() == dark_only,
			"while dark, %s should be present=%s" % [l.name, dark_only])
		_check(l.visible == dark_only, "%s.visible must match its gate while dark" % l.name)

	# ...and back. The switch is a genuine two-way toggle.
	main.set_room_dark(false)
	for lo in _light_objects(room):
		var l := lo as LightObject
		_check(l.is_present() == (l.visible_in_light == LightObject.Filter.LIT),
			"%s must return to its lit-state presence when the breaker goes back" % l.name)

	_teardown(ctx)


# --- 2. the gate: raycast eligibility ---------------------------------------
#
# Godot has the same property three.js does: an invisible node is still
# raycastable, so hiding a mesh is NOT enough to stop a fixture being
# interacted with. Interactable.is_focusable() is the real gate. Room 16
# authors no light-gated fixture of its own (its switch and door are
# always-present, gated by their own logic), so this builds the engine case the
# axis has to support for room 17+ — and asserts the room's own two fixtures
# stay reachable in BOTH light states, which is what keeps the toggle two-way.
func _test_gating_changes_raycast_eligibility() -> void:
	var ctx := _make_room()
	var room: Node3D = ctx["room"]
	var main: StubMain = ctx["main"]

	var wrapper := LightObject.new()
	wrapper.visible_in_light = LightObject.Filter.DARK
	room.add_child(wrapper)
	var fixture := Interactable.new()
	fixture.interactable_id = "testOnlyDarkFixture"
	fixture.interactable_type = "keypad"
	wrapper.add_child(fixture)

	_check(not fixture.is_focusable(),
		"a dark-only interactable must be refused by the interact ray while lit — "
		+ "hiding the mesh alone would not do it, an invisible Area3D still raycasts")

	main.set_room_dark(true)
	_check(fixture.is_focusable(), "a dark-only interactable must be focusable once dark")

	main.set_room_dark(false)
	_check(not fixture.is_focusable(), "...and refused again once the lights come back")

	# The room's own fixtures are ungated and must stay reachable either way.
	for state in [false, true]:
		main.set_room_dark(state)
		for id in ["lightSwitch16", "exitdoor16", "dispenser16a"]:
			var node := main.find_interactable(id)
			_check(node != null and node.is_focusable(),
				"%s must stay focusable while dark=%s" % [id, state])

	_teardown(ctx)


# The two axes are orthogonal and NEST: a phosphor scrawl is unmed-only AND
# dark-only, and must draw only when both agree. Four cells, four answers.
func _test_gates_compose_with_ward_state() -> void:
	var ctx := _make_room()
	var room: Node3D = ctx["room"]
	var main: StubMain = ctx["main"]

	var scrawl := room.find_child("phosphorScrawl16", true, false)
	_check(scrawl != null, "phosphorScrawl16 must exist")
	if scrawl == null:
		_teardown(ctx)
		return

	var gate := scrawl.get_parent() as LightObject
	var state_wrapper := gate.get_parent() as StateObject
	_check(gate != null and gate.visible_in_light == LightObject.Filter.DARK,
		"phosphorScrawl16 must sit inside a DARK LightObject")
	_check(state_wrapper != null
			and state_wrapper.visible_in_state == StateObject.Affinity.UNMED,
		"...which must itself sit inside the unmed-only Scrawls wrapper")

	for dark in [false, true]:
		main.set_room_dark(dark)
		for lucid in [false, true]:
			StateManager.force_state(
				StateManager.State.LUCID if lucid else StateManager.State.UNMED, "test")
			var drawn: bool = gate.is_present() and state_wrapper.is_present()
			var want: bool = dark and not lucid
			_check(drawn == want,
				"phosphorScrawl16 drawn=%s in cell dark=%s lucid=%s, expected %s"
					% [drawn, dark, lucid, want])

	_teardown(ctx)


# --- 3. THE SOFT-LOCK GUARANTEE ---------------------------------------------

func _test_collision_is_identical_lit_and_dark() -> void:
	var ctx := _make_room()
	var main: StubMain = ctx["main"]
	var col: WardCollision = ctx["col"]

	_check(not col.boxes.is_empty(), "room 16's collider cache must not be empty")
	var lit_sig := _collision_signature(col)

	main.set_room_dark(true)
	main.rebuild_collision()
	var dark_sig := _collision_signature(col)
	_check(lit_sig == dark_sig,
		"THE SOFT-LOCK GUARANTEE: WardCollision must be byte-identical between lit "
		+ "and dark. A dark room has to be geometrically identical to a lit one, or "
		+ "darkness could seal a pocket and strand a 0-pill player.")

	main.set_room_dark(false)
	main.rebuild_collision()
	_check(lit_sig == _collision_signature(col),
		"...and identical again after a full toggle cycle")

	_teardown(ctx)


## The structural half of the same claim, and the stronger one: the collision
## signature would match even if a light-gated subtree DID contain a collider
## (visibility never affects collision in Godot), so identical caches alone do
## not prove the invariant is authored. gen_rooms.py's Room.block refuses to
## emit such a thing; this asserts the emitted scene agrees.
func _test_no_light_gated_collider_exists() -> void:
	var ctx := _make_room()
	var room: Node3D = ctx["room"]

	for lo in _light_objects(room):
		var shapes: Array = []
		_find_all(lo, shapes, func(n: Node) -> bool: return n is CollisionShape3D)
		_check(shapes.is_empty(),
			"%s is light-gated and contains %d CollisionShape3D — the light axis "
				% [(lo as Node).name, shapes.size()]
			+ "gates meshes and raycasts ONLY, never collision")

	_teardown(ctx)


## The audit that the guarantee exists FOR: a 0-pill raw player standing at the
## far end of the bay can always walk back to the dispenser, in either light
## state and in either ward state. Samples the centre-line of the intended
## route rather than pathfinding — the route is a straight run up the middle of
## a room whose only interior obstacles are two wall nooks.
func _test_unmed_walk_back_is_never_blocked() -> void:
	var ctx := _make_room()
	var main: StubMain = ctx["main"]
	var col: WardCollision = ctx["col"]

	var route: Array[Vector2] = []
	var z := -13.5
	while z <= 4.5:
		route.append(Vector2(0.0, z))
		z += 0.5

	for dark in [false, true]:
		main.set_room_dark(dark)
		main.rebuild_collision()
		for state in [StateManager.State.UNMED, StateManager.State.LUCID]:
			for p in route:
				_check(not col.is_blocked_at(p.x, p.y, Tuning.PLAYER_RADIUS, state),
					"walk-back route blocked at (%.1f, %.1f) with dark=%s state=%d — a "
						% [p.x, p.y, dark, state]
					+ "0-pill player must always be able to reach dispenser16a")

	_teardown(ctx)


# --- 4. THE HARD PART: surviving Atmosphere ---------------------------------
#
# core/atmosphere.gd's _tick_flicker writes light_energy on every collected
# light every frame, from snapshots taken in collect_lights. A breaker
# implemented as "set light_energy = 0" is stomped on the very next frame. The
# circuit design folds the off-state into the value the loop DERIVES from
# instead, so this asserts the thing that would actually have broken: does it
# still hold 900 frames later?
func _test_switch_survives_atmosphere_writes() -> void:
	for lucid in [true, false]:
		var ctx := _make_room()
		var main: StubMain = ctx["main"]
		var room: Node3D = ctx["room"]
		var atmos: Atmosphere = ctx["atmos"]
		var label := "lucid" if lucid else "unmed"
		StateManager.force_state(
			StateManager.State.LUCID if lucid else StateManager.State.UNMED, "test")

		var lights := _omni_lights(room)
		_check(lights.size() == 22,
			"room 16 should carry 11 fittings and 11 bounces, found %d lights"
				% lights.size())

		var base: Array[float] = []
		for l in lights:
			base.append((l as OmniLight3D).light_energy)

		# Lit: nothing is dimmed. (The flicker only ever scales a light DOWN, so
		# this is an upper bound, not an equality.)
		_step_atmosphere(atmos, 120)
		for i in lights.size():
			_check((lights[i] as OmniLight3D).light_energy <= base[i] + 0.001,
				"[%s] lit fitting %d must not exceed its authored energy" % [label, i])
		_check(atmos.circuit_scale("bay") > 0.99,
			"[%s] the bay circuit must read as on before the throw" % label)

		main.set_room_dark(true)

		# The fade is a felt ~0.45s ease, not a cut: after two frames the room
		# must still be brighter than its final value.
		_step_atmosphere(atmos, 2)
		_check(atmos.circuit_scale("bay") > Atmosphere.DARK_CIRCUIT_SCALE + 0.3,
			"[%s] the breaker must EASE, not cut — two frames in it is already at %.3f"
				% [label, atmos.circuit_scale("bay")])

		_step_atmosphere(atmos, 900)
		_check(absf(atmos.circuit_scale("bay") - Atmosphere.DARK_CIRCUIT_SCALE) < 0.001,
			"[%s] the bay circuit must settle at DARK_CIRCUIT_SCALE, got %.4f"
				% [label, atmos.circuit_scale("bay")])

		var ceiling := Atmosphere.DARK_CIRCUIT_SCALE + 0.02
		for i in lights.size():
			var e: float = (lights[i] as OmniLight3D).light_energy
			_check(e <= base[i] * ceiling,
				"[%s] 900 frames after the throw, light %d is at %.4f (authored %.4f) — "
					% [label, i, e, base[i]]
				+ "the per-frame flicker writes have stomped the breaker")

		# ...and it comes back. The toggle is two-way for the fittings too.
		#
		# Measured as the PEAK over the window, not as the value on one sampled
		# frame: in unmed the flicker legitimately drops a tube to 10% for up to
		# 0.45s at a time (DROPOUT_MAX_SEC), so an instantaneous read can land
		# inside a dropout and look exactly like a breaker that never came back.
		# What distinguishes them is whether the light ever returns to full,
		# which is what a peak measures.
		main.set_room_dark(false)
		var peak: Array[float] = []
		for _l in lights:
			peak.append(0.0)
		for _f in 900:
			_step_atmosphere(atmos, 1)
			for i in lights.size():
				peak[i] = maxf(peak[i], (lights[i] as OmniLight3D).light_energy)
		for i in lights.size():
			_check(peak[i] > base[i] * 0.5,
				"[%s] light %d must recover when the breaker goes back on, peaked at %.4f"
					% [label, i, peak[i]])

		_teardown(ctx)


func _test_dark_survives_a_room_reload() -> void:
	var ctx := _make_room()
	var main: StubMain = ctx["main"]
	var atmos: Atmosphere = ctx["atmos"]

	main.set_room_dark(true)
	_step_atmosphere(atmos, 900)

	# Tear the room down and build a brand-new instance, exactly as load_room
	# does: fresh nodes, fresh indices, fresh light_energy snapshots. The old
	# room's arrays are gone; nothing that could remember an index survives.
	var old_room: Node3D = ctx["room"]
	old_room.on_leave()
	remove_child(old_room)
	old_room.free()

	var fresh: Node3D = ROOM.instantiate()
	add_child(fresh)
	main.room = fresh
	atmos.collect_lights(fresh)

	# 1. The atmosphere half: the fresh fittings go back down without anyone
	#    re-throwing the switch, because the off-state belongs to the CIRCUIT.
	_check(atmos.circuit_scale("bay") <= Atmosphere.DARK_CIRCUIT_SCALE + 0.001,
		"the bay circuit must still read off after a reload, got %.4f"
			% atmos.circuit_scale("bay"))
	var lights := _omni_lights(fresh)
	var base: Array[float] = []
	for l in lights:
		base.append((l as OmniLight3D).light_energy)
	_step_atmosphere(atmos, 900)
	for i in lights.size():
		_check((lights[i] as OmniLight3D).light_energy <= base[i] * 0.15,
			"after a reload, fresh light %d is at %.4f (authored %.4f) — the breaker "
				% [i, (lights[i] as OmniLight3D).light_energy, base[i]]
			+ "did not survive collect_lights rebuilding every array")

	# 2. The deterministic half: the fresh scene's gated geometry comes up dark
	#    on its own, in _ready, without waiting for a signal — which is what
	#    makes a room's opening frame correct rather than one frame stale.
	for lo in _light_objects(fresh):
		var l := lo as LightObject
		_check(l.is_present() == (l.visible_in_light == LightObject.Filter.DARK),
			"%s in the freshly instanced room must come up matching the CURRENT "
				% l.name + "light state, not its authored default")

	# 3. ...and main.load_room's own rule still wins: resetting the axis for a
	#    room that opens lit puts the next instance back to lit.
	remove_child(fresh)
	fresh.free()
	RoomLight.reset(false)
	var third: Node3D = ROOM.instantiate()
	add_child(third)
	for lo in _light_objects(third):
		var l := lo as LightObject
		_check(l.is_present() == (l.visible_in_light == LightObject.Filter.LIT),
			"%s must come up LIT after RoomLight.reset(false) — no room may inherit "
				% l.name + "the previous room's darkness")
	remove_child(third)
	third.free()

	main.room = null
	var m: Node = ctx["main"]
	remove_child(m)
	m.free()
	var player: Node = ctx["player"]
	remove_child(player)
	player.free()
	atmos.free()
	RoomLight.reset(false)


## Room 16 puts every fitting on one circuit ("the breaker for the whole bay"),
## so the per-zone capability the design doc leaves open is not exercised by any
## room yet. It is exercised here, against the real Atmosphere, so it cannot rot
## before room 17+ needs it.
func _test_circuits_are_independently_switchable() -> void:
	# LUCID deliberately: the unmed flicker path multiplies every fitting by a
	# buzz and a slow wobble with a per-light phase offset, so an untouched
	# light legitimately reads anywhere from 0.76 to 1.0 on a given frame. This
	# test is about circuit ISOLATION, not about the flicker, so it runs in the
	# state that holds the fittings steady.
	StateManager.force_state(StateManager.State.LUCID, "test")
	var host := Node3D.new()
	add_child(host)
	var a := OmniLight3D.new()
	a.light_energy = 1.0
	a.set_meta("circuit", "east")
	host.add_child(a)
	var b := OmniLight3D.new()
	b.light_energy = 1.0
	b.set_meta("circuit", "west")
	host.add_child(b)
	var c := OmniLight3D.new()  # no metadata at all -> the default circuit
	c.light_energy = 1.0
	host.add_child(c)

	var atmos := Atmosphere.new()
	atmos.collect_lights(host)
	var present := atmos.present_circuits()
	_check(present.has("east") and present.has("west")
			and present.has(Atmosphere.DEFAULT_CIRCUIT),
		"three circuits expected (east, west, %s), got %s"
			% [Atmosphere.DEFAULT_CIRCUIT, present])

	atmos.set_circuit_on("east", false)
	_step_atmosphere(atmos, 900)
	_check(a.light_energy < 0.15, "the east fitting must go dark, got %.3f" % a.light_energy)
	_check(b.light_energy > 0.9, "the west fitting must be untouched, got %.3f" % b.light_energy)
	_check(c.light_energy > 0.9,
		"an untagged fitting falls on the default circuit and must be untouched, got %.3f"
			% c.light_energy)

	atmos.free()
	remove_child(host)
	host.free()
	StateManager.force_state(StateManager.State.UNMED, "test")


# --- 5. the 2x2 -------------------------------------------------------------

func _test_cell_lit_unmed() -> void:
	var ctx := _make_room()
	var room: Node3D = ctx["room"]
	var main: StubMain = ctx["main"]
	StateManager.force_state(StateManager.State.UNMED, "test")

	# The ink clue reads (it lives in the unmed Scrawls wrapper, ungated on
	# light — see gen_rooms.py's "faithful port of a discrepancy" note).
	var ink := room.find_child("inkScrawl16", true, false)
	_check(ink != null, "inkScrawl16 must exist")
	var scrawls := room.get_node_or_null("Scrawls") as StateObject
	_check(scrawls != null and scrawls.is_present(),
		"the unmed Scrawls wrapper must be present while raw")

	# The switch refuses raw hands — ROOM policy, and the toast has to say so.
	main.toasts.clear()
	_check(room.on_interact("lightSwitch16"),
		"the room script must fully handle lightSwitch16")
	_check(not RoomLight.is_dark(), "an unmed hand must NOT throw the breaker")
	_check(main.toasts.size() == 1 and str(main.toasts[0]).contains("cold iron"),
		"the refusal must name why: got %s" % [main.toasts])

	# Charge accrues here, and only here — this cell is also the one that earns
	# the dark window.
	main.player.global_position = Vector3(BAY_X, 0, BAY_Z)
	room.tick_light(1.0)
	_check(room.charge() > 0.0, "charge must accrue in the lit open bay")

	_teardown(ctx)


func _test_cell_lit_lucid() -> void:
	var ctx := _make_room()
	var room: Node3D = ctx["room"]
	var main: StubMain = ctx["main"]
	StateManager.force_state(StateManager.State.LUCID, "test")

	# The pivotal action, and the ONLY cell it is available in.
	main.toasts.clear()
	_check(room.on_interact("lightSwitch16"), "lightSwitch16 must be handled")
	_check(RoomLight.is_dark(), "LIT + LUCID is the only cell that can throw the breaker")

	# The lever visibly moved. Cosmetic, but it is the fixture's whole read.
	var lever := room.find_child("Lever", true, false) as Node3D
	_check(lever != null and absf(lever.rotation.x - room.LEVER_DARK) < 0.001,
		"the breaker's lever must swing to its dark position")

	# ...and back, at will. The two-way toggle is the soft-lock fix.
	_check(room.on_interact("lightSwitch16"), "lightSwitch16 must be handled again")
	_check(not RoomLight.is_dark(), "the switch must be a genuine two-way toggle")
	_check(absf(lever.rotation.x - room.LEVER_LIT) < 0.001,
		"the lever must swing back with it")

	# The door refuses while lit, even to lucid hands, and says which half is wrong.
	main.toasts.clear()
	_check(room.on_interact("exitdoor16"), "exitdoor16 must be handled")
	_check(str(main.toasts[0]).contains("flare of white"),
		"the lit refusal must be about the light, not the hands: got %s" % [main.toasts])

	_teardown(ctx)


func _test_cell_dark_unmed() -> void:
	var ctx := _make_room()
	var room: Node3D = ctx["room"]
	var main: StubMain = ctx["main"]

	main.set_room_dark(true)
	StateManager.force_state(StateManager.State.UNMED, "test")

	# The retroactive beat: the phosphor clue was physically there all along and
	# is only now readable, on the same wall the ink clue is on.
	var phos := room.find_child("phosphorScrawl16", true, false) as Node3D
	var ink := room.find_child("inkScrawl16", true, false) as Node3D
	_check(phos != null and ink != null, "both nook scrawls must exist")
	_check((phos.get_parent() as LightObject).is_present(),
		"phosphorScrawl16 must be readable in DARK + UNMED")
	_check(absf(phos.global_position.x - ink.global_position.x) < 0.001,
		"both clues must sit on the SAME nook wall (the chamber's end cap) — the "
		+ "beat is that the wall you already looked at has more on it")

	# The painted path appears with it.
	var tiles := 0
	for n in _phosphor_nodes(room):
		if n is MeshInstance3D and (n as Node3D).is_visible_in_tree():
			tiles += 1
	_check(tiles == 5, "all five phosphor floor tiles must be visible once dark, got %d" % tiles)

	# Raw hands still cannot work the breaker, dark or not.
	main.toasts.clear()
	room.on_interact("lightSwitch16")
	_check(RoomLight.is_dark(), "an unmed hand must not throw the breaker back either")

	# Nor open the door.
	main.toasts.clear()
	room.on_interact("exitdoor16")
	_check(str(main.toasts[0]).contains("isn't yours to open"),
		"the unmed refusal must be about the hands: got %s" % [main.toasts])

	_teardown(ctx)


func _test_cell_dark_lucid() -> void:
	var ctx := _make_room()
	var room: Node3D = ctx["room"]
	var main: StubMain = ctx["main"]
	var col: WardCollision = ctx["col"]

	main.set_room_dark(true)
	StateManager.force_state(StateManager.State.LUCID, "test")

	_check(col.is_blocked_at(DOOR_X, DOOR_Z, Tuning.PLAYER_RADIUS, StateManager.State.LUCID),
		"the doorway must be blocked before the door answers")

	main.toasts.clear()
	_check(room.on_interact("exitdoor16"), "exitdoor16 must be handled")
	# Asserted against WardCollision, not against a toast: StateObject does not
	# flip collision layers and a screenshot of an open door proves nothing.
	_check(not col.is_blocked_at(DOOR_X, DOOR_Z, Tuning.PLAYER_RADIUS,
			StateManager.State.LUCID),
		"DARK + LUCID must actually make the doorway walkable")
	_check(main.objectives.size() > 0
			and str(main.objectives[-1]).contains("kept its half"),
		"opening the door must close the objective out")

	_teardown(ctx)


## The claim the whole room rests on, asserted as an exclusion rather than an
## example: three of the four cells must leave the doorway solid.
func _test_door_opens_in_exactly_one_cell() -> void:
	for dark in [false, true]:
		for lucid in [false, true]:
			var ctx := _make_room()
			var room: Node3D = ctx["room"]
			var main: StubMain = ctx["main"]
			var col: WardCollision = ctx["col"]

			main.set_room_dark(dark)
			StateManager.force_state(
				StateManager.State.LUCID if lucid else StateManager.State.UNMED, "test")
			room.on_interact("exitdoor16")

			var open: bool = not col.is_blocked_at(DOOR_X, DOOR_Z, Tuning.PLAYER_RADIUS,
				StateManager.State.LUCID if lucid else StateManager.State.UNMED)
			var want: bool = dark and lucid
			_check(open == want,
				"cell dark=%s lucid=%s: door open=%s, expected %s" % [dark, lucid, open, want])

			_teardown(ctx)


# --- 6. charge and fade -----------------------------------------------------

func _test_charge_only_accrues_in_the_lit_open_bay() -> void:
	var ctx := _make_room()
	var room: Node3D = ctx["room"]
	var main: StubMain = ctx["main"]

	# Inside both nooks, and inside Z1 and Z3, are all excluded: cover and safe
	# ground must not also be progress.
	var excluded := {
		"NOOK_W": Vector2(-9.6, -7.7),
		"NOOK_E": Vector2(10.0, -4.0),
		"Z1 vestibule": Vector2(0.0, 4.0),
		"Z3 exit vestibule": Vector2(0.0, -15.0),
	}
	for name: String in excluded:
		var p: Vector2 = excluded[name]
		_check(not room.in_charge_zone(p.x, p.y), "%s must NOT count toward charge" % name)
	_check(room.in_charge_zone(BAY_X, BAY_Z), "the open bay must count toward charge")

	main.player.global_position = Vector3(BAY_X, 0, BAY_Z)
	room.tick_light(9.0)
	_check(absf(room.charge() - 0.5) < 0.01,
		"9s of 18s should read as half charge, got %.3f" % room.charge())

	# Nothing accrues while dark: the paint drinks light, and there is none.
	StateManager.force_state(StateManager.State.LUCID, "test")
	room.on_interact("lightSwitch16")
	var before: float = room.charge()
	room.tick_light(5.0)
	_check(absf(room.charge() - before) < 0.0001, "charge must not accrue while dark")

	# ...and it never DECREASES, so relighting and feeding it more is a strictly
	# better retry rather than a formality.
	room.on_interact("lightSwitch16")
	_check(room.charge() >= before, "charge must never decrease")

	_teardown(ctx)


## The fade dial is opacity and nothing else — the assertion that keeps it from
## quietly becoming a second, invisible gate.
func _test_fade_is_cosmetic_only() -> void:
	var ctx := _make_room()
	var room: Node3D = ctx["room"]
	var main: StubMain = ctx["main"]
	var col: WardCollision = ctx["col"]

	main.player.global_position = Vector3(BAY_X, 0, BAY_Z)
	StateManager.force_state(StateManager.State.LUCID, "test")
	room.tick_light(9.0)   # half charge -> a 13s window
	room.on_interact("lightSwitch16")
	_check(RoomLight.is_dark(), "the breaker should be thrown")
	_check(absf(WardPhosphor.level_of(room) - 1.0) < 0.001,
		"the paint starts a dark phase at full brightness")

	var sig_before := _collision_signature(col)

	room.tick_light(6.5)
	var half := WardPhosphor.level_of(room)
	_check(absf(half - 0.5) < 0.02,
		"half a half-charge window in, the paint should read ~0.5, got %.3f" % half)

	room.tick_light(20.0)  # well past the end of the window
	_check(absf(WardPhosphor.level_of(room)) < 0.001, "the paint must fade to nothing")

	# Faded to nothing, everything mechanical is untouched:
	_check(sig_before == _collision_signature(col),
		"fading must not move a single collider")
	for lo in _light_objects(room):
		var l := lo as LightObject
		_check(l.is_present() == (l.visible_in_light == LightObject.Filter.DARK),
			"%s: a fully-faded room must still be exactly as DARK as before — the "
				% l.name + "fade dial is not a second light gate")
	_check(room.on_interact("exitdoor16"), "exitdoor16 must still be handled")
	_check(not col.is_blocked_at(DOOR_X, DOOR_Z, Tuning.PLAYER_RADIUS,
			StateManager.State.LUCID),
		"THE DOOR MUST STILL OPEN AT ZERO PAINT. It is gated on darkness, not on "
		+ "how much of the glow is left — otherwise the fade would be a soft-lock.")

	_teardown(ctx)


func _test_catch_resets_light_and_charge() -> void:
	var ctx := _make_room()
	var room: Node3D = ctx["room"]
	var main: StubMain = ctx["main"]

	main.player.global_position = Vector3(BAY_X, 0, BAY_Z)
	StateManager.force_state(StateManager.State.LUCID, "test")
	room.tick_light(9.0)
	room.on_interact("lightSwitch16")
	room.tick_light(4.0)
	_check(RoomLight.is_dark() and room.charge() > 0.0, "set up: dark and part-charged")

	room._on_caught()

	_check(not RoomLight.is_dark(),
		"a catch must force the room back to LIT — nobody resumes in a half-dark limbo")
	_check(room.charge() == 0.0, "a catch must zero the charge")
	_check(absf(WardPhosphor.level_of(room) - 1.0) < 0.001,
		"a catch must reset the fade dial, not leave the paint mid-fade")
	var lever := room.find_child("Lever", true, false) as Node3D
	_check(lever != null and absf(lever.rotation.x - room.LEVER_LIT) < 0.001,
		"the lever must read lit again after a catch")
	_check(main.teleports.size() == 1 and main.teleports[0] == Vector2(room.SPAWN_X, room.SPAWN_Z),
		"a catch must teleport to spawn")

	_teardown(ctx)


# --- 7. what darkness does NOT do -------------------------------------------
#
# The spec's decision, argued at length and landed on deliberately: darkness
# changes nothing about the orderly's sight math. This asserts it behaviourally
# rather than by reading the constants — two identical setups, one lit and one
# dark, ticked the same number of times, must produce the same watch ramp.
func _test_orderly_perception_is_unaffected_by_darkness() -> void:
	var readings: Array[float] = []
	var positions: Array[Vector3] = []

	for dark in [false, true]:
		var ctx := _make_room(false)
		var room: Node3D = ctx["room"]
		var main: StubMain = ctx["main"]
		if dark:
			main.set_room_dark(true)
		StateManager.force_state(StateManager.State.UNMED, "test")

		var orderly: CharacterBody3D = null
		for child in room.get_children():
			if child is CharacterBody3D:
				orderly = child
		_check(orderly != null, "room 16 must carry exactly one orderly")
		if orderly == null:
			_teardown(ctx)
			return

		_check(orderly.sight_range == Tuning.ORDERLY_SIGHT_RANGE,
			"darkness must not widen his sight range")
		_check(orderly.cone_deg == Tuning.ORDERLY_CONE_DEG,
			"darkness must not widen his cone")

		# Park the player dead in front of him, on his opening leg.
		main.player.global_position = Vector3(5.0, 0.0, -1.5)
		for _i in 60:
			orderly._physics_process(1.0 / 60.0)
		readings.append(orderly.watching())
		positions.append(orderly.global_position)

		_teardown(ctx)

	_check(absf(readings[0] - readings[1]) < 0.0001,
		"his watch ramp must be identical lit (%.4f) and dark (%.4f) — the spec's "
			% [readings[0], readings[1]]
		+ "decision is 'no change', because the cues a player reacts to (his cone, "
		+ "the threat meter) are unshaded and already read the same at 12% light")
	_check(positions[0].is_equal_approx(positions[1]),
		"...and he must walk exactly the same route in the dark")


# --- 8. patrol clearance ----------------------------------------------------
# Re-run here because room 16 is not in ROOM_SCENES yet and check_rooms.gd only
# walks the registry.

func _test_patrol_clearance() -> void:
	var ctx := _make_room()
	var col: WardCollision = ctx["col"]
	var script: GDScript = load("res://rooms/room16/room16.gd")
	var need := Tuning.ORDERLY_RADIUS + PATROL_MARGIN

	var routes: Array = []
	for key: String in script.get_script_constant_map():
		if not key.begins_with("WAYPOINTS"):
			continue
		var v: Variant = script.get_script_constant_map()[key]
		if v is Array and not (v as Array).is_empty():
			routes.append([key, v])
	_check(not routes.is_empty(), "room 16 must declare at least one WAYPOINTS route")

	for route in routes:
		var pts: Array = route[1]
		for i in pts.size():
			var a: Vector3 = pts[i]
			var c: Vector3 = pts[(i + 1) % pts.size()]
			for b in col.boxes:
				if b.state_filter != -1:
					continue
				_check(_point_box_dist(a.x, a.z, b) >= need,
					"%s waypoint %d (%.2f,%.2f) is under %.2fm from a collider"
						% [route[0], i, a.x, a.z, need])
				_check(_seg_box_dist(a.x, a.z, c.x, c.z, b) >= need,
					"%s leg %d is under %.2fm from collider x[%.2f,%.2f] z[%.2f,%.2f]"
						% [route[0], i, need, b.min_x, b.max_x, b.min_z, b.max_z])

	_teardown(ctx)


func _point_box_dist(x: float, z: float, b) -> float:
	var dx := maxf(maxf(b.min_x - x, 0.0), x - b.max_x)
	var dz := maxf(maxf(b.min_z - z, 0.0), z - b.max_z)
	return sqrt(dx * dx + dz * dz)


func _point_seg_dist(px: float, pz: float, x0: float, z0: float, x1: float, z1: float) -> float:
	var dx := x1 - x0
	var dz := z1 - z0
	var len_sq := dx * dx + dz * dz
	var t := 0.0
	if len_sq > 0.0:
		t = clampf(((px - x0) * dx + (pz - z0) * dz) / len_sq, 0.0, 1.0)
	return Vector2(px - (x0 + t * dx), pz - (z0 + t * dz)).length()


func _seg_hits_box(x0: float, z0: float, x1: float, z1: float, b) -> bool:
	var t0 := 0.0
	var t1 := 1.0
	var dx := x1 - x0
	var dz := z1 - z0
	var p := [-dx, dx, -dz, dz]
	var q := [x0 - b.min_x, b.max_x - x0, z0 - b.min_z, b.max_z - z0]
	for i in 4:
		if p[i] == 0.0:
			if q[i] < 0.0:
				return false
		else:
			var r: float = q[i] / p[i]
			if p[i] < 0.0:
				if r > t1:
					return false
				if r > t0:
					t0 = r
			else:
				if r < t0:
					return false
				if r < t1:
					t1 = r
	return true


func _seg_box_dist(x0: float, z0: float, x1: float, z1: float, b) -> float:
	if _seg_hits_box(x0, z0, x1, z1, b):
		return 0.0
	var best := minf(_point_box_dist(x0, z0, b), _point_box_dist(x1, z1, b))
	for c in [[b.min_x, b.min_z], [b.max_x, b.min_z], [b.max_x, b.max_z], [b.min_x, b.max_z]]:
		best = minf(best, _point_seg_dist(c[0], c[1], x0, z0, x1, z1))
	return best


func _finish() -> void:
	print("")
	print("test_room16: %d assertion(s) passed" % passes)
	if failures.is_empty():
		print("  OK - the light axis and room 16 hold")
	else:
		for f in failures:
			print("  FAIL  %s" % f)
		print("  %d failure(s)" % failures.size())
	print("")
	get_tree().quit(0 if failures.is_empty() else 1)
