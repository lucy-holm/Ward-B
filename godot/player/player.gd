# First-person player.
#
# A real CharacterBody3D on the player collision layer — but motion is
# resolved by WardCollision.try_move, NOT move_and_slide. See core/collision.gd
# for why. There is no velocity, no acceleration, no friction, no gravity and
# no jump anywhere in this game: position is set directly each tick. Adding
# any of those changes the feel immediately.
#
# Rig: yaw lives on the body, pitch on the camera (equivalent to the
# original's YXZ euler order), and the unmed "sway" is camera roll.
extends CharacterBody3D

const PITCH_LIMIT := 1.45  # rad, ~83.1 degrees

@onready var camera: Camera3D = $Camera3D

var world_collision: WardCollision
# Injected by main.gd on _ready, alongside world_collision. Null-safe: with no
# level data the verticality step below is skipped entirely and Y stays where
# spawn_at put it, which is what every test harness that builds a bare player
# gets.
var world_levels: WardLevels

var yaw := 0.0
var pitch := 0.0
var is_moving := false

# Stacked floors — the player's persistent "which floor am I on" answer.
#
# Level is NOT a pure function of (x, z): a gallery and the floor beneath it
# legitimately share an XZ rectangle with two different correct heights, and
# what disambiguates them for any one traveler is this field. It is only ever
# changed by WardLevels.resolve_level, driven from main.gd once per tick
# after movement, and only ever by physically walking a stairwell end to end.
# '__flat' is the synthetic level every room without authored levels uses, so
# this never differs from its default in rooms 1-16.
#
# global_position.y is the matching RENDERED height, eased toward
# WardLevels.floor_height_at each tick (also in main.gd). Movement below
# stays strictly 2D/XZ — y is never simulated, never collided against, and
# never integrated. There is no jumping and no falling in this game.
var level := WardLevels.FLAT_LEVEL_ID

# Accumulated look delta in pixels, consumed once per frame — mirrors
# input.ts's consumeLook(), so a dropped frame accumulates rather than
# losing input.
var _look_accum := Vector2.ZERO
var _input_enabled := false
var _bob_clock := 0.0

# Virtual stick state for touch. Godot gives us native touch events; we only
# have to decide what the left half of the screen means.
var _touch_stick_id := -1
var _touch_stick_origin := Vector2.ZERO
var _touch_stick_vec := Vector2.ZERO
var _touch_look_id := -1

# Touch is normalised against the live viewport, NOT measured in pixels.
#
# The Three.js build used a fixed radians-per-CSS-pixel. That does not
# survive the port: on web, Godot's UI coordinate space is the canvas drawing
# buffer, which is CSS x devicePixelRatio and cannot be changed from project
# settings (allow_hidpi is ignored on web). On a 2.6x phone that made look
# ~2.6x too fast and saturated a fixed 48px virtual stick after ~18px of
# thumb travel — full speed or nothing, no analog control.
#
# Normalising by viewport width means a swipe across a given FRACTION of the
# screen always turns the same amount, on any resolution or DPI. Calibrated
# so a full-width swipe matches the original on a 412px-wide phone
# (412 * 0.0024 * 1.9 = 1.88 rad).
const TOUCH_FULL_SWEEP_RAD := 1.88
const TOUCH_STICK_FRACTION := 0.115


func _ready() -> void:
	collision_layer = WardCollision.LAYER_PLAYER
	# We never use the physics solver for movement, so the player collides
	# with nothing via the engine; the mask stays clear and try_move does the
	# work. The layer is still set so orderlies/interactables can find us.
	collision_mask = 0


func set_input_enabled(enabled: bool) -> void:
	_input_enabled = enabled
	# Deliberately does NOT request capture. On the web that request is refused
	# outside a user gesture, so asking here is at best a no-op and at worst
	# misleading — it makes the code look like capture is handled when it is
	# not. Capture is requested on the first click, in _unhandled_input.
	# Only release the cursor when input is actually being taken away. This
	# used to also fire whenever a touchscreen existed, which on an iPad with a
	# trackpad attached fought every capture attempt: the device reports a
	# touchscreen, so the cursor was forced back to VISIBLE and look was dead.
	# A pure touch device never asks for capture in the first place (capture is
	# requested only from a real mouse button, and touch->mouse emulation is
	# off), so dropping the _is_touch() term costs nothing there.
	if not enabled:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE


func is_input_enabled() -> bool:
	return _input_enabled


func _is_touch() -> bool:
	return DisplayServer.is_touchscreen_available()


## True once a REAL pointer has been used. Not the same question as
## _is_touch(): an iPad with a trackpad is both at once, which is exactly the
## case that was broken. Reliable only because touch->mouse emulation is
## disabled in project.godot — with it on, every touch drag would set this.
var _pointer_seen := false

## Set when we have asked for pointer lock and it did not take. iPadOS Safari
## may refuse the request outright, and _apply_look only ran while the mouse
## was CAPTURED, so a refused request meant no look at all. When this is set we
## use the motion event's `relative` directly instead: the cursor stays visible
## and will eventually reach a screen edge, which is worse than pointer lock
## but far better than a camera that cannot turn.
var _capture_refused := false

## Set the moment we actually REQUEST pointer lock. The refusal check below is
## gated on this rather than on _pointer_seen, because _pointer_seen is set by
## mouse MOTION too — so on desktop, merely moving the cursor across the canvas
## before clicking would otherwise latch "refused" and make the camera swing on
## hover, with no click and no capture.
var _capture_attempted := false


## `spawn_y` seats the player at the spawn point's floor height immediately
## rather than letting the per-tick ease climb to it from 0 over ~10 ticks,
## which on a raised spawn would render as the room dropping out from under
## you on arrival. Ported from player.ts's `at.y ?? 0`. Defaults to 0, so a
## caller that does not care is unchanged.
func spawn_at(x: float, z: float, spawn_yaw: float,
		spawn_level := WardLevels.FLAT_LEVEL_ID, spawn_y := 0.0) -> void:
	global_position = Vector3(x, spawn_y, z)
	yaw = spawn_yaw
	pitch = 0.0  # deliberately reset, matching player.ts:34-41
	level = spawn_level
	_apply_rotation()


## A multi-level room MUST pass `to_level` explicitly on any catch/reset
## teleport. Otherwise a catch on the balcony drops the player at the ground
## spawn's XZ while still tagged 'balcony', where they would read the
## balcony's floor height, be blocked by the balcony's railings, and be
## invisible to every ground-level orderly. Y is left alone deliberately: the
## per-tick ease in main.gd resolves it to the destination's floor height
## within a few ticks, which reads as a stumble rather than a snap.
func teleport(x: float, z: float, to_level := "") -> void:
	global_position = Vector3(x, global_position.y, z)
	if not to_level.is_empty():
		level = to_level


func _unhandled_input(event: InputEvent) -> void:
	if not _input_enabled:
		return

	# CLICK TO CAPTURE. On the web, pointer lock can ONLY be requested from
	# inside a user-gesture handler — a browser silently refuses a request
	# made at startup. set_input_enabled() asks for MOUSE_MODE_CAPTURED in
	# _ready, that request is dropped, and because _apply_look only runs while
	# the mouse is actually captured, desktop mouse-look was completely dead:
	# clicking the viewport did nothing at all. Re-requesting here, inside a
	# real click, is the only thing that works in a browser.
	if event is InputEventMouseButton and (event as InputEventMouseButton).pressed:
		_pointer_seen = true
		if Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
			_capture_attempted = true
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
			# Whether the request was honoured is decided by the browser, not
			# here, so _process checks the outcome a frame later rather than
			# assuming it worked.
			return

	if event is InputEventMouseMotion:
		_pointer_seen = true
		var motion := event as InputEventMouseMotion
		if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
			# Pointer lock granted: every motion is look, cursor is hidden.
			_look_accum += motion.relative
		elif _capture_refused and motion.button_mask != 0:
			# NO POINTER LOCK — DRAG TO LOOK, and only while a button is held.
			#
			# iPadOS Safari refuses pointer lock, so the cursor stays visible
			# and is the only way to press the touch buttons, the keypad and
			# the start screen. An earlier version of this let ANY motion turn
			# the camera once lock was refused, which made the pointer unusable
			# for anything else: moving to a button spun the view. Requiring a
			# held button makes it behave like the touch drag it sits beside —
			# free movement points, dragging looks.
			_look_accum += motion.relative

	elif event is InputEventScreenTouch:
		_handle_touch(event as InputEventScreenTouch)

	elif event is InputEventScreenDrag:
		_handle_drag(event as InputEventScreenDrag)


func _handle_touch(e: InputEventScreenTouch) -> void:
	var half := float(get_viewport().get_visible_rect().size.x) * 0.5
	if e.pressed:
		if e.position.x < half and _touch_stick_id == -1:
			_touch_stick_id = e.index
			_touch_stick_origin = e.position
			_touch_stick_vec = Vector2.ZERO
		elif e.position.x >= half and _touch_look_id == -1:
			_touch_look_id = e.index
	else:
		if e.index == _touch_stick_id:
			_touch_stick_id = -1
			_touch_stick_vec = Vector2.ZERO
		elif e.index == _touch_look_id:
			_touch_look_id = -1


func _handle_drag(e: InputEventScreenDrag) -> void:
	if e.index == _touch_stick_id:
		var d := e.position - _touch_stick_origin
		_touch_stick_vec = d / stick_radius()
		if _touch_stick_vec.length() > 1.0:
			_touch_stick_vec = _touch_stick_vec.normalized()
	elif e.index == _touch_look_id:
		# Convert the viewport-unit delta into the equivalent number of
		# "sensitivity pixels" so _apply_look stays a single code path.
		_look_accum += e.relative * (_touch_rad_per_unit() / Tuning.LOOK_SENSITIVITY)


func viewport_width() -> float:
	return maxf(1.0, get_viewport().get_visible_rect().size.x)


func _touch_rad_per_unit() -> float:
	return TOUCH_FULL_SWEEP_RAD / viewport_width()


func stick_radius() -> float:
	return TOUCH_STICK_FRACTION * viewport_width()


# Movement runs on the physics tick so it is frame-rate independent, unlike
# the original's render-loop stepping. The original clamped dt to 0.05 s;
# a fixed 60 Hz tick is strictly better-behaved and preserves the guarantee
# that per-tick displacement (0.057 m) stays far below the 0.35 m radius, so
# tunnelling remains impossible.
func _physics_process(delta: float) -> void:
	if not _input_enabled:
		# Verticality still tracks the floor while input is suspended: the
		# ward renders live behind the start overlay, and a room script can
		# teleport the player during a cutscene-ish pause. Movement is what
		# the input gate is for, not height.
		_update_verticality()
		return

	_apply_look()

	var axes := _move_axes()
	is_moving = axes.length() > 0.0

	if is_moving and world_collision != null:
		# Clamp to the unit disc WITHOUT normalising up, so a half-deflected
		# touch stick keeps its analog magnitude and diagonals aren't faster.
		var mag := maxf(1.0, axes.length())
		var f := axes.y / mag
		var s := axes.x / mag
		var sp := Tuning.PLAYER_SPEED * delta
		var sn := sin(yaw)
		var cs := cos(yaw)
		# yaw 0 => forward is -Z, right is +X.
		var dx := (s * cs - f * sn) * sp
		var dz := (-f * cs - s * sn) * sp

		var from := Vector2(global_position.x, global_position.z)
		var to := from + Vector2(dx, dz)
		# `level` filters level-tagged colliders (a balcony railing must not
		# block the floor under it). XZ only — y is never touched here.
		var resolved := world_collision.try_move(
			from, to, Tuning.PLAYER_RADIUS, StateManager.state, level)
		global_position.x = resolved.x
		global_position.z = resolved.y

	# Verticality, run HERE rather than in main.gd, and deliberately outside
	# the `is_moving` branch above so a teleport or a standing ease still
	# resolves. See main.gd's ordering note: main's _physics_process actually
	# runs BEFORE this one, so doing it there would resolve and ease against
	# last tick's position.
	_update_verticality()

	if is_moving:
		_bob_clock += delta


# main.ts:527-542's order exactly: move (above, XZ only), then resolve which
# level we are on, then ease Y toward that level's floor height.
#
# RESOLVE BEFORE EASE, always. The ease asks "how high is the floor for the
# level I am on", so resolving second would spend the tick you step off a
# stairwell reading the height of the level you just left.
#
# The ease factor is per-TICK, not per-second, in both engines: main.ts
# clamps dt to 0.05 s and then applies a bare 0.35, and Godot's physics tick
# is a fixed 1/60 s, so the two agree at the 60 Hz the original ran at and
# the clamp can never bind here. Deliberately NOT rewritten as a
# dt-proportional exponential decay — 0.35 is a tuned feel value and changing
# its shape changes how a ramp reads.
#
# This is the ONLY thing in the game that writes the player's Y. Collision
# stays strictly 2D/XZ; there is no jumping, no falling and no vertical
# collision anywhere, and none is being added.
func _update_verticality() -> void:
	if world_levels == null:
		return
	var p := global_position
	level = world_levels.resolve_level(level, p.x, p.z)
	global_position.y += (world_levels.floor_height_at(level, p.x, p.z) - p.y) * WardLevels.Y_EASE


func _apply_look() -> void:
	if _look_accum == Vector2.ZERO:
		return
	yaw -= _look_accum.x * Tuning.LOOK_SENSITIVITY
	pitch = clampf(pitch - _look_accum.y * Tuning.LOOK_SENSITIVITY, -PITCH_LIMIT, PITCH_LIMIT)
	_look_accum = Vector2.ZERO
	_apply_rotation()


func _apply_rotation() -> void:
	rotation.y = yaw
	camera.rotation.x = pitch


func _move_axes() -> Vector2:
	# Returns (strafe, forward), each -1..1 before the disc clamp.
	var f := 0.0
	var s := 0.0
	if Input.is_action_pressed("move_forward"):
		f += 1.0
	if Input.is_action_pressed("move_back"):
		f -= 1.0
	if Input.is_action_pressed("move_left"):
		s -= 1.0
	if Input.is_action_pressed("move_right"):
		s += 1.0
	# Virtual stick: screen +y is down, so forward is -y.
	f += -_touch_stick_vec.y
	s += _touch_stick_vec.x
	return Vector2(s, f)


# Head bob and the unmed sway are cosmetic and run on the render frame so
# they stay smooth independent of the physics tick.
func _process(delta: float) -> void:
	# DID POINTER LOCK ACTUALLY HAPPEN? The browser decides, asynchronously, so
	# the only honest way to know is to look a frame later. If a real pointer
	# has been used, input is live, and the mouse still is not captured, then
	# the request was refused — switch to reading motion deltas directly so an
	# iPad trackpad can still turn the camera. Latches, because a refusal is a
	# property of the platform rather than of one frame.
	if _capture_attempted and _input_enabled and not _capture_refused:
		if Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
			_capture_refused = true

	var t := _bob_clock
	var bob := sin(t * 9.0) * 0.035 if is_moving else 0.0
	var sway := sin(Time.get_ticks_msec() * 0.0007) * 0.02 if not StateManager.is_lucid() else 0.0
	camera.position.y = Tuning.PLAYER_EYE_HEIGHT + bob
	camera.rotation.z = sway


## Virtual-stick state, for the on-screen touch UI to draw itself.
func get_touch_stick() -> Dictionary:
	return {
		"active": _touch_stick_id != -1,
		"origin": _touch_stick_origin,
		"vec": _touch_stick_vec,
		"radius": stick_radius(),
	}


func get_snapshot() -> Dictionary:
	return {
		"room": GameState.current_room,
		"x": global_position.x,
		"z": global_position.z,
		"yaw": yaw,
		"level": level,
		"pills": GameState.pills,
		"state": "lucid" if StateManager.is_lucid() else "unmed",
		"medication": StateManager.medication if StateManager.is_lucid() else 0.0,
	}
