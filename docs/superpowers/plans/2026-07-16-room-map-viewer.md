# Room Map Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A dev-only, top-down SVG map of any room, served at `/map.html` by the existing Vite dev server, that re-renders on every save of a room `.ts` file.

**Architecture:** `map.html` (repo root, never in Vite's build input, so `npm run build` ignores it) loads `src/devtools/map.ts`, which dynamically imports each room's `RoomDef` (pure data — scripts are never imported, so no orderlies/THREE scene) plus a new one-line `debugPatrols` export from the 9 orderly rooms, and renders the selected room as world-accurate SVG with toggleable layers. Spec: `docs/superpowers/specs/2026-07-16-room-map-viewer-design.md`.

**Tech Stack:** Plain TypeScript + SVG DOM. No new dependencies. Type-checking via the existing `npm run build` (`tsc --noEmit` runs first). No test framework exists in this repo; each task's verification is `tsc` plus a dev-server smoke check, with a full manual walkthrough in the final task.

**Conventions used throughout (from ROOM_AUTHORING.md §2):** Y is up; the map is the XZ plane. North = −Z renders at the **top**: SVG's y axis grows downward, and so does +Z, so `svgY = worldZ` with no flip. All SVG coordinates are in **meters** via `viewBox` (stroke widths and font sizes too); the browser scales to fit.

---

### Task 1: `DebugPatrol` type

**Files:**
- Create: `src/devtools/map-types.ts`

- [ ] **Step 1: Write the file**

This type lives in its own file so room files (game source) never import viewer code — only this type-only module. `import type` erases at compile time, so the game bundle is untouched.

```ts
// Types shared between room files and the dev-only map viewer
// (src/devtools/map.ts). Room files import ONLY this module (type-only),
// never the viewer itself, so nothing viewer-related can reach the game
// bundle.

// One orderly's patrol, re-exported by a room as `debugPatrols` purely for
// the map viewer. Descriptive data only — the game never reads it.
export interface DebugPatrol {
  waypoints: { x: number; z: number }[];
  // Sight-radius override for rooms that pass a custom sightRange to
  // Orderly (room13's TUNING.lastWard.orderlySightRangeM). Absent ⇒ the
  // viewer uses TUNING.orderly.sightRange.
  sightRange?: number;
  // Display label when a room has multiple orderlies ('A'/'B', room11's
  // 'lower'/'upper').
  label?: string;
}
```

- [ ] **Step 2: Type-check**

Run: `cd "/Users/clanker/Developer/Ward B" && npx tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 3: Commit**

```bash
git add src/devtools/map-types.ts
git commit -m "Map viewer: DebugPatrol type shared with room files"
```

---

### Task 2: `debugPatrols` exports in the 9 orderly rooms

**Files:**
- Modify: `src/rooms/room4.ts`, `room5.ts`, `room6.ts`, `room7.ts`, `room8.ts`, `room10.ts`, `room11.ts`, `room12.ts`, `room13.ts`

Each room gets one `import type` line at the top of its import block and one `export const debugPatrols` at the **end of the file** (all waypoint consts are module-level, so end-of-file always sees them). Zero runtime effect: main.ts never imports `debugPatrols`, and the type import erases.

- [ ] **Step 1: Add the import line to all 9 files**

Add to each file's import block (exact same line in every file):

```ts
import type { DebugPatrol } from '../devtools/map-types';
```

- [ ] **Step 2: Add the export to each file's end**

The waypoint const names vary per room — use exactly these:

`src/rooms/room4.ts` (const `WAYPOINTS`, ~line 105):
```ts
export const debugPatrols: DebugPatrol[] = [{ waypoints: WAYPOINTS }];
```

`src/rooms/room5.ts` (const `WAYPOINTS`, ~line 136):
```ts
export const debugPatrols: DebugPatrol[] = [{ waypoints: WAYPOINTS }];
```

`src/rooms/room6.ts` (const `WAYPOINTS`, ~line 164):
```ts
export const debugPatrols: DebugPatrol[] = [{ waypoints: WAYPOINTS }];
```

`src/rooms/room7.ts` (const `WAYPOINTS`, ~line 177):
```ts
export const debugPatrols: DebugPatrol[] = [{ waypoints: WAYPOINTS }];
```

`src/rooms/room8.ts` (consts `WAYPOINTS_A`/`WAYPOINTS_B`, ~lines 155/173):
```ts
export const debugPatrols: DebugPatrol[] = [
  { waypoints: WAYPOINTS_A, label: 'A' },
  { waypoints: WAYPOINTS_B, label: 'B' },
];
```

`src/rooms/room10.ts` (consts `WAYPOINTS_A`/`WAYPOINTS_B`, ~lines 248/258):
```ts
export const debugPatrols: DebugPatrol[] = [
  { waypoints: WAYPOINTS_A, label: 'A' },
  { waypoints: WAYPOINTS_B, label: 'B' },
];
```

`src/rooms/room11.ts` (consts `WAYPOINTS_LOWER`/`WAYPOINTS_UPPER`, ~lines 274/286):
```ts
export const debugPatrols: DebugPatrol[] = [
  { waypoints: WAYPOINTS_LOWER, label: 'lower' },
  { waypoints: WAYPOINTS_UPPER, label: 'upper' },
];
```

`src/rooms/room12.ts` (consts `WAYPOINTS_A`/`WAYPOINTS_B`/`WAYPOINTS_C`, ~lines 317–343):
```ts
export const debugPatrols: DebugPatrol[] = [
  { waypoints: WAYPOINTS_A, label: 'A' },
  { waypoints: WAYPOINTS_B, label: 'B' },
  { waypoints: WAYPOINTS_C, label: 'C' },
];
```

`src/rooms/room13.ts` (consts `WAYPOINTS_A`/`WAYPOINTS_B`, ~lines 183/200; `W` is already `TUNING.lastWard` in this file):
```ts
export const debugPatrols: DebugPatrol[] = [
  { waypoints: WAYPOINTS_A, label: 'A', sightRange: W.orderlySightRangeM },
  { waypoints: WAYPOINTS_B, label: 'B', sightRange: W.orderlySightRangeM },
];
```

- [ ] **Step 3: Type-check and confirm the game bundle is unchanged**

Run: `cd "/Users/clanker/Developer/Ward B" && npm run build`
Expected: exit 0. (`noUnusedLocals` is on — if any room's import goes unused you missed its export line; tsc will name the file.)

- [ ] **Step 4: Commit**

```bash
git add src/rooms/room4.ts src/rooms/room5.ts src/rooms/room6.ts src/rooms/room7.ts src/rooms/room8.ts src/rooms/room10.ts src/rooms/room11.ts src/rooms/room12.ts src/rooms/room13.ts
git commit -m "Rooms: export debugPatrols for the map viewer (no runtime effect)"
```

---

### Task 3: `map.html` shell + viewer bootstrap (registry, selector, URL state, error isolation, floor + grid)

**Files:**
- Create: `map.html` (repo root, next to `index.html`)
- Create: `src/devtools/map.ts`

- [ ] **Step 1: Write `map.html`**

Note the script src pattern matches `index.html`'s (`/src/main.ts`). This file is dev-only by construction: Vite's build input defaults to `index.html` only and `vite.config.ts` sets no `rollupOptions.input`.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WARD B — room map (dev)</title>
  <style>
    * { box-sizing: border-box; margin: 0; }
    html, body { height: 100%; }
    body {
      display: flex; background: #14171a; color: #b8c0ba;
      font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    #panel {
      width: 250px; flex: none; padding: 14px; overflow-y: auto;
      border-right: 1px solid #262b26;
    }
    #panel h1 { font-size: 14px; margin-bottom: 10px; color: #d7ddd5; }
    #room-select { width: 100%; margin-bottom: 12px; background: #1d221d; color: inherit; border: 1px solid #333a33; padding: 4px; font: inherit; }
    #layers label { display: block; margin: 2px 0; cursor: pointer; user-select: none; }
    #error {
      margin-top: 12px; padding: 8px; border: 1px solid #7a3a34;
      color: #e0897f; white-space: pre-wrap; word-break: break-word; font-size: 11px;
    }
    #hint { margin-top: 14px; color: #5c665e; font-size: 11px; }
    #viewport { flex: 1; min-width: 0; }
    #viewport svg { width: 100%; height: 100%; display: block; }
  </style>
</head>
<body>
  <aside id="panel">
    <h1>WARD B — room map</h1>
    <select id="room-select"></select>
    <div id="layers"></div>
    <div id="error" hidden></div>
    <p id="hint">dev-only — not in the build.<br />edit a room .ts and save; this page reloads.</p>
  </aside>
  <main id="viewport"></main>
  <script type="module" src="/src/devtools/map.ts"></script>
</body>
</html>
```

- [ ] **Step 2: Write `src/devtools/map.ts` (bootstrap version — floor + grid only)**

The layer list, registry, URL state, and error isolation are all final here; Tasks 4–6 only add draw functions and their calls in `render()`.

```ts
// Dev-only top-down room map viewer, served at /map.html by `npm run dev`.
// Never bundled: map.html is not in Vite's build input (which defaults to
// index.html only), so nothing under src/devtools/ can reach the itch.io
// zip. Imports each room's RoomDef (pure data) and debugPatrols export —
// NEVER the room scripts, so no orderlies spawn and no THREE scene exists.
// North = −Z renders at the top: SVG y grows downward and so does +Z, so
// svgY = worldZ directly. All coordinates/strokes/fonts are in meters via
// the viewBox; the browser scales to fit.
import type { RoomDef, BlockDef, ColliderDef } from '../rooms/types';
import type { DebugPatrol } from './map-types';

const SVG_NS = 'http://www.w3.org/2000/svg';

// --- registry -------------------------------------------------------------
// Same 13 ids as main.ts's registry. Every room file exports its def under
// its own id (`export const room7: RoomDef`), which loadRoom relies on.
const MODULES: Record<string, () => Promise<unknown>> = {
  room1: () => import('../rooms/room1'),
  room2: () => import('../rooms/room2'),
  room3: () => import('../rooms/room3'),
  room4: () => import('../rooms/room4'),
  room5: () => import('../rooms/room5'),
  room6: () => import('../rooms/room6'),
  room7: () => import('../rooms/room7'),
  room8: () => import('../rooms/room8'),
  room9: () => import('../rooms/room9'),
  room10: () => import('../rooms/room10'),
  room11: () => import('../rooms/room11'),
  room12: () => import('../rooms/room12'),
  room13: () => import('../rooms/room13'),
};

interface LoadedRoom {
  def: RoomDef;
  patrols: DebugPatrol[];
}

interface RoomSlot {
  room?: LoadedRoom;
  error?: string;
}

// Per-room try/catch so one broken module (patrol() validation, a typo
// mid-edit) lists as broken in the selector instead of blanking the page.
async function loadRoom(id: string): Promise<RoomSlot> {
  try {
    const m = (await MODULES[id]()) as Record<string, unknown>;
    const def = m[id] as RoomDef | undefined;
    if (!def) throw new Error(`module has no export named "${id}"`);
    const patrols = (m.debugPatrols as DebugPatrol[] | undefined) ?? [];
    return { room: { def, patrols } };
  } catch (e) {
    return { error: e instanceof Error ? (e.stack ?? e.message) : String(e) };
  }
}

// --- layers ----------------------------------------------------------------
// Listed in draw order, bottom to top.
const LAYERS = [
  { id: 'grid', label: 'grid' },
  { id: 'height', label: 'height zones / ramps' },
  { id: 'colliders', label: 'colliders' },
  { id: 'blocks', label: 'blocks (mesh)' },
  { id: 'patrols', label: 'patrols + sight' },
  { id: 'spawnexits', label: 'spawn / exits' },
  { id: 'interactables', label: 'interactables' },
  { id: 'scrawls', label: 'scrawls' },
  { id: 'lights', label: 'lights' },
] as const;
type LayerId = (typeof LAYERS)[number]['id'];

// --- URL state ---------------------------------------------------------------
// ?room=<id>&layers=<csv> — survives Vite's full-page reload on save, which
// is what makes the edit→save→look loop land back on the room being edited.
// layers param omitted ⇒ all layers on.
function readUrl(): { room: string; layers: Set<LayerId> } {
  const q = new URLSearchParams(location.search);
  const room = q.get('room') ?? 'room1';
  const raw = q.get('layers');
  if (raw === null) return { room, layers: new Set(LAYERS.map((l) => l.id)) };
  const wanted = new Set(raw.split(','));
  return {
    room,
    layers: new Set(LAYERS.map((l) => l.id).filter((id) => wanted.has(id))),
  };
}

function writeUrl(room: string, layers: Set<LayerId>): void {
  const q = new URLSearchParams();
  q.set('room', room);
  if (layers.size !== LAYERS.length) q.set('layers', [...layers].join(','));
  history.replaceState(null, '', `?${q.toString()}`);
}

// --- SVG helpers -----------------------------------------------------------
function el<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string | number> = {},
  title?: string,
): SVGElementTagNameMap[K] {
  const n = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  if (title) {
    const t = document.createElementNS(SVG_NS, 'title');
    t.textContent = title;
    n.appendChild(t);
  }
  return n;
}

// AABB rect in world coords (y = z, see header).
function rect(
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number,
  attrs: Record<string, string | number>,
  title?: string,
): SVGRectElement {
  return el(
    'rect',
    { x: minX, y: minZ, width: maxX - minX, height: maxZ - minZ, ...attrs },
    title,
  );
}

function label(
  x: number,
  z: number,
  text: string,
  attrs: Record<string, string | number> = {},
): SVGTextElement {
  const t = el('text', {
    x,
    y: z,
    'font-size': 0.45,
    'font-family': 'ui-monospace, monospace',
    fill: '#8a948c',
    'text-anchor': 'middle',
    ...attrs,
  });
  t.textContent = text;
  return t;
}

// --- draw functions ----------------------------------------------------------
function drawGrid(g: SVGGElement, f: RoomDef['floor']): void {
  for (let x = Math.ceil(f.minX); x <= f.maxX; x++) {
    g.appendChild(
      el('line', {
        x1: x, y1: f.minZ, x2: x, y2: f.maxZ,
        stroke: '#252a25', 'stroke-width': x % 2 === 0 ? 0.035 : 0.015,
      }),
    );
    if (x % 2 === 0) g.appendChild(label(x, f.minZ - 0.35, String(x)));
  }
  for (let z = Math.ceil(f.minZ); z <= f.maxZ; z++) {
    g.appendChild(
      el('line', {
        x1: f.minX, y1: z, x2: f.maxX, y2: z,
        stroke: '#252a25', 'stroke-width': z % 2 === 0 ? 0.035 : 0.015,
      }),
    );
    if (z % 2 === 0) {
      g.appendChild(label(f.minX - 0.5, z + 0.16, String(z), { 'text-anchor': 'end' }));
    }
  }
  g.appendChild(
    label((f.minX + f.maxX) / 2, f.minZ - 1.2, 'N (−Z)', { 'font-size': 0.6, fill: '#5f6b62' }),
  );
}

// --- render --------------------------------------------------------------------
const viewport = document.getElementById('viewport')!;
const errorBox = document.getElementById('error')!;
const select = document.getElementById('room-select') as HTMLSelectElement;
const layersBox = document.getElementById('layers')!;

function render(slot: RoomSlot, layers: Set<LayerId>): void {
  viewport.replaceChildren();
  if (!slot.room) {
    errorBox.hidden = false;
    errorBox.textContent = slot.error ?? 'unknown load error';
    return;
  }
  errorBox.hidden = true;

  const { def } = slot.room;
  const f = def.floor;
  const M = 2.5; // margin (m) around the floor for out-of-bounds labels
  const svg = el('svg', {
    viewBox: `${f.minX - M} ${f.minZ - M} ${f.maxX - f.minX + 2 * M} ${f.maxZ - f.minZ + 2 * M}`,
  });
  svg.appendChild(
    rect(f.minX, f.minZ, f.maxX, f.maxZ, { fill: '#1c211c' },
      `floor x[${f.minX}, ${f.maxX}] z[${f.minZ}, ${f.maxZ}]`),
  );

  const groups = new Map<LayerId, SVGGElement>();
  for (const l of LAYERS) {
    const g = el('g', { id: `layer-${l.id}` });
    if (!layers.has(l.id)) g.setAttribute('display', 'none');
    groups.set(l.id, g);
    svg.appendChild(g);
  }

  drawGrid(groups.get('grid')!, f);
  // Tasks 4–6 add: drawHeight, drawColliders, drawBlocks, drawPatrols,
  // drawSpawnExits, drawInteractables, drawScrawls, drawLights.

  viewport.appendChild(svg);
}

// --- bootstrap -------------------------------------------------------------------
async function main(): Promise<void> {
  const state = readUrl();
  const slots = new Map<string, RoomSlot>();
  for (const id of Object.keys(MODULES)) slots.set(id, await loadRoom(id));

  for (const [id, slot] of slots) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = slot.room ? `${id} — ${slot.room.def.name}` : `${id} — ⚠ broken`;
    select.appendChild(opt);
  }
  if (!slots.has(state.room)) state.room = 'room1';
  select.value = state.room;

  for (const l of LAYERS) {
    const lab = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = state.layers.has(l.id);
    cb.addEventListener('change', () => {
      if (cb.checked) state.layers.add(l.id);
      else state.layers.delete(l.id);
      writeUrl(select.value, state.layers);
      document
        .getElementById(`layer-${l.id}`)
        ?.setAttribute('display', cb.checked ? 'inline' : 'none');
    });
    lab.appendChild(cb);
    lab.appendChild(document.createTextNode(` ${l.label}`));
    layersBox.appendChild(lab);
  }

  select.addEventListener('change', () => {
    writeUrl(select.value, state.layers);
    render(slots.get(select.value)!, state.layers);
  });

  render(slots.get(state.room)!, state.layers);
}

void main();
```

Note: `BlockDef` and `ColliderDef` are imported now but first used in Task 4's `drawBlocks` — if `tsc` flags them unused at this step, temporarily drop them from the import and restore in Task 4.

- [ ] **Step 3: Verify**

Run: `cd "/Users/clanker/Developer/Ward B" && npx tsc --noEmit`
Expected: exit 0 (after the `BlockDef`/`ColliderDef` note above).

Run: `npm run dev` (background), then `curl -s http://localhost:5173/map.html | grep -c 'room-select'`
Expected: `1`. In a browser: `http://localhost:5173/map.html?room=room13` shows room13's floor outline with a 1m grid, coordinate labels every 2m, `N (−Z)` at the top, selector listing all 13 rooms, and 9 layer checkboxes.

- [ ] **Step 4: Commit**

```bash
git add map.html src/devtools/map.ts
git commit -m "Map viewer: page shell, room registry, URL state, floor + grid"
```

---

### Task 4: Geometry layers — colliders, blocks, height zones / ramps

**Files:**
- Modify: `src/devtools/map.ts`

- [ ] **Step 1: Add color tables (below the `LAYERS` const)**

```ts
// --- colors ------------------------------------------------------------------
// State-filter coloring: lucid-only vs unmed-only geometry jumps out —
// an unmed-sealed collider (the soft-lock class) reads as red on sight.
const STATE_COLORS: Record<'both' | 'lucid' | 'unmed', string> = {
  both: '#59605a',
  lucid: '#4a7fb5',
  unmed: '#b5574a',
};

// One stroke color per MatName (rooms/types.ts) so blocks hint at what they
// render as in-game.
const MAT_COLORS: Record<BlockDef['mat'], string> = {
  wall: '#8b8f8a',
  wall2: '#77807a',
  floor: '#3c423e',
  ceil: '#313632',
  prop: '#8a8266',
  bed: '#7a6f66',
  door: '#a8925c',
  chain: '#5f6d75',
  pill: '#c8d0c9',
  pad: '#66707e',
  dispenser: '#7e8a96',
  glow: '#d9e8cf',
};
```

- [ ] **Step 2: Add the three draw functions (next to `drawGrid`)**

```ts
function drawColliders(g: SVGGElement, def: RoomDef): void {
  for (const c of def.colliders) {
    const state = c.states ?? 'both';
    g.appendChild(
      rect(c.minX, c.minZ, c.maxX, c.maxZ,
        { fill: STATE_COLORS[state], 'fill-opacity': 0.9 },
        `collider x[${c.minX}, ${c.maxX}] z[${c.minZ}, ${c.maxZ}] states:${state}`),
    );
  }
}

// Mesh-only geometry (no collider under its footprint) draws dashed — the
// class of mistake where something looks solid in-game but isn't.
function blockHasCollider(b: BlockDef, colliders: ColliderDef[]): boolean {
  const hx = b.size[0] / 2;
  const hz = b.size[2] / 2;
  const minX = b.pos[0] - hx;
  const maxX = b.pos[0] + hx;
  const minZ = b.pos[2] - hz;
  const maxZ = b.pos[2] + hz;
  return colliders.some(
    (c) => c.minX < maxX && c.maxX > minX && c.minZ < maxZ && c.maxZ > minZ,
  );
}

function drawBlocks(g: SVGGElement, def: RoomDef): void {
  for (const b of def.blocks) {
    const hx = b.size[0] / 2;
    const hz = b.size[2] / 2;
    const attrs: Record<string, string | number> = {
      fill: 'none',
      stroke: MAT_COLORS[b.mat],
      'stroke-width': 0.06,
    };
    if (!blockHasCollider(b, def.colliders)) attrs['stroke-dasharray'] = '0.25 0.15';
    if (b.states && b.states !== 'both') {
      attrs.fill = STATE_COLORS[b.states];
      attrs['fill-opacity'] = 0.25;
    }
    // THREE rotY is CCW seen from above with north up; SVG rotate() is CW.
    if (b.rotY) {
      attrs.transform = `rotate(${(-b.rotY * 180) / Math.PI} ${b.pos[0]} ${b.pos[2]})`;
    }
    g.appendChild(
      rect(b.pos[0] - hx, b.pos[2] - hz, b.pos[0] + hx, b.pos[2] + hz, attrs,
        `block ${b.mat} size[${b.size.join(', ')}] pos[${b.pos.join(', ')}]` +
          (b.states ? ` states:${b.states}` : '') +
          (b.rotY ? ` rotY:${b.rotY}` : '')),
    );
  }
}

function drawHeight(g: SVGGElement, def: RoomDef): void {
  for (const z of def.heightZones ?? []) {
    g.appendChild(
      rect(z.minX, z.minZ, z.maxX, z.maxZ,
        { fill: '#4a5d6e', 'fill-opacity': 0.35, stroke: '#6d8699', 'stroke-width': 0.04 },
        `heightZone y=${z.y} x[${z.minX}, ${z.maxX}] z[${z.minZ}, ${z.maxZ}]`),
    );
    g.appendChild(
      label((z.minX + z.maxX) / 2, (z.minZ + z.maxZ) / 2, `y=${z.y}`,
        { fill: '#9db8cc', 'font-size': 0.55 }),
    );
  }
  for (const r of def.ramps ?? []) {
    g.appendChild(
      rect(r.minX, r.minZ, r.maxX, r.maxZ,
        { fill: '#5e6e4a', 'fill-opacity': 0.35, stroke: '#87996d', 'stroke-width': 0.04 },
        `ramp axis:${r.axis} y ${r.yLow}→${r.yHigh} x[${r.minX}, ${r.maxX}] z[${r.minZ}, ${r.maxZ}]`),
    );
    const cx = (r.minX + r.maxX) / 2;
    const cz = (r.minZ + r.maxZ) / 2;
    // Arrow from the axis's min end (yLow) to its max end (yHigh); the
    // #arrow marker is defined once per render in a <defs>.
    const [x1, z1, x2, z2] =
      r.axis === 'x'
        ? [r.minX + 0.3, cz, r.maxX - 0.3, cz]
        : [cx, r.minZ + 0.3, cx, r.maxZ - 0.3];
    g.appendChild(
      el('line', {
        x1, y1: z1, x2, y2: z2,
        stroke: '#b3c996', 'stroke-width': 0.06, 'marker-end': 'url(#arrow)',
      }),
    );
    g.appendChild(label(x1, z1 - 0.25, `y=${r.yLow}`, { fill: '#b3c996', 'font-size': 0.4 }));
    g.appendChild(label(x2, z2 - 0.25, `y=${r.yHigh}`, { fill: '#b3c996', 'font-size': 0.4 }));
  }
}
```

- [ ] **Step 3: Wire into `render()`**

Add a `<defs>` with the arrow marker right after the floor rect is appended, and replace the placeholder comment with the three calls:

```ts
  const defs = el('defs');
  const marker = el('marker', {
    id: 'arrow', markerWidth: 6, markerHeight: 6,
    refX: 5, refY: 3, orient: 'auto', markerUnits: 'strokeWidth',
  });
  marker.appendChild(el('path', { d: 'M0,0 L6,3 L0,6 Z', fill: '#b3c996' }));
  defs.appendChild(marker);
  svg.appendChild(defs);
```

```ts
  drawGrid(groups.get('grid')!, f);
  drawHeight(groups.get('height')!, def);
  drawColliders(groups.get('colliders')!, def);
  drawBlocks(groups.get('blocks')!, def);
  // Tasks 5–6 add: drawSpawnExits, drawInteractables, drawScrawls,
  // drawLights, drawPatrols.
```

(Restore `BlockDef`/`ColliderDef` to the import from `../rooms/types` if they were dropped in Task 3.)

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` → exit 0.
Browser: `?room=room13` shows the perimeter walls and both squeeze slabs as gray fills; `?room=room11` additionally shows a blue `y=` height zone and a green ramp with an arrow; `?room=room3` (which uses state-filtered colliders) shows blue/red geometry. Hovering any rect shows its exact coordinates.

- [ ] **Step 5: Commit**

```bash
git add src/devtools/map.ts
git commit -m "Map viewer: collider, block, and height-zone/ramp layers"
```

---

### Task 5: Marker layers — spawn/exits, interactables, scrawls, lights

**Files:**
- Modify: `src/devtools/map.ts`

- [ ] **Step 1: Add the four draw functions (next to the others)**

```ts
function drawSpawnExits(g: SVGGElement, def: RoomDef): void {
  for (const x of def.exits) {
    g.appendChild(
      rect(x.minX, x.minZ, x.maxX, x.maxZ,
        { fill: '#3fae5a', 'fill-opacity': 0.35, stroke: '#3fae5a', 'stroke-width': 0.04 },
        `exit → ${x.to} x[${x.minX}, ${x.maxX}] z[${x.minZ}, ${x.maxZ}]`),
    );
    g.appendChild(
      label((x.minX + x.maxX) / 2, (x.minZ + x.maxZ) / 2 + 0.16, `→ ${x.to}`,
        { fill: '#7ee39b', 'font-size': 0.5 }),
    );
  }
  const s = def.spawn;
  // Player forward at yaw θ is (−sinθ, −cosθ) in (x,z): yaw 0 faces north
  // (−Z, up on this map). Increasing yaw turns CCW on screen; SVG rotate()
  // is CW, hence the sign flip. Polygon points up at rotation 0.
  g.appendChild(
    el('polygon', {
      points: '0,-0.6 0.38,0.42 0,0.16 -0.38,0.42',
      fill: '#f0e68c',
      transform: `translate(${s.x} ${s.z}) rotate(${(-s.yaw * 180) / Math.PI})`,
    }, `spawn (${s.x}, ${s.z}) yaw=${s.yaw}${s.y ? ` y=${s.y}` : ''}`),
  );
}

const TYPE_COLORS: Record<string, string> = {
  dispenser: '#5fb0d9',
  keypad: '#d9a05f',
  door: '#c9b458',
  pill_cup: '#e8e8e8',
  pill_pickup: '#e8e8e8',
};

function drawInteractables(g: SVGGElement, def: RoomDef): void {
  for (const it of def.interactables) {
    const c = TYPE_COLORS[it.type] ?? '#ffffff';
    g.appendChild(
      el('circle', {
        cx: it.pos[0], cy: it.pos[2], r: 0.18,
        fill: c, stroke: '#14171a', 'stroke-width': 0.04,
      }, `${it.type} "${it.id}" pos[${it.pos.join(', ')}]` +
        (it.states ? ` states:${it.states}` : '')),
    );
    g.appendChild(
      label(it.pos[0], it.pos[2] - 0.35, it.id, { fill: c, 'font-size': 0.4 }),
    );
  }
}

function drawScrawls(g: SVGGElement, def: RoomDef): void {
  for (const s of def.scrawls) {
    g.appendChild(
      el('circle', { cx: s.pos[0], cy: s.pos[2], r: 0.12, fill: '#d98fb0' },
        `scrawl "${s.text}" pos[${s.pos.join(', ')}] size:${s.size}${s.big ? ' big' : ''}`),
    );
    g.appendChild(
      label(s.pos[0], s.pos[2] + 0.55, `“${s.text.split('\n')[0]}”`,
        { fill: '#d98fb0', 'font-size': 0.38, 'font-style': 'italic' }),
    );
  }
}

function drawLights(g: SVGGElement, def: RoomDef): void {
  for (const l of def.lights) {
    g.appendChild(
      el('circle', {
        cx: l.pos[0], cy: l.pos[1], r: 0.16,
        fill: '#e8d44d', 'fill-opacity': 0.8,
      }, `light (${l.pos[0]}, ${l.pos[1]})`),
    );
  }
}
```

- [ ] **Step 2: Wire into `render()`**

```ts
  drawSpawnExits(groups.get('spawnexits')!, def);
  drawInteractables(groups.get('interactables')!, def);
  drawScrawls(groups.get('scrawls')!, def);
  drawLights(groups.get('lights')!, def);
  // Task 6 adds: drawPatrols.
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` → exit 0.
Browser: `?room=room13` shows the yellow spawn arrow at (0, 20) pointing up (north), a green `→ END` exit rect at the top, three pink scrawl markers on the walls, and a column of yellow light dots. A room with fixtures (`?room=room5`) shows labeled dispenser/keypad/door dots.

- [ ] **Step 4: Commit**

```bash
git add src/devtools/map.ts
git commit -m "Map viewer: spawn/exit, interactable, scrawl, and light layers"
```

---

### Task 6: Patrol routes + sight envelope

**Files:**
- Modify: `src/devtools/map.ts`

- [ ] **Step 1: Add the import and draw function**

Add to the imports:

```ts
import { TUNING } from '../tuning';
```

Add the draw function:

```ts
const PATROL_COLORS = ['#e05555', '#e0a83f', '#4fc3dd', '#b06fe0'];

function drawPatrols(g: SVGGElement, patrols: DebugPatrol[]): void {
  patrols.forEach((p, i) => {
    const color = PATROL_COLORS[i % PATROL_COLORS.length];
    const range = p.sightRange ?? TUNING.orderly.sightRange;
    const pts = [...p.waypoints, p.waypoints[0]]; // closed loop
    const ptStr = pts.map((w) => `${w.x},${w.z}`).join(' ');
    // The sight envelope: the loop drawn at 2×range width with round
    // caps/joins IS the swept sight-radius band — every point within
    // `range` of any patrol leg. Conservative (ignores facing/cone), per
    // the spec: useful for the ≥8.2m reaction-time rule, not a simulation.
    g.appendChild(
      el('polyline', {
        points: ptStr, fill: 'none', stroke: color,
        'stroke-width': range * 2, 'stroke-opacity': 0.09,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      }, `sight envelope r=${range}m${p.label ? ` [${p.label}]` : ''}`),
    );
    g.appendChild(
      el('polyline', { points: ptStr, fill: 'none', stroke: color, 'stroke-width': 0.08 }),
    );
    p.waypoints.forEach((w, n) => {
      g.appendChild(
        el('circle', { cx: w.x, cy: w.z, r: 0.22, fill: color },
          `waypoint ${n} (${w.x}, ${w.z})${p.label ? ` [${p.label}]` : ''}`),
      );
      g.appendChild(
        label(w.x + 0.35, w.z - 0.25, String(n),
          { fill: color, 'text-anchor': 'start', 'font-size': 0.5 }),
      );
    });
    if (p.label) {
      g.appendChild(
        label(p.waypoints[0].x, p.waypoints[0].z + 0.75, p.label,
          { fill: color, 'font-size': 0.5 }),
      );
    }
  });
}
```

- [ ] **Step 2: Wire into `render()`**

`drawPatrols` takes the patrols, not the def — destructure both in `render()` (change `const { def } = slot.room;` to `const { def, patrols } = slot.room;`) and add, keeping the layer draw-order position (after `drawBlocks`, before `drawSpawnExits`):

```ts
  drawPatrols(groups.get('patrols')!, patrols);
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` → exit 0.
Browser: `?room=room13` shows two colored rectangles (red/amber) with numbered waypoints and wide translucent bands — room13's bands should be visibly wider than `?room=room8`'s (9m sight override vs base 6m). `?room=room11` labels its loops `lower`/`upper`. `?room=room1` (no orderly) shows nothing in this layer and no errors.

- [ ] **Step 4: Commit**

```bash
git add src/devtools/map.ts
git commit -m "Map viewer: patrol routes with swept sight envelopes"
```

---

### Task 7: Build-exclusion proof + full manual walkthrough

**Files:** none created; verification only.

- [ ] **Step 1: Prove the viewer can't ship**

```bash
cd "/Users/clanker/Developer/Ward B"
npm run build
ls dist/ && ! ls dist/map.html 2>/dev/null && ! grep -rl "debugPatrols\|layer-colliders" dist/assets/ && echo CLEAN
```

Expected: build exits 0; `CLEAN` prints (no `map.html` in dist, no viewer code or patrol exports reachable in the game bundle — `debugPatrols` is only imported by map.ts, which isn't in the build graph, so Rollup tree-shakes it).

If `debugPatrols` *does* appear in the bundle: it's ~40 numbers per room of dead data, harmless — but note it in the commit message rather than silently accepting.

- [ ] **Step 2: Full manual walkthrough (with the user)**

Run `npm run dev`, open `http://localhost:5173/map.html`, then:

1. Step through all 13 rooms — each renders inside its floor bounds, no console errors.
2. Toggle every layer checkbox on/off — the layer disappears/reappears; the URL updates.
3. Reload with `?room=room12&layers=grid,patrols` — comes back to room12 with only those layers.
4. Edit `src/rooms/room13.ts` (nudge a waypoint x by 0.5), save — the page reloads showing the moved waypoint; revert the edit.
5. Introduce a deliberate error in room13 (e.g. a waypoint inside a wall so `patrol()` throws), save — the selector shows `room13 — ⚠ broken`, selecting it shows the validator's message, other rooms still render; revert.

- [ ] **Step 3: Final commit (docs pointer)**

Add a short section to `ROOM_AUTHORING.md` §6 ("Running it") so the tool is discoverable:

```markdown
While the dev server is running, `http://localhost:5173/map.html` serves a
top-down map of any room (dev-only — not part of the build): geometry,
colliders (state-colored), patrols with sight envelopes, spawn/exits,
fixtures, scrawls, and lights, re-rendered on every save. Rooms with
orderlies export their waypoint consts as `debugPatrols` (see any orderly
room's last lines) so the viewer can draw them.
```

```bash
git add ROOM_AUTHORING.md
git commit -m "Docs: point ROOM_AUTHORING at the /map.html dev viewer"
```

---

## Self-review notes (already applied)

- **Spec coverage:** files (T1–T3), all 8 layers incl. the 3 approved overlays (T3–T6), URL state + error isolation (T3), build exclusion + manual walkthrough incl. the save-reload loop and broken-room case (T7), ROOM_AUTHORING pointer (T7). Spec's "9 orderly rooms" count fixed in the spec itself.
- **Type consistency:** `DebugPatrol` (T1) matches every use in T2/T3/T6; `LAYERS` ids match every `groups.get(...)` call; `render`'s destructuring change is called out explicitly in T6.
- **No test framework exists in the repo** — verification is `tsc --noEmit`/`npm run build` per task plus the T7 walkthrough, per the spec's own testing section. Adding a test framework for a dev-only viewer fails YAGNI.
