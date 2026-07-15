import * as THREE from 'three';
import { RoomBuilder, scrawl, patrol } from './kit';
import type { ColliderDef, RoomDef, RoomScript } from './kit';
import type { GameCtx } from '../game/context';
import { Orderly } from '../game/orderly';
import { TUNING } from '../tuning';

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
//   the squeeze stretch    z [-16, 16] — the moving slabs + the orderly.
//   Z3 the exit vestibule  z [-22, -16] — safe, no lock, no code; the open
//                          doorway at z=-22 is the end of the game.
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
// EVASION (the 0-pill run must be provable, not just plausible): his loop
// is a rectangle, lanes x=±1.5 z[-14,14] — southbound only on the east
// lane, northbound only on the west. A player hugging the far side (|x|=3)
// sits 4.5m off his active lane: at his max range 6m that bearing is
// atan(4.5/6)=36.9° > 27.5° (half of TUNING.orderly.coneDeg), and bearing
// only grows as he nears — outside the cone at every distance in range. The
// only exposure is within ~6m of a cross leg (z=±14) while he walks it;
// both are at the stretch's far ends, visible from >6m up a straight
// corridor, so the wait is informed. COUPLING, intended: lucid spending
// shrinks max |x|; below a ~4m gap the far-side hug stops clearing the cone
// by geometry (need (halfGap-0.35)+1.5 > 6*tan(27.5°)=3.12m, i.e. halfGap >
// 1.97) and passing degrades to loop-timing. Spending calm eats the raw
// run's safety margin. That's the thesis.
//
// SOFT-LOCK AUDIT: no unmed-sealed colliders anywhere in the room, so the
// medication timer's revert can never be geometry-blocked and a raw player
// is never stranded — the slabs exist in both states and unmed only ever
// halts them. Crush → forced unmed (the always-safe default), teleport to
// the corridor mouth, full-width reset, pills kept. Catch → forced lucid,
// same teleport (the mouth is OUTSIDE the stretch, so walls don't close
// while you collect yourself), same full-width reset, pills kept. Both
// penalties restart the attempt; neither can dead-end it. No dispenser is
// needed and none is provided — that is the room's design, not a gap.

const W = TUNING.lastWard;
const SHELL_X = 4; // perimeter walls at ±4
const SQUEEZE_MIN_Z = -16;
const SQUEEZE_MAX_Z = 16;
const SQUEEZE_LEN = SQUEEZE_MAX_Z - SQUEEZE_MIN_Z;
const SQUEEZE_MID_Z = (SQUEEZE_MIN_Z + SQUEEZE_MAX_Z) / 2;
const MOUTH = { x: 0, z: 18 }; // attempt-reset teleport target, just south of the stretch, outside it

const rb = new RoomBuilder();

// Z1 — the entry hall. x [-4,4] z [16,22].
rb.wallX(-SHELL_X, SHELL_X, 22); // south cap, behind spawn
rb.wallZ(-24, 22, -SHELL_X); // west perimeter, full length
rb.wallZ(-24, 22, SHELL_X); // east perimeter, full length

// Z3 — the exit vestibule. North cap with the final open doorway.
rb.wallX(-SHELL_X, -1, -22);
rb.wallX(1, SHELL_X, -22);
rb.wallZ(-24, -22, -1);
rb.wallZ(-24, -22, 1);
rb.wallX(-1, 1, -24);
rb.block([1.8, 2.6, 0.06], [0, 1.4, -23.8], 'glow'); // the way out

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
  floor: { minX: -SHELL_X, maxX: SHELL_X, minZ: -24, maxZ: 22 },
  spawn: { x: 0, z: 20, yaw: 0 },
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    scrawl('the last hallway.\nnothing left to take.', 'w', -SHELL_X, 19, { size: 2.6 }),
    scrawl('the calm makes it smaller.\nthe raw makes it watched.', 'e', SHELL_X, 19, { size: 2.8, big: true }),
    scrawl('it lets you out.\nit just wanted to see you choose.', 'w', -SHELL_X, -19, { size: 2.4 }),
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
    { pos: [0, -18] },
    { pos: [0, -21] },
  ],
  exits: [{ to: 'END', minX: -1, maxX: 1, minZ: -23.9, maxZ: -22.8 }],
};

// Rectangle loop: southbound on the east lane, cross, northbound on the
// west lane, cross — see the EVASION header note for the cone math this
// shape guarantees.
const WAYPOINTS = patrol(
  [
    { x: 1.5, z: 14 },
    { x: 1.5, z: -14 },
    { x: -1.5, z: -14 },
    { x: -1.5, z: 14 },
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
  let orderly: Orderly | null = null;
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
    ctx.state.forceState('unmed');
    ctx.shiftFx();
    ctx.teleportPlayer(MOUTH.x, MOUTH.z);
    resetAttempt();
    ctx.hud.toast('the corridor closes like a throat. somewhere, you are put back.');
    ctx.telemetry.event('wall_crushed');
  }

  function spawnOrderly(ctx: GameCtx): void {
    orderly?.dispose();
    orderly = new Orderly(
      ctx.scene,
      WAYPOINTS,
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
      { colliders: ORDERLY_COLLIDERS },
    );
    orderly.setWardState(ctx.state.state);
  }

  const script: Room13Script = {
    onEnter(ctx) {
      spawnOrderly(ctx);
      buildWalls(ctx);
      resetAttempt();
      sawUnmedToast = false;
      ctx.hud.setObjective(
        'the last ward. one corridor between you and out. neither state will carry you the whole way.',
      );
    },

    onStateChange(next, ctx) {
      orderly?.setWardState(next);
      if (next === 'unmed' && !sawUnmedToast) {
        sawUnmedToast = true;
        ctx.hud.toast('he keeps the middle of it.');
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

      if (!orderly) return;
      orderly.update(dt, p.x, p.z, ctx.state.state);
      const dist = Math.hypot(orderly.x - p.x, orderly.z - p.z);
      if (orderly.watching > 0 || orderly.chasing) {
        const bearing = bearingTo(orderly.x - p.x, orderly.z - p.z, p.yaw);
        ctx.hud.setThreat(orderly.chasing ? 1 : orderly.watching, bearing);
      } else {
        ctx.hud.setThreat(0, null);
      }
      ctx.audio.setThreat(orderly.watching, dist, orderly.chasing);
    },

    onLeave(ctx) {
      ctx.hud.setThreat(0, null);
      ctx.audio.setThreat(0, Infinity, false);
      orderly?.dispose();
      orderly = null;
      disposeWalls(ctx);
    },
  };

  return script;
})();
