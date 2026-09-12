# Settings tests: persistence, and the two settings actually DOING something.
#
#   godot --headless --path godot tools/test_settings.tscn
#
# A ConfigFile round-trip alone would only prove a value survives a
# load/save cycle. It would not catch is_randomize_codes_enabled() reading
# the wrong key, a room's _regenerate_code() silently no-op'ing, or a
# brightness setting that persists perfectly and never reaches the render.
# So each setting is tested through the thing it is supposed to change:
#
#   randomize codes — ON: room2's code differs from its baked default AND the
#                     wall scrawl it rewrites carries that same code's clue.
#                     OFF: the baked code stands and the scrawl is untouched.
#   brightness      — scales main.gd's real tonemap_exposure target for BOTH
#                     ward states, preserving the LUCID:UNMED ratio, and also
#                     raises UNMED ambient so dark geometry actually exists
#                     before the posterise pass quantises it.
#   look sensitivity— scales how far the REAL player node actually turns for a
#                     given look delta, on both axes, without breaking the
#                     pitch clamp.
#   hud size        — scales the font sizes the REAL HUD writes into its theme
#                     overrides, on top of the viewport derivation rather than
#                     replacing it.
#   black and white — reaches the REAL posterise material as mono_amount, and
#                     leaves the dev-only duotone alone. The second half of
#                     that matters more than the first: see the test.
#
# Cross-process persistence (surviving an actual restart, not merely staying
# resident in one process) is proven separately by
# test_settings_persist_write.tscn / test_settings_persist_read.tscn, which
# need two independent OS processes sharing user://settings.cfg.
extends Node

var failures: Array[String] = []
var passes := 0

const ROOM2_BAKED_CODE := "4118"

# Every _check in this file, counted. A GDScript runtime error (a bad argument
# type, a missing method) aborts only the FUNCTION it happened in, not the
# process — so the remaining _checks in that function never run and the suite
# happily reports "OK" having silently tested less than it claims. That is not
# hypothetical: a RefCounted FakeMain made room2.on_enter raise, and both
# randomize-codes tests — the entire point of this file — were skipped while
# the run still exited 0. _finish fails the suite if the count does not match.
const EXPECTED_ASSERTIONS := 62


# Stands in for main.gd's room-script API. room2.on_enter/_regenerate_code
# only ever reach two calls on it: hud_objective() and update_scrawl_text().
#
# MUST extend Node, not RefCounted: room2.on_enter is typed `(main: Node)`, and
# GDScript enforces that at call time. A RefCounted stand-in raises "Invalid
# type in function 'on_enter'" and — because the error aborts the calling
# function rather than the process — every _check BELOW the call is silently
# skipped while the suite still reports OK. That false pass is why _finish
# asserts an expected assertion count.
class FakeMain extends Node:
	var scrawls: Dictionary = {}

	func hud_objective(_text: String) -> void:
		pass

	func update_scrawl_text(id: String, text: String) -> void:
		scrawls[id] = text


func _ready() -> void:
	_test_setting_roundtrip()
	_test_brightness_roundtrip_and_clamp()
	await _test_brightness_reaches_dark_render()
	_test_look_sensitivity_roundtrip_and_clamp()
	_test_look_sensitivity_scales_turn()
	_test_hud_scale_roundtrip_and_clamp()
	_test_hud_scale_resizes_the_hud()
	_test_monochrome_roundtrip()
	_test_monochrome_reaches_the_shader()
	_test_style_resolution_selection()
	_test_room2_randomize_on()
	_test_room2_randomize_off()
	_restore_defaults()
	_finish()


func _check(cond: bool, what: String) -> void:
	if cond:
		passes += 1
	else:
		failures.append(what)


# --- persistence -------------------------------------------------------

func _test_setting_roundtrip() -> void:
	WardSettings.set_randomize_codes(false)
	_check(
		not WardSettings.is_randomize_codes_enabled(),
		"randomize_codes should read back false right after being set false")

	WardSettings.set_randomize_codes(true)
	_check(
		WardSettings.is_randomize_codes_enabled(),
		"randomize_codes should read back true right after being set true")

	# Prove it went to DISK, not just to the static cache: drop the cache and
	# force a re-read. (A restart is proven separately, across two processes.)
	WardSettings._reset_cache_for_tests()
	_check(
		WardSettings.is_randomize_codes_enabled(),
		"randomize_codes must survive a cache drop — i.e. it really reached user://settings.cfg")

	WardSettings.set_randomize_codes(false)
	_check(
		not WardSettings.is_randomize_codes_enabled(),
		"randomize_codes should read back false again — not sticky at true")


func _test_brightness_roundtrip_and_clamp() -> void:
	WardSettings.set_brightness(1.5)
	_check(
		is_equal_approx(WardSettings.get_brightness(), 1.5),
		"brightness should read back 1.5 (got %f)" % WardSettings.get_brightness())

	WardSettings._reset_cache_for_tests()
	_check(
		is_equal_approx(WardSettings.get_brightness(), 1.5),
		"brightness must survive a cache drop — i.e. it really reached user://settings.cfg")

	# Out-of-range input must clamp, not poison the config with a value that
	# would black the ward out or blow it white on the next boot.
	WardSettings.set_brightness(99.0)
	_check(
		is_equal_approx(WardSettings.get_brightness(), WardSettings.BRIGHTNESS_MAX),
		"brightness must clamp to BRIGHTNESS_MAX (got %f)" % WardSettings.get_brightness())
	WardSettings.set_brightness(-5.0)
	_check(
		is_equal_approx(WardSettings.get_brightness(), WardSettings.BRIGHTNESS_MIN),
		"brightness must clamp to BRIGHTNESS_MIN (got %f)" % WardSettings.get_brightness())

	# And a clamped value must survive the round trip clamped, so a corrupt
	# or hand-edited settings.cfg can't reintroduce it on the next load.
	WardSettings._reset_cache_for_tests()
	_check(
		is_equal_approx(WardSettings.get_brightness(), WardSettings.BRIGHTNESS_MIN),
		"a clamped brightness must persist clamped")


# --- brightness actually reaches the render ----------------------------
#
# main.gd owns the setting's rendering targets, so this asserts against the
# REAL main.gd and REAL MOOD table rather
# than recomputing the arithmetic here — a test that duplicated the formula
# would pass even if _apply_mood stopped calling it.
func _test_brightness_reaches_dark_render() -> void:
	var game: Node = load("res://main.tscn").instantiate()
	add_child(game)

	var lucid: int = StateManager.State.LUCID
	var unmed: int = StateManager.State.UNMED
	var base_lucid: float = game.MOOD[lucid]["exposure"]
	var base_unmed: float = game.MOOD[unmed]["exposure"]
	var base_lucid_ambient: float = game.MOOD[lucid]["ambient"]
	var base_unmed_ambient: float = game.MOOD[unmed]["ambient"]

	WardSettings.set_brightness(1.0)
	_check(
		is_equal_approx(float(game._target_exposure(lucid)), base_lucid),
		"brightness 1.0 must reproduce MOOD's baked LUCID exposure exactly")
	_check(
		is_equal_approx(float(game._target_exposure(unmed)), base_unmed),
		"brightness 1.0 must reproduce MOOD's baked UNMED exposure exactly")
	_check(
		is_equal_approx(float(game._target_ambient(unmed)), base_unmed_ambient),
		"brightness 1.0 must reproduce MOOD's baked UNMED ambient exactly")
	var shadow_at_1 := float(game._target_shadow_lift(unmed))

	WardSettings.set_brightness(1.5)
	var lucid_at_1_5 := float(game._target_exposure(lucid))
	var unmed_at_1_5 := float(game._target_exposure(unmed))
	_check(
		is_equal_approx(lucid_at_1_5, base_lucid * 1.5),
		"brightness must scale LUCID exposure")
	_check(
		is_equal_approx(unmed_at_1_5, base_unmed * 1.5),
		"brightness must scale UNMED exposure — it applies to BOTH states")
	_check(
		is_equal_approx(float(game._target_ambient(unmed)), base_unmed_ambient * 1.5),
		"brightness must scale UNMED ambient so obstacle faces reach the posteriser")
	_check(
		is_equal_approx(float(game._target_ambient(lucid)), base_lucid_ambient),
		"brightness must leave already-legible LUCID ambient at its authored value")
	_check(
		float(game._target_shadow_lift(unmed)) > shadow_at_1
			and is_zero_approx(float(game._target_shadow_lift(lucid))),
		"brightness must lift UNMED posterised shadows without lifting LUCID")

	# The state contrast is the game. A calibration setting must not be able
	# to flatten it, whatever the player picks.
	var ratio_at_1 := base_lucid / base_unmed
	var ratio_now := lucid_at_1_5 / unmed_at_1_5
	_check(
		is_equal_approx(ratio_at_1, ratio_now),
		"brightness must preserve the LUCID:UNMED exposure ratio (%f vs %f)" % [ratio_at_1, ratio_now])

	# And it must land on the live Environment, not just be computable —
	# apply_brightness_now is what the slider calls on every drag step.
	WardSettings.set_brightness(1.8)
	game.apply_brightness_now()
	var env: Environment = game.get_node("WorldEnvironment").environment
	_check(env.adjustment_enabled,
		"the production environment must keep its authored colour adjustment enabled")
	_check(is_equal_approx(env.adjustment_contrast, 1.0),
		"post-tonemap contrast above 1.0 must not clamp dark geometry before posterisation")
	var want := float(game._target_exposure(StateManager.state))
	_check(
		is_equal_approx(env.tonemap_exposure, want),
		"apply_brightness_now must write the scaled exposure to the live Environment (got %f, want %f)"
			% [env.tonemap_exposure, want])
	var want_ambient := float(game._target_ambient(StateManager.state, RoomLight.is_dark()))
	_check(
		is_equal_approx(env.ambient_light_energy, want_ambient),
		"apply_brightness_now must write effective dark ambient live (got %f, want %f)"
			% [env.ambient_light_energy, want_ambient])
	var posterize: ShaderMaterial = game.get_node("Posterize/Rect").material
	_check(
		is_equal_approx(float(posterize.get_shader_parameter("shadow_lift")),
			float(game._target_shadow_lift(StateManager.state))),
		"apply_brightness_now must write the live UNMED shadow lift")
	_check(
		float(game.MOOD[unmed]["ambient"]) < float(game.MOOD[lucid]["ambient"]),
		"UNMED ambient floor must remain below the lucid atmosphere")

	# Reproduce a slider change during the ward-state crossfade. The instant
	# settings write must cancel the older fade, or its tail restores the stale
	# shadow lift after the player releases the slider.
	game._set_style(lucid, false)
	WardSettings.set_brightness(1.7)
	game.apply_brightness_now()
	var stable_shadow_lift := float(game._target_shadow_lift(StateManager.state))
	await get_tree().create_timer(0.55).timeout
	_check(
		is_equal_approx(float(posterize.get_shader_parameter("shadow_lift")), stable_shadow_lift),
		"an old state fade must not overwrite a live brightness shadow lift")

	# Room 16 can finish with its breaker dark. Loading room 17 resets RoomLight
	# to lit without a ward-state transition, so load_room itself must refresh
	# the Environment instead of waiting for the next medication shift.
	game.load_room("room16")
	game.set_room_dark(true)
	await get_tree().create_timer(0.55).timeout
	game.load_room("room17")
	_check(not RoomLight.is_dark(),
		"room 17 must not inherit room 16's dark light axis")
	_check(
		is_equal_approx(env.ambient_light_energy, float(game._target_ambient(unmed, false))),
		"a same-state room load must restore lit ambient immediately")
	_check(
		is_equal_approx(env.fog_depth_end, float(game.MOOD[unmed]["fog_end"])),
		"a same-state room load must restore the lit fog range immediately")

	RoomLight.reset(false)
	game.queue_free()
	await get_tree().process_frame


# --- look sensitivity --------------------------------------------------

func _test_look_sensitivity_roundtrip_and_clamp() -> void:
	WardSettings.set_look_sensitivity(1.5)
	_check(
		is_equal_approx(WardSettings.get_look_sensitivity(), 1.5),
		"look sensitivity should read back 1.5 (got %f)" % WardSettings.get_look_sensitivity())

	WardSettings._reset_cache_for_tests()
	_check(
		is_equal_approx(WardSettings.get_look_sensitivity(), 1.5),
		"look sensitivity must survive a cache drop — i.e. it really reached user://settings.cfg")

	# Out-of-range must clamp rather than persist. An unclamped value here is
	# worse than an unclamped brightness: a stored 50x would make the camera
	# unusable on the next boot, from a config panel the player can only reach
	# BEFORE a run, with no in-game route back to fix it.
	WardSettings.set_look_sensitivity(99.0)
	_check(
		is_equal_approx(WardSettings.get_look_sensitivity(), WardSettings.LOOK_SENSITIVITY_MAX),
		"look sensitivity must clamp to LOOK_SENSITIVITY_MAX (got %f)"
			% WardSettings.get_look_sensitivity())
	WardSettings.set_look_sensitivity(-5.0)
	_check(
		is_equal_approx(WardSettings.get_look_sensitivity(), WardSettings.LOOK_SENSITIVITY_MIN),
		"look sensitivity must clamp to LOOK_SENSITIVITY_MIN (got %f)"
			% WardSettings.get_look_sensitivity())

	WardSettings._reset_cache_for_tests()
	_check(
		is_equal_approx(WardSettings.get_look_sensitivity(), WardSettings.LOOK_SENSITIVITY_MIN),
		"a clamped look sensitivity must persist clamped")


# Drives the REAL player node's real _apply_look rather than recomputing
# `delta * LOOK_SENSITIVITY * setting` here — the same reasoning as the
# brightness/exposure test above. A test that duplicated the arithmetic would
# still pass if _apply_look stopped consulting the setting at all.
#
# Input stays DISABLED on purpose: _physics_process returns early without it,
# so nothing else in the scene tree can consume _look_accum between the poke
# and the assertion, and the measurement is exact rather than racy.
func _test_look_sensitivity_scales_turn() -> void:
	var player: Node = (load("res://player/player.tscn") as PackedScene).instantiate()
	add_child(player)

	var base := _yaw_after_look(player, 1.0)
	_check(
		is_equal_approx(base, -100.0 * Tuning.LOOK_SENSITIVITY),
		"sensitivity 1.0 must reproduce Tuning.LOOK_SENSITIVITY exactly — the ported feel is the default (got %f)"
			% base)
	_check(
		is_equal_approx(_yaw_after_look(player, 2.0), base * 2.0),
		"sensitivity 2.0 must turn exactly twice as far")
	_check(
		is_equal_approx(_yaw_after_look(player, 0.5), base * 0.5),
		"sensitivity 0.5 must turn exactly half as far")

	# Pitch rides the same multiplier — a setting that sped up yaw only would
	# feel broken rather than fast.
	WardSettings.set_look_sensitivity(2.0)
	player.yaw = 0.0
	player.pitch = 0.0
	player._look_accum = Vector2(0.0, 10.0)
	player._apply_look()
	var pitch: float = player.pitch
	_check(
		is_equal_approx(pitch, -10.0 * Tuning.LOOK_SENSITIVITY * 2.0),
		"pitch must scale with the same multiplier as yaw (got %f)" % pitch)

	# THE CLAMP MUST SURVIVE THE MULTIPLIER. PITCH_LIMIT is what stops the
	# camera rolling over the top; a big enough sensitivity multiplied into a
	# big enough delta is exactly the input that would breach it if the
	# multiply had been applied after the clamp instead of before.
	WardSettings.set_look_sensitivity(WardSettings.LOOK_SENSITIVITY_MAX)
	player.pitch = 0.0
	player._look_accum = Vector2(0.0, -100000.0)
	player._apply_look()
	var limit: float = player.PITCH_LIMIT
	pitch = player.pitch
	_check(
		is_equal_approx(pitch, limit),
		"pitch must still clamp to PITCH_LIMIT at max sensitivity (got %f, want %f)"
			% [pitch, limit])

	player.queue_free()


## One look event of a fixed 100px right-drag at `sensitivity`, from a known
## zero. A helper rather than a lambda because Callable.call() returns Variant
## and this project builds with inference warnings as errors.
func _yaw_after_look(player: Node, sensitivity: float) -> float:
	WardSettings.set_look_sensitivity(sensitivity)
	player.yaw = 0.0
	player.pitch = 0.0
	player._look_accum = Vector2(100.0, 0.0)
	player._apply_look()
	return player.yaw


# --- hud size ----------------------------------------------------------

func _test_hud_scale_roundtrip_and_clamp() -> void:
	WardSettings.set_hud_scale(1.3)
	_check(
		is_equal_approx(WardSettings.get_hud_scale(), 1.3),
		"hud scale should read back 1.3 (got %f)" % WardSettings.get_hud_scale())

	WardSettings._reset_cache_for_tests()
	_check(
		is_equal_approx(WardSettings.get_hud_scale(), 1.3),
		"hud scale must survive a cache drop — i.e. it really reached user://settings.cfg")

	WardSettings.set_hud_scale(99.0)
	_check(
		is_equal_approx(WardSettings.get_hud_scale(), WardSettings.HUD_SCALE_MAX),
		"hud scale must clamp to HUD_SCALE_MAX (got %f)" % WardSettings.get_hud_scale())
	WardSettings.set_hud_scale(0.0)
	_check(
		is_equal_approx(WardSettings.get_hud_scale(), WardSettings.HUD_SCALE_MIN),
		"hud scale must clamp to HUD_SCALE_MIN (got %f)" % WardSettings.get_hud_scale())


## Drives the REAL HUD's real _apply_scale and reads the font size it actually
## wrote, rather than recomputing the multiply here — same reasoning as the
## brightness and sensitivity tests above.
func _test_hud_scale_resizes_the_hud() -> void:
	var game: Node = load("res://main.tscn").instantiate()
	add_child(game)
	var hud: CanvasLayer = game.hud

	WardSettings.set_hud_scale(1.0)
	hud.refresh_scale()
	var at_1: int = hud.pills_label.get_theme_font_size("font_size")

	WardSettings.set_hud_scale(WardSettings.HUD_SCALE_MAX)
	hud.refresh_scale()
	var at_max: int = hud.pills_label.get_theme_font_size("font_size")

	WardSettings.set_hud_scale(WardSettings.HUD_SCALE_MIN)
	hud.refresh_scale()
	var at_min: int = hud.pills_label.get_theme_font_size("font_size")

	_check(at_max > at_1, "raising hud size must enlarge the pill readout (%d -> %d)" % [at_1, at_max])
	_check(at_min < at_1, "lowering hud size must shrink the pill readout (%d -> %d)" % [at_1, at_min])
	# The medication meter is the other half of the bottom row and is sized
	# separately from the fonts; a setting that moved only the type would leave
	# a 32pt readout beside a bar sized for 26.
	_check(
		hud.med_bar.custom_minimum_size.x > 0.0,
		"the medication meter must still be sized after a scale refresh")

	WardSettings.set_hud_scale(WardSettings.DEFAULT_HUD_SCALE)
	hud.refresh_scale()
	game.queue_free()


# --- black and white ---------------------------------------------------

func _test_monochrome_roundtrip() -> void:
	WardSettings.set_monochrome(true)
	_check(WardSettings.is_monochrome(), "monochrome should read back true right after being set")

	WardSettings._reset_cache_for_tests()
	_check(
		WardSettings.is_monochrome(),
		"monochrome must survive a cache drop — i.e. it really reached user://settings.cfg")

	WardSettings.set_monochrome(false)
	_check(not WardSettings.is_monochrome(), "monochrome should read back false again — not sticky")


## The setting has to reach the SHADER, and it has to reach the right uniform.
##
## The wrong uniform is a live hazard here, not a hypothetical. The posterise
## shader already had a `tint_amount` duotone that looks like a black-and-white
## control and is not one: it collapses the frame onto a two-colour ramp BY
## LUMINANCE, and pure red weighs 0.2126 in LUMA, so rooms 3, 4 and 6 lose
## their wall graffiti at tint 1.0. That text is narrative, and room 5's hint
## ("the code is written where he walks") makes hue puzzle-relevant — wiring
## the player's toggle to it would have shipped unsolvable rooms.
##
## Measured, not assumed: at the room-3 spawn the graffiti strokes hold 104.5
## of contrast against the wall under mono_amount (colour is 104.9, so 99.6%
## survives), against 25.6 for a plain luminance conversion. So this asserts
## BOTH that mono_amount moves and that tint_amount does not.
func _test_monochrome_reaches_the_shader() -> void:
	var game: Node = load("res://main.tscn").instantiate()
	add_child(game)
	var mat: ShaderMaterial = game._posterize_material()
	_check(mat != null, "main.tscn must expose a posterise material to drive")
	if mat == null:
		return

	var tint_before: float = float(mat.get_shader_parameter("tint_amount"))

	WardSettings.set_monochrome(true)
	game.apply_style_now()
	_check(
		is_equal_approx(float(mat.get_shader_parameter("mono_amount")), 1.0),
		"monochrome ON must push mono_amount = 1.0 (got %s)"
			% str(mat.get_shader_parameter("mono_amount")))

	WardSettings.set_monochrome(false)
	game.apply_style_now()
	_check(
		is_equal_approx(float(mat.get_shader_parameter("mono_amount")), 0.0),
		"monochrome OFF must push mono_amount = 0.0 (got %s)"
			% str(mat.get_shader_parameter("mono_amount")))

	# THE ONE THAT PROTECTS THE PUZZLES. If a later change reroutes the toggle
	# to the duotone because it is "the desaturation knob", this fails.
	WardSettings.set_monochrome(true)
	game.apply_style_now()
	_check(
		is_equal_approx(float(mat.get_shader_parameter("tint_amount")), tint_before),
		"the black-and-white toggle must NOT touch the duotone — that route greys out "
		+ "the wall codes in rooms 3, 4 and 6 (tint was %f, now %f)"
			% [tint_before, float(mat.get_shader_parameter("tint_amount"))])

	WardSettings.set_monochrome(false)
	game.apply_style_now()
	game.queue_free()


# The web canvas uses device pixels, so a fresh touch profile starts the 3D
# pass at half scale. The helper takes platform facts as arguments so this
# remains deterministic in the headless suite; the saved-value check then
# proves a player's explicit dev-panel choice survives a cache reload.
func _test_style_resolution_selection() -> void:
	_check(
		is_equal_approx(WardSettings.style_resolution_default(true, true), 0.5),
		"web touch default must use 0.5 3D scale")
	_check(
		is_equal_approx(WardSettings.style_resolution_default(true, false), 1.0),
		"web desktop default must remain full 3D scale")
	_check(
		is_equal_approx(WardSettings.style_resolution_default(false, true), 1.0),
		"native touch default must remain full 3D scale")
	_check(
		is_equal_approx(WardSettings.style_resolution_default(false, false), 1.0),
		"native desktop default must remain full 3D scale")

	WardSettings.set_style(WardSettings.KEY_STYLE_RESOLUTION, 0.75)
	WardSettings._reset_cache_for_tests()
	_check(
		is_equal_approx(
			WardSettings.get_style(WardSettings.KEY_STYLE_RESOLUTION), 0.75),
		"an explicit saved 3D scale must survive reload unchanged")


# --- randomize codes, end to end through a real room -------------------

func _load_room2() -> Node:
	var packed: PackedScene = load("res://rooms/room2/room2.tscn")
	var room := packed.instantiate()
	add_child(room)
	return room


func _free_room(room: Node) -> void:
	remove_child(room)
	room.free()


func _test_room2_randomize_on() -> void:
	WardSettings.set_randomize_codes(true)
	var room := _load_room2()
	var fake := FakeMain.new()
	add_child(fake)
	room.on_enter(fake)

	var code: String = room._code
	_check(
		code != ROOM2_BAKED_CODE,
		"randomize ON: room2's code must differ from the baked default %s (got %s)"
			% [ROOM2_BAKED_CODE, code])
	_check(
		code.length() == 4 and code.is_valid_int(),
		"randomize ON: rerolled code must still be 4 digits (got '%s')" % code)

	var expected_clue := WardCodes.code_clue_text(code)
	_check(
		fake.scrawls.get("codeScrawl", "") == expected_clue,
		"randomize ON: codeScrawl must carry the REROLLED code's clue (got '%s', want '%s')"
			% [fake.scrawls.get("codeScrawl", ""), expected_clue])

	_free_room(room)
	fake.queue_free()


func _test_room2_randomize_off() -> void:
	WardSettings.set_randomize_codes(false)
	var room := _load_room2()
	var fake := FakeMain.new()
	add_child(fake)
	room.on_enter(fake)

	_check(
		room._code == ROOM2_BAKED_CODE,
		"randomize OFF: room2 must keep its baked code %s (got %s)" % [ROOM2_BAKED_CODE, room._code])
	_check(
		not fake.scrawls.has("codeScrawl"),
		"randomize OFF: codeScrawl must NOT be rewritten — the baked wall clue stands")

	_free_room(room)
	fake.queue_free()


# Leave settings.cfg at defaults so a later tool run — or a developer
# launching the game after running the tests — starts from a first-boot state.
func _restore_defaults() -> void:
	WardSettings.set_randomize_codes(WardSettings.DEFAULT_RANDOMIZE_CODES)
	WardSettings.set_brightness(WardSettings.DEFAULT_BRIGHTNESS)
	WardSettings.set_look_sensitivity(WardSettings.DEFAULT_LOOK_SENSITIVITY)
	WardSettings.set_hud_scale(WardSettings.DEFAULT_HUD_SCALE)
	WardSettings.set_monochrome(WardSettings.DEFAULT_MONOCHROME)
	WardSettings.reset_style()


func _finish() -> void:
	var ran := passes + failures.size()
	if ran != EXPECTED_ASSERTIONS:
		failures.append(
			"expected %d assertions, %d ran — a runtime error almost certainly aborted a test function silently (scroll up for SCRIPT ERROR)"
				% [EXPECTED_ASSERTIONS, ran])

	print("")
	print("test_settings: %d assertion(s) passed" % passes)
	if failures.is_empty():
		print("  OK - settings persist and actually drive rooms and rendering")
	else:
		for f in failures:
			print("  FAIL  %s" % f)
		print("  %d failure(s)" % failures.size())
	print("")
	get_tree().quit(0 if failures.is_empty() else 1)
