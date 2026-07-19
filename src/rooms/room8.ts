import { RoomBuilder } from './build';
import type { ColliderDef, RoomDef, RoomScript } from './types';
import type { GameCtx } from '../game/context';
import { openKeypad } from '../ui/keypad';
import { Orderly, type OrderlyAABB } from '../game/orderly';
import type { DebugPatrol } from '../devtools/map-types';
import { randomCode4, codeClueText, isRandomizeCodesEnabled } from './kit';

// ROOM 8 — the East Ward. The finale: two of them. One keeps a tight orbit
// around the central island; the other walks a wide figure-eight whose waist
// crosses right past the island's north and south faces — exactly where the
// split code is scrawled. Their loops are independent, but the geometry
// means they're sometimes both near the island and sometimes both far from
// it, so the safe window to read either half isn't fixed — you have to watch
// both of them, not just one. One dispenser, tucked in an alcove out along
// the second orderly's leg — inside patrolled ground, but lucid is always
// safe regardless of who's nearby, so reaching it is a navigation problem,
// not a combat one. A shadow (the island, the alcove's own walls, a filing
// block on the west wall) is always within reach of wherever you'd need to
// stand.

const FIXED_CODE = '2846';
let code = FIXED_CODE;

function regenerateCode(ctx: GameCtx): void {
  if (!isRandomizeCodesEnabled()) return;
  code = randomCode4();
  ctx.updateScrawlText('codeScrawlA', codeClueText(code, [0, 2]));
  ctx.updateScrawlText('codeScrawlB', codeClueText(code, [2, 4]));
}

const rb = new RoomBuilder();

// shell, x [-9,9] z [-8,6]
rb.wallX(-9, 9, 6); // south cap, behind spawn
rb.wallZ(-8, 6, -9); // west wall, unbroken
rb.wallZ(-8, 0.4, 9); // east wall, south of the dispenser alcove's opening
rb.wallZ(2.0, 6, 9); // east wall, north of the alcove's opening
rb.wallX(-9, -1, -8); // north, west of the staff-door gap
rb.wallX(1, 9, -8); // north, east of the staff-door gap

// vestibule beyond the staff door, x [-1,1] z [-10,-8]
rb.wallZ(-10, -8, -1);
rb.wallZ(-10, -8, 1);
rb.wallX(-1, 1, -10);
rb.block([1.8, 2.6, 0.06], [0, 1.4, -9.8], 'glow'); // warm glow beyond the exit

// staff door collider — locked until the code is entered
const doorCollider: ColliderDef = { minX: -1, maxX: 1, minZ: -8.13, maxZ: -7.87 };
rb.colliders.push(doorCollider);

// the central island — orderly A's inner orbit runs around it; orderly B's
// figure-eight waist grazes its north and south faces, which is exactly
// where the split code lives.
const ISLAND: OrderlyAABB = { minX: -1.9, maxX: 1.9, minZ: -1.3, maxZ: 1.3 };
rb.solid(ISLAND.minX, ISLAND.maxX, ISLAND.minZ, ISLAND.maxZ);
rb.block([1.6, 2.0, 0.9], [0, 1.0, 0], 'wall2'); // raised core
rb.block([3.8, 1.1, 0.5], [0, 0.55, 1.05], 'prop'); // ring, south face
rb.block([3.8, 1.1, 0.5], [0, 0.55, -1.05], 'prop'); // ring, north face
rb.block([0.5, 1.1, 1.3], [-1.65, 0.55, 0], 'prop'); // ring, west face
rb.block([0.5, 1.1, 1.3], [1.65, 0.55, 0], 'prop'); // ring, east face

// dispenser alcove — off the east wall, out along orderly B's eastern leg.
// Inside patrolled ground, but lucid is always safe, so finding it is the
// only real challenge.
//
// BUG (facing audit): the dispenser used to mount flush on the south wall
// below (thin-z, size [0.55,0.75,0.16]) — but that wall's outward normal is
// +z (into the alcove interior, toward the north wall), and inferFacing
// picked -z instead (the room-wide floor center is south of this alcove),
// pointing the whole composite — slot, tray, MEDICATION plate — straight
// into the wall it was mounted on. Never visible from inside the alcove.
// Remounted on the end cap instead (thin-x, facing out the mouth toward -x,
// same convention as room10's dispenser10b) — simpler than fixing the sign
// on a wall this narrow (1.6m along the S/N brackets) and it puts the plate
// dead ahead as you walk in.
rb.wallX(9, 10.5, 0.4); // alcove south wall
rb.wallX(9, 10.5, 2.0); // alcove north wall
rb.wallZ(0.4, 2.0, 10.5); // alcove east end cap — the dispenser mounts here now
const ALCOVE_S: OrderlyAABB = { minX: 9, maxX: 10.5, minZ: 0.28, maxZ: 0.52 };
const ALCOVE_N: OrderlyAABB = { minX: 9, maxX: 10.5, minZ: 1.88, maxZ: 2.12 };

// a filing block against the west wall — the one stretch of orderly B's loop
// that runs close along a bare wall gets a shadow to duck into.
const PROP_WEST: OrderlyAABB = { minX: -8.49, maxX: -7.89, minZ: -3.6, maxZ: -2.4 };
rb.block([0.6, 1.6, 1.2], [-8.19, 0.8, -3], 'prop');
rb.solid(PROP_WEST.minX, PROP_WEST.maxX, PROP_WEST.minZ, PROP_WEST.maxZ);

const ORDERLY_COLLIDERS: ColliderDef[] = rb.colliders.filter(
  (c) => c.states === undefined || c.states === 'both',
);
const OCCLUDERS: OrderlyAABB[] = [ISLAND, ALCOVE_S, ALCOVE_N, PROP_WEST];

export const room8: RoomDef = {
  id: 'room8',
  name: 'the East Ward',
  floor: { minX: -9, maxX: 10.5, minZ: -10, maxZ: 6 },
  spawn: { x: 0, z: 5, yaw: 0 },
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    { text: 'two sets of footsteps.\nonly one of them is yours', size: 2.8, pos: [8.75, 1.7, 4], rotY: -Math.PI / 2 },
    { id: 'codeScrawlA', text: '2 8 – –', size: 2.2, pos: [0, 1.6, 1.9], rotY: 0, big: true },
    { id: 'codeScrawlB', text: '– – 4 6', size: 2.2, pos: [0, 1.6, -1.9], rotY: Math.PI, big: true },
  ],
  interactables: [
    {
      // Remounted on the alcove's east end cap (x=10.5), thin-x, proud of
      // the wall's inner face (10.5 - 0.12 wall half-thickness) the same way
      // room10's dispenser10b sits proud of its own end cap — see the facing
      // audit note above the alcove walls.
      id: 'dispenser8',
      type: 'dispenser',
      size: [0.16, 0.75, 0.55],
      pos: [10.36, 1.45, 1.2],
      mat: 'dispenser',
      states: 'both',
      facing: 'nx',
      label: 'use the dispenser',
    },
    {
      id: 'keypad8',
      type: 'keypad',
      size: [0.4, 0.5, 0.14],
      pos: [1.35, 1.45, -7.75],
      mat: 'pad',
      states: 'both',
      label: 'use the keypad',
    },
    {
      id: 'exitdoor',
      type: 'door',
      size: [2, 3, 0.2],
      pos: [0, 1.5, -8],
      mat: 'door',
      states: 'both',
      label: 'the exit door',
    },
  ],
  lights: [
    { pos: [0, 4.5] },
    { pos: [0, 1.5] },
    { pos: [0, -1.5] },
    { pos: [5, 3] },
    { pos: [5, -4] },
    { pos: [-5, 3] },
    { pos: [-5, -4] },
    { pos: [9, 1] },
    { pos: [0, -6] },
    { pos: [0, -9] },
  ],
  exits: [{ to: 'room9', minX: -1, maxX: 1, minZ: -9.9, maxZ: -8.8 }],
};

// Orderly A — a tight inner orbit hugging the island. Reversed from its
// original (3.2,2.1)->(3.2,-2.1)->(-3.2,-2.1)->(-3.2,2.1) order (clockwise)
// to this counter-clockwise order — same four points, same clearances,
// opposite rotation — so he no longer circulates the same direction as
// orderly B's figure-eight (see below). Playtest 7: with both loops turning
// the same way they tended to stay on the same side of the island at the
// same time and read as "walking together" instead of two independent
// threats. Starting here (index 0, the SW corner) also phase-separates him
// from B, which now starts at B's NE corner (see below) — different corner
// of the room at spawn instead of both starting near the south/spawn side.
const WAYPOINTS_A = [
  { x: -3.2, z: 2.1 },
  { x: -3.2, z: -2.1 },
  { x: 3.2, z: -2.1 },
  { x: 3.2, z: 2.1 },
];

// Orderly B — a wide figure-eight; the two center waypoints are its waist,
// each one hugging one face of the island, right where the code halves are.
// West legs at x=-7.3, not -7.5: PROP_WEST's collider reaches x=-7.89 and
// his body radius is 0.4, so -7.5 left only 0.39 clearance — he wedged on
// the filing block mid-leg (same failure as room7's east leg).
//
// Rotated one waypoint from its original start (used to begin at (7.5,4.5),
// the south/spawn-side corner — the same half of the room orderly A's
// original start (3.2,2.1) was in, another contributor to the "walking
// together" read). Same six points, same legs, just phase-shifted so B now
// starts on the north leg — different half of the room from A's new start.
const WAYPOINTS_B = [
  { x: 7.5, z: -5.5 },
  { x: 0, z: -2.5 },
  { x: -7.3, z: -5.5 },
  { x: -7.3, z: 4.5 },
  { x: 0, z: 2.5 },
  { x: 7.5, z: 4.5 },
];

// Reaction-time sanity check at keypad8 (1.35,-7.75), per the room6/7 pass:
// - Orderly A's nearest leg point is (1.35,-2.1) on the south leg, 5.65m
//   away. Both adjacent corners were checked for "already stopped, watching"
//   worst case: at (3.2,-2.1) he arrives facing +x now (was facing -z before
//   the reversal above, bearing ~18deg into the keypad at 5.95m — the one
//   corner that was actually marginal, 0.6+(5.95-0.55)/4.3=~1.86s); post-
//   reversal he arrives there heading east, bearing ~108deg, outside the
//   cone. At (-3.2,-2.1) he's 7.25m out either way — beyond sight range.
//   So the reversal (done for counter-rotation, Fix 3) also closes A's one
//   marginal exposure here as a side effect.
// - Orderly B's nearest approach is an interior point on the (7.5,-5.5)-
//   (0,-2.5) leg, 4.37m away — but the closest point on a straight leg to an
//   off-leg target is always ~90deg from the direction of travel (it's the
//   foot of the perpendicular), so he's not actually looking at it there.
//   The nearest real waypoint, (0,-2.5), is 5.42m out and he arrives facing
//   away from the keypad (bearing ~126deg). Not flagrant; left as-is.

// RoomScript is frozen; same locally-extended type as rooms 4-7 for the
// orderlies' teardown hook.
export type Room8Script = RoomScript & { onLeave?(ctx: GameCtx): void };

// Bearing from the player to a point, relative to the player's look yaw —
// same convention as the other orderly rooms' copy.
function bearingTo(dx: number, dz: number, yaw: number): number {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const fwd = -dx * sin - dz * cos;
  const right = dx * cos - dz * sin;
  return Math.atan2(right, fwd);
}

export const room8Script: Room8Script = (() => {
  let orderlyA: Orderly | null = null;
  let orderlyB: Orderly | null = null;
  let doorUnlocked = false;
  let sawUnmedToast = false;

  function handleCaught(ctx: GameCtx): void {
    ctx.state.forceState('lucid');
    ctx.shiftFx();
    ctx.teleportPlayer(room8.spawn.x, room8.spawn.z);
    ctx.hud.toast('hands. a needle. "there are two of us now," he says.');
    ctx.telemetry.event('orderly_caught');
    regenerateCode(ctx);
  }

  function spawnOrderlies(ctx: GameCtx): void {
    orderlyA?.dispose();
    orderlyB?.dispose();
    orderlyA = new Orderly(
      ctx.scene,
      WAYPOINTS_A,
      OCCLUDERS,
      {
        onWarn: () => {
          ctx.hud.toast('he is looking at you.');
          ctx.telemetry.event('orderly_spotted');
        },
        onChaseStart: () => {
          ctx.hud.toast('run. or stop being visible.');
          ctx.telemetry.event('orderly_chase');
        },
        onCaught: () => handleCaught(ctx),
      },
      { colliders: ORDERLY_COLLIDERS },
    );
    orderlyB = new Orderly(
      ctx.scene,
      WAYPOINTS_B,
      OCCLUDERS,
      {
        onWarn: () => {
          ctx.hud.toast('the other one is looking at you too.');
          ctx.telemetry.event('orderly_spotted');
        },
        onChaseStart: () => {
          ctx.hud.toast('run. or stop being visible.');
          ctx.telemetry.event('orderly_chase');
        },
        onCaught: () => handleCaught(ctx),
      },
      { colliders: ORDERLY_COLLIDERS },
    );
    orderlyA.setWardState(ctx.state.state);
    orderlyB.setWardState(ctx.state.state);
  }

  const script: Room8Script = {
    onEnter(ctx) {
      regenerateCode(ctx);
      spawnOrderlies(ctx);
      doorUnlocked = false;
      sawUnmedToast = false;
      ctx.hud.setObjective('the east ward. two of them, now. the code is split, same as before.');
    },

    isAvailable(id) {
      if (id === 'exitdoor') return false;
      if (id === 'keypad8') return !doorUnlocked;
      return true;
    },

    onInteract(id, ctx) {
      if (id === 'keypad8') {
        if (ctx.state.state === 'unmed') {
          ctx.hud.toast("the keypad is a smear of static. you can't read it like this.");
          return true;
        }
        ctx.telemetry.event('keypad_open');
        ctx.releasePointerLock();
        openKeypad({
          code,
          onDenied: () => ctx.telemetry.event('keypad_denied'),
          onSuccess: () => {
            doorUnlocked = true;
            ctx.telemetry.event('keypad_success');
            ctx.moveInteractable('exitdoor', [-1, 1.5, -8.85], Math.PI / 2);
            doorCollider.minX = 999;
            doorCollider.maxX = 999.2;
            ctx.hud.toast(`${code}. the last door.`);
            ctx.hud.setObjective('the door is open. go.');
            ctx.telemetry.event('door_opened');
          },
          onClose: () => {
            // player re-clicks the canvas to re-acquire pointer lock; nothing else to do.
          },
        });
        return true;
      }
      return false;
    },

    onStateChange(next, ctx) {
      orderlyA?.setWardState(next);
      orderlyB?.setWardState(next);
      if (next === 'unmed' && !sawUnmedToast) {
        sawUnmedToast = true;
        ctx.hud.toast('the island throws two shadows now.');
      }
    },

    update(dt, _t, ctx) {
      if (!orderlyA || !orderlyB) return;
      const p = ctx.playerPos();
      orderlyA.update(dt, p.x, p.z, ctx.state.state);
      orderlyB.update(dt, p.x, p.z, ctx.state.state);

      const distA = Math.hypot(orderlyA.x - p.x, orderlyA.z - p.z);
      const distB = Math.hypot(orderlyB.x - p.x, orderlyB.z - p.z);
      const chasing = orderlyA.chasing || orderlyB.chasing;
      const level = Math.max(orderlyA.watching, orderlyB.watching);
      const dist = Math.min(distA, distB);

      if (level > 0 || chasing) {
        // Bearing to whichever is the bigger threat: chasing beats watching,
        // higher watch-ramp beats lower, nearer breaks ties.
        let primary = orderlyA;
        if (orderlyB.chasing && !orderlyA.chasing) {
          primary = orderlyB;
        } else if (orderlyA.chasing === orderlyB.chasing) {
          if (orderlyB.watching > orderlyA.watching) primary = orderlyB;
          else if (orderlyB.watching === orderlyA.watching && distB < distA) primary = orderlyB;
        }
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
      orderlyA?.dispose();
      orderlyB?.dispose();
      orderlyA = null;
      orderlyB = null;
    },
  };

  return script;
})();

export const debugPatrols: DebugPatrol[] = [
  { waypoints: WAYPOINTS_A, label: 'A' },
  { waypoints: WAYPOINTS_B, label: 'B' },
];
