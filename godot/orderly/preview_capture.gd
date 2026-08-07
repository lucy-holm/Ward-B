# THROWAWAY verification harness — not part of the game. Spawns an Orderly
# in a small lit set, drives a dummy "player" through patrol / watched /
# chase, and dumps screenshots to godot/.artifacts/ so they can be inspected
# with the Read tool. Run windowed (NOT --headless, that skips rendering):
#
#   /Applications/Godot.app/Contents/MacOS/Godot --path . orderly/preview.tscn
#
# Quits itself once the timeline finishes.
extends Node3D

const ORDERLY := preload("res://orderly/orderly.tscn")

@onready var _camera: Camera3D = $Camera3D
@onready var _front_camera: Camera3D = $FrontCamera
@onready var _side_camera: Camera3D = $SideCamera

var _orderly: CharacterBody3D
var _dummy_player: Node3D
var _t := 0.0
var _shots_taken: Dictionary = {}


func _ready() -> void:
	DirAccess.make_dir_recursive_absolute("res://.artifacts")

	_dummy_player = Node3D.new()
	_dummy_player.name = "DummyPlayer"
	_dummy_player.add_to_group("player")
	# Start far outside sight range (6 m) so the first shot is pure patrol.
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


func _process(delta: float) -> void:
	_t += delta

	# Timeline: patrol -> step into the cone -> let the ramp fill -> chase.
	if _t < 2.5:
		_dummy_player.position = Vector3(0, 1.6, 20)
	else:
		# Close enough (~2 m, inside the 6 m / 55 deg cone) and roughly in
		# front of wherever he's currently walking, so sight picks him up.
		_dummy_player.position = Vector3(1.2, 1.6, 0.0)

	_maybe_shot("00_rest", 0.1)
	_maybe_shot_cam("00b_front_rest", 0.6, _front_camera)
	_maybe_shot_cam("00c_side_rest", 1.1, _side_camera)
	_maybe_shot("01_patrol", 2.0)
	_maybe_shot("02_watching", 2.75)
	_maybe_shot("03_chase", 3.3)
	_maybe_shot("04_chase_close", 4.5)

	if _t > 5.0:
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
