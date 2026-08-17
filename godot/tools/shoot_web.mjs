// Screenshot the game AS THE BROWSER ACTUALLY RENDERS IT.
//
//   node tools/shoot_web.mjs [name] [seconds] [keys]
//   WARDB_URL=https://host:8444/index.html node tools/shoot_web.mjs
//
// `keys` is a comma-separated list sent to the canvas once the ward has
// settled — e.g. `Backquote` to open the render-style dev panel. Needed
// because the panel's whole point is that it works IN A BROWSER: a local
// Godot run cannot prove a browser does not swallow the key first, which is
// precisely why that binding is Backquote rather than F3 (Chrome and Firefox
// both claim F3 for "find next" before the canvas ever sees it).
//
// WHY THIS EXISTS: every other visual check in this repo renders through
// tools/shoot.gd, which loads a room scene directly in a local Godot process.
// That is not what the player sees, and twice now it has disagreed with
// reality in ways that cost a playtest session:
//
//  1. nginx serves pre-compressed .gz via gzip_static. A stale .gz next to a
//     fresh .pck means the browser runs an OLD BUILD while every local check
//     renders the new one. deploy_tailnet.sh now guards that, but only this
//     script proves the pixels.
//  2. shoot.gd is pointed at a hand-written camera position. The room-1 spawn
//     view was verified for weeks with the camera aimed 180 degrees away from
//     the direction the player actually faces (spawn yaw is PI), so the one
//     view every player sees first was never looked at.
//
// Whenever a judgement is about how the game LOOKS, take the shot here.
import { chromium } from 'playwright';

const URL = process.env.WARDB_URL || 'http://127.0.0.1:8091/index.html';
const NAME = process.argv[2] || 'web_shot';
const WAIT_S = Number(process.argv[3] || 20);

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page
  .waitForFunction(() => {
    const c = document.querySelector('canvas');
    return !!c && c.width > 0;
  }, { timeout: 90000 })
  .catch(() => {});

// The engine boots, then room1 loads and the mood tween settles. Shooting too
// early catches the default Environment, not MOOD.
await page.waitForTimeout(WAIT_S * 1000);

// Focus the canvas first. Godot's web build listens on the canvas element,
// not the document, so a key dispatched at the page default target is
// delivered to nothing and the shot silently looks like the key did not work.
const KEYS = (process.argv[4] || '').split(',').map((k) => k.trim()).filter(Boolean);
if (KEYS.length) {
  await page.locator('canvas').click({ position: { x: 5, y: 5 } }).catch(() => {});
  for (const k of KEYS) {
    await page.keyboard.press(k);
    await page.waitForTimeout(600);
  }
}

await page.screenshot({ path: `.artifacts/${NAME}.png` });
await browser.close();

console.log(`wrote .artifacts/${NAME}.png from ${URL}`);
if (errors.length) console.log('page errors:\n' + errors.join('\n'));
