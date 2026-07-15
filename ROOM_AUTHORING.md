# Ward B — Room Authoring Guide

This is the guide for building new rooms with `src/rooms/kit.ts`, the
authoring kit that sits on top of the engine's raw room machinery
(`src/rooms/build.ts`, `src/rooms/types.ts`, `src/game/orderly.ts`,
`src/ui/keypad.ts`). It's written for someone who can read the codebase but
hasn't built a room in it yet.

The kit **does not change anything** about how rooms 1–10 work, and you don't
need it to keep editing them. It exists so a *new* room can be written in a
few dozen lines instead of a few hundred, without hand-deriving wall-face
arithmetic or copy-pasting the orderly/threat-aggregation boilerplate that
room7/room8 already got right. A room built with the kit is **runtime-
identical** to one written by hand the room4–room8 way — same `RoomDef`
shape, same `RoomScript` callbacks, same toasts/telemetry/collider tricks.

Table of contents:

1. [Mental model](#1-mental-model)
2. [Coordinate conventions](#2-coordinate-conventions)
3. [Worked example: raw vs. kit](#3-worked-example-raw-vs-kit)
4. [Checklist of invariants](#4-checklist-of-invariants)
5. [Registering a room](#5-registering-a-room)
6. [Running it](#6-running-it)
7. [Kit API reference](#7-kit-api-reference)
8. [Verticality](#8-verticality)

---

## 1. Mental model

A room is two separate objects that main.ts wires together:

- **`RoomDef`** (`src/rooms/types.ts`) is pure data: geometry (`blocks`,
  `colliders`), decoration (`scrawls`), things the player can click on
  (`interactables`), `lights`, `exits`, and the `spawn` point. Nothing in a
  `RoomDef` executes — `World.loadRoom` just reads it and builds meshes.
- **`RoomScript`** is behavior: `onEnter`, `isAvailable`, `onInteract`,
  `onStateChange`, `update`. This is where tutorial beats, keypad codes,
  and orderlies live. Some rooms (any with an orderly) also export an
  `onLeave(ctx)` — not part of the frozen `RoomScript` interface, so those
  rooms export a locally-widened type (`RoomScript & { onLeave?(ctx) }`) and
  main.ts calls it if present. `makeOrderlyRoomScript` does this for you.

`RoomBuilder` (`build.ts`) is the one shared helper both raw rooms and kit
rooms use to accumulate `blocks`/`colliders` while you author walls:
`wallX`/`wallZ` add a wall (mesh + collider together, 0.24m thick, faces sit
±0.12m from the centerline you pass in); `block` adds mesh-only geometry;
`solid` adds a collider with no mesh (for furniture whose mesh you add
separately, e.g. an island's decorative top sitting on a wider footprint
collider).

**The economy the game is built around**, so new rooms don't break it:

- The player starts **unmed**. Unmed is the state that reads the walls
  (scrawls only render in the `unmed` group) but is visible to orderlies.
  **Lucid** is the state machinery reads (keypads refuse input while unmed —
  "a smear of static") but orderlies can never see you and any active chase
  ends the instant you shift.
- Shifting unmed→lucid costs one pill; lucid→unmed is free. `state.canShift`
  gates whether shifting is available at all (set by early tutorial rooms).
  Every room that gates progress behind a lucid-only action (a keypad, most
  obviously) needs **at least one dispenser reachable without needing to
  already be lucid** — otherwise a player who arrives at 0 pills is stuck.
  This is the single most important economy rule for a new room: **one
  reachable dispenser per lucid-gated action**, full stop.
- Orderlies are invisible and inert while lucid; they patrol, watch, and
  chase only while the player is unmed. `TUNING.orderly` (`src/tuning.ts`)
  has the numbers: 6m sight range, 55° cone, 0.6s grace before a chase
  starts, 4.3 m/s chase speed (vs. the player's 3.4 m/s — you cannot outrun
  him, shifting lucid is the only escape), 0.55m catch radius, 0.4m body
  radius.

## 2. Coordinate conventions

- **Y is up.** Floor is y=0, eye height ~1.62, wall height 3, wall vertical
  center 1.5. Fixtures (dispenser/keypad) sit at y≈1.45; scrawls at y≈1.6–1.7.
- **+Z is usually "toward spawn."** Every shipped room spawns the player at
  the high-Z end of the floor and puts its staff/exit door at the low-Z
  (north) end — the room's content lives between spawn and the door, i.e. in
  -Z. The kit's `WallSide` ('n'/'s'/'e'/'w') assumes this: `n` = the far
  (north, -Z) wall, room extends toward +Z from it; `s` = the near (south,
  +Z) wall, behind spawn; `w`/`e` follow the obvious x-axis compass reading.
  This is a convention, not an engine rule — you *can* spawn facing -Z, but
  nothing in the kit will make that pleasant, so don't.
- **Walls are 0.24m thick**, centered on the coordinate you pass to
  `wallX`/`wallZ`; each face sits exactly ±0.12m from that coordinate. This
  is `WALL_HALF_THICKNESS`, exported from `build.ts` — every kit fixture/
  scrawl helper derives its position from it, so if you ever hand-place a
  fixture, use the same constant instead of a magic number.
- **A wall-mounted fixture's thin axis matches whichever wall it's on**
  (Z-thin on a `wallX` wall, X-thin on a `wallZ` wall) and its box **touches
  the wall's face, centered exactly `thin/2` past it** — flush, not
  embedded, not floating. `dispenser()`/`keypad()` encode this so it can't be
  gotten backwards; see §4 for why that matters.

## 3. Worked example: raw vs. kit

Same room both times: a small "Supply Closet" — a keypad-locked door out the
north wall, an island an orderly patrols around, a dispenser on the west
wall, two scrawls (one flavor, one the door code). This is exactly
`src/rooms/_kitcheck.ts` — a real file in the repo that `npm run build`
type-checks (but never ships, see §7) — reproduced here as documentation.

### Raw (room4–room8 style)

```ts
import { RoomBuilder } from './build';
import type { ColliderDef, RoomDef, RoomScript } from './types';
import type { GameCtx } from '../game/context';
import { openKeypad } from '../ui/keypad';
import { Orderly, type OrderlyAABB } from '../game/orderly';

const CODE = '1234';
const rb = new RoomBuilder();

// shell, x [-6,6] z [-6,5]
rb.wallX(-6, 6, 5);
rb.wallZ(-6, 5, -6);
rb.wallZ(-6, 5, 6);
rb.wallX(-6, -1, -6);
rb.wallX(1, 6, -6);

// vestibule beyond the staff door, x [-1,1] z [-8,-6]
rb.wallZ(-8, -6, -1);
rb.wallZ(-8, -6, 1);
rb.wallX(-1, 1, -8);
rb.block([1.8, 2.6, 0.06], [0, 1.4, -7.94], 'glow');

// staff door collider — locked until the code is entered
const doorCollider: ColliderDef = { minX: -1, maxX: 1, minZ: -6.1, maxZ: -5.9 };
rb.colliders.push(doorCollider);

// central island
const ISLAND: OrderlyAABB = { minX: -1.8, maxX: 1.8, minZ: -1.1, maxZ: 1.1 };
rb.solid(ISLAND.minX, ISLAND.maxX, ISLAND.minZ, ISLAND.maxZ);
rb.block([1.4, 1.8, 0.7], [0, 0.9, 0], 'wall2');

const ORDERLY_COLLIDERS: ColliderDef[] = rb.colliders.filter(
  (c) => c.states === undefined || c.states === 'both',
);

export const closetRoom: RoomDef = {
  id: 'closet',
  name: 'the Closet',
  floor: { minX: -6, maxX: 6, minZ: -8, maxZ: 5 },
  spawn: { x: 0, z: 4, yaw: 0 },
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    { text: 'the closet remembers\nwhat it held', size: 2.4, pos: [-5.85, 1.65, -2], rotY: Math.PI / 2 },
    { text: '1 2 3 4', size: 2.6, pos: [-3.5, 1.65, 4.88], rotY: Math.PI, big: true },
  ],
  interactables: [
    { id: 'dispenser_demo', type: 'dispenser', size: [0.16, 0.75, 0.55], pos: [-5.8, 1.45, 3.5],
      mat: 'dispenser', states: 'both', label: 'use the dispenser' },
    { id: 'exitdoor', type: 'door', size: [2, 3, 0.2], pos: [0, 1.5, -6],
      mat: 'door', states: 'both', label: 'the exit door' },
    { id: 'keypad_demo', type: 'keypad', size: [0.4, 0.5, 0.14], pos: [1.35, 1.45, -5.81],
      mat: 'pad', states: 'both', label: 'use the keypad' },
  ],
  lights: [{ pos: [0, 3.5] }, { pos: [0, 0] }, { pos: [0, -3.5] }, { pos: [0, -7] }],
  exits: [{ to: 'END', minX: -1, maxX: 1, minZ: -7.9, maxZ: -6.8 }],
};

const WAYPOINTS = [
  { x: 4, z: 2.2 }, { x: 4, z: -2.2 }, { x: -4, z: -2.2 }, { x: -4, z: 2.2 },
];
// (no clearance check — this is exactly the bug class that shipped twice in
// room7/room8: nothing catches a wedged leg until playtest.)

export type ClosetScript = RoomScript & { onLeave?(ctx: GameCtx): void };

function bearingTo(dx: number, dz: number, yaw: number): number {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const fwd = -dx * sin - dz * cos;
  const right = dx * cos - dz * sin;
  return Math.atan2(right, fwd);
}

export const closetScript: ClosetScript = (() => {
  let orderly: Orderly | null = null;
  let doorUnlocked = false;

  function spawnOrderly(ctx: GameCtx): void {
    orderly?.dispose();
    orderly = new Orderly(ctx.scene, WAYPOINTS, [ISLAND], {
      onWarn: () => { ctx.hud.toast('he is looking at you.'); ctx.telemetry.event('orderly_spotted'); },
      onChaseStart: () => { ctx.hud.toast('run. or stop being visible.'); ctx.telemetry.event('orderly_chase'); },
      onCaught: () => {
        ctx.state.forceState('lucid');
        ctx.shiftFx();
        ctx.teleportPlayer(closetRoom.spawn.x, closetRoom.spawn.z);
        ctx.hud.toast('hands. a needle. "back on the shelf," he says.');
        ctx.telemetry.event('orderly_caught');
      },
    }, { colliders: ORDERLY_COLLIDERS });
    orderly.setWardState(ctx.state.state);
  }

  const script: ClosetScript = {
    onEnter(ctx) {
      spawnOrderly(ctx);
      doorUnlocked = false;
      ctx.hud.setObjective('the supply closet. the code is written where he can’t reach it.');
    },
    isAvailable(id) {
      if (id === 'exitdoor') return false;
      if (id === 'keypad_demo') return !doorUnlocked;
      return true;
    },
    onInteract(id, ctx) {
      if (id === 'keypad_demo') {
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
            ctx.moveInteractable('exitdoor', [-1, 1.5, -6.85], Math.PI / 2);
            doorCollider.minX = 999;
            doorCollider.maxX = 999.2;
            ctx.hud.toast('1234. someone counted on their fingers.');
            ctx.hud.setObjective('the door is open. go.');
            ctx.telemetry.event('door_opened');
          },
          onClose: () => {},
        });
        return true;
      }
      return false;
    },
    onStateChange(next, ctx) {
      orderly?.setWardState(next);
    },
    update(dt, _t, ctx) {
      if (!orderly) return;
      const p = ctx.playerPos();
      orderly.update(dt, p.x, p.z, ctx.state.state);
      const level = orderly.watching;
      const chasing = orderly.chasing;
      const dist = Math.hypot(orderly.x - p.x, orderly.z - p.z);
      if (level > 0 || chasing) {
        ctx.hud.setThreat(level, bearingTo(orderly.x - p.x, orderly.z - p.z, p.yaw));
      } else {
        ctx.hud.setThreat(0, null);
      }
      ctx.audio.setThreat(level, dist, chasing);
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
```

**176 lines of actual code** (blank lines and standalone comment lines not
counted).

### With the kit

```ts
import {
  RoomBuilder, dispenser, scrawl, keypadDoor, patrol, makeOrderlyRoomScript,
  type OrderlyAABB, type RoomDef,
} from './kit';

const CODE = '1234';
const rb = new RoomBuilder();

// shell, x [-6,6] z [-6,5]
rb.wallX(-6, 6, 5);
rb.wallZ(-6, 5, -6);
rb.wallZ(-6, 5, 6);
rb.wallX(-6, -1, -6);
rb.wallX(1, 6, -6);

// vestibule beyond the staff door, x [-1,1] z [-8,-6]
rb.wallZ(-8, -6, -1);
rb.wallZ(-8, -6, 1);
rb.wallX(-1, 1, -8);
rb.block([1.8, 2.6, 0.06], [0, 1.4, -7.94], 'glow');

// central island
const ISLAND: OrderlyAABB = { minX: -1.8, maxX: 1.8, minZ: -1.1, maxZ: 1.1 };
rb.solid(ISLAND.minX, ISLAND.maxX, ISLAND.minZ, ISLAND.maxZ);
rb.block([1.4, 1.8, 0.7], [0, 0.9, 0], 'wall2');

// door + collider + standard onInteract flow, one call
const lock = keypadDoor(rb, {
  doorId: 'exitdoor', keypadId: 'keypad_demo', code: CODE,
  side: 'n', wallAt: -6, along: 0, keypadAlong: 1.35,
  doorLabel: 'the exit door',
  successToast: '1234. someone counted on their fingers.',
});

export const closetRoom: RoomDef = {
  id: 'closet',
  name: 'the Closet',
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

// throws at import time if any leg wedges an orderly's body against ISLAND
// or a wall — the room7/room8 bug can't ship silently anymore
const WAYPOINTS = patrol(
  [{ x: 4, z: 2.2 }, { x: 4, z: -2.2 }, { x: -4, z: -2.2 }, { x: -4, z: 2.2 }],
  rb.colliders,
);

export const closetScript = makeOrderlyRoomScript({
  orderlies: [{ waypoints: WAYPOINTS, occluders: [ISLAND] }],
  colliders: rb.colliders,
  spawn: closetRoom.spawn,
  onEnterObjective: 'the supply closet. the code is written where he can’t reach it.',
  catchToast: 'hands. a needle. "back on the shelf," he says.',
  extraScript: {
    isAvailable: (id) => lock.isAvailable(id),
    onInteract: (id, ctx) => lock.handleInteract(id, ctx),
  },
});
```

**73 lines of actual code** — about **2.4x shorter** for this room (176 →
73), and every one of the lines the kit removed was boilerplate you'd
otherwise retype verbatim in the next room: the `bearingTo` copy, the
spawn/dispose closure, the full keypad `onInteract` block, the threat-
aggregation `update`, the `onLeave` teardown. The gap grows with room
complexity, not shrinks — a **second** orderly costs the raw version another
~50 lines (a whole second `onWarn`/`onChaseStart`/`onCaught` callback set
plus a chase-priority comparison in `update`, see room8.ts); it costs the kit
version exactly one more entry in `orderlies: [...]`.

## 4. Checklist of invariants

Run through this before handing a room to a playtest. Some of these the kit
enforces for you (marked **[kit]** — violating them throws or is
impossible); the rest are still on you.

- [ ] **Sealed shell.** Every `wallX`/`wallZ` run needs to actually close the
  floor's footprint — a gap you didn't mean to leave lets the player (or an
  orderly, if it's inside his patrol/collider set) walk out of the room
  entirely. There's no automatic check for this; walk the perimeter in-game.
- [ ] **Occluders get colliders, colliders (mostly) get occluders.** Anything
  passed as an orderly occluder (blocks sight, doesn't need to block
  movement) is usually also something solid — pass the same `OrderlyAABB` to
  both `rb.solid(...)` and the orderly's occluder list (see `ISLAND` in the
  worked example above). The reverse isn't required: thin walls are
  colliders but rarely worth listing as occluders separately since the
  orderly's own collider list already keeps him on his side of them.
- [ ] **[kit] Patrol clearance >0.5m everywhere.** `patrol(waypoints,
  colliders)` throws at module init — not at playtest — if any waypoint *or
  any leg between waypoints* passes within `TUNING.orderly.radius + 0.1`
  (0.4 body + 0.1 margin) of a collider. This is the exact bug that shipped
  twice (room7's shelving row, room8's filing block): an orderly's body
  wedges against a corner mid-leg and he freezes there. Fix the message the
  validator gives you — move the waypoint, or widen the gap — don't lower
  the clearance.
- [ ] **[kit] Fixtures and scrawls sit proud of the wall face, never
  embedded.** `dispenser()`/`keypad()` center the fixture exactly `thin/2`
  past the wall's face (touching, not overlapping); `scrawl()` sits it
  0.03m past the face. Both derive from `WALL_HALF_THICKNESS`
  (`build.ts`), not a hand-picked number, so this can't drift room to room.
  If you place a fixture by hand instead of through the kit, use the same
  constant.
- [ ] **One reachable dispenser per lucid-gated action.** If a room's only
  path forward requires lucid (almost always: a keypad), there must be a
  dispenser reachable from spawn without needing to already be lucid to get
  to it. Rooms with an orderly additionally need that dispenser reachable
  *without* crossing the patrol loop, or the "safe" refill isn't actually
  safe (see room5/room7's placement — south of the loop, close to the
  post-catch teleport point).
- [ ] **Reaction-time rule: ≥2.5s time-to-contact at inspection points.**
  Anywhere the player has to stop and read something (a scrawl, a keypad) —
  the orderly's distance at that spot, in the worst case that he's already
  alerted the instant you start reading, must give you at least 2.5s before
  he could physically reach you: `grace (0.6s) + distance / chaseSpeed
  (4.3 m/s) ≥ 2.5s`, i.e. **distance ≥ ~8.2m** from the nearest point on any
  patrol leg. `minInspectionDistance(reactionSec?)` (kit.ts) computes this
  number for you — it's a design guideline, not a hard validator (sight
  range/occlusion already bound how bad a surprise can be), but if you're
  placing a scrawl or keypad well inside patrolled ground, check the
  distance against it.

## 5. Registering a room

The kit doesn't touch `main.ts` — you still wire a new room in by hand,
exactly like room9/room10 did:

```ts
// main.ts
import { closetRoom, closetScript } from './rooms/closet';
// ...
const rooms: Record<string, { def: RoomDef; script: AnyRoomScript }> = {
  // ...
  closet: { def: closetRoom, script: closetScript },
};
```

Exits chain rooms together via `RoomDef.exits`: each entry is an AABB on the
floor (`{ to, minX, maxX, minZ, maxZ }`) — walking into it calls
`completeRoom(exitTo)`, which fires the current room's `onLeave` (if it has
one — orderly rooms always do) and then `enterRoom(exitTo)`. `to: 'END'`
ends the build instead of loading another room (see `endOfBuild()` in
main.ts). A typical vestibule pattern (see every room2–room10) puts the exit
AABB just past the far side of the vestibule, beyond where the door swings
open to.

## 6. Running it

```
npm run dev
```

starts Vite's dev server (default `http://localhost:5173`). If you're
developing on a machine you want to playtest from another device on the same
Tailscale network, run `npm run dev -- --host` (or set `server.host` in
`vite.config.ts`) so Vite binds to all interfaces — it'll print the
machine's LAN/tailnet address alongside `localhost` in the terminal; open
that from the other device. `npm run build` produces the static bundle in
`dist/` (itch.io-compatible, `base: './'`), and `npm run preview` serves that
build locally to sanity-check it before shipping.

## 7. Kit API reference

Everything below lives in `src/rooms/kit.ts`; one import line covers all of
it (plus `RoomBuilder` and the `OrderlyAABB`/`RoomDef`/`RoomScript`/
`ColliderDef`/`WardState` types it re-exports, so a room file rarely needs a
second import).

- **`dispenser(opts: FixtureOpts): FixtureDef`** / **`keypad(opts:
  FixtureOpts): FixtureDef`** — a wall-mounted `InteractableDef`.
  `FixtureOpts`: `{ id, side: WallSide, wallAt, along, y?, label, states?,
  size? }`. `side`/`wallAt`/`along` are explained in §2; `size` overrides the
  default footprint (`[thin, height, along]` before axis orientation —
  dispenser defaults to `[0.16, 0.75, 0.55]`, keypad to `[0.14, 0.5, 0.4]`,
  both matching every fixture already in the game). Emits `facing` (`'px' |
  'nx' | 'pz' | 'nz'`) explicitly.

- **`scrawl(text, side, wallAt, along, opts?): ScrawlDef`** — a wall decal,
  proud of the face by `opts.proud` (default 0.03m, matching every existing
  scrawl). `opts`: `{ size?, y?, big?, proud? }`.

- **`keypadDoor(rb, opts: KeypadDoorOpts): KeypadDoorLock`** — the full lock
  assembly. Builds the door `InteractableDef`, pushes its closure-held
  collider into `rb.colliders` (mutated in place on unlock, matching every
  shipped room's `.minX = 999` trick), builds the keypad via `keypad()`, and
  returns `{ door, keypad, collider, isUnlocked(), isAvailable(id),
  handleInteract(id, ctx) }`. Wire the last two straight into a
  `RoomScript` (directly, or via `makeOrderlyRoomScript`'s `extraScript`).
  `handleInteract` implements the exact standard flow: unmed refusal toast →
  `openKeypad` → on success, unlock flag + telemetry + `moveInteractable`
  swing + collider disable + toasts. The default swing (hinge at the wall
  gap's start edge, 0.85m through the gap, 90° rotation) matches every
  north-wall door currently in the game; override `hinge`/`openPos`/
  `openRotY` for anything else.

- **`patrol(waypoints, colliders, opts?): typeof waypoints`** — validates,
  returns unchanged. See §4. `opts`: `{ bodyRadius?, clearance? }`, both
  default to `TUNING.orderly` values.

- **`minInspectionDistance(reactionSec = 2.5): number`** — see §4's
  reaction-time rule. Not a validator; a number to check placements against.

- **`makeOrderlyRoomScript(cfg): RoomScript & { onLeave(ctx) }`** — the
  room7/room8 pattern generalized to N orderlies. `cfg`: `{ orderlies:
  [{ waypoints, occluders, onWarnToast?, onChaseToast? }], colliders,
  spawn, onEnterObjective, catchToast?, unmedToast?, extraScript? }`.
  `colliders` should be `rb.colliders` at the point you call this (after
  every wall/door/island has been added) — it's filtered to always-on
  (`states: 'both'` or unset) internally, same rule `Orderly` itself
  documents. `extraScript` (`{ isAvailable?, onInteract?, onStateChange?,
  update?, onLeave? }`) is tried first for `isAvailable`/`onInteract`
  (falling back to `true`/unhandled); `onStateChange`/`update`/`onLeave`
  always run the kit's own logic and then `extraScript`'s, if present — this
  is how you compose a `keypadDoor` lock into an orderly room (see the
  worked example).

- **`RoomBuilder`** — re-exported unchanged from `build.ts`.

For the exact geometry derivations (why the swing constant is 0.85, why the
patrol clearance threshold is `radius + 0.1`, why fixtures sit at
`face + sign * thin/2`), read the comments in `kit.ts` directly — every
formula there is checked against real values already shipped in room2/room5/
room7/room8, not invented fresh.

## 8. Verticality

The engine's floor height is a **single-valued function of (x,z)**: at any
spot in a room there is exactly one walkable height, computed by
`World.floorHeightAt(x, z)` (`src/game/world.ts`) from the room's
`heightZones`/`ramps` (`src/rooms/types.ts`). This buys real up/down — a
raised mezzanine, a sunken pit, a ramped approach — without the hard problem
of two walkable surfaces stacked at the same XZ column. **Collision stays
exactly the existing 2D XZ AABB system** (`tryMove`, unchanged): a raised
region is never a collider, it's purely a height the player's/orderly's
render Y eases toward. The player is kept on the intended level the same way
they're kept anywhere else — walls and railings, which *are* colliders.

- **`heightZone(minX, maxX, minZ, maxZ, y): HeightZone`** — a rectangular
  region whose floor sits at a fixed height `y`.
- **`ramp(minX, maxX, minZ, maxZ, axis, yLow, yHigh): RampDef`** — a
  rectangular region whose floor height interpolates linearly along `axis`
  (`'x'` or `'z'`): `yLow` at the region's min end on that axis, `yHigh` at
  the max end. Ramps are checked before height zones, so a ramp's footprint
  always wins where it overlaps a flat zone — author a ramp's endpoints
  flush against the zone it connects to and the seam is continuous.
- `RoomDef.heightZones?: HeightZone[]` / `RoomDef.ramps?: RampDef[]` — both
  optional, both additive. A room with neither (every room shipped before
  this existed) has `floorHeightAt` return 0 everywhere — identical to
  today's flat floor.
- `RoomDef.spawn.y?: number` — spawn height, default 0.
- An `Orderly` can be told its own level via `OrderlyOptions.floorHeightAt`
  (raw `Orderly` construction) or `OrderlyCfg.floorHeightAt`
  (`makeOrderlyRoomScript`) — pass the same lookup the room uses for the
  player so his mesh stands on his own floor instead of floating/sinking.
  His sight/chase math is still pure XZ distance+cone — it doesn't know
  about height at all — so design a vertical room so **each orderly's
  reachable XZ footprint stays on one level** (keep his patrol/collision
  region geometrically clear of the other level's footprint, the same way
  you'd keep him clear of a nook he shouldn't be able to reach); the engine
  doesn't stop you from overlapping them, it just won't read as fair if you
  do.
- **The ceiling doesn't move.** `World.loadRoom` builds one flat ceiling
  plane per room at absolute y=3, not per height zone — a raised region's
  headroom is `3 - eyeHeight - zoneY`, so keep raised zones modest (roughly
  ≤1m for a comfortable margin above the player's 1.62m eye height) or the
  camera will clip through it.
- **Railings, not magic.** Nothing auto-generates a barrier at a height
  zone's edge. If a raised region has an open side (not bounded by a real
  wall and not the mouth of a ramp), add a real collider there — same
  `rb.solid(...)` you'd use for any other obstacle — plus a low visual block
  so it reads as a railing instead of an invisible wall.
- **`BlockDef` has no X-axis tilt** (`rotY` only), so a physically smooth
  ramp mesh isn't directly buildable — the walkable surface (the `ramp()`
  region) is smooth by interpolation regardless, but its *visual* tends to
  be a short run of stepped blocks of increasing height (see the worked
  example below) rather than one sloped mesh. This is a look, not a bug —
  every ramp shipped so far in this game uses it.

### Worked example: a sunken lower floor with a railed, ramped platform

A 6×6m platform raised 0.9m above the surrounding floor, reached by a ramp on
its south side, with railings on the two open sides that aren't a real wall
or the ramp mouth:

```ts
import { RoomBuilder, heightZone, ramp } from './kit';

const rb = new RoomBuilder();
const MEZZ_Y = 0.9;

// the platform's walkable surface — single heightZone, one line
const platform = heightZone(1, 9, 0, 8, MEZZ_Y);
// the ramp bridging it down to the surrounding floor (y=0, the default) —
// axis 'z' because height varies north-south here; yLow at minZ=8 matches
// the platform's own edge, yHigh at maxZ=10 matches the ground it lands on
const platformRamp = ramp(1, 9, 8, 10, 'z', MEZZ_Y, 0);

// visual: a solid slab under the platform (nothing renders a zone's floor
// automatically — without this the player would stand over empty space,
// since the room's one big floor plane is still down at y=0) plus a
// stepped visual for the ramp run
rb.block([8, MEZZ_Y, 8], [5, MEZZ_Y / 2, 4], 'wall2');
rb.block([8, 0.9 * MEZZ_Y, 0.5], [5, (0.9 * MEZZ_Y) / 2, 9.75], 'wall2');
rb.block([8, 0.45 * MEZZ_Y, 0.5], [5, (0.45 * MEZZ_Y) / 2, 8.25], 'wall2');

// railings on the platform's two open sides (its east side abuts a real
// wall in this example, and its south side is the ramp mouth — only the
// west side needs one, plus a matching visual rail)
rb.solid(0.88, 1.12, 0, 8);
rb.block([0.24, 0.9, 8], [1, MEZZ_Y + 0.45, 4], 'chain');

export const heightZones = [platform];
export const ramps = [platformRamp];
// ...and spread heightZones/ramps into the RoomDef, same as blocks/colliders.
```

See `src/rooms/room11.ts` for the full version of this pattern at room
scale — two orderlies, one owning the lower floor and one the platform, with
the platform gating a scrawled code the player has to climb up to read.
