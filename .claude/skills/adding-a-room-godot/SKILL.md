---
name: adding-a-room-godot
description: Use when adding or changing a room in the GODOT build of Ward B (anything under godot/) — new room, room geometry, props, lighting, fixtures, patrols, keypad codes, exits, or room wiring. Use adding-a-room instead for the Three.js build under src/.
---

# Adding a Room to Ward B (Godot)

## Which engine are you in?

This repo ships **two** builds. Get this right first or you will edit the
wrong one and see no effect:

- editing `godot/` → **this skill**
- editing `src/` → the `adding-a-room` skill (Three.js)

`godot/ROOM_AUTHORING_GODOT.md` is the authoritative reference. Read the
`designing-a-room` skill first for the design laws — those are engine-agnostic
and still apply.

## The one thing that trips everyone

**`godot/tools/gen_rooms.py` is the source of truth for room layout. The
`.tscn` files are build output.** A full generator run reproduces all 21
committed scenes byte-for-byte. If you edit a room in the Godot editor, your
change is silently reverted the next time anyone regenerates — no conflict,
no warning.

`MIGRATION_NOTES.md` used to claim the opposite. It was wrong and has been
corrected; if you find any remaining doc that says "author new rooms in the
editor", that doc is stale.

## Workflow

1. **Crib, don't derive.** Start from the closest existing `roomN()` function
   in `tools/gen_rooms.py`. Useful exemplars: `room3()` (simple shell + props),
   `room7()` (orderly + keypad + shelf maze), `room11()` (verticality: zones,
   ramp, mezzanine, railings), `room17()` (stacked levels + stairwells),
   `room15()` (shape lock + icon panel), `room16()` (the light axis),
   `room20()` (pushable crate).
2. **Author geometry in the DSL.** Use the semantic presets where one fits
   (`prop`, `bed`, `island`, `shelf_row`, `railing`, `platform`,
   `stair_steps`, `ward_lights`) and the primitives otherwise (`wall_x`,
   `wall_z`, `block`, `solid`). Never hand-place a wall-mounted fixture —
   derive from `WALL_HALF`, or use the fixture helpers, which do.
3. **Author behaviour in `rooms/roomN/roomN.gd`.** Use the kit
   (`godot/kit/`) rather than hand-rolling: `KitOrderlyRoom` for the orderly
   lifecycle/catch penalty/threat aggregation, `KitKeypadLock` for the
   keypad-door flow, `KitInteractables` for the availability wiring,
   `KitDesign` for the reaction-time and patrol-clearance numbers.
4. **Keypad room? Wire randomize-codes.** Mandatory — the start-screen toggle
   silently skips unwired rooms. Full contract in
   `ROOM_AUTHORING_GODOT.md` §6. `KitKeypadLock` handles it.
5. **Register in three places** (missing one fails at runtime, not at build):
   - `main.gd` `ROOM_SCENES` — keep it a **flat `id -> path` dict**;
     `check_rooms.gd` parses that block as text and a nested value breaks it.
     Variant rooms go in `ROOM_VARIANTS`.
   - the **upstream** room's exit must point at your id
   - `tools/gen_rooms.py`'s `__main__` — a `write_room(roomN())` call, or your
     room never regenerates (this is exactly how `room20` got missed)
6. **Regenerate, then verify — all of these:**
   ```bash
   cd godot && python3 tools/gen_rooms.py
   G=/Applications/Godot.app/Contents/MacOS/Godot
   tools/check_roundtrip.sh                          # scenes match the generator
   $G --headless --path . tools/check_rooms.tscn     # wiring, spawn, exits, patrol clearance
   $G --headless --path . tools/test_mechanics.tscn  # state geometry, trap guard, pill economy
   $G --headless --path . tools/test_kit.tscn        # behaviour kit suite
   ```
   Run as **scenes**, never `--script`: autoloads are not registered for a
   custom SceneTree script and every room needs them.

## Common mistakes

| Mistake | Fix |
|---|---|
| Editing a `.tscn` in the editor | Edit `gen_rooms.py` and regenerate — the scene is output |
| Forgetting `write_room()` in `__main__` | `check_roundtrip.sh` catches it |
| Nesting a value in `ROOM_SCENES` | Breaks `check_rooms.gd`'s text parser — use `ROOM_VARIANTS` |
| Giving a light-gated block a collider | Raises by design — darkness never moves collision; emit the collider separately |
| Putting a collider on a platform slab | Walls the platform off instead of holding it up — slabs carry no collider |
| Hand-rolling orderly spawn/catch/threat code | `KitOrderlyRoom` — 17 rooms already duplicated this |
| Hard-coding "8.2 m" for reaction time | `KitDesign.min_inspection_distance()`, so it re-derives from `Tuning` |
| Judging a state-gated wall from a screenshot | It only shows the mesh — use `tools/check_state_gates.tscn` |
| Committing / pushing unasked | Pushing publishes to GitHub Pages; never push unless Tom says so |
