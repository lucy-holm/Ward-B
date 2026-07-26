// Event queue + transport, flushed to a webhook (or the console when no
// webhook is configured). Every row is stamped with room/position/pills/
// state so playtest logs can be reconstructed without extra joins.
//
// This is the client side of the pipeline described in
// docs/superpowers/specs/2026-07-26-telemetry-and-measurement-design.md.
// Notable properties, each answering a gap identified in that doc's §2
// audit (F-numbers below refer to it):
//
// - Three-part identity (F3, F5): a `playerId` that survives reloads (so
//   READMIT-and-retry is a second *run*, not a new stranger), a fresh
//   `sessionId` per page load, and a `runIndex` counting page loads for
//   that player. All three ride on every batch.
// - Runtime env detection from `location.hostname` (F19) — one bundle
//   serves GitHub Pages, itch, and tailnet playtests, so this can't be a
//   build-time constant or Tom's own testing silently pollutes the funnel.
// - Transport hardening (F6/F7/§5.1a): time- and size-based flush, a
//   capped queue with drop-oldest + a reported count, and a localStorage
//   retry buffer so a crashed tab doesn't lose its last unsent batch — the
//   loss that matters most, because it's biased toward exactly the
//   sessions worth studying.
// - Idle detection (F9), error capture (F17), and cheap FPS sampling
//   (F18), all self-contained: nothing outside this file has to remember
//   to call in.
// - A `?notrack=1` / localStorage kill switch (F22) that turns every
//   public method into a no-op.
// - A/B assignment (Phase 3, §6, game/experiments.ts): resolved once per
//   construction from the same playerId used for identity, and stamped on
//   every flushed batch as `experiment`/`variant`. Resolution is skipped
//   entirely when opted out (F22) — the notrack switch suppresses
//   experiment assignment too, not just event collection, since assigning
//   an arm to a player we're not tracking would just be dead state.
//
// All localStorage access is try/caught — it throws in private browsing —
// and degrades to in-memory-only behaviour rather than erroring.
import { BUILD_VERSION, TUNING } from '../tuning';
import { getAssignment, type Assignment } from './experiments';

export type TelemetryEnv = 'local' | 'pages' | 'itch' | 'tailnet' | 'unknown';

// F20 — every event name raised anywhere in the codebase, in one place.
// `event()`'s `name` parameter is typed against this union so a typo in a
// room file fails `tsc`/`npm run check:rooms` instead of shipping silently
// and just never appearing in a dashboard.
//
// Sourced from:
//   grep -rho "telemetry.event('[a-z_]*'" src --include='*.ts' \
//     | sed "s/.*('//;s/'//" | sort -u
// (catches both `telemetry.event(...)` and `ctx.telemetry.event(...)` call
// sites, since it's a substring match) plus the names telemetry.ts and
// main.ts raise directly (page_load, session_start, pos, perf, quit, error,
// idle_start, idle_end, game_complete, room_complete, room_enter, shift,
// pills_empty, medication_expired, settings_change).
//
// This union MUST be a superset of what's actually called — if adding a
// type here breaks a room-file call site, the fix is to add the missing
// name, not to touch the room file (this file doesn't own rooms/*). Another
// agent is concurrently editing kit.ts/room files this session and may add
// or consolidate event calls; treat any resulting tsc error in rooms/* as a
// signal to widen this union, not a bug to fix there.
export type TelemetryEventName =
  // internal — raised by telemetry.ts itself
  | 'page_load'
  | 'session_start'
  | 'pos'
  | 'perf'
  | 'quit'
  | 'error'
  | 'idle_start'
  | 'idle_end'
  // internal — raised by main.ts's session/room rollups and shift handling
  | 'game_complete'
  | 'room_complete'
  | 'room_enter'
  | 'shift'
  | 'pills_empty'
  | 'medication_expired'
  | 'settings_change'
  // room-script events (grep sweep above)
  | 'chains_seen'
  | 'coat_gate_nudge'
  | 'coat_pill_found'
  | 'dispenser_refused'
  | 'dispenser_used'
  | 'door_opened'
  | 'door_refused'
  | 'gate_close'
  | 'gate_open'
  | 'keypad_close'
  | 'keypad_denied'
  | 'keypad_open'
  | 'keypad_success'
  | 'light_switch'
  | 'orderly_caught'
  | 'orderly_chase'
  | 'orderly_escalation'
  | 'orderly_spotted'
  | 'pill_pickup'
  | 'push'
  | 'push_blocked'
  | 'shape_lock_success'
  | 'wall_crushed'
  | 'walls_closing'
  | 'wing_power_set';

export interface TelemetrySnapshot {
  room: string;
  x: number;
  z: number;
  yaw: number;
  level: string;
  pills: number;
  state: 'unmed' | 'lucid';
  medication: number;
}

// localStorage keys — all under the wardb- namespace (see settings.ts).
// itch serves games from a shared sandbox origin, so namespacing everything
// under wardb- avoids collisions with anything else sharing that origin.
const PLAYER_KEY = 'wardb-player-v1';
const RUN_KEY = 'wardb-run-v1';
const RETRY_KEY = 'wardb-telemetry-retry-v1';
const NOTRACK_KEY = 'wardb-notrack';

// Transport tuning that isn't gameplay-facing enough to belong in tuning.ts
// (flush interval, idle threshold, and perf interval ARE there, since they
// were called out explicitly as knobs worth playtesting against).
const QUEUE_CAP = 500; // F7 — hard ceiling; drop-oldest beyond this
const FLUSH_AT_SIZE = 50; // F6 — size-based flush trigger
const RETRY_CAP_BYTES = 100 * 1024; // §5.1a — cap on the localStorage retry buffer
const IDLE_POLL_MS = 1000; // how often we check whether the idle threshold has elapsed
const ERROR_TRUNCATE = 300; // hard cap on error message/stack length (F17)

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function makeUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing / quota exceeded — the value just won't survive a
    // reload. Degrade silently rather than throw.
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// playerId survives reloads and return visits (F3): created once, then
// read back on every subsequent construction. This is what makes retention
// and stable A/B bucketing possible — without it, a READMIT (location.reload
// in main.ts) is indistinguishable from a brand new player.
function resolvePlayerId(): string {
  const existing = safeGet(PLAYER_KEY);
  if (existing) return existing;
  const id = makeUuid();
  safeSet(PLAYER_KEY, id);
  return id;
}

// runIndex increments once per page load (READMIT is a reload, so a replay
// bumps this rather than looking like a fresh session — F3/F5).
function resolveRunIndex(): number {
  const raw = safeGet(RUN_KEY);
  const prev = raw ? parseInt(raw, 10) : 0;
  const next = (Number.isFinite(prev) ? prev : 0) + 1;
  safeSet(RUN_KEY, String(next));
  return next;
}

// F19/§7.5 — derived at runtime, not baked in at build time, because one
// bundle serves GitHub Pages, itch, and tailnet playtests. Without this,
// Tom's own testing sessions silently mix into every real-player metric.
function detectEnv(hostname: string): TelemetryEnv {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'local';
  if (hostname.endsWith('.github.io')) return 'pages';
  if (hostname.endsWith('.ts.net')) return 'tailnet';
  if (
    hostname === 'itch.io' ||
    hostname.endsWith('.itch.io') ||
    hostname.endsWith('.itch.zone') ||
    hostname.endsWith('.hwcdn.net')
  ) {
    return 'itch';
  }
  return 'unknown';
}

function safeHostname(): string {
  try {
    return location.hostname;
  } catch {
    return '';
  }
}

// F22 — cheap now, awkward to retrofit after launch. `?notrack=1` is for a
// one-off link; the localStorage flag is for "remember I opted out".
function isOptedOut(): boolean {
  try {
    if (new URLSearchParams(location.search).get('notrack') === '1') return true;
  } catch {
    // ignore — malformed location, treat as not opted out via the query string
  }
  const stored = safeGet(NOTRACK_KEY);
  return stored === '1' || stored === 'true';
}

function truncate(s: string | undefined | null, max: number): string {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) : s;
}

function firstLine(stack: string | undefined | null): string {
  if (!stack) return '';
  const nl = stack.indexOf('\n');
  return nl === -1 ? stack : stack.slice(0, nl);
}

export class Telemetry {
  private readonly getSnapshot: () => TelemetrySnapshot;
  private readonly debug: boolean;
  private readonly disabled: boolean;

  readonly playerId: string;
  readonly sessionId: string = makeUuid();
  readonly runIndex: number;
  readonly env: TelemetryEnv;
  // Resolved once at construction (§6.1 "assign once, persist" — here
  // "persist" is free, since the hash is deterministic from playerId, so
  // there's nothing to write to localStorage). Null whenever no experiment
  // is active (the default — see game/experiments.ts's header) or when
  // opted out, in which case it's never even computed.
  readonly assignment: Assignment;

  private queue: Record<string, unknown>[] = [];
  private droppedCount = 0;
  private quitFired = false;
  // Set on pagehide. Gates the webglcontextlost error handler — see the
  // comment there for why a context loss during teardown is not a fault.
  private unloading = false;
  private pageLoadCalled = false;
  private started = false;

  // Idle tracking (F9) — activeMs is derived on read from these, not
  // ticked continuously, so callers can sample it at arbitrary points and
  // diff two samples to get an idle-corrected duration.
  private idle = false;
  private lastActivityTs = 0;
  private idleSinceTs = 0;
  private activeAccumMs = 0;
  private activeSinceTs = 0;

  // Perf sampling (F18) — a rolling per-frame fps array, flushed to a
  // `perf` event every TUNING.telemetry.perfIntervalMs and reset.
  private perfSamples: number[] = [];
  private perfLastFrameTs = 0;
  private perfWindowStart = 0;

  constructor(getSnapshot: () => TelemetrySnapshot, opts?: { debug?: boolean }) {
    this.getSnapshot = getSnapshot;
    this.debug = opts?.debug ?? false;
    this.disabled = isOptedOut();
    this.env = detectEnv(safeHostname());

    if (this.disabled) {
      // Opted out: don't even touch localStorage for identity. Everything
      // below stays inert; every public method is a no-op.
      this.playerId = '';
      this.runIndex = 0;
      this.assignment = null;
    } else {
      this.playerId = resolvePlayerId();
      this.runIndex = resolveRunIndex();
      this.assignment = getAssignment(this.playerId);
    }
  }

  /** Total ms of active (non-idle) time this session. Monotonic. */
  get activeMs(): number {
    if (this.disabled || !this.started) return 0;
    if (this.idle) return this.activeAccumMs;
    return this.activeAccumMs + (nowMs() - this.activeSinceTs);
  }

  event(name: TelemetryEventName, data?: Record<string, unknown>): void {
    if (this.disabled) return;
    const snap = this.getSnapshot();
    const row: Record<string, unknown> = {
      name,
      t: Date.now(),
      room: snap.room,
      x: round2(snap.x),
      z: round2(snap.z),
      yaw: round2(snap.yaw),
      level: snap.level,
      pills: snap.pills,
      state: snap.state,
      med: round2(snap.medication),
      ...data,
    };

    this.queue.push(row);
    if (this.queue.length > QUEUE_CAP) {
      this.queue.shift();
      this.droppedCount++;
    }
    if (this.queue.length >= FLUSH_AT_SIZE) {
      this.flush();
    }
  }

  flush(useBeacon = false): void {
    if (this.disabled) return;
    if (this.queue.length === 0 && this.droppedCount === 0) return;

    const events = this.queue;
    this.queue = [];
    const dropped = this.droppedCount;
    this.droppedCount = 0;

    const payload: Record<string, unknown> = {
      version: BUILD_VERSION,
      session: this.sessionId,
      player: this.playerId,
      run: this.runIndex,
      env: this.env,
      debug: this.debug,
      events,
    };
    if (dropped > 0) payload.dropped = dropped;
    // Phase 3 §6.1 — stamp on every batch, not every event: an experiment
    // arm doesn't change mid-session, so it belongs at the payload level
    // like version/session/player, not repeated per row. Omitted (not
    // null) when no experiment is active, matching the `dropped` field's
    // convention just above — the common case stays a clean payload.
    if (this.assignment) {
      payload.experiment = this.assignment.experiment;
      payload.variant = this.assignment.variant;
    }

    const url = import.meta.env.VITE_TELEMETRY_URL as string | undefined;
    if (!url) {
      console.log('[telemetry]', payload);
      return;
    }

    const body = JSON.stringify(payload);
    if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const ok = navigator.sendBeacon(url, body);
      if (!ok) this.saveRetryBuffer(payload);
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => this.saveRetryBuffer(payload));
    }
  }

  /** Emitted at boot, BEFORE the start overlay. Installs unload handlers. */
  pageLoad(): void {
    if (this.disabled || this.pageLoadCalled) return;
    this.pageLoadCalled = true;

    this.installUnloadHandlers();
    this.installErrorHandlers();
    this.resendRetryBuffer();
    this.event('page_load', this.sessionContext());
  }

  /** Called when the player actually starts (ADMIT ME). Installs sampling timers. */
  start(): void {
    if (this.disabled || this.started) return;
    this.started = true;

    this.event('session_start', { version: BUILD_VERSION, ...this.sessionContext() });

    const t = nowMs();
    this.activeSinceTs = t;
    this.lastActivityTs = t;
    this.installIdleTracking();

    setInterval(() => this.event('pos'), TUNING.telemetry.positionSampleMs);
    setInterval(() => this.flush(), TUNING.telemetry.flushMs);

    this.perfWindowStart = t;
    this.perfLastFrameTs = 0;
    requestAnimationFrame(this.perfTick);
  }

  // ---- session context (F19) — shared by page_load and session_start ----

  private sessionContext(): Record<string, unknown> {
    const touch = typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches;
    let iframe = false;
    try {
      iframe = window.self !== window.top;
    } catch {
      // A cross-origin frame throws on window.top access — that itself
      // means we're embedded (itch does exactly this).
      iframe = true;
    }
    return {
      ua: navigator.userAgent,
      screen: `${innerWidth}x${innerHeight}`,
      touch,
      referrer: document.referrer || '',
      hostname: safeHostname(),
      iframe,
      dpr: window.devicePixelRatio || 1,
      lang: navigator.language,
      cores: navigator.hardwareConcurrency || 0,
    };
  }

  // ---- unload handling (unchanged behaviour, moved under pageLoad) ----

  private installUnloadHandlers(): void {
    addEventListener('pagehide', () => {
      this.unloading = true;
      if (!this.quitFired) {
        this.quitFired = true;
        this.event('quit');
      }
      this.flush(true);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush(true);
      }
    });
  }

  // ---- error capture (F17) ----

  private installErrorHandlers(): void {
    window.addEventListener('error', (e: ErrorEvent) => {
      const err = e.error as { stack?: string } | undefined;
      this.event('error', {
        kind: 'error',
        msg: truncate(e.message || String(e.error), ERROR_TRUNCATE),
        stack: truncate(firstLine(err?.stack), ERROR_TRUNCATE),
      });
    });

    window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
      const reason: unknown = e.reason;
      const msg = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : undefined;
      this.event('error', {
        kind: 'unhandledrejection',
        msg: truncate(msg, ERROR_TRUNCATE),
        stack: truncate(firstLine(stack), ERROR_TRUNCATE),
      });
    });

    // webglcontextlost does not bubble, so a capture-phase listener on
    // window is the only way to catch it without a reference to the
    // canvas (which may not exist yet when pageLoad() runs).
    //
    // Suppressed once `unloading` is set (pagehide), because tearing the
    // page down destroys the GL context and fires this as a matter of
    // course — observed in a Playwright run where browser.close() produced
    // an 'error' row on an otherwise completely clean session. Left
    // unguarded it would log roughly one spurious error PER SESSION, which
    // would bury the real driver/GPU failures this metric exists to catch
    // under noise proportional to traffic. A context loss during actual
    // play still reports normally; only the one on the way out is dropped.
    window.addEventListener(
      'webglcontextlost',
      () => {
        if (this.unloading) return;
        this.event('error', { kind: 'webglcontextlost', msg: 'WebGL context lost' });
      },
      true,
    );
  }

  // ---- idle detection (F9) ----

  private installIdleTracking(): void {
    const onActivity = () => this.handleActivity();
    (['keydown', 'pointerdown', 'mousemove', 'touchstart'] as const).forEach((type) => {
      window.addEventListener(type, onActivity, { passive: true });
    });
    setInterval(() => this.checkIdle(), IDLE_POLL_MS);
  }

  private handleActivity(): void {
    const now = nowMs();
    this.lastActivityTs = now;
    if (this.idle) {
      this.idle = false;
      this.activeSinceTs = now;
      const idleS = (now - this.idleSinceTs) / 1000;
      this.event('idle_end', { idle_s: round2(idleS) });
    }
  }

  private checkIdle(): void {
    if (this.idle) return;
    const now = nowMs();
    if (now - this.lastActivityTs >= TUNING.telemetry.idleThresholdMs) {
      this.activeAccumMs += this.lastActivityTs - this.activeSinceTs;
      this.idle = true;
      this.idleSinceTs = this.lastActivityTs;
      this.event('idle_start');
    }
  }

  // ---- perf sampling (F18) — cheap: one push per frame, one sort per window ----

  private perfTick = (now: number): void => {
    if (this.perfLastFrameTs > 0) {
      const dt = now - this.perfLastFrameTs;
      if (dt > 0) this.perfSamples.push(1000 / dt);
    }
    this.perfLastFrameTs = now;

    if (now - this.perfWindowStart >= TUNING.telemetry.perfIntervalMs) {
      this.emitPerf();
      this.perfWindowStart = now;
    }
    requestAnimationFrame(this.perfTick);
  };

  private emitPerf(): void {
    if (this.perfSamples.length === 0) return;
    const sorted = [...this.perfSamples].sort((a, b) => a - b);
    const frames = sorted.length;
    const p50 = sorted[Math.floor(frames * 0.5)];
    const p10 = sorted[Math.floor(frames * 0.1)];
    this.event('perf', { fps_p50: round2(p50), fps_p10: round2(p10), frames });
    this.perfSamples = [];
  }

  // ---- retry buffer (§5.1a) ----
  // A failed POST writes its batch here instead of dropping it, so a tab
  // crash right after a failed send doesn't lose data. Re-sent once on the
  // next pageLoad(); a second failure re-saves it for the load after that.

  private saveRetryBuffer(payload: Record<string, unknown>): void {
    try {
      let events = Array.isArray(payload.events) ? [...(payload.events as unknown[])] : [];

      const existingRaw = safeGet(RETRY_KEY);
      if (existingRaw) {
        try {
          const existing = JSON.parse(existingRaw);
          if (Array.isArray(existing?.events)) {
            events = [...(existing.events as unknown[]), ...events];
          }
        } catch {
          // Corrupt buffer — drop it rather than propagate the parse error.
        }
      }

      let merged: Record<string, unknown> = { ...payload, events };
      let json = JSON.stringify(merged);
      while (json.length > RETRY_CAP_BYTES && events.length > 1) {
        events = events.slice(1);
        merged = { ...merged, events };
        json = JSON.stringify(merged);
      }
      if (json.length <= RETRY_CAP_BYTES) {
        safeSet(RETRY_KEY, json);
      }
    } catch {
      // Best-effort durability, not a guarantee — never let this throw.
    }
  }

  private resendRetryBuffer(): void {
    const raw = safeGet(RETRY_KEY);
    if (!raw) return;
    safeRemove(RETRY_KEY);

    const url = import.meta.env.VITE_TELEMETRY_URL as string | undefined;
    if (!url) return; // nothing to send to; drop rather than log stale data as fresh

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: raw,
      keepalive: true,
    }).catch(() => {
      safeSet(RETRY_KEY, raw);
    });
  }
}
