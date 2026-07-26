# press/ — itch.io store imagery

Generated 2026-07-26 by capturing real frames from the built game. Copy
for the store page itself lives in
`docs/superpowers/specs/2026-07-26-itch-page-metadata.md`.

**These are real gameplay frames, not concept art.** That's deliberate —
see "On generated art" below.

## What's here

- `out/cover-titled.png` — **630×500, itch's exact cover requirement.**
  The room2 corridor with the title set in the game's own typography
  (mono, teal accent, red `B`). This is the recommended cover.
- `out/cover-plain.png` — same frame, same size, no title. Use if you'd
  rather itch's own title chrome do the work.
- `out/contact-sheet.png` — all 18 captures at a glance.
- `raw/*.png` — 1600×900 source frames. `hero-*` are captured with the
  HUD hidden (clean plates for compositing); the rest keep the HUD.

## Recommended screenshot set (in this order)

1. **`r2-keypad`** — the single best frame in the build. Dark corridor,
   a lit ceiling panel, the readable `4118` scrawl, "they lock it from
   the inside", the staff door, a pill on the floor. It teaches the core
   mechanic — *unmedicated means you can read the walls* — without a
   caption. Lead with it.
2. **`r13-corridor`** — lucid state: bright, blown-out, hard one-point
   perspective. Put it second precisely because it looks like a different
   game to shot 1. That contrast IS the pitch.
3. **`r10-wing`** — two orderlies visible in the same frame. Establishes
   the threat and that the space is populated.
4. **`hero-r17`** — an orderly close and looming. The most legibly
   "horror" frame available.
5. **`r7-records`** — lucid, bright, legible fixtures. Shows variety of
   space beyond corridors.

Note shot 1 reveals room2's code (`4118`). Minor spoiler for the first
keypad, and moot if a player enables randomised codes — worth it for how
well the frame reads.

## What we learned shooting this — worth acting on

Most rooms photograph *badly*, and the contact sheet makes it obvious.
`r12-floor`, `r12-wide`, `r15-sorting`, `r16-breaker`, `r20-crate` and
`r1-cell` are near-featureless dark red fields: geometry too far from any
light source, nothing in frame to give scale.

This is not purely a screenshot problem. If a room is illegible in a
still, it's plausibly hard to *read* in motion too — a player entering
room 12 or 15 may be facing the same "where am I, what's here" problem.
Worth checking against the drop-off curve once real players accumulate:
if those rooms show high `duration_s` spread or cluster quits, poor
spatial legibility is a candidate cause, not just difficulty.

The frames that do work all have one of three things: a visible light
source with something lit near it, a bright lucid-state room, or a human
silhouette for scale.

## On generated art (deliberately not used)

An image model could produce a far prettier cover than any of these. It
would also be a lie: players click a moody rendered corridor and get
untextured grey boxes. On itch that earns "not what was advertised"
ratings, and the page copy is at pains to be honest that this is a
greybox prototype — the cover shouldn't undercut that.

Generated art is defensible for things that clearly aren't gameplay: a
devlog banner, a logo/wordmark treatment. Not for the cover or
screenshots.

## Regenerating

Capture scripts are throwaway (they lived in `/tmp` for this pass). To
redo: `npm run build`, `npx vite preview --port 4173`, then drive
Playwright against `?room=<id>&notrack=1` — click `#startBtn`, `KeyW` to
move, mouse-drag on the canvas to look (pointer lock does NOT work
headless; the drag path activates precisely because of that), and inject
`#hud{display:none}` for clean plates. Always pass `notrack=1` so capture
runs never reach the telemetry pipeline.
