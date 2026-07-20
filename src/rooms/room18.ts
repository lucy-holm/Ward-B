import { RoomBuilder, dispenser, keypad, scrawl, patrol, makeOrderlyRoomScript } from './kit';
import type { OrderlyAABB, RoomDef } from './kit';
import type { GameCtx } from '../game/context';
import type { DebugPatrol } from '../devtools/map-types';
import type { PowerRoute } from './room19';

// ROOM 18 — the Relay Room. The wing's whole payload is one mechanical
// choice: a two-position power relay wired (per the scrawls) to feed either
// the ward's LIGHTS or its DOORS, never both. The choice is legible in
// advance — the nook's scrawls spell out what each throw buys before you
// touch anything — and it is physically irreversible the instant you throw
// it: the plate you didn't choose gets pulled off the wall. The consequence
// isn't visible until room19 ('the Undercroft'), which is built from
// buildRoom19(flags.get('room18.power')) — the first room in the game where
// an action's effect lands in a room you can't see yet, in a game that has
// never once let you go back and check. No keypad, no code, so no
// randomize-codes wiring — the relay is a switch, not a combination
// (settings.isRandomizeCodesEnabled is deliberately not consulted here).
//
// The levers are two interactables per throw, split by state group: a
// states:'lucid' lever (labeled, committable) and a states:'unmed' smear
// plate at the same mount (interacting just refuses — "the plate's a
// smear"). world.ts's state groups mean only one of the pair ever renders,
// and Interaction's state filter means only one is ever focusable, so the
// factory-stamped label is literally only legible lucid — the same
// convention as every keypad, expressed with zero new engine surface.
// Throwing one removes the other throw's pair permanently
// (removeInteractable — the swallowed-pill-cup precedent) and drops the
// chosen handle into its thrown pose. No confirm dialog: the throw is the
// confirm. A catch after the throw teleports to spawn with the flag still
// set and the handle still dropped (closures don't reset on a catch — same
// reason room7's doorUnlocked survives one); the room just looks like a
// room where you already decided.
//
// Zones, south to north:
//   Z1 entry hall   z[2.3,5]  — spawn, dispenser18 behind a stub wall
//   Z2 relay hall   z[-3,2.3] — one orderly, rectangular belt, low console
//   Z3 choice nook  z[-7,-3]  — the two throws, x[-2,2], occluder-protected
//   exit            x[-1,1] at z=-7, open doorway -> room19. No lock: the
//                   choice is the room's gate; a second lock here would be
//                   redundant friction. Walking out without throwing is
//                   possible and safe — room19 then builds its fail-safe
//                   default branch ('lights', the longer, safer route).
//
// SOFT-LOCK AUDIT: dispenser18 sits in Z1, reachable unmed from spawn
// without entering the belt (the stub wall is south-of-belt geometry, not a
// gate) — a 0-pill arrival holds 1 pill before the relay is even in view.
// The relay is the room's only lucid-gated action and nothing else costs a
// pill. No collider in this room is state-filtered, so a mid-room
// medication revert is an ordinary revert anywhere — no unmed-sealed
// pocket exists. Catch anywhere: forced lucid + teleport to spawn, pills
// kept; pre-throw that's a clean retry (flag unset, dispenser refillable),
// post-throw there's nothing left to re-litigate. Never a strand.
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
// always crosses the box — provably unseeable at both throws, regardless of
// distance or facing. The console is cover mid-crossing (occluder +
// collider, the island beat). Orderly is unmodified TUNING.orderly.

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

// The relay: one lucid lever + one unmed smear plate per throw, same mount
// (see header). Lucid labels name the wire; unmed labels don't.
const THROWN_Y = 1.17; // handle drops into its slot on commit (default mount y is 1.45)

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
    // nook, all NOOK-occluded:
    scrawl('it only moves once.\nthey made sure.', 'w', -2, -5),
    scrawl('power for the doors,\nor power for the lights.\nnever both. never again.', 'w', -2, -4, {
      size: 2.2,
    }),
    scrawl("doors: a straight line,\ndark as a mouth.\nlights: you'll see everything,\nthe long way round.", 'e', 2, -4.6, {
      size: 2.2,
    }),
  ],
  interactables: [
    dispenser({ id: 'dispenser18', side: 'w', wallAt: -6, along: 4, label: 'use the dispenser' }),
    // lucid pair — the legible plates
    keypad({ id: 'leverLights', side: 'n', wallAt: -7, along: -1.6, label: 'the lights throw', states: 'lucid' }),
    keypad({ id: 'leverDoors', side: 'n', wallAt: -7, along: 1.6, label: 'the doors throw', states: 'lucid' }),
    // unmed pair — the same switches, plates unreadable
    keypad({ id: 'plateLights', side: 'n', wallAt: -7, along: -1.6, label: 'a smeared plate', states: 'unmed' }),
    keypad({ id: 'plateDoors', side: 'n', wallAt: -7, along: 1.6, label: 'a smeared plate', states: 'unmed' }),
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

// Kit keypad() mount math for side 'n', wallAt -7: face z=-6.88, proud
// center z=-6.81 — reused for the thrown pose so the handle stays flush.
const LEVER_Z = -6.81;

export const room18Script = (() => {
  // Survives a catch on purpose (see header) — reset only on room entry.
  let thrown: PowerRoute | null = null;

  function commit(ctx: GameCtx, choice: PowerRoute): void {
    thrown = choice;
    ctx.flags.set('room18.power', choice);
    // The throw you didn't pick comes off the wall — both state groups.
    const loser = choice === 'lights' ? 'Doors' : 'Lights';
    ctx.removeInteractable(`lever${loser}`);
    ctx.removeInteractable(`plate${loser}`);
    // The chosen handle drops into its slot — both state groups again, so
    // the thrown pose reads the same whichever state you look at it in.
    const winner = choice === 'lights' ? 'Lights' : 'Doors';
    const along = choice === 'lights' ? -1.6 : 1.6;
    ctx.moveInteractable(`lever${winner}`, [along, THROWN_Y, LEVER_Z]);
    ctx.moveInteractable(`plate${winner}`, [along, THROWN_Y, LEVER_Z]);
    ctx.hud.toast(
      choice === 'doors'
        ? 'something clunks open, far off. the bulbs give up without a fight.'
        : 'the lights hum up the hall. the door stays exactly where it was.',
    );
    ctx.hud.setObjective('the door ahead. whatever that bought you.');
    ctx.telemetry.event('wing_power_set', { power: choice });
  }

  return makeOrderlyRoomScript({
    orderlies: [{ waypoints: WAYPOINTS, occluders: [STUB, CONSOLE, NOOK] }],
    colliders: rb.colliders,
    spawn: room18.spawn,
    onEnterObjective: 'the relay room. something in here only moves once.',
    catchToast: 'hands. a needle. "you don\'t get to pick twice," he says.',
    unmedToast: 'something paces the hall between you and the switches.',
    extraScript: {
      onEnter() {
        thrown = null;
      },
      isAvailable(id) {
        // The chosen lever stays on the wall but stops being a prompt; its
        // smear plate stays interactable for the post-throw line below.
        if (thrown && (id === 'leverLights' || id === 'leverDoors')) return false;
        return true;
      },
      onInteract(id, ctx) {
        if (id === 'plateLights' || id === 'plateDoors') {
          // unmed by construction (states:'unmed') — the refusal beat.
          ctx.hud.toast(
            thrown
              ? "it's already thrown. it doesn't move back."
              : "the plate's a smear. you can't tell which throw is which like this.",
          );
          return true;
        }
        if (id === 'leverLights' || id === 'leverDoors') {
          if (ctx.state.state === 'unmed' || thrown) return true; // unreachable belt-and-braces
          commit(ctx, id === 'leverLights' ? 'lights' : 'doors');
          return true;
        }
        return false;
      },
    },
  });
})();

export const debugPatrols: DebugPatrol[] = [{ waypoints: WAYPOINTS, label: 'A' }];
