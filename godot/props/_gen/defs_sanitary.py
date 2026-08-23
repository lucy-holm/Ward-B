"""Ward B prop kit — SANITARY AND UTILITY FITTINGS: the bathroom and service
objects a working hospital has and this ward, as shipped, does not. A ward
with beds, a corridor and a waiting area but no toilet, no sink taps that
lead anywhere, and no service room is a stage set with one wall missing.

EXTENSION MODULE (see prop_defs.py's own "EXTENSION MODULES" section at the
bottom of that file for the mechanism, and PROP_KIT.md for the catalogue
this slots into). Same conventions as prop_defs.py, not a variant of them:
front toward -Z, width along X, height along Y; floor origin on the floor,
centred in XZ, parts at y >= 0; wall origin on the wall face, centred, parts
at z <= 0 (more negative z is FURTHER INTO THE ROOM — the side the player
sees); ceiling origin on the ceiling plane, parts at y <= 0. Every primitive
is centred on its own `pos`, on every axis — there is no "base at the pin"
convention anywhere in this kit, so a part's `pos.y` is always its own
vertical MIDPOINT, never its base.

WHAT'S HERE, in the priority order the brief set: `toilet` and `cistern` (a
floor-standing WC pan and the high-level cistern that pairs with it, wired
together only by a shared wall line and a fixed pipe drop — see `cistern`'s
own doc for what that assumes), `grab_rail`, `bathroom_mirror`,
`shower_head`, `paper_towel_dispenser`, `waste_bin`,
`toilet_cubicle_panel` (the one `prop_run`-tileable prop in the set, so its
X extent is exactly 2.0 like `skirting`/`bumper_rail`), `payphone`, and
`utility_shelf_unit`. None of these duplicate anything in the existing
catalogue: `sink` already owns the wall-hung hand basin (see its own doc),
so nothing here is a second basin — the closest thing to one, the mirror, is
authored to sit ABOVE that existing sink, not to replace it.

FOUR NEW MATERIALS, not reused from the core palette, each because the
existing entry nearest in spirit is wrong for what it would be asked to
cover here:

  - `sn_vitreous` — WC pan and cistern. `enamel_mat.tres` is *warm cream
    painted metal* (its own header calls it out as the warmest, lightest
    thing in the palette, tuned against the wall shader's paint_clean_color).
    Vitreous china is a harder-fired, glazed ceramic and reads distinctly
    cooler and less yellow even when equally chipped and grubby; sharing
    `enamel` would make the WC pan look like it was cut from the same sheet
    of pressed steel as the sink, and it was not.
  - `sn_mirror` — see `bathroom_mirror` below; the hard-constraint material
    for a renderer with no reflection probes.
  - `sn_laminate` — the cubicle partition. Pale, matte, institutional; not
    `vinyl_mat.tres` (that is warm tan moulded seat plastic — a different
    object entirely) and not `trim_mat.tres` (glossier, and already spoken
    for as the skirting-board paint every wall in the ward carries).
  - `sn_bakelite` — the payphone body and handset. Dark, semi-gloss,
    date-appropriate for an asylum's phone; nothing in the existing palette
    is both dark AND warm-toned (`chain` is cold pitted iron, `screen` is a
    near-black glass-look reserved for CRT/troffer glazing).

Registered via `k.material()`, per prop_defs.py's own instruction never to
touch its MATERIALS literal directly — see that function's docstring for why.
"""

import math

import prop_defs as k

k.material("sn_vitreous", "res://props/sn_vitreous_mat.tres")
k.material("sn_mirror", "res://props/sn_mirror_mat.tres")
k.material("sn_laminate", "res://props/sn_laminate_mat.tres")
k.material("sn_bakelite", "res://props/sn_bakelite_mat.tres")

# Shorthand purely for readability below — every call still goes through k,
# same convention defs_wardfit.py and defs_medical.py already use.
box, cyl, tube, taper, frame, slats, part = k.box, k.cyl, k.tube, k.taper, k.frame, k.slats, k.part


# =============================================================================
# TOILET + CISTERN — priority 1 and 2. A floor-standing WC pan with a seat
# (institutional: no lid, so it cannot be left lolling half-open the way a
# domestic lid would, and one fewer hinge to model) and the high-level tank
# that feeds it.
#
# WHY HIGH-LEVEL rather than a modern close-coupled unit sitting flush behind
# the pan: the material board's whole vocabulary is Victorian/mid-century
# institutional plumbing left in place for decades — the same sensibility
# that gave the ward its column radiators over flat panels. A high-level
# tank on wall brackets with an exposed flush pipe and a pull chain is the
# visually characterful choice and the one the brief explicitly asks for
# ("a pipe down to the pan"); close-coupled has no pipe to speak of.
# =============================================================================

k.prop("toilet", "floor", (0.46, 0.56, 0.52), collider=(0.48, 0.54), doc="""\
Floor-standing WC pan with a seat ring and back hinge blocks, no lid —
institutional fittings of this era did not carry one; it is one fewer part
that reads as "broken" when missing, and one less thing to animate later.

Pairs with `cistern`, mounted on the same wall directly behind it at this
prop's default facing; PLACE THE CISTERN AT THE SAME (x, z) AS THIS PROP, on
the wall the pan backs onto, so the cistern's baked flush pipe reads as
running down to this pan's back rather than to open air — the pipe is not
computed from either prop's actual position, only art-directed to look right
at that relative offset (see `cistern`'s own doc).

THE SEAT IS A `tube`, NOT A BOX WITH A FAKE DARK SLOT ON ITS FRONT FACE.
The first pass used a flat box seat plus a dark box glued to the bowl's
FRONT face to imply a hole — from the front-on angle every gallery shot is
actually taken from, that read as a bin's mail-slot, not a toilet seat, and
the whole assembly (a taper pedestal flaring straight into a similarly-
sized box bowl) silhouetted as a planter. `tube` genuinely has a bore, so
SEATRING overhangs BOWL's own radius on every side — the ring itself is the
silhouette cue, not a texture trick — and SEATVOID sits recessed just far
enough behind the ring's front face to read as a real hollow through it
rather than a disc glued to the front. BOWL and PEDESTAL are now `taper`
too (round in cross-section, like an actual pan) and PEDESTAL is
DELIBERATELY much narrower than BOWL's own radius, so there is a visible
step at the join instead of one continuous cone — that step is what breaks
the "vase" read.""",
     parts=[
         part(taper(0.09, 0.11, 0.30, 12), "sn_vitreous", (0, 0.15, 0.04), name="Pedestal"),
         part(taper(0.17, 0.205, 0.22, 14), "sn_vitreous", (0, 0.40, -0.02), name="Bowl"),
         part(box((0.22, 0.06, 0.06), 0.02), "sn_vitreous", (0, 0.28, -0.27), name="FrontLip"),
         # SEATRING AND SEATVOID ARE ROTATED pi/2 ABOUT X — the same trick
         # sink's spouts and shower_head's valve plate use (see either doc):
         # an unrotated cyl/tube's flat caps face local +-Y, so a "ring
         # facing the camera" needs that Y axis turned to face world -Z.
         # Skipping the rotation was the first version's actual bug — the
         # ring rendered edge-on as a razor-thin band and vanished at gallery
         # distance, which is why the whole prop still read as a smooth vase
         # with nothing on top.
         part(tube(0.225, 0.16, 0.035, 16), "sn_vitreous", (0, 0.52, -0.02),
              rot=(math.pi / 2, 0, 0), name="SeatRing"),
         part(cyl(0.15, 0.02, 12, 0.002), "screen", (0, 0.515, 0.015),
              rot=(math.pi / 2, 0, 0), name="SeatVoid"),
         part(box((0.38, 0.03, 0.08), 0.012), "sn_vitreous", (0, 0.535, 0.17), name="HingeBlock"),
         part(cyl(0.010, 0.05, 8, 0.002), "chain", (-0.12, 0.55, 0.20),
              rot=(0, 0, math.pi / 2), name="HingeL"),
         part(cyl(0.010, 0.05, 8, 0.002), "chain", (0.12, 0.55, 0.20),
              rot=(0, 0, math.pi / 2), name="HingeR"),
         part(box((0.28, 0.14, 0.10), 0.02), "sn_vitreous", (0, 0.30, 0.20), name="BackShroud"),
     ])

k.prop("cistern", "wall", (0.40, 1.80, 0.20), mount_y=1.85, doc="""\
High-level cistern on wall brackets, with a flush pipe running down the wall
and a pull chain — the piece that makes `toilet` read as PLUMBED rather than
dropped in place. See `toilet`'s doc for the placement assumption: this baked
mesh's pipe length is art-directed to reach a pan placed at the same (x, z)
on the same wall, not computed against an actual pan instance, because a
prefab has no way to know what else shares its wall.

NO COLLIDER, deliberately, unlike `toilet` — everything below `mount_y` down
to the pipe's end sits directly above and behind where the pan's own
collider already blocks the player; a second box here would only double that
footprint for no gain, the same reasoning `radiator` and `wall_shelf` apply
to their own wall-mounted mass.""",
     parts=[
         part(box((0.34, 0.28, 0.16), 0.02), "sn_vitreous", (0, 0, -0.08), name="Tank"),
         part(box((0.37, 0.03, 0.18), 0.012), "sn_vitreous", (0, 0.155, -0.08), name="Lid"),
         part(cyl(0.008, 0.008, 6, 0.001), "steel", (-0.12, 0.05, -0.005),
              rot=(math.pi / 2, 0, 0), name="BoltL"),
         part(cyl(0.008, 0.008, 6, 0.001), "steel", (0.12, 0.05, -0.005),
              rot=(math.pi / 2, 0, 0), name="BoltR"),
         part(cyl(0.013, 1.40, 8, 0.002), "steel", (0.14, -0.84, -0.05), name="FlushPipe"),
         part(box((0.03, 0.02, 0.03), 0.004), "steel", (0.14, -0.55, -0.03), name="PipeClip"),
         part(cyl(0.003, 0.55, 6, 0.001), "chain", (-0.12, -0.415, -0.10), name="Chain"),
         part(box((0.025, 0.03, 0.025), 0.004), "chain", (-0.12, -0.71, -0.10), name="ChainPull"),
     ])


# =============================================================================
# GRAB_RAIL — priority 3. The single most ubiquitous hospital fitting there
# is and, until now, the one most conspicuously missing from every corridor
# and washroom wall in the kit.
# =============================================================================

k.prop("grab_rail", "wall", (0.62, 0.07, 0.09), mount_y=0.85, doc="""\
Stainless bathroom grab rail on two standoff brackets. Standard fitting
height (~0.85m) puts it beside a toilet or in a shower recess without a
number in the room file — same "no math at the call site" goal `radiator`
and `bumper_rail` already serve.

STANDOFFS ARE NOT OPTIONAL. A rail flush against the wall reads as a painted
stripe (bumper_rail's own doc makes exactly this point); the brackets hold
it off the wall face by 75mm, which is what a hand actually needs to grip
behind it and what throws the shadow line that sells it as a tube in space
rather than a decal.

`sn_mirror` is not used here even though both are "shiny hospital steel" —
`steel` already exists for exactly this (see its own header: metallic
pinned near zero, sold via a tighter roughness than the plaster around it),
and reaching for a new material would just be two names for one job.""",
     parts=[
         part(cyl(0.018, 0.60, 12, 0.003), "steel", (0, 0, -0.075),
              rot=(0, 0, math.pi / 2), name="Rail"),
         part(cyl(0.012, 0.055, 8, 0.002), "steel", (-0.27, 0, -0.0375),
              rot=(math.pi / 2, 0, 0), name="StandoffL"),
         part(cyl(0.012, 0.055, 8, 0.002), "steel", (0.27, 0, -0.0375),
              rot=(math.pi / 2, 0, 0), name="StandoffR"),
         part(cyl(0.032, 0.012, 10, 0.003), "steel", (-0.27, 0, -0.006),
              rot=(math.pi / 2, 0, 0), name="PlateL"),
         part(cyl(0.032, 0.012, 10, 0.003), "steel", (0.27, 0, -0.006),
              rot=(math.pi / 2, 0, 0), name="PlateR"),
     ])


# =============================================================================
# BATHROOM_MIRROR — priority 4.
#
# THE RENDERER HAS NO REFLECTION PROBES. main.tscn carries background +
# ambient colour only (see MIGRATION_NOTES section 1, the same finding that
# killed `chain`'s original metallic 0.8), so an actual mirror — a surface
# that shows you the room behind the camera — is not achievable here at all.
# What sells "mirror" instead is `sn_mirror_mat.tres`: darker than every wall
# and most props around it, and pinned to a very low roughness so it catches
# one tight, hot specular streak off whatever ceiling fitting is nearby,
# which is the one cue a static prop can give for "this is reflective" without
# actually reflecting anything. Read that material's own header before
# touching its roughness or albedo — the luminance floor noted there is not
# decorative, it is what keeps this from crushing to literal black under
# ACES + the harness's contrast grade, the same trap another agent already
# found once on this build.
# =============================================================================

k.prop("bathroom_mirror", "wall", (0.50, 0.66, 0.05), mount_y=1.55, doc="""\
Plain steel-framed mirror panel over a basin. `mount_y` 1.55 sets its centre
comfortably above `sink`'s rim (sink mount_y 0.86 + its own 0.46 height puts
the basin top near 1.09) with no overlap and a believable splash gap.

THE PANEL IS SET BACK FROM THE FRAME'S FRONT FACE, not flush with it —
0.021m clear of the frame's own -0.025..0m depth range. `ceiling_troffer`'s
own doc records the z-fight this project got bitten by once already when two
panels shared a plane; recessing the glass here is the same fix applied
before the bug has a chance to happen, not after.

SEE sn_mirror_mat.tres's HEADER before treating this as an actual reflector
— it categorically is not one, and cannot be, on this renderer.""",
     parts=[
         part(frame(0.48, 0.64, 0.035, 0.025, 0.004), "steel", (0, 0, -0.0125), name="Frame"),
         part(box((0.42, 0.58, 0.006), 0.002), "sn_mirror", (0, 0, -0.020), name="MirrorPanel"),
         part(box((0.03, 0.015, 0.01), 0.003), "steel", (-0.18, 0.295, -0.005), name="ClipL"),
         part(box((0.03, 0.015, 0.01), 0.003), "steel", (0.18, 0.295, -0.005), name="ClipR"),
     ])


# =============================================================================
# SHOWER_HEAD — priority 5. A wall-mounted head on a short arm plus a
# separate control valve lower on the wall, both authored as one prop so a
# room places a single shower point with one call.
# =============================================================================

k.prop("shower_head", "wall", (0.14, 1.00, 0.24), mount_y=1.10, doc="""\
Wall shower valve at hand height (mount_y 1.10) with a riser pipe, a short
arm and a rose, the arm/rose sitting ~0.85m above the valve — roughly head
height on a standing adult, which is what makes the whole assembly read as
plumbed-in rather than floating parts.

The ROSE is a `taper` with NO rotation: `r_bot` (wide) sits at the part's own
-Y and `r_top` (narrow) at +Y by construction, which is already "wide face
down, narrow neck up" — exactly a shower rose's silhouette — for free. The
same convention `fire_extinguisher`'s dome cap already banks (wide-bottom,
narrow-top, unrotated).

The LEVER points -Z off the valve plate the same way `sink`'s spouts point
-Z off its tap bodies (rot=(pi/2, 0, 0) turns a part's own +Y into world -Z)
— reuse the trick rather than re-deriving the sign by trial and error.""",
     parts=[
         part(cyl(0.045, 0.018, 12, 0.003), "steel", (0, 0, -0.009),
              rot=(math.pi / 2, 0, 0), name="ValvePlate"),
         part(box((0.018, 0.018, 0.10), 0.005), "steel", (0, 0, -0.07), name="Lever"),
         part(box((0.03, 0.03, 0.03), 0.005), "steel", (0, 0, -0.125), name="LeverKnob"),
         part(cyl(0.014, 0.85, 8, 0.002), "steel", (0, 0.425, -0.02), name="Riser"),
         part(cyl(0.013, 0.18, 8, 0.002), "steel", (0, 0.85, -0.11),
              rot=(math.pi / 2, 0, 0), name="Arm"),
         part(taper(0.055, 0.018, 0.035, 12), "steel", (0, 0.83, -0.22), name="Rose"),
     ])


# =============================================================================
# PAPER_TOWEL_DISPENSER — priority 6. A wall unit above a basin; pairs with
# `sink` or `bathroom_mirror` the same way `wall_shelf` pairs with whatever a
# room puts on it.
# =============================================================================

k.prop("paper_towel_dispenser", "wall", (0.28, 0.28, 0.14), mount_y=1.35, doc="""\
Stainless dispenser unit with a recessed slot and a sheet of towel already
hanging out of it — an empty dispenser reads as a blank steel box, and this
kit already has one of those (`wall_shelf`). The towel sheet (props/paper_mat
.tres, tilted slightly outward on its own X axis) is the one part that sells
the whole thing as a working fixture rather than a wall-mounted sculpture.

mount_y 1.35 sits above `sink`'s basin (top ~1.09, see `bathroom_mirror`'s
note on the same arithmetic) with clearance for a hand reaching under it.""",
     parts=[
         part(box((0.26, 0.20, 0.09), 0.012), "steel", (0, 0, -0.045), name="Body"),
         part(box((0.24, 0.03, 0.02), 0.006), "steel", (0, -0.11, -0.10), name="LipFront"),
         part(box((0.16, 0.015, 0.015), 0.004), "screen", (0, -0.095, -0.098), name="SlotVoid"),
         part(box((0.18, 0.10, 0.006), 0.004), "paper", (0, -0.16, -0.10),
              rot=(0.15, 0, 0), name="Towel"),
         part(cyl(0.012, 0.012, 8, 0.002), "chain", (0.09, 0.02, -0.091),
              rot=(math.pi / 2, 0, 0), name="Latch"),
     ])


# =============================================================================
# WASTE_BIN — priority 7. Pedal bin, floor-standing.
# =============================================================================

k.prop("waste_bin", "floor", (0.34, 0.46, 0.34), collider=(0.36, 0.36), doc="""\
Foot-pedal waste bin in `enamel_green` — the same institutional paint the
radiator and dado tiling already carry, on the reasoning that a hospital
repaints its metalwork from one drum of stock colour, not a different shade
per object. That is also why this is the one prop in the file NOT getting a
bespoke `sn_` material: there is nothing about a painted steel bin that
`enamel_green` does not already cover.

The LINKROD up the back does not literally connect to the pedal — real
pedal-bin mechanisms are internal — it is there purely as the visual cue
that the pedal does something, the same "implied mechanism" liberty
`mop_bucket`'s mop-in-bucket already takes.""",
     parts=[
         part(taper(0.145, 0.165, 0.40, 14), "enamel_green", (0, 0.20, 0), name="Body"),
         part(taper(0.17, 0.14, 0.045, 14), "enamel_green", (0, 0.4225, 0), name="Lid"),
         part(tube(0.168, 0.158, 0.02, 14), "steel", (0, 0.39, 0), name="RimBand"),
         part(cyl(0.02, 0.02, 8, 0.003), "steel", (0, 0.447, 0), name="LidKnob"),
         part(box((0.10, 0.02, 0.03), 0.004), "chain", (0, 0.445, 0.14), name="Hinge"),
         part(box((0.05, 0.02, 0.13), 0.006), "chain", (0, 0.02, -0.17), name="Pedal"),
         part(cyl(0.006, 0.42, 6, 0.001), "chain", (0, 0.22, 0.15), name="LinkRod"),
     ])


# =============================================================================
# TOILET_CUBICLE_PANEL — priority 8. A partition panel with a gap at the
# bottom, prop_run-tileable. X extent is exactly 2.0 for the same reason
# `skirting` and `bumper_rail` are: `Room.prop_run()` divides a span by the
# prop's own size[0] to get a segment count, and anything that does not
# divide evenly by a clean number makes a run either overhang oddly or need
# hand-tuned spans everywhere it is used.
#
# TRAP WORTH FLAGGING: `Room.prop_run()`'s batched (MultiMesh) path carries
# NO collider for ANY prop, by design (see its own docstring — "run props
# carry no collider either way"), and its per-instance gated path
# (state=/light=/name_fmt= set) explicitly forces `collider=False` on every
# segment too. So a run of this panel via `prop_run()`, however it is
# called, is walk-through. If a room actually needs cubicle divisions the
# player cannot pass through, place instances individually with
# `r.model("toilet_cubicle_panel", ...)` — that path honours this prop's
# own `collider` normally, same as any other prop.
# =============================================================================

k.prop("toilet_cubicle_panel", "wall", (2.0, 2.0, 0.06), mount_y=1.075,
     collider=(2.02, 0.10), doc="""\
2m partition panel, floor-standing but authored as a `wall` mount because
that is the convention `prop_run()` and every other `run` prop share — the
"wall face" here is simply the panel's own plane, and a room repeats it
exactly as it would `skirting`.

THE GAP AT THE BOTTOM (0.15m, floor to panel underside) is the one detail
that reads as "toilet cubicle" rather than "generic partition wall" — every
real cubicle system floats its panels clear of the floor for cleaning, and
without the gap this is indistinguishable from a stub wall. The two floor
feet are cosmetic support, not a second floor contact for the panel itself —
they stop short of actually touching the panel's underside, which is what
keeps the gap legible in a front-on shot instead of reading as a shadow
seam.

See the TRAP note above the module section this belongs to before relying on
`prop_run()` for a collidable run of these.""",
     parts=[
         part(box((2.0, 1.85, 0.035), 0.008), "sn_laminate", (0, 0, -0.0175), name="Panel"),
         part(box((0.05, 0.15, 0.05), 0.006), "steel", (-0.94, -1.0, -0.025), name="FootL"),
         part(box((0.05, 0.15, 0.05), 0.006), "steel", (0.94, -1.0, -0.025), name="FootR"),
         part(box((2.0, 0.03, 0.045), 0.006), "steel", (0, 0.94, -0.0225), name="TopRail"),
     ])


# =============================================================================
# PAYPHONE — priority 9. Enormously characterful for an institution: the one
# object in this file that is not plumbing, and the one most likely to carry
# a scrawl or a telemetry hook later (out of scope here — this module only
# declares geometry).
# =============================================================================

k.prop("payphone", "wall", (0.32, 0.62, 0.20), mount_y=1.55, doc="""\
Wall payphone: steel back box under a weather hood, a dark face panel with a
suggested keypad, a coin shelf, and a handset hanging off its hook by a
short cord. `sn_bakelite` (dark, semi-gloss) carries the handset and cord —
see the module header for why neither `chain` nor `screen` was reused here.

THE HOOD PROTRUDES FURTHER THAN THE BACK BOX (-0.14 vs the box's own -0.10),
matching a real payphone canopy and giving the whole assembly a shadow line
under it without a light having to be angled specially — the same shadow-
grounding trick `bumper_rail`'s brackets and `radiator`'s wall brackets use,
applied to a canopy instead of a standoff.

NO COLLIDER — its 0.20m depth is in the same class as `fire_extinguisher`'s
0.19m bracket-mounted body, which also carries none; a corridor already
budgets clearance for wall fittings at that depth.""",
     parts=[
         part(box((0.28, 0.42, 0.10), 0.015), "steel", (0, 0, -0.05), name="BackBox"),
         part(box((0.30, 0.05, 0.13), 0.012), "steel", (0, 0.235, -0.075), name="Hood"),
         part(box((0.22, 0.26, 0.015), 0.008), "chain", (0, 0.02, -0.115), name="FacePanel"),
         part(box((0.14, 0.10, 0.01), 0.004), "screen", (0, 0.06, -0.128), name="Keypad"),
         part(box((0.24, 0.035, 0.09), 0.008), "steel", (0, -0.16, -0.075), name="Shelf"),
         part(box((0.05, 0.015, 0.01), 0.003), "chain", (0, -0.145, -0.125), name="CoinSlot"),
         part(box((0.05, 0.02, 0.03), 0.006), "steel", (0.09, 0.16, -0.11), name="Hook"),
         part(box((0.045, 0.16, 0.045), 0.015), "sn_bakelite", (0.09, 0.05, -0.14),
              rot=(0, 0, 0.35), name="Handset"),
         part(cyl(0.006, 0.14, 6, 0.001), "sn_bakelite", (0.09, 0.13, -0.13),
              rot=(0.3, 0, 0.35), name="Cord"),
     ])


# =============================================================================
# UTILITY_SHELF_UNIT — priority 10. Open steel shelving rack for a
# storeroom. The one prop in this file explicitly asked to be built from
# `slats` at high fill — see prop_defs.py's own primitive-constructor note on
# `slats`: near-solid fill reads as a ribbed wire shelf, the same primitive a
# barred window or a radiator uses at LOW fill for the opposite reason.
# =============================================================================

k.prop("utility_shelf_unit", "floor", (0.90, 1.65, 0.40), collider=(0.92, 0.42), doc="""\
Four-tier open wire shelving, four steel corner posts and four ribbed
shelves — ALL FOUR SHELVES SHARE ONE `slats` KEY, so this is 8 parts for a
4-tier unit rather than 16; the shelf mesh differs only in Y position, which
costs nothing per prop_defs.py's own dedup-by-dimension rule (see the module
docstring on mesh sharing, and `radiator`'s columns for the same trick with a
single reused primitive at different placements).

Deliberately empty, same reasoning as `wall_shelf`: put `binder_stack`,
`paper_tray` or debris on it per-room rather than baking contents in, so one
prop serves a storeroom, a sluice and a linen bay without a variant each.""",
     parts=[
         part(cyl(0.014, 1.65, 8, 0.002), "steel", (-0.42, 0.825, -0.18), name="PostFL"),
         part(cyl(0.014, 1.65, 8, 0.002), "steel", (0.42, 0.825, -0.18), name="PostFR"),
         part(cyl(0.014, 1.65, 8, 0.002), "steel", (-0.42, 0.825, 0.18), name="PostBL"),
         part(cyl(0.014, 1.65, 8, 0.002), "steel", (0.42, 0.825, 0.18), name="PostBR"),
         part(slats(0.86, 0.02, 0.38, 16, 0.0, 0.85), "steel", (0, 0.05, 0), name="ShelfBottom"),
         part(slats(0.86, 0.02, 0.38, 16, 0.0, 0.85), "steel", (0, 0.55, 0), name="ShelfMid1"),
         part(slats(0.86, 0.02, 0.38, 16, 0.0, 0.85), "steel", (0, 1.05, 0), name="ShelfMid2"),
         part(slats(0.86, 0.02, 0.38, 16, 0.0, 0.85), "steel", (0, 1.55, 0), name="ShelfTop"),
     ])
