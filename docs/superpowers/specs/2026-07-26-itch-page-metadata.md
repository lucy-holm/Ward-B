# itch.io store page metadata — Ward B (historical archive)

> **Current copy:** use [`press/store-description.md`](../../../press/store-description.md), [`press/store-description.html`](../../../press/store-description.html), and [`press/release-notes.md`](../../../press/release-notes.md). This document records an earlier metadata pass and is retained for historical decisions; it is no longer the source of truth for the public page.

Field-by-field copy for the itch.io "Edit game" form. Paste each fenced
block into the field named in its heading. Written from the game's own
voice (lowercase interior text, clipped, clinical-but-haunted) where the
field is player-facing copy; plain and direct where the field is
itch's own UI chrome (tags, genre, install instructions).

**Historical snapshot, updated 2026-08-31 for the Godot build.** The Three.js build (`src/`) this
doc originally cited was deprecated and frozen on 2026-08-23 — the Godot
build in `godot/` is the only maintained build and the one that ships
publicly (`docs/superpowers/specs/2026-08-23-threejs-deprecation.md`). Every
claim below was re-checked against `godot/` on that date; see the changelog
at the bottom of this doc for exactly what changed and why.

Sourced from: `README.md`, `godot/ui/start_overlay.tscn` start overlay,
`godot/main.gd` (`_ready()`'s room registry and `?room=` dev jump),
`godot/rooms/room1/room1.gd` / `room13.gd` / `room15.gd` / `room17.gd` /
`room20.gd`, `godot/project.godot` input map, `.claude/skills/designing-a-room/SKILL.md`
voice guide. 20 rooms confirmed in `main.gd`'s `ROOM_SCENES` registry
(room1–room20, room19 a same-id variant picked at load time), one-way, no
backtracking. Current build tag in the game itself, unchanged from the
Three.js build: `GREYBOX PROTOTYPE — v0.2` (`godot/ui/start_overlay.tscn`).

---

## 1. Title

```
Ward B
```

Why: itch titles are usually rendered next to your cover thumbnail at a
tiny size — anything longer than two words competes with the tagline for
attention it doesn't need. The game's own title screen just says
`WARD B`; match it.

---

## 2. Short tagline / summary

itch calls this field "Short description" — it's what shows under the
title on your page and in listing grids. ~80 characters is the safe
ceiling before it truncates.

**Variant A — eerie/atmospheric:**

```
you are a patient. what you see depends on what you've taken.
```

**Variant B — puzzle/mechanics-forward:**

```
a first-person puzzle game about two realities and one pill.
```

**Recommendation: Variant A.** It's the actual line from the game's start
overlay (`index.html`), so it's zero-effort-authentic rather than
marketing paraphrase, and it does the job a tagline needs to do — pose a
question (what did you take, what does it change) without answering it.
Variant B is clearer about genre if you're worried A reads as too vague
for someone scanning a listing page fast, but it spends the hook on
mechanics instead of dread, which undersells the game's actual strength.

---

## 3. Description (main page body)

itch's description editor supports basic Markdown/rich text (bold,
italic, headers, line breaks, lists). Both variants below use minimal
formatting — bold for the two state names (the thing a skimmer most
needs to register) and a short control list. Both are written to read in
well under 30 seconds.

**Variant A — eerie/atmospheric:**

```
You are a patient. What you see depends on what you've taken.

Ward B is a first-person psychological puzzle game about two
realities that don't agree with each other. **Shift** between them —
**unmedicated**, where the walls have things written on them, and
**lucid**, where the machinery makes sense but the orderlies you can
no longer see are still walking their routes. Being lucid costs your
one pill. Pills come from the dispensers on the walls. Neither state
is lying to you. Neither is telling the truth.

Twenty rooms, one door forward each time. No backtracking.

This is a **greybox prototype** — a proof-of-concept built to test
whether the core idea works, not a finished game. The geometry is
untextured grey. The point right now is the puzzle logic and the
tension of the shift, not the art.

**Controls**
Desktop — WASD to move, mouse to look, E to interact, Q to shift.
Mobile — on-screen stick to move, drag the right side of the screen
to look, on-screen buttons for interact and shift. Runs in a mobile
browser, no install.

It's free, it's short, and it's rough on purpose at this stage.
If you play it, the devs want to know what worked and what didn't —
comments on this page or the feedback prompt at the end of the build
both reach them.
```

**Variant B — puzzle/mechanics-forward:**

```
Ward B is a first-person puzzle game built around one mechanic: you
can shift between two readings of the same space, and each one
hides something the other needs.

**Unmedicated** — you can read the scrawled clues on the walls, but
the orderlies patrolling the ward are visible and worth avoiding.
**Lucid** — keypads and machinery become legible, but the orderlies
go invisible while they keep walking their routes, and the state
itself is on a ~45-second clock before you're kicked back out of it.
Going lucid costs your one pill; pills refill at wall dispensers, so
every shift is a spend you have to plan around, not a toggle you get
for free.

Twenty rooms, each building on the last, no way back once you've
moved on. Expect code-and-keypad rooms, patrol-timing rooms, a
two-storey room, a pushable-crate room, and one room that breaks
the game's own "lucid is safe" rule.

**Status: greybox prototype.** Every room is untextured grey geometry
— this build is testing whether the puzzle mechanic holds up over
twenty rooms, not showing off art. If that's not your thing yet,
add it to a collection and check back.

**Controls**
Desktop: WASD move, mouse look, E interact, Q shift state.
Mobile: on-screen stick + drag-to-look + on-screen interact/shift
buttons — no install, plays in the browser.

Feedback is genuinely wanted — what puzzle stopped you, what felt
unfair, what you'd cut. Drop it in the comments.
```

**Recommendation: Variant A**, with Variant B's room-variety line
("code-and-keypad rooms, patrol-timing rooms, a two-storey room...")
folded in as a second paragraph if Tom wants more concreteness before
the prototype disclaimer. Reasoning: A opens and closes on the game's
actual voice (the start-overlay line, the "neither state is lying"
line), which is a stronger hook for a psychological-horror browser
audience than a mechanics rundown up front — itch horror/puzzle
browsers respond better to mood-first copy, and the mechanics still get
fully explained by the third paragraph. B is the safer choice if Tom's
worried A undersells that this is a *puzzle* game and not a walking sim
— it's more legible to someone scanning fast, at the cost of sounding
like every other itch blurb for the first two lines.

---

## 4. Tags (max 10)

itch's "Kind of project" (HTML) and platform checkboxes (Web/HTML5,
plus Android/iOS if he wants to flag mobile-friendly) are separate
fields, not tags — don't spend tag slots on those.

```
psychological-horror
puzzle
horror
first-person
walking-simulator
atmospheric
short
Prototype
3D
browser
```

Justification, one line each:
- **psychological-horror** — most accurate genre tag and one people
  actually browse/filter by on itch; leads because it's the truest
  descriptor.
- **puzzle** — core mechanic is a puzzle loop (shift, read, act); this
  tag has real search volume.
- **horror** — broader net than psychological-horror alone; some
  browsers filter horror without the qualifier.
- **first-person** — camera/perspective tag, filters correctly for
  people who specifically want FP over top-down.
- **walking-simulator** — imprecise but heavily browsed on itch as a
  catch-all for slow, atmosphere-led first-person games; worth the
  tag even though Ward B has harder puzzle logic than the term implies.
- **atmospheric** — signals tone to browsers scanning tag clouds,
  cheap and accurate.
- **short** — sets correct expectations (20 rooms, no padding) and is
  a real itch browse tag for people specifically hunting short games.
- **Prototype** — honest, and itch has browsers who specifically seek
  out prototypes/proof-of-concepts; also pre-empts "why does this look
  unfinished" complaints.
- **3D** — filters correctly against the huge pool of 2D itch games.
- **browser** — signals no-download/no-install, which is a real
  decision factor for itch visitors deciding whether to click.

Deliberately left out: `godot` (the game's actual engine as of this build —
real, but the same reasoning as before applies: near-zero-traffic tag,
nobody browses by game engine on itch except other devs), anything overly
clever/unique to this game (nobody searches a tag they've never seen
before it exists). Previously this listed `three-js`, the engine at the
time this doc was written; that build is deprecated and frozen, so the tag
would now be actively wrong rather than merely low-value — swap in
`godot`, or leave engine off tags entirely, but don't ship `three-js`.

---

## 5. Genre / classification

itch's genre dropdown (separate from tags) — pick one:

```
Puzzle
```

Why: itch's genre list is short and blunt (Action, Adventure, Puzzle,
Survival, Visual Novel, etc.) — "Puzzle" is the closest fit given the
core loop is read-a-clue/shift-state/act-on-it. "Adventure" is the other
defensible pick if Tom wants to signal the exploration/atmosphere side
harder, but Puzzle is more accurate to what the player is actually
doing most of the time.

---

## 6. Install instructions / how-to-play block

itch shows an optional block on the download/play page, useful here
since itch will otherwise just drop the player straight into the
embedded browser frame with no context. Short, since the game already
explains controls in its own start overlay — this is a safety net for
anyone who skips the overlay or is deciding whether to click "Run game"
at all.

```
Runs entirely in the browser — click "Run game," no download.

Desktop: WASD to move, mouse to look, E to interact, Q to shift
between the two states. Click into the game window to lock the mouse.

Mobile/tablet: on-screen stick to move, drag anywhere on the right
half of the screen to look, on-screen buttons for interact and shift.

The game explains both states again in its own opening screen —
this note is just so you know what you're clicking into.
```

---

## 7. Cover image & screenshots

itch's cover image requirement is exactly **630×500**. This is the
single highest-leverage asset on the whole page — it's the thumbnail
shown in every listing, browse grid, and search result, and it has to
work at a size where detail disappears. For a greybox with no textures,
the cover's job is to sell *mood and legibility of the concept*, not
production values — lean into it looking deliberately stark rather than
apologizing for it.

**What actually photographs well in this game, and why:**

- **A lit keypad in the dark, unmed-side.** Room2/room5-style: a single
  glowing keypad against grey walls with everything else nearly black
  (the game's vignette does this for free). Reads instantly as "there's
  a puzzle here" even as a thumbnail, and the darkness hides the fact
  that the geometry is untextured — dark greybox reads as "moody," lit
  greybox reads as "unfinished."
- **The Gallery Ward (room17), from the upper floor looking down.**
  It's the one genuinely striking geometry moment in the build — a
  two-storey space with a visible lower floor and stair/mezzanine
  verticality. Frame it from the balcony rail looking down at the floor
  below, ideally catching an orderly mid-patrol on the lower level, for
  a screenshot that reads as "this game has real space" instead of
  "four grey walls."
- **An orderly's sight cone / threat state, lucid-side.** The HUD's
  `threatVignette`/red edge treatment plus the "he sees you" threat
  line (see `index.html` `#threatLine`) is the single most legible
  "this is a horror game" frame available — capture the moment the
  threat vignette kicks in, ideally with the orderly visible (i.e.
  captured unmedicated, since orderlies are invisible while lucid) so
  the screenshot itself teaches the mechanic.
- **A scrawl close-up, unmed.** One of the wall texts (`don't\nswallow`,
  `there was a door\nhere once`) framed tight enough to read the words
  — this is the cheapest possible screenshot that proves the game has
  actual writing/atmosphere and not just geometry.
- **Avoid:** wide, evenly-lit shots of empty corridors. That's where
  the greybox reads as placeholder rather than intentional — every good
  screenshot here either has a light-source-versus-darkness contrast, a
  legible UI moment (threat line, meter, keypad glow), or genuine
  spatial interest (room17's verticality).

**Practical capture note:** the maintained capture pipeline is
`press/README.md` — real Godot screenshot harnesses in `godot/tools/`
(`shoot_game.tscn` for anything that's a verdict about how the game looks,
`shoot.tscn` for hand-framed shots, `shoot_overlay.tscn` for the start/
config/pause panels), not a browser. All 15 current press captures were
made that way; read `press/README.md` before recapturing anything.

The room-jump URL trick still works in the deployed web build too
(`?room=room17`, `?room=room2`, etc. — ported to Godot as `main.gd`'s
`?room=` dev jump, same behavior: jumping past room1 grants shift + a full
pill automatically, so lucid/unmed shots are both reachable immediately).
Useful for a quick manual look in a browser; not how the press set itself
is produced.

Aim for **4–6 screenshots**: 1 keypad-in-dark, 1 room17 verticality, 1
threat/sight-cone moment, 1 scrawl close-up, and 1–2 more of whatever
Tom finds visually strongest in rooms 15/16/20 (colored-shape sorting,
the breaker-bay light axis, the crate gauntlet) once he's looked at them
in the map viewer or in-game.

---

## 8. Devlog post draft

itch devlogs surface in the site's activity feed and are the main
organic-discovery lever for a brand-new, zero-following project —
worth posting even though the game is a prototype, maybe especially
because it's a prototype (itch's audience is unusually receptive to
"here's a rough thing, tell me what's wrong with it" posts).

**Title:**

```
Ward B: 20-room greybox prototype is up
```

**Body:**

```
Ward B is live — a free, browser-playable prototype of a first-person
psychological puzzle game built around one mechanic: shifting between
two readings of the same space.

**Unmedicated**, you can read what's scrawled on the walls, and the
orderlies patrolling the ward are visible. **Lucid**, keypads and
machinery become legible and the orderlies go invisible — but they're
still walking their routes, lucidity only lasts about 45 seconds before
it reverts on its own, and going lucid costs your one pill. Pills
refill at wall dispensers. Every shift is a decision, not a toggle.

Twenty rooms, one way through, no backtracking. Built in Godot 4.7.

This is a **greybox** — every room is untextured grey geometry. The
prototype exists to test whether the core mechanic holds up over a
full run, not to look finished. If the grey boxes aren't a dealbreaker,
it plays in any browser, desktop or mobile (real touch controls, no
install).

It's free, it's maybe 20–30 minutes end to end, and feedback is the
actual point of posting this — what puzzle stopped you, what felt
unfair, whether the two-state mechanic stayed interesting for all
twenty rooms or wore out its welcome partway through. Comments here or
on the game page both reach me.

Play it: [itch page link]
```

Why this shape: leads with the mechanic (the thing that has to sell the
click), states the prototype/greybox honesty up front rather than
burying it, gives a concrete time estimate (itch devlog readers decide
fast whether something's worth a click-through), and ends with an
explicit feedback ask — devlogs that ask a specific question get more
comments than ones that just announce.

---

## Changelog — 2026-08-31 Godot re-verification

Every factual claim in this doc was checked against `godot/` (not `src/`,
which is now a frozen archive) and corrected where the port changed
something. What changed, old → new:

- **Engine.** `Vite + three.js` → `Godot 4.7`. Only the devlog draft
  (§8) stated this explicitly; fixed there.
- **Source citations.** `src/main.ts`, `src/rooms/room*.ts` →
  `godot/main.gd`, `godot/rooms/room*/room*.gd`. The room-by-room content
  claims themselves (two-storey room, pushable-crate room, the one room
  that breaks "lucid is safe", colored-shape sorting, patrol-timing
  rooms, code-and-keypad rooms) all still hold — checked against
  `room13.gd`, `room15.gd`, `room17.gd`, `room20.gd` and their header
  comments, which port the same beats deliberately.
- **`three-js` tag** (§4) → left out in favor of `godot`, with the
  reasoning note corrected — it was already a low-value tag, now it
  would also be factually wrong.
- **Screenshot capture method** (§7) → the "use the room-jump URL trick"
  note pointed at a Playwright-driven browser flow. It's replaced with a
  pointer to `press/README.md`'s Godot screenshot harnesses, which is now
  the real, checked-in capture pipeline. The `?room=` URL trick itself
  still works unchanged (ported to `main.gd`), so that part of the note
  survives as a secondary, manual-check option.

**Everything else re-verified unchanged:**
- Room count: 20 (room1–room20, room19 a same-slot variant), one-way, no
  backtracking — confirmed in `main.gd`'s `ROOM_SCENES`.
- Controls: WASD move, mouse look, E interact, Q shift (desktop);
  on-screen stick + drag-to-look + on-screen buttons (touch) — confirmed
  in `godot/project.godot`'s `[input]` map and `main.tscn`'s touch
  controls layer. Unchanged from the Three.js build.
- Platform: still a single `html5` itch channel, browser-playable, no
  install, desktop and mobile — confirmed in
  `.github/workflows/deploy-itch-godot.yml`. The publish path changed
  (manual `deploy-itch-godot.yml` dispatch instead of an automatic push
  to `release`) but that's a publishing-process detail, not something
  this player-facing copy claims.
- Build tag: `GREYBOX PROTOTYPE — v0.2`, unchanged, still shown on the
  game's own start screen (`ui/start_overlay.tscn`) — the "greybox
  prototype" framing throughout this doc is still the game's own
  self-description, not stale copy left over from Three.js.
- Pill/state mechanic description (unmedicated reads walls, lucid reads
  machinery, ~45s meter, one pill, wall dispensers refill): unchanged,
  confirmed against `godot/autoload/state_manager.gd` and `CLAUDE.md`.

**What this doc does NOT claim and shouldn't:** nothing here describes
the Godot build's visual specifics (the posterise/dither pass, the prop
kit, per-fitting lighting) because the original doc didn't describe the
Three.js build's visuals either — it's copy for itch's text fields, not
a visual spec. See `press/README.md` for what changed visually and how
that's represented in the screenshots.
