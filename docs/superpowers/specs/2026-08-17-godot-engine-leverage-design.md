# Leveraging Godot in rooms 8–20 — design proposals

Status: **PROPOSAL, awaiting Tom's review.** Nothing here is implemented.
Date: 2026-08-17

## Why this document exists

The Godot port of rooms 1–7 is a faithful transcription of the Three.js
build. That was correct for a migration — it made the port verifiable by
comparison. It is the wrong default for rooms 8–20, because a 1:1
transcription of a flat grey-box discards most of the reason to be in Godot
at all.

This document proposes where to deviate, and — just as importantly — where
not to.

## Ground rules

1. **Existing specs are the baseline, not a starting point to be overwritten.**
   Rooms 13, 14, 15, 16, 17, 18, 19 and 20 each have a design spec under
   `docs/superpowers/specs/`. Those record decisions the authors made. Every
   proposal below is marked `ENHANCEMENT` (additive, spec intact) or
   `CONFLICT` (contradicts a spec, needs an explicit ruling).
2. **Puzzle logic is not up for redesign here.** A room's solution, its pill
   economy and its threat pacing stay as designed. What changes is how the
   space is built and read.
3. **No new engine features beyond the six already planned.** Proposals that
   need a seventh system are listed at the end as "not now".

## What Godot actually buys — and what it does not

Be precise about this, because the honest list is shorter than it looks.

**Available:**

- Real rigid bodies and `AnimatableBody3D` — geometry that moves under
  simulation or animation, rather than being teleported.
- `AnimationPlayer` — authored motion with proper easing, on any property.
- Per-state collision layers — already used: `solid_lucid_only` (4) and
  `solid_unmed_only` (8).
- Per-level collider filtering — being added now as `Box.level_filter`.
- Positional audio — the web build already ships an audio position worklet.
- `NavigationServer3D` — pathing that can cross stairs, versus flat waypoints.

**NOT available, because the project targets `gl_compatibility` (WebGL2) for
reach:** volumetric fog, SDFGI or any global illumination, screen-space
reflections, SSAO. There are no god-rays down a stairwell. This is the same
constraint that drove the posterise render style, and it means **every
proposal below must earn its dread through geometry, sightlines, audio and
state — not lighting.**

**Also not available, by deliberate design:** jumping, falling, gravity, and
vertical collision. `core/collision.gd` is 2D in XZ with Y-infinite colliders
and that is not changing. Verticality is discrete levels plus stairwell
transitions; a "drop" is a walk into a stairwell footprint with the
interpolated height easing you down.

## The one property worth designing around

`orderly.gd` gates **both** sight and contact-catch on a conjunction:

```gdscript
not StateManager.is_lucid() and _player_level() == level
```

An orderly constructed on level `ground` can never enter `watching` or
`chasing` against, nor catch, a player on `balcony` — regardless of XZ
distance, **even standing directly beneath them.** This is a categorical
proof, not a layout guarantee, and it is cheaper and strictly stronger than
real 3D occlusion.

That single property is the most under-used thing in the codebase, and most
of what follows is built on it.

---

## Room 11 — the Treatment Corridor

Baseline: sunken lower ward plus railed mezzanine, one ramp, one orderly per
height band, two keypad-door gates, double pill spend. No spec doc.

Cost note: this room needs only **Tier 1** verticality (height zones and
ramps). That has *zero* collision impact — a raised region is never a
collider, just a height the rendered Y eases toward, with ordinary railings
keeping you on it. Cheap.

**ENHANCEMENT — the mezzanine orderly should be audible before he is
visible.** Positional audio on a patrol one storey up, heard through an open
mezzanine edge, tells the player a threat exists and cannot reach them yet.
The Three.js build could not express that. Costs one audio source placement.

**ENHANCEMENT — put the second gate's code where only the mezzanine can read
it.** A scrawl on the *upper* face of a lower-ward fixture, legible only
looking down over the railing. Turns the mezzanine from a place you traverse
into a place you must occupy. Pure geometry.

**Do NOT** convert the ramp to a discrete level transition. An earlier draft
of this plan suggested that on a mistaken belief that ramps were expensive.
They are not, and a ramp gives a continuously rising sightline that a
discrete transition cannot.

---

## Room 17 — the Gallery Ward

Baseline: `docs/superpowers/specs/2026-07-19-stacked-floors-room17-design.md`.
A railed gallery at y=3.4 over a sealed pocket at y=0 on the *same* footprint;
route is up the east stair, across, and down a hole in the decking. Three
orderlies, each pinned to a level, with a cross-level LOS gate.

This room already is the design. It exists to prove the level gate. The spec
is strong and should be followed closely.

**ENHANCEMENT — make the pocket visible from the gallery before it is
reachable.** The spec already has a hole in the decking. Widening the read so
the player can watch ORDERLY-POCKET patrol the space they are about to
descend into converts the descent from a traversal into a decision. Costs
nothing but slab geometry — and note the underside of the gallery slab is
already the pocket's ceiling for free, via ordinary opaque occlusion.

**ENHANCEMENT — audio bleed between levels.** Two of the three orderlies
share the exact XZ rect at different heights. Hearing one directly below you,
provably unable to see you, is the strongest single moment available in the
whole ward. One positional audio source.

**Carry both seam fixes from the spec as room content, not afterthoughts:**
the landing guard must sit entirely south of the level boundary with margin
(the first version straddled it and walled the balcony off permanently), and
ground-level orderlies need a stairwell-aware height lookup or they visually
sink into the stepped blocks while chasing.

---

## Room 19 — the Undercroft

Baseline: shared spec with room 18. The room is built **twice**,
`buildRoom19(power)`, selected by room 18's irreversible lever — different
geometry, different exits, different patrols per branch.

**Structural recommendation: two scenes, not one that prunes itself.**
Godot rooms are real scene files. Two scenes are independently openable in
the editor, independently screenshot-testable by `tools/shoot.gd`, and
independently verifiable by `check_rooms.gd`. A self-pruning scene is one
file whose actual contents depend on runtime state, which is precisely the
thing that makes a room hard to audit for soft-locks. The cost is duplicated
shell geometry; the benefit is that both branches are inspectable artifacts.

This needs the room registry to accept a variant, which is the same registry
change room 18 needs. Land that first, and port 18 and 19 together as a unit
with one author — `room18.ts` even imports a type from `room19.ts`.

**ENHANCEMENT — the `lights` branch's safe platform should be provably safe,
and feel it.** The spec already makes it unseeable. Under Godot it can be
*demonstrably* unseeable by putting it on its own level, upgrading the
guarantee from a layout argument to the categorical gate. Also lets the
orderly patrol directly beneath it.

---

## Room 13 — the Last Ward

Baseline: `2026-07-15-room13-lucid-danger-design.md` plus a 603-line plan.
Two full-height slabs drift inward while lucid and never retract; unmed halts
them but hands the corridor to the orderlies.

**This is a redesign, not a port, and the spec's own reasoning says so
implicitly.** The Three.js implementation carries a per-frame player
penetration clamp that exists *solely* because its `tryMove` deadlocks once
the player is inside an AABB. Godot does not behave that way. Porting the
clamp would be cargo-culting a workaround for a bug in a different engine.

**ENHANCEMENT — use `AnimatableBody3D` for the slabs.** Godot moves a body
and pushes what it contacts, with correct depenetration, instead of mutating
a collider rect and then clamping the player out of it by hand. The slabs
become the thing that pushes you, which is what the design wanted all along.
This deletes code rather than adding it.

**Flag for ruling:** if the slabs genuinely push rather than merely block,
the crush geometry changes slightly. The spec's soft-lock audit must be
re-run rather than assumed to carry over.

---

## Room 20 — the Loading Bay

Baseline: `2026-07-19-room20-pushable-blocks-design.md`. One crate: seats a
plate, then serves as mobile cover, then seats a second plate. Grid-snapped,
one interact press = one cell, with pages of anti-soft-lock reasoning.

**CONFLICT — real rigid-body physics is tempting and I recommend against
it.** Godot could make the crate a `RigidBody3D` with mass and momentum. It
would feel better to shove. It would also destroy every soft-lock guarantee
in the spec, because "can this crate reach an unrecoverable cell" stops being
a discrete, enumerable question. The spec's grid model is not a Three.js
limitation being worked around; it is what makes the room provably winnable.

**Keep the grid.** Port the discrete solver, including its destination-cell
test against state-filtered colliders *and* live orderly body circles.

**ENHANCEMENT that costs nothing:** animate the crate's one-cell slide with a
short tween rather than snapping it. Same discrete logic, same guarantees,
readable motion.

---

## Room 16 — the Breaker Bay

Baseline: `2026-07-19-room16-light-axis-design.md`. A genuine 2×2 of
{lit,dark} × {lucid,unmed}, all four cells load-bearing.

No design change proposed — the spec is unusually complete and the room is
its own argument.

**Implementation warning, recorded here because it will bite:** the light
axis collides head-on with `core/atmosphere.gd`. `_tick_flicker` writes
`light_energy` and `light_color` on **every** collected light **every frame**
from snapshots taken in `collect_lights`, which re-runs on each room load. A
switch that sets energy to zero is stomped on the next frame, lights have no
stable ids to address individually, and nothing persists across a room
reload. That needs a per-light off-state and an owner concept in Atmosphere —
it is more than a new script, and it is why this track is sequenced last.

Note also that `lightState` gates **visibility and raycast eligibility only,
never a collider**. That is what makes the room's soft-lock audit
unconditional: a dark room is geometrically identical to a lit one and can
never trap the player. Do not "optimise" that by gating colliders.

---

## Rooms 8, 9, 10, 12 — faithful ports, and that is correct

These four need no new systems and have no verticality. The design latitude
is genuinely small: they are threat-and-code rooms whose interest is patrol
geometry and pill economy, both of which port directly.

They are already in flight as faithful ports. That is not a missed
opportunity — it is the right call for rooms whose design does not depend on
anything Godot adds.

**One cheap enhancement applies to all four:** orderly footsteps as
positional audio. Rooms 8, 10 and 12 are built around tracking patrols you
cannot see, and the Three.js build could only approximate that.

---

## Rooms 14, 15, 18 — no design change proposed

- **14** is a teaching room; its clarity is the point and it should stay
  legible.
- **15**'s escalation from 2 to 5 orderlies is already its own idea, and its
  keys ride entirely on the existing state-filter visibility with no bespoke
  code.
- **18** is one irreversible choice whose consequence is invisible until room
  19. Adding anything would dilute it. Note it needs only the light-switch
  *fixture*, not the light axis — so it is cheap and unblocked early.

## Not now

- **Walkable ramps you can stand halfway up, as a general mechanic.** Rooms
  11 and 19 get them because Tier 1 supports single-valued floor height.
  Anything needing two walkable surfaces at one XZ column is Tier 2 and
  should stay confined to room 17.
- **`NavigationServer3D` for orderlies across levels.** An orderly's level is
  fixed for its lifetime and the LOS gate depends on that. Cross-level
  pathing would break the categorical guarantee. Revisit only with a spec.
- **Re-entering an earlier room from above.** Cheap and evocative, but it
  needs the room chain to become a graph rather than a line, which is a
  structural change to `check_rooms.gd`'s reachability walk.

## Open questions for Tom

1. Room 13 — accept `AnimatableBody3D` slabs that genuinely push, and re-run
   the soft-lock audit?
2. Room 19 — two scenes, as recommended?
3. Room 20 — confirm keeping the grid rather than rigid-body physics?
4. Is positional orderly audio wanted broadly, or reserved for the vertical
   rooms where it is a mechanic rather than polish?
