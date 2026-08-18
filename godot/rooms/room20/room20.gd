# ROOM 20 — the Loading Bay. The wing's capstone and the last room in the game:
# its exit is END, which is correct rather than a terminator hack.
#
# One new verb, PUSH, asked to do everything at once. A single crate seats
# PLATE_1 to open GATE_1 out of the intake pocket, then serves as mobile cover
# against two orderlies on the gauntlet floor, then seats PLATE_2 to open
# GATE_2 and the way to END. There is no second crate and no way to skip ahead.
#
# Ported from src/rooms/room20.ts, whose header carries the full design
# reasoning (dead-state analysis, soft-lock audit, reaction-time audit, the
# PASSAGE-CLEARANCE FIX that moved both plates off the causeway). Read that for
# the DESIGN; this header is only about what the Godot port does differently
# and why, and about the two things Godot makes materially better.
#
# ---------------------------------------------------------------------------
# THE CRATE IS GRID-SNAPPED, AND THAT IS A DECISION
# ---------------------------------------------------------------------------
#
# Godot could make this crate a RigidBody3D with real mass and momentum, and it
# would feel better to shove. Do not. Every soft-lock guarantee this room makes
# rests on "can the crate reach an unrecoverable cell" being a DISCRETE,
# ENUMERABLE question — tools/test_room20.gd answers it by exhaustive search
# over (crate cell x player region) and proves the room winnable from every
# state the crate can ever be in. Give the crate momentum and that search has
# no state space to run over, and the room stops being provably winnable. See
# docs/superpowers/specs/2026-08-17-godot-engine-leverage-design.md, room 20.
#
# So the solver is ported exactly: CELL_M = 1.0, one interact press = one cell
# along whichever cardinal axis has the larger magnitude in the player->crate
# vector at the moment of the press, continuing AWAY from the player. A push
# resolves only if the destination cell's 0.86m AABB overlaps neither an active
# collider (state-filtered exactly like try_move, the crate's OWN collider
# excluded BY IDENTITY) nor either orderly's body circle at that instant.
#
# THE ONE ENHANCEMENT, and it costs nothing: the one-cell slide is tweened
# rather than snapped. Same discrete logic, same guarantees, readable motion —
# see _set_crate_cell / _tick_tween for why the collider is never what moves.
#
# ---------------------------------------------------------------------------
# HOW THE CRATE COMPOSES WITH WardCollision
# ---------------------------------------------------------------------------
#
# WardCollision is a CACHE: rebuild_from() reads every CollisionShape3D's
# world AABB once at room load, and try_move queries that array, not the
# physics server. A body whose transform changes is invisible to the movement
# solver until its cached Box is updated. Room 13 solved exactly this for its
# moving slabs and this room reuses the answer verbatim: _set_crate_cell() is
# the SINGLE WRITER and writes both halves together — the node transform (what
# you see, and what a later rebuild_collision() re-derives from) and the cached
# Box, matched by `source` (the CollisionShape3D node), which survives a
# rebuild because the node does.
#
# The difference from room 13, and the reason gen_rooms.py's push_block()
# splits the crate into a body plus a `Visual` child: room 13 tweens the thing
# that collides, so its collider legitimately moves every frame. A push is
# DISCRETE. The collider must be at the destination the instant the push is
# accepted, or a player following the crate can end up standing where the solid
# AABB already is. So the BODY (and therefore the collider, and therefore the
# cache) snaps; `Visual` — mesh and Interactable together, so the crosshair
# never drifts off the thing you can see — is what slides over PUSH_TWEEN_SEC.
# The body transform is authoritative at every instant, which means a stray
# main.rebuild_collision() mid-tween self-heals to the truth instead of
# reverting the crate to where it is merely being drawn.
#
# OCCLUDER YES, MOVEMENT-COLLIDER NO — the room 13 lesson, which Godot gives
# us half of for free. Orderly._occluded() casts a real RayCast3D masked to
# LAYER_WORLD_STATIC, so the crate blocks sightlines the moment it exists, with
# no occluder list to maintain: the cover beats are real geometry. Movement is
# the opposite: both orderlies get their OWN WardCollision built from this
# room's subtree MINUS the crate's box, by node identity, exactly as room 13
# excludes its slabs. He resolves his step through the same try_move, which
# FREEZES any body whose current position already overlaps an AABB and has no
# push-out — so a crate shoved onto a patrol lane would wedge him there
# permanently, and nothing pushes HIM out. Consequence, accepted and identical
# to room 13's: an orderly the crate is pushed into walks through it. The
# design doc names the case (over-pushing to (-2,-2), onto Orderly A's own
# waypoint) and it IS reachable — see the test's reachable-set report — so this
# is a live safety net here, not a theoretical one.
#
# ---------------------------------------------------------------------------
# THE GATES ARE ONE-WAY LATCHES, AND THE ONE CLOSE THERE IS GOES THROUGH
# DeferredGate
# ---------------------------------------------------------------------------
#
# Both gates open on the crate's weight and never close again — like every
# keypad door in the game, and unlike room 14's plate-HELD gate. That is what
# makes the soft-lock audit's load-bearing guarantee hold: once GATE_1 is open,
# "is the dispenser reachable" reduces to "is Z1 reachable", which is true for
# the rest of the room's life.
#
# Closing a collider back onto a body inside its footprint freezes that body
# outright (see core/deferred_gate.gd). The only code path in this room that
# re-engages a gate collider is the on_enter re-assert, which exists so a
# re-entered room instance starts from a known state — and it goes through
# DeferredGate rather than writing the layer directly, so the rule is enforced
# by the shared primitive instead of by the argument that it can never matter
# here. Nothing else closes a gate: not a catch, not the crate leaving a plate.
#
# ---------------------------------------------------------------------------
# THE PLATES TRACK THE CRATE, NOT YOU
# ---------------------------------------------------------------------------
#
# TriggerPoll fires on_trigger_enter for the PLAYER on plate1/plate2 and this
# room deliberately ignores it. Both gates are opened by the crate's centre
# falling inside the plate rect, tested by this script against the same
# TriggerVolume the engine polls — one rect, authored once, so where the plate
# visibly is and where it fires can never drift. Standing on a plate yourself
# does nothing at all: it opens for the weight, not for you.
extends Node3D

const ORDERLY := preload("res://orderly/orderly.tscn")

# --- the grid --------------------------------------------------------------
const CELL_M := 1.0
const CRATE_HALF := 0.43            # 0.86m cube, 0.07m margin to the cell edge
const REST_CELL := Vector2(2, 1)
## "Standing at its face" — checked ON TOP of the crosshair raycast (which
## Tuning.INTERACT_MAX_DISTANCE already caps at 2.7m). Aiming at the crate from
## across the room is not a push.
const PUSH_REACH_M := 1.15
## Cosmetic only. The collider is already at the destination when this starts.
const PUSH_TWEEN_SEC := 0.18

# --- catch penalty ---------------------------------------------------------
const SPAWN_X := 0.0
const SPAWN_Z := 5.0

# --- the gates (footprints match Gate1Collider/Gate2Collider in room20.tscn) -
const GATE1_MIN_X := -0.5
const GATE1_MAX_X := 0.5
const GATE1_MIN_Z := -0.1
const GATE1_MAX_Z := 0.1
const GATE2_MIN_X := -0.5
const GATE2_MAX_X := 0.5
const GATE2_MIN_Z := -16.1
const GATE2_MAX_Z := -15.9

# Panel swing. Closed yaw is PI, not the TS's 0: gen_rooms.py authors a 'pz'
# fixture at yaw PI (a Node3D's forward is -Z). Open is PI + PI/2 — the same
# +90 degree swing about the west edge room 14 makes, scaled to a 1m panel.
const GATE1_CLOSED_POS := Vector3(0.0, 1.5, 0.0)
const GATE1_OPEN_POS := Vector3(-0.5, 1.5, -0.85)
const GATE2_CLOSED_POS := Vector3(0.0, 1.5, -16.0)
const GATE2_OPEN_POS := Vector3(-0.5, 1.5, -16.85)
const GATE_CLOSED_ROT := PI
const GATE_OPEN_ROT := PI + PI / 2.0

# --- the orderlies ---------------------------------------------------------
# A: rectangle loop, clockwise. Danger leg (-5,-2)->(-2,-2), heading +x, his
# forward vector straight down the causeway the player has to cross.
const WAYPOINTS_A: Array[Vector3] = [
	Vector3(-5, 0, -2),
	Vector3(-2, 0, -2),
	Vector3(-2, 0, -7),
	Vector3(-5, 0, -7),
]

# B: mirrored, further south. Danger leg (5,-9)->(2,-9), heading -x.
const WAYPOINTS_B: Array[Vector3] = [
	Vector3(2, 0, -9),
	Vector3(5, 0, -9),
	Vector3(5, 0, -14),
	Vector3(2, 0, -14),
]

var _main: Node = null

# The crate, as three nodes with three jobs. See the header.
var _crate_body: AnimatableBody3D = null   # transform == collider == truth
var _crate_shape: CollisionShape3D = null  # the identity every by-source test keys on
var _crate_visual: Node3D = null           # mesh + Interactable; the only thing that tweens

var _crate_x := REST_CELL.x
var _crate_z := REST_CELL.y

# Tween state. `_tween_offset` is where the visual sits RELATIVE to the body at
# t=0 — i.e. the cell it is sliding out of — and eases to zero.
var _tween_offset := Vector2.ZERO
var _tween_elapsed := 0.0
var _tweening := false

# The room's own handles on the plate rects: the same objects TriggerPoll polls
# for the player, fetched by id rather than by retyping the numbers.
var _plate1: TriggerVolume = null
var _plate2: TriggerVolume = null

var _gate1_open := false
var _gate2_open := false
# The re-assert guard. Never fires in a normal playthrough — nothing closes a
# gate here — but it is the only path that may write a gate collider back on,
# so the "never close onto a body" rule is enforced rather than asserted.
var _gate1_guard := DeferredGate.rect(GATE1_MIN_X, GATE1_MAX_X, GATE1_MIN_Z, GATE1_MAX_Z, 0.0)
var _gate2_guard := DeferredGate.rect(GATE2_MIN_X, GATE2_MAX_X, GATE2_MIN_Z, GATE2_MAX_Z, 0.0)

var _orderly_a: CharacterBody3D = null
var _orderly_b: CharacterBody3D = null
## This room's always-on geometry MINUS the crate, by identity. See the header.
var _orderly_collision: WardCollision = null

var _saw_unmed_toast := false
var _saw_push_fail_toast := false
var _saw_enter_z2 := false
var _saw_vestibule := false


func _ready() -> void:
	_crate_body = $Geometry/Crate
	_crate_shape = $Geometry/Crate/Shape
	_crate_visual = $Geometry/Crate/Visual
	# Put the crate where the code thinks it is even when the scene is
	# instantiated without a main (tools/shoot.gd, check_rooms.gd), so a
	# screenshot of the raw scene is never a lie about the rest cell.
	_crate_body.position = Vector3(REST_CELL.x, CRATE_HALF, REST_CELL.y)
	_crate_visual.position = Vector3.ZERO


func on_enter(main: Node) -> void:
	_main = main
	_plate1 = TriggerVolume.find_in(self, "plate1")
	_plate2 = TriggerVolume.find_in(self, "plate2")
	if _plate1 == null or _plate2 == null:
		push_error("room20: a plate trigger is missing — a gate can never open.")

	_saw_unmed_toast = false
	_saw_push_fail_toast = false
	_saw_enter_z2 = false
	_saw_vestibule = false

	_reassert_gates_shut()
	_reset_crate()

	for node in _all_interactables():
		node.availability = _is_available

	_build_orderly_collision()
	_spawn_orderlies()
	main.hud_objective("one crate. three jobs. no second one if you lose it.")


## Every Interactable under this room, wherever it hangs. The crate's own
## fixture rides inside its body (Geometry/Crate/Visual/crate), not under the
## Interactables node, so the shallow walk room 14 uses would miss it.
func _all_interactables() -> Array[Interactable]:
	var out: Array[Interactable] = []
	_collect_interactables(self, out)
	return out


func _collect_interactables(node: Node, out: Array[Interactable]) -> void:
	if node is Interactable:
		out.append(node as Interactable)
	for child in node.get_children():
		_collect_interactables(child, out)


# Both gate panels are scenery. They open for the crate's weight and for
# nothing else — walking up and pressing E on one must never be a route.
func _is_available(id: String) -> bool:
	return id != "gate1" and id != "gate2"


# --- the crate -------------------------------------------------------------

## THE SINGLE WRITER. Node transform and cached WardCollision.Box together, so
## what you can walk through and what a rebuild would re-derive can never
## disagree. Snaps: the visual lag is _crate_visual's problem, not the
## collider's.
func _set_crate_cell(x: float, z: float) -> void:
	_crate_x = x
	_crate_z = z
	if _crate_body != null:
		_crate_body.position = Vector3(x, CRATE_HALF, z)
	_sync_crate_box()


## Keep the cached AABB in step with the transform above, matched by `source`
## (the CollisionShape3D node) — the same by-identity discipline that keeps the
## orderlies off it, and stable across a rebuild_collision() because the node
## outlives the Box.
func _sync_crate_box() -> void:
	if _main == null or _main.collision == null:
		return
	for b in _main.collision.boxes:
		if b.source == _crate_shape:
			b.min_x = _crate_x - CRATE_HALF
			b.max_x = _crate_x + CRATE_HALF
			b.min_z = _crate_z - CRATE_HALF
			b.max_z = _crate_z + CRATE_HALF


## Snap the crate home with no tween — the catch re-rack ("they put everything
## back where it belongs"), which is a confiscation, not a push.
func _reset_crate() -> void:
	_tweening = false
	_tween_offset = Vector2.ZERO
	_tween_elapsed = 0.0
	if _crate_visual != null:
		_crate_visual.position = Vector3.ZERO
	_set_crate_cell(REST_CELL.x, REST_CELL.y)


func crate_cell() -> Vector2:
	return Vector2(_crate_x, _crate_z)


## Destination-cell overlap test. Any ACTIVE (state-filtered exactly like
## try_move, the crate's own collider excluded BY IDENTITY) room collider, or
## either orderly's body circle right now. Point-in-time only — a push is a
## discrete event, not a continuous physics query — and strict, matching
## try_move's comparisons.
##
## tools/test_room20.gd drives its exhaustive reachability search through THIS
## function rather than a second copy of the rule, so the proof and the
## shipping behaviour cannot drift.
func _push_blocked(dest_x: float, dest_z: float, state: int) -> bool:
	var min_x := dest_x - CRATE_HALF
	var max_x := dest_x + CRATE_HALF
	var min_z := dest_z - CRATE_HALF
	var max_z := dest_z + CRATE_HALF

	if _main != null and _main.collision != null:
		for b in _main.collision.boxes:
			if b.source == _crate_shape:
				continue
			if not b.active_in(state):
				continue
			if not b.active_on_level(WardLevels.FLAT_LEVEL_ID):
				continue
			if min_x < b.max_x and max_x > b.min_x and min_z < b.max_z and max_z > b.min_z:
				return true

	for o in [_orderly_a, _orderly_b]:
		if o == null:
			continue
		var p: Vector3 = o.global_position
		var dx := maxf(maxf(min_x - p.x, 0.0), p.x - max_x)
		var dz := maxf(maxf(min_z - p.z, 0.0), p.z - max_z)
		if sqrt(dx * dx + dz * dz) < Tuning.ORDERLY_RADIUS:
			return true

	return false


## One press, one cell. Direction is DERIVED, never aimed: the axis with the
## larger magnitude in the player->crate vector, continuing away from the
## player, which is what makes "walk into its face" the verb.
##
## Returns true if the crate actually moved.
func _try_push() -> bool:
	if _main == null or _main.player == null:
		return false

	var p: Vector3 = _main.player.global_position
	var dx := _crate_x - p.x
	var dz := _crate_z - p.z
	if sqrt(dx * dx + dz * dz) > PUSH_REACH_M:
		return false  # focused from too far to be at its face — silent no-op

	var step_x := 0.0
	var step_z := 0.0
	if absf(dx) >= absf(dz):
		step_x = signf(dx)
	else:
		step_z = signf(dz)
	if step_x == 0.0 and step_z == 0.0:
		return false  # degenerate: player exactly on the crate's centre

	var dest_x := _crate_x + step_x * CELL_M
	var dest_z := _crate_z + step_z * CELL_M
	if _push_blocked(dest_x, dest_z, StateManager.state):
		# Silent no-op with one teaching toast, matching try_move's
		# wall-bump convention — a toast per bump would be spam.
		if not _saw_push_fail_toast:
			_saw_push_fail_toast = true
			_toast("it doesn't go that way.")
		Telemetry.event("push_blocked")
		return false

	# The collider is at the destination from this instant. Only the drawing
	# lags, and only for PUSH_TWEEN_SEC.
	_tween_offset = Vector2(_crate_x - dest_x, _crate_z - dest_z)
	_tween_elapsed = 0.0
	_tweening = true
	_set_crate_cell(dest_x, dest_z)
	Telemetry.event("push")
	return true


func _tick_tween(delta: float) -> void:
	if not _tweening:
		return
	_tween_elapsed += delta
	var t := minf(1.0, _tween_elapsed / PUSH_TWEEN_SEC)
	# Ease-out: a crate shoved a metre decelerates into its cell rather than
	# arriving at full speed. Cosmetic; the collider stopped moving on frame 0.
	var e := 1.0 - (1.0 - t) * (1.0 - t)
	var k := 1.0 - e
	_crate_visual.position = Vector3(_tween_offset.x * k, 0.0, _tween_offset.y * k)
	if t >= 1.0:
		_tweening = false
		_crate_visual.position = Vector3.ZERO


# --- the gates -------------------------------------------------------------

func _gate_body(index: int) -> CollisionObject3D:
	var n := "Geometry/Gate1Collider" if index == 1 else "Geometry/Gate2Collider"
	return get_node_or_null(n) as CollisionObject3D


func _apply_gate(index: int, open: bool) -> void:
	var body := _gate_body(index)
	if body != null:
		# Layer 0 is the same "drop it from the query" trick main.unlock_door
		# uses. WardCollision._add_box skips anything off the solid mask.
		body.collision_layer = 0 if open else WardCollision.LAYER_WORLD_STATIC
	if _main == null:
		return
	_main.rebuild_collision()
	# rebuild_collision() re-derives every Box from the scene, including the
	# crate's — which is exactly why the body transform has to be authoritative.
	# Re-point the cached crate box at the cell the room believes in anyway, so
	# this stays correct even if that ever stops being true.
	_sync_crate_box()
	# The orderlies carry their own cache, built once; a gate they never saw
	# open would wall a chase off at the gap. Rebuild it too — minus the crate,
	# same as always.
	_build_orderly_collision()
	_retarget_orderlies()
	_main.move_interactable(
		"gate1" if index == 1 else "gate2",
		(GATE1_OPEN_POS if index == 1 else GATE2_OPEN_POS) if open
			else (GATE1_CLOSED_POS if index == 1 else GATE2_CLOSED_POS),
		GATE_OPEN_ROT if open else GATE_CLOSED_ROT)


## The latch. One-way, permanent: nothing in this room closes a gate once the
## crate has seated its plate — not the crate leaving the plate, not a catch.
func _open_gate(index: int) -> void:
	if index == 1:
		if _gate1_open:
			return
		_gate1_open = true
		_gate1_guard.cancel_close()
		_apply_gate(1, true)
		_toast("it opens for the weight, not for you.")
	else:
		if _gate2_open:
			return
		_gate2_open = true
		_gate2_guard.cancel_close()
		_apply_gate(2, true)
		_toast("it remembers this part. you taught it that, back at the start of everything.")
	Telemetry.event("gate_open", {"gate": index})


## The ONLY path that puts a gate collider back. Routed through DeferredGate so
## it can never freeze a body standing in the gap, even though on_enter can
## only run with the player at spawn. Not reachable in a normal playthrough;
## reachable by re-entering a live room instance, which is what tests do.
func _reassert_gates_shut() -> void:
	if _gate1_open:
		_gate1_guard.request_close()
	if _gate2_open:
		_gate2_guard.request_close()


func _close_gate(index: int) -> void:
	if index == 1:
		if not _gate1_open:
			return
		_gate1_open = false
		_apply_gate(1, false)
	else:
		if not _gate2_open:
			return
		_gate2_open = false
		_apply_gate(2, false)
	Telemetry.event("gate_close", {"gate": index})


func is_gate_open(index: int) -> bool:
	return _gate1_open if index == 1 else _gate2_open


## Every body a gate must not close onto, as DeferredGate (x, z, radius)
## triples. Exposed so the test harness can assert the same set the room ticks.
func _gate_bodies() -> Array:
	var out: Array = []
	if _main != null and _main.player != null:
		var p: Vector3 = _main.player.global_position
		out.append(DeferredGate.body(p.x, p.z, Tuning.PLAYER_RADIUS))
	for o in [_orderly_a, _orderly_b]:
		if o != null:
			var q: Vector3 = o.global_position
			out.append(DeferredGate.body(q.x, q.z, Tuning.ORDERLY_RADIUS))
	return out


# --- engine hooks ----------------------------------------------------------

func on_interact(id: String) -> bool:
	if id == "gate1" or id == "gate2":
		return true  # never directly interactable; _is_available already refuses focus
	if id != "crate":
		return false
	_try_push()
	return true


func on_state_change(next: StateManager.State) -> void:
	if _main == null:
		return
	if next == StateManager.State.UNMED and not _saw_unmed_toast:
		_saw_unmed_toast = true
		_toast("two of them work this floor. neither one stops for the crate.")


# Engine-fired, PLAYER ONLY, at the head of the physics tick.
#
# plate1/plate2 are in this list and are DELIBERATELY ignored: your weight is
# not the crate's weight in this room. The gates are opened from
# _physics_process against the crate's own position.
func on_trigger_enter(id: String) -> void:
	if _main == null:
		return
	if id == "enterZ2" and not _saw_enter_z2:
		_saw_enter_z2 = true
		_main.hud_objective(
			"the last stretch. bring the thing that doesn't need to be told to be brave.")
	elif id == "vestibule20" and not _saw_vestibule:
		_saw_vestibule = true
		_main.hud_objective("nothing left to carry. nothing left to push. just the door.")


func _physics_process(delta: float) -> void:
	if _main == null:
		return

	_tick_tween(delta)

	# THE PLATES, AGAINST THE CRATE. Same rect the engine polls for the player,
	# same strict point-in-rect containment, run here because the engine has
	# never known about crates — they are room-owned actors, like an orderly.
	if not _gate1_open and _plate1 != null \
			and _plate1.contains(_crate_x, _crate_z, StateManager.state):
		_open_gate(1)
	if not _gate2_open and _plate2 != null \
			and _plate2.contains(_crate_x, _crate_z, StateManager.state):
		_open_gate(2)

	# The re-assert, deferred while anything stands in the gap. See the header.
	if _gate1_guard.tick(delta, _gate_bodies()):
		_close_gate(1)
	if _gate2_guard.tick(delta, _gate_bodies()):
		_close_gate(2)

	_update_threat()


func on_leave() -> void:
	if _main != null:
		_main.set_threat(0.0, null)
	for o in [_orderly_a, _orderly_b]:
		if o != null:
			o.queue_free()
	_orderly_a = null
	_orderly_b = null


# --- the orderlies ---------------------------------------------------------

## Their collider set: this room's geometry MINUS the crate, by node identity.
## He must never collide with it — see the header.
func _build_orderly_collision() -> void:
	_orderly_collision = WardCollision.new()
	_orderly_collision.rebuild_from(self)
	for i in range(_orderly_collision.boxes.size() - 1, -1, -1):
		if _orderly_collision.boxes[i].source == _crate_shape:
			_orderly_collision.boxes.remove_at(i)


## Hand both orderlies the rebuilt cache after a gate opens. Cheap, and it
## keeps a chase from stopping dead at a gap that is standing open.
func _retarget_orderlies() -> void:
	for o in [_orderly_a, _orderly_b]:
		if o != null:
			o.collision_fallback = _orderly_collision


func _spawn_orderlies() -> void:
	_orderly_a = _spawn_one(_orderly_a, WAYPOINTS_A)
	_orderly_b = _spawn_one(_orderly_b, WAYPOINTS_B)
	_orderly_a.warned.connect(func() -> void: _on_warned("he is looking at you."))
	_orderly_b.warned.connect(func() -> void: _on_warned("the other one sees you too."))
	for o in [_orderly_a, _orderly_b]:
		o.chase_started.connect(_on_chase_started)
		o.caught.connect(_on_caught)


func _spawn_one(existing: CharacterBody3D, route: Array[Vector3]) -> CharacterBody3D:
	if existing != null:
		existing.queue_free()
	var o: CharacterBody3D = ORDERLY.instantiate()
	# Waypoints must be set before add_child: Orderly._ready() snaps him to
	# waypoints[0].
	o.waypoints = route.duplicate()
	add_child(o)
	o.setup(_main.player, _orderly_collision)
	return o


func _on_warned(text: String) -> void:
	_toast(text)
	Telemetry.event("orderly_spotted")


func _on_chase_started() -> void:
	_toast("run. or stop being visible.")
	Telemetry.event("orderly_chase")


# Telemetry FIRST: the event snapshots player position at emit time, so
# emitting after the teleport would record spawn for every catch and flatten
# the catch heat-map into a single dot.
#
# The crate re-racks to its rest cell; the gates DO NOT re-close. Defence in
# depth rather than necessity — the test proves no crate position is
# unrecoverable — but it is the "they put everything back where it belongs"
# beat, and it means a player who THINKS they have wedged themselves has an
# in-fiction way out instead of having to trust a design doc's proof.
#
# Safe by construction: the player is teleported to spawn (0,5) before the
# crate lands at (2,1), 4.1m away, so the re-rack can never snap a collider
# onto them.
func _on_caught() -> void:
	Telemetry.event("orderly_caught")
	StateManager.force_state(StateManager.State.LUCID, "catch")
	_main.shift_fx()
	_main.teleport_player(SPAWN_X, SPAWN_Z)
	_reset_crate()
	_toast("hands. a needle. and when you're back on your feet, it's already back on its shelf.")


## Chase-priority aggregation, same rule as every other two-orderly room:
## chasing beats watching, higher watch-ramp beats lower, nearer breaks ties.
func _update_threat() -> void:
	if _orderly_a == null or _orderly_b == null:
		return

	var level: float = maxf(_orderly_a.watching(), _orderly_b.watching())
	var chasing: bool = _orderly_a.is_chasing() or _orderly_b.is_chasing()
	if level <= 0.0 and not chasing:
		_main.set_threat(0.0, null)
		return

	var primary := _orderly_a
	if _orderly_b.is_chasing() and not _orderly_a.is_chasing():
		primary = _orderly_b
	elif _orderly_a.is_chasing() == _orderly_b.is_chasing():
		if _orderly_b.watching() > _orderly_a.watching():
			primary = _orderly_b
		elif _orderly_b.watching() == _orderly_a.watching() \
				and _orderly_b.distance_to_player() < _orderly_a.distance_to_player():
			primary = _orderly_b

	_main.set_threat(level, primary.bearing_from(_main.player.yaw))


func _toast(text: String) -> void:
	if _main != null:
		_main.hud_toast(text)
