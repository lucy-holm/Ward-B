# ROOM 14 — the Hold. The wing's opening room, and the first to be built on the
# trigger-volume primitive (core/trigger_volume.gd, core/trigger_poll.gd,
# core/deferred_gate.gd).
#
# Room 13 was brutal and gave nothing back, so this one opens with a dispenser
# five meters from spawn and asks exactly one new thing: a gate that a floor
# plate holds open only while something's weight is on it, with the plate far
# enough from the gate that being on it and being through it are mutually
# exclusive. One base-tuned orderly paces a line that crosses the plate — the
# wing's reintroduction of the threat, and the second half of the teach: his
# patrol never stops, even lucid when you cannot see him, so he can carry the
# plate for you.
#
# No keypad, no code. Three honest routes:
#   A solo sprint    — step on, run the 1.38m gap before the 0.7s settle
#                      window closes (0.7s x 3.4 m/s = 2.38m of coverage for a
#                      ~1.6m run: real margin, but you must move the instant
#                      you leave the plate). 0 pills.
#   B let him carry  — wait behind the crate at (3,-13), walk through while
#                      his leg crosses the plate (1.73s transit + a 0.7s tail
#                      against a ~0.94s walk). 0 pills unmed, 1 lucid for safety.
#   C pay to be safe — shift lucid first, then A or B risk-free. 1 pill.
#
# SOFT-LOCK AUDIT: dispenser14 sits in the entry alcove behind no gate, no
# orderly reach and no state requirement, so a 0-pill unmed arrival tops up in
# the first seconds. Nothing here is unmed-sealed; the gate only ever stands
# between the open floor and the one-way exit, never between the player and the
# dispenser, so whether it is open or shut has zero effect on reaching a pill.
# The medication timer expiring anywhere is an ordinary revert. And the gate can
# never close onto a body inside its own footprint — see _gate below.
#
# REACTION-TIME AUDIT (patrol leg (-4.2,-11.9)<->(4.2,-11.9)): the west scrawl
# (-5,2) is ~13.9m from the nearest patrol point, the east scrawl (5,-2) ~9.9m,
# the dispenser ~19.6m — all clear the 8.2m inspection-point floor. The plate
# and the gate ARE within his reach, deliberately: that is the room's gameplay
# (evasion and timing), not a stop-and-read moment. He is unmodified
# Tuning.orderly — reintroduction, not escalation.
#
# PORT NOTES vs src/rooms/room14.ts:
#  * The gate collider is re-engaged by name rather than by shoving its minX to
#    999. main.gd has unlock_door() but no lock_door(), because room 14 is the
#    first gate in the ward that ever closes again — so the layer flip lives
#    here rather than widening the room-script API for one room.
#  * The gate's CLOSED yaw is PI, not the TS's 0: gen_rooms.py authors a 'pz'
#    fixture at yaw PI (a Node3D's forward is -Z). Open is PI + PI/2, the same
#    +90 degree swing about the west edge the TS makes.
#  * The orderly's position is read one physics tick stale. Godot orders
#    equal-priority _physics_process by tree order, and the orderly is a CHILD
#    of this room, so he steps after this script runs. That is the same 16.7ms
#    lag TriggerPoll already documents for the player, and is invisible at
#    1.5 m/s (2.5cm).
extends Node3D

const ORDERLY := preload("res://orderly/orderly.tscn")

# Catch returns the player here — 5m from the dispenser with nothing hazardous
# in between, so a failed run costs time and nothing else.
const SPAWN_X := 0.0
const SPAWN_Z := 8.0

# THE SINGLE ORDERLY. A two-waypoint back-and-forth whose line runs straight
# through the plate's x-band at z = -11.9 — dead centre of the plate's
# z[-12.5,-11.3]. That crossing is route B, and it is the only reason his
# patrol is shaped this way; do not move this line off the plate.
#
# Clearances: 0.68m to each side wall's inner face and 0.8m to the crate,
# against his 0.4m body radius.
const WAYPOINTS: Array[Vector3] = [
	Vector3(-4.2, 0, -11.9),
	Vector3(4.2, 0, -11.9),
]

# The gate's own footprint, matching GateCollider in room14.tscn.
const GATE_MIN_X := -1.0
const GATE_MAX_X := 1.0
const GATE_MIN_Z := -14.1
const GATE_MAX_Z := -13.9

const GATE_CLOSED_POS := Vector3(0.0, 1.5, -14.0)
const GATE_OPEN_POS := Vector3(-1.0, 1.5, -14.85)
const GATE_CLOSED_ROT := PI
const GATE_OPEN_ROT := PI + PI / 2.0

var _main: Node = null
var _orderly: CharacterBody3D = null

# The room's OWN handle on the plate rect — the same object TriggerPoll polls
# for the player, fetched by id rather than by retyping the numbers, so "where
# the plate is" and "where it fires" cannot drift for the orderly either.
var _plate: TriggerVolume = null

# THE REVERSIBLE-GATE GUARD. Closing a collider back onto a body already inside
# its bounds freezes that body outright: the axis-separated resolver blocks
# every direction once the position penetrates an AABB, so there is no legal
# move left. For the player that is an unrecoverable soft-lock. DeferredGate
# runs the settle countdown and refuses to report "close now" until every body's
# circle is clear of the footprint. Never hand-roll this.
var _gate := DeferredGate.rect(GATE_MIN_X, GATE_MAX_X, GATE_MIN_Z, GATE_MAX_Z)

# The union of everything standing on the plate — player (engine-polled) plus
# orderly (room-polled). One counter, so the gate stays open while ANY weight is
# on it and the handover from one body to the other never flickers it shut.
var _occupants := 0
var _orderly_was_on := false
var _gate_open := false
var _saw_first_open := false
var _saw_orderly_open := false
var _saw_through := false


func on_enter(main: Node) -> void:
	_main = main
	_plate = TriggerVolume.find_in(self, "plate14")
	if _plate == null:
		push_error("room14: no plate14 trigger volume — the gate can never open.")

	# The scene is authored with the gate shut; re-assert it anyway so a
	# re-entry after a catch or a reload starts from a known state.
	_occupants = 0
	_orderly_was_on = false
	_saw_first_open = false
	_saw_orderly_open = false
	_saw_through = false
	_gate.cancel_close()
	_gate_open = false
	_apply_gate(false)

	for node in _interactables():
		node.availability = _is_available

	_spawn_orderly()
	main.hud_objective("the wing goes on. so does he.")


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


# The gate is opened by weight and by nothing else. There is no keypad in this
# room and no interaction that opens the door — walking up and pressing E on it
# must never be a route, or the whole teach evaporates.
func _is_available(id: String) -> bool:
	return id != "gate14"


# --- the gate --------------------------------------------------------------

func _gate_collider() -> CollisionObject3D:
	return get_node_or_null("Geometry/GateCollider") as CollisionObject3D


## Swing the panel and flip the collider together. Layer 0 is the same "drop it
## from the query" trick main.unlock_door uses; the difference here is that it
## comes back.
func _apply_gate(open: bool) -> void:
	var body := _gate_collider()
	if body != null:
		body.collision_layer = 0 if open else WardCollision.LAYER_WORLD_STATIC
	if _main == null:
		return
	_main.rebuild_collision()
	_main.move_interactable("gate14",
		GATE_OPEN_POS if open else GATE_CLOSED_POS,
		GATE_OPEN_ROT if open else GATE_CLOSED_ROT)


func _open_gate(by_orderly: bool) -> void:
	if _gate_open:
		return
	_gate_open = true
	_apply_gate(true)
	# Toast sequencing is deliberate. The first-ever open teaches the mechanism
	# no matter who tripped it; the orderly beat then lands on his NEXT
	# crossing. His patrol re-crosses the plate every cycle, so when he causes
	# the first open too the beat is delayed one cycle, never lost.
	if not _saw_first_open:
		_saw_first_open = true
		_toast("the floor remembers weight. the door remembers the floor.")
	elif by_orderly and not _saw_orderly_open:
		_saw_orderly_open = true
		_toast("he just did what you couldn't do alone.")
	Telemetry.event("gate_open", {"by_orderly": by_orderly})


func _close_gate() -> void:
	if not _gate_open:
		return
	_gate_open = false
	_apply_gate(false)
	Telemetry.event("gate_close")


func is_gate_open() -> bool:
	return _gate_open


# --- the plate -------------------------------------------------------------

func _plate_enter(by_orderly: bool) -> void:
	_occupants += 1
	# Something is on it again — abandon any pending close outright rather than
	# letting the settle run down under a loaded plate.
	_gate.cancel_close()
	if _occupants == 1:
		_open_gate(by_orderly)


func _plate_exit() -> void:
	_occupants = maxi(0, _occupants - 1)
	if _occupants == 0 and _gate_open:
		_gate.request_close()


# Engine-fired, PLAYER ONLY, at the head of the physics tick — so by the time
# _physics_process below runs on this same tick, the gate is already open.
func on_trigger_enter(id: String) -> void:
	if id == "plate14":
		_plate_enter(false)
	elif id == "vestibule14" and not _saw_through:
		_saw_through = true
		if _main != null:
			_main.hud_objective("through. it doesn't get gentler from here.")


func on_trigger_exit(id: String) -> void:
	if id == "plate14":
		_plate_exit()


# --- per-frame -------------------------------------------------------------

func _physics_process(delta: float) -> void:
	if _main == null:
		return

	# THE ROOM'S BEST MOMENT: his weight counts exactly like yours.
	#
	# The engine has never known about orderlies — they are room-owned actors —
	# so the room runs the IDENTICAL containment test itself against the same
	# rect the poll uses for the player, paired with its own edge-detect. No
	# special-casing anywhere in Orderly, and no second copy of the numbers.
	if _orderly != null and _plate != null:
		var o: Vector3 = _orderly.global_position
		var orderly_on := _plate.contains(o.x, o.z, StateManager.state)
		if orderly_on and not _orderly_was_on:
			_plate_enter(true)
		elif not orderly_on and _orderly_was_on:
			_plate_exit()
		_orderly_was_on = orderly_on

	# The deferred close. Both bodies are offered every frame: a wedged orderly
	# is only a visual bug, but the same rule catches him and the player.
	if _gate.tick(delta, _gate_bodies()):
		_close_gate()

	if _orderly != null:
		var level: float = _orderly.watching()
		if level > 0.0 or _orderly.is_chasing():
			_main.set_threat(level, _orderly.bearing_from(_main.player.yaw))
		else:
			_main.set_threat(0.0, null)


## Every body the gate must not close on, as DeferredGate (x, z, radius)
## triples. Exposed so the test harness can assert the same set the room ticks.
func _gate_bodies() -> Array:
	var out: Array = []
	if _main != null and _main.player != null:
		var p: Vector3 = _main.player.global_position
		out.append(DeferredGate.body(p.x, p.z, Tuning.PLAYER_RADIUS))
	if _orderly != null:
		var o: Vector3 = _orderly.global_position
		out.append(DeferredGate.body(o.x, o.z, Tuning.ORDERLY_RADIUS))
	return out


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
	_orderly.setup(_main.player, _main.collision)

	_orderly.warned.connect(_on_warned)
	_orderly.chase_started.connect(_on_chase_started)
	_orderly.caught.connect(_on_caught)


func _on_warned() -> void:
	_toast("he is looking at you.")
	Telemetry.event("orderly_spotted")


func _on_chase_started() -> void:
	_toast("run. or stop being visible.")
	Telemetry.event("orderly_chase")


# Telemetry FIRST: the event snapshots player position at emit time, so
# emitting after the teleport would record the spawn point for every catch and
# flatten the catch heat-map into a single dot.
#
# No code to reroll here — this room has no keypad at all.
func _on_caught() -> void:
	Telemetry.event("orderly_caught")
	StateManager.force_state(StateManager.State.LUCID, "catch")
	_main.shift_fx()
	_main.teleport_player(SPAWN_X, SPAWN_Z)
	_toast('hands. a needle. "back to the start of the wing," he says.')


func _toast(text: String) -> void:
	if _main != null:
		_main.hud_toast(text)


func on_leave() -> void:
	if _main != null:
		_main.set_threat(0.0, null)
	if _orderly != null:
		_orderly.queue_free()
		_orderly = null
