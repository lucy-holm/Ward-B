# Persistent, player-facing options — the Godot analogue of
# src/game/settings.ts. Set from the start screen's CONFIGURATION panel.
#
# Deliberately separate from core/tuning.gd, exactly as settings.ts is
# separate from tuning.ts: Tuning is fixed balance constants that the player
# never sees, this is stuff they are allowed to change. Also separate from
# GameState, which is per-playthrough and intentionally NOT persisted.
#
# WHY ConfigFile AND NOT ProjectSettings
#
# The first cut of the randomize-codes setting used
# ProjectSettings.set_setting(). That is the wrong API for a player setting on
# three counts, all of which made the setting unable to survive a reload:
#   - ProjectSettings is project/EDITOR configuration, not player data;
#   - nothing is written anywhere without an explicit ProjectSettings.save();
#   - in an exported build there is no writable project.godot to save into at
#     all, so it cannot persist even if you did call save().
# `user://` is the correct home for player data. It resolves to a real
# per-project directory on desktop and is IndexedDB-backed on the web export,
# so it survives a page reload on itch too — the direct analogue of
# settings.ts's localStorage.
#
# STORAGE SHAPE mirrors settings.ts: load once, keep in memory, write through
# on every change. A load failure or a missing file silently yields DEFAULTS
# (that is just "first run"), and a WRITE failure logs a warning and keeps the
# in-memory value rather than throwing — so a sandboxed or full filesystem
# degrades to session-only, which is exactly the contract settings.ts's
# try/catch around localStorage provides.
class_name WardSettings
extends RefCounted

const PATH := "user://settings.cfg"
const SECTION := "gameplay"

const KEY_RANDOMIZE_CODES := "randomize_codes"
const KEY_BRIGHTNESS := "brightness"

# --- Render style (ui/shaders/posterize.gdshader + 3D resolution scale) -----
#
# DEV-VIEW settings, not player-facing: nothing in the start screen's
# CONFIGURATION panel writes these, only ui/dev_panel.gd. They live here
# anyway because this is already the user:// ConfigFile owner, and on the web
# export user:// is IndexedDB — so a look you dial in on the tailnet build
# survives a page reload, which is the whole point of tuning it in a browser.
const KEY_STYLE_ENABLED := "style_enabled"
const KEY_STYLE_LEVELS := "style_levels"
const KEY_STYLE_PIXEL_SIZE := "style_pixel_size"
const KEY_STYLE_DITHER := "style_dither"
const KEY_STYLE_TINT := "style_tint"
const KEY_STYLE_EXPOSURE := "style_exposure"
const KEY_STYLE_GAMMA := "style_gamma"
const KEY_STYLE_RESOLUTION := "style_resolution"

# randomizeCodes defaults OFF, matching DEFAULTS in settings.ts — the fixed
# per-room codes stay the default behaviour unless the player opts in.
const DEFAULT_RANDOMIZE_CODES := false

## Display calibration: a multiplier on Environment.tonemap_exposure, applied
## to BOTH ward states (see main.gd _target_exposure).
##
## DEFAULT IS ABOVE 1.0 ON PURPOSE. 1.0 reproduces the exposures baked into
## main.gd's MOOD, which the author reported as "a little bit too dark" once
## the camera-environment-override bug was fixed and those values finally
## reached the screen. Rather than re-tune MOOD (which is a second agent's
## territory, and whose per-state RATIO is carefully judged), the default
## calibration lifts both states by the same factor, so the gap between LUCID
## and UNMED is preserved exactly.
##
## Chosen by measuring mean luminance of the real game render at the room-1
## spawn in UNMED (tools/shoot_game.tscn, not tools/shoot.gd — shoot.gd builds
## its own camera and environment and cannot see this setting at all).
const DEFAULT_BRIGHTNESS := 1.25

# Range endpoints. MIN still leaves the ward legible on a bright screen in a
# dark room; MAX is where UNMED starts to lose its murk and read as merely
# "dim grey", which kills the state contrast the whole game is built on.
const BRIGHTNESS_MIN := 0.6
const BRIGHTNESS_MAX := 2.0
const BRIGHTNESS_STEP := 0.05

## Every style knob in one table: default, range, step and display label.
##
## ONE TABLE, THREE CONSUMERS — this is the reason the style block is keyed
## rather than getting the explicit getter/setter pair per value that
## brightness has. main.gd reads it to drive the shader, ui/dev_panel.gd
## BUILDS ITS ENTIRE UI by iterating it, and _save()/_ensure_loaded() walk it
## generically. Adding a knob is therefore a single entry here plus a uniform
## in the shader; nothing else needs touching, and the panel cannot drift out
## of sync with the settings because it has no independent list to drift from.
##
## All values are stored as float, including the ones the shader wants as int
## (levels) or bool (enabled). Uniform typing keeps the generic load/save/
## clamp path free of per-key special cases; main.gd casts at the point of
## use, which is the only place that knows what each uniform actually is.
##
## STYLE DEFAULTS ON. The tailnet build (docker/ward-b-godot, :8444) is the
## playtest deployment and the reason this work exists — it should show the
## new look without needing anything switched on first. This is safe for the
## real audience by construction: itch.io ships from deploy-itch.yml, which
## builds the Three.js game and never touches this project at all.
const STYLE_SPEC := {
	KEY_STYLE_ENABLED: {
		"default": 1.0, "min": 0.0, "max": 1.0, "step": 1.0,
		"label": "Style enabled", "hint": "0 = untouched frame, byte-exact passthrough",
	},
	KEY_STYLE_LEVELS: {
		"default": 4.0, "min": 2.0, "max": 16.0, "step": 1.0,
		"label": "Quantise levels", "hint": "2 = pure 1-bit; 4 keeps keypad digits legible",
	},
	KEY_STYLE_PIXEL_SIZE: {
		"default": 2.0, "min": 1.0, "max": 8.0, "step": 1.0,
		"label": "Dither pixel size", "hint": "Device pixels per styled pixel",
	},
	KEY_STYLE_DITHER: {
		"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.05,
		"label": "Dither amount", "hint": "0 = flat banding, 1 = full ordered dither",
	},
	# DEFAULTS TO 0 (keep hue) on evidence, not taste. Full duotone collapses
	# every colour onto one two-tone ramp, and the ward's wall graffiti is red
	# on near-black: rooms 3, 4 and 6 lose their text to grey almost entirely
	# at tint 1.0 (.artifacts/style/graffiti_test.png is the A/B). That text is
	# narrative, and room 5's own hint — "the code is written where he walks" —
	# means hue is carrying puzzle-relevant information. Posterising value
	# while leaving hue alone gets the graphic look without eating content.
	KEY_STYLE_TINT: {
		"default": 0.0, "min": 0.0, "max": 1.0, "step": 0.05,
		"label": "Duotone amount", "hint": "0 = keep hue, 1 = collapse to two colours",
	},
	# A MULTIPLIER on main.gd's per-state STYLE_LIFT, not an absolute value.
	# The two ward states need very different lifts — LUCID quantises well as
	# rendered, UNMED is close enough to black that quantising it flat yields
	# an empty field — so the per-state figures live next to MOOD in main.gd
	# and this knob scales both at once, exactly as the brightness setting
	# scales both MOOD exposures and preserves their ratio.
	KEY_STYLE_EXPOSURE: {
		"default": 1.0, "min": 0.1, "max": 4.0, "step": 0.05,
		"label": "Pre-quantise lift", "hint": "Multiplies main.gd's per-state STYLE_LIFT",
	},
	# The knob that makes the unmedicated state work at all — see the long
	# note on shadow_gamma in ui/shaders/posterize.gdshader. Raise it if the
	# dark rooms read as flat voids, lower it if the shadows look washed out.
	KEY_STYLE_GAMMA: {
		"default": 2.2, "min": 1.0, "max": 4.0, "step": 0.1,
		"label": "Shadow detail", "hint": "Concentrates levels in the dark; 1.0 = linear",
	},
	KEY_STYLE_RESOLUTION: {
		"default": 1.0, "min": 0.25, "max": 1.0, "step": 0.05,
		"label": "3D resolution scale", "hint": "Viewport.scaling_3d_scale — the big perf lever",
	},
}

static var _loaded := false
static var _randomize_codes := DEFAULT_RANDOMIZE_CODES
static var _brightness := DEFAULT_BRIGHTNESS
static var _style := {}


static func _ensure_loaded() -> void:
	if _loaded:
		return
	_loaded = true
	# Seed the style block BEFORE the first-run early return below. The other
	# two settings get their defaults from their static var initialisers, but
	# _style starts as an empty Dictionary — so returning early without this
	# leaves every get_style() falling through to 0.0, which reads as "style
	# disabled, zero levels" rather than "first run, use the defaults".
	for key: String in STYLE_SPEC:
		_style[key] = float(STYLE_SPEC[key]["default"])

	var cfg := ConfigFile.new()
	if cfg.load(PATH) != OK:
		# Missing or corrupt: that is a first run, not an error. The defaults
		# are already in place and there is nothing worth warning about.
		return
	_randomize_codes = bool(cfg.get_value(SECTION, KEY_RANDOMIZE_CODES, DEFAULT_RANDOMIZE_CODES))
	_brightness = clampf(
		float(cfg.get_value(SECTION, KEY_BRIGHTNESS, DEFAULT_BRIGHTNESS)),
		BRIGHTNESS_MIN, BRIGHTNESS_MAX)
	# Clamped against the CURRENT spec rather than trusted as written, so a
	# stored value from a build whose range has since narrowed is pulled back
	# in instead of being pushed to the shader out of range.
	for key: String in STYLE_SPEC:
		var spec: Dictionary = STYLE_SPEC[key]
		_style[key] = clampf(
			float(cfg.get_value(SECTION, key, spec["default"])),
			float(spec["min"]), float(spec["max"]))


## Writes the whole settings block. Always writes every key rather than
## patching one, so a partially-written file from an older build converges to
## the current schema on the first change.
static func _save() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value(SECTION, KEY_RANDOMIZE_CODES, _randomize_codes)
	cfg.set_value(SECTION, KEY_BRIGHTNESS, _brightness)
	for key: String in STYLE_SPEC:
		cfg.set_value(SECTION, key, _style.get(key, float(STYLE_SPEC[key]["default"])))
	var err := cfg.save(PATH)
	if err != OK:
		push_warning(
			"WardSettings: could not persist to %s (error %d) — settings hold for this session only, matching settings.ts's storage-failure fallback"
				% [PATH, err])


static func is_randomize_codes_enabled() -> bool:
	_ensure_loaded()
	return _randomize_codes


static func set_randomize_codes(enabled: bool) -> void:
	_ensure_loaded()
	_randomize_codes = enabled
	_save()


static func get_brightness() -> float:
	_ensure_loaded()
	return _brightness


static func set_brightness(value: float) -> void:
	_ensure_loaded()
	_brightness = clampf(value, BRIGHTNESS_MIN, BRIGHTNESS_MAX)
	_save()


## Reads one style knob. Unknown keys return 0.0 with a warning rather than
## erroring: a stale key left in a dev panel is a cosmetic bug, not a reason
## to take the whole render pipeline down.
static func get_style(key: String) -> float:
	_ensure_loaded()
	if not STYLE_SPEC.has(key):
		push_warning("WardSettings: unknown style key '%s'" % key)
		return 0.0
	return float(_style.get(key, STYLE_SPEC[key]["default"]))


## Writes one style knob, clamped to its spec range, and persists.
static func set_style(key: String, value: float) -> void:
	_ensure_loaded()
	if not STYLE_SPEC.has(key):
		push_warning("WardSettings: unknown style key '%s'" % key)
		return
	var spec: Dictionary = STYLE_SPEC[key]
	_style[key] = clampf(value, float(spec["min"]), float(spec["max"]))
	_save()


## Restores every style knob to its spec default in one write.
static func reset_style() -> void:
	_ensure_loaded()
	for key: String in STYLE_SPEC:
		_style[key] = float(STYLE_SPEC[key]["default"])
	_save()


## Test-only: drops the in-memory cache so the next read re-reads from disk.
## Nothing in the game calls this — a running game is the only writer, so the
## cache can never go stale at runtime.
static func _reset_cache_for_tests() -> void:
	_loaded = false
	_randomize_codes = DEFAULT_RANDOMIZE_CODES
	_brightness = DEFAULT_BRIGHTNESS
	_style = {}
