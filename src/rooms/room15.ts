import { RoomBuilder, dispenser, scrawl, shapeLockDoor, patrol, makeOrderlyRoomScript } from './kit';
import type { ColliderDef, RoomDef } from './kit';
import type { OrderlyAABB } from '../game/orderly';
import type { DebugPatrol } from '../devtools/map-types';

// ROOM 15 — the Sorting Room (spec: 2026-07-19-room15-shape-keys-design).
// First room past the epilogue wing. Three unmed-only shape props (blue
// circle / green square / red triangle) sit in L-shaped dogleg alcoves off
// the west/east walls; the exit is a new fixture, shape_lock — lucid-only
// to touch, no code, opens once all three are held. Getting caught costs a
// walk back to spawn (forced lucid, teleport, pills AND keys kept — the
// design's one hard requirement: a catch never un-collects a key). The
// three alcoves escalate:
//
//   Key A (blue circle)    — Z1, no orderly at all. Teaches the dogleg beat:
//                             walk in, round a corner you can't see past
//                             from the mouth, take the shape.
//   Key B (green square)   — Z2, orderly B's loop has exactly one leg that
//                             walks dead-on at the mouth; three of his four
//                             legs face away from it entirely. Cross lucid
//                             (free, invisible), go raw at the mouth, read
//                             his loop, dash in on his safe legs.
//   Key C (red triangle)   — Z3, orderly C hugs the mouth on a short, fast
//                             loop with little warning runway — the real
//                             timed dash. leg2 (both guarded alcoves) is
//                             the sole occluder AABB for its orderly, so
//                             it's provably unseeable regardless of his
//                             facing/position — that's also where the
//                             pickup interaction itself happens; leg1 is
//                             transited, not stood in.
//
// No unmed-sealed wall exists anywhere in this room (unlike rooms 10-12) —
// the forced oscillation comes from the keys' unmed-only existence and two
// patrols, not from a gate. The only hard gate is shape_lock15 itself, and
// it only blocks forward progress, never backward movement.
//
// SOFT-LOCK AUDIT:
// - dispenser15a sits in Z0/Z1, before any threat exists — reachable from
//   spawn with zero risk regardless of pill count.
// - dispenser15b sits south of orderly B's loop (its recess mouth, z:[-7.4,
//   -5.8], is outside both alcoves and >2.8m from his nearest waypoint) —
//   reachable from the Z1/Z2 boundary without crossing his covered floor.
// - dispenser15c sits in Z4, which no orderly ever enters (orderly C's loop
//   never goes north of z=-18).
// - The medication timer expiring inside leg2 (either guarded alcove) is
//   safe unconditionally: leg2 is the sole occluder AABB passed to that
//   alcove's orderly, so segmentHitsAABB reports occluded for any point
//   inside it regardless of facing/position — nothing can see in, so a
//   free lucid->unmed revert there is never a trap. Expiring in leg1, the
//   open floor, or mid-dash is ordinary orderly exposure — same risk as
//   walking there in the first place, and a catch is a costly re-cross,
//   never a dead end (pills AND keys kept).
// - shape_lock15 is the only hard gate and only blocks forward progress
//   (through the door) — a player can always retreat from it.
//
// REACTION-TIME AUDIT: the standard ~8.2m rule (minInspectionDistance())
// targets forced, static inspection points with no ability to scout the
// threat first — it doesn't describe a mobile player choosing their own
// entry timing into a dogleg. Splitting by what each spot actually is:
// - leg2 (both guarded alcoves) — provably safe by occlusion, not just
//   distance (see the medication bullet above); this is also where the
//   pickup interaction happens, not leg1.
// - leg1 (both guarded alcoves) — deliberately exposed. Key B's mouth face
//   sits 1.68m from orderly B's nearest waypoint (7.2,-10) (dead-on
//   approach leg); Key C's mouth face sits 1.28m from orderly C's
//   (-7.6,-18). Both fail 8.2m outright, on purpose: worst-case reaction if
//   caught walking in blind on the dead-on leg is ~0.99s (B) / ~0.90s (C) —
//   genuinely too fast to react to cold. The room never asks for a blind
//   entry: both loops telegraph their dangerous leg (he turns and walks
//   straight at the alcove) with a much longer safe window on the other
//   three legs, and the player chooses when to commit.
// - Key A's alcove — no orderly in Z1 at all; vacuous by construction.
// - shape_lock15 / dispenser15c / the icon panel — Z4 has no orderly; safe
//   unconditionally, same as room10's final keypad chamber.
// - dispenser15a / dispenser15b sit outside both orderlies' patrol
//   footprints entirely — safe by distance.

const rb = new RoomBuilder();

// perimeter shell — floor x[-9,9] z[-29,6] (vestibule included), spawn end
// at +z (south). West/east walls broken only at alcove/recess mouths.
rb.wallX(-9, 9, 6); // south cap, behind spawn

// west wall (x=-9) — gaps at Key A's mouth z:[-3.4,-1.8], dispenser15b's
// recess mouth z:[-7.4,-5.8], Key C's mouth z:[-18.8,-17.2].
rb.wallZ(-27, -18.8, -9);
rb.wallZ(-17.2, -7.4, -9);
rb.wallZ(-5.8, -3.4, -9);
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

// --- Key A (blue circle) — west wall, safe dogleg, no orderly anywhere near Z1.
// leg1 (visible from the room): x:[-10.8,-9] z:[-3.4,-1.8]. leg2 (blind,
// turns south): x:[-10.8,-9.4] z:[-1.8,0.0]. The gap connecting them sits at
// leg1's far/blind end (x near -10.8), not near the mouth, so the turn can't
// be seen or shortcut from the mouth.
rb.wallX(-10.8, -9, -3.4); // leg1 north bracket
rb.wallX(-9.4, -9, -1.8); // leg1 south wall, solid strip near the mouth only
rb.wallZ(-3.4, 0.0, -10.8); // leg1 west cap + leg2 west wall, one continuous run
rb.wallZ(-1.8, 0.0, -9.4); // leg2 east wall
rb.wallX(-10.8, -9.4, 0.0); // leg2 south end cap
rb.block([0.12, 0.14, 1.6], [-9, 2.7, -2.6], 'glow'); // mouth lintel

// --- dispenser15b's recess — a shallow straight nook (open question #4:
// leaning straight per room10's ALCOVE_B precedent; it's a dispenser, not a
// key, so it doesn't need the dogleg motif).
rb.wallX(-10.14, -9, -7.4); // recess north bracket
rb.wallX(-10.14, -9, -5.8); // recess south bracket
rb.wallZ(-7.4, -5.8, -10.14); // recess end cap — the dispenser mounts here
rb.block([0.12, 0.14, 1.6], [-9, 2.7, -6.6], 'glow'); // mouth lintel

// --- Key B (green square) — east wall, patrol-reading dogleg. leg1:
// x:[9,10.8] z:[-10.8,-9.2]. leg2 (blind, turns north): x:[9.4,10.8]
// z:[-12.6,-10.8]. Mirrors Key A's topology, reflected onto the east wall.
rb.wallX(9, 9.4, -10.8); // leg1 north wall, solid strip near the mouth only
rb.wallX(9, 10.8, -9.2); // leg1 south bracket
rb.wallZ(-12.6, -9.2, 10.8); // leg1 east cap + leg2 east wall, one continuous run
rb.wallZ(-12.6, -10.8, 9.4); // leg2 west wall
rb.wallX(9.4, 10.8, -12.6); // leg2 north end cap
rb.block([0.12, 0.14, 1.6], [9, 2.7, -10.0], 'glow'); // mouth lintel

// leg2 only — the sole occluder AABB passed to orderly B (see below).
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

// leg2 only — the sole occluder AABB passed to orderly C (see below).
const LEG2_C: OrderlyAABB = { minX: -10.8, maxX: -9.4, minZ: -20.6, maxZ: -18.8 };

// --- shape lock assembly — the door, the shape_lock wall fixture, all three
// shapeKeyProp pickups, and the icon panel, bundled by one kit call. Owns
// the held-set; a catch never touches it (see SOFT-LOCK AUDIT above).
const lock = shapeLockDoor(rb, {
  doorId: 'exitdoor',
  side: 'n',
  wallAt: -27,
  along: 0,
  doorLabel: 'the exit door',

  lockId: 'shape_lock15',
  lockAlong: 1.35,
  lockLabel: 'use the lock',

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

  refusalToastUnmed:
    "the lock is a smear of static. it's not reading shapes right now — it's not reading anything.",
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
// ~=22.3s at TUNING.orderly.speed (1.5 m/s).
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
const WAYPOINTS_C = patrol(
  [
    { x: 1.5, z: -18 },
    { x: -7.6, z: -18 },
    { x: -7.6, z: -14.4 },
    { x: 1.5, z: -14.4 },
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
    scrawl('something small waits\nwhere the wall turns', 'e', 9, -2),
    scrawl('he walks past it\nmore than he watches it', 'w', -9, -10),
    scrawl("the corner is the only\npart of you it can't own", 'e', 9, -18),
    scrawl('it wants three shapes back', 'n', -27, -3.5),
  ],
  interactables: [
    dispenser({ id: 'dispenser15a', side: 'w', wallAt: -9, along: 4, label: 'use the dispenser' }),
    dispenser({ id: 'dispenser15b', side: 'w', wallAt: -10.14, along: -6.6, label: 'use the dispenser' }),
    dispenser({ id: 'dispenser15c', side: 'w', wallAt: -9, along: -24, label: 'use the dispenser' }),
    lock.door,
    lock.lock,
    ...lock.keys,
  ],
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

export const room15Script = makeOrderlyRoomScript({
  orderlies: [
    { waypoints: WAYPOINTS_B, occluders: [LEG2_B] },
    { waypoints: WAYPOINTS_C, occluders: [LEG2_C] },
  ],
  colliders: ORDERLY_COLLIDERS,
  spawn: room15.spawn,
  onEnterObjective: 'the sorting room. it wants three shapes back before it lets you go.',
  catchToast: 'hands. a needle. "you dropped something," he says — you didn\'t.',
  extraScript: {
    isAvailable: (id) => lock.isAvailable(id),
    onInteract: (id, ctx) => lock.handleInteract(id, ctx),
  },
});

export const debugPatrols: DebugPatrol[] = [
  { waypoints: WAYPOINTS_B, label: 'B' },
  { waypoints: WAYPOINTS_C, label: 'C' },
];
