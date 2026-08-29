# WARD B

A first-person psychological puzzle game, built in **Godot 4.7**.
Core mechanic: shift (Q) between **LUCID** and **UNMEDICATED** reality —
lucid reads machinery but costs a pill and drains a medication meter; unmed
reads the walls but is visible to the orderlies.

- Play (public release): https://tommy-holmes.itch.io/ward-b
- Staging hub (all branch builds): https://lucy-holm.github.io/Ward-B/

**The game is `godot/`.** All work — rooms, art, mechanics — happens there.

`src/` is a **frozen Three.js build**: the original implementation, kept as a
readable reference and an emergency rollback. It is not maintained and does not
ship. See
[`docs/superpowers/specs/2026-08-23-threejs-deprecation.md`](docs/superpowers/specs/2026-08-23-threejs-deprecation.md)
for why, and for what was deliberately not done.

| | Godot build (the game) | Three.js build (archive) |
|---|---|---|
| Source | `godot/` | `src/` — frozen 2026-08-23 |
| Rooms authored in | `godot/tools/gen_rooms.py` | `src/rooms/roomN.ts` |
| Ships to | itch.io public `html5`, via manual dispatch | nothing; rollback only |
| Verified by | `godot/tools/run_tests.sh` + `check_roundtrip.sh` | `npm run check:rooms` |
| Rooms | all 20 | all 20 |

If you find yourself editing `src/`, stop and check you meant to — changes there
compile, pass review, and affect nothing that ships.

## Commands

**The game** — all from inside `godot/`, with
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

Prop kit (see [`godot/PROP_KIT.md`](godot/PROP_KIT.md)):

| Command | What it does |
|---|---|
| `python3 props/_gen/gen_props.py` | Regenerate every prop `.tscn` + the mesh spec from `prop_defs.py` |
| `$G --headless --path . --script res://props/_gen/gen_prop_meshes.gd` | Bake the mesh spec into `props/meshes/*.tres` |
| `$G --path . tools/shoot.tscn -- res://props/_gen/gallery.tscn kit <cam> <look> 1.2 lucid` | Screenshot every prop in the kit. **Windowed, not `--headless`** |

**The Three.js archive** — `src/`, frozen 2026-08-23, does not ship. See
[`src/DEPRECATED.md`](src/DEPRECATED.md). `npm run dev`, `npm run build`,
`npm run preview` and `npm run check:rooms` still work and operate on the
archive; passing them is not evidence about anything that ships.

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
| `main`          | `…/Ward-B/threejs/`                               | Three.js | archive only    |
| *(none)*        | https://tommy-holmes.itch.io/ward-b (with telemetry) | Godot    | real audience   |

**Everything that matters is Godot.** As of 2026-08-23 the Three.js build is a
frozen archive — see
[the deprecation record](docs/superpowers/specs/2026-08-23-threejs-deprecation.md).
`threejs/` stays published because `godot/MIGRATION_NOTES.md` cites it to
explain why the port deviates where it does, and it is what you compare
behaviour against.

**Nothing auto-publishes to the public any more.** Shipping is a manual
`deploy-itch-godot.yml` dispatch that requires `confirm: "ship godot"` and
still runs a room-parity check before it will touch the public `html5` channel.
`deploy-itch.yml` (Three.js) had its `release`-push trigger removed and is now
a rollback lever only — running it republishes the archive over the live game.

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
