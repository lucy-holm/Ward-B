// Dev-only top-down room map viewer, served at /map.html by `npm run dev`.
// Never bundled: map.html is not in Vite's build input (which defaults to
// index.html only), so nothing under src/devtools/ can reach the itch.io
// zip. Imports each room's RoomDef (pure data) and debugPatrols export —
// NEVER the room scripts, so no orderlies spawn and no THREE scene exists.
// North = −Z renders at the top: SVG y grows downward and so does +Z, so
// svgY = worldZ directly. All coordinates/strokes/fonts are in meters via
// the viewBox; the browser scales to fit.
import type { RoomDef } from '../rooms/types';
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
  // Tasks 4-6 add: drawHeight, drawColliders, drawBlocks, drawPatrols,
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
