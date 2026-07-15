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
  // Verticality — optional floor-height lookup (game/world.ts's
  // floorHeightAt, or a room-local equivalent) applied to the orderly's
  // root Y each frame so he stands on his own level instead of floating
  // above/sinking below a raised or sunken floor region. His sight/chase
  // math stays pure XZ regardless (see game/world.ts's HeightZone/RampDef
  // header — cross-level LOS isn't modeled, so a room using this should
  // keep each orderly's reachable XZ footprint on one level). Omitted ⇒
  // y=0 always, identical to every room shipped before this option existed.
  floorHeightAt?: (x: number, z: number) => number;
  // Eye-glow tint (hex), default 0xffffff — the original uneven-white gauze
  // look. Rooms with multiple orderlies sharing one space (e.g. room12's day
  // hall, playtest 8: two counter-rotating patrols read as "one enemy
  // teleporting") can give each a distinct tint so they're distinguishable
  // as separate patrols from a distance, not just by path shape up close.
  eyeTint?: number;
  // Per-instance sight range override (m), default TUNING.orderly.sightRange.
  // A room can widen (or narrow) a specific orderly's detection distance
  // without touching the global default every other room relies on — e.g.
  // room13's full-width corridor, where the base 6m range leaves a provable
  // unseen gap along the far wall (see TUNING.lastWard's sight comment).
  sightRange?: number;
  // Per-instance cone half-angle-defining total angle override (deg),
  // default TUNING.orderly.coneDeg. Same rationale as sightRange above —
  // room13 needs a wide-enough cone to sweep the whole corridor width.
  coneDeg?: number;
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
const HUNCH_TILT = 0.1; // rad forward lean baked into torso/arms/head — reads as hunched shoulders, no animation involved

// Walk-cycle tuning — deliberately WRONG rather than naturalistic: a slow,
// stiff marionette swing that reads as too slow for the ground he actually
// covers. All of it rides on animClock, so it freezes exactly when he stops
// stepping (same convention as the head-tilt oscillation above).
const GAIT_FREQ = 1.8; // rad/s stride cadence at patrol/return speed
const CHASE_GAIT_MULT = 2; // gait rate doubles in chase, matching the faster ground speed
const LEG_SWING_AMP = 0.55; // rad, stiff swing from the hip
const ARM_SWING_AMP = 0.24; // rad
const ARM_PHASE_LAG = 0.9; // rad, arms trail the legs' phase instead of a clean mirror-swing
const CHASE_ARM_LIFT = 0.3; // rad, arms rise outward while chasing
const HITCH_AMP = 0.03; // m, whole-body vertical hitch per footfall
const TORSO_CHASE_PITCH = HUNCH_TILT * 1.9; // forward lean deepens mid-chase
const HEAD_WATCH_TURN_RATE = 6; // 1/s, how fast the head tracks the player while watched
const HEAD_RELAX_RATE = 3; // 1/s, how fast the head returns to forward while walking unwatched
const IDLE_SNAP_MIN_SEC = 6; // cumulative paused-time range before a sharp head snap
const IDLE_SNAP_RANGE_SEC = 4;
const IDLE_SNAP_ANGLE = 1.3; // rad, half-range of the snap target

// ---------------------------------------------------------------------------
// Procedural textures for the model — generated once at module init (shared
// across every Orderly instance; rooms 4 and 5 each spawn their own via
// buildUnmedBody). Only the per-instance *materials* that reference these
// are disposed in Orderly.dispose() (Material.dispose() doesn't cascade to
// its map/emissiveMap texture), so the shared canvases stay valid for the
// next room's orderly.
// ---------------------------------------------------------------------------

// Stained scrubs — fabric that used to be pale, gone grey-black under the
// ward's light: faint weave noise, a handful of darker stains, vertical fold
// lines. Kept dark overall so the torso still reads as part of the same
// near-black silhouette as the limbs/head, just with texture under it.
function makeTorsoTexture(): THREE.CanvasTexture {
  const size = 128;
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#20221d';
  g.fillRect(0, 0, size, size);

  for (let i = 0; i < 40; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 4 + Math.random() * 10;
    const lighter = Math.random() < 0.5;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, lighter ? 'rgba(120,124,110,0.08)' : 'rgba(0,0,0,0.10)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  for (let i = 0; i < 6; i++) {
    const x = Math.random() * size;
    const y = size * (0.35 + Math.random() * 0.6);
    const r = 6 + Math.random() * 16;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(6,7,5,0.5)');
    grad.addColorStop(1, 'rgba(6,7,5,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  g.strokeStyle = 'rgba(0,0,0,0.14)';
  g.lineWidth = 1;
  for (let x = 10; x < size; x += 18) {
    g.beginPath();
    g.moveTo(x + (Math.random() - 0.5) * 6, 0);
    g.lineTo(x + (Math.random() - 0.5) * 6, size);
    g.stroke();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Eye strip glow — uneven brightness across the strip, like light diffusing
// unevenly through gauze, instead of a flat emissive box.
function makeEyeGauzeTexture(): THREE.CanvasTexture {
  const w = 128;
  const h = 24;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#050504';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 7; i++) {
    const x = Math.random() * w;
    const y = h / 2 + (Math.random() - 0.5) * h * 0.4;
    const r = w * (0.08 + Math.random() * 0.14);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(232,232,224,${0.5 + Math.random() * 0.4})`);
    grad.addColorStop(1, 'rgba(232,232,224,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  return new THREE.CanvasTexture(cv);
}

// Soft radial falloff for the sight cone — center (apex) bright, edges fade
// to transparent, so the sector reads as a soft beam instead of a flat-tint
// wedge. Purely a look upgrade: see buildSightCone for how the uv attribute
// maps this onto the (unchanged) sector geometry.
function makeConeFadeTexture(): THREE.CanvasTexture {
  const size = 128;
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const g = cv.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(cv);
}

const TORSO_TEXTURE = makeTorsoTexture();
const EYE_GAUZE_TEXTURE = makeEyeGauzeTexture();
const CONE_FADE_TEXTURE = makeConeFadeTexture();

// Two boxes stacked along Y (wider segment toward the joint, narrower toward
// the extremity) — cheap taper using only primitives, no new geometry types.
// The returned group's local origin sits at the limb's vertical midpoint,
// same convention as the single box it replaces.
function buildTaperedLimb(
  topW: number,
  topD: number,
  bottomW: number,
  bottomD: number,
  length: number,
  mat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();
  const segLen = length / 2;
  const top = new THREE.Mesh(new THREE.BoxGeometry(topW, segLen, topD), mat);
  top.position.y = segLen / 2;
  g.add(top);
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(bottomW, segLen, bottomD), mat);
  bottom.position.y = -segLen / 2;
  g.add(bottom);
  return g;
}

interface UnmedBodyParts {
  group: THREE.Group;
  headGroup: THREE.Group;
  torso: THREE.Mesh;
  // Hip/shoulder pivots — rotating these swings the attached tapered limb
  // like a pendulum from the joint, instead of the limb's own midpoint.
  legPivots: [THREE.Group, THREE.Group];
  armPivots: [THREE.Group, THREE.Group];
}

function buildUnmedBody(eyeTint: number): UnmedBodyParts {
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({
    color: 0x0a0b09,
    roughness: 0.96,
    metalness: 0,
    emissive: 0x1b2e16,
    emissiveIntensity: 0.1, // faint sickly pale-green, barely there
  });

  // Legs: two separate hip-pivoted columns (previously one central mass with
  // nothing to swing) — each pivot sits at hip height, the tapered limb hangs
  // below it at its own vertical midpoint per buildTaperedLimb's convention.
  const legOffsetX = BODY.legW * 0.42;
  const legPivots: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * legOffsetX, BODY.legH, 0);
    const leg = buildTaperedLimb(BODY.legW * 0.62, BODY.legD * 0.95, BODY.legW * 0.46, BODY.legD * 0.7, BODY.legH, skin);
    leg.position.y = -BODY.legH / 2;
    pivot.add(leg);
    group.add(pivot);
    legPivots.push(pivot);
  }

  const torsoY = BODY.legH + BODY.torsoH / 2;
  const torsoMat = new THREE.MeshStandardMaterial({
    map: TORSO_TEXTURE,
    roughness: 0.92,
    metalness: 0,
    emissive: 0x1b2e16,
    emissiveIntensity: 0.06,
  });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(BODY.torsoW, BODY.torsoH, BODY.torsoD), torsoMat);
  torso.position.y = torsoY;
  torso.rotation.x = HUNCH_TILT; // forward lean, shoulder line reads hunched; Orderly.updateGait deepens this in chase
  group.add(torso);

  // Arms: shoulder-pivoted so the gait swing rotates them from the joint.
  // The static forward droop that used to live on the arm mesh itself now
  // lives on the pivot's rest rotation — same resting pose, animatable.
  const shoulderY = BODY.legH + BODY.torsoH - 0.08;
  const armX = BODY.torsoW / 2 + BODY.armW / 2 + 0.02;
  const armPivots: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * armX, shoulderY, 0);
    pivot.rotation.x = HUNCH_TILT * 0.5;
    const arm = buildTaperedLimb(BODY.armW * 1.15, BODY.armD * 1.15, BODY.armW * 0.7, BODY.armD * 0.7, BODY.armLen, skin);
    arm.position.y = -BODY.armLen / 2;
    pivot.add(arm);
    group.add(pivot);
    armPivots.push(pivot);
  }

  const headGroup = new THREE.Group();
  const headY = BODY.legH + BODY.torsoH + BODY.headS / 2 + 0.02;
  // tiny forward offset (derived from the same hunch lean) so the head reads
  // as carried forward off hunched shoulders — position only, the per-frame
  // tilt oscillation below is still pure rotation.z and untouched.
  headGroup.position.set(0, headY, Math.sin(HUNCH_TILT) * 0.12);
  headGroup.rotation.z = HEAD_BASE_TILT;
  const head = new THREE.Mesh(new THREE.BoxGeometry(BODY.headS, BODY.headS, BODY.headS), skin);
  headGroup.add(head);

  // eye strip — uneven glow, like light through gauze, instead of a flat box
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x141412,
    emissive: eyeTint,
    emissiveMap: EYE_GAUZE_TEXTURE,
    emissiveIntensity: 0.4,
    roughness: 0.5,
  });
  const eyes = new THREE.Mesh(new THREE.BoxGeometry(BODY.headS * 0.82, 0.04, 0.02), eyeMat);
  eyes.position.set(0, 0.01, BODY.headS / 2 + 0.004);
  headGroup.add(eyes);

  group.add(headGroup);
  return {
    group,
    headGroup,
    torso,
    legPivots: legPivots as [THREE.Group, THREE.Group],
    armPivots: armPivots as [THREE.Group, THREE.Group],
  };
}

// Flat translucent sector (triangle fan on XZ, y≈0.02) matching sightRange +
// coneDeg, local +Z = forward (matches root.rotation.y = atan2(fx,fz)).
// Position/index construction and the rangeM/coneDeg/segments math are
// unchanged from before — the uv attribute added below is purely cosmetic
// (feeds the radial alphaMap fade in the material) and doesn't touch
// visibility logic; updateSight/updateConeVisual still work off rangeM,
// coneDeg and the material's color/opacity exactly as before.
function buildSightCone(rangeM: number, coneDeg: number): THREE.Mesh {
  const halfRad = (coneDeg * Math.PI) / 360;
  const segments = 20;
  const positions: number[] = [0, 0.02, 0]; // apex
  const uvs: number[] = [0.5, 0.5]; // apex → fade texture's bright center
  for (let i = 0; i <= segments; i++) {
    const a = -halfRad + (2 * halfRad * i) / segments;
    const sx = Math.sin(a);
    const cz = Math.cos(a);
    positions.push(sx * rangeM, 0.02, cz * rangeM);
    uvs.push(0.5 + sx * 0.5, 0.5 + cz * 0.5);
  }
  const indices: number[] = [];
  for (let i = 1; i < segments + 1; i++) indices.push(0, i, i + 1);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshBasicMaterial({
    color: 0x661111,
    alphaMap: CONE_FADE_TEXTURE,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}

// Shortest-path angle lerp (handles the wrap at ±π) — used for the head's
// watch-tracking yaw so it turns the short way round instead of spinning.
function lerpAngle(a: number, b: number, t: number): number {
  const twoPi = Math.PI * 2;
  const diff = (((b - a + Math.PI) % twoPi) + twoPi) % twoPi - Math.PI;
  return a + diff * t;
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

  // Visual-only state (gait/head presentation) — nothing below this line
  // feeds back into sight/movement/mode logic, only reads it.
  private headYaw = 0;
  private idlePauseTimer = 0; // cumulative time spent frozen at a waypoint since the last snap
  private nextIdleSnapAt = IDLE_SNAP_MIN_SEC + Math.random() * IDLE_SNAP_RANGE_SEC;

  private readonly colliders: ColliderDef[];
  private readonly radius: number;
  private readonly floorHeightAt?: (x: number, z: number) => number;
  private readonly sightRange: number;
  private readonly coneDeg: number;

  private readonly root = new THREE.Group();
  private readonly unmedMesh: THREE.Group;
  private readonly headGroup: THREE.Group;
  private readonly torso: THREE.Mesh;
  private readonly legPivots: [THREE.Group, THREE.Group];
  private readonly armPivots: [THREE.Group, THREE.Group];
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
    this.floorHeightAt = options.floorHeightAt;
    this.sightRange = options.sightRange ?? TUNING.orderly.sightRange;
    this.coneDeg = options.coneDeg ?? TUNING.orderly.coneDeg;

    const built = buildUnmedBody(options.eyeTint ?? 0xffffff);
    this.unmedMesh = built.group;
    this.headGroup = built.headGroup;
    this.torso = built.torso;
    this.legPivots = built.legPivots;
    this.armPivots = built.armPivots;
    this.coneMesh = buildSightCone(this.sightRange, this.coneDeg);
    this.unmedMesh.add(this.coneMesh);

    this.root.add(this.unmedMesh);
    const initY = this.floorHeightAt ? this.floorHeightAt(this.x, this.z) : 0;
    this.root.position.set(this.x, initY, this.z);
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
    const bodyYaw = Math.atan2(this.fx, this.fz);

    // Contact catch: physical touch always catches an unmed player, no matter
    // his current mode — patrol/chase/returning all count. This used to only
    // fire inside the chase branch below, so sneaking up on him from outside
    // his sight cone (or bumping a returning orderly) let the player clip
    // straight through with no consequence. Gated on playerState === 'unmed'
    // so "lucid is always safe" (see file header) holds regardless of mode —
    // a lucid player can walk through his body with zero risk.
    if (playerState === 'unmed') {
      const dx = playerX - this.x;
      const dz = playerZ - this.z;
      if (Math.hypot(dx, dz) < TUNING.orderly.catchRadius) {
        this.beginReturn();
        this.callbacks.onCaught();
      }
    }
    if (this.mode === 'patrol') {
      this.updateSight(dt, playerX, playerZ, playerState);
    }
    // mode === 'returning': ramp stays 0, no sight checks — he gave up (but
    // the contact check above still applies to him).

    // Presentation only, run after the sight/catch update above so gait and
    // head-tracking read this frame's fresh mode/ramp instead of last frame's.
    this.updateGait(dt, stepping, bodyYaw, playerX, playerZ);

    const floorY = this.floorHeightAt ? this.floorHeightAt(this.x, this.z) : 0;
    this.root.position.set(this.x, floorY, this.z);
    this.root.rotation.y = bodyYaw;

    this.updateConeVisual();
  }

  dispose(): void {
    this.scene.remove(this.root);
    disposeGroup(this.unmedMesh);
  }

  // Walk animation, head tracking/idle-snap, and chase posture — pure
  // presentation. Reads this.mode/this.ramp/this.animClock (all owned and
  // mutated elsewhere) but never writes them; no detection math or movement
  // lives here.
  private updateGait(dt: number, stepping: boolean, bodyYaw: number, playerX: number, playerZ: number): void {
    // Head-tilt oscillation (unchanged cadence, still frozen with animClock)
    // plus a yaw that tracks the player while watched, relaxes forward while
    // walking unwatched, or holds dead still — punctuated by an occasional
    // sharp snap — while frozen at a waypoint.
    this.headGroup.rotation.z = HEAD_BASE_TILT + Math.sin(this.animClock * HEAD_TILT_FREQ) * HEAD_TILT_AMP;

    if (this.ramp > 0) {
      // Watching: the head turns to face the player regardless of which way
      // the body is currently walking — the single creepiest cheap trick
      // available. Body keeps its own path/facing (root.rotation.y at the
      // call site); only the head diverges from it.
      const dxP = playerX - this.x;
      const dzP = playerZ - this.z;
      const distP = Math.hypot(dxP, dzP);
      if (distP > 0.001) {
        const worldYaw = Math.atan2(dxP, dzP);
        this.headYaw = lerpAngle(this.headYaw, worldYaw - bodyYaw, Math.min(1, dt * HEAD_WATCH_TURN_RATE));
      }
    } else if (stepping) {
      // Free head — restored the instant the watch-ramp has fully decayed.
      this.headYaw = lerpAngle(this.headYaw, 0, Math.min(1, dt * HEAD_RELAX_RATE));
    } else {
      // Frozen at a waypoint: perfectly still except for an occasional sharp
      // snap to a new angle once enough cumulative pause time has passed.
      this.idlePauseTimer += dt;
      if (this.idlePauseTimer >= this.nextIdleSnapAt) {
        this.headYaw = (Math.random() - 0.5) * 2 * IDLE_SNAP_ANGLE;
        this.idlePauseTimer = 0;
        this.nextIdleSnapAt = IDLE_SNAP_MIN_SEC + Math.random() * IDLE_SNAP_RANGE_SEC;
      }
    }
    this.headGroup.rotation.y = this.headYaw;

    // Gait: a slow, stiff marionette swing rather than a naturalistic cycle
    // scaled to ground speed — wrong-feeling beats realistic. Rides on
    // animClock, so it freezes solid the instant he stops stepping.
    const chase = this.mode === 'chase';
    const gaitPhase = this.animClock * GAIT_FREQ * (chase ? CHASE_GAIT_MULT : 1);
    this.legPivots[0].rotation.x = Math.sin(gaitPhase) * LEG_SWING_AMP;
    this.legPivots[1].rotation.x = Math.sin(gaitPhase + Math.PI) * LEG_SWING_AMP;
    this.armPivots[0].rotation.x = HUNCH_TILT * 0.5 + Math.sin(gaitPhase + Math.PI - ARM_PHASE_LAG) * ARM_SWING_AMP;
    this.armPivots[1].rotation.x = HUNCH_TILT * 0.5 + Math.sin(gaitPhase - ARM_PHASE_LAG) * ARM_SWING_AMP;
    const armLift = chase ? CHASE_ARM_LIFT : 0;
    this.armPivots[0].rotation.z = -armLift;
    this.armPivots[1].rotation.z = armLift;
    this.unmedMesh.position.y = Math.abs(Math.sin(gaitPhase)) * HITCH_AMP;

    // Chase posture: torso pitches forward harder, eased rather than snapped
    // so the transition into/out of a chase doesn't pop.
    const torsoTarget = chase ? TORSO_CHASE_PITCH : HUNCH_TILT;
    this.torso.rotation.x += (torsoTarget - this.torso.rotation.x) * Math.min(1, dt * 6);
  }

  private updateSight(dt: number, playerX: number, playerZ: number, playerState: WardState): void {
    let seen = false;
    if (playerState === 'unmed') {
      const dx = playerX - this.x;
      const dz = playerZ - this.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.001 && dist < this.sightRange) {
        const dot = (dx / dist) * this.fx + (dz / dist) * this.fz;
        const cosHalf = Math.cos((this.coneDeg * Math.PI) / 360);
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
