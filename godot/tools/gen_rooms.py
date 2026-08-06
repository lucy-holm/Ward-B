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
    d = os.path.join(OUT_ROOT, "materials")
    os.makedirs(d, exist_ok=True)
    for name, (rgb, emission) in MATERIALS.items():
        r, g, b = rgb.split()
        lines = [
            '[gd_resource type="StandardMaterial3D" format=3 uid="uid://wardbmat%s"]' % _uid_frag(name),
            "",
            "[resource]",
            "albedo_color = Color(%s, %s, %s, 1)" % (r, g, b),
            "roughness = 0.9",
        ]
        if emission > 0:
            lines += [
                "emission_enabled = true",
                "emission = Color(%s, %s, %s, 1)" % (r, g, b),
                "emission_energy_multiplier = %.2f" % emission,
            ]
        lines.append("")
        with open(os.path.join(d, "%s.tres" % name), "w") as f:
            f.write("\n".join(lines))


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
        self.walls = []               # (mesh_size, mesh_pos, mat, state, collider|None)
        self.props = []
        self.scrawls = []
        self.interactables = []
        self.lights = []
        self.ceiling_y = 3.0

    # geometry -------------------------------------------------------------
    def wall_x(self, x0, x1, z, mat="wall", state=None):
        self._wall((x1 - x0, WALL_H, 0.24), ((x0 + x1) / 2.0, WALL_Y, z), mat, state,
                   (x0, x1, z - WALL_HALF, z + WALL_HALF))

    def wall_z(self, z0, z1, x, mat="wall2", state=None):
        self._wall((0.24, WALL_H, z1 - z0), (x, WALL_Y, (z0 + z1) / 2.0), mat, state,
                   (x - WALL_HALF, x + WALL_HALF, z0, z1))

    def _wall(self, size, pos, mat, state, collider):
        self.walls.append((size, pos, mat, state, collider))

    def block(self, size, pos, mat="wall", state=None, collider=None):
        """Mesh, optionally with its own collider footprint."""
        self.walls.append((size, pos, mat, state, collider))

    def solid(self, min_x, max_x, min_z, max_z, state=None):
        """Collider with no mesh."""
        self.walls.append((None, None, None, state, (min_x, max_x, min_z, max_z)))

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
        for size, pos, mat, state, collider in r.walls:
            wi += 1
            parent = "Geometry"
            nm = "W%d" % wi

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
                body.append("transform = %s" % _xform_yaw(rot_y, pos))
                body.append("pixel_size = %.4f" % (size * 0.0035))
                body.append('text = "%s"' % text.replace('"', '\\"').replace("\n", "\\n"))
                body.append("font_size = 128")
                body.append("outline_size = 0")
                body.append("modulate = Color(0.85, 0.28, 0.22, 1)")
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
                sh = self.box_shape(size)
                m = self.box_mesh(size, mat)
                body.append('[node name="%s" type="Area3D" parent="%s"]' % (nm, parent))
                body.append("transform = %s" % _xform(pos))
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
                body.append('[node name="Mesh" type="MeshInstance3D" parent="%s/%s"]' % (parent, nm))
                body.append('mesh = SubResource("%s")' % m)
                body.append("")
            self._ensure_interactable_script()

        # lights
        if r.lights:
            body.append('[node name="Lights" type="Node3D" parent="."]')
            body.append("")
            for i, (x, y, z) in enumerate(r.lights):
                body.append('[node name="L%d" type="OmniLight3D" parent="Lights"]' % i)
                body.append("transform = %s" % _xform((x, y, z)))
                body.append("light_color = Color(0.949, 1.0, 0.98, 1)")
                body.append("light_energy = 0.7")
                body.append("omni_range = 12.0")
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


def _xform_yaw(yaw, pos):
    c, s = math.cos(yaw), math.sin(yaw)
    return "Transform3D(%.6f, 0, %.6f, 0, 1, 0, %.6f, 0, %.6f, %.4f, %.4f, %.4f)" % (
        c, -s, s, c, pos[0], pos[1], pos[2])


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

    r.interactable("cup", "pill_cup", (0.18, 0.16, 0.18), (-2.2, 0.92, 4.7),
                   "pill", "take the pill")
    r.interactable("dispenser1", "dispenser", (0.55, 0.75, 0.16), (2.2, 1.45, 0.14),
                   "dispenser", "MEDICATION")

    r.light(0, 2)
    r.light(0, 5)
    return r


if __name__ == "__main__":
    write_materials()
    write_room(room1())
    print("done")
