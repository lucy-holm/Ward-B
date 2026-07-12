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
  // Full shift presentation (HUD pulse + fov kick + stinger) for scripted state changes.
  shiftFx(): void;
}
