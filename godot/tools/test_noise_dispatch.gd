# Root integration contract: only the current room hears sound; repeated
# interaction frames cannot flood patrols or telemetry with identical pings.
extends Node
class Listener:
	extends Node3D
	var calls := 0
	var heard_level := ""
	var heard_position := Vector3.ZERO
	func _ready() -> void:
		add_to_group("orderly")
	func hear_noise(position: Vector3, level: String, _source: String) -> bool:
		calls += 1
		heard_level = level
		heard_position = position
		return true
var failures: Array[String] = []
func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
func _ready() -> void:
	Telemetry.disabled = true
	var game = load("res://main.tscn").instantiate()
	add_child(game)
	game.load_room("room9")
	var local := Listener.new()
	game.current_room.add_child(local)
	var stale := Listener.new()
	add_child(stale)
	check(game.emit_noise("maintenance", Vector3(1, 2, 3), "balcony") == 1, "only current-room listener responds")
	check(stale.calls == 0 and local.calls == 1, "unloaded-room listeners cannot receive noise")
	check(local.heard_level == "balcony" and local.heard_position == Vector3(1, 2, 3), "position and floor reach the AI intact")
	check(game.emit_noise("maintenance", Vector3.ZERO) == 0 and local.calls == 1, "repeated interaction frames are coalesced")
	check(game.emit_noise("keypad_error", Vector3.ZERO) == 1, "distinct source remains audible")
	game.load_room("room9")
	var next := Listener.new()
	game.current_room.add_child(next)
	check(game.emit_noise("maintenance", Vector3.ZERO) == 1, "new room does not inherit previous cooldown")
	game.queue_free()
	stale.queue_free()
	await get_tree().process_frame
	for failure in failures:
		print("  FAIL - ", failure)
	print("  OK - noise dispatch scope and cooldown" if failures.is_empty() else "  FAILED - noise dispatch")
	get_tree().quit(0 if failures.is_empty() else 1)
