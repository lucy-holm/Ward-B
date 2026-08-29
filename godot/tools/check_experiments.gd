extends Node

# Pins the FNV-1a port against vectors generated from src/game/experiments.ts.
# If this suite fails, every player already bucketed by the Three.js build
# would silently move to a different arm on the Godot build — which is exactly
# the kind of break that shows up as an unexplained step change in a dashboard
# months later, not as an error.

const VECTORS := {
	"": 2166136261,
	"a": 3826002220,
	"abc": 440920331,
	"player-1:room1-tutorial-explicitness": 2702257449,
	"3f8a2c1d9e4b7a60:room1-tutorial-explicitness": 387942348,
	"f47ac10b-58cc-4372-a567-0e02b2c3d479:room1-tutorial-explicitness": 287129887,
}

var _fail := 0


func _check(cond: bool, msg: String) -> void:
	if not cond:
		_fail += 1
		printerr("FAIL: ", msg)


func _ready() -> void:
	for input: String in VECTORS:
		var got := Experiments.hash_string(input)
		var want: int = VECTORS[input]
		_check(got == want, "hash(%s) = %d, want %d" % [JSON.stringify(input), got, want])

	# Weighted arm selection, including the boundary a naive `<=` gets wrong.
	var arms := [{"id": "control", "weight": 1}, {"id": "explicit", "weight": 1}]
	_check(Experiments.pick_arm(arms, 0.0) == "control", "frac 0.0 -> control")
	_check(Experiments.pick_arm(arms, 0.4999) == "control", "frac just under half -> control")
	_check(Experiments.pick_arm(arms, 0.5) == "explicit", "frac exactly half -> explicit")
	_check(Experiments.pick_arm(arms, 0.999) == "explicit", "frac near 1 -> explicit")

	# The registry ships with nothing active (§6.3 / §6.4), so no real player
	# is assigned an arm. This is a behavioural assertion, not a style one:
	# flipping an experiment on is meant to be a deliberate edit.
	_check(Experiments.get_assignment("any-player").is_empty(), "no experiment active by default")

	var active_count := 0
	for e: Dictionary in Experiments.REGISTRY:
		if bool(e["active"]):
			active_count += 1
	_check(active_count <= 1, "at most one active experiment (§6.3)")

	if _fail == 0:
		print("OK - check_experiments (%d hash vectors)" % VECTORS.size())
	get_tree().quit(1 if _fail > 0 else 0)
