import { RoomBuilder, scrawl, shapeLockDoor, patrol, orderlyTelemetryCallbacks } from './kit';
import type { ColliderDef, RoomDef, RoomScript } from './kit';
import type { GameCtx } from '../game/context';
import { Orderly, type OrderlyAABB } from '../game/orderly';
import type { DebugPatrol } from '../devtools/map-types';

// ROOM 15 — the Sorting Room (spec: 2026-07-19-room15-shape-keys-design;
// reworked 2026-07-21 per Tom's playtest pass — every point below is his,
// paraphrased). Three unmed-only shape props (blue circle / green square /
// red triangle) sit in L-shaped dogleg alcoves off the west/east walls; the
// exit is shape_lock15 — opens once all three are held, no code. Getting
// caught costs a walk back to spawn (forced lucid, teleport, pills AND keys
// kept — a catch never un-collects a key, the design's one hard invariant,
// unchanged by this rework).
//
// FOUR CHANGES FROM THE ORIGINAL, ALL TOM'S:
//
// 1. NO DISPENSERS. dispenser15a/b/c are gone — no dispense station exists
//    anywhere in this room. onEnter force-reverts to unmed (forceState +
//    shiftFx + toast, the room11/12 threshold trick) regardless of what
//    state the player arrives in. The whole room is played raw.
// 2. THE LOCK WORKS UNMED. shapeLockDoor() gained an additive `allowUnmed`
//    opt (kit.ts) — off everywhere else, on here. Nothing in this room
//    demands lucid anymore; the mechanism that used to gatekeep on it can't
//    be the one holdout.
// 3. ESCALATION. Two orderlies patrol at entry (B guards the green square,
//    C the red triangle, unchanged from the original). Every key collected
//    spawns one more, regardless of pickup order: 2 -> 3 -> 4 -> 5. The
//    room ends at five while you're still walking the last stretch to the
//    door. See "ESCALATION DESIGN" below for the four new patrols, tint
//    assignment, and the spawn-fairness numbers.
// 4. NO REFILL. A player can still arrive carrying the one game-wide pill
//    (from room14) and burn its ~45s lucid window as a panic button
//    somewhere in here — that's sanctioned, not an exploit. It buys one
//    window, once; nothing in this room tops it back up.
//
// Three chambers, unchanged shape from the original, west/east wall
// doglegs:
//   Key A (blue circle)   — Z1, x[-10.8,-9] z[-3.4,0]. No orderly of its own
//                            at entry; by the time all three keys are gone,
//                            orderly D's loop sweeps the corridor past its
//                            mouth (see ESCALATION DESIGN) — "vacuous"
//                            stops being true partway through the run, on
//                            purpose.
//   Key B (green square)  — Z2, x[9,10.8] z[-12.6,-9.2]. Orderly B, one
//                            dead-on mouth-facing leg, three safe legs —
//                            unchanged from the original design.
//   Key C (red triangle)  — Z3, x[-10.8,-9.4] z[-20.6,-17.2]. Orderly C, a
//                            tighter, faster loop — unchanged.
//
// dispenser15b's old recess (west wall, z[-7.4,-5.8]) is removed along with
// the fixture — that wall segment is solid again, merged into the run either
// side of it. dispenser15a/c were flush wall mounts with no recess of their
// own; removing them needed no geometry change.
//
// ESCALATION DESIGN: the room's 18m-wide, ~31m-long open floor (x[-9,9]
// z[-27,6], minus the three wall doglegs) splits into three previously-
// unpatrolled bands once B and C's boxes are marked off — the south
// corridor past Key A (roughly z[-6,0]), the mid gap between B's and C's
// boxes (z[-14,-10.5]), and the whole final approach to the door, Z4
// (z[-25.5,-18.5]). One new orderly claims each band, spawned the moment
// the player's Nth key (any key, any order) crosses shapeLockDoor's held
// count:
//
//   +1 key  -> orderly D, the south corridor (WAYPOINTS_D) — closes Z1's
//              "vacuous by construction" gap and the walk back toward spawn.
//   +2 keys -> orderly E, the B/C mid gap (WAYPOINTS_E) — closes the open
//              crossing between the two original alcoves.
//   +3 keys -> orderly F, Z4 (WAYPOINTS_F) — the final approach to
//              shape_lock15 itself. This is the one explicitly asked for:
//              five total, the last one arriving exactly as you're heading
//              for the door.
//
// Every spawned orderly (B, C, D, E, F alike) is given ALL THREE alcoves'
// leg2 occluder boxes (LEG2_A/B/C below), not just the one nearest its own
// patrol — the population grows, so the occluder set every orderly carries
// has to cover every alcove a player might be standing inside, regardless
// of which orderly happens to be nearest at the time. Distinct eye tints
// (room12 precedent: default white for the first, amber for the second)
// carried out to five: B white (0xffffff, default), C amber (0xffb347), D
// violet (0xb98aff), E magenta (0xff6fd8), F ice-cyan (0x7fe8ff) — five
// hues spread around the wheel, none matching any of the three key colors
// (#3fa9dd/#4caf6a/#c1170f), so five reads as five even in a crowd.
//
// SPAWN FAIRNESS: each escalation orderly's waypoints[0] (his literal spawn
// position, since Orderly's constructor plants him at waypoints[0]) is
// chosen so it's far from all three key pickup points at once — not just
// the one that happens to trigger his spawn, since pickup order is the
// player's choice and any key can be first. Key interior points: A
// (-10.5,-0.3), B (10.5,-12.3), C (-10.5,-20.3).
//   D spawns at (7.5,0.5)   — nearest key is B at 13.1m.
//   E spawns at (-7.5,-10.5) — nearest key is C at 10.2m.
//   F spawns at (7.5,-25.5)  — nearest key is B at 13.5m.
// All three clear TUNING.orderly.sightRange (6m) by more than double, so
// however the player ordered their pickups, the new orderly never renders
// in on top of them. Each spawn also fires its own toast so the arrival
// is legible even though it happens off-screen: "somewhere, a door you
// can't see opens." (D), "they know what you took." (E), "the last of
// them. now it's just you and the door." (F).
//
// SOFT-LOCK AUDIT (rewritten for zero dispensers): hard law 1 reads "an
// unmed player with 0 pills must always be able to reach a dispenser — or
// an orderly cone." With no dispenser anywhere in this room, that first
// fork is permanently moot, not violated — because nothing in the room ever
// spends a pill in the first place. Keys are unmed-only pickups (unchanged)
// and, as of change #2, shape_lock15 is unmed-operable too, so there is no
// mechanical action anywhere in this room that requires lucid. Unmed is
// always safe from the world (hard law 2); the room has zero unmed-sealed
// gates (never did). A player can finish this room on 0 pills without ever
// shifting once. The catch fallback (forced lucid, teleport to spawn, pills
// AND keys kept) still self-recovers exactly like every other room — it's
// load-bearing for escaping a chase, not for reaching medicine, since there
// isn't any to reach. The one pill a player might still be carrying in from
// room14 is a strictly optional panic button (change #4): burn it mid-chase
// for a free 45s of invisibility, or don't. Either way there's no dead end.
//
// REACTION-TIME AUDIT: every alcove's leg2 (the actual pickup — where the
// player stands and clicks "take it") is the sole occluder AABB passed to
// EVERY orderly in the room, at every stage of escalation, not just the
// orderly nearest it — see ESCALATION DESIGN above. Standing inside leg2
// puts the player's own position inside that AABB, so segmentHitsAABB
// reports occluded for a line from ANY orderly position to that point,
// unconditionally — this doesn't degrade as more orderlies come online,
// because it was never about any one orderly's angle to begin with. Key A's
// leg2 (LEG2_A) is added for this rework specifically, since it had no
// occluder at all in the original two-orderly room (nothing was ever close
// enough to need one) — orderly D's spawn changes that, so the box is added
// alongside him.
//   leg1 (all three alcoves, the transited mouth, not stood in) — ordinary
//   patrol exposure, same standard the original room already applied to B
//   and C's dead-on legs: telegraphed by a visible approach, not a forced
//   blind read, the player picks the moment.
//   shape_lock15 itself — the one new exposed "stand and interact" point:
//   orderly F's box comes within ~1.3m of it on his one full-width leg
//   (WAYPOINTS_F's north edge, z=-25.5, the closest approach to the lock at
//   (1.35,-26.81)). This is short of the usual ~8.17m
//   (minInspectionDistance()) guideline, and deliberately so — Tom's ask was
//   a five-orderly room that's still dangerous while you're walking to the
//   door, and the last few meters of an 18m-wide, sightline-clear room is
//   where that has to land. It's the same "provably scoutable, not a forced
//   blind read" standard the original room already leaned on for B/C's dead-
//   on legs, extended to a whole zone: F is fully visible while unmed for
//   his entire ~29.3s loop (44m perimeter at 1.5 m/s), Z4 is open floor with
//   no blind corners, and only ~10s of that loop (the near-lock leg) can
//   threaten the lock at all — the other ~19s (the three far legs) is a
//   completely clear window the player can watch for from well outside his
//   6m sight range before ever committing to the last approach. A catch here
//   is exactly as recoverable as anywhere else in the game: forced lucid,
//   teleport to spawn, keys AND held count untouched (heldCount lives in
//   shapeLockDoor's closure, never touched by a catch) — worst case is
//   another walk, never lost progress.

const rb = new RoomBuilder();

// perimeter shell — floor x[-9,9] z[-29,6] (vestibule included), spawn end
// at +z (south). West/east walls broken only at alcove mouths.
rb.wallX(-9, 9, 6); // south cap, behind spawn

// west wall (x=-9) — gaps at Key A's mouth z:[-3.4,-1.8], Key C's mouth
// z:[-18.8,-17.2]. dispenser15b's old recess mouth (z:[-7.4,-5.8]) is gone —
// that stretch is solid wall now, merged into the run either side of it.
rb.wallZ(-27, -18.8, -9);
rb.wallZ(-17.2, -3.4, -9);
rb.wallZ(-1.8, 6, -9);

// east wall (x=9) — gap at Key B's mouth z:[-10.8,-9.2].
rb.wallZ(-27, -10.8, 9);
rb.wallZ(-9.2, 6, 9);

// north cap, with the exit doorway gap x[-1,1]
rb.wallX(-9, -1, -27);
rb.wallX(1, 9, -27);

// vestibule beyond the exit door, x[-1,1] z[-29,-27]
rb.wallZ(-29, -27, -1);
rb.wallZ(-29, -27, 1);
rb.wallX(-1, 1, -29);
rb.block([1.8, 2.6, 0.06], [0, 1.4, -28.8], 'glow'); // warm glow beyond the exit

// --- Key A (blue circle) — west wall, safe dogleg. leg1 (visible from the
// room): x:[-10.8,-9] z:[-3.4,-1.8]. leg2 (blind, turns south):
// x:[-10.8,-9.4] z:[-1.8,0.0]. The gap connecting them sits at leg1's
// far/blind end (x near -10.8), not near the mouth, so the turn can't be
// seen or shortcut from the mouth.
rb.wallX(-10.8, -9, -3.4); // leg1 north bracket
rb.wallX(-9.4, -9, -1.8); // leg1 south wall, solid strip near the mouth only
rb.wallZ(-3.4, 0.0, -10.8); // leg1 west cap + leg2 west wall, one continuous run
rb.wallZ(-1.8, 0.0, -9.4); // leg2 east wall
rb.wallX(-10.8, -9.4, 0.0); // leg2 south end cap
rb.block([0.12, 0.14, 1.6], [-9, 2.7, -2.6], 'glow'); // mouth lintel

// leg2 only — sole occluder for Key A. New for this rework: orderly D's
// patrol (spawned after the first key, see ESCALATION DESIGN) is the first
// threat ever close enough to this alcove to need one.
const LEG2_A: OrderlyAABB = { minX: -10.8, maxX: -9.4, minZ: -1.8, maxZ: 0.0 };

// --- Key B (green square) — east wall, patrol-reading dogleg. leg1:
// x:[9,10.8] z:[-10.8,-9.2]. leg2 (blind, turns north): x:[9.4,10.8]
// z:[-12.6,-10.8]. Mirrors Key A's topology, reflected onto the east wall.
rb.wallX(9, 9.4, -10.8); // leg1 north wall, solid strip near the mouth only
rb.wallX(9, 10.8, -9.2); // leg1 south bracket
rb.wallZ(-12.6, -9.2, 10.8); // leg1 east cap + leg2 east wall, one continuous run
rb.wallZ(-12.6, -10.8, 9.4); // leg2 west wall
rb.wallX(9.4, 10.8, -12.6); // leg2 north end cap
rb.block([0.12, 0.14, 1.6], [9, 2.7, -10.0], 'glow'); // mouth lintel

// leg2 only — sole occluder for Key B.
const LEG2_B: OrderlyAABB = { minX: 9.4, maxX: 10.8, minZ: -12.6, maxZ: -10.8 };

// --- Key C (red triangle) — west wall, timed-dash dogleg. leg1: x:[-10.8,-9]
// z:[-18.8,-17.2]. leg2 (blind, turns north): x:[-10.8,-9.4] z:[-20.6,-18.8].
// Same topology as Key A, one zone further north, guarded much tighter.
rb.wallX(-10.8, -9, -17.2); // leg1 south bracket, near the mouth
rb.wallX(-9.4, -9, -18.8); // leg1 north wall, solid strip near the mouth only
rb.wallZ(-20.6, -17.2, -10.8); // leg1 west cap + leg2 west wall, one continuous run
rb.wallZ(-20.6, -18.8, -9.4); // leg2 east wall
rb.wallX(-10.8, -9.4, -20.6); // leg2 north end cap
rb.block([0.12, 0.14, 1.6], [-9, 2.7, -18.0], 'glow'); // mouth lintel

// leg2 only — sole occluder for Key C.
const LEG2_C: OrderlyAABB = { minX: -10.8, maxX: -9.4, minZ: -20.6, maxZ: -18.8 };

// Every orderly in the room carries every alcove's occluder — see
// ESCALATION DESIGN / REACTION-TIME AUDIT above for why this has to be
// universal rather than per-orderly as the population grows.
const ALL_OCCLUDERS: OrderlyAABB[] = [LEG2_A, LEG2_B, LEG2_C];

// --- shape lock assembly — the door, the shape_lock wall fixture, all three
// shapeKeyProp pickups, and the icon panel, bundled by one kit call. Owns
// the held-set; a catch never touches it (see SOFT-LOCK AUDIT above).
// allowUnmed: true is change #2 — the lock is operable in both ward states
// now, so the old lucid-only refusal (and its flavor toast) is gone.
const lock = shapeLockDoor(rb, {
  doorId: 'exitdoor',
  side: 'n',
  wallAt: -27,
  along: 0,
  doorLabel: 'the exit door',

  lockId: 'shape_lock15',
  lockAlong: 1.35,
  lockLabel: 'use the lock',
  allowUnmed: true,

  keys: [
    {
      id: 'shapeKeyA',
      shape: 'circle',
      color: '#3fa9dd',
      pos: [-10.5, 0.9, -0.3],
      pickupToast: 'a circle. cold in your hand.',
    },
    {
      id: 'shapeKeyB',
      shape: 'square',
      color: '#4caf6a',
      pos: [10.5, 0.9, -12.3],
      pickupToast: "a square. he didn't turn around.",
    },
    {
      id: 'shapeKeyC',
      shape: 'triangle',
      color: '#c1170f',
      pos: [-10.5, 0.9, -20.3],
      pickupToast: "a triangle. you're already moving before you feel it.",
    },
  ],

  iconPanelId: 'doorIcons15',
  iconPanelSide: 'n',
  iconPanelWallAt: -27,
  iconPanelAlong: 0,

  refusalToastIncomplete: (have, need) => `it wants ${need} shapes back. you have ${have}.`,
  successToast: 'three shapes, three small thefts. the door remembers none of it.',
  successObjective: 'the door is open. go.',
});

const ORDERLY_COLLIDERS: ColliderDef[] = rb.colliders.filter(
  (c) => c.states === undefined || c.states === 'both',
);

// Orderly B — a wide rectangle around Z2's open floor. Exactly one leg
// ((-6,-10)->(7.2,-10)) walks dead-on at Key B's mouth (bearing 0°, matching
// its z); the other three legs face north/west/south, all >=90° off the
// alcove (due east) regardless of distance. Perimeter ~=33.4m, loop period
// ~=22.3s at TUNING.orderly.speed (1.5 m/s). Unchanged from the original.
const WAYPOINTS_B = patrol(
  [
    { x: -6, z: -10 },
    { x: 7.2, z: -10 },
    { x: 7.2, z: -6.5 },
    { x: -6, z: -6.5 },
  ],
  rb.colliders,
);

// Orderly C — a short, tight rectangle. Leg ((1.5,-18)->(-7.6,-18)) is the
// dead-on approach to Key C's mouth (z=-18 matches the mouth's center).
// Perimeter ~=25.4m, loop period ~=16.9s — visibly faster/tighter than B's.
// Unchanged from the original.
const WAYPOINTS_C = patrol(
  [
    { x: 1.5, z: -18 },
    { x: -7.6, z: -18 },
    { x: -7.6, z: -14.4 },
    { x: 1.5, z: -14.4 },
  ],
  rb.colliders,
);

// Orderly D — spawns on the first key collected (any key, any order). The
// south corridor: closes Z1's "vacuous by construction" gap and the walk
// between spawn and Key A's mouth, previously totally safe. waypoints[0] =
// (7.5,0.5) — the spawn-fairness corner, 13.1m from the nearest key (B) —
// see SPAWN FAIRNESS above.
const WAYPOINTS_D = patrol(
  [
    { x: 7.5, z: 0.5 },
    { x: -7.5, z: 0.5 },
    { x: -7.5, z: -6 },
    { x: 7.5, z: -6 },
  ],
  rb.colliders,
);

// Orderly E — spawns on the second key collected. The mid gap between B's
// and C's boxes: closes the open crossing a player has to make between the
// two original alcoves. waypoints[0] = (-7.5,-10.5) — 10.2m from the
// nearest key (C) — see SPAWN FAIRNESS above.
const WAYPOINTS_E = patrol(
  [
    { x: -7.5, z: -10.5 },
    { x: -7.5, z: -14 },
    { x: 7.5, z: -14 },
    { x: 7.5, z: -10.5 },
  ],
  rb.colliders,
);

// Orderly F — spawns on the third key collected, the fifth and last
// orderly. Z4, the final approach to shape_lock15 — see REACTION-TIME
// AUDIT above for the exposure this deliberately creates at the door.
// waypoints[0] = (7.5,-25.5) — 13.5m from the nearest key (B) — see SPAWN
// FAIRNESS above.
const WAYPOINTS_F = patrol(
  [
    { x: 7.5, z: -25.5 },
    { x: 7.5, z: -18.5 },
    { x: -7.5, z: -18.5 },
    { x: -7.5, z: -25.5 },
  ],
  rb.colliders,
);

export const room15: RoomDef = {
  id: 'room15',
  name: 'the Sorting Room',
  floor: { minX: -9, maxX: 9, minZ: -29, maxZ: 6 },
  spawn: { x: 0, z: 5, yaw: 0 },
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    scrawl('no medicine here. only what\nyou carried in.', 'w', -9, 4),
    scrawl('something small waits\nwhere the wall turns', 'e', 9, -2),
    scrawl('he walks past it\nmore than he watches it', 'w', -9, -10),
    scrawl("the corner is the only\npart of you it can't own", 'e', 9, -18),
    scrawl('every one you take,\nanother of them arrives', 'n', -27, -3.5),
  ],
  interactables: [lock.door, lock.lock, ...lock.keys],
  iconPanels: [lock.iconPanel],
  lights: [
    { pos: [0, 4] },
    { pos: [0, 0] },
    { pos: [-6, -2.5] },
    { pos: [6, -2.5] },
    { pos: [0, -6.5] },
    { pos: [-4, -10] },
    { pos: [6, -10] },
    { pos: [0, -14] },
    { pos: [-4, -14.5] },
    { pos: [4, -18] },
    { pos: [-4, -18.5] },
    { pos: [0, -22] },
    { pos: [0, -25.5] },
  ],
  exits: [{ to: 'room16', minX: -1, maxX: 1, minZ: -28.9, maxZ: -27.1 }],
};

// Ordered escalation roster — index i spawns when the (i+1)th distinct key
// is collected. eyeTint assignments (with B/C's below) give five hues
// spread around the wheel, none matching a key color — see ESCALATION
// DESIGN above.
interface EscalationCfg {
  waypoints: Array<{ x: number; z: number }>;
  eyeTint: number;
  onWarnToast: string;
  spawnToast: string;
}

const ESCALATIONS: EscalationCfg[] = [
  {
    waypoints: WAYPOINTS_D,
    eyeTint: 0xb98aff,
    onWarnToast: 'and now a third.',
    spawnToast: "somewhere, a door you can't see opens.",
  },
  {
    waypoints: WAYPOINTS_E,
    eyeTint: 0xff6fd8,
    onWarnToast: 'four, and closing.',
    spawnToast: 'they know what you took.',
  },
  {
    waypoints: WAYPOINTS_F,
    eyeTint: 0x7fe8ff,
    onWarnToast: 'five. all of them, all at once.',
    spawnToast: 'the last of them. now it is just you and the door.',
  },
];

const KEY_IDS = new Set(['shapeKeyA', 'shapeKeyB', 'shapeKeyC']);

export type Room15Script = RoomScript & { onLeave?(ctx: GameCtx): void };

// Bearing from the player to a point, relative to the player's look yaw —
// same convention as every other orderly room's local copy.
function bearingTo(dx: number, dz: number, yaw: number): number {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const fwd = -dx * sin - dz * cos;
  const right = dx * cos - dz * sin;
  return Math.atan2(right, fwd);
}

export const room15Script: Room15Script = (() => {
  // Hand-written rather than makeOrderlyRoomScript: the escalation mechanic
  // (spawning a new Orderly mid-room, on a key pickup, keeping it alive
  // across a catch) has no equivalent in the kit's fixed-roster factory —
  // every other orderly room's population is fixed at onEnter. This mirrors
  // room12's hand-written N-orderly script, generalized to a dynamic count.
  let orderlyB: Orderly | null = null;
  let orderlyC: Orderly | null = null;
  let extra: Orderly[] = []; // D, E, F — grows as keys are collected
  let escalatedKeys = new Set<string>();

  function allOrderlies(): Orderly[] {
    const list: Orderly[] = [];
    if (orderlyB) list.push(orderlyB);
    if (orderlyC) list.push(orderlyC);
    return list.concat(extra);
  }

  function handleCaught(ctx: GameCtx): void {
    ctx.state.forceState('lucid');
    ctx.shiftFx();
    ctx.teleportPlayer(room15.spawn.x, room15.spawn.z);
    ctx.hud.toast('hands. a needle. "you dropped something," he says — you didn\'t.');
  }

  function spawnBaseOrderlies(ctx: GameCtx): void {
    orderlyB?.dispose();
    orderlyC?.dispose();
    orderlyB = new Orderly(
      ctx.scene,
      WAYPOINTS_B,
      ALL_OCCLUDERS,
      orderlyTelemetryCallbacks(ctx, {
        warnToast: 'he sees you.',
        chaseToast: 'run. or stop being visible.',
        onCaught: handleCaught,
      }),
      { colliders: ORDERLY_COLLIDERS },
    );
    orderlyC = new Orderly(
      ctx.scene,
      WAYPOINTS_C,
      ALL_OCCLUDERS,
      orderlyTelemetryCallbacks(ctx, {
        warnToast: 'so does he.',
        chaseToast: 'run. or stop being visible.',
        onCaught: handleCaught,
      }),
      { colliders: ORDERLY_COLLIDERS, eyeTint: 0xffb347 },
    );
    orderlyB.setWardState(ctx.state.state);
    orderlyC.setWardState(ctx.state.state);
  }

  // Spawns the next orderly in the ESCALATIONS roster (D, then E, then F),
  // a no-op past five. Called once per distinct key pickup — see onInteract.
  function escalate(ctx: GameCtx): void {
    const cfg = ESCALATIONS[extra.length];
    if (!cfg) return;
    const o = new Orderly(
      ctx.scene,
      cfg.waypoints,
      ALL_OCCLUDERS,
      orderlyTelemetryCallbacks(ctx, {
        warnToast: cfg.onWarnToast,
        chaseToast: 'run. or stop being visible.',
        onCaught: handleCaught,
      }),
      { colliders: ORDERLY_COLLIDERS, eyeTint: cfg.eyeTint },
    );
    o.setWardState(ctx.state.state);
    extra.push(o);
    ctx.hud.toast(cfg.spawnToast);
    ctx.telemetry.event('orderly_escalation', { count: allOrderlies().length });
  }

  const script: Room15Script = {
    onEnter(ctx) {
      spawnBaseOrderlies(ctx);
      extra = [];
      escalatedKeys = new Set();
      // Change #1 — the whole room is played unmedicated, regardless of
      // what state the player arrives in. Free (doesn't touch pills), same
      // trick room11/12 use at their first gate.
      ctx.state.forceState('unmed');
      ctx.shiftFx();
      ctx.hud.toast("raw, and staying that way. there's nothing left to dose you with.");
      ctx.hud.setObjective('three shapes. no medicine here. every one you take, another of them arrives.');
    },

    isAvailable(id) {
      return lock.isAvailable(id);
    },

    onInteract(id, ctx) {
      const handled = lock.handleInteract(id, ctx);
      if (handled && KEY_IDS.has(id) && !escalatedKeys.has(id)) {
        escalatedKeys.add(id);
        escalate(ctx);
      }
      return handled;
    },

    onStateChange(next) {
      for (const o of allOrderlies()) o.setWardState(next);
    },

    update(dt, _t, ctx) {
      const orderlies = allOrderlies();
      if (orderlies.length === 0) return;
      const p = ctx.playerPos();
      for (const o of orderlies) o.update(dt, p.x, p.z, ctx.state.state);

      const dists = orderlies.map((o) => Math.hypot(o.x - p.x, o.z - p.z));
      const level = Math.max(...orderlies.map((o) => o.watching));
      const dist = Math.min(...dists);
      const chasing = orderlies.some((o) => o.chasing);

      if (level > 0 || chasing) {
        // Chase-priority bearing selection: chasing beats watching, higher
        // watch-ramp beats lower, nearer breaks ties — same rule every
        // multi-orderly room in this game uses, folded over N candidates.
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
      orderlyB?.dispose();
      orderlyC?.dispose();
      for (const o of extra) o.dispose();
      orderlyB = null;
      orderlyC = null;
      extra = [];
    },
  };

  return script;
})();

export const debugPatrols: DebugPatrol[] = [
  { waypoints: WAYPOINTS_B, label: 'B' },
  { waypoints: WAYPOINTS_C, label: 'C' },
  { waypoints: WAYPOINTS_D, label: 'D' },
  { waypoints: WAYPOINTS_E, label: 'E' },
  { waypoints: WAYPOINTS_F, label: 'F' },
];
