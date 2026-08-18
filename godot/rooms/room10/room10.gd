# ROOM 10 — the Wing.
#
# The spike: everything, at scale, and the two-pill pocket finally has to be
# spent like a budget instead of a buffer. Four chambers in a straight run,
# south to north — the intake hall (safe, dispenser A), the day ward (orderly
# A, code half A), the records annex (orderly B, code half B, dispenser B), and
# the exit chamber (safe, keypad, door).
#
# THE BEAT is the two unmed-only wall panels at z=-10 and z=-20 (Gate2/Gate3 in
# the scene, collision_layer 8 = solid_unmed_only). They seal each chamber
# boundary while the player is raw and simply are not there while medicated.
# Because the code halves are scrawls, and scrawls only render unmed, the player
# is guaranteed to be raw at the moment they reach each gate — so every crossing
# costs a pill. Read code A free, spend a pill to cross gate 2, read code B free,
# spend a pill to cross gate 3, arrive lucid at the keypad. Two pills, no
# detours. One pill also works, with a mandatory stop at dispenser B.
#
# Nothing here is a new mechanic — room 1 already had a state-conditional
# doorway blocker, room 5 already split a code across two scrawls, rooms 4-7
# already had an orderly. Room 10 is the first to run TWO orderlies at once,
# which is the only genuinely new wiring: threat has to be aggregated across
# both before it reaches the HUD (see _physics_process).
extends Node3D

const ORDERLY := preload("res://orderly/orderly.tscn")

# Spawn (0, 7) — the intake hall, a full 10m south of orderly A's nearest
# patrol corner and behind no gate at all. This is also the catch-reset point,
# and dispenser10a is three steps west of it, so a catch is never a dead end.
const SPAWN_X := 0.0
const SPAWN_Z := 7.0

# Orderly A — a wide loop around the day ward's island, hugging close enough to
# the west wall's northern leg to threaten anyone lingering at nook A's mouth
# without ever entering it. Every waypoint and leg clears all always-on
# geometry by >= 1.38m (body radius 0.4 + margin 0.1 needs only 0.5m).
const WAYPOINTS_A: Array[Vector3] = [
	Vector3(6.5, 0, -1.5),
	Vector3(6.5, 0, -8.5),
	Vector3(-6.5, 0, -8.5),
	Vector3(-6.5, 0, -1.5),
]

# Orderly B — the same shape, one chamber north, threatening both the code nook
# (east) and the dispenser alcove (west) from a comfortable distance without
# sealing off either.
const WAYPOINTS_B: Array[Vector3] = [
	Vector3(6.5, 0, -11.5),
	Vector3(6.5, 0, -18.5),
	Vector3(-6.5, 0, -18.5),
	Vector3(-6.5, 0, -11.5),
]

# NOTE for the room validator: check_rooms.gd reads a single const named
# WAYPOINTS and silently skips any room without one, so this room's patrol
# clearance is NOT covered by that harness. It was verified out-of-band against
# the same point/segment-vs-AABB rule (min clearance 1.38m on both loops). If a
# second two-orderly room lands, teach the validator to look for WAYPOINTS* .

# One code, two scrawls, one per chamber, each behind a gate the other is not.
var _code := "3175"

var _orderly_a: CharacterBody3D = null
var _orderly_b: CharacterBody3D = null
var _door_unlocked := false
var _saw_unmed_toast := false

var _main: Node = null


func on_enter(main: Node) -> void:
	_main = main
	_door_unlocked = false
	_saw_unmed_toast = false

	for node in _interactables():
		node.availability = _is_available

	_regenerate_code()
	_spawn_orderlies()
	main.hud_objective(
		"the wing. it just keeps going. two of them somewhere in it, "
		+ "and the halls only open for the calm."
	)


func _interactables() -> Array[Interactable]:
	var out: Array[Interactable] = []
	var root := get_node_or_null("Interactables")
	if root == null:
		return out
	for child in root.get_children():
		if child is Interactable:
			out.append(child as Interactable)
		else:
			for sub in child.get_children():
				if sub is Interactable:
					out.append(sub as Interactable)
	return out


func _is_available(id: String) -> bool:
	match id:
		# Scenery: the keypad opens it, never a hand on the door.
		"exitdoor":
			return false
		"keypad10":
			return not _door_unlocked
	return true


func on_interact(id: String) -> bool:
	if id == "keypad10":
		if not StateManager.is_lucid():
			_main.hud_toast("the keypad is a smear of static. you can't read it like this.")
			return true
		# main.open_keypad emits keypad_open/success/denied itself.
		_main.open_keypad(_code, _on_code_accepted)
		return true

	return false


func _on_code_accepted() -> void:
	_door_unlocked = true
	_main.move_interactable("exitdoor", Vector3(-1, 1.5, -26.85), PI / 2.0)
	_main.unlock_door("DoorCollider")
	# Interpolates the LIVE code — a rerolled code must read back correctly.
	_main.hud_toast("%s. the last door in the building." % _code)
	_main.hud_objective("the door is open. go.")


func on_state_change(next: StateManager.State) -> void:
	if next == StateManager.State.UNMED and not _saw_unmed_toast:
		_saw_unmed_toast = true
		_main.hud_toast("every doorway behind you just sealed shut.")


# --- randomize-codes (CLAUDE.md hard rule) ---------------------------------
# Split like room 5's: A carries digits [0,2), B carries [2,4), and the mask
# blanks the rest. Called from on_enter AND from _on_caught, so a player cannot
# memorise the code across a reset.
func _regenerate_code() -> void:
	if not WardCodes.is_randomize_codes_enabled():
		return
	_code = WardCodes.random_code_4()
	_main.update_scrawl_text("codeScrawlA", WardCodes.code_clue_text(_code, [0, 2]))
	_main.update_scrawl_text("codeScrawlB", WardCodes.code_clue_text(_code, [2, 4]))


# --- the orderlies ---------------------------------------------------------

func _spawn_orderlies() -> void:
	_orderly_a = _spawn_one(_orderly_a, WAYPOINTS_A, "he is looking at you.")
	_orderly_b = _spawn_one(_orderly_b, WAYPOINTS_B, "the other one sees you too.")


func _spawn_one(existing: CharacterBody3D, waypoints: Array[Vector3],
		warn_toast: String) -> CharacterBody3D:
	if existing != null:
		existing.queue_free()

	var o: CharacterBody3D = ORDERLY.instantiate()
	# Waypoints must be set before add_child: Orderly._ready() snaps him to
	# waypoints[0].
	o.waypoints = waypoints.duplicate()
	add_child(o)
	o.setup(_main.player, _main.collision)

	# Each one gets his own warn line so the HUD tells you WHICH of them found
	# you — with two on the floor, "he is looking at you" alone is ambiguous.
	o.warned.connect(func() -> void:
		_main.hud_toast(warn_toast)
		Telemetry.event("orderly_spotted"))
	o.chase_started.connect(_on_chase_started)
	o.caught.connect(_on_caught)
	return o


func _on_chase_started() -> void:
	_main.hud_toast("run. or stop being visible.")
	Telemetry.event("orderly_chase")


# CATCH PENALTY — the order below is load-bearing.
#
# Telemetry FIRST: the event snapshots player position at emit time, so emitting
# after the teleport would record the spawn point for every catch and flatten
# the catch heat-map into a single dot.
#
# The reroll goes LAST, so a player cannot memorise the code across a reset.
# No pills are lost and no progress is cleared — pills especially matter here,
# because losing them would strand a caught player behind two gates they can no
# longer pay for. The cost is the whole length of the wing, again.
func _on_caught() -> void:
	Telemetry.event("orderly_caught")
	StateManager.force_state(StateManager.State.LUCID, "catch")
	_main.shift_fx()
	_main.teleport_player(SPAWN_X, SPAWN_Z)
	_main.hud_toast('hands. a needle. "the whole wing, and you got this far," he says.')
	_regenerate_code()


# Threat aggregation across two orderlies. The HUD arrow can only point at one,
# so pick the bigger threat: chasing beats watching, a higher watch-ramp beats a
# lower one, and nearer breaks ties. The LEVEL reported is the max of the two —
# main.set_threat also drives the audio bus off it, and `watching()` returns
# exactly 1.0 iff chasing, so the level doubles as the chase flag.
func _physics_process(_delta: float) -> void:
	if _orderly_a == null or _orderly_b == null or _main == null:
		return

	var level: float = maxf(_orderly_a.watching(), _orderly_b.watching())
	var chasing: bool = _orderly_a.is_chasing() or _orderly_b.is_chasing()

	if level <= 0.0 and not chasing:
		_main.set_threat(0.0, null)
		return

	var primary: CharacterBody3D = _orderly_a
	if _orderly_b.is_chasing() and not _orderly_a.is_chasing():
		primary = _orderly_b
	elif _orderly_a.is_chasing() == _orderly_b.is_chasing():
		if _orderly_b.watching() > _orderly_a.watching():
			primary = _orderly_b
		elif is_equal_approx(_orderly_b.watching(), _orderly_a.watching()) \
				and _orderly_b.distance_to_player() < _orderly_a.distance_to_player():
			primary = _orderly_b

	_main.set_threat(level, primary.bearing_from(_main.player.yaw))


func on_leave() -> void:
	if _main != null:
		_main.set_threat(0.0, null)
	for o in [_orderly_a, _orderly_b]:
		if o != null:
			o.queue_free()
	_orderly_a = null
	_orderly_b = null
