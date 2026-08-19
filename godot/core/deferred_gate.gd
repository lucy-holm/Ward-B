# A collider that may only re-engage when nothing is standing in its footprint.
#
# THE HAZARD THIS EXISTS FOR, in one sentence: closing a collider back onto a
# body that is already inside its bounds freezes that body outright, because the
# movement solver (collision.gd's try_move, ported from the same axis-separated
# resolver as the TS build) blocks EVERY direction once the current position
# penetrates an AABB — there is no push-out, so the body has no legal move left.
#
# For the player that is an unrecoverable soft-lock; for an orderly it is a
# wedged patrol. It is the same bug class room13's per-frame wall-clamp exists
# to prevent and the same one main.gd's revert guard handles for state-flipped
# geometry (circle_hits_solid_unmed): a raw player is never reverted into a wall
# that is about to materialise around them.
#
# THIS IS A GENERAL RULE, NOT A ROOM 14 QUIRK. Any trigger-held gate — room 14's
# plate-held door, room 20's block-held gates, anything later that re-engages a
# collider when a trigger empties — has to defer the close while a body's circle
# still overlaps the gate footprint, rechecking every frame until it is clear.
# Room 14 is only the first worked example (see
# docs/superpowers/specs/2026-07-19-room14-pressure-plates-design.md, "reversible
# gates").
#
# Not a Node: a room owns one of these as a plain member and ticks it from its
# own _physics_process, next to whatever else that room updates. It holds no
# reference to the collider it guards and never touches the scene — it answers
# exactly one question, "may I close NOW?", and the room does the closing
# (unlock_door / collision_layer / rebuild_collision are all room-and-main
# business). That keeps it usable for a gate made of anything.
#
# Typical use:
#
#     var _gate := DeferredGate.rect(-1.0, 1.0, -14.1, -13.9)
#
#     func on_trigger_exit(id: String) -> void:
#         if id == "plate14" and _occupants == 0:
#             _gate.request_close()          # starts the 0.7s settle
#
#     func on_trigger_enter(id: String) -> void:
#         if id == "plate14":
#             _gate.cancel_close()           # someone stepped back on
#
#     func _physics_process(delta: float) -> void:
#         if _gate.tick(delta, [
#                 DeferredGate.body(_player.x, _player.z, Tuning.PLAYER_RADIUS),
#                 DeferredGate.body(_orderly.x, _orderly.z, Tuning.ORDERLY_RADIUS)]):
#             _close_the_gate()              # fires on exactly one frame
class_name DeferredGate
extends RefCounted

## Grace window after the last body leaves the trigger, before the gate even
## begins trying to close. Room 14's spec (SETTLE_SEC) and the number its
## solo-sprint route is balanced against: 3.4 m/s x 0.7 s = 2.38m of coverage
## for a ~1.6m run, i.e. real margin rather than a frame-perfect trick.
const DEFAULT_SETTLE_SEC := 0.7

var min_x := 0.0
var max_x := 0.0
var min_z := 0.0
var max_z := 0.0
var settle_sec := DEFAULT_SETTLE_SEC

var _pending := false
var _timer := 0.0
var _deferred := false


## The gate's own footprint, in the same world XZ as its collider. Author it as
## the collider's rect — tick() grows it per body by that body's radius, so the
## caller never repeats the inflation by hand.
static func rect(gate_min_x: float, gate_max_x: float, gate_min_z: float,
		gate_max_z: float, settle := DEFAULT_SETTLE_SEC) -> DeferredGate:
	var g := DeferredGate.new()
	g.min_x = gate_min_x
	g.max_x = gate_max_x
	g.min_z = gate_min_z
	g.max_z = gate_max_z
	g.settle_sec = settle
	return g


## One body for tick(): (x, z, radius) packed into a Vector3 so the per-frame
## call allocates one small array and no dictionaries.
static func body(x: float, z: float, radius: float) -> Vector3:
	return Vector3(x, z, radius)


## Start the settle countdown. Idempotent while already pending, so a room may
## call it from a callback that can fire more than once without restarting the
## clock (a re-arm is cancel_close() then request_close()).
func request_close() -> void:
	if _pending:
		return
	_pending = true
	_deferred = false
	_timer = settle_sec


## Abandon a pending close — something stood on the plate again. Safe to call
## when nothing is pending.
func cancel_close() -> void:
	_pending = false
	_deferred = false
	_timer = 0.0


func is_pending() -> bool:
	return _pending


## True while the settle has elapsed but a body is still standing in the gate.
## Nothing needs it to work; it is here so a room can say something about it
## (a toast, telemetry, a straining-door sound) instead of the gate silently
## doing nothing.
func is_deferred() -> bool:
	return _deferred


func time_left() -> float:
	return maxf(_timer, 0.0)


## Is this body's circle overlapping the gate footprint at all? Strict, and the
## rect grown by the body radius — the same check room 14's spec writes out by
## hand, sharing TriggerVolume's rect implementation so the two can never drift.
func blocked_by(x: float, z: float, radius: float) -> bool:
	return TriggerVolume.circle_in_rect(x, z, radius, min_x, max_x, min_z, max_z)


func blocked_by_any(bodies: Array) -> bool:
	for b: Vector3 in bodies:
		if blocked_by(b.x, b.y, b.z):  # packed as (x, z, radius) by body()
			return true
	return false


## Tick the settle and answer "close now?". Returns true on EXACTLY ONE frame —
## the first frame on which the settle has elapsed AND every body is clear of
## the footprint — and false on every other, including every frame it defers.
##
## The countdown runs even while a body is in the way (matching the reference's
## closeTimer, which counts down independently of tryCloseGate's own check), so
## a body that loiters in the gate and then leaves gets the close immediately
## rather than a second full settle.
func tick(delta: float, bodies: Array) -> bool:
	if not _pending:
		return false

	if _timer > 0.0:
		_timer -= delta
		if _timer > 0.0:
			return false

	if blocked_by_any(bodies):
		# Deferred, rechecked next frame. Closing here is the freeze.
		_deferred = true
		return false

	_pending = false
	_deferred = false
	_timer = 0.0
	return true
