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
import { Hud } from './ui/hud';
import type { GameCtx } from './game/context';
import type { RoomDef, RoomScript } from './rooms/types';
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
};

const container = document.getElementById('game')!;
const hud = new Hud();
const renderer = new Renderer(container);
const input = new Input(container);
const audio = new AudioEngine();
const state = new StateSystem();
const world = new World(renderer.scene);
const player = new Player();
const interaction = new Interaction(world);

let current = rooms.room1;
let started = false;
let ended = false;
let roomEnteredAt = 0;

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
    'END OF MILESTONE 8',
    'NEITHER STATE WAS SAFE.',
    `<em>PLAYTEST — tell the devs:</em><br><br>
     1 · Room 13: did you actually alternate states under pressure, or did one state carry you through — and if so, which?<br>
     2 · The walls never give back what they take. Did that change how you rationed lucid, or did it just feel punishing?<br>
     3 · No dispenser in room 13 — you crossed with whatever you saved. Did the earlier rooms' spending suddenly matter?<br>
     4 · Rooms 11 and 12 again, now with nothing to refill on between the gates — did carrying two pills finally feel like a plan you had to make?<br>
     5 · Touching an orderly now always catches you, not just when he's chasing. Fair, or did it ever feel cheap?<br>
     6 · You ended with ${state.pills}/${state.maxPills} pills. Was there a moment you counted them before committing to something?`,
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
loadRoom('room1');

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
