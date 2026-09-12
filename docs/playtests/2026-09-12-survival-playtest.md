# Ward B survival puzzle playtest

This pass implements the September audit's pursuit, maintenance puzzle, lucid
hazard, recovery and browser recommendations on `preview/tom`. The game remains
20 stages, with two alternatives for stage 19. It uses Ward B's own state and
medication rules: sound and route planning create pressure, and late machinery
makes lucidity a decision rather than a universal safe mode.

## What to play

- Room 6 replaces another code with a service fuse and powered door. Recovery
  and fitting use different states; the work makes audible noise. Completed
  maintenance survives a catch.
- Room 17 combines fixed upper/lower floors with a warned lucid shutter. Read
  the lamp and relay clicks, then decide whether to cross or become unmedicated.
  The player should be able to explain the danger before being punished.
- The room-9 office, room-14 entrance and lights-route room-19 platform contain
  one-use patient charts. Continue restarts at the recorded milestone with its
  branch and prior completion facts. Progress after that milestone is not a
  full scene save. Catches within the current room preserve its live puzzle
  progress; they do not rewind to an earlier room. If storage fails, the chart
  explicitly offers recovery for this visit only, remains retryable, and does
  not create a Continue save. Web persistence uses asynchronous IndexedDB;
  avoid closing the page at the instant a chart is used.
- Wrong keypad attempts, crate pushes and breaker throws can change nearby
  patrol routes. A chase cannot be cancelled by making another noise. Taking
  medication still ends the chase; noises made afterwards can draw an invisible,
  nonthreatening orderly nearer before the next unmedicated interval.
- Completing room 20 displays an ending and stops the ward. There is no combat,
  health-bar attrition or cross-room pursuer in this pass.

The concept-art pass's cream/olive palette, worn enamel and rust, eight-tone
dither, grain and independent black-and-white setting remain intact. New
clinical fixtures and upper-gallery dressing use a small shared material kit.
Touch browsers retain the half-resolution 3D default and now allocate two
nearby authored shadow casters; light energy and puzzle circuits are unchanged.

## First human session

Use a fresh admission for the campaign, then Continue once to check the recovery
experience. Keep room-jump URLs for targeted development only; those sessions
are marked debug and excluded from playtest reports.

| Checkpoint | Observe | Ask after the room |
| --- | --- | --- |
| Rooms 1–4 | First shift, first refill, first orderly | What does each state let you do, and what does it cost? |
| Room 6 | Fuse discovery, noise response, path to panel, catch recovery | Did the sound help you predict where he would go? |
| Room 9 | Breather and chart discovery | What do you expect Continue to restore? |
| Rooms 10–12 | Navigation stalls, repeated codes, frame-time spikes | Were you solving a puzzle or just searching for the next clue? |
| Rooms 13–17 | Lucid danger, plate timing, shape keys, light-state trade, shutter | Was each failure understandable and recoverable? |
| Rooms 18–20 | Consequence of power choice, recovery, crate planning | Which decision mattered most? Where did pressure become tedious? |

Use both a physical phone and desktop. Include phone rotation, switching tabs,
locking/unlocking the phone, opening settings during a chase, and returning
from a backgrounded pause menu. Automated touch emulation cannot certify phone
GPU performance or sustained thermal behavior. Godot itself recommends testing
the actual low-end target hardware in its [system requirements](https://docs.godotengine.org/en/4.7/about/system_requirements.html).

## Reading the evidence

The itch release workflow requires a telemetry endpoint and stamps the build
revision. The private Tailscale build has no compiled endpoint. Build-time and
runtime itch checks, opt-out and bounded queues are retained. A read-only health
check on 12 September returned `ok: true`, and the GitHub `TELEMETRY_URL` variable
matched the existing collector; this is service/configuration evidence, not a
claim that this new build has already been published on itch.

See [the collector and report instructions](../../telemetry-worker/README.md)
for exporting D1 rows and producing a playtest report. Interpret completion
rates alongside the denominator, build, route, device and uncertainty. Review
unfinished visits as well as completers. A hidden tab is a resumable suspension;
missing terminal events are censored evidence, not proof a player rage-quit.

Use the new transition events to test these hypotheses:

1. **Pursuit works but remains escapable.** Examine stalled/recovered routes,
   catches per visit and repeated medication/refill loops. Frequent stalls call
   for geometry/planner fixes; frequent catches with no puzzle progress call for
   more warning or cover before increasing enemy counts.
2. **Maintenance adds a decision.** Compare part recovery → panel completion,
   abandonment after each step and noise responses. No response can mean no
   eligible listener was nearby; a sound is not guaranteed detection.
3. **Lucid danger is legible.** Compare shutter warnings, activations, avoided
   events and catches. A high first-warning catch rate suggests a teaching or
   timing problem before it suggests a need for easier enemies.
4. **Recovery earns another attempt.** Examine chart discovery, Continue runs
   separately from fresh admissions, and progress after local catches. Low chart
   use suggests poor visibility; repeated resumed abandonment suggests the room
   itself remains frustrating.
5. **Technical friction is separated from puzzle friction.** Segment frame
   samples and errors by browser/device/build before interpreting long dwell
   time as difficulty. Start with a modest cohort and treat small samples as
   questions for observation, not balance verdicts.

## Verification record

Verified on 12 September 2026 with Godot 4.7.1:

- All 28 Godot suites passed. Final pursuit, gallery, telemetry, lifecycle and
  checkpoint follow-ups passed after review fixes. The runner now rejects
  engine errors even when a partial test prints an OK marker.
- All 123 generated room/prop outputs reproduce byte-for-byte; resource and
  placement checks pass. `npm run check:rooms` and `npm run build` pass (the
  archived Vite bundle retains its existing chunk-size warning).
- Godot maps for rooms 6, 9, 13, 14, 17 and 19 lights, plus the archive map,
  load correctly. The moving-wall map adapter now preserves the floor tag.
- The refreshed export passes desktop admission/movement/look/pointer capture
  and touch look/movement/pill interaction, with no browser errors.
- A confirmed room-17 gameplay sample at 1280×720 measured 60.0 browser
  animation callbacks/second using ANGLE Metal on this Apple M4. This is a
  steady-view host sample, not a worst-case chase or physical-phone benchmark.
- Isolated web profiles persisted the actual room-19 checkpoint to IndexedDB,
  reloaded, and used the real Continue button on desktop and touch. Both restored
  the lights branch and raised safe anchor. Touch targets meet the 44px check.
- The telemetry transport gate passes 19 checks; the interactive telemetry
  session passes 10. Lifecycle has 20 assertions, report fixtures have 21 checks,
  and actual Worker ingestion passes against an in-memory D1 boundary. Worker
  TypeScript checking passes. No production telemetry was written by these tests.
- The final orderly suite has 49 assertions. Its native actual-room planning
  sample peaked at 18.92 ms; this does not establish a phone frame-rate budget.
- Native captures reviewed the patient chart, service panel, gallery furniture,
  shutter warning, landscape Continue and ending. Captures are under the local
  ignored `godot/.artifacts/` directory.

Private review build: **https://hellos.impala-alpha.ts.net:8444**. Local,
nginx-served and Tailscale HTTPS PCK bytes match SHA-256
`c73632befd3393bde53d872a003807495f9cb0021b47683e68fe12a0eb0f27be`.
Compressed payloads: WASM 9.59 MiB, PCK 1.33 MiB. The endpoint configuration is
empty. No public itch release or collector deployment was performed.

No automated result establishes that the whole campaign is fun. Watch people
play without knowing the solutions, especially rooms 6 and 17, then use the
report's build/device/route cohorts to decide which friction to address next.
