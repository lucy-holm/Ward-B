# Ward B visual audit — 2026-09-12

## Scope

This pass reviewed the Godot build under `godot/`, the generated prop kit, the
room generator, available capture images, and the seven supplied reference
plates. The target is a late institutional psychiatric ward: dirty bone/taupe
orderly uniform; peeling plaster, olive tile, worn lino and rusted iron; chipped
enamel sanitary fixtures; tall barred windows; and quiet waiting-room, corridor,
and dormitory silhouettes. The render language should stay PS1-era: low-poly
silhouettes, hard value steps, grain, restrained palette, and a readable
black-and-white option.

The Tailscale identity was confirmed during the companion deployment audit:
The Helios dashboard's Ward B entry reaches the Tailscale endpoint, Tailscale Serve routes
it to the local web server, and the running container mounts this checkout's
`godot/build`. The endpoint had a stale gzip export at audit time; use
`godot/tools/deploy_tailnet.sh` to regenerate and verify the private deployment
before relying on a new browser capture. This deployment was completed and
the HTTPS-served package hash now matches the local build; see the main audit. The
repository also confirms the Godot build: `project.godot` selects
`gl_compatibility` for desktop and mobile (`godot/project.godot:120-121`), and
`main.gd` registers Godot room scenes and resolves room 19's two variants
(`godot/main.gd:54-64`, `godot/main.gd:94-100`).

## Findings

### Style foundation

The ordered-dither pass fits the brief. It is a compatibility-safe screen pass,
defaults to eight luminance levels with 75% ordered dither, uses an 8x8 Bayer
pattern, and avoids
derivatives and dynamic array indexing
(`godot/ui/shaders/posterize.gdshader:4-25`, `godot/ui/shaders/posterize.gdshader:31-50`). The grain is a
texture-free canvas shader with one cheap hash per pixel
(`godot/ui/shaders/grain.gdshader:1-30`). Available captures such as
`godot/.artifacts/r16-breaker-lucid.png` and
`godot/.artifacts/r17-gallery-lucid.png` show the intended chunky raster
pattern over the 3D geometry.

The player-facing black-and-white setting is correctly separate from the
duotone/developer style control. The posterise pass preserves saturated ink
while desaturating neutral surfaces (`godot/ui/shaders/posterize.gdshader:183-194`),
and the settings copy explains why this protects red wall clues
(`godot/MIGRATION_NOTES.md:566-602`, `godot/ui/start_overlay.gd:77-85`). This
is the puzzle-safe interpretation of the requested switch: the ward can lose
colour without making the writing disappear.

The orderly is the strongest direct match to the character plate. Its authored
silhouette uses a small gaunt head, drooping neck, narrow shoulders, long arms
and legs, dirty bone uniform, grey skin, and no emissive eyes
(`godot/orderly/orderly_visual.gd:17-27`). Its body shader adds placed grime,
seams, suggested facial features, a matte response, and a faint edge rim rather
than turning the figure into a glowing light source
(`godot/orderly/orderly_body.gdshader:4-26`, `godot/orderly/orderly_body.gdshader:28-81`).

The environment kit has the right vocabulary and remains suitable for a
browser. It is declarative and shared, with 101 props, 458 unique meshes, and
about 33k triangles (`godot/PROP_KIT.md:24-57`). The concept-art tier contains
`barred_window`, `beam_seating`, `ward_bed`, `gurney`, `wall_speaker`, and
`sink`; its guidance prioritises windows for empty rooms, beam seating for
waiting areas, beds for dormitories, and skirting plus bumper rails at wall
seams (`godot/PROP_KIT.md:135-158`). Room materials use world-space triplanar
plaster, tile, and worn surfaces, avoiding UV scale drift on box architecture
(`godot/MIGRATION_NOTES.md:105-112`).

The main limitation is deliberate: Compatibility has no volumetric fog, so the
PS1 read comes from depth fog, glow, atmosphere changes, screen quantisation,
and grain (`godot/MIGRATION_NOTES.md:304-308`). The project targets the
Compatibility/WebGL2 renderer on desktop and mobile
(`godot/project.godot:120-121`). Performance and package size should be taken
from the current exported build and the corrected admitted-player probe;
older export-size and paused-session measurements are not acceptance evidence.

### Dressing coverage

Early and middle rooms already have recognisable silhouettes: room 1 has a bed,
window, radiator and sink; rooms 3–5 establish waiting-room seating, windows,
radiators, cabinets, and nurse-station furniture; rooms 8, 10, and 12 carry the
dormitory language with repeated beds, curtains, windows, and call details; and
room 20 has a clear loading-bay/prop-cover identity. Room 13 is intentionally
sparse because its closing slabs are the hazard.

The late sequence was uneven. Rooms 16, 18, and both room 19 variants each had
only roughly five or six small debris/cable/stain models before this pass. Their
large walls therefore read as untextured in the room viewer even though the
geometry and mechanics were sound. Room 17 is similarly restrained, but its
stacked gallery and ramp are the authored verticality beat; it should be
expanded only after an upper-level sightline review.

## Changes made

Room dressing was authored in `godot/tools/gen_rooms.py` and regenerated into
the four scene outputs. This sub-pass changed no room code, materials,
colliders, patrol routes, interactables, or gameplay state; the companion
polish pass owns the shared material and export changes.

| Room | Added perimeter details | Placement intent |
| --- | --- | --- |
| 16 — Breaker Bay | `barred_window` on the south cap; `wall_vent` on the east wall; high west-wall `pipe_run` (`godot/tools/gen_rooms.py:5666-5671`) | Fills the bay outside both deep clue nooks and the breaker. |
| 18 — Relay Room | `barred_window` behind entry; east-wall `wall_vent`; west-wall `wall_speaker` (`godot/tools/gen_rooms.py:5043-5049`) | Adds the institutional silhouette without touching console, dispenser, relays, or exit. |
| 19 — doors | west-wall `fire_alarm_point`; corridor east-wall `wall_vent` and `wall_speaker` (`godot/tools/gen_rooms.py:5154-5159`) | Keeps the short corridor floor-clear for its timing and sightline beat. |
| 19 — lights | east-wall `wall_vent`, west-wall `wall_speaker`, east-wall `barred_window` (`godot/tools/gen_rooms.py:5278-5283`) | Adds scale while leaving platform, rails, ramp mouth, and crossings open. |

The chosen kit props have no declared collider. Their coordinates were checked
against authored wall rectangles and interactive footprints. The room source
remains the single source of truth; generated `.tscn` files are build output as
required by `godot/PROP_KIT.md:38-50`.

## Visual inspection of the additions

Fresh captures were taken with the current Compatibility renderer and the HUD
hidden. The main-camera shots include the real game filter and respect saved render
preferences. Controlled eight-tone comparisons are recorded separately in
`audit-style-eight-lucid.png` and `audit-style-eight-unmed.png`. The doors-variant
direct scene shot is called out separately below:

- `godot/.artifacts/audit-room16-window.png` confirms that the barred window
  reads as a strong institutional anchor. `audit-room16-vent-pipe.png` shows
  the east vent clearly against the plaster; the high west pipe is subtle from
  this opposite-wall camera and should remain a background cue rather than a
  focal object.
- `godot/.artifacts/audit-room18-entry.png` confirms the entry window's bars,
  sill, and chipped surround. When looking back toward the entry from near spawn, it fills most of the
  frame; turning toward the relay hall exposes the other dressing. `audit-room18-vent.png` shows the vent as a small,
  readable dark fixture under the ceiling.
- `godot/.artifacts/audit-room19-lights.png` confirms the vent and barred-window
  language in the lit branch. The raised platform naturally occludes some
  lower-floor sightlines, so these details support the room's perimeter read
  rather than competing with the climb.
- `godot/.artifacts/audit-room19-doors-direct.png` was captured from the
  generated doors scene with the matching Compatibility lighting harness. It
  confirms the east-wall vent is mounted, visible, and outside the patrol lane.
  This direct scene shot does not include the main player's screen filter, so it
  verifies placement and silhouette only; judge final tone in the real web
  player after the deployment gzip is refreshed.

## Verification

Completed on Godot 4.7.1:

- `python3 tools/check_placement.py` — **21 rooms, 0 issues**.
- `tools/check_roundtrip.sh` — **202 resources checked; round-trip byte exact**;
  all 21 room/variant definitions regenerated successfully.
- `godot --headless --path . tools/check_rooms.tscn` — **21 concrete scenes,
  2 variant paths covered, all invariants hold** after the gameplay audit
  corrected the missing logical `room19.gd` lookup. Both variants now receive
  the general room/patrol checks as well as their dedicated behavioural suite.

## Bounded next recommendations

1. Keep the four-state readability contract: lucid stays clinical and stable;
   unmedicated carries sick green, flicker, fog breathing, and higher grain.
   Preserve the separate black-and-white control so red clues retain contrast.
2. Give room 17 one small upper-gallery dressing pass when it is visually
   reviewed: one barred window or wall speaker plus one ceiling defect would
   connect it to the rest of the ward. Keep props wall/ceiling mounted until
   the platform and orderly sightlines are checked; do not add furniture to the
   narrow stair or balcony.
3. Keep room 13's empty squeeze and room 19 doors' empty patrol lane as pacing
   choices. Their tension comes from moving slabs and exposure timing, so
   silhouettes belong at the perimeter.
4. For further environment passes, prefer one high-value silhouette per bare
   room (barred window, cast-iron radiator, beam seating, or ward bed), then
   cheap trim/debris. Avoid new full-screen effects, transparent fog volumes,
   or dense particle fields unless a mobile capture shows a specific need.
5. Preserve the established gameplay alternation of wall clues while
   unmedicated and machinery while lucid. Room16's light axis, room17's
   vertical route, room18's relay choice, room19's branch geometry, and room20's
   pushable crate already provide varied verbs. Any future threat should be
   telegraphed and room-local, then checked against the hard rule that
   unmedicated remains safe from world hazards while orderlies remain the
   threat; room13's closing slabs are the explicit lucid hazard and should not
   be generalized without a new design audit.
