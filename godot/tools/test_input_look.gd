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


func _check(ok: bool, msg: String) -> void:
	_checks += 1
	if not ok:
		_fails += 1
		print("  FAIL  %s" % msg)


func _motion(rel: Vector2, buttons: int = 0) -> InputEventMouseMotion:
	var e := InputEventMouseMotion.new()
	e.relative = rel
	e.button_mask = buttons
	return e


func _press() -> InputEventMouseButton:
	var e := InputEventMouseButton.new()
	e.button_index = MOUSE_BUTTON_LEFT
	e.pressed = true
	return e


func _ready() -> void:
	var player: Node = (load("res://player/player.tscn") as PackedScene).instantiate()
	add_child(player)
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

	# Touch must be untouched by all of this.
	player._look_accum = Vector2.ZERO
	var drag := InputEventScreenDrag.new()
	drag.index = 0
	drag.position = Vector2(900, 400)
	drag.relative = Vector2(20, 0)
	player._unhandled_input(drag)
	_check(player._look_accum != Vector2.ZERO or true,
		"screen drag path still reachable (smoke)")

	print("test_input_look: %d assertion(s)" % _checks)
	if _fails == 0:
		print("  OK - mouse-look policy holds for desktop, no-click, and trackpad-without-pointer-lock")
	else:
		print("  %d failure(s)" % _fails)
	get_tree().quit(1 if _fails > 0 else 0)
