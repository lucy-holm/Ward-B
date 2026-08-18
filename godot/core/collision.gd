# Axis-separated AABB collision, ported deliberately rather than replaced.
#
# WHY NOT move_and_slide (the big architectural call — see MIGRATION_NOTES):
# the Three.js original resolves X first against the OLD z, then Z against
# the NEW x (src/engine/collision.ts:19-48). That ordering is load-bearing:
# it defines corner-sliding and whether the player can squeeze diagonally
# past a corner. It also approximates the player's 0.35 m radius by
# INFLATING the AABB, so clearance is a 0.7 m square, not a disc — Godot's
# capsule would round those corners off. Every room's geometry, and the
# orderly's 0.5 m patrol-clearance margins, were audited against that square.
#
# So: the walls are real StaticBody3D + BoxShape3D nodes on real collision
# layers (editor-visible, navmesh-bakeable, properly tagged), but the player
# and orderly resolve motion through this ported routine instead of the
# physics solver. Best of both — native scene structure, original feel.
#
# All tests are 2D in XZ. Colliders are infinite in Y, exactly as before:
# there is no vertical collision anywhere in this game.
class_name WardCollision
extends RefCounted

# Collision layer bits, mirroring [layer_names] in project.godot.
const LAYER_PLAYER := 1
const LAYER_WORLD_STATIC := 2
const LAYER_SOLID_LUCID := 4
const LAYER_SOLID_UNMED := 8
const LAYER_ORDERLY := 16
const LAYER_INTERACTABLE := 32
const LAYER_TRIGGER := 64

# One collider: an XZ rect, the ward state it is solid in, and the stacked
# level it belongs to.
# `state_filter` is StateManager.State, or -1 for "both".
#
# `level_filter` is a STRING, deliberately, and NOT a collision-layer bit.
# Level ids are arbitrary room-local strings ('ground', 'balcony', ...) and a
# Godot collision layer is a 32-bit mask, so encoding them as bits would cap
# the whole game at 32 level names and force a central registry of them.
# Empty string means UNTAGGED — a real full-height wall or pillar that
# structurally passes through every level. That is the common case, and it is
# the ONLY case in every room shipped so far, which is what makes threading
# `level` through the queries below inert for rooms 1-16. A tagged collider
# (a gallery railing, say) exists only while the querying traveler is on that
# same level, so it cannot block the floor underneath it.
class Box:
	var min_x: float
	var max_x: float
	var min_z: float
	var max_z: float
	var state_filter: int = -1
	var level_filter: String = ""
	var source: Node3D = null

	func _init(a: float, b: float, c: float, d: float, filter: int = -1, level := "") -> void:
		min_x = a
		max_x = b
		min_z = c
		max_z = d
		state_filter = filter
		level_filter = level

	func active_in(state: int) -> bool:
		return state_filter == -1 or state_filter == state

	## Untagged colliders are active on EVERY level, so this is trivially true
	## for every collider authored before levels existed. Defers to
	## WardLevels so the rule has one definition shared with every other
	## level-filtered volume (trigger volumes especially).
	func active_on_level(level: String) -> bool:
		return WardLevels.level_matches(level_filter, level)


var boxes: Array[Box] = []


## Rebuild the cache from a room subtree. Walls author themselves as
## StaticBody3D + BoxShape3D so they stay real Godot nodes; we read their
## world-space AABBs once on load rather than querying the physics server
## every frame.
func rebuild_from(root: Node) -> void:
	boxes.clear()
	_collect(root)


func _collect(node: Node) -> void:
	if node is CollisionShape3D:
		var cs := node as CollisionShape3D
		var body := cs.get_parent()
		if body is CollisionObject3D and cs.shape is BoxShape3D:
			_add_box(cs, cs.shape as BoxShape3D, body as CollisionObject3D)
	for child in node.get_children():
		_collect(child)


func _add_box(cs: CollisionShape3D, shape: BoxShape3D, body: CollisionObject3D) -> void:
	# Only geometry on the solid layers participates; interactables and
	# triggers have shapes too and must not block movement.
	var layer := body.collision_layer
	var solid_mask := LAYER_WORLD_STATIC | LAYER_SOLID_LUCID | LAYER_SOLID_UNMED
	if layer & solid_mask == 0:
		return

	var filter := -1
	if layer & LAYER_SOLID_LUCID:
		filter = StateManager.State.LUCID
	elif layer & LAYER_SOLID_UNMED:
		filter = StateManager.State.UNMED

	# World-space extents. Rooms are axis-aligned, so taking the transformed
	# basis extents is exact; a rotated box would need a full OBB and is not
	# supported (nor used) by rooms 1-7.
	var xf := cs.global_transform
	var half := shape.size * 0.5
	var ex := absf(xf.basis.x.x) * half.x + absf(xf.basis.y.x) * half.y + absf(xf.basis.z.x) * half.z
	var ez := absf(xf.basis.x.z) * half.x + absf(xf.basis.y.z) * half.y + absf(xf.basis.z.z) * half.z
	var o := xf.origin

	var b := Box.new(o.x - ex, o.x + ex, o.z - ez, o.z + ez, filter, _level_tag_of(body))
	b.source = cs
	boxes.append(b)


## Which stacked level a collider belongs to, or "" for untagged.
##
## Read off the StaticBody3D rather than encoded in its collision layer — see
## Box.level_filter for why bits are the wrong container for a level id.
## Metadata is checked first because that is what tools/gen_rooms.py authors
## and what stays editable in the inspector; a `level` script property is
## also honoured so a hand-written room node can declare one the same way an
## Orderly does. Anything that declares neither is untagged, which is every
## collider in rooms 1-16.
func _level_tag_of(body: CollisionObject3D) -> String:
	return WardLevels.tag_of(body)


## Axis-separated move. Mutates and returns the resolved XZ position.
## `radius` inflates the boxes — this is a box-vs-box test, not a circle.
##
## `level` is the querying traveler's own stacked level, filtered alongside
## the state filter in BOTH passes (both go through is_blocked_at, so there
## is exactly one place the two filters are applied). It defaults to the
## synthetic '__flat' level so an un-updated call site behaves exactly as it
## did before levels existed.
func try_move(from: Vector2, to: Vector2, radius: float, state: int,
		level := WardLevels.FLAT_LEVEL_ID) -> Vector2:
	var out := from

	# Pass 1: X, tested against the ORIGINAL z.
	if not is_blocked_at(to.x, out.y, radius, state, level):
		out.x = to.x

	# Pass 2: Z, tested against the POSSIBLY-UPDATED x. This asymmetry is
	# the whole point; resolving both against `from` changes corner behaviour.
	if not is_blocked_at(out.x, to.y, radius, state, level):
		out.y = to.y

	return out


## True when a radius-inflated point at (x, z) overlaps any collider active
## in `state` AND on `level`. Public so the room validator can assert spawn
## clearance.
func is_blocked_at(x: float, z: float, radius: float, state: int,
		level := WardLevels.FLAT_LEVEL_ID) -> bool:
	for b in boxes:
		if not b.active_in(state) or not b.active_on_level(level):
			continue
		# Strict comparisons: exactly touching the inflated edge is NOT a hit,
		# matching the original's `>` / `<`.
		if x > b.min_x - radius and x < b.max_x + radius \
				and z > b.min_z - radius and z < b.max_z + radius:
			return true
	return false


## The geometry-trap guard. True when the point sits inside a collider that
## is solid ONLY while unmedicated — i.e. reverting right now would embed the
## player in a wall. The medication auto-revert is held off while this is
## true, indefinitely, which is the one case where lucidity outlasts 45 s.
##
## Gets the identical `level` treatment as try_move: an unmed-sealed collider
## could in principle be level-tagged (none is today), and the trap guard has
## to agree with the mover about which geometry exists or it would hold a
## revert off against a wall the player cannot actually be embedded in.
func circle_hits_solid_unmed(x: float, z: float, radius: float,
		level := WardLevels.FLAT_LEVEL_ID) -> bool:
	for b in boxes:
		if b.state_filter != StateManager.State.UNMED or not b.active_on_level(level):
			continue
		if x > b.min_x - radius and x < b.max_x + radius \
				and z > b.min_z - radius and z < b.max_z + radius:
			return true
	return false
