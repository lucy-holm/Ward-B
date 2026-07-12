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

export class World {
  room!: RoomDef;
  colliders: ColliderDef[] = [];

  private readonly root = new THREE.Group();
  private readonly groups: Record<StateFilter, THREE.Group> = {
    both: new THREE.Group(),
    lucid: new THREE.Group(),
    unmed: new THREE.Group(),
  };
  private readonly interactables = new Map<string, { def: InteractableDef; mesh: THREE.Mesh }>();
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
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...it.size), MATERIALS[it.mat]);
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
  entries(): Array<{ def: InteractableDef; mesh: THREE.Mesh }> {
    return [...this.interactables.values()];
  }

  removeInteractable(id: string): void {
    const entry = this.interactables.get(id);
    if (!entry) return;
    entry.mesh.parent?.remove(entry.mesh);
    entry.mesh.geometry.dispose();
    this.interactables.delete(id);
    const ai = this.animated.findIndex((a) => a.mesh === entry.mesh);
    if (ai >= 0) this.animated.splice(ai, 1);
  }

  update(t: number): void {
    for (const a of this.animated) {
      a.mesh.rotation.y = t;
      a.mesh.position.y = a.baseY + Math.sin(t * 2) * 0.03;
    }
  }

  private clear(): void {
    for (const group of Object.values(this.groups)) {
      for (const child of [...group.children]) {
        group.remove(child);
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.userData.ownsMaterial) {
            const mat = child.material as THREE.MeshBasicMaterial;
            mat.map?.dispose();
            mat.dispose();
          }
        }
      }
    }
    this.interactables.clear();
    this.animated.length = 0;
    this.colliders = [];
  }
}
