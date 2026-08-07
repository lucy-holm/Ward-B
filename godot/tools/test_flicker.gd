# Behavioural check for the fluorescent flicker.
#
#   godot --headless --path godot tools/test_flicker.tscn
#
# Runs headless on purpose: Atmosphere drives light_energy from _process, so
# the numbers are real without needing to render. Screenshots cannot verify
# this at all — a still frame of a flickering light looks exactly like a still
# frame of a steady one, which is how the flicker sat invisible for several
# commits.
#
# Asserts, while UNMEDICATED:
#   - light energy actually varies (it is not pinned at base)
#   - at least one deep dip occurs (a dropout, not just buzz)
#   - lights are NOT in lockstep (per-light phase offsets are working)
# And while LUCID: energy holds steady, because lucid is meant to read as
# clinically stable and the contrast is the point.
extends Node

const SAMPLE_FRAMES := 420

var failures: Array[String] = []


func _ready() -> void:
	var packed: PackedScene = load("res://main.tscn")
	var main: Node = packed.instantiate()
	add_child(main)
	await get_tree().process_frame
	await get_tree().process_frame

	var lights := _find_lights(main)
	if lights.size() < 2:
		_fail("expected at least 2 room lights, found %d" % lights.size())
		_finish()
		return

	# --- UNMEDICATED: should flicker ---
	StateManager.force_state(StateManager.State.UNMED, "test")
	var traces := await _sample(lights)

	var a: Array = traces[0]
	var spread: float = a.max() - a.min()
	if spread < 0.05:
		_fail("unmed: light energy barely moves (spread %.4f) — flicker is not running" % spread)

	var deepest: float = a.min() / maxf(0.0001, a.max())
	if deepest > 0.6:
		_fail("unmed: no deep dip in %d frames (min/max %.2f) — dropouts not firing"
			% [SAMPLE_FRAMES, deepest])

	# Two lights moving in lockstep means the per-light phase offset is broken.
	var lockstep := true
	for i in mini(a.size(), (traces[1] as Array).size()):
		if absf(a[i] - (traces[1] as Array)[i]) > 0.02:
			lockstep = false
			break
	if lockstep:
		_fail("unmed: lights are in lockstep — per-light phase offset is not applied")

	print("unmed  spread=%.3f  min/max=%.2f" % [spread, deepest])

	# --- LUCID: should be steady ---
	GameState.refill()
	StateManager.can_shift = true
	StateManager.force_state(StateManager.State.LUCID, "test")
	# Let the lights recover first. Switching to lucid mid-dip leaves them
	# ramping back to base, and sampling immediately measures that transient
	# rather than the steady state we actually care about.
	for f in 90:
		await get_tree().process_frame
	var lucid_traces := await _sample(lights)
	var lucid: Array = lucid_traces[0]
	var lucid_spread: float = lucid.max() - lucid.min()
	if lucid_spread > 0.02:
		_fail("lucid: light energy varies (spread %.4f) — lucid should read steady"
			% lucid_spread)
	print("lucid  spread=%.3f" % lucid_spread)

	_finish()


func _sample(lights: Array) -> Array:
	var traces: Array = [[], []]
	for f in SAMPLE_FRAMES:
		await get_tree().process_frame
		(traces[0] as Array).append((lights[0] as OmniLight3D).light_energy)
		(traces[1] as Array).append((lights[1] as OmniLight3D).light_energy)
	return traces


func _find_lights(node: Node) -> Array:
	var out: Array = []
	if node is OmniLight3D:
		out.append(node)
	for child in node.get_children():
		out.append_array(_find_lights(child))
	return out


func _fail(msg: String) -> void:
	failures.append(msg)


func _finish() -> void:
	print("")
	if failures.is_empty():
		print("test_flicker: OK - fluorescents flicker while unmed, steady while lucid")
	else:
		for f in failures:
			print("  FAIL  %s" % f)
		print("  %d failure(s)" % failures.size())
	print("")
	get_tree().quit(0 if failures.is_empty() else 1)
