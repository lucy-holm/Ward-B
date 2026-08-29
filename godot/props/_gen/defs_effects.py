"""Ward B prop kit — PERSONAL EFFECTS. The human traces the kit still lacks.

WHAT THIS MODULE ADDS, and why. Everything in prop_defs.py and its siblings so
far is either architecture (skirting, vents, radiators) or INSTITUTIONAL
furniture (beds, cabinets, trolleys) — issued stock, the same in every room.
None of it is PERSONAL. A ward this desolate needs objects that say somebody
lived here specifically, not just that a hospital once operated here: a
blanket folded by a particular pair of hands, notes taped up by someone who
needed a wall covered in paper, a child's drawing where a child should never
have been. That is the gap this file closes: folded_blanket, pillow,
taped_notes, childs_drawing, wall_calendar, tin_mug, slippers, open_book,
photo_frame, clothes_pile.

SAME CONVENTIONS AS prop_defs.py — this is an EXTENSION MODULE (see that
file's bottom-of-file section on the mechanism, and defs_wardfit.py for a
second example). Front toward -Z, width X, height Y; floor origin on the
floor with parts at y >= 0; wall origin on the wall face with parts at
z <= 0. Nothing here declares a collider — every prop below is small,
sits well clear of the player's path, and doc'd elsewhere as such; a chair
or a cabinet blocks you, a folded blanket does not.

OFF-AXIS ROTATION IS THE WHOLE THESIS OF THIS FILE, more than any other tier
in the kit. Every generated room is boxes on a grid, and every institutional
prop in prop_defs.py sits square in its footprint on purpose (a filing
cabinet that leaned would look broken, not lived-in). A personal effect reads
as PLACED — as opposed to spawned — precisely because it does NOT sit square:
a blanket folded slightly off true, a slipper kicked at an angle, a page
curling out of true, a drawing taped up a couple of degrees crooked. Nearly
every part below carries a small rotation for exactly that reason, and each
prop's doc says which part is doing the work.

MATERIALS. Three new ones, all prefixed `pe_` per the extension-module
ownership rule prop_defs.py's own docstring states (nothing here touches the
MATERIALS literal directly): `pe_cloth` (grey-olive wool — blankets, spare
clothing, slipper uppers), `pe_wood` (dark varnished wood — the one
wood-toned surface in the kit, reserved for small personal objects rather
than institutional fixtures) and `pe_crayon` (dull brick-red wax crayon —
the single saturated mark in childs_drawing). Everything else below reuses
base-kit materials already registered in prop_defs.MATERIALS —
`ticking` (mattress bedding — reused here for pillows and one layer of
clothes_pile, since institutional bedding and institutional linen are
plausibly the SAME stock), `paper`, `chain`, `enamel`, `steel`, `rubber` —
deliberately, both to keep this file's material footprint small and because
several of those reuses are doing real work: open_book's covers are `chain`
(the kit's near-black iron) rather than a bespoke leather/buckram material,
which costs nothing extra and reads as an old, dark-bound ledger fine at this
scale.

METALLIC STAYS NEAR ZERO, same reason as everywhere else in the kit
(MIGRATION_NOTES.md: gl_compatibility, no sky, no reflection probes — a
genuinely metallic surface renders flat black). pe_wood's 0.03 metallic tick
is a varnish-sheen nudge, not a metal read.

NO EMISSIVE MATERIAL IS INTRODUCED OR REUSED HERE. photo_frame in particular
was tempted to reach for `glass_pale` (the barred-window glazing) for a pane
of glass over the photo — rejected: that material is unshaded and reserved
for light fittings, windows and the EXIT sign per the kit's hard rule, and an
emissive photo frame would read as a light source in a dark room. The frame
ships with no separate glass part; at this scale the omission is invisible
and the alternative is a lit rule violation.

DRAW CALLS. Every prop below is 2-6 parts, well under the kit's 8-part
target — these are small, single-purpose objects by nature, not assemblies.
A room can carry several of these per bed/surface without denting the
per-room budget other tiers have to ration more carefully.
"""

import math

import prop_defs as k

k.material("pe_cloth", "res://props/pe_cloth_mat.tres")
k.material("pe_wood", "res://props/pe_wood_mat.tres")
k.material("pe_crayon", "res://props/pe_crayon_mat.tres")

# Shorthand purely for readability below — every call still goes through k.
box, cyl, tube, taper, frame, slats, part = k.box, k.cyl, k.tube, k.taper, k.frame, k.slats, k.part


# =============================================================================
# folded_blanket — priority 1. Foot-of-bed dressing for ward_bed
# (0.92 x 0.98 x 2.02, mattress top at local y ~0.53 — the mattress box is
# 0.10 tall centred at y=0.48). ward_bed's FOOT is +Z (its doc: "the HEAD is
# at -Z"), so this sits toward the +Z end of the mattress. Like every prop
# meant to rest on furniture rather than the floor, mount is still "floor" —
# the room author passes the mattress-top height as `y`, exactly as
# crt_monitor's doc directs for a counter.
# =============================================================================
k.prop("folded_blanket", "floor", (0.62, 0.16, 0.40), doc="""\
A blanket folded into a stack of three, not draped — this is what a
just-made or just-stripped institutional bed looks like, the pillow's
opposite number in signalling recent human presence. Three parts is not
economy for its own sake: a single beveled box reads as a cushion or a
pallet, and it takes at least two visible seams (the gaps between stacked
layers) before the eye parses "folded fabric" rather than "soft box".

EACH LAYER IS SMALLER AND OFF-AXIS FROM THE ONE BELOW, alternating rotation
direction (bottom square, middle +0.05rad, top -0.07rad plus a hair of tilt
on the vertical axis) — a machine-folded stack is perfectly square, a
hand-folded one drifts a little with every layer, and never in the same
direction twice. Sits on pe_cloth, the module's grey-olive wool, kept
lighter than props/rust so it still separates from an iron bed frame it
might be photographed against.

Pairs with `pillow` at the opposite (-Z) end of the same bed.""",
    parts=[
        part(box((0.62, 0.06, 0.40), 0.012), "pe_cloth", (0.0, 0.03, 0.0),
             name="LayerBottom"),
        part(box((0.58, 0.05, 0.36), 0.011), "pe_cloth", (0.015, 0.085, -0.01),
             rot=(0, 0.05, 0), name="LayerMiddle"),
        part(box((0.52, 0.05, 0.30), 0.010), "pe_cloth", (-0.02, 0.135, 0.02),
             rot=(0.02, -0.07, 0), name="LayerTop"),
    ])


# =============================================================================
# pillow — priority 2. Head-of-bed dressing for the same ward_bed, at the -Z
# (head) end. Reuses `ticking` (prop_defs.MATERIALS) rather than a new
# material — it is the same stained bedding stock the mattress is made of,
# and a pillow in a DIFFERENT fabric than its own mattress would read as a
# continuity error rather than a deliberate choice.
# =============================================================================
k.prop("pillow", "floor", (0.46, 0.12, 0.30), doc="""\
Thin, stained pillow, heavily beveled so it reads as filled fabric rather
than a slab. Two parts: a main body ROTATED 0.08rad off the bed axis (tossed
down, not squared up by a nurse), and a smaller, more heavily rotated "lump"
on one side — the bunched-up compression a pillow gets from a head resting
on it night after night. That lump is the single detail doing the most work
here: a perfectly symmetric pillow reads as unused stock, an asymmetric one
reads as slept on.

Pairs with `folded_blanket` at the opposite (+Z) end of the same bed; pass
the same mattress-top `y` for both.""",
    parts=[
        part(box((0.46, 0.08, 0.30), 0.035), "ticking", (0.0, 0.04, 0.0),
             rot=(0, 0.08, 0), name="Body"),
        part(box((0.28, 0.05, 0.20), 0.025), "ticking", (0.06, 0.095, -0.03),
             rot=(0, 0.13, 0), name="Lump"),
    ])


# =============================================================================
# taped_notes — priority 3. Small papers taped flat to a wall at slight
# angles, no frame, no cork board underneath — the single strongest "a
# person was here" signal in the brief. Deliberately the same "several sheets
# at different rotations and depths" vocabulary prop_defs.notice_board uses
# for its pinned sheets, with the board and frame removed: these are stuck
# directly to plaster, not organised on a fitting. mount_y 1.45 is roughly
# shoulder height — low enough to have been reached without a chair, which
# matters for what this prop implies about who put them there.
# =============================================================================
k.prop("taped_notes", "wall", (0.55, 0.46, 0.02), mount_y=1.45, doc="""\
A cluster of five small papers taped flat to the wall — torn notebook pages,
appointment slips, the kind of thing that accumulates when someone keeps
adding to a wall rather than starting a new sheet. NO FRAME, NO BACKING: the
part positions sit almost flush with the wall face (z between -0.006 and
-0.007, the thinnest gap the bevel keys will tolerate) so nothing reads as
mounted hardware — only the paper itself.

EVERY SHEET IS A DIFFERENT SIZE AND A DIFFERENT ROTATION (roughly
-0.11..0.09rad), which matters more here than anywhere else in the kit:
this prop has no frame or board to imply order, so the papers themselves
have to carry the "accumulated over time by hand" read entirely through
their scatter. A neat grid of identical rectangles would read as a printed
poster, not five different pieces of paper.

Cheapest high-value prop in this file — 5 parts, one material (`paper`,
already in prop_defs.MATERIALS), no new resource. A corridor or dormitory
can carry several clusters at different heights without any draw-call
concern.""",
    parts=[
        part(box((0.12, 0.16, 0.004), 0.001), "paper", (-0.16, 0.10, -0.006),
             rot=(0, 0, 0.09), name="SheetA"),
        part(box((0.10, 0.14, 0.004), 0.001), "paper", (0.01, 0.14, -0.007),
             rot=(0, 0, -0.06), name="SheetB"),
        part(box((0.14, 0.10, 0.004), 0.001), "paper", (0.15, 0.02, -0.006),
             rot=(0, 0, 0.05), name="SheetC"),
        part(box((0.09, 0.12, 0.004), 0.001), "paper", (-0.05, -0.10, -0.007),
             rot=(0, 0, -0.11), name="SheetD"),
        part(box((0.11, 0.15, 0.004), 0.001), "paper", (0.13, -0.14, -0.006),
             rot=(0, 0, 0.03), name="SheetE"),
    ])


# =============================================================================
# childs_drawing — priority 4. One crayon drawing taped up. mount_y 1.05 is
# deliberately LOWER than taped_notes/notice_board/wall_clock (all ~1.45-2.2)
# — roughly where a small child would tape something up, which is the entire
# unsettling point of this prop in a psychiatric ward and costs nothing extra
# to place correctly.
# =============================================================================
k.prop("childs_drawing", "wall", (0.24, 0.30, 0.02), mount_y=1.05, doc="""\
A single sheet, taped a couple of degrees off square (rot 0.04 — MORE
crooked than any one taped_notes sheet, deliberately: a child's hand is less
steady than an adult's), with a crude crayon mark on it. There is no texture
system in this kit to draw an actual picture with, so the drawing is built
from geometry instead: two long near-black bars crossing at odd angles
(reusing `chain`, the kit's near-black iron, rather than inventing a fourth
material for one dark scribble) plus two short marks in the new `pe_crayon`
red. Deliberately illegible as any specific subject — an abstract crossed
scrawl reads as "wrong for the hand that made it" without asking the geometry
to do figurative work it cannot at this poly budget, and the ambiguity is
scarier than a literal drawing would be anyway.

PLACEMENT NOTE: this prop is a payload, not wallpaper — one per room it
appears in, near a bed or in a corridor a player will pass close to. It is
not meant to be repeated the way taped_notes can be; a wall of these would
blunt the one instance that matters.""",
    parts=[
        part(box((0.20, 0.26, 0.005), 0.001), "paper", (0.0, 0.0, -0.006),
             rot=(0, 0, 0.04), name="Backing"),
        part(box((0.14, 0.020, 0.003), 0.001), "chain", (-0.02, 0.03, -0.007),
             rot=(0, 0, 0.60), name="MarkA"),
        part(box((0.12, 0.020, 0.003), 0.001), "chain", (0.01, 0.02, -0.0075),
             rot=(0, 0, -0.50), name="MarkB"),
        part(box((0.05, 0.05, 0.003), 0.001), "pe_crayon", (0.05, 0.09, -0.007),
             rot=(0, 0, 0.30), name="MarkC"),
        part(box((0.09, 0.015, 0.003), 0.001), "pe_crayon", (-0.04, -0.08, -0.0075),
             rot=(0, 0, -0.25), name="MarkD"),
    ])


# =============================================================================
# wall_calendar — priority 5. Hanging calendar, pages curled. mount_y 1.60,
# a hair above notice_board's 1.55 — calendars in real institutional
# corridors sit above the reach line, not at working height.
# =============================================================================
k.prop("wall_calendar", "wall", (0.28, 0.40, 0.05), mount_y=1.60, doc="""\
A rigid backing board (the new `pe_wood`, this file's one wood-toned
material) with a bound page stack, the top sheet flat and two lower sheets
curling forward off the wall.

CURL DIRECTION IS THE TRAP HERE. -Z is "away from the wall, into the room"
for a wall-mounted prop (see prop_defs.py's module docstring on the mount
rule), so a page curling naturally away from the wall pitches toward MORE
NEGATIVE z, never toward positive — the constraint every wall part obeys
(z <= 0) is exactly the direction real paper curl goes anyway. Both curled
pages are recessed to z=-0.02 before rotating specifically so the pitch
cannot push any vertex back past the wall face at z=0; do the same margin
check before copying this prop for a steeper curl.

BindingRod (`chain`, near-black) is a single horizontal cylinder along the
top edge standing in for a spiral/comb binding — the cheapest silhouette cue
that reads as "calendar" rather than "loose pages taped up" (which is what
taped_notes already covers) at this primitive budget.""",
    parts=[
        part(box((0.26, 0.38, 0.012), 0.004), "pe_wood", (0.0, 0.0, -0.006),
             name="Board"),
        part(cyl(0.006, 0.24, 8, 0.002), "chain", (0.0, 0.175, -0.012),
             rot=(0, 0, math.pi / 2), name="BindingRod"),
        part(box((0.24, 0.30, 0.006), 0.002), "paper", (0.0, -0.02, -0.014),
             name="PageTop"),
        part(box((0.22, 0.14, 0.005), 0.002), "paper", (0.01, -0.13, -0.02),
             rot=(-0.20, 0, 0), name="PageCurlA"),
        part(box((0.20, 0.10, 0.004), 0.002), "paper", (-0.02, -0.17, -0.02),
             rot=(-0.32, 0, 0.05), name="PageCurlB"),
    ])


# =============================================================================
# tin_mug — priority 6. Enamel mug for a bedside cabinet or counter surface.
# Mount is "floor" per the same rule as crt_monitor/folded_blanket — the room
# author passes the surface height as `y`. Reuses THREE base-kit materials
# (`enamel`, `steel`, `chain`) and adds none of its own: an enamel mug is
# exactly the kit's existing sink/window-sill material family, so a bespoke
# `pe_` material here would just be a recolour with no visual gain.
# =============================================================================
k.prop("tin_mug", "floor", (0.15, 0.11, 0.10), doc="""\
Small enamel mug, tapered body, on a dark iron foot ring with a steel rim
and a stub handle. The foot ring (`chain`) is the same "the object has feet"
grounding cue ward_bed's FootCaps and mop_bucket's castors use — a bare
tapered cylinder meeting a shelf with no transition reads as extruded
through it rather than standing on it.

HANDLE IS A SINGLE ANGLED STUB, not a closed loop — the kit's primitives
(box/cyl/tube/taper) have no torus, so a true ring handle is not buildable
without a bespoke primitive this file does not own. A stub canted outward at
-0.15rad reads as a handle silhouette at the distance this prop is normally
seen from (a bedside cabinet across a dormitory), which is the same
abstraction paper_tray's posts and binder_stack's spines already use
elsewhere in the kit — approximate the silhouette, not the object.""",
    parts=[
        part(cyl(0.030, 0.012, 10, 0.003), "chain", (0.0, 0.006, 0.0),
             name="FootRing"),
        part(taper(0.036, 0.042, 0.085), "enamel", (0.0, 0.0545, 0.0),
             name="Body"),
        part(tube(0.043, 0.037, 0.010, 12), "steel", (0.0, 0.102, 0.0),
             name="Rim"),
        part(box((0.014, 0.06, 0.014), 0.004), "steel", (0.052, 0.06, 0.0),
             rot=(0, 0, -0.15), name="Handle"),
    ])


# =============================================================================
# slippers — priority 7. A pair placed under a bed, slightly askew. ONE prop
# call places both — the same "one call, several related parts" pattern
# binder_stack (three binders) and iv_stand (five radial legs) already use,
# so a room author drops one `r.model("slippers", ...)` rather than placing
# two separate props that would need independent, error-prone positioning to
# look like a pair.
# =============================================================================
k.prop("slippers", "floor", (0.34, 0.09, 0.28), doc="""\
Left slipper sits close to square (rot 0.08rad — barely off, someone stepped
out of it normally); right slipper is turned hard, rot 0.55rad and offset
sideways — kicked off rather than placed, the pair reading as two different
GESTURES rather than one symmetric prop mirrored. That asymmetry between the
two is the entire point of "slightly askew" in the brief: a mirror-matched
pair would read as furniture, not as something a person just stepped out of.

Sole (`rubber`, reused from the castor/bumper-rail family — matte black,
does not catch a highlight) and upper (`pe_cloth`, this file's grey-olive
wool, the same felt-slipper family as folded_blanket) are separate parts per
foot, heavily beveled on the upper so it reads as a soft rounded toe box
rather than a shoebox. 4 parts total for the pair.""",
    parts=[
        part(box((0.10, 0.02, 0.23), 0.010), "rubber", (-0.085, 0.01, 0.0),
             rot=(0, 0.08, 0), name="SoleL"),
        part(box((0.095, 0.058, 0.14), 0.028), "pe_cloth", (-0.078, 0.048, -0.05),
             rot=(0, 0.08, 0), name="UpperL"),
        part(box((0.10, 0.02, 0.23), 0.010), "rubber", (0.095, 0.01, 0.035),
             rot=(0, 0.55, 0), name="SoleR"),
        part(box((0.095, 0.058, 0.14), 0.028), "pe_cloth", (0.075, 0.048, -0.01),
             rot=(0, 0.55, 0), name="UpperR"),
    ])


# =============================================================================
# open_book — priority 8. Left open on a surface (bedside cabinet, counter,
# waiting-area table). Mount "floor", surface height passed as `y`.
# =============================================================================
k.prop("open_book", "floor", (0.24, 0.035, 0.17), doc="""\
Open book, spine along X, both covers splayed outward and DIFFERENTLY —
0.12rad on the left, -0.17rad on the right — so the two halves are not a
mirrored pair. A book someone actually set down open never rests at a
perfectly symmetric angle; a matched pair of covers here would read as a
closed book propped up rather than one left open mid-read.

Covers reuse `chain` (near-black iron) rather than a bespoke leather
material — cheap and, at the scale this prop is seen, reads fine as a dark
buckram binding; see the module docstring's note on this being a deliberate
reuse rather than an oversight. Each cover carries a `paper` page on top,
same rotation as its cover, slightly inset — the light-on-dark contrast
between page and cover is what actually sells "open book" at a glance, more
than the covers' own angle does.

NO DIRECTIONAL FRONT. Unlike most of the kit, this prop has no meaningful
-Z "front" — it is read from above or at an angle regardless of which way
the spine faces, so `facing` on this one is cosmetic rather than load-
bearing. Worth stating explicitly since every OTHER prop in this file (and
the kit generally) treats -Z as significant.""",
    parts=[
        part(box((0.115, 0.010, 0.165), 0.006), "chain", (-0.060, 0.005, 0.0),
             rot=(0, 0.12, 0), name="CoverL"),
        part(box((0.100, 0.004, 0.150), 0.002), "paper", (-0.060, 0.0125, 0.0),
             rot=(0, 0.12, 0), name="PageL"),
        part(box((0.115, 0.010, 0.165), 0.006), "chain", (0.060, 0.005, 0.0),
             rot=(0, -0.17, 0), name="CoverR"),
        part(box((0.100, 0.004, 0.150), 0.002), "paper", (0.060, 0.0125, 0.0),
             rot=(0, -0.17, 0), name="PageR"),
    ])


# =============================================================================
# photo_frame — priority 9. Small standing frame for a surface (bedside
# cabinet, counter). Mount "floor", surface height passed as `y`. NO GLASS
# PART — see the module docstring: `glass_pale` is unshaded/emissive and
# reserved for windows/light fittings/the EXIT sign, so a photo frame cannot
# borrow it without breaking that rule, and at this prop's scale the missing
# pane is not a noticeable loss.
# =============================================================================
k.prop("photo_frame", "floor", (0.10, 0.13, 0.06), doc="""\
Small standing frame in `pe_wood`, the module's one wood-toned material —
built from the shared `frame()` primitive (four rails merged into one
surface), the same construction notice_board's cork surround uses at ten
times the scale. Frame and photo (a plain `paper` insert, same abstraction
notice_board's pinned sheets and wall_clock's face already use for
"printed/depicted surface") both carry a matching -0.10rad pitch, and a
single angled `chain` strut behind holds that lean — this is a frame caught
mid-topple, not a frame standing perfectly upright, which is a cheaper and
more specific "somebody's things are in disarray" signal than an upright
frame would be.

FRONT IS -Z, same as everywhere else in the kit — the photo faces the room
a player walks through, not the wall behind whatever surface it sits on.""",
    parts=[
        part(frame(0.085, 0.110, 0.013, 0.010, 0.003), "pe_wood", (0.0, 0.075, 0.0),
             rot=(-0.10, 0, 0), name="Frame"),
        part(box((0.065, 0.088, 0.004), 0.001), "paper", (0.0, 0.075, 0.006),
             rot=(-0.10, 0, 0), name="Photo"),
        part(box((0.010, 0.05, 0.008), 0.002), "chain", (0.0, 0.028, 0.030),
             rot=(0.55, 0, 0), name="Stand"),
    ])


# =============================================================================
# clothes_pile — priority 10. A heap of folded institutional clothing.
# Reuses `pe_cloth` AND `ticking` on alternating layers rather than adding a
# fourth fabric material — two different garments folded together (a smock
# and a blanket-weight item, say) plausibly ARE two different existing
# fabrics in this kit already, so alternating them costs nothing and reads
# as more than one item in the pile.
# =============================================================================
k.prop("clothes_pile", "floor", (0.44, 0.24, 0.34), doc="""\
Four folded layers, alternating pe_cloth/ticking, shrinking and rotating
MORE at each level going up (bottom square, then 0.09rad, -0.12rad, and the
top layer 0.22rad plus a small forward tilt) — neatly folded at the bottom,
increasingly careless toward the top, as though folding was abandoned partway
through rather than finished. That escalating disorder is the detail worth
keeping if this prop is ever extended or copied: a uniformly-rotated stack
reads as "generated", an escalating one reads as a task someone gave up on.

Larger and messier than `folded_blanket` (4 layers vs. 3, wider rotation
spread) — the two are meant to read as different scenarios: one bed made
with a single spare blanket, versus a heap of belongings dumped in a corner
or on a counter.""",
    parts=[
        part(box((0.40, 0.07, 0.32), 0.014), "pe_cloth", (0.0, 0.035, 0.0),
             name="LayerA"),
        part(box((0.34, 0.06, 0.26), 0.012), "ticking", (0.02, 0.10, -0.02),
             rot=(0, 0.09, 0), name="LayerB"),
        part(box((0.28, 0.055, 0.20), 0.011), "pe_cloth", (-0.03, 0.155, 0.03),
             rot=(0, -0.12, 0), name="LayerC"),
        part(box((0.16, 0.04, 0.14), 0.008), "ticking", (0.05, 0.205, -0.04),
             rot=(0.05, 0.22, 0), name="LayerD"),
    ])
