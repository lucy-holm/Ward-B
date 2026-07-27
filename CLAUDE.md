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

## Architecture questions — query the graph first

`graphify-out/graph.json` is a committed knowledge graph of the whole
repo (976 nodes / 1782 edges, tree-sitter AST — no LLM, no API key).
Query it BEFORE grepping when the question is structural: what calls
what, what breaks if I change X, where does a symbol live, which
module is the hub. It answers with `file:line`, so it points you at
the right file instead of you opening ten.

- `graphify query "how does a room get registered?"` — BFS traversal
- `graphify affected "GameCtx"` — reverse traversal: what a change hits
- `graphify explain "RoomBuilder"` — a node and its neighbours
- `graphify path "room17" "Orderly"` — how two things connect
- `graphify god-nodes` — the architectural hubs

Today's hubs: `GameCtx` (50 edges), `ColliderDef`, `Orderly`,
`RoomDef`/`RoomScript`, `RoomBuilder`. `GRAPH_REPORT.md` (same dir)
is the human-readable summary.

**The graph goes stale.** Its header records the commit it was built
from — compare against `git rev-parse HEAD`, and if they differ treat
`file:line` as approximate. Rerun `graphify update .` after room
changes (local, free, ~seconds) and commit the refreshed `graph.json`.
Needs the tool: `uv tool install graphifyy` (or `pipx`/`pip`). Without
it `graph.json` is still plain JSON you can read directly.

## Commands

- `npm run dev` — dev server; `/map.html?room=<id>` = top-down room viewer
  (geometry, patrols, sight envelopes; reloads on save)
- `npm run check:rooms` — headless room validator: imports every room
  (runs patrol-clearance validators), checks exit chain + all registries.
  Run after ANY room change. Never hand-roll a node harness for this.
- `npm run build` — tsc + vite; run before calling work done

## Hard rules

- **Pushing to main publishes the game publicly** (GitHub Pages
  auto-deploys). Never push unless Tom explicitly says to. Committing
  locally is fine — Tom never commits himself; the agent commits.
- Tom playtests in person; agent-side verification is `check:rooms` +
  `build` + the map viewer, not claims about game feel.
- Keypad rooms MUST wire the randomize-codes pattern (ROOM_AUTHORING.md §4,
  last item) or the start-screen toggle silently skips them.
- Room-file headers carry design intent + audits in comments — keep that
  convention when adding rooms; future sessions rely on them.
