# Structured JSON event telemetry, batched and posted to a collector.
#
# WIRE-COMPATIBLE with src/game/telemetry.ts by design — the Cloudflare worker
# (telemetry-worker/) and its D1 schema must keep working across the engine
# migration, so the batch envelope and the per-event row are mirrored
# field-for-field:
#
#   batch = { version, session, player, run, env, debug, events[],
#             dropped?, experiment?, variant? }
#   row   = { name, t, room, x, z, yaw, level, pills, state, med, ...data }
#
# `x`, `z`, `yaw`, `med` are rounded to 2dp exactly as round2() does in the TS
# version. `dropped`, `experiment` and `variant` are OMITTED rather than null
# when absent — the worker distinguishes the two.
#
# ============================================================================
# WHERE THIS IS ALLOWED TO TRANSMIT — read before changing _transmit_allowed.
# ============================================================================
#
# The collector must only ever hear from real players on itch.io. Not GitHub
# Pages (that deploy is staging), not the Helios/tailnet container, not a
# local run, not the headless suites. Otherwise Tom's own testing silently
# mixes into every funnel metric, which is the F19 failure the TS version
# calls out and solves the same way.
#
# TWO INDEPENDENT GATES, and both must agree:
#
#   1. BUILD TIME — BuildConfig.TELEMETRY_ENDPOINT is empty unless the itch
#      workflow generated it. A Pages/tailnet/local build has no URL compiled
#      into it at all. See core/build_config.gd.
#   2. RUN TIME — _detect_env() must say "itch". This is what covers the case
#      the build-time gate cannot: the itch build's files are downloadable and
#      can be re-hosted anywhere, and a mis-scoped CI edit could bake an
#      endpoint into the wrong build.
#
# WHAT IS DELIBERATELY *NOT* GATED: console logging. When transmission is not
# allowed this still prints the batch as `[telemetry] {...}`, exactly as the
# TS version does when VITE_TELEMETRY_URL is unset. That is not a leak — it
# goes to the local console and nowhere else — and it is load-bearing:
# tools/verify_web.mjs proves GDScript is running by looking for that prefix,
# and tools/verify_touch.mjs reconstructs the player's path from the `pos`
# rows in it to prove touch input actually reaches the player. Silencing the
# off-itch path would leave both tools with nothing to read.
extends Node

# Transport tuning, matched to the TS constants of the same name. These are
# not independent knobs — the worker's MAX_EVENTS_PER_BATCH (1000) and body
# cap are sized against them.
const QUEUE_CAP := 500              # F7 — hard ceiling; drop-oldest beyond this
const FLUSH_AT_SIZE := 50           # F6 — size-based flush trigger
const RETRY_CAP_BYTES := 100 * 1024 # §5.1a — cap on the retry buffer
const IDLE_POLL_MS := 1000          # how often the idle threshold is re-checked
const ERROR_TRUNCATE := 300         # hard cap on error message/stack length (F17)
const WEB_ERROR_DRAIN_MAX := 32     # per drain, so a error loop can't flood the queue

# Storage keys. On web these are localStorage keys and they are BYTE-IDENTICAL
# to the TS build's, on purpose: itch serves both builds from the same
# sandboxed origin, so a player who played the Three.js game keeps their
# playerId and run counter across the migration instead of appearing as a
# brand-new stranger the day Godot shipped. Everything is namespaced under
# wardb- because that origin is shared with other games.
const PLAYER_KEY := "wardb-player-v1"
const RUN_KEY := "wardb-run-v1"
const RETRY_KEY := "wardb-telemetry-retry-v1"
const NOTRACK_KEY := "wardb-notrack"

# Off-web there is no localStorage, so identity lives in a config file. This
# path is only ever used by the desktop editor and the headless suites, which
# never transmit — it exists so `player`/`run` are still well-formed in the
# console output.
const IDENTITY_PATH := "user://wardb-telemetry.cfg"

## Collector URL. Defaults to the build-time value; tests overwrite it.
var endpoint := ""
## Hard off switch. Set by tools/test_*.gd so suites never queue events.
var disabled := false
var debug := false

var _session_id := ""
var _player_id := ""
var _run_index := 0
var _env := "unknown"
var _assignment := {}

var _queue: Array[Dictionary] = []
var _dropped := 0
var _flush_accum := 0.0
var _pos_accum := 0.0
var _idle_poll_accum := 0.0

var _page_load_called := false
var _started := false
var _quit_fired := false
## Set once the page is going away. Gates the webglcontextlost handler — see
## _drain_web_errors for why a context loss during teardown is not a fault.
var _unloading := false

# Idle tracking (F9). active_ms is DERIVED on read rather than ticked, so
# callers can sample it at arbitrary points and diff two samples to get an
# idle-corrected duration — which is exactly what main.gd's room_complete
# rollup does.
var _idle := false
var _last_activity_ms := 0
var _idle_since_ms := 0
var _active_accum_ms := 0
var _active_since_ms := 0

# Perf sampling (F18) — a rolling per-frame fps array, flushed to a `perf`
# event every TELEMETRY_PERF_INTERVAL_MS and reset.
var _perf_samples: PackedFloat32Array = PackedFloat32Array()
var _perf_window_start_ms := 0

var _unload_callback: Variant = null

# ---- rollup counters (F12) ----------------------------------------------
#
# The TS build wraps its Telemetry in a Proxy that intercepts event() and
# bumps these on the way past (src/main.ts:185-195). The engine equivalent is
# to keep them HERE, because event() is already the one funnel every event in
# the game passes through — a room raising `orderly_caught` is counted without
# that room, or main.gd, knowing counters exist.
#
# `catches`/`shifts`/`pills_used` are tracked at both room and session scope;
# `keypad_fails` and `distance` are room-scope only, exactly as in the TS
# version (its sessionCounters literal deliberately omits them).
var _room_counters := {}
var _session_counters := {"catches": 0, "shifts": 0, "pills_used": 0}
var _room_entered_ms := 0
var _room_active_ms_at_enter := 0
var _game_started_ms := 0
# Last-seen player (x,z) for distance accumulation. Reset by
# resync_distance() on every teleport so an orderly's catch — which moves the
# player across the room instantly — is never miscounted as them walking it.
var _last_pos := Vector2.ZERO
var _have_last_pos := false

# Supplies the per-event snapshot (room/x/z/yaw/level/pills/state/med).
# Assigned by the world once the player exists; until then rows carry the
# zeroed defaults rather than failing.
var snapshot_provider: Callable = Callable()


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_session_id = _make_uuid()
	_env = _detect_env()
	endpoint = BuildConfig.TELEMETRY_ENDPOINT

	# F22 — the opt-out is resolved before identity so an opted-out player
	# never has an id written for them at all. Assigning an experiment arm to
	# someone we are not tracking would just be dead state.
	if _is_opted_out():
		disabled = true
		return

	_load_identity()
	_assignment = Experiments.get_assignment(_player_id)


## Total ms of active (non-idle) time this session. Monotonic.
func active_ms() -> int:
	if disabled or not _started:
		return 0
	if _idle:
		return _active_accum_ms
	return _active_accum_ms + (_mono_ms() - _active_since_ms)


func run_index() -> int:
	return _run_index


func _process(delta: float) -> void:
	if disabled:
		return

	# Positional sampling, matching the TS positionSampleMs. Drives movement
	# heat-maps, and is the only event that fires without the player doing
	# anything — which also makes it the instrument tools/verify_touch.mjs
	# uses to prove touch input reaches the player.
	if snapshot_provider.is_valid():
		_pos_accum += delta
		if _pos_accum >= Tuning.TELEMETRY_POSITION_SAMPLE_MS / 1000.0:
			_pos_accum = 0.0
			event("pos")

	_accumulate_distance()

	_flush_accum += delta
	if _flush_accum >= Tuning.TELEMETRY_FLUSH_MS / 1000.0:
		_flush_accum = 0.0
		flush()

	if not _started:
		return

	_idle_poll_accum += delta
	if _idle_poll_accum >= IDLE_POLL_MS / 1000.0:
		_idle_poll_accum = 0.0
		_check_idle()
		_drain_web_errors()

	# One sample per frame; one sort per window. The TS version does this off
	# requestAnimationFrame, which is what _process is here.
	if delta > 0.0:
		_perf_samples.append(1.0 / delta)
	if _mono_ms() - _perf_window_start_ms >= Tuning.TELEMETRY_PERF_INTERVAL_MS:
		_emit_perf()
		_perf_window_start_ms = _mono_ms()


# ---- input activity (F9) -------------------------------------------------
#
# The TS version listens for keydown/pointerdown/mousemove/touchstart on
# window. The engine equivalent is _input on an autoload, which sees every
# event before any node consumes it. Nothing is marked handled here — this
# observes, it does not intercept.
func _input(event_in: InputEvent) -> void:
	if disabled or not _started:
		return
	if (
		event_in is InputEventKey
		or event_in is InputEventMouseButton
		or event_in is InputEventMouseMotion
		or event_in is InputEventScreenTouch
		or event_in is InputEventScreenDrag
		or event_in is InputEventJoypadButton
		or event_in is InputEventJoypadMotion
	):
		_handle_activity()


func event(name: String, data: Dictionary = {}) -> void:
	if disabled:
		return

	var snap := _snapshot()
	var row := {
		"name": name,
		"t": _wall_ms(),
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
	# Guarded because a caller passing something that is not a Dictionary used
	# to abort event() BEFORE the append below, losing the event entirely and
	# silently. Telemetry must never throw into the frame path, and it must
	# never lose a row over a bad extra field — the row without the field is
	# strictly better than no row.
	if data is Dictionary:
		for k: String in data:
			row[k] = data[k]

	_bump_counters(name, data)

	_queue.append(row)
	if _queue.size() > QUEUE_CAP:
		_queue.pop_front()
		_dropped += 1
	if _queue.size() >= FLUSH_AT_SIZE:
		flush()


## The batch envelope. Kept separate from flush() so tools/check_telemetry can
## assert its exact shape — the worker's D1 schema depends on these key names,
## so a rename here is a silent data loss at the collector, not a local bug.
func build_payload(events: Array, dropped: int) -> Dictionary:
	var payload := {
		"version": _build_version(),
		"session": _session_id,
		"player": _player_id,
		"run": _run_index,
		"env": _env,
		"debug": debug,
		"events": events,
	}
	if dropped > 0:
		payload["dropped"] = dropped
	# §6.1 — stamped on every BATCH, not every event: an arm does not change
	# mid-session, so it belongs at payload level like version/session/player.
	# Omitted rather than null when no experiment is active, matching the
	# `dropped` convention just above.
	if not _assignment.is_empty():
		payload["experiment"] = _assignment["experiment"]
		payload["variant"] = _assignment["variant"]
	return payload


func flush(use_beacon := false) -> void:
	if disabled:
		return
	if _queue.is_empty() and _dropped == 0:
		return

	var events := _queue.duplicate()
	_queue.clear()
	var dropped := _dropped
	_dropped = 0

	var payload := build_payload(events, dropped)

	if not _transmit_allowed():
		print("[telemetry] ", JSON.stringify(payload))
		return

	_send(JSON.stringify(payload), use_beacon)


## Emitted at boot, BEFORE the start overlay. Installs the web hooks.
func page_load() -> void:
	if disabled or _page_load_called:
		return
	_page_load_called = true
	_install_web_hooks()
	_resend_retry_buffer()
	var sc := _session_context()
	event("page_load", sc)


## Called when the player actually starts (ADMIT ME). Starts the sampling.
func start() -> void:
	if disabled or _started:
		return
	_started = true

	var ctx := _session_context()
	ctx["version"] = _build_version()
	event("session_start", ctx)

	var t := _mono_ms()
	_active_since_ms = t
	_last_activity_ms = t
	_perf_window_start_ms = t
	_perf_samples = PackedFloat32Array()
	mark_game_start()
	mark_room_enter()


# ---- rollup bookkeeping --------------------------------------------------

func _bump_counters(name: String, data: Dictionary) -> void:
	match name:
		"orderly_caught":
			_session_counters["catches"] += 1
			_room_counters["catches"] = int(_room_counters.get("catches", 0)) + 1
		"keypad_denied":
			_room_counters["keypad_fails"] = int(_room_counters.get("keypad_fails", 0)) + 1
		"shift":
			_session_counters["shifts"] += 1
			_room_counters["shifts"] = int(_room_counters.get("shifts", 0)) + 1
			# Only a manual unmed->lucid actually spends a pill:
			# StateManager.shift() decrements, force_state() never does. So
			# lucid->unmed is free, and so is every scripted shift.
			if str(data.get("source", "")) == "manual" \
					and str(data.get("direction", "")).begins_with("unmed->"):
				_session_counters["pills_used"] += 1
				_room_counters["pills_used"] = int(_room_counters.get("pills_used", 0)) + 1


## Accumulated frame by frame from the snapshot the telemetry already holds,
## so no caller has to feed it. Guarded by _have_last_pos so the first frame
## after a spawn or a teleport contributes nothing.
func _accumulate_distance() -> void:
	if not snapshot_provider.is_valid():
		return
	var snap := _snapshot()
	var here := Vector2(float(snap.get("x", 0.0)), float(snap.get("z", 0.0)))
	if _have_last_pos:
		_room_counters["distance"] = float(_room_counters.get("distance", 0.0)) \
			+ _last_pos.distance_to(here)
	_last_pos = here
	_have_last_pos = true


## Called by main.gd on any teleport. Drops the distance baseline so the jump
## itself is not billed to the player as walking — the same resync the TS
## version does at src/main.ts:289-292.
func resync_distance() -> void:
	_have_last_pos = false


## Resets the per-room rollup. Called on every room load, INCLUDING a revisit
## of a room already seen, so a second visit is measured on its own.
func mark_room_enter() -> void:
	_room_counters = {}
	_room_entered_ms = _mono_ms()
	_room_active_ms_at_enter = active_ms()
	_have_last_pos = false


func mark_game_start() -> void:
	_game_started_ms = _mono_ms()


## The room_complete payload (F12/F14).
func room_rollup() -> Dictionary:
	var snap := _snapshot()
	# Medication remaining at the moment of clearing the room — the
	# difference between a tense finish and a trivial one. Gated on actually
	# being lucid: nothing zeroes `medication` on the revert to unmed, so
	# reading it raw while unmed would report a stale value from whenever the
	# last lucid stretch ended. Exiting unmed reports 0, which is the honest
	# answer: there was no meter running.
	var med_left := 0.0
	if str(snap.get("state", "unmed")) == "lucid":
		med_left = _round2(snap.get("medication", 0.0))
	return {
		"duration_s": _tenths((_mono_ms() - _room_entered_ms) / 1000.0),
		# Idle-corrected time actually spent in this room, diffed off the
		# session-wide idle tracking above rather than reimplemented.
		"active_s": _tenths((active_ms() - _room_active_ms_at_enter) / 1000.0),
		"catches": int(_room_counters.get("catches", 0)),
		"shifts": int(_room_counters.get("shifts", 0)),
		"pills_used": int(_room_counters.get("pills_used", 0)),
		"keypad_fails": int(_room_counters.get("keypad_fails", 0)),
		"distance_m": _tenths(float(_room_counters.get("distance", 0.0))),
		"med_left": med_left,
	}


## The game_complete payload (F2) — a whole-run rollup mirroring
## room_complete's shape at session scope. The single most important event in
## the set: did this session actually finish the build?
func session_rollup() -> Dictionary:
	return {
		"duration_s": _tenths((_mono_ms() - _game_started_ms) / 1000.0),
		"active_s": _tenths(active_ms() / 1000.0),
		"catches": int(_session_counters["catches"]),
		"shifts": int(_session_counters["shifts"]),
		"pills_used": int(_session_counters["pills_used"]),
		"run_index": _run_index,
	}


# ---- session context (F19) — shared by page_load and session_start -------
#
# Off-web most of this is unknowable and is reported as such rather than
# guessed. That path only ever reaches the console anyway.
func _session_context() -> Dictionary:
	var ctx := {
		"hostname": WebEnv.hostname(),
		"screen": "%dx%d" % [
			DisplayServer.window_get_size().x, DisplayServer.window_get_size().y
		],
		"touch": DisplayServer.is_touchscreen_available(),
		"lang": OS.get_locale(),
		"cores": OS.get_processor_count(),
		"iframe": false,
		"ua": "",
		"referrer": "",
		"dpr": 1.0,
	}
	if not WebEnv.is_web():
		ctx["ua"] = "godot/%s %s" % [
			Engine.get_version_info().get("string", ""), OS.get_name()
		]
		return ctx

	var ua: Variant = WebEnv.eval_js("navigator.userAgent")
	ctx["ua"] = "" if ua == null else str(ua)
	var ref: Variant = WebEnv.eval_js("document.referrer || ''")
	ctx["referrer"] = "" if ref == null else str(ref)
	var dpr: Variant = WebEnv.eval_js("window.devicePixelRatio || 1")
	ctx["dpr"] = 1.0 if dpr == null else float(dpr)
	# A cross-origin frame throws on window.top access — and that throw is
	# itself the answer, because it means we ARE embedded. itch does exactly
	# this, so `iframe` is true for essentially every real play.
	# bool(), never `== true`: JavaScriptBridge returns a JS boolean as an INT,
	# and `int == bool` RAISES in GDScript rather than evaluating false. That
	# raise aborted this function, which returned null, which made event()
	# abort on a null data dict — so page_load was silently never recorded on
	# itch while every other event flowed normally. Any comparison against a
	# value that came back through eval_js must go through bool()/int()/str().
	var framed: Variant = WebEnv.eval_js(
		"(()=>{try{return window.self!==window.top}catch(e){return true}})()"
	)
	ctx["iframe"] = bool(framed) if framed != null else false
	return ctx


# ---- transmission gates --------------------------------------------------

## Both gates, in one place. See this file's header for why there are two.
func _transmit_allowed() -> bool:
	return not endpoint.is_empty() and _env == "itch"


func _send(body: String, use_beacon: bool) -> void:
	# On web an unload flush MUST use sendBeacon: an in-flight HTTPRequest is
	# cancelled the moment the page goes away, and the unload batch is the one
	# most worth keeping — it carries `quit` and the tail of the session.
	if use_beacon and WebEnv.is_web():
		if _send_beacon(body):
			return

	# A FRESH HTTPRequest per batch, not one reused node. HTTPRequest handles
	# exactly one request at a time and errors if asked for a second while the
	# first is in flight; with a 15 s timed flush and a size-triggered flush
	# that can fire at any moment, that collision is reachable, and the old
	# shared-node version dropped the batch silently when it happened.
	var http := HTTPRequest.new()
	http.timeout = 10.0
	add_child(http)
	http.request_completed.connect(
		func(result: int, code: int, _h: PackedStringArray, _b: PackedByteArray) -> void:
			if result != HTTPRequest.RESULT_SUCCESS or code < 200 or code >= 300:
				_save_retry_buffer(body)
			http.queue_free()
	)
	var err := http.request(
		endpoint,
		PackedStringArray(["Content-Type: application/json"]),
		HTTPClient.METHOD_POST,
		body
	)
	if err != OK:
		_save_retry_buffer(body)
		http.queue_free()


func _send_beacon(body: String) -> bool:
	if not WebEnv.is_web():
		return false
	# Both operands go through js_literal (JSON.stringify) rather than manual
	# quote-escaping. The previous hand-rolled escape here broke on any body
	# containing a newline — which every captured error `stack` does — and a
	# syntax error inside eval is swallowed, so the beacon would just quietly
	# stop working with nothing to see.
	var call := "navigator.sendBeacon(%s, new Blob([%s], {type:'application/json'}))" % [
		WebEnv.js_literal(endpoint), WebEnv.js_literal(body)
	]
	# bool(), not `== true` — see the note in _session_context. sendBeacon
	# returns a JS boolean, which arrives here as an int.
	var ok: Variant = WebEnv.eval_js(call)
	return false if ok == null else bool(ok)


func _notification(what: int) -> void:
	# Desktop close, and the mobile/web background transition. The web unload
	# path is separate — see _install_web_hooks — because pagehide is not
	# surfaced as an engine notification.
	if what == NOTIFICATION_WM_CLOSE_REQUEST or what == NOTIFICATION_APPLICATION_PAUSED:
		_fire_quit()


func _fire_quit() -> void:
	if disabled:
		return
	_unloading = true
	if not _quit_fired:
		_quit_fired = true
		event("quit")
	flush(true)


# ---- web hooks: unload, visibility, error capture (F17) ------------------

func _install_web_hooks() -> void:
	if not WebEnv.is_web():
		return

	var js := WebEnv.bridge()
	if js != null:
		# A JavaScriptBridge callback runs the GDScript SYNCHRONOUSLY inside
		# the JS handler, which is what makes a pagehide flush possible at all
		# — the page is not torn down until the handler returns, so there is
		# still a live engine to build and beacon the final batch. The
		# callback object must stay referenced or it is collected and the JS
		# side calls into nothing, hence the member.
		_unload_callback = js.create_callback(_on_web_unload)
		var window: Variant = js.get_interface("window")
		if window != null:
			window.__wardbUnload = _unload_callback
			WebEnv.eval_js(
				"addEventListener('pagehide', () => window.__wardbUnload());"
				+ "document.addEventListener('visibilitychange', () => {"
				+ "  if (document.visibilityState === 'hidden') window.__wardbUnload();"
				+ "});"
			)

	# Error capture. The handlers push onto a bounded JS-side array that
	# _drain_web_errors empties once a second; they do not call into GDScript
	# directly, because an exception thrown inside the engine's own frame
	# would otherwise re-enter it from an error handler.
	WebEnv.eval_js(
		"(()=>{"
		+ "if (window.__wardbErrHooked) return; window.__wardbErrHooked = true;"
		+ "window.__wardbErrs = [];"
		+ "const push = (kind, msg, stack) => {"
		+ "  if (window.__wardbErrs.length < 64) window.__wardbErrs.push({"
		+ "    kind: kind,"
		+ "    msg: String(msg == null ? '' : msg).slice(0, 300),"
		+ "    stack: String(stack == null ? '' : stack).split('\\n')[0].slice(0, 300)"
		+ "  });"
		+ "};"
		+ "addEventListener('error', e => push('error', e.message || e.error, e.error && e.error.stack));"
		+ "addEventListener('unhandledrejection', e => {"
		+ "  const r = e.reason;"
		+ "  push('unhandledrejection', (r && r.message) ? r.message : r, r && r.stack);"
		+ "});"
		# webglcontextlost does not bubble, so capture phase on window is the
		# only way to see it without a canvas reference.
		+ "addEventListener('webglcontextlost', () => push('webglcontextlost', 'WebGL context lost', ''), true);"
		+ "})()"
	)


func _on_web_unload(_args: Array = []) -> void:
	# Tell the JS side first: tearing the page down destroys the GL context
	# and fires webglcontextlost as a matter of course. Left unguarded that
	# logs roughly one spurious error PER SESSION, which would bury the real
	# driver/GPU failures this metric exists to catch under noise proportional
	# to traffic. A context loss during actual play still reports normally.
	WebEnv.eval_js("window.__wardbUnloading = true")
	_drain_web_errors()
	_fire_quit()


func _drain_web_errors() -> void:
	if disabled or not WebEnv.is_web():
		return
	var raw: Variant = WebEnv.eval_js(
		"JSON.stringify((window.__wardbErrs || []).splice(0, %d))" % WEB_ERROR_DRAIN_MAX
	)
	if raw == null:
		return
	var parsed: Variant = JSON.parse_string(str(raw))
	if not (parsed is Array):
		return
	for e: Variant in parsed:
		if not (e is Dictionary):
			continue
		var kind := str(e.get("kind", "error"))
		if kind == "webglcontextlost" and _unloading:
			continue
		event("error", {
			"kind": kind,
			"msg": _truncate(str(e.get("msg", "")), ERROR_TRUNCATE),
			"stack": _truncate(str(e.get("stack", "")), ERROR_TRUNCATE),
		})


# ---- idle detection (F9) -------------------------------------------------

func _handle_activity() -> void:
	var now := _mono_ms()
	_last_activity_ms = now
	if _idle:
		_idle = false
		_active_since_ms = now
		event("idle_end", {"idle_s": _round2((now - _idle_since_ms) / 1000.0)})


func _check_idle() -> void:
	if _idle:
		return
	var now := _mono_ms()
	if now - _last_activity_ms >= Tuning.TELEMETRY_IDLE_THRESHOLD_MS:
		# Accrue only up to the last real activity, not up to now — the gap
		# since then is by definition not active time.
		_active_accum_ms += _last_activity_ms - _active_since_ms
		_idle = true
		_idle_since_ms = _last_activity_ms
		event("idle_start")


# ---- perf sampling (F18) -------------------------------------------------

func _emit_perf() -> void:
	if _perf_samples.is_empty():
		return
	var sorted := Array(_perf_samples)
	sorted.sort()
	var frames := sorted.size()
	var p50: float = sorted[int(floor(frames * 0.5))]
	var p10: float = sorted[int(floor(frames * 0.1))]
	event("perf", {"fps_p50": _round2(p50), "fps_p10": _round2(p10), "frames": frames})
	_perf_samples = PackedFloat32Array()


# ---- retry buffer (§5.1a) ------------------------------------------------
#
# A failed POST writes its batch here instead of dropping it, so a tab crash
# right after a failed send does not lose data — the loss that matters most,
# because it is biased toward exactly the sessions worth studying. Re-sent
# once on the next page_load(); a second failure re-saves it.

func _save_retry_buffer(body: String) -> void:
	if body.length() > RETRY_CAP_BYTES:
		return
	_storage_set(RETRY_KEY, body)


func _resend_retry_buffer() -> void:
	var raw := _storage_get(RETRY_KEY)
	if raw.is_empty():
		return
	_storage_remove(RETRY_KEY)
	# Nothing to send to — drop rather than log a stale batch as fresh.
	if not _transmit_allowed():
		return
	_send(raw, false)


# ---- identity ------------------------------------------------------------

## playerId survives reloads and return visits (F3). Without it, a READMIT is
## indistinguishable from a brand new player, and neither retention nor stable
## A/B bucketing is possible. runIndex increments once per page load, so a
## replay bumps the run rather than looking like a fresh person (F3/F5).
func _load_identity() -> void:
	_player_id = _storage_get(PLAYER_KEY)
	if _player_id.is_empty():
		_player_id = _make_uuid()
		_storage_set(PLAYER_KEY, _player_id)

	var raw := _storage_get(RUN_KEY)
	var prev := int(raw) if raw.is_valid_int() else 0
	_run_index = prev + 1
	_storage_set(RUN_KEY, str(_run_index))


# ---- storage: localStorage on web, ConfigFile off-web ---------------------

func _storage_get(key: String) -> String:
	if WebEnv.is_web():
		return WebEnv.ls_get(key)
	var cfg := ConfigFile.new()
	if cfg.load(IDENTITY_PATH) != OK:
		return ""
	return str(cfg.get_value("telemetry", key, ""))


func _storage_set(key: String, value: String) -> void:
	if WebEnv.is_web():
		WebEnv.ls_set(key, value)
		return
	var cfg := ConfigFile.new()
	cfg.load(IDENTITY_PATH)
	cfg.set_value("telemetry", key, value)
	cfg.save(IDENTITY_PATH)


func _storage_remove(key: String) -> void:
	if WebEnv.is_web():
		WebEnv.ls_remove(key)
		return
	var cfg := ConfigFile.new()
	if cfg.load(IDENTITY_PATH) != OK:
		return
	cfg.erase_section_key("telemetry", key)
	cfg.save(IDENTITY_PATH)


# ---- opt-out (F22) -------------------------------------------------------

## `?notrack=1` is for a one-off link; the stored flag is for "remember I
## opted out". Cheap now, awkward to retrofit after launch.
func _is_opted_out() -> bool:
	if WebEnv.query_param("notrack") == "1":
		return true
	var stored := _storage_get(NOTRACK_KEY)
	return stored == "1" or stored == "true"


# ---- helpers -------------------------------------------------------------

func _snapshot() -> Dictionary:
	if snapshot_provider.is_valid():
		return snapshot_provider.call()
	return {}


func _build_version() -> String:
	# A CI build reports its real SHA; a local build reports the checked-in
	# stamp. Same contract as the TS build's VITE_BUILD_SHA.
	if BuildConfig.BUILD_SHA.is_empty():
		return Tuning.BUILD_VERSION
	return "%s-%s" % [Tuning.BUILD_VERSION, BuildConfig.BUILD_SHA]


## One decimal place, matching the TS rollups' Math.round(x * 10) / 10.
func _tenths(v: float) -> float:
	return snappedf(v, 0.1)


func _round2(v: Variant) -> float:
	return snappedf(float(v), 0.01)


## Wall-clock ms, for the `t` field the worker stores. Matches Date.now().
func _wall_ms() -> int:
	return int(Time.get_unix_time_from_system() * 1000.0)


## Monotonic ms, for durations. Matches performance.now(): unaffected by a
## clock adjustment mid-session, which _wall_ms is not.
func _mono_ms() -> int:
	return int(Time.get_ticks_msec())


func _truncate(s: String, max_len: int) -> String:
	return s if s.length() <= max_len else s.substr(0, max_len)


## Derived at RUNTIME, never baked in at build time (F19/§7.5) — and this is
## also gate #2 on transmission, so the host list is security-relevant, not
## just analytical.
##
## `.hwcdn.net` matters and is easy to miss: itch serves the actual game frame
## from its CDN, so a real play often reports a hwcdn host rather than an itch
## one. The previous `h.contains("itch")` test missed it entirely, which would
## have labelled real plays "unknown" — and under the new gate would have
## silently dropped their telemetry altogether.
func _detect_env() -> String:
	if not WebEnv.is_web():
		return "local"
	return classify_host(WebEnv.hostname())


## Pure host -> env mapping, split out from _detect_env so tools/check_telemetry
## can pin the table without a browser. This IS the transmission gate, so a
## change here changes who is allowed to report.
static func classify_host(h: String) -> String:
	if h.is_empty():
		return "unknown"
	if h == "localhost" or h == "127.0.0.1":
		return "local"
	if h.ends_with(".github.io"):
		return "pages"
	if h.ends_with(".ts.net"):
		return "tailnet"
	if (
		h == "itch.io"
		or h.ends_with(".itch.io")
		or h.ends_with(".itch.zone")
		or h.ends_with(".hwcdn.net")
	):
		return "itch"
	return "unknown"


func _make_uuid() -> String:
	var bytes := PackedByteArray()
	bytes.resize(16)
	for i in 16:
		bytes[i] = randi() % 256
	return bytes.hex_encode()
