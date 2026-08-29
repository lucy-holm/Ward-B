"""Ward B prop kit — TREATMENT APPARATUS. The clinical hardware that makes a
room read as a psychiatric HOSPITAL specifically, not a generic derelict
building. Where defs_medical.py's ward fittings (nurse call, drip bags,
sharps bins) dress a bed, everything here is the apparatus a patient is
brought TO — an ECT suite, a treatment room, a padded cell.

EXTENSION MODULE (see prop_defs.py's own "EXTENSION MODULES" section at the
bottom of that file for the mechanism, and PROP_KIT.md for the catalogue this
slots into). Same conventions as prop_defs.py, not a variant of them: front
toward -Z, width along X, height along Y; floor origin on the floor with
parts at y >= 0; wall origin on the wall face with parts at z <= 0 (more
negative z is FURTHER INTO THE ROOM, i.e. the side the player sees).

ALL PRIMITIVES ARE CENTRED ON THEIR OWN LOCAL ORIGIN, same as every other
file in this kit — `pos` below is always a part's CENTRE, never a base or an
attachment point. See defs_medical.py's header for the failure mode that
comment exists to prevent.

MATERIALS. Three new ones, all prefixed `tx_` per this file's ownership rule
(prop_defs.py's material() docstring: an extension must not edit the shared
MATERIALS literal, only register through the function): `tx_bakelite`
(the ECT console's period casing — a warm brown-cream distinct from both
props/steel's cool taupe and props/enamel's warm cream, so the console does
not read as "another sink"), `tx_canvas` (restraint webbing — straps and the
straitjacket) and `tx_lightbox_panel` (the x-ray viewer's dead, unshaded-
LOOKING but NOT UNSHADED panel — see that material's own header; it is the
one prop in this file with an explicit trap and it is worth reading before
touching xray_lightbox). Everything else reuses base-kit materials already in
prop_defs.MATERIALS — `steel`, `chain`, `screen`, `paper`, `rubber`, `prop`,
`enamel`, `red` — deliberately, the same reasoning defs_fabric.py's header
gives: a trolley's steel should read as kin to filing_cabinet's steel, not as
a bespoke fourth grey.

METALLIC STAYS NEAR ZERO THROUGHOUT, same reason as everywhere else in the
kit (MIGRATION_NOTES.md: gl_compatibility, no sky, no reflection probes — a
genuinely metallic surface renders flat black). Every "steel" or "chrome"
read in this file is sold with roughness and albedo value, never the
metallic slider.

WHAT'S HERE, in the priority order the brief gave: `ect_machine` (the single
most loaded object available to this game — see its own doc before touching
it), `treatment_couch`, `restraint_straps` (pairs with ward_bed), a
`drug_trolley`, `xray_lightbox` (UNLIT — see tx_lightbox_panel), a
`weighing_scale`, an `instrument_tray`, a `straitjacket`, an
`observation_hatch` and a `patient_chart`.
"""

import math

import prop_defs as k

k.material("tx_bakelite", "res://props/tx_bakelite_mat.tres")
k.material("tx_canvas", "res://props/tx_canvas_mat.tres")
k.material("tx_lightbox_panel", "res://props/tx_lightbox_panel_mat.tres")

# Shorthand purely for readability below — every call still goes through k.
box, cyl, tube, taper, frame, slats, part = k.box, k.cyl, k.tube, k.taper, k.frame, k.slats, k.part

# CASTOR_MESH: office_chair's exact castor key (26mm wheel, 28mm hub depth),
# already reused by mop_bucket, iv_stand, defs_wardfit's wheelchair and
# defs_medical's wheeled kit. ect_machine and drug_trolley both stand on it
# too, so every wheeled prop in the whole kit — six files deep now — still
# shares ONE baked mesh. That sharing is prop_defs.py's whole thesis; an
# extension module gets it for free just by reaching for the same dimensions
# rather than minting a "close enough" wheel of its own.
CASTOR_MESH = cyl(0.026, 0.028, 10, 0.004)


# =============================================================================
# ECT_MACHINE — "the single most loaded object available to this game."
#
# A boxy console on a wheeled stand: a low chassis on castors, a main body,
# and a stepped-back HEAD unit on top carrying the control panel — two dials,
# two knobs — with a coiled lead running down from the head to a paired
# temple-electrode disc. The stepped silhouette (three boxes of decreasing
# footprint, stacked) is what a 1950s shock-therapy console actually looked
# like (Cerletti/Bini and the machines that followed them read exactly this
# way: a squat control head bolted to a larger case), and it is deliberately
# NOT a single slab — a slab reads as a locker, not an instrument.
#
# WHY IT IS ALLOWED TO BLOW THE 12-PART BUDGET (16 parts, see the count at
# the end of this doc). Every other prop in this file targets the usual
# per-room budget because a room can carry many of it. This one cannot: it is
# unique furniture — a ward has AT MOST one or two ECT suites in the entire
# building, so a generous part count here costs the draw-call budget nothing
# a corridor full of these would. Treat one instance per treatment room as
# the ceiling; never r.prop_run() it, never dress a corridor with it.
#
# BAKELITE, NOT CHROME. The brief is explicit that this should read as 1950s
# medical equipment, not sci-fi — the fastest way to blow that is a shiny
# metal casing with a blue emissive readout. Every major surface is
# `tx_bakelite`; the only bright metal is the small steel carry handle, and
# the only "readout" is a dead `screen`-material dial glass, unshaded-free,
# reflecting the room exactly like crt_monitor's screen does and for the same
# reason (see that prop's doc: a lit console would fight the ward's
# one-light-source lighting and read as functioning, not abandoned).
# =============================================================================

_ect_leads = [
    # The coiled lead: TWO short cylinder segments at deliberately different,
    # non-matching off-axis tilts rather than one straight rod — see
    # PROP_KIT.md's OFF-AXIS ROTATION note. A single straight lead reads as a
    # cable that was modelled; two segments kinking at different angles reads
    # as a cable that was COILED BY HAND and left to sag, which is the whole
    # point of specifying it in the brief at all. `rubber`, matching every
    # other flexible cable/hose material already in the kit (mop_bucket's mop
    # handle aside, this is the kit's actual cable material — see pipe_run's
    # bracket collars for the metal equivalent).
    part(cyl(0.010, 0.24, 8, 0.003), "rubber", (0.19, 0.62, -0.05),
         rot=(1.05, 0.35, 0.55), name="LeadSeg1"),
    part(cyl(0.010, 0.20, 8, 0.003), "rubber", (0.22, 0.42, -0.16),
         rot=(1.55, -0.25, 0.20), name="LeadSeg2"),
    # ElectrodePad: the two temple electrodes are close enough together in
    # silhouette from any distance the player actually sees this prop at
    # that one flattened disc reads as "the paired electrodes", not one.
    # Spending a second part on a headband linking them would be triangles
    # nobody will ever resolve. `steel`, not `chain` — against ConsoleLower's
    # dark tx_bakelite a near-black disc vanished into the body's own shadow
    # in the first render; steel's higher value keeps it legible resting
    # against the case.
    part(cyl(0.050, 0.015, 12, 0.004), "steel", (0.26, 0.30, -0.08),
         rot=(0.25, 0.1, 0.35), name="ElectrodePad"),
]

k.prop("ect_machine", "floor", (0.52, 1.05, 0.44), collider=(0.50, 0.42), doc="""\
Electroconvulsive therapy unit — boxy console on a wheeled stand, two dials,
two control knobs, a coiled lead ending in a paired temple electrode. 1950s
medical equipment: bakelite casing, a dead dial glass, no chrome, no glow.

THE SINGLE MOST LOADED OBJECT AVAILABLE TO THIS GAME. Place it deliberately —
one per treatment room, always the focal point of whatever room it is in,
never as incidental dressing the way a filing_cabinet or a radiator is.

16 parts, well above this file's general per-prop target — see the block
comment above this declaration for why that is the right call here and not
scope creep: it is unique furniture, at most one or two instances exist in
the whole building, so the extra draw calls cost nothing a repeated prop
would.

STEPPED SILHOUETTE, three boxes shrinking upward (Chassis, ConsoleLower,
Head) rather than one slab — a single box reads as a locker; the step is
what makes it read as an INSTRUMENT panel bolted to a case, which is what
the reference machines of the period actually were.

Shares office_chair's exact castor mesh (see CASTOR_MESH above this
declaration) — the same wheel that rolls mop_bucket, iv_stand and every other
wheeled prop in the kit, for zero extra baked geometry.""",
     parts=[
         part(CASTOR_MESH, "rubber", (-0.17, 0.026, 0.14), rot=(0, 0, math.pi / 2), name="CastorFL"),
         part(CASTOR_MESH, "rubber", (0.17, 0.026, 0.14), rot=(0, 0, math.pi / 2), name="CastorFR"),
         part(CASTOR_MESH, "rubber", (-0.17, 0.026, -0.14), rot=(0, 0, math.pi / 2), name="CastorBL"),
         part(CASTOR_MESH, "rubber", (0.17, 0.026, -0.14), rot=(0, 0, math.pi / 2), name="CastorBR"),
         part(box((0.44, 0.09, 0.38), 0.006), "tx_bakelite", (0, 0.097, 0), name="Chassis"),
         part(box((0.46, 0.46, 0.38), 0.010), "tx_bakelite", (0, 0.37, 0), name="ConsoleLower"),
         part(box((0.36, 0.32, 0.28), 0.010), "tx_bakelite", (0, 0.76, 0.02), name="Head"),
         # PanelRecess: a LIGHTER inset field (steel, not chain) the dials and
         # knobs sit proud of. First pass used `chain` here, which is near-
         # black — the same near-black as the dial glass itself, so the
         # recess and the two dials merged into one big dark mass that read
         # as a robot's face rather than an instrument cluster. Steel against
         # the dark screen-glass dials is what actually separates "panel"
         # from "dial" the way a real gauge cluster's bezel does.
         part(box((0.22, 0.15, 0.02), 0.004), "steel", (0, 0.79, -0.13), name="PanelRecess"),
         # Dials themselves shrunk from an r=0.040 first pass, which at this
         # panel size read as two eyes rather than two gauges — an easy trap
         # for the game's single most loaded prop to fall into by accident.
         part(cyl(0.028, 0.015, 12, 0.004), "screen", (-0.07, 0.81, -0.141),
              rot=(math.pi / 2, 0, 0), name="DialA"),
         part(cyl(0.028, 0.015, 12, 0.004), "screen", (0.07, 0.81, -0.141),
              rot=(math.pi / 2, 0, 0), name="DialB"),
         part(cyl(0.020, 0.028, 10, 0.003), "chain", (-0.10, 0.665, -0.141),
              rot=(math.pi / 2, 0, 0), name="KnobA"),
         part(cyl(0.020, 0.028, 10, 0.003), "chain", (0.10, 0.665, -0.141),
              rot=(math.pi / 2, 0, 0), name="KnobB"),
         # CarryHandle: the ONE bright-ish metal accent on the whole prop —
         # steel, not tx_bakelite — because a console with literally no metal
         # anywhere reads as a wooden radio cabinet, not equipment that gets
         # wheeled between rooms.
         part(box((0.26, 0.03, 0.05), 0.006), "steel", (0, 0.935, -0.10), name="CarryHandle"),
     ] + _ect_leads)


# =============================================================================
# TREATMENT_COUCH — padded couch on a steel frame, an adjustable head
# section tilted up, a paper roll at the foot end trailing a torn sheet.
# =============================================================================

k.prop("treatment_couch", "floor", (0.62, 0.80, 1.95), collider=(0.64, 1.95), doc="""\
Padded examination/treatment couch: tube-steel legs, a vinyl top, an
adjustable head section raised at a fixed angle, a paper roll at the foot
end with a sheet pulled part way across and torn.

HEAD SECTION IS AT -Z, matching the kit's front-toward--Z convention even
though a couch has no "sitter" to get backwards — placing it consistently
still matters because a room author reasons about `facing` the same way for
every prop, and a couch that broke the rule would be the one exception
someone has to remember. Foot end (the paper roll) is at +Z.

10 parts — 4 legs is the one place this prop spends more than it strictly
needs to (a single slab base would do it in fewer draw calls), but four
distinct tube legs plus the apron between them is what separates "couch"
from "bench" in silhouette, and a couch this central to a treatment room
warrants it. A room can afford 1-2 without denting the budget.

THE PAPER ROLL IS OFF-AXIS on purpose (PaperSheet is not aligned to the
couch's own X/Z) — see PROP_KIT.md's rule that a piece of paper trailing
crooked off an edge is the cheapest "recently used" signal available, the
same trick binder_stack's lean and notice_board's pinned sheets use.""",
     parts=[
         part(cyl(0.020, 0.55, 8, 0.003), "steel", (-0.26, 0.275, -0.85), name="LegFL"),
         part(cyl(0.020, 0.55, 8, 0.003), "steel", (0.26, 0.275, -0.85), name="LegFR"),
         part(cyl(0.020, 0.55, 8, 0.003), "steel", (-0.26, 0.275, 0.85), name="LegBL"),
         part(cyl(0.020, 0.55, 8, 0.003), "steel", (0.26, 0.275, 0.85), name="LegBR"),
         part(box((0.58, 0.06, 1.85), 0.006), "steel", (0, 0.58, 0), name="Apron"),
         part(box((0.60, 0.10, 1.55), 0.020), "vinyl", (0, 0.665, 0.15), name="TopMain"),
         # HeadSection: tilted 0.35rad about X so it reads as raised, not
         # merely a shorter cushion butted against the main top. Positioned
         # to overlap TopMain's -Z edge slightly rather than abut it exactly —
         # a couch's head hinge is never a perfectly clean seam.
         part(box((0.60, 0.10, 0.44), 0.020), "vinyl", (0, 0.735, -0.72),
              rot=(0.35, 0, 0), name="HeadSection"),
         part(cyl(0.012, 0.62, 8, 0.003), "steel", (0, 0.70, 0.95),
              rot=(0, 0, math.pi / 2), name="PaperRollHolder"),
         part(cyl(0.058, 0.58, 12, 0.006), "paper", (0, 0.70, 0.92),
              rot=(0, 0, math.pi / 2), name="PaperRoll"),
         part(box((0.56, 0.004, 0.38), 0.002), "paper", (0.02, 0.665, 0.55),
              rot=(0.08, 0.02, 0.03), name="PaperSheet"),
     ])


# =============================================================================
# RESTRAINT_STRAPS — pairs with ward_bed. Two independent strap assemblies:
# one lying loose and looped on the mattress, one draped across a side rail.
# =============================================================================

k.prop("restraint_straps", "floor", (0.55, 0.16, 0.75), doc="""\
Loose canvas restraint straps with buckles — one length coiled loose on a
mattress, a second draped across a bed's side rail. Designed to pair with
`ward_bed` (0.92 x 0.98 x 2.02): place at y=0.57 for the mattress-top
assembly to sit on the ticking, or y=0.42 to lay the rail assembly across
ward_bed's SideRailL/SideRailR height (see that prop's part list).

NO COLLIDER, DELIBERATELY — matches PROP_KIT.md's rule that dressing this
thin should never block the player, and matches gurney's own side rail,
which the same rail height was read off.

WHY EVERY PART STAYS AT y >= 0 EVEN THE "HANGING" STRAP. prop_defs.py's
floor-mount rule is a hard one: parts have y >= 0 because the room author's
`y` argument IS the surface, and a part that dipped below it would either
clip through whatever the strap is resting on or, worse, through the floor
if placed without a `y` override at all. So StrapB "hangs off the rail" by
tilting steeply toward the surface rather than by actually going negative —
a strap draped over a rail sags toward the mattress below it, it does not
free-hang in space, so the geometry does not need to leave the y >= 0 half
space to sell the pose.

OFF-AXIS EVERYWHERE: every segment below is rotated by an amount that does
not match any other segment, which is the entire point (PROP_KIT.md) — a
tidy, axis-aligned strap would read as a rack fitting, not something a
patient thrashed against.""",
     parts=[
         # StrapA: coiled loose on the mattress. Two overlapping segments at
         # unmatched angles read as a loop dropped rather than laid flat.
         part(box((0.50, 0.018, 0.055), 0.006), "tx_canvas", (-0.06, 0.018, -0.08),
              rot=(0, 0, 0.18), name="StrapA_Seg1"),
         part(box((0.40, 0.018, 0.055), 0.006), "tx_canvas", (0.17, 0.020, 0.14),
              rot=(0, 0, -0.42), name="StrapA_Seg2"),
         part(box((0.065, 0.028, 0.065), 0.004), "chain", (0.02, 0.028, 0.02),
              rot=(0, 0.30, 0.10), name="BuckleA"),
         # StrapB: draped across a side rail — starts high (near the y the
         # rail sits above the mattress reference) and sags down toward the
         # surface rather than dropping below it; see the doc's note on why.
         part(box((0.42, 0.018, 0.055), 0.006), "tx_canvas", (0.28, 0.115, -0.28),
              rot=(0, 0, 1.15), name="StrapB_Seg1"),
         part(box((0.30, 0.018, 0.055), 0.006), "tx_canvas", (0.33, 0.030, -0.30),
              rot=(0, 0, 1.48), name="StrapB_Seg2"),
         part(box((0.06, 0.026, 0.06), 0.004), "chain", (0.31, 0.145, -0.28),
              rot=(0.15, 0, 0.20), name="BuckleB"),
     ])


# =============================================================================
# DRUG_TROLLEY — lockable wheeled medicine trolley, partitioned tray top.
# =============================================================================

k.prop("drug_trolley", "floor", (0.55, 0.90, 0.42), collider=(0.56, 0.44), doc="""\
Lockable wheeled medicine trolley: steel cabinet on castors, a recessed
drawer face with a lock, an open partitioned tray on top for sorting doses.

FRONT (-Z) carries the drawer face and lock, matching every other cabinet in
the kit (filing_cabinet's Front%d panels are the same convention). PUSH
HANDLE is at +Z — the end a nurse or orderly actually stands behind — which
is the one place this prop's "front" and "the end a person interacts with"
diverge, worth noting because it is easy to assume they are always the same
end.

Shares CASTOR_MESH with ect_machine (see the top of this file) and with
mop_bucket/iv_stand from prop_defs.py itself — every wheeled prop across six
files now rolls on the same four baked wheels.

12 parts. A treatment room or a corridor med bay can carry 1-2 without
denting the budget; this is not a repeat-along-a-wall prop like beam_seating.""",
     parts=[
         part(CASTOR_MESH, "rubber", (-0.20, 0.026, 0.15), rot=(0, 0, math.pi / 2), name="CastorFL"),
         part(CASTOR_MESH, "rubber", (0.20, 0.026, 0.15), rot=(0, 0, math.pi / 2), name="CastorFR"),
         part(CASTOR_MESH, "rubber", (-0.20, 0.026, -0.15), rot=(0, 0, math.pi / 2), name="CastorBL"),
         part(CASTOR_MESH, "rubber", (0.20, 0.026, -0.15), rot=(0, 0, math.pi / 2), name="CastorBR"),
         part(box((0.50, 0.03, 0.38), 0.005), "steel", (0, 0.067, 0), name="Chassis"),
         part(box((0.50, 0.55, 0.38), 0.010), "steel", (0, 0.36, 0), name="CabinetBody"),
         part(box((0.46, 0.010, 0.02), 0.002), "chain", (0, 0.50, -0.195), name="DrawerLine"),
         part(box((0.03, 0.03, 0.02), 0.004), "chain", (0.15, 0.36, -0.195), name="Lock"),
         part(box((0.52, 0.04, 0.40), 0.008), "steel", (0, 0.655, 0), name="TrayTop"),
         # Two parallel dividers make three compartments across the tray —
         # "partitioned tray top" per the brief — without a third crosswise
         # rail spending a part on a division nobody asked for.
         part(box((0.02, 0.05, 0.38), 0.003), "chain", (-0.14, 0.700, 0), name="PartitionL"),
         part(box((0.02, 0.05, 0.38), 0.003), "chain", (0.14, 0.700, 0), name="PartitionR"),
         part(box((0.40, 0.03, 0.03), 0.005), "steel", (0, 0.72, 0.19), name="PushHandle"),
     ])


# =============================================================================
# XRAY_LIGHTBOX — wall-mounted film viewer. UNLIT: see tx_lightbox_panel_mat
# for why this must never gain an emission_enabled material.
# =============================================================================

k.prop("xray_lightbox", "wall", (0.46, 0.58, 0.10), mount_y=1.55, doc="""\
Wall-mounted film viewer: steel housing, a dull frosted panel, two spring
film clips at the top edge and a dead toggle switch at the bottom corner.

A DEAD BOX. This is the one prop in the file with a hard constraint attached:
tx_lightbox_panel_mat.tres is NOT unshaded and must never become so — the kit
reserves emissive/unshaded materials for light fittings, window glass and the
EXIT sign only (see that material's own header, and barred_window's doc,
which explains the same rule from the window side). A glowing lightbox would
both compete with the ward's actual light sources in an UNMEDICATED corridor
and wash out the red scrawls, which are the only text the player is required
to read. If a future pass wants this LIT for a specific beat, it needs a
second prop (xray_lightbox_lit, on the ceiling_troffer/troffer_lamp pairing
model) — never flip the flag on this one.

6 parts, wall-flush like wall_clock and notice_board. A records office or
treatment corridor can carry several.""",
     parts=[
         part(box((0.44, 0.56, 0.07), 0.008), "steel", (0, 0, -0.035), name="Housing"),
         part(box((0.36, 0.46, 0.012), 0.003), "tx_lightbox_panel", (0, 0, -0.078), name="Panel"),
         # Bezel sits proud of the panel, not coplanar with it — the exact
         # trap ceiling_troffer's own doc warns about (two panels sharing a
         # plane z-fight the instant a light moves across them).
         part(frame(0.44, 0.56, 0.045, 0.025), "steel", (0, 0, -0.082), name="Bezel"),
         part(box((0.05, 0.008, 0.012), 0.002), "chain", (-0.14, 0.24, -0.09), name="ClipL"),
         part(box((0.05, 0.008, 0.012), 0.002), "chain", (0.14, 0.24, -0.09), name="ClipR"),
         part(cyl(0.012, 0.020, 8, 0.002), "chain", (0.17, -0.22, -0.085),
              rot=(math.pi / 2, 0, 0), name="SwitchToggle"),
     ])


# =============================================================================
# WEIGHING_SCALE — column platform scale with a sliding-weight beam.
# =============================================================================

k.prop("weighing_scale", "floor", (0.42, 1.55, 0.42), collider=(0.40, 0.40), doc="""\
Column platform scale: a low platform, a rising column, a head unit and a
sliding-weight beam projecting sideways with two riding weights (the coarse
kilogram weight and the fine adjustment weight, at different points along
the beam — real balance-beam scales always show this pair, one much smaller
than the other).

THE BEAM PROJECTS ALONG +X, not -Z. Every OTHER prop in this kit keeps its
interesting silhouette facing the front-toward--Z convention, but a scale is
read from the side (the beam has to be visible in profile for the sliding
weight to mean anything), and forcing it to face -Z like a chair would hide
the one feature that makes this prop legible instead of being a bollard with
a box on top. facing="pz"/"nz" on this prop rotates the WHOLE thing including
the beam, same as any other prop; there is no separate "beam side" argument.

6 parts. Column and platform stand off the wall-free — this is a freestanding
weighing point, not a wall fixture, unlike xray_lightbox above it in this
file.""",
     parts=[
         part(box((0.38, 0.05, 0.38), 0.006), "enamel", (0, 0.025, 0.02), name="Platform"),
         part(taper(0.035, 0.026, 1.35, 10), "steel", (0, 0.725, -0.14), name="Column"),
         part(box((0.16, 0.20, 0.10), 0.008), "steel", (0, 1.50, -0.14), name="HeadUnit"),
         part(box((0.46, 0.018, 0.028), 0.004), "steel", (0.19, 1.50, -0.14), name="Beam"),
         part(box((0.03, 0.022, 0.026), 0.003), "chain", (0.16, 1.505, -0.14), name="SlideWeightCoarse"),
         part(box((0.018, 0.016, 0.020), 0.003), "chain", (0.32, 1.505, -0.14), name="SlideWeightFine"),
     ])


# =============================================================================
# INSTRUMENT_TRAY — small stainless tray of loose instruments, for a
# trolley or a couch. Same "counter-top prop" contract as prop_defs.py's
# paper_tray/crt_monitor: mount="floor" but pass the surface height as `y`.
# =============================================================================

k.prop("instrument_tray", "floor", (0.30, 0.07, 0.20), doc="""\
Shallow stainless tray with a few loose instruments and a gauze roll —
scatter it on drug_trolley's TrayTop (y ~= 0.655 relative to the trolley's
own base) or treatment_couch, exactly the way paper_tray sits on a counter.

No collider — it is a small tabletop object, same contract as paper_tray and
binder_stack, which the player is never meant to be blocked by.

TrayRim reuses ceiling_troffer's exact trick of laying a `frame()` FLAT via a
90-degree X rotation rather than modelling a hollow rim from four boxes —
one part instead of four for a raised lip, which is why this stays a 6-part
prop instead of a 9-part one.

Instruments are three loose, non-matching primitives rather than one modelled
"scissors" shape (this kit builds from box/cyl/taper only, per PROP_KIT.md —
there is no primitive that reads as a blade at this scale) placed at
unmatched angles, same off-axis reasoning as restraint_straps above.""",
     parts=[
         part(box((0.28, 0.015, 0.18), 0.004), "steel", (0, 0.0075, 0), name="TrayBase"),
         part(frame(0.28, 0.18, 0.020, 0.025), "steel", (0, 0.020, 0),
              rot=(math.pi / 2, 0, 0), name="TrayRim"),
         part(box((0.14, 0.006, 0.014), 0.002), "chain", (-0.06, 0.028, 0.02),
              rot=(0, 0, 0.30), name="InstrumentA"),
         part(box((0.12, 0.006, 0.014), 0.002), "chain", (0.03, 0.028, -0.03),
              rot=(0, 0, -0.50), name="InstrumentB"),
         part(cyl(0.004, 0.11, 6, 0.001), "chain", (0.08, 0.030, 0.04),
              rot=(0, 0, 1.20), name="InstrumentC"),
         part(cyl(0.020, 0.05, 10, 0.003), "paper", (-0.08, 0.035, -0.05),
              rot=(0, 0, math.pi / 2), name="GauzeRoll"),
     ])


# =============================================================================
# STRAITJACKET — hanging on a wall hook, canvas, long crossed sleeves,
# buckles. Wall-mounted: hangs BELOW its own origin, which prop_defs.py's
# wall-mount rule permits (only z <= 0 is enforced for wall props; y is
# free, unlike the floor-mount rule restraint_straps has to work around).
# =============================================================================

k.prop("straitjacket", "wall", (0.55, 1.05, 0.18), mount_y=1.75, doc="""\
Canvas straitjacket hanging from a wall hook: torso panel, two long sleeves
splayed down and out at unmatched angles (never wear it symmetrically — a
straitjacket that hung dead straight would read as a modelled garment, not a
thing someone hung up), a neck strap, three buckles.

mount_y=1.75 puts the hook near head height on the wall; the garment's own
95cm of hanging body/sleeve clears the floor by roughly a metre at full
length, so it reads as HUNG rather than DUMPED — for something actually
puddled on the floor, `clothes_pile` (owned elsewhere in the kit) is the
right prop, not this one restyled.

NO COLLIDER: it hangs clear of the floor and, unlike sink (the kit's other
wall prop that does carry one), presents nothing rigid enough at head height
to be worth blocking the player for.

8 parts. This is a set-piece, not a run prop — one or two per ward is plenty;
more than that starts reading as a costume rack rather than a threat.""",
     parts=[
         part(box((0.025, 0.025, 0.035), 0.004), "chain", (0, 0.02, -0.02), name="Hook"),
         part(box((0.42, 0.55, 0.06), 0.020), "tx_canvas", (0, -0.32, -0.05), name="Body"),
         part(box((0.10, 0.55, 0.05), 0.015), "tx_canvas", (-0.24, -0.55, -0.06),
              rot=(0, 0, 0.55), name="SleeveL"),
         part(box((0.10, 0.50, 0.05), 0.015), "tx_canvas", (0.22, -0.60, -0.07),
              rot=(0, 0, -0.70), name="SleeveR"),
         part(box((0.34, 0.05, 0.03), 0.006), "tx_canvas", (0, -0.06, -0.04), name="CollarStrap"),
         part(box((0.05, 0.03, 0.03), 0.003), "chain", (0.10, -0.20, -0.07),
              rot=(0, 0, 0.20), name="BuckleA"),
         part(box((0.05, 0.03, 0.03), 0.003), "chain", (-0.08, -0.35, -0.075),
              rot=(0, 0, -0.15), name="BuckleB"),
         part(box((0.045, 0.03, 0.03), 0.003), "chain", (0.02, -0.70, -0.08),
              rot=(0.10, 0, 0.30), name="BuckleC"),
     ])


# =============================================================================
# OBSERVATION_HATCH — small hinged shutter set into a door or wall, for
# looking into a cell.
# =============================================================================

k.prop("observation_hatch", "wall", (0.24, 0.24, 0.10), mount_y=1.55, doc="""\
Small steel-framed observation hatch: a barred inner grille behind a hinged
shutter propped open at an angle, a disengaged slide bolt and a top hinge
bracket. Set into a cell door or a wall between a corridor and a cell.

SHUTTER SHOWN AJAR, not fully open or fully shut — this is the one prop in
the kit where "mid-state" is the entire point: a closed hatch is just a
steel square, and a fully open one shows nothing behind it worth the
InnerGrille part. Propped a few degrees open is what actually reads as
"someone was looking through this recently".

mount_y=1.55 is eye height on an adult, matching barred_window's own
mount_y reasoning (props/PROP_KIT.md's wall-mount table) — a hatch mounted
at any other height stops being a hatch a guard actually used.

5 parts, no collider (it is a shallow wall fitting in the same weight class
as wall_speaker and notice_board, neither of which carries one). Reuses the
`slats` primitive at wall_vent's low-fill convention for the grille rather
than inventing a new bar spacing.""",
     parts=[
         part(frame(0.22, 0.22, 0.025, 0.03), "steel", (0, 0, -0.015), name="Frame"),
         part(slats(0.16, 0.16, 0.012, 5, 0.0, 0.20), "steel", (0, 0, -0.04), name="InnerGrille"),
         # ShutterPanel: tilted back on an implied top hinge (rot.x negative)
         # and pulled forward in z, both at once, so it reads as swung open
         # rather than merely detached and floating in front of the frame.
         part(box((0.19, 0.19, 0.015), 0.004), "chain", (0.03, 0.02, -0.075),
              rot=(-0.75, 0.05, 0.02), name="ShutterPanel"),
         part(box((0.02, 0.02, 0.03), 0.002), "chain", (0.10, 0.10, -0.02), name="HingeBracket"),
         part(box((0.03, 0.015, 0.02), 0.003), "chain", (-0.08, -0.06, -0.02), name="SlideBolt"),
     ])


# =============================================================================
# PATIENT_CHART — clipboard chart hung on a bed end or wall hook.
# =============================================================================

k.prop("patient_chart", "wall", (0.24, 0.34, 0.06), mount_y=1.30, doc="""\
Clipboard chart on a hook: hardboard backing, a metal clip strip, a page
underneath and a small red tab clipped to the corner. Hang it on a wall near
a bed (mount_y=1.30 clears a ward_bed's footboard, which tops out at y~0.96
on its FootPostL/R) or repurpose the same declaration on a door or cell
frame — nothing about the geometry assumes which.

THE WHOLE ASSEMBLY IS ROTATED slightly off true (0.15rad about Y, 0.05rad
about Z) rather than hung dead straight — a perfectly level chart is the one
thing in this kit that would look MODELLED rather than hung, the same logic
notice_board's pinned sheets and binder_stack's lean both run on. Every part
below shares that same rotation so the clip and the page stay flush with the
board they sit on rather than drifting apart from it.

Board reuses props/prop.tres (the kit's warm cream/tan default) rather than a
new material — a clipboard's hardboard back is close enough to that existing
swatch that a bespoke tx_ material would be one more file for no visible
gain, which is exactly the reuse discipline this file's header asks for.

5 parts, no collider — pure wall dressing at head height, same class as
wall_clock.""",
     parts=[
         part(cyl(0.008, 0.03, 8, 0.002), "chain", (0, 0.14, -0.01),
              rot=(math.pi / 2, 0, 0), name="Hook"),
         part(box((0.22, 0.30, 0.012), 0.004), "prop", (0, 0, -0.03),
              rot=(0, 0.15, 0.05), name="Clipboard"),
         part(box((0.16, 0.03, 0.02), 0.003), "chain", (0, 0.13, -0.045),
              rot=(0, 0.15, 0.05), name="ClipMech"),
         part(box((0.18, 0.24, 0.004), 0.001), "paper", (0, -0.02, -0.042),
              rot=(0, 0.15, 0.05), name="PaperSheet"),
         # First pass (0.02 x 0.05 x 0.006, bevel 0.002) was INVISIBLE in
         # every gallery render despite correct placement — the trap turned
         # out to be the bevel, not the position: 0.002 against an 0.006
         # depth is 66% of the half-thickness, which is well past where this
         # kit's box() primitive still produces a sane chamfer (compare
         # wall_clock's HourHand: bevel is 50% of half-depth, and every other
         # thin part in the kit stays at or under that). Past it the mesh
         # degenerates toward a near-zero-area sliver that the rasteriser
         # drops. Kept the bevel comfortably under that line here (0.0015 on
         # an 0.010 depth = 30% of half-thickness) rather than eyeballing it
         # again.
         part(box((0.05, 0.06, 0.010), 0.0015), "red", (0.06, 0.055, -0.05),
              rot=(0, 0.15, 0.05), name="RedTab"),
     ])
