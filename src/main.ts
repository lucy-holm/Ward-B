import './style.css';
import * as THREE from 'three';
import { Renderer } from './engine/renderer';
import { Input } from './engine/input';
import { AudioEngine } from './engine/audio';
import { StateSystem } from './game/state';
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
    'END OF MILESTONE 4',
    'THE COUNTER REMEMBERS EVERY SHADOW YOU STOOD IN.',
    `<em>PLAYTEST — tell the devs:</em><br><br>
     1 · The code was split on opposite sides of his loop — did that force you to actually plan a route, or did you just wing it?<br>
     2 · Shifting lucid to cross the station meant going blind to him on purpose — did that feel tense, or just safe?<br>
     3 · You ended with ${state.pills}/${state.maxPills} pills — did that feel like enough, or did you white-knuckle it?<br>
     4 · Did you ever duck behind the island on purpose, using its shadow, or did you just get lucky?<br>
     5 · After all five rooms — which state do you trust now, lucid, unmed, or neither?`,
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
    const label = interaction.update(renderer.camera, state.state, current.script, ctx);
    hud.setPrompt(label ? (input.isTouch ? '◉ ' : '[E] ') + label : null);
    checkExits();
  }
  player.syncCamera(renderer.camera, t, state.state);
  world.update(t);
  renderer.update(dt, t, state.state);
  renderer.render();
}
frame();
