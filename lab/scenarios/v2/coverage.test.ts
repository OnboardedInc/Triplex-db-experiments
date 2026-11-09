// [EXP-W02-R3] Why: spec additions and basis substitutions must fail in the actual driver.
// Rejected: helper-only tests that leave the executing case path unchecked.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { runCase } from './case-driver.ts';
import { Probe, rows, baseFacts } from './probe.ts';
import { memoryComposition } from '../../bench/lib/memory.ts';
import { V_W0 } from '../../bench/lib/w0-world.ts';
const dir = new URL('../../../runs/W02-r3/unit/', import.meta.url).pathname;
test('a new unmapped spec claim fails the real scenario', async () => {
  const read = fs.readFileSync;
  (fs as any).readFileSync = (file: any, ...rest: any[]) => {
    const bytes = (read as any)(file, ...rest);
    if (String(file).endsWith('/01-monday-rush/scenario.json') && new Error().stack?.includes('cases.mjs')) {
      const spec = JSON.parse(String(bytes)); spec.domain.push('unmapped additional claim');
      return Buffer.from(JSON.stringify(spec));
    }
    return bytes;
  };
  try { const r = await runCase('GS-01', 'datomic', dir); assert.equal(r.status, 'FAIL'); assert.match(r.reason!, /unmapped spec domain claim/); }
  finally { fs.readFileSync = read; }
});
test('a known claim without executed evidence fails the real scenario', async () => {
  const domain = Probe.prototype.domain;
  Probe.prototype.domain = async function (...args) { const result = await domain.apply(this, args); this.checks.splice(0); return result; };
  try { const r = await runCase('GS-01', 'datomic', dir); assert.equal(r.status, 'FAIL'); assert.match(r.reason!, /required-domain-claim/); }
  finally { Probe.prototype.domain = domain; }
});
test('a route reporting latest instead of the requested basis fails even with identical contents', async () => {
  const p = new Probe(memoryComposition('datomic', randomUUID()), dir);
  await p.commit(rows(baseFacts('pl:p'))); const old = await p.comp.currentPosition();
  await p.set('unreachable', 'value', 'later');
  const page = p.comp.sweepPage;
  p.comp.sweepPage = (subjects, basis) => page(subjects, { ...basis, position: old + 1 });
  await assert.rejects(p.state('pl:p', old), /read-basis mismatch/);
  assert.deepEqual(p.reads.at(-1).requestedBasis, { position: old, validAt: V_W0 });
  assert.deepEqual(p.reads.at(-1).reportedBasis, { position: old + 1, validAt: V_W0 });
});
test('a route omitting its answer basis fails closed', async () => {
  const p = new Probe(memoryComposition('datomic', randomUUID()), dir);
  await p.commit(rows(baseFacts('pl:p'))); const page = p.comp.sweepPage;
  p.comp.sweepPage = async (...args) => ({ ...await page(...args), reportedBasis: undefined });
  await assert.rejects(p.state('pl:p'), /read-basis mismatch/);
});

test('spoofing requested metadata cannot hide latest-state contents at an old basis', async () => {
  const p = new Probe(memoryComposition('datomic', randomUUID()), dir);
  await p.commit(rows(baseFacts('pl:p'))); const old = await p.comp.currentPosition();
  await p.set('pl:p', 'payRateCents', 1000); const head = await p.comp.currentPosition();
  const page = p.comp.sweepPage;
  p.comp.sweepPage = async (subjects, basis) => ({ ...await page(subjects, { ...basis, position: head }), reportedBasis: { ...basis } });
  await assert.rejects(p.state('pl:p', old), /state:pl:p: observed content differs/);
});
