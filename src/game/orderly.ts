// The ward's first NPC. Patrols a waypoint loop; while the player is UNMED
// and inside his sight cone (and not behind an occluder) he "sees" them for
// real, with a short grace period before it counts as a catch. Lucid is
// always safe near him — this is deliberately not a nav system: distance +
// forward cone + a handful of AABB occluders, nothing pathfinds around them.
import * as THREE from 'three';
import type { WardState } from '../rooms/types';
import { TUNING } from '../tuning';

export interface OrderlyAABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface OrderlyCallbacks {
  onWarn(): void;
  onCaught(): void;
}

function buildHumanoid(color: number, scale: number): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color });
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.46 * scale, 0.7 * scale, 0.28 * scale), mat);
  legs.position.y = 0.35 * scale;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52 * scale, 0.9 * scale, 0.3 * scale), mat);
  torso.position.y = 1.05 * scale;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3 * scale, 0.3 * scale, 0.3 * scale), mat);
  head.position.y = 1.68 * scale;
  g.add(legs, torso, head);
  return g;
}

function disposeGroup(g: THREE.Group): void {
  g.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }
  });
}

// Liang-Barsky segment-vs-AABB clip test (2D, XZ plane): true if the segment
// from (x0,z0) to (x1,z1) intersects the box anywhere in [0,1].
function segmentHitsAABB(x0: number, z0: number, x1: number, z1: number, b: OrderlyAABB): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = x1 - x0;
  const dz = z1 - z0;
  const p = [-dx, dx, -dz, dz];
  const q = [x0 - b.minX, b.maxX - x0, z0 - b.minZ, b.maxZ - z0];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }
  return true;
}

export class Orderly {
  x: number;
  z: number;
  private fx = 0;
  private fz = -1;
  private wpIdx = 0;
  private pauseLeft = 0;
  private ramp = 0; // "being watched" ramp, 0..1
  private warned = false;

  private readonly root = new THREE.Group();
  private readonly lucidMesh: THREE.Group;
  private readonly unmedMesh: THREE.Group;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly waypoints: Array<{ x: number; z: number }>,
    private readonly occluders: OrderlyAABB[],
    private readonly callbacks: OrderlyCallbacks,
  ) {
    this.x = waypoints[0].x;
    this.z = waypoints[0].z;
    this.lucidMesh = buildHumanoid(0xdfe8e4, 1);
    this.unmedMesh = buildHumanoid(0x2a2430, 1.15);
    this.root.add(this.lucidMesh, this.unmedMesh);
    this.root.position.set(this.x, 0, this.z);
    scene.add(this.root);
    this.setWardState('lucid');
  }

  get watching(): number {
    return this.ramp;
  }

  setWardState(s: WardState): void {
    this.lucidMesh.visible = s === 'lucid';
    this.unmedMesh.visible = s === 'unmed';
  }

  update(dt: number, playerX: number, playerZ: number, playerState: WardState): void {
    this.patrol(dt);
    this.root.position.set(this.x, 0, this.z);
    this.root.rotation.y = Math.atan2(this.fx, this.fz);

    let seen = false;
    if (playerState === 'unmed') {
      const dx = playerX - this.x;
      const dz = playerZ - this.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.001 && dist < TUNING.orderly.sightRange) {
        const dot = (dx / dist) * this.fx + (dz / dist) * this.fz;
        const cosHalf = Math.cos((TUNING.orderly.coneDeg * Math.PI) / 360);
        if (dot > cosHalf && !this.occluded(playerX, playerZ)) seen = true;
      }
    }

    if (seen) {
      this.ramp = Math.min(1, this.ramp + dt / TUNING.orderly.graceSec);
      if (this.ramp >= TUNING.orderly.warnAt && !this.warned) {
        this.warned = true;
        this.callbacks.onWarn();
      }
      if (this.ramp >= 1) {
        this.ramp = 0;
        this.warned = false;
        this.callbacks.onCaught();
      }
    } else {
      this.ramp = Math.max(0, this.ramp - dt * 1.5);
      if (this.ramp < TUNING.orderly.warnAt) this.warned = false;
    }
  }

  dispose(): void {
    this.scene.remove(this.root);
    disposeGroup(this.lucidMesh);
    disposeGroup(this.unmedMesh);
  }

  private patrol(dt: number): void {
    if (this.pauseLeft > 0) {
      this.pauseLeft -= dt;
      return;
    }
    const target = this.waypoints[this.wpIdx];
    const dx = target.x - this.x;
    const dz = target.z - this.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.08) {
      this.wpIdx = (this.wpIdx + 1) % this.waypoints.length;
      this.pauseLeft = TUNING.orderly.pauseAtWaypoint;
      return;
    }
    this.fx = dx / dist;
    this.fz = dz / dist;
    const step = Math.min(TUNING.orderly.speed * dt, dist);
    this.x += this.fx * step;
    this.z += this.fz * step;
  }

  private occluded(px: number, pz: number): boolean {
    for (const o of this.occluders) {
      if (segmentHitsAABB(this.x, this.z, px, pz, o)) return true;
    }
    return false;
  }
}
