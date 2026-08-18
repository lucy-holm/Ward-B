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
"""

import os
import math

OUT_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")

WALL_HALF = 0.12
WALL_H = 3.0
WALL_Y = 1.5

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
        self.walls = []               # (mesh_size, mesh_pos, mat, state, collider|None, name|None)
        self.props = []
        self.scrawls = []
        self.interactables = []
        self.lights = []
        self.ceiling_y = 3.0
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
        self.light_range = 9.0
        self.light_attenuation = 1.7

    # geometry -------------------------------------------------------------
    def wall_x(self, x0, x1, z, mat="wall", state=None):
        self._wall((x1 - x0, WALL_H, 0.24), ((x0 + x1) / 2.0, WALL_Y, z), mat, state,
                   (x0, x1, z - WALL_HALF, z + WALL_HALF))

    def wall_z(self, z0, z1, x, mat="wall2", state=None):
        self._wall((0.24, WALL_H, z1 - z0), (x, WALL_Y, (z0 + z1) / 2.0), mat, state,
                   (x - WALL_HALF, x + WALL_HALF, z0, z1))

    def _wall(self, size, pos, mat, state, collider, name=None):
        self.walls.append((size, pos, mat, state, collider, name))

    def block(self, size, pos, mat="wall", state=None, collider=None, name=None):
        """Mesh, optionally with its own collider footprint."""
        self.walls.append((size, pos, mat, state, collider, name))

    def solid(self, min_x, max_x, min_z, max_z, state=None, name=None):
        """Collider with no mesh. `name` gives it a stable node name so a room
        script can find it later (door colliders are unlocked by name)."""
        self.walls.append((None, None, None, state, (min_x, max_x, min_z, max_z), name))

    # content --------------------------------------------------------------
    def scrawl(self, text, pos, rot_y, size, sid=None):
        self.scrawls.append((text, pos, rot_y, size, sid))

    def interactable(self, iid, itype, size, pos, mat, label, state=None, facing=None):
        self.interactables.append((iid, itype, size, pos, mat, label, state, facing))

    def light(self, x, z, y=2.7):
        self.lights.append((x, y, z))


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
        body.append("")

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
        for size, pos, mat, state, collider, cname in r.walls:
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
                # 1.7/9.0 is the compromise that holds both: still noticeably
                # tighter than 1.4 up close, but with enough reach that a hall
                # resolves. Anything steeper than ~2.0 is a large-room killer —
                # check room 4, not just room 1, before touching these.
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
                body.append("shadow_enabled = %s" % ("true" if i % 3 == 0 else "false"))
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
             exits=[("END", -1, 1, -6.9, -5.8)])

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


# --- ROOM 8 — the East Ward ------------------------------------------------
# The finale: two of them. Orderly A keeps a tight orbit around the central
# island; orderly B walks a wide figure-eight whose waist crosses right past
# the island's north and south faces — exactly where the split code is
# scrawled. Their loops are independent AND counter-rotating, so the safe
# window to read either half isn't fixed: you have to watch both of them, not
# just one. One dispenser, tucked in an alcove out along B's eastern leg —
# inside patrolled ground, but lucid is always safe regardless of who's
# nearby, so reaching it is a navigation problem, not a combat one. A shadow
# (the island, the alcove's own walls, a filing block on the west wall) is
# always within reach of wherever you'd need to stand.
#
# Shell shape follows room5 (the other island-plus-split-code room), not
# room6: south-cap spawn, north staff-door gap, vestibule beyond. It is wider
# and deeper, and the east wall carries the alcove's mouth.

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


if __name__ == "__main__":
    # write_materials() is DELIBERATELY NOT CALLED — see its definition.
    write_room(room1())
    write_room(room2())
    write_room(room3())
    write_room(room4())
    write_room(room5())
    write_room(room6())
    write_room(room7())
    write_room(room8())
    print("done")
