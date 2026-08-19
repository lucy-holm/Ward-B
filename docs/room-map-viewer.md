# The room map viewer (Three.js build)

> **Which engine?** This viewer renders rooms from the **Three.js** source in
> `src/rooms/`. The Godot build has its own, separate viewer — see
> [`godot/ROOM_AUTHORING_GODOT.md`](../godot/ROOM_AUTHORING_GODOT.md) §8. The
> two read different sources and are not interchangeable.

A dev-only, top-down 2D plan view of any room, rendered as SVG straight from
the room's TypeScript source. It exists so you can edit coordinates in
`src/rooms/roomN.ts` and *see* the room — walls, patrols, sight coverage,
fixture placement — without launching or replaying the game.

## Quick start

```bash
npm run dev
```

Then open **http://localhost:5173/map.html** in any browser. That's it —
there is no build step, no export, no plugin. The viewer imports the room
files directly through Vite.

**The live loop:** save any room `.ts` file and the map page reloads itself
in ~100 ms showing the change. Edit → save → glance. The URL keeps your
room and layer selection across reloads, so the page always comes back to
what you were looking at.

## Live preview in a VS Code pane

The best setup for iterating: the room file in one editor pane, the map in
another, updating on every save.

1. Start the dev server (`npm run dev`) in the integrated terminal and
   leave it running.
2. Open the Command Palette (`⇧⌘P`) → **"Simple Browser: Show"**.
3. Enter the URL, e.g. `http://localhost:5173/map.html?room=room13`.
4. Drag the Simple Browser tab to the right half of the window (or use
   `View: Split Editor Right` first, then open Simple Browser while the
   right group is focused).

Now edit `src/rooms/room13.ts` in the left pane — every save reloads the
right pane with the updated plan. Because the room id is in the URL, the
reload lands back on the room you're editing.

Notes:

- Simple Browser is built into VS Code — no extension needed. It's a plain
  webview, which is fine here (the viewer is a static SVG page; hover
  tooltips and checkboxes all work).
- If you prefer a real browser, a normal Chrome/Safari window snapped next
  to VS Code does the same job; the page reloads itself either way.
- On another device (iPad next to the keyboard, say): run
  `npm run dev -- --host` and open the tailnet address Vite prints,
  plus `/map.html`.

## Reading the map

Orientation: **north (−Z) is up**, matching the authoring convention in
ROOM_AUTHORING.md §2 (spawn at the high-Z south end, exit door at the low-Z
north end — so a room reads bottom-to-top in play order). The grid is 1 m
with coordinate labels every 2 m. **Hover anything** for a tooltip with its
exact source values (e.g. `collider x[-4, -2.35] z[-30.12, -29.88]`) — the
numbers you'd grep for in the room file.

Layers, top panel checkboxes, all on by default:

| Layer | Drawn as | Reading it |
|---|---|---|
| grid | 1 m lines, labels every 2 m, `N (−Z)` marker | Coordinate reference |
| height zones / ramps | blue-grey regions labeled `y=…`; green ramp regions with an arrow from `yLow` to `yHigh` | room11-style verticality |
| colliders | filled rects — **grey** = always-on, **blue** = lucid-only, **red** = unmed-only | Walls read as thick lines (0.24 m). Red geometry is the soft-lock class: check an unmed player can't be sealed in |
| blocks (mesh) | outlined rects colored by material; **dashed** = no matching collider under the footprint (in the block's state) | Dashed things look solid in-game but aren't — sometimes intended (decor), sometimes a bug |
| patrols + sight | one color per orderly: thin loop, numbered waypoint dots, and a translucent band | The band is everything within sight range of the route (6 m base; room13's override draws visibly fatter). Keep scrawls/keypads ≥ 8.2 m from patrol legs per the reaction-time rule (ROOM_AUTHORING §4) |
| spawn / exits | yellow arrow (points where the player faces); green rects labeled `→ roomN` / `→ END` | |
| interactables | colored dots + id labels — blue dispenser, orange keypad, yellow door, white pills | The id label matches the `id:` field in the room file |
| scrawls | pink dots + the first line of the text in italics | |
| lights | small yellow dots | |

The layer set is also in the URL (`?room=room12&layers=grid,patrols`), so a
bookmark can capture a specific view — handy for comparing two rooms with
identical layers.

## Jumping straight to a room in the game

Don't confuse this with the map viewer above — this is the actual game.
Opening the game itself (not `/map.html`) with `?room=<id>`, e.g.
`http://localhost:5173/?room=room9`, boots straight into that room instead
of replaying from room1 — click through the start overlay as usual and
you land there. It works in every build (dev server, tailnet, GitHub
Pages), so it's a fast way to playtest a specific room without replaying
the whole game. An unrecognized or missing `room` value falls back to
room1 silently. Jumping to any room past room1 also grants the shift
ability and a full pill, since normally both come from the room1
tutorial.

## When a room breaks

The viewer loads every room independently. If a room file throws at import
— a mid-edit typo, or the kit's `patrol()` validator rejecting a waypoint
that wedges an orderly against a collider — that room shows as
`roomN — ⚠ broken` in the selector, and selecting it displays the actual
error message (including the validator's explanation of which leg is too
close to what). Every other room stays browsable, and the page recovers on
the next save that fixes the file. Draw-time errors (bad-but-importable
data) are caught the same way. The page never white-screens mid-edit.

This makes the viewer a cheap pre-playtest check: if it renders and no room
is flagged broken, the patrol-clearance bug class can't have shipped.

## What it deliberately does not show

The viewer renders `RoomDef` **data**, never runs `RoomScript` **behavior**:

- No orderlies are spawned; you see routes, not moving actors.
- The sight band ignores facing — it's the conservative envelope (everywhere
  the orderly *could* see standing anywhere on his route), not a per-frame
  cone simulation.
- Scripted geometry changes don't play out: doors draw closed, and room13's
  moving wall slabs draw at their full starting width.
- One room at a time; no editing from the map — the `.ts` file stays the
  single source of truth.

## Adding a new room to the viewer

Two touch points, both one-liners:

1. **Register the def** in the `MODULES` map in `src/devtools/map.ts`
   (same id you registered in `main.ts` — the viewer relies on the room
   exporting its def under its own id, e.g. `export const room14: RoomDef`).
2. **If the room has orderlies**, export the patrols at the end of the room
   file so the viewer can draw them:

   ```ts
   import type { DebugPatrol } from '../devtools/map-types';
   // ...
   export const debugPatrols: DebugPatrol[] = [
     { waypoints: WAYPOINTS_A, label: 'A' },
     { waypoints: WAYPOINTS_B, label: 'B', sightRange: 9 }, // override if the room overrides Orderly's
   ];
   ```

   This is descriptive data only — the game never reads it, and it
   tree-shakes out of the production bundle. See any orderly room's last
   lines (room4–8, 10–13) for the pattern.

## Dev-only guarantee

`map.html` is not in Vite's build input (which is `index.html` only), so
`npm run build` cannot include the viewer: no `map.html` in `dist/`, and
everything under `src/devtools/` plus the `debugPatrols` exports is
tree-shaken from the game bundle. Nothing about the shipped game changes
byte-for-byte. If you want to re-verify after touching the build config:

```bash
npm run build
ls dist/map.html 2>/dev/null || echo "not shipped ✔"
grep -rl debugPatrols dist/assets/ || echo "tree-shaken ✔"
```

## Troubleshooting

- **Blank page / connection refused** — the dev server isn't running, or
  Vite picked a different port because 5173 was busy (it prints the actual
  port on startup; use that one).
- **Map doesn't update on save** — confirm you saved the room file (the
  terminal running Vite logs a reload) and that the browser tab is pointed
  at the dev server, not `npm run preview` or the public URL.
- **A room shows ⚠ broken** — that's the viewer doing its job: select it,
  read the error text, fix the room file, save.
- **Everything invisible** — check the layer boxes; a URL with
  `layers=` (empty) turns every layer off.
