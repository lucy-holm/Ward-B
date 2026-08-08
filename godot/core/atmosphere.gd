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

var _lights: Array[OmniLight3D] = []
var _base_energy: Array[float] = []
var _base_color: Array[Color] = []
var _dip: Array[float] = []
var _clock := 0.0

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
	if room == null:
		return
	_collect(room)


func _collect(node: Node) -> void:
	if node is OmniLight3D:
		var l := node as OmniLight3D
		_lights.append(l)
		_base_energy.append(l.light_energy)
		_base_color.append(l.light_color)
		_dip.append(0.0)
	for child in node.get_children():
		_collect(child)


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
	var unmed := not StateManager.is_lucid()
	_tick_flicker(delta, unmed)
	_tick_fog(unmed)


func _tick_flicker(delta: float, unmed: bool) -> void:
	for i in _lights.size():
		var l := _lights[i]
		if not is_instance_valid(l):
			continue
		var base := _base_energy[i] * _light_scale

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
