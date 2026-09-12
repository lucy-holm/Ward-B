## Temporary web-only harness. This file lives under tools/, which the shipped
## Web export excludes. The verification script copies it to the isolated
## export root so the test can boot through the real Main scene.
extends Node

const MAIN_SCENE := preload("res://main.tscn")
const CHECKPOINT_POSITION := Vector3(4.0, 0.9, -6.7)

var game: Node = null
var phase := ""
var initial_reported := false
var completed_reported := false
var age := 0.0


func _ready() -> void:
	phase = WebEnv.query_param("ward_harness")
	game = MAIN_SCENE.instantiate()
	add_child(game)
	# Main._ready loads its initial room and lays out the overlay as a child;
	# wait for that work before driving its public checkpoint API.
	await get_tree().process_frame
	await get_tree().process_frame
	if phase == "save":
		_run_save()
	elif phase == "continue":
		_report_continue_button()
	else:
		_report({"status": "error", "reason": "unknown phase"})


func _run_save() -> void:
	GameState.set_flag("room18.power", "lights")
	game.load_room("room19")
	await get_tree().process_frame
	await get_tree().process_frame
	var ok: bool = game.record_checkpoint("checkpoint19")
	_report({
		"status": "saved" if ok else "save_failed",
		"saved": ok,
		"room": game.current_room_id,
		"position": [CHECKPOINT_POSITION.x, CHECKPOINT_POSITION.y, CHECKPOINT_POSITION.z],
	})


func _report_continue_button() -> void:
	var button: Button = game.start_overlay._continue_btn
	var rect := button.get_global_rect()
	_report({
		"status": "continue_ready" if button.visible else "continue_missing",
		"visible": button.visible,
		"text": button.text,
		"rect": [rect.position.x, rect.position.y, rect.size.x, rect.size.y],
		"touch_visible": game.touch_controls.visible,
		"touch_rects": _touch_rects(),
	})


func _touch_rects() -> Dictionary:
	var out := {}
	for id in ["Interact", "Shift", "Pause"]:
		var control: Control = game.touch_controls.get_node("Root/Buttons/" + id) \
			if id != "Pause" else game.touch_controls.get_node("Root/Pause")
		var rect := control.get_global_rect()
		out[id] = [rect.position.x, rect.position.y, rect.size.x, rect.size.y]
	return out


func _process(delta: float) -> void:
	if phase == "continue" and initial_reported and not completed_reported:
		age += delta
		# Leave the page alive until Playwright has inspected the marker and
		# clicked the real Continue button.
		if game.current_room_id == "room19":
			var scene_path: String = game.current_room.scene_file_path
			if scene_path.ends_with("room19_lights.tscn") \
					and game.player.global_position.is_equal_approx(CHECKPOINT_POSITION):
				_report({
					"status": "continued",
					"room": game.current_room_id,
					"scene": scene_path,
					"position": [game.player.global_position.x,
						game.player.global_position.y, game.player.global_position.z],
					"input": game.player.is_input_enabled(),
				})


func _report(payload: Dictionary) -> void:
	var status := str(payload.get("status", "error"))
	if status == "continued":
		if completed_reported:
			return
		completed_reported = true
	elif initial_reported:
		return
	else:
		initial_reported = true
	if not WebEnv.is_web():
		return
	var encoded := JSON.stringify(payload)
	WebEnv.eval_js("window.__wardHarness = %s; document.title = %s;" %
		[encoded, WebEnv.js_literal("ward-harness:" + str(payload.get("status", "error")))])
