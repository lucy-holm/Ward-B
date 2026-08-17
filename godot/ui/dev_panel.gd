# Live render-style tuner. Toggle with ` (backquote) or F3.
#
# Exists so the look can be judged where it is actually played — in a browser
# on the tailnet build — instead of by rebuilding and re-exporting for every
# tweak. Every control writes through WardSettings, which persists to
# user:// (IndexedDB on web), so a setting you land on survives a reload.
#
# THE UI IS BUILT FROM WardSettings.STYLE_SPEC, NOT HAND-LAID-OUT. There is no
# second list of knobs here to fall out of step with the settings; adding a
# uniform means adding one STYLE_SPEC entry and a shader uniform, and the row
# appears by itself. This is also why the rows are constructed in code rather
# than in the .tscn — a .tscn would be exactly the duplicated list this avoids.
#
# WHY BACKQUOTE AND NOT F3. F3 is "find next" in Chrome and Firefox and is
# swallowed before the canvas ever sees it, so on the web build — the one
# deployment this tool is for — F3 alone would appear to do nothing. Backquote
# is the long-standing dev-console convention and no browser claims it. F3 is
# kept as a second binding for desktop runs, where it works fine.
extends CanvasLayer

## Emitted whenever any knob changes. main.gd re-reads WardSettings and pushes
## the values into the shader — the panel deliberately does not touch the
## material itself, so there is one path to the render and it is the same one
## used at startup.
signal style_changed

## Let main.gd gate player input: dragging a slider with WASD live would walk
## you down the corridor, and the mouse has to be freed to grab a slider at
## all. Signals rather than the panel reaching for the player directly, so the
## panel stays independent of what else is in the scene.
signal opened
signal closed

const TITLE := "RENDER STYLE  —  ` or F3 to close"

# Multi-knob jumps, so the look can be surveyed without reasoning about seven
# sliders. Keys are WardSettings style keys; anything omitted is left alone.
const PRESETS := {
	"Off": {
		"style_enabled": 0.0,
	},
	# Matches the shipped defaults: posterised value, hue left alone. See the
	# tint note in core/settings.gd for why this and not full duotone.
	"Recommended": {
		"style_enabled": 1.0, "style_levels": 4.0, "style_pixel_size": 2.0,
		"style_dither": 1.0, "style_tint": 0.0, "style_resolution": 1.0,
	},
	# Both of the duotone looks are kept as presets because they are worth
	# LOOKING at even though they are not the default — but note that either
	# will grey out the red wall graffiti in rooms 3, 4 and 6.
	"Duotone": {
		"style_enabled": 1.0, "style_levels": 4.0, "style_pixel_size": 2.0,
		"style_dither": 1.0, "style_tint": 1.0,
	},
	"1-bit": {
		"style_enabled": 1.0, "style_levels": 2.0, "style_pixel_size": 2.0,
		"style_dither": 1.0, "style_tint": 1.0,
	},
	"Subtle": {
		"style_enabled": 1.0, "style_levels": 8.0, "style_pixel_size": 1.0,
		"style_dither": 1.0, "style_tint": 0.0,
	},
	"Perf": {
		"style_enabled": 1.0, "style_levels": 4.0, "style_pixel_size": 3.0,
		"style_resolution": 0.5,
	},
}

var _rows := {}
var _fps_label: Label
var _root: Control


func _ready() -> void:
	layer = 20
	# Runs while the tree is paused. The panel is reachable from the start
	# overlay and during a keypad prompt, both of which can pause, and a
	# frozen tuner that will not respond to its own close key is worse than
	# no tuner.
	process_mode = Node.PROCESS_MODE_ALWAYS
	_build()
	visible = false


func _build() -> void:
	_root = Control.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	# The root spans the screen only so the panel can be positioned against
	# it; it must not intercept clicks meant for the ward behind it.
	_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_root)

	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_TOP_LEFT)
	panel.position = Vector2(16, 16)
	panel.custom_minimum_size = Vector2(420, 0)
	_root.add_child(panel)

	var margin := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 14)
	panel.add_child(margin)

	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 6)
	margin.add_child(col)

	var title := Label.new()
	title.text = TITLE
	col.add_child(title)

	_fps_label = Label.new()
	col.add_child(_fps_label)

	col.add_child(HSeparator.new())

	# Presets first: this is the control most likely to be wanted, and putting
	# it above the sliders means the panel is useful without reading them.
	var presets := HBoxContainer.new()
	presets.add_theme_constant_override("separation", 4)
	col.add_child(presets)
	for name: String in PRESETS:
		var b := Button.new()
		b.text = name
		b.pressed.connect(_apply_preset.bind(name))
		presets.add_child(b)

	col.add_child(HSeparator.new())

	for key: String in WardSettings.STYLE_SPEC:
		_add_row(col, key, WardSettings.STYLE_SPEC[key])

	col.add_child(HSeparator.new())

	var reset := Button.new()
	reset.text = "Reset to defaults"
	reset.pressed.connect(func() -> void:
		WardSettings.reset_style()
		_refresh()
		style_changed.emit())
	col.add_child(reset)

	# The web canvas is sized in DEVICE pixels with stretch disabled (see the
	# display notes in project.godot), so on a 2.6x phone an unscaled panel
	# renders about a third of its intended physical size and the sliders are
	# untouchable. Scale off the live viewport height instead of assuming.
	var vh := float(get_viewport().get_visible_rect().size.y)
	scale = Vector2.ONE * clampf(vh / 720.0, 1.0, 3.0)


func _add_row(col: VBoxContainer, key: String, spec: Dictionary) -> void:
	var row := VBoxContainer.new()
	row.add_theme_constant_override("separation", 1)
	col.add_child(row)

	var head := HBoxContainer.new()
	row.add_child(head)

	var name_label := Label.new()
	name_label.text = str(spec["label"])
	name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(name_label)

	var value_label := Label.new()
	value_label.custom_minimum_size = Vector2(56, 0)
	value_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	head.add_child(value_label)

	var slider := HSlider.new()
	slider.min_value = float(spec["min"])
	slider.max_value = float(spec["max"])
	slider.step = float(spec["step"])
	slider.value = WardSettings.get_style(key)
	slider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	slider.value_changed.connect(func(v: float) -> void:
		WardSettings.set_style(key, v)
		value_label.text = _format(v)
		style_changed.emit())
	row.add_child(slider)

	var hint := Label.new()
	hint.text = str(spec["hint"])
	hint.add_theme_font_size_override("font_size", 11)
	hint.modulate = Color(1, 1, 1, 0.55)
	row.add_child(hint)

	value_label.text = _format(slider.value)
	_rows[key] = {"slider": slider, "value": value_label}


func _format(v: float) -> String:
	# Integer-stepped knobs (levels, pixel size, the enabled flag) read as
	# noise with trailing decimals.
	return str(int(round(v))) if is_equal_approx(v, round(v)) else "%.2f" % v


func _apply_preset(name: String) -> void:
	var preset: Dictionary = PRESETS[name]
	for key: String in preset:
		WardSettings.set_style(key, float(preset[key]))
	_refresh()
	style_changed.emit()


## Pulls every slider back into line with WardSettings. Used after a preset or
## a reset, where the change did not come from the sliders themselves.
func _refresh() -> void:
	for key: String in _rows:
		var slider: HSlider = _rows[key]["slider"]
		var v := WardSettings.get_style(key)
		# set_value_no_signal, or each slider re-emits value_changed and writes
		# the value it was just given straight back — one redundant ConfigFile
		# save per knob per preset click.
		slider.set_value_no_signal(v)
		_rows[key]["value"].text = _format(v)


func _process(_delta: float) -> void:
	if visible:
		_fps_label.text = "%d fps   %dx%d   3D scale %.2f" % [
			int(Engine.get_frames_per_second()),
			int(get_viewport().get_visible_rect().size.x),
			int(get_viewport().get_visible_rect().size.y),
			get_viewport().scaling_3d_scale,
		]


func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		var k := (event as InputEventKey).keycode
		if k == KEY_QUOTELEFT or k == KEY_F3:
			_toggle()
			# Swallow it: backquote is otherwise a plain character and F3 is a
			# UI action, and letting either fall through means opening the
			# panel can also trigger whatever is focused behind it.
			get_viewport().set_input_as_handled()


func _toggle() -> void:
	visible = not visible
	if visible:
		_refresh()
		opened.emit()
	else:
		closed.emit()
