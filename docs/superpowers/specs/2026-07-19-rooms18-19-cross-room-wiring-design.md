# Rooms 18–19 — "the Relay Room" / "the Undercroft": cross-room wiring

**Date:** 2026-07-19
**Status:** design draft, not implemented — for Tom's review before `adding-a-room` work starts.
**Placement:** post-epilogue wing, `14 pressure-plates → 15 shape-keys → 16 light-axis
→ 17 stacked floors → 18+19 (this doc) → 20 pushable blocks (capstone)`.

---

## 1. Player-experience summary

Room 18 is a small, single-orderly room whose entire payload is one
mechanical choice: a two-position power relay, wired (per the scrawls) to
feed either the ward's **lights** or its **doors**, never both. The choice
is legible in advance — you can read what it does before you touch it — and
it is physically irreversible the instant you throw it: the plate you
didn't choose gets pulled off the wall.

Room 19 is built twice, and the player only ever sees one build of it,
selected by whatever they threw back in 18. Choose **doors** and you get a
short, unlit, close-quarters corridor with the orderly patrolling the only
lane there is — a shortcut that also happens to be the one place in the
pair with a real lucid-gated lock. Choose **lights** and you get a longer
route up onto a lit mezzanine, a safe breather above the floor, and two
separate ground-level crossings bracketing it. Both are solvable. Neither
is "the correct answer" — the room never tells you which was smarter, and
it can't, because there isn't one; it's a trade, not a test.

This is the first room in the game where an action's consequence isn't
visible until the *next* room, and where nothing lets you undo it. That's
the whole point of the pair: it teaches the player that the ward remembers
what they did, in a game that has never once let them go back and check.

---

## 2. Engine additions

### 2.1 Persistent flag store — `src/game/flags.ts` (new file)

A minimal, typed key/value store, written by one room's script and read by
another's, that survives room transitions. Deliberately its own module, not
a field bolted onto `StateSystem` — `state.ts`'s own header draws the line
that governs this decision: `StateSystem` is specifically the lucid/unmed
state machine + pill economy, nothing else, the same reasoning
`settings.ts`'s header gives for why *it* isn't part of `state.ts` either
("per-playthrough, not persisted"). A generic room-flag bag is a third,
separate concern from both, so it gets a third file.

```ts
// src/game/flags.ts
export type FlagValue = string | number | boolean;

// The narrow surface a RoomScript gets, via GameCtx.flags. No reset() here
// on purpose — matches GameCtx's existing philosophy ("scripts drive
// tutorial beats, they don't reach into the engine"); resetting the whole
// store is main.ts's job, not a room's.
export interface Flags {
  get<T extends FlagValue = FlagValue>(key: string): T | undefined;
  set(key: string, value: FlagValue): void;
  has(key: string): boolean;
}

export class FlagStore implements Flags {
  private readonly map = new Map<string, FlagValue>();
  get<T extends FlagValue = FlagValue>(key: string): T | undefined {
    return this.map.get(key) as T | undefined;
  }
  set(key: string, value: FlagValue): void {
    this.map.set(key, value);
  }
  has(key: string): boolean {
    return this.map.has(key);
  }
  // Not called by any current game flow (see "reset story" below) — kept
  // for symmetry / a future debug "restart wing" cheat.
  reset(): void {
    this.map.clear();
  }
}
```

Key naming convention (not enforced by the engine, just a house style):
`'<room-id>.<name>'`, e.g. `'room18.power'` — namespacing by the writer's
room id avoids collisions without needing a registry.

### 2.2 `GameCtx` — one new field (`src/game/context.ts`)

```ts
// Cross-room persistent flags (game/flags.ts). Written by one room's
// script, read by another's build/onEnter/isAvailable. Per-playthrough
// only: never persisted to localStorage (unlike game/settings.ts), never
// cleared by an orderly catch — the same lifetime as StateSystem, i.e. a
// full page reload is the only reset.
flags: Flags;
```

`main.ts` constructs one `FlagStore` alongside `state = new StateSystem()`
and puts it on `ctx.flags`.

### 2.3 Reset story

There is currently **no mid-playthrough restart** in this game — confirmed
by reading `main.ts` end to end: an orderly catch (`onCaught`) only
force-shifts state, plays a toast, and teleports the player to the current
room's spawn; it never re-runs `onEnter` or reconstructs any module-level
state. The only full reset is `endOfBuild()`'s READMIT button, which calls
`location.reload()` — a real page reload, which throws away every
module-level singleton (`state`, `world`, and now `flagStore`) and starts
over from a blank slate. So the flag store's reset story is exactly
`StateSystem`'s: **construct once per page load, mutate for the life of
the playthrough, discard on reload.** No explicit reset wiring is needed
anywhere in the frame loop or the catch handler.

Consequence for rooms 18/19 specifically: if the player is caught in room
18 *after* throwing the lever, they respawn at room 18's spawn with the
flag still set and the chosen lever's mesh still in its "thrown" pose
(closures don't reset on a catch — this is the same reason room7's
`doorUnlocked` survives a catch). Nothing needs to re-litigate the choice;
the room just looks like a room where you already decided.

Interaction with the randomize-codes setting (`src/game/settings.ts`):
none. That flag is a persisted, player-facing difficulty toggle for
*numeric keypad codes*; the relay's two levers are not a code (no digits,
nothing to memorize), so `isRandomizeCodesEnabled()`/`regenerateCode()`
simply isn't part of this room's wiring. Noted so nobody goes looking for
it later.

### 2.4 Flag-driven geometry — the `RoomDef | build fn` room-registry entry

The hard problem this design has to solve: every `RoomDef` today is a
static object built once at module import time (`export const room7: RoomDef
= {...}`), and `World.loadRoom(def)` just reads it and bakes fresh meshes —
there is no flag to read yet when that object literal is constructed. To
let room 19's geometry depend on a choice made *in room 18, at runtime*,
room 19 exports a **factory function** instead of a static object:

```ts
// src/rooms/room19.ts
export type PowerRoute = 'lights' | 'doors';

export function buildRoom19(power: PowerRoute = 'lights'): RoomDef {
  // ...branches into two RoomBuilder passes, see §4.2
}
```

(Default arg `'lights'` is the fail-safe branch — see §4.2's rationale.)

`main.ts`'s room registry grows a second variant:

```ts
type RoomEntry =
  | { def: RoomDef; script: AnyRoomScript }
  | { build: (flags: Flags) => RoomDef; script: AnyRoomScript };

const rooms: Record<string, RoomEntry> = {
  // ...unchanged rooms 1-18...
  room19: {
    build: (flags) => buildRoom19(flags.get<PowerRoute>('room18.power') ?? 'lights'),
    script: room19Script,
  },
};

function resolveDef(entry: RoomEntry): RoomDef {
  return 'build' in entry ? entry.build(ctx.flags) : entry.def;
}

function loadRoom(id: string): void {
  const entry = rooms[id];
  const def = resolveDef(entry);
  current = { def, script: entry.script };
  world.loadRoom(def);
  // ...unchanged from here down
}
```

Everything downstream of `loadRoom` (`current.def.exits`, `current.def.
spawn`, `checkExits`, etc.) is unaffected — `current` still always holds a
concrete, resolved `RoomDef`. The resolution happens exactly once, at the
moment `enterRoom('room19')` fires from room 18's exit trigger — which,
because rooms are one-way (hard law 3), is the *only* moment room 19 is
ever entered, so "read the flag at build time" and "read the flag once,
ever, per playthrough" are the same statement here. Room 19's own script
can also read `ctx.flags` directly inside `onEnter`/`isAvailable` if it
ever needs to vary a toast or objective string, not just geometry — same
field, no new API.

This is the general mechanism the task asks for: **"where a room's
build/onEnter reads flags to vary its geometry or interactables."** Any
future room can opt into it by exporting a `build*(flags)` function instead
of a bare `RoomDef`; every room that doesn't need it keeps its current
static export, zero migration required.

### 2.5 Devtool/build-script touch points (files touched, not authored here)

Two dev-only files key rooms by a plain `Record<string, () => Promise<...>>`
and expect `m[id]` to already be a `RoomDef`:

- `src/devtools/map.ts` (`loadRoom`) — `const def = m[id] as RoomDef`. For
  a factory-exported room this needs a small branch: if `m[id]` isn't
  present but `m['build' + PascalCase(id)]` is a function, call it with a
  default flag value (`'lights'`) so the viewer still renders *something*.
  A `?flag=doors` query param to preview the other branch is a natural
  follow-on — left as an open question (§8) since it's viewer UX, not
  gameplay.
- `npm run check:rooms` (referenced in `adding-a-room` skill; script not
  read in detail for this doc) — imports every room module and validates
  ids/exits/patrols. It will need the same "call the factory with a default
  if this is a `build*` export" branch so room 19 gets validated at all.

Both are mechanical, small additions; flagged here so the implementer
doesn't discover them mid-`check:rooms`-failure.

### 2.6 New `InteractableType`? — recommend reuse, not a new type

The relay's two levers don't strictly need a new `MatName`/`InteractableType`.
`Interaction.interact()` only auto-handles `'dispenser'` and `'pill_pickup'`
generically (confirmed in `src/game/interaction.ts`); every other type
(`'pill_cup' | 'keypad' | 'door'`) falls through to the room script's own
`onInteract`, which is where the actual behavior lives regardless of the
mesh. So the levers can ship as `type: 'keypad'` (reusing `buildKeypad`'s
wall-panel mesh, `mat: 'pad'`) with bespoke `onInteract` that never opens
the numeric overlay — it just reads the id and commits. Zero `world.ts`
mesh-builder changes required. A distinct "big physical switch" mesh would
read better than a keypad-panel skin, but that's a visual-polish follow-up,
not a blocker — noted in open questions.

---

## 3. Room 18 — "the Relay Room"

Footprint `x:[-6,6] z:[-7,5]` (same scale as room7's shell). Spawn `(0, 4,
yaw 0)`, facing north into the room.

```
z= 5 ─────────────────────────────  south cap (behind spawn)
z= 4   ·SPAWN·         [disp18]      Z1 entry hall — safe, no patrol reach
z= 2 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   belt zone starts
z= 1        (belt leg)               Z2 the relay hall — orderly belt,
z=-2        (belt leg)                 rectangular loop ~x[-4,4] z[-2,1]
z=-3 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   belt zone ends
z=-5      [leverLights][leverDoors]  Z3 the choice nook — occluder-
                                        protected alcove, north wall
z=-6.9 ─── exit gap x[-1,1] ──────   one-way exit → room19, no lock
   x=-6                        x=6
```

- **Z1 — entry hall**, `z∈[2,5]`. `dispenser18` mounted in a shallow
  west-wall pocket near spawn (`x≈-6, z≈4`), behind a short stub wall
  (`wallX` segment `x[-6,-3.5] z≈2.3`) that occludes it from the belt zone
  — same trick as room7's `dispenser7` (occlusion, not raw distance; the
  room is too small at this scale to hit the 8.2m reaction-time distance
  and still fit the belt in it, exactly the situation room7's own header
  calls out).
- **Z2 — the relay hall**, `z∈[-2,1]`. One `Orderly`, belt-style rectangular
  patrol, approximate waypoints `{(-4,1),(4,1),(4,-2),(-4,-2)}` (final
  numbers pinned by `patrol()`'s clearance validator at implementation
  time — it throws at import if any leg wedges him, so this is
  self-checking). A low center console (`solid` collider, `x[-1,1]
  z[-0.5,0.5]`) gives one piece of cover to duck behind mid-crossing,
  echoing the "island as occluder" beat.
- **Z3 — the choice nook**, `z∈[-6,-3]`, carved into the north wall.
  `leverLights` (`x≈-0.8`) and `leverDoors` (`x≈0.8`) mounted side by side
  on the alcove's north face. The alcove's own side walls are passed to
  the `Orderly` as occluders (room7/room10's "provably unseeable" trick) —
  no sightline from any belt waypoint or leg into the alcove interior can
  exist, regardless of the ~3–4m raw distance, which is well under the
  8.2m guideline on its own.
- **Exit** — open doorway, `x[-1,1] z[-7,-6.9]`, straight north from the
  nook. No lock, no code: the choice already gates the room; a second lock
  here would just be redundant friction.

### 3.1 The relay — mechanics

Two `InteractableDef`s (`type: 'keypad'` visual, see §2.6), `leverLights`
and `leverDoors`, both available from room entry. Interacting with either
while **unmed** refuses (toast, no state change) — the factory-stamped
label under the switch is only legible lucid, same convention as every
keypad in the game. Interacting while **lucid**:

1. Sets `ctx.flags.set('room18.power', 'lights' | 'doors')`.
2. `ctx.removeInteractable(<the other lever's id>)` — permanently, for this
   visit (matches `GameCtx.removeInteractable`'s existing "swallowed pill
   cup" precedent).
3. `ctx.moveInteractable(<chosen id>, <thrown pose>)` — a small visual
   commit (handle rotates into its slot).
4. Toast + `hud.setObjective(...)`, telemetry event `wing_power_set` with
   the chosen value.

Both levers being simultaneously "available" until the exact frame one is
chosen, and one vanishing forever the instant the other is picked, is the
mechanical expression of "it only moves once." There's no confirm dialog —
the throw *is* the confirm, which is the point.

### 3.2 Pill economy inside room 18

The room has exactly one lucid-gated action (the relay) and nothing else
that costs a pill. `dispenser18` is reachable **unmed**, before the belt
zone, before the relay is even in view — so a player entering with 0
pills (the worst case; hard law 1) always has exactly one pill in hand by
the time they reach Z3. Getting caught anywhere in Z2 (the only place the
orderly can reach) is the sanctioned fallback: forced lucid + teleport to
spawn, pills kept — never a strand, and — bonus — a caught player is now
*lucid* for free, so if they hadn't taken their pill yet they can walk
straight back to Z1's dispenser, refill, and go again with a full pill in
hand exactly where they started.

---

## 4. Room 19 — "the Undercroft"

Footprint `x:[-7,7] z:[-8,4]`. Spawn `(0, 3.2, yaw π)`, facing north.
Shared across both branches:

- **Z1 — vestibule**, `z∈[1,4]`. Safe, `dispenser19` on the west wall near
  spawn (`x≈-6.5, z≈2.7`), reachable unmed immediately.
- **Exit**, north end (`z≈-8`), open one-way to room20.

Everything between the vestibule and the exit is built differently
depending on `flags.get('room18.power')`.

### 4.1 Branch: `'doors'` — the short, dark way

```
   x=-7        x=-6  x=-3                      x=7
z= 1  ───────────┐                                    vestibule / dispenser19
z= 0            [gap]───────────────────────────      "doors" archway open
z=-1        (orderly belt, full corridor length)      3m-wide unlit corridor
z=-6        (orderly belt continues)
z=-8  ─── exit ──                east half sealed — never wired (scrawl)
```

- A 3m-wide corridor, `x∈[-6,-3]`, running the corridor's full length
  `z∈[-8,0]`, entered through a gap in a short dividing wall at `z=0`.
- **Lighting**: sparse — one dim `LightDef` near the vestibule, none in
  the corridor itself. (Confirmed non-blinding: the renderer keeps a base
  ambient light regardless of per-room `LightDef` point lights, so this
  is a mood/legibility difficulty lever, not a literal blackout — the
  player can still navigate, just with far less warning of the orderly at
  range.)
- **Orderly**: one, patrolling a slim rectangle spanning nearly the whole
  corridor (approx `{(-4.5,-1),(-4.5,-6.5),(-3.5,-6.5),(-3.5,-1)}`) — he
  effectively *is* the corridor. No wall segment or console gives cover;
  the player reads his position and times a pass, the same skill every
  hallway orderly room already teaches, just compressed into a shorter,
  dimmer space.
- East half of the room (`x>-3`) is simply never built in this branch —
  a solid wall stands where the mezzanine's ramp would be, with a scrawl
  reading `wrong wiring for this door. it never opens.`
- **No lucid gate** in this branch. Crossing the corridor unmed is always
  possible (hard law 2: unmed is safe from geometry, only ever threatened
  by the orderly) — the "shortcut" is shorter in distance and time-under-
  threat, not gated behind an extra pill spend. (An earlier pass of this
  design considered stacking an unmed-sealed mid-corridor gate here to
  make Doors "cost a pill too" — cut: it would force a second lucid
  decision inside a wing whose whole teaching point is *one* pill, *one*
  irreversible choice, and diluting that with an unrelated gate blurs the
  lesson instead of sharpening it.)

### 4.2 Branch: `'lights'` — the long, lit way

```
z= 1   vestibule / dispenser19
z= 0   ─── east archway open ──────────────────
z= 0..-6   lower floor (y=0), orderly patrols the full perimeter
             ramp x[1,3] z[-6,0], y 0→0.9
z=-6..-0  platform x[3,7] z[-6,0], y=0.9 — SAFE, no orderly reach (occluded
             by floor-height the same way room11's mezzanine is: his patrol
             footprint never comes within sight range of the platform)
             second ramp/stair back down near the NW corner, z≈-6
z=-8   exit, after one more short lower-floor crossing near the corner
```

Sealed: the `x∈[-6,-3]` corridor from the Doors branch. Where its gap
would be, a scrawl reads: `no door here. they fed the bulbs instead.`

- Route: vestibule → east archway (`z=0`) → across the lower floor
  (`y=0`) to the ramp (`x[1,3] z[-6,0]`, `axis:'x'`, `yLow:0, yHigh:0.9`,
  same `HeightZone`/`RampDef` vocabulary room11 introduced) → up onto the
  platform (`heightZone x[3,7] z[-6,0] y:0.9`) → north along the rail to a
  second short ramp back down near the exit corner → the room20 door.
  Total travel ≈20m, roughly double the Doors branch.
- **Lighting**: generous — 5–6 `LightDef`s along the whole route,
  including the platform. This is the visibly safer branch.
- **Orderly**: one, patrolling the lower floor's perimeter only, with the
  same "his patrol footprint never has a waypoint or leg within sight
  range of the platform" guarantee room11 documents for its own mezzanine
  — the platform is a genuine **safe breather** (room9's beat) between two
  ground-level crossings: one from the vestibule to the ramp's foot, one
  from the second ramp's foot to the exit.
- **No lucid gate** here either, for the same reason as §4.1 — crossing
  the lower floor unmed is always possible, dodging the orderly the usual
  way; the branch's cost is time and exposure-count (two crossings
  instead of one), not an extra pill.

### 4.3 Why the asymmetry is fair, not lopsided

Doors trades a shorter, tenser, single dark crossing for none of the
comfort of a breather; Lights trades a longer route and two separate
exposure windows for full visibility and a safe midpoint. Neither is
strictly "harder" in pill terms (both cost zero pills to physically
cross) — the difference is entirely in *how much time you spend in the
orderly's reach and how well you can see him coming*, which is a real,
legible trade a player can reason about from room 18's scrawls before
ever committing.

### 4.4 Reaction-time audit, room 19

- Doors branch: no scrawl/dispenser stand-and-read spot exists inside the
  hazard corridor itself (the only fixture there is the corridor's far
  exit); `dispenser19` sits in the vestibule, outside the corridor
  entirely — no orderly waypoint reaches `z>0`. Pass by zone separation,
  not by the 8.2m raw-distance rule (same category as room18's dispenser).
- Lights branch: the platform is the only "stand and look around" spot,
  and it's occluder/zone-protected exactly like room11's mezzanine — pass
  by the same "provably unseeable" argument, not raw distance.
- Both branches: `patrol()`'s clearance validator (already required by
  house style — see `adding-a-room` skill step 2) is the actual gate at
  implementation time; any leg that wedges the orderly against new
  geometry throws at import, before playtest ever sees it.

---

## 5. Wiring diagram, in words

> Throwing **leverLights** in room 18 sets `room18.power = 'lights'`. On
> entering room 19, `buildRoom19('lights')` seals the west corridor,
> builds the east ramp+platform+ramp route, and swaps in the bright
> `LightDef` list. Throwing **leverDoors** instead sets `room18.power =
> 'doors'`; `buildRoom19('doors')` seals the east half, opens the west
> corridor for its full length, and swaps in the sparse `LightDef` list.
> If room 19 is somehow entered with the flag unset (shouldn't happen in
> the shipped linear game; can happen from the map viewer or a future
> non-linear entry point), `buildRoom19` defaults to `'lights'` — the
> longer, safer branch, so any edge case degrades toward safety, not risk.

---

## 6. Intended-solve walkthrough — pill economy across the pair

Assume worst case: player arrives at room 18 with **0 pills** (hard law 1's
baseline).

1. Enter room 18. Walk to `dispenser18` (Z1, unmed, no patrol exposure) →
   **1 pill**.
2. Cross the belt (Z2) unmed, timing the orderly's loop — no pill cost;
   worst case, get spotted/caught → forced lucid, teleport to spawn, pill
   *kept* (never spent yet) → walk back to the dispenser if it somehow got
   spent some other way (it can't, in this design; this is a belt-and-
   braces note, not a real path). Reach Z3.
3. Read both plates unmed (refused — toast only, no cost) to know a choice
   exists; shift lucid (**spends the 1 pill → 0 pills**) to actually read
   which plate is which and throw one. `medication` starts a fresh 45s
   count from this shift.
4. Walk from the nook to room 18's exit (short, outside the belt zone) —
   no further pill cost. If the 45s timer lapses here, `state.
   forceState('unmed')` fires automatically (assuming the spot isn't a
   geometry trap — it isn't; open corridor, no unmed-sealed collider) and
   the player continues unmed, which is fine: nothing past this point in
   room 18 requires lucid again.
5. Cross into room 19 — **0 pills**, either ward state depending on how
   long step 4 took. `buildRoom19(flags.get('room18.power'))` resolves the
   branch.
6. Walk to `dispenser19` (Z1, unmed, no patrol reach) → **1 pill** —
   pure insurance/top-off for whatever room 20 (capstone) demands; neither
   room19 branch requires spending it.
7. Cross the chosen branch (Doors: one dark corridor crossing; Lights: two
   lit crossings bracketing a safe platform) — no pill cost either way,
   dodging the orderly on skill alone, catch-rescue as the universal
   backstop.
8. Exit to room 20 with **1 pill** in hand (assuming step 6's refill was
   taken) — same or better pill count than most rooms hand off to their
   successor.

Total pills consumed across the whole pair: **exactly one**, spent once,
on the one irreversible action. Everything else is either free (unmed
crossings) or a refill (steps 1 and 6).

---

## 7. Soft-lock audit

| Spot | Risk | Verdict |
|---|---|---|
| Room 18 Z1→Z2 | 0-pill unmed player must reach the belt | Z1 has no unmed-sealed geometry; belt only threatens via the orderly, not geometry. Pass. |
| Room 18 relay (Z3) | Lucid-gated action, must have a pill in hand | `dispenser18` reachable unmed before Z2 even starts. Pass. |
| Room 18 catch, pre-throw | Teleport to spawn, pill kept (never spent) | No stranding possible — flag unset, dispenser untouched, retry identical to a fresh entry. Pass. |
| Room 18 catch, post-throw | Teleport to spawn, flag stays set, lever visual stays "thrown" | Closures don't reset on catch (same as room7's `doorUnlocked`); nothing to re-litigate. Pass. |
| Room 18→19 transition, mid-lucid | Medication ticks continuously; auto-revert could land anywhere | `updateMedication`'s trapped-check (`circleHitsSolidUnmed`) is generic and room-agnostic; neither room 18's exit corridor nor room 19's vestibule has an unmed-sealed collider near the seam. Pass. |
| Room 19 vestibule | 0-pill unmed player must be able to refill | `dispenser19` reachable unmed immediately on entry, before either branch's hazard geometry starts. Pass. |
| Room 19, either branch | Any hidden requirement to be lucid to physically cross | Confirmed neither branch places an unmed-sealed (`states:'unmed'`) collider anywhere; crossing is always orderly-dodge-only, catch-rescue as backstop. Pass. |
| Room 19 → 20 | Handoff pill count | 1 pill typical (step 6 of §6), never worse than 0 with a reachable dispenser one room prior. Room 20's own audit is out of scope here. |

No backward-direction audit applies — this design is strictly forward
(§9 explains why the loop shape was not chosen), so there is no second
transition direction to check.

---

## 8. Open questions for Tom

1. **Map-viewer UX for flag-driven rooms.** `map.ts`'s `loadRoom` needs a
   default-flag fallback (§2.5) at minimum. Worth a `?flag=doors` query
   param / a dropdown to preview both branches side by side, or is a
   single default-branch preview enough for now?
2. **Lever visual.** Reusing the keypad mesh (§2.6) ships fastest with
   zero `world.ts` changes. Worth a dedicated "big double-throw switch"
   mesh instead, given it's the one truly irreversible fixture in the
   game so far?
3. **Telemetry on the choice.** Recommend a `wing_power_set` event (§3.1)
   so playtest logs can show the lights/doors split — worth also logging
   which branch's orderly caught the player, to see if one branch reads
   as meaningfully harder in practice despite the equal pill cost?
4. **Room 20 continuity.** Should the capstone read `room18.power` at all
   (e.g. a cosmetic detail — a light left on/off in the distance) for
   thematic follow-through, or is that scope creep on a capstone room
   that has its own, unrelated mechanic to teach?
5. **Naming.** "the Relay Room" / "the Undercroft" fit the ward's existing
   naming voice (the Records Room, the Treatment Corridor, the Last Ward)
   but haven't been run past you — flag if either reads wrong.
6. **Is one lever-throw enough content for room 18?** As designed, room
   18's entire puzzle is "cross a belt, throw a switch." That's
   deliberately lean (the payoff is room 19), matching the "teach" rooms'
   pacing rather than a spike — confirm that's the intent for this slot,
   given 17 was itself a spike (stacked floors) and 20 is the capstone.

---

## 9. The road not taken: a sanctioned two-room loop

The alternative shape the brief asked to weigh: room 19 has a locked
forward door (to room 20) and an *open doorway back* to room 18 — the
wing's one deliberate exception to hard law 3. The puzzle becomes a
shuttle: see what room 19's lock actually wants (a symbol, a wire color,
something only legible from inside 19), walk back into 18, set the relay
to match, return, unlock, proceed. This is a classic, well-understood
puzzle shape (see-then-fix-then-return) and it sidesteps the "irrevocable
choice" anxiety entirely — a player who guesses wrong just walks back and
tries the other setting, no dread required, more experimentation-friendly.

It was not chosen because the cost is real and stacks in the wrong place.
Hard law 3 has exactly one precedent for a sanctioned exception (room13's
closing walls, and that's an exception to law 2, explicitly flagged as
needing Tom's sign-off before a second one existed) — a genuine backward
doorway would be a **new kind** of exception, to a **different** law, and
every other room in the game (dispenser-pressure placement, catch/
teleport-to-spawn semantics, `telemetry`'s `room_enter`/`room_complete`
pairing, even the mental model every prior room's soft-lock audit relies
on — "you can't go back, so the only fallback is forward or the catch
reset") is built assuming forward-only flow. Reusing room 18 on the way
back also reopens presentation problems the forward-only design avoids for
free: `world.loadRoom` rebuilds a room's meshes from scratch on every
entry, so a re-entered room 18 would need its `onEnter` to notice the
already-set flag and re-apply the "already thrown" lever pose immediately,
rather than showing both plates fresh again — solvable, but it's exactly
the kind of bookkeeping the static, one-shot forward design sidesteps
entirely. Given the wing's job is to *teach* cross-room persistence, not
to be the capstone's puzzle-complexity spike, the irreversible-lever shape
teaches the same core idea (an action here changes a room you can't see
yet) with substantially less engine risk and a stronger thematic fit for
a ward that has never once given a patient a way to take something back.

---

## 10. Voice samples

- Relay-nook scrawl, the stakes: `it only moves once. they made sure.`
- Relay-nook scrawl, the mechanism: `power for the doors, or power for
  the lights. never both. never again.`
- Relay-nook scrawl, the consequence, plain enough to plan around:
  `doors: a straight line, dark as a mouth. lights: you'll see
  everything, the long way round.`
- Unmed refusal (either lever): `the plate's a smear. you can't tell
  which throw is which like this.`
- Success toast, doors chosen: `something clunks open, far off. the
  bulbs give up without a fight.`
- Success toast, lights chosen: `the lights hum up the hall. the door
  stays exactly where it was.`
- Objective line, post-throw: `the door ahead. whatever that bought you.`
- Room19 scrawl, doors branch, east wall (sealed side): `wrong wiring
  for this door. it never opens.`
- Room19 scrawl, lights branch, west wall (sealed side): `no door here.
  they fed the bulbs instead.`
- Room19 entry objective: `the undercroft hums. something was decided
  before you got here.`
- Orderly warn/chase (doors branch, reused convention): `he is looking
  at you.` / `run. or stop being visible.`
- Catch toast (either room, reused `makeOrderlyRoomScript` default
  phrasing, room-flavored): `hands. a needle. "you don't get to pick
  twice," he says.`

---

## Files touched (for the implementer, not written here)

| File | Change |
|---|---|
| `src/game/flags.ts` (new) | `Flags` interface + `FlagStore` class (§2.1). |
| `src/game/context.ts` | `flags: Flags` field on `GameCtx` (§2.2). |
| `src/main.ts` | Construct `flagStore`, wire into `ctx.flags`; `RoomEntry` union + `resolveDef` (§2.4); room19 registry entry. |
| `src/rooms/room18.ts` (new) | Relay room: belt orderly, two-lever choice, `Flags.set('room18.power', ...)`. |
| `src/rooms/room19.ts` (new) | `export function buildRoom19(power: PowerRoute = 'lights'): RoomDef`, both branches (§4). |
| `src/rooms/room17.ts` | `exits` entry updated to point at `room18` once room17 exists. |
| `src/devtools/map.ts` | `loadRoom` handles a `build*` factory export with a default-flag fallback (§2.5). |
| `check:rooms` script | Same factory-with-default handling, so room19 validates. |
| `src/devtools/map-types.ts` / room19's `debugPatrols` | Export both branches' waypoints (labeled `'A (doors)'` / `'A (lights)'`) since the viewer draws whatever's exported and doesn't need flag-accuracy — descriptive only, per the file's existing header. |
