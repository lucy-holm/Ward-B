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
# Every local-space shape built below (face features, seams, sight cone)
# points/faces toward -Z.
#
# SILHOUETTE (matches the character-sheet reference): faceless-but-uncanny —
# a small, gaunt, waxy-skinned head with only SUGGESTED features (sunken
# closed sockets, a faint nose ridge, a closed mouth line, hollow temples,
# a cranial suture) drooping forward on a long neck, slumped narrow rounded
# shoulders, limp arms with long splayed fingers reaching mid-thigh, long
# straight legs, worn shoes. Dirty bone-white institutional uniform with
# grime concentrated at hems/cuffs/knees, clean at the shoulders. NO
# emissive eyes anywhere — the read at distance is the pale uniform (+ a
# fresnel rim, never a glow) against the dark ward, not a light source.
# All of that lives in orderly_body.gdshader; this file just places geometry
# and feeds it per-instance shader params.
#
# GAIT: "a puppet operated too fast by something that has never watched a
# person walk" — deliberately NOT a smooth sine-driven cycle. See the block
# comment above _puppet_wave for the technique breakdown.
#
# MUST KEEP: the animation clock (`_anim_clock`) advances ONLY while the
# parent has actually moved this physics tick (position-delta test, since
# orderly.gd doesn't expose a stepping flag — see its "DO NOT EDIT" header).
# That is the whole "operated, not alive" read: he freezes mid-stride the
# instant he stops at a waypoint, never eases into stillness. The burst
# mechanism below (`_burst_rate`) only changes how FAST the clock advances
# while stepping — it never advances the clock while stopped, so the freeze
# guarantee is untouched.
extends Node3D

const BODY_SHADER := preload("res://orderly/orderly_body.gdshader")

# --- proportions ------------------------------------------------------------
# Pushed further than a naturalistic figure on purpose: very long straight
# legs, a small head relative to the body, narrow torso.
const LEG_W := 0.26
const LEG_H := 1.6
const LEG_D := 0.19
const TORSO_W := 0.34
const TORSO_H := 0.85
const TORSO_D := 0.20
const NECK_LEN := 0.17
const NECK_R := 0.05
const HEAD_R := 0.12
const HEAD_SCALE := Vector3(0.86, 1.28, 0.96)  # ovoid stretch, gaunt
const ARM_W := 0.075
const ARM_D := 0.075
const ARM_LEN := 1.48                          # hands reach ~mid-thigh
const HAND_LEN := 0.15
const FINGER_LEN := 0.09

const HEAD_DROOP := -0.85       # rad, forward pitch (negative = forward/down in
                                 # this nested local frame) — "neck can't hold it up"
const NECK_LEAN := -0.1         # rad, small forward lean baked into the neck itself
const HEAD_BASE_TILT := 0.09    # rad, lateral head-cock (rotation.z)
const HEAD_TILT_AMP := 0.03     # rad, slow oscillation on top of the cock
const HEAD_TILT_FREQ := 0.5     # rad/s, rides animClock (freezes when paused)
const HUNCH_TILT := 0.12        # rad, forward lean baked into torso

# --- gait: puppet, not person -----------------------------------------------
# "A puppet operated too fast by something that has never watched a person
# walk." Every technique here rides the SAME frozen _anim_clock:
#   1. Quantised time — _puppet_wave snaps the clock to a coarse frame grid
#      (GAIT_HZ) so poses jump between discrete positions instead of sliding.
#   2. Warped phase — within that grid, sin() is reshaped by an exponent < 1
#      (1/WHIP_POWER) so the pose HOLDS near the swing extremes and WHIPS
#      through the neutral middle, instead of easing smoothly like a sine.
#   3. Decoupled limbs — arms are quantised at a different frame rate AND a
#      different (non-integer-ratio) stride frequency than the legs, so the
#      two drift in and out of phase and never resolve into a clean
#      opposite-arm/leg cycle.
#   4. Bursts — a few times a minute (more while chasing), the clock's OWN
#      advance rate spikes 2.6x for ~0.2s then snaps back: "accelerated".
#   5. Overextension — swing amplitude is pushed past a plausible hip/
#      shoulder arc, more so while chasing.
#   6. Lag-and-snap — torso/head yaw trails a waypoint turn (accumulates a
#      "debt"), then catches up in one discrete jerk once the debt or a
#      hold timer crosses a threshold, rather than easing back into line.
const GAIT_HZ := 9.0             # leg quantisation, frames/sec, patrol
const ARM_HZ_MULT := 0.81        # arms quantised at a DIFFERENT rate — decouples them
const CHASE_HZ_MULT := 2.15      # legs+arms both scale up together on top of the above
const GAIT_FREQ := 0.95          # strides/sec BEFORE quantisation/warping
const ARM_FREQ_RATIO := 0.87     # non-integer ratio vs legs — phase never resolves
const ARM_PHASE_OFFSET := 0.35   # cycles; arms are not simply "opposite the legs"
const WHIP_POWER := 3.2          # >1 = hold at extremes, whip through the middle
# 0.68 rad was 39 deg PER LEG — 78 deg between them, which renders as a
# near-split and reads as a broken rig rather than an eerie one. A human walk
# is ~20-25 deg per leg. The wrongness should come from the judder and the
# arm/leg desync, not from limbs going somewhere anatomically impossible.
const LEG_SWING_AMP := 0.46      # rad — past a natural hip arc on purpose,
# 0.46 (26 deg) plus the 1.25x chase overextend and a 23 deg outward lift read
# as scarecrow arms held out sideways from a three-quarter angle — the axes are
# right, the magnitudes were not. Arms should hang and swing, not semaphore.
const ARM_SWING_AMP := 0.28      # but short of the legs visibly scissoring
const CHASE_OVEREXTEND := 1.25   # extra amplitude while chasing
const CHASE_ARM_LIFT := 0.12
const HITCH_AMP := 0.055
const TORSO_CHASE_PITCH := HUNCH_TILT * 2.1

const BURST_CHANCE := 0.22       # rolled ~once per stride, patrol
const BURST_CHANCE_CHASE := 0.45
const BURST_MULT := 2.6
const BURST_DURATION_SEC := 0.22

const LAG_SNAP_THRESHOLD := 0.35 # rad of accumulated debt before the jerk
const LAG_MAX_HOLD_SEC := 0.5    # or after this long, whichever comes first
const TORSO_LAG_FACTOR := 0.6
const HEAD_LAG_FACTOR := 0.85

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

# --- palette ------------------------------------------------------------
const UNIFORM_BASE := Color(0.80, 0.765, 0.68)   # bone-white / off-cream cloth
const UNIFORM_GRIME := Color(0.33, 0.22, 0.12)   # brown-ochre stain
const SKIN_BASE := Color(0.80, 0.75, 0.66)       # pale, waxy
const SKIN_GRIME := Color(0.34, 0.24, 0.15)
const SHOE_BASE := Color(0.46, 0.42, 0.36)
const SHOE_GRIME := Color(0.20, 0.14, 0.08)
const BADGE_BASE := Color(0.86, 0.85, 0.79)
const BUTTON_BASE := Color(0.42, 0.38, 0.30)

var _leg_pivots: Array[Node3D] = []
var _arm_pivots: Array[Node3D] = []
var _head_group: Node3D
var _neck_pivot: Node3D
var _torso: MeshInstance3D
var _cone_mat: StandardMaterial3D

var _anim_clock := 0.0
var _head_yaw := 0.0
var _idle_pause_timer := 0.0
var _next_idle_snap_at := IDLE_SNAP_MIN_SEC

var _burst_active := false
var _burst_ends_at := 0.0
var _next_burst_roll_at := 0.0

var _prev_body_yaw := 0.0
var _prev_yaw_valid := false
var _torso_yaw_debt := 0.0
var _lag_hold_timer := 0.0

var _prev_pos := Vector3.ZERO
var _prev_pos_valid := false
var _player: Node3D = null


func _ready() -> void:
	_next_idle_snap_at = IDLE_SNAP_MIN_SEC + randf() * IDLE_SNAP_RANGE_SEC
	_next_burst_roll_at = 1.0 / GAIT_FREQ
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

	var chasing: bool = orderly.is_chasing()

	# Clock only advances while stepping — see the header's MUST KEEP note.
	# The burst rate only changes HOW FAST it advances, never whether it does.
	if stepping:
		_anim_clock += delta * _burst_rate(chasing)

	var watch: float = orderly.watching()
	var body_yaw := rotation.y  # this node IS Body; orderly.gd set this already

	_update_lag_snap(delta, body_yaw, stepping)
	_update_head(delta, stepping, watch, body_yaw, orderly)
	_update_gait(delta, chasing)
	_update_cone(chasing, watch)


# --- body construction -------------------------------------------------------

func _make_material(base: Color, grime: Color, grime_amount: float, roughness: float,
		rim: float, seam: float, face: float, part_radius: float) -> ShaderMaterial:
	var mat := ShaderMaterial.new()
	mat.shader = BODY_SHADER
	mat.set_shader_parameter("base_color", base)
	mat.set_shader_parameter("grime_color", grime)
	mat.set_shader_parameter("grime_amount", grime_amount)
	mat.set_shader_parameter("grime_scale", 5.0)
	mat.set_shader_parameter("roughness_base", roughness)
	mat.set_shader_parameter("rim_strength", rim)
	mat.set_shader_parameter("seam_strength", seam)
	mat.set_shader_parameter("face_strength", face)
	mat.set_shader_parameter("part_radius", part_radius)
	return mat


func _build_body() -> void:
	var orderly := get_parent()

	var cloth_clean := _make_material(UNIFORM_BASE, UNIFORM_GRIME, 0.05, 0.86, 0.9, 0.0, 0.0, TORSO_W * 0.5)
	var cloth_body := _make_material(UNIFORM_BASE, UNIFORM_GRIME, 0.16, 0.86, 0.9, 1.0, 0.0, TORSO_W * 0.5)
	var cloth_hem := _make_material(UNIFORM_BASE, UNIFORM_GRIME, 0.55, 0.86, 0.9, 0.0, 0.0, TORSO_W * 0.5)
	var cloth_upper_arm := _make_material(UNIFORM_BASE, UNIFORM_GRIME, 0.10, 0.86, 0.85, 0.0, 0.0, ARM_W)
	var cloth_cuff := _make_material(UNIFORM_BASE, UNIFORM_GRIME, 0.5, 0.86, 0.85, 0.0, 0.0, ARM_W)
	var cloth_thigh := _make_material(UNIFORM_BASE, UNIFORM_GRIME, 0.20, 0.86, 0.85, 0.0, 0.0, LEG_W)
	var cloth_shin := _make_material(UNIFORM_BASE, UNIFORM_GRIME, 0.58, 0.86, 0.85, 0.0, 0.0, LEG_W)
	var skin_head := _make_material(SKIN_BASE, SKIN_GRIME, 0.04, 0.4, 0.55, 1.0, 1.0, HEAD_R)
	var skin_neck := _make_material(SKIN_BASE, SKIN_GRIME, 0.05, 0.4, 0.5, 1.0, 0.0, NECK_R)
	var skin_hand := _make_material(SKIN_BASE, SKIN_GRIME, 0.12, 0.42, 0.45, 0.0, 0.0, 0.05)
	var shoe_mat := _make_material(SHOE_BASE, SHOE_GRIME, 0.4, 0.7, 0.3, 0.0, 0.0, 0.1)
	var badge_mat := _make_material(BADGE_BASE, SKIN_GRIME, 0.03, 0.5, 0.2, 0.0, 0.0, 0.03)
	var button_mat := _make_material(BUTTON_BASE, SKIN_GRIME, 0.1, 0.55, 0.15, 0.0, 0.0, 0.02)

	# legs — hip-pivoted so the gait swing rotates from the joint
	var leg_offset_x := LEG_W * 0.42
	for side in [-1.0, 1.0]:
		var pivot := Node3D.new()
		pivot.position = Vector3(side * leg_offset_x, LEG_H, 0)
		var leg := _build_tapered_limb(LEG_W * 0.62, LEG_D * 0.95, LEG_W * 0.46, LEG_D * 0.7, LEG_H, cloth_thigh, cloth_shin)
		leg.position.y = -LEG_H * 0.5
		pivot.add_child(leg)
		pivot.add_child(_build_shoe(shoe_mat))
		add_child(pivot)
		_leg_pivots.append(pivot)

	# torso — narrow, slumped. Decorative trim (hem/collar/placket/pocket/
	# badge/belt/shoulder caps) is parented to it so it inherits the same
	# hunch/chase-pitch rotation automatically.
	_torso = MeshInstance3D.new()
	var torso_mesh := BoxMesh.new()
	torso_mesh.size = Vector3(TORSO_W, TORSO_H, TORSO_D)
	_torso.mesh = torso_mesh
	_torso.material_override = cloth_body
	_torso.position.y = LEG_H + TORSO_H * 0.5
	_torso.rotation.x = HUNCH_TILT
	add_child(_torso)
	_build_torso_trim(_torso, cloth_clean, cloth_hem, badge_mat, button_mat)

	# neck + head, chained off the top of the torso so both inherit its pitch
	_neck_pivot = Node3D.new()
	_neck_pivot.position = Vector3(0, TORSO_H * 0.5, 0)
	_neck_pivot.rotation.x = NECK_LEAN
	_torso.add_child(_neck_pivot)

	var neck := MeshInstance3D.new()
	var neck_mesh := CylinderMesh.new()
	neck_mesh.top_radius = NECK_R * 0.9
	neck_mesh.bottom_radius = NECK_R
	neck_mesh.height = NECK_LEN
	neck.mesh = neck_mesh
	neck.position.y = NECK_LEN * 0.5
	neck.material_override = skin_neck
	_neck_pivot.add_child(neck)

	var collar := MeshInstance3D.new()
	var collar_mesh := CylinderMesh.new()
	collar_mesh.top_radius = NECK_R * 1.35
	collar_mesh.bottom_radius = NECK_R * 1.35
	collar_mesh.height = 0.045
	collar.mesh = collar_mesh
	collar.position.y = 0.02
	collar.material_override = cloth_clean
	_neck_pivot.add_child(collar)

	_head_group = Node3D.new()
	_head_group.name = "HeadGroup"  # looked up by path from preview_capture.gd
	_head_group.position = Vector3(0, NECK_LEN + 0.02, 0)
	_neck_pivot.add_child(_head_group)

	var head := MeshInstance3D.new()
	var head_mesh := SphereMesh.new()
	head_mesh.radius = HEAD_R
	head_mesh.height = HEAD_R * 2.0
	head.mesh = head_mesh
	head.scale = HEAD_SCALE
	head.material_override = skin_head
	_head_group.add_child(head)

	# arms — shoulder-pivoted, hang past where knees would be, hands to
	# mid-thigh
	var shoulder_y := LEG_H + TORSO_H - 0.08
	var arm_x := TORSO_W * 0.5 + ARM_W * 0.5 + 0.02
	for side in [-1.0, 1.0]:
		var pivot := Node3D.new()
		pivot.position = Vector3(side * arm_x, shoulder_y, 0)
		pivot.rotation.x = HUNCH_TILT * 0.5
		var arm := _build_tapered_limb(ARM_W * 1.15, ARM_D * 1.15, ARM_W * 0.7, ARM_D * 0.7, ARM_LEN, cloth_upper_arm, cloth_cuff)
		arm.position.y = -ARM_LEN * 0.5
		pivot.add_child(arm)
		var hand := _build_hand(skin_hand)
		hand.position.y = -ARM_LEN
		pivot.add_child(hand)
		add_child(pivot)
		_arm_pivots.append(pivot)

	# sight cone — real gameplay affordance, not decoration
	var cone := _build_sight_cone(orderly.sight_range, orderly.cone_deg)
	add_child(cone)


# Two boxes stacked along Y (wider segment toward the joint, narrower toward
# the extremity) — cheap taper using only primitives. Returned group's local
# origin is the limb's vertical midpoint, so a caller hangs it from a pivot
# with `limb.position.y = -length / 2`. Top and bottom segments take separate
# materials so grime can be concentrated toward the extremity (cuff/knee)
# and kept clean toward the joint (shoulder/hip).
func _build_tapered_limb(top_w: float, top_d: float, bottom_w: float, bottom_d: float,
		length: float, top_mat: Material, bottom_mat: Material) -> Node3D:
	var grp := Node3D.new()
	var seg_len := length * 0.5

	var top := MeshInstance3D.new()
	var top_mesh := BoxMesh.new()
	top_mesh.size = Vector3(top_w, seg_len, top_d)
	top.mesh = top_mesh
	top.position.y = seg_len * 0.5
	top.material_override = top_mat
	grp.add_child(top)

	var bottom := MeshInstance3D.new()
	var bottom_mesh := BoxMesh.new()
	bottom_mesh.size = Vector3(bottom_w, seg_len, bottom_d)
	bottom.mesh = bottom_mesh
	bottom.position.y = -seg_len * 0.5
	bottom.material_override = bottom_mat
	grp.add_child(bottom)

	return grp


# Palm + four long, thin, slightly splayed fingers. Attached directly under
# an arm pivot at y = -ARM_LEN (the wrist), independent of the tapered-limb
# internals above.
func _build_hand(mat: Material) -> Node3D:
	var hand := Node3D.new()

	var palm := MeshInstance3D.new()
	var palm_mesh := BoxMesh.new()
	palm_mesh.size = Vector3(0.07, HAND_LEN, 0.03)
	palm.mesh = palm_mesh
	palm.position.y = -HAND_LEN * 0.5
	palm.material_override = mat
	hand.add_child(palm)

	var finger_count := 4
	for i in finger_count:
		var t := (float(i) / float(finger_count - 1)) - 0.5  # -0.5..0.5
		var finger := MeshInstance3D.new()
		var finger_mesh := BoxMesh.new()
		finger_mesh.size = Vector3(0.015, FINGER_LEN, 0.015)
		finger.mesh = finger_mesh
		finger.position = Vector3(t * 0.065, -HAND_LEN - FINGER_LEN * 0.42, 0.0)
		finger.rotation.z = t * 0.5    # slightly splayed
		finger.rotation.x = 0.12
		finger.material_override = mat
		hand.add_child(finger)

	return hand


# Worn shoe block. Attached directly under a leg pivot at y = -LEG_H (the
# foot), independent of the tapered-limb internals.
func _build_shoe(mat: Material) -> MeshInstance3D:
	var shoe := MeshInstance3D.new()
	var shoe_mesh := BoxMesh.new()
	shoe_mesh.size = Vector3(0.11, 0.08, 0.25)
	shoe.mesh = shoe_mesh
	shoe.position = Vector3(0.0, -0.04, -0.055)
	shoe.material_override = mat
	return shoe


# Richer uniform detail from the revised reference: mandarin collar (built in
# _build_body alongside the neck), button placket, chest pocket + hanging ID
# badge, rounded slumped shoulder caps, a dirty hem band, and a back
# half-belt with buttons. The back seam/centre-vent itself needs no extra
# geometry — it's the torso material's own seam_strength, which the shader
# confines to the +Z (rear) face.
func _build_torso_trim(torso: MeshInstance3D, cloth_clean: Material, cloth_hem: Material,
		badge_mat: Material, button_mat: Material) -> void:
	# hem band — dirtiest part of the tunic, bottom edge
	var hem := MeshInstance3D.new()
	var hem_mesh := BoxMesh.new()
	hem_mesh.size = Vector3(TORSO_W * 1.06, TORSO_H * 0.16, TORSO_D * 1.06)
	hem.mesh = hem_mesh
	hem.position = Vector3(0, -TORSO_H * 0.5 + TORSO_H * 0.08, 0)
	hem.material_override = cloth_hem
	torso.add_child(hem)

	# rounded, narrow, slumped shoulder caps
	for side in [-1.0, 1.0]:
		var cap := MeshInstance3D.new()
		var cap_mesh := SphereMesh.new()
		cap_mesh.radius = TORSO_W * 0.22
		cap_mesh.height = TORSO_W * 0.34
		cap.mesh = cap_mesh
		cap.position = Vector3(side * TORSO_W * 0.42, TORSO_H * 0.44, 0)
		cap.material_override = cloth_clean
		torso.add_child(cap)

	# front button placket
	var placket := MeshInstance3D.new()
	var placket_mesh := BoxMesh.new()
	placket_mesh.size = Vector3(0.028, TORSO_H * 0.92, 0.01)
	placket.mesh = placket_mesh
	placket.position = Vector3(0, 0, -(TORSO_D * 0.5 + 0.006))
	placket.material_override = cloth_clean
	torso.add_child(placket)

	var button_count := 5
	for i in button_count:
		var t := (float(i) / float(button_count - 1)) - 0.5
		var btn := MeshInstance3D.new()
		var btn_mesh := SphereMesh.new()
		btn_mesh.radius = 0.011
		btn_mesh.height = 0.022
		btn.mesh = btn_mesh
		btn.position = Vector3(0, t * TORSO_H * 0.8, -(TORSO_D * 0.5 + 0.014))
		btn.material_override = button_mat
		torso.add_child(btn)

	# chest pocket + hanging ID badge
	var pocket := MeshInstance3D.new()
	var pocket_mesh := BoxMesh.new()
	pocket_mesh.size = Vector3(0.08, 0.09, 0.01)
	pocket.mesh = pocket_mesh
	pocket.position = Vector3(TORSO_W * 0.24, TORSO_H * 0.16, -(TORSO_D * 0.5 + 0.006))
	pocket.material_override = cloth_clean
	torso.add_child(pocket)

	var badge := MeshInstance3D.new()
	var badge_mesh := BoxMesh.new()
	badge_mesh.size = Vector3(0.045, 0.06, 0.005)
	badge.mesh = badge_mesh
	badge.position = Vector3(TORSO_W * 0.24, TORSO_H * 0.16 - 0.07, -(TORSO_D * 0.5 + 0.01))
	badge.rotation.z = 0.16
	badge.material_override = badge_mat
	torso.add_child(badge)

	# back half-belt with buttons (front-of-back seam/vent is the shader's
	# own seam_strength on the main torso material)
	var belt := MeshInstance3D.new()
	var belt_mesh := BoxMesh.new()
	belt_mesh.size = Vector3(TORSO_W * 0.68, 0.045, 0.018)
	belt.mesh = belt_mesh
	belt.position = Vector3(0, -TORSO_H * 0.05, TORSO_D * 0.5 + 0.008)
	belt.material_override = cloth_clean
	torso.add_child(belt)

	for side in [-1.0, 1.0]:
		var bb := MeshInstance3D.new()
		var bb_mesh := SphereMesh.new()
		bb_mesh.radius = 0.011
		bb_mesh.height = 0.022
		bb.mesh = bb_mesh
		bb.position = Vector3(side * TORSO_W * 0.2, -TORSO_H * 0.05, TORSO_D * 0.5 + 0.02)
		bb.material_override = button_mat
		torso.add_child(bb)


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
	_head_group.rotation.x = HEAD_DROOP

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
		# Free head — restored once the watch-ramp has fully decayed. Also
		# rides the torso's lag-and-snap debt, so it isn't perfectly glued
		# to the body's yaw either.
		var target := _torso_yaw_debt * HEAD_LAG_FACTOR
		_head_yaw = lerp_angle(_head_yaw, target, clampf(delta * HEAD_RELAX_RATE, 0.0, 1.0))
	else:
		# Frozen at a waypoint: perfectly still except an occasional sharp
		# snap to a new angle once enough cumulative pause time has passed.
		_idle_pause_timer += delta
		if _idle_pause_timer >= _next_idle_snap_at:
			_head_yaw = randf_range(-IDLE_SNAP_ANGLE, IDLE_SNAP_ANGLE)
			_idle_pause_timer = 0.0
			_next_idle_snap_at = IDLE_SNAP_MIN_SEC + randf() * IDLE_SNAP_RANGE_SEC

	_head_group.rotation.y = _head_yaw


# Torso (and, via the read above, the head) trails a body-yaw change rather
# than turning with it, then snaps straight in one discrete jerk once the
# accumulated "debt" or a hold timer crosses a threshold. `body_yaw` is
# authoritative and already applied to this whole node by orderly.gd before
# this runs, so the debt is expressed as an OPPOSING local Y rotation on the
# torso (and head), not a delay on Body itself.
func _update_lag_snap(delta: float, body_yaw: float, stepping: bool) -> void:
	if not _prev_yaw_valid:
		_prev_body_yaw = body_yaw
		_prev_yaw_valid = true
	var dyaw := wrapf(body_yaw - _prev_body_yaw, -PI, PI)
	_prev_body_yaw = body_yaw

	if stepping:
		_torso_yaw_debt -= dyaw
		_lag_hold_timer += delta
		if absf(_torso_yaw_debt) > LAG_SNAP_THRESHOLD or _lag_hold_timer > LAG_MAX_HOLD_SEC:
			_torso_yaw_debt = 0.0  # the catch-up jerk: one frame, not an ease
			_lag_hold_timer = 0.0
	else:
		_torso_yaw_debt = 0.0
		_lag_hold_timer = 0.0

	_torso.rotation.y = _torso_yaw_debt * TORSO_LAG_FACTOR


# Rolls (roughly once per stride) whether a burst starts, and clears one that
# has run its course. Returns the clock-rate multiplier for THIS tick — 1.0
# normally, BURST_MULT for the ~0.2s a burst is active. Only ever called
# while stepping, so it never fights the freeze-on-stop guarantee.
func _burst_rate(chasing: bool) -> float:
	if _burst_active and _anim_clock >= _burst_ends_at:
		_burst_active = false

	if _anim_clock >= _next_burst_roll_at:
		var stride_period := 1.0 / (GAIT_FREQ * (CHASE_HZ_MULT if chasing else 1.0))
		_next_burst_roll_at = _anim_clock + stride_period
		if not _burst_active:
			var chance := BURST_CHANCE_CHASE if chasing else BURST_CHANCE
			if randf() < chance:
				_burst_active = true
				_burst_ends_at = _anim_clock + BURST_DURATION_SEC

	return BURST_MULT if _burst_active else 1.0


# The core puppet-motion primitive: quantises `clock` to a coarse frame grid
# (stop-motion judder), then reshapes the resulting sine so the pose holds
# near +-1 (the swing extremes) and whips through 0 (neutral) — a sharp
# power curve standing in for the smooth ease a real stride would have.
# Returns roughly -1..1; multiply by an amplitude constant to get radians.
func _puppet_wave(clock: float, quant_hz: float, stride_freq: float, phase: float) -> float:
	var q: float = floor(clock * quant_hz) / maxf(quant_hz, 0.001)
	var s: float = sin(TAU * (q * stride_freq + phase))
	return sign(s) * pow(absf(s), 1.0 / WHIP_POWER)


func _update_gait(delta: float, chasing: bool) -> void:
	var hz_mult := CHASE_HZ_MULT if chasing else 1.0
	var amp_mult := CHASE_OVEREXTEND if chasing else 1.0

	var leg_hz := GAIT_HZ * hz_mult
	var leg_freq := GAIT_FREQ * hz_mult
	var arm_hz := GAIT_HZ * ARM_HZ_MULT * hz_mult
	var arm_freq := GAIT_FREQ * ARM_FREQ_RATIO * hz_mult

	var leg0 := _puppet_wave(_anim_clock, leg_hz, leg_freq, 0.0)
	var leg1 := _puppet_wave(_anim_clock, leg_hz, leg_freq, 0.5)
	var arm0 := _puppet_wave(_anim_clock, arm_hz, arm_freq, ARM_PHASE_OFFSET)
	var arm1 := _puppet_wave(_anim_clock, arm_hz, arm_freq, ARM_PHASE_OFFSET + 0.5)

	_leg_pivots[0].rotation.x = leg0 * LEG_SWING_AMP * amp_mult
	_leg_pivots[1].rotation.x = leg1 * LEG_SWING_AMP * amp_mult

	_arm_pivots[0].rotation.x = HUNCH_TILT * 0.5 + arm0 * ARM_SWING_AMP * amp_mult
	_arm_pivots[1].rotation.x = HUNCH_TILT * 0.5 + arm1 * ARM_SWING_AMP * amp_mult

	var lift := CHASE_ARM_LIFT if chasing else 0.0
	_arm_pivots[0].rotation.z = -lift + arm0 * 0.06
	_arm_pivots[1].rotation.z = lift - arm1 * 0.06

	# Whole-body vertical hitch per footfall, derived from the same quantised
	# leg wave — deliberately NOT reset when he stops stepping; animClock
	# freezes mid-phase, so the hitch freezes too, same "operated" tell as
	# everything else here.
	position.y = absf(leg0) * HITCH_AMP

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
