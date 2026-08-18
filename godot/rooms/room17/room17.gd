# ROOM 17 — the Gallery Ward.
#
# THE FIRST ROOM ON TIER 2 OF core/levels.gd. Room 11 was tier 1: one level,
# one height zone, a mezzanine held up by careful layout. This room stacks two
# genuinely independent walkable surfaces over the SAME x[-9,9] z[-6,10]
# rectangle — a railed gallery at y 3.4 and a sealed pocket at y 0 — and the
# engine means it literally: the same XZ column answers two different heights
# depending on who is asking.
#
#   ground   base_y 0.0   x[-9,9] z[-8,34]   vestibule + pocket + south hall
#   balcony  base_y 3.4   x[-9,9] z[-6,10]   the gallery, over the pocket
#
# THE ROUTE. North of spawn the ward is SEALED at z=16 across its whole width.
# Not a gate, not an unmed panel, not a keypad — wall, permanently. The only
# way on is the east stairwell (x[6,8], z16 -> z10), across the gallery, and
# down the west shaft (x[-8,-6], z4 -> z8), which is a hole cut in the
# gallery's own decking, into the pocket where keypad17 and the code clue are.
# Up, across, down. The flat route was never on the table.
#
# --- THREE ORDERLIES, AND WHAT ACTUALLY SEPARATES THEM ---------------------
#
# ORDERLY-SOUTH   WAYPOINTS_A  level 'ground'   the approach, z[18,25]
# ORDERLY-BALCONY WAYPOINTS_B  level 'balcony'  the gallery,  x[2,6] z[-4,8]
# ORDERLY-POCKET  WAYPOINTS_C  level 'ground'   under it,     x[0,6] z[3,9]
#
# BALCONY and POCKET share their entire XZ footprint at 3.4 and 0. Unlike
# room 11 — whose header is careful to say its two orderlies are separated by
# geometry and occlusion ALONE, because a tier-1 room has exactly one level
# and the categorical gate cannot apply — these two are separated by the gate
# itself. Orderly._player_is_vulnerable() tests `_player_level() == level`
# BEFORE any distance, cone or occlusion math, and it gates the contact catch
# as well as sight. So ORDERLY-BALCONY cannot see or touch a player on
# 'ground' at any distance, including one standing directly beneath him, and
# ORDERLY-POCKET cannot see or touch one on 'balcony'. That is a proof by
# construction, not a layout guarantee, and it is the reason this room exists.
#
# Each orderly's level is FIXED FOR LIFE — none of them ever calls
# resolve_level. No patrol leg enters either stairwell footprint, which keeps
# the gate well-defined and keeps them off the one surface whose height is
# ambiguous between the two levels.
#
# THE HEIGHT LOOKUP IS WHAT KEEPS A CHASE HONEST. Every orderly here gets
# _main.levels as setup()'s third argument. Their patrols never touch a
# stairwell but chase() is unbounded and does not pathfind, and a fleeing
# player stays 'ground' for the WHOLE ascent (the flip only fires on clearing
# the stairwell), so a ground orderly can and will follow him into the east
# stair mouth. floor_height_at checks stairwells first and matches when the
# queried level is EITHER end of the stair, so he rides the interpolated tread
# instead of keeping his root at y=0 while the stepped blocks — solid opaque
# geometry that reads as wall — rise around him. It CANNOT change his level:
# the lookup is made with his own fixed tag and he never resolves.
#
# CATCH TELEPORT PASSES 'ground' EXPLICITLY. Without it, a catch on the
# gallery drops the player at the south hall's XZ while player.level is still
# 'balcony' — standing at ground coordinates, invisible to every ground
# orderly, walking on a floor height that is not there. That is the one API
# a stacked room may not forget.
#
# PILL ECONOMY (PILLS_MAX 1, binary). on_enter forces unmed, which is free.
# dispenser17a by spawn tops off to 1. The hall, the climb, the gallery, the
# descent and the code are all unmed and all free. ONE shift, at the keypad.
# dispenser17c sits at the west shaft's ground landing because the pocket has
# no walk-back: the sealed wall stops the flat route and the east stair cannot
# be re-entered from the pocket side, so a mistimed 45s revert down there
# would otherwise mean retracing the entire crossing.
#
# NO COLLIDER IN THIS ROOM IS STATE-FILTERED, so circle_hits_solid_unmed can
# never find a trapped case at any XZ on either level: the timer expiring on
# the gallery, mid-stair or in the pocket is always a free instant revert.
# Exposure, never a soft-lock.
#
# CODE: 9137. EXIT: room18 (not ported yet; this room is deliberately not
# registered in main.gd's ROOM_SCENES).
extends Node3D

const ORDERLY := preload("res://orderly/orderly.tscn")

const SPAWN_X := 0.0
const SPAWN_Z := 32.0
# The catch teleport's level. Named rather than inlined so it reads as the
# deliberate argument it is — see the header.
const SPAWN_LEVEL := "ground"

const BALCONY_Y := 3.4

# ORDERLY-SOUTH — the approach. A flat back-and-forth across the south hall;
# the crossing to the east stair mouth (x~7, z=16) is a through-point, not a
# stand-and-read spot. Validated by check_rooms._check_patrol, which reads
# EVERY constant whose name starts with WAYPOINTS.
const WAYPOINTS_A: Array[Vector3] = [
	Vector3(5, 0, 25),
	Vector3(5, 0, 18),
	Vector3(-5, 0, 18),
	Vector3(-5, 0, 25),
]

# ORDERLY-BALCONY — the gallery. Confined to x[2,6], which keeps him clear of
# the west shaft's hole (x[-8,-6]), of the hint scrawl on the west wall, and
# of the east stairwell footprint (x[6,8] z[10,16] — his x=6 leg never reaches
# z=10). The Y component is the DECK height, not 0, so his very first frame is
# right: Orderly._ready() snaps him to waypoints[0] before setup() hands him
# world_levels. Patrol logic itself is flat XZ and never reads it.
const WAYPOINTS_B: Array[Vector3] = [
	Vector3(6, BALCONY_Y, 8),
	Vector3(6, BALCONY_Y, -4),
	Vector3(2, BALCONY_Y, -4),
	Vector3(2, BALCONY_Y, 8),
]

# ORDERLY-POCKET — the floor directly beneath the gallery, the same rectangle
# as WAYPOINTS_B at 0 instead of 3.4. Confined to x[0,6] z[3,9]: clear of the
# west wall and dispenser17c, clear of both code scrawls by more than the 8.2m
# inspection distance, and 0.61m off the landing guard's corner (needs >0.5).
const WAYPOINTS_C: Array[Vector3] = [
	Vector3(6, 0, 9),
	Vector3(6, 0, 3),
	Vector3(0, 0, 3),
	Vector3(0, 0, 9),
]

# Door swing: hinge at the gap's start (x=-1), 0.85m past the wall line at
# z=-6, rotated a quarter turn so the leaf lies flat in the vestibule.
const DOOR_OPEN_POS := Vector3(-1, 1.5, -6.85)

var _code := "9137"

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

	# Forced raw at the threshold — free, since force_state never touches
	# inventory, and it guarantees the room's single lucid spend happens at
	# the keypad rather than being carried in from room 16.
	StateManager.force_state(StateManager.State.UNMED, "room17-entry")
	main.shift_fx()
	main.hud_toast("you come to mid-stride, raw. this ward doesn't stay on one floor.")
	main.hud_objective("the day room stacks itself. climb before you can cross.")


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
		"keypad17":
			return not _door_unlocked
	return true


func on_interact(id: String) -> bool:
	if id == "keypad17":
		if not StateManager.is_lucid():
			_main.hud_toast("the keypad is a smear of static. you can't read it like this.")
			return true
		# TWO arguments: open_keypad(code, on_success). It emits
		# keypad_open / keypad_success / keypad_denied telemetry itself.
		_main.open_keypad(_code, _on_code_accepted)
		return true

	return false


func _on_code_accepted() -> void:
	_door_unlocked = true
	_main.move_interactable("exitdoor", DOOR_OPEN_POS, PI / 2.0)
	# Drops the doorway on EVERY level. RailNorthDoorGap (level 'balcony') is
	# what still keeps a gallery traveler from walking out over the vestibule
	# once this is gone.
	_main.unlock_door("DoorCollider")
	# Interpolates the LIVE code — a rerolled code must read back correctly.
	_main.hud_toast("%s. two floors, one lock." % _code)
	_main.hud_objective("the door is open. go.")


func on_state_change(next: StateManager.State) -> void:
	if next == StateManager.State.UNMED and not _saw_unmed_toast:
		_saw_unmed_toast = true
		_main.hud_toast("three of them keep this ward. none of them use the stairs the way you do.")


# --- randomize-codes (CLAUDE.md hard rule) ---------------------------------
#
# Called from on_enter AND from the catch handler. This room has orderlies, so
# without the second call the code would be memorisable across a reset.
func _regenerate_code() -> void:
	if not WardCodes.is_randomize_codes_enabled():
		return
	_code = WardCodes.random_code_4()
	_main.update_scrawl_text("codeScrawl", WardCodes.code_clue_text(_code))


# --- the orderlies ---------------------------------------------------------
# Built from a table rather than hand-wired, like room 12. Each gets its own
# warn line and its own catch line: with three patrols across two floors, an
# undifferentiated "he is looking at you" tells the player nothing about which
# of them — or which FLOOR — just noticed.

func _spawn_orderlies() -> void:
	_free_orderlies()

	_spawn_one(WAYPOINTS_A, "ground",
		"the one in the hall sees you.",
		'hands. a needle. "not even past the stairs," he says.')
	_spawn_one(WAYPOINTS_B, "balcony",
		"the one on the gallery sees you.",
		'hands. a needle. "the floor\'s not for guests," he says.')
	_spawn_one(WAYPOINTS_C, "ground",
		"the one below the gallery sees you.",
		'hands. a needle. "back where the light doesn\'t reach," he says.')


func _spawn_one(route: Array[Vector3], level: String, warn_toast: String,
		caught_toast: String) -> void:
	var o: CharacterBody3D = ORDERLY.instantiate()
	# Both of these must be set BEFORE add_child: _ready() snaps him to
	# waypoints[0], and his level is meant to be fixed from his first frame.
	o.waypoints = route.duplicate()
	o.level = level
	add_child(o)
	# THE THIRD ARGUMENT IS THE VERTICALITY WIRING. With it his rendered Y
	# follows HIS OWN level's floor height every tick — the gallery patroller
	# stands on the deck at 3.4 instead of sunk 3.4m into the pocket, and a
	# ground orderly whose chase carries him into a stair mouth rides the
	# tread instead of sinking into the stepped blocks. It can never change
	# his `level`; see the header.
	o.setup(_main.player, _main.collision, _main.levels)

	o.warned.connect(_on_warned.bind(warn_toast))
	o.chase_started.connect(_on_chase_started)
	o.caught.connect(_on_caught.bind(caught_toast))

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


# CATCH PENALTY — the order is load-bearing, same as rooms 6, 11 and 12.
#
# Telemetry FIRST: the event snapshots player position at emit time, so
# emitting after the teleport would record the spawn point for every catch and
# flatten the heat-map to a single dot.
#
# The teleport passes SPAWN_LEVEL EXPLICITLY. A catch on the gallery otherwise
# lands the player on the south hall's XZ while still flagged 'balcony'.
#
# The reroll goes LAST. No pills are lost and no progress is cleared.
func _on_caught(toast: String) -> void:
	Telemetry.event("orderly_caught")
	StateManager.force_state(StateManager.State.LUCID, "catch")
	_main.shift_fx()
	_main.teleport_player(SPAWN_X, SPAWN_Z, SPAWN_LEVEL)
	_main.hud_toast(toast)
	_regenerate_code()


# Primary threat across THREE patrols on TWO floors: chasing beats watching, a
# higher watch ramp beats a lower one, nearer breaks ties. Folded one
# candidate at a time, so the same routine would take five.
#
# No level filtering is needed or wanted here: an orderly on the wrong floor
# cannot be watching or chasing in the first place (the gate makes it
# impossible), so his contribution is always exactly 0 and he can never win
# the fold. The HUD arrow therefore only ever points at someone who really can
# reach the player.
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
