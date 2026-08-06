# Walking into this Area3D completes the room and chains to `exit_to`.
#
# The original polled a point-in-AABB test against every exit rect each frame
# (main.ts:464-471). Godot's Area3D + body_entered is the native equivalent
# and is what the migration brief asked for. The player is a CharacterBody3D
# on layer 1, so this monitors layer 1.
#
# `to = "END"` finishes the build instead of loading another room.
class_name RoomExit
extends Area3D

@export var exit_to := ""

var _fired := false


func _ready() -> void:
	collision_layer = 0
	collision_mask = WardCollision.LAYER_PLAYER
	monitoring = true
	body_entered.connect(_on_body_entered)


func _on_body_entered(body: Node3D) -> void:
	if _fired:
		return
	if not body.is_in_group("player") and body.name != "Player":
		return
	_fired = true
	var main := get_tree().current_scene
	if main != null and main.has_method("complete_room"):
		main.complete_room(exit_to)
