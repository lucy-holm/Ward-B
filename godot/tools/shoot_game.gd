# Screenshot THE REAL GAME — main.tscn, its player camera, its WorldEnvironment.
#
#   godot --path godot --resolution 1280x720 tools/shoot_game.tscn -- <name> [seconds] [room_id] [lucid] [style_overrides] [nohud] [x,z,yaw[,level[,y]]]
#
# Arg 6: pass "nohud" for a clean plate — hides main.gd's `hud` CanvasLayer
# right before the frame is grabbed, same real camera/lighting/room as every
# other shot from this harness, just without the HUD chrome on top. Added so
# hero/cover shots don't have to fall back to tools/shoot.tscn's hand-built
# camera and lose the real player rig.
#
# Arg 7: reposition the REAL player after the room has loaded and its spawn
# has already run, via player.gd's own spawn_at(x, z, yaw, level, y) — the
# same call every room's spawn point uses. Exists because this harness has no
# way to simulate WASD/mouse-look, so every shot is otherwise stuck at
# whatever direction the room's spawn point happens to face. `level` defaults
# to WardLevels.FLAT_LEVEL_ID ("__flat"); pass a room's named level (e.g.
# room17's "balcony") to frame from an upper floor.
#
# WHY THIS EXISTS, AND WHY tools/shoot.gd IS NOT ENOUGH.
#
# shoot.gd loads a ROOM scene in isolation and builds its own Camera3D and
# WorldEnvironment that mirror main.tscn by hand. That makes it fast and handy
# for framing a prop, but it is structurally blind to anything living outside
# the room scene — and it silently "corrects" bugs in the real rig.
#
# It hid a big one. player.tscn's Camera3D carried a leftover placeholder
# Environment, and Camera3D.environment OVERRIDES WorldEnvironment outright.
# The whole game rendered at default linear tonemapping, exposure 1.0, no fog,
# no glow, while main.gd wrote every MOOD value into a WorldEnvironment that
# never drew a pixel. shoot.gd renders no player camera, so every screenshot
# looked correctly dark; the game was bright and flat for the entire life of
# the port, and successive "make it darker" passes tuned an image nobody was
# playing. Measured at the room-1 spawn: game (42,43,36) vs harness (4,5,1).
#
# RULE: if a judgement is about how the game LOOKS, take the shot here (or in
# a browser via tools/shoot_web.mjs). shoot.gd is for framing, not for verdicts.
extends Node

func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	var shot_name: String = args[0] if args.size() > 0 else "game"
	var seconds: float = float(args[1]) if args.size() > 1 else 6.0
	var room_id: String = args[2] if args.size() > 2 else ""
	# Pass "lucid" as arg 4 to shoot the medicated state, mirroring shoot.gd's
	# arg 9. The ward starts UNMED, so without this only half the game can be
	# photographed from here — and the two states are the whole point of it.
	var want_lucid: bool = args.size() > 3 and str(args[3]).begins_with("l")
	# Arg 5: comma-separated posterize uniform overrides, e.g.
	#   "enabled=0" or "levels=2,tint_amount=0,pixel_size=3"
	#
	# Written STRAIGHT TO THE MATERIAL, deliberately not through WardSettings.
	# set_style() persists to user://, so routing A/B shots through it would
	# leave the last variant shot as the machine's saved style and silently
	# change what every later screenshot — and the editor — renders.
	var overrides: String = args[4] if args.size() > 4 else ""
	var want_nohud: bool = args.size() > 5 and str(args[5]).begins_with("nohud")
	var reposition: String = args[6] if args.size() > 6 else ""

	var game: Node = load("res://main.tscn").instantiate()
	add_child(game)
	# Captures must never erase or replace a real milestone save on this host.
	Telemetry.debug = true

	# Dismiss the start overlay, exactly as pressing ADMIT ME does.
	#
	# main.tscn now gates play behind a start screen, and that overlay is a
	# near-opaque full-screen CanvasLayer — without this every shot from here
	# would be a photograph of the title card, and this is the harness the
	# lighting work is judged with. Driving the real button rather than
	# hiding the layer keeps the shot honest: it is the state the player is
	# actually in one click into the game.
	#
	# Use tools/shoot_overlay.tscn when the OVERLAY is the subject.
	if game.get("start_overlay") != null and game.start_overlay.has_method("_on_admit_pressed"):
		game.start_overlay._on_admit_pressed()

	await get_tree().create_timer(seconds).timeout

	if not room_id.is_empty() and game.has_method("load_room"):
		game.load_room(room_id)
		# Room load rebuilds lights and re-runs the mood; give it time to settle.
		await get_tree().create_timer(2.5).timeout

	if not reposition.is_empty() and game.get("player") != null:
		var parts := reposition.split(",")
		# Guarded rather than indexed blind: a typo'd reposition arg would
		# otherwise crash the harness mid-capture and leave a stale or missing
		# PNG, which reads as "the shot looked like that" rather than "the shot
		# never happened".
		if parts.size() < 3:
			push_error("reposition needs at least x,z,yaw — got '%s'" % reposition)
			get_tree().quit(1)
			return
		var rx := float(parts[0])
		var rz := float(parts[1])
		var ryaw := float(parts[2])
		var rlevel: String = parts[3] if parts.size() > 3 else WardLevels.FLAT_LEVEL_ID
		var ry: float = float(parts[4]) if parts.size() > 4 else 0.0
		game.player.spawn_at(rx, rz, ryaw, rlevel, ry)
		# Let the per-tick vertical ease and any position-driven state (fog,
		# trigger volumes) settle at the new spot before anything downstream
		# (lucid crossfade, capture) reads it.
		await get_tree().create_timer(0.3).timeout

	if want_lucid:
		# Grant the shift ABILITY too, not just the state. The HUD gates its
		# pill readout on can_shift and StateManager only drains the meter
		# while it is held, so a forced lucid without it photographs a state
		# the game never actually reaches: medicated, with the bottom row of
		# the HUD missing and the countdown frozen at full. Room 1's cup is
		# what grants this in play, and every room after it assumes it.
		StateManager.can_shift = true
		StateManager.force_state(StateManager.State.LUCID, "shoot_game")
		# _apply_mood crossfades the environment over 0.45s and _set_style
		# rides the same curve; shooting sooner catches the ward mid-fade,
		# which is neither state and tells you nothing about either.
		await get_tree().create_timer(1.2).timeout

	# Applied last: _apply_style_settings() and the state crossfade both write
	# these uniforms, so anything set earlier would be overwritten before the
	# frame is grabbed.
	if not overrides.is_empty():
		var rect: ColorRect = game.get_node_or_null("Posterize/Rect")
		var mat: ShaderMaterial = null if rect == null else rect.material as ShaderMaterial
		if mat == null:
			push_error("style overrides given but the Posterize layer is missing")
		else:
			for pair in overrides.split(",", false):
				var kv := pair.split("=")
				if kv.size() != 2:
					push_error("bad style override '%s' (want key=value)" % pair)
					continue
				var k := kv[0].strip_edges()
				var v := float(kv[1])
				# `levels` is an int uniform; handing it a float silently
				# leaves the shader on its previous value.
				mat.set_shader_parameter(k, int(v) if k == "levels" else v)
			print("style overrides: %s" % overrides)
		await get_tree().process_frame

	if want_nohud and game.get("hud") != null:
		game.hud.visible = false
		# Without this the visibility write hasn't reached the framebuffer yet
		# and get_viewport().get_texture() below still hands back the PREVIOUS
		# frame — the HUD-visible one. Cost a whole capture the first time.
		await get_tree().process_frame

	# Report what is ACTUALLY governing the render, not what we hope is.
	var cam := _find_active_camera(game)
	if cam != null and cam.environment != null:
		push_error("Camera3D '%s' has an environment override — it is shadowing "
			% cam.name + "WorldEnvironment and MOOD is not reaching the screen.")
	var we: WorldEnvironment = game.get_node_or_null("WorldEnvironment")
	if we != null and we.environment != null:
		var e := we.environment
		print("env: ambient=%.4f exposure=%.3f fog=%.1f..%.1f tonemap=%d" % [
			e.ambient_light_energy, e.tonemap_exposure,
			e.fog_depth_begin, e.fog_depth_end, e.tonemap_mode])

	DirAccess.make_dir_recursive_absolute("res://.artifacts")
	var img := get_viewport().get_texture().get_image()
	img.save_png("res://.artifacts/%s.png" % shot_name)
	print("wrote res://.artifacts/%s.png (%dx%d)" % [shot_name, img.get_width(), img.get_height()])
	get_tree().quit(0)


func _find_active_camera(node: Node) -> Camera3D:
	if node is Camera3D and (node as Camera3D).current:
		return node as Camera3D
	for child in node.get_children():
		var c := _find_active_camera(child)
		if c != null:
			return c
	return null
