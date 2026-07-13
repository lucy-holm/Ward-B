// KIT COMPILE CHECK — not a room. Never imported by main.ts or any room
// file; nothing here is registered with the game. Its only jobs are:
//
//   1. Prove src/rooms/kit.ts actually type-checks end to end (`npm run
//      build`'s `tsc --noEmit` step walks this file because it's under
//      src/, even though it's excluded from the shipped bundle — nothing
//      imports it, so Rollup's tree-shaking drops it entirely; see the
//      bundle-size note in ROOM_AUTHORING.md).
//   2. Be the exact source of ROOM_AUTHORING.md's "worked example" section
//      (the "with kit" half). If you're reading this looking for a template
//      to copy for a new room, this is it — a small orderly room with a
//      keypad door, a dispenser, two scrawls, and a validated patrol loop,
//      end to end, in well under 100 lines.
//
// Every geometry decision below is arithmetically identical to the
// hand-written pattern in room5.ts/room7.ts/room8.ts (see kit.ts's comments
// for the derivation) — a room built this way is indistinguishable in play
// from one built by hand.

import {
  RoomBuilder,
  dispenser,
  scrawl,
  keypadDoor,
  patrol,
  makeOrderlyRoomScript,
  type OrderlyAABB,
  type RoomDef,
} from './kit';

const CODE = '1234';

const rb = new RoomBuilder();

// shell, x [-6,6] z [-6,5] (south = spawn, north = staff door)
rb.wallX(-6, 6, 5); // south cap, behind spawn
rb.wallZ(-6, 5, -6); // west wall
rb.wallZ(-6, 5, 6); // east wall
rb.wallX(-6, -1, -6); // north, west of the staff-door gap
rb.wallX(1, 6, -6); // north, east of the staff-door gap

// vestibule beyond the staff door, x [-1,1] z [-8,-6]
rb.wallZ(-8, -6, -1);
rb.wallZ(-8, -6, 1);
rb.wallX(-1, 1, -8);
rb.block([1.8, 2.6, 0.06], [0, 1.4, -7.94], 'glow'); // warm glow beyond the exit

// central island — occluder, collider, and the patrol loop's only shadow.
const ISLAND: OrderlyAABB = { minX: -1.8, maxX: 1.8, minZ: -1.1, maxZ: 1.1 };
rb.solid(ISLAND.minX, ISLAND.maxX, ISLAND.minZ, ISLAND.maxZ);
rb.block([1.4, 1.8, 0.7], [0, 0.9, 0], 'wall2'); // its visible mass

// the lock assembly: door + closure-held collider + standard onInteract flow,
// one call. Pushes the door's collider into rb.colliders itself.
const lock = keypadDoor(rb, {
  doorId: 'exitdoor',
  keypadId: 'keypad_demo',
  code: CODE,
  side: 'n',
  wallAt: -6,
  along: 0,
  keypadAlong: 1.35,
  doorLabel: 'the exit door',
  successToast: '1234. someone counted on their fingers.',
});

export const _kitcheckRoom: RoomDef = {
  id: '_kitcheck',
  floor: { minX: -6, maxX: 6, minZ: -8, maxZ: 5 },
  spawn: { x: 0, z: 4, yaw: 0 },
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    scrawl('the closet remembers\nwhat it held', 'w', -6, -2, { size: 2.4 }),
    scrawl('1 2 3 4', 's', 5, -3.5, { big: true }),
  ],
  interactables: [
    dispenser({ id: 'dispenser_demo', side: 'w', wallAt: -6, along: 3.5, label: 'use the dispenser' }),
    lock.door,
    lock.keypad,
  ],
  lights: [{ pos: [0, 3.5] }, { pos: [0, 0] }, { pos: [0, -3.5] }, { pos: [0, -7] }],
  exits: [{ to: 'END', minX: -1, maxX: 1, minZ: -7.9, maxZ: -6.8 }],
};

// Patrol loop around the island — validated against the room's own colliders
// (including the still-locked door) at module init. If this line doesn't
// throw, the loop is clear by >0.5m everywhere, including every leg, not
// just the waypoints — the room7/room8 wedge bug can't ship silently.
const WAYPOINTS = patrol(
  [
    { x: 4, z: 2.2 },
    { x: 4, z: -2.2 },
    { x: -4, z: -2.2 },
    { x: -4, z: 2.2 },
  ],
  rb.colliders,
);

export const _kitcheckScript = makeOrderlyRoomScript({
  orderlies: [{ waypoints: WAYPOINTS, occluders: [ISLAND] }],
  colliders: rb.colliders,
  spawn: _kitcheckRoom.spawn,
  onEnterObjective: 'the supply closet. the code is written where he can’t reach it.',
  catchToast: 'hands. a needle. "back on the shelf," he says.',
  extraScript: {
    isAvailable: (id) => lock.isAvailable(id),
    onInteract: (id, ctx) => lock.handleInteract(id, ctx),
  },
});
