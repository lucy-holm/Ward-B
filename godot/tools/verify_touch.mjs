// Mobile playability check — does a phone player have every verb?
//
//   node tools/verify_touch.mjs
//
// Loads the build in a touch-emulated phone and asserts against the game's
// OWN state, read from `pos` telemetry (sampled every 2s), not screenshots.
//
// An earlier version of this file diffed PNG bytes and "passed" on a build
// whose action buttons did not exist. PNG compression means one changed
// pixel cascades through the whole stream, so any change reads as ~99%
// different. It measured nothing. Don't reintroduce that.
//
// Asserts:
//   LOOK   - dragging the right half changes yaw
//   MOVE   - dragging the left half changes x/z
//   ACTION - the on-screen E button can take Room 1's pill, which flips the
//            ward state to lucid. This is the one that was broken: touch
//            drag worked, but with no buttons the game was unfinishable.
import { chromium, devices } from 'playwright';

const URL = process.env.WARDB_URL || 'http://127.0.0.1:8899/index.html';
const phone = devices['Pixel 7'];

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const ctx = await browser.newContext({ ...phone, hasTouch: true, isMobile: true });
const page = await ctx.newPage();

const errors = [];
const posEvents = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (msg) => {
  const t = msg.text();
  const i = t.indexOf('[telemetry]');
  if (i === -1) return;
  try {
    const batch = JSON.parse(t.slice(i + 11).trim());
    for (const e of batch.events || []) posEvents.push(e);
  } catch {}
});

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page
  .waitForFunction(() => {
    const c = document.querySelector('canvas');
    return !!c && c.width > 0;
  }, { timeout: 90000 })
  .catch(() => {});
await page.waitForTimeout(12000);

const size = page.viewportSize();
const cdp = await page.context().newCDPSession(page);

async function drag(fromX, fromY, toX, toY, steps = 10, holdMs = 60) {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: fromX, y: fromY }],
  });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: fromX + ((toX - fromX) * i) / steps, y: fromY + ((toY - fromY) * i) / steps },
      ],
    });
    await page.waitForTimeout(holdMs);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function tap(x, y) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await page.waitForTimeout(70);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(250);
}

// Locate the E button with the SAME formula touch_controls.gd uses, in the
// canvas drawing-buffer space, then convert to CSS pixels for CDP.
//
// This is the trap that cost the most time here: Godot's web UI space is the
// drawing buffer (CSS x devicePixelRatio), so on a 2.6x phone a button drawn
// at "bottom-right minus 210" is nowhere near CSS "width - 210". Taps landed
// in empty space and the button looked dead when it was fine.
const geom = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  return { bw: c.width, bh: c.height, dpr: window.devicePixelRatio };
});
const btn = Math.min(Math.max(0.155 * geom.bw, 72), 260);
const margin = 0.035 * geom.bw;
const eBtn = {
  x: (geom.bw - margin - btn * 0.5) / geom.dpr,
  y: (geom.bh - margin - btn * 1.6) / geom.dpr,
};
console.log('canvas buffer', geom.bw + 'x' + geom.bh, 'dpr', geom.dpr,
  '-> E button at css', Math.round(eBtn.x) + ',' + Math.round(eBtn.y));

// --- LOOK + ACTION ---
// Room 1 spawns at (0,4) facing +Z. The cup is at (-2.2, 0.92, 4.7) — 2.3 m
// away, inside the 2.7 m interact range.
//
// The interact ray is horizontal from eye height 1.62 m, and the cup sits at
// 0.92 m on a table, so a purely horizontal sweep passes clean OVER it. Pitch
// down ~17 deg (atan(0.7/2.3)) first, then sweep. Getting this wrong made an
// earlier run report a dead button when the button was fine.
const RAD_PER_PX = 0.0024 * 1.9; // lookSensitivity * touchLookScale

// Pitch down to the tabletop.
const pitchPx = Math.atan(0.7 / 2.3) / RAD_PER_PX;
await drag(size.width * 0.8, size.height * 0.3, size.width * 0.8, size.height * 0.3 + pitchPx, 6, 40);
await page.waitForTimeout(300);

// Turn to face the cup exactly, rather than sweeping and hoping: it subtends
// only ~4.5 deg at 2.3 m, so any step coarser than that can walk straight
// past it. Spawn yaw is PI; the cup at (-2.2, 4.7) from (0,4) needs yaw
// 1.876, and yaw decreases as you drag right.
const yawDeltaPx = (Math.PI - 1.876) / RAD_PER_PX;
let remaining = yawDeltaPx;
while (remaining > 0) {
  const chunk = Math.min(remaining, size.width * 0.35);
  await drag(size.width * 0.55, size.height * 0.4, size.width * 0.55 + chunk, size.height * 0.4, 4, 30);
  remaining -= chunk;
  await page.waitForTimeout(120);
}
await page.waitForTimeout(400);
await tap(eBtn.x, eBtn.y);
await page.waitForTimeout(400);

// Fallback: if the aim was slightly off, nudge in fine (~2.3 deg) steps and
// tap at each, covering +-25 deg around the computed heading.
for (let i = 0; i < 22; i++) {
  await drag(size.width * 0.55, size.height * 0.4, size.width * 0.55 - 9, size.height * 0.4, 2, 20);
  await tap(eBtn.x, eBtn.y);
}

// --- MOVE: hold the left stick forward ---
await drag(size.width * 0.22, size.height * 0.72, size.width * 0.22, size.height * 0.42, 6, 120);
await page.waitForTimeout(1200);
await drag(size.width * 0.22, size.height * 0.72, size.width * 0.22, size.height * 0.42, 6, 120);

// Wait out the 15 s timed flush so the pos batch reaches the console.
await page.waitForTimeout(17000);
await page.screenshot({ path: 'tools/touch-verify.png' });
await browser.close();

const pos = posEvents.filter((e) => e.name === 'pos');
const uniq = (k) => new Set(pos.map((e) => e[k])).size;

const yaws = uniq('yaw');
const moved = new Set(pos.map((e) => `${e.x},${e.z}`)).size;
const wentLucid = posEvents.some((e) => e.state === 'lucid');

console.log(`\npos samples: ${pos.length}`);
if (pos.length) {
  console.log('first:', JSON.stringify({ x: pos[0].x, z: pos[0].z, yaw: pos[0].yaw, state: pos[0].state }));
  console.log('last :', JSON.stringify({
    x: pos.at(-1).x, z: pos.at(-1).z, yaw: pos.at(-1).yaw, state: pos.at(-1).state,
  }));
}

console.log('\n--- mobile playability ---');
console.log(`LOOK   distinct yaw values : ${yaws}      ${yaws > 1 ? 'OK' : 'NO RESPONSE'}`);
console.log(`MOVE   distinct positions  : ${moved}      ${moved > 1 ? 'OK' : 'NO RESPONSE'}`);
console.log(`ACTION pill taken (lucid)  : ${wentLucid}   ${wentLucid ? 'OK' : 'BUTTON DEAD'}`);
console.log(`page errors                : ${errors.length ? errors.join('\n') : 'none'}`);

const ok = pos.length > 0 && yaws > 1 && moved > 1 && wentLucid && errors.length === 0;
console.log(ok ? '\nTOUCH VERIFY: PASS' : '\nTOUCH VERIFY: FAIL');
process.exit(ok ? 0 : 1);
