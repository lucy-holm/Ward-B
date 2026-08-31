# press/ — itch.io store imagery

Recaptured 2026-08-31 from the **Godot build** (`godot/`), which is the only
maintained build and the one that ships publicly — see
`docs/superpowers/specs/2026-08-23-threejs-deprecation.md`. The set that
lived here before this pass was captured from the Three.js build (`src/`,
frozen 2026-08-23 and never shown to players again) with Playwright, and
every image in it showed a game players can no longer get: no posterise
pass, no prop kit, different lighting, an older HUD. That set has been
replaced wholesale, not touched up. Copy for the store page itself lives in
`docs/superpowers/specs/2026-07-26-itch-page-metadata.md`.

**These are real gameplay frames, not concept art.** That's deliberate —
see "On generated art" below.

## What's here

- `out/cover-titled.png` — **630×500, itch's exact cover requirement.**
  The room2 corridor (same frame choice as the previous cover) with the
  title set in the game's own typography (mono/typewriter, teal accent,
  red `B`). This is the recommended cover.
- `out/cover-plain.png` — same frame, same size, no title. Use if you'd
  rather itch's own title chrome do the work.
- `out/contact-sheet.png` — all 15 captures at a glance.
- `raw/*.png` — 1600×900 source frames, captured windowed at that
  resolution (no upscale). `hero-*` are captured with the HUD hidden (clean
  plates for compositing, see `hero-r2.png`/`hero-r7.png`/`hero-r13.png`);
  the rest keep the real HUD, exactly as a player sees it.
- `make_covers.py` / `make_contact_sheet.py` — the Python + Pillow scripts
  that built the two files above from `raw/`. Real, checked-in tools now,
  not throwaway — see "Regenerating" below.

## Recommended screenshot set (in this order)

1. **`r2-keypad`** — dark corridor, a lit ceiling panel, the readable
   `4118` scrawl, "they lock it from the inside", the staff door, a pill
   glowing on the floor. It teaches the core mechanic — *unmedicated means
   you can read the walls* — without a caption. Lead with it. This is the
   same room and the same beat as the old cover; the Godot version reads
   even better because of the posterise pass's dithered blacks.
2. **`r13-corridor`** — lucid state: bright, blown-out, hard one-point
   perspective, the "PILLS 0/1" meter counting down in the HUD. Put it
   second precisely because it looks like a different game to shot 1.
   That contrast IS the pitch — lead with dark-and-readable, follow with
   bright-and-blown-out, and the two-state mechanic sells itself before a
   caption does any work.
3. **`r7-records`** — lucid, warm floor light, a legible door and keypad,
   HUD meter visible. Shows a second space beyond corridors, still on the
   bright side of the contrast pair above.
4. **`r5-nurse`** — an orderly's silhouette lit from behind by a ceiling
   fixture, unmedicated. The clearest "there is a threat and it's
   patrolling" frame in the set; weaker than I'd like (the orderly reads
   small — this room is wide and dim throughout, see "what didn't work"
   below) but it's the only capture with a visible orderly that isn't
   fully swallowed by the dark.
5. **`r1-cell`** — the first room a player sees: spawn faces straight into
   the barred window, lit and readable, exactly as the room was designed
   ("Directly ahead at spawn... because the concept art composes every
   room around a barred window" — `tools/gen_rooms.py`'s room1 comments).
6. **`r20-crate`** — lucid, shows the actual pushable crate against a lit
   doorway. Establishes there's more than corridors-and-keypads without
   spoiling what the crate puzzle does.
7. **`r17-gallery-lucid`** and **`r17-gallery`** — the two-storey Gallery
   Ward, lucid (bright, legible) and unmedicated (scrawls readable on both
   side walls). Neither shows the stairwell/mezzanine verticality itself —
   see the harness limitation noted below — but the room reads as a real
   space rather than a corridor either way.
8. **`r10-wing`**, **`r12-floor`**, **`r15-sorting`**, **`r16-breaker`** —
   fill shots. Legible (each has a lit fixture and/or readable scrawl) but
   not standout; use if itch's 4-6 minimum needs padding or Tom wants more
   variety of space.

Shot 1 reveals room2's code (`4118`), same spoiler tradeoff as before:
minor, and moot if a player enables randomised codes.

## What changed from the Three.js set, concretely

- The posterise pass (`godot/ui/shaders/posterize.gdshader`) — an
  ordered-dither pass over the whole frame — is visible in every capture
  and is a real, deliberate visual signature the old screenshots never
  had. It reads especially well in the dark unmed frames (r2, r5, r1).
- Room 2's corridor (the cover shot) has a prop moved since the last
  capture pass; this set is current as of 2026-08-31.
- The HUD was substantially reworked the same day this pass was done; the
  PILLS-meter frames here (`r7-records`, `r13-corridor`, the lucid `r12`/
  `r15`/`r16`/`r20`/`r17` shots) show the current HUD, not the old one.
- No Three.js frame survives in this set. Every image was recaptured from
  scratch; none were touched up or reused.

## What we learned shooting this — worth acting on

Most rooms still photograph *badly* unmedicated, same finding as the
previous pass: `r10`, `r12`, `r15`, `r16`, `r20` are near-featureless dark
fields at their default spawn framing — geometry too far from any light
source, nothing in frame for scale. Forcing **lucid** turned every one of
these into a usable, legible frame (see `raw/r12-floor.png` etc. — all
captured lucid for exactly this reason), which is itself a finding: the
lucid mood's ambient/exposure bump (ambient 0.006→0.28, exposure
0.525→0.975) is doing real legibility work that the unmed mood doesn't
budget for in the larger rooms. Worth checking against the drop-off curve
once real players accumulate, same caveat as before — a room that's
illegible in a still is plausibly hard to *read* in motion.

The frames that work best have one of three things: a visible light source
with something lit near it, a bright lucid-state room, or a human
silhouette for scale. All three are represented in the recommended order
above.

**Harness limitation, not a game problem:** `tools/shoot_game.tscn`'s
reposition argument (added this pass) drives the real player's
`spawn_at(x, z, yaw, ...)`, which resets pitch to 0 — there's no way to
aim the camera up or down through this harness, only turn it. That means
a genuine "standing on the balcony looking down at the floor below" shot
for room17 isn't reachable without a further change to the harness (or to
`tools/shoot.tscn`'s hand-built camera, which has no player rig and no
`_main` wiring for orderlies). Flagging for whoever picks this up next
rather than hacking around it.

## On generated art (deliberately not used)

An image model could produce a far prettier cover than any of these. It
would also be a lie: players click a moody rendered corridor and get
untextured grey boxes with a posterise pass over them. On itch that earns
"not what was advertised" ratings, and the page copy is at pains to be
honest that this is a greybox prototype — the cover shouldn't undercut
that.

Generated art is defensible for things that clearly aren't gameplay: a
devlog banner, a logo/wordmark treatment. Not for the cover or
screenshots.

## Regenerating

Everything here comes from real Godot screenshot harnesses in
`godot/tools/`. Read each script's header comment before using it — they
document their own arguments and failure modes in detail. **Run windowed,
from `godot/`.** `--headless` skips rendering and writes a black image,
which is worse than no result because it looks like one.

```
cd "godot"

# The real game — main.tscn, the real player camera, the real
# WorldEnvironment. Use this for anything that's a verdict about how the
# game LOOKS.
godot --path . --resolution 1600x900 tools/shoot_game.tscn -- \
    <name> [seconds] [room_id] [lucid] [style_overrides] [nohud] [x,z,yaw[,level[,y]]]

# e.g. the room2 corridor lead shot, repositioned a few metres up the
# corridor from spawn so it sits nearer the ceiling lights and the scrawls:
godot --path . --resolution 1600x900 tools/shoot_game.tscn -- \
    r2-keypad 5.0 room2 "" "" "" "0,-3,0"

# a clean hero plate (HUD hidden) of the same framing, for cover compositing:
godot --path . --resolution 1600x900 tools/shoot_game.tscn -- \
    hero-r2 5.0 room2 "" "" nohud "0,-3,0"

# the lucid contrast shot:
godot --path . --resolution 1600x900 tools/shoot_game.tscn -- \
    r13-corridor 5.0 room13 lucid
```

Argument notes:
- `room_id` (arg 3) jumps straight to that room, granting shift + a full
  pill first (same as the in-game room-jump trick), so lucid/unmed shots
  are both reachable immediately without replaying from room1.
- `lucid` (arg 4) forces the medicated state and grants `can_shift`, so
  the HUD's pill row actually renders instead of looking broken.
- `nohud` (arg 6) hides `main.gd`'s `hud` CanvasLayer right before the
  frame is grabbed — added this pass specifically so hero/cover plates
  could use the real player rig instead of falling back to `shoot.tscn`'s
  hand-built camera.
- The reposition argument (arg 7, `x,z,yaw[,level[,y]]`, also added this
  pass) calls the real `player.spawn_at()` after the room's own spawn has
  already run and settled — use it when the room's default spawn framing
  doesn't show what you need. It cannot change pitch; see the harness
  limitation noted above.

```
# The start screen / config / pause panel:
godot --path . --resolution 1728x1080 tools/shoot_overlay.tscn -- \
    <name> [start|config|pause] [brightness] [hud_scale]

# A room in isolation with a camera you position explicitly — only for
# FRAMING (no player rig, no orderlies, mirrors main.tscn's environment
# by hand). Args: scene name camX camY camZ lookX lookY lookZ [ambient] [lucid]
godot --path . --resolution 1600x900 tools/shoot.tscn -- \
    res://rooms/room2/room2.tscn myshot 0 1.6 3 0 1.6 0
```

Then build the derived assets from whatever's in `raw/`:

```
cd ..   # repo root
python3 press/make_covers.py          # out/cover-titled.png, out/cover-plain.png
python3 press/make_contact_sheet.py   # out/contact-sheet.png
```

`make_covers.py` reads `raw/hero-r2.png` specifically; point it at a
different source frame by editing the `RAW` constant if the recommended
cover shot ever changes. Telemetry cannot fire from these capture runs —
it's gated to itch by an empty `godot/core/build_config.gd` plus a runtime
host check — so there's no `notrack` flag to remember here, unlike the old
Three.js capture flow.
