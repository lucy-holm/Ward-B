# THE LIGHT AXIS — is the current room's power on or off.
#
# A second state dimension, fully orthogonal to StateManager's lucid/unmed:
# nothing in this file reads ward state and nothing in StateManager reads this.
# They compose as an independent 2x2, which is the whole point — room 16 uses
# all four cells and every one of them is load-bearing (see
# rooms/room16/room16.gd and docs/superpowers/specs/
# 2026-07-19-room16-light-axis-design.md).
#
# Ported from the Three.js build's World.applyLight/isDark + GameCtx
# .isRoomDark/.setRoomDark (src/game/world.ts, src/game/context.ts).
#
# WHY AN AUTOLOAD, when light state is per-ROOM and ward state is global.
#
# Because core/light_object.gd has to be able to wire itself with zero
# plumbing, exactly the way core/state_object.gd wires itself to StateManager:
# a designer drops a LightObject wrapper around a mesh in the editor, sets one
# enum, and it works. Any other owner (main.gd, the room script, a per-room
# node) would mean every gated node hunting up the tree for it on _ready and
# re-hunting after a reload. The room-scoped-ness is handled explicitly
# instead, by main.gd's load_room calling reset() with the room's authored
# `start_dark` BEFORE the room enters the tree, so a fresh room's gated nodes
# read the right value in their own _ready and the first frame is already
# correct. No room can inherit the previous room's darkness.
#
# WHAT THIS DOES NOT DO, and it is the load-bearing omission:
#
#   IT NEVER TOUCHES A COLLIDER, AND NOTHING DOWNSTREAM OF IT MAY EITHER.
#
# The light axis gates mesh VISIBILITY and RAYCAST ELIGIBILITY only. A dark
# room is geometrically identical to a lit one: same boxes in WardCollision,
# same layers, same everything. That is what makes room 16's soft-lock audit
# unconditional rather than conditional — darkness can never seal a pocket, so
# a 0-pill unmed player can always walk back to a dispenser whatever the
# breaker is doing. tools/test_room16.gd asserts the collision cache is
# byte-identical between lit and dark, and that assertion is the guarantee.
# Do not "optimise" this by gating collision.
extends Node

## Fired whenever the room's light state actually changes (never on a
## no-op set). LightObject listens; main.gd listens to drive the Environment.
signal dark_changed(dark: bool)

var _dark := false


func is_dark() -> bool:
	return _dark


## The switch. Called by a room script through main.set_room_dark(), which
## also drives the Environment/Atmosphere half; call this directly only from a
## headless test that has no main.
func set_dark(dark: bool) -> void:
	if dark == _dark:
		return
	_dark = dark
	dark_changed.emit(_dark)


## Room load. Unconditional (not a no-op when the value already matches) so a
## room that opens dark and a room that opens lit both leave this in a known
## state, and so the signal fires for anything already listening — main.gd's
## Environment wiring, mainly, which must not be left showing the last room's
## mood. Gated nodes in the room being loaded do not depend on the signal at
## all: they read is_dark() in their own _ready.
func reset(start_dark: bool) -> void:
	_dark = start_dark
	dark_changed.emit(_dark)
