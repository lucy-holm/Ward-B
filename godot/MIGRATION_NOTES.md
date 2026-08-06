# Ward B — Three.js → Godot 4.7 migration notes

Scope of this pass: **rooms 1–7**, i.e. the tutorial arc through the
Orderly's introduction (room 4) and its three follow-up rooms. The Three.js
build is untouched and remains the reference implementation and the thing
that ships.

---

## 0. What the brief assumed vs. what the repo actually contained

Worth recording, because it changed the plan:

| Brief said | Actually |
|---|---|
| "single-file Three.js grey-box prototype" | 15,801 LOC of modular TypeScript. `reference-v0.1.html` is the July 12 M1 scaffold, superseded. |
| "three-to-six room progression" | **20 rooms**, 9,000 LOC, built on a 1,275-LOC authoring kit (`src/rooms/kit.ts`). |
| telemetry = "room entered, state toggled, sighting, death, completed" | **30+ event types** plus a 154-LOC A/B experiments framework and a Cloudflare worker. |

The single most useful discovery: **rooms 1–7 predate the kit and use only
four of its symbols** (`orderlyTelemetryCallbacks`, `randomCode4`,
`codeClueText`, `isRandomizeCodesEnabled`). Everything else in the kit —
triggers, shape locks, icon panels, light switches, ramps, stairwells,
stacked levels, push blocks, multi-orderly aggregation — first appears in
room 8+. So this pass needed a far smaller API than the kit's size suggests.
That is why there is no `kit.gd`.

---

## 1. Structural changes

### Signals replace the central visibility switch
The original kept three scene groups (`both` / `lucid` / `unmed`) and flipped
`group.visible` centrally (`world.ts:1420-1423`). Every state-conditional
object had to be registered into the right group at load.

Now `StateManager` emits `state_changed` and each node owns its own affinity
via `StateObject.visible_in_state` (an exported enum, editable in the
inspector). Nothing polls a global; a designer can retag a prop without
touching code. This is the clearest win of the migration.

### Rooms are real scenes
`room1.tscn` … `room7.tscn` are genuine Godot scenes — `StaticBody3D` +
`BoxShape3D` walls on tagged collision layers, `Label3D` scrawls, `Area3D`
interactables and exits, `OmniLight3D` lights. They open and edit in the
editor.

They were produced by `tools/gen_rooms.py` from the TS geometry, because
hand-typing seven rooms of coordinates is an error factory and those
coordinates are audited. **After generation the `.tscn` is the source of
truth.** The generator exists to port the seven rooms, not to keep rooms as
data forever — new rooms should be authored in the editor.

### Autoloads
`Tuning` (a 1:1 mirror of `src/tuning.ts`), `StateManager`, `GameState`,
`Telemetry`. Kept lean: `StateManager` owns the state machine and the
medication meter but not the pill inventory (that is run state, so it lives
in `GameState`) and not the decision to revert when the meter empties (that
needs world knowledge it does not have — see §2).

### Collision layers
`1 player, 2 world_static, 4 solid_lucid_only, 8 solid_unmed_only,
16 orderly, 32 interactable, 64 trigger`. State-conditional geometry is
filtered by *layer*, so a state change never rebuilds the collider cache.

### Telemetry is wire-compatible
Batch envelope and per-event row mirror `src/game/telemetry.ts`
field-for-field, including 2dp rounding on `x`/`z`/`yaw`/`med` and omitting
(not nulling) `dropped`/`experiment`/`variant`. The existing worker and
dashboard keep working. Web builds use `navigator.sendBeacon` via
`JavaScriptBridge` on unload, matching the original.

---

## 2. Deliberate deviations from "idiomatic Godot"

Three places where the obvious engine-native choice would have changed the
game. Each was raised and agreed before implementing.

### 2.1 Movement is NOT `move_and_slide`
The brief mapped hand-rolled AABB collision → `CharacterBody3D` +
`move_and_slide`. The player *is* a `CharacterBody3D` on a real layer, and
walls *are* real `StaticBody3D`s — but motion resolves through a ported
axis-separated routine (`core/collision.gd`), because:

- The original resolves **X first against the old Z, then Z against the new
  X**. That ordering defines corner-sliding and whether you can squeeze
  diagonally past a corner.
- It approximates the 0.35 m radius by **inflating the AABB**, so clearance
  is a 0.7 m *square*, not a capsule. A capsule rounds corners off.
- There is **no velocity, acceleration, friction, gravity or jump** anywhere
  in this game. Position is set directly.
- Every room's geometry and the Orderly's 0.5 m patrol margins were audited
  against that square.

Physics ticks at a fixed 60 Hz, which is strictly better than the original's
`dt` clamped to 0.05 s. Per-tick displacement (0.057 m) stays far below the
0.35 m radius, so tunnelling remains impossible.

### 2.2 Orderly movement uses `NavigationAgent3D` — a real behaviour change
The chase *rules* are ported exactly (see §3). The **movement** is not.

The original stepped in a straight line and slid along AABBs, which meant a
blocked orderly could **wedge permanently** — nothing re-paths, so he grinds
against a corner forever. `kit.patrol()` exists purely to validate ≥0.5 m
clearance on every leg at authoring time and catch that at build time.

Using `NavigationAgent3D` removes that entire bug class and the need for the
validator. **Cost:** he now paths *around* obstacles during a chase where he
used to beeline and scrape.

> ⚠️ **Rooms 5, 6 and 7 want a playtest pass.** Their patrol geometry was
> tuned against straight-line pursuit. Room 7's east leg sits at `x = 1.0`
> specifically because `1.3` wedged him against a shelf; room 6's waypoints
> were moved after dt-stepped simulation of the real sight/grace/chase loop.
> Smarter pathing makes him *more* dangerous in the pocket rooms than the
> reaction-time audits assumed.

The final step still resolves through the same AABB routine as the player,
so he can never end up inside geometry the navmesh smoothed over.

### 2.3 `gl_compatibility`, not Forward+
Forward+ on web needs WebGPU, which is not broadly available; the brief
requires "everyone can play it". **Cost: no volumetric fog.** The state-shift
look is built from depth fog + glow + `Environment` adjustments, all of which
work in Compatibility.

---

## 3. Ported quirks — do not "fix" these

Catalogued because each one looks like a bug and is not.

1. **The chase has no exit condition** other than shifting lucid or a catch
   landing. No lost-sight timer, no leash, no give-up; sight is not even
   evaluated during a chase. At 4.3 vs 3.4 m/s he cannot be outrun. Adding
   conventional stealth-AI memory guts the risk/reward core.
2. **Contact catches in every mode**, including patrol and returning.
   Sneaking up behind him still gets you caught.
3. **A catch is cheap**: it force-states you to lucid *without spending a
   pill* and refills the meter. No pills lost, no progress cleared.
4. **`force_state` early-returns when the state is unchanged** — no signal,
   no meter refill. Several call sites depend on that silence.
5. **The medication meter is never zeroed on revert.** It reads stale while
   unmed by design; readers guard it.
6. **The meter only drains while `can_shift`** — room 1's pre-ability lucid
   stretch never drains.
7. **The geometry-trap guard** (below) can defer the auto-revert
   indefinitely. It is the only case where lucidity outlasts 45 s.
8. **His facing is the last direction he *moved*, and persists while paused.**
   He keeps staring down the leg he just walked, cone live. The head
   visually tracks you once the ramp is up, but detection uses the body
   vector — the head is a lie.
9. **Ramp decay is a flat 1.5/s**, independent of `grace_sec`: 0.6 s to be
   spotted, 0.667 s to be forgotten.
10. **`orderly_caught` telemetry fires BEFORE the teleport.** Telemetry
    snapshots player position at emit time; emitting after would record spawn
    coordinates for every catch and make catch heat-maps worthless.
11. **Threat HUD `level <= 0 && bearing == null` is a hard snap to zero**,
    not a lerp — without it the vignette bleeds into the next room.

### The geometry-trap guard
`StateManager` emits `medication_depleted` and stops. `main.gd` decides
whether reverting is safe: if the player stands where an unmed-only wall
would materialise (`circle_hits_solid_unmed`), the revert is deferred, tick
by tick, until they step clear.

Note the meter emits `medication_depleted` **once**, so the guard is
re-evaluated every physics tick from a latch (`_awaiting_revert`) rather than
from the signal. Driving it from the signal alone means a trapped player
never reverts at all. This is the single subtlety most likely to be dropped
in a rewrite, and it is why the player can never be embedded in geometry.

---

## 4. Verification

Nothing here is claimed working on the basis of "it compiles".

```bash
cd godot

# wiring: registration, spawn clearance, exit chain, unique ids
/Applications/Godot.app/Contents/MacOS/Godot --headless --path . tools/check_rooms.tscn

# behaviour: state-conditional geometry, trap guard, axis-separated slide,
# pill economy incl. force_state semantics
/Applications/Godot.app/Contents/MacOS/Godot --headless --path . tools/test_mechanics.tscn

# web export, then prove it RUNS in a real browser (WebGL2 + GDScript ran)
/Applications/Godot.app/Contents/MacOS/Godot --headless --path . --export-release "Web" build/index.html
python3 -m http.server 8899 --directory build &
node tools/verify_web.mjs
```

`check_rooms.tscn` is the analogue of `npm run check:rooms` and should be run
after **any** room change, same rule as the TS side. It reads the room
registry straight out of `main.gd`, so a room can never be validated while
unregistered.

### Web export status
Builds and runs. **9.6 MB gzipped** (38 MB raw wasm). Uses the **no-threads**
template, so there is **no `SharedArrayBuffer` requirement and no COOP/COEP
headers needed** — it drops onto itch.io as-is. Verified in Chrome with a
real WebGL2 context, GDScript executing, and a correct telemetry batch on the
wire.

---

## 5. Open questions / not yet done

- **Audio is not ported.** The original synthesises everything in WebAudio
  (`engine/audio.ts`, 353 LOC) — drones, stingers, and critically
  `setThreat()`'s footsteps, which are *the only way to track the Orderly
  while lucid*, since his mesh is hidden. Attenuation radius is 8 m and
  footsteps play regardless of ward state. This wants `AudioStreamPlayer3D`
  plus a lucid/unmed bus crossfade and is the biggest remaining gap.
- **Orderly presentation is greybox.** The marionette gait, the head-cock,
  the frozen anim clock while paused, and the translucent sight cone are not
  yet ported. The cone in particular is a real gameplay affordance while
  unmed, not decoration.
- **Rooms 5/6/7 need playtesting** against the NavAgent change (§2.2).
- **A/B experiments framework** (`src/game/experiments.ts`) is not ported;
  `Telemetry` reserves the `experiment`/`variant` payload fields for it.
- **No map viewer.** `/map.html?room=<id>` has no Godot equivalent; the
  editor partly covers it, but patrol paths and sight envelopes are not
  visualised.
- **Randomize-codes** is wired per-room but the start-screen toggle that
  drives `WardCodes.is_randomize_codes_enabled()` has no UI yet.
- **`big: true` on scrawls** is not expressed by the generator — affects
  relative scrawl sizing in rooms 2–7.
- **Rooms 8–20 are not ported.** Room 7 exits to `END`; restore the
  `("room8", ...)` exit in `gen_rooms.py` when the rest of the ward lands.
  Rooms 8+ need the kit features this pass skipped: triggers, shape locks,
  light switches, verticality and stacked levels.
