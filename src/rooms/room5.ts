import { RoomBuilder } from './build';
import type { ColliderDef, RoomDef, RoomScript } from './types';
import type { GameCtx } from '../game/context';
import { openKeypad } from '../ui/keypad';
import { Orderly, type OrderlyAABB } from '../game/orderly';
import type { DebugPatrol } from '../devtools/map-types';
import { randomCode4, codeClueText, isRandomizeCodesEnabled } from './kit';

// ROOM 5 — the Nurse Station. The capstone: every mechanic at once, in one
// room, under threat. A central island — occluder, collider, and the only
// reliable shadow — sits inside the orderly's patrol loop. The exit code is
// scrawled unmed-only, split in half, on opposite sides of that loop, so
// reading either half means standing in space he actually walks through.
// The keypad that spends the code only works lucid. The player has to plan
// a route: scout blind-to-him first (lucid, safe, useless), then unmed
// (dangerous, legible), then back to lucid to cross and open the door.

const FIXED_CODE = '1907';
let code = FIXED_CODE;

function regenerateCode(ctx: GameCtx): void {
  if (!isRandomizeCodesEnabled()) return;
  code = randomCode4();
  ctx.updateScrawlText('codeScrawlA', codeClueText(code, [0, 2]));
  ctx.updateScrawlText('codeScrawlB', codeClueText(code, [2, 4]));
}

const rb = new RoomBuilder();

// main room shell, x [-7,7] z [-6,5] (south = entrance, north = staff door)
rb.wallX(-7, 7, 5); // south cap, behind spawn
rb.wallZ(-6, 5, -7); // west wall
rb.wallZ(-6, 5, 7); // east wall
rb.wallX(-7, -1, -6); // north, west of the staff-door gap
rb.wallX(1, 7, -6); // north, east of the staff-door gap

// vestibule beyond the staff door, x [-1,1] z [-8,-6]
rb.wallZ(-8, -6, -1);
rb.wallZ(-8, -6, 1);
rb.wallX(-1, 1, -8); // caps the vestibule
rb.block([1.8, 2.6, 0.06], [0, 1.4, -7.8], 'glow'); // warm glow beyond the exit

// staff door collider — locked until the code is entered, reference kept so
// the room script can disable it in place.
const doorCollider: ColliderDef = { minX: -1, maxX: 1, minZ: -6.1, maxZ: -5.9 };
rb.colliders.push(doorCollider);

// the nurse-station island: a tall central counter (real occluder + collider)
// ringed by a lower counter skirt. One solid footprint — nothing pathfinds
// around its interior, the orderly's loop just runs outside it.
const ISLAND: OrderlyAABB = { minX: -2.2, maxX: 2.2, minZ: -1.3, maxZ: 1.3 };
rb.solid(ISLAND.minX, ISLAND.maxX, ISLAND.minZ, ISLAND.maxZ);
rb.block([1.8, 2.0, 0.9], [0, 1.0, 0], 'wall2'); // raised core counter
rb.block([4.4, 1.1, 0.5], [0, 0.55, 1.05], 'prop'); // ring, south face
rb.block([4.4, 1.1, 0.5], [0, 0.55, -1.05], 'prop'); // ring, north face
rb.block([0.5, 1.1, 1.3], [-1.95, 0.55, 0], 'prop'); // ring, west face
rb.block([0.5, 1.1, 1.3], [1.95, 0.55, 0], 'prop'); // ring, east face

// seating, east corridor (between the patrol lane and the east wall) — a
// couch-ish block the second code half sits behind.
rb.block([0.7, 0.5, 2.4], [5.3, 0.25, 0], 'prop');
rb.solid(4.95, 5.65, -1.2, 1.2);

// medication-window alcove, west corridor — shutter + glow strip, flush
// against the wall, first code half is scrawled beside it.
rb.block([0.08, 1.3, 1.5], [-6.92, 1.5, -0.9], 'pad');
rb.block([0.08, 0.12, 1.6], [-6.92, 2.25, -0.9], 'glow');

// wall TVs — endless static, dressing only
rb.block([1.3, 0.9, 0.1], [-4, 2.25, 4.85], 'glow');
rb.block([1.1, 0.8, 0.1], [5.5, 2.2, -5.85], 'glow');

// The orderly's chase respects the always-on furniture/walls (the lucid-only
// blockers of other rooms don't exist here, but keep the filter for parity
// with room4).
const ORDERLY_COLLIDERS: ColliderDef[] = rb.colliders.filter(
  (c) => c.states === undefined || c.states === 'both',
);

export const room5: RoomDef = {
  id: 'room5',
  name: 'the Nurse Station',
  floor: { minX: -7, maxX: 7, minZ: -8, maxZ: 5 },
  spawn: { x: 0, z: 4.3, yaw: 0 },
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    { id: 'codeScrawlA', text: '1 9 – –', size: 2.2, pos: [-6.85, 1.6, 0.6], rotY: Math.PI / 2, big: true },
    { id: 'codeScrawlB', text: '– – 0 7', size: 2.2, pos: [6.85, 1.6, 0], rotY: -Math.PI / 2, big: true },
    {
      text: 'the coffee is always warm.\nno one drinks it.',
      size: 2.4,
      pos: [6.85, 1.6, 4.3],
      rotY: -Math.PI / 2,
    },
  ],
  interactables: [
    {
      // Own dispenser, reachable without ever entering the patrol loop —
      // sits south of the loop's z <= 2.6 footprint, close to spawn/the
      // teleport-back point after a catch.
      id: 'dispenser5',
      type: 'dispenser',
      // south-wall mount: already z-thin (correct axis), but was floating
      // ~0.5m off the wall instead of sitting flush against it.
      size: [0.55, 0.75, 0.16],
      pos: [-6.3, 1.45, 4.86],
      mat: 'dispenser',
      states: 'both',
      label: 'use the dispenser',
    },
    {
      id: 'keypad5',
      type: 'keypad',
      size: [0.4, 0.5, 0.14],
      pos: [1.35, 1.45, -5.86],
      mat: 'pad',
      states: 'both',
      label: 'use the keypad',
    },
    {
      id: 'exitdoor',
      type: 'door',
      size: [2, 3, 0.2],
      pos: [0, 1.5, -6],
      mat: 'door',
      states: 'both',
      label: 'the exit door',
    },
  ],
  lights: [
    { pos: [0, 3.5] },
    { pos: [-4.5, 0] },
    { pos: [4.5, 0] },
    { pos: [0, -2.5] },
    { pos: [0, -5.5] },
  ],
  exits: [{ to: 'room6', minX: -1, maxX: 1, minZ: -7.9, maxZ: -6.8 }],
};

// Patrol loop encircling the island, well clear of both the medication-window
// corridor and the seating corridor on its outside, and of the island itself
// on its inside — the donut between island and lane is where both code
// halves live, and is exactly where his line of sight sweeps as he
// approaches each leg.
const WAYPOINTS = [
  { x: 4.4, z: 2.6 },
  { x: 4.4, z: -2.6 },
  { x: -4.4, z: -2.6 },
  { x: -4.4, z: 2.6 },
];

// Reaction-time sanity check at keypad5 (1.35,-5.86), per the room6/7 pass:
// the loop's nearest approach is the perpendicular foot on the south leg
// (from (4.4,-2.6) to (-4.4,-2.6)), at (1.35,-2.6) — 3.26m off, but that's
// the foot of the perpendicular, so while he's actually walking that leg
// (facing due west/east) the keypad sits at ~90deg, outside the 55 deg cone.
// At the adjacent corners (±4.4,-2.6) he's 4.46m/6.61m out facing along the
// east leg (~43deg bearing, still outside the cone) — never inside cone+
// range anywhere on the belt. Not flagrant; left as-is.

// RoomScript is frozen (owned by another file); the orderly's lifecycle needs
// a "room script is done" hook that main.ts doesn't otherwise have, so this
// room defines and exports a locally-extended script type, same pattern as
// room4. main.ts calls onLeave (if present) before loading the next room.
export type Room5Script = RoomScript & { onLeave?(ctx: GameCtx): void };

// Bearing from the player to a point, relative to the player's look yaw
// (0 = dead ahead, positive = right) — same convention as room4.ts, derived
// from player.ts's yaw-relative movement math.
function bearingTo(dx: number, dz: number, yaw: number): number {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const fwd = -dx * sin - dz * cos;
  const right = dx * cos - dz * sin;
  return Math.atan2(right, fwd);
}

export const room5Script: Room5Script = (() => {
  let orderly: Orderly | null = null;
  let doorUnlocked = false;
  let sawUnmedToast = false;

  function spawnOrderly(ctx: GameCtx): void {
    orderly?.dispose();
    orderly = new Orderly(
      ctx.scene,
      WAYPOINTS,
      [ISLAND],
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
          ctx.teleportPlayer(room5.spawn.x, room5.spawn.z);
          ctx.hud.toast('hands. a needle. "not this time," he says.');
          ctx.telemetry.event('orderly_caught');
          regenerateCode(ctx);
        },
      },
      { colliders: ORDERLY_COLLIDERS },
    );
    orderly.setWardState(ctx.state.state);
  }

  const script: Room5Script = {
    onEnter(ctx) {
      regenerateCode(ctx);
      spawnOrderly(ctx);
      doorUnlocked = false;
      sawUnmedToast = false;
      ctx.hud.setObjective('the nurse station. the code is written where he walks.');
    },

    isAvailable(id) {
      if (id === 'exitdoor') return false;
      if (id === 'keypad5') return !doorUnlocked;
      return true;
    },

    onInteract(id, ctx) {
      if (id === 'keypad5') {
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
            ctx.moveInteractable('exitdoor', [-1, 1.5, -6.85], Math.PI / 2);
            doorCollider.minX = 999;
            doorCollider.maxX = 999.2;
            ctx.hud.toast(`${code}. someone never finished their shift.`);
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
        ctx.hud.toast('the station throws a shadow. it moves with him, not for you.');
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
      // Audible presence keeps feeding even while lucid/invisible — you
      // can't see him, but you can hear how close he is.
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
