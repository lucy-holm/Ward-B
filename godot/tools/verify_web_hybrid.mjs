#!/usr/bin/env node
/**
 * Isolated exported-web hybrid-input verification.
 *
 * Copies the Godot project to a temporary root, exports Web, serves it, and
 * drives a fresh iPad-like Playwright context through real mouse, keyboard,
 * and touch events. Screenshots are written under godot/.artifacts/ (ignored
 * by source control) for visual review.
 *
 * Usage from the repository root:
 *   node godot/tools/verify_web_hybrid.mjs
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
const artifactDir = path.join(godotDir, ".artifacts", "hybrid-browser");

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
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitStage(page, status) {
  await page.waitForFunction((expected) => window.__wardHybridStages?.[expected],
    status, { timeout: 30000 });
  return page.evaluate((expected) => window.__wardHybridStages[expected], status);
}

async function screenshot(page, name) {
  const target = path.join(artifactDir, `${name}.png`);
  await page.screenshot({ path: target });
  return target;
}

async function exercise(baseUrl, profileDir) {
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: true,
    viewport: { width: 1024, height: 768 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
    userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) " +
      "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    await page.goto(`${baseUrl}/index.html?ward_harness=hybrid`, { waitUntil: "domcontentloaded" });
    const boot = await waitStage(page, "boot");
    assert(boot.mode === "touch" && boot.touch_controls,
      `iPad capability should start in touch mode: ${JSON.stringify(boot)}`);
    const pointerLockBeforeGesture = await page.evaluate(() => document.pointerLockElement === null);
    assert(pointerLockBeforeGesture,
      "pointer lock must remain untouched before the real Admit button gesture");
    const screenshots = [await screenshot(page, "hybrid-boot-touch")];

    // A real mouse click on the real AdmitBtn is the gesture that may request
    // pointer lock. Before it, the harness must show no capture attempt.
    const admit = [boot.admit_rect[0] + boot.admit_rect[2] / 2,
      boot.admit_rect[1] + boot.admit_rect[3] / 2];
    assert(admit, "real AdmitBtn was not exported");
    await page.mouse.click(admit[0], admit[1]);
    const admitted = await waitStage(page, "admitted");
    assert(admitted.capture_attempted, `admit did not attempt pointer capture: ${JSON.stringify(admitted)}`);
    const pointer = await waitStage(page, "pointer_active");
    assert(pointer.mode === "pointer" && !pointer.touch_controls,
      `mouse gesture did not select desktop mode: ${JSON.stringify(pointer)}`);
    const pointerLockAfterGesture = await page.evaluate(() => document.pointerLockElement !== null);
    assert(pointerLockAfterGesture || pointer.capture_refused,
      `gesture neither acquired pointer lock nor entered the explicit fallback: ${JSON.stringify(pointer)}`);
    screenshots.push(await screenshot(page, "hybrid-pointer-controls-hidden"));

    // Exercise gameplay through real browser input. Keyboard movement is the
    // iPad hardware-keyboard path; the drag supplies look both when pointer
    // lock is granted and when Safari refuses it.
    await page.keyboard.down("w");
    await page.waitForTimeout(350);
    await page.keyboard.up("w");
    await page.mouse.move(500, 380);
    await page.mouse.down();
    await page.mouse.move(700, 380, { steps: 8 });
    await page.mouse.up();
    const movement = await waitStage(page, "pointer_movement");
    assert(movement.moved > 0.001,
      `real iPad keyboard path did not move the player: ${JSON.stringify(movement)}`);
    const look = await waitStage(page, "pointer_look");
    assert(look.yaw_delta > 0.002,
      `real iPad mouse drag did not turn the camera: ${JSON.stringify(look)}`);
    const gameplay = await waitStage(page, "pointer_gameplay");
    assert(gameplay.moved > 0.001 && gameplay.yaw_delta > 0.002,
      `mouse/keyboard input did not affect gameplay: ${JSON.stringify(gameplay)}`);

    // A real touch on the canvas switches back to touch controls. A later
    // real mouse motion switches to pointer mode again without a second UI
    // gesture, proving the modes are device-driven rather than one-shot.
    await page.touchscreen.tap(480, 300);
    const touch = await waitStage(page, "touch_returned");
    assert(touch.mode === "touch" && touch.touch_controls,
      `touch did not restore touch controls: ${JSON.stringify(touch)}`);
    screenshots.push(await screenshot(page, "hybrid-touch-returned"));
    await page.mouse.move(600, 300);
    const pointerAgain = await waitStage(page, "pointer_returned");
    assert(pointerAgain.mode === "pointer" && !pointerAgain.touch_controls,
      `mouse did not restore pointer mode: ${JSON.stringify(pointerAgain)}`);
    screenshots.push(await screenshot(page, "hybrid-pointer-returned"));

    const unexpectedErrors = pageErrors.filter((message) => !message.toLowerCase().includes("pointer lock"));
    assert(unexpectedErrors.length === 0,
      `unexpected browser runtime errors: ${JSON.stringify(unexpectedErrors)}`);
    return { boot, admitted, pointer, pointerLockBeforeGesture, pointerLockAfterGesture,
      movement, look, gameplay, touch, pointerAgain, pageErrors, screenshots };
  } finally {
    await context.close();
  }
}

async function main() {
  fs.mkdirSync(artifactDir, { recursive: true });
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "wardb-web-hybrid-"));
  const profileRoot = fs.mkdtempSync(path.join(os.tmpdir(), "wardb-web-hybrid-profile-"));
  let server;
  try {
    copyTree(godotDir, tempRoot);
    fs.copyFileSync(path.join(scriptDir, "test_web_hybrid_harness.gd"),
      path.join(tempRoot, "web_hybrid_harness.gd"));
    let scene = fs.readFileSync(path.join(scriptDir, "test_web_hybrid_harness.tscn"), "utf8");
    scene = scene.replaceAll("res://tools/test_web_hybrid_harness.gd", "res://web_hybrid_harness.gd");
    fs.writeFileSync(path.join(tempRoot, "web_hybrid_harness.tscn"), scene);
    const projectPath = path.join(tempRoot, "project.godot");
    fs.writeFileSync(projectPath, fs.readFileSync(projectPath, "utf8")
      .replace('run/main_scene="res://main.tscn"', 'run/main_scene="res://web_hybrid_harness.tscn"'));
    fs.mkdirSync(path.join(tempRoot, "export"));
    await run(godotBin, ["--headless", "--path", tempRoot, "--export-release", "Web",
      path.join(tempRoot, "export", "index.html")], tempRoot, path.join(tempRoot, "export.log"));
    server = await serve(path.join(tempRoot, "export"));
    const port = server.address().port;
    const result = await exercise(`http://127.0.0.1:${port}`, path.join(profileRoot, "ipad"));
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  } finally {
    server?.close();
    if (process.env.KEEP_WARD_WEB_HYBRID === "1") {
      console.error(`kept hybrid temp project: ${tempRoot}`);
      console.error(`kept hybrid browser profile: ${profileRoot}`);
    } else {
      fs.rmSync(tempRoot, { recursive: true, force: true });
      fs.rmSync(profileRoot, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
