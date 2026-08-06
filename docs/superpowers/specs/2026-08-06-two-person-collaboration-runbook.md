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

## ONE-TIME setup — DONE 2026-08-06

Recorded for reference / disaster recovery; you should not need to redo these.

1. ~~Push `deploy.yml`~~ — done; its first run created the `gh-pages` branch.
2. ~~Switch the Pages source~~ — done. Pages is now **"Deploy from a branch"**,
   Branch = **`gh-pages` / (root)** (it was previously "GitHub Actions", which
   replaces the whole site each deploy and so cannot host sibling previews).
   Set via `gh api -X PUT repos/lucy-holm/Ward-B/pages -f 'source[branch]=gh-pages'
   -f 'source[path]=/'`; the UI equivalent is Settings → Pages.
3. ~~Create `preview/tom` and `preview/edo`~~ — done, both pushed and deployed.
4. Still optional: protect `main` (Settings → Branches) to require a PR + at
   least one review before merge — that's the "combine best ideas" gate.

Note the repo's default workflow token permission is **read**; `deploy.yml`
declares `permissions: contents: write` at the workflow level, which
successfully overrides it. Don't "fix" the repo-wide setting on account of
this workflow — it doesn't need it.

## If a push doesn't deploy

`on: push` is the normal trigger, but GitHub drops webhooks during Actions
incidents (this bit us on 2026-08-06 — a `major_outage` throttled webhooks to
~15%, so pushes silently created no runs at all). The workflow also declares
`workflow_dispatch`, so you can always deploy any branch by hand:

```bash
gh workflow run deploy.yml --ref preview/edo   # or main, preview/tom
gh run list --workflow=deploy.yml --limit 3    # confirm it started
```

Before debugging config, check whether it's GitHub rather than you:

```bash
curl -s https://www.githubstatus.com/api/v2/components.json \
  | grep -A2 '"name": *"Actions"'
```

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
