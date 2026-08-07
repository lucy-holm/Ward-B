# The Orderly's body, gait, head-tracking and sight-cone — pure presentation.
#
# Attached to `Body` (a Node3D child of the Orderly CharacterBody3D, i.e.
# `self` in this script IS that Body node). Everything here READS the parent
# (`orderly.gd`) through its public interface (`watching()`, `is_chasing()`,
# `sight_range`/`cone_deg`, and this node's own `rotation.y`, which orderly.gd
# sets every physics frame to the body-facing yaw) and never writes any of
# orderly.gd's state. No detection/movement logic lives here — see
# orderly.gd's header for why that script is hands-off.
#
# COORDINATE NOTE: orderly.gd sets `rotation.y = atan2(-facing.x, -facing.y)`
# on this node. That is Godot's standard "aim local -Z at world direction d"
# formula, so this node's FORWARD is local -Z, exactly like the player rig.
# Every local-space shape built below (eyes, sight cone) points toward -Z.
#
# GAIT: rides a self-owned `_anim_clock` that only advances while the parent
# has actually moved this physics tick (position-delta test, since orderly.gd
# doesn't expose a stepping flag — see its "DO NOT EDIT" header). This is the
# whole "operated, not alive" read: freeze mid-stride the instant he stops,
# don't ease into stillness.
extends Node3D

# --- proportions (mirrors src/game/orderly.ts BODY + the design brief) -----
const LEG_W := 0.3
const LEG_H := 1.35
const LEG_D := 0.22
const TORSO_W := 0.4
const TORSO_H := 0.95
const TORSO_D := 0.24
const HEAD_S := 0.22
const ARM_W := 0.09
const ARM_D := 0.09
const ARM_LEN := 1.75

const HEAD_BASE_TILT := 0.11   # rad, permanent head-cock
const HEAD_TILT_AMP := 0.035   # rad, slow oscillation on top of the cock
const HEAD_TILT_FREQ := 0.5    # rad/s, rides animClock (freezes when paused)
const HUNCH_TILT := 0.1        # rad, forward lean baked into torso/arms/head

# Gait — deliberately wrong rather than naturalistic: slow, stiff marionette
# swing rather than a cycle scaled to ground speed.
const GAIT_FREQ := 1.8
const CHASE_GAIT_MULT := 2.0
const LEG_SWING_AMP := 0.55
const ARM_SWING_AMP := 0.24
const ARM_PHASE_LAG := 0.9
const CHASE_ARM_LIFT := 0.3
const HITCH_AMP := 0.03
const TORSO_CHASE_PITCH := HUNCH_TILT * 1.9
const HEAD_WATCH_TURN_RATE := 6.0   # 1/s
const HEAD_RELAX_RATE := 3.0        # 1/s
const IDLE_SNAP_MIN_SEC := 6.0
const IDLE_SNAP_RANGE_SEC := 4.0
const IDLE_SNAP_ANGLE := 1.3        # rad, half-range of the idle head snap

const SIGHT_CONE_Y := 0.02
const SIGHT_CONE_SEGMENTS := 20

# Per-tick displacement floor: patrol is 1.5 m/s / 60 Hz = 0.025 m, chase is
# 4.3 / 60 = 0.072 m. 0.0005 sits far below both and above float noise.
const STEP_EPSILON := 0.0005

var _leg_pivots: Array[Node3D] = []
var _arm_pivots: Array[Node3D] = []
var _head_group: Node3D
var _torso: MeshInstance3D
var _cone_mat: StandardMaterial3D

var _anim_clock := 0.0
var _head_yaw := 0.0
var _idle_pause_timer := 0.0
var _next_idle_snap_at := IDLE_SNAP_MIN_SEC

var _prev_pos := Vector3.ZERO
var _prev_pos_valid := false
var _player: Node3D = null


func _ready() -> void:
	_next_idle_snap_at = IDLE_SNAP_MIN_SEC + randf() * IDLE_SNAP_RANGE_SEC
	_build_body()


func _physics_process(delta: float) -> void:
	var orderly := get_parent()

	# Stepping = did he actually move this tick? orderly.gd's parent
	# _physics_process runs before this child's (children process after their
	# parent in the same frame), so `orderly.global_position` already
	# reflects this tick's move by the time we read it here.
	var cur: Vector3 = orderly.global_position
	if not _prev_pos_valid:
		_prev_pos = cur
		_prev_pos_valid = true
	var moved := Vector2(cur.x - _prev_pos.x, cur.z - _prev_pos.z).length()
	var stepping := moved > STEP_EPSILON
	_prev_pos = cur

	if stepping:
		_anim_clock += delta

	var chasing: bool = orderly.is_chasing()
	var watch: float = orderly.watching()
	var body_yaw := rotation.y  # this node IS Body; orderly.gd set this already

	_update_head(delta, stepping, watch, body_yaw, orderly)
	_update_gait(delta, chasing)
	_update_cone(chasing, watch)


# --- body construction -------------------------------------------------------

func _build_body() -> void:
	var orderly := get_parent()

	var skin := StandardMaterial3D.new()
	skin.albedo_color = Color(0.045, 0.045, 0.04)
	skin.roughness = 0.96
	skin.emission_enabled = true
	skin.emission = Color(0.11, 0.2, 0.09)   # faint sickly pale-green, barely there
	skin.emission_energy_multiplier = 0.12

	# legs — hip-pivoted so the gait swing rotates from the joint
	var leg_offset_x := LEG_W * 0.42
	for side in [-1.0, 1.0]:
		var pivot := Node3D.new()
		pivot.position = Vector3(side * leg_offset_x, LEG_H, 0)
		var leg := _build_tapered_limb(LEG_W * 0.62, LEG_D * 0.95, LEG_W * 0.46, LEG_D * 0.7, LEG_H, skin)
		leg.position.y = -LEG_H * 0.5
		pivot.add_child(leg)
		add_child(pivot)
		_leg_pivots.append(pivot)

	# torso
	var torso_mat := StandardMaterial3D.new()
	torso_mat.albedo_color = Color(0.08, 0.085, 0.075)
	torso_mat.roughness = 0.92
	torso_mat.emission_enabled = true
	torso_mat.emission = Color(0.11, 0.2, 0.09)
	torso_mat.emission_energy_multiplier = 0.07
	_torso = MeshInstance3D.new()
	var torso_mesh := BoxMesh.new()
	torso_mesh.size = Vector3(TORSO_W, TORSO_H, TORSO_D)
	_torso.mesh = torso_mesh
	_torso.material_override = torso_mat
	_torso.position.y = LEG_H + TORSO_H * 0.5
	_torso.rotation.x = HUNCH_TILT
	add_child(_torso)

	# arms — shoulder-pivoted, hang well past where knees would be
	var shoulder_y := LEG_H + TORSO_H - 0.08
	var arm_x := TORSO_W * 0.5 + ARM_W * 0.5 + 0.02
	for side in [-1.0, 1.0]:
		var pivot := Node3D.new()
		pivot.position = Vector3(side * arm_x, shoulder_y, 0)
		pivot.rotation.x = HUNCH_TILT * 0.5
		var arm := _build_tapered_limb(ARM_W * 1.15, ARM_D * 1.15, ARM_W * 0.7, ARM_D * 0.7, ARM_LEN, skin)
		arm.position.y = -ARM_LEN * 0.5
		pivot.add_child(arm)
		add_child(pivot)
		_arm_pivots.append(pivot)

	# head — permanent cock (rotation.z), carried slightly forward of the
	# hunched shoulders
	_head_group = Node3D.new()
	var head_y := LEG_H + TORSO_H + HEAD_S * 0.5 + 0.02
	_head_group.position = Vector3(0, head_y, -sin(HUNCH_TILT) * 0.12)
	_head_group.rotation.z = HEAD_BASE_TILT
	add_child(_head_group)

	var head := MeshInstance3D.new()
	var head_mesh := BoxMesh.new()
	head_mesh.size = Vector3(HEAD_S, HEAD_S, HEAD_S)
	head.mesh = head_mesh
	head.material_override = skin
	_head_group.add_child(head)

	# eyes — faint emissive strip on the front (-Z) face, tuned to read at
	# distance in the dark/fog where he's usually seen.
	var eye := MeshInstance3D.new()
	var eye_mesh := BoxMesh.new()
	eye_mesh.size = Vector3(HEAD_S * 0.82, 0.05, 0.03)
	eye.mesh = eye_mesh
	eye.position = Vector3(0, 0.01, -(HEAD_S * 0.5 + 0.006))
	var eye_mat := StandardMaterial3D.new()
	eye_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	eye_mat.albedo_color = Color(0.95, 0.55, 0.35)
	eye_mat.emission_enabled = true
	eye_mat.emission = Color(1.0, 0.5, 0.3)
	eye_mat.emission_energy_multiplier = 4.5
	eye.material_override = eye_mat
	_head_group.add_child(eye)

	# sight cone — real gameplay affordance, not decoration
	var cone := _build_sight_cone(orderly.sight_range, orderly.cone_deg)
	add_child(cone)


# Two boxes stacked along Y (wider segment toward the joint, narrower toward
# the extremity) — cheap taper using only primitives. Returned group's local
# origin is the limb's vertical midpoint, so a caller hangs it from a pivot
# with `limb.position.y = -length / 2`.
func _build_tapered_limb(top_w: float, top_d: float, bottom_w: float, bottom_d: float, length: float, mat: Material) -> Node3D:
	var grp := Node3D.new()
	var seg_len := length * 0.5

	var top := MeshInstance3D.new()
	var top_mesh := BoxMesh.new()
	top_mesh.size = Vector3(top_w, seg_len, top_d)
	top.mesh = top_mesh
	top.position.y = seg_len * 0.5
	top.material_override = mat
	grp.add_child(top)

	var bottom := MeshInstance3D.new()
	var bottom_mesh := BoxMesh.new()
	bottom_mesh.size = Vector3(bottom_w, seg_len, bottom_d)
	bottom.mesh = bottom_mesh
	bottom.position.y = -seg_len * 0.5
	bottom.material_override = mat
	grp.add_child(bottom)

	return grp


# Flat translucent sector on XZ (procedural ArrayMesh via SurfaceTool),
# apex at this node's origin, opening toward local -Z (forward — see the
# coordinate note at the top of this file). Built once; the tint/opacity is
# then driven every tick by _update_cone from the SAME material instance.
func _build_sight_cone(range_m: float, cone_deg: float) -> MeshInstance3D:
	var half_rad := deg_to_rad(cone_deg) * 0.5

	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var apex := Vector3(0, SIGHT_CONE_Y, 0)
	for i in SIGHT_CONE_SEGMENTS:
		var a0 := -half_rad + (2.0 * half_rad * i) / SIGHT_CONE_SEGMENTS
		var a1 := -half_rad + (2.0 * half_rad * (i + 1)) / SIGHT_CONE_SEGMENTS
		var p0 := Vector3(sin(a0) * range_m, SIGHT_CONE_Y, -cos(a0) * range_m)
		var p1 := Vector3(sin(a1) * range_m, SIGHT_CONE_Y, -cos(a1) * range_m)
		st.add_vertex(apex)
		st.add_vertex(p0)
		st.add_vertex(p1)

	var mi := MeshInstance3D.new()
	mi.name = "SightCone"
	mi.mesh = st.commit()

	_cone_mat = StandardMaterial3D.new()
	_cone_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_cone_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_cone_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	_cone_mat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	_cone_mat.albedo_color = Color(0.3, 0.05, 0.05, 0.08)
	mi.material_override = _cone_mat

	return mi


# --- per-frame presentation --------------------------------------------------

func _update_head(delta: float, stepping: bool, watch: float, body_yaw: float, orderly: Node) -> void:
	_head_group.rotation.z = HEAD_BASE_TILT + sin(_anim_clock * HEAD_TILT_FREQ) * HEAD_TILT_AMP

	if watch > 0.0:
		# Watching: head yaw-tracks the player independently of the body —
		# the body keeps walking its own patrol/chase direction, only the
		# head diverges from it. The single creepiest cheap trick available.
		var player := _find_player()
		if player != null:
			var dx: float = player.global_position.x - orderly.global_position.x
			var dz: float = player.global_position.z - orderly.global_position.z
			var dist := Vector2(dx, dz).length()
			if dist > 0.001:
				var world_yaw := atan2(-dx, -dz)
				var target := world_yaw - body_yaw
				_head_yaw = lerp_angle(_head_yaw, target, clampf(delta * HEAD_WATCH_TURN_RATE, 0.0, 1.0))
	elif stepping:
		# Free head — restored once the watch-ramp has fully decayed.
		_head_yaw = lerp_angle(_head_yaw, 0.0, clampf(delta * HEAD_RELAX_RATE, 0.0, 1.0))
	else:
		# Frozen at a waypoint: perfectly still except an occasional sharp
		# snap to a new angle once enough cumulative pause time has passed.
		_idle_pause_timer += delta
		if _idle_pause_timer >= _next_idle_snap_at:
			_head_yaw = randf_range(-IDLE_SNAP_ANGLE, IDLE_SNAP_ANGLE)
			_idle_pause_timer = 0.0
			_next_idle_snap_at = IDLE_SNAP_MIN_SEC + randf() * IDLE_SNAP_RANGE_SEC

	_head_group.rotation.y = _head_yaw


func _update_gait(delta: float, chasing: bool) -> void:
	var gait_mult := CHASE_GAIT_MULT if chasing else 1.0
	var phase := _anim_clock * GAIT_FREQ * gait_mult

	_leg_pivots[0].rotation.x = sin(phase) * LEG_SWING_AMP
	_leg_pivots[1].rotation.x = sin(phase + PI) * LEG_SWING_AMP

	_arm_pivots[0].rotation.x = HUNCH_TILT * 0.5 + sin(phase + PI - ARM_PHASE_LAG) * ARM_SWING_AMP
	_arm_pivots[1].rotation.x = HUNCH_TILT * 0.5 + sin(phase - ARM_PHASE_LAG) * ARM_SWING_AMP

	var lift := CHASE_ARM_LIFT if chasing else 0.0
	_arm_pivots[0].rotation.z = -lift
	_arm_pivots[1].rotation.z = lift

	# Whole-body vertical hitch per footfall. Deliberately NOT reset when he
	# stops stepping — animClock freezes mid-phase, so the hitch freezes too,
	# same "operated" tell as everything else here.
	position.y = absf(sin(phase)) * HITCH_AMP

	var torso_target := TORSO_CHASE_PITCH if chasing else HUNCH_TILT
	_torso.rotation.x = lerpf(_torso.rotation.x, torso_target, clampf(delta * 6.0, 0.0, 1.0))


func _update_cone(chasing: bool, watch: float) -> void:
	if chasing:
		_cone_mat.albedo_color = Color(1.0, 0.0627, 0.0627, 0.45)
	else:
		_cone_mat.albedo_color = Color(0.3 + 0.65 * watch, 0.05, 0.05, 0.08 + 0.32 * watch)


func _find_player() -> Node3D:
	if _player == null or not is_instance_valid(_player):
		_player = get_tree().get_first_node_in_group("player")
	return _player
