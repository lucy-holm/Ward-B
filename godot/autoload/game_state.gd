# Run inventory + progression: which room we're in, how many pills the player
# is carrying, and the per-run stats telemetry reports on.
#
# Deliberately lean — this is a record of the run, not a place to put
# gameplay logic. Room behaviour lives in the room scenes; state-machine
# behaviour lives in StateManager.
extends Node

## Pill count changed. HUD binds to this instead of polling.
signal pills_changed(count: int)

## The player moved to a new room. `from` is "" on the first room.
signal room_changed(to: String, from: String)

## Dispensers stop being infinite from room 3 onward (the smashed-dispenser
## beat). Emitted when that economy flip happens so props can re-dress.
signal scarcity_changed(scarce: bool)

var pills := 0:
	set(value):
		var clamped := clampi(value, 0, Tuning.PILLS_MAX)
		if pills == clamped:
			return
		pills = clamped
		pills_changed.emit(pills)

var current_room := ""

# Phase-two pill economy: unlimited dispensers in the early rooms (diegetic
# tutorial, no scarcity pressure), then a smashed dispenser from room 3
# onward, after which pills are scarce finite pickups.
var pills_are_scarce := false:
	set(value):
		if pills_are_scarce == value:
			return
		pills_are_scarce = value
		scarcity_changed.emit(value)

# --- run stats (telemetry) ---
var run_started_unix := 0
var deaths := 0
var shifts := 0
var orderly_sightings := 0
var rooms_completed: Array[String] = []


func has_pill() -> bool:
	return pills > 0


func consume_pill() -> void:
	pills -= 1
	shifts += 1


func refill() -> int:
	pills = Tuning.PILLS_MAX
	return pills


func enter_room(id: String) -> void:
	var from := current_room
	current_room = id
	room_changed.emit(id, from)


func complete_room(id: String) -> void:
	if id not in rooms_completed:
		rooms_completed.append(id)


func reset_run() -> void:
	pills = 0
	current_room = ""
	pills_are_scarce = false
	deaths = 0
	shifts = 0
	orderly_sightings = 0
	rooms_completed.clear()
