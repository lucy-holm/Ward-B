import { RoomBuilder } from './build';
import type { ColliderDef, RoomDef, RoomScript } from './types';
import type { GameCtx } from '../game/context';
import { openKeypad } from '../ui/keypad';
import { Orderly, type OrderlyAABB } from '../game/orderly';

// ROOM 7 — the Records Room. Three shelving rows still force a serpentine
// crossing (east gap, west gap, east gap), but the beat is a forced
// backtrack, not a single crossing: the exit keypad sits right past the
// maze, reachable lucid and blind with no code in hand. The code — and the
// dispenser, still hidden behind a row, that quality is worth keeping — both
// live in the back half, by the entrance you just walked away from. So the
// route is keypad first (safe, useless), then unmed back through the maze
// to read the code and refill, then unmed (or lucid, if you spend the pill
// right there) forward through it again to actually open the door. His
// patrol lives in the pocket between all three rows — the belt you cross
// both ways — with a row's mass to duck behind on either approach.

const CODE = '0452';

const rb = new RoomBuilder();

// shell, x [-6,6] z [-7,5] — reuses room4's exact footprint, different guts
rb.wallX(-6, 6, 5); // south cap, behind spawn
rb.wallZ(-5, 0.8, -6); // west wall, south of the hidden nook's opening
rb.wallZ(1.8, 5, -6); // west wall, north of the nook's opening (toward spawn)
rb.wallZ(-5, 5, 6); // east wall
rb.wallX(-6, -1, -5); // north, west of the staff-door gap
rb.wallX(1, 6, -5); // north, east of the staff-door gap

// vestibule beyond the staff door, x [-1,1] z [-7,-5]
rb.wallZ(-7, -5, -1);
rb.wallZ(-7, -5, 1);
rb.wallX(-1, 1, -7);
rb.block([1.8, 2.6, 0.06], [0, 1.4, -6.94], 'glow'); // warm glow beyond the exit

// staff door collider — locked until the code is entered
const doorCollider: ColliderDef = { minX: -1, maxX: 1, minZ: -5.13, maxZ: -4.87 };
rb.colliders.push(doorCollider);

// three shelving rows, gaps alternating east/west/east — a proper serpentine
// between spawn and the door. Each is both a collider and a sight occluder.
const ROW_A: OrderlyAABB = { minX: -6, maxX: -1.5, minZ: 1.8, maxZ: 2.6 };
rb.block([4.5, 2.6, 0.8], [-3.75, 1.3, 2.2], 'wall2');
rb.solid(ROW_A.minX, ROW_A.maxX, ROW_A.minZ, ROW_A.maxZ);

const ROW_B: OrderlyAABB = { minX: 1.5, maxX: 6, minZ: -0.4, maxZ: 0.4 };
rb.block([4.5, 2.6, 0.8], [3.75, 1.3, 0], 'wall2');
rb.solid(ROW_B.minX, ROW_B.maxX, ROW_B.minZ, ROW_B.maxZ);

const ROW_C: OrderlyAABB = { minX: -6, maxX: -1.5, minZ: -2.6, maxZ: -1.8 };
rb.block([4.5, 2.6, 0.8], [-3.75, 1.3, -2.2], 'wall2');
rb.solid(ROW_C.minX, ROW_C.maxX, ROW_C.minZ, ROW_C.maxZ);

// the hidden dispenser nook — carved into the west wall, tucked directly
// behind row A this time: its mass sits between the nook and spawn, so
// nothing about it is visible on the walk in. Reaching it means clearing
// row A's gap and doubling back west, into the same pocket he patrols.
rb.wallX(-7.4, -6, 0.8); // nook south wall — the dispenser mounts here, deep end, away from spawn
rb.wallX(-7.4, -6, 1.8); // nook north wall, toward the gap/room
rb.wallZ(0.8, 1.8, -7.4); // nook west end cap

const ORDERLY_COLLIDERS: ColliderDef[] = rb.colliders.filter(
  (c) => c.states === undefined || c.states === 'both',
);

export const room7: RoomDef = {
  id: 'room7',
  name: 'the Records Room',
  floor: { minX: -7.5, maxX: 6, minZ: -7, maxZ: 5 },
  spawn: { x: 0, z: 4, yaw: 0 },
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    // Dispenser hint, unmoved — still true, just points at a different row now.
    { text: 'they keep the quiet\nbehind the files', size: 2.8, pos: [5.85, 1.7, 3.5], rotY: -Math.PI / 2 },
    // Orderly atmosphere, unmoved — it already sat right where his belt runs.
    { text: 'the files don\'t forget.\nneither does he.', size: 2.8, pos: [-5.85, 1.7, -1], rotY: Math.PI / 2 },
    // The code, relocated to the back half, near the entrance — opposite
    // wall from the dispenser hint, same general depth into the room.
    { text: '0 4 5 2', size: 2.4, pos: [-5.85, 1.7, 3.7], rotY: Math.PI / 2, big: true },
    // New: planted right where the code used to live, by the keypad — the
    // room's way of telling you that you already walked past it.
    {
      text: 'you walked right past it.\nback the way you came.',
      size: 2.6,
      pos: [5.85, 1.7, -4],
      rotY: -Math.PI / 2,
    },
  ],
  interactables: [
    {
      // Tucked behind row A this time, not visible from spawn or from the
      // keypad — row A's mass is between it and the entrance, and the whole
      // maze is between it and the door. The scrawl near the entrance is
      // the only pointer to where it lives; reaching it means clipping the
      // entrance-side edge of his patrol belt.
      // BUG (facing audit): mounted against the nook's south wall (z=0.8),
      // thin in z. inferFacing pointed it toward the room-wide floor center
      // (z=-1), i.e. -z — straight into the wall it's flush against, so the
      // MEDICATION plate never faced anywhere the player could see it. The
      // nook's actual open interior is +z of that wall (up to the north wall
      // at z=1.8), so the correct facing is +z, pinned explicitly.
      id: 'dispenser7',
      type: 'dispenser',
      size: [0.55, 0.75, 0.16],
      pos: [-6.7, 1.45, 1.05],
      mat: 'dispenser',
      states: 'both',
      facing: 'pz',
      label: 'use the dispenser',
    },
    {
      id: 'keypad7',
      type: 'keypad',
      size: [0.4, 0.5, 0.14],
      pos: [1.35, 1.45, -4.75],
      mat: 'pad',
      states: 'both',
      label: 'use the keypad',
    },
    {
      id: 'exitdoor',
      type: 'door',
      size: [2, 3, 0.2],
      pos: [0, 1.5, -5],
      mat: 'door',
      states: 'both',
      label: 'the exit door',
    },
  ],
  lights: [
    { pos: [0, 4] },
    { pos: [-3.75, 2.2] },
    { pos: [3.75, 0] },
    { pos: [-3.75, -2.2] },
    { pos: [0, -3.5] },
    { pos: [-6.5, 1.05] },
    { pos: [0, -6] },
  ],
  exits: [{ to: 'room8', minX: -1, maxX: 1, minZ: -6.9, maxZ: -5.8 }],
};

// The belt: a rectangle spanning the full pocket between all three rows,
// west edge close to row A/C's gap column, east edge close to row B's gap
// column (x=1.5) — there's no lane past either end that dodges him. The
// entrance-side edge sits just shy of row A (a hair of buffer to react in
// before the crossing that starts at the dispenser/code and heads for the
// keypad); the keypad-side edge was pulled well clear of row C (see the
// reaction-time note below) to give the keypad itself breathing room — it's
// no longer hugging the row, but the belt still spans the full corridor
// width between the two, so nothing dodges it in x. Both rows are also
// passed in as occluders below, so each approach has a shadow to duck into
// while he's on the far side of the loop.
// East legs sit at x=1.0, not 1.3: his body radius is 0.4 and row B starts at
// x=1.5, so anything past 1.1 wedges him against the shelf mid-leg (the
// axis-separated tryMove stops him dead, frozen facing the door).
//
// South edge used to sit at z=-1.3, putting the SE corner (1.0,-1.3) just
// 3.47m from keypad7 (1.35,-4.75) — and he arrives there heading straight
// down the east leg (facing -z), which points almost dead at the keypad
// (bearing ~5.8°, well inside the 55° cone). Worst case (already stopped
// there, watching): 0.6 (ramp) + (3.47-0.55)/4.3 (chase) =~ 1.28s — the
// "right in your face" complaint from playtest 7. Pulled the south edge up
// to z=0.3: SE corner is now (1.0,0.3), 5.06m from the keypad (matches the
// ~5m target), giving 0.6 + (5.06-0.55)/4.3 =~ 1.65s worst case. Full 2.5s
// isn't reachable by distance alone without pulling the belt out of the
// pocket entirely (row clearance + the keypad's fixed position cap it around
// here) — the interior of every leg is still perpendicular-safe (the closest
// point on a straight leg to an off-leg target is always ~90° off the
// direction of travel, so he only actually sees the keypad in that brief
// window while stopped at/turning through the SE corner itself, not while
// walking the leg). Still comfortably clear of ROW_C (0.3 - (-1.8) = 2.1m,
// well past the >0.5 clearance floor) and the belt still spans the full
// corridor width, so the double-crossing separation between the keypad and
// the entrance-half code/dispenser holds.
const WAYPOINTS = [
  { x: -4.3, z: 1.3 },
  { x: 1.0, z: 1.3 },
  { x: 1.0, z: 0.3 },
  { x: -4.3, z: 0.3 },
];

// RoomScript is frozen; same locally-extended type as room4/5/6 for the
// orderly's teardown hook.
export type Room7Script = RoomScript & { onLeave?(ctx: GameCtx): void };

// Bearing from the player to a point, relative to the player's look yaw —
// same convention as the other orderly rooms' copy.
function bearingTo(dx: number, dz: number, yaw: number): number {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const fwd = -dx * sin - dz * cos;
  const right = dx * cos - dz * sin;
  return Math.atan2(right, fwd);
}

export const room7Script: Room7Script = (() => {
  let orderly: Orderly | null = null;
  let doorUnlocked = false;
  let sawUnmedToast = false;

  function spawnOrderly(ctx: GameCtx): void {
    orderly?.dispose();
    orderly = new Orderly(
      ctx.scene,
      WAYPOINTS,
      [ROW_A, ROW_B, ROW_C],
      {
        onWarn: () => {
          ctx.hud.toast('he is looking at you.');
          ctx.telemetry.event('orderly_spotted');
        },
        onChaseStart: () => {
          ctx.hud.toast('run. or stop being visible.');
          ctx.telemetry.event('orderly_chase');
        },
        onCaught: () => {
          ctx.state.forceState('lucid');
          ctx.shiftFx();
          ctx.teleportPlayer(room7.spawn.x, room7.spawn.z);
          ctx.hud.toast('hands. a needle. "you\'ll lose your place," he says.');
          ctx.telemetry.event('orderly_caught');
        },
      },
      { colliders: ORDERLY_COLLIDERS },
    );
    orderly.setWardState(ctx.state.state);
  }

  const script: Room7Script = {
    onEnter(ctx) {
      spawnOrderly(ctx);
      doorUnlocked = false;
      sawUnmedToast = false;
      ctx.hud.setObjective('the records room. paperwork nobody reads. something hums, somewhere behind it.');
    },

    isAvailable(id) {
      if (id === 'exitdoor') return false;
      if (id === 'keypad7') return !doorUnlocked;
      return true;
    },

    onInteract(id, ctx) {
      if (id === 'keypad7') {
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
            ctx.moveInteractable('exitdoor', [-1, 1.5, -5.85], Math.PI / 2);
            doorCollider.minX = 999;
            doorCollider.maxX = 999.2;
            ctx.hud.toast('0452. filed under nothing.');
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
      orderly?.setWardState(next);
      if (next === 'unmed' && !sawUnmedToast) {
        sawUnmedToast = true;
        ctx.hud.toast('the shelves throw a shadow that keeps his shape.');
      }
    },

    update(dt, _t, ctx) {
      if (!orderly) return;
      const p = ctx.playerPos();
      orderly.update(dt, p.x, p.z, ctx.state.state);

      const level = orderly.watching;
      const chasing = orderly.chasing;
      const dist = Math.hypot(orderly.x - p.x, orderly.z - p.z);
      if (level > 0 || chasing) {
        const bearing = bearingTo(orderly.x - p.x, orderly.z - p.z, p.yaw);
        ctx.hud.setThreat(level, bearing);
      } else {
        ctx.hud.setThreat(0, null);
      }
      ctx.audio.setThreat(level, dist, chasing);
    },

    onLeave(ctx) {
      ctx.hud.setThreat(0, null);
      ctx.audio.setThreat(0, Infinity, false);
      orderly?.dispose();
      orderly = null;
    },
  };

  return script;
})();
