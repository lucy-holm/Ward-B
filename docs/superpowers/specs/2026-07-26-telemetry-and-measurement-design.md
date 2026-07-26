# Telemetry & Measurement — audit and plan

**Date:** 2026-07-26
**Context:** preparing Ward B for an itch.io release. Goal is to measure how
players actually interact with the prototype, and to have a credible A/B
capability when traffic justifies it.
**Status:** plan — nothing here is implemented yet.

---

## 0. TL;DR

Ward B already has more telemetry than most prototypes: a batching event
queue (`src/game/telemetry.ts`), 31 distinct event names, and instrumentation
threaded through every room. **None of it is collected today** —
`VITE_TELEMETRY_URL` (telemetry.ts:53) is unset, so every event
`console.log`s and dies with the tab.

The gap is not "add tracking". The gap is four things:

1. **Nothing receives the data.** No endpoint, no storage, no dashboard.
2. **The identity model can't answer the questions Tom is asking.** Session
   id is per-page-load, there is no player id, and READMIT is a
   `location.reload()` — so a player's second attempt is indistinguishable
   from a different person. Retention, "did they retry", and stable A/B
   bucketing are all impossible as built.
3. **The single most important event doesn't exist.** `endOfBuild()`
   (main.ts:301) flushes but emits no `game_complete`. "Do players finish?"
   currently has no event behind it.
4. **Dev sessions are indistinguishable from real ones.** `?room=roomN`
   (main.ts:91) is unflagged in the payload. Tom's own playtests will
   silently pollute every metric.

Recommended stack: **PostHog for discrete gameplay events** —
gives funnels, drop-off, retention, and feature-flag-driven A/B with no
dashboard-building — plus a **Cloudflare Worker → R2 JSONL sink for the
high-volume position/perf firehose**, which feeds a path-replay overlay in
the existing map viewer. Rationale and the volume math are in §5.

Honest expectation-setting on A/B: at prototype traffic levels (§6.4), only
early-funnel experiments will ever reach significance. Everything deeper
should be tuned from observational telemetry, not A/B tests.

---

## 1. What exists today

### 1.1 The transport (`src/game/telemetry.ts`, 98 lines)

Genuinely well-built for its size:

- Batches events into an in-memory queue; each row auto-stamped with
  `name, t, room, x, z, pills` (telemetry.ts:34–45) so rows are
  self-describing without joins. This is the right instinct.
- `flush()` POSTs `{version, session, events}` to `VITE_TELEMETRY_URL`, with
  `navigator.sendBeacon` on unload and `keepalive: true` otherwise
  (telemetry.ts:47–71). Correct handling of the hard part.
- `start()` emits `session_start` with UA / screen / coarse-pointer,
  samples a `pos` event every `TUNING.telemetry.positionSampleMs` (2s),
  and flushes on `pagehide` + `visibilitychange→hidden` (telemetry.ts:73–97).
  Covering both unload paths is right — mobile Safari fires them
  inconsistently.

### 1.2 Coverage

31 event names, instrumented across every room:

| Area | Events |
|---|---|
| Session | `session_start`, `pos`, `quit` |
| Progression | `room_enter`, `room_complete` (+`duration_s`) |
| Core mechanic | `shift` (+`direction`), `pills_empty`, `medication_expired` |
| Pill economy | `dispenser_used`, `pill_pickup` |
| Threat | `orderly_spotted`, `orderly_chase`, `orderly_caught`, `orderly_escalation` |
| Keypads | `keypad_open`, `keypad_denied`, `keypad_success` |
| Doors/locks | `door_opened`, `door_refused`, `shape_lock_success` |
| Room-specific | `walls_closing`, `wall_crushed`, `gate_open`, `gate_close`, `light_switch`, `wing_power_set`, `push`, `push_blocked`, `coat_gate_nudge`, `coat_pill_found`, `chains_seen` |

Progression is a clean linear chain — `room1 → room2 → … → room20 → END`,
one exit each — which makes the funnel analysis trivially well-defined.
That's a significant advantage over most games.

---

## 2. Audit findings

Ordered by impact on the questions Tom actually wants answered.

### Blocking — nothing works without these

**F1. No endpoint configured.** `VITE_TELEMETRY_URL` (telemetry.ts:53) is
unset; there is no `.env`, and `.github/workflows/deploy.yml` sets no build
env. Every event currently `console.log`s. *Zero data is being collected.*

**F2. No `game_complete` event.** `endOfBuild()` (main.ts:301–319) sets
`ended`, flushes, shows the end card — but emits nothing. The headline
metric has no event. `room20`'s `room_complete` is a usable proxy, but
implicit proxies rot; and it can't carry the run summary (total time,
total catches, pills remaining) that makes a completion row worth having.

**F3. No persistent player id; runs are unlinkable.** `makeSessionId()`
(telemetry.ts:26) generates a fresh UUID per page load. READMIT calls
`location.reload()` (main.ts:317), so *a player who finishes and replays
looks like two unrelated strangers*. Consequences: no retention metric, no
"did they retry after quitting", no stable A/B bucket, and completion rate
is computed over an inflated session denominator.

**F4. Dev/playtest sessions are unmarked.** `?room=roomN` (main.ts:91–92) is
deliberately not gated to DEV — Tom playtests on built Pages/tailnet builds.
Nothing in the payload records that the session started mid-game with a
free pill and `canShift` granted (main.ts:109–117). Without a
`jumped_to_room` field and a filterable `debug` flag, Tom's own sessions
corrupt every funnel he looks at.

**F5. Pre-start bounces are entirely invisible.** `telemetry.start()` only
runs inside the ADMIT ME callback (main.ts:342). A player who loads the
page, looks at the start overlay, and leaves logs *nothing* — not even the
`pagehide` handler, which isn't installed yet. On itch this is the single
largest audience segment and currently a blind spot. Need a `page_load`
event at boot, with `session_start` (ADMIT ME) as a separate step.

### High — measurement quality

**F6. Flush is purely event-driven.** Flushes happen on room enter/complete
(main.ts:284–306), unload, and tab-hide. A player stuck in room 12 for 20
minutes buffers ~600 `pos` events in memory with no intermediate write. A
tab crash, OOM kill, or mobile background-eviction loses the whole
stretch — i.e. *data loss is biased toward exactly the stuck sessions you
most want to study*. Needs a time-based (≈15s) and size-based (≈50 events)
flush trigger.

**F7. Unbounded queue.** No cap on `queue`. Pathological long sessions grow
without limit and then attempt one enormous beacon (`sendBeacon` silently
fails over ~64KB). Cap + drop-oldest-with-counter.

**F8. `pos` samples lack `level` and `yaw`.** The snapshot
(main.ts:139–144) captures `x, z` only. Room 17 is genuinely two-storey
(`player.level`, main.ts:361) — a flat XZ heatmap of it merges the balcony
and the floor below into nonsense. `yaw` is what turns a heatmap into
"what were they looking at while they stood still for 40 seconds".

**F9. No idle detection.** `room_complete.duration_s` (main.ts:290–292)
counts AFK time. Someone who alt-tabs for lunch in room 8 registers as
catastrophically stuck. Needs an input-activity gate feeding a separate
`active_s` alongside wall-clock `duration_s`.

**F10. `keypad_denied` carries no payload.** Every call site passes a bare
`onDenied: () => ctx.telemetry.event('keypad_denied')` (kit.ts:473, and
duplicated in rooms 2, 5, 6, 7, 8, 9, 10, 12). No attempt index, no entered
digits, no indication whether `randomizeCodes` was on. This collapses three
completely different player states into one event: a typo, never having
found the clue, and having found *the wrong room's* clue. Logging the
entered value (4 digits, not PII) makes the difference readable.

**F11. Keypad abandonment isn't instrumented.** `KeypadOptions.onClose`
(keypad.ts:5) is unlogged. Opening a keypad, failing, and walking away is
one of the strongest "stuck" signals in the game and it's currently silent.

**F12. `room_complete` carries only duration.** Reconstructing "how did this
room go" requires stitching the raw event stream per session — painful in
any analytics UI. A rollup (`catches`, `shifts`, `pills_used`,
`keypad_fails`, `distance_m`, `med_left_on_exit`) turns per-room analysis
into a single-row query. This is the highest leverage change in the whole
document for day-to-day usefulness.

**F13. Scripted state changes aren't logged.** Only the manual Q press emits
`shift` (main.ts:246). `forceState()` (state.ts:46) — the catch penalty
(kit.ts:1109), room 13's forced-lucid entry, tutorial beats — emits nothing.
So total lucid time and "how much of the player's lucidity was chosen vs
imposed" cannot be reconstructed.

**F14. Medication pressure is unmeasured on success.** `medication_expired`
fires (main.ts:189), but the interesting number is the *survivor* case: how
much meter was left when the room was cleared. 2 seconds spare means tense;
30 means the 45s `durationSec` (tuning.ts:20) is doing nothing. Directly
actionable for tuning.

**F15. `dispenser_used` doesn't log the refused case.** interaction.ts:52–55
rejects a top-up when already at max and only toasts. A player repeatedly
mashing E on a full dispenser is a legible UI-confusion signal, discarded.

### Medium — operability and hygiene

**F16. `BUILD_VERSION` is hand-maintained.** `'wardb-0.2.0-m1'`
(tuning.ts:2). It *will* go stale, and when it does, before/after tuning
comparisons and A/B arms silently mix builds. Inject the git SHA at build
time via Vite `define`.

**F17. No error capture.** No `window.onerror`, no `unhandledrejection`, no
`webglcontextlost` handler. Ward B is a three.js app about to ship to
unknown GPUs, drivers, and browsers inside an iframe. If 5% of itch players
get a black screen, the current setup reports that as "they bounced".

**F18. No performance sampling.** No FPS, no load timing. A grey-box scene
on integrated graphics inside an itch iframe is a real risk, and "the game
ran at 12fps" is indistinguishable from "the puzzle was too hard" in the
current data.

**F19. Thin session context.** `session_start` (telemetry.ts:75–80) has UA,
screen, coarse-pointer. Missing: `document.referrer` (itch vs Pages vs
direct — the only way to segment the two deployments of one bundle),
`location.hostname`, `window.self !== window.top` (itch embed detection),
`devicePixelRatio`, `navigator.language`, `navigator.hardwareConcurrency`.

**F20. Event names are a stringly-typed free-for-all.** 28 names raised via
`ctx.telemetry.event('...')` with no registry, no union type, no lint. A
typo ships silently and simply never appears in the dashboard. Worse,
existing names already collide semantically with different shapes:
`gate_open` is `{byOrderly: boolean}` in room14.ts:160 but `{gate: 1}` in
room20.ts:447. A `TelemetryEvent` discriminated union in one file fixes both
problems at compile time.

**F21. Orderly instrumentation is duplicated 15+ times.** Only rooms 15–19
use `makeOrderlyRoomScript` (kit.ts:1093–1115), which instruments
spotted/chase/caught for free. Rooms 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 20
hand-roll identical `ctx.telemetry.event('orderly_*')` calls. Every future
change to threat telemetry means editing 11 files, and drift is inevitable.

**F22. No consent notice or opt-out.** The payload includes the full UA
string and fine-grained behavioural data, and itch has EU players. Low legal
risk for an anonymous prototype, but it needs a line on the start screen and
a `?notrack=1` / localStorage kill switch — both cheap, and both things that
are far more awkward to retrofit after launch.

---

## 3. What to measure — the metrics that matter

This section answers "what do game developers typically look for", framed
around Ward B specifically.

### 3.1 The progression funnel — the single most important chart

For a linear game, the standard artefact is a **drop-off curve**: what
fraction of players reach each room. It's one chart and it tells you more
than everything else combined.

```
page_load → session_start (ADMIT ME) → room1 … room20 → game_complete
```

What you read off it:

- **The cliff.** One room where the curve falls off a shelf is a broken or
  unfair room. This is *the* output of the whole exercise.
- **The slope.** Steady 5%/room attrition is normal fatigue; that's a
  length problem, not a design problem, and the fix is different.
- **Bounce (page_load → session_start).** On itch, expect a large fraction
  to never press ADMIT ME. Driven by the page, the screenshots, and load
  time — not the game.
- **Tutorial survival (session_start → room3).** If people press start and
  quit inside two rooms, the problem is onboarding, not content. For a game
  built on one non-obvious verb (Q), this is the number to watch.

**Benchmark reality check:** for a free browser prototype on itch, a 5–15%
full-completion rate on a 20-room game would be respectable. Do not read a
low number as failure — read the *shape* of the curve.

### 3.2 "Do players get stuck?" — friction metrics

Stuck is not one signal; it's a cluster. Instrument all of them and treat
co-occurrence as the real evidence:

| Signal | Event/field | What it means |
|---|---|---|
| Time in room, p90 vs median | `room_complete.duration_s` | High spread = some players flounder where others walk through. **The ratio matters more than either number.** |
| Active vs wall-clock time | `active_s` (F9) | Separates "thinking hard" from "went to make tea" |
| Wrong keypad entries | `keypad_denied` + attempt index (F10) | Clue not found vs clue misread |
| Keypad open→abandon | `keypad_close` w/o success (F11) | Found the lock, no idea about the key |
| Catches before clear | `orderly_caught` count per room | Difficulty vs comprehension |
| Distance walked ÷ room area | derived from `pos` | High = pacing/searching. **The classic "lost" signal.** |
| Backtracking / revisit density | derived from `pos` | Circling the same 3m² = confusion |
| Quit-in-place | `quit` with room + position | Where sessions actually die |

**The one that beats all of them: quit location.** `quit` already stamps
room and x/z (telemetry.ts:36–44). Plot every session's final position on
the room map and the answer to "where does this game lose people" is
literally a picture. This costs nothing beyond what's already logged.

### 3.3 "Do players try different things?" — mechanic adoption

Ward B lives or dies on whether players understand and use the shift. Worth
measuring precisely:

- **Shift rate per room** (`shift`, incl. F13's scripted shifts). A room
  where nobody voluntarily shifts is a room whose puzzle isn't reading.
- **Shift-blind sessions** — players who never press Q after the tutorial
  grants it. If this is non-trivial, the core hook isn't landing.
- **Lucid share of playtime** — from shift transitions + `medication_expired`.
  Is lucidity a tool or a panic button?
- **Voluntary vs forced lucidity** — needs F13.
- **`pills_empty`** (main.ts:251) — attempted a shift with no pill. A pure
  measure of economy pressure. High counts in one room = dispenser
  placement problem.
- **Meter margin on success** (F14) — is the 45s doing work?
- **Branch split** — `wing_power_set` (room18.ts:229): LIGHTS vs DOORS. Both
  the split *and* whether choice correlates with completion. If it's 50/50
  and outcomes match, it's a real choice; if it's 95/5, it's a trick
  question.
- **Optional-content engagement** — `chains_seen`, `coat_pill_found`,
  `push_blocked`. Do players poke at things, or beeline?
- **Settings adoption** — `randomizeCodes` (settings.ts). Already a live
  toggle, currently unlogged in any event payload.

### 3.4 Technical health — the metrics that catch invisible disasters

For a WebGL game shipping to strangers' hardware, these outrank most design
metrics because they invalidate everything else:

- **JS errors and WebGL context loss** (F17), with room + build + UA
- **FPS distribution** — p50 and p10, sampled per room (F18)
- **Load time to first frame**
- **Device/browser/GPU mix**, mobile vs desktop share
- **Touch-control usage** — the game has full mobile controls (index.html
  `#stick`, `#btnAct`); nobody currently knows if they work in the wild

### 3.5 The derived numbers to actually report

A weekly one-pager:

1. Sessions, unique players, itch vs Pages split
2. Bounce rate (page_load → ADMIT ME)
3. Drop-off curve, all 20 rooms
4. Completion rate + median completion time
5. Top 3 rooms by median duration and by catches/session
6. Shift-blind session %
7. Error rate and p10 FPS
8. Quit heatmap for the worst-performing room

---

## 4. Instrumentation plan

### 4.1 Identity model (fixes F3)

Three ids, all client-generated, all anonymous:

- `player_id` — UUID in `localStorage['wardb-player-v1']`, survives reloads
  and return visits. Enables retention and stable A/B bucketing.
- `session_id` — per page load (what exists today).
- `run_index` — increments per READMIT within a player. Distinguishes a
  replay from a first attempt.

No PII, no fingerprinting, no cookies. Clearing site data resets it — which
is correct behaviour.

### 4.2 New events

| Event | When | Payload |
|---|---|---|
| `page_load` | at boot, before start overlay (F5) | full session context (F19) |
| `game_complete` | `endOfBuild()` (F2) | `total_s`, `active_s`, `catches`, `shifts`, `pills_used`, `deaths`, `run_index` |
| `room_summary` | merged into `room_complete` (F12) | `duration_s`, `active_s`, `catches`, `shifts`, `pills_used`, `keypad_fails`, `distance_m`, `med_left` |
| `keypad_close` | keypad dismissed w/o success (F11) | `attempts`, `best_prefix_len` |
| `error` | window.onerror / unhandledrejection / context-lost (F17) | `msg`, `stack_head`, `room` |
| `perf` | every 30s (F18) | `fps_p50`, `fps_p10`, `frames` |
| `idle_start` / `idle_end` | >20s no input (F9) | `idle_s` |
| `settings_change` | config panel toggled | `key`, `value` |

### 4.3 Enriched payloads

- Every event gains `player_id`, `run_index`, `variant` (§6), `debug`
  (F4).
- `pos` gains `level` and `yaw` (F8).
- `keypad_denied` gains `attempt`, `entered`, `randomized` (F10).
- `shift` fires for `forceState` too, with `source: 'manual'|'scripted'|'catch'|'expiry'` (F13).
- `session_start` gains referrer, hostname, in-iframe, DPR, language,
  hardwareConcurrency (F19).

### 4.4 Transport hardening

- Time-based flush (15s) + size-based flush (50 events) (F6)
- Queue cap at 500 with a `dropped` counter (F7)
- Retry-once on failed POST; drop silently after
- `TelemetryEvent` discriminated union in `telemetry.ts`, replacing raw
  strings (F20)
- Move all orderly telemetry into `makeOrderlyRoomScript` and migrate the 11
  hand-rolled rooms onto it (F21) — separate refactor, do after the rest
- `?notrack=1` and a localStorage opt-out (F22)
- Git SHA injected via Vite `define` (F16)

---

## 5. The receiving end — tooling

Tom is the only analyst, is not a data engineer, and wants to *read*
results rather than build a pipeline. That constrains the choice more than
anything technical.

### 5.1 Decided architecture (2026-07-26)

**Dual-write, with a cheap always-up front door and the Mac Mini as the
system of record.** Decided with Tom; supersedes the earlier
single-backend sketch.

```
                      ┌────────────────────────────┐
  game client ──POST──▶  Cloudflare Worker (public) │
  (dual-write)         └──────┬──────────────┬──────┘
                              │              │
              all events ─────▼              ▼───── discrete events only
                        R2 / D1  (raw JSONL)      PostHog EU (dashboards)
                              │
                    scheduled pull (Windmill on the Mini)
                              ▼
                    Mac Mini local archive + map-viewer replay
```

**Two principles, both load-bearing:**

**(1) Dual-write, never fail over.** Failover logic is the thing that
silently breaks — and it breaks precisely when you're not looking. Instead
the Worker unconditionally writes *every* event to raw storage, and
*separately* mirrors only discrete events to PostHog. Consequence: PostHog
is a **dashboard, not a database**. If the 1M/month tier is ever exhausted,
mirroring stops and we lose dashboard freshness — **never data**, because
the raw sink already holds 100% of every event, always. No failover path, no
gap to detect, no reconciliation.

**(2) The Mini pulls; it does not listen.** The Mini is tailnet-only
(`tailscale serve` on 443/8443/8444/8843/10000, all `tailnet only` — verified
2026-07-26), so itch players on the public internet cannot reach it at all.
Tailscale Funnel could expose it, but Funnel only supports ports 443 / 8443 /
10000 and **all three are occupied** (Windmill, Uptime Kuma, steam-intel).
Beyond the port problem, making a home Mac Mini the public write endpoint
would (a) expose home infrastructure to unauthenticated writes from
strangers and (b) make the durability guarantee depend on the least reliable
link in the chain — residential internet and a machine that reboots. Pulling
inverts both problems. `~/infra` already runs Windmill, which is a job
scheduler, so the sync job has a natural home.

**Volume math — why positions never go to PostHog:**

- Discrete events: ~40/session → 1M/mo covers ~25,000 sessions. Ample.
- Add `pos` at 2s sampling over a 20-minute session: ~600/session → 1M/mo
  covers ~1,500 sessions. Positions would consume the entire quota for data
  no funnel tool can use anyway.

**Storage math — why the firehose is worth keeping (F8 stays in scope):**

| | raw JSONL | gzipped |
|---|---|---|
| One 20-min session, `pos` @2s + level + yaw | ~60 KB | ~6 KB |
| 1,000 sessions | ~60 MB | ~6 MB |
| 10,000 sessions | ~600 MB | ~60 MB |

Position JSONL is highly repetitive and compresses ~10:1. Storage is a
non-issue at any traffic level this prototype will plausibly see.

**PostHog, specifically:** free tier — 1M events/mo, 5k session
replays, 1M feature-flag requests, **no credit card required** (verified
2026-07-26). *Do not add a card*: without one there is no billing surface at
all, and ingestion simply stops at the ceiling rather than charging. Fed by
plain `fetch` to the capture endpoint — no SDK, no bundle cost. Gives
funnels, retention and flag-driven A/B as UI operations rather than SQL.
**Expectation to set:** PostHog session replay is DOM-based and will be
useless on a WebGL canvas — don't count on it.

**Path replay in the existing map viewer** — the highest-value bespoke
tooling, and it's mostly already built. `map.html?room=<id>`
(`src/devtools/map.ts`, 713 lines) already renders any room top-down with
geometry, patrols, and sight envelopes. Adding "load a JSONL of `pos`
samples from the local archive and draw session paths + quit markers + a
catch heatmap over it" is a contained addition to a tool that exists — and
it's the thing no off-the-shelf product will ever do. Watching ten real
players' paths through room 12 will teach more than any dashboard.

### 5.1a Client-side durability

Because the raw sink is the system of record, the client should not drop a
batch just because one POST failed:

- Failed batches go to a capped (~100 KB) localStorage buffer under
  `wardb-telemetry-retry-v1`, re-sent on the next `page_load`.
- The two writes are independent `fetch` calls; neither blocks or cancels
  the other.
- Combined with F6's time/size-based flush, this closes the "stuck player's
  tab crashed" data-loss path identified in the audit.

### 5.2 Rejected alternatives

- **Google Analytics 4** — free, but a hostile fit: awkward event model,
  sampling, event-name caps, no usable per-session path analysis, and it
  imports the entire consent-banner problem. Not worth it.
- **GameAnalytics** — genuinely game-shaped (progression/resource/error
  events map almost 1:1 onto Ward B's needs) and free. Loses on query
  flexibility and has no A/B. Reasonable fallback if PostHog feels heavy.
- **Plausible / Umami** — page analytics. Can't express a 20-step funnel.
- **Supabase / Postgres** — fine, but it's "build your own dashboards",
  which is the work we're trying to avoid.
- **Roll-your-own only** — tempting and cheap, but every hour spent building
  a funnel chart is an hour not spent on the game.

### 5.3 CORS and the itch sandbox

itch.io serves HTML5 games from a sandboxed CDN origin, **not** from
`itch.io`. The exact host varies. So:

- Set `Access-Control-Allow-Origin: *` on the collector. The payload is
  anonymous and carries no credentials, so this is safe.
- Handle `OPTIONS` preflight (a JSON content-type POST triggers it).
- Don't try to allowlist the itch origin — it will break.
- Segment itch vs Pages traffic using `document.referrer` and
  `location.hostname` from F19, not by origin.

---

## 6. A/B testing

### 6.1 Mechanism

itch has no A/B facility. Assignment must be client-side (or flag-driven
from PostHog), keyed on the persistent `player_id` from §4.1:

- Assign once, on first `page_load`, persist to localStorage
- Stamp `variant` on **every** event
- Stamp `build` (git SHA, F16) on every event and **never pool results
  across builds** — a mid-experiment tuning change silently invalidates the
  arm
- Ship a forced-variant override (`?variant=b`) for testing

### 6.2 Candidate experiments, in priority order

1. **Room 1 tutorial explicitness** — does a more direct teach of Q raise
   room1→room3 survival? Highest traffic, highest leverage, most likely to
   reach significance.
2. **Start-screen copy** — affects bounce, which has the largest n of any
   metric in the game.
3. **`pills.max` 1 vs 2** (tuning.ts:13) — the core economy dial.
4. **`medication.durationSec` 45 vs 60** (tuning.ts:20) — tension vs
   frustration.
5. **`randomizeCodes` default on/off** — already implemented as a setting;
   the cheapest experiment available.
6. **Objective HUD text on/off** — how much hand-holding does the game need.

### 6.3 One experiment at a time

With a single linear funnel and modest traffic, concurrent experiments
interact and neither resolves. Run one, decide, ship, run the next.

### 6.4 The honest constraint — read this before planning any test

Detecting a completion-rate lift from 20% → 30% (a *large* effect) at 80%
power and 5% significance needs **≈300 sessions per arm — ~600 total**.

A new, unpromoted itch prototype typically sees tens to low hundreds of
plays in its first weeks. So:

- **Early-funnel metrics** (bounce, room1→room3) accumulate n fastest and
  are the only place A/B is realistically viable soon.
- **Deep metrics** (completion rate) will likely *never* reach significance
  at this traffic. Tune those from observational telemetry — the drop-off
  curve, quit heatmaps, and time-per-room spreads — which need no
  statistical power to be informative.
- Build the bucketing infrastructure now because it's cheap and awkward to
  retrofit. Just don't expect it to be the main source of answers.

**The single most valuable measurement activity for a prototype at this
stage is not A/B testing — it's watching the drop-off curve and the quit
heatmap, then fixing the cliff.**

---

## 7. itch.io briefing

Tom hasn't used itch before. The mechanics that matter here:

### 7.1 Publishing an HTML5 game

- Dashboard → **Create new project**; set **Kind of project: HTML**.
- Upload a zip of `dist/` with `index.html` **at the zip root** (not inside
  a folder), and tick **"This file will be played in the browser"**.
- `vite.config.ts` already sets `base: './'` with an itch comment — the
  build is correctly configured for this. No change needed.
- **Embed options:** set viewport dimensions (≈960×600 is a sane default),
  enable the **fullscreen button** (important for a first-person game), and
  tick **mobile friendly** — Ward B ships real touch controls.
- **Pricing:** free, or "name your own price". Free for a prototype.
- **Visibility:** Draft → Restricted → Public. **Restricted gives a
  shareable secret link** — use that phase to verify telemetry actually
  lands from the itch sandbox origin before going public.

### 7.2 What itch's own analytics gives you

itch has an Analytics tab per project with **page views, browser plays,
downloads, referrer sources, and countries**. It is entirely **page-level**:
it can tell you people arrived and pressed play, and nothing about what
happened inside the iframe. There's also a field to attach a Google
Analytics property to the *page* (not the game).

**There is no shared identifier between itch's analytics and your in-game
data**, so treat them as two separate systems. The one genuinely useful
join is the ratio:

> itch "browser plays" ÷ your `page_load` count → sanity-check the collector
> is catching everyone
>
> your `session_start` ÷ your `page_load` → the real bounce rate

### 7.3 Traffic expectations

An unpromoted prototype gets very little organic traffic. What moves it:
accurate tags, a good cover image and screenshots, **devlogs** (they surface
in itch feeds and are the main organic reach lever), participating in a
jam, and external links. Plan the measurement design around small n from
the start — §6.4 is not pessimism, it's the operating condition.

### 7.4 Gotchas

- **localStorage is available but namespace everything.** The existing
  `wardb-settings-v1` key (settings.ts) already follows this; keep
  `wardb-player-v1` and any variant key on the same convention.
- **Same bundle, two homes.** GitHub Pages and itch will serve identical
  builds. Without F19's referrer/hostname capture, the two audiences are
  indistinguishable in one dataset — and they behave very differently.
- `sendBeacon` and `fetch(keepalive)` both work inside the itch iframe.

### 7.5 Release pipeline (decided 2026-07-26)

Today `main` → Pages is the only automated path, and CLAUDE.md's hard rule
is that pushing to `main` publishes publicly. Adding itch to that same
trigger would mean every merge ships to players with no staging step. So:

```
main     →  GitHub Pages + tailnet   (staging / playtest — today's behaviour, unchanged)
release  →  itch.io via butler       (merge main → release when happy)
```

- `butler push dist lucy-holm/ward-b:html5`, authenticated by a
  `BUTLER_API_KEY` GitHub Actions secret (itch.io → Settings → API keys).
- Add `workflow_dispatch` to the itch job as a manual escape hatch.
- **One-time manual setup butler cannot do** (verified against itch docs):
  set the project kind to **HTML** (defaults to Downloadable), and after the
  first push, tick the channel as **"playable in browser"** on the Edit game
  page. Until both are done the uploaded build won't run.
- butler has **no** commands for description, tags, or screenshots — those
  are dashboard-only. Plan: author the metadata copy into a version-
  controlled file in the repo and paste it once.
- Screenshots *are* automatable: `?room=roomN` (main.ts:91) already boots
  the built bundle straight into any room, so a Playwright script can walk
  the room list and capture the canvas. Needs WebGL flags for headless
  Chromium. Caveat: it's a greybox, so the output will look like grey boxes.

**Knock-on for telemetry:** this creates a *third* environment. Sessions
will now arrive from localhost, Pages, and itch into one dataset. Every
event must carry an `env` field derived from `location.hostname` at runtime
(not a build-time `define` — one bundle serves Pages and itch). Without it
the funnel silently mixes Tom's own testing with real players. This
upgrades F19 from nice-to-have to mandatory.

---

## 8. Phasing

**Phase 0 — pipeline** (~2h)
Cloudflare Worker (CORS `*`, OPTIONS preflight, body-size cap, write key,
raw write + PostHog mirror). `release` branch + butler job in
`deploy.yml` (§7.5). Git-SHA build version (F16), `env` from hostname
(F19), `debug` flag for `?room=` jumps (F4). Point
`VITE_TELEMETRY_URL` at the Worker. Verify events land from a
**Restricted** itch build before going public.

**Phase 1 — close the correctness gaps** (~1 day)
F2, F3, F5 (identity + the missing headline events), F6/F7 + §5.1a (flush
hardening + retry buffer), F12 (room summary rollup), F22 (opt-out).

**Phase 2 — the diagnostic layer** (~1 day)
F8, F9, F10, F11, F13, F14, F15, F17, F18. Then the PostHog dashboard, the
Windmill pull job into the Mini archive, and the map-viewer path replay
(§5.1).

**Phase 3 — experiments** (~half a day + ongoing)
Variant assignment, stamping, forced-override, and experiment #1 (§6.2) —
subject to the power constraint in §6.4.

**Phase 4 — hygiene, non-blocking**
F20 (typed event union), F21 (deduplicate orderly telemetry into the kit
factory).

Phases 0 and 1 must land before the itch release. 2–4 can follow while data
accumulates.

### 8.1 Blocked on Tom (accounts — I can't sign up on your behalf)

| Needed | Where | Used for |
|---|---|---|
| itch project created, kind **HTML** | itch.io dashboard | butler target `lucy-holm/ward-b:html5` |
| `BUTLER_API_KEY` | itch.io → Settings → API keys | GitHub Actions secret |
| PostHog project API key + **the region it was created in** | posthog.com (**no card**) | Worker's mirror step |
| Cloudflare account | dash.cloudflare.com | Worker + raw storage |

Everything else — Worker source, client changes, workflow YAML — can be
written first and takes these as configuration.
