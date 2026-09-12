# The Orderly.
#
# Exists only in UNMEDICATED reality. Patrols a fixed waypoint loop; watching
# you long enough starts a chase; contact restrains you. Shifting LUCID is
# absolute immunity — he cannot see you, cannot catch you, and an in-progress
# chase aborts instantly.
#
# PORTED EXACTLY (do not "improve" these — they are the design):
#  * The chase has NO lost-sight timer, leash or give-up. It ends when the
#    player shifts lucid, is caught, or crosses onto a different fixed level.
#    Sight is not evaluated during a chase. At 4.3 m/s vs the player's 3.4 he
#    cannot be outrun: spending the pill is the intended answer.
#  * Contact catches in EVERY mode, including patrol and returning. Sneaking
#    up behind him still gets you caught.
#  * Sight is evaluated in patrol and investigation modes only.
#  * His facing is the last direction he MOVED, and it persists while he is
#    paused at a waypoint — he keeps staring down the leg he just walked, and
#    the cone stays live. The head visually tracks the player once the ramp
#    is up, but detection uses the BODY vector. The head is a lie.
#
# DELIBERATE DEVIATION (agreed, see MIGRATION_NOTES): movement uses the bounded
# OrderlyPlanner visibility graph rather than the original's straight-line step + AABB
# slide. The old fallback could WEDGE permanently on a corner. Planner legs
# route around live AABBs without requiring a baked navmesh.
extends CharacterBody3D

signal warned                ## ramp crossed warnAt — "he is looking at you"
signal chase_started
signal caught
signal investigation_started
signal investigation_ended
signal pursuit_stalled
signal pursuit_recovered

enum Mode { PATROL, CHASE, RETURNING, INVESTIGATING }

## Authored noise is intentionally a small pressure layer. These limits live
## with the actor so room scripts only provide a target and source label.
const HEARING_RADIUS := 8.0
const NOISE_COOLDOWN_SEC := 2.5
const INVESTIGATION_SEARCH_SEC := 1.2
const INVESTIGATION_REPLAN_SEC := 0.25
const INVESTIGATION_TARGET_EPSILON := 0.8

@export var waypoints: Array[Vector3] = []
@export var sight_range := Tuning.ORDERLY_SIGHT_RANGE
@export var cone_deg := Tuning.ORDERLY_CONE_DEG

# Which stacked level he is fixed to, for his ENTIRE LIFETIME. He never calls
# WardLevels.resolve_level — only the player does. Two reasons this is the
# design and not a shortcut:
#
#  1. It formalizes the convention room 11 documents by hand ("keep each
#     orderly's reachable XZ footprint on one level") instead of relying on
#     careful authoring.
#  2. An orderly whose level could flip mid-patrol would make a patrol leg
#     crossing a stairwell footprint into a silent logic bug, and patrol
#     clearance validation does not know about stairwells. Fixed at
#     construction, the worst outcome of that authoring mistake is a
#     cosmetic float/sink (his height lookup stays pinned to his own level),
#     never a wrong-level catch.
#
# '__flat' matches every room without authored levels, where the player's
# level is also always '__flat' — see WardLevels.FLAT_LEVEL_ID. Kept as a
# literal rather than the constant so the inspector shows a plain default.
@export var level := "__flat"
@export var orderly_id := ""

@onready var _occlusion_ray: RayCast3D = $OcclusionRay
@onready var _body: Node3D = $Body
@onready var _footsteps: AudioStreamPlayer3D = $Footsteps

# Footsteps are THE lucid tell: his mesh is hidden while the player is
# medicated, so the only way to know where he is, is to hear him. They play
# regardless of ward state, on purpose.
#
# DEVIATION worth playtesting: the original attenuated by distance only, with
# no direction. AudioStreamPlayer3D also pans, so a lucid player now gets
# bearing as well as proximity. That is strictly more information than the
# Three.js build gave — it should feel better, but it makes tracking him
# while invisible easier. Flagged in MIGRATION_NOTES.
var _step_accum := 0.0
var _stepping := false

var mode: Mode = Mode.PATROL
var ramp := 0.0
var _warned := false
var _wp_index := 0
var _pause_left := 0.0
var _return_pause := 0.0
var _return_target_index := -1

var _planner: OrderlyPlanner = null
var _route: Array[Vector2] = []
var _route_index := 0
var _route_target := Vector2(INF, INF)
var _route_clock := 0.0
var _last_collision_revision := -1
var _route_attempted := false
var _route_blocked := false
var _pursuit_is_stalled := false

var _noise_cooldown := 0.0
var _investigation_target := Vector2.ZERO
var _investigation_source := ""
var _investigation_search_left := 0.0
var _investigation_return_index := -1

# Last direction he actually moved, in XZ. Drives the sight cone. Persists
# through waypoint pauses on purpose.
var facing := Vector2(0, 1)

var _player: Node3D = null
var collision_fallback: WardCollision = null

# Verticality — OPTIONAL height lookup, presentation only.
#
# Without it he stands at y=0 always, which is correct for every flat room
# and is what rooms 1-10 get. With it, his rendered Y follows his OWN level's
# floor height each tick, so he does not float over a raised zone or sink
# into a stairwell he chases the player into — the latter being the visible
# failure, since a stairwell reads as solid geometry and a knee-deep orderly
# climbing it looks broken.
#
# CRUCIALLY THIS CANNOT CHANGE HIS LEVEL. The lookup is always made with his
# own fixed `level`, and he never calls resolve_level. Because stairwells are
# checked first in floor_height_at and match if `level` equals EITHER of the
# stairwell's two ends, an orderly on 'ground' who chases onto a stairwell
# whose ground end is his does get the interpolated stair height — visually
# following the player up the steps — while remaining categorically a
# ground-level entity for sight, catch and collision.
var world_levels: WardLevels = null


func _ready() -> void:
	collision_layer = WardCollision.LAYER_ORDERLY
	collision_mask = 0
	add_to_group("orderly")
	if orderly_id.is_empty():
		orderly_id = name

	if not waypoints.is_empty():
		global_position = waypoints[0]

	_occlusion_ray.collision_mask = WardCollision.LAYER_WORLD_STATIC
	_occlusion_ray.collide_with_areas = false

	_footsteps.stream = WardAudio.footstep
	_footsteps.max_distance = 8.0  # matches the original's 1 - dist/8 falloff

	StateManager.state_changed.connect(_on_state_changed)
	_apply_visibility(StateManager.state)


## `levels` is optional and additive — rooms 1-10 call setup() with two
## arguments and are unaffected. A room with any verticality at all should
## pass `_main.levels` so he stands on his own floor rather than at y=0.
func setup(player: Node3D, fallback: WardCollision, levels: WardLevels = null) -> void:
	_player = player
	collision_fallback = fallback
	world_levels = levels
	_planner = OrderlyPlanner.new()
	_planner.set_context(collision_fallback, level, Tuning.ORDERLY_RADIUS,
			StateManager.State.UNMED, world_levels)
	_route_attempted = false
	_route_blocked = false
	_last_collision_revision = -1
	_apply_floor_height()


## 0..1 watch ramp, pinned at 1 while chasing. Drives HUD threat + audio.
func watching() -> float:
	return 1.0 if mode == Mode.CHASE else ramp


func is_chasing() -> bool:
	return mode == Mode.CHASE


func is_investigating() -> bool:
	return mode == Mode.INVESTIGATING


## Hear one authored room event. A chase is never overridden, and repeated
## events are ignored during the cooldown. Returning orderlies may investigate
## once their current return is interrupted; the return target is restored when
## the search ends.
func hear_noise(position: Vector3, source_level: String, source: String) -> bool:
	if _player == null or _planner == null:
		return false
	if mode == Mode.CHASE or mode == Mode.INVESTIGATING:
		return false
	if _noise_cooldown > 0.0 or source_level != level:
		return false
	var target := Vector2(position.x, position.z)
	var here := Vector2(global_position.x, global_position.z)
	if here.distance_to(target) > HEARING_RADIUS:
		return false
	var route := _planner.plan(here, target)
	if route.is_empty() and here.distance_to(target) > 0.08:
		return false
	_investigation_target = target
	_investigation_source = source.left(32)
	_investigation_search_left = 0.0
	_investigation_return_index = _return_target_index if mode == Mode.RETURNING else -1
	_noise_cooldown = NOISE_COOLDOWN_SEC
	_route = route
	_route_index = 0
	_route_target = target
	_route_clock = 0.0
	_route_attempted = true
	mode = Mode.INVESTIGATING
	_emit_investigation_started()
	return true


func _on_state_changed(next: StateManager.State, _prev: StateManager.State, _src: String) -> void:
	# Shifting lucid aborts an in-progress chase outright. This is the escape.
	if next == StateManager.State.LUCID and (mode == Mode.CHASE or mode == Mode.INVESTIGATING):
		if mode == Mode.INVESTIGATING:
			_end_investigation("lucid")
		_begin_return("lucid")
	_apply_visibility(next)


func _apply_visibility(state: int) -> void:
	_body.visible = state == StateManager.State.UNMED


func _physics_process(delta: float) -> void:
	if _player == null:
		return
	# Reconcile live gates and moving props once for all orderlies sharing this
	# room cache. _move_toward compares the resulting revision before deciding
	# whether its cached route remains valid.
	if collision_fallback != null:
		collision_fallback.sync_live_once_per_frame()
	_noise_cooldown = maxf(0.0, _noise_cooldown - delta)
	_route_clock += delta
	# A fixed-level orderly must never continue a chase after the player has
	# crossed a stairwell. This also catches an externally forced level change.
	if mode == Mode.CHASE and not _player_is_vulnerable():
		_begin_return("level_mismatch")

	# 1. move (sets `facing` when actually stepping)
	_stepping = false
	match mode:
		Mode.PATROL:
			_patrol_step(delta)
		Mode.CHASE:
			_chase_step(delta)
		Mode.RETURNING:
			_return_step(delta)
		Mode.INVESTIGATING:
			_investigation_step(delta)
	_tick_footsteps(delta)

	# visual yaw only; the cone uses `facing` directly
	_body.rotation.y = atan2(-facing.x, -facing.y)

	# 1b. rendered height — presentation only, no logic reads it. Applied
	# BEFORE the sight check below because _occluded() casts a real 3D ray
	# from his eye, and a stale Y would aim it from last tick's floor.
	_apply_floor_height()

	# 2. CONTACT CATCH — every mode, not just chase.
	var to_player := _to_player()
	if _player_is_vulnerable() and to_player.length() < Tuning.ORDERLY_CATCH_RADIUS:
		_begin_return()
		caught.emit()
		return

	# 3. sight — patrol mode ONLY. During a chase he is effectively omniscient.
	if mode == Mode.PATROL or mode == Mode.INVESTIGATING:
		_update_sight(delta, to_player)


## Snap his rendered Y to his own level's floor height. Never changes `level`
## — see the world_levels field header.
func _apply_floor_height() -> void:
	if world_levels == null:
		return
	global_position.y = world_levels.floor_height_at(level, global_position.x, global_position.z)


# THE HEADLINE PROPERTY OF STACKED FLOORS. Ported from orderly.ts's
# `playerState === 'unmed' && playerLevel === this.level`, and gating BOTH
# the contact catch and sight, exactly as the reference does.
#
# This is a PROOF, not a layout guarantee. An orderly constructed with
# level 'ground' can never transition to watching or chasing against a player
# on 'balcony', and can never catch them by touch either, regardless of XZ
# distance — because this runs before any distance, cone or occlusion math.
# Cross-level line of sight is not "unmodeled", it is categorically
# impossible, which is both the strongest available answer and cheaper than
# real 3D occlusion. Room 17 is built entirely on this: two orderlies patrol
# the same XZ rectangle at different heights and provably never perceive each
# other's target.
#
# The catch is gated too, not just sight: a player standing directly BELOW a
# chasing orderly (same XZ, one level down) must not be catchable by contact.
func _player_is_vulnerable() -> bool:
	# Lucid is checked independently here and in _update_sight, exactly as the
	# original did. A lucid player can walk straight through him.
	return not StateManager.is_lucid() and _player_level() == level


func _player_level() -> String:
	return WardLevels.level_of(_player)


func _to_player() -> Vector2:
	var p := _player.global_position
	var me := global_position
	return Vector2(p.x - me.x, p.z - me.z)


func _update_sight(delta: float, to_player: Vector2) -> void:
	var seen := false

	if _player_is_vulnerable():
		var dist := to_player.length()
		if dist > 0.001 and dist < sight_range:
			var dir := to_player / dist
			var dot := dir.dot(facing)
			# cone_deg is the TOTAL cone angle, so compare against the cosine
			# of the HALF angle: cos(deg * PI / 360).
			if dot > cos(cone_deg * PI / 360.0) and not _occluded():
				seen = true

	if seen:
		ramp = minf(1.0, ramp + delta / Tuning.ORDERLY_GRACE_SEC)
		if ramp >= Tuning.ORDERLY_WARN_AT and not _warned:
			_warned = true
			warned.emit()
		if ramp >= 1.0:
			_begin_chase()
	else:
		# Decay is a flat 1.5/s, independent of grace_sec: 0.6 s to be
		# spotted, 0.667 s to be forgotten.
		ramp = maxf(0.0, ramp - delta * 1.5)
		if ramp < Tuning.ORDERLY_WARN_AT:
			_warned = false


func _occluded() -> bool:
	# The original tested a zero-width segment between XZ centres against a
	# hand-authored occluder list. A RayCast3D against real wall geometry is
	# the native equivalent and is what the brief asked for; it is also more
	# honest, since it uses the actual shelving/island colliders.
	var eye := global_position + Vector3(0, 1.5, 0)
	var target := _player.global_position + Vector3(0, Tuning.PLAYER_EYE_HEIGHT, 0)
	_occlusion_ray.global_position = eye
	_occlusion_ray.target_position = _occlusion_ray.to_local(target)
	_occlusion_ray.force_raycast_update()
	return _occlusion_ray.is_colliding()


# --- movement --------------------------------------------------------------

func _patrol_step(delta: float) -> void:
	if waypoints.is_empty():
		return
	if _pause_left > 0.0:
		_pause_left -= delta
		return

	var target: Vector3 = waypoints[_wp_index]
	if _flat_distance(target) < 0.08:
		_wp_index = (_wp_index + 1) % waypoints.size()
		_pause_left = Tuning.ORDERLY_PAUSE_AT_WAYPOINT
		return

	_move_toward(target, Tuning.ORDERLY_SPEED, delta, false)


func _chase_step(delta: float) -> void:
	_move_toward(_player.global_position, Tuning.ORDERLY_CHASE_SPEED, delta, true)


func _return_step(delta: float) -> void:
	if _return_pause > 0.0:
		_return_pause -= delta
		return

	var idx := _return_target_index
	if idx < 0:
		return
	var target: Vector3 = waypoints[idx]
	if _flat_distance(target) < 0.08:
		_wp_index = idx
		mode = Mode.PATROL
		_pause_left = Tuning.ORDERLY_PAUSE_AT_WAYPOINT
		return

	_move_toward(target, Tuning.ORDERLY_SPEED, delta, false)


func _investigation_step(delta: float) -> void:
	if _flat_distance(Vector3(_investigation_target.x, global_position.y,
			_investigation_target.y)) < 0.08:
		_stepping = false
		_investigation_search_left += delta
		if _investigation_search_left >= INVESTIGATION_SEARCH_SEC:
			_end_investigation("search_complete")
		return
	_move_toward(Vector3(_investigation_target.x, global_position.y,
			_investigation_target.y), Tuning.ORDERLY_SPEED, delta, false)


func _move_toward(target: Vector3, speed: float, delta: float, pursuit: bool) -> void:
	var step := speed * delta
	var here := Vector2(global_position.x, global_position.z)
	var destination := Vector2(target.x, target.z)
	if collision_fallback == null:
		_route = [destination]
		_route_index = 0
		_route_target = destination
		_route_clock = 0.0
		_route_attempted = true
	if _planner == null:
		_planner = OrderlyPlanner.new(collision_fallback, level, Tuning.ORDERLY_RADIUS)
		_planner.world_levels = world_levels
	var revision_changed := collision_fallback != null and \
			collision_fallback.revision != _last_collision_revision
	var target_changed := _route_target.distance_to(destination) > \
			(INVESTIGATION_TARGET_EPSILON if pursuit else 0.05)
	# An empty route is a failed attempt, not a request to rebuild on every
	# physics tick. Retry failures on the same throttle as moving targets. A
	# live collider revision still invalidates a cached route immediately.
	var retry_interval := INVESTIGATION_REPLAN_SEC if pursuit else 0.35
	var retry_due := _route_clock >= retry_interval
	var route_exhausted := _route_attempted and not _route.is_empty() and \
		_route_index >= _route.size()
	var need_plan := collision_fallback != null and (not _route_attempted or \
		_route_blocked or (revision_changed and retry_due) or \
		(route_exhausted and retry_due) or \
		(target_changed and retry_due))
	if need_plan:
		_planner.set_context(collision_fallback, level, Tuning.ORDERLY_RADIUS,
				StateManager.State.UNMED, world_levels)
		_route = _planner.plan(here, destination)
		_route_index = 0
		_route_target = destination
		_route_clock = 0.0
		_route_attempted = true
		_route_blocked = false
		_last_collision_revision = _planner.last_revision
		if pursuit:
			_set_pursuit_stall(_route.is_empty(), _planner.last_reason)
	if _route.is_empty() or _route_index >= _route.size():
		return

	var next_point: Vector2 = _route[_route_index]
	if here.distance_to(next_point) < 0.08:
		_route_index += 1
		if _route_index >= _route.size():
			return
		next_point = _route[_route_index]
	var dir := next_point - here

	var len := dir.length()
	if len < 0.0001:
		return
	dir /= len
	facing = dir
	_stepping = true

	var move := dir * minf(step, len)
	var from := Vector2(global_position.x, global_position.z)
	var to := from + move

	# Resolve the final step through the same AABB routine the player uses, so a
	# moving collider cannot invalidate a route between planning ticks.
	if collision_fallback != null:
		# His own fixed level, never the player's — a railing tagged to the
		# balcony blocks the balcony patroller and not the one underneath.
		to = collision_fallback.try_move(
			from, to, Tuning.ORDERLY_RADIUS, StateManager.State.UNMED, level)
		# A route can become stale between its throttled revision checks. The
		# collision resolver prevents clipping; remember a rejected step so the
		# next physics tick invalidates the route immediately.
		if from.distance_to(to) + 0.0001 < from.distance_to(from + move):
			_route_blocked = true

	global_position.x = to.x
	global_position.z = to.y


# Steps only while he is actually walking — the cadence stops dead during a
# waypoint pause, which is a real tell if you are listening for it.
func _tick_footsteps(delta: float) -> void:
	if not _stepping:
		_step_accum = 0.0
		return
	# 0.62 s patrol; chasing is 1.8x faster (0.344 s).
	var interval := 0.62 / 1.8 if mode == Mode.CHASE else 0.62
	_step_accum += delta
	if _step_accum < interval:
		return
	_step_accum = 0.0
	if _footsteps.stream != null:
		_footsteps.play()


func _flat_distance(target: Vector3) -> float:
	return Vector2(target.x - global_position.x, target.z - global_position.z).length()


func _nearest_waypoint() -> int:
	var best := -1
	var best_d := INF
	for i in waypoints.size():
		var d := _flat_distance(waypoints[i])
		if d < best_d:
			best_d = d
			best = i
	return best


# --- transitions -----------------------------------------------------------

func _begin_chase() -> void:
	mode = Mode.CHASE
	ramp = 1.0
	_warned = false
	_route.clear()
	_route_index = 0
	_route_clock = 0.0
	_route_attempted = false
	_route_blocked = false
	_set_pursuit_stall(false, "")
	chase_started.emit()


func _begin_return(reason := "") -> void:
	mode = Mode.RETURNING
	ramp = 0.0
	_warned = false
	_return_pause = Tuning.ORDERLY_ESCAPE_PAUSE_SEC
	_return_target_index = _nearest_waypoint()
	_route.clear()
	_route_index = 0
	_route_clock = 0.0
	_route_attempted = false
	_route_blocked = false
	_set_pursuit_stall(false, reason)


func _end_investigation(reason: String) -> void:
	if mode != Mode.INVESTIGATING:
		return
	mode = Mode.RETURNING
	_investigation_search_left = 0.0
	var resume_index := _investigation_return_index
	_investigation_return_index = -1
	_route.clear()
	_route_index = 0
	_route_clock = 0.0
	_route_attempted = false
	_route_blocked = false
	investigation_ended.emit()
	Telemetry.event("investigation_ended", {
		"source": _bounded_source(_investigation_source),
		"reason": _bounded_source(reason),
		"orderly_id": _bounded_source(orderly_id),
	})
	_return_target_index = resume_index if resume_index >= 0 else _nearest_waypoint()


func _emit_investigation_started() -> void:
	investigation_started.emit()
	Telemetry.event("investigation_started", {
		"source": _bounded_source(_investigation_source),
		"reason": "noise",
		"orderly_id": _bounded_source(orderly_id),
	})


func _set_pursuit_stall(stalled: bool, reason: String) -> void:
	if stalled == _pursuit_is_stalled:
		return
	_pursuit_is_stalled = stalled
	if stalled:
		pursuit_stalled.emit()
		Telemetry.event("pursuit_stalled", {
			"source": "planner",
			"reason": _bounded_source(reason if not reason.is_empty() else "unreachable"),
			"orderly_id": _bounded_source(orderly_id),
		})
	else:
		pursuit_recovered.emit()
		Telemetry.event("pursuit_recovered", {
			"source": "planner",
			"reason": _bounded_source(reason if not reason.is_empty() else "route_available"),
			"orderly_id": _bounded_source(orderly_id),
		})


func _bounded_source(value: String) -> String:
	return value.left(32)


## Yaw-relative bearing to the player: 0 = dead ahead, positive = right.
## Used by the HUD's directional threat indicator.
func bearing_from(player_yaw: float) -> float:
	var d := _to_player()
	var fwd := -d.x * sin(player_yaw) - d.y * cos(player_yaw)
	var right := d.x * cos(player_yaw) - d.y * sin(player_yaw)
	return atan2(right, fwd)


func distance_to_player() -> float:
	return _to_player().length()
