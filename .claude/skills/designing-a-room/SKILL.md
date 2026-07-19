---
name: designing-a-room
description: Use when deciding what a Ward B room should contain — layout, puzzle beats, orderly placement, difficulty, pill economy — before or while building it, or when evaluating whether a room design is fair.
---

# Designing a Ward B Room

## Overview

Every room composes the same two-state vocabulary: **UNMED** reads the
walls (scrawls exist only unmed) and is safe from nothing; **LUCID** reads
machinery (keypads refuse unmed), drains a ~45s meter, then auto-reverts.
Shifting unmed→lucid costs the player's single pill. A room is a route the
player plans across that oscillation. Mechanical how-to: `adding-a-room`
skill + ROOM_AUTHORING.md.

## Hard laws (violating these ships a broken room)

1. **No soft-locks.** An unmed player with 0 pills must always be able to
   reach a dispenser — or an orderly cone (the catch forces lucid +
   teleports to spawn; that fallback is load-bearing, see room11's header).
   Audit every unmed-sealed pocket AND the ~45s timer expiring anywhere.
2. **Unmed is always safe** from the world (never from orderlies). The one
   sanctioned exception is room13's closing walls. Don't add a second
   without Tom's sign-off.
3. **Rooms are one-way.** No backtracking to a previous room's dispenser.
4. **Reaction time ≥2.5s** at every spot the player must stand and read:
   `distance from patrol ≥ ~8.2m`, or make the spot **provably unseeable**
   — put the scrawl in a nook whose own AABB is passed as the orderly's
   occluder (room10's trick; sightlines into a box always cross it).
5. **Dispensers are placed for pressure, not comfort** (Tom, playtest 9):
   one per sealed pocket, at the NEAR end, so a mistimed revert deep in a
   stretch means a long unmed walk back through orderlies (room12's
   `dispenser12c`).

## Beat catalog — steal from the exemplar, one file each

| Beat | What it does | Exemplar |
|---|---|---|
| Code scrawl + lucid keypad | the core spend: read raw, pay to act | `room2.ts` |
| Split code across patrol ground | forces two exposures per attempt | `room5.ts` (halves: `'1 9 – –'`/`'– – 0 7'`) |
| Unmed-sealed gate (`states:'unmed'` wall) | makes a crossing cost a pill | `room10.ts` gates 2/3 |
| Forced-unmed entry | guarantees the first gate is paid | `room11.ts`/`room12.ts` `onEnter` |
| Occluder-protected nook | safe reading spot inside patrolled ground | `room10.ts` NOOK_A/B |
| Counter-rotating orderly pair | two threats that read as two | `room8.ts`/`room12.ts` (eyeTint!) |
| Safe breather room | pacing valley before a spike | `room9.ts` (coat = found pill) |
| Verticality (mezzanine + ramp) | route goes up-and-back, not just forward | `room11.ts` |
| Island as occluder+collider | cover the player circles | `room5.ts` ISLAND |

Current difficulty curve: 1 tutorial → 2-4 teach → 5 capstone → 6-8 orderly
escalation → 9 breather → 10-12 scale spikes → 13 epilogue (inverted rule).
Slot new rooms deliberately; after a spike, give a valley.

## Voice

All player-facing text is lowercase, second person, terse dread:
scrawls accuse ("they lock it\nfrom the inside"), toasts land the beat
("hands. a needle. …," he says.), objectives point without instructing.
Success toasts open with the code (template literal — code may be
randomized). Match room headers' comment style: design intent + audits
(soft-lock, reaction-time) written into the file.
