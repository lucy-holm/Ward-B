# Ward B audio engine. Every sound is synthesised at startup — no assets.
#
# Ported from src/engine/audio.ts. Like the original, every entry point is
# safe to call every frame and audio is never a dependency: if a stream fails
# to bake, the game plays on in silence.
#
# BUS LAYOUT (the brief asked for a lucid vs unmed bus to crossfade):
#   Master
#    +- Drone   <- the two state drones, crossfaded on state_changed
#    +- SFX     <- one-shots: stinger, clunk, expiry cue
#    +- Threat  <- heartbeat, chase whine, medication warning
# Buses are created at runtime rather than shipped as a .tres so the layout
# is code-reviewable and cannot silently drift from what the code expects.
#
# WHY THIS MATTERS: setThreat()'s footsteps are the ONLY way to track the
# Orderly while lucid, because his mesh is hidden in that state. This is
# load-bearing for the suspense, not polish. Footsteps live on the Orderly
# itself as an AudioStreamPlayer3D (see orderly.gd) so they attenuate and
# pan naturally.
extends Node

const BUS_DRONE := "Drone"
const BUS_SFX := "SFX"
const BUS_THREAT := "Threat"

var _drone_unmed: AudioStreamPlayer
var _drone_lucid: AudioStreamPlayer
var _warning: AudioStreamPlayer
var _whine: AudioStreamPlayer
var _sfx: AudioStreamPlayer
var _heart: AudioStreamPlayer

var _stinger: AudioStreamWAV
var _clunk: AudioStreamWAV
var _expiry: AudioStreamWAV
var _heart_lub: AudioStreamWAV
var _heart_dub: AudioStreamWAV

## Baked once and handed to each Orderly for its spatial footstep player.
var footstep: AudioStreamWAV

var _beat_accum := 0.0
var _warning_on := false
var _enabled := true


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_make_buses()
	_bake()
	_make_players()
	StateManager.state_changed.connect(_on_state_changed)
	_apply_state(StateManager.state, true)


func _make_buses() -> void:
	for bus_name in [BUS_DRONE, BUS_SFX, BUS_THREAT]:
		if AudioServer.get_bus_index(bus_name) != -1:
			continue
		var idx := AudioServer.bus_count
		AudioServer.add_bus(idx)
		AudioServer.set_bus_name(idx, bus_name)
		AudioServer.set_bus_send(idx, "Master")


func _bake() -> void:
	# Drones: unmed is a low sawtooth through a 180 Hz lowpass (a physical,
	# too-close hum); lucid is a thin high sine an order of magnitude quieter.
	var d_unmed := WardAudioSynth.drone(55.0, "saw", 0.028 * 12.0, 180.0)
	var d_lucid := WardAudioSynth.drone(190.0, "sine", 0.006 * 12.0, 0.0)

	_stinger = WardAudioSynth.noise_burst(0.3, 700.0, 0.7, 0.05)
	# Deliberately unmistakable against the player's own shift: a lower,
	# duller burst PLUS a sine falling 140 -> 38 Hz.
	_expiry = WardAudioSynth.mix(
		WardAudioSynth.noise_burst(0.55, 220.0, 0.6, 0.07),
		WardAudioSynth.sweep(0.55, 140.0, 38.0, 0.5, "sine", true))
	_clunk = WardAudioSynth.sweep(0.15, 120.0, 45.0, 0.9, "square", false)
	_heart_lub = WardAudioSynth.sweep(0.12, 62.0, 48.0, 0.8, "sine", true)
	_heart_dub = WardAudioSynth.sweep(0.10, 52.0, 40.0, 0.6, "sine", true)
	footstep = WardAudioSynth.sweep(0.11, 110.0, 58.0, 0.8, "sine", true)

	_drone_unmed = _player(d_unmed, BUS_DRONE, true)
	_drone_lucid = _player(d_lucid, BUS_DRONE, true)
	_warning = _player(
		WardAudioSynth.vibrato_loop(92.0, 3.4, 10.0, 0.022 * 14.0), BUS_THREAT, true)
	_whine = _player(
		WardAudioSynth.vibrato_loop(1650.0, 6.2, 18.0, 0.032 * 10.0), BUS_THREAT, true)


func _make_players() -> void:
	_sfx = _player(null, BUS_SFX, false)
	_heart = _player(null, BUS_THREAT, false)


func _player(stream: AudioStream, bus: String, autoplay: bool) -> AudioStreamPlayer:
	var p := AudioStreamPlayer.new()
	p.stream = stream
	p.bus = bus
	p.volume_db = -80.0
	add_child(p)
	if autoplay and stream != null:
		p.play()
	return p


# --- state -----------------------------------------------------------------

func _on_state_changed(next: StateManager.State, _prev: StateManager.State, _src: String) -> void:
	_apply_state(next, false)


func _apply_state(state: int, instant: bool) -> void:
	var lucid := state == StateManager.State.LUCID
	# The original rode both gains with setTargetAtTime(tau 0.6); a 0.6 s
	# tween is the same crossfade shape.
	_fade(_drone_unmed, 0.0 if lucid else 1.0, instant)
	_fade(_drone_lucid, 1.0 if lucid else 0.0, instant)


func _fade(p: AudioStreamPlayer, level: float, instant: bool, seconds := 0.6) -> void:
	if p == null:
		return
	var target := -80.0 if level <= 0.001 else linear_to_db(level)
	if instant:
		p.volume_db = target
		return
	var tw := create_tween()
	tw.tween_property(p, "volume_db", target, seconds)


# --- one-shots -------------------------------------------------------------

func shift_stinger() -> void:
	_one_shot(_stinger, 0.0)


func medication_expired_cue() -> void:
	_one_shot(_expiry, 3.0)


func dispenser_clunk() -> void:
	_one_shot(_clunk, -2.0)


func _one_shot(stream: AudioStreamWAV, db: float) -> void:
	if not _enabled or stream == null or _sfx == null:
		return
	_sfx.stream = stream
	_sfx.volume_db = db
	_sfx.play()


# --- continuous ------------------------------------------------------------

## Safe to call every frame.
func set_medication_warning(active: bool) -> void:
	if active == _warning_on:
		return
	_warning_on = active
	# Attack is slower than release in the original (tau 0.5 vs 0.6).
	_fade(_warning, 1.0 if active else 0.0, false, 0.5 if active else 0.6)


## Aggregate threat. `ramp` is the max watch level across orderlies (0..1),
## `chasing` whether any is chasing. Footsteps are NOT here — they are
## spatial, on the Orderly. Called every frame by orderly rooms; call
## set_threat(0.0, false) on room leave or the whine bleeds into the next room.
func set_threat(ramp: float, chasing: bool) -> void:
	_fade(_whine, 1.0 if chasing else 0.0, false, 0.1 if chasing else 0.22)

	# Heartbeat only starts once the ramp is meaningfully up, then tightens.
	var intensity := clampf((ramp - 0.3) / 0.7, 0.0, 1.0)
	if intensity <= 0.0:
		_beat_accum = 0.0
		return

	var interval := 1.1 - 0.65 * intensity
	_beat_accum += get_process_delta_time()
	if _beat_accum < interval:
		return
	_beat_accum = 0.0
	_beat(intensity)


func _beat(intensity: float) -> void:
	if _heart == null:
		return
	var db := linear_to_db(clampf(0.02 + 0.06 * intensity, 0.001, 1.0) * 12.0)
	_heart.stream = _heart_lub
	_heart.volume_db = db
	_heart.play()
	# lub-dub: the second beat lands 0.16 s later.
	await get_tree().create_timer(0.16).timeout
	if _heart == null or not is_instance_valid(_heart):
		return
	_heart.stream = _heart_dub
	_heart.volume_db = db
	_heart.play()


# Tidy shutdown of the four looping players (both drones, the warning, the
# whine), which hold a live AudioStreamPlaybackWAV for the whole session.
#
# NOTE: Godot still reports "8 ObjectDB instances were leaked at exit" with
# this in place — verified that this function runs and that the count is
# byte-identical with and without it. The streams/playbacks are released on
# the audio thread AFTER ObjectDB cleanup, so it is an engine teardown
# ordering artifact, not a real leak. Kept anyway: stopping playback on
# teardown is correct regardless, and it documents the intent.
func _exit_tree() -> void:
	for p: AudioStreamPlayer in [_drone_unmed, _drone_lucid, _warning, _whine, _sfx, _heart]:
		if p != null and is_instance_valid(p):
			p.stop()
			p.stream = null


## Hard stop, for room transitions and the end card.
func silence_threat() -> void:
	_fade(_whine, 0.0, true)
	_fade(_warning, 0.0, true)
	_warning_on = false
	_beat_accum = 0.0
