# Behavioural tests for trigger volumes, the per-frame poll, pressure plates and
# the deferred gate.
#
#   godot --headless --path godot tools/test_triggers.tscn
#
# check_rooms proves triggers are AUTHORED correctly (unique ids, no degenerate
# rects). This proves the primitive BEHAVES the way rooms 14 and 20 reason about
# it — every property in this file is one a room's soft-lock audit depends on:
#
#   1. containment is STRICT point-in-rect on XZ (a body on the boundary is out)
#   2. enter fires once on entry and never again while the body stays inside
#   3. exit fires once on leaving
#   4. a state-filtered trigger fires its exit on a ward-state change with NO
#      movement at all
#   5. a room load clears the active set WITHOUT firing exit callbacks
#   6. the poll runs BEFORE the room's own _physics_process, on the same tick
#   7. a generated pressure plate is never solid, in either ward state, and its
#      mesh footprint matches its trigger rect exactly
#   8. a deferred gate refuses to close while a body overlaps its footprint,
#      and closes on exactly one frame once clear
extends Node

const PROBE := preload("res://tools/plate_probe.tscn")

var failures: Array[String] = []
var passes := 0


# A stand-in room script for the pure (no-physics) poll tests: records the
# duck-typed callbacks main.gd's TriggerPoll fires, nothing else.
class Recorder:
	extends Node
	var enters: Array = []
	var exits: Array = []

	func on_trigger_enter(id: String) -> void:
		enters.append(id)

	func on_trigger_exit(id: String) -> void:
		exits.append(id)

	func clear() -> void:
		enters.clear()
		exits.clear()


func _ready() -> void:
	_test_strict_containment()
	_test_state_filter_is_part_of_containment()
	_test_enter_exit_set_diff()
	_test_state_change_fires_exit_without_moving()
	_test_room_load_clears_silently()
	_test_deferred_gate()
	_test_plate_is_never_solid()
	await _test_frame_ordering_and_dedup()
	_finish()


func _check(cond: bool, what: String) -> void:
	if cond:
		passes += 1
	else:
		failures.append(what)


func _volume(id: String, min_x: float, max_x: float, min_z: float, max_z: float,
		states := TriggerVolume.States.BOTH) -> TriggerVolume:
	var v := TriggerVolume.new()
	v.name = id
	v.trigger_id = id
	v.min_x = min_x
	v.max_x = max_x
	v.min_z = min_z
	v.max_z = max_z
	v.states = states
	return v


# 1. STRICT INEQUALITIES. The single most load-bearing property in this file:
# an Area3D would report containment 0.35m early on every side (the player's
# body radius), which silently widens every plate by 0.7m and invalidates room
# 14's plate-to-gate timing and room 20's block margins.
func _test_strict_containment() -> void:
	var v := _volume("t", -1.0, 1.0, -2.0, 2.0)
	var unmed := StateManager.State.UNMED

	_check(v.contains(0.0, 0.0, unmed), "centre of the rect must be inside")
	_check(v.contains(-0.999, 1.999, unmed), "just inside a corner must be inside")

	# Every edge and corner, exactly on the boundary — all OUTSIDE.
	_check(not v.contains(-1.0, 0.0, unmed), "x exactly on min_x must be OUTSIDE")
	_check(not v.contains(1.0, 0.0, unmed), "x exactly on max_x must be OUTSIDE")
	_check(not v.contains(0.0, -2.0, unmed), "z exactly on min_z must be OUTSIDE")
	_check(not v.contains(0.0, 2.0, unmed), "z exactly on max_z must be OUTSIDE")
	_check(not v.contains(-1.0, -2.0, unmed), "exactly on a corner must be OUTSIDE")
	_check(not v.contains(-1.001, 0.0, unmed), "just outside must be outside")

	# A degenerate rect contains nothing at all — which is why check_rooms
	# rejects them rather than letting one sit dead in a room.
	var d := _volume("d", 0.0, 0.0, 0.0, 0.0)
	_check(not d.contains(0.0, 0.0, unmed), "a degenerate rect must contain nothing")

	# The static form, for room-owned bodies with no TriggerVolume in hand.
	_check(TriggerVolume.point_in_rect(0.5, 0.5, 0.0, 1.0, 0.0, 1.0),
		"static point_in_rect must agree with contains()")
	_check(not TriggerVolume.point_in_rect(0.0, 0.5, 0.0, 1.0, 0.0, 1.0),
		"static point_in_rect must be strict too")

	# Circle form (gates only): rect grown by the radius, still strict.
	_check(v.overlaps_circle(1.34, 0.0, 0.35), "a circle overlapping the edge must count")
	_check(not v.overlaps_circle(1.35, 0.0, 0.35), "a circle exactly touching must NOT count")
	_check(not v.contains(1.34, 0.0, unmed),
		"overlaps_circle must NOT change what contains() reports — enter/exit "
		+ "stays a point test on the body centre")


# The filter lives INSIDE the containment test, which is what makes property 4
# (exit on a state change with no movement) fall out for free.
func _test_state_filter_is_part_of_containment() -> void:
	var lucid_only := _volume("l", -1.0, 1.0, -1.0, 1.0, TriggerVolume.States.LUCID)
	var unmed_only := _volume("u", -1.0, 1.0, -1.0, 1.0, TriggerVolume.States.UNMED)
	var both := _volume("b", -1.0, 1.0, -1.0, 1.0)

	_check(lucid_only.contains(0.0, 0.0, StateManager.State.LUCID),
		"a lucid trigger must contain a lucid body")
	_check(not lucid_only.contains(0.0, 0.0, StateManager.State.UNMED),
		"a lucid trigger must contain NOTHING while unmed")
	_check(unmed_only.contains(0.0, 0.0, StateManager.State.UNMED),
		"an unmed trigger must contain an unmed body")
	_check(not unmed_only.contains(0.0, 0.0, StateManager.State.LUCID),
		"an unmed trigger must contain NOTHING while lucid")
	_check(both.contains(0.0, 0.0, StateManager.State.LUCID)
			and both.contains(0.0, 0.0, StateManager.State.UNMED),
		"an unfiltered trigger must contain a body in both states")

	# States mirrors StateObject.Affinity (0/1/2), NOT StateManager.State
	# (UNMED 0, LUCID 1). Conflating them silently inverts every filter.
	_check(TriggerVolume.States.LUCID == StateObject.Affinity.LUCID
			and TriggerVolume.States.UNMED == StateObject.Affinity.UNMED
			and TriggerVolume.States.BOTH == StateObject.Affinity.BOTH,
		"TriggerVolume.States must stay aligned with StateObject.Affinity — the "
		+ "generator emits one integer for a plate's mesh and its trigger")


# 2 + 3. The set-diff: enter fires once on entry and NOT once per frame; exit
# fires once on leaving. A gate that took an enter per frame would count
# occupants forever and never close.
func _test_enter_exit_set_diff() -> void:
	var room := Recorder.new()
	room.add_child(_volume("plate", -1.0, 1.0, -1.0, 1.0))
	add_child(room)

	var poll := TriggerPoll.new()
	add_child(poll)
	poll.bind_room(room)

	var unmed := StateManager.State.UNMED

	poll.poll(5.0, 5.0, unmed)
	_check(room.enters.is_empty() and room.exits.is_empty(),
		"polling outside every trigger must fire nothing")

	poll.poll(0.0, 0.0, unmed)
	_check(room.enters == ["plate"], "entering must fire on_trigger_enter once")

	for i in 10:
		poll.poll(0.1 * i * 0.01, 0.0, unmed)
	_check(room.enters.size() == 1,
		"standing inside must NOT re-fire enter (got %d)" % room.enters.size())
	_check(room.exits.is_empty(), "standing inside must not fire exit")
	_check(poll.is_active("plate"), "the id must be in the active set while inside")

	poll.poll(5.0, 5.0, unmed)
	_check(room.exits == ["plate"], "leaving must fire on_trigger_exit once")
	_check(not poll.is_active("plate"), "the id must leave the active set")

	poll.poll(6.0, 6.0, unmed)
	_check(room.exits.size() == 1, "staying outside must not re-fire exit")

	poll.poll(0.0, 0.0, unmed)
	_check(room.enters.size() == 2, "re-entering must fire enter again")

	# Exactly on the boundary is outside, through the poll as well as the test.
	poll.poll(1.0, 0.0, unmed)
	_check(room.exits.size() == 2,
		"stepping exactly onto the boundary must fire EXIT — the edge is outside")

	poll.queue_free()
	room.queue_free()


# 4. THE PROPERTY AN Area3D CANNOT HAVE. The body does not move; the ward flips;
# the trigger stops containing it and must say so on the spot. body_exited would
# never fire here — nothing moved.
func _test_state_change_fires_exit_without_moving() -> void:
	var room := Recorder.new()
	room.add_child(_volume("lucidplate", -1.0, 1.0, -1.0, 1.0, TriggerVolume.States.LUCID))
	add_child(room)

	var poll := TriggerPoll.new()
	add_child(poll)
	poll.bind_room(room)

	const X := 0.25
	const Z := -0.5

	poll.poll(X, Z, StateManager.State.LUCID)
	_check(room.enters == ["lucidplate"], "a lucid trigger must fire enter while lucid")

	# Same coordinates. Only the ward state changed.
	poll.poll(X, Z, StateManager.State.UNMED)
	_check(room.exits == ["lucidplate"],
		"a state-filtered trigger must fire EXIT the moment the state stops "
		+ "matching, with no movement at all")

	poll.poll(X, Z, StateManager.State.UNMED)
	_check(room.exits.size() == 1, "and must not keep firing exit every frame after")

	poll.poll(X, Z, StateManager.State.LUCID)
	_check(room.enters.size() == 2, "shifting back must fire enter again, still without moving")

	poll.queue_free()
	room.queue_free()


# 5. A room swap clears the active set SILENTLY. Firing exits here would run
# callbacks against a script whose on_leave has already run and whose nodes are
# queue_free'd.
func _test_room_load_clears_silently() -> void:
	var room_a := Recorder.new()
	room_a.add_child(_volume("plateA", -1.0, 1.0, -1.0, 1.0))
	add_child(room_a)

	var room_b := Recorder.new()
	room_b.add_child(_volume("plateB", -1.0, 1.0, -1.0, 1.0))
	add_child(room_b)

	var poll := TriggerPoll.new()
	add_child(poll)
	poll.bind_room(room_a)

	var unmed := StateManager.State.UNMED
	poll.poll(0.0, 0.0, unmed)
	_check(room_a.enters == ["plateA"] and poll.is_active("plateA"),
		"setup: the body should be inside plateA")

	poll.bind_room(room_b)
	_check(room_a.exits.is_empty(),
		"a room load must NOT fire on_trigger_exit on the room being torn down")
	_check(poll.active_ids().is_empty(),
		"a room load must clear the active set")

	# And the new room starts clean: standing in the same spot fires ITS enter.
	poll.poll(0.0, 0.0, unmed)
	_check(room_b.enters == ["plateB"] and room_b.exits.is_empty(),
		"the newly-bound room must fire its own enter for the same position")

	poll.bind_room(null)
	_check(poll.active_ids().is_empty() and room_b.exits.is_empty(),
		"unbinding must also clear silently")

	poll.queue_free()
	room_a.queue_free()
	room_b.queue_free()


# 8. THE REVERSIBLE-GATE HAZARD. Closing a collider onto a body inside its
# footprint freezes that body (the axis-separated resolver blocks every
# direction once the position already penetrates an AABB), so the close is
# deferred and rechecked every frame until clear.
func _test_deferred_gate() -> void:
	# Room 14's own gate numbers: opening x[-1,1] in the wall at z=-14.
	var gate := DeferredGate.rect(-1.0, 1.0, -14.1, -13.9)
	_check(is_equal_approx(gate.settle_sec, 0.7),
		"the default settle window must be the spec's 0.7s")

	var in_gate := DeferredGate.body(0.0, -14.0, Tuning.PLAYER_RADIUS)
	var clear_of_gate := DeferredGate.body(0.0, -12.0, Tuning.PLAYER_RADIUS)

	_check(not gate.tick(0.1, [clear_of_gate]),
		"a gate nobody asked to close must never close")

	gate.request_close()
	_check(not gate.tick(0.1, [clear_of_gate]), "the close must wait out the settle window")
	_check(gate.is_pending(), "and stay pending while it waits")

	# Standing in the doorway the whole time: 3 seconds, way past the settle.
	var closed_while_occupied := false
	for i in 30:
		if gate.tick(0.1, [in_gate]):
			closed_while_occupied = true
	_check(not closed_while_occupied,
		"THE SOFT-LOCK: the gate must never close onto a body inside its footprint")
	_check(gate.is_deferred(),
		"and must report that it is deferring rather than silently doing nothing")
	_check(gate.is_pending(), "the close stays pending across the deferral")

	# The body steps clear: it closes on the very next tick, no second settle
	# (the countdown ran while it was blocked, matching the reference).
	var closes := 0
	for i in 10:
		if gate.tick(0.1, [clear_of_gate]):
			closes += 1
	_check(closes == 1, "the gate must close on EXACTLY one frame once clear (got %d)" % closes)
	_check(not gate.is_pending() and not gate.is_deferred(),
		"and stop being pending afterwards")

	# An orderly standing in the gate blocks it exactly like the player does —
	# a wedged orderly is only a visual bug, but the same rule catches both.
	var gate2 := DeferredGate.rect(-1.0, 1.0, -14.1, -13.9)
	gate2.request_close()
	var orderly_in_gate := DeferredGate.body(0.9, -13.95, Tuning.ORDERLY_RADIUS)
	var blocked := false
	for i in 20:
		blocked = blocked or not gate2.tick(0.1, [clear_of_gate, orderly_in_gate])
	_check(blocked, "any body in the footprint defers the close, not just the player")

	# Cancelling: somebody stepped back onto the plate.
	var gate3 := DeferredGate.rect(-1.0, 1.0, -14.1, -13.9)
	gate3.request_close()
	gate3.cancel_close()
	var reopened_close := false
	for i in 20:
		reopened_close = reopened_close or gate3.tick(0.1, [clear_of_gate])
	_check(not reopened_close, "a cancelled close must never fire")

	# The margin is the body radius, strictly: a body exactly touching the
	# footprint edge is clear (it has a legal move), one 1cm inside is not.
	var gate4 := DeferredGate.rect(-1.0, 1.0, -14.1, -13.9)
	_check(not gate4.blocked_by(1.35, -14.0, 0.35), "exactly touching is clear")
	_check(gate4.blocked_by(1.34, -14.0, 0.35), "1cm of overlap is not clear")


# 7. A PRESSURE PLATE IS NEVER SOLID — asserted against the REAL generated
# scene (tools/plate_probe.tscn, emitted by gen_rooms.py's own Emitter), so this
# catches the generator growing a collider for plates as well as a hand-authored
# room doing it.
func _test_plate_is_never_solid() -> void:
	var probe := PROBE.instantiate()
	add_child(probe)

	var col := WardCollision.new()
	col.rebuild_from(probe)
	_check(not col.boxes.is_empty(), "setup: the probe room must have some solid geometry")

	var r := Tuning.PLAYER_RADIUS
	for state in [StateManager.State.UNMED, StateManager.State.LUCID]:
		var sn := "unmed" if state == StateManager.State.UNMED else "lucid"
		_check(not col.is_blocked_at(0.0, 0.0, r, state),
			"THE MECHANIC: the plate centre must be walkable while %s" % sn)
		_check(not col.is_blocked_at(1.25, 0.55, r, state),
			"the plate's far corner must be walkable while %s" % sn)
	_check(col.is_blocked_at(2.5, -1.5, r, StateManager.State.UNMED),
		"sanity: the probe's crate IS solid, so the checks above mean something")

	# An orderly's patrol crosses a plate as bare floor precisely because the
	# plate never enters the collider cache at all.
	for b in col.boxes:
		_check(not (b.min_x > -1.4 and b.max_x < 1.4 and b.min_z > -0.7 and b.max_z < 0.7),
			"no collider may exist inside the plate footprint — a plate with a "
			+ "collider is an obstacle, and patrols would path around it")

	# The mesh and the trigger must describe the SAME rectangle: the whole point
	# of emitting both from one Room.plate() call is that "where the plate looks
	# like it is" and "where it fires" can never drift apart.
	# Deliberately fetched as an untyped Node: the point of the next assertion
	# is that the generator did NOT make the plate a physics body.
	var plate_node: Node = probe.get_node_or_null("Geometry/plate_probe_plate")
	_check(plate_node != null, "the generated plate mesh node must exist")
	_check(not (plate_node is CollisionObject3D),
		"the plate must not be a physics body of any kind — walls are emitted as "
		+ "StaticBody3D, a plate must stay a bare mesh")
	var mesh := plate_node as MeshInstance3D
	_check(mesh != null, "the generated plate node must be a MeshInstance3D")
	var vol := TriggerVolume.find_in(probe, "plate_probe")
	_check(vol != null, "the generated trigger volume must exist")
	if mesh != null and vol != null:
		var box := mesh.mesh as BoxMesh
		_check(box != null, "the plate mesh must be a BoxMesh")
		if box != null:
			var p := mesh.position
			_check(is_equal_approx(p.x - box.size.x * 0.5, vol.min_x)
					and is_equal_approx(p.x + box.size.x * 0.5, vol.max_x)
					and is_equal_approx(p.z - box.size.z * 0.5, vol.min_z)
					and is_equal_approx(p.z + box.size.z * 0.5, vol.max_z),
				"the plate mesh footprint must match its trigger rect exactly")
			# Flush, not a step: 4cm tall, sitting on the floor rather than
			# proud of it. A player must never trip over the mechanic.
			_check(is_equal_approx(box.size.y, 0.04),
				"the default plate must be y*2 = 4cm tall (got %.3f)" % box.size.y)
			_check(is_equal_approx(p.y, 0.02),
				"and sit flush at y = 0.02 (got %.3f)" % p.y)

	probe.queue_free()


# 6. FRAME ORDERING, on real physics ticks: the poll runs at the head of the
# tick, so a trigger callback has already landed by the time the room's own
# _physics_process runs on that SAME tick. This is what lets room 14's gate open
# in the frame the player steps on the plate rather than the frame after.
func _test_frame_ordering_and_dedup() -> void:
	# Mirrors main.tscn's shape: WorldRoot (holding the room) is added BEFORE
	# the player, and the poll node last of all — exactly how main.gd builds it.
	var world_root := Node3D.new()
	add_child(world_root)
	var stub := Node3D.new()
	add_child(stub)
	var probe: Node3D = PROBE.instantiate()
	world_root.add_child(probe)

	var poll := TriggerPoll.new()
	poll.body = stub
	add_child(poll)
	poll.bind_room(probe)

	_check(poll.process_physics_priority == TriggerPoll.POLL_PRIORITY
			and TriggerPoll.POLL_PRIORITY < 0,
		"the poll must sit ahead of the default (0) priority every room's own "
		+ "_physics_process runs at")

	StateManager.force_state(StateManager.State.UNMED, "test")
	stub.global_position = Vector3(3.5, 0.0, 3.5)  # nowhere near the plate
	await get_tree().physics_frame
	await get_tree().physics_frame
	probe.clear_events()

	# Step onto the plate.
	stub.global_position = Vector3(0.0, 0.0, 0.0)
	await get_tree().physics_frame
	await get_tree().physics_frame

	var enter_index := -1
	for i in probe.events.size():
		if probe.events[i]["kind"] == "enter" and probe.events[i]["id"] == "plate_probe":
			enter_index = i
			break
	_check(enter_index >= 0, "walking onto the plate must fire on_trigger_enter")

	if enter_index >= 0:
		var enter_frame: int = probe.events[enter_index]["frame"]
		var next_update := -1
		for i in range(enter_index + 1, probe.events.size()):
			if probe.events[i]["kind"] == "update":
				next_update = i
				break
		_check(next_update >= 0, "the room must have updated after the enter fired")
		if next_update >= 0:
			_check(probe.events[next_update]["frame"] == enter_frame,
				"ORDERING: the room's own _physics_process must run on the SAME "
				+ "tick as, and AFTER, the trigger callback (callback frame %d, "
				% enter_frame + "next room update frame %d)"
				% int(probe.events[next_update]["frame"]))
		# Nothing may have updated the room on that tick BEFORE the callback.
		var updates_on_enter_frame_before := 0
		for i in enter_index:
			if probe.events[i]["kind"] == "update" and probe.events[i]["frame"] == enter_frame:
				updates_on_enter_frame_before += 1
		_check(updates_on_enter_frame_before == 0,
			"ORDERING: the room must not have already updated this tick when the "
			+ "callback lands")

	# Standing still on the plate for 20 ticks must not re-fire.
	for i in 20:
		await get_tree().physics_frame
	_check(probe.count("enter", "plate_probe") == 1,
		"the physics poll must fire enter exactly once for one entry (got %d)"
			% probe.count("enter", "plate_probe"))
	_check(probe.count("exit", "plate_probe") == 0, "and must not fire exit while standing on it")

	# Step off.
	stub.global_position = Vector3(3.5, 0.0, 3.5)
	await get_tree().physics_frame
	await get_tree().physics_frame
	_check(probe.count("exit", "plate_probe") == 1, "stepping off must fire exit once")

	# poll_when: main.gd points this at the player's input flag, so nothing
	# fires behind the start overlay or on the end card.
	probe.clear_events()
	poll.poll_when = func() -> bool: return false
	stub.global_position = Vector3(0.0, 0.0, 0.0)
	for i in 5:
		await get_tree().physics_frame
	_check(probe.count("enter") == 0,
		"poll_when returning false must suspend the poll entirely")
	poll.poll_when = Callable()
	await get_tree().physics_frame
	await get_tree().physics_frame
	_check(probe.count("enter", "plate_probe") == 1,
		"and re-enabling it must pick the body up where it now stands")

	# The state filter, through the real poll on real ticks: the stub does not
	# move, the ward does.
	probe.clear_events()
	stub.global_position = Vector3(-2.9, 0.0, 0.0)  # inside probe_lucid only
	await get_tree().physics_frame
	await get_tree().physics_frame
	_check(probe.count("enter", "probe_lucid") == 0,
		"a lucid-only trigger must stay dead while unmed")
	StateManager.force_state(StateManager.State.LUCID, "test")
	await get_tree().physics_frame
	await get_tree().physics_frame
	_check(probe.count("enter", "probe_lucid") == 1,
		"shifting lucid must fire its enter without the body moving")
	StateManager.force_state(StateManager.State.UNMED, "test")
	await get_tree().physics_frame
	await get_tree().physics_frame
	_check(probe.count("exit", "probe_lucid") == 1,
		"shifting back must fire its exit without the body moving")

	poll.queue_free()
	probe.queue_free()
	world_root.queue_free()
	stub.queue_free()


func _finish() -> void:
	print("")
	print("test_triggers: %d assertion(s) passed" % passes)
	if failures.is_empty():
		print("  OK - trigger volumes, plates and deferred gates behave as ported")
	else:
		for f in failures:
			print("  FAIL  %s" % f)
		print("  %d failure(s)" % failures.size())
	print("")
	get_tree().quit(0 if failures.is_empty() else 1)
