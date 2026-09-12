# HUD readout tests — the bottom row, tested as logic rather than as pixels.
#
#   godot --headless --path godot tools/test_hud.tscn
#
# The HUD's LOOK is a screenshot judgement (tools/shoot_game.tscn, in lucid,
# which is the only state that shows the meter at all). What is worth pinning
# here is the arithmetic and the wiring underneath it, because both have a
# failure mode that a screenshot taken at full meter cannot see:
#
#   - the countdown ROUNDS UP. It is a deadline. floori/roundi would show the
#     player "0s" with the better part of a second of lucidity still in hand,
#     at the exact moment the number matters most, and a shot taken at 45/45
#     looks identical either way.
#   - the meter and its countdown must appear and disappear TOGETHER. A stale
#     "12s" left over a reverted, unmedicated ward is worse than no number.
#   - every Control in this layer must stay MOUSE_FILTER_IGNORE. hud.gd
#     enforces that recursively in _ready precisely so adding a node here
#     cannot re-break touch input; the Countdown label is a new node, and this
#     is the assertion that proves the recursion actually reached it. The
#     regression it guards made the whole first mobile build unplayable — no
#     look, no move, no interact — and was invisible on desktop, where a
#     captured mouse bypasses GUI picking entirely.
extends Node

var failures: Array[String] = []
var passes := 0

# Same reasoning as test_settings.gd's: a GDScript runtime error aborts only
# the function it happens in, so a suite can silently test less than it claims
# while still exiting 0.
const EXPECTED_ASSERTIONS := 42

var _hud: CanvasLayer


func _check(cond: bool, what: String) -> void:
	if cond:
		passes += 1
	else:
		failures.append(what)


func _ready() -> void:
	_hud = load("res://ui/hud.tscn").instantiate() as CanvasLayer
	add_child(_hud)
	await get_tree().process_frame

	_test_mouse_filters()
	_test_pills_readout()
	_test_countdown_rounds_up()
	_test_warning_colours()
	_test_meter_and_countdown_appear_together()
	await _test_text_wrap_bounds()
	await _test_active_bottom_row_bounds()
	await _test_touch_controls_do_not_cover_readouts()
	_restore()
	_finish()


# --- touch input must survive a new HUD node ---------------------------

func _test_mouse_filters() -> void:
	var offenders: Array[String] = []
	_collect_pickable(_hud, offenders)
	_check(
		offenders.is_empty(),
		"every HUD Control must be MOUSE_FILTER_IGNORE or it swallows touch input before "
		+ "the player sees it — offenders: %s" % ", ".join(offenders))


func _collect_pickable(node: Node, out: Array[String]) -> void:
	if node is Control and (node as Control).mouse_filter != Control.MOUSE_FILTER_IGNORE:
		out.append(String(node.name))
	for child in node.get_children():
		_collect_pickable(child, out)


# --- pills ------------------------------------------------------------

func _test_pills_readout() -> void:
	GameState.pills = 1
	_check(
		_hud.pills_label.text == "PILLS  1 / %d" % Tuning.PILLS_MAX,
		"pills readout should show 1 held (got '%s')" % _hud.pills_label.text)
	_check(
		_hud.pills_label.get_theme_color("font_color").is_equal_approx(_hud.COLOR_LUCID),
		"a held pill must read in the lucid accent — this readout is the "
		+ "'can I shift out of trouble' answer and has to land in peripheral vision")

	GameState.pills = 0
	_check(
		_hud.pills_label.text == "PILLS  0 / %d" % Tuning.PILLS_MAX,
		"pills readout should show 0 held (got '%s')" % _hud.pills_label.text)
	_check(
		_hud.pills_label.get_theme_color("font_color").is_equal_approx(_hud.COLOR_SPENT),
		"a spent pill count must visibly differ from a held one, not merely change digit")

	# The shift AFFORDANCE gates the whole readout — room 1 hides it until the
	# tutorial grants the ability, and it must come back afterwards.
	StateManager.can_shift = false
	_check(not _hud.pills_label.visible, "pills readout must hide before the shift ability is granted")
	StateManager.can_shift = true
	_check(_hud.pills_label.visible, "pills readout must reappear once the shift ability is granted")


# --- countdown --------------------------------------------------------

## Drives the meter the way StateManager._process does — set the value, emit —
## rather than waiting real seconds, so the boundary cases are exact.
func _set_meter(seconds: float) -> void:
	StateManager.medication = seconds / Tuning.MEDICATION_DURATION_SEC
	StateManager.medication_changed.emit(StateManager.medication)


func _test_countdown_rounds_up() -> void:
	_set_meter(Tuning.MEDICATION_DURATION_SEC)
	_check(
		_hud.countdown_label.text == "45s",
		"a fresh pill must read the full duration (got '%s')" % _hud.countdown_label.text)

	_set_meter(12.3)
	_check(
		_hud.countdown_label.text == "13s",
		"12.3s left must round UP to 13s, not down (got '%s')" % _hud.countdown_label.text)

	# THE CASE THE ROUNDING EXISTS FOR. With floori or roundi this reads "0s"
	# while the player still has lucidity to spend, which in a game whose only
	# escape from an orderly is a shift is an actively dangerous lie.
	_set_meter(0.04)
	_check(
		_hud.countdown_label.text == "1s",
		"a fraction of a second left must still read 1s, never 0s (got '%s')"
			% _hud.countdown_label.text)

	_set_meter(0.0)
	_check(
		_hud.countdown_label.text == "0s",
		"an empty meter must read 0s (got '%s')" % _hud.countdown_label.text)


func _test_warning_colours() -> void:
	# Just ABOVE the threshold: still calm.
	_set_meter(Tuning.MEDICATION_WARN_SEC + 0.5)
	_check(
		_hud._med_fill.bg_color.is_equal_approx(_hud.COLOR_LUCID),
		"above the warn threshold the meter fill stays the lucid accent")
	_check(
		_hud.countdown_label.get_theme_color("font_color").is_equal_approx(_hud.COLOR_LUCID),
		"above the warn threshold the countdown stays the lucid accent")

	# ON the threshold: MEDICATION_WARN_SEC is the value StateManager itself
	# fires medication_warning at (<=), so the HUD must agree at exactly that
	# value rather than a tick either side of it.
	_set_meter(Tuning.MEDICATION_WARN_SEC)
	_check(
		_hud._med_fill.bg_color.is_equal_approx(_hud.COLOR_WARNING),
		"at exactly MEDICATION_WARN_SEC the meter fill must turn to the warning colour, "
		+ "matching the <= that StateManager fires medication_warning on")
	_check(
		_hud.countdown_label.get_theme_color("font_color").is_equal_approx(_hud.COLOR_WARNING),
		"at exactly MEDICATION_WARN_SEC the countdown must turn to the warning colour")

	# Recolouring the FILL, not the whole bar. This used to be med_bar.modulate,
	# which tints the track too — so the empty part of the meter went red with
	# the full part and the bar stopped reading as a gauge at the one moment it
	# is being read hardest.
	_check(
		_hud.med_bar.modulate.is_equal_approx(Color(1, 1, 1, 1)),
		"the warning state must recolour the fill stylebox, NOT modulate the whole bar")


func _test_meter_and_countdown_appear_together() -> void:
	StateManager.force_state(StateManager.State.LUCID, "test_hud")
	_check(_hud.med_bar.visible, "the meter must be visible while lucid")
	_check(_hud.countdown_label.visible, "the countdown must be visible while lucid")

	StateManager.force_state(StateManager.State.UNMED, "test_hud")
	_check(not _hud.med_bar.visible, "the meter must hide on revert")
	_check(
		not _hud.countdown_label.visible,
		"the countdown must hide on revert too — a stale '12s' over an unmedicated "
		+ "ward is worse than no number at all")


# --- responsive text bounds --------------------------------------------

func _test_text_wrap_bounds() -> void:
	var objective := "OBJECTIVE: find the medication cabinet at the end of the east corridor and return before the orderly reaches the junction"
	var vp := get_viewport()
	for size: Vector2i in [Vector2i(1280, 720), Vector2i(390, 844)]:
		vp.size = size
		await get_tree().process_frame
		_hud._apply_scale()
		_hud.set_objective(objective)
		_hud.toast(objective)
		_hud.threat_label.text = objective
		await get_tree().process_frame

		var margin := _hud.get_node("Margin") as MarginContainer
		var right_edge := float(size.x) - float(margin.get_theme_constant("margin_right"))
		var bounded := true
		for label: Label in [_hud.objective_label, _hud.toast_label, _hud.threat_label]:
			bounded = bounded and label.get_global_rect().end.x <= right_edge + 1.0
		_check(bounded,
			"HUD objective/toast/threat text must stay inside the %dx%d right margin" % [size.x, size.y])
		_check(_hud.objective_label.get_line_count() > 1,
			"the long objective must wrap at %dx%d instead of expanding past the viewport" % [size.x, size.y])


func _test_active_bottom_row_bounds() -> void:
	# The bottom row has its largest practical minimum width while lucid with
	# the shift affordance available: pills + meter + countdown are all live.
	# Portrait devices must keep the text and meter inside the same margins as
	# the objective; the meter is the flexible element that yields width.
	StateManager.can_shift = true
	StateManager.force_state(StateManager.State.LUCID, "test_hud_bottom_bounds")
	_hud.objective_label.text = "OBJECTIVE"
	_hud.toast_label.text = ""
	_hud.threat_label.visible = true
	_hud.threat_label.text = "HE SEES YOU"
	for size: Vector2i in [Vector2i(1280, 720), Vector2i(390, 844), Vector2i(1081, 2202)]:
		get_viewport().size = size
		await get_tree().process_frame
		_hud._apply_scale()
		# Child minimum-size changes propagate through HBox -> VBox -> Margin.
		# Let the nested container layout settle before measuring its bounds.
		for frame in 3:
			await get_tree().process_frame
		var margin := _hud.get_node("Margin") as MarginContainer
		var right_edge := float(size.x) - float(margin.get_theme_constant("margin_right"))
		_check(
			_hud.get_node("Margin/Root/Bottom").get_global_rect().end.x <= right_edge + 1.0,
			"active bottom HUD row must stay inside the %dx%d right margin" % [size.x, size.y])
		_check(_hud.med_bar.size.x >= 16.0,
			"active medication meter must retain a visible width at %dx%d" % [size.x, size.y])


func _test_touch_controls_do_not_cover_readouts() -> void:
	var controls := (load("res://ui/touch_controls.tscn") as PackedScene).instantiate()
	add_child(controls)
	_hud._touch_layout = true
	for size: Vector2i in [Vector2i(390, 844), Vector2i(1081, 2202), Vector2i(844, 390)]:
		get_viewport().size = size
		await get_tree().process_frame
		_hud._apply_scale()
		controls._layout()
		for frame in 3:
			await get_tree().process_frame
		var row: Rect2 = _hud.get_node("Margin/Root/Bottom").get_global_rect()
		for name in ["Interact", "Shift"]:
			_check(not row.intersects(controls.get_node("Root/Buttons/" + name).get_global_rect()),
				"%s touch button must not cover medication readouts at %s" % [name, size])
		_check(not _hud.objective_label.get_global_rect().intersects(controls.get_node("Root/Pause").get_global_rect()),
			"pause button must not cover the objective at %s" % size)
		_check(_hud.med_bar.size.x >= 16.0,
			"touch medication meter must retain visible width at %s" % size)
	_hud._touch_layout = false
	controls.queue_free()


# Autoloads outlive this scene, so anything poked here has to be put back or
# a later tool run in the same process starts mid-run.
func _restore() -> void:
	StateManager.reset()
	GameState.reset_run()


func _finish() -> void:
	var ran := passes + failures.size()
	if ran != EXPECTED_ASSERTIONS:
		failures.append(
			"expected %d assertions, %d ran — a runtime error almost certainly aborted a test "
			% [EXPECTED_ASSERTIONS, ran]
			+ "function silently (scroll up for SCRIPT ERROR)")

	print("")
	print("test_hud: %d assertion(s) passed" % passes)
	if failures.is_empty():
		print("  OK - pill readout, countdown rounding and meter visibility all track state")
	else:
		for f in failures:
			print("  FAIL  %s" % f)
		print("  %d failure(s)" % failures.size())
	print("")
	get_tree().quit(0 if failures.is_empty() else 1)
