## Temporary exported-web hybrid-input harness.
##
## The Node runner copies this script to the isolated export root because the
## shipped export excludes tools/. Playwright then drives the real Main scene
## and its actual UI/input event path.
extends Node

const MAIN_SCENE := preload("res://main.tscn")

var game: Node
var phase := ""
var stage := 0
var baseline_position := Vector3.ZERO
var baseline_yaw := 0.0
var movement_seen := false
var look_seen := false


func _ready() -> void:
	phase = WebEnv.query_param("ward_harness")
	game = MAIN_SCENE.instantiate()
	add_child(game)
	await get_tree().process_frame
	await get_tree().process_frame
	if phase == "hybrid":
		_report("boot", {
			"mode": _mode_name(),
			"touch_controls": game.touch_controls.visible,
			"capture_attempted": game.player._capture_attempted,
			"admit_rect": _rect(game.start_overlay._admit_btn),
		})
	else:
		_report("error", {"reason": "unknown phase"})


func _process(_delta: float) -> void:
	if phase != "hybrid":
		return
	if stage == 0 and game.player.is_input_enabled():
		baseline_position = game.player.global_position
		baseline_yaw = game.player.yaw
		stage = 1
		_report("admitted", {
			"mode": _mode_name(),
			"touch_controls": game.touch_controls.visible,
			"capture_attempted": game.player._capture_attempted,
		})
	elif stage == 1 and WardInput.is_pointer_mode() and not game.touch_controls.visible:
		stage = 2
		_report("pointer_active", {
			"mode": _mode_name(),
			"touch_controls": game.touch_controls.visible,
			"capture_attempted": game.player._capture_attempted,
			"capture_refused": game.player._capture_refused,
		})
	elif stage == 2:
		var moved: float = game.player.global_position.distance_to(baseline_position)
		var turned: float = absf(game.player.yaw - baseline_yaw)
		if moved > 0.001 and not movement_seen:
			movement_seen = true
			_report("pointer_movement", {
				"mode": _mode_name(),
				"moved": moved,
				"yaw_delta": turned,
			})
		if turned > 0.002 and not look_seen:
			look_seen = true
			_report("pointer_look", {
				"mode": _mode_name(),
				"moved": moved,
				"yaw_delta": turned,
			})
		if movement_seen and look_seen:
			stage = 3
			_report("pointer_gameplay", {
				"mode": _mode_name(),
				"moved": moved,
				"yaw_delta": turned,
			})
	elif stage == 3 and WardInput.is_touch_mode() and game.touch_controls.visible:
		stage = 4
		_report("touch_returned", {
			"mode": _mode_name(),
			"touch_controls": game.touch_controls.visible,
		})
	elif stage == 4 and WardInput.is_pointer_mode() and not game.touch_controls.visible:
		stage = 5
		_report("pointer_returned", {
			"mode": _mode_name(),
			"touch_controls": game.touch_controls.visible,
		})


func _mode_name() -> String:
	return "pointer" if WardInput.is_pointer_mode() else "touch"


func _rect(control: Control) -> Array[float]:
	var rect := control.get_global_rect()
	return [rect.position.x, rect.position.y, rect.size.x, rect.size.y]


func _report(status: String, details: Dictionary) -> void:
	if not WebEnv.is_web():
		return
	var payload := details.duplicate(true)
	payload["status"] = status
	# Keep every milestone: movement and look can both be observed in one
	# frame, so a single last-status slot would make the browser runner race
	# and lose the first result.
	WebEnv.eval_js("window.__wardHybridStages = window.__wardHybridStages || {}; window.__wardHybridStages[%s] = %s; window.__wardHybrid = %s; document.title = %s;" %
		[WebEnv.js_literal(status), JSON.stringify(payload), JSON.stringify(payload), WebEnv.js_literal("ward-hybrid:" + status)])
