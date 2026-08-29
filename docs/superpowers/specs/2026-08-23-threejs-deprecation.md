# Deprecating the Three.js build

**Date:** 2026-08-23
**Status:** Adopted
**Supersedes:** the "two builds, Three.js ships" arrangement described in
`README.md`, `CLAUDE.md` and `AGENTS.md` up to this date.

## Decision

**The Godot build in `godot/` is Ward B.** The Three.js build in `src/` is
frozen: no new rooms, no new mechanics, no new art. It is kept in the repo as a
readable reference and as an emergency rollback, and for nothing else.

## Why now

The two-build arrangement existed for exactly one reason, stated in
`deploy-itch-godot.yml`'s header: the Godot port covered rooms 1–7 while the
Three.js game covered 1–20, so publishing Godot would have taken thirteen
working rooms away from players. That reason is gone — **the Godot port has all
20 rooms**, and the parity check in that workflow now passes on its own.

What tipped it from "could" to "should" is that the two builds have diverged in
kind, not just in completeness. The Godot build has:

- real per-fitting lighting with shadows, which the Three.js build never had;
- shader-driven surfaces (`materials/shaders/triplanar_*.gdshader`) instead of
  canvas-generated textures;
- a handcrafted prop kit (`godot/props/`, see `PROP_KIT.md`) with no Three.js
  equivalent;
- an art direction now being matched to concept art, which would have to be
  redone from scratch in the other build.

Maintaining that twice is not a cost anyone chose; it is one that accrued. Every
room change already had to be made in two places, in two languages, with two
verification paths — and `CLAUDE.md` needed a whole section warning agents which
engine they were editing, because getting it wrong produced changes that
compiled, passed review and affected nothing.

## What changed mechanically

| | Before | After |
|---|---|---|
| itch public channel (`html5`) | Three.js, auto-published on every push to `release` | Godot, via manual `deploy-itch-godot.yml` dispatch |
| `deploy-itch.yml` | `on: push: branches: [release]` | `workflow_dispatch` only — rollback path, not a pipeline |
| `deploy-itch-godot.yml` default channel | `html5-godot` (alongside, safe) | `html5` (the public playable build) |
| GitHub Pages | Three.js → `threejs/`, Godot → `beta/` | unchanged; `threejs/` is now an archive |

The two safety gates on the Godot workflow are **kept**, deliberately:

- `confirm` must be typed as exactly `ship godot`;
- the parity check still runs, and still refuses `html5` if Godot ever has
  fewer room directories than Three.js has room files.

Parity passes today, so the check is currently inert. It stays because it costs
nothing and it is the only automated thing standing between a bad merge and the
public build. Do not delete it on the grounds that it always passes.

## What was deliberately NOT done

**`src/` was not deleted.** Deprecating and deleting are different decisions and
only the first was asked for. The Three.js tree is 45 files and 736K; it costs
nothing to keep, and it remains the only reference for how several mechanics
originally behaved — `godot/MIGRATION_NOTES.md` cites `src/` line numbers
throughout to explain why the port deviates where it does. Deleting it would
turn those citations into dead references.

The npm toolchain (`package.json`, `vite.config.ts`, `scripts/check-rooms.mjs`)
is kept for the same reason: it is what makes `src/` runnable if anyone ever
needs to compare behaviour against the original.

If the archive is later judged not worth keeping, delete it as its own change,
and fix `MIGRATION_NOTES.md`'s citations in the same commit.

## Consequences for anyone working here

- Room and art work happens in `godot/`. Full stop.
- `npm run dev` / `npm run build` / `npm run check:rooms` operate on the ARCHIVE.
  Running them is not a verification of anything that ships.
- The verification path that matters is
  `godot/tools/check_roundtrip.sh` + `godot/tools/run_tests.sh`.
- A PR touching `src/` should explain why. The default answer is that it
  shouldn't.
