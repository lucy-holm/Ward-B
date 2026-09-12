# Mouse-look input policy, tested as logic rather than as pixels.
#
# WHY NOT A BROWSER SCREENSHOT. I tried. Room 1 unmedicated is near-black and
# the ward animates constantly (film grain, fluorescent flicker, fog breathing),
# so the frame-to-frame noise floor swamps the pixel change from a camera turn:
# hovering and dragging both measured ~1-2x noise, in the wrong order. A test
# that cannot distinguish the thing it is testing from the thing it is not is
# worse than no test, so this drives _unhandled_input directly and asserts the
# accumulator.
#
# The policy being pinned:
#   1. Pointer lock granted        -> every motion looks (desktop).
#   2. No click yet                -> motion does NOT look. This is why the
#      refusal check is gated on an ATTEMPT: an earlier draft latched off mere
#      pointer presence and swung the camera on hover, with no click at all.
#   3. Lock REFUSED, no button     -> motion does NOT look. iPadOS Safari
#      refuses pointer lock, and the visible cursor is the only way to press
#      the touch buttons, keypad and start screen. If free movement turned the
#      camera, the pointer could not be used for anything else.
#   4. Lock REFUSED, button held   -> motion looks. Drag-to-look, matching the
#      touch drag it sits beside. This is the iPad-with-a-trackpad case.
extends Node

var _checks := 0
var _fails := 0
var _refusal_hint_seen := false


func _check(ok: bool, msg: String) -> void:
	_checks += 1
	if not ok:
		_fails += 1
		print("  FAIL  %s" % msg)


func _on_refusal_hint() -> void:
	_refusal_hint_seen = true


func _motion(rel: Vector2, buttons: int = 0) -> InputEventMouseMotion:
	var e := InputEventMouseMotion.new()
	e.device = InputEvent.DEVICE_ID_MOUSE
	e.relative = rel
	e.button_mask = buttons
	return e


func _press() -> InputEventMouseButton:
	var e := InputEventMouseButton.new()
	e.device = InputEvent.DEVICE_ID_MOUSE
	e.button_index = MOUSE_BUTTON_LEFT
	e.pressed = true
	return e


func _ready() -> void:
	# This must be the engine's effective setting, not merely a similarly
	# named key in project.godot. Repeating the section prefix in the key
	# leaves emulation enabled and applies touch AND synthetic mouse look.
	_check(not bool(ProjectSettings.get_setting("input_devices/pointing/emulate_mouse_from_touch", true)),
		"touch-to-mouse emulation must be disabled at the effective engine setting")
	var player: Node = (load("res://player/player.tscn") as PackedScene).instantiate()
	add_child(player)
	player.pointer_capture_refused.connect(_on_refusal_hint)
	WardInput.set_pointer_mode()
	player.set_input_enabled(true)
	await get_tree().process_frame

	# 2. No capture attempt yet: hovering must not turn the camera.
	player._look_accum = Vector2.ZERO
	player._unhandled_input(_motion(Vector2(50, 0)))
	_check(player._look_accum == Vector2.ZERO,
		"motion before any click must NOT look (got %s) — this is the hover bug" % player._look_accum)

	# A press requests capture and records the attempt.
	player._unhandled_input(_press())
	_check(player._capture_attempted,
		"a mouse press must record a capture attempt, or refusal can never be detected")
	# Simulate a browser which rejects the request (the documented iPadOS case):
	# the player observes the visible cursor on the following frame and enters
	# the explicit drag fallback instead of silently losing look input.
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	player._process(0.0)
	_check(player._capture_refused, "a refused pointer capture is detected after the request")
	_check(not _refusal_hint_seen, "capture refusal waits briefly for an asynchronous browser response")
	player._process(player.CAPTURE_GRACE_SECONDS)
	_check(_refusal_hint_seen, "a refused pointer capture emits the one-time player hint")

	# 3. Refusal latched, no button held: still must not look.
	player._capture_refused = true
	player._look_accum = Vector2.ZERO
	player._unhandled_input(_motion(Vector2(50, 0), 0))
	_check(player._look_accum == Vector2.ZERO,
		"with pointer lock refused, motion with NO button held must not look "
		+ "(got %s) — the cursor has to stay usable for UI on iPad" % player._look_accum)

	# 4. Refusal latched, button held: this is the trackpad drag.
	player._look_accum = Vector2.ZERO
	player._unhandled_input(_motion(Vector2(50, 0), MOUSE_BUTTON_MASK_LEFT))
	_check(player._look_accum == Vector2(50, 0),
		("with pointer lock refused, DRAG must look (got %s) — this is the "
		+ "iPad-trackpad case the whole change exists for") % player._look_accum)

	# Right button drags too; iPadOS two-finger click reports as right.
	player._look_accum = Vector2.ZERO
	player._unhandled_input(_motion(Vector2(0, 30), MOUSE_BUTTON_MASK_RIGHT))
	_check(player._look_accum == Vector2(0, 30),
		"a right-button drag must also look (got %s)" % player._look_accum)

	# A keyboard is an equally strong signal that the player wants the pointer
	# layout. This is the iPad hardware-keyboard path: no touchscreen capability
	# bit is allowed to keep hiding mouse capture behind touch-only behavior.
	WardInput.set_touch_mode()
	var key := InputEventKey.new()
	key.pressed = true
	key.echo = false
	WardInput._input(key)
	_check(WardInput.is_pointer_mode(), "a real non-echo keyboard event selects pointer mode")

	# Switching away from a held virtual stick clears its transient state. A
	# touch arriving later selects the touch layout again, while a pointer event
	# selects it back without leaving movement stuck in either direction.
	WardInput.set_touch_mode()
	player._touch_stick_id = 4
	player._touch_stick_vec = Vector2(1, 0)
	player._look_accum = Vector2(12, 6)
	WardInput.set_pointer_mode()
	_check(player._touch_stick_id == -1 and player._touch_stick_vec == Vector2.ZERO
		and player._look_accum == Vector2.ZERO, "pointer transition clears held touch/look state")
	WardInput.set_touch_mode()
	player._touch_stick_id = 7
	player._touch_stick_vec = Vector2(-1, 0)
	player.set_input_enabled(false)
	_check(player._touch_stick_id == -1 and player._touch_stick_vec == Vector2.ZERO,
		"pausing input clears a held virtual stick")
	player.set_input_enabled(true)
	WardInput.set_touch_mode()
	_check(WardInput.is_touch_mode(), "a real touch transition selects touch mode")
	var controls: Node = (load("res://ui/touch_controls.tscn") as PackedScene).instantiate()
	add_child(controls)
	await get_tree().process_frame
	_check(controls.visible, "touch controls show in touch mode")
	WardInput.set_pointer_mode()
	await get_tree().process_frame
	_check(not controls.visible, "touch controls hide after real pointer use")

	# Start-screen buttons are GUI-consumed, so they never reach Player's
	# _unhandled_input. Exercise the real button handler and verify it still
	# requests capture on an iPad trackpad once WardInput selected pointer mode.
	var overlay: Node = (load("res://ui/start_overlay.tscn") as PackedScene).instantiate()
	add_child(overlay)
	await get_tree().process_frame
	player._capture_attempted = false
	WardInput.set_pointer_mode()
	overlay.admit_pressed.connect(player.request_pointer_capture)
	overlay._admit_btn.emit_signal("pressed")
	_check(player._capture_attempted, "pointer capture can be requested by a button gesture")

	# Touch must be untouched by all of this.
	WardInput.set_touch_mode()
	var emulated := _motion(Vector2(20, 0))
	emulated.device = InputEvent.DEVICE_ID_EMULATION
	WardInput._input(emulated)
	_check(WardInput.is_touch_mode(), "synthetic mouse motion cannot promote touch mode to pointer")
	player._look_accum = Vector2.ZERO
	player._unhandled_input(emulated)
	_check(player._look_accum == Vector2.ZERO, "synthetic mouse motion cannot drive player look")
	# Godot's web backend can emit a normal-device MouseMotion immediately
	# before each ScreenDrag. An active finger is the only reliable way to
	# identify this compatibility motion; after release, a real mouse motion
	# must still switch back to pointer mode.
	var mode_touch := InputEventScreenTouch.new()
	mode_touch.index = 91
	mode_touch.pressed = true
	mode_touch.position = Vector2(player.viewport_width() * 0.75, 100)
	WardInput.set_pointer_mode()
	WardInput._input(mode_touch)
	player._unhandled_input(mode_touch)
	var touch_compat_motion := _motion(Vector2(8, 0))
	WardInput._input(touch_compat_motion)
	player._unhandled_input(touch_compat_motion)
	_check(WardInput.is_touch_mode(), "normal-device motion during an active touch cannot steal touch mode")
	_check(player._touch_look_id == mode_touch.index,
		"normal-device motion during an active touch cannot clear the player's look finger")
	var mode_drag := InputEventScreenDrag.new()
	mode_drag.index = mode_touch.index
	mode_drag.position = mode_touch.position + Vector2(12, 0)
	mode_drag.relative = Vector2(12, 0)
	WardInput._input(mode_drag)
	player._unhandled_input(mode_drag)
	_check(player._touch_look_id == mode_touch.index and player._look_accum != Vector2.ZERO,
		"the following screen drag still reaches the player's touch look handler")
	var mode_release := InputEventScreenTouch.new()
	mode_release.index = mode_touch.index
	mode_release.pressed = false
	WardInput._input(mode_release)
	player._unhandled_input(mode_release)
	WardInput._input(_motion(Vector2(8, 0)))
	_check(WardInput.is_pointer_mode(), "mouse motion after touch release restores pointer mode")
	var touch := InputEventScreenTouch.new()
	touch.index = 0
	touch.pressed = true
	touch.position = Vector2(player.viewport_width() * 0.75, 400)
	player._unhandled_input(touch)
	var drag := InputEventScreenDrag.new()
	drag.index = 0
	drag.position = Vector2(900, 400)
	drag.relative = Vector2(20, 0)
	player._unhandled_input(drag)
	var expected: Vector2 = drag.relative * (player.TOUCH_FULL_SWEEP_RAD / player.viewport_width() / Tuning.LOOK_SENSITIVITY)
	_check(player._look_accum.is_equal_approx(expected),
		"one touch drag must apply one viewport-normalised look delta")
	controls.disable_for_end()
	controls._input(touch)
	_check(not controls.visible, "touch controls stay hidden after the END lifecycle disables them")
	controls.queue_free()
	overlay.queue_free()
	player.queue_free()
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	await get_tree().process_frame

	print("test_input_look: %d assertion(s)" % _checks)
	if _fails == 0:
		print("  OK - hybrid pointer/touch mode, capture fallback, and touch look policy hold")
	else:
		print("  %d failure(s)" % _fails)
	get_tree().quit(1 if _fails > 0 else 0)
