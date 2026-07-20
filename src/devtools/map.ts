// Dev-only top-down room map viewer, served at /map.html by `npm run dev`.
// Never bundled: map.html is not in Vite's build input (which defaults to
// index.html only), so nothing under src/devtools/ can reach the itch.io
// zip. Imports each room's RoomDef (pure data) and debugPatrols export —
// NEVER the room scripts, so no orderlies spawn and no THREE scene exists.
// North = −Z renders at the top: SVG y grows downward and so does +Z, so
// svgY = worldZ directly. All coordinates/strokes/fonts are in meters via
// the viewBox; the browser scales to fit.
import type { BlockDef, ColliderDef, LevelDef, RoomDef } from '../rooms/types';
import type { DebugPatrol } from './map-types';
import { TUNING } from '../tuning';

const SVG_NS = 'http://www.w3.org/2000/svg';

// --- registry -------------------------------------------------------------
// Same ids as main.ts's registry. Every room file exports its def under
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
  room14: () => import('../rooms/room14'),
  room15: () => import('../rooms/room15'),
  room16: () => import('../rooms/room16'),
  room17: () => import('../rooms/room17'),
  room18: () => import('../rooms/room18'),
  // room19 is factory-built at runtime; its module also exports a static
  // `room19` (the 'lights' branch) so the viewer can render it like any other.
  room19: () => import('../rooms/room19'),
  room20: () => import('../rooms/room20'),
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
  { id: 'stairwells', label: 'stairwells (levels)' },
  { id: 'colliders', label: 'colliders' },
  { id: 'blocks', label: 'blocks (mesh)' },
  { id: 'triggers', label: 'triggers' },
  { id: 'patrols', label: 'patrols + sight' },
  { id: 'spawnexits', label: 'spawn / exits' },
  { id: 'interactables', label: 'interactables' },
  { id: 'scrawls', label: 'scrawls' },
  { id: 'iconpanels', label: 'door icon panels' },
  { id: 'lights', label: 'lights' },
] as const;
type LayerId = (typeof LAYERS)[number]['id'];

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
  plate: '#8f9a6d',
  glow: '#d9e8cf',
  phosphor: '#bfffc9',
  breaker: '#cf7b2e',
};

// True stacked floors — an item tagged `level` only "belongs" to the
// selected level; undefined always draws at full strength (a real wall/
// pillar spanning every level). A mismatched level draws as a low-opacity
// dashed GHOST rather than being hidden outright, so a room author can
// visually verify two levels' footprints line up (room17's authoring need:
// does the gallery's stairwell hole actually sit over the lower floor's
// landing spot). `selectedLevel === null` (room has no `levels`) never
// ghosts anything — every existing single-level room draws exactly as
// before.
const GHOST_OPACITY = 0.15;
function levelGhostAttrs(itemLevel: string | undefined, selectedLevel: string | null): Record<string, string | number> {
  if (itemLevel === undefined || selectedLevel === null || itemLevel === selectedLevel) return {};
  return { opacity: GHOST_OPACITY, 'stroke-dasharray': '0.2 0.15' };
}

// --- URL state ---------------------------------------------------------------
// ?room=<id>&layers=<csv>&level=<id> — survives Vite's full-page reload on
// save, which is what makes the edit→save→look loop land back on the room
// being edited. layers param omitted ⇒ all layers on. level param omitted ⇒
// the room's first declared level (or ignored entirely for a room with no
// `levels`).
function readUrl(): { room: string; layers: Set<LayerId>; level: string | null } {
  const q = new URLSearchParams(location.search);
  const room = q.get('room') ?? 'room1';
  const raw = q.get('layers');
  const level = q.get('level');
  const layers =
    raw === null
      ? new Set(LAYERS.map((l) => l.id))
      : new Set(LAYERS.map((l) => l.id).filter((id) => new Set(raw.split(',')).has(id)));
  return { room, layers, level };
}

function writeUrl(room: string, layers: Set<LayerId>, level: string | null): void {
  const q = new URLSearchParams();
  q.set('room', room);
  if (layers.size !== LAYERS.length) q.set('layers', [...layers].join(','));
  if (level !== null) q.set('level', level);
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

function drawColliders(g: SVGGElement, def: RoomDef, selectedLevel: string | null): void {
  for (const c of def.colliders) {
    const state = c.states ?? 'both';
    g.appendChild(
      rect(c.minX, c.minZ, c.maxX, c.maxZ,
        { fill: STATE_COLORS[state], 'fill-opacity': 0.9, ...levelGhostAttrs(c.level, selectedLevel) },
        `collider x[${c.minX}, ${c.maxX}] z[${c.minZ}, ${c.maxZ}] states:${state}` +
          (c.level ? ` level:${c.level}` : '')),
    );
  }
}

// Mesh-only geometry (no collider under its footprint) draws dashed — the
// class of mistake where something looks solid in-game but isn't. A
// collider only counts if it exists in the block's state(s): either side
// 'both' (or unset) matches anything; otherwise states must be equal.
function blockHasCollider(b: BlockDef, colliders: ColliderDef[]): boolean {
  const hx = b.size[0] / 2;
  const hz = b.size[2] / 2;
  const minX = b.pos[0] - hx;
  const maxX = b.pos[0] + hx;
  const minZ = b.pos[2] - hz;
  const maxZ = b.pos[2] + hz;
  const bState = b.states ?? 'both';
  return colliders.some((c) => {
    const cState = c.states ?? 'both';
    const statesCompatible = bState === 'both' || cState === 'both' || bState === cState;
    return (
      statesCompatible &&
      c.minX < maxX && c.maxX > minX && c.minZ < maxZ && c.maxZ > minZ
    );
  });
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
          (b.rotY ? ` rotY:${b.rotY}` : '') +
          (b.lightState && b.lightState !== 'both' ? ` [${b.lightState}-only]` : '')),
    );
  }
}

// Trigger volumes — violet stroke, a color no other layer uses (colliders
// own grey/blue/red, exits green). The stroke is the layer identity; the
// fill tints by STATE_COLORS for state-filtered triggers so lucid-only vs
// unmed-only jumps out, the same signal drawColliders/drawBlocks give. A
// pressurePlate() room shows this rect AND its 'plate' block outline in the
// blocks layer — seeing them coincide (or not) is the debug signal: a
// mismatch means the visible plate and its firing bounds drifted apart.
function drawTriggers(g: SVGGElement, def: RoomDef): void {
  for (const t of def.triggers ?? []) {
    const state = t.states ?? 'both';
    const fill = state === 'both' ? '#9d6fe0' : STATE_COLORS[state];
    g.appendChild(
      rect(t.minX, t.minZ, t.maxX, t.maxZ,
        { fill, 'fill-opacity': state === 'both' ? 0.3 : 0.45, stroke: '#9d6fe0', 'stroke-width': 0.05 },
        `trigger '${t.id}' x[${t.minX}, ${t.maxX}] z[${t.minZ}, ${t.maxZ}] states:${state}`),
    );
    g.appendChild(
      label((t.minX + t.maxX) / 2, (t.minZ + t.maxZ) / 2, t.id, { fill: '#c9aef0', 'font-size': 0.45 }),
    );
  }
}

// Reads the selected level's own heightZones/ramps when `levels` is present
// (they live per-level, not on the top-level RoomDef fields once a room
// authors `levels` — see rooms/types.ts's LevelDef header), falling back to
// the top-level fields otherwise (every room without `levels`, unchanged).
function drawHeight(g: SVGGElement, def: RoomDef, activeLevel: LevelDef | undefined): void {
  const heightZones = activeLevel?.heightZones ?? def.heightZones ?? [];
  const ramps = activeLevel?.ramps ?? def.ramps ?? [];
  for (const z of heightZones) {
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
  for (const r of ramps) {
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

// True stacked floors — a stairwell's footprint + an arrow labeled with the
// level ids each end belongs to (not bare y numbers, unlike drawHeight's
// ramps — a level transition is structurally different from an in-level
// ramp: it changes which collider/patrol set applies, not just height).
// Distinct color (amber) so it doesn't read as just another ramp.
function drawStairwells(g: SVGGElement, def: RoomDef): void {
  for (const s of def.stairwells ?? []) {
    g.appendChild(
      rect(s.minX, s.minZ, s.maxX, s.maxZ,
        { fill: '#8a6a3f', 'fill-opacity': 0.35, stroke: '#c99a5f', 'stroke-width': 0.05 },
        `stairwell '${s.id}' axis:${s.axis} ${s.levelAtLow}(y=${s.yLow}) -> ${s.levelAtHigh}(y=${s.yHigh}) ` +
          `x[${s.minX}, ${s.maxX}] z[${s.minZ}, ${s.maxZ}]`),
    );
    const cx = (s.minX + s.maxX) / 2;
    const cz = (s.minZ + s.maxZ) / 2;
    const [x1, z1, x2, z2] =
      s.axis === 'x'
        ? [s.minX + 0.3, cz, s.maxX - 0.3, cz]
        : [cx, s.minZ + 0.3, cx, s.maxZ - 0.3];
    g.appendChild(
      el('line', {
        x1, y1: z1, x2, y2: z2,
        stroke: '#e0b878', 'stroke-width': 0.08, 'marker-end': 'url(#arrow)',
      }),
    );
    g.appendChild(label(x1, z1 - 0.25, s.levelAtLow, { fill: '#e0b878', 'font-size': 0.42 }));
    g.appendChild(label(x2, z2 - 0.25, s.levelAtHigh, { fill: '#e0b878', 'font-size': 0.42 }));
    g.appendChild(label(cx, cz + 0.35, s.id, { fill: '#e0b878', 'font-size': 0.4 }));
  }
}

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
  switch: '#c96fe0',
  shape_key: '#ffffff', // overridden per-instance by it.color below when present
  shape_lock: '#e07fd9',
  push_block: '#8fd9a0',
};

// shape_key instances color their own swatch (it.color) rather than sharing
// one fixed type color — the whole point of the fixture is "which shape/color
// is this one", so the map view should show that at a glance too.
function drawInteractables(g: SVGGElement, def: RoomDef, selectedLevel: string | null): void {
  for (const it of def.interactables) {
    const c = it.color ?? TYPE_COLORS[it.type] ?? '#ffffff';
    g.appendChild(
      el('circle', {
        cx: it.pos[0], cy: it.pos[2], r: 0.18,
        fill: c, stroke: '#14171a', 'stroke-width': 0.04,
        ...levelGhostAttrs(it.level, selectedLevel),
      }, `${it.type} "${it.id}" pos[${it.pos.join(', ')}]` +
        (it.states ? ` states:${it.states}` : '') +
        (it.lightState && it.lightState !== 'both' ? ` [${it.lightState}-only]` : '') +
        (it.shape ? ` shape:${it.shape}` : '') +
        (it.level ? ` level:${it.level}` : '')),
    );
    g.appendChild(
      label(it.pos[0], it.pos[2] - 0.35, it.id, { fill: c, 'font-size': 0.4, ...levelGhostAttrs(it.level, selectedLevel) }),
    );
  }
}

// Door icon panels (room15's shape lock) — one small square marker per
// ShapeSpec in reading order at the panel's pos, colored per shape, titled
// with the shape_lock's full required set. Descriptive data only, same
// spirit as drawScrawls/drawInteractables.
function drawIconPanels(g: SVGGElement, def: RoomDef): void {
  for (const p of def.iconPanels ?? []) {
    const n = p.shapes.length;
    const spacing = 0.4;
    const startX = p.pos[0] - ((n - 1) * spacing) / 2;
    const required = p.shapes.map((s) => s.shape).join(', ');
    p.shapes.forEach((s, i) => {
      g.appendChild(
        el(
          'rect',
          {
            x: startX + i * spacing - 0.12,
            y: p.pos[2] - 0.12,
            width: 0.24,
            height: 0.24,
            fill: s.color,
            stroke: '#14171a',
            'stroke-width': 0.03,
          },
          `iconPanel '${p.id}' shape ${i}: ${s.shape} (${s.color}) — requires [${required}]`,
        ),
      );
    });
    g.appendChild(
      label(p.pos[0], p.pos[2] + 0.5, p.id, { fill: '#e0c9f0', 'font-size': 0.4 }),
    );
  }
}

function drawScrawls(g: SVGGElement, def: RoomDef, selectedLevel: string | null): void {
  for (const s of def.scrawls) {
    g.appendChild(
      el('circle', { cx: s.pos[0], cy: s.pos[2], r: 0.12, fill: s.ink === 'phosphor' ? '#bfffc9' : '#d98fb0', ...levelGhostAttrs(s.level, selectedLevel) },
        `scrawl "${s.text}" pos[${s.pos.join(', ')}] size:${s.size}${s.big ? ' big' : ''}` +
          (s.ink === 'phosphor' ? ' ink:phosphor' : '') +
          (s.lightState && s.lightState !== 'both' ? ` [${s.lightState}-only]` : '') +
          (s.level ? ` level:${s.level}` : '')),
    );
    g.appendChild(
      label(s.pos[0], s.pos[2] + 0.55, `“${s.text.split('\n')[0]}”`,
        { fill: '#d98fb0', 'font-size': 0.38, 'font-style': 'italic', ...levelGhostAttrs(s.level, selectedLevel) }),
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

const PATROL_COLORS = ['#e05555', '#e0a83f', '#4fc3dd', '#b06fe0'];

function drawPatrols(g: SVGGElement, patrols: DebugPatrol[], selectedLevel: string | null): void {
  patrols.forEach((p, i) => {
    if (p.waypoints.length === 0) return;
    const color = PATROL_COLORS[i % PATROL_COLORS.length];
    const range = p.sightRange ?? TUNING.orderly.sightRange;
    const ghost = levelGhostAttrs(p.level, selectedLevel);
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
        ...ghost,
      }, `sight envelope r=${range}m${p.label ? ` [${p.label}]` : ''}${p.level ? ` level:${p.level}` : ''}`),
    );
    g.appendChild(
      el('polyline', { points: ptStr, fill: 'none', stroke: color, 'stroke-width': 0.08, ...ghost }),
    );
    p.waypoints.forEach((w, n) => {
      g.appendChild(
        el('circle', { cx: w.x, cy: w.z, r: 0.22, fill: color, ...ghost },
          `waypoint ${n} (${w.x}, ${w.z})${p.label ? ` [${p.label}]` : ''}`),
      );
      g.appendChild(
        label(w.x + 0.35, w.z - 0.25, String(n),
          { fill: color, 'text-anchor': 'start', 'font-size': 0.5, ...ghost }),
      );
    });
    if (p.label) {
      g.appendChild(
        label(p.waypoints[0].x, p.waypoints[0].z + 0.75, p.label,
          { fill: color, 'font-size': 0.5, ...ghost }),
      );
    }
  });
}

// --- render --------------------------------------------------------------------
const viewport = document.getElementById('viewport')!;
const errorBox = document.getElementById('error')!;
const select = document.getElementById('room-select') as HTMLSelectElement;
const levelSelect = document.getElementById('level-select') as HTMLSelectElement;
const layersBox = document.getElementById('layers')!;

// Populates the level selector from the room's own `levels` (hidden/disabled
// for every room without `levels` — today's single-view behavior, untouched)
// and returns the level id that's actually selected (a requested id that no
// longer exists falls back to the room's first level).
function populateLevelSelect(def: RoomDef, requested: string | null): string | null {
  levelSelect.replaceChildren();
  if (!def.levels || def.levels.length === 0) {
    levelSelect.hidden = true;
    return null;
  }
  levelSelect.hidden = false;
  for (const lvl of def.levels) {
    const opt = document.createElement('option');
    opt.value = lvl.id;
    opt.textContent = `${lvl.id} (y=${lvl.baseY})`;
    levelSelect.appendChild(opt);
  }
  const selected = requested && def.levels.some((l) => l.id === requested) ? requested : def.levels[0].id;
  levelSelect.value = selected;
  return selected;
}

function render(slot: RoomSlot, layers: Set<LayerId>, requestedLevel: string | null): string | null {
  viewport.replaceChildren();
  if (!slot.room) {
    errorBox.hidden = false;
    errorBox.textContent = slot.error ?? 'unknown load error';
    levelSelect.hidden = true;
    return null;
  }
  errorBox.hidden = true;
  const selectedLevel = populateLevelSelect(slot.room.def, requestedLevel);

  // Draw-time errors (bad-but-importable room data) get the same
  // treatment as import-time errors in loadRoom: show, don't blank.
  try {
    const { def, patrols } = slot.room;
    const activeLevel = def.levels?.find((l) => l.id === selectedLevel);
    // The background floor rect switches to the selected level's own
    // footprint when `levels` is present, falling back to def.floor
    // otherwise (every room without `levels`, unchanged).
    const f = activeLevel?.floor ?? def.floor;
    const M = 2.5; // margin (m) around the floor for out-of-bounds labels
    const svg = el('svg', {
      viewBox: `${f.minX - M} ${f.minZ - M} ${f.maxX - f.minX + 2 * M} ${f.maxZ - f.minZ + 2 * M}`,
    });
    svg.appendChild(
      rect(f.minX, f.minZ, f.maxX, f.maxZ, { fill: '#1c211c' },
        `floor x[${f.minX}, ${f.maxX}] z[${f.minZ}, ${f.maxZ}]`),
    );
    // startDark badge — a room authored to open dark shouldn't surprise
    // whoever's reading the map cold (see LightFilter/RoomDef.startDark).
    if (def.startDark) {
      svg.appendChild(
        label((f.minX + f.maxX) / 2, f.minZ - 1.85, 'LIGHTS: OFF AT START',
          { 'font-size': 0.55, fill: '#c96fe0' }),
      );
    }

    const defs = el('defs');
    const marker = el('marker', {
      id: 'arrow', markerWidth: 6, markerHeight: 6,
      refX: 5, refY: 3, orient: 'auto', markerUnits: 'strokeWidth',
    });
    marker.appendChild(el('path', { d: 'M0,0 L6,3 L0,6 Z', fill: '#b3c996' }));
    defs.appendChild(marker);
    svg.appendChild(defs);

    const groups = new Map<LayerId, SVGGElement>();
    for (const l of LAYERS) {
      const g = el('g', { id: `layer-${l.id}` });
      if (!layers.has(l.id)) g.setAttribute('display', 'none');
      groups.set(l.id, g);
      svg.appendChild(g);
    }

    drawGrid(groups.get('grid')!, f);
    drawHeight(groups.get('height')!, def, activeLevel);
    drawStairwells(groups.get('stairwells')!, def);
    drawColliders(groups.get('colliders')!, def, selectedLevel);
    drawBlocks(groups.get('blocks')!, def);
    drawTriggers(groups.get('triggers')!, def);
    drawPatrols(groups.get('patrols')!, patrols, selectedLevel);
    drawSpawnExits(groups.get('spawnexits')!, def);
    drawInteractables(groups.get('interactables')!, def, selectedLevel);
    drawScrawls(groups.get('scrawls')!, def, selectedLevel);
    drawIconPanels(groups.get('iconpanels')!, def);
    drawLights(groups.get('lights')!, def);

    viewport.appendChild(svg);
  } catch (e) {
    viewport.replaceChildren();
    errorBox.hidden = false;
    errorBox.textContent = e instanceof Error ? (e.stack ?? e.message) : String(e);
  }
  return selectedLevel;
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
      writeUrl(select.value, state.layers, currentLevel);
      document
        .getElementById(`layer-${l.id}`)
        ?.setAttribute('display', cb.checked ? 'inline' : 'none');
    });
    lab.appendChild(cb);
    lab.appendChild(document.createTextNode(` ${l.label}`));
    layersBox.appendChild(lab);
  }

  // Tracks the level actually selected for the current room (null for a
  // room with no `levels`) — kept alongside `state` so the layer checkboxes'
  // writeUrl calls above can preserve it.
  let currentLevel: string | null = null;

  select.addEventListener('change', () => {
    // Switching rooms drops the previous room's level selection — the new
    // room's own level set may not even have a matching id.
    currentLevel = render(slots.get(select.value)!, state.layers, null);
    writeUrl(select.value, state.layers, currentLevel);
  });

  levelSelect.addEventListener('change', () => {
    currentLevel = render(slots.get(select.value)!, state.layers, levelSelect.value);
    writeUrl(select.value, state.layers, currentLevel);
  });

  currentLevel = render(slots.get(state.room)!, state.layers, state.level);
}

void main();
