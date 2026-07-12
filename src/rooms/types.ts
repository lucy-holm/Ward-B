import type { GameCtx } from '../game/context';

export type WardState = 'lucid' | 'unmed';

// Which state(s) a mesh/collider/interactable exists in.
export type StateFilter = 'both' | 'lucid' | 'unmed';

export type MatName =
  | 'wall'
  | 'wall2'
  | 'floor'
  | 'ceil'
  | 'prop'
  | 'bed'
  | 'door'
  | 'chain'
  | 'pill'
  | 'pad'
  | 'dispenser'
  | 'glow';

export interface BlockDef {
  size: [number, number, number];
  pos: [number, number, number];
  mat: MatName;
  states?: StateFilter; // default 'both'
  rotY?: number;
}

export interface ColliderDef {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  states?: StateFilter; // default 'both'
}

// Handwriting on walls; rendered to a canvas texture, added to the unmed-only group.
export interface ScrawlDef {
  text: string; // \n for line breaks
  size: number; // world-units width of the plane
  pos: [number, number, number];
  rotY: number;
  big?: boolean;
}

export type InteractableType = 'pill_cup' | 'dispenser' | 'pill_pickup' | 'keypad' | 'door';

export interface InteractableDef {
  id: string;
  type: InteractableType;
  size: [number, number, number];
  pos: [number, number, number];
  mat: MatName;
  states?: StateFilter; // default 'both'
  label: string; // prompt text, e.g. "take the pill"
}

// Walking into this AABB leaves the room.
export interface ExitDef {
  to: string; // room id, or 'END' for end-of-build
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface LightDef {
  pos: [number, number]; // x,z — point lights sit at y=2.7
}

export interface RoomDef {
  id: string;
  floor: { minX: number; maxX: number; minZ: number; maxZ: number };
  spawn: { x: number; z: number; yaw: number };
  blocks: BlockDef[];
  colliders: ColliderDef[];
  scrawls: ScrawlDef[];
  interactables: InteractableDef[];
  lights: LightDef[];
  exits: ExitDef[];
}

// Per-room bespoke logic (tutorial beats, phase gating). Generic behaviour
// (dispenser refill, pill pickup) lives in the Interaction system, not here.
export interface RoomScript {
  onEnter(ctx: GameCtx): void;
  // Return false to hide/disable an interactable right now (e.g. phase gating).
  isAvailable?(id: string, ctx: GameCtx): boolean;
  // Return true if the script fully handled the interaction (generic handler skipped).
  onInteract?(id: string, ctx: GameCtx): boolean;
  onStateChange?(next: WardState, ctx: GameCtx): void;
  // Per-frame hook while this room is active and the game is running (NPCs, timers).
  update?(dt: number, t: number, ctx: GameCtx): void;
}
