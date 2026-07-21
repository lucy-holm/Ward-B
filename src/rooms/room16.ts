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
// DESIGN OVERRIDE #1 (Tom): the spec's exit was a 4-digit keypad assembled
// from two split scrawls. Tom is done with code locks — this room does NOT
// end on one. Replacement, preserving the spec's entire point (a genuine
// 2x2 grid of {lit,dark}x{lucid,unmed}, all four cells load-bearing,
// nothing solvable from three of them):
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
// construction-puzzle shape the spec asks for, just without anything to
// type in.
//
// DESIGN OVERRIDE #2 (Tom, playtest, this pass): "the challenge seems
// minimal — all you have to do is go to the switch and turn it on... it
// should be more creative than that." He walked in, hit the switch, walked
// out — the 2x2 grid above is still structurally sound (every cell is still
// load-bearing) but NOTHING stood between "know the switch exists" and
// "throw it." The switch cost a pill and a walk; it never cost anything
// harder to buy. Fix, using the coordinator's seed idea (kept, not
// replaced — it was the right shape): PHOSPHOR THAT CHARGES AND FADES.
//
//   1. CHARGE (lit, ambient, evasion-gated) — the phosphor path/ink is
//      paint, not magic: it only holds a useful glow once the room has fed
//      it light for a while. "Fed it light" = the player has spent
//      CHARGE_FULL_SEC of cumulative time standing in the open Z2 bay
//      (outside both occluder nooks — Z1/Z3 don't count, see
//      inChargeZone) while the room is lit. That's the same ground the
//      patrol actually walks, so charging isn't a free wait — it's the
//      room14-style "gameplay is evasion, not an inspection point" beat:
//      the orderly is fully VISIBLE the whole time (unmed, no shift
//      needed), so the tension is timing your exposure against a real,
//      telegraphed threat, not reading a clue under fire. Standing still
//      in one exposed spot for the full 18s is a bad plan; ducking back to
//      a nook or into Z1 whenever he's close and re-emerging when he isn't
//      is the intended play, same skill room14 already teaches.
//   2. THROW + FADE (dark, timed, real distance) — flipping the breaker
//      (still lucid-only, still bidirectional, still costs a pill exactly
//      like before) starts a fade clock: the phosphor path and
//      phosphorScrawl16's ink both start at full brightness and linearly
//      dim to nothing over a window whose LENGTH is set by how charged the
//      paint was at the moment of the throw (chargeAtThrow * FADE_MAX_SEC,
//      up to 26s at full charge). Under-charge it and you get a shorter,
//      dimmer-feeling window (the game's own read on "you rushed it");
//      over-charge and 26s is generous room to actually solve the room.
//      The glow only ever guides the one stretch nothing else lights: from
//      NOOK_E (the switch) back to NOOK_W (the dark clue) — dispenser16a's
//      slot glow and the exit vestibule's glow are BOTH already
//      lightState:'both' (see the original soft-lock audit, unchanged
//      below), so the two safe legs of the loop were never dark to begin
//      with. Fade only ever threatens your sense of direction across the
//      one leg that has nothing else marking it — never your body, never
//      access to a dispenser or the exit.
//
// Two interlocking beats, not three: earn the light, then beat the clock
// reading it. A SECOND mini-switch (the seed idea's other optional layer)
// was considered and dropped — the charge/fade loop above already turns
// "walk to the switch, throw it" into a full earn-then-execute arc on its
// own, and stacking a second hidden fixture on top of an already-timed dark
// traversal reads as padding, not challenge, exactly what Tom is pushing
// back on. Relocating the breaker further from the exit (the seed idea's
// third optional layer) was also dropped: the worst-case loop the fade
// window is tuned against — NOOK_E -> NOOK_W -> dispenser16a -> exitdoor16
// — is already ~48m (see CHARGE/FADE TUNING below), a real commitment
// without moving a single wall.
//
// SWITCH IS BIDIRECTIONAL (spec's own soft-lock fix, kept): a player who
// reaches lightSwitch16 before ever reading inkScrawl16 (skips the lit-only
// cell), or who threw it under-charged and watched the glow die before
// reaching NOOK_W, is not stuck — flip it back to LIT (another lucid trip,
// though a free one if the 45s meter hasn't lapsed), keep charging or go
// read what you missed, flip it dark again with a fresh, longer window
// (charge never decreases while lit or dark — only the visible glow does).
// Never a one-way trap, and never a punishment beyond time.
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
//    Neither depends in any way on the charge/fade dial (setGlowFade only
//    ever touches mat:'phosphor'/ink:'phosphor' opacity) — a fully-faded
//    room leaves both exactly as visible as a freshly-charged one.
//  - Zero unmed-sealed colliders anywhere in this room. Every "gate" here is
//    informational (you don't know the breaker exists / the door's
//    condition until you've read the right cell) or permission-based
//    (switch/door both require lucid) — never a wall that traps a raw
//    player. Every point in Z2 has a free, if long, unmed walk back through
//    the ungated doorway to dispenser16a, worst case ~19m from the exit
//    vestibule mouth. The charge zone (inChargeZone) is a pure position
//    read, never a collider or a gate — standing in it, leaving it, or
//    never entering it at all has zero effect on where the player can walk.
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
//  - Catch behavior resets the light state AND the charge/fade state:
//    onCaught force-lights the room (ctx.setRoomDark(false)) and zeroes
//    charge/chargeAtThrow/fadeElapsed/the one-time toast flags, in addition
//    to the standard force-lucid + teleport-to-spawn + pills-kept penalty —
//    a caught player never resumes at spawn half-dark, half-charged, or
//    mid-fade; always a known, lit, unpainted restart.
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
//   The new charge zone (open Z2, outside both nook AABBs) is deliberately
// NOT given the same protection — that's the entire point, per room14's
// precedent ("the room's gameplay (evasion), not an inspection point").
// Nothing forces the player to stand still to accumulate charge; the
// nearest bail-out (either nook, or back through the ungated Z1/Z2
// doorway) is never more than a few meters from any point in the bay, so a
// spotted player always has an immediate, unconditional retreat — the
// standard "he is looking at you" -> duck-and-wait loop every orderly room
// in the wing already teaches, not a new kind of risk.
//
// CHARGE/FADE TUNING (see extraScript.update below for the implementation):
//  - CHARGE_FULL_SEC = 18s of cumulative time in the open bay while lit.
//    Chosen so a single confident sprint across the bay (~16m at player
//    speed 3.4 => ~4.7s) cannot accidentally max it out — full charge
//    needs genuine dwelling/looping, not one lucky crossing. Roughly half
//    the orderly's own lap time (perimeter ~47m / speed 1.5 + 4*0.8s pause
//    ~= 34.5s per lap, so 18s ~= half a lap) — an in-fiction-legible
//    interval: "about as long as watching him cross the bay and start
//    back."
//  - FADE_MAX_SEC = 26s at full charge. The window's job is to cover the
//    one leg nothing else lights: NOOK_E's mouth to NOOK_W, roughly 16.5m
//    (sqrt(16^2+4^2)) at 3.4 m/s => ~4.9s of walking, plus read time for
//    phosphorScrawl16. 26s leaves >5x that margin — deliberately generous
//    per spec (matches the same "give it real room" instinct behind
//    TUNING.medication.durationSec=45s for a single lucid errand). A
//    partial charge scales the window linearly (chargeAtThrow *
//    FADE_MAX_SEC), so rushing the switch at say 30% charge buys ~7.8s —
//    survivable for a player who already knows the room, punishing for one
//    who doesn't, never fatal (the switch is bidirectional; go relight,
//    charge more, retry).
//  - The full worst-case loop this is tuned against — NOOK_E -> NOOK_W ->
//    dispenser16a -> exitdoor16 — is ~16.5+12+19.7 = 48.2m (~14.2s of
//    walking alone). The fade window only needs to cover the first leg
//    (see above); the other two legs are self-lit regardless of charge
//    (dispenser/exit glow, both lightState:'both').
//
// PILL ECONOMY (worst case: arrive with 0 pills, TUNING.pills.max=1):
//  1. dispenser16a, 0->1 (Z1, free, no orderly reach).
//  2. Cross into Z2 unmed, read inkScrawl16 (teaches the breaker AND that
//     it wants the room "held the light a while" first). Spend some of
//     that same crossing — or loop back and forth a few times — accruing
//     charge; the room doesn't force a specific ritual, just cumulative
//     time in the open bay while lit (see CHARGE/FADE TUNING).
//  3. Shift lucid (1->0), cross to NOOK_E, flip lightSwitch16 LIT->DARK.
//     The toast at this moment reflects however much charge you actually
//     banked — a full read is optional, not required to proceed.
//  4. Still lucid, walk back to NOOK_W under the fading glow, revert to
//     unmed (free) inside the nook, read phosphorScrawl16.
//  5. Walk south to dispenser16a (self-lit regardless of fade), 0->1.
//  6. Shift lucid (1->0), walk the hall to exitdoor16 (self-lit regardless
//     of fade; still dark — nobody flipped it back), interact: lucid+dark
//     -> door opens, exit.
// Two pill spends, two dispenser visits — identical shape to the original
// spec and to this room's first cut; the charge/fade loop adds a real
// beat to EARN step 3, it doesn't add a third pill. The exit step itself
// (step 6) still costs exactly one forced spend, same as before.

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

// Phosphor floor path — visible only once the room is dark, opacity driven
// by the room's charge/fade dial (ctx.setGlowFade, see extraScript.update).
// Marks the ONE stretch nothing else lights: NOOK_E's mouth all the way
// back to NOOK_W. Deliberately does NOT extend south toward dispenser16a
// or north toward exitdoor16 — both of those already have their own
// lightState:'both' glow markers (see the soft-lock audit above), so
// painting a redundant trail there would just dilute what fading is
// supposed to threaten: your sense of direction across the one leg with no
// other light, not the whole room.
rb.blocks.push({ size: [0.4, 0.04, 0.4], pos: [7, 0.02, -4], mat: 'phosphor', lightState: 'dark' });
rb.blocks.push({ size: [0.4, 0.04, 0.4], pos: [3, 0.02, -2], mat: 'phosphor', lightState: 'dark' });
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
    // exactly like any other room's clue: the switch is real, it isn't for
    // raw hands, and it isn't for an unfed room either — the third line is
    // this pass's addition, the room's only explicit teach of the
    // charge/fade mechanic (everything else about it is toasts, see
    // extraScript.update).
    scrawl(
      "the breaker's in the east nook.\nit takes steady, medicated hands —\nand a room that's held the light a while.",
      'w',
      -9.6,
      -8.2,
      { size: 2.4, id: 'inkScrawl16' },
    ),
    // DARK + UNMED — was physically here the whole time; lightState:'dark'
    // just kept it invisible until now. The retroactive beat: it was always
    // there, you just couldn't see it. Ink fades with the rest of the room's
    // phosphor (World's ink:'phosphor' shimmer * the charge/fade dial).
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

// See "CHARGE/FADE TUNING" in the header for the math behind both constants.
const CHARGE_FULL_SEC = 18;
const FADE_MAX_SEC = 26;
// Z2 bounds for the charge zone — Z1 (z>=CHARGE_ZONE_Z_MAX) and Z3
// (z<=CHARGE_ZONE_Z_MIN) are both structurally patrol-free (see the
// soft-lock audit), so they're excluded on purpose: charging only counts
// on ground the orderly actually walks.
const CHARGE_ZONE_Z_MAX = 2;
const CHARGE_ZONE_Z_MIN = -14;
// Below this, the throw-time toast already told the player the paint's
// basically unfed — the per-frame fade warn/gone toasts would just repeat
// that a beat later, so they're skipped for a near-zero charge.
const FADE_TOAST_MIN_CHARGE = 0.15;

function inNook(x: number, z: number, nook: OrderlyAABB): boolean {
  return x >= nook.minX && x <= nook.maxX && z >= nook.minZ && z <= nook.maxZ;
}

// True while (x,z) is on ground the room's charge mechanic counts — the
// open Z2 bay, outside both occluder nooks. See the header's CHARGE/FADE
// TUNING and REACTION-TIME AUDIT sections for why this footprint (not "the
// whole room while lit") is the one that creates real tension.
function inChargeZone(x: number, z: number): boolean {
  if (z >= CHARGE_ZONE_Z_MAX || z <= CHARGE_ZONE_Z_MIN) return false;
  if (inNook(x, z, NOOK_W)) return false;
  if (inNook(x, z, NOOK_E)) return false;
  return true;
}

export type Room16Script = ReturnType<typeof makeOrderlyRoomScript>;

export const room16Script: Room16Script = (() => {
  let dark = false;
  let doorOpen = false;

  // Charge/fade state — see the header's CHARGE/FADE TUNING section.
  let charge = 0; // 0..1, monotonic while lit; never decreases from fading
  let chargeAtThrow = 0; // charge snapshot at the moment dark last became true
  let fadeElapsed = 0; // seconds since the current dark phase began
  let sawChargeStartToast = false;
  let sawFullChargeToast = false;
  let sawFadeWarnToast = false;
  let sawFadeGoneToast = false;

  function resetChargeFade(ctx: { setGlowFade(level: number): void }): void {
    charge = 0;
    chargeAtThrow = 0;
    fadeElapsed = 0;
    sawChargeStartToast = false;
    sawFullChargeToast = false;
    sawFadeWarnToast = false;
    sawFadeGoneToast = false;
    ctx.setGlowFade(1);
  }

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
        resetChargeFade(ctx);
      },

      update(dt, _t, ctx) {
        if (!dark) {
          const p = ctx.playerPos();
          if (charge < 1 && inChargeZone(p.x, p.z)) {
            if (charge === 0 && !sawChargeStartToast) {
              sawChargeStartToast = true;
              ctx.hud.toast('the room feeds the paint. give it time.');
            }
            charge = Math.min(1, charge + dt / CHARGE_FULL_SEC);
            if (charge >= 1 && !sawFullChargeToast) {
              sawFullChargeToast = true;
              ctx.hud.toast("the floor's drunk all the light it can hold.");
            }
          }
          return;
        }

        // Dark: run the fade clock and drive the visual dial. The window's
        // length was fixed the instant the switch was thrown (chargeAtThrow)
        // — charging further while still dark does nothing until the next
        // throw snapshots a fresh (possibly higher) value.
        fadeElapsed += dt;
        const window = Math.max(0.001, chargeAtThrow * FADE_MAX_SEC);
        const level = Math.max(0, 1 - fadeElapsed / window);
        ctx.setGlowFade(level);

        if (chargeAtThrow < FADE_TOAST_MIN_CHARGE) return; // throw-time toast already said enough
        if (level <= 0.3 && !sawFadeWarnToast) {
          sawFadeWarnToast = true;
          ctx.hud.toast('the paint drinks the light. it forgets fast.');
        }
        if (level <= 0 && !sawFadeGoneToast) {
          sawFadeGoneToast = true;
          ctx.hud.toast('the dark just took the last of it back.');
        }
      },

      onInteract(id, ctx) {
        if (id === 'lightSwitch16') {
          if (ctx.state.state === 'unmed') {
            ctx.hud.toast("cold iron. it won't answer to raw hands.");
            return true;
          }
          dark = !dark;
          ctx.setRoomDark(dark);
          ctx.telemetry.event('light_switch', { dark, charge });
          if (dark) {
            chargeAtThrow = charge;
            fadeElapsed = 0;
            sawFadeWarnToast = false;
            sawFadeGoneToast = false;
            ctx.setGlowFade(1);
            ctx.hud.toast(
              chargeAtThrow >= 0.8
                ? 'the hum dies. the paint answers back, fat and green.'
                : chargeAtThrow >= 0.35
                  ? "the hum dies. the paint's thin — it won't hold long."
                  : "the hum dies. the paint barely stirs. it won't hold this dark at all.",
            );
          } else {
            ctx.hud.toast("fluorescents stutter, then hold. it's too bright in here now.");
          }
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
          // lucid + dark — the only cell this ever answers to. The fade
          // dial has zero say here: the door doesn't care how much of the
          // paint is left, only whether the room is dark.
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
        // Never resume at spawn in a half-dark, half-charged limbo — force
        // a known, lit, unpainted restart in addition to the standard catch
        // penalty.
        dark = false;
        ctx.setRoomDark(false);
        resetChargeFade(ctx);
      },
    },
  });

  return script;
})();

export const debugPatrols: DebugPatrol[] = [{ waypoints: WAYPOINTS, label: 'A' }];
