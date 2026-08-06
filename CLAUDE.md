# Ward B

First-person psychological puzzle game (Vite + TypeScript + three.js,
grey-box). The player shifts (Q) between two realities: **UNMEDICATED**
(scrawls readable, orderlies visible) and **LUCID** (keypads readable,
orderlies invisible-but-patrolling, ~45s meter then auto-revert). Shifting
to lucid costs the player's one pill, refilled at wall dispensers.

## Skills — use these instead of spelunking room files

- **`designing-a-room`** — BEFORE deciding what a room contains: hard
  design laws (soft-lock audit, reaction time, dispenser pressure
  placement), beat catalog with one exemplar file per pattern, voice guide.
- **`adding-a-room`** — building/wiring/verifying any room change:
  kit workflow, the three registration points, randomize-codes wiring,
  verification commands.

**ROOM_AUTHORING.md** (repo root) is the full kit reference (§7 API,
§4 invariants checklist, §2 coordinates). Design docs live in
`docs/superpowers/specs/` (`YYYY-MM-DD-name-design.md`).

## Commands

- `npm run dev` — dev server; `/map.html?room=<id>` = top-down room viewer
  (geometry, patrols, sight envelopes; reloads on save)
- `npm run check:rooms` — headless room validator: imports every room
  (runs patrol-clearance validators), checks exit chain + all registries.
  Run after ANY room change. Never hand-roll a node harness for this.
- `npm run build` — tsc + vite; run before calling work done

## Collaboration — which branch you work on

Two authors share this repo: **Tom** (`preview/tom`) and **Edo**
(`preview/edo`). Full topology in
`docs/superpowers/specs/2026-08-06-two-person-collaboration-runbook.md`.

- **Do all work on the author's own `preview/<name>` branch — never commit
  to `main` or `release` directly.** If you find yourself on `main`/`release`,
  stop and switch to (or branch from it into) the correct `preview/*` branch
  first. Infer whose branch from the currently checked-out `preview/*` branch;
  if it's ambiguous, ask which author you're working for.
- Integrate via **Pull Request into `main`** so the other author reviews.
- `main` auto-deploys to `…/Ward-B/beta/` (merged staging); each `preview/*`
  to `…/Ward-B/previews/<name>/`; the Pages root is a static chooser
  (`hub/index.html`). None of this touches the public audience.

## Hard rules

- **`release` is the only branch that publishes to the public** (itch.io, with
  telemetry). `main` publishes the *staging* beta to GitHub Pages. Never push
  `main` or `release` unless the author explicitly says to. Committing locally
  on a `preview/*` branch is fine — the authors don't commit themselves; the
  agent commits.
- Tom playtests in person; agent-side verification is `check:rooms` +
  `build` + the map viewer, not claims about game feel.
- Keypad rooms MUST wire the randomize-codes pattern (ROOM_AUTHORING.md §4,
  last item) or the start-screen toggle silently skips them.
- Room-file headers carry design intent + audits in comments — keep that
  convention when adding rooms; future sessions rely on them.
