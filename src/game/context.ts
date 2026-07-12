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
}
