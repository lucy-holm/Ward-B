# Game controller: owns the collision cache, loads rooms, drives interaction,
# and enforces the frame ordering the original main.ts loop guaranteed.
#
# ORDERING CONTRACT (from src/main.ts:515-569) — load-bearing:
#   1. player moves          (Player._physics_process)
#   2. orderlies move        (Orderly._physics_process)
#   3. medication expiry     (here, AFTER orderlies — so an orderly can
#                             never react to a revert in the same tick)
#   4. exit check            (Area3D signals, effectively last)
# process_priority is set so this node ticks after the player and the room.
extends Node3D

const ROOM_SCENES := {
	"room1": "res://rooms/room1/room1.tscn",
	"room2": "res://rooms/room2/room2.tscn",
	"room3": "res://rooms/room3/room3.tscn",
	"room4": "res://rooms/room4/room4.tscn",
	"room5": "res://rooms/room5/room5.tscn",
	"room6": "res://rooms/room6/room6.tscn",
	"room7": "res://rooms/room7/room7.tscn",
}

const HUD_SCENE := preload("res://ui/hud.tscn")
const KEYPAD_SCENE := preload("res://ui/keypad.tscn")
const TOUCH_SCENE := preload("res://ui/touch_controls.tscn")
const GRAIN_SCENE := preload("res://ui/grain.tscn")
const START_OVERLAY_SCENE := preload("res://ui/start_overlay.tscn")

# Film grain opacity per state — the ward is grainier unmedicated.
const GRAIN_LUCID := 0.025
const GRAIN_UNMED := 0.04

# Environment mood targets, ported from renderer.ts:25-45.
#
# NOTE: these values OVERRIDE whatever main.tscn's Environment carries, from
# the first _apply_mood in _ready onwards. Editing the .tscn alone does
# nothing at runtime — this dict is the real source of truth for per-state
# lighting.
#
# The gap between the two states is deliberately extreme. UNMEDICATED is meant
# to be barely navigable: near-zero ambient, low exposure, lights heavily
# scaled down and flickering. LUCID is clinically over-lit by contrast.
# Shifting should feel like the building itself changes, not a colour filter.
#
# This is only safe because the things you MUST see are unshaded and so are
# untouched by any of it: wall scrawls (shaded = false), the pill, the glow
# panels, and the fixtures' amber/cyan accent strips. In the dark the red
# scrawls and the pill burn through an almost black room — which is the
# intended read, not a compromise.
#
# TUNE AGAINST A LARGE ROOM AND A SMALL ONE, ALWAYS.
#
# The 2026-08 darkness pass was tuned solely against room 1's spawn and shipped
# values (ambient 0.003 / exposure 0.30 / light_scale 0.10 / fog_end 7.5) that
# made room 1 look superb and rendered room 4 as literally two faint smears of
# ceiling on pure black — no floor, no walls, no props, unplayable. Room 1's
# spawn faces a wall 2m away under a fitting; room 4 is a 12x12 hall. Any
# setting judged from one of those is wrong for the other.
#
# The dominant term for a big room is FOG, not light: unmed fog is near-black,
# so a fog_end of 7.5m replaced everything past 7.5m in a 12m hall with solid
# fog colour. No amount of light_scale could recover it. fog_end 16.0 with
# fog_begin 2.5 keeps the close-range murk that makes corridors oppressive
# while letting a hall resolve at all. light_scale/exposure then only had to
# come part-way back (0.10 -> 0.30, 0.30 -> 0.42) rather than all the way.
#
# Verified on room 1 spawn AND room 4 centre, in both states.
#
# AND VERIFY THROUGH THE REAL GAME, NOT tools/shoot.gd.
#
# None of this reached the screen for the entire life of the port: player.tscn's
# Camera3D carried a placeholder Environment, and Camera3D.environment overrides
# WorldEnvironment outright, so the game rendered at default linear tonemapping
# and exposure 1.0 with no fog while these values were written to an
# Environment that never drew a pixel. shoot.gd builds its own camera and
# environment, so every screenshot looked correctly dark and the successive
# "make it darker" passes were tuning an image nobody was playing — at the
# room-1 spawn, game (42,43,36) vs harness (4,5,1).
#
# Use tools/shoot_game.tscn (real main.tscn) or tools/shoot_web.mjs (real
# browser) for any judgement about how dark the ward actually is.
#
# EXPOSURE IS NOT THE WHOLE STORY EITHER. `exposure` below is the baseline at
# a brightness setting of 1.0; _apply_mood multiplies it by the player's
# display-calibration setting (WardSettings.get_brightness()). The setting is
# a single multiplier applied to BOTH states so calibrating for a dim screen
# cannot flatten the gap between them. See _target_exposure().
#
# `light_tint` (2026-08 concept-art pass): multiplies every fitting's own
# authored light_color in Atmosphere._tick_flicker — see set_light_color().
# This field existed in the dict since the TS port but was DEAD: nothing ever
# read MOOD[state]["light"], so both states left every fixture at whatever
# near-white colour was authored in the room .tscn. Renamed light -> light_tint
# and wired up because "sickly failing ward" needs a colour cast, not just a
# dimmer switch — a dim neutral-white bulb reads as "dark room", not "sick
# building". UNMED leans cool-green (kills red, lifts green slightly) so the
# same near-white ceiling tubes read sickly and the warm amber floor "bounce"
# fixtures (fake_gi_bounce, see room .tscn "L*_bounce" nodes) come out a
# muddier, cooler amber rather than clean warm light — both colours pulled
# toward the same infection. LUCID's tint is close to identity (barely warm)
# so daylight-through-barred-windows reads clean, matching concept 95b44321.
#
# UNMED's `exposure` (0.42) is DELIBERATELY UNTOUCHED by this pass — see the
# HARD CONSTRAINT comment on _target_exposure(). Every other UNMED number
# below moved instead: ambient and light_scale both dropped further, which is
# safe because light PLACEMENT (room .tscn omni_range/omni_attenuation, tuned
# tighter in the same pass so pools fall off faster) now carries more of the
# "pool vs black" contrast that ambient/light_scale used to carry alone.
# LUCID's exposure DID move (0.95 -> 0.78): at 0.95 x the default 1.25
# brightness-setting multiplier, a wall directly under a fixture (e.g. room 1's
# spawn, 2m from L0) blew fully white with no readable detail — confirmed via
# tools/shoot_states.tscn, not by eye. 0.78 keeps LUCID unambiguously the
# brighter, calmer state without clipping the geometry closest to a fitting.
const MOOD := {
	StateManager.State.LUCID: {
		"fog": Color(0.843, 0.894, 0.875),
		"fog_begin": 10.0,
		"fog_end": 34.0,
		"ambient": 0.28,
		"exposure": 0.78,
		"light_scale": 0.88,
		"light_tint": Color(1.0, 0.98, 0.93),
	},
	StateManager.State.UNMED: {
		"fog": Color(0.090, 0.043, 0.039),
		"fog_begin": 2.2,
		"fog_end": 16.0,
		"ambient": 0.006,
		"exposure": 0.42,
		"light_scale": 0.26,
		"light_tint": Color(0.72, 1.0, 0.80),
	},
}

@onready var world_root: Node3D = $WorldRoot
@onready var player: CharacterBody3D = $Player
@onready var world_environment: WorldEnvironment = $WorldEnvironment

var collision := WardCollision.new()
var hud: CanvasLayer
var keypad: CanvasLayer
var touch_controls: CanvasLayer
var grain: CanvasLayer
var start_overlay: CanvasLayer
var atmosphere: Atmosphere

var current_room: Node = null
var current_room_id := ""

var _focused: Interactable = null
var _medication_trapped := false
# The meter emits `medication_depleted` exactly once. The trap guard has to
# be re-tested every tick until the player steps clear, so we latch here.
var _awaiting_revert := false
var _mood_tween: Tween
var _fov_tween: Tween


func _ready() -> void:
	process_priority = 100

	hud = HUD_SCENE.instantiate()
	add_child(hud)
	# Hidden until ADMIT ME. The ward itself is meant to render behind the
	# start screen, but the HUD is not part of that picture, and two defects
	# were visible in the very first render of the start overlay: the room-1
	# objective line ran straight through the WARD B title, and the reticle
	# dot sat in the middle of the CONFIGURATION panel looking like a stuck
	# pixel. The TS build gets away with leaving its HUD up only because its
	# start overlay is fully opaque; the config panel here is deliberately
	# see-through so the player can calibrate brightness against the real
	# ward, which puts the HUD back on screen.
	hud.visible = false

	keypad = KEYPAD_SCENE.instantiate()
	add_child(keypad)

	# Touch controls hide themselves on non-touch devices. Without these a
	# phone player can look and walk but can never interact or shift, which
	# makes the game unfinishable from Room 1's pill onward.
	touch_controls = TOUCH_SCENE.instantiate()
	add_child(touch_controls)
	touch_controls.player = player
	touch_controls.interact_pressed.connect(_interact)
	touch_controls.shift_pressed.connect(_try_shift)

	grain = GRAIN_SCENE.instantiate()
	add_child(grain)

	# Gates play behind ADMIT ME and is the only route to the randomize-codes
	# config panel — the Godot analogue of index.html's #startOverlay /
	# #settingsOverlay + hud.ts's showStart()/bindConfig(). Added last among
	# the UI layers so its CanvasLayer.layer (10) reliably sits above all of
	# them (keypad=5, touch=3, hud/grain lower) regardless of add order, but
	# instantiation order doesn't actually matter for that — layer does.
	start_overlay = START_OVERLAY_SCENE.instantiate()
	add_child(start_overlay)
	start_overlay.admit_pressed.connect(_on_admit_pressed)
	# Live display calibration: the config panel deliberately renders over the
	# real, already-loaded ward (see start_overlay.gd), so dragging the slider
	# has to write through to the frame behind it on the same tick.
	start_overlay.brightness_changed.connect(apply_brightness_now)

	atmosphere = Atmosphere.new()
	atmosphere.name = "Atmosphere"
	add_child(atmosphere)
	atmosphere.bind_environment(world_environment.environment)

	player.add_to_group("player")
	player.world_collision = collision
	Telemetry.snapshot_provider = player.get_snapshot

	StateManager.medication_depleted.connect(_on_medication_depleted)
	StateManager.state_changed.connect(_on_state_changed)
	StateManager.medication_warning.connect(func() -> void:
		hud_toast("it's wearing thin.")
		WardAudio.set_medication_warning(true))

	Telemetry.event("page_load")
	GameState.run_started_unix = int(Time.get_unix_time_from_system())

	_apply_mood(StateManager.state, true)
	load_room("room1")
	# Deliberately does NOT call player.set_input_enabled(true) here — the
	# scene is meant to be visible as a backdrop behind the start overlay
	# ("initial presentation: scene visible behind the start overlay",
	# main.ts), but play stays gated until ADMIT ME. See _on_admit_pressed.


func _on_admit_pressed() -> void:
	hud.visible = true
	player.set_input_enabled(true)
	# CLICK TO CAPTURE, but fired from the ADMIT ME button itself rather than
	# waiting for player.gd's own first-click handler: a Button's `pressed`
	# signal already consumes the click as GUI input, so it never reaches
	# player._unhandled_input, and without this the player would need an
	# extra, unexplained click after admission just to get mouse-look. The
	# button press is itself a real user gesture, so requesting capture here
	# is still inside the one place a browser will actually grant it — see
	# player.gd's own "CLICK TO CAPTURE" comment for why capture can't just
	# be requested unconditionally at startup.
	if not DisplayServer.is_touchscreen_available():
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("shift_state"):
		_try_shift()
	elif event.is_action_pressed("interact"):
		_interact()
	elif event.is_action_pressed("ui_release_mouse"):
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE


func _physics_process(_delta: float) -> void:
	_update_focus()
	_update_revert_guard()


# --- state -----------------------------------------------------------------

func _try_shift() -> void:
	var result := StateManager.shift()
	match result:
		StateManager.ShiftResult.OK:
			shift_fx()
			Telemetry.event("shift", {"to": "lucid" if StateManager.is_lucid() else "unmed"})
		StateManager.ShiftResult.NO_PILLS:
			hud_toast("nothing left to swallow.")
			Telemetry.event("pills_empty")
		StateManager.ShiftResult.NO_ABILITY:
			pass


func _on_state_changed(next: StateManager.State, _prev: StateManager.State, _source: String) -> void:
	_apply_mood(next, false)

	if next != StateManager.State.LUCID:
		_medication_trapped = false
		_awaiting_revert = false
		WardAudio.set_medication_warning(false)

	# Rooms react last, exactly as the original fanned out (main.ts:314-334):
	# the world/HUD/audio are already flipped by the time a room script runs.
	if current_room != null and current_room.has_method("on_state_change"):
		current_room.on_state_change(next)


# The geometry-trap guard. The meter hitting zero does NOT automatically
# revert: if the player stands where an unmed-only wall would materialise,
# the revert is deferred, tick by tick, until they step clear. This is why
# the player can never be embedded in geometry, and the only case where
# lucidity outlasts 45 seconds.
func _on_medication_depleted() -> void:
	_awaiting_revert = true


func _update_revert_guard() -> void:
	if not _awaiting_revert or not StateManager.is_lucid():
		return

	var p := player.global_position
	if collision.circle_hits_solid_unmed(p.x, p.z, Tuning.PLAYER_RADIUS):
		if not _medication_trapped:
			_medication_trapped = true
			hud_toast("wearing off — keep moving.")
		return

	_medication_trapped = false
	_awaiting_revert = false
	StateManager.force_state(StateManager.State.UNMED, "expiry")
	hud_toast("the calm drains out of you.")
	WardAudio.medication_expired_cue()
	Telemetry.event("medication_expired")


# --- presentation ----------------------------------------------------------

## The ONLY expression of the brightness setting anywhere in the game.
##
## MOOD's per-state `exposure` is the baseline at a setting of 1.0; the
## player's display calibration is a single multiplier on top. Deliberately
## one multiplier shared by both states rather than a per-state offset: how
## dark a screen renders is a property of the screen, not of the ward, and
## scaling both by the same factor leaves the LUCID:UNMED exposure ratio
## (0.95 : 0.42) exactly as tuned. A player calibrating for a dim laptop
## therefore cannot accidentally flatten the difference between the two
## states, which is the one thing the whole game is built on.
##
## tonemap_exposure is also the right knob rather than ambient or light_scale:
## it is a post-tonemap gain on the finished frame, so it cannot change which
## objects are lit, how far fog reaches, or anything the player reasons about.
func _target_exposure(state: int) -> float:
	return float(MOOD[state]["exposure"]) * WardSettings.get_brightness()


## Re-applies the brightness setting to the ward RIGHT NOW, without waiting
## for the next state change. Called live while the config panel's slider is
## being dragged, which is the only way a player can judge the setting: the
## start overlay renders over the real, already-loaded room, so this writes
## through to the frame behind the panel as they drag.
##
## Writes tonemap_exposure directly instead of going through _apply_mood: a
## re-run of the full mood would restart the 0.45 s crossfade tween on every
## slider step and the ward would visibly lag the slider.
func apply_brightness_now() -> void:
	if _mood_tween != null and _mood_tween.is_valid():
		# A state crossfade is mid-flight, animating tonemap_exposure toward
		# a target computed from the OLD brightness. Writing the property
		# directly here would be overwritten by the tween on the next frame,
		# so restart the mood instantly instead — it recomputes every target,
		# exposure included, from the new setting.
		_apply_mood(StateManager.state, true)
		return
	world_environment.environment.tonemap_exposure = _target_exposure(StateManager.state)


func _apply_mood(state: int, instant: bool) -> void:
	var env: Environment = world_environment.environment
	var m: Dictionary = MOOD[state]

	if _mood_tween != null and _mood_tween.is_valid():
		_mood_tween.kill()

	# Hand the target fog to Atmosphere so its "breathing" oscillates around
	# the new base rather than the old one.
	if atmosphere != null:
		atmosphere.set_fog_base(m["fog_begin"], m["fog_end"])
		# The fittings themselves dim in unmed, on top of the ambient drop.
		# Ambient alone cannot get dark enough without flattening the light
		# pools too, which is what makes a room read as unlit rather than
		# merely dim.
		atmosphere.set_light_scale(m["light_scale"], instant)
		# And tint, so "dim" also means "sick" rather than "a clean bulb on a
		# dimmer" — see the MOOD comment block above for why this field was
		# dead for the whole life of the port.
		atmosphere.set_light_color(m["light_tint"], instant)
	_set_grain(GRAIN_LUCID if state == StateManager.State.LUCID else GRAIN_UNMED, instant)

	if instant:
		env.fog_light_color = m["fog"]
		env.fog_depth_begin = m["fog_begin"]
		env.fog_depth_end = m["fog_end"]
		env.ambient_light_energy = m["ambient"]
		env.tonemap_exposure = _target_exposure(state)
		env.background_color = m["fog"]
		return

	# The brief specifically asked for a crossfade rather than an instant
	# swap — this was hard to sell in Three.js and is where Godot's
	# Environment + Tween combo actually earns the migration.
	_mood_tween = create_tween().set_parallel(true)
	_mood_tween.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	_mood_tween.tween_property(env, "fog_light_color", m["fog"], 0.45)
	_mood_tween.tween_property(env, "background_color", m["fog"], 0.45)
	_mood_tween.tween_property(env, "fog_depth_begin", m["fog_begin"], 0.45)
	_mood_tween.tween_property(env, "fog_depth_end", m["fog_end"], 0.45)
	_mood_tween.tween_property(env, "ambient_light_energy", m["ambient"], 0.45)
	_mood_tween.tween_property(env, "tonemap_exposure", _target_exposure(state), 0.45)


func _set_grain(strength: float, instant: bool) -> void:
	if grain == null:
		return
	var rect: ColorRect = grain.get_node_or_null("Rect")
	if rect == null or rect.material == null:
		return
	var mat := rect.material as ShaderMaterial
	if instant:
		mat.set_shader_parameter("strength", strength)
		return
	create_tween().tween_method(
		func(v: float) -> void: mat.set_shader_parameter("strength", v),
		float(mat.get_shader_parameter("strength")), strength, 0.45)


func shift_fx() -> void:
	var cam: Camera3D = player.camera
	if _fov_tween != null and _fov_tween.is_valid():
		_fov_tween.kill()
	cam.fov = Tuning.CAMERA_SHIFT_FOV_KICK
	WardAudio.shift_stinger()
	_fov_tween = create_tween()
	_fov_tween.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	_fov_tween.tween_property(cam, "fov", Tuning.CAMERA_FOV, 0.55)


func hud_toast(text: String) -> void:
	hud.toast(text)


func hud_objective(text: String) -> void:
	hud.set_objective(text)


# --- interaction -----------------------------------------------------------

func _update_focus() -> void:
	var ray: RayCast3D = player.camera.get_node("InteractRay")
	ray.force_raycast_update()

	var hit: Interactable = null
	if ray.is_colliding():
		var c := ray.get_collider()
		if c is Interactable and (c as Interactable).is_focusable():
			hit = c as Interactable

	if hit == _focused:
		return
	_focused = hit
	hud.set_prompt("" if hit == null else "[E] %s" % hit.label)


func _interact() -> void:
	if _focused == null:
		return
	var id := _focused.interactable_id
	var itype := _focused.interactable_type

	# Room script first; returning true means fully handled.
	if current_room != null and current_room.has_method("on_interact"):
		if current_room.on_interact(id):
			return

	match itype:
		"dispenser":
			if GameState.pills >= Tuning.PILLS_MAX:
				Telemetry.event("dispenser_refused")
				hud_toast("you're already carrying one.")
			else:
				GameState.refill()
				WardAudio.dispenser_clunk()
				Telemetry.event("dispenser_used")
				hud_toast("one pill. that's all it gives.")
		"pill_pickup":
			GameState.pills += 1
			remove_interactable(id)
			Telemetry.event("pill_pickup")


func remove_interactable(id: String) -> void:
	if current_room == null:
		return
	var node := _find_interactable(current_room, id)
	if node != null:
		if node == _focused:
			_focused = null
			hud.set_prompt("")
		node.queue_free()


func _find_interactable(node: Node, id: String) -> Interactable:
	if node is Interactable and (node as Interactable).interactable_id == id:
		return node as Interactable
	for child in node.get_children():
		var found := _find_interactable(child, id)
		if found != null:
			return found
	return null


# --- rooms -----------------------------------------------------------------

func load_room(id: String) -> void:
	if current_room != null:
		if current_room.has_method("on_leave"):
			current_room.on_leave()
		current_room.queue_free()
		current_room = null
	_focused = null

	var path: String = ROOM_SCENES.get(id, "")
	if path.is_empty():
		push_error("Unknown room id: %s" % id)
		return

	var packed: PackedScene = load(path)
	current_room = packed.instantiate()
	world_root.add_child(current_room)
	current_room_id = id

	# Rebuild the AABB cache from the freshly-instanced room. Done once per
	# load; state-conditional colliders are filtered at query time by their
	# layer, so a state change never needs a rebuild.
	collision.rebuild_from(current_room)

	# Fluorescents are per-room, so the flicker set has to be rebuilt on load.
	if atmosphere != null:
		atmosphere.collect_lights(current_room)

	GameState.enter_room(id)

	var spawn: Node3D = current_room.get_node_or_null("Spawn")
	if spawn != null:
		player.spawn_at(spawn.global_position.x, spawn.global_position.z, spawn.rotation.y)

	if current_room.has_method("on_enter"):
		current_room.on_enter(self)

	Telemetry.event("room_enter")
	Telemetry.flush()


func complete_room(to: String) -> void:
	Telemetry.event("room_complete")
	GameState.complete_room(current_room_id)
	if to == "END":
		player.set_input_enabled(false)
		Telemetry.event("game_complete")
		Telemetry.flush(true)
		return
	load_room(to)


func teleport_player(x: float, z: float, level := "") -> void:
	player.teleport(x, z, level)


# --- room-script API -------------------------------------------------------
# Everything a room .gd is allowed to touch. Kept narrow on purpose: the
# Three.js version's GameCtx was the same idea, and keeping the surface small
# is what let rooms 1-20 survive engine changes.

## Opens the modal keypad. The room supplies the code and its own handlers;
## `on_denied` receives the attempted string.
func open_keypad(code: String, on_success: Callable, on_denied := Callable()) -> void:
	for sig in [keypad.success, keypad.denied, keypad.closed]:
		for c in sig.get_connections():
			sig.disconnect(c["callable"])

	keypad.success.connect(func() -> void:
		Telemetry.event("keypad_success")
		on_success.call())

	keypad.denied.connect(func(attempt: String) -> void:
		Telemetry.event("keypad_denied", {"entered": attempt})
		if on_denied.is_valid():
			on_denied.call(attempt))

	Telemetry.event("keypad_open")
	keypad.open(code)


## Swings a door open: reposition its mesh, then drop its collider so the
## doorway is walkable. The TS version shoved the collider's x to 999; here we
## clear the collision layer and rebuild the cache, which is the same idea
## without the sentinel.
func move_interactable(id: String, pos: Vector3, rot_y := 0.0) -> void:
	var node := _find_interactable(current_room, id)
	if node == null:
		return
	node.global_position = pos
	node.rotation.y = rot_y


func unlock_door(node_name: String) -> void:
	var body := current_room.find_child(node_name, true, false)
	if body == null:
		push_warning("unlock_door: no node '%s' in %s" % [node_name, current_room_id])
		return
	if body is CollisionObject3D:
		(body as CollisionObject3D).collision_layer = 0
	rebuild_collision()
	Telemetry.event("door_opened")


## Rebuild the AABB cache. Required after any collider is enabled/disabled.
func rebuild_collision() -> void:
	if current_room != null:
		collision.rebuild_from(current_room)


## Rewrite a wall scrawl in place — used by the randomize-codes wiring so a
## rerolled code shows up on the wall that leaks it.
func update_scrawl_text(id: String, text: String) -> void:
	var node := current_room.find_child(id, true, false)
	if node is Label3D:
		(node as Label3D).text = text


## Drives the directional threat indicator from an orderly room's update.
## Also feeds the audio threat bus, so all four orderly rooms get the
## heartbeat and chase whine without each having to wire it.
##
## `watching()` returns exactly 1.0 iff chasing, so the level doubles as the
## chase flag and rooms don't need to pass it separately.
func set_threat(level: float, bearing) -> void:
	hud.set_threat(level, bearing)
	if level <= 0.0 and bearing == null:
		WardAudio.silence_threat()
	else:
		WardAudio.set_threat(level, level >= 1.0)
