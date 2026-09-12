# Shared call logic against physical bell fixtures: all orders, wrong calls,
# state gating, noise, indicator reset and a completion callback exactly once.
extends Node

class Host:
	extends Node
	var player: Node3D
	var noises: Array = []
	var clue := ""
	var completed := 0
	func hud_toast(_text: String) -> void: pass
	func hud_objective(_text: String) -> void: pass
	func update_scrawl_text(_id: String, text: String) -> void: clue = text
	func emit_noise(id: String, position: Vector3, level: String) -> void:
		noises.append([id, position, level])
	func unlock() -> void: completed += 1
	func _find_interactable(room: Node, id: String) -> Interactable:
		for child in room.find_children("*", "Interactable", true, false):
			if child.interactable_id == id: return child
		return null

var checks := 0
var failures: Array[String] = []

func check(ok: bool, message: String) -> void:
	checks += 1
	if not ok: failures.append(message)

func _ready() -> void:
	Telemetry.disabled = true
	var host := Host.new()
	add_child(host)
	host.player = load("res://tools/test_stub_player.gd").new()
	host.add_child(host.player)
	host.player.level = "balcony"
	host.player.position = Vector3(2, 3.4, 5)
	var room: Node = load("res://rooms/room8/room8.tscn").instantiate()
	add_child(room)
	await get_tree().process_frame
	for order in [["circle", "square", "triangle"], ["circle", "triangle", "square"],
		["square", "circle", "triangle"], ["square", "triangle", "circle"],
		["triangle", "circle", "square"], ["triangle", "square", "circle"]]:
		host.completed = 0
		host.noises.clear()
		var bells := KitBellSequence.new()
		bells.configure(host, room, "test_calls", "bell8_", order, host.unlock, "bellOrder8")
		check(host.clue == "bell order\n1. %s\n2. %s\n3. %s" % order, "clue matches chosen order")
		check(not bells.handle("dispenser") and not bells.is_available("bell8_star"), "unknown IDs are not handled")
		StateManager.force_state(StateManager.State.LUCID, "test")
		bells.handle("bell8_" + order[0])
		check(bells.progress == 0 and host.noises.is_empty(), "medicated bell neither advances nor emits noise")
		StateManager.force_state(StateManager.State.UNMED, "test")
		bells.handle("bell8_" + order[0])
		var fixture: Node = host._find_interactable(room, "bell8_" + order[0]).get_node("Model")
		check(bells.progress == 1 and fixture._lamp_mat.emission_energy_multiplier > 0, "first call lights physical lamp")
		check(host.noises.size() == 1 and host.noises[0][1] == host.player.global_position
			and host.noises[0][2] == "balcony", "noise uses player's actual position and floor")
		bells.handle("bell8_" + order[0])
		check(bells.progress == 1 and host.noises.size() == 1
			and not bells.is_available("bell8_" + order[0]), "latched call is silent and cannot reset progress")
		bells.handle("bell8_" + order[2])
		check(bells.progress == 0 and fixture._lamp_mat.emission_energy_multiplier == 0
			and bells.is_available("bell8_" + order[0]), "wrong future call clears indicators and makes first bell available")
		for shape in order: bells.handle("bell8_" + shape)
		check(bells.completed and host.completed == 1, "all six permutations complete exactly once")
		var noise_count := host.noises.size()
		for shape in order:
			bells.handle("bell8_" + shape)
			check(not bells.is_available("bell8_" + shape), "completed bell cannot be focused again")
		check(host.completed == 1 and host.noises.size() == noise_count, "completed sequence is immutable and quiet")
	room.queue_free()
	host.queue_free()
	await get_tree().process_frame
	for failure in failures: print("FAIL - ", failure)
	print("OK - bell sequence (%d assertions)" % checks if failures.is_empty() else "FAILED - bell sequence")
	get_tree().quit(0 if failures.is_empty() else 1)
