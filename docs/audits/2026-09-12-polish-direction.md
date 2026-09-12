# Ward B — concept art, pressure, and browser polish

Audit date: 12 September 2026. Working branch: `preview/tom`.

## Build identity

This is the Godot project linked from the Helios dashboard on the machine
running Windmill. The dashboard's Ward B entry points to
`https://hellos.impala-alpha.ts.net:8444`; Tailscale Serve routes that port to
`127.0.0.1:8091`. The running `ward-b-godot-ward-b-godot-1` container mounts
this checkout's `godot/build` as its web root. Windmill itself is a separate
service on port 8000; it is not the game's renderer or server.

The audit found a real stale export: `index.pck.gz`, which browsers receive,
expanded to SHA-256 `7afe387b624a1f22d441601263f94b65c4849d61c1a8742fdaacb0876f9107f1`
(2,789,372 bytes), while the raw local `index.pck` was
`c21844317fde265a0e87f9a20cd8e8c7a1e90c1b0fb9969ec87671ca9ddf2441`
(4,370,440 bytes). A cache refresh cannot repair this server-side mismatch.
The private build has now been redeployed. The decompressed HTTPS-served PCK
and local PCK both hash to
`56edb9bc4878c19727aba4ba8a0032a220b5d9190756b01a66b9bcc9711fcf5a`.
Use `godot/tools/deploy_tailnet.sh`, which regenerates and verifies gzip files,
for private deployments. Do not substitute a raw export into the live directory.

## Art direction and implemented pass

The seven supplied plates establish a coherent target: warm cream plaster,
muted olive lino, tan moulded seats, chipped enamel, cold oxidised iron, tall
barred windows, and an elongated uniformed orderly. Their lighting and material
separation matter more than reproducing their photographic detail. Photos 3
and 4 repeat the clean waiting-room view; photo 5 supplies its decayed counterpart.

The existing kit already contains beds, beam seats, sinks, radiators, carts,
windows, vents and many small hospital fittings. More geometry everywhere is
not the first improvement: a crowded patrol lane or a wall of false interactive
objects would make puzzles harder to read.

This pass:

- Replaces four flat prop finishes with a shared chipped-paint/grime shader:
  cream enamel, green enamel, bed-frame rust and tan vinyl. It uses one shared
  mipmapped 128px noise resource and three samples per fragment, with no extra
  meshes, transparency, normal-map samples or processing nodes. Rust now shows
  surviving paint and exposed iron instead of an averaged brown colour.
- Retunes the shared floor toward flatter, desaturated lino. Shallow grout and
  softer normal relief replace the pronounced wet-cobble appearance observed
  through the real game camera. Fitting highlights remain visible.
- Sets new-player and Recommended rendering defaults to eight luminance tones
  and 75% ordered dither, retaining the two-pixel grid and film grain. Four
  tones obscured surface detail with dense stippling. Existing saved render
  preferences remain intact; Recommended applies the new preset to those saves.
- Retains black-and-white as an independent display choice, including the
  existing saturated-ink preservation rule. Gameplay state never depends on
  choosing colour or monochrome.
- Adds bounded wall dressing to the Breaker Bay, Relay Room and both Undercroft
  variants, keeping floor routes, clue areas and puzzle fixtures clear.
- Corrects an input setting with a duplicated path and invalid comment syntax that let touch swipes also generate mouse
  look, causing severe overshoot. Adds a regression against the effective engine
  setting and checks that one touch drag contributes exactly one look delta.
- Gives fresh touch-browser profiles a half-resolution 3D default, reducing
  the 3D pixel count to one quarter while keeping the HUD at canvas resolution.
  Saved resolution choices remain authoritative. Full-screen grain and dither
  still run at canvas resolution, so this is not a claim of four times the FPS.
- Wraps long HUD messages and fits the active medication meter beside the pill
  count and countdown on portrait screens. Reserves space around touch buttons
  in both orientations, fixing the Q button covering the medication meter. Brings HUD, pause and kit checks into the default
  test runner. The generic room validator now checks both stage-19 variants
  and fails on a missing patrol script rather than silently skipping it.

Shader built-ins were checked against the official
[Godot spatial shader reference](https://docs.godotengine.org/en/4.7/tutorials/shaders/shader_reference/spatial_shader.html).
The actual Compatibility render and exported browser checks remain the
acceptance evidence; a shader parsing in headless mode is insufficient.

## Gameplay direction

The campaign is 20 stages with two versions of stage 19, not 21 consecutive
levels. It already has a varied second half: moving walls, an orderly-weight
plate, shape keys, lighting gates, stacked floors, a consequential power choice
and a push-block finale. See the companion gameplay audit for the room table.

The largest repetition risk is the early/middle run of reading a code while
unmedicated and typing it while lucid. Keep that as the teaching language, then
change the player's decision, not just the number of digits or orderlies.

Recommended next mechanics, in order:

1. **An orderly that can reliably get around cover.** The current chase stays
   active until medication or capture, but rooms contain no baked navigation
   regions and the fallback moves straight toward its target. Prove corner and
   U-shaped-obstacle cases before expanding pursuit. A navmesh/patrol-network
   solution needs to respect state geometry, fixed floor identity and moving
   gates. Do not remove medication's escape rule or add arbitrary enemy teleports.
2. **A two-step maintenance task that makes noise.** In one existing code-heavy
   room, retrieving a fuse and fitting it at a panel should briefly draw a
   patrol toward the work area. Telegraph the sound and the approach, provide
   usable cover and a reachable dispenser, and preserve progress after capture.
   This gives players a route/timing decision rather than another memory test.
3. **A second, clearly taught lucid hazard late in the campaign.** Use a
   visible mechanical signal—an advancing shutter and accelerating relay clicks—
   to warn before calm becomes dangerous. Shifting unmedicated should halt that
   hazard while exposing the player to orderlies. Room 13 already proves this
   trade; develop a different interaction rather than repeating its corridor.

Preserve breathers. Continuous pursuit everywhere removes the contrast that
turns footsteps into pressure and leaves no space to understand a new puzzle.
Teach, rehearse, combine, then provide a short recovery. Cross-room Mr. X-style
persistence is a larger design change: these rooms are currently one-way, with
room-owned orderlies and carefully audited pill recovery.

## Acceptance and limits

Judge against the real player camera in colour and monochrome, lucid and
unmedicated. Check both the room's spawn composition and the spot where a player
reads a clue; a prop gallery alone cannot establish gameplay readability.

Use the existing room, patrol, mechanics, kit and late-level suites, generator
round-trip/placement checks, and both map viewers. Exercise desktop movement,
pointer lock and mobile touch interactions in the actual web export.

Performance evidence must identify the renderer and the measured room. A
SwiftShader emulated phone is an A/B tool, not a real-device frame-rate claim.
`measure_fps.mjs` previously never admitted the player and could measure a paused
title-screen session; the corrected probe must confirm admission before sampling.
Rooms 10 and 12 warrant physical-phone profiling before further lighting or
furniture is added. Shared meshes reduce asset memory but do not by themselves
eliminate the many draw calls from each multi-part prop. If profiling identifies
draw submission as the bottleneck, bake static prop parts into surfaces grouped
by material while retaining separate labels, light gates and colliders.
Aim for sustained 30 FPS on the lowest supported phone and
60 FPS on a typical desktop, measured during movement and state transitions.

This audit does not establish that every puzzle is fun or that every phone
holds those targets. The next in-person playtest should record failed attempts,
clue-reading time, whether pressure feels recoverable, frame-time spikes, and
whether the player can explain what each state costs after rooms 4, 13 and 16.
Detailed test results and remaining findings are recorded with this pass.

## Companion audits

- [Room-by-room gameplay and pressure](2026-09-12-gameplay-audit.md)
- [Visual coverage and prop placement](2026-09-12-visual-audit.md)
- [Browser performance, input and lifecycle](2026-09-12-browser-audit.md)

## Verification completed

- Godot 4.7.1 default runner: all 21 suites passed, including all late-level
  mechanics and both room-19 routes. After the final touch HUD spacing change,
  HUD, settings, pause and input suites were rerun and passed: HUD 42 assertions,
  settings 49, input look 7.
- Regression evidence: invalid input configuration failed the effective-setting
  assertion before the fix; the HUD tests reproduced six button overlaps before
  spacing was added. Removing the doors-branch script in an isolated copy caused
  the expanded room checker to fail.
- Resource/authoring validation: 202 resources; 21 rooms with zero placement
  issues; 123 scene/spec outputs regenerate byte-for-byte.
- `npm run check:rooms` and `npm run build` passed. The latter retains the
  existing archive bundle-size warning. Both the Godot and archived map viewers
  were opened and checked; no archived game source was changed.
- Exported Chrome/WebGL2 boot passed with no script/page errors. Desktop admission,
  keyboard movement, pointer lock and mouse look passed. Pixel 7 touch emulation
  at 1081×2202 passed look, movement and tutorial-pill interaction with no page
  errors (19 distinct yaw values, 3 positions, confirmed lucid state).
- Private deployment regenerated compressed assets and verified their sources
  and nginx responses. The final HTTPS package hash matches the local file as
  recorded above. No public itch release or remote branch push was made.

Screenshots are retained locally under `godot/.artifacts/`. The controlled
`audit-style-eight-lucid.png` / `audit-style-eight-unmed.png` pair documents the
new eight-tone preset. `debug-touch-after.png` is the final exported touch
capture after taking the tutorial pill; the temporary diagnostic script is
not part of the shipped source.

### Software rendering samples

The corrected probe confirmed admission and the requested room before sampling
12 seconds of `requestAnimationFrame` callbacks on a fresh Pixel 7 profile
(1081×2202 buffer, half-scale 3D, SwiftShader CPU rendering):

| Room | Callback rate |
| --- | ---: |
| 12 | 3.6/s |
| 20 | 3.7/s |

These are reproducible current-build baselines, not before/after speedups,
engine frame counters or measured phone FPS. They do not establish a mobile
performance pass. Hardware sampling is required before selecting a minimum
supported phone or promising 30/60 FPS. The runtime trace separately confirmed
that the touch profile selected 0.5 while keeping the UI buffer at full size.

### Desktop hardware reference

A second room-12 sample used a fresh desktop context at 1280×720, full-scale
3D, Chrome `--use-angle=metal --enable-gpu`, and the same admission/warmup/
12-second callback measurement. WebGL reported
`ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)`;
the result was **60.1 rAF callbacks/s**. The local probe is retained as
`godot/.artifacts/probe_hardware.mjs`.

This supports smooth frame scheduling for that short, stationary gameplay
sample on this Mac. It is not a long-session frame-time capture, an engine
frame counter, or evidence for physical-phone performance. Movement, state
transitions, both room-19 routes and repeated captures still belong in the
human playtest and device profiling pass.
