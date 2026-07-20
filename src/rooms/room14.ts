import { RoomBuilder, dispenser, scrawl, patrol, pressurePlate, inTrigger } from './kit';
import type { ColliderDef, RoomDef, RoomScript } from './types';
import type { GameCtx } from '../game/context';
import { Orderly, type OrderlyAABB } from '../game/orderly';
import type { DebugPatrol } from '../devtools/map-types';

// ROOM 14 — the Hold. The wing exhales: room13 gave nothing back, so this
// room opens with a dispenser five meters from spawn and asks exactly one
// new thing — a gate the floor plate holds open only while something's
// weight is on it, with the plate far enough from the gate that being on
// it and being through it are mutually exclusive. One base-tuned orderly
// paces a line that crosses the plate: the wing's reintroduction of the
// threat, and the second half of the teach (he can carry the plate for
// you — his patrol never stops, even lucid when you can't see him).
//
// Three honest routes, no keypad, no code (spec: room14-pressure-plates):
//   A solo sprint    — step on, run the ~1.6m before the 0.7s settle
//                      window closes. 0 pills.
//   B let him carry  — wait behind the crate, walk through while his leg
//                      crosses the plate (1.73s transit + 0.7s tail vs a
//                      ~0.94s walk). 0 pills unmed, 1 lucid for safety.
//   C pay to be safe — lucid first, then A or B risk-free. 1 pill.
//
// SOFT-LOCK AUDIT: dispenser14 is in the entry alcove behind no gate, no
// orderly reach, no state requirement — a 0-pill unmed arrival tops up in
// the first seconds. Nothing in this room is unmed-sealed; the gate only
// ever stands between Z2 and the one-way exit, never between the player
// and the dispenser. The timer expiring anywhere is an ordinary revert.
// The gate never closes onto a body in its footprint (tryCloseGate defers,
// rechecked per frame — room13's wall-clamp lesson).
//
// REACTION-TIME AUDIT (patrol leg (-4.2,-11.9)↔(4.2,-11.9)): west scrawl
// (-5,2) is ≈13.9m from the nearest patrol point, east scrawl (5,-2)
// ≈9.9m, dispenser ≈19.6m — all clear the 8.2m floor. Z2/the gate is the
// room's gameplay (evasion), not an inspection point, same distinction as
// room3/4. Orderly is unmodified TUNING.orderly — reintroduction, not
// escalation.

const rb = new RoomBuilder();

// perimeter — floor x[-5,5] z[-17,9], spawn end at +z (south)
rb.wallX(-5, 5, 9); // south cap, behind spawn
rb.wallZ(-17, 9, -5); // west
rb.wallZ(-17, 9, 5); // east
rb.wallX(-5, 5, -17); // north cap

// gate wall, z=-14 — 2m opening x[-1,1], held by the plate, never a keypad
rb.wallX(-5, -1, -14);
rb.wallX(1, 5, -14);
const gateCollider: ColliderDef = { minX: -1, maxX: 1, minZ: -14.1, maxZ: -13.9 };
rb.colliders.push(gateCollider);

// the plate, straddling his patrol line
const plate = pressurePlate({ id: 'plate14', minX: -1.3, maxX: 1.3, minZ: -12.5, maxZ: -11.3 });
rb.blocks.push(plate.block);

// waiting crate near the gate — occluder + cover for route B
const CRATE: OrderlyAABB = { minX: 2.55, maxX: 3.45, minZ: -13.3, maxZ: -12.7 };
rb.block([0.9, 1.0, 0.6], [3, 0.5, -13], 'prop');
rb.solid(CRATE.minX, CRATE.maxX, CRATE.minZ, CRATE.maxZ);

// vestibule glow — the way out reads from across the room once the gate opens
rb.block([1.8, 2.6, 0.06], [0, 1.4, -16.8], 'glow');

// vestibule trigger — fires the "through" beat once, past the gate
const VESTIBULE_TRIGGER = { id: 'vestibule14', minX: -5, maxX: 5, minZ: -16, maxZ: -14.2 };

const ORDERLY_COLLIDERS: ColliderDef[] = rb.colliders.filter(
  (c) => c.states === undefined || c.states === 'both',
);

const WAYPOINTS = patrol(
  [
    { x: -4.2, z: -11.9 },
    { x: 4.2, z: -11.9 },
  ],
  rb.colliders,
);

export const room14: RoomDef = {
  id: 'room14',
  name: 'the Hold',
  floor: { minX: -5, maxX: 5, minZ: -17, maxZ: 9 },
  spawn: { x: 0, z: 8, yaw: 0 },
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    scrawl("it only holds the door\nwhile it's heavy.", 'w', -5, 2),
    scrawl('he never stopped walking.\nyou just stopped seeing him.', 'e', 5, -2),
  ],
  interactables: [
    dispenser({ id: 'dispenser14', side: 'w', wallAt: -5, along: 7.3, label: 'use the dispenser' }),
    {
      id: 'gate14',
      type: 'door',
      size: [2, 3, 0.2],
      pos: [0, 1.5, -14],
      mat: 'door',
      states: 'both',
      facing: 'pz',
      label: 'the gate',
    },
  ],
  lights: [
    { pos: [0, 6] },
    { pos: [0, 1] },
    { pos: [0, -4] },
    { pos: [3, -12] },
    { pos: [-3, -12] },
    { pos: [0, -15.5] },
  ],
  triggers: [plate.trigger, VESTIBULE_TRIGGER],
  // Repoint to 'room15' when it lands — END is the wing's temporary edge.
  exits: [{ to: 'END', minX: -1, maxX: 1, minZ: -16.9, maxZ: -16.2 }],
};

const GATE_CLOSED_POS: [number, number, number] = [0, 1.5, -14];
const GATE_OPEN_POS: [number, number, number] = [-1, 1.5, -14.85];
const SETTLE_SEC = 0.7; // grace after the LAST body leaves the plate

export type Room14Script = RoomScript & { onLeave?(ctx: GameCtx): void };

// Same convention as every orderly room's local copy.
function bearingTo(dx: number, dz: number, yaw: number): number {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const fwd = -dx * sin - dz * cos;
  const right = dx * cos - dz * sin;
  return Math.atan2(right, fwd);
}

export const room14Script: Room14Script = (() => {
  let orderly: Orderly | null = null;
  let orderlyWasOn = false;
  let occupants = 0; // union of player + orderly currently on the plate
  let closeTimer = 0;
  let gateOpen = false;
  let sawFirstOpen = false;
  let sawOrderlyOpen = false;
  let sawThrough = false;

  function openGate(ctx: GameCtx, byOrderly: boolean): void {
    if (gateOpen) return;
    gateOpen = true;
    gateCollider.minX = 999;
    gateCollider.maxX = 999.2; // standard disable trick
    ctx.moveInteractable('gate14', GATE_OPEN_POS, Math.PI / 2);
    // Toast sequencing is deliberate: the first-ever open teaches the
    // mechanism ("the floor remembers weight...") no matter who tripped it.
    // The orderly beat then lands on his NEXT crossing — his patrol re-crosses
    // the plate every cycle, so when he causes the first open too, the beat is
    // delayed one cycle, never lost. Not room13's severity-chain pattern.
    if (!sawFirstOpen) {
      sawFirstOpen = true;
      ctx.hud.toast('the floor remembers weight. the door remembers the floor.');
    } else if (byOrderly && !sawOrderlyOpen) {
      sawOrderlyOpen = true;
      ctx.hud.toast("he just did what you couldn't do alone.");
    }
    ctx.telemetry.event('gate_open', { byOrderly });
  }

  function tryCloseGate(ctx: GameCtx): void {
    // Never re-engage onto a body still inside the gate's own footprint —
    // the trap class room13's per-frame wall-clamp exists to prevent
    // (tryMove freezes any body whose position already penetrates an AABB).
    // Deferred: returns without closing, rechecked every frame.
    const p = ctx.playerPos();
    const playerClear = !(p.x > -1.35 && p.x < 1.35 && p.z > -14.3 && p.z < -13.7);
    const orderlyClear =
      !orderly || !(orderly.x > -1.35 && orderly.x < 1.35 && orderly.z > -14.3 && orderly.z < -13.7);
    if (!playerClear || !orderlyClear) return;
    gateOpen = false;
    gateCollider.minX = -1;
    gateCollider.maxX = 1;
    ctx.moveInteractable('gate14', GATE_CLOSED_POS, 0);
    ctx.telemetry.event('gate_close');
  }

  function plateEnter(ctx: GameCtx, byOrderly: boolean): void {
    occupants += 1;
    if (occupants === 1) openGate(ctx, byOrderly);
  }

  function plateExit(): void {
    occupants = Math.max(0, occupants - 1);
    if (occupants === 0) closeTimer = SETTLE_SEC;
  }

  const script: Room14Script = {
    onEnter(ctx) {
      orderly?.dispose();
      orderly = new Orderly(
        ctx.scene,
        WAYPOINTS,
        [CRATE],
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
            ctx.teleportPlayer(room14.spawn.x, room14.spawn.z);
            ctx.hud.toast('hands. a needle. "back to the start of the wing," he says.');
            ctx.telemetry.event('orderly_caught');
          },
        },
        { colliders: ORDERLY_COLLIDERS },
      );
      orderly.setWardState(ctx.state.state);
      // module-level state survives across entries; reset all of it
      orderlyWasOn = false;
      occupants = 0;
      closeTimer = 0;
      gateOpen = false;
      sawFirstOpen = false;
      sawOrderlyOpen = false;
      sawThrough = false;
      gateCollider.minX = -1;
      gateCollider.maxX = 1;
      ctx.hud.setObjective('the wing goes on. so does he.');
    },

    isAvailable(id) {
      return id !== 'gate14';
    },

    onTriggerEnter(id, ctx) {
      if (id === 'plate14') plateEnter(ctx, false);
      if (id === 'vestibule14' && !sawThrough) {
        sawThrough = true;
        ctx.hud.setObjective("through. it doesn't get gentler from here.");
      }
    },

    onTriggerExit(id) {
      if (id === 'plate14') plateExit();
    },

    onStateChange(next) {
      orderly?.setWardState(next);
    },

    update(dt, _t, ctx) {
      if (!orderly) return;
      const p = ctx.playerPos();
      orderly.update(dt, p.x, p.z, ctx.state.state);

      // Orderly-on-plate — engine can't see him (room-owned), so this room
      // runs the identical containment test itself, edge-detected.
      const orderlyOn = inTrigger(plate.trigger, orderly.x, orderly.z, ctx.state.state);
      if (orderlyOn && !orderlyWasOn) plateEnter(ctx, true);
      if (!orderlyOn && orderlyWasOn) plateExit();
      orderlyWasOn = orderlyOn;

      if (gateOpen && occupants === 0) {
        closeTimer -= dt;
        if (closeTimer <= 0) tryCloseGate(ctx); // may defer; retried next frame
      }

      const level = orderly.watching;
      const dist = Math.hypot(orderly.x - p.x, orderly.z - p.z);
      if (level > 0 || orderly.chasing) {
        ctx.hud.setThreat(level, bearingTo(orderly.x - p.x, orderly.z - p.z, p.yaw));
      } else {
        ctx.hud.setThreat(0, null);
      }
      ctx.audio.setThreat(level, dist, orderly.chasing);
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

export const debugPatrols: DebugPatrol[] = [{ waypoints: WAYPOINTS, label: 'A' }];
