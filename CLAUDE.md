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

## Godot port

`/godot/` holds a Godot 4.7 rebuild of **all 20 rooms**, side by side with the
Three.js build, which is untouched and remains what ships. Read
`godot/MIGRATION_NOTES.md` before touching it — it records three deliberate
deviations from idiomatic Godot (ported axis-separated AABB movement instead
of `move_and_slide`, `NavigationAgent3D` orderly movement, `gl_compatibility`
renderer) plus a catalogue of ported quirks that look like bugs and are not.

- `godot --headless --path godot tools/check_rooms.tscn` — wiring validator,
  the analogue of `check:rooms`. Run after ANY room change.
- `godot --headless --path godot tools/test_mechanics.tscn` — behavioural
  assertions (state-conditional geometry, geometry-trap guard, pill economy).
- **`tools/gen_rooms.py` is the source of truth for room layout — NOT the
  `.tscn`.** It is a declarative Python DSL and a full run reproduces all 21
  committed scenes byte-for-byte. Editing a `.tscn` in the editor is silently
  reverted on the next regenerate. Author rooms by editing the `roomN()`
  functions; see `godot/ROOM_AUTHORING_GODOT.md` for the `Room` kit API.
  (This bullet previously said the opposite. It was wrong — see the warning
  block in `godot/MIGRATION_NOTES.md` §1.)
- `godot/tools/check_roundtrip.sh` — asserts the generators still reproduce
  every committed room AND prop scene byte-for-byte. Run after ANY room or
  prop change.
- **Set dressing is `godot/props/`** — a handcrafted, reusable prop library
  (chairs, cabinets, radiators, ceiling fittings, wall trim), placed from a
  room with `r.model()` / `r.prop_run()` / `r.light_fitting()`. Like rooms,
  the `.tscn` files are build output of `props/_gen/prop_defs.py`. Read
  `godot/PROP_KIT.md` before adding or placing props. Room 5 is the worked
  example.

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
- **Those staging builds are the GODOT port, not Three.js.** `main` also
  publishes the Three.js build to `…/Ward-B/threejs/`, which is still the only
  build that ships publicly; the Godot port also has all 20 rooms now. Know
  which engine you are changing: edits under `src/` do not reach `beta/`, and
  edits under `godot/` do not reach itch.

## Hard rules

- **`release` is the only branch that publishes to the public** (itch.io, with
  telemetry), and it ships **Three.js**. The Godot build reaches itch only via
  a manual `deploy-itch-godot.yml` dispatch, which refuses the public `html5`
  channel while Godot has fewer rooms than Three.js — don't defeat that gate
  without the author saying so explicitly.
  `main` publishes the *staging* beta to GitHub Pages. Never push
  `main` or `release` unless the author explicitly says to. Committing locally
  on a `preview/*` branch is fine — the authors don't commit themselves; the
  agent commits.
- Tom playtests in person; agent-side verification is `check:rooms` +
  `build` + the map viewer, not claims about game feel.
- Keypad rooms MUST wire the randomize-codes pattern (ROOM_AUTHORING.md §4,
  last item) or the start-screen toggle silently skips them.
- Room-file headers carry design intent + audits in comments — keep that
  convention when adding rooms; future sessions rely on them.
