# Wall scrawl layout audit

The Godot room scenes carry wall writing as `Label3D` children below the
shared `Scrawls` state wrapper. The authored `size` value is a texture scale,
not a world measurement. Before the runtime pass, the 21 shipped room scene
variants rendered 75 scrawls between 0.8 m and 10.1 m wide; several two- and
three-line clues were 2.6–3.8 m high. Those envelopes let text run through a
wall return or into the ceiling even when the source position looked close to
the wall centre.

`WardScrawl` (`godot/core/scrawl.gd`) is the shared fix. `StateObject` invokes
it after the `Scrawls` wrapper's first rendered frame, so existing and newly
generated room scenes get the same layout without scene-by-scene edits. It
uniformly reduces `pixel_size` only when needed, preserving each clue's font,
roll, colour and depth behaviour. Ordinary writing is capped at 4.0 m × 1.5 m;
code writing is capped at 2.2 m × 1.25 m. The pass also derives the available
wall span from `Shell/Floor`, retaining a 0.16 m edge margin, and keeps the
text envelope below `Shell/Ceiling`. It leaves `no_depth_test` false.

`godot/tools/test_scrawl_layout.tscn` loads every room variant and measures
the actual post-normalization world AABB. It checks the width/height envelope,
floor footprint and floor-to-ceiling bounds. The existing windowed
`check_scrawl_visibility` audit remains the occlusion check. After the source
placements were corrected, windowed runs pass room8 (2/2), room11 (7/7),
room12 (8/8) and room18 (5/5). Room11's east-wall clues now use open spans at
z=14.5 and z=8.2, with the last Z3 clue moved to the clear east wall; room12's
Z1 and Z2 clues moved away from the barred window frames, while its Z4 clue is narrowed and
shifted north of `dispenser12b`; room18's dispenser-pocket clue is narrowed
and shifted north of the dispenser, and the `DOORS` stencil moved clear of the
north-cap doorway return. These source moves preserve every clue's text and
puzzle role. Real `shoot_game.tscn` captures of room1, room5 and room8 show
the normalized writing at the intended wall scale; room8's four-line clue
fits when viewed with a natural upward look.

Narrow wall spans retain explicit limits rather than allowing text to bleed
past a return. Room5's east-wall flavour clue fits about 1.1 m of available
width, and room4's comparable clue fits about 2.7 m. Room8's four-line order
uses an authored 1.35 m × 0.65 m band above the dispenser. The runtime
`main.update_scrawl_text` path schedules a fresh fit after each text change,
including labels nested below a phosphor/light child. Tests cover long →
short → long resizing, nested labels and a room removed before its deferred
fit (401 assertions over 21 room variants and 74 labels).
