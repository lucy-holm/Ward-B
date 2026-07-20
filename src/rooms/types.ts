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
  // Stacked floors (see LevelDef/StairwellDef below) — undefined = active
  // regardless of the querying entity's current level (a real full-height
  // wall/pillar; the common case for perimeter walls that structurally pass
  // through every level). Set = active only while the querying entity
  // (player or a specific Orderly) is currently on that level — e.g. a
  // gallery's railing, which must not block the floor underneath it. Every
  // collider shipped before this field existed has level === undefined, so
  // it's active regardless of what level is checked against — no behavior
  // change for any room that doesn't author `levels`.
  level?: string;
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
  // Stacked floors — VIEWER METADATA ONLY, exactly like DebugPatrol.label's
  // "descriptive data only, the game never reads it" convention. Nothing in
  // the runtime interaction/raycast/scrawl-render path needs it: a fixture
  // mounted at a raised level's height is already well outside a ground-
  // level player's interact range and its mesh is real geometry a ground-
  // level raycast simply won't reach. Exists so /map.html can filter/ghost
  // by level without guessing from position.
  level?: string;
}

// 'push_block' (room20): a sokoban-lite crate. No dedicated builder in
// world.ts's loadRoom switch — it falls through to the generic `default:`
// branch (a plain BoxGeometry box, mat:'prop'), same as every type added
// before a room actually needed bespoke geometry for it. Entirely
// room-script-owned: push resolution, the mutable ColliderDef it shares
// with orderly occluders, and the move-tween all live in room20.ts, not here.
export type InteractableType =
  | 'pill_cup'
  | 'dispenser'
  | 'pill_pickup'
  | 'keypad'
  | 'door'
  | 'switch' // a room-wide light toggle — see room16, World.buildSwitch
  | 'shape_key'
  | 'shape_lock'
  | 'push_block';

// The three shapes room15's shape-key mechanic deals in — a shape_key prop
// is one of these, a shape_lock needs all three, an icon panel shows them
// left to right.
export type ShapeKind = 'circle' | 'square' | 'triangle';

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
  // Meaningful only on type:'shape_key' — which shape this prop is, and its
  // display/glow color (hex). Absent on every other interactable type.
  shape?: ShapeKind;
  color?: string;
  // Stacked floors — VIEWER METADATA ONLY, see ScrawlDef.level's header for
  // why the runtime never needs to read this.
  level?: string;
}

// One shape+color pairing, e.g. one slot on a shape_lock's icon panel.
export interface ShapeSpec {
  shape: ShapeKind;
  color: string; // hex
}

// A door-top progress panel — mirrors ScrawlDef's shape (world-space plane +
// a stable id World.updateIconPanel can rewrite in place). Shapes render
// left-to-right in array order.
export interface IconPanelDef {
  id: string;
  shapes: ShapeSpec[];
  pos: [number, number, number];
  rotY: number;
  size?: number; // world-units width of the plane, default 2.4 (kit.ts)
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

// ---------------------------------------------------------------------------
// True stacked floors — a room-local named LEVEL is the disambiguator the
// single-valued floorHeightAt above can't provide on its own: two levels'
// footprints (e.g. a gallery and the floor it overhangs) can legitimately
// share the same XZ rectangle at two different heights, because "which one
// answers floorHeightAt" is no longer a pure function of (x,z) — it also
// depends on which level the querying traveler (the player, or a specific
// Orderly) currently carries. See game/world.ts's resolveLevel/floorHeightAt
// and game/orderly.ts's cross-level LOS gate for the two places that
// disambiguation actually happens.
//
// Purely additive: a RoomDef with no `levels` (every room shipped before
// this existed) is treated as exactly one implicit level (id '__flat',
// baseY 0, this room's own top-level heightZones/ramps) — see world.ts's
// loadRoom for the exact shape. Nothing about rooms 1-16 changes.
// ---------------------------------------------------------------------------

// A room-local named floor.
export interface LevelDef {
  id: string; // room-local id, e.g. 'ground' | 'balcony'
  baseY: number; // walkable height anywhere in this level's own footprint
  // this level's own footprint — NOT consumed by floorHeightAt (baseY/
  // heightZones/ramps are), only by spawn validation and the map viewer.
  floor: { minX: number; maxX: number; minZ: number; maxZ: number };
  heightZones?: HeightZone[]; // scoped to this level, same semantics as today
  ramps?: RampDef[]; // scoped to this level, same semantics as today
}

// The connector between exactly two levels — a stair run, modeled as a ramp
// that also flips which level a traveler is considered "on" once they fully
// clear the far end. `yLow`/`levelAtLow` describe the axis's min end,
// `yHigh`/`levelAtHigh` the max end (mirrors RampDef's yLow/yHigh convention
// exactly, plus the level tag each end belongs to).
export interface StairwellDef {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  axis: 'x' | 'z';
  yLow: number;
  levelAtLow: string;
  yHigh: number;
  levelAtHigh: string;
}

export interface RoomDef {
  id: string;
  name: string; // display label for the HUD, e.g. "the Cell"
  floor: { minX: number; maxX: number; minZ: number; maxZ: number };
  spawn: { x: number; z: number; yaw: number; y?: number; level?: string }; // y default 0, level default levels?.[0]?.id ?? '__flat'
  blocks: BlockDef[];
  colliders: ColliderDef[];
  scrawls: ScrawlDef[];
  interactables: InteractableDef[];
  lights: LightDef[];
  exits: ExitDef[];
  // Verticality — see HeightZone/RampDef above. Absent/empty ⇒ floor is
  // y=0 everywhere (every room without these is unaffected). Ignored by
  // floorHeightAt when `levels` is present (the implicit level wraps these
  // instead) — a room author uses one or the other, never both.
  heightZones?: HeightZone[];
  ramps?: RampDef[];
  // True stacked floors — see the LevelDef/StairwellDef header above.
  // Absent ⇒ one implicit level ('__flat'), absent stairwells ⇒ none.
  levels?: LevelDef[];
  stairwells?: StairwellDef[];
  // The room's one ceiling plane height (world.ts's loadRoom). Default 3
  // (today's hardcoded constant) — deliberately room-wide, not per-level;
  // see room17.ts's header for the headroom arithmetic on a stacked room.
  ceilingY?: number;
  // Trigger volumes — engine-polled for the player every frame (main.ts),
  // room-polled for orderlies via kit's inTrigger(). Absent/empty ⇒ no-op.
  triggers?: TriggerDef[];
  // Initial light state on room entry (see LightFilter). Default false
  // (lit) — every room shipped before this axis existed is unaffected.
  startDark?: boolean;
  // Door-top progress panels (room15's shape lock) — optional/additive,
  // absent ⇒ no panels, identical to every room shipped before this existed.
  iconPanels?: IconPanelDef[];
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
