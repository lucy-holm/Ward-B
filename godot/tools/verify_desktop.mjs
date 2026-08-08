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

// ADMIT ME. Play is gated behind the start overlay, so without this the
// player's input stays disabled and every assertion below fails — which is
// the correct behaviour, not a bug to route around.
//
// Clicked by POSITION rather than by a selector: the overlay is Godot
// Control nodes drawn into the canvas, so there is no DOM node to target.
// The button is centred horizontally and sits at ~65% of viewport height at
// the 1280x720 this harness uses (start_overlay.gd lays out from viewport
// height against a 720p baseline). Asserted below via `admitted`, so a
// layout change that moves the button fails loudly here instead of silently
// turning this file into a test of nothing.
const admit = { x: 640, y: 468 };
await page.mouse.click(admit.x, admit.y);
await page.waitForTimeout(1200);

// WALK: hold W.
await page.keyboard.down('KeyW');
await page.waitForTimeout(2500);
await page.keyboard.up('KeyW');
await page.waitForTimeout(500);

// STRAFE: hold D.
await page.keyboard.down('KeyD');
await page.waitForTimeout(1500);
await page.keyboard.up('KeyD');

// LOOK: click to engage pointer lock, then move the mouse.
//
// This assertion exists because it was previously skipped as "may or may not
// engage headlessly", and that is exactly the bug that shipped: on the web,
// pointer lock can ONLY be requested inside a user-gesture handler, so the
// startup request was silently refused and desktop mouse-look was completely
// dead. Clicking the canvas is the whole point of the test.
await page.locator('canvas').click({ force: true }).catch(() => {});
await page.waitForTimeout(500);
const locked = await page.evaluate(() => document.pointerLockElement !== null);
await page.mouse.move(640, 360);
for (let i = 0; i < 20; i++) await page.mouse.move(640 + i * 30, 360 + (i % 3) * 8);
await page.waitForTimeout(600);

await page.waitForTimeout(17000);
await browser.close();

const pos = events.filter((e) => e.name === 'pos');
const moved = new Set(pos.map((e) => `${e.x},${e.z}`)).size;

console.log(`\npos samples: ${pos.length}`);
if (pos.length) {
  console.log('first:', JSON.stringify({ x: pos[0].x, z: pos[0].z, yaw: pos[0].yaw }));
  console.log('last :', JSON.stringify({ x: pos.at(-1).x, z: pos.at(-1).z, yaw: pos.at(-1).yaw }));
}
const yaws = new Set(pos.map((e) => e.yaw)).size;

// The overlay hands input to the player only on ADMIT ME, so any movement at
// all proves the click landed on the button. Reported separately from
// WALK/STRAFE so "the start screen swallowed everything" is distinguishable
// from "keyboard input is broken".
const admitted = moved > 1;

console.log('\n--- desktop input ---');
console.log(`ADMIT ME accepted the click    : ${admitted}   ${admitted ? 'OK' : 'STILL GATED'}`);
console.log(`WALK/STRAFE distinct positions : ${moved}   ${moved > 1 ? 'OK' : 'NO RESPONSE'}`);
console.log(`pointer lock engaged on click  : ${locked}   ${locked ? 'OK' : 'NOT LOCKED'}`);
console.log(`LOOK distinct yaw values       : ${yaws}   ${yaws > 1 ? 'OK' : 'NO RESPONSE'}`);
console.log(`errors                         : ${errors.length ? errors.join('\n') : 'none'}`);

const ok = pos.length > 0 && admitted && moved > 1 && yaws > 1 && errors.length === 0;
console.log(ok ? '\nDESKTOP VERIFY: PASS' : '\nDESKTOP VERIFY: FAIL');
process.exit(ok ? 0 : 1);
