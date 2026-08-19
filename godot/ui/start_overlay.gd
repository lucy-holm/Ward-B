# Start screen + gameplay-config panel — the only route into a run, and the
# only route to the settings.
#
# The START panel and the randomize-codes row are ported verbatim (wording
# included — this game's voice is deliberate) from index.html's
# #startOverlay/#settingsOverlay and src/ui/hud.ts's showStart()/bindConfig().
# Two behaviours carried over on purpose:
#   - every control is re-seeded from its getter EVERY time the config panel
#     opens, not just once at boot, so it always reflects the persisted value.
#   - CONFIGURATION's DONE button returns to the START panel, not into the
#     game — there is no route from here straight into a run except ADMIT ME.
#
# BRIGHTNESS has no Three.js counterpart; it is new here, so the layout and
# copy are written to match the existing panel rather than ported.
#
# WHY THE CONFIG PANEL IS SEE-THROUGH AND BOTTOM-WEIGHTED
#
# A brightness slider you cannot see the effect of is worse than no slider:
# the player sets it blind, starts the game, finds it wrong, and has to quit
# back out. So the settings panel's scrim is thin (0.32 alpha, against the
# start screen's near-opaque 0.92) and its content is anchored to the BOTTOM,
# leaving the upper half of the screen showing the live, already-loaded ward.
# main.gd has loaded room 1 and applied the mood before this overlay is ever
# shown, so what shows through is a real game frame at the real exposure, and
# dragging the slider changes it on the same tick
# (main.gd.apply_brightness_now, wired to brightness_changed).
#
# That is also why this does NOT try to preview brightness with a row of grey
# swatches, which is the usual calibration idiom: tonemap_exposure is a 3D
# post-process, so 2D CanvasLayer swatches would not respond to the slider at
# all and would be an actively misleading reference.
#
# It is also why there is no mid-game config route. One would mean pausing,
# re-showing this layer over a captured mouse and restoring capture after —
# the exact area where this project has already shipped an unplayable mobile
# build — for a setting the player can now judge properly before ADMIT ME.
#
# MOUSE FILTERS: this overlay lives on its OWN CanvasLayer, deliberately not
# inside ui/hud.tscn, because hud.gd forces MOUSE_FILTER_IGNORE recursively
# over its whole tree (one full-screen Control left at the default
# MOUSE_FILTER_STOP made the first mobile build totally unplayable — no look,
# no move, no interact). This overlay is the opposite case: it genuinely needs
# clicks and touches. The rule it must honour instead is that it stops
# consuming input completely once dismissed, which _on_admit_pressed does by
# hiding the whole CanvasLayer — that drops every child out of GUI picking.
extends CanvasLayer

signal admit_pressed
signal brightness_changed

const INTRO_BBCODE := "You are a patient. What you see depends on what you've taken.\n\n[color=#9fd8cb]DESKTOP[/color] — WASD move · mouse look · [color=#9fd8cb]E[/color] interact · [color=#9fd8cb]Q[/color] shift state\n[color=#9fd8cb]MOBILE[/color] — left stick move · drag right side to look · on-screen buttons\n\nSome things only exist when you're [color=#9fd8cb]lucid[/color]. Some only when you're [color=#ff3b30]not[/color].\nNeither state is lying to you. Neither is telling the truth."

const TOGGLE_BBCODE := "randomize keypad codes\n[color=#e9f2ef99]a fresh code — and a fresh wall clue — every time you enter a room or get caught.[/color]"

const BRIGHTNESS_BBCODE := "brightness\n[color=#e9f2ef99]the ward is meant to be dark. raise this until the walls behind this panel are just barely there — no further.[/color]"

const COLOR_INK := Color(0.914, 0.949, 0.937)
const COLOR_LUCID := Color(0.624, 0.847, 0.796)
const COLOR_GHOST_BORDER := Color(0.914, 0.949, 0.937, 0.3)

@onready var _start_panel: Control = $StartPanel
@onready var _settings_panel: Control = $SettingsPanel
@onready var _admit_btn: Button = $StartPanel/CenterContainer/Center/AdmitBtn
@onready var _config_btn: Button = $StartPanel/CenterContainer/Center/ConfigBtn
@onready var _intro_label: RichTextLabel = $StartPanel/CenterContainer/Center/Card/Intro
@onready var _settings_center: VBoxContainer = $SettingsPanel/Center
@onready var _done_btn: Button = $SettingsPanel/Center/DoneBtn
@onready var _rows: VBoxContainer = $SettingsPanel/Center/Card/Rows
@onready var _brightness_label: RichTextLabel = $SettingsPanel/Center/Card/Rows/BrightnessRow/Label
@onready var _brightness_slider: HSlider = $SettingsPanel/Center/Card/Rows/BrightnessRow/SliderRow/Slider
@onready var _brightness_value: Label = $SettingsPanel/Center/Card/Rows/BrightnessRow/SliderRow/Value
# A toggle Button showing "[  ]" / "[X]", NOT a CheckBox. CheckBox draws its
# tick from a fixed-size theme icon that custom_minimum_size does not scale,
# so on a 1728x1080 canvas it rendered as a small washed-out square next to
# 1.4x-scaled type — the exact "UI is too small" complaint this project has
# already had twice. Text scales with font_size like everything else here,
# gives a far larger touch target, and reads as on-voice for a game already
# rendering its HUD in monospace.
@onready var _toggle: Button = $SettingsPanel/Center/Card/Rows/ToggleRow/Toggle
@onready var _toggle_label: RichTextLabel = $SettingsPanel/Center/Card/Rows/ToggleRow/Label

# Authored against 720p, same convention as ui/hud.gd and ui/keypad.gd, which
# both had to be retrofitted with exactly this after the author reported the
# UI was too small twice: a fixed pixel layout renders at roughly a third of
# its intended relative size on a 1728x1080 desktop canvas. Project stretch is
# disabled project-wide (see project.godot), so nothing else scales this for
# us — every font size and control size below derives from viewport height
# against this baseline, and _apply_scale is reconnected on size_changed.
const BASE_HEIGHT := 720.0
const SCALE_MIN := 0.85
const SCALE_MAX := 2.2


func _ready() -> void:
	# Above every other CanvasLayer in the game (keypad 5, touch controls 3,
	# HUD 0, grain -1) — nothing may draw over the start screen.
	layer = 10

	_setup_rich_label(_intro_label, INTRO_BBCODE)
	_setup_rich_label(_toggle_label, TOGGLE_BBCODE)
	_setup_rich_label(_brightness_label, BRIGHTNESS_BBCODE)

	_start_panel.visible = true
	_settings_panel.visible = false

	_brightness_slider.min_value = WardSettings.BRIGHTNESS_MIN
	_brightness_slider.max_value = WardSettings.BRIGHTNESS_MAX
	_brightness_slider.step = WardSettings.BRIGHTNESS_STEP

	_admit_btn.pressed.connect(_on_admit_pressed)
	_config_btn.pressed.connect(_on_config_pressed)
	_done_btn.pressed.connect(_on_done_pressed)
	_toggle.toggled.connect(_on_toggle_changed)
	_brightness_slider.value_changed.connect(_on_brightness_changed)

	_apply_scale()
	get_viewport().size_changed.connect(_apply_scale)


func _setup_rich_label(label: RichTextLabel, bbcode: String) -> void:
	label.bbcode_enabled = true
	label.fit_content = true
	label.scroll_active = false
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	label.text = bbcode


func _apply_scale() -> void:
	var vp := get_viewport().get_visible_rect().size
	var s := clampf(float(vp.y) / BASE_HEIGHT, SCALE_MIN, SCALE_MAX)
	var card_w := clampf(520.0 * s, 240.0, float(vp.x) * 0.86)

	# --- start panel
	$StartPanel/CenterContainer/Center.add_theme_constant_override("separation", int(20 * s))
	var title := $StartPanel/CenterContainer/Center/Title
	title.get_node("WARD").add_theme_font_size_override("font_size", int(34 * s))
	title.get_node("B").add_theme_font_size_override("font_size", int(34 * s))
	$StartPanel/CenterContainer/Center/Sub.add_theme_font_size_override("font_size", int(11 * s))

	var card: PanelContainer = $StartPanel/CenterContainer/Center/Card
	card.custom_minimum_size = Vector2(card_w, 0)
	_style_card(card, s, 0.6)
	_intro_label.add_theme_font_size_override("normal_font_size", int(13 * s))

	_style_button(_admit_btn, s, false)
	_style_button(_config_btn, s, true)

	# --- settings panel
	_settings_center.add_theme_constant_override("separation", int(20 * s))
	# Bottom-anchored so the live ward stays visible above it (see header).
	# grow_vertical = BEGIN in the scene, so the box grows upward from here.
	_settings_center.offset_bottom = -28.0 * s
	_settings_center.offset_left = -card_w * 0.5
	_settings_center.offset_right = card_w * 0.5

	$SettingsPanel/Center/Title.add_theme_font_size_override("font_size", int(34 * s))
	$SettingsPanel/Center/Sub.add_theme_font_size_override("font_size", int(11 * s))

	var settings_card: PanelContainer = $SettingsPanel/Center/Card
	settings_card.custom_minimum_size = Vector2(card_w, 0)
	# Denser than the start card: this one sits over a see-through scrim, so
	# it needs its own contrast to stay legible against a live 3D frame.
	_style_card(settings_card, s, 0.88)
	_rows.add_theme_constant_override("separation", int(16 * s))

	_brightness_label.add_theme_font_size_override("normal_font_size", int(13 * s))
	_brightness_value.add_theme_font_size_override("font_size", int(13 * s))
	# Wide enough that "100%" -> "95%" doesn't shuffle the slider sideways.
	_brightness_value.custom_minimum_size = Vector2(52.0 * s, 0)
	# HSlider's default grabber is tiny; on a phone it is unusable. Height
	# also drives the grabber hit area.
	_brightness_slider.custom_minimum_size = Vector2(0, maxf(28.0, 30.0 * s))

	_toggle_label.add_theme_font_size_override("normal_font_size", int(13 * s))
	_style_toggle(s)

	_style_button(_done_btn, s, false)


func _style_toggle(s: float) -> void:
	var flat := StyleBoxEmpty.new()
	for state in ["normal", "hover", "pressed", "focus"]:
		_toggle.add_theme_stylebox_override(state, flat)
	_toggle.add_theme_font_size_override("font_size", int(17 * s))
	_toggle.add_theme_color_override("font_color", COLOR_INK)
	_toggle.add_theme_color_override("font_hover_color", COLOR_LUCID)
	_toggle.add_theme_color_override("font_pressed_color", COLOR_LUCID)
	# Above the ~44pt thumb guideline even at SCALE_MIN.
	_toggle.custom_minimum_size = Vector2(maxf(44.0, 44.0 * s), maxf(40.0, 40.0 * s))
	_refresh_toggle_text()


func _refresh_toggle_text() -> void:
	_toggle.text = "[X]" if _toggle.button_pressed else "[  ]"
	_toggle.add_theme_color_override(
		"font_color", COLOR_LUCID if _toggle.button_pressed else COLOR_INK)


func _style_card(card: PanelContainer, s: float, bg_alpha: float) -> void:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.039, 0.063, 0.055, bg_alpha)
	sb.border_width_left = 1
	sb.border_width_top = 1
	sb.border_width_right = 1
	sb.border_width_bottom = 1
	sb.border_color = Color(0.624, 0.847, 0.796, 0.25)
	sb.corner_radius_top_left = 2
	sb.corner_radius_top_right = 2
	sb.corner_radius_bottom_right = 2
	sb.corner_radius_bottom_left = 2
	sb.content_margin_left = 20.0 * s
	sb.content_margin_right = 20.0 * s
	sb.content_margin_top = 18.0 * s
	sb.content_margin_bottom = 18.0 * s
	card.add_theme_stylebox_override("panel", sb)


func _style_button(btn: Button, s: float, ghost: bool) -> void:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0, 0, 0, 0)
	sb.border_width_left = 1
	sb.border_width_top = 1
	sb.border_width_right = 1
	sb.border_width_bottom = 1
	sb.corner_radius_top_left = 2
	sb.corner_radius_top_right = 2
	sb.corner_radius_bottom_right = 2
	sb.corner_radius_bottom_left = 2
	sb.border_color = COLOR_GHOST_BORDER if ghost else COLOR_LUCID
	sb.content_margin_left = (22.0 if ghost else 30.0) * s
	sb.content_margin_right = (22.0 if ghost else 30.0) * s
	sb.content_margin_top = (10.0 if ghost else 13.0) * s
	sb.content_margin_bottom = (10.0 if ghost else 13.0) * s

	var sb_pressed := sb.duplicate() as StyleBoxFlat
	sb_pressed.bg_color = Color(0.624, 0.847, 0.796, 0.15)

	btn.add_theme_stylebox_override("normal", sb)
	btn.add_theme_stylebox_override("hover", sb)
	btn.add_theme_stylebox_override("pressed", sb_pressed)
	btn.add_theme_stylebox_override("focus", sb)
	btn.add_theme_color_override("font_color", COLOR_INK if ghost else COLOR_LUCID)
	btn.add_theme_color_override("font_hover_color", COLOR_INK if ghost else COLOR_LUCID)
	btn.add_theme_font_size_override("font_size", int((10 if ghost else 12) * s))
	# Keep every touch target above the ~44pt thumb guideline even at
	# SCALE_MIN, matching the sizing rationale in ui/touch_controls.gd.
	btn.custom_minimum_size = Vector2(0, maxf(40.0, 46.0 * s))


# --- panel switching ---------------------------------------------------

func _on_admit_pressed() -> void:
	# Hide first, exactly like hud.ts's showStart (display:none, THEN the
	# onStart callback) — and because this drops the whole layer out of GUI
	# picking, it also satisfies the "must not keep consuming input once
	# dismissed" rule: there is nothing left here to swallow a click or a
	# touch, so the mouse-filter bug that broke the first mobile build cannot
	# be reintroduced through this overlay.
	visible = false
	admit_pressed.emit()


func _on_config_pressed() -> void:
	# Re-seed EVERY control from its getter every time the panel opens, not
	# just once at boot — ported 1:1 from hud.ts's bindConfig comment.
	# set_*_no_signal, or opening the panel would fire a spurious
	# settings_change event and a redundant brightness write.
	_toggle.set_pressed_no_signal(WardSettings.is_randomize_codes_enabled())
	_refresh_toggle_text()
	_brightness_slider.set_value_no_signal(WardSettings.get_brightness())
	_update_brightness_readout()
	_start_panel.visible = false
	_settings_panel.visible = true


func _on_done_pressed() -> void:
	# Back to the START panel, NOT into the game — matches hud.ts exactly:
	# there is no path from CONFIGURATION straight into a run.
	_settings_panel.visible = false
	_start_panel.visible = true


func _on_toggle_changed(pressed: bool) -> void:
	WardSettings.set_randomize_codes(pressed)
	_refresh_toggle_text()
	# randomizeCodes is a live gameplay variable (fixed vs. random keypad
	# codes) that previously wasn't recorded in any payload, so its effect on
	# completion/frustration metrics couldn't be analysed. Logged on every
	# toggle, not just at boot, since it can be flipped between runs from
	# here. Ported from main.ts:487-495; Telemetry is a global autoload here
	# rather than an injected dependency, the same way room5/6/7 already call
	# it directly.
	Telemetry.event("settings_change", {"key": "randomizeCodes", "value": pressed})


func _on_brightness_changed(value: float) -> void:
	WardSettings.set_brightness(value)
	_update_brightness_readout()
	# Repaint the ward behind the panel on this tick — the whole point of the
	# see-through scrim.
	brightness_changed.emit()
	# Same rationale as randomizeCodes above: a display setting that changes
	# how much of the ward a player can actually see is a confound for every
	# "did they find it" metric, so it has to be on the wire. Not throttled —
	# HSlider only emits on an actual value change, and step is 0.05, so a
	# full-range drag is at most 28 events.
	Telemetry.event("settings_change", {"key": "brightness", "value": value})


func _update_brightness_readout() -> void:
	_brightness_value.text = "%d%%" % roundi(_brightness_slider.value * 100.0)
