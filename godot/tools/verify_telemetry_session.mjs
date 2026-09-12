// Proves the INTERACTIVE half of the telemetry set actually fires during a
// real session on itch — the events that only exist once someone presses
// ADMIT ME and starts playing.
//
//   node tools/verify_telemetry_session.mjs
//
// tools/verify_telemetry_gate.mjs covers who is allowed to transmit and the
// boot-time events. It cannot cover these, because page_load fires before the
// start overlay is dismissed and nothing else does. Without this file,
// session_start / perf / idle / shift could all be silently dead — which is
// precisely what page_load itself turned out to be, and it looked healthy
// from the outside right up until the batch was read.
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 8904;
const HOST = 'html-classic.itch.zone';
const COLLECTOR = 'https://collector.invalid.example/ingest';
const EXPORT_DIR = mkdtempSync(join(tmpdir(), 'wardb-telemetry-session-'));
const SOURCE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_DIR = mkdtempSync(join(tmpdir(), 'wardb-telemetry-session-project-'));
cpSync(SOURCE_DIR, PROJECT_DIR, {
  recursive: true,
  filter: (path) => !['.godot', '.git', 'build', '__pycache__'].includes(path.split('/').at(-1)),
});
let server;
let browser;

// Register cleanup before touching the staged project. This covers export/
// boot failures as well as the normal browser-test path, and the real source
// tree's build_config.gd is never modified by this verifier.
let cleaned = false;
function cleanup() {
  if (cleaned) return;
  cleaned = true;
  if (server) server.kill();
  rmSync(EXPORT_DIR, { recursive: true, force: true });
  rmSync(PROJECT_DIR, { recursive: true, force: true });
}
process.once('exit', cleanup);

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

execFileSync('tools/write_build_config.sh', [COLLECTOR, ''], { stdio: 'ignore', cwd: PROJECT_DIR });
execFileSync('godot', ['--headless', '--path', PROJECT_DIR, '--import'], { stdio: 'ignore' });
execFileSync('godot', ['--headless', '--path', PROJECT_DIR, '--export-release', 'Web', join(EXPORT_DIR, 'index.html')], {
  stdio: 'ignore',
});

server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', EXPORT_DIR], {
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 800));

browser = await chromium.launch({
  channel: 'chrome',
  args: [
    '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox',
    `--host-resolver-rules=MAP ${HOST} 127.0.0.1`,
    `--unsafely-treat-insecure-origin-as-secure=http://${HOST}:${PORT}`,
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const events = [];
const batches = [];
await page.route('**/*', async (route) => {
  const url = route.request().url();
  if (url.includes('collector.invalid.example')) {
    try {
      const body = JSON.parse(route.request().postData());
      batches.push(body);
      for (const e of body.events || []) events.push(e);
    } catch { /* a malformed body is itself a failure, caught by the checks */ }
    return route.fulfill({ status: 200, body: '{"ok":true}', headers: { 'Access-Control-Allow-Origin': '*' } });
  }
  return route.continue();
});

try {
  await page.goto(`http://${HOST}:${PORT}/index.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    const c = document.querySelector('canvas');
    return !!c && c.width > 0 && c.height > 0;
  }, { timeout: 90000 });
  await page.waitForTimeout(3000);

  // ADMIT ME. Same geometry as tools/verify_touch.mjs: the overlay lays out
  // in drawing-buffer pixels, the button sits centred at ~65% of height.
  const geom = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return { bw: c.width, bh: c.height, dpr: window.devicePixelRatio || 1 };
  });
  await page.mouse.click((geom.bw * 0.5) / geom.dpr, (geom.bh * 0.65) / geom.dpr);
  await page.waitForTimeout(2000);

  // Backgrounding is resumable. Override visibilityState in this harness so
  // the real browser callback runs without closing the tab; a hidden→visible
  // cycle must not create the terminal quit event.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(700);
  check('visibility hidden→visible preserves the session (no quit)', !events.some((e) => e.name === 'quit'));

  // Walk and look. Q is deliberately NOT pressed to test shifting: room 1
  // gates the ability (StateManager.can_shift starts false and the tutorial
  // grants it), so a Q at spawn correctly does nothing. The shift wire shape
  // is asserted headlessly instead, in tools/check_telemetry.tscn, where the
  // ability can be granted directly — chasing room 1's tutorial through a
  // browser would test the tutorial, not the telemetry.
  await page.evaluate(() => {
    const c = document.querySelector('canvas');
    c.setAttribute('tabindex', '0');
    c.focus();
  });
  for (let i = 0; i < 3; i++) {
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(700);
    await page.keyboard.up('KeyW');
    await page.mouse.move(600 + i * 40, 360);
    await page.waitForTimeout(200);
  }

  // Sit still past the idle threshold (20 s) so idle_start fires...
  await page.waitForTimeout(24000);
  // ...then move again, which must produce idle_end with the idle duration.
  await page.mouse.move(700, 380);
  await page.keyboard.press('KeyW');
  // Long enough for the 15 s timed flush to carry idle_end, and for the 30 s
  // perf window (which opened at ADMIT ME) to close and be flushed.
  await page.waitForTimeout(20000);

  const names = new Set(events.map((e) => e.name));
  console.log(`\ncollected ${events.length} events in ${batches.length} batches`);
  console.log('names:', [...names].sort().join(', '));

  check('session_start fires on ADMIT ME', names.has('session_start'));
  check('pos sampling runs', names.has('pos'));
  check('perf sampling emits a window', names.has('perf'));
  check('idle_start fires after the idle threshold', names.has('idle_start'));
  check('idle_end fires when input resumes', names.has('idle_end'));

  const ss = events.find((e) => e.name === 'session_start');
  if (ss) {
    check('session_start carries the F19 session context',
      ['ua', 'screen', 'touch', 'referrer', 'hostname', 'iframe', 'dpr', 'lang', 'cores', 'version']
        .every((k) => k in ss), Object.keys(ss).join(','));
  }

  const perf = events.find((e) => e.name === 'perf');
  if (perf) {
    check('perf carries fps_p50/fps_p10/frames',
      ['fps_p50', 'fps_p10', 'frames'].every((k) => k in perf),
      `p50=${perf.fps_p50} p10=${perf.fps_p10} frames=${perf.frames}`);
  }

  const idleEnd = events.find((e) => e.name === 'idle_end');
  if (idleEnd) check('idle_end reports idle_s', 'idle_s' in idleEnd, `idle_s=${idleEnd.idle_s}`);

  // pagehide is the terminal close path. Dispatching it exercises the real
  // JavaScriptBridge callback and sendBeacon route while keeping the browser
  // alive long enough to observe the captured batch.
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.waitForTimeout(1000);
  check('pagehide records terminal quit', events.some((e) => e.name === 'quit'));
} finally {
  await browser.close();
  cleanup();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('FAILED:', failed.map((f) => f.name).join('; '));
  process.exit(1);
}
console.log('OK - the interactive telemetry set fires during a real session');
