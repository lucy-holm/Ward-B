# Diegetic-ish HUD. Control nodes on a CanvasLayer, driven entirely by
# signals from StateManager/GameState — nothing here polls.
extends CanvasLayer

@onready var objective_label: Label = $Margin/Root/Objective
@onready var toast_label: Label = $Margin/Root/Toast
@onready var prompt_label: Label = $Center/Prompt
@onready var reticle: Panel = $Center/Reticle
@onready var pills_label: Label = $Margin/Root/Bottom/Pills
@onready var med_bar: ProgressBar = $Margin/Root/Bottom/Medication
@onready var vignette: ColorRect = $Vignette
@onready var threat_label: Label = $Margin/Root/Threat

var _toast_tween: Tween
var _threat_shown := 0.0


func _ready() -> void:
	StateManager.medication_changed.connect(_on_medication_changed)
	StateManager.shift_ability_changed.connect(_on_shift_ability_changed)
	StateManager.state_changed.connect(_on_state_changed)
	GameState.pills_changed.connect(_on_pills_changed)

	toast_label.modulate.a = 0.0
	med_bar.visible = false
	_on_pills_changed(GameState.pills)


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


func _on_shift_ability_changed(can_shift: bool) -> void:
	pills_label.visible = can_shift


func _on_medication_changed(fraction: float) -> void:
	med_bar.value = fraction * 100.0
	var warning := StateManager.seconds_remaining() <= Tuning.MEDICATION_WARN_SEC
	med_bar.modulate = Color(1.0, 0.35, 0.2) if warning else Color(0.85, 0.93, 0.9)


func _on_state_changed(next: StateManager.State, _prev: StateManager.State, _source: String) -> void:
	med_bar.visible = next == StateManager.State.LUCID


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
