import * as THREE from 'three';
import type {
  HeightZone,
  InteractableDef,
  ColliderDef,
  MatName,
  RampDef,
  RoomDef,
  ScrawlDef,
  StateFilter,
  WardState,
} from '../rooms/types';

// ---------------------------------------------------------------------------
// Procedural textures — no image assets, everything below is drawn to
// <canvas> once at module init and reused for the lifetime of the page.
// Institutional/aged palette: desaturated plaster greens and greys, worn
// vinyl, dirty metal. Kept low-contrast on purpose — these materials are
// SHARED across meshes of very different sizes (a 2m prop and a 14m corridor
// wall both sample the same 0..1 box UVs), and a fixed `repeat` tuned for the
// dominant case (a several-metre wall run) will visibly stretch on the
// longest runs. Low contrast keeps that stretch unobtrusive instead of ugly.
// Floor/ceiling are the exception: they're single large planes with known
// per-room dimensions, so loadRoom clones the base texture and sets `repeat`
// from the actual room size (see loadRoom below).
// ---------------------------------------------------------------------------

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function jitterColor(base: [number, number, number], amt: number): string {
  const r = clamp255(base[0] + (Math.random() - 0.5) * amt);
  const g = clamp255(base[1] + (Math.random() - 0.5) * amt);
  const b = clamp255(base[2] + (Math.random() - 0.5) * amt);
  return `rgb(${r},${g},${b})`;
}

// Painted-plaster wall: base fill, faint mottling/stain blobs, a darker
// wainscot band baked into the bottom third (canvas-bottom = mesh-bottom,
// since CanvasTexture's default flipY keeps that mapping intact against
// BoxGeometry's v=0-at-bottom side-face UVs), a hairline chair-rail at the
// band's top edge, and a few thin cracks.
function makePlasterTexture(base: string, bandColor: string): THREE.CanvasTexture {
  const size = 320;
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const g = cv.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);

  for (let i = 0; i < 22; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 14 + Math.random() * 46;
    const dark = Math.random() < 0.6;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, dark ? 'rgba(20,24,20,0.10)' : 'rgba(255,255,255,0.06)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  const bandH = size * 0.32;
  const bandGrad = g.createLinearGradient(0, size - bandH, 0, size);
  bandGrad.addColorStop(0, 'rgba(0,0,0,0)');
  bandGrad.addColorStop(0.25, bandColor);
  bandGrad.addColorStop(1, bandColor);
  g.fillStyle = bandGrad;
  g.fillRect(0, size - bandH, size, bandH);
  g.strokeStyle = 'rgba(10,12,10,0.35)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, size - bandH);
  g.lineTo(size, size - bandH);
  g.stroke();

  g.strokeStyle = 'rgba(15,18,15,0.28)';
  g.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    let x = Math.random() * size;
    let y = Math.random() * size * 0.7;
    g.beginPath();
    g.moveTo(x, y);
    const segs = 3 + Math.floor(Math.random() * 3);
    for (let s = 0; s < segs; s++) {
      x += (Math.random() - 0.5) * 40;
      y += Math.random() * 26;
      g.lineTo(x, y);
    }
    g.stroke();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.5, 1); // tuned for a several-metre wall run; see note above
  return tex;
}

// Vinyl floor tile grid, baked as an FLOOR_GRID x FLOOR_GRID block (rather
// than a single repeating tile) so grout, per-tile brightness jitter and
// scuffs actually vary — a single-tile repeat would look identical forever.
// loadRoom sets `repeat` per room from the real floor size (see below).
const FLOOR_TILE_M = 0.5;
const FLOOR_GRID = 8;
const FLOOR_BASE_RGB: [number, number, number] = [93, 106, 102];

function makeFloorTexture(): THREE.CanvasTexture {
  const cell = 48;
  const size = cell * FLOOR_GRID;
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const g = cv.getContext('2d')!;
  for (let cx = 0; cx < FLOOR_GRID; cx++) {
    for (let cy = 0; cy < FLOOR_GRID; cy++) {
      const x0 = cx * cell;
      const y0 = cy * cell;
      g.fillStyle = jitterColor(FLOOR_BASE_RGB, 22);
      g.fillRect(x0, y0, cell, cell);
      // cheap fake bevel/AO baked straight into the diffuse tile
      const grad = g.createLinearGradient(x0, y0, x0 + cell, y0 + cell);
      grad.addColorStop(0, 'rgba(255,255,255,0.05)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.10)');
      g.fillStyle = grad;
      g.fillRect(x0, y0, cell, cell);
      if (Math.random() < 0.08) {
        const sx = x0 + cell * (0.3 + Math.random() * 0.4);
        const sy = y0 + cell * (0.3 + Math.random() * 0.4);
        const sr = cell * (0.12 + Math.random() * 0.16);
        const sg = g.createRadialGradient(sx, sy, 0, sx, sy, sr);
        sg.addColorStop(0, 'rgba(15,18,16,0.28)');
        sg.addColorStop(1, 'rgba(15,18,16,0)');
        g.fillStyle = sg;
        g.beginPath();
        g.arc(sx, sy, sr, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = 'rgba(18,22,20,0.55)';
      g.lineWidth = 2;
      g.strokeRect(x0 + 1, y0 + 1, cell - 2, cell - 2);
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Acoustic ceiling tile grid: pinhole speckle per tile, an occasional water
// stain. Same "baked NxN block" trick as the floor.
const CEIL_TILE_M = 0.6;
const CEIL_GRID = 6;
const CEIL_BASE_RGB: [number, number, number] = [142, 156, 151];

function makeCeilTexture(): THREE.CanvasTexture {
  const cell = 56;
  const size = cell * CEIL_GRID;
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const g = cv.getContext('2d')!;
  for (let cx = 0; cx < CEIL_GRID; cx++) {
    for (let cy = 0; cy < CEIL_GRID; cy++) {
      const x0 = cx * cell;
      const y0 = cy * cell;
      g.fillStyle = jitterColor(CEIL_BASE_RGB, 12);
      g.fillRect(x0, y0, cell, cell);
      g.fillStyle = 'rgba(40,46,43,0.5)';
      const holes = 10 + Math.floor(Math.random() * 8);
      for (let i = 0; i < holes; i++) {
        const px = x0 + Math.random() * cell;
        const py = y0 + Math.random() * cell;
        g.beginPath();
        g.arc(px, py, 0.6, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = 'rgba(60,68,64,0.4)';
      g.lineWidth = 2;
      g.strokeRect(x0 + 1, y0 + 1, cell - 2, cell - 2);
      if (Math.random() < 0.05) {
        const sx = x0 + cell * (0.3 + Math.random() * 0.4);
        const sy = y0 + cell * (0.3 + Math.random() * 0.4);
        const sr = cell * (0.35 + Math.random() * 0.25);
        const sg = g.createRadialGradient(sx, sy, 0, sx, sy, sr);
        sg.addColorStop(0, 'rgba(120,104,68,0.22)');
        sg.addColorStop(1, 'rgba(120,104,68,0)');
        g.fillStyle = sg;
        g.beginPath();
        g.arc(sx, sy, sr, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Generic worn/scuffed surface: a base fill plus a scatter of soft light/dark
// blotches — used for props, beds, pads and dispensers so nothing reads as
// flat plastic. No tile grid, so a fixed (unrepeated) UV stretches fine
// across whatever box happens to use it.
function makeWornTexture(base: [number, number, number], size: number, blobs: number): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const g = cv.getContext('2d')!;
  g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < blobs; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = size * (0.08 + Math.random() * 0.22);
    const dark = Math.random() < 0.55;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(
      0,
      dark ? `rgba(0,0,0,${0.05 + Math.random() * 0.07})` : `rgba(255,255,255,${0.04 + Math.random() * 0.05})`,
    );
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Door slab: vertical grain (paint over old wood), two recessed panel
// outlines, and a smudge roughly where a handle would sit.
function makeDoorTexture(): THREE.CanvasTexture {
  const w = 192;
  const h = 320;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#54707f';
  g.fillRect(0, 0, w, h);

  for (let i = 0; i < 90; i++) {
    const x0 = Math.random() * w;
    const alpha = 0.03 + Math.random() * 0.05;
    g.strokeStyle = Math.random() < 0.5 ? `rgba(10,16,20,${alpha})` : `rgba(255,255,255,${alpha * 0.7})`;
    g.lineWidth = 0.6 + Math.random() * 1.2;
    g.beginPath();
    let cx = x0;
    g.moveTo(cx, 0);
    for (let y = 0; y <= h; y += 20) {
      cx += (Math.random() - 0.5) * 6;
      g.lineTo(cx, y);
    }
    g.stroke();
  }

  g.strokeStyle = 'rgba(10,16,20,0.25)';
  g.lineWidth = 3;
  g.strokeRect(w * 0.12, h * 0.08, w * 0.76, h * 0.36);
  g.strokeRect(w * 0.12, h * 0.52, w * 0.76, h * 0.4);

  // handle-height smudge, offset to one side
  const hx = w * 0.78;
  const hy = h * 0.64;
  const sg = g.createRadialGradient(hx, hy, 0, hx, hy, w * 0.22);
  sg.addColorStop(0, 'rgba(8,10,10,0.30)');
  sg.addColorStop(1, 'rgba(8,10,10,0)');
  g.fillStyle = sg;
  g.beginPath();
  g.arc(hx, hy, w * 0.22, 0, Math.PI * 2);
  g.fill();

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const WALL_TEX = makePlasterTexture('#b9c9c4', '#7c8d87');
const WALL2_TEX = makePlasterTexture('#a7b8b2', '#6c7d78');
const FLOOR_BASE_TEX = makeFloorTexture();
const CEIL_BASE_TEX = makeCeilTexture();
const BED_TEX = makeWornTexture([143, 165, 181], 128, 26);
const PROP_TEX = makeWornTexture([125, 143, 137], 128, 26);
const PAD_TEX = makeWornTexture([29, 43, 39], 96, 18);
const DISPENSER_TEX = makeWornTexture([34, 51, 46], 96, 18);
const PLATE_TEX = makeWornTexture([64, 70, 66], 96, 18);
const CHAIN_TEX = makeWornTexture([60, 63, 69], 96, 20);
CHAIN_TEX.repeat.set(1, 4); // reads as stacked links on the tall thin chain boxes
const DOOR_TEX = makeDoorTexture();

// Shared grey-box materials (never disposed). Scrawl materials own their
// canvas textures and are disposed with the room. floor/ceil below are
// templates only — loadRoom clones their texture per room so `repeat` can
// match the actual floor/ceiling size (see loadRoom).
const MATERIALS: Record<MatName, THREE.Material> = {
  wall: new THREE.MeshLambertMaterial({ map: WALL_TEX }),
  wall2: new THREE.MeshLambertMaterial({ map: WALL2_TEX }),
  floor: new THREE.MeshLambertMaterial({ map: FLOOR_BASE_TEX }),
  ceil: new THREE.MeshLambertMaterial({ map: CEIL_BASE_TEX }),
  prop: new THREE.MeshLambertMaterial({ map: PROP_TEX }),
  bed: new THREE.MeshLambertMaterial({ map: BED_TEX }),
  door: new THREE.MeshLambertMaterial({ map: DOOR_TEX }),
  chain: new THREE.MeshLambertMaterial({ map: CHAIN_TEX }),
  pill: new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x77e0c8, emissiveIntensity: 0.55 }),
  pad: new THREE.MeshLambertMaterial({ map: PAD_TEX, emissive: 0x9fd8cb, emissiveIntensity: 0.35 }),
  dispenser: new THREE.MeshLambertMaterial({ map: DISPENSER_TEX, emissive: 0x9fd8cb, emissiveIntensity: 0.6 }),
  // Floor-mounted mechanism plate (trigger volumes' visible marker) — worn
  // metal with a faint mechanism glow so it reads at floor level, distinct
  // from pad/dispenser which are wall fixtures.
  plate: new THREE.MeshLambertMaterial({ map: PLATE_TEX, emissive: 0x8a9a72, emissiveIntensity: 0.25 }),
  // Fallback only — every 'glow' block actually authored in a room def is
  // reclassified into one of the three GLOW_*_MAT materials below (see
  // classifyGlowBlock), so this entry rarely renders. Kept so MATERIALS
  // stays a total Record<MatName, Material> for any other lookup site.
  glow: new THREE.MeshBasicMaterial({ color: 0xfff2d9 }),
};

// ---------------------------------------------------------------------------
// 'glow' sub-materials — room defs only expose one MatName ('glow') for every
// non-diegetic light panel (TVs, ceiling strips, the "way out" exit glow),
// so the split below happens purely off each block's authored size, with no
// RoomDef field added and no edits to rooms/*.ts. Verified against every
// 'glow' block currently authored (room1-8): exit/vestibule panels are thin
// (<=0.08m) on one axis and tall (>=2m); TVs are ~0.08-0.15m thin, ~0.6-1.1m
// tall, ~0.9-1.5m wide; everything else (ceiling strips, the med-window
// shutter strip) falls through to the fluorescent-flicker treatment.
// ---------------------------------------------------------------------------
type GlowKind = 'door' | 'tv' | 'strip';

function classifyGlowBlock(size: [number, number, number]): GlowKind {
  const [sx, sy, sz] = size;
  const thin = Math.min(sx, sz);
  const long = Math.max(sx, sz);
  if (thin <= 0.08 && sy >= 2) return 'door';
  if (thin >= 0.08 && thin <= 0.15 && sy >= 0.6 && sy <= 1.1 && long >= 0.9 && long <= 1.5) return 'tv';
  return 'strip';
}

const GLOW_BASE_COLOR = new THREE.Color(0xfff2d9);
// Exit/vestibule glow — "the way out" always reads as gently alive.
const GLOW_DOOR_MAT = new THREE.MeshBasicMaterial({ color: GLOW_BASE_COLOR.clone() });
// Ceiling strips / misc light panels — institutional fluorescents, occasional flicker dip.
const GLOW_STRIP_MAT = new THREE.MeshBasicMaterial({ color: GLOW_BASE_COLOR.clone() });
// TVs — animated static, small canvas re-noised on a timer (see World.update).
const GLOW_TV_SIZE = 48; // px — small + reused across every TV, per the animated-texture budget
const glowTvCanvas = document.createElement('canvas');
glowTvCanvas.width = GLOW_TV_SIZE;
glowTvCanvas.height = GLOW_TV_SIZE;
const glowTvCtx = glowTvCanvas.getContext('2d')!;
const GLOW_TV_TEXTURE = new THREE.CanvasTexture(glowTvCanvas);
const GLOW_TV_MAT = new THREE.MeshBasicMaterial({ map: GLOW_TV_TEXTURE });

function paintTvStatic(): void {
  const img = glowTvCtx.createImageData(GLOW_TV_SIZE, GLOW_TV_SIZE);
  for (let i = 0; i < img.data.length; i += 4) {
    const hot = Math.random() < 0.05;
    const v = hot ? 255 : Math.floor(90 + Math.random() * 130);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  glowTvCtx.putImageData(img, 0, 0);
  GLOW_TV_TEXTURE.needsUpdate = true;
}
paintTvStatic(); // seed the first frame so a TV isn't blank before the first World.update tick

function glowMaterialFor(kind: GlowKind): THREE.Material {
  if (kind === 'door') return GLOW_DOOR_MAT;
  if (kind === 'tv') return GLOW_TV_MAT;
  return GLOW_STRIP_MAT;
}

// Composite dispenser/keypad parts — shared across instances like MATERIALS
// (never disposed). Kept separate from MATERIALS.dispenser/pad (the bodies)
// so the glowing bits can pulse on their own, independent of ambient light.
const GLOW_SLOT_MAT = new THREE.MeshLambertMaterial({
  color: 0x0c1917,
  emissive: 0x9dfbe4,
  emissiveIntensity: 0.55,
});
const DISPENSER_TRAY_MAT = new THREE.MeshLambertMaterial({ color: 0x161d1b });
const GLOW_SLOT_BASE_INTENSITY = 0.55;
const GLOW_SLOT_PULSE_AMOUNT = 0.4;

// Capsule pill parts, shared across pill_pickup/pill_cup instances.
const CAPSULE_CAP_MAT = new THREE.MeshLambertMaterial({
  color: 0x59c9b3,
  emissive: 0x59c9b3,
  emissiveIntensity: 0.5,
});
const PILL_CUP_MAT = new THREE.MeshLambertMaterial({ color: 0xe9e4d6 });

// A handful of low-opacity dark blotches near the edges/corners of a printed
// plate — cheap "this has been touched/wiped a thousand times" grime pass,
// shared by the dispenser label and keypad ID plate.
function addEdgeGrime(g: CanvasRenderingContext2D, w: number, h: number): void {
  const spots = 5;
  for (let i = 0; i < spots; i++) {
    const edge = Math.floor(Math.random() * 4);
    let x: number;
    let y: number;
    if (edge === 0) {
      x = Math.random() * w;
      y = Math.random() * h * 0.18;
    } else if (edge === 1) {
      x = Math.random() * w;
      y = h - Math.random() * h * 0.18;
    } else if (edge === 2) {
      x = Math.random() * w * 0.15;
      y = Math.random() * h;
    } else {
      x = w - Math.random() * w * 0.15;
      y = Math.random() * h;
    }
    const r = 10 + Math.random() * 26;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(30,26,18,0.22)');
    grad.addColorStop(1, 'rgba(30,26,18,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
}

// Long lines/tall line-stacks used to overflow the fixed 512x256 canvas and
// clip at its edges (playtest 7: "some of the writing on the wall
// truncates"). Fix: measure every line at the authored (max) size, then scale
// the font down — never up — just enough that the longest line fits within
// ~92% of the canvas width and the full line-stack fits within ~92% of its
// height. Short scrawls that already fit render identically to before (scale
// clamps at 1); long ones shrink uniformly instead of clipping.
function makeScrawlTexture(def: ScrawlDef): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 256;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#c1170f';
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  const lines = def.text.split('\n');
  const maxFontSize = def.big ? 110 : 54;
  // Preserve the current line-spacing-to-font-size ratio (120/110 for big,
  // 64/54 for normal) so scaled-down text keeps the same relative leading.
  const lineHeightRatio = def.big ? 120 / 110 : 64 / 54;

  g.font = `${maxFontSize}px 'Comic Sans MS', cursive, sans-serif`;
  let maxLineWidth = 0;
  for (const l of lines) {
    const w = g.measureText(l).width;
    if (w > maxLineWidth) maxLineWidth = w;
  }

  const widthLimit = cv.width * 0.92;
  const heightLimit = cv.height * 0.92;
  const totalHeightAtMax = (lines.length - 1) * (maxFontSize * lineHeightRatio) + maxFontSize;
  const widthScale = maxLineWidth > widthLimit ? widthLimit / maxLineWidth : 1;
  const heightScale = totalHeightAtMax > heightLimit ? heightLimit / totalHeightAtMax : 1;
  const scale = Math.min(1, widthScale, heightScale);

  const fontSize = maxFontSize * scale;
  const lineHeight = fontSize * lineHeightRatio;

  g.font = `${fontSize}px 'Comic Sans MS', cursive, sans-serif`;
  g.save();
  g.translate(256, 128);
  g.rotate(-0.05);
  lines.forEach((l, i) => {
    g.fillText(l, 0, (i - (lines.length - 1) / 2) * lineHeight);
  });
  g.restore();
  return new THREE.CanvasTexture(cv);
}

// Institutional signage for a dispenser faceplate — clean, printed, stencil-like.
// Deliberately the visual opposite of makeScrawlTexture's handwritten red.
function makeDispenserLabelTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 192;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#dfe8e4';
  g.fillRect(0, 0, cv.width, cv.height);
  g.strokeStyle = '#8a9a95';
  g.lineWidth = 6;
  g.strokeRect(4, 4, cv.width - 8, cv.height - 8);

  // small cross symbol
  g.strokeStyle = '#2f6e5f';
  g.lineWidth = 12;
  g.lineCap = 'round';
  const cx = 76;
  const cy = cv.height / 2;
  g.beginPath();
  g.moveTo(cx - 24, cy);
  g.lineTo(cx + 24, cy);
  g.moveTo(cx, cy - 24);
  g.lineTo(cx, cy + 24);
  g.stroke();

  g.fillStyle = '#22332e';
  g.font = '700 44px Arial, Helvetica, sans-serif';
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  // manual letter-spacing (not all canvas impls honour ctx.letterSpacing)
  let x = 128;
  for (const ch of 'MEDICATION') {
    g.fillText(ch, x, cy);
    x += g.measureText(ch).width + 8;
  }
  addEdgeGrime(g, cv.width, cv.height);
  return new THREE.CanvasTexture(cv);
}

// Dispenser reads as "just a box" otherwise — build a composite so it registers
// as a fixture: dark body, recessed glowing slot, a tray lip, printed faceplate.
//
// BUG (found in the world.ts facing audit): this used to hardcode local +z
// for the slot/tray/label regardless of which wall the dispenser sat
// against, unlike buildKeypad/buildDoor which both infer facing from the
// def's thin axis + position. That's harmless for a dispenser mounted on a
// wall that happens to want +z (room1's dispenser1), but for one mounted on
// the opposite wall (e.g. room4's dispenser4, on the south wall — floor
// center is north of it, so inferFacing gives axis z / sign -1) every part
// built facing into the wall instead of the room, so the label was never
// visible. Now uses the same inferFacing/faceOffset/faceRotationY helpers as
// the other wall composites below.
function buildDispenser(it: InteractableDef, floor: RoomDef['floor']): THREE.Group {
  const group = new THREE.Group();
  const [w, h, d] = it.size;
  const facing = resolveFacing(it, floor);
  const thin = facing.axis === 'x' ? w : d;
  const along = facing.axis === 'x' ? d : w;
  const faceDist = thin / 2;
  const faceRotY = faceRotationY(facing);

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MATERIALS.dispenser);
  group.add(body);

  const slotSize: [number, number, number] =
    facing.axis === 'x' ? [thin * 0.3, h * 0.16, along * 0.5] : [along * 0.5, h * 0.16, thin * 0.3];
  const slot = new THREE.Mesh(new THREE.BoxGeometry(...slotSize), GLOW_SLOT_MAT);
  const slotOff = faceOffset(facing, thin * 0.4);
  slot.position.set(slotOff[0], -h * 0.22, slotOff[2]);
  group.add(slot);

  const traySize: [number, number, number] =
    facing.axis === 'x' ? [thin * 0.55, h * 0.05, along * 0.62] : [along * 0.62, h * 0.05, thin * 0.55];
  const tray = new THREE.Mesh(new THREE.BoxGeometry(...traySize), DISPENSER_TRAY_MAT);
  const trayOff = faceOffset(facing, faceDist + thin * 0.12);
  tray.position.set(trayOff[0], -h * 0.4, trayOff[2]);
  group.add(tray);

  const labelMat = new THREE.MeshBasicMaterial({ map: makeDispenserLabelTexture() });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(along * 0.86, h * 0.32), labelMat);
  const labelOff = faceOffset(facing, faceDist + 0.005);
  label.position.set(labelOff[0], h * 0.28, labelOff[2]);
  label.rotation.y = faceRotY;
  label.userData.ownsMaterial = true;
  group.add(label);

  return group;
}

// Wall-mounted fixtures (dispenser, keypad, door) are authored with their
// thin axis already matching the wall they sit against, but that axis can be
// x or z depending on the wall. This infers which world axis is thin and
// which side of it points toward the room's floor center, so the
// faceplate/handle land facing the player instead of into the wall.
interface Facing {
  axis: 'x' | 'z';
  sign: 1 | -1;
}

function inferFacing(it: InteractableDef, floor: RoomDef['floor']): Facing {
  const [sx, , sz] = it.size;
  if (sx < sz) {
    const cx = (floor.minX + floor.maxX) / 2;
    return { axis: 'x', sign: it.pos[0] > cx ? -1 : 1 };
  }
  const cz = (floor.minZ + floor.maxZ) / 2;
  return { axis: 'z', sign: it.pos[2] > cz ? -1 : 1 };
}

// Explicit facing, for fixtures where inferFacing's "toward room center"
// heuristic misfires (alcove/nook mounts — see InteractableDef.facing).
function explicitFacing(facing: 'px' | 'nx' | 'pz' | 'nz'): Facing {
  switch (facing) {
    case 'px':
      return { axis: 'x', sign: 1 };
    case 'nx':
      return { axis: 'x', sign: -1 };
    case 'pz':
      return { axis: 'z', sign: 1 };
    case 'nz':
      return { axis: 'z', sign: -1 };
  }
}

// Facing resolution shared by buildDispenser/buildKeypad/buildDoor: an
// authored def.facing always wins; otherwise fall back to the room-center
// heuristic.
function resolveFacing(it: InteractableDef, floor: RoomDef['floor']): Facing {
  return it.facing ? explicitFacing(it.facing) : inferFacing(it, floor);
}

// World-space offset a distance `dist` out along the facing's thin axis.
function faceOffset(facing: Facing, dist: number): [number, number, number] {
  return facing.axis === 'x' ? [facing.sign * dist, 0, 0] : [0, 0, facing.sign * dist];
}

// Yaw for a PlaneGeometry (default normal +z) so it faces the same way as faceOffset.
function faceRotationY(facing: Facing): number {
  if (facing.axis === 'z') return facing.sign > 0 ? 0 : Math.PI;
  return facing.sign > 0 ? Math.PI / 2 : -Math.PI / 2;
}

// Small clinical plate: dark ground, printed title + sub-line — same
// technique as makeDispenserLabelTexture but sized for a narrower fixture.
function makeKeypadPlateTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 176;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#152420';
  g.fillRect(0, 0, cv.width, cv.height);
  g.strokeStyle = '#6f8f86';
  g.lineWidth = 5;
  g.strokeRect(4, 4, cv.width - 8, cv.height - 8);
  g.fillStyle = '#bfe9de';
  g.font = '700 50px Arial, Helvetica, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('STAFF ACCESS', cv.width / 2, 66);
  g.fillStyle = '#7fa89c';
  g.font = '400 30px Arial, Helvetica, sans-serif';
  g.fillText('WING B', cv.width / 2, 126);
  addEdgeGrime(g, cv.width, cv.height);
  return new THREE.CanvasTexture(cv);
}

// 3x4 button grid drawn to a single canvas — geometry stays a flat plane,
// the buttons are just paint, per the "canvas over geometry" budget.
function makeKeypadGridTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 300;
  cv.height = 400;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#0e1a17';
  g.fillRect(0, 0, cv.width, cv.height);
  const labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  const cols = 3;
  const cellW = cv.width / cols;
  const cellH = cv.height / (labels.length / cols);
  g.font = '600 40px Arial, Helvetica, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  labels.forEach((label, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x0 = col * cellW;
    const y0 = row * cellH;
    const pad = 12;
    g.fillStyle = '#1c2f2a';
    g.fillRect(x0 + pad, y0 + pad, cellW - pad * 2, cellH - pad * 2);
    g.strokeStyle = '#4c6b62';
    g.lineWidth = 2;
    g.strokeRect(x0 + pad, y0 + pad, cellW - pad * 2, cellH - pad * 2);
    g.fillStyle = '#9fd8cb';
    g.fillText(label, x0 + cellW / 2, y0 + cellH / 2);
  });
  return new THREE.CanvasTexture(cv);
}

// Keypad reads as "just a box" otherwise — composite so it registers as a
// wall fixture: pad-material body, printed ID plate, painted button grid,
// thin glowing display strip. Built in a canonical z-thin/faces-+z frame
// (matching buildDispenser) and offset per-part using the inferred facing,
// so it looks right whether the wall it hangs on is x-thin or z-thin.
function buildKeypad(it: InteractableDef, floor: RoomDef['floor']): THREE.Group {
  const group = new THREE.Group();
  const [w, h, d] = it.size;
  const facing = resolveFacing(it, floor);
  const faceDist = (facing.axis === 'x' ? w : d) / 2;
  const faceRotY = faceRotationY(facing);
  const along = facing.axis === 'x' ? d : w; // extent along the wall, across the face

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MATERIALS.pad);
  group.add(body);

  const plateMat = new THREE.MeshBasicMaterial({ map: makeKeypadPlateTexture() });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(along * 0.86, h * 0.22), plateMat);
  const plateOff = faceOffset(facing, faceDist + 0.004);
  plate.position.set(plateOff[0], h * 0.3, plateOff[2]);
  plate.rotation.y = faceRotY;
  plate.userData.ownsMaterial = true;
  group.add(plate);

  const gridMat = new THREE.MeshBasicMaterial({ map: makeKeypadGridTexture() });
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(along * 0.6, h * 0.5), gridMat);
  const gridOff = faceOffset(facing, faceDist + 0.004);
  grid.position.set(gridOff[0], -h * 0.12, gridOff[2]);
  grid.rotation.y = faceRotY;
  grid.userData.ownsMaterial = true;
  group.add(grid);

  const stripSize: [number, number, number] =
    facing.axis === 'x' ? [0.012, h * 0.04, along * 0.62] : [along * 0.62, h * 0.04, 0.012];
  const strip = new THREE.Mesh(new THREE.BoxGeometry(...stripSize), GLOW_SLOT_MAT);
  const stripOff = faceOffset(facing, faceDist + 0.01);
  strip.position.set(stripOff[0], h * 0.14, stripOff[2]);
  group.add(strip);

  return group;
}

// Small clinical plate for a door header — reuses the dispenser's printed-
// label look. Text is derived from the def id since room defs aren't edited.
function makeDoorPlateTexture(text: string): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 144;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#e7ece9';
  g.fillRect(0, 0, cv.width, cv.height);
  g.strokeStyle = '#8a9a95';
  g.lineWidth = 5;
  g.strokeRect(4, 4, cv.width - 8, cv.height - 8);
  g.fillStyle = '#2b3a36';
  g.font = '700 48px Arial, Helvetica, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, cv.width / 2, cv.height / 2);
  return new THREE.CanvasTexture(cv);
}

function doorPlateText(id: string): string | null {
  if (id === 'staffdoor') return 'B-WING · STAFF ONLY';
  if (id === 'exitdoor') return 'EXIT';
  return null;
}

// Door reads as an anonymous slab otherwise — composite adds a kick-plate,
// an off-center push-bar, and (where the id implies one) a printed header
// plate. Doors are z-thin in both current rooms but this stays orientation-
// aware like the keypad since nothing here assumes that.
function buildDoor(it: InteractableDef, floor: RoomDef['floor']): THREE.Group {
  const group = new THREE.Group();
  const [w, h, d] = it.size;
  const facing = resolveFacing(it, floor);
  const faceDist = (facing.axis === 'x' ? w : d) / 2;
  const faceRotY = faceRotationY(facing);
  const along = facing.axis === 'x' ? d : w;

  const slab = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MATERIALS.door);
  group.add(slab);

  const kickThickness = 0.02;
  const kickSize: [number, number, number] =
    facing.axis === 'x' ? [kickThickness, h * 0.16, along * 0.86] : [along * 0.86, h * 0.16, kickThickness];
  const kick = new THREE.Mesh(new THREE.BoxGeometry(...kickSize), MATERIALS.wall2);
  const kickOff = faceOffset(facing, faceDist + kickThickness / 2);
  kick.position.set(kickOff[0], -h * 0.38, kickOff[2]);
  group.add(kick);

  const barThickness = 0.03;
  const barSize: [number, number, number] =
    facing.axis === 'x' ? [barThickness, 0.05, along * 0.3] : [along * 0.3, 0.05, barThickness];
  const bar = new THREE.Mesh(new THREE.BoxGeometry(...barSize), MATERIALS.chain);
  const barOff = faceOffset(facing, faceDist + barThickness / 2 + 0.01);
  const lateral = along * 0.22; // off-center, push-bar style rather than dead-center
  if (facing.axis === 'x') bar.position.set(barOff[0], 0, barOff[2] + lateral);
  else bar.position.set(barOff[0] + lateral, 0, barOff[2]);
  group.add(bar);

  const plateText = doorPlateText(it.id);
  if (plateText) {
    const plateMat = new THREE.MeshBasicMaterial({ map: makeDoorPlateTexture(plateText) });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(along * 0.7, h * 0.12), plateMat);
    const plateOff = faceOffset(facing, faceDist + 0.005);
    plate.position.set(plateOff[0], h * 0.36, plateOff[2]);
    plate.rotation.y = faceRotY;
    plate.userData.ownsMaterial = true;
    group.add(plate);
  }

  return group;
}

// Two-tone capsule (white body, teal-emissive hemisphere caps) built along
// local Y then tilted — reused by both pill_pickup (bare) and pill_cup
// (resting inside). Caps use SphereGeometry theta-ranges instead of a
// rotation, so no extra transform is needed to seat them flush on the body.
function buildCapsuleMesh(size: number, tiltZ = Math.PI / 2.3, tiltX = 0.25): THREE.Group {
  const wrap = new THREE.Group();
  const r = size * 0.32;
  const cylLen = Math.max(size - r * 2, r * 0.6);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, cylLen, 10), MATERIALS.pill);
  wrap.add(body);

  const top = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), CAPSULE_CAP_MAT);
  top.position.y = cylLen / 2;
  wrap.add(top);

  const bottom = new THREE.Mesh(
    new THREE.SphereGeometry(r, 10, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    CAPSULE_CAP_MAT,
  );
  bottom.position.y = -cylLen / 2;
  wrap.add(bottom);

  wrap.rotation.set(tiltX, 0, tiltZ);
  return wrap;
}

function buildPillPickup(it: InteractableDef): THREE.Group {
  const group = new THREE.Group();
  group.add(buildCapsuleMesh(Math.max(...it.size)));
  return group;
}

// Short tapered paper cup (open top, flat base) with a capsule resting
// inside, sized off the def's footprint/height.
function buildPillCup(it: InteractableDef): THREE.Group {
  const group = new THREE.Group();
  const [sx, h, sz] = it.size;
  const diameter = Math.max(sx, sz);
  const rTop = diameter * 0.55;
  const rBottom = diameter * 0.38;

  const wall = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, 12, 1, true), PILL_CUP_MAT);
  group.add(wall);

  const base = new THREE.Mesh(new THREE.CircleGeometry(rBottom, 12), PILL_CUP_MAT);
  base.rotation.x = -Math.PI / 2;
  base.position.y = -h / 2 + 0.001;
  group.add(base);

  const capsule = buildCapsuleMesh(diameter * 0.55, Math.PI / 2.6, 0.15);
  capsule.position.set(diameter * 0.08, h * 0.1, -diameter * 0.05);
  group.add(capsule);

  return group;
}

// Disposes geometry (and any flagged-owned materials) on an object and its
// descendants. Used for both single-mesh interactables and composite groups
// like the dispenser, so removal/room-clear never leaks canvas textures.
function disposeObject3D(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    if (child.userData.ownsMaterial) {
      const mat = child.material as THREE.MeshBasicMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
  });
}

export class World {
  room!: RoomDef;
  colliders: ColliderDef[] = [];
  // Verticality (see rooms/types.ts) — this room's current height regions.
  // Small arrays (a handful of regions at most), read every frame by
  // floorHeightAt with no allocation.
  private heightZones: HeightZone[] = [];
  private ramps: RampDef[] = [];

  private readonly root = new THREE.Group();
  private readonly groups: Record<StateFilter, THREE.Group> = {
    both: new THREE.Group(),
    lucid: new THREE.Group(),
    unmed: new THREE.Group(),
  };
  private readonly interactables = new Map<string, { def: InteractableDef; mesh: THREE.Object3D }>();
  // Pill-ish meshes get an idle bob/spin so they read as "take me". Composite
  // pill fixtures are groups now, not bare meshes, hence Object3D here.
  private readonly animated: Array<{ mesh: THREE.Object3D; baseY: number }> = [];
  // Scrawl materials — per-instance (ownsMaterial), so wobbling each one's
  // opacity here is safe; phase gives every scrawl an independent shimmer
  // instead of them all pulsing in lockstep.
  private readonly scrawlMats: Array<{ mat: THREE.MeshBasicMaterial; phase: number }> = [];
  // Only scrawls authored with a ScrawlDef.id land here — most scrawls are
  // static flavor text and never need a lookup. Keyed for updateScrawlText.
  private readonly scrawlEntries = new Map<string, { mat: THREE.MeshBasicMaterial; def: ScrawlDef }>();
  // TV static re-noise timer — one shared canvas texture for every TV block
  // in the scene, repainted on a period rather than every frame.
  private tvStaticTimer = 0;
  // Ceiling-strip flicker — a brief, occasional dip, never a strobe.
  private stripFlickerLeft = 0;
  private lastT = 0;

  // Focused-interactable highlight (see setFocused below). A handful of
  // entries at most (one interactable's sub-meshes), rebuilt only when the
  // focused id actually changes.
  private focusedId: string | null = null;
  private readonly focusHighlights: Array<{
    mesh: THREE.Mesh;
    base: THREE.Material & { emissive?: THREE.Color; emissiveIntensity?: number };
    clone: THREE.Material & { emissive?: THREE.Color; emissiveIntensity?: number };
  }> = [];
  private static readonly FOCUS_EMISSIVE_BUMP = 0.35;

  constructor(scene: THREE.Scene) {
    scene.add(this.root);
    this.root.add(this.groups.both, this.groups.lucid, this.groups.unmed);
  }

  loadRoom(def: RoomDef): void {
    this.clear();
    this.room = def;
    this.colliders = def.colliders.slice();
    this.heightZones = def.heightZones ?? [];
    this.ramps = def.ramps ?? [];

    // floor + ceiling — single large planes per room, so (unlike the shared
    // wall/prop materials above) each gets its own cloned texture with
    // `repeat` set from the real room size, tiles/pinholes at true scale
    // instead of stretching. Cloning shares the baked canvas image but keeps
    // an independent repeat/offset transform; the clone (not the module-level
    // base texture) is what gets disposed on room clear, same ownsMaterial
    // pattern as scrawls.
    const w = def.floor.maxX - def.floor.minX;
    const d = def.floor.maxZ - def.floor.minZ;
    const cx = (def.floor.minX + def.floor.maxX) / 2;
    const cz = (def.floor.minZ + def.floor.maxZ) / 2;

    const floorTex = FLOOR_BASE_TEX.clone();
    floorTex.repeat.set(w / (FLOOR_TILE_M * FLOOR_GRID), d / (FLOOR_TILE_M * FLOOR_GRID));
    const floorMat = new THREE.MeshLambertMaterial({ map: floorTex });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0, cz);
    floor.userData.ownsMaterial = true;

    const ceilTex = CEIL_BASE_TEX.clone();
    ceilTex.repeat.set(w / (CEIL_TILE_M * CEIL_GRID), d / (CEIL_TILE_M * CEIL_GRID));
    const ceilMat = new THREE.MeshLambertMaterial({ map: ceilTex });
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(cx, 3, cz);
    ceil.userData.ownsMaterial = true;

    this.groups.both.add(floor, ceil);

    for (const b of def.blocks) {
      const mat = b.mat === 'glow' ? glowMaterialFor(classifyGlowBlock(b.size)) : MATERIALS[b.mat];
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...b.size), mat);
      mesh.position.set(...b.pos);
      if (b.rotY) mesh.rotation.y = b.rotY;
      this.groups[b.states ?? 'both'].add(mesh);
    }

    for (const s of def.scrawls) {
      const mat = new THREE.MeshBasicMaterial({ map: makeScrawlTexture(s), transparent: true });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(s.size, s.size / 2), mat);
      mesh.position.set(...s.pos);
      mesh.rotation.y = s.rotY;
      mesh.userData.ownsMaterial = true;
      this.groups.unmed.add(mesh);
      // Memories/hallucinations, not paint — a slow opacity shimmer so they
      // read as alive. Each mesh owns its material already (ownsMaterial),
      // so wobbling opacity per-instance here doesn't touch anything shared.
      this.scrawlMats.push({ mat, phase: Math.random() * Math.PI * 2 });
      if (s.id) this.scrawlEntries.set(s.id, { mat, def: s });
    }

    for (const it of def.interactables) {
      let mesh: THREE.Object3D;
      switch (it.type) {
        case 'dispenser':
          mesh = buildDispenser(it, def.floor);
          break;
        case 'keypad':
          mesh = buildKeypad(it, def.floor);
          break;
        case 'door':
          mesh = buildDoor(it, def.floor);
          break;
        case 'pill_pickup':
          mesh = buildPillPickup(it);
          break;
        case 'pill_cup':
          mesh = buildPillCup(it);
          break;
        default:
          mesh = new THREE.Mesh(new THREE.BoxGeometry(...it.size), MATERIALS[it.mat]);
      }
      mesh.position.set(...it.pos);
      this.groups[it.states ?? 'both'].add(mesh);
      this.interactables.set(it.id, { def: it, mesh });
      if (it.type === 'pill_cup' || it.type === 'pill_pickup') {
        this.animated.push({ mesh, baseY: it.pos[1] });
      }
    }
  }

  applyState(state: WardState): void {
    this.groups.lucid.visible = state === 'lucid';
    this.groups.unmed.visible = state === 'unmed';
  }

  // Verticality — the walkable floor height at a given XZ, single-valued
  // (see rooms/types.ts's HeightZone/RampDef header). Ramps are checked
  // first so a ramp overlapping a flat zone's footprint always wins (lets a
  // room author a ramp's endpoints flush against an adjacent zone without
  // the zone's flat value fighting it at the seam). Falls through to 0 —
  // every room without heightZones/ramps behaves exactly as before.
  floorHeightAt(x: number, z: number): number {
    for (const r of this.ramps) {
      if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) {
        const t = r.axis === 'x' ? (x - r.minX) / (r.maxX - r.minX) : (z - r.minZ) / (r.maxZ - r.minZ);
        return r.yLow + (r.yHigh - r.yLow) * t;
      }
    }
    for (const hz of this.heightZones) {
      if (x >= hz.minX && x <= hz.maxX && z >= hz.minZ && z <= hz.maxZ) return hz.y;
    }
    return 0;
  }

  // Rewrites a scrawl authored with a matching ScrawlDef.id — rebakes its
  // canvas texture in place (position/rotation/size untouched), so a room
  // script can reroll a wall clue (e.g. a randomized keypad code) without a
  // full loadRoom, which would also reset colliders/interactables/doors.
  updateScrawlText(id: string, text: string): void {
    const entry = this.scrawlEntries.get(id);
    if (!entry) return;
    const oldMap = entry.mat.map;
    entry.def.text = text;
    entry.mat.map = makeScrawlTexture(entry.def);
    entry.mat.needsUpdate = true;
    oldMap?.dispose();
  }

  // Interactables currently in the room, for the Interaction raycast.
  entries(): Array<{ def: InteractableDef; mesh: THREE.Object3D }> {
    return [...this.interactables.values()];
  }

  removeInteractable(id: string): void {
    const entry = this.interactables.get(id);
    if (!entry) return;
    if (this.focusedId === id) this.setFocused(null); // drop any highlight clone before the mesh goes away
    entry.mesh.parent?.remove(entry.mesh);
    disposeObject3D(entry.mesh);
    this.interactables.delete(id);
    const ai = this.animated.findIndex((a) => a.mesh === entry.mesh);
    if (ai >= 0) this.animated.splice(ai, 1);
  }

  // Bumps emissiveIntensity (plus a warm highlight tint for materials that
  // have no emissive channel of their own, e.g. a bare door slab) on the
  // focused interactable's own meshes, restoring on blur. Interactable
  // materials (MATERIALS.dispenser/pad/door, GLOW_SLOT_MAT, etc.) are shared
  // across every instance in the room, so this never mutates them directly —
  // it clones lazily per call and swaps the clone in, so only the focused
  // instance visibly brightens.
  //
  // Safe/cheap to call every frame with the same id: id === this.focusedId
  // is a same-value fast path that does no work. Intended call site is
  // main.ts wiring `world.setFocused(interaction.focusedId)` once that's
  // integrated; not called from anywhere in this file.
  setFocused(id: string | null): void {
    if (id === this.focusedId) return;
    this.clearFocusHighlight();
    this.focusedId = id;
    if (id) this.applyFocusHighlight(id);
  }

  private applyFocusHighlight(id: string): void {
    const entry = this.interactables.get(id);
    if (!entry) return;
    entry.mesh.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const base = child.material as THREE.Material & { emissive?: THREE.Color; emissiveIntensity?: number };
      // MeshBasicMaterial label/plate maps have no emissive channel at all —
      // skip rather than fake one, not worth the complexity for a printed sign.
      if (base.emissiveIntensity === undefined) return;
      const clone = base.clone() as typeof base;
      if (!clone.emissive || clone.emissive.getHex() === 0x000000) {
        clone.emissive = new THREE.Color(0xfff2d9);
      }
      this.focusHighlights.push({ mesh: child, base, clone });
      child.material = clone;
    });
  }

  private clearFocusHighlight(): void {
    for (const h of this.focusHighlights) {
      h.mesh.material = h.base;
      h.clone.dispose();
    }
    this.focusHighlights.length = 0;
  }

  update(t: number): void {
    const dt = this.lastT === 0 ? 0 : Math.max(0, t - this.lastT);
    this.lastT = t;

    for (const a of this.animated) {
      a.mesh.rotation.y = t;
      a.mesh.position.y = a.baseY + Math.sin(t * 2) * 0.03;
    }
    // subtle sinusoidal pulse so dispenser slots and keypad displays draw the eye
    GLOW_SLOT_MAT.emissiveIntensity = GLOW_SLOT_BASE_INTENSITY + Math.sin(t * 2.2) * GLOW_SLOT_PULSE_AMOUNT;

    // Pill capsules already bob/spin on sin(t*2) — pulse their glow in the
    // same phase so the light feels like it's coming from the motion.
    const pillPulse = 0.15 * Math.sin(t * 2);
    CAPSULE_CAP_MAT.emissiveIntensity = 0.5 + pillPulse;
    (MATERIALS.pill as THREE.MeshLambertMaterial).emissiveIntensity = 0.55 + pillPulse;

    // Exit/vestibule glow: gentle breathing pulse — "the way out" always has a live quality.
    const doorBreathe = 1 + Math.sin(t * 1.3) * 0.15;
    GLOW_DOOR_MAT.color.copy(GLOW_BASE_COLOR).multiplyScalar(doorBreathe);

    // Ceiling strips / misc light panels: institutional fluorescents — rare, brief dip, never a strobe.
    if (this.stripFlickerLeft > 0) {
      this.stripFlickerLeft -= dt;
    } else if (Math.random() < 0.015) {
      this.stripFlickerLeft = 0.04 + Math.random() * 0.06;
    }
    const stripBrightness = this.stripFlickerLeft > 0 ? 0.35 : 1;
    GLOW_STRIP_MAT.color.copy(GLOW_BASE_COLOR).multiplyScalar(stripBrightness);

    // TVs: re-noise the shared static canvas on a ~120ms period, not every frame.
    this.tvStaticTimer += dt;
    if (this.tvStaticTimer >= 0.12) {
      this.tvStaticTimer = 0;
      paintTvStatic();
    }

    // Scrawls: memories/hallucinations, not paint — a slow independent opacity shimmer per instance.
    for (const s of this.scrawlMats) {
      s.mat.opacity = 0.82 + Math.sin(t * 1.6 + s.phase) * 0.16;
    }

    // Focused-interactable highlight: re-derive from the live base material
    // every frame so a pulsing base (dispenser slot, pill glow, door
    // breathing) keeps pulsing under the brightness bump instead of freezing
    // at whatever value it had the instant focus began.
    for (const h of this.focusHighlights) {
      if (h.base.emissiveIntensity !== undefined) {
        h.clone.emissiveIntensity = h.base.emissiveIntensity + World.FOCUS_EMISSIVE_BUMP;
      }
      if (h.base.emissive && h.clone.emissive) h.clone.emissive.copy(h.base.emissive);
    }
  }

  private clear(): void {
    this.setFocused(null);
    for (const group of Object.values(this.groups)) {
      for (const child of [...group.children]) {
        group.remove(child);
        disposeObject3D(child);
      }
    }
    this.interactables.clear();
    this.animated.length = 0;
    this.scrawlMats.length = 0;
    this.scrawlEntries.clear();
    this.colliders = [];
  }
}
