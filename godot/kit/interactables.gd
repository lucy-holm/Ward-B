# Interactable-tree walkers, factored out of the byte-identical `_interactables`
# every room script but room 20 hand-rolls.
#
# TWO SHAPES, BECAUSE ROOM AUTHORING PRODUCES TWO SHAPES. Every ordinary room
# hangs its fixtures directly under a single `Interactables` node, or one
# wrapper level down (a group node holding a fixture's mesh + Interactable
# together — see Interactable's own header on why the Area3D and the visual
# are siblings under a wrapper rather than the Area3D being the fixture's
# root). `collect()` walks exactly that: root's children, and each of THEIR
# children if the child itself is not an Interactable.
#
# Room 20 breaks the pattern on purpose: its crate's Interactable lives at
# Geometry/Crate/Visual — three levels down, under Geometry, not under an
# Interactables node at all, because the crate is a moving prop wired into
# the room's own collision-and-cover system, not a static fixture. A shallow
# walk finds nothing there, so `collect_recursive()` exists as the deliberate
# escape hatch: a full-tree scan for any future room whose interactables
# don't live under the conventional node.
class_name KitInteractables
extends RefCounted


## The shallow walk every ordinary room uses: everything directly under a
## child node named "Interactables", plus one wrapper level for fixtures
## grouped with their visual mesh. Returns an empty array (not an error) if
## the room has no "Interactables" node at all — matching every hand-rolled
## version, which treats "no such node" as "no fixtures to wire" rather than
## a bug.
static func collect(room: Node) -> Array[Interactable]:
	var out: Array[Interactable] = []
	var root := room.get_node_or_null("Interactables")
	if root == null:
		return out
	for child in root.get_children():
		if child is Interactable:
			out.append(child as Interactable)
		else:
			for sub in child.get_children():
				if sub is Interactable:
					out.append(sub as Interactable)
	return out


## The room-20 variant: every Interactable anywhere under `room`, regardless
## of depth or the name of the node it hangs from. Use this ONLY when a
## fixture genuinely lives outside an Interactables subtree (a prop wired
## into room-specific machinery); for everything else `collect()` is the
## right, narrower walk, and matches what every other room actually does.
static func collect_recursive(room: Node) -> Array[Interactable]:
	var out: Array[Interactable] = []
	_collect_recursive(room, out)
	return out


static func _collect_recursive(node: Node, out: Array[Interactable]) -> void:
	if node is Interactable:
		out.append(node as Interactable)
	for child in node.get_children():
		_collect_recursive(child, out)


## The other half of the duplicated pair: every room walks its interactables
## once, in on_enter, purely to assign `node.availability = _is_available`.
## Folds that assignment loop in too, so a room's on_enter can be a single
## call instead of a four-line for-loop it would otherwise still have to
## write itself.
static func wire_availability(room: Node, cb: Callable, recursive := false) -> void:
	var nodes := collect_recursive(room) if recursive else collect(room)
	for node in nodes:
		node.availability = cb
