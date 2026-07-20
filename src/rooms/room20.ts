import { RoomBuilder, dispenser, scrawl, patrol, pressurePlate, inTrigger } from './kit';
import type { ColliderDef, RoomDef, RoomScript } from './types';
import type { GameCtx } from '../game/context';
import { Orderly, type OrderlyAABB } from '../game/orderly';
import { TUNING } from '../tuning';
import type { DebugPatrol } from '../devtools/map-types';

// ROOM 20 — the Loading Bay. Wing capstone, and (until room15-19 land) the
// new END: `room19`'s exit would repoint here once it exists (not this
// agent's scope — see the design doc's header). One new verb, introduced and
// then asked for everything at once: PUSH. A single crate does three jobs in
// sequence — seat a plate that opens the only way out of the intake pocket,
// then serve as mobile cover against two orderlies guarding the gauntlet
// floor, then seat a second plate that opens the way to END. There is no
// second crate and no way to skip ahead; design doc:
// docs/superpowers/specs/2026-07-19-room20-pushable-blocks-design.md.
//
// Three zones, spawn to END, +Z toward spawn (house convention):
//   Z1 the intake room     z [ 2, 6]   safe, no orderly — dispenser + PLATE_1
//   Z2 the gauntlet floor  z [-15, 1]  2 orderlies — the crate's whole route
//   Z3 the exit vestibule  z [-19,-16] safe, no lock — the open doorway to END
//
// THE PUSH MECHANIC (room13/keypadDoor's mutable-ColliderDef trick, reused,
// plus one new InteractableType the renderer already draws via world.ts's
// `default:` box branch — no new engine surface):
//   - CELL_M = 1.0. A push moves the crate exactly one cell along whichever
//     cardinal axis has the larger magnitude in the player->crate vector at
//     the moment of the press, continuing AWAY from the player (walking into
//     its face pushes it further from you, matching the "walk into it" verb).
//   - One interact press = one cell (see the design doc's open question #1:
//     `interact()` is a discrete per-press call, not a held key — this reuses
//     100% of existing plumbing rather than adding held-key tracking).
//     Gated on the existing raycast focus (`crate`, within
//     TUNING.interact.maxDistance) PLUS an explicit adjacency check
//     (`PUSH_REACH_M` = 1.15 — "standing at its face", not aiming from
//     across the room).
//   - A push resolves only if the destination cell's 0.86m AABB overlaps
//     neither an active collider (state-filtered exactly like
//     tryMove/isActive, crate's own collider excluded by identity) nor
//     either orderly's current body circle (point-in-time test against
//     Orderly.x/z + TUNING.orderly.radius — pushes are discrete events, not
//     continuous physics). A failed push is a silent no-op except a
//     one-time "it doesn't go that way." toast (no spam, matching tryMove's
//     wall-bump convention).
//   - The crate's ColliderDef is mutated in place (crateCollider): pushed
//     into rb.colliders once at module init, then re-bounded to the new
//     cell THE INSTANT a push is accepted — before the mesh has moved at
//     all — so a fast-following player can never stand where the solid AABB
//     already is. The mesh then tweens to match over PUSH_TWEEN_SEC via
//     ctx.moveInteractable, called every frame from update() (GameCtx has no
//     built-in tween; the room owns it, same shape as room13's setWallGap
//     single-writer pattern).
//   - Occluder yes, movement-collider no (the room13 lesson, by explicit
//     design-doc callback): crateCollider is the SAME OBJECT passed into (a)
//     rb.colliders (blocks the player, via tryMove) and (b) both orderlies'
//     `occluders` arrays (blocks sightlines, via segmentHitsAABB — pure
//     static geometry, no movement, no wedging risk). It is EXCLUDED BY
//     IDENTITY from ORDERLY_COLLIDERS (movement-blocking) below, exactly
//     like room13 excludes its two moving wall colliders. Consequence,
//     accepted: an orderly whose leg is ever pushed into by the crate would
//     walk through it. Never triggers here — see the dead-state section
//     below for why the crate's reachable cell-set stays clear of both
//     patrols' waypoints/legs by a hand-verified margin.
//
// DEAD-STATE ANALYSIS. Claim: no true (unrecoverable) dead state.
//   Structural argument: a push moves the crate from cell A to cell B; A is,
//   by definition, empty the instant the push resolves (one crate, orderlies
//   are excluded from being movement-blocked by it, no second crate exists).
//   So every push is trivially reversible — walk to B's far face and push
//   back toward A. The only way real sokoban dead-ends (a crate shoved into
//   a two-wall corner) requires the crate adjacent to a wall on two
//   perpendicular sides at once. Every cell on the crate's intended route —
//   (2,1)(1,1)(0,1)(0,0)(0,-1)(0,-2)(-1,-2)(0,-9)(1,-9)(0,-15), and every
//   straight-run transit cell between them — sits >=3m from the nearest
//   perimeter wall (x=+-6, z=6, z=-16) and >=1m clear of ISLAND_C. No cell in
//   the reachable set is a two-wall corner; a "wrong" push from any of them
//   lands on open floor, always walk-around-and-reverse-able.
//   Named risk: over-pushing past a cover stop (e.g. (0,-2) -> (-1,-2) ->
//   (-2,-2), straight onto Orderly A's own waypoint) doesn't dead-end the
//   crate (still reversible — see above) but does make the retrieval walk
//   materially more dangerous, since the recovery push now has to be made
//   from inside A's danger leg proper. Costlier, never unsolvable.
//   Defense-in-depth, layered on top regardless: every catch in this room
//   re-racks the crate to REST_CELL (2,1) in addition to the standard catch
//   penalty (forceState('lucid'), teleport to spawn, pills kept) — "they put
//   everything back where it belongs." Gates already opened stay open (like
//   every keypad door in the game, they're one-way permanent latches, not
//   re-sealed by a catch) — only the crate, the one thing that was never
//   nailed down, resets.
//
// SOFT-LOCK AUDIT. Hard law (0-pill unmed player can always reach a
// dispenser) — room20's version of "a push block may never be the sole
// obstruction between the player and a dispenser," satisfied three ways:
//   1. Exactly one dispenser (dispenser20), in Z1, which never sees a push —
//      the crate's entire reachable route lives in Z2 (z <= 1); the
//      dispenser sits at x=-6,z=4, nowhere near it.
//   2. GATE_1 is a one-way permanent latch (gate1Collider shoved to x=999
//      the instant the crate first reaches PLATE_1, never re-armed) — a
//      player anywhere in Z2, at any point in the crate's journey, can
//      always walk straight back north through the open gate to the
//      dispenser. This is the load-bearing guarantee: "is the dispenser
//      reachable" reduces to "is Z1 reachable," true for the room's entire
//      lifetime once GATE_1 opens.
//   3. The crate's 0.86m footprint, on a 12m-wide floor, can never
//      physically wall off the retreat route — even at its narrowest
//      designed stop (COVER_A/COVER_B), several meters of open floor remain
//      on either side. Nothing here depends on a single-file chokepoint the
//      crate could seal.
//   General rule for a future push-block room (worth ROOM_AUTHORING.md):
//   a pushable block may only ever gate progress FORWARD (a plate/gate
//   combo, one-way) — never be the only thing standing between the player
//   and a dispenser/exit once placed.
//
// REACTION-TIME AUDIT. minInspectionDistance(2.5) = (2.5-0.6)*4.3 = 8.17m ~=
// 8.2m — the kit constant. This rule is scoped to STATIC inspection points
// (stand-and-read spots: a scrawl, a keypad, a multi-second modal); room20
// has neither — PLATE_1/PLATE_2 trigger on the crate's position alone,
// polled once per frame, no player dwell, no modal. The push press itself is
// a single discrete interact call, and the retrieval walk is ordinary
// movement — the same hazard class as every other orderly encounter in this
// game (cross open ground while his cone is visible), governed by live sight
// cones + graceSec + chase speed, not a fixed safe-distance guarantee. Ran
// the numbers anyway:
//   - COVER_A push point (0,-2) to A's nearest danger-leg point (-2,-2):
//     2.0m — well under 8.2m, but this IS the live-evasion crossing itself,
//     not a static read; fairness comes from A's rendered sight cone (unmed)
//     plus the option to wait him off the leg before pushing.
//   - PLATE_2 (0,-15) to B's nearest loop point (2,-9): 6.3m — under 8.2m by
//     raw distance, but B's forward vector there runs along his own x=2
//     return leg, not toward (0,-15), except mid waypoint-pause.
//   Playtest note (matching the design doc): if either reads as an unfair
//   surprise rather than "you should have watched him," the cheap fix is
//   widening the PLATE_2/Orderly-B gap a few meters — doesn't touch the
//   crate mechanic.
//
// DISPENSER PLACEMENT. One dispenser, Z1, west wall, near end, right past
// spawn before any threat exists (ROOM_AUTHORING.md law #5 / room12's
// dispenser12c precedent). No lucid-gated action in this room actually needs
// a dispenser — pushing works in both states, plates trigger on crate
// position, not a keypad — it exists for pressure/economy consistency and as
// the crate-recovery panic button; reaching it again past GATE_1 costs a
// real walk back across whatever of the gauntlet is already crossed.
//
// RANDOMIZE-CODES: not applicable. No keypad in this room (design doc §10.5
// — the plate/gate beat is presence-triggered, not a code).

const CELL_M = 1;
const CRATE_HALF = 0.43; // 0.86m footprint, 0.07m margin to the 1.0m cell boundary
const REST_CELL = { x: 2, z: 1 };
const PUSH_REACH_M = 1.15; // "standing at its face" adjacency gate, on top of raycast focus
const PUSH_TWEEN_SEC = 0.18;

// Gate slab positions — closed sits flush in the wall gap; open swings
// through it and back, same "hinge + through the gap" visual language as
// every keypad door in the game (keypadDoor's DOOR_SWING_DEPTH = 0.85).
const GATE1_CLOSED_POS: [number, number, number] = [0, 1.5, 0];
const GATE1_OPEN_POS: [number, number, number] = [-0.5, 1.5, -0.85];
const GATE2_CLOSED_POS: [number, number, number] = [0, 1.5, -16];
const GATE2_OPEN_POS: [number, number, number] = [-0.5, 1.5, -16.85];

const rb = new RoomBuilder();

// Shell: floor x[-6,6] z[-19,6], spawn at the +z end (Z1).
rb.wallX(-6, 6, 6); // south cap, behind spawn
rb.wallZ(-19, 6, -6); // west perimeter, full length
rb.wallZ(-19, 6, 6); // east perimeter, full length
rb.wallX(-6, -1, -19); // north cap, west of the exit doorway
rb.wallX(1, 6, -19); // north cap, east of the exit doorway
rb.block([1.8, 2.6, 0.06], [0, 1.4, -18.95], 'glow'); // the way out, inside the exit trigger itself

// GATE_1 — the Z1/Z2 boundary, z=0. A partition wall with a 1-cell gap,
// sealed by a mutable collider (opened permanently once the crate seats
// PLATE_1). The visual slab (`gate1`, a `door`-typed InteractableDef) is
// never player-interactable — it's opened by crate weight, not a keypad; see
// `isAvailable` below.
rb.wallX(-6, -0.5, 0);
rb.wallX(0.5, 6, 0);
const gate1Collider: ColliderDef = { minX: -0.5, maxX: 0.5, minZ: -0.1, maxZ: 0.1 };
rb.colliders.push(gate1Collider);

// GATE_2 — the Z2/Z3 boundary, z=-16. Same shape as GATE_1.
rb.wallX(-6, -0.5, -16);
rb.wallX(0.5, 6, -16);
const gate2Collider: ColliderDef = { minX: -0.5, maxX: 0.5, minZ: -16.1, maxZ: -15.9 };
rb.colliders.push(gate2Collider);

// ISLAND_C — static solid + occluder, room-authored, NOT pushable. Cover
// that's insufficient alone (the room's thesis: static cover isn't enough
// here, only static plus the crate clears the gauntlet). DEVIATION from the
// design doc's literal x[-1,1]: that footprint sits astride x=0, which is
// exactly the crate's own causeway line for the long COVER_A -> COVER_B
// transfer (§4: 7 straight pushes down x=0, z -2 to -9) — the doc's own
// intended solve would permanently block itself on this obstacle. Shifted
// east to x[2,4] (same z-band, same size), clear of the causeway (>1.5m
// from the crate's x=0.43 edge) and clear of both patrols (Orderly A stays
// west of x=-2; Orderly B's legs at x=2/5 don't reach z=-6/-5, his rectangle
// runs z -9 to -14) — same "static cover isn't quite enough" beat, just not
// sitting on the one line the crate has to travel.
const ISLAND_C: OrderlyAABB = { minX: 2, maxX: 4, minZ: -6, maxZ: -5 };
rb.block([2, 1.0, 1], [3, 0.5, -5.5], 'prop');
rb.solid(ISLAND_C.minX, ISLAND_C.maxX, ISLAND_C.minZ, ISLAND_C.maxZ);

// PLATE_1 / PLATE_2 — visual-only discs (no collider, matching room14's
// pressurePlate() — a plate stays walkable and never joins ORDERLY_COLLIDERS
// with zero special-casing). Trip condition is the crate's CENTER falling
// inside the trigger rect, polled in update() below (not the engine's
// player-only trigger poll — only the crate's weight counts here, unlike
// room14's "anyone's weight").
const PLATE_1 = pressurePlate({ id: 'plate1', minX: -0.5, maxX: 0.5, minZ: 0.5, maxZ: 1.5 });
rb.blocks.push(PLATE_1.block);
const PLATE_2 = pressurePlate({ id: 'plate2', minX: -0.5, maxX: 0.5, minZ: -15.5, maxZ: -14.5 });
rb.blocks.push(PLATE_2.block);

// The crate. Static-half: one InteractableDef (renders + is raycastable via
// world.ts's `default:` box branch) and one ColliderDef (rb.colliders, so
// it's solid) — both created once, mutated in place for the room's life.
const crateCollider: ColliderDef = {
  minX: REST_CELL.x - CRATE_HALF,
  maxX: REST_CELL.x + CRATE_HALF,
  minZ: REST_CELL.z - CRATE_HALF,
  maxZ: REST_CELL.z + CRATE_HALF,
};
rb.colliders.push(crateCollider);

// Orderly A: rectangle loop, clockwise. Danger leg (-5,-2)->(-2,-2), heading
// +x, forward vector straight down the causeway.
const WAYPOINTS_A = patrol(
  [
    { x: -5, z: -2 },
    { x: -2, z: -2 },
    { x: -2, z: -7 },
    { x: -5, z: -7 },
  ],
  rb.colliders,
);

// Orderly B: mirrored loop, further south. Danger leg (5,-9)->(2,-9), heading
// -x, same reasoning, opposite side.
const WAYPOINTS_B = patrol(
  [
    { x: 2, z: -9 },
    { x: 5, z: -9 },
    { x: 5, z: -14 },
    { x: 2, z: -14 },
  ],
  rb.colliders,
);

// Movement-blocking set: always-on colliders MINUS the crate, by identity —
// see the header note on why he must never collide with it (occluder yes,
// movement-collider no).
const ORDERLY_COLLIDERS: ColliderDef[] = rb.colliders.filter(
  (c) => c !== crateCollider && (c.states === undefined || c.states === 'both'),
);

export const room20: RoomDef = {
  id: 'room20',
  name: 'the Loading Bay',
  floor: { minX: -6, maxX: 6, minZ: -19, maxZ: 6 },
  spawn: { x: 0, z: 5, yaw: 0 },
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    scrawl(
      "it doesn't care what you are.\npush it and it moves. that's the whole trick.",
      'w',
      -6,
      2.5,
    ),
  ],
  interactables: [
    dispenser({ id: 'dispenser20', side: 'w', wallAt: -6, along: 4, label: 'use the dispenser' }),
    {
      id: 'gate1',
      type: 'door',
      size: [1, 3, 0.2],
      pos: GATE1_CLOSED_POS,
      mat: 'door',
      states: 'both',
      facing: 'pz',
      label: 'the gate',
    },
    {
      id: 'gate2',
      type: 'door',
      size: [1, 3, 0.2],
      pos: GATE2_CLOSED_POS,
      mat: 'door',
      states: 'both',
      facing: 'pz',
      label: 'the gate',
    },
    {
      id: 'crate',
      type: 'push_block',
      size: [0.86, 0.86, 0.86],
      pos: [REST_CELL.x, CRATE_HALF, REST_CELL.z],
      mat: 'prop',
      states: 'both',
      label: 'push the crate',
    },
  ],
  lights: [
    { pos: [0, 4] },
    { pos: [0, 0.5] },
    { pos: [-3, -3] },
    { pos: [3, -3] },
    { pos: [-3, -8] },
    { pos: [3, -8] },
    { pos: [0, -11] },
    { pos: [-3, -13] },
    { pos: [3, -13] },
    { pos: [0, -15.5] },
    { pos: [0, -17.5] },
  ],
  triggers: [PLATE_1.trigger, PLATE_2.trigger, { id: 'enterZ2', minX: -6, maxX: 6, minZ: -16, maxZ: 0 }, { id: 'vestibule20', minX: -6, maxX: 6, minZ: -19, maxZ: -16 }],
  exits: [{ to: 'END', minX: -1, maxX: 1, minZ: -19, maxZ: -18.9 }],
};

export type Room20Script = RoomScript & { onLeave?(ctx: GameCtx): void };

// Same bearing convention as every other orderly room's local copy.
function bearingTo(dx: number, dz: number, yaw: number): number {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const fwd = -dx * sin - dz * cos;
  const right = dx * cos - dz * sin;
  return Math.atan2(right, fwd);
}

export const room20Script: Room20Script = (() => {
  let orderlyA: Orderly | null = null;
  let orderlyB: Orderly | null = null;
  let sawUnmedToast = false;
  let sawPushFailToast = false;
  let sawEnterZ2 = false;
  let sawVestibule = false;

  let crateX = REST_CELL.x;
  let crateZ = REST_CELL.z;
  let gate1Open = false;
  let gate2Open = false;

  // Move tween — mirrors room13's setWallGap single-writer shape: the
  // collider already snapped to the destination the instant the push was
  // accepted; this only animates the mesh toward it.
  let tweenFrom: [number, number, number] | null = null;
  let tweenTo: [number, number, number] = [crateX, CRATE_HALF, crateZ];
  let tweenElapsed = 0;

  function setCrateCell(x: number, z: number): void {
    crateX = x;
    crateZ = z;
    crateCollider.minX = x - CRATE_HALF;
    crateCollider.maxX = x + CRATE_HALF;
    crateCollider.minZ = z - CRATE_HALF;
    crateCollider.maxZ = z + CRATE_HALF;
  }

  // Snap-reset: no tween, immediate — used for the catch re-rack ("they put
  // everything back where it belongs" — not a push, a confiscation).
  function resetCrate(ctx: GameCtx): void {
    tweenFrom = null;
    setCrateCell(REST_CELL.x, REST_CELL.z);
    ctx.moveInteractable('crate', [crateX, CRATE_HALF, crateZ]);
  }

  // Destination-cell overlap test: any active (state-filtered, crate's own
  // collider excluded by identity) room collider, or either orderly's
  // current body circle. Point-in-time only — pushes are discrete events,
  // not continuous physics (design doc §2c).
  function isPushBlocked(destX: number, destZ: number, state: 'lucid' | 'unmed'): boolean {
    const minX = destX - CRATE_HALF;
    const maxX = destX + CRATE_HALF;
    const minZ = destZ - CRATE_HALF;
    const maxZ = destZ + CRATE_HALF;
    for (const c of rb.colliders) {
      if (c === crateCollider) continue;
      const active = c.states === undefined || c.states === 'both' || c.states === state;
      if (!active) continue;
      if (minX < c.maxX && maxX > c.minX && minZ < c.maxZ && maxZ > c.minZ) return true;
    }
    for (const o of [orderlyA, orderlyB]) {
      if (!o) continue;
      const dx = Math.max(minX - o.x, 0, o.x - maxX);
      const dz = Math.max(minZ - o.z, 0, o.z - maxZ);
      if (Math.hypot(dx, dz) < TUNING.orderly.radius) return true;
    }
    return false;
  }

  function openGate1(ctx: GameCtx): void {
    if (gate1Open) return;
    gate1Open = true;
    gate1Collider.minX = 999;
    gate1Collider.maxX = 999.2;
    ctx.moveInteractable('gate1', GATE1_OPEN_POS, Math.PI / 2);
    ctx.hud.toast('it opens for the weight, not for you.');
    ctx.telemetry.event('gate_open', { gate: 1 });
  }

  function openGate2(ctx: GameCtx): void {
    if (gate2Open) return;
    gate2Open = true;
    gate2Collider.minX = 999;
    gate2Collider.maxX = 999.2;
    ctx.moveInteractable('gate2', GATE2_OPEN_POS, Math.PI / 2);
    ctx.hud.toast("it remembers this part. you taught it that, back at the start of everything.");
    ctx.telemetry.event('gate_open', { gate: 2 });
  }

  function spawnOrderlies(ctx: GameCtx): void {
    orderlyA?.dispose();
    orderlyB?.dispose();
    orderlyA = new Orderly(
      ctx.scene,
      WAYPOINTS_A,
      [crateCollider, ISLAND_C],
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
      [crateCollider, ISLAND_C],
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
      { colliders: ORDERLY_COLLIDERS, eyeTint: 0xffb347 }, // amber — two patrols in one space read as two enemies (room12/room13 precedent)
    );
    orderlyA.setWardState(ctx.state.state);
    orderlyB.setWardState(ctx.state.state);
  }

  function handleCaught(ctx: GameCtx): void {
    ctx.state.forceState('lucid');
    ctx.shiftFx();
    ctx.teleportPlayer(room20.spawn.x, room20.spawn.z);
    resetCrate(ctx);
    ctx.hud.toast("hands. a needle. and when you're back on your feet, it's already back on its shelf.");
    ctx.telemetry.event('orderly_caught');
  }

  const script: Room20Script = {
    onEnter(ctx) {
      spawnOrderlies(ctx);
      sawUnmedToast = false;
      sawPushFailToast = false;
      sawEnterZ2 = false;
      sawVestibule = false;
      gate1Open = false;
      gate2Open = false;
      gate1Collider.minX = -0.5;
      gate1Collider.maxX = 0.5;
      gate2Collider.minX = -0.5;
      gate2Collider.maxX = 0.5;
      resetCrate(ctx);
      ctx.hud.setObjective('one crate. three jobs. no second one if you lose it.');
    },

    isAvailable(id) {
      return id !== 'gate1' && id !== 'gate2';
    },

    onInteract(id, ctx) {
      if (id === 'gate1' || id === 'gate2') return true; // never directly interactable
      if (id !== 'crate') return false;

      const p = ctx.playerPos();
      const dx = crateX - p.x;
      const dz = crateZ - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist > PUSH_REACH_M) return true; // focused from too far to be "at its face" — silent no-op

      const stepX = Math.abs(dx) >= Math.abs(dz) ? Math.sign(dx) : 0;
      const stepZ = stepX === 0 ? Math.sign(dz) : 0;
      if (stepX === 0 && stepZ === 0) return true; // degenerate (player exactly on the crate's center)

      const destX = crateX + stepX * CELL_M;
      const destZ = crateZ + stepZ * CELL_M;
      if (isPushBlocked(destX, destZ, ctx.state.state)) {
        if (!sawPushFailToast) {
          sawPushFailToast = true;
          ctx.hud.toast("it doesn't go that way.");
        }
        ctx.telemetry.event('push_blocked');
        return true;
      }

      tweenFrom = [crateX, CRATE_HALF, crateZ];
      setCrateCell(destX, destZ);
      tweenTo = [crateX, CRATE_HALF, crateZ];
      tweenElapsed = 0;
      ctx.telemetry.event('push');
      return true;
    },

    onStateChange(next, ctx) {
      orderlyA?.setWardState(next);
      orderlyB?.setWardState(next);
      if (next === 'unmed' && !sawUnmedToast) {
        sawUnmedToast = true;
        ctx.hud.toast('two of them work this floor. neither one stops for the crate.');
      }
    },

    onTriggerEnter(id, ctx) {
      if (id === 'enterZ2' && !sawEnterZ2) {
        sawEnterZ2 = true;
        ctx.hud.setObjective("the last stretch. bring the thing that doesn't need to be told to be brave.");
      }
      if (id === 'vestibule20' && !sawVestibule) {
        sawVestibule = true;
        ctx.hud.setObjective('nothing left to carry. nothing left to push. just the door.');
      }
    },

    update(dt, _t, ctx) {
      if (tweenFrom) {
        tweenElapsed += dt;
        const t = Math.min(1, tweenElapsed / PUSH_TWEEN_SEC);
        const x = tweenFrom[0] + (tweenTo[0] - tweenFrom[0]) * t;
        const z = tweenFrom[2] + (tweenTo[2] - tweenFrom[2]) * t;
        ctx.moveInteractable('crate', [x, CRATE_HALF, z]);
        if (t >= 1) tweenFrom = null;
      }

      if (!gate1Open && inTrigger(PLATE_1.trigger, crateX, crateZ, ctx.state.state)) openGate1(ctx);
      if (!gate2Open && inTrigger(PLATE_2.trigger, crateX, crateZ, ctx.state.state)) openGate2(ctx);

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
        // Chase-priority bearing: chasing beats watching, higher watch-ramp
        // beats lower, nearer breaks ties — same aggregation room13 uses.
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
