#!/usr/bin/env python3
"""
Ward B room .tscn generator.

One-time (well, per-room) generator that turns the compact room specs below
into REAL Godot scenes. After generation the .tscn is the source of truth and
is fully editable in the editor — this script exists so the seven rooms
ported from the Three.js build don't have to be hand-typed, not so that
rooms stay data forever. New rooms should be authored in the editor.

Geometry conventions mirror src/rooms/build.ts exactly:
    WALL_THICKNESS 0.24  (half 0.12)
    WALL_HEIGHT    3.0
    WALL_Y         1.5
    wall_x(x0, x1, z) -> mesh [x1-x0, 3, 0.24] at ((x0+x1)/2, 1.5, z)
                         collider {x0..x1, z-0.12 .. z+0.12}
    wall_z(z0, z1, x) -> mesh [0.24, 3, z1-z0] at (x, 1.5, (z0+z1)/2)
                         collider {x-0.12 .. x+0.12, z0..z1}

Collision layers (see project.godot [layer_names]):
    1 player, 2 world_static, 4 solid_lucid_only, 8 solid_unmed_only,
    16 orderly, 32 interactable, 64 trigger

Note that trigger VOLUMES (Room.trigger/Room.plate) use no collision layer at
all — layer 64 belongs to the exit Area3Ds. A trigger volume is not a physics
object in any form; it is a rect polled per frame. See core/trigger_volume.gd.
"""

import os
import math
import sys

OUT_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")

WALL_HALF = 0.12
WALL_H = 3.0
WALL_Y = 1.5
# Mirrors core/tuning.gd's PLAYER_EYE_HEIGHT, for the headroom check on a
# raised level (ROOM_AUTHORING.md §8).
EYE_HEIGHT = 1.62

# Fitting falloff. THESE ARE THE SHIPPED VALUES, back-ported from the .tscn
# files — see the long comment in Emitter.emit() next to the OmniLight3D block
# for the tuning history. The generator emitted 9.0/1.7 for a long time while
# every committed room1-7 .tscn carried 6.0/2.3, because the final lighting
# pass was applied to the scenes directly and never brought back here. That
# drift is a trap: regenerating any shipped room silently relit it. Room 12
# was generated with the values below, so the whole ward now agrees.
OMNI_RANGE = 6.0
OMNI_ATTENUATION = 2.3

# Godot group every phosphor-painted node joins, so core/phosphor.gd can find
# the room's paint without the room script enumerating it. Must match
# WardPhosphor.GROUP.
PHOSPHOR_GROUP = "phosphor"

LAYER_WORLD = 2
LAYER_LUCID = 4
LAYER_UNMED = 8
LAYER_INTERACTABLE = 32
LAYER_TRIGGER = 64

# Wall-mounted fixtures pin which way their faceplate points. A Node3D's
# forward is -Z, and a yaw of theta maps forward to (-sin, -cos), so:
#   nz -> 0, nx -> +pi/2, px -> -pi/2, pz -> pi
# Two dispensers (room6, room7) MUST be pinned: room7's shipped a bug where
# inferred facing pointed the MEDICATION plate straight into a wall.
FACING_ROT = {
    "nz": 0.0,
    "nx": math.pi / 2,
    "px": -math.pi / 2,
    "pz": math.pi,
}

# Composite fixture models, authored in CANONICAL orientation (width X,
# height Y, depth Z, faceplate toward -Z) at the base size below. The
# generator instances one per interactable and scales it to whatever the room
# authored, so a 1.8m door and a 2.0m door share one scene.
#
# A type with no entry here (or whose scene is missing) falls back to a plain
# box, so this file still generates before the fixture scenes exist.
FIXTURES = {
    "dispenser":   {"path": "res://fixtures/dispenser.tscn",   "size": (0.55, 0.75, 0.16)},
    "keypad":      {"path": "res://fixtures/keypad.tscn",      "size": (0.40, 0.50, 0.14)},
    "door":        {"path": "res://fixtures/door.tscn",        "size": (2.00, 3.00, 0.20)},
    "pill_cup":    {"path": "res://fixtures/pill_cup.tscn",    "size": (0.18, 0.22, 0.18)},
    "pill_pickup": {"path": "res://fixtures/pill_pickup.tscn", "size": (0.18, 0.18, 0.18)},
    # The lever fixture, used by BOTH room 18's relay levers and room 16's
    # lighting breaker. Base size matches kit.ts's SWITCH_FOOTPRINT ([thin
    # 0.16, height 0.60, along 0.50]) in canonical orientation, so a switch
    # authored through Room.light_switch() instances at scale 1.
    #
    # NAMING TRAP, and the reason this comment is long: the key is "switch"
    # but the scene is breaker.tscn. There used to be a SECOND "switch" entry
    # above this one pointing at fixtures/switch.tscn; being an earlier
    # duplicate key in the same dict literal, Python silently discarded it and
    # this entry always won. Both scenes expose the same Model/Lever node that
    # room16.gd and room18.gd rotate, so nothing ever looked wrong and the
    # shadowed entry survived unnoticed.
    #
    # The dead entry is now removed rather than the live one, deliberately:
    # every shipped scene already instances breaker.tscn, so pointing "switch"
    # at switch.tscn would silently restyle room 16's breaker and room 18's
    # two relay levers. That is a design decision, not a cleanup.
    #
    # CONSEQUENCE: fixtures/switch.tscn is currently UNREACHABLE from the DSL
    # and renders nowhere. Leave it, delete it, or make it reachable under its
    # own key — but know that it is dead today.
    "switch":      {"path": "res://fixtures/breaker.tscn",     "size": (0.50, 0.60, 0.16)},
}
# Drop any fixture whose scene has not been authored yet.
FIXTURES = {
    k: v for k, v in FIXTURES.items()
    if os.path.exists(os.path.join(OUT_ROOT, v["path"].replace("res://", "")))
}


# --- the prop kit ------------------------------------------------------------
# Handcrafted set dressing: chairs, cabinets, radiators, ceiling fittings, wall
# trim. Declared ONCE in props/_gen/prop_defs.py, which also emits the .tscn
# prefabs and the baked meshes — see that file's docstring for the pipeline.
#
# IMPORTED rather than re-declared here, deliberately. A copy of each prop's
# size/collider/mount in this file would be a second source of truth for
# numbers that already exist, and the FIXTURES table three blocks up is the
# cautionary tale: it carries a hand-typed `size` per fixture that must agree
# with the authored scene, and nothing checks that it does.
#
# Import failure is NOT fatal, matching how FIXTURES drops entries whose scene
# is missing: the generator must still run in a tree where the prop kit has not
# been generated yet, so rooms that use no props keep working and rooms that do
# fail loudly at the call site instead of at import time.
_PROP_GEN_DIR = os.path.join(OUT_ROOT, "props", "_gen")
try:
    if _PROP_GEN_DIR not in sys.path:
        sys.path.insert(0, _PROP_GEN_DIR)
    import prop_defs as _prop_defs
    PROPS = {
        k: v for k, v in _prop_defs.PROPS.items()
        if os.path.exists(os.path.join(OUT_ROOT, "props", "%s.tscn" % k))
    }
except ImportError:
    PROPS = {}


def _prop_value(v):
    """Python value -> a Godot .tscn property literal.

    Deliberately narrow. Anything richer than these five shapes is a sign the
    prop wants a real script API rather than a value squeezed through a room
    file, and guessing a serialisation for it would produce a scene that loads
    with a silently-wrong property instead of failing.
    """
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, str):
        # Newlines MUST be escaped, not passed through: a literal newline inside
        # a quoted .tscn value terminates the string as far as Godot's parser is
        # concerned and the scene fails to load. Several signage props ship
        # multi-line defaults ("PLEASE\nTAKE ONLY AS\nPRESCRIBED"), so this is
        # reached the first time anyone overrides one.
        return '"%s"' % (v.replace("\\", "\\\\").replace('"', '\\"')
                          .replace("\n", "\\n").replace("\r", "\\r"))
    # int BEFORE float: _num() formats everything as a decimal, so an
    # `@export var columns: int` would receive "3.0000". Godot coerces it, but
    # the emitted scene then no longer round-trips through the editor unchanged
    # — it rewrites the literal to 3 on the next save, and the round-trip guard
    # would blame the generator. (bool is a subclass of int in Python, which is
    # why the bool branch has to come first — it already does, above.)
    if isinstance(v, int):
        return str(v)
    if isinstance(v, float):
        return _num(v)
    if isinstance(v, (tuple, list)) and len(v) == 3:
        return "Vector3(%.4f, %.4f, %.4f)" % tuple(float(c) for c in v)
    if isinstance(v, (tuple, list)) and len(v) == 4:
        return "Color(%.4f, %.4f, %.4f, %.4f)" % tuple(float(c) for c in v)
    raise ValueError("cannot serialise prop property %r (type %s)" % (v, type(v).__name__))


def _pascal(name):
    """office_chair -> OfficeChair, for default node names."""
    return "".join(w.capitalize() for w in name.split("_"))


def _prop_yaw(spec):
    """Accept either a radian yaw or one of FACING_ROT's compass names.

    Room files read better with the compass names ("nz" = faceplate toward -Z),
    which is the vocabulary Room.interactable() already uses for exactly the
    same question, so the prop kit does not invent a second one.
    """
    if isinstance(spec, str):
        if spec not in FACING_ROT:
            raise ValueError("facing must be one of %s, got %r"
                             % (sorted(FACING_ROT), spec))
        return FACING_ROT[spec]
    return float(spec)


def _resolve_facing(size, pos, floor, explicit):
    """Which way the faceplate points. Ported from world.ts inferFacing():
    a wall-mounted fixture is thin on the axis it hangs off, and faces the
    room centre. An authored `facing` always wins — the heuristic misfires on
    alcove/nook mounts, which is a shipped bug the TS build hit in room 7
    (the MEDICATION plate ended up pointing into a wall)."""
    if explicit:
        return explicit
    sx, _sy, sz = size
    min_x, max_x, min_z, max_z = floor
    if sx < sz:
        return "nx" if pos[0] > (min_x + max_x) / 2.0 else "px"
    return "nz" if pos[2] > (min_z + max_z) / 2.0 else "pz"


def _canonical_size(size, face):
    """Authored size is in world axes; swap to canonical (thin in Z) when the
    fixture hangs off an X-facing wall, since the node itself gets rotated."""
    if face in ("px", "nx"):
        return (size[2], size[1], size[0])
    return size

# --- materials -------------------------------------------------------------

MATERIALS = {
    "wall":      ("0.42 0.435 0.425", 0.0),
    "wall2":     ("0.372 0.39 0.377", 0.0),
    "prop":      ("0.478 0.455 0.42", 0.0),
    "bed":       ("0.54 0.514 0.47", 0.0),
    "door":      ("0.306 0.353 0.388", 0.0),
    "chain":     ("0.227 0.239 0.251", 0.0),
    "pill":      ("0.949 1.0 0.98", 0.55),
    "pad":       ("0.604 0.639 0.627", 0.0),
    "dispenser": ("0.722 0.753 0.741", 0.0),
    "glow":      ("1.0 0.914 0.769", 0.9),
    "floor":     ("0.29 0.302 0.294", 0.0),
    "ceil":      ("0.337 0.349 0.341", 0.0),
    "keypad":    ("0.263 0.29 0.31", 0.15),
    # Floor-mounted mechanism plate — the visible marker for a trigger volume.
    # Like every other entry here this is only the historical flat placeholder;
    # materials/plate.tres is the authored ShaderMaterial and the real thing.
    "plate":     ("0.235 0.25 0.245", 0.25),
    # THE LIGHT AXIS's two MatNames are deliberately absent from this table.
    #   'breaker' renders as fixtures/breaker.tscn (materials/breaker.tres is a
    #     never-drawn fallback; see its header).
    #   'phosphor' is not an ext_resource at all — it is emitted as a
    #     resource_local_to_scene sub-resource of the room scene, because a
    #     charge/fade room writes its alpha at runtime and a shared .tres would
    #     leak that write into the next room to use the same MatName. See
    #     Emitter.phosphor_material() and core/phosphor.gd.
}


def write_materials():
    """DO NOT CALL. Kept only as a record of the original flat placeholders.

    This used to run on every generate and rewrite all 13 .tres files as flat
    StandardMaterial3D. After the materials were rebuilt as ShaderMaterials
    (world-space triplanar plaster/tile/worn), every subsequent `gen_rooms.py`
    run silently reverted them — the shaders were still on disk but nothing
    referenced them, so the ward rendered flat for four commits before anyone
    noticed. Materials are now authored by hand and are their own source of
    truth; the generator owns rooms only.
    """
    raise RuntimeError(
        "write_materials() would overwrite the authored ShaderMaterials in "
        "godot/materials/ with flat placeholders. It is intentionally disabled."
    )


def _uid_frag(name):
    h = 0
    for ch in name:
        h = (h * 131 + ord(ch)) & 0xFFFFFFF
    return format(h, "x")


# --- spec builder ----------------------------------------------------------


def _surface_y(base_y, zones, ramps, x, z):
    """Ramps beat zones beat base_y, matching core/levels.gd."""
    for min_x, max_x, min_z, max_z, axis, y_low, y_high in (ramps or []):
        if min_x <= x <= max_x and min_z <= z <= max_z:
            span = (max_x - min_x) if axis == "x" else (max_z - min_z)
            if span <= 0:
                return y_low
            t = ((x - min_x) / span) if axis == "x" else ((z - min_z) / span)
            return y_low + (y_high - y_low) * max(0.0, min(1.0, t))
    for min_x, max_x, min_z, max_z, y in (zones or []):
        if min_x <= x <= max_x and min_z <= z <= max_z:
            return y
    return base_y


class Room:
    def __init__(self, rid, name, floor, spawn, exits, script=None):
        self.rid = rid
        self.name = name
        self.floor = floor            # (min_x, max_x, min_z, max_z)
        self.spawn = spawn            # (x, z, yaw)
        self.exits = exits            # [(to, min_x, max_x, min_z, max_z)]
        self.script = script or "%s.gd" % rid
        # (mesh_size, mesh_pos, mat, state, collider|None, name|None, level|None,
        #  light|None)
        # `level` is the stacked-level tag — see the verticality block below.
        # `light` is the LIGHT-AXIS tag ('lit' | 'dark' | None) — see block().
        self.walls = []
        self.movers = []              # (name, size, pos, mat) — AnimatableBody3D, see mover()
        # (name, iid, cell_x, cell_z, size, mat, label) — see push_block()
        self.push_blocks = []
        self.props = []
        # Prop-kit instances, one dict each — see Room.model(). Dicts rather
        # than tuples because this grew to eight fields and a positional
        # mistake in the emitter would be silent.
        self.models = []
        self.scrawls = []
        self.interactables = []
        self.lights = []
        self.triggers = []            # (tid, min_x, max_x, min_z, max_z, state)
        # --- the light axis (see core/light_object.gd, autoload/room_light.gd)
        # Whether this room's lights are OFF when the player walks in. Emitted
        # as metadata/start_dark on the room root and read by main.gd's
        # load_room BEFORE the room enters the tree. Default False, so every
        # room built before this axis existed opens lit and is byte-identical.
        self.start_dark = False
        # Door-top shape-lock progress panels (room 15's mechanic). Additive:
        # a room with none emits no IconPanels node at all, so every scene
        # generated before this existed is byte-identical.
        self.icon_panels = []         # (pid, shapes, colors, pos, rot_y, size)
        self.ceiling_y = 3.0
        # --- verticality (see core/levels.gd) -----------------------------
        # TIER 1: a single-valued floor height. Zones and ramps declared here
        # are folded into the synthetic '__flat' level at load. They have ZERO
        # collision impact — a raised region is never a collider, only a
        # height the rendered Y eases toward. Keep the player on it with
        # ordinary walls and railings, which are ordinary colliders.
        self.height_zones = []        # (min_x, max_x, min_z, max_z, y)
        self.ramps = []               # (min_x, max_x, min_z, max_z, axis, y_low, y_high)
        # TIER 2: genuinely stacked surfaces. Declaring `levels` REPLACES the
        # tier-1 fold, so a room uses one or the other, never both — the
        # zones/ramps of a stacked room belong to a level, not to the room.
        self.levels = []              # (id, base_y, floor, zones, ramps)
        self.stairwells = []          # dicts, see stairwell()
        # Ceiling-fitting falloff, per-room because THIS GENERATOR IS STALE and
        # cannot currently round-trip rooms 1-7.
        #
        # Commit bafc584 ("concept-art UNMED pools") retuned every shipped room
        # to omni_range 6.0 / omni_attenuation 2.3 by editing
        # rooms/room{1-7}.tscn directly, and never updated this file. So
        # re-running gen_rooms.py REVERTS the lighting of every room it writes
        # back to the 9.0/1.7 below — a flat overlapping wash instead of the
        # tight pools the concept art asks for. Rooms 4 and 5 drifted further
        # still (that commit also bumped them from 2 to 3 shadow-casting
        # fixtures, which the `i % 3` rule below cannot express), so those two
        # cannot be regenerated faithfully at all right now.
        #
        # The defaults below are therefore left at the OLD values purely so
        # this change is provably a no-op for rooms 1-7's emitted output; they
        # are NOT what the game ships. Until the default is fixed centrally
        # (and 1-7 re-emitted and re-verified), regenerating rooms 1-7 means
        # reverting them afterwards. Room 8 onward sets the real values.
        # Default to the SHIPPED values (OMNI_RANGE / OMNI_ATTENUATION), not
        # the stale 9.0/1.7 this generator carried for months. A room may still
        # override per-room — room 8 does — but saying nothing now reproduces
        # what rooms 1-7 actually ship.
        self.light_range = OMNI_RANGE
        self.light_attenuation = OMNI_ATTENUATION
        # Extra shadow-casting fitting indices, on top of the `i % 3` rule.
        #
        # Rooms 4 and 5 were hand-promoted in commit bafc584 to give L1 a
        # shadow as well as L0 and L3 — a judgement about those two rooms that
        # the modulo rule cannot express. Without this the generator silently
        # DEMOTES them on any full run, which is a real (if subtle) lighting
        # regression: it was the last remaining drift between this file and the
        # shipped scenes.
        self.shadow_extra = []

    # geometry -------------------------------------------------------------
    def wall_x(self, x0, x1, z, mat="wall", state=None, level=None):
        self._wall((x1 - x0, WALL_H, 0.24), ((x0 + x1) / 2.0, WALL_Y, z), mat, state,
                   (x0, x1, z - WALL_HALF, z + WALL_HALF), level=level)

    def wall_z(self, z0, z1, x, mat="wall2", state=None, level=None):
        self._wall((0.24, WALL_H, z1 - z0), (x, WALL_Y, (z0 + z1) / 2.0), mat, state,
                   (x - WALL_HALF, x + WALL_HALF, z0, z1), level=level)

    def _wall(self, size, pos, mat, state, collider, name=None, level=None, light=None):
        self.walls.append((size, pos, mat, state, collider, name, level, light))

    def block(self, size, pos, mat="wall", state=None, collider=None, name=None,
              level=None, light=None):
        """Mesh, optionally with its own collider footprint.

        `light` is the LIGHT-AXIS filter: None/'both' (always drawn), 'lit'
        (dies with the breaker — house lighting) or 'dark' (glow-in-the-dark
        paint, invisible until the lights go out). The mesh gets a
        core/light_object.gd wrapper; nothing else changes.

        A LIGHT-GATED COLLIDER IS AN ERROR, NOT AN OPTION, and the raise below
        is the whole soft-lock guarantee expressed as code. The Three.js build
        made it structural by giving ColliderDef no light field at all; the
        generator has one call that carries both, so the invariant has to be
        asserted here instead. If darkness could move, add or remove a
        collider, then a dark room would no longer be geometrically identical
        to a lit one, and room 16's "a 0-pill unmed player can always walk back
        to a dispenser, in EITHER light state" audit would stop being
        unconditional. Author the mesh and the collider as two calls if you
        genuinely need a permanent solid behind disappearing paint.
        """
        if light in ("lit", "dark") and collider is not None:
            raise ValueError(
                "light-gated block at %r carries a collider %r. The light axis "
                "gates meshes and raycasts ONLY, never collision — see "
                "core/light_object.gd. Emit the collider as a separate solid()."
                % (pos, collider))
        self.walls.append((size, pos, mat, state, collider, name, level, light))

    def solid(self, min_x, max_x, min_z, max_z, state=None, name=None, level=None):
        """Collider with no mesh. `name` gives it a stable node name so a room
        script can find it later (door colliders are unlocked by name).

        No `light` parameter, on purpose — see block()."""
        self.walls.append((None, None, None, state, (min_x, max_x, min_z, max_z),
                           name, level, None))

    def band_x(self, x0, x1, z, y0=WALL_H, y1=None, mat="wall"):
        """Upper wall band, NO COLLIDER — cosmetic only.

        A two-storey room's ceiling sits above the standard 3m wall height, so
        without these the volume is open above every wall and the upper level
        looks out into nothing. Bands close it visually. They are deliberately
        never colliders: containment is the 0..3m wall's job, and colliders are
        infinite in Y in this game, so a second one on the same XZ footprint
        would be pure redundancy."""
        y1 = self.ceiling_y if y1 is None else y1
        self.block((x1 - x0, y1 - y0, 0.24), ((x0 + x1) / 2.0, (y0 + y1) / 2.0, z), mat)

    def band_z(self, z0, z1, x, y0=WALL_H, y1=None, mat="wall2"):
        """Upper wall band on the Z axis. See band_x."""
        y1 = self.ceiling_y if y1 is None else y1
        self.block((0.24, y1 - y0, z1 - z0), (x, (y0 + y1) / 2.0, (z0 + z1) / 2.0), mat)

    # verticality ----------------------------------------------------------
    def floor_y_under(self, x, z):
        """Best-guess walkable floor height at (x, z), for placing bounce lights.

        Mirrors WardLevels' precedence — a level's ramps beat its zones beat its
        base_y — but deliberately does NOT consult stairwells: a bounce light
        belongs on a floor, not on a flight of steps, and a stairwell's height
        is a function of where you are along it rather than a surface to pool
        light on.

        Where levels genuinely stack, the HIGHEST surface under the fitting
        wins. A ceiling fitting hangs from the ceiling of the topmost level it
        is inside, so that is the floor its bounce should land on.
        """
        best = 0.0
        if self.levels:
            for _lid, base_y, floor, zones, ramps in self.levels:
                if floor is not None:
                    fx0, fx1, fz0, fz1 = floor
                    if not (fx0 <= x <= fx1 and fz0 <= z <= fz1):
                        continue
                best = max(best, _surface_y(base_y, zones, ramps, x, z))
        else:
            best = _surface_y(0.0, self.height_zones, self.ramps, x, z)
        return best


    def height_zone(self, min_x, max_x, min_z, max_z, y):
        """A flat raised (or sunken) rectangle. NOT a collider."""
        self.height_zones.append((min_x, max_x, min_z, max_z, y))

    def ramp(self, min_x, max_x, min_z, max_z, axis, y_low, y_high):
        """A sloped rectangle. `axis` is 'x' or 'z' — the dimension the slope
        runs along; y_low is at that axis's MIN end. Ramps beat height zones
        where the two overlap, so a ramp's endpoints can sit flush against an
        adjacent zone without the zone fighting it at the seam. NOT a
        collider."""
        self.ramps.append((min_x, max_x, min_z, max_z, axis, y_low, y_high))

    def level(self, lid, base_y, floor, zones=None, ramps=None):
        """One room-local named floor, for a genuinely stacked room.

        `floor` is this level's own footprint (min_x, max_x, min_z, max_z). It
        is NOT consulted when resolving height — base_y, zones and ramps are —
        and exists for spawn validation and tooling.

        A raised level's own floor must ALSO be authored as an opaque box
        (`block`) whose underside becomes the ceiling for whoever is below it.
        The engine draws no floor for a level: there is one ceiling plane per
        room and nothing else."""
        self.levels.append((lid, base_y, floor, list(zones or []), list(ramps or [])))

    def stairwell(self, sid, min_x, max_x, min_z, max_z, axis,
                  y_low, level_at_low, y_high, level_at_high):
        """The connector between exactly two levels.

        y_low/level_at_low describe the AXIS's min end, y_high/level_at_high
        its max end. "low" and "high" name the ends of the axis, not the
        heights: a stair that descends as z increases has y_low > y_high.

        A traveler's level flips only on clearing the footprint end to end,
        never mid-stair. Keep every orderly patrol leg out of the footprint —
        an orderly's level is fixed for life and never flips."""
        self.stairwells.append({
            "id": sid, "min_x": min_x, "max_x": max_x, "min_z": min_z, "max_z": max_z,
            "axis": axis, "y_low": y_low, "level_at_low": level_at_low,
            "y_high": y_high, "level_at_high": level_at_high,
        })

    def has_verticality(self):
        return bool(self.height_zones or self.ramps or self.levels or self.stairwells)

    def mover(self, name, size, pos, mat="wall2"):
        """A wall that MOVES at runtime: mesh + collider welded into one body,
        emitted as an AnimatableBody3D rather than a StaticBody3D.

        Everything else in the ward is a StaticBody3D because it never moves.
        Godot treats StaticBody3D as immovable by contract — moving one is
        undefined behaviour as far as the physics server is concerned.
        AnimatableBody3D is the node type that means "static body, but code
        drives its transform", which is exactly what room 13's closing slabs
        are, so the scene stays honest about what it contains.

        `sync_to_physics` is left OFF deliberately. It exists so a moving body
        can push a CharacterBody3D that runs move_and_slide; nothing in this
        game does (see player.gd — collision_mask 0, position written directly
        from WardCollision.try_move), so it would buy nothing and cost a
        kinematic step per frame. The room script owns both the transform and
        the WardCollision box for these bodies. See rooms/room13/room13.gd.

        Unlike block(), mesh and collider are the SAME box centred on the body
        origin, so the room script can move both with one position write.
        """
        self.movers.append((name, size, pos, mat))

    def push_block(self, name, iid, cell_x, cell_z, size=0.86, height=None,
                   mat="prop", label="push it"):
        """A pushable crate: room 20's mechanic, and the only thing in the ward
        that is a solid, an occluder and a raycast target at once.

        Emitted as ONE AnimatableBody3D (like mover(), and for the same reason:
        StaticBody3D means "never moves" by contract) carrying, in this order:

            Crate                AnimatableBody3D, layer world_static
              Shape              CollisionShape3D — THE collider, and the box
                                 WardCollision caches. Never offset from the
                                 body, so the body's transform IS the collider,
                                 and a stray rebuild_collision() self-heals.
              Visual             Node3D — the ONLY thing the room tweens
                Mesh             MeshInstance3D
                <iid>            Area3D + Interactable, layer interactable

        THE SPLIT BETWEEN Shape AND Visual IS THE WHOLE POINT. The push is
        discrete: the collider must be at the destination cell the instant a
        push is accepted, or a player following the crate can end up standing
        where the solid AABB already is. The MOTION is cosmetic, so the room
        slides `Visual` (mesh + ray target together, so the crosshair never
        drifts off the thing you can see) over ~0.18s while the body — and
        therefore the collider — is already there. Move the body, not Visual,
        and the tween becomes a moving collider; move Visual only, and the
        crate is solid where it isn't drawn.

        The Interactable rides INSIDE the body rather than under the room's
        Interactables node so that one transform write moves the crate, its
        collider and its focus target together — main.move_interactable() is
        never called for it, which is what stops the mesh and the AABB from
        drifting the way the Three.js build's two-object crate could.

        No `states` filter, ever: the crate's value is that it is the one tool
        in the game that does not care which reality you are in (design doc
        §2c, which rules a state-filtered block out explicitly).

        `size` IS THE XZ FOOTPRINT AND ONLY THE XZ FOOTPRINT. Every clearance
        number in a push-block room is derived from it (0.86m inside a 1.0m
        cell leaves 0.07m of margin a side, which is what makes per-cell
        corridor reasoning independent of push history), so it is not a knob.

        `height` defaults to `size` — a cube, matching the Three.js authoring —
        but a block meant to be COVER must override it, and this is a real
        engine difference rather than a style choice. The TS build tested
        occlusion as a zero-width XZ segment against a hand-authored occluder
        list, so a block occluded regardless of how tall it was drawn. Godot's
        Orderly._occluded() casts a REAL RayCast3D from his eye (y 1.5) to the
        player's (y 1.62), so anything shorter than ~1.62m is scenery the
        sightline passes straight over. A 0.86m cube blocks nothing at all.
        Cover has to be at least eye-high to be cover.
        """
        self.push_blocks.append((name, iid, cell_x, cell_z, size,
                                 size if height is None else height, mat, label))

    # content --------------------------------------------------------------
    def scrawl(self, text, pos, rot_y, size, sid=None, light=None, ink=None):
        """Wall handwriting. Always unmed-only (the Scrawls wrapper).

        `light` gates it on the LIGHT axis too, on top of that: a
        light='dark' scrawl is only drawn while the room is dark AND the
        player is raw, which is the both-gated case core/light_object.gd's
        header describes.

        `ink` is cosmetic only ('phosphor' = pale glow-green paint instead of
        the usual red). It does NOT affect visibility — `light` does that —
        but it does put the label in the phosphor group, so a room's
        charge/fade dial (main.set_glow_fade) dims its ink along with the
        painted floor.
        """
        self.scrawls.append((text, pos, rot_y, size, sid, light, ink))

    def interactable(self, iid, itype, size, pos, mat, label, state=None, facing=None,
                     model_script=None, model_props=None, light=None):
        """One fixture: an Area3D on the interactable layer, plus a model.

        The model is chosen in this order: an explicit `model_script` (a Node3D
        script that builds itself, for fixtures whose LOOK is per-instance —
        see shape_key below, where shape and colour differ per key), else the
        FIXTURES entry for `itype` if one exists, else a plain box. The script
        is handed `fixture_size` (the canonical, facing-corrected size) plus
        whatever `model_props` says, each value already rendered as a Godot
        literal.
        """
        self.interactables.append((iid, itype, size, pos, mat, label, state, facing,
                                   model_script, model_props, light))

    def light(self, x, z, y=2.7, circuit=None):
        """A ceiling fitting (plus its floor bounce, added by the emitter).

        `circuit` names which breaker owns it — see core/atmosphere.gd's
        CIRCUITS block for why ownership is an authored string rather than an
        index or a node name. Omitted means the default "house" circuit, which
        nothing in the game ever switches, so every room built before the light
        axis existed emits byte-identically and behaves identically.
        """
        self.lights.append((x, y, z, circuit))

    # --- shape keys / shape lock / icon panel -------------------------------
    # Room 15's mechanic, ported from kit.ts's shapeKeyProp / shapeLockDoor /
    # iconPanel. The three helpers below are the AUTHORING surface only — the
    # held-shape bookkeeping lives in core/shape_lock.gd, owned by the room
    # script, because a catch must never un-collect a key and room-script state
    # is what survives a catch (a catch teleports; it does not reload).
    #
    # Positions are authored explicitly, like every other fixture in this file
    # (see room10's dispensers), rather than derived from a wall side the way
    # kit.ts does it. The formulas, for hand-computing them:
    #   wall face      = wall_at +- 0.12          (walls are 0.24 thick)
    #   fixture centre = face +- thin / 2         (sits fully proud of the wall)
    #   panel centre   = face +- 0.03             (kit.ts's DEFAULT_SCRAWL_PROUD)

    def shape_key(self, kid, shape, color, pos, label="take it", size=(0.5, 0.9, 0.5)):
        """A free-standing shape-key pickup.

        ALWAYS states='unmed', and that is the entire visibility design: the
        generator wraps it in a StateObject, so the prop is not rendered while
        lucid and Interactable.is_focusable() refuses the ray for it. There is
        no bespoke hiding code anywhere in the mechanic.

        NO COLLIDER — a key is a raycast target and nothing else, so a player
        walks through it and a patrol crosses it as bare floor. `facing` is
        pinned rather than inferred (the heuristic is meaningless for a
        free-standing prop, and pinning is the rule this file learned the hard
        way in room 7).
        """
        self.interactable(kid, "shape_key", size, pos, "prop", label,
                          state="unmed", facing="pz",
                          model_script="res://fixtures/shape_key.gd",
                          model_props={"shape": '"%s"' % shape,
                                       "color": _color_literal(color)})

    def shape_lock(self, lid, pos, facing, shapes, label="use the lock",
                   size=(0.4, 0.5, 0.14)):
        """The wall fixture that opens the door once every shape is held.

        Keypad-shaped and keypad-sized (kit.ts reuses KEYPAD_FOOTPRINT), no
        collider, `facing` PINNED. `size` is in WORLD axes like every other
        interactable here, so it needs reordering per wall orientation: a
        north/south wall mount is (along, height, thin), an east/west one is
        (thin, height, along).
        """
        self.interactable(lid, "shape_lock", size, pos, "pad", label,
                          facing=facing,
                          model_script="res://fixtures/shape_lock.gd",
                          model_props={"shapes": _string_array(shapes)})

    def light_switch(self, sid, pos, facing, label="the breaker switch",
                     size=(0.16, 0.6, 0.5)):
        """The room-wide lighting breaker (room 16). Ported from kit.ts's
        lightSwitch(); renders as fixtures/breaker.tscn.

        `size` is in WORLD axes like every other interactable here, so it
        needs reordering per wall orientation: an east/west mount is
        (thin, height, along), a north/south one is (along, height, thin).
        `facing` is PINNED, never inferred — a switch lives on an alcove end
        cap, which is exactly the case the room-centre heuristic gets wrong.

        NOTE it is authored with NO light filter of its own: the switch is an
        always-present fixture in both light states, and has to be, or throwing
        the room dark would delete the only way to throw it back. What refuses
        an unmedicated hand is room policy in the room script, not this.
        """
        self.interactable(sid, "switch", size, pos, "breaker", label, facing=facing)

    def icon_panel(self, pid, shapes, colors, pos, rot_y, size=2.4):
        """The door-top progress panel: one dim outline per shape, lit as each
        key is collected.

        NOT an interactable and NOT state-filtered — it reads in both ward
        states, from across the room. `size` is the quad's WIDTH IN METRES (the
        height is size / len(shapes)); unlike a scrawl's `size`, which is a
        texture scale and renders far wider than it reads, this is a real
        measurement.
        """
        self.icon_panels.append((pid, list(shapes), [_color(c) for c in colors],
                                 pos, rot_y, size))

    # Kept next to the helpers above rather than with the emitter's other
    # serialisers: these are part of the authoring surface (a room hands in
    # '#3fa9dd', not four floats).

    # triggers ---------------------------------------------------------------
    def trigger(self, tid, min_x, max_x, min_z, max_z, state=None):
        """A rectangular XZ sensor region (core/trigger_volume.gd).

        Polled per frame against the player by main.gd's TriggerPoll, which
        fires the room script's optional on_trigger_enter/on_trigger_exit; the
        room tests its own actors (an orderly, a pushable crate) against the
        SAME rect via TriggerVolume.contains(). Containment is strict
        point-in-rect on XZ, so a rect needs min < max on both axes or it can
        never fire — check_rooms.gd rejects degenerate ones.

        NEVER emits a collider. A trigger is a floor-level sensor; if a region
        must also block movement, author a separate solid() for it.
        """
        self.triggers.append((tid, min_x, max_x, min_z, max_z, state))

    def plate(self, tid, min_x, max_x, min_z, max_z, state=None, y=0.02):
        """Pressure plate: one call, two shapes — a trigger and the thin flush
        'plate' box that marks it, sharing one footprint so the visible plate
        and its firing bounds can never drift apart. Ported from kit.ts's
        pressurePlate(); `y` is the visual half-height, so the box is y*2 tall
        (4cm at the default) and sits flush at floor level.

        DELIBERATELY NO COLLIDER, and this is the mechanic rather than an
        oversight: a plate must stay walkable, and with no collider it never
        enters the orderly's collider set either, so a patrol crosses one as
        bare floor with zero special-casing in Orderly.
        """
        self.trigger(tid, min_x, max_x, min_z, max_z, state)
        self.block((max_x - min_x, y * 2.0, max_z - min_z),
                   ((min_x + max_x) / 2.0, y, (min_z + max_z) / 2.0),
                   "plate", state, collider=None, name="%s_plate" % tid)

    # --- semantic props / lighting presets ---------------------------------
    # wall_x/wall_z/block/solid are the primitives every room, including this
    # section, is still built from — nothing below is a new emission path,
    # every preset here bottoms out in block()/solid()/light(). What they add
    # is a name for a convention that was previously ONLY visible as a
    # repeated arithmetic pattern across call sites: "a prop's collider is its
    # mesh's own XZ footprint", "an island's ring skirt sits flush to its
    # solid footprint", "a railing stands 0.45m above the surface it guards".
    # None of that was written down anywhere before this — a room author had
    # to reverse-engineer it from an existing call site and hope they copied
    # the arithmetic right. These presets are that reverse-engineering, done
    # once, with the invariant asserted (or simply unbreakable, where the
    # signature has no room to violate it) instead of repeated by hand.
    #
    # GROUNDING: every preset below is checked against every real instance in
    # the shipped ward (Part 1 of the tools/gen_rooms.py semantic-layer pass;
    # see the room functions for the `.prop()`/`.island()`/etc. call sites
    # that replaced the raw block()/solid() calls this was reverse-engineered
    # from). None of these invent a look nothing in the game uses — the
    # acceptance test for the whole pass was a byte-identical regenerate of
    # all 21 rooms, tools/check_roundtrip.sh, run after every conversion.
    #
    # Deliberately NOT covered here: FIXTURES-backed interactables (dispenser,
    # keypad, door, switch...) already have a semantic layer — interactable()
    # plus its FIXTURES table — and the shape-key/shape-lock/light-switch/
    # icon-panel helpers just above. This section is for the geometry that had
    # NO semantic layer at all: furniture, islands, shelving, railings, decks,
    # stair dressing, the one chain barrier, TV panels, and a plural light
    # helper.

    def prop(self, size, xz, name=None, mat="prop", state=None, level=None, y=None):
        """A free-standing prop box: mesh AND its own collider share one
        footprint. This is the convention EVERY hand-authored prop in the
        shipped ward already follows — eleven instances across eight rooms go
        through this method (room1's nightstand, room3's two tables, room4's
        two tables, room8's filing block, room9's desk and coatrack, room12's
        cabinet, room14's crate, room18's console), none of them different in
        any way that matters: `mat` is "prop" unless the room says otherwise,
        the mesh sits on the floor (`pos.y == size.y / 2`), and the
        collider's XZ rectangle is EXACTLY the mesh's XZ footprint, centred
        on `xz`.

        A TWELFTH — room5's seating block — fits this same invariant on paper
        and is NOT converted: its shipped collider (4.95, 5.65, -1.2, 1.2) is
        a hand-typed literal whose midpoint lands one float64 ULP off the
        5.3 this method derives from x +- size/2, which is invisible at the
        collider's own 4-decimal formatting but flips the sign of the mesh's
        (now not-quite-zero) relative offset — a real byte difference in the
        committed .tscn. See that call site (room5) for the full account; it
        is left as a raw block() rather than "fixed" by nudging emitted
        geometry to fit, which this preset must never do.

        `xz` is a plain (x, z) pair, not a 3-tuple — the y is DERIVED, never
        authored, which is the entire point of wrapping block(): a room
        author no longer computes pos.y or hand-expands the collider
        rectangle and risks it drifting a decimal off the mesh.

        `y`, if given, OVERRIDES the derived `size.y / 2`. None of the eleven
        instances above use it — it exists solely so bed() can reuse this
        method's collider math: room1's bed is shipped at pos.y 0.28, not the
        exact half-height 0.275, and that 0.005 rounding is real committed
        geometry this file must reproduce, not a typo this preset gets to
        silently correct.

        No light-gating parameter: a light-filtered prop with a footprint
        collider is not a combination anything in the ward uses, and block()
        already refuses a light-gated collider outright (see its docstring) —
        there is nothing extra to guard here.

        Friendly aliases (desk/table/nightstand/console) were considered and
        rejected: every shipped call already carries its own descriptive
        `name=`, so a `desk()` wrapper would just be `prop()` with one
        argument pre-filled and no invariant it enforces that this doesn't —
        noise, not clarity.
        """
        sx, sy, sz = size
        x, z = xz
        pos = (x, (sy / 2.0) if y is None else y, z)
        collider = (x - sx / 2.0, x + sx / 2.0, z - sz / 2.0, z + sz / 2.0)
        self.block(size, pos, mat, state, collider=collider, name=name, level=level)

    # --- the prop kit -------------------------------------------------------
    # Everything below places a HANDCRAFTED prefab from props/, as opposed to
    # the box presets above. The split is deliberate and is the whole design:
    # prop()/block() build the room's STRUCTURE, which has to stay cheap,
    # collidable and reproducible; model() hangs detail on it. A prop kit item
    # never defines where the player can walk unless the room asks it to.

    def model(self, kind, xz, facing=0.0, y=None, name=None, state=None,
              level=None, light=None, collider=None, props=None, text=None):
        """Instance one prop-kit prefab (props/<kind>.tscn).

        `y` DEFAULTS BY MOUNT, which is the point — a room author should not be
        computing heights for a radiator:
            floor    -> 0.0            (the prefab's parts sit on the floor)
            wall     -> the prop's declared mount_y (trolley height for a
                        bumper rail, eye level for a notice board, ...)
            ceiling  -> self.ceiling_y (the prefab hangs downward from it)
        Pass `y` to override — a monitor on a 1.0m counter is `y=1.0`.

        `facing` is a radian yaw or a FACING_ROT compass name. Wall props are
        authored front-toward -Z, so "nz" (yaw 0) is a prop on the room's +Z
        wall looking back into the room.

        `collider` is the one place this differs from prop(). Set:
            None   -> the prop's OWN declared footprint, or nothing if it
                      declares none. A chair blocks; a notice board does not.
            False  -> force no collider, e.g. a chair tucked under a counter
                      the player is meant to walk past.
            tuple  -> an explicit (min_x, max_x, min_z, max_z), for a prop
                      pushed against geometry where its own box would overlap.

        `props` sets exported properties on the instanced prefab's ROOT node —
        the mechanism for a prop whose look is per-instance rather than baked,
        which in practice means anything carrying TEXT. A sign prop is one
        prefab and one baked mesh no matter how many different things it says,
        and that only works if the words come from the room file:

            r.model("ward_sign", (x, z), facing="pz", props={"text": "WARD B"})

        Only props whose prefab root carries a script with matching @export vars
        can accept these; setting one on a plain prefab is silently ignored by
        Godot, which is a real trap — check the prop's own .tscn if a value
        seems not to apply. Values may be str, bool, int/float, a 3-tuple
        (Vector3) or a 4-tuple (Color); see _prop_value().

        `text` overrides the words on a SIGN. The signage props each carry a
        Label3D with a baked default, so a sign works with no `text` at all; pass
        a string to change it, or a dict when the prop has more than one label:

            r.model("ward_sign", (x, z), facing="pz", text="WARD C \u2190")
            r.model("reg_notice", (x, z), text={"Header": "FIRE ROUTINE"})

        A wrong label name RAISES rather than being ignored. Godot silently
        accepts an override naming a child that does not exist — it simply never
        applies — so without this check a typo'd sign would ship reading
        whatever its default was, and look deliberate.

        A LIGHT-GATED PROP MAY NOT CARRY A COLLIDER, and the raise below is the
        same soft-lock guarantee block() spells out at length: darkness gates
        meshes and raycasts, never collision, so a dark room stays
        geometrically identical to a lit one.
        """
        if kind not in PROPS:
            raise ValueError(
                "unknown prop %r. Known: %s. If the kit has not been generated "
                "in this tree, run `python3 props/_gen/gen_props.py`."
                % (kind, ", ".join(sorted(PROPS)) or "(none — kit not generated)"))
        spec = PROPS[kind]
        yaw = _prop_yaw(facing)
        x, z = xz
        if y is None:
            if spec["mount"] == "ceiling":
                y = self.ceiling_y
            elif spec["mount"] == "wall":
                y = spec["mount_y"]
                if y is None:
                    raise ValueError(
                        "wall prop %r declares no mount_y, so `y` is required" % kind)
            else:
                y = 0.0

        # --- collision -------------------------------------------------------
        # THE PROP CARRIES ITS OWN COLLIDER NOW. props/<kind>.tscn emits a
        # StaticBody3D on layer 2 for any prop declaring a footprint, so the prop
        # blocks the player wherever it is placed — including dragged into a room
        # by hand in the editor, which is the whole reason it moved there.
        #
        # So this method's job is no longer "emit a collider"; it is "override
        # the prop's own when the room needs something different", done by
        # setting `collision_layer` on the prop's Body child:
        #     0 -> off          4 -> lucid-only        8 -> unmed-only
        # core/collision.gd derives the state filter from those bits, so a
        # state-gated prop needs NO separate solid() at all.
        #
        # Emitting a second, room-side collider on top of the prop's own would
        # double every footprint — harmless for the AABB test, which would get
        # the same answer twice, but it would quietly double what the orderly's
        # patrol-clearance validator counts and make the audit trail a lie.
        children = {}
        has_body = spec["collider"] is not None

        if light in ("lit", "dark") and has_body and collider is not False:
            raise ValueError(
                "light-gated prop %r at %r carries its own collider. The light "
                "axis gates meshes and raycasts ONLY, never collision — see "
                "core/light_object.gd and Room.block(). Pass collider=False to "
                "disable the prop's body, then author a solid() separately if "
                "the space genuinely needs blocking in both light states."
                % (kind, xz))

        if collider is False:
            if has_body:
                children.setdefault("Body", {})["collision_layer"] = 0
            collider = None
        elif collider is None:
            if has_body and state in ("lucid", "unmed"):
                # State-gate the prop's own body rather than adding a second one.
                children.setdefault("Body", {})["collision_layer"] = (
                    LAYER_LUCID if state == "lucid" else LAYER_UNMED)
            collider = None
        else:
            # An explicit rectangle overrides the prop's footprint entirely, so
            # its own body must go — otherwise the room gets both.
            if has_body:
                children.setdefault("Body", {})["collision_layer"] = 0

        # Sign text. Label parts are bare dicts (see props/_gen/defs_signage.py
        # on why they bypass part()), so the label NAMES come straight off the
        # prop declaration rather than a table here that could drift from it.
        labels = [q for q in spec["parts"]
                  if isinstance(q, dict) and q.get("type") == "label"]
        if text is not None:
            if not labels:
                raise ValueError("prop %r carries no label, so `text` means "
                                 "nothing. Signage props: %s"
                                 % (kind, ", ".join(sorted(
                                     k for k, v in PROPS.items()
                                     if any(isinstance(q, dict) and q.get("type") == "label"
                                            for q in v["parts"])))))
            if isinstance(text, str):
                if len(labels) != 1:
                    raise ValueError(
                        "prop %r has %d labels (%s) — pass a dict, not a string"
                        % (kind, len(labels), ", ".join(q["name"] for q in labels)))
                text = {labels[0]["name"]: text}
            known = {q["name"] for q in labels}
            for key in text:
                if key not in known:
                    raise ValueError("prop %r has no label named %r. It has: %s"
                                     % (kind, key, ", ".join(sorted(known))))

        for lname, ltext in (text or {}).items():
            children.setdefault(lname, {})["text"] = ltext

        nm = name or ("%s%d" % (_pascal(kind), len(self.models)))
        self.models.append({
            "kind": kind, "pos": (x, y, z), "yaw": yaw, "name": nm,
            "state": state, "level": level, "light": light,
            "props": dict(props) if props else None,
            "children": children or None,
        })
        if collider is not None:
            self.solid(collider[0], collider[1], collider[2], collider[3],
                       state=state, name="%s_col" % nm, level=level)
        return nm

    def prop_run(self, kind, axis, along_lo, along_hi, cross, facing=None,
                 y=None, state=None, level=None, light=None, name_fmt=None):
        """Repeat a 2m `run` prop end-to-end along a wall.

        This is the method that makes the kit worth having. Skirting, bumper
        rail and pipe run are authored as single 2m segments, and one call
        dresses a whole corridor: `r.prop_run("skirting", "z", -6, 5, -6.88)`
        puts skirting down 11m of the west wall. Segment count is derived from
        the prop's own X extent and the run is CENTRED on the span, so a run
        that does not divide evenly overhangs symmetrically rather than leaving
        a gap at one end.

        `cross` is the fixed coordinate — the wall FACE, which is wall_at +-
        0.12 since walls are 0.24 thick (the same arithmetic Room.shape_key's
        docstring spells out). `facing` defaults to the nearest wall.
        """
        if kind not in PROPS:
            raise ValueError("unknown prop %r" % kind)
        seg = PROPS[kind]["size"][0]
        span = float(along_hi) - float(along_lo)
        if span <= 0.0:
            raise ValueError("prop_run span must be positive, got %r" % span)
        n = max(1, int(round(span / seg)))
        centre = (float(along_lo) + float(along_hi)) / 2.0
        used = n * seg
        names = []
        for i in range(n):
            a = centre - used / 2.0 + seg * (i + 0.5)
            xz = (a, cross) if axis == "x" else (cross, a)
            if axis not in ("x", "z"):
                raise ValueError("prop_run axis must be 'x' or 'z', got %r" % axis)
            f = facing if facing is not None else self._nearest_wall_facing(xz[0], xz[1])
            nm = (name_fmt % i) if name_fmt else None
            names.append(self.model(kind, xz, facing=f, y=y, name=nm, state=state,
                                    level=level, light=light, collider=False))
        return names

    # Which prop pair each fitting style uses: (housing, light-gated lamp).
    # A pair, not one prop, so the breaker leaves the dead fitting behind — see
    # props/ceiling_troffer.tscn's header.
    FITTINGS = {
        "troffer": ("ceiling_troffer", "troffer_lamp"),
        "pendant": ("pendant_lamp", "pendant_bulb"),
    }

    def light_fitting(self, x, z, circuit=None, facing=0.0, kind="troffer"):
        """A ceiling light AND the fitting you can see it come out of.

        Room.light() emits an OmniLight3D plus a faked bounce and NOTHING
        VISIBLE — every light in the shipped ward is a glow with no lamp above
        it, which is the single biggest "this is untextured geometry" tell left
        in the build once the walls got their shaders. This is the one-call fix:
        light + housing + a light-gated glowing panel, so throwing the breaker
        leaves a dead fitting behind instead of an empty ceiling.

        `kind` picks the fitting style: "troffer" (the ward's standard recessed
        fluorescent) or "pendant" (a bare bulb on a flex, for the parts of the
        building that were patched rather than maintained).
        """
        if kind not in self.FITTINGS:
            raise ValueError("light_fitting kind must be one of %s, got %r"
                             % (sorted(self.FITTINGS), kind))
        housing, lamp = self.FITTINGS[kind]
        self.light(x, z, circuit=circuit)
        self.model(housing, (x, z), facing=facing)
        self.model(lamp, (x, z), facing=facing, light="lit")

    def _nearest_wall_facing(self, x, z):
        """Which way a wall-mounted prop at (x, z) should look: toward the room.

        Picks the CLOSEST of the four floor-rect walls. Deliberately not
        _resolve_facing(), which decides the axis from whichever fixture
        dimension is thinner — every wall prop in the kit is thin in Z by
        construction, so that heuristic would put a prop on an X wall facing
        along Z and bury its front face in the plaster.
        """
        min_x, max_x, min_z, max_z = self.floor
        d = {"px": x - min_x, "nx": max_x - x, "pz": z - min_z, "nz": max_z - z}
        return min(d, key=lambda k: d[k])

    def bed(self, xz, facing="ew", name=None):
        """room1's bed — `mat="bed"`, used nowhere else in the ward, and the
        ward's only instance of bedroom furniture. Reproduces the shipped
        footprint (2m along the headboard, 0.55m tall, 1m deep) via the same
        "collider is the mesh's XZ footprint" convention prop() encodes — a
        bed is just a prop with its own material name, so this is (almost) a
        one-line call to it.

        ALMOST: the shipped pos.y is 0.28, not the exact half-height 0.275 —
        someone hand-typed a 2-decimal round number instead of computing
        size.y/2, and the committed .tscn has that 0.005 baked into it. Since
        this pass's whole acceptance test is a byte-identical regenerate,
        that rounding is reproduced verbatim via prop()'s `y` override rather
        than "corrected" to the mathematically cleaner value — see prop()'s
        own docstring for why the override exists at all.

        `facing` picks which world axis the 2m headboard run sits on: "ew"
        (east-west — width along X, the shipped room1 orientation) or "ns"
        (north-south — width along Z), for a future room whose bed sits
        against a Z wall. The authored size stays the canonical (2, 0.55, 1)
        either way; this swaps X/Z like an interactable's canonical-size
        swap (`_canonical_size`), not a second hand-typed size tuple.
        """
        w, h, d = 2.0, 0.55, 1.0
        if facing == "ew":
            size = (w, h, d)
        elif facing == "ns":
            size = (d, h, w)
        else:
            raise ValueError("bed facing must be 'ew' or 'ns', got %r" % facing)
        self.prop(size, xz, name=name, mat="bed", y=0.28)

    def island(self, min_x, max_x, min_z, max_z, core_width, name=None):
        """The nurse-station / filing-island composite — room5's Nurse
        Station and room8's East Ward island, the ward's only two instances,
        and IDENTICAL down to every Y offset and every thickness; only the
        footprint and the raised core's along-width differ (1.8m in room5,
        1.6m in room8). Six nodes, one call:

            solid()  the ONE real footprint — the only thing an orderly's
                     loop routes around, and the only collider in the group
            block()  raised 'wall2' core counter, full height 2.0, y=1.0
            block() x4  'prop' ring skirt, height 1.1, y=0.55, thickness 0.5,
                     flush to the solid footprint's four edges

        The ring is MESH ONLY (like the core) — nothing pathfinds around its
        pieces individually, which is why one solid() beneath the lot is the
        only thing that needs to agree with the orderly's clearance math.

        `core_width` is the one number NOT derivable from the footprint (the
        core's height 2.0, depth 0.9 and y 1.0, and the ring's thickness 0.5,
        height 1.1 and y 0.55, are shipped-identical constants baked in
        below); everything else — including BOTH ring dimensions — comes out
        of (min_x, max_x, min_z, max_z) alone, because the ring is authored
        flush to the footprint on all four sides: the south/north pieces run
        the footprint's FULL width, the west/east pieces run HALF its depth
        (centred, not reaching the corners — confirmed against both shipped
        instances, not assumed for symmetry).
        """
        self.solid(min_x, max_x, min_z, max_z, name=name)
        cx, cz = (min_x + max_x) / 2.0, (min_z + max_z) / 2.0
        half_w, half_d = (max_x - min_x) / 2.0, (max_z - min_z) / 2.0
        self.block((core_width, 2.0, 0.9), (cx, 1.0, cz), "wall2")
        self.block((max_x - min_x, 1.1, 0.5), (cx, 0.55, cz + half_d - 0.25), "prop")
        self.block((max_x - min_x, 1.1, 0.5), (cx, 0.55, cz - half_d + 0.25), "prop")
        self.block((0.5, 1.1, half_d), (cx - half_w + 0.25, 0.55, cz), "prop")
        self.block((0.5, 1.1, half_d), (cx + half_w - 0.25, 0.55, cz), "prop")

    def shelf_row(self, x_centre, z_centre, length, height, thickness=0.8,
                 mat="wall2", name=None):
        """A shelving/storage run along X — room4's tall occluder unit and
        room7's three-row serpentine maze, four instances total. Depth
        (thickness along Z) is a CONSTANT 0.8 in every shipped shelf — only
        `length` (the X run) and `height` vary — and, exactly like prop(),
        the collider is the mesh's XZ footprint and pos.y = height / 2. This
        IS prop() under a different name and a different default material;
        kept as its own method because "shelving" and "furniture" read as
        different intents on the page even though the math is identical.
        """
        self.prop((length, height, thickness), (x_centre, z_centre), name=name, mat=mat)

    def railing(self, axis, along_lo, along_hi, cross, platform_y, thickness=0.24,
               collider=True, level=None, name=None):
        """A 0.9m-tall guard rail standing on a raised surface, at
        y = platform_y + 0.45 — the ONE fixed offset every railing in the
        ward uses (rooms 11, 17, 19_lights; eleven boxes total). `axis` is
        which world axis the run travels along ('x' or 'z'); `along_lo`/
        `along_hi` bound it on that axis; `cross` is its fixed position on
        the OTHER axis. Always `mat="chain"`.

        `collider` defaults to True, which derives a collider matching the
        mesh's own XZ footprint exactly — the convention room17's rail_x()
        closure and room19_lights's two rails both follow (in fact `railing`
        replaces room17's exact local helper).  Pass an explicit 4-tuple to
        widen the collider PAST the mesh: room11's RailWest is the one
        exception, one physics run covering the platform AND the ramp treads
        below it, even though the ramp's own rail segments (below) are drawn
        as short, unconnected boxes with no collider of their own. Pass
        collider=None/False for a mesh-only segment, which is exactly what
        those ramp segments need — a collider on every short run would be
        pure redundancy with RailWest's one wide collider underneath them.

        `level`, when given, tags the collider the way every railing over a
        stacked level must be (see WardCollision._level_tag_of): an untagged
        rail blocks on every level, which is catastrophic for a railing that
        floats over a lower storey (room17's header works this out in full).
        """
        if axis == "x":
            size = (along_hi - along_lo, 0.9, thickness)
            pos = ((along_lo + along_hi) / 2.0, platform_y + 0.45, cross)
            mesh_collider = (along_lo, along_hi,
                             cross - thickness / 2.0, cross + thickness / 2.0)
        elif axis == "z":
            size = (thickness, 0.9, along_hi - along_lo)
            pos = (cross, platform_y + 0.45, (along_lo + along_hi) / 2.0)
            mesh_collider = (cross - thickness / 2.0, cross + thickness / 2.0,
                             along_lo, along_hi)
        else:
            raise ValueError("railing axis must be 'x' or 'z', got %r" % axis)
        if collider is True:
            collider = mesh_collider
        elif collider is False:
            collider = None
        self.block(size, pos, "chain", collider=collider, name=name, level=level)

    def platform(self, min_x, max_x, min_z, max_z, platform_y, thickness=None,
                name=None):
        """A raised floor's own opaque slab, top face landing EXACTLY on
        `platform_y` — seven instances across three rooms (room11's
        MezzSlab, room17's four-piece gallery deck, room19_lights's
        PlatformSlab and LipSlab).

        DELIBERATELY NO COLLIDER, in every one of the seven — a collider here
        would wall the platform off instead of holding it up (a raised region
        is never a collider; what keeps a player up there is a railing,
        authored separately). Every call site this replaced carried that same
        comment by hand; it is restated here, in the ONE place, as the
        absence of a `collider` parameter at all — this preset structurally
        cannot emit one, which is a stronger guarantee than a comment.

        `thickness` defaults to `platform_y` itself: the slab then runs the
        full floor-to-platform column (room11's MezzSlab, room19_lights's two
        slabs — the platform sits directly over bare ground with nothing
        below it to leave room for). room17's gallery deck passes an explicit
        thin `thickness` (0.3m) instead, because its underside IS the
        pocket's ceiling 3.4m below — a full-height slab there would eat the
        pocket's own headroom. Either way the TOP face is exactly
        `platform_y`; only how far down the slab reaches changes.
        """
        thickness = platform_y if thickness is None else thickness
        size = (max_x - min_x, thickness, max_z - min_z)
        pos = ((min_x + max_x) / 2.0, platform_y - thickness / 2.0,
              (min_z + max_z) / 2.0)
        self.block(size, pos, "wall2", name=name)

    def stair_steps(self, n, platform_y, width, run, cross, start, axis="z",
                    name_fmt="Step%d", mat="wall2"):
        """PURELY COSMETIC stepped visual stand-ins for a ramp — eighteen
        boxes across three authorings (room11's four-piece RampStep, room17's
        six-piece east stair and five-piece west shaft, room19_lights's
        three-piece RampStep).

        A BoxMesh cannot tilt, so these are dumb stacked boxes that just READ
        as stairs. THE WALKABLE SLOPE IS A SEPARATE ramp() (or, for a
        two-level room, a stairwell()) CALL THAT THIS PRESET NEVER EMITS ON
        YOUR BEHALF — deliberately. Folding a ramp() call in here would be
        convenient right up until its numbers and this preset's silently
        diverged: nothing would catch a mismatch, because ramps/zones and
        their cosmetic dressing are two entirely separate systems (see room
        11's header — a raised region carries ZERO collision impact of its
        own; the walkable height comes from the ramp/zone data, never from
        what is drawn here). Author them side by side, as every existing room
        does, so both are visible in one diff if they ever need to move
        together.

        NO COLLIDERS, ever — a collider on a tread is a wall across the run.

        Step `i` (0-indexed) rises to `platform_y * (i+1) / n` and is centred
        `i * run` back from `start` along `axis`; `width` is the across-run
        size, `run` the per-step depth along the axis, `cross` the fixed
        position on the other axis. Every shipped instance uses axis='z' —
        'x' is supported for symmetry with railing()/stair geometry that
        climbs the other way, but has no shipped call site to verify against.
        """
        for i in range(n):
            top = platform_y * (i + 1) / n
            along = start - i * run
            if axis == "z":
                size = (width, top, run)
                pos = (cross, top / 2.0, along)
            elif axis == "x":
                size = (run, top, width)
                pos = (along, top / 2.0, cross)
            else:
                raise ValueError("stair_steps axis must be 'x' or 'z', got %r" % axis)
            self.block(size, pos, mat, name=name_fmt % i)

    def chain_barrier(self, xs, z, padlock_xz=None, height=2.7, thickness=0.06,
                      padlock_size=(0.22, 0.28, 0.14), padlock_y=1.05,
                      state="lucid"):
        """Hanging chain strands + a padlock: room3's exit chains, the ward's
        only chain_barrier — five 'chain' boxes, states='lucid', and NEVER a
        collider. This is the mechanic, not an oversight: "the chains are a
        hallucination, they never block anything" (room3's own comment) — the
        exit is truly locked by the DoorCollider room3.gd disables on the
        unmed-only beat, never by these.

        `xs` is a list of strand X positions (room3 authors four, evenly
        spaced, but nothing here assumes exactly four); each strand is a
        thin vertical box centred on WALL_Y (the standard wall midline, 1.5),
        NOT on its own half-height — a hanging chain's centre is where it is
        anchored, not where its mass sits, which is why this does not go
        through prop(). `padlock_xz`, if given, adds the stubby box that
        reads as the lock; room3 centres it under the strands.
        """
        for x in xs:
            self.block((thickness, height, thickness), (x, WALL_Y, z), "chain", state)
        if padlock_xz is not None:
            px, pz = padlock_xz
            self.block(padlock_size, (px, padlock_y, pz), "chain", state)

    def tv_panel(self, x, y, z, width, height, thickness=0.1, name=None):
        """A wall-mounted TV, endless static — 'glow' dressing only, no
        interactable and no collider. Three instances (room4's day-room set,
        room5's two waiting-room sets): width and height vary (1.3x0.9 vs
        1.1x0.8) but the material ('glow') and the thin flush-to-wall
        dimension (0.1) do not. `y` is an independently authored mount
        height in every instance — there is no formula for it, so unlike
        prop() this preset does not derive it.

        Every shipped TV is mounted on a wall_x wall (thin along Z); there is
        no wall_z-mounted instance to verify a swapped-axis version against,
        so this preset does not offer one — say so here rather than guess.
        """
        self.block((width, height, thickness), (x, y, z), "glow", name=name)

    def ward_lights(self, points, circuit=None):
        """Plural convenience over light() — see light()'s own docstring for
        the fitting/bounce pair it emits per call. THERE IS EXACTLY ONE
        LIGHTING PRESET IN THIS GAME: every one of the 366 fittings across
        all 21 rooms carries the identical fitting (Color(0.949,1.0,0.98,1),
        energy 0.95, range/attenuation from the room's light_range/
        light_attenuation, y 2.7 by default) plus bounce (Color(1.0,0.79,0.6,
        1), energy 0.3, range 2.6, attenuation 1.1, at floor_y_under(x,z) +
        0.22) pair, decided once — see the light-constants drift history at
        the top of this file — and never varied per-fixture. This helper
        exists ONLY so a room can author a list of points once instead of N
        separate light() calls; it must never grow a second lighting look.

        `points` is an iterable of (x, z) or (x, z, y) tuples — the 3-tuple
        form for a room with more than one floor height (room17,
        room19_lights), where a single default y would be wrong for some of
        the fittings.
        """
        for pt in points:
            if len(pt) == 3:
                x, z, y = pt
                self.light(x, z, y, circuit=circuit)
            else:
                x, z = pt
                self.light(x, z, circuit=circuit)


# --- emitter ---------------------------------------------------------------

class Emitter:
    def __init__(self, room):
        self.room = room
        self.ext = []       # (type, path, id, uid)
        self.sub = []       # (type, id, body_lines)
        self.nodes = []
        self._mesh_cache = {}
        self._shape_cache = {}
        self._mat_ids = {}
        self._phosphor_mat = None

    def mat(self, name):
        if name not in self._mat_ids:
            rid = "m_%s" % name
            self.ext.append(("Material", "res://materials/%s.tres" % name, rid,
                             "uid://wardbmat%s" % _uid_frag(name)))
            self._mat_ids[name] = rid
        return self._mat_ids[name]

    def fixture(self, itype):
        rid = "fx_%s" % itype
        if not any(e[2] == rid for e in self.ext):
            self.ext.append(("PackedScene", FIXTURES[itype]["path"], rid, None))
        return rid

    def prop_scene(self, kind):
        rid = "pk_%s" % kind
        if not any(e[2] == rid for e in self.ext):
            self.ext.append(("PackedScene", "res://props/%s.tscn" % kind, rid, None))
        return rid

    def box_mesh(self, size, mat):
        key = (round(size[0], 4), round(size[1], 4), round(size[2], 4), mat)
        if key not in self._mesh_cache:
            rid = "bm_%d" % len(self._mesh_cache)
            body = ["size = Vector3(%.4f, %.4f, %.4f)" % size]
            if mat:
                body.append('material = ExtResource("%s")' % self.mat(mat))
            self.sub.append(("BoxMesh", rid, body))
            self._mesh_cache[key] = rid
        return self._mesh_cache[key]

    def box_shape(self, size):
        key = (round(size[0], 4), round(size[1], 4), round(size[2], 4))
        if key not in self._shape_cache:
            rid = "bs_%d" % len(self._shape_cache)
            self.sub.append(("BoxShape3D", rid, ["size = Vector3(%.4f, %.4f, %.4f)" % size]))
            self._shape_cache[key] = rid
        return self._shape_cache[key]

    def node(self, line):
        self.nodes.append(line)

    def emit(self):
        r = self.room
        self.ext.append(("Script", "res://rooms/%s/%s" % (r.rid, r.script), "s_room", None))

        body = []
        body.append('[node name="Room" type="Node3D"]')
        body.append('script = ExtResource("s_room")')
        # THE LIGHT AXIS's opening state, read by main.gd's load_room off the
        # un-parented instance BEFORE add_child, so every LightObject in the
        # room sees the right value in its own _ready and the first frame is
        # already correct. Emitted only when a room asks for it — absent means
        # "opens lit", which is every room built before this axis existed.
        if r.start_dark:
            body.append("metadata/start_dark = true")
        body.append("")

        # spawn
        body.append('[node name="Spawn" type="Marker3D" parent="."]')
        body.append("transform = %s" % _xform_yaw(r.spawn[2], (r.spawn[0], 0.0, r.spawn[1])))
        # A stacked room spawns the player on a named level; everything else
        # gets the room's first (or synthetic '__flat') level. Read by
        # main.gd's load_room.
        if r.levels:
            body.append('metadata/level = "%s"' % r.levels[0][0])
        body.append("")

        # verticality
        body.extend(self._verticality_nodes())

        # floor + ceiling
        body.append('[node name="Shell" type="Node3D" parent="."]')
        body.append("")
        min_x, max_x, min_z, max_z = r.floor
        w, d = max_x - min_x, max_z - min_z
        cx, cz = (min_x + max_x) / 2.0, (min_z + max_z) / 2.0
        fm = self.box_mesh((w, 0.1, d), "floor")
        body.append('[node name="Floor" type="MeshInstance3D" parent="Shell"]')
        body.append("transform = %s" % _xform((cx, -0.05, cz)))
        body.append('mesh = SubResource("%s")' % fm)
        body.append("")
        cm = self.box_mesh((w, 0.1, d), "ceil")
        body.append('[node name="Ceiling" type="MeshInstance3D" parent="Shell"]')
        body.append("transform = %s" % _xform((cx, r.ceiling_y + 0.05, cz)))
        body.append('mesh = SubResource("%s")' % cm)
        body.append("")

        # geometry
        body.append('[node name="Geometry" type="Node3D" parent="."]')
        body.append("")
        wi = 0
        for size, pos, mat, state, collider, cname, wlevel, wlight in r.walls:
            wi += 1
            parent = "Geometry"
            nm = cname if cname else "W%d" % wi

            if state in ("lucid", "unmed"):
                # State-conditional geometry gets a StateObject wrapper so it
                # subscribes to StateManager.state_changed instead of being
                # toggled by a central group.
                aff = 1 if state == "lucid" else 2
                self._ensure_state_script()
                body.append('[node name="%s" type="Node3D" parent="Geometry"]' % nm)
                body.append('script = ExtResource("s_stateobj")')
                body.append("visible_in_state = %d" % aff)
                body.append("")
                parent = "Geometry/%s" % nm
                nm = "Body"

            if wlight in ("lit", "dark"):
                # block() has already refused a light-gated collider, so this
                # can only ever wrap a bare mesh — the light axis never reaches
                # a StaticBody3D.
                parent, nm = self._emit_light_wrapper(body, nm, parent, wlight)

            layer = LAYER_WORLD
            if state == "lucid":
                layer = LAYER_LUCID
            elif state == "unmed":
                layer = LAYER_UNMED

            if collider is not None:
                c_min_x, c_max_x, c_min_z, c_max_z = collider
                csize = (c_max_x - c_min_x, WALL_H, c_max_z - c_min_z)
                cpos = ((c_min_x + c_max_x) / 2.0, WALL_Y, (c_min_z + c_max_z) / 2.0)
                sh = self.box_shape(csize)
                body.append('[node name="%s" type="StaticBody3D" parent="%s"]' % (nm, parent))
                body.append("transform = %s" % _xform(cpos))
                body.append("collision_layer = %d" % layer)
                body.append("collision_mask = 0")
                # Stacked-level tag, read by WardCollision._level_tag_of.
                # Metadata rather than a collision-layer bit: level ids are
                # arbitrary room-local strings and a layer mask is 32 bits.
                # Emitted only when the room asked for one, so every existing
                # collider stays untagged and therefore active on all levels.
                if wlevel:
                    body.append('metadata/level = "%s"' % wlevel)
                body.append("")
                body.append('[node name="Shape" type="CollisionShape3D" parent="%s/%s"]' % (parent, nm))
                body.append('shape = SubResource("%s")' % sh)
                body.append("")
                if size is not None:
                    rel = (pos[0] - cpos[0], pos[1] - cpos[1], pos[2] - cpos[2])
                    self._emit_mesh(body, "Mesh", "%s/%s" % (parent, nm), size, rel, mat)
            elif size is not None:
                self._emit_mesh(body, nm, parent, size, pos, mat)

        # movers — runtime-driven walls (room 13's closing slabs). Same
        # Geometry parent as everything else so WardCollision.rebuild_from
        # picks them up like any other solid; the room script then keeps the
        # cached box in step with the transform it writes.
        for (mname, msize, mpos, mmat) in r.movers:
            sh = self.box_shape(msize)
            mm = self.box_mesh(msize, mmat)
            body.append('[node name="%s" type="AnimatableBody3D" parent="Geometry"]' % mname)
            body.append("transform = %s" % _xform(mpos))
            body.append("collision_layer = %d" % LAYER_WORLD)
            body.append("collision_mask = 0")
            body.append("sync_to_physics = false")
            body.append("")
            body.append('[node name="Shape" type="CollisionShape3D" parent="Geometry/%s"]' % mname)
            body.append('shape = SubResource("%s")' % sh)
            body.append("")
            body.append('[node name="Mesh" type="MeshInstance3D" parent="Geometry/%s"]' % mname)
            body.append('mesh = SubResource("%s")' % mm)
            body.append("")

        # push blocks — room 20's crate. See Room.push_block() for why the
        # collider sits on the body and the mesh + Interactable sit on a
        # separate `Visual` child the room script tweens.
        if r.push_blocks:
            self._ensure_interactable_script()
        for (pname, piid, pcx, pcz, psize, pheight, pmat, plabel) in r.push_blocks:
            cube = (psize, pheight, psize)
            sh = self.box_shape(cube)
            pm = self.box_mesh(cube, pmat)
            body.append('[node name="%s" type="AnimatableBody3D" parent="Geometry"]' % pname)
            body.append("transform = %s" % _xform((pcx, pheight / 2.0, pcz)))
            body.append("collision_layer = %d" % LAYER_WORLD)
            body.append("collision_mask = 0")
            body.append("sync_to_physics = false")
            body.append("")
            body.append('[node name="Shape" type="CollisionShape3D" parent="Geometry/%s"]' % pname)
            body.append('shape = SubResource("%s")' % sh)
            body.append("")
            body.append('[node name="Visual" type="Node3D" parent="Geometry/%s"]' % pname)
            body.append("")
            body.append('[node name="Mesh" type="MeshInstance3D" parent="Geometry/%s/Visual"]' % pname)
            body.append('mesh = SubResource("%s")' % pm)
            body.append("")
            body.append('[node name="%s" type="Area3D" parent="Geometry/%s/Visual"]' % (piid, pname))
            body.append("collision_layer = %d" % LAYER_INTERACTABLE)
            body.append("collision_mask = 0")
            body.append('script = ExtResource("s_interactable")')
            body.append('interactable_id = "%s"' % piid)
            body.append('interactable_type = "push_block"')
            body.append('label = "%s"' % plabel)
            body.append("")
            body.append('[node name="Shape" type="CollisionShape3D" parent="Geometry/%s/Visual/%s"]'
                        % (pname, piid))
            body.append('shape = SubResource("%s")' % sh)
            body.append("")

        # scrawls — always unmed-only, one wrapper for all of them
        if r.scrawls:
            self._ensure_state_script()
            body.append('[node name="Scrawls" type="Node3D" parent="."]')
            body.append('script = ExtResource("s_stateobj")')
            body.append("visible_in_state = 2")
            body.append("")
            for i, (text, pos, rot_y, size, sid, slight, ink) in enumerate(r.scrawls):
                nm = sid if sid else "Scrawl%d" % i
                parent = "Scrawls"
                if slight in ("lit", "dark"):
                    # Inside the Scrawls StateObject, not beside it: a gated
                    # scrawl is unmed-only AND light-filtered, and both have to
                    # agree. Keeps its own node name so find_child(id) — which
                    # main.update_scrawl_text uses — still resolves.
                    self._ensure_light_script()
                    body.append('[node name="%s_light" type="Node3D" parent="Scrawls"]' % nm)
                    body.append('script = ExtResource("s_lightobj")')
                    body.append("visible_in_light = %d" % (1 if slight == "lit" else 2))
                    body.append("")
                    parent = "Scrawls/%s_light" % nm
                phosphor_ink = ink == "phosphor"
                groups = ' groups=["%s"]' % PHOSPHOR_GROUP if phosphor_ink else ""
                body.append('[node name="%s" type="Label3D" parent="%s"%s]' % (nm, parent, groups))
                body.append("transform = %s" % _xform_yaw_roll(rot_y, _scrawl_tilt(text, pos), pos))
                # ScrawlDef.size was a canvas-texture scale in the TS build, not
                # a world measurement, so it does not port directly. At the
                # first-guess 0.0035 a size-3.4 scrawl rendered 1.5m PER LINE —
                # a two-line scrawl ran floor to ceiling. 0.0013 puts a line at
                # ~0.55m, which reads as graffiti and is still legible across a
                # room.
                body.append("pixel_size = %.4f" % (size * 0.0013))
                body.append('text = "%s"' % text.replace('"', '\\"').replace("\n", "\\n"))
                body.append('font = ExtResource("%s")' % self.scrawl_font())
                body.append("font_size = 128")
                # A dark ragged outline breaks up the clean vector edge of the
                # default font and reads as paint bleeding into plaster. It is
                # not a substitute for a proper hand-scrawled typeface, but it
                # takes a lot of the "computery" look off.
                body.append("outline_size = 14")
                if not phosphor_ink:
                    body.append("outline_modulate = Color(0.18, 0.05, 0.04, 0.85)")
                # Duller and less saturated than the old near-pure red, which
                # read as UI rather than something smeared on a wall.
                #
                # ink='phosphor' swaps it for pale glow-green, matching the
                # painted floor tiles' colour. PURELY COSMETIC — what makes a
                # phosphor scrawl invisible until the lights go out is its
                # light='dark' gate, not this. It also joins the phosphor group
                # above, so the room's charge/fade dial dims ink and floor
                # together instead of the paint outliving the writing.
                if phosphor_ink:
                    body.append("modulate = Color(0.749, 1.0, 0.788, 0.92)")
                    body.append("outline_modulate = Color(0.04, 0.13, 0.06, 0.85)")
                    body.append("metadata/phosphor_alpha = 0.92")
                else:
                    body.append("modulate = Color(0.62, 0.16, 0.12, 0.92)")
                # NEAREST filtering roughens the glyph edge instead of letting
                # it resolve to a crisp anti-aliased curve.
                body.append("texture_filter = 0")
                body.append("billboard = 0")
                body.append("shaded = false")
                body.append("double_sided = false")
                body.append("no_depth_test = false")
                body.append("")

        # interactables
        if r.interactables:
            body.append('[node name="Interactables" type="Node3D" parent="."]')
            body.append("")
            for (iid, itype, size, pos, mat, label, state, facing,
                 model_script, model_props, ilight) in r.interactables:
                parent = "Interactables"
                nm = iid
                if state in ("lucid", "unmed"):
                    self._ensure_state_script()
                    aff = 1 if state == "lucid" else 2
                    body.append('[node name="%s_state" type="Node3D" parent="Interactables"]' % iid)
                    body.append('script = ExtResource("s_stateobj")')
                    body.append("visible_in_state = %d" % aff)
                    body.append("")
                    parent = "Interactables/%s_state" % iid
                if ilight in ("lit", "dark"):
                    # Nests inside the state wrapper when both apply, same as
                    # geometry. Interactable.is_focusable() walks the whole
                    # ancestor chain looking for either kind of wrapper, so a
                    # light-gated fixture is refused by the interact ray as
                    # well as hidden — visibility alone would not do it,
                    # because an invisible Area3D is still raycastable.
                    self._ensure_light_script()
                    body.append('[node name="%s_light" type="Node3D" parent="%s"]' % (iid, parent))
                    body.append('script = ExtResource("s_lightobj")')
                    body.append("visible_in_light = %d" % (1 if ilight == "lit" else 2))
                    body.append("")
                    parent = "%s/%s_light" % (parent, iid)

                # Resolve which way the faceplate points, then author the
                # fixture in CANONICAL orientation (width X, height Y, depth Z,
                # face toward -Z) and rotate the whole node. The authored size
                # tuple encodes orientation — a wall-mounted fixture is thin on
                # whichever axis it hangs off — so it has to be swapped back to
                # canonical before use, or the rotation double-counts.
                face = _resolve_facing(size, pos, r.floor, facing)
                canon = _canonical_size(size, face)
                sh = self.box_shape(canon)
                body.append('[node name="%s" type="Area3D" parent="%s"]' % (nm, parent))
                body.append("transform = %s" % _xform_yaw(FACING_ROT[face], pos))
                body.append("collision_layer = %d" % LAYER_INTERACTABLE)
                body.append("collision_mask = 0")
                body.append('script = ExtResource("s_interactable")')
                body.append('interactable_id = "%s"' % iid)
                body.append('interactable_type = "%s"' % itype)
                body.append('label = "%s"' % label)
                body.append("")
                body.append('[node name="Shape" type="CollisionShape3D" parent="%s/%s"]' % (parent, nm))
                body.append('shape = SubResource("%s")' % sh)
                body.append("")
                # Real fixture model if one exists for this type, else fall
                # back to a plain box. The composite models are the whole
                # reason fixtures are identifiable against a textured wall —
                # a flat box reads as wall panelling, which is exactly the
                # complaint the three.js build's buildDispenser() comment
                # warns about.
                fx = FIXTURES.get(itype)
                if model_script is not None:
                    # A model that builds ITSELF, for fixtures whose look is
                    # per-instance (shape_key's shape+colour). Emitted as a bare
                    # Node3D carrying the script — no PackedScene and no scale
                    # factor, because the script is handed the real size and
                    # builds to it rather than being stretched to fit.
                    #
                    # `script` MUST come first: Godot applies these lines in
                    # order, and an exported property does not exist until the
                    # script that declares it is attached.
                    body.append('[node name="Model" type="Node3D" parent="%s/%s"]'
                                % (parent, nm))
                    body.append('script = ExtResource("%s")' % self.model_script(model_script))
                    body.append("fixture_size = Vector3(%.4f, %.4f, %.4f)" % canon)
                    for k in sorted((model_props or {}).keys()):
                        body.append("%s = %s" % (k, model_props[k]))
                    body.append("")
                elif fx is not None:
                    rid = self.fixture(itype)
                    base = fx["size"]
                    sc = (canon[0] / base[0], canon[1] / base[1], canon[2] / base[2])
                    body.append('[node name="Model" parent="%s/%s" instance=ExtResource("%s")]'
                                % (parent, nm, rid))
                    body.append("transform = %s" % _xform_scaled(sc, (0.0, 0.0, 0.0)))
                    body.append("")
                else:
                    m = self.box_mesh(canon, mat)
                    body.append('[node name="Mesh" type="MeshInstance3D" parent="%s/%s"]' % (parent, nm))
                    body.append('mesh = SubResource("%s")' % m)
                    body.append("")
            self._ensure_interactable_script()

        # icon panels — the shape-lock progress display. One Node3D per panel;
        # fixtures/icon_panel.gd builds the quad and bakes its texture, and the
        # room script rewrites it in place on each pickup (set_lit), the same
        # way main.update_scrawl_text rewrites a Label3D. No collider, no
        # Interactable, no state filter: it reads in both ward states.
        if r.icon_panels:
            self._ensure_icon_panel_script()
            body.append('[node name="IconPanels" type="Node3D" parent="."]')
            body.append("")
            for (pid, shapes, colors, pos, rot_y, size) in r.icon_panels:
                body.append('[node name="%s" type="Node3D" parent="IconPanels"]' % pid)
                body.append("transform = %s" % _xform_yaw(rot_y, pos))
                # script first — an exported property does not exist before it.
                body.append('script = ExtResource("s_iconpanel")')
                body.append("shapes = %s" % _string_array(shapes))
                # A PackedColorArray serialises as a FLAT list of components,
                # not as a list of Color() literals.
                body.append("colors = PackedColorArray(%s)"
                            % ", ".join(", ".join("%.4f" % v for v in c) for c in colors))
                body.append("panel_size = %.4f" % size)
                body.append("")

        # prop kit — handcrafted set dressing, instanced from props/<kind>.tscn
        #
        # ONE flat Props group, not a group per kind: the room script never
        # addresses these (they carry no id, no interaction and no behaviour),
        # so a hierarchy would buy nothing and would make node paths depend on
        # authoring order. Colliders for the props that carry one were already
        # pushed through Room.solid() at author time, so they are in Geometry
        # with every other collider rather than being a second, parallel
        # collision system nobody would think to check.
        #
        # Gating nests exactly as it does for a wall — StateObject OUTSIDE,
        # LightObject INSIDE — because Godot hides a whole subtree when an
        # ancestor is invisible, so both filters have to agree for the prop to
        # draw. See Emitter._emit_light_wrapper().
        if r.models:
            body.append('[node name="Props" type="Node3D" parent="."]')
            body.append("")
            for m in r.models:
                kind, pos, yaw, nm = m["kind"], m["pos"], m["yaw"], m["name"]
                state, level, mlight = m["state"], m["level"], m["light"]
                mprops, mchildren = m["props"], m["children"]
                rid = self.prop_scene(kind)
                parent = "Props"
                if state in ("lucid", "unmed"):
                    self._ensure_state_script()
                    body.append('[node name="%s_state" type="Node3D" parent="Props"]' % nm)
                    body.append('script = ExtResource("s_stateobj")')
                    body.append("visible_in_state = %d" % (1 if state == "lucid" else 2))
                    body.append("")
                    parent = "Props/%s_state" % nm
                if mlight in ("lit", "dark"):
                    self._ensure_light_script()
                    body.append('[node name="%s_light" type="Node3D" parent="%s"]' % (nm, parent))
                    body.append('script = ExtResource("s_lightobj")')
                    body.append("visible_in_light = %d" % (1 if mlight == "lit" else 2))
                    body.append("")
                    parent = "%s/%s_light" % (parent, nm)
                body.append('[node name="%s" parent="%s" instance=ExtResource("%s")]'
                            % (nm, parent, rid))
                body.append("transform = %s" % _xform_yaw(yaw, pos))
                # Sorted, so the emitted scene does not depend on dict order.
                for k in sorted(mprops or {}):
                    body.append("%s = %s" % (k, _prop_value(mprops[k])))
                if level is not None:
                    body.append('metadata/level = "%s"' % level)
                body.append("")
                # Property overrides on children INSIDE the instanced prefab —
                # sign text, and the collider layer. Each needs its own [node]
                # block naming the child with the instance as its parent. Sorted
                # at both levels so the emitted scene is deterministic.
                for cname in sorted(mchildren or {}):
                    body.append('[node name="%s" parent="%s/%s"]'
                                % (cname, parent, nm))
                    for key in sorted(mchildren[cname]):
                        body.append("%s = %s"
                                    % (key, _prop_value(mchildren[cname][key])))
                    body.append("")

        # lights
        if r.lights:
            body.append('[node name="Lights" type="Node3D" parent="."]')
            body.append("")
            for i, (x, y, z, circuit) in enumerate(r.lights):
                # Shadows are the single biggest realism lever available in the
                # Compatibility renderer — without them nothing is occluded, so
                # every object floats and the whole ward reads flat and
                # cartoonish regardless of material quality.
                #
                # Range is tightened 12 -> 7m and energy raised 0.7 -> 0.95 to
                # get the concept art's look: a bright pool under each fitting
                # falling off to near-black, rather than a uniform wash. Ambient
                # was dropped to 0.08 to match, so the lights do the work.
                #
                # omni_attenuation 1.4 -> 1.7, range 7 -> 9.
                #
                # A room-1 audit found that standing almost directly under a
                # fitting (~1.5m, which several spawn/doorway points do) blew
                # the nearby wall out to a legible olive-grey wash: Godot's omni
                # falloff is pow(distance, -attenuation) windowed by range, and
                # at low attenuation the near-field barely rolls off. That audit
                # first pushed attenuation to 2.6 with range 6, which fixed
                # room 1 and BROKE every large room — at that exponent almost
                # nothing reached the floor of a 12x12 hall, leaving room 4 as
                # bare ceiling smears on black.
                #
                # 1.7/9.0 was the compromise that held both: still noticeably
                # tighter than 1.4 up close, but with enough reach that a hall
                # resolves.
                #
                # A LATER pass went further still and settled on 6.0/2.3, but
                # only in the seven shipped .tscn files — this generator kept
                # emitting 9.0/1.7 for months, so `python3 tools/gen_rooms.py`
                # silently relit the entire ward. The constants at the top of
                # this file now hold the shipped 6.0/2.3, which is what room 12
                # (74m north-south, the biggest room in the game, and the one
                # most exposed to a range cut) was generated and screenshotted
                # against. Check a LARGE room, not just room 1, before touching
                # them.
                body.append('[node name="L%d" type="OmniLight3D" parent="Lights"]' % i)
                body.append("transform = %s" % _xform((x, y, z)))
                # THE LIGHT AXIS's per-light OWNER. Emitted only when a room
                # names one, so every previously generated room is unchanged
                # and falls back to Atmosphere's default "house" circuit, which
                # nothing switches. See core/atmosphere.gd's CIRCUITS block for
                # why the owner is an authored string and not an index or a
                # node name (both are rebuilt/renumbered by generation and by
                # every room reload; a string is not).
                if circuit:
                    body.append('metadata/circuit = "%s"' % circuit)
                body.append("light_color = Color(0.949, 1.0, 0.98, 1)")
                body.append("light_energy = 0.95")
                body.append("omni_range = %.1f" % r.light_range)
                body.append("omni_attenuation = %.1f" % r.light_attenuation)
                # Shadows on EVERY light cost 40% frame time (10.9 -> 6.5 fps
                # measured): an omni shadow is a 6-face cube render, and rooms
                # carry up to 8 lights. Only every third fitting casts, which is
                # both affordable and closer to the concept art — those rooms are
                # lit by one dominant source with the rest as fill, not by an
                # even grid of shadow-casters.
                body.append("shadow_enabled = %s" % ("true" if (i % 3 == 0 or i in r.shadow_extra) else "false"))
                # Omni shadows are a cube render per light; bias tuned to kill
                # acne on the 0.24m-thick walls without visible peter-panning.
                body.append("shadow_bias = 0.04")
                body.append("shadow_normal_bias = 1.4")
                body.append("")

                # Faked bounce: a small, dim, warm OmniLight3D sitting just off
                # the floor directly under the fitting. Real GI is not
                # available here (see the shader headers: no sky, no probes;
                # AreaLight3D's shadow_enabled is a silent no-op in
                # Compatibility, so it was rejected for the fittings
                # themselves). This is the cheap substitute the brief calls
                # for: it does not simulate light bouncing off the floor, it
                # just plants a second, low, warm source that READS as if the
                # floor were kicking light back up — which is what sells
                # "pooled light" at this fidelity. Warm-shifted relative to
                # the cool-white fitting colour so it reads as bounced/
                # absorbed light, not a second ceiling lamp. No shadow (a
                # shadow-casting light at floor height would self-shadow into
                # every nearby leg/prop) and a short, soft range so it stays a
                # local pool and never lights a whole room on its own —
                # light_scale/flicker still apply (it is just another
                # OmniLight3D under "Lights"), so it dims and buzzes with the
                # fitting above it instead of staying eerily constant.
                # Bounce Y is RELATIVE TO THE FLOOR UNDER THE FITTING, not a
                # hardcoded 0.22. Rooms 11 and 17 both hit this: a fitting above
                # a raised zone or a gallery deck dropped its bounce onto the
                # storey BELOW, so the raised floor got no bounce at all and the
                # floor beneath collected unauthored warm pools it was never lit
                # with. Flat rooms are unaffected — floor_y_under returns 0.0,
                # which reproduces the old constant exactly.
                body.append('[node name="L%d_bounce" type="OmniLight3D" parent="Lights"]' % i)
                body.append("transform = %s" % _xform((x, r.floor_y_under(x, z) + 0.22, z)))
                # Same circuit as the fitting it belongs to: killing a fixture
                # while its fake floor bounce kept burning would read as a
                # glowing floor under a dead lamp.
                if circuit:
                    body.append('metadata/circuit = "%s"' % circuit)
                body.append("light_color = Color(1.0, 0.79, 0.6, 1)")
                body.append("light_energy = 0.3")
                body.append("omni_range = 2.6")
                body.append("omni_attenuation = 1.1")
                body.append("shadow_enabled = false")
                body.append("")

        # triggers — plain Nodes, NOT Area3Ds: containment is a strict
        # point-in-rect test on the body's XZ run every frame by
        # core/trigger_poll.gd, not a physics overlap. See trigger_volume.gd.
        if r.triggers:
            self._ensure_trigger_script()
            body.append('[node name="Triggers" type="Node3D" parent="."]')
            body.append("")
            for (tid, t_min_x, t_max_x, t_min_z, t_max_z, state) in r.triggers:
                body.append('[node name="%s" type="Node" parent="Triggers"]' % tid)
                body.append('script = ExtResource("s_trigger")')
                body.append('trigger_id = "%s"' % tid)
                body.append("min_x = %.4f" % t_min_x)
                body.append("max_x = %.4f" % t_max_x)
                body.append("min_z = %.4f" % t_min_z)
                body.append("max_z = %.4f" % t_max_z)
                # TriggerVolume.States mirrors StateObject.Affinity: 0/1/2.
                if state in ("lucid", "unmed"):
                    body.append("states = %d" % (1 if state == "lucid" else 2))
                body.append("")

        # exits
        body.append('[node name="Exits" type="Node3D" parent="."]')
        body.append("")
        self._ensure_exit_script()
        for i, (to, e_min_x, e_max_x, e_min_z, e_max_z) in enumerate(r.exits):
            esize = (e_max_x - e_min_x, 3.0, e_max_z - e_min_z)
            epos = ((e_min_x + e_max_x) / 2.0, 1.5, (e_min_z + e_max_z) / 2.0)
            sh = self.box_shape(esize)
            body.append('[node name="Exit%d" type="Area3D" parent="Exits"]' % i)
            body.append("transform = %s" % _xform(epos))
            body.append("collision_layer = %d" % LAYER_TRIGGER)
            body.append("collision_mask = %d" % 1)
            body.append('script = ExtResource("s_exit")')
            body.append('exit_to = "%s"' % to)
            body.append("")
            body.append('[node name="Shape" type="CollisionShape3D" parent="Exits/Exit%d"]' % i)
            body.append('shape = SubResource("%s")' % sh)
            body.append("")

        return self._header() + "\n".join(body) + "\n"

    def _verticality_nodes(self):
        """The room's floor-height data, as metadata on one dataless node.

        Verticality has no geometry and no collision of its own, so unlike a
        wall it is not expressible as a node with a shape — it is pure data
        that core/levels.gd reads on room load. Metadata keeps it visible and
        editable in the inspector after generation, which is the same bargain
        the rest of this generator makes (the .tscn is the source of truth
        once written).

        Emitted ONLY when a room actually declares verticality, so every room
        that does not is byte-for-byte what it was before this existed and
        resolves to the implicit flat level.
        """
        r = self.room
        if not r.has_verticality():
            return []

        self._validate_verticality()

        out = ['[node name="Verticality" type="Node3D" parent="."]']
        out.append("metadata/ceiling_y = %s" % _num(r.ceiling_y))

        if r.levels:
            # TIER 2 — explicit stacked levels. Their zones/ramps are scoped
            # to the level, so the room-wide tier-1 lists are not emitted.
            entries = []
            for lid, base_y, floor, zones, ramps in r.levels:
                entries.append(
                    '{"id": "%s", "base_y": %s, "floor": %s, "zones": %s, "ramps": %s}'
                    % (lid, _num(base_y), _rect(floor), _zones(zones), _ramps(ramps)))
            out.append("metadata/levels = [%s]" % ", ".join(entries))
        else:
            # TIER 1 — folded into the synthetic '__flat' level at load.
            if r.height_zones:
                out.append("metadata/zones = %s" % _zones(r.height_zones))
            if r.ramps:
                out.append("metadata/ramps = %s" % _ramps(r.ramps))

        if r.stairwells:
            entries = []
            for s in r.stairwells:
                entries.append(
                    '{"id": "%s", "min_x": %s, "max_x": %s, "min_z": %s, "max_z": %s, '
                    '"axis": "%s", "y_low": %s, "level_at_low": "%s", '
                    '"y_high": %s, "level_at_high": "%s"}'
                    % (s["id"], _num(s["min_x"]), _num(s["max_x"]),
                       _num(s["min_z"]), _num(s["max_z"]), s["axis"],
                       _num(s["y_low"]), s["level_at_low"],
                       _num(s["y_high"]), s["level_at_high"]))
            out.append("metadata/stairwells = [%s]" % ", ".join(entries))

        out.append("")
        return out

    def _validate_verticality(self):
        """Authoring checks. Warnings, not errors — the generator's job is to
        emit what was asked for, and a half-built room in progress should
        still generate. check_rooms.gd is the hard gate."""
        r = self.room
        ids = [lvl[0] for lvl in r.levels]

        for lvl in r.levels:
            lid, base_y = lvl[0], lvl[1]
            # ROOM_AUTHORING.md §8: a level with much less than ~1m of
            # clearance over standing eye height reads as a crawlspace, not a
            # storey. The trip point is 0.95 rather than a hard 1.0 because
            # the recommendation is "~1m" and room 17's own design lands at
            # 0.98 by intent — warning on the canonical case would be noise.
            head = r.ceiling_y - base_y - EYE_HEIGHT
            if head < 0.95:
                _warn("%s: level '%s' has %.2fm headroom (ceiling_y %.2f - base_y "
                      "%.2f - eye %.2f); want ~1.0m — raise ceiling_y"
                      % (r.rid, lid, head, r.ceiling_y, base_y, EYE_HEIGHT))

        for s in r.stairwells:
            if s["axis"] not in ("x", "z"):
                _warn("%s: stairwell '%s' axis must be 'x' or 'z', got %r"
                      % (r.rid, s["id"], s["axis"]))
            span = (s["max_x"] - s["min_x"]) if s["axis"] == "x" else (s["max_z"] - s["min_z"])
            if span <= 0:
                _warn("%s: stairwell '%s' has a zero/negative span along its own "
                      "axis — the level flip can never fire" % (r.rid, s["id"]))
            if s["level_at_low"] == s["level_at_high"]:
                _warn("%s: stairwell '%s' connects level '%s' to itself"
                      % (r.rid, s["id"], s["level_at_low"]))
            if ids:
                for end in ("level_at_low", "level_at_high"):
                    if s[end] not in ids:
                        _warn("%s: stairwell '%s' %s='%s' names no declared level %s"
                              % (r.rid, s["id"], end, s[end], ids))
            elif s["level_at_low"] != "__flat" or s["level_at_high"] != "__flat":
                _warn("%s: stairwell '%s' names levels but the room declares none"
                      % (r.rid, s["id"]))

        tagged = {w[6] for w in r.walls if w[6]}
        for t in sorted(tagged):
            if ids and t not in ids:
                _warn("%s: collider tagged level '%s', which is not a declared "
                      "level %s — it will be inert" % (r.rid, t, ids))

    def scrawl_font(self):
        if not any(e[2] == "f_scrawl" for e in self.ext):
            self.ext.append(("FontFile", "res://fonts/RockSalt-Regular.ttf",
                             "f_scrawl", None))
        return "f_scrawl"

    def _ensure_state_script(self):
        if not any(e[2] == "s_stateobj" for e in self.ext):
            self.ext.append(("Script", "res://core/state_object.gd", "s_stateobj", None))

    def _ensure_light_script(self):
        if not any(e[2] == "s_lightobj" for e in self.ext):
            self.ext.append(("Script", "res://core/light_object.gd", "s_lightobj", None))

    def phosphor_material(self):
        """The room's glow-in-the-dark paint, as a LOCAL-TO-SCENE sub-resource.

        Not an ext_resource in materials/, and that is the whole point:
        main.set_glow_fade writes this material's alpha at runtime (room 16's
        charge/fade dial), and a shared .tres would carry that write into the
        next room to use mat='phosphor' — the exact leak the Three.js build
        avoided by cloning MATERIALS.phosphor once per room
        (src/game/world.ts's phosphorBlockMats). resource_local_to_scene gives
        each INSTANCE of this room scene its own copy, so the clone-per-room
        property holds by construction and two rooms instanced at once in a
        headless test cannot fight over one alpha.

        Unshaded for the same reason every 'glow' block is: paint that is only
        visible in the dark must not itself be dimmed by the dark. What decides
        whether it is SEEN is the light='dark' gate, never this material.
        """
        if self._phosphor_mat is None:
            rid = "phosphor_mat"
            self.sub.append(("StandardMaterial3D", rid, [
                "resource_local_to_scene = true",
                "shading_mode = 0",
                "transparency = 1",
                "albedo_color = Color(0.749, 1.0, 0.788, 1)",
                "roughness = 0.9",
            ]))
            self._phosphor_mat = rid
        return self._phosphor_mat

    def _emit_mesh(self, body, nm, parent, size, pos, mat):
        """One MeshInstance3D, with the phosphor special-case folded in."""
        groups = ' groups=["%s"]' % PHOSPHOR_GROUP if mat == "phosphor" else ""
        m = self.box_mesh(size, None if mat == "phosphor" else mat)
        body.append('[node name="%s" type="MeshInstance3D" parent="%s"%s]' % (nm, parent, groups))
        body.append("transform = %s" % _xform(pos))
        body.append('mesh = SubResource("%s")' % m)
        if mat == "phosphor":
            body.append('material_override = SubResource("%s")' % self.phosphor_material())
            body.append("metadata/phosphor_alpha = 1.0")
        body.append("")

    def _emit_light_wrapper(self, body, nm, parent, light):
        """A core/light_object.gd wrapper node. Returns (parent, child_name).

        Mirrors the StateObject wrapper exactly, and NESTS INSIDE it when a
        thing is gated on both axes (StateObject > LightObject > mesh), which
        is what makes the two filters compose instead of one overwriting the
        other: Godot hides a whole subtree when an ancestor is invisible, so
        both have to agree for anything to draw.
        """
        self._ensure_light_script()
        wrapper = nm if nm != "Body" else "Light"
        body.append('[node name="%s" type="Node3D" parent="%s"]' % (wrapper, parent))
        body.append('script = ExtResource("s_lightobj")')
        body.append("visible_in_light = %d" % (1 if light == "lit" else 2))
        body.append("")
        return ("%s/%s" % (parent, wrapper), "Body")

    def _ensure_interactable_script(self):
        if not any(e[2] == "s_interactable" for e in self.ext):
            self.ext.append(("Script", "res://core/interactable.gd", "s_interactable", None))

    def model_script(self, path):
        """Register a self-building fixture model script, e.g.
        res://fixtures/shape_key.gd -> ext id s_model_shape_key."""
        rid = "s_model_%s" % os.path.splitext(os.path.basename(path))[0]
        if not any(e[2] == rid for e in self.ext):
            self.ext.append(("Script", path, rid, None))
        return rid

    def _ensure_icon_panel_script(self):
        if not any(e[2] == "s_iconpanel" for e in self.ext):
            self.ext.append(("Script", "res://fixtures/icon_panel.gd", "s_iconpanel", None))

    def _ensure_trigger_script(self):
        if not any(e[2] == "s_trigger" for e in self.ext):
            self.ext.append(("Script", "res://core/trigger_volume.gd", "s_trigger", None))

    def _ensure_exit_script(self):
        if not any(e[2] == "s_exit" for e in self.ext):
            self.ext.append(("Script", "res://core/room_exit.gd", "s_exit", None))

    def _header(self):
        steps = len(self.ext) + len(self.sub) + 1
        out = ['[gd_scene load_steps=%d format=3 uid="uid://wardbroom%s"]' % (steps, _uid_frag(self.room.rid)), ""]
        for (etype, path, rid, uid) in self.ext:
            if uid:
                out.append('[ext_resource type="%s" uid="%s" path="%s" id="%s"]' % (etype, uid, path, rid))
            else:
                out.append('[ext_resource type="%s" path="%s" id="%s"]' % (etype, path, rid))
        out.append("")
        for (stype, rid, lines) in self.sub:
            out.append('[sub_resource type="%s" id="%s"]' % (stype, rid))
            out.extend(lines)
            out.append("")
        return "\n".join(out) + "\n"


# --- verticality serialisation helpers -------------------------------------
#
# These render Godot Variant literals into the .tscn's metadata lines. Floats
# always carry a decimal point: Godot's parser types a bare `3` as int, and
# core/levels.gd's float() conversions would still work but the inspector
# would show the wrong type and an editor round-trip would rewrite it.

def _num(v):
    return "%.4f" % float(v)


def _color(spec):
    """'#3fa9dd' (or an (r,g,b[,a]) tuple of 0..1 floats) -> (r, g, b, a).

    Hex, because that is what the room specs and the Three.js kit are written
    in — a room author should never be converting colours by hand.
    """
    if isinstance(spec, (tuple, list)):
        vals = [float(v) for v in spec]
        return tuple(vals + [1.0] * (4 - len(vals)))
    s = str(spec).lstrip("#")
    if len(s) == 3:
        s = "".join(ch * 2 for ch in s)
    if len(s) != 6:
        raise ValueError("bad colour %r — want '#rrggbb'" % spec)
    return (int(s[0:2], 16) / 255.0, int(s[2:4], 16) / 255.0,
            int(s[4:6], 16) / 255.0, 1.0)


def _color_literal(spec):
    return "Color(%.4f, %.4f, %.4f, %.4f)" % _color(spec)


def _string_array(items):
    return "PackedStringArray(%s)" % ", ".join('"%s"' % s for s in items)


def _rect(rect):
    return "[%s]" % ", ".join(_num(v) for v in rect)


def _zones(zones):
    return "[%s]" % ", ".join(
        "[%s, %s, %s, %s, %s]" % tuple(_num(v) for v in z) for z in zones)


def _ramps(ramps):
    # (min_x, max_x, min_z, max_z, axis, y_low, y_high) — axis is a string, so
    # this cannot go through the all-floats path above.
    return "[%s]" % ", ".join(
        '[%s, %s, %s, %s, "%s", %s, %s]'
        % (_num(a), _num(b), _num(c), _num(d), ax, _num(lo), _num(hi))
        for (a, b, c, d, ax, lo, hi) in ramps)


def _warn(msg):
    sys.stderr.write("gen_rooms: WARNING: %s\n" % msg)


def _xform(pos):
    return "Transform3D(1, 0, 0, 0, 1, 0, 0, 0, 1, %.4f, %.4f, %.4f)" % pos


def _xform_scaled(scale, pos):
    return "Transform3D(%.5f, 0, 0, 0, %.5f, 0, 0, 0, %.5f, %.4f, %.4f, %.4f)" % (
        scale[0], scale[1], scale[2], pos[0], pos[1], pos[2])


def _scrawl_tilt(text, pos):
    """A small deterministic roll per scrawl, in radians.

    Perfectly horizontal text is the single most "computery" thing about the
    scrawls — nobody writes level on a wall, least of all whoever wrote these.
    Derived from a hash of the content and position so it is stable across
    regenerates (a random tilt that moved every build would be maddening) and
    so no two scrawls in a room share an angle.
    """
    h = 0
    for ch in (text + str(pos)):
        h = (h * 131 + ord(ch)) & 0xFFFFFFF
    # -7..+7 degrees, avoiding near-zero so every scrawl is visibly off-level.
    deg = (h % 1000) / 1000.0 * 10.0 + 2.0
    if h & 1:
        deg = -deg
    return math.radians(deg)


def _xform_yaw_roll(yaw, roll, pos):
    """Yaw about world Y (which wall it is on) composed with a roll about the
    text's own facing axis (how crooked it is). R = Ry(yaw) . Rz(roll),
    emitted row-major to match Godot's 12-arg Transform3D."""
    cy, sy = math.cos(yaw), math.sin(yaw)
    cr, sr = math.cos(roll), math.sin(roll)
    return ("Transform3D(%.6f, %.6f, %.6f, %.6f, %.6f, %.6f, %.6f, %.6f, %.6f, "
            "%.4f, %.4f, %.4f)") % (
        cy * cr, -cy * sr, sy,
        sr, cr, 0.0,
        -sy * cr, sy * sr, cy,
        pos[0], pos[1], pos[2])


def _xform_yaw(yaw, pos):
    # Godot's 12-arg Transform3D takes the basis TRANSPOSED from the obvious
    # reading: the first three numbers are not the world-space X axis.
    # Getting this backwards silently rotates every asymmetric fixture by 180
    # degrees, which is invisible for the 0 and pi cases (a box is symmetric)
    # and only shows up at +-pi/2 — room 2's keypad rendered as a featureless
    # slab because its keys were pointing into the wall. Side-wall scrawls
    # have the same failure mode, and they are the unmedicated clue text.
    c, s = math.cos(yaw), math.sin(yaw)
    return "Transform3D(%.6f, 0, %.6f, 0, 1, 0, %.6f, 0, %.6f, %.4f, %.4f, %.4f)" % (
        c, s, -s, c, pos[0], pos[1], pos[2])


def write_room(room):
    d = os.path.join(OUT_ROOT, "rooms", room.rid)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "%s.tscn" % room.rid), "w") as f:
        f.write(Emitter(room).emit())
    print("wrote rooms/%s/%s.tscn" % (room.rid, room.rid))


# --- ROOM 1 — the Cell -----------------------------------------------------
# Tutorial: states change the world, and where pills come from. Player wakes
# unmedicated, cannot shift, and there is no door until the pill is taken.

def room1():
    r = Room("room1", "the Cell",
             floor=(-3, 3, -2, 6),
             spawn=(0, 4, math.pi),
             exits=[("room2", -1, 1, -1.9, -0.9)])

    # cell shell, x [-3,3] z [0,6]
    r.wall_x(-3, 3, 6)            # south
    r.wall_z(0, 6, -3)            # west
    r.wall_z(0, 6, 3)             # east
    r.wall_x(-3, -1, 0)           # north, west of doorway gap
    r.wall_x(1, 3, 0)             # north, east of doorway gap

    # THE BEAT: doorway blocker exists only while unmedicated.
    # "there is no door until the pill is taken."
    r.block((2, 3, 0.26), (0, 1.5, 0), "wall", "unmed",
            collider=(-1, 1, -0.13, 0.13))

    # vestibule beyond the doorway, x [-1,1] z [-2,0]
    r.wall_z(-2, 0, -1)
    r.wall_z(-2, 0, 1)
    r.wall_x(-1, 1, -2)           # caps the vestibule
    r.block((1.8, 2.6, 0.06), (0, 1.4, -1.84), "glow")  # warm glow beyond

    # props
    #
    # The box bed is REPLACED by the prop-kit ward_bed — rusted tubular frame,
    # barred head and foot, thin stained ticking. This is the first room a
    # player sees, and a grey box was doing the concept art's dormitory plate no
    # favours. `facing="px"` puts the HEAD against the east wall (see the mount
    # note in props/ward_bed.tscn: the head is at -Z, and a "px" yaw maps -Z to
    # +X), so the bed runs east-west exactly as the box did.
    #
    # The nightstand stays a plain box on purpose: the paper cup is authored at
    # y 0.92 relative to it, and swapping in bedside_cabinet would move the one
    # interactable this room's whole opening beat depends on.
    r.model("ward_bed", (1.85, 4.6), facing="px")
    r.prop((1, 0.8, 0.7), (-2.2, 4.7))

    # Set dressing. A cell is SPARSE — the temptation with 53 props available is
    # to fill it, and that would be wrong: room 1 is meant to read as bare and
    # oppressive, and every object here has to earn its place against that.
    r.prop_run("skirting", "x", -3, 3, 5.88)
    r.prop_run("skirting", "z", 0, 6, -2.88)
    r.prop_run("skirting", "z", 0, 6, 2.88)

    # Directly ahead at spawn (which faces +Z), because the concept art composes
    # every room around a barred window and this is the player's first frame.
    r.model("barred_window", (0, 5.88), facing="nz")
    r.model("radiator", (-2.88, 2.2), facing="px")
    r.model("sink", (-2.88, 1.15), facing="px")
    r.model("door_plate", (-1.9, 0.12), facing="pz", text="B-14")

    # Decay, kept to two pieces. The rubble sits in the west corner, out of the
    # walk line from spawn to the doorway.
    r.model("missing_ceiling_tile", (-1.6, 3.4))
    r.model("plaster_rubble", (-2.55, 3.5))

    r.scrawl("don't\nswallow", (-2.85, 1.8, 4.7), math.pi / 2, 2.2)
    r.scrawl("there was a door\nhere once", (0, 1.9, 0.2), 0, 3.0)

    r.interactable("cup", "pill_cup", (0.18, 0.22, 0.18), (-2.2, 0.92, 4.7),
                   "pill", "take the pill")
    r.interactable("dispenser1", "dispenser", (0.55, 0.75, 0.16), (2.2, 1.45, 0.14),
                   "dispenser", "MEDICATION")

    # Two fittings, z=2 and z=5 in a room spanning z 0..6.
    #
    # These were briefly moved to 1.5/3.5 to kill a "blown out wall at spawn"
    # that turned out to be misdiagnosed: the real cause was a placeholder
    # Environment left on the player's Camera3D, which overrode WorldEnvironment
    # and rendered the whole game at exposure 1.0 with no fog. With that removed
    # the original placement is correctly dim, and 1.5/3.5 left the spawn too
    # dark to find the paper cup. Fixture placement was never the problem.
    r.light_fitting(0, 2)
    r.light_fitting(0, 5)
    return r


# --- ROOM 2 — the Corridor -------------------------------------------------
# Teaches the second half of the pill economy: LUCID is the state that reads
# machinery (the keypad), UNMED is the state that reads the walls (the code).
# The player must burn a pill to act on what they saw for free.

def room2():
    r = Room("room2", "the Corridor",
             floor=(-1.6, 1.6, -11, 4.5),
             spawn=(0, 4, 0),
             exits=[("room3", -1, 1, -10.9, -9.8)])

    # corridor shell, x [-1.6,1.6], z [-11,4.5] (south = entrance, north = staff door)
    r.wall_x(-1.6, 1.6, 4.5)      # south cap, behind spawn
    r.wall_z(-11, 4.5, -1.6)      # west wall
    r.wall_z(-11, 4.5, 1.6)       # east wall

    # partition wall at z=-9 with a doorway gap x[-0.9,0.9] for the staff door
    r.wall_x(-1.6, -0.9, -9)
    r.wall_x(0.9, 1.6, -9)

    # far cap beyond the door
    r.wall_x(-1.6, 1.6, -11)
    r.block((1.6, 2.4, 0.06), (0, 1.35, -10.94), "glow")  # warm glow beyond the door

    # staff door collider — locked until the code is entered; the room script
    # disables it in place.
    r.solid(-0.9, 0.9, -9.1, -8.9, name="DoorCollider")

    # glow strips overhead
    r.block((1.0, 0.06, 0.3), (0, 2.92, 1.2), "glow")
    r.block((1.0, 0.06, 0.3), (0, 2.92, -3.8), "glow")
    r.block((1.0, 0.06, 0.3), (0, 2.92, -7.4), "glow")

    # alcove A — a boarded-over doorway to a broken side room, west wall
    r.block((0.06, 2.2, 1.0), (-1.5, 1.4, 2.4), "wall2")
    r.block((0.08, 0.3, 1.14), (-1.47, 2.55, 2.4), "wall2")
    r.block((0.08, 0.3, 1.14), (-1.47, 0.32, 2.4), "wall2")

    # alcove B — same idea, east wall, further down
    r.block((0.06, 2.2, 1.0), (1.5, 1.4, -4.5), "wall2")
    r.block((0.08, 0.3, 1.14), (1.47, 2.55, -4.5), "wall2")
    r.block((0.08, 0.3, 1.14), (1.47, 0.32, -4.5), "wall2")

    r.scrawl("4 1 1 8", (-1.45, 1.6, -5.5), math.pi / 2, 3.4, sid="codeScrawl")
    r.scrawl("they lock it\nfrom the inside", (1.45, 1.7, -6.5), -math.pi / 2, 2.6)

    r.interactable("keypad1", "keypad", (0.14, 0.5, 0.4), (1.41, 1.45, -8.3),
                   "pad", "use the keypad")
    r.interactable("staffdoor", "door", (1.8, 3, 0.2), (0, 1.5, -9),
                   "door", "the staff door")
    # Rooms are one-way, so the corridor needs its own pill source — with only
    # the floor pickup, a player who skipped the cell dispenser can strand
    # themselves unmed with no way back to lucid for the keypad.
    r.interactable("dispenser2", "dispenser", (0.55, 0.75, 0.16), (-1.25, 1.45, -8.79),
                   "dispenser", "use the dispenser")
    r.interactable("pill1", "pill_pickup", (0.16, 0.2, 0.16), (-1.15, 0.9, -4.4),
                   "pill", "take the pill")

    # --- set dressing --------------------------------------------------------
    # The concept art's CORRIDOR plate, as closely as the geometry allows: a
    # smashed medication cabinet spilling pill bottles, signage, bumper rails,
    # exposed conduit and a missing ceiling tile.
    #
    # Faces: west x -1.48, east x 1.48, north wall segments z -8.88, cap z 4.38.
    # NOTHING HERE CARRIES A COLLIDER. The corridor is 3.2m wide and is the only
    # route to room 3; a prop that narrowed it would be a soft-lock risk for no
    # visual gain, so the fittings are all collider-free wall/ceiling/floor
    # dressing. med_cabinet_smashed WOULD carry one, which is exactly why it is
    # placed on the north wall beside the door rather than along the run.
    r.prop_run("skirting", "z", -11, 4.5, -1.48)
    r.prop_run("skirting", "z", -11, 4.5, 1.48)

    # Bumper rails, split around the two recessed wall panels (west z 1.9..2.9,
    # east z -5.0..-4.0) rather than driven through them.
    r.prop_run("bumper_rail", "z", -8.6, 1.8, -1.48)
    r.prop_run("bumper_rail", "z", -8.0, -5.2, 1.48)
    r.prop_run("bumper_rail", "z", -3.9, 4.4, 1.48)

    # Services along the ceiling — the corridor plate's most distinctive feature
    # after the cabinet. Offset to one side so it reads as a run of conduit
    # rather than a spine down the middle.
    r.prop_run("ceiling_conduit", "z", -8.5, 3.5, -1.05, facing="nx")
    r.model("hanging_cable", (0.7, -2.4), facing="nx")
    r.model("missing_ceiling_tile", (0.55, -6.0))

    # Signage. The header sits above the dispenser, the enamel notice beside it.
    r.model("ward_sign", (-1.48, 3.3), facing="px", text="WARD B")
    r.model("cabinet_header", (-1.25, -8.88), facing="pz")
    r.model("enamel_notice", (-0.55, -8.88), facing="pz")
    r.model("exit_sign", (1.25, -8.88), facing="pz")
    r.model("reg_notice", (1.48, -1.2), facing="nx")

    # The smashed cabinet and what came out of it.
    r.model("med_cabinet_smashed", (-1.48, -6.6), facing="px")
    r.model("pill_spill", (-1.0, -6.6))
    r.model("pill_spill", (-0.45, -5.9), facing=0.7, name="PillSpillB")
    r.model("paper_scatter", (0.6, -4.1))
    r.model("fallen_plaster_patch", (1.48, 0.4), facing="nx")
    r.model("plaster_rubble", (1.05, 0.4))
    r.model("wall_vent", (-1.48, -4.2), facing="px")

    r.light_fitting(0, 2)
    r.light_fitting(0, -3)
    r.light_fitting(0, -7.5)
    return r


# --- ROOM 3 — the Common Room ----------------------------------------------
# Inverts Room 2's lesson: LUCID reads machinery, but here it's LUCID that
# lies. The exit is chained shut only while medicated — the chains are a
# symptom, not a fact. Trusting UNMED reality is the whole game, right at the
# end.

def room3():
    r = Room("room3", "the Common Room",
             floor=(-5, 5, -7, 4),
             spawn=(0, 3, 0),
             exits=[("room4", -1, 1, -6.9, -5.8)])

    # common room shell, x [-5,5] z [-5,4]
    r.wall_x(-5, 5, 4)            # south cap, behind spawn
    r.wall_z(-5, 4, -5)           # west wall
    r.wall_z(-5, 4, 5)            # east wall
    r.wall_x(-5, -1, -5)          # north, west of the exit gap
    r.wall_x(1, 5, -5)            # north, east of the exit gap

    # small vestibule beyond the exit door, x [-1,1] z [-7,-5]
    r.wall_z(-7, -5, -1)
    r.wall_z(-7, -5, 1)
    r.wall_x(-1, 1, -7)           # caps the vestibule
    r.block((1.8, 2.6, 0.06), (0, 1.4, -6.94), "glow")  # warm glow beyond the exit

    # exit door collider — always locked until the room script disables it
    # (opening only works while UNMED; the chains never actually gate it).
    r.solid(-1, 1, -5.12, -4.88, name="DoorCollider")

    # chains + padlock — MESH ONLY, and only in the LUCID group, so it simply
    # isn't there once the player shifts. Deliberately no collider: the chains
    # are a hallucination, they never block anything.
    r.chain_barrier([-0.7, -0.25, 0.25, 0.7], -4.95, padlock_xz=(0, -4.9))

    # props
    r.prop((1.4, 0.5, 1.4), (-2.5, -1))
    r.prop((0.6, 0.9, 0.6), (-0.5, 1.5))

    r.scrawl("you weren't supposed\nto make it this far", (-4.85, 1.7, 2), math.pi / 2, 3)
    r.scrawl("it only holds\nif you believe it", (4.85, 1.7, -3), -math.pi / 2, 3.4)

    r.interactable("exitdoor", "door", (2, 3, 0.24), (0, 1.5, -5),
                   "door", "open the door")

    # --- set dressing --------------------------------------------------------
    # A day-room/common-room read: beam seating along the south wall, chairs
    # pulled up to the existing table, windows down the east side.
    # Faces: west x -4.88, east x 4.88, south z 3.88, north z -4.88.
    #
    # COLLIDERS stay out of the corridor from spawn (0, 3) to the exit gap
    # (x -1..1 at z -5), and off the two existing prop boxes.
    r.prop_run("skirting", "x", -5, 5, 3.88)
    r.prop_run("skirting", "x", -5, -1, -4.88)
    r.prop_run("skirting", "x", 1, 5, -4.88)
    r.prop_run("skirting", "z", -5, 4, -4.88)
    r.prop_run("skirting", "z", -5, 4, 4.88)
    r.prop_run("bumper_rail", "z", -4.6, 3.6, -4.88)
    r.prop_run("bumper_rail", "z", -4.6, 3.6, 4.88)

    # Windows on the east wall, clear of the scrawl at z -3.
    r.model("barred_window", (4.88, -1.0), facing="nx")
    r.model("barred_window", (4.88, 1.8), facing="nx")

    # Seating either side of the spawn approach, not across it.
    r.model("beam_seating", (-3.0, 3.4), facing="nz", name="CommonSeatW")
    r.model("beam_seating", (3.0, 3.4), facing="nz", name="CommonSeatE")
    # Two chairs at the existing table (x -3.2..-1.8, z -1.7..-0.3).
    r.model("stacking_chair", (-2.5, 0.15), facing="nz")
    r.model("stacking_chair", (-3.95, -1.0), facing="px")

    r.model("radiator", (-4.88, -2.0), facing="px")
    r.model("radiator", (4.88, -3.6), facing="nx")
    r.model("notice_board", (-3.0, -4.88), facing="pz")
    r.model("wall_clock", (3.0, -4.88), facing="pz")
    r.model("quiet_sign", (-4.88, 0.4), facing="px")
    r.model("wall_speaker", (4.88, 3.2), facing="nx")
    r.model("missing_ceiling_tile", (-1.4, -2.2))
    r.model("paper_scatter", (1.6, -1.4))

    r.light_fitting(0, 2)
    r.light_fitting(-2.5, -1)
    r.light_fitting(1.5, -3)
    r.light_fitting(0, -6)
    return r


# --- ROOM 4 — the Day Room -------------------------------------------------
# The ward's first NPC. LUCID: he's completely invisible — you never know
# where he is while medicated. UNMED: he's revealed, too tall, too still
# between steps, and he sees YOU wrong — watched long enough, he gives chase,
# and contact restrains you and forces medication. Shifting lucid is always
# safe, even mid-chase (the escape costs the pill it always costs). This
# inverts rooms 2-3's lesson: unmed shows the truth, but truth has a predator.
# The staff door only exists while unmedicated — you have to cross his room,
# in the state he hunts, to leave it.

def room4():
    r = Room("room4", "the Day Room",
             floor=(-6, 6, -7, 5),
             spawn=(0, 4, 0),
             exits=[("room5", -1, 1, -6.9, -5.8)])
    r.shadow_extra = [1]  # hand-promoted in bafc584; see Room.shadow_extra

    # day room shell, x [-6,6] z [-5,5]
    r.wall_x(-6, 6, 5)            # south cap, behind spawn
    r.wall_z(-5, 5, -6)           # west wall
    r.wall_z(-5, 5, 6)            # east wall
    r.wall_x(-6, -1, -5)          # north, west of the staff-door gap
    r.wall_x(1, 6, -5)            # north, east of the staff-door gap

    # vestibule beyond the staff door, x [-1,1] z [-7,-5]
    r.wall_z(-7, -5, -1)
    r.wall_z(-7, -5, 1)
    r.wall_x(-1, 1, -7)           # caps the vestibule
    r.block((1.8, 2.6, 0.06), (0, 1.4, -6.8), "glow")  # warm glow beyond the exit

    # staff door — solid only while LUCID; simply not there while UNMED.
    # INVERTED from room1's blocker (solid only while UNMED): here the truth
    # is a way out.
    r.block((2, 3, 0.26), (0, 1.5, -5), "wall", "lucid",
            collider=(-1, 1, -5.13, -4.87))

    # TV mounted high on the north wall, east of the gap — glow of endless static
    r.tv_panel(4, 2.25, -4.8, 1.3, 0.9)

    # tables
    r.prop((1.5, 0.5, 0.9), (2, 0.3))
    # MOVED EAST, x 3.2 -> 4.9 (collider 2.45..3.95 -> 4.15..5.65).
    #
    # At its authored position this table sat directly on top of patrol
    # waypoint 0 (3.5, 3): the orderly spawns on waypoint 0, so he started
    # embedded in it, and the axis-separated resolver — which has no
    # escape-from-inside case — refused every move. He stood inside the table
    # for the entire room. The east patrol leg (x = 3.5, z 3 -> -3) also ran
    # straight through it, and leg 4->0 grazed its north-east corner at 0.10m.
    #
    # Inherited from the Three.js build, not introduced by the port: room4.ts
    # has the identical waypoints and the identical rb.solid, and passes
    # WAYPOINTS to the Orderly constructor RAW — kit.patrol() only arrived at
    # room 11, so rooms 4-7 were never clearance-validated. check_rooms.gd now
    # ports that validator, which is what caught this.
    #
    # The PROP moved rather than the patrol loop, deliberately: room4's header
    # documents the loop's shape as designed (x >= -0.5 footprint keeping the
    # west wall a readable safe lane, the wp4 bulge toward the player's first
    # sightline) and it carries a reaction-time audit. The tables carry no such
    # intent. At 0.5m tall this one is also far below the 1.5m occlusion ray,
    # so moving it cannot change any sight line. It now sits against the east
    # wall (inner face x = 5.88), clearing the x = 3.5 leg by 0.65m.
    r.prop((1.5, 0.5, 0.9), (4.9, 2.6))

    # tall shelving unit — the occluder. Sits between the patrol loop and the
    # west wall's safe lane, so hiding in its shadow actually works.
    r.shelf_row(-2.2, -1, length=1.6, height=2.9)

    r.scrawl("he counts\nyour blinks", (-5.85, 1.7, 1.5), math.pi / 2, 2.8)
    r.scrawl("the door is only there\nwhen you are honest", (-5.85, 1.7, -3), math.pi / 2, 3.4)
    r.scrawl("stand still.\nhe forgets slow things", (5.85, 1.7, 3.5), -math.pi / 2, 2.6)

    # Rooms are one-way and the catch penalty forces lucid, so the day room
    # needs its own pill source, reachable without crossing the patrol loop
    # (far west of the loop's x >= -0.5 footprint, close to the spawn point
    # the player is teleported back to). West-wall mount: x-thin so the
    # faceplate faces east into the room.
    r.interactable("dispenser4", "dispenser", (0.16, 0.75, 0.55), (-5.86, 1.45, 4.2),
                   "dispenser", "use the dispenser")

    # --- set dressing --------------------------------------------------------
    # Faces: west x -5.88, east x 5.88, south z 4.88, north z -4.88.
    #
    # The west wall is LOAD-BEARING for this room: the dispenser is at z 4.2 and
    # two scrawls at z 1.5 and z -3 have to be readable from in front of them, so
    # nothing with a collider goes near those three spots. The wheelchair sits at
    # z -0.6, in the gap between them.
    r.prop_run("skirting", "x", -6, 6, 4.88)
    r.prop_run("skirting", "x", -6, -1, -4.88)
    r.prop_run("skirting", "x", 1, 6, -4.88)
    r.prop_run("skirting", "z", -5, 5, -5.88)
    r.prop_run("skirting", "z", -5, 5, 5.88)
    r.prop_run("bumper_rail", "z", -4.6, 4.6, 5.88)

    # Windows east, clear of the scrawl at z 3.5.
    r.model("barred_window", (5.88, -1.0), facing="nx")
    r.model("barred_window", (5.88, 1.2), facing="nx")

    r.model("beam_seating", (-3.4, 4.5), facing="nz", name="DaySeatW")
    r.model("beam_seating", (2.6, 4.5), facing="nz", name="DaySeatE")
    r.model("stacking_chair", (2.0, 1.25), facing="nz")
    r.model("locker_bank", (-4.6, -4.63), facing="pz")
    r.model("wheelchair", (-4.9, -0.6), facing="nx")

    r.model("radiator", (-5.88, 2.6), facing="px")
    r.model("radiator", (5.88, -3.4), facing="nx")
    r.model("notice_board", (-3.2, -4.88), facing="pz")
    r.model("wall_clock", (1.8, -4.88), facing="pz")
    r.model("exit_sign", (-1.4, -4.88), facing="pz")
    r.model("wall_speaker", (-5.88, -4.2), facing="px")
    r.model("missing_ceiling_tile", (0.8, -2.6))
    r.model("hanging_cable", (-1.8, 2.0), facing="nx")
    r.model("paper_scatter", (-1.2, -3.4))
    r.model("plaster_rubble", (5.2, -1.9))

    r.light_fitting(0, 3)
    r.light_fitting(3.5, 0)
    r.light_fitting(-3, -1)
    r.light_fitting(3, -4)
    r.light_fitting(0, -6)
    return r


# --- ROOM 5 — the Nurse Station --------------------------------------------
# The capstone: every mechanic at once, in one room, under threat. A central
# island — occluder, collider, and the only reliable shadow — sits inside the
# orderly's patrol loop. The exit code is scrawled unmed-only, split in half,
# on opposite sides of that loop, so reading either half means standing in
# space he actually walks through. The keypad that spends the code only works
# lucid. The player has to plan a route: scout blind-to-him first (lucid,
# safe, useless), then unmed (dangerous, legible), then back to lucid to
# cross and open the door.

def room5():
    r = Room("room5", "the Nurse Station",
             floor=(-7, 7, -8, 5),
             spawn=(0, 4.3, 0),
             exits=[("room6", -1, 1, -7.9, -6.8)])
    r.shadow_extra = [1]  # hand-promoted in bafc584; see Room.shadow_extra

    # main room shell, x [-7,7] z [-6,5] (south = entrance, north = staff door)
    r.wall_x(-7, 7, 5)            # south cap, behind spawn
    r.wall_z(-6, 5, -7)           # west wall
    r.wall_z(-6, 5, 7)            # east wall
    r.wall_x(-7, -1, -6)          # north, west of the staff-door gap
    r.wall_x(1, 7, -6)            # north, east of the staff-door gap

    # vestibule beyond the staff door, x [-1,1] z [-8,-6]
    r.wall_z(-8, -6, -1)
    r.wall_z(-8, -6, 1)
    r.wall_x(-1, 1, -8)           # caps the vestibule
    r.block((1.8, 2.6, 0.06), (0, 1.4, -7.8), "glow")  # warm glow beyond the exit

    # staff door collider — locked until the code is entered; the room script
    # disables it in place.
    r.solid(-1, 1, -6.1, -5.9, name="DoorCollider")

    # the nurse-station island: a tall central counter (real occluder +
    # collider) ringed by a lower counter skirt. One solid footprint —
    # nothing pathfinds around its interior, the orderly's loop just runs
    # outside it.
    r.island(-2.2, 2.2, -1.3, 1.3, core_width=1.8)

    # seating, east corridor (between the patrol lane and the east wall) — a
    # couch-ish block the second code half sits behind.
    #
    # NOT converted to prop(), despite fitting the invariant on paper: the
    # shipped collider (4.95, 5.65, -1.2, 1.2) is a hand-typed literal, and
    # (4.95 + 5.65) / 2.0 lands one ULP off exactly 5.3 in float64 — where
    # prop()'s own x +- size/2 derivation lands EXACTLY on 5.3. The two
    # differ only in the last bit, invisible at the collider's own 4dp
    # formatting, but it flips the sign of the (now not-quite-zero) MESH's
    # relative-offset x, which %.4f then renders as -0.0000 vs 0.0000 — a
    # real byte diff in the committed .tscn. A genuine variant, not a bug in
    # the preset: left as a raw block() rather than "fixed" by nudging
    # emitted geometry to match, which the brief for this pass forbids.
    r.block((0.7, 0.5, 2.4), (5.3, 0.25, 0), "prop", collider=(4.95, 5.65, -1.2, 1.2))

    # medication-window alcove, west corridor — shutter + glow strip, flush
    # against the wall, first code half is scrawled beside it.
    r.block((0.08, 1.3, 1.5), (-6.92, 1.5, -0.9), "pad")
    r.block((0.08, 0.12, 1.6), (-6.92, 2.25, -0.9), "glow")

    # wall TVs — endless static, dressing only
    r.tv_panel(-4, 2.25, 4.85, 1.3, 0.9)
    r.tv_panel(5.5, 2.2, -5.85, 1.1, 0.8)

    r.scrawl("1 9 – –", (-6.85, 1.6, 0.6), math.pi / 2, 2.2, sid="codeScrawlA")
    r.scrawl("– – 0 7", (6.85, 1.6, 0), -math.pi / 2, 2.2, sid="codeScrawlB")
    r.scrawl("the coffee is always warm.\nno one drinks it.", (6.85, 1.6, 4.3), -math.pi / 2, 2.4)

    # Own dispenser, reachable without ever entering the patrol loop — sits
    # south of the loop's z <= 2.6 footprint, close to spawn/the teleport-back
    # point after a catch. South-wall mount, z-thin, flush against the wall.
    r.interactable("dispenser5", "dispenser", (0.55, 0.75, 0.16), (-6.3, 1.45, 4.86),
                   "dispenser", "use the dispenser")
    r.interactable("keypad5", "keypad", (0.4, 0.5, 0.14), (1.35, 1.45, -5.86),
                   "pad", "use the keypad")
    r.interactable("exitdoor", "door", (2, 3, 0.2), (0, 1.5, -6),
                   "door", "the exit door")

    # --- set dressing (prop kit) --------------------------------------------
    # THE SHOWCASE ROOM for props/. Everything below is instanced from
    # props/<kind>.tscn; nothing here is bespoke to room 5, which is the point —
    # the same calls dress any other room, with different numbers.
    #
    # THE ONE HARD CONSTRAINT, and the reason the placements look lopsided:
    # room5.gd's WAYPOINTS walk the orderly around the rectangle
    # x [-4.4, 4.4], z [-2.6, 2.6], and the donut between that lane and the
    # island is where BOTH code halves are read from. So every prop that
    # carries a collider sits OUTSIDE the lane — north of z -2.6, south of
    # z 2.6, or in the two side corridors. Trim, wall fittings and counter-top
    # objects carry no collider at all and are placed freely.
    #
    # Wall faces, since every wall prop needs one (walls are 0.24 thick, so the
    # face is wall_at +- 0.12):
    #     south z 4.88   north z -5.88   west x -6.88   east x 6.88

    # Trim. prop_run() repeats one 2m segment and infers which way each faces
    # from the nearest wall, so a whole corridor is one line.
    r.prop_run("skirting", "x", -7, 7, 4.88)
    r.prop_run("skirting", "x", -7, -1, -5.88)
    r.prop_run("skirting", "x", 1, 7, -5.88)
    r.prop_run("skirting", "z", -6, 5, -6.88)
    r.prop_run("skirting", "z", -6, 5, 6.88)

    # Bumper rail down both corridors. The west run is split around the
    # medication window (z -1.65..-0.15) rather than crossing it.
    r.prop_run("bumper_rail", "z", -6, -1.8, -6.88)
    r.prop_run("bumper_rail", "z", 0.2, 5, -6.88)
    r.prop_run("bumper_rail", "z", -6, 5, 6.88)
    r.prop_run("pipe_run", "z", 1.0, 5.0, 6.88)

    # Wall fittings.
    r.model("radiator", (-6.88, 2.6), facing="px")
    r.model("radiator", (-6.88, -3.6), facing="px")
    r.model("radiator", (6.88, -4.2), facing="nx")
    r.model("wall_vent", (-6.88, -4.6), facing="px")
    r.model("wall_vent", (6.88, 2.4), facing="nx")
    r.model("fire_extinguisher", (-6.88, 4.2), facing="px")
    r.model("notice_board", (-4.6, -5.88), facing="pz")
    r.model("wall_clock", (2.8, -5.88), facing="pz")
    r.model("wall_shelf", (4.6, -5.88), facing="pz")
    # On the shelf: 1.45 mount + half the 0.028 board = a 1.464 top surface.
    r.model("binder_stack", (4.6, -5.74), y=1.464, facing="pz")

    # Records bank, north wall — north of the patrol lane, clear of the door
    # gap (x -1..1) and of the keypad at x 1.35.
    for i, cx in enumerate((-2.3, -2.8, -3.3)):
        r.model("filing_cabinet", (cx, -5.55), facing="pz", name="Cabinet%d" % i)
    r.model("office_chair", (-4.5, -4.3), facing="nz")

    # Counter tops. The island's ring skirt is 1.1 high and 0.5 deep, so its
    # usable band is z 0.8..1.3 (south) and -1.3..-0.8 (north).
    r.model("crt_monitor", (-1.3, 1.05), y=1.1, facing="pz")
    r.model("paper_tray", (0.95, 1.05), y=1.1, facing="pz")
    r.model("binder_stack", (1.8, 1.05), y=1.1, facing="pz")
    r.model("crt_monitor", (1.2, -1.05), y=1.1, facing="nz")
    r.model("paper_tray", (-1.5, -1.05), y=1.1, facing="nz")

    # The one prop INSIDE the lane, and the only collider=False furniture in
    # the room: a chair pulled up to the counter. It is tucked hard against the
    # island's south face, where the player has no reason to walk, and giving
    # it a collider would pinch the 1.3m donut the whole room is played in.
    r.model("office_chair", (0.9, 1.62), facing="nz", collider=False)

    # Waiting seating, south wall — south of the lane, east of the dispenser
    # approach at x -6.3. Beam seating rather than the three separate chairs
    # this shipped with: the concept art's waiting area is beam end to end, and
    # a beam reads as one long horizontal mass where loose chairs read as
    # clutter. See props/beam_seating.tscn.
    r.model("beam_seating", (2.4, 4.58), facing="nz", name="Waiting0")
    r.model("beam_seating", (4.7, 4.58), facing="nz", name="Waiting1")

    # Barred windows, south wall. Every environment plate in the concept art is
    # composed around one of these, and they are the brightest surface in the
    # room — behind the spawn point on purpose, so the player turns into the
    # light rather than starting with it in their eyes.
    # x -1.9 and 0.6, NOT further west: the shipped tv_panel at x -4 spans
    # -4.65..-3.35 at y 1.8..2.7, and a 1.46-wide window centred at -3.4 drives
    # straight through it. The panel is existing room content and stays put.
    r.model("barred_window", (-1.9, 4.88), facing="nz")
    r.model("barred_window", (0.6, 4.88), facing="nz")

    # North area, outside the patrol lane.
    r.model("gurney", (3.6, -4.4), facing="nz")
    r.model("sink", (-6.88, 3.6), facing="px")
    r.model("wall_speaker", (-6.88, -2.6), facing="px")

    # West corridor, clear of both the dispenser approach and the lane.
    r.model("mop_bucket", (-6.2, 2.0), facing="px")
    r.model("iv_stand", (6.3, 3.9))

    # Lights, now with a visible fitting each — same five positions as before.
    r.light_fitting(0, 3.5)
    r.light_fitting(-4.5, 0)
    r.light_fitting(4.5, 0)
    r.light_fitting(0, -2.5)
    r.light_fitting(0, -5.5)
    # The vestibule beyond the staff door is older than the ward around it —
    # a bare bulb on a flex, not a troffer. No Room.light() of its own; the
    # z -5.5 fitting already reaches it, and a sixth light here would wash out
    # the glow block at z -7.8 that sells the exit.
    r.model("pendant_lamp", (0, -7.0))
    r.model("pendant_bulb", (0, -7.0), light="lit")
    return r


# --- ROOM 6 — the West Corridor --------------------------------------------
# First bend in the ward, first room where the dispenser isn't waiting at the
# safe entrance: it sits in an alcove off the long leg of the L, right where
# his patrol runs. The exit code is scrawled unmed-only, further down the same
# leg, past the alcove. Nothing here is individually new — you've read scrawls
# unmed, you've fed a keypad lucid, you've shared a room with him — the room
# just makes you leapfrog all three at once: dash unmed for the code, fall
# back to the alcove to restock, cross lucid at the moment that actually
# matters.
#
# NOTE: L-shaped, and the exit is on +X (east), not -Z.

def room6():
    r = Room("room6", "the West Corridor",
             floor=(-1.8, 14, -6.3, 8),
             spawn=(0, 7, 0),
             exits=[("room7", 13.2, 14, -3.9, -1.9)])

    # leg A (entrance leg, north-south), x [-1.6,1.6], z [-1.2,8]
    r.wall_z(-4.6, 8, -1.6)       # west wall — leg A, the corner, and leg B's west edge, one run
    r.wall_z(-1.2, 8, 1.6)        # leg A east wall (stops at the corner; leg B is open past it)
    r.wall_x(-1.6, 1.6, 8)        # south cap, behind spawn

    # leg B (long leg, east-west), z [-4.6,-1.2], x [-1.6,12]
    r.wall_x(1.6, 12, -1.2)       # leg B north wall — starts east of the corner opening
    r.wall_x(-1.6, 5.5, -4.6)     # leg B south wall, west of the alcove gap
    r.wall_x(7.1, 12, -4.6)       # leg B south wall, east of the alcove gap

    # east cap, with the exit doorway gap
    r.wall_z(-4.6, -3.9, 12)
    r.wall_z(-1.9, -1.2, 12)
    r.solid(11.88, 12.12, -3.9, -1.9, name="DoorCollider")   # exit door collider, opened by the keypad

    # vestibule beyond the exit door, x [12,14] z [-3.9,-1.9]
    r.wall_x(12, 14, -3.9)
    r.wall_x(12, 14, -1.9)
    r.wall_z(-3.9, -1.9, 14)
    r.block((0.06, 2.6, 1.6), (13.75, 1.4, -2.9), "glow")  # warm glow beyond the exit

    # the alcove — a recess off leg B's south wall, mid-route, his loop passes
    # its mouth without ever looking straight into it (his cone tracks his
    # direction of travel, east-west; the alcove opens south).
    r.wall_z(-6.1, -4.6, 5.5)     # alcove west wall
    r.wall_z(-6.1, -4.6, 7.1)     # alcove east wall
    r.wall_x(5.5, 7.1, -6.1)      # alcove end cap — the dispenser mounts here

    r.scrawl("he learned this hallway\nbefore you did", (-1.45, 1.7, 3), math.pi / 2, 3)
    r.scrawl("count his steps.\nthen move.", (6.3, 1.6, -1.45), math.pi, 2.6)
    # Pulled a couple meters west of the keypad, deeper into the leg his
    # patrol actually walks — widens the gap between "found the code" and
    # "safe at the keypad".
    r.scrawl("6 3 2 9", (8.3, 1.6, -4.35), 0, 2.4, sid="codeScrawl")

    # Off the entrance, in the alcove his loop passes — the first dispenser
    # you have to actually walk into his route to reach. Alcove end cap is at
    # z=-6.1, mouth opens toward +z, so facing is PINNED 'pz' (inferFacing
    # only lands on the right sign here by coincidence).
    r.interactable("dispenser6", "dispenser", (0.55, 0.75, 0.16), (6.3, 1.45, -5.85),
                   "dispenser", "use the dispenser", facing="pz")
    r.interactable("keypad6", "keypad", (0.14, 0.5, 0.4), (11.75, 1.45, -2.9),
                   "pad", "use the keypad")
    r.interactable("exitdoor", "door", (0.2, 3, 2), (12, 1.5, -2.9),
                   "door", "the exit door")

    r.light(0, 6)
    r.light(0, 1)
    r.light(0, -2)
    r.light(3, -2.9)
    r.light(6.3, -2.9)
    r.light(6.3, -5.3)
    r.light(9.5, -2.9)
    r.light(12.5, -2.9)
    return r


# --- ROOM 7 — the Records Room ---------------------------------------------
# Three shelving rows still force a serpentine crossing (east gap, west gap,
# east gap), but the beat is a forced backtrack, not a single crossing: the
# exit keypad sits right past the maze, reachable lucid and blind with no code
# in hand. The code — and the dispenser, still hidden behind a row — both live
# in the back half, by the entrance you just walked away from. So the route is
# keypad first (safe, useless), then unmed back through the maze to read the
# code and refill, then unmed (or lucid, if you spend the pill right there)
# forward through it again to actually open the door. His patrol lives in the
# pocket between all three rows — the belt you cross both ways — with a row's
# mass to duck behind on either approach.

def room7():
    r = Room("room7", "the Records Room",
             floor=(-7.5, 6, -7, 5),
             spawn=(0, 4, 0),
             # room8+ are out of scope for this migration pass; room7 ends the
             # build instead of chaining onward. Restore ("room8", ...) when
             # the rest of the ward is ported.
             exits=[("room8", -1, 1, -6.9, -5.8)])

    # shell, x [-6,6] z [-7,5] — reuses room4's exact footprint, different guts
    r.wall_x(-6, 6, 5)            # south cap, behind spawn
    r.wall_z(-5, 0.8, -6)         # west wall, south of the hidden nook's opening
    r.wall_z(1.8, 5, -6)          # west wall, north of the nook's opening (toward spawn)
    r.wall_z(-5, 5, 6)            # east wall
    r.wall_x(-6, -1, -5)          # north, west of the staff-door gap
    r.wall_x(1, 6, -5)            # north, east of the staff-door gap

    # vestibule beyond the staff door, x [-1,1] z [-7,-5]
    r.wall_z(-7, -5, -1)
    r.wall_z(-7, -5, 1)
    r.wall_x(-1, 1, -7)
    r.block((1.8, 2.6, 0.06), (0, 1.4, -6.94), "glow")  # warm glow beyond the exit

    # staff door collider — locked until the code is entered
    r.solid(-1, 1, -5.13, -4.87, name="DoorCollider")

    # three shelving rows, gaps alternating east/west/east — a proper
    # serpentine between spawn and the door. Each is both a collider and a
    # sight occluder.
    r.shelf_row(-3.75, 2.2, length=4.5, height=2.6)
    r.shelf_row(3.75, 0, length=4.5, height=2.6)
    r.shelf_row(-3.75, -2.2, length=4.5, height=2.6)

    # the hidden dispenser nook — carved into the west wall, tucked directly
    # behind row A: its mass sits between the nook and spawn, so nothing about
    # it is visible on the walk in. Reaching it means clearing row A's gap and
    # doubling back west, into the same pocket he patrols.
    r.wall_x(-7.4, -6, 0.8)       # nook south wall — the dispenser mounts here, deep end
    r.wall_x(-7.4, -6, 1.8)       # nook north wall, toward the gap/room
    r.wall_z(0.8, 1.8, -7.4)      # nook west end cap

    # Dispenser hint, unmoved — still true, just points at a different row now.
    r.scrawl("they keep the quiet\nbehind the files", (5.85, 1.7, 3.5), -math.pi / 2, 2.8)
    # Orderly atmosphere, unmoved — it already sat right where his belt runs.
    r.scrawl("the files don't forget.\nneither does he.", (-5.85, 1.7, -1), math.pi / 2, 2.8)
    # The code, relocated to the back half, near the entrance.
    r.scrawl("0 4 5 2", (-5.85, 1.7, 3.7), math.pi / 2, 2.4, sid="codeScrawl")
    # Planted right where the code used to live, by the keypad.
    r.scrawl("you walked right past it.\nback the way you came.", (5.85, 1.7, -4), -math.pi / 2, 2.6)

    # Tucked behind row A, not visible from spawn or from the keypad.
    # Mounted against the nook's south wall (z=0.8), thin in z; the nook's
    # open interior is +z of that wall, so facing is PINNED 'pz' (inferFacing
    # would point it -z, straight into the wall it's flush against).
    r.interactable("dispenser7", "dispenser", (0.55, 0.75, 0.16), (-6.7, 1.45, 1.05),
                   "dispenser", "use the dispenser", facing="pz")
    r.interactable("keypad7", "keypad", (0.4, 0.5, 0.14), (1.35, 1.45, -4.75),
                   "pad", "use the keypad")
    r.interactable("exitdoor", "door", (2, 3, 0.2), (0, 1.5, -5),
                   "door", "the exit door")

    r.light(0, 4)
    r.light(-3.75, 2.2)
    r.light(3.75, 0)
    r.light(-3.75, -2.2)
    r.light(0, -3.5)
    r.light(-6.5, 1.05)
    r.light(0, -6)
    return r


# --- ROOM 9 — the Doctor's Office -------------------------------------------
# A breather after the east ward: no orderly, nothing hunting. Reuses room7's
# shell shape (south cap behind spawn, west/east walls, north wall split by a
# staff-door gap, a -Z vestibule with a warm glow past the door) with simpler
# guts — a desk and a coatrack, no maze, no nook.
#
# The coat on the rack holds a found pill: a calm top-up with nothing chasing
# you, so it actually registers. The exit still asks for the established two
# things (a code read unmed, a keypad worked lucid) so the player feels the
# oscillation once while it is still free of consequence, right before room 10
# makes it expensive.

def room9():
    r = Room("room9", "the Doctor's Office",
             floor=(-5, 5, -8, 5),
             spawn=(0, 4.3, 0),
             exits=[("room10", -1, 1, -7.9, -6.8)])

    # shell, x [-5,5] z [-6,5]
    r.wall_x(-5, 5, 5)            # south cap, behind spawn
    r.wall_z(-6, 5, -5)           # west wall
    r.wall_z(-6, 5, 5)            # east wall
    r.wall_x(-5, -1, -6)          # north, west of the staff-door gap
    r.wall_x(1, 5, -6)            # north, east of the staff-door gap

    # vestibule beyond the staff door, x [-1,1] z [-8,-6]
    r.wall_z(-8, -6, -1)
    r.wall_z(-8, -6, 1)
    r.wall_x(-1, 1, -8)
    r.block((1.8, 2.6, 0.06), (0, 1.4, -7.8), "glow")  # warm glow beyond the exit

    # staff door collider — locked until the code is entered
    r.solid(-1, 1, -6.13, -5.87, name="DoorCollider")

    # the doctor's desk, dead center — flavor and a collider, nothing more
    r.prop((2.0, 0.9, 1.0), (1.0, -2.5))

    # the coatrack against the west wall — the coat itself is a separate
    # interactable ('bottle'), hung at chest height beside it
    r.prop((0.16, 1.9, 0.16), (-4.4, -3.6))

    r.scrawl("they dose you small\nso you stay small", (4.85, 1.7, -1), -math.pi / 2, 2.6)
    r.scrawl("his coat still smells\nlike the ward", (-4.85, 1.7, -3.6), math.pi / 2, 2.4)
    r.scrawl("5 2 1 6", (-4.85, 1.7, 1), math.pi / 2, 2.2, sid="codeScrawl")

    # A loose pill in the coat pocket. Typed pill_pickup, but room9.gd
    # intercepts it to vary the toast on an already-full carry — the builtin
    # branch in main.gd has one flat toast and no objective change.
    r.interactable("bottle", "pill_pickup", (0.22, 0.28, 0.22), (-4.4, 1.55, -3.4),
                   "pill", "search the coat")
    # Mounted on the east wall (x=5), thin in x, so the faceplate points -X
    # into the room. PINNED 'nx': inferFacing lands on it here, but the two
    # dispensers above document what happens when it does not.
    r.interactable("dispenser9", "dispenser", (0.16, 0.75, 0.55), (4.72, 1.45, 1.0),
                   "dispenser", "use the dispenser", facing="nx")
    r.interactable("keypad9", "keypad", (0.4, 0.5, 0.14), (1.35, 1.45, -5.75),
                   "pad", "use the keypad")
    r.interactable("exitdoor", "door", (2, 3, 0.2), (0, 1.5, -6),
                   "door", "the exit door")

    r.light(0, 4)
    r.light(-3, 1)
    r.light(3, 1)
    r.light(0, -1.5)
    r.light(0, -4.5)
    return r

def room8():
    r = Room("room8", "the East Ward",
             floor=(-9, 10.5, -10, 6),
             spawn=(0, 5, 0),
             exits=[("room9", -1, 1, -9.9, -8.8)])

    # Match the falloff every shipped room actually uses (see Room.__init__:
    # the generator's own defaults are stale). Without this room 8 would be lit
    # unlike rooms 1-7 — broad overlapping washes instead of tight pools.
    r.light_range = 6.0
    r.light_attenuation = 2.3

    # shell, x [-9,9] z [-8,6]
    r.wall_x(-9, 9, 6)            # south cap, behind spawn
    r.wall_z(-8, 6, -9)           # west wall, unbroken
    r.wall_z(-8, 0.4, 9)          # east wall, south of the alcove's opening
    r.wall_z(2.0, 6, 9)           # east wall, north of the alcove's opening
    r.wall_x(-9, -1, -8)          # north, west of the staff-door gap
    r.wall_x(1, 9, -8)            # north, east of the staff-door gap

    # vestibule beyond the staff door, x [-1,1] z [-10,-8]
    r.wall_z(-10, -8, -1)
    r.wall_z(-10, -8, 1)
    r.wall_x(-1, 1, -10)          # caps the vestibule
    r.block((1.8, 2.6, 0.06), (0, 1.4, -9.8), "glow")  # warm glow beyond the exit

    # staff door collider — locked until the code is entered; the room script
    # disables it in place.
    r.solid(-1, 1, -8.13, -7.87, name="DoorCollider")

    # The central island — A's inner orbit runs around it; B's figure-eight
    # waist grazes its north and south faces, which is exactly where the split
    # code lives. One solid footprint, ringed by a lower counter skirt; the
    # ring/core blocks are MESH ONLY, the single solid() is the collider,
    # same division as room5's island.
    r.island(-1.9, 1.9, -1.3, 1.3, core_width=1.6)

    # Dispenser alcove — off the east wall, out along orderly B's eastern leg.
    # Inside patrolled ground, but lucid is always safe, so finding it is the
    # only real challenge.
    #
    # The dispenser mounts on the END CAP (thin-x, facing out the mouth toward
    # -x), not on the south bracket. room8.ts carries a facing-audit note: on
    # the south wall the outward normal is +z but inferFacing picks -z (the
    # room-wide floor centre is south of this alcove), which points the whole
    # composite — slot, tray, MEDICATION plate — into the wall it is mounted
    # on. The end cap puts the plate dead ahead as you walk in.
    r.wall_x(9, 10.5, 0.4)        # alcove south wall
    r.wall_x(9, 10.5, 2.0)        # alcove north wall
    r.wall_z(0.4, 2.0, 10.5)      # alcove east end cap — the dispenser mounts here

    # A filing block against the west wall — the one stretch of orderly B's
    # loop that runs close along a bare wall gets a shadow to duck into. Its
    # collider is also what forces B's west legs to x=-7.3 (see room8.gd).
    r.prop((0.6, 1.6, 1.2), (-8.19, -3))

    r.scrawl("two sets of footsteps.\nonly one of them is yours",
             (8.75, 1.7, 4), -math.pi / 2, 2.8)
    # The split code, on the island's south and north faces — the two halves
    # face opposite ways, so you cannot read both from one standing position,
    # and B's waist crosses both. Positions are verbatim from room8.ts.
    r.scrawl("2 8 – –", (0, 1.6, 1.9), 0.0, 2.2, sid="codeScrawlA")
    r.scrawl("– – 4 6", (0, 1.6, -1.9), math.pi, 2.2, sid="codeScrawlB")

    # Alcove end cap is at x=10.5, mouth opens toward -x, so facing is PINNED
    # 'nx' — see the facing-audit note above the alcove walls.
    r.interactable("dispenser8", "dispenser", (0.16, 0.75, 0.55), (10.36, 1.45, 1.2),
                   "dispenser", "use the dispenser", facing="nx")
    # North-wall mounts, z-thin, proud of the inner face at z=-7.88; the room
    # interior is +z of both, so facing is PINNED 'pz'. (The heuristic happens
    # to agree here, but gen_rooms' header records two shipped bugs from
    # trusting it, so both are explicit.)
    r.interactable("keypad8", "keypad", (0.4, 0.5, 0.14), (1.35, 1.45, -7.75),
                   "pad", "use the keypad", facing="pz")
    r.interactable("exitdoor", "door", (2, 3, 0.2), (0, 1.5, -8),
                   "door", "the exit door", facing="pz")

    r.light(0, 4.5)
    r.light(0, 1.5)
    r.light(0, -1.5)
    r.light(5, 3)
    r.light(5, -4)
    r.light(-5, 3)
    r.light(-5, -4)
    r.light(9, 1)
    r.light(0, -6)
    r.light(0, -9)
    return r

def room10():
    r = Room("room10", "the Wing",
             floor=(-9.6, 9.6, -28, 8),
             spawn=(0, 7, 0),
             exits=[("room11", -1, 1, -27.9, -26.8)])

    # exterior shell — west (x=-8) and east (x=8) walls run the full
    # north-south length, broken only where the alcoves open onto them.
    r.wall_z(-26, -15.4, -8)      # west, south of the dispenser-B alcove mouth
    r.wall_z(-13.8, -9.4, -8)     # west, between the two west-side alcove mouths
    r.wall_z(-7.8, 8, -8)         # west, north of the code-A nook mouth
    r.wall_z(-26, -19.4, 8)       # east, south of the code-B nook mouth
    r.wall_z(-17.8, 8, 8)         # east, north of the code-B nook mouth

    r.wall_x(-8, 8, 8)            # south cap, behind spawn

    # north cap, with the final exit doorway gap
    r.wall_x(-8, -1, -26)
    r.wall_x(1, 8, -26)
    # exit door collider — locked until the code is entered; the room script
    # disables it in place by name.
    r.solid(-1, 1, -26.13, -25.87, name="DoorCollider")

    # vestibule beyond the exit door, x [-1,1] z [-28,-26]
    r.wall_z(-28, -26, -1)
    r.wall_z(-28, -26, 1)
    r.wall_x(-1, 1, -28)
    r.block((1.8, 2.6, 0.06), (0, 1.4, -27.8), "glow")  # warm glow beyond the exit

    # Z1/Z2 boundary, z=0 — an OPEN doorway, deliberately ungated.
    r.wall_x(-8, -2, 0)
    r.wall_x(2, 8, 0)

    # GATE 2 — Z2/Z3 boundary, z=-10. Unmed-only panel across the doorway:
    # crossing it lucid is a walk, crossing it raw is a wall.
    r.wall_x(-8, -2, -10)
    r.wall_x(2, 8, -10)
    r.block((4, 3, 0.24), (0, 1.5, -10), "wall", "unmed",
            collider=(-2, 2, -10.12, -9.88), name="Gate2")

    # GATE 3 — Z3/Z4 boundary, z=-20. Same trick, same reason.
    r.wall_x(-8, -2, -20)
    r.wall_x(2, 8, -20)
    r.block((4, 3, 0.24), (0, 1.5, -20), "wall", "unmed",
            collider=(-2, 2, -20.12, -19.88), name="Gate3")

    # Z2 — the day ward. A central occluder his loop runs clear of, and a nook
    # carved into the west wall at the zone's north end (right where his loop
    # passes closest) holding code half A.
    r.block((3.4, 1.8, 1.4), (0, 0.9, -4.5), "wall2",
            collider=(-1.7, 1.7, -5.2, -3.8))

    r.wall_x(-9.6, -8, -9.4)      # nook A south bracket
    r.wall_x(-9.6, -8, -7.8)      # nook A north bracket
    r.wall_z(-9.4, -7.8, -9.6)    # nook A end cap — code half A is scrawled here

    # Z3 — the records annex. Code half B sits deep in an east nook near gate 3;
    # dispenser B sits in a west alcove midway down the zone — opposite side,
    # opposite end, so reaching either from the other crosses the floor his loop
    # actually covers (safely, lucid, but not for free — it is the whole width).
    r.wall_x(8, 9.6, -19.4)       # nook B south bracket
    r.wall_x(8, 9.6, -17.8)       # nook B north bracket
    r.wall_z(-19.4, -17.8, 9.6)   # nook B end cap — code half B is scrawled here

    r.wall_x(-9.6, -8, -15.4)     # dispenser-B alcove south bracket
    r.wall_x(-9.6, -8, -13.8)     # dispenser-B alcove north bracket
    r.wall_z(-15.4, -13.8, -9.6)  # alcove end cap — the dispenser mounts here

    # Glow lintels over each recess mouth — playtest 6 walked straight past the
    # nooks; a lit threshold marks "there is a space here" from across the zone.
    r.block((0.12, 0.14, 1.6), (-8, 2.7, -8.6), "glow")   # nook A mouth
    r.block((0.12, 0.14, 1.6), (8, 2.7, -18.6), "glow")   # nook B mouth
    r.block((0.12, 0.14, 1.6), (-8, 2.7, -14.6), "glow")  # alcove B mouth

    # The nook end caps sit at x=±9.6 with inner faces at ±9.48 (walls are 0.24
    # thick). room10.ts originally authored these at ±9.55 — INSIDE the wall, so
    # the wall rendered over them and the code was invisible (playtest 6). ±9.46
    # is the fixed value; do not "tidy" it back toward the wall.
    r.scrawl("3 1 – –", (-9.46, 1.7, -8.6), math.pi / 2, 2.2, sid="codeScrawlA")
    r.scrawl("– – 7 5", (9.46, 1.7, -18.6), -math.pi / 2, 2.2, sid="codeScrawlB")
    # Zone hints, each on the wall OPPOSITE the recess it points at, so it is
    # readable from the open floor rather than from inside the nook.
    r.scrawl("they scratch their numbers\nwhere the west wall breaks",
             (7.86, 1.7, -5), -math.pi / 2, 2.8)
    r.scrawl("the rest is written\nwhere the east wall breaks",
             (-7.86, 1.7, -16.5), math.pi / 2, 2.8)
    # On gate 2's south face, facing +Z back at the player as they walk up to it.
    r.scrawl("the doors only open\nfor the calm ones", (-5, 1.7, -9.85), 0, 2.6)

    # Z1's dispenser, three steps from spawn — the catch-reset safety net.
    # West-wall mount, x-thin, faceplate PINNED east into the room.
    r.interactable("dispenser10a", "dispenser", (0.16, 0.75, 0.55), (-7.72, 1.45, 4),
                   "dispenser", "use the dispenser", facing="px")
    # Z3's dispenser, proud of the alcove end cap's inner face (x=-9.48) rather
    # than flush in it. Facing PINNED 'px' per the facing audit — alcove mounts
    # are exactly the fragile case the heuristic gets wrong (room7 and room8
    # both shipped a MEDICATION plate pointing into a wall this way).
    r.interactable("dispenser10b", "dispenser", (0.16, 0.75, 0.55), (-9.46, 1.45, -14.6),
                   "dispenser", "use the dispenser", facing="px")
    # Z4's safety dispenser — see the TIMER SOFT-LOCK AUDIT above. No orderly
    # ever reaches Z4, so there is no patrol clearance to worry about here.
    r.interactable("dispenser10c", "dispenser", (0.16, 0.75, 0.55), (-7.72, 1.45, -23),
                   "dispenser", "use the dispenser", facing="px")
    r.interactable("keypad10", "keypad", (0.4, 0.5, 0.14), (1.35, 1.45, -25.75),
                   "pad", "use the keypad", facing="pz")
    r.interactable("exitdoor", "door", (2, 3, 0.2), (0, 1.5, -26),
                   "door", "the exit door", facing="pz")

    # 14 fittings down the spine, then one inside each of the three recesses.
    #
    # DEVIATION from room10.ts, which lights the spine only. Verified by A/B
    # screenshot rather than assumed: with no fitting inside them the recesses
    # render as pure black voids. The code scrawls survive that (Label3D is
    # shaded=false, so they read regardless) but everything shaded does not —
    # in alcove B the dispenser's entire body disappears and the only things
    # left are its unshaded display and tray strip, floating in black. A player
    # looking into that alcove sees an amber sliver, not a dispenser.
    #
    # This follows the ward's own convention rather than breaking it: room6.ts
    # lights its dispenser alcove ({pos:[6.3,-5.3]}) and room7.ts its dispenser
    # nook ({pos:[-6.5,1.05]}). room10.ts is the outlier, and it is the one room
    # where all three recesses carry something the player is required to find.
    r.light(0, 6)
    r.light(0, 2)
    r.light(4, -2)
    r.light(-4, -2)
    r.light(4, -6)
    r.light(-4, -6)
    r.light(0, -9)
    r.light(4, -12)
    r.light(-4, -12)
    r.light(4, -16)
    r.light(-4, -16)
    r.light(0, -19)
    r.light(0, -22)
    r.light(0, -25)
    r.light(-8.8, -8.6)    # nook A — code half A
    r.light(8.8, -18.6)    # nook B — code half B
    r.light(-8.8, -14.6)   # alcove B — dispenser
    return r

def room12():
    r = Room("room12", "the Asylum Floor",
             floor=(-10, 12, -28, 46),
             spawn=(0, 44, 0),
             exits=[("room13", -1, 1, -27.9, -26.8)])

    # --- Z1, the entry hall — x [-10,10] z [36,46]. Dispenser A; the last
    # cabinet on this side of GATE B and of every orderly on the floor.
    r.wall_x(-10, 10, 46)         # south cap, behind spawn
    r.wall_z(36, 46, -10)         # west wall
    r.wall_z(36, 46, 10)          # east wall

    # GATE B — the Z1/Z2 boundary at z=36. The doorway gap is x [-2,2]; the
    # panel that fills it exists (and blocks) ONLY while unmedicated, so the
    # crossing costs a shift to lucid, i.e. a pill. Mesh and collider are
    # authored as one state-filtered block here; the TS split them across
    # block(...,'unmed') + solid(...,'unmed') over the identical footprint.
    r.wall_x(-10, -2, 36)
    r.wall_x(2, 10, 36)
    r.block((4, 3, 0.24), (0, 1.5, 36), "wall", "unmed",
            collider=(-2, 2, 35.88, 36.12))

    # --- Z2, the quiet ward — x [-10,10] z [20,36]. Orderly C alone; his loop
    # is skewed west, leaving the whole east wall — nook C included — a flat
    # 7m off his nearest leg. Sight range is 6m, so the nook is unseeable from
    # patrol full stop: the exposure is the crossing, not the read.
    r.wall_z(20, 36, -10)         # west wall, unbroken
    r.wall_z(20, 26, 10)          # east wall, south of the nook mouth
    r.wall_z(28, 36, 10)          # east wall, north of the nook mouth

    r.wall_x(10, 12, 26)          # nook C south bracket
    r.wall_x(10, 12, 28)          # nook C north bracket
    r.wall_z(26, 28, 12)          # nook C end cap — code half 1 is scrawled here
    r.block((0.12, 0.14, 2), (10, 2.7, 27), "glow")   # glow lintel, nook C mouth

    # A central occluder inside orderly C's loop's open interior — not on the
    # path. The Godot orderly tests occlusion with a real RayCast3D against
    # LAYER_WORLD_STATIC, so this collider IS the occluder; no hand-authored
    # AABB list (the TS ISLAND_C/NOOK_C arrays) is needed or possible.
    r.block((3, 1.8, 4), (-2, 0.9, 28), "wall2", collider=(-3.5, -0.5, 26, 30))

    # Z2/Z3 boundary at z=20 — an OPEN doorway, no gate. Both code halves are
    # unmed-only anyway and the whole stretch is already sealed at both ends
    # by GATE B and GATE C; a third gate here would only add a toll the design
    # does not need, and it would turn the long walk back to dispenser12c into
    # a dead end.
    r.wall_x(-10, -2, 20)
    r.wall_x(2, 10, 20)

    # --- Z3, the day hall — x [-10,10] z [-8,20]. The biggest single chamber
    # in the game: 28m deep, 20m wide. Two orderlies, counter-rotating — A
    # runs the outer rectangle one way, B a smaller inner rectangle the other
    # way — so they read as two independent patrols crossing each other's
    # ground rather than a pair walking in step. Code half 2 sits in an east
    # nook 7m off A's nearest leg and farther off B's: same
    # unseeable-from-patrol guarantee as nook C.
    r.wall_z(-8, 20, -10)         # west wall, unbroken
    r.wall_z(-8, 4, 10)           # east wall, south of the nook mouth
    r.wall_z(6, 20, 10)           # east wall, north of the nook mouth

    r.wall_x(10, 12, 4)           # nook hall south bracket
    r.wall_x(10, 12, 6)           # nook hall north bracket
    r.wall_z(4, 6, 12)            # nook hall end cap — code half 2 is scrawled here
    r.block((0.12, 0.14, 2), (10, 2.7, 5), "glow")    # glow lintel, nook hall mouth

    # Two occluders: one in the gap between the outer and inner loops, one
    # against the west wall outside A's west leg — multiple shadows across the
    # one patrolled space, not just the nook itself.
    r.block((1, 1.8, 2), (1.5, 0.9, 6), "wall2", collider=(1, 2, 5, 7))
    r.prop((1, 1.6, 2), (-8.8, 13))

    # GATE C — the Z3/Z4 boundary at z=-8, the far end of the no-refill
    # stretch. Same unmed-only seal as GATE B.
    r.wall_x(-10, -2, -8)
    r.wall_x(2, 10, -8)
    r.block((4, 3, 0.24), (0, 1.5, -8), "wall", "unmed",
            collider=(-2, 2, -8.12, -7.88))

    # --- Z4, the supply room — x [-10,10] z [-18,-8]. Safe. Dispenser B, the
    # first cabinet since dispenser12c back in Z2.
    r.wall_z(-18, -8, -10)
    r.wall_z(-18, -8, 10)

    # Z4/Z5 boundary at z=-18 — open doorway. Nothing left to gate; the finale
    # does not need another toll on top of the one the floor just paid.
    r.wall_x(-10, -2, -18)
    r.wall_x(2, 10, -18)

    # --- Z5, the last door — x [-10,10] z [-26,-18]. Safe, keypad, exit.
    r.wall_z(-26, -18, -10)
    r.wall_z(-26, -18, 10)
    r.wall_x(-10, -1, -26)        # north, west of the door gap
    r.wall_x(1, 10, -26)          # north, east of the door gap

    # vestibule beyond the exit door, x [-1,1] z [-28,-26]
    r.wall_z(-28, -26, -1)
    r.wall_z(-28, -26, 1)
    r.wall_x(-1, 1, -28)
    r.block((1.8, 2.6, 0.06), (0, 1.4, -27.8), "glow")  # warm glow beyond

    # exit door collider — locked until the code is entered; room12.gd drops
    # it in place via main.unlock_door(). (The TS shoved its minX to 999.)
    r.solid(-1, 1, -26.13, -25.87, name="DoorCollider")

    # --- scrawls. All unmed-only, as always. Every x is 0.02m clear of the
    # wall's inner face (walls are 0.24 thick, so a wall centred on -10 has
    # its face at -9.88), never on the centre-line.
    r.scrawl("one cabinet past the first gate.\nnothing after it. remember.",
             (-9.86, 1.7, 38), math.pi / 2, 2.8)
    r.scrawl("the whole floor breathes\nthe same stale air",
             (9.86, 1.7, 42), -math.pi / 2, 2.4)
    r.scrawl("the ward keeps half its mind\nbehind the east wall",
             (-9.86, 1.7, 28), math.pi / 2, 2.6)
    # Code half 1, on nook C's end cap (wall at x=12, inner face 11.88).
    r.scrawl("8 5 – –", (11.86, 1.7, 27), -math.pi / 2, 2.2, sid="codeScrawlA")
    r.scrawl("the hall keeps two of them.\nthey never walk the same way twice.",
             (-9.86, 1.7, 10), math.pi / 2, 2.8)
    # Code half 2, on the hall nook's end cap.
    r.scrawl("– – 6 3", (11.86, 1.7, 5), -math.pi / 2, 2.2, sid="codeScrawlB")
    # On GATE C's north face, read from inside the stretch.
    r.scrawl("the far door doesn't care\nhow you got here.",
             (-5, 1.7, -7.86), 0, 2.6)
    r.scrawl("the last cabinet.\nafter this, it's just the door.",
             (-9.86, 1.7, -15), math.pi / 2, 2.4)

    # --- interactables. Size tuples are in WORLD axes, so a west-wall mount
    # is thin in X: (0.16, 0.75, 0.55), NOT the canonical (0.55, 0.75, 0.16)
    # a z-wall mount uses. The generator swaps to canonical itself once it
    # knows the facing. Every facing below is PINNED — the inferFacing
    # heuristic misreads alcove/nook mounts, which is a bug the TS build
    # actually shipped in room 7.
    r.interactable("dispenser12a", "dispenser", (0.16, 0.75, 0.55),
                   (-9.72, 1.45, 42), "dispenser", "use the dispenser",
                   facing="px")
    r.interactable("dispenser12b", "dispenser", (0.16, 0.75, 0.55),
                   (-9.72, 1.45, -13), "dispenser", "use the dispenser",
                   facing="px")
    # The pocket's ONE station — load-bearing for the one-pill solve, not just
    # a timer backstop: this is where the pill spent on GATE B is replaced
    # before the long unmedicated walk to GATE C. Flush on the west wall, 1m
    # south of GATE B, north of orderly C's rectangle (his north leg is
    # z=33.5, so z=35 clears it by 1.5m) and west of his x=-7 leg — well off
    # the route to nook C on the far side.
    r.interactable("dispenser12c", "dispenser", (0.16, 0.75, 0.55),
                   (-9.72, 1.45, 35), "dispenser", "use the dispenser",
                   facing="px")
    r.interactable("keypad12", "keypad", (0.4, 0.5, 0.14),
                   (1.35, 1.45, -25.75), "pad", "use the keypad", facing="pz")
    r.interactable("exitdoor", "door", (2, 3, 0.2), (0, 1.5, -26),
                   "door", "the exit door", facing="pz")

    # --- lights. 22 fittings over 74m: dense at the two gates and the exit,
    # sparser down the long chambers so the hall never resolves all at once.
    #
    # ONE PORT DEVIATION, at GATE B. room12.ts puts a fitting at (0, 36) —
    # dead centre of the gate — which in three.js is fine, because its room
    # lights cast no shadows and simply shine through the gate slab. Here
    # every third fitting IS a shadow caster, and this one is index 3, so at
    # (0, 36) it sat sealed *inside* the unmed gate panel (x[-2,2], y 0..3,
    # z 35.88..36.12): while unmedicated it lit nothing at all, and it popped
    # on the instant the panel vanished. Verified by screenshot, both states.
    # Moved 1.4m north into Z1 so it lights the sealed slab from the side the
    # player approaches it from, and still throws through the gap once the
    # panel is gone. Placement intent unchanged; nothing else about the light
    # plan is touched. (GATE C has no fitting of its own in the TS either, and
    # that one is left alone — you can only ever cross a gate lucid, and lucid
    # ambient renders the whole chamber legible.)
    for x, z in [
        (0, 44), (-5, 40), (5, 40), (0, 37.4),        # Z1 + GATE B
        (5, 32), (-5, 32), (5, 27), (-2, 28), (5, 23), (-5, 23),   # Z2
        (0, 17), (-7, 14), (5, 11), (-3, 8), (5, 5), (0, 0), (5, -4), (-5, -4),  # Z3
        (0, -13),                                      # Z4
        (0, -20), (0, -23), (0, -26),                  # Z5
    ]:
        r.light(x, z)
    return r

def room13():
    shell_x = 4.0
    sq_min_z, sq_max_z = -24.0, 16.0
    start_gap = 5.0
    min_gap = 1.0
    slab_thick = shell_x - min_gap / 2.0        # 3.5 — mirrors room13.gd
    slab_len = sq_max_z - sq_min_z              # 40
    slab_mid_z = (sq_min_z + sq_max_z) / 2.0    # -4
    # Inner face at +-start_gap/2, so the body centre sits half a thickness out.
    slab_x = start_gap / 2.0 + slab_thick / 2.0  # 4.25

    r = Room("room13", "the Last Ward",
             floor=(-shell_x, shell_x, -32, 22),
             spawn=(0, 20, 0),
             exits=[("room14", -1, 1, -31.9, -30.8)])

    # Z1 — the entry hall, z [16, 22]. Spawn, safe, deliberately NO dispenser.
    r.wall_x(-shell_x, shell_x, 22)      # south cap, behind spawn
    r.wall_z(-32, 22, -shell_x)          # west perimeter, full length
    r.wall_z(-32, 22, shell_x)           # east perimeter, full length

    # Z3 — the exit vestibule, z [-30, -24], and the doorway beyond it.
    r.wall_x(-shell_x, -1, -30)
    r.wall_x(1, shell_x, -30)
    r.wall_z(-32, -30, -1)
    r.wall_z(-32, -30, 1)
    r.wall_x(-1, 1, -32)
    r.block((1.8, 2.6, 0.06), (0, 1.4, -31.8), "glow")   # the way out

    # The squeeze stretch, z [-24, 16] — the two moving slabs. Authored at the
    # full 5m gap; room13.gd is the only thing that ever moves them.
    r.mover("SlabEast", (slab_thick, WALL_H, slab_len), (slab_x, WALL_Y, slab_mid_z))
    r.mover("SlabWest", (slab_thick, WALL_H, slab_len), (-slab_x, WALL_Y, slab_mid_z))

    r.scrawl("the last hallway.\nnothing left to take.",
             (-3.85, 1.6, 19), math.pi / 2, 2.6)
    r.scrawl("the calm makes it smaller.\nthe raw makes it watched.",
             (3.85, 1.6, 19), -math.pi / 2, 2.8)
    r.scrawl("it lets you out.\nit just wanted to see you choose.",
             (-3.85, 1.6, -27), math.pi / 2, 2.4)

    r.ward_lights([(0, z) for z in
                  (20, 16, 10, 4, -2, -8, -14, -20, -24, -26, -29)])
    return r


# --- ROOM 11 — the Treatment Corridor --------------------------------------
# THE FIRST ROOM TO USE VERTICALITY (TIER 1 — height zones + ramps, one
# implicit '__flat' level; stacked levels belong to room 17 and nothing here
# needs them).
#
# Three chambers, north to south:
#   Z1 the entry hall     x[-9,9]  z[12,22]   (spawn, dispenser11, y=0)
#   Z2 the ward floor     x[-9,9]  z[-10,12]  (split level — see below)
#   Z3 the exit chamber   x[-9,9]  z[-18,-10] (safe, keypad, door, y=0)
#
# Z2 is a single-valued floor height: y=0 everywhere EXCEPT a railed platform
# along the east wall (x[1,9] z[0,8] at MEZZ_Y) and the ramp bridging it down
# to the lower floor (x[1,9] z[8,10], 0.9 -> 0 along +z). The route through Z2
# goes UP to read the code off the east wall and back DOWN to continue.
#
# THREE THINGS THE ENGINE DELIBERATELY DOES NOT DO FOR YOU (core/levels.gd):
#   1. A raised region is NEVER a collider. What keeps the player up there is
#      the railings below — ordinary solids, authored by hand.
#   2. Nothing renders a zone's floor. The room's one floor mesh is still down
#      at y=0, so the platform needs an authored opaque BOX slab (never a
#      plane — a plane is single-sided and vanishes from underneath, which is
#      exactly the view the lower ward has of it).
#   3. BlockDef has no X-tilt, so the ramp's VISUAL is a 4-step stand-in. The
#      walkable surface is smooth regardless: it is the ramp() region, not the
#      steps.
# Ramps beat height zones in floor_height_at, so the ramp's high end (y=MEZZ_Y
# at its min-z end, z=8) is authored flush against the platform's own z=8 edge
# and the seam is continuous with nothing to tune.
#
# CEILING: the ceiling plane is one flat surface at y=3 regardless of floor
# height, so MEZZ_Y stays modest. Eye height on the platform is 0.9+1.62=2.52,
# i.e. 0.48m of headroom — the figure src/rooms/room11.ts and
# ROOM_AUTHORING.md's own worked example both settle on for a raised ZONE.
# (The generator's ~0.95m headroom warning is a tier-2 check: it reads a
# level's base_y, not a zone's y, so it is silent here by design.)
#
# GATE 1 (Z1/Z2, z=12) and GATE 2 (Z2/Z3, z=-10) are unmed-sealed: solid while
# raw, open while calm. on_enter forces unmed at the threshold so gate 1
# always costs a pill however the player left room 10. PILLS_MAX is 1
# game-wide, so dispenser11b sits inside the pocket between the gates — without
# it GATE 2 could never be paid (see the INTERIM note in room11.ts).
#
# TWO ORDERLIES, ONE PER HEIGHT BAND. Room 11 is tier 1, so the categorical
# cross-level sight/catch gate does NOT apply — both orderlies are on '__flat'
# and their separation is pure geometry: LOWER's rectangle x[-8,-6] never comes
# within his 6m sight range of the platform/ramp footprint (min x-gap 7m) nor
# of either gate opening (8.06m); UPPER's strip hugs the platform's west rail
# 6.78m from the code on the east wall. The west rail collider additionally
# occludes across the boundary, since a collider is a full-height wall to
# Orderly._occluded()'s raycast.
#
# CODE: 2593.

def room11():
    MEZZ_Y = 0.9

    r = Room("room11", "the Treatment Corridor",
             floor=(-9, 9, -20, 22),
             spawn=(0, 20, 0),
             exits=[("room12", -1, 1, -19.9, -18.8)])

    # --- Z1, the entry hall ------------------------------------------------
    r.wall_x(-9, 9, 22)           # south cap, behind spawn
    r.wall_z(12, 22, -9)          # west wall
    r.wall_z(12, 22, 9)           # east wall

    # GATE 1 — Z1/Z2 boundary at z=12. The panel mesh and its collider are one
    # call: layer 8 (solid_unmed_only) is what actually blocks, the StateObject
    # wrapper only hides the mesh (core/state_object.gd).
    r.wall_x(-9, -2, 12)
    r.wall_x(2, 9, 12)
    r.block((4, 3, 0.24), (0, 1.5, 12), "wall", "unmed",
            collider=(-2, 2, 11.88, 12.12), name="Gate1")

    # --- Z2, the split-level ward floor ------------------------------------
    # Perimeter runs unbroken: the platform is an interior feature, not a wall
    # recess, so there is no gap to carve for it.
    r.wall_z(-10, 12, -9)         # west wall
    r.wall_z(-10, 12, 9)          # east wall

    # The walkable verticality — two lines, zero collision impact.
    r.height_zone(1, 9, 0, 8, MEZZ_Y)
    r.ramp(1, 9, 8, 10, "z", MEZZ_Y, 0)

    # The platform's own floor: an opaque slab, top face exactly at MEZZ_Y.
    # NO COLLIDER — a collider here would wall the platform off instead of
    # holding it up.
    r.platform(1, 9, 0, 8, MEZZ_Y, name="MezzSlab")

    # Visual ramp: 4 steps of 0.5m across the 2m run, full width, rising from
    # the ground mouth (z=10) to the platform edge (z=8). Also no colliders.
    RAMP_STEPS = 4
    r.stair_steps(RAMP_STEPS, MEZZ_Y, width=8, run=0.5, cross=5, start=9.75,
                 name_fmt="RampStep%d")

    # RAILINGS — the only thing keeping anyone on the platform. West is the
    # full combined edge of platform AND ramp (a sideways step off either drops
    # up to 0.9m onto nothing); north is the platform's far edge, which the
    # ramp does not reach. East is the room's real perimeter wall and south
    # (z=10) is the ramp's ground-level mouth, so neither needs one.
    # ONE collider for the whole west run, z[0,10] — platform and ramp alike.
    # The VISUAL is split, because a single 10m block at a constant y 0.9..1.8
    # is right over the platform but leaves a 0.68m gap under itself at the
    # ramp's low end, where it reads as a slab floating in mid-air rather than
    # as a railing (confirmed by screenshot). The ramp segments below sit on
    # the step tops instead. Purely cosmetic: the collider is unchanged and
    # full-height either way, so nothing about blocking, occlusion or patrol
    # clearance moves.
    r.railing("z", 0, 8, cross=1, platform_y=MEZZ_Y,
             collider=(0.88, 1.12, 0, 10), name="RailWest")
    for i in range(RAMP_STEPS):
        step_top = MEZZ_Y * (i + 1) / RAMP_STEPS
        z_center = 10 - 0.25 - i * 0.5
        r.railing("z", z_center - 0.25, z_center + 0.25, cross=1,
                 platform_y=step_top, collider=False, name="RailWestRamp%d" % i)
    r.railing("x", 1, 9, cross=0, platform_y=MEZZ_Y, name="RailNorth")

    # Lit threshold at the ramp's ground-level mouth — the same "a glow marks
    # a way through" convention every nook mouth in the ward uses.
    r.block((2, 0.14, 0.12), (5, 2.7, 10.06), "glow")

    # GATE 2 — Z2/Z3 boundary at z=-10.
    r.wall_x(-9, -2, -10)
    r.wall_x(2, 9, -10)
    r.block((4, 3, 0.24), (0, 1.5, -10), "wall", "unmed",
            collider=(-2, 2, -10.12, -9.88), name="Gate2")

    # --- Z3, the exit chamber ----------------------------------------------
    r.wall_z(-18, -10, -9)
    r.wall_z(-18, -10, 9)
    r.wall_x(-9, -1, -18)         # north, west of the door gap
    r.wall_x(1, 9, -18)           # north, east of the door gap

    # vestibule beyond the exit door, x [-1,1] z [-20,-18]
    r.wall_z(-20, -18, -1)
    r.wall_z(-20, -18, 1)
    r.wall_x(-1, 1, -20)
    r.block((1.8, 2.6, 0.06), (0, 1.4, -19.8), "glow")

    # keypadDoor's collider (depth 0.2 -> +-0.1 about the wall line).
    r.solid(-1, 1, -18.1, -17.9, name="DoorCollider")

    # --- scrawls -----------------------------------------------------------
    r.scrawl("two doors ahead. one cabinet\nbetween them. find it.",
             (-8.85, 1.65, 17), math.pi / 2, 2.6)
    r.scrawl("the hallway forgets\nhow long it's been",
             (-8.85, 1.65, 20), math.pi / 2, 2.4)
    r.scrawl("something keeps the low floor.\nsomething else keeps the high one.",
             (8.85, 1.65, 13), -math.pi / 2, 2.6)
    r.scrawl("the floor climbs on the east.\nhe never follows it up.",
             (8.85, 1.65, 10.5), -math.pi / 2, 2.6)
    # THE CODE — on the east wall at PLATFORM eye height, not ground height, so
    # it only reads to someone who has climbed the ramp. Proud of the wall face
    # by 0.1 rather than the usual 0.03 (room11.ts carries the same number).
    r.scrawl("2 5 9 3", (8.78, MEZZ_Y + 1.65, 4), -math.pi / 2, 2.6,
             sid="codeScrawl")
    r.scrawl("it opens for the calm.\nnot for you, yet.",
             (-5, 1.65, -9.85), 0.0, 2.4)
    r.scrawl("the last cabinet.\nafter this, it's just the door.",
             (-8.85, 1.65, -14), math.pi / 2, 2.4)

    # --- interactables -----------------------------------------------------
    # All three dispensers hang off a wallZ wall, so they are thin in X and
    # their facing is pinned rather than inferred.
    r.interactable("dispenser11", "dispenser", (0.16, 0.75, 0.55),
                   (8.8, 1.45, 17), "dispenser", "use the dispenser",
                   facing="nx")
    # In-pocket station: PILLS_MAX is 1, so without this GATE 2 can never be
    # paid. East wall, 1m north of the ramp mouth, clear of the ramp footprint
    # (z<=10) and 14.9m from orderly LOWER's nearest patrol point.
    r.interactable("dispenser11b", "dispenser", (0.16, 0.75, 0.55),
                   (8.8, 1.45, 11), "dispenser", "use the dispenser",
                   facing="nx")
    # Safety dispenser, Z3 — no orderly ever reaches this zone.
    r.interactable("dispenser11c", "dispenser", (0.16, 0.75, 0.55),
                   (-8.8, 1.45, -14), "dispenser", "use the dispenser",
                   facing="px")
    r.interactable("keypad11", "keypad", (0.4, 0.5, 0.14),
                   (1.35, 1.45, -17.81), "pad", "use the keypad", facing="pz")
    r.interactable("exitdoor", "door", (2, 3, 0.2), (0, 1.5, -18),
                   "door", "the exit door", facing="pz")

    # --- lights ------------------------------------------------------------
    # Two of these (z=12 and z=-10) sit on a gate's plane by design — see
    # room11.gd's header for the shadow audit.
    r.ward_lights([(0, 20), (0, 16), (0, 12), (-7, 8), (-7, 1), (-7, -6),
                  (5, 6), (5, 2), (0, -10), (0, -14), (0, -17)])
    return r




# --- ROOM 14 — the Hold ----------------------------------------------------
# The wing exhales. Room 13 gave nothing back, so this one opens with a
# dispenser five meters from spawn and asks exactly one new thing: a gate that
# a floor plate holds open only while something's weight is on it, with the
# plate far enough from the gate that being on it and being through it are
# mutually exclusive. One base-tuned orderly paces a line that crosses the
# plate — the wing's reintroduction of the threat, and the second half of the
# teach (his patrol never stops, even lucid when you cannot see him, so he can
# carry the plate for you).
#
# No keypad and no code. Three honest routes (spec: room14-pressure-plates):
#   A solo sprint    — step on, run the 1.38m plate-to-gate gap before the
#                      0.7s settle window closes. 0 pills.
#   B let him carry  — wait behind the crate, walk through while his leg
#                      crosses the plate. 0 pills unmed, 1 lucid for safety.
#   C pay to be safe — lucid first, then A or B risk-free. 1 pill.
#
# THE PLATE IS DELIBERATELY NOT STATE-FILTERED. State-filtering it would mean
# the mechanism simply does not exist in one ward state, which would break
# exactly the safe route this room wants to teach: the STATE is the tool here,
# not a gate on the mechanism.
#
# Geometry that is load-bearing rather than decorative, and must not drift:
#   plate x[-1.3,1.3] z[-12.5,-11.3]   straddles the patrol line at z=-11.9
#   gate wall z=-14, opening x[-1,1]   inner face z=-13.88
#   plate-to-gate gap                  13.88 - 12.5 = 1.38m
#   settle window (room14.gd)          0.7s x 3.4 m/s = 2.38m of coverage
# Widening the plate northward, or moving the gate wall south, deletes the
# failure the room exists to produce.

def room14():
    r = Room("room14", "the Hold",
             floor=(-5, 5, -17, 9),
             spawn=(0, 8, 0),
             exits=[("room15", -1, 1, -16.9, -16.2)])

    # perimeter — floor x[-5,5] z[-17,9], spawn end at +z (south)
    r.wall_x(-5, 5, 9)            # south cap, behind spawn
    r.wall_z(-17, 9, -5)          # west
    r.wall_z(-17, 9, 5)           # east
    r.wall_x(-5, 5, -17)          # north cap

    # gate wall, z=-14 — a 2m opening x[-1,1], held by the plate, never a
    # keypad. The opening's collider is named so room14.gd can re-engage it:
    # this is the ONE collider in the ward that closes again after opening,
    # which is why it goes through DeferredGate (core/deferred_gate.gd) and
    # never straight through main.unlock_door.
    r.wall_x(-5, -1, -14)
    r.wall_x(1, 5, -14)
    r.solid(-1, 1, -14.1, -13.9, name="GateCollider")

    # the plate, straddling his patrol line. One call, two shapes — trigger
    # and flush 4cm mesh — so the visible plate and its firing bounds cannot
    # drift. No collider, which is both the mechanic (it stays walkable) and
    # what lets his patrol cross it as bare floor with no special-casing.
    r.plate("plate14", -1.3, 1.3, -12.5, -11.3)

    # waiting crate near the gate — occluder + cover for route B
    r.prop((0.9, 1.0, 0.6), (3, -13))

    # vestibule glow — the way out reads from across the room once it opens
    r.block((1.8, 2.6, 0.06), (0, 1.4, -16.8), "glow")

    # vestibule trigger — fires the "through" beat once, past the gate
    r.trigger("vestibule14", -5, 5, -16, -14.2)

    # Both scrawls sit far outside his reach — nearest patrol point is
    # (-4.2,-11.9) at 13.9m for the west one, (4.2,-11.9) at 9.9m for the
    # east one, against the 8.2m inspection-point floor.
    r.scrawl("it only holds the door\nwhile it's heavy.",
             (-4.85, 1.65, 2), math.pi / 2, 2.6)
    r.scrawl("he never stopped walking.\nyou just stopped seeing him.",
             (4.85, 1.65, -2), -math.pi / 2, 2.6)

    # Entry alcove, ~5m from spawn, behind no gate and ~19.6m from the nearest
    # patrol point. A deliberate departure from the "pressure, not comfort"
    # dispenser rule: this room has no unmed-sealed pocket and no lucid-gated
    # action at all, and it follows the one room in the game with no dispenser.
    # West wall, so the faceplate points east — PINNED, never inferred.
    r.interactable("dispenser14", "dispenser", (0.16, 0.75, 0.55), (-4.8, 1.45, 7.3),
                   "dispenser", "use the dispenser", facing="px")
    # The gate itself is scenery the room script swings; room14.gd's
    # availability filter makes it permanently un-interactable, because this
    # door is opened by weight and by nothing else.
    r.interactable("gate14", "door", (2, 3, 0.2), (0, 1.5, -14),
                   "door", "the gate", facing="pz")

    r.light(0, 6)
    r.light(0, 1)
    r.light(0, -4)
    r.light(3, -12)
    r.light(-3, -12)
    r.light(0, -15.5)
    return r



# --- ROOM 17 — the Gallery Ward ---------------------------------------------
# THE VERTICALITY SPIKE, and the first room in the ward built on TIER 2 of
# core/levels.gd: two genuinely stacked walkable surfaces over the SAME XZ
# rectangle. Room 11 faked a mezzanine with one height zone on one level; this
# room hangs a railed GALLERY (level 'balcony', y 3.4) over a sealed POCKET
# (level 'ground', y 0) on the exact same x[-9,9] z[-6,10] footprint, each with
# its own orderly, and the engine means it literally.
#
# THE SHAPE. The room obviously continues north of spawn, and a wall SEALS it
# at z=16 across the whole width — no keypad, no gate, no unmed-only panel,
# just wall, forever. The only way on is UP the east stairwell (x[6,8],
# z[16]->z[10]), ACROSS the gallery, and back DOWN a hole cut in the gallery's
# own decking (the west shaft, x[-8,-6] z[4,8]) into the pocket, where the exit
# keypad and its code clue live. Up, across, down — the flat route was never on
# the table.
#
#   ground   base_y 0.0   floor x[-9,9] z[-8,34]   vestibule + pocket + hall
#   balcony  base_y 3.4   floor x[-9,9] z[-6,10]   overhangs the pocket exactly
#   ceiling_y 6.0         balcony headroom 6.0 - 3.4 - 1.62 = 0.98m
#
# WHAT IS AUTHORED HERE THAT NOTHING GENERATES:
#
#  1. THE BALCONY'S OWN FLOOR. There is one ceiling plane per room and no
#     engine draws a level's floor, so the gallery deck is four authored
#     opaque BOXES (never planes — a plane is single-sided and would be
#     invisible from the pocket) with their top face at exactly 3.4. Their
#     underside IS the pocket's ceiling, for free, by ordinary opaque
#     occlusion. They carry NO collider: a collider there would wall the
#     gallery off instead of holding it up. The four pieces leave the west
#     shaft's x[-8,-6] z[4,8] rectangle open — that hole is the descent.
#
#  2. UPPER VISUAL BANDS. wall_x/wall_z meshes are 3m tall, so above every
#     wall this room would be open to the 6m ceiling. band_x/band_z close
#     y3..6. They are deliberately collider-free: containment is the 0..3m
#     wall's job and colliders are infinite in Y anyway.
#
#  3. LEVEL-TAGGED RAILINGS. Every open gallery edge that is not a real wall
#     or a stair mouth gets a railing whose collider is tagged level
#     'balcony'. THE TAG IS THE WHOLE POINT: an untagged collider blocks on
#     every level, which is exactly right for a real wall and catastrophically
#     wrong for a railing — an untagged rail at z=10 would be an invisible
#     wall across the middle of the pocket 3.4m below it.
#
# THE TWO SEAM FIXES, carried from the design doc as room content:
#
#  A. THE LANDING GUARD IS ENTIRELY SOUTH OF z=10, WITH MARGIN. A ground
#     traveler in the pocket walking SOUTH across z=10 at x[6,8] enters the
#     east stairwell's footprint, where floor_height_at('ground', ...) answers
#     the stair's y_low end — a 3.4m instant lift with no climb. The guard
#     x[6.6,8] z[9.1,9.4] (tagged 'ground', so balcony travelers descending
#     are never subject to it) closes that. The FIRST version of it straddled
#     z=10 itself and walled the gallery off permanently: a climber arriving
#     from the south hall is ALSO level 'ground' for the entire ascent — the
#     flip only fires on FULLY CLEARING the stairwell (resolve_level, z<=10) —
#     so a guard whose radius-expanded footprint covered z=10 pushed him back
#     before he could ever land at z<=10, the flip never fired, and the
#     balcony was unreachable. Radius-expanded this guard ends at z=9.75, and
#     the biggest possible single frame step is 3.4 m/s * main.gd's 0.05s dt
#     clamp = 0.17m, so a climber stepping off z=10.0 lands no further south
#     than 9.83 — clear, flip fires, guard goes inert. DO NOT MOVE IT NORTH.
#     Its x starts at 6.6 rather than 6 so it stays >0.5m (orderly radius 0.4
#     + patrol margin 0.1) from ORDERLY-POCKET's (6,9) waypoint; the sliver
#     x[6,6.6] is not a gap, because the stair's flanking wall at x=6 already
#     blocks x<6.47 radius-expanded down to z=9.65 and this guard's own
#     expanded zone starts at x=6.25 — they overlap with no seam.
#
#  B. THE GROUND ORDERLIES GET A STAIRWELL-AWARE HEIGHT LOOKUP, and get it
#     for free — see room17.gd's _spawn_one. Orderly.setup's third argument
#     hands him WardLevels, and floor_height_at checks stairwells FIRST and
#     matches when the queried level is EITHER end of the stair, so a
#     'ground' orderly whose chase carries him into a stair mouth rides the
#     interpolated tread instead of keeping his root at y=0 and sinking into
#     the stepped blocks (which read as solid wall). It cannot change his
#     `level`: he never calls resolve_level, so the cross-level sight/catch
#     gates still hold categorically.
#
# THE PROOF THIS ROOM EXISTS FOR. ORDERLY-BALCONY (level 'balcony') and
# ORDERLY-POCKET (level 'ground') both patrol inside x[-9,9] z[-6,10] — the
# same rectangle — at 3.4 and 0. Orderly._player_is_vulnerable() gates BOTH
# sight and the contact catch on `_player_level() == level` BEFORE any
# distance, cone or occlusion math, so neither can ever perceive or catch the
# other's target, at any XZ distance, even standing directly on top of one
# another. Categorical, not "provably far enough" the way room 11's layout
# guarantee is.
#
# REACTION-TIME AUDIT (min inspection distance ~8.2m, which also clears the
# flat 6m sight range outright — distances from the NEAREST reachable point
# on the relevant patrol):
#   code digits, pocket north wall (3.0, -5.85) vs ORDERLY-POCKET
#     (x[0,6] z[3,9]; nearest (3,3)): 8.85m
#   code clue line (-4.5, -5.85) vs ORDERLY-POCKET (nearest (0,3)): 9.97m
#   west-shaft hint, balcony (-8.85, 3.5) vs ORDERLY-BALCONY (x[2,6];
#     nearest (2,3.5)): 10.85m
#   dispenser17a (8.8, 31) vs ORDERLY-SOUTH (nearest (5,25)): 6.97m
#   dispenser17c (-8.8, 9) vs ORDERLY-POCKET (nearest (0,9)): 8.8m
# Stair mouths and the balcony landing are crossings, not stand-and-read
# spots, and are held to the moving-target standard rooms 5-12 use.
#
# EVERY COLLIDER IN THIS ROOM IS STATE-UNFILTERED. There is no unmed-sealed
# gate anywhere — the sealed wall is a permanent wall, not a paid gate — so
# circle_hits_solid_unmed can never find a trapped case at any XZ on either
# level, and the 45s medication timer expiring on the gallery, mid-stair or
# in the pocket is always a free instant revert. Exposure, never a soft-lock.
#
# CODE: 9137 (fresh against 4118/1907/6329/0452/2846/5216/3175/8563/2593).
# EXIT targets room18, which is not ported yet — room 17 is deliberately NOT
# registered in main.gd, so check_rooms' chain walk never reaches it.
def room17():
    GROUND_Y = 0.0
    BALCONY_Y = 3.4
    CEIL = 6.0
    SLAB_TH = 0.3
    # SLAB_YC (deck top face at 3.4) and RAIL_Y (0.45 above the deck) are now
    # computed inside platform()/railing() themselves — see those presets —
    # so both former local constants are gone rather than left unused.

    r = Room("room17", "the Gallery Ward",
             floor=(-9, 9, -8, 34),
             spawn=(0, 32, 0.0),
             exits=[("room18", -1, 1, -7.9, -6.8)])
    # Set BEFORE any band_*/level call: band_x/band_z read self.ceiling_y for
    # their upper edge, and the headroom warning reads it per level.
    r.ceiling_y = CEIL

    # --- the two levels and the two stairwells -----------------------------
    # levels[0] is what the Spawn marker is tagged with, so 'ground' first.
    #
    # 'balcony' declares NO height zone of its own on purpose: base_y already
    # answers 3.4 everywhere the level is queried (floor_rect is not consulted
    # by floor_height_at), so a zone equal to base_y would be dead data that a
    # later edit could silently desync from it.
    r.level("ground", GROUND_Y, (-9, 9, -8, 34))
    r.level("balcony", BALCONY_Y, (-9, 9, -6, 10))

    # y_low/level_at_low name the AXIS's MIN end, not the lower height: both
    # of these DESCEND as z increases, so y_low (3.4) > y_high (0).
    r.stairwell("stairEast", 6, 8, 10, 16, "z", BALCONY_Y, "balcony", GROUND_Y, "ground")
    r.stairwell("stairWest", -8, -6, 4, 8, "z", BALCONY_Y, "balcony", GROUND_Y, "ground")

    # --- shell -------------------------------------------------------------
    # Perimeter colliders are UNTAGGED, i.e. active on every level: a wall is
    # a wall on both floors. Their meshes stop at y=3, so each gets a band.
    r.wall_x(-9, 9, 34)                   # south cap, behind spawn
    r.wall_z(-8, 34, -9)                  # west perimeter
    r.wall_z(-8, 34, 9)                   # east perimeter
    r.band_x(-9, 9, 34)
    r.band_z(-8, 34, -9)
    r.band_z(-8, 34, 9)

    # Pocket north wall, z=-6, door gap x[-1,1]. Banded SOLID across the full
    # width: the doorway is a ground-level opening only, and the gallery's own
    # north edge sits on this line.
    r.wall_x(-9, -1, -6)
    r.wall_x(1, 9, -6)
    r.band_x(-9, 9, -6)

    # Vestibule beyond the exit door, x[-1,1] z[-8,-6]. Banded too, or the
    # 6m ceiling leaves it open over the top of its own walls.
    r.wall_z(-8, -6, -1)
    r.wall_z(-8, -6, 1)
    r.wall_x(-1, 1, -8)
    r.band_z(-8, -6, -1)
    r.band_z(-8, -6, 1)
    r.band_x(-1, 1, -8)
    r.block((1.8, 2.6, 0.06), (0, 1.4, -7.82), "glow")   # "way out" marker

    # THE SEALED WALL, z=16 — the room's whole thesis. The only gap in it is
    # the east stair's own x[6,8] mouth. Permanent, unfiltered, on every
    # level. Nothing in this room opens it.
    r.wall_x(-9, 6, 16)
    r.wall_x(8, 9, 16)
    r.band_x(-9, 6, 16)
    r.band_x(8, 9, 16)

    # --- east stairwell ----------------------------------------------------
    # Flanked by walls on both long sides: the inner face at x=6 and the outer
    # at x=8, which also closes the 1m dead gap to the east perimeter. Authored
    # full-height (y0..6) rather than wall+band, because this run climbs to the
    # gallery landing and a 3m wall would leave the top of it open.
    #
    # NOTE (generator limitation, cosmetic-adjacent): the emitter always builds
    # a collider's SHAPE 3m tall at y=1.5 regardless of the mesh, so these read
    # as 6m walls but their physics shape stops at y=3. WardCollision ignores Y
    # entirely, so blocking is unaffected on both levels; only Orderly's
    # RayCast3D occlusion test sees the difference, and there is nothing on the
    # gallery for it to occlude.
    for x in (6, 8):
        r.block((0.24, CEIL, 6), (x, CEIL / 2.0, 13), "wall2",
                collider=(x - WALL_HALF, x + WALL_HALF, 10, 16),
                name="StairEastWall%d" % x)

    # Lit threshold in the stair mouth — the ward's standing "a glow marks a
    # way through" convention (room 11 puts the same bar at its ramp mouth).
    # It earns its place here more than anywhere: at true UNMED ambient this
    # ward is near-black beyond a fitting's pool, and this 2m gap in the
    # sealed wall is the ONLY route out of the south hall.
    r.block((2, 0.14, 0.12), (7, 2.7, 16.0), "glow")

    # Stepped visual stand-ins. The WALKABLE slope is the StairwellDef's
    # smooth interpolation; a BoxMesh cannot tilt, so these just read as
    # stairs. NO COLLIDERS — a collider on a tread is a wall across the run.
    EAST_STEPS = 6
    r.stair_steps(EAST_STEPS, BALCONY_Y, width=2, run=1, cross=7, start=15.5,
                 name_fmt="StairEastStep%d")

    # --- west shaft --------------------------------------------------------
    # A hole cut straight through the gallery's own decking, not a walled run:
    # its long sides are open air on the balcony (that is what makes the
    # descent read as stepping off the walkway), so it gets no flanking walls
    # and no railing. The west perimeter at x=-9 is the only wall it hugs.
    WEST_STEPS = 5
    r.stair_steps(WEST_STEPS, BALCONY_Y, width=2, run=0.8, cross=-7, start=7.6,
                 name_fmt="StairWestStep%d")

    # --- the gallery deck --------------------------------------------------
    # Four opaque boxes, top face exactly on 3.4, covering x[-9,9] z[-6,10]
    # MINUS the west shaft's x[-8,-6] z[4,8]. No colliders, by the same rule
    # room 11's MezzSlab follows. The undersides are the pocket's ceiling.
    def deck(min_x, max_x, min_z, max_z, name):
        r.platform(min_x, max_x, min_z, max_z, BALCONY_Y, thickness=SLAB_TH, name=name)

    # Edge strip on the deck at the shaft's head. Same convention as the stair
    # mouth above, and the same reason: the shaft is a black rectangle in a
    # dim floor, and it is the only way down.
    r.block((2, 0.06, 0.14), (-7, BALCONY_Y + 0.03, 3.9), "glow")

    deck(-9, -8, -6, 10, "DeckWestLedge")   # 1m ledge west of the shaft
    deck(-6, 9, -6, 10, "DeckMain")         # everything east of the shaft
    deck(-8, -6, -6, 4, "DeckShaftNorth")
    deck(-8, -6, 8, 10, "DeckShaftSouth")
    # (x[-8,-6] z[4,8] deliberately left open — that hole is stairWest)

    # --- railings ----------------------------------------------------------
    # LEVEL-TAGGED, every one of them. Untagged, the z=10 rail alone would be
    # an invisible wall straight across the pocket 3.4m underneath it.
    def rail_x(min_x, max_x, z, name):
        r.railing("x", min_x, max_x, cross=z, platform_y=BALCONY_Y,
                 level="balcony", name=name)

    # South edge, z=10 — the open drop into the pocket, broken only by the
    # east stair's landing mouth at x[6,8].
    rail_x(-9, 6, 10, "RailSouthWest")
    rail_x(8, 9, 10, "RailSouthEast")
    # North edge: the pocket's own walls already close z=-6 on every level, so
    # only the door gap needs a rail — without it a gallery traveler walks out
    # over the vestibule the moment the keypad drops DoorCollider.
    rail_x(-1, 1, -6, "RailNorthDoorGap")

    # THE LANDING SEAM GUARD — ground-only, entirely south of z=10. See the
    # header's seam fix A before touching any of these four numbers.
    r.solid(6.6, 8, 9.1, 9.4, name="LandingGuard", level="ground")

    # --- exit door ---------------------------------------------------------
    # Untagged, so it blocks a gallery traveler too until the keypad drops it;
    # after that RailNorthDoorGap is what keeps the gallery closed.
    r.solid(-1, 1, -6.1, -5.9, name="DoorCollider")

    # --- scrawls -----------------------------------------------------------
    # Label3D renders MUCH wider than the authored `size` suggests; every one
    # of these is measured against the walls it sits on by tools/test_room17.
    r.scrawl("they raised the roof\nso no one has to share a floor",
             (8.85, 1.65, 24), -math.pi / 2, 2.6)
    # y 1.75 and size 2.4, not the usual 1.65/2.6: MEASURED, this two-liner's
    # rendered box is 3.12m tall (Label3D's box is the font's full line box,
    # not the inked glyphs) and at 1.65 its lower edge dipped below the floor.
    r.scrawl("the stairs are the only door\nthat opens both ways",
             (-8.85, 1.75, 21), math.pi / 2, 2.4)
    # Gallery eye height, west wall by the shaft: only readable from up here,
    # because the deck is the pocket's ceiling and hides it from below. The
    # timing tell for ORDERLY-POCKET. Size 1.8 at 3.4+1.5 rather than the
    # usual 2.6 at +1.65 because MEASURED it is 7.65m x 1.72m — at 2.0 its top
    # edge reached the 6m ceiling exactly.
    r.scrawl("his floor creaks the same beat, every lap.\nseven strides north, he turns.",
             (-8.85, BALCONY_Y + 1.5, 3.5), math.pi / 2, 1.8)
    # The code, split clue-line / digits across the pocket's north wall, clear
    # of the door gap at x[-1,1] in both directions.
    r.scrawl("the last door\nremembers this:", (-4.5, 1.65, -5.85), 0.0, 2.4)
    r.scrawl("9 1 3 7", (3.0, 1.65, -5.85), 0.0, 3.4, sid="codeScrawl")

    # --- interactables -----------------------------------------------------
    # Both dispensers hang off a wall_z wall, so they are thin in X and their
    # facing is PINNED, never inferred.
    #
    # dispenser17a: south hall, east wall, near spawn and outside
    # ORDERLY-SOUTH's loop (nearest patrol point (5,25) is 6.97m away, past
    # his 6m sight range). The room's only pre-lucid station on the way out.
    r.interactable("dispenser17a", "dispenser", (0.16, 0.75, 0.55),
                   (8.8, 1.45, 31), "dispenser", "use the dispenser", facing="nx")
    # dispenser17c: THE PRESSURE-RULE STATION — one per sealed pocket, at the
    # near end. The pocket has no walk-back (the sealed wall plus the fact
    # that the east stair cannot be re-entered from the pocket side make
    # retracing the whole crossing the only alternative), so it sits a couple
    # of metres from the west shaft's ground landing at (-7,8).
    r.interactable("dispenser17c", "dispenser", (0.16, 0.75, 0.55),
                   (-8.8, 1.45, 9), "dispenser", "use the dispenser", facing="px")
    r.interactable("keypad17", "keypad", (0.4, 0.5, 0.14),
                   (1.35, 1.45, -5.81), "pad", "use the keypad", facing="pz")
    r.interactable("exitdoor", "door", (2, 3, 0.2), (0, 1.5, -6),
                   "door", "the exit door", facing="pz")

    # --- lights ------------------------------------------------------------
    # Y IS EXPLICIT HERE, unlike every flat room, because this room has two
    # floors and one default. A fitting at the usual 2.7 anywhere over
    # x[-9,9] z[-6,10] is UNDER the gallery deck and lights the pocket; the
    # gallery needs its own at 5.7 (0.3 below the 6m ceiling, the same offset
    # a 3m room gives a 2.7 fitting).
    #
    # NOTHING IS BURIED IN THE DECK: the slab occupies y[3.1,3.4] and no
    # fitting sits in that band (asserted by tools/test_room17).
    #
    # KNOWN GENERATOR LIMITATION, NOT FIXED HERE (the emitter is shared): each
    # fitting also emits a "bounce" OmniLight3D hardcoded at y=0.22. For the
    # three gallery fittings that lands on the POCKET floor, 3.4m below the
    # light it belongs to — so the gallery gets no bounce and the pocket gets
    # three faint unauthored warm pools. For the stair fitting the bounce ends
    # up inside the solid stepped blocks and contributes nothing. Both are
    # cosmetic and neither can be fixed room-side; the bounce Y needs to
    # follow its fitting's level in Emitter.emit().
    r.ward_lights([
        (0, 32, 2.7), (0, 26, 2.7), (0, 20, 2.7),          # south hall
        (7, 13, 4.0),                                       # east stairwell
        (4, 4, 2.7), (-5, 6, 2.7), (-4, 0, 2.7), (0, -4, 2.7),   # pocket
        (5, 7, 5.7), (0, 1, 5.7), (-4, -4, 5.7),            # gallery
    ])
    return r

# --- ROOM 15 — the Sorting Room --------------------------------------------
# Three unmed-only shape keys in L-shaped dogleg alcoves; the exit is a shape
# lock, not a keypad — no code, no digits, just a count. Ported from
# src/rooms/room15.ts (spec: docs/superpowers/specs/2026-07-19-room15-shape-
# keys-design.md, reworked per Tom's playtest pass). The room's behaviour —
# the forced-raw threshold, the escalation from two orderlies to five, the
# held-shape bookkeeping — is in rooms/room15/room15.gd; this is geometry.
#
# NO DISPENSERS ANYWHERE, deliberately: the whole room is played raw, and the
# lock is authored allow_unmed so nothing in it ever requires a pill.

def room15():
    # FLOOR RECT covers x[-10.8, 10.8], WIDER than the room's own walls at
    # x=+-9, so the three alcoves that stick out past them get floor and
    # ceiling. room15.ts authors floor x[-9,9] and its alcoves therefore hang
    # over nothing; in Godot the floor and ceiling are two real slabs sized
    # from this rect, so an alcove outside it is a black void you can walk
    # into. Same fix room10 already applies (its rect is +-9.6 to cover nooks
    # at the same offset). The overhang beyond the outer walls is sealed
    # between floor and ceiling and unreachable.
    r = Room("room15", "the Sorting Room",
             floor=(-10.8, 10.8, -29, 6),
             spawn=(0, 5, 0),
             exits=[("room16", -1, 1, -28.9, -27.1)])

    # perimeter shell — spawn end at +z (south). West/east walls are broken
    # only at the alcove mouths.
    r.wall_x(-9, 9, 6)            # south cap, behind spawn

    # west wall (x=-9) — gaps at Key A's mouth z[-3.4,-1.8] and Key C's mouth
    # z[-18.8,-17.2]. room15.ts's removed dispenser recess (z[-7.4,-5.8]) is
    # not here either: that stretch is solid, merged into the run either side.
    r.wall_z(-27, -18.8, -9)
    r.wall_z(-17.2, -3.4, -9)
    r.wall_z(-1.8, 6, -9)

    # east wall (x=9) — gap at Key B's mouth z[-10.8,-9.2].
    r.wall_z(-27, -10.8, 9)
    r.wall_z(-9.2, 6, 9)

    # north cap, with the exit doorway gap x[-1,1]
    r.wall_x(-9, -1, -27)
    r.wall_x(1, 9, -27)
    # The exit door's collider, locked until the shape lock opens; the room
    # script drops it by name through main.unlock_door. This is the ONLY
    # collider the whole mechanic has — keys and the lock itself have none.
    r.solid(-1, 1, -27.1, -26.9, name="DoorCollider")

    # vestibule beyond the exit door, x[-1,1] z[-29,-27]
    r.wall_z(-29, -27, -1)
    r.wall_z(-29, -27, 1)
    r.wall_x(-1, 1, -29)
    r.block((1.8, 2.6, 0.06), (0, 1.4, -28.8), "glow")  # warm glow beyond the exit

    # --- Key A (blue circle) — west wall, the safe dogleg. leg1 (visible from
    # the room): x[-10.8,-9] z[-3.4,-1.8]. leg2 (blind, turns south):
    # x[-10.8,-9.4] z[-1.8,0]. The gap between the two legs sits at leg1's
    # far/blind end, so the turn cannot be seen or shortcut from the mouth.
    #
    # leg2 is the occluder: in the Three.js build it was a hand-authored AABB
    # handed to every Orderly. Here it needs no declaration at all — Godot's
    # Orderly raycasts against REAL wall geometry (orderly.gd's _occluded), so
    # the bracket walls below ARE the occlusion. One less thing to keep in
    # sync, and it cannot drift from the geometry it describes.
    r.wall_x(-10.8, -9, -3.4)     # leg1 north bracket
    r.wall_x(-9.4, -9, -1.8)      # leg1 south wall, solid strip near the mouth only
    r.wall_z(-3.4, 0.0, -10.8)    # leg1 west cap + leg2 west wall, one run
    r.wall_z(-1.8, 0.0, -9.4)     # leg2 east wall
    r.wall_x(-10.8, -9.4, 0.0)    # leg2 south end cap
    r.block((0.12, 0.14, 1.6), (-9, 2.7, -2.6), "glow")  # mouth lintel

    # --- Key B (green square) — east wall, the patrol-reading dogleg.
    # leg1: x[9,10.8] z[-10.8,-9.2]. leg2 (blind, turns north): x[9.4,10.8]
    # z[-12.6,-10.8]. Key A's topology, reflected onto the east wall.
    r.wall_x(9, 9.4, -10.8)       # leg1 north wall, solid strip near the mouth only
    r.wall_x(9, 10.8, -9.2)       # leg1 south bracket
    r.wall_z(-12.6, -9.2, 10.8)   # leg1 east cap + leg2 east wall, one run
    r.wall_z(-12.6, -10.8, 9.4)   # leg2 west wall
    r.wall_x(9.4, 10.8, -12.6)    # leg2 north end cap
    r.block((0.12, 0.14, 1.6), (9, 2.7, -10.0), "glow")  # mouth lintel

    # --- Key C (red triangle) — west wall, the timed-dash dogleg. leg1:
    # x[-10.8,-9] z[-18.8,-17.2]. leg2 (blind, turns north): x[-10.8,-9.4]
    # z[-20.6,-18.8]. Same topology as Key A, guarded much tighter.
    r.wall_x(-10.8, -9, -17.2)    # leg1 south bracket, near the mouth
    r.wall_x(-9.4, -9, -18.8)     # leg1 north wall, solid strip near the mouth only
    r.wall_z(-20.6, -17.2, -10.8)  # leg1 west cap + leg2 west wall, one run
    r.wall_z(-20.6, -18.8, -9.4)  # leg2 east wall
    r.wall_x(-10.8, -9.4, -20.6)  # leg2 north end cap
    r.block((0.12, 0.14, 1.6), (-9, 2.7, -18.0), "glow")  # mouth lintel

    # --- the keys. states='unmed' is forced by Room.shape_key: while lucid the
    # alcove looks empty, the prop is not drawn, and the interaction ray will
    # not focus it. Each sits at its leg2's far cap — unreachable, and
    # unseeable, without rounding the blind corner.
    r.shape_key("shapeKeyA", "circle", "#3fa9dd", (-10.5, 0.9, -0.3))
    r.shape_key("shapeKeyB", "square", "#4caf6a", (10.5, 0.9, -12.3))
    r.shape_key("shapeKeyC", "triangle", "#c1170f", (-10.5, 0.9, -20.3))

    # --- the lock, the door and the panel, all on the north wall.
    # Lock centre: wall face -26.88, plus half its 0.14m depth = -26.81.
    # Facing PINNED, never inferred.
    r.shape_lock("shape_lock15", (1.35, 1.45, -26.81), "pz",
                 ["circle", "square", "triangle"])
    # The slab is scenery — room15.gd's availability filter makes it
    # permanently un-interactable, because the lock opens it and nothing else.
    r.interactable("exitdoor", "door", (2, 3, 0.2), (0, 1.5, -27),
                   "door", "the exit door", facing="pz")
    # Panel centre: wall face -26.88, plus the 0.03m decal gap = -26.85. rot_y
    # 0 means "faces +Z, into the room" — the same axis/sign rule a scrawl or a
    # fixture mounted on this wall follows. 2.4m wide, so 0.8m tall.
    r.icon_panel("doorIcons15", ["circle", "square", "triangle"],
                 ["#3fa9dd", "#4caf6a", "#c1170f"], (0.0, 2.6, -26.85), 0.0, 2.4)

    # Scrawls. Widths were MEASURED, not assumed — a Label3D renders far wider
    # than its authored `size` (a texture scale, not a measurement), and a
    # scrawl that overruns its wall run punches through the wall at right
    # angles to it. Measured world spans, roll included, from
    #   godot --headless --path godot tools/measure_scrawls.tscn -- \
    #       res://rooms/room15/room15.tscn
    #   west  z=2.2   -> 5.54m, z[-0.57,  4.97]  in the run z[-1.8,   6]
    #   east  z=-2.0  -> 4.54m, z[-4.27,  0.27]  in the run z[-9.2,   6]
    #   west  z=-10.0 -> 5.09m, z[-12.54,-7.46]  in the run z[-17.2, -3.4]
    #   east  z=-18.0 -> 5.10m, z[-20.55,-15.45] in the run z[-27,  -10.8]
    #   north x=-5.0  -> 4.56m, x[-7.28, -2.72]  in the run x[-9,    -1]
    # Tallest is 2.38m about y=1.7 (0.51..2.89m), clear of floor and ceiling.
    # The two tight ones are the north-wall line (8m of wall, and it must not
    # cross the doorway at x=-1) and the spawn-wall line (the south cap is
    # 3.8m from its centre).
    r.scrawl("no medicine here. only what\nyou carried in.",
             (-8.85, 1.7, 2.2), math.pi / 2, 2.0)
    r.scrawl("something small waits\nwhere the wall turns",
             (8.85, 1.7, -2.0), -math.pi / 2, 2.0)
    r.scrawl("he walks past it\nmore than he watches it",
             (-8.85, 1.7, -10.0), math.pi / 2, 2.0)
    r.scrawl("the corner is the only\npart of you it can't own",
             (8.85, 1.7, -18.0), -math.pi / 2, 2.0)
    r.scrawl("every one you take,\nanother of them arrives",
             (-5.0, 1.7, -26.85), 0.0, 1.8)

    # 13 fittings down the spine, then one inside each alcove's leg2.
    # room10's lesson, verified by screenshot there and here: an unlit recess
    # renders as a pure black void, and everything shaded inside it vanishes —
    # which for this room would mean the key prop the player is hunting.
    r.light(0, 4)
    r.light(0, 0)
    r.light(-6, -2.5)
    r.light(6, -2.5)
    r.light(0, -6.5)
    r.light(-4, -10)
    r.light(6, -10)
    r.light(0, -14)
    r.light(-4, -14.5)
    r.light(4, -18)
    r.light(-4, -18.5)
    r.light(0, -22)
    r.light(0, -25.5)
    r.light(-10.1, -0.9)          # Key A's leg2
    r.light(10.1, -11.7)          # Key B's leg2
    r.light(-10.1, -19.7)         # Key C's leg2
    return r



# --- ROOM 18 — the Relay Room ----------------------------------------------
# One irreversible mechanical choice, and nothing else. A two-position power
# relay feeds either the ward's LIGHTS or its DOORS, never both; throwing one
# lever physically removes the other and swings the sealed exit door open in
# the same beat. The consequence is invisible until room 19, which is BUILT
# TWICE off the flag this room writes (GameState "room18.power" ->
# main.gd's ROOM_VARIANTS -> rooms/room19_lights or rooms/room19_doors).
# Deliberately no codes and no keypad: the throw IS the lock.
#
# Zones, south to north:
#   Z1 entry hall   z[2.3,5]  — spawn, dispenser18 behind a stub wall
#   Z2 relay hall   z[-3,2.3] — one orderly, rectangular belt, low console
#   Z3 choice nook  z[-7,-3]  — the two levers flank the sealed exit door
#
# PORT NOTE vs src/rooms/room18.ts. The TS build protected the dispenser and
# the nook with hand-authored occluder AABBs and room10's "a sightline into a
# box always crosses the box" argument. Godot's Orderly does not take an
# occluder list at all — _occluded() casts a real RayCast3D against the actual
# world_static colliders — so that argument does not port, and the protection
# here is the REAL geometry doing the work instead: the stub wall for the
# dispenser, the two nook-mouth walls (x[-6,-2] and x[2,6] at z=-3) for the
# levers, plus his facing for the last few metres. That is a BEHAVIOURAL
# guarantee, weaker than room 19's platform (proved cone-free against geometry
# alone), and room18.gd's header says so rather than papering over it.
def room18():
    r = Room("room18", "the Relay Room",
             floor=(-6, 6, -9, 5),
             spawn=(0, 4, 0),
             exits=[("room19", -1, 1, -8.9, -7.9)])

    # shell — floor x[-6,6] z[-9,5], spawn end at +z (south)
    r.wall_x(-6, 6, 5)            # south cap, behind spawn
    r.wall_z(-7, 5, -6)           # west
    r.wall_z(-7, 5, 6)            # east

    # Z1/Z2 stub — occludes the dispenser pocket from the belt.
    r.wall_x(-6, -2.6, 2.3)

    # Low centre console: one piece of cover to duck behind mid-crossing, and
    # the only interior collider in the belt zone.
    r.prop((2, 1.0, 0.9), (0, 0), name="Console")

    # Z2/Z3 mouth walls — the nook opens x[-2,2]
    r.wall_x(-6, -2, -3)
    r.wall_x(2, 6, -3)

    # nook side walls + north cap with the exit gap x[-1,1]
    r.wall_z(-7, -3, -2)
    r.wall_z(-7, -3, 2)
    r.wall_x(-6, -1, -7)
    r.wall_x(1, 6, -7)
    # THE EXIT DOOR'S COLLIDER. Solid until a lever is thrown; room18.gd drops
    # its layer via main.unlock_door("DoorCollider"), the room14/room16 trick.
    # The choice is the room's ONLY gate, so a player literally cannot leave
    # without deciding.
    r.solid(-1, 1, -7.1, -6.9, name="DoorCollider")

    # exit vestibule beyond the doorway, x[-1,1] z[-9,-7]
    r.wall_z(-9, -7, -1)
    r.wall_z(-9, -7, 1)
    r.wall_x(-1, 1, -9)
    r.block((1.8, 2.6, 0.06), (0, 1.4, -8.8), "glow")

    # --- scrawls (all unmed-only, like every scrawl in the ward) -----------
    # Sizes are held small on purpose: a scrawl renders far wider than its
    # authored number (see tools/measure_scrawls.gd) and the nook is only
    # 3.76m of usable wall between its mouth and its north cap.
    # 1.2, not larger: the Z1 pocket is only the 2.46m between the stub wall
    # (z=2.42) and the south cap's face (z=4.88). Measured, not guessed.
    r.scrawl("one relay.\nthe whole ward.", (-5.85, 1.65, 3.65), math.pi / 2, 1.2)
    r.scrawl("it only moves once.\nthey made sure.", (-1.85, 1.65, -5.0), math.pi / 2, 1.3)
    r.scrawl("lights: the long way, lit.\ndoors: the short way, dark.",
             (1.85, 1.65, -5.0), -math.pi / 2, 1.2)
    # Stencilled above each lever, so which throw is which reads before you
    # touch either one. (The interact prompt carries the same information in
    # BOTH ward states — these are flavour, not the only channel.)
    r.scrawl("LIGHTS", (-1.5, 2.25, -6.85), 0.0, 1.0)
    r.scrawl("DOORS", (1.5, 2.25, -6.85), 0.0, 1.0)

    # --- interactables -----------------------------------------------------
    # West wall, so the faceplate points east — PINNED, never inferred.
    r.interactable("dispenser18", "dispenser", (0.16, 0.75, 0.55), (-5.8, 1.45, 4),
                   "dispenser", "use the dispenser", facing="px")
    # THE RELAY. Both levers are states:'both' — legible and throwable in
    # either ward state, because room18+room19 together are audited to cost
    # ZERO pills beyond whatever the belt crossing already cost. Sizes are in
    # WORLD axes: these hang off a Z wall, so thin in Z.
    r.interactable("leverLights", "switch", (0.5, 0.6, 0.16), (-1.6, 1.45, -6.8),
                   "pad", "pull: power to the LIGHTS", facing="pz")
    r.interactable("leverDoors", "switch", (0.5, 0.6, 0.16), (1.6, 1.45, -6.8),
                   "pad", "pull: power to the DOORS", facing="pz")
    # Scenery the room script swings; room18.gd's availability filter makes it
    # permanently un-interactable — the levers are the key, not the door.
    r.interactable("exitdoor18", "door", (2, 3, 0.2), (0, 1.5, -7),
                   "door", "the relay door", facing="pz")

    r.ward_lights([(0, 4), (-4.6, 3.4), (-3, -0.5), (3, -0.5), (0, -5), (0, -8.6)])
    return r


# --- ROOM 19 — the Undercroft ----------------------------------------------
# THE PAYOFF, and the one room in the ward that ships as TWO scene files.
# room18's lever writes GameState flag "room18.power"; main.gd's ROOM_VARIANTS
# resolves "room19" to room19_lights or room19_doors at load. The two builds
# share a vestibule and nothing else — different geometry, different exit, a
# differently shaped patrol, and a different lighting rig.
#
# WHY TWO SCENES rather than one that prunes itself: a scene whose contents
# depend on runtime state cannot be opened, screenshotted or soft-lock-audited
# as an artifact. Both of these can. The cost is the duplicated shell below.
#
# SHARED between the builds, and it must STAY shared (the vestibule is the
# player's fixed, safe first three seconds in either world):
#   floor x[-7,7] z[-8,4]; spawn (-4.5, 3.2) facing north; south/east/west
#   shell walls; dispenser19 on the west wall at z=3; the south-cap scrawl.

R19_FLOOR = (-7, 7, -8, 4)
R19_SPAWN = (-4.5, 3.2, 0)


def _room19_shell(r):
    """Everything both builds of the Undercroft have in common."""
    r.wall_x(-7, 7, 4)            # south cap, behind spawn
    r.wall_z(-8, 4, -7)           # west
    r.wall_z(-8, 4, 7)            # east
    r.scrawl("the undercroft hums.\nsomething was decided\nbefore you got here.",
             (-3.5, 1.65, 3.85), math.pi, 1.6)
    # Vestibule dispenser, west wall, faceplate east — PINNED. Reachable unmed
    # on entry with 0 pills, before either build's hazard geometry starts, and
    # occluded from every patrol point in BOTH builds (see each build's note).
    r.interactable("dispenser19", "dispenser", (0.16, 0.75, 0.55), (-6.8, 1.45, 3),
                   "dispenser", "use the dispenser", facing="px")


# ROOM 19 / 'doors' — the short, dark way.
#
# A 3m unlit corridor x[-6,-3] running the room's full length, entered through
# a gap in the z=2 divider, with one orderly patrolling nearly all of it. He
# effectively IS the corridor: no cover, no console, no nook. You read his
# position and time a single pass. The east half of the room is never built —
# a solid wall stands where the mezzanine would be.
#
# NO LUCID GATE, and no state-filtered collider anywhere: crossing is always
# physically possible unmed, and the catch (forced lucid + teleport to spawn,
# pills kept) is the backstop. The branch is shorter in distance and in
# time-under-threat, not cheaper in pills — that is the trade.
#
# DISPENSER SIGHTLINE: he is confined to the corridor, whose west wall (x=-6,
# z[-8,2]) stands between every patrol point and dispenser19 at (-6.8, 3).
def room19_doors():
    r = Room("room19_doors", "the Undercroft",
             floor=R19_FLOOR,
             spawn=R19_SPAWN,
             exits=[("room20", -5.5, -3.5, -7.9, -7.2)])
    _room19_shell(r)

    # Divider at z=2 (vestibule z[2,4]); the corridor mouth is the gap
    # x[-5.2,-3], offset to the corridor's east side rather than centred on it.
    #
    # THE OFFSET IS LOAD-BEARING, not a stylistic choice. With the TS build's
    # full-width x[-6,-3] gap, a patrol point at (-3.8,-1.5) has an unblocked
    # 5.05m line to a player standing at dispenser19 — inside sight range and,
    # at that phase of his loop, inside his cone: he spots you at the
    # dispenser, which the spec's reaction-time audit says cannot happen.
    # Extending the west segment to x=-5.2 puts every such line through solid
    # wall (worst case crosses z=2 at x=-5.525). Caught by test_rooms1819.gd,
    # not by reading. The mouth is still 1.5m of clear walking at the player's
    # radius.
    r.wall_x(-7, -5.2, 2)
    r.wall_x(-3, 7, 2)
    # The corridor itself, full length z[-8,2]. Its east wall also seals the
    # dead east half off for good.
    r.wall_z(-8, 2, -6)
    r.wall_z(-8, 2, -3)
    # north cap, exit gap x[-5.5,-3.5] at the corridor's north end
    r.wall_x(-7, -5.5, -8)
    r.wall_x(-3.5, 7, -8)
    r.block((1.8, 2.6, 0.06), (-4.5, 1.4, -7.8), "glow")   # the way out, far down the dark

    r.scrawl("wrong wiring for this door.\nit never opens.",
             (-3.15, 1.65, -4.0), -math.pi / 2, 1.3)
    r.scrawl("straight line.\ndark as a mouth.", (-5.85, 1.65, -6.0), math.pi / 2, 1.3)

    # SPARSE, and this is the branch's whole texture: one pool in the
    # vestibule, one at the mouth, NONE in the corridor. Not a blackout — the
    # renderer keeps a base ambient regardless — a legibility lever.
    r.light(-4.5, 3)
    r.light(1.0, 3)
    r.light(-4.5, 0.6)
    return r


# ROOM 19 / 'lights' — the long, lit way, and the fail-safe default.
#
# Vestibule -> east archway -> across the lower floor -> up a 2.5m-wide ramp
# in the room's south-east corner -> onto a railed platform at y=0.9 that is a
# PROVABLY unseeable safe breather -> back down -> a second ground crossing to
# the exit. Roughly double the doors branch's travel, two exposure windows
# instead of one, full visibility throughout.
#
# TIER 1 VERTICALITY (core/levels.gd): height zones and a ramp, folded into
# the synthetic '__flat' level. ZERO collision impact — a raised region is
# never a collider, only a height the rendered Y eases toward. Everything that
# keeps a body on the platform, and everything that blocks a sightline into
# it, is an ordinary authored collider below.
#
# THE PROMISE, AND HOW IT IS KEPT. Godot's Orderly takes no occluder list: it
# casts a real ray against world_static colliders, and every collider in this
# game is a 3m-tall box, so a knee-high railing blocks his line of sight just
# as a wall does. The raised region is therefore ENCLOSED — east and north by
# the room's real walls, west by RailWest (x=2, z[-8,-0.88]), south by
# RailSouth (x[2.12,4.5], z=-1) — with exactly ONE opening, the ramp mouth at
# x[4.5,7], z=-1. From his patrol (x<=1, z in [-6,0.5]) no straight line can
# reach any point of the platform or the lip through that mouth: the crossing
# of z=-1 lands at most at x = 1 + (1.5/3.5)*6 = 3.57, well west of 4.5. Every
# other line into the raised region crosses a rail. tools/test_rooms1819.gd
# proves this by dense sampling against the REAL raycast, not by this
# argument.
#
# DEVIATION FROM SPEC §4.2: one ramp, not two. The player climbs and descends
# the same ramp; the two-crossings-bracketing-a-breather shape and the pill
# economy are untouched, and a single ramp keeps the platform's guarded edge
# one continuous L instead of four seams to prove.
#
# DEVIATION FROM src/rooms/room19.ts: the archway is x[-4,-1], not x[-6,-1].
# With the wider TS gap a patrol point on the (-4,0.5)-(1,0.5) leg has an
# unblocked 5.9m line to dispenser19 in the vestibule, which the spec's
# reaction-time audit says cannot happen. Extending the divider to x=-4 puts
# every in-range patrol point's sightline through solid wall.
def room19_lights():
    PLAT_Y = 0.9

    r = Room("room19_lights", "the Undercroft",
             floor=R19_FLOOR,
             spawn=R19_SPAWN,
             exits=[("room20", -1, 1, -7.9, -7.2)])
    _room19_shell(r)

    # Divider at z=2; the archway is x[-4,-1] (see the deviation note).
    r.wall_x(-7, -4, 2)
    r.wall_x(-1, 7, 2)
    # north cap, exit gap x[-1,1]; x[1,7] backs the platform.
    r.wall_x(-7, -1, -8)
    r.wall_x(1, 7, -8)
    r.block((1.8, 2.6, 0.06), (0, 1.4, -7.8), "glow")

    # --- the walkable verticality — three lines, zero collision impact ----
    r.height_zone(2, 7, -8, -3, PLAT_Y)      # the platform: the breather
    r.height_zone(2, 4.5, -3, -1, PLAT_Y)    # the lip, overlooking the floor
    r.ramp(4.5, 7, -3, -1, "z", PLAT_Y, 0.0)  # climbs north, y 0 -> 0.9

    # The raised floor's own opaque slabs. NO COLLIDER — a collider here would
    # wall the platform off instead of holding it up. Their undersides are
    # what the lower floor sees.
    r.platform(2, 7, -8, -3, PLAT_Y, name="PlatformSlab")
    r.platform(2, 4.5, -3, -1, PLAT_Y, name="LipSlab")

    # Visual ramp: 3 steps of 0.3m across the 2m run, full 2.5m width, rising
    # from the mouth (z=-1) to the platform edge (z=-3). Also no colliders —
    # the walkable slope is the RAMP above, which is smooth.
    RAMP_STEPS = 3
    r.stair_steps(RAMP_STEPS, PLAT_Y, width=2.5, run=0.667, cross=5.75,
                 start=-1.333, name_fmt="RampStep%d")

    # --- the guarded edge -------------------------------------------------
    # RAILWEST — the platform's and the lip's whole open west edge, one
    # collider z[-8,-0.88] so it meets RailSouth with no seam. The visual is a
    # 0.9m rail standing ON the slab edge, so nothing floats.
    r.railing("z", -8, -0.88, cross=2.0, platform_y=PLAT_Y, name="RailWest")
    # RAILSOUTH — the lip's south edge, above the archway floor.
    r.railing("x", 2.12, 4.5, cross=-1.0, platform_y=PLAT_Y, name="RailSouth")
    # RAMPWALL — between the lip (flat, 0.9) and the ramp (sloping 0.9 -> 0).
    # A knee wall rather than a railing, because the two sides sit at
    # different heights along its whole run and a rail would float over the
    # ramp's low end (room 11 shipped exactly that bug).
    r.block((0.24, 1.8, 2), (4.5, 0.9, -2), "wall2",
            collider=(4.38, 4.62, -3, -1), name="RampWall")
    # Glow lintel at the ramp mouth — "there is a way up here", readable from
    # across the lower floor.
    r.block((2.5, 0.14, 0.12), (5.75, 2.7, -0.94), "glow")

    r.scrawl("no door here.\nthey fed the bulbs instead.",
             (-6.85, 1.65, -3.5), math.pi / 2, 1.2)
    # ON THE PLATFORM, hung at PLAT_Y + 1.25 rather than the usual +1.65: it
    # renders ~1.3m tall and at platform eye height it punches the 3m ceiling.
    # Ground height would put it below the platform floor entirely — it reads
    # only to someone who has climbed. (0.9 + 1.65) rather than ground
    # height — it only reads to someone who has climbed.
    r.scrawl("up, and over, and down.\ntake the breath while you can.",
             (6.85, PLAT_Y + 1.25, -5.5), -math.pi / 2, 1.2)

    # GENEROUS, and visibly so: this is the branch you can see him coming in.
    # (1.5, -4.5) is not decoration: RailWest is a 7m solid block standing on
    # the slab edge, and with nothing lighting its WEST face from the lower
    # floor the whole raised region rendered as a black mass with a mottled
    # skirt — the platform read as a wall rather than as somewhere to climb.
    # Confirmed by screenshot, both before and after.
    r.ward_lights([(-2.5, 3), (-1, 0.5), (3, 0.5), (5.75, -1.8), (1.5, -4.5),
                  (-4, -3), (-1, -6), (4.5, -4.5), (4.5, -7)])
    return r

# --- ROOM 20 — the Loading Bay -----------------------------------------------
# The wing's capstone and the last room in the game: its exit is END, and that
# is correct rather than a terminator hack. Ported from src/rooms/room20.ts,
# which carries the full design reasoning; the Godot-specific decisions are in
# rooms/room20/room20.gd's header and in Room.push_block() above.
#
# One new verb, PUSH, asked to do everything at once. A single crate seats
# PLATE_1 to open GATE_1 out of the intake pocket, then serves as mobile cover
# against two orderlies on the gauntlet floor, then seats PLATE_2 to open
# GATE_2 and the way to END. Three zones, spawn to exit, +Z toward spawn:
#
#   Z1 the intake room     z [ 2, 6]   safe — dispenser, PLATE_1, the crate
#   Z2 the gauntlet floor  z [-15, 1]  two orderlies, the crate's whole route
#   Z3 the exit vestibule  z [-19,-16] safe, no lock, the open doorway to END
#
# THE PLATES SIT AT CELL x=1, NOT x=0, AND THAT IS LOAD-BEARING. Both gates
# are 1m gaps on the x=0 causeway; a 0.86m crate parked in one leaves 0.07m of
# clearance a side, i.e. functionally sealed against a 0.7m-wide player. With
# a plate on the causeway itself, ONE ordinary extra push — an intended one at
# GATE_1, an easy accidental one at GATE_2 — wedges the crate in the only
# opening on the map that matters. Off-causeway plates mean the push that
# follows a seating hits the gate's flanking wall (solid at x>=0.5 on both
# gate rows) and is silently refused. See the TS header's PASSAGE-CLEARANCE
# FIX, and tools/test_room20.gd's solver, which re-proves the whole thing by
# enumeration rather than by argument.
#
# ISLAND_C is at x[2,4], NOT the design doc's x[-1,1]: the doc's own footprint
# straddles the causeway the crate has to travel down, so the intended solve
# would block itself on it. Same "static cover is not enough on its own" beat,
# moved off the one line the crate must use.
#
# REACTION-TIME AUDIT: no keypad, no scrawl read under threat, no modal —
# both plates trigger on the CRATE's position, polled per frame, with no
# player dwell at all, so the 8.2m inspection-point floor does not apply. The
# scrawl sits in Z1, 12m+ from the nearest patrol point. Everything else here
# is a live crossing, held to the ordinary moving-target standard.
def room20():
    r = Room("room20", "the Loading Bay",
             floor=(-6, 6, -19, 6),
             spawn=(0, 5, 0),
             exits=[("END", -1, 1, -19, -18.9)])

    # perimeter — floor x[-6,6] z[-19,6], spawn end at +z
    r.wall_x(-6, 6, 6)            # south cap, behind spawn
    r.wall_z(-19, 6, -6)          # west
    r.wall_z(-19, 6, 6)           # east
    r.wall_x(-6, -1, -19)         # north cap, west of the doorway
    r.wall_x(1, 6, -19)           # north cap, east of the doorway
    r.block((1.8, 2.6, 0.06), (0, 1.4, -18.95), "glow")   # the way out

    # GATE_1 — the Z1/Z2 boundary at z=0, a partition wall with a 1-cell gap.
    # The gap's collider is NAMED so room20.gd can drop its layer the instant
    # the crate seats PLATE_1; it is a one-way latch and never comes back.
    r.wall_x(-6, -0.5, 0)
    r.wall_x(0.5, 6, 0)
    r.solid(-0.5, 0.5, -0.1, 0.1, name="Gate1Collider")

    # GATE_2 — the Z2/Z3 boundary at z=-16. Same shape, same latch.
    r.wall_x(-6, -0.5, -16)
    r.wall_x(0.5, 6, -16)
    r.solid(-0.5, 0.5, -16.1, -15.9, name="Gate2Collider")

    # ISLAND_C — static solid + sightline occluder, not pushable. Deliberately
    # insufficient on its own: the room's thesis is that only static cover
    # PLUS the crate clears the gauntlet.
    #
    # The MESH is 1.7m, not the TS build's 1.0m, and this is a cosmetic
    # correction rather than a mechanical one: solid() emits a full 3m-tall
    # collider like every other collider in the ward, so this island already
    # occluded Orderly._occluded()'s eye-height ray while being drawn
    # waist-high. Raising the mesh stops the picture lying about what blocks
    # sight. (The CRATE is the genuinely different case — push_block() emits
    # its authored box AS the collider, so its height is load-bearing. See
    # Room.push_block().)
    r.block((2, 1.7, 1), (3, 0.85, -5.5), "prop")
    r.solid(2, 4, -6, -5)

    # PLATE_1 / PLATE_2 — one call each, trigger + flush 4cm disc, no collider
    # (a plate stays walkable and never joins an orderly's collider set). Both
    # are tripped by the CRATE's centre, tested by room20.gd against these same
    # rects; the engine's poll fires them for the player too and the room
    # ignores that — your weight is not the crate's weight in this room.
    r.plate("plate1", 0.5, 1.5, 0.5, 1.5)
    r.plate("plate2", 0.5, 1.5, -15.5, -14.5)

    # THE CRATE. Rest cell (2,1) — in Z1, off the causeway, 4.1m from spawn.
    #
    # 0.86m footprint (the number every clearance argument in this room rests
    # on) and 1.7m TALL. The Three.js crate is a 0.86m cube because occlusion
    # there was a 2D XZ segment test that never looked at height; here it is a
    # real raycast from the orderly's eye at y=1.5 to the player's at y=1.62,
    # which a 0.86m cube passes straight over. The crate's SECOND JOB IS BEING
    # COVER — it is the only cover on the gauntlet floor — so it has to be tall
    # enough to break that line or the middle act of the room does not exist.
    # tools/test_room20.gd probes Orderly._occluded() directly to prove it,
    # because nothing about this is visible in a screenshot.
    r.push_block("Crate", "crate", 2, 1, size=0.86, height=1.7,
                 label="push the crate")

    # zone triggers — objective beats only, no mechanism hangs off them
    r.trigger("enterZ2", -6, 6, -16, 0)
    r.trigger("vestibule20", -6, 6, -19, -16)

    r.scrawl("it doesn't care\nwhat you are.\npush it.",
             (-5.85, 1.75, 2.5), math.pi / 2, 1.6)

    # One dispenser, Z1 west wall, right past spawn before any threat exists.
    # Nothing in this room is lucid-gated — pushing works in both states — so
    # it is here for pressure/economy consistency and as the panic button.
    r.interactable("dispenser20", "dispenser", (0.16, 0.75, 0.55),
                   (-5.8, 1.45, 4), "dispenser", "use the dispenser", facing="px")

    # Both gate panels are scenery the room script swings. room20.gd's
    # availability filter makes them permanently un-interactable: these open
    # for the crate's weight and for nothing else.
    r.interactable("gate1", "door", (1, 3, 0.2), (0, 1.5, 0),
                   "door", "the gate", facing="pz")
    r.interactable("gate2", "door", (1, 3, 0.2), (0, 1.5, -16),
                   "door", "the gate", facing="pz")

    r.light(0, 4)
    r.light(0, 0.5)
    r.light(-3, -3)
    r.light(3, -3)
    r.light(-3, -8)
    r.light(3, -8)
    r.light(0, -11)
    r.light(-3, -13)
    r.light(3, -13)
    r.light(0, -15.5)
    r.light(0, -17.5)
    return r

# --- ROOM 16 — the Breaker Bay ----------------------------------------------
# THE LIGHT AXIS's only consumer. Ported from src/rooms/room16.ts (spec:
# docs/superpowers/specs/2026-07-19-room16-light-axis-design.md, as reworked by
# Tom's two design overrides — no keypad/no digits, and the charge/fade loop).
# Behaviour — the switch's lucid gate, the door's two-condition gate, the
# charge/fade dial, the orderly — is rooms/room16/room16.gd; this is geometry.
#
# A GENUINE 2x2, all four cells load-bearing:
#
#              LIT (default)                 DARK (after the switch)
#   UNMED   inkScrawl16: the only place    phosphorScrawl16: the only place
#           you learn the breaker exists   you learn what the door wants.
#           at all. Charge only accrues    Painted floor path appears.
#           while lit, in the open bay.
#   LUCID   lightSwitch16 answers — the    exitdoor16 answers — the only
#           only state that can throw it.  state it ever opens in.
#
# TWO DELIBERATE DEVIATIONS FROM room16.ts, both forced by this engine:
#
# 1. THE NOOKS ARE 3.2m x 3.2m CHAMBERS BEHIND A 1.6m MOUTH, not the flat
#    1.6m x 1.6m recesses room16.ts authors (x[-9.6,-8] / x[8,9.6]).
#    Two independent reasons, both measured rather than assumed:
#      WIDTH. A Label3D renders FAR wider than its authored `size` — see
#    tools/measure_scrawls.gd's header and room 15's measured table. Both of
#    this room's clue scrawls live on ONE nook wall; at 1.6m they would have
#    had to shrink to ~10 characters a line, or punch through the walls either
#    side. Measured here at 2.24m and 2.25m wide, which needs a 3.2m run.
#      VIEWING DISTANCE. The first cut got the width right by deepening the
#    nook and mounting the scrawls on a side wall — and was unreadable, because
#    you then stood 1.2m from a 2.24m scrawl and could see about a third of it
#    (verified by screenshot, which is the only way this class of defect ever
#    shows up). A wall you have to read needs BOTH: 3.2m of run to write on,
#    and 3.2m of room to back away into. Hence a square chamber, with the
#    scrawls (and, mirrored, the breaker) on the end cap.
#    THE MOUTH STAYS 1.6m, which is the part that matters for the reaction-time
#    audit: in this engine the Orderly raycasts REAL wall geometry rather than
#    consulting an authored AABB the way room16.ts does, so the mouth IS the
#    occlusion, and it is exactly as narrow as the original's. The end cap is
#    6.05m from the nearest patrol leg — past his 6.0m sight range outright.
#    The floor rect widens to +-11.2 to cover the protrusions, same fix room 10
#    and room 15 already carry.
# 2. ELEVEN FITTINGS, not room16.ts's six. Godot's omni falloff (range 6.0,
#    attenuation 2.3) is far tighter than three.js's, and this is a 19x22m
#    room; six would leave the bay in pools with black between them, and the
#    two nooks — where every clue in the room is — as pure black voids, which
#    is exactly the defect room 10's own light list documents fixing. Both
#    nooks get their own fitting for that reason.
#
# ONE FAITHFUL PORT OF A DISCREPANCY, flagged rather than "fixed":
# room16.ts's comment above inkScrawl16 says "LIT + UNMED — the only cell this
# exists in", but the code authors NO lightState on it, so it is 'both' and
# stays readable in the dark. Ported as the code behaves, not as the comment
# claims. The four cells are still each uniquely load-bearing without it (the
# ink scrawl is still the only teach of the breaker, and CHARGE still only
# accrues while lit), so this is a fidelity call, not a design change. If Tom
# wants the comment to win, add light="lit" to that scrawl and nothing else
# changes.

def room16():
    # Floor rect covers x[-11.2, 11.2], wider than the room's own walls at
    # x=+-8, so the two deepened nooks get floor and ceiling instead of a black
    # void. Same fix room 10 (+-9.6) and room 15 (+-10.8) already carry; the
    # overhang beyond the outer walls is sealed between floor and ceiling and
    # unreachable.
    r = Room("room16", "the Breaker Bay",
             floor=(-11.2, 11.2, -16, 6),
             spawn=(0, 5, 0),
             exits=[("room17", -1, 1, -15.9, -14.9)])

    # --- Z1, the vestibule: z[2,6]. Safe, no patrol reach.
    r.wall_x(-8, 8, 6)            # south cap, behind spawn
    r.wall_z(2, 6, -8)
    r.wall_z(2, 6, 8)

    # Z1/Z2 boundary at z=2 — an OPEN 2m doorway, deliberately ungated. The
    # player's first crossing is unmed; gating it would only add a pointless
    # pill sink before the room has taught anything (room 10's Z1/Z2 rule).
    r.wall_x(-8, -1, 2)
    r.wall_x(1, 8, 2)

    # --- Z2, the bay: z[-14,2]. West and east walls broken at the nook mouths.
    r.wall_z(-6.9, 2, -8)         # west, south of the read nook's mouth
    r.wall_z(-14, -8.5, -8)       # west, north of the read nook's mouth
    r.wall_z(-3.2, 2, 8)          # east, south of the switch nook's mouth
    r.wall_z(-14, -4.8, 8)        # east, north of the switch nook's mouth

    # NOOK_W — the read chamber: x[-11.2,-8] z[-9.6,-6.4], entered through the
    # 1.6m gap the west wall runs above already leave at z[-8.5,-6.9]. Both
    # clue scrawls mount on the end cap, stacked, and you back off across the
    # chamber to read them. See the header's deviation note.
    r.wall_x(-11.2, -8, -9.6)     # chamber south wall
    r.wall_x(-11.2, -8, -6.4)     # chamber north wall
    r.wall_z(-9.6, -6.4, -11.2)   # end cap — both clues live here

    # NOOK_E — the switch chamber, mirrored: x[8,11.2] z[-5.6,-2.4], mouth
    # z[-4.8,-3.2]. lightSwitch16 mounts on its end cap.
    r.wall_x(8, 11.2, -5.6)       # chamber south wall
    r.wall_x(8, 11.2, -2.4)       # chamber north wall
    r.wall_z(-5.6, -2.4, 11.2)    # end cap — the breaker lives here

    # Glow lintels over both mouths — a lit threshold marks "there is a space
    # here" from across the bay (playtest 6's lesson, room 10). light='lit'
    # DELIBERATELY, unlike the dispenser and exit glow below: these are part of
    # the room's own house lighting and go out with the rest of it. That is the
    # point — once the breaker is thrown, the ONLY thing marking the way back
    # to NOOK_W is the painted path.
    r.block((0.12, 0.14, 1.6), (-8, 2.7, -7.7), "glow", light="lit")
    r.block((0.12, 0.14, 1.6), (8, 2.7, -4.0), "glow", light="lit")

    # Phosphor floor path — visible ONLY once the room is dark (light='dark'),
    # opacity driven by the room's charge/fade dial (main.set_glow_fade, see
    # room16.gd). Marks the one stretch nothing else lights: NOOK_E's mouth
    # back to NOOK_W. Deliberately does NOT extend south toward dispenser16a
    # or north toward exitdoor16 — both already have their own ungated glow
    # (see the soft-lock audit in room16.gd), so painting a redundant trail
    # there would dilute what fading is supposed to threaten: your sense of
    # direction across the one leg with no other light. Never your body, never
    # access to a pill, never the way out.
    #
    # NO COLLIDERS, and Room.block would refuse to emit one anyway — see its
    # docstring. The paint is paint.
    for tile_x, tile_z in [(7, -4), (3, -3), (-1, -3.5), (-4, -5.0), (-7, -7.0)]:
        r.block((0.4, 0.04, 0.4), (tile_x, 0.02, tile_z), "phosphor", light="dark")

    # --- north wall (gate to Z3) at z=-14, 2m doorway gap x[-1,1]. No lock on
    # the wall itself; exitdoor16 sits in the gap and its collider is dropped
    # by name when the door finally answers.
    r.wall_x(-8, -1, -14)
    r.wall_x(1, 8, -14)
    r.solid(-1, 1, -14.13, -13.87, name="DoorCollider")

    # --- Z3, the exit vestibule: z[-16,-14]. Safe, no patrol reach.
    r.wall_z(-16, -14, -1)
    r.wall_z(-16, -14, 1)
    r.wall_x(-1, 1, -16)
    # Exit glow — NOT light-gated (no `light` argument): per the soft-lock
    # audit the way out stays locatable in the dark, same as every dispenser's
    # slot glow. materials/glow.tres is unshaded, so it reads at full
    # brightness however dark the room gets.
    r.block((1.8, 2.6, 0.06), (0, 1.4, -15.9), "glow")

    # --- scrawls.
    #
    # Widths were MEASURED, not assumed:
    #   godot --headless --path godot tools/measure_scrawls.tscn -- \
    #       res://rooms/room16/room16.tscn
    # See the numbers in the commit; the two nook scrawls share one 3.2m
    # bracket wall and are stacked vertically, so both their WIDTH (against the
    # bracket run) and their HEIGHT (against each other) are real constraints.
    #
    # Flavour line on the Z1/Z2 partition's south face, facing +Z back at the
    # player as they walk up to it — room 10's gate-2 placement.
    r.scrawl("they never turn\nthe lights off. someone\nmust be afraid too.",
             (-4.5, 1.7, 2.15), 0.0, 1.8)
    # LIT + UNMED's clue. Ordinary red ink, read exactly like any other room's.
    # Teaches all three things the room needs it to: the breaker exists, it is
    # east, it wants medicated hands — and (this pass's addition) that the room
    # has to have held the light a while first, which is the only explicit
    # teach of the charge mechanic anywhere in the game.
    r.scrawl("the breaker's east.\nsteady hands only —\nand a fed room.",
             (-11.05, 2.20, -8.0), math.pi / 2, 1.1, sid="inkScrawl16")
    # DARK + UNMED's clue, on the SAME wall, one metre lower. It was physically
    # here the whole time; light='dark' just kept it invisible until now — the
    # retroactive beat the whole room is built around. ink='phosphor' makes it
    # LOOK like glow paint and puts it on the charge/fade dial with the floor
    # tiles; what makes it invisible while lit is the gate, not the ink.
    r.scrawl("the door opens only\nfor calm eyes, dark.",
             (-11.05, 0.80, -8.0), math.pi / 2, 1.1, sid="phosphorScrawl16",
             light="dark", ink="phosphor")

    # --- fixtures.
    # Z1's dispenser, three steps from spawn and behind the room's only ungated
    # doorway: the 0-pill escape hatch, reachable in EITHER light state.
    # kit.ts's wall-face math: face -7.88, plus half the 0.16 thin axis.
    r.interactable("dispenser16a", "dispenser", (0.16, 0.75, 0.55), (-7.8, 1.45, 4),
                   "dispenser", "use the dispenser", facing="px")
    # LUCID + LIT throws it; LUCID + DARK throws it back. Never light-gated
    # itself — a breaker that vanished in the dark could not be un-thrown, and
    # the two-way toggle is this room's whole soft-lock fix. End cap face
    # 11.08, plus half the 0.16 thin axis. facing PINNED (alcove mount).
    r.light_switch("lightSwitch16", (11.0, 1.45, -4.0), "nx")
    # The terminal interactable. No keypad and no digits anywhere in this room:
    # the door itself is gated on light state + ward state directly, in
    # room16.gd's on_interact. Scenery until then.
    r.interactable("exitdoor16", "door", (2, 3, 0.2), (0, 1.5, -14),
                   "door", "the exit door", facing="pz")

    # --- fittings. ALL on the "bay" circuit: the breaker is for the whole bay,
    # not for one bulb (see the design doc's "why room-wide, not per-zone").
    # Naming the circuit rather than relying on the default "house" is what
    # makes the switch's off-state survive both Atmosphere's per-frame flicker
    # writes and a room reload — see core/atmosphere.gd's CIRCUITS block.
    # The last two are one inside each nook — without them both recesses
    # render as pure black voids and everything shaded in them disappears
    # (room 10 verified that by A/B screenshot, and here it would swallow the
    # switch the player is hunting).
    r.ward_lights([(0, 4), (0, 0), (-3, -4), (3, -4), (-3, -8), (3, -8),
                   (-3, -11), (3, -11), (0, -15), (-10.0, -8.0), (10.0, -4.0)],
                  circuit="bay")
    return r


if __name__ == "__main__":
    # write_materials() is DELIBERATELY NOT CALLED — see its definition.
    #
    # A full run reproduces every committed room byte-for-byte — all 21
    # scenes, INCLUDING room20 (see below) — verified by tools/check_roundtrip.sh,
    # which this list must stay in sync with. Room4's and room5's "L1"
    # fittings, once a two-exception carve-out here, are no longer one: both
    # rooms now set `shadow_extra = [1]` (see Room.shadow_extra) precisely so
    # a full regenerate reproduces their hand-promoted shadow caster instead
    # of reverting it. Nothing drifts.
    #
    # To emit a single room without touching its neighbours:
    #   python3 -c "import sys; sys.path.insert(0, 'tools'); \
    #               import gen_rooms as g; g.write_room(g.room12())"
    write_room(room1())
    write_room(room2())
    write_room(room3())
    write_room(room4())
    write_room(room5())
    write_room(room6())
    write_room(room7())
    write_room(room9())
    write_room(room8())
    write_room(room10())
    # Rooms 8-11 are being ported on their own branches; room 12 lands here.
    write_room(room12())
    write_room(room13())
    write_room(room11())
    write_room(room14())
    write_room(room17())
    write_room(room15())
    write_room(room18())
    write_room(room19_lights())
    write_room(room19_doors())
    # room20 was defined above but never written here — the one omission
    # that let it silently drift, since nothing regenerated it to diff
    # against the committed .tscn. Restored so a full run, and
    # tools/check_roundtrip.sh's diff, both cover every shipped room.
    write_room(room20())
    write_room(room16())
    print("done")
