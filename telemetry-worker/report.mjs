#!/usr/bin/env node
// Offline Ward B playtest report.
//
// Input is a JSON export of the D1 `events` table (an array of rows), or a
// JSON object containing `events`/`rows`. No network or D1 credentials are
// used. Typical export:
//   wrangler d1 execute wardb-telemetry --remote --json \
//     --command='SELECT * FROM events' > events.json
//   node report.mjs events.json > report.json

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const MIN_SAMPLE_SIZE = 10;
const STALL_THRESHOLD_S = 120;
const RECENT_UNRESOLVED_WINDOW_S = 300;
const FUNNEL_STAGES = ['page_load', 'session_start', 'room_enter', 'room_complete', 'game_complete'];
const OBSERVATION_EVENTS = [
  'noise', 'investigation_started', 'investigation_ended',
  'pursuit_stalled', 'pursuit_recovered',
  'hazard_warning', 'hazard_activated', 'hazard_avoided', 'hazard_caught',
  'checkpoint_saved', 'checkpoint_save_failed', 'checkpoint_restored', 'checkpoint_continue',
];

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function number(value, fallback = null) {
  return finite(value) ? value : (typeof value === 'string' && value.trim() !== '' && finite(Number(value)) ? Number(value) : fallback);
}

function eventFromRow(row) {
  if (!row || typeof row !== 'object') return null;
  let data = row.data;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { data = {}; }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) data = {};
  // The worker keeps both columns and the full event JSON. Prefer event data,
  // then use columns as a fallback so exports from older schemas still work.
  const event = { ...row, ...data };
  if (event.name == null && row.name != null) event.name = row.name;
  if (event.t == null && row.t != null) event.t = row.t;
  if (event.session == null && row.session != null) event.session = row.session;
  if (event.player == null && row.player != null) event.player = row.player;
  if (event.run == null && row.run != null) event.run = row.run;
  if (event.debug == null && row.debug != null) event.debug = Boolean(row.debug);
  return event;
}

export function readRows(input) {
  const parsed = typeof input === 'string' ? JSON.parse(input) : input;
  if (Array.isArray(parsed)) {
    // `wrangler d1 execute --json` returns an array of result envelopes:
    // [{ results: [...], success: true, meta: ... }]. Accept that shape as
    // well as a plain row array and flatten all pages/envelopes.
    if (parsed.some((item) => Array.isArray(item?.results))) {
      return parsed.flatMap((item) => Array.isArray(item?.results) ? item.results : (item && !item.results ? [item] : []));
    }
    return parsed;
  }
  if (Array.isArray(parsed?.results)) return parsed.results;
  if (Array.isArray(parsed?.events)) return parsed.events;
  if (Array.isArray(parsed?.rows)) return parsed.rows;
  if (Array.isArray(parsed?.result?.results)) return parsed.result.results;
  return [];
}

function sessionKey(event) {
  const session = event.session ?? 'unknown-session';
  const player = event.player ?? '';
  const run = event.run ?? '';
  return `${session}|${player}|${run}`;
}

function wilson(successes, total) {
  if (!total) return { n: 0, rate: null, ci95: [null, null], adequate: false };
  const p = successes / total;
  const z = 1.96;
  const denominator = 1 + (z * z) / total;
  const centre = (p + (z * z) / (2 * total)) / denominator;
  const spread = (z / denominator) * Math.sqrt((p * (1 - p) / total) + (z * z) / (4 * total * total));
  return {
    n: total,
    successes,
    rate: Number(p.toFixed(4)),
    ci95: [Number(Math.max(0, centre - spread).toFixed(4)), Number(Math.min(1, centre + spread).toFixed(4))],
    adequate: total >= MIN_SAMPLE_SIZE,
  };
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return Number((sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2).toFixed(2));
}

function average(values) {
  return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : null;
}

function browserFamily(ua = '') {
  if (/Edg\//i.test(ua)) return 'edge';
  if (/Firefox\//i.test(ua)) return 'firefox';
  if (/CriOS|Chrome\//i.test(ua)) return 'chrome';
  if (/Safari\//i.test(ua) && !/Chrome|CriOS/i.test(ua)) return 'safari';
  return 'other';
}

function platformContext(start) {
  const ua = String(start?.ua ?? '');
  const touch = start?.touch === true || start?.touch === 1 || start?.touch === '1';
  const mobile = touch || /Android|iPhone|iPad|Mobile/i.test(ua);
  return {
    platform: mobile ? 'mobile' : 'desktop',
    browser: browserFamily(ua),
    screen: String(start?.screen ?? 'unknown'),
    dpr: number(start?.dpr),
  };
}

function groupEvents(events) {
  const groups = new Map();
  for (const event of events) {
    const key = sessionKey(event);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }
  for (const [key, group] of groups) {
    group.sort((a, b) => (number(a.t, 0) - number(b.t, 0)));
    const admittedAt = group.find((event) => event.name === 'session_start')?.t;
    groups.set(key, group.filter((event) => event.name !== 'room_enter'
      || (event.admitted !== false && !(admittedAt != null && number(event.t, 0) < number(admittedAt, 0)))));
  }
  return groups;
}

function eventNames(group) {
  return new Set(group.map((event) => event.name).filter((name) => typeof name === 'string'));
}

function isDebugFlag(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function activeIntervals(group) {
  const intervals = [];
  let idleStart = null;
  let hiddenStart = null;
  for (const event of group) {
    const t = number(event.t);
    if (t == null) continue;
    if (event.name === 'idle_start') idleStart = t;
    if (event.name === 'idle_end' && idleStart != null) {
      intervals.push([idleStart, t]); idleStart = null;
    }
    if (event.name === 'visibility_hidden') hiddenStart = t;
    if (event.name === 'visibility_visible' && hiddenStart != null) {
      intervals.push([hiddenStart, t]); hiddenStart = null;
    }
  }
  return { intervals, openIdle: idleStart, openHidden: hiddenStart };
}

function activeGapSeconds(start, end, lifecycle) {
  const blocked = [...lifecycle.intervals];
  for (const from of [lifecycle.openIdle, lifecycle.openHidden]) if (from != null) blocked.push([from, end]);
  blocked.sort((a, b) => a[0] - b[0]);
  let blockedTotal = 0;
  let blockedEnd = start;
  for (const [from, to] of blocked) {
    const clippedFrom = Math.max(start, from);
    const clippedTo = Math.min(end, to);
    if (clippedTo <= clippedFrom) continue;
    if (clippedFrom > blockedEnd) {
      blockedTotal += clippedTo - clippedFrom;
      blockedEnd = clippedTo;
    } else if (clippedTo > blockedEnd) {
      blockedTotal += clippedTo - blockedEnd;
      blockedEnd = clippedTo;
    }
  }
  return Math.max(0, end - start - blockedTotal) / 1000;
}

function roomReport(groups) {
  const rooms = new Map();
  for (const group of groups.values()) {
    const lifecycle = activeIntervals(group);
    const visits = [];
    let visit = null;
    for (const event of group) {
      if (event.name === 'room_enter') {
        if (visit) visits.push(visit);
        visit = { room: String(event.room ?? 'unknown'), events: [event], complete: null };
      } else if (visit) {
        visit.events.push(event);
        if (event.name === 'room_complete') visit.complete = event;
      }
    }
    if (visit) visits.push(visit);
    for (const current of visits) {
      const room = current.room;
      if (!rooms.has(room)) rooms.set(room, { room, enters: 0, completes: 0, incomplete: 0, active_s: [], censored_active_s: [], duration_s: [], catches: 0, shifts: 0, last_active_t: [] });
      const report = rooms.get(room);
      report.enters += 1;
      const lastActivity = current.events.filter((event) => ['pos', 'puzzle_step', 'noise', 'shift', 'orderly_caught', 'room_enter'].includes(event.name)).at(-1);
      if (lastActivity?.t != null) report.last_active_t.push(number(lastActivity.t));
      const eventCatches = current.events.filter((event) => event.name === 'orderly_caught').length;
      // New clients have the discrete catch row; older exports only carry the
      // room rollup. Prefer the discrete count and fall back for compatibility
      // so incomplete visits remain measurable without double counting.
      report.catches += eventCatches || number(current.complete?.catches, 0);
      report.shifts += current.events.filter((event) => event.name === 'shift').length;
      if (!current.complete) {
        report.incomplete += 1;
        if (lastActivity?.t != null && current.events[0]?.t != null) {
          report.censored_active_s.push(activeGapSeconds(number(current.events[0].t), number(lastActivity.t), lifecycle));
        }
        continue;
      }
      report.completes += 1;
      const active = number(current.complete.active_s ?? current.complete.active_seconds);
      const duration = number(current.complete.duration_s ?? current.complete.total_s);
      if (active != null) report.active_s.push(active);
      if (duration != null) report.duration_s.push(duration);
    }
  }
  return [...rooms.values()].map((room) => ({
    room: room.room,
    enters: room.enters,
    completes: room.completes,
    incomplete_visits: room.incomplete,
    completion: wilson(room.completes, room.enters),
    active_s: { n: room.active_s.length, median: median(room.active_s), mean: average(room.active_s) },
    censored_active_s: { n: room.censored_active_s.length, median: median(room.censored_active_s), mean: average(room.censored_active_s) },
    duration_s: { n: room.duration_s.length, median: median(room.duration_s), mean: average(room.duration_s) },
    catches: room.catches,
    shifts: room.shifts,
    last_active_t: { n: room.last_active_t.length, latest: room.last_active_t.length ? Math.max(...room.last_active_t) : null },
  })).sort((a, b) => a.room.localeCompare(b.room, undefined, { numeric: true }));
}

function route19Report(groups) {
  const variants = new Map(['lights', 'doors'].map((variant) => [variant, {
    route: variant, enters: 0, completes: 0, incomplete: 0,
    active: [], censored: [], catches: 0, shifts: 0,
  }]));
  for (const group of groups.values()) {
    const lifecycle = activeIntervals(group);
    let visit = null;
    const visits = [];
    for (const event of group) {
      if (event.name === 'room_enter') {
        if (visit) visits.push(visit);
        visit = { room: String(event.room ?? 'unknown'), events: [event], complete: null };
      } else if (visit) {
        visit.events.push(event);
        if (event.name === 'room_complete') visit.complete = event;
      }
    }
    if (visit) visits.push(visit);
    for (const current of visits.filter((item) => item.room === 'room19')) {
      let variant = String(current.events[0].room_variant ?? '');
      const enterT = number(current.events[0].t, Number.POSITIVE_INFINITY);
      // Older clients did not stamp room_variant. Carry forward the branch
      // choice made in room18, and accept checkpoint19 exports that preserved
      // the choice alongside the checkpoint marker.
      for (const event of group) {
        if (number(event.t, 0) > enterT) break;
        if (event.name === 'wing_power_set' && ['lights', 'doors'].includes(String(event.power))) variant = String(event.power);
        if (String(event.checkpoint) === 'checkpoint19' && ['lights', 'doors'].includes(String(event.power))) variant = String(event.power);
      }
      for (const event of current.events) {
        if (event.name === 'wing_power_set' && ['lights', 'doors'].includes(String(event.power))) variant = String(event.power);
        if (['checkpoint19'].includes(String(event.checkpoint)) && ['lights', 'doors'].includes(String(event.power))) variant = String(event.power);
      }
      if (!variants.has(variant)) continue;
      const report = variants.get(variant);
      report.enters += 1;
      const activity = current.events.filter((event) => ['pos', 'puzzle_step', 'noise', 'shift', 'orderly_caught', 'room_enter'].includes(event.name));
      const last = activity.at(-1);
      report.catches += current.events.filter((event) => event.name === 'orderly_caught').length || number(current.complete?.catches, 0);
      report.shifts += current.events.filter((event) => event.name === 'shift').length;
      if (!current.complete) {
        report.incomplete += 1;
        if (last?.t != null && current.events[0]?.t != null) report.censored.push(activeGapSeconds(number(current.events[0].t), number(last.t), lifecycle));
      } else {
        report.completes += 1;
        const active = number(current.complete.active_s ?? current.complete.active_seconds);
        if (active != null) report.active.push(active);
      }
    }
  }
  return [...variants.values()].map((variant) => ({
    route: variant.route,
    enters: variant.enters,
    completes: variant.completes,
    incomplete_visits: variant.incomplete,
    completion: wilson(variant.completes, variant.enters),
    active_s: { n: variant.active.length, median: median(variant.active), mean: average(variant.active) },
    censored_active_s: { n: variant.censored.length, median: median(variant.censored), mean: average(variant.censored) },
    catches: variant.catches,
    shifts: variant.shifts,
  }));
}

function puzzleStalls(groups) {
  const stalls = new Map();
  for (const group of groups.values()) {
    const lifecycle = activeIntervals(group);
    const steps = group.filter((event) => event.name === 'puzzle_step' && event.puzzle != null && finite(number(event.t)));
    for (let i = 1; i < steps.length; i += 1) {
      const previous = steps[i - 1];
      const current = steps[i];
      // Only compare adjacent steps of the same puzzle in the same room.
      // Otherwise a room transition or a different puzzle looks stalled.
      if (String(previous.puzzle) !== String(current.puzzle) || String(previous.room ?? '') !== String(current.room ?? '')) continue;
      const gap = activeGapSeconds(number(previous.t), number(current.t), lifecycle);
      if (gap < STALL_THRESHOLD_S) continue;
      const puzzle = String(previous.puzzle);
      const room = String(previous.room ?? 'unknown');
      const key = `${room}/${puzzle}`;
      if (!stalls.has(key)) stalls.set(key, { room, puzzle, gaps: [], unfinished_steps: 0 });
      stalls.get(key).gaps.push(gap);
    }
    // A final observed step with no success/complete marker is useful for
    // review even though its duration is right-censored. Keep it separate
    // from timed stall candidates instead of pretending it has a gap.
    const finals = new Map();
    for (const step of steps) finals.set(`${step.room ?? 'unknown'}/${step.puzzle}`, step);
    for (const [key, final] of finals) {
      const explicitlyComplete = final.completed === true || final.success === true || final.complete === true;
      if (!explicitlyComplete && !/(success|complete|done|solved|panel_powered)/i.test(String(final.step ?? ''))
          && !group.some((event) => event.name === 'room_complete' && String(event.room ?? '') === String(final.room ?? ''))) {
        if (!stalls.has(key)) stalls.set(key, { room: String(final.room ?? 'unknown'), puzzle: String(final.puzzle), gaps: [], unfinished_steps: 0 });
        stalls.get(key).unfinished_steps += 1;
      }
    }
  }
  return [...stalls.values()].map((stall) => ({
    room: stall.room,
    puzzle: stall.puzzle,
    candidates: stall.gaps.length,
    unfinished_final_steps: stall.unfinished_steps,
    gap_s: { median: median(stall.gaps), max: stall.gaps.length ? Math.max(...stall.gaps) : null },
    adequate: stall.gaps.length >= MIN_SAMPLE_SIZE,
  })).sort((a, b) => b.candidates - a.candidates);
}

function platformReport(groups) {
  const buckets = new Map();
  for (const group of groups.values()) {
    const start = group.find((event) => event.name === 'session_start') ?? group.find((event) => event.name === 'page_load') ?? {};
    const context = platformContext(start);
    const build = String(start.version ?? 'unknown');
    const key = `${build}/${context.platform}/${context.browser}/${context.screen}`;
    if (!buckets.has(key)) buckets.set(key, { ...context, build, sessions: 0, fps_p50: [], fps_p10: [], frames: [] });
    const bucket = buckets.get(key);
    bucket.sessions += 1;
    for (const event of group.filter((item) => item.name === 'perf')) {
      const p50 = number(event.fps_p50); const p10 = number(event.fps_p10); const frames = number(event.frames);
      if (p50 != null) bucket.fps_p50.push(p50);
      if (p10 != null) bucket.fps_p10.push(p10);
      if (frames != null) bucket.frames.push(frames);
    }
  }
  return [...buckets.values()].map((bucket) => ({
    platform: bucket.platform,
    browser: bucket.browser,
    build: bucket.build,
    screen: bucket.screen,
    sessions: bucket.sessions,
    adequate: bucket.sessions >= MIN_SAMPLE_SIZE,
    perf: {
      windows: bucket.fps_p50.length,
      fps_p50_median: median(bucket.fps_p50),
      fps_p10_median: median(bucket.fps_p10),
      frames_median: median(bucket.frames),
    },
  })).sort((a, b) => b.sessions - a.sessions);
}

function buildReportByCohort(groups) {
  const cohorts = new Map();
  for (const group of groups.values()) {
    const start = group.find((event) => event.name === 'session_start') ?? group.find((event) => event.name === 'page_load') ?? {};
    const build = String(start.version ?? 'unknown');
    if (!cohorts.has(build)) cohorts.set(build, { build, sessions: 0, started: 0, completed: 0 });
    const cohort = cohorts.get(build);
    cohort.sessions += 1;
    const names = eventNames(group);
    if (names.has('session_start')) cohort.started += 1;
    if (names.has('game_complete')) cohort.completed += 1;
  }
  return [...cohorts.values()].map((cohort) => ({
    ...cohort,
    completion: wilson(cohort.completed, cohort.sessions),
    adequate: cohort.sessions >= MIN_SAMPLE_SIZE,
  })).sort((a, b) => b.sessions - a.sessions);
}

function breakdown(events, name, field) {
  const counts = new Map();
  for (const event of events.filter((item) => item.name === name)) {
    const value = String(event[field] ?? 'unknown');
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1]));
}

export function buildReport(input) {
  const rawRows = readRows(input);
  const allEvents = rawRows.map(eventFromRow).filter(Boolean);
  const events = allEvents.filter((event) => !isDebugFlag(event.debug));
  const groups = groupEvents(events);
  const sessions = [...groups.values()];
  const continuedSessions = sessions.filter((group) => eventNames(group).has('checkpoint_continue'));
  const freshSessions = sessions.filter((group) => !eventNames(group).has('checkpoint_continue'));
  const funnelFor = (cohort) => FUNNEL_STAGES.map((stage) => {
    const count = cohort.filter((group) => eventNames(group).has(stage)).length;
    return { stage, ...wilson(count, cohort.length) };
  });
  const denominator = freshSessions.length;

  const completed = sessions.filter((group) => eventNames(group).has('game_complete')).length;
  // A completed page can still receive pagehide during the end card. Keep
  // that terminal marker observable, but exclude it from the quit outcome so
  // the outcome buckets are disjoint.
  const explicitQuit = sessions.filter((group) => eventNames(group).has('quit') && !eventNames(group).has('game_complete')).length;
  const started = sessions.filter((group) => eventNames(group).has('session_start')).length;
  const cutoffT = events.reduce((latest, event) => Math.max(latest, number(event.t, 0)), 0);
  const unresolved = sessions.filter((group) => {
    const names = eventNames(group);
    return names.has('session_start') && !names.has('game_complete') && !names.has('quit');
  }).length;
  const lastActivityT = (group) => {
    const times = group.filter((event) => ['pos', 'puzzle_step', 'noise', 'shift', 'orderly_caught', 'room_enter'].includes(event.name)).map((event) => number(event.t)).filter((t) => t != null);
    return times.length ? Math.max(...times) : 0;
  };
  const unresolvedGroups = sessions.filter((group) => {
    const names = eventNames(group);
    return names.has('session_start') && !names.has('game_complete') && !names.has('quit');
  });
  const recentCensored = unresolvedGroups.filter((group) => cutoffT - lastActivityT(group) <= RECENT_UNRESOLVED_WINDOW_S * 1000).length;
  const inferred = unresolved - recentCensored;

  const eventCounts = Object.fromEntries(OBSERVATION_EVENTS.map((name) => [name, events.filter((event) => event.name === name).length]));
  const roomProgress = roomReport(groups);
  return {
    generated_at: new Date().toISOString(),
    sample: {
      rows: events.length,
      sessions: sessions.length,
      fresh_run_sessions: denominator,
      checkpoint_continuation_sessions: continuedSessions.length,
      started,
      completed,
      adequate_threshold: MIN_SAMPLE_SIZE,
    },
    // Fresh runs are the default denominator. A checkpoint jump starts a new
    // telemetry session, but it is resumed progression rather than fresh-run
    // churn; keep that cohort visible as a separate funnel.
    funnel: funnelFor(freshSessions),
    resumed_funnel: funnelFor(continuedSessions),
    outcomes: {
      completed,
      explicit_quit_or_close: explicitQuit,
      unresolved_recent_or_censored: recentCensored,
      inferred_abandonment_or_missing_terminal_event: inferred,
      cutoff_t: cutoffT || null,
      note: 'quit means the client observed a terminal close path; it does not prove frustration. Recent unresolved sessions are right-censored. Stale unresolved sessions are inferred abandonment-or-missing-terminal-event and may also be a crash, network loss, or collection cutoff.',
    },
    room_progress: roomProgress,
    route19: route19Report(groups),
    build_cohorts: buildReportByCohort(groups),
    catches: events.filter((event) => event.name === 'orderly_caught').length,
    shifts: events.filter((event) => event.name === 'shift').length,
    observations: eventCounts,
    observation_breakdown: {
      noise_by_source: breakdown(events, 'noise', 'source'),
      investigations_by_source: breakdown(events, 'investigation_started', 'source'),
      hazards_by_id: breakdown(events, 'hazard_activated', 'hazard'),
      checkpoints_by_id: breakdown(events, 'checkpoint_continue', 'checkpoint'),
      pursuit_by_reason: breakdown(events, 'pursuit_stalled', 'reason'),
    },
    puzzle_stalls: {
      threshold_s: STALL_THRESHOLD_S,
      candidates: puzzleStalls(groups),
      note: 'A stall candidate is an active-time gap between adjacent puzzle_step rows for the same puzzle and room. Final steps without a success marker are right-censored unfinished candidates, not measured stalls.',
    },
    platform_performance: platformReport(groups),
    uncertainty: {
      method: 'Funnel rates and room completion use 95% Wilson intervals. Each segment includes n and adequate=false below the minimum sample threshold.',
      minimum_sample_size: MIN_SAMPLE_SIZE,
      warning: 'Treat small segments as directional. This report does not infer player sentiment from unload, quit, catch, or stall events.',
    },
  };
}

export function renderMarkdown(report) {
  const lines = [
    '# Ward B playtest report',
    '',
    `Sample: ${report.sample.sessions} sessions (${report.sample.fresh_run_sessions} fresh, ${report.sample.checkpoint_continuation_sessions} checkpoint continuations); ${report.sample.started} started; ${report.sample.completed} completed. Rates use fresh runs by default.`,
    '',
    '## Funnel',
    '',
    '| Stage | n | Rate | 95% CI | Adequate |',
    '| --- | ---: | ---: | --- | --- |',
  ];
  for (const item of report.funnel) lines.push(`| ${item.stage} | ${item.successes ?? 0}/${item.n} | ${item.rate == null ? '—' : `${(item.rate * 100).toFixed(1)}%`} | ${item.ci95?.[0] == null ? '—' : `${(item.ci95[0] * 100).toFixed(1)}–${(item.ci95[1] * 100).toFixed(1)}%`} | ${item.adequate ? 'yes' : 'no'} |`);
  lines.push('', '## Room progress', '', '| Room | Enter | Complete | Incomplete | Active median (s) | Catches |', '| --- | ---: | ---: | ---: | ---: | ---: |');
  for (const room of report.room_progress) lines.push(`| ${room.room} | ${room.enters} | ${room.completes} | ${room.incomplete_visits} | ${room.active_s.median ?? '—'} | ${room.catches} |`);
  lines.push('', '## Outcomes', '', `Completed: ${report.outcomes.completed}; explicit quit/close: ${report.outcomes.explicit_quit_or_close}; recent censored: ${report.outcomes.unresolved_recent_or_censored}; stale inferred unresolved: ${report.outcomes.inferred_abandonment_or_missing_terminal_event}.`, '', report.outcomes.note, '', '## Platform and performance', '', '| Build | Platform | Browser | Screen | Sessions | FPS p50 median | FPS p10 median |', '| --- | --- | --- | --- | ---: | ---: | ---: |');
  for (const bucket of report.platform_performance) lines.push(`| ${bucket.build} | ${bucket.platform} | ${bucket.browser} | ${bucket.screen} | ${bucket.sessions} | ${bucket.perf.fps_p50_median ?? '—'} | ${bucket.perf.fps_p10_median ?? '—'} |`);
  lines.push('', '## Ranked investigation prompts', '');
  const prompts = [];
  for (const stall of report.puzzle_stalls.candidates) prompts.push({ score: stall.candidates * 2 + stall.unfinished_final_steps, text: `${stall.room}/${stall.puzzle}: ${stall.candidates} timed stall candidate(s), ${stall.unfinished_final_steps} unfinished final step(s)` });
  for (const room of report.room_progress.filter((item) => item.incomplete_visits > 0)) prompts.push({ score: room.incomplete_visits, text: `${room.room}: ${room.incomplete_visits} incomplete visit(s); inspect the last active position and route pressure` });
  if (!prompts.length) lines.push('No candidate prompt in this export.');
  else prompts.sort((a, b) => b.score - a.score).slice(0, 10).forEach((prompt, index) => lines.push(`${index + 1}. ${prompt.text}`));
  lines.push('', `Caveat: ${report.uncertainty.warning}`, `Stall note: ${report.puzzle_stalls.note}`);
  return `${lines.join('\n')}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const markdown = process.argv.includes('--markdown');
  const path = process.argv.slice(2).find((arg) => arg !== '--markdown');
  if (!path) {
    console.error('usage: node report.mjs <d1-events.json>');
    process.exit(2);
  }
  const report = buildReport(JSON.parse(await readFile(path, 'utf8')));
  process.stdout.write(markdown ? renderMarkdown(report) : `${JSON.stringify(report, null, 2)}\n`);
}
