# Ward B — current itch.io press kit

Updated 2026-09-12 for the survival-horror playtest. The maintained and public
game is `godot/`. The current marketing assets are in **`current/`**.

Store tags: `3d`, `atmospheric`, `browser`, `first-person`, `horror`,
`psychological-horror`, `puzzle`, `short`, `survival-horror`, `psx`.

## Publish these assets

- `current/cover.png` — 630×500 cover. The title and tagline are composed by
  Godot over an actual player-camera render of the observation ward.
- `store-description.md` and `store-description.html` — current page copy;
  the HTML version is ready for itch.io's rich-text/source editor.
- `release-notes.md` — the release announcement/devlog copy.
- `current/01-observation-ward.png` — furnished asylum recovery bays, lucid.
- `current/02-treatment-bays.png` — lower treatment beds beside the mezzanine.
- `current/03-shape-seal-mono.png` — upright shape puzzle in monochrome.
- `current/04-wall-bell-mono.png` — a high-contrast call-bell fixture.
- `current/05-gallery.png` — the gallery stair and floor change.
- `current/06-relay-choice.png` — the relay console and two power choices.
- `current/07-loading-bay.png` — the crate at the first loading-bay gate.
- `current/08-asylum-mono.png` — the same observation ward unmedicated.

Recommended screenshot order: 01, 03, 04, 02, 05, 08, 06, 07. The color and
monochrome examples show selectable display styles as well as different ward
states; medication and the display-style setting are separate controls.
Screenshots show real gameplay at 1600×900, including the HUD. They are not
concept art, reconstructed scenes or claims of a finished commercial game.

`raw/` and `out/` retain the August 31 captures and cover experiments for
history. They are superseded by `current/`; do not upload their obsolete
keypad views or use their older prototype framing for this release.

## Reproduce

From the repository root:

```sh
GODOT=/opt/homebrew/bin/godot press/capture-current.sh
```

The script uses `godot/tools/shoot_game.tscn`: the real `main.tscn`, player
camera, room scripts, lighting and post-processing. It runs windowed because
headless Godot cannot supply the framebuffer. Exact camera poses and display
mode overrides are recorded in the script; it does not edit saved settings.
The optional `cover` argument renders the title overlay in the engine.

Only the cover omits the HUD. There is no screenshot retouching or enlargement.
The local build's telemetry endpoint is empty, and captures use debug mode to
avoid changing milestone saves. Publishing the game itself uses the separate
`deploy-itch-godot.yml` workflow, which bakes in the public telemetry endpoint.
