---
name: adding-a-room
description: Use when adding a new room/level to the THREE.JS build of Ward B (anything under src/), inserting a room into the game sequence, rewiring room order/exits, or when a room change needs wiring and verification (registration, patrols, keypad codes, map viewer). Use adding-a-room-godot instead for the Godot build under godot/.
---

# Adding a Room to Ward B (Three.js)

> **Which engine?** This repo ships two builds. This skill covers the
> **Three.js** build under `src/`. For the **Godot** build under `godot/`,
> use the `adding-a-room-godot` skill instead — the workflow is genuinely
> different (rooms are authored in a Python DSL, not the editor, and not in
> TypeScript). Editing the wrong build is the most common way to make a
> change that appears to do nothing.

## Overview

Rooms are pure-data `RoomDef`s + a `RoomScript`, authored with the kit in
`src/rooms/kit.ts`. **ROOM_AUTHORING.md (repo root) is the authoritative
reference** — this skill is the workflow and the wiring you'd otherwise
forget. Read the design side first: use the `designing-a-room` skill before
deciding what goes in the room.

## Workflow

1. **Crib, don't derive.** Start from the closest exemplar, not from
   scratch: `room11.ts` (kit showcase: `keypadDoor` + verticality +
   `patrol`), `_kitcheck.ts` (every kit helper in one demo room),
   `room7.ts`/`room8.ts` (hand-written orderly scripts, 1 and 2 orderlies).
   ROOM_AUTHORING.md §3 shows raw-vs-kit side by side; §2 has the
   coordinate conventions (spawn at +z/south, content at −z/north).
2. **Author with the kit** — `RoomBuilder`, `dispenser()`, `scrawl()`,
   `keypadDoor()`, `patrol()`, `makeOrderlyRoomScript()`. §7 is the API
   reference. `patrol()` throws at import if a leg wedges the orderly
   against a collider — that's it working; fix the geometry, don't bypass.
3. **Keypad room? Wire randomize-codes.** Mandatory — the start-screen
   toggle silently skips unwired rooms. Full pattern: ROOM_AUTHORING.md §4,
   last checklist item. With `makeOrderlyRoomScript`, put `regenerateCode`
   in `extraScript.onEnter` and `extraScript.onCaught` — do NOT hand-write
   the orderly script just to get a catch hook; the factory has both hooks.
4. **Register in all three places** (miss one and it fails at runtime or
   in the viewer, not at compile time):
   - `src/main.ts` — import + `rooms` record entry
   - `src/devtools/map.ts` — `MODULES` registry entry
   - the upstream room's `exits: [{ to: '<your-id>' ... }]`
   - orderly rooms: `export const debugPatrols: DebugPatrol[]`
5. **Verify — in this order, all three:**
   - `npm run check:rooms` — imports every room (runs `patrol()`
     validators), checks ids, exit chain, all three registries,
     `debugPatrols`. **Never build a custom node harness to execute room
     modules — this script is that harness.**
   - `npm run build` — tsc + vite.
   - `npm run dev` → `http://localhost:5173/map.html?room=<id>` — eyeball
     geometry, patrol sight envelopes, fixture placement. Import errors
     show in the viewer's error box.

## Common mistakes

| Mistake | Fix |
|---|---|
| Registered in `main.ts` but not `map.ts` (or vice versa) | `check:rooms` catches both |
| Scrawl embedded inside wall (invisible) | use `scrawl()` — it computes proud-of-face; hand-placed: face ± 0.03 |
| Dispenser/keypad facing into its mount wall | pin `facing:` explicitly for alcove/nook mounts (§4) |
| Hand-writing orderly boilerplate for a catch/enter hook | `makeOrderlyRoomScript` `extraScript.onCaught`/`.onEnter` |
| Reusing a 4-digit code | grep existing `FIXED_CODE` values first |
| `states:'unmed'`-sealed pocket with no reachable dispenser | soft-lock — see `designing-a-room` laws |
| Committing without being asked / pushing | pushing publishes to GitHub Pages; never push unless Tom says |
