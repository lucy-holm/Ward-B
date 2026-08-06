# The Orderly.
#
# Exists only in UNMEDICATED reality. Patrols a fixed waypoint loop; watching
# you long enough starts a chase; contact restrains you. Shifting LUCID is
# absolute immunity — he cannot see you, cannot catch you, and an in-progress
# chase aborts instantly.
#
# PORTED EXACTLY (do not "improve" these — they are the design):
#  * The chase has NO exit condition other than the player shifting lucid or
#    a catch landing. No lost-sight timer, no leash, no give-up. Sight is not
#    even evaluated during a chase. At 4.3 m/s vs the player's 3.4 he cannot
#    be outrun: spending the pill is the only answer. Adding conventional
#    stealth-AI memory here would gut the risk/reward core of the game.
#  * Contact catches in EVERY mode, including patrol and returning. Sneaking
#    up behind him still gets you caught.
#  * Sight is evaluated ONLY in patrol mode.
#  * His facing is the last direction he MOVED, and it persists while he is
#    paused at a waypoint — he keeps staring down the leg he just walked, and
#    the cone stays live. The head visually tracks the player once the ramp
#    is up, but detection uses the BODY vector. The head is a lie.
#
# DELIBERATE DEVIATION (agreed, see MIGRATION_NOTES): movement uses
# NavigationAgent3D rather than the original's straight-line step + AABB
# slide. The original could WEDGE permanently on a corner — a blocked orderly
# never re-paths and grinds forever, which is why kit.patrol() exists to
# validate 0.5 m clearance on every leg at authoring time. NavAgent removes
# that whole bug class. Cost: he now paths AROUND obstacles during a chase,
# where before he would beeline and scrape. Rooms 5/6/7 were tuned against
# the old behaviour and want a playtest pass.
extends CharacterBody3D

signal warned                ## ramp crossed warnAt — "he is looking at you"
signal chase_started
signal caught

enum Mode { PATROL, CHASE, RETURNING }

@export var waypoints: Array[Vector3] = []
@export var sight_range := Tuning.ORDERLY_SIGHT_RANGE
@export var cone_deg := Tuning.ORDERLY_CONE_DEG
@export var level := "__flat"

@onready var _nav: NavigationAgent3D = $NavigationAgent3D
@onready var _occlusion_ray: RayCast3D = $OcclusionRay
@onready var _body: Node3D = $Body

var mode: Mode = Mode.PATROL
var ramp := 0.0
var _warned := false
var _wp_index := 0
var _pause_left := 0.0
var _return_pause := 0.0

# Last direction he actually moved, in XZ. Drives the sight cone. Persists
# through waypoint pauses on purpose.
var facing := Vector2(0, 1)

var _player: Node3D = null
var collision_fallback: WardCollision = null


func _ready() -> void:
	collision_layer = WardCollision.LAYER_ORDERLY
	collision_mask = 0
	add_to_group("orderly")

	if not waypoints.is_empty():
		global_position = waypoints[0]

	_occlusion_ray.collision_mask = WardCollision.LAYER_WORLD_STATIC
	_occlusion_ray.collide_with_areas = false

	StateManager.state_changed.connect(_on_state_changed)
	_apply_visibility(StateManager.state)


func setup(player: Node3D, fallback: WardCollision) -> void:
	_player = player
	collision_fallback = fallback


## 0..1 watch ramp, pinned at 1 while chasing. Drives HUD threat + audio.
func watching() -> float:
	return 1.0 if mode == Mode.CHASE else ramp


func is_chasing() -> bool:
	return mode == Mode.CHASE


func _on_state_changed(next: StateManager.State, _prev: StateManager.State, _src: String) -> void:
	# Shifting lucid aborts an in-progress chase outright. This is the escape.
	if next == StateManager.State.LUCID and mode == Mode.CHASE:
		_begin_return()
	_apply_visibility(next)


func _apply_visibility(state: int) -> void:
	_body.visible = state == StateManager.State.UNMED


func _physics_process(delta: float) -> void:
	if _player == null:
		return

	# 1. move (sets `facing` when actually stepping)
	match mode:
		Mode.PATROL:
			_patrol_step(delta)
		Mode.CHASE:
			_chase_step(delta)
		Mode.RETURNING:
			_return_step(delta)

	# visual yaw only; the cone uses `facing` directly
	_body.rotation.y = atan2(-facing.x, -facing.y)

	# 2. CONTACT CATCH — every mode, not just chase.
	var to_player := _to_player()
	if _player_is_vulnerable() and to_player.length() < Tuning.ORDERLY_CATCH_RADIUS:
		_begin_return()
		caught.emit()
		return

	# 3. sight — patrol mode ONLY. During a chase he is effectively omniscient.
	if mode == Mode.PATROL:
		_update_sight(delta, to_player)


func _player_is_vulnerable() -> bool:
	# Lucid is checked independently here and in _update_sight, exactly as the
	# original did. A lucid player can walk straight through him.
	return not StateManager.is_lucid() and _player_level() == level


func _player_level() -> String:
	return _player.level if "level" in _player else "__flat"


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

	_move_toward(target, Tuning.ORDERLY_SPEED, delta)


func _chase_step(delta: float) -> void:
	_move_toward(_player.global_position, Tuning.ORDERLY_CHASE_SPEED, delta)


func _return_step(delta: float) -> void:
	if _return_pause > 0.0:
		_return_pause -= delta
		return

	# Nearest waypoint is recomputed every tick, so the target can switch
	# mid-walk — ported as-is.
	var idx := _nearest_waypoint()
	if idx < 0:
		return
	var target: Vector3 = waypoints[idx]
	if _flat_distance(target) < 0.08:
		_wp_index = idx
		mode = Mode.PATROL
		_pause_left = Tuning.ORDERLY_PAUSE_AT_WAYPOINT
		return

	_move_toward(target, Tuning.ORDERLY_SPEED, delta)


func _move_toward(target: Vector3, speed: float, delta: float) -> void:
	var step := speed * delta
	var dir: Vector2

	if _nav.is_navigation_finished() or _nav.target_position.distance_to(target) > 0.05:
		_nav.target_position = target

	var use_nav := NavigationServer3D.map_get_iteration_id(_nav.get_navigation_map()) != 0
	if use_nav and not _nav.is_navigation_finished():
		var next := _nav.get_next_path_position()
		dir = Vector2(next.x - global_position.x, next.z - global_position.z)
	else:
		dir = Vector2(target.x - global_position.x, target.z - global_position.z)

	var len := dir.length()
	if len < 0.0001:
		return
	dir /= len
	facing = dir

	var move := dir * minf(step, len)
	var from := Vector2(global_position.x, global_position.z)
	var to := from + move

	# Even with NavAgent driving direction, resolve the final step through
	# the same AABB routine the player uses, so he can never end up inside
	# geometry the navmesh smoothed over.
	if collision_fallback != null:
		to = collision_fallback.try_move(from, to, Tuning.ORDERLY_RADIUS, StateManager.State.UNMED)

	global_position.x = to.x
	global_position.z = to.y


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
	chase_started.emit()


func _begin_return() -> void:
	mode = Mode.RETURNING
	ramp = 0.0
	_warned = false
	_return_pause = Tuning.ORDERLY_ESCAPE_PAUSE_SEC


## Yaw-relative bearing to the player: 0 = dead ahead, positive = right.
## Used by the HUD's directional threat indicator.
func bearing_from(player_yaw: float) -> float:
	var d := _to_player()
	var fwd := -d.x * sin(player_yaw) - d.y * cos(player_yaw)
	var right := d.x * cos(player_yaw) - d.y * sin(player_yaw)
	return atan2(right, fwd)


func distance_to_player() -> float:
	return _to_player().length()
