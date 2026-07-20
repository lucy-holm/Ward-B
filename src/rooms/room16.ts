import {
  RoomBuilder,
  dispenser,
  scrawl,
  lightSwitch,
  patrol,
  makeOrderlyRoomScript,
  type ColliderDef,
  type OrderlyAABB,
  type RoomDef,
} from './kit';
import type { DebugPatrol } from '../devtools/map-types';

// ROOM 16 — "the Breaker Bay". Light becomes a second state axis, orthogonal
// to lucid/unmed: LightFilter ('lit'/'dark'), World.applyLight/isDark,
// GameCtx.isRoomDark/setRoomDark, Renderer.setDark (engine additions in
// rooms/types.ts, game/world.ts, game/interaction.ts, engine/renderer.ts,
// main.ts, devtools/map.ts — see docs/superpowers/specs/
// 2026-07-19-room16-light-axis-design.md for the full engine design). This
// room is the first to spend it.
//
// DESIGN OVERRIDE (Tom): the spec's exit was a 4-digit keypad assembled from
// two split scrawls. Tom is done with code locks — this room does NOT end
// on one. Replacement, preserving the spec's entire point (a genuine 2x2
// grid of {lit,dark}x{lucid,unmed}, all four cells load-bearing, nothing
// solvable from three of them):
//
//              LIT (default)                    DARK (after the switch)
//   UNMED   inkScrawl16, the ONLY place       phosphorScrawl16 (ink:phosphor),
//           you learn the breaker exists      the ONLY place you learn the
//           at all — ordinary red ink,        door's actual condition — was
//           read exactly like any other        physically there the whole
//           room's clue.                       time, invisible until dark.
//   LUCID   lightSwitch16 answers — the       exitdoor16 answers — the ONLY
//           ONLY state that can throw it       state it ever opens in. Every
//           (LIT->DARK, the pivotal move,      other combination gets a
//           reversible, see below).            refusal that's specific to
//                                              which half is wrong.
//
// No digits anywhere in this room. The door itself is the terminal
// interactable, gated by ctx.isRoomDark() + ctx.state.state directly in its
// own onInteract — "assemble a code" becomes "assemble a state," same
// construction-puzzle shape the spec asks for (build a specific combination
// of two independent switches), just without anything to type in.
//
// Player-experience beat (unchanged from spec): walk in lit+unmed and get an
// ordinary wall clue. Find a breaker that only lucid hands can throw. The
// moment you finally throw it, the room goes dark and STAYS dark — and the
// same wall you already read has more on it now, in paint that was never
// legible before. It was always there; you just couldn't see it. The door
// completes the idea from the other end: it only answers to hands that are
// steady AND eyes that are in the dark, a combination you have to notice you
// need, not stumble into.
//
// SWITCH IS BIDIRECTIONAL (spec's own soft-lock fix, kept): a player who
// reaches lightSwitch16 before ever reading inkScrawl16 (skips the lit-only
// cell) is not stuck — flip it back to LIT (another lucid trip), read what
// you missed, flip it dark again. Never a one-way trap.
//
// SOFT-LOCK AUDIT:
//  - dispenser16a sits in Z1, behind the room's only ungated doorway
//    (x[-1,1] at z=2), zero patrol reach, reachable from spawn in the first
//    few seconds regardless of light state or prior progress.
//  - dispenser16a's slot glow is the shared GLOW_SLOT_MAT (MeshLambertMaterial
//    emissive channel) — per the light-axis design doc's finding, emissive
//    output is independent of scene lighting, so it's exactly as visible
//    dark as lit; it is NOT lightState-gated (default 'both'), so darkening
//    the room cannot hide it. Same for the exit vestibule's glow marker at
//    (0,1.4,-15.9) — a 0-pill unmed player can always SEE the way out, even
//    though reaching it does nothing until the door itself is solved lucid.
//  - Zero unmed-sealed colliders anywhere in this room. Every "gate" here is
//    informational (you don't know the breaker exists / the door's
//    condition until you've read the right cell) or permission-based
//    (switch/door both require lucid) — never a wall that traps a raw
//    player. Every point in Z2 has a free, if long, unmed walk back through
//    the ungated doorway to dispenser16a, worst case ~19m from the exit
//    vestibule mouth.
//  - Per-light-state check: darkening the room does not remove or move any
//    collider, does not seal the ungated Z1/Z2 doorway, and does not gate
//    dispenser16a's existence (lightState is 'both' — undefined — on every
//    always-present fixture in this room; only the two nook scrawls, the
//    two glow lintels, and the phosphor floor path are lightState-gated).
//    A 0-pill unmed player dropped into this room in EITHER light state can
//    always find and reach dispenser16a.
//  - Timer expiry is safe everywhere: reverting lucid->unmed for free is
//    never blocked (no unmed-sealed geometry to revert into), and the two
//    inspection nooks are occluder-protected regardless of which light
//    state a revert happens to land in.
//  - Catch behavior resets the light state: onCaught force-lights the room
//    (ctx.setRoomDark(false)) in addition to the standard force-lucid +
//    teleport-to-spawn + pills-kept penalty, so a caught player never
//    resumes at spawn in a half-dark limbo — always a known, lit restart.
//
// REACTION-TIME AUDIT (patrol (5,0.5)-(5,-13)-(-5,-13)-(-5,0.5), inset 3m
// from the x=+-8 side walls): both inspection nooks sit only ~4.46m from
// their nearest patrol leg (west leg for NOOK_W, east leg for NOOK_E) —
// under the 8.2m floor by raw distance. The actual protection is the
// occluder trick (room10's NOOK_A/NOOK_B pattern): each nook's own AABB is
// passed to the orderly's occluders list, so any sightline from his patrol
// position (always |x|=5, outside both boxes) to a point inside either box
// necessarily crosses the box boundary — segmentHitsAABB reports occluded
// for anyone standing deep enough in a nook to read a scrawl or reach the
// switch, regardless of distance. This also covers the one place the spec
// flags explicitly: reverting to unmed to read phosphorScrawl16 must happen
// INSIDE NOOK_W (walk back lucid, revert once safely inside), not at the
// switch — though NOOK_E is occluder-protected too, so even an ill-advised
// revert there is safe, just not the intended solve. The exit door is
// operated lucid-only (chasing is impossible while lucid), so its distance
// from either nook is irrelevant to this audit.
//
// PILL ECONOMY (worst case: arrive with 0 pills, TUNING.pills.max=1):
//  1. dispenser16a, 0->1 (Z1, free, no orderly reach).
//  2. Shift lucid (1->0), cross to NOOK_E, flip lightSwitch16 LIT->DARK.
//  3. Still lucid, walk back to NOOK_W, revert to unmed (free) inside the
//     nook, read phosphorScrawl16.
//  4. Walk south to dispenser16a, 0->1.
//  5. Shift lucid (1->0), walk the hall to exitdoor16 (still dark — nobody
//     flipped it back), interact: lucid+dark -> door opens, exit.
// Two pill spends, two dispenser visits, same shape as the original spec
// (only the terminal fixture changed, not the economy).

const rb = new RoomBuilder();

// perimeter — floor x[-9.6,9.6] z[-16,6] (the extra +-1.6 on x accounts for
// the two nook protrusions, same convention room10 uses for its alcoves)
rb.wallX(-8, 8, 6); // south cap, behind spawn

// Z1 — vestibule, z[2,6]: safe, no patrol reach.
rb.wallZ(2, 6, -8);
rb.wallZ(2, 6, 8);

// Z1/Z2 boundary, z=2 — an open 2m doorway, no gate. The player's first
// crossing here is unmed; gating it would only add a pointless pill sink
// before the room has taught anything (same reasoning as room10's Z1/Z2).
rb.wallX(-8, -1, 2);
rb.wallX(1, 8, 2);

// Z2 — the bay, z[-14,2]. West/east walls broken at the two nook mouths.
rb.wallZ(-6.9, 2, -8); // west, south of the read nook's mouth
rb.wallZ(-14, -8.5, -8); // west, north of the read nook's mouth
rb.wallZ(-3.2, 2, 8); // east, south of the switch nook's mouth
rb.wallZ(-14, -4.8, 8); // east, north of the switch nook's mouth

// NOOK_W — the read nook: inkScrawl16 (lit) + phosphorScrawl16 (dark) both
// mount on its end cap.
rb.wallX(-9.6, -8, -8.5); // south bracket
rb.wallX(-9.6, -8, -6.9); // north bracket
rb.wallZ(-8.5, -6.9, -9.6); // end cap
const NOOK_W: OrderlyAABB = { minX: -9.6, maxX: -8, minZ: -8.5, maxZ: -6.9 };

// NOOK_E — the switch nook: lightSwitch16 mounts on its end cap.
rb.wallX(8, 9.6, -4.8); // south bracket
rb.wallX(8, 9.6, -3.2); // north bracket
rb.wallZ(-4.8, -3.2, 9.6); // end cap
const NOOK_E: OrderlyAABB = { minX: 8, maxX: 9.6, minZ: -4.8, maxZ: -3.2 };

// Glow lintels over both nook mouths — ordinary house lighting (playtest 6's
// lesson, room10: a lit threshold marks "there is a space here" from across
// the bay). lightState:'lit' deliberately, unlike the dispenser/exit glow
// above — these are part of the room's own lights and go dark with the rest
// of it, which is the point: after the switch is thrown, only the phosphor
// path (below) marks the way back to NOOK_W.
rb.blocks.push({ size: [0.12, 0.14, 1.6], pos: [-8, 2.7, -7.7], mat: 'glow', lightState: 'lit' });
rb.blocks.push({ size: [0.12, 0.14, 1.6], pos: [8, 2.7, -4.0], mat: 'glow', lightState: 'lit' });

// Phosphor floor path — visible only once the room is dark, marking the
// route from the Z1/Z2 doorway back to NOOK_W (exactly when it's needed:
// the ordinary glow lintel above just went out with the rest of the bay).
rb.blocks.push({ size: [0.4, 0.04, 0.4], pos: [-2, 0.02, 0], mat: 'phosphor', lightState: 'dark' });
rb.blocks.push({ size: [0.4, 0.04, 0.4], pos: [-5, 0.02, -3], mat: 'phosphor', lightState: 'dark' });
rb.blocks.push({ size: [0.4, 0.04, 0.4], pos: [-7, 0.02, -6.5], mat: 'phosphor', lightState: 'dark' });

// North wall (gate to Z3), z=-14, 2m doorway gap x[-1,1] — no lock on the
// wall itself; exitdoor16 sits directly in the gap (see below).
rb.wallX(-8, -1, -14);
rb.wallX(1, 8, -14);
const exitCollider: ColliderDef = { minX: -1, maxX: 1, minZ: -14.1, maxZ: -13.9 };
rb.colliders.push(exitCollider);

// Z3 — exit vestibule, z[-16,-14]: safe, no patrol reach, no lock beyond
// the door itself.
rb.wallZ(-16, -14, -1);
rb.wallZ(-16, -14, 1);
rb.wallX(-1, 1, -16);
// Exit glow — NOT lightState-gated (default 'both'): per the soft-lock
// audit, the way out stays locatable in the dark same as every dispenser.
rb.block([1.8, 2.6, 0.06], [0, 1.4, -15.9], 'glow');

const WAYPOINTS = patrol(
  [
    { x: 5, z: 0.5 },
    { x: 5, z: -13 },
    { x: -5, z: -13 },
    { x: -5, z: 0.5 },
  ],
  rb.colliders,
);

export const room16: RoomDef = {
  id: 'room16',
  name: 'the Breaker Bay',
  floor: { minX: -9.6, maxX: 9.6, minZ: -16, maxZ: 6 },
  spawn: { x: 0, z: 5, yaw: 0 },
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    scrawl(
      'they never turn the lights off.\nsomeone must be afraid of the dark too.',
      'e',
      8,
      0,
      { size: 2.8 },
    ),
    // LIT + UNMED — the only cell this exists in. Ordinary red ink, read
    // exactly like any other room's clue: the switch is real, and it isn't
    // for raw hands.
    scrawl("the breaker's in the east nook.\nit takes steady, medicated hands.", 'w', -9.6, -8.2, {
      size: 2.4,
      id: 'inkScrawl16',
    }),
    // DARK + UNMED — was physically here the whole time; lightState:'dark'
    // just kept it invisible until now. The retroactive beat: it was always
    // there, you just couldn't see it.
    {
      ...scrawl('the door only opens\nfor calm eyes in the dark.', 'w', -9.6, -7.2, {
        size: 2.4,
        id: 'phosphorScrawl16',
      }),
      lightState: 'dark',
      ink: 'phosphor',
    },
  ],
  interactables: [
    dispenser({ id: 'dispenser16a', side: 'w', wallAt: -8, along: 4, label: 'use the dispenser' }),
    // LUCID + LIT — the only state that can throw this. side:'e' (a wallZ
    // wall, facing -x into the nook's mouth) is exactly what an alcove end
    // cap at the room's high-x edge needs — same wall-face math dispenser/
    // keypad use, just via kit's lightSwitch() wrapper.
    lightSwitch({ id: 'lightSwitch16', side: 'e', wallAt: 9.6, along: -4.0, label: 'the breaker switch' }),
    {
      id: 'exitdoor16',
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
    { pos: [0, 4] },
    { pos: [0, 0] },
    { pos: [-3, -4] },
    { pos: [3, -8] },
    { pos: [-3, -11] },
    { pos: [0, -15] },
  ],
  exits: [{ to: 'room17', minX: -1, maxX: 1, minZ: -15.9, maxZ: -14.9 }],
};

const DOOR_CLOSED_POS: [number, number, number] = [0, 1.5, -14];
const DOOR_OPEN_POS: [number, number, number] = [-1, 1.5, -14.85];

export type Room16Script = ReturnType<typeof makeOrderlyRoomScript>;

export const room16Script: Room16Script = (() => {
  let dark = false;
  let doorOpen = false;

  const script = makeOrderlyRoomScript({
    orderlies: [{ waypoints: WAYPOINTS, occluders: [NOOK_W, NOOK_E] }],
    colliders: rb.colliders,
    spawn: room16.spawn,
    onEnterObjective: "the wing keeps its lights on for a reason. find out what it's hiding it from.",
    catchToast: 'hands. a needle. "lights out," he says.',
    unmedToast: 'something throws a shadow that keeps his shape, even with the lights out.',
    extraScript: {
      onEnter(ctx) {
        dark = false;
        doorOpen = false;
        exitCollider.minX = -1;
        exitCollider.maxX = 1;
        ctx.moveInteractable('exitdoor16', DOOR_CLOSED_POS, 0);
      },

      onInteract(id, ctx) {
        if (id === 'lightSwitch16') {
          if (ctx.state.state === 'unmed') {
            ctx.hud.toast("cold iron. it won't answer to raw hands.");
            return true;
          }
          dark = !dark;
          ctx.setRoomDark(dark);
          ctx.telemetry.event('light_switch', { dark });
          ctx.hud.toast(
            dark
              ? 'the hum dies. the dark comes back like it never left.'
              : "fluorescents stutter, then hold. it's too bright in here now.",
          );
          return true;
        }

        if (id === 'exitdoor16') {
          if (doorOpen) return true; // already open — walking into the exit AABB does the rest
          if (ctx.state.state === 'unmed') {
            ctx.hud.toast("you press against it. nothing. it isn't yours to open like this.");
            return true;
          }
          if (!ctx.isRoomDark()) {
            ctx.hud.toast('a flare of white. your hand finds nothing to hold onto.');
            return true;
          }
          // lucid + dark — the only cell this ever answers to.
          doorOpen = true;
          exitCollider.minX = 999;
          exitCollider.maxX = 999.2;
          ctx.moveInteractable('exitdoor16', DOOR_OPEN_POS, Math.PI / 2);
          ctx.telemetry.event('door_opened');
          ctx.hud.toast('cold steel gives way in the dark. calm hands, calm eyes.');
          ctx.hud.setObjective("the dark kept its half of the bargain. so did you.");
          return true;
        }

        return false;
      },

      onCaught(ctx) {
        // Never resume at spawn in a half-dark limbo — force a known, lit
        // restart in addition to the standard catch penalty.
        dark = false;
        ctx.setRoomDark(false);
      },
    },
  });

  return script;
})();

export const debugPatrols: DebugPatrol[] = [{ waypoints: WAYPOINTS, label: 'A' }];
