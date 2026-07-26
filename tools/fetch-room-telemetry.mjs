#!/usr/bin/env node
// Pulls one room's telemetry rows out of the production D1 database
// (`wardb-telemetry`) and writes them to a local JSON file the map
// viewer's path-replay overlay can load (src/devtools/map.ts).
//
// Why a separate script instead of the viewer talking to the Worker
// directly: the design doc (2026-07-26-telemetry-and-measurement-design.md
// §5.1) is explicit that the map viewer must not gain a runtime dependency
// on the live Worker — it's a static, no-build dev page. So the flow is a
// deliberate two-step: fetch to a local file (this script), then load that
// file in the browser (map.html's "load telemetry" file picker).
//
// Talks to D1 the same way telemetry-worker/README.md's runbook does:
// `wrangler d1 execute` with `--json`, run from telemetry-worker/ (its
// wrangler.toml lives there and names the DB binding). No new dependency —
// `npx wrangler` reuses the auth + package already set up for that
// directory. Requires `npx wrangler login` once (see that README) unless
// you already ran it.
//
// Usage (run from anywhere in the repo):
//
//   node tools/fetch-room-telemetry.mjs --room room12
//   node tools/fetch-room-telemetry.mjs --room room17 --out tools/data/r17.json
//   node tools/fetch-room-telemetry.mjs --room room5 --include-debug
//   node tools/fetch-room-telemetry.mjs --room room9 --env itch --since 2026-07-26
//   node tools/fetch-room-telemetry.mjs --room room1 --local   # local dev D1, not prod
//
// Flags:
//   --room <id>        required. Room id as stored in the `room` column
//                       (e.g. room1..room20). Alphanumeric/underscore only.
//   --out <path>        output file. Default: tools/data/<room>.json
//   --include-debug      also pull debug=1 rows (?room=N dev-jump sessions
//                       with unearned pills). OFF by default — see the
//                       design doc's F4: these are not representative
//                       playthroughs and would skew every overlay.
//   --env <env>          filter to one env column value (pages|itch|tailnet|
//                       local). Default: all envs.
//   --since <date>        only rows with t >= this timestamp. Accepts an
//                       ISO date (2026-07-26) or a raw ms-epoch number.
//   --limit <n>           safety cap on rows returned. Default 200000.
//   --local              query the local dev D1 (`--local` instead of
//                       `--remote`) — useful for testing this script
//                       against `npm run dev` inside telemetry-worker/
//                       without touching production data.
//
// Output shape: a JSON array of event rows, one per telemetry event,
// newest-safe order (session, then t). Each row is the event's own `data`
// blob (name, t, room, x, z, yaw, level, pills, state, med, + any
// event-specific extras) merged with the batch-level identity columns
// that live outside `data` in D1 (session, player, run, env, debug,
// version) — so every row is self-contained; the viewer never needs to
// join across rows.

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workerDir = join(repoRoot, 'telemetry-worker');
const DB_NAME = 'wardb-telemetry';

function parseArgs(argv) {
  const args = { includeDebug: false, local: false, limit: 200000 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--room': args.room = next(); break;
      case '--out': args.out = next(); break;
      case '--include-debug': args.includeDebug = true; break;
      case '--env': args.env = next(); break;
      case '--since': args.since = next(); break;
      case '--limit': args.limit = Number(next()); break;
      case '--local': args.local = true; break;
      case '--help': case '-h': args.help = true; break;
      default:
        console.error(`Unknown argument: ${a}`);
        process.exit(1);
    }
  }
  return args;
}

function usageAndExit(code) {
  console.log(`Usage: node tools/fetch-room-telemetry.mjs --room <id> [options]

Options:
  --out <path>       output file (default tools/data/<room>.json)
  --include-debug    include dev-jump (?room=N) sessions [default: excluded]
  --env <env>         filter to one env (pages|itch|tailnet|local)
  --since <date>      ISO date or ms-epoch; only rows at/after it
  --limit <n>         row cap (default 200000)
  --local             query local dev D1 instead of production
`);
  process.exit(code);
}

// D1's `room` values are always our own room ids (room1..room20) or 'END' —
// never user input in the game itself, but this script's --room IS user
// input on the command line, so validate before it goes anywhere near a
// SQL string built by hand (no query params in `wrangler d1 execute
// --command`; see buildSql below).
const SAFE_TOKEN = /^[A-Za-z0-9_]+$/;

function sqlString(s) {
  return `'${s.replace(/'/g, "''")}'`;
}

function toEpochMs(since) {
  if (/^\d+$/.test(since)) return Number(since);
  const t = Date.parse(since);
  if (Number.isNaN(t)) {
    console.error(`--since value not understood: ${since} (want ISO date or ms-epoch)`);
    process.exit(1);
  }
  return t;
}

function buildSql(args) {
  const clauses = [`room = ${sqlString(args.room)}`];
  if (!args.includeDebug) clauses.push('debug = 0');
  if (args.env) clauses.push(`env = ${sqlString(args.env)}`);
  if (args.since) clauses.push(`t >= ${toEpochMs(args.since)}`);
  const limit = Number.isFinite(args.limit) && args.limit > 0 ? Math.floor(args.limit) : 200000;
  return (
    `SELECT session, player, run, env, debug, version, name, t, room, x, z, data ` +
    `FROM events WHERE ${clauses.join(' AND ')} ORDER BY session, t LIMIT ${limit}`
  );
}

function runWrangler(sql, local) {
  const modeFlag = local ? '--local' : '--remote';
  const result = spawnSync(
    'npx',
    ['wrangler', 'd1', 'execute', DB_NAME, modeFlag, '--command', sql, '--json'],
    { cwd: workerDir, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
  );
  if (result.error) {
    console.error('Failed to run wrangler:', result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`wrangler exited ${result.status}`);
    console.error(result.stderr || result.stdout);
    process.exit(1);
  }
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch (e) {
    console.error('Could not parse wrangler output as JSON.');
    console.error(result.stdout.slice(0, 2000));
    process.exit(1);
  }
  // wrangler --json prints an array with one entry per statement executed.
  const rows = parsed.flatMap((entry) => entry.results ?? []);
  return rows;
}

function mergeRow(dbRow) {
  let data;
  try {
    data = JSON.parse(dbRow.data);
  } catch {
    data = {};
  }
  return {
    session: dbRow.session,
    player: dbRow.player,
    run: dbRow.run,
    env: dbRow.env,
    debug: !!dbRow.debug,
    version: dbRow.version,
    // data's own name/t/room/x/z/level/yaw/pills/state/med (+ any
    // event-specific extras logged via ctx.telemetry.event(name, {...}))
    // take precedence — it's the richer, authoritative copy of the event.
    ...data,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) usageAndExit(0);
  if (!args.room) {
    console.error('--room is required.\n');
    usageAndExit(1);
  }
  if (!SAFE_TOKEN.test(args.room)) {
    console.error(`--room "${args.room}" looks invalid (expected alphanumeric/underscore, e.g. room12).`);
    process.exit(1);
  }
  if (args.env && !SAFE_TOKEN.test(args.env)) {
    console.error(`--env "${args.env}" looks invalid.`);
    process.exit(1);
  }

  const sql = buildSql(args);
  console.log(`[fetch-room-telemetry] ${args.local ? 'local' : 'REMOTE (production)'} query:\n  ${sql}`);

  const dbRows = runWrangler(sql, args.local);
  const rows = dbRows.map(mergeRow);

  const outPath = args.out
    ? resolve(repoRoot, args.out)
    : resolve(repoRoot, 'tools', 'data', `${args.room}.json`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(rows));

  const sessions = new Set(rows.map((r) => r.session)).size;
  const names = new Map();
  for (const r of rows) names.set(r.name, (names.get(r.name) ?? 0) + 1);
  const summary = [...names.entries()].sort((a, b) => b[1] - a[1])
    .map(([n, c]) => `${n}:${c}`).join(', ');

  console.log(`[fetch-room-telemetry] wrote ${rows.length} rows (${sessions} sessions) -> ${outPath}`);
  console.log(`[fetch-room-telemetry] by event: ${summary || '(none)'}`);
  if (!args.includeDebug) {
    console.log('[fetch-room-telemetry] debug=1 (dev-jump) sessions excluded — pass --include-debug to include them.');
  }
}

main();
