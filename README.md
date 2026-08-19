# WARD B

A first-person psychological puzzle game (Vite + TypeScript + three.js).
Core mechanic: shift (Q) between **LUCID** and **UNMEDICATED** reality —
lucid reads machinery but costs a pill and drains a medication meter; unmed
reads the walls but is visible to the orderlies.

- Play (public release): https://tommy-holmes.itch.io/ward-b
- Staging hub (all branch builds): https://lucy-holm.github.io/Ward-B/

**There are two builds of this game in this repo.** Get this right before you
edit anything, or you will change a file that has no effect on what you are
looking at:

| | Three.js build | Godot build |
|---|---|---|
| Source | `src/` | `godot/` |
| Rooms authored in | `src/rooms/roomN.ts` | `godot/tools/gen_rooms.py` |
| Ships to | itch.io (public, via `release`) | GitHub Pages staging + manual itch dispatch |
| Rooms | all 20 | all 20 |

Both have the full ward. The Three.js build is what currently ships publicly.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server at `http://localhost:5173` (game at `/`, map viewer at `/map.html`) |
| `npm run dev -- --host` | Same, but bound to all interfaces so other devices on the tailnet/LAN can open it |
| `npm run build` | Type-check + production bundle into `dist/` (the map viewer is **excluded** automatically) |
| `npm run preview` | Serve the built `dist/` locally to sanity-check it |
| `npm run check:rooms` | Headless room validator (Three.js). Run after ANY room change |

Godot build — all from inside `godot/`, with
`G=/Applications/Godot.app/Contents/MacOS/Godot`:

| Command | What it does |
|---|---|
| `python3 tools/gen_rooms.py` | Regenerate every room `.tscn` from the DSL |
| `python3 tools/map_server.py` | Top-down map viewer at `http://127.0.0.1:8912/`; add `--host 0.0.0.0` for the tailnet |
| `tools/check_roundtrip.sh` | Assert the generator still reproduces every committed scene byte-for-byte |
| `$G --headless --path . --import` | Register newly added `class_name` scripts. **Required** after adding one, or headless runs hang |
| `$G --headless --path . tools/check_rooms.tscn` | Wiring, spawn clearance, exit chain, patrol clearance. Run after ANY room change |
| `$G --headless --path . tools/test_kit.tscn` | The authoring kit's own suite |
| `$G --headless --path . tools/test_mechanics.tscn` | State geometry, trap guard, pill economy |
| `$G --headless --path . tools/check_state_gates.tscn -- <scene> <x,z,expect>` | Prove a state-gated collider actually blocks (a screenshot cannot) |
| `tools/run_tests.sh` | All Godot suites |

Run Godot tests as **scenes**, never `--script`: autoloads are not registered
for a custom SceneTree script, and every room depends on them.

## Authoring a level

A room is always **two artefacts**: its *layout* (pure data) and its
*behaviour* (a script). That split is the same in both engines; only the file
formats differ.

### Godot build

Layout lives in `godot/tools/gen_rooms.py` as a declarative Python DSL — one
`roomN()` function per room. Behaviour lives in `godot/rooms/roomN/roomN.gd`.

> ⚠️ **`gen_rooms.py` is the source of truth. The `.tscn` scene files are
> build output.** A full generator run reproduces all 21 committed scenes
> byte-for-byte. If you edit a room in the Godot editor, your change is
> silently reverted the next time anyone regenerates — no conflict, no
> warning. Edit the generator and regenerate.

```python
def room21():
    r = Room("room21", "the Dayroom",
             floor=(-6, 6, -8, 5), spawn=(0, 4, 0),
             exits=[("END", -1, 1, -7.9, -6.8)])
    r.wall_x(-6, 6, 5); r.wall_z(-6, 5, -6); r.wall_z(-6, 5, 6)
    r.island(-2.2, 2.2, -1.3, 1.3, core_width=1.8)   # nurse station
    r.interactable("dispenser21", "dispenser", ..., facing="px")
    r.scrawl("0 4 5 2", pos=(-3.5, 1.65, 4.88), rot_y=pi, size=2.6, sid="codeScrawl")
    r.ward_lights([(0, 3.5), (0, 0), (0, -3.5), (0, -7)])
    return r
```

```bash
cd godot
python3 tools/gen_rooms.py            # regenerate the scenes
python3 tools/map_server.py           # see it: http://127.0.0.1:8912/?room=room21
tools/check_roundtrip.sh              # scenes still match the generator
G=/Applications/Godot.app/Contents/MacOS/Godot
$G --headless --path . tools/check_rooms.tscn    # wiring, spawn, exits, patrol clearance
```

**Read these, in this order:**

| Doc | What it is |
|---|---|
| [`godot/TUTORIAL_NEW_ROOM.md`](godot/TUTORIAL_NEW_ROOM.md) | **Start here.** A room built from nothing to verified, every command and its real output |
| [`godot/ROOM_AUTHORING_GODOT.md`](godot/ROOM_AUTHORING_GODOT.md) | The guide: coordinates, collision/state contract, invariants checklist, registration, verification, map viewer |
| [`godot/KIT_REFERENCE.md`](godot/KIT_REFERENCE.md) | Exhaustive API reference for the `Room` layout DSL — every method, material and preset |
| [`godot/BEHAVIOUR_KIT.md`](godot/BEHAVIOUR_KIT.md) | Exhaustive API reference for `godot/kit/` — orderlies, keypad locks, availability wiring, design laws |
| [`godot/MIGRATION_NOTES.md`](godot/MIGRATION_NOTES.md) | Why the port deviates from idiomatic Godot, and a catalogue of quirks that look like bugs and are not |

### Three.js build

Layout and behaviour are both TypeScript, in `src/rooms/roomN.ts`, built with
the kit in `src/rooms/kit.ts`.

| Doc | What it is |
|---|---|
| [`ROOM_AUTHORING.md`](ROOM_AUTHORING.md) | The full kit reference: §7 API, §4 invariants, §2 coordinates |
| [`docs/room-map-viewer.md`](docs/room-map-viewer.md) | The top-down map viewer at `/map.html` |

### Design laws (both engines)

These are about the game, not the engine, so they apply either side. The
`designing-a-room` skill has the full set; the two that most often bite:

- **One reachable dispenser per lucid-gated action.** If the only way forward
  needs LUCID (almost always a keypad), a dispenser must be reachable from
  spawn *without already being lucid* — and in a room with an orderly,
  without crossing the patrol loop. Violating this is a soft-lock.
- **≥2.5 s reaction time at any inspection point.** Anywhere the player must
  stop and read, worst-case time-to-contact must be ≥2.5 s, i.e. **≥ ~8.2 m**
  from the nearest patrol leg. Godot: `KitDesign.min_inspection_distance()`.
  Three.js: `minInspectionDistance()`.

## Collaboration & deployment

Two authors — **Tom** and **Edo** — each work on their own branch; `main` is
the shared integration branch; `release` is the one-way door to the public
audience. Full details in the
[collaboration runbook](docs/superpowers/specs/2026-08-06-two-person-collaboration-runbook.md).

```
preview/tom  ─┐
               ├─► main (merged beta + playtest) ──► release ──► itch.io (public)
preview/edo  ─┘
```

| Branch          | Auto-deploys to                                   | Engine   | Audience        |
| --------------- | ------------------------------------------------- | -------- | --------------- |
| `preview/tom`   | `…/Ward-B/previews/tom/`                           | Godot    | Tom's WIP       |
| `preview/edo`   | `…/Ward-B/previews/edo/`                           | Godot    | Edo's WIP       |
| `main`          | `…/Ward-B/beta/` (merged staging)                 | Godot    | shared playtest |
| `main`          | `…/Ward-B/threejs/`                               | Three.js | shared playtest |
| `release`       | https://tommy-holmes.itch.io/ward-b (with telemetry) | Three.js | real audience |

**Staging runs the Godot port; itch.io still ships Three.js.** The split is
room coverage, not preference — Godot covers rooms 1–7, Three.js covers 1–20
(see [`godot/MIGRATION_NOTES.md`](godot/MIGRATION_NOTES.md)). `threejs/` stays
published because it is still the only complete run, and it is what you
compare the port against. Publishing Godot to itch is a manual, gated
dispatch (`.github/workflows/deploy-itch-godot.yml`) which refuses the public
`html5` channel until room parity; `deploy-itch.yml` is untouched.

The GitHub Pages **site root** (`…/Ward-B/`) is a static "admissions" chooser
([`hub/index.html`](hub/index.html)) linking to the merged beta, the Three.js
build and each author's preview. It exists on staging only — it is never
bundled into the itch release.

**Rules of the road:**

- **Work on your own `preview/<name>` branch.** Never commit straight to
  `main` — open a **Pull Request** into it so the other author can review.
- **Never push `main` or `release` without an explicit go-ahead.** Merging to
  `release` publishes the game to the public. `main` alone never touches itch;
  publishing is always the deliberate `git checkout release && git merge main
  && git push` second step (see the
  [itch release runbook](docs/superpowers/specs/2026-07-26-itch-release-runbook.md)).
