## Browser lifecycle semantics, exercised through BrowserLifecycle's public
## suspend/resume interface so this suite also runs headless.
##
##   godot --headless --path godot tools/test_browser_lifecycle.tscn
##
## The actual browser callback is covered by verify_telemetry_session.mjs. This
## suite pins the state restoration contract without requiring a Web export.
extends Node

var _failures: Array[String] = []
var _passes := 0


func _check(condition: bool, message: String) -> void:
	if not condition:
		_failures.append(message)
		printerr("FAIL: ", message)
	else:
		_passes += 1


func _ready() -> void:
	Telemetry.disabled = false
	Telemetry._suspended = false
	Telemetry._started = true
	Telemetry._idle = false
	Telemetry._active_accum_ms = 0
	Telemetry._active_since_ms = Telemetry._mono_ms()
	Telemetry._queue.clear()
	Telemetry._dropped = 0

	var lifecycle: Node = load("res://autoload/browser_lifecycle.gd").new()
	add_child(lifecycle)
	await get_tree().process_frame

	var old_paused := get_tree().paused
	var old_max_fps := Engine.max_fps
	var old_mutes: Dictionary = {}
	for index in AudioServer.get_bus_count():
		old_mutes[index] = AudioServer.is_bus_mute(index)

	lifecycle.suspend_for_visibility()
	_check(lifecycle._hidden, "hidden state is entered once")
	_check(get_tree().paused, "hidden page pauses gameplay")
	_check(Engine.max_fps == lifecycle.HIDDEN_MAX_FPS, "hidden page lowers frame cap")
	_check(Telemetry._suspended, "telemetry is suspended while hidden")
	for index in AudioServer.get_bus_count():
		_check(AudioServer.is_bus_mute(index), "hidden page mutes audio bus %d" % index)
	var hidden_active := Telemetry.active_ms()
	await get_tree().process_frame
	_check(Telemetry.active_ms() == hidden_active, "hidden interval is excluded from active time")

	# A pause menu opened before backgrounding must remain paused after return.
	lifecycle.resume_from_visibility()
	_check(not lifecycle._hidden, "visible state clears hidden flag")
	_check(get_tree().paused == old_paused, "resume restores prior gameplay pause state")
	_check(Engine.max_fps == old_max_fps, "resume restores prior frame cap")
	_check(not Telemetry._suspended, "telemetry resumes the same session")
	for index: Variant in old_mutes:
		_check(AudioServer.is_bus_mute(int(index)) == bool(old_mutes[index]),
			"resume restores prior audio mute state for bus %d" % int(index))

	# The same restoration must work when the player had already opened the
	# in-game pause menu before the browser backgrounded.
	get_tree().paused = true
	lifecycle.suspend_for_visibility()
	lifecycle.resume_from_visibility()
	_check(get_tree().paused, "resume preserves an already-paused gameplay tree")
	get_tree().paused = old_paused

	# Idempotence matters when browsers send duplicate lifecycle notifications.
	lifecycle.resume_from_visibility()
	lifecycle.suspend_for_visibility()
	lifecycle.suspend_for_visibility()
	_check(lifecycle._hidden, "duplicate hidden notification does not corrupt state")
	lifecycle.resume_from_visibility()
	_check(not Telemetry._quit_fired, "visibility suspension never emits terminal quit")

	Telemetry._started = false
	Telemetry._suspended = false
	Telemetry._queue.clear()
	Telemetry.disabled = true
	lifecycle.free()
	get_tree().paused = old_paused
	Engine.max_fps = old_max_fps
	for index: Variant in old_mutes:
		AudioServer.set_bus_mute(int(index), bool(old_mutes[index]))
	if _failures.is_empty():
		print("OK - test_browser_lifecycle (%d assertions)" % _passes)
	get_tree().quit(1 if not _failures.is_empty() else 0)
