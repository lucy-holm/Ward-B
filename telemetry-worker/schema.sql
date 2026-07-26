-- Ward B telemetry — D1 schema
--
-- System of record for every event the game client sends. One row per
-- event (a batch of N events explodes into N rows). Nothing here is ever
-- skipped or gated on PostHog mirroring succeeding — see src/index.ts.
--
-- Apply with:
--   wrangler d1 execute wardb-telemetry --remote --file=./schema.sql
-- (drop --remote to apply to your local dev DB instead)

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ingested_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  session     TEXT,
  player      TEXT,
  run         INTEGER,
  env         TEXT,
  debug       INTEGER,          -- 0/1
  version     TEXT,
  name        TEXT,
  t           INTEGER,          -- client-side event timestamp (ms)
  room        TEXT,
  x           REAL,
  z           REAL,
  data        TEXT NOT NULL     -- full event JSON, so no field is ever lost
);

CREATE INDEX IF NOT EXISTS idx_events_session      ON events (session);
CREATE INDEX IF NOT EXISTS idx_events_name         ON events (name);
CREATE INDEX IF NOT EXISTS idx_events_ingested_at  ON events (ingested_at);
