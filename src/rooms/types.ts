import type { GameCtx } from '../game/context';

export type WardState = 'lucid' | 'unmed';

// Which state(s) a mesh/collider/interactable exists in.
export type StateFilter = 'both' | 'lucid' | 'unmed';

// A room's light state (room-wide — see room16's design comments), orthogonal
// to StateFilter/WardState: whether the player is lucid/unmed is independent
// of whether the room's lights are on. Default 'both' everywhere, so every
// room shipped before this axis existed is unaffected.
export type LightFilter = 'both' | 'lit' | 'dark';

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
  | 'plate'
  | 'glow'
  | 'phosphor' // glow-in-the-dark paint — floor/wall markers, always lightState:'dark'
  | 'breaker'; // the switch fixture's own body, distinct from 'pad' so it doesn't read as another keypad

export interface BlockDef {
  size: [number, number, number];
  pos: [number, number, number];
  mat: MatName;
  states?: StateFilter; // default 'both'
  rotY?: number;
  lightState?: LightFilter; // default 'both'
}

export interface ColliderDef {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  states?: StateFilter; // default 'both'
}

// A rectangular XZ region that fires enter/exit callbacks when the player
// crosses its boundary — the declarative, reusable version of the ad-hoc
// "inStretch" boolean every hand-rolled hazard reimplements (room13's
// closing walls). Optionally state-filtered: a trigger with states:'lucid'
// or 'unmed' only EXISTS — fires nothing, matches nothing — while the ward
// is in that state, same StateFilter convention as BlockDef/ColliderDef.
// Deliberately NO implicit collider: a trigger is a floor-level sensor, not
// an obstacle. A room wanting a blocking trigger region authors a separate
// rb.solid(...), same opt-in as any other prop.
export interface TriggerDef {
  id: string;
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
  // Stable handle for World.updateScrawlText — only needed on scrawls a room
  // script rewrites at runtime (e.g. a randomized keypad code's wall clue).
  id?: string;
  lightState?: LightFilter; // default 'both'
  // Ink color for makeScrawlTexture: 'red' (default, unchanged) or
  // 'phosphor' (pale glow-green, #bfffc9) — a scrawl that's supposed to read
  // as glow-in-the-dark paint should look like it, not like the same red ink
  // every other scrawl in the game uses. Purely cosmetic; doesn't affect
  // visibility (lightState does that).
  ink?: 'red' | 'phosphor'; // default 'red'
}

export type InteractableType =
  | 'pill_cup'
  | 'dispenser'
  | 'pill_pickup'
  | 'keypad'
  | 'door'
  | 'switch'; // a room-wide light toggle — see room16, World.buildSwitch

export interface InteractableDef {
  id: string;
  type: InteractableType;
  size: [number, number, number];
  pos: [number, number, number];
  mat: MatName;
  states?: StateFilter; // default 'both'
  label: string; // prompt text, e.g. "take the pill"
  // Explicit wall-mount facing for dispenser/keypad/door composites, overriding
  // world.ts's inferFacing heuristic (which points the faceplate toward the
  // room's overall floor center — wrong for fixtures mounted inside an
  // alcove/nook, where "toward room center" can point into the recess's own
  // side wall instead of out its mouth). 'px'/'nx' = thin axis is x, faceplate
  // toward +x/-x; 'pz'/'nz' = thin axis is z, faceplate toward +z/-z.
  facing?: 'px' | 'nx' | 'pz' | 'nz';
  // Supported for generality (a future room's hidden switch/dispenser
  // findable only in one light state) — unused by room16 itself, whose
  // switch/door are always-present fixtures gated by onInteract logic, not
  // by existence. default 'both'.
  lightState?: LightFilter;
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

// ---------------------------------------------------------------------------
// Verticality — a room's walkable floor height is a SINGLE-VALUED function of
// (x,z): at any spot there is exactly one walkable height, computed by
// game/world.ts's floorHeightAt. This buys real up/down (a raised mezzanine,
// a sunken pit, a ramped approach) without the hard problem of two walkable
// surfaces stacked at the same XZ column — collision stays the existing 2D
// XZ AABB system unchanged; the player is kept on the intended level by
// walls/railings, exactly like every other collider in the game.
//
// Both fields are optional and purely additive: a RoomDef with neither
// (every room shipped before this existed) has floorHeightAt return 0
// everywhere, identical to today's flat-floor behaviour.
// ---------------------------------------------------------------------------

// A rectangular region whose walkable floor sits at a fixed height `y`.
export interface HeightZone {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
}

// A rectangular region whose walkable floor height interpolates linearly
// along `axis`: `yLow` at the region's min end on that axis, `yHigh` at the
// max end. (Despite the names, yLow/yHigh don't have to satisfy yLow<yHigh —
// they're just "value at the min coordinate" / "value at the max coordinate";
// pick whichever orientation reads naturally for the ramp you're authoring.)
export interface RampDef {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  axis: 'x' | 'z';
  yLow: number;
  yHigh: number;
}

export interface RoomDef {
  id: string;
  name: string; // display label for the HUD, e.g. "the Cell"
  floor: { minX: number; maxX: number; minZ: number; maxZ: number };
  spawn: { x: number; z: number; yaw: number; y?: number }; // y default 0
  blocks: BlockDef[];
  colliders: ColliderDef[];
  scrawls: ScrawlDef[];
  interactables: InteractableDef[];
  lights: LightDef[];
  exits: ExitDef[];
  // Verticality — see HeightZone/RampDef above. Absent/empty ⇒ floor is
  // y=0 everywhere (every room without these is unaffected).
  heightZones?: HeightZone[];
  ramps?: RampDef[];
  // Trigger volumes — engine-polled for the player every frame (main.ts),
  // room-polled for orderlies via kit's inTrigger(). Absent/empty ⇒ no-op.
  triggers?: TriggerDef[];
  // Initial light state on room entry (see LightFilter). Default false
  // (lit) — every room shipped before this axis existed is unaffected.
  startDark?: boolean;
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
  // Fired once when the player's (x,z) crosses into/out of a
  // RoomDef.triggers region whose states filter matches the CURRENT
  // WardState — checked every frame (not just on movement), so a trigger
  // whose filter stops matching because the ward state changed (a shift,
  // or the medication timer expiring) while the player stood still fires
  // onTriggerExit on the spot. On room load the active set resets empty
  // without firing exits; a player who spawns or is teleported inside a
  // trigger's bounds fires onTriggerEnter on the next polled frame even
  // though nothing "crossed". Engine-detected in main.ts.
  onTriggerEnter?(id: string, ctx: GameCtx): void;
  onTriggerExit?(id: string, ctx: GameCtx): void;
  // Per-frame hook while this room is active and the game is running (NPCs, timers).
  update?(dt: number, t: number, ctx: GameCtx): void;
}
