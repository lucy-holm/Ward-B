import { RoomBuilder } from './build';
import type { ColliderDef, RoomDef, RoomScript } from './types';
import type { GameCtx } from '../game/context';
import { openKeypad } from '../ui/keypad';
import { Orderly, type OrderlyAABB } from '../game/orderly';

// ROOM 10 — the Wing. The spike: everything, at scale, and the two-pill
// pocket finally has to be spent like a budget instead of a buffer.
//
// Four chambers in a straight run, south to north:
//   Z1 the intake hall   (spawn, dispenser A, safe)
//   Z2 the day ward      (orderly A, code half A, deep in a west nook)
//   Z3 the records annex (orderly B, code half B in an east nook, dispenser
//                          B in a west alcove — on the opposite side of his
//                          loop from the code, so reaching it costs a real
//                          crossing even though lucid keeps it safe)
//   Z4 the exit chamber  (safe, keypad, door)
//
// Z1/Z2 is an open doorway — you arrive lucid, it costs nothing. Z2/Z3 and
// Z3/Z4 are gated: a wall panel that only exists while UNMED (same trick as
// the cell's first door, just load-bearing this time instead of a tutorial
// beat) seals each doorway shut. Since the code halves are scrawls — always
// unmed-only, everywhere in the ward — you're guaranteed to be raw right
// when you reach each gate, which means each crossing costs a pill to open.
// That's the forced oscillation: read code A (unmed, free) -> shift to cross
// the first gate (1 pill) -> read code B (unmed, free) -> shift to cross the
// second gate (1 pill) -> lucid at the keypad, no further cost. Two pills,
// spent back to back, clear both gates with zero detours — a player who
// arrives topped off from room 9 and never touches dispenser B at all. One
// pill clears it too, just with a mandatory stop at dispenser B in between
// (0 pills after gate 2, and gate 3 needs one). Getting caught anywhere
// resets you to the intake hall, forced lucid, pills kept — dispenser A is
// three steps from the spawn point, so that failure is never a dead end.

const CODE = '3175';

const rb = new RoomBuilder();

// exterior shell — west wall (x=-8) and east wall (x=8) run the full
// north-south length, broken only where the alcoves open onto them.
rb.wallZ(-26, -15.4, -8); // west, south of the dispenser-B alcove mouth
rb.wallZ(-13.8, -9.4, -8); // west, between the two west-side alcove mouths
rb.wallZ(-7.8, 8, -8); // west, north of the code-A nook mouth
rb.wallZ(-26, -19.4, 8); // east, south of the code-B nook mouth
rb.wallZ(-17.8, 8, 8); // east, north of the code-B nook mouth

rb.wallX(-8, 8, 8); // south cap, behind spawn

// north cap, with the final exit doorway gap
rb.wallX(-8, -1, -26);
rb.wallX(1, 8, -26);
const doorCollider: ColliderDef = { minX: -1, maxX: 1, minZ: -26.13, maxZ: -25.87 };
rb.colliders.push(doorCollider);

// vestibule beyond the exit door, x [-1,1] z [-28,-26]
rb.wallZ(-28, -26, -1);
rb.wallZ(-28, -26, 1);
rb.wallX(-1, 1, -28);
rb.block([1.8, 2.6, 0.06], [0, 1.4, -27.8], 'glow'); // warm glow beyond the exit

// Z1/Z2 boundary, z=0 — an open doorway, no gate. You're lucid the first
// time you cross it, so gating it would add nothing but a second pill sink
// before the room has taught you the first one.
rb.wallX(-8, -2, 0);
rb.wallX(2, 8, 0);

// GATE 2 — Z2/Z3 boundary, z=-10. A wall panel that exists only while
// unmed, so crossing it lucid is a walk and crossing it raw is a wall.
rb.wallX(-8, -2, -10);
rb.wallX(2, 8, -10);
rb.block([4, 3, 0.24], [0, 1.5, -10], 'wall', 'unmed');
rb.solid(-2, 2, -10.12, -9.88, 'unmed');

// GATE 3 — Z3/Z4 boundary, z=-20. Same trick, same reason.
rb.wallX(-8, -2, -20);
rb.wallX(2, 8, -20);
rb.block([4, 3, 0.24], [0, 1.5, -20], 'wall', 'unmed');
rb.solid(-2, 2, -20.12, -19.88, 'unmed');

// Z2 — the day ward. A central occluder block orderly A's loop runs clear
// of, and a nook carved into the west wall, deep at the zone's north end
// (right where his loop passes closest), holding code half A.
const ISLAND_A: OrderlyAABB = { minX: -1.7, maxX: 1.7, minZ: -5.2, maxZ: -3.8 };
rb.block([3.4, 1.8, 1.4], [0, 0.9, -4.5], 'wall2');
rb.solid(ISLAND_A.minX, ISLAND_A.maxX, ISLAND_A.minZ, ISLAND_A.maxZ);

rb.wallX(-9.6, -8, -9.4); // nook A south bracket
rb.wallX(-9.6, -8, -7.8); // nook A north bracket
rb.wallZ(-9.4, -7.8, -9.6); // nook A end cap — the code is scrawled here
const NOOK_A: OrderlyAABB = { minX: -9.6, maxX: -8, minZ: -9.4, maxZ: -7.8 };

// Z3 — the records annex. Code half B sits deep in an east nook near gate
// 3; dispenser B sits in a west alcove roughly midway down the zone —
// opposite side, opposite end, so reaching either from the other means
// crossing the floor his loop actually covers (safely, lucid, but not for
// free — it's the whole width of the zone).
rb.wallX(8, 9.6, -19.4); // nook B south bracket
rb.wallX(8, 9.6, -17.8); // nook B north bracket
rb.wallZ(-19.4, -17.8, 9.6); // nook B end cap — the code is scrawled here
const NOOK_B: OrderlyAABB = { minX: 8, maxX: 9.6, minZ: -19.4, maxZ: -17.8 };

rb.wallX(-9.6, -8, -15.4); // dispenser-B alcove south bracket
rb.wallX(-9.6, -8, -13.8); // dispenser-B alcove north bracket
rb.wallZ(-15.4, -13.8, -9.6); // dispenser-B alcove end cap — the dispenser mounts here
const ALCOVE_B: OrderlyAABB = { minX: -9.6, maxX: -8, minZ: -15.4, maxZ: -13.8 };

// Glow lintels over each recess mouth — playtest 6 walked straight past the
// nooks; a lit threshold marks "there is a space here" from across the zone.
rb.block([0.12, 0.14, 1.6], [-8, 2.7, -8.6], 'glow'); // nook A mouth
rb.block([0.12, 0.14, 1.6], [8, 2.7, -18.6], 'glow'); // nook B mouth
rb.block([0.12, 0.14, 1.6], [-8, 2.7, -14.6], 'glow'); // dispenser-B alcove mouth

const ORDERLY_COLLIDERS: ColliderDef[] = rb.colliders.filter(
  (c) => c.states === undefined || c.states === 'both',
);

export const room10: RoomDef = {
  id: 'room10',
  floor: { minX: -9.6, maxX: 9.6, minZ: -28, maxZ: 8 },
  spawn: { x: 0, z: 7, yaw: 0 },
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    // The nook end caps sit at x=±9.6 with inner faces at ±9.48 (walls are
    // 0.24 thick). These were authored at ±9.55 — inside the wall, so the
    // wall rendered over them and the code was invisible (playtest 6).
    { text: '3 1 – –', size: 2.2, pos: [-9.46, 1.7, -8.6], rotY: Math.PI / 2, big: true },
    { text: '– – 7 5', size: 2.2, pos: [9.46, 1.7, -18.6], rotY: -Math.PI / 2, big: true },
    // Zone hints pointing at the nooks, readable from the open floor.
    {
      text: 'they scratch their numbers\nwhere the west wall breaks',
      size: 2.8,
      pos: [7.86, 1.7, -5],
      rotY: -Math.PI / 2,
    },
    {
      text: 'the rest is written\nwhere the east wall breaks',
      size: 2.8,
      pos: [-7.86, 1.7, -16.5],
      rotY: Math.PI / 2,
    },
    {
      text: 'the doors only open\nfor the calm ones',
      size: 2.6,
      pos: [-5, 1.7, -9.85],
      rotY: 0,
    },
  ],
  interactables: [
    {
      id: 'dispenser10a',
      type: 'dispenser',
      size: [0.16, 0.75, 0.55],
      pos: [-7.72, 1.45, 4],
      mat: 'dispenser',
      states: 'both',
      label: 'use the dispenser',
    },
    {
      id: 'dispenser10b',
      type: 'dispenser',
      size: [0.16, 0.75, 0.55],
      // proud of the alcove end cap's inner face (x=-9.48), not flush in it
      pos: [-9.46, 1.45, -14.6],
      mat: 'dispenser',
      states: 'both',
      label: 'use the dispenser',
    },
    {
      id: 'keypad10',
      type: 'keypad',
      size: [0.4, 0.5, 0.14],
      pos: [1.35, 1.45, -25.75],
      mat: 'pad',
      states: 'both',
      label: 'use the keypad',
    },
    {
      id: 'exitdoor',
      type: 'door',
      size: [2, 3, 0.2],
      pos: [0, 1.5, -26],
      mat: 'door',
      states: 'both',
      label: 'the exit door',
    },
  ],
  lights: [
    { pos: [0, 6] },
    { pos: [0, 2] },
    { pos: [4, -2] },
    { pos: [-4, -2] },
    { pos: [4, -6] },
    { pos: [-4, -6] },
    { pos: [0, -9] },
    { pos: [4, -12] },
    { pos: [-4, -12] },
    { pos: [4, -16] },
    { pos: [-4, -16] },
    { pos: [0, -19] },
    { pos: [0, -22] },
    { pos: [0, -25] },
  ],
  exits: [{ to: 'END', minX: -1, maxX: 1, minZ: -27.9, maxZ: -26.8 }],
};

// Orderly A — a wide loop around the day ward's island, hugging close
// enough to the west wall's northern leg to threaten anyone lingering at
// nook A's mouth without ever actually entering it.
const WAYPOINTS_A = [
  { x: 6.5, z: -1.5 },
  { x: 6.5, z: -8.5 },
  { x: -6.5, z: -8.5 },
  { x: -6.5, z: -1.5 },
];

// Orderly B — the same shape, one zone over, threatening both the code
// nook (east) and the dispenser alcove (west) from a comfortable distance
// without sealing off either.
const WAYPOINTS_B = [
  { x: 6.5, z: -11.5 },
  { x: 6.5, z: -18.5 },
  { x: -6.5, z: -18.5 },
  { x: -6.5, z: -11.5 },
];

// RoomScript is frozen; same locally-extended type as rooms 4-8 for the
// orderlies' teardown hook.
export type Room10Script = RoomScript & { onLeave?(ctx: GameCtx): void };

// Bearing from the player to a point, relative to the player's look yaw —
// same convention as the other orderly rooms' copy.
function bearingTo(dx: number, dz: number, yaw: number): number {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const fwd = -dx * sin - dz * cos;
  const right = dx * cos - dz * sin;
  return Math.atan2(right, fwd);
}

export const room10Script: Room10Script = (() => {
  let orderlyA: Orderly | null = null;
  let orderlyB: Orderly | null = null;
  let doorUnlocked = false;
  let sawUnmedToast = false;

  function handleCaught(ctx: GameCtx): void {
    ctx.state.forceState('lucid');
    ctx.shiftFx();
    ctx.teleportPlayer(room10.spawn.x, room10.spawn.z);
    ctx.hud.toast('hands. a needle. "the whole wing, and you got this far," he says.');
    ctx.telemetry.event('orderly_caught');
  }

  function spawnOrderlies(ctx: GameCtx): void {
    orderlyA?.dispose();
    orderlyB?.dispose();
    orderlyA = new Orderly(
      ctx.scene,
      WAYPOINTS_A,
      [ISLAND_A, NOOK_A],
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
      [NOOK_B, ALCOVE_B],
      {
        onWarn: () => {
          ctx.hud.toast('the other one sees you too.');
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

  const script: Room10Script = {
    onEnter(ctx) {
      spawnOrderlies(ctx);
      doorUnlocked = false;
      sawUnmedToast = false;
      ctx.hud.setObjective(
        'the wing. it just keeps going. two of them somewhere in it, and the halls only open for the calm.',
      );
    },

    isAvailable(id) {
      if (id === 'exitdoor') return false;
      if (id === 'keypad10') return !doorUnlocked;
      return true;
    },

    onInteract(id, ctx) {
      if (id === 'keypad10') {
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
            ctx.moveInteractable('exitdoor', [-1, 1.5, -26.85], Math.PI / 2);
            doorCollider.minX = 999;
            doorCollider.maxX = 999.2;
            ctx.hud.toast('3175. the last door in the building.');
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
        ctx.hud.toast('every doorway behind you just sealed shut.');
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
