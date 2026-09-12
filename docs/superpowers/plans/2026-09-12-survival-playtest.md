# Survival puzzle playtest implementation

The user approved the audit recommendations and parallel implementation on
12 September 2026. Work stays on preview/tom and Godot; frozen Three.js is
reference only. The private Tailscale build is the review target. Public itch
publishing remains the existing deliberate release action.

## Design

Keep Ward B's own identity: information and machinery belong to different
states, medication ends pursuit, and late calm can hide mechanical danger.
Inspiration is spatial pressure, readable threats, sound, resource decisions
and recovery—not a copied enemy, combat system, or continuous chase everywhere.

1. Collision-aware orderly pursuit with bounded route planning, fixed floors,
   dynamic-gate invalidation, direct-path fast path and deterministic tests.
   Authored noise triggers investigation/search then return; it never cancels
   a chase or removes medication's escape. No enemy teleporting.
2. Room 6 becomes a two-step fuse maintenance puzzle rather than another code.
   Retrieve while unmedicated, fit/operate while lucid; noise draws attention.
   Keep irreversible progress on catch and preserve a refill route.
3. Room 17 gains a taught lucid shutter hazard with at least 2.5 seconds of
   warning, a visible mechanical cue and safe retreat. Unmedicated retracts
   it and exposes orderlies. Preserve stairs, vertical separation and exits.
4. One-use clinical checkpoint charts in the room-9 breather, room-14 entry
   and room-19 lights platform. Store a versioned, validated milestone snapshot
   locally. Continue restores that room, its known safe anchor and prior branch
   facts; later unsaved progress rolls back to the milestone. Local catches
   preserve live puzzle progress. Fresh admission starts a separate new run.
5. Complete browser work: conservative positional shadow budget for touch web,
   preserve authored illumination/circuits, reserve HUD/controls and inspect
   actual gameplay. No expensive lighting or mesh-density increase.
6. Telemetry records puzzle/noise/hazard/checkpoint transitions, room outcomes,
   state/resource pressure and platform/performance. Hidden pages suspend and
   resume; actual unload is best-effort, missing endings are inferred abandonment
   with uncertainty. Keep itch-only transmission and opt-out. Reporting gives
   denominator-aware funnels and concrete next-playtest questions.

## Ownership and interfaces

- pursuit_noise: orderly/planner and focused AI tests. Public
  hear_noise(position: Vector3, source_level: String, source: String) -> bool.
- pressure_rooms: sole gen_rooms.py owner, generated scenes, room6/17 behavior
  and focused tests; places checkpoint fixtures for the root.
- telemetry_playtest: telemetry/lifecycle, worker/reporting and isolated transport
  tests. Keep Telemetry.event(name, data) compatible.
- root: main integration, checkpoints/Continue UI, room9/14/19 checkpoint hooks,
  existing keypad/crate/breaker noise, touch shadow budget, integration review.

main.emit_noise(source, position, source_level='') returns number investigating;
it emits aggregate noise with the source and responders. Agents emit transition
telemetry only: puzzle_step, investigation_started/ended, hazard_warning/
activated/avoided/caught. No per-frame events or player-entered text.

## Verification and completion

Each subsystem reproduces relevant failures before its fix and tests reachable
outcomes, reset/expiry behavior, fixed floors and malformed saved data. Root
reviews every diff and tests the integrated system; agent success alone is not
acceptance. Run all Godot suites, generator roundtrip/placement, npm room/build
checks, map inspection and browser desktop/touch/admission/transport checks.
Exercise both realities and variants in captures. Telemetry tests use isolated
exports and collectors; never replace the live package with a test build.

Refresh private deployment only after integration passes; verify compressed and
HTTPS-served hashes. Record actual benchmark renderer and limitations. Commit
reviewable changes and produce a playtest/reporting guide. Automated evidence
supports correctness and readability; human playtesting decides pacing and fun.
