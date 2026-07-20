#!/usr/bin/env node
// Headless room validator — `npm run check:rooms`.
//
// `tsc`/`vite build` never EXECUTE room modules, so the kit's module-init
// validators (patrol() clearance — the stuck-orderly bug class) only fire
// when a room is actually imported: in the browser, or here. This script
// imports every room module in src/rooms/ (running those validators for
// real), then checks the wiring that TypeScript can't see:
//
//   1. every room module imports cleanly (patrol clearance, bad geometry
//      that throws at init)
//   2. every RoomDef id is unique, and spawn sits inside the floor rect
//   3. every exits[].to resolves to a real room id (or 'END')
//   4. the exit chain from room1 actually reaches END (no orphaned or
//      unreachable rooms)
//   5. every room id is registered in BOTH main.ts's rooms record and
//      src/devtools/map.ts's MODULES registry (the two easy-to-forget spots)
//   6. any room file that spawns an Orderly exports debugPatrols (so the
//      /map.html viewer can draw its patrol + sight envelope)
//   7. trigger ids are unique per room (RoomDef.triggers)
//
// Run it after any room change; it's the cheap half of the §6 verification
// loop in ROOM_AUTHORING.md (the map viewer is the visual half).

import { readdirSync, readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const roomsDir = join(root, 'src', 'rooms');
const INFRA = new Set(['kit.ts', 'build.ts', 'types.ts']);
// _kitcheck.ts is a kit demo, not a routed room — validate its import (it
// exercises the kit) but exempt it from registry/chain checks.
const UNROUTED = new Set(['_kitcheck']);

const failures = [];
const fail = (msg) => failures.push(msg);

const roomFiles = readdirSync(roomsDir).filter((f) => f.endsWith('.ts') && !INFRA.has(f));

// Bundle each room module for node. Rooms pull in orderly.ts (canvas-baked
// textures at module init) via kit.ts, so browser globals get a permissive
// "anything" proxy — any property access or call returns more of itself —
// making import failures mean real authoring errors, not environment noise.
// The shim is its own module imported BEFORE the room: ES module evaluation
// order runs a module's imports before its own statements, so an inline
// shim in the entry file would run too late.
const shim = `
// Each per-room bundle carries its own three.js copy — expected here, so
// silence three's duplicate-instance warning to keep real failures visible.
const warn = console.warn;
console.warn = (...a) => {
  if (String(a[0]).includes('Multiple instances of Three.js')) return;
  warn(...a);
};
const magic = new Proxy(function () {}, {
  get: (t, p) => (p === Symbol.toPrimitive ? () => 0 : magic),
  set: () => true,
  apply: () => magic,
  construct: () => magic,
});
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
globalThis.document = {
  createElement: () => magic,
  getElementById: () => null,
  head: { appendChild: () => {} },
  addEventListener: () => {},
};
globalThis.window ??= { addEventListener: () => {} };
`;

const tmp = mkdtempSync(join(tmpdir(), 'wardb-check-'));
const defs = new Map(); // id -> { def, file, hasDebugPatrols, spawnsOrderly }

try {
  writeFileSync(join(tmp, 'shim.mjs'), shim);
  for (const file of roomFiles) {
    const stem = file.replace(/\.ts$/, '');
    const entry = join(tmp, `${stem}.entry.mjs`);
    const out = join(tmp, `${stem}.bundle.mjs`);
    writeFileSync(
      entry,
      `import './shim.mjs';\nexport * as mod from ${JSON.stringify(join(roomsDir, file))};\n`,
    );
    try {
      await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent' });
      const { mod } = await import(pathToFileURL(out).href);
      const source = readFileSync(join(roomsDir, file), 'utf8');
      const roomDefs = Object.values(mod).filter(
        (v) => v && typeof v === 'object' && typeof v.id === 'string' && v.floor && v.spawn && Array.isArray(v.exits),
      );
      if (roomDefs.length === 0 && !UNROUTED.has(stem)) fail(`${file}: exports no RoomDef`);
      for (const def of roomDefs) {
        if (defs.has(def.id)) fail(`${file}: duplicate room id '${def.id}' (also in ${defs.get(def.id).file})`);
        defs.set(def.id, {
          def,
          file,
          hasDebugPatrols: Array.isArray(mod.debugPatrols),
          spawnsOrderly: /new Orderly\(/.test(source) || /makeOrderlyRoomScript\(/.test(source),
        });
      }
    } catch (e) {
      fail(`${file}: failed to import — ${e.message?.split('\n')[0]}`);
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

// Per-def checks.
for (const [id, { def, file, hasDebugPatrols, spawnsOrderly }] of defs) {
  const { floor, spawn } = def;
  if (spawn.x < floor.minX || spawn.x > floor.maxX || spawn.z < floor.minZ || spawn.z > floor.maxZ) {
    fail(`${file}: spawn (${spawn.x},${spawn.z}) is outside the floor rect`);
  }
  if (!def.name) fail(`${file}: RoomDef.name missing (HUD room label)`);
  for (const e of def.exits) {
    if (e.to !== 'END' && !defs.has(e.to)) fail(`${file}: exit targets unknown room '${e.to}'`);
  }
  if (spawnsOrderly && !hasDebugPatrols && !UNROUTED.has(id)) {
    fail(`${file}: spawns orderlies but exports no debugPatrols (map viewer can't draw the patrol)`);
  }
  const trigIds = new Set();
  for (const t of def.triggers ?? []) {
    if (trigIds.has(t.id)) fail(`${file}: duplicate trigger id '${t.id}'`);
    trigIds.add(t.id);
  }
}

// Exit chain from room1 → END.
const chain = [];
{
  const seen = new Set();
  let cur = 'room1';
  while (cur && cur !== 'END' && !seen.has(cur)) {
    seen.add(cur);
    chain.push(cur);
    const entry = defs.get(cur);
    if (!entry) { fail(`exit chain: '${cur}' has no RoomDef`); cur = null; break; }
    cur = entry.def.exits[0]?.to;
  }
  if (cur === 'END') chain.push('END');
  else if (cur && seen.has(cur)) fail(`exit chain: loop back to '${cur}'`);
  const routed = [...defs.keys()].filter((id) => !UNROUTED.has(id));
  for (const id of routed) {
    if (!seen.has(id)) fail(`'${id}' is registered but unreachable from room1 (not in the exit chain)`);
  }
}

// Registry cross-checks: main.ts rooms record + devtools/map.ts MODULES.
const mainSrc = readFileSync(join(root, 'src', 'main.ts'), 'utf8');
const mapSrc = readFileSync(join(root, 'src', 'devtools', 'map.ts'), 'utf8');
for (const id of defs.keys()) {
  if (UNROUTED.has(id)) continue;
  if (!new RegExp(`\\b${id}:\\s*\\{\\s*def:`).test(mainSrc)) fail(`'${id}' missing from main.ts rooms record`);
  if (!new RegExp(`\\b${id}:\\s*\\(\\)\\s*=>\\s*import\\(`).test(mapSrc)) fail(`'${id}' missing from src/devtools/map.ts MODULES (map viewer)`);
}

if (failures.length) {
  console.error(`check:rooms FAILED (${failures.length}):`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:rooms OK — ${defs.size} room defs imported clean (patrol validators ran)`);
console.log(`  chain: ${chain.join(' -> ')}`);
