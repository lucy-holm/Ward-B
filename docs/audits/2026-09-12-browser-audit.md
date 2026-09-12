# Ward B browser and mobile audit — 2026-09-12

Scope: Godot 4.7 HTML5 build on `preview/tom`, with attention to the PS1
post-process, desktop/mobile input, browser lifecycle, loading cost, and the
rendering ceiling of the authored rooms. This is an engineering audit; the
reference screenshots remain the visual target and real-device playtesting is
still required for final feel.

## What is already in good shape

The project selects `gl_compatibility` for both desktop and mobile, which is
the correct WebGL 2 path. The web export disables threads and native
extensions, excludes tools and orderly preview scenes, enables desktop/mobile
VRAM compression, uses the responsive canvas resize policy, and includes the
standard relative-path HTML shell. The generated export is approximately
9.6 MiB gzip for WASM, 1.3 MiB gzip for the PCK, and 67 KiB gzip for the
loader JS (12 September private export including the visual pass).

The input path uses the action map for keyboard movement and native
`InputEventScreenTouch`/`InputEventScreenDrag` for touch. Touch-to-mouse
emulation is now correctly disabled; see the discovered setting defect below. The
touch controls derive their button and stick sizes from the live drawing
buffer and convert the device-pixel canvas coordinates back to CSS coordinates
in the verification harness. HUD controls ignore mouse input, while action
buttons remain pickable. This is the right split for a browser game with a
first-person look drag.

The final verification record is in the companion polish-direction report.
The HUD suite passes 42 assertions, covering long text and the active medication
row at 1280×720, 390×844 and 1081×2202. Objective, toast and threat labels
wrap, and the meter gives space to the pill count and countdown. Touch layouts
reserve vertical space in portrait and horizontal space in landscape so pause,
E and Q cannot overlap the objective or medication readouts. Regression checks
use the actual touch-control rectangles at 390×844, 1081×2202 and 844×390.

## Findings

### Fixed — touch look was also receiving synthetic mouse motion

The intended setting was written as
`input_devices/pointing/emulate_mouse_from_touch=false` inside the
`[input_devices]` section, producing a duplicated path. Its surrounding `#` comments were also invalid
for Godot project configuration; they are now `;` comments. The actual engine
setting retained its default of `true`. A fresh browser run showed a requested
1.27-radian turn becoming approximately 4.77 radians, and the tutorial pill
interaction failed because the aim overshot downward and sideways.

An isolated debug export confirmed both input paths were accumulating motion.
The key is now `pointing/emulate_mouse_from_touch=false` within that section.
An isolated key-only fix still read `true`; correcting both the path and the
comment syntax makes the effective setting `false`.
`test_input_look` reads the effective engine setting and failed before the fix;
all seven assertions then passed. Its previous always-true touch smoke check
was replaced with a measured, viewport-normalised drag assertion.


### Implemented — conservative first-run touch-browser resolution

The exported Pixel 7 emulation uses a 1081×2202 drawing buffer at DPR 2.625.
Fresh web/touch profiles now select `Viewport.scaling_3d_scale = 0.5`, leaving
UI at native resolution and reducing the 3D pixel count to one quarter.
Desktop defaults to 1.0; explicit saved choices take precedence. The settings
suite checks platform combinations, persistence and fallback (49 assertions).
The Recommended visual preset preserves the current resolution selection.

Full-screen `BackBufferCopy`, posterise and grain still operate at canvas
resolution: roughly 2.38 million pixels per pass on this profile. The new
default is a conservative workload reduction, not a measured fourfold speedup.
Physical-phone profiling is still needed to choose a supported minimum device.

### P1 — room lighting reaches a browser/mobile risk ceiling

The active room is loaded one at a time, which keeps the scene bounded, but
the authored worst cases are still high for WebGL: room 12 directly declares 42 mesh
instances, 44 OmniLight3D nodes, and 8 shadow casters; room 10 directly declares
35 meshes, 34 lights, and 6 shadow casters. These mesh counts exclude geometry
inside instantiated props and are not total scene or draw-call counts. The project-wide positional shadow
atlas is 2048. These figures are static scene evidence, not an FPS claim, but
they make room 12 the first target for a real-device GPU capture.

Preserve the readable pools and the PS1 contrast by assigning a low tier to
secondary fittings: keep only the nearest/key light shadow casters, shorten
light ranges where they do not affect a puzzle read, and let farther fittings
be emissive or non-shadowing. Do this in room/prop authoring and validate each
room’s sightline and darkness beat after the change. Do not add more real-time
lights to fill out rooms until the room 12 capture is known.

### P1 — browser backgrounding does not pause runtime audio or frame work

`autoload/ward_audio.gd` runs with `PROCESS_MODE_ALWAYS`, while
`autoload/telemetry.gd` also runs with `PROCESS_MODE_ALWAYS`. The web hook in
`telemetry.gd` calls `_fire_quit()` on `visibilitychange` to hidden. That flushes
the batch, sets `_unloading`, and permanently marks the session as quit even
when the player merely switches tabs or backgrounds a phone. There is no
matching visible handler, no audio pause, and no `Engine.max_fps` reduction.

The terminal telemetry state is a concrete resume defect. Ongoing audio and
render work are battery risks; background throttling varies by browser and was
not measured in this pass. Add a small browser visibility owner that pauses audio and reduces the
engine frame cap while hidden, restores both on visible, and reserves
`pagehide`/actual close for the terminal telemetry flush. Add a lifecycle test
that exercises hidden → visible without setting `_quit_fired`.

### P2 — the performance harness previously measured the title backdrop

`tools/measure_fps.mjs` used to wait 15 seconds and sample `requestAnimationFrame`
without pressing ADMIT ME. The room is visible behind the start overlay, but
the player, orderly activity, and live gameplay path are gated there, so that
number was not a gameplay sample. The probe now:

1. waits for a live canvas and `room_enter` telemetry, avoiding a canvas-size/
   scene-load race;
2. taps ADMIT ME using the drawing-buffer-to-CSS conversion;
3. waits for a confirmed `session_start` event before sampling;
4. accepts `WARDB_ROOM=room12` (or another room) and labels the result with the
   room and viewport; and
5. closes the browser in a `finally` block and clearly labels SwiftShader as
   CPU rasterisation.

Run it only against a local build with telemetry console output:

```sh
python3 -m http.server 8899 --directory godot/build
WARDB_ROOM=room12 LABEL=room12 node godot/tools/measure_fps.mjs
```

SwiftShader output is suitable for build-to-build A/B comparisons. It is not a
real-phone FPS target; use Safari/Chrome on representative low-, mid-, and
high-tier devices for the ship decision.

### P2 — mobile browser support is touch-complete but controller-light

Keyboard actions and touch actions cover the intended desktop and phone paths,
including interaction, state shift, pause, keypad entry, look, and movement.
The project input map contains no joypad bindings. A Bluetooth controller on a
phone or desktop therefore has no documented gameplay path. If controller
support matters, add action-map bindings and glyphs as a separate input pass;
do not infer controller input from mouse emulation.

### P2 — the web export is cacheable only as ordinary static assets

The PWA switch is disabled, so there is no service worker or offline shell.
This is acceptable for the current tailnet/Pages playtest, and the compressed
payload is modest, but the public itch build should be tested on a cold mobile
load and a reload after an update. If a PWA is enabled later, version the cache
against the generated PCK/WASM pair so an old shell cannot boot a mismatched
game.

## Recommended browser ship gate

Before calling the PS1 visual pass browser-ready, record the following for the
same commit: `verify_web` on desktop Chrome, the touch verification on a
Pixel-class emulation, one `measure_fps` A/B at room 12 and room 20, and real
device captures at 390×844 portrait and 1280×720 desktop. Require no script or
WebGL errors, successful ADMIT ME/session start, working touch look/move/action,
HUD bounds in both orientations, and a documented quality tier for the
slowest supported phone. Treat room 12’s light/shadow load and the full-screen
post-process as the first two profiling targets.

## Final samples

The final polish report records the verified live package hash, all browser
control results, and fresh measurements: room 12 / room 20 SwiftShader phone
profiles at 3.6 / 3.7 rAF callbacks per second, and room 12 on the actual Apple
M4 Metal renderer at 1280×720 at 60.1 callbacks per second. These renderer-specific
samples must not be substituted for physical-phone frame rates or a full
campaign playthrough.
