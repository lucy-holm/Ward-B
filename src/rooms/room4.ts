import { RoomBuilder } from './build';
import { orderlyTelemetryCallbacks } from './kit';
import type { ColliderDef, RoomDef, RoomScript } from './types';
import type { GameCtx } from '../game/context';
import { Orderly, type OrderlyAABB } from '../game/orderly';
import type { DebugPatrol } from '../devtools/map-types';

// ROOM 4 — the Day Room. The ward's first NPC. LUCID: he's completely
// invisible — you never know where he is while medicated. UNMED: he's
// revealed, too tall, too still between steps, and he sees YOU wrong —
// watched long enough, he gives chase, and contact restrains you and forces
// medication. Shifting lucid is always safe, even mid-chase (the escape
// costs the pill it always costs). This inverts rooms 2-3's lesson: unmed
// shows the truth, but truth has a predator. The staff door only exists
// while unmedicated — you have to cross his room, in the state he hunts, to
// leave it.

const rb = new RoomBuilder();

// day room shell, x [-6,6] z [-5,5]
rb.wallX(-6, 6, 5); // south cap, behind spawn
rb.wallZ(-5, 5, -6); // west wall
rb.wallZ(-5, 5, 6); // east wall
rb.wallX(-6, -1, -5); // north, west of the staff-door gap
rb.wallX(1, 6, -5); // north, east of the staff-door gap

// vestibule beyond the staff door, x [-1,1] z [-7,-5]
rb.wallZ(-7, -5, -1);
rb.wallZ(-7, -5, 1);
rb.wallX(-1, 1, -7); // caps the vestibule
rb.block([1.8, 2.6, 0.06], [0, 1.4, -6.8], 'glow'); // warm glow beyond the exit

// staff door — solid only while LUCID; simply not there while UNMED. Inverted
// from room1's blocker (solid only while UNMED): here the truth is a way out.
rb.block([2, 3, 0.26], [0, 1.5, -5], 'wall', 'lucid');
const doorCollider: ColliderDef = { minX: -1, maxX: 1, minZ: -5.13, maxZ: -4.87, states: 'lucid' };
rb.colliders.push(doorCollider);

// TV mounted high on the north wall, east of the gap — glow of endless static
rb.block([1.3, 0.9, 0.1], [4, 2.25, -4.8], 'glow');

// tables
rb.block([1.5, 0.5, 0.9], [2, 0.25, 0.3], 'prop');
rb.solid(1.25, 2.75, -0.15, 0.75);
rb.block([1.5, 0.5, 0.9], [3.2, 0.25, 2.6], 'prop');
rb.solid(2.45, 3.95, 2.15, 3.05);

// tall shelving unit — the occluder. Sits between the patrol loop and the
// west wall's safe lane, so hiding in its shadow actually works.
const SHELF: OrderlyAABB = { minX: -3.0, maxX: -1.4, minZ: -1.4, maxZ: -0.6 };
rb.block([1.6, 2.9, 0.8], [-2.2, 1.45, -1], 'wall2');
rb.solid(SHELF.minX, SHELF.maxX, SHELF.minZ, SHELF.maxZ);

// Colliders he won't clip through while patrolling/chasing — always-on ones
// only (walls, tables, the shelf). The lucid-only staff door blocker doesn't
// apply to him: he isn't the one trying to leave through it.
const ORDERLY_COLLIDERS: ColliderDef[] = rb.colliders.filter(
  (c) => c.states === undefined || c.states === 'both',
);

export const room4: RoomDef = {
  id: 'room4',
  name: 'the Day Room',
  floor: { minX: -6, maxX: 6, minZ: -7, maxZ: 5 },
  spawn: { x: 0, z: 4, yaw: 0 },
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    { text: 'he counts\nyour blinks', size: 2.8, pos: [-5.85, 1.7, 1.5], rotY: Math.PI / 2 },
    {
      text: 'the door is only there\nwhen you are honest',
      size: 3.4,
      pos: [-5.85, 1.7, -3],
      rotY: Math.PI / 2,
      big: true,
    },
    { text: 'stand still.\nhe forgets slow things', size: 2.6, pos: [5.85, 1.7, 3.5], rotY: -Math.PI / 2 },
  ],
  interactables: [
    {
      // Rooms are one-way and the catch penalty forces lucid, so the day
      // room needs its own pill source, reachable without crossing the
      // patrol loop (it sits far west of the loop's x >= -0.5 footprint,
      // close to the spawn point the player is teleported back to).
      id: 'dispenser4',
      type: 'dispenser',
      // west-wall mount: x-thin so the faceplate faces east into the room
      // (was authored z-thin, which pointed the plate along the wall).
      size: [0.16, 0.75, 0.55],
      pos: [-5.86, 1.45, 4.2],
      mat: 'dispenser',
      states: 'both',
      label: 'use the dispenser',
    },
  ],
  lights: [{ pos: [0, 3] }, { pos: [3.5, 0] }, { pos: [-3, -1] }, { pos: [3, -4] }, { pos: [0, -6] }],
  exits: [{ to: 'room5', minX: -1, maxX: 1, minZ: -6.9, maxZ: -5.8 }],
};

// Patrol loop kept east/central of the shelving unit (x >= -0.5), leaving the
// west wall (x <= -3, in the shelf's shadow) as a readable safe lane and a
// wide margin around the spawn-side dispenser. A fifth waypoint bulges the
// south edge toward the spawn side (z 3 -> 3.5) so the leg nearest the
// player's first sightline is two shorter, closer strides instead of one
// long distant one — he reads as walking, not parked, right when he's
// first seen.
const WAYPOINTS = [
  { x: 3.5, z: 3 },
  { x: 3.5, z: -3 },
  { x: -0.5, z: -3 },
  { x: -0.5, z: 3 },
  { x: 1.8, z: 3.5 },
];

// RoomScript is frozen (owned by another file); the orderly's lifecycle needs
// a "room script is done" hook that main.ts doesn't otherwise have, so this
// room defines and exports a locally-extended script type. main.ts calls
// onLeave (if present) before loading the next room.
export type Room4Script = RoomScript & { onLeave?(ctx: GameCtx): void };

// Bearing from the player to a point, relative to the player's look yaw.
// 0 = dead ahead, positive = right. Matches player.ts's own yaw-relative
// movement convention (forward = (-sin(yaw), -cos(yaw)), right = (cos(yaw),
// -sin(yaw))) so a bearing of 0 always means "on screen, dead center."
function bearingTo(dx: number, dz: number, yaw: number): number {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const fwd = -dx * sin - dz * cos;
  const right = dx * cos - dz * sin;
  return Math.atan2(right, fwd);
}

export const room4Script: Room4Script = (() => {
  let orderly: Orderly | null = null;
  let toldGone = false; // first lucid shift in the room gets its own line

  function spawnOrderly(ctx: GameCtx): void {
    orderly?.dispose();
    orderly = new Orderly(
      ctx.scene,
      WAYPOINTS,
      [SHELF],
      orderlyTelemetryCallbacks(ctx, {
        warnToast: 'he is looking at you.',
        chaseToast: 'run. or stop being visible.',
        onCaught: () => {
          ctx.state.forceState('lucid');
          ctx.shiftFx();
          ctx.teleportPlayer(room4.spawn.x, room4.spawn.z);
          ctx.hud.toast('hands. a needle. "there you are," he says.');
        },
      }),
      { colliders: ORDERLY_COLLIDERS },
    );
    orderly.setWardState(ctx.state.state);
  }

  const script: Room4Script = {
    onEnter(ctx) {
      toldGone = false;
      spawnOrderly(ctx);
      ctx.hud.setObjective('the day room. he only exists when you do. the door out is the same.');
    },

    onStateChange(next, ctx) {
      orderly?.setWardState(next);
      if (next === 'lucid' && !toldGone) {
        toldGone = true;
        ctx.hud.toast("gone. or — no. you just can't see him.");
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
      // Audible presence keeps feeding even while lucid/invisible — that's
      // the suspense: you can't see him, but you can hear how close he is.
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

export const debugPatrols: DebugPatrol[] = [{ waypoints: WAYPOINTS }];
