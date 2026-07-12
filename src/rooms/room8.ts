import { RoomBuilder } from './build';
import type { ColliderDef, RoomDef, RoomScript } from './types';
import type { GameCtx } from '../game/context';
import { openKeypad } from '../ui/keypad';
import { Orderly, type OrderlyAABB } from '../game/orderly';

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

const CODE = '2846';

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
rb.wallX(9, 10.5, 0.4); // alcove south wall — the dispenser mounts here
rb.wallX(9, 10.5, 2.0); // alcove north wall
rb.wallZ(0.4, 2.0, 10.5); // alcove east end cap
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
  floor: { minX: -9, maxX: 10.5, minZ: -10, maxZ: 6 },
  spawn: { x: 0, z: 5, yaw: 0 },
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    { text: 'two sets of footsteps.\nonly one of them is yours', size: 2.8, pos: [8.75, 1.7, 4], rotY: -Math.PI / 2 },
    { text: '2 8 – –', size: 2.2, pos: [0, 1.6, 1.9], rotY: 0, big: true },
    { text: '– – 4 6', size: 2.2, pos: [0, 1.6, -1.9], rotY: Math.PI, big: true },
  ],
  interactables: [
    {
      id: 'dispenser8',
      type: 'dispenser',
      size: [0.55, 0.75, 0.16],
      pos: [9.75, 1.45, 0.65],
      mat: 'dispenser',
      states: 'both',
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

// Orderly A — a tight inner orbit hugging the island.
const WAYPOINTS_A = [
  { x: 3.2, z: 2.1 },
  { x: 3.2, z: -2.1 },
  { x: -3.2, z: -2.1 },
  { x: -3.2, z: 2.1 },
];

// Orderly B — a wide figure-eight; the two center waypoints are its waist,
// each one hugging one face of the island, right where the code halves are.
const WAYPOINTS_B = [
  { x: 7.5, z: 4.5 },
  { x: 7.5, z: -5.5 },
  { x: 0, z: -2.5 },
  { x: -7.5, z: -5.5 },
  { x: -7.5, z: 4.5 },
  { x: 0, z: 2.5 },
];

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
          code: CODE,
          onDenied: () => ctx.telemetry.event('keypad_denied'),
          onSuccess: () => {
            doorUnlocked = true;
            ctx.telemetry.event('keypad_success');
            ctx.moveInteractable('exitdoor', [-1, 1.5, -8.85], Math.PI / 2);
            doorCollider.minX = 999;
            doorCollider.maxX = 999.2;
            ctx.hud.toast('2846. the last door.');
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
