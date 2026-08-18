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

# --- cross-room flags -------------------------------------------------------
#
# A tiny key/value bag written by one room and read by another. Room 18's relay
# lever writes "room18.power"; main.gd's ROOM_VARIANTS reads it to decide which
# of the two room 19 scenes to load. Keys are namespaced by the writing room,
# "<room>.<name>", which avoids collisions without needing a registry.
#
# WHY IT LIVES HERE and not in StateManager or Settings. StateManager is
# specifically the lucid/unmed machine plus the pill economy and says so in its
# own header; Settings is per-INSTALL and persisted to disk. A room flag is a
# third thing: a fact about THIS RUN. That is exactly what this autoload
# already is, so it goes here and is cleared by reset_run() with everything
# else — a second playthrough must not inherit the first one's undercroft.
#
# Never persisted. A catch does NOT clear it (nothing calls reset_run on a
# catch, by design), so a player caught after throwing the relay comes back to
# a room where they already decided, which is the whole point of the choice.
var flags := {}



# --- run stats (telemetry) ---
var run_started_unix := 0
var deaths := 0
var shifts := 0
var orderly_sightings := 0
var rooms_completed: Array[String] = []


func has_pill() -> bool:
	return pills > 0


## Write a cross-room flag. One-way as far as the engine is concerned — no
## room script has any business clearing another room's flag.
func set_flag(key: String, value: Variant) -> void:
	flags[key] = value


func get_flag(key: String, fallback: Variant = null) -> Variant:
	return flags.get(key, fallback)


func has_flag(key: String) -> bool:
	return flags.has(key)


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
	flags.clear()
	current_room = ""
	pills_are_scarce = false
	deaths = 0
	shifts = 0
	orderly_sightings = 0
	rooms_completed.clear()
