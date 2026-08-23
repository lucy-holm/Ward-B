"""Ward furniture and fittings — the concept-art props Tier 1-4 still lacked.

WHAT THIS MODULE ADDS, and why it is a separate file rather than more entries
in prop_defs.py: this is an EXTENSION MODULE (see prop_defs.py's own bottom-of-
file section on the mechanism). It declares the medication cabinet, the padded
cell wall, the privacy curtain, the locker bank, the bedside cabinet, the
wheelchair, the dressings trolley, the fire hose reel and the door vision
panel — everything the corridor and waiting-area concept plates show that the
kit's original 27 props do not cover.

SAME CONVENTIONS AS prop_defs.py, not a variant of them: front toward -Z,
width along X, height along Y; floor origin on the floor; wall origin on the
wall face with parts at z <= 0; ceiling origin on the ceiling plane with parts
at y <= 0. Every dimension below was chosen to reuse an existing MESHES key
where the geometry is genuinely the same size as something in prop_defs.py
(the office chair's castor, most usefully — three different props below stand
on it) and to declare a fresh size where it is not, per prop_defs.py's own
note that the dedup key means new geometry only costs what it has to.
"""

import math

import prop_defs as k

k.material("wf_frostglass", "res://props/wf_frostglass_mat.tres")
k.material("wf_curtain", "res://props/wf_curtain_mat.tres")
k.material("wf_padvinyl", "res://props/wf_padvinyl_mat.tres")

# Shorthand purely for readability below — every call still goes through k.
box, cyl, tube, taper, frame, slats, part = k.box, k.cyl, k.tube, k.taper, k.frame, k.slats, k.part

# CASTOR_MESH: office_chair's exact castor key (26mm wheel, 28mm hub depth).
# Declaring it again with identical numbers is what makes the wheelchair and
# the dressings trolley below cost nothing extra for their castors — same
# lesson mop_bucket and iv_stand already banked in prop_defs.py.
CASTOR_MESH = cyl(0.026, 0.028, 10, 0.004)


# =============================================================================
# MEDICATION CABINET — corridor plate's centrepiece. Intact and smashed
# variants share every part except the panes, which is exactly the
# mesh-sharing the kit is built for: the carcass, mullion grid, reveal frame
# and shelf are declared ONCE by _cabinet_shell() and each prop() call adds
# only what differs.
# =============================================================================

_CAB_CELL_X = (-0.185, 0.185)
_CAB_CELL_Y = (-0.287, 0.0, 0.287)


def _cabinet_shell():
    """Carcass, recessed compartment backs, mullion grid, reveal, counter
    shelf — everything both cabinet variants share.

    DEPTH ORDER, FRONT (most negative z) TO BACK, because getting this
    backwards is the trap: the carcass is a SOLID box across the full
    footprint, so anything meant to be seen through the opening must sit in
    front of it, never behind it — a part positioned "inside" a solid box
    is dead geometry no camera angle will ever reveal. Reveal (-0.245) >
    mullion grid (-0.225) > glass plane (-0.215) > recessed compartment
    backs (-0.205) > carcass front face (-0.20, the back of the assembly).
    """
    parts = [
        part(box((0.82, 1.00, 0.20), 0.008), "steel", (0, 0, -0.10), name="Carcass"),
        part(box((0.74, 0.86, 0.02), 0.004), "chain", (0, 0, -0.205), name="Recess"),
        part(box((0.028, 0.86, 0.05), 0.006), "steel", (0, 0, -0.225), name="MullionV"),
        part(box((0.74, 0.026, 0.05), 0.005), "steel", (0, 0.143, -0.225), name="MullionH0"),
        part(box((0.74, 0.026, 0.05), 0.005), "steel", (0, -0.143, -0.225), name="MullionH1"),
        part(frame(0.82, 1.00, 0.05, 0.035), "steel", (0, 0, -0.245), name="Reveal"),
        part(box((0.86, 0.045, 0.30), 0.006), "steel", (0, -0.565, -0.15), name="Shelf"),
        part(box((0.025, 0.12, 0.24), 0.004), "chain", (-0.37, -0.60, -0.13), name="BracketL"),
        part(box((0.025, 0.12, 0.24), 0.004), "chain", (0.37, -0.60, -0.13), name="BracketR"),
    ]
    return parts


k.prop("med_cabinet", "wall", (0.86, 1.16, 0.30), mount_y=1.35,
       collider=(0.86, 0.30), doc="""\
Wall-mounted glazed medication cabinet, six compartments over a steel counter
shelf — the corridor plate's clearest fixture, straight off its glass-front
compartments and the shelf slung underneath. This is the INTACT half; see
med_cabinet_smashed for the vandalised twin the same plate actually
shows, sharing every part except the panes.

Carries a collider like sink does and for the same reason: the shelf sticks
0.30m off the wall at roughly counter height, which a wall-dressing prop with
no collider lets the player clip straight through.""",
       parts=_cabinet_shell() + [
           part(box((0.34, 0.26, 0.010), 0.004), "wf_frostglass", (cx, cy, -0.215),
                name="Pane%d%d" % (i, j))
           for i, cx in enumerate(_CAB_CELL_X)
           for j, cy in enumerate(_CAB_CELL_Y)
       ])

k.prop("med_cabinet_smashed", "wall", (0.86, 1.16, 0.30), mount_y=1.35,
       collider=(0.86, 0.30), doc="""\
Same cabinet, glass gone and compartments emptied — the corridor plate's
actual state, not a guess: it shows this exact fixture with every pane
smashed out and nothing left in the compartments. Shares carcass, mullion
grid, reveal and shelf with med_cabinet via _cabinet_shell(); the only
difference is no Pane parts, so the dark Recess shows through the empty
grid, plus a scatter of shard fragments on the counter shelf below —
the cheapest possible "this just happened" signal, same trick
binder_stack's off-axis lean uses.

Reach for this one over the intact cabinet in any room already read as
ransacked (rooms with an overturned gurney, a forced door); keep the intact
one for a ward that still looks staffed.""",
       parts=_cabinet_shell() + [
           part(box((0.05, 0.006, 0.035), 0.001), "wf_frostglass", (-0.30, -0.535, -0.20),
                rot=(0, 0.4, 0.15), name="ShardA"),
           part(box((0.04, 0.005, 0.028), 0.001), "wf_frostglass", (-0.12, -0.535, -0.22),
                rot=(0, -0.3, -0.10), name="ShardB"),
           part(box((0.045, 0.006, 0.030), 0.001), "wf_frostglass", (0.18, -0.535, -0.18),
                rot=(0, 0.6, 0.20), name="ShardC"),
       ])


# =============================================================================
# PADDED CELL WALL PANEL — the signature psychiatric-ward surface the material
# study board puts front and centre and the kit had nothing for. A `run` prop
# like skirting/bumper_rail/pipe_run: 2m wide so prop_run() tiles it cleanly.
# =============================================================================

k.prop("padded_wall_panel", "wall", (2.0, 1.70, 0.10), mount_y=1.05, doc="""\
2m of cream quilted-vinyl wall padding, diamond-tufted with button studs —
the material study board's "worn padded-cell wall fabric" panel, tiled with
prop_run() exactly like skirting: `r.prop_run("padded_wall_panel", "z", lo,
hi, wall_at)` dresses a whole padded cell in one call.

THE BUTTONS ARE A QUINCUNX, NOT A GRID. A true square grid of tuft studs
reads as a grille; offsetting alternate rows by half the column spacing is
what makes it read as diamond quilting instead — five studs on even rows,
four on odd, the same pattern every padded surface in the reference actually
uses. The bulge behind them is one heavily bevelled box rather than a
sculpted quilted surface: the primitive set here has no cloth deformation, so
the bevel's round shoulder is the entire illusion of a soft, puffy panel, and
it only reads at the 0.030 bevel used here — a domestic 0.006 box bevel
looked like a hard steel plate.""",
       parts=[
           part(box((2.0, 1.70, 0.02), 0.004), "wf_padvinyl", (0, 0, -0.01), name="Backing"),
           part(box((1.94, 1.64, 0.075), 0.030), "wf_padvinyl", (0, 0, -0.0575), name="Pad"),
           part(box((2.0, 0.04, 0.03), 0.006), "trim", (0, 0.85, -0.02), name="RailTop"),
           part(box((2.0, 0.04, 0.03), 0.006), "trim", (0, -0.85, -0.02), name="RailBottom"),
       ] + [
           part(cyl(0.010, 0.020, 8, 0.003), "trim", (x, y, -0.10), rot=(math.pi / 2, 0, 0),
                name="Button_%d_%d" % (ri, ci))
           for ri, (y, cols) in enumerate((
               (-0.66, (-0.8, -0.4, 0.0, 0.4, 0.8)),
               (-0.22, (-0.6, -0.2, 0.2, 0.6)),
               (0.22, (-0.8, -0.4, 0.0, 0.4, 0.8)),
               (0.66, (-0.6, -0.2, 0.2, 0.6)),
           ))
           for ci, x in enumerate(cols)
       ])


# =============================================================================
# PRIVACY CURTAIN AND CEILING TRACK — ward dormitories are full of these, and
# a half-drawn curtain breaks a long sight line without blocking the corridor.
# =============================================================================

k.prop("privacy_curtain", "ceiling", (2.0, 1.90, 0.14), doc="""\
2m ceiling curtain track with a heavy privacy curtain HALF DRAWN — gathered
into a bunch at one end, hanging open along the rest. Half-drawn rather than
either extreme on purpose: fully open is just a rail (nothing to look at),
fully closed reads as a wall (blocks the sight line the dormitory needs to
read as a receding row of beds); half-drawn gets a folded silhouette AND
keeps the room open.

BOTH SLATS BLOCKS ARE VERTICALLY OFF-CENTRE ON PURPOSE. Each is built with
slats() then rotated 90deg about Z exactly like barred_window's glazing bars,
which means the mesh is symmetric about the PART's own origin — so the part
position has to be the curtain's vertical MIDPOINT (track height minus half
the drop), not the track height itself. Placing it at the track height was
the first version's bug: the top half of the curtain poked up through the
ceiling plane, invisible in a still because the ceiling hides it, obvious
the moment the camera moved below the fitting.

The gathered end uses a lower fill (0.60, more gap) than the open run (0.85,
mostly solid) — that contrast is the entire "half-drawn" read; at the same
fill on both they look like two different curtains rather than one pulled
partway.""",
       parts=[
           part(box((2.0, 0.03, 0.03), 0.004), "steel", (0, -0.015, 0), name="Track"),
           part(box((0.02, 0.05, 0.02), 0.003), "steel", (-0.9, -0.04, 0), name="BracketL"),
           part(box((0.02, 0.05, 0.02), 0.003), "steel", (0, -0.04, 0), name="BracketM"),
           part(box((0.02, 0.05, 0.02), 0.003), "steel", (0.9, -0.04, 0), name="BracketR"),
           part(slats(1.85, 0.40, 0.11, 7, 0.0, 0.60), "wf_curtain", (-0.80, -0.94, 0),
                rot=(0, 0, math.pi / 2), name="Gathered"),
           part(slats(1.85, 1.50, 0.03, 6, 0.0, 0.85), "wf_curtain", (0.17, -0.94, 0),
                rot=(0, 0, math.pi / 2), name="Open"),
       ])


# =============================================================================
# LOCKER BANK — tall steel storage, the corridor's other fixture besides the
# medication cabinet. Three doors: wide enough to read as a bank, narrow
# enough to still fit a corridor without eating the walkway.
# =============================================================================

k.prop("locker_bank", "floor", (0.90, 1.86, 0.50), collider=(0.92, 0.52), doc="""\
Three-door steel locker bank on a plinth, louvred vents and a recessed
handle on each door. Reach for this over filing_cabinet when a room needs
personal storage rather than records storage — a records office gets filing
cabinets, a ward corridor or staff room gets lockers.

The louvre vents reuse wall_vent's tilt (0.55rad) at a smaller scale: same
shadow trick, tilted blades reading as a dark slot rather than a painted
stripe, proven at corridor-fixture scale before it was reused at
door-panel scale.

THE CARCASS IS "chain", NOT "steel", EVEN THOUGH THE DOORS ARE "steel". Same
colour for both was the first version, and it was a mistake caught only by
looking: with a 15mm door-to-door gap and identical materials on both sides
of it, three doors render as one seamless slab — filing_cabinet avoids
exactly this by putting its drawer fronts ("prop") on a differently
coloured carcass ("chain"), and copying that contrast is what makes the
three doors here actually read as three doors instead of one.""",
       parts=[
           part(box((0.86, 0.06, 0.46), 0.006), "chain", (0, 0.03, 0), name="Plinth"),
           part(box((0.90, 1.80, 0.50), 0.008), "chain", (0, 0.96, 0), name="Carcass"),
       ] + [
           p
           for i, x in enumerate((-0.30, 0.0, 0.30))
           for p in (
               part(box((0.285, 1.70, 0.02), 0.005), "steel", (x, 0.96, -0.255),
                    name="Door%d" % i),
               part(slats(0.22, 0.12, 0.014, 5, 0.55, 0.55), "steel", (x, 1.55, -0.268),
                    name="Vent%d" % i),
               part(box((0.02, 0.09, 0.03), 0.004), "chain", (x + 0.11, 0.90, -0.27),
                    name="Handle%d" % i),
               part(box((0.075, 0.05, 0.006), 0.002), "paper", (x, 1.30, -0.267),
                    name="Tag%d" % i),
           )
       ])


# =============================================================================
# BEDSIDE CABINET — one per bed. Small on purpose: ward_bed already carries
# the dormitory's mass, this just needs to sit beside it without competing.
# =============================================================================

k.prop("bedside_cabinet", "floor", (0.45, 0.68, 0.40), collider=(0.47, 0.42), doc="""\
Small cupboard-and-drawer unit, one per bed. Cream enamel like the radiator
and the sink — the ward's original-spec fittings, painted rather than bare
steel, and the family this belongs to visually. Deliberately proportioned to
sit inside a bed's 0.92m width with room either side: place it against the
headboard's side rail, not centred on the bed.""",
       parts=[
           part(box((0.40, 0.04, 0.36), 0.004), "chain", (0, 0.02, 0), name="Kick"),
           part(box((0.44, 0.62, 0.38), 0.008), "enamel", (0, 0.31, 0), name="Carcass"),
           part(box((0.46, 0.03, 0.40), 0.006), "steel", (0, 0.635, 0), name="Top"),
           part(box((0.38, 0.16, 0.02), 0.004), "enamel", (0, 0.50, -0.20), name="Drawer"),
           part(box((0.10, 0.02, 0.025), 0.003), "chain", (0, 0.50, -0.215), name="DrawerPull"),
           part(box((0.38, 0.36, 0.02), 0.005), "enamel", (0, 0.22, -0.20), name="Door"),
           part(cyl(0.012, 0.035, 8, 0.002), "chain", (0.14, 0.22, -0.215),
                rot=(math.pi / 2, 0, 0), name="DoorKnob"),
       ])


# =============================================================================
# WHEELCHAIR — folding-frame type. Big rear wheels the patient (or an
# orderly, standing behind) drives from; small front castors that steer.
# =============================================================================

k.prop("wheelchair", "floor", (0.68, 0.92, 1.10), collider=(0.68, 1.10), doc="""\
Folding-frame wheelchair: large rear wheels with push rims, small front
castors, footplates, push handles behind the backrest.

FRONT IS -Z, WHICH MEANS THE FOOTPLATES ARE AT -Z AND THE PUSH HANDLES ARE AT
+Z — the same "front is where the OCCUPANT faces" rule office_chair's header
warns about, and just as easy to get backwards here: the big wheels are the
visually dominant feature, and placing them at -Z (the intuitive "business
end") would put the patient facing the handles, sitting backwards. Big
wheels belong at the REAR (+Z, where a standing orderly pushes from) exactly
because they are dominant — that is what "rear" means on a real wheelchair.

The front castors reuse office_chair's exact castor mesh (CASTOR_MESH,
26mm/28mm) — free, since the dedup key only cares about dimensions.""",
       parts=[
           part(cyl(0.28, 0.035, 24, 0.006), "rubber", (-0.32, 0.28, 0.30),
                rot=(0, 0, math.pi / 2), name="WheelL"),
           part(cyl(0.28, 0.035, 24, 0.006), "rubber", (0.32, 0.28, 0.30),
                rot=(0, 0, math.pi / 2), name="WheelR"),
           part(tube(0.30, 0.28, 0.02, 24), "steel", (-0.32, 0.28, 0.30),
                rot=(0, 0, math.pi / 2), name="RimL"),
           part(tube(0.30, 0.28, 0.02, 24), "steel", (0.32, 0.28, 0.30),
                rot=(0, 0, math.pi / 2), name="RimR"),
           part(CASTOR_MESH, "rubber", (-0.26, 0.026, -0.32), rot=(0, 0, math.pi / 2),
                name="CastorL"),
           part(CASTOR_MESH, "rubber", (0.26, 0.026, -0.32), rot=(0, 0, math.pi / 2),
                name="CastorR"),
           part(box((0.02, 0.10, 0.03), 0.003), "steel", (-0.26, 0.09, -0.32), name="ForkL"),
           part(box((0.02, 0.10, 0.03), 0.003), "steel", (0.26, 0.09, -0.32), name="ForkR"),
           part(cyl(0.016, 0.62, 8, 0.003), "steel", (-0.24, 0.40, 0),
                rot=(math.pi / 2, 0, 0), name="RailL"),
           part(cyl(0.016, 0.62, 8, 0.003), "steel", (0.24, 0.40, 0),
                rot=(math.pi / 2, 0, 0), name="RailR"),
           part(box((0.46, 0.05, 0.42), 0.012), "vinyl", (0, 0.46, 0.02), name="Seat"),
           part(box((0.44, 0.42, 0.05), 0.015), "vinyl", (0, 0.70, 0.22),
                rot=(-0.12, 0, 0), name="Backrest"),
           part(box((0.03, 0.03, 0.30), 0.004), "steel", (-0.245, 0.62, 0.05), name="ArmL"),
           part(box((0.03, 0.03, 0.30), 0.004), "steel", (0.245, 0.62, 0.05), name="ArmR"),
           part(box((0.025, 0.16, 0.025), 0.004), "steel", (-0.245, 0.54, -0.08), name="ArmPostLF"),
           part(box((0.025, 0.16, 0.025), 0.004), "steel", (0.245, 0.54, -0.08), name="ArmPostRF"),
           part(box((0.03, 0.14, 0.03), 0.004), "rubber", (-0.20, 0.85, 0.32), name="HandleL"),
           part(box((0.03, 0.14, 0.03), 0.004), "rubber", (0.20, 0.85, 0.32), name="HandleR"),
           part(cyl(0.014, 0.20, 8, 0.003), "steel", (-0.20, 0.78, 0.27),
                rot=(0.30, 0, 0), name="HandlePostL"),
           part(cyl(0.014, 0.20, 8, 0.003), "steel", (0.20, 0.78, 0.27),
                rot=(0.30, 0, 0), name="HandlePostR"),
           part(box((0.14, 0.02, 0.16), 0.004), "steel", (-0.13, 0.12, -0.44),
                rot=(0.30, 0, 0), name="FootplateL"),
           part(box((0.14, 0.02, 0.16), 0.004), "steel", (0.13, 0.12, -0.44),
                rot=(0.30, 0, 0), name="FootplateR"),
           part(cyl(0.012, 0.28, 8, 0.002), "steel", (-0.13, 0.24, -0.38),
                rot=(0.35, 0, 0), name="FootRodL"),
           part(cyl(0.012, 0.28, 8, 0.002), "steel", (0.13, 0.24, -0.38),
                rot=(0.35, 0, 0), name="FootRodR"),
       ])


# =============================================================================
# DRESSINGS / INSTRUMENT TROLLEY — two-tier steel trolley on castors.
# =============================================================================

k.prop("dressings_trolley", "floor", (0.50, 0.92, 0.38), collider=(0.52, 0.40), doc="""\
Two-tier steel dressings trolley: castors, two rimmed shelves, a push handle.
The rims reuse frame() flat rather than a raised lip like wall_shelf's — a
frame set at the shelf's own edge with a shallow depth reads as a rolled
steel tray edge, which is what an actual dressings trolley has, where
wall_shelf's lip (a separate proud board) reads right for a fixed shelf but
wrong for a pressed-steel tray.

Carries two small instrument props on the top shelf — a kidney dish and a
bottle — for the same reason binder_stack leans one binder: a single
off-catalogue detail is what tells the player someone was using this a
moment ago, not the kit's collision system doing any work.""",
       parts=[
           part(CASTOR_MESH, "rubber", (-0.20, 0.026, -0.14), rot=(0, 0, math.pi / 2),
                name="CastorFL"),
           part(CASTOR_MESH, "rubber", (0.20, 0.026, -0.14), rot=(0, 0, math.pi / 2),
                name="CastorFR"),
           part(CASTOR_MESH, "rubber", (-0.20, 0.026, 0.14), rot=(0, 0, math.pi / 2),
                name="CastorBL"),
           part(CASTOR_MESH, "rubber", (0.20, 0.026, 0.14), rot=(0, 0, math.pi / 2),
                name="CastorBR"),
           part(cyl(0.016, 0.78, 8, 0.003), "steel", (-0.20, 0.42, -0.14), name="LegFL"),
           part(cyl(0.016, 0.78, 8, 0.003), "steel", (0.20, 0.42, -0.14), name="LegFR"),
           part(cyl(0.016, 0.78, 8, 0.003), "steel", (-0.20, 0.42, 0.14), name="LegBL"),
           part(cyl(0.016, 0.78, 8, 0.003), "steel", (0.20, 0.42, 0.14), name="LegBR"),
           part(box((0.46, 0.02, 0.34), 0.005), "steel", (0, 0.34, 0), name="ShelfLo"),
           part(frame(0.46, 0.34, 0.02, 0.03), "chain", (0, 0.355, 0),
                rot=(math.pi / 2, 0, 0), name="RimLo"),
           part(box((0.46, 0.02, 0.34), 0.005), "steel", (0, 0.80, 0), name="ShelfHi"),
           part(frame(0.46, 0.34, 0.02, 0.03), "chain", (0, 0.815, 0),
                rot=(math.pi / 2, 0, 0), name="RimHi"),
           part(box((0.44, 0.03, 0.03), 0.005), "steel", (0, 0.95, 0.16), name="Handle"),
           part(cyl(0.012, 0.15, 8, 0.002), "steel", (-0.20, 0.875, 0.16), name="HandlePostL"),
           part(cyl(0.012, 0.15, 8, 0.002), "steel", (0.20, 0.875, 0.16), name="HandlePostR"),
           part(box((0.05, 0.03, 0.08), 0.006), "screen", (-0.10, 0.825, -0.05), name="Dish"),
           part(cyl(0.020, 0.06, 8, 0.003), "paper", (0.12, 0.84, 0.05), name="Bottle"),
       ])


# =============================================================================
# FIRE HOSE REEL — a red drum on a wall bracket, in a shallow recess.
# =============================================================================

k.prop("fire_hose_reel", "wall", (0.56, 0.60, 0.26), mount_y=1.10, doc="""\
Red hose-reel drum on a wall bracket, set into a shallow recess. The ward's
only other saturated red besides fire_extinguisher — see that prop's header
on why the palette keeps that colour rare. Two of them in the same corridor
is fine (real hospitals mount both together); two in the same ROOM starts
competing for the eye and should be avoided.

No collider: it sits IN a recess rather than proud of the wall, unlike
sink or med_cabinet, so nothing sticks out far enough to clip
through — the same reasoning wall_vent and notice_board use to stay pure
dressing.""",
       parts=[
           part(box((0.52, 0.56, 0.05), 0.006), "chain", (0, 0, -0.025), name="Recess"),
           part(box((0.50, 0.54, 0.03), 0.006), "steel", (0, 0, -0.055), name="Backboard"),
           part(box((0.04, 0.04, 0.10), 0.005), "steel", (-0.15, 0, -0.10), name="BracketL"),
           part(box((0.04, 0.04, 0.10), 0.005), "steel", (0.15, 0, -0.10), name="BracketR"),
           part(cyl(0.22, 0.09, 20, 0.010), "red", (0, 0, -0.14),
                rot=(math.pi / 2, 0, 0), name="Drum"),
           part(tube(0.225, 0.20, 0.02, 20), "steel", (0, 0, -0.185),
                rot=(math.pi / 2, 0, 0), name="DrumRim"),
           part(cyl(0.03, 0.10, 10, 0.004), "chain", (0, 0, -0.19),
                rot=(math.pi / 2, 0, 0), name="Hub"),
           part(taper(0.018, 0.008, 0.14), "chain", (0.24, -0.14, -0.10),
                rot=(0, 0, 1.15), name="Nozzle"),
           part(box((0.03, 0.03, 0.03), 0.003), "steel", (0.16, -0.06, -0.10), name="NozzleClip"),
           part(tube(0.05, 0.038, 0.02, 12), "red", (0, -0.26, -0.08),
                rot=(math.pi / 2, 0, 0), name="ValveWheel"),
           part(cyl(0.012, 0.05, 8, 0.002), "steel", (0, -0.26, -0.14),
                rot=(math.pi / 2, 0, 0), name="ValveSpindle"),
       ])


# =============================================================================
# DOOR VISION PANEL PLATE — wire-reinforced frosted glass in a steel surround.
# =============================================================================

k.prop("door_vision_panel", "wall", (0.34, 0.56, 0.06), mount_y=1.55, doc="""\
Wire-reinforced frosted glass panel in a steel surround, off the material
study board's "grimy frosted glass panel" swatch. Mount it on a plain wall
for a viewing hatch, or at a door leaf's own position (pass the door's y) for
the narrow vertical vision panel the corridor plate's doors carry — one prop
covers both jobs, which is why it is declared standalone rather than baked
into fixtures/door.tscn.

THE WIRE MESH IS TWO FINE slats() GRIDS, NOT A DIAGONAL ONE. A true
diamond-wire pattern wants 45deg blades, but slats() at 45deg about Z
over-spans a rectangular pane — the rotated corners poke outside the glass
rectangle unless the primitive is sized down to compensate, and getting that
compensation right bought nothing a plain orthogonal grid at a fine pitch
doesn't already sell at this scale. Reads as embedded wire either way at
normal viewing distance.

Shares wf_frostglass with med_cabinet's panes — same "indoors, not
backlit" glass job, so the same material is correct rather than a
near-duplicate.""",
       parts=[
           part(frame(0.34, 0.56, 0.035, 0.028), "steel", (0, 0, -0.014), name="Surround"),
           part(box((0.27, 0.49, 0.012), 0.003), "wf_frostglass", (0, 0, -0.010), name="Pane"),
           part(slats(0.27, 0.49, 0.006, 11, 0.0, 0.06), "steel", (0, 0, -0.016),
                name="WireH"),
           part(slats(0.49, 0.27, 0.006, 9, 0.0, 0.06), "steel", (0, 0, -0.016),
                rot=(0, 0, math.pi / 2), name="WireV"),
       ])
