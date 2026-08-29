# Game controller: owns the collision cache, loads rooms, drives interaction,
# and enforces the frame ordering the original main.ts loop guaranteed.
#
# ORDERING CONTRACT (from src/main.ts:515-569) — load-bearing:
#   1. player moves, then resolves its level, then eases its Y
#                            (all three in Player._physics_process, in that
#                             order — see the note on ordering below)
#   2. orderlies move        (Orderly._physics_process)
#   3. medication expiry     (here, AFTER orderlies — so an orderly can
#                             never react to a revert in the same tick)
#   4. exit check            (Area3D signals, effectively last)
# ORDERING IS NOT ENFORCED BY process_priority BELOW. That property orders
# _process only; the physics equivalent is process_physics_priority, which
# nothing here sets. Measured in Godot 4.7: this node's _physics_process runs
# BEFORE the player's, because a parent ticks before its children and
# main.tscn orders WorldEnvironment, WorldRoot, Player. So anything here that
# reads the player's position is reading last tick's.
#
# Two things follow, and both are deliberate rather than oversights:
#
#  * The verticality step lives in Player._physics_process, directly after the
#    movement it depends on, NOT here. That makes "move, then resolve level,
#    then ease Y" structural instead of a property nobody can see is
#    load-bearing. Putting it here resolved against last tick's position and
#    landed every level flip one tick late — proven by a test that fails with
#    "crossed at tick 1, flipped at tick 2" when the logic is moved back.
#
#  * core/trigger_poll.gd takes the HEAD of the tick
#    (process_physics_priority = -100) so its callbacks are always fresh
#    before any room's _physics_process. It cannot use the literal Three.js
#    slot of "right after the player", because main.tscn puts WorldRoot before
#    Player and nothing can sit between them. See that file's header.
#
# Left un-"fixed": _update_focus() therefore raycasts from the PREVIOUS tick's
# camera transform, 16.7ms of lag on the interaction prompt, which is why it
# went unnoticed. Setting process_physics_priority here would re-time every
# existing room and orderly at once — a change to make deliberately, with a
# playtest, not as a drive-by during a port.
extends Node3D

const ROOM_SCENES := {
	"room1": "res://rooms/room1/room1.tscn",
	"room2": "res://rooms/room2/room2.tscn",
	"room3": "res://rooms/room3/room3.tscn",
	"room4": "res://rooms/room4/room4.tscn",
	"room5": "res://rooms/room5/room5.tscn",
	"room6": "res://rooms/room6/room6.tscn",
	"room7": "res://rooms/room7/room7.tscn",
	"room8": "res://rooms/room8/room8.tscn",
	"room9": "res://rooms/room9/room9.tscn",
	"room10": "res://rooms/room10/room10.tscn",
	"room11": "res://rooms/room11/room11.tscn",
	"room12": "res://rooms/room12/room12.tscn",
	"room13": "res://rooms/room13/room13.tscn",
	"room14": "res://rooms/room14/room14.tscn",
	"room15": "res://rooms/room15/room15.tscn",
	"room16": "res://rooms/room16/room16.tscn",
	"room17": "res://rooms/room17/room17.tscn",
	"room18": "res://rooms/room18/room18.tscn",
	# room19 is a VARIANT room — room 18's relay picks which scene loads.
	# Registered at the lights path so check_rooms.gd's chain walk can
	# resolve room18's exit; ROOM_VARIANTS decides what actually loads.
	"room19": "res://rooms/room19_lights/room19_lights.tscn",
	"room20": "res://rooms/room20/room20.tscn",
}

# --- ROOM VARIANTS ----------------------------------------------------------
#
# One room id, more than one authored scene, chosen at load time from a
# run-scoped GameState flag. Room 19 ("the Undercroft") is the only user: room
# 18's relay lever writes "room18.power", and room 19 is a structurally
# different room per value — different geometry, different exit, a differently
# shaped patrol — so it ships as two real scene files rather than one scene
# that prunes itself at runtime. Two files are independently openable in the
# editor, independently screenshot-testable and independently auditable for
# soft-locks; a self-pruning scene is a file whose actual contents depend on
# runtime state, which is exactly what makes a room hard to audit.
#
# Kept as a SEPARATE table from ROOM_SCENES on purpose: that map must stay a
# plain id -> path dictionary, because tools/check_rooms.gd parses it straight
# out of this file line by line and a nested value would break it.
#
# WIRING THE CHAIN (for whoever owns it): registering "room19" in ROOM_SCENES
# above, pointing at the DEFAULT variant, gives check_rooms and its chain walk
# something to resolve for room 18's exit. This table still decides what
# actually loads, so the registered path is only ever the fallback. Note
# check_rooms' patrol validator looks for rooms/<id>/<id>.gd and will not find
# one for "room19"; both variants' patrols are validated by
# tools/test_rooms1819.gd instead.
#
# "default" is the fail-safe: an unset or unrecognised flag degrades to the
# SAFER branch (lights: longer, lit, with a breather), never the riskier one.
const ROOM_VARIANTS := {
	"room19": {
		"flag": "room18.power",
		"default": "lights",
		"scenes": {
			"lights": "res://rooms/room19_lights/room19_lights.tscn",
			"doors": "res://rooms/room19_doors/room19_doors.tscn",
		},
	},
}

const HUD_SCENE := preload("res://ui/hud.tscn")
const KEYPAD_SCENE := preload("res://ui/keypad.tscn")
const TOUCH_SCENE := preload("res://ui/touch_controls.tscn")
const GRAIN_SCENE := preload("res://ui/grain.tscn")
const POSTERIZE_SCENE := preload("res://ui/posterize.tscn")
const DEV_PANEL_SCENE := preload("res://ui/dev_panel.tscn")
const START_OVERLAY_SCENE := preload("res://ui/start_overlay.tscn")

# Film grain opacity per state — the ward is grainier unmedicated.
const GRAIN_LUCID := 0.025
const GRAIN_UNMED := 0.04

# --- Posterise style, per state ---------------------------------------------
#
# Two colours per state for the duotone ramp, plus the pre-quantise lift.
#
# The tints keep the split the whole game is built on: LUCID is clinical bone
# on cold charcoal, UNMED keeps the sick sage-green cast its fog and materials
# already carry, so the state shift still reads instantly at a glance even
# once hue has otherwise been quantised away.
#
# LIFT IS NOT COSMETIC. Quantisation is a floor function, so it destroys
# signal that sits below one step: UNMED renders close enough to black
# (.artifacts/final_room1_unmed.png is very nearly an empty frame) that at 4
# levels almost every pixel lands in bucket 0 and the result is a flat void
# with no dither pattern at all. Lifting before quantising is what puts the
# geometry back. LUCID needs none of this, which is exactly why the figure is
# per-state rather than one global number.
const STYLE_LUCID := {
	"lo": Color(0.051, 0.059, 0.071),
	"hi": Color(0.910, 0.894, 0.839),
	"lift": 1.0,
}
const STYLE_UNMED := {
	"lo": Color(0.031, 0.051, 0.035),
	"hi": Color(0.698, 0.753, 0.549),
	# Modest, because shadow_gamma now does the work that a big lift used to
	# have to do. This is a nudge, not the mechanism — pushing it far enough
	# to matter on its own is what flattens the state into "dim grey".
	"lift": 1.3,
}

# --- THE LIGHT AXIS, as atmosphere ------------------------------------------
#
# The deterministic half of the light axis (what is visible, what the interact
# ray will accept) lives in core/light_object.gd and never comes near this
# file. These four numbers are the FELT half: what the ward looks like once
# someone throws the breaker.
#
# They are MULTIPLIERS ON THE CURRENT STATE'S MOOD, applied before the 0.45s
# crossfade tween below rather than instead of it, which is what makes "dark"
# COMPOSE with the lucid/unmed axis instead of fighting it: dark-lucid is a
# dimmed version of clinical over-lighting and dark-unmed is a dimmed version
# of the sick green murk, so the state shift still reads at a glance in either
# light state. Ported from renderer.ts's DARK_MULTIPLIER (0.12 on hemi/amb/
# point intensity, 0.5/0.45 on fog near/far), layered the same way.
#
# THE FITTINGS ARE NOT HERE. Their dimming is Atmosphere's circuit scale (see
# core/atmosphere.gd's CIRCUITS block), deliberately a separate multiplier on
# the same light_energy that MOOD's light_scale drives: one is the ward-state
# axis, the other is the light axis, and keeping them as two independent
# factors is what makes the 2x2 orthogonal rather than a four-way lookup table.
#
# EXPOSURE IS NOT TOUCHED, on purpose. tonemap_exposure is the player's display
# calibration (see _target_exposure's HARD CONSTRAINT comment) — dimming the
# ward through it would fight a setting the player made about their screen, and
# a player who calibrated for a bright room would experience a different
# breaker than one who did not.
const DARK_AMBIENT_MULT := 0.12
# Softer than renderer.ts's 0.5/0.45, and for the reason MOOD's own comment
# block gives above: TUNE AGAINST A LARGE ROOM AND A SMALL ONE. The Three.js
# figures applied to a build whose unmed fog_far was 30m; here it is 16m, so
# 0.45 would put fog_end at 7.2m — the exact number that comment records as
# having rendered room 4 (a 12m hall) as two smears on black. Room 16's bay is
# 16m x 22m and its phosphor path is 16m long, so an aggressive fog_end
# deletes most of the wayfinding the dark is supposed to hand back. 0.7 still
# reads as the walls closing in without erasing the room.
const DARK_FOG_BEGIN_MULT := 0.7
const DARK_FOG_END_MULT := 0.7
# Fog COLOUR, and this one is not in the Three.js original — it is a defect the
# straight port shipped and a screenshot caught. renderer.ts pulls fog near/far
# in while dark but leaves fogColor at the state's own value, and LUCID's is
# near-white bone (0.843, 0.894, 0.875). Pulling bright fog CLOSER in an unlit
# room fills the frame with a glowing white void: the first dark-lucid shot of
# room 16 was about 70% blown-out white, which is the exact opposite of "the
# lights just went out". Scaling the luminance while keeping the hue is what
# composes with MOOD rather than overriding it — dark-lucid is still cold bone,
# dark-unmed is still sick sage, both just no longer lit from inside.
const DARK_FOG_COLOR_MULT := 0.15
# Posterise lift while dark. NOT cosmetic, and this is the one number the
# Three.js build had no analogue for: quantisation is a floor function, so a
# frame that sits below one step lands entirely in bucket 0 and the ward
# renders as a flat void with no dither pattern at all — exactly the failure
# STYLE_UNMED's own `lift` exists to fix (see its comment). A dark room is
# dimmer than either state was tuned for, so it needs the same treatment, in
# BOTH states. Multiplies the per-state lift rather than replacing it, so
# dark-unmed still lifts more than dark-lucid.
const DARK_STYLE_LIFT := 1.6

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
# Verticality — floor heights and stacked levels for the CURRENT room. Always
# valid: a room that authors none resolves to the single synthetic '__flat'
# level and answers 0.0 everywhere, exactly as before this existed. Public so
# room scripts can hand it to their orderlies (Orderly.setup's third arg).
var levels := WardLevels.new()
var hud: CanvasLayer
var keypad: CanvasLayer
var touch_controls: CanvasLayer
var grain: CanvasLayer
var posterize: CanvasLayer
var dev_panel: CanvasLayer
var start_overlay: CanvasLayer
var atmosphere: Atmosphere
# Per-frame point-in-rect poll of the current room's TriggerVolumes against the
# player, firing the room's optional on_trigger_enter / on_trigger_exit. NOT an
# Area3D — see core/trigger_volume.gd.
var triggers: TriggerPoll

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

	# Sits at layer -2, under the grain — see ui/posterize.tscn for why that
	# specific position rather than merely "somewhere below the HUD".
	posterize = POSTERIZE_SCENE.instantiate()
	add_child(posterize)
	_apply_style_settings()

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

	# Layer 20, above even the start overlay (10): the panel is a debug tool
	# and has to stay reachable from the title card, which is where you are
	# most likely to be when you decide to change the look. Hidden until
	# toggled, so it costs nothing for a normal player.
	dev_panel = DEV_PANEL_SCENE.instantiate()
	add_child(dev_panel)
	dev_panel.style_changed.connect(_apply_style_settings)
	dev_panel.opened.connect(_on_dev_panel_opened)
	dev_panel.closed.connect(_on_dev_panel_closed)

	atmosphere = Atmosphere.new()
	atmosphere.name = "Atmosphere"
	add_child(atmosphere)
	atmosphere.bind_environment(world_environment.environment)

	player.add_to_group("player")
	player.world_collision = collision
	# Same injection pattern as world_collision: the player owns the timing of
	# its own verticality step, this node owns the data.
	player.world_levels = levels
	Telemetry.snapshot_provider = player.get_snapshot

	triggers = TriggerPoll.new()
	triggers.name = "TriggerPoll"
	triggers.body = player
	# The analogue of main.ts polling only inside `if (started && !ended)`:
	# nothing fires behind the ADMIT ME overlay, on the end card, or while the
	# dev panel has taken input.
	triggers.poll_when = player.is_input_enabled
	add_child(triggers)

	StateManager.medication_depleted.connect(_on_medication_depleted)
	StateManager.state_changed.connect(_on_state_changed)
	StateManager.medication_warning.connect(func() -> void:
		hud_toast("it's wearing thin.")
		WardAudio.set_medication_warning(true))

	# The ?room= dev jump, ported from src/main.ts:91-92. Lets a playtest start
	# at any room without walking the whole ward to reach it. An unknown or
	# absent id falls back to room1, so a typo opens the game rather than a
	# black screen.
	#
	# A session that used it is stamped debug=true for the whole run, exactly
	# as the TS build does — someone who skipped nine rooms is not a data
	# point about how long room 10 takes, and the collector needs to be able
	# to exclude them. Set BEFORE page_load() so the very first batch carries
	# the flag; setting it afterwards would leave page_load looking clean.
	var requested := WebEnv.query_param("room")
	var start_room := requested if ROOM_SCENES.has(requested) else "room1"
	Telemetry.debug = not requested.is_empty()

	Telemetry.page_load()
	GameState.run_started_unix = int(Time.get_unix_time_from_system())

	_apply_mood(StateManager.state, true)
	load_room(start_room)
	# Deliberately does NOT call player.set_input_enabled(true) here — the
	# scene is meant to be visible as a backdrop behind the start overlay
	# ("initial presentation: scene visible behind the start overlay",
	# main.ts), but play stays gated until ADMIT ME. See _on_admit_pressed.


func _on_admit_pressed() -> void:
	hud.visible = true
	player.set_input_enabled(true)
	# Starts idle/perf sampling and stamps the run clocks. Deliberately here
	# and not in _ready: everything before ADMIT ME is the player reading an
	# overlay, and counting that as play time would inflate every duration.
	Telemetry.start()
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
			# The `shift` event is NOT raised here. It is raised in
			# _on_state_changed for every shift, manual or scripted — see the
			# F13 note there. Raising it in both places double-counted.
		StateManager.ShiftResult.NO_PILLS:
			hud_toast("nothing left to swallow.")
			Telemetry.event("pills_empty")
		StateManager.ShiftResult.NO_ABILITY:
			pass


func _on_state_changed(next: StateManager.State, prev: StateManager.State, source: String) -> void:
	# F13: log EVERY shift, not just the manual Q press, so total lucid time
	# and "chosen vs imposed lucidity" can be reconstructed. The Godot signal
	# already carries prev and source ("manual" from StateManager.shift(), the
	# caller's own string from force_state()), so unlike the TS version this
	# needs no in-progress flag to tell the two apart — but it does mean the
	# event belongs here and ONLY here.
	Telemetry.event("shift", {
		"direction": "%s->%s" % [_state_name(prev), _state_name(next)],
		"source": source if not source.is_empty() else "forced",
	})

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
## The wire spelling of a state, matching the TS `${prev}->${next}` direction
## string. The enum's own names are upper case; the collector stores the lower
## case forms the Three.js build has been sending since launch.
func _state_name(state: StateManager.State) -> String:
	return "lucid" if state == StateManager.State.LUCID else "unmed"


func _on_medication_depleted() -> void:
	_awaiting_revert = true


func _update_revert_guard() -> void:
	if not _awaiting_revert or not StateManager.is_lucid():
		return

	var p := player.global_position
	# Level-filtered, so the trap guard agrees with the mover about which
	# geometry exists on the player's current floor.
	if collision.circle_hits_solid_unmed(p.x, p.z, Tuning.PLAYER_RADIUS, player.level):
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

	# The light axis, folded into the state's own targets — see the
	# DARK_* constants above. Read here (rather than pushed in by whoever threw
	# the switch) so that EVERY path that recomputes the mood — a state change,
	# a brightness slider drag, a room load — carries the current light state
	# automatically and none of them can forget it.
	var dark := RoomLight.is_dark()
	var fog_begin := float(m["fog_begin"]) * (DARK_FOG_BEGIN_MULT if dark else 1.0)
	var fog_end := float(m["fog_end"]) * (DARK_FOG_END_MULT if dark else 1.0)
	var ambient := float(m["ambient"]) * (DARK_AMBIENT_MULT if dark else 1.0)
	var fog_color: Color = m["fog"]
	if dark:
		fog_color = Color(fog_color.r * DARK_FOG_COLOR_MULT,
			fog_color.g * DARK_FOG_COLOR_MULT, fog_color.b * DARK_FOG_COLOR_MULT, 1.0)

	# Hand the target fog to Atmosphere so its "breathing" oscillates around
	# the new base rather than the old one.
	if atmosphere != null:
		atmosphere.set_fog_base(fog_begin, fog_end)
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
	_set_style(state, instant)

	if instant:
		env.fog_light_color = fog_color
		env.fog_depth_begin = fog_begin
		env.fog_depth_end = fog_end
		env.ambient_light_energy = ambient
		env.tonemap_exposure = _target_exposure(state)
		env.background_color = fog_color
		return

	# The brief specifically asked for a crossfade rather than an instant
	# swap — this was hard to sell in Three.js and is where Godot's
	# Environment + Tween combo actually earns the migration.
	_mood_tween = create_tween().set_parallel(true)
	_mood_tween.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	_mood_tween.tween_property(env, "fog_light_color", fog_color, 0.45)
	_mood_tween.tween_property(env, "background_color", fog_color, 0.45)
	_mood_tween.tween_property(env, "fog_depth_begin", fog_begin, 0.45)
	_mood_tween.tween_property(env, "fog_depth_end", fog_end, 0.45)
	_mood_tween.tween_property(env, "ambient_light_energy", ambient, 0.45)
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


## True only when opening the panel is what suspended play. Opening the tuner
## from the start screen must not hand control to the player on close — that
## would skip ADMIT ME and start the game from a debug key.
var _dev_panel_took_input := false


func _on_dev_panel_opened() -> void:
	# set_input_enabled(false) also releases the mouse, which the panel needs
	# before any slider can be grabbed.
	_dev_panel_took_input = player.is_input_enabled()
	if _dev_panel_took_input:
		player.set_input_enabled(false)


func _on_dev_panel_closed() -> void:
	if _dev_panel_took_input:
		player.set_input_enabled(true)
		_dev_panel_took_input = false


func _posterize_material() -> ShaderMaterial:
	if posterize == null:
		return null
	var rect: ColorRect = posterize.get_node_or_null("Rect")
	if rect == null:
		return null
	return rect.material as ShaderMaterial


## Pushes the dev-view style settings into the shader and the viewport.
##
## Called on startup and again on every dev-panel edit. Deliberately split
## from _set_style(): the values here are state-INDEPENDENT (the player's
## chosen look), whereas the tint ramp and lift are state-DEPENDENT and
## crossfade with the ward. Re-running this must therefore not clobber a mood
## crossfade in flight, so it finishes by re-asserting the current state's
## values instantly rather than tweening them.
func _apply_style_settings() -> void:
	var mat := _posterize_material()
	if mat == null:
		return
	mat.set_shader_parameter("enabled", WardSettings.get_style(WardSettings.KEY_STYLE_ENABLED))
	mat.set_shader_parameter("levels", int(WardSettings.get_style(WardSettings.KEY_STYLE_LEVELS)))
	mat.set_shader_parameter("pixel_size", WardSettings.get_style(WardSettings.KEY_STYLE_PIXEL_SIZE))
	mat.set_shader_parameter("dither_amount", WardSettings.get_style(WardSettings.KEY_STYLE_DITHER))
	mat.set_shader_parameter("tint_amount", WardSettings.get_style(WardSettings.KEY_STYLE_TINT))
	mat.set_shader_parameter("shadow_gamma", WardSettings.get_style(WardSettings.KEY_STYLE_GAMMA))

	# The single biggest performance lever available on this renderer: the web
	# export runs at CSS x devicePixelRatio (measured at 1081x2202 on a 2.6x
	# phone — see the project.godot display notes), so the ward is fragment
	# bound. Halving this quarters the shaded pixel count, and on a dithered
	# image the softness it introduces is largely hidden by the quantisation.
	var vp := get_viewport()
	if vp != null:
		vp.scaling_3d_scale = WardSettings.get_style(WardSettings.KEY_STYLE_RESOLUTION)

	_set_style(StateManager.state, true)


## Crossfades the duotone ramp and the pre-quantise lift between ward states,
## on the same 0.45s curve as the mood tween so the two move together.
func _set_style(state: int, instant: bool) -> void:
	var mat := _posterize_material()
	if mat == null:
		return
	var s: Dictionary = STYLE_LUCID if state == StateManager.State.LUCID else STYLE_UNMED
	var lift: float = float(s["lift"]) * WardSettings.get_style(WardSettings.KEY_STYLE_EXPOSURE)
	# The light axis composes with the posterise ramp rather than fighting it:
	# same duotone tints (the state still reads as the state), more pre-quantise
	# lift so the geometry survives the quantiser at a fraction of the light.
	# See DARK_STYLE_LIFT.
	if RoomLight.is_dark():
		lift *= DARK_STYLE_LIFT

	if instant:
		mat.set_shader_parameter("tint_lo", s["lo"])
		mat.set_shader_parameter("tint_hi", s["hi"])
		mat.set_shader_parameter("exposure", lift)
		return

	# One tween driving all three, rather than three tweens: the tints and the
	# lift have to stay consistent with each other mid-fade or the ward passes
	# through a colour combination that belongs to neither state.
	var from_lo: Color = mat.get_shader_parameter("tint_lo")
	var from_hi: Color = mat.get_shader_parameter("tint_hi")
	var from_lift: float = float(mat.get_shader_parameter("exposure"))
	create_tween().set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT).tween_method(
		func(t: float) -> void:
			mat.set_shader_parameter("tint_lo", from_lo.lerp(s["lo"], t))
			mat.set_shader_parameter("tint_hi", from_hi.lerp(s["hi"], t))
			mat.set_shader_parameter("exposure", lerpf(from_lift, lift, t)),
		0.0, 1.0, 0.45)


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

## Which scene file a room id resolves to. A plain registry lookup for every
## room in the game except the one variant room, which reads its flag HERE —
## at the single moment it is entered, since rooms are one-way.
func room_scene_path(id: String) -> String:
	if not ROOM_VARIANTS.has(id):
		return str(ROOM_SCENES.get(id, ""))
	var variant: Dictionary = ROOM_VARIANTS[id]
	var scenes: Dictionary = variant["scenes"]
	var choice := str(GameState.get_flag(str(variant["flag"]), variant["default"]))
	if scenes.has(choice):
		return str(scenes[choice])
	return str(scenes[variant["default"]])


func load_room(id: String) -> void:
	if current_room != null:
		if current_room.has_method("on_leave"):
			current_room.on_leave()
		triggers.bind_room(null)
		current_room.queue_free()
		current_room = null
	_focused = null

	# Variant rooms resolve their scene from a flag here; everything else is a
	# straight ROOM_SCENES lookup. See ROOM_VARIANTS.
	var path := room_scene_path(id)
	if path.is_empty():
		push_error("Unknown room id: %s" % id)
		return

	var packed: PackedScene = load(path)
	current_room = packed.instantiate()

	# THE LIGHT AXIS RESETS HERE, AND IT MUST HAPPEN BEFORE add_child.
	#
	# Every LightObject in the room reads RoomLight.is_dark() in its own _ready
	# (see core/light_object.gd), and _ready fires the moment the node enters
	# the tree. Resetting after add_child would give the room one frame of the
	# PREVIOUS room's light state — visible as a flash of glow-in-the-dark paint
	# on entry to any lit room reached from a dark one, and as the reverse on
	# re-entry. Reading the metadata off the un-parented instance is fine:
	# get_meta does not need the node to be in a tree.
	#
	# `start_dark` is per-room authored data (gen_rooms.py emits it only for a
	# room that asks), so no room can inherit another room's darkness and every
	# room built before this axis existed opens lit exactly as before.
	RoomLight.reset(bool(current_room.get_meta("start_dark", false)))

	world_root.add_child(current_room)
	current_room_id = id

	# Rebuild the AABB cache from the freshly-instanced room. Done once per
	# load; state-conditional colliders are filtered at query time by their
	# layer, so a state change never needs a rebuild.
	collision.rebuild_from(current_room)
	# Verticality is per-room data with no geometry of its own, read off an
	# optional "Verticality" node. A room without one resets to flat.
	levels.rebuild_from(current_room)

	# Collects the new room's TriggerVolumes and clears the active set WITHOUT
	# firing exit callbacks — the old room's script is already torn down.
	triggers.bind_room(current_room)

	# Fluorescents are per-room, so the flicker set has to be rebuilt on load.
	if atmosphere != null:
		atmosphere.collect_lights(current_room)
		# ...and the fresh fittings are told which way the breaker is, instantly
		# (a room authored to open dark must already be dark on frame one, not
		# fade down while the player walks in). collect_lights re-attaches
		# circuit state by name on its own, so this is belt-and-braces for the
		# common case and load-bearing for the "arrive at a lit room from a dark
		# one" case, where the reset above has just turned the lights back on.
		atmosphere.set_all_circuits(not RoomLight.is_dark(), true)

	GameState.enter_room(id)

	var spawn: Node3D = current_room.get_node_or_null("Spawn")
	if spawn != null:
		# A stacked room can spawn the player on a named level by putting a
		# `level` metadata string on its Spawn marker; everything else gets
		# the room's first (or synthetic '__flat') level. The spawn Y is
		# looked up rather than eased into, so a raised spawn does not open
		# the room with the floor rising into view.
		var sx: float = spawn.global_position.x
		var sz: float = spawn.global_position.z
		var slevel: String = str(spawn.get_meta("level", levels.default_level()))
		player.spawn_at(sx, sz, spawn.rotation.y, slevel, levels.floor_height_at(slevel, sx, sz))

	if current_room.has_method("on_enter"):
		current_room.on_enter(self)

	# Resets the per-room counters and clocks BEFORE the enter event, so a
	# revisit of a room already seen is measured on its own rather than
	# carrying the previous visit's totals.
	Telemetry.mark_room_enter()
	Telemetry.event("room_enter")
	Telemetry.flush()


func complete_room(to: String) -> void:
	# Rollups are read BEFORE load_room(), which resets the room counters.
	Telemetry.event("room_complete", Telemetry.room_rollup())
	GameState.complete_room(current_room_id)
	if to == "END":
		player.set_input_enabled(false)
		Telemetry.event("game_complete", Telemetry.session_rollup())
		# Beacon: this is the last thing that will ever be sent for this
		# session, and game_complete is the event the whole funnel is built
		# to measure.
		Telemetry.flush(true)
		return
	load_room(to)


## A multi-level room MUST pass `to_level` on any catch/reset teleport — see
## Player.teleport. Omitting it keeps the player's current level, which is
## right for every single-level room and wrong for every stacked one.
func teleport_player(x: float, z: float, to_level := "") -> void:
	player.teleport(x, z, to_level)
	# Drops the distance baseline so this jump — an orderly's catch, a room
	# reset — is not billed to the player as walking.
	Telemetry.resync_distance()


## Floor height for a room script — e.g. to seat a prop or a room-owned actor
## on a raised zone. Rooms with orderlies should prefer handing `levels`
## straight to Orderly.setup's third argument.
func floor_height_at(level_id: String, x: float, z: float) -> float:
	return levels.floor_height_at(level_id, x, z)


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

	keypad.closed.connect(func() -> void:
		# Abandoning a keypad is a distinct signal from failing one: it says
		# the player did not have the code and knew it, rather than guessing
		# wrong. `attempts` is what separates "opened it by accident" from
		# "tried three times and gave up".
		Telemetry.event("keypad_close", {"attempts": keypad.attempts()}))

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


# --- the light axis ---------------------------------------------------------
# The room-script surface of the second state dimension, mirroring GameCtx
# .isRoomDark / .setRoomDark / .setGlowFade in the Three.js build. Room 16 is
# the first consumer; see autoload/room_light.gd for the axis itself.

## True while the current room's lights are out.
func is_room_dark() -> bool:
	return RoomLight.is_dark()


## Throw the room's breaker. Drives BOTH halves of the axis in one call: the
## deterministic visibility/raycast gate (RoomLight -> every LightObject) and
## the atmosphere (the Environment's fog/ambient mood and the fittings'
## circuits), so a room script can never end up with one flipped and the other
## not. Both halves ease over ~0.45s, so this reads as a fade rather than a cut.
##
## The LUCID REQUIREMENT IS NOT HERE. Room 16 refuses the switch to raw hands,
## but that is room policy — a different room may well want a breaker anyone
## can throw — so it lives in room16.gd's on_interact, not in the engine.
func set_room_dark(dark: bool) -> void:
	if dark == RoomLight.is_dark():
		return
	RoomLight.set_dark(dark)
	if atmosphere != null:
		atmosphere.set_all_circuits(not dark, false)
	# Recomputes fog/ambient/posterise-lift from the CURRENT state times the new
	# light state, and crossfades on the usual 0.45s curve.
	_apply_mood(StateManager.state, false)
	Telemetry.event("room_dark", {"dark": dark})


## The phosphor charge/fade dial (room 16's "the paint drinks the light").
## Opacity only — see core/phosphor.gd's header for why this can never affect
## what is visible in the gating sense, what is reachable, or what is solvable.
func set_glow_fade(level: float) -> void:
	WardPhosphor.apply(current_room, level)


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
