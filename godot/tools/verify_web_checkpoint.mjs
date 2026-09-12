#!/usr/bin/env node
/**
 * Exported-web checkpoint smoke test.
 *
 * This runner copies the Godot project to a temporary directory, places the
 * companion harness at the temporary project root (tools/ is excluded from
 * the shipped export), exports Web, serves that export, and drives fresh
 * Playwright profiles through save -> reload -> real Continue. No live
 * project user:// data is touched.
 *
 * Usage from the repository root:
 *   node godot/tools/verify_web_checkpoint.mjs
 *   WARD_SETTLE_MS=1000 node godot/tools/verify_web_checkpoint.mjs
 */

import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const godotDir = path.resolve(scriptDir, "..");
const godotBin = process.env.GODOT_BIN || "godot";
const pythonBin = process.env.PYTHON_BIN || "python3";
const settleMs = Number(process.env.WARD_SETTLE_MS || 10000);

function copyTree(source, destination) {
  fs.cpSync(source, destination, {
    recursive: true,
    filter: (sourcePath) => {
      const relative = path.relative(source, sourcePath);
      return !relative.startsWith(".godot") &&
        !relative.startsWith(".artifacts") &&
        !relative.startsWith("build") &&
        !relative.includes("__pycache__");
    },
  });
}

function run(command, args, cwd, logPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    const output = fs.createWriteStream(logPath);
    child.stdout.pipe(output);
    child.stderr.pipe(output);
    child.once("error", reject);
    child.once("close", (code) => {
      output.close();
      if (code === 0) resolve();
      else reject(new Error(`${command} exited ${code}; see ${logPath}`));
    });
  });
}

function serve(directory) {
  const types = {
    ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm",
    ".pck": "application/octet-stream", ".png": "image/png", ".json": "application/json",
  };
  const server = http.createServer((request, response) => {
    try {
      const requestPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      const relative = requestPath === "/" ? "/index.html" : requestPath;
      const file = path.resolve(directory, `.${relative}`);
      if (!file.startsWith(path.resolve(directory) + path.sep)) {
        response.writeHead(403).end();
        return;
      }
      const stream = fs.createReadStream(file);
      stream.once("open", () => response.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      }));
      stream.on("error", () => response.writeHead(404).end());
      stream.pipe(response);
    } catch {
      response.writeHead(400).end();
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function indexedDbHasCheckpoint(page) {
  return page.evaluate(() => new Promise((resolve) => {
    const request = indexedDB.open("/userfs");
    request.onerror = () => resolve(false);
    request.onsuccess = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("FILE_DATA")) {
        database.close();
        resolve(false);
        return;
      }
      try {
        const store = database.transaction("FILE_DATA").objectStore("FILE_DATA");
        const keys = store.getAllKeys();
        keys.onerror = () => {
          database.close();
          resolve(false);
        };
        keys.onsuccess = () => {
          const found = keys.result.some((key) =>
            String(key).endsWith("wardb-checkpoint-v1.json"));
          database.close();
          resolve(found);
        };
      } catch {
        database.close();
        resolve(false);
      }
    };
  }));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function exerciseProfile(baseUrl, profileDir, mobile) {
  let context;
  try {
    context = await chromium.launchPersistentContext(profileDir, {
      headless: true,
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      ...(mobile ? {
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 1,
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
          "AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari/604.1",
      } : {}),
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto(`${baseUrl}/index.html?ward_harness=save`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__wardHarness, null, { timeout: 30000 });
    const save = await page.evaluate(() => window.__wardHarness);
    assert(save.status === "saved", `save phase failed: ${JSON.stringify(save)}`);
    await page.waitForTimeout(settleMs);
    const persistedBeforeReload = await indexedDbHasCheckpoint(page);
    assert(persistedBeforeReload,
      "checkpoint did not reach the /userfs IndexedDB store before reload");

    // Keep the same fresh profile but force the next document to boot in the
    // Continue phase. This is a browser reload, so IndexedDB is the only state
    // available to the new Godot runtime.
    await page.evaluate(() => history.replaceState({}, "", `${location.pathname}?ward_harness=continue`));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__wardHarness?.status === "continue_ready", null,
      { timeout: 30000 });
    const ready = await page.evaluate(() => window.__wardHarness);
    assert(ready.visible && ready.text.startsWith("CONTINUE — THE UNDERCROFT"),
      `Continue button missing: ${JSON.stringify(ready)}`);

    if (mobile) {
      assert(ready.touch_visible, "touch controls are hidden in touch export");
      for (const [name, rect] of Object.entries(ready.touch_rects)) {
        assert(rect[2] >= 44 && rect[3] >= 44, `${name} touch target is below 44px`);
        assert(rect[0] >= 0 && rect[1] >= 0 && rect[0] + rect[2] <= 390 && rect[1] + rect[3] <= 844,
          `${name} touch target is outside viewport: ${rect}`);
      }
    }

    const [x, y, width, height] = ready.rect;
    if (mobile) await page.touchscreen.tap(x + width / 2, y + height / 2);
    else await page.mouse.click(x + width / 2, y + height / 2);
    await page.waitForFunction(() => window.__wardHarness?.status === "continued", null,
      { timeout: 30000 });
    const continued = await page.evaluate(() => window.__wardHarness);
    assert(continued.scene.endsWith("room19_lights.tscn"), `wrong Continue scene: ${JSON.stringify(continued)}`);
    assert(continued.position[0] === 4 && Math.abs(continued.position[1] - 0.9) < 0.01 &&
      Math.abs(continued.position[2] + 6.7) < 0.01, `wrong Continue anchor: ${JSON.stringify(continued)}`);
    assert(continued.input, "Continue did not enable player input");

    const unexpectedErrors = pageErrors.filter((message) =>
      message !== "The root document of this element is not valid for pointer lock.");
    assert(unexpectedErrors.length === 0,
      `unexpected browser runtime errors: ${JSON.stringify(unexpectedErrors)}`);
    return { persistedBeforeReload, pageErrors };
  } finally {
    await context?.close();
  }
}

async function main() {
  if (!Number.isFinite(settleMs) || settleMs < 0) throw new Error("WARD_SETTLE_MS must be non-negative");
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "wardb-web-verify-"));
  const profileRoot = fs.mkdtempSync(path.join(os.tmpdir(), "wardb-web-profiles-"));
  let server;
  try {
    copyTree(godotDir, tempRoot);
    fs.copyFileSync(path.join(scriptDir, "test_web_checkpoint_harness.gd"),
      path.join(tempRoot, "web_checkpoint_harness.gd"));
    let scene = fs.readFileSync(path.join(scriptDir, "test_web_checkpoint_harness.tscn"), "utf8");
    scene = scene.replaceAll("res://tools/test_web_checkpoint_harness.gd", "res://web_checkpoint_harness.gd");
    fs.writeFileSync(path.join(tempRoot, "web_checkpoint_harness.tscn"), scene);
    const projectPath = path.join(tempRoot, "project.godot");
    fs.writeFileSync(projectPath, fs.readFileSync(projectPath, "utf8")
      .replace('run/main_scene="res://main.tscn"', 'run/main_scene="res://web_checkpoint_harness.tscn"'));
    fs.mkdirSync(path.join(tempRoot, "export"));
    await run(godotBin, ["--headless", "--path", tempRoot, "--export-release", "Web",
      path.join(tempRoot, "export", "index.html")], tempRoot, path.join(tempRoot, "export.log"));
    server = await serve(path.join(tempRoot, "export"));
    const port = server.address().port;
    const desktop = await exerciseProfile(`http://127.0.0.1:${port}`, path.join(profileRoot, "desktop"), false);
    const touch = await exerciseProfile(`http://127.0.0.1:${port}`, path.join(profileRoot, "touch"), true);
    console.log(JSON.stringify({
      ok: true,
      settleMs,
      desktop,
      touch,
      note: "pageerror can contain the expected headless pointer-lock rejection after Continue",
    }, null, 2));
  } finally {
    server?.close();
    if (process.env.KEEP_WARD_WEB_VERIFY !== "1") {
      fs.rmSync(tempRoot, { recursive: true, force: true });
      fs.rmSync(profileRoot, { recursive: true, force: true });
    } else {
      console.log(`kept temp export: ${tempRoot}`);
      console.log(`kept profiles: ${profileRoot}`);
    }
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
