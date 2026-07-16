import { RoomBuilder } from './build';
import type { ColliderDef, RoomDef, RoomScript } from './types';
import type { GameCtx } from '../game/context';
import { openKeypad } from '../ui/keypad';
import { Orderly, type OrderlyAABB } from '../game/orderly';
import type { DebugPatrol } from '../devtools/map-types';

// ROOM 12 — the Asylum Floor. The finale. Biggest footprint in the game
// (roughly 20-24m wide, 74m north-south, versus room 10's 19.2x36). Pill
// capacity is 1 game-wide now, so this room no longer runs room 11's
// carry-both double-spend — it runs a one-pill economy instead. The WHOLE
// middle of the floor — the solo chamber and the big hall, two orderlies'
// worth of ground and both code halves — still sits between GATE B and
// GATE C, but the pocket now holds exactly one station, dispenser12c, just
// south of GATE B. Bank there and the one pill you're carrying is enough to
// pay both gates and read both codes unmed in between; skip it, or burn
// your pill before you reach it, and the only station left in reach is
// back at the near end of a ~44m two-chamber stretch with three orderlies
// standing in the way.
//
// Five chambers, north to south:
//   Z1 the entry hall     (spawn, dispenser A, safe)
//   Z2 the quiet ward     (orderly C, alone; dispenser12c just south of
//                           GATE B; code half 1 in an east nook)
//   Z3 the day hall       (orderlies A + B, counter-rotating, code half 2 in
//                           an east nook)
//   Z4 the supply room    (dispenser B, safe — the far side of the stretch)
//   Z5 the last door      (safe, keypad, exit)
//
// Same forced-unmed-at-entry trick as room 11, same reason: room 11 ends on
// its keypad (lucid), and without forcing raw at the threshold a player who
// never shifts before GATE B would cross it for free, breaking the
// mandatory spend on GATE B. Intended solve:
//
//   forced unmed at spawn -> dispenser A (still unmed, top to 1, 0 spent)
//   -> GATE B, sealed -> shift lucid (-1, 0 left) -> cross
//   -> dispenser12c, just south of the gate -> bank (0 -> 1)
//   -> Z2: shift unmed (free), read half 1, evade orderly C
//   -> Z3: still unmed (or re-shift free), read half 2, evade A + B
//   -> GATE C, sealed (you're unmed from reading half 2) -> shift lucid
//      (-1, 0 left) -> cross -> already lucid, keypad needs nothing further
//   -> dispenser B sits right there in Z4 if you want a buffer, but the
//      finale door doesn't need it
//
// WALK-BACK: both gates are unmed-sealed only, exactly like room 11 — a
// lucid player can always retreat through either one, in either direction,
// for free. The Z2/Z3 and Z4/Z5 boundaries are open doorways, not gates, so
// nothing ever blocks a lucid crossing anywhere on the floor. The only way to
// strand yourself is the same one room 11 warns about: go unmed inside the
// stretch with 0 pills already spent. From there the way out is the way out
// everywhere else in the game — walk into a cone and let the catch force you
// lucid. Worst case: caught (or unmed-and-broke) anywhere in Z2 or Z3 ->
// forced lucid, teleported to spawn, pills kept -> dispenser A is inside the
// same open hall as the spawn point, no gate between it and you.
//
// TIMER SOFT-LOCK AUDIT (medication-wears-off pass, updated for the 1-pill
// cap): same problem as room 11, at this room's scale, sharpened by the
// capacity cut. Lucidity expires on its own after ~45s, so cross GATE B
// lucid, spend the crossing reading a code half or losing an orderly, and
// the clock can revoke lucid while you're still deep in Z2 or Z3 — and at
// 1-pill capacity there is no second pill in reserve to shift back with, so
// a station has to be reachable inside the pocket, unmedicated, or the
// stretch is a soft-lock. dispenser12c (Z2, just south of GATE B) is back to
// cover that. It isn't just a timer backstop anymore, either — the one-pill
// solve above depends on banking there, so it's the load-bearing station for
// the whole GATE B/GATE C stretch, not a safety net on top of one.
// dispenser12d (Z3) stays gone, deliberately: this is a pressure placement,
// not an oversight — per playtest 9, "put the medical station quite far back
// so that if the player doesn't time it well and becomes unmedicated without
// pills, they have to traverse back through a bunch of orderlies." The
// pocket gets exactly one station and it sits at the near end, not one per
// chamber. A raw revert stranded deep in Z3 by GATE C means walking back
// through Z3's two orderlies and Z2's one to reach dispenser12c — the Z2/Z3
// boundary is an open doorway, not a gate, so the walk is always available —
// but it is a long walk, not a dead end. And if that walk goes wrong, the
// "get caught" fallback described in the WALK-BACK note above still applies
// (forced lucid, teleported to spawn, pills kept) — the same mechanic every
// room in this game relies on for exactly this situation.

const CODE = '8563';

const rb = new RoomBuilder();

// Z1 — the entry hall. x [-10,10] z [36,46]. Dispenser A; the last cabinet
// on this side of GATE B and every orderly on the floor. dispenser12c, just
// inside Z2, is the next one after it.
rb.wallX(-10, 10, 46); // south cap, behind spawn
rb.wallZ(36, 46, -10); // west wall
rb.wallZ(36, 46, 10); // east wall

// GATE B — Z1/Z2 boundary, z=36.
rb.wallX(-10, -2, 36);
rb.wallX(2, 10, 36);
rb.block([4, 3, 0.24], [0, 1.5, 36], 'wall', 'unmed');
rb.solid(-2, 2, 35.88, 36.12, 'unmed');

// Z2 — the quiet ward. x [-10,10] z [20,36]. Orderly C alone; his loop is
// skewed west (mirrors room 11's trick), leaving the whole east wall —
// including the nook — a flat 7m off his nearest leg. Sight range is 6m, so
// (per room 11's header derivation: any straight-leg offset past ~2.77m
// makes range and cone mutually exclusive) the nook is unseeable from patrol
// full stop; the exposure is the crossing, not the read.
rb.wallZ(20, 36, -10); // west wall, unbroken
rb.wallZ(20, 26, 10); // east wall, south of the nook mouth
rb.wallZ(28, 36, 10); // east wall, north of the nook mouth

rb.wallX(10, 12, 26); // nook C south bracket
rb.wallX(10, 12, 28); // nook C north bracket
rb.wallZ(26, 28, 12); // nook C end cap — code half 1 is scrawled here
const NOOK_C: OrderlyAABB = { minX: 10, maxX: 12, minZ: 26, maxZ: 28 };
rb.block([0.12, 0.14, 2], [10, 2.7, 27], 'glow'); // glow lintel, nook C mouth

// a central occluder inside his loop's open interior — not on the path.
const ISLAND_C: OrderlyAABB = { minX: -3.5, maxX: -0.5, minZ: 26, maxZ: 30 };
rb.block([3, 1.8, 4], [-2, 0.9, 28], 'wall2');
rb.solid(ISLAND_C.minX, ISLAND_C.maxX, ISLAND_C.minZ, ISLAND_C.maxZ);

// Z2/Z3 boundary, z=20 — open doorway, no gate. Both codes are unmed-only
// regardless, and the whole stretch is already sealed at both ends by GATE B
// and GATE C; a third gate here would only add a toll the design doesn't
// need.
rb.wallX(-10, -2, 20);
rb.wallX(2, 10, 20);

// Z3 — the day hall. x [-10,10] z [-8,20]. The biggest single chamber in the
// game — 28m deep, 20m wide, 560 square meters versus room 10's entire
// ~690sqm footprint. Two orderlies, counter-rotating: A runs the outer
// rectangle one direction, B runs a smaller inner rectangle the other way
// (WAYPOINTS_B is the reverse traversal order of an analogous rectangle, not
// just a mirrored shape — see the two lists below), so their paths read as
// two independent patrols crossing each other's territory rather than a pair
// walking in step. Code half 2 sits in an east nook, 7m off A's nearest
// (outer) leg and even farther off B's — same unseeable-from-patrol
// guarantee as Z2's nook.
rb.wallZ(-8, 20, -10); // west wall, unbroken
rb.wallZ(-8, 4, 10); // east wall, south of the nook mouth
rb.wallZ(6, 20, 10); // east wall, north of the nook mouth

rb.wallX(10, 12, 4); // nook hall south bracket
rb.wallX(10, 12, 6); // nook hall north bracket
rb.wallZ(4, 6, 12); // nook hall end cap — code half 2 is scrawled here
const NOOK_HALL: OrderlyAABB = { minX: 10, maxX: 12, minZ: 4, maxZ: 6 };
rb.block([0.12, 0.14, 2], [10, 2.7, 5], 'glow'); // glow lintel, nook hall mouth

// two occluders in the gap between the outer and inner loops, and against
// the west wall outside the outer loop's west leg — multiple shadows across
// the one patrolled space, not just the nook itself.
const PILLAR_1: OrderlyAABB = { minX: 1, maxX: 2, minZ: 5, maxZ: 7 };
rb.block([1, 1.8, 2], [1.5, 0.9, 6], 'wall2');
rb.solid(PILLAR_1.minX, PILLAR_1.maxX, PILLAR_1.minZ, PILLAR_1.maxZ);

const PILLAR_2: OrderlyAABB = { minX: -9.3, maxX: -8.3, minZ: 12, maxZ: 14 };
rb.block([1, 1.6, 2], [-8.8, 0.8, 13], 'prop');
rb.solid(PILLAR_2.minX, PILLAR_2.maxX, PILLAR_2.minZ, PILLAR_2.maxZ);

// GATE C — Z3/Z4 boundary, z=-8. The far end of the no-refill stretch.
rb.wallX(-10, -2, -8);
rb.wallX(2, 10, -8);
rb.block([4, 3, 0.24], [0, 1.5, -8], 'wall', 'unmed');
rb.solid(-2, 2, -8.12, -7.88, 'unmed');

// Z4 — the supply room. x [-10,10] z [-18,-8]. Safe. Dispenser B — the first
// cabinet since dispenser12c, back in Z2.
rb.wallZ(-18, -8, -10);
rb.wallZ(-18, -8, 10);

// Z4/Z5 boundary, z=-18 — open doorway. Nothing left to gate; the finale
// doesn't need another toll on top of the one the whole floor just paid.
rb.wallX(-10, -2, -18);
rb.wallX(2, 10, -18);

// Z5 — the last door. x [-10,10] z [-26,-18]. Safe, keypad, exit.
rb.wallZ(-26, -18, -10);
rb.wallZ(-26, -18, 10);
rb.wallX(-10, -1, -26); // north, west of the door gap
rb.wallX(1, 10, -26); // north, east of the door gap

// vestibule beyond the exit door, x [-1,1] z [-28,-26]
rb.wallZ(-28, -26, -1);
rb.wallZ(-28, -26, 1);
rb.wallX(-1, 1, -28);
rb.block([1.8, 2.6, 0.06], [0, 1.4, -27.8], 'glow');

const doorCollider: ColliderDef = { minX: -1, maxX: 1, minZ: -26.13, maxZ: -25.87 };
rb.colliders.push(doorCollider);

const ORDERLY_COLLIDERS: ColliderDef[] = rb.colliders.filter(
  (c) => c.states === undefined || c.states === 'both',
);

export const room12: RoomDef = {
  id: 'room12',
  name: 'the Asylum Floor',
  floor: { minX: -10, maxX: 12, minZ: -28, maxZ: 46 },
  spawn: { x: 0, z: 44, yaw: 0 },
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    {
      text: 'one cabinet past the first gate.\nnothing after it. remember.',
      size: 2.8,
      pos: [-9.86, 1.7, 38],
      rotY: Math.PI / 2,
    },
    { text: 'the whole floor breathes\nthe same stale air', size: 2.4, pos: [9.86, 1.7, 42], rotY: -Math.PI / 2 },
    {
      text: 'the ward keeps half its mind\nbehind the east wall',
      size: 2.6,
      pos: [-9.86, 1.7, 28],
      rotY: Math.PI / 2,
    },
    { text: '8 5 – –', size: 2.2, pos: [11.86, 1.7, 27], rotY: -Math.PI / 2, big: true },
    {
      text: 'the hall keeps two of them.\nthey never walk the same way twice.',
      size: 2.8,
      pos: [-9.86, 1.7, 10],
      rotY: Math.PI / 2,
    },
    { text: '– – 6 3', size: 2.2, pos: [11.86, 1.7, 5], rotY: -Math.PI / 2, big: true },
    {
      text: "the far door doesn't care\nhow you got here.",
      size: 2.6,
      pos: [-5, 1.7, -7.86],
      rotY: 0,
    },
    { text: "the last cabinet.\nafter this, it's just the door.", size: 2.4, pos: [-9.86, 1.7, -15], rotY: Math.PI / 2 },
  ],
  interactables: [
    {
      id: 'dispenser12a',
      type: 'dispenser',
      size: [0.16, 0.75, 0.55],
      pos: [-9.72, 1.45, 42],
      mat: 'dispenser',
      states: 'both',
      facing: 'px',
      label: 'use the dispenser',
    },
    {
      id: 'dispenser12b',
      type: 'dispenser',
      size: [0.16, 0.75, 0.55],
      pos: [-9.72, 1.45, -13],
      mat: 'dispenser',
      states: 'both',
      facing: 'px',
      label: 'use the dispenser',
    },
    {
      // The pocket's one station — see the TIMER SOFT-LOCK AUDIT note above.
      // Load-bearing for the one-pill solve now, not just a timer backstop:
      // this is where the pill spent on GATE B gets replaced before the long
      // unmedicated crossing to GATE C. Flush on the west wall, just south
      // of GATE B and north of orderly C's patrol rectangle (z<=33.5, so
      // z=35 clears it by 1.5m) and west of his x=-7 leg — well off the path
      // to nook C on the east wall. dispenser12d (Z3) is deliberately not
      // restored alongside it — the pocket gets exactly one station, placed
      // near, so a mistimed revert deep in Z3 costs a long walk back through
      // every orderly on the floor instead of a short one.
      id: 'dispenser12c',
      type: 'dispenser',
      size: [0.16, 0.75, 0.55],
      pos: [-9.72, 1.45, 35],
      mat: 'dispenser',
      states: 'both',
      facing: 'px',
      label: 'use the dispenser',
    },
    {
      id: 'keypad12',
      type: 'keypad',
      size: [0.4, 0.5, 0.14],
      pos: [1.35, 1.45, -25.75],
      mat: 'pad',
      states: 'both',
      facing: 'pz',
      label: 'use the keypad',
    },
    {
      id: 'exitdoor',
      type: 'door',
      size: [2, 3, 0.2],
      pos: [0, 1.5, -26],
      mat: 'door',
      states: 'both',
      facing: 'pz',
      label: 'the exit door',
    },
  ],
  lights: [
    { pos: [0, 44] },
    { pos: [-5, 40] },
    { pos: [5, 40] },
    { pos: [0, 36] },
    { pos: [5, 32] },
    { pos: [-5, 32] },
    { pos: [5, 27] },
    { pos: [-2, 28] },
    { pos: [5, 23] },
    { pos: [-5, 23] },
    { pos: [0, 17] },
    { pos: [-7, 14] },
    { pos: [5, 11] },
    { pos: [-3, 8] },
    { pos: [5, 5] },
    { pos: [0, 0] },
    { pos: [5, -4] },
    { pos: [-5, -4] },
    { pos: [0, -13] },
    { pos: [0, -20] },
    { pos: [0, -23] },
    { pos: [0, -26] },
  ],
  exits: [{ to: 'room13', minX: -1, maxX: 1, minZ: -27.9, maxZ: -26.8 }],
};

// Orderly C — Z2, alone. West leg at x=-7, a flat 7m off nook C (mouth x=10).
const WAYPOINTS_C = [
  { x: -7, z: 33.5 },
  { x: -7, z: 22.5 },
  { x: 3, z: 22.5 },
  { x: 3, z: 33.5 },
];

// Orderly A — Z3's outer rectangle. East leg at x=3, 7m off nook hall.
const WAYPOINTS_A = [
  { x: 3, z: 17.5 },
  { x: 3, z: -5.5 },
  { x: -7.5, z: -5.5 },
  { x: -7.5, z: 17.5 },
];

// Orderly B — Z3's inner rectangle, listed in the REVERSE rotational order of
// an analogous rectangle to A's (A: E-edge north-to-south, N-edge, W-edge
// south-to-north, S-edge; B: S-edge, W-edge, N-edge, E-edge north-to-south) —
// opposite circulation, not just a smaller copy, so the two never read as
// walking together even where their paths pass near each other.
const WAYPOINTS_B = [
  { x: 0, z: 11 },
  { x: -5, z: 11 },
  { x: -5, z: 1 },
  { x: 0, z: 1 },
];

// RoomScript is frozen; same locally-extended type as every other orderly
// room for the teardown hook.
export type Room12Script = RoomScript & { onLeave?(ctx: GameCtx): void };

// Bearing from the player to a point, relative to the player's look yaw —
// same convention as every other orderly room's copy.
function bearingTo(dx: number, dz: number, yaw: number): number {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const fwd = -dx * sin - dz * cos;
  const right = dx * cos - dz * sin;
  return Math.atan2(right, fwd);
}

export const room12Script: Room12Script = (() => {
  let orderlyA: Orderly | null = null;
  let orderlyB: Orderly | null = null;
  let orderlyC: Orderly | null = null;
  let doorUnlocked = false;
  let sawUnmedToast = false;

  function handleCaught(ctx: GameCtx): void {
    ctx.state.forceState('lucid');
    ctx.shiftFx();
    ctx.teleportPlayer(room12.spawn.x, room12.spawn.z);
    ctx.hud.toast('hands. a needle. "the whole floor, and you still tried," he says.');
    ctx.telemetry.event('orderly_caught');
  }

  function spawnOrderlies(ctx: GameCtx): void {
    orderlyA?.dispose();
    orderlyB?.dispose();
    orderlyC?.dispose();
    orderlyA = new Orderly(
      ctx.scene,
      WAYPOINTS_A,
      [NOOK_HALL, PILLAR_1, PILLAR_2],
      {
        onWarn: () => {
          ctx.hud.toast('he sees you.');
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
      [NOOK_HALL, PILLAR_1, PILLAR_2],
      {
        onWarn: () => {
          ctx.hud.toast('so does the other one.');
          ctx.telemetry.event('orderly_spotted');
        },
        onChaseStart: () => {
          ctx.hud.toast('run. or stop being visible.');
          ctx.telemetry.event('orderly_chase');
        },
        onCaught: () => handleCaught(ctx),
      },
      // Distinct eye-glow tint — playtest 8: A and B's counter-rotating
      // patrols read as one enemy changing location rather than two, since
      // nothing but path shape told them apart. Amber vs. A's default white.
      { colliders: ORDERLY_COLLIDERS, eyeTint: 0xffb347 },
    );
    orderlyC = new Orderly(
      ctx.scene,
      WAYPOINTS_C,
      [ISLAND_C, NOOK_C],
      {
        onWarn: () => {
          ctx.hud.toast("he's alone with you now.");
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
    orderlyC.setWardState(ctx.state.state);
  }

  const script: Room12Script = {
    onEnter(ctx) {
      spawnOrderlies(ctx);
      doorUnlocked = false;
      sawUnmedToast = false;
      // Same forced-raw threshold as room 11 — see the header note. Doesn't
      // touch pills.
      ctx.state.forceState('unmed');
      ctx.shiftFx();
      ctx.hud.toast('the floor swims into focus. still raw.');
      ctx.hud.setObjective(
        "the asylum floor. the last of it. two of them share the big hall; a third keeps his own room. one cabinet waits just past the first gate — after that, it's a long dry stretch to the far side.",
      );
    },

    isAvailable(id) {
      if (id === 'exitdoor') return false;
      if (id === 'keypad12') return !doorUnlocked;
      return true;
    },

    onInteract(id, ctx) {
      if (id === 'keypad12') {
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
            ctx.hud.toast('8563. the floor lets you go.');
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
      orderlyC?.setWardState(next);
      if (next === 'unmed' && !sawUnmedToast) {
        sawUnmedToast = true;
        ctx.hud.toast('three shapes, and none of them are yours.');
      }
    },

    update(dt, _t, ctx) {
      if (!orderlyA || !orderlyB || !orderlyC) return;
      const p = ctx.playerPos();
      orderlyA.update(dt, p.x, p.z, ctx.state.state);
      orderlyB.update(dt, p.x, p.z, ctx.state.state);
      orderlyC.update(dt, p.x, p.z, ctx.state.state);

      const orderlies = [orderlyA, orderlyB, orderlyC];
      const dists = orderlies.map((o) => Math.hypot(o.x - p.x, o.z - p.z));
      const level = Math.max(...orderlies.map((o) => o.watching));
      const dist = Math.min(...dists);
      const chasing = orderlies.some((o) => o.chasing);

      if (level > 0 || chasing) {
        // Primary threat: chasing beats watching, higher watch-ramp beats
        // lower, nearer breaks ties — same aggregation as room 10/8's pair,
        // extended to three by folding each candidate in turn instead of a
        // fixed two-way comparison.
        let primary = orderlies[0];
        let primaryDist = dists[0];
        for (let i = 1; i < orderlies.length; i++) {
          const o = orderlies[i];
          const d = dists[i];
          if (o.chasing && !primary.chasing) {
            primary = o;
            primaryDist = d;
          } else if (o.chasing === primary.chasing) {
            if (o.watching > primary.watching) {
              primary = o;
              primaryDist = d;
            } else if (o.watching === primary.watching && d < primaryDist) {
              primary = o;
              primaryDist = d;
            }
          }
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
      orderlyC?.dispose();
      orderlyA = null;
      orderlyB = null;
      orderlyC = null;
    },
  };

  return script;
})();

export const debugPatrols: DebugPatrol[] = [
  { waypoints: WAYPOINTS_A, label: 'A' },
  { waypoints: WAYPOINTS_B, label: 'B' },
  { waypoints: WAYPOINTS_C, label: 'C' },
];
