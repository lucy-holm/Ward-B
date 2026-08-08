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

static var _loaded := false
static var _randomize_codes := DEFAULT_RANDOMIZE_CODES
static var _brightness := DEFAULT_BRIGHTNESS


static func _ensure_loaded() -> void:
	if _loaded:
		return
	_loaded = true
	var cfg := ConfigFile.new()
	if cfg.load(PATH) != OK:
		# Missing or corrupt: that is a first run, not an error. The defaults
		# are already in place and there is nothing worth warning about.
		return
	_randomize_codes = bool(cfg.get_value(SECTION, KEY_RANDOMIZE_CODES, DEFAULT_RANDOMIZE_CODES))
	_brightness = clampf(
		float(cfg.get_value(SECTION, KEY_BRIGHTNESS, DEFAULT_BRIGHTNESS)),
		BRIGHTNESS_MIN, BRIGHTNESS_MAX)


## Writes the whole settings block. Always writes every key rather than
## patching one, so a partially-written file from an older build converges to
## the current schema on the first change.
static func _save() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value(SECTION, KEY_RANDOMIZE_CODES, _randomize_codes)
	cfg.set_value(SECTION, KEY_BRIGHTNESS, _brightness)
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


## Test-only: drops the in-memory cache so the next read re-reads from disk.
## Nothing in the game calls this — a running game is the only writer, so the
## cache can never go stale at runtime.
static func _reset_cache_for_tests() -> void:
	_loaded = false
	_randomize_codes = DEFAULT_RANDOMIZE_CODES
	_brightness = DEFAULT_BRIGHTNESS
