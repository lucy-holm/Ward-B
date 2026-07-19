# Room 16 — "the Breaker Bay": light as a second state axis

Status: draft, ready for Tom's review.
Origin: Tom's post-epilogue wing plan — rooms 14 (pressure plates) → 15
(shape keys) → **16 (light axis, this doc)** → 17 (stacked floors) → 18+19
(cross-room wiring) → 20 (pushable blocks, capstone). No code is included as
an implementation — this is design content, same register as room13's
`TUNING.lastWard` worked-trig comments or room14's spec's interface/pseudocode
sketches. No existing file is edited by this doc.

---

## Part 1 — engine: light as a state axis

### Why this doesn't already exist

`RoomDef.lights` (`rooms/types.ts`) is currently `{ pos: [number, number] }[]`
— purely decorative: `main.ts`'s `loadRoom` hands the position list straight
to `renderer.setRoomLights`, which spawns one real `THREE.PointLight` per
entry (`src/engine/renderer.ts`). Those lights already flicker, tint, and
lerp with the lucid/unmed mood (`moodTargets`) — real dynamic lighting has
been in the engine since room1. What's missing is the ability to **turn that
off**, and for content to care whether it's off, the same way content already
cares whether the player is unmed or lucid.

Two findings from reading the renderer closely, both load-bearing for what
follows:

1. **Scrawl and label/plate materials are already lighting-independent.**
   `makeScrawlTexture`'s output is applied via a plain
   `THREE.MeshBasicMaterial` (`world.ts`), and Basic materials ignore scene
   lighting entirely — a scrawl on the wall renders at the same brightness
   whether `hemi`/`amb`/the room's point lights are at full mood or at zero.
   Same for the dispenser/keypad printed plates and the exit/vestibule
   `'glow'` panels. **This means a real-dynamic-lighting approach could never
   make an ink scrawl "unreadable in the dark"** — its pixels don't get
   darker no matter how dim the scene lights go. Legibility has to be gated
   explicitly, the same way "scrawls only exist in the unmed group" already
   is (`World.loadRoom`: `this.groups.unmed.add(mesh)` for every scrawl,
   unconditionally — not a lighting effect, a visibility rule).
2. **The orderly's warning cues are already lighting-independent too** — see
   "orderly sight" below; this turns out to be the answer to the darkness/
   sight-affecting-fairness question almost for free.

Given (1), the mechanism this doc recommends for **what's legible** is the
same pattern the unmed/lucid axis already uses — an explicit visibility
gate, not reliance on realistic falloff — laid on a **second, orthogonal**
axis (`lit`/`dark`) alongside the existing `states` (`lucid`/`unmed`) axis.
Real dynamic light (the existing `THREE.PointLight`s) stays in the picture
too, but demoted to atmosphere: it sells "the lights just died" as a visible,
felt event, while the deterministic gate is what the audits in Part 2 can
actually reason about.

### The types (`src/rooms/types.ts`)

```ts
// Mirrors StateFilter (ward-state axis) but orthogonal to it — a room's
// light state, room-wide (see "room-wide vs per-zone" below), independent
// of whether the player is lucid or unmed. Default 'both' everywhere, so
// every room shipped before this exists is unaffected.
export type LightFilter = 'both' | 'lit' | 'dark';

export interface BlockDef {
  // ...unchanged...
  lightState?: LightFilter; // default 'both'
}

export interface ScrawlDef {
  // ...unchanged...
  lightState?: LightFilter; // default 'both'
  // Ink color for makeScrawlTexture: 'red' (default, unchanged) or
  // 'phosphor' (pale glow-green, #bfffc9) — a scrawl that's supposed to
  // read as glow-in-the-dark paint should look like it, not like the same
  // red ink every other scrawl in the game uses. Purely cosmetic; doesn't
  // affect visibility (lightState does that).
  ink?: 'red' | 'phosphor'; // default 'red'
}

export interface InteractableDef {
  // ...unchanged...
  lightState?: LightFilter; // default 'both' — supported for generality
  // (a future room's hidden switch/dispenser findable only in one light
  // state), unused by room16 itself; see "why the keypad doesn't use this."
}

export type InteractableType =
  | 'pill_cup' | 'dispenser' | 'pill_pickup' | 'keypad' | 'door'
  | 'switch'; // new — a room-wide light toggle, see below

export type MatName =
  | 'wall' | 'wall2' | 'floor' | 'ceil' | 'prop' | 'bed' | 'door' | 'chain'
  | 'pill' | 'pad' | 'dispenser' | 'glow'
  | 'phosphor' // glow-in-the-dark paint — floor/wall markers, always lightState:'dark'
  | 'breaker'; // the switch fixture's own body, distinct from 'pad' so it doesn't read as another keypad

export interface RoomDef {
  // ...unchanged...
  // Initial light state on room entry. Default false (lit) — every room
  // shipped before this exists is unaffected. Room16 itself doesn't need
  // to set this (starts lit, the default), but the field exists so a
  // future room can open already-dark.
  startDark?: boolean;
}
```

### `GameCtx` additions (`src/game/context.ts`)

```ts
// True while the current room's lights are off. Content gated by
// BlockDef/ScrawlDef/InteractableDef.lightState reacts to this
// automatically (World); a room script reads it for its own interaction
// logic (e.g. room16's keypad refusing to read while lit).
isRoomDark(): boolean;
// Toggle the room's light state — called from a 'switch' interactable's
// onInteract. Drives both World's lightState-gated visibility and the
// Renderer's real point-light/ambient dimming (atmosphere).
setRoomDark(dark: boolean): void;
```

### `World` (`src/game/world.ts`)

- New private state: `private dark = false;` and
  `private lightGated: Array<{ mesh: THREE.Object3D; light: 'lit' | 'dark' }> = [];`
- `loadRoom` populates `lightGated` from every block/scrawl/interactable
  whose `lightState` is `'lit'` or `'dark'` (entries with `'both'`/undefined
  are skipped — no bookkeeping needed, they're always visible exactly like
  today), then calls `this.applyLight(def.startDark ?? false)` so the
  room's opening visibility is correct without a second `main.ts` call
  racing it.
- New method `applyLight(dark: boolean): void` — sets `this.dark = dark`
  and, for each gated entry, `mesh.visible = (entry.light === 'dark') === dark`.
  Three.js respects an ancestor's `.visible = false` regardless of a
  child's own flag, so this composes cleanly with the *existing*
  `groups.lucid`/`groups.unmed` toggling in `applyState` — a scrawl that's
  both `states:'unmed'` (implicit, all scrawls) and `lightState:'dark'` is
  only ever actually rendered when both the ward-state group is visible
  *and* its own gated flag is true.
- New getter `isDark(): boolean`.
- New composite builder `buildSwitch(it, floor)` (mirrors `buildKeypad`): a
  `MATERIALS.breaker`-textured body plus a small lever mesh. No special
  animated toggle state is required in `World` itself — the room script
  flips the lever's rotation via the *existing* `ctx.moveInteractable(id,
  pos, rotY)` hook (already used for door swings), reusing machinery
  instead of adding a new one.
- New shared material for `'phosphor'` blocks: a pale glow-green
  `THREE.MeshBasicMaterial` (`#bfffc9`), parallel to the existing
  `GLOW_STRIP_MAT`/`GLOW_DOOR_MAT` — unlit, so it reads at full brightness
  whenever it's visible, exactly the "always-on emergency glow" look the
  dispenser/exit panels already have.
- `makeScrawlTexture` reads `def.ink` and picks `#c1170f` (red, default) or
  `#bfffc9` (phosphor) as the fill style — a two-line change.

### `Interaction` (`src/game/interaction.ts`)

`update()`'s existing per-interactable filter —
`if (states !== 'both' && states !== state) continue;` — gets a sibling
check: `if (lightState !== 'both' && lightState !== (world.isDark() ? 'dark'
: 'lit')) continue;`. Room16 itself doesn't author any interactable with a
non-`'both'` `lightState` (see "why the keypad doesn't use this" below), but
the engine supports it for whatever room 17+ wants next.

### `Renderer` (`src/engine/renderer.ts`)

- New `private darkOverride = false;` and `setDark(dark: boolean): void`.
- `update()`'s mood-target computation gets a second multiplier layered on
  top of the existing lucid/unmed `moodTargets()` lerp: when
  `darkOverride`, `hemi`/`amb`/`pointIntensity` targets are scaled by
  ~0.12 and fog near/far pulled in tighter, before the existing per-frame
  lerp runs — so darkening is a felt transition (a few hundred ms of
  fade, matching the existing lerp rate `k = dt*2.2`), not a hard cut, and
  it composes with the unmed-only fog-breathing wobble untouched.
- Room point lights (`this.roomLights`, from `RoomDef.lights`) get their
  target intensity multiplied by the same ~0.12 while dark — they don't
  need to be individually flagged; darkness dims *all* of a room's ambient
  point-light fixtures uniformly, matching "someone threw the breaker for
  the whole bay," not "one bulb went out."

### `main.ts`

- `ctx.isRoomDark: () => world.isDark()`
- `ctx.setRoomDark: (dark) => { world.applyLight(dark); renderer.setDark(dark); }`
- `loadRoom()` gains, right after the existing `world.applyState(state.state)`
  line: `world.applyLight(current.def.startDark ?? false);
  renderer.setDark(current.def.startDark ?? false);`

### Why room-wide, not per-zone

Room-wide is the recommendation, for four reasons:

1. **The existing point-light system has no per-zone identity.** `renderer.
   roomLights` is a flat array from `RoomDef.lights`; making a *subset* of
   them independently dimmable per spatial zone would need either multiple
   tagged light groups or a per-frame "which zone is the player in" test —
   real new machinery, not a two-field extension.
2. **Room16's tension is temporal, not spatial** — it's about *when* you're
   in the dark, not *where*; every reveal (the two scrawls, the keypad) is
   already placement-gated by geometry (a specific nook, a specific wall).
   A room-wide flag combined with placement gets all four grid cells for
   free; per-zone buys nothing this room needs.
3. **Per-zone risks the "unmed is always safe from the world" law by
   accident.** A pocket that's passively dark because of *where* the
   player is (not because they chose to flip anything) reads as an
   ambient hazard even when it mechanically isn't one. Room-wide, the
   state only ever changes because the player deliberately threw the
   switch — same authored-by-the-player shape as the unmed/lucid shift
   itself, not something the environment does to you.
4. **Nothing is foreclosed.** `LightFilter` on `BlockDef`/`ScrawlDef`/
   `InteractableDef` and `RoomDef.startDark` are exactly the primitives a
   later per-zone system would also need; room16 just uses them at
   "one zone = the whole room" granularity.

### Orderly sight: unaffected, and why that's not a cop-out

**Decision: darkness changes nothing about `Orderly`'s sight math** — no
`sightRange`/`coneDeg`/`graceSec` override, no new per-instance flag. This
is the same category of decision `TUNING.lastWard`'s comment block makes for
room13's cone widening, just landing on "no change" instead of a widened
number, and it's backed by the same kind of check: reading `orderly.ts`'s
actual materials.

- The sight-cone mesh (`buildSightCone`) uses a `THREE.MeshBasicMaterial` —
  unlit, exactly like scrawls. It renders at the same color/opacity
  regardless of ambient light, today, in every room that has an orderly.
- The eye-strip (`buildUnmedBody`'s `eyeMat`) is a `MeshStandardMaterial`
  with an `emissive`/`emissiveMap` channel — three.js adds emissive output
  independent of incoming scene light, so the eye-glow is *also* already
  full-brightness in total darkness.

Put together: **the two things that currently warn a player an orderly is
alert or hunting (the reddening cone, the tracking eye-glow) are already
immune to the room's ambient/point-light level**, by construction, before
this room exists. Turning the lights off dims the *walls and floor* (real
`THREE.PointLight`/hemisphere/ambient response — normal Lambert/Standard
materials) but leaves every actual threat-warning cue exactly as legible as
in a lit room. This is why "leave sight unaffected" is the safe choice
rather than an oversight: the reaction-time math in Part 2 (distance +
`graceSec` + `chaseSpeed`) carries over unchanged, because the inputs a
player actually reacts to (can I see his cone reddening, can I see his eyes
find me) don't degrade. His body silhouette (ordinary `MeshStandardMaterial`
skin, faint 0.1-intensity green emissive only) *does* go hard to make out at
range in the dark — accepted as atmosphere (he's a shape you barely place
until he's close), not a fairness problem, since the actual warning system
is the cone+eyes, not the silhouette.

Open question for Tom below: whether the body silhouette deserves a small
emissive bump while dark, purely as a legibility nicety — not required by
any audit, a polish call.

### What `/map.html` draws

- `TYPE_COLORS.switch` — a new entry, distinct hue from `dispenser` (blue)
  and `keypad` (orange); violet (`#c96fe0`) reads well against the existing
  palette and isn't claimed by anything else in `map.ts`.
- `MAT_COLORS.phosphor` / `MAT_COLORS.breaker` — new stroke colors for the
  two new `MatName`s, same treatment every other mat gets.
- `drawScrawls`/`drawBlocks`/`drawInteractables`'s tooltip strings (the
  `title()` text already built per-element) get `lightState` appended when
  set, e.g. `scrawl "..." pos[...] size:2.6 [dark-only]` / `[lit-only]` —
  the same low-cost, no-new-geometry treatment the viewer already gives
  `states`-filtered geometry via `STATE_COLORS`. A dashed outline (reusing
  the existing dashed-stroke convention `drawBlocks` already applies to
  collider-less blocks) on `lightState`-gated blocks would be a nice-to-have
  visual distinction beyond the tooltip; not required for v1.
- A small header badge showing `def.startDark` (e.g. `LIGHTS: OFF AT START`)
  next to the existing room-name label, so a room authored to open dark
  doesn't surprise whoever's reading the map cold.
- No change needed to `map-types.ts`/`DebugPatrol` — light state is read
  straight off `RoomDef`, same as `RoomDef.triggers` in the room14 spec.

### Full list of files touched (Part 1)

| File | Change |
|---|---|
| `src/rooms/types.ts` | `LightFilter`; `lightState?` on `BlockDef`/`ScrawlDef`/`InteractableDef`; `ScrawlDef.ink?`; `'switch'` added to `InteractableType`; `'phosphor'`/`'breaker'` added to `MatName`; `RoomDef.startDark?`. |
| `src/game/context.ts` | `GameCtx.isRoomDark()`, `GameCtx.setRoomDark()`. |
| `src/game/world.ts` | `lightGated` registry + `applyLight()`/`isDark()`; `buildSwitch()`; `GLOW_PHOSPHOR_MAT`/`MATERIALS.breaker`; `makeScrawlTexture` reads `def.ink`. |
| `src/game/interaction.ts` | `update()`'s per-interactable filter gains the `lightState` check alongside the existing `states` check. |
| `src/engine/renderer.ts` | `setDark()`, dark-state multiplier layered into `update()`'s mood computation. |
| `src/main.ts` | Wire `ctx.isRoomDark`/`ctx.setRoomDark`; `loadRoom()` calls `world.applyLight`/`renderer.setDark` with `def.startDark ?? false`. |
| `src/devtools/map.ts` | `TYPE_COLORS.switch`; `MAT_COLORS.phosphor`/`.breaker`; tooltip `lightState` suffix; `startDark` header badge. |
| `src/rooms/kit.ts` (optional, see open questions) | A `lightSwitch(rb, opts)` helper mirroring `keypadDoor()`'s "one call, two shapes" pattern, if this mechanic recurs in 17+. Not required for room16, which can hand-write its ~15-line switch script directly (matching how room2/room5 hand-wrote keypads before `keypadDoor()` existed). |

---

## Part 2 — Room 16: "the Breaker Bay"

### Player-experience summary

Room 15 (shape-keys) is a comprehension puzzle; room 16 is a construction
puzzle — the first room in the wing where the player has to deliberately
*build* a situation (a specific combination of two independent switches:
which state they're medicated into, and which state the room's power is in)
rather than just react to one axis at a time. They walk in lit, unmed, and
the first thing the room gives them is completely ordinary: a wall clue,
read like every clue in the game so far. Then they find a breaker that
won't answer to raw hands, and the moment they finally get it lucid enough
to touch, the room goes dark and stays dark — and *now* the same wall they
already looked at has more written on it, in paint that was never legible
before. The unsettling beat isn't a jump scare, it's the retroactive one:
*it was already there. you just couldn't see it.* The keypad at the far end
completes the idea from the other side — it only makes sense to hands that
are lucid **and** eyes that are in the dark, a combination the player has to
notice they need to reconstruct, not stumble into. One orderly, unmodified
`TUNING.orderly`, patrols throughout — visible whenever unmed regardless of
the room's own light state, per the sight-fairness case made in Part 1.

### The 2×2 grid, stated explicitly

| | **LIT** (room's default state) | **DARK** (after the switch) |
|---|---|---|
| **UNMED** (reads the walls) | The ink scrawl `inkScrawl16` is legible — the *first* two digits of the exit code, ordinary red ink, readable exactly like every other room's clue. Nothing else is different from a normal room here; this is the default, teaching cell. | The phosphor scrawl `phosphorScrawl16` (pale glow-green ink, `ink:'phosphor'`) becomes legible in the **same nook**, giving the *last* two digits. It was physically present the whole time — `lightState:'dark'` just kept it invisible until now. The glowing floor path (`mat:'phosphor'`, `lightState:'dark'`) also appears here, marking the route from the vestibule doorway back to this nook — useful precisely because the room is now otherwise unlit. |
| **LUCID** (reads machinery) | `lightSwitch16` is operable (unmed refuses it, "cold iron"). Flipping it here is the pivotal, room-defining action: **LIT→DARK**, permanent until flipped back. This is the only cell where you'd ever *choose* to flip it dark-bound, since you need LIT+UNMED for the ink clue first. | The exit `keypad16` is operable **and** its refusal logic flips: while the room is *lit*, the keypad refuses even lucid input ("a flare of white — you can't make out a single number"); only lucid **and** dark lets you actually enter the assembled code and open the door. Flipping the switch back to LIT is also available here (recoverable, see below), for a player who realizes mid-dark that they never got the lit-only ink clue. |

Every cell hands you something the other three structurally cannot: LIT+
UNMED is the only place the ink clue exists; DARK+UNMED is the only place
the phosphor clue (and the wayfinding path) exists; LIT+LUCID is the only
state from which the room *can* be darkened; DARK+LUCID is the only state
in which the keypad will actually take input. Missing any one of the four
means the door never opens.

### Why the switch is a genuine two-way toggle, not a one-way unlock

Early draft of this room made the switch one-shot (LIT→DARK only, matching
the `keypadDoor()`/door-unlock idiom every other room's fixture uses). That
version has an unwinnable trap: a player who reaches the switch and flips it
*before* ever reading the lit-only ink scrawl can never see LIT again, and
therefore can never get half the code — the room becomes permanently
unsolvable with the door never opening, a genuine soft-lock that no amount
of pill economy fixes. The fix is to make the toggle bidirectional: flipping
it costs nothing extra beyond the lucid requirement already gating it in
either direction, so a mis-ordered attempt is always recoverable — walk back,
flip it lit, read what you missed, flip it dark again. This is the reason
the task's framing ("toggled by a switch") is taken literally rather than
reusing the door's one-way unlock pattern.

### Room layout sketch

North (−Z) up, matching every room's convention. Approximate coordinates
(floor bounding box `x[-9.6,9.6] z[-16,6]` — the extra ±1.6 on X accounts for
the two nook protrusions, same convention room10 uses for its own alcoves):

```
z=  6  ┌───────────────────────┐  south cap, behind spawn
       │         spawn          │  (0,5,yaw 0)
z=  5  │    •dispenser16a       │  west wall, (-8+.08,1.45,4)
       │                         │  ── Z1 VESTIBULE, safe, no orderly ──
z=  2  ├──┐                 ┌──┤  partition wall, 2m gap x[-1,1] (open, ungated)
       │  │                 │  │
       │  │   ── Z2 HALL ──    │  patrol loop (5,0.5)-(5,-13)-(-5,-13)-(-5,0.5)
z= 0.5 │  ●═══════════════●    │  (waypoints inset 3m from x=±8 side walls)
       │  ║                 ║  │
  ┌────┼──╢                 ╟──┼────┐
  │NOOK│  ║                 ║  │NOOK│  west nook: x[-9.6,-8] z[-8.5,-6.9]
  │ W  │  ║                 ║  │ E  │  east nook: x[8,9.6]   z[-4.8,-3.2]
  │ink+│  ║                 ║  │sw- │  (both: bracket walls + end cap,
  │phos│  ║                 ║  │itch│   AABB passed as orderly occluder)
  └────┼──╢                 ╟──┼────┘
       │  ║                 ║  │
z=-13  │  ●═══════════════●    │
       │  │                 │  │
z=-14  ├──┴──┐         ┌────┴──┤  north wall, 2m door gap x[-1,1]
       │  keypad16 (1.35,-14)  │  ── Z3 exit vestibule ──
z=-16  └──────────────────────┘  exit → room17, glow marker (0,1.4,-15.9)
```

- **Z1 — vestibule**, `z[2,6]`, `x[-8,8]`: safe, no patrol reach (the
  partition wall's only gap is the 2m doorway at `x[-1,1], z=2`, an open,
  ungated crossing exactly like room10's Z1/Z2 boundary — the player's
  first crossing is unmed, so gating it would only add a pointless pill
  sink before the room has taught anything). `dispenser16a` on the west
  wall (`side:'w', wallAt:-8, along:4`).
- **Z2 — the bay**, `z[-14,2]`, `x[-8,8]` (main envelope) with two 1.6m×1.6m
  nook protrusions to `x=±9.6`: one orderly, waypoints `(5,0.5)`,
  `(5,-13)`, `(-5,-13)`, `(-5,0.5)` — inset 3m from the side walls, clearing
  the kit's `patrol()` validator (needs ≥0.5m) with wide margin.
  - **NOOK_W** `{minX:-9.6,maxX:-8,minZ:-8.5,maxZ:-6.9}`: bracket walls
    `wallX(-9.6,-8,-8.5)`/`wallX(-9.6,-8,-6.9)`, end cap
    `wallZ(-8.5,-6.9,-9.6)`. Both scrawls mount on the end cap (inner face
    `x=-9.48`): `inkScrawl16` at `(-9.46,1.7,-8.2)`, `phosphorScrawl16` at
    `(-9.46,1.7,-7.2)`, both `rotY: Math.PI/2` (facing east into the nook,
    same convention as room10's `codeScrawlA`).
  - **NOOK_E** `{minX:8,maxX:9.6,minZ:-4.8,maxZ:-3.2}`: mirrored, brackets
    `wallX(8,9.6,-4.8)`/`wallX(8,9.6,-3.2)`, end cap `wallZ(-4.8,-3.2,9.6)`.
    `lightSwitch16` mounts on the end cap at `(9.46,1.45,-4.0)`, `facing:
    'nx'` (explicit — alcove mounts are exactly the case room10's own
    comments flag as fragile for the room-center-heuristic).
  - Glow lintels over both mouths (`mat:'glow'`, `lightState:'lit'` —
    ordinary house lighting, so it *goes out* with the rest of the room,
    unlike the dispenser/exit glow discussed in the soft-lock audit).
  - Three `mat:'phosphor'`, `lightState:'dark'` floor tiles (`[0.4,0.02,
    0.4]` each) at roughly `(-2,0.02,0)`, `(-5,0.02,-3)`, `(-7,0.02,-6.5)`
    — the glowing path from the doorway back to NOOK_W, visible only once
    the room is dark (exactly when it's needed).
- **Z3 — exit vestibule**, `z[-16,-14]`: safe, no lock beyond the keypad
  itself. `keypad16` at `(1.35,1.45,-14)` (`side:'n'`), `exitdoor16` at
  `(0,1.5,-14)`, exit AABB to `room17` at `z≈-15.5`.

`lights` (real `THREE.PointLight`s, dimmed together while dark):
`{pos:[0,4]}`, `{pos:[0,0]}`, `{pos:[-3,-4]}`, `{pos:[3,-8]}`,
`{pos:[-3,-11]}`, `{pos:[0,-15]}`.

### Room script sketch (interaction logic, not implementation)

```ts
const FIXED_CODE = '4418'; // 44 (ink, lit) + 18 (phosphor, dark)
let code = FIXED_CODE;
let dark = false;

function regenerateCode(ctx: GameCtx): void {
  if (!isRandomizeCodesEnabled()) return;
  code = randomCode4();
  ctx.updateScrawlText('inkScrawl16', codeClueText(code, [0, 2]));
  ctx.updateScrawlText('phosphorScrawl16', codeClueText(code, [2, 4]));
}

// 'switch' onInteract
if (id === 'lightSwitch16') {
  if (ctx.state.state === 'unmed') {
    ctx.hud.toast("cold iron. it won't answer to raw hands.");
    return true;
  }
  dark = !dark;
  ctx.setRoomDark(dark);
  ctx.hud.toast(dark
    ? 'the hum dies. the dark comes back like it never left.'
    : "fluorescents stutter, then hold. it's too bright in here now.");
  return true;
}

// 'keypad16' onInteract
if (id === 'keypad16') {
  if (ctx.state.state === 'unmed') {
    ctx.hud.toast("the keypad is a smear of static. you can't read it like this.");
    return true;
  }
  if (!ctx.isRoomDark()) {
    ctx.hud.toast("the display is a flare of white. you can't make out a single number.");
    return true;
  }
  // openKeypad(code) — standard flow from here, matching every other room.
}

// onCaught (standard penalty already applied by makeOrderlyRoomScript):
function onCaught(ctx: GameCtx): void {
  dark = false;
  ctx.setRoomDark(false); // reset to a known, lit state — no half-dark limbo after a teleport
  regenerateCode(ctx);
}
```

### Intended-solve walkthrough, exact pill economy

`TUNING.pills.max` is 1. Worst case, the player arrives from room15 with
**0 pills**:

1. Spawn `(0,5)`, lit, unmed, 0 pills. Walk to `dispenser16a` (~1m, no
   orderly reach) → refill, 0→1.
2. Cross the open doorway (`z=2`, no gate) into Z2, still unmed, room still
   lit. Walk to NOOK_W (~10m, exposed to the patrol per normal room
   tension, not a special hazard) and stand inside it to read
   `inkScrawl16`: **"4 4 – –"**. *(LIT+UNMED cell.)*
3. Shift lucid (1→0 pills held; 45s meter starts). **Still lucid**, walk
   east across the hall to NOOK_E (~14m) and flip `lightSwitch16`:
   LIT→DARK. *(LIT+LUCID cell — the pivotal action.)*
4. **Still lucid** (safe — walk back before reverting, not at the switch;
   see reaction-time audit), return to NOOK_W (~14m) and revert to unmed
   (free) *once inside the nook*. Read `phosphorScrawl16`: **"– – 1 8"**.
   Combined code: **4418**. *(DARK+UNMED cell.)*
5. Still unmed, 0 pills, walk south (~10m, exposed) back through the open
   doorway to `dispenser16a` → refill, 0→1.
6. Shift lucid again (1→0 pills held). Walk north the length of the hall
   (~19m, safe — orderly-blind) to `keypad16`. Room is still dark from step
   3 (nobody flipped it back). Enter **4418**. *(DARK+LUCID cell.)* Door
   opens, exit to room17.

**Total: 2 pill spends, 2 dispenser visits, both at the same dispenser.**
A player entering with 1 pill already skips step 1's refill (only one
dispenser visit needed, at step 5) but still spends 2 pills overall — the
room's cost is fixed at "two lucid actions," not at "however many you walked
in with." Both lucid stretches (step 3's ~14m/~4.1s round-trip-to-flip and
step 6's ~19m/~5.6s walk + keypad entry) are comfortably inside the 45s
meter, even accounting for real time spent in the on-screen keypad overlay
(`openKeypad` doesn't pause `updateMedication`'s ticking).

A player who reaches the switch *before* reading the ink scrawl (skips step
2) isn't stuck: the switch is reversible (see above), so they flip it back
to LIT (another lucid visit, one more pill), read the ink scrawl, then
re-darken. More walking, no dead end.

### Soft-lock audit

- **0-pill unmed player can always reach a dispenser, in every light
  state.** `dispenser16a` sits in Z1, behind the room's only ungated
  doorway, with zero patrol reach — reachable from spawn in the first
  few seconds regardless of whether the player has ever touched the
  switch. Its slot glow (`GLOW_SLOT_MAT`, shared with every dispenser in
  the game) is a `MeshLambertMaterial` emissive channel — per the Part 1
  finding, emissive output is independent of scene lighting, so the
  dispenser is **exactly as visible dark as lit**, without this room (or
  any room) needing to author anything extra for it. This is the concrete,
  already-true version of the brief's "consider a faint always-visible glow
  on dispensers" — it's load-bearing existing behavior, not a new feature.
- **No unmed-sealed pocket exists anywhere in this room.** Unlike room10's
  `states:'unmed'`-gated wall panels, room16 has zero unmed-sealed
  colliders. The only "gates" are informational (you don't know the code
  until both scrawls are read) and permission-based (the switch/keypad
  require lucid) — never a wall that can trap a raw player. Concretely:
  every point in Z2 has a free (if long) unmed walk back through the
  ungated doorway to `dispenser16a`, including the far end at the keypad
  (~19m — long, exposed, the pressure rule at work, but never blocked).
- **The exit door/vestibule glow (`z=-15.9`) is not `lightState`-gated**,
  same reasoning as the dispenser — the far end of the room stays visually
  locatable in the dark too, even though the player has no reason to go
  there before solving the keypad.
- **Timer expiry is safe everywhere.** Reverting lucid→unmed for free is
  never blocked in this room: Z1/Z2 have no colliders inside the walkable
  floor besides the two nooks (ordinary solids, not unmed-sealed — reverting
  next to one behaves like reverting next to any wall in any other room,
  covered by `main.ts`'s existing `circleHitsSolidUnmed` guard) and the
  keypad/door/switch fixtures are wall-mounted, not floor obstructions.
- **Catch behavior resets the light state.** `onCaught` explicitly calls
  `ctx.setRoomDark(false)` (in addition to the standard force-lucid +
  teleport-to-spawn + pills-kept penalty) so a player never resumes at
  spawn in a half-dark, disorienting limbo — they always restart from a
  known, lit state, matching how the room itself starts.

### Reaction-time audit

The ≥2.5s (≥8.2m, `minInspectionDistance()`) rule governs places the player
stops to read something while unmed. Room16 has exactly one such spot:
NOOK_W (both scrawls; the switch and keypad are only ever operated lucid,
where the rule doesn't apply — chasing is impossible).

- **Raw distance is not the safety margin here** — the nearest point on the
  patrol's west leg (segment `(-5,0.5)`–`(-5,-13)`) to the scrawl position
  `(-9.46,-7.7)` is the perpendicular foot `(-5,-7.7)`: `|-9.46-(-5)| =
  4.46m`. That's under the 8.2m floor, same as room10's own worked nook
  example (2.96m there) — **the actual protection is the occluder, not
  distance.** `NOOK_W`'s AABB (`{minX:-9.6,maxX:-8,minZ:-8.5,maxZ:-6.9}`) is
  passed to the orderly's `occluders` list. Reading either scrawl means
  standing near the end cap (`x≈-9.4`), solidly inside that box; any
  sightline from the orderly's actual position (always at `x≥-5`, outside
  the box) to a point inside the box necessarily crosses the box boundary,
  so `segmentHitsAABB` reports occluded — he cannot see the player while
  they're deep enough in the nook to read either scrawl, regardless of
  patrol distance, identical logic to room10's `NOOK_A`/`NOOK_B`.
- **The revert-to-unmed step (walkthrough step 4) must happen inside
  NOOK_W, not at the switch.** Reverting right next to `lightSwitch16`
  (NOOK_E, only ~2.6m from the east patrol leg) would be a real reaction-
  time violation if the orderly happened to be nearby — but NOOK_E is
  *also* occluder-protected for the same reason NOOK_W is, so even an
  ill-advised revert there is safe. The intended solve never reverts there
  anyway (walk back lucid, revert once safely inside NOOK_W), but it's
  worth the builder/playtester double-checking this explicitly rather than
  assuming "lucid interactions are always safe" covers the moment
  immediately *after* the last lucid action, when the player is still
  standing at that fixture.
- Distance from either nook to the keypad/exit is irrelevant (>19m,
  operated lucid only).

### Dispenser placement (pressure rule)

One dispenser, `dispenser16a`, at the **near end** of the room's one sealed
pocket (Z2, the bay) — right at its southern threshold, per Tom's
playtest-9 rule. A mistimed revert or a forgotten refill deep in Z2 (worst
case, right at the keypad, `z=-14`) costs a real, felt ~19m unmed walk back
through the full patrol loop to refill — exactly the "pressure, not comfort"
shape the rule asks for, and consistent with how room10 placed its own
near-end dispensers relative to its gates.

### Voice samples

All lowercase, second person, terse. Final copy is a writing pass, not a
design blocker, matching every prior room's own spec caveat.

- Entry objective: `"the wing keeps its lights on for a reason. find out what it's hiding it from."`
- Flavor scrawl, near the doorway (both light states, ordinary ink):
  `"they never turn the lights off.\nsomeone must be afraid of the dark too."`
- `inkScrawl16` (lit, unmed): `"4 4 – –"`
- `phosphorScrawl16` (dark, unmed): `"– – 1 8"`, paired with a flavor line
  on the same nook wall: `"the paint remembers\nwhat the light erases."`
- Switch, unmed refusal: `"cold iron. it won't answer to raw hands."`
- Switch, lit→dark: `"the hum dies. the dark comes back like it never left."`
- Switch, dark→lit: `"fluorescents stutter, then hold. it's too bright in here now."`
- Keypad, refused while lit: `"the display is a flare of white. you can't make out a single number."`
- Keypad, refused while unmed: `"the keypad is a smear of static. you can't read it like this."`
- Keypad success: `` `${code}. it takes the dark to read it right.` ``
- First-shift-to-unmed reminder (overrides the kit default): `"something throws a shadow that keeps his shape, even with the lights out."`
- Catch toast: `"hands. a needle. \"lights out,\" he says."`
- Objective once through: `"the dark kept its half of the bargain. so did you."`

### Open questions for Tom

1. **Should the orderly's body silhouette (not the cone/eyes, which already
   read fine per Part 1) get a small emissive bump specifically while the
   room is dark?** Not required by any audit — the actual warning cues are
   already lighting-independent — but it might read better/scarier as a
   deliberate art pass rather than an accidental side effect of the
   ambient drop. Purely a polish call.
2. **Is `ScrawlDef.ink` (`'red'`/`'phosphor'`) worth adding for one room's
   two scrawls**, or should room16 ship with the phosphor scrawl rendered
   in the same red ink as everything else and let the `lightState` gating
   alone carry the "glow-in-the-dark" idea? The visual distinction seems
   worth the two-line `makeScrawlTexture` change, but it's the one piece
   of this doc that's cosmetic rather than mechanical.
3. **Should `kit.ts` get a `lightSwitch()` helper** (mirroring
   `keypadDoor()`'s bundled door+keypad+collider pattern) now, or only if a
   later wing room (17+) reuses the mechanic? Room16 alone doesn't need it.
4. **Exact tuning numbers** (nook dimensions, patrol inset distance, the
   ~0.12 dark-multiplier on hemi/amb/point intensity, fog near/far while
   dark): defaults chosen and justified above, finalized by playtest, same
   as every prior room's closing-numbers caveat.
5. **Room15/17 wiring**: this doc assumes room15's exit points at
   `'room16'` and room16's own exit points at `'room17'` (not yet built) —
   that wiring itself is out of scope here (see the `adding-a-room` skill).
6. **Does "room-wide only" hold for the rest of the wing**, or does a later
   room (17's stacked floors seems like a plausible candidate, given it
   already has a vertical axis to play with) want genuine per-zone
   lighting? Flagged in Part 1 as not foreclosed, but worth deciding
   before a second room needs it, since retrofitting per-zone onto a
   room-wide-only mental model would be more disruptive than designing it
   in from a second use case.
