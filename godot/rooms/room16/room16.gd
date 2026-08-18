# ROOM 16 — the Breaker Bay.
#
# THE LIGHT AXIS's only consumer. Ported from src/rooms/room16.ts (spec:
# docs/superpowers/specs/2026-07-19-room16-light-axis-design.md, as reworked by
# Tom's two design overrides). The geometry is generated — see
# tools/gen_rooms.py's room16(), including the two deliberate deviations that
# room documents; this file is the behaviour.
#
# A GENUINE 2x2 OF {lit,dark} x {lucid,unmed}, ALL FOUR CELLS LOAD-BEARING:
#
#              LIT (the default)               DARK (after the switch)
#   UNMED   inkScrawl16 — the only place    phosphorScrawl16 — the only place
#           you learn the breaker exists    you learn what the door wants.
#           at all. CHARGE only accrues     Was physically there the whole
#           here (lit, open bay), so this   time; the light gate just kept it
#           is also the only cell that      invisible. The painted floor path
#           can earn the dark window.       appears with it.
#   LUCID   lightSwitch16 answers — the     exitdoor16 answers — the only
#           only state that can throw it    state it EVER opens in. Every
#           (LIT->DARK, reversible).        other combination gets a refusal
#                                           specific to which half is wrong.
#
# NO KEYPAD AND NO DIGITS ANYWHERE IN THIS ROOM (Tom's design override #1).
# The exit door itself is the terminal interactable, gated on
# main.is_room_dark() + the ward state directly in on_interact below:
# "assemble a code" becomes "assemble a state".
#
# THE LUCID REQUIREMENT ON THE SWITCH IS ROOM POLICY, NOT ENGINE. main
# .set_room_dark() will throw the breaker for anyone; it is this file that
# refuses raw hands, with a toast. A later room wanting a breaker the player
# can slap unmedicated needs no engine change at all.
#
# --- CHARGE / FADE (Tom's design override #2) -------------------------------
#
# He walked in, hit the switch, walked out: the 2x2 was structurally sound but
# nothing stood between "know the switch exists" and "throw it". Fix, in two
# interlocking beats rather than three:
#
#  1. CHARGE (lit, ambient, evasion-gated). The phosphor is paint, not magic —
#     it only holds a useful glow once the room has fed it light. "Fed it
#     light" = CHARGE_FULL_SEC of cumulative time standing in the OPEN Z2 BAY
#     (outside both nooks; Z1 and Z3 are patrol-free and do not count) while
#     the room is lit. That is the ground the patrol actually walks, so
#     charging is not a free wait: the orderly is fully visible throughout
#     (no shift needed), and the tension is timing exposure against a
#     telegraphed threat. Standing still in one spot for 18s is a bad plan;
#     ducking into a nook or back through the Z1 doorway when he is close and
#     re-emerging when he is not is the intended play.
#  2. THROW + FADE (dark, timed). Throwing the breaker snapshots the charge and
#     starts a fade clock whose LENGTH is chargeAtThrow * FADE_MAX_SEC. The
#     paint starts at full brightness and dims linearly to nothing over it.
#     Rushed throw, short window; patient throw, 26s of comfortable room.
#
# THE FADE CAN NEVER STRAND ANYONE, and this is the audit that matters:
# main.set_glow_fade writes OPACITY ONLY (see core/phosphor.gd). It never
# touches the light gate, an Interactable, or a collider. The door is gated on
# is_room_dark() alone and does not care how much paint is left. Dispenser and
# exit glow are materials/glow.tres, not phosphor, so a fully-faded room leaves
# both exactly as visible as a freshly-charged one. Fade threatens your sense
# of DIRECTION across the one leg nothing else lights (NOOK_E back to NOOK_W)
# and nothing else.
#
# --- SOFT-LOCK AUDIT --------------------------------------------------------
#
#  * dispenser16a sits in Z1, behind the room's only ungated doorway (x[-1,1]
#    at z=2), zero patrol reach, reachable from spawn in seconds in EITHER
#    light state. Its slot glow is unshaded, so darkness cannot hide it.
#  * ZERO light-gated colliders, and that is structural rather than a
#    convention: gen_rooms.py's Room.block REFUSES to emit one (see its
#    docstring), core/light_object.gd writes only `visible`, and there is no
#    "solid_lit_only" collision layer to gate. A dark room's WardCollision is
#    byte-identical to a lit one's — asserted in tools/test_room16.gd — so
#    darkness can never seal a pocket and the audit is unconditional.
#  * Zero unmed-sealed colliders either. Every gate here is informational (you
#    do not know the breaker exists until you have read the right cell) or
#    permission-based (switch and door both want lucid) — never a wall that
#    traps a raw player. Worst case from the exit vestibule mouth back to the
#    dispenser is ~19m of walking, exposed, never blocked.
#  * The charge zone is a pure position READ. Standing in it, leaving it, or
#    never entering it has zero effect on where the player can walk.
#  * The switch is a genuine two-way toggle, and it is never light-gated
#    itself: a player who threw it before reading the ink clue, or who threw it
#    under-charged and watched the glow die, walks back and throws it again.
#    Charge never decreases — only the visible glow does — so the retry is
#    strictly better than the first attempt. Never a one-way trap.
#  * A catch force-LIGHTS the room and zeroes charge/fade, so nobody ever
#    resumes at spawn in a half-dark, half-charged limbo.
#
# --- REACTION-TIME AUDIT ----------------------------------------------------
#
# The >=8.2m inspection-distance rule governs places the player stops to READ
# something while unmed. This room has exactly one: NOOK_W (both scrawls; the
# switch and the door are only ever operated lucid, where chasing is
# impossible). The nooks are 3.2m square chambers behind a 1.6m mouth in this
# port (see gen_rooms.py's deviation note), which puts the end cap the scrawls
# are on 6.05m from the nearest patrol leg — past his 6.0m sight range outright
# — behind a mouth exactly as narrow as the original's, that he can only see a
# thin cone through. Unlike the Three.js build, occlusion here is a raycast
# against the real chamber walls rather than an authored AABB, so that geometry
# IS the protection rather than a description of it.
#
# The charge zone (the open bay) is deliberately given NO such protection. That
# is the entire point, per room 14's precedent: the room's gameplay is evasion,
# not an inspection point. Nothing forces the player to stand still, and the
# nearest bail-out — either nook, or back through the ungated doorway — is
# never more than a few metres from any point in the bay.
#
# --- WHAT DARKNESS DOES NOT DO ----------------------------------------------
#
# It does not touch the orderly's perception. No sight_range override, no cone
# widening, no grace change — the spec argues this at length and lands on "no
# change" deliberately, not by omission. The reason is that the cues a player
# actually reacts to are already lighting-independent by construction: his
# sight cone and the threat HUD are unshaded/UI, so they read identically at
# 12% light. His BODY does go hard to make out at range in the dark, which is
# accepted as atmosphere — he is a shape you barely place until he is close —
# because the warning system is the cone and the meter, not the silhouette.
extends Node3D

const ORDERLY := preload("res://orderly/orderly.tscn")

# Spawn, and the catch-reset point: Z1, behind the partition, out of reach.
const SPAWN_X := 0.0
const SPAWN_Z := 5.0

# One orderly, unmodified Tuning, looping the bay. Inset 3m from the x=+-8 side
# walls and ~0.9m off the north wall, clearing the body radius with wide
# margin (check_rooms.gd's rule, re-run against this room in test_room16.gd
# because room 16 is not in ROOM_SCENES yet). Perimeter ~47m, ~34.5s a lap at
# 1.5 m/s with the four waypoint pauses — CHARGE_FULL_SEC is deliberately about
# half of that, so "fed the room" is legible in-fiction as "about as long as
# watching him cross the bay and start back".
const WAYPOINTS: Array[Vector3] = [
	Vector3(5, 0, 0.5),
	Vector3(5, 0, -13),
	Vector3(-5, 0, -13),
	Vector3(-5, 0, 0.5),
]

# --- charge / fade tuning ---------------------------------------------------

## Cumulative seconds in the open bay, while lit, for a full charge. Chosen so
## one confident sprint across the bay (~16m at 3.4 m/s, ~4.7s) cannot max it
## out by accident — full charge needs real dwelling and looping.
const CHARGE_FULL_SEC := 18.0

## The dark window at FULL charge. Its job is to cover the one leg nothing else
## lights: NOOK_E's mouth to NOOK_W, ~16.5m, ~4.9s of walking plus read time.
## 26s is >5x that on purpose (the same "give it real room" instinct behind a
## 45s medication window for a single lucid errand). A partial charge scales it
## linearly, so a 30% throw buys ~7.8s: survivable for a player who knows the
## room, punishing for one who does not, never fatal.
const FADE_MAX_SEC := 26.0

# Z2's bounds. Z1 (z >= 2) and Z3 (z <= -14) are structurally patrol-free, so
# they are excluded on purpose: charge only counts on ground he walks.
const CHARGE_ZONE_Z_MAX := 2.0
const CHARGE_ZONE_Z_MIN := -14.0

# The two occluder nooks, excluded from the charge zone for the same reason:
# they are the room's cover, and cover must not also be progress.
const NOOK_W := Rect2(Vector2(-11.2, -9.6), Vector2(3.2, 3.2))
const NOOK_E := Rect2(Vector2(8.0, -5.6), Vector2(3.2, 3.2))

## Below this, the throw-time toast already told the player the paint is
## unfed; the per-frame warn/gone toasts would just repeat it a beat later.
const FADE_TOAST_MIN_CHARGE := 0.15

# --- the door ---------------------------------------------------------------

const DOOR_CLOSED_POS := Vector3(0.0, 1.5, -14.0)
# A 90-degree swing about the hinge edge (x=-1), 0.85m clear of the wall, so
# the slab lies flat against the vestibule wall instead of standing in the
# doorway. Same figure room 15's lock uses.
const DOOR_OPEN_POS := Vector3(-1.0, 1.5, -14.85)

# --- the lever --------------------------------------------------------------
# fixtures/breaker.tscn hangs its handle off a pivot node named "Lever" for
# exactly this: throwing the breaker rotates the pivot, not the fixture. The
# Three.js build reused ctx.moveInteractable to swing the whole switch; here
# that would rotate the Area3D and its faceplate too, so the model owns the
# moving part and this only writes an angle onto it.
# Both angles are POSITIVE, and both were computed rather than eyeballed. The
# pivot sits at the bolt (local z -0.092) and the handle hangs below it, so
# rotating about X sweeps the knob through an arc in the YZ plane:
#     z_world(a) = -0.092 + (-0.245 sin a - 0.032 cos a)
# The panel body's front face is at z = -0.08. The first cut used +-0.42, and
# at -0.42 that puts the knob at z = -0.021 — INSIDE the body, which
# screenshotted as a breaker with no lever on it at all. 0.90 and 0.20 keep the
# knob at -0.304 and -0.172, both well proud, while still reading as the
# obvious thing: LIT is the lever standing up and out, DARK is the lever
# dropped down against the plate.
const LEVER_LIT := 0.90
const LEVER_DARK := 0.20

var _main: Node = null
var _orderly: CharacterBody3D = null

var _door_open := false
var _saw_unmed_toast := false

# Charge/fade state. `_charge` is monotonic while the room is lit and never
# decreases from fading — only the visible glow does.
var _charge := 0.0
var _charge_at_throw := 0.0
var _fade_elapsed := 0.0
var _saw_charge_start_toast := false
var _saw_full_charge_toast := false
var _saw_fade_warn_toast := false
var _saw_fade_gone_toast := false


func on_enter(main: Node) -> void:
	_main = main
	_door_open = false
	_saw_unmed_toast = false

	# The room opens LIT, which is also what the scene authors (no
	# metadata/start_dark), so main.load_room has already reset the axis before
	# this node was ever added to the tree. Asserting it here anyway is cheap
	# and makes a re-entry after a mid-room exit impossible to get wrong.
	_main.set_room_dark(false)
	_reset_charge_fade()
	_set_lever(false)

	_spawn_orderly()

	_main.hud_objective(
		"the wing keeps its lights on for a reason. find out what it's hiding it from.")


func on_leave() -> void:
	if _main != null:
		_main.set_threat(0.0, null)
	if _orderly != null:
		_orderly.queue_free()
		_orderly = null


func on_state_change(next: StateManager.State) -> void:
	if _main == null:
		return
	if next == StateManager.State.UNMED and not _saw_unmed_toast:
		_saw_unmed_toast = true
		_main.hud_toast("something throws a shadow that keeps his shape, even with the lights out.")


# --- the 2x2 ---------------------------------------------------------------

func on_interact(id: String) -> bool:
	if _main == null:
		return false

	if id == "lightSwitch16":
		# ROOM POLICY, not engine — see the header.
		if not StateManager.is_lucid():
			_main.hud_toast("cold iron. it won't answer to raw hands.")
			return true
		_throw_breaker(not _main.is_room_dark())
		return true

	if id == "exitdoor16":
		if _door_open:
			return true  # already open — walking into the exit AABB does the rest
		if not StateManager.is_lucid():
			_main.hud_toast("you press against it. nothing. it isn't yours to open like this.")
			return true
		if not _main.is_room_dark():
			_main.hud_toast("a flare of white. your hand finds nothing to hold onto.")
			return true
		_open_door()
		return true

	return false


func _throw_breaker(dark: bool) -> void:
	_main.set_room_dark(dark)
	_set_lever(dark)
	Telemetry.event("light_switch", {"dark": dark, "charge": _charge})

	if not dark:
		_main.hud_toast("fluorescents stutter, then hold. it's too bright in here now.")
		return

	# The window's length is fixed at the instant of the throw. Charging
	# further while already dark does nothing until the NEXT throw snapshots a
	# fresh (possibly higher) value — which is what makes "go relight it and
	# feed it more" a real, and better, retry rather than a formality.
	_charge_at_throw = _charge
	_fade_elapsed = 0.0
	_saw_fade_warn_toast = false
	_saw_fade_gone_toast = false
	_main.set_glow_fade(1.0)

	if _charge_at_throw >= 0.8:
		_main.hud_toast("the hum dies. the paint answers back, fat and green.")
	elif _charge_at_throw >= 0.35:
		_main.hud_toast("the hum dies. the paint's thin — it won't hold long.")
	else:
		_main.hud_toast("the hum dies. the paint barely stirs. it won't hold this dark at all.")


func _open_door() -> void:
	# lucid + dark — the only cell this ever answers to. The fade dial has zero
	# say here: the door does not care how much paint is left, only whether the
	# room is dark.
	_door_open = true
	_main.move_interactable("exitdoor16", DOOR_OPEN_POS, PI / 2.0)
	_main.unlock_door("DoorCollider")
	_main.hud_toast("cold steel gives way in the dark. calm hands, calm eyes.")
	_main.hud_objective("the dark kept its half of the bargain. so did you.")


## Rotates fixtures/breaker.tscn's lever pivot. Cosmetic; the axis is already
## thrown by the time this runs.
func _set_lever(dark: bool) -> void:
	var lever := find_child("Lever", true, false)
	if lever is Node3D:
		(lever as Node3D).rotation.x = LEVER_DARK if dark else LEVER_LIT


# --- charge / fade ----------------------------------------------------------

## True while (x,z) is on ground the charge mechanic counts: the open Z2 bay,
## outside both occluder nooks. A pure position read — never a collider, never
## a gate. See the header's soft-lock audit.
func in_charge_zone(x: float, z: float) -> bool:
	if z >= CHARGE_ZONE_Z_MAX or z <= CHARGE_ZONE_Z_MIN:
		return false
	var p := Vector2(x, z)
	if NOOK_W.has_point(p) or NOOK_E.has_point(p):
		return false
	return true


func _reset_charge_fade() -> void:
	_charge = 0.0
	_charge_at_throw = 0.0
	_fade_elapsed = 0.0
	_saw_charge_start_toast = false
	_saw_full_charge_toast = false
	_saw_fade_warn_toast = false
	_saw_fade_gone_toast = false
	if _main != null:
		_main.set_glow_fade(1.0)


## Exposed for tools/test_room16.gd, which drives the loop by hand.
func charge() -> float:
	return _charge


func glow_level() -> float:
	if not _main.is_room_dark():
		return 1.0
	var window := maxf(0.001, _charge_at_throw * FADE_MAX_SEC)
	return maxf(0.0, 1.0 - _fade_elapsed / window)


## The charge/fade clock. Split out of _physics_process so the test can step it
## with a fixed dt instead of racing the real frame rate.
func tick_light(delta: float) -> void:
	if _main == null:
		return

	if not _main.is_room_dark():
		var p: Vector3 = _main.player.global_position
		if _charge < 1.0 and in_charge_zone(p.x, p.z):
			if _charge == 0.0 and not _saw_charge_start_toast:
				_saw_charge_start_toast = true
				_main.hud_toast("the room feeds the paint. give it time.")
			_charge = minf(1.0, _charge + delta / CHARGE_FULL_SEC)
			if _charge >= 1.0 and not _saw_full_charge_toast:
				_saw_full_charge_toast = true
				_main.hud_toast("the floor's drunk all the light it can hold.")
		return

	_fade_elapsed += delta
	var level := glow_level()
	_main.set_glow_fade(level)

	if _charge_at_throw < FADE_TOAST_MIN_CHARGE:
		return  # the throw-time toast already said enough
	if level <= 0.3 and not _saw_fade_warn_toast:
		_saw_fade_warn_toast = true
		_main.hud_toast("the paint drinks the light. it forgets fast.")
	if level <= 0.0 and not _saw_fade_gone_toast:
		_saw_fade_gone_toast = true
		_main.hud_toast("the dark just took the last of it back.")


func _physics_process(delta: float) -> void:
	if _main == null:
		return

	tick_light(delta)

	if _orderly != null:
		var level: float = _orderly.watching()
		if level > 0.0 or _orderly.is_chasing():
			_main.set_threat(level, _orderly.bearing_from(_main.player.yaw))
		else:
			_main.set_threat(0.0, null)


# --- the orderly ------------------------------------------------------------

func _spawn_orderly() -> void:
	if _orderly != null:
		_orderly.queue_free()
		_orderly = null

	_orderly = ORDERLY.instantiate()
	# Waypoints before add_child: Orderly._ready() snaps him to waypoints[0].
	_orderly.waypoints = WAYPOINTS.duplicate()
	add_child(_orderly)
	_orderly.setup(_main.player, _main.collision)

	_orderly.warned.connect(_on_warned)
	_orderly.chase_started.connect(_on_chase_started)
	_orderly.caught.connect(_on_caught)


func _on_warned() -> void:
	_main.hud_toast("he is looking at you.")
	Telemetry.event("orderly_spotted")


func _on_chase_started() -> void:
	_main.hud_toast("run. or stop being visible.")
	Telemetry.event("orderly_chase")


# Telemetry FIRST: the event snapshots player position at emit time, so
# emitting after the teleport would record the spawn point for every catch.
#
# THE LIGHT AXIS IS RESET HERE, and it is the reason this handler exists at all
# beyond the standard penalty: a player must never resume at spawn in a
# half-dark, half-charged, mid-fade limbo they did not choose. Force a known
# state — lit, unpainted, uncharged — matching how the room itself starts.
# Charge deliberately goes back to ZERO rather than being kept: a catch costs
# the walk AND the paint, which is the only price this room's one hazard
# actually charges.
func _on_caught() -> void:
	Telemetry.event("orderly_caught")
	StateManager.force_state(StateManager.State.LUCID, "catch")
	_main.shift_fx()
	_main.teleport_player(SPAWN_X, SPAWN_Z)
	_main.set_room_dark(false)
	_set_lever(false)
	_reset_charge_fade()
	_main.hud_toast('hands. a needle. "lights out," he says.')
