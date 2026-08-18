# Behavioural tests for ROOM 14 — the Hold.
#
#   godot --headless --path godot tools/test_room14.tscn
#
# tools/test_triggers.gd proves the PRIMITIVE behaves (strict containment, the
# set-diff, the state filter, a plate with no collider, a gate that defers).
# This proves ROOM 14's USE of it behaves — which is the part the 84 assertions
# behind the primitive say nothing about, and the part a screenshot cannot show:
#
#   1. the room is authored the way its audits assume (plate rect, the 1.38m
#      plate-to-gate gap, an unfiltered plate, a patrol line that crosses it,
#      no keypad)
#   2. the plate is walkable in both ward states and his patrol leg is clear
#      end to end at his own body radius
#   3. THE GATE ACTUALLY GATES — the doorway is solid when shut and walkable
#      when open, asserted against the collision cache the movement solver
#      queries, because StateObject does not flip collision layers and a
#      screenshot of an open door proves nothing
#   4. stepping on the plate opens it, and it stays open for as long as weight
#      sits there
#   5. it does NOT close while a body stands in its own footprint (the freeze),
#      and closes on exactly one frame once clear
#   6. HIS WEIGHT IS YOUR WEIGHT: player and orderly are one occupancy count,
#      so the handover never flickers the gate shut
#   7. his ordinary patrol, with no player input anywhere, opens the gate and
#      lets it close behind him — route B, end to end, on real physics ticks
extends Node

const ROOM := preload("res://rooms/room14/room14.tscn")
const STUB_PLAYER := preload("res://tools/test_stub_player.gd")

const TICK := 1.0 / 60.0

# The gate's opening, and a point dead centre in it.
const GATE_X := 0.0
const GATE_Z := -14.0
# The wall the gate sits in is 0.24m thick, so its room-side face is here.
const GATE_FACE_Z := -13.88

var failures: Array[String] = []
var passes := 0


# The narrow slice of main.gd a room script is allowed to touch. Records what
# the room asked for instead of doing it to a real HUD.
class StubMain:
	extends Node
	var player: Node3D = null
	var collision: WardCollision = null
	var room: Node3D = null
	var toasts: Array = []
	var objectives: Array = []
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
		if player != null:
			player.global_position = Vector3(x, 0.0, z)

	func move_interactable(id: String, pos: Vector3, rot_y := 0.0) -> void:
		var node := _find(room, id)
		if node != null:
			node.global_position = pos
			node.rotation.y = rot_y

	func rebuild_collision() -> void:
		if collision != null and room != null:
			collision.rebuild_from(room)

	func _find(node: Node, id: String) -> Interactable:
		if node is Interactable and (node as Interactable).interactable_id == id:
			return node as Interactable
		for child in node.get_children():
			var found := _find(child, id)
			if found != null:
				return found
		return null


func _ready() -> void:
	# Keep the console to test output; the room emits gate_open/gate_close.
	Telemetry.disabled = true
	StateManager.force_state(StateManager.State.UNMED, "test")

	_test_authoring_invariants()
	_test_plate_is_walkable_and_his_lane_is_clear()
	_test_no_fitting_is_sealed_inside_geometry()
	_test_gate_actually_gates()
	_test_player_holds_the_gate()
	_test_gate_never_closes_onto_a_body()
	_test_weight_is_a_union()
	await _test_orderly_carries_the_plate()
	_finish()


func _check(cond: bool, what: String) -> void:
	if cond:
		passes += 1
	else:
		failures.append(what)


# --- fixtures --------------------------------------------------------------

## A live room with a stub main behind it. `frozen` disables the room's and the
## orderly's own _physics_process so the test drives every tick by hand and the
## timings below are exact rather than approximate; the orderly is parked on the
## west end of his line, well off the plate and well clear of the gate.
func _make_room(frozen: bool) -> Dictionary:
	var world := Node3D.new()
	add_child(world)

	var player := Node3D.new()
	player.set_script(STUB_PLAYER)
	add_child(player)
	player.global_position = Vector3(0.0, 0.0, 6.0)

	var room: Node3D = ROOM.instantiate()
	world.add_child(room)

	var main := StubMain.new()
	main.player = player
	main.room = room
	main.collision = WardCollision.new()
	add_child(main)
	main.collision.rebuild_from(room)

	room.on_enter(main)

	if frozen:
		room.set_physics_process(false)
		var orderly: Node3D = room._orderly
		orderly.set_physics_process(false)
		orderly.global_position = Vector3(-4.2, 0.0, -11.9)

	return {"world": world, "room": room, "player": player, "main": main}


func _teardown(f: Dictionary) -> void:
	(f["world"] as Node).queue_free()
	(f["player"] as Node).queue_free()
	(f["main"] as Node).queue_free()


## Drive `seconds` of the room's own tick by hand, returning how many frames the
## gate transitioned from open to shut on. "Exactly one" is the property that
## matters: a gate that reports a close every frame would re-lock the collider
## and rebuild the collision cache forever.
func _tick(room: Node3D, seconds: float) -> int:
	var frames := int(round(seconds / TICK))
	var closes := 0
	var was: bool = room.is_gate_open()
	for _i in frames:
		room._physics_process(TICK)
		var now: bool = room.is_gate_open()
		if was and not now:
			closes += 1
		was = now
	return closes


# --- 1. authoring ----------------------------------------------------------

# The numbers this room's design audits quote, asserted against the generated
# scene. Every one of these is load-bearing: widening the plate northward or
# moving the gate wall south deletes the failure the room exists to produce.
func _test_authoring_invariants() -> void:
	var room: Node3D = ROOM.instantiate()
	add_child(room)

	var plate := TriggerVolume.find_in(room, "plate14")
	_check(plate != null, "room14 must carry a plate14 trigger volume")
	var vestibule := TriggerVolume.find_in(room, "vestibule14")
	_check(vestibule != null, "room14 must carry the vestibule14 trigger")

	if plate != null:
		# A state-filtered plate simply would not exist in one ward state, which
		# would break the "go lucid, let him carry it, zero risk" route the room
		# is built to teach. The state is the tool here, not a gate on the
		# mechanism — see the spec, which calls this out as a considered choice.
		_check(plate.states == TriggerVolume.States.BOTH,
			"THE PLATE MUST NOT BE STATE-FILTERED — a filtered plate deletes "
			+ "the lucid route the room exists to teach")
		_check(is_equal_approx(plate.min_x, -1.3) and is_equal_approx(plate.max_x, 1.3)
				and is_equal_approx(plate.min_z, -12.5) and is_equal_approx(plate.max_z, -11.3),
			"the plate rect must stay the audited x[-1.3,1.3] z[-12.5,-11.3]")

		# THE TEACH, AS A NUMBER. Being on the plate and being through the gate
		# have to be mutually exclusive, and the run between them has to be
		# runnable inside the settle window with real margin rather than a
		# frame-perfect trick.
		var gap: float = absf(GATE_FACE_Z - plate.min_z)
		_check(absf(gap - 1.38) < 0.0001,
			"the plate-to-gate gap must stay 1.38m (got %.3f)" % gap)
		var coverage: float = DeferredGate.DEFAULT_SETTLE_SEC * Tuning.PLAYER_SPEED
		_check(coverage > gap + 0.24,
			"the settle window must cover the run plus the wall band "
			+ "(%.2fm of coverage vs %.2fm needed)" % [coverage, gap + 0.24])
		_check(coverage < 2.0 * (gap + 0.24),
			"but not so generously that the naive 'step off and stroll' never "
			+ "fails — the first failure IS the teach")

		# HIS LINE MUST CROSS THE PLATE. Route B is the room's best moment and
		# it is entirely a function of these four numbers agreeing.
		var wps: Array = room.WAYPOINTS
		_check(wps.size() == 2, "one orderly, a two-waypoint back-and-forth line")
		if wps.size() == 2:
			var a: Vector3 = wps[0]
			var b: Vector3 = wps[1]
			_check(is_equal_approx(a.z, b.z), "his leg must be a straight z-constant line")
			_check(a.z > plate.min_z and a.z < plate.max_z,
				"his patrol line must run THROUGH the plate, not past it "
				+ "(z = %.2f vs plate z[%.2f,%.2f])" % [a.z, plate.min_z, plate.max_z])
			_check(a.x < plate.min_x and b.x > plate.max_x,
				"and clean through it — he must enter one side and leave the other")

	if vestibule != null and plate != null:
		# The "through" beat has to land past the gate, not in front of it.
		_check(vestibule.max_z < -14.1,
			"the vestibule trigger must sit entirely beyond the gate")

	# No keypad and no code — the gate is opened by weight and by nothing else.
	var types: Array = []
	var ids: Array = []
	_collect_interactables(room, types, ids)
	_check(not types.has("keypad"),
		"room 14 has NO keypad: a keypad here would give a route that skips the "
		+ "plate entirely")
	_check(types.has("dispenser"),
		"the entry alcove's dispenser is the room's whole reassurance beat")
	_check(ids.has("gate14"), "the gate fixture must exist to be swung")

	var exit := room.get_node_or_null("Exits/Exit0")
	# Room 15 is not ported yet, so room14 is currently the chain terminator and
	# exits to "END" — check_rooms.gd fails on an exit to an unregistered room.
	# Keyed off the registry rather than hard-coded, so this assertion tightens
	# by itself the moment room15 lands instead of needing to be remembered.
	var room15_exists: bool = load("res://main.gd").ROOM_SCENES.has("room15")
	var want := "room15" if room15_exists else "END"
	_check(exit != null and str(exit.exit_to) == want,
		"room14 must exit to %s (room15 registered: %s)" % [want, room15_exists])

	room.queue_free()


func _collect_interactables(node: Node, types: Array, ids: Array) -> void:
	if node is Interactable:
		types.append((node as Interactable).interactable_type)
		ids.append((node as Interactable).interactable_id)
	for child in node.get_children():
		_collect_interactables(child, types, ids)


# --- 2. the plate is floor ------------------------------------------------

# A plate with a collider is an obstacle: the player trips on the mechanic and,
# worse, the orderly's patrol paths around the exact rectangle he is supposed to
# walk over, which silently deletes route B.
func _test_plate_is_walkable_and_his_lane_is_clear() -> void:
	var room: Node3D = ROOM.instantiate()
	add_child(room)
	var col := WardCollision.new()
	col.rebuild_from(room)
	var plate := TriggerVolume.find_in(room, "plate14")
	var r := Tuning.PLAYER_RADIUS

	for state in [StateManager.State.UNMED, StateManager.State.LUCID]:
		var sn: String = "unmed" if state == StateManager.State.UNMED else "lucid"
		_check(not col.is_blocked_at(0.0, -11.9, r, state),
			"THE MECHANIC: the plate centre must be walkable while %s" % sn)
		_check(not col.is_blocked_at(1.2, -11.4, r, state),
			"the plate's far corner must be walkable while %s" % sn)

	for b in col.boxes:
		_check(not (b.min_x > -1.4 and b.max_x < 1.4 and b.min_z > -12.6 and b.max_z < -11.2),
			"no collider may exist inside the plate footprint")

	# His whole leg, sampled at his own body radius: the crate, both side walls
	# and the plate itself all have to leave it clear, or he never crosses.
	var wps: Array = room.WAYPOINTS
	var a: Vector3 = wps[0]
	var b2: Vector3 = wps[1]
	var blocked := 0
	for i in 201:
		var t: float = float(i) / 200.0
		var x: float = lerpf(a.x, b2.x, t)
		if col.is_blocked_at(x, a.z, Tuning.ORDERLY_RADIUS, StateManager.State.UNMED):
			blocked += 1
	_check(blocked == 0,
		"his patrol leg must be clear end to end at his 0.4m radius "
		+ "(%d/201 samples blocked)" % blocked)

	if plate != null:
		# And the crossing has to be long enough to be a usable window: 2.6m at
		# 1.5 m/s is 1.73s on the plate, plus the 0.7s tail.
		var transit: float = (plate.max_x - plate.min_x) / Tuning.ORDERLY_SPEED
		_check(transit + DeferredGate.DEFAULT_SETTLE_SEC > 2.0,
			"his crossing plus the settle must leave a usable window for route B "
			+ "(got %.2fs)" % (transit + DeferredGate.DEFAULT_SETTLE_SEC))

	room.queue_free()


# --- 3. fittings ----------------------------------------------------------

# Room 12 shipped a shadow-casting fitting sealed inside a gate panel, where it
# lit nothing and cost a full cube-map render every frame. Cheap to assert.
func _test_no_fitting_is_sealed_inside_geometry() -> void:
	var room: Node3D = ROOM.instantiate()
	add_child(room)
	var col := WardCollision.new()
	col.rebuild_from(room)

	var lights := room.get_node_or_null("Lights")
	_check(lights != null, "room14 must have fittings")
	if lights != null:
		for light in lights.get_children():
			var p: Vector3 = (light as Node3D).position
			for state in [StateManager.State.UNMED, StateManager.State.LUCID]:
				_check(not col.is_blocked_at(p.x, p.z, 0.0, state),
					"fitting %s sits inside solid geometry at (%.2f, %.2f)"
						% [light.name, p.x, p.z])

	room.queue_free()


# --- 4. the gate really is a collider ------------------------------------

# StateObject does not flip collision layers and a screenshot of a swung door
# proves nothing about movement. This is the runtime probe: the same cache
# WardCollision.try_move queries, before and after.
func _test_gate_actually_gates() -> void:
	var f := _make_room(true)
	var room: Node3D = f["room"]
	var main: StubMain = f["main"]
	var col: WardCollision = main.collision
	var r := Tuning.PLAYER_RADIUS

	for state in [StateManager.State.UNMED, StateManager.State.LUCID]:
		var sn: String = "unmed" if state == StateManager.State.UNMED else "lucid"
		_check(col.is_blocked_at(GATE_X, GATE_Z, r, state),
			("the shut gate must be SOLID while %s — nothing in this room is "
			+ "state-filtered, so it blocks in both") % sn)

	(f["player"] as Node3D).global_position = Vector3(0.0, 0.0, -11.9)
	room.on_trigger_enter("plate14")
	for state in [StateManager.State.UNMED, StateManager.State.LUCID]:
		_check(not col.is_blocked_at(GATE_X, GATE_Z, r, state),
			"the open gate must be WALKABLE — a door that swings but still "
			+ "blocks is the bug a screenshot cannot see")

	_teardown(f)


# --- 5. hold, and release --------------------------------------------------

func _test_player_holds_the_gate() -> void:
	var f := _make_room(true)
	var room: Node3D = f["room"]
	var main: StubMain = f["main"]
	var player: Node3D = f["player"]
	var col: WardCollision = main.collision
	var r := Tuning.PLAYER_RADIUS

	_check(not room.is_gate_open(), "the room must open with the gate shut")
	_check(main.objectives.has("the wing goes on. so does he."),
		"on_enter must set the room's objective")

	player.global_position = Vector3(0.0, 0.0, -11.9)
	room.on_trigger_enter("plate14")
	_check(room.is_gate_open(), "stepping on the plate must open the gate")
	_check(main.toasts.has("the floor remembers weight. the door remembers the floor."),
		"the first open must teach the mechanism, whoever tripped it")

	# Three seconds of standing on it — four times the settle window.
	_check(_tick(room, 3.0) == 0,
		"the gate must stay open for as long as weight sits on the plate")
	_check(room.is_gate_open(), "and still be open at the end of it")

	# The solo sprint: off the plate, into the gap, gate still open behind them.
	player.global_position = Vector3(0.0, 0.0, -13.2)
	room.on_trigger_exit("plate14")
	_check(_tick(room, 0.5) == 0,
		"the settle window must hold the gate open after the last body leaves")
	_check(room.is_gate_open(), "0.5s into a 0.7s settle it is still open")

	_check(_tick(room, 0.3) == 1,
		"and it must close on EXACTLY one frame once the settle elapses")
	_check(not room.is_gate_open(), "the gate must be shut after the settle")
	_check(col.is_blocked_at(GATE_X, GATE_Z, r, StateManager.State.UNMED),
		"and SOLID again — a gate that never re-locks is not a gate, and the "
		+ "room's whole failure case disappears with it")

	# Nothing may keep firing afterwards.
	_check(_tick(room, 2.0) == 0, "a closed gate must not keep closing")

	_teardown(f)


# --- 6. THE FREEZE ---------------------------------------------------------

# Closing the collider onto a body already inside its bounds freezes that body:
# the axis-separated resolver blocks every direction once the position
# penetrates an AABB, and there is no push-out. For the player that is an
# unrecoverable soft-lock, in the one room whose entire mechanic is a collider
# that comes back.
func _test_gate_never_closes_onto_a_body() -> void:
	var f := _make_room(true)
	var room: Node3D = f["room"]
	var main: StubMain = f["main"]
	var player: Node3D = f["player"]
	var col: WardCollision = main.collision
	var r := Tuning.PLAYER_RADIUS

	player.global_position = Vector3(0.0, 0.0, -11.9)
	room.on_trigger_enter("plate14")
	_check(room.is_gate_open(), "setup: on the plate, gate open")

	# The player made the run and is standing IN the doorway when it empties.
	player.global_position = Vector3(0.0, 0.0, GATE_Z)
	room.on_trigger_exit("plate14")

	_check(_tick(room, 3.0) == 0,
		"THE SOFT-LOCK: the gate must never close onto a body inside its own "
		+ "footprint, however long it waits")
	_check(room.is_gate_open(), "it must still be open after 3s of deferring")
	_check(room._gate.is_deferred(),
		"and must report that it is deferring rather than silently doing nothing")
	_check(not col.is_blocked_at(0.0, GATE_Z, r, StateManager.State.UNMED),
		"the player standing in the doorway must still have a legal move")

	# One step clear and it closes immediately — the countdown ran while it was
	# blocked, so there is no second settle to sit through.
	player.global_position = Vector3(0.0, 0.0, -15.0)
	_check(_tick(room, 2.0 * TICK) == 1,
		"and it must close immediately once clear, with no second settle")
	_check(col.is_blocked_at(GATE_X, GATE_Z, r, StateManager.State.UNMED),
		"the gate is solid again, and the player is on the far side of it")

	# The same rule has to catch him. A wedged orderly is only a visual bug, but
	# it is the identical check and it must not be player-only.
	var orderly: Node3D = room._orderly
	player.global_position = Vector3(0.0, 0.0, -11.9)
	room.on_trigger_enter("plate14")
	player.global_position = Vector3(0.0, 0.0, -11.0)
	room.on_trigger_exit("plate14")
	orderly.global_position = Vector3(0.5, 0.0, GATE_Z)
	_check(_tick(room, 3.0) == 0,
		"an orderly in the footprint must defer the close exactly like the player")
	orderly.global_position = Vector3(-4.2, 0.0, -11.9)
	_check(_tick(room, 2.0 * TICK) == 1, "and releasing it must close the gate")

	_teardown(f)


# --- 7. his weight is your weight -----------------------------------------

# One occupancy count, shared by the engine-polled player and the room-polled
# orderly. If they were separate the handover would flicker the gate shut for a
# frame, which is exactly long enough to re-lock the collider in the player's
# face mid-run.
func _test_weight_is_a_union() -> void:
	var f := _make_room(true)
	var room: Node3D = f["room"]
	var player: Node3D = f["player"]
	var orderly: Node3D = room._orderly

	player.global_position = Vector3(-0.8, 0.0, -11.9)
	room.on_trigger_enter("plate14")
	orderly.global_position = Vector3(0.8, 0.0, -11.9)
	# The room runs the identical containment test against him itself — the
	# engine has never known about orderlies.
	room._physics_process(TICK)
	_check(room._occupants == 2,
		"player and orderly must both count as weight (got %d)" % int(room._occupants))

	player.global_position = Vector3(0.0, 0.0, -13.2)
	room.on_trigger_exit("plate14")
	_check(room._occupants == 1, "the player leaving must drop the count to one")
	_check(_tick(room, 2.0) == 0,
		"HIS WEIGHT IS YOUR WEIGHT: the gate must stay open while he stands on "
		+ "the plate, long past the settle window that would otherwise shut it")
	_check(room.is_gate_open(), "and still be open")

	orderly.global_position = Vector3(2.0, 0.0, -11.9)
	room._physics_process(TICK)
	_check(room._occupants == 0, "him walking off must empty the plate")
	_check(_tick(room, 0.5) == 0, "his exit must start the same settle, not an instant close")
	_check(_tick(room, 0.3) == 1, "and then the gate closes")

	_teardown(f)


# --- 8. route B, for real --------------------------------------------------

# No player input anywhere in this test. He walks his ordinary patrol, on real
# physics ticks, and the gate opens because he stepped on the plate — the thing
# the room is actually about.
func _test_orderly_carries_the_plate() -> void:
	StateManager.force_state(StateManager.State.UNMED, "test")
	var f := _make_room(false)
	var room: Node3D = f["room"]
	var main: StubMain = f["main"]
	var player: Node3D = f["player"]
	var orderly: Node3D = room._orderly
	var plate := TriggerVolume.find_in(room, "plate14")

	# Far outside the room: he can neither see nor catch anyone, and the player
	# is nowhere near the plate or the gate.
	player.global_position = Vector3(90.0, 0.0, 90.0)
	_check(not room.is_gate_open(), "setup: the gate starts shut and stays shut")

	var opened := false
	for _i in 900:
		await get_tree().physics_frame
		if room.is_gate_open():
			opened = true
			break
	_check(opened, "HIS PATROL MUST OPEN THE GATE with no player input at all")
	if opened:
		var o: Vector3 = orderly.global_position
		_check(plate.contains(o.x, o.z, StateManager.State.UNMED),
			"and he must be standing ON the plate when it opens (he was at "
			+ "%.2f, %.2f)" % [o.x, o.z])
		_check(main.toasts.has("the floor remembers weight. the door remembers the floor."),
			"the mechanism toast must fire even when he is the one who tripped it")

	var closed := false
	for _i in 900:
		await get_tree().physics_frame
		if not room.is_gate_open():
			closed = true
			break
	_check(closed, "and it must close again behind him once he walks off")
	if closed:
		var o2: Vector3 = orderly.global_position
		_check(not plate.contains(o2.x, o2.z, StateManager.State.UNMED),
			"he must be clear of the plate when it closes")

	_teardown(f)


func _finish() -> void:
	print("")
	print("test_room14: %d assertion(s) passed" % passes)
	if failures.is_empty():
		print("  OK - room 14's plate, gate and orderly weight behave as ported")
	else:
		for fail in failures:
			print("  FAIL  %s" % fail)
		print("  %d failure(s)" % failures.size())
	print("")
	get_tree().quit(0 if failures.is_empty() else 1)
