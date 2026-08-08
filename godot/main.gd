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
const MOOD := {
	StateManager.State.LUCID: {
		"fog": Color(0.843, 0.894, 0.875),
		"fog_begin": 12.0,
		"fog_end": 40.0,
		"ambient": 0.34,
		"exposure": 0.95,
		"light_scale": 1.0,
		"light": Color(0.949, 1.0, 0.984),
	},
	StateManager.State.UNMED: {
		"fog": Color(0.090, 0.043, 0.039),
		"fog_begin": 2.5,
		"fog_end": 16.0,
		"ambient": 0.010,
		"exposure": 0.42,
		"light_scale": 0.30,
		"light": Color(1.0, 0.2, 0.141),
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
	player.set_input_enabled(true)


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
	_set_grain(GRAIN_LUCID if state == StateManager.State.LUCID else GRAIN_UNMED, instant)

	if instant:
		env.fog_light_color = m["fog"]
		env.fog_depth_begin = m["fog_begin"]
		env.fog_depth_end = m["fog_end"]
		env.ambient_light_energy = m["ambient"]
		env.tonemap_exposure = m["exposure"]
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
	_mood_tween.tween_property(env, "tonemap_exposure", m["exposure"], 0.45)


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
