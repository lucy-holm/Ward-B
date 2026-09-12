# Later ward redesign

The user approves the first ten rooms and asks for the same puzzle variety,
environment detail and purposeful layouts in rooms 11–20. They explicitly
authorize layout changes and parallel agents. Work starts from `b5ef2fe` on
`preview/tom`; the maintained game is `godot/`.

## Design

| Room | Retained identity | Direction |
| --- | --- | --- |
| 11 | Treatment corridor and mezzanine | Requested shape seal, treatment stations and a reader; reward climbing with a physical task |
| 12 | Large asylum/day wards | Ordered call bells across distinct clinical bays; replace repeated split-code walking with purposeful crossings |
| 13 | Lucidity squeezes the corridor | Preserve moving-wall survival; furnish the approach and aftermath outside the moving envelope |
| 14 | Orderly holds a pressure plate | Keep the timing puzzle and checkpoint; develop the intake/waiting area |
| 15 | Three shapes increase pursuit | Keep collection and escalation; organize the open hall into sorting areas and recognizable approaches |
| 16 | Charge, breaker and phosphor clues | Keep the light-state puzzle; create a believable service bay with readable clues |
| 17 | Gallery, stairs and lucid shutter | Ordered bells across floors; strengthen gallery/day-room landmarks while preserving the shutter warning |
| 18 | Irreversible power choice | A coherent switchgear room with legible choice and consequences |
| 19, both | Lights versus doors consequence | Distinct furnished service routes, preserving the lit refuge versus dark short crossing |
| 20 | One crate, three jobs | Intake/storage/dispatch layout around the tested crate route and final gates |

Reuse the existing high-contrast shape/reader/bell fixtures, monochrome mode,
shared prop meshes and bounded telemetry events. Avoid extra puzzle locks on
rooms whose plate, branch or crate already supplies the interaction. Broad
spaces should acquire meaningful bays/cover or shorter routes, not merely more
props along distant walls. Furniture collision, sight obstruction and visible
geometry must agree; medication, checkpoints and earned progress stay recoverable.

## Work and acceptance

- [x] Treatment agent: rooms 11–13, source layouts, scripts and focused tests.
- [x] Gallery agent: rooms 14–17, source layouts, scripts and focused tests.
- [x] Finale agent: room 18, both room 19 variants, room 20 and focused tests.
- [x] Root review: compare each result with the requested room identity,
  traversal purpose, monochrome cues, collision and state economy.
- [x] Verify every room/prop regenerates from the generator; first ten scenes
  remain unchanged. Run all Godot suites plus required npm checks/map viewer.
- [x] Review actual player-camera captures and exported browser views in both
  color and monochrome, including tablet rendering and the heaviest room.
- [x] Document the revised room-by-room playtest and remaining uncertainties.
  Refresh only the private tailnet build, verify served bytes/input, and commit
  locally on `preview/tom`. No public itch publishing or branch push.

Agents own disjoint room functions in `gen_rooms.py` and use surgical patches.
They generate only their own scenes. Root owns shared integration and final
validation; no agent may weaken a safety check to hide a route obstruction.
