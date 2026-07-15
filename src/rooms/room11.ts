import { RoomBuilder, dispenser, scrawl, keypadDoor, heightZone, ramp, patrol } from './kit';
import type { ColliderDef, RoomDef, RoomScript } from './kit';
import type { GameCtx } from '../game/context';
import { Orderly } from '../game/orderly';

// ROOM 11 — the Treatment Corridor, rebuilt for verticality. Playtest 8:
// "feels too similar to room 10, only one orderly, too easy — make it more
// complicated, introduce the vertical dimension." This version keeps the
// double-spend economy room11 exists to teach (see GATE 1 / GATE 2 below,
// unchanged in spirit from the original) but replaces the single-orderly,
// single-level ward floor with a genuine split level: a sunken lower ward
// and a railed mezzanine platform, one orderly per level, connected by one
// ramp. The route through Z2 goes UP to read the code and back DOWN to
// continue — not just further down a corridor.
//
// Three chambers, north to south:
//   Z1 the entry hall     (spawn, dispenser11, safe, y=0)
//   Z2 the ward floor     (split level — see below)
//   Z3 the exit chamber   (safe, keypad, door, y=0)
//
// Z2, in detail — single-valued floor height (rooms/types.ts's
// HeightZone/RampDef): the whole zone is y=0 EXCEPT a railed platform along
// the east wall (x[1,9] z[0,8], y=MEZZ_Y=0.9) and the ramp that bridges it
// down to the lower floor (x[1,9] z[8,10], height interpolating 0.9->0).
// Orderly LOWER patrols the sunken west side (x[-8,-6]) and never has a
// waypoint or a leg within 6m (his sight range) of the platform/ramp
// footprint — geometrically he cannot see anyone up there, the same
// "provably unseeable" trick room10/11/12 already use for code nooks,
// applied here to an entire level instead of an alcove. Orderly UPPER
// patrols the platform itself, hugging its west rail well clear (6.78m) of
// the code scrawled on the platform's east wall (the real room wall, at
// mezzanine height) — same trick, one level up. Nothing about their
// sight/chase math changed; they're just two ordinary Orderly instances
// whose patrols happen to live on different XZ footprints, each given the
// room's floorHeightAt so its mesh stands on its own floor (see
// localFloorHeightAt below — a small mirror of World.floorHeightAt's
// ramp-then-zone logic, since a RoomScript has no reference to World).
//
// CEILING NOTE: World's ceiling plane is fixed at absolute y=3 regardless of
// floor height, so MEZZ_Y is kept modest (0.9m) — eye height on the platform
// is 0.9+1.62=2.52, leaving ~0.48m of headroom, same margin ROOM_AUTHORING.md
// recommends for a raised zone.
//
// RAILINGS: the platform+ramp complex is open on its west side (the ramp's
// low end matches ground height at z=10 — no hazard there, that's the
// entrance) but the ENTIRE west edge, z[0,10] (both the platform's flat run
// and the ramp's sloped run — a sideways step off either drops as much as
// 0.9m with nothing under it) carries a real collider + a low visual rail.
// The platform's north edge (z=0, no ramp there) carries the same. The east
// edge is the room's real perimeter wall; the south edge (z=8..10) is the
// ramp itself, walkable, not a cliff.
//
// GATE 1 (Z1/Z2) and GATE 2 (Z2/Z3) are unmed-sealed exactly like the
// original room11 (and rooms 10/12): solid while raw, open while calm, no
// dispenser between them. onEnter forces unmed at the threshold for the same
// reason the original file did — whatever state the player left room10 in,
// they arrive here raw, guaranteeing gate 1 costs a pill regardless of how
// the player plays it:
//
//   forced unmed at spawn -> dispenser11 (still unmed, top to 2, 0 spent)
//   -> GATE 1, sealed -> shift lucid (-1, 1 left) -> cross
//   -> shift unmed (free) to read the code on the platform -> still unmed
//      at GATE 2 -> GATE 2, sealed -> shift lucid (-1, 0 left) -> cross
//   -> keypad11, already lucid from that crossing -> door
//
// Two pills, spent back to back, no dispenser in between — the mandatory
// double-spend, unchanged from the original room. WALK-BACK: both gates are
// unmed-sealed only, so a lucid player can always retreat through either one
// for free in either direction.
//
// TIMER SOFT-LOCK AUDIT (medication-wears-off pass, same concern the
// original file's header raised): lucidity expires on its own after ~45s.
// An earlier pass added a dispenser inside Z2 (between the two gates) to
// backstop a mistimed revert there — playtest 8 confirmed that let a player
// top back off before GATE 2 was even reached, quietly undoing the mandatory
// double-spend this room exists to teach (nothing between the gates was the
// point). Removed. The actual escape for a raw revert stranded in Z2 is the
// same one every room in this game already relies on: walk into either
// orderly's cone and let the catch force you lucid (teleport to spawn, pills
// kept) — both gates being unmed-sealed already means Z2 has no walk-back to
// a dispenser regardless, so that fallback was always the real answer, not
// an extra dispenser. dispenser11c still covers Z3 (past GATE 2, outside the
// pocket) exactly like every finale chamber in this game.
//
// REACTION TIME (fairness pass, ~3s time-to-contact if the player freezes,
// per playtest note): orderly LOWER's rectangle ({-6,5},{-6,-3},{-8,-3},
// {-8,5}) never comes within 6m (his flat sight range) of either gate
// opening (nearest approach to GATE 1's gap: (-6,5) to (-2,12), sqrt(4^2+7^2)
// = 8.06m; to GATE 2's gap: (-6,-3) to (-2,-10), same 8.06m) or the
// platform/ramp footprint (his max x is -6, the platform's min x is 1 — a
// flat 7m x-gap regardless of z, already past his sight range on x alone).
// Since he can never be within range+cone at either threshold or at the
// mezzanine's edge, there is no "he's already watching" case to bound with
// grace+chaseSpeed at all — the exposure is the walk itself, same
// "provably unseeable, not just usually safe" standard room10/11/12 already
// hold nooks to, now extended to gate-crossing distances too (8.06m clears
// the ~3s/~10.3m-at-immediate-alert bound comfortably once the actual
// detection delay — closing the 8m+ gap before he can even start a chase —
// is accounted for, and clears the ROOM_AUTHORING.md 8.17m guideline outright
// for the gates; the platform separation is even further past sightRange
// than either gate distance). Orderly UPPER's patrol ({2,1.2}-{2,6.8}) sits
// 6.78m from the code scrawl on the platform's east wall ((8.78,4), just
// past his 6m sight range) — same unseeable-from-patrol guarantee, one level
// up. keypad11 sits in Z3, which no orderly ever reaches — safe outright.
//
// CODE: 2593 (fresh value — not 7042/3175/8563/4118/1907/6329/0452/2846/
// 5216, every code already used elsewhere in the game).

const CODE = '2593';
const MEZZ_Y = 0.9;

const rb = new RoomBuilder();

// Z1 — the entry hall. x [-9,9] z [12,22]. dispenser11 here; the only one
// until the safety dispensers below.
rb.wallX(-9, 9, 22); // south cap, behind spawn
rb.wallZ(12, 22, -9); // west wall
rb.wallZ(12, 22, 9); // east wall

// GATE 1 — Z1/Z2 boundary, z=12. Solid while unmed, open while lucid.
rb.wallX(-9, -2, 12);
rb.wallX(2, 9, 12);
rb.block([4, 3, 0.24], [0, 1.5, 12], 'wall', 'unmed');
rb.solid(-2, 2, 11.88, 12.12, 'unmed');

// Z2 — the split-level ward floor. x [-9,9] z [-10,12]. Perimeter walls run
// unbroken the whole zone — the platform below is an interior feature, not
// a wall recess, so there's no wall gap to carve for it.
rb.wallZ(-10, 12, -9); // west wall
rb.wallZ(-10, 12, 9); // east wall

// The mezzanine platform (heightZone) and the ramp that bridges it down to
// the lower floor (ramp). Ramps are checked before zones by
// World.floorHeightAt, so the ramp's high end (yLow=MEZZ_Y at minZ=8) lands
// exactly on the platform's own edge — continuous, no seam.
const PLATFORM = heightZone(1, 9, 0, 8, MEZZ_Y);
const PLATFORM_RAMP = ramp(1, 9, 8, 10, 'z', MEZZ_Y, 0);

// Visual slab under the platform — nothing renders a zone's floor
// automatically (the room's one big floor mesh is still down at y=0), so
// without this the player would stand over visibly empty space.
rb.block([8, MEZZ_Y, 8], [5, MEZZ_Y / 2, 4], 'wall2');

// Visual ramp — BlockDef has no X-tilt, so the walkable slope (smooth, via
// PLATFORM_RAMP) gets a 4-step visual stand-in, full width, rising from the
// ground end (z=10) to the platform end (z=8).
const RAMP_STEPS = 4;
for (let i = 0; i < RAMP_STEPS; i++) {
  const stepTop = (MEZZ_Y * (i + 1)) / RAMP_STEPS;
  const zCenter = 10 - 0.25 - i * 0.5; // steps of width 0.5 across the 2m run
  rb.block([8, stepTop, 0.5], [5, stepTop / 2, zCenter], 'wall2');
}

// Railings — the platform+ramp complex's two open sides (west: the full
// combined edge of both platform and ramp; north: the platform's far edge,
// the ramp doesn't reach it). East is the real wall; south (z=10) is the
// ramp's ground-level mouth, not a drop.
rb.solid(0.88, 1.12, 0, 10); // west rail collider, full platform+ramp run
rb.block([0.24, 0.9, 10], [1, MEZZ_Y + 0.45, 5], 'chain'); // west rail visual
rb.solid(1, 9, -0.12, 0.12); // north rail collider, platform only
rb.block([8, 0.9, 0.24], [5, MEZZ_Y + 0.45, 0], 'chain'); // north rail visual

// Glow marker at the ramp's ground-level mouth — same "lit threshold marks a
// space" convention every nook mouth in this game already uses.
rb.block([2, 0.14, 0.12], [5, 2.7, 10.06], 'glow');

// GATE 2 — Z2/Z3 boundary, z=-10.
rb.wallX(-9, -2, -10);
rb.wallX(2, 9, -10);
rb.block([4, 3, 0.24], [0, 1.5, -10], 'wall', 'unmed');
rb.solid(-2, 2, -10.12, -9.88, 'unmed');

// Z3 — the exit chamber. x [-9,9] z [-18,-10]. Safe: no orderly reaches here.
rb.wallZ(-18, -10, -9);
rb.wallZ(-18, -10, 9);
rb.wallX(-9, -1, -18); // north, west of the door gap
rb.wallX(1, 9, -18); // north, east of the door gap

// vestibule beyond the exit door, x [-1,1] z [-20,-18]
rb.wallZ(-20, -18, -1);
rb.wallZ(-20, -18, 1);
rb.wallX(-1, 1, -20);
rb.block([1.8, 2.6, 0.06], [0, 1.4, -19.8], 'glow');

const lock = keypadDoor(rb, {
  doorId: 'exitdoor',
  keypadId: 'keypad11',
  code: CODE,
  side: 'n',
  wallAt: -18,
  along: 0,
  keypadAlong: 1.35,
  doorLabel: 'the exit door',
  successToast: '2593. gravity was the last lock.',
});

const ORDERLY_COLLIDERS: ColliderDef[] = rb.colliders.filter(
  (c) => c.states === undefined || c.states === 'both',
);

// Mirrors World.floorHeightAt's ramp-then-zone logic for this room's own
// PLATFORM/PLATFORM_RAMP — a RoomScript has no reference to the World
// instance, so orderlies get this small local lookup instead (same shape,
// same numbers, just room-scoped).
function localFloorHeightAt(x: number, z: number): number {
  if (
    x >= PLATFORM_RAMP.minX &&
    x <= PLATFORM_RAMP.maxX &&
    z >= PLATFORM_RAMP.minZ &&
    z <= PLATFORM_RAMP.maxZ
  ) {
    const t = (z - PLATFORM_RAMP.minZ) / (PLATFORM_RAMP.maxZ - PLATFORM_RAMP.minZ);
    return PLATFORM_RAMP.yLow + (PLATFORM_RAMP.yHigh - PLATFORM_RAMP.yLow) * t;
  }
  if (x >= PLATFORM.minX && x <= PLATFORM.maxX && z >= PLATFORM.minZ && z <= PLATFORM.maxZ) return PLATFORM.y;
  return 0;
}

export const room11: RoomDef = {
  id: 'room11',
  name: 'the Treatment Corridor',
  floor: { minX: -9, maxX: 9, minZ: -20, maxZ: 22 },
  spawn: { x: 0, z: 20, yaw: 0 },
  blocks: rb.blocks,
  colliders: rb.colliders,
  heightZones: [PLATFORM],
  ramps: [PLATFORM_RAMP],
  scrawls: [
    scrawl('two doors ahead. one cabinet\nbetween them. find it.', 'w', -9, 17),
    scrawl("the hallway forgets\nhow long it's been", 'w', -9, 20, { size: 2.4 }),
    scrawl('something keeps the low floor.\nsomething else keeps the high one.', 'e', 9, 13, { size: 2.6 }),
    scrawl('the floor climbs on the east.\nhe never follows it up.', 'e', 9, 10.5, { size: 2.6 }),
    // The code — proud of the east wall's real face by ~0.1 (not embedded;
    // the original room11's exact bug), at platform height so it reads
    // correctly to someone standing up there, not at ground level.
    scrawl('2 5 9 3', 'e', 9, 4, { y: MEZZ_Y + 1.65, big: true, proud: 0.1 }),
    scrawl('it opens for the calm.\nnot for you, yet.', 'n', -10, -5, { size: 2.4 }),
    scrawl("the last cabinet.\nafter this, it's just the door.", 'w', -9, -14, { size: 2.4 }),
  ],
  interactables: [
    dispenser({ id: 'dispenser11', side: 'e', wallAt: 9, along: 17, label: 'use the dispenser' }),
    // INTERIM (playtest 9): capacity is 1 game-wide now, so the two-gate
    // pocket needs an in-pocket station or GATE 2 can never be paid —
    // dispenser11b restored (east wall, 1m south of GATE 1, clear of orderly
    // LOWER's x[-8,-6] loop and the ramp footprint). The header's
    // double-spend narrative is stale with it; this whole room is queued for
    // a two-storey rebuild on the stacked-floors engine, so the header gets
    // rewritten then rather than twice.
    dispenser({ id: 'dispenser11b', side: 'e', wallAt: 9, along: 11, label: 'use the dispenser' }),
    // Safety dispenser, Z3 — no orderly ever reaches this zone.
    dispenser({ id: 'dispenser11c', side: 'w', wallAt: -9, along: -14, label: 'use the dispenser' }),
    lock.door,
    lock.keypad,
  ],
  lights: [
    { pos: [0, 20] },
    { pos: [0, 16] },
    { pos: [0, 12] },
    { pos: [-7, 8] },
    { pos: [-7, 1] },
    { pos: [-7, -6] },
    { pos: [5, 6] },
    { pos: [5, 2] },
    { pos: [0, -10] },
    { pos: [0, -14] },
    { pos: [0, -17] },
  ],
  exits: [{ to: 'room12', minX: -1, maxX: 1, minZ: -19.9, maxZ: -18.8 }],
};

// Orderly LOWER — the sunken west side, x[-8,-6] z[-3,5]. Every waypoint and
// leg stays >6m (his flat sight range) from both gate openings and from the
// platform/ramp footprint — see the REACTION TIME note above.
const WAYPOINTS_LOWER = patrol(
  [
    { x: -6, z: 5 },
    { x: -6, z: -3 },
    { x: -8, z: -3 },
    { x: -8, z: 5 },
  ],
  rb.colliders,
);

// Orderly UPPER — the platform, a short back-and-forth strip along its west
// rail (x=2, z[1.2,6.8]), 6.78m from the code scrawl on the east wall.
const WAYPOINTS_UPPER = patrol(
  [
    { x: 2, z: 1.2 },
    { x: 2, z: 6.8 },
  ],
  rb.colliders,
);

export type Room11Script = RoomScript & { onLeave?(ctx: GameCtx): void };

// Bearing from the player to a point, relative to the player's look yaw —
// same convention as every other orderly room's copy.
function bearingTo(dx: number, dz: number, yaw: number): number {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const fwd = -dx * sin - dz * cos;
  const right = dx * cos - dz * sin;
  return Math.atan2(right, fwd);
}

export const room11Script: Room11Script = (() => {
  let orderlyLower: Orderly | null = null;
  let orderlyUpper: Orderly | null = null;
  let sawUnmedToast = false;

  function handleCaught(ctx: GameCtx): void {
    ctx.state.forceState('lucid');
    ctx.shiftFx();
    ctx.teleportPlayer(room11.spawn.x, room11.spawn.z);
    ctx.hud.toast('hands. a needle. "up or down, you\'re still mine," he says.');
    ctx.telemetry.event('orderly_caught');
  }

  function spawnOrderlies(ctx: GameCtx): void {
    orderlyLower?.dispose();
    orderlyUpper?.dispose();
    orderlyLower = new Orderly(
      ctx.scene,
      WAYPOINTS_LOWER,
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
      { colliders: ORDERLY_COLLIDERS, floorHeightAt: localFloorHeightAt },
    );
    orderlyUpper = new Orderly(
      ctx.scene,
      WAYPOINTS_UPPER,
      [],
      {
        onWarn: () => {
          ctx.hud.toast('the one above sees you.');
          ctx.telemetry.event('orderly_spotted');
        },
        onChaseStart: () => {
          ctx.hud.toast('nowhere to go but down.');
          ctx.telemetry.event('orderly_chase');
        },
        onCaught: () => handleCaught(ctx),
      },
      { colliders: ORDERLY_COLLIDERS, floorHeightAt: localFloorHeightAt },
    );
    orderlyLower.setWardState(ctx.state.state);
    orderlyUpper.setWardState(ctx.state.state);
  }

  const script: Room11Script = {
    onEnter(ctx) {
      spawnOrderlies(ctx);
      sawUnmedToast = false;
      // Forces the mandatory double-spend regardless of what state the
      // player left room10 in — see the header note. Doesn't touch pills.
      ctx.state.forceState('unmed');
      ctx.shiftFx();
      ctx.hud.toast("you come to mid-stride, raw. the calm hasn't caught up yet.");
      ctx.hud.setObjective('the treatment corridor climbs. carry enough for both gates — and both floors.');
    },

    isAvailable(id) {
      return lock.isAvailable(id);
    },

    onInteract(id, ctx) {
      return lock.handleInteract(id, ctx);
    },

    onStateChange(next, ctx) {
      orderlyLower?.setWardState(next);
      orderlyUpper?.setWardState(next);
      if (next === 'unmed' && !sawUnmedToast) {
        sawUnmedToast = true;
        ctx.hud.toast('something moves on the floor below. something else, above.');
      }
    },

    update(dt, _t, ctx) {
      if (!orderlyLower || !orderlyUpper) return;
      const p = ctx.playerPos();
      orderlyLower.update(dt, p.x, p.z, ctx.state.state);
      orderlyUpper.update(dt, p.x, p.z, ctx.state.state);

      const distLower = Math.hypot(orderlyLower.x - p.x, orderlyLower.z - p.z);
      const distUpper = Math.hypot(orderlyUpper.x - p.x, orderlyUpper.z - p.z);
      const chasing = orderlyLower.chasing || orderlyUpper.chasing;
      const level = Math.max(orderlyLower.watching, orderlyUpper.watching);
      const dist = Math.min(distLower, distUpper);

      if (level > 0 || chasing) {
        // Chase-priority bearing: chasing beats watching, higher watch-ramp
        // beats lower, nearer breaks ties — same aggregation as room10/12's
        // multi-orderly pairs.
        let primary = orderlyLower;
        if (orderlyUpper.chasing && !orderlyLower.chasing) {
          primary = orderlyUpper;
        } else if (orderlyLower.chasing === orderlyUpper.chasing) {
          if (orderlyUpper.watching > orderlyLower.watching) primary = orderlyUpper;
          else if (orderlyUpper.watching === orderlyLower.watching && distUpper < distLower) primary = orderlyUpper;
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
      orderlyLower?.dispose();
      orderlyUpper?.dispose();
      orderlyLower = null;
      orderlyUpper = null;
    },
  };

  return script;
})();
