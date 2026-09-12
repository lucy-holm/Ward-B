# Early ward feedback pass

This pass follows the room 6–8 playtest feedback. The first nine rooms now
contain two numeric-code puzzles (rooms 2 and 5), down from five. The existing
PS1 color and monochrome presentation, room routes, pursuit, refill points
and later-room escalation remain in place.

| Room | Beat | Recovery rule |
| --- | --- | --- |
| 1 | First pill and state tutorial | Existing tutorial |
| 2 | Read raw, enter the first code lucid | Existing code rules |
| 3 | See through the chains | Existing state gate |
| 4 | First orderly and escape | Existing catch recovery |
| 5 | Split-code puzzle around cover | Existing code rules |
| 6 | Find a fuse on one of four service trays; power the panel lucid | A catch changes an uncollected location; held/installed fuse persists |
| 7 | Match the discharge request to a physical shape seal; use the lucid reader | Wrong seals make noise; an uncollected request changes after a catch, held seal persists |
| 8 | Ring three shape-marked call bells in the wall's order | Bells work raw and make noise; wrong future bell resets, catches preserve correct lamps |
| 9 | Search the coat for the brass key; open the lucid keyhole | Full pill capacity still grants the key; refill and milestone chart remain |

The matching seals and bells use distinct silhouettes as well as muted colors.
Room 8's lamps and depressed buttons show progress without relying on color.
These are small procedural meshes using existing ward materials, without new
shadow-casting lights or patrol-blocking colliders. Four low trays ground the
randomized fuse positions.

Wall text now fits a measured world-space envelope after its font mesh is
built. Narrow wall bands can specify their own width and height. Randomized
text is refitted from its original authored size, so repeated changes do not
keep shrinking it. The room 8 order has a dedicated band above the dispenser.
See the companion scrawl audit for scope and remaining visual limitations.

Input layout follows actual touch, mouse and keyboard events. A touchscreen
capability flag still selects the conservative rendering budget, but no longer
forces the touch interface while using a mouse. Synthetic touch-to-mouse
input is ignored. Switching modes clears transient stick/look state. Capture
is requested from a click; browsers that refuse it retain button-held drag
look. Browser emulation cannot certify physical iPadOS Safari pointer lock.

## Telemetry and next playtest

The new puzzles emit bounded `puzzle_step` events for mismatches, pickups,
latched bells, resets and completion. `puzzle_layout` records the requested
shape, bell order or fuse-location index. The existing collector preserves
additive event names; its advisory vocabulary now includes `puzzle_layout`.
Existing catches, room durations, state changes and abandonment estimates can
be compared alongside these events. Private tailnet builds continue to have
an empty collector configuration; public collection belongs to the existing
manual itch publishing workflow.

Play through rooms 6–9 in both color and monochrome. Check whether players
notice all four fuse search locations, understand the records request without
trying every seal, and distinguish bell sequence mistakes from catches. Look
for repeated `mismatch`/`sequence_reset` events and unfinished puzzle steps
before room exits or quit estimates. Prefer improving cues and route timing
over adding another code if these rooms cause stalls.

On a physical iPad, try starting with touch, then mouse/keyboard, pausing and
resuming, and touching the screen again. Confirm controls follow the input,
WASD moves, and either captured mouse motion or held-button dragging turns the
camera. The browser may keep the cursor visible even when the game correctly
selects desktop controls.

## Verification

- New-room tests cover every seal request and all six bell orders, state
  refusals, mistakes, catches, physical exit collision, full inventory and
  actual Camera3D/InteractRay focus at all new interaction targets (182 assertions).
- Room 6 tests include all four fuse targets and real camera focus (47 assertions).
- All generated room/prop outputs round-trip byte-for-byte (123 files), with
  resource and placement guards. `npm run check:rooms` and `npm run build` pass.
- Godot maps for rooms 6–9 and the required archive map load without browser errors.
- Telemetry report regressions (21 checks), collector ingestion tests and
  collector TypeScript checking pass. No production telemetry was sent.

- The full 30-suite run found a deferred scrawl callback after room removal;
  the guard was fixed and the failed patrol suite passed on rerun. Updated
  HUD, pause, hybrid input and fuse suites also passed after final review fixes.
- An isolated Web export in a fresh touch-enabled iPad-UA Chromium context
  passed real click, WASD, mouse drag, touch return and pointer return. Cursor
  capture was refused in that context, exercising the drag fallback. This is
  browser emulation, not a physical Safari certification.
- Real player-camera captures were reviewed for the fuse tray, seal, call
  bell and order clue, including the monochrome order clue.
- Targeted windowed occlusion checks pass rooms 8 (2/2), 11 (7/7), 12 (8/8)
  and 18 (5/5) after moving the blocked writing. Final layout tests pass 401
  assertions; the affected room suites and generator round-trip pass again.
- The updated private export is served at `https://hellos.impala-alpha.ts.net:8444`.
  Raw/gzip and served HTTPS PCK bytes match SHA-256
  `8ad227c18c0fd8c8eb5d93fd2376397070812a5ad5bc9a05256e568d812473f5`.
- Desktop browser input passes with actual pointer lock, movement and look.
  A room 8 browser sample on this host's Apple M4/ANGLE Metal renderer measured
  60.0 requestAnimationFrame callbacks/s at 1280×720 with gameplay active.
  This is a desktop sample, not a physical phone/tablet performance guarantee.
- The final pure-touch browser check passes on the served export: 18 distinct
  camera yaw values, four distinct movement positions, successful medication
  use and no page errors. Hybrid and native input regressions also pass with
  the active-touch fix below.

The final pure-touch browser check exposed one additional regression: the Web
backend emitted `InputEventMouseMotion` with the ordinary mouse device ID
immediately before each `InputEventScreenDrag`, even though DOM tracing showed
only touch events. Switching to pointer mode cleared the active look/stick ID.
`WardInput` now tracks active touch indexes and ignores those mouse motions
for mode selection until the finger lifts. A real mouse motion after release
switches immediately; no time-based handoff delay is used. Native tests cover
this event order, and the browser touch test exercises actual movement, look
and taking the pill. The device IDs were checked against the installed 4.7.1
runtime and [Godot's InputEvent documentation](https://docs.godotengine.org/en/4.7/classes/class_inputevent.html).
