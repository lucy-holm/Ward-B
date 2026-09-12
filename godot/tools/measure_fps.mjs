// Frame-rate probe for the web build, on an emulated phone viewport.
//
//   node tools/measure_fps.mjs
//
// CAVEAT, and it matters: headless Chrome rasterises with SwiftShader on the
// CPU, so the ABSOLUTE numbers here are far below a real phone GPU and mean
// very little on their own. This is built for A/B comparison — run it against
// two builds and compare the ratio. Anything that halves the frame rate under
// SwiftShader is worth investigating on real hardware.
import { chromium, devices } from 'playwright';

const BASE_URL = process.env.WARDB_URL || 'http://127.0.0.1:8899/index.html';
const LABEL = process.env.LABEL || 'build';
const ROOM = process.env.WARDB_ROOM || '';
const CANVAS_TIMEOUT_MS = 90000;
const SESSION_TIMEOUT_MS = 30000;
const WARMUP_MS = 5000;
const SAMPLE_MS = 12000;

const targetUrl = new globalThis.URL(BASE_URL);
if (ROOM && !targetUrl.searchParams.has('room')) targetUrl.searchParams.set('room', ROOM);

async function main() {
  const browser = await chromium.launch({
    channel: 'chrome',
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  });
  try {
    const ctx = await browser.newContext({ ...devices['Pixel 7'], hasTouch: true, isMobile: true });
    const page = await ctx.newPage();

    const telemetryEvents = [];
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (msg) => {
      const text = msg.text();
      if (/SCRIPT ERROR|Shader compilation failed|Failed to load/.test(text)) errors.push(text);
      const marker = text.indexOf('[telemetry]');
      if (marker === -1) return;
      try {
        const payload = JSON.parse(text.slice(marker + '[telemetry]'.length).trim());
        telemetryEvents.push(...(payload.events || []));
      } catch {
        // Console output is diagnostic only; the waits below will fail clearly
        // if the expected events never reach the local/off-web stream.
      }
    });

    await page.goto(targetUrl.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page
      .waitForFunction(() => {
        const c = document.querySelector('canvas');
        return !!c && c.width > 0;
      }, null, { timeout: CANVAS_TIMEOUT_MS })
      .catch(() => {
        throw new Error(`Godot canvas did not start within ${CANVAS_TIMEOUT_MS / 1000}s`);
      });

    // The canvas can be sized before the main scene has finished loading. Wait
    // for room_enter so the tap cannot race _ready/load_room. The room is
    // visible behind the overlay, but gameplay and its active path are gated
    // until ADMIT ME.
    const roomDeadline = Date.now() + SESSION_TIMEOUT_MS;
    while (!telemetryEvents.some((event) => event.name === 'room_enter') && Date.now() < roomDeadline) {
      await page.waitForTimeout(250);
    }
    if (!telemetryEvents.some((event) => event.name === 'room_enter')) {
      throw new Error(
        `room_enter telemetry was not observed within ${SESSION_TIMEOUT_MS / 1000}s; engine boot is incomplete`,
      );
    }

    const actualRoom = telemetryEvents.find((event) => event.name === 'room_enter').room;
    if (ROOM && actualRoom !== ROOM) {
      throw new Error(`Requested ${ROOM}, but the game loaded ${actualRoom}`);
    }

    // Gameplay is gated behind ADMIT ME. Measuring before this tap measures a
    // paused title backdrop and does not exercise the live gameplay path.
    const geom = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      return { w: c.width, h: c.height, dpr: window.devicePixelRatio || 1 };
    });
    await page.touchscreen.tap((geom.w * 0.5) / geom.dpr, (geom.h * 0.65) / geom.dpr);

    // `session_start` is emitted by Telemetry.start() from the ADMIT ME
    // handler. Wait for the event rather than assuming the tap worked;
    // local/off-web telemetry prints it on its normal 15s flush cadence.
    const sessionDeadline = Date.now() + SESSION_TIMEOUT_MS;
    while (!telemetryEvents.some((event) => event.name === 'session_start') && Date.now() < sessionDeadline) {
      await page.waitForTimeout(250);
    }
    if (!telemetryEvents.some((event) => event.name === 'session_start')) {
      throw new Error(
        `ADMIT ME was not confirmed by session_start telemetry within ${SESSION_TIMEOUT_MS / 1000}s`,
      );
    }

    // Let gameplay settle past the first-frame shader/pipeline compiles before
    // collecting the A/B sample. This wait is bounded and is separate from
    // start confirmation so a slow browser cannot silently measure the overlay.
    await page.waitForTimeout(WARMUP_MS);

    const fps = await page.evaluate(async (ms) => {
      return await new Promise((resolve) => {
        let frames = 0;
        const t0 = performance.now();
        const tick = () => {
          frames++;
          if (performance.now() - t0 < ms) requestAnimationFrame(tick);
          else resolve((frames * 1000) / (performance.now() - t0));
        };
        requestAnimationFrame(tick);
      });
    }, SAMPLE_MS);

    if (errors.length) throw new Error(errors.join('\n'));
    console.log(
      `${LABEL}: ${fps.toFixed(1)} rAF callbacks/s at ${geom.w}x${geom.h}`
      + ` (SwiftShader CPU raster; gameplay confirmed; room=${actualRoom})`,
    );
    console.log('NOTE: SwiftShader is a CPU rasteriser. Use this result for build-to-build A/B comparisons only; it is not a target for real phone GPU FPS.');
  } finally {
    await browser.close();
  }
}

await main();
