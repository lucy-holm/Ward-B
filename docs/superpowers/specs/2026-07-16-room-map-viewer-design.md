# Room map viewer — design

**Date:** 2026-07-16
**Status:** approved (design), pending implementation

## Purpose

A dev-only, top-down 2D view of any room's geometry so rooms can be iterated
on by editing their `.ts` source and watching the map update on save —
without launching or replaying the game. The room files are already pure
data (`RoomDef`), and the Vite dev server already reloads on save; this tool
is the missing render target.

## Constraints

- **Zero impact on the shipped game.** The viewer must not appear in the
  itch.io bundle, must not change any room's runtime behavior, and must not
  spawn scripts/orderlies/THREE scenes.
- **No new dependencies.** Plain TypeScript emitting SVG.
- **Live loop:** save a room file → browser reflects it in ~100ms via Vite's
  reload. No manual export/import step, ever.

## Files

| File | Role |
|---|---|
| `map.html` (repo root) | Shell: room selector, layer checkboxes, `<svg>` viewport. **Not** added to Vite's `rollupOptions.input`, so `npm run build` (which defaults to `index.html` only) never bundles it — dev-only by construction. |
| `src/devtools/map.ts` | All viewer logic (~250 lines): room registry (defs only), SVG rendering, layer toggles, URL state. |
| `src/devtools/map-types.ts` | The `DebugPatrol` type, so room files never import viewer code. |
| 8 orderly room files (room4–8, 10–13) | One-line addition each: `export const debugPatrols: DebugPatrol[] = [...]`. |

### `DebugPatrol`

```ts
export interface DebugPatrol {
  waypoints: { x: number; z: number }[];
  sightRange?: number; // override, e.g. room13's TUNING.lastWard value
  label?: string;      // e.g. 'lower' / 'upper' for room11
}
```

Purely descriptive data re-exporting consts the room already has
(`WAYPOINTS`, `WAYPOINTS_A/B/C`, `WAYPOINTS_LOWER/UPPER`); no runtime
effect on the game. Rooms without orderlies export nothing.

## Rendering

Top-down SVG, world-accurate, **north (−Z) up** to match the authoring
convention in ROOM_AUTHORING.md §2. ViewBox derived from `RoomDef.floor`
plus margin. A 1m grid over the floor bounds with coordinate labels every
2m on both axes.

Each layer is one `<g>`, toggled by a checkbox (hidden via CSS class):

- **colliders** — filled rects. Always-on gray; `states: 'lucid'` tinted
  blue; `states: 'unmed'` tinted red (soft-lock audit at a glance).
- **blocks** — outlined rects colored by `mat`; dashed outline when the
  block has no collider overlapping its footprint (mesh-only geometry reads
  differently from solid).
- **height zones / ramps** — shaded regions labeled with `y`; ramps get a
  gradient plus an arrow along their axis from `yLow` to `yHigh`.
- **patrols** — per `DebugPatrol`: a distinct color, the waypoint loop as a
  polyline with numbered dots, and a translucent sight-radius band swept
  along each leg (radius = `sightRange` ?? `TUNING.orderly.sightRange`).
  This visualizes the ≥8.2m reaction-time rule when placing scrawls/keypads.
- **spawn / exits** — spawn as an arrow glyph oriented by `yaw`; exits as
  green rects labeled with their `to` room id (or `END`).
- **interactables** — dot + `id` label, colored by `type`.
- **scrawls** — small marker on the wall face showing the first text line.
- **lights** — small yellow circles at each `[x, z]`.

Every element carries a `<title>` tooltip with its exact source coordinates
(e.g. `collider x[-4, -2.35] z[-30, -30]`, `waypoint 2 (1.5, 14)`) so the
line to edit is findable in the room file.

## Data flow

`map.ts` holds its own `Record<string, () => Promise<{ def: RoomDef;
patrols: DebugPatrol[] }>>` registry over dynamic imports — same 13 ids as
main.ts's registry, defs and `debugPatrols` only. **Scripts are never
imported or run.** Room selection and layer toggles persist in the URL
(`?room=room13&layers=...`) so a save-reload returns to the same view.

`patrol()` validation still runs at each room module's import — that is a
feature: a wedged patrol leg surfaces in the viewer as an error, not at
playtest.

## Error handling

Each room loads via a per-room `try/catch` around its dynamic import. A room
whose module throws (patrol validation, typo mid-edit) is listed in the
selector as broken and, when selected, shows the error text in the viewport
instead of a map. Other rooms stay browsable; the page never white-screens.

## Testing / verification

1. `npm run build` passes and `dist/` contains no `map.html` or devtools
   chunk (proves dev-only).
2. Existing type-check (`npm run build` runs tsc) covers the new files and
   the 8 room-file edits.
3. Manual: open `localhost:5173/map.html`, step through all 13 rooms
   confirming each renders with correct bounds; toggle every layer; edit one
   coordinate in `room13.ts` and confirm the map reflects it on save;
   confirm `?room=` survives the reload.

## Out of scope (deliberately)

- Editing from the map (it is a viewer; the .ts file stays the source of
  truth).
- Rendering `RoomScript` behavior: door swings, moving walls (room13's
  slabs render at their initial `startGapM` bounds), phase-gated changes.
- Sight *cones* / facing simulation — the swept sight-radius band is a
  conservative envelope, not a per-frame cone.
- Multi-room composite view; one room at a time via the selector.
