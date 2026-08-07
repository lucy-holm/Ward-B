# Structured JSON event telemetry, posted in batches to a configurable
# webhook.
#
# WIRE-COMPATIBLE with src/game/telemetry.ts by design — the existing
# Cloudflare worker + dashboard must keep working across the migration, so
# the batch envelope and the per-event row are mirrored field-for-field:
#
#   batch = { version, session, player, run, env, debug, events[],
#             dropped?, experiment?, variant? }
#   row   = { name, t, room, x, z, yaw, level, pills, state, med, ...data }
#
# `x`, `z`, `yaw`, `med` are rounded to 2dp exactly as round2() does in the
# TS version. `dropped`, `experiment` and `variant` are OMITTED rather than
# null when absent — the worker distinguishes the two.
extends Node

const QUEUE_CAP := 400
const FLUSH_AT_SIZE := 25

## Set from the export/feature config. Empty = log to console instead of
## posting, matching the TS behaviour when VITE_TELEMETRY_URL is unset.
var endpoint := ""
var disabled := false
var debug := false

var _session_id := ""
var _player_id := ""
var _run_index := 0
var _env := "unknown"
var _queue: Array[Dictionary] = []
var _dropped := 0
var _flush_accum := 0.0
var _pos_accum := 0.0
var _http: HTTPRequest

# Supplies the per-event snapshot (room/x/z/yaw/level/pills/state/med).
# Assigned by the world once the player exists; until then rows carry the
# zeroed defaults rather than failing.
var snapshot_provider: Callable = Callable()


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_session_id = _make_uuid()
	_load_identity()
	_env = _detect_env()
	_http = HTTPRequest.new()
	_http.timeout = 10.0
	add_child(_http)


func _process(delta: float) -> void:
	if disabled:
		return

	# Positional sampling, matching the original's positionSampleMs. Drives
	# movement heat-maps, and is the only event that fires without the player
	# doing anything — which also makes it the instrument tools/verify_touch.mjs
	# uses to prove touch input actually reaches the player.
	if not snapshot_provider.is_valid():
		pass
	else:
		_pos_accum += delta
		if _pos_accum >= Tuning.TELEMETRY_POSITION_SAMPLE_MS / 1000.0:
			_pos_accum = 0.0
			event("pos")

	_flush_accum += delta
	if _flush_accum >= Tuning.TELEMETRY_FLUSH_MS / 1000.0:
		_flush_accum = 0.0
		flush()


func event(name: String, data: Dictionary = {}) -> void:
	if disabled:
		return

	var snap := _snapshot()
	var row := {
		"name": name,
		"t": _now_ms(),
		"room": snap.get("room", ""),
		"x": _round2(snap.get("x", 0.0)),
		"z": _round2(snap.get("z", 0.0)),
		"yaw": _round2(snap.get("yaw", 0.0)),
		"level": snap.get("level", "__flat"),
		"pills": snap.get("pills", 0),
		"state": snap.get("state", "unmed"),
		"med": _round2(snap.get("medication", 0.0)),
	}
	# Caller-supplied fields win, mirroring the TS spread order `...data`.
	for k: String in data:
		row[k] = data[k]

	_queue.append(row)
	if _queue.size() > QUEUE_CAP:
		_queue.pop_front()
		_dropped += 1
	if _queue.size() >= FLUSH_AT_SIZE:
		flush()


func flush(use_beacon := false) -> void:
	if disabled:
		return
	if _queue.is_empty() and _dropped == 0:
		return

	var events := _queue.duplicate()
	_queue.clear()
	var dropped := _dropped
	_dropped = 0

	var payload := {
		"version": Tuning.BUILD_VERSION,
		"session": _session_id,
		"player": _player_id,
		"run": _run_index,
		"env": _env,
		"debug": debug,
		"events": events,
	}
	if dropped > 0:
		payload["dropped"] = dropped

	if endpoint.is_empty():
		print("[telemetry] ", JSON.stringify(payload))
		return

	var body := JSON.stringify(payload)

	# On web, an unload flush must use sendBeacon — an in-flight HTTPRequest
	# is cancelled when the page goes away. This is the Godot equivalent of
	# the TS version's navigator.sendBeacon path.
	if use_beacon and OS.has_feature("web"):
		if _send_beacon(body):
			return

	_http.request(
		endpoint,
		PackedStringArray(["Content-Type: application/json"]),
		HTTPClient.METHOD_POST,
		body
	)


func _send_beacon(body: String) -> bool:
	if not OS.has_feature("web"):
		return false
	# JavaScriptBridge only exists on the web export; guard by feature so
	# desktop builds never touch it.
	var js := Engine.get_singleton("JavaScriptBridge")
	if js == null:
		return false
	var escaped := body.replace("\\", "\\\\").replace("'", "\\'")
	var call := "navigator.sendBeacon('%s', new Blob(['%s'], {type:'application/json'}))" % [endpoint, escaped]
	var ok: Variant = js.eval(call, true)
	return ok == true


func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST or what == NOTIFICATION_APPLICATION_PAUSED:
		event("quit")
		flush(true)


func _snapshot() -> Dictionary:
	if snapshot_provider.is_valid():
		return snapshot_provider.call()
	return {}


func _round2(v: Variant) -> float:
	return snappedf(float(v), 0.01)


func _now_ms() -> int:
	return int(Time.get_unix_time_from_system() * 1000.0)


func _detect_env() -> String:
	if not OS.has_feature("web"):
		return "local"
	# Mirrors the TS host sniffing: itch serves from a sandboxed origin.
	var js := Engine.get_singleton("JavaScriptBridge")
	if js == null:
		return "unknown"
	var host: Variant = js.eval("location.hostname", true)
	var h := str(host)
	if h.contains("itch"):
		return "itch"
	if h.contains("github.io"):
		return "pages"
	if h.begins_with("localhost") or h.begins_with("127."):
		return "local"
	if h.contains("ts.net"):
		return "tailnet"
	return "unknown"


# Stable per-player id + run counter, persisted like the TS localStorage
# keys (wardb-player-v1 / wardb-run-v1).
func _load_identity() -> void:
	var cfg := ConfigFile.new()
	var path := "user://wardb-telemetry.cfg"
	if cfg.load(path) == OK:
		_player_id = cfg.get_value("player", "id", "")
		_run_index = int(cfg.get_value("player", "run", 0))
	if _player_id.is_empty():
		_player_id = _make_uuid()
	_run_index += 1
	cfg.set_value("player", "id", _player_id)
	cfg.set_value("player", "run", _run_index)
	cfg.save(path)


func _make_uuid() -> String:
	var bytes := PackedByteArray()
	bytes.resize(16)
	for i in 16:
		bytes[i] = randi() % 256
	return bytes.hex_encode()
