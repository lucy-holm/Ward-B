# Ward B — Three.js → Godot 4.7 migration notes

Scope of the ORIGINAL pass this document was written for: **rooms 1–7**, i.e.
the tutorial arc through the Orderly's introduction (room 4) and its three
follow-up rooms. **The port has since completed — all 20 rooms are in** (see
§5). Where a section below says "rooms 1–7" as a statement of scope rather
than of history, read it as "the whole ward"; the per-room specifics it cites
are still accurate for the rooms named. The Three.js build is untouched and
remains the reference implementation and the thing that ships.

---

## 0. What the brief assumed vs. what the repo actually contained

Worth recording, because it changed the plan:

| Brief said | Actually |
|---|---|
| "single-file Three.js grey-box prototype" | 15,801 LOC of modular TypeScript. `reference-v0.1.html` is the July 12 M1 scaffold, superseded. |
| "three-to-six room progression" | **20 rooms**, 9,000 LOC, built on a 1,275-LOC authoring kit (`src/rooms/kit.ts`). |
| telemetry = "room entered, state toggled, sighting, death, completed" | **30+ event types** plus a 154-LOC A/B experiments framework and a Cloudflare worker. |

The single most useful discovery: **rooms 1–7 predate the kit and use only
four of its symbols** (`orderlyTelemetryCallbacks`, `randomCode4`,
`codeClueText`, `isRandomizeCodesEnabled`). Everything else in the kit —
triggers, shape locks, icon panels, light switches, ramps, stairwells,
stacked levels, push blocks, multi-orderly aggregation — first appears in
room 8+. So this pass needed a far smaller API than the kit's size suggests.
That is why there is no `kit.gd`.

---

## 1. Structural changes

### Signals replace the central visibility switch
The original kept three scene groups (`both` / `lucid` / `unmed`) and flipped
`group.visible` centrally (`world.ts:1420-1423`). Every state-conditional
object had to be registered into the right group at load.

Now `StateManager` emits `state_changed` and each node owns its own affinity
via `StateObject.visible_in_state` (an exported enum, editable in the
inspector). Nothing polls a global; a designer can retag a prop without
touching code. This is the clearest win of the migration.

### Rooms are real scenes
The room `.tscn` files are genuine Godot scenes — `StaticBody3D` +
`BoxShape3D` walls on tagged collision layers, `Label3D` scrawls, `Area3D`
interactables and exits, `OmniLight3D` lights. They open in the editor and are
readable there, which is the point: the port produces real engine-native
scenes, not an opaque blob. **Open them to inspect; do not edit them** — see
the warning below.

They were produced by `tools/gen_rooms.py` from the TS geometry, because
hand-typing rooms of coordinates is an error factory and those coordinates
are audited.

> ⚠️ **`gen_rooms.py` IS the source of truth. This section used to say the
> opposite, and that was wrong.** It read "after generation the `.tscn` is the
> source of truth — new rooms should be authored in the editor". That advice
> was false and actively harmful: a full generator run reproduces **all 21
> committed room scenes byte-for-byte, zero diffs** (verified by regenerating
> into a scratch tree and diffing every file, `room20` included). A room
> hand-edited in the editor is therefore silently reverted the next time
> anyone regenerates — no conflict, no warning, the edit just evaporates.
>
> Two stale caveats went with it, both also false now. The `__main__` block
> claimed a full run drifts on "exactly TWO exceptions" (room4's and room5's
> hand-promoted `L1` shadow casters); the drift is zero. §5 claimed rooms
> 8–20 were not ported; all 21 are in. `tools/check_roundtrip.sh` now asserts
> the byte-for-byte property so this cannot rot silently again.

**Author rooms by editing `tools/gen_rooms.py` and regenerating.** The room
functions there (`room1()` … `room20()`) are the declarative level
definitions and the `Room` class is the authoring kit — see
`ROOM_AUTHORING_GODOT.md` for the API. The `.tscn` files are build output
that happens to be checked in, so the game runs without a Python step and so
scene diffs stay reviewable.

### Autoloads
`Tuning` (a 1:1 mirror of `src/tuning.ts`), `StateManager`, `GameState`,
`Telemetry`. Kept lean: `StateManager` owns the state machine and the
medication meter but not the pill inventory (that is run state, so it lives
in `GameState`) and not the decision to revert when the meter empties (that
needs world knowledge it does not have — see §2).

### Collision layers
`1 player, 2 world_static, 4 solid_lucid_only, 8 solid_unmed_only,
16 orderly, 32 interactable, 64 trigger`. State-conditional geometry is
filtered by *layer*, so a state change never rebuilds the collider cache.

### Audio is synthesised, not sampled
Ported from `engine/audio.ts` — no sound assets, same as the original. The
original builds live WebAudio graphs; pushing samples from GDScript every
frame via `AudioStreamGenerator` would be the literal translation and is far
too expensive on a web export. Instead `core/audio_synth.gd` **bakes**
`AudioStreamWAV` buffers once at startup (22050 Hz mono — nothing here
exceeds ~1.7 kHz) and the engine mixer does the work. Continuous sounds are
seamless loops driven by bus volume; rhythmic ones are one-shots on a timer.

Bus layout is `Master → {Drone, SFX, Threat}`, created in code rather than
shipped as a `.tres` so it cannot silently drift from what the code expects.
The two state drones crossfade on `state_changed` over 0.6 s, matching the
original's `setTargetAtTime(tau 0.6)`.

### Materials are world-space triplanar shaders
All 13 materials are driven by three shaders in `materials/shaders/`
(plaster, tile, worn). **Nothing reads UV at all** — everything projects from
world position, because room geometry is `BoxMesh` of wildly varying sizes
and a 0.45m cube and a 3m slab share materials. UV0..1 per face would give
wildly different texel density; world-space triplanar makes them identical.
Frequencies are authored in cycles per metre, with albedo blotch and surface
bump on independent scales.

Two findings worth keeping:

- **Metallic is unusable in this project.** `main.tscn` has no sky and no
  reflection probes (background + ambient colour only), so metallic kills the
  diffuse term and gets no environment specular back — `chain` at
  `metallic 0.8` rendered as a flat black slab. Steel is sold via roughness +
  normal detail instead, metallic pinned at 0–0.1. Noted in the shader so it
  does not get "fixed" later.
- **`glow` must be unshaded** (`shading_mode = 0`). The original used
  three.js `MeshBasicMaterial` precisely so a light panel reads at full
  brightness regardless of room lighting; the first port made it a lit
  StandardMaterial3D and glow panels dimmed with the room.

Cost: **+7.1 KB gzipped** total (noise is generated at load from
FastNoiseLite parameters, so effectively only shader source ships).
Measured frame cost on an emulated phone at 1081x2202 is **~20%**
(14.3 -> 11.5 fps) — but that is under SwiftShader CPU rasterisation, which
penalises fragment shaders far more than a real phone GPU would. Treat it as
a worst case, not a prediction. `tools/measure_fps.mjs` exists to A/B this.
If it ever does bite on real hardware, the cheapest fix is selecting one
planar projection instead of blending three; near-identical here since all
geometry is axis-aligned.

### Atmosphere is a separate live layer
`main.gd` owns the `Environment` crossfade between the two states;
`core/atmosphere.gd` adds the per-frame motion on top — fluorescent flicker
and fog "breathing", both **unmedicated-only**, because lucid is meant to
feel clinically steady and the contrast is the point. Film grain
(`ui/grain.*`) is a `canvas_item` shader with no texture, on `CanvasLayer -1`
so it sits over the 3D but under the HUD.

Deliberate correction while porting: the original rolled its flicker as a
per-**frame** probability, so the ward visibly flickered faster at 144fps
than at 60. It is a per-second rate here.

### Telemetry is wire-compatible, and complete
Batch envelope and per-event row mirror `src/game/telemetry.ts`
field-for-field, including 2dp rounding on `x`/`z`/`yaw`/`med` and omitting
(not nulling) `dropped`/`experiment`/`variant`. The existing worker and
dashboard keep working. Web builds use `navigator.sendBeacon` via
`JavaScriptBridge` on unload, matching the original.

Brought to full parity when Godot became the shipping build (2026-08-29).
Until then the port had the envelope right but was missing most of what fills
it, and — because nothing ever assigned `Telemetry.endpoint` — **transmitted
nothing at all, on any host**. Added: `session_start` and the F19 session
context, idle tracking (`idle_start`/`idle_end` and the `active_ms` that
`room_complete` diffs against), perf sampling (`perf` with
`fps_p50`/`fps_p10`), browser error capture (F17), the localStorage retry
buffer, the `?notrack=1` opt-out (F22), the A/B assignment port
(`core/experiments.gd`), the `?room=` dev jump and its `debug` stamp, the
`room_complete`/`game_complete` rollup counters (F12/F14), and `keypad_close`.

Two behaviours were WRONG rather than missing, and both were silent:

- `shift` was raised only from `_try_shift` and carried `{"to": ...}`. So
  every scripted or imposed shift went unlogged (half of F13), and the field
  name was not the `{direction, source}` the collector has stored since the
  Three.js build launched. It is now raised from `_on_state_changed` only,
  which sees both kinds.
- `_detect_env` tested `hostname.contains("itch")`. That missed
  `*.hwcdn.net`, which is where itch actually serves the game frame from — so
  real plays would have been labelled `unknown` — and it would have accepted
  a lookalike like `itch.io.example.com`.

Identity (`wardb-player-v1`, `wardb-run-v1`) is read from **localStorage on
web, using the same keys as the Three.js build**, not from `user://`. itch
serves both builds from one sandboxed origin, so a returning player keeps
their id and run counter across the engine migration instead of appearing as
a new stranger the day Godot shipped.

### Telemetry only ever transmits from itch
Two independent gates, both of which must agree before a request leaves:

1. **Build time** — `core/build_config.gd` is committed with an empty
   endpoint. Only `.github/workflows/deploy-itch-godot.yml` runs
   `tools/write_build_config.sh` to populate it. Pages, the Helios/tailnet
   container and every local run therefore have no collector URL compiled in.
2. **Run time** — `autoload/telemetry.gd` refuses to send unless
   `classify_host(location.hostname)` says `itch`. This covers what the build
   gate cannot: the itch build's files are downloadable and re-hostable.

Off-itch it still `print()`s the batch as `[telemetry] {...}`. That is not a
leak and it is load-bearing — `tools/verify_web.mjs` proves GDScript ran by
looking for that prefix, and `tools/verify_touch.mjs` reconstructs the
player's path from the `pos` rows in it.

Verified by `tools/check_telemetry.tscn` (the decision table),
`tools/verify_telemetry_gate.mjs` (the full matrix in a real browser, against
a real export, with a real itch hostname) and
`tools/verify_telemetry_session.mjs` (the interactive events).

---

## 2. Deliberate deviations from "idiomatic Godot"

Three places where the obvious engine-native choice would have changed the
game. Each was raised and agreed before implementing.

### 2.1 Movement is NOT `move_and_slide`
The brief mapped hand-rolled AABB collision → `CharacterBody3D` +
`move_and_slide`. The player *is* a `CharacterBody3D` on a real layer, and
walls *are* real `StaticBody3D`s — but motion resolves through a ported
axis-separated routine (`core/collision.gd`), because:

- The original resolves **X first against the old Z, then Z against the new
  X**. That ordering defines corner-sliding and whether you can squeeze
  diagonally past a corner.
- It approximates the 0.35 m radius by **inflating the AABB**, so clearance
  is a 0.7 m *square*, not a capsule. A capsule rounds corners off.
- There is **no velocity, acceleration, friction, gravity or jump** anywhere
  in this game. Position is set directly.
- Every room's geometry and the Orderly's 0.5 m patrol margins were audited
  against that square.

Physics ticks at a fixed 60 Hz, which is strictly better than the original's
`dt` clamped to 0.05 s. Per-tick displacement (0.057 m) stays far below the
0.35 m radius, so tunnelling remains impossible.

### 2.2 Orderly movement: bounded collision-aware pursuit

The September survival pass replaces the empty-navigation fallback with
`OrderlyPlanner`, a room-local visibility graph around live AABB corners.
Clear authored patrol legs keep their direct path. Chase, investigation and
return routes can go around cover, with bounded planning and collision checks
on every movement step. No room needs a baked `NavigationRegion3D`.

Medication still ends pursuit. Noise from authored puzzle actions can draw a
nearby orderly into a brief investigation; new sounds while lucid can change
his position, but cannot make him catch a lucid player. Fixed-level identity
continues to gate sight, catch and navigation. Moving gates invalidate routes.
The extra pressure is an intentional gameplay deviation from the frozen
Three.js implementation, not port parity.

`tools/test_orderly_pursuit.tscn` exercises route clearance, dynamic blockers,
level boundaries and investigation; the existing patrol and room suites remain
load-bearing. `docs/audits/2026-09-12-orderly-pursuit.md` records planner limits.
Human playtesting still needs to establish whether stronger pursuit leaves
sufficient time to understand clues and reach medication.

### 2.3 Footsteps are spatial — more information than before
His mesh is hidden while you are lucid, so footsteps are the *only* way to
track him. The original attenuated by distance only (`1 - dist/8`), giving
proximity but **no direction**.

Footsteps now play from an `AudioStreamPlayer3D` on the Orderly, so they pan
as well as attenuate. That is the native answer and the brief asked for
`AudioStreamPlayer3D` — but it hands a lucid player *bearing* they never had
in the Three.js build, which makes tracking him while invisible easier.
Falloff is pinned to `max_distance = 8.0` to match the original radius.
**Worth a playtest judgement**: revert to a non-positional
`AudioStreamPlayer` if it deflates the "where is he?" tension.

### 2.4 Touch is normalised to the viewport, not measured in pixels
The original used a fixed radians-per-CSS-pixel. That does not survive the
port. On web, Godot's UI coordinate space is the canvas **drawing buffer**,
which is `CSS x devicePixelRatio` — 1081x2202 on a 2.6x phone against 411x838
CSS — and **`display/window/dpi/allow_hidpi` has no effect on the web export**
(verified). Nothing in project settings changes it.

So touch sizing and sensitivity are derived from the live viewport instead:
a swipe across a given *fraction* of the screen always turns the same amount,
and touch targets are a fraction of viewport width. Calibrated so a full-width
swipe matches the original on a 412px-wide phone (`412 * 0.0024 * 1.9 = 1.88`
rad). This is resolution- and DPI-independent, and strictly better than the
original's behaviour.

### 2.5 `gl_compatibility`, not Forward+
Forward+ on web needs WebGPU, which is not broadly available; the brief
requires "everyone can play it". **Cost: no volumetric fog.** The state-shift
look is built from depth fog + glow + `Environment` adjustments, all of which
work in Compatibility.

---

## 3. Ported quirks — do not "fix" these

Catalogued because each one looks like a bug and is not.

1. **The chase has no exit condition** other than shifting lucid or a catch
   landing. No lost-sight timer, no leash, no give-up; sight is not even
   evaluated during a chase. At 4.3 vs 3.4 m/s he cannot be outrun. Adding
   conventional stealth-AI memory guts the risk/reward core.
2. **Contact catches in every mode**, including patrol and returning.
   Sneaking up behind him still gets you caught.
3. **A catch is cheap**: it force-states you to lucid *without spending a
   pill* and refills the meter. No pills lost, no progress cleared.
4. **`force_state` early-returns when the state is unchanged** — no signal,
   no meter refill. Several call sites depend on that silence.
5. **The medication meter is never zeroed on revert.** It reads stale while
   unmed by design; readers guard it.
6. **The meter only drains while `can_shift`** — room 1's pre-ability lucid
   stretch never drains.
7. **The geometry-trap guard** (below) can defer the auto-revert
   indefinitely. It is the only case where lucidity outlasts 45 s.
8. **His facing is the last direction he *moved*, and persists while paused.**
   He keeps staring down the leg he just walked, cone live. The head
   visually tracks you once the ramp is up, but detection uses the body
   vector — the head is a lie.
9. **Ramp decay is a flat 1.5/s**, independent of `grace_sec`: 0.6 s to be
   spotted, 0.667 s to be forgotten.
10. **`orderly_caught` telemetry fires BEFORE the teleport.** Telemetry
    snapshots player position at emit time; emitting after would record spawn
    coordinates for every catch and make catch heat-maps worthless.
11. **Threat HUD `level <= 0 && bearing == null` is a hard snap to zero**,
    not a lerp — without it the vignette bleeds into the next room.

### The geometry-trap guard
`StateManager` emits `medication_depleted` and stops. `main.gd` decides
whether reverting is safe: if the player stands where an unmed-only wall
would materialise (`circle_hits_solid_unmed`), the revert is deferred, tick
by tick, until they step clear.

Note the meter emits `medication_depleted` **once**, so the guard is
re-evaluated every physics tick from a latch (`_awaiting_revert`) rather than
from the signal. Driving it from the signal alone means a trapped player
never reverts at all. This is the single subtlety most likely to be dropped
in a rewrite, and it is why the player can never be embedded in geometry.

---

## 4. Verification

Nothing here is claimed working on the basis of "it compiles".

```bash
cd godot

# wiring: registration, spawn clearance, exit chain, unique ids
/Applications/Godot.app/Contents/MacOS/Godot --headless --path . tools/check_rooms.tscn

# behaviour: state-conditional geometry, trap guard, axis-separated slide,
# pill economy incl. force_state semantics
/Applications/Godot.app/Contents/MacOS/Godot --headless --path . tools/test_mechanics.tscn

# player settings: persistence, and each setting through the thing it changes
# (codes -> a real room, brightness -> real exposure, sensitivity -> real yaw)
/Applications/Godot.app/Contents/MacOS/Godot --headless --path . tools/test_settings.tscn

# HUD readouts: countdown rounding, warn threshold, and that every Control in
# the layer is still MOUSE_FILTER_IGNORE
/Applications/Godot.app/Contents/MacOS/Godot --headless --path . tools/test_hud.tscn

# mid-game pause: the input gate, the paused meter, and the hand-back on RESUME
/Applications/Godot.app/Contents/MacOS/Godot --headless --path . tools/test_pause.tscn

# are the wall codes still readable? (MUST run windowed — see the tool header)
/Applications/Godot.app/Contents/MacOS/Godot --path . --resolution 480x270 tools/check_scrawl_visibility.tscn

# web export, then prove it RUNS in a real browser (WebGL2 + GDScript ran)
/Applications/Godot.app/Contents/MacOS/Godot --headless --path . --export-release "Web" build/index.html
python3 -m http.server 8899 --directory build &
node tools/verify_web.mjs
```

```bash
# desktop input: keyboard walk/strafe (catches an unmapped InputMap)
node tools/verify_desktop.mjs

# mobile: touch-emulated phone, asserts LOOK / MOVE / ACTION against the
# game's own pos telemetry
node tools/verify_touch.mjs
```

`check_rooms.tscn` is the analogue of `npm run check:rooms` and should be run
after **any** room change, same rule as the TS side.

### `project.godot` comments must use `;`, never `#`
Godot's config format only accepts `;`. A `#` comment makes the parser drop
**everything after it** — in our case the entire `[input]` section, silently
unmapping every keyboard action for several commits
(`The InputMap action "move_forward" doesn't exist`).

It survived because nothing exercised the keyboard: `verify_web.mjs` only
checks the build boots, and `verify_touch.mjs` passes without the InputMap
because touch drives the player directly rather than through actions. That
gap is why `verify_desktop.mjs` exists, and why it treats any
`InputMap action ... doesn't exist` console line as a hard failure.

### Four bugs `verify_touch.mjs` caught that desktop testing could not
Worth recording, because every one of them was invisible on a dev machine:

1. **A full-screen HUD `Spacer`** (`size_flags_vertical = expand`, left at the
   default `MOUSE_FILTER_STOP`) swallowed every touch. The build was totally
   unplayable on a phone — no look, no move, no interact — while desktop was
   fine, because a **captured mouse bypasses GUI picking entirely**. The HUD
   now forces `MOUSE_FILTER_IGNORE` on every child in code so a future HUD
   tweak cannot reintroduce it.
2. **No action buttons.** Touch look/move worked, but interact and shift
   existed only as keyboard actions, so a phone player could walk around
   Room 1 and never take the pill. Touch drag handling is necessary and not
   sufficient — a phone needs a button for every verb.
3. **Device-pixel coordinate space** (§2.4) made look ~2.6x too fast and
   saturated the virtual stick after ~18px of thumb travel.
4. **Buttons positioned off-screen** — absolute viewport coordinates assigned
   to children of a container anchored to the bottom-right corner.

An earlier version of that script "passed" against a build with no buttons at
all, because it diffed **PNG bytes**: compression means one changed pixel
cascades through the whole stream, so any change reads as ~99% different. It
measured nothing. It now asserts on `pos` telemetry — the game's own state.
Don't reintroduce screenshot diffing here. It reads the room
registry straight out of `main.gd`, so a room can never be validated while
unregistered.

### Web export status
Builds and runs. **9.6 MB gzipped** (38 MB raw wasm). Uses the **no-threads**
template, so there is **no `SharedArrayBuffer` requirement and no COOP/COEP
headers needed** — it drops onto itch.io as-is. Verified in Chrome with a
real WebGL2 context, GDScript executing, and a correct telemetry batch on the
wire.

---

## 5. Open questions / not yet done

- **Orderly presentation is greybox.** The marionette gait, the head-cock,
  the frozen anim clock while paused, and the translucent sight cone are not
  yet ported. The cone in particular is a real gameplay affordance while
  unmed, not decoration.
- **Rooms 4/5/6/7 need playtesting now that orderlies actually walk** (§2.2).
  Their patrol, sight, grace and chase loops have never once run in the Godot
  build against a moving orderly, so no threat pacing in this port has been
  observed rather than assumed.
- ~~**A/B experiments framework** (`src/game/experiments.ts`) is not ported;
  `Telemetry` reserves the `experiment`/`variant` payload fields for it.~~
  **Ported** 2026-08-29 as `core/experiments.gd`. FNV-1a is reproduced
  bit-for-bit and pinned against vectors generated from the TS original in
  `tools/check_experiments.tscn`, so a player already bucketed by the
  Three.js build stays in the same arm. The registry still ships with nothing
  active, exactly as the original does.
- **No map viewer.** `/map.html?room=<id>` has no Godot equivalent; the
  editor partly covers it, but patrol paths and sight envelopes are not
  visualised.
- ~~**Randomize-codes** is wired per-room but the start-screen toggle that
  drives `WardCodes.is_randomize_codes_enabled()` has no UI yet.~~ Done — see
  §6.
- **`big: true` on scrawls** is not expressed by the generator — affects
  relative scrawl sizing in rooms 2–7.
- ~~**Rooms 8–20 are not ported.**~~ Done — the full ward (rooms 1–20, with
  room 19 as a two-scene variant) is ported and registered in `main.gd`'s
  `ROOM_SCENES`. The kit features this list called out as missing all landed
  with them: triggers (`core/trigger_volume.gd`), shape locks
  (`core/shape_lock.gd`), light switches (the light axis,
  `core/light_object.gd`), and verticality including stacked levels
  (`core/levels.gd`).

---

## 6. Settings: the start screen and the CONFIGURATION panel

`ui/start_overlay.tscn` gates play behind **ADMIT ME** and is the only route
to **CONFIGURATION**, mirroring `index.html`'s `#startOverlay`/
`#settingsOverlay` and `src/ui/hud.ts`'s `showStart()`/`bindConfig()`. Copy is
verbatim from the TS where the TS has authored copy. `main.gd` no longer
enables player input in `_ready`; the ward renders behind the overlay and
`_on_admit_pressed` starts the run.

### Persistence is a ConfigFile, and ProjectSettings was a real bug

`WardCodes.is_randomize_codes_enabled()` was backed by
`ProjectSettings.set_setting()`. That could not work: `ProjectSettings` is
project/editor configuration, nothing is written without an explicit
`ProjectSettings.save()`, and an exported build has no writable
`project.godot` to save into. The setting could never survive a reload.

Storage now lives in `core/settings.gd` (`WardSettings`) as a `ConfigFile` at
`user://settings.cfg` — a real per-project directory on desktop, IndexedDB on
web, i.e. the analogue of `settings.ts`'s `localStorage`. Load once, cache,
write through on change; a write failure warns and keeps the in-memory value,
so a locked-down filesystem degrades to session-only exactly as the TS
`try/catch` does. `WardCodes` keeps its two function names as forwarders, so
**rooms 2/5/6/7 needed no edit**.

Proven across a real process restart, not just a round trip:
`tools/test_settings_persist_write.tscn` writes in one headless process and
`tools/test_settings_persist_read.tscn` reads in a second. A same-process
round trip proves nothing here — the static cache alone would satisfy it,
which is precisely how the ProjectSettings version looked correct.

### Brightness

New; the Three.js build has no equivalent. A single multiplier on
`Environment.tonemap_exposure`, applied in `main.gd._target_exposure()` to
**both** ward states, so calibrating for a dim screen cannot flatten the
LUCID:UNMED contrast the game is built on. `MOOD`'s `exposure` values are
untouched and remain the baseline at 1.0.

Default **1.25**, chosen by measuring the real game (`tools/shoot_game.tscn`),
not by eye: mean frame luminance at the room-4 centre goes 9.43 → 10.27 →
10.54 for 1.00 → 1.25 → 1.40. The ACES curve rolls off, so 1.25 is the knee —
+8.9% for the first quarter, only +2.6% for the next. Note that single-frame
comparisons in UNMED are noisy because the fluorescent flicker is live;
average several frames or the numbers come out non-monotonic.

**The config panel is deliberately see-through and bottom-weighted** (scrim
0.32 vs the start screen's 0.92) so the live ward shows above it and the
slider can be judged before starting. It does not preview brightness with grey
swatches, the usual idiom: `tonemap_exposure` is a 3D post-process, so 2D
CanvasLayer swatches would not respond at all and would mislead. There is
deliberately no mid-game config route — that would mean pausing and restoring
mouse capture, this project's most bug-prone area, for a setting that can now
be judged properly up front.

### Look sensitivity

New; the Three.js build has no equivalent. A **multiplier on
`Tuning.LOOK_SENSITIVITY`**, deliberately not a second absolute rad/px value:
`tuning.gd`'s header forbids tuning its ported constants by feel, and a
setting that replaced 0.0024 outright would fork that number into a second
home and make the 1:1-with-`tuning.ts` claim untestable. Defaulting the
multiplier to 1.0 reproduces the ported feel exactly, and the range is
0.25x-3.0x (a full 800 px sweep turns ~27 degrees at the bottom, ~330 at the
top — past which the wall scrawls, which carry both narrative and puzzle
content, can no longer be read while turning).

Applied once, in `player.gd._apply_look()`, which is the single point every
pointer already funnels through — `_handle_drag` converts a touch drag into
"sensitivity pixels" against the BASE constant precisely so it does, so touch
gets the setting too rather than needing a second knob.

Unlike brightness there is **no live-preview signal**. The mouse is not
captured while the panel is up (the panel needs the cursor to drag its own
slider), so there is no camera turning behind the scrim for a preview to show;
`player.gd` reads the setting on the next look frame after ADMIT ME. The
readout is `1.00x` rather than brightness's `125%` — same panel, different
units on purpose, because look speed is the one row a player arrives at
already knowing what number they want, and the multiplier is that convention.

### Black and white, and why it is not the duotone

The posterise shader already had a knob that looks like a black-and-white
control and is not one. `tint_amount` collapses the frame onto a two-colour
ramp **by luminance**, and luminance is exactly what this ward's wall graffiti
has least of: pure red weighs 0.2126 in LUMA, so rooms 3, 4 and 6 lose their
text to near-grey at tint 1.0. That is why `KEY_STYLE_TINT` ships at 0. The
text is narrative, and room 5's own hint — "the code is written where he
walks" — means **hue is carrying puzzle-relevant information**. Wiring a
player-facing toggle to the duotone would have shipped unsolvable rooms.

So `mono_amount` is a separate uniform with a different conversion. It
desaturates by luminance only where the pixel is already NEUTRAL, and lets a
saturated pixel keep its peak channel instead:

    float ink  = clamp((max_c - min_c) * mono_ink_gain, 0.0, 1.0);
    float grey = mix(dot(c, LUMA), max_c, ink);

A grey wall converts at true LUMA and is unaffected. The red ink converts at
its red channel and keeps its contrast. Measured at the room-3 spawn, on the
brightest 5% of pixels in the graffiti block against the bare wall beside it:

| mode | stroke contrast | retained |
|---|---|---|
| colour | 104.9 | — |
| `mono_amount` (ink gain 4) | 104.5 | **99.6%** |
| plain luminance | 25.6 | 24% |

Applied AFTER the `enabled` blend, not folded into `styled`: black and white is
a player setting and the posterise pass is a dev one, so folding them together
would silently switch colour back on for anyone who turned the style off in
`ui/dev_panel.gd`.

`tools/test_settings.tscn` asserts both halves — that the toggle moves
`mono_amount`, and that it leaves `tint_amount` alone. The second is the one
that protects the puzzles: if a later change reroutes the toggle to the duotone
because it is "the desaturation knob", that test fails.

### The settings card scrolls now

Five rows was one too many. The card is bottom-anchored and grows upward, so
that the live ward stays visible above it, and at five rows it pushed the
CONFIGURATION title clean off the top of a 1280x900 window. `Rows` now sits in
a `ScrollContainer` whose height `_apply_scale` binds to `min(content, 0.58 *
viewport)` — bound to the CONTENT, not set to the cap, or the shorter mid-game
panel would reserve empty space under its last control.

### The mid-game pause panel, and the argument it overturns

`ui/start_overlay.gd`'s header used to argue there should be NO mid-game
config route: it means pausing, re-showing that layer over a captured mouse
and restoring capture afterwards — the exact area where this project has
already shipped an unplayable mobile build. **That argument was right about
the risk and wrong about the conclusion**, and what changed is the set of
settings. Brightness can be judged before ADMIT ME against the see-through
config panel. Look sensitivity and HUD size cannot: both are only answerable
by playing, and sending a player back to the title card to adjust them is
worse than the capture risk.

The risk is handled rather than accepted:

- **Capture is re-requested from inside the RESUME button's own `pressed`
  handler.** That is a real user gesture and therefore the one context a
  browser will grant pointer lock in — the same trick ADMIT ME already uses,
  and the reason `resumed` is a signal main.gd acts on synchronously instead
  of main.gd polling for a closed panel.
- **Opening is gated on one condition: the player must actually hold input.**
  That single test is what keeps the panel off the keypad, the start screen,
  the end card and the dev panel — every one of those already takes input
  away — so two layers can never fight over the cursor. It also makes a
  second pause while paused a harmless no-op.
- **`start_overlay` is `PROCESS_MODE_ALWAYS`**, or its own RESUME button is
  unclickable and the run is stuck behind a menu it cannot dismiss.
  `StateManager` stays `PAUSABLE`, so the medication meter stops with the
  tree: a player who opens settings at three seconds left must not come back
  reverted.
- **The randomize-codes row is hidden mid-game.** It is a per-run gameplay
  variable, the room's code is already generated by the time this panel can
  be reached, and flipping it mid-run would either do nothing or silently
  reroll a code the player is halfway through reading. Mid-game is display
  and controls only; the heading reads PAUSED and the button reads RESUME.

Reached with Escape (which previously only dropped pointer lock — strictly a
subset of what it now does) or a top-right touch button. The touch button is
not optional: a phone has no Escape key, and HUD size and look sensitivity
are precisely the settings a touch player most needs.

`tools/test_pause.tscn` pins all of it, and `tools/shoot_overlay.tscn` gained
a `pause` mode plus a hud-scale argument, because a display setting can only
be judged by looking at it.

### HUD size

A multiplier on the viewport-derived scale `ui/hud.gd` already computes, not
an absolute font size — the 720p-baseline derivation is what keeps the HUD
the right relative size on any display, and the setting only says "bigger
than that" or "smaller than that".

**Clamp the derivation, then apply the setting — in that order.** Clamping
the product instead lets the display's bound eat the player's choice whole:
on any viewport shorter than the 720p baseline the product sits under
`SCALE_MIN`, so every value from 75% to 160% clamped to the same number and
the slider did nothing at all. That is what the first cut did, and the test
that caught it is the one that reads the font size the real HUD actually
wrote rather than recomputing the multiply.

### The HUD bottom row is sized for reading under pressure

`ui/hud.gd`'s pill readout and medication meter used to be the SMALLEST things
on screen (26pt text, a 180x8 bar with ProgressBar's default theme). Over any
lit floor — room 3's window wall, room 5's alcove — the meter was a grey
hairline on grey and effectively invisible, which is a problem specific to
those two readouts: they are the only ones a player must act on mid-room
("can I shift", "how long have I got") rather than read once on entry.

Three changes, none of which add chrome over the game:

- **Type up, 26 -> 32pt, above the objective line rather than below it**, and
  the pill count is colour-coded (lucid accent held, dimmed spent) so at
  `PILLS_MAX` 1 it answers its real yes/no question peripherally.
- **A real meter.** Bordered dark track plus a `240x16` accent fill, both
  built in `_style_med_bar()`. The fill is recoloured for the warning state
  **through its stylebox, not `med_bar.modulate`** — modulate tints the track
  as well, so the empty part of the meter went red with the full part and the
  bar stopped reading as a gauge at the one moment it is read hardest.
- **A numeric countdown beside it**, `ceili`-rounded. It is a deadline: with
  `floori`/`roundi` it reads "0s" while the player still has most of a second
  of lucidity, in a game whose only escape from an orderly is a shift.

Every label also gets a scaled dark outline (`OUTLINE_PX`). The HUD is drawn
straight onto the ward with nothing behind it, and the ward is not a uniform
backdrop; an outline buys what a backing plate would without putting a panel
over the game.

`tools/test_hud.tscn` pins the arithmetic and the wiring — countdown rounding,
the exact `<=` warn threshold shared with `StateManager`, meter and countdown
appearing together, and that every Control in the layer is still
`MOUSE_FILTER_IGNORE`. That last one is the point of the harness: the
Countdown label is a new HUD node, and one Control left at the default filter
is what made the entire first mobile build unplayable.

### Things that bit, worth not re-learning

- **`tools/shoot_game.gd` now dismisses the start overlay** before shooting.
  Without that, every "how dark is the ward" screenshot is a photograph of the
  title card — and that is the harness the lighting work is judged with.
  `tools/shoot_overlay.tscn` is the one to use when the overlay is the subject.
- **`lucid` in that harness grants `can_shift` too**, not just the state. The
  HUD gates its pill readout on the ability and `StateManager` only drains the
  meter while it is held, so a forced lucid without it photographs a state the
  game never reaches: medicated, bottom row half missing, countdown frozen
  full. Room 1's cup is what grants it in play.
- **The HUD is hidden until ADMIT ME.** The TS build leaves its HUD up because
  its start overlay is opaque; ours is not, and the first render showed the
  room-1 objective line running through the WARD B title and the reticle dot
  sitting in the middle of the CONFIGURATION panel.
- **The randomize-codes control is a Button, not a CheckBox.** `CheckBox`
  draws its tick from a fixed-size theme icon that `custom_minimum_size` does
  not scale, so it rendered tiny next to 1.4x type at 1728x1080 — the "UI is
  too small" complaint again. It is a `[  ]`/`[X]` text toggle, which scales
  with `font_size` like everything else and is a far larger touch target.
- **A GDScript runtime error aborts only the enclosing function**, so the
  remaining assertions in a test silently never run and the suite still prints
  OK. A `RefCounted` test double passed to room2's `on_enter(main: Node)` did
  exactly that and hid both randomize-codes tests while exiting 0.
  `tools/test_settings.gd` asserts an expected assertion count to catch it;
  the guard was confirmed to fail against the broken version.
- **`print()` does not reach the browser console** in this web export;
  `Telemetry.event()` does. Use telemetry to instrument a web-only problem.
- **Serve YOUR OWN build directory.** Port 8899 already had a server from
  another worktree bound to it, so a rebuild appeared to change nothing and
  cost a long detour chasing a non-existent stale-export bug. Always compare
  `shasum` of the served `index.pck` against the local one before believing a
  web result.
