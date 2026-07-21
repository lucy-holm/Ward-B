import { RoomBuilder, dispenser, lightSwitch, scrawl, patrol, makeOrderlyRoomScript } from './kit';
import type { ColliderDef, OrderlyAABB, RoomDef } from './kit';
import type { GameCtx } from '../game/context';
import type { DebugPatrol } from '../devtools/map-types';
import type { PowerRoute } from './room19';

// ROOM 18 — the Relay Room. The wing's whole payload is one mechanical
// choice: a two-position power relay wired (per the scrawls) to feed either
// the ward's LIGHTS or its DOORS, never both. The choice is legible in
// advance — the nook's scrawls spell out what each throw buys before you
// touch anything — and it is physically irreversible the instant you throw
// it: the lever you didn't pick comes off the wall. The consequence isn't
// visible until room19 ('the Undercroft'), which is built from
// buildRoom19(flags.get('room18.power')) — the first room in the game where
// an action's effect lands in a room you can't see yet, in a game that has
// never once let you go back and check. No keypad, no code, so no
// randomize-codes wiring — the relay is a switch, not a combination
// (settings.isRandomizeCodesEnabled is deliberately not consulted here).
//
// PLAYTEST 10 FIX (Tom): two failures shipped in the original cut. (1) the
// levers reused keypad() — same mesh/mat as every door-code panel in the
// game — so they read as inert wall pads, not a momentous choice; fixed by
// switching to kit's lightSwitch() (type:'switch', mat:'breaker',
// World.buildSwitch's lever-off-a-body render, room16's fixture), which
// reads mechanical rather than administrative. (2) the exit was an open gap
// with no lock, so a player could walk straight past the room's entire
// point and room19 would silently build its default 'lights' branch; fixed
// by sealing the exit behind a real door + mutable collider (room14/room16's
// pattern: a ColliderDef pushed into rb.colliders now, shoved to x999 on
// unlock) that only opens on commit — the lever IS the key, so "unlock"
// here means "throw either lever," not "solve a puzzle at the door."
//
// The two levers are now a single, ungated pair — leverLights and
// leverDoors, states:'both' — legible and throwable in EITHER ward state.
// The original cut split each into a lucid-only lever + an unmed-only
// "smear plate" that refused to be read; that gate served no design point
// Tom asked for (he never said the choice should cost anything) and it
// broke the wing's audited economy: room18+room19 together are supposed to
// cost ZERO pills beyond whatever the player already spent evading the
// belt orderly. Collapsing the pair to one state-agnostic lever restores
// that economy and removes a needless failure mode (a 0-pill unmed player
// standing at a locked exit unable to read which lever is which). Throwing
// one removes the other (removeInteractable — the swallowed-pill-cup
// precedent), drops the chosen handle into its thrown pose, and swings the
// exit door open in the same beat. No confirm dialog: the throw is the
// confirm. A catch after the throw teleports to spawn with the flag still
// set, the handle still dropped, and the door still open (closures don't
// reset on a catch — same reason room7's doorUnlocked survives one); the
// room just looks like a room where you already decided.
//
// Zones, south to north:
//   Z1 entry hall   z[2.3,5]  — spawn, dispenser18 behind a stub wall
//   Z2 relay hall   z[-3,2.3] — one orderly, rectangular belt, low console
//   Z3 choice nook  z[-7,-3]  — the two levers flank the sealed exit door
//                   (x=-1.6 and x=1.6, the door itself at x[-1,1]), all at
//                   z=-7, occluder-protected
//   exit door       x[-1,1] at z=-7 — CLOSED and collider-solid until
//                   either lever is thrown; on commit it swings open
//                   (moveInteractable to the vestibule side, collider
//                   shoved to x999, room14/16's exact trick). The choice IS
//                   the room's gate now — there is no other lock, so a
//                   player literally cannot leave without deciding.
//
// SOFT-LOCK AUDIT: dispenser18 sits in Z1, reachable unmed from spawn
// without entering the belt (the stub wall is south-of-belt geometry, not a
// gate) — a 0-pill arrival holds 1 pill before the relay is even in view.
// Nothing in this room requires a pill: the belt crossing is
// orderly-dodge-only (unmed is safe from geometry, only ever threatened by
// the orderly — hard law 2), and the relay throw itself works identically
// lucid or unmed (states:'both'). So a 0-pill unmed player who clears the
// belt can always walk straight to either lever, throw it, and leave —
// the exit door's only unlock condition is "a lever got thrown," which
// needs zero pills to satisfy. Catch anywhere: forced lucid + teleport to
// spawn, pills kept; pre-throw that's a clean retry (flag unset, door
// re-sealed on next real entry, dispenser refillable), post-throw there's
// nothing left to re-litigate — the door stays open, the flag stays set.
// Never a strand.
//
// REACTION-TIME AUDIT (belt {(-4,1),(4,1),(4,-2),(-4,-2)}): the dispenser
// and its scrawl are NOT protected by raw distance (the belt's west reach
// is ~3.5m from the dispenser — this room is too small for the 8.2m floor,
// exactly room7's situation) but by occlusion: STUB's AABB is passed to the
// orderly as an occluder, and every patrol point within his 6m sight range
// of the dispenser/scrawl has its sightline cross the stub (verified over
// the in-range span: crossings at z=2.3 land in x[-5.3,-2.8], inside the
// stub's x[-6,-2.6]). The nook is protected the room10 way: NOOK's own AABB
// is an occluder, and a sightline from outside a box to a player inside it
// always crosses the box — provably unseeable at both levers and the door,
// regardless of distance or facing. The console is cover mid-crossing
// (occluder + collider, the island beat). Orderly is unmodified
// TUNING.orderly.

const rb = new RoomBuilder();

// shell — floor x[-6,6] z[-9,5], spawn end at +z (south)
rb.wallX(-6, 6, 5); // south cap, behind spawn
rb.wallZ(-7, 5, -6); // west wall
rb.wallZ(-7, 5, 6); // east wall

// Z1/Z2 stub — occludes the dispenser pocket from the belt (see audit).
rb.wallX(-6, -2.6, 2.3);
const STUB: OrderlyAABB = { minX: -6, maxX: -2.6, minZ: 2.18, maxZ: 2.42 };

// low center console — one piece of cover to duck behind mid-crossing
const CONSOLE: OrderlyAABB = { minX: -1, maxX: 1, minZ: -0.45, maxZ: 0.45 };
rb.block([2, 1.0, 0.9], [0, 0.5, 0], 'prop');
rb.solid(CONSOLE.minX, CONSOLE.maxX, CONSOLE.minZ, CONSOLE.maxZ);

// Z2/Z3 mouth walls — the nook opens x[-2,2]
rb.wallX(-6, -2, -3);
rb.wallX(2, 6, -3);

// nook side walls + north cap with the exit gap x[-1,1]
rb.wallZ(-7, -3, -2);
rb.wallZ(-7, -3, 2);
rb.wallX(-6, -1, -7);
rb.wallX(1, 6, -7);
// The exit door lives in the gap — sealed (collider solid) until a lever is
// thrown. Same mutable-collider trick as room14's gate14 / room16's
// exitdoor16: pushed into rb.colliders now, shoved to x999 on unlock, never
// replaced, so nothing else holding a reference needs to know it moved.
const doorCollider: ColliderDef = { minX: -1, maxX: 1, minZ: -7.1, maxZ: -6.9 };
rb.colliders.push(doorCollider);
// The whole nook interior as one occluder AABB — room10's trick: any
// sightline from outside the box to a player inside it crosses the box.
const NOOK: OrderlyAABB = { minX: -2, maxX: 2, minZ: -7, maxZ: -3 };

// exit vestibule beyond the doorway, x[-1,1] z[-9,-7]
rb.wallZ(-9, -7, -1);
rb.wallZ(-9, -7, 1);
rb.wallX(-1, 1, -9);
rb.block([1.8, 2.6, 0.06], [0, 1.4, -8.8], 'glow');

const WAYPOINTS = patrol(
  [
    { x: -4, z: 1 },
    { x: 4, z: 1 },
    { x: 4, z: -2 },
    { x: -4, z: -2 },
  ],
  rb.colliders,
);

// The relay: one lever per throw, states:'both' — legible and operable
// lucid or unmed (see header on why the original lucid-gated pair got
// collapsed). lightSwitch()'s breaker-mat body + protruding lever reads as
// "throw this," not "type on this" — the fix for Tom's "inert wall pad"
// note.
const THROWN_Y = 1.17; // handle drops into its slot on commit (default mount y is 1.45)
// lightSwitch() mount math for side 'n', wallAt -7 (face z=-6.88, thin 0.16
// -> proud center z=-6.80) — reused for the thrown pose so the handle stays
// flush.
const LEVER_Z = -6.8;

const DOOR_CLOSED_POS: [number, number, number] = [0, 1.5, -7];
const DOOR_OPEN_POS: [number, number, number] = [-1, 1.5, -7.85];

export const room18: RoomDef = {
  id: 'room18',
  name: 'the Relay Room',
  floor: { minX: -6, maxX: 6, minZ: -9, maxZ: 5 },
  spawn: { x: 0, z: 4, yaw: 0 },
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    // Z1, stub-occluded (see audit) — points the room at the nook.
    scrawl('the whole ward hangs\noff one relay. theirs.', 'w', -6, 3.4),
    // nook, all NOOK-occluded, read on the approach before either lever:
    scrawl('it only moves once.\nthey made sure.', 'w', -2, -5),
    scrawl('power for the doors,\nor power for the lights.\nnever both. never again.', 'w', -2, -4, {
      size: 2.2,
    }),
    // Closest to the levers/door — the new lock, spelled out.
    scrawl("the door won't move\ntill the relay does.", 'w', -2, -6.3, { size: 2.2 }),
    scrawl('lights: the long way, lit.\ndoors: the short way, dark.', 'e', 2, -4.6, {
      size: 2.2,
    }),
  ],
  interactables: [
    dispenser({ id: 'dispenser18', side: 'w', wallAt: -6, along: 4, label: 'use the dispenser' }),
    lightSwitch({ id: 'leverLights', side: 'n', wallAt: -7, along: -1.6, label: 'pull: power to the LIGHTS' }),
    lightSwitch({ id: 'leverDoors', side: 'n', wallAt: -7, along: 1.6, label: 'pull: power to the DOORS' }),
    {
      id: 'exitdoor18',
      type: 'door',
      size: [2, 3, 0.2],
      pos: DOOR_CLOSED_POS,
      mat: 'door',
      states: 'both',
      facing: 'pz',
      label: 'the relay door',
    },
  ],
  lights: [
    { pos: [0, 4] },
    { pos: [-4.6, 3.4] },
    { pos: [-3, -0.5] },
    { pos: [3, -0.5] },
    { pos: [0, -5] },
    { pos: [0, -8.6] },
  ],
  exits: [{ to: 'room19', minX: -1, maxX: 1, minZ: -8.9, maxZ: -7.9 }],
};

export const room18Script = (() => {
  // Survives a catch on purpose (see header) — reset only on room entry.
  let thrown: PowerRoute | null = null;

  function commit(ctx: GameCtx, choice: PowerRoute): void {
    thrown = choice;
    ctx.flags.set('room18.power', choice);
    // The throw you didn't pick comes off the wall.
    const loser = choice === 'lights' ? 'Doors' : 'Lights';
    ctx.removeInteractable(`lever${loser}`);
    // The chosen handle drops into its slot.
    const winner = choice === 'lights' ? 'Lights' : 'Doors';
    const along = choice === 'lights' ? -1.6 : 1.6;
    ctx.moveInteractable(`lever${winner}`, [along, THROWN_Y, LEVER_Z]);
    // The choice was the lock — throwing either lever opens the door.
    doorCollider.minX = 999;
    doorCollider.maxX = 999.2;
    ctx.moveInteractable('exitdoor18', DOOR_OPEN_POS, Math.PI / 2);
    ctx.hud.toast(
      choice === 'doors'
        ? 'the relay slams. somewhere, the bulbs give out for good.'
        : 'the relay slams. somewhere, a door stays shut for good.',
    );
    ctx.hud.setObjective('the door ahead. whatever that bought you.');
    ctx.telemetry.event('wing_power_set', { power: choice });
  }

  return makeOrderlyRoomScript({
    orderlies: [{ waypoints: WAYPOINTS, occluders: [STUB, CONSOLE, NOOK] }],
    colliders: rb.colliders,
    spawn: room18.spawn,
    onEnterObjective: "the relay room. it only moves once, and it's the only way out.",
    catchToast: 'hands. a needle. "you don\'t get to pick twice," he says.',
    unmedToast: 'something paces the hall between you and the switches.',
    extraScript: {
      onEnter(ctx) {
        thrown = null;
        doorCollider.minX = -1;
        doorCollider.maxX = 1;
        ctx.moveInteractable('exitdoor18', DOOR_CLOSED_POS, 0);
      },
      isAvailable(id) {
        // Door is never directly interactable — walking through the open
        // gap does the rest, same convention as room14's gate/room16's
        // exitdoor16. The chosen lever stays on the wall but stops being a
        // prompt once thrown; the loser is already gone (removeInteractable).
        if (id === 'exitdoor18') return false;
        if (thrown && (id === 'leverLights' || id === 'leverDoors')) return false;
        return true;
      },
      onInteract(id, ctx) {
        if (id === 'leverLights' || id === 'leverDoors') {
          if (thrown) return true; // unreachable belt-and-braces (isAvailable already hides it)
          commit(ctx, id === 'leverLights' ? 'lights' : 'doors');
          return true;
        }
        return false;
      },
    },
  });
})();

export const debugPatrols: DebugPatrol[] = [{ waypoints: WAYPOINTS, label: 'A' }];
