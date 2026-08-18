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
}
# Drop any fixture whose scene has not been authored yet.
FIXTURES = {
    k: v for k, v in FIXTURES.items()
    if os.path.exists(os.path.join(OUT_ROOT, v["path"].replace("res://", "")))
}


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

class Room:
    def __init__(self, rid, name, floor, spawn, exits, script=None):
        self.rid = rid
        self.name = name
        self.floor = floor            # (min_x, max_x, min_z, max_z)
        self.spawn = spawn            # (x, z, yaw)
        self.exits = exits            # [(to, min_x, max_x, min_z, max_z)]
        self.script = script or "%s.gd" % rid
        # (mesh_size, mesh_pos, mat, state, collider|None, name|None, level|None)
        # `level` is the stacked-level tag — see the verticality block below.
        self.walls = []
        self.walls = []               # (mesh_size, mesh_pos, mat, state, collider|None, name|None)
        self.movers = []              # (name, size, pos, mat) — AnimatableBody3D, see mover()
        self.props = []
        self.scrawls = []
        self.interactables = []
        self.lights = []
        self.triggers = []            # (tid, min_x, max_x, min_z, max_z, state)
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

    def _wall(self, size, pos, mat, state, collider, name=None, level=None):
        self.walls.append((size, pos, mat, state, collider, name, level))

    def block(self, size, pos, mat="wall", state=None, collider=None, name=None, level=None):
        """Mesh, optionally with its own collider footprint."""
        self.walls.append((size, pos, mat, state, collider, name, level))

    def solid(self, min_x, max_x, min_z, max_z, state=None, name=None, level=None):
        """Collider with no mesh. `name` gives it a stable node name so a room
        script can find it later (door colliders are unlocked by name)."""
        self.walls.append((None, None, None, state, (min_x, max_x, min_z, max_z), name, level))

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

    # content --------------------------------------------------------------
    def scrawl(self, text, pos, rot_y, size, sid=None):
        self.scrawls.append((text, pos, rot_y, size, sid))

    def interactable(self, iid, itype, size, pos, mat, label, state=None, facing=None):
        self.interactables.append((iid, itype, size, pos, mat, label, state, facing))

    def light(self, x, z, y=2.7):
        self.lights.append((x, y, z))

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
        for size, pos, mat, state, collider, cname, wlevel in r.walls:
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
                    m = self.box_mesh(size, mat)
                    rel = (pos[0] - cpos[0], pos[1] - cpos[1], pos[2] - cpos[2])
                    body.append('[node name="Mesh" type="MeshInstance3D" parent="%s/%s"]' % (parent, nm))
                    body.append("transform = %s" % _xform(rel))
                    body.append('mesh = SubResource("%s")' % m)
                    body.append("")
            elif size is not None:
                m = self.box_mesh(size, mat)
                body.append('[node name="%s" type="MeshInstance3D" parent="%s"]' % (nm, parent))
                body.append("transform = %s" % _xform(pos))
                body.append('mesh = SubResource("%s")' % m)
                body.append("")

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

        # scrawls — always unmed-only, one wrapper for all of them
        if r.scrawls:
            self._ensure_state_script()
            body.append('[node name="Scrawls" type="Node3D" parent="."]')
            body.append('script = ExtResource("s_stateobj")')
            body.append("visible_in_state = 2")
            body.append("")
            for i, (text, pos, rot_y, size, sid) in enumerate(r.scrawls):
                nm = sid if sid else "Scrawl%d" % i
                body.append('[node name="%s" type="Label3D" parent="Scrawls"]' % nm)
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
                body.append("outline_modulate = Color(0.18, 0.05, 0.04, 0.85)")
                # Duller and less saturated than the old near-pure red, which
                # read as UI rather than something smeared on a wall.
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
            for (iid, itype, size, pos, mat, label, state, facing) in r.interactables:
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
                if fx is not None:
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

        # lights
        if r.lights:
            body.append('[node name="Lights" type="Node3D" parent="."]')
            body.append("")
            for i, (x, y, z) in enumerate(r.lights):
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
                body.append('[node name="L%d_bounce" type="OmniLight3D" parent="Lights"]' % i)
                body.append("transform = %s" % _xform((x, 0.22, z)))
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

    def _ensure_interactable_script(self):
        if not any(e[2] == "s_interactable" for e in self.ext):
            self.ext.append(("Script", "res://core/interactable.gd", "s_interactable", None))

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
    r.block((2, 0.55, 1), (1.7, 0.28, 4.6), "bed", collider=(0.7, 2.7, 4.1, 5.1))
    r.block((1, 0.8, 0.7), (-2.2, 0.4, 4.7), "prop", collider=(-2.7, -1.7, 4.35, 5.05))

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
    r.light(0, 2)
    r.light(0, 5)
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

    r.light(0, 2)
    r.light(0, -3)
    r.light(0, -7.5)
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
    r.block((0.06, 2.7, 0.06), (-0.7, 1.5, -4.95), "chain", "lucid")
    r.block((0.06, 2.7, 0.06), (-0.25, 1.5, -4.95), "chain", "lucid")
    r.block((0.06, 2.7, 0.06), (0.25, 1.5, -4.95), "chain", "lucid")
    r.block((0.06, 2.7, 0.06), (0.7, 1.5, -4.95), "chain", "lucid")
    r.block((0.22, 0.28, 0.14), (0, 1.05, -4.9), "chain", "lucid")

    # props
    r.block((1.4, 0.5, 1.4), (-2.5, 0.25, -1), "prop", collider=(-3.2, -1.8, -1.7, -0.3))
    r.block((0.6, 0.9, 0.6), (-0.5, 0.45, 1.5), "prop", collider=(-0.8, -0.2, 1.2, 1.8))

    r.scrawl("you weren't supposed\nto make it this far", (-4.85, 1.7, 2), math.pi / 2, 3)
    r.scrawl("it only holds\nif you believe it", (4.85, 1.7, -3), -math.pi / 2, 3.4)

    r.interactable("exitdoor", "door", (2, 3, 0.24), (0, 1.5, -5),
                   "door", "open the door")

    r.light(0, 2)
    r.light(-2.5, -1)
    r.light(1.5, -3)
    r.light(0, -6)
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
    r.block((1.3, 0.9, 0.1), (4, 2.25, -4.8), "glow")

    # tables
    r.block((1.5, 0.5, 0.9), (2, 0.25, 0.3), "prop", collider=(1.25, 2.75, -0.15, 0.75))
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
    r.block((1.5, 0.5, 0.9), (4.9, 0.25, 2.6), "prop", collider=(4.15, 5.65, 2.15, 3.05))

    # tall shelving unit — the occluder. Sits between the patrol loop and the
    # west wall's safe lane, so hiding in its shadow actually works.
    r.block((1.6, 2.9, 0.8), (-2.2, 1.45, -1), "wall2", collider=(-3.0, -1.4, -1.4, -0.6))

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

    r.light(0, 3)
    r.light(3.5, 0)
    r.light(-3, -1)
    r.light(3, -4)
    r.light(0, -6)
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
    r.solid(-2.2, 2.2, -1.3, 1.3)
    r.block((1.8, 2.0, 0.9), (0, 1.0, 0), "wall2")        # raised core counter
    r.block((4.4, 1.1, 0.5), (0, 0.55, 1.05), "prop")     # ring, south face
    r.block((4.4, 1.1, 0.5), (0, 0.55, -1.05), "prop")    # ring, north face
    r.block((0.5, 1.1, 1.3), (-1.95, 0.55, 0), "prop")    # ring, west face
    r.block((0.5, 1.1, 1.3), (1.95, 0.55, 0), "prop")     # ring, east face

    # seating, east corridor (between the patrol lane and the east wall) — a
    # couch-ish block the second code half sits behind.
    r.block((0.7, 0.5, 2.4), (5.3, 0.25, 0), "prop", collider=(4.95, 5.65, -1.2, 1.2))

    # medication-window alcove, west corridor — shutter + glow strip, flush
    # against the wall, first code half is scrawled beside it.
    r.block((0.08, 1.3, 1.5), (-6.92, 1.5, -0.9), "pad")
    r.block((0.08, 0.12, 1.6), (-6.92, 2.25, -0.9), "glow")

    # wall TVs — endless static, dressing only
    r.block((1.3, 0.9, 0.1), (-4, 2.25, 4.85), "glow")
    r.block((1.1, 0.8, 0.1), (5.5, 2.2, -5.85), "glow")

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

    r.light(0, 3.5)
    r.light(-4.5, 0)
    r.light(4.5, 0)
    r.light(0, -2.5)
    r.light(0, -5.5)
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
    r.block((4.5, 2.6, 0.8), (-3.75, 1.3, 2.2), "wall2", collider=(-6, -1.5, 1.8, 2.6))
    r.block((4.5, 2.6, 0.8), (3.75, 1.3, 0), "wall2", collider=(1.5, 6, -0.4, 0.4))
    r.block((4.5, 2.6, 0.8), (-3.75, 1.3, -2.2), "wall2", collider=(-6, -1.5, -2.6, -1.8))

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
    r.block((2.0, 0.9, 1.0), (1.0, 0.45, -2.5), "prop", collider=(0.0, 2.0, -3.0, -2.0))

    # the coatrack against the west wall — the coat itself is a separate
    # interactable ('bottle'), hung at chest height beside it
    r.block((0.16, 1.9, 0.16), (-4.4, 0.95, -3.6), "prop",
            collider=(-4.48, -4.32, -3.68, -3.52))

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
    # ring/core blocks are MESH ONLY, the single r.solid below is the collider,
    # same division as room5's island.
    r.solid(-1.9, 1.9, -1.3, 1.3)
    r.block((1.6, 2.0, 0.9), (0, 1.0, 0), "wall2")        # raised core
    r.block((3.8, 1.1, 0.5), (0, 0.55, 1.05), "prop")     # ring, south face
    r.block((3.8, 1.1, 0.5), (0, 0.55, -1.05), "prop")    # ring, north face
    r.block((0.5, 1.1, 1.3), (-1.65, 0.55, 0), "prop")    # ring, west face
    r.block((0.5, 1.1, 1.3), (1.65, 0.55, 0), "prop")     # ring, east face

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
    r.block((0.6, 1.6, 1.2), (-8.19, 0.8, -3), "prop",
            collider=(-8.49, -7.89, -3.6, -2.4))

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
    r.block((1, 1.6, 2), (-8.8, 0.8, 13), "prop", collider=(-9.3, -8.3, 12, 14))

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

    for z in (20, 16, 10, 4, -2, -8, -14, -20, -24, -26, -29):
        r.light(0, z)
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
    r.block((8, MEZZ_Y, 8), (5, MEZZ_Y / 2.0, 4), "wall2", name="MezzSlab")

    # Visual ramp: 4 steps of 0.5m across the 2m run, full width, rising from
    # the ground mouth (z=10) to the platform edge (z=8). Also no colliders.
    RAMP_STEPS = 4
    for i in range(RAMP_STEPS):
        step_top = MEZZ_Y * (i + 1) / RAMP_STEPS
        z_center = 10 - 0.25 - i * 0.5
        r.block((8, step_top, 0.5), (5, step_top / 2.0, z_center), "wall2",
                name="RampStep%d" % i)

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
    r.block((0.24, 0.9, 8), (1, MEZZ_Y + 0.45, 4), "chain",
            collider=(0.88, 1.12, 0, 10), name="RailWest")
    for i in range(RAMP_STEPS):
        step_top = MEZZ_Y * (i + 1) / RAMP_STEPS
        z_center = 10 - 0.25 - i * 0.5
        r.block((0.24, 0.9, 0.5), (1, step_top + 0.45, z_center), "chain",
                name="RailWestRamp%d" % i)
    r.block((8, 0.9, 0.24), (5, MEZZ_Y + 0.45, 0), "chain",
            collider=(1, 9, -0.12, 0.12), name="RailNorth")

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
    for x, z in [(0, 20), (0, 16), (0, 12), (-7, 8), (-7, 1), (-7, -6),
                 (5, 6), (5, 2), (0, -10), (0, -14), (0, -17)]:
        r.light(x, z)
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

# CHAIN TERMINATOR. room14.ts exits to room15, but rooms 15-20 are not
# ported yet and check_rooms.gd fails on an exit to an unregistered room.
# So this is pinned to "END" exactly as room7 was before room8 landed.
# RESTORE ("room15", ...) when room 15 is ported.
def room14():
    r = Room("room14", "the Hold",
             floor=(-5, 5, -17, 9),
             spawn=(0, 8, 0),
             exits=[("END", -1, 1, -16.9, -16.2)])

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
    r.block((0.9, 1.0, 0.6), (3, 0.5, -13), "prop", collider=(2.55, 3.45, -13.3, -12.7))

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


if __name__ == "__main__":
    # write_materials() is DELIBERATELY NOT CALLED — see its definition.
    #
    # THINK BEFORE RUNNING THIS WHOLESALE. Since the light constants at the top
    # of this file were brought back in line with the shipped scenes (see
    # OMNI_RANGE/OMNI_ATTENUATION), a full run reproduces every committed room
    # byte-for-byte with exactly TWO exceptions: room4's "L1" and room5's "L1"
    # were hand-promoted to shadow casters in the .tscn, outside the "every
    # third fitting casts" rule emitted below, and a regenerate reverts both to
    # shadow_enabled = false. Nothing else drifts.
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
    print("done")
