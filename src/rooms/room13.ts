import * as THREE from 'three';
import { RoomBuilder, scrawl, patrol } from './kit';
import type { ColliderDef, RoomDef, RoomScript } from './kit';
import type { GameCtx } from '../game/context';
import { Orderly } from '../game/orderly';
import { TUNING } from '../tuning';
import type { DebugPatrol } from '../devtools/map-types';

// ROOM 13 — the Last Ward. The epilogue, and the one room in the game where
// LUCID is not safe (see docs/superpowers/specs/2026-07-15-room13-lucid-
// danger-design.md). Everywhere else "lucid is always safe" (game/orderly.ts
// header) is load-bearing; here, and only here, the corridor itself turns on
// the calm: while the player is lucid inside the squeeze stretch, two
// full-height wall slabs drift inward and NEVER retract — every lucid dip
// costs width the attempt doesn't get back. Unmed halts them but hands the
// corridor to the orderly. Neither state carries the whole crossing; that
// trade is the room.
//
// Three zones, south to north:
//   Z1 the entry hall      z [16, 22] — spawn, safe, deliberately NO
//                          dispenser: you cross with whatever you saved.
//   the squeeze stretch    z [-24, 16] — the moving slabs + the orderly.
//   Z3 the exit vestibule  z [-30, -24] — safe, no lock, no code; the open
//                          doorway at z=-30 exits to the next room (the
//                          wing beyond, room14).
//
// THE WALLS: two room-owned meshes + two mutable ColliderDefs (room 3's
// collider-mutation trick). Colliders give correct approach/sliding
// (including the funnel from the 8m-wide hall into the 5m gap); the
// per-frame clamp in update() resolves the one case colliders can't — the
// wall closing ONTO a player hugging it (tryMove blocks all movement once
// the current position penetrates an AABB, so without the clamp they'd
// freeze inside the slab). The orderly's collider set excludes both moving
// colliders BY IDENTITY: the standard states-filter returns the same object
// references, and a mutated collider would wedge him with no clamp to save
// him. Cosmetic consequence, accepted: below a ~3m gap the slabs pass his
// x=±1.5 lanes and his body can poke through them.
//
// EVASION (playtest: "an unmed player can walk the raw corridor start to
// finish without ever shifting" — the old thesis here, a provable far-side
// pass at the base 6m/55° cone, is now deliberately dead; see
// TUNING.lastWard's orderlySightRangeM/orderlyConeDeg comment for the trig).
// The room's contract is forced alternation: no single state carries the
// whole 40m crossing.
//
//   UNMED cannot pass a head-on orderly anywhere across the corridor's full
//   width, including hugging a wall — TUNING.lastWard's sight comment shows
//   the two-condition proof (cone reaches the worst-case far-wall lateral
//   offset within range, and the in-cone window at worst-case closing speed
//   clears graceSec with margin). There is no longer a lane you can hug to
//   stay unwatched through a pass.
//
//   LUCID cannot carry the full stretch either: the 8s total lucid budget
//   ((startGapM-minGapM)/(2*closePerSideMps), see TUNING.lastWard) is well
//   under the ~12s a straight lucid walk of the 40m stretch would take at
//   player speed 3.4 — "shift once and coast" was already dead before this
//   pass; two patrols now also means a lucid player still has to time BOTH
//   orderlies' positions while picking when to dip, not just one.
//
//   Two orderlies, half a lap apart (WAYPOINTS_B is WAYPOINTS_A rotated by
//   2 — a quarter of the array, which is half the rectangle's perimeter at
//   matched speed, so they never close the gap or collide): whichever end
//   of the corridor a run starts from, a patrol is always roughly mid-
//   stretch, forcing at least one unmed-to-lucid-or-back shift partway
//   through instead of a single clean state pick at the mouth.
//
// THE 0-PILL CASE, honestly: this is a pressure loop, not a soft-lock —
// nothing is unmed-sealed, so the escape always exists. With zero pills
// saved, lucidity only ever comes from the catch/crush reset itself (both
// force LUCID at MOUTH with the walls reset full-width, see handleCaught/
// handleCrushed below), so a 0-pill attempt is: lucid dash from the reset →
// free shift down to unmed once the walls' bite isn't worth it → walk the
// unmed stretch under the now-real orderly threat → if cornered, the catch
// resets you lucid with fresh walls and you're back at the top of the loop.
// Nothing dead-ends; it's retries, not a wall.
//
// THE TRAILING CASE: following behind a receding orderly (his back to you,
// well outside his cone) works fine right up until he reaches a lane end
// and pauses to turn — with the wide cone now covering the full width, that
// turn is lethal at range the old narrow cone never reached, so the player
// has to plan around the pause-and-turn instead of tailgating blind. With
// two patrols half a lap apart there is usually a second orderly coming the
// other way while the first is turning, so "wait for him to turn away" isn't
// a universal answer either.
//
// SOFT-LOCK AUDIT: no unmed-sealed colliders anywhere in the room, so the
// medication timer's revert can never be geometry-blocked and a raw player
// is never stranded — the slabs exist in both states, and at rest (not
// actively closing) they always leave a >=minGapM walkable gap. Crush AND
// Catch both force LUCID, teleport to the corridor mouth (OUTSIDE the
// stretch, so the walls hold instead of closing while you reorient),
// full-width reset, pills kept — neither penalty hands the player the
// passing state. From the mouth a lucid player either shifts unmed for
// free (no dispenser needed, none is provided) or lets the medication
// timer wear the pill off into unmed on its own; either way nothing in the
// room can strand them mid-decision. Both penalties restart the attempt;
// neither can dead-end it — see THE 0-PILL CASE above for what that reset
// loop actually looks like end to end.

const W = TUNING.lastWard;
const SHELL_X = 4; // perimeter walls at ±4
const SQUEEZE_MIN_Z = -24;
const SQUEEZE_MAX_Z = 16;
const SQUEEZE_LEN = SQUEEZE_MAX_Z - SQUEEZE_MIN_Z;
const SQUEEZE_MID_Z = (SQUEEZE_MIN_Z + SQUEEZE_MAX_Z) / 2;
const MOUTH = { x: 0, z: 18 }; // attempt-reset teleport target, just south of the stretch, outside it

const rb = new RoomBuilder();

// Z1 — the entry hall. x [-4,4] z [16,22].
rb.wallX(-SHELL_X, SHELL_X, 22); // south cap, behind spawn
rb.wallZ(-32, 22, -SHELL_X); // west perimeter, full length
rb.wallZ(-32, 22, SHELL_X); // east perimeter, full length

// Z3 — the exit vestibule. North cap with the final open doorway.
rb.wallX(-SHELL_X, -1, -30);
rb.wallX(1, SHELL_X, -30);
rb.wallZ(-32, -30, -1);
rb.wallZ(-32, -30, 1);
rb.wallX(-1, 1, -32);
rb.block([1.8, 2.6, 0.06], [0, 1.4, -31.8], 'glow'); // the way out

// The moving walls — colliders only here; the meshes are room-owned (built
// in onEnter, updated per frame, disposed in onLeave) because World.loadRoom
// bakes RoomDef.blocks into static geometry once. Initial bounds match
// startGapM; setWallGap() below is the single writer for both colliders and
// both meshes.
const wallEastCollider: ColliderDef = {
  minX: W.startGapM / 2,
  maxX: SHELL_X,
  minZ: SQUEEZE_MIN_Z,
  maxZ: SQUEEZE_MAX_Z,
};
const wallWestCollider: ColliderDef = {
  minX: -SHELL_X,
  maxX: -W.startGapM / 2,
  minZ: SQUEEZE_MIN_Z,
  maxZ: SQUEEZE_MAX_Z,
};
rb.colliders.push(wallEastCollider, wallWestCollider);

// Orderly colliders: always-on set MINUS the two moving walls, by identity —
// see the header note on why he must never collide with them.
const ORDERLY_COLLIDERS: ColliderDef[] = rb.colliders.filter(
  (c) =>
    c !== wallEastCollider &&
    c !== wallWestCollider &&
    (c.states === undefined || c.states === 'both'),
);

export const room13: RoomDef = {
  id: 'room13',
  name: 'the Last Ward',
  floor: { minX: -SHELL_X, maxX: SHELL_X, minZ: -32, maxZ: 22 },
  spawn: { x: 0, z: 20, yaw: 0 },
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    scrawl('the last hallway.\nnothing left to take.', 'w', -SHELL_X, 19, { size: 2.6 }),
    scrawl('the calm makes it smaller.\nthe raw makes it watched.', 'e', SHELL_X, 19, { size: 2.8, big: true }),
    scrawl('it lets you out.\nit just wanted to see you choose.', 'w', -SHELL_X, -27, { size: 2.4 }),
  ],
  interactables: [],
  lights: [
    { pos: [0, 20] },
    { pos: [0, 16] },
    { pos: [0, 10] },
    { pos: [0, 4] },
    { pos: [0, -2] },
    { pos: [0, -8] },
    { pos: [0, -14] },
    { pos: [0, -20] },
    { pos: [0, -24] },
    { pos: [0, -26] },
    { pos: [0, -29] },
  ],
  exits: [{ to: 'room14', minX: -1, maxX: 1, minZ: -31.9, maxZ: -30.8 }],
};

// Rectangle loop, starting (waypoints[0]) at the south end of the east
// lane: northbound on the east lane straight at anyone entering from
// spawn, cross at the north end, southbound on the west lane back down,
// cross at the south end — see the EVASION header note for the cone math
// this shape guarantees.
const WAYPOINTS_A = patrol(
  [
    { x: 1.5, z: -22 },
    { x: 1.5, z: 14 },
    { x: -1.5, z: 14 },
    { x: -1.5, z: -22 },
  ],
  rb.colliders,
);

// Second orderly, same rectangle, same speed and pauses — WAYPOINTS_A
// rotated by 2 (half the 4-waypoint cycle, i.e. half the rectangle's
// perimeter). Orderly starts at waypoints[0], so the rotation IS the phase
// offset: he spawns at the diagonally opposite corner walking the same
// circulation direction, and the two stay exactly half a lap apart forever
// — one is always roughly mid-stretch while the other is at an end. See the
// EVASION header for why that half-lap offset is the point.
const WAYPOINTS_B = patrol(
  [
    { x: -1.5, z: 14 },
    { x: -1.5, z: -22 },
    { x: 1.5, z: -22 },
    { x: 1.5, z: 14 },
  ],
  rb.colliders,
);

export type Room13Script = RoomScript & { onLeave?(ctx: GameCtx): void };

// Bearing from the player to a point, relative to the player's look yaw —
// same convention as every other orderly room's copy.
function bearingTo(dx: number, dz: number, yaw: number): number {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const fwd = -dx * sin - dz * cos;
  const right = dx * cos - dz * sin;
  return Math.atan2(right, fwd);
}

export const room13Script: Room13Script = (() => {
  let orderlyA: Orderly | null = null;
  let orderlyB: Orderly | null = null;
  let sawUnmedToast = false;
  let sawClosingToast = false;
  // 0 = none shown, 1 = warn shown, 2 = tight shown — thresholds fire once
  // per attempt, reset with the walls.
  let toastStage = 0;

  let halfGap = W.startGapM / 2;
  let wallEastMesh: THREE.Mesh | null = null;
  let wallWestMesh: THREE.Mesh | null = null;
  let wallMat: THREE.MeshStandardMaterial | null = null;

  // Single writer for the wall system: colliders and meshes always move in
  // lockstep. Meshes are unit-width boxes scaled so the inner face lands
  // exactly on ±halfGap and the mass runs to the perimeter — the wall reads
  // as solid rock, not a thin drifting panel.
  function setWallGap(nextHalfGap: number): void {
    halfGap = nextHalfGap;
    wallEastCollider.minX = halfGap;
    wallWestCollider.maxX = -halfGap;
    const thickness = SHELL_X - halfGap;
    const centerX = halfGap + thickness / 2;
    if (wallEastMesh) {
      wallEastMesh.scale.x = thickness;
      wallEastMesh.position.x = centerX;
    }
    if (wallWestMesh) {
      wallWestMesh.scale.x = thickness;
      wallWestMesh.position.x = -centerX;
    }
  }

  function resetAttempt(): void {
    toastStage = 0;
    sawClosingToast = false;
    setWallGap(W.startGapM / 2);
  }

  function buildWalls(ctx: GameCtx): void {
    wallMat = new THREE.MeshStandardMaterial({ color: 0x777d78, roughness: 0.95, metalness: 0 });
    const geo = new THREE.BoxGeometry(1, 3, SQUEEZE_LEN);
    wallEastMesh = new THREE.Mesh(geo, wallMat);
    wallWestMesh = new THREE.Mesh(geo, wallMat);
    wallEastMesh.position.set(0, 1.5, SQUEEZE_MID_Z);
    wallWestMesh.position.set(0, 1.5, SQUEEZE_MID_Z);
    ctx.scene.add(wallEastMesh);
    ctx.scene.add(wallWestMesh);
  }

  function disposeWalls(ctx: GameCtx): void {
    for (const m of [wallEastMesh, wallWestMesh]) {
      if (!m) continue;
      ctx.scene.remove(m);
    }
    // Both meshes share one BoxGeometry (and one material) — dispose each
    // exactly once, not per mesh.
    wallEastMesh?.geometry.dispose();
    wallMat?.dispose();
    wallEastMesh = null;
    wallWestMesh = null;
    wallMat = null;
  }

  function handleCaught(ctx: GameCtx): void {
    ctx.state.forceState('lucid');
    ctx.shiftFx();
    ctx.teleportPlayer(MOUTH.x, MOUTH.z);
    resetAttempt();
    ctx.hud.toast('hands. a needle. "there was never a safe way," he says.');
    ctx.telemetry.event('orderly_caught');
  }

  function handleCrushed(ctx: GameCtx): void {
    ctx.state.forceState('lucid');
    ctx.shiftFx();
    ctx.teleportPlayer(MOUTH.x, MOUTH.z);
    resetAttempt();
    ctx.hud.toast('the corridor closes like a throat. it starts you over, calm.');
    ctx.telemetry.event('wall_crushed');
  }

  function spawnOrderlies(ctx: GameCtx): void {
    orderlyA?.dispose();
    orderlyB?.dispose();
    orderlyA = new Orderly(
      ctx.scene,
      WAYPOINTS_A,
      [],
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
      {
        colliders: ORDERLY_COLLIDERS,
        sightRange: W.orderlySightRangeM,
        coneDeg: W.orderlyConeDeg,
      },
    );
    orderlyB = new Orderly(
      ctx.scene,
      WAYPOINTS_B,
      [],
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
      {
        colliders: ORDERLY_COLLIDERS,
        sightRange: W.orderlySightRangeM,
        coneDeg: W.orderlyConeDeg,
        eyeTint: 0xffb347, // amber — room12 day-hall precedent, so two patrols in one space read as two enemies
      },
    );
    orderlyA.setWardState(ctx.state.state);
    orderlyB.setWardState(ctx.state.state);
  }

  const script: Room13Script = {
    onEnter(ctx) {
      spawnOrderlies(ctx);
      buildWalls(ctx);
      resetAttempt();
      sawUnmedToast = false;
      // Arrive lucid — free, refills the meter, costs no pill — so the room
      // never hands the player which state is the one that survives the
      // stretch; that's theirs to find out. Same forced-entry pattern as
      // room11/room12's onEnter, just the other state.
      ctx.state.forceState('lucid');
      ctx.shiftFx();
      ctx.hud.toast("you're calm. it decided that for you.");
      ctx.hud.setObjective(
        'the last ward. one corridor between you and out. neither state will carry you the whole way.',
      );
    },

    onStateChange(next, ctx) {
      orderlyA?.setWardState(next);
      orderlyB?.setWardState(next);
      if (next === 'unmed' && !sawUnmedToast) {
        sawUnmedToast = true;
        ctx.hud.toast('two of them keep it. they never rest at the same end.');
      }
    },

    update(dt, _t, ctx) {
      const p = ctx.playerPos();
      const inStretch = p.z > SQUEEZE_MIN_Z && p.z < SQUEEZE_MAX_Z;

      // The hazard: lucid inside the stretch narrows the corridor. Unmed —
      // or standing outside the stretch — holds it exactly where it is.
      if (inStretch && ctx.state.state === 'lucid') {
        if (!sawClosingToast) {
          sawClosingToast = true;
          ctx.hud.toast("the walls heard the calm. they're coming to meet it.");
          ctx.telemetry.event('walls_closing');
        }
        setWallGap(Math.max(W.minGapM / 2, halfGap - W.closePerSideMps * dt));
        const gap = halfGap * 2;
        // Chained, most severe first, so a large dt spike fires exactly one
        // of these per frame instead of stacking toasts before the crush.
        if (gap <= W.minGapM) {
          handleCrushed(ctx);
          return;
        } else if (toastStage < 2 && gap <= W.tightGapM) {
          toastStage = 2;
          ctx.hud.toast('it will not fit you much longer.');
        } else if (toastStage < 1 && gap <= W.warnGapM) {
          toastStage = 1;
          ctx.hud.toast('narrower than it was. it remembers.');
        }
      }

      // Penetration clamp — the one case the colliders can't resolve is the
      // wall closing onto a player hugging it (tryMove freezes a body whose
      // current position is inside an AABB). Runs in both states so a held
      // wall can never trap someone either.
      if (inStretch) {
        const maxX = halfGap - TUNING.player.radius;
        if (p.x > maxX) {
          ctx.teleportPlayer(maxX, p.z);
          p.x = maxX;
        } else if (p.x < -maxX) {
          ctx.teleportPlayer(-maxX, p.z);
          p.x = -maxX;
        }
      }

      if (!orderlyA || !orderlyB) return;
      orderlyA.update(dt, p.x, p.z, ctx.state.state);
      orderlyB.update(dt, p.x, p.z, ctx.state.state);

      const distA = Math.hypot(orderlyA.x - p.x, orderlyA.z - p.z);
      const distB = Math.hypot(orderlyB.x - p.x, orderlyB.z - p.z);
      const chasing = orderlyA.chasing || orderlyB.chasing;
      const level = Math.max(orderlyA.watching, orderlyB.watching);
      const dist = Math.min(distA, distB);

      if (level > 0 || chasing) {
        // Chase-priority bearing: chasing beats watching, higher watch-ramp
        // beats lower, nearer breaks ties — same aggregation as room11's
        // two-orderly pair.
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
      disposeWalls(ctx);
    },
  };

  return script;
})();

export const debugPatrols: DebugPatrol[] = [
  { waypoints: WAYPOINTS_A, label: 'A', sightRange: W.orderlySightRangeM },
  { waypoints: WAYPOINTS_B, label: 'B', sightRange: W.orderlySightRangeM },
];
