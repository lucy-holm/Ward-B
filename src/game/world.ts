import * as THREE from 'three';
import type {
  InteractableDef,
  ColliderDef,
  MatName,
  RoomDef,
  ScrawlDef,
  StateFilter,
  WardState,
} from '../rooms/types';

// Shared grey-box materials (never disposed). Scrawl materials own their
// canvas textures and are disposed with the room.
const MATERIALS: Record<MatName, THREE.Material> = {
  wall: new THREE.MeshLambertMaterial({ color: 0xb9c9c4 }),
  wall2: new THREE.MeshLambertMaterial({ color: 0xa7b8b2 }),
  floor: new THREE.MeshLambertMaterial({ color: 0x5d6a66 }),
  ceil: new THREE.MeshLambertMaterial({ color: 0x8e9c97 }),
  prop: new THREE.MeshLambertMaterial({ color: 0x7d8f89 }),
  bed: new THREE.MeshLambertMaterial({ color: 0x8fa5b5 }),
  door: new THREE.MeshLambertMaterial({ color: 0x54707f }),
  chain: new THREE.MeshLambertMaterial({ color: 0x3c3f45 }),
  pill: new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x77e0c8, emissiveIntensity: 0.55 }),
  pad: new THREE.MeshLambertMaterial({ color: 0x1d2b27, emissive: 0x9fd8cb, emissiveIntensity: 0.35 }),
  dispenser: new THREE.MeshLambertMaterial({ color: 0x22332e, emissive: 0x9fd8cb, emissiveIntensity: 0.6 }),
  glow: new THREE.MeshBasicMaterial({ color: 0xfff2d9 }),
};

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

function makeScrawlTexture(def: ScrawlDef): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 256;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#c1170f';
  g.font = `${def.big ? 110 : 54}px 'Comic Sans MS', cursive, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.save();
  g.translate(256, 128);
  g.rotate(-0.05);
  const lines = def.text.split('\n');
  lines.forEach((l, i) => {
    g.fillText(l, 0, (i - (lines.length - 1) / 2) * (def.big ? 120 : 64));
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
  return new THREE.CanvasTexture(cv);
}

// Dispenser reads as "just a box" otherwise — build a composite so it registers
// as a fixture: dark body, recessed glowing slot, a tray lip, printed faceplate.
function buildDispenser(it: InteractableDef): THREE.Group {
  const group = new THREE.Group();
  const [w, h, d] = it.size;

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MATERIALS.dispenser);
  group.add(body);

  const slot = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, h * 0.16, d * 0.3), GLOW_SLOT_MAT);
  slot.position.set(0, -h * 0.22, d / 2 - d * 0.1);
  group.add(slot);

  const tray = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, h * 0.05, d * 0.55), DISPENSER_TRAY_MAT);
  tray.position.set(0, -h * 0.4, d / 2 + d * 0.12);
  group.add(tray);

  const labelMat = new THREE.MeshBasicMaterial({ map: makeDispenserLabelTexture() });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, h * 0.32), labelMat);
  label.position.set(0, h * 0.28, d / 2 + 0.005);
  label.userData.ownsMaterial = true;
  group.add(label);

  return group;
}

// Wall-mounted fixtures (keypad, door) are authored with their thin axis
// already matching the wall they sit against, but that axis can be x or z
// depending on the wall — unlike the dispenser, which is always z-thin and
// always faces +z. This infers which world axis is thin and which side of it
// points toward the room's floor center, so the faceplate/handle land facing
// the player instead of into the wall.
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
  const facing = inferFacing(it, floor);
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
  const facing = inferFacing(it, floor);
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

  constructor(scene: THREE.Scene) {
    scene.add(this.root);
    this.root.add(this.groups.both, this.groups.lucid, this.groups.unmed);
  }

  loadRoom(def: RoomDef): void {
    this.clear();
    this.room = def;
    this.colliders = def.colliders.slice();

    // floor + ceiling
    const w = def.floor.maxX - def.floor.minX;
    const d = def.floor.maxZ - def.floor.minZ;
    const cx = (def.floor.minX + def.floor.maxX) / 2;
    const cz = (def.floor.minZ + def.floor.maxZ) / 2;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), MATERIALS.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0, cz);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), MATERIALS.ceil);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(cx, 3, cz);
    this.groups.both.add(floor, ceil);

    for (const b of def.blocks) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...b.size), MATERIALS[b.mat]);
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
    }

    for (const it of def.interactables) {
      let mesh: THREE.Object3D;
      switch (it.type) {
        case 'dispenser':
          mesh = buildDispenser(it);
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

  // Interactables currently in the room, for the Interaction raycast.
  entries(): Array<{ def: InteractableDef; mesh: THREE.Object3D }> {
    return [...this.interactables.values()];
  }

  removeInteractable(id: string): void {
    const entry = this.interactables.get(id);
    if (!entry) return;
    entry.mesh.parent?.remove(entry.mesh);
    disposeObject3D(entry.mesh);
    this.interactables.delete(id);
    const ai = this.animated.findIndex((a) => a.mesh === entry.mesh);
    if (ai >= 0) this.animated.splice(ai, 1);
  }

  update(t: number): void {
    for (const a of this.animated) {
      a.mesh.rotation.y = t;
      a.mesh.position.y = a.baseY + Math.sin(t * 2) * 0.03;
    }
    // subtle sinusoidal pulse so dispenser slots and keypad displays draw the eye
    GLOW_SLOT_MAT.emissiveIntensity = GLOW_SLOT_BASE_INTENSITY + Math.sin(t * 2.2) * GLOW_SLOT_PULSE_AMOUNT;
  }

  private clear(): void {
    for (const group of Object.values(this.groups)) {
      for (const child of [...group.children]) {
        group.remove(child);
        disposeObject3D(child);
      }
    }
    this.interactables.clear();
    this.animated.length = 0;
    this.colliders = [];
  }
}
