"""Ward B prop kit — BUILDING FABRIC. The small fittings on every real wall.

WHY THIS FILE EXISTS. `props/_gen/prop_defs.py`'s tiers give a room its
furniture and its architectural trim (skirting, bumper rail, vents), and
`defs_signage.py`/`defs_wardfit.py`/`defs_debris.py` give it text, dressing
and decay. What none of that covers is the layer of small, ubiquitous
building services every real institutional wall is covered in: a switch
beside every doorway, a socket every few metres, a break-glass call point in
every corridor, a corner guard on every external corner, a diffuser in every
suspended-ceiling bay. A room with skirting, a radiator and a notice board but
no light switch anywhere still reads as a stage set — nobody could actually
turn the lights on in it. These are the props that make a wall a WALL rather
than a surface with furniture in front of it.

DRAW CALLS ARE THE BINDING CONSTRAINT FOR THIS SET MORE THAN ANY OTHER TIER
IN THE KIT. Every prop below is placed densely — a switch by every door, a
socket every few metres, a diffuser in every ceiling bay — so a part count
that would be unremarkable on a one-off like `sink` is multiplied by a dozen
or more per room here. Every prop in this file is 2-4 parts; each prop's doc
below says roughly how many a single room can carry without denting the
650-prop soft budget `tools/gen_rooms.py`'s validators reportedly assume (see
the per-prop notes for specifics).

MATERIALS. Three new ones, all prefixed `fb_` per this file's ownership rule:
`fb_plate` (satin cream accessory plate — switches, sockets, the alarm-point
backbox, the hand-gel body: a plastic/pressed-steel wiring-accessory family
distinct from props/enamel's painted cast iron and props/steel's brushed
chair-frame metal), `fb_blind` (dusty roller-blind canvas) and `fb_stain`
(damp/rust wall discolouration). Everything else below reuses base-kit
materials already registered in prop_defs.MATERIALS — `steel`, `chain`,
`red`, `screen`, `trim` — deliberately: fire_alarm_point's brief was explicit
that it should stay `red_mat.tres`-dark rather than invent a second red, and
corner_guard/ceiling_diffuser/door_closer/dado_rail read as kin to
prop_defs.py's existing wall_vent/pipe_run/skirting precisely because they
share those materials rather than each getting a bespoke one.

METALLIC STAYS NEAR ZERO THROUGHOUT, same reason as everywhere else in the
kit (MIGRATION_NOTES.md: gl_compatibility, no sky, no reflection probes — a
genuinely metallic surface renders flat black). Every "steel" or "chrome"
read in this file is sold with roughness and albedo value, never with the
metallic slider.
"""

import math

import prop_defs as k

k.material("fb_plate", "res://props/fb_plate_mat.tres")
k.material("fb_blind", "res://props/fb_blind_mat.tres")
k.material("fb_stain", "res://props/fb_stain_mat.tres")


# =============================================================================
# light_switch — a rocker switch on a plate. THE single most-repeated prop in
# this file: one beside every doorway in the ward, both sides in a busy
# corridor. 2 parts, so a room can carry dozens (30+) before it registers
# against props with 6-10 parts each.
# =============================================================================
k.prop("light_switch", "wall", (0.086, 0.086, 0.028), mount_y=1.05, doc="""\
Single rocker switch on a plate. mount_y 1.05 is UK/institutional switch
height — deliberately NOT eye level like wall_clock or notice_board; a switch
is reached for, not read.

TWO PARTS ONLY: Plate (fb_plate, flush-ish to the wall) and Rocker (chain,
proud of it). The rocker is the whole reason this reads as a switch rather
than a blank plate at a glance from across a room — a single small dark
rectangle proud of a pale one is an unmistakable silhouette at any distance,
which is exactly the "individually tiny, collectively transformative" brief
this file exists to serve. Room budget: this is the cheapest prop in the
kit tied with dado_rail's 2 parts — place it liberally, by every door.""",
     parts=[
         k.part(k.box((0.086, 0.086, 0.012), 0.003), "fb_plate", (0, 0, -0.006),
               name="Plate"),
         k.part(k.box((0.032, 0.048, 0.016), 0.004), "chain", (0, 0, -0.020),
               name="Rocker"),
     ])


# =============================================================================
# socket_plate — twin mains socket, low on the wall. Same plate mesh key as
# light_switch's Plate (identical box dims), so the two share a baked
# resource for free the moment both ship — the kit's mesh-dedup thesis paying
# off across files, not just within one.
# =============================================================================
k.prop("socket_plate", "wall", (0.086, 0.086, 0.020), mount_y=0.45, doc="""\
Twin mains socket on a plate, low on the wall (mount_y 0.45 — skirting-
adjacent, the height every real socket actually sits at, and the value the
kit's own mount-rule docs use as the worked example for this exact prop).

Same Plate box as light_switch (0.086 x 0.086 x 0.012, bevel 0.003) — an
identical primitive call, so it resolves to the SAME mesh key and is baked
once for both props; see prop_defs.py's module docstring on why declaring at
an existing size is free reuse rather than a coincidence to avoid. Two small
dark outlet inserts (chain) sit proud of it, spaced apart to read as a TWIN
socket rather than a single blank switch from across a corridor — that
side-by-side pairing is what visually distinguishes this from light_switch
at a glance, more than the lower mounting height does. 3 parts; a corridor
run can carry a dozen+ without concern.""",
     parts=[
         k.part(k.box((0.086, 0.086, 0.012), 0.003), "fb_plate", (0, 0, -0.006),
               name="Plate"),
         k.part(k.box((0.028, 0.028, 0.008), 0.003), "chain", (-0.019, 0, -0.016),
               name="OutletL"),
         k.part(k.box((0.028, 0.028, 0.008), 0.003), "chain", (0.019, 0, -0.016),
               name="OutletR"),
     ])


# =============================================================================
# fire_alarm_point — the red break-glass call point. Second saturated red in
# the game after fire_extinguisher; per the brief this stays props/red
# (red_mat.tres) rather than getting its own brighter variant, so the two
# never compete for "the one warm object in this corridor."
# =============================================================================
k.prop("fire_alarm_point", "wall", (0.09, 0.09, 0.045), mount_y=1.40, doc="""\
Break-glass call point — a red frame around a dark recessed pane over a pale
backbox. mount_y 1.40 matches the brief's figure exactly (between a light
switch and eye level — call points are mounted to be seen and reached in a
hurry, not blended into a switch row).

BUILT AS FRAME-AROUND-GLASS, not a solid red box, because that hollow-border
shape is what actually reads as "break glass to operate" at a glance — a
plain red cube reads as a small fire extinguisher bracket instead. Backbox
(fb_plate) is DELIBERATELY WIDER than Frame (0.10 vs 0.086) rather than the
same size — a first pass matched them exactly and the backbox vanished
completely behind the frame from straight on, which read as a red frame
hovering with no mounting surface. The 7mm margin shows a pale plate collar
around the red, which is what actually grounds it against the wall. Frame
(`red`, a `frame()` hollow border so the shape survives) stands proud of the
backbox; Glass (`screen` — the same near-black low-roughness "dead glass"
material crt_monitor's Screen and troffer_lamp's dark half both use) sits
RECESSED behind the Frame's front lip, inside its hollow window, so it reads
as a pane you would have to strike rather than a solid disc. `red`_mat.tres's
own header explains why the colour is kept dark rather than saturated bright
— this prop is a second, deliberately smaller use of the same restraint.
3 parts; a couple per corridor (code-plausible spacing) costs nothing.""",
     parts=[
         k.part(k.box((0.10, 0.10, 0.012), 0.003), "fb_plate", (0, 0, -0.006),
               name="Backbox"),
         k.part(k.frame(0.086, 0.086, 0.014, 0.020), "red", (0, 0, -0.022),
               name="Frame"),
         k.part(k.box((0.058, 0.058, 0.006), 0.002), "screen", (0, 0, -0.019),
               name="Glass"),
     ])


# =============================================================================
# corner_guard — stainless corner protector, floor to ~1.5m. Ubiquitous in
# real hospitals (every external corner in a corridor takes trolley traffic)
# and the brief calls out that it "catches a highlight that defines the
# corner" — which is why it is built from a rounded `cyl`, not a flat box: a
# flat panel screwed over a corner reads as a panel, a rounded profile reads
# as the corner itself being protected.
# =============================================================================
k.prop("corner_guard", "wall", (0.10, 1.50, 0.09), mount_y=0.75, doc="""\
Rounded stainless bar guarding a corridor's external corner, floor to 1.5m
(mount_y 0.75 centres the prop on that span so it needs no `y` from the room
author — same convention every other wall prop in the kit follows).

PLACEMENT NOTE, because this prop is geometrically different from every
other entry in this file: a real corner guard wraps BOTH wall faces meeting
at a corner, but the kit's wall mount is authored against a single flat wall
face (see prop_defs.py's mount-rule docstring). This is built to look correct
mounted on EITHER of the two walls at a corner, protruding its full diameter
(0.09m) into the room — a room author places it on whichever of the two
walls is more convenient and it reads as sitting on the corner seam either
way, because the rounded profile has no "wrong" face.

Body is `cyl` (round in cross-section, unlike every flat box in the kit's
trim tier) precisely for the "catches a highlight" brief: a rounded surface
always has SOME normal facing the room's one light source, where a flat
panel only lights when the room happens to face it square-on. Base is a
flared kick plate — the actual impact zone a trolley corner hits — widened
past the shaft's own diameter the same way radiator's LegL/LegR flare wider
than its column. 2 parts; place on every genuinely external/protruding
corner a room has (typically 2-6) with no budget concern.""",
     parts=[
         k.part(k.cyl(0.045, 1.50, 10, 0.010), "steel", (0, 0, -0.045), name="Body"),
         k.part(k.box((0.16, 0.12, 0.09), 0.012), "steel", (0, -0.69, -0.045),
               name="Base"),
     ])


# =============================================================================
# hand_gel — wall-mounted sanitiser dispenser with a push paddle. A modern
# institutional fitting rather than a period one, and deliberately included
# anyway: the brief's own reference photos of real UK hospital wards show
# these retrofitted onto 1970s-spec walls everywhere, so ONE anachronism
# reads as "this building kept being used" rather than as an authoring error.
# =============================================================================
k.prop("hand_gel", "wall", (0.11, 0.26, 0.10), mount_y=1.10, doc="""\
Wall-mounted alcohol-gel dispenser — a plain body with a paddle you push
upward into, and a small drip tray underneath. mount_y 1.10 is hand-reach
height for a standing adult, below light_switch (1.05 is close by design —
these two are the props most likely to be placed as a pair beside a door).

PADDLE IS THE LOAD-BEARING DETAIL, same logic as light_switch's Rocker: a
bare box body reads as a soap dispenser, a first-aid box, or nothing at all
from a few metres off; a small dark lever proud of the lower half of the
body is what specifically reads as "push this" and sells the prop as a
dispenser rather than a generic wall box. Tray (steel) catches the
inevitable drip stain a real one collects — cheap "this gets used" signal in
the same family as binder_stack's lean or wall_shelf's fixing bolts.
3 parts; several per ward corridor (one per doorway cluster) costs nothing.""",
     parts=[
         k.part(k.box((0.09, 0.20, 0.06), 0.008), "fb_plate", (0, 0, -0.030),
               name="Body"),
         k.part(k.box((0.03, 0.11, 0.022), 0.004), "chain", (0, -0.05, -0.071),
               name="Paddle"),
         k.part(k.box((0.07, 0.020, 0.05), 0.006), "steel", (0, -0.115, -0.050),
               name="Tray"),
     ])


# =============================================================================
# window_blind — a half-drawn roller blind above a window. Sized to pair with
# prop_defs.py's `barred_window` (1.46m wide) exactly, mounted just above its
# top edge, per the brief.
# =============================================================================
k.prop("window_blind", "wall", (1.46, 0.82, 0.07), mount_y=2.95, doc="""\
Roller blind, half-drawn, mounted at the head of a `barred_window` opening.
mount_y 2.95 sits just above barred_window's own top edge — that window is
mount_y=1.85 with a 2.16-tall Reveal (half 1.08), so its top edge is at
1.85+1.08 = 2.93; this prop's headrail sits 2cm above that, clear of the
window frame rather than overlapping it (the "check a new wall prop against
what the room already has" trap prop_defs.py's own barred_window entry
names, applied pre-emptively here since the two are explicitly meant to be
placed together).

FABRIC IS A FLAT PANEL, not a `slats()` louvre — a roller blind is a single
continuous sheet of canvas on a roller, unlike a venetian blind's stacked
slats, so the kit's louvre primitive would be the wrong read here even
though it is available. Panel height (0.72) is deliberately a PARTIAL
drop against the window's ~2.0m glazed height — "half-drawn," per the
brief, not fully closed — so the barred window stays the bright surface the
room is composed around (see barred_window's own doc on why it must stay
the brightest thing in frame) rather than being shuttered off by a closed
blind. BottomBar is the weighted rail every real roller blind's hem carries,
in `steel` rather than `fb_blind`, so the fabric panel doesn't just stop
mid-air. 3 parts; one per barred_window is the expected ratio, so budget
tracks the window count exactly.""",
     parts=[
         k.part(k.box((1.42, 0.055, 0.05), 0.004), "steel", (0, 0, -0.025),
               name="Headrail"),
         k.part(k.box((1.36, 0.72, 0.012), 0.005), "fb_blind", (0, -0.39, -0.045),
               name="Panel"),
         k.part(k.box((1.36, 0.03, 0.03), 0.004), "steel", (0, -0.765, -0.050),
               name="BottomBar"),
     ])


# =============================================================================
# ceiling_diffuser — square ventilation diffuser in the suspended ceiling
# grid, matching defs_debris.py's `missing_ceiling_tile` 600mm module exactly
# so the two sit believably in the same grid.
# =============================================================================
k.prop("ceiling_diffuser", "ceiling", (0.62, 0.12, 0.62), doc="""\
Square linear-bar ventilation diffuser set into one 600mm suspended-ceiling
module — the same module ceiling_troffer (prop_defs.py) and
missing_ceiling_tile (defs_debris.py) already imply, so a ceiling can mix
all three across its grid with nothing looking mismatched in scale.

GridFrame reuses missing_ceiling_tile's EXACT GridEdge call
(`k.frame(0.60, 0.60, 0.035, 0.025)`, `steel`, same rotation, same y) —
deliberately, not by coincidence: identical primitive + material + transform
collapses to the same baked mesh AND renders identically, so this prop and
that one share one resource for free the moment both are placed in a ceiling
together, per prop_defs.py's module docstring on why declaring at an
existing size is the point rather than an optimisation to hunt for.

Recess (`chain`, tucked near the ceiling plane) and Grille (`slats` at
fill=0.35, flattened with the same `rot=(PI/2,0,0)` trick
ceiling_troffer's Bezel / missing_ceiling_tile's GridEdge / defs_debris.py's
cable_tray TrayBed all use to turn a vertical louvre into a horizontal one)
reproduce wall_vent's Recess+Louvres+Surround structure exactly, just
reoriented for a ceiling mount instead of a wall — same silhouette logic,
different plane. 3 parts; a ceiling can carry one per 600mm bay across an
entire room (a dozen or more) with no budget concern — this is exactly the
"individually tiny, collectively transformative" case the brief names.""",
     parts=[
         k.part(k.frame(0.60, 0.60, 0.035, 0.025), "steel", (0, -0.012, 0),
               rot=(math.pi / 2, 0, 0), name="GridFrame"),
         k.part(k.box((0.46, 0.022, 0.46), 0.006), "chain", (0, -0.011, 0),
               name="Recess"),
         k.part(k.slats(0.46, 0.46, 0.018, 7, 0.0, 0.35), "steel", (0, -0.033, 0),
               rot=(math.pi / 2, 0, 0), name="Grille"),
     ])


# =============================================================================
# door_closer — overhead arm-and-cylinder unit above a door. mount_y sits at
# door-lintel height, well above light_switch/fire_alarm_point, so the three
# never compete for the same band of wall.
# =============================================================================
k.prop("door_closer", "wall", (0.30, 0.10, 0.34), mount_y=2.05, doc="""\
Overhead door closer — a horizontal cylinder body on a small mounting
bracket, with a two-segment arm reaching down and out toward where a door
leaf's top corner would be. mount_y 2.05 is standard door-frame-head height,
clear of every other prop in this file (fire_alarm_point tops out at 1.40,
window_blind's headrail is 2.95 — this sits in the gap between them, over a
doorway specifically rather than a plain wall run).

BODY IS A HORIZONTAL `cyl`, using the exact `rot=(0,0,PI/2)` trick
prop_defs.py's `pipe_run` uses to lay a normally-vertical cylinder on its
side along local X — the closer's cylinder is real hardware (a hydraulic
piston in a tube) and reads immediately once horizontal, where a box body
would read as a housing for almost anything. The two arm segments are
angled at different yaws rather than one straight bar, because a real
door-closer arm is a two-bar linkage with a visible knee joint — one bar
reads as a shelf bracket, two at different angles reads unmistakably as
"reaching down to a door." 4 parts, the most expensive prop in this file —
one per doorway that needs it (not every doorway; interior ward doors were
rarely self-closing) keeps this well inside budget.""",
     parts=[
         k.part(k.box((0.05, 0.05, 0.014), 0.004), "steel", (-0.14, 0, -0.007),
               name="Bracket"),
         k.part(k.cyl(0.032, 0.26, 10, 0.004), "steel", (0, 0, -0.040),
               rot=(0, 0, math.pi / 2), name="Body"),
         k.part(k.box((0.164, 0.024, 0.020), 0.004), "chain", (0.07, -0.035, -0.12),
               rot=(0, 2.09, 0), name="ArmA"),
         k.part(k.box((0.142, 0.020, 0.018), 0.004), "chain", (-0.01, -0.07, -0.245),
               rot=(0, 2.20, 0), name="ArmB"),
     ])


# =============================================================================
# dado_rail — moulded trim strip capping a tiled dado at ~1.4m. `prop_run`-
# tileable (X extent exactly 2.0), matching skirting's own contract.
#
# HOW THIS DIFFERS FROM bumper_rail, spelled out because the brief is
# explicit that the two are easy to confuse and must not become the same
# prop twice: bumper_rail (prop_defs.py) is a THICK RUBBER trolley rail at
# 0.90m, standing proud of the wall on steel brackets specifically so a
# gurney or wheelchair glances off it rather than the plaster — it is
# structural/protective, sized and positioned for impact. dado_rail is a
# THIN PAINTED MOULDING at 1.40m with no standoff at all, doing a purely
# decorative job: capping the top edge of a tiled dado so the tile and the
# painted plaster above it meet at a deliberate line instead of a raw grout
# edge. Use bumper_rail on any corridor a trolley or wheelchair travels; use
# dado_rail on a tiled waiting-area or day-room wall (the brief's waiting-
# area plates put a tiled dado under painted plaster) whether or not that
# wall ever sees wheeled traffic. A room can carry both at once, at their
# different heights, with no visual conflict — real institutional corridors
# frequently do.
# =============================================================================
k.prop("dado_rail", "wall", (2.0, 0.07, 0.03), mount_y=1.40, doc="""\
2m of moulded dado rail, capping a tiled dado at ~1.4m — see the block
comment above for how this differs from bumper_rail and when to reach for
which. Built exactly like prop_defs.py's `skirting` (Board + bullnose Cap,
same `trim` material, same two-part shape), just relocated from the floor
line to a mid-wall dado line and with the bullnose facing the room from the
TOP of the strip rather than the bottom — skirting caps a floor/wall seam
from below, this caps a tile/plaster seam from above.

Reuses `trim`_mat.tres verbatim rather than a new material: it is the exact
same glossier, darker green-grey institutional gloss paint real dado rails
and skirting boards share in a period building, and prop_defs.py's own
skirting doc explains why that gloss-vs-matte-plaster contrast is what
makes the seam line read at all. 2 parts, tied with light_switch for the
cheapest prop in this file — `prop_run()` a whole tiled room's walls with
it in one call, same as skirting.""",
     parts=[
         k.part(k.box((2.0, 0.055, 0.022), 0.005), "trim", (0, 0, -0.011),
               name="Board"),
         k.part(k.box((2.0, 0.018, 0.030), 0.006), "trim", (0, 0.0365, -0.015),
               name="Cap"),
     ])


# =============================================================================
# wall_stain — a damp/rust run down a wall, thin geometry. Pairs with the
# concept art's "dark water staining on the ceiling" (plate 1): this is what
# that staining looks like once it has run down onto a vertical wall below
# the ceiling line it originated from.
# =============================================================================
k.prop("wall_stain", "wall", (0.16, 2.10, 0.02), mount_y=2.60, doc="""\
A damp/rust stain running down a wall from near the ceiling, built from two
overlapping strips (Upper, Lower) rather than one, deliberately NOT a single
straight rectangle — a real drip run narrows and wanders as it goes, and a
perfectly uniform rectangle of dark colour reads as a deliberately painted
stripe rather than water damage. Lower is both narrower and offset 2cm in x
from Upper, the same "one small manufactured asymmetry sells wear, symmetry
sells decoration" trick prop_defs.py's notice_board (off-square pinned
sheets) and defs_signage.py's enamel_notice (off-centre chip flecks) both
already use.

mount_y 2.60 anchors the TOP of the run near ceiling height, because real
water staining originates from a leak or a condensating pipe above, never
from partway up a wall — the run should always be placed originating high
and reading as having travelled down, not centred like a picture frame.
It deliberately stops short of the floor (bottom edge lands around y=0.50)
rather than running the full height, so it reads as a fading, drying-out
stain rather than a wall that has been standing in water.

NOT baked dark to fake the unmedicated grade and not left pale for lucid —
per the brief, `fb_stain`'s own header notes the Environment crossfade does
that work; an albedo authored to already look "dark and horror" would look
like flat cardboard the moment the lucid state blows the room out bright.
Both parts are near-flat (0.006/0.005 deep) — genuinely thin geometry, as
the brief specifies, not a slab. STOOD OFF THE WALL BY A REAL 10mm, not
flush at z=0 despite reading as a stain "on" the plaster: a first pass put
the boxes' own back faces exactly at the wall plane (z=0 local, coplanar
with the gallery backdrop's own front face), and the two coplanar surfaces
z-fought into a solid black rectangle with no shading at all — the same
failure mode ceiling_troffer's header warns about for its Recess/Bezel pair,
just crossing prop and mounting-wall instead of two parts of one prop. Every
other flush-reading wall detail in the kit (wall_vent's Recess, notice_board's
Cork) keeps a small nonzero standoff for exactly this reason; 10mm is
imperceptible at normal viewing distance and keeps the depth buffer honest.
2 parts; a decayed room can carry several without denting the budget, but
this is a decay/damage read (like plaster_rubble or the fallen_plaster_patch
family in defs_debris.py) so it belongs in UNMEDICATED-leaning or generally
decrepit rooms, not the clean lucid reference plate.""",
     parts=[
         k.part(k.box((0.12, 1.05, 0.006), 0.002), "fb_stain", (0, -0.525, -0.013),
               name="Upper"),
         k.part(k.box((0.07, 0.95, 0.005), 0.002), "fb_stain", (-0.02, -1.525, -0.0125),
               name="Lower"),
     ])
