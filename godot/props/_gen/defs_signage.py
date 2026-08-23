"""Ward B prop kit — SIGNAGE. Props that carry readable text.

WHY THIS FILE EXISTS. The concept-art plates are full of institutional
signage — a "MEDICATION" header over the dispensing cabinet, a small enamel
"PLEASE TAKE ONLY AS PRESCRIBED" notice, a "WARD B" directional plate with an
arrow, framed procedure sheets, door plates — and it is a large part of what
makes the reference read as a real psychiatric hospital rather than a
generic dark corridor. `props/_gen/prop_defs.py` is mesh-only: `gen_props.py`
emits nothing but `MeshInstance3D` + a material override, so there was no way
for a prop to carry text at all. That gap is what this file closes.

THE TEXT MECHANISM, AND WHY IT IS Label3D, NOT A BAKED TEXTURE. Two precedents
already exist in this codebase for on-object text:

  1. `Room.scrawl()` in tools/gen_rooms.py emits a `Label3D` child per wall
     scrawl — dozens of them, shipped, working, cheap.
  2. `fixtures/dispenser.tscn` ALREADY has a "MEDICATION" `Label3D` on its
     faceplate (font res://fonts/SpecialElite-Regular.ttf, which
     fonts/README.md documents as reserved for exactly this: "institutional
     signage (door plates, MEDICATION, STAFF ACCESS) — distressed
     typewriter, reads as ward paperwork"). fixtures/door.tscn,
     fixtures/keypad.tscn and fixtures/breaker.tscn all do the same.

`fixtures/icon_panel.gd` was the OTHER precedent worth weighing — a script
that bakes its own `ImageTexture` at runtime — and it was rejected for this
job. IconPanel bakes SHAPE GLYPHS (`ShapeGlyphs.bake_icon_image`), which is a
small fixed vocabulary of icons; there is no equivalent glyph-rasteriser for
arbitrary prose in this project, so reusing that approach for "PLEASE TAKE
ONLY AS PRESCRIBED" or a dense procedure sheet would mean writing an in-engine
text layout/rasteriser from scratch (line wrap, kerning, a bitmap font) —
i.e. reimplementing, worse, what `Label3D` + a `FontFile` already does for
free. It would also cost a `SubViewport`-or-hand-rolled-rasteriser render at
`_ready()` per instance for an effect that buys, at best, one fewer draw call
per sign — and the game already ships DOZENS of Label3D scrawls per room with
no measured perf complaint anywhere in MIGRATION_NOTES.md. Label3D wins on
every axis that matters here: it is the established idiom, it is free
(engine-native text shaping), and — the deciding factor — its `text` field is
a PLAIN EXPORTED PROPERTY, which is exactly the shape "per-instance, not
baked into the prop" needs. See the bottom of this file for exactly what
`Room.model()` needs to grow to make that override reachable from a room.

HOW A Label3D CHILD GETS INTO A MESH-ONLY PIPELINE. `prop_defs.py`'s `part()`
requires a registered `mesh` + `mat` pair — correct for the geometry kit, but
a `Label3D` has neither. Rather than touch `prop_defs.py` (owned by another
agent, off limits) or bend `part()`'s contract, this file's `label()` helper
below builds a PLAIN DICT the same shape `k.PROPS[name]["parts"]` already
expects to hold, tagged `"type": "label"` instead of carrying `"mesh"`/`"mat"`
keys. `gen_props.py` — which this task owns exclusively — was extended to
special-case that tag: `emit_prop()` now checks each part for `"type" ==
"label"` and emits a `Label3D` node instead of a `MeshInstance3D` when it
sees one. Every existing mesh-only prop is untouched: a part with no `"type"`
key takes the exact code path it always did.

DEFAULT TEXT IS BAKED IN, DELIBERATELY, FOR NOW. The brief is explicit that
one reusable prop parametrised by text beats eight hardcoded signs, but
`Room.model()` (tools/gen_rooms.py, off limits to this file) has no channel
today for a per-instance property to reach a child node inside an instanced
PackedScene — see the block at the very end of this file for the exact patch
an orchestrator needs to add. Until that lands, every sign below ships with a
sensible, thematically-correct DEFAULT string baked in at generation time, so
`r.model("ward_sign", (x, z), facing="pz")` already looks correct with zero
extra authoring. The Label3D node itself is a completely ordinary exported
`text` property underneath that default — nothing about the mechanism is
baked, only today's convenience value is.

WHY MOST SIGNS ARE NOT UNSHADED, AND ONE IS. Label3D's OWN default rendering
is unshaded (full brightness regardless of scene light) — that is what
Room.scrawl() relies on to keep a scrawl legible in the pitch-black UNMEDICATED
state, and what fixtures/dispenser.tscn's "MEDICATION" label already does with
no `shaded` override. That is inherited here unmodified and is NOT the same
thing as giving a sign's PLATE a glowing material: every plate/frame mesh
below uses an ordinary lit `StandardMaterial3D` (enamel, steel, chain — all
already registered in prop_defs.MATERIALS) that dims with the room exactly
like the wall behind it. Only `exit_sign`'s backlight panel
(`sg_exit_glow_mat.tres`) is a genuinely emissive MESH material, because it is
the one sign in this set that is actually, diegetically, always-on
institutional lighting — see that material's own header for the reasoning
against giving every sign the same treatment.

MATERIALS. `enamel` (cream plate), `steel` (pale brushed frame/screws),
`chain` (dark worn metal — frames, chevrons, hinges) and `paper` (procedure
sheet backing) are all already registered in prop_defs.MATERIALS; nothing new
is needed for them. The one NEW material is `sg_exit_glow`, prefixed per this
task's file-ownership rule.
"""

import math

import prop_defs as k

k.material("sg_exit_glow", "res://props/sg_exit_glow_mat.tres")


# --- text helper ---------------------------------------------------------
def label(text, pos, rot=(0.0, 0.0, 0.0), font_size=34, outline_size=4,
          pixel_size=0.0012, color=(0.09, 0.10, 0.09), outline=(0.83, 0.87, 0.83),
          h_align=1, v_align=1, name="Label"):
    """One Label3D child. NOT a `k.part()` — see the module docstring for why
    this is a bare dict rather than something routed through prop_defs.py's
    mesh/material validation.

    Defaults (font_size 34, outline_size 4, pixel_size 0.0012, dark-on-pale
    colouring) are lifted directly from fixtures/dispenser.tscn's shipped
    "MEDICATION" label, which is the closest thing this project has to a
    house style for institutional signage text — reuse it rather than
    inventing a second convention. `h_align`/`v_align` default to CENTER (1)
    for the same reason: every sign here is a small centred plate, not a
    left-reading paragraph.
    """
    return {"type": "label", "text": text, "pos": tuple(pos), "rot": tuple(rot),
            "font_size": font_size, "outline_size": outline_size,
            "pixel_size": pixel_size, "color": tuple(color), "outline": tuple(outline),
            "h_align": h_align, "v_align": v_align, "name": name}


# =============================================================================
# ward_sign — "WARD B ←", directional. Text + a chevron arrow, no shaft: a
# plain "<" reads as an arrowhead on its own at sign scale and the kit has no
# triangle primitive (deliberately — see prop_defs.py's module docstring on
# composing from box/cyl/tube/taper/frame/slats only), so the arrowhead is two
# `box()` bars meeting at a point, mitred to point left.
#
# SCREEN-MIRRORING TRAP, worth spelling out because it produced a shipped-
# looking ">" pointing the wrong way on the first pass. A -Z-facing wall prop
# is read by a player standing in the room, i.e. on the -Z side looking
# toward +Z — and under that viewing direction LOCAL +X renders on the
# VIEWER'S LEFT, not their right. fixtures/dispenser.tscn's own header
# documents the exact same fact for its Label ("the cross at local x=-0.15
# renders on the viewer's RIGHT"). So both this prop's layout and the
# chevron's own "which end is the point" logic have to be authored against
# that mirrored mapping, confirmed by screenshot rather than assumed:
#   - "WARD B" sits at POSITIVE local x (renders on the viewer's LEFT).
#   - The chevron sits at NEGATIVE local x (viewer's RIGHT) — glyph after
#     text, matching "WARD B <-"'s left-to-right reading order.
#   - Within the chevron, the vertex is the MOST POSITIVE-x end (closest to
#     the text, viewer's left) and the two bars open toward more negative x
#     (viewer's right) — that is what actually reads as a LEFT-pointing "<"
#     once mounted and viewed correctly, not the naive "vertex at -X" a
#     glance at the primitive's own local axes would suggest.
# =============================================================================
_ARROW_LEN = 0.095
_ARROW_ANGLE = 0.6
_ARROW_APEX_X = -0.02


def _chevron(apex_x, y, z, mat, length=_ARROW_LEN, angle=_ARROW_ANGLE, thick=(0.016, 0.006)):
    """Two mitred bars forming '<' AS SEEN BY THE PLAYER — see the screen-
    mirroring comment above. The vertex sits at `apex_x` (the MOST POSITIVE
    end of the shape); the bars open toward decreasing x."""
    bar = k.box((length, thick[0], thick[1]), 0.003)
    cx = apex_x - (length / 2.0) * math.cos(angle)
    theta = math.pi - angle
    return [
        k.part(bar, mat, (cx, y + (length / 2.0) * math.sin(angle), z),
              rot=(0, 0, theta), name="ArrowUp"),
        k.part(bar, mat, (cx, y - (length / 2.0) * math.sin(angle), z),
              rot=(0, 0, -theta), name="ArrowDown"),
    ]


k.prop("ward_sign", "wall", (0.46, 0.16, 0.03), mount_y=2.05, doc="""\
Directional plate — "WARD B" plus a chevron arrow, framed. The corridor-
junction sign every ward needs at least one of, per the concept art's
"WARD B <-" plate.

DEFAULT TEXT IS "WARD B", BAKED IN — see the module docstring's section on
per-instance text for what tools/gen_rooms.py's Room.model() needs to grow to
make this (and every other sign here) settable per placement. Until then this
is still useful as-is: a room can place several and lean on facing/position
to distinguish them, the way the kit's other un-parametrised props (a chair,
a radiator) already work.

DEPTH BUDGET, spelled out because it bit once already: the frame is the
DEEPEST part (0.024, spanning z 0..-0.024) and the plate sits RECESSED inside
it (0.014, spanning 0..-0.014) — same relationship prop_defs.py's
notice_board uses between its Frame and Cork. A part proud of the PLATE only
has to clear the plate's own front face (-0.014); it does not need to clear
the frame's outer lip. The label and the arrow are both at z=-0.018, 4mm
proud of the plate — the first version of this prop put the label at -0.021,
which is INSIDE the 0.014-deep plate (front face -0.014, back face 0), not
proud of it, and the plate's own opaque surface occluded it completely: the
prop looked correct in the .tscn diff and rendered with a blank plate. Look
at a new sign's DEPTH NUMBERS on paper before trusting a screenshot; this one
"looked right" until it was actually shot up close.""",
     parts=[
         k.part(k.frame(0.46, 0.16, 0.020, 0.024), "chain", (0, 0, -0.012), name="Frame"),
         k.part(k.box((0.42, 0.13, 0.014), 0.004), "enamel", (0, 0, -0.007), name="Plate"),
         label("WARD B", (0.105, 0, -0.018), font_size=30, outline_size=3,
              pixel_size=0.00105, name="Text"),
     ] + _chevron(_ARROW_APEX_X, 0.0, -0.018, "chain"))


# =============================================================================
# door_plate — small plate beside a door. Real door plates are just a plate +
# four countersunk screws; no separate frame piece the way the enamel/glazed
# signs get one; the screws ARE the detailing that keeps a bare rectangle from
# reading as wall panelling (the same lesson fixtures/dispenser.tscn's header
# names for its own faceplate).
# =============================================================================
prop_screw = k.cyl(0.004, 0.008, 8, 0.001)

k.prop("door_plate", "wall", (0.20, 0.075, 0.02), mount_y=1.50, doc="""\
Small screwed door plate — "STAFF ONLY" by default (bake-in noted above;
any short single line works at this scale). Deliberately no separate frame:
a real door plate is a bare engraved/painted metal rectangle, and the four
corner screws are what stops it reading as a stray offcut of wall panel
rather than an installed fixture.""",
     parts=[
         k.part(k.box((0.18, 0.065, 0.012), 0.003), "steel", (0, 0, -0.006), name="Plate"),
         k.part(prop_screw, "chain", (-0.075, 0.023, -0.015), name="ScrewTL"),
         k.part(prop_screw, "chain", (0.075, 0.023, -0.015), name="ScrewTR"),
         k.part(prop_screw, "chain", (-0.075, -0.023, -0.015), name="ScrewBL"),
         k.part(prop_screw, "chain", (0.075, -0.023, -0.015), name="ScrewBR"),
         label("STAFF ONLY", (0, 0, -0.016), font_size=18, outline_size=2,
              pixel_size=0.00085, color=(0.08, 0.08, 0.08), outline=(0.78, 0.78, 0.76),
              name="Text"),
     ])


# =============================================================================
# cabinet_header — "MEDICATION", the header plate the brief calls out sitting
# above a wall-mounted dispensing cabinet (fixtures/dispenser.tscn, canonical
# size 0.55W x 0.75H — this is sized to read as belonging above one, not to
# replace it: the dispenser's OWN faceplate already carries its own close-up
# "MEDICATION" label for when a player is stood at it; this is the plate read
# from across the room, same word, different purpose).
# =============================================================================
k.prop("cabinet_header", "wall", (0.50, 0.15, 0.03), mount_y=2.00, doc="""\
"MEDICATION" header plate, sized to sit above a dispenser cabinet
(fixtures/dispenser.tscn is 0.55m wide; mount_y 2.00 clears a dispenser
mounted at its usual y~1.45 with margin). Cream enamel in a dark frame, dark
text, pale outline — the same MEDICATION styling fixtures/dispenser.tscn
already ships on its own faceplate, at sign rather than fixture scale.""",
     parts=[
         k.part(k.frame(0.50, 0.15, 0.020, 0.024), "chain", (0, 0, -0.012), name="Frame"),
         k.part(k.box((0.46, 0.11, 0.014), 0.004), "enamel", (0, 0, -0.007), name="Plate"),
         label("MEDICATION", (0, 0, -0.018), font_size=30, outline_size=3,
              pixel_size=0.00125, name="Text"),
     ])


# =============================================================================
# reg_notice — framed procedure sheet: "several small glazed frames on
# corridor walls holding what look like typed procedure sheets: dense small
# text, unreadable at distance, clearly a page of rules." Two Label3D children
# rather than one, so the header line can run larger than the body — an
# all-one-size block of nine lines reads as a texture swatch, not a document.
# =============================================================================
_REG_BODY = ("1. REPORT TO STAFF ON ARRIVAL\n"
            "2. NO UNSUPERVISED CORRIDOR ACCESS\n"
            "3. MEDICATION TIMES ARE NOT NEGOTIABLE\n"
            "4. VISITING HOURS STRICTLY OBSERVED\n"
            "5. QUIET HOURS 21:00 – 07:00\n"
            "6. REPORT ANY INCIDENT IMMEDIATELY\n"
            "7. NO PERSONAL ITEMS IN COMMUNAL AREAS\n"
            "8. ALL DOORS REMAIN LOCKED AFTER CURFEW")

k.prop("reg_notice", "wall", (0.38, 0.48, 0.035), mount_y=1.60, doc="""\
Glazed frame holding a typed procedure sheet — corridor dressing, several per
ward per the concept art. Deliberately unreadable-at-distance: font_size 11
for the body is well below every other sign in this file, on purpose, so it
reads as "a dense page of rules" from across a room and only resolves into
actual words if a player walks up and reads it, the way reg_notice's real-
world reference photos do. No literal glass pane — see the module docstring:
a transparent surface in this engine has to be unshaded to look like glass
(props/glass_pale_mat.tres, barred_window's pane) and this file is already
keeping unshaded surfaces to the one prop that needs one.""",
     parts=[
         k.part(k.frame(0.38, 0.48, 0.022, 0.028), "chain", (0, 0, -0.014), name="Frame"),
         k.part(k.box((0.34, 0.44, 0.012), 0.003), "paper", (0, 0, -0.006), name="Sheet"),
         label("WARD REGULATIONS", (0, 0.185, -0.016), font_size=16, outline_size=2,
              pixel_size=0.00095, color=(0.10, 0.10, 0.09), outline=(0.85, 0.85, 0.82),
              name="Header"),
         # CENTERED, not left-aligned. A first pass used h_align=0 (LEFT) at
         # x=0 (the sheet's horizontal centre) expecting a left margin — but
         # Label3D's h_align anchors AT the node's own position and grows
         # from there, so "left aligned at x=0" actually grows the text
         # rightward from the CENTRE and runs every line off the right edge
         # of the sheet. Centering avoids needing a separate left-margin
         # anchor position at all, and looks identical at "unreadable at
         # distance" scale anyway.
         label(_REG_BODY, (0, -0.01, -0.016), font_size=11, outline_size=1,
              pixel_size=0.00080, color=(0.12, 0.12, 0.11), outline=(0.80, 0.80, 0.77),
              name="Body"),
     ])


# =============================================================================
# enamel_notice — "PLEASE TAKE ONLY AS PRESCRIBED", three centred lines on a
# small chipped enamel plate, screwed beside the dispenser per the concept
# art. The "chip" flecks are two small dark boxes let into the enamel corners
# — cheap, and it is the same trick binder_stack's lean and notice_board's
# off-square sheets use: one small manufactured asymmetry sells "this object
# has existed in the world and been knocked about," not a texture.
# =============================================================================
k.prop("enamel_notice", "wall", (0.22, 0.20, 0.025), mount_y=1.55, doc="""\
Small enamel wall notice — "PLEASE / TAKE ONLY AS / PRESCRIBED", three lines,
centred, chipped edges. Meant to hang directly beside cabinet_header /
a dispenser fixture, at a lower, closer-reading height (mount_y 1.55 vs the
header's 2.00).""",
     parts=[
         k.part(k.box((0.20, 0.18, 0.012), 0.004), "enamel", (0, 0, -0.006), name="Plate"),
         # Same z as the plate, deliberately — frame() is a HOLLOW border, so
         # it never overlaps the plate's own face in XY and there is no
         # coplanar z-fight to avoid (contrast the ward_sign/quiet_sign/
         # cabinet_header frames, which are genuinely deeper than their
         # recessed plate on purpose).
         k.part(k.frame(0.20, 0.18, 0.008, 0.012), "chain", (0, 0, -0.006), name="Rim"),
         # Two chip flecks — small, off-axis, opposite corners, proud of the
         # plate face. Not symmetric: symmetric damage reads as authored
         # decoration, not wear.
         k.part(k.box((0.018, 0.012, 0.006), 0.001), "chain", (-0.085, 0.078, -0.014),
               rot=(0, 0, 0.4), name="ChipA"),
         k.part(k.box((0.014, 0.010, 0.006), 0.001), "chain", (0.092, -0.082, -0.014),
               rot=(0, 0, -0.6), name="ChipB"),
         label("PLEASE\nTAKE ONLY AS\nPRESCRIBED", (0, 0, -0.016), font_size=14,
              outline_size=1, pixel_size=0.00090, name="Text"),
     ])


# =============================================================================
# quiet_sign — "QUIET PLEASE", portrait, waiting-area sign with a smeared
# handprint. The handprint is five small rotated boxes in props/red_mat.tres —
# the ward's one saturated colour (see prop_defs.py's fire_extinguisher doc:
# "the ward's only saturated red ... use it sparingly"). This is the second,
# deliberate use: a bloody handprint is exactly the kind of single warm object
# that colour discipline exists to make land hard when it finally shows up.
# =============================================================================
k.prop("quiet_sign", "wall", (0.30, 0.42, 0.03), mount_y=1.75, doc="""\
Framed "QUIET PLEASE" notice, portrait, for a waiting area — with a smeared
handprint dragged across the lower-right corner. The print is five short
`box()` smears fanned and rotated like dragged fingers plus a wider palm
smear, all props/red_mat.tres, deliberately NOT photoreal: at ward light
levels five dark-red rotated slivers over cream enamel reads unmistakably as
"something happened here" without needing a decal system this kit doesn't
have.""",
     parts=[
         k.part(k.frame(0.30, 0.42, 0.022, 0.026), "chain", (0, 0, -0.013), name="Frame"),
         k.part(k.box((0.26, 0.38, 0.014), 0.004), "enamel", (0, 0, -0.007), name="Plate"),
         label("QUIET\nPLEASE", (0, 0.10, -0.018), font_size=32, outline_size=3,
              pixel_size=0.00120, name="Text"),
         # Palm smear, dragged down toward the screen's LOWER-RIGHT. z=-0.017
         # is proud of the plate's own front face (-0.014) by 3mm — see
         # ward_sign's doc comment on why that margin is checked on paper,
         # not eyeballed. X SIGNS ARE NEGATIVE, deliberately: see ward_sign's
         # screen-mirroring comment — local +X renders on the VIEWER'S LEFT
         # for a -Z-facing wall prop, so "lower-right on screen" needs
         # NEGATIVE local x. A first pass used positive x here (reading the
         # doc's "lower-right" literally against local axes) and the print
         # rendered lower-LEFT.
         k.part(k.box((0.075, 0.10, 0.006), 0.008), "red", (-0.055, -0.135, -0.017),
               rot=(0, 0, -0.35), name="Palm"),
         # Four finger smears, fanned from the palm.
         k.part(k.box((0.055, 0.016, 0.005), 0.003), "red", (-0.005, -0.055, -0.017),
               rot=(0, 0, -0.55), name="FingerA"),
         k.part(k.box((0.065, 0.016, 0.005), 0.003), "red", (-0.035, -0.070, -0.017),
               rot=(0, 0, -0.40), name="FingerB"),
         k.part(k.box((0.070, 0.016, 0.005), 0.003), "red", (-0.070, -0.078, -0.017),
               rot=(0, 0, -0.22), name="FingerC"),
         k.part(k.box((0.060, 0.014, 0.005), 0.003), "red", (-0.100, -0.070, -0.017),
               rot=(0, 0, -0.05), name="FingerD"),
     ])


# =============================================================================
# exit_sign — illuminated EXIT/fire sign. Not in the concept art (which the
# brief notes), but every institution has one, and a small green-glowing box
# is a strong navigation aid in a game this dark. The ONE prop in this file
# with an emissive mesh material — see sg_exit_glow_mat.tres's header and the
# module docstring for why every other sign here is deliberately NOT this.
#
# Modelled on ceiling_troffer/troffer_lamp's housing+recessed-panel+bezel
# shape (prop_defs.py), because it is the kit's existing vocabulary for "a
# fitting with a lit panel in it" and reusing it means this reads as kin to
# the ceiling lights rather than a one-off.
# =============================================================================
k.prop("exit_sign", "wall", (0.34, 0.14, 0.05), mount_y=2.35, doc="""\
Wall-mounted illuminated EXIT sign — dark housing, a green backlit panel
(sg_exit_glow_mat.tres, the one unshaded material in this file), "EXIT" in
dark lettering over the glow. Mount high (2.35, matching wall_vent's height
band) so it reads above a doorway. ALWAYS lit — unlike ceiling_troffer's
`light="lit"` pairing, this is not meant to be gated off with the room
breaker; a real fire-exit sign stays on a separate always-live circuit, and
this prop has no dark counterpart because it deliberately never needs one.

Depth order, nearest-camera first: Bezel (-0.057) > Label (-0.052) > Panel
front (-0.047) > Housing front (-0.045). Every part proud of the one behind
it by design — see ward_sign's doc comment for what happens when that isn't
checked on paper.""",
     parts=[
         k.part(k.box((0.34, 0.14, 0.045), 0.005), "chain", (0, 0, -0.0225), name="Housing"),
         k.part(k.box((0.28, 0.095, 0.010), 0.002), "sg_exit_glow", (0, 0, -0.042),
               name="Panel"),
         k.part(k.frame(0.34, 0.14, 0.022, 0.018), "chain", (0, 0, -0.048), name="Bezel"),
         label("EXIT", (0, 0, -0.052), font_size=38, outline_size=2, pixel_size=0.00115,
              color=(0.04, 0.05, 0.04), outline=(0.05, 0.30, 0.10), name="Text"),
     ])


# =============================================================================
# WHAT tools/gen_rooms.py's Room.model() NEEDS TO GROW FOR PER-INSTANCE TEXT
#
# (Documented here rather than implemented — this file may not edit
# tools/gen_rooms.py. See the final report for the same note.)
#
# `Room.model()` instances a prop with ONE line:
#
#     [node name="<nm>" parent="<parent>" instance=ExtResource("<rid>")]
#     transform = ...
#
# Overriding a property of a NODE NESTED INSIDE an instanced PackedScene (the
# Label3D child, not the instance root) is a normal, editor-supported .tscn
# feature: emit a SECOND `[node ...]` block that names the existing child by
# its path and carries NO `type=`/`instance=` attribute — Godot matches it
# against the already-instanced scene and applies the properties as an
# override, exactly the way `interactable()`'s `model_props` already
# overrides exported vars on a freshly-scripted node (tools/gen_rooms.py
# lines ~1576-1581). For `ward_sign`'s "Text" label that looks like:
#
#     [node name="Text" parent="Props/<nm>"]
#     text = "WARD C →"
#
# i.e. `parent` is the instance's OWN node path (`Props/<nm>`, or
# `Props/<nm>_state/<nm>` etc. once state/light gating wraps it — see the
# existing nesting `model()` already builds), and `name` is the Label3D's
# node name inside the prop (`"Text"`, or `"Header"`/`"Body"` for
# `reg_notice`, which are documented per-prop above).
#
# The minimal patch: give `Room.model()` an optional `text=None` kwarg (a
# str, or a dict for multi-label props like reg_notice: {"Header": ...,
# "Body": ...}), stash it in the `self.models` tuple alongside the existing
# fields, and in the emitter's `if r.models:` loop (tools/gen_rooms.py
# ~1634-1659), after the existing `instance=ExtResource(...)` block, emit one
# override `[node ...]` block per key exactly as shown above. Every prop in
# this file ships a sensible default (see each `doc=` above), so `text=None`
# must stay the default and must emit nothing — the whole point is that a
# room author who doesn't care gets the baked default for free.
# =============================================================================
