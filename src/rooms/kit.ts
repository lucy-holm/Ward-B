// ROOM AUTHORING KIT — thin, declarative wrappers around the machinery in
// build.ts / world.ts / game/orderly.ts / ui/keypad.ts. Nothing in this file
// invents new engine behaviour: every function here ends up producing the
// exact same BlockDef/ColliderDef/InteractableDef/ScrawlDef shapes, and the
// exact same RoomScript callback wiring, that room7/room8 (orderlies) and
// room2/room5 (keypad doors) hand-write today. The point is to stop
// re-deriving the same wall-face arithmetic and the same orderly/threat
// boilerplate in every new room file, and to catch the two bugs that have
// shipped more than once (fixtures embedded in / floating off the wall they
// mount on, and patrol legs that wedge an orderly's body against a collider)
// at module-init time instead of in playtest.
//
// See ROOM_AUTHORING.md for the full guide + a worked example (raw vs kit).
// See _kitcheck.ts for a complete demo room built entirely with this file.
//
// One import line covers everything a room needs:
//   import { RoomBuilder, dispenser, keypad, scrawl, keypadDoor, patrol,
//            makeOrderlyRoomScript } from './kit';

import type {
  ColliderDef,
  InteractableDef,
  RoomScript,
  ScrawlDef,
  StateFilter,
} from './types';
import { RoomBuilder, WALL_HALF_THICKNESS } from './build';
import type { GameCtx } from '../game/context';
import { openKeypad } from '../ui/keypad';
import { Orderly, type OrderlyAABB } from '../game/orderly';
import { TUNING } from '../tuning';

// Re-exports so a room file needs exactly one import line for the whole kit
// plus the primitives it's built on.
export { RoomBuilder } from './build';
export type { OrderlyAABB } from '../game/orderly';
export type { ColliderDef, InteractableDef, RoomDef, RoomScript, ScrawlDef, StateFilter, WardState } from './types';

// ---------------------------------------------------------------------------
// Wall-relative coordinates
//
// Every wall in this game is authored with rb.wallX(x0, x1, z) (runs along X,
// thin on Z) or rb.wallZ(z0, z1, x) (runs along Z, thin on X). 'n'/'s'/'e'/'w'
// below are just names for the four ways a fixture can sit against one of
// those walls, using the same "z toward spawn is usually +z" convention the
// existing rooms already follow (spawn sits at the south/+z end; the room's
// content — and its staff door — is further north/-z):
//
//   n — mounted on a wallX wall, facing +z (south, into the room, toward spawn)
//   s — mounted on a wallX wall, facing -z (north, into the room)
//   w — mounted on a wallZ wall, facing +x (east, into the room)
//   e — mounted on a wallZ wall, facing -x (west, into the room)
//
// "wallAt" is the same coordinate you passed as `z` to wallX (for n/s) or `x`
// to wallZ (for e/w) — the wall's centerline, not its face.
// ---------------------------------------------------------------------------

export type WallSide = 'n' | 's' | 'e' | 'w';
// Matches the `facing?: 'px' | 'nx' | 'pz' | 'nz'` field landing on
// InteractableDef (rooms/types.ts) concurrently with this kit — 'p'/'n' =
// which way the fixture's face points, along whichever axis is thin.
export type FixtureFacing = 'px' | 'nx' | 'pz' | 'nz';

interface AxisSign {
  axis: 'x' | 'z';
  sign: 1 | -1;
}

const SIDE: Record<WallSide, AxisSign> = {
  n: { axis: 'z', sign: 1 },
  s: { axis: 'z', sign: -1 },
  w: { axis: 'x', sign: 1 },
  e: { axis: 'x', sign: -1 },
};

function facingOf(side: WallSide): FixtureFacing {
  const { axis, sign } = SIDE[side];
  return `${sign > 0 ? 'p' : 'n'}${axis}` as FixtureFacing;
}

// World coordinate of the wall's face on the room-interior side (the side a
// fixture mounted on it would face).
function wallFace(wallAt: number, side: WallSide): number {
  return wallAt + SIDE[side].sign * WALL_HALF_THICKNESS;
}

// ---------------------------------------------------------------------------
// Wall fixtures — dispenser / keypad
//
// Encodes the rule that eliminates the two recurring fixture bugs: the box's
// thin axis is derived from which wall it's on (never hand-picked, so it can
// never be authored backwards), and the box is centered exactly
// `thin/2` past the wall's face — touching it, never embedded, never
// floating. `facing` is emitted explicitly so world.ts's part-orientation
// code (buildDispenser/buildKeypad) doesn't have to re-infer it from
// position/size.
// ---------------------------------------------------------------------------

// A fixture def with `facing` guaranteed present (whether or not it's landed
// as an optional field on InteractableDef yet — this is a valid subtype
// either way, so it slots into RoomDef.interactables: InteractableDef[]
// without changes).
export interface FixtureDef extends InteractableDef {
  facing: FixtureFacing;
}

export interface FixtureOpts {
  id: string;
  side: WallSide;
  wallAt: number; // the wall's centerline coordinate (same value passed to wallX/wallZ)
  along: number; // position along the wall (x for n/s walls, z for e/w walls)
  y?: number; // vertical center, default 1.45 (matches every shipped dispenser/keypad)
  label: string;
  states?: StateFilter; // default 'both'
  // [thin, height, along] footprint before axis orientation. Defaults match
  // every dispenser/keypad currently in the game.
  size?: [number, number, number];
}

const DEFAULT_FIXTURE_Y = 1.45;
// [thin, height, along]
const DISPENSER_FOOTPRINT: [number, number, number] = [0.16, 0.75, 0.55];
const KEYPAD_FOOTPRINT: [number, number, number] = [0.14, 0.5, 0.4];

function orientedSize(footprint: [number, number, number], axis: 'x' | 'z'): [number, number, number] {
  const [thin, h, along] = footprint;
  return axis === 'z' ? [along, h, thin] : [thin, h, along];
}

function wallFixture(
  type: 'dispenser' | 'keypad',
  defaultFootprint: [number, number, number],
  mat: 'dispenser' | 'pad',
  opts: FixtureOpts,
): FixtureDef {
  const { axis, sign } = SIDE[opts.side];
  const footprint = opts.size ?? defaultFootprint;
  const [thin] = footprint;
  const size = orientedSize(footprint, axis);
  const face = wallFace(opts.wallAt, opts.side);
  const proudCenter = face + sign * (thin / 2); // touches the face, sits fully outside the wall
  const pos: [number, number, number] =
    axis === 'z' ? [opts.along, opts.y ?? DEFAULT_FIXTURE_Y, proudCenter] : [proudCenter, opts.y ?? DEFAULT_FIXTURE_Y, opts.along];

  return {
    id: opts.id,
    type,
    size,
    pos,
    mat,
    states: opts.states ?? 'both',
    label: opts.label,
    facing: facingOf(opts.side),
  };
}

export function dispenser(opts: FixtureOpts): FixtureDef {
  return wallFixture('dispenser', DISPENSER_FOOTPRINT, 'dispenser', opts);
}

export function keypad(opts: FixtureOpts): FixtureDef {
  return wallFixture('keypad', KEYPAD_FOOTPRINT, 'pad', opts);
}

// ---------------------------------------------------------------------------
// Scrawls
//
// Same wall-face math as wallFixture, but proud by a small fixed gap instead
// of half a footprint (a scrawl is a decal, not a volume) — 0.03m, matching
// every scrawl already authored against a perimeter wall. Encodes the "scrawl
// embedded in the wall" bug away: this can only place a scrawl just outside
// the wall's face, on the room side, facing the room.
// ---------------------------------------------------------------------------

export interface ScrawlOpts {
  size?: number; // default 2.6 (world-units width of the plane)
  y?: number; // default 1.65
  big?: boolean;
  proud?: number; // gap from the wall's face, default 0.03
}

const DEFAULT_SCRAWL_PROUD = 0.03;
const DEFAULT_SCRAWL_Y = 1.65;
const DEFAULT_SCRAWL_SIZE = 2.6;

export function scrawl(text: string, side: WallSide, wallAt: number, along: number, opts: ScrawlOpts = {}): ScrawlDef {
  const { axis, sign } = SIDE[side];
  const proud = opts.proud ?? DEFAULT_SCRAWL_PROUD;
  const face = wallFace(wallAt, side);
  const depthCoord = face + sign * proud;
  const pos: [number, number, number] =
    axis === 'z' ? [along, opts.y ?? DEFAULT_SCRAWL_Y, depthCoord] : [depthCoord, opts.y ?? DEFAULT_SCRAWL_Y, along];
  // Same axis/sign -> rotY rule as world.ts's (private) faceRotationY, so a
  // scrawl faces the room exactly like a fixture mounted on the same wall.
  const rotY = axis === 'z' ? (sign > 0 ? 0 : Math.PI) : sign > 0 ? Math.PI / 2 : -Math.PI / 2;
  return { text, size: opts.size ?? DEFAULT_SCRAWL_SIZE, pos, rotY, big: opts.big };
}

// ---------------------------------------------------------------------------
// Keypad door — the full lock assembly from room2/room5/room7/room8:
// a door InteractableDef sitting in the wall gap, a closure-held collider
// pushed into rb.colliders (mutated in place on unlock, never replaced —
// same trick every shipped room uses so nothing else needs to know the
// collider moved), and a wireKeypad()-shaped onInteract/isAvailable pair
// implementing the standard flow: unmed refusal toast, openKeypad, and on
// success the standard toasts + telemetry + door swing + collider disable.
// ---------------------------------------------------------------------------

// Every keypad-door swing currently in the game (room2 staffdoor, room5/7/8
// exitdoor) opens the same way regardless of door width: hinge at the wall
// gap's start edge, swing 0.85m through the gap into whatever's beyond the
// wall, rotate 90°. Kept as defaults; override openPos/openRotY/hinge for
// anything that doesn't fit (an e/w-wall door, a south-wall door, an
// asymmetric vestibule).
const DOOR_SWING_DEPTH = 0.85;

export interface KeypadDoorOpts {
  doorId: string;
  keypadId: string;
  code: string;

  side: WallSide; // wall the door sits in
  wallAt: number; // that wall's centerline coordinate
  along: number; // door's centerline position along the wall
  width?: number; // default 2
  height?: number; // default 3
  depth?: number; // default 0.2 (slab thickness)
  hinge?: 'start' | 'end'; // which edge it swings from, default 'start' (matches every shipped door)
  openDepth?: number; // default 0.85, see DOOR_SWING_DEPTH
  openPos?: [number, number, number]; // full override of the post-unlock position
  openRotY?: number; // default Math.PI / 2 (matches every shipped door)
  doorLabel?: string; // default 'the door'

  keypadAlong: number;
  keypadWallAt?: number; // default = wallAt (same wall as the door)
  keypadSide?: WallSide; // default = side
  keypadLabel?: string; // default 'use the keypad'

  states?: StateFilter;
  refusalToast?: string; // shown when interacting unmed; default matches every shipped keypad
  successToast?: string; // shown on the correct code; default is generic, override with room flavor
  successObjective?: string; // default 'the door is open. go.'
}

export interface KeypadDoorLock {
  door: FixtureDef;
  keypad: FixtureDef;
  collider: ColliderDef;
  isUnlocked(): boolean;
  // Standard isAvailable rule for this lock's two ids: door is never directly
  // interactable, keypad disappears once unlocked. Wire into your RoomScript
  // as `isAvailable: (id) => lock.isAvailable(id)`, or fold into a bigger
  // room via extraScript.isAvailable.
  isAvailable(id: string): boolean;
  // Standard onInteract flow for the keypad id (unmed refusal / openKeypad /
  // success toasts+telemetry+swing+collider-disable). Returns false
  // (unhandled) for any other id. Wire in as
  // `onInteract: (id, ctx) => lock.handleInteract(id, ctx)`.
  handleInteract(id: string, ctx: GameCtx): boolean;
}

export function keypadDoor(rb: RoomBuilder, opts: KeypadDoorOpts): KeypadDoorLock {
  const { axis, sign } = SIDE[opts.side];
  const width = opts.width ?? 2;
  const height = opts.height ?? 3;
  const depth = opts.depth ?? 0.2;
  const halfWidth = width / 2;
  const hinge = opts.hinge ?? 'start';

  const doorSize: [number, number, number] = axis === 'z' ? [width, height, depth] : [depth, height, width];
  const doorPos: [number, number, number] =
    axis === 'z' ? [opts.along, height / 2, opts.wallAt] : [opts.wallAt, height / 2, opts.along];

  const door: FixtureDef = {
    id: opts.doorId,
    type: 'door',
    size: doorSize,
    pos: doorPos,
    mat: 'door',
    states: opts.states ?? 'both',
    label: opts.doorLabel ?? 'the door',
    facing: facingOf(opts.side),
  };

  // Closure-held collider: pushed into rb.colliders now (so it's part of the
  // room's real collider list from the start, and included in whatever
  // ORDERLY_COLLIDERS filter the room builds), then mutated (not replaced)
  // on unlock — same "shove it out to x999" trick every shipped door uses,
  // so nothing else holding a reference to it needs to know it moved.
  const colliderHalf = depth / 2;
  const collider: ColliderDef =
    axis === 'z'
      ? {
          minX: opts.along - halfWidth,
          maxX: opts.along + halfWidth,
          minZ: opts.wallAt - colliderHalf,
          maxZ: opts.wallAt + colliderHalf,
          states: opts.states,
        }
      : {
          minX: opts.wallAt - colliderHalf,
          maxX: opts.wallAt + colliderHalf,
          minZ: opts.along - halfWidth,
          maxZ: opts.along + halfWidth,
          states: opts.states,
        };
  rb.colliders.push(collider);

  const hingeAlong = hinge === 'start' ? opts.along - halfWidth : opts.along + halfWidth;
  const openDepth = opts.openDepth ?? DOOR_SWING_DEPTH;
  // Swings away from the room, through the gap, to whatever's beyond the wall.
  const openWallCoord = opts.wallAt - sign * openDepth;
  const defaultOpenPos: [number, number, number] =
    axis === 'z' ? [hingeAlong, height / 2, openWallCoord] : [openWallCoord, height / 2, hingeAlong];
  const openPos = opts.openPos ?? defaultOpenPos;
  const openRotY = opts.openRotY ?? Math.PI / 2;

  const kp = keypad({
    id: opts.keypadId,
    side: opts.keypadSide ?? opts.side,
    wallAt: opts.keypadWallAt ?? opts.wallAt,
    along: opts.keypadAlong,
    label: opts.keypadLabel ?? 'use the keypad',
    states: opts.states,
  });

  let unlocked = false;

  return {
    door,
    keypad: kp,
    collider,
    isUnlocked: () => unlocked,
    isAvailable(id: string): boolean {
      if (id === opts.doorId) return false;
      if (id === opts.keypadId) return !unlocked;
      return true;
    },
    handleInteract(id: string, ctx: GameCtx): boolean {
      if (id !== opts.keypadId) return false;
      if (ctx.state.state === 'unmed') {
        ctx.hud.toast(opts.refusalToast ?? "the keypad is a smear of static. you can't read it like this.");
        return true;
      }
      ctx.telemetry.event('keypad_open');
      ctx.releasePointerLock();
      openKeypad({
        code: opts.code,
        onDenied: () => ctx.telemetry.event('keypad_denied'),
        onSuccess: () => {
          unlocked = true;
          ctx.telemetry.event('keypad_success');
          ctx.moveInteractable(opts.doorId, openPos, openRotY);
          // Same disable trick as every shipped room: push the X range far
          // away so the AABB can never overlap the player again, regardless
          // of which axis was actually the door's "along" axis.
          collider.minX = 999;
          collider.maxX = 999.2;
          ctx.hud.toast(opts.successToast ?? 'the door opens.');
          ctx.hud.setObjective(opts.successObjective ?? 'the door is open. go.');
          ctx.telemetry.event('door_opened');
        },
        onClose: () => {
          // player re-clicks the canvas to re-acquire pointer lock; nothing else to do.
        },
      });
      return true;
    },
  };
}

// ---------------------------------------------------------------------------
// Patrol validation
//
// Fails fast (throws at module init, i.e. the moment the room file is
// imported) instead of silently freezing an orderly mid-leg in playtest —
// the exact bug room7/room8's comments both call out by name ("he wedged on
// the shelf/filing block mid-leg"). Checks both waypoints and the legs
// between them (a leg can clip a corner even when both endpoints are clear)
// against every always-on collider (states 'both'/undefined — state-gated
// colliders, like a lucid-only blocker, don't apply to him, same rule
// Orderly itself documents).
// ---------------------------------------------------------------------------

export interface PatrolValidationOpts {
  // Body radius to validate against, default TUNING.orderly.radius (0.4).
  bodyRadius?: number;
  // Minimum required clearance from any collider, default bodyRadius + 0.1 —
  // i.e. the ">0.5 clearance" rule (0.4 body + 0.1 margin) called out in the
  // room7/room8 comments as the fix for the wedge bug.
  clearance?: number;
}

function distPointToAABB(x: number, z: number, c: ColliderDef): number {
  const dx = Math.max(c.minX - x, 0, x - c.maxX);
  const dz = Math.max(c.minZ - z, 0, z - c.maxZ);
  return Math.hypot(dx, dz);
}

function distPointToSegment(px: number, pz: number, x0: number, z0: number, x1: number, z1: number): number {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const lenSq = dx * dx + dz * dz;
  let t = lenSq > 0 ? ((px - x0) * dx + (pz - z0) * dz) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = x0 + t * dx;
  const cz = z0 + t * dz;
  return Math.hypot(px - cx, pz - cz);
}

// Liang-Barsky segment-vs-AABB test — same algorithm orderly.ts's private
// segmentHitsAABB uses for occlusion, reimplemented here (that one isn't
// exported and does a different job: sight-blocking, not clearance).
function segIntersectsAABB(x0: number, z0: number, x1: number, z1: number, c: ColliderDef): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = x1 - x0;
  const dz = z1 - z0;
  const p = [-dx, dx, -dz, dz];
  const q = [x0 - c.minX, c.maxX - x0, z0 - c.minZ, c.maxZ - z0];
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

// Exact minimum distance between a segment and an AABB in 2D (XZ): 0 if they
// intersect, otherwise the smaller of (each endpoint to the box) and (each
// box corner to the segment) — the standard convex-vs-segment distance.
function distSegToAABB(x0: number, z0: number, x1: number, z1: number, c: ColliderDef): number {
  if (segIntersectsAABB(x0, z0, x1, z1, c)) return 0;
  let best = Math.min(distPointToAABB(x0, z0, c), distPointToAABB(x1, z1, c));
  const corners: Array<[number, number]> = [
    [c.minX, c.minZ],
    [c.maxX, c.minZ],
    [c.maxX, c.maxZ],
    [c.minX, c.maxZ],
  ];
  for (const [cx, cz] of corners) best = Math.min(best, distPointToSegment(cx, cz, x0, z0, x1, z1));
  return best;
}

// Validates every waypoint and every leg between consecutive waypoints
// (looping back from the last to the first) against `colliders`, throwing on
// the first violation with a message identifying exactly which waypoint/leg
// and how much clearance is missing. Returns `waypoints` unchanged so it can
// be used inline: `new Orderly(scene, patrol(WAYPOINTS, rb.colliders), ...)`.
export function patrol(
  waypoints: Array<{ x: number; z: number }>,
  colliders: ColliderDef[],
  opts: PatrolValidationOpts = {},
): Array<{ x: number; z: number }> {
  const bodyRadius = opts.bodyRadius ?? TUNING.orderly.radius;
  const minClearance = opts.clearance ?? bodyRadius + 0.1;
  const solids = colliders.filter((c) => c.states === undefined || c.states === 'both');

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    for (const c of solids) {
      const d = distPointToAABB(wp.x, wp.z, c);
      if (d < minClearance) {
        throw new Error(
          `patrol(): waypoint ${i} (${wp.x}, ${wp.z}) is only ${d.toFixed(2)}m from collider ` +
            `[${c.minX},${c.maxX}]x[${c.minZ},${c.maxZ}] — needs >${minClearance.toFixed(2)}m clearance ` +
            `(body radius ${bodyRadius} + margin). Move the waypoint or widen the gap.`,
        );
      }
    }
  }

  for (let i = 0; i < waypoints.length; i++) {
    const a = waypoints[i];
    const b = waypoints[(i + 1) % waypoints.length];
    for (const c of solids) {
      const d = distSegToAABB(a.x, a.z, b.x, b.z, c);
      if (d < minClearance) {
        const j = (i + 1) % waypoints.length;
        throw new Error(
          `patrol(): leg ${i}->${j} ((${a.x},${a.z}) to (${b.x},${b.z})) passes only ${d.toFixed(2)}m from collider ` +
            `[${c.minX},${c.maxX}]x[${c.minZ},${c.maxZ}] — needs >${minClearance.toFixed(2)}m clearance. This is the ` +
            `room7/room8 wedge bug: his body (radius ${bodyRadius}) clips the corner mid-leg and freezes there, ` +
            `facing whatever he hit. Move the leg or widen the corridor.`,
        );
      }
    }
  }

  return waypoints;
}

// ---------------------------------------------------------------------------
// Reaction-time guideline (not a hard validator — sight range/occlusion make
// this a design heuristic, not an engine invariant, so it doesn't throw).
// Distance an orderly must be from an inspection point (a scrawl, a keypad,
// a dispenser) for the player to have at least `reactionSec` seconds to react
// even in the worst case where he's already alerted the instant you start
// reading: grace period + travel time at chase speed.
// ---------------------------------------------------------------------------

export function minInspectionDistance(reactionSec = 2.5): number {
  return (reactionSec - TUNING.orderly.graceSec) * TUNING.orderly.chaseSpeed;
}

// ---------------------------------------------------------------------------
// Orderly room script factory — the room7/room8 pattern generalized to N
// orderlies: spawn/dispose lifecycle, ward-state routing, per-frame
// orderly.update + threat aggregation (max watch level, min distance,
// chase-priority-then-watch-then-distance bearing selection), the standard
// onCaught penalty (force lucid, shift fx, teleport to spawn, toast,
// telemetry), and onLeave teardown. `extraScript` layers bespoke
// isAvailable/onInteract on top (tried first, falling back to this script's
// defaults — true/unhandled, since a bare orderly room has no generic
// interaction of its own); onStateChange always runs both.
// ---------------------------------------------------------------------------

export interface OrderlyCfg {
  waypoints: Array<{ x: number; z: number }>;
  occluders: OrderlyAABB[];
  onWarnToast?: string; // default 'he is looking at you.'
  onChaseToast?: string; // default 'run. or stop being visible.'
}

export interface MakeOrderlyRoomScriptCfg {
  orderlies: OrderlyCfg[];
  colliders: ColliderDef[]; // pass rb.colliders — filtered to always-on internally, same as every shipped room's ORDERLY_COLLIDERS
  spawn: { x: number; z: number };
  onEnterObjective: string;
  catchToast?: string; // default matches room5/room7's phrasing
  unmedToast?: string; // shown once on first shift to unmed; default matches room5/room7's phrasing
  extraScript?: {
    isAvailable?(id: string, ctx: GameCtx): boolean;
    onInteract?(id: string, ctx: GameCtx): boolean;
    onStateChange?(next: import('./types').WardState, ctx: GameCtx): void;
    update?(dt: number, t: number, ctx: GameCtx): void;
    onLeave?(ctx: GameCtx): void;
  };
}

export type OrderlyRoomScript = RoomScript & { onLeave(ctx: GameCtx): void };

// Bearing from the player to a point, relative to the player's look yaw (0 =
// dead ahead, positive = right) — identical convention to every shipped
// orderly room's local copy of this function.
function bearingTo(dx: number, dz: number, yaw: number): number {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const fwd = -dx * sin - dz * cos;
  const right = dx * cos - dz * sin;
  return Math.atan2(right, fwd);
}

export function makeOrderlyRoomScript(cfg: MakeOrderlyRoomScriptCfg): OrderlyRoomScript {
  const alwaysOnColliders = cfg.colliders.filter((c) => c.states === undefined || c.states === 'both');
  let orderlies: Orderly[] = [];
  let sawUnmedToast = false;

  function spawnAll(ctx: GameCtx): void {
    for (const o of orderlies) o.dispose();
    orderlies = cfg.orderlies.map(
      (oc) =>
        new Orderly(
          ctx.scene,
          oc.waypoints,
          oc.occluders,
          {
            onWarn: () => {
              ctx.hud.toast(oc.onWarnToast ?? 'he is looking at you.');
              ctx.telemetry.event('orderly_spotted');
            },
            onChaseStart: () => {
              ctx.hud.toast(oc.onChaseToast ?? 'run. or stop being visible.');
              ctx.telemetry.event('orderly_chase');
            },
            onCaught: () => {
              ctx.state.forceState('lucid');
              ctx.shiftFx();
              ctx.teleportPlayer(cfg.spawn.x, cfg.spawn.z);
              ctx.hud.toast(cfg.catchToast ?? 'hands. a needle. "not this time," he says.');
              ctx.telemetry.event('orderly_caught');
            },
          },
          { colliders: alwaysOnColliders },
        ),
    );
    for (const o of orderlies) o.setWardState(ctx.state.state);
  }

  const script: OrderlyRoomScript = {
    onEnter(ctx) {
      spawnAll(ctx);
      sawUnmedToast = false;
      ctx.hud.setObjective(cfg.onEnterObjective);
    },

    isAvailable(id, ctx) {
      return cfg.extraScript?.isAvailable?.(id, ctx) ?? true;
    },

    onInteract(id, ctx) {
      return cfg.extraScript?.onInteract?.(id, ctx) ?? false;
    },

    onStateChange(next, ctx) {
      for (const o of orderlies) o.setWardState(next);
      if (next === 'unmed' && !sawUnmedToast) {
        sawUnmedToast = true;
        ctx.hud.toast(cfg.unmedToast ?? 'something throws a shadow that keeps his shape.');
      }
      cfg.extraScript?.onStateChange?.(next, ctx);
    },

    update(dt, t, ctx) {
      cfg.extraScript?.update?.(dt, t, ctx);
      if (orderlies.length === 0) return;
      const p = ctx.playerPos();
      for (const o of orderlies) o.update(dt, p.x, p.z, ctx.state.state);

      let level = 0;
      let dist = Infinity;
      let chasing = false;
      let primary: Orderly = orderlies[0];
      for (const o of orderlies) {
        const d = Math.hypot(o.x - p.x, o.z - p.z);
        if (d < dist) dist = d;
        if (o.chasing) chasing = true;
        if (o.watching > level) level = o.watching;

        // Chase-priority bearing selection: chasing beats watching, higher
        // watch-ramp beats lower, nearer breaks ties — same rule room8 uses
        // across its two orderlies.
        const primaryChasing = primary.chasing;
        if (o === primary) continue;
        if (o.chasing && !primaryChasing) {
          primary = o;
        } else if (o.chasing === primaryChasing) {
          if (o.watching > primary.watching) primary = o;
          else if (o.watching === primary.watching) {
            const primaryDist = Math.hypot(primary.x - p.x, primary.z - p.z);
            if (d < primaryDist) primary = o;
          }
        }
      }

      if (level > 0 || chasing) {
        const bearing = bearingTo(primary.x - p.x, primary.z - p.z, p.yaw);
        ctx.hud.setThreat(level, bearing);
      } else {
        ctx.hud.setThreat(0, null);
      }
      ctx.audio.setThreat(level, dist, chasing);
    },

    onLeave(ctx) {
      ctx.hud.setThreat(0, null);
      ctx.audio.setThreat(0, Infinity, false);
      for (const o of orderlies) o.dispose();
      orderlies = [];
      cfg.extraScript?.onLeave?.(ctx);
    },
  };

  return script;
}
