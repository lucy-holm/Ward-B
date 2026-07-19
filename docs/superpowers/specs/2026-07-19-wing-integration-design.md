# The New Wing — rooms 14–20 integration overview

Companion to the six per-mechanic specs written the same day. Those own their
rooms' internals; this doc owns the seams: sequence, rewiring, the combined
engine-work inventory, shared-file coordination, and the cross-spec flags a
per-room author can't see.

The six specs:

| Spec | Rooms | Mechanic |
|---|---|---|
| `2026-07-19-room14-pressure-plates-design.md` | 14 "the Hold" | trigger volumes / pressure plates |
| `2026-07-19-room15-shape-keys-design.md` | 15 | colored-shape key collection |
| `2026-07-19-room16-light-axis-design.md` | 16 "the Breaker Bay" | switchable light as a second state axis |
| `2026-07-19-stacked-floors-room17-design.md` | 17 "the Gallery Ward" | true stacked floors (engine upgrade) |
| `2026-07-19-rooms18-19-cross-room-wiring-design.md` | 18 "the Relay Room" / 19 "the Undercroft" | persistent cross-room state |
| `2026-07-19-room20-pushable-blocks-design.md` | 20 | sokoban-lite pushable block (wing capstone, new END) |

## 1. Sequence and rewiring

Play order: `room13 → 14 → 15 → 16 → 17 → 18 → 19 → 20 → END`.

- `room13.ts`: its one exit changes `{ to: 'END' }` → `{ to: 'room14' }`.
  Nothing else in room13 changes.
- `room20`: its exit is the new `{ to: 'END' }` — the game's ending beat
  moves there (see its spec's finale section).
- Each new room registers per the `adding-a-room` skill: `main.ts` registry,
  map viewer registry, `check:rooms`, `debugPatrols` exports where orderlies
  exist. Rooms 18/19 additionally need `main.ts`'s registry to accept the
  `RoomEntry` union (static `RoomDef` | `build(flags)` factory) their spec
  defines.

Difficulty arc (mirrors the main game's shape in miniature): 14 teach-valley
after room13's brutality → 15/16 single-mechanic escalation → 17 the spike
(new engine, three orderlies, two levels) → 18/19 a breather built on one
irreversible choice → 20 capstone that composes plates + cover + pushing.

Seam audit (each room's own spec carries the full version): every room
handles a worst-case 0-pill arrival in either ward state; 14, 16, 18 and 20
audit it explicitly, 15 assumes a topped-off arrival from 14 but survives
without it, 17 forces unmed at its threshold like rooms 11/12 do. No seam
depends on the previous room's exit state — the 45s timer can expire in any
vestibule without stranding anyone.

## 2. Narrative framing (open — Tom's call)

Room13 is currently the epilogue: "the Last Ward," ending at `END`. A wing
after it needs a framing beat — the door that should have been the way out
opens onto more building. One cheap, on-voice option: room14's entry toast
does the work ("the last ward wasn't. of course it wasn't."). No engine
implications either way; flagged as the wing's first open question rather
than decided here.

## 3. Combined engine-work inventory

Union of the six specs' engine sections. Details live in the owning spec;
this is the collision map.

**`src/rooms/types.ts`** — new `TriggerDef` + `RoomDef.triggers` (14);
`InteractableType` grows `'shape_key' | 'shape_lock'` (15), `'switch'` (16),
`'push_block'` (20); `ShapeSpec`/`IconPanelDef` + `RoomDef.iconPanels` (15);
`LightFilter` on block/scrawl/interactable + `RoomDef.startDark` (16);
`LevelDef`/`StairwellDef`/`RoomDef.levels`/`ceilingY` + `ColliderDef.level`
(17). `MatName` grows `'plate'` (14), `'phosphor' | 'breaker'` (16).

**`src/game/context.ts` / room-script surface** — `onTriggerEnter/Exit`
callbacks (14); `updateIconPanel` (15); `isRoomDark`/`setRoomDark` (16);
`ctx.flags` backed by new `src/game/flags.ts` (18/19); level-aware
`playerPos`/`teleportPlayer` (17).

**`src/game/world.ts`** — plate material (14); icon-panel canvas rewrite,
same machinery as `updateScrawlText` (15); light group-swap + `Renderer`
dark mode (16); the multi-level grounding/collision rework (17).

**`src/game/orderly.ts`** — per-orderly `level` + the hard cross-level
LOS gate (17). Nothing else touches this file; 16 deliberately leaves sight
math alone and 20 reuses the existing occluder/collider lists by identity.

**`src/main.ts`** — trigger polling beside `checkExits()` (14); `RoomEntry`
union resolution (18/19); player-level tracking (17).

**`src/devtools/map.ts`** — new layers: triggers (14), icon panels (15),
switch/dark badges (16), level selector + stairwells (17), push blocks (20).

**`src/rooms/kit.ts`** — helpers per spec: `pressurePlate`/`inTrigger` (14),
`shapeKeyProp`/`iconPanel`/`shapeLockDoor` (15), `stairwell`/`level` (17).

No two specs redefine the same symbol; the merges above are additive. The
one behavioral overlap to honor at build time: 17's level tags and 20's
mutable colliders both flow through the same collider lists that orderlies
consume — room13's exclude-moving-colliders-by-identity lesson applies to
both, and each spec states it independently.

## 4. Build plan shape

Six milestones, one per spec, in this order — chosen so each lands
playable on the tailnet before the next starts, and the long pole starts
early:

1. **M10** trigger volumes + room14 (smallest engine footprint; opens the
   wing so everything after it is reachable in playtests)
2. **M11** shape keys + room15
3. **M12** light axis + room16
4. **M13** stacked floors + room17 — the big one; can begin its engine half
   in parallel with M11/M12 since it touches `world.ts` far deeper than
   they do, but must land after them to keep merges one-directional
5. **M14** flag store + rooms18/19
6. **M15** push block + room20 + the new END beat

Worker layout per Tom's established workflow: parallel Sonnet workers with
strict per-file ownership. The shared files above (`types.ts`, `kit.ts`,
`world.ts`, `context.ts`, `main.ts`, `map.ts`) are coordinator-owned in
every milestone; workers own their `roomN.ts` and nothing shared.

## 5. Cross-spec flags for Tom's review

1. **Room16 still ends on a 4-digit keypad** (digits split across the
   lit-ink and dark-phosphor scrawls). The 2×2 light grid is the room's
   substance, but if the wing's point is "no more pins," its lock could be
   re-skinned (e.g. the shape lock from 15, or the breaker itself as the
   lock). If the keypad stays, it MUST wire `regenerateCode` per the
   randomized-codes spec — new keypad rooms that skip it silently break the
   CONFIGURATION toggle.
2. **Rooms 18/19's irreversible lever creates the game's first permanent
   fork.** Both branches are audited solvable, but it's a genuine
   replayability-vs-anxiety tradeoff — the loop alternative is sketched in
   that spec if Tom prefers reversibility.
3. **Catch semantics stay uniform wing-wide** (forced lucid + teleport +
   pills kept; keys kept in 15; crate re-racked in 20; `setRoomDark(false)`
   in 16). The one divergence is 20's re-rack — a catch there *undoes*
   block progress by design. Worth a playtest eye.
4. **Each spec ends with its own open-questions list** (5–6 each) — those
   are the per-room decisions; nothing in them blocks another spec.
