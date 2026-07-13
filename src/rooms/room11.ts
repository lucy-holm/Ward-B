import { RoomBuilder } from './build';
import type { ColliderDef, RoomDef, RoomScript } from './types';
import type { GameCtx } from '../game/context';
import { openKeypad } from '../ui/keypad';
import { Orderly, type OrderlyAABB } from '../game/orderly';

// ROOM 11 — the Treatment Corridor. Scarcity, taught explicitly. Playtest 7:
// "the second pill didn't really have an effect — you could still do it with
// one." This room makes that impossible.
//
// Three chambers, one dispenser, north to south:
//   Z1 the entry hall     (spawn, the ONLY dispenser, safe)
//   Z2 the ward floor     (one orderly, the split-free code, deep in an east
//                           nook 6m off his patrol — outside his 6m sight
//                           range at every point on that leg, see below)
//   Z3 the exit chamber   (safe, keypad, door)
//
// GATE 1 (Z1/Z2) and GATE 2 (Z2/Z3) are both unmed-sealed — solid while raw,
// open while calm, same trick as every gate since room 1. There is no
// dispenser between them. onEnter forces the player unmed the instant the
// room loads: whatever state they left room 10 in (almost always lucid, coming
// off its keypad), they arrive here raw. That guarantees gate 1 costs a pill
// no matter how the player plays it — without it, a player who tops off lucid
// and never shifts before reaching gate 1 would cross it for free (the gate
// simply isn't there while lucid) and the whole "carry both" lesson would be
// skippable. Forcing unmed at the threshold, before the player has touched
// anything, makes the intended solve the only solve:
//
//   forced unmed at spawn -> dispenser (still unmed, top to 2, 0 spent)
//   -> gate 1, sealed -> shift lucid (-1, 1 left) -> cross
//   -> shift unmed (free) to read the code -> still unmed at gate 2
//   -> gate 2, sealed -> shift lucid (-1, 0 left) -> cross
//   -> keypad, already lucid from that crossing -> door
//
// Two pills, spent back to back, no dispenser in between — the mandatory
// double-spend. WALK-BACK: both gates are unmed-sealed only, never
// lucid-sealed, so a lucid player can always walk back through either one for
// free in either direction — there is no state in this room where the path
// back to the dispenser is blocked while calm. The only way to strand
// yourself is to go unmed inside Z2 with 0 pills already spent (e.g. burn the
// second pill on a needless shift instead of the gate); from there the only
// way out is the same one the rest of the game already relies on — walk into
// his cone and let the catch force you lucid. Worst-case trace: caught
// anywhere in Z2, or unmed-and-broke anywhere in Z2 -> caught -> forced
// lucid, teleported to spawn, pills kept -> dispenser is three steps away,
// inside the same open hall, no gate between it and you. Never a dead end.
//
// TIMER SOFT-LOCK AUDIT (medication-wears-off pass): the above "unmed-and-
// broke" case used to require the player to spend recklessly to reach it —
// with lucidity now expiring on its own after ~45s, it's reachable by doing
// nothing at all: cross gate 1 lucid, get caught up in reading the code or
// dodging him, and the clock revokes lucid out from under you wherever you
// happen to be standing. Both gates are unmed-sealed, so a raw revert in Z2
// or Z3 walls off dispenser11 in both directions at once — the "walk back"
// escape hatch this header used to lean on doesn't exist under a timer,
// because you don't get to choose when you go raw anymore. Getting caught is
// still a valid unstick (it force-shifts lucid regardless of pills), but the
// law is "reach a dispenser," not "get caught by him," so both newly-isolated
// zones now carry their own: dispenser11b in Z2, dispenser11c in Z3. Neither
// changes the pill math — gate 1 and gate 2 still cost one pill each, same as
// always, whether that pill comes from a bank made in Z1 or a top-up made
// mid-crossing — they only mean a mistimed revert in either zone is a walk,
// not a wall.

const CODE = '7042';

const rb = new RoomBuilder();

// Z1 — the entry hall. x [-9,9] z [10,22]. Dispenser here; the only one in
// the building from this point on.
rb.wallX(-9, 9, 22); // south cap, behind spawn
rb.wallZ(10, 22, -9); // west wall
rb.wallZ(10, 22, 9); // east wall

// GATE 1 — Z1/Z2 boundary, z=10. Solid while unmed, open while lucid.
rb.wallX(-9, -2, 10);
rb.wallX(2, 9, 10);
rb.block([4, 3, 0.24], [0, 1.5, 10], 'wall', 'unmed');
rb.solid(-2, 2, 9.88, 10.12, 'unmed');

// Z2 — the ward floor. x [-9,9] z [-6,10]. One orderly, patrolling an
// eastward-skewed loop so the whole west side of the room — including the
// code nook — sits well outside his reach.
rb.wallZ(-6, 1, -9); // west wall, south of the nook mouth
rb.wallZ(3, 10, -9); // west wall, north of the nook mouth
rb.wallZ(-6, 10, 9); // east wall, unbroken

// the code nook — carved into the west wall, mouth z [1,3], 2m deep. His
// nearest leg runs at x=-3 (see WAYPOINTS below): a straight 6m perpendicular
// offset. His sight range is 6m flat, so the ONE point on that leg where
// distance to the nook mouth even reaches 6m is the perpendicular foot itself
// (x=-3, z=2) — and there, heading tangent to the leg (north or south), the
// nook sits at 90 degrees off his forward cone (55 degrees total, 27.5 either
// side). Every other point on the leg is strictly farther than 6m. Solving
// cos(27.5deg) = s/sqrt(s^2+p^2) for the offset p at which a straight leg can
// ever bring a point into both range AND cone at once gives p > ~2.77m as the
// threshold past which it's geometrically impossible — 6m clears that with
// room to spare, so the nook is provably unseeable from patrol, not just
// "usually safe." (Room 7's keypad-vs-corner note first flagged this
// perpendicular-safe property; this nook leans on it deliberately instead of
// just getting lucky with the numbers.) The real exposure window is the walk
// to and from it, and the two gate crossings — not the read itself.
rb.wallX(-11, -9, 1); // nook south bracket
rb.wallX(-11, -9, 3); // nook north bracket
rb.wallZ(1, 3, -11); // nook end cap — the code is scrawled here
const NOOK: OrderlyAABB = { minX: -11, maxX: -9, minZ: 1, maxZ: 3 };
rb.block([0.12, 0.14, 2], [-9, 2.7, 2], 'glow'); // glow lintel over the nook mouth

// a central occluder, inside the loop's open interior — not on his path, just
// a shadow within a couple of steps of the gate 2 approach if he's spotted
// mid-crossing.
const ISLAND: OrderlyAABB = { minX: 0.5, maxX: 3.5, minZ: 0.5, maxZ: 3.5 };
rb.block([3, 1.8, 1.4], [2, 0.9, 2], 'wall2');
rb.solid(ISLAND.minX, ISLAND.maxX, ISLAND.minZ, ISLAND.maxZ);

// GATE 2 — Z2/Z3 boundary, z=-6. Cross this one lucid and the keypad, just
// past it, needs nothing further — you're already calm.
rb.wallX(-9, -2, -6);
rb.wallX(2, 9, -6);
rb.block([4, 3, 0.24], [0, 1.5, -6], 'wall', 'unmed');
rb.solid(-2, 2, -6.12, -5.88, 'unmed');

// Z3 — the exit chamber. x [-9,9] z [-14,-6]. Safe: no orderly reaches here.
rb.wallZ(-14, -6, -9);
rb.wallZ(-14, -6, 9);
rb.wallX(-9, -1, -14); // north, west of the door gap
rb.wallX(1, 9, -14); // north, east of the door gap

// vestibule beyond the exit door, x [-1,1] z [-16,-14]
rb.wallZ(-16, -14, -1);
rb.wallZ(-16, -14, 1);
rb.wallX(-1, 1, -16);
rb.block([1.8, 2.6, 0.06], [0, 1.4, -15.8], 'glow');

const doorCollider: ColliderDef = { minX: -1, maxX: 1, minZ: -14.13, maxZ: -13.87 };
rb.colliders.push(doorCollider);

const ORDERLY_COLLIDERS: ColliderDef[] = rb.colliders.filter(
  (c) => c.states === undefined || c.states === 'both',
);

export const room11: RoomDef = {
  id: 'room11',
  floor: { minX: -11, maxX: 9, minZ: -16, maxZ: 22 },
  spawn: { x: 0, z: 20, yaw: 0 },
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    {
      text: 'two doors ahead. no cabinets\nbetween them. carry both.',
      size: 2.8,
      pos: [-8.86, 1.7, 11],
      rotY: Math.PI / 2,
    },
    { text: "the hallway forgets\nhow long it's been", size: 2.4, pos: [-8.86, 1.7, 20], rotY: Math.PI / 2 },
    { text: 'the wall gives way to the west.\nread it quick.', size: 2.6, pos: [8.86, 1.7, 5], rotY: -Math.PI / 2 },
    { text: 'it opens for the calm.\nnot for you, yet.', size: 2.4, pos: [-5, 1.7, -5.86], rotY: 0 },
    { text: '7 0 4 2', size: 2.2, pos: [-10.98, 1.7, 2], rotY: Math.PI / 2, big: true },
  ],
  interactables: [
    {
      id: 'dispenser11',
      type: 'dispenser',
      size: [0.16, 0.75, 0.55],
      pos: [8.72, 1.45, 17],
      mat: 'dispenser',
      states: 'both',
      facing: 'nx',
      label: 'use the dispenser',
    },
    {
      // Safety dispenser, Z2 (the ward floor) — see the TIMER SOFT-LOCK AUDIT
      // note above. Flush on the east wall, just south of gate 1, north of
      // his patrol rectangle's z<=7.5 footprint (z=9 clears it by 1.5m) and
      // well east of his x=7 leg. Sits on the opposite side of the room from
      // the code nook, so it's not something a player heading for the code
      // walks past for free — reaching it is a real, if short, detour.
      id: 'dispenser11b',
      type: 'dispenser',
      size: [0.16, 0.75, 0.55],
      pos: [8.72, 1.45, 9],
      mat: 'dispenser',
      states: 'both',
      facing: 'nx',
      label: 'use the dispenser',
    },
    {
      // Safety dispenser, Z3 (the exit chamber) — no orderly ever reaches
      // this zone. Flush on the west wall, off the x~0-1.35 gate-2-to-keypad
      // line, so it's tucked to the side rather than sitting on the direct
      // route.
      id: 'dispenser11c',
      type: 'dispenser',
      size: [0.16, 0.75, 0.55],
      pos: [-8.72, 1.45, -10],
      mat: 'dispenser',
      states: 'both',
      facing: 'px',
      label: 'use the dispenser',
    },
    {
      id: 'keypad11',
      type: 'keypad',
      size: [0.4, 0.5, 0.14],
      pos: [1.35, 1.45, -13.75],
      mat: 'pad',
      states: 'both',
      facing: 'pz',
      label: 'use the keypad',
    },
    {
      id: 'exitdoor',
      type: 'door',
      size: [2, 3, 0.2],
      pos: [0, 1.5, -14],
      mat: 'door',
      states: 'both',
      facing: 'pz',
      label: 'the exit door',
    },
  ],
  lights: [
    { pos: [0, 20] },
    { pos: [-5, 16] },
    { pos: [5, 16] },
    { pos: [0, 12] },
    { pos: [5, 8] },
    { pos: [-5, 8] },
    { pos: [5, 4] },
    { pos: [-8, 3] },
    { pos: [5, 0] },
    { pos: [-5, 0] },
    { pos: [5, -4] },
    { pos: [-5, -4] },
    { pos: [0, -8] },
    { pos: [0, -11] },
    { pos: [0, -14] },
  ],
  exits: [{ to: 'room12', minX: -1, maxX: 1, minZ: -15.9, maxZ: -14.8 }],
};

// His loop is skewed east: the west leg sits at x=-3, a full 6m off the code
// nook's mouth (x=-9). Waypoints are 2+ from every wall/gate collider (see
// the header note) and the nook's own bracket walls sit 6m further out still.
const WAYPOINTS = [
  { x: 7, z: 7.5 },
  { x: 7, z: -3.5 },
  { x: -3, z: -3.5 },
  { x: -3, z: 7.5 },
];

// RoomScript is frozen; same locally-extended type as the other orderly rooms
// for the teardown hook.
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
  let orderly: Orderly | null = null;
  let doorUnlocked = false;
  let sawUnmedToast = false;

  function spawnOrderly(ctx: GameCtx): void {
    orderly?.dispose();
    orderly = new Orderly(
      ctx.scene,
      WAYPOINTS,
      [ISLAND, NOOK],
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
          ctx.teleportPlayer(room11.spawn.x, room11.spawn.z);
          ctx.hud.toast('hands. a needle. "you were so close," he says.');
          ctx.telemetry.event('orderly_caught');
        },
      },
      { colliders: ORDERLY_COLLIDERS },
    );
    orderly.setWardState(ctx.state.state);
  }

  const script: Room11Script = {
    onEnter(ctx) {
      spawnOrderly(ctx);
      doorUnlocked = false;
      sawUnmedToast = false;
      // Forces the mandatory double-spend regardless of what state the
      // player left room 10 in — see the header note. Doesn't touch pills.
      ctx.state.forceState('unmed');
      ctx.shiftFx();
      ctx.hud.toast("you come to mid-stride, raw. the calm hasn't caught up yet.");
      ctx.hud.setObjective('the treatment corridor. one dispenser. carry enough — there is nowhere else to get it.');
    },

    isAvailable(id) {
      if (id === 'exitdoor') return false;
      if (id === 'keypad11') return !doorUnlocked;
      return true;
    },

    onInteract(id, ctx) {
      if (id === 'keypad11') {
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
            ctx.moveInteractable('exitdoor', [-1, 1.5, -14.85], Math.PI / 2);
            doorCollider.minX = 999;
            doorCollider.maxX = 999.2;
            ctx.hud.toast('7042. both pockets, spent.');
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
      orderly?.setWardState(next);
      if (next === 'unmed' && !sawUnmedToast) {
        sawUnmedToast = true;
        ctx.hud.toast('the corridor holds its breath differently now.');
      }
    },

    update(dt, _t, ctx) {
      if (!orderly) return;
      const p = ctx.playerPos();
      orderly.update(dt, p.x, p.z, ctx.state.state);

      const level = orderly.watching;
      const chasing = orderly.chasing;
      const dist = Math.hypot(orderly.x - p.x, orderly.z - p.z);
      if (level > 0 || chasing) {
        const bearing = bearingTo(orderly.x - p.x, orderly.z - p.z, p.yaw);
        ctx.hud.setThreat(level, bearing);
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
