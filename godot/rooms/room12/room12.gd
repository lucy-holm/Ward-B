# ROOM 12 — the Asylum Floor.
#
# The finale, and the biggest footprint in the game: ~22m wide by 74m
# north-south, five chambers, THREE orderlies, two state-filtered gates and a
# code split across two nooks 22m apart.
#
# THE PILL ECONOMY (PILLS_MAX is 1, game-wide). Both gates seal UNMED-only, so
# each crossing costs a shift to lucid, i.e. a pill. The whole middle of the
# floor — the quiet ward, the day hall, all three orderlies and both code
# halves — sits between them, and the pocket holds exactly ONE station:
# dispenser12c, a metre south of GATE B. Intended solve:
#
#   forced unmed at spawn -> dispenser12a (top to 1, nothing spent)
#   -> GATE B sealed -> shift lucid (-1, 0 left) -> cross
#   -> dispenser12c, right there -> bank (0 -> 1)
#   -> Z2 unmed (free): read half 1 in nook C, evade orderly C
#   -> Z3 unmed: read half 2 in the hall nook, evade A + B
#   -> GATE C sealed -> shift lucid (-1, 0 left) -> cross -> still lucid, so
#      the keypad needs nothing further
#   -> dispenser12b in Z4 is a buffer the finale door does not need
#
# FORCED RAW AT THE THRESHOLD (on_enter, below): room 11 ends on its keypad,
# i.e. lucid, so without forcing unmed here a player who never shifts would
# cross GATE B for free and the mandatory spend would evaporate. It costs no
# pill — force_state does not touch inventory.
#
# WALK-BACK: the gates seal UNMED only, so a lucid player retreats through
# either one, in either direction, for free, and the Z2/Z3 and Z4/Z5
# boundaries are open doorways with no gate at all. The only way to strand
# yourself is to go unmed inside the stretch at 0 pills — and the exit from
# that is the exit everywhere else in this game: walk into a cone, let the
# catch force you lucid and drop you at spawn with your pills, and
# dispenser12a is in the same open hall as the spawn point.
#
# TIMER SOFT-LOCK: lucidity expires on its own after 45s, so the clock can
# revoke it while the player is still deep in Z2 or Z3. At 1-pill capacity
# there is no reserve to shift back with, so a station HAS to be reachable
# unmedicated inside the pocket. dispenser12c is it, and it is deliberately
# the ONLY one — per playtest 9, a mistimed revert down by GATE C should cost
# a long walk back past all three orderlies. Long walk, not a dead end.
extends Node3D

const ORDERLY := preload("res://orderly/orderly.tscn")

# Spawn (0, 44) — the north end of Z1, well clear of GATE B and 20m from the
# nearest orderly leg. Also the teleport-back point after a catch, which is
# why dispenser12a shares this chamber with no gate in between.
const SPAWN_X := 0.0
const SPAWN_Z := 44.0

# Orderly A — Z3's outer rectangle. East leg at x=3, a flat 7m off the hall
# nook's mouth (x=10). Sight range is 6m, so range and cone are mutually
# exclusive at that offset: the nook is unseeable from patrol, and the
# exposure is the crossing, not the read.
const WAYPOINTS_A: Array[Vector3] = [
	Vector3(3, 0, 17.5),
	Vector3(3, 0, -5.5),
	Vector3(-7.5, 0, -5.5),
	Vector3(-7.5, 0, 17.5),
]

# Orderly B — Z3's inner rectangle, listed in the REVERSE rotational order of
# an analogous rectangle to A's (A: E-edge north-to-south, N-edge, W-edge
# south-to-north, S-edge; B: S-edge, W-edge, N-edge, E-edge north-to-south).
# Opposite circulation, not just a smaller copy, so the two never read as
# walking together even where their paths pass near each other.
const WAYPOINTS_B: Array[Vector3] = [
	Vector3(0, 0, 11),
	Vector3(-5, 0, 11),
	Vector3(-5, 0, 1),
	Vector3(0, 0, 1),
]

# Orderly C — Z2, alone. West leg at x=-7, a flat 7m off nook C (mouth x=10),
# and the loop is skewed west so the whole east wall stays outside it.
const WAYPOINTS_C: Array[Vector3] = [
	Vector3(-7, 0, 33.5),
	Vector3(-7, 0, 22.5),
	Vector3(3, 0, 22.5),
	Vector3(3, 0, 33.5),
]

# One code, two scrawls, one per nook — the room 5 split, stretched across 22m
# and three patrols.
var _code := "8563"

var _orderlies: Array[CharacterBody3D] = []
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

	# THE FORCED RAW THRESHOLD — see the header. Costs no pill; force_state
	# never touches inventory. It emits state_changed, so on_state_change runs
	# (and fires its own toast) BEFORE the arrival toast below — that ordering
	# is the TS build's, kept deliberately.
	StateManager.force_state(StateManager.State.UNMED, "room12-entry")
	_main.shift_fx()
	_main.hud_toast("the floor swims into focus. still raw.")
	main.hud_objective(
		"the asylum floor. the last of it. two of them share the big hall; a third keeps his own room. "
		+ "one cabinet waits just past the first gate — after that, it's a long dry stretch to the far side.")


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
		"keypad12":
			return not _door_unlocked
	return true


func on_interact(id: String) -> bool:
	if id == "keypad12":
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
	_main.hud_toast("%s. the floor lets you go." % _code)
	_main.hud_objective("the door is open. go.")


func on_state_change(next: StateManager.State) -> void:
	if next == StateManager.State.UNMED and not _saw_unmed_toast:
		_saw_unmed_toast = true
		_main.hud_toast("three shapes, and none of them are yours.")


# --- randomize-codes (CLAUDE.md hard rule) ---------------------------------
# Split across two scrawls exactly as room 5 does: A carries digits [0,2), B
# carries [2,4), and the mask blanks the rest. Called in on_enter AND in the
# catch handler — this room has orderlies, so a catch must reroll or the code
# is memorisable across a reset.
func _regenerate_code() -> void:
	if not WardCodes.is_randomize_codes_enabled():
		return
	_code = WardCodes.random_code_4()
	_main.update_scrawl_text("codeScrawlA", WardCodes.code_clue_text(_code, [0, 2]))
	_main.update_scrawl_text("codeScrawlB", WardCodes.code_clue_text(_code, [2, 4]))


# --- the orderlies ----------------------------------------------------------
# Three of them, which is why this room builds them from a table instead of
# rooms 5-7's single hand-wired instance. Each gets its own warn line: with
# three patrols on one floor, an undifferentiated "he is looking at you" tells
# the player nothing about WHICH of them just noticed.

func _spawn_orderlies() -> void:
	_free_orderlies()

	_spawn_one(WAYPOINTS_A, "he sees you.")
	_spawn_one(WAYPOINTS_B, "so does the other one.")
	_spawn_one(WAYPOINTS_C, "he's alone with you now.")


func _spawn_one(route: Array[Vector3], warn_toast: String) -> void:
	var o: CharacterBody3D = ORDERLY.instantiate()
	# Waypoints must be set before add_child: Orderly._ready() snaps him to
	# waypoints[0].
	o.waypoints = route.duplicate()
	add_child(o)
	o.setup(_main.player, _main.collision)

	o.warned.connect(_on_warned.bind(warn_toast))
	o.chase_started.connect(_on_chase_started)
	o.caught.connect(_on_caught)

	_orderlies.append(o)


func _free_orderlies() -> void:
	for o in _orderlies:
		if is_instance_valid(o):
			o.queue_free()
	_orderlies.clear()


func _on_warned(toast: String) -> void:
	_main.hud_toast(toast)
	Telemetry.event("orderly_spotted")


func _on_chase_started() -> void:
	_main.hud_toast("run. or stop being visible.")
	Telemetry.event("orderly_chase")


# CATCH PENALTY — the order below is load-bearing.
#
# Telemetry FIRST: the event snapshots player position at emit time, so
# emitting after the teleport would record the spawn point for every catch and
# flatten the catch heat-map into a single dot.
#
# The reroll goes LAST, so a player cannot memorise the code across a reset —
# which matters more here than anywhere, since the two halves are 22m and
# three patrols apart.
#
# No pills are lost and no progress is cleared. That is not generosity, it is
# the soft-lock escape hatch the header describes: a player stranded unmed at
# 0 pills inside the GATE B/GATE C pocket gets out by being caught, and lands
# back in the entry hall with dispenser12a in the same room and no gate in
# between.
func _on_caught() -> void:
	Telemetry.event("orderly_caught")
	StateManager.force_state(StateManager.State.LUCID, "catch")
	_main.shift_fx()
	_main.teleport_player(SPAWN_X, SPAWN_Z)
	_main.hud_toast('hands. a needle. "the whole floor, and you still tried," he says.')
	_regenerate_code()


# Primary threat across THREE patrols: chasing beats watching, a higher watch
# ramp beats a lower one, and nearer breaks ties. Folded one candidate at a
# time rather than compared pairwise, so the same routine would take five.
func _physics_process(_delta: float) -> void:
	if _main == null or _orderlies.is_empty():
		return

	var player_pos: Vector3 = _main.player.global_position

	var level := 0.0
	var chasing := false
	var primary: CharacterBody3D = null
	var primary_dist := INF

	for o in _orderlies:
		if not is_instance_valid(o):
			continue
		var w: float = o.watching()
		var d := Vector2(o.global_position.x - player_pos.x,
			o.global_position.z - player_pos.z).length()
		level = maxf(level, w)
		chasing = chasing or o.is_chasing()

		if primary == null:
			primary = o
			primary_dist = d
			continue
		if o.is_chasing() and not primary.is_chasing():
			primary = o
			primary_dist = d
		elif o.is_chasing() == primary.is_chasing():
			if w > primary.watching():
				primary = o
				primary_dist = d
			elif w == primary.watching() and d < primary_dist:
				primary = o
				primary_dist = d

	if (level > 0.0 or chasing) and primary != null:
		_main.set_threat(level, primary.bearing_from(_main.player.yaw))
	else:
		_main.set_threat(0.0, null)


func on_leave() -> void:
	if _main != null:
		_main.set_threat(0.0, null)
	_free_orderlies()
