# Lucid/unmedicated state machine + medication meter.
#
# Shifting UNMED -> LUCID costs one pill (lucidity is the safe-but-expensive
# state); LUCID -> UNMED is always free. Nothing can shift until a tutorial
# beat grants the ability (can_shift).
#
# PORT NOTE (vs src/game/state.ts): the TS version exposed a single
# `onChange` callback that main.ts owned. Here it is a Godot signal, so any
# number of rooms/props/UI can subscribe independently and nothing polls a
# global each frame. That is the whole point of the migration — see
# StateObject (core/state_object.gd) for the per-node subscriber.
#
# Deliberately NOT in here: pill inventory (GameState owns run inventory) and
# the decision to actually revert when the meter empties. The meter emptying
# is a fact this node knows; whether reverting right now would drop the
# player inside unmed-only geometry is world knowledge it does not have, so
# it emits `medication_depleted` and lets the world apply the trap guard.
extends Node

enum State { UNMED, LUCID }

enum ShiftResult { OK, NO_ABILITY, NO_PILLS }

## Emitted on every actual state change. `source` says *why*: "manual" for
## the player's own Q press, or whatever a force_state() caller passes
## (e.g. "catch", "tutorial", "room13-entry").
signal state_changed(next: State, prev: State, source: String)

## Meter crossed the warn threshold on its way down. Fires once per lucid
## stretch, not every frame.
signal medication_warning()

## Meter hit empty. The listener decides whether it is safe to revert.
signal medication_depleted()

## Meter value changed (0..1). For HUD binding only.
signal medication_changed(fraction: float)

## can_shift flipped. Lets the HUD show/hide the shift affordance.
signal shift_ability_changed(can_shift: bool)

var state: State = State.UNMED

var can_shift := false:
	set(value):
		if can_shift == value:
			return
		can_shift = value
		shift_ability_changed.emit(value)

# Medication meter, 1.0 (just took a pill) down to 0.0 (worn off). Only
# meaningful while state == LUCID: refilled to 1.0 on every unmed->lucid
# transition (manual shift() or scripted force_state()) and drained in real
# time by _process. Left untouched while unmed — nothing reads it, and
# re-entering lucid always refills it anyway.
var medication := 0.0

var _warned := false


func _ready() -> void:
	# Autoloads keep running while the tree is paused only if told to; the
	# meter must NOT drain behind a keypad UI or a pause menu.
	process_mode = Node.PROCESS_MODE_PAUSABLE


func is_lucid() -> bool:
	return state == State.LUCID


## Player-initiated shift. Costs a pill going unmed -> lucid.
func shift() -> ShiftResult:
	if not can_shift:
		return ShiftResult.NO_ABILITY

	var prev := state
	if prev == State.UNMED:
		if not GameState.has_pill():
			return ShiftResult.NO_PILLS
		GameState.consume_pill()
		_enter_lucid()
	else:
		state = State.UNMED

	state_changed.emit(state, prev, "manual")
	return ShiftResult.OK


## Sets state directly without touching the pill count (e.g. the tutorial's
## scripted first pill, or a room's scripted lucid beat). Emits only if the
## state actually changed. Forcing to lucid starts the meter fresh, same as a
## manual shift — a scripted pill is still a pill.
func force_state(next: State, source: String = "") -> void:
	var prev := state
	if prev == next:
		return
	if next == State.LUCID:
		_enter_lucid()
	else:
		state = next
	state_changed.emit(next, prev, source)


func _enter_lucid() -> void:
	state = State.LUCID
	medication = 1.0
	_warned = false
	medication_changed.emit(medication)


# Drains the meter in real time; only has effect while lucid AND able to
# shift (room 1's pre-ability stretch never drains). Pins at 0 rather than
# going negative so repeated frames while a revert is held off by the world's
# trap guard keep reporting empty without re-emitting.
func _process(delta: float) -> void:
	if state != State.LUCID or not can_shift:
		return
	if medication <= 0.0:
		return

	medication = maxf(0.0, medication - delta / Tuning.MEDICATION_DURATION_SEC)
	medication_changed.emit(medication)

	if not _warned and seconds_remaining() <= Tuning.MEDICATION_WARN_SEC:
		_warned = true
		medication_warning.emit()

	if medication <= 0.0:
		medication_depleted.emit()


func seconds_remaining() -> float:
	return medication * Tuning.MEDICATION_DURATION_SEC


## Full reset for starting a fresh run.
func reset() -> void:
	state = State.UNMED
	medication = 0.0
	_warned = false
	can_shift = false
