# Screenshot fixture: room 15 with two of its three shape keys already taken.
#
#   godot --path . tools/shoot.tscn -- res://tools/shot_room15_progress.tscn \
#         r15_door_after 0.5 1.62 -23.5 0.9 2.2 -26.9 0.006 unmed
#
# tools/shoot.gd instantiates a scene and shoots it; a room scene alone is
# always in its opening state, because the progress panel is only ever lit by
# the room script reacting to a pickup and no main.gd exists in a shoot run.
# This wrapper stands in for that: it loads room 15, lights the first two panel
# cells through the SAME public call the room script uses (IconPanel.set_lit)
# and frees the two collected props, so the "after" shot differs from the
# "before" one in exactly the ways a real pickup would.
#
# It is a test fixture, not a room: nothing loads it at runtime.
extends Node3D

const ROOM := preload("res://rooms/room15/room15.tscn")

## Which cells to light — parallel to the panel's shapes.
@export var lit: Array[bool] = [true, true, false]
## Props to remove, matching `lit`.
@export var taken: PackedStringArray = ["shapeKeyA", "shapeKeyB"]


func _ready() -> void:
	var room: Node3D = ROOM.instantiate()
	add_child(room)

	var panel := room.get_node_or_null("IconPanels/doorIcons15") as IconPanel
	if panel != null:
		panel.set_lit(lit)

	for id in taken:
		var node := _find(room, id)
		if node != null:
			node.get_parent().remove_child(node)
			node.queue_free()


func _find(node: Node, id: String) -> Node:
	if node is Interactable and (node as Interactable).interactable_id == id:
		return node
	for child in node.get_children():
		var found := _find(child, id)
		if found != null:
			return found
	return null
