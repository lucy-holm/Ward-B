# Two-person collaboration + per-branch previews (runbook)

Date: 2026-08-06

Ward B is worked on by two people: **Tom** and **Edo**. This documents the
branching model and the deploy pipeline that gives each author their own live
preview, a merged staging build, and a single deliberate publish path to
itch.io.

## Branch model

```
preview/tom  ─┐
               ├─► main (shared integration + merged beta) ──► release ──► itch.io
preview/edo  ─┘
```

- **`preview/<name>`** — each author's working branch (`preview/tom`,
  `preview/edo`). Every push builds a live preview at
  `https://lucy-holm.github.io/Ward-B/previews/<name>/`. Share that link to
  show WIP without touching anyone else's build.
- **`main`** — the SHARED "combine best ideas" branch. Merge into it via a
  **Pull Request** so you review each other's work first. Pushing to `main`
  publishes the merged *staging/playtest* build at
  `https://lucy-holm.github.io/Ward-B/beta/`. No telemetry on this build.
- **`release`** — the real-audience publish. `git checkout release &&
  git merge main && git push` ships the complete build to itch.io *with*
  telemetry. See `2026-07-26-itch-release-runbook.md`. `main` alone never
  touches itch — publishing is always a deliberate second step.

## The staging hub (chooser)

The Pages **site root** (`https://lucy-holm.github.io/Ward-B/`) is a static
"admissions" chooser — `hub/index.html` in the repo — with three doors:
**Merged Beta** (`./beta/`), **Tom** (`./previews/tom/`), **Edo**
(`./previews/edo/`).

The hub is published ONLY by `deploy.yml` (the Pages workflow), so it exists
on the public playtest site and **never** on the itch release. It is not part
of the game and never bundled by Vite (`npm run build` uses `index.html` as
its only input). So "chooser on staging, none in release" is purely a
deploy-config difference — there is no runtime flag in the game to keep in
sync. Edit the doors by editing `hub/index.html`.

Why `main` doubles as the integration branch (instead of a separate
`develop`): in this repo `main` was already the non-published playtest
target, so it already plays the "combine + playtest" role. Adding a third
long-lived branch would be ceremony for a two-person team.

## How previews work (one Pages site, many builds)

GitHub gives one Pages *site* per repo, but hosts unlimited builds as
sub-folders of it. `.github/workflows/deploy.yml` builds each branch and
writes it into its own folder on the `gh-pages` branch:

| Source              | Folder           | URL                        |
| ------------------- | ---------------- | -------------------------- |
| `hub/` (main only)  | root             | `/Ward-B/`                 |
| `main`              | `beta`           | `/Ward-B/beta/`            |
| `preview/tom`       | `previews/tom`   | `/Ward-B/previews/tom/`    |
| `preview/edo`       | `previews/edo`   | `/Ward-B/previews/edo/`    |

This needs **zero per-branch build config** because `vite.config.ts` sets
`base: './'` (relative asset paths) — one build runs from any URL depth.
`keep_files: true` in the workflow means each deploy overwrites only its own
folder, so builds never clobber each other.

## ONE-TIME setup (do these once, in order)

1. **Push the new `deploy.yml`.** Its first run creates the `gh-pages`
   branch. (Pages will 404 until step 2.)
2. **Switch the Pages source.** Repo Settings → Pages → Build and deployment
   → Source = **"Deploy from a branch"**, Branch = **`gh-pages` / (root)**.
   (It was previously "GitHub Actions"; sub-folder previews require the
   branch source.)
3. **Create the personal branches:** `git switch -c preview/tom` (and
   `preview/edo`), push each. Confirm the preview URLs load, then check the
   root hub links through to all three.
4. Optional but recommended: protect `main` (Settings → Branches) to require
   a PR + at least one review before merge — that's the "combine best ideas"
   gate.

## Housekeeping notes

- **Stale previews linger.** `keep_files: true` never deletes folders, so a
  deleted `preview/*` branch leaves its folder behind. Delete it by hand from
  the `gh-pages` branch when it's no longer wanted (or add a cleanup job
  later).
- **Root asset accumulation.** Because the root deploy also keeps files, old
  hashed bundles from `main` accumulate on `gh-pages`. Harmless; occasionally
  prune if the branch gets large.
- **Deploys serialize.** All deploys share one Actions concurrency group so
  concurrent pushes can't race on the `gh-pages` branch — a preview push
  queues behind a `main` deploy rather than cancelling it.

## Everyday flow

```
# work on your own branch, share the preview link freely
git switch preview/tom
# ...commit, push -> preview updates at /previews/tom/

# ready to combine: open a PR into main, review together, merge
# main updates the merged beta at /Ward-B/beta/ (reachable from the root hub)

# ready to ship the complete build to the real audience:
git switch release && git merge main && git push   # -> itch.io
```
