# Diegetic-ish HUD. Control nodes on a CanvasLayer, driven entirely by
# signals from StateManager/GameState — nothing here polls.
extends CanvasLayer

@onready var objective_label: Label = $Margin/Root/Objective
@onready var toast_label: Label = $Margin/Root/Toast
@onready var prompt_label: Label = $Center/Prompt
@onready var reticle: Panel = $Center/Reticle
@onready var pills_label: Label = $Margin/Root/Bottom/Pills
@onready var med_bar: ProgressBar = $Margin/Root/Bottom/Medication

var _toast_tween: Tween


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
