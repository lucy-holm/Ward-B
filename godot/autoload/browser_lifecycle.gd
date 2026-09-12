## Browser/page lifecycle owner.
##
## Register this script as an autoload after Telemetry and WardAudio in
## project.godot. A hidden tab is a resumable suspension: the scene tree is
## paused, audio buses are muted, and the frame cap is lowered to avoid doing
## expensive work behind another tab. The exact prior state is restored when
## the page becomes visible again, including a pause menu that was already
## open. Telemetry owns the terminal pagehide flush; this node never emits
## quit for visibility changes.
extends Node

const HIDDEN_MAX_FPS := 5

var _hidden := false
var _previous_tree_paused := false
var _previous_max_fps := 0
var _previous_bus_mutes: Dictionary = {}
var _visibility_callback: Variant = null


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	if not WebEnv.is_web():
		return
	var js := WebEnv.bridge()
	if js == null:
		return
	_visibility_callback = js.create_callback(_on_visibility_changed)
	var window: Variant = js.get_interface("window")
	if window == null:
		return
	window.__wardbVisibility = _visibility_callback
	WebEnv.eval_js(
		"document.addEventListener('visibilitychange', () => "
		+ "window.__wardbVisibility(document.visibilityState === 'hidden'));"
	)
	# A page can be restored from the browser's back/forward cache while the
	# document is already visible, so synchronise once after installing hooks.
	_on_visibility_changed()


func _on_visibility_changed(args: Array = []) -> void:
	var hidden := false
	if not args.is_empty():
		hidden = bool(args[0])
	else:
		var value: Variant = WebEnv.eval_js("document.visibilityState === 'hidden'")
		hidden = false if value == null else bool(value)
	if hidden:
		suspend_for_visibility()
	else:
		resume_from_visibility()


## Public for the browser callback and headless lifecycle tests.
func suspend_for_visibility() -> void:
	if _hidden:
		return
	_hidden = true
	_previous_tree_paused = get_tree().paused
	_previous_max_fps = Engine.max_fps
	_previous_bus_mutes.clear()
	for index in AudioServer.get_bus_count():
		_previous_bus_mutes[index] = AudioServer.is_bus_mute(index)
		AudioServer.set_bus_mute(index, true)
	Engine.max_fps = HIDDEN_MAX_FPS
	# Telemetry accrues active time up to this point before the tree is paused.
	Telemetry.suspend_for_visibility()
	get_tree().paused = true


## Public for the browser callback and headless lifecycle tests.
func resume_from_visibility() -> void:
	if not _hidden:
		return
	_hidden = false
	Telemetry.resume_from_visibility()
	for index: Variant in _previous_bus_mutes:
		if int(index) < AudioServer.get_bus_count():
			AudioServer.set_bus_mute(int(index), bool(_previous_bus_mutes[index]))
	_previous_bus_mutes.clear()
	Engine.max_fps = _previous_max_fps
	get_tree().paused = _previous_tree_paused
