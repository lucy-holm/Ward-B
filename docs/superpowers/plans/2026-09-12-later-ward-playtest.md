# Rooms 11–20: revised private playtest

This pass starts from `b5ef2fe` on `preview/tom`. Rooms 1–10 are unchanged.
Three Luna agents handled separate room groups; root reviewed and revised their
implementation, placement and tests. A fresh Sol review found no remaining material correctness issues in the
integrated puzzle, collision and test changes.

## What to play

| Room | Revised experience |
| --- | --- |
| 11 — Treatment | Read the requested seal upstairs, retrieve the matching upright shape, then file it while medicated. Triage, lower observation beds, the mezzanine treatment bed and discharge seating divide the space into recognizable areas. An uncollected request changes after a catch; a held seal remains valid. |
| 12 — Asylum | Three wall calls replace the split code. Discover the numbered order in the east recess, then ring the bells while unmedicated. A central observation desk and two recovery bays break up the hall and offer crossings around cover. Two steady emergency pools retain readable edges in monochrome. Earned bell progress survives catches. |
| 13 — Last Ward | The closing corridor retains its moving-wall envelope. A wheelchair and cabinet mark the approach; a screened recovery bed marks the aftermath. |
| 14 — Hold | The orderly/pressure-plate timing puzzle remains. An intake desk, monitor, forms, office chair and waiting rows give the approach a purpose. The gate run and checkpoint stay accessible. |
| 15 — Sorting | The three-shape collection and escalating pursuit remain, with filing/notice landmarks between the existing doglegs. One patrol leg moves 20 cm to preserve clearance. |
| 16 — Service | Charge the phosphor clue, operate the breaker and use the light-state exit. Furnished workbenches, monitors and storage frame the service bays; the same routes remain open in either light state. |
| 17 — Gallery | Call order follows the journey: circle in the entry hall, square upstairs, triangle in the lower pocket. A records island splits the approach; upper waiting furniture and a lower observation bed distinguish the floors. The warning-first medicated shutter remains. |
| 18 — Relay | The permanent lights/doors decision remains. Console equipment, parts storage and a maintenance cart establish a working relay room. |
| 19 — Both routes | The dark branch gains a service vestibule; the lit branch gains supplies and an observation board on the raised refuge. The platform, ramp, checkpoint and branch consequences remain. |
| 20 — Loading | Intake storage, a cart, shelving and dispatch equipment frame the crate puzzle. Added solid furniture is included in the exhaustive state-space check. |

The shared bell implementation rejects medicated calls, emits spatial noise,
lights completed calls, clears the lamps after an incorrect future call, and
ignores duplicate latched calls. Both rooms emit puzzle layout and step events
through the existing telemetry system. No new collector or public release is
part of this pass; the private tailnet build has no telemetry endpoint.

## Verification

- All 32 Godot suites passed; focused checks were repeated after final room 11
  dressing and room 12 lighting changes.
- New tests cover all three requested treatment shapes, all six asylum bell
  orders, catches, actual door collision and actual player-camera interaction
  with every new seal, reader and bell. Shared bell tests cover wrong calls,
  state gating, noise, lamp resets and completion exactly once.
- Gallery checks exercise both levels, stair seams, the shutter, patrols and
  furniture collision on the correct floor. Loading-bay enumeration finds
  404 reachable states and zero unrecoverable states with the new furniture.
- Deployed-build desktop verification passes admission, movement, pointer lock
  and mouse look. Touch verification passes look, movement and taking the pill,
  with no page errors.
- Placement audit: 21 scenes, zero issues. Regeneration: all 123 room/prop
  outputs reproduce exactly. `npm run check:rooms` and `npm run build` pass.
- Godot maps were inspected alongside actual player-camera web exports.
  Twenty-two desktop and touch/tablet-size captures include color, monochrome, the
  heaviest ward, shape/bell fixtures and both gallery heights.

Browser timings are short samples from Chrome/Metal on the development Mac,
not measurements from a physical iPad or proof of game feel. Captures and test
logs are local under `godot/.artifacts/` and `/tmp/wardb-late-*`.

## Questions for the next human playtest

1. Does room 11's request feel understandable before committing to a search?
   Compare mismatches, catches and elapsed time before `seal_taken`.
2. In room 12, is crossing between bells tense or merely repetitive? Compare
   completion time and catch counts by `puzzle_layout.order`; repeated
   `sequence_reset` events suggest the clue or route needs another pass.
3. Do players naturally choose both sides of the new observation/records
   islands, or get stuck circling them? Inspect positions and catches together.
4. Is the gallery's upper bell discovered before descending? Watch for long
   gaps after the first call and repeated trips through the stairs.
5. Is the medicated shutter warning enough time to react on touch controls?
   Compare catches and room abandonment with desktop runs.
6. On the actual iPad, do the observation bays remain readable in monochrome,
   and does movement remain responsive while the three orderlies are active?

These are questions for the next instrumented itch playtest. This private
build deliberately does not send play sessions to the public collector.

Private build verified at https://hellos.impala-alpha.ts.net:8444. The HTTPS
response, local pack and regenerated gzip decode to the same SHA-256:
`407577cfae882b67c2ff43195380920373048899f60ec85d84789bdd2ec8e06c`.
