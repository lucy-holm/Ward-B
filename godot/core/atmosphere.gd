# Per-frame world mood: fluorescent flicker and fog "breathing".
#
# Ported from src/engine/renderer.ts:195-204. Both effects are UNMEDICATED
# ONLY — lucid is meant to feel clinically steady, and the contrast is the
# point. The Environment crossfade itself lives in main.gd; this is the
# live-motion layer on top of it.
#
# PORT NOTE — deliberate correction: the original rolled its flicker as a
# per-FRAME probability (6% of frames), which made the flicker rate scale
# with framerate: noticeably busier at 144fps than at 60. Here it is a
# per-SECOND rate, so the ward looks the same on a phone and a desktop.
# Same for the fog breathing, which is driven off elapsed time either way.
class_name Atmosphere
extends Node

# Chance per second that a given fluorescent dips. The original's 6%-per-frame
# at ~60fps works out near this.
const FLICKER_RATE_HZ := 2.6
const FLICKER_DIP := 0.10        # how far a dip drops (was 0.25 — too polite)
const FLICKER_RECOVER := 14.0    # snap back fast; a tube does not fade in

# Occasional full dropout: a failing tube cuts out for a beat rather than just
# stuttering. Rare enough to stay unsettling instead of strobing.
const DROPOUT_RATE_HZ := 0.22
const DROPOUT_MIN_SEC := 0.12
const DROPOUT_MAX_SEC := 0.45

# Constant low-level flutter so a tube is never perfectly still even between
# dips — this is what sells "failing fluorescent" rather than "lamp with an
# effect on it".
const BUZZ_AMOUNT := 0.10
const BUZZ_HZ := 17.0

const FOG_BREATH_HZ := 0.5
const FOG_BREATH_AMOUNT := 0.05

# --- THE LIGHT AXIS: circuits ------------------------------------------------
#
# THE PROBLEM THIS SOLVES. _tick_flicker below writes light_energy and
# light_color on EVERY collected light EVERY frame, from snapshots
# (_base_energy/_base_color) taken in collect_lights(), which itself re-runs on
# every load_room. So the obvious implementation of a breaker — "the switch
# sets light_energy = 0" — is stomped on the very next frame and is gone
# entirely after a reload. Whatever holds the off-state has to live where this
# loop can READ it, not where this loop can overwrite it.
#
# WHY NOT A SINGLE GLOBAL DARK FLAG ON THIS NODE. It would fix the stomping (a
# flag read by the loop is not a value written by it) but it fixes nothing
# else, and it hard-codes "the whole room, or nothing" into the engine — the
# one question the light-axis design doc explicitly leaves open (its open
# question 6: does a later room want per-zone lighting?). Retrofitting per-zone
# onto a global bool means touching this loop again.
#
# WHY NOT PER-LIGHT STATE KEYED BY INDEX OR NAME. Indices are rebuilt from
# scratch by every collect_lights and mean nothing across a reload. Names are
# no better: gen_rooms.py emits "L0", "L0_bounce", "L1"... positionally, so
# inserting one fitting renumbers every light after it, and a switch that
# remembered "L3 is off" would silently point at a different fixture.
#
# WHAT IT IS INSTEAD: OWNERSHIP BY CIRCUIT.
#
# Every light belongs to a named circuit, authored as `metadata/circuit` on the
# node itself (same convention as `metadata/level` on colliders — a room-local
# string tag on the node, visible and editable in the inspector, and it
# survives an editor round-trip). Circuits default to "house", so every room
# that predates this axis is on one circuit that nothing ever switches, and is
# byte-identical in behaviour.
#
# The off-state then belongs to the CIRCUIT, not to a light, an index, or a
# node instance:
#
#   * _tick_flicker READS the circuit's scale and folds it into `base` before
#     any flicker math, so its per-frame writes carry the breaker rather than
#     fighting it. A dark room still buzzes and dips — proportionally, at 12%
#     — which is what sells failing emergency power over a hard cut.
#   * collect_lights() re-attaches by NAME, so a room reload rebuilds every
#     array from the fresh nodes and the circuit that was off is still off. The
#     state was never in the arrays.
#   * The scale EASES toward its target (CIRCUIT_EASE, deliberately the 2.2/s
#     of the Three.js renderer's mood lerp rather than the 12.0/s the ward
#     state uses) so throwing the breaker is a felt ~0.45s fade, not a cut.
#   * Two circuits in one room are independently switchable for free, which is
#     the per-zone capability, unused by room 16 and unblocked for room 17+.
#
# Atmosphere is ATMOSPHERE ONLY. None of this gates a mesh, a raycast or a
# collider — the deterministic visibility half of the light axis is
# core/light_object.gd, and the reason it is separate is that dynamic light can
# never make an UNSHADED thing (scrawls, glow panels, the phosphor paint) dim,
# so legibility has to be an explicit gate. See autoload/room_light.gd.

## What an off circuit's fittings scale to. Not 0: the Three.js renderer
## multiplied its point lights by this while dark (renderer.ts's
## DARK_MULTIPLIER) rather than killing them, so a dark room keeps a trace of
## shape instead of becoming a pure void the player cannot navigate.
const DARK_CIRCUIT_SCALE := 0.12

## Per-second ease rate toward a circuit's target scale. 2.2 is the Three.js
## renderer's mood-lerp rate (k = dt * 2.2, time constant ~0.45s) and is
## deliberately much slower than the 12.0 _light_scale uses for ward state:
## a ward shift should snap, a breaker should fade.
const CIRCUIT_EASE := 2.2

## Every light that does not say otherwise.
const DEFAULT_CIRCUIT := "house"

var _lights: Array[OmniLight3D] = []
var _base_energy: Array[float] = []
var _base_color: Array[Color] = []
var _dip: Array[float] = []
var _clock := 0.0

# Parallel to _lights: which circuit each collected fitting is on. Rebuilt by
# collect_lights, exactly like the other three arrays.
var _circuit: Array[String] = []
# name -> {"scale": float, "target": float}. NOT rebuilt by collect_lights —
# this is the state that has to outlive it. Entries are added when a circuit is
# first seen and then kept: circuit names are a handful of authored strings for
# the whole game, so nothing grows without bound, and keeping them is what lets
# a room reloaded while dark come back dark.
var _circuits := {}
# The circuit names present in the CURRENTLY loaded room, so set_all_circuits
# ("the breaker for the whole bay") cannot reach into a stale name left behind
# by a room that is no longer in the tree.
var _present_circuits: Array[String] = []

var _env: Environment = null
var _fog_begin_base := 0.0
var _fog_end_base := 0.0

# Per-state multiplier on every fitting's base energy. Ambient alone cannot
# make a room read as unlit — drop it far enough and the light POOLS stay
# bright, which looks like a dim room rather than a failing one. Dimming the
# fittings too is what sells "barely visible".
var _light_scale := 1.0
var _light_scale_target := 1.0

# Per-state multiplier on every fitting's base COLOR (Color * Color,
# component-wise), same ease-toward-target treatment as _light_scale. This is
# what actually makes UNMED fixtures read as sickly rather than merely dim —
# a light dimmed but left neutral-white just looks like a dimmer version of
# the same clean bulb. Applied on top of each fitting's own authored color, so
# the warm amber floor "bounce" fixtures and the cool-white ceiling tubes tint
# together but keep their relative difference (2026-08 lighting pass).
var _light_tint := Color(1, 1, 1)
var _light_tint_target := Color(1, 1, 1)


func bind_environment(env: Environment) -> void:
	_env = env


## Re-scan after a room loads. Room lights live under the room's "Lights" node.
func collect_lights(room: Node) -> void:
	_lights.clear()
	_base_energy.clear()
	_base_color.clear()
	_dip.clear()
	_circuit.clear()
	_present_circuits.clear()
	if room == null:
		return
	_collect(room)
	# Deliberately NOT clearing _circuits: see its declaration. A circuit that
	# was switched off before this reload is still off after it, and the fresh
	# light nodes pick that up by name on their very first frame.


func _collect(node: Node) -> void:
	if node is OmniLight3D:
		var l := node as OmniLight3D
		_lights.append(l)
		_base_energy.append(l.light_energy)
		_base_color.append(l.light_color)
		_dip.append(0.0)
		var circuit := str(node.get_meta("circuit", DEFAULT_CIRCUIT))
		_circuit.append(circuit)
		if not _circuits.has(circuit):
			_circuits[circuit] = {"scale": 1.0, "target": 1.0}
		if not _present_circuits.has(circuit):
			_present_circuits.append(circuit)
	for child in node.get_children():
		_collect(child)


## Throw one named circuit. `instant` skips the fade — used on room load, where
## a room authored to open dark must already BE dark on its first frame rather
## than visibly dimming as the player arrives.
func set_circuit_on(circuit: String, on: bool, instant := false) -> void:
	if not _circuits.has(circuit):
		_circuits[circuit] = {"scale": 1.0, "target": 1.0}
	var target := 1.0 if on else DARK_CIRCUIT_SCALE
	_circuits[circuit]["target"] = target
	if instant:
		_circuits[circuit]["scale"] = target


## Throw every circuit in the CURRENT room at once — "someone threw the breaker
## for the whole bay", which is what the room-wide light axis actually is (see
## the design doc's "why room-wide, not per-zone"). A future per-zone room calls
## set_circuit_on directly instead; nothing here needs to change for it.
func set_all_circuits(on: bool, instant := false) -> void:
	for circuit in _present_circuits:
		set_circuit_on(circuit, on, instant)


## Current eased scale of a circuit, 1.0 when nothing has ever switched it.
## Exists for tools/test_room16.gd, which has no other way to see this.
func circuit_scale(circuit: String) -> float:
	if not _circuits.has(circuit):
		return 1.0
	return float(_circuits[circuit]["scale"])


## The circuits the loaded room actually declares, in first-seen order.
func present_circuits() -> Array[String]:
	return _present_circuits.duplicate()


## Set by main.gd from the MOOD table on every state change.
func set_light_scale(scale: float, instant: bool) -> void:
	_light_scale_target = scale
	if instant:
		_light_scale = scale


## Set by main.gd from the MOOD table on every state change. `tint` multiplies
## each fitting's own authored light_color component-wise every frame in
## _tick_flicker, so a room reload (which re-reads _base_color from the fresh
## nodes) can never lose the tint.
func set_light_color(tint: Color, instant: bool) -> void:
	_light_tint_target = tint
	if instant:
		_light_tint = tint


func _process(delta: float) -> void:
	_clock += delta
	# Ease toward the target so the fittings dim/brighten with the mood tween
	# rather than snapping a frame before it.
	#
	# Rate raised 3.0 -> 12.0 in the 2026-08 lighting pass: UNMED's light_scale
	# dropped 0.45 -> 0.30 (see main.gd's MOOD comment), which made the
	# UNMED -> LUCID swing noticeably bigger than before. At the old rate that swing was still visibly settling a couple
	# of seconds after the state change — tools/test_flicker.tscn caught it
	# as a spread violation on the "lucid should read steady" assertion,
	# since it samples shortly after switching. 12.0 (time constant ~0.08s)
	# fully settles well inside a couple of frames — still reads as a snappy
	# transition, not a hard cut, and matches the ~0.45s mood crossfade
	# without lagging behind it.
	_light_scale = lerpf(_light_scale, _light_scale_target, minf(1.0, delta * 12.0))
	# Same rate as _light_scale so the colour cast and the brightness settle
	# together — a tint arriving after the energy already has would read as a
	# visible second event instead of one crossfade.
	_light_tint = _light_tint.lerp(_light_tint_target, minf(1.0, delta * 12.0))
	# Circuits ease on their own, much slower rate — see CIRCUIT_EASE.
	for circuit in _circuits:
		var c: Dictionary = _circuits[circuit]
		c["scale"] = lerpf(c["scale"], c["target"], minf(1.0, delta * CIRCUIT_EASE))
	var unmed := not StateManager.is_lucid()
	_tick_flicker(delta, unmed)
	_tick_fog(unmed)


func _tick_flicker(delta: float, unmed: bool) -> void:
	for i in _lights.size():
		var l := _lights[i]
		if not is_instance_valid(l):
			continue
		# THE LIGHT AXIS, folded in here and nowhere else. Read, never written:
		# this loop owns light_energy, so the breaker cannot be a write to it
		# (it would be stomped on the next frame). It is a multiplier on the
		# base the loop is already deriving everything else from, which means
		# a dark room still buzzes, dips and drops out — at 12% — instead of
		# freezing at a flat value. See the CIRCUITS block at the top.
		var base := _base_energy[i] * _light_scale * _circuit_scale_at(i)

		if unmed:
			# Poisson-ish: probability of a dip starting this frame, scaled by
			# dt so the rate is per-second rather than per-frame.
			if _dip[i] <= 0.0 and randf() < FLICKER_RATE_HZ * delta:
				_dip[i] = randf_range(0.04, 0.10)
			# A rarer, longer cut — reuses the same latch with a bigger value.
			if _dip[i] <= 0.0 and randf() < DROPOUT_RATE_HZ * delta:
				_dip[i] = randf_range(DROPOUT_MIN_SEC, DROPOUT_MAX_SEC)
			if _dip[i] > 0.0:
				_dip[i] -= delta

		var target := base
		if unmed:
			# Mains buzz: a fast, shallow flutter, phase-offset per light so a
			# corridor of tubes never pulses in unison.
			target *= 1.0 - BUZZ_AMOUNT * (0.5 + 0.5 * sin(_clock * BUZZ_HZ + i * 2.4))
			# Slow wobble underneath, so the flutter rides on a drifting level.
			target *= 0.85 + 0.15 * sin(_clock * 1.7 + i * 7.0)
			if _dip[i] > 0.0:
				target *= FLICKER_DIP
		l.light_energy = lerpf(l.light_energy, target, minf(1.0, delta * FLICKER_RECOVER))

		# Tint every frame, not just on state change: _light_tint is itself
		# still easing toward _light_tint_target most frames (see _process),
		# so this is what makes the colour crossfade smooth instead of a hard
		# cut. Multiplied against the fitting's OWN authored colour (captured
		# in collect_lights), not overwritten — a warm amber floor bounce and
		# a cool ceiling tube stay distinct fixtures, they just both pick up
		# the state's cast.
		l.light_color = _base_color[i] * _light_tint


## Circuit scale for collected light `i`. Defensive about a short _circuit
## array (a light added to the room AFTER collect_lights ran — nothing does
## that today, but a room script spawning a fixture would) rather than
## indexing out of bounds mid-frame.
func _circuit_scale_at(i: int) -> float:
	if i >= _circuit.size():
		return 1.0
	return circuit_scale(_circuit[i])


func _tick_fog(unmed: bool) -> void:
	if _env == null:
		return
	if _fog_end_base <= 0.0:
		return
	if not unmed:
		return
	# Applied on top of the mood tween's base values so the breathing never
	# fights the lucid/unmed crossfade.
	var b := 1.0 + FOG_BREATH_AMOUNT * sin(_clock * TAU * FOG_BREATH_HZ)
	_env.fog_depth_begin = _fog_begin_base * b
	_env.fog_depth_end = _fog_end_base * b


## main.gd calls this whenever the mood tween settles, so breathing tracks
## the current state's base fog rather than drifting off the last one.
func set_fog_base(begin: float, end: float) -> void:
	_fog_begin_base = begin
	_fog_end_base = end
