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

// Composite dispenser parts — shared across instances like MATERIALS (never disposed).
// Kept separate from MATERIALS.dispenser (the body) so the slot can pulse on its own.
const DISPENSER_SLOT_MAT = new THREE.MeshLambertMaterial({
  color: 0x0c1917,
  emissive: 0x9dfbe4,
  emissiveIntensity: 0.55,
});
const DISPENSER_TRAY_MAT = new THREE.MeshLambertMaterial({ color: 0x161d1b });
const DISPENSER_SLOT_BASE_INTENSITY = 0.55;
const DISPENSER_SLOT_PULSE_AMOUNT = 0.4;

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

  const slot = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, h * 0.16, d * 0.3), DISPENSER_SLOT_MAT);
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
  // Pill-ish meshes get an idle bob/spin so they read as "take me".
  private readonly animated: Array<{ mesh: THREE.Mesh; baseY: number }> = [];

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
      const mesh: THREE.Object3D =
        it.type === 'dispenser' ? buildDispenser(it) : new THREE.Mesh(new THREE.BoxGeometry(...it.size), MATERIALS[it.mat]);
      mesh.position.set(...it.pos);
      this.groups[it.states ?? 'both'].add(mesh);
      this.interactables.set(it.id, { def: it, mesh });
      if (it.type === 'pill_cup' || it.type === 'pill_pickup') {
        this.animated.push({ mesh: mesh as THREE.Mesh, baseY: it.pos[1] });
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
    // subtle sinusoidal pulse so dispensers draw the eye from across the room
    DISPENSER_SLOT_MAT.emissiveIntensity =
      DISPENSER_SLOT_BASE_INTENSITY + Math.sin(t * 2.2) * DISPENSER_SLOT_PULSE_AMOUNT;
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
