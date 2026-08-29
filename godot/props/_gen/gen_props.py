#!/usr/bin/env python3
"""Emit props/<name>.tscn and props/_gen/mesh_specs.json from prop_defs.py.

    python3 props/_gen/gen_props.py
    godot --headless --path . --script res://props/_gen/gen_prop_meshes.gd

Run in that order — the bake reads the JSON this writes. Both steps are
idempotent and neither touches rooms/, so this is safe to re-run at any time;
`tools/check_roundtrip.sh` is what proves the ROOM scenes are unaffected.

WHY THE PREFABS ARE GENERATED AND NOT HAND-AUTHORED. The same reason
tools/gen_rooms.py owns the room scenes (see MIGRATION_NOTES section 1): a
prop is ~7 parts, each with a transform whose numbers are derived from the
part's own dimensions. Hand-typing 131 of those transforms would put the .tscn
and the intent one typo apart with nothing to catch it, and editing a prop in
the Godot editor would then be silently reverted by the next regenerate. Same
contract as rooms: props/_gen/prop_defs.py IS THE SOURCE, the .tscn is build
output.

MATERIAL UIDS ARE READ FROM THE .tres FILES, not hardcoded here. A uid typo
produces a scene that loads with a null material and renders shocking pink, and
the failure would be in generated output rather than in anything a reviewer
reads. Reading them means a renamed or regenerated material can never
half-apply.
"""

import json
import math
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
GODOT_ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)

import prop_defs as defs  # noqa: E402

SPEC_PATH = os.path.join(HERE, "mesh_specs.json")
PROPS_DIR = os.path.join(GODOT_ROOT, "props")
MESH_RES_DIR = "res://props/meshes"


def _res_to_path(res):
    """res://a/b.tres -> <godot root>/a/b.tres"""
    return os.path.join(GODOT_ROOT, res.replace("res://", ""))


def material_uid(res):
    """Pull the uid out of a .tres header, or None if it carries none.

    A ShaderMaterial written by the editor always has one; a hand-authored
    StandardMaterial3D might not, and a missing uid is not an error — the
    ext_resource line just falls back to path-only, exactly as
    fixtures/door.tscn already does for its ArrayMesh resources.
    """
    path = _res_to_path(res)
    if not os.path.exists(path):
        raise SystemExit("material %s does not exist (%s)" % (res, path))
    with open(path, "r") as fh:
        head = fh.readline()
    m = re.search(r'uid="([^"]+)"', head)
    return m.group(1) if m else None


def _basis(rot):
    """XYZ euler (radians) -> a row-major 3x3, composed R = Ry . Rx . Rz.

    That is Godot's own default euler order (YXZ), so a rotation copied out of
    the inspector means the same thing in prop_defs.py. Emitted row-major to
    match the 12-argument Transform3D literal, the same convention
    tools/gen_rooms.py's _xform_yaw_roll() documents and uses.
    """
    import math
    rx, ry, rz = rot
    cx, sx = math.cos(rx), math.sin(rx)
    cy, sy = math.cos(ry), math.sin(ry)
    cz, sz = math.cos(rz), math.sin(rz)
    mx = [[1, 0, 0], [0, cx, -sx], [0, sx, cx]]
    my = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]]
    mz = [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]]

    def mul(a, b):
        return [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)]
                for i in range(3)]

    return mul(mul(my, mx), mz)


def _fmt(v):
    """Trim -0 to 0 and keep 6dp. A signed zero is a real byte difference in
    the emitted scene and would make this generator's output depend on which
    way a floating-point rounding fell."""
    s = "%.6f" % (v + 0.0)
    return "0.000000" if s == "-0.000000" else s


def transform(pos, rot):
    b = _basis(rot)
    nums = [_fmt(b[i][j]) for i in range(3) for j in range(3)]
    nums += ["%.4f" % (p + 0.0) if abs(p) > 5e-5 else "0.0000" for p in pos]
    return "Transform3D(%s)" % ", ".join(nums)


def _gd_str(text):
    """Escape a Python string for a GDScript double-quoted literal. Mirrors
    tools/gen_rooms.py's scrawl emission (`text.replace('"','\\"').replace("\\n","\\n")`)
    so a multi-line label written with real `\\n`s in prop_defs round-trips the
    same way a multi-line scrawl already does."""
    return text.replace('"', '\\"').replace("\n", "\\n")


def emit_prop(name, spec):
    parts = spec["parts"]
    # Stable ext_resource ids, assigned in first-use order so the emitted file
    # is deterministic rather than dependent on dict iteration.
    #
    # A part with `"type": "label"` (props/_gen/defs_signage.py's `label()`
    # helper) carries no `mesh`/`mat` — it becomes a Label3D below, not a
    # MeshInstance3D, so it is skipped here and tracked separately as
    # `has_labels` to decide whether the shared FontFile ext_resource is
    # needed at all. Every prop with no signage extension takes the exact
    # code path this always had.
    mats, meshes = [], []
    has_labels = False
    has_body = spec["collider"] is not None
    for p in parts:
        if p.get("type") == "label":
            has_labels = True
            continue
        if p["mat"] not in mats:
            mats.append(p["mat"])
        if p["mesh"] not in meshes:
            meshes.append(p["mesh"])

    out = []
    out.append('[gd_scene load_steps=%d format=3 uid="uid://wardbprop%s"]'
               % (len(mats) + len(meshes) + (1 if has_labels else 0)
                  + (1 if has_body else 0) + 1,
                  re.sub(r"[^a-z0-9]", "", name)[:14]))
    out.append("")
    for line in spec["doc"].rstrip().splitlines():
        out.append(("; " + line).rstrip())
    out.append(";")
    out.append("; GENERATED by props/_gen/gen_props.py from props/_gen/prop_defs.py.")
    out.append("; Do not edit — the next regenerate silently reverts it.")
    out.append("; Mount: %s.  Extent: %.3f x %.3f x %.3f m."
               % ((spec["mount"],) + spec["size"]))
    out.append("")

    for mat in mats:
        res = defs.MATERIALS[mat]
        uid = material_uid(res)
        if uid:
            out.append('[ext_resource type="Material" uid="%s" path="%s" id="m_%s"]'
                       % (uid, res, mat))
        else:
            out.append('[ext_resource type="Material" path="%s" id="m_%s"]' % (res, mat))
    for mesh in meshes:
        out.append('[ext_resource type="ArrayMesh" path="%s/%s.tres" id="am_%s"]'
                   % (MESH_RES_DIR, mesh, mesh))
    if has_labels:
        # Same font, same bare path-only reference (no uid), as the existing
        # Label3D precedent in fixtures/dispenser.tscn / door.tscn / keypad.tscn
        # / breaker.tscn — SpecialElite-Regular.ttf is reserved for
        # institutional signage per fonts/README.md. One ext_resource covers
        # every label part in the prop, however many there are.
        out.append('[ext_resource type="FontFile" '
                   'path="res://fonts/SpecialElite-Regular.ttf" id="f_sign"]')
    # --- the prop's OWN collider ---------------------------------------------
    # A prop that declares a footprint carries its own StaticBody3D, so it blocks
    # the player WHEREVER it is placed — including dragged into a room by hand in
    # the Godot editor. core/collision.gd rebuilds its cache by WALKING THE ROOM
    # SUBTREE for CollisionShape3D nodes on a solid layer (WardCollision
    # .rebuild_from), so it finds these with the room generator knowing nothing
    # about them.
    #
    # Before this, Room.model() emitted colliders only into the ROOM's Geometry
    # node, which made a hand-placed prop scenery the player walked straight
    # through. Invisible in code; obvious the first time you tried it.
    #
    # Layer 2 is world_static — solid in both ward states. A room needing
    # anything else OVERRIDES `collision_layer` on this node by name: 0 disables
    # it, 4 is lucid-only, 8 is unmed-only. No script and no second collider;
    # core/collision.gd derives the state filter from the layer bits it finds.
    #
    # Colliders in this game are infinite in Y (see collision.gd's header), so
    # the box height is cosmetic — it makes the shape sane in the editor, and
    # nothing reads it.
    if has_body:
        cw, cd = spec["collider"]
        sy = max(spec["size"][1], 0.05)
        if spec["mount"] == "wall":
            centre = (0.0, 0.0, -spec["size"][2] / 2.0)
        elif spec["mount"] == "ceiling":
            centre = (0.0, -sy / 2.0, 0.0)
        else:
            centre = (0.0, sy / 2.0, 0.0)
        out.append("")
        out.append('[sub_resource type="BoxShape3D" id="bs_body"]')
        out.append("size = Vector3(%.4f, %.4f, %.4f)" % (cw, sy, cd))

    out.append("")
    out.append('[node name="%s" type="Node3D"]' % _node_name(name))
    out.append("")
    if has_body:
        # NAMED "Collider", NOT "Body" — and the parts loop below is seeded with
        # that name so a part called Collider would be suffixed rather than
        # clash. This node used to be "Body", and thirteen props in the kit have
        # a PART named Body (a fire extinguisher's cylinder, a mug's body, a
        # speaker's case). Godot resolves a duplicate node name by silently
        # renaming one of them, so in waste_bin — the only prop that had both —
        # get_node("Body") returned the MESH and the real collider ended up
        # unparented from the instance transform, sitting at the world origin.
        #
        # That put an invisible 0.36m box at (0,0) in every room using it, and
        # in room 20 that is dead centre of the push-block route: the crate
        # could not be pushed through its own puzzle and the room became
        # unwinnable. Caught by test_room20's soft-lock proof, not by the
        # placement audit — which computes from source and so never saw it.
        out.append('[node name="Collider" type="StaticBody3D" parent="."]')
        out.append("collision_layer = 2")
        out.append("collision_mask = 0")
        out.append("")
        out.append('[node name="Shape" type="CollisionShape3D" parent="Collider"]')
        out.append("transform = %s" % transform(centre, (0, 0, 0)))
        out.append('shape = SubResource("bs_body")')
        out.append("")

    # Seeded so a part named "Collider" collides with the StaticBody3D above and
    # gets suffixed, rather than silently displacing it — see that node.
    used = {"Collider": 1} if has_body else {}
    for i, p in enumerate(parts):
        nm = p["name"] or ("Part%d" % i)
        # A duplicate node name makes Godot silently rename on load (@Foo@2),
        # which would make the scene non-deterministic across engine versions.
        if nm in used:
            used[nm] += 1
            nm = "%s%d" % (nm, used[nm])
        else:
            used[nm] = 1
        if p.get("type") == "label":
            # Values and property order mirror fixtures/dispenser.tscn's
            # shipped "MEDICATION" Label3D exactly (font first — see that
            # file's own comment on why `script`/`font` must precede
            # anything that depends on it). `shaded` is deliberately NOT set:
            # Label3D's own default (unshaded) is what Room.scrawl() relies
            # on to stay legible in the pitch-black UNMEDICATED state, and
            # overriding it here would make every sign's TEXT go dark with
            # the room while the plate around it stays lit-and-dimming — the
            # opposite of legible. See defs_signage.py's module docstring for
            # why that is not the same thing as the plate/frame mesh being
            # unshaded, which none of them are except exit_sign's panel.
            # YAW 180 IS MANDATORY, ALWAYS COMPOSED IN HERE, NOT LEFT TO THE
            # CALLER. Label3D's OWN default orientation (identity rotation)
            # faces +Z — the OPPOSITE of this kit's "front is -Z" convention
            # every mesh part already follows. Every single existing Label3D
            # in this project (fixtures/dispenser.tscn, door.tscn,
            # keypad.tscn, breaker.tscn) independently arrives at the exact
            # same fix: a yaw-180 basis, i.e. `rot=(0, pi, 0)` through this
            # same `transform()`/`_basis()` machinery. That is a rotation
            # (determinant +1, a proper 180 degree turn about the vertical
            # axis), NOT a mirror — it does not reverse the glyphs, it spins
            # the whole label to face the room, exactly like turning a
            # physical sign around on its bracket. Composed with whatever
            # `rot` defs_signage.py's `label()` passed (normally none), so a
            # caller never has to know this trap exists.
            lrot = (p["rot"][0], p["rot"][1] + math.pi, p["rot"][2])
            out.append('[node name="%s" type="Label3D" parent="."]' % nm)
            out.append("transform = %s" % transform(p["pos"], lrot))
            out.append('text = "%s"' % _gd_str(p["text"]))
            out.append('font = ExtResource("f_sign")')
            out.append("font_size = %d" % p["font_size"])
            out.append("outline_size = %d" % p["outline_size"])
            out.append("pixel_size = %.5f" % p["pixel_size"])
            out.append("modulate = Color(%.4f, %.4f, %.4f, 1)" % p["color"])
            out.append("outline_modulate = Color(%.4f, %.4f, %.4f, 1)" % p["outline"])
            out.append("billboard = 0")
            out.append("no_depth_test = false")
            out.append("horizontal_alignment = %d" % p["h_align"])
            out.append("vertical_alignment = %d" % p["v_align"])
            out.append("")
            continue
        out.append('[node name="%s" type="MeshInstance3D" parent="."]' % nm)
        out.append("transform = %s" % transform(p["pos"], p["rot"]))
        out.append('mesh = ExtResource("am_%s")' % p["mesh"])
        out.append('surface_material_override/0 = ExtResource("m_%s")' % p["mat"])
        out.append("")

    return "\n".join(out).rstrip() + "\n"


def _node_name(name):
    return "".join(w.capitalize() for w in name.split("_"))



# --- gallery -----------------------------------------------------------------
# props/_gen/gallery.tscn: every prop in the kit, laid out in one room against
# real ward materials and real ward lighting. Generated, so a new prop appears
# in it automatically and cannot be forgotten.
#
#   Godot --path . tools/shoot.tscn -- res://props/_gen/gallery.tscn propkit \
#     <cam xyz> <look xyz>
#
# This is the check that catches the failure mode gen_prop_meshes.gd's winding
# comment describes: an inside-out mesh still rasterises its far inner wall and
# looks plausible in isolation, so the only way to know is to LOOK at the kit
# lit the way the game lits it. Shoot it after any change to the primitives.

GALLERY_FLOOR = ("res://materials/floor.tres", (26.0, 0.2, 11.0), (0.0, -0.1, 0.0))
GALLERY_CEIL = ("res://materials/ceil.tres", (26.0, 0.2, 11.0), (0.0, 3.1, 0.0))
GALLERY_WALL = ("res://materials/wall.tres", (26.0, 3.0, 0.24), (0.0, 1.5, 1.32))
WALL_FACE_Z = 1.20
FLOOR_ROW_Z = -1.10
CEIL_ROW_Z = -2.60


def emit_gallery():
    props = defs.PROPS
    floor_props = sorted(n for n in props if props[n]["mount"] == "floor")
    wall_props = sorted(n for n in props if props[n]["mount"] == "wall")
    ceil_props = sorted(n for n in props if props[n]["mount"] == "ceiling")

    ext, sub, nodes = [], [], []
    steps = [1]

    def mat_ext(res):
        rid = "m_%s" % os.path.basename(res).split(".")[0]
        line_uid = material_uid(res)
        line = ('[ext_resource type="Material" uid="%s" path="%s" id="%s"]'
                % (line_uid, res, rid)) if line_uid else (
                '[ext_resource type="Material" path="%s" id="%s"]' % (res, rid))
        if line not in ext:
            ext.append(line)
            steps[0] += 1
        return rid

    def prop_ext(name):
        rid = "p_%s" % name
        line = ('[ext_resource type="PackedScene" uid="uid://wardbprop%s" '
                'path="res://props/%s.tscn" id="%s"]'
                % (re.sub(r"[^a-z0-9]", "", name)[:14], name, rid))
        if line not in ext:
            ext.append(line)
            steps[0] += 1
        return rid

    def shell(label, res, size, pos):
        rid = mat_ext(res)
        sid = "bm_%s" % label.lower()
        sub.append('[sub_resource type="BoxMesh" id="%s"]' % sid)
        sub.append("size = Vector3(%.4f, %.4f, %.4f)" % size)
        sub.append("")
        steps[0] += 1
        nodes.append('[node name="%s" type="MeshInstance3D" parent="."]' % label)
        nodes.append("transform = %s" % transform(pos, (0, 0, 0)))
        nodes.append('mesh = SubResource("%s")' % sid)
        nodes.append('surface_material_override/0 = ExtResource("%s")' % rid)
        nodes.append("")

    for label, (res, size, pos) in (("Floor", GALLERY_FLOOR), ("Ceiling", GALLERY_CEIL),
                                    ("BackWall", GALLERY_WALL)):
        shell(label, res, size, pos)

    def row(names, y_of, z, spacing):
        span = spacing * (len(names) - 1)
        for i, name in enumerate(names):
            rid = prop_ext(name)
            x = -span / 2.0 + i * spacing
            nodes.append('[node name="%s" parent="." instance=ExtResource("%s")]'
                         % (_node_name(name), rid))
            nodes.append("transform = %s" % transform((x, y_of(name), z), (0, 0, 0)))
            nodes.append("")

    row(floor_props, lambda n: 0.0, FLOOR_ROW_Z, 1.55)
    row(wall_props, lambda n: props[n]["mount_y"] or 0.0, WALL_FACE_Z, 2.30)
    row(ceil_props, lambda n: 3.0, CEIL_ROW_Z, 2.00)

    for i, x in enumerate((-8.0, -3.0, 2.0, 7.0)):
        nodes.append('[node name="L%d" type="OmniLight3D" parent="."]' % i)
        nodes.append("transform = %s" % transform((x, 2.7, -0.6), (0, 0, 0)))
        nodes.append("light_color = Color(0.949, 1, 0.98, 1)")
        nodes.append("light_energy = 0.95")
        nodes.append("omni_range = 6.0")
        nodes.append("omni_attenuation = 2.3")
        nodes.append("shadow_enabled = true")
        nodes.append("")

    out = ['[gd_scene load_steps=%d format=3 uid="uid://wardbpropgallery"]' % steps[0], ""]
    out.append("; GENERATED by props/_gen/gen_props.py — every prop in the kit, lit the")
    out.append("; way the ward is lit. See the block comment above emit_gallery().")
    out.append("")
    out.extend(ext)
    out.append("")
    out.extend(sub)
    out.append('[node name="PropGallery" type="Node3D"]')
    out.append("")
    out.extend(nodes)
    return "\n".join(out).rstrip() + "\n"


ADOPT_MARKER = "HAND-EDITED"


def is_adopted(path):
    """Has someone taken ownership of this prop by hand?

    THE PROBLEM THIS SOLVES. props/*.tscn is build output, so opening one in the
    Godot editor, tweaking it and saving used to be silently undone by the next
    regenerate — and `check_roundtrip.sh` would then fail, blaming the person who
    made the edit rather than explaining it. That is a bad deal for anyone who
    wants to nudge a prop without learning the Python DSL, which is a completely
    reasonable thing to want.

    So: put a line containing HAND-EDITED in the file's header comment and the
    generator stops writing it, permanently. The declaration in prop_defs.py
    stays — it is still what `Room.model()` reads for size, mount and collider —
    but the SCENE becomes yours. check_roundtrip.sh skips adopted props for the
    same reason.

    Adopting is one-way and deliberate. To hand a prop back, delete the marker
    line and regenerate; the file is rewritten from the declaration and your
    edits are gone, which is exactly what handing it back means.
    """
    if not os.path.exists(path):
        return False
    with open(path, "r") as fh:
        # Header only — the marker is a statement about the file, and scanning
        # the whole thing would let a stray mention inside a node name adopt a
        # prop by accident.
        return ADOPT_MARKER in fh.read(2048)


def main():
    os.makedirs(PROPS_DIR, exist_ok=True)

    with open(SPEC_PATH, "w") as fh:
        json.dump(defs.MESHES, fh, indent=1, sort_keys=True)
        fh.write("\n")
    print("wrote props/_gen/mesh_specs.json (%d unique meshes)" % len(defs.MESHES))

    adopted = 0
    for name in sorted(defs.PROPS):
        out_path = os.path.join(PROPS_DIR, "%s.tscn" % name)
        if is_adopted(out_path):
            adopted += 1
            print("SKIPPED props/%s.tscn — hand-edited, generator does not own it"
                  % name)
            continue
        text = emit_prop(name, defs.PROPS[name])
        with open(out_path, "w") as fh:
            fh.write(text)
        print("wrote props/%s.tscn (%d parts)" % (name, len(defs.PROPS[name]["parts"])))
    if adopted:
        print("(%d prop(s) adopted by hand — see PROP_KIT.md 'Taking ownership')"
              % adopted)

    with open(os.path.join(HERE, "gallery.tscn"), "w") as fh:
        fh.write(emit_gallery())
    print("wrote props/_gen/gallery.tscn")

    print("done — now run:")
    print("  godot --headless --path . --script res://props/_gen/gen_prop_meshes.gd")


if __name__ == "__main__":
    main()
