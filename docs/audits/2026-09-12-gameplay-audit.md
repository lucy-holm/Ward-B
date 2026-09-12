# Ward B gameplay audit — 2026-09-12

## Scope and conclusion

This is a read-only audit of the Godot build: room scenes and scripts 1–20,
both room 19 variants, `main.gd`, `StateManager`, `GameState`, `Orderly`, room
validators, and the Godot migration/authoring notes. The authored game already
has a coherent survival-puzzle spine: unmedicated perception exposes clues and
orderlies, lucid perception exposes machinery and keypads, and pills turn that
choice into a scarce resource. Rooms 13, 16, 18, and 20 extend the binary state
loop with a crush hazard, a light axis, a branch, and a physical puzzle.

The main gameplay limitation is a design gap rather than a broken rule: an
orderly follows a fixed route and, after a chase starts, only a lucid shift or
catch ends it. There is no investigation/search state, sound/noise system,
hiding affordance, or pacing director. This makes pressure readable and
testable, but predictable after routes are learned. I recommend adding these
as a small authored investigation layer rather than replacing the current
orderly movement with a new navigation system.

## Runtime and validation evidence

`godot/main.gd` registers the chain room1 through room18, resolves room19 to
the lights or doors scene from `GameState["room18.power"]`, then loads room20
and completes at `END`. `godot/tools/test_rooms1819.tscn` independently opens
and tests both variants, and the room-specific suites for rooms 11, 13, 14,
15, 16, 17, 18/19, and 20 pass.

The following checks were run against the current checkout:

| Check | Result | Meaning |
|---|---|---|
| `godot --headless --path godot tools/test_mechanics.tscn` | 26 assertions passed | State transitions, pill economy, catch/reset, and core interactions behave as ported. |
| `godot --headless --path godot tools/check_rooms.tscn` | Reports `20 room(s) checked` / `OK`, but emits `File not found` for `res://rooms/room19/room19.gd` | False-green validator: generic patrol checking skips the variant room after `load()` returns null. |
| `godot --headless --path godot tools/test_rooms1819.tscn` | Passed | Both real room19 scenes are covered despite the generic checker gap. |
| `godot --headless --path godot tools/test_room{11,13,14,15,16,17,20}.tscn` | Passed (individual suites) | Specialized geometry and soft-lock guards pass. |

The initial run exposed an actionable tooling issue in
`godot/tools/check_rooms.gd:201-204`: it constructed
`res://rooms/%s/%s.gd` from the logical id and silently returned when the
script was absent. Room19 is intentionally two scenes named `room19_lights`
and `room19_doors`, so the initial green summary did not patrol-check either
variant. The checker is now fixed in this audit: it reads the real script beside
each scene, enumerates `MAIN.ROOM_VARIANTS`, and fails when a branch cannot be
loaded. The restored checkout reports `21 room(s) checked; 2 variant path(s)
covered`; a temporary copy with `room19_doors.gd` removed failed with
`room19[doors]: could not load patrol script ...room19_doors.gd`.

## State, threat, and pacing audit

### Present and working

- `StateManager` gates shifting until the room 1 tutorial, charges a 45-second
  lucid meter, consumes one pill on unmedicated-to-lucid shifts, and makes the
  lucid-to-unmedicated return free. `GameState` clamps the inventory to one
  pill. The medication-depletion trap guard prevents dropping the player into
  an unmedicated-only collider.
- Unmedicated scrawls and clues are used in rooms 2, 5–8, 10–12, 16, and 17;
  lucid-only keypads or machinery then turn those clues into progress. Room 3
  is a deliberate reversal: lucid shows a false chained door while
  unmedicated opens the route.
- Orderlies are invisible but still active in lucid state, visible and
  threatening in unmedicated state, with line-of-sight, a 0.6-second grace
  period, contact catch, teleport/reset handling, and authored waypoint
  clearance. Counts rise from one to five. Room 17 also gates sight and catch
  by vertical level.
- The game already has varied pressure beats: split codes and backtracking
  (5–12), environmental crush walls (13), a pressure plate that an orderly can
  occupy (14), keys that add orderlies (15), a timed light/breaker axis (16), a
  binary relay branch (18/19), and a crate push puzzle with persistent gates
  (20). Room 9 is a deliberate breather and resource beat.
- Dedicated tests cover several reachable-state/soft-lock risks. Room 13
  pushes the player out and resets after a crush; room 14 defers gate closure
  around the player/orderly; room 15 preserves collected keys after a catch;
  room 20 exhaustively checks crate/gate reachability and preserves latched
  gates after a catch.

### Missing or limited

- There is no orderly investigation/search or lost-sight recovery. Chase is
  intentionally terminal until a state shift or catch, so cover and noise do
  not create alternatives once detected.
- There is no sound/noise model, explicit hiding/cover interaction, damage or
  health loop, inventory choice beyond pills, or checkpoint/save relief beat.
  Geometry occlusion and route timing carry all stealth pressure today.
- Lucid danger is established by room 13's closing walls and room 16's light
  puzzle, but ordinary lucid play still grants complete orderly immunity.
  Later rooms therefore need authored environmental surprises or a clear
  telegraph if the story intends the medicated state to become unsafe.
- Automated checks prove scene wiring and selected reachable states; they do
  not replace a full playthrough for pacing, control feel, mobile input, or
  whether a route is legible without memorising the map.
- A few room headers/tests retain port-era comments such as “rooms 8+ not
  ported yet” (room 7) even though those rooms are registered and tested. This
  is documentation drift, not a runtime defect, but it can mislead future
  authoring.

## Per-room audit

| Room | Core puzzle / variation | Pressure and state rule | Soft-lock / audit result |
|---|---|---|---|
| 1 — Cell | Tutorial cup grants shifting; lucid-only blocker and dispenser introduce the loop. | Starts unmedicated; scripted lucid tutorial is free; no orderly. | Intentional tutorial exception. Consider clarifying that the cup is a scripted state grant rather than inventory. |
| 2 — Corridor | Unmedicated scrawl → lucid keypad; staff door and first refill/pickup. | State alternation teaches clue/objective split; no orderly. | Chain and keypad/random-code wiring pass. |
| 3 — Common room | Lucid fake chains refuse the door; unmedicated reality opens it. | No enemy; reverses the expectation that lucid always solves the room. | Both state routes remain available; no soft-lock found. |
| 4 — Day room | No code; cross the room and use the lucid-only staff-door blocker. | One orderly is visible/threatening only while unmedicated and active/invisible while lucid. | Patrol clearance and room test pass. |
| 5 — Nurse station | Code split across two unmedicated scrawls; lucid keypad; central-island route. | One orderly makes lucid scouting and pill timing meaningful. | Test/chain pass; occlusion is authored by colliders. |
| 6 — West corridor | L-shaped palindrome patrol route; unmedicated clue → lucid keypad. | One orderly and an alcove dispenser support leapfrog timing. | Waypoint clearance passes, including the tightest authored leg. |
| 7 — Records room | Serpentine shelf maze; keypad is encountered before clue/dispenser, forcing backtrack. | One orderly; unmedicated clue and lucid keypad. | Its exit is registered to room8; stale “not ported” header should be corrected. |
| 8 — East ward | Split clue and keypad around a central island. | Two orderlies create overlapping patrol phases. | Dedicated room checks pass; no dynamic search after sight. |
| 9 — Doctor's office | Coat/bottle pickup gates the keypad; clue and dispenser make a resource breather. | No orderly; low-pressure reset between multi-enemy rooms. | Test/chain pass. |
| 10 — Wing | Four-chamber run, split clue/keypad, two unmedicated-only gates, three dispensers. | Two orderlies and multiple refill points support planned pill spending. | Route and patrol checks pass; state-gate trap handling is covered. |
| 11 — Treatment corridor | Mezzanine/ramp and rail-separated upper/lower route; clue/keypad loop. | Two orderlies; same level identity but rail/height occlusion and two state gates. | `test_room11` passes rail separation and route checks. |
| 12 — Asylum floor | Large five-chamber space; split clue 22m apart and state gates. | Three orderlies; forced unmedicated entry and interior refill; catch rerolls code/spawn. | Generic chain/scene checks pass; large space needs playtest for navigation load. |
| 13 — Last ward | No item or code; lucid-only inward slabs crush/reset the player. | Two orderlies; lucid is environmentally dangerous while unmedicated is enemy-dangerous. | `test_room13` passes crush reset and escape reachability. Strongest existing medicated-threat beat. |
| 14 — Hold | Pressure plate holds the gate; player or orderly can occupy it. | One orderly can accidentally/strategically hold the plate; lucid offers a timing route. | Deferred close protects player/orderly; `test_room14` passes. |
| 15 — Sorting room | Three unmedicated-only shape keys open a shape lock. | Starts with two orderlies; each key adds another, reaching five; no dispenser. | Catch preserves collected keys and resets spawn; `test_room15` passes. |
| 16 — Breaker bay | Four-state matrix: lit/dark × lucid/unmedicated; charge breaker during an 18s window. | One orderly; dark/lit and state switch clue visibility; charge window fades up to 26s. Dark is time pressure, not a direct damage hazard. | `test_room16` passes charge/switch paths and safe transitions. |
| 17 — Gallery ward | Two-level gallery with east stair/west shaft; lucid keypad and unmedicated clue. | Three orderlies; level gate prevents cross-level sight/catch; forced unmedicated entry. | `test_room17` passes vertical separation and route checks. |
| 18 — Relay room | Choose irreversible power-to-LIGHTS or power-to-DOORS lever. | One orderly; choice persists as `room18.power` and selects room19 variant. | `test_rooms1819` passes branch persistence and exit. |
| 19A — Undercroft/lights | Long floor route with east ramp/platform and two exposure crossings. | One floor orderly; platform is a tested breather; dispenser and catch reset. | `test_rooms1819` validates variant geometry and platform visibility. |
| 19B — Undercroft/doors | Short dark corridor with a near-continuous patrol and little cover. | One orderly; vestibule dispenser is the main relief. | `test_rooms1819` and the fixed generic checker validate the branch and catch reset. |
| 20 — Loading bay | Grid-snapped crate must hold plate 1 then plate 2; one-way gates latch. | Two orderlies; crate is moving cover and does not block their authored movement. | Exhaustive reachable-state/soft-lock test passes; catch resets crate while gates persist. |

## Priorities and proposed mechanics

These are proposals, not changes made by this audit. They are deliberately
small extensions of the existing rules and should each get a focused headless
test before implementation.

1. **P1 — Authored noise/investigation pings.** Add a lightweight room signal
   for a failed keypad attempt, crate push, plate release, or breaker throw.
   The nearby orderly temporarily walks toward that authored target, then
   returns to its route if it finds no player. Use cooldowns and existing
   waypoint targets; do not require a new navmesh or teleporting. This gives
   the player a reason to choose when and where to solve a puzzle while
   preserving the current chase and lucid escape. Test target selection,
   timeout, vertical-level rules, and catch/reset.
2. **P2 — Telegraphic lucid reversals in later rooms.** Add one or two authored
   environmental events after room 13 (a temporary corridor closure, false
   route, or moving wall) that occur only after a clear lucid cue and always
   leave a recoverable route. Reuse the room 13 trap-guard pattern and test
   both states at meter expiry. This makes the story's “medicated is not always
   safe” turn legible without making the entire lucid state unreliable.
3. **P3 — Relief/checkpoint nodes.** Mark a small number of existing breather
   spaces (room 9, room 14's hold, room 19A's platform) as one-use checkpoint
   interactions. On catch, restore the last checkpoint and preserve completed
   irreversible puzzle steps. A checkpoint creates the sawtooth rhythm needed
   for a 20-room campaign and makes exploration meaningful without adding
   combat. Use browser-safe persistence and test reload, branch selection, and
   catch from every checkpointed state.
