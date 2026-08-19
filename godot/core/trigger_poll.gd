# The per-frame trigger poll: the engine half of the trigger-volume primitive.
#
# Ported from src/main.ts:543-557 — the `activeTriggers` Set and its per-frame
# diff — and it reproduces that shape exactly:
#
#   1. build the set of trigger ids currently containing the polled body
#   2. fire on_trigger_enter for every id newly present
#   3. fire on_trigger_exit for every id newly absent
#   4. store the new set
#
# Enters are ALL fired before ANY exit, matching the reference. A room that
# hands two adjacent plates the same "occupants" counter therefore sees the
# count go up before it comes down when the player steps straight from one to
# the other, which is the difference between a gate flickering shut for a frame
# and it staying open.
#
# ROOM HOOKS ARE DUCK-TYPED AND OPTIONAL, the same convention main.gd already
# uses for on_enter / on_interact / on_state_change / on_leave:
#
#   func on_trigger_enter(id: String) -> void
#   func on_trigger_exit(id: String) -> void
#
# A room implements neither, one, or both. Nothing registers, nothing subscribes.
#
# WHY A DEDICATED NODE RATHER THAN A BLOCK INSIDE main.gd's _physics_process:
# frame ordering. src/main.ts polls between the player's movement/level
# resolution and the room's own update(), so a callback that flips room state
# has already landed by the time the room updates in the same frame. Godot
# orders _physics_process by process_physics_priority first and tree order
# second, and main.tscn puts WorldRoot (which holds the room) BEFORE Player, so
# no node can sit between the player and the room in a single tick. This node
# therefore takes the other available slot: priority -100 puts it at the HEAD of
# the tick, ahead of every room's own _physics_process (rooms sit at the default
# 0), reading the player's fully-resolved position from the end of the previous
# tick. The load-bearing half of the contract — "a trigger callback is already
# fresh when the room updates in the same frame" — holds exactly; the position
# read is one tick (16.7ms) old, the same lag every room's orderly logic already
# has. Alternative considered and rejected: reordering main.tscn so Player
# precedes WorldRoot, which would fix the tick lag but silently re-time every
# existing orderly room.
class_name TriggerPoll
extends Node

## Runs before every room's own _physics_process. See the header.
const POLL_PRIORITY := -100

## The room script receiving on_trigger_enter / on_trigger_exit.
var room: Node = null

## Whose (x, z) is polled — the player. Anything else in a room (orderlies,
## crates) is room-owned and tested by the room itself via
## TriggerVolume.contains(); the engine has never known about those actors and
## teaching it about them here would be a real new coupling.
var body: Node3D = null

## Optional gate: while it returns false, nothing is polled and the active set
## is left exactly as it was. main.gd points this at the player's input flag,
## which is the Godot analogue of main.ts polling only inside
## `if (started && !ended)` — no trigger fires behind the ADMIT ME overlay, on
## the end card, or while the dev panel has taken input.
var poll_when := Callable()

var _volumes: Array[TriggerVolume] = []
var _active := {}
# Bumped by bind_room so a callback that loads a room mid-dispatch cannot have
# the freshly-cleared active set clobbered by the poll it interrupted.
var _generation := 0


func _ready() -> void:
	process_physics_priority = POLL_PRIORITY


## Point the poll at a newly-loaded room: collect its TriggerVolumes and CLEAR
## THE ACTIVE SET WITHOUT FIRING ANY EXIT CALLBACK.
##
## Not firing is the reference behaviour (main.ts's loadRoom calls
## activeTriggers.clear() and nothing else) and is correct rather than lazy: by
## the time a room is swapped its script has already been torn down — on_leave
## has run, its orderly is freed, its gate colliders are gone — so an exit
## callback would run against a dead room, and in Godot against a queue_free'd
## node. The player also does not "leave" a trigger by leaving the room; the
## room ceases to exist.
##
## Pass null when tearing a room down with nothing to replace it.
func bind_room(next_room: Node) -> void:
	room = next_room
	_volumes = TriggerVolume.collect(next_room)
	_active.clear()
	_generation += 1


## Head-of-tick poll of the bound body. See the header for the ordering.
func _physics_process(_delta: float) -> void:
	if body == null or _volumes.is_empty():
		return
	if poll_when.is_valid() and not poll_when.call():
		return
	var p := body.global_position
	poll(p.x, p.z, StateManager.state)


## The set-diff itself, taking a raw XZ point and ward state so tests (and any
## future non-player poller) can drive it without a scene tree or physics.
func poll(x: float, z: float, state: int) -> void:
	var now_active := {}
	for v in _volumes:
		if v.contains(x, z, state):
			now_active[v.trigger_id] = true

	var gen := _generation

	# Enters first, exits second — same order as main.ts.
	for id: String in now_active:
		if _active.has(id):
			continue
		_fire("on_trigger_enter", id)
		if gen != _generation:
			return  # a callback loaded a room; its bind_room already reset us

	for id: String in _active:
		if now_active.has(id):
			continue
		_fire("on_trigger_exit", id)
		if gen != _generation:
			return

	_active = now_active


func _fire(method: String, id: String) -> void:
	if room != null and room.has_method(method):
		room.call(method, id)


## Ids the body is currently inside. Debug/telemetry and the test harness; a
## room should be tracking its own state from the callbacks, not asking.
func active_ids() -> Array:
	return _active.keys()


func is_active(id: String) -> bool:
	return _active.has(id)


## The volumes this poll is watching, in tree order — the room's own rects,
## already collected, so a room can reuse one for its orderly/crate test rather
## than re-walking its scene.
func volumes() -> Array[TriggerVolume]:
	return _volumes
