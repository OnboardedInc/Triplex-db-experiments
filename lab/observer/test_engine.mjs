// [EXP-OBS01] Why: check admission preconditions without starting or modifying residents.
// Rejected: mock Docker successes as engine qualification.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
process.env.TX2_ENGINE_DIR ??= path.resolve('runs/OBS01/test-engines');
const { observerPlan } = await import('../bin/observer.mjs');
const { effectiveConfig } = await import('../bin/engine.mjs');
const { loadSlots, slotInfo } = await import('../bin/lib.mjs');
const config = loadSlots();
const info = slotInfo(config, 'xtdb', 's1');
const tmp = fs.mkdtempSync(path.resolve('runs/OBS01/node-test-'));
const key = path.join(tmp, 'external.key'); fs.writeFileSync(key, Buffer.alloc(32, 7));
const engine = { Id: 'e'.repeat(64), Image: 'sha256:engine', HostConfig: { CpusetCpus: '0,1' }, Config: { Labels: { 'tx2.config-sha256': 'config' } }, Mounts: [{ Name: info.volume }] };
const opts = { 'observer-cpus': '5', image: `python@sha256:${'a'.repeat(64)}`, 'key-file': key, 'run-id': 'test', 'receipt-id': 'receipt', 'key-id': 'key' };
test('requires disjoint CPU pinning', () => {
  assert.throws(() => observerPlan(config, info, engine, { ...opts, 'observer-cpus': '1' }));
  assert.throws(() => observerPlan(config, info, { ...engine, HostConfig: { CpusetCpus: '' } }, opts));
});
test('requires evaluator key, immutable image and safe identities', () => {
  assert.throws(() => observerPlan(config, info, engine, { ...opts, image: 'python:latest' }));
  assert.throws(() => observerPlan(config, info, engine, { ...opts, 'run-id': '../other' }));
  fs.writeFileSync(key, Buffer.alloc(31));
  assert.throws(() => observerPlan(config, info, engine, opts));
  fs.writeFileSync(key, Buffer.alloc(32));
});
test('output budget is bounded before admission', () => {
  assert.throws(() => observerPlan(config, info, engine, { ...opts, 'max-bundle-bytes': 'Infinity' }));
  assert.throws(() => observerPlan(config, info, engine, { ...opts, 'max-bundle-bytes': '1' }));
  assert.equal(observerPlan(config, info, engine, opts).plan.maxBundleBytes, 64 * 1024 * 1024);
});
test('XTDB completed transaction source and host sources are collected', () => {
  const p = observerPlan(config, info, engine, opts);
  assert.equal(p.plan.streams.find(s => s.streamId === 'X1-metrics').sourceId, 'X1.node.tx.latestCompletedTxId');
  assert.equal(p.plan.streams.filter(s => s.kind === 'HO/any/H1').length, 6);
});
test('Datomic plans independent thread and callback samples', () => {
  const d = { ...info, lane: 'datomic', container: 'tx2-datomic-s1', volume: 'tx2-datomic-s1-data' };
  const e = { ...engine, Mounts: [{ Name: d.volume }] };
  const options = { ...opts, 'gateway-pids': '2,7', 'transactor-metrics': 'log/transactor-metrics.jsonl' };
  const p = observerPlan(config, d, e, options);
  assert.deepEqual(p.plan.streams.find(s => s.streamId === 'H5-threads').pids, [2, 7]);
  assert.equal(p.plan.streams.find(s => s.streamId === 'D1-metrics').method, 'tail');
  assert.throws(() => observerPlan(config, d, e, { ...options, 'transactor-metrics': '../gateway-output' }));
});
test('protected clock ports are refused', () => {
  assert.throws(() => effectiveConfig(config, { ...info, observationSources: true, port: 5442 }));
});
test('QLever profile is opt-in and resident script remains unchanged', () => {
  const q = slotInfo(config, 'qlever', 's3');
  const plain = effectiveConfig(config, q);
  const original = fs.readFileSync(plain.files.startScript, 'utf8');
  const observed = effectiveConfig(config, { ...q, observationSources: true, cpusetCpus: '0' });
  const script = fs.readFileSync(observed.files.startScript, 'utf8');
  assert.match(original, /--no-metrics-log/);
  assert.doesNotMatch(original, /--enable-metrics/);
  assert.match(script, /--enable-metrics/);
  assert.doesNotMatch(script, /--no-metrics-log/);
  assert.equal(observed.effective.cpusetCpus, '0');
  assert.equal(observed.effective.observerClockPublish, '127.0.0.1:17073:18080');
  // Restore the stopped slot's effective config bytes after inspecting the variant.
  effectiveConfig(config, q);
});
test.after(() => fs.rmSync(tmp, { recursive: true }));
