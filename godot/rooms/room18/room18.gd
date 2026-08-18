# ROOM 18 — the Relay Room.
#
# The whole payload is ONE mechanical choice: a two-position power relay wired
# (per the scrawls) to feed either the ward's LIGHTS or its DOORS, never both.
# The choice is legible in advance, and it is physically irreversible the
# instant you throw it — the lever you did not pick comes off the wall, the one
# you did drops into its slot, and the sealed exit door swings open in the same
# beat. There is no confirm dialog: the throw IS the confirm.
#
# The consequence is invisible until the NEXT room. This writes GameState flag
# "room18.power"; main.gd's ROOM_VARIANTS resolves "room19" to
# rooms/room19_lights or rooms/room19_doors off that flag, and the two are
# structurally different rooms. This is the first place in the game where an
# action's effect lands somewhere you cannot see yet, in a game that has never
# once let you go back and check.
#
# NO CODE, NO KEYPAD, so no randomize-codes wiring — a relay is a switch, not a
# combination, and WardCodes is deliberately not consulted here.
#
# THE DOOR IS THE ROOM'S ONLY GATE. The TS build's first cut left the exit an
# open gap, so a player could walk straight past the room's entire point and
# room 19 would silently build its default branch. The exit is sealed by a real
# collider (DoorCollider) until either lever is thrown; "unlock" here means
# "you decided", not "you solved something".
#
# BOTH LEVERS ARE states:'both' — throwable lucid or unmed. An earlier TS cut
# gated them lucid-only, which broke the wing's audited economy (room18+room19
# are supposed to cost ZERO pills beyond the belt crossing) and invented a
# failure mode where a 0-pill unmed player stands at a locked exit unable to
# read which lever is which.
#
# SOFT-LOCK AUDIT. dispenser18 sits in Z1, reachable unmed from spawn without
# entering the belt (the stub wall is south-of-belt geometry, not a gate), so a
# 0-pill arrival holds a pill before the relay is even in view. Nothing here
# REQUIRES a pill: the belt crossing is orderly-dodge-only (unmed is safe from
# geometry — hard law 2) and the relay throw works identically in either state.
# No collider in this room is state-filtered, so a medication revert anywhere
# is an ordinary revert. Catch = forced lucid + teleport to spawn, pills kept:
# pre-throw a clean retry, post-throw there is nothing left to re-litigate,
# because on_enter is NOT re-run by a catch (a catch teleports; it does not
# reload) so the flag stays set, the loser stays gone and the door stays open.
#
# REACTION-TIME AUDIT, and an honest downgrade from the TS build. src/rooms/
# room18.ts protected both the dispenser and the nook with hand-authored
# occluder AABBs plus room10's "a sightline into a box always crosses the box"
# argument. Godot's Orderly TAKES NO OCCLUDER LIST — _occluded() casts a real
# RayCast3D against the actual world_static colliders — so that argument does
# not port, and what protects them here is real geometry:
#   * dispenser18 (-5.8, 4): the Z1/Z2 stub wall (x[-6,-2.6] at z=2.3) stands
#     between it and almost every belt point within his 6m sight range.
#   * the levers (+-1.6, -6.8): the two nook-mouth walls (x[-6,-2] and x[2,6]
#     at z=-3), which block every line into the nook that does not come
#     straight down the mouth.
#
# In BOTH cases a thin sliver of his belt has a clear line at 5-6m and is
# stopped only by where he happens to be FACING, so the honest statement is
# behavioural, not categorical, and it is made behaviourally:
# tools/test_rooms1819.gd parks a player at the dispenser and at each lever and
# runs his ENTIRE patrol loop, asserting his watch ramp never leaves zero, with
# a control player in the open belt who is duly seen. That is a weaker
# guarantee than room 19's platform gets (which is proved cone-free, against
# geometry alone) and it is deliberately not dressed up as the same thing.
# He is unmodified Tuning.orderly.
extends Node3D

const ORDERLY := preload("res://orderly/orderly.tscn")

## The flag this room exists to write. Read by main.gd's ROOM_VARIANTS.
const POWER_FLAG := "room18.power"

# Catch returns the player to spawn — south of the belt, next to the
# dispenser, with nothing hazardous in between.
const SPAWN_X := 0.0
const SPAWN_Z := 4.0

# THE BELT. A rectangular loop through the relay hall, x[-4,4] z[-2,1]. The
# console at x[-1,1] z[-0.45,0.45] sits inside the loop as mid-crossing cover;
# clearance from the legs at z=1 and z=-2 is 0.55m and 1.55m against his 0.4m
# body radius plus the 0.1m patrol margin.
const WAYPOINTS: Array[Vector3] = [
	Vector3(-4, 0, 1),
	Vector3(4, 0, 1),
	Vector3(4, 0, -2),
	Vector3(-4, 0, -2),
]

# The door's two poses. gen_rooms authors a 'pz' fixture at yaw PI (a Node3D's
# forward is -Z), and open is a +90 degree swing about its west edge — the same
# motion room 14's gate makes.
const DOOR_CLOSED_POS := Vector3(0.0, 1.5, -7.0)
const DOOR_OPEN_POS := Vector3(-1.0, 1.5, -7.85)
const DOOR_CLOSED_ROT := PI
const DOOR_OPEN_ROT := PI + PI / 2.0

# THE THROWN POSE. fixtures/switch.tscn exposes its lever as a pivot node whose
# children extend along +Y, so a throw is one property write on Model/Lever.
# The TS build expressed this by sliding the whole fixture 0.28m down the wall,
# which in a real 3D scene reads as the breaker falling off its mounting rather
# than as a handle being pulled.
const LEVER_NODE_PATH := "Model/Lever"
const THROWN_ROT_X := -2.2

var _main: Node = null
var _orderly: CharacterBody3D = null

# "" until a lever is thrown, then "lights" or "doors". Room-script state, so
# it survives a catch exactly like the flag does.
var _thrown := ""


func on_enter(main: Node) -> void:
	_main = main

	# The scene is authored with the door shut and both levers up; re-assert it
	# anyway so a re-entry starts from a known state. NOTE this deliberately
	# does NOT clear the flag: entering room 18 is entering it fresh, and the
	# room is one-way, so the only way here is a first entry.
	_thrown = ""
	_seal_door()

	for node in _interactables():
		node.availability = _is_available

	_spawn_orderly()
	main.hud_objective("the relay room. it only moves once, and it's the only way out.")


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


func _find_fixture(id: String) -> Interactable:
	for node in _interactables():
		if node.interactable_id == id:
			return node
	return null


# The door is never directly interactable: walking through the open gap does
# the rest, the same convention room 14's gate and room 16's exit door use. The
# chosen lever stays on the wall but stops being a prompt once thrown; the
# loser is already gone.
func _is_available(id: String) -> bool:
	if id == "exitdoor18":
		return false
	if _thrown != "" and (id == "leverLights" or id == "leverDoors"):
		return false
	return true


func on_interact(id: String) -> bool:
	if id == "leverLights" or id == "leverDoors":
		# Belt-and-braces: _is_available already hides both once one is thrown,
		# and the loser's node is freed outright. This is the last line of
		# defence for the room's one real invariant — it only moves once.
		if _thrown != "":
			return true
		_commit("lights" if id == "leverLights" else "doors")
		return true
	return false


# --- the throw -------------------------------------------------------------

## The one irreversible action in the game so far. Everything here is a
## one-way write; nothing in this script can undo any of it.
func _commit(choice: String) -> void:
	_thrown = choice
	GameState.set_flag(POWER_FLAG, choice)

	# The throw you didn't pick comes off the wall, permanently. queue_free, so
	# even the belt-and-braces guard above can never be reached for it again.
	var loser := "leverDoors" if choice == "lights" else "leverLights"
	if _main != null:
		_main.remove_interactable(loser)

	# The chosen handle drops into its slot.
	_swing_lever("leverLights" if choice == "lights" else "leverDoors")

	# THE CHOICE WAS THE LOCK. Throwing either lever opens the door; there is
	# no second condition anywhere.
	_open_door()

	if _main != null:
		_main.hud_toast(
			"the relay slams. somewhere, the bulbs give out for good."
			if choice == "doors"
			else "the relay slams. somewhere, a door stays shut for good.")
		_main.hud_objective("the door ahead. whatever that bought you.")
	Telemetry.event("wing_power_set", {"power": choice})


func _swing_lever(id: String) -> void:
	var fixture := _find_fixture(id)
	if fixture == null:
		return
	var lever := fixture.get_node_or_null(LEVER_NODE_PATH) as Node3D
	if lever == null:
		push_warning("room18: %s has no %s — the throw has no visual" % [id, LEVER_NODE_PATH])
		return
	lever.rotation.x = THROWN_ROT_X


func _door_collider() -> CollisionObject3D:
	return get_node_or_null("Geometry/DoorCollider") as CollisionObject3D


func _seal_door() -> void:
	var body := _door_collider()
	if body != null:
		body.collision_layer = WardCollision.LAYER_WORLD_STATIC
	if _main == null:
		return
	_main.rebuild_collision()
	_main.move_interactable("exitdoor18", DOOR_CLOSED_POS, DOOR_CLOSED_ROT)


func _open_door() -> void:
	if _main == null:
		return
	# unlock_door drops the collider's layer and rebuilds the AABB cache in one
	# call — the same "drop it from the query" trick every other gate uses.
	_main.unlock_door("DoorCollider")
	_main.move_interactable("exitdoor18", DOOR_OPEN_POS, DOOR_OPEN_ROT)


## Read by the test suite. "" until the relay moves.
func thrown() -> String:
	return _thrown


func is_door_open() -> bool:
	var body := _door_collider()
	return body != null and body.collision_layer == 0


# --- the orderly -----------------------------------------------------------

func _spawn_orderly() -> void:
	if _orderly != null:
		_orderly.queue_free()
		_orderly = null

	_orderly = ORDERLY.instantiate()
	# Waypoints must be set before add_child: Orderly._ready() snaps him to
	# waypoints[0].
	_orderly.waypoints = WAYPOINTS.duplicate()
	add_child(_orderly)
	# Flat room, so no WardLevels third argument — he stands at y=0 always.
	_orderly.setup(_main.player, _main.collision)

	_orderly.warned.connect(_on_warned)
	_orderly.chase_started.connect(_on_chase_started)
	_orderly.caught.connect(_on_caught)


func _physics_process(_delta: float) -> void:
	if _main == null or _orderly == null:
		return
	var level: float = _orderly.watching()
	if level > 0.0 or _orderly.is_chasing():
		_main.set_threat(level, _orderly.bearing_from(_main.player.yaw))
	else:
		_main.set_threat(0.0, null)


func _on_warned() -> void:
	_toast("something paces the hall between you and the switches.")
	Telemetry.event("orderly_spotted")


func _on_chase_started() -> void:
	_toast("run. or stop being visible.")
	Telemetry.event("orderly_chase")


# Telemetry FIRST: the event snapshots player position at emit time, so
# emitting after the teleport would record the spawn point for every catch.
# No code to reroll — this room has no keypad at all.
func _on_caught() -> void:
	Telemetry.event("orderly_caught")
	StateManager.force_state(StateManager.State.LUCID, "catch")
	_main.shift_fx()
	_main.teleport_player(SPAWN_X, SPAWN_Z)
	_toast('hands. a needle. "you don\'t get to pick twice," he says.')


func _toast(text: String) -> void:
	if _main != null:
		_main.hud_toast(text)


func on_leave() -> void:
	if _main != null:
		_main.set_threat(0.0, null)
	if _orderly != null:
		_orderly.queue_free()
		_orderly = null
