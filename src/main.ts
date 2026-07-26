import './style.css';
import * as THREE from 'three';
import { Renderer } from './engine/renderer';
import { Input } from './engine/input';
import { AudioEngine } from './engine/audio';
import { circleHitsSolidUnmed } from './engine/collision';
import { StateSystem } from './game/state';
import { FlagStore, type Flags } from './game/flags';
import { TUNING } from './tuning';
import { Player } from './game/player';
import { World, resolveLevel } from './game/world';
import { Interaction } from './game/interaction';
import { Telemetry, type TelemetryEventName } from './game/telemetry';
import { isRandomizeCodesEnabled, setRandomizeCodes } from './game/settings';
import { Hud } from './ui/hud';
import type { GameCtx } from './game/context';
import type { RoomDef, RoomScript } from './rooms/types';
import { inTrigger } from './rooms/kit';
import { room1, room1Script } from './rooms/room1';
import { room2, room2Script } from './rooms/room2';
import { room3, room3Script } from './rooms/room3';
import { room4, room4Script } from './rooms/room4';
import { room5, room5Script } from './rooms/room5';
import { room6, room6Script } from './rooms/room6';
import { room7, room7Script } from './rooms/room7';
import { room8, room8Script } from './rooms/room8';
import { room9, room9Script } from './rooms/room9';
import { room10, room10Script } from './rooms/room10';
import { room11, room11Script } from './rooms/room11';
import { room12, room12Script } from './rooms/room12';
import { room13, room13Script } from './rooms/room13';
import { room14, room14Script } from './rooms/room14';
import { room15, room15Script } from './rooms/room15';
import { room16, room16Script } from './rooms/room16';
import { room17, room17Script } from './rooms/room17';
import { room18, room18Script } from './rooms/room18';
import { buildRoom19, room19Script, type PowerRoute } from './rooms/room19';
import { room20, room20Script } from './rooms/room20';

// RoomScript is frozen (rooms/types.ts). room4/room5 own an NPC with
// scene-level resources that need an explicit teardown hook the base
// RoomScript doesn't have, so they export locally-extended types; this is
// the only place that needs to know about it.
type AnyRoomScript = RoomScript & { onLeave?(ctx: GameCtx): void };

// A registry entry is either a static RoomDef (every room shipped before
// flags existed — zero migration) or a build(flags) factory for rooms whose
// geometry depends on a cross-room flag (game/flags.ts) that doesn't have a
// value until runtime — a static `export const roomN: RoomDef` is baked at
// module import, before any flag is ever set. The factory runs exactly once
// per entry, inside loadRoom; everything downstream (`current.def.exits`,
// checkExits, world.loadRoom) still always holds a concrete, resolved
// RoomDef. Because rooms are one-way, "read the flag at build time" and
// "read the flag once, ever, per playthrough" are the same statement.
type RoomEntry =
  | { def: RoomDef; script: AnyRoomScript }
  | { build: (flags: Flags) => RoomDef; script: AnyRoomScript };

const rooms: Record<string, RoomEntry> = {
  room1: { def: room1, script: room1Script },
  room2: { def: room2, script: room2Script },
  room3: { def: room3, script: room3Script },
  room4: { def: room4, script: room4Script },
  room5: { def: room5, script: room5Script },
  room6: { def: room6, script: room6Script },
  room7: { def: room7, script: room7Script },
  room8: { def: room8, script: room8Script },
  room9: { def: room9, script: room9Script },
  room10: { def: room10, script: room10Script },
  room11: { def: room11, script: room11Script },
  room12: { def: room12, script: room12Script },
  room13: { def: room13, script: room13Script },
  room14: { def: room14, script: room14Script },
  room15: { def: room15, script: room15Script },
  room16: { def: room16, script: room16Script },
  room17: { def: room17, script: room17Script },
  room18: { def: room18, script: room18Script },
  // room19's geometry depends on room18's power lever (game/flags.ts) — a
  // build(flags) factory, not a static def, resolved once at loadRoom. The
  // flag is unset if the player jumped straight here (?room=room19), so the
  // factory's own 'lights' default (the fail-safe branch) covers that.
  room19: { build: (flags) => buildRoom19(flags.get<PowerRoute>('room18.power') ?? 'lights'), script: room19Script },
  room20: { def: room20, script: room20Script },
};

// Dev/playtest room-jump: ?room=<id> boots straight into that room instead
// of replaying the whole game from room1. Read once at boot — only the
// initial load target changes; unknown/missing values silently fall back
// to room1. Never gated to import.meta.env.DEV: Tom playtests on the built
// tailnet/Pages builds, not just `npm run dev`.
const requestedRoomId = new URLSearchParams(location.search).get('room');
const startRoomId = requestedRoomId && rooms[requestedRoomId] ? requestedRoomId : 'room1';

const container = document.getElementById('game')!;
const hud = new Hud();
const renderer = new Renderer(container);
const input = new Input(container);
const audio = new AudioEngine();
const state = new StateSystem();
// Cross-room flag store — same lifetime as StateSystem: constructed once per
// page load, mutated for the playthrough, discarded on reload (endOfBuild's
// READMIT is a location.reload(), which is the only full reset this game
// has; an orderly catch never touches it). Never persisted to localStorage.
const flagStore = new FlagStore();
const world = new World(renderer.scene);
const player = new Player();
const interaction = new Interaction(world);

if (startRoomId !== 'room1') {
  // Skipping room1 means the player never took the tutorial's cup pill,
  // which is what normally sets canShift (see room1.ts onInteract 'cup').
  // Without this, a jumped-to room would be unplayable for anything that
  // needs shifting. A full pill (the max) makes any room's economy playable
  // from a fresh jump.
  state.canShift = true;
  state.refill();
}

// Resolve a registry entry to its concrete def (running the factory against
// the live flag store for build entries) + script. Hoisted above `current`'s
// initializer. A jump into a factory room (e.g. ?room=room19) resolves it
// against whatever the flag store holds at boot — its default, since no
// upstream room ran to set the flag.
function resolveEntry(entry: RoomEntry): { def: RoomDef; script: AnyRoomScript } {
  return { def: 'def' in entry ? entry.def : entry.build(flagStore), script: entry.script };
}

let current = resolveEntry(rooms[startRoomId]);
let started = false;
let ended = false;
let roomEnteredAt = 0;

// Trigger volumes: ids of RoomDef.triggers regions the player is currently
// inside (state filter honored). Diffed each frame to fire the room
// script's onTriggerEnter/onTriggerExit. Cleared on room load WITHOUT
// firing exits — the old room's script is already torn down.
let activeTriggers = new Set<string>();

const telemetry = new Telemetry(
  () => ({
    room: current.def.id,
    x: player.x,
    z: player.z,
    yaw: player.yaw,
    level: player.level,
    pills: state.pills,
    state: state.state,
    medication: state.medication,
  }),
  // debug: true whenever the player arrived via the ?room= dev jump
  // (main.ts's startRoomId resolution above), which also grants a free
  // pill + shift ability (see the startRoomId !== 'room1' block below) —
  // a session that starts mid-game with unearned resources is never
  // representative of a real playthrough. Tagging it here means every
  // metric downstream can filter Tom's own playtests out at the source
  // instead of every consumer having to know about the dev jump.
  { debug: requestedRoomId !== null },
);

// Session/room telemetry rollups (F2 game_complete, F12 room_complete).
// orderly_caught and keypad_denied are emitted by room scripts through
// ctx.telemetry, which main.ts doesn't otherwise observe. Rather than
// widening GameCtx (owned by another agent this session) or reaching into
// every room script to report back, ctx gets a thin Proxy over the real
// Telemetry instance (see ctxTelemetry below): its event() bumps the
// relevant counters, then forwards to the real instance unchanged. Events
// main.ts emits directly (shift, room_enter, ...) bump counters inline at
// the call site instead, since they already know which counter applies.
const sessionCounters = { catches: 0, shifts: 0, pillsUsed: 0 };
// Reset per room in loadRoom(). keypadFails/distance have no session-level
// equivalent requested by the spec, so they only live here.
let roomCounters = { catches: 0, shifts: 0, pillsUsed: 0, keypadFails: 0, distance: 0 };
// Last-seen player (x,z), used to accumulate roomCounters.distance frame by
// frame. Reset to the spawn point in loadRoom, and resynced by
// teleportPlayer (ctx, below) so a scripted teleport (e.g. the catch
// penalty) is never miscounted as the player walking that distance.
let lastPlayerX = player.x;
let lastPlayerZ = player.z;
// Wall-clock time of the room's current visit, diffed against
// telemetry.activeMs to get idle-corrected active_s for room_complete.
let roomActiveMsAtEnter = 0;

const ctxTelemetry: Telemetry = new Proxy(telemetry, {
  get(target, prop, _receiver) {
    if (prop === 'event') {
      return (name: TelemetryEventName, data?: Record<string, unknown>) => {
        if (name === 'orderly_caught') {
          sessionCounters.catches++;
          roomCounters.catches++;
        } else if (name === 'keypad_denied') {
          roomCounters.keypadFails++;
        }
        target.event(name, data);
      };
    }
    // Force the receiver to `target` (not this Proxy) so any accessor
    // relying on the real instance's internal state — e.g. the activeMs
    // getter — runs correctly rather than throwing or reading garbage.
    const value = Reflect.get(target, prop, target);
    return typeof value === 'function' ? value.bind(target) : value;
  },
}) as Telemetry;

function updatePills(): void {
  hud.setPills(state.pills, state.maxPills, state.canShift);
}

function shiftFx(): void {
  hud.shiftPulse();
  renderer.fovKick();
  audio.shiftStinger();
}

// Medication meter presentation state — mirrors the "track previous state,
// only act on a threshold crossing" convention used elsewhere in the HUD/
// audio layers. Reset whenever a fresh lucid stretch begins (state.onChange).
let medicationWarned = false; // one-time "it's wearing thin." toast, per stretch
let medicationTrapped = false; // true while empty but geometry is holding the revert off
// Wall-clock start of the current lucid stretch (state.onChange, below) —
// read by the medication_expired handler to report how long the player
// actually got to spend lucid before it wore off (F8/F14).
let lucidEnteredAt = 0;

function updateMedication(dt: number): void {
  if (state.state !== 'lucid') {
    hud.setMedication(0, false, false);
    audio.setMedicationWarning(false);
    medicationTrapped = false;
    return;
  }

  state.tickMedication(dt);
  const warnFrac = TUNING.medication.warnSec / TUNING.medication.durationSec;
  const warning = state.medication <= warnFrac;

  if (warning && !medicationWarned) {
    medicationWarned = true;
    hud.toast("it's wearing thin.");
  }

  hud.setMedication(state.medication, true, warning);
  audio.setMedicationWarning(warning);

  if (state.medication <= 0) {
    const trapped = circleHitsSolidUnmed(player.x, player.z, TUNING.player.radius, world.colliders, player.level);
    if (!trapped) {
      medicationTrapped = false;
      // 'expiry' (not the generic 'forced' fallback) so the shift event
      // this raises via onChange is distinguishable from a catch penalty
      // or a scripted room beat — "the meter ran out" and "an orderly put
      // you under" are different stories about the same transition.
      state.forceState('unmed', 'expiry');
      hud.toast('the calm drains out of you.');
      audio.medicationExpiredCue();
      telemetry.event('medication_expired', {
        room: current.def.id,
        lucid_duration_s: Math.round((performance.now() - lucidEnteredAt) / 100) / 10,
      });
    } else if (!medicationTrapped) {
      medicationTrapped = true;
      hud.toast('wearing off — keep moving.');
    }
  } else {
    medicationTrapped = false;
  }
}

const ctx: GameCtx = {
  state,
  hud,
  audio,
  telemetry: ctxTelemetry,
  flags: flagStore,
  removeInteractable: (id) => world.removeInteractable(id),
  moveInteractable: (id, pos, rotY) => {
    const entry = world.entries().find((e) => e.def.id === id);
    if (!entry) return;
    entry.mesh.position.set(pos[0], pos[1], pos[2]);
    if (rotY !== undefined) entry.mesh.rotation.y = rotY;
  },
  shiftFx,
  releasePointerLock: () => input.releasePointerLock(),
  scene: renderer.scene,
  playerPos: () => ({ x: player.x, z: player.z, yaw: player.yaw, level: player.level }),
  teleportPlayer: (x, z, level) => {
    player.x = x;
    player.z = z;
    if (level !== undefined) player.level = level;
    // Resync the distance tracker so this jump (e.g. an orderly's catch
    // penalty) isn't counted as the player having walked it — see
    // roomCounters.distance / lastPlayerX/Z above.
    lastPlayerX = x;
    lastPlayerZ = z;
  },
  updateScrawlText: (id, text) => world.updateScrawlText(id, text),
  isRoomDark: () => world.isDark(),
  setRoomDark: (dark) => {
    world.applyLight(dark);
    renderer.setDark(dark);
  },
  updateIconPanel: (id, lit) => world.updateIconPanel(id, lit),
  setGlowFade: (level) => world.setGlowFade(level),
};

// True only for the duration of state.shift() inside input.onShift, below —
// lets onChange tell "the player pressed Q" apart from every scripted
// forceState (catch penalty, room13's forced-lucid entry, tutorial beats,
// ...) without a second flag on StateSystem itself. input.onShift emits its
// own 'shift' event (it already has `result` to hand-tailor the payload),
// so onChange must not also log the manual case or every Q press would
// double-count.
let manualShiftInProgress = false;

state.onChange = (next, prev, source) => {
  world.applyState(next);
  hud.setState(next);
  audio.setState(next);
  updatePills();
  if (next === 'lucid') {
    medicationWarned = false; // fresh stretch, fresh warning
    lucidEnteredAt = performance.now();
  }
  if (!manualShiftInProgress) {
    // F13: log every scripted/imposed shift, not just the manual Q press,
    // so total lucid time and "chosen vs imposed lucidity" can be
    // reconstructed. `source` comes from StateSystem's forceState caller;
    // most existing room-script call sites don't pass one yet, hence the
    // 'forced' fallback.
    telemetry.event('shift', { direction: `${prev}->${next}`, source: source ?? 'forced' });
    sessionCounters.shifts++;
    roomCounters.shifts++;
  }
  current.script.onStateChange?.(next, ctx);
};

input.onShift = () => {
  if (!started || ended) return;
  const before = state.state;
  manualShiftInProgress = true;
  const result = state.shift();
  manualShiftInProgress = false;
  if (result === 'ok') {
    shiftFx();
    telemetry.event('shift', { direction: `${before}->${state.state}`, source: 'manual' });
    sessionCounters.shifts++;
    roomCounters.shifts++;
    // Only unmed->lucid actually spends a pill (state.shift() decrements
    // pills; forceState never does) — lucid->unmed is always free.
    if (before === 'unmed') {
      sessionCounters.pillsUsed++;
      roomCounters.pillsUsed++;
    }
  } else if (result === 'no-ability') {
    hud.toast('you have nothing to shift with. yet.');
  } else {
    hud.toast('you pat your pockets. nothing. lucidity has a price.');
    telemetry.event('pills_empty');
  }
};

input.onInteract = () => {
  if (!started || ended) return;
  interaction.interact(current.script, ctx);
};

function loadRoom(id: string): void {
  current = resolveEntry(rooms[id]);
  world.loadRoom(current.def);
  world.applyState(state.state);
  // Light axis — World.loadRoom already applies this internally (so the
  // room's opening visibility is correct before any frame renders), but the
  // Renderer's atmosphere (dimmed hemi/amb/point lights, tighter fog) is a
  // separate system that needs its own explicit call.
  world.applyLight(current.def.startDark ?? false);
  renderer.setDark(current.def.startDark ?? false);
  renderer.setRoomLights(current.def.lights.map((l) => l.pos));
  hud.setRoomLabel(current.def.name);
  // True stacked floors — spawn.level defaults to the room's first declared
  // level (or '__flat' for a room with no `levels`), same default
  // rooms/types.ts's RoomDef.spawn documents. Resolved here (loadRoom has
  // current.def in scope) rather than inside Player.spawn, which has no
  // reference to the room def.
  player.spawn({ ...current.def.spawn, level: current.def.spawn.level ?? current.def.levels?.[0]?.id ?? '__flat' });
  activeTriggers.clear();
  roomEnteredAt = performance.now();
  // Per-room telemetry rollup state (F12) — fresh for every visit,
  // including a revisit of the same room id.
  roomCounters = { catches: 0, shifts: 0, pillsUsed: 0, keypadFails: 0, distance: 0 };
  roomActiveMsAtEnter = telemetry.activeMs;
  lastPlayerX = player.x;
  lastPlayerZ = player.z;
}

function enterRoom(id: string): void {
  loadRoom(id);
  telemetry.event('room_enter');
  current.script.onEnter(ctx);
  telemetry.flush();
}

function completeRoom(exitTo: string): void {
  telemetry.event('room_complete', {
    duration_s: Math.round((performance.now() - roomEnteredAt) / 100) / 10,
    // Idle-corrected time actually spent in this room (F12) — diffed off
    // Telemetry's own session-wide idle tracking rather than main.ts
    // reimplementing idle detection.
    active_s: Math.round((telemetry.activeMs - roomActiveMsAtEnter) / 100) / 10,
    catches: roomCounters.catches,
    shifts: roomCounters.shifts,
    pills_used: roomCounters.pillsUsed,
    keypad_fails: roomCounters.keypadFails,
    distance_m: Math.round(roomCounters.distance * 10) / 10,
    // Medication meter remaining at the moment of clearing the room (F14)
    // — how much of the lucid stretch was left to spare, which is the
    // difference between a tense finish and a trivial one.
    //
    // Gated on actually being lucid: StateSystem deliberately does NOT
    // zero `medication` on the revert to unmed (see its header — nothing
    // reads it while unmed, and re-entering lucid always refills it), so
    // reading it raw here would report a stale value from whenever the
    // last lucid stretch happened to end. Exiting unmed reports 0, which
    // is the honest answer: there was no meter running.
    med_left: state.state === 'lucid' ? Math.round(state.medication * 100) / 100 : 0,
  });
  current.script.onLeave?.(ctx);
  if (exitTo === 'END') {
    endOfBuild();
  } else {
    enterRoom(exitTo);
  }
}

function endOfBuild(): void {
  ended = true;
  input.enabled = false;
  input.releasePointerLock();
  hud.setPrompt(null);
  // F2: the single most important missing event — did this session
  // actually finish the build? A whole-run rollup, mirroring
  // room_complete's per-room shape at session scope.
  telemetry.event('game_complete', {
    duration_s: Math.round((performance.now() - gameStartedAt) / 100) / 10,
    active_s: Math.round(telemetry.activeMs / 100) / 10,
    catches: sessionCounters.catches,
    shifts: sessionCounters.shifts,
    pills_used: sessionCounters.pillsUsed,
    run_index: telemetry.runIndex,
  });
  telemetry.flush();
  hud.showEndCard(
    'END OF THE NEW WING',
    'THE LAST WARD WASN\'T THE LAST.',
    `<em>PLAYTEST — tell the devs:</em><br><br>
     1 · Seven new rooms, each a different lock: pressure plate (14), colored shapes (15), the lights (16), two floors (17), the power lever (18–19), the crate (20). Which one actually made you stop and think — and which one fell flat?<br>
     2 · Room 17 stacked two floors — did you ever read the lower floor from the balcony, or get caught because you forgot an orderly was down there?<br>
     3 · Room 18's lever only moves once. Did LIGHTS or DOORS feel like a real choice, and would you replay to see the other branch?<br>
     4 · The wing has no keypads at all — a deliberate break from the codes in the main game. Did you miss them, or was it a relief?<br>
     5 · You ended with ${state.pills}/${state.maxPills} pills. Across seven rooms, was the single pill ever the thing that decided a run?`,
    'READMIT',
    () => location.reload(),
  );
}

function checkExits(): void {
  for (const e of current.def.exits) {
    if (player.x > e.minX && player.x < e.maxX && player.z > e.minZ && player.z < e.maxZ) {
      completeRoom(e.to);
      return;
    }
  }
}

// initial presentation: scene visible behind the start overlay
hud.setState(state.state);
loadRoom(startRoomId);
updatePills(); // reflect the room-jump pill/ability grant (no-op for room1)

// F5: pageLoad() fires here — before the start overlay, at the same point
// the scene itself becomes visible — not inside showStart's callback. A
// player who loads the page and bounces without ever pressing ADMIT ME
// previously logged nothing at all, not even the unload/beacon flush; on
// itch that's the largest audience segment and was invisible. start()
// stays gated behind ADMIT ME, below, since it marks the beginning of an
// actual attempt.
telemetry.pageLoad();

hud.bindConfig(isRandomizeCodesEnabled, (on) => {
  setRandomizeCodes(on);
  // randomizeCodes is a live gameplay variable (keypad codes fixed vs
  // random per playthrough) that previously wasn't recorded in any
  // payload, so its effect on completion/frustration metrics couldn't be
  // analysed. Logged on every toggle, not just at boot, since Tom can
  // flip it mid-session from the config panel.
  telemetry.event('settings_change', { key: 'randomizeCodes', value: on });
});

// Wall-clock start of the actual attempt (ADMIT ME), for game_complete's
// duration_s — distinct from page load, which may sit idle at the start
// overlay for an arbitrary amount of time first.
let gameStartedAt = 0;

hud.showStart(() => {
  started = true;
  input.enabled = true;
  audio.init();
  audio.setState(state.state);
  gameStartedAt = performance.now();
  telemetry.start();
  telemetry.event('room_enter');
  current.script.onEnter(ctx);
  roomEnteredAt = performance.now();
});

const clock = new THREE.Clock();
function frame(): void {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (started && !ended) {
    player.update(dt, input, world.colliders, state.state);
    // True stacked floors — resolved AFTER movement, from the player's new
    // (x,z): a no-op everywhere except fully clearing a StairwellDef
    // footprint (game/world.ts's resolveLevel), so this only ever fires at
    // the top/bottom of a stair run. No-op (stays '__flat') for every room
    // without `stairwells`.
    player.level = resolveLevel(player.level, player.x, player.z, world.stairwells);
    // F12 distance_m — accumulated here, right after player.update's natural
    // movement and before anything this frame can teleport the player (a
    // room script's ctx.teleportPlayer call, further down in update/
    // onTriggerEnter/onInteract), so a catch penalty's jump never gets
    // counted as the player having walked it. teleportPlayer resyncs
    // lastPlayerX/Z itself for exactly this reason.
    roomCounters.distance += Math.hypot(player.x - lastPlayerX, player.z - lastPlayerZ);
    lastPlayerX = player.x;
    lastPlayerZ = player.z;
    // Verticality — collision above stays 2D/XZ; this snaps the player's
    // rendered floor height toward whatever floorHeightAt says for their new
    // (level, x, z), smoothed so ramps feel continuous and zone-boundary
    // steps don't jar. No-op (targets 0, already 0) for every room without
    // heightZones/ramps/levels.
    player.y += (world.floorHeightAt(player.level, player.x, player.z) - player.y) * 0.35;
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
    current.script.update?.(dt, t, ctx);
    updateMedication(dt);
    const label = interaction.update(renderer.camera, state.state, current.script, ctx);
    world.setFocused(interaction.focusedId);
    hud.setPrompt(label ? (input.isTouch ? '◉ ' : '[E] ') + label : null);
    checkExits();
  }
  player.syncCamera(renderer.camera, t, state.state);
  world.update(t);
  renderer.update(dt, t, state.state);
  renderer.render();
}
frame();
