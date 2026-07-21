import type * as THREE from 'three';
import type { StateSystem } from './state';
import type { Flags } from './flags';
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
  // Cross-room persistent flags (game/flags.ts). Written by one room's
  // script, read by another's build/onEnter/isAvailable. Per-playthrough
  // only: never persisted to localStorage (unlike game/settings.ts), never
  // cleared by an orderly catch — the same lifetime as StateSystem, i.e. a
  // full page reload is the only reset.
  flags: Flags;
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
  // True while the current room's lights are off. Content gated by
  // BlockDef/ScrawlDef/InteractableDef.lightState reacts to this
  // automatically (World); a room script reads it for its own interaction
  // logic (e.g. room16's exit door refusing to open while lit).
  isRoomDark(): boolean;
  // Toggle the room's light state — called from a 'switch' interactable's
  // onInteract. Drives both World's lightState-gated visibility and the
  // Renderer's real point-light/ambient dimming (atmosphere).
  setRoomDark(dark: boolean): void;
  // Rewrite an already-rendered icon panel's lit state in place (room15's
  // shape-key progress panel) — no-op if `id` isn't an icon panel in the
  // current room. `lit` is parallel to the panel's ShapeSpec[] order.
  updateIconPanel(id: string, lit: boolean[]): void;
  // Room-wide phosphor charge/fade dial (room16's "the paint drinks the
  // light" mechanic) — 1 = full glow, 0 = fully faded. Dims every
  // lightState:'dark' block authored mat:'phosphor' plus every scrawl
  // authored ink:'phosphor', in place, every frame (World.update). Purely
  // visual: never touches lightState visibility gating or any collider, so
  // it can never strand the player, only their sense of direction. Clamped
  // to [0,1] by World — a room script may pass an unbounded ratio freely.
  setGlowFade(level: number): void;
}
