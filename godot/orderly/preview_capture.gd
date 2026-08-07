# THROWAWAY verification harness — not part of the game. Spawns an Orderly
# in a small lit set, drives a dummy "player" through patrol / watched /
# chase, and dumps screenshots to godot/.artifacts/ so they can be inspected
# with the Read tool. Run windowed (NOT --headless, that skips rendering):
#
#   /Applications/Godot.app/Contents/MacOS/Godot --path . orderly/preview.tscn
#
# Beyond the single reference stills (rest/front/side/back/patrol/watching/
# chase), this also fires two BURSTS of consecutive frames ~90ms apart — one
# mid-patrol, one mid-chase — so the puppet gait's stop-motion judder can be
# read as a sequence, not guessed at from a single still. And a FarCamera
# shot at ~6m for the "does the pale uniform read in unmedicated dark"
# check — the Environment above already mirrors main.tscn's real ambient
# (0.13) and fog (0.08) settings, so this is a true dark-ward read, not a
# lit demo.
#
# Quits itself once the timeline finishes.
extends Node3D

const ORDERLY := preload("res://orderly/orderly.tscn")

const BURST_COUNT := 8
const BURST_INTERVAL := 0.09
const WALK_BURST_START := 1.0
const CHASE_BURST_START := 3.7

@onready var _camera: Camera3D = $Camera3D
@onready var _front_camera: Camera3D = $FrontCamera
@onready var _side_camera: Camera3D = $SideCamera
@onready var _back_camera: Camera3D = $BackCamera
@onready var _far_camera: Camera3D = $FarCamera
@onready var _head_camera: Camera3D = $HeadCamera

var _orderly: CharacterBody3D
var _dummy_player: Node3D
var _t := 0.0
var _shots_taken: Dictionary = {}
var _chase_freeze_done := false


func _ready() -> void:
	DirAccess.make_dir_recursive_absolute("res://.artifacts")

	# orderly.gd moves via NavigationAgent3D — without a baked NavigationRegion3D
	# it can never find a path (get_next_path_position() just returns its own
	# position forever) and would sit frozen for this whole harness. Real rooms
	# bake one; this throwaway scene needs its own flat one over the floor.
	_build_navigation()

	_dummy_player = Node3D.new()
	_dummy_player.name = "DummyPlayer"
	_dummy_player.add_to_group("player")
	# Start far outside sight range (6 m) so the first shots are pure patrol.
	_dummy_player.position = Vector3(0, 1.6, 20)
	add_child(_dummy_player)

	var waypoints: Array[Vector3] = [Vector3(0, 0, -2.5), Vector3(0, 0, 2.5)]
	_orderly = ORDERLY.instantiate()
	_orderly.waypoints = waypoints
	add_child(_orderly)
	_orderly.setup(_dummy_player, null)

	_camera.look_at(Vector3(0, 1.3, 0), Vector3.UP)
	_front_camera.look_at(Vector3(0, 1.3, 0), Vector3.UP)
	_side_camera.look_at(Vector3(0, 1.3, 0), Vector3.UP)
	_back_camera.look_at(Vector3(0, 1.3, 0), Vector3.UP)
	_far_camera.look_at(Vector3(0, 1.3, 0), Vector3.UP)
	_head_camera.look_at(Vector3(0, 2.55, 0), Vector3.UP)


func _build_navigation() -> void:
	var nav_mesh := NavigationMesh.new()
	var half := 7.0  # matches the 14x14 floor in preview.tscn
	nav_mesh.vertices = PackedVector3Array([
		Vector3(-half, 0, -half),
		Vector3(half, 0, -half),
		Vector3(half, 0, half),
		Vector3(-half, 0, half),
	])
	nav_mesh.add_polygon(PackedInt32Array([0, 1, 2, 3]))

	var region := NavigationRegion3D.new()
	region.navigation_mesh = nav_mesh
	add_child(region)


func _process(delta: float) -> void:
	_t += delta

	# Timeline: patrol -> step into the cone -> let the ramp fill -> chase.
	# He actually walks his patrol route now (see _build_navigation), so
	# "step into the cone" has to track his CURRENT position/facing rather
	# than a fixed world point, or he may have walked past it by t=2.5.
	if _t < 2.5:
		_dummy_player.position = Vector3(0, 1.6, 20)
	elif not _orderly.is_chasing():
		# Keep stepping into his cone from wherever he currently is, so he
		# doesn't have to already be near the origin when the ramp fills.
		var fwd: Vector2 = _orderly.facing
		var op: Vector3 = _orderly.global_position
		_dummy_player.position = Vector3(op.x + fwd.x * 2.0, 1.6, op.z + fwd.y * 2.0)
	elif not _chase_freeze_done:
		# The instant chase starts, plant the "player" well out along his
		# current facing (sight/range don't matter any more — chase doesn't
		# re-check them, see orderly.gd) and stop moving it. He closes at
		# 4.3 m/s; a stationary target only 2m out gets caught (and the
		# chase ends via contact-catch -> RETURNING) well inside one burst
		# window, so give him real runway to keep him mid-chase on camera.
		_chase_freeze_done = true
		var fwd: Vector2 = _orderly.facing
		var op: Vector3 = _orderly.global_position
		_dummy_player.position = Vector3(op.x + fwd.x * 8.0, 1.6, op.z + fwd.y * 8.0)

	# HeadCamera tracks his XZ (head height is constant on this flat floor)
	# so the close-up lands on him wherever patrol has taken him by the time
	# it fires, rather than a fixed world point he may have already left.
	if _t < 3.2:
		# His head droops sharply forward (HEAD_DROOP in orderly_visual.gd)
		# so the "face" surface points mostly DOWN-and-forward, not level —
		# a level portrait camera sees the crown/back, not the suggested
		# features. Read HeadGroup's actual world transform and aim along
		# its local -Z (face normal) instead of guessing an offset.
		var head_group: Node3D = _orderly.find_child("HeadGroup", true, false)
		var gt: Transform3D = head_group.global_transform
		var face_dir: Vector3 = -gt.basis.z.normalized()
		var head_pos: Vector3 = gt.origin
		_head_camera.global_position = head_pos + face_dir * 0.6
		_head_camera.look_at(head_pos, Vector3.UP)

	# During/after chase, the main camera chases HIM — he covers real ground
	# at 4.3 m/s and the static corner framing used for the rest/patrol shots
	# would lose him in a couple of seconds.
	if _t >= 3.2:
		var op2: Vector3 = _orderly.global_position
		_camera.global_position = op2 + Vector3(2.0, 1.6, 2.0)
		_camera.look_at(op2 + Vector3(0, 1.3, 0), Vector3.UP)

	_maybe_shot("00_rest", 0.1)
	_maybe_shot_cam("00b_front_rest", 0.6, _front_camera)
	_maybe_shot_cam("00c_side_rest", 1.1, _side_camera)
	_maybe_shot_cam("00d_back_rest", 1.6, _back_camera)
	_maybe_shot("01_patrol", 2.0)
	_maybe_shot_cam("05_far_dark", 2.2, _far_camera)
	_maybe_shot_cam("06_head_close", 1.9, _head_camera)
	_maybe_shot("02_watching", 2.75)
	_maybe_shot("03_chase", 3.3)
	_maybe_shot("04_chase_close", 4.5)

	_burst_capture("walk", WALK_BURST_START)
	_burst_capture("chase", CHASE_BURST_START)

	if _t > 7.5:
		get_tree().quit()


func _maybe_shot(tag: String, at_time: float) -> void:
	if _t < at_time or _shots_taken.has(tag):
		return
	_shots_taken[tag] = true
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	img.save_png("res://.artifacts/orderly_%s.png" % tag)
	print("saved orderly_%s.png (watching=%.2f chasing=%s)" % [tag, _orderly.watching(), _orderly.is_chasing()])


func _maybe_shot_cam(tag: String, at_time: float, cam: Camera3D) -> void:
	if _t < at_time or _shots_taken.has(tag):
		return
	_shots_taken[tag] = true
	cam.current = true
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	img.save_png("res://.artifacts/orderly_%s.png" % tag)
	_camera.current = true
	print("saved orderly_%s.png" % tag)


# Fires BURST_COUNT shots spaced BURST_INTERVAL apart starting at start_at,
# tagged "<tag>_burst_00".."_burst_07", so the gait can be read as a
# flip-book instead of guessed at from a single still.
func _burst_capture(tag: String, start_at: float) -> void:
	for i in BURST_COUNT:
		var key := "%s_burst_%02d" % [tag, i]
		var at := start_at + i * BURST_INTERVAL
		if _t < at or _shots_taken.has(key):
			continue
		_shots_taken[key] = true
		await RenderingServer.frame_post_draw
		var img := get_viewport().get_texture().get_image()
		img.save_png("res://.artifacts/orderly_%s.png" % key)
		print("saved orderly_%s.png (t=%.3f watching=%.2f chasing=%s)" % [key, _t, _orderly.watching(), _orderly.is_chasing()])
