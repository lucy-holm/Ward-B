# M10: Trigger Volumes + Room 14 "the Hold" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the trigger-volume engine primitive and room 14 — the post-epilogue wing's opening room, where a pressure plate holds the exit gate open only while something stands on it.

**Architecture:** A declarative `TriggerDef` AABB on `RoomDef`, polled per-frame by `main.ts` for the player (the same tier `ExitDef` lives at) and testable against room-owned orderlies via a pure `inTrigger()` kit function. Room 14 is a hand-written single-orderly room (the orderly factory doesn't expose orderly positions to `extraScript.update`, and the gate logic needs them every frame). The gate reuses the mutable-`ColliderDef` + `moveInteractable` door trick every shipped room uses, plus room13's deferred-close guard so the gate never re-engages onto a body inside its footprint.

**Tech Stack:** TypeScript + three.js (grey-box), Vite. **No unit-test framework exists in this repo** — the verification harness is `npm run check:rooms` (imports every room module, runs `patrol()` validators, checks registries/chain), `npm run build` (tsc + vite), and the `/map.html` dev viewer. Red/green steps below use those, per the `adding-a-room` skill. Spec: `docs/superpowers/specs/2026-07-19-room14-pressure-plates-design.md` (authoritative for all design intent).

**Read before starting:** `.claude/skills/adding-a-room/SKILL.md`, `ROOM_AUTHORING.md` §2 (coordinates) + §7 (kit API), the spec above.

**House rules that apply to every task:** commit after each task, never push (push = publish to GitHub Pages; only Tom decides). All player-facing text is lowercase terse dread. Room file headers carry design intent + audits as comments (see room10.ts/room12.ts for the style).

---

### Task 1: TriggerDef types + the 'plate' material

**Files:**
- Modify: `src/rooms/types.ts`
- Modify: `src/game/world.ts` (MATERIALS block, ~line 304)
- Modify: `src/devtools/map.ts` (MAT_COLORS, ~line 84)

- [ ] **Step 1: Add the types.** In `src/rooms/types.ts`:

Add `'plate'` to `MatName` (after `'dispenser'`, before `'glow'`):

```ts
  | 'dispenser'
  | 'plate'
  | 'glow';
```

After the `ColliderDef` interface, add:

```ts
// A rectangular XZ region that fires enter/exit callbacks when the player
// crosses its boundary — the declarative, reusable version of the ad-hoc
// "inStretch" boolean every hand-rolled hazard reimplements (room13's
// closing walls). Optionally state-filtered: a trigger with states:'lucid'
// or 'unmed' only EXISTS — fires nothing, matches nothing — while the ward
// is in that state, same StateFilter convention as BlockDef/ColliderDef.
// Deliberately NO implicit collider: a trigger is a floor-level sensor, not
// an obstacle. A room wanting a blocking trigger region authors a separate
// rb.solid(...), same opt-in as any other prop.
export interface TriggerDef {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  states?: StateFilter; // default 'both'
}
```

In `RoomDef`, after `ramps?: RampDef[];` add:

```ts
  // Trigger volumes — engine-polled for the player every frame (main.ts),
  // room-polled for orderlies via kit's inTrigger(). Absent/empty ⇒ no-op.
  triggers?: TriggerDef[];
```

In `RoomScript`, after `onStateChange?`, add:

```ts
  // Fired once when the player's (x,z) crosses into/out of a
  // RoomDef.triggers region whose states filter matches the CURRENT
  // WardState — checked every frame (not just on movement), so a trigger
  // whose filter stops matching because the player shifted while standing
  // still fires onTriggerExit on the spot. Engine-detected in main.ts.
  onTriggerEnter?(id: string, ctx: GameCtx): void;
  onTriggerExit?(id: string, ctx: GameCtx): void;
```

- [ ] **Step 2: Run tsc to see the expected failure.**

Run: `npx tsc --noEmit`
Expected: FAIL — `src/devtools/map.ts` errors that `MAT_COLORS` (typed `Record<BlockDef['mat'], string>`) is missing property `'plate'`. (`world.ts`'s `MATERIALS: Record<MatName, THREE.Material>` errors the same way.) This is the red step proving the total-record types actually guard new MatNames.

- [ ] **Step 3: Add the material + viewer color.** In `src/game/world.ts`, after the `DISPENSER_TEX` line (~295):

```ts
const PLATE_TEX = makeWornTexture([64, 70, 66], 96, 18);
```

In the `MATERIALS` record, after the `dispenser:` entry:

```ts
  // Floor-mounted mechanism plate (trigger volumes' visible marker) — worn
  // metal with a faint mechanism glow so it reads at floor level, distinct
  // from pad/dispenser which are wall fixtures.
  plate: new THREE.MeshLambertMaterial({ map: PLATE_TEX, emissive: 0x8a9a72, emissiveIntensity: 0.25 }),
```

In `src/devtools/map.ts` `MAT_COLORS`, after `dispenser:`:

```ts
  plate: '#8f9a6d',
```

- [ ] **Step 4: Verify green.**

Run: `npx tsc --noEmit`
Expected: PASS (no output).

Run: `npm run check:rooms`
Expected: `check:rooms OK — 14 room defs imported clean` + chain `room1 -> … -> room13 -> END`.

- [ ] **Step 5: Commit.**

```bash
git add src/rooms/types.ts src/game/world.ts src/devtools/map.ts
git commit -m "feat: TriggerDef + RoomScript trigger hooks + 'plate' material (M10 part 1)"
```

---

### Task 2: kit helpers — inTrigger() + pressurePlate()

**Files:**
- Modify: `src/rooms/kit.ts`
- Modify: `src/rooms/_kitcheck.ts` (exercise the new helpers so check:rooms executes them)

- [ ] **Step 1: Add the helpers.** In `src/rooms/kit.ts`, add `TriggerDef` and `BlockDef` to the type re-export block at the top (they join `ColliderDef` etc. in the `export type {...} from './types'` list). Then, after the `scrawl()` function (~line 210), add:

```ts
// ---------------------------------------------------------------------------
// Trigger volumes — pure containment test + the visible-plate builder.
// The engine polls RoomDef.triggers for the PLAYER only (main.ts has never
// known about orderlies; they're room-owned). A room that wants "is the
// orderly on the plate" calls inTrigger against its own Orderly's public
// .x/.z each frame, paired with a `let wasOn = false` edge-detect local —
// same shape as room13's inStretch.
// ---------------------------------------------------------------------------

// Pure containment test against a TriggerDef, honoring its state filter —
// the exact rectangle+state check main.ts's per-frame player poll uses,
// exposed so a room's update() can run the identical test against any
// room-owned actor. One rectangle, authored once, shared by both sides —
// no drift between "where the plate visually is" and "where it fires."
export function inTrigger(t: TriggerDef, x: number, z: number, state: WardState): boolean {
  if (t.states && t.states !== 'both' && t.states !== state) return false;
  return x > t.minX && x < t.maxX && z > t.minZ && z < t.maxZ;
}

export interface PlateOpts {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  states?: StateFilter; // default 'both'
  y?: number; // visual half-height above floor, default 0.02
}

export interface PlateDef {
  trigger: TriggerDef;
  block: BlockDef; // thin flush box, mat:'plate', same footprint + states as the trigger
}

// One call, two shapes (same pattern as keypadDoor): a TriggerDef and the
// thin flush 'plate' block that marks it. Spread plate.block into blocks
// and plate.trigger into RoomDef.triggers. Deliberately NO paired collider
// — a pressure plate must stay walkable (that's the entire mechanic), and
// with no collider it never enters ORDERLY_COLLIDERS either, so patrols
// cross it like bare floor with zero special-casing.
export function pressurePlate(opts: PlateOpts): PlateDef {
  const h = opts.y ?? 0.02;
  return {
    trigger: { id: opts.id, minX: opts.minX, maxX: opts.maxX, minZ: opts.minZ, maxZ: opts.maxZ, states: opts.states },
    block: {
      size: [opts.maxX - opts.minX, h * 2, opts.maxZ - opts.minZ],
      pos: [(opts.minX + opts.maxX) / 2, h, (opts.minZ + opts.maxZ) / 2],
      mat: 'plate',
      states: opts.states,
    },
  };
}
```

Note: `WardState` and `StateFilter` are already imported/re-exported by kit.ts; `BlockDef` needs adding to the type-import from `./types` at the top of the file if not present.

- [ ] **Step 2: Exercise in _kitcheck.** In `src/rooms/_kitcheck.ts`, add a plate to the demo room the same way its other kit calls are laid out (read the file first; it's one demo room using every helper). Add near the other helper calls:

```ts
const demoPlate = pressurePlate({ id: 'demoplate', minX: -1, maxX: 1, minZ: -2, maxZ: -1 });
```

and spread `demoPlate.block` into the def's `blocks` array and add `triggers: [demoPlate.trigger]` to the RoomDef (plus `pressurePlate` and, in a comment or trivial usage, `inTrigger` — e.g. `void inTrigger(demoPlate.trigger, 0, 0, 'unmed');` — added to its kit import). Follow the file's existing structure; the goal is that `check:rooms` executes both new helpers at import time.

- [ ] **Step 3: Verify.**

Run: `npx tsc --noEmit && npm run check:rooms`
Expected: tsc silent; `check:rooms OK — 14 room defs imported clean`.

- [ ] **Step 4: Commit.**

```bash
git add src/rooms/kit.ts src/rooms/_kitcheck.ts
git commit -m "feat: kit inTrigger() + pressurePlate() (M10 part 1)"
```

---

### Task 3: engine trigger poll in main.ts

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Add the poll.** In `src/main.ts`:

Add to the kit import area (there is no kit import today — add one):

```ts
import { inTrigger } from './rooms/kit';
```

Near the other module-level state (`let current = …`, ~line 63):

```ts
// Trigger volumes: ids of RoomDef.triggers regions the player is currently
// inside (state filter honored). Diffed each frame to fire the room
// script's onTriggerEnter/onTriggerExit. Cleared on room load WITHOUT
// firing exits — the old room's script is already torn down.
let activeTriggers = new Set<string>();
```

In `loadRoom()`, after `player.spawn(current.def.spawn);`:

```ts
  activeTriggers.clear();
```

In `frame()`, directly after the floor-height snap line (`player.y += …`) and **before** `current.script.update?.(dt, t, ctx);` (spec requirement: a trigger callback that flips room state must land before the room's own update runs):

```ts
    // Trigger poll — player only; rooms test their own actors via inTrigger.
    // Recomputed every frame (not just on movement) so a state-filtered
    // trigger fires exit the moment the ward state stops matching, even
    // standing still. Same generic AABB tier as checkExits below.
    const nowActive = new Set<string>();
    for (const trg of current.def.triggers ?? []) {
      if (inTrigger(trg, player.x, player.z, state.state)) nowActive.add(trg.id);
    }
    for (const id of nowActive) {
      if (!activeTriggers.has(id)) current.script.onTriggerEnter?.(id, ctx);
    }
    for (const id of activeTriggers) {
      if (!nowActive.has(id)) current.script.onTriggerExit?.(id, ctx);
    }
    activeTriggers = nowActive;
```

- [ ] **Step 2: Verify.**

Run: `npx tsc --noEmit && npm run build`
Expected: both clean (no room has triggers yet — this is inert until Task 6; runtime verification happens there).

- [ ] **Step 3: Commit.**

```bash
git add src/main.ts
git commit -m "feat: per-frame player trigger poll in main.ts (M10 part 1)"
```

---

### Task 4: map viewer triggers layer

**Files:**
- Modify: `src/devtools/map.ts`

- [ ] **Step 1: Add the layer.** In `LAYERS` (~line 60), insert between `blocks` and `patrols`:

```ts
  { id: 'triggers', label: 'triggers' },
```

After `drawBlocks()` (~line 258), add:

```ts
// Trigger volumes — violet, a color no other layer uses (colliders own
// grey/blue/red, exits green). A pressurePlate() room shows this rect AND
// its 'plate' block outline in the blocks layer — seeing them coincide (or
// not) is the debug signal: a mismatch means the visible plate and its
// firing bounds drifted apart.
function drawTriggers(g: SVGGElement, def: RoomDef): void {
  for (const t of def.triggers ?? []) {
    const state = t.states ?? 'both';
    g.appendChild(
      rect(t.minX, t.minZ, t.maxX, t.maxZ,
        { fill: '#9d6fe0', 'fill-opacity': state === 'both' ? 0.3 : 0.45, stroke: '#9d6fe0', 'stroke-width': 0.05 },
        `trigger '${t.id}' x[${t.minX}, ${t.maxX}] z[${t.minZ}, ${t.maxZ}] states:${state}`),
    );
    g.appendChild(
      label((t.minX + t.maxX) / 2, (t.minZ + t.maxZ) / 2, t.id, { fill: '#c9aef0', 'font-size': 0.45 }),
    );
  }
}
```

At the render call site (~line 460, where `drawColliders`/`drawBlocks` are invoked per layer group), add alongside them:

```ts
    drawTriggers(groups.get('triggers')!, def);
```

- [ ] **Step 2: Verify.**

Run: `npx tsc --noEmit`
Expected: PASS. (Visual check happens in Task 8 once room14 exists; `_kitcheck` isn't routed in the viewer.)

- [ ] **Step 3: Commit.**

```bash
git add src/devtools/map.ts
git commit -m "feat: map viewer triggers layer (M10 part 1)"
```

---

### Task 5: check-rooms.mjs trigger id validation

**Files:**
- Modify: `scripts/check-rooms.mjs`

- [ ] **Step 1: Add the check.** In the per-def checks loop (~line 112, inside `for (const [id, { def, file, … }] of defs)`), add:

```js
  const trigIds = new Set();
  for (const t of def.triggers ?? []) {
    if (trigIds.has(t.id)) fail(`${file}: duplicate trigger id '${t.id}'`);
    trigIds.add(t.id);
  }
```

Also add a line to the header comment's numbered list: `//   7. trigger ids are unique per room (RoomDef.triggers)`.

- [ ] **Step 2: Verify.**

Run: `npm run check:rooms`
Expected: `check:rooms OK — 14 room defs imported clean` (the `_kitcheck` demo plate passes; the check bites for real from Task 6 on).

- [ ] **Step 3: Commit.**

```bash
git add scripts/check-rooms.mjs
git commit -m "chore: check:rooms validates trigger id uniqueness (M10 part 1)"
```

---

### Task 6: room14.ts — "the Hold"

**Files:**
- Create: `src/rooms/room14.ts`

All geometry, tuning numbers, toasts, and audit reasoning come from the spec (Part 2) — the room header comment must carry the condensed design intent + soft-lock + reaction-time audits, house style (crib the header tone from `room10.ts`). Complete file:

- [ ] **Step 1: Write the room.**

```ts
import { RoomBuilder, dispenser, scrawl, patrol, pressurePlate, inTrigger } from './kit';
import type { ColliderDef, RoomDef, RoomScript } from './types';
import type { GameCtx } from '../game/context';
import { Orderly, type OrderlyAABB } from '../game/orderly';
import type { DebugPatrol } from '../devtools/map-types';

// ROOM 14 — the Hold. The wing exhales: room13 gave nothing back, so this
// room opens with a dispenser five meters from spawn and asks exactly one
// new thing — a gate the floor plate holds open only while something's
// weight is on it, with the plate far enough from the gate that being on
// it and being through it are mutually exclusive. One base-tuned orderly
// paces a line that crosses the plate: the wing's reintroduction of the
// threat, and the second half of the teach (he can carry the plate for
// you — his patrol never stops, even lucid when you can't see him).
//
// Three honest routes, no keypad, no code (spec: room14-pressure-plates):
//   A solo sprint    — step on, run the ~1.6m before the 0.7s settle
//                      window closes. 0 pills.
//   B let him carry  — wait behind the crate, walk through while his leg
//                      crosses the plate (1.73s transit + 0.7s tail vs a
//                      ~0.94s walk). 0 pills unmed, 1 lucid for safety.
//   C pay to be safe — lucid first, then A or B risk-free. 1 pill.
//
// SOFT-LOCK AUDIT: dispenser14 is in the entry alcove behind no gate, no
// orderly reach, no state requirement — a 0-pill unmed arrival tops up in
// the first seconds. Nothing in this room is unmed-sealed; the gate only
// ever stands between Z2 and the one-way exit, never between the player
// and the dispenser. The timer expiring anywhere is an ordinary revert.
// The gate never closes onto a body in its footprint (tryCloseGate defers,
// rechecked per frame — room13's wall-clamp lesson).
//
// REACTION-TIME AUDIT (patrol leg (-4.2,-11.9)↔(4.2,-11.9)): west scrawl
// (-5,2) is ≈13.9m from the nearest patrol point, east scrawl (5,-2)
// ≈9.9m, dispenser ≈19.6m — all clear the 8.2m floor. Z2/the gate is the
// room's gameplay (evasion), not an inspection point, same distinction as
// room3/4. Orderly is unmodified TUNING.orderly — reintroduction, not
// escalation.

const rb = new RoomBuilder();

// perimeter — floor x[-5,5] z[-17,9], spawn end at +z (south)
rb.wallX(-5, 5, 9); // south cap, behind spawn
rb.wallZ(-17, 9, -5); // west
rb.wallZ(-17, 9, 5); // east
rb.wallX(-5, 5, -17); // north cap

// gate wall, z=-14 — 2m opening x[-1,1], held by the plate, never a keypad
rb.wallX(-5, -1, -14);
rb.wallX(1, 5, -14);
const gateCollider: ColliderDef = { minX: -1, maxX: 1, minZ: -14.1, maxZ: -13.9 };
rb.colliders.push(gateCollider);

// the plate, straddling his patrol line
const plate = pressurePlate({ id: 'plate14', minX: -1.3, maxX: 1.3, minZ: -12.5, maxZ: -11.3 });
rb.blocks.push(plate.block);

// waiting crate near the gate — occluder + cover for route B
const CRATE: OrderlyAABB = { minX: 2.55, maxX: 3.45, minZ: -13.3, maxZ: -12.7 };
rb.block([0.9, 1.0, 0.6], [3, 0.5, -13], 'prop');
rb.solid(CRATE.minX, CRATE.maxX, CRATE.minZ, CRATE.maxZ);

// vestibule glow — the way out reads from across the room once the gate opens
rb.block([1.8, 2.6, 0.06], [0, 1.4, -16.8], 'glow');

// vestibule trigger — fires the "through" beat once, past the gate
const VESTIBULE_TRIGGER = { id: 'vestibule14', minX: -5, maxX: 5, minZ: -16, maxZ: -14.2 };

const ORDERLY_COLLIDERS: ColliderDef[] = rb.colliders.filter(
  (c) => c.states === undefined || c.states === 'both',
);

const WAYPOINTS = patrol(
  [
    { x: -4.2, z: -11.9 },
    { x: 4.2, z: -11.9 },
  ],
  rb.colliders,
);

export const room14: RoomDef = {
  id: 'room14',
  name: 'the Hold',
  floor: { minX: -5, maxX: 5, minZ: -17, maxZ: 9 },
  spawn: { x: 0, z: 8, yaw: 0 },
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    scrawl("it only holds the door\nwhile it's heavy.", 'w', -5, 2),
    scrawl('he never stopped walking.\nyou just stopped seeing him.', 'e', 5, -2),
  ],
  interactables: [
    dispenser({ id: 'dispenser14', side: 'w', wallAt: -5, along: 7.3, label: 'use the dispenser' }),
    {
      id: 'gate14',
      type: 'door',
      size: [2, 3, 0.2],
      pos: [0, 1.5, -14],
      mat: 'door',
      states: 'both',
      facing: 'pz',
      label: 'the gate',
    },
  ],
  lights: [
    { pos: [0, 6] },
    { pos: [0, 1] },
    { pos: [0, -4] },
    { pos: [3, -12] },
    { pos: [-3, -12] },
    { pos: [0, -15.5] },
  ],
  triggers: [plate.trigger, VESTIBULE_TRIGGER],
  // Repoint to 'room15' when it lands — END is the wing's temporary edge.
  exits: [{ to: 'END', minX: -1, maxX: 1, minZ: -16.9, maxZ: -16.2 }],
};

const GATE_CLOSED_POS: [number, number, number] = [0, 1.5, -14];
const GATE_OPEN_POS: [number, number, number] = [-1, 1.5, -14.85];
const SETTLE_SEC = 0.7; // grace after the LAST body leaves the plate

export type Room14Script = RoomScript & { onLeave?(ctx: GameCtx): void };

// Same convention as every orderly room's local copy.
function bearingTo(dx: number, dz: number, yaw: number): number {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const fwd = -dx * sin - dz * cos;
  const right = dx * cos - dz * sin;
  return Math.atan2(right, fwd);
}

export const room14Script: Room14Script = (() => {
  let orderly: Orderly | null = null;
  let orderlyWasOn = false;
  let occupants = 0; // union of player + orderly currently on the plate
  let closeTimer = 0;
  let gateOpen = false;
  let sawFirstOpen = false;
  let sawOrderlyOpen = false;
  let sawThrough = false;

  function openGate(ctx: GameCtx, byOrderly: boolean): void {
    if (gateOpen) return;
    gateOpen = true;
    gateCollider.minX = 999;
    gateCollider.maxX = 999.2; // standard disable trick
    ctx.moveInteractable('gate14', GATE_OPEN_POS, Math.PI / 2);
    if (!sawFirstOpen) {
      sawFirstOpen = true;
      ctx.hud.toast('the floor remembers weight. the door remembers the floor.');
    } else if (byOrderly && !sawOrderlyOpen) {
      sawOrderlyOpen = true;
      ctx.hud.toast("he just did what you couldn't do alone.");
    }
    ctx.telemetry.event('gate_open', { byOrderly });
  }

  function tryCloseGate(ctx: GameCtx): void {
    // Never re-engage onto a body still inside the gate's own footprint —
    // the trap class room13's per-frame wall-clamp exists to prevent
    // (tryMove freezes any body whose position already penetrates an AABB).
    // Deferred: returns without closing, rechecked every frame.
    const p = ctx.playerPos();
    const playerClear = !(p.x > -1.35 && p.x < 1.35 && p.z > -14.3 && p.z < -13.7);
    const orderlyClear =
      !orderly || !(orderly.x > -1.35 && orderly.x < 1.35 && orderly.z > -14.3 && orderly.z < -13.7);
    if (!playerClear || !orderlyClear) return;
    gateOpen = false;
    gateCollider.minX = -1;
    gateCollider.maxX = 1;
    ctx.moveInteractable('gate14', GATE_CLOSED_POS, 0);
    ctx.telemetry.event('gate_close');
  }

  function plateEnter(ctx: GameCtx, byOrderly: boolean): void {
    occupants += 1;
    if (occupants === 1) openGate(ctx, byOrderly);
  }

  function plateExit(): void {
    occupants = Math.max(0, occupants - 1);
    if (occupants === 0) closeTimer = SETTLE_SEC;
  }

  const script: Room14Script = {
    onEnter(ctx) {
      orderly?.dispose();
      orderly = new Orderly(
        ctx.scene,
        WAYPOINTS,
        [CRATE],
        {
          onWarn: () => {
            ctx.hud.toast('he is looking at you.');
            ctx.telemetry.event('orderly_spotted');
          },
          onChaseStart: () => {
            ctx.hud.toast('run. or stop being visible.');
            ctx.telemetry.event('orderly_chase');
          },
          onCaught: () => {
            ctx.state.forceState('lucid');
            ctx.shiftFx();
            ctx.teleportPlayer(room14.spawn.x, room14.spawn.z);
            ctx.hud.toast('hands. a needle. "back to the start of the wing," he says.');
            ctx.telemetry.event('orderly_caught');
          },
        },
        { colliders: ORDERLY_COLLIDERS },
      );
      orderly.setWardState(ctx.state.state);
      // module-level state survives across entries; reset all of it
      orderlyWasOn = false;
      occupants = 0;
      closeTimer = 0;
      gateOpen = false;
      sawFirstOpen = false;
      sawOrderlyOpen = false;
      sawThrough = false;
      gateCollider.minX = -1;
      gateCollider.maxX = 1;
      ctx.hud.setObjective('the wing goes on. so does he.');
    },

    isAvailable(id) {
      return id !== 'gate14';
    },

    onTriggerEnter(id, ctx) {
      if (id === 'plate14') plateEnter(ctx, false);
      if (id === 'vestibule14' && !sawThrough) {
        sawThrough = true;
        ctx.hud.setObjective("through. it doesn't get gentler from here.");
      }
    },

    onTriggerExit(id) {
      if (id === 'plate14') plateExit();
    },

    onStateChange(next) {
      orderly?.setWardState(next);
    },

    update(dt, _t, ctx) {
      if (!orderly) return;
      const p = ctx.playerPos();
      orderly.update(dt, p.x, p.z, ctx.state.state);

      // Orderly-on-plate — engine can't see him (room-owned), so this room
      // runs the identical containment test itself, edge-detected.
      const orderlyOn = inTrigger(plate.trigger, orderly.x, orderly.z, ctx.state.state);
      if (orderlyOn && !orderlyWasOn) plateEnter(ctx, true);
      if (!orderlyOn && orderlyWasOn) plateExit();
      orderlyWasOn = orderlyOn;

      if (gateOpen && occupants === 0) {
        closeTimer -= dt;
        if (closeTimer <= 0) tryCloseGate(ctx); // may defer; retried next frame
      }

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

export const debugPatrols: DebugPatrol[] = [{ waypoints: WAYPOINTS, label: 'A' }];
```

- [ ] **Step 2: Run check:rooms to see the expected failures.**

Run: `npm run check:rooms`
Expected: FAIL with exactly these (the genuine red — room exists, wiring doesn't):
- `'room14' missing from main.ts rooms record`
- `'room14' missing from src/devtools/map.ts MODULES (map viewer)`
- `'room14' is registered but unreachable from room1 (not in the exit chain)`

If it instead fails with a `patrol()` clearance error or an import error, the geometry or code above has a bug — fix that first, do not proceed.

- [ ] **Step 3: Commit.**

```bash
git add src/rooms/room14.ts
git commit -m "feat: room14 'the Hold' — pressure-plate gate, one orderly (M10)"
```

---

### Task 7: wiring — registries, room13 exit, end card

**Files:**
- Modify: `src/main.ts` (imports ~line 29, rooms record ~line 50, endOfBuild ~line 209)
- Modify: `src/devtools/map.ts` (MODULES ~line 31)
- Modify: `src/rooms/room13.ts` (exits, line ~176)

- [ ] **Step 1: Register room14.** In `src/main.ts`, after the room13 import:

```ts
import { room14, room14Script } from './rooms/room14';
```

In the `rooms` record, after `room13:`:

```ts
  room14: { def: room14, script: room14Script },
```

In `src/devtools/map.ts` `MODULES`, after `room13:`:

```ts
  room14: () => import('../rooms/room14'),
```

- [ ] **Step 2: Repoint room13.** In `src/rooms/room13.ts`, change its exit (line ~176):

```ts
  exits: [{ to: 'room14', minX: -1, maxX: 1, minZ: -31.9, maxZ: -30.8 }],
```

(Keep the AABB numbers exactly as they are in the file — only `to:` changes, `'END'` → `'room14'`.)

- [ ] **Step 3: Update the end card.** In `src/main.ts` `endOfBuild()`, replace the `hud.showEndCard(…)` call's first three arguments (title, subtitle, body) with:

```ts
  hud.showEndCard(
    'END OF MILESTONE 10',
    'THE FLOOR REMEMBERS WEIGHT.',
    `<em>PLAYTEST — tell the devs:</em><br><br>
     1 · Room 14: the gate re-locked the first time you walked away from the plate. Did that one failure teach you the room, or just annoy you?<br>
     2 · Which route did you actually take — sprint it, let him carry it, or spend the pill to do it calm? Did you realize all three existed?<br>
     3 · Did you work out on your own that his patrol crosses the plate — and that he keeps walking even when you can't see him?<br>
     4 · After room 13, the dispenser is right there at spawn. Relief, or did the wing lose its teeth too fast?<br>
     5 · You ended with ${state.pills}/${state.maxPills} pills. Did the plate room feel like it cost you anything?`,
    'READMIT',
    () => location.reload(),
  );
```

- [ ] **Step 4: Verify green.**

Run: `npm run check:rooms`
Expected: `check:rooms OK — 15 room defs imported clean` and chain ending `… -> room13 -> room14 -> END`.

Run: `npm run build`
Expected: clean (tsc + vite + chmod).

- [ ] **Step 5: Commit.**

```bash
git add src/main.ts src/devtools/map.ts src/rooms/room13.ts
git commit -m "feat: wire room14 into the game — room13 exit, registries, M10 end card"
```

---

### Task 8: docs + full verification

**Files:**
- Modify: `ROOM_AUTHORING.md` (§4 checklist ~line 358, §7 kit reference ~line 494)

- [ ] **Step 1: Document the kit additions.** In `ROOM_AUTHORING.md` §7, after the `scrawl()` entry (match the section's existing entry format — read a neighboring entry first and mirror its structure), add entries for:

`inTrigger(trigger, x, z, state)` — pure containment test against a `TriggerDef`, honoring its state filter; the same check the engine's player poll runs, for use against room-owned actors (an `Orderly`'s public `.x`/`.z`) with a `let wasOn = false` edge-detect local.

`pressurePlate({ id, minX, maxX, minZ, maxZ, states?, y? })` — returns `{ trigger, block }`; spread `block` into `blocks`, `trigger` into `RoomDef.triggers`. No implicit collider: plates stay walkable and patrols cross them like bare floor; author `rb.solid(...)` separately if a trigger region must also block.

In §4's checklist, add one item:

```markdown
- **Reversible trigger-held gates**: any collider re-engaged on trigger-exit
  must defer the close while a body's circle still overlaps the gate's own
  footprint, rechecked per frame (room14's `tryCloseGate` is the worked
  example) — closing onto a body freezes it in place, the same bug class
  room13's per-frame wall-clamp guards against.
```

- [ ] **Step 2: Full verification pass, in order.**

Run: `npm run check:rooms`
Expected: `check:rooms OK — 15 room defs imported clean`, chain `room1 -> … -> room14 -> END`.

Run: `npm run build`
Expected: clean.

Run: `npm run dev`, open `http://localhost:5173/map.html?room=room14`
Expected, by eye: violet `plate14` rect coinciding with the plate block outline on the patrol line; violet `vestibule14` band past the gate wall; patrol line A between (-4.2,-11.9) and (4.2,-11.9) with sight envelopes; gate gap x[-1,1] at z=-14 with the door block in it; dispenser circle on the west wall near spawn; both scrawls; exit band → END. No error box.

Manual smoke test at `http://localhost:5173/` (drive room14 directly is not possible — the game is a linear chain — so either play through, or temporarily change `loadRoom('room1')` at ~line 240 to `loadRoom('room14')` for the check and REVERT it before committing):
1. Stand on the plate → gate swings open, toast fires. Step off → after ~0.7s it closes.
2. Sprint route: plate → gate before it closes (should be makeable, not frame-perfect).
3. Wait by the crate unmed; when the orderly's leg crosses the plate the gate opens without you touching it (second toast on his first carry).
4. Stand IN the gate opening while the settle expires → gate must NOT close on you (defers until you step out).
5. Get caught unmed → forced lucid, teleport to spawn, gate state resets sanely.
6. Walk out through the vestibule → objective updates, then the M10 end card.

- [ ] **Step 3: Commit.**

```bash
git add ROOM_AUTHORING.md
git commit -m "docs: ROOM_AUTHORING — pressurePlate/inTrigger kit entries + reversible-gate rule (M10)"
```

- [ ] **Step 4: Stop. Do not push.** Pushing publishes to GitHub Pages. Report completion to Tom; he decides when to push (tailnet-only until then — `npm run build` already updated the bind-mounted `dist/` for https://hellos.impala-alpha.ts.net:8444).
