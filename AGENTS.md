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

| Branch          | Auto-deploys to                                      | Engine   | Audience        |
| --------------- | ---------------------------------------------------- | -------- | --------------- |
| `preview/tom`   | `…/Ward-B/previews/tom/`                              | Godot    | Tom's WIP       |
| `preview/edo`   | `…/Ward-B/previews/edo/`                              | Godot    | Edo's WIP       |
| `main`          | `…/Ward-B/beta/` (merged staging)                    | Godot    | shared playtest |
| `main`          | `…/Ward-B/threejs/`                                  | Three.js | shared playtest |
| `release`       | https://tommy-holmes.itch.io/ward-b (with telemetry) | Three.js | real audience   |

**Two engines live here, and which one is "the game" depends on where you
look.** Staging moved to the Godot port; itch.io still ships Three.js. That
split is about room coverage, not preference: Godot has rooms 1–7, Three.js
has 1–20 (`godot/MIGRATION_NOTES.md`). `threejs/` is therefore still the only
complete run and stays published for comparison until the port catches up.
A change under `src/rooms/` does **not** appear in the Godot build, and a
change under `godot/rooms/` does not appear on itch.

Publishing Godot to itch is a manual, gated dispatch
(`.github/workflows/deploy-itch-godot.yml`) that refuses the public `html5`
channel while rooms are missing. `deploy-itch.yml` is untouched.

The GitHub Pages site root (`…/Ward-B/`) is a static chooser (`hub/index.html`)
linking to every staging build. It never ships to itch.

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
