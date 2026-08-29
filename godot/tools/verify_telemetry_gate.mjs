// Proves, in a real browser against the real exported build, that telemetry
// leaves the game ONLY from itch.
//
//   node tools/verify_telemetry_gate.mjs
//
// This cannot be a headless GDScript test. The gate depends on
// location.hostname, on JavaScriptBridge existing, and on an actual network
// stack — all of which only exist in a browser running the wasm export. The
// headless suite (tools/check_telemetry.tscn) pins the decision table; this
// pins that the decision table is actually reached at runtime.
//
// The itch case is exercised by resolving a real itch hostname to the local
// server with Chrome's --host-resolver-rules, so the page genuinely believes
// it is on itch.zone. Nothing is stubbed on the page side.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const PORT = 8901;
const COLLECTOR = 'https://collector.invalid.example/ingest';
const BOOT_TIMEOUT_MS = 90000;

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

function exportBuild(endpoint) {
  execFileSync('tools/write_build_config.sh', [endpoint, ''], { stdio: 'inherit' });
  execFileSync('godot', ['--headless', '--path', '.', '--import'], { stdio: 'ignore' });
  execFileSync('godot', ['--headless', '--path', '.', '--export-release', 'Web', 'build/index.html'], {
    stdio: 'ignore',
  });
}

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'build'], {
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 800));

// Runs the build under `hostname`, returns every request it tried to make to
// the collector plus the telemetry lines it logged.
async function run(hostname, { waitMs = 20000 } = {}) {
  const browser = await chromium.launch({
    channel: 'chrome',
    args: [
      '--use-gl=swiftshader',
      '--enable-unsafe-swiftshader',
      '--no-sandbox',
      `--host-resolver-rules=MAP ${hostname} 127.0.0.1`,
      // Godot refuses to boot outside a secure context. localhost is one by
      // definition; a mapped hostname over plain HTTP is not, and without
      // this flag the engine shows an error screen while the page still has
      // a <canvas> — so every itch assertion below would pass against a game
      // that never ran. This was a real false green, not a hypothetical.
      `--unsafely-treat-insecure-origin-as-secure=http://${hostname}:${PORT}`,
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const posts = [];
  const telemetryLogs = [];

  // Catches fetch/XHR AND sendBeacon, which is the one a naive test misses.
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.includes('collector.invalid.example')) {
      posts.push({ url, body: route.request().postData() });
      return route.fulfill({ status: 200, body: '{"ok":true}' });
    }
    return route.continue();
  });
  const booteds = [];
  page.on('console', (m) => {
    const t = m.text();
    booteds.push(t);
    if (t.includes('[telemetry]')) telemetryLogs.push(t);
  });

  await page.goto(`http://${hostname}:${PORT}/index.html`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForFunction(
    () => {
      const c = document.querySelector('canvas');
      return !!c && c.width > 0 && c.height > 0;
    },
    { timeout: BOOT_TIMEOUT_MS },
  );
  // Let page_load fire and the 15 s timed flush come round.
  await page.waitForTimeout(waitMs);
  const host = await page.evaluate(() => location.hostname);
  // The engine banner only appears once wasm has instantiated and GDScript is
  // live. Asserted per-run because a canvas alone proves nothing — see the
  // secure-context note above.
  const booted = booteds.some((t) => t.includes('Godot Engine v'));
  await browser.close();
  return { posts, telemetryLogs, host, booted };
}

try {
  // --- 1. No endpoint compiled in (the Pages / tailnet / local build) ------
  console.log('\n=== build WITHOUT an endpoint (Pages, Helios, local) ===');
  exportBuild('');
  const noEndpointLocal = await run('localhost');
  check('no-endpoint @ localhost: engine booted', noEndpointLocal.booted);
  check('no-endpoint @ localhost: nothing sent', noEndpointLocal.posts.length === 0,
    `${noEndpointLocal.posts.length} requests`);
  check('no-endpoint @ localhost: still logs to console for verify_* tooling',
    noEndpointLocal.telemetryLogs.length > 0, `${noEndpointLocal.telemetryLogs.length} lines`);

  const noEndpointItch = await run('html-classic.itch.zone');
  check('no-endpoint @ itch: engine booted', noEndpointItch.booted);
  check('no-endpoint @ itch: nothing sent (build gate holds even on itch)',
    noEndpointItch.posts.length === 0, `${noEndpointItch.posts.length} requests`);

  // --- 2. Endpoint compiled in (the itch build) ---------------------------
  console.log('\n=== build WITH an endpoint (the itch build) ===');
  exportBuild(COLLECTOR);

  for (const host of ['localhost', 'lucy-holm.github.io', 'hellos.tail-scale.ts.net']) {
    const r = await run(host);
    check(`endpoint @ ${host}: engine booted`, r.booted);
    check(`endpoint @ ${host}: nothing sent (runtime gate holds)`, r.posts.length === 0,
      `host=${r.host} ${r.posts.length} requests`);
  }

  const itch = await run('html-classic.itch.zone');
  check('endpoint @ itch.zone: engine booted', itch.booted);
  check('endpoint @ itch.zone: telemetry IS sent', itch.posts.length > 0,
    `host=${itch.host} ${itch.posts.length} requests`);

  if (itch.posts.length > 0) {
    const body = JSON.parse(itch.posts[0].body);
    check('itch batch envelope carries the worker\'s required fields',
      ['version', 'session', 'player', 'run', 'env', 'debug', 'events'].every((k) => k in body),
      Object.keys(body).join(','));
    check('itch batch reports env="itch"', body.env === 'itch', `env=${body.env}`);
    check('itch batch contains a page_load event',
      (body.events || []).some((e) => e.name === 'page_load'),
      (body.events || []).map((e) => e.name).join(','));
    const pl = (body.events || []).find((e) => e.name === 'page_load');
    if (pl) {
      check('page_load carries the F19 session context',
        ['ua', 'screen', 'touch', 'referrer', 'hostname', 'iframe', 'dpr', 'lang', 'cores']
          .every((k) => k in pl),
        Object.keys(pl).join(','));
    }
  }

  // --- 3. The opt-out (F22) ----------------------------------------------
  console.log('\n=== ?notrack=1 on itch ===');
  const browser = await chromium.launch({
    channel: 'chrome',
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox',
      '--host-resolver-rules=MAP html-classic.itch.zone 127.0.0.1',
      `--unsafely-treat-insecure-origin-as-secure=http://html-classic.itch.zone:${PORT}`],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const optOutPosts = [];
  const optOutLogs = [];
  await page.route('**/*', async (route) => {
    if (route.request().url().includes('collector.invalid.example')) {
      optOutPosts.push(route.request().url());
      return route.fulfill({ status: 200, body: '{}' });
    }
    return route.continue();
  });
  page.on('console', (m) => { if (m.text().includes('[telemetry]')) optOutLogs.push(m.text()); });
  await page.goto(`http://html-classic.itch.zone:${PORT}/index.html?notrack=1`,
    { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    const c = document.querySelector('canvas');
    return !!c && c.width > 0 && c.height > 0;
  }, { timeout: BOOT_TIMEOUT_MS });
  await page.waitForTimeout(20000);
  await browser.close();
  check('?notrack=1 on itch: nothing sent', optOutPosts.length === 0, `${optOutPosts.length} requests`);
  check('?notrack=1 on itch: nothing even queued', optOutLogs.length === 0, `${optOutLogs.length} lines`);
} finally {
  server.kill();
  // ALWAYS leave the tree with an empty config — a populated one committed by
  // accident is exactly what the whole build-time gate exists to prevent.
  execFileSync('tools/write_build_config.sh', ['', ''], { stdio: 'inherit' });
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('FAILED:', failed.map((f) => f.name).join('; '));
  process.exit(1);
}
console.log('OK - telemetry transmits from itch and nowhere else');
