# Room 11 — locks down the invariant its two orderlies actually depend on.
#
# WHY THIS EXISTS. room11.gd's header documents, correctly, that the UPPER
# orderly is NOT separated from the lower ward by distance: from his patrol at
# (2, 1.2) a point at (-3, 1.2) on the sunken floor is 5m away, well inside his
# 6m sight range. The Three.js source claims the two "happen to live on
# different XZ footprints", and that claim is false in XZ.
#
# What actually separates them is the WEST RAILING. Every collider in this game
# is full-height in Y, and Orderly._occluded() casts a real RayCast3D from the
# orderly's eye to the player's — so the rail, authored as a knee-high visual,
# blocks line of sight as a full-height wall.
#
# That works. But it is load-bearing and invisible: nothing in the room says
# "this railing is a sight blocker", and lowering or thinning its COLLIDER
# would silently hand the upper orderly the entire lower ward while every
# existing check still passed. Room 11 is Tier 1 verticality — a single level —
# so the categorical cross-level gate that protects room 17 does NOT apply here.
#
# This test converts that prose into an assertion. If someone "tidies" the rail
# colliders, this goes red instead of the game going quietly wrong.
extends Node

const MEZZ_Y := 0.9
const ORDERLY_EYE := 1.5          # Orderly._occluded(): global_position + 1.5
const PLAYER_EYE := 1.62          # Tuning.PLAYER_EYE_HEIGHT

var _checks := 0
var _fails := 0
var _room: Node3D = null
var _ray: RayCast3D = null


func _check(ok: bool, msg: String) -> void:
	_checks += 1
	if not ok:
		_fails += 1
		print("  FAIL  %s" % msg)


## True when the segment from an upper-orderly eye to a lower-ward eye is
## blocked by world geometry — i.e. exactly what Orderly._occluded() computes.
func _blocked(from_xz: Vector2, to_xz: Vector2) -> bool:
	var eye := Vector3(from_xz.x, MEZZ_Y + ORDERLY_EYE, from_xz.y)
	var target := Vector3(to_xz.x, PLAYER_EYE, to_xz.y)
	_ray.global_position = eye
	_ray.target_position = _ray.to_local(target)
	_ray.force_raycast_update()
	return _ray.is_colliding()


func _ready() -> void:
	_room = (load("res://rooms/room11/room11.tscn") as PackedScene).instantiate()
	add_child(_room)
	_ray = RayCast3D.new()
	_ray.collision_mask = 2          # world_static, same as OcclusionRay
	_ray.collide_with_areas = false
	add_child(_ray)
	await get_tree().physics_frame
	await get_tree().physics_frame

	# 1. The premise: distance does NOT separate them. If this ever stops being
	#    true the room got safer, but the reasoning below would be stale — so
	#    assert the premise rather than assuming it.
	var near_pairs := [
		[Vector2(2, 1.2), Vector2(-3, 1.2)],
		[Vector2(2, 4.0), Vector2(-2, 4.0)],
		[Vector2(2, 6.8), Vector2(-2, 6.0)],
	]
	for pair in near_pairs:
		var d: float = (pair[0] as Vector2).distance_to(pair[1] as Vector2)
		_check(d < Tuning.ORDERLY_SIGHT_RANGE,
			"premise: upper patrol %s to lower ward %s is %.2fm, expected inside sight range %.2fm"
				% [pair[0], pair[1], d, Tuning.ORDERLY_SIGHT_RANGE])

	# 2. The invariant: every one of those lines is nonetheless blocked.
	for pair in near_pairs:
		_check(_blocked(pair[0], pair[1]),
			"UPPER at %s must NOT see the lower ward at %s — the west railing is "
			% [pair[0], pair[1]]
			+ "the only thing stopping it. Did a rail collider get lowered or thinned?")

	# 3. Control: the mechanism is occlusion, not a blanket "nothing is ever
	#    visible". A target ON the platform, same level, must be visible —
	#    otherwise this test would pass even with the rays broken.
	_check(not _blocked(Vector2(2, 1.2), Vector2(2, 6.0)),
		"control: UPPER must still see along its own platform, else this test "
		+ "proves nothing (a ray that always collides would pass check 2)")

	# 4. The rail colliders exist and are real StaticBody3Ds on world_static.
	for rail in ["RailWest", "RailNorth"]:
		var n := _room.get_node_or_null("Geometry/%s" % rail)
		_check(n != null and n is StaticBody3D,
			"%s must exist as a StaticBody3D — it is a sight blocker, not decoration" % rail)
		if n is StaticBody3D:
			_check(((n as StaticBody3D).collision_layer & 2) != 0,
				"%s must sit on world_static (layer 2) or it stops occluding" % rail)

	print("test_room11: %d assertion(s)" % _checks)
	if _fails == 0:
		print("  OK - room 11's orderly separation is held by the rail colliders")
	else:
		print("  %d failure(s)" % _fails)
	get_tree().quit(1 if _fails > 0 else 0)
