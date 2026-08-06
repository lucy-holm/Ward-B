// End-to-end web-export check: loads the exported build in a real browser,
// waits for the Godot runtime to boot, and proves GDScript actually ran.
//
//   node tools/verify_web.mjs            (expects a server on :8899)
//
// "It exported" is not the same as "it runs". Godot web builds fail at
// runtime in ways the exporter cannot see — missing WebGL2, a wasm that
// won't instantiate, an autoload that throws on _ready. This catches those.
import { chromium } from 'playwright';

const URL = process.env.WARDB_URL || 'http://127.0.0.1:8899/index.html';
const BOOT_TIMEOUT_MS = 90000;

const logs = [];
const errors = [];

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

page.on('console', (msg) => {
  const t = msg.text();
  logs.push(`[${msg.type()}] ${t}`);
});
page.on('pageerror', (err) => errors.push(String(err)));

console.log(`navigating to ${URL}`);
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

// The Godot shell creates a <canvas>; the engine only starts once wasm is
// instantiated, so poll for a canvas that has actually been sized.
const started = await page
  .waitForFunction(
    () => {
      const c = document.querySelector('canvas');
      return !!c && c.width > 0 && c.height > 0;
    },
    { timeout: BOOT_TIMEOUT_MS },
  )
  .then(() => true)
  .catch(() => false);

// Give the first frames time to run _ready on the autoloads + main scene.
await page.waitForTimeout(12000);

await page.screenshot({ path: 'tools/web-verify.png' });

const canvasInfo = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  if (!c) return null;
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  return { width: c.width, height: c.height, gl: !!gl };
});

await browser.close();

// Our Telemetry autoload prints the batch to console when no endpoint is
// configured — seeing it is proof GDScript executed, not just that wasm
// loaded.
const ranGdscript = logs.some((l) => l.includes('[telemetry]'));
const hardErrors = logs.filter((l) => /SCRIPT ERROR|Failed to load|Condition .* is true/.test(l));

console.log('\n--- console tail ---');
for (const l of logs.slice(-25)) console.log(l);

console.log('\n--- result ---');
console.log('canvas started :', started);
console.log('canvas info    :', JSON.stringify(canvasInfo));
console.log('gdscript ran   :', ranGdscript);
console.log('page errors    :', errors.length ? errors.join('\n') : 'none');
console.log('godot errors   :', hardErrors.length ? hardErrors.join('\n') : 'none');

const ok = started && canvasInfo?.gl && ranGdscript && errors.length === 0 && hardErrors.length === 0;
console.log(ok ? '\nWEB VERIFY: PASS' : '\nWEB VERIFY: FAIL');
process.exit(ok ? 0 : 1);
