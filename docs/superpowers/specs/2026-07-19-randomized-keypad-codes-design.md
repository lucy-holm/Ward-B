# Randomized keypad codes — design

**Date:** 2026-07-19
**Status:** implemented

## Purpose

An optional difficulty modifier, requested by Tom: reroll every keypad
room's 4-digit code — and the wall scrawl that teaches it — on **every room
entry** and **every orderly catch**, so codes can never be memorized across
a death or a re-visit. Feature-flagged: the game plays exactly as before
unless the player opts in from a new CONFIGURATION panel on the start
screen.

## Constraints

- **Off by default, zero behavior change when off.** Every room's original
  fixed code (`4118`, `1907`, …) is the authored value; the flag only
  substitutes at runtime.
- **The clue and the lock can never disagree.** A reroll must atomically
  update both the keypad's expected entry and the scrawl(s) the player
  reads it from — including split clues (`'8 5 – –'` / `'– – 6 3'`) and
  success toasts that quote the code.
- **No room reload.** Rerolling on catch happens mid-visit; a full
  `loadRoom` would reset doors/colliders/orderlies. The scrawl texture is
  rebaked in place instead.
- **Persisted.** The toggle survives reloads (localStorage), since the
  public build has no other save state.

## Files

| File | Role |
|---|---|
| `src/game/settings.ts` (new) | `isRandomizeCodesEnabled()` / `setRandomizeCodes(on)`, persisted under `wardb-settings-v1`. Separate from `tuning.ts` (fixed balance constants) and `state.ts` (per-playthrough). |
| `index.html` + `src/style.css` | CONFIGURATION ghost button under ADMIT ME; `#settingsOverlay` panel with the checkbox row. |
| `src/ui/hud.ts` | `bindConfig(get, set)` wires the panel; getter re-seeds the checkbox on every open. `hideOverlays` covers the new overlay. |
| `src/rooms/types.ts` | `ScrawlDef.id?` — stable handle, only on scrawls a script rewrites. |
| `src/game/world.ts` | `updateScrawlText(id, text)`: rebakes the scrawl's canvas texture in place (disposes the old map), keyed by a new `scrawlEntries` map populated only for id'd scrawls. |
| `src/game/context.ts` + `src/main.ts` | `GameCtx.updateScrawlText` → `World.updateScrawlText`. |
| `src/rooms/kit.ts` | `randomCode4()`, `codeClueText(code, mask?)` (space-separated digits; mask blanks the out-of-range half with `–` for split clues), re-export of `isRandomizeCodesEnabled`, and `KeypadDoorLock.setCode(code, successToast?)`. |
| room2, 5, 6, 7, 8, 9, 10, 11, 12 | Per-room wiring (below). Room 13 has no lock; rooms 1/3/4 have no keypad. |

## Per-room pattern

```ts
const FIXED_CODE = '4118';
let code = FIXED_CODE;

function regenerateCode(ctx: GameCtx): void {
  if (!isRandomizeCodesEnabled()) return;
  code = randomCode4();
  ctx.updateScrawlText('codeScrawl', codeClueText(code));
  // split-clue rooms (5, 8, 10, 12) instead update 'codeScrawlA'/'B'
  // with masks [0, 2] / [2, 4]
}
```

- `regenerateCode(ctx)` runs first thing in `onEnter` and at the end of
  `onCaught`/`handleCaught`.
- `openKeypad({ code, … })` reads the mutable variable; success toasts that
  quote the code are template literals over it.
- Room 11 (the one `keypadDoor` kit room) can't reach the lock closure's
  copy, so it calls `lock.setCode(code, successToast)` instead.

## Non-goals / notes

- Codes are `Math.random()`-drawn with no uniqueness guarantee against other
  rooms' codes — collisions across rooms are harmless (each keypad only
  checks its own code) and the fixed codes' "every code unique" authoring
  rule (see room11's header) only exists to keep *authored* values from
  going stale, which doesn't apply to rolls.
- Catch-triggered rerolls fire even if the player already read the clue but
  hasn't typed it yet — that's the point of the feature, not a bug.
- `_kitcheck.ts` (dev demo room) keeps its fixed `1234`; it's not routed in
  the game.
