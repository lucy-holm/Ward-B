# Ward B telemetry collector — setup runbook

> **Deployed 2026-07-26.** Live endpoint:
> `https://wardb-telemetry.xmyysdxrjr.workers.dev`
> — D1 database `wardb-telemetry`, schema applied, `POSTHOG_KEY` secret set,
> `WRITE_KEY` deliberately unset (see step 5). Health check:
> `curl https://wardb-telemetry.xmyysdxrjr.workers.dev/health`
>
> This is the value for the `TELEMETRY_URL` GitHub Actions *variable*.
> The steps below are the from-scratch runbook, kept for rebuilding or
> for standing up a second environment.

This is a Cloudflare Worker that receives telemetry batches from the game
client, writes every event to a D1 database (the permanent system of
record), and mirrors a filtered subset to PostHog for dashboards. Read
`docs/superpowers/specs/2026-07-26-telemetry-and-measurement-design.md`
§5.1 in the main repo for the "why" behind this shape.

You have a Cloudflare account but haven't deployed a Worker before — this
doc assumes that and spells out every command.

> **⚠ Run every command in this file from `telemetry-worker/`, not the repo
> root.** The `npm run db:*` scripts live in *this* directory's
> `package.json`. Running them from the repo root fails with
> `Missing script: db:schema`, because the root `package.json` only has the
> game's own scripts (`dev`, `build`, `preview`, `check:rooms`).

## 0. Prerequisites

- Node.js installed (any recent LTS).
- A free Cloudflare account (dash.cloudflare.com).

Get into the right directory and install dependencies once:

```
cd telemetry-worker
npm install
```

## 1. Log in to Cloudflare

```
npx wrangler login
```

This opens a browser tab to authorize Wrangler (the Cloudflare CLI)
against your account. Approve it.

## 2. Create the D1 database

```
npx wrangler d1 create wardb-telemetry
```

This prints something like:

```
[[d1_databases]]
binding = "DB"
database_name = "wardb-telemetry"
database_id = "a1b2c3d4-....-....-....-............"
```

Copy the `database_id` value.

## 3. Paste the database_id into wrangler.toml

Open `wrangler.toml` in this directory and replace the placeholder:

```toml
database_id = "00000000-0000-0000-0000-000000000000" # replace me — see README step 3
```

with the real `database_id` from step 2. Save the file.

## 4. Apply the schema

This creates the `events` table and its indexes on the *remote* (real,
hosted) database:

```
npm run db:schema
```

That's `wrangler d1 execute wardb-telemetry --remote --file=./schema.sql`
under the hood. If you want a local database for testing with
`wrangler dev` first, also run:

```
npm run db:schema:local
```

## 5. Set secrets

Both are optional — the Worker works without either (PostHog mirroring is
skipped without a key; the write-key check is skipped without a key). Set
them when you're ready:

```
npx wrangler secret put POSTHOG_KEY
```

Paste your PostHog **project API key** when prompted (from
posthog.com → Project Settings → the project you created — see §5.1 of
the design doc for why no-card). Skip this step if you haven't
set up PostHog yet; you can add it later without redeploying code.

> **Filter `debug = false` on every PostHog insight you build.** Sessions
> started via the `?room=<id>` dev jump are tagged `debug: true` and *are*
> mirrored to PostHog — deliberately, so you can verify the pipeline end to
> end using your own playtests. But those sessions begin mid-game with a
> free pill and shift already unlocked, so they are not representative of a
> real playthrough. Any funnel or completion-rate number that doesn't
> exclude them is wrong. The cleanest fix is to set up the filter once on a
> saved cohort and build insights against that.

```
npx wrangler secret put WRITE_KEY
```

> **⚠ SKIP THIS STEP. Setting `WRITE_KEY` today will silently break all
> ingestion.** The Worker would start requiring an `X-Ward-Key` header, and
> **the game client does not send one** — every batch would 401 and every
> event would be lost. Leave it unset.
>
> It's deliberately left unwired rather than implemented, because a shared
> key can't actually protect a public browser game: the client is
> downloadable JavaScript, so any key it holds is readable by anyone who
> opens devtools. It would be a speed bump against random scanning, not
> authentication. The protections that *do* work here are already active
> and need no configuration: the 256 KB body cap, the 1000-event batch cap,
> and Cloudflare's own DDoS layer in front of the Worker.
>
> If you ever do want it, it's a two-part change — set the secret *and* add
> the matching header to `flush()` in `src/game/telemetry.ts`. Never one
> without the other.

## 6. Deploy

> **One-time account step first.** A brand-new Cloudflare account has no
> `workers.dev` subdomain, and the first deploy fails with
> *"You need to register a workers.dev subdomain before publishing"*.
> Wrangler can only offer to create one interactively, so it can't be
> scripted. Open the onboarding page it prints — or
> `dash.cloudflare.com` → **Workers & Pages** → **Compute (Workers)** —
> and pick a subdomain. Any name; it becomes the middle part of your
> Worker's URL. Then re-run the deploy.

```
npm run deploy
```

Wrangler prints the deployed URL, something like:

```
https://wardb-telemetry.<your-subdomain>.workers.dev
```

That's the URL to paste into the game's build config as
`VITE_TELEMETRY_URL` (see the main repo — that env var currently defaults
to unset, which makes every event just `console.log` and die).

## 7. Verify end-to-end

### 7a. Post a fake batch

```
curl -i -X POST https://wardb-telemetry.<your-subdomain>.workers.dev/ \
  -H "Content-Type: application/json" \
  -d '{
    "version": "wardb-test",
    "session": "curl-test-session",
    "player": "curl-test-player",
    "run": 0,
    "env": "test",
    "debug": true,
    "events": [
      { "name": "session_start", "t": 1700000000000, "room": "room1", "x": 1.5, "z": 2.5 },
      { "name": "keypad_denied", "t": 1700000001000, "room": "room1", "attempt": 1 }
    ]
  }'
```

(If you ignored the warning in step 5 and set `WRITE_KEY` anyway, this
curl needs `-H "X-Ward-Key: <your key>"` — and so would the game, which
is exactly why you shouldn't set it.)

Expect `{"ok":true,"written":2}` and HTTP 200.

### 7b. Check the row count

```
curl https://wardb-telemetry.<your-subdomain>.workers.dev/health
```

Expect something like `{"ok":true,"rows":2}`.

### 7c. See the actual rows land in D1

```
npx wrangler d1 execute wardb-telemetry --remote \
  --command="SELECT id, ingested_at, session, player, name, room, x, z FROM events ORDER BY id DESC LIMIT 20"
```

### 7d. If you set POSTHOG_KEY, check PostHog

Open your PostHog project → Activity / Live Events. The `session_start`
and `keypad_denied` events from the curl test should appear within a few
seconds, tagged with `distinct_id: curl-test-player`. (Reminder: `pos` and
`perf` events are deliberately never mirrored — they'll show up in D1 but
never in PostHog. That's by design, see §5.1's volume math.)

## 8. Point the game at it

In the main Ward B repo (not this directory), set the build-time env var
`VITE_TELEMETRY_URL` to the `*.workers.dev` URL from step 6 — e.g. in
`.github/workflows/deploy.yml` or a local `.env` file, per however the
main repo's build pipeline is set up at the time. That's outside this
directory's ownership; hand this URL to whoever's wiring the client side.

## Day-to-day operations

- **Tail logs live:** `npm run tail` (or `npx wrangler tail`) — useful to
  watch requests arrive in real time, including PostHog mirror failures
  (logged, never surfaced to the client).
- **Re-run the schema after editing `schema.sql`:** the `CREATE TABLE IF
  NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` guards make `npm run
  db:schema` safe to re-run; it won't clobber existing data. For actual
  schema *changes* (new columns etc.) you'll need an `ALTER TABLE`
  migration — ask for help with that when it comes up.
- **Redeploy after code changes:** `npm run deploy`.

## Free-tier limits — what happens when you hit them

| Service | Free tier | What happens at the ceiling |
|---|---|---|
| Cloudflare Workers | 100,000 requests/day | Requests beyond the cap are rejected by Cloudflare (not this code) until the next day. No card on file, no surprise charge. |
| Cloudflare D1 | 5 GB storage, 5M rows read/day, 100k rows written/day (free tier, subject to Cloudflare's current published limits) | Writes beyond the daily cap start failing; the Worker returns 500 in that case and the game client's own retry/localStorage-buffer logic (client-side, not this Worker) holds the batch for next time. Storage is a non-issue at any traffic this prototype will plausibly see — see the design doc's storage math (~60KB/session raw). |
| PostHog Cloud | 1,000,000 events/month, no card required | Ingestion past 1M/month simply stops — **dashboards go stale, but no data is lost**, because D1 already has 100% of every event regardless of whether PostHog mirroring succeeded. This is the whole point of the dual-write design (§5.1 in the design doc): PostHog is a dashboard, not a database. |

If you ever add a payment method to any of these services, re-check their
current pricing pages first — the point of this setup is that none of it
requires one.

## Abuse protection built in

- Requests over 256 KB → `413`.
- Batches over 1000 events → `413`.
- Non-POST/OPTIONS/health-GET requests → `405`.
- If `WRITE_KEY` is set, missing/wrong `X-Ward-Key` header → `401`.
- CORS is wildcard (`Access-Control-Allow-Origin: *`) deliberately — itch.io
  serves games from a sandboxed CDN origin that changes, so allowlisting
  would break real players. The payload is anonymous and carries no
  credentials, so this is safe.

## Troubleshooting

- **`wrangler deploy` fails with a D1-related error:** double check the
  `database_id` in `wrangler.toml` matches what `wrangler d1 create`
  printed in step 2.
- **`/health` returns `"rows":null` with a note:** D1 itself errored on
  that request (rare/transient); check `npm run tail` for the logged
  error.
- **Events aren't showing up in PostHog but are in D1:** almost always a
  **region mismatch** — this is the failure mode that actually bit us on
  2026-07-26. Look at the PostHog app URL in your browser: if it's
  `us.posthog.com`, `POSTHOG_HOST` in `wrangler.toml` must be
  `https://us.i.posthog.com`; if it's `eu.posthog.com`, it must be
  `https://eu.i.posthog.com`. A key posted to the wrong region's ingest
  host **returns HTTP 200 `{"status":"Ok"}` and silently discards the
  events** — PostHog validates the key asynchronously, so there is no
  error to find anywhere. Redeploy after changing it.

  Failing that: confirm `POSTHOG_KEY` is set (`npx wrangler secret list`
  shows names, not values), and remember `pos`/`perf` events never mirror
  by design.
