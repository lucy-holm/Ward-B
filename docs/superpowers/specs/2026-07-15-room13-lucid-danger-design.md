# Room 13 — "the Last Ward": lucid isn't safe either

Status: approved by Tom (layout sketch confirmed), ready for implementation planning.
Origin: playtest 8 feedback — "i would actually like to see the lucid world not be
completely safe either so it puts you into a event where you have to pick the
lesser of the two evils."

## Why this is its own room, not a global rule change

`orderly.ts` documents "Lucid is always safe" as a hard invariant, and every
room's soft-lock/timer-audit reasoning (rooms 10, 11, 12 especially) leans on
"shift lucid to escape" as the universal panic button. Breaking that globally
would require re-auditing every existing room. Instead this is one quarantined
epilogue room, after room 12 and before END, where — for this room only — a
new hazard exists that is dangerous specifically while lucid. Every other
room's invariant is untouched.

## Placement in the game

A new room 13, "the Last Ward", inserted between room 12's exit and `END`.
Room 12's `exits` entry currently points `{ to: 'END', ... }` — that becomes
`{ to: 'room13', ... }`, and room13's own exit points to `END`.

## The dilemma

Two threats exist in the same corridor, mutually exclusive by the player's
current `WardState`:

- **Unmed**: an ordinary `Orderly` patrols the corridor — existing mechanic,
  unchanged. Active/visible/can-chase only while the player is unmed, exactly
  like every other room.
- **Lucid**: the corridor itself narrows in real time. Not a new character —
  an environmental hazard, so the "lucid is always safe" invariant is broken
  by geometry, not by inventing a second creature that could be confused with
  the orderly or read as "orderlies work differently now."

Shifting is the only tool, and shifting is not a full escape — it trades one
danger for the other. Unmed→lucid still costs a pill (existing rule); lucid→
unmed is still free (existing rule). The player must actively alternate,
under time pressure, rather than pick one state and coast.

## Room layout

Three zones, spawn to exit, no gates (open doorways throughout — this room's
tension comes from the corridor itself, not from unmed-sealed chokepoints
like rooms 10-12):

- **Z1 — entry hall.** Spawn, safe. **Deliberately no dispenser** — see
  "Pill economy" below.
- **Z2 — the last corridor.** ~40m long, ~6m wide (x roughly [-3, 3]). One
  `Orderly` patrols its full length. The closing-walls hazard lives here.
- **Z3 — exit vestibule.** Safe, no lock, no keypad, no code. Reaching it
  exits to `END`. This room has no puzzle content — the challenge is the
  crossing itself, not knowledge.

## The closing-walls hazard

Two invisible collision planes (east/west inner wall faces) with matching
visible slabs, initialized at the corridor's full width. Both are **room-
owned, per-frame-updated objects** — the same architectural pattern as
`Orderly` (an entity added directly via `ctx.scene`, updated every frame from
the room script's `update(dt, t, ctx)`), not static `RoomDef.blocks`/
`colliders`, because `World.loadRoom` bakes `blocks` into static meshes once
at load time — mutating a `BlockDef` afterward does not move the mesh. (Static
`ColliderDef` objects *are* safely mutable at runtime — room 3's `doorCollider`
already relies on this, and `World.colliders` holds the same object references
as the room's, not deep copies — so the collision side of this can reuse that
existing trick. The *visual* slabs still need their own managed
`THREE.Mesh` pair, updated in lockstep with the collider bounds each frame.)

Behavior:

- While the player is **lucid**, both wall faces drift inward at a steady
  rate (suggested default ~0.4 m/s per side; tune during implementation/
  playtest).
- While the player is **unmed**, the walls **hold at their current width** —
  they do not retract. This is the approved "cumulative" model: every lucid
  dip costs real estate that persists for the rest of the attempt.
- If the gap between the walls shrinks below a minimum survivable width
  (player diameter + a small buffer) while the player is still lucid, that's
  a **crush**: same shape as the orderly's catch (`forceState`, `shiftFx`,
  toast, teleport), except it forces **unmed** (not lucid) and teleports the
  player back to Z2's entrance. Pills are kept, matching the orderly-catch
  convention used everywhere else.
- Any reset — crushed by walls, or caught by the orderly — restarts the
  **whole attempt**: teleport to Z2's entrance and reset the corridor to full
  width. "Cumulative per attempt" means per continuous run, not permanent
  across retries.
- The existing medication timer (lucidity auto-reverts after ~45s) still
  runs unmodified. In practice the walls will force a decision long before
  45s, so the timer is a redundant backstop here, not the primary pressure —
  no special-case interaction needed.

## The orderly

Reuses the existing `Orderly` class unmodified — no new enemy type. Its
patrol must be authored so the corridor stays completable at every pill
count the player could plausibly arrive with (0, 1, or 2 — there is no
dispenser in this room to top up):

- **0 pills**: the player can never shift lucid, so the walls never trigger.
  This is a pure orderly-evasion run for the full 40m — must be genuinely
  possible via patrol gaps/occluders/timing, same fairness bar every other
  orderly room already holds itself to (provably-passable, not "usually
  fine").
- **1 pill**: one lucid window to slip past the orderly's position/cone,
  then the rest of the corridor unmed.
- **2 pills**: the most slack, but still must be spent somewhere — the
  corridor should not be trivially walkable lucid start-to-finish (that
  would just recreate the old "shift once and coast" problem this room
  exists to fix).

## Pill economy: no entry dispenser

Confirmed decision: room 13 gives the player nothing. Whatever pills they
carry out of room 12 are what they cross with. This is the direct payoff for
the game's whole pill economy — hoarding through rooms 10-12 makes this
crossing easier; spending freely (as in the playtest run that ended 2/2 and
never felt like a budget) means arriving here with a fuller reserve than a
careful player would, which is fine — the room's difficulty should hold up
across the full 0-2 range, not assume a specific count.

## Explicitly out of scope

- No new interactables (no keypad, no dispenser, no code, no pill pickup).
- No changes to `Orderly`'s sight/chase/catch logic itself (separate bug —
  see the concurrent contact-catch fix).
- No change to the "lucid is always safe" invariant text/behavior in any
  other room.
- No wall-retraction/forgiveness mechanic (explicitly rejected in favor of
  cumulative narrowing).

## Open implementation questions (for the planning phase, not blocking approval)

- Exact tuning constants (closing speed, minimum survivable width, corridor
  starting width/length) — defaults suggested above, finalized by playtest.
- Visual treatment of the closing walls (matching the ward's existing
  grey-box/procedural-texture style) and any audio cue as the gap narrows
  (the medication-meter "warn" pulse is the closest existing precedent).
- Toast/narrative copy for entry, crush, and the standing objective text —
  should match the game's established second-person, lowercase, ominous
  voice (see any existing room's `hud.toast`/`setObjective` calls for tone),
  but exact lines are a writing pass, not a design blocker.
