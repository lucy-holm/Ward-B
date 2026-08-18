# Room stub for the trigger-volume harness (tools/test_triggers.tscn) and the
# subject of the plate screenshot check.
#
# NOT A ROOM. It lives in tools/ and is registered nowhere, so check_rooms never
# sees it and it can never join the exit chain. It exists because the two things
# most worth proving about this system cannot be proved against a hand-built
# node tree:
#
#   1. THE GENERATOR REALLY EMITS A WALKABLE PLATE. tools/plate_probe.tscn was
#      emitted by gen_rooms.py's own Emitter — the same code path every room
#      uses — from this spec:
#
#          r = Room("plate_probe", "plate probe", floor=(-4, 4, -6, 6),
#                   spawn=(0, 4, 0), exits=[("END", -1, 1, -5.9, -5.2)])
#          r.wall_x(-4, 4, 6); r.wall_x(-4, 4, -6)
#          r.wall_z(-6, 6, -4); r.wall_z(-6, 6, 4)
#          r.plate("plate_probe", -1.3, 1.3, -0.6, 0.6)
#          r.trigger("probe_lucid", -3.4, -2.4, -0.5, 0.5, state="lucid")
#          r.block((0.9, 1.0, 0.6), (2.5, 0.5, -1.5), "prop")
#          r.solid(2.05, 2.95, -1.8, -1.2)
#          r.light(0, 0); r.light(0, 4)
#
#      (only the emitted script path was rewritten, from res://rooms/... to this
#      file). The harness then asserts against the real .tscn that the plate has
#      no collider in either ward state.
#   2. FRAME ORDERING. Every event this script records carries the physics frame
#      it happened on (Engine.get_physics_frames()), so the harness can assert
#      that a trigger callback lands on the SAME tick as, and BEFORE, this
#      script's own _physics_process — the contract src/main.ts got by polling
#      between player.update() and the room's update().
extends Node3D

## [ {"kind": "enter"|"exit"|"update", "id": String, "frame": int}, ... ]
var events: Array[Dictionary] = []


func on_trigger_enter(id: String) -> void:
	_record("enter", id)


func on_trigger_exit(id: String) -> void:
	_record("exit", id)


func _physics_process(_delta: float) -> void:
	_record("update", "")


func _record(kind: String, id: String) -> void:
	events.append({"kind": kind, "id": id, "frame": Engine.get_physics_frames()})


func clear_events() -> void:
	events.clear()


func kinds() -> Array:
	var out: Array = []
	for e in events:
		out.append(e["kind"] + (":" + e["id"] if not str(e["id"]).is_empty() else ""))
	return out


func count(kind: String, id := "") -> int:
	var n := 0
	for e in events:
		if e["kind"] == kind and (id.is_empty() or e["id"] == id):
			n += 1
	return n
