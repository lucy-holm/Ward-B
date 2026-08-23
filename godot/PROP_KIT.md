# Ward B — the prop kit (`props/`)

Handcrafted, reusable 3D set dressing: chairs, cabinets, radiators, ceiling
fittings, wall trim. One declaration file produces the baked meshes, the
prefab scenes and the room-authoring API, so adding a prop is a few lines and
placing one is a single call.

**The rooms are still built from boxes.** `tools/gen_rooms.py`'s `block()` /
`prop()` / `island()` presets define a room's *structure* — walls, colliders,
the shapes the player and the orderly move around. The prop kit hangs *detail*
on that structure. Keeping the two separate is deliberate: structure has to
stay cheap, collidable and byte-reproducible, and a decorative chair must never
quietly become the reason a room soft-locks.

## Why this exists

The `materials/shaders/` triplanar shaders already carry surface detail —
plaster mottle, floor grout, ceiling tile grid. What a room was still missing
is **silhouette**: objects with an outline, an edge that catches a highlight,
and a shadow that grounds them. `Room.light()` made the point sharply — it
emitted an `OmniLight3D` and a faked bounce and *no visible fitting at all*, so
every light in the ward was a glow with no lamp above it.

## The pipeline

```
props/_gen/prop_defs.py         <- THE SOURCE. Meshes + props, declared once.
    |                                   |
    | gen_props.py                      | gen_props.py
    v                                   v
props/_gen/mesh_specs.json      props/<name>.tscn      props/_gen/gallery.tscn
    |
    | gen_prop_meshes.gd (headless Godot)
    v
props/meshes/<key>.tres
```

Regenerate, **in this order**:

```sh
python3 props/_gen/gen_props.py
godot --headless --path . --script res://props/_gen/gen_prop_meshes.gd
python3 tools/gen_rooms.py          # only if a room's dressing changed
```

`props/*.tscn`, `props/meshes/*.tres` and `props/_gen/gallery.tscn` are **build
output**. Editing one in the Godot editor is silently reverted by the next
regenerate — the same contract `MIGRATION_NOTES.md` §1 states for room scenes.
`tools/check_roundtrip.sh` enforces it and covers the prop kit as well as
`rooms/`.

## Mesh sharing is the whole point

Primitive keys are derived from exact dimensions, so identical parts collapse
to one baked resource automatically. The office chair's castor and the mop
bucket's castors are the same `.tres`, referenced by the same uid, with no
bookkeeping. Today: **53 props, 229 unique meshes, 20.6k triangles for the entire kit.**

## Placing props from a room

| call | what it does |
| --- | --- |
| `r.model(kind, (x, z), ...)` | one prop |
| `r.prop_run(kind, axis, lo, hi, cross)` | repeat a 2m run prop along a wall |
| `r.light_fitting(x, z)` | `light()` + visible troffer + light-gated lamp |

```python
r.prop_run("skirting", "z", -6, 5, -6.88)     # 11m of skirting, one line
r.model("radiator", (-6.88, 2.6), facing="px")
r.model("filing_cabinet", (-2.3, -5.55), facing="pz")
r.model("crt_monitor", (-1.3, 1.05), y=1.1, facing="pz")   # on a counter
r.light_fitting(0, 3.5)
```

`y` **defaults by mount**, which is why none of the above computes a height:

| mount | origin | default `y` |
| --- | --- | --- |
| `floor` | on the floor, centred in XZ | `0.0` |
| `wall` | on the wall face, centred; grows toward −Z | the prop's `mount_y` |
| `ceiling` | on the ceiling plane; hangs downward | `self.ceiling_y` |

A wall face is `wall_at ± 0.12` (walls are 0.24 thick). `facing` takes a radian
yaw or a `FACING_ROT` compass name (`"nz"`, `"px"`, …); `prop_run()` infers it
from the nearest wall.

### Colliders — the prop owns its own

**A prop that declares a footprint carries its own `StaticBody3D`**, inside its
`.tscn`, on layer 2 (`world_static`). So it blocks the player *wherever it is
placed* — including dragged into a room by hand in the Godot editor.

That works because `core/collision.gd` rebuilds its cache by **walking the room
subtree** for `CollisionShape3D` nodes on a solid layer
(`WardCollision.rebuild_from`), so it finds prop colliders without the room
generator knowing they exist. It was not always so: colliders used to be emitted
only into the *room's* `Geometry` node, which made a hand-placed prop scenery the
player walked straight through.

`Room.model()` therefore does not emit a collider. It *overrides* the prop's,
by setting `collision_layer` on the prop's `Body` child:

| `Room.model(...)` | Effect |
| --- | --- |
| default | the prop's own body, solid in both states |
| `collider=False` | `Body.collision_layer = 0` — off |
| `state="lucid"` / `"unmed"` | layer 4 / 8 — state-gated, no second collider |
| `collider=(x0,x1,z0,z1)` | prop's body off, explicit rectangle via `Room.solid()` |

**A light-gated prop may not carry a collider**, and `model()` raises if you try
— darkness gates meshes and raycasts, never collision. Pass `collider=False`.

Proving a collider works is `tools/check_state_gates.tscn`, which probes the
real cache; a screenshot cannot show whether something blocks. Note it inflates
by the player's 0.35 m radius, so a point can read BLOCKED while sitting just
*outside* a box.

**Mind the orderly.** In a room with a patrol, a new collider changes what the
`NavigationAgent3D` routes around and what `check_rooms`'s patrol-clearance
validators see.

**A light-gated prop may not carry a collider**, and `model()` raises if you try
— the same soft-lock guarantee `Room.block()` spells out. Darkness gates meshes
and raycasts, never collision.

**Mind the orderly.** In a room with a patrol, a new collider changes what the
`NavigationAgent3D` routes around and what `check_rooms`'s patrol-clearance
validators see. Room 5 keeps every collider *outside* the lane
(x ∈ [−4.4, 4.4], z ∈ [−2.6, 2.6]); the one chair inside it is `collider=False`
and tucked against the island.

## The catalogue

Tier 1 — architectural trim, the highest-reuse items (every room has walls):
`skirting`, `bumper_rail`, `ceiling_troffer`, `troffer_lamp`, `wall_vent`,
`pipe_run`.

Tier 2 — furniture: `office_chair`, `stacking_chair`, `filing_cabinet`,
`crt_monitor`, `binder_stack`, `paper_tray`, `notice_board`, `wall_clock`.

Tier 3 — ward dressing: `radiator`, `fire_extinguisher`, `mop_bucket`,
`iv_stand`, `wall_shelf`.

Tier 4 — the concept-art pass: `barred_window`, `beam_seating`, `ward_bed`,
`gurney`, `pendant_lamp`, `pendant_bulb`, `wall_speaker`, `sink`.

### Which to reach for

- **A room that reads as empty** — `barred_window` first. Every environment
  plate in the concept art is composed around one, and it is the brightest
  surface in the game.
- **A corridor or waiting area** — `beam_seating` against the wall, not loose
  `stacking_chair`s. A beam is one long horizontal mass; loose chairs are
  clutter.
- **A dormitory** — `ward_bed`, repeated. The reference ward shot is nothing
  else.
- **Any wall at all** — `skirting` + `bumper_rail` via `prop_run()`. Two lines,
  and the bare floor/wall seam that reads as "untextured geometry" is gone.

Each prop's `doc=` string in `prop_defs.py` records what it is *for* and any
trap in it, and is copied into the generated `.tscn` header.

## Taking ownership of a prop (hand-editing)

`props/*.tscn` is build output, so editing one in the Godot editor used to be
silently undone by the next regenerate — and `check_roundtrip.sh` would then
fail, blaming you rather than explaining it.

To take a prop over, put a line containing **`HAND-EDITED`** in its header
comment. The generator stops writing that file, permanently, and the round-trip
guard skips it:

```
; HAND-EDITED — the generator no longer owns this file.
```

Its declaration in `prop_defs.py` stays — that is still what `Room.model()`
reads for size, mount and collider — but the *scene* is yours. To hand it back,
delete the marker and regenerate; the file is rebuilt from the declaration and
your edits are gone, which is what handing it back means.

**Copying** a prop to a new filename needs no marker and never has: the
generator only writes names it knows.

## Signs and text

Seven props carry a `Label3D` with a baked default. Override the words per
instance from the room:

```python
r.model("ward_sign", (x, z), facing="pz", text="WARD C →")
r.model("reg_notice", (x, z), text={"Header": "FIRE ROUTINE"})
```

A wrong label name **raises**. Godot silently accepts an override naming a child
that does not exist — it simply never applies — so without that check a typo'd
sign would ship reading its default and look deliberate.

## Adding a prop

1. Add a `prop(...)` block to `props/_gen/prop_defs.py`, built from the
   primitives `box` / `cyl` / `tube` / `taper` / `frame` / `slats`.
2. Regenerate and re-bake (see above).
3. **Look at it** — `props/_gen/gallery.tscn` picks up new props automatically:

   ```sh
   godot --path . tools/shoot.tscn -- res://props/_gen/gallery.tscn kit \
     0 1.35 -4.6 0 0.45 -1.1 2.2 lucid
   ```

   This is not optional. An inside-out mesh still rasterises its far inner wall
   and looks plausible in isolation, so the winding convention in
   `gen_prop_meshes.gd` can only be verified by eye.

### Matching the concept art

The kit was built before the art existed, and the art corrected four things.
They are worth knowing because the same mistakes are easy to repeat:

| Guess | What the art shows |
| --- | --- |
| Teal vinyl seating | **Tan/beige** moulded shells. The decayed plate reads them green-grey — that is the grade, not the albedo. Authoring the grade in would have double-counted it. |
| Flat panel radiators | **Green cast-iron column** rads. The column shadows are the whole silhouette. |
| Warm rust-brown iron | Cooler, **desaturated** — the first pass read as varnished wood next to cream ticking. |
| No windows at all | **Tall barred windows**, and they carry the composition. |

The shared `materials/` shaders (wall, floor, ceiling) were left alone: they
already sit close to the reference's cream plaster and olive lino, and every
room in the ward depends on their exact look.

### Three traps worth knowing

- **Front is −Z, and a chair's front is where a *sitter* faces** — not where
  its bulkiest part is. Both chairs shipped with the backrest at −Z first,
  which seated everyone facing away from the counter they were pulled up to.
- **Never let two coplanar panels share a plane.** `ceiling_troffer`'s recess
  and `troffer_lamp`'s panel z-fought into a flickering chequerboard the moment
  a light came on — invisible in a still, obvious as soon as the camera moved.
- **Check a new wall prop against what the room already has.** The first pass
  put a barred window straight through room 5's shipped `tv_panel`. Nothing
  validates prop-against-prop overlap; only looking catches it.

## Verification

```sh
python3 tools/check_resources.py                           # sub/ext resource refs resolve
tools/check_roundtrip.sh                                   # generators reproduce output (runs the above first)
godot --headless --path . tools/check_rooms.tscn           # room invariants + patrol clearance
godot --headless --path . tools/check_state_gates.tscn -- <scene> <x,z,expect>   # does it actually block?
tools/run_tests.sh                                         # all 14 suites
```

`check_resources.py` exists because a `.tres` that references a `sub_resource`
it does not declare still parses, still imports without complaint, and then
makes Godot **hang** rather than fail. That cost two people an hour each; it is
pure Python and runs in well under a second.
