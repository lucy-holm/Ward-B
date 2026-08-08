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
#                     ward states, preserving the LUCID:UNMED ratio.
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
const EXPECTED_ASSERTIONS := 20


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
	_test_brightness_scales_exposure()
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
# main.gd._target_exposure is the single place the setting is expressed, so
# this asserts against the REAL main.gd against the REAL MOOD table rather
# than recomputing the arithmetic here — a test that duplicated the formula
# would pass even if _apply_mood stopped calling it.
func _test_brightness_scales_exposure() -> void:
	var game: Node = load("res://main.tscn").instantiate()
	add_child(game)

	var lucid: int = StateManager.State.LUCID
	var unmed: int = StateManager.State.UNMED
	var base_lucid: float = game.MOOD[lucid]["exposure"]
	var base_unmed: float = game.MOOD[unmed]["exposure"]

	WardSettings.set_brightness(1.0)
	_check(
		is_equal_approx(float(game._target_exposure(lucid)), base_lucid),
		"brightness 1.0 must reproduce MOOD's baked LUCID exposure exactly")
	_check(
		is_equal_approx(float(game._target_exposure(unmed)), base_unmed),
		"brightness 1.0 must reproduce MOOD's baked UNMED exposure exactly")

	WardSettings.set_brightness(1.5)
	var lucid_at_1_5 := float(game._target_exposure(lucid))
	var unmed_at_1_5 := float(game._target_exposure(unmed))
	_check(
		is_equal_approx(lucid_at_1_5, base_lucid * 1.5),
		"brightness must scale LUCID exposure")
	_check(
		is_equal_approx(unmed_at_1_5, base_unmed * 1.5),
		"brightness must scale UNMED exposure — it applies to BOTH states")

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
	var want := float(game._target_exposure(StateManager.state))
	_check(
		is_equal_approx(env.tonemap_exposure, want),
		"apply_brightness_now must write the scaled exposure to the live Environment (got %f, want %f)"
			% [env.tonemap_exposure, want])

	game.queue_free()


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


func _finish() -> void:
	var ran := passes + failures.size()
	if ran != EXPECTED_ASSERTIONS:
		failures.append(
			"expected %d assertions, %d ran — a runtime error almost certainly aborted a test function silently (scroll up for SCRIPT ERROR)"
				% [EXPECTED_ASSERTIONS, ran])

	print("")
	print("test_settings: %d assertion(s) passed" % passes)
	if failures.is_empty():
		print("  OK - settings persist and actually drive rooms and exposure")
	else:
		for f in failures:
			print("  FAIL  %s" % f)
		print("  %d failure(s)" % failures.size())
	print("")
	get_tree().quit(0 if failures.is_empty() else 1)
