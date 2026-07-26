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
  BlockDef,
  ColliderDef,
  HeightZone,
  IconPanelDef,
  InteractableDef,
  LevelDef,
  RampDef,
  RoomScript,
  ScrawlDef,
  ShapeKind,
  ShapeSpec,
  StairwellDef,
  StateFilter,
  TriggerDef,
  WardState,
} from './types';
import { RoomBuilder, WALL_HALF_THICKNESS } from './build';
import type { GameCtx } from '../game/context';
import { openKeypad } from '../ui/keypad';
import { Orderly, type OrderlyAABB } from '../game/orderly';
import { isRandomizeCodesEnabled } from '../game/settings';
import { TUNING } from '../tuning';

// Re-exports so a room file needs exactly one import line for the whole kit
// plus the primitives it's built on.
export { RoomBuilder } from './build';
export type { OrderlyAABB } from '../game/orderly';
export type {
  BlockDef,
  ColliderDef,
  HeightZone,
  IconPanelDef,
  InteractableDef,
  LevelDef,
  RampDef,
  RoomDef,
  RoomScript,
  ScrawlDef,
  ShapeKind,
  ShapeSpec,
  StairwellDef,
  StateFilter,
  TriggerDef,
  WardState,
} from './types';

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
const SWITCH_FOOTPRINT: [number, number, number] = [0.16, 0.6, 0.5];

function orientedSize(footprint: [number, number, number], axis: 'x' | 'z'): [number, number, number] {
  const [thin, h, along] = footprint;
  return axis === 'z' ? [along, h, thin] : [thin, h, along];
}

function wallFixture(
  type: 'dispenser' | 'keypad' | 'switch',
  defaultFootprint: [number, number, number],
  mat: 'dispenser' | 'pad' | 'breaker',
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

// A room-wide light toggle (see rooms/types.ts's LightFilter / room16's
// design comments) — same wall-face math as dispenser()/keypad(), 'breaker'
// mat so World.buildSwitch renders it as a fixture to throw, not a keypad.
export function lightSwitch(opts: FixtureOpts): FixtureDef {
  return wallFixture('switch', SWITCH_FOOTPRINT, 'breaker', opts);
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
  id?: string; // stable handle for GameCtx.updateScrawlText — only needed on scrawls a room rewrites at runtime
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
  return { text, size: opts.size ?? DEFAULT_SCRAWL_SIZE, pos, rotY, big: opts.big, id: opts.id };
}

// ---------------------------------------------------------------------------
// Trigger volumes — pure containment test + the visible-plate builder.
// The engine polls RoomDef.triggers for the PLAYER only (main.ts has never
// known about orderlies; they're room-owned). A room that wants "is the
// orderly on the plate" calls inTrigger against its own Orderly's public
// .x/.z each frame, paired with a `let wasOn = false` edge-detect local —
// same shape as room13's inStretch.
// ---------------------------------------------------------------------------

// Pure containment test against a TriggerDef, honoring its state filter —
// the exact rectangle+state check main.ts's per-frame player poll uses,
// exposed so a room's update() can run the identical test against any
// room-owned actor. One rectangle, authored once, shared by both sides —
// no drift between "where the plate visually is" and "where it fires."
export function inTrigger(t: TriggerDef, x: number, z: number, state: WardState): boolean {
  if (t.states && t.states !== 'both' && t.states !== state) return false;
  return x > t.minX && x < t.maxX && z > t.minZ && z < t.maxZ;
}

export interface PlateOpts {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  states?: StateFilter; // default 'both'
  y?: number; // visual half-height above floor, default 0.02
}

export interface PlateDef {
  trigger: TriggerDef;
  block: BlockDef; // thin flush box, mat:'plate', same footprint + states as the trigger
}

// One call, two shapes (same pattern as keypadDoor): a TriggerDef and the
// thin flush 'plate' block that marks it. Spread plate.block into blocks
// and plate.trigger into RoomDef.triggers. Deliberately NO paired collider
// — a pressure plate must stay walkable (that's the entire mechanic), and
// with no collider it never enters ORDERLY_COLLIDERS either, so patrols
// cross it like bare floor with zero special-casing.
export function pressurePlate(opts: PlateOpts): PlateDef {
  const h = opts.y ?? 0.02;
  return {
    trigger: { id: opts.id, minX: opts.minX, maxX: opts.maxX, minZ: opts.minZ, maxZ: opts.maxZ, states: opts.states },
    block: {
      size: [opts.maxX - opts.minX, h * 2, opts.maxZ - opts.minZ],
      pos: [(opts.minX + opts.maxX) / 2, h, (opts.minZ + opts.maxZ) / 2],
      mat: 'plate',
      states: opts.states,
    },
  };
}

// ---------------------------------------------------------------------------
// Randomized keypad codes — feature-flagged (settings.isRandomizeCodesEnabled)
// reroll of a room's 4-digit code and its on-wall clue. Off by default: every
// room's original fixed CODE is unchanged unless the player opts in from the
// start screen's CONFIGURATION panel. When on, a room calls regenerateCode
// (see below, wired per-room) on every onEnter and every onCaught so the
// code can never just be memorized across a death or a re-visit.
// ---------------------------------------------------------------------------

export { isRandomizeCodesEnabled } from '../game/settings';

export function randomCode4(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

// Matches the space-separated digit convention every keypad scrawl already
// uses (e.g. '4 1 1 8'). Pass `mask` as [startIndex, endIndex) to blank
// positions outside that range with '–', matching the shipped split-clue
// rooms (two scrawls, half the digits legible on each).
export function codeClueText(code: string, mask?: [number, number]): string {
  return code
    .split('')
    .map((ch, i) => (mask && (i < mask[0] || i >= mask[1]) ? '–' : ch))
    .join(' ');
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
  // Reroll the code this lock checks against — for randomizeCodes, called
  // alongside a matching GameCtx.updateScrawlText so the wall clue and the
  // keypad never disagree. successToast, if given, replaces the room's
  // (now-stale, code-specific) success flavor line for the new code.
  setCode(code: string, successToast?: string): void;
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
    setCode(code: string, successToast?: string): void {
      opts.code = code;
      if (successToast !== undefined) opts.successToast = successToast;
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
        // `randomized` matters for reading `keypad_denied`: a wrong entry
        // means something different when the code rerolls every room entry
        // (mistyped/half-remembered a code just seen) vs a fixed code
        // (never found the clue, or found the wrong room's).
        onDenied: (info) =>
          ctx.telemetry.event('keypad_denied', {
            attempt: info.attempt,
            entered: info.entered,
            randomized: isRandomizeCodesEnabled(),
          }),
        onAbandon: (info) => ctx.telemetry.event('keypad_close', { attempts: info.attempts }),
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
// Shape keys / shape lock / icon panel — room15's mechanic (see
// docs/superpowers/specs/2026-07-19-room15-shape-keys-design.md). Visibility
// gating, catch-persistence, and occlusion are all free (see the design
// doc's "why this needs no change to the pill/state/orderly systems"
// section) — this is purely the authoring surface.
// ---------------------------------------------------------------------------

// A free-standing colored flat-shape prop — not wall-relative like
// dispenser()/keypad(), since keys sit mid-alcove on the floor, not mounted
// flush to a wall face. states is forced 'unmed': the whole point — while
// lucid the prop simply isn't rendered (World.groups[it.states] trick every
// unmed-only fixture already relies on).
export interface ShapeKeyOpts {
  id: string;
  shape: ShapeKind;
  color: string; // hex
  pos: [number, number, number];
  label?: string; // default 'take it'
  size?: [number, number, number]; // default [0.5, 0.9, 0.5], footprint for raycast + pedestal
}

const DEFAULT_SHAPE_KEY_SIZE: [number, number, number] = [0.5, 0.9, 0.5];

export function shapeKeyProp(opts: ShapeKeyOpts): FixtureDef {
  return {
    id: opts.id,
    type: 'shape_key',
    size: opts.size ?? DEFAULT_SHAPE_KEY_SIZE,
    pos: opts.pos,
    mat: 'prop',
    states: 'unmed',
    label: opts.label ?? 'take it',
    shape: opts.shape,
    color: opts.color,
    // Free-standing prop, not wall-mounted — facing is ignored by
    // world.ts's buildShapeKey. Fixed at 'pz' purely so this satisfies
    // FixtureDef's "facing guaranteed present" contract.
    facing: 'pz',
  };
}

// A door-top progress panel — wall-relative like scrawl(), dim outlines by
// default, GameCtx.updateIconPanel(id, lit) rewrites it in place.
export interface IconPanelOpts {
  id: string;
  shapes: ShapeSpec[]; // left-to-right order
  size?: number; // default 2.4
  y?: number; // default 2.6
}

const DEFAULT_ICON_PANEL_SIZE = 2.4;
const DEFAULT_ICON_PANEL_Y = 2.6;

export function iconPanel(side: WallSide, wallAt: number, along: number, opts: IconPanelOpts): IconPanelDef {
  const { axis, sign } = SIDE[side];
  const proud = DEFAULT_SCRAWL_PROUD; // same small decal gap as scrawl()
  const face = wallFace(wallAt, side);
  const depthCoord = face + sign * proud;
  const pos: [number, number, number] =
    axis === 'z'
      ? [along, opts.y ?? DEFAULT_ICON_PANEL_Y, depthCoord]
      : [depthCoord, opts.y ?? DEFAULT_ICON_PANEL_Y, along];
  // Same axis/sign -> rotY rule as scrawl()'s, so a panel faces the room
  // exactly like a fixture/scrawl mounted on the same wall.
  const rotY = axis === 'z' ? (sign > 0 ? 0 : Math.PI) : sign > 0 ? Math.PI / 2 : -Math.PI / 2;
  return { id: opts.id, shapes: opts.shapes, pos, rotY, size: opts.size ?? DEFAULT_ICON_PANEL_SIZE };
}

// Same wall-mount footprint math as keypad() (KEYPAD_FOOTPRINT), different
// InteractableType. Kept local rather than routed through wallFixture()
// since wallFixture's `type` parameter is a fixed 'dispenser' | 'keypad'
// union — not worth widening for the one extra call site.
const SHAPE_LOCK_FOOTPRINT: [number, number, number] = [0.14, 0.5, 0.4];

// The full shape-lock assembly — parallel to keypadDoor, no code, a count
// instead. Bundles the door, the shape_lock wall fixture, every shape_key
// prop, and the icon panel into one call; owns the held-set (a room script
// never hand-writes shape bookkeeping, same as keypadDoor owning `unlocked`).
export interface ShapeLockDoorOpts {
  doorId: string;
  // door geometry — identical fields to KeypadDoorOpts (side/wallAt/along/
  // width/height/depth/hinge/openDepth/openPos/openRotY/doorLabel)
  side: WallSide;
  wallAt: number;
  along: number;
  width?: number;
  height?: number;
  depth?: number;
  hinge?: 'start' | 'end';
  openDepth?: number;
  openPos?: [number, number, number];
  openRotY?: number;
  doorLabel?: string;

  lockId: string;
  lockSide?: WallSide;
  lockWallAt?: number;
  lockAlong: number;
  lockLabel?: string;

  keys: Array<{ id: string; shape: ShapeKind; color: string; pos: [number, number, number]; pickupToast: string }>;

  iconPanelId: string;
  iconPanelSide: WallSide;
  iconPanelWallAt: number;
  iconPanelAlong: number;

  states?: StateFilter;
  // When true, skips the unmed refusal entirely — the lock is operable in
  // BOTH ward states, not lucid-only. Default false, preserving every
  // previously-shipped shapeLockDoor caller's behavior (lucid-only unlock,
  // mirroring keypadDoor's unmed refusal) unchanged. room15's whole-room-
  // unmed rework (see its header) is the first caller to opt in — the room
  // has no lucid requirement left anywhere, so the door mechanism can't be
  // the one thing that still demands it. Additive: no other room is
  // affected by this option existing.
  allowUnmed?: boolean;
  refusalToastUnmed?: string; // shown on an unmed interaction when allowUnmed is false; default matches every keypad's static-refusal line
  refusalToastIncomplete?: (have: number, need: number) => string;
  successToast?: string;
  successObjective?: string; // default 'the door is open. go.'
}

export interface ShapeLockDoorLock {
  door: FixtureDef;
  lock: FixtureDef;
  keys: FixtureDef[];
  iconPanel: IconPanelDef;
  collider: ColliderDef;
  heldCount(): number;
  // Standard isAvailable rule: door is never directly interactable, a
  // picked-up key stops resolving once removed, the lock disappears once
  // unlocked. Wire into your RoomScript's extraScript.isAvailable.
  isAvailable(id: string): boolean;
  // Handles: any key id (unmed-only, engine already gates that) → add to
  // held set, ctx.removeInteractable(id), ctx.updateIconPanel(...), toast;
  // the lock id → unmed refusal / incomplete toast / full unlock (same
  // moveInteractable + collider-disable + toasts + telemetry pattern
  // keypadDoor.handleInteract already implements). Returns false
  // (unhandled) for any other id.
  handleInteract(id: string, ctx: GameCtx): boolean;
}

export function shapeLockDoor(rb: RoomBuilder, opts: ShapeLockDoorOpts): ShapeLockDoorLock {
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

  // Closure-held collider — same "shove it out to x999 on unlock" trick
  // keypadDoor uses, so nothing else holding a reference needs to know it moved.
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
  const openWallCoord = opts.wallAt - sign * openDepth;
  const defaultOpenPos: [number, number, number] =
    axis === 'z' ? [hingeAlong, height / 2, openWallCoord] : [openWallCoord, height / 2, hingeAlong];
  const openPos = opts.openPos ?? defaultOpenPos;
  const openRotY = opts.openRotY ?? Math.PI / 2;

  // The lock fixture — same wall-mount footprint math as keypad(), different
  // InteractableType, so it's inlined here rather than routed through
  // wallFixture().
  const lockSide = opts.lockSide ?? opts.side;
  const lockWallAt = opts.lockWallAt ?? opts.wallAt;
  const lockAxis = SIDE[lockSide].axis;
  const lockSign = SIDE[lockSide].sign;
  const lockThin = SHAPE_LOCK_FOOTPRINT[0];
  const lockSizeOriented = orientedSize(SHAPE_LOCK_FOOTPRINT, lockAxis);
  const lockFace = wallFace(lockWallAt, lockSide);
  const lockProudCenter = lockFace + lockSign * (lockThin / 2);
  const lockPos: [number, number, number] =
    lockAxis === 'z'
      ? [opts.lockAlong, DEFAULT_FIXTURE_Y, lockProudCenter]
      : [lockProudCenter, DEFAULT_FIXTURE_Y, opts.lockAlong];

  const lock: FixtureDef = {
    id: opts.lockId,
    type: 'shape_lock',
    size: lockSizeOriented,
    pos: lockPos,
    mat: 'pad',
    states: opts.states ?? 'both',
    label: opts.lockLabel ?? 'use the lock',
    facing: facingOf(lockSide),
  };

  const keys: FixtureDef[] = opts.keys.map((k) =>
    shapeKeyProp({ id: k.id, shape: k.shape, color: k.color, pos: k.pos }),
  );

  const iconPanelDef = iconPanel(opts.iconPanelSide, opts.iconPanelWallAt, opts.iconPanelAlong, {
    id: opts.iconPanelId,
    shapes: opts.keys.map((k) => ({ shape: k.shape, color: k.color })),
  });

  const held = new Set<ShapeKind>();
  const removed = new Set<string>();
  let unlocked = false;

  function litArray(): boolean[] {
    return opts.keys.map((k) => held.has(k.shape));
  }

  return {
    door,
    lock,
    keys,
    iconPanel: iconPanelDef,
    collider,
    heldCount: () => held.size,
    isAvailable(id: string): boolean {
      if (id === opts.doorId) return false;
      if (id === opts.lockId) return !unlocked;
      if (removed.has(id)) return false;
      return true;
    },
    handleInteract(id: string, ctx: GameCtx): boolean {
      const key = opts.keys.find((k) => k.id === id);
      if (key) {
        if (removed.has(id)) return true; // already gone — nothing to do
        removed.add(id);
        held.add(key.shape);
        ctx.removeInteractable(id);
        ctx.updateIconPanel(opts.iconPanelId, litArray());
        ctx.hud.toast(key.pickupToast);
        return true;
      }
      if (id === opts.lockId) {
        if (ctx.state.state === 'unmed' && !opts.allowUnmed) {
          ctx.hud.toast(
            opts.refusalToastUnmed ??
              "the lock is a smear of static. it's not reading shapes right now — it's not reading anything.",
          );
          return true;
        }
        if (held.size < opts.keys.length) {
          const msg = opts.refusalToastIncomplete
            ? opts.refusalToastIncomplete(held.size, opts.keys.length)
            : `it wants ${opts.keys.length} shapes back. you have ${held.size}.`;
          ctx.hud.toast(msg);
          return true;
        }
        unlocked = true;
        ctx.telemetry.event('shape_lock_success');
        ctx.moveInteractable(opts.doorId, openPos, openRotY);
        collider.minX = 999;
        collider.maxX = 999.2;
        ctx.hud.toast(opts.successToast ?? 'the door opens.');
        ctx.hud.setObjective(opts.successObjective ?? 'the door is open. go.');
        ctx.telemetry.event('door_opened');
        return true;
      }
      return false;
    },
  };
}

// ---------------------------------------------------------------------------
// Verticality — thin constructors for RoomDef.heightZones/ramps (see
// rooms/types.ts's HeightZone/RampDef header for the single-valued-floor
// model this relies on). These don't derive anything from wall geometry the
// way dispenser()/keypad()/scrawl() do — a raised zone's footprint is a
// design decision, not implied by a wall run — so they're just named,
// typed constructors instead of a wall-relative builder. See
// ROOM_AUTHORING.md's "Verticality" section for a worked split-level
// example (a ramp bridging a sunken lower floor up to a railed platform).
// ---------------------------------------------------------------------------

export function heightZone(minX: number, maxX: number, minZ: number, maxZ: number, y: number): HeightZone {
  return { minX, maxX, minZ, maxZ, y };
}

export function ramp(
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  axis: 'x' | 'z',
  yLow: number,
  yHigh: number,
): RampDef {
  return { minX, maxX, minZ, maxZ, axis, yLow, yHigh };
}

// ---------------------------------------------------------------------------
// True stacked floors — thin constructors for RoomDef.levels/stairwells (see
// rooms/types.ts's LevelDef/StairwellDef header). Same "just a named,
// typed constructor" role as heightZone()/ramp() above; a stairwell/level's
// footprint is a design decision, not implied by a wall run, so there's
// nothing wall-relative to derive.
// ---------------------------------------------------------------------------

// StairwellDef.id has no natural default (unlike heightZone/ramp, which
// don't need one) — it's the map viewer's + this room's own stable handle
// for the connector, so it's the constructor's first argument.
export function stairwell(
  id: string,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  axis: 'x' | 'z',
  yLow: number,
  levelAtLow: string,
  yHigh: number,
  levelAtHigh: string,
): StairwellDef {
  return { id, minX, maxX, minZ, maxZ, axis, yLow, levelAtLow, yHigh, levelAtHigh };
}

export function level(
  id: string,
  baseY: number,
  floor: { minX: number; maxX: number; minZ: number; maxZ: number },
  opts: { heightZones?: HeightZone[]; ramps?: RampDef[] } = {},
): LevelDef {
  return { id, baseY, floor, heightZones: opts.heightZones, ramps: opts.ramps };
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
//
// NOT extended to check StairwellDef footprints (true stacked floors,
// rooms/types.ts's StairwellDef) — this validator is, and stays, purely 2D
// XZ clearance against ColliderDef rectangles. An orderly is fixed to one
// level for his whole lifetime (game/orderly.ts's OrderlyOptions.level) and
// never crosses a stairwell, so a room author keeping every waypoint/leg
// clear of both StairwellDef footprints (the same discipline already
// required for furniture) is unenforced here on purpose — flagged as a
// follow-up, not silently assumed solved. Per level, this validator is
// exactly as meaningful as it always was: it only ever sees the flat
// ColliderDef list a room passes in (typically pre-filtered to one level's
// worth of geometry), so a multi-level room's clearance is still checked
// per orderly, just not stairwell-aware.
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
  // Per-orderly catch line, overriding the room-wide cfg.catchToast — for
  // rooms where each orderly keeps his own ground (room17's south hall /
  // balcony / pocket trio) and the catch line should say which one got you.
  // Falls back to cfg.catchToast, then the shared default.
  onCaughtToast?: string;
  // Verticality — see Orderly's OrderlyOptions.floorHeightAt. Pass the same
  // per-XZ height lookup a vertical room uses for its player (typically a
  // small local function mirroring the room's heightZones/ramps) so this
  // orderly's mesh stands on his own level. Omitted ⇒ y=0 always, same as
  // every orderly room shipped before this option existed.
  floorHeightAt?: (x: number, z: number) => number;
  // True stacked floors — see Orderly's OrderlyOptions.level. Fixed for this
  // orderly's whole lifetime; omitted ⇒ '__flat', same as every orderly
  // room shipped before `levels` existed (where the player's level is also
  // always '__flat', so the cross-level LOS gate is always satisfied).
  level?: string;
}

export interface MakeOrderlyRoomScriptCfg {
  orderlies: OrderlyCfg[];
  colliders: ColliderDef[]; // pass rb.colliders — filtered to always-on internally, same as every shipped room's ORDERLY_COLLIDERS
  // `level` — true stacked floors: the level the post-catch teleport lands
  // on. Optional, defaults to leaving the player's level untouched (every
  // room shipped before `levels` existed never sets this) — see
  // GameCtx.teleportPlayer's header for why a multi-level room must pass it.
  spawn: { x: number; z: number; level?: string };
  onEnterObjective: string;
  catchToast?: string; // default matches room5/room7's phrasing
  unmedToast?: string; // shown once on first shift to unmed; default matches room5/room7's phrasing
  extraScript?: {
    isAvailable?(id: string, ctx: GameCtx): boolean;
    onInteract?(id: string, ctx: GameCtx): boolean;
    onStateChange?(next: import('./types').WardState, ctx: GameCtx): void;
    update?(dt: number, t: number, ctx: GameCtx): void;
    onLeave?(ctx: GameCtx): void;
    // Runs first, before the factory spawns orderlies or sets the objective
    // — the right place for per-entry state resets and regenerateCode.
    onEnter?(ctx: GameCtx): void;
    // Runs after the standard catch penalty (force lucid, teleport, toast,
    // telemetry). The hook the randomize-codes pattern needs: call your
    // room's regenerateCode(ctx) here — without this, any room wanting a
    // catch-triggered side effect had to hand-write the whole orderly
    // script instead of using this factory.
    onCaught?(ctx: GameCtx): void;
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

// F21 (2026-07-26 telemetry design doc, §2/§8 Phase 4) — every orderly room
// independently hand-rolled the same three ctx.telemetry.event('orderly_*')
// calls inside its Orderly onWarn/onChaseStart/onCaught callbacks. This
// factors out just the telemetry emission (event names and firing
// conditions are unchanged — though see OrderlyTelemetryOpts.onCaught: the
// emission POINT within the catch handler moved deliberately, which changed
// the position/state stamped on orderly_caught for the better), leaving
// each room's
// own toast text and catch-time side effects (regenerateCode, crate
// reset, crush-wall reset, multi-orderly shared handleCaught, etc.)
// untouched. Used both by makeOrderlyRoomScript below (rooms 15-20) and by
// every hand-rolled orderly room (rooms 4-14, 19, 20) whose per-orderly
// waypoints/occluders/catch-penalty are too bespoke for the fixed-roster
// factory.
//
// Deliberately does NOT try to own toast display for onCaught — every
// hand-rolled room's catch handler interleaves the toast with
// forceState/teleportPlayer/shiftFx/regenerateCode in an order that varies
// room to room, so the room keeps writing that whole sequence itself and
// just no longer duplicates the telemetry line at the end of it.
export interface OrderlyTelemetryOpts {
  // Toast shown on first sight / on chase start. Every room passes one
  // (no room currently omits it) — required rather than optional so a
  // future call site can't silently drop the toast while migrating.
  warnToast: string;
  chaseToast: string;
  // The room's own catch handling: forceState / shiftFx / teleportPlayer /
  // toast / regenerateCode / crate reset, in whatever order that room needs.
  //
  // ORDERING IS LOAD-BEARING, and deliberately changed from the pre-F21
  // code — do not "restore" it. `orderly_caught` is now emitted BEFORE this
  // runs, where every room previously emitted it at the END of its own
  // handler.
  //
  // Why it matters: telemetry.ts stamps each event with the player's
  // position and ward state *at emit time* (its getSnapshot closure in
  // main.ts). Emitting after the handler meant sampling the player AFTER
  // teleportPlayer had already moved them to the room's spawn point and
  // forceState had flipped them to lucid — so every orderly_caught row in a
  // given room reported identical spawn coordinates, and the catch-location
  // heatmap the design doc calls for (§3.2 "catch markers", §5.1 path
  // replay) was structurally impossible to build. Emitting first records
  // where the player was actually caught, in the state they were caught in,
  // which is the entire analytical value of the event.
  //
  // No gameplay consequence either way: event() only queues a row.
  //
  // Data discontinuity: orderly_caught rows collected before 2026-07-26
  // carry post-teleport spawn coordinates. There are only a couple, from
  // the launch smoke test, but don't pool them with later rows positionally.
  onCaught: (ctx: GameCtx) => void;
}

export function orderlyTelemetryCallbacks(
  ctx: GameCtx,
  opts: OrderlyTelemetryOpts,
): { onWarn(): void; onChaseStart(): void; onCaught(): void } {
  return {
    onWarn() {
      ctx.hud.toast(opts.warnToast);
      ctx.telemetry.event('orderly_spotted');
    },
    onChaseStart() {
      ctx.hud.toast(opts.chaseToast);
      ctx.telemetry.event('orderly_chase');
    },
    onCaught() {
      ctx.telemetry.event('orderly_caught');
      opts.onCaught(ctx);
    },
  };
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
          orderlyTelemetryCallbacks(ctx, {
            warnToast: oc.onWarnToast ?? 'he is looking at you.',
            chaseToast: oc.onChaseToast ?? 'run. or stop being visible.',
            onCaught: (ctx) => {
              ctx.state.forceState('lucid', 'catch');
              ctx.shiftFx();
              ctx.teleportPlayer(cfg.spawn.x, cfg.spawn.z, cfg.spawn.level);
              ctx.hud.toast(oc.onCaughtToast ?? cfg.catchToast ?? 'hands. a needle. "not this time," he says.');
              cfg.extraScript?.onCaught?.(ctx);
            },
          }),
          { colliders: alwaysOnColliders, floorHeightAt: oc.floorHeightAt, level: oc.level },
        ),
    );
    for (const o of orderlies) o.setWardState(ctx.state.state);
  }

  const script: OrderlyRoomScript = {
    onEnter(ctx) {
      cfg.extraScript?.onEnter?.(ctx);
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
      for (const o of orderlies) o.update(dt, p.x, p.z, ctx.state.state, p.level);

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
