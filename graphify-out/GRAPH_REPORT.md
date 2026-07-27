# Graph Report - Ward-B  (2026-07-27)

## Corpus Check
- 66 files · ~140,861 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 976 nodes · 1782 edges · 65 communities (58 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.6)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7ee50f5d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GameCtx
- orderly.ts
- kit.ts
- map.ts
- world.ts
- PART 1 — Engine: true stacked floors
- main.ts
- The room map viewer
- Part 1 — engine: light as a state axis
- Rooms 18–19 — "the Relay Room" / "the Undercroft": cross-room wiring
- Part 2 — Room 14: "the Hold"
- package.json
- room15.ts
- room17.ts
- ColliderDef
- Hud
- Room 20 — "the Loading Bay": sokoban-lite blocks, wing capstone, new END
- compilerOptions
- Room 15 — "the Sorting Room": shape keys
- World
- types.ts
- RoomBuilder
- room12.ts
- room5.ts
- room11.ts
- room2.ts
- room8.ts
- isRandomizeCodesEnabled
- resolveFacing
- room10.ts
- room14.ts
- room19.ts
- check-rooms.mjs
- AudioEngine
- .loadRoom
- room16.ts
- room18.ts
- room13.ts
- Room 13 — "the Last Ward": lucid isn't safe either
- Room map viewer — design
- context.ts
- renderer.ts
- Flags
- room6.ts
- Room Map Viewer Implementation Plan
- M10: Trigger Volumes + Room 14 "the Hold" Implementation Plan
- _kitcheck.ts
- Design notes the implementer must understand first
- Input
- WardState
- Randomized keypad codes — design
- The New Wing — rooms 14–20 integration overview
- StateSystem
- settings.ts
- Designing a Ward B Room
- Telemetry
- addEdgeGrime
- Ward B
- Adding a Room to Ward B
- collision.ts
- patrol
- ShapeLockDoorLock
- room3.ts
- room1.ts

## God Nodes (most connected - your core abstractions)
1. `GameCtx` - 50 edges
2. `ColliderDef` - 37 edges
3. `Orderly` - 33 edges
4. `RoomDef` - 30 edges
5. `RoomScript` - 30 edges
6. `RoomBuilder` - 29 edges
7. `World` - 26 edges
8. `WardState` - 24 edges
9. `isRandomizeCodesEnabled()` - 23 edges
10. `Hud` - 22 edges

## Surprising Connections (you probably didn't know these)
- `makeKeypadGridTexture()` --indirect_call--> `label()`  [INFERRED]
  src/game/world.ts → src/devtools/map.ts
- `GameCtx` --references--> `AudioEngine`  [EXTRACTED]
  src/game/context.ts → src/engine/audio.ts
- `updateMedication()` --calls--> `circleHitsSolidUnmed()`  [EXTRACTED]
  src/main.ts → src/engine/collision.ts
- `GameCtx` --references--> `Flags`  [EXTRACTED]
  src/game/context.ts → src/game/flags.ts
- `GameCtx` --references--> `StateSystem`  [EXTRACTED]
  src/game/context.ts → src/game/state.ts

## Import Cycles
- 3-file cycle: `src/engine/audio.ts -> src/rooms/types.ts -> src/game/context.ts -> src/engine/audio.ts`
- 3-file cycle: `src/game/context.ts -> src/game/state.ts -> src/rooms/types.ts -> src/game/context.ts`
- 3-file cycle: `src/game/context.ts -> src/ui/hud.ts -> src/rooms/types.ts -> src/game/context.ts`

## Communities (65 total, 7 thin omitted)

### Community 0 - "GameCtx"
Cohesion: 0.05
Nodes (22): GameCtx, Interaction, KeypadDoorLock, crateCollider, debugPatrols, GATE1_CLOSED_POS, GATE1_OPEN_POS, gate1Collider (+14 more)

### Community 1 - "orderly.ts"
Cohesion: 0.06
Nodes (22): BODY, buildSightCone(), buildTaperedLimb(), buildUnmedBody(), CONE_FADE_TEXTURE, disposeGroup(), EYE_GAUZE_TEXTURE, lerpAngle() (+14 more)

### Community 2 - "kit.ts"
Cohesion: 0.08
Nodes (27): AxisSign, DEFAULT_SHAPE_KEY_SIZE, dispenser(), DISPENSER_FOOTPRINT, facingOf(), FixtureFacing, iconPanel(), keypad() (+19 more)

### Community 3 - "map.ts"
Cohesion: 0.15
Nodes (33): blockHasCollider(), drawBlocks(), drawColliders(), drawGrid(), drawHeight(), drawIconPanels(), drawInteractables(), drawLights() (+25 more)

### Community 4 - "world.ts"
Cohesion: 0.07
Nodes (29): BED_TEX, BREAKER_TEX, CAPSULE_CAP_MAT, CEIL_BASE_RGB, CHAIN_TEX, clamp255(), DISPENSER_TEX, DISPENSER_TRAY_MAT (+21 more)

### Community 5 - "PART 1 — Engine: true stacked floors"
Cohesion: 0.07
Nodes (28): 1.10 `/map.html` dev viewer (`src/devtools/map.ts`, `map-types.ts`), 1.11 Files touched (implementation-plan scope), 1.12 Open engineering questions, 1.1 Why the current model can't do this, 1.2 New data model, 1.3 Level resolution (player only — see 1.5 for why not orderlies), 1.4 Collision, 1.5 Orderlies: fixed level, hard LOS gate (+20 more)

### Community 6 - "main.ts"
Cohesion: 0.09
Nodes (27): resolveLevel(), activeTriggers, AnyRoomScript, audio, checkExits(), clock, completeRoom(), ctx (+19 more)

### Community 7 - "The room map viewer"
Cohesion: 0.07
Nodes (25): Adding a new room to the viewer, Commands, Dev-only guarantee, Jumping straight to a room in the game, Live preview in a VS Code pane, Quick start, Reading the map, The room map viewer (+17 more)

### Community 8 - "Part 1 — engine: light as a state axis"
Cohesion: 0.08
Nodes (25): Dispenser placement (pressure rule), Full list of files touched (Part 1), `GameCtx` additions (`src/game/context.ts`), Intended-solve walkthrough, exact pill economy, `Interaction` (`src/game/interaction.ts`), `main.ts`, Open questions for Tom, Orderly sight: unaffected, and why that's not a cop-out (+17 more)

### Community 9 - "Rooms 18–19 — "the Relay Room" / "the Undercroft": cross-room wiring"
Cohesion: 0.08
Nodes (24): 10. Voice samples, 1. Player-experience summary, 2.1 Persistent flag store — `src/game/flags.ts` (new file), 2.2 `GameCtx` — one new field (`src/game/context.ts`), 2.3 Reset story, 2.4 Flag-driven geometry — the `RoomDef | build fn` room-registry entry, 2.5 Devtool/build-script touch points (files touched, not authored here), 2.6 New `InteractableType`? — recommend reuse, not a new type (+16 more)

### Community 10 - "Part 2 — Room 14: "the Hold""
Cohesion: 0.10
Nodes (19): Composition with existing systems, Dispenser placement (pressure rule), Full list of files touched (part 1), Intended-solve walkthrough, with exact pill economy, `/map.html`, Open questions for Tom, Part 1 — engine: a trigger-volume primitive, Part 2 — Room 14: "the Hold" (+11 more)

### Community 11 - "package.json"
Cohesion: 0.10
Nodes (19): dependencies, three, devDependencies, @types/three, typescript, vite, name, private (+11 more)

### Community 12 - "room15.ts"
Cohesion: 0.10
Nodes (18): ALL_OCCLUDERS, debugPatrols, EscalationCfg, ESCALATIONS, KEY_IDS, LEG2_A, LEG2_B, LEG2_C (+10 more)

### Community 13 - "room17.ts"
Cohesion: 0.11
Nodes (16): level(), stairwell(), BALCONY_ZONE, balconyColliders, codeScrawls, debugPatrols, groundColliders, lock (+8 more)

### Community 14 - "ColliderDef"
Cohesion: 0.12
Nodes (16): OrderlyAABB, OrderlyOptions, MakeOrderlyRoomScriptCfg, OrderlyCfg, BranchCfg, debugPatrols, doorCollider, ORDERLY_COLLIDERS (+8 more)

### Community 16 - "Room 20 — "the Loading Bay": sokoban-lite blocks, wing capstone, new END"
Cohesion: 0.12
Nodes (16): 10. Open questions for Tom, 1. Player-experience summary, 2. Engine additions, 2a. `InteractableType` — one new member, 2b. `PushBlockDef` — the authoring-time shape, 2c. Grid, cell size, and the "walk into it + interact" push rule, 2d. Orderly interaction: occluder yes, movement-collider no, 2e. What `/map.html` draws — no changes required, one nice-to-have (+8 more)

### Community 17 - "compilerOptions"
Cohesion: 0.12
Nodes (16): DOM, DOM.Iterable, ES2020, src, vite/client, compilerOptions, lib, module (+8 more)

### Community 18 - "Room 15 — "the Sorting Room": shape keys"
Cohesion: 0.12
Nodes (15): Dispenser placement (pressure rule), Engine additions, Fixtures, Intended-solve walkthrough — exact pill economy, Kit helper signatures (for `src/rooms/kit.ts`), Open questions for Tom, Orderlies, Player-experience summary (+7 more)

### Community 19 - "World"
Cohesion: 0.17
Nodes (6): disposeObject3D(), paintTvStatic(), World, LevelDef, LightFilter, StairwellDef

### Community 20 - "types.ts"
Cohesion: 0.14
Nodes (13): FixtureDef, IconPanelOpts, PlateDef, BlockDef, ExitDef, HeightZone, InteractableDef, InteractableType (+5 more)

### Community 21 - "RoomBuilder"
Cohesion: 0.21
Nodes (12): RoomBuilder, FixtureOpts, KeypadDoorOpts, PlateOpts, railingBlock(), slab(), tallWallZ(), upperBandX() (+4 more)

### Community 22 - "room12.ts"
Cohesion: 0.12
Nodes (14): debugPatrols, doorCollider, ISLAND_C, NOOK_C, NOOK_HALL, ORDERLY_COLLIDERS, PILLAR_1, PILLAR_2 (+6 more)

### Community 23 - "room5.ts"
Cohesion: 0.15
Nodes (12): LoadedRoom, DebugPatrol, Built, debugPatrols, doorCollider, ISLAND, ORDERLY_COLLIDERS, rb (+4 more)

### Community 24 - "room11.ts"
Cohesion: 0.13
Nodes (12): heightZone(), ramp(), debugPatrols, lock, ORDERLY_COLLIDERS, PLATFORM, PLATFORM_RAMP, rb (+4 more)

### Community 25 - "room2.ts"
Cohesion: 0.18
Nodes (12): doorCollider, rb, room2, room2Script, doorCollider, rb, room9, room9Script (+4 more)

### Community 26 - "room8.ts"
Cohesion: 0.13
Nodes (13): ALCOVE_N, ALCOVE_S, debugPatrols, doorCollider, ISLAND, OCCLUDERS, ORDERLY_COLLIDERS, PROP_WEST (+5 more)

### Community 27 - "isRandomizeCodesEnabled"
Cohesion: 0.44
Nodes (13): isRandomizeCodesEnabled(), codeClueText(), randomCode4(), regenerateCode(), regenerateCode(), regenerateCode(), regenerateCode(), regenerateCode() (+5 more)

### Community 28 - "resolveFacing"
Cohesion: 0.22
Nodes (14): buildDispenser(), buildDoor(), buildKeypad(), buildShapeLock(), buildSwitch(), doorPlateText(), explicitFacing(), faceOffset() (+6 more)

### Community 29 - "room10.ts"
Cohesion: 0.14
Nodes (12): ALCOVE_B, debugPatrols, doorCollider, ISLAND_A, NOOK_A, NOOK_B, ORDERLY_COLLIDERS, rb (+4 more)

### Community 30 - "room14.ts"
Cohesion: 0.14
Nodes (12): CRATE, debugPatrols, GATE_CLOSED_POS, GATE_OPEN_POS, gateCollider, ORDERLY_COLLIDERS, plate, rb (+4 more)

### Community 31 - "room19.ts"
Cohesion: 0.14
Nodes (12): BRANCH, buildRoom19(), debugPatrols, DOORS, LIGHTS, PLATFORM, PLATFORM_AABB, RAMP1 (+4 more)

### Community 32 - "check-rooms.mjs"
Cohesion: 0.15
Nodes (11): chain, defs, failures, INFRA, mainSrc, mapSrc, roomFiles, roomsDir (+3 more)

### Community 34 - ".loadRoom"
Cohesion: 0.17
Nodes (10): buildCapsuleMesh(), buildPillCup(), buildPillPickup(), buildShapeKey(), buildShapeKeyGlyph(), CEIL_BASE_TEX, classifyGlowBlock(), FLOOR_BASE_TEX (+2 more)

### Community 35 - "room16.ts"
Cohesion: 0.17
Nodes (12): debugPatrols, DOOR_CLOSED_POS, DOOR_OPEN_POS, exitCollider, inChargeZone(), inNook(), NOOK_E, NOOK_W (+4 more)

### Community 36 - "room18.ts"
Cohesion: 0.15
Nodes (12): CONSOLE, debugPatrols, DOOR_CLOSED_POS, DOOR_OPEN_POS, doorCollider, NOOK, rb, room18 (+4 more)

### Community 37 - "room13.ts"
Cohesion: 0.17
Nodes (10): debugPatrols, MOUTH, ORDERLY_COLLIDERS, rb, room13, Room13Script, wallEastCollider, wallWestCollider (+2 more)

### Community 38 - "Room 13 — "the Last Ward": lucid isn't safe either"
Cohesion: 0.18
Nodes (10): Explicitly out of scope, Open implementation questions (for the planning phase, not blocking approval), Pill economy: no entry dispenser, Placement in the game, Room 13 — "the Last Ward": lucid isn't safe either, Room layout, The closing-walls hazard, The dilemma (+2 more)

### Community 39 - "Room map viewer — design"
Cohesion: 0.18
Nodes (10): Constraints, Data flow, `DebugPatrol`, Error handling, Files, Out of scope (deliberately), Purpose, Rendering (+2 more)

### Community 40 - "context.ts"
Cohesion: 0.33
Nodes (3): ShiftResult, Snapshot, TUNING

### Community 41 - "renderer.ts"
Cohesion: 0.22
Nodes (4): makeGrainDataUri(), MoodTarget, moodTargets(), Renderer

### Community 42 - "Flags"
Cohesion: 0.20
Nodes (3): Flags, FlagStore, FlagValue

### Community 43 - "room6.ts"
Cohesion: 0.18
Nodes (9): ALCOVE_E, ALCOVE_W, debugPatrols, doorCollider, ORDERLY_COLLIDERS, rb, room6, Room6Script (+1 more)

### Community 44 - "Room Map Viewer Implementation Plan"
Cohesion: 0.20
Nodes (9): Room Map Viewer Implementation Plan, Self-review notes (already applied), Task 1: `DebugPatrol` type, Task 2: `debugPatrols` exports in the 9 orderly rooms, Task 3: `map.html` shell + viewer bootstrap (registry, selector, URL state, error isolation, floor + grid), Task 4: Geometry layers — colliders, blocks, height zones / ramps, Task 5: Marker layers — spawn/exits, interactables, scrawls, lights, Task 6: Patrol routes + sight envelope (+1 more)

### Community 45 - "M10: Trigger Volumes + Room 14 "the Hold" Implementation Plan"
Cohesion: 0.20
Nodes (8): M10: Trigger Volumes + Room 14 "the Hold" Implementation Plan, Task 1: TriggerDef types + the 'plate' material, Task 3: engine trigger poll in main.ts, Task 4: map viewer triggers layer, Task 5: check-rooms.mjs trigger id validation, Task 6: room14.ts — "the Hold", Task 7: wiring — registries, room13 exit, end card, Task 8: docs + full verification

### Community 46 - "_kitcheck.ts"
Cohesion: 0.20
Nodes (9): makeOrderlyRoomScript(), pressurePlate(), demoPlate, ISLAND, _kitcheckRoom, _kitcheckScript, lock, rb (+1 more)

### Community 47 - "Design notes the implementer must understand first"
Cohesion: 0.22
Nodes (8): Design notes the implementer must understand first, Room 13 "the Last Ward" Implementation Plan, Self-review notes, Task 1: Tuning block, Task 2: The room file, Task 3: Wiring — room 12 exit, rooms map, Task 4: End-of-build card — playtest 9 questions, Task 5: Manual smoke test

### Community 50 - "Randomized keypad codes — design"
Cohesion: 0.29
Nodes (6): Constraints, Files, Non-goals / notes, Per-room pattern, Purpose, Randomized keypad codes — design

### Community 51 - "The New Wing — rooms 14–20 integration overview"
Cohesion: 0.29
Nodes (6): 1. Sequence and rewiring, 2. Narrative framing (open — Tom's call), 3. Combined engine-work inventory, 4. Build plan shape, 5. Cross-spec flags for Tom's review, The New Wing — rooms 14–20 integration overview

### Community 53 - "settings.ts"
Cohesion: 0.33
Nodes (5): current, DEFAULTS, save(), setRandomizeCodes(), Settings

### Community 54 - "Designing a Ward B Room"
Cohesion: 0.33
Nodes (5): Beat catalog — steal from the exemplar, one file each, Designing a Ward B Room, Hard laws (violating these ships a broken room), Overview, Voice

### Community 56 - "addEdgeGrime"
Cohesion: 0.33
Nodes (5): addEdgeGrime(), makeIconPanelTexture(), makeKeypadPlateTexture(), makeShapeLockPlateTexture(), traceShapePath()

### Community 57 - "Ward B"
Cohesion: 0.40
Nodes (4): Commands, Hard rules, Skills — use these instead of spelunking room files, Ward B

### Community 58 - "Adding a Room to Ward B"
Cohesion: 0.40
Nodes (4): Adding a Room to Ward B, Common mistakes, Overview, Workflow

### Community 59 - "collision.ts"
Cohesion: 0.70
Nodes (4): circleHitsSolidUnmed(), isActive(), isActiveOnLevel(), tryMove()

### Community 60 - "patrol"
Cohesion: 0.50
Nodes (5): distPointToAABB(), distPointToSegment(), distSegToAABB(), patrol(), segIntersectsAABB()

### Community 62 - "room3.ts"
Cohesion: 0.40
Nodes (4): doorCollider, rb, room3, room3Script

### Community 63 - "room1.ts"
Cohesion: 0.50
Nodes (3): rb, room1, room1Script

## Knowledge Gaps
- **473 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+468 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GameCtx` connect `GameCtx` to `orderly.ts`, `kit.ts`, `main.ts`, `room15.ts`, `room17.ts`, `ColliderDef`, `Hud`, `types.ts`, `room12.ts`, `room5.ts`, `room11.ts`, `room2.ts`, `room8.ts`, `isRandomizeCodesEnabled`, `room10.ts`, `room14.ts`, `room19.ts`, `AudioEngine`, `room18.ts`, `room13.ts`, `context.ts`, `Flags`, `room6.ts`, `StateSystem`, `Telemetry`, `ShapeLockDoorLock`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `ColliderDef` connect `ColliderDef` to `GameCtx`, `orderly.ts`, `kit.ts`, `map.ts`, `world.ts`, `room15.ts`, `room17.ts`, `World`, `types.ts`, `RoomBuilder`, `room12.ts`, `room5.ts`, `room11.ts`, `room2.ts`, `room8.ts`, `room10.ts`, `room14.ts`, `room19.ts`, `room16.ts`, `room18.ts`, `room13.ts`, `context.ts`, `room6.ts`, `WardState`, `collision.ts`, `ShapeLockDoorLock`, `room3.ts`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `RoomDef` connect `room5.ts` to `GameCtx`, `orderly.ts`, `kit.ts`, `map.ts`, `world.ts`, `main.ts`, `room15.ts`, `room17.ts`, `ColliderDef`, `World`, `types.ts`, `room12.ts`, `room11.ts`, `room2.ts`, `room8.ts`, `room10.ts`, `room14.ts`, `room19.ts`, `.loadRoom`, `room16.ts`, `room18.ts`, `room13.ts`, `room6.ts`, `_kitcheck.ts`, `room3.ts`, `room1.ts`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _473 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `GameCtx` be split into smaller, more focused modules?**
  _Cohesion score 0.05230496453900709 - nodes in this community are weakly interconnected._
- **Should `orderly.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06294326241134751 - nodes in this community are weakly interconnected._
- **Should `kit.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07957957957957958 - nodes in this community are weakly interconnected._