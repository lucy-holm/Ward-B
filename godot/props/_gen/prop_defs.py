"""Ward B prop kit — the single source of truth for every handcrafted prop.

WHAT THIS IS FOR. Every room in the ward is built from `tools/gen_rooms.py`'s
box primitives, and boxes are exactly what the grey-box look is made of. The
shaders under `materials/shaders/` already carry the SURFACE detail — plaster
mottle, floor tile grout, ceiling tile grid — so the thing still missing from a
room is SILHOUETTE: objects with an outline, an edge that catches a highlight,
and a shadow that grounds them. That is what this file declares.

THE THREE-STAGE PIPELINE, and why it is three stages:

    props/_gen/prop_defs.py      (this file)   declares meshes + props
        |                                       |
        | gen_props.py                          | gen_props.py
        v                                       v
    props/_gen/mesh_specs.json              props/<name>.tscn
        |
        | gen_prop_meshes.gd (headless Godot)
        v
    props/meshes/<key>.tres

Meshes have to be baked by Godot because SurfaceTool lives in the engine; the
prefabs are plain text, so Python writes them. Declaring BOTH from one file is
what makes the reuse real: `mesh()` keys are derived from the primitive's exact
dimensions, so an office chair's castor and a mop bucket's castor resolve to the
SAME baked resource, referenced by the same uid, with no bookkeeping. Add a prop
that happens to reuse an existing part size and you get the sharing for free.

CANONICAL ORIENTATION, and the origin rule per mount. Every prop is authored
front-toward -Z, width along X, height along Y — the same convention
`tools/gen_rooms.py`'s FIXTURES table uses, so `FACING_ROT` yaws work unchanged.
The ORIGIN differs by mount, and each rule is chosen so the room author passes
the coordinate they already know:

    mount="floor"    origin ON THE FLOOR, centred in XZ. Parts have y >= 0.
                     The author passes the floor position; no half-height math.
    mount="wall"     origin ON THE WALL FACE, centred. Parts have z <= 0, so the
                     prop grows into the room. The author passes the wall face
                     (wall_at +- 0.12 — walls are 0.24 thick) and a height.
    mount="ceiling"  origin ON THE CEILING PLANE, centred in XZ. Parts have
                     y <= 0, so the prop hangs down. The author passes
                     `r.ceiling_y`.

NO PER-PART SCALE, deliberately. A bevel is baked at a real size; scaling a
bevelled box non-uniformly shears the chamfer into something that reads as a
modelling error under a raking light, which is the one thing this kit exists to
avoid. If a prop needs a different size, declare the primitive at that size —
the dedup key means you only pay for it if it is genuinely new.
"""

import math

# --- material palette --------------------------------------------------------
# Shared entries point at materials/ and are NOT restyled here — those are owned
# by the room shaders and every room already depends on their exact look. The
# prop-kit-local entries live under props/ for the same reason fixtures/ keeps
# its own small materials: so a prop tweak cannot silently relight a wall.
MATERIALS = {
    "prop":     "res://materials/prop.tres",
    "wall2":    "res://materials/wall2.tres",
    "chain":    "res://materials/chain.tres",
    "door":     "res://materials/door.tres",
    "steel":    "res://props/steel_mat.tres",
    "enamel":   "res://props/enamel_mat.tres",
    "vinyl":    "res://props/vinyl_mat.tres",
    "rubber":   "res://props/rubber_mat.tres",
    "cork":     "res://props/cork_mat.tres",
    "paper":    "res://props/paper_mat.tres",
    "screen":   "res://props/screen_mat.tres",
    "diffuser": "res://props/diffuser_mat.tres",
    "red":      "res://props/red_mat.tres",
    "enamel_green": "res://props/enamel_green_mat.tres",
    "rust":     "res://props/rust_mat.tres",
    "ticking":  "res://props/ticking_mat.tres",
    "glass_pale": "res://props/glass_pale_mat.tres",
    "trim":     "res://props/trim_mat.tres",
}

# --- primitive spec constructors ---------------------------------------------
# Each returns a stable KEY and registers the spec in MESHES. The key encodes
# every dimension (millimetres; bevels and tilts at finer resolution), so two
# calls with identical geometry collapse to one baked resource — see the module
# docstring on why that sharing is the point rather than an optimisation.
MESHES = {}


def _mm(v):
    return int(round(v * 1000.0))


def _um(v):
    return int(round(v * 10000.0))


def _reg(key, spec):
    prev = MESHES.get(key)
    if prev is not None and prev != spec:
        raise ValueError("mesh key collision: %s\n  %r\n  %r" % (key, prev, spec))
    MESHES[key] = spec
    return key


def box(size, bevel=0.006):
    """Chamfered box. The kit's workhorse: panels, rails, seats, drawer fronts."""
    return _reg("box_%dx%dx%d_b%d" % (_mm(size[0]), _mm(size[1]), _mm(size[2]), _um(bevel)),
                {"type": "box", "size": list(size), "bevel": bevel})


def cyl(r, h, segs=12, bevel=0.004):
    """Capped cylinder, height along +Y. Legs, poles, castors, valve bodies."""
    return _reg("cyl_r%d_h%d_s%d_b%d" % (_mm(r), _mm(h), segs, _um(bevel)),
                {"type": "cyl", "r": r, "h": h, "segs": segs, "bevel": bevel})


def tube(r_out, r_in, h, segs=12):
    """Open pipe — used where the bore is visible (clock bezel, conduit stub)."""
    return _reg("tube_%d_%d_h%d_s%d" % (_mm(r_out), _mm(r_in), _mm(h), segs),
                {"type": "tube", "r_out": r_out, "r_in": r_in, "h": h, "segs": segs})


def taper(r_bot, r_top, h, segs=14):
    """Truncated cone. Extinguisher dome, bucket body, chair column shroud."""
    return _reg("taper_%d_%d_h%d_s%d" % (_mm(r_bot), _mm(r_top), _mm(h), segs),
                {"type": "taper", "r_bot": r_bot, "r_top": r_top, "h": h, "segs": segs})


def frame(w, h, border, depth, bevel=0.005):
    """Four rails merged into ONE surface, in the XY plane. Bezels and surrounds."""
    return _reg("frame_%dx%d_b%d_d%d_v%d" % (_mm(w), _mm(h), _mm(border), _mm(depth), _um(bevel)),
                {"type": "frame", "w": w, "h": h, "border": border,
                 "depth": depth, "bevel": bevel})


def slats(w, h, d, count, tilt=0.0, fill=0.72):
    """Louvred panel — the most reused institutional silhouette there is.

    `fill` is how much of each pitch the blade takes. Louvres are nearly solid
    (the 0.72 default); glazing bars, bed-head bars and radiator columns are
    mostly gap, so they pass 0.10-0.30. One primitive covers both, which is why
    a barred window is two parts rather than fourteen.
    """
    return _reg("slats_%dx%dx%d_n%d_t%d_f%d"
                % (_mm(w), _mm(h), _mm(d), count, _um(tilt), _um(fill)),
                {"type": "slats", "w": w, "h": h, "d": d, "count": count,
                 "tilt": tilt, "fill": fill})


def material(name, res):
    """Register a prop-kit-local material. FOR EXTENSION MODULES.

    An extension that needs its own material must not reach into the MATERIALS
    literal above — that is the one thing in this file several authors would all
    edit at once, and it is exactly the conflict the extension mechanism exists
    to avoid. Call this instead, before the part() that uses it.
    """
    if name in MATERIALS and MATERIALS[name] != res:
        raise ValueError("material %r already registered as %r, not %r"
                         % (name, MATERIALS[name], res))
    MATERIALS[name] = res
    return name


def part(mesh, mat, pos=(0.0, 0.0, 0.0), rot=(0.0, 0.0, 0.0), name=None):
    """One MeshInstance3D in the emitted prefab.

    `rot` is XYZ euler in RADIANS, composed Y*X*Z to match Godot's own default
    euler order, so a value copied out of the inspector means the same thing
    here. Almost every part below rotates about a single axis, where the order
    is moot anyway.
    """
    if mat not in MATERIALS:
        raise ValueError("unknown material %r" % mat)
    return {"mesh": mesh, "mat": mat, "pos": tuple(pos), "rot": tuple(rot), "name": name}


def _radial(n, radius, y, mesh, mat, extra_rot=(0.0, 0.0, 0.0), name_fmt="Arm%d"):
    """`n` copies of one part evenly around +Y, each yawed to point outward.

    A box's length runs along its own X, and a yaw of theta maps that X to
    (cos theta, 0, -sin theta) — so pointing a part along the radius at angle
    `a` (measured x-toward-z) needs yaw = -a, not +a. Getting that sign wrong
    builds a chair base whose arms are all tangential and reads as a pinwheel.
    """
    out = []
    for i in range(n):
        a = 2.0 * math.pi * i / n
        out.append(part(mesh, mat,
                        pos=(radius * math.cos(a), y, radius * math.sin(a)),
                        rot=(extra_rot[0], -a + extra_rot[1], extra_rot[2]),
                        name=name_fmt % i))
    return out


PROPS = {}


def prop(name, mount, size, parts, collider=None, doc="", mount_y=None):
    """Declare a prop.

    `mount_y` is the RECOMMENDED height for the prop's origin — trolley height
    for a bumper rail, eye level for a notice board, and so on. It is a default,
    not a constraint: Room.model() uses it when the author gives no `y`, which
    is what lets `r.model("radiator", (x, z))` land at a plausible height with
    no numbers in the room file at all. Floor and ceiling props do not need one;
    their mount rule already pins the height.
    """
    # A silent overwrite here would let two extension modules both define
    # "trolley", with whichever imported last winning and the other author's
    # prop vanishing from a kit that still lists it. Loud, at import time.
    if name in PROPS:
        raise ValueError("prop %r is already defined — pick another name" % name)
    PROPS[name] = {"mount": mount, "size": tuple(size), "collider": collider,
                   "parts": parts, "doc": doc, "mount_y": mount_y}


# =============================================================================
# TIER 1 — architectural trim. These are `run` props: a room repeats them along
# a wall via Room.prop_run(), so ONE 2m segment dresses a 14m corridor. They are
# the highest-leverage things in the kit because every one of the 20 rooms has
# walls, and a wall that meets the floor at a bare 90-degree seam is the single
# strongest "this is untextured geometry" tell in the build.
# =============================================================================

prop("skirting", "wall", (2.0, 0.124, 0.028), mount_y=0.00, doc="""\
2m of skirting board. Institutional skirting is a plain square section with a
small bullnose cap, not a domestic ogee — two boxes, and the cap is what catches
the light from a ceiling fitting and draws the floor/wall line.""",
     parts=[
         part(box((2.0, 0.100, 0.020), 0.004), "trim", (0, 0.050, -0.010), name="Board"),
         part(box((2.0, 0.024, 0.028), 0.006), "trim", (0, 0.112, -0.014), name="Cap"),
     ])

prop("bumper_rail", "wall", (2.0, 0.145, 0.088), mount_y=0.90, doc="""\
2m of corridor bumper rail — the thick rubber handrail every hospital corridor
carries at trolley height, on proud steel brackets. Placed at y ~ 0.90. The
brackets matter: they hold the rail off the wall so it casts a real shadow line,
which is most of why the rail reads as an object rather than a painted stripe.""",
     parts=[
         part(box((0.05, 0.115, 0.048), 0.004), "steel", (-0.82, 0, -0.024), name="BracketL"),
         part(box((0.05, 0.115, 0.048), 0.004), "steel", (0.82, 0, -0.024), name="BracketR"),
         part(box((2.0, 0.145, 0.040), 0.018), "rubber", (0, 0, -0.068), name="Rail"),
     ])

prop("ceiling_troffer", "ceiling", (1.2, 0.106, 0.6), doc="""\
Surface-mounted 1200x600 fluorescent troffer — housing, dark recess and bezel.

Room.light() emits an OmniLight3D and a faked bounce and NO VISIBLE FITTING, so
until now every ward light was a glow with no lamp above it. This is the lamp.
It is deliberately the unlit half: pair it with `troffer_lamp` (light="lit") so
that throwing the breaker kills the glowing panel and leaves the housing behind,
which is what a dead fluorescent actually looks like. Emitting both from one
call is what Room.light_fitting() is for.""",
     parts=[
         part(box((1.2, 0.075, 0.6), 0.006), "steel", (0, -0.038, 0), name="Housing"),
         # The dark inside of the housing, set WELL BACK from the bezel. It is
         # not a diffuser: troffer_lamp's panel is, and the two must not share a
         # plane. An earlier version put both at y=-0.104 and they z-fought into
         # a flickering chequerboard the moment a light came on — invisible in a
         # still, obvious the instant the camera moved.
         part(box((1.09, 0.010, 0.49), 0.003), "screen", (0, -0.058, 0), name="Recess"),
         part(frame(1.2, 0.6, 0.055, 0.035), "steel", (0, -0.088, 0),
              rot=(math.pi / 2, 0, 0), name="Bezel"),
     ])

prop("troffer_lamp", "ceiling", (1.09, 0.02, 0.49), doc="""\
The glowing half of a troffer, alone, so it can be light-gated on its own.
Place with light="lit" — see ceiling_troffer. No collider, and none is legal:
tools/gen_rooms.py refuses a light-gated prop that carries one, for the same
soft-lock reason Room.block() refuses a light-gated collider.""",
     parts=[
         part(box((1.09, 0.016, 0.49), 0.003), "diffuser", (0, -0.086, 0), name="Lamp"),
     ])

prop("wall_vent", "wall", (0.40, 0.30, 0.042), mount_y=2.35, doc="""\
Extract grille. A dark recess behind tilted louvres, so it reads as a hole in
the wall rather than a plate stuck on it — the louvre shadow does that work,
which is why the blades are tilted 0.55rad and not flat.""",
     parts=[
         part(box((0.36, 0.26, 0.020), 0.003), "chain", (0, 0, -0.010), name="Recess"),
         part(slats(0.34, 0.24, 0.014, 7, 0.55), "steel", (0, 0, -0.028), name="Louvres"),
         part(frame(0.40, 0.30, 0.032, 0.026), "steel", (0, 0, -0.013), name="Surround"),
     ])

prop("pipe_run", "wall", (2.0, 0.09, 0.12), mount_y=2.62, doc="""\
2m of exposed service pipe on collar brackets. Runs along X; place high on a
wall or just under a ceiling. Held 75mm off the wall so the shadow separates it
from the plaster.""",
     parts=[
         part(cyl(0.035, 2.0, 12, 0.004), "steel", (0, 0, -0.075),
              rot=(0, 0, math.pi / 2), name="Pipe"),
         part(box((0.03, 0.055, 0.075), 0.003), "chain", (-0.8, 0, -0.037), name="BracketL"),
         part(box((0.03, 0.055, 0.075), 0.003), "chain", (0.8, 0, -0.037), name="BracketR"),
         part(tube(0.045, 0.036, 0.05, 12), "chain", (-0.8, 0, -0.075),
              rot=(0, 0, math.pi / 2), name="CollarL"),
         part(tube(0.045, 0.036, 0.05, 12), "chain", (0.8, 0, -0.075),
              rot=(0, 0, math.pi / 2), name="CollarR"),
     ])


# =============================================================================
# TIER 2 — nurse-station furniture. Room 5 is the showcase, but every one of
# these is written to be reusable: the chairs suit any day room, the cabinet any
# records office, the monitor any desk.
# =============================================================================

prop("office_chair", "floor", (0.60, 1.00, 0.60), collider=(0.52, 0.52), doc="""\
Swivel chair on a five-star castor base.

THE BACKREST IS AT +Z, WHICH LOOKS WRONG AND IS NOT. Front-toward--Z is the
kit's convention, and a chair's front is the direction a SITTER faces, not
where its bulkiest part is. Putting the back at -Z (the intuitive reading, and
what this shipped with first) makes facing="nz" seat someone with their back
to the counter they are pulled up to — every chair in the ward faced exactly
the wrong way, and it is invisible until you look at one from the side. The base is the whole reason this prop
earns its triangles — five radiating arms and five castors give a complex
ground-contact shadow that immediately reads as "furniture" at any distance,
where a box on legs does not.""",
     parts=(
         _radial(5, 0.145, 0.055, box((0.26, 0.028, 0.05), 0.006), "chain", name_fmt="Arm%d")
         + _radial(5, 0.265, 0.026, cyl(0.026, 0.028, 10, 0.004), "rubber",
                   extra_rot=(0, 0, math.pi / 2), name_fmt="Castor%d")
         + [
             part(taper(0.05, 0.035, 0.14), "chain", (0, 0.14, 0), name="Shroud"),
             part(cyl(0.032, 0.34, 12, 0.004), "steel", (0, 0.24, 0), name="Column"),
             part(box((0.40, 0.03, 0.38), 0.006), "chain", (0, 0.405, 0), name="SeatFrame"),
             part(box((0.46, 0.08, 0.44), 0.020), "vinyl", (0, 0.45, 0), name="Seat"),
             part(box((0.05, 0.20, 0.05), 0.006), "steel", (0, 0.56, 0.20), name="BackStem"),
             part(box((0.42, 0.40, 0.07), 0.020), "vinyl", (0, 0.78, 0.225),
                  rot=(-0.14, 0, 0), name="Back"),
         ]))

prop("stacking_chair", "floor", (0.44, 0.80, 0.44), collider=(0.44, 0.44), doc="""\
The stacking waiting-room chair — tube frame, vinyl seat and a low back. Cheap
in triangles and endlessly repeatable: a row of four along a corridor wall is
the fastest way to make a bare room look occupied.""",
     parts=[
         part(cyl(0.015, 0.44, 8, 0.003), "steel", (-0.17, 0.22, 0.16), name="LegFL"),
         part(cyl(0.015, 0.44, 8, 0.003), "steel", (0.17, 0.22, 0.16), name="LegFR"),
         part(cyl(0.015, 0.44, 8, 0.003), "steel", (-0.17, 0.22, -0.16), name="LegBL"),
         part(cyl(0.015, 0.44, 8, 0.003), "steel", (0.17, 0.22, -0.16), name="LegBR"),
         part(box((0.36, 0.018, 0.018), 0.004), "steel", (0, 0.30, 0.16), name="RailF"),
         part(box((0.36, 0.018, 0.018), 0.004), "steel", (0, 0.30, -0.16), name="RailB"),
         part(box((0.018, 0.018, 0.32), 0.004), "steel", (-0.17, 0.30, 0), name="RailL"),
         part(box((0.018, 0.018, 0.32), 0.004), "steel", (0.17, 0.30, 0), name="RailR"),
         part(box((0.42, 0.045, 0.40), 0.012), "vinyl", (0, 0.455, 0), name="Seat"),
         part(box((0.022, 0.30, 0.022), 0.004), "steel", (-0.17, 0.60, 0.175), name="PostL"),
         part(box((0.022, 0.30, 0.022), 0.004), "steel", (0.17, 0.60, 0.175), name="PostR"),
         part(box((0.40, 0.16, 0.035), 0.010), "vinyl", (0, 0.72, 0.175),
              rot=(-0.10, 0, 0), name="Back"),
     ])

prop("filing_cabinet", "floor", (0.47, 1.32, 0.62), collider=(0.50, 0.64), doc="""\
Four-drawer steel filing cabinet. Each drawer front stands proud of the carcass
with a recessed handle and a paper label holder, so the front face carries four
shadow lines instead of being one flat slab — that stratification is what sells
the scale of it next to a 3m wall.""",
     parts=[
         part(box((0.44, 0.06, 0.58), 0.004), "chain", (0, 0.03, 0), name="Plinth"),
         part(box((0.47, 1.26, 0.62), 0.008), "prop", (0, 0.69, 0), name="Carcass"),
     ] + [
         p
         for i, y in enumerate((0.20, 0.51, 0.82, 1.13))
         for p in (
             part(box((0.435, 0.285, 0.022), 0.005), "prop", (0, y, -0.312), name="Front%d" % i),
             part(box((0.15, 0.024, 0.032), 0.006), "chain", (0, y + 0.09, -0.336),
                  name="Handle%d" % i),
             part(box((0.075, 0.030, 0.006), 0.002), "paper", (0, y - 0.07, -0.327),
                  name="Label%d" % i),
         )
     ])

prop("crt_monitor", "floor", (0.40, 0.42, 0.36), doc="""\
Period CRT on a swivel foot. Mount is "floor" but it belongs on a counter — pass
the counter height as `y`. The screen uses a near-black low-roughness material
rather than an emissive one, so it reads as a dead terminal reflecting the room;
a nurse station full of lit screens would fight the ward's one-light-source
lighting and flatten it.""",
     parts=[
         part(box((0.26, 0.035, 0.24), 0.008), "prop", (0, 0.017, 0), name="Foot"),
         part(cyl(0.05, 0.03, 12, 0.004), "chain", (0, 0.045, 0), name="Pivot"),
         part(box((0.40, 0.34, 0.34), 0.012), "prop", (0, 0.23, 0.02), name="Body"),
         part(frame(0.40, 0.34, 0.055, 0.03), "prop", (0, 0.23, -0.16), name="Bezel"),
         part(box((0.30, 0.24, 0.012), 0.003), "screen", (0, 0.23, -0.158), name="Screen"),
     ])

prop("binder_stack", "floor", (0.30, 0.32, 0.26), doc="""\
Three ring binders, one leaning. The lean is the point — everything else in a
generated room is axis-aligned, so a single part off-axis by 0.18rad reads as
having been PUT there by someone.""",
     parts=[
         part(box((0.075, 0.30, 0.26), 0.005), "door", (-0.085, 0.15, 0), name="BinderA"),
         part(box((0.075, 0.30, 0.26), 0.005), "prop", (0.0, 0.15, 0), name="BinderB"),
         part(box((0.075, 0.30, 0.26), 0.005), "chain", (0.10, 0.148, 0),
              rot=(0, 0, -0.18), name="BinderC"),
         part(box((0.05, 0.09, 0.004), 0.001), "paper", (-0.085, 0.20, -0.132), name="LabelA"),
         part(box((0.05, 0.09, 0.004), 0.001), "paper", (0.0, 0.20, -0.132), name="LabelB"),
     ])

prop("paper_tray", "floor", (0.33, 0.17, 0.25), doc="""\
Two-tier in/out tray with a stack of paper in the lower shelf. Desktop prop —
pass the counter height as `y`, like crt_monitor.""",
     parts=[
         part(cyl(0.008, 0.15, 6, 0.002), "chain", (-0.150, 0.075, 0.110), name="PostA"),
         part(cyl(0.008, 0.15, 6, 0.002), "chain", (0.150, 0.075, 0.110), name="PostB"),
         part(cyl(0.008, 0.15, 6, 0.002), "chain", (-0.150, 0.075, -0.110), name="PostC"),
         part(cyl(0.008, 0.15, 6, 0.002), "chain", (0.150, 0.075, -0.110), name="PostD"),
         part(box((0.32, 0.014, 0.24), 0.003), "chain", (0, 0.035, 0), name="TrayLo"),
         part(box((0.32, 0.014, 0.24), 0.003), "chain", (0, 0.130, 0), name="TrayHi"),
         part(box((0.28, 0.026, 0.20), 0.002), "paper", (0, 0.055, 0), name="Paper"),
     ])

prop("notice_board", "wall", (0.90, 0.65, 0.042), mount_y=1.55, doc="""\
Cork notice board with pinned sheets. The sheets are each rotated a degree or
two off square and sit at slightly different depths, which is the cheapest
possible "a person maintained this" signal in the whole kit.""",
     parts=[
         part(frame(0.90, 0.65, 0.05, 0.038), "prop", (0, 0, -0.019), name="Frame"),
         part(box((0.81, 0.56, 0.016), 0.003), "cork", (0, 0, -0.008), name="Cork"),
         part(box((0.15, 0.21, 0.004), 0.001), "paper", (-0.24, 0.09, -0.018),
              rot=(0, 0, 0.030), name="SheetA"),
         part(box((0.15, 0.21, 0.004), 0.001), "paper", (-0.04, 0.11, -0.019),
              rot=(0, 0, -0.021), name="SheetB"),
         part(box((0.15, 0.21, 0.004), 0.001), "paper", (0.19, 0.05, -0.018),
              rot=(0, 0, 0.014), name="SheetC"),
         part(box((0.11, 0.15, 0.004), 0.001), "paper", (0.28, -0.15, -0.019),
              rot=(0, 0, -0.045), name="SheetD"),
         part(box((0.11, 0.15, 0.004), 0.001), "paper", (-0.17, -0.16, -0.018),
              rot=(0, 0, 0.038), name="SheetE"),
     ])

prop("wall_clock", "wall", (0.31, 0.31, 0.045), mount_y=2.20, doc="""\
Institutional wall clock. Hands are placed by polar maths from the centre rather
than eyeballed offsets — see the module docstring's note on rotation happening
about a part's OWN centre, which is why each hand's position is
(-sin t * L/2, cos t * L/2) and not (0, L/2).""",
     parts=[
         part(tube(0.155, 0.138, 0.042, 24), "prop", (0, 0, -0.021),
              rot=(math.pi / 2, 0, 0), name="Bezel"),
         part(cyl(0.140, 0.012, 24, 0.002), "paper", (0, 0, -0.008),
              rot=(math.pi / 2, 0, 0), name="Face"),
         # 02:10 — hour hand at 65deg, minute at 60deg from 12.
         part(box((0.012, 0.075, 0.004), 0.001), "chain",
              (-math.sin(1.134) * 0.0375, math.cos(1.134) * 0.0375, -0.016),
              rot=(0, 0, 1.134), name="HourHand"),
         part(box((0.010, 0.115, 0.004), 0.001), "chain",
              (-math.sin(1.047) * 0.0575, math.cos(1.047) * 0.0575, -0.018),
              rot=(0, 0, 1.047), name="MinuteHand"),
         part(cyl(0.010, 0.014, 10, 0.002), "chain", (0, 0, -0.019),
              rot=(math.pi / 2, 0, 0), name="Hub"),
     ])


# =============================================================================
# TIER 3 — ward dressing. Not specific to room 5; these are the props that make
# the OTHER nineteen rooms stop looking like the same corridor.
# =============================================================================

prop("radiator", "wall", (0.90, 0.72, 0.17), mount_y=0.40, doc="""\
Cast-iron column radiator on stub legs, with a valve and a floor stub pipe.

REPLACES A FLAT PANEL RADIATOR, which was wrong. The concept art's material
board settles it: the ward's radiators are the sectional column type, and the
column shadows down the front are the entire silhouette — a flat panel in the
same footprint reads as a box screwed to the wall and disappears into the
plaster behind it.

The nine columns are ONE `slats` primitive rotated 90deg about Z, at fill=0.30
so the gaps between sections are as visible as the sections. Same mesh a
horizontal grille would use, turned.

WALL BRACKETS added so the radiator stands off the wall by a real gap rather
than sitting flush against it — the same trick bumper_rail's brackets use, and
for the same reason: a flush panel casts no shadow line of its own and reads
as glued to the plaster, where a genuine standoff throws a shadow that grounds
it. The valve head was a plain cube; it is now a turned disc, which is what a
handwheel silhouettes as from every angle the player actually sees it from.""",
     parts=[
         part(slats(0.60, 0.82, 0.13, 9, 0.0, 0.30), "enamel_green", (0, 0, -0.075),
              rot=(0, 0, math.pi / 2), name="Columns"),
         part(box((0.86, 0.045, 0.15), 0.006), "enamel_green", (0, 0.315, -0.078),
              name="TopRail"),
         part(box((0.86, 0.045, 0.15), 0.006), "enamel_green", (0, -0.285, -0.078),
              name="BottomRail"),
         part(box((0.05, 0.10, 0.13), 0.004), "enamel_green", (-0.34, -0.36, -0.075),
              name="LegL"),
         part(box((0.05, 0.10, 0.13), 0.004), "enamel_green", (0.34, -0.36, -0.075),
              name="LegR"),
         part(box((0.04, 0.05, 0.075), 0.004), "steel", (-0.30, 0.20, -0.0375),
              name="BracketL"),
         part(box((0.04, 0.05, 0.075), 0.004), "steel", (0.30, 0.20, -0.0375),
              name="BracketR"),
         part(cyl(0.022, 0.14, 10, 0.003), "chain", (0.44, -0.22, -0.075), name="Valve"),
         part(cyl(0.052, 0.024, 10, 0.004), "chain", (0.44, -0.135, -0.075),
              name="ValveWheel"),
         part(cyl(0.018, 0.28, 8, 0.003), "chain", (0.44, -0.45, -0.075), name="Stub"),
     ])

prop("fire_extinguisher", "wall", (0.16, 0.62, 0.19), mount_y=1.15, doc="""\
Bracket-mounted extinguisher. The ward's only saturated red, on purpose: in a
palette this desaturated one small warm object anchors a whole corridor, and the
eye goes to it before anything else. Use it sparingly.""",
     parts=[
         part(box((0.09, 0.16, 0.045), 0.004), "chain", (0, 0, -0.022), name="Bracket"),
         part(cyl(0.072, 0.40, 14, 0.005), "red", (0, -0.02, -0.10), name="Body"),
         part(taper(0.072, 0.042, 0.06), "red", (0, 0.21, -0.10), name="Dome"),
         part(taper(0.062, 0.072, 0.03), "chain", (0, -0.235, -0.10), name="Foot"),
         part(cyl(0.021, 0.055, 10, 0.003), "chain", (0, 0.268, -0.10), name="Neck"),
         part(box((0.105, 0.018, 0.028), 0.004), "chain", (0, 0.305, -0.10), name="Handle"),
         part(box((0.085, 0.10, 0.004), 0.001), "paper", (0, 0.02, -0.173), name="Label"),
     ])

prop("mop_bucket", "floor", (0.42, 0.72, 0.34), collider=(0.44, 0.36), doc="""\
Wringer mop bucket on castors, mop leaning in it. Reuses the office chair's
castor mesh verbatim — same key, same baked resource, zero extra cost. That
sharing is the whole thesis of this file, and this prop is the proof of it.""",
     parts=[
         part(taper(0.155, 0.185, 0.30), "steel", (0, 0.22, 0), name="Bucket"),
         part(tube(0.187, 0.178, 0.030, 16), "steel", (0, 0.372, 0), name="Rim"),
         part(box((0.30, 0.03, 0.20), 0.006), "chain", (0, 0.055, 0), name="Chassis"),
         part(cyl(0.026, 0.028, 10, 0.004), "rubber", (-0.13, 0.026, 0.10),
              rot=(0, 0, math.pi / 2), name="CastorA"),
         part(cyl(0.026, 0.028, 10, 0.004), "rubber", (0.13, 0.026, 0.10),
              rot=(0, 0, math.pi / 2), name="CastorB"),
         part(cyl(0.026, 0.028, 10, 0.004), "rubber", (-0.13, 0.026, -0.10),
              rot=(0, 0, math.pi / 2), name="CastorC"),
         part(cyl(0.026, 0.028, 10, 0.004), "rubber", (0.13, 0.026, -0.10),
              rot=(0, 0, math.pi / 2), name="CastorD"),
         part(box((0.20, 0.045, 0.13), 0.006), "steel", (0, 0.40, -0.115),
              rot=(0.25, 0, 0), name="Wringer"),
         part(cyl(0.016, 0.95, 8, 0.003), "prop", (0.075, 0.66, 0.05),
              rot=(-0.12, 0, -0.16), name="MopHandle"),
         part(cyl(0.055, 0.13, 10, 0.004), "paper", (0.14, 0.21, 0.09),
              rot=(-0.12, 0, -0.16), name="MopHead"),
     ])

prop("iv_stand", "floor", (0.52, 1.72, 0.52), collider=(0.34, 0.34), doc="""\
Five-leg IV drip stand. Shares the office chair's castor mesh and radial-base
construction; only the arm length and the pole differ.""",
     parts=(
         _radial(5, 0.115, 0.045, box((0.21, 0.022, 0.038), 0.005), "chain", name_fmt="Leg%d")
         + _radial(5, 0.215, 0.026, cyl(0.026, 0.028, 10, 0.004), "rubber",
                   extra_rot=(0, 0, math.pi / 2), name_fmt="Castor%d")
         + [
             part(cyl(0.018, 1.55, 10, 0.003), "steel", (0, 0.83, 0), name="Pole"),
             part(box((0.30, 0.014, 0.014), 0.003), "steel", (0, 1.60, 0), name="HangerBar"),
             part(cyl(0.006, 0.05, 6, 0.002), "steel", (-0.14, 1.575, 0), name="HookL"),
             part(cyl(0.006, 0.05, 6, 0.002), "steel", (0.14, 1.575, 0), name="HookR"),
             part(box((0.11, 0.20, 0.055), 0.010), "paper", (-0.14, 1.44, 0), name="Bag"),
         ]))

prop("wall_shelf", "wall", (1.20, 0.34, 0.30), mount_y=1.45, doc="""\
Bracketed wall shelf with a lipped front edge. Deliberately empty — put
binder_stack or paper_tray on it, so one shelf serves a records room, a nurse
station and a storeroom without a variant each.

Fixing bolts added where each bracket meets the wall — a bare bracket reads as
floating on the plaster, and a bolt head is one round cap for a lot of "this
was actually fitted by someone" signal.""",
     parts=[
         part(box((1.20, 0.028, 0.28), 0.006), "prop", (0, 0, -0.14), name="Shelf"),
         part(box((1.20, 0.030, 0.016), 0.005), "prop", (0, 0.015, -0.272), name="Lip"),
         part(box((0.026, 0.16, 0.24), 0.004), "chain", (-0.48, -0.09, -0.12),
              name="BracketL"),
         part(box((0.026, 0.16, 0.24), 0.004), "chain", (0.48, -0.09, -0.12),
              name="BracketR"),
         part(cyl(0.010, 0.010, 8, 0.002), "steel", (-0.505, -0.02, -0.01),
              rot=(math.pi / 2, 0, 0), name="BoltL"),
         part(cyl(0.010, 0.010, 8, 0.002), "steel", (0.505, -0.02, -0.01),
              rot=(math.pi / 2, 0, 0), name="BoltR"),
     ])


# =============================================================================
# TIER 4 — the concept art pass. Everything above was built before the art
# existed; these are the things the reference plates put front and centre that
# the kit simply did not have. They are the heavy hitters: a barred window, a
# run of beam seating and a rusted ward bed each carry a whole room on their
# own, which the trim and the small dressing cannot.
# =============================================================================

prop("barred_window", "wall", (1.46, 2.18, 0.12), mount_y=1.85, doc="""\
Tall multi-pane barred window — the single highest-value prop in the kit.

It appears in three of the four environment plates and each one is COMPOSED
around it: the window is the brightest surface in frame and the thing the eye
lands on first, with the room reading as silhouettes against it. Nothing else
here changes a room as much.

Glazing bars and security bars are two `slats` primitives at low fill, one of
them rotated 90deg about Z. Before `slats` took a fill factor this came out as
a set of closed shutters, which is what prompted the parameter.

The pane is UNSHADED (props/glass_pale_mat.tres) — see that material's header
for why a window lit by the room throws the whole composition away.""",
     parts=[
         part(box((1.46, 0.075, 0.19), 0.006), "enamel", (0, -1.075, -0.075), name="Sill"),
         part(box((1.20, 2.00, 0.012), 0.003), "glass_pale", (0, 0.02, -0.020),
              name="Pane"),
         part(slats(1.20, 2.00, 0.024, 9, 0.0, 0.10), "chain", (0, 0.02, -0.033),
              name="GlazingBarsH"),
         part(slats(2.00, 1.20, 0.024, 4, 0.0, 0.12), "chain", (0, 0.02, -0.033),
              rot=(0, 0, math.pi / 2), name="GlazingBarsV"),
         part(slats(2.04, 1.26, 0.030, 7, 0.0, 0.16), "steel", (0, 0.02, -0.076),
              rot=(0, 0, math.pi / 2), name="SecurityBars"),
         part(frame(1.38, 2.16, 0.09, 0.10), "enamel", (0, 0, -0.050), name="Reveal"),
     ])

prop("beam_seating", "floor", (2.14, 0.80, 0.60), collider=(2.14, 0.56), doc="""\
Four-seat moulded beam seating — the waiting-room furniture the concept art
actually uses, on a steel beam with two T feet.

THIS IS WHY stacking_chair IS NO LONGER THE DEFAULT. Both are real institutional
furniture, but the art's waiting area is beam seating end to end, and a beam
reads completely differently in a room: four shells on one rail make a single
long horizontal mass with a continuous shadow under it, where four separate
chairs read as clutter. Keep stacking_chair for day rooms and offices; use this
against a corridor or waiting-room wall.

Shells are heavily bevelled (0.045) rather than modelled as curved surfaces —
at ward light levels the chamfer catches exactly the soft highlight along the
seat nose that sells a moulded shell, for four triangles instead of forty.""",
     parts=[
         part(box((2.14, 0.06, 0.09), 0.008), "chain", (0, 0.405, 0), name="Beam"),
         part(box((0.06, 0.36, 0.06), 0.006), "chain", (-0.74, 0.20, 0), name="StemL"),
         part(box((0.06, 0.36, 0.06), 0.006), "chain", (0.74, 0.20, 0), name="StemR"),
         part(box((0.10, 0.05, 0.54), 0.008), "chain", (-0.74, 0.025, 0), name="FootL"),
         part(box((0.10, 0.05, 0.54), 0.008), "chain", (0.74, 0.025, 0), name="FootR"),
     ] + [
         q
         for i, sx in enumerate((-0.78, -0.26, 0.26, 0.78))
         for q in (
             part(box((0.46, 0.05, 0.44), 0.045), "vinyl", (sx, 0.445, -0.02),
                  name="Seat%d" % i),
             part(box((0.46, 0.32, 0.05), 0.045), "vinyl", (sx, 0.605, 0.205),
                  rot=(-0.22, 0, 0), name="Back%d" % i),
         )
     ])

prop("ward_bed", "floor", (0.92, 0.98, 2.02), collider=(0.94, 2.04), doc="""\
Rusted tubular iron ward bed — head and foot boards of vertical bars, a mesh
base and a stained mattress. The dormitory plate is nothing but a receding row
of these, so it is the prop that makes a ward a ward.

ORIENTATION: the HEAD is at -Z, so facing="nz" puts the headboard against a +Z
wall, which is how a bed is actually placed. The mattress is deliberately
lighter than the frame (props/ticking_mat.tres) — the reference shot recedes as
a row of pale rectangles floating in the dark, and that only works if the
ticking separates from the ironwork.

The kit's `bed()` box preset is unrelated and still exists: it is room 1's
shipped collider geometry, which must not change.

FOOT CAPS added at the base of all four posts — a bare cylinder meeting the
floor with no transition reads as a post that was extruded through it, not a
leg that was PLACED on it. A slightly wider dark ferrule at each base is the
same "the object has feet" cue office_chair and mop_bucket sell with a castor;
a fixed ward bed does not roll, so this is a shod foot rather than a wheel —
`chain`'s near-black iron reads as a different, older casting than the rust
frame above it, which is exactly the two-material look real infirmary beds
have at the point that touches the ground.

MATTRESS thinned from 0.14m to 0.10m to match the reference board's "thin
stained mattress" — the original read as a plush modern mattress on an
otherwise starved, institutional frame, which fought the rest of the prop.""",
     parts=[
         part(cyl(0.028, 0.98, 8, 0.004), "rust", (-0.40, 0.49, -0.95), name="HeadPostL"),
         part(cyl(0.028, 0.98, 8, 0.004), "rust", (0.40, 0.49, -0.95), name="HeadPostR"),
         part(cyl(0.026, 0.86, 8, 0.004), "rust", (0, 0.96, -0.95),
              rot=(0, 0, math.pi / 2), name="HeadRail"),
         part(slats(0.44, 0.78, 0.022, 5, 0.0, 0.20), "rust", (0, 0.72, -0.95),
              rot=(0, 0, math.pi / 2), name="HeadBars"),
         part(cyl(0.028, 0.66, 8, 0.004), "rust", (-0.40, 0.33, 0.95), name="FootPostL"),
         part(cyl(0.028, 0.66, 8, 0.004), "rust", (0.40, 0.33, 0.95), name="FootPostR"),
         part(cyl(0.026, 0.86, 8, 0.004), "rust", (0, 0.64, 0.95),
              rot=(0, 0, math.pi / 2), name="FootRail"),
         part(slats(0.30, 0.78, 0.022, 5, 0.0, 0.20), "rust", (0, 0.48, 0.95),
              rot=(0, 0, math.pi / 2), name="FootBars"),
         part(cyl(0.022, 1.90, 8, 0.003), "rust", (-0.40, 0.42, 0),
              rot=(math.pi / 2, 0, 0), name="SideRailL"),
         part(cyl(0.022, 1.90, 8, 0.003), "rust", (0.40, 0.42, 0),
              rot=(math.pi / 2, 0, 0), name="SideRailR"),
         part(slats(0.80, 1.84, 0.016, 15, 0.0, 0.55), "rust", (0, 0.42, 0),
              rot=(math.pi / 2, 0, 0), name="Springs"),
         part(box((0.82, 0.10, 1.80), 0.045), "ticking", (0, 0.48, 0), name="Mattress"),
         part(cyl(0.034, 0.022, 8, 0.003), "chain", (-0.40, 0.011, -0.95), name="FootCapHL"),
         part(cyl(0.034, 0.022, 8, 0.003), "chain", (0.40, 0.011, -0.95), name="FootCapHR"),
         part(cyl(0.034, 0.022, 8, 0.003), "chain", (-0.40, 0.011, 0.95), name="FootCapFL"),
         part(cyl(0.034, 0.022, 8, 0.003), "chain", (0.40, 0.011, 0.95), name="FootCapFR"),
     ])

prop("gurney", "floor", (0.78, 0.94, 2.00), collider=(0.80, 2.02), doc="""\
Wheeled trolley with a thin mattress and a half side-rail. The corridor plate
leans one of these against a wall with its bedding on the floor; upright it
also reads as a ward in use rather than a ward abandoned.

Reuses ward_bed's mattress-and-frame vocabulary but sits higher and narrower,
which is the actual difference between a bed and a trolley.""",
     parts=[
         part(cyl(0.038, 0.032, 10, 0.004), "rubber", (-0.30, 0.038, -0.80),
              rot=(0, 0, math.pi / 2), name="CastorA"),
         part(cyl(0.038, 0.032, 10, 0.004), "rubber", (0.30, 0.038, -0.80),
              rot=(0, 0, math.pi / 2), name="CastorB"),
         part(cyl(0.038, 0.032, 10, 0.004), "rubber", (-0.30, 0.038, 0.80),
              rot=(0, 0, math.pi / 2), name="CastorC"),
         part(cyl(0.038, 0.032, 10, 0.004), "rubber", (0.30, 0.038, 0.80),
              rot=(0, 0, math.pi / 2), name="CastorD"),
         part(cyl(0.024, 0.56, 8, 0.003), "steel", (-0.30, 0.34, -0.80), name="LegA"),
         part(cyl(0.024, 0.56, 8, 0.003), "steel", (0.30, 0.34, -0.80), name="LegB"),
         part(cyl(0.024, 0.56, 8, 0.003), "steel", (-0.30, 0.34, 0.80), name="LegC"),
         part(cyl(0.024, 0.56, 8, 0.003), "steel", (0.30, 0.34, 0.80), name="LegD"),
         part(cyl(0.022, 1.88, 8, 0.003), "steel", (-0.32, 0.63, 0),
              rot=(math.pi / 2, 0, 0), name="RailL"),
         part(cyl(0.022, 1.88, 8, 0.003), "steel", (0.32, 0.63, 0),
              rot=(math.pi / 2, 0, 0), name="RailR"),
         part(box((0.70, 0.028, 1.86), 0.006), "steel", (0, 0.648, 0), name="Deck"),
         part(box((0.68, 0.10, 1.80), 0.040), "ticking", (0, 0.712, 0), name="Mattress"),
         part(cyl(0.018, 0.98, 8, 0.003), "steel", (0.34, 0.90, -0.30),
              rot=(math.pi / 2, 0, 0), name="SideRail"),
         part(box((0.03, 0.24, 0.03), 0.004), "steel", (0.34, 0.78, -0.76),
              name="SideRailPostA"),
         part(box((0.03, 0.24, 0.03), 0.004), "steel", (0.34, 0.78, 0.16),
              name="SideRailPostB"),
     ])

prop("pendant_lamp", "ceiling", (0.10, 0.56, 0.10), doc="""\
Bare bulb on a flex, with a ceiling rose — the corridor plate's only light
source, and a much older fitting than a troffer. Use it where the ward has been
patched rather than maintained.

The bulb here is DARK glass. Pair with `pendant_bulb` (light="lit") exactly as
ceiling_troffer pairs with troffer_lamp, so the breaker leaves a dead bulb
hanging instead of an empty flex. Room.light_fitting(kind="pendant") does both.""",
     parts=[
         part(cyl(0.045, 0.026, 12, 0.004), "chain", (0, -0.013, 0), name="Rose"),
         part(cyl(0.004, 0.40, 6, 0.001), "chain", (0, -0.226, 0), name="Flex"),
         part(cyl(0.019, 0.052, 10, 0.003), "chain", (0, -0.452, 0), name="Holder"),
         part(taper(0.020, 0.050, 0.042), "screen", (0, -0.499, 0), name="BulbNeck"),
         part(cyl(0.050, 0.040, 12, 0.012), "screen", (0, -0.540, 0), name="BulbBody"),
     ])

prop("pendant_bulb", "ceiling", (0.10, 0.10, 0.10), doc="""\
The glowing half of a pendant lamp, alone, so it can be light-gated on its own.
Place with light="lit". See pendant_lamp.""",
     parts=[
         part(taper(0.020, 0.050, 0.042), "diffuser", (0, -0.499, 0), name="Neck"),
         part(cyl(0.050, 0.040, 12, 0.012), "diffuser", (0, -0.540, 0), name="Bulb"),
     ])

prop("wall_speaker", "wall", (0.24, 0.28, 0.12), mount_y=2.55, doc="""\
Tannoy speaker, mounted high. Small, but it is the one prop that implies the
ward is still being ADDRESSED — that somewhere there is a voice, and a person
holding a microphone. Cheap horror for eleven triangles' worth of grille.""",
     parts=[
         part(box((0.24, 0.28, 0.10), 0.008), "prop", (0, 0, -0.050), name="Body"),
         part(slats(0.18, 0.21, 0.012, 9, 0.0, 0.55), "chain", (0, 0, -0.102),
              name="Grille"),
         part(frame(0.24, 0.28, 0.025, 0.024), "prop", (0, 0, -0.104), name="Bezel"),
     ])

prop("sink", "wall", (0.58, 0.46, 0.46), collider=(0.60, 0.48), mount_y=0.86, doc="""\
Chipped enamel wall-hung sink with pillar taps, a waste and an exposed trap,
against a green tiled splashback. Straight off the reference board.

Carries a collider, unlike every other wall prop: it is 0.44m deep at hip
height, which is exactly the sort of thing a player walks into and clips
through if it is left as pure dressing.

A FRONT LIP and TAP HANDLES were added on the realism pass — the bare
bevelled box read as a slab with two bare pegs sticking out of it. The lip is
what a Belfast-style basin's rolled front edge actually looks like in
silhouette, and it costs one proud box. The trap and waste were also both
undersized to the point of vanishing against the enamel from three metres
off; both are larger now, which is what "exposed trap" in the reference
actually means — you are meant to see it.""",
     parts=[
         part(box((0.58, 0.20, 0.05), 0.006), "enamel_green", (0, 0.13, -0.025),
              name="Splashback"),
         part(box((0.56, 0.17, 0.42), 0.045), "enamel", (0, 0, -0.225), name="Basin"),
         part(box((0.52, 0.032, 0.03), 0.006), "enamel", (0, -0.08, -0.45), name="Lip"),
         part(box((0.46, 0.06, 0.32), 0.030), "screen", (0, 0.055, -0.225),
              name="BasinWell"),
         part(cyl(0.016, 0.11, 8, 0.003), "chain", (-0.11, 0.145, -0.075), name="TapL"),
         part(cyl(0.016, 0.11, 8, 0.003), "chain", (0.11, 0.145, -0.075), name="TapR"),
         part(box((0.028, 0.022, 0.028), 0.004), "chain", (-0.11, 0.205, -0.075),
              name="TapHandleL"),
         part(box((0.028, 0.022, 0.028), 0.004), "chain", (0.11, 0.205, -0.075),
              name="TapHandleR"),
         part(cyl(0.011, 0.10, 8, 0.002), "chain", (-0.11, 0.195, -0.115),
              rot=(math.pi / 2, 0, 0), name="SpoutL"),
         part(cyl(0.011, 0.10, 8, 0.002), "chain", (0.11, 0.195, -0.115),
              rot=(math.pi / 2, 0, 0), name="SpoutR"),
         part(cyl(0.029, 0.16, 8, 0.003), "chain", (0, -0.16, -0.225), name="Waste"),
         part(tube(0.038, 0.028, 0.12, 10), "chain", (0, -0.27, -0.175),
              rot=(math.pi / 2, 0, 0), name="Trap"),
     ])


# =============================================================================
# EXTENSION MODULES
#
# Any props/_gen/defs_*.py sibling is imported here, at the very bottom, and may
# register props exactly as the blocks above do:
#
#     import prop_defs as k
#     k.prop("locker_bank", "floor", (...), parts=[k.part(k.box(...), "steel")])
#
# WHY THE BOTTOM, AND WHY THIS IS NOT A CIRCULAR IMPORT. An extension does
# `import prop_defs`, which during this module's own execution returns the
# partially-initialised module object. That is safe here and ONLY here: every
# primitive, MATERIALS entry and helper it could reach for is already defined
# above this line. Move this block up and extensions start failing on names that
# do not exist yet, with an AttributeError that reads like a typo.
#
# The point is parallel authoring. A prop is ~8 lines and several people (or
# several agents) adding props at once to ONE file conflict on every hunk;
# owning a file each, they never touch the same bytes. gen_props.py and
# tools/gen_rooms.py both import prop_defs and so both see the whole kit with no
# registration step to forget.
import glob as _glob
import importlib as _importlib
import os as _os

for _path in sorted(_glob.glob(_os.path.join(_os.path.dirname(_os.path.abspath(__file__)),
                                             "defs_*.py"))):
    _importlib.import_module(_os.path.basename(_path)[:-3])
