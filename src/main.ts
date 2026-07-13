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
    'END OF MILESTONE 7',
    'TWO POCKETS. NEVER ENOUGH FLOOR.',
    `<em>PLAYTEST — tell the devs:</em><br><br>
     1 · Room 11 sat you down with one dispenser, then two locked doors and nothing between them — did that force you to actually bank both pills before crossing, or did you find a way around carrying two?<br>
     2 · Room 12 stretched the same trick across two whole chambers, both code halves, and three orderlies before the next cabinet — did scarcity change how you planned the crossing, or did it just feel like more of the same?<br>
     3 · The day hall ran two of them on counter-rotating loops — did that read as two independent patrols, or did they blur into one shape?<br>
     4 · Three orderlies on one floor — fair, or did it tip into overwhelming? Where did the tension peak?<br>
     5 · Room 12 is the biggest room in the game — did the size and pacing hold up, or did any single stretch drag?<br>
     6 · You ended with ${state.pills}/${state.maxPills} pills — was there ever a point the two-pill capacity actually felt like a budget, not just a buffer?`,
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
