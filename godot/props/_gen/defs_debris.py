"""Ward B prop kit — DEBRIS, DECAY AND BUILDING SERVICES.

Extension module (see the "EXTENSION MODULES" block at the bottom of
prop_defs.py for the mechanism and why it exists — parallel authoring without
every agent conflicting on the same file). Everything here matches the
concept art's MESS: the corridor plate is composed as much from what has
fallen, spilled and come loose as from the architecture underneath it.

THREE LITTER CLUSTERS (pill_spill, paper_scatter, plaster_rubble) are the
highest-value things in this file. A room author placing forty individual
pill bottles by hand is unusable, so each is ONE prop with a dozen-odd small
parts at varied, hand-authored positions and rotations — one call dresses a
square metre of floor. Litter carries no collider (see prop_defs.py's
collider note: leaving `collider` unset means `spec["collider"]` stays None,
so Room.model() never builds a footprint rectangle for it — the player walks
straight over a pill bottle exactly as they would in the reference photos).

NO RANDOM MODULE IS USED ANYWHERE IN THIS FILE. Every litter position and
rotation below is a hand-placed literal, and the one curve in the file (the
hanging cable's catenary) is derived from literal waypoint constants via
`math.atan2`/`math.sin`/`math.cos` — a pure function of those literals, so it
reproduces byte-for-byte on every run. `random` without a fixed seed was
considered and rejected for exactly the reason the brief warns about: an
unseeded scatter would make check_roundtrip.sh fail intermittently, which is
worse than a scatter that never looks quite right.

STATE GATING. Every prop in this file is self-contained (no light="lit"
pairing, unlike the troffer/pendant fittings), which is what lets a room
author gate the whole set to UNMED with a plain `state="unmed"` on each
`r.model(...)` call and nothing else. The concept art's LUCID plates are
clean — the mess is specifically an unmedicated-state read of the ward — so
that is the intended default, not a requirement enforced here. Nothing below
bakes darkness into an albedo; gating is the room author's job.
"""

import math

import prop_defs as k

# --- material palette ---------------------------------------------------
# Four new entries, all genuinely new colours the existing 17-material
# palette has no match for. Everything else below deliberately REUSES an
# existing MATERIALS entry (paper, rubber, steel, chain, prop) rather than
# minting a near-duplicate — see each material's own header for why its
# specific value was chosen over the nearest existing one.
k.material("db_plastic", "res://props/db_plastic_mat.tres")
k.material("db_rubble", "res://props/db_rubble_mat.tres")
k.material("db_substrate", "res://props/db_substrate_mat.tres")
k.material("db_void", "res://props/db_void_mat.tres")


# =============================================================================
# LITTER CLUSTERS — floor, collider-free, ~12-20 parts each (one draw call per
# part on the web-export's draw-call budget, per the brief). Keep to ONE of
# each per room unless the room is large; two full spills is "abandoned",
# three is "video game grinding for polygons".
# =============================================================================

k.prop("pill_spill", "floor", (0.85, 0.06, 0.70), doc="""\
A spill of pill bottles and paper medicine cups, spilling out from beneath a
smashed medication cabinet — the corridor plate's single busiest patch of
floor. 14 parts (14 draw calls): afford ONE per room, placed where a cabinet
or trolley would plausibly have gone over.

Two bottle sizes (cyl, reused across every instance — the "four distinct
meshes, forty free instances" trick the module doc describes) plus one paper-
cup size in props/paper_mat, which is DELIBERATELY the plastic bottles'
sibling material rather than a new one: paper's matte 0.88 roughness next to
db_plastic's glossier 0.35 is what separates "cup" from "bottle" at a glance
without a second geometry language.

LYING BOTTLES: cyl's height runs local +Y, so rot=(0, yaw, PI/2) is what lays
one on its side — the same z-rotation pipe_run uses to run its pipe along X,
just yawed afterward for scatter variety (yaw is an outer Y rotation, applied
after the PI/2 that does the lying-down, so it spins the bottle around the
vertical without lifting it — see prop_defs.py's basis-composition note).
pos.y is then the bottle's RADIUS, not half its height, or it buries itself in
the floor by (h-r)/2 — the mistake that is invisible in the generator and
obvious the moment you look.""",
       parts=[
           # -- upright bottles: pos.y = h/2 --
           k.part(k.cyl(0.018, 0.055, 8, 0.003), "db_plastic", (-0.34, 0.0275, 0.22),
                  rot=(0, 0.3, 0), name="Bottle0"),
           k.part(k.cyl(0.014, 0.040, 8, 0.003), "db_plastic", (-0.22, 0.020, 0.28),
                  rot=(0, 1.9, 0), name="Bottle1"),
           k.part(k.cyl(0.018, 0.055, 8, 0.003), "db_plastic", (-0.08, 0.0275, 0.05),
                  rot=(0, 4.1, 0), name="Bottle2"),
           k.part(k.cyl(0.014, 0.040, 8, 0.003), "db_plastic", (0.10, 0.020, -0.10),
                  rot=(0, 0.8, 0), name="Bottle3"),
           k.part(k.cyl(0.018, 0.055, 8, 0.003), "db_plastic", (0.28, 0.0275, -0.24),
                  rot=(0, 2.6, 0), name="Bottle4"),
           # -- lying bottles: rot z=PI/2 lays it down, pos.y = radius --
           k.part(k.cyl(0.018, 0.055, 8, 0.003), "db_plastic", (-0.30, 0.018, -0.05),
                  rot=(0, 0.9, 1.5708), name="BottleLie0"),
           k.part(k.cyl(0.014, 0.040, 8, 0.003), "db_plastic", (-0.15, 0.014, 0.12),
                  rot=(0, 2.2, 1.5708), name="BottleLie1"),
           k.part(k.cyl(0.018, 0.055, 8, 0.003), "db_plastic", (0.02, 0.018, 0.30),
                  rot=(0, 5.0, 1.5708), name="BottleLie2"),
           k.part(k.cyl(0.014, 0.040, 8, 0.003), "db_plastic", (0.18, 0.014, 0.08),
                  rot=(0, 3.4, 1.5708), name="BottleLie3"),
           k.part(k.cyl(0.018, 0.055, 8, 0.003), "db_plastic", (0.34, 0.018, 0.10),
                  rot=(0, 1.2, 1.5708), name="BottleLie4"),
           k.part(k.cyl(0.014, 0.040, 8, 0.003), "db_plastic", (-0.38, 0.014, -0.26),
                  rot=(0, 4.6, 1.5708), name="BottleLie5"),
           # -- paper medicine cups --
           k.part(k.cyl(0.024, 0.026, 8, 0.003), "paper", (-0.05, 0.013, -0.22),
                  rot=(0, 1.0, 0), name="CupUp0"),
           k.part(k.cyl(0.024, 0.026, 8, 0.003), "paper", (0.22, 0.013, 0.20),
                  rot=(0, 3.7, 0), name="CupUp1"),
           k.part(k.cyl(0.024, 0.026, 8, 0.003), "paper", (-0.20, 0.024, -0.30),
                  rot=(0, 2.1, 1.5708), name="CupTip0"),
       ])

k.prop("paper_scatter", "floor", (0.75, 0.05, 0.72), doc="""\
Loose sheets and torn pages scattered across the floor — the corridor plate's
second debris field, usually read alongside pill_spill rather than instead of
it. 13 parts (13 draw calls); afford one per corridor.

Reuses props/paper_mat verbatim (no new material — a sheet on the floor and a
sheet pinned to notice_board are the same paper). Two box sizes, one
full sheet and one torn fragment with a different aspect ratio so the pile
doesn't read as one photocopied page repeated.

THE CURL. Three sheets are tilted a few hundredths of a radian about X rather
than lying dead flat — "some curled" in the brief. The tilt is NOT eyeballed:
for a box of half-extents (hx, hy, hz) rotated only about X by angle a, the
lowest of its four bottom corners sits at world y = hy*cos(a) + hz*sin(|a|)
below the box's own centre. Setting pos.y to exactly that value plants the
low corner on the floor and lifts the high corner by roughly twice that
figure — a lifted edge with NO floor clipping and no floating gap, which
hand-picking a y value by eye reliably gets wrong in one direction or the
other. A subsequent yaw (rot.y) does not perturb this: rotating about Y
after X leaves every vertex's Y-coordinate unchanged, so yaw is free to vary
for scatter without redoing the height math.""",
       parts=[
           k.part(k.box((0.21, 0.003, 0.297), 0.001), "paper", (-0.35, 0.0015, 0.15),
                  rot=(0, 0.4, 0), name="Sheet0"),
           k.part(k.box((0.21, 0.003, 0.297), 0.001), "paper", (-0.10, 0.0015, 0.30),
                  rot=(0, 1.2, 0), name="Sheet1"),
           k.part(k.box((0.21, 0.003, 0.297), 0.001), "paper", (0.15, 0.0015, 0.10),
                  rot=(0, 2.6, 0), name="Sheet2"),
           k.part(k.box((0.21, 0.003, 0.297), 0.001), "paper", (0.32, 0.0015, -0.18),
                  rot=(0, 0.1, 0), name="Sheet3"),
           k.part(k.box((0.16, 0.003, 0.12), 0.001), "paper", (-0.28, 0.0015, -0.20),
                  rot=(0, 3.0, 0), name="Torn0"),
           k.part(k.box((0.16, 0.003, 0.12), 0.001), "paper", (0.02, 0.0015, -0.30),
                  rot=(0, 1.7, 0), name="Torn1"),
           k.part(k.box((0.21, 0.003, 0.297), 0.001), "paper", (-0.02, 0.0015, 0.02),
                  rot=(0, 4.4, 0), name="Sheet4"),
           k.part(k.box((0.16, 0.003, 0.12), 0.001), "paper", (0.30, 0.0015, 0.22),
                  rot=(0, 2.2, 0), name="Torn2"),
           k.part(k.box((0.21, 0.003, 0.297), 0.001), "paper", (-0.20, 0.0015, -0.05),
                  rot=(0, 5.6, 0), name="Sheet5"),
           k.part(k.box((0.16, 0.003, 0.12), 0.001), "paper", (0.12, 0.0015, 0.34),
                  rot=(0, 0.9, 0), name="Torn3"),
           # curled: pos.y = hy*cos(a) + hz*sin(|a|), see doc above.
           k.part(k.box((0.21, 0.003, 0.297), 0.001), "paper", (0.05, 0.01631, -0.08),
                  rot=(0.10, 2.0, 0), name="Curl0"),
           k.part(k.box((0.21, 0.003, 0.297), 0.001), "paper", (-0.32, 0.01927, 0.05),
                  rot=(-0.12, 5.0, 0), name="Curl1"),
           k.part(k.box((0.16, 0.003, 0.12), 0.001), "paper", (0.24, 0.01045, -0.02),
                  rot=(0.15, 3.4, 0), name="Curl2"),
       ])

k.prop("plaster_rubble", "floor", (0.65, 0.06, 0.58), doc="""\
A patch of fallen plaster and rubble at a wall base — the third litter
cluster, and the one meant to sit hard against skirting rather than out in
the open floor a pill_spill or paper_scatter would occupy. 14 parts.

Reuses db_rubble at four box sizes, the same sizes fallen_plaster_patch's
own base pile draws from (see that prop) — a chunk knocked off a wall and a
chunk on the floor below it are the same object at two heights, so sharing
the geometry is not a coincidence, it is the same coincidence mop_bucket's
castor already made once for this kit: pay for the mesh once, place it
twice.

Every chunk gets a yaw (nothing here is axis-aligned — rubble never falls
square to the room grid) and the two largest carry a small extra roll so the
pile doesn't read as a shelf of identical boxes. `flake` parts are 6mm thick
and read as fine debris/dust rather than another rock at this scale.""",
       parts=[
           k.part(k.box((0.14, 0.05, 0.10), 0.008), "db_rubble", (0.0, 0.025, 0.05),
                  rot=(0, 0.3, 0), name="ChunkC0"),
           k.part(k.box((0.10, 0.04, 0.08), 0.006), "db_rubble", (-0.15, 0.02, 0.10),
                  rot=(0, 1.1, 0.05), name="ChunkA0"),
           k.part(k.box((0.10, 0.04, 0.08), 0.006), "db_rubble", (0.14, 0.02, -0.06),
                  rot=(0, 2.4, 0), name="ChunkA1"),
           k.part(k.box((0.06, 0.03, 0.05), 0.004), "db_rubble", (-0.08, 0.015, -0.12),
                  rot=(0, 0.6, 0), name="ChunkB0"),
           k.part(k.box((0.06, 0.03, 0.05), 0.004), "db_rubble", (0.20, 0.015, 0.14),
                  rot=(0, 3.0, 0.1), name="ChunkB1"),
           k.part(k.box((0.06, 0.03, 0.05), 0.004), "db_rubble", (0.05, 0.019, 0.20),
                  rot=(0, 5.2, 0), name="ChunkB2"),
           k.part(k.box((0.10, 0.04, 0.08), 0.006), "db_rubble", (-0.22, 0.02, -0.04),
                  rot=(0, 4.0, 0), name="ChunkA2"),
           k.part(k.box((0.14, 0.05, 0.10), 0.008), "db_rubble", (0.02, 0.029, -0.18),
                  rot=(0, 1.8, 0), name="ChunkC1"),
           k.part(k.box((0.04, 0.012, 0.03), 0.002), "db_rubble", (-0.30, 0.006, 0.06),
                  rot=(0, 2.0, 0), name="Flake0"),
           k.part(k.box((0.04, 0.012, 0.03), 0.002), "db_rubble", (0.30, 0.006, -0.10),
                  rot=(0, 0.9, 0), name="Flake1"),
           k.part(k.box((0.04, 0.012, 0.03), 0.002), "db_rubble", (-0.05, 0.006, 0.30),
                  rot=(0, 3.6, 0), name="Flake2"),
           k.part(k.box((0.04, 0.012, 0.03), 0.002), "db_rubble", (0.18, 0.006, 0.28),
                  rot=(0, 1.3, 0), name="Flake3"),
           k.part(k.box((0.04, 0.012, 0.03), 0.002), "db_rubble", (-0.25, 0.006, -0.22),
                  rot=(0, 4.8, 0), name="Flake4"),
           k.part(k.box((0.06, 0.03, 0.05), 0.004), "db_rubble", (0.28, 0.015, 0.02),
                  rot=(0, 2.7, 0), name="ChunkB3"),
       ])


# =============================================================================
# CEILING SERVICES — the dormitory/waiting-room "missing tiles" and the
# corridor plate's exposed conduit and hanging cable.
# =============================================================================

k.prop("missing_ceiling_tile", "ceiling", (0.62, 0.24, 0.62), doc="""\
A gap in the suspended ceiling grid — one 0.6x0.6 module, matching the
600mm module ceiling_troffer's 1.2x0.6 housing already implies. Cheap (4
parts) and, per the brief, "enormously effective": nothing else in the kit
turns a flat ceiling plane into "there is a void above this" for so little.

Built with the SAME fake-recess trick ceiling_troffer's Recess uses — a
db_void box set back behind a steel `frame()` GridEdge — rather than an
actually-deep hole, because every ceiling part must keep y <= 0 (see
prop_defs.py's mount-rule docstring) and a true void would need to recede
UPWARD past the ceiling plane, which the mount contract forbids. ServiceHint
is a short length of dark (props/chain, not steel — it must stay a shadow, not
a highlight) conduit glimpsed at an angle in the gloom, further back than the
void itself.

DroopedTile is the one part that earns the "missing" in the name over a
plain black hole: a cracked 0.6x0.6 tile fragment still hinged at one edge,
hanging into the gap. Its rotation is a roll (rot.z) about its own centre,
so — same reasoning as paper_scatter's curl — the pinned edge sits at
world y = -(hx*sin(a)) plus a small safety margin, deliberately hung a
centimetre clear of the grid plane rather than flush with it, so it never
pokes back up through y=0.""",
       parts=[
           k.part(k.frame(0.60, 0.60, 0.035, 0.025), "steel", (0, -0.012, 0),
                  rot=(math.pi / 2, 0, 0), name="GridEdge"),
           k.part(k.box((0.52, 0.06, 0.52), 0.006), "db_void", (0, -0.045, 0),
                  name="VoidRecess"),
           k.part(k.cyl(0.016, 0.28, 8, 0.003), "chain", (0.05, -0.09, -0.06),
                  rot=(0, 0.3, math.pi / 2), name="ServiceHint"),
           k.part(k.box((0.28, 0.016, 0.28), 0.004), "prop", (-0.05, -0.118, 0.02),
                  rot=(0, 0.25, 0.8), name="DroopedTile"),
       ])

k.prop("ceiling_conduit", "ceiling", (2.0, 0.14, 0.10), doc="""\
2m of rigid conduit at ceiling level, on saddle clips with a junction box —
the corridor plate's exposed services, decayed and loose rather than
pipe_run's clean collar-bracketed wall run. X extent is EXACTLY 2.0 so
`r.prop_run("ceiling_conduit", "x", lo, hi, cross)` tiles a corridor with no
gap or overlap, same contract pipe_run documents for its own axis.

Deliberately NOT pipe_run's dimensions reused: pipe_run's 35mm-radius pipe is
a wall-height service main, this is slimmer 26mm conduit at ceiling height,
so the two stay visually distinct even hung in the same room. Saddle clips
and collars are props/chain (aged dark iron) rather than props/steel (pale
brushed) — the wall version's brackets are steel because bumper_rail/pipe_run
are still-maintained fittings; this run is the "patched, not maintained"
half of the kit, so its ironwork reads correspondingly darker.

JBox sits centred on the run and visually swallows the section of pipe
behind it, the same simplification ceiling_troffer's housing/recess/bezel
stack uses rather than modelling the pipe literally passing through a
hollow box — nothing in this kit's primitive set can cut a hole in a box.""",
       parts=[
           k.part(k.cyl(0.026, 2.0, 10, 0.003), "steel", (0, -0.09, 0),
                  rot=(0, 0, math.pi / 2), name="Pipe"),
           k.part(k.box((0.022, 0.09, 0.045), 0.003), "chain", (-0.85, -0.045, 0),
                  name="ClipL"),
           k.part(k.box((0.022, 0.09, 0.045), 0.003), "chain", (0.85, -0.045, 0),
                  name="ClipR"),
           k.part(k.tube(0.032, 0.027, 0.03, 10), "chain", (-0.85, -0.09, 0),
                  rot=(0, 0, math.pi / 2), name="CollarL"),
           k.part(k.tube(0.032, 0.027, 0.03, 10), "chain", (0.85, -0.09, 0),
                  rot=(0, 0, math.pi / 2), name="CollarR"),
           k.part(k.box((0.10, 0.08, 0.10), 0.006), "steel", (0, -0.06, 0),
                  name="JBox"),
           k.part(k.box((0.084, 0.006, 0.084), 0.002), "chain", (0, -0.104, 0),
                  name="JBoxLid"),
       ])

# (x, y) waypoints for hanging_cable's droop, symmetric about x=0. y=0 is the
# ceiling plane; more negative is a deeper sag. Two fixings 1.10m apart,
# ~0.30m sag at centre. Literal constants (not a spline) so the shape below
# is exactly what is authored here and reproduces byte-for-byte.
_CABLE_WAYPOINTS = (
    (-0.55, -0.02), (-0.35, -0.16), (-0.15, -0.26),
    (0.0, -0.30),
    (0.15, -0.26), (0.35, -0.16), (0.55, -0.02),
)


def _cable_droop(waypoints, r, mat):
    """Straight cylinder segments through `waypoints`, approximating a sag.

    cyl has no bend, so the droop is N short segments rather than a curve.
    Each segment's rotation is derived, not guessed: a cylinder's local +Y
    maps to world (-sin(phi), cos(phi), 0) under a pure Z-rotation (the same
    mapping pipe_run's rot=(0,0,PI/2) uses to lay its pipe along +X), so
    solving (-sin(phi), cos(phi)) = (dx, dy)/length for one segment gives
    phi = atan2(-dx, dy). Getting the sign backwards here would not crash
    anything — it would just yaw every segment 180 degrees around its own
    midpoint, invisible on a cylinder and only catchable by looking.
    """
    out = []
    for i in range(len(waypoints) - 1):
        (x0, y0), (x1, y1) = waypoints[i], waypoints[i + 1]
        dx, dy = x1 - x0, y1 - y0
        out.append(k.part(
            k.cyl(r, math.hypot(dx, dy), 8, 0.002), mat,
            ((x0 + x1) / 2.0, (y0 + y1) / 2.0, 0),
            rot=(0, 0, math.atan2(-dx, dy)),
            name="Seg%d" % i))
    return out


k.prop("hanging_cable", "ceiling", (1.16, 0.34, 0.05), doc="""\
A slack cable drooping in a catenary between two ceiling fixings — the
"tangle of wiring" over the corridor plate's bare bulb, or a loose run left
disconnected anywhere else. Not a `prop_run` segment (a droop does not
tile): place it once between two fixed points roughly 1.1m apart.

See `_cable_droop()` above for how the sag is built: cyl has no bend, so it
is 6 short segments through the 7 literal waypoints in `_CABLE_WAYPOINTS`,
each segment's rotation solved from its own endpoints rather than guessed.

Cable material is props/rubber_mat (black, fully rough) reused verbatim —
a cable jacket and a castor tyre are the same surface, no new material
earns its keep here. FixingL/R are small dark cable glands where the run
disappears into the ceiling at each end.""",
       parts=[
           k.part(k.box((0.035, 0.035, 0.035), 0.004), "chain",
                  (_CABLE_WAYPOINTS[0][0], -0.0175, 0), name="FixingL"),
           k.part(k.box((0.035, 0.035, 0.035), 0.004), "chain",
                  (_CABLE_WAYPOINTS[-1][0], -0.0175, 0), name="FixingR"),
       ] + _cable_droop(_CABLE_WAYPOINTS, 0.010, "rubber"))


# =============================================================================
# WALL DECAY
# =============================================================================

_FPP_MOUNT_Y = 0.60

k.prop("fallen_plaster_patch", "wall", (0.60, 1.20, 0.20), mount_y=_FPP_MOUNT_Y, doc="""\
An irregular area of exposed substrate where plaster has come away, with a
rubble pile at its base — "plaster fallen away from walls in large patches",
the dormitory/waiting-room plates' other repeated tell besides missing
ceiling tiles. 11 parts.

THE FAKE RECESS, again. A wall prop's parts must keep z <= 0 (grow into the
room, prop_defs.py's mount-rule docstring), so an exposed patch cannot
actually recede INTO the wall the way real lost plaster would — it is sold
by db_substrate sitting nearly flush (z=-0.010) while three loose fragments
(props/prop, cream — still-clinging plaster, not yet fallen) stand slightly
proud of it (z as far as -0.035) and throw the shadow that reads as depth.
Two EdgeA/EdgeB chunks at different z and a small yaw each break the patch's
otherwise-rectangular silhouette; a single rectangular db_substrate box
alone reads as a sign stuck to the wall, not a hole in it.

THE BASE PILE reuses plaster_rubble's own box sizes and its db_rubble
material verbatim — same reasoning mop_bucket's castor gives for reusing
office_chair's: a chunk that fell off THIS wall and a chunk lying loose on
a floor elsewhere are the same object. Pile parts sit at
`-mount_y + half_height`, which is what lands them on the actual floor
(world y=0) from a wall prop's origin at `mount_y` — the same arithmetic
radiator's floor stub or sink's trap would need if they reached the floor,
which neither does; this is the first wall prop in the kit whose dressing
does.""",
       parts=[
           # -- exposed substrate, nearly flush (z ~ -0.01) --
           k.part(k.box((0.46, 0.50, 0.018), 0.012), "db_substrate", (0, 0.05, -0.010),
                  name="MainPatch"),
           k.part(k.box((0.20, 0.16, 0.022), 0.010), "db_substrate", (-0.20, 0.28, -0.012),
                  rot=(0, 0, 0.25), name="EdgeA"),
           k.part(k.box((0.16, 0.22, 0.020), 0.010), "db_substrate", (0.19, -0.10, -0.012),
                  rot=(0, 0, -0.18), name="EdgeB"),
           # Sits mostly BELOW MainPatch's own y=-0.20 edge and one mm more
           # proud (z=-0.011 vs -0.010), or it is fully hidden behind
           # MainPatch's larger footprint — the first version put it centred
           # UNDER MainPatch, entirely occluded and rendering nothing, a
           # wasted draw call invisible in the source and only caught by the
           # gallery shot.
           k.part(k.box((0.30, 0.10, 0.014), 0.006), "prop", (0.0, -0.24, -0.011),
                  rot=(0, 0, 0.05), name="LathHint"),
           # -- still-clinging fragments, proud of the patch --
           k.part(k.box((0.09, 0.07, 0.05), 0.008), "prop", (-0.15, 0.35, -0.03),
                  rot=(0.3, 0, 0.4), name="Frag0"),
           k.part(k.box((0.07, 0.05, 0.04), 0.006), "prop", (0.18, 0.18, -0.035),
                  rot=(-0.2, 0, -0.3), name="Frag1"),
           k.part(k.box((0.06, 0.06, 0.045), 0.006), "prop", (0.02, -0.20, -0.03),
                  rot=(0.15, 0, 0.5), name="Frag2"),
           # -- base pile, on the actual floor: y = -mount_y + half_height --
           k.part(k.box((0.10, 0.04, 0.08), 0.006), "db_rubble",
                  (-0.14, -_FPP_MOUNT_Y + 0.02, -0.12), rot=(0, 0.4, 0), name="RubbleA"),
           k.part(k.box((0.06, 0.03, 0.05), 0.004), "db_rubble",
                  (0.05, -_FPP_MOUNT_Y + 0.015, -0.15), rot=(0, 1.2, 0), name="RubbleB"),
           k.part(k.box((0.06, 0.03, 0.05), 0.004), "db_rubble",
                  (0.18, -_FPP_MOUNT_Y + 0.015, -0.10), rot=(0, 2.0, 0), name="RubbleC"),
           k.part(k.box((0.14, 0.05, 0.10), 0.008), "db_rubble",
                  (-0.02, -_FPP_MOUNT_Y + 0.025, -0.18), rot=(0, 0.7, 0), name="RubbleD"),
       ])


# =============================================================================
# STRETCH: cable tray (repeatable, like ceiling_conduit) and a floor drain
# grate for sluice/bathroom rooms.
# =============================================================================

k.prop("cable_tray", "ceiling", (2.0, 0.16, 0.24), doc="""\
2m of perforated cable tray at high level, bundled cables running its
length — the corridor plate's other reading of "services left exposed",
alongside ceiling_conduit but a different silhouette (a wide slotted channel
rather than a round pipe) so the two can run side by side without reading
as duplicates. X extent is exactly 2.0 for `prop_run()`, same contract as
ceiling_conduit.

TrayBed is `slats()` laid flat with the SAME rot=(PI/2,0,0) flattening
ceiling_troffer's Bezel and missing_ceiling_tile's GridEdge use — turning a
vertical louvre (blades stacked in Y, gaps between them) into a horizontal
slotted floor (blades stacked across Z, gaps forming the perforation slots),
because an X-only rotation leaves the local X axis — and therefore the run's
2.0m length — untouched. See those props' docs for the general trick;
slats() has no primitive of its own for "flat and perforated", so this reuses
the louvre one instead of asking for a sixth primitive.

Two cable radii in props/rubber (black) and props/chain (dark iron, reused
for a second, visually distinct cable jacket) rather than a new material —
three colours of cable out of two existing dark materials was enough
variation to read as "bundled", not "identical".

CABLE HEIGHT, worked not guessed: TrayBed is a flattened `slats()` blade of
thickness `d=0.014` centred at y=-0.09, so its solid material occupies
y in [-0.097, -0.083] — the top surface a resting cable's UNDERSIDE must
clear is therefore y=-0.083, not the tray's own centre y. The first version
placed every cable near y=-0.083 (± a few mm) with NO account for their own
radius, which put each cable's centre roughly level with the tray's top
surface and its lower half embedded in solid tray material — invisible in
the generator, and only obvious from a raking side angle in the gallery
shot, not the straight-down one. Each cable's y is now
`-0.083 + radius + 0.002` clearance, so every one rests ON TOP of the tray
bed with a hairline gap.""",
       parts=[
           k.part(k.slats(2.0, 0.22, 0.014, 7, 0.0, 0.55), "steel", (0, -0.09, 0),
                  rot=(math.pi / 2, 0, 0), name="TrayBed"),
           k.part(k.box((2.0, 0.03, 0.012), 0.004), "steel", (0, -0.075, -0.10),
                  name="RailNear"),
           k.part(k.box((2.0, 0.03, 0.012), 0.004), "steel", (0, -0.075, 0.10),
                  name="RailFar"),
           k.part(k.cyl(0.012, 2.0, 8, 0.002), "rubber", (0, -0.069, -0.04),
                  rot=(0, 0, math.pi / 2), name="CableA"),
           k.part(k.cyl(0.010, 2.0, 8, 0.002), "chain", (0, -0.071, 0.015),
                  rot=(0, 0, math.pi / 2), name="CableB"),
           k.part(k.cyl(0.013, 2.0, 8, 0.002), "rubber", (0, -0.068, 0.06),
                  rot=(0, 0, math.pi / 2), name="CableC"),
           k.part(k.box((0.022, 0.05, 0.022), 0.003), "chain", (-0.85, -0.045, 0),
                  name="HangerL"),
           k.part(k.box((0.022, 0.05, 0.022), 0.003), "chain", (0.85, -0.045, 0),
                  name="HangerR"),
       ])

k.prop("floor_drain", "floor", (0.26, 0.02, 0.26), doc="""\
A small recessed floor grate for a sluice or bathroom room. The smallest
prop in the kit (4 parts) and the only one that keeps the fake-recess trick
entirely flush rather than set back, because a floor prop's parts must keep
y >= 0 (prop_defs.py's mount-rule docstring) — there is no way to sink a true
pit into the floor, so the "recess" is a slightly PROUD (y=0.003) db_void
plate under a grate, the same inversion missing_ceiling_tile and
fallen_plaster_patch each apply for their own mount's sign.

Grate is one direction of louvres (`slats` at fill=0.28, the sparse end of
the range wall_vent and barred_window's bar primitives already use) rather
than a crossed grid — a true cross-hatch needs a second slats call rotated
about an axis this file could not derive with confidence from the existing
primitives, and a single guessed-wrong rotation on a 4-part prop is not worth
the risk of shipping a bar grille that reads as louvres from every angle.
One direction of bars over a dark recess is common enough on real drain
covers to read correctly on its own.""",
       parts=[
           k.part(k.box((0.20, 0.006, 0.20), 0.002), "db_void", (0, 0.003, 0),
                  name="VoidRecess"),
           k.part(k.tube(0.11, 0.095, 0.01, 12), "steel", (0, 0.006, 0),
                  rot=(math.pi / 2, 0, 0), name="CollarRing"),
           k.part(k.slats(0.20, 0.20, 0.010, 6, 0.0, 0.28), "steel", (0, 0.009, 0),
                  rot=(math.pi / 2, 0, 0), name="GrateBars"),
           k.part(k.frame(0.24, 0.24, 0.025, 0.012), "steel", (0, 0.006, 0),
                  rot=(math.pi / 2, 0, 0), name="Rim"),
       ])
