# On-screen controls for touch devices.
#
# WHY THIS EXISTS: the first mobile build had working look/move drag handling
# and was still completely unplayable, because interact (E) and shift (Q)
# existed only as keyboard actions. You could walk around Room 1 and never
# take the pill. Touch drag handling is necessary but not sufficient — a
# phone player needs buttons for every verb.
#
# Layout mirrors the Three.js build: left half is the move stick (drawn where
# your thumb lands, not a fixed position), right half is look-drag, and the
# two action buttons sit bottom-right under the right thumb.
#
# The root Control is MOUSE_FILTER_IGNORE so it never swallows the look-drag;
# only the buttons themselves consume input.
extends CanvasLayer

signal interact_pressed
signal shift_pressed

@onready var _stick_base: Panel = $Root/StickBase
@onready var _stick_knob: Panel = $Root/StickKnob
@onready var _buttons: Control = $Root/Buttons

var player: Node = null


## Button geometry as a FRACTION of viewport width. Godot's web UI space is
## the canvas drawing buffer (CSS x devicePixelRatio), so any fixed pixel size
## shrinks on a high-DPI phone — an 88px button lands at ~33 physical points,
## under the ~44pt thumb-target guideline. Sizing off the viewport keeps the
## physical size right on every device.
const BTN_FRACTION := 0.155
const MARGIN_FRACTION := 0.035
const BTN_MIN := 72.0
const BTN_MAX := 260.0


func _ready() -> void:
	$Root/Buttons/Interact.pressed.connect(func() -> void: interact_pressed.emit())
	$Root/Buttons/Shift.pressed.connect(func() -> void: shift_pressed.emit())

	var touch := DisplayServer.is_touchscreen_available()
	visible = touch
	_stick_base.visible = false
	_stick_knob.visible = false

	_layout()
	get_viewport().size_changed.connect(_layout)


func button_size() -> float:
	var vw := float(get_viewport().get_visible_rect().size.x)
	return clampf(BTN_FRACTION * vw, BTN_MIN, BTN_MAX)


func _layout() -> void:
	var vp := get_viewport().get_visible_rect().size
	var btn := button_size()
	var m := MARGIN_FRACTION * float(vp.x)

	var interact: Button = $Root/Buttons/Interact
	var shift: Button = $Root/Buttons/Shift
	for b: Button in [interact, shift]:
		b.custom_minimum_size = Vector2(btn, btn)
		b.size = Vector2(btn, btn)
		b.add_theme_font_size_override("font_size", int(btn * 0.34))
		# Corner radius has to scale with the button or they render as
		# rounded squares once the viewport-derived size exceeds the radius
		# baked into the .tscn.
		var sb: StyleBoxFlat = b.get_theme_stylebox("normal").duplicate()
		sb.set_corner_radius_all(int(btn * 0.5))
		for state in ["normal", "hover", "pressed", "focus"]:
			b.add_theme_stylebox_override(state, sb)

	# E sits above Q, both hugging the bottom-right corner under the thumb.
	interact.position = Vector2(vp.x - m - btn, vp.y - m - btn * 2.1)
	shift.position = Vector2(vp.x - m - btn * 2.1, vp.y - m - btn)

	var base := btn * 1.6
	_stick_base.size = Vector2(base, base)
	_stick_knob.size = Vector2(base * 0.45, base * 0.45)


func _input(event: InputEvent) -> void:
	# Some mobile browsers report is_touchscreen_available() false. Reveal the
	# controls the moment a real touch arrives, so a phone is never left
	# without buttons. Never hides again — a device that has touched once has
	# a touchscreen.
	if not visible and event is InputEventScreenTouch:
		visible = true


func _process(_delta: float) -> void:
	if player == null or not visible:
		return
	var s: Dictionary = player.get_touch_stick()
	var active: bool = s["active"]
	_stick_base.visible = active
	_stick_knob.visible = active
	if not active:
		return

	var origin: Vector2 = s["origin"]
	var radius: float = s["radius"]
	_stick_base.position = origin - _stick_base.size * 0.5
	_stick_knob.position = origin + (s["vec"] as Vector2) * radius - _stick_knob.size * 0.5
