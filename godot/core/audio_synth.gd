# Procedural audio baking. No sample assets — every sound in Ward B is
# synthesised, exactly as the WebAudio original was (src/engine/audio.ts).
#
# The original built graphs live in WebAudio (oscillator -> filter -> gain).
# Pushing samples from GDScript every frame via AudioStreamGenerator would be
# the literal translation and is far too expensive on a web export, so
# instead we bake short AudioStreamWAV buffers ONCE at startup and let the
# engine's mixer do the work. Continuous sounds are baked as seamless loops
# and driven by bus volume; rhythmic ones are one-shots on a timer.
#
# 22050 Hz mono is plenty: nothing here exceeds ~1.7 kHz, and it keeps both
# the wasm heap and the web CPU budget small.
class_name WardAudioSynth
extends RefCounted

const RATE := 22050


static func _to_wav(samples: PackedFloat32Array, loop: bool) -> AudioStreamWAV:
	var bytes := PackedByteArray()
	bytes.resize(samples.size() * 2)
	for i in samples.size():
		var v := clampf(samples[i], -1.0, 1.0)
		var s := int(v * 32767.0)
		bytes.encode_s16(i * 2, s)

	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = RATE
	wav.stereo = false
	wav.data = bytes
	if loop:
		wav.loop_mode = AudioStreamWAV.LOOP_FORWARD
		wav.loop_begin = 0
		wav.loop_end = samples.size()
	return wav


# --- primitives ------------------------------------------------------------

## Biquad bandpass, used to shape noise bursts the way the original's
## BiquadFilterNode did.
static func _bandpass(src: PackedFloat32Array, freq: float, q: float) -> PackedFloat32Array:
	var w0 := TAU * freq / RATE
	var alpha := sin(w0) / (2.0 * q)
	var b0 := alpha
	var b1 := 0.0
	var b2 := -alpha
	var a0 := 1.0 + alpha
	var a1 := -2.0 * cos(w0)
	var a2 := 1.0 - alpha

	var out := PackedFloat32Array()
	out.resize(src.size())
	var x1 := 0.0
	var x2 := 0.0
	var y1 := 0.0
	var y2 := 0.0
	for i in src.size():
		var x0 := src[i]
		var y0 := (b0 / a0) * x0 + (b1 / a0) * x1 + (b2 / a0) * x2 \
			- (a1 / a0) * y1 - (a2 / a0) * y2
		out[i] = y0
		x2 = x1
		x1 = x0
		y2 = y1
		y1 = y0
	return out


static func _lowpass(src: PackedFloat32Array, freq: float) -> PackedFloat32Array:
	# One-pole; the original used a gentle 12 dB filter on the drones and the
	# exact slope is not load-bearing.
	var dt := 1.0 / RATE
	var rc := 1.0 / (TAU * freq)
	var a := dt / (rc + dt)
	var out := PackedFloat32Array()
	out.resize(src.size())
	var prev := 0.0
	for i in src.size():
		prev = prev + a * (src[i] - prev)
		out[i] = prev
	return out


# --- bakes -----------------------------------------------------------------

## Seamless looping drone. `wave` is "sine" or "saw". The loop length is
## rounded to a whole number of cycles so it does not click.
static func drone(freq: float, wave: String, amp: float, lowpass_hz: float) -> AudioStreamWAV:
	var cycles := maxi(1, int(round(freq * 2.0)))       # ~2 s
	var count := int(round(cycles * RATE / freq))
	var samples := PackedFloat32Array()
	samples.resize(count)
	for i in count:
		var phase := fmod(float(i) * freq / RATE, 1.0)
		var v := 0.0
		if wave == "saw":
			v = 2.0 * phase - 1.0
		else:
			v = sin(phase * TAU)
		samples[i] = v * amp
	if lowpass_hz > 0.0:
		samples = _lowpass(samples, lowpass_hz)
	return _to_wav(samples, true)


## Frequency-swept tone with a linear or exponential amplitude decay.
static func sweep(dur: float, f0: float, f1: float, amp: float,
		wave := "sine", exp_decay := false) -> AudioStreamWAV:
	var count := int(dur * RATE)
	var samples := PackedFloat32Array()
	samples.resize(count)
	var phase := 0.0
	for i in count:
		var t := float(i) / count
		var f: float = lerpf(f0, f1, t)
		phase += f / RATE
		var v := 0.0
		if wave == "square":
			v = 1.0 if fmod(phase, 1.0) < 0.5 else -1.0
		else:
			v = sin(fmod(phase, 1.0) * TAU)
		var env := pow(1.0 - t, 3.0) if exp_decay else (1.0 - t)
		samples[i] = v * amp * env
	return _to_wav(samples, false)


## Band-passed noise burst with a linear decay — the shift stinger and the
## medication-expiry cue are both built from this.
static func noise_burst(dur: float, band_hz: float, q: float, amp: float) -> AudioStreamWAV:
	var count := int(dur * RATE)
	var raw := PackedFloat32Array()
	raw.resize(count)
	var rng := RandomNumberGenerator.new()
	rng.seed = int(band_hz * 1000.0)  # deterministic: same cue every session
	for i in count:
		raw[i] = rng.randf_range(-1.0, 1.0) * (1.0 - float(i) / count)
	var filtered := _bandpass(raw, band_hz, q)
	for i in filtered.size():
		filtered[i] *= amp * 6.0  # bandpass costs a lot of level; restore it
	return _to_wav(filtered, false)


## Two mixed layers, summed sample-wise. Used for the expiry cue, which is a
## noise burst PLUS a falling sine — deliberately unmistakable against the
## player's own shift stinger.
static func mix(a: AudioStreamWAV, b: AudioStreamWAV) -> AudioStreamWAV:
	var sa := _from_wav(a)
	var sb := _from_wav(b)
	var n := maxi(sa.size(), sb.size())
	var out := PackedFloat32Array()
	out.resize(n)
	for i in n:
		var va := sa[i] if i < sa.size() else 0.0
		var vb := sb[i] if i < sb.size() else 0.0
		out[i] = clampf(va + vb, -1.0, 1.0)
	return _to_wav(out, false)


static func _from_wav(w: AudioStreamWAV) -> PackedFloat32Array:
	var n := w.data.size() / 2
	var out := PackedFloat32Array()
	out.resize(n)
	for i in n:
		out[i] = float(w.data.decode_s16(i * 2)) / 32767.0
	return out


## Looping tone with vibrato — the medication warning (92 Hz, 3.4 Hz / +-10 Hz)
## and the chase whine (1650 Hz, 6.2 Hz / +-18 Hz).
static func vibrato_loop(freq: float, vib_hz: float, vib_depth: float,
		amp: float, dur := 2.0) -> AudioStreamWAV:
	# Round to whole vibrato cycles so the loop point is silent.
	var cycles := maxi(1, int(round(dur * vib_hz)))
	var count := int(round(cycles * RATE / vib_hz))
	var samples := PackedFloat32Array()
	samples.resize(count)
	var phase := 0.0
	for i in count:
		var t := float(i) / RATE
		var f := freq + sin(t * TAU * vib_hz) * vib_depth
		phase += f / RATE
		samples[i] = sin(fmod(phase, 1.0) * TAU) * amp
	return _to_wav(samples, true)
