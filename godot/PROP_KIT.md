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
bookkeeping. Today: **19 props, 131 parts, 78 unique meshes, 6.2k triangles for
the entire kit.**

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

### Colliders

`collider=None` (default) uses the prop's own declared footprint — a chair
blocks, a notice board does not. `collider=False` forces none. A tuple gives an
explicit rectangle. Colliders go through `Room.solid()`, so they land in
`Geometry` with every other collider rather than forming a second, parallel
collision system.

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

Each prop's `doc=` string in `prop_defs.py` records what it is *for* and any
trap in it, and is copied into the generated `.tscn` header.

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

### Two traps worth knowing

- **Front is −Z, and a chair's front is where a *sitter* faces** — not where
  its bulkiest part is. Both chairs shipped with the backrest at −Z first,
  which seated everyone facing away from the counter they were pulled up to.
- **Never let two coplanar panels share a plane.** `ceiling_troffer`'s recess
  and `troffer_lamp`'s panel z-fought into a flickering chequerboard the moment
  a light came on — invisible in a still, obvious as soon as the camera moved.

## Verification

```sh
tools/check_roundtrip.sh                                   # generators reproduce output
godot --headless --path . tools/check_rooms.tscn           # room invariants + patrol clearance
godot --headless --path . tools/test_mechanics.tscn        # behaviour
```
