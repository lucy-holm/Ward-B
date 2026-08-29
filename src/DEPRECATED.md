# `src/` is a frozen archive — the game is `godot/`

**Deprecated 2026-08-23.** This directory holds the original Three.js
implementation of Ward B. It is not maintained, it does not ship, and it should
not receive new rooms, mechanics or art.

Decision and reasoning:
[`docs/superpowers/specs/2026-08-23-threejs-deprecation.md`](../docs/superpowers/specs/2026-08-23-threejs-deprecation.md)

## Why it is still here

Two reasons, both concrete:

1. **`godot/MIGRATION_NOTES.md` cites this code by file and line** throughout,
   to explain why the port deviates from idiomatic Godot where it does — the
   axis-separated AABB movement, the ported quirks that look like bugs and are
   not. Deleting `src/` turns every one of those citations into a dead
   reference.
2. **Rollback.** `.github/workflows/deploy-itch.yml` can still push this build
   over the public itch channel if a Godot release goes badly wrong. That
   workflow no longer runs on a branch push — it is manual dispatch only.

## If you are here because something is broken

You are almost certainly in the wrong tree. Room, art and mechanic work all
happen in `godot/`:

- `godot/ROOM_AUTHORING_GODOT.md` — the guide, and the doc-set index
- `godot/PROP_KIT.md` — the handcrafted prop library
- `godot/tools/run_tests.sh` — the verification that matters

`npm run dev`, `npm run build` and `npm run check:rooms` still work. They
operate on this archive, and passing them is not evidence about anything that
ships.
