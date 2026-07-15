# Room 13 "the Last Ward" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the epilogue room 13 per `docs/superpowers/specs/2026-07-15-room13-lucid-danger-design.md`: one corridor where unmed means an orderly and lucid means the walls close in, cumulatively, with no dispenser anywhere in the room.

**Architecture:** One new room file (`src/rooms/room13.ts`) built with the existing kit; the closing walls are a pair of room-owned `THREE.Mesh` slabs plus two mutable `ColliderDef`s (room 3's collider-mutation trick), driven from the room script's per-frame `update`. `Orderly` is reused unmodified. Wiring: room 12's exit retargets to room13, main.ts registers the room and gets a new end-of-build card.

**Tech Stack:** TypeScript, three.js, the repo's own rooms kit (`src/rooms/kit.ts`). No test framework exists in this repo — verification is `npx tsc --noEmit`, `npm run build` (which also runs the kit's import-time `patrol()` validation), and a scripted manual smoke.

---

## Design notes the implementer must understand first

Read these files before starting: `src/rooms/room11.ts` (hand-written orderly script pattern), `src/rooms/kit.ts` (RoomBuilder/scrawl/patrol helpers), `src/engine/collision.ts` (tryMove), `src/game/state.ts`, `src/main.ts`.

**Why the walls need BOTH mutable colliders AND a per-frame player clamp.**
`tryMove` (src/engine/collision.ts) blocks a *proposed move* into a collider — that gives correct approach/sliding behavior when the player walks toward a wall. But when a collider expands *onto* a stationary player, the player's current position penetrates the AABB and every proposed move on both axes then fails — they'd freeze inside the wall. So: the two moving colliders handle walking/sliding (including the natural funnel effect when entering the squeeze stretch from the wide entry hall), and a per-frame clamp in the room script (`ctx.teleportPlayer` with a corrected x) resolves the closing-onto-you case. The clamp runs every frame, so penetration never exceeds one frame's closure (~0.01m) — invisible in play.

**Why the orderly must NOT collide with the moving walls.**
Every orderly room passes `rb.colliders.filter(states-both)` to its Orderly. That filter returns a new array holding the SAME collider object references, so a mutated moving-wall collider would also squeeze the orderly — and `tryMove` would wedge him inside it (the freeze described above, with no clamp to save him). Room 13 therefore filters the two moving colliders out of `ORDERLY_COLLIDERS` **by identity**. Cosmetic consequence, accepted in the spec discussion: at extreme narrowing his body can poke through the wall visuals. He patrols lanes at x=±1.5; walls only pass those lanes when the gap is below 3m, which only happens late in a heavy-lucid attempt.

**The evasion math (documented in the room header, verified by the geometry below).**
Orderly sight: range 6m, cone 55° total (±27.5°), from `TUNING.orderly`. His patrol is a rectangle loop with long lanes at x=±1.5: southbound only ever on the east lane, northbound only on the west lane, cross legs at z=±14. A player hugging the far side (|x|=3.0) is laterally 4.5m off his active lane; at his max sight range 6m that's a bearing of atan(4.5/6)=36.9° > 27.5° — outside the cone at every distance within range (bearing only grows as range shrinks). So the 0-pill run (walls never move, full width available) has a provable pass: keep to whichever lane he isn't walking. The only exposure is within ~6m of a cross leg while he walks it (his cone sweeps the corridor width there); both cross legs are at the stretch's far ends and he's visible unmed from well past 6m in a straight corridor, so the wait is always informed. **Coupling (intended, document it):** each second of lucid narrows the gap and shrinks the player's max |x|; below a ~4m gap the far-side hug no longer clears the cone by geometry alone and passing degrades to loop-timing. Spending calm eats the unmed run's safety margin — that's the room's thesis, not a bug.

**Soft-lock audit (goes in the room header).** Room 13 has zero unmed-sealed colliders, so the medication timer's geometry-trap guard (`circleHitsSolidUnmed`) never fires and a raw revert can never strand the player — unmed is walkable everywhere at all times (the moving walls exist in both states). Crush forces unmed (the always-safe default) and resets the walls; catch forces lucid, teleports outside the squeeze stretch (walls don't close there), and also resets the walls. No dispenser is needed and none is provided — that's the room's design, not an oversight.

**Layout (all coordinates final):**

```
x: perimeter walls at ±4 (8m shell). z: +22 (south cap, behind spawn) to -24.
Z1 entry hall      z [16, 22]   spawn (0, 20, yaw 0 — facing -z). Safe. NO dispenser.
squeeze stretch    z [-16, 16]  32m. Moving wall slabs live here, initial inner
                                faces at x=±2.5 (5m gap). Orderly loop inside it.
Z3 exit vestibule  z [-22, -16] safe, open doorway at the north cap (z=-22),
                                glow vestibule z [-24, -22], exit to END.
```

---

### Task 1: Tuning block

**Files:**
- Modify: `src/tuning.ts`

- [ ] **Step 1: Add the `lastWard` group to TUNING**

Insert after the `medication` group (keep the file's comment style):

```ts
  lastWard: {
    // Room 13's closing walls. The corridor's walkable gap starts at
    // startGapM and, while the player is lucid inside the squeeze stretch,
    // narrows at closePerSideMps per side (2x combined). It never widens
    // until the attempt resets. Reaching minGapM while lucid in the stretch
    // is a crush: forced unmed + teleport to the corridor mouth + full-width
    // reset, pills kept. Budget check: (5.0-1.0)/(2*0.25) = 8s of total
    // lucid per attempt — deliberately less than the ~11.8s a straight
    // lucid walk of the 32m stretch + approach would need at player speed
    // 3.4, so "shift once and coast" cannot clear it.
    startGapM: 5.0,
    minGapM: 1.0, // player diameter 0.7 + 0.3 buffer
    closePerSideMps: 0.25,
    // one-time warning toast thresholds (gap width, m)
    warnGapM: 3.5,
    tightGapM: 2.0,
  },
```

- [ ] **Step 2: Typecheck**

Run: `cd "/Users/clanker/Developer/Ward B" && npx tsc --noEmit`
Expected: clean (no output).

- [ ] **Step 3: Commit**

```bash
git add src/tuning.ts
git commit -m "Room 13 tuning: closing-wall speeds and widths"
```

---

### Task 2: The room file

**Files:**
- Create: `src/rooms/room13.ts`

- [ ] **Step 1: Write `src/rooms/room13.ts` in full**

```ts
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
const MOUTH = { x: 0, z: 18 }; // attempt-reset teleport target, just north of the stretch

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
    wallWestMesh = new THREE.Mesh(geo.clone(), wallMat);
    wallEastMesh.position.set(0, 1.5, SQUEEZE_MID_Z);
    wallWestMesh.position.set(0, 1.5, SQUEEZE_MID_Z);
    ctx.scene.add(wallEastMesh);
    ctx.scene.add(wallWestMesh);
  }

  function disposeWalls(ctx: GameCtx): void {
    for (const m of [wallEastMesh, wallWestMesh]) {
      if (!m) continue;
      ctx.scene.remove(m);
      m.geometry.dispose();
    }
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
        if (toastStage < 1 && gap <= W.warnGapM) {
          toastStage = 1;
          ctx.hud.toast('narrower than it was. it remembers.');
        }
        if (toastStage < 2 && gap <= W.tightGapM) {
          toastStage = 2;
          ctx.hud.toast('it will not fit you much longer.');
        }
        if (gap <= W.minGapM) {
          handleCrushed(ctx);
          return;
        }
      }

      // Penetration clamp — the one case the colliders can't resolve is the
      // wall closing onto a player hugging it (tryMove freezes a body whose
      // current position is inside an AABB). Runs in both states so a held
      // wall can never trap someone either.
      if (inStretch) {
        const maxX = halfGap - TUNING.player.radius;
        if (p.x > maxX) ctx.teleportPlayer(maxX, p.z);
        else if (p.x < -maxX) ctx.teleportPlayer(-maxX, p.z);
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
```

- [ ] **Step 2: Typecheck (this also runs patrol() validation at the next import — but nothing imports room13 yet, so only the types are checked here)**

Run: `cd "/Users/clanker/Developer/Ward B" && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/rooms/room13.ts
git commit -m "Room 13: the Last Ward — closing walls vs the orderly"
```

---

### Task 3: Wiring — room 12 exit, rooms map

**Files:**
- Modify: `src/rooms/room12.ts` (the `exits` line, near the end of the RoomDef)
- Modify: `src/main.ts:16-48` (imports + rooms map)

- [ ] **Step 1: Retarget room 12's exit**

In `src/rooms/room12.ts` find:

```ts
  exits: [{ to: 'END', minX: -1, maxX: 1, minZ: -27.9, maxZ: -26.8 }],
```

Replace with:

```ts
  exits: [{ to: 'room13', minX: -1, maxX: 1, minZ: -27.9, maxZ: -26.8 }],
```

- [ ] **Step 2: Register room 13 in main.ts**

Add to the import block (after the room12 import):

```ts
import { room13, room13Script } from './rooms/room13';
```

Add to the `rooms` map (after the room12 entry):

```ts
  room13: { def: room13, script: room13Script },
```

- [ ] **Step 3: Typecheck + build (build now imports room13, so patrol() validates the loop at module init — a throw here means a waypoint clearance bug)**

Run: `cd "/Users/clanker/Developer/Ward B" && npx tsc --noEmit && npm run build`
Expected: both clean; vite reports 33 modules transformed (was 32).

- [ ] **Step 4: Commit**

```bash
git add src/rooms/room12.ts src/main.ts
git commit -m "Wire room 13 after room 12"
```

---

### Task 4: End-of-build card — playtest 9 questions

**Files:**
- Modify: `src/main.ts` (the `endOfBuild` function)

- [ ] **Step 1: Replace the end card content**

In `endOfBuild()` replace the `hud.showEndCard(...)` call with:

```ts
  hud.showEndCard(
    'END OF MILESTONE 8',
    'NEITHER STATE WAS SAFE.',
    `<em>PLAYTEST — tell the devs:</em><br><br>
     1 · Room 13: did you actually alternate states under pressure, or did one state carry you through — and if so, which?<br>
     2 · The walls never give back what they take. Did that change how you rationed lucid, or did it just feel punishing?<br>
     3 · No dispenser in room 13 — you crossed with whatever you saved. Did the earlier rooms' spending suddenly matter?<br>
     4 · Rooms 11 and 12 again, now with nothing to refill on between the gates — did carrying two pills finally feel like a plan you had to make?<br>
     5 · Touching an orderly now always catches you, not just when he's chasing. Fair, or did it ever feel cheap?<br>
     6 · You ended with ${state.pills}/${state.maxPills} pills. Was there a moment you counted them before committing to something?`,
    'READMIT',
    () => location.reload(),
  );
```

- [ ] **Step 2: Typecheck**

Run: `cd "/Users/clanker/Developer/Ward B" && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "End card: milestone 8 playtest questions"
```

---

### Task 5: Manual smoke test

**Files:**
- Temporarily modify (then revert): `src/main.ts:237` (`loadRoom('room1')`)

- [ ] **Step 1: Point the boot room at room13 with test pills**

In `src/main.ts`, change the initial-presentation block (currently `loadRoom('room1');`) to:

```ts
// TEMP SMOKE TEST — revert before committing
state.canShift = true;
state.maxPills = 2;
state.pills = 2;
loadRoom('room13');
```

- [ ] **Step 2: Run the dev server and verify each behavior**

Run: `cd "/Users/clanker/Developer/Ward B" && npm run dev` and open the printed URL. Verify, in order:

1. HUD shows "THE LAST WARD" top-right; objective text mentions the corridor.
2. Unmed at spawn: the orderly is visible patrolling his loop; the two grey slabs form a 5m corridor ahead.
3. Walk into the stretch unmed: walls do not move.
4. Shift lucid (Q) inside the stretch: "the walls heard the calm" toast fires; both slabs visibly drift inward; the orderly disappears (lucid) but keeps patrolling (footsteps).
5. Shift back unmed: walls freeze at the narrowed width and stay there.
6. Hug a wall while lucid and let it close onto you: you're pushed toward the center, never stuck inside the slab.
7. Stay lucid until the gap hits minimum: crush fires — forced unmed, teleported back to the corridor mouth, walls reset to full width, toast shown.
8. Get seen and caught unmed: forced lucid, teleported to the mouth, walls reset.
9. Walk into the orderly's body from behind (unmed, no chase): contact catch fires.
10. Cross the whole stretch and walk out the north doorway: the milestone 8 end card appears with the new questions.
11. 0-pill check: reload, set `state.pills = 0` in the temp block, confirm the far-lane hug pass works unmed at full width.

- [ ] **Step 3: Revert the temp block**

Restore `src/main.ts` to exactly:

```ts
// initial presentation: scene visible behind the start overlay
hud.setState(state.state);
loadRoom('room1');
```

Run: `git diff src/main.ts`
Expected: no diff against the committed Task 4 state.

- [ ] **Step 4: Final verification + deploy to the tailnet dev URL**

Run: `cd "/Users/clanker/Developer/Ward B" && npx tsc --noEmit && npm run build`
Expected: clean. The build lands in `dist/` which the tailnet nginx bind-mounts — https://hellos.impala-alpha.ts.net:8444 serves it immediately. **Do NOT `git push`** — the public GitHub Pages deploy is held until Tom playtests (standing rule; the tree already holds unpushed verticality work).

- [ ] **Step 5: Commit anything outstanding**

```bash
git status --short   # expect clean; commit stragglers if any step above touched files
```

---

## Self-review notes

- **Spec coverage:** placement after room 12 ✓ (Task 3), no dispenser ✓ (room def has empty interactables), closing walls cumulative ✓ (setWallGap never widens mid-attempt), crush = forced unmed + mouth teleport + reset ✓, catch = forced lucid + mouth teleport + reset ✓ (spec: "orderly catch also resets the attempt including wall width"), completable at 0/1/2 pills ✓ (header math + smoke step 11), RoomDef.name ✓, main.ts end card ✓ (Task 4), tuning in TUNING ✓ (Task 1), lowercase ominous copy ✓.
- **Invariant quarantine:** no Orderly changes; no other room touched except room12's exit target string.
- **Known accepted cosmetics:** orderly body may poke through slabs below a ~3m gap; documented in the room header.
