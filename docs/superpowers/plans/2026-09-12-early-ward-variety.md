# Early ward variety, wall copy and hybrid controls

User playtested through rooms 7–8 and approved the fuse direction, requesting
fewer code doors, randomized fuse locations, readable wall copy and iPad
mouse/keyboard support. Work remains Godot on preview/tom; refresh the same
private review build after integration. Keep the existing art budget.

## Opening rhythm

1. Pill/state tutorial.
2. First raw clue and lucid code lock.
3. Illusory chains: trust the unmedicated door.
4. First orderly and a state-dependent escape.
5. Split-code capstone around cover.
6. Fuse maintenance, now four plausible hiding places; reroll an uncollected
   fuse after a catch, preserving recovered/installed progress.
7. Records matching: read the requested shape raw, choose its physical seal
   from three shelf areas, and present it to the lucid archive reader. Incorrect
   selections make noise. A catch may change an uncollected request, never a
   held seal. Shapes accompany colors, so monochrome remains fully solvable.
8. Distributed call bells: read the order in the sheltered dispenser alcove,
   ring three shape-marked bells raw while managing two orderlies. Correct
   bells latch; wrong future bells reset the sequence and make noise. Catches
   preserve latched progress. No keypad or modal input screen.
9. Quiet recovery: the coat supplies a pill and physical key; use the key at
   the lucid lock. Keep the patient chart and checkpoint anchor.

## Parallel ownership

- Root: room 7/8/9 behavior, generator changes, small puzzle fixtures, integration.
- Fuse agent: room6 logic, candidate placement proposal, tests.
- Copy agent: shared wall text fitting, all-room copy audit and targeted tests;
  root applies generator placement changes.
- Input agent: actual-device input mode, player/UI integration, hybrid tests.

## Acceptance

Every new puzzle opens its exit through real main/collision APIs, rejects wrong
states and duplicate actions, preserves intentional progress on catches, and
leaves a reachable refill. Check every randomized candidate/permutation, both
realities and monochrome. Emit bounded puzzle/layout events without per-frame
spam. Wall clues fit their authored surface, not just the viewport; inspect
actual camera captures. Hybrid tests distinguish physical mouse events from
touch emulation and retain usable controls when pointer lock is unavailable.

Run Godot suites, generation/resource/placement guards, npm checks, maps and
desktop/touch/hybrid browser checks. Review agents' diffs and failures, then
refresh the private export and verify compressed/HTTPS package hashes. No
public itch publishing or GitHub push is part of this pass.
