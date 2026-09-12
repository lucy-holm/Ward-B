# Telemetry parity + transmission-gate tests.
#
#   godot --headless --path godot tools/check_telemetry.tscn
#
# The most important assertions here are the GATE ones. Everything else in
# this file is ordinary parity checking against src/game/telemetry.ts, but the
# gate matrix is the thing standing between "we measure our players" and "we
# also measure Tom, CI, the tailnet box and every playtest, mixed into the
# same funnel with no way to separate them afterwards".
#
# The gate is deliberately tested as a MATRIX rather than as one happy path,
# because it is an AND of two independent conditions and a regression in
# either one is invisible from the other's side.
extends Node

var _fail := 0


func _check(cond: bool, msg: String) -> void:
	if not cond:
		_fail += 1
		printerr("FAIL: ", msg)


func _ready() -> void:
	_test_host_classification()
	_test_transmission_gate()
	_test_envelope()
	_test_row_shape()
	_test_data_bounds()
	_test_counters()
	_test_queue_cap()
	_test_visibility_semantics()
	_test_completion_freezes_telemetry()
	await _test_shift_event_shape()

	if _fail == 0:
		print("OK - check_telemetry")
	get_tree().quit(1 if _fail > 0 else 0)


# --- the host table ------------------------------------------------------

func _test_host_classification() -> void:
	var cases := {
		# itch — the ONLY family allowed to transmit.
		"itch.io": "itch",
		"tommy-holmes.itch.io": "itch",
		"html-classic.itch.zone": "itch",
		"v6p9d9t4.ssl.hwcdn.net": "itch",
		# ...everything else is not.
		"lucy-holm.github.io": "pages",
		"localhost": "local",
		"127.0.0.1": "local",
		"hellos.tail1234.ts.net": "tailnet",
		"example.com": "unknown",
		"": "unknown",
	}
	for host: String in cases:
		var got := Telemetry.classify_host(host)
		_check(got == cases[host], "classify_host(%s) = %s, want %s" % [host, got, cases[host]])

	# A near-miss must NOT be read as itch. `contains("itch")` — what this
	# used to do — would have said itch for all three of these, which is how
	# a lookalike domain ends up writing into the collector.
	for hostile: String in ["itch.io.evil.com", "notitch.io", "myitchy.net", "itch.io.co"]:
		_check(
			Telemetry.classify_host(hostile) != "itch",
			"lookalike host %s must not classify as itch" % hostile
		)

	# ...and the CDN host the old check missed entirely. Worth its own
	# assertion because getting this wrong is silent: real plays would just
	# stop reporting.
	_check(
		Telemetry.classify_host("v6p9d9t4.ssl.hwcdn.net") == "itch",
		"itch serves the game frame from hwcdn.net — that IS a real play"
	)


# --- the gate matrix -----------------------------------------------------

func _test_transmission_gate() -> void:
	var saved_endpoint: String = Telemetry.endpoint
	var saved_env: String = Telemetry._env

	# Gate 1 alone is not enough: an endpoint with the wrong host stays shut.
	# This is the case that catches the itch build being re-hosted elsewhere.
	Telemetry.endpoint = "https://collector.example.workers.dev"
	for env: String in ["local", "pages", "tailnet", "unknown"]:
		Telemetry._env = env
		_check(
			not Telemetry._transmit_allowed(),
			"endpoint set + env '%s' must NOT transmit" % env
		)

	# Gate 2 alone is not enough either: the right host with no endpoint
	# compiled in has nowhere to send, which is the Pages/tailnet/local case.
	Telemetry.endpoint = ""
	Telemetry._env = "itch"
	_check(not Telemetry._transmit_allowed(), "env itch + no endpoint must NOT transmit")

	# Both together, and only both.
	Telemetry.endpoint = "https://collector.example.workers.dev"
	Telemetry._env = "itch"
	_check(Telemetry._transmit_allowed(), "env itch + endpoint SET must transmit")

	# The checked-in build config is the empty one. If this fails, someone has
	# committed a populated build_config.gd and every local run is reporting.
	_check(
		BuildConfig.TELEMETRY_ENDPOINT.is_empty(),
		"core/build_config.gd must be committed EMPTY — see its header"
	)

	Telemetry.endpoint = saved_endpoint
	Telemetry._env = saved_env


# --- wire compatibility with the Cloudflare worker -----------------------

func _test_envelope() -> void:
	var payload := Telemetry.build_payload([], 0)
	for key: String in ["version", "session", "player", "run", "env", "debug", "events"]:
		_check(payload.has(key), "batch envelope must carry '%s'" % key)

	# Omitted, not null, when absent — the worker distinguishes the two.
	_check(not payload.has("dropped"), "'dropped' omitted when zero")
	_check(not payload.has("experiment"), "'experiment' omitted when no experiment is active")
	_check(not payload.has("variant"), "'variant' omitted when no experiment is active")

	var with_drops := Telemetry.build_payload([], 7)
	_check(with_drops.get("dropped") == 7, "'dropped' present and correct when non-zero")

	# `debug` is a session flag, not a build flag: it marks a run that used the
	# ?room= dev jump, so the collector can exclude someone who skipped nine
	# rooms from any question about how long room ten takes.
	_check(payload.has("debug"), "batch always carries 'debug'")
	_check(payload["debug"] == false, "a normal run is not debug")


func _test_row_shape() -> void:
	Telemetry.disabled = false
	Telemetry._queue.clear()
	Telemetry.snapshot_provider = func() -> Dictionary:
		return {
			"room": "room4", "x": 1.23456, "z": -7.89123, "yaw": 0.5551,
			"level": "upper", "pills": 3, "state": "lucid", "medication": 12.3456,
		}

	Telemetry.event("door_opened", {"id": "north"})
	_check(Telemetry._queue.size() == 1, "event queued")
	var row: Dictionary = Telemetry._queue[0]

	for key: String in ["name", "t", "room", "x", "z", "yaw", "level", "pills", "state", "med"]:
		_check(row.has(key), "row must carry '%s'" % key)

	# 2dp rounding, matching round2() in the TS version. Compared approximately
	# and asserted again through JSON, because what actually has to match the
	# Three.js build is the SERIALISED form the worker stores — the underlying
	# double is never exactly 1.23 in either language.
	_check(is_equal_approx(row["x"], 1.23), "x rounded to 2dp (got %s)" % row["x"])
	_check(is_equal_approx(row["z"], -7.89), "z rounded to 2dp (got %s)" % row["z"])
	_check(is_equal_approx(row["med"], 12.35), "med rounded to 2dp (got %s)" % row["med"])
	_check(JSON.stringify(row["x"]) == "1.23", "x serialises as 1.23 (got %s)" % JSON.stringify(row["x"]))
	_check(JSON.stringify(row["z"]) == "-7.89", "z serialises as -7.89 (got %s)" % JSON.stringify(row["z"]))
	_check(JSON.stringify(row["med"]) == "12.35", "med serialises as 12.35 (got %s)" % JSON.stringify(row["med"]))
	# Caller data wins, mirroring the TS spread order `...data`.
	_check(row["id"] == "north", "caller-supplied fields are merged")
	_check(row["name"] == "door_opened", "name preserved")

	Telemetry._queue.clear()
	GameState.set_flag("room18.power", "lights")
	Telemetry.snapshot_provider = func() -> Dictionary: return {"room": "room19"}
	Telemetry.event("room_enter")
	_check(Telemetry._queue[0].get("room_variant") == "lights",
		"logical room19 enter carries the selected route variant")
	GameState.flags.erase("room18.power")
	Telemetry._queue.clear()


func _test_data_bounds() -> void:
	Telemetry.disabled = false
	Telemetry._queue.clear()
	var values: Array = []
	for i in 40:
		values.append(i)
	Telemetry.event("noise", {
		"source": String("s").repeat(600),
		"values": values,
		"nested": {"deep": {"deeper": {"bottom": {"value": "bounded"}}}},
	})
	var bounded_row: Dictionary = Telemetry._queue[0]
	_check(str(bounded_row["source"]).length() == Telemetry.MAX_EVENT_STRING_CHARS,
		"event strings are bounded")
	_check((bounded_row["values"] as Array).size() == Telemetry.MAX_EVENT_ARRAY_ITEMS,
		"event arrays are bounded")
	_check(bounded_row["nested"]["deep"]["deeper"]["bottom"] == "[truncated]",
		"deep event values are bounded")
	var many_fields := {}
	for i in Telemetry.MAX_EVENT_KEYS + 5:
		many_fields["field_%02d_%s" % [i, "x".repeat(80)]] = i
	many_fields["nan_value"] = NAN
	many_fields["inf_value"] = INF
	Telemetry.event("bounds", many_fields)
	var bounded_fields: Dictionary = Telemetry._queue[1]
	var copied := 0
	for key: String in bounded_fields:
		if key.begins_with("field_"):
			copied += 1
			_check(key.length() <= Telemetry.MAX_EVENT_KEY_CHARS,
				"top-level event keys are bounded")
	_check(copied == Telemetry.MAX_EVENT_KEYS,
		"top-level event fields are capped (got %d)" % copied)
	Telemetry.event("finite", {"nan_value": NAN, "inf_value": INF})
	var bounded_numbers: Dictionary = Telemetry._queue[2]
	_check(bounded_numbers.get("nan_value") == null and bounded_numbers.get("inf_value") == null,
		"non-finite numbers are encoded as null")
	Telemetry._queue.clear()


# --- rollup counters (F12) -----------------------------------------------

func _test_counters() -> void:
	Telemetry.disabled = false
	Telemetry.mark_room_enter()
	Telemetry._session_counters = {"catches": 0, "shifts": 0, "pills_used": 0}
	Telemetry._queue.clear()

	Telemetry.event("orderly_caught")
	Telemetry.event("orderly_caught")
	Telemetry.event("keypad_denied", {"entered": "1234"})
	# A manual unmed->lucid spends a pill...
	Telemetry.event("shift", {"direction": "unmed->lucid", "source": "manual"})
	# ...the way back never does...
	Telemetry.event("shift", {"direction": "lucid->unmed", "source": "manual"})
	# ...and neither does a scripted one, even into lucid.
	Telemetry.event("shift", {"direction": "unmed->lucid", "source": "room7-script"})

	var room := Telemetry.room_rollup()
	_check(room["catches"] == 2, "room catches = 2 (got %s)" % room["catches"])
	_check(room["keypad_fails"] == 1, "room keypad_fails = 1 (got %s)" % room["keypad_fails"])
	_check(room["shifts"] == 3, "room shifts = 3 (got %s)" % room["shifts"])
	_check(room["pills_used"] == 1, "only the manual unmed->lucid spends a pill (got %s)" % room["pills_used"])

	for key: String in [
		"duration_s", "active_s", "catches", "shifts",
		"pills_used", "keypad_fails", "distance_m", "med_left"
	]:
		_check(room.has(key), "room_complete payload must carry '%s'" % key)

	var session := Telemetry.session_rollup()
	for key: String in ["duration_s", "active_s", "catches", "shifts", "pills_used", "run_index"]:
		_check(session.has(key), "game_complete payload must carry '%s'" % key)
	# keypad_fails/distance are room-scope only, exactly as in the TS version.
	_check(not session.has("keypad_fails"), "keypad_fails is room-scope only")
	_check(not session.has("distance_m"), "distance_m is room-scope only")

	# mark_room_enter resets the room scope but NOT the session scope — that
	# is the whole point of having two.
	Telemetry.mark_room_enter()
	var fresh := Telemetry.room_rollup()
	_check(fresh["catches"] == 0, "room counters reset on room enter")
	_check(Telemetry.session_rollup()["catches"] == 2, "session counters survive a room change")

	Telemetry._queue.clear()


# --- transport hardening (F7) --------------------------------------------

func _test_queue_cap() -> void:
	Telemetry.disabled = false
	Telemetry._queue.clear()
	Telemetry._dropped = 0
	for i in Telemetry.QUEUE_CAP + 20:
		Telemetry._queue.append({"name": "filler"})
	Telemetry.event("pos")
	_check(
		Telemetry._queue.size() <= Telemetry.QUEUE_CAP,
		"queue never exceeds QUEUE_CAP (got %d)" % Telemetry._queue.size()
	)
	Telemetry._queue.clear()
	Telemetry._dropped = 0


# --- browser visibility semantics -----------------------------------------

func _test_visibility_semantics() -> void:
	var saved_disabled := Telemetry.disabled
	var saved_started := Telemetry._started
	var saved_suspended := Telemetry._suspended
	var saved_idle := Telemetry._idle
	var saved_quit := Telemetry._quit_fired
	var saved_completed := Telemetry._completed
	Telemetry.disabled = false
	Telemetry._started = true
	Telemetry._suspended = false
	Telemetry._idle = false
	Telemetry._quit_fired = false
	Telemetry._active_accum_ms = 0
	Telemetry._active_since_ms = Telemetry._mono_ms()
	Telemetry._perf_samples = PackedFloat32Array([60.0])
	Telemetry._perf_window_start_ms = 1
	var activity_before_hidden := Telemetry._last_activity_ms
	Telemetry._queue.clear()

	Telemetry.event("page_load")
	Telemetry.suspend_for_visibility()
	var hidden_active := Telemetry.active_ms()
	_check(Telemetry._suspended, "visibility suspension sets suspended state")
	_check(not Telemetry._quit_fired, "visibility suspension does not fire terminal quit")
	_check(Telemetry._queue.is_empty(), "visibility suspension flushes queued telemetry")
	_check(Telemetry.active_ms() == hidden_active, "active time excludes hidden interval")
	Telemetry._input(InputEventKey.new())
	_check(Telemetry._last_activity_ms == activity_before_hidden,
		"input while hidden cannot restart active accounting")
	Telemetry.event("pos")
	_check(Telemetry._queue.size() == 1, "events raised during suspension remain bounded and resumable")
	Telemetry.resume_from_visibility()
	_check(not Telemetry._suspended, "visibility resume clears suspended state")
	_check(not Telemetry._quit_fired, "visibility resume preserves the session")
	_check(Telemetry._perf_samples.is_empty() and Telemetry._perf_window_start_ms > 1,
		"visibility resume resets the performance window")
	Telemetry._process(10.0)
	_check(Telemetry._perf_samples.is_empty(),
		"first resumed frame is excluded from performance sampling")

	Telemetry.disabled = saved_disabled
	Telemetry._started = saved_started
	Telemetry._suspended = saved_suspended
	Telemetry._idle = saved_idle
	Telemetry._quit_fired = saved_quit
	Telemetry._completed = saved_completed
	Telemetry._queue.clear()
	Telemetry.snapshot_provider = Callable()


func _test_completion_freezes_telemetry() -> void:
	var saved_started := Telemetry._started
	var saved_completed := Telemetry._completed
	var saved_quit := Telemetry._quit_fired
	var saved_suspended := Telemetry._suspended
	Telemetry.disabled = false
	Telemetry._started = true
	Telemetry._completed = false
	Telemetry._quit_fired = false
	Telemetry._idle = false
	Telemetry._suspended = false
	Telemetry._active_accum_ms = 0
	Telemetry._active_since_ms = Telemetry._mono_ms()
	Telemetry._queue.clear()
	Telemetry.event("game_complete")
	var finished_active := Telemetry.active_ms()
	Telemetry._fire_quit()
	_check(Telemetry._completed, "game_complete freezes telemetry clocks")
	_check(Telemetry.active_ms() == finished_active, "active time stops after game completion")
	_check(not Telemetry._quit_fired, "pagehide after game completion does not add quit")
	Telemetry.suspend_for_visibility()
	var hidden_finished_active := Telemetry.active_ms()
	Telemetry.resume_from_visibility()
	_check(hidden_finished_active == finished_active and Telemetry.active_ms() == finished_active,
		"hide/show after completion cannot accrue active time")
	Telemetry._started = saved_started
	Telemetry._completed = saved_completed
	Telemetry._quit_fired = saved_quit
	Telemetry._suspended = saved_suspended
	Telemetry._queue.clear()


# --- the shift wire shape (F13) ------------------------------------------
#
# This one loads the WHOLE main scene rather than poking Telemetry directly,
# because the thing under test is main.gd's _on_state_changed — the fix that
# made scripted shifts logged at all. The Godot build used to emit
# `{"to": "lucid"}` from _try_shift only, which meant two defects at once:
# every scripted/imposed shift went unrecorded (half of F13), and the field
# name did not match what the collector has been storing since the Three.js
# build launched, so even the manual ones would not have joined up.
func _test_shift_event_shape() -> void:
	var main: Node = load("res://main.tscn").instantiate()
	add_child(main)
	await get_tree().process_frame
	await get_tree().process_frame

	Telemetry.disabled = false
	Telemetry._queue.clear()

	# A manual shift: costs a pill, source "manual".
	StateManager.can_shift = true
	GameState.pills = 1
	StateManager.state = StateManager.State.UNMED
	var res: int = StateManager.shift()
	_check(res == StateManager.ShiftResult.OK, "manual shift succeeds with a pill in hand")

	var shifts := _queued("shift")
	_check(shifts.size() == 1, "exactly ONE shift event per shift (got %d)" % shifts.size())
	if shifts.size() >= 1:
		var ev: Dictionary = shifts[0]
		_check(ev.has("direction"), "shift carries 'direction', not 'to'")
		_check(not ev.has("to"), "the old 'to' field is gone — the collector never read it")
		_check(ev.get("direction") == "unmed->lucid",
			"manual shift direction (got %s)" % ev.get("direction"))
		_check(ev.get("source") == "manual", "manual shift source (got %s)" % ev.get("source"))

	# A SCRIPTED shift. This is the half that used to be missing entirely:
	# force_state never went through _try_shift, so nothing logged it.
	Telemetry._queue.clear()
	StateManager.force_state(StateManager.State.UNMED, "room1-script")
	var scripted := _queued("shift")
	_check(scripted.size() == 1, "a scripted shift is logged too (F13) (got %d)" % scripted.size())
	if scripted.size() >= 1:
		var ev2: Dictionary = scripted[0]
		_check(ev2.get("direction") == "lucid->unmed",
			"scripted shift direction (got %s)" % ev2.get("direction"))
		_check(ev2.get("source") == "room1-script",
			"scripted shift carries its caller's source (got %s)" % ev2.get("source"))

	# ...and a scripted shift does NOT spend a pill, so pills_used must not move.
	Telemetry.mark_room_enter()
	StateManager.force_state(StateManager.State.LUCID, "room1-script")
	_check(Telemetry.room_rollup()["pills_used"] == 0,
		"a scripted shift into lucid spends no pill")

	Telemetry._queue.clear()
	main.queue_free()


func _queued(name: String) -> Array:
	var out := []
	for row: Dictionary in Telemetry._queue:
		if row.get("name") == name:
			out.append(row)
	return out
