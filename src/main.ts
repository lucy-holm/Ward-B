import './style.css';
import * as THREE from 'three';
import { Renderer } from './engine/renderer';
import { Input } from './engine/input';
import { AudioEngine } from './engine/audio';
import { circleHitsSolidUnmed } from './engine/collision';
import { StateSystem } from './game/state';
import { TUNING } from './tuning';
import { Player } from './game/player';
import { World } from './game/world';
import { Interaction } from './game/interaction';
import { Telemetry } from './game/telemetry';
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

// RoomScript is frozen (rooms/types.ts). room4/room5 own an NPC with
// scene-level resources that need an explicit teardown hook the base
// RoomScript doesn't have, so they export locally-extended types; this is
// the only place that needs to know about it.
type AnyRoomScript = RoomScript & { onLeave?(ctx: GameCtx): void };

const rooms: Record<string, { def: RoomDef; script: AnyRoomScript }> = {
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

let current = rooms[startRoomId];
let started = false;
let ended = false;
let roomEnteredAt = 0;

// Trigger volumes: ids of RoomDef.triggers regions the player is currently
// inside (state filter honored). Diffed each frame to fire the room
// script's onTriggerEnter/onTriggerExit. Cleared on room load WITHOUT
// firing exits — the old room's script is already torn down.
let activeTriggers = new Set<string>();

const telemetry = new Telemetry(() => ({
  room: current.def.id,
  x: player.x,
  z: player.z,
  pills: state.pills,
}));

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
    const trapped = circleHitsSolidUnmed(player.x, player.z, TUNING.player.radius, world.colliders);
    if (!trapped) {
      medicationTrapped = false;
      state.forceState('unmed');
      hud.toast('the calm drains out of you.');
      audio.medicationExpiredCue();
      telemetry.event('medication_expired');
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
  telemetry,
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
  playerPos: () => ({ x: player.x, z: player.z, yaw: player.yaw }),
  teleportPlayer: (x, z) => {
    player.x = x;
    player.z = z;
  },
  updateScrawlText: (id, text) => world.updateScrawlText(id, text),
};

state.onChange = (next) => {
  world.applyState(next);
  hud.setState(next);
  audio.setState(next);
  updatePills();
  if (next === 'lucid') medicationWarned = false; // fresh stretch, fresh warning
  current.script.onStateChange?.(next, ctx);
};

input.onShift = () => {
  if (!started || ended) return;
  const before = state.state;
  const result = state.shift();
  if (result === 'ok') {
    shiftFx();
    telemetry.event('shift', { direction: `${before}->${state.state}` });
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
  current = rooms[id];
  world.loadRoom(current.def);
  world.applyState(state.state);
  renderer.setRoomLights(current.def.lights.map((l) => l.pos));
  hud.setRoomLabel(current.def.name);
  player.spawn(current.def.spawn);
  activeTriggers.clear();
  roomEnteredAt = performance.now();
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
  telemetry.flush();
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

hud.bindConfig(isRandomizeCodesEnabled, setRandomizeCodes);

hud.showStart(() => {
  started = true;
  input.enabled = true;
  audio.init();
  audio.setState(state.state);
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
    // Verticality — collision above stays 2D/XZ; this snaps the player's
    // rendered floor height toward whatever floorHeightAt says for their new
    // XZ, smoothed so ramps feel continuous and zone-boundary steps don't
    // jar. No-op (targets 0, already 0) for every room without
    // heightZones/ramps.
    player.y += (world.floorHeightAt(player.x, player.z) - player.y) * 0.35;
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
