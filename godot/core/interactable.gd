# An interactable fixture: dispenser, pill cup, keypad, door, pickup.
#
# Area3D on the interactable layer, found by the player's camera RayCast3D.
# The original iterated every interactable each frame and ran a manual
# ray-mesh test (interaction.ts:18-39); here the physics engine does the
# broad phase and we only apply the gameplay filters.
#
# IMPORTANT (ported quirk): in three.js r168 an invisible mesh is still
# raycastable, so `def.states` — not visibility — was the real gate. Godot
# has the same property (visibility never affects collision), so the same
# explicit filters are kept rather than relying on the StateObject wrapper
# hiding the mesh.
class_name Interactable
extends Area3D

@export var interactable_id := ""
@export var interactable_type := ""
@export var label := ""

## Room scripts set this to gate a fixture by puzzle phase. Must be cheap and
## pure — it is consulted every frame the ray hits.
var availability: Callable = Callable()


func _ready() -> void:
	collision_layer = WardCollision.LAYER_INTERACTABLE
	collision_mask = 0
	monitoring = false
	monitorable = true


func is_focusable() -> bool:
	# A StateObject ancestor hides this fixture in the wrong reality, and a
	# LightObject ancestor hides it in the wrong LIGHT state (the second,
	# orthogonal axis — see core/light_object.gd). Mirror both into
	# focusability so you cannot interact with what you cannot see.
	#
	# Walks the whole ancestor chain rather than only get_parent(), because the
	# two wrappers NEST: a fixture that is both unmed-only and dark-only is
	# emitted as StateObject > LightObject > Area3D, so the state gate is a
	# grandparent. Reading only the immediate parent would silently honour
	# whichever wrapper happened to be innermost and ignore the other. Cheap:
	# the chain is three or four nodes deep and this only runs on the frames
	# the interact ray actually hits something.
	var node := get_parent()
	while node is Node3D:
		if node is StateObject and not (node as StateObject).is_present():
			return false
		if node is LightObject and not (node as LightObject).is_present():
			return false
		node = node.get_parent()
	if availability.is_valid():
		return availability.call(interactable_id)
	return true
