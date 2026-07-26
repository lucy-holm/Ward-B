// Ward B telemetry collector — public front door for game telemetry.
//
// Behaviour, in priority order (see telemetry-worker/README.md for the
// operator runbook and docs/superpowers/specs/2026-07-26-telemetry-and-
// measurement-design.md §5.1 for the architecture rationale):
//
//   1. CORS — wildcard, because itch.io serves games from a sandboxed CDN
//      origin that varies per play. The payload is anonymous, no
//      credentials, so wildcard is safe here.
//   2. Write every event to D1, unconditionally. D1 is the system of
//      record; a PostHog failure must never affect this.
//   3. Mirror discrete events (never `pos` or `perf`) to PostHog EU, as an
//      independent, best-effort request that cannot fail the response.
//   4. Abuse protection: body-size cap, per-batch event cap, optional
//      shared write key.
//   5. Fast response, no 5xx on a mirror failure — the client uses
//      sendBeacon on unload and ignores the response body.
//   6. GET /health for a quick sanity check.

export interface Env {
  DB: D1Database;
  /** PostHog project API key. If unset, mirroring is silently skipped. */
  POSTHOG_KEY?: string;
  /**
   * PostHog ingest host, WITHOUT a trailing slash — must match the region
   * the project was actually created in, or events are silently dropped:
   *   US Cloud (app at us.posthog.com) -> https://us.i.posthog.com
   *   EU Cloud (app at eu.posthog.com) -> https://eu.i.posthog.com
   * Set in wrangler.toml [vars]. This bit us once: the project is on US
   * Cloud but the host was hardcoded to EU, so every mirrored event was
   * accepted-then-discarded with nothing visible in PostHog and no error
   * anywhere (the mirror deliberately swallows failures so a PostHog
   * problem can never cost us a D1 write). Configurable rather than
   * hardcoded so a region move is a config change, not a code change.
   */
  POSTHOG_HOST?: string;
  /** Optional shared write secret. If unset, all writes are accepted. */
  WRITE_KEY?: string;
}

const MAX_BODY_BYTES = 256 * 1024; // 256 KB
const MAX_EVENTS_PER_BATCH = 1000;
const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';
const NEVER_MIRROR = new Set(['pos', 'perf']);

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Ward-Key',
  'Access-Control-Max-Age': '86400',
};

interface RawEvent {
  name?: string;
  t?: number;
  room?: string;
  x?: number;
  z?: number;
  [key: string]: unknown;
}

interface BatchPayload {
  version?: string;
  session?: string;
  player?: string;
  run?: number;
  env?: string;
  debug?: boolean;
  events?: RawEvent[];
}

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      return handleHealth(env);
    }

    if (request.method === 'POST' && url.pathname === '/') {
      return handleIngest(request, env, ctx);
    }

    return json({ error: 'not found' }, 405);
  },
};

async function handleHealth(env: Env): Promise<Response> {
  try {
    const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM events').first<{ n: number }>();
    return json({ ok: true, rows: row?.n ?? 0 });
  } catch (err) {
    // D1 itself unreachable — still respond, just without the count.
    console.error('[telemetry] health check D1 error', err);
    return json({ ok: true, rows: null, note: 'D1 unavailable' });
  }
}

async function handleIngest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  // --- Abuse protection: shared write key -------------------------------
  if (env.WRITE_KEY) {
    const provided = request.headers.get('X-Ward-Key');
    if (provided !== env.WRITE_KEY) {
      return json({ error: 'unauthorized' }, 401);
    }
  }

  // --- Abuse protection: body-size cap -----------------------------------
  // Cheap short-circuit on the declared length, then verify against the
  // actual body since Content-Length can be absent (e.g. some beacon
  // paths) or wrong.
  const declaredLength = request.headers.get('Content-Length');
  if (declaredLength && Number(declaredLength) > MAX_BODY_BYTES) {
    return json({ error: 'payload too large' }, 413);
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
    return json({ error: 'payload too large' }, 413);
  }

  let payload: BatchPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const events = Array.isArray(payload.events) ? payload.events : [];
  if (events.length === 0) {
    // Nothing to do, but not an error — respond fast and cheap.
    return json({ ok: true, written: 0 });
  }

  // --- Abuse protection: cap on events per batch -------------------------
  if (events.length > MAX_EVENTS_PER_BATCH) {
    return json({ error: 'too many events in batch' }, 413);
  }

  // --- Step 2: write everything to D1, unconditionally -------------------
  // This is the system of record. It must succeed (or the client's own
  // retry-once + localStorage-buffer logic needs a non-2xx to know to
  // retry), so we await it before responding.
  try {
    await writeToD1(env, payload, events);
  } catch (err) {
    console.error('[telemetry] D1 write failed', err);
    return json({ error: 'storage failure' }, 500);
  }

  // --- Step 3: mirror discrete events to PostHog, best-effort ------------
  // Runs after the response is queued to be sent (ctx.waitUntil keeps the
  // Worker alive for it) so it never adds latency to the client and can
  // never turn a successful D1 write into a failed response.
  if (env.POSTHOG_KEY) {
    ctx.waitUntil(
      mirrorToPostHog(env, payload, events).catch((err) => {
        console.error('[telemetry] PostHog mirror failed', err);
      })
    );
  }

  return json({ ok: true, written: events.length });
}

async function writeToD1(env: Env, payload: BatchPayload, events: RawEvent[]): Promise<void> {
  const stmt = env.DB.prepare(
    `INSERT INTO events (session, player, run, env, debug, version, name, t, room, x, z, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const statements = events.map((e) =>
    stmt.bind(
      payload.session ?? null,
      payload.player ?? null,
      isNum(payload.run) ? payload.run : null,
      payload.env ?? null,
      payload.debug ? 1 : 0,
      payload.version ?? null,
      typeof e.name === 'string' ? e.name : null,
      isNum(e.t) ? e.t : null,
      typeof e.room === 'string' ? e.room : null,
      isNum(e.x) ? e.x : null,
      isNum(e.z) ? e.z : null,
      JSON.stringify(e)
    )
  );

  // Batched, not row-by-row — D1's batch() sends one round trip.
  await env.DB.batch(statements);
}

async function mirrorToPostHog(env: Env, payload: BatchPayload, events: RawEvent[]): Promise<void> {
  const mirrorable = events.filter((e) => typeof e.name === 'string' && !NEVER_MIRROR.has(e.name));
  if (mirrorable.length === 0) return;

  const distinctId = payload.player || payload.session || 'anonymous';

  const batch = mirrorable.map((e) => {
    const { name, t, room, ...rest } = e;
    return {
      event: name,
      distinct_id: distinctId,
      timestamp: isNum(t) ? new Date(t).toISOString() : new Date().toISOString(),
      properties: {
        ...rest,
        session: payload.session,
        run: payload.run,
        env: payload.env,
        debug: payload.debug,
        version: payload.version,
        room,
      },
    };
  });

  const host = (env.POSTHOG_HOST ?? DEFAULT_POSTHOG_HOST).replace(/\/+$/, '');
  const res = await fetch(`${host}/batch/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: env.POSTHOG_KEY, batch }),
  });

  if (!res.ok) {
    // Swallowed by the caller's .catch — logged here for detail.
    throw new Error(`PostHog responded ${res.status}: ${await res.text().catch(() => '')}`);
  }
}
