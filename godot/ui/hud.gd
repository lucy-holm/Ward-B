# Diegetic-ish HUD. Control nodes on a CanvasLayer, driven entirely by
# signals from StateManager/GameState — nothing here polls.
extends CanvasLayer

@onready var objective_label: Label = $Margin/Root/Objective
@onready var toast_label: Label = $Margin/Root/Toast
@onready var prompt_label: Label = $Center/Prompt
@onready var reticle: Panel = $Center/Reticle
@onready var pills_label: Label = $Margin/Root/Bottom/Pills
@onready var med_bar: ProgressBar = $Margin/Root/Bottom/Medication
@onready var countdown_label: Label = $Margin/Root/Bottom/Countdown
@onready var vignette: ColorRect = $Vignette
@onready var threat_label: Label = $Margin/Root/Threat

# The lucid accent, the same teal the start screen and every keypad use. The
# pill readout and the medication meter are both "how much lucidity do you
# have", so they are deliberately the ONE colour in the HUD that means that —
# nothing else here is allowed to use it.
const COLOR_LUCID := Color(0.624, 0.847, 0.796)
# What the meter and its countdown turn once seconds_remaining() drops under
# MEDICATION_WARN_SEC. Matches the threat line's red rather than inventing a
# third alarm colour.
const COLOR_WARNING := Color(0.95, 0.4, 0.32)
# Pills at zero: still readable, but visibly spent. The player can't shift, and
# the readout should say so at a glance rather than only on a second look.
const COLOR_SPENT := Color(0.85, 0.89, 0.87, 0.75)

var _toast_tween: Tween
var _threat_shown := 0.0
# Held so _on_medication_changed can recolour the fill directly. Recolouring
# via med_bar.modulate (which is what this used to do) tints the TRACK as well
# as the fill, so the moment the meter had a visible track the warning state
# turned the empty part red too and the bar stopped reading as a gauge.
var _med_fill: StyleBoxFlat


func _ready() -> void:
	# The HUD is purely informational — nothing in it is clickable. Any
	# Control left at the default MOUSE_FILTER_STOP silently swallows touch
	# input before it reaches the player.
	#
	# This is not hypothetical: the VBox "Spacer" (size_flags_vertical =
	# expand) covered the middle of the screen and made the first mobile
	# build completely unplayable — you could not look, move, or interact.
	# Desktop was fine throughout, because a CAPTURED mouse bypasses GUI
	# picking entirely, so the bug is invisible on a dev machine.
	#
	# Enforced in code rather than per-node in the .tscn so that adding a
	# label to the HUD later cannot quietly break mobile again.
	_ignore_mouse(self)
	# Before the signal connections below, not after: _on_medication_changed
	# writes to _med_fill, so the meter must own its styleboxes before
	# anything can be delivered to it.
	_style_med_bar()
	_apply_scale()
	get_viewport().size_changed.connect(_apply_scale)

	StateManager.medication_changed.connect(_on_medication_changed)
	StateManager.shift_ability_changed.connect(_on_shift_ability_changed)
	StateManager.state_changed.connect(_on_state_changed)
	GameState.pills_changed.connect(_on_pills_changed)

	toast_label.modulate.a = 0.0
	med_bar.visible = false
	countdown_label.visible = false
	_on_pills_changed(GameState.pills)


# Font sizes at the 720p the layout was authored against. Everything scales
# from these, because a fixed pixel size is wrong on any other display: on a
# large desktop canvas the HUD was rendering at roughly a third of its
# intended relative size and was genuinely hard to read. Stretch is disabled
# project-wide (see project.godot) so nothing else scales this for us.
#
# THE PILL/COUNTDOWN PAIR IS SIZED ABOVE THE OBJECTIVE LINE ON PURPOSE. Those
# two are the only readouts a player has to act on under pressure — "can I
# shift" and "how long have I got" — while the objective line is read once on
# entering a room. Before this they were the SMALLEST things on screen, and
# over a lit floor (room 3's windows, room 5's dispenser alcove) the meter was
# a grey hairline on grey and effectively invisible. See _style_med_bar and
# OUTLINE_PX for the other two halves of the same fix.
const BASE_HEIGHT := 720.0
const SIZE_OBJECTIVE := 30
const SIZE_TOAST := 32
const SIZE_THREAT := 30
const SIZE_PILLS := 32
const SIZE_COUNTDOWN := 32
const SIZE_PROMPT := 28
const SCALE_MIN := 0.85
const SCALE_MAX := 2.2

# Dark outline behind every HUD glyph, at 720p.
#
# THE HUD HAS NO PANEL TO SIT ON — it is drawn straight onto the ward, and the
# ward is not a uniform backdrop: room 3's window wall, room 5's alcove and any
# lit floor put near-white behind text picked to read against near-black. An
# outline buys the same legibility a backing plate would without putting chrome
# over the game, which is the whole reason this HUD is styled the way it is.
const OUTLINE_PX := 7
const COLOR_OUTLINE := Color(0.012, 0.02, 0.02, 0.85)


## Re-runs the layout. Public because the mid-game settings panel changes the
## HUD-size setting live, and the HUD is behind that panel while it does.
func refresh_scale() -> void:
	_apply_scale()


func _apply_scale() -> void:
	var h := float(get_viewport().get_visible_rect().size.y)
	# CLAMP THE DERIVATION, THEN APPLY THE SETTING — in that order, and not the
	# other way round. SCALE_MIN/SCALE_MAX bound what the DISPLAY is allowed to
	# ask for; the player's setting rides on top of that answer. Clamping the
	# product instead lets the display's bound eat the player's choice whole: at
	# a viewport shorter than the baseline the product sits under SCALE_MIN, so
	# every hud-size value from 75% to 160% clamped to the same number and the
	# slider did nothing at all.
	var base := clampf(h / BASE_HEIGHT, SCALE_MIN, SCALE_MAX)
	# No second clamp: WardSettings has already bounded the multiplier to
	# [HUD_SCALE_MIN, HUD_SCALE_MAX] on the way in and on the way out of disk.
	var s := base * WardSettings.get_hud_scale()

	objective_label.add_theme_font_size_override("font_size", int(SIZE_OBJECTIVE * s))
	toast_label.add_theme_font_size_override("font_size", int(SIZE_TOAST * s))
	threat_label.add_theme_font_size_override("font_size", int(SIZE_THREAT * s))
	pills_label.add_theme_font_size_override("font_size", int(SIZE_PILLS * s))
	countdown_label.add_theme_font_size_override("font_size", int(SIZE_COUNTDOWN * s))
	prompt_label.add_theme_font_size_override("font_size", int(SIZE_PROMPT * s))

	# Scales with the type, or the outline is a hairline at 2x and a smear at
	# SCALE_MIN. Applied to every label including the ones whose size did not
	# change — the objective and toast lines wash out over a lit wall for
	# exactly the same reason the bottom row did.
	var outline := maxi(2, int(OUTLINE_PX * s))
	for label: Label in [objective_label, toast_label, threat_label,
			pills_label, countdown_label, prompt_label]:
		label.add_theme_constant_override("outline_size", outline)
		label.add_theme_color_override("font_outline_color", COLOR_OUTLINE)

	# Margins and the medication bar scale with it, or the text outgrows its
	# gutter and the bar looks like a hairline next to 2x type.
	var m := int(28 * s)
	var margin: MarginContainer = $Margin
	for side in ["left", "top", "right", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, m)
	# Wider and much taller than the 180x8 hairline this replaced: at 720p
	# that was 8 device pixels of grey-on-grey, and it is the only thing on
	# screen telling the player how long they have left to be lucid.
	med_bar.custom_minimum_size = Vector2(240.0 * s, 16.0 * s)
	$Margin/Root/Bottom.add_theme_constant_override("separation", int(20 * s))
	# The reticle is a fixed-size Panel; keep it proportional too.
	reticle.size = Vector2(6.0 * s, 6.0 * s)
	reticle.position = -reticle.size * 0.5
	prompt_label.position.y = 26.0 * s


func _ignore_mouse(node: Node) -> void:
	if node is Control:
		(node as Control).mouse_filter = Control.MOUSE_FILTER_IGNORE
	for child in node.get_children():
		_ignore_mouse(child)


func set_objective(text: String) -> void:
	objective_label.text = text


func toast(text: String, seconds := 3.2) -> void:
	toast_label.text = text
	if _toast_tween != null and _toast_tween.is_valid():
		_toast_tween.kill()
	toast_label.modulate.a = 0.0
	_toast_tween = create_tween()
	_toast_tween.tween_property(toast_label, "modulate:a", 1.0, 0.25)
	_toast_tween.tween_interval(seconds)
	_toast_tween.tween_property(toast_label, "modulate:a", 0.0, 0.6)


func set_prompt(text: String) -> void:
	prompt_label.text = text
	prompt_label.visible = not text.is_empty()
	reticle.modulate = Color(1, 1, 1, 0.9) if not text.is_empty() else Color(1, 1, 1, 0.35)


func _on_pills_changed(count: int) -> void:
	pills_label.text = "PILLS  %d / %d" % [count, Tuning.PILLS_MAX]
	# Held vs. spent, as colour rather than only as a digit. At PILLS_MAX 1
	# this readout is really a yes/no — "can I shift out of trouble" — and it
	# has to answer that in peripheral vision while an orderly is closing.
	pills_label.add_theme_color_override(
		"font_color", COLOR_LUCID if count > 0 else COLOR_SPENT)


func _on_shift_ability_changed(can_shift: bool) -> void:
	pills_label.visible = can_shift


## Gives the meter a real track and a real fill, replacing ProgressBar's
## default theme. Built once in code rather than as .tscn sub-resources
## because the fill has to be recoloured at runtime and the track's dark
## bordered box is what makes the EMPTY part of the meter readable — without
## it a nearly-drained meter is a few teal pixels floating on the floor
## texture, which reads as "no meter" rather than "almost out".
func _style_med_bar() -> void:
	var track := StyleBoxFlat.new()
	track.bg_color = Color(0.012, 0.02, 0.02, 0.72)
	track.set_border_width_all(1)
	track.border_color = Color(COLOR_LUCID, 0.35)
	track.set_corner_radius_all(2)

	_med_fill = StyleBoxFlat.new()
	_med_fill.bg_color = COLOR_LUCID
	_med_fill.set_corner_radius_all(2)

	med_bar.add_theme_stylebox_override("background", track)
	med_bar.add_theme_stylebox_override("fill", _med_fill)


func _on_medication_changed(fraction: float) -> void:
	med_bar.value = fraction * 100.0

	# ceili, not roundi or floori: the meter is a deadline, and a countdown
	# that shows "0s" while the player still has most of a second left is
	# lying to them at the exact moment it matters most. This reads 45s the
	# instant a pill is taken and only reaches 0s as lucidity actually ends.
	var seconds := StateManager.seconds_remaining()
	countdown_label.text = "%ds" % ceili(seconds)

	var warning := seconds <= Tuning.MEDICATION_WARN_SEC
	var tint := COLOR_WARNING if warning else COLOR_LUCID
	_med_fill.bg_color = tint
	countdown_label.add_theme_color_override("font_color", tint)


func _on_state_changed(next: StateManager.State, _prev: StateManager.State, _source: String) -> void:
	var lucid := next == StateManager.State.LUCID
	med_bar.visible = lucid
	# The countdown follows the meter exactly — a stale "12s" left on screen
	# after a revert would be worse than no number at all.
	countdown_label.visible = lucid


## Directional threat. `level` is the aggregate watch ramp (0..1); `bearing`
## is yaw-relative radians (0 = ahead, + = right) or null when there is no
## orderly to point at.
##
## Ported quirk worth keeping: level <= 0 with a null bearing is a HARD
## snap-to-zero (used on room leave), while every other update eases. Without
## the snap the vignette bleeds into the next room.
func set_threat(level: float, bearing) -> void:
	if level <= 0.0 and bearing == null:
		_threat_shown = 0.0
	else:
		_threat_shown = lerpf(_threat_shown, level, 0.25)
		if absf(_threat_shown - level) < 0.002:
			_threat_shown = level

	vignette.modulate.a = _threat_shown * 0.55

	# Hysteresis on the "he sees you" line: 0.5 on, 0.45 off, so a ramp
	# oscillating at the threshold doesn't strobe it.
	if _threat_shown >= 0.5:
		threat_label.visible = true
	elif _threat_shown < 0.45:
		threat_label.visible = false

	if threat_label.visible and bearing != null:
		var b := float(bearing)
		var side := "ahead"
		if absf(b) > 2.4:
			side = "behind you"
		elif b > 0.7:
			side = "to your right"
		elif b < -0.7:
			side = "to your left"
		threat_label.text = "he sees you — %s" % side
