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

const URL = process.env.WARDB_URL || 'http://127.0.0.1:8899/index.html';
const LABEL = process.env.LABEL || 'build';
const SAMPLE_MS = 12000;

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const ctx = await browser.newContext({ ...devices['Pixel 7'], hasTouch: true, isMobile: true });
const page = await ctx.newPage();

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page
  .waitForFunction(() => {
    const c = document.querySelector('canvas');
    return !!c && c.width > 0;
  }, { timeout: 90000 })
  .catch(() => {});
// Let the engine settle past its first-frame shader compiles.
await page.waitForTimeout(15000);

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

const geom = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  return { w: c.width, h: c.height };
});

await browser.close();
console.log(`${LABEL}: ${fps.toFixed(1)} fps at ${geom.w}x${geom.h} (SwiftShader, CPU raster)`);
