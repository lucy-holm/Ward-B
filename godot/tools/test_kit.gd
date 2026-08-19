# Behavioural tests for the kit/ room-authoring helpers (KitOrderlyRoom,
# KitKeypadLock, KitInteractables, KitDesign).
#
#   godot --headless --path godot tools/test_kit.tscn
#
# Run as a SCENE, not with --script: autoloads (StateManager, GameState,
# Tuning, Telemetry) are not registered for a custom SceneTree script, and
# KitOrderlyRoom/KitKeypadLock touch StateManager and Telemetry directly.
# (This note used to add that tools/check_state_gates.gd was broken by
# committed merge-conflict markers. That was true when this suite was written
# and has since been fixed — it is a working scene-run acceptance gate now.
# Corrected here rather than deleted, because a stale "X is broken" comment
# is worse than none: it teaches the next reader to route around a tool that
# actually works.)
#
# A NEW `class_name` FILE (e.g. adding a fifth kit/*.gd) IS INVISIBLE TO A
# HEADLESS RUN UNTIL IMPORTED. Godot registers global class_name scripts
# (KitOrderlyRoom, KitKeypadLock, KitDesign, KitInteractables, ...) into
# .godot/global_script_class_cache.cfg during an import pass, not merely by
# the file existing on disk. Add or rename a class_name script and this suite
# fails to PARSE — and because the scene root's script never loads, nothing
# ever calls quit(), so `godot --headless ... tools/test_kit.tscn` hangs
# forever instead of printing a parse error, which looks exactly like a stuck
# test rather than the real cause. Fix: run an import pass first —
#   godot --headless --path . --import
# — whenever a new kit/*.gd (or any other new class_name file) is added,
# before running this suite.
#
# Every assertion counts through `_check` into `passes`, and `_finish` prints
# an explicit "N assertion(s) passed" line. That count is the point, not
# decoration: a GDScript runtime error aborts only the ENCLOSING FUNCTION, so
# a broken helper that throws mid-test silently drops the rest of that
# function's assertions and the suite still exits 0 unless something is
# watching the total. See test_mechanics.gd / test_room15.gd / test_room20.gd
# for the same convention.
extends Node

var failures: Array[String] = []
var passes := 0

const ORDERLY_SCENE := preload("res://orderly/orderly.tscn")
const ORDERLY_SCRIPT := preload("res://orderly/orderly.gd")


func _ready() -> void:
	_test_fold_chasing_beats_watching()
	_test_fold_higher_ramp_wins()
	_test_fold_nearer_breaks_tie()
	_test_fold_empty_and_all_idle()
	_test_keypad_refuses_unmed()
	_test_keypad_accepts_lucid()
	_test_keypad_regenerate_noop_when_disabled()
	_test_keypad_regenerate_rerolls_when_enabled()
	_test_design_min_inspection_distance()
	_test_design_patrol_clearance()
	_finish()


func _check(cond: bool, what: String) -> void:
	if cond:
		passes += 1
	else:
		failures.append(what)


# --- fixtures ----------------------------------------------------------------

## A bare Orderly instance, added to the test's own tree (so it has a valid
## global transform), positioned, and put directly in the requested
## mode/ramp with no `setup()` call.
##
## MUST BE add_child'ED. First cut of this fixture skipped that on the theory
## that KitOrderlyRoom.fold() only reads `watching()`, `is_chasing()` and
## `global_position` — none of which touch the @onready nodes (_nav,
## _occlusion_ray, _body, _footsteps) that only exist once _ready() has run,
## so _ready() looked skippable. It is not: Node3D.global_position's GETTER
## calls get_global_transform(), which explicitly requires is_inside_tree()
## and otherwise logs an error and returns identity — i.e. every orderly
## silently read back as (0,0,0) regardless of what was assigned, which
## flattened every distance in the tie-break test to 0 and made it pass or
## fail on list order rather than the rule under test. _ready() itself is
## harmless to run (no waypoints means no snap-to-waypoint(0), and every
## other _ready side effect — collision layer, group, StateManager signal —
## is inert for a node nothing else ever touches).
func _bare_orderly(pos: Vector3, mode: int, ramp: float) -> CharacterBody3D:
	var o: CharacterBody3D = ORDERLY_SCENE.instantiate()
	add_child(o)
	o.global_position = pos
	o.mode = mode
	o.ramp = ramp
	return o


func _free_all(nodes: Array) -> void:
	for n in nodes:
		if is_instance_valid(n):
			n.free()


# --- KitOrderlyRoom.fold() ----------------------------------------------------

func _test_fold_chasing_beats_watching() -> void:
	# A distant chaser must still beat a near, fully-ramped watcher: chasing
	# outranks watch level unconditionally, per the selection rule.
	var chaser := _bare_orderly(Vector3(20, 0, 20), ORDERLY_SCRIPT.Mode.CHASE, 1.0)
	var watcher := _bare_orderly(Vector3(1, 0, 1), ORDERLY_SCRIPT.Mode.PATROL, 0.99)

	var result := KitOrderlyRoom.fold([watcher, chaser], Vector3.ZERO)
	_check(result["chasing"] == true, "fold: chasing flag must be true when any orderly is chasing")
	_check(result["primary"] == chaser, "fold: a chasing orderly must win over a nearer, higher-ramp watcher")
	_check(result["level"] == 1.0, "fold: level must be the max watching() (chase pins watching() to 1.0)")

	_free_all([chaser, watcher])


func _test_fold_higher_ramp_wins() -> void:
	# Neither is chasing, so the tie-break falls to ramp: the higher one must
	# win regardless of which is nearer.
	var far_high := _bare_orderly(Vector3(50, 0, 0), ORDERLY_SCRIPT.Mode.PATROL, 0.8)
	var near_low := _bare_orderly(Vector3(1, 0, 0), ORDERLY_SCRIPT.Mode.PATROL, 0.2)

	var result := KitOrderlyRoom.fold([near_low, far_high], Vector3.ZERO)
	_check(result["primary"] == far_high, "fold: higher watch ramp must win over a nearer, lower-ramp watcher")
	_check(result["level"] == 0.8, "fold: level must track the higher ramp")

	_free_all([far_high, near_low])


func _test_fold_nearer_breaks_tie() -> void:
	# Equal ramp, neither chasing: nearer must win.
	var near := _bare_orderly(Vector3(2, 0, 0), ORDERLY_SCRIPT.Mode.PATROL, 0.5)
	var far := _bare_orderly(Vector3(10, 0, 0), ORDERLY_SCRIPT.Mode.PATROL, 0.5)

	var result := KitOrderlyRoom.fold([far, near], Vector3.ZERO)
	_check(result["primary"] == near, "fold: equal ramp must break toward the nearer orderly")

	_free_all([near, far])


func _test_fold_empty_and_all_idle() -> void:
	var empty_result := KitOrderlyRoom.fold([], Vector3.ZERO)
	_check(empty_result["primary"] == null, "fold: empty orderly list must yield a null primary")
	_check(empty_result["level"] == 0.0, "fold: empty orderly list must yield level 0.0")

	var idle := _bare_orderly(Vector3(3, 0, 3), ORDERLY_SCRIPT.Mode.PATROL, 0.0)
	var idle_result := KitOrderlyRoom.fold([idle], Vector3.ZERO)
	# fold() still returns the sole candidate as primary (it is the only
	# thing to compare); it is tick()'s job to turn level<=0 and not-chasing
	# into set_threat(0.0, null), which is a separate assertion from fold()
	# itself and out of scope for this pure-function suite.
	_check(idle_result["level"] == 0.0, "fold: a fully-idle orderly must contribute level 0.0")
	_free_all([idle])


# --- KitKeypadLock -------------------------------------------------------------

# The narrow slice of main.gd a room script may touch, minimal enough for
# this suite: KitKeypadLock only ever calls hud_toast, hud_objective,
# open_keypad, move_interactable, unlock_door and update_scrawl_text.
class StubMain:
	extends Node
	var toasts: Array[String] = []
	var objectives: Array[String] = []
	var scrawls := {}
	var keypad_opened := false
	var keypad_code := ""
	var keypad_on_success: Callable = Callable()

	func hud_toast(text: String) -> void:
		toasts.append(text)

	func hud_objective(text: String) -> void:
		objectives.append(text)

	func open_keypad(code: String, on_success: Callable, _on_denied := Callable()) -> void:
		keypad_opened = true
		keypad_code = code
		keypad_on_success = on_success

	func move_interactable(_id: String, _pos: Vector3, _rot_y := 0.0) -> void:
		pass

	func unlock_door(_node_name: String) -> void:
		pass

	func update_scrawl_text(id: String, text: String) -> void:
		scrawls[id] = text


func _test_keypad_refuses_unmed() -> void:
	StateManager.force_state(StateManager.State.UNMED, "test")
	var lock := KitKeypadLock.new({"code": "1234", "keypad_id": "keypad1"})
	var main := StubMain.new()

	var claimed := lock.handle_interact("keypad1", main)
	_check(claimed, "keypad: handle_interact must claim its own keypad id")
	_check(
		main.toasts.has(KitKeypadLock.UNMED_REFUSAL),
		"keypad: unmed interaction must show the verbatim refusal toast")
	_check(not main.keypad_opened, "keypad: unmed interaction must NOT open the keypad UI")
	_check(not lock.is_unlocked(), "keypad: refusing unmed must not unlock the door")


func _test_keypad_accepts_lucid() -> void:
	StateManager.force_state(StateManager.State.LUCID, "test")
	var lock := KitKeypadLock.new({
		"code": "4321",
		"keypad_id": "keypad2",
		"success_toast": "%s. done.",
	})
	var main := StubMain.new()

	var claimed := lock.handle_interact("keypad2", main)
	_check(claimed, "keypad: handle_interact must claim its own keypad id while lucid")
	_check(main.keypad_opened, "keypad: lucid interaction must open the keypad UI")
	_check(main.keypad_code == "4321", "keypad: the live code must be handed to open_keypad")

	# Simulate the keypad UI accepting the code, exactly as main.gd's real
	# keypad.success signal would.
	main.keypad_on_success.call()
	_check(lock.is_unlocked(), "keypad: accepting the code must unlock")
	_check(main.toasts.has("4321. done."), "keypad: success toast must interpolate the live code")
	_check(
		main.objectives.has("the door is open. go."),
		"keypad: success must post the objective line")

	# An id this lock does not own must fall through untouched.
	var other := lock.handle_interact("dispenser1", main)
	_check(not other, "keypad: handle_interact must return false for an id it does not own")

	StateManager.force_state(StateManager.State.UNMED, "test")


func _test_keypad_regenerate_noop_when_disabled() -> void:
	# Force the setting off regardless of what a previous run (or the real
	# game) left in user://settings.cfg — the whole point of this assertion
	# is "off means untouched", so the starting state must be deterministic.
	WardCodes.set_randomize_codes(false)

	var lock := KitKeypadLock.new({
		"code": "0000",
		"scrawls": [{"scrawl_id": "codeScrawl"}],
	})
	var main := StubMain.new()

	lock.regenerate(main)
	_check(main.scrawls.is_empty(), "keypad: regenerate must not touch any scrawl when the setting is off")

	# Re-claim via handle_interact to read the code back rather than reaching
	# into the private field: still "0000" proves regenerate() truly no-op'd.
	StateManager.force_state(StateManager.State.LUCID, "test")
	lock.handle_interact("keypad", main)
	_check(main.keypad_code == "0000", "keypad: the code must be unchanged after a disabled regenerate()")
	StateManager.force_state(StateManager.State.UNMED, "test")


func _test_keypad_regenerate_rerolls_when_enabled() -> void:
	WardCodes.set_randomize_codes(true)

	var lock := KitKeypadLock.new({
		"code": "0000",
		"scrawls": [
			{"scrawl_id": "codeScrawlA", "mask": [0, 2]},
			{"scrawl_id": "codeScrawlB", "mask": [2, 4]},
		],
	})
	var main := StubMain.new()

	lock.regenerate(main)
	_check(main.scrawls.has("codeScrawlA"), "keypad: regenerate must rewrite every configured scrawl when enabled")
	_check(main.scrawls.has("codeScrawlB"), "keypad: regenerate must rewrite every configured scrawl when enabled")
	_check(
		(main.scrawls["codeScrawlA"] as String).length() == 7,
		"keypad: a masked clue must still be 4 chars + 3 separators long")

	# Restore the setting so this suite cannot leave a stray on-disk change
	# behind for the real game or a later test run to inherit.
	WardCodes.set_randomize_codes(false)


# --- KitDesign -----------------------------------------------------------------

func _test_design_min_inspection_distance() -> void:
	var d := KitDesign.min_inspection_distance()
	_check(
		is_equal_approx(d, 8.17) or absf(d - 8.17) < 0.01,
		"design: min_inspection_distance() default must be ~8.17m (got %.3f)" % d)

	# The formula, not just the magic number at the default argument: a
	# custom reaction time must still track (reaction - grace) * chase_speed.
	var custom := KitDesign.min_inspection_distance(3.0)
	var expected := (3.0 - Tuning.ORDERLY_GRACE_SEC) * Tuning.ORDERLY_CHASE_SPEED
	_check(
		is_equal_approx(custom, expected),
		"design: min_inspection_distance(reaction_sec) must scale with reaction_sec")


func _test_design_patrol_clearance() -> void:
	var c := KitDesign.patrol_clearance()
	_check(
		is_equal_approx(c, Tuning.ORDERLY_RADIUS + 0.1),
		"design: patrol_clearance() must be ORDERLY_RADIUS + 0.1m")


func _finish() -> void:
	print("")
	print("test_kit: %d assertion(s) passed" % passes)
	if failures.is_empty():
		print("  OK - kit/ behaves as specified")
	else:
		for f in failures:
			print("  FAIL  %s" % f)
		print("  %d failure(s)" % failures.size())
	print("")
	get_tree().quit(0 if failures.is_empty() else 1)
