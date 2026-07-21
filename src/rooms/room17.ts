import {
  RoomBuilder,
  dispenser,
  scrawl,
  keypadDoor,
  level,
  stairwell,
  heightZone,
  patrol,
  makeOrderlyRoomScript,
  randomCode4,
  codeClueText,
  isRandomizeCodesEnabled,
} from './kit';
import type { ColliderDef, RoomDef, ScrawlDef } from './kit';
import type { GameCtx } from '../game/context';
import type { DebugPatrol } from '../devtools/map-types';

// ROOM 17 — "the Gallery Ward". The wing's verticality spike: the first room
// that spends the true-stacked-floors engine (rooms/types.ts's
// LevelDef/StairwellDef, world.ts's resolveLevel/floorHeightAt, orderly.ts's
// cross-level LOS gate). Everything room11 faked by careful layout — "two
// walkable surfaces stacked at the same XZ column" — is here made literal:
// a railed GALLERY (balcony, y=3.4) hangs over a sealed POCKET (ground,
// y=0), the exact same x[-9,9] z[-6,10] rectangle at two heights, each with
// its own orderly, provably unable to perceive across the level boundary.
//
// DESIGN INTENT. Room16 ends; the player steps into a two-storey day ward.
// The floor reads wrong immediately: it obviously continues north, but a
// wall SEALS it at z=16 across the whole width — no keypad, no gate, no
// lucid trick, just wall, forever. The only way on is UP the east stairwell,
// across a gallery walkway suspended over a floor you never walked (the
// pocket, sealed off downstairs), and back DOWN a hole cut in the gallery's
// own decking (the west shaft) into that pocket, where the exit keypad and
// its code-clue live. Up, across, down — because the flat route was never on
// the table. Three orderlies keep the ward: ORDERLY-SOUTH (the approach),
// ORDERLY-BALCONY (the gallery) and ORDERLY-POCKET (the floor beneath it) —
// the last two share the exact same XZ footprint at 3.4 and 0, the capability
// this room exists to prove.
//
// TWO LEVELS (world.ts folds a no-`levels` room into an implicit '__flat'
// level; this room declares two):
//   ground   baseY 0    footprint x[-9,9]  z[-8,34]  (vestibule+pocket+hall)
//   balcony  baseY 3.4  footprint x[-9,9]  z[-6,10]  (overhangs the pocket)
// ceilingY 6.0 — balcony headroom 6.0 − 3.4 − 1.62 = 0.98m (~the 1m margin
// ROOM_AUTHORING.md recommends for a raised zone). The perimeter/pocket
// wall COLLIDERS are untagged, so they block a traveler on EITHER level
// (a wall is a wall on every floor); their meshes only reach y=3, so a band
// of upper-visual 'wall2' blocks (y3..6, no collider) closes the two-storey
// volume cosmetically. Enclosure is collision-correct regardless.
//
// GROUND, north→south (−Z→+Z):
//   Vestibule z[-8,-6]   exit → room18, glow marker
//   Pocket    z[-6,10]   keypad17 + exitdoor (north wall z=-6), code-clue
//                        scrawl, dispenser17c (west wall), ORDERLY-POCKET
//   Sealed wall z=16     wallX(-9,6,16)+wallX(8,9,16) — the room's thesis:
//                        NO gap except the east stair's own x[6,8] mouth
//   South Hall z[16,34]  spawn (0,32), dispenser17a (east wall), ORDERLY-SOUTH
// BALCONY: a railed walkway over the pocket; ORDERLY-BALCONY. Two openings:
// the east stair's landing (x[6,8], z=10, flush with the walkway's south
// edge) and the west shaft — a hole cut straight through the decking
// (x[-8,-6] z[4,8]), no slab there, so descending it means walking off the
// walkway into open air down to the pocket.
//
// STAIRWELLS (world.ts's floorHeightAt checks these before any level zone;
// resolveLevel flips a traveler's persistent level only when they FULLY
// clear a footprint end-to-end, never mid-stair):
//   stairEast  x[6,8]  z[10,16] axis z  balcony(3.4)@z10 → ground(0)@z16
//   stairWest  x[-8,-6] z[4,8]  axis z  balcony(3.4)@z4  → ground(0)@z8
// From the south hall the player enters the east mouth (z=16, ground),
// climbs north — floor rises to 3.4 at z=10, level flips to 'balcony' on
// arrival. From the balcony they walk south into the west shaft (z=4,
// balcony), descend — level flips to 'ground' at z>=8, landing at (-7,8).
//
// CROSS-LEVEL LOS PROOF (the thing this room is FOR). ORDERLY-BALCONY is
// constructed level:'balcony', ORDERLY-POCKET level:'ground'. Both have
// reachable footprints inside x[-9,9] z[-6,10] — the same rectangle — at
// y=3.4 and y=0. orderly.ts's updateSight gates on
// `playerState==='unmed' && playerLevel===this.level` BEFORE any
// distance/cone/occlusion math runs, and the contact-catch check carries the
// identical gate. So ORDERLY-BALCONY cannot enter watching/chasing against,
// or catch by touch, a player whose level is 'ground' — regardless of XZ
// distance, even standing directly beneath him — and vice versa. This is not
// "provably far enough" (room11's layout guarantee); it is categorical
// impossibility, cheaper than real 3D occlusion and strictly stronger. Each
// orderly is fixed to one level for life and never enters a StairwellDef
// footprint (see patrols below), so the gate is always well-defined.
//
// REACTION-TIME AUDIT (minInspectionDistance(2.5)=~8.2m; clearing it also
// clears the 6m raw sight range, so these spots are provably unseeable, not
// just usually safe — distance from the NEAREST reachable point on the
// relevant patrol):
//   • Code-clue scrawl, pocket north wall (~x1.5, z-5.9) vs ORDERLY-POCKET
//     (x∈[0,6]; nearest reachable (1.5,3)): 3−(−5.9) = 8.9m ✓
//   • West-shaft hint scrawl, balcony (~x-7.5, z3.5) vs ORDERLY-BALCONY
//     (x∈[2,6]; nearest (2,3.5)): 2−(−7.5) = 9.5m ✓
//   • keypad17: used only lucid (unmed keypads refuse input), and orderlies
//     are categorically inert vs a lucid player — no distance check needed,
//     true of every keypad in the game.
//   • dispenser17a, south hall east wall (9,31) vs ORDERLY-SOUTH (nearest
//     (5,25)): sqrt(4²+6²) = 7.2m — outside his 6m sight range outright.
//   Through-points (east mouth vs SOUTH, balcony landing vs BALCONY, west
//   landing vs POCKET) are crossings, not stand-and-read spots — held to the
//   same moving-target standard rooms 5-12 use, not the 8.2m rule.
//
// SOFT-LOCK AUDIT. EVERY collider in this room is states:'both' — there is
// no unmed-sealed gate anywhere (the sealed wall is a PERMANENT wall, not a
// paid gate), so circleHitsSolidUnmed can never find a trapped case, on
// either level, at any XZ. That makes the medication-timer audit
// unconditional:
//   • 45s timer expiring ON THE BALCONY (or mid-stair, or in the pocket):
//     if the player shifted lucid to duck ORDERLY-BALCONY's cone and the
//     meter hits zero on the walkway, updateMedication's
//     circleHitsSolidUnmed(…, player.level) finds nothing solid-while-unmed
//     there — the revert is instant and free, same as anywhere. The player
//     is merely exposed (normal tension, room13's precedent: "it's retries"),
//     never geometrically stuck. Interpolated stair Y and the pocket are the
//     same story.
//   • 0-pill entry to the pocket: the rational line never arrives with 0
//     (dispenser17a is free and on the only path out of spawn), but the law
//     requires survivability. dispenser17c sits at the west shaft's ground
//     landing (west wall, along=9), clear of ORDERLY-POCKET's loop — a
//     0-pill player refills there and proceeds. Not a soft-lock.
//   • Catches: every orderly forces lucid + teleports to spawn with an
//     EXPLICIT level:'ground' (via makeOrderlyRoomScript's spawn.level) —
//     a catch on the balcony returns you to the south hall AT GROUND LEVEL,
//     never to (0,32) while still flagged 'balcony' (see
//     GameCtx.teleportPlayer). Pills kept, as everywhere.
//
// PILL ECONOMY (TUNING.pills.max=1, binary). onEnter forces unmed (free,
// lucid→unmed always is). Top off at dispenser17a near spawn (guaranteed
// 1/1). Cross the hall, climb, cross the walkway, descend, read the code —
// all unmed, all free. Shift lucid ONCE at the keypad (1→0), open the door,
// leave. Net: exactly 1 pill, spent at the end — the room2/room5 shape; the
// novelty is entirely the crossing.
//
// CODE: 9137 (fresh — not 3175/2593/8563/4118/1907/6329/0452/5216/2846/7042,
// every value used or reserved elsewhere in the registry at authoring time).
//
// EXIT targets 'room18' (not yet built — deliberately; this branch lands
// before the 18/19 wiring pair). NOT registered in main.ts/map.ts here.

const FIXED_CODE = '9137';
const GROUND_Y = 0;
const BALCONY_Y = 3.4;
const CEIL = 6.0;
const WT = 0.24; // wall thickness (build.ts WALL_THICKNESS)
const WHT = WT / 2;

// Rerolls the code, the lock's expected entry, its wall clue, and its
// success flavor toast (same pattern as room11/room2's randomize wiring).
function regenerateCode(ctx: GameCtx): void {
  if (!isRandomizeCodesEnabled()) return;
  const code = randomCode4();
  lock.setCode(code, `${code}. two floors, one lock.`);
  ctx.updateScrawlText('codeScrawl', codeClueText(code));
}

const rb = new RoomBuilder();

// Upper-visual perimeter/interior band (y3..6, no collider) — the wall
// meshes below only reach y=3, so this closes the two-storey volume above
// them. Collision is always the ground colliders, which block every level.
function upperBandX(x0: number, x1: number, z: number): void {
  rb.block([x1 - x0, CEIL - 3, WT], [(x0 + x1) / 2, (3 + CEIL) / 2, z], 'wall2');
}
function upperBandZ(z0: number, z1: number, x: number): void {
  rb.block([WT, CEIL - 3, z1 - z0], [x, (3 + CEIL) / 2, (z0 + z1) / 2], 'wall2');
}

// --- ground shell ----------------------------------------------------------
// Perimeter (untagged colliders → block on both levels).
rb.wallX(-9, 9, 34); // south cap, behind spawn
rb.wallZ(-8, 34, -9); // west perimeter
rb.wallZ(-8, 34, 9); // east perimeter
upperBandZ(-8, 34, -9);
upperBandZ(-8, 34, 9);
upperBandX(-9, 9, 34);

// Pocket north wall, z=-6, door gap x[-1,1] (keypadDoor fills it).
rb.wallX(-9, -1, -6);
rb.wallX(1, 9, -6);
upperBandX(-9, 9, -6); // solid above — the door is a ground-level opening only

// Vestibule beyond the exit door, x[-1,1] z[-8,-6].
rb.wallZ(-8, -6, -1);
rb.wallZ(-8, -6, 1);
rb.wallX(-1, 1, -8);
rb.block([1.8, 2.6, 0.06], [0, 1.4, -7.82], 'glow'); // "way out" marker

// THE SEALED WALL, z=16 — the room's whole thesis. No gap but the east
// stair's x[6,8] mouth. Permanent, states:'both' (never a paid gate).
rb.wallX(-9, 6, 16);
rb.wallX(8, 9, 16);
upperBandX(-9, 6, 16);
upperBandX(8, 9, 16);

// --- stairwells (walkable surfaces + flanking walls + stepped visuals) ------
// East stair: x[6,8] z[10,16], balcony(3.4)@z10 → ground(0)@z16. Flanked by
// full-height walls on both long sides (inner x=6, outer x=8 closing the 1m
// gap to the east perimeter at x=9). Tall (y0..6) so they enclose the run to
// the balcony landing, not just to y3.
function tallWallZ(z0: number, z1: number, x: number): void {
  rb.block([WT, CEIL, z1 - z0], [x, CEIL / 2, (z0 + z1) / 2], 'wall2');
  rb.colliders.push({ minX: x - WHT, maxX: x + WHT, minZ: z0, maxZ: z1 });
}
tallWallZ(10, 16, 6);
tallWallZ(10, 16, 8);
const STAIR_EAST = stairwell('stairEast', 6, 8, 10, 16, 'z', BALCONY_Y, 'balcony', GROUND_Y, 'ground');

// West shaft: x[-8,-6] z[4,8], balcony(3.4)@z4 → ground(0)@z8. A hole cut in
// the balcony decking (no slab spans it — see the slab pieces below), so its
// long sides are open air on the balcony, not walls; the flanking full-height
// wall is only the west perimeter (x=-9) it hugs. No railing around it (spec:
// the descent is walking off the edge into the shaft).
const STAIR_WEST = stairwell('stairWest', -8, -6, 4, 8, 'z', BALCONY_Y, 'balcony', GROUND_Y, 'ground');

// Stepped visual stand-ins (BlockDef has no X-tilt — the walkable slope is
// smooth via the StairwellDef; these just read as stairs), full 2m width.
const EAST_STEPS = 6;
for (let i = 0; i < EAST_STEPS; i++) {
  // z=16 (ground) → z=10 (balcony): step i covers z[16-i-1, 16-i], top rises.
  const top = (BALCONY_Y * (i + 1)) / EAST_STEPS;
  const zc = 16 - i - 0.5;
  rb.block([2, top, 1], [7, top / 2, zc], 'wall2');
}
const WEST_STEPS = 5;
for (let i = 0; i < WEST_STEPS; i++) {
  // z=8 (ground) → z=4 (balcony): step i covers z[8-(i+1)*0.8, 8-i*0.8].
  const top = (BALCONY_Y * (i + 1)) / WEST_STEPS;
  const zc = 8 - i * 0.8 - 0.4;
  rb.block([2, top, 0.8], [-7, top / 2, zc], 'wall2');
}

// --- balcony floor slab (opaque box; its underside IS the pocket ceiling) ---
// Footprint x[-9,9] z[-6,10] minus the west-shaft hole x[-8,-6] z[4,8].
const SLAB_TOP = BALCONY_Y;
const SLAB_TH = 0.3;
const slabYc = SLAB_TOP - SLAB_TH / 2;
function slab(minX: number, maxX: number, minZ: number, maxZ: number): void {
  rb.block([maxX - minX, SLAB_TH, maxZ - minZ], [(minX + maxX) / 2, slabYc, (minZ + maxZ) / 2], 'wall2');
}
slab(-9, -8, -6, 10); // west sliver, west of the hole
slab(-6, 9, -6, 10); // everything east of the hole
slab(-8, -6, -6, 4); // north of the hole
slab(-8, -6, 8, 10); // south of the hole
// (hole x[-8,-6] z[4,8] left open)

// Balcony walkable surface (scoped to the balcony level). Stairwells override
// this where they overlap (the west shaft), so the hole reads as descent, not
// flat floor.
const BALCONY_ZONE = heightZone(-9, 9, -6, 10, BALCONY_Y);

// --- railings (level-tagged colliders + low visual chain at balcony height) -
function railingBlock(minX: number, maxX: number, z: number): void {
  rb.block([maxX - minX, 0.9, WT], [(minX + maxX) / 2, BALCONY_Y + 0.45, z], 'chain');
}
// South edge z=10 — open drop to the pocket, EXCEPT the east landing gap
// x[6,8]. Balcony-only, so ground travelers below are unaffected.
rb.colliders.push({ minX: -9, maxX: 6, minZ: 9.88, maxZ: 10.12, level: 'balcony' });
rb.colliders.push({ minX: 8, maxX: 9, minZ: 9.88, maxZ: 10.12, level: 'balcony' });
railingBlock(-9, 6, 10);
railingBlock(8, 9, 10);
// North door-gap x[-1,1] at z=-6 — the pocket north WALLS already block the
// rest of this edge on every level; only the door gap needs a balcony rail
// (a balcony traveler must not walk out over the vestibule).
rb.colliders.push({ minX: -1, maxX: 1, minZ: -6.12, maxZ: -5.88, level: 'balcony' });
railingBlock(-1, 1, -6);

// Landing seam guard: a GROUND-only strip that keeps a ground pocket
// traveler from stepping off the pocket floor into the east stairwell's
// footprint (a 3.4m instant lift — floorHeightAt returns the stair's yLow
// the instant z>=10, no gradual climb, since the pocket approach never
// walked the ramp). BUG FIX (playtest: "invisible wall at the top of the
// stairs"): the original guard, z[9.9,10.1], straddled z=10 itself. The
// climber arriving from the south hall is ALSO level:'ground' for the
// entire ascent — resolveLevel only flips on FULLY CLEARING the stairwell
// (reaching z<=10) — so a guard whose radius-expanded footprint
// (z[9.55,10.45] at player.radius 0.35) covers z=10 makes that arrival
// physically unreachable: he gets pushed back before ever landing at
// z<=10, the flip never fires, and he's walled out of the balcony forever.
// Fix: keep the guard entirely south of z=10 with margin (maxZ + radius =
// 9.75, well clear of 10 even accounting for a worst-case single-frame
// overshoot — main.ts clamps dt to 0.05s, so at player.speed 3.4 the
// biggest possible step is 0.17m), and start its X range past x=6.6 rather
// than the stair's full x[6,8] width so it stays >0.5m (orderly.radius 0.4
// + patrol()'s 0.1 margin) from ORDERLY-POCKET's (6,9) waypoint/leg. The
// dropped west sliver (x[6,6.6]) isn't an open gap: the flanking stair wall
// (tallWallZ at x=6, z[10,16]) already blocks x<6.47 (radius-expanded) down
// to z=9.65, and this guard's own radius-expanded zone starts at x=6.25 —
// the two overlap with no seam, so the sneak is still closed end to end.
// Balcony travelers (level:'balcony') are never subject to this collider
// and descend the stair normally.
rb.colliders.push({ minX: 6.6, maxX: 8, minZ: 9.1, maxZ: 9.4, level: 'ground' });

// --- keypad-locked exit door (north wall of the pocket, z=-6) ---------------
const lock = keypadDoor(rb, {
  doorId: 'exitdoor',
  keypadId: 'keypad17',
  code: FIXED_CODE,
  side: 'n',
  wallAt: -6,
  along: 0,
  keypadAlong: 1.35,
  doorLabel: 'the exit door',
  successToast: `${FIXED_CODE}. two floors, one lock.`,
  successObjective: 'the door is open. go.',
});

// Per-level collider sets — patrol() is a 2D validator with no notion of
// level (see kit.ts), so it sees the UNION of every collider unless filtered.
// Passing each orderly the colliders active on HIS level keeps the check
// meaningful (a balcony patrol isn't spuriously flagged against a ground-only
// railing, and vice versa) and mirrors exactly what tryMove's isActiveOnLevel
// does at runtime. (Movement itself is already correct via each Orderly's own
// level, but the validator can't see that — so we filter here.)
const groundColliders: ColliderDef[] = rb.colliders.filter((c) => c.level === undefined || c.level === 'ground');
const balconyColliders: ColliderDef[] = rb.colliders.filter((c) => c.level === undefined || c.level === 'balcony');

// --- scrawls ----------------------------------------------------------------
function atLevel(s: ScrawlDef, lvl: string): ScrawlDef {
  return { ...s, level: lvl };
}

const codeScrawls: ScrawlDef[] = [
  atLevel(scrawl('the last door\nremembers this:', 'n', -6, -1.6, { size: 2.4 }), 'ground'),
  atLevel(scrawl('9 1 3 7', 'n', -6, 1.6, { big: true, id: 'codeScrawl' }), 'ground'),
];

export const room17: RoomDef = {
  id: 'room17',
  name: 'the Gallery Ward',
  floor: { minX: -9, maxX: 9, minZ: -8, maxZ: 34 },
  spawn: { x: 0, z: 32, yaw: 0, level: 'ground' },
  ceilingY: CEIL,
  levels: [
    level('ground', GROUND_Y, { minX: -9, maxX: 9, minZ: -8, maxZ: 34 }),
    level('balcony', BALCONY_Y, { minX: -9, maxX: 9, minZ: -6, maxZ: 10 }, { heightZones: [BALCONY_ZONE] }),
  ],
  stairwells: [STAIR_EAST, STAIR_WEST],
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    // South hall flavor (ground) — set the "they raised the roof" beat.
    atLevel(scrawl('they raised the roof\nso no one has to share a floor', 'e', 9, 24, { size: 2.6 }), 'ground'),
    atLevel(scrawl('the stairs are the only door\nthat opens both ways', 'w', -9, 22, { size: 2.6 }), 'ground'),
    // West-shaft hint (balcony) — the timing tell for ORDERLY-POCKET below.
    atLevel(
      scrawl('his floor creaks the same beat, every lap.\nseven strides north, he turns.', 'w', -9, 3.5, {
        y: BALCONY_Y + 1.65,
        size: 2.8,
      }),
      'balcony',
    ),
    ...codeScrawls,
  ],
  interactables: [
    // South hall, east wall — the room's only pre-lucid dispenser, near spawn,
    // outside ORDERLY-SOUTH's z∈[18,25] loop and his 6m sight range (7.2m).
    dispenser({ id: 'dispenser17a', side: 'e', wallAt: 9, along: 31, label: 'use the dispenser' }),
    // Pocket, west wall by the west shaft's ground landing — the pressure-rule
    // dispenser (one per sealed pocket, near the near end): the pocket has no
    // walk-back to dispenser17a (sealed wall + one-way stair), so a mistimed
    // revert here refills at the entry point instead of retracing the crossing.
    { ...dispenser({ id: 'dispenser17c', side: 'w', wallAt: -9, along: 9, label: 'use the dispenser' }), level: 'ground' },
    lock.door,
    lock.keypad,
  ],
  lights: [
    { pos: [0, 32] },
    { pos: [0, 26] },
    { pos: [0, 20] },
    { pos: [7, 13] }, // east stair
    { pos: [4, 4] }, // pocket
    { pos: [-4, 0] }, // pocket
    { pos: [-6, 6] }, // west shaft mouth
    { pos: [0, -3] }, // pocket north
    { pos: [4, 6] }, // balcony (light at 2.7 lifts the gallery a little)
    { pos: [-2, -2] },
  ],
  exits: [{ to: 'room18', minX: -1, maxX: 1, minZ: -7.9, maxZ: -6.8 }],
};

// --- patrols ----------------------------------------------------------------
// ORDERLY-SOUTH (ground) — the approach. Back-and-forth across the south hall;
// the crossing to the east stair mouth (x≈7,z=16) is a through-point.
const WAYPOINTS_SOUTH = patrol(
  [
    { x: 5, z: 25 },
    { x: 5, z: 18 },
    { x: -5, z: 18 },
    { x: -5, z: 25 },
  ],
  groundColliders,
);

// ORDERLY-BALCONY (balcony) — the gallery. Confined to x∈[2,6], well clear of
// the west shaft (x[-8,-6]) and the hint scrawl at (-7.5,3.5).
const WAYPOINTS_BALCONY = patrol(
  [
    { x: 6, z: 8 },
    { x: 6, z: -4 },
    { x: 2, z: -4 },
    { x: 2, z: 8 },
  ],
  balconyColliders,
);

// ORDERLY-POCKET (ground) — the floor beneath the gallery. Confined to
// x∈[0,6], clear of the west wall (dispenser17c) and the code scrawl's
// safe-reading math.
const WAYPOINTS_POCKET = patrol(
  [
    { x: 6, z: 9 },
    { x: 6, z: 3 },
    { x: 0, z: 3 },
    { x: 0, z: 9 },
  ],
  groundColliders,
);

export const room17Script = makeOrderlyRoomScript({
  orderlies: [
    {
      waypoints: WAYPOINTS_SOUTH,
      occluders: [],
      level: 'ground',
      onWarnToast: 'the one in the hall sees you.',
      onChaseToast: 'run. or stop being visible.',
      onCaughtToast: 'hands. a needle. "not even past the stairs," he says.',
    },
    {
      waypoints: WAYPOINTS_BALCONY,
      occluders: [],
      level: 'balcony',
      floorHeightAt: () => BALCONY_Y, // his whole loop is on the gallery deck
      onWarnToast: 'the one on the gallery sees you.',
      onChaseToast: 'nowhere up here but the way you came.',
      onCaughtToast: 'hands. a needle. "the floor\'s not for guests," he says.',
    },
    {
      waypoints: WAYPOINTS_POCKET,
      occluders: [],
      level: 'ground',
      onWarnToast: 'the one below the gallery sees you.',
      onChaseToast: 'run. or stop being visible.',
      onCaughtToast: 'hands. a needle. "back where the light doesn\'t reach," he says.',
    },
  ],
  colliders: rb.colliders,
  // Explicit level:'ground' — a catch anywhere (balcony included) returns the
  // player to the south hall AT GROUND LEVEL, never to (0,32) still flagged
  // 'balcony' (see the soft-lock audit / GameCtx.teleportPlayer).
  spawn: { x: 0, z: 32, level: 'ground' },
  onEnterObjective: 'the day room stacks itself. climb before you can cross.',
  unmedToast: 'three of them keep this ward. none of them use the stairs the way you do.',
  extraScript: {
    onEnter(ctx) {
      regenerateCode(ctx);
      // Forced unmed at the threshold — free (lucid→unmed always is), matching
      // every ward's "you come to mid-stride, raw" convention; guarantees the
      // one lucid spend happens at the keypad, not carried in from room16.
      ctx.state.forceState('unmed');
      ctx.shiftFx();
      ctx.hud.toast("you come to mid-stride, raw. this ward doesn't stay on one floor.");
    },
    isAvailable: (id) => lock.isAvailable(id),
    onInteract: (id, ctx) => lock.handleInteract(id, ctx),
    onCaught: (ctx) => regenerateCode(ctx),
  },
});

export const debugPatrols: DebugPatrol[] = [
  { waypoints: WAYPOINTS_SOUTH, label: 'south', level: 'ground' },
  { waypoints: WAYPOINTS_BALCONY, label: 'balcony', level: 'balcony' },
  { waypoints: WAYPOINTS_POCKET, label: 'pocket', level: 'ground' },
];
