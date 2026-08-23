# AGENTS.md — Ward B

Guidance for any AI coding agent (Claude Code, Codex, Cursor, etc.) working in
this repo. Claude Code users: `CLAUDE.md` is the primary file and covers the
same rules in more depth; this file mirrors the essentials for other agents.

Ward B is a first-person psychological puzzle game built in **Godot 4.7**.

**The game is `godot/`.** `src/` is a frozen Three.js archive — the original
implementation, kept for reference and rollback, not maintained and not shipped
(decision record:
`docs/superpowers/specs/2026-08-23-threejs-deprecation.md`). If you are editing
`src/`, stop and check you meant to.

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
| `main`          | `…/Ward-B/threejs/`                                  | Three.js | archive only    |
| *(none)*        | https://tommy-holmes.itch.io/ward-b (with telemetry) | Godot    | real audience   |

**The game is Godot.** `src/` was frozen on 2026-08-23
(`docs/superpowers/specs/2026-08-23-threejs-deprecation.md`); it is not
maintained and does not ship. `threejs/` stays published because
`godot/MIGRATION_NOTES.md` cites it to explain why the port deviates where it
does. A change under `src/rooms/` reaches that archive path and nothing else.

Publishing is a manual `deploy-itch-godot.yml` dispatch requiring
`confirm: "ship godot"`, still parity-checked before it will touch the public
`html5` channel. `deploy-itch.yml` (Three.js) had its `release`-push trigger
removed and is a ROLLBACK LEVER only — running it republishes the archive over
the live game.

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
