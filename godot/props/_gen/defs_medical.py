"""Ward B prop kit — MEDICAL / WARD FITTINGS the concept art calls for that the
kit still lacked: the small clinical hardware that sits directly on or above a
bed, plus the wheeled kit that moves between beds.

EXTENSION MODULE (see prop_defs.py's own "EXTENSION MODULES" section at the
bottom of that file for the mechanism, and PROP_KIT.md for the catalogue this
slots into). Same conventions as prop_defs.py, not a variant of them: front
toward -Z, width along X, height along Y; floor origin on the floor with
parts at y >= 0; wall origin on the wall face with parts at z <= 0 (more
negative z is FURTHER INTO THE ROOM, i.e. the side the player sees); ceiling
origin on the ceiling plane with parts at y <= 0.

ALL PRIMITIVES ARE CENTRED ON THEIR OWN LOCAL ORIGIN. `cyl`, `tube`, `taper`
and `box` all span +/- half their own dimension around `pos` on every axis —
there is no "base at the pin, grows toward +Y" primitive in this kit. Every
position below is therefore the *centre* of the part, which is worth stating
plainly because getting it backwards (treating `pos.y` as a base) silently
produces a part floating half its own height too high, and that reads as a
modelling error rather than a bug in a still image.

WHAT'S HERE, roughly in the order the concept art's ward-shot plate reads
left to right along a bed: `nurse_call_cord` and `oxygen_outlet` mount on the
wall above the headboard; `drip_bag` hangs from an existing `iv_stand`'s
hanger bar or hooks onto its own wall point at the same height; `bed_table`
and `vitals_monitor` stand beside the bed; `sharps_bin` brackets to the wall
within reach; `linen_cart` and `hoist_track` serve a whole bay rather than one
bed. None of these duplicate anything in the existing 53-prop catalogue —
`iv_stand` already owns the drip STAND, `ward_bed` already owns the bed
itself; everything here is the small hardware around both.
"""

import math

import prop_defs as k

k.material("md_yellow", "res://props/md_yellow_mat.tres")
k.material("md_canvas", "res://props/md_canvas_mat.tres")

# Shorthand purely for readability below — every call still goes through k.
box, cyl, tube, taper, frame, slats, part = k.box, k.cyl, k.tube, k.taper, k.frame, k.slats, k.part

# CASTOR_MESH: office_chair's exact castor key (26mm wheel, 28mm hub depth),
# already reused by mop_bucket, iv_stand and defs_wardfit's wheelchair/
# dressings_trolley. bed_table, vitals_monitor and linen_cart below all stand
# on it too, so every wheeled prop in the kit still shares ONE baked mesh.
CASTOR_MESH = cyl(0.026, 0.028, 10, 0.004)

# HOOK_MESH / BAG_MESH: iv_stand's exact hanger-hook and drip-bag parts.
# drip_bag reuses both verbatim (see its own doc for why that is the point,
# not an incidental saving) rather than mint new geometry that would look
# identical for a different byte cost.
HOOK_MESH = cyl(0.006, 0.05, 6, 0.002)
BAG_MESH = box((0.11, 0.20, 0.055), 0.010)
# mop_bucket's exact paper label — reused again below for drip_bag's tag.
LABEL_MESH = box((0.085, 0.10, 0.004), 0.001)


# =============================================================================
# NURSE CALL CORD — the single most characteristic ward detail there is, and
# deliberately the cheapest prop in this file: a plate, a cord, a pull. Three
# parts, so a dormitory can carry one per bed (ward_bed's own headboard is at
# local z=-0.95; place this on the wall directly behind it) without troubling
# the draw-call budget at all.
# =============================================================================

k.prop("nurse_call_cord", "wall", (0.10, 1.15, 0.06), mount_y=2.00, doc="""\
Wall plate, braided pull-cord and red pear-shaped handle, hanging down toward
where a seated or bedridden patient's hand would fall. Reads instantly even
at the tiny scale it is seen at, which is why it is worth having at all: the
dormitory plate is a wall of identical iron beds and almost nothing else, and
this is the one detail that says "this was a functioning ward" rather than
"a room full of cots".

CHEAP ENOUGH TO SPAM: 3 parts, no collider (it hangs well clear of the floor
and nobody should be blocked by a piece of string). One per ward_bed is not
excessive — real wards mounted one per bed without exception.

The handle is a `taper`, wide end down, narrow end meeting the cord — the
same "pear pull" silhouette real nurse-call handles have, built from the one
primitive that can do it without a dedicated shape.""",
       parts=[
           part(box((0.08, 0.10, 0.02), 0.004), "steel", (0, 0, -0.01), name="Plate"),
           part(cyl(0.004, 1.00, 6, 0.001), "paper", (0, -0.55, -0.015), name="Cord"),
           part(taper(0.020, 0.007, 0.055, 8), "red", (0, -1.075, -0.015), name="Handle"),
       ])


# =============================================================================
# OXYGEN OUTLET — the wall gas-services panel above a bed head. Sockets are
# `tube` (open pipe, visible bore) capped with a dark recessed disc rather
# than a solid cylinder, because a solid boss reads as a button, not a port
# you plug a line into.
# =============================================================================

k.prop("oxygen_outlet", "wall", (0.34, 0.20, 0.06), mount_y=1.45, doc="""\
Steel bed-head services plate with three gas outlets (oxygen / air / vacuum,
left to right) and a label strip underneath. Pair with `nurse_call_cord`
above the same bed for the two fixtures every real bed-head trunking panel
carries; unlike the cord this one does NOT want to be repeated per bed in a
dormitory — one plate per two or three beds, at the join between them, matches
how real ward trunking is actually run (shared risers, not one plate each).

Outlets are `tube` (open, so the bore is genuinely visible) with a `chain`
disc set back inside as the dark recess — a solid boss here reads as a
button, not a port. Metallic stays at prop_defs's `steel`/`chain` values
throughout; nothing here mints a new material.

8 parts. Afford 2-3 per ward room without denting the budget.""",
       parts=[
           part(box((0.34, 0.20, 0.03), 0.006), "steel", (0, 0, -0.015), name="Plate"),
       ] + [
           q
           for i, ox in enumerate((-0.10, 0.0, 0.10))
           for q in (
               part(tube(0.026, 0.014, 0.018, 10), "steel", (ox, 0.02, -0.039),
                    rot=(math.pi / 2, 0, 0), name="Collar%d" % i),
               part(cyl(0.014, 0.006, 8, 0.002), "chain", (ox, 0.02, -0.045),
                    rot=(math.pi / 2, 0, 0), name="Recess%d" % i),
           )
       ] + [
           part(box((0.30, 0.03, 0.006), 0.002), "paper", (0, -0.065, -0.033), name="Label"),
       ])


# =============================================================================
# SHARPS BIN — the one place a saturated yellow belongs in this palette (see
# md_yellow_mat.tres). Wall-bracketed, small, and deliberately dirty rather
# than the clean safety-yellow a real one ships as.
# =============================================================================

k.prop("sharps_bin", "wall", (0.24, 0.34, 0.20), mount_y=1.15, doc="""\
Rigid yellow-lidded sharps bin on a wall bracket, within reach and out of a
seated patient's way. The lid gets its own part rather than being folded into
the body box because the lid-to-body seam (and the top-slot aperture cut into
it) is most of what makes a bin read as a bin and not a yellow crate.

KEEP IT DIRTY. md_yellow_mat.tres is pulled well down from a true safety
yellow specifically so one bin does not out-saturate everything else in a
frame — see that material's own header. Do not brighten it "to make it pop";
that was tried in the reference material board and rejected in favour of
exactly this desaturation.

5 parts, no collider — same reasoning as wall_shelf and bumper_rail: it is
proud of the wall but well above where a footprint check would matter, and
the kit does not collider small wall dressing (PROP_KIT.md's mount-rules
table). One per treatment room or nurse station; more than that per room
reads as a supply closet, not a ward.""",
       parts=[
           part(box((0.18, 0.05, 0.05), 0.005), "chain", (0, 0.14, -0.025), name="Bracket"),
           part(box((0.22, 0.26, 0.16), 0.008), "md_yellow", (0, -0.02, -0.10), name="Body"),
           part(box((0.23, 0.05, 0.17), 0.006), "md_yellow", (0, 0.135, -0.105), name="Lid"),
           part(box((0.09, 0.015, 0.02), 0.002), "chain", (0, 0.148, -0.175), name="Slot"),
           part(box((0.10, 0.06, 0.004), 0.001), "paper", (0, -0.02, -0.183), name="Label"),
       ])


# =============================================================================
# BED TABLE — cantilevered over-bed table on a wheeled foot. ASYMMETRIC BY
# DESIGN: the origin sits at the wheeled base (where a room author actually
# places it, beside a bed or chair), and the tabletop cantilevers out to +X
# past the base's own footprint — that overhang is the entire point of the
# object, not a bounding-box accident. `collider` covers only the base, not
# the overhang: the tabletop sits at ~0.7m, well above where a footprint
# check needs to block, and real over-bed tables are walked/wheeled under
# from the far side constantly.
# =============================================================================

k.prop("bed_table", "floor", (0.78, 0.78, 0.42), collider=(0.44, 0.38), doc="""\
Wheeled over-bed table: a flat rolling base, a single column, and a
cantilevered laminate top that swings out over a mattress. The waiting-area
plates do not show one directly, but every ward-bed shot in the reference set
implies one just out of frame — this is the piece of furniture that makes a
dormitory read as a place people were actually treated, not just housed.

Reuses the office chair's castor mesh (CASTOR_MESH, four of them under the
base) for the usual reason: a wheeled prop that shares its wheels with every
other wheeled prop in the kit costs nothing extra to add.

8 parts. Place it beside a ward_bed with the tabletop's +X overhang aimed
over the mattress; 1 per bed is realistic, but 1 per 2-3 beds already reads
as "a ward with tables" — this is a good prop to under-place before
over-placing, since a table on every single bed starts to look staged.""",
       parts=[
           part(box((0.40, 0.04, 0.34), 0.006), "steel", (0, 0.02, 0), name="Base"),
           part(CASTOR_MESH, "rubber", (-0.18, 0.026, 0.14), rot=(0, 0, math.pi / 2),
                name="CastorA"),
           part(CASTOR_MESH, "rubber", (0.18, 0.026, 0.14), rot=(0, 0, math.pi / 2),
                name="CastorB"),
           part(CASTOR_MESH, "rubber", (-0.18, 0.026, -0.14), rot=(0, 0, math.pi / 2),
                name="CastorC"),
           part(CASTOR_MESH, "rubber", (0.18, 0.026, -0.14), rot=(0, 0, math.pi / 2),
                name="CastorD"),
           part(cyl(0.018, 0.62, 8, 0.003), "steel", (0, 0.35, 0), name="Column"),
           part(box((0.36, 0.05, 0.10), 0.008), "steel", (0.18, 0.665, 0), name="ArmBracket"),
           part(box((0.55, 0.03, 0.38), 0.010), "vinyl", (0.28, 0.70, 0), name="Tabletop"),
       ])


# =============================================================================
# VITALS MONITOR — small wheeled monitor on a stand. The screen is `screen`
# (props/screen_mat.tres, the dead-CRT material crt_monitor already uses) and
# NOT emissive. See prop_defs.py's `screen` entry and this file's own module
# docstring: a glowing monitor would compete with the light fittings, the
# barred windows and the red scrawls, which are the only things in the game
# that are allowed to pull the eye that way.
# =============================================================================

k.prop("vitals_monitor", "floor", (0.36, 1.10, 0.36), collider=(0.36, 0.36), doc="""\
Wheeled bedside monitor: a flat plinth base on four castors, a steel pole, a
squat housing and a dark screen. The corridor plate does not show one
running, and neither does this prop — the screen is the same near-black
`screen` material crt_monitor's dead glass uses, deliberately UNLIT, because
this kit reserves emissive materials for light fittings, windows and the
EXIT sign (see the brief this module was built against). A monitor that
glowed would read as still-powered ward equipment and fight every other
light source in the room for attention.

8 parts, same castor-and-pole vocabulary as iv_stand and bed_table above it
in this file. Afford one or two per ward room — it reads as "a bed in active
use", which should be the exception in an abandoned ward, not the rule.""",
       parts=[
           part(box((0.32, 0.03, 0.32), 0.006), "chain", (0, 0.02, 0), name="Base"),
           part(CASTOR_MESH, "rubber", (-0.14, 0.026, 0.14), rot=(0, 0, math.pi / 2),
                name="CastorA"),
           part(CASTOR_MESH, "rubber", (0.14, 0.026, 0.14), rot=(0, 0, math.pi / 2),
                name="CastorB"),
           part(CASTOR_MESH, "rubber", (-0.14, 0.026, -0.14), rot=(0, 0, math.pi / 2),
                name="CastorC"),
           part(CASTOR_MESH, "rubber", (0.14, 0.026, -0.14), rot=(0, 0, math.pi / 2),
                name="CastorD"),
           part(cyl(0.018, 0.80, 8, 0.003), "steel", (0, 0.44, -0.02), name="Pole"),
           part(box((0.30, 0.22, 0.09), 0.008), "chain", (0, 0.94, -0.02), name="Housing"),
           part(box((0.25, 0.17, 0.006), 0.002), "screen", (0, 0.94, -0.068), name="Screen"),
       ])


# =============================================================================
# LINEN CART — wheeled canvas laundry skip, half-full. The only prop in this
# file with a genuinely new fabric material (md_canvas): paper and ticking
# are both too flat/glossy-by-comparison for a slack woven sack, and vinyl is
# a moulded-plastic entry, not a cloth one.
# =============================================================================

k.prop("linen_cart", "floor", (0.60, 0.95, 0.45), collider=(0.58, 0.44), doc="""\
Steel-framed rolling laundry skip: a flat base on four castors, two rear
posts and a header rail holding a slack canvas sack open, with a mound of
pale linen bulging above the rim. HALF-FULL, not empty and not overflowing —
an empty frame reads as abandoned stock, a fully stuffed one reads as staged
set dressing; the mound just clearing the header rail is what reads as
"someone was mid-round when they left".

REAR POSTS ONLY, deliberately — real laundry skips are open at the front for
tipping items in, so the frame is two posts and a header rather than a full
four-post cage. That is also why this prop's front (-Z, the canonical facing
direction) is the OPEN side: place it with a room's traffic in mind the same
way beam_seating's fronts matter, even though nothing sits in it.

10 parts, at this file's part-count ceiling. Reuses CASTOR_MESH again (four
wheels, zero extra mesh cost) and props/ticking_mat.tres for the linen mound
rather than minting yet another near-white material.""",
       parts=[
           part(box((0.54, 0.04, 0.40), 0.006), "steel", (0, 0.03, 0), name="FrameBase"),
           part(CASTOR_MESH, "rubber", (-0.25, 0.026, 0.18), rot=(0, 0, math.pi / 2),
                name="CastorA"),
           part(CASTOR_MESH, "rubber", (0.25, 0.026, 0.18), rot=(0, 0, math.pi / 2),
                name="CastorB"),
           part(CASTOR_MESH, "rubber", (-0.25, 0.026, -0.18), rot=(0, 0, math.pi / 2),
                name="CastorC"),
           part(CASTOR_MESH, "rubber", (0.25, 0.026, -0.18), rot=(0, 0, math.pi / 2),
                name="CastorD"),
           part(cyl(0.016, 0.62, 6, 0.002), "steel", (-0.24, 0.36, 0.16), name="PostL"),
           part(cyl(0.016, 0.62, 6, 0.002), "steel", (0.24, 0.36, 0.16), name="PostR"),
           part(box((0.52, 0.04, 0.04), 0.005), "steel", (0, 0.67, 0.16), name="HeaderBar"),
           part(box((0.50, 0.55, 0.38), 0.03), "md_canvas", (0, 0.34, -0.02), name="Bag"),
           part(box((0.36, 0.14, 0.26), 0.05), "ticking", (0, 0.68, -0.02), name="LinenMound"),
       ])


# =============================================================================
# HOIST TRACK — ceiling-mounted patient-hoist rail, 2m and prop_run-tileable.
# X extent is EXACTLY 2.0 (matching skirting/bumper_rail's own tier-1 run
# props) so Room.prop_run() can repeat it along a ceiling with no seam.
# =============================================================================

k.prop("hoist_track", "ceiling", (2.0, 0.09, 0.10), doc="""\
2m segment of ceiling-mounted patient-hoist rail: a steel channel flush to
the ceiling on two brackets, with a dark groove along its underside where a
hoist trolley would ride. No trolley/motor unit is modelled here on purpose —
one would duplicate at every 2m repeat of a `prop_run`, which reads as a
hoist fleet parked nose-to-tail rather than one rail serving a bay. If a room
wants a hoist actually in use, that is a separate prop for someone else to
add; this one is track only.

Brackets sit at +/-0.55m rather than at the rail's own ends specifically so a
run of these does not double a bracket at the seam between two segments —
the same reasoning skirting's cap and bumper_rail's brackets already bank.

ONLY 4 PARTS, so a whole ward bay's rail (a 6-8m run via prop_run) costs less
than one ward_bed. No collider: it hangs at ceiling height, the same reason
ceiling_troffer and pipe_run carry none.""",
       parts=[
           part(box((2.0, 0.06, 0.09), 0.006), "steel", (0, -0.03, 0), name="Rail"),
           part(box((0.05, 0.05, 0.05), 0.004), "steel", (-0.55, -0.025, 0), name="BracketA"),
           part(box((0.05, 0.05, 0.05), 0.004), "steel", (0.55, -0.025, 0), name="BracketB"),
           part(box((1.96, 0.012, 0.03), 0.002), "chain", (0, -0.066, 0), name="Groove"),
       ])


# =============================================================================
# DRIP BAG — a hanging IV bag on its own, for hooking onto an already-placed
# iv_stand (or any other prop that offers a hook at the same height) without
# needing a second, bag-carrying variant of that prop.
# =============================================================================

k.prop("drip_bag", "wall", (0.14, 0.28, 0.10), mount_y=1.575, doc="""\
Hook, hanging bag and drip line, on its own rather than baked into iv_stand.
`mount_y` is set to 1.575m FOR A REASON, not an arbitrary wall height: that
is iv_stand's own HookL/HookR world height (its Pole is floor-mounted, so
1.575m is a literal number copied from that prop's declaration, not a
coincidence). Call `r.model("drip_bag", (x, z))` at the SAME (x, z) an
iv_stand already occupies and, with no `y` override at all, the bag lands
exactly where that stand's hook is — which is what lets a room tell "empty
stand" and "stand in use" apart as two separate placements instead of a
second iv_stand variant.

`mount="wall"` is a deliberate misuse of the wall-mount mechanism, not a
claim that this hangs off an actual wall: it is the only mount rule in the
kit that takes an explicit, non-zero default height, which is the one thing
this prop needs. All parts sit at z <= -0.02 anyway (never truly z = 0), so
it satisfies the wall convention's letter even though there is usually no
wall behind it.

Reuses iv_stand's own hook and bag meshes verbatim (HOOK_MESH, BAG_MESH —
see this file's module-level constants) and mop_bucket's label mesh
(LABEL_MESH), so this prop's only genuinely new geometry is the drip line.
4 parts, no collider — it hangs well above floor height with nothing to
block.

TRAP AVOIDED: the label is `chain`, not `paper`. mop_bucket's own label is
paper-on-steel, which contrasts; a paper label on a PAPER bag (the material
this prop's Bag already uses) is optically invisible — same albedo, no seam,
a wasted draw call. `chain` is the smallest change that gives it a visible
printed-tag darkness against the bag instead.""",
       parts=[
           part(HOOK_MESH, "steel", (0, 0.03, -0.02), name="Hook"),
           part(BAG_MESH, "paper", (0, -0.10, -0.03), name="Bag"),
           part(cyl(0.004, 0.30, 6, 0.001), "chain", (0, -0.35, -0.03), name="DripTube"),
           part(LABEL_MESH, "chain", (0, -0.10, -0.058), name="Label"),
       ])
