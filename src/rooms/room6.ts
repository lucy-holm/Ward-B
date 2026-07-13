import { RoomBuilder } from './build';
import type { ColliderDef, RoomDef, RoomScript } from './types';
import type { GameCtx } from '../game/context';
import { openKeypad } from '../ui/keypad';
import { Orderly, type OrderlyAABB } from '../game/orderly';

// ROOM 6 — the West Corridor. First bend in the ward, first room where the
// dispenser isn't waiting at the safe entrance: it sits in an alcove off the
// long leg of the L, right where his patrol runs. The exit code is scrawled
// unmed-only, further down the same leg, past the alcove. Nothing here is
// individually new — you've read scrawls unmed, you've fed a keypad lucid,
// you've shared a room with him — the room just makes you leapfrog all three
// at once: dash unmed for the code, fall back to the alcove to restock, cross
// lucid at the moment that actually matters.

const CODE = '6329';

const rb = new RoomBuilder();

// leg A (entrance leg, north-south), x [-1.6,1.6], z [-1.2,8]
rb.wallZ(-4.6, 8, -1.6); // west wall — leg A, the corner, and leg B's west edge, one run
rb.wallZ(-1.2, 8, 1.6); // leg A east wall (stops at the corner; leg B is open past it)
rb.wallX(-1.6, 1.6, 8); // south cap, behind spawn

// leg B (long leg, east-west), z [-4.6,-1.2], x [-1.6,12]
rb.wallX(1.6, 12, -1.2); // leg B north wall — starts east of the corner opening
rb.wallX(-1.6, 5.5, -4.6); // leg B south wall, west of the alcove gap
rb.wallX(7.1, 12, -4.6); // leg B south wall, east of the alcove gap

// east cap, with the exit doorway gap
rb.wallZ(-4.6, -3.9, 12);
rb.wallZ(-1.9, -1.2, 12);
const doorCollider: ColliderDef = { minX: 11.88, maxX: 12.12, minZ: -3.9, maxZ: -1.9 };
rb.colliders.push(doorCollider);

// vestibule beyond the exit door, x [12,14] z [-3.9,-1.9]
rb.wallX(12, 14, -3.9);
rb.wallX(12, 14, -1.9);
rb.wallZ(-3.9, -1.9, 14);
rb.block([0.06, 2.6, 1.6], [13.75, 1.4, -2.9], 'glow'); // warm glow beyond the exit

// the alcove — a recess off leg B's south wall, mid-route, his loop passes
// its mouth without ever looking straight into it (his cone tracks his
// direction of travel, east-west; the alcove opens south).
rb.wallZ(-6.1, -4.6, 5.5); // alcove west wall
rb.wallZ(-6.1, -4.6, 7.1); // alcove east wall
rb.wallX(5.5, 7.1, -6.1); // alcove end cap — the dispenser mounts here

const ALCOVE_W: OrderlyAABB = { minX: 5.38, maxX: 5.62, minZ: -6.1, maxZ: -4.6 };
const ALCOVE_E: OrderlyAABB = { minX: 6.98, maxX: 7.22, minZ: -6.1, maxZ: -4.6 };

const ORDERLY_COLLIDERS: ColliderDef[] = rb.colliders.filter(
  (c) => c.states === undefined || c.states === 'both',
);

export const room6: RoomDef = {
  id: 'room6',
  floor: { minX: -1.8, maxX: 14, minZ: -6.3, maxZ: 8 },
  spawn: { x: 0, z: 7, yaw: 0 },
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    { text: 'he learned this hallway\nbefore you did', size: 3, pos: [-1.45, 1.7, 3], rotY: Math.PI / 2 },
    { text: 'count his steps.\nthen move.', size: 2.6, pos: [6.3, 1.6, -1.45], rotY: Math.PI },
    // Pulled a couple meters west of the keypad, deeper into the leg his
    // patrol actually walks — the corridor's turn already makes this spot
    // hard to reach; this just widens the gap between "found the code" and
    // "safe at the keypad" instead of restructuring the room.
    { text: '6 3 2 9', size: 2.4, pos: [8.3, 1.6, -4.35], rotY: 0, big: true },
  ],
  interactables: [
    {
      // Off the entrance, in the alcove his loop passes — the first
      // dispenser you have to actually walk into his route to reach.
      // Alcove end cap (the wall it's flush against) is at z=-6.1, mouth
      // opens toward +z — inferFacing happens to land on the right sign here
      // (room-wide floor center is also +z of this point), but that's
      // coincidence, not guarantee, so it's pinned explicitly like the other
      // alcove/nook mounts in rooms 7/8/10.
      id: 'dispenser6',
      type: 'dispenser',
      size: [0.55, 0.75, 0.16],
      pos: [6.3, 1.45, -5.85],
      mat: 'dispenser',
      states: 'both',
      facing: 'pz',
      label: 'use the dispenser',
    },
    {
      id: 'keypad6',
      type: 'keypad',
      size: [0.14, 0.5, 0.4],
      pos: [11.75, 1.45, -2.9],
      mat: 'pad',
      states: 'both',
      label: 'use the keypad',
    },
    {
      id: 'exitdoor',
      type: 'door',
      size: [0.2, 3, 2],
      pos: [12, 1.5, -2.9],
      mat: 'door',
      states: 'both',
      label: 'the exit door',
    },
  ],
  lights: [
    { pos: [0, 6] },
    { pos: [0, 1] },
    { pos: [0, -2] },
    { pos: [3, -2.9] },
    { pos: [6.3, -2.9] },
    { pos: [6.3, -5.3] },
    { pos: [9.5, -2.9] },
    { pos: [12.5, -2.9] },
  ],
  exits: [{ to: 'room7', minX: 13.2, maxX: 14, minZ: -3.9, maxZ: -1.9 }],
};

// Full back-and-forth traversal of the L: south leg, corner, a south-leaning
// bow through the long leg, and back. The corner waypoint sits at z=-2.0
// (inside leg B's own z span) rather than right at the junction, so every leg
// of the loop is a straight line that never grazes the wall separating leg A
// from leg B.
//
// wp0 (the south end of leg A) used to sit at z=5.5 — only 1.5m from spawn
// (0,7). Every cycle he pauses there (0.8s) facing back toward the entrance
// (he arrives heading +z), so a player who shifted unmed right at spawn could
// find him already stopped, watching, 1.5m away: worst case time-to-contact
// was ~0.6 (ramp) + (1.5-0.55)/4.3 (chase) =~ 0.8s — instant, per playtest 7.
// Pulled back to z=0.8: distance from spawn is now 6.2m, outside his 6m sight
// range, so a player frozen right at the entrance is never seen at all. Step
// a couple meters further in (toward the first scrawl) and the usual tension
// returns — that's intentional, this fixes the entrance specifically, not
// the whole leg.
//
// Second pass (playtest 8): "still very close to the panel the first time
// you see him." wp0 above was fine, but the old near end — a single straight
// diagonal from the corner (0,-2.0) to (10.5,-2.9) — was still too close to
// several things a freshly-unmed player actually stands at. Simulated the
// real sight/grace/chase loop (dt-stepped, matching orderly.ts exactly) and
// measured worst-case time-to-contact if the player freezes the instant
// they're first seen, against every landmark reachable unmed early in the
// room, old diagonal vs. the bow below:
//   'count his steps. then move.' scrawl (6.3,-1.45), right past the corner
//     — the actual first-sighting beat, since it's the first thing that
//     requires being unmed: 1.0s before -> never triggers now (the bow
//     passes ~2.3m+ off it, at an angle the cone never covers).
//   the code scrawl (8.3,-4.35): 1.29s before -> 1.45s now.
//   keypad6 (11.75,-2.9), if still unmed there out of habit before shifting
//     to use it: 0.77s before (his old near end sat 1.25m off it, same
//     z-line) -> 1.29s now (near end pulled back and off that line).
// The corner scrawl is the one the "~3s to react" note was really about —
// it's the first place a player is guaranteed to be unmed, and it's now
// fully safe on a single pass. The code scrawl and keypad approaches also
// improve (both were under 1.3s, neither is now) but can't clear 3s outright
// without either cutting his patrol short of the alcove — which would gut
// the room's whole "his patrol runs through where you have to read the code"
// premise — or moving the code/keypad, both off the table here. Patrol
// clearance stays > 0.5 from every collider throughout (min 0.68m now, vs.
// 0.815m before).
const WAYPOINTS = [
  { x: 0, z: 0.8 },
  { x: 0, z: -2.0 },
  { x: 4.0, z: -3.75 },
  { x: 9.2, z: -2.0 },
  { x: 4.0, z: -3.75 },
  { x: 0, z: -2.0 },
];

// RoomScript is frozen; the orderly's lifecycle needs a teardown hook main.ts
// doesn't otherwise have, so this room defines and exports a locally-extended
// script type, same pattern as room4/room5.
export type Room6Script = RoomScript & { onLeave?(ctx: GameCtx): void };

// Bearing from the player to a point, relative to the player's look yaw —
// same convention as room4/room5's copy, derived from player.ts's movement math.
function bearingTo(dx: number, dz: number, yaw: number): number {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const fwd = -dx * sin - dz * cos;
  const right = dx * cos - dz * sin;
  return Math.atan2(right, fwd);
}

export const room6Script: Room6Script = (() => {
  let orderly: Orderly | null = null;
  let doorUnlocked = false;
  let sawUnmedToast = false;

  function spawnOrderly(ctx: GameCtx): void {
    orderly?.dispose();
    orderly = new Orderly(
      ctx.scene,
      WAYPOINTS,
      [ALCOVE_W, ALCOVE_E],
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
          ctx.teleportPlayer(room6.spawn.x, room6.spawn.z);
          ctx.hud.toast('hands. a needle. "back to the start," he says.');
          ctx.telemetry.event('orderly_caught');
        },
      },
      { colliders: ORDERLY_COLLIDERS },
    );
    orderly.setWardState(ctx.state.state);
  }

  const script: Room6Script = {
    onEnter(ctx) {
      spawnOrderly(ctx);
      doorUnlocked = false;
      sawUnmedToast = false;
      ctx.hud.setObjective('the corridor bends. the way out wants a code, and it is not on the keypad.');
    },

    isAvailable(id) {
      if (id === 'exitdoor') return false;
      if (id === 'keypad6') return !doorUnlocked;
      return true;
    },

    onInteract(id, ctx) {
      if (id === 'keypad6') {
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
            ctx.moveInteractable('exitdoor', [12.85, 1.5, -1.9], Math.PI / 2);
            doorCollider.minX = 999;
            doorCollider.maxX = 999.2;
            ctx.hud.toast('6329. someone counted his steps before you.');
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
        ctx.hud.toast('the corridor goes red at the edges. he goes solid.');
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
