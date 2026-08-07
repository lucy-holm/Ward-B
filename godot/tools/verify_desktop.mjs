// Desktop input check — keyboard movement and mouse look.
//
//   node tools/verify_desktop.mjs
//
// WHY THIS EXISTS: a stray '#' comment in project.godot silently dropped the
// entire [input] section (Godot's config format uses ';', not '#'), which
// broke every keyboard action. Nothing caught it: verify_web.mjs only checks
// that the build boots, and verify_touch.mjs passes without the InputMap
// because touch drives the player directly. Desktop input was broken for
// several commits.
//
// Asserts against the game's own `pos` telemetry, same as verify_touch.
import { chromium } from 'playwright';

const URL = process.env.WARDB_URL || 'http://127.0.0.1:8899/index.html';

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const errors = [];
const events = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (msg) => {
  const t = msg.text();
  const i = t.indexOf('[telemetry]');
  if (i !== -1) {
    try {
      for (const e of JSON.parse(t.slice(i + 11).trim()).events || []) events.push(e);
    } catch {}
  }
  // An unmapped action logs "The InputMap action ... doesn't exist" — treat
  // that as a hard failure rather than letting it scroll past.
  if (t.includes("InputMap action")) errors.push(t);
});

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page
  .waitForFunction(() => {
    const c = document.querySelector('canvas');
    return !!c && c.width > 0;
  }, { timeout: 90000 })
  .catch(() => {});
await page.waitForTimeout(12000);

// Click the canvas so it has focus and pointer lock can engage.
await page.locator('canvas').click({ force: true }).catch(() => {});
await page.waitForTimeout(600);

// WALK: hold W.
await page.keyboard.down('KeyW');
await page.waitForTimeout(2500);
await page.keyboard.up('KeyW');
await page.waitForTimeout(500);

// STRAFE: hold D.
await page.keyboard.down('KeyD');
await page.waitForTimeout(1500);
await page.keyboard.up('KeyD');

// LOOK: mouse motion (pointer lock may or may not engage headlessly; the
// walk assertions are the load-bearing ones).
await page.mouse.move(640, 360);
for (let i = 0; i < 10; i++) await page.mouse.move(640 + i * 25, 360);

await page.waitForTimeout(17000);
await browser.close();

const pos = events.filter((e) => e.name === 'pos');
const moved = new Set(pos.map((e) => `${e.x},${e.z}`)).size;

console.log(`\npos samples: ${pos.length}`);
if (pos.length) {
  console.log('first:', JSON.stringify({ x: pos[0].x, z: pos[0].z, yaw: pos[0].yaw }));
  console.log('last :', JSON.stringify({ x: pos.at(-1).x, z: pos.at(-1).z, yaw: pos.at(-1).yaw }));
}
console.log('\n--- desktop input ---');
console.log(`WALK/STRAFE distinct positions : ${moved}   ${moved > 1 ? 'OK' : 'NO RESPONSE'}`);
console.log(`errors                         : ${errors.length ? errors.join('\n') : 'none'}`);

const ok = pos.length > 0 && moved > 1 && errors.length === 0;
console.log(ok ? '\nDESKTOP VERIFY: PASS' : '\nDESKTOP VERIFY: FAIL');
process.exit(ok ? 0 : 1);
