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
const FLICKER_RATE_HZ := 3.2
const FLICKER_DIP := 0.25
const FLICKER_RECOVER := 8.0   # how fast intensity eases back to base

const FOG_BREATH_HZ := 0.5
const FOG_BREATH_AMOUNT := 0.05

var _lights: Array[OmniLight3D] = []
var _base_energy: Array[float] = []
var _dip: Array[float] = []
var _clock := 0.0

var _env: Environment = null
var _fog_begin_base := 0.0
var _fog_end_base := 0.0


func bind_environment(env: Environment) -> void:
	_env = env


## Re-scan after a room loads. Room lights live under the room's "Lights" node.
func collect_lights(room: Node) -> void:
	_lights.clear()
	_base_energy.clear()
	_dip.clear()
	if room == null:
		return
	_collect(room)


func _collect(node: Node) -> void:
	if node is OmniLight3D:
		var l := node as OmniLight3D
		_lights.append(l)
		_base_energy.append(l.light_energy)
		_dip.append(0.0)
	for child in node.get_children():
		_collect(child)


func _process(delta: float) -> void:
	_clock += delta
	var unmed := not StateManager.is_lucid()
	_tick_flicker(delta, unmed)
	_tick_fog(unmed)


func _tick_flicker(delta: float, unmed: bool) -> void:
	for i in _lights.size():
		var l := _lights[i]
		if not is_instance_valid(l):
			continue
		var base := _base_energy[i]

		if unmed:
			# Poisson-ish: probability of a dip starting this frame, scaled by
			# dt so the rate is per-second rather than per-frame.
			if _dip[i] <= 0.0 and randf() < FLICKER_RATE_HZ * delta:
				_dip[i] = randf_range(0.04, 0.10)
			if _dip[i] > 0.0:
				_dip[i] -= delta

		var target := base
		if unmed:
			# A slow wobble under the dips, offset per-light so a corridor of
			# tubes never pulses in unison.
			target *= 0.8 + 0.2 * sin(_clock * 13.0 + i * 7.0)
			if _dip[i] > 0.0:
				target *= FLICKER_DIP
		l.light_energy = lerpf(l.light_energy, target, minf(1.0, delta * FLICKER_RECOVER))


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
