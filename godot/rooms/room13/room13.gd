# ROOM 13 — the Last Ward.
#
# The epilogue, and the one room in the game where LUCID is not safe (see
# docs/superpowers/specs/2026-07-15-room13-lucid-danger-design.md). Everywhere
# else "lucid is always safe" (orderly.gd's header) is load-bearing; here, and
# only here, the corridor itself turns on the calm. While the player is lucid
# inside the squeeze stretch two full-height slabs drift inward and NEVER
# retract — every lucid dip costs width the attempt doesn't get back. Unmed
# halts them but hands the corridor to two orderlies. Neither state carries
# the whole crossing; that trade is the room.
#
# Three zones, south to north:
#   Z1 the entry hall      z [16, 22] — spawn, safe, deliberately NO
#                          dispenser: you cross with whatever you saved.
#   the squeeze stretch    z [-24, 16] — the moving slabs + both orderlies.
#   Z3 the exit vestibule  z [-30, -24] — safe, no lock, no code; the open
#                          doorway at z=-30 exits to room14.
#
# ---------------------------------------------------------------------------
# THE SLABS, AND WHY THIS IS NOT THE THREE.JS IMPLEMENTATION
# ---------------------------------------------------------------------------
#
# The TS build (src/rooms/room13.ts) carries two hand-mutated ColliderDefs, a
# pair of separately-managed THREE.Mesh slabs kept in lockstep with them, and
# a per-frame player penetration clamp. Here the slabs are two real
# AnimatableBody3D nodes authored by gen_rooms.py's mover() — one node each,
# mesh and collider welded together, so a single position write moves both and
# the "keep the visual in step with the collider" class of bug cannot happen.
# That is most of the TS code deleted rather than ported.
#
# WHAT DOES NOT PORT: "let the physics server push the player". It is the
# obvious Godot answer and it does not work in this project, for two
# independent reasons, neither of which is fixable from inside a room script:
#
#   1. The player is never in the physics solver. player.gd is a
#      CharacterBody3D with collision_mask = 0 that never calls
#      move_and_slide; its position is written directly from
#      WardCollision.try_move every physics tick (see core/collision.gd's
#      header for why that was a deliberate architectural call). A moving
#      body — animatable, kinematic or otherwise — can only depenetrate
#      something the solver is actually simulating. It would push nothing.
#
#   2. WardCollision is a CACHE. rebuild_from() reads every CollisionShape3D's
#      world-space AABB once at room load; try_move then queries that array,
#      not the physics server. A body whose transform changes is invisible to
#      the movement solver until its cached box is updated.
#
# So the room script owns both halves and writes them together in _set_gap():
# the node transform (what you see, and what a later rebuild_collision() would
# re-derive from) and the cached WardCollision.Box (what movement actually
# tests against). Node transform stays the source of truth, so if anything
# ever does call main.rebuild_collision() the cache self-heals to whatever the
# slabs currently are.
#
# AnimatableBody3D is still the right node type even with no solver
# involvement: StaticBody3D means "this never moves" by contract, and these
# move. sync_to_physics is off — see gen_rooms.py's mover() docstring.
#
# THE PUSH. Because the player IS in the movement solver's world (just not
# Godot's), a slab that advances over them has to carry them, and that is
# _push_player(). It is NOT the TS penetration clamp. The TS clamp runs
# unconditionally, every frame, in both states, and exists because tryMove
# freezes any body whose CURRENT position already overlaps an AABB — it is a
# recovery mechanism for a state the player should never have been in.
# _push_player only runs on the ticks a slab actually advanced, only moves the
# player inward, and only by at most the distance the slab itself moved that
# tick (CLOSE_PER_SIDE / 60 = 4mm). It is the slab displacing the player,
# which is what the design asked for.
#
# Godot's try_move has EXACTLY the same freeze-when-penetrating behaviour as
# the TS tryMove it was ported from (destination-only overlap test: once you
# are inside the inflated box, every nearby destination is also inside it, so
# both axes fail). That is why the push is invariant-critical rather than
# cosmetic, and why it clears the limit by PUSH_EPS instead of landing exactly
# on it — try_move's comparisons are strict, so a float landing a hair inside
# would freeze the player until the next tick, and if they shifted unmed on
# that tick the slabs would halt around them forever. See the soft-lock audit.
#
# ---------------------------------------------------------------------------
# SOFT-LOCK AUDIT (re-run for the pushing slabs, not inherited from the TS
# room — the crush geometry is not the same once the slab carries you)
# ---------------------------------------------------------------------------
#
# The invariant: at the end of every tick the player is at a position
# try_move accepts, in BOTH ward states.
#
#  * The slabs are on LAYER_WORLD_STATIC, solid in both states. There is not
#    one unmed-sealed collider in the room, so circle_hits_solid_unmed never
#    fires, the medication auto-revert can never be geometry-held, and a raw
#    player is never stranded by a state they didn't choose.
#  * Only _set_gap() moves a slab, and every _set_gap() that NARROWS is
#    immediately followed by _push_player(), which restores
#    |x| <= gap/2 - PLAYER_RADIUS - PUSH_EPS. Widening (_reset_attempt) cannot
#    penetrate anyone. So penetration cannot survive a tick boundary, which is
#    the only place a state change or a player move can observe it.
#  * The free channel is never empty: the crush fires at gap <= MIN_GAP = 1.0,
#    where the legal band is |x| <= 0.5 - 0.35 - 0.001 = 0.149m. It is small,
#    but it exists, and the tick it is reached the player is teleported out of
#    the stretch anyway.
#  * Push direction is always toward x = 0, i.e. away from the perimeter
#    walls at x = +-4 and away from the opposite slab. A push can never shove
#    the player into a second collider. The two slabs are symmetric about
#    x = 0 and the band is symmetric, so they cannot fight over the player.
#  * Entering the stretch with a gap already narrowed cannot embed anyone:
#    the slab box's z span is [-24, 16] and try_move inflates it by the player
#    radius, so the corridor mouth is guarded out to z = 16.35 — a player is
#    stopped at the slab's south face before p.z ever drops below 16 (which is
#    what in_stretch tests). The funnel from the 8m hall into the gap is just
#    ordinary sliding against that face.
#  * Both penalties land at MOUTH (0, 18), which is z > SQUEEZE_MAX_Z, so the
#    slabs hold instead of closing while the player reorients, and the attempt
#    resets to the full 5m gap. Both force LUCID (matching the shipped TS),
#    which is safe precisely because MOUTH is outside the stretch.
#  * dt is the fixed 60Hz physics tick, so there is no dt spike that could
#    close the gap by more than 4mm in one step and out-run the push.
#
# THE 0-PILL CASE: nothing here is unmed-sealed, so the exit is always
# walkable. With no pills, lucidity only ever arrives from a reset (both force
# LUCID at MOUTH with the walls full-width), so a 0-pill attempt is: lucid dash
# from the reset, free shift down to unmed when the walls' bite stops being
# worth it, walk the raw stretch under the orderlies, and if cornered the catch
# puts you back at the top of the same loop. Retries, not a wall.
#
# ---------------------------------------------------------------------------
# THE ORDERLIES
# ---------------------------------------------------------------------------
#
# Two, half a lap apart on the same rectangle (WAYPOINTS_B is WAYPOINTS_A
# rotated by 2 — half of a 4-waypoint cycle — and Orderly._ready() snaps him
# to waypoints[0], so the rotation IS the phase offset). Wherever a run starts
# from, one of them is roughly mid-stretch.
#
# They are given their OWN WardCollision, built from this room's subtree minus
# the two slabs, matching room13.ts:33-36's by-identity exclusion. This is not
# an optimisation. Orderly._move_toward resolves its final step through the
# same try_move, so a slab that closed over a patrol lane would freeze him
# inside it permanently, and nothing pushes HIM out — he has no equivalent of
# _push_player and shouldn't (being shoved around by the hazard would read as
# a second, buggier creature). Cosmetic consequence, accepted in the TS design
# discussion and unchanged here: below a ~3m gap the slabs pass his x = +-1.5
# lanes and his body can poke through them.
#
# Sight is widened to 9m / 80 degrees (TUNING.lastWard's overrides). The
# derivation is in src/tuning.ts and is not restated here; the short version is
# that at the base 6m/55 degrees a player hugging the far wall was PROVABLY
# never in cone and range at once, so unmed could walk the whole corridor.
#
# NOT PORTED: room13.ts gives orderly B an amber eyeTint so two patrols read as
# two creatures. The Godot orderly has no emissive eyes at all — a deliberate
# call in orderly_visual.gd — so there is no tint to set. They are told apart
# by their warn toasts and by the HUD threat bearing.
extends Node3D

const ORDERLY := preload("res://orderly/orderly.tscn")

# --- geometry (mirrors gen_rooms.py's room13()) ----------------------------
const SHELL_X := 4.0
const SQUEEZE_MIN_Z := -24.0
const SQUEEZE_MAX_Z := 16.0

# --- the closing walls (TUNING.lastWard) -----------------------------------
# Budget check, unchanged from the TS: (5.0 - 1.0) / (2 * 0.25) = 8s of total
# lucid per attempt, well under the ~12s a straight lucid walk of the 40m
# stretch takes at PLAYER_SPEED 3.4. "Shift once and coast" cannot clear it.
const START_GAP := 5.0
const MIN_GAP := 1.0                # player diameter 0.7 + 0.3 buffer
const CLOSE_PER_SIDE := 0.25        # m/s per side, 2x combined
const WARN_GAP := 3.5               # one-shot warning toast thresholds
const TIGHT_GAP := 2.0
# Constant slab thickness, sized for the WORST case: even at MIN_GAP the slab
# still reaches the perimeter wall, so it is only ever translated, never
# scaled (the TS build rescaled its slabs every frame; Godot warns about
# scaled collision shapes and an unscaled box keeps WardCollision's box
# exact). At wider gaps the outer half sits buried in and past the perimeter
# wall at x = +-4, which nothing inside the room can see.
#
# A THIN SLAB FLUSH WITH THE PERIMETER AT THE START WIDTH IS A BYPASS BUG, not
# a saving: it opens a walkable channel behind itself as it advances — the
# full length of the stretch, open to the entry hall at z = 16 — so a player
# could narrow the walls deliberately and then walk past the entire hazard.
# tools/test_room13.tscn's _test_entering_a_narrowed_stretch catches it.
# Must match gen_rooms.py's slab_thick.
const SLAB_THICK := SHELL_X - MIN_GAP / 2.0

# Clears the inflated-AABB edge by a hair. try_move's comparisons are strict,
# so landing exactly on gap/2 - radius is a coin flip on float rounding, and
# the losing side of that coin is a frozen player. 1mm is invisible.
const PUSH_EPS := 0.001

# --- the orderlies ---------------------------------------------------------
const SIGHT_RANGE := 9.0
const CONE_DEG := 80.0

# Attempt-reset teleport target: just south of the stretch, OUTSIDE it, so the
# slabs hold while the player reorients.
const MOUTH_X := 0.0
const MOUTH_Z := 18.0

# Rectangle loop, lanes at x = +-1.5. Starts at the south end of the east lane
# pointing north, straight at anyone entering from spawn; crosses at the north
# end, comes back down the west lane, crosses at the south end.
const WAYPOINTS_A: Array[Vector3] = [
	Vector3(1.5, 0, -22),
	Vector3(1.5, 0, 14),
	Vector3(-1.5, 0, 14),
	Vector3(-1.5, 0, -22),
]

# Same rectangle, same speed and pauses, rotated by 2 — the diagonally
# opposite corner, same circulation direction, so the pair stay exactly half a
# lap apart forever and never close on each other.
const WAYPOINTS_B: Array[Vector3] = [
	Vector3(-1.5, 0, 14),
	Vector3(-1.5, 0, -22),
	Vector3(1.5, 0, -22),
	Vector3(1.5, 0, 14),
]

var _main: Node = null

var _slab_e: AnimatableBody3D = null
var _slab_w: AnimatableBody3D = null
var _shape_e: CollisionShape3D = null
var _shape_w: CollisionShape3D = null

var _gap := START_GAP

var _orderly_a: CharacterBody3D = null
var _orderly_b: CharacterBody3D = null
# Always-on geometry MINUS the two slabs. See the header.
var _orderly_collision: WardCollision = null

var _saw_unmed_toast := false
var _saw_closing_toast := false
# 0 = none shown, 1 = warn shown, 2 = tight shown. Reset with the walls.
var _toast_stage := 0


func _ready() -> void:
	_slab_e = $Geometry/SlabEast
	_slab_w = $Geometry/SlabWest
	_shape_e = $Geometry/SlabEast/Shape
	_shape_w = $Geometry/SlabWest/Shape
	# Put the slabs where the code thinks they are even when the scene is
	# instantiated without a main (tools/shoot.gd, check_rooms.gd), so a
	# screenshot of the raw scene is never a lie about the start width.
	_move_slabs()


func on_enter(main: Node) -> void:
	_main = main
	_saw_unmed_toast = false
	_build_orderly_collision()
	_reset_attempt()
	_spawn_orderlies()

	# Arrive lucid — free, refills the meter, costs no pill — so the room
	# never tells the player which state survives the stretch. Same forced
	# entry as rooms 11/12, just the other state.
	StateManager.force_state(StateManager.State.LUCID, "room13_enter")
	main.shift_fx()
	main.hud_toast("you're calm. it decided that for you.")
	main.hud_objective(
		"the last ward. one corridor between you and out. "
		+ "neither state will carry you the whole way.")


func on_state_change(next: StateManager.State) -> void:
	if _main == null:
		return
	if next == StateManager.State.UNMED and not _saw_unmed_toast:
		_saw_unmed_toast = true
		_main.hud_toast("two of them keep it. they never rest at the same end.")


func _physics_process(delta: float) -> void:
	if _main == null or _main.player == null:
		return

	var p: Vector3 = _main.player.global_position
	var in_stretch := p.z > SQUEEZE_MIN_Z and p.z < SQUEEZE_MAX_Z

	# The hazard: lucid inside the stretch narrows the corridor. Unmed — or
	# standing outside the stretch — holds it exactly where it is. Never
	# retracts; only _reset_attempt() gives width back.
	if in_stretch and StateManager.is_lucid():
		if not _saw_closing_toast:
			_saw_closing_toast = true
			_main.hud_toast("the walls heard the calm. they're coming to meet it.")
			Telemetry.event("walls_closing")

		_set_gap(maxf(MIN_GAP, _gap - 2.0 * CLOSE_PER_SIDE * delta))
		_push_player()

		# Chained, most severe first, so one tick fires exactly one of these
		# instead of stacking toasts on the way to the crush.
		if _gap <= MIN_GAP:
			_crushed()
			return
		elif _toast_stage < 2 and _gap <= TIGHT_GAP:
			_toast_stage = 2
			_main.hud_toast("it will not fit you much longer.")
		elif _toast_stage < 1 and _gap <= WARN_GAP:
			_toast_stage = 1
			_main.hud_toast("narrower than it was. it remembers.")

	_update_threat()


# --- the walls -------------------------------------------------------------

## The single writer. Moves both bodies AND both cached collision boxes, so
## what you see and what you can walk through can never disagree.
func _set_gap(next_gap: float) -> void:
	_gap = next_gap
	_move_slabs()
	_sync_boxes()


func _move_slabs() -> void:
	# Inner faces land on +-gap/2; the body is a fixed-thickness box centred
	# half a thickness further out, so its outer half always overlaps (and at
	# wide gaps overshoots) the perimeter wall. Nothing behind it is ever
	# reachable — see SLAB_THICK.
	var centre := _gap * 0.5 + SLAB_THICK * 0.5
	_slab_e.position.x = centre
	_slab_w.position.x = -centre


## Keep WardCollision's cached AABBs in step with the transforms above.
## Matched by `source` (the CollisionShape3D node), which is the same
## by-identity discipline room13.ts uses to keep the orderly off them.
func _sync_boxes() -> void:
	if _main == null:
		return
	var half := _gap * 0.5
	for b in _main.collision.boxes:
		if b.source == _shape_e:
			b.min_x = half
			b.max_x = half + SLAB_THICK
		elif b.source == _shape_w:
			b.min_x = -(half + SLAB_THICK)
			b.max_x = -half


## A slab that advanced over the player carries them. Runs only on the ticks
## a slab actually moved, only inward, and only by at most the distance the
## slab moved. NOT the TS penetration clamp — see the header.
func _push_player() -> void:
	var limit := _gap * 0.5 - Tuning.PLAYER_RADIUS - PUSH_EPS
	var p: Vector3 = _main.player.global_position
	if p.x > limit:
		_main.teleport_player(limit, p.z)
	elif p.x < -limit:
		_main.teleport_player(-limit, p.z)


func _reset_attempt() -> void:
	_toast_stage = 0
	_saw_closing_toast = false
	_set_gap(START_GAP)


# --- penalties -------------------------------------------------------------
#
# Both restart the ATTEMPT — teleport to the mouth, walls back to full width,
# pills kept, matching the orderly-catch convention used everywhere else.
# Neither can dead-end it. Telemetry fires FIRST in both: the event snapshots
# player position at emit time, so emitting after the teleport would record
# the mouth for every single one and flatten the heat-map to a dot.

func _crushed() -> void:
	Telemetry.event("wall_crushed")
	StateManager.force_state(StateManager.State.LUCID, "crush")
	_main.shift_fx()
	_main.teleport_player(MOUTH_X, MOUTH_Z)
	_reset_attempt()
	_main.hud_toast("the corridor closes like a throat. it starts you over, calm.")


func _on_caught() -> void:
	Telemetry.event("orderly_caught")
	StateManager.force_state(StateManager.State.LUCID, "catch")
	_main.shift_fx()
	_main.teleport_player(MOUTH_X, MOUTH_Z)
	_reset_attempt()
	_main.hud_toast('hands. a needle. "there was never a safe way," he says.')


# --- the orderlies ---------------------------------------------------------

## Their collider set: this room's always-on geometry MINUS the two slabs, by
## node identity. See the header for why he must never collide with them.
func _build_orderly_collision() -> void:
	_orderly_collision = WardCollision.new()
	_orderly_collision.rebuild_from(self)
	for i in range(_orderly_collision.boxes.size() - 1, -1, -1):
		var src := _orderly_collision.boxes[i].source
		if src == _shape_e or src == _shape_w:
			_orderly_collision.boxes.remove_at(i)


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
	# waypoints[0]. Sight overrides go with them for symmetry.
	o.waypoints = route.duplicate()
	o.sight_range = SIGHT_RANGE
	o.cone_deg = CONE_DEG
	add_child(o)
	o.setup(_main.player, _orderly_collision)
	return o


func _on_warned(text: String) -> void:
	_main.hud_toast(text)
	Telemetry.event("orderly_spotted")


func _on_chase_started() -> void:
	_main.hud_toast("run. or stop being visible.")
	Telemetry.event("orderly_chase")


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


func on_leave() -> void:
	if _main != null:
		_main.set_threat(0.0, null)
	for o in [_orderly_a, _orderly_b]:
		if o != null:
			o.queue_free()
	_orderly_a = null
	_orderly_b = null
