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
}

const HUD_SCENE := preload("res://ui/hud.tscn")

# Environment mood targets, ported from renderer.ts:25-45.
const MOOD := {
	StateManager.State.LUCID: {
		"fog": Color(0.843, 0.894, 0.875),
		"fog_begin": 9.0,
		"fog_end": 30.0,
		"ambient": 0.28,
		"light": Color(0.949, 1.0, 0.984),
	},
	StateManager.State.UNMED: {
		"fog": Color(0.090, 0.043, 0.039),
		"fog_begin": 2.6,
		"fog_end": 13.0,
		"ambient": 0.13,
		"light": Color(1.0, 0.2, 0.141),
	},
}

@onready var world_root: Node3D = $WorldRoot
@onready var player: CharacterBody3D = $Player
@onready var world_environment: WorldEnvironment = $WorldEnvironment

var collision := WardCollision.new()
var hud: CanvasLayer

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

	player.add_to_group("player")
	player.world_collision = collision
	Telemetry.snapshot_provider = player.get_snapshot

	StateManager.medication_depleted.connect(_on_medication_depleted)
	StateManager.state_changed.connect(_on_state_changed)
	StateManager.medication_warning.connect(func() -> void: hud_toast("it's wearing thin."))

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
	Telemetry.event("medication_expired")


# --- presentation ----------------------------------------------------------

func _apply_mood(state: int, instant: bool) -> void:
	var env: Environment = world_environment.environment
	var m: Dictionary = MOOD[state]

	if _mood_tween != null and _mood_tween.is_valid():
		_mood_tween.kill()

	if instant:
		env.fog_light_color = m["fog"]
		env.fog_depth_begin = m["fog_begin"]
		env.fog_depth_end = m["fog_end"]
		env.ambient_light_energy = m["ambient"]
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


func shift_fx() -> void:
	var cam: Camera3D = player.camera
	if _fov_tween != null and _fov_tween.is_valid():
		_fov_tween.kill()
	cam.fov = Tuning.CAMERA_SHIFT_FOV_KICK
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
