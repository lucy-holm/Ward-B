# Milestone persistence: malformed/stale saves never choose arbitrary rooms,
# branch variants or coordinates. Uses its own file, never a player's save.
extends Node

var checks := 0
var failures: Array[String] = []
const PATH := "user://wardb-checkpoint-test.json"

func _check(ok: bool, message: String) -> void:
	checks += 1
	if not ok:
		failures.append(message)

func _ready() -> void:
	if not ResourceLoader.exists("res://core/checkpoints.gd"):
		print("FAIL - checkpoint store is not implemented")
		get_tree().quit(1)
		return
	var store = load("res://core/checkpoints.gd").new(PATH)
	store.clear()
	_check(store.load_saved().is_empty(), "a fresh install has no Continue")
	var snapshot: Dictionary = store.make_snapshot("checkpoint19", 1, true,
		{"room18.power": "lights"}, ["room1", "room9", "room18"])
	_check(store.save(snapshot) == OK, "valid lights-platform milestone saves")
	_check(store.load_saved() == snapshot, "checkpoint survives a disk reload")
	_check(store.anchor("checkpoint19")["position"] == Vector3(4, 0.9, -6.7),
		"restore coordinates come from the audited manifest")
	for change: Dictionary in [{"schema": 999}, {"campaign": "obsolete"},
			{"checkpoint": "room20"}, {"pills": 99}, {"pills": -1},
			{"pills": "one"}, {"scarce": "yes"},
			{"flags": {"room18.power": "doors"}},
			{"flags": {"room18.power": "lights", "arbitrary": true}},
			{"completed": ["room20"]}, {"completed": ["room1", "room1"]}]:
		var bad := snapshot.duplicate(true)
		bad.merge(change, true)
		_check(store.save(bad) != OK, "reject invalid milestone: %s" % change)
		_check(store.load_saved() == snapshot, "invalid write preserves last usable checkpoint")
	var early: Dictionary = store.make_snapshot("checkpoint9", 0, false, {}, ["room1"])
	_check(store.save(early) == OK, "earlier checkpoint needs no branch flag")
	var file := FileAccess.open(PATH, FileAccess.WRITE)
	file.store_string("{broken")
	file.close()
	_check(store.load_saved().is_empty(), "corrupt JSON offers fresh admission")
	file = FileAccess.open(PATH, FileAccess.WRITE)
	file.store_string("x".repeat(17000))
	file.close()
	_check(store.load_saved().is_empty(), "oversized file is rejected before parsing")
	store.clear()
	_check(not FileAccess.file_exists(PATH), "clear removes only this store's save")
	print("test_checkpoints: %d assertions" % checks)
	for failure in failures:
		print("  FAIL - ", failure)
	print("  OK - checkpoint validation and persistence" if failures.is_empty() else "  FAILED - checkpoints")
	get_tree().quit(0 if failures.is_empty() else 1)
