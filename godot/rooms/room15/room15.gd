# ROOM 15 — the Sorting Room.
#
# Three unmed-only shape keys (blue circle / green square / red triangle) sit
# at the far cap of three L-shaped dogleg alcoves. The exit is a shape lock:
# no code, no keypad, no digits — it opens once all three are held, by COUNT.
# Ported from src/rooms/room15.ts (spec: docs/superpowers/specs/
# 2026-07-19-room15-shape-keys-design.md, as reworked by Tom's playtest pass).
#
# THE FOUR THINGS THAT MAKE THIS ROOM ITSELF:
#
# 1. NO DISPENSERS. Not one, anywhere. on_enter force-reverts to unmed
#    whatever state the player arrives in (the room11/12 threshold trick,
#    which costs no pill — force_state never touches inventory) and the whole
#    room is played raw. The lock is authored allow_unmed, so there is no
#    mechanical action in this room that requires medicine at all.
# 2. A CATCH NEVER UN-COLLECTS A KEY. The design's one hard invariant. Held
#    shapes live in `_lock` (core/shape_lock.gd), which this node owns; a
#    catch is force_state + teleport + toast and does not reload the room, so
#    nothing it does can reach that state. _on_caught below deliberately does
#    NOT touch the lock, and that is the whole implementation.
# 3. ESCALATION, 2 -> 5. Two orderlies patrol at entry (A guards the green
#    square, B the red triangle). EVERY key collected spawns one more,
#    whatever order they are taken in: 3, then 4, then 5. The fifth arrives
#    while the player is still walking the last stretch to the door.
# 4. NO REFILL. A player can arrive still carrying the one game-wide pill from
#    room 14 and burn its 45s lucid window as a panic button. Sanctioned, not
#    an exploit — it buys one window, once, and nothing here tops it back up.
#
# UNVERIFIED, AND SAY SO: this room assumes a topped-off arrival from room 14
# and has no dispensers of its own, so its pill economy cannot be validated
# without playing it. Nothing in the test suite proves the room is beatable
# comfortably — only that it is beatable at all with zero pills, which follows
# from the lock being unmed-operable and every key being an unmed-only pickup.
#
# WAYPOINT NAMING: room15.ts calls its orderlies B/C/D/E/F (A was never used).
# The routes below are A..E in spawn order, so WAYPOINTS_A is room15.ts's
# orderly B, and so on down to WAYPOINTS_E = its orderly F. Every constant
# starting WAYPOINTS is picked up by check_rooms.gd's patrol-clearance
# validator, and tools/test_room15.gd re-runs that check on all five here,
# because this room is not in ROOM_SCENES yet and check_rooms only walks the
# registry.
extends Node3D

const ORDERLY := preload("res://orderly/orderly.tscn")

# Spawn, and the catch-reset point. The whole south end is safe at entry —
# until the first key lands and orderly C's loop claims it.
const SPAWN_X := 0.0
const SPAWN_Z := 5.0

# Orderly A (room15.ts's B) — a wide rectangle around the middle floor with
# exactly ONE leg walking dead-on at Key B's mouth: (-6,-10)->(7.2,-10) runs
# along z=-10, and the mouth's centre sits at the same z, so his forward
# vector points straight into it for that whole leg. The other three legs face
# north, west and south — the alcove is due east, >=90 degrees off any of
# them, at any distance. Perimeter ~33.4m, ~22.3s per loop at 1.5 m/s.
const WAYPOINTS_A: Array[Vector3] = [
	Vector3(-6, 0, -10),
	Vector3(7.2, 0, -10),
	Vector3(7.2, 0, -6.5),
	Vector3(-6, 0, -6.5),
]

# Orderly B (room15.ts's C) — the same shape, shorter and tighter: the
# (1.5,-18)->(-7.6,-18) leg is the dead-on approach to Key C's mouth.
# Perimeter ~25.4m, ~16.9s per loop — visibly faster than A's, on purpose.
# This is the timed dash the mechanic doc asked for.
const WAYPOINTS_B: Array[Vector3] = [
	Vector3(1.5, 0, -18),
	Vector3(-7.6, 0, -18),
	Vector3(-7.6, 0, -14.4),
	Vector3(1.5, 0, -14.4),
]

# Orderly C — spawns on the FIRST key, whichever it is. The south corridor:
# closes Key A's "no threat at all" zone and the walk back toward spawn, both
# of which are free until the moment he arrives.
const WAYPOINTS_C: Array[Vector3] = [
	Vector3(7.5, 0, 0.5),
	Vector3(-7.5, 0, 0.5),
	Vector3(-7.5, 0, -6),
	Vector3(7.5, 0, -6),
]

# Orderly D — spawns on the second key. The gap between the first two loops,
# i.e. the open crossing between the two original alcoves.
const WAYPOINTS_D: Array[Vector3] = [
	Vector3(-7.5, 0, -10.5),
	Vector3(-7.5, 0, -14),
	Vector3(7.5, 0, -14),
	Vector3(7.5, 0, -10.5),
]

# Orderly E — spawns on the third key: the fifth and last, patrolling the
# final approach to the lock itself. His near-lock leg (z=-18.5..-25.5, north
# edge) comes within ~1.3m of shape_lock15, far short of the ~8.2m
# inspection-point guideline, and deliberately: the ask was a room that is
# still dangerous while you walk to the door. The mitigation is that he is
# fully visible for his entire ~29s loop across open, blind-corner-free floor,
# and only ~10s of it can threaten the lock at all.
const WAYPOINTS_E: Array[Vector3] = [
	Vector3(7.5, 0, -25.5),
	Vector3(7.5, 0, -18.5),
	Vector3(-7.5, 0, -18.5),
	Vector3(-7.5, 0, -25.5),
]

# SPAWN FAIRNESS. An escalation orderly is planted on his waypoints[0] the
# instant he is added to the tree (Orderly._ready), and pickup order is the
# player's choice, so each of those three points is chosen to be far from ALL
# THREE key positions at once, not just from whichever key triggered him.
# Key interiors: A (-10.5,-0.3), B (10.5,-12.3), C (-10.5,-20.3).
#   C spawns at (7.5,0.5)   — nearest key is B, 13.1m
#   D spawns at (-7.5,-10.5) — nearest key is C, 10.2m
#   E spawns at (7.5,-25.5)  — nearest key is B, 13.5m
# All three clear his 6m sight range by more than double, so he never renders
# in on top of the player. tools/test_room15.gd asserts these distances.
#
# TINTS. room15.ts gives each of the five a distinct eye tint. This engine's
# orderly has NO emissive eyes at all — a deliberate art decision in
# orderly_visual.gd ("the read at distance is the pale uniform against the
# dark ward, not a light source") — so the tint is applied to the uniform
# instead, as a shallow lerp of the cloth's base colour toward the same five
# hues. Five reads as five in a crowd without any of them becoming a lamp.
const ESCALATIONS := [
	{
		"waypoints": WAYPOINTS_C,
		"tint": Color(0.725, 0.541, 1.0),      # violet
		"warn": "and now a third.",
		"spawn": "somewhere, a door you can't see opens.",
	},
	{
		"waypoints": WAYPOINTS_D,
		"tint": Color(1.0, 0.435, 0.847),      # magenta
		"warn": "four, and closing.",
		"spawn": "they know what you took.",
	},
	{
		"waypoints": WAYPOINTS_E,
		"tint": Color(0.498, 0.910, 1.0),      # ice-cyan
		"warn": "five. all of them, all at once.",
		"spawn": "the last of them. now it is just you and the door.",
	},
]

# The second of the two entry patrols gets amber, the room12 precedent for
# telling two orderlies apart; the first keeps the default uniform.
const TINT_B := Color(1.0, 0.702, 0.278)

# How far the uniform moves toward its tint. Kept shallow on purpose: at 1.0
# an orderly reads as a coloured light source, which is exactly what
# orderly_visual.gd's silhouette rules forbid.
const TINT_MIX := 0.32

# Held shapes, the door, the panel — see core/shape_lock.gd's header for why
# this object, and not GameState, is where collected keys live.
var _lock: WardShapeLock = null

var _orderlies: Array[CharacterBody3D] = []
# Key ids that have already triggered an escalation. Guards against a second
# interact on an already-taken key spawning a sixth orderly.
var _escalated := {}

var _main: Node = null


func on_enter(main: Node) -> void:
	_main = main
	_orderlies.clear()
	_escalated.clear()
	_lock = _build_lock()

	for node in _interactables():
		node.availability = _lock.is_available

	_spawn_entry_orderlies()

	# THE FORCED RAW THRESHOLD. Room 14 can end either way and this room has
	# nothing to dose with, so it starts everyone in the same state rather than
	# letting an arriving lucid player walk the first alcove for free. Costs no
	# pill; force_state does not touch inventory.
	StateManager.force_state(StateManager.State.UNMED, "room15-entry")
	_main.shift_fx()
	_main.hud_toast("raw, and staying that way. there's nothing left to dose you with.")
	_main.hud_objective("three shapes. no medicine here. every one you take, another of them arrives.")


# --- the shape lock ---------------------------------------------------------
# Built here rather than in the .tscn because the toasts, the swing target and
# the key roster are room voice and room design, not geometry. The geometry
# half (slab, lock fixture, three props, panel, door collider) is generated —
# see tools/gen_rooms.py's room15().

func _build_lock() -> WardShapeLock:
	var lock := WardShapeLock.new()
	lock.lock_id = "shape_lock15"
	lock.door_id = "exitdoor"
	lock.door_collider = "DoorCollider"
	# A 90-degree swing about the hinge edge (x=-1), 0.85m clear of the wall —
	# kit.ts's DOOR_SWING_DEPTH default, so the slab lies flat against the
	# vestibule's west wall instead of standing in the doorway.
	lock.door_open_pos = Vector3(-1.0, 1.5, -27.85)
	lock.door_open_rot_y = PI / 2.0
	lock.panel = get_node_or_null("IconPanels/doorIcons15") as IconPanel

	# THE LOCK WORKS RAW. Every other lucid-gated mechanism in the game refuses
	# an unmedicated hand; this room has no medicine in it, so the door cannot
	# be the one thing that still demands some.
	lock.allow_unmed = true

	lock.add_key("shapeKeyA", "circle", "a circle. cold in your hand.")
	lock.add_key("shapeKeyB", "square", "a square. he didn't turn around.")
	lock.add_key("shapeKeyC", "triangle",
		"a triangle. you're already moving before you feel it.")

	lock.refusal_incomplete = func(have: int, need: int) -> String:
		return "it wants %d shapes back. you have %d." % [need, have]
	lock.success_toast = "three shapes, three small thefts. the door remembers none of it."
	lock.success_objective = "the door is open. go."
	return lock


func _interactables() -> Array[Interactable]:
	var out: Array[Interactable] = []
	var root := get_node_or_null("Interactables")
	if root == null:
		return out
	for child in root.get_children():
		if child is Interactable:
			out.append(child as Interactable)
		else:
			# One level deeper: a state-filtered fixture (every shape key) sits
			# inside its StateObject wrapper.
			for sub in child.get_children():
				if sub is Interactable:
					out.append(sub as Interactable)
	return out


# The keys need no ward-state check here. They are authored states='unmed', so
# their StateObject wrapper is absent while lucid and Interactable.
# is_focusable() refuses the ray outright — the interaction never reaches this
# function. One mechanism, not two that can disagree.
func on_interact(id: String) -> bool:
	if _lock == null:
		return false
	var handled: bool = _lock.handle_interact(id, _main)
	if handled and _lock.is_collected(id) and not _escalated.has(id):
		_escalated[id] = true
		_escalate()
	return handled


# --- the orderlies ----------------------------------------------------------

func _spawn_entry_orderlies() -> void:
	_free_orderlies()
	_spawn_one(WAYPOINTS_A, "he sees you.", Color(1, 1, 1))
	_spawn_one(WAYPOINTS_B, "so does he.", TINT_B)


# Spawns the next orderly in the escalation roster, a no-op past five.
#
# RUNTIME SPAWNING, MID-ROOM. Every other orderly room in this port builds its
# whole population inside on_enter and never changes it. Nothing about Orderly
# requires that: he is a plain scene, and setup(player, collision) is the only
# wiring he needs, so instantiating one twenty minutes into a room is the same
# four lines as instantiating one at the door. What IS new here is that he
# arrives while the player is somewhere unknown, which is what the spawn-
# fairness geometry above exists to make survivable.
func _escalate() -> void:
	var index := _orderlies.size() - 2  # two entry patrols come first
	if index < 0 or index >= ESCALATIONS.size():
		return
	var cfg: Dictionary = ESCALATIONS[index]
	_spawn_one(cfg["waypoints"], str(cfg["warn"]), cfg["tint"])
	_main.hud_toast(str(cfg["spawn"]))
	Telemetry.event("orderly_escalation", {"count": _orderlies.size()})


func _spawn_one(route: Array, warn_toast: String, tint: Color) -> CharacterBody3D:
	var o: CharacterBody3D = ORDERLY.instantiate()
	# Waypoints must be set BEFORE add_child: Orderly._ready() plants him on
	# waypoints[0], which for an escalation orderly is his whole spawn-fairness
	# guarantee.
	var route_typed: Array[Vector3] = []
	for p in route:
		route_typed.append(p)
	o.waypoints = route_typed
	add_child(o)
	o.setup(_main.player, _main.collision)
	_apply_tint(o, tint)

	o.warned.connect(func() -> void:
		_main.hud_toast(warn_toast)
		Telemetry.event("orderly_spotted"))
	o.chase_started.connect(_on_chase_started)
	o.caught.connect(_on_caught)

	_orderlies.append(o)
	return o


# Shifts one orderly's uniform toward `tint`. orderly_visual.gd builds a fresh
# ShaderMaterial per body part per INSTANCE (see _build_body), so writing to
# them here cannot bleed into another orderly — but several parts share one
# material within a body, so each is tinted exactly once.
func _apply_tint(orderly: Node, tint: Color) -> void:
	if tint.is_equal_approx(Color(1, 1, 1)):
		return
	var body := orderly.get_node_or_null("Body")
	if body == null:
		return
	_tint_subtree(body, tint, {})


func _tint_subtree(node: Node, tint: Color, seen: Dictionary) -> void:
	if node is MeshInstance3D:
		var mat := (node as MeshInstance3D).material_override
		if mat is ShaderMaterial and not seen.has(mat.get_instance_id()):
			seen[mat.get_instance_id()] = true
			var sm := mat as ShaderMaterial
			var base: Variant = sm.get_shader_parameter("base_color")
			if base is Color:
				sm.set_shader_parameter("base_color", (base as Color).lerp(tint, TINT_MIX))
	for child in node.get_children():
		_tint_subtree(child, tint, seen)


func _free_orderlies() -> void:
	for o in _orderlies:
		if is_instance_valid(o):
			o.queue_free()
	_orderlies.clear()


func _on_chase_started() -> void:
	_main.hud_toast("run. or stop being visible.")
	Telemetry.event("orderly_chase")


# CATCH PENALTY. Telemetry first (the event snapshots player position, so
# emitting after the teleport would record the spawn point for every catch),
# then forced lucid, then the walk back.
#
# WHAT IS NOT HERE IS THE POINT: nothing touches `_lock`. Collected keys, the
# lit panel and the removed props all survive a catch, exactly as pills do —
# the design's one hard invariant, and in this room it is also the soft-lock
# escape hatch, since a five-orderly floor with no dispensers has no other way
# out of a chase than the pill you may not have.
#
# The forced lucid is kept even though this room is played raw throughout: it
# is what ends the chase (Orderly aborts on the state change), and the 45s
# window it grants costs nothing, since shifting BACK to unmed is free.
func _on_caught() -> void:
	Telemetry.event("orderly_caught")
	StateManager.force_state(StateManager.State.LUCID, "catch")
	_main.shift_fx()
	_main.teleport_player(SPAWN_X, SPAWN_Z)
	_main.hud_toast('hands. a needle. "you dropped something," he says — you didn\'t.')


# Primary threat across a population that GROWS from two to five: chasing
# beats watching, a higher watch ramp beats a lower one, nearer breaks ties.
# Folded one candidate at a time, so the count never matters — the same
# routine room12 uses for its fixed three.
func _physics_process(_delta: float) -> void:
	if _main == null or _orderlies.is_empty():
		return

	var player_pos: Vector3 = _main.player.global_position
	var level := 0.0
	var chasing := false
	var primary: CharacterBody3D = null
	var primary_dist := INF

	for o in _orderlies:
		if not is_instance_valid(o):
			continue
		var w: float = o.watching()
		var d := Vector2(o.global_position.x - player_pos.x,
			o.global_position.z - player_pos.z).length()
		level = maxf(level, w)
		chasing = chasing or o.is_chasing()

		if primary == null:
			primary = o
			primary_dist = d
			continue
		if o.is_chasing() and not primary.is_chasing():
			primary = o
			primary_dist = d
		elif o.is_chasing() == primary.is_chasing():
			if w > primary.watching():
				primary = o
				primary_dist = d
			elif w == primary.watching() and d < primary_dist:
				primary = o
				primary_dist = d

	if (level > 0.0 or chasing) and primary != null:
		_main.set_threat(level, primary.bearing_from(_main.player.yaw))
	else:
		_main.set_threat(0.0, null)


func on_leave() -> void:
	if _main != null:
		_main.set_threat(0.0, null)
	_free_orderlies()
