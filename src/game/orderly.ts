// The ward's first NPC. Patrols a waypoint loop; while the player is UNMED
// and inside his sight cone (and not behind an occluder) he "sees" them for
// real, with a short grace period before the watch-ramp fills and he moves
// to CHASE. Lucid is always safe — the instant the player shifts, the chase
// ends (he was never chasing anything a medicated person could see). This is
// deliberately not a nav system: distance + forward cone + a handful of AABB
// occluders/colliders, nothing pathfinds around them.
import * as THREE from 'three';
import type { ColliderDef, WardState } from '../rooms/types';
import { tryMove } from '../engine/collision';
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
  // Fired once when the watch-ramp fills and he commits to a pursuit.
  onChaseStart?(): void;
}

export interface OrderlyOptions {
  // Furniture/walls he won't clip through while patrolling or chasing. Pass
  // only always-on colliders (states 'both'/undefined) — state-gated ones
  // (e.g. the lucid-only staff door) don't apply to him.
  colliders?: ColliderDef[];
  // Collision radius against `colliders`, default TUNING.orderly.radius.
  radius?: number;
}

// Proportions for the unmed body: unnaturally tall and thin, arms hanging
// well past where knees would be, head slightly too small.
const BODY = {
  legW: 0.3,
  legH: 1.35,
  legD: 0.22,
  torsoW: 0.4,
  torsoH: 0.95,
  torsoD: 0.24,
  headS: 0.22,
  armW: 0.09,
  armD: 0.09,
  armLen: 1.75,
};

const HEAD_BASE_TILT = 0.11; // rad, ~6 degrees off vertical, constant cock of the head
const HEAD_TILT_AMP = 0.035; // rad, slow oscillation on top of the base tilt
const HEAD_TILT_FREQ = 0.5; // rad/s — only advances while he's actually stepping

function buildUnmedBody(): { group: THREE.Group; headGroup: THREE.Group } {
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({
    color: 0x0a0b09,
    roughness: 0.96,
    metalness: 0,
    emissive: 0x1b2e16,
    emissiveIntensity: 0.1, // faint sickly pale-green, barely there
  });

  const legs = new THREE.Mesh(new THREE.BoxGeometry(BODY.legW, BODY.legH, BODY.legD), skin);
  legs.position.y = BODY.legH / 2;
  group.add(legs);

  const torsoY = BODY.legH + BODY.torsoH / 2;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(BODY.torsoW, BODY.torsoH, BODY.torsoD), skin);
  torso.position.y = torsoY;
  group.add(torso);

  const shoulderY = BODY.legH + BODY.torsoH - 0.08;
  const armY = shoulderY - BODY.armLen / 2; // hangs well past knee height (~legH/2)
  const armX = BODY.torsoW / 2 + BODY.armW / 2 + 0.02;
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(BODY.armW, BODY.armLen, BODY.armD), skin);
    arm.position.set(side * armX, armY, 0);
    group.add(arm);
  }

  const headGroup = new THREE.Group();
  const headY = BODY.legH + BODY.torsoH + BODY.headS / 2 + 0.02;
  headGroup.position.y = headY;
  headGroup.rotation.z = HEAD_BASE_TILT;
  const head = new THREE.Mesh(new THREE.BoxGeometry(BODY.headS, BODY.headS, BODY.headS), skin);
  headGroup.add(head);

  // barely-visible white eye strip — the only thing that reliably catches light
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    emissive: 0xe8e8e0,
    emissiveIntensity: 0.35,
    roughness: 0.5,
  });
  const eyes = new THREE.Mesh(new THREE.BoxGeometry(BODY.headS * 0.82, 0.03, 0.02), eyeMat);
  eyes.position.set(0, 0.01, BODY.headS / 2 + 0.004);
  headGroup.add(eyes);

  group.add(headGroup);
  return { group, headGroup };
}

// Flat translucent sector (triangle fan on XZ, y≈0.02) matching sightRange +
// coneDeg, local +Z = forward (matches root.rotation.y = atan2(fx,fz)).
function buildSightCone(rangeM: number, coneDeg: number): THREE.Mesh {
  const halfRad = (coneDeg * Math.PI) / 360;
  const segments = 20;
  const positions: number[] = [0, 0.02, 0]; // apex
  for (let i = 0; i <= segments; i++) {
    const a = -halfRad + (2 * halfRad * i) / segments;
    positions.push(Math.sin(a) * rangeM, 0.02, Math.cos(a) * rangeM);
  }
  const indices: number[] = [];
  for (let i = 1; i < segments + 1; i++) indices.push(0, i, i + 1);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshBasicMaterial({
    color: 0x661111,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
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

type Mode = 'patrol' | 'chase' | 'returning';

export class Orderly {
  x: number;
  z: number;
  private fx = 0;
  private fz = -1;
  private wpIdx = 0;
  private pauseLeft = 0;
  private ramp = 0; // "being watched" ramp, 0..1 — held at 1 while chasing
  private warned = false;
  private mode: Mode = 'patrol';
  private returnPause = 0;
  private animClock = 0; // only advances while he's actually stepping

  private readonly colliders: ColliderDef[];
  private readonly radius: number;

  private readonly root = new THREE.Group();
  private readonly unmedMesh: THREE.Group;
  private readonly headGroup: THREE.Group;
  private readonly coneMesh: THREE.Mesh;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly waypoints: Array<{ x: number; z: number }>,
    private readonly occluders: OrderlyAABB[],
    private readonly callbacks: OrderlyCallbacks,
    options: OrderlyOptions = {},
  ) {
    this.x = waypoints[0].x;
    this.z = waypoints[0].z;
    this.colliders = options.colliders ?? [];
    this.radius = options.radius ?? TUNING.orderly.radius;

    const built = buildUnmedBody();
    this.unmedMesh = built.group;
    this.headGroup = built.headGroup;
    this.coneMesh = buildSightCone(TUNING.orderly.sightRange, TUNING.orderly.coneDeg);
    this.unmedMesh.add(this.coneMesh);

    this.root.add(this.unmedMesh);
    this.root.position.set(this.x, 0, this.z);
    scene.add(this.root);

    // Invisible until told otherwise — lucid is the default-safe assumption.
    this.unmedMesh.visible = false;
  }

  // Watch-ramp, 0..1 (held at 1 while chasing).
  get watching(): number {
    return this.ramp;
  }

  get chasing(): boolean {
    return this.mode === 'chase';
  }

  // Completely invisible while lucid — you never know where he is while
  // medicated. The instant the player shifts lucid mid-chase, he gives up.
  setWardState(s: WardState): void {
    if (s === 'lucid' && this.mode === 'chase') {
      this.beginReturn();
    }
    this.unmedMesh.visible = s === 'unmed';
  }

  update(dt: number, playerX: number, playerZ: number, playerState: WardState): void {
    let stepping = false;
    if (this.mode === 'patrol') stepping = this.patrolStep(dt);
    else if (this.mode === 'chase') stepping = this.chaseStep(dt, playerX, playerZ);
    else stepping = this.returnStep(dt);

    if (stepping) this.animClock += dt;
    // Dead stillness between steps IS the scare: the head-tilt oscillation
    // freezes the instant he stops moving, same as the rest of him.
    this.headGroup.rotation.z = HEAD_BASE_TILT + Math.sin(this.animClock * HEAD_TILT_FREQ) * HEAD_TILT_AMP;

    this.root.position.set(this.x, 0, this.z);
    this.root.rotation.y = Math.atan2(this.fx, this.fz);

    if (this.mode === 'chase') {
      const dx = playerX - this.x;
      const dz = playerZ - this.z;
      if (Math.hypot(dx, dz) < TUNING.orderly.catchRadius) {
        this.beginReturn();
        this.callbacks.onCaught();
      }
    } else if (this.mode === 'patrol') {
      this.updateSight(dt, playerX, playerZ, playerState);
    }
    // mode === 'returning': ramp stays 0, no sight checks — he gave up.

    this.updateConeVisual();
  }

  dispose(): void {
    this.scene.remove(this.root);
    disposeGroup(this.unmedMesh);
  }

  private updateSight(dt: number, playerX: number, playerZ: number, playerState: WardState): void {
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
        this.beginChase();
        this.callbacks.onChaseStart?.();
      }
    } else {
      this.ramp = Math.max(0, this.ramp - dt * 1.5);
      if (this.ramp < TUNING.orderly.warnAt) this.warned = false;
    }
  }

  private updateConeVisual(): void {
    const mat = this.coneMesh.material as THREE.MeshBasicMaterial;
    if (this.mode === 'chase') {
      mat.color.setHex(0xff1010);
      mat.opacity = 0.45;
    } else {
      const t = this.ramp;
      mat.color.setRGB(0.3 + 0.65 * t, 0.05, 0.05);
      mat.opacity = 0.08 + 0.32 * t;
    }
  }

  private beginChase(): void {
    this.mode = 'chase';
    this.ramp = 1;
    this.warned = false;
  }

  private beginReturn(): void {
    this.mode = 'returning';
    this.ramp = 0;
    this.warned = false;
    this.returnPause = TUNING.orderly.escapePauseSec;
  }

  private patrolStep(dt: number): boolean {
    if (this.pauseLeft > 0) {
      this.pauseLeft -= dt;
      return false;
    }
    const target = this.waypoints[this.wpIdx];
    const dx = target.x - this.x;
    const dz = target.z - this.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.08) {
      this.wpIdx = (this.wpIdx + 1) % this.waypoints.length;
      this.pauseLeft = TUNING.orderly.pauseAtWaypoint;
      return false;
    }
    this.fx = dx / dist;
    this.fz = dz / dist;
    const step = Math.min(TUNING.orderly.speed * dt, dist);
    this.moveBody(this.fx * step, this.fz * step);
    return true;
  }

  private chaseStep(dt: number, playerX: number, playerZ: number): boolean {
    const dx = playerX - this.x;
    const dz = playerZ - this.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.001) return false;
    this.fx = dx / dist;
    this.fz = dz / dist;
    const step = Math.min(TUNING.orderly.chaseSpeed * dt, dist);
    this.moveBody(this.fx * step, this.fz * step);
    return true;
  }

  private returnStep(dt: number): boolean {
    if (this.returnPause > 0) {
      this.returnPause -= dt;
      return false;
    }
    const wp = this.nearestWaypoint();
    const dx = wp.pos.x - this.x;
    const dz = wp.pos.z - this.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.08) {
      this.wpIdx = wp.idx;
      this.mode = 'patrol';
      this.pauseLeft = TUNING.orderly.pauseAtWaypoint;
      return false;
    }
    this.fx = dx / dist;
    this.fz = dz / dist;
    const step = Math.min(TUNING.orderly.speed * dt, dist);
    this.moveBody(this.fx * step, this.fz * step);
    return true;
  }

  private nearestWaypoint(): { idx: number; pos: { x: number; z: number } } {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < this.waypoints.length; i++) {
      const d = Math.hypot(this.waypoints[i].x - this.x, this.waypoints[i].z - this.z);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return { idx: bestIdx, pos: this.waypoints[bestIdx] };
  }

  private moveBody(dxStep: number, dzStep: number): void {
    const body = { x: this.x, z: this.z, r: this.radius };
    // `this.colliders` is pre-filtered by the room to always-on colliders
    // (states 'both'/undefined), so the WardState arg below is inert — every
    // collider passes isActive() regardless of what's passed here.
    tryMove(body, this.x + dxStep, this.z + dzStep, this.colliders, 'unmed');
    this.x = body.x;
    this.z = body.z;
  }

  private occluded(px: number, pz: number): boolean {
    for (const o of this.occluders) {
      if (segmentHitsAABB(this.x, this.z, px, pz, o)) return true;
    }
    return false;
  }
}
