import { RoomBuilder, dispenser, scrawl, heightZone, ramp, patrol } from './kit';
import type { ColliderDef, RoomDef, RoomScript } from './types';
import type { GameCtx } from '../game/context';
import { Orderly, type OrderlyAABB } from '../game/orderly';
import type { DebugPatrol } from '../devtools/map-types';

// ROOM 19 — the Undercroft. The other half of the room18 pair: it is built
// twice and the player only ever sees one build, selected by whatever they
// threw back at the relay. This is the payoff of the whole wing — an action
// you took in a room you can no longer reach reshapes the room you're
// standing in, in a game that has never once let you go back and check.
//
// buildRoom19(power) is the factory main.ts's registry resolves at loadRoom
// (the ONE moment room19 is entered, since rooms are one-way — so "read the
// flag at build time" and "read it once, ever" are the same statement). It
// returns a different RoomDef per branch:
//
//   'doors'  — the short, dark way. A 3m unlit corridor (x[-6,-3]) the
//              orderly effectively IS: he patrols nearly its whole length,
//              no cover, and you read his position and time a single pass.
//              The east half of the room is never built — a solid wall
//              stands where the mezzanine would be. No lucid gate: crossing
//              is orderly-dodge-only, shorter in distance and time-under-
//              threat, not gated behind a pill.
//   'lights' — the long, lit way (also the fail-safe DEFAULT, so any edge
//              case — the map viewer, a flag left unset — degrades toward
//              the SAFER branch, not the riskier one). A generous, well-lit
//              route: cross the lower floor, up a ramp onto a railed
//              platform that is a genuine safe breather (the orderly's
//              patrol footprint is passed to him as an occluder, room10's
//              "provably unseeable" trick applied to a whole level — a
//              sightline into the platform's AABB always crosses its
//              boundary, so anyone standing up there is unseeable
//              regardless of distance or facing), then back down and across
//              to the exit. Longer, two exposure windows, but full
//              visibility and a safe midpoint. Also no lucid gate.
//
// The asymmetry is a trade, not a difficulty ramp: both branches cost ZERO
// pills to physically cross (hard law 2 — unmed is safe from geometry, only
// ever threatened by the orderly). The difference is entirely how long
// you're in his reach and how well you can see him coming — a legible trade
// the player reasoned about from room18's scrawls before committing.
//
// TOOLING: besides the factory, this module ALSO exports a static
// `room19: RoomDef` — the 'lights' build. check:rooms and the /map.html
// viewer key rooms by `m[id]` and expect a bare RoomDef, with no factory
// support; the static export lets them consume room19 (the default branch)
// unchanged. A `?flag=doors` viewer preview of the other branch is a
// coordinator follow-up, not wired here. Both branches' patrols are
// validated at import (both assemble() calls run below), so a wedged leg in
// EITHER branch is a check:rooms failure, not a runtime surprise.
//
// SHARED (both branches):
//   Z1 vestibule z[2,4] — safe, dispenser19 on the west wall by spawn,
//     reachable unmed immediately, before either branch's hazard geometry.
//
// SOFT-LOCK AUDIT (covers BOTH branches):
//   - dispenser19 sits in the vestibule, reachable unmed on entry with 0
//     pills — before any hazard, in either build. Pass.
//   - Neither branch places a single state-filtered (`states:'unmed'`)
//     collider anywhere — confirmed below (every collider is a plain wall/
//     rail). So crossing is always physically possible unmed; a mistimed
//     medication revert mid-room is an ordinary revert, never a geometry
//     trap. The only threat is the orderly, and the catch (forced lucid +
//     teleport to spawn, pills kept) is the universal backstop — the same
//     load-bearing fallback every room in this game relies on. Pass.
//   - Neither branch REQUIRES a pill to cross (no lucid gate either way), so
//     a 0-pill arrival is never stranded even without touching dispenser19.
//     The dispenser is pure insurance/top-off for room20. Pass.
//
// REACTION-TIME AUDIT (covers BOTH branches):
//   - 'doors': the only fixture inside the hazard corridor is its far exit;
//     no scrawl/dispenser stand-and-read spot exists there. dispenser19 is
//     in the vestibule, outside the corridor — no orderly waypoint reaches
//     z>0 (his belt is z[-6.5,-1]). Pass by zone separation (same category
//     as room18's dispenser), not the 8.2m raw-distance rule.
//   - 'lights': the platform is the only "stand and look around" spot, and
//     it's occluder-protected (PLATFORM_AABB is the orderly's occluder) —
//     provably unseeable, not merely distant. His belt is confined to the
//     lower floor west of the platform's rail; he never has a waypoint or
//     leg within the platform footprint. Pass by the same argument
//     room10/room11 hold their nooks/mezzanine to.
//   - Both: patrol()'s clearance validator (run in assemble() at import) is
//     the actual gate — any leg wedging the orderly against new geometry
//     throws before playtest sees it.
//
// DEVIATIONS FROM SPEC (§4): the spec's 'lights' prose describes two ramps
// (a second back down near the exit corner). This build uses ONE ramp: the
// player climbs onto the breather and descends the same ramp before the
// second ground crossing to the exit. The two-crossings-bracketing-a-
// breather shape and the pill economy are preserved; the second ramp was
// cut because a single ramp keeps the platform's rails a single continuous
// west edge (fewer seams, one clean patrol-clearance story) with no change
// to fairness. Spawn yaw is 0 (faces north, into the room) per every
// shipped room's convention; the spec's "yaw π" would face the player at
// the south wall behind them, read as a typo.

export type PowerRoute = 'lights' | 'doors';

// Shared spawn — both branches share the vestibule, so the same point.
const SPAWN = { x: -4, z: 3.2, yaw: 0 };

// --- 'lights' branch geometry (module consts the script also reads) --------
const PLATFORM = heightZone(2, 7, -8, -3, 0.9); // the safe breather, east
const RAMP1 = ramp(2, 7, -3, -1, 'z', 0.9, 0); // platform (z=-3) down to ground foot (z=-1)
// Occluder covering platform + ramp: any sightline into this AABB crosses
// its boundary, so a player anywhere on the raised route is unseeable.
const PLATFORM_AABB: OrderlyAABB = { minX: 2, maxX: 7, minZ: -8, maxZ: -1 };

// Orderly belts. Final numbers pinned by patrol()'s clearance validator
// (called in assemble()); a wedged leg throws at import.
const WAYPOINTS_LIGHTS = [
  { x: -4, z: 0.5 },
  { x: 1, z: 0.5 },
  { x: 1, z: -6 },
  { x: -4, z: -6 },
];
const WAYPOINTS_DOORS = [
  { x: -4.5, z: -1 },
  { x: -4.5, z: -6.5 },
  { x: -3.8, z: -6.5 },
  { x: -3.8, z: -1 },
];

interface Built {
  def: RoomDef;
  colliders: ColliderDef[]; // always-on set, for the room-owned orderly
}

function assemble(power: PowerRoute): Built {
  const rb = new RoomBuilder();

  // shell — floor x[-7,7] z[-8,4], spawn end at +z (south)
  rb.wallX(-7, 7, 4); // south cap, behind spawn
  rb.wallZ(-8, 4, -7); // west wall
  rb.wallZ(-8, 4, 7); // east wall

  const scrawls = [
    scrawl('the undercroft hums.\nsomething was decided\nbefore you got here.', 'w', -7, 3.4, { size: 2.2 }),
  ];
  let heightZones: RoomDef['heightZones'];
  let ramps: RoomDef['ramps'];
  let exits: RoomDef['exits'];
  let lights: RoomDef['lights'];
  let interactables: RoomDef['interactables'] = [
    dispenser({ id: 'dispenser19', side: 'w', wallAt: -7, along: 3, label: 'use the dispenser' }),
  ];

  if (power === 'doors') {
    // Divider z=2 (vestibule z[2,4]), gap x[-6,-3] into the corridor.
    rb.wallX(-7, -6, 2);
    rb.wallX(-3, 7, 2);
    // Corridor x[-6,-3], full length z[-8,2]. West + east walls seal it off
    // from the (never-built, dead) east half.
    rb.wallZ(-8, 2, -6);
    rb.wallZ(-8, 2, -3);
    // north cap, exit gap x[-5.5,-3.5] at the corridor's north end
    rb.wallX(-7, -5.5, -8);
    rb.wallX(-3.5, 7, -8);
    rb.block([2, 2.6, 0.06], [-4.5, 1.4, -7.9], 'glow'); // the way out, far down the dark

    scrawls.push(
      // On the corridor's east wall (faces -x, into the corridor).
      scrawl('wrong wiring for this door.\nit never opens.', 'e', -3, -4, { size: 2.2 }),
      scrawl('straight line. dark as a mouth.\nkeep walking.', 'w', -6, -3.5, { size: 2.2 }),
    );
    // Sparse: one dim pool in the vestibule, none in the corridor itself.
    // (Non-blinding — the renderer keeps a base ambient regardless of these
    // point lights, so this is a legibility/mood lever, not a blackout.)
    lights = [{ pos: [-4.5, 3] }, { pos: [0, 3] }];
    exits = [{ to: 'room20', minX: -5.5, maxX: -3.5, minZ: -7.9, maxZ: -7.2 }];
  } else {
    // 'lights' — divider z=2, gap x[-6,-1] onto the lit lower floor.
    rb.wallX(-7, -6, 2);
    rb.wallX(-1, 7, 2);
    // north cap, exit gap x[-1,1] (central); x[1,7] backs the platform.
    rb.wallX(-7, -1, -8);
    rb.wallX(1, 7, -8);
    rb.block([1.8, 2.6, 0.06], [0, 1.4, -7.9], 'glow');

    // Platform slab (nothing renders a heightZone's floor automatically) +
    // a short stepped visual for the ramp (BlockDef has no X-tilt; the
    // walkable slope is smooth via RAMP1 regardless).
    rb.block([5, PLATFORM.y, 5], [4.5, PLATFORM.y / 2, -5.5], 'wall2');
    for (let i = 0; i < 3; i++) {
      const stepTop = (PLATFORM.y * (i + 1)) / 3;
      const zc = -1 - 0.333 - i * 0.667; // steps rising from the ground foot (z=-1) to the platform (z=-3)
      rb.block([5, stepTop, 0.667], [4.5, stepTop / 2, zc], 'wall2');
    }

    // West rail — the platform+ramp's only open cliff edge (north is the
    // real wall, east is the real wall, south is the ramp mouth). Full run
    // z[-8,-1]: collider + a low visual rail.
    rb.solid(1.88, 2.12, -8, -1);
    rb.block([0.24, 0.9, 7], [2, PLATFORM.y + 0.45, -4.5], 'chain');
    // Glow lintel at the ramp mouth — marks "there is a way up here".
    rb.block([5, 0.14, 0.12], [4.5, 2.7, -0.94], 'glow');

    scrawls.push(
      // On the west wall, where the doors-branch corridor would have been.
      scrawl('no door here.\nthey fed the bulbs instead.', 'w', -7, -3, { size: 2.2 }),
      scrawl('up, and over, and down.\ntake the breath while you can.', 'e', 7, -5, { size: 2.2 }),
    );
    heightZones = [PLATFORM];
    ramps = [RAMP1];
    lights = [
      { pos: [-4, 3] },
      { pos: [-3, -1] },
      { pos: [-3, -5] },
      { pos: [4.5, -4] }, // on the platform
      { pos: [4.5, -7] },
      { pos: [0, -7] },
    ];
    exits = [{ to: 'room20', minX: -1, maxX: 1, minZ: -7.9, maxZ: -7.2 }];
  }

  const waypoints = power === 'doors' ? WAYPOINTS_DOORS : WAYPOINTS_LIGHTS;
  // Throws at import if any leg wedges the orderly (see file header). This
  // is what validates BOTH branches at module load — assemble() runs for
  // each below.
  patrol(waypoints, rb.colliders);

  const colliders = rb.colliders.filter((c) => c.states === undefined || c.states === 'both');

  const def: RoomDef = {
    id: 'room19',
    name: 'the Undercroft',
    floor: { minX: -7, maxX: 7, minZ: -8, maxZ: 4 },
    spawn: SPAWN,
    blocks: rb.blocks,
    colliders: rb.colliders,
    scrawls,
    interactables,
    lights,
    exits,
    heightZones,
    ramps,
  };
  return { def, colliders };
}

// Both branches built at import — validates both patrols (header) and gives
// the script a per-branch always-on collider set to hand its orderly.
const DOORS = assemble('doors');
const LIGHTS = assemble('lights');

// The factory main.ts's registry resolves at loadRoom. Default 'lights' is
// the fail-safe branch (see header): any entry with the flag unset degrades
// toward the safer route.
export function buildRoom19(power: PowerRoute = 'lights'): RoomDef {
  return power === 'doors' ? DOORS.def : LIGHTS.def;
}

// Static default/LIGHTS build for check:rooms + the map viewer (header).
export const room19 = LIGHTS.def;

interface BranchCfg {
  colliders: ColliderDef[];
  waypoints: Array<{ x: number; z: number }>;
  occluders: OrderlyAABB[];
  warn: string;
  chase: string;
}

const BRANCH: Record<PowerRoute, BranchCfg> = {
  doors: {
    colliders: DOORS.colliders,
    waypoints: WAYPOINTS_DOORS,
    occluders: [], // the corridor gives no cover — he IS the corridor
    warn: 'he is right there in the dark.',
    chase: 'run. or stop being visible.',
  },
  lights: {
    colliders: LIGHTS.colliders,
    waypoints: WAYPOINTS_LIGHTS,
    occluders: [PLATFORM_AABB], // the breather is provably unseeable
    warn: 'the one on the floor sees you.',
    chase: 'get above him, or run.',
  },
};

export type Room19Script = RoomScript & { onLeave?(ctx: GameCtx): void };

// Same convention as every orderly room's local copy.
function bearingTo(dx: number, dz: number, yaw: number): number {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const fwd = -dx * sin - dz * cos;
  const right = dx * cos - dz * sin;
  return Math.atan2(right, fwd);
}

// Hand-written (not makeOrderlyRoomScript) because the orderly's waypoints,
// occluders AND collider set all depend on the branch — which isn't known
// until onEnter reads the flag, after the factory has already resolved the
// def. Same one-orderly shape as room7/room14, just branch-selected.
export const room19Script: Room19Script = (() => {
  let orderly: Orderly | null = null;
  let sawUnmedToast = false;

  const script: Room19Script = {
    onEnter(ctx) {
      const power = (ctx.flags.get<PowerRoute>('room18.power') ?? 'lights') as PowerRoute;
      const cfg = BRANCH[power];
      orderly?.dispose();
      orderly = new Orderly(
        ctx.scene,
        cfg.waypoints,
        cfg.occluders,
        {
          onWarn: () => {
            ctx.hud.toast(cfg.warn);
            ctx.telemetry.event('orderly_spotted');
          },
          onChaseStart: () => {
            ctx.hud.toast(cfg.chase);
            ctx.telemetry.event('orderly_chase');
          },
          onCaught: () => {
            ctx.state.forceState('lucid');
            ctx.shiftFx();
            ctx.teleportPlayer(SPAWN.x, SPAWN.z);
            ctx.hud.toast('hands. a needle. "you don\'t get to pick twice," he says.');
            ctx.telemetry.event('orderly_caught');
          },
        },
        { colliders: cfg.colliders },
      );
      orderly.setWardState(ctx.state.state);
      sawUnmedToast = false;
      ctx.hud.setObjective(
        power === 'doors'
          ? 'the corridor ahead is dark, and it is not empty. find the gap in his walk.'
          : 'up onto the floor above, then down and across. mind the crossings.',
      );
    },

    onStateChange(next, ctx) {
      orderly?.setWardState(next);
      if (next === 'unmed' && !sawUnmedToast) {
        sawUnmedToast = true;
        ctx.hud.toast('the hum resolves into footsteps that keep his shape.');
      }
    },

    update(dt, _t, ctx) {
      if (!orderly) return;
      const p = ctx.playerPos();
      orderly.update(dt, p.x, p.z, ctx.state.state);

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

// Descriptive only — the map viewer draws whatever's exported and doesn't
// need flag-accuracy (see map-types.ts header). Both branches' belts,
// labeled, so either can be eyeballed.
export const debugPatrols: DebugPatrol[] = [
  { waypoints: WAYPOINTS_LIGHTS, label: 'A (lights)' },
  { waypoints: WAYPOINTS_DOORS, label: 'A (doors)' },
];
