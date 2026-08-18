# Verticality: floor height and stacked walkable levels.
#
# THIS IS ONE SYSTEM, NOT TWO. The Three.js build (src/game/world.ts) shipped
# "height zones + ramps" first and "stacked levels + stairwells" second, but
# the second subsumes the first: a room that only wants a raised alcove is
# just a room with ONE level, whose id is the reserved synthetic '__flat'.
# Everything below therefore reads through `levels` unconditionally, and
# rebuild_from() folds a flat room's own zones/ramps into that single level.
# There is no separate code path for the simple case, and adding one later
# would immediately reintroduce the bug class this design removes.
#
#   TIER 1 — height zones / ramps (rooms 11, 19)
#     The walkable floor height is a single-valued function of (x, z).
#     ZERO COLLISION IMPACT: a raised region is NEVER a collider. It is
#     purely a height the rendered Y eases toward. What keeps the player on
#     the intended level is ordinary walls and railings, which are ordinary
#     colliders. Nothing here can block, and nothing here is consulted by
#     WardCollision.
#
#   TIER 2 — levels / stairwells (room 17)
#     Two walkable surfaces over the SAME XZ rectangle, disambiguated by a
#     per-traveler `level` string. Level is deliberately NOT a pure function
#     of (x, z) — that is the entire point. A traveler's level only ever
#     changes by physically walking a stairwell end to end (resolve_level).
#
# THERE IS NO JUMPING, NO FALLING AND NO VERTICAL COLLISION IN THIS GAME.
# Colliders are infinite in Y (see core/collision.gd) and stay that way. Y is
# a rendered height, never a simulated one.
class_name WardLevels
extends RefCounted

## The implicit single level every room without authored `levels` is treated
## as. Reserved: room authors name their levels something meaningful
## ('ground'/'balcony'), so this can never collide with an authored id.
const FLAT_LEVEL_ID := "__flat"

## How far PAST a stairwell's far end a traveler may step and still have the
## level flip fire. See resolve_level for why this exists and why it is
## applied to one dimension only.
const STAIR_OVERSHOOT_M := 1.0

## The room-wide ceiling plane height when a room authors none.
const DEFAULT_CEILING_Y := 3.0

## Per-tick easing factor for the rendered Y (main.ts:542's 0.35).
const Y_EASE := 0.35

## Degenerate-span guard. A stairwell or ramp authored with min == max would
## divide by zero; TS produced Infinity, which is survivable in a JS number
## but poisons a Godot Transform3D into NaN and takes the whole render with
## it. Deliberate, documented divergence from the reference.
const MIN_SPAN := 0.0001


## A flat raised (or sunken) rectangle within one level.
class Zone:
	var min_x: float
	var max_x: float
	var min_z: float
	var max_z: float
	var y: float

	func _init(a: float, b: float, c: float, d: float, height: float) -> void:
		min_x = a
		max_x = b
		min_z = c
		max_z = d
		y = height


## A sloped rectangle within one level. `axis` is "x" or "z" — the dimension
## the slope interpolates over; y_low is at that axis's min end.
class Ramp:
	var min_x: float
	var max_x: float
	var min_z: float
	var max_z: float
	var axis: String = "z"
	var y_low: float
	var y_high: float

	func _init(a: float, b: float, c: float, d: float, ax: String, lo: float, hi: float) -> void:
		min_x = a
		max_x = b
		min_z = c
		max_z = d
		axis = ax
		y_low = lo
		y_high = hi


## One room-local named floor.
##
## `floor` is this level's own footprint. It is NOT consulted by
## floor_height_at (base_y/zones/ramps are) — it exists for spawn validation
## and tooling, exactly as LevelDef.floor does in the reference.
class Level:
	var id: String = FLAT_LEVEL_ID
	var base_y: float = 0.0
	var floor_rect := Vector4(-INF, INF, -INF, INF)  # min_x, max_x, min_z, max_z
	var zones: Array[Zone] = []
	var ramps: Array[Ramp] = []

	func _init(level_id: String, y: float) -> void:
		id = level_id
		base_y = y


## The connector between exactly TWO levels — a stair run, modeled as a ramp
## that also flips which level a traveler is considered to be on once they
## fully clear the far end.
##
## y_low/level_at_low describe the axis's MIN end, y_high/level_at_high the
## MAX end. Note that "low" and "high" name the ends of the AXIS, not the
## heights: a stair that descends as z increases has y_low > y_high, which is
## exactly how room 17's two stairwells are authored.
class Stairwell:
	var id: String = ""
	var min_x: float
	var max_x: float
	var min_z: float
	var max_z: float
	var axis: String = "z"
	var y_low: float
	var level_at_low: String
	var y_high: float
	var level_at_high: String


# Always at least one entry — the implicit '__flat' level for a room that
# authors no verticality at all. Nothing may assume levels.size() > 1.
var levels: Array[Level] = []
var stairwells: Array[Stairwell] = []
var ceiling_y := DEFAULT_CEILING_Y


func _init() -> void:
	_reset_to_flat()


func _reset_to_flat() -> void:
	levels = [Level.new(FLAT_LEVEL_ID, 0.0)]
	stairwells = []
	ceiling_y = DEFAULT_CEILING_Y


## Rebuild from a room subtree.
##
## Verticality is pure data with no geometry and no collision, so unlike
## walls it is not expressible as a node with a shape. It is read from
## metadata on an optional "Verticality" child of the room root (authored by
## tools/gen_rooms.py, and visible/editable in the inspector's Metadata
## section afterwards). A room with no such node — every room 1 to 10 — gets
## the implicit flat level and floor_height_at answers 0.0 everywhere, which
## is byte-for-byte today's behaviour.
func rebuild_from(root: Node) -> void:
	_reset_to_flat()
	if root == null:
		return
	var node := root.get_node_or_null("Verticality")
	if node == null:
		return

	if node.has_meta("ceiling_y"):
		ceiling_y = float(node.get_meta("ceiling_y"))

	for raw: Variant in node.get_meta("stairwells", []):
		var d: Dictionary = raw
		var s := Stairwell.new()
		s.id = str(d.get("id", ""))
		s.min_x = float(d.get("min_x", 0.0))
		s.max_x = float(d.get("max_x", 0.0))
		s.min_z = float(d.get("min_z", 0.0))
		s.max_z = float(d.get("max_z", 0.0))
		s.axis = str(d.get("axis", "z"))
		s.y_low = float(d.get("y_low", 0.0))
		s.level_at_low = str(d.get("level_at_low", FLAT_LEVEL_ID))
		s.y_high = float(d.get("y_high", 0.0))
		s.level_at_high = str(d.get("level_at_high", FLAT_LEVEL_ID))
		stairwells.append(s)

	var authored: Array = node.get_meta("levels", [])
	if authored.is_empty():
		# TIER 1 — the fold. A room that authored only zones/ramps has them
		# wrapped into the single synthetic '__flat' level, which is what
		# makes "tier 1 is tier 2 with one level" true in code rather than
		# only in the design doc. Mirrors loadRoom's `def.levels ?? [...]`.
		var flat := Level.new(FLAT_LEVEL_ID, 0.0)
		flat.zones = _read_zones(node.get_meta("zones", []))
		flat.ramps = _read_ramps(node.get_meta("ramps", []))
		levels = [flat]
		return

	# TIER 2 — explicitly authored levels.
	var built: Array[Level] = []
	for raw: Variant in authored:
		var d: Dictionary = raw
		var lvl := Level.new(str(d.get("id", FLAT_LEVEL_ID)), float(d.get("base_y", 0.0)))
		var fr: Array = d.get("floor", [])
		if fr.size() == 4:
			lvl.floor_rect = Vector4(float(fr[0]), float(fr[1]), float(fr[2]), float(fr[3]))
		lvl.zones = _read_zones(d.get("zones", []))
		lvl.ramps = _read_ramps(d.get("ramps", []))
		built.append(lvl)
	levels = built


func _read_zones(raw: Array) -> Array[Zone]:
	var out: Array[Zone] = []
	for item: Variant in raw:
		var a: Array = item
		out.append(Zone.new(float(a[0]), float(a[1]), float(a[2]), float(a[3]), float(a[4])))
	return out


func _read_ramps(raw: Array) -> Array[Ramp]:
	var out: Array[Ramp] = []
	for item: Variant in raw:
		var a: Array = item
		out.append(Ramp.new(
			float(a[0]), float(a[1]), float(a[2]), float(a[3]), str(a[4]), float(a[5]), float(a[6])))
	return out


## The walkable floor height at (level, x, z) — single-valued PER LEVEL.
##
## At any (level, x, z) there is exactly one walkable height, but the same
## (x, z) can answer differently on two different levels. That is the whole
## capability stacked floors add.
##
## ORDER IS LOAD-BEARING, and is ported from world.ts:1467-1485 exactly:
##
##   1. STAIRWELLS FIRST, before any level's own ramps or zones. A traveler
##      physically on the stairs — level still pinned to whichever end they
##      started from — must always read the interpolated stair height,
##      regardless of what the destination level's zones claim about that XZ
##      column. Checking the level's own geometry first would make a
##      stairwell that passes over a raised zone snap to the zone's flat
##      height mid-climb.
##   2. Then that level's RAMPS, before its zones, so a ramp overlapping a
##      flat zone always wins. This lets a room author a ramp's endpoints
##      flush against an adjacent zone without the zone fighting it at the
##      seam.
##   3. Then that level's ZONES.
##   4. Then the level's own base_y (0 for '__flat').
##
## An unmatched `level` falls back to the first level rather than throwing —
## a room-authoring mistake should read as "wrong floor", not a crash.
func floor_height_at(level: String, x: float, z: float) -> float:
	for s in stairwells:
		if x < s.min_x or x > s.max_x or z < s.min_z or z > s.max_z:
			continue
		if level != s.level_at_low and level != s.level_at_high:
			continue
		return s.y_low + (s.y_high - s.y_low) * _axis_t(s.axis, x, z, s.min_x, s.max_x, s.min_z, s.max_z)

	var lvl := _level_by_id(level)
	for r in lvl.ramps:
		if x >= r.min_x and x <= r.max_x and z >= r.min_z and z <= r.max_z:
			return r.y_low + (r.y_high - r.y_low) * _axis_t(r.axis, x, z, r.min_x, r.max_x, r.min_z, r.max_z)

	for hz in lvl.zones:
		if x >= hz.min_x and x <= hz.max_x and z >= hz.min_z and z <= hz.max_z:
			return hz.y

	return lvl.base_y


## Which level a traveler is considered to be on after moving to (x, z).
##
## A no-op everywhere except fully clearing a stairwell footprint end to end,
## INCLUDING mid-stair: walking halfway up and turning back leaves the
## traveler on the level they started from, which is what makes a stairwell
## a transition rather than a teleport. A room with no stairwells never
## enters the loop body, so every room shipped before this existed is
## untouched.
##
## THE BOUNDS ARE DELIBERATELY ASYMMETRIC. This reproduces a shipped bug fix
## (world.ts:36-67) that was found by simulating room 17's stair climb step
## by step, not by inspecting the geometry:
##
##   The original clamped BOTH dimensions strictly. That mechanically
##   confines `t` to [0, 1] whenever the loop body runs at all, so `t >= 1`
##   and `t <= 0` can only be satisfied by `t` landing on EXACTLY 1 or 0 —
##   the traveler's position landing on the exact boundary float for that
##   frame. Real per-frame motion (position += speed * dt) essentially never
##   lands on an exact boundary; it steps a few centimetres past it. So the
##   traveler sailed through the exit boundary without flipping, fell out of
##   the containment check entirely on the very next frame (now past
##   min/max), and kept walking as the WRONG level — never catching the flip
##   at all. In room 17 this read as a second invisible wall a metre beyond
##   the first.
##
##   The fix: keep the LATERAL dimension (the one `t` does not interpolate
##   over) strictly bounded — there is no crossing to detect there, a
##   traveler is either on the stair's width or they are not — and give the
##   AXIS dimension a bounded overshoot past each end, so a frame that steps
##   past the exit boundary is still caught.
##
## STAIR_OVERSHOOT_M (1.0 m) is generous against a single tick's travel — the
## fastest mover in the game is a chasing orderly at 4.3 m/s, so at main.ts's
## clamped dt of 0.05 s that is a 0.215 m worst-case step — while staying
## small against room-scale coordinates, so it cannot bridge to an unrelated
## stairwell or spuriously flip a traveler who merely happens to share the
## lateral coordinate elsewhere on the same level.
##
## This only ever WIDENS when a flip can fire, never narrows it, so no room
## that already worked can regress.
func resolve_level(current: String, x: float, z: float) -> String:
	for s in stairwells:
		if s.axis == "x":
			if z < s.min_z or z > s.max_z:
				continue  # lateral — STRICT
			if x < s.min_x - STAIR_OVERSHOOT_M or x > s.max_x + STAIR_OVERSHOOT_M:
				continue  # axis — bounded overshoot
		else:
			if x < s.min_x or x > s.max_x:
				continue  # lateral — STRICT
			if z < s.min_z - STAIR_OVERSHOOT_M or z > s.max_z + STAIR_OVERSHOOT_M:
				continue  # axis — bounded overshoot
		if current != s.level_at_low and current != s.level_at_high:
			continue
		# Deliberately UNCLAMPED: outside [0, 1] is precisely the overshoot
		# case the asymmetric bounds above exist to let through.
		var t := _axis_t(s.axis, x, z, s.min_x, s.max_x, s.min_z, s.max_z)
		if t >= 1.0 and current == s.level_at_low:
			return s.level_at_high
		if t <= 0.0 and current == s.level_at_high:
			return s.level_at_low
	return current


# --- level queries for other systems ---------------------------------------
#
# Anything that filters by level — colliders here, trigger volumes elsewhere,
# scrawls or interactables if they ever need it — should go through these
# three rather than reimplementing the rule, so "untagged means every level"
# has exactly one definition in the codebase.
#
# THERE IS DELIBERATELY NO `level_at(x, z)`. Level is not a pure function of
# XZ; that is the entire point of stacked floors, since a gallery and the
# floor beneath it share an XZ rectangle with two different correct answers.
# The only honest question is "what level is this TRAVELER on", which is
# level_of() below, and a traveler only ever changes level by walking a
# stairwell end to end (resolve_level).


## The level a traveler (the player, an orderly, any body carrying one) is
## currently on. Duck-typed on a `level` property, then metadata, so a test
## stub or a hand-authored node works without inheriting anything. Defaults
## to the synthetic flat level, which is what an untagged body means.
static func level_of(node: Node) -> String:
	if node == null:
		return FLAT_LEVEL_ID
	if "level" in node:
		return str(node.get("level"))
	if node.has_meta("level"):
		return str(node.get_meta("level"))
	return FLAT_LEVEL_ID


## The level TAG on a volume — a collider, a trigger, anything with a
## footprint rather than a position. Empty means untagged, i.e. active on
## every level, which is the common case and the only case in rooms 1-16.
##
## The default differs from level_of on purpose: an untagged TRAVELER is on
## the flat level, whereas an untagged VOLUME exists on all levels.
static func tag_of(node: Node) -> String:
	if node == null:
		return ""
	if node.has_meta("level"):
		return str(node.get_meta("level"))
	if "level" in node:
		return str(node.get("level"))
	return ""


## Does a volume tagged `tag` apply to a traveler on `traveler_level`? The
## single definition of the rule — Box.active_on_level defers to it, and a
## level filter on trigger volumes should too.
static func level_matches(tag: String, traveler_level: String) -> bool:
	return tag.is_empty() or tag == traveler_level


## True when `id` names a level this room actually authored. For validators
## and room scripts; floor_height_at deliberately does not use it (it falls
## back rather than failing).
func has_level(id: String) -> bool:
	for lvl in levels:
		if lvl.id == id:
			return true
	return false


## The id a room's traveler should start on: the first authored level, or
## '__flat' for a room with no authored levels.
func default_level() -> String:
	return levels[0].id if not levels.is_empty() else FLAT_LEVEL_ID


## Standing headroom on a level: ceiling to eye height. ROOM_AUTHORING.md
## wants this to stay above ~1 m or a raised level feels like a crawlspace.
func headroom(level: String) -> float:
	return ceiling_y - _level_by_id(level).base_y - Tuning.PLAYER_EYE_HEIGHT


func _level_by_id(id: String) -> Level:
	for lvl in levels:
		if lvl.id == id:
			return lvl
	return levels[0]


func _axis_t(axis: String, x: float, z: float, min_x: float, max_x: float, min_z: float, max_z: float) -> float:
	if axis == "x":
		var span_x := max_x - min_x
		return 0.0 if absf(span_x) < MIN_SPAN else (x - min_x) / span_x
	var span_z := max_z - min_z
	return 0.0 if absf(span_z) < MIN_SPAN else (z - min_z) / span_z
