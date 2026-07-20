import type * as THREE from 'three';
import type { StateSystem } from './state';
import type { Telemetry } from './telemetry';
import type { Hud } from '../ui/hud';
import type { AudioEngine } from '../engine/audio';

// The surface room scripts are allowed to touch. Kept narrow on purpose:
// scripts drive tutorial beats, they don't reach into the engine.
export interface GameCtx {
  state: StateSystem;
  hud: Hud;
  audio: AudioEngine;
  telemetry: Telemetry;
  // Permanently remove an interactable and its mesh (e.g. the swallowed pill cup).
  removeInteractable(id: string): void;
  // Reposition/rotate an existing interactable's mesh in place (e.g. a door swinging open).
  moveInteractable(id: string, pos: [number, number, number], rotY?: number): void;
  // Full shift presentation (HUD pulse + fov kick + stinger) for scripted state changes.
  shiftFx(): void;
  // Drop pointer lock so an HTML overlay (e.g. the keypad) can take mouse input.
  // The player re-acquires it by clicking the canvas again, same as the start overlay.
  releasePointerLock(): void;
  // Scene access for room-owned actors (e.g. room4's orderly).
  scene: THREE.Scene;
  // Current player position + look yaw, for room-owned actors that need to
  // track the player or compute screen-relative threat bearings. `level`
  // (true stacked floors, rooms/types.ts's LevelDef) is '__flat' for every
  // room without `levels` — the honest generalization, even though most
  // rooms never read it.
  playerPos(): { x: number; z: number; yaw: number; level: string };
  // Hard-reposition the player (e.g. the orderly's catch penalty). `level`
  // is optional and defaults to leaving the player's current level
  // untouched — every existing call site (no third argument) keeps working
  // unchanged. A multi-level room's catch/reset handler must pass it
  // explicitly, or a catch on an upper level would teleport the player to
  // ground-level spawn coordinates while still flagged as being on the
  // upper level.
  teleportPlayer(x: number, z: number, level?: string): void;
  // Rewrite an already-rendered scrawl's text in place (e.g. a randomized
  // keypad code's wall clue) — no-op if `id` isn't a scrawl in the current room.
  updateScrawlText(id: string, text: string): void;
}
