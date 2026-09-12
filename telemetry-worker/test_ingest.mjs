// Exercise the actual Worker handler with an in-memory D1 boundary. No network,
// credentials, collector writes or production database are used.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./src/index.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
let rows = [];
const env = { DB: {
  prepare: () => ({ bind: (...values) => values }),
  batch: async (statements) => { rows.push(...statements); },
} };
const ctx = { waitUntil: () => { throw new Error('Unexpected outbound mirror'); } };
async function ingest(payload) {
  rows = [];
  return worker.fetch(new Request('https://collector.invalid/', {
    method: 'POST', body: JSON.stringify(payload),
  }), env, ctx);
}

for (const payload of [null, [], 'invalid']) {
  assert.equal((await ingest(payload)).status, 400);
  assert.equal(rows.length, 0);
}
const batch = { session: 'test-session', player: 'test-player', run: 1,
  version: 'test-build', events: [
    { name: 'room_enter', t: 1, room: 'room19', room_variant: 'lights' },
    { name: 'noise', t: 2, room: 'room6', source: 'service_panel', responders: 1 },
    { name: 'future_event', t: 3, nested: { values: Array(50).fill('x'.repeat(700)) } },
    null, ['invalid'],
  ] };
assert.equal((await ingest(batch)).status, 200);
assert.equal(rows.length, 3);
assert.equal(rows[0][0], 'test-session');
assert.equal(rows[0][5], 'test-build');
assert.equal(JSON.parse(rows[0][11]).room_variant, 'lights');
assert.equal(JSON.parse(rows[1][11]).responders, 1);
const future = JSON.parse(rows[2][11]);
assert.equal(future.name, 'future_event');
assert.equal(future.nested.values.length, 32);
assert.equal(future.nested.values[0].length, 512);

await ingest({ events: [{ name: 'bounded', ...Object.fromEntries(
  Array.from({ length: 100 }, (_, i) => ['k'.repeat(100) + i, 'value']),
) }] });
const bounded = JSON.parse(rows[0][11]);
assert.ok(Object.keys(bounded).length <= 32);
assert.ok(Object.keys(bounded).every((key) => key.length <= 64));
assert.equal((await ingest({ events: Array(1001).fill({ name: 'noise' }) })).status, 413);
assert.equal(rows.length, 0);
assert.equal((await ingest({ events: [], padding: 'x'.repeat(256 * 1024) })).status, 413);
assert.equal(rows.length, 0);
console.log('OK - worker ingestion: malformed payloads, real event contract, forward compatibility, field and batch bounds');
