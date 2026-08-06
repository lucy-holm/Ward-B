# AGENTS.md — Ward B

Guidance for any AI coding agent (Claude Code, Codex, Cursor, etc.) working in
this repo. Claude Code users: `CLAUDE.md` is the primary file and covers the
same rules in more depth; this file mirrors the essentials for other agents.

Ward B is a first-person psychological puzzle game (Vite + TypeScript +
three.js, grey-box).

## Which branch you work on (read this first)

Two authors share this repo: **Tom** (`preview/tom`) and **Edo**
(`preview/edo`).

- **Do all work on the author's own `preview/<name>` branch.** If your user is
  Edo, that's `preview/edo`; if Tom, `preview/tom`.
- **Never commit to `main` or `release` directly.** If you're on `main` or
  `release`, switch to (or branch into) the correct `preview/*` branch before
  committing. If it's ambiguous whose branch you're on, ask.
- Integrate work by opening a **Pull Request into `main`**, so the other
  author can review before ideas combine.
- **Never push `main` or `release` without an explicit go-ahead.** `release`
  publishes the game to the public audience on itch.io.

## Deploy topology

| Branch          | Auto-deploys to                                      | Audience         |
| --------------- | ---------------------------------------------------- | ---------------- |
| `preview/tom`   | `…/Ward-B/previews/tom/`                              | Tom's WIP        |
| `preview/edo`   | `…/Ward-B/previews/edo/`                              | Edo's WIP        |
| `main`          | `…/Ward-B/beta/` (merged staging)                    | shared playtest  |
| `release`       | https://tommy-holmes.itch.io/ward-b (with telemetry) | real audience    |

The GitHub Pages site root (`…/Ward-B/`) is a static chooser (`hub/index.html`)
linking to all three staging builds. It never ships to itch.

Full details: `docs/superpowers/specs/2026-08-06-two-person-collaboration-runbook.md`.

## Verification (run after any room change)

- `npm run check:rooms` — headless validator (imports every room, checks exit
  chain + registries). Never hand-roll a node harness for this.
- `npm run build` — tsc + vite; run before calling work done.
- `npm run dev` then `/map.html?room=<id>` — top-down room viewer.

Agent-side verification is `check:rooms` + `build` + the map viewer — not
claims about game feel. The authors playtest in person.

## Other essentials

- Keypad rooms MUST wire the randomize-codes pattern (ROOM_AUTHORING.md §4,
  last item) or the start-screen toggle silently skips them.
- Room-file headers carry design intent + audits in comments — keep that
  convention when adding rooms.
- `ROOM_AUTHORING.md` (repo root) is the full kit reference. Design specs live
  in `docs/superpowers/specs/`.
