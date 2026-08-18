# A rectangular XZ region that fires enter/exit callbacks when a body crosses
# its boundary — the declarative, reusable version of the ad-hoc "am I standing
# in this stretch" boolean a hand-rolled hazard reimplements (room13's closing
# walls recompute exactly this shape every frame).
#
# Ported from src/rooms/types.ts's TriggerDef + src/rooms/kit.ts's inTrigger().
#
# THIS IS NOT AN Area3D, AND MUST NOT BECOME ONE.
#
# An Area3D + body_entered overlap is the obvious Godot idiom and is wrong here.
# The reference semantics — which rooms 14 and 20 reason about, including their
# soft-lock audits — are a POINT-IN-RECT test on the body's (x, z) with STRICT
# inequalities, evaluated every frame:
#
#     x > min_x and x < max_x and z > min_z and z < max_z
#
# Three things follow from that and break if it is swapped for an overlap test:
#
#   1. NO RADIUS INFLATION. The player is a 0.35m capsule; an Area3D would
#      report "entered" as soon as the capsule's SKIN touched the rect, i.e.
#      0.35m early on every side, making every plate effectively 0.7m wider
#      than authored. Room 14's whole teach is that the plate-to-gate gap
#      (1.38m) is just barely runnable inside the 0.7s settle window; inflating
#      the plate shortens that run and deletes the failure the room exists to
#      produce. Room 20 pushes crates onto plates against measured margins.
#   2. THE BOUNDARY IS OUTSIDE. Strict `>` / `<` means a body standing exactly
#      on min_x is NOT inside. Degenerate rects (min == max) therefore never
#      fire at all, which is a useful authoring invariant rather than a bug —
#      see check_rooms.gd, which rejects them.
#   3. POLLED, NOT EVENT-DRIVEN. Containment is re-evaluated every physics tick
#      even if nothing moved, because the state filter is part of the test: a
#      `states = LUCID` trigger stops containing a motionless player the instant
#      the ward flips to UNMED, and must fire its exit in that same tick.
#      body_exited would never fire — the body never moved.
#
# Deliberately NO implicit collider: a trigger is a floor-level sensor, not an
# obstacle. A room that wants a trigger region to also block movement authors a
# separate solid for it, the same opt-in as any other prop. This is what makes a
# pressure plate walkable (the entire mechanic) and what lets an orderly's
# patrol cross one as bare floor with no special-casing anywhere in Orderly.
#
# Extends Node, NOT Node3D, on purpose: the rect is authored in absolute world
# XZ (the same coordinates as RoomDef/room .tscn geometry), so there is no
# transform to drift out of sync with the numbers a room's design comments and
# audits quote. Moving a plate means editing its rect and its mesh together —
# see gen_rooms.py's Room.plate(), which emits both from one call.
@tool
class_name TriggerVolume
extends Node

## Ward-state filter. Values mirror StateObject.Affinity (BOTH/LUCID/UNMED = 0/1/2)
## so the generator can emit the same integer for a trigger and for the plate
## mesh that marks it. NOTE this is NOT StateManager.State, whose ordering is
## UNMED = 0, LUCID = 1 — never compare the two enums directly.
enum States {
	BOTH,   ## always live
	LUCID,  ## only exists — is enterable, fires anything — while medicated
	UNMED,  ## only exists while unmedicated
}

## Unique within a room (check_rooms.gd enforces it). This is the id handed to
## the room script's on_trigger_enter / on_trigger_exit.
@export var trigger_id := ""

@export var min_x := 0.0
@export var max_x := 0.0
@export var min_z := 0.0
@export var max_z := 0.0

@export var states: States = States.BOTH


## THE containment test. Strict inequalities: a point exactly on an edge is
## OUTSIDE. Identical to kit.ts's `x > t.minX && x < t.maxX && ...`.
##
## Static and rect-parameterised so it can be run against any XZ point without
## a TriggerVolume instance — the "is the crate on the plate" case in room 20.
static func point_in_rect(x: float, z: float, r_min_x: float, r_max_x: float,
		r_min_z: float, r_max_z: float) -> bool:
	return x > r_min_x and x < r_max_x and z > r_min_z and z < r_max_z


## Same test with the rect grown by `margin` on every side — the standard
## circle-vs-AABB approximation, and the exact check room 14's spec writes out
## by hand for its deferred gate (gate footprint x[-1,1] tested as x(-1.35,1.35)
## for a 0.35m body). Still strict, so "just touching" does not count as
## overlapping. Used by DeferredGate; exposed here so there is one rect
## implementation in the codebase rather than two that can drift.
static func circle_in_rect(x: float, z: float, radius: float, r_min_x: float,
		r_max_x: float, r_min_z: float, r_max_z: float) -> bool:
	return point_in_rect(x, z,
		r_min_x - radius, r_max_x + radius, r_min_z - radius, r_max_z + radius)


## Whether a filter admits a ward state. `filter` is a States value, `state` is
## a StateManager.State value.
static func state_allows(filter: int, state: int) -> bool:
	match filter:
		States.LUCID:
			return state == StateManager.State.LUCID
		States.UNMED:
			return state == StateManager.State.UNMED
		_:
			return true


## Is (x, z) inside this trigger, given the ward state?
##
## The state filter is evaluated INSIDE the containment test, exactly as
## inTrigger() does, which is what makes a filtered trigger fire its exit on a
## state change with no movement at all: the same position simply stops being
## contained.
##
## THE ONE METHOD ROOMS CALL FOR NON-PLAYER BODIES. TriggerPoll runs this for
## the player every tick; an orderly, a pushable crate or anything else the
## engine has never heard of is a room-owned actor, so the room runs the
## identical test itself against that actor's x/z and pairs it with its own
## `var was_on := false` edge-detect (the shape room13's inStretch already has).
## One rect, authored once, shared by both sides — no drift between where a
## plate visibly is and where it actually fires.
func contains(x: float, z: float, state: int) -> bool:
	if not state_allows(states, state):
		return false
	return point_in_rect(x, z, min_x, max_x, min_z, max_z)


## contains() against the live ward state — the common case from a room's
## _physics_process, so callers don't have to reach for StateManager themselves.
func contains_now(x: float, z: float) -> bool:
	return contains(x, z, StateManager.state)


## A body of `radius` overlapping this trigger's footprint at all (as opposed to
## its centre being inside it). NOT what fires enter/exit — that is deliberately
## the centre point — but what a gate needs before it may re-engage a collider.
func overlaps_circle(x: float, z: float, radius: float) -> bool:
	return circle_in_rect(x, z, radius, min_x, max_x, min_z, max_z)


func center() -> Vector2:
	return Vector2((min_x + max_x) * 0.5, (min_z + max_z) * 0.5)


## Every TriggerVolume under `root`, in tree order. Tree order is the poll
## order, so enter/exit callbacks for two overlapping triggers arrive in a
## stable, authorable sequence.
static func collect(root: Node) -> Array[TriggerVolume]:
	var out: Array[TriggerVolume] = []
	if root == null:
		return out
	_collect_into(root, out)
	return out


static func _collect_into(node: Node, out: Array[TriggerVolume]) -> void:
	if node is TriggerVolume:
		out.append(node as TriggerVolume)
	for child in node.get_children():
		_collect_into(child, out)


## Look one up by id — how a room gets the rect for its own orderly/crate test
## without hardcoding a node path: `TriggerVolume.find_in(self, "plate14")`.
static func find_in(root: Node, id: String) -> TriggerVolume:
	for v in collect(root):
		if v.trigger_id == id:
			return v
	return null


func _get_configuration_warnings() -> PackedStringArray:
	var warnings := PackedStringArray()
	if trigger_id.is_empty():
		warnings.append("trigger_id is empty — the room script has nothing to match on.")
	if min_x >= max_x or min_z >= max_z:
		warnings.append(
			"Degenerate rect (min >= max on an axis). Containment is strict "
			+ "(> / <), so this trigger can never fire.")
	return warnings
